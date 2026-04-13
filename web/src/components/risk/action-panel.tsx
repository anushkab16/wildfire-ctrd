import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActionPanel({
  level,
  action,
  triggered,
}: {
  level: string;
  action: string;
  triggered: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Decision Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Current Alert Level: <strong>{level}</strong>
        </p>
        <p>{action}</p>
        <p>{triggered ? "Notification workflow triggered." : "No notification trigger right now."}</p>
      </CardContent>
    </Card>
  );
}

