"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";

import { AlertsTable } from "@/components/alerts/alerts-table";
import { LiveFeed } from "@/components/feed/live-feed";
import { GlobeView } from "@/components/map/globe-view";
import { LayerControls, type LayerState } from "@/components/map/layer-controls";
import { Legend } from "@/components/map/legend";
import { TimelineScrubber } from "@/components/map/timeline-scrubber";
import { ActionPanel } from "@/components/risk/action-panel";
import { ExplainabilityPanel } from "@/components/risk/explainability-panel";
import { ForecastTabs } from "@/components/risk/forecast-tabs";
import { WatchlistTable } from "@/components/watchlists/watchlist-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyzeResponse } from "@/lib/types";

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
  const [layers, setLayers] = useState<LayerState>({
    hotspots: true,
    risk: true,
    wind: false,
    dryness: false,
    exposure: false,
  });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);

  const fetchSnapshot = async () => {
    const resp = await fetch("/api/global-snapshot");
    const data = await resp.json();
    if (resp.ok) setSnapshot(data);
  };

  const fetchWatchlists = async () => {
    const resp = await fetch("/api/watchlists");
    const data = await resp.json();
    if (resp.ok) setWatchlists(data.watchlists);
  };

  const fetchAlerts = async () => {
    const resp = await fetch("/api/alerts");
    const data = await resp.json();
    if (resp.ok) setAlerts(data.alerts);
  };

  useEffect(() => {
    void fetchSnapshot();
    void fetchWatchlists();
    void fetchAlerts();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("heartbeat", () => {
      void fetchSnapshot();
      void fetchAlerts();
    });
    return () => es.close();
  }, []);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
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
          : horizonMode === "24"
            ? [24]
            : horizonMode === "72"
              ? [72]
              : [168];
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
      if (!resp.ok) {
        setError(data.error ?? "Evaluation failed");
      } else {
        setEvaluation({ backtest: data.backtest, ablation: data.ablation });
        toast.success("Evaluation loaded");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingEval(false);
    }
  };

  const globePoints = useMemo(() => {
    const points: Array<{ id: string; lat: number; lng: number; size: number; color: string; label: string }> = [];
    if (snapshot?.topRegions) {
      snapshot.topRegions.forEach((region) => {
        const [latStr, lonStr] = region.regionId.split(",");
        const lat = Number(latStr);
        const lng = Number(lonStr);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const color =
            region.level === "CRITICAL"
              ? "#ef4444"
              : region.level === "RED"
                ? "#f97316"
                : region.level === "ORANGE"
                  ? "#facc15"
                  : "#22c55e";
          points.push({
            id: region.regionId,
            lat,
            lng,
            size: 0.06 + region.riskScore * 0.25,
            color,
            label: `${region.name} (${region.level})`,
          });
        }
      });
    }
    if (result?.hotspots && layers.hotspots) {
      result.hotspots.slice(0, 300).forEach((hotspot, idx) => {
        points.push({
          id: `hs-${idx}`,
          lat: hotspot.latitude,
          lng: hotspot.longitude,
          size: 0.03,
          color: "#f97316",
          label: `Hotspot FRP ${Number(hotspot.frp ?? 0).toFixed(2)}`,
        });
      });
    }
    return points;
  }, [snapshot, result?.hotspots, layers.hotspots]);

  const addCurrentAsWatchlist = async () => {
    const resp = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Region ${latitude}, ${longitude}`,
        region: { latitude: Number(latitude), longitude: Number(longitude), radiusKm: Number(radiusKm) },
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

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <Flame className="h-7 w-7 text-orange-500" />
            Wildfire Early Warning and Decision Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Hotspots</p>
                <p className="text-xl font-semibold">{snapshot?.kpis.activeHotspots ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Critical Regions</p>
                <p className="text-xl font-semibold">{snapshot?.kpis.criticalRegions ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Global Risk</p>
                <p className="text-xl font-semibold">{(snapshot?.kpis.avgGlobalRisk ?? 0).toFixed(3)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Monitors</p>
                <p className="text-xl font-semibold">{snapshot?.kpis.monitorCount ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="file">Upload CSV Dataset</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Horizon</Label>
              <Select value={horizonMode} onValueChange={(v) => setHorizonMode(v ?? "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">24h + 72h + 7d</SelectItem>
                  <SelectItem value="24">24h</SelectItem>
                  <SelectItem value="72">72h</SelectItem>
                  <SelectItem value="168">7d</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coordinates</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Lat" />
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Lon" />
                <Input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="Radius km" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Optional notifications</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (SMTP configured)"
                />
                <Input
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Telegram chat id"
                />
              </div>
            </div>
          </div>

          <LayerControls layers={layers} setLayers={setLayers} />
          <Legend />

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <GlobeView points={globePoints} onSelect={focusRegion} />
            <Tabs defaultValue="feed">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="watchlists">Watchlists</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>
              <TabsContent value="feed">
                <LiveFeed events={snapshot?.feed ?? []} onFocusRegion={focusRegion} />
              </TabsContent>
              <TabsContent value="watchlists" className="space-y-2">
                <Button variant="outline" size="sm" onClick={addCurrentAsWatchlist}>
                  Add current region
                </Button>
                <WatchlistTable watchlists={watchlists} onToggle={toggleWatchlist} />
              </TabsContent>
              <TabsContent value="alerts">
                <AlertsTable alerts={alerts} onAcknowledge={ackAlert} />
              </TabsContent>
            </Tabs>
          </div>

          <TimelineScrubber
            value={timelineIndex}
            max={Math.max(1, (result?.timeline.length ?? 1) - 1)}
            onChange={setTimelineIndex}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSample}>
                Use built-in dataset
              </Button>
              <Button onClick={runAnalysis} disabled={loading || !csvText}>
                {loading ? "Running..." : "Run analysis"}
              </Button>
              <Button variant="outline" onClick={runEvaluation} disabled={loadingEval}>
                {loadingEval ? "Evaluating..." : "Run evaluation"}
              </Button>
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="text-2xl font-semibold">{result.latestRisk.toFixed(3)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Alert</p>
                    <Badge variant="outline">{result.latestLevel}</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Dominant Driver</p>
                    <p className="text-lg font-semibold capitalize">
                      {result.explainability.dominantDriver}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Action</p>
                    <p className="text-sm">{result.recommendedAction}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <p className="truncate text-sm">{result.requestId}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ActionPanel
                  level={result.latestLevel}
                  action={result.recommendedAction}
                  triggered={result.alertDispatch.triggered}
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {result.timeline[Math.min(timelineIndex, result.timeline.length - 1)] ? (
                      <p>
                        Selected point:{" "}
                        {
                          result.timeline[Math.min(timelineIndex, result.timeline.length - 1)]
                            .timestamp
                        }{" "}
                        | score{" "}
                        {result.timeline[
                          Math.min(timelineIndex, result.timeline.length - 1)
                        ].riskScore.toFixed(3)}
                      </p>
                    ) : (
                      <p>No timeline data</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <ForecastTabs forecasts={result.forecasts} />

              <ExplainabilityPanel
                dominantDriver={result.explainability.dominantDriver}
                topFactors={result.explainability.topFactors}
                changedSinceYesterday={result.explainability.changedSinceYesterday}
              />
            </div>
          ) : null}

          {evaluation ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Evaluation</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Backtest</p>
                  {Object.entries(evaluation.backtest).map(([key, value]) => (
                    <p key={key}>
                      {key}: {Number(value).toFixed(4)}
                    </p>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Ablation</p>
                  {Object.entries(evaluation.ablation).map(([key, value]) => (
                    <p key={key}>
                      {key}: {Number(value).toFixed(4)}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
