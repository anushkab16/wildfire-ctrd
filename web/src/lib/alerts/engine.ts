export function shouldTriggerAlert(level: string) {
  return level === "RED" || level === "CRITICAL";
}

export function buildAlertMessage({
  level,
  score,
  action,
  location,
}: {
  level: string;
  score: number;
  action: string;
  location: string;
}) {
  return `Wildfire alert ${level} at ${location}. Risk score ${score.toFixed(
    3,
  )}. Recommended action: ${action}`;
}

