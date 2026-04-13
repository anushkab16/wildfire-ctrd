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

* Real-world dataset preprocessing (handles noisy/messy data)
* Feature engineering based on wildfire science (FWI system)
* Granger causality analysis (understanding relationships between components)
* Time series forecasting using:

  * ARIMA
  * Exponential Smoothing
  * Gradient Boosting
* Dynamic weighting based on environmental conditions
* Composite wildfire risk score
* Alert system (GREEN → CRITICAL)
* Visualizations for interpretability

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

* Python
* Pandas, NumPy
* Scikit-learn
* Statsmodels
* Matplotlib, Seaborn

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

### 2. Create virtual environment (recommended)

```
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```
pip install -r requirements.txt
```

### 4. Add dataset

Place the dataset file in the project folder:

```
Algerian_forest_fires_dataset.csv
```

### 5. Run the project

```
python main.py --data Algerian_forest_fires_dataset.csv
```

### 6. Run web app (Next.js + shadcn)

```
cd web
npm install
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

* Granger causality assumes linear relationships
* Time series models may be sensitive to data size and quality
* Does not include real-time satellite or spatial data

---

## 🚀 Future Improvements

* Add SHAP/feature importance for deeper explainability
* Integrate satellite or geospatial wildfire data
* Deploy as a Streamlit web app
* Use deep learning models (LSTM, Transformers)

---

## 👩‍💻 Author

**Anushka Batte**

BTech Computer Engineering

Interested in AI, ML, Healthcare & Real-World Impact Systems

