import { Panel } from "@/components/ui/panel";

export function DriftPanel({ drift }: { drift: Record<string, number> }) {
  return (
    <Panel title="Feature Drift">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {Object.entries(drift).map(([key, value]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
            <span style={{ textTransform: "uppercase", color: "var(--text-dim)" }}>{key}</span>
            <span style={{ fontWeight: 600 }}>{Number(value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
