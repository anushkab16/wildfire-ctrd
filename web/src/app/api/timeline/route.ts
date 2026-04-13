import { NextResponse } from "next/server";

import { listRiskRunsByRegion } from "@/lib/store/risk-runs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") ?? undefined;
  const points = await listRiskRunsByRegion(region, 240);
  const timeline = points
    .reverse()
    .map((run) => ({
      timestamp: run.createdAt,
      riskScore: run.latestRisk,
      level: run.latestLevel,
      region: run.region,
    }));
  return NextResponse.json({ timeline });
}

