# Reproducibility Guide

## Prerequisites
- Node.js 20+
- npm

## Setup
```bash
cd web
npm install
cp .env.example .env.local
```

## Run
```bash
npm run dev
```
Open `http://localhost:3000`.

## Build Verification
```bash
npm run lint
npm run build
```

## API Checks
- `POST /api/analyze` for full pipeline inference
- `GET /api/evaluation` for backtest and ablation summary
- `GET /api/sample-csv` for local dataset loading

## Optional Credentials
- `FIRMS_MAP_KEY` for live hotspot ingestion
- `GEE_PROXY_URL` for live geospatial feature extraction
- SMTP and Telegram env vars for alert dispatch
# Reproducibility Guide

## Prerequisites

- Python 3.10+
- Node.js 20+
- npm

## 1) Start Python Analytics API

```bash
cd services/python-api
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## 2) Start Next.js Dashboard

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` and navigate to the risk dashboard.

## 3) Optional External Credentials

- Set `FIRMS_MAP_KEY` for live hotspot pulls.
- Set `GEE_PROJECT_ID` (and authenticate Earth Engine in environment) for live geospatial features.

## 4) Verification Commands

```bash
# frontend
cd web && npm run lint && npm run build

# backend syntax
cd .. && python3 -m py_compile pipeline.py feature_engineering.py services/python-api/src/main.py
```
