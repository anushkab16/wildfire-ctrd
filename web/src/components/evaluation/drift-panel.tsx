import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DriftPanel({ drift }: { drift: Record<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature Drift</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {Object.entries(drift).map(([key, value]) => (
          <p key={key}>
            {key}: <strong>{Number(value).toFixed(4)}</strong>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

