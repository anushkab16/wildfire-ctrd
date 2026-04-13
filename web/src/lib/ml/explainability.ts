export function deriveExplainability(
  contributions: Record<string, number>,
  latestComponents: Record<string, number>,
  previousComponents: Record<string, number>,
) {
  const sorted = Object.entries(contributions)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const dominantDriver = sorted[0]?.name ?? "ignition";

  const changedSinceYesterday = Object.keys(latestComponents).map((component) => ({
    component,
    delta: (latestComponents[component] ?? 0) - (previousComponents[component] ?? 0),
  }));
  changedSinceYesterday.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    dominantDriver,
    topFactors: sorted.slice(0, 3),
    changedSinceYesterday: changedSinceYesterday.slice(0, 5),
  };
}

