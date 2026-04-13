# Wildfire Monitor

Real-time wildfire risk monitoring and early warning dashboard, powered by a Machine Learning pipeline (Causal-Temporal Risk Decomposition) with live data from NASA FIRMS, Open-Meteo, and Google Earth Engine.

Built as a college course project for Machine Learning.

---

## What It Does

Wildfire Monitor combines an ML risk decomposition algorithm with live satellite and weather data to assess wildfire risk for any region on Earth. Instead of producing a single opaque prediction, the system decomposes risk into **5 interpretable components**:

| Component | What It Measures |
|---|---|
| **Ignition** | Temperature + drought conditions (likelihood a fire starts) |
| **Spread** | Wind speed + low humidity (how fast fire would propagate) |
| **Fuel** | Vegetation buildup + dryness (available combustible material) |
| **Containment** | Rain + terrain accessibility (difficulty of suppression) |
| **Impact** | Fire weather severity + population exposure (damage potential) |

Each component is analyzed, forecasted across multiple time horizons, dynamically weighted based on current conditions, and aggregated into a transparent, actionable risk score with an alert classification.

---

## The Dashboard

The UI is modeled after [Situation Monitor](https://hipcityreg-situation-monitor.vercel.app/) — a dark, monospace, map-first operational dashboard.

### Header

Top bar with **"WILDFIRE MONITOR"**, a last-updated timestamp, and a **Refresh** button.

### Global Wildfire Map (full-width top panel)

A D3.js 2D equirectangular world map with:

- **Dark green countries** on black background
- **Day/night terminator** — shadow overlay showing current nighttime hemisphere
- **Fire-prone regions** — pulsing colored dots on known wildfire hotspots (California, Amazon, Siberia, SE Australia, Mediterranean, Algeria, British Columbia, Indonesia, Portugal, Cerrado, Chernobyl zone). Color indicates threat level: red = critical, orange = high, yellow = elevated, green = low
- **Fire zone polygons** — shaded regions over broad fire-risk belts (US West, Amazon Arc, Mediterranean Belt, SE Australia, Siberian Taiga, SE Asia)
- **Ocean labels** and graticule grid
- **Hover tooltips** — hover any dot to see region description, local time, and live weather (temperature, wind, condition fetched from Open-Meteo)
- **Zoom controls** (+, -, reset) in bottom-right; click-drag to pan
- **Threat level legend** in top-right

Above the map: **4 KPIs** — Active Hotspots, Critical Regions, Avg Global Risk, Monitors.

### Below the Map — Panel Grid

Responsive masonry layout (1 column on mobile, up to 5 on wide screens):

#### Risk Analysis

The main control panel:

1. **Load data** — click the file input to upload a CSV, or click **Sample** to load the built-in Algerian forest fires dataset
2. **Set coordinates** — Latitude, Longitude, Radius (km). Defaults to Algeria (36.75, 3.06, 30km)
3. **Pick a horizon** — "24h + 72h + 7d" runs all three, or pick a single one
4. **Click "Run Analysis"** — sends data to the backend which:
   - Cleans and normalizes the CSV
   - Builds the 5 CT-RD risk components
   - Fetches live weather (Open-Meteo), active fire hotspots (NASA FIRMS), and geospatial features (vegetation dryness, thermal anomaly, burn severity)
   - Computes dynamic weights and aggregates a composite risk score
   - Runs multi-horizon forecasting with confidence intervals
   - Derives explainability insights
   - Classifies an alert level (GREEN / YELLOW / ORANGE / RED / CRITICAL)
   - Optionally sends email/Telegram notifications

Results show: Risk Score, Alert Level (color-coded), Dominant Driver, Recommended Action.

#### Active Fires

Lists fire hotspots detected by NASA FIRMS within the specified region. Each row shows coordinates and FRP (Fire Radiative Power — higher = more intense). These also appear on the map as orange dots.

#### Live Feed

Chronological event log. Every analysis run or hotspot detection creates events here. Click a region ID to focus coordinates on that location.

#### Forecasts

After analysis, shows predictions for each horizon (24h, 72h, 7d):

- Predicted risk score (color-coded: red > 0.6, yellow > 0.4, green otherwise)
- Confidence interval [low, high]
- Component forecasts (ignition, spread, fuel, containment, impact)

#### Explainability

Shows **why** the risk score is what it is:

- **Dominant Driver** — which component contributes most
- **Top Factors** — all components ranked by contribution percentage
- **Changes since previous** — how each component shifted vs. prior timestep (red = increased risk, green = decreased)

#### Alerts

Triggered alerts with severity level. Click **ACK** to acknowledge/dismiss.

#### Watchlists

Save regions for repeated monitoring. Click **"+ Add current region"** to save current lat/lon/radius. Toggle ON/OFF per entry.

#### Notifications

Enter an email (requires SMTP in `.env`) or Telegram Chat ID to receive alerts on high-risk detections.

#### Model Evaluation

Click **"Run Evaluation"** to execute:

- **Backtest** — tests model on historical data, reports MAE, RMSE, precision, recall, F1
- **Ablation study** — compares performance with base features vs. +live APIs vs. +geospatial features

A dedicated evaluation page is also available at `/evaluation`.

---

## How to Use (Step by Step)

1. Open `http://localhost:3000` in your browser
2. Explore the map — hover colored dots to see region descriptions and live weather
3. In **Risk Analysis**, click **Sample** to load the built-in dataset
4. Leave coordinates at Algeria defaults or change them to any region
5. Click **Run Analysis**
6. Once complete, all panels populate: risk score, forecasts, explainability, active fires, alerts
7. The map updates with detected hotspots as orange dots
8. Click **"+ Add current region"** in Watchlists to save it
9. Click **Run Evaluation** to see model backtest and ablation metrics
10. Visit `/evaluation` for a dedicated evaluation dashboard

---

## The ML Pipeline

The core algorithm is **Causal-Temporal Risk Decomposition (CT-RD)**, implemented in TypeScript in `web/src/lib/ctrd.ts`:

1. **Cleans** raw CSV data (handles missing values, normalizes columns to 0-1)
2. **Builds 5 risk components** from raw FWI features: Ignition (temperature + drought), Spread (wind + humidity), Fuel (vegetation + buildup), Containment (rain + accessibility), Impact (fire weather index + severity)
3. **Enriches** with live data: weather forecasts (Open-Meteo), active fire detections (NASA FIRMS), geospatial features (vegetation dryness, thermal anomaly, burn severity via GEE proxy)
4. **Dynamically weights** components based on current conditions (e.g., high wind increases spread weight)
5. **Forecasts** risk at multiple horizons using averaging + trend extrapolation
6. **Estimates uncertainty** via prediction intervals based on historical variance
7. **Classifies** alert levels using calibrated thresholds from historical risk distribution
8. **Explains** results by ranking component contributions and tracking changes over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Map | D3.js + TopoJSON (equirectangular projection) |
| UI | Custom dark panel system (monospace, CSS masonry grid) |
| ML Pipeline | TypeScript (CT-RD in `web/src/lib/ctrd.ts`) |
| Weather API | Open-Meteo (free, no key needed) |
| Fire Data | NASA FIRMS API |
| Geospatial | Google Earth Engine proxy (with heuristic fallback) |
| Persistence | File-backed JSON store (`web/.data/store.json`) |
| Notifications | Nodemailer (email), Telegram Bot API |
| Original Pipeline | Python (ingestion, feature engineering, causal analysis, forecasting) |

---

## Project Structure

```
wildfire-ctrd/
├── web/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main dashboard (map + panels)
│   │   │   ├── layout.tsx        # Root layout (dark theme)
│   │   │   ├── globals.css       # Dark terminal CSS variables
│   │   │   ├── evaluation/       # Dedicated evaluation page
│   │   │   └── api/
│   │   │       ├── analyze/      # POST — run CT-RD pipeline
│   │   │       ├── global-snapshot/ # GET — KPIs + top regions
│   │   │       ├── alerts/       # GET/PATCH — alert management
│   │   │       ├── watchlists/   # GET/POST/PATCH — watchlists
│   │   │       ├── timeline/     # GET — historical risk runs
│   │   │       ├── evaluation/   # GET — backtest + ablation
│   │   │       ├── sample-csv/   # GET — built-in dataset
│   │   │       └── stream/       # GET — SSE heartbeat
│   │   ├── components/
│   │   │   ├── map/d3-map.tsx    # D3.js 2D world map
│   │   │   ├── ui/panel.tsx      # Reusable dark panel component
│   │   │   └── evaluation/       # Evaluation sub-components
│   │   └── lib/
│   │       ├── ctrd.ts           # CT-RD ML pipeline (TypeScript)
│   │       ├── config/map.ts     # Fire regions, zones, threat colors
│   │       ├── types.ts          # Shared TypeScript types
│   │       ├── ml/               # Forecast, uncertainty, explainability, calibration
│   │       ├── ingestion/        # Weather, FIRMS, GEE adapters
│   │       ├── store/            # File-backed persistence (runs, alerts, watchlists)
│   │       ├── alerts/           # Alert engine + notifiers
│   │       ├── evaluation/       # Backtest + ablation logic
│   │       └── cache/            # In-memory TTL cache
│   └── package.json
├── main.py                       # Original Python pipeline
├── ingestion.py                  # Python data loading
├── feature_engineering.py        # Python risk component creation
├── causal_analysis.py            # Python Granger causality
├── forecasting.py                # Python time series models
├── dynamic_weights.py            # Python adaptive weighting
├── alerting.py                   # Python alert mapping
├── visualization.py              # Python plots
├── utils.py                      # Python helpers
├── Algerian_forest_fires_dataset.csv  # Sample dataset
├── requirements.txt              # Python dependencies
└── docs/                         # Architecture + model card docs
```

---

## Running the Project

### 1. Clone

```bash
git clone https://github.com/anushkab16/wildfire-ctrd.git
cd wildfire-ctrd
```

### 2. Install dependencies

```bash
cd web
npm install
```

### 3. (Optional) Configure live integrations

```bash
cp .env.example .env.local
# Edit .env.local with your FIRMS_MAP_KEY, SMTP credentials, Telegram bot token
```

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

### 5. Run the original Python pipeline (optional)

```bash
cd ..
pip install -r requirements.txt
python main.py
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze` | Run CT-RD analysis on uploaded CSV with live enrichment |
| GET | `/api/global-snapshot` | Aggregated KPIs, top regions, recent events |
| GET | `/api/sample-csv` | Returns built-in Algerian dataset as CSV text |
| GET/POST/PATCH | `/api/watchlists` | CRUD for monitored regions |
| GET/PATCH | `/api/alerts` | List alerts / acknowledge an alert |
| GET | `/api/timeline` | Historical risk runs for a region |
| GET | `/api/evaluation` | Run backtest + ablation study |
| GET | `/api/stream` | Server-Sent Events heartbeat for live updates |

---

## Dataset

**Algerian Forest Fires Dataset** (from UCI/Kaggle)

Contains Fire Weather Index (FWI) system components: FFMC, DMC, DC, ISI, BUI, FWI, plus temperature, relative humidity, wind speed, and rain — recorded for two regions (Bejaia and Sidi Bel-abbes) in Algeria.

---

## Limitations

- External APIs (FIRMS, Open-Meteo) may be unavailable or rate-limited
- Geospatial adapter requires a configured GEE proxy for full live mode (falls back to heuristics)
- Forecasting model is lightweight and intended for academic validation, not production deployment
- File-backed store is suitable for development; production would need a database

---

## Authors

**Anushka Batte**
BTech Computer Engineering
Interested in AI, ML, Healthcare & Real-World Impact Systems

**Sparsh Shah**
BTech Computer Engineering
