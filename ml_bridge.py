"""
Bridge script that runs the full Python ML pipeline and outputs JSON to stdout.
Called by the Next.js web app via child_process.

Usage: python3 ml_bridge.py <path_to_csv>
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
        importances = {f"feature_{i}": float(v) for i, v in enumerate(model.feature_importances_)}
        return pred, importances
    except Exception:
        return None, {}


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


def run_pipeline(csv_path):
    df = load_data(csv_path)
    components = ["ignition", "spread", "fuel", "containment", "impact"]

    df = create_components(df)
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
        gb_result = safe_forecast_gb(series)
        gb_pred = gb_result[0] if gb_result else None

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
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No CSV path provided"}))
        sys.exit(1)

    csv_path = sys.argv[1]
    try:
        sys.stdout = io.StringIO()
        result = run_pipeline(csv_path)
        sys.stdout = _real_stdout
        print(json.dumps(result))
    except Exception as e:
        sys.stdout = _real_stdout
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
