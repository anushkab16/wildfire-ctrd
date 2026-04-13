export type RegionInput = {
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export type AnalyzeRequest = {
  csvText?: string;
  region: RegionInput;
  horizons: number[];
  enableLiveData: boolean;
  enableGeospatial: boolean;
  notify?: {
    email?: string;
    telegramChatId?: string;
  };
};

export type ForecastBundle = {
  horizonHours: number;
  riskScore: number;
  level: string;
  interval: {
    low: number;
    high: number;
  };
  components: Record<string, number>;
  contributions: Record<string, number>;
};

export type ExplainabilityPayload = {
  dominantDriver: string;
  topFactors: Array<{ name: string; value: number }>;
  changedSinceYesterday: Array<{ component: string; delta: number }>;
};

export type AnalyzeResponse = {
  requestId: string;
  latencyMs: number;
  latestRisk: number;
  latestLevel: string;
  recommendedAction: string;
  timeline: Array<{ timestamp: string; riskScore: number }>;
  forecasts: ForecastBundle[];
  calibratedThresholds: Record<string, number>;
  explainability: ExplainabilityPayload;
  featuresUsed: {
    weather: Record<string, number>;
    geospatial: Record<string, number>;
    hotspotSummary: Record<string, number>;
  };
  hotspots: Array<{ latitude: number; longitude: number; frp?: number }>;
  alertDispatch: {
    triggered: boolean;
    recipients: string[];
  };
};

export type Region = {
  latitude: number;
  longitude: number;
  radius_km: number;
};

export type RiskRequest = {
  dataset_path?: string;
  region?: Region;
  forecast_horizon_days: number;
  use_live_data: boolean;
  include_geospatial_features: boolean;
};

export type RiskResponse = {
  risk_score: number;
  alert_level: string;
  action: string;
  dominant_driver: string;
  confidence: number;
  prediction_interval: { low: number; high: number };
  predictions: Record<string, number>;
  weights: Record<string, number>;
  contributions: Record<string, number>;
  external_features: Record<string, string | number | boolean>;
  feature_attribution: {
    sources: string[];
    forecast_horizon_days: number;
    region: Region | null;
  };
  meta: { request_id: string; duration_ms: number };
};
