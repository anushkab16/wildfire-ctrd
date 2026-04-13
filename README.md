# 🔥 Wildfire Risk Prediction using CT-RD Framework

## 📌 Overview

This project implements a **Causal-Temporal Risk Decomposition (CT-RD)** framework to predict wildfire risk in an **interpretable and explainable way**.

Traditional wildfire systems produce a single black-box score.
This system improves upon that by decomposing wildfire risk into **five meaningful components**:

* 🔥 Ignition Potential
* 🌬️ Spread Capacity
* 🌿 Fuel Availability
* 🚒 Containment Difficulty
* 🌍 Impact Potential

Each component is analyzed, forecasted, and dynamically combined to generate a **transparent and actionable risk score**.

---

## 🚀 Key Features

* ML-first CT-RD wildfire risk decomposition with 5 interpretable components
* Multi-horizon forecasting (24h / 72h / 7d) with uncertainty intervals
* Live ingestion support for NASA FIRMS and Open-Meteo
* Geospatial feature adapter (GEE proxy with heuristic fallback)
* Explainability panel (dominant driver, top contributors, change deltas)
* Alert trigger pipeline with optional email and Telegram notifications
* Backtesting + ablation evaluation endpoint for model validation

---

## 📊 Example Output

```
===== FINAL OUTPUT =====
Risk Score: 0.162
Alert Level: GREEN
Dominant Driver: ignition
Suggested Action: No action needed
Explanation: Risk is mainly driven by ignition under current conditions.
```

---

## 📈 Visualizations

The system generates:

* 📊 Component trends over time
* 🔗 Granger causality heatmap
* 📉 Composite risk trends

These help in understanding **why** a certain risk level is predicted.

---

## 🛠️ Tech Stack

* Next.js + TypeScript
* shadcn/ui + Tailwind
* Node route handlers for ingestion + ML inference
* Leaflet map rendering for hotspot overlays

---

## 📁 Project Structure

```
wildfire_ctrd/
│
├── main.py                  # Main pipeline execution
├── ingestion.py             # Data loading & cleaning
├── feature_engineering.py   # Risk component creation
├── causal_analysis.py       # Granger causality
├── forecasting.py           # Time series models
├── dynamic_weights.py       # Adaptive weighting
├── alerting.py              # Risk level mapping
├── visualization.py         # Plots & graphs
├── utils.py                 # Helper functions
├── requirements.txt
└── README.md
```

---

## ▶️ How to Run

### 1. Clone the repository

```
git clone https://github.com/YOUR_USERNAME/wildfire-ctrd.git
cd wildfire-ctrd
```

### 2. Install web app dependencies

```bash
cd web
npm install
```

### 3. Add dataset

Place the dataset file in the project folder:

```
Algerian_forest_fires_dataset.csv
```

### 4. Configure optional live integrations

```bash
cp .env.example .env.local
```

### 5. Run web app

```bash
npm run dev
```

Then open `http://localhost:3000`.

---

## 📌 Dataset

* Algerian Forest Fires Dataset (Kaggle)

This dataset includes Fire Weather Index (FWI) components such as:

* FFMC, DMC, DC, ISI, BUI, FWI
* Temperature, humidity, wind

---

## 🧠 Key Insight

This project demonstrates that:

> Wildfire risk can be better understood by decomposing it into interpretable components rather than relying on a single opaque prediction.

By combining **causal analysis + forecasting + dynamic weighting**, the system provides both **accuracy and explainability**.

---

## ⚠️ Limitations

* External APIs may be unavailable or rate-limited
* Geospatial adapter requires a configured GEE proxy for full live mode
* Forecasting model is lightweight and intended for academic validation

---

## 🚀 Future Improvements

* Add district-level resource allocation optimization
* Add persistent run history and watchlist monitoring
* Introduce advanced models (LSTM/Transformers) for comparative benchmarking
* Add PDF export and reporting automation

---

## 👩‍💻 Author

**Anushka Batte**

BTech Computer Engineering

Interested in AI, ML, Healthcare & Real-World Impact Systems

