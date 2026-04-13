import { calibrateThresholds, classifyAlert } from "@/lib/ml/calibration";

export function runBacktest(series: number[]) {
  if (series.length < 10) {
    return { mae: 0, rmse: 0, precision: 0, recall: 0, f1: 0, samples: 0 };
  }
  const errors: number[] = [];
  const predictedLabels: string[] = [];
  const actualLabels: string[] = [];

  for (let i = 7; i < series.length - 1; i += 1) {
    const train = series.slice(0, i);
    const actual = series[i + 1];
    const prediction = train.slice(-3).reduce((a, b) => a + b, 0) / 3;
    errors.push(actual - prediction);
    const thresholds = calibrateThresholds(train);
    predictedLabels.push(classifyAlert(prediction, thresholds));
    actualLabels.push(classifyAlert(actual, thresholds));
  }

  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);

  const positives = ["RED", "CRITICAL"];
  let tp = 0;
  let fp = 0;
  let fn = 0;
  predictedLabels.forEach((pred, index) => {
    const actual = actualLabels[index];
    const predPositive = positives.includes(pred);
    const actPositive = positives.includes(actual);
    if (predPositive && actPositive) tp += 1;
    if (predPositive && !actPositive) fp += 1;
    if (!predPositive && actPositive) fn += 1;
  });
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    mae,
    rmse,
    precision,
    recall,
    f1,
    samples: errors.length,
  };
}

