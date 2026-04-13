"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Panel } from "@/components/ui/panel";
import type { AnalyzeResponse } from "@/lib/types";
import type { MapPoint } from "@/components/map/d3-map";

const D3Map = dynamic(
  () => import("@/components/map/d3-map").then((m) => m.D3Map),
  { ssr: false }
);

/* ---------- Types ---------- */

type Snapshot = {
  generatedAt: string;
  kpis: {
    activeHotspots: number;
    criticalRegions: number;
    avgGlobalRisk: number;
    monitorCount: number;
  };
  topRegions: Array<{
    regionId: string;
    name: string;
    riskScore: number;
    level: string;
    dominantDriver: string;
  }>;
  feed: Array<{
    eventId: string;
    type: string;
    regionId: string;
    timestamp: string;
    level?: string;
  }>;
};

type Watchlist = {
  id: string;
  name: string;
  region: { latitude: number; longitude: number; radiusKm: number };
  enabled: boolean;
};

type AlertRow = {
  id: string;
  level: string;
  status: string;
  createdAt: string;
  recipients: string[];
};

/* ---------- Styles ---------- */

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.5rem 1rem",
  background: "var(--surface)",
  borderBottom: "1px solid var(--border)",
  position: "sticky",
  top: 0,
  zIndex: 100,
  gap: "1rem",
};

const logoStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "var(--text-primary)",
  margin: 0,
};

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  minHeight: "2rem",
  padding: "0.3rem 0.6rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 4,
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "0.65rem",
  fontFamily: "inherit",
  transition: "all 0.15s ease",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "0.3rem 0.5rem",
  color: "var(--text)",
  fontSize: "0.7rem",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color: "var(--text-muted)",
  marginBottom: "0.2rem",
  display: "block",
};

const kpiStyle: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "0.5rem",
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--text)",
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: "0.55rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--text-muted)",
  marginTop: "0.15rem",
};

const feedItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.35rem 0",
  borderBottom: "1px solid var(--border)",
  fontSize: "0.65rem",
};

const alertLevelColors: Record<string, string> = {
  CRITICAL: "#ff0000",
  RED: "#ff4444",
  ORANGE: "#ffaa00",
  YELLOW: "#ffcc00",
  GREEN: "#44ff88",
};

/* ---------- Component ---------- */

