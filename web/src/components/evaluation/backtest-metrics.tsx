import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BacktestMetrics({ metrics }: { metrics: Record<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backtest Metrics</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {Object.entries(metrics).map(([key, value]) => (
          <p key={key}>
            {key}: <strong>{Number(value).toFixed(4)}</strong>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

