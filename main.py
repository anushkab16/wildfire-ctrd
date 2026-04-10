from ingestion import load_data
from feature_engineering import create_components, add_lag_features, convert_to_weekly
from causal_analysis import granger_matrix, plot_heatmap
from forecasting import forecast_all
from dynamic_weights import compute_weights
from alerting import get_alert_level, get_action
from visualization import plot_components
from utils import compute_composite, dominant_driver

FILE_PATH = "/Users/anushkabatte/.cache/kagglehub/datasets/nitinchoudhary012/algerian-forest-fires-dataset/versions/2/Algerian_forest_fires_dataset.csv"

def main():
    df = load_data(FILE_PATH)

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

    print("\n===== FINAL OUTPUT =====")
    print(f"Risk Score: {score:.3f}")
    print(f"Alert Level: {level}")
    print(f"Dominant Driver: {driver}")
    print(f"Suggested Action: {action}")
    print(f"Explanation: Risk is mainly driven by {driver} under current conditions.")

    plot_components(df)

if __name__ == "__main__":
    main()