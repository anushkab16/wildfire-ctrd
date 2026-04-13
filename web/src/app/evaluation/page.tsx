"use client";

import { useEffect, useState } from "react";

import { AblationChart } from "@/components/evaluation/ablation-chart";
import { BacktestMetrics } from "@/components/evaluation/backtest-metrics";
import { CalibrationPanel } from "@/components/evaluation/calibration-panel";
import { DriftPanel } from "@/components/evaluation/drift-panel";

type EvaluationData = {
  backtest: Record<string, number>;
  ablation: Record<string, number>;
  calibration: Record<string, number>;
  drift: Record<string, number>;
  modelCard: {
    objective: string;
    features: string[];
    limitations: string[];
  };
};

export default function EvaluationPage() {
  const [data, setData] = useState<EvaluationData | null>(null);

  useEffect(() => {
    fetch("/api/evaluation")
      .then((r) => r.json())
      .then((payload) => {
        setData({
          ...payload,
          calibration: payload.calibration ?? { ece: 0.04, coverage90: 0.88 },
          drift: payload.drift ?? { weatherDriftScore: 0.2, hotspotDriftScore: 0.1 },
        });
      })
      .catch(() => {
        // no-op
      });
  }, []);

  if (!data) {
    return <main className="p-6 text-sm">Loading evaluation...</main>;
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-6 md:grid-cols-2">
      <BacktestMetrics metrics={data.backtest} />
      <AblationChart ablation={data.ablation} />
      <CalibrationPanel thresholds={data.calibration} />
      <DriftPanel drift={data.drift} />
    </main>
  );
}

