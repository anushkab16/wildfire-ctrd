import Papa from "papaparse";
import { NextResponse } from "next/server";

import { analyzeRisk } from "@/lib/ctrd";
import { buildAlertMessage, shouldTriggerAlert } from "@/lib/alerts/engine";
import { sendEmailAlert, sendTelegramAlert } from "@/lib/alerts/notifiers";
import { fetchFirmsHotspots } from "@/lib/ingestion/firms";
import { fetchGeospatialSummary } from "@/lib/ingestion/gee";
import { fetchWeatherSummary } from "@/lib/ingestion/weather";
import { addAlert } from "@/lib/store/alerts";
import { addRiskRun } from "@/lib/store/risk-runs";

function toBBox(latitude: number, longitude: number, radiusKm: number) {
  const delta = Math.max(0.05, radiusKm / 111);
  const west = Math.max(-180, longitude - delta);
  const east = Math.min(180, longitude + delta);
  const south = Math.max(-90, latitude - delta);
  const north = Math.min(90, latitude + delta);
  return `${west},${south},${east},${north}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const csvText = String(body.csvText ?? "");
    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
    }

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV.", details: parsed.errors[0].message },
        { status: 400 },
      );
    }

    const requestId = crypto.randomUUID();
    const region = body.region ?? { latitude: 36.7, longitude: 3.2, radiusKm: 30 };
    const horizons = Array.isArray(body.horizons) ? body.horizons : [24, 72, 168];
    const enableLiveData = Boolean(body.enableLiveData ?? true);
    const enableGeospatial = Boolean(body.enableGeospatial ?? true);

    const [weatherSummary, hotspotSummary, geospatialSummary] = await Promise.all([
      enableLiveData
        ? fetchWeatherSummary(region.latitude, region.longitude, 7)
        : Promise.resolve({ temperature: 25, humidity: 45, wind: 18, precipitationProbability: 20 }),
      enableLiveData
        ? fetchFirmsHotspots(toBBox(region.latitude, region.longitude, region.radiusKm), 1)
        : Promise.resolve({ hotspots: [], count: 0, avgFrp: 0, highConfidenceRatio: 0 }),
      enableGeospatial
        ? fetchGeospatialSummary(region.latitude, region.longitude, region.radiusKm)
        : Promise.resolve({
            vegetationDryness: 0.4,
            thermalAnomaly: 0.3,
            burnSeverityIndex: 0.2,
            source: "heuristic" as const,
          }),
    ]);

    const result = analyzeRisk({
      rawRows: parsed.data as Array<Record<string, string>>,
      horizons,
      weatherSummary: {
        temperature: weatherSummary.temperature,
        humidity: weatherSummary.humidity,
        wind: weatherSummary.wind,
        precipitationProbability: weatherSummary.precipitationProbability,
      },
      hotspotSummary: {
        count: hotspotSummary.count,
        avgFrp: hotspotSummary.avgFrp,
        highConfidenceRatio: hotspotSummary.highConfidenceRatio,
      },
      geospatialSummary: {
        vegetationDryness: geospatialSummary.vegetationDryness,
        thermalAnomaly: geospatialSummary.thermalAnomaly,
        burnSeverityIndex: geospatialSummary.burnSeverityIndex,
      },
      requestId,
    });

    const recipients: string[] = [];
    if (shouldTriggerAlert(result.latestLevel)) {
      const message = buildAlertMessage({
        level: result.latestLevel,
        score: result.latestRisk,
        action: result.recommendedAction,
        location: `${region.latitude.toFixed(2)}, ${region.longitude.toFixed(2)}`,
      });
      if (body.notify?.email) {
        const ok = await sendEmailAlert(body.notify.email, "Wildfire Alert", message);
        if (ok) recipients.push(body.notify.email);
      }
      if (body.notify?.telegramChatId) {
        const ok = await sendTelegramAlert(body.notify.telegramChatId, message);
        if (ok) recipients.push(`telegram:${body.notify.telegramChatId}`);
      }
    }

    const alertTriggered = shouldTriggerAlert(result.latestLevel);
    result.alertDispatch = {
      triggered: alertTriggered,
      recipients,
    };
    result.hotspots = hotspotSummary.hotspots.slice(0, 200).map((h) => ({
      latitude: h.latitude,
      longitude: h.longitude,
      frp: h.frp,
    }));

    const runRecord = await addRiskRun({
      requestId,
      region: {
        latitude: Number(region.latitude),
        longitude: Number(region.longitude),
        radiusKm: Number(region.radiusKm),
      },
      latestRisk: result.latestRisk,
      latestLevel: result.latestLevel,
      dominantDriver: result.explainability.dominantDriver,
      hotspotsCount: hotspotSummary.count,
      latencyMs: result.latencyMs,
    });

    await addAlert({
      runId: runRecord.id,
      requestId,
      level: result.latestLevel,
      triggered: alertTriggered,
      recipients,
      status: alertTriggered
        ? recipients.length > 0
          ? "delivered"
          : "failed"
        : "triggered",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}
