import { Badge } from "@/components/ui/badge";

export function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <Badge variant="outline">GREEN &lt; 0.2</Badge>
      <Badge variant="secondary">YELLOW 0.2-0.4</Badge>
      <Badge variant="secondary">ORANGE 0.4-0.6</Badge>
      <Badge variant="destructive">RED 0.6-0.8</Badge>
      <Badge variant="destructive">CRITICAL &gt; 0.8</Badge>
    </div>
  );
}

