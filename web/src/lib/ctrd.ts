import { calibrateThresholds, classifyAlert } from "@/lib/ml/calibration";
import { deriveExplainability } from "@/lib/ml/explainability";
import { forecastFromSeries } from "@/lib/ml/forecast";
import { estimatePredictionInterval } from "@/lib/ml/uncertainty";
import type { AnalyzeResponse } from "@/lib/types";

type Row = Record<string, number | string>;
type ComponentKey = "ignition" | "spread" | "fuel" | "containment" | "impact";
type ComponentRow = Row & Record<ComponentKey, number>;

const COMPONENT_KEYS: ComponentKey[] = [
  "ignition",
  "spread",
  "fuel",
  "containment",
  "impact",
];

const ALERT_ACTIONS: Record<string, string> = {
  GREEN: "No action needed",
  YELLOW: "Monitor conditions and prepare patrol teams.",
  ORANGE: "Prepare response teams and coordinate local authorities.",
  RED: "Deploy resources and issue public advisories.",
  CRITICAL: "Initiate emergency protocols and potential evacuation planning.",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeColumns(rows: Row[], cols: string[]) {
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};
  cols.forEach((col) => {
    const values = rows.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
    mins[col] = values.length ? Math.min(...values) : 0;
    maxs[col] = values.length ? Math.max(...values) : 1;
  });
  return rows.map((row) => {
    const out = { ...row };
    cols.forEach((col) => {
      const min = mins[col];
      const max = maxs[col];
      const value = Number(row[col]);
      out[col] = max === min ? 0 : clamp01((value - min) / (max - min));
    });
    return out;
  });
}

function cleanRows(rawRows: Row[]) {
  return rawRows
    .map((row) => {
      const next: Row = {};
      Object.keys(row).forEach((key) => {
        const normalized = key
          .trim()
          .toLowerCase()
          .replaceAll(" ", "_")
          .replace(/[^a-z0-9_]/g, "");
        next[normalized] = row[key];
      });
      if ("_rh" in next) next.rh = next._rh;
      if ("_ws" in next) next.ws = next._ws;
      if ("rain_" in next) next.rain = next.rain_;
      if ("classes__" in next) next.classes = next.classes__;
      return next;
    })
    .filter((row) => String(row.ffmc).toLowerCase() !== "ffmc");
}

function buildComponents(rows: Row[]) {
  const normalized = normalizeColumns(rows, [
    "ffmc",
    "temperature",
    "rh",
    "isi",
    "ws",
    "dmc",
    "dc",
    "bui",
    "fwi",
  ]);
  return normalized.map((row) => {
    const ignition =
      0.4 * Number(row.ffmc) + 0.35 * Number(row.temperature) + 0.25 * (1 - Number(row.rh));
    const spread = 0.6 * Number(row.isi) + 0.4 * Number(row.ws);
    const fuel = (Number(row.dmc) + Number(row.dc) + Number(row.bui)) / 3;
    const containment = Number(row.dc);
    const impact = Number(row.fwi);
    return { ...row, ignition, spread, fuel, containment, impact } as ComponentRow;
  });
}

function deriveDynamicWeights(latest: ComponentRow, weather: Record<string, number>, geospatial: Record<string, number>) {
  const base = 0.10;
  const weights: Record<ComponentKey, number> = {
    ignition: base,
    spread: base,
    fuel: base,
    containment: base,
    impact: base,
  };

  for (const key of COMPONENT_KEYS) {
    weights[key] += Number(latest[key]) || 0;
  }

  const temp = Number(latest.temperature) || 0;
  const wind = Number(latest.ws) || 0;
  const dc = Number(latest.dc) || 0;
  const humidity = Number(latest.rh) || 0.5;

  if (temp > 0.4) weights.ignition += (temp - 0.4) * 0.3;
  if (humidity < 0.5) weights.ignition += (0.5 - humidity) * 0.2;
  if (wind > 0.3) weights.spread += (wind - 0.3) * 0.3;
  if (dc > 0.3) {
    weights.fuel += (dc - 0.3) * 0.2;
    weights.containment += (dc - 0.3) * 0.15;
  }

  if (weather.wind > 20) weights.spread += 0.08;
  if (weather.temperature > 32) weights.ignition += 0.08;
  if (weather.humidity < 30) weights.ignition += 0.05;
  if ((geospatial.burnSeverityIndex ?? 0) > 0.5) weights.impact += 0.1;
  if ((geospatial.vegetationDryness ?? 0) > 0.5) weights.fuel += 0.06;

  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const normalized = { ...weights };
  (Object.keys(normalized) as ComponentKey[]).forEach((key) => {
    normalized[key] = normalized[key] / sum;
  });
  return normalized;
}

