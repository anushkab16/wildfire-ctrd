export function calibrateThresholds(trainingRiskSeries: number[]) {
  if (trainingRiskSeries.length < 5) {
    return {
      GREEN: 0.2,
      YELLOW: 0.4,
      ORANGE: 0.6,
      RED: 0.8,
    };
  }
  const sorted = [...trainingRiskSeries].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
  return {
    GREEN: q(0.2),
    YELLOW: q(0.45),
    ORANGE: q(0.7),
    RED: q(0.9),
  };
}

export function classifyAlert(score: number, t: Record<string, number>) {
  if (score < t.GREEN) return "GREEN";
  if (score < t.YELLOW) return "YELLOW";
  if (score < t.ORANGE) return "ORANGE";
  if (score < t.RED) return "RED";
  return "CRITICAL";
}

