import Papa from "papaparse";

import { getCached, setCached } from "@/lib/cache/store";

type Hotspot = {
  latitude: number;
  longitude: number;
  bright_ti4?: number;
  confidence?: string;
  frp?: number;
};

type HotspotSummary = {
  hotspots: Hotspot[];
  count: number;
  avgFrp: number;
  highConfidenceRatio: number;
};

export async function fetchFirmsHotspots(
  bbox: string,
  dayRange = 1,
): Promise<HotspotSummary> {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return { hotspots: [], count: 0, avgFrp: 0, highConfidenceRatio: 0 };
  }

  const source = process.env.FIRMS_SOURCE ?? "VIIRS_NOAA20_NRT";
  const cacheKey = `firms:${bbox}:${dayRange}:${source}`;
  const cached = getCached<HotspotSummary>(cacheKey);
  if (cached) return cached;

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch FIRMS hotspot data.");
  }
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const hotspots = (parsed.data as Array<Record<string, string>>)
    .map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      bright_ti4: Number(row.bright_ti4 ?? row.brightness ?? 0),
      frp: Number(row.frp ?? 0),
      confidence: row.confidence ?? "",
    }))
    .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));

  const count = hotspots.length;
  const avgFrp =
    count > 0 ? hotspots.reduce((sum, row) => sum + Number(row.frp ?? 0), 0) / count : 0;
  const highConf = hotspots.filter((h) => String(h.confidence).toLowerCase().includes("h")).length;

  const summary: HotspotSummary = {
    hotspots,
    count,
    avgFrp,
    highConfidenceRatio: count > 0 ? highConf / count : 0,
  };
  return setCached(cacheKey, summary, 10 * 60 * 1000);
}