function pickComponentMetrics(row: ComponentRow) {
  return COMPONENT_KEYS.reduce<Record<string, number>>((acc, key) => {
    acc[key] = Number(row[key]);
    return acc;
  }, {});
}

export function analyzeRisk({
  rawRows,
  horizons,
  weatherSummary,
  hotspotSummary,
  geospatialSummary,
  requestId,
}: {
  rawRows: Row[];
  horizons: number[];
  weatherSummary: Record<string, number>;
  hotspotSummary: Record<string, number>;
  geospatialSummary: Record<string, number>;
  requestId: string;
}): AnalyzeResponse {
  const start = Date.now();
  const cleaned = cleanRows(rawRows);
  const numericCols = ["temperature", "rh", "ws", "rain", "ffmc", "dmc", "dc", "isi", "bui", "fwi"];
  const rows = cleaned
    .map((row) => {
      const out: Row = { ...row };
      numericCols.forEach((col) => {
        out[col] = Number(out[col]);
      });
      return out;
    })
    .filter((row) => numericCols.every((col) => Number.isFinite(Number(row[col]))));

  const componentRows = buildComponents(rows);
  const latest = componentRows[componentRows.length - 1] ?? ({} as ComponentRow);
  const previous = componentRows[componentRows.length - 2] ?? latest;

  const timelineWeights = deriveDynamicWeights(latest, weatherSummary, geospatialSummary);
  const historicalRisk = componentRows.map((row) =>
    COMPONENT_KEYS.reduce((acc, key) => acc + Number(row[key]) * timelineWeights[key], 0),
  );
  const thresholds = calibrateThresholds(historicalRisk);

  const forecasts = horizons.map((horizonHours) => {
    const components = COMPONENT_KEYS.reduce<Record<string, number>>((acc, key) => {
      const series = componentRows.map((row) => Number(row[key]));
      acc[key] = forecastFromSeries(series, horizonHours).predicted;
      return acc;
    }, {});
    const riskScore = COMPONENT_KEYS.reduce(
      (acc, key) => acc + components[key] * timelineWeights[key],
      0,
    );
    const interval = estimatePredictionInterval(historicalRisk, riskScore);
    const contributions = COMPONENT_KEYS.reduce<Record<string, number>>((acc, key) => {
      acc[key] = components[key] * timelineWeights[key];
      return acc;
    }, {});
    return {
      horizonHours,
      riskScore,
      level: classifyAlert(riskScore, thresholds),
      interval: { low: interval.low, high: interval.high },
      components,
      contributions,
    };
  });

  const latestForecast = forecasts[0];
  const explainability = deriveExplainability(
    latestForecast?.contributions ?? {},
    pickComponentMetrics(latest),
    pickComponentMetrics(previous),
  );
  const latestLevel = latestForecast?.level ?? "GREEN";

  return {
    requestId,
    latencyMs: Date.now() - start,
    latestRisk: latestForecast?.riskScore ?? 0,
    latestLevel,
    recommendedAction: ALERT_ACTIONS[latestLevel] ?? ALERT_ACTIONS.GREEN,
    timeline: historicalRisk.slice(-30).map((riskScore, index) => ({
      timestamp: `T-${30 - index}`,
      riskScore,
    })),
    forecasts,
    calibratedThresholds: thresholds,
    explainability,
    featuresUsed: {
      weather: weatherSummary,
      geospatial: geospatialSummary,
      hotspotSummary,
    },
    hotspots: [],
    alertDispatch: { triggered: false, recipients: [] },
  };
}
