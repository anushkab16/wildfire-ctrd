import { getCached, setCached } from "@/lib/cache/store";

type GeospatialSummary = {
  vegetationDryness: number;
  thermalAnomaly: number;
  burnSeverityIndex: number;
  source: "gee" | "heuristic";
};

function heuristicFeatures(latitude: number, longitude: number, radiusKm: number): GeospatialSummary {
  const seed = Math.abs(latitude * 0.07 + longitude * 0.04 + radiusKm * 0.01);
  return {
    vegetationDryness: Math.min(1, 0.35 + (seed % 0.5)),
    thermalAnomaly: Math.min(1, 0.2 + ((seed * 1.7) % 0.6)),
    burnSeverityIndex: Math.min(1, 0.1 + ((seed * 2.2) % 0.5)),
    source: "heuristic",
  };
}

export async function fetchGeospatialSummary(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<GeospatialSummary> {
  const cacheKey = `gee:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${radiusKm.toFixed(1)}`;
  const cached = getCached<GeospatialSummary>(cacheKey);
  if (cached) return cached;

  const geeProxy = process.env.GEE_PROXY_URL;
  if (!geeProxy) {
    return setCached(cacheKey, heuristicFeatures(latitude, longitude, radiusKm), 30 * 60 * 1000);
  }

  try {
    const response = await fetch(geeProxy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude, radiusKm }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("GEE proxy failed");
    }
    const payload = await response.json();
    const summary: GeospatialSummary = {
      vegetationDryness: Number(payload.vegetationDryness ?? 0.5),
      thermalAnomaly: Number(payload.thermalAnomaly ?? 0.5),
      burnSeverityIndex: Number(payload.burnSeverityIndex ?? 0.4),
      source: "gee",
    };
    return setCached(cacheKey, summary, 30 * 60 * 1000);
  } catch {
    return setCached(cacheKey, heuristicFeatures(latitude, longitude, radiusKm), 30 * 60 * 1000);
  }
}