export default function Home() {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [evaluation, setEvaluation] = useState<{
    backtest: Record<string, number>;
    ablation: Record<string, number>;
  } | null>(null);
  const [latitude, setLatitude] = useState("36.75");
  const [longitude, setLongitude] = useState("3.06");
  const [radiusKm, setRadiusKm] = useState("30");
  const [horizonMode, setHorizonMode] = useState("all");
  const [email, setEmail] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /* ---- Data fetching ---- */

  const fetchSnapshot = useCallback(async () => {
    try {
      const resp = await fetch("/api/global-snapshot");
      const data = await resp.json();
      if (resp.ok) {
        setSnapshot(data);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ }
  }, []);

  const fetchWatchlists = useCallback(async () => {
    try {
      const resp = await fetch("/api/watchlists");
      const data = await resp.json();
      if (resp.ok) setWatchlists(data.watchlists);
    } catch { /* silent */ }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const resp = await fetch("/api/alerts");
      const data = await resp.json();
      if (resp.ok) setAlerts(data.alerts);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
    void fetchWatchlists();
    void fetchAlerts();
  }, [fetchSnapshot, fetchWatchlists, fetchAlerts]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("heartbeat", () => {
      void fetchSnapshot();
      void fetchAlerts();
    });
    return () => es.close();
  }, [fetchSnapshot, fetchAlerts]);

  /* ---- Handlers ---- */

  const handleFileUpload = async (file: File) => {
    setCsvText(await file.text());
  };

  const loadSample = async () => {
    setError("");
    const resp = await fetch("/api/sample-csv");
    const data = await resp.json();
    if (!resp.ok) {
      setError(data.error ?? "Could not load sample dataset");
      return;
    }
    setCsvText(data.csvText);
    toast.success("Loaded built-in dataset");
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const horizons =
        horizonMode === "all"
          ? [24, 72, 168]
          : [Number(horizonMode)];
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          region: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusKm: Number(radiusKm),
          },
          horizons,
          enableLiveData: true,
          enableGeospatial: true,
          notify: {
            email: email || undefined,
            telegramChatId: telegramChatId || undefined,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Analysis failed");
      } else {
        setResult(data);
        await fetchSnapshot();
        await fetchAlerts();
        toast.success("Analysis completed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    setLoadingEval(true);
    try {
      const resp = await fetch("/api/evaluation");
      const data = await resp.json();
      if (!resp.ok) setError(data.error ?? "Evaluation failed");
      else {
        setEvaluation({ backtest: data.backtest, ablation: data.ablation });
        toast.success("Evaluation loaded");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingEval(false);
    }
  };

  const addCurrentAsWatchlist = async () => {
    const resp = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Region ${latitude}, ${longitude}`,
        region: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusKm: Number(radiusKm),
        },
        enabled: true,
      }),
    });
    if (resp.ok) {
      toast.success("Watchlist added");
      await fetchWatchlists();
    }
  };

  const toggleWatchlist = async (id: string, enabled: boolean) => {
    await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    await fetchWatchlists();
  };

  const ackAlert = async (id: string) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAlerts();
  };

  const focusRegion = (regionId: string) => {
    const [lat, lon] = regionId.split(",");
    if (lat && lon) {
      setLatitude(lat);
      setLongitude(lon);
      toast.message(`Focused ${regionId}`);
    }
  };

  /* ---- Map points ---- */

  const mapPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = [];
    if (snapshot?.topRegions) {
      snapshot.topRegions.forEach((r) => {
        const [latS, lonS] = r.regionId.split(",");
        const lat = Number(latS);
        const lng = Number(lonS);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          pts.push({
            id: r.regionId,
            lat,
            lng,
            size: 0.06 + r.riskScore * 0.25,
            color: alertLevelColors[r.level] ?? "#44ff88",
            label: `${r.name} (${r.level}) \u2014 risk ${r.riskScore.toFixed(3)}`,
          });
        }
      });
    }
    if (result?.hotspots) {
      result.hotspots.slice(0, 300).forEach((h, i) => {
        pts.push({
          id: `hs-${i}`,
          lat: h.latitude,
          lng: h.longitude,
          size: 0.03,
          color: "#ff8844",
          label: `Hotspot FRP ${Number(h.frp ?? 0).toFixed(1)}`,
        });
      });
    }
    return pts;
  }, [snapshot, result?.hotspots]);

  /* ---- Render ---- */

  const kpis = snapshot?.kpis ?? {
    activeHotspots: 0,
    criticalRegions: 0,
    avgGlobalRisk: 0,
    monitorCount: 0,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* ===== Header ===== */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "baseline", flexShrink: 0 }}>
          <h1 style={logoStyle}>
            <span style={{ color: "#ff4444", marginRight: "0.4rem" }}>{"\uD83D\uDD25"}</span>
            WILDFIRE MONITOR
          </h1>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
            {lastRefresh
              ? `Last updated: ${lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Never refreshed"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <button
            style={btnStyle}
            onClick={() => {
              void fetchSnapshot();
              void fetchWatchlists();
              void fetchAlerts();
            }}
            onMouseEnter={(e) =>
              Object.assign(e.currentTarget.style, { background: "var(--border)", color: "var(--text-primary)" })
            }
            onMouseLeave={(e) =>
              Object.assign(e.currentTarget.style, { background: "transparent", color: "var(--text-secondary)" })
            }
          >
            {"\u21BB"} Refresh
          </button>
        </div>
      </header>

      {/* ===== Dashboard ===== */}
      <main style={{ flex: 1, padding: "0.5rem", overflowY: "auto" }}>
        <div
          style={{
            columnCount: 1,
            columnGap: "0.5rem",
            maxWidth: 2000,
            margin: "0 auto",
          }}
          className="dashboard-grid"
        >
          {/* --- Map (full-width) --- */}
          <div style={{ columnSpan: "all", marginBottom: "0.5rem" }}>
            <Panel title="Global Wildfire Map" status="Monitoring" statusClass="monitoring">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={kpiStyle}>
                  <div style={kpiValueStyle}>{kpis.activeHotspots}</div>
                  <div style={kpiLabelStyle}>Active Hotspots</div>
                </div>
                <div style={kpiStyle}>
                  <div style={{ ...kpiValueStyle, color: kpis.criticalRegions > 0 ? "var(--red)" : undefined }}>{kpis.criticalRegions}</div>
                  <div style={kpiLabelStyle}>Critical Regions</div>
                </div>
                <div style={kpiStyle}>
                  <div style={kpiValueStyle}>{kpis.avgGlobalRisk.toFixed(3)}</div>
                  <div style={kpiLabelStyle}>Avg Global Risk</div>
                </div>
                <div style={kpiStyle}>
                  <div style={kpiValueStyle}>{kpis.monitorCount}</div>
                  <div style={kpiLabelStyle}>Monitors</div>
                </div>
              </div>
              <D3Map points={mapPoints} onSelect={focusRegion} />
            </Panel>
          </div>

          {/* --- Risk Analysis --- */}
          <Panel
            title="Risk Analysis"
            status={loading ? "Running" : result ? result.latestLevel : ""}
            statusClass={
              result?.latestLevel === "CRITICAL" || result?.latestLevel === "RED"
                ? "critical"
                : result?.latestLevel === "ORANGE" || result?.latestLevel === "YELLOW"
                  ? "elevated"
                  : "monitoring"
            }
            loading={loading}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div>
                <label style={labelStyle}>Dataset</label>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFileUpload(f);
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    style={btnStyle}
                    onClick={loadSample}
                    onMouseEnter={(e) =>
                      Object.assign(e.currentTarget.style, { background: "var(--border)", color: "var(--text-primary)" })
                    }
                    onMouseLeave={(e) =>
                      Object.assign(e.currentTarget.style, { background: "transparent", color: "var(--text-secondary)" })
                    }
                  >
                    Sample
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.3rem" }}>
                <div>
                  <label style={labelStyle}>Lat</label>
                  <input style={inputStyle} value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Lon</label>
                  <input style={inputStyle} value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Radius km</label>
                  <input style={inputStyle} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Horizon</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={horizonMode}
                  onChange={(e) => setHorizonMode(e.target.value)}
                >
                  <option value="all">24h + 72h + 7d</option>
                  <option value="24">24h</option>
                  <option value="72">72h</option>
                  <option value="168">7d</option>
                </select>
              </div>
              <button
                style={{
                  ...btnStyle,
                  background: csvText ? "var(--red)" : "var(--border)",
                  color: csvText ? "#fff" : "var(--text-muted)",
                  border: "none",
                  justifyContent: "center",
                  fontWeight: 600,
                  opacity: loading || !csvText ? 0.6 : 1,
                  cursor: loading || !csvText ? "not-allowed" : "pointer",
                }}
                onClick={runAnalysis}
                disabled={loading || !csvText}
              >
                {loading ? "Running..." : "\u25B6 Run Analysis"}
              </button>
              {error && (
                <div style={{ color: "var(--red)", fontSize: "0.65rem", padding: "0.3rem" }}>
                  {error}
                </div>
              )}
              {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Risk Score</span>
                    <span style={{ fontWeight: 700, color: alertLevelColors[result.latestLevel] ?? "var(--text)" }}>
                      {result.latestRisk.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Alert Level</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.6rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: 3,
                        color: alertLevelColors[result.latestLevel] ?? "var(--text)",
                        background: `${alertLevelColors[result.latestLevel] ?? "#444"}22`,
                      }}
                    >
                      {result.latestLevel}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Dominant Driver</span>
                    <span style={{ textTransform: "capitalize" }}>
                      {result.explainability.dominantDriver}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    {result.recommendedAction}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* --- Active Fires --- */}
          <Panel
            title="Active Fires"
            count={result?.hotspots?.length ?? 0}
            status={
              (result?.hotspots?.length ?? 0) > 50
                ? "Critical"
                : (result?.hotspots?.length ?? 0) > 0
                  ? "Elevated"
                  : "Clear"
            }
            statusClass={
              (result?.hotspots?.length ?? 0) > 50
                ? "critical"
                : (result?.hotspots?.length ?? 0) > 0
                  ? "elevated"
                  : "monitoring"
            }
          >
            {result?.hotspots && result.hotspots.length > 0 ? (
              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {result.hotspots.slice(0, 30).map((h, i) => (
                  <div key={i} style={feedItemStyle}>
                    <span>
                      <span style={{ color: "#ff4444" }}>{"\u25CF"}</span>{" "}
                      {h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}
                    </span>
                    <span style={{ color: "var(--orange)" }}>
                      FRP {Number(h.frp ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                Run analysis to detect active fires
              </div>
            )}
          </Panel>

          {/* --- Live Feed --- */}
          <Panel title="Live Feed" count={snapshot?.feed?.length ?? 0}>
            {snapshot?.feed && snapshot.feed.length > 0 ? (
              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {snapshot.feed.slice(0, 20).map((ev) => (
                  <div key={ev.eventId} style={feedItemStyle}>
                    <div>
                      <span
                        style={{
                          color:
                            ev.level === "CRITICAL"
                              ? "#ff0000"
                              : ev.level === "RED"
                                ? "#ff4444"
                                : ev.type === "hotspot"
                                  ? "#ff8844"
                                  : "#888",
                          marginRight: "0.3rem",
                        }}
                      >
                        {ev.type === "hotspot" ? "\uD83D\uDD25" : ev.type === "risk_escalation" ? "\u26A0" : "\u25CF"}
                      </span>
                      <button
                        style={{ ...btnStyle, border: "none", padding: 0, fontSize: "0.65rem", textDecoration: "underline", cursor: "pointer" }}
                        onClick={() => focusRegion(ev.regionId)}
                      >
                        {ev.regionId}
                      </button>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                No events yet
              </div>
            )}
          </Panel>

          {/* --- Forecasts --- */}
          <Panel title="Forecasts" loading={loading}>
            {result?.forecasts && result.forecasts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {result.forecasts.map((f, i) => (
                  <div key={i} style={{ background: "var(--bg)", borderRadius: 4, padding: "0.4rem 0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: 600 }}>{f.horizonHours}h Forecast</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: f.riskScore > 0.6 ? "var(--red)" : f.riskScore > 0.4 ? "var(--yellow)" : "var(--green)",
                        }}
                      >
                        {f.riskScore.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                      CI: [{f.interval.low.toFixed(3)}, {f.interval.high.toFixed(3)}]
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem", fontSize: "0.6rem", flexWrap: "wrap" }}>
                      {Object.entries(f.components).map(([k, v]) => (
                        <span key={k} style={{ color: "var(--text-dim)" }}>
                          {k.slice(0, 3)}: {(v as number).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                Run analysis for forecasts
              </div>
            )}
          </Panel>

          {/* --- Explainability --- */}
          <Panel title="Explainability">
            {result?.explainability ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div style={{ fontSize: "0.7rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Dominant Driver: </span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize", color: "var(--yellow)" }}>
                    {result.explainability.dominantDriver}
                  </span>
                </div>
                <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginTop: "0.2rem" }}>
                  Top Factors
                </div>
                {result.explainability.topFactors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.65rem",
                      padding: "0.2rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ textTransform: "capitalize" }}>{f.name}</span>
                    <span style={{ color: "var(--text-dim)" }}>{(f.value * 100).toFixed(1)}%</span>
                  </div>
                ))}
                {result.explainability.changedSinceYesterday &&
                  result.explainability.changedSinceYesterday.length > 0 && (
                  <div style={{ marginTop: "0.3rem" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Changes since prev
                    </div>
                    {result.explainability.changedSinceYesterday.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.65rem",
                          padding: "0.15rem 0",
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>{c.component}</span>
                        <span
                          style={{
                            color: c.delta > 0 ? "var(--red)" : "var(--green)",
                          }}
                        >
                          {c.delta > 0 ? "+" : ""}
                          {(c.delta * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                Run analysis for insights
              </div>
            )}
          </Panel>

          {/* --- Alerts --- */}
          <Panel
            title="Alerts"
            count={alerts.length}
            statusClass={alerts.some((a) => a.level === "CRITICAL") ? "critical" : alerts.length > 0 ? "elevated" : "monitoring"}
            status={alerts.some((a) => a.level === "CRITICAL") ? "Critical" : alerts.length > 0 ? "Active" : "Clear"}
          >
            {alerts.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {alerts.map((a) => (
                  <div key={a.id} style={{ ...feedItemStyle, alignItems: "flex-start" }}>
                    <div>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          padding: "0.1rem 0.3rem",
                          borderRadius: 3,
                          color: alertLevelColors[a.level] ?? "#888",
                          background: `${alertLevelColors[a.level] ?? "#444"}22`,
                          marginRight: "0.3rem",
                        }}
                      >
                        {a.level}
                      </span>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {a.status !== "acknowledged" && (
                      <button
                        style={{ ...btnStyle, fontSize: "0.55rem", padding: "0.15rem 0.4rem" }}
                        onClick={() => ackAlert(a.id)}
                        onMouseEnter={(e) =>
                          Object.assign(e.currentTarget.style, { background: "var(--border)" })
                        }
                        onMouseLeave={(e) =>
                          Object.assign(e.currentTarget.style, { background: "transparent" })
                        }
                      >
                        ACK
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                No alerts
              </div>
            )}
          </Panel>

          {/* --- Watchlists --- */}
          <Panel title="Watchlists" count={watchlists.length}>
            <div style={{ marginBottom: "0.4rem" }}>
              <button
                style={btnStyle}
                onClick={addCurrentAsWatchlist}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, { background: "var(--border)", color: "var(--text-primary)" })
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, { background: "transparent", color: "var(--text-secondary)" })
                }
              >
                + Add current region
              </button>
            </div>
            {watchlists.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {watchlists.map((w) => (
                  <div key={w.id} style={feedItemStyle}>
                    <div>
                      <span style={{ fontSize: "0.7rem" }}>{w.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.6rem", marginLeft: "0.3rem" }}>
                        ({w.region.latitude.toFixed(1)}, {w.region.longitude.toFixed(1)})
                      </span>
                    </div>
                    <button
                      style={{
                        ...btnStyle,
                        fontSize: "0.55rem",
                        padding: "0.15rem 0.4rem",
                        color: w.enabled ? "var(--green)" : "var(--text-muted)",
                      }}
                      onClick={() => toggleWatchlist(w.id, !w.enabled)}
                      onMouseEnter={(e) =>
                        Object.assign(e.currentTarget.style, { background: "var(--border)" })
                      }
                      onMouseLeave={(e) =>
                        Object.assign(e.currentTarget.style, { background: "transparent" })
                      }
                    >
                      {w.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>
                No watchlists
              </div>
            )}
          </Panel>

          {/* --- Notifications --- */}
          <Panel title="Notifications">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div>
                <label style={labelStyle}>Email (SMTP)</label>
                <input
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Telegram Chat ID</label>
                <input
                  style={inputStyle}
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="123456789"
                />
              </div>
            </div>
          </Panel>

          {/* --- Evaluation --- */}
          <Panel title="Model Evaluation" loading={loadingEval}>
            <button
              style={{ ...btnStyle, width: "100%", justifyContent: "center", marginBottom: "0.4rem" }}
              onClick={runEvaluation}
              disabled={loadingEval}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, { background: "var(--border)", color: "var(--text-primary)" })
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, { background: "transparent", color: "var(--text-secondary)" })
              }
            >
              {loadingEval ? "Running..." : "\u25B6 Run Evaluation"}
            </button>
            {evaluation && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    Backtest
                  </div>
                  {Object.entries(evaluation.backtest).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", padding: "0.15rem 0" }}>
                      <span style={{ textTransform: "uppercase", color: "var(--text-dim)" }}>{k}</span>
                      <span>{Number(v).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    Ablation
                  </div>
                  {Object.entries(evaluation.ablation).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", padding: "0.15rem 0" }}>
                      <span style={{ textTransform: "uppercase", color: "var(--text-dim)" }}>{k}</span>
                      <span>{Number(v).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </main>

      {/* ===== Responsive grid CSS ===== */}
      <style jsx>{`
        .dashboard-grid {
          column-count: 1;
        }
        @media (min-width: 600px) {
          .dashboard-grid {
            column-count: 2;
          }
        }
        @media (min-width: 900px) {
          .dashboard-grid {
            column-count: 3;
          }
        }
        @media (min-width: 1200px) {
          .dashboard-grid {
            column-count: 4;
          }
        }
        @media (min-width: 1600px) {
          .dashboard-grid {
            column-count: 5;
          }
        }
      `}</style>
    </div>
  );
}
