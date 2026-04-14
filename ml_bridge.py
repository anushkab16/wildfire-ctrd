"""
Bridge script that runs the full Python ML pipeline and outputs JSON to stdout.
Called by the Next.js web app via child_process.

Usage: python3 ml_bridge.py <csv_path> [context_json_path]
"""

import io
import json
import sys
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

_real_stdout = sys.stdout
sys.stdout = io.StringIO()

from ingestion import load_data
from feature_engineering import create_components, add_lag_features
from dynamic_weights import compute_weights
from alerting import get_alert_level, get_action
from utils import compute_composite, dominant_driver

sys.stdout = _real_stdout


def safe_forecast_arima(series):
    try:
        from statsmodels.tsa.arima.model import ARIMA
        model = ARIMA(series.values, order=(1, 1, 1)).fit()
        return float(model.forecast(1)[0])
    except Exception:
        return None


def safe_forecast_exp(series):
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        model = ExponentialSmoothing(series.values, seasonal=None).fit()
        return float(model.forecast(1)[0])
    except Exception:
        return None


def safe_forecast_gb(series):
    try:
        from sklearn.ensemble import GradientBoostingRegressor
        X = np.arange(len(series)).reshape(-1, 1)
        y = series.values.astype(float)
        model = GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
        model.fit(X, y)
        pred = float(model.predict([[len(series)]])[0])
        return pred
    except Exception:
        return None


def run_granger(df, variables, maxlag=4):
    from statsmodels.tsa.stattools import grangercausalitytests

    matrix = {}
    for c1 in variables:
        matrix[c1] = {}
        for c2 in variables:
            if c1 == c2:
                matrix[c1][c2] = 1.0
                continue
            try:
                test_data = df[[c1, c2]].dropna()
                if len(test_data) < maxlag + 2:
                    matrix[c1][c2] = None
                    continue
                test = grangercausalitytests(test_data, maxlag=maxlag, verbose=False)
                p_values = [test[i + 1][0]["ssr_ftest"][1] for i in range(maxlag)]
                matrix[c1][c2] = float(min(p_values))
            except Exception:
                matrix[c1][c2] = None
    return matrix


def inject_live_row(df, ctx):
    """Append a synthetic row that blends the last historical row with live conditions."""
    last = df.iloc[-1].copy()

    live_temp = ctx.get("temperature", None)
    live_hum = ctx.get("humidity", None)
    live_wind = ctx.get("wind", None)

    if live_temp is not None:
        temp_min, temp_max = 22, 42
        norm_temp = np.clip((live_temp - temp_min) / (temp_max - temp_min), 0, 1)
        last["temperature"] = 0.5 * float(last["temperature"]) + 0.5 * norm_temp

    if live_hum is not None:
        hum_min, hum_max = 21, 90
        norm_hum = np.clip((live_hum - hum_min) / (hum_max - hum_min), 0, 1)
        last["humidity"] = 0.5 * float(last["humidity"]) + 0.5 * norm_hum

    if live_wind is not None:
        wind_min, wind_max = 6, 29
        norm_wind = np.clip((live_wind - wind_min) / (wind_max - wind_min), 0, 1)
        last["wind"] = 0.5 * float(last["wind"]) + 0.5 * norm_wind

    hotspot_count = ctx.get("hotspotCount", 0)
    veg_dry = ctx.get("vegetationDryness", 0)
    thermal = ctx.get("thermalAnomaly", 0)
    burn_sev = ctx.get("burnSeverityIndex", 0)

    if hotspot_count > 0:
        fire_boost = np.clip(hotspot_count / 50, 0, 0.3)
        last["fwi"] = np.clip(float(last["fwi"]) + fire_boost, 0, 1)
        last["isi"] = np.clip(float(last["isi"]) + fire_boost * 0.5, 0, 1)

    if veg_dry > 0.4:
        dry_boost = (veg_dry - 0.4) * 0.3
        last["dmc"] = np.clip(float(last["dmc"]) + dry_boost, 0, 1)
        last["dc"] = np.clip(float(last["dc"]) + dry_boost * 0.8, 0, 1)

    if thermal > 0.5:
        last["temperature"] = np.clip(float(last["temperature"]) + (thermal - 0.5) * 0.3, 0, 1)

    if burn_sev > 0.4:
        last["fwi"] = np.clip(float(last["fwi"]) + (burn_sev - 0.4) * 0.2, 0, 1)

    last["ignition"] = (
        0.4 * float(last["ffmc"])
        + 0.35 * float(last["temperature"])
        + 0.25 * (1 - float(last["humidity"]))
    )
    last["spread"] = 0.6 * float(last["isi"]) + 0.4 * float(last["wind"])
    last["fuel"] = (float(last["dmc"]) + float(last["dc"]) + float(last["bui"])) / 3
    last["containment"] = float(last["dc"])
    last["impact"] = float(last["fwi"])

    new_row = pd.DataFrame([last])
    return pd.concat([df, new_row], ignore_index=True)


