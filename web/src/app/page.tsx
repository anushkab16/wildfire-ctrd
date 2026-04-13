"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";

import { RiskMap } from "@/components/map/risk-map";
import { ActionPanel } from "@/components/risk/action-panel";
import { ExplainabilityPanel } from "@/components/risk/explainability-panel";
import { ForecastTabs } from "@/components/risk/forecast-tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnalyzeResponse } from "@/lib/types";

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
                <RiskMap
                  center={{
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radiusKm: Number(radiusKm),
                  }}
                  hotspots={result.hotspots}
                  riskScore={result.latestRisk}
                />
                <ActionPanel
                  level={result.latestLevel}
                  action={result.recommendedAction}
                  triggered={result.alertDispatch.triggered}
                />
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
