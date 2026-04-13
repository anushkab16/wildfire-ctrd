"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type LayerState = {
  hotspots: boolean;
  risk: boolean;
  wind: boolean;
  dryness: boolean;
  exposure: boolean;
};

export function LayerControls({
  layers,
  setLayers,
}: {
  layers: LayerState;
  setLayers: (next: LayerState) => void;
}) {
  const items: Array<{ key: keyof LayerState; label: string }> = [
    { key: "hotspots", label: "Hotspots" },
    { key: "risk", label: "Risk Heat" },
    { key: "wind", label: "Wind" },
    { key: "dryness", label: "Dryness" },
    { key: "exposure", label: "Exposure" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <Checkbox
            id={`layer-${item.key}`}
            checked={layers[item.key]}
            onCheckedChange={(checked) =>
              setLayers({
                ...layers,
                [item.key]: Boolean(checked),
              })
            }
          />
          <Label htmlFor={`layer-${item.key}`}>{item.label}</Label>
        </div>
      ))}
    </div>
  );
}

