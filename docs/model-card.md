# Model Card (CT-RD v2)

## Model Objective
Forecast short-horizon wildfire risk and classify operational severity for selected regions.

## Inputs
- Tabular wildfire/weather dataset (CSV baseline)
- Live weather summary (temperature, humidity, wind, precipitation probability)
- Live hotspot summary (count, FRP, confidence ratio)
- Geospatial risk proxies (vegetation dryness, thermal anomaly, burn severity)

## Outputs
- Risk scores for 24h, 72h, 7d horizons
- Calibrated severity class (GREEN, YELLOW, ORANGE, RED, CRITICAL)
- Prediction interval estimates
- Component contributions and driver deltas

## Explainability
- Dominant driver by contribution ranking
- Top factors influencing current severity
- Change since previous timestep for CT-RD components

## Evaluation
- Backtesting: MAE, RMSE
- Classification quality: precision, recall, F1 for high-risk classes
- Ablation:
  - base
  - base + live APIs
  - base + live APIs + geospatial features

## Limitations
- External API quality and uptime can affect real-time responsiveness.
- Geospatial adapter may use fallback heuristic if live proxy is unavailable.
- Current forecasting is lightweight and intended for rapid operational prototyping.

