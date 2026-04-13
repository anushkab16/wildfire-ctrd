import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalibrationPanel({
  thresholds,
}: {
  thresholds: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration Thresholds</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {Object.entries(thresholds).map(([key, value]) => (
          <p key={key}>
            {key}: <strong>{Number(value).toFixed(4)}</strong>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

