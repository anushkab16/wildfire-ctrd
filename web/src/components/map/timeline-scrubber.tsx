"use client";

import { Slider } from "@/components/ui/slider";

export function TimelineScrubber({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Timeline replay</p>
      <Slider
        value={[value]}
        min={0}
        max={Math.max(1, max)}
        step={1}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v;
          onChange(next ?? 0);
        }}
      />
    </div>
  );
}

