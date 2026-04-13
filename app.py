import os
import tempfile

import pandas as pd
import streamlit as st

from main import run_pipeline


st.set_page_config(page_title="Wildfire CT-RD", page_icon="🔥", layout="wide")
st.title("🔥 Wildfire Risk Prediction")
st.caption("Simple UI for the April-10 CT-RD model version")

default_path = "Algerian_forest_fires_dataset.csv"
use_local_file = st.checkbox("Use local dataset in project root", value=os.path.exists(default_path))
uploaded_file = st.file_uploader("Or upload dataset CSV", type=["csv"])

dataset_path = None
if use_local_file and os.path.exists(default_path):
    dataset_path = default_path
elif uploaded_file is not None:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
        temp_file.write(uploaded_file.getvalue())
        dataset_path = temp_file.name

if not dataset_path:
    st.info("Select local dataset or upload a CSV to continue.")
    st.stop()

if st.button("Run Analysis", type="primary"):
    try:
        with st.spinner("Running model pipeline..."):
            result = run_pipeline(dataset_path)

        col1, col2, col3 = st.columns(3)
        col1.metric("Risk Score", f"{result['score']:.3f}")
        col2.metric("Alert Level", result["level"])
        col3.metric("Dominant Driver", result["driver"].capitalize())

        st.success(result["action"])
        st.write(
            f"Risk is mainly driven by **{result['driver']}** under current conditions."
        )

        st.subheader("Forecasted Components")
        pred_df = pd.DataFrame(
            {"component": list(result["predictions"].keys()), "forecast": list(result["predictions"].values())}
        )
        st.dataframe(pred_df, use_container_width=True, hide_index=True)

        st.subheader("Dynamic Weights")
        weight_df = pd.DataFrame(
            {"component": list(result["weights"].keys()), "weight": list(result["weights"].values())}
        )
        st.dataframe(weight_df, use_container_width=True, hide_index=True)

        st.subheader("Causal Matrix")
        st.dataframe(result["causal_matrix"], use_container_width=True)

        st.subheader("Component Trends (Weekly)")
        st.line_chart(result["df"][result["components"]])
    except Exception as exc:
        st.error(f"Failed to run pipeline: {exc}")
import tempfile

import pandas as pd
import streamlit as st

from pipeline import run_pipeline


st.set_page_config(page_title="Wildfire CT-RD", page_icon="🔥", layout="wide")
st.title("🔥 Wildfire Risk Prediction (CT-RD)")
st.caption("Upload dataset CSV, run the integrated pipeline, and inspect risk outputs.")

uploaded_file = st.file_uploader(
    "Upload Algerian forest fires dataset (.csv)",
    type=["csv"],
)

if uploaded_file is None:
    st.info("Upload a CSV file to begin.")
    st.stop()

run_button = st.button("Run Pipeline", type="primary")

if run_button:
    with st.spinner("Running pipeline..."):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(uploaded_file.getvalue())
            temp_path = temp_file.name

        result = run_pipeline(temp_path, show_plots=False)

    score = result["risk_score"]
    alert_level = result["alert_level"]
    dominant_driver = result["dominant_driver"]
    action = result["action"]

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Risk Score", f"{score:.3f}")
    col2.metric("Alert Level", alert_level)
    col3.metric("Dominant Driver", dominant_driver.capitalize())
    col4.metric("Action", action)

    st.subheader("Forecasted Component Values")
    pred_df = pd.DataFrame(
        [
            {"component": k, "forecast": v}
            for k, v in result["predictions"].items()
        ]
    )
    st.dataframe(pred_df, use_container_width=True, hide_index=True)

    st.subheader("Dynamic Weights")
    weight_df = pd.DataFrame(
        [{"component": k, "weight": v} for k, v in result["weights"].items()]
    )
    st.dataframe(weight_df, use_container_width=True, hide_index=True)

    st.subheader("Component Trends (Weekly)")
    trend_cols = ["ignition", "spread", "fuel", "containment", "impact"]
    st.line_chart(result["df"][trend_cols])

    st.subheader("Granger Causality Matrix")
    st.dataframe(result["granger_matrix"], use_container_width=True)
