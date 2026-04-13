import { Panel } from "@/components/ui/panel";

export function CalibrationPanel({ thresholds }: { thresholds: Record<string, number> }) {
  return (
    <Panel title="Calibration Thresholds">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {Object.entries(thresholds).map(([key, value]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
            <span style={{ textTransform: "uppercase", color: "var(--text-dim)" }}>{key}</span>
            <span style={{ fontWeight: 600 }}>{Number(value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
