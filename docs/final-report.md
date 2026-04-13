# Final Report: ML-First Wildfire Early Warning System

## Objective
Build a real-world oriented wildfire risk platform that highlights machine learning concepts while supporting operational decisions.

## System Summary
- Next.js web platform with shadcn UI.
- Unified `POST /api/analyze` route for ingestion + ML inference + alert trigger logic.
- Live data adapters:
  - NASA FIRMS hotspot detections
  - Open-Meteo forecast features
  - Geospatial feature adapter (GEE proxy with heuristic fallback)

## ML Pipeline
1. CSV preprocessing and schema normalization.
2. CT-RD component computation:
   - ignition, spread, fuel, containment, impact.
3. Dynamic weighting using environmental and geospatial context.
4. Multi-horizon forecasting (24h, 72h, 7d).
5. Uncertainty estimation via prediction intervals.
6. Explainability:
   - top factor contributions
   - dominant driver
   - change since previous timestep
7. Alert calibration and action recommendation.

## Evaluation
- Backtesting metrics: MAE, RMSE, precision, recall, F1.
- Ablation study:
  - base
  - base + live APIs
  - base + live APIs + geospatial features

## Operational Features
- Alert trigger engine for RED/CRITICAL thresholds.
- Optional email and Telegram notification dispatch.
- API response includes request id and latency.

## Limitations
- FIRMS and weather features depend on external API availability.
- GEE integration requires a configured proxy endpoint for live features.
- Current forecast model is lightweight and designed for course-scale reliability.

## Future Work
- Replace heuristic geospatial fallback with full production Earth Engine pipeline.
- Add spatial clustering and district-level prioritization.
- Add persistent storage for historical runs and user-defined watchlists.
# Final Report: Wildfire Intelligence Platform

## 1. Objective

Extend a baseline CT-RD wildfire model into a practical platform with:

- Real-world API ingestion
- Geospatial feature augmentation
- Interactive operations dashboard
- Reliability and evaluation artifacts

## 2. System Architecture

- **Python Analytics API** wraps the original CT-RD modules and orchestrates data fusion.
- **Next.js Web App** provides map-first interaction, explainability, and exports.
- **External Providers**:
  - NASA FIRMS (hotspot detections)
  - Open-Meteo (weather forecasts)
  - Google Earth Engine (geospatial context, with mock fallback)

## 3. Core Model Flow

1. Load and clean wildfire dataset.
2. Compute interpretable CT-RD components.
3. Fuse external features (weather/geospatial).
4. Forecast component values.
5. Compute dynamic weights and composite risk.
6. Output alert level, recommended action, contributions, confidence.

## 4. Explainability

- Dominant driver for each run
- Per-component contributions
- Dynamic weight table
- Feature-attribution metadata (source-level)

## 5. Validation

- Backtest metrics:
  - MAE
  - RMSE
  - Alert-class accuracy proxy
- Ablation:
  - Base model
  - Base + live APIs
  - Base + live APIs + GEE

## 6. Engineering Reliability

- Request IDs
- Structured logging
- Endpoint timing metadata
- SQLite-backed response cache for third-party APIs

## 7. Limitations

- GEE access depends on project credentials and may fallback to mock features.
- FIRMS endpoint requires MAP_KEY and has external constraints.
- Current evaluation is lightweight and can be expanded with richer temporal folds.

## 8. Future Work

- Region-wise historical benchmarking
- Queue workers for large-area batch runs
- User auth and alert subscriptions
- PDF report export and downloadable charts
