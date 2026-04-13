import argparse
import os

from ingestion import load_data
from feature_engineering import create_components, add_lag_features, convert_to_weekly
from causal_analysis import granger_matrix, plot_heatmap
from forecasting import forecast_all
from dynamic_weights import compute_weights
from alerting import get_alert_level, get_action
from visualization import plot_components
from utils import compute_composite, dominant_driver

DEFAULT_FILE_PATH = "Algerian_forest_fires_dataset.csv"


def run_pipeline(file_path):
    df = load_data(file_path)

    df = create_components(df)

    components = ['ignition','spread','fuel','containment','impact']
    df = add_lag_features(df, components)

    df = convert_to_weekly(df)

    # Causal analysis
    matrix = granger_matrix(df, components)
    plot_heatmap(matrix)

    # Forecast
    preds = forecast_all(df)

    # Dynamic weights
    weights = compute_weights(df)

    # Composite risk
    score = compute_composite(preds, weights)

    # Alert
    level = get_alert_level(score)
    action = get_action(level)
    driver = dominant_driver(preds, weights)

    return {
        "df": df,
        "components": components,
        "causal_matrix": matrix,
        "predictions": preds,
        "weights": weights,
        "score": score,
        "level": level,
        "action": action,
        "driver": driver,
    }


def main():
    parser = argparse.ArgumentParser(description="Run wildfire CT-RD pipeline.")
    parser.add_argument(
        "--data",
        default=os.getenv("WILDFIRE_DATA_PATH", DEFAULT_FILE_PATH),
        help="Path to dataset CSV file.",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="Disable matplotlib visual output.",
    )
    args = parser.parse_args()

    result = run_pipeline(args.data)

    print("\n===== FINAL OUTPUT =====")
    print(f"Risk Score: {result['score']:.3f}")
    print(f"Alert Level: {result['level']}")
    print(f"Dominant Driver: {result['driver']}")
    print(f"Suggested Action: {result['action']}")
    print(
        "Explanation: Risk is mainly driven by "
        f"{result['driver']} under current conditions."
    )

    if not args.no_plots:
        plot_heatmap(result["causal_matrix"])
        plot_components(result["df"])

if __name__ == "__main__":
    main()