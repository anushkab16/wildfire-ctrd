export function forecastFromSeries(
  series: number[],
  horizonHours: number,
): { predicted: number; baseline: number } {
  if (series.length === 0) return { predicted: 0, baseline: 0 };
  const baseline = series[series.length - 1];
  if (series.length < 4) return { predicted: baseline, baseline };

  const recent = series.slice(-7);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const drift = (recent[recent.length - 1] - recent[0]) / Math.max(1, recent.length - 1);
  const horizonScale = horizonHours / 24;
  const predicted = Math.max(0, Math.min(1, mean + drift * horizonScale));
  return { predicted, baseline };
}

