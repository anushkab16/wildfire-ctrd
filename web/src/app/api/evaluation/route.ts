import { readFile } from "fs/promises";
import path from "path";

import Papa from "papaparse";
import { NextResponse } from "next/server";

import { analyzeRisk } from "@/lib/ctrd";
import { runAblationStudy } from "@/lib/evaluation/ablation";
import { runBacktest } from "@/lib/evaluation/backtest";

async function loadCsvText() {
  const filePath = path.resolve(process.cwd(), "..", "Algerian_forest_fires_dataset.csv");
  return readFile(filePath, "utf8");
}

export async function GET() {
  try {
    const csvText = await loadCsvText();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Array<Record<string, string>>;

    const base = analyzeRisk({
      rawRows: rows,
      horizons: [24],
      weatherSummary: { temperature: 25, humidity: 45, wind: 15, precipitationProbability: 20 },
      hotspotSummary: { count: 0, avgFrp: 0, highConfidenceRatio: 0 },
      geospatialSummary: { vegetationDryness: 0.4, thermalAnomaly: 0.3, burnSeverityIndex: 0.2 },
      requestId: "eval-base",
    });
    const live = analyzeRisk({
      rawRows: rows,
      horizons: [24],
      weatherSummary: { temperature: 30, humidity: 35, wind: 26, precipitationProbability: 12 },
      hotspotSummary: { count: 32, avgFrp: 11, highConfidenceRatio: 0.5 },
      geospatialSummary: { vegetationDryness: 0.4, thermalAnomaly: 0.3, burnSeverityIndex: 0.2 },
      requestId: "eval-live",
    });
    const geo = analyzeRisk({
      rawRows: rows,
      horizons: [24],
      weatherSummary: { temperature: 30, humidity: 35, wind: 26, precipitationProbability: 12 },
      hotspotSummary: { count: 32, avgFrp: 11, highConfidenceRatio: 0.5 },
      geospatialSummary: { vegetationDryness: 0.72, thermalAnomaly: 0.64, burnSeverityIndex: 0.58 },
      requestId: "eval-geo",
    });

    const backtest = runBacktest(base.timeline.map((t) => t.riskScore));
    const ablation = runAblationStudy({
      baseRisk: base.latestRisk,
      liveRisk: live.latestRisk,
      geoRisk: geo.latestRisk,
    });

    return NextResponse.json({
      backtest,
      ablation,
      modelCard: {
        objective: "Short-horizon wildfire risk forecasting and operational alerting.",
        features: ["weather", "hotspotSummary", "geospatial proxies", "historical CT-RD components"],
        limitations: [
          "Requires external API uptime for live mode.",
          "Geospatial features may fallback to heuristic if GEE proxy is unavailable.",
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Evaluation failed", details: String(error) },
      { status: 500 },
    );
  }
}

