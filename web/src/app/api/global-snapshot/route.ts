import { NextResponse } from "next/server";

import { listAlerts } from "@/lib/store/alerts";
import { listRiskRuns } from "@/lib/store/risk-runs";

export async function GET() {
  const runs = await listRiskRuns(500);
  const alerts = await listAlerts(undefined, 200);
  const activeHotspots = runs.reduce((sum, run) => sum + run.hotspotsCount, 0);
  const criticalRegions = runs.filter((r) => ["RED", "CRITICAL"].includes(r.latestLevel)).length;
  const avgGlobalRisk =
    runs.length > 0 ? runs.reduce((sum, run) => sum + run.latestRisk, 0) / runs.length : 0;

  const latestByRegion = new Map<string, (typeof runs)[number]>();
  runs.forEach((run) => {
    const key = `${run.region.latitude.toFixed(2)},${run.region.longitude.toFixed(2)}`;
    if (!latestByRegion.has(key)) latestByRegion.set(key, run);
  });
  const topRegions = [...latestByRegion.values()]
    .sort((a, b) => b.latestRisk - a.latestRisk)
    .slice(0, 10)
    .map((run) => ({
      regionId: `${run.region.latitude.toFixed(2)},${run.region.longitude.toFixed(2)}`,
      name: `${run.region.latitude.toFixed(2)}, ${run.region.longitude.toFixed(2)}`,
      riskScore: run.latestRisk,
      level: run.latestLevel,
      dominantDriver: run.dominantDriver,
    }));

  const feed = [
    ...runs.slice(0, 50).map((run) => ({
      eventId: `run-${run.id}`,
      type: ["RED", "CRITICAL"].includes(run.latestLevel) ? "escalation" : "risk_update",
      regionId: `${run.region.latitude.toFixed(2)},${run.region.longitude.toFixed(2)}`,
      timestamp: run.createdAt,
      level: run.latestLevel,
    })),
    ...alerts.slice(0, 50).map((alert) => ({
      eventId: `alert-${alert.id}`,
      type: "alert_triggered",
      regionId: alert.runId,
      timestamp: alert.createdAt,
      level: alert.level,
    })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 100);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    kpis: {
      activeHotspots,
      criticalRegions,
      avgGlobalRisk,
      monitorCount: topRegions.length,
    },
    topRegions,
    feed,
  });
}

