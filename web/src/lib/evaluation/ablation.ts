export function runAblationStudy({
  baseRisk,
  liveRisk,
  geoRisk,
}: {
  baseRisk: number;
  liveRisk: number;
  geoRisk: number;
}) {
  return {
    baseOnly: baseRisk,
    withLiveApis: liveRisk,
    withLiveAndGeospatial: geoRisk,
    deltaLiveVsBase: liveRisk - baseRisk,
    deltaGeoVsLive: geoRisk - liveRisk,
  };
}

