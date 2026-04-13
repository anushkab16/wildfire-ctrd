import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedEvent = {
  eventId: string;
  type: string;
  regionId: string;
  timestamp: string;
  level?: string;
};

export function LiveFeed({
  events,
  onFocusRegion,
}: {
  events: FeedEvent[];
  onFocusRegion: (regionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.slice(0, 20).map((event) => (
          <button
            type="button"
            key={event.eventId}
            onClick={() => onFocusRegion(event.regionId)}
            className="w-full rounded-md border p-2 text-left text-xs hover:bg-muted"
          >
            <p className="font-medium">{event.type}</p>
            <p className="text-muted-foreground">{event.regionId}</p>
            <p className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