def run_pipeline(csv_path, ctx=None):
    df = load_data(csv_path)
    components = ["ignition", "spread", "fuel", "containment", "impact"]

    df = create_components(df)

    if ctx:
        df = inject_live_row(df, ctx)

    df = add_lag_features(df, components)

    granger_matrix = run_granger(df, components)

    model_predictions = {}
    for comp in components:
        series = df[comp].dropna()
        if len(series) < 5:
            model_predictions[comp] = {
                "arima": None,
                "exponential_smoothing": None,
                "gradient_boosting": None,
            }
            continue

        arima_pred = safe_forecast_arima(series)
        exp_pred = safe_forecast_exp(series)
        gb_pred = safe_forecast_gb(series)

        model_predictions[comp] = {
            "arima": arima_pred,
            "exponential_smoothing": exp_pred,
            "gradient_boosting": gb_pred,
        }

    ensemble_preds = {}
    for comp in components:
        vals = [
            v
            for v in [
                model_predictions[comp]["arima"],
                model_predictions[comp]["exponential_smoothing"],
                model_predictions[comp]["gradient_boosting"],
            ]
            if v is not None
        ]
        ensemble_preds[comp] = float(np.mean(vals)) if vals else 0.0

    weights = compute_weights(df)
    composite_score = compute_composite(ensemble_preds, weights)
    alert_level = get_alert_level(composite_score)
    action = get_action(alert_level)
    driver = dominant_driver(ensemble_preds, weights)

    component_series = {}
    for comp in components:
        series = df[comp].dropna().tolist()
        component_series[comp] = [float(v) for v in series[-30:]]

    location_str = ""
    if ctx:
        location_str = f"{ctx.get('latitude', '?')}, {ctx.get('longitude', '?')}"

    return {
        "success": True,
        "model_predictions": model_predictions,
        "ensemble_predictions": ensemble_preds,
        "granger_causality": granger_matrix,
        "dynamic_weights": {k: float(v) for k, v in weights.items()},
        "composite_score": float(composite_score),
        "alert_level": alert_level,
        "action": action,
        "dominant_driver": driver,
        "component_series": component_series,
        "models_used": [
            "ARIMA(1,1,1) - statsmodels",
            "Exponential Smoothing (Holt-Winters) - statsmodels",
            "Gradient Boosting Regressor - scikit-learn",
            "Granger Causality Test - statsmodels",
        ],
        "num_rows": len(df),
        "location": location_str,
        "live_context_applied": ctx is not None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No CSV path provided"}))
        sys.exit(1)

    csv_path = sys.argv[1]
    ctx = None
    if len(sys.argv) >= 3:
        try:
            with open(sys.argv[2], "r") as f:
                ctx = json.load(f)
        except Exception:
            ctx = None

    try:
        sys.stdout = io.StringIO()
        result = run_pipeline(csv_path, ctx)
        sys.stdout = _real_stdout
        print(json.dumps(result))
    except Exception as e:
        sys.stdout = _real_stdout
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
