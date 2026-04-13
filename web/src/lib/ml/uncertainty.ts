export function estimatePredictionInterval(values: number[], prediction: number) {
  if (values.length < 2) {
    return {
      low: Math.max(0, prediction - 0.05),
      high: Math.min(1, prediction + 0.05),
      stdDev: 0.05,
    };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  const stdDev = Math.sqrt(variance);
  return {
    low: Math.max(0, prediction - 1.64 * stdDev),
    high: Math.min(1, prediction + 1.64 * stdDev),
    stdDev,
  };
}

