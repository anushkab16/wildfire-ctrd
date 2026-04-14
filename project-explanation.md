# Wildfire Monitor: Complete Project Explanation

A detailed, beginner-friendly walkthrough of every piece of this project, what it does, why it exists, and how it all fits together.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [The Problem We Are Solving](#2-the-problem-we-are-solving)
3. [The Dataset](#3-the-dataset)
4. [The Canadian Fire Weather Index (FWI) System](#4-the-canadian-fire-weather-index-fwi-system)
5. [The CT-RD Framework (Our Machine Learning Core)](#5-the-ct-rd-framework-our-machine-learning-core)
   - 5.1 [Step 1: Data Cleaning](#51-step-1-data-cleaning)
   - 5.2 [Step 2: Normalization](#52-step-2-normalization)
   - 5.3 [Step 3: Building the Five Risk Components](#53-step-3-building-the-five-risk-components)
   - 5.4 [Step 4: Live Data Enrichment](#54-step-4-live-data-enrichment)
   - 5.5 [Step 5: Dynamic Weighting](#55-step-5-dynamic-weighting)
   - 5.6 [Step 6: Computing the Composite Risk Score](#56-step-6-computing-the-composite-risk-score)
   - 5.7 [Step 7: Multi-Horizon Forecasting (Simple Trend)](#57-step-7-multi-horizon-forecasting-simple-trend)
   - 5.8 [Step 8: Uncertainty Estimation](#58-step-8-uncertainty-estimation)
   - 5.9 [Step 9: Alert Classification (Calibrated Thresholds)](#59-step-9-alert-classification-calibrated-thresholds)
   - 5.10 [Step 10: Explainability](#510-step-10-explainability)
6. [The Python ML Models (ARIMA, Gradient Boosting, Exponential Smoothing, Granger Causality)](#6-the-python-ml-models)
   - 6.1 [How the Python Bridge Works](#61-how-the-python-bridge-works)
   - 6.2 [Live Context Injection](#62-live-context-injection)
   - 6.3 [ARIMA](#63-arima)
   - 6.4 [Exponential Smoothing (Holt-Winters)](#64-exponential-smoothing-holt-winters)
   - 6.5 [Gradient Boosting Regressor](#65-gradient-boosting-regressor)
   - 6.6 [Ensemble Averaging](#66-ensemble-averaging)
   - 6.7 [Granger Causality](#67-granger-causality)
7. [Live Data Sources (The Three APIs)](#7-live-data-sources-the-three-apis)
   - 7.1 [Open-Meteo (Weather)](#71-open-meteo-weather)
   - 7.2 [NASA FIRMS (Satellite Fire Detection)](#72-nasa-firms-satellite-fire-detection)
   - 7.3 [Google Earth Engine (Vegetation and Land)](#73-google-earth-engine-vegetation-and-land)
8. [Caching](#8-caching)
9. [The Notification System](#9-the-notification-system)
10. [Model Evaluation](#10-model-evaluation)
    - 10.1 [Backtesting](#101-backtesting)
    - 10.2 [Ablation Study](#102-ablation-study)
11. [System Architecture](#11-system-architecture)
    - 11.1 [The Two Pipelines and How They Connect](#111-the-two-pipelines-and-how-they-connect)
    - 11.2 [API Routes](#112-api-routes)
    - 11.3 [File-Backed Persistence](#113-file-backed-persistence)
    - 11.4 [Server-Sent Events (SSE)](#114-server-sent-events-sse)
12. [The Dashboard (Frontend)](#12-the-dashboard-frontend)
    - 12.1 [The D3.js World Map](#121-the-d3js-world-map)
    - 12.2 [The Panel System](#122-the-panel-system)
    - 12.3 [Masonry Grid Layout](#123-masonry-grid-layout)
    - 12.4 [Dark/Light Theme Toggle](#124-darklight-theme-toggle)
    - 12.5 [Settings and Preset Profiles](#125-settings-and-preset-profiles)
    - 12.6 [All Dashboard Panels Explained](#126-all-dashboard-panels-explained)
13. [Technology Stack Glossary](#13-technology-stack-glossary)
14. [The Development Journey (What Went Wrong and What We Learned)](#14-the-development-journey-what-went-wrong-and-what-we-learned)
15. [How to Run the Project](#15-how-to-run-the-project)

---

## 1. What Is This Project?

Wildfire Monitor is a **real-time wildfire risk monitoring and early warning system**. Think of it as a weather forecast app, but instead of telling you "it will rain tomorrow," it tells you "the wildfire risk at this location is HIGH because the vegetation is dry and the wind is strong, and here is what you should do about it."

The key difference between this and other wildfire prediction tools is that ours does not just spit out a single number like "risk = 0.73." Instead, it breaks that number down into five meaningful pieces, so that a forest ranger or emergency coordinator can understand *why* the risk is high and *what specific action* to take.

The system has two ML pipelines that work together:
- A **TypeScript pipeline** that runs inside the web app and handles quick forecasting, live API enrichment, and the dashboard.
- A **Python pipeline** that runs the heavy ML models (ARIMA, Gradient Boosting, Exponential Smoothing, Granger Causality from scikit-learn and statsmodels) and is called by the web app via a bridge script.

**Analogy:** Imagine going to a doctor who says "you are 73% sick." That is not very helpful. You would want to know: "Your blood pressure is high, your cholesterol is normal, your vitamin D is low." That breakdown lets you take targeted action. Our system does the same thing, but for wildfire risk.

---

## 2. The Problem We Are Solving

Most existing wildfire prediction models work like a black box. You feed in weather data, and out comes a number. The problems with this approach:

- **No transparency:** A single number tells you nothing about what is driving the danger.
- **No actionability:** If you do not know whether the risk is from wind, drought, or dry vegetation, you cannot decide whether to deploy firebreaks, send aerial resources, or manage vegetation.
- **No future visibility:** Most models only tell you about right now, not about tomorrow or next week.
- **No connection to live conditions:** Many models rely purely on historical data and do not factor in what is actually happening on the ground right now (satellite fire detections, current weather, vegetation state).

Our project solves all four of these problems.

---

## 3. The Dataset

We use the **Algerian Forest Fires Dataset**, originally from the UCI Machine Learning Repository and also available on Kaggle.

**What is in it?**
- 244 rows of data (each row represents one day of observations).
- Collected from two regions in Algeria: Bejaia (northeast) and Sidi Bel-abbes (northwest).
- Recorded during June to September 2012 (the fire season).
- Each row contains weather measurements and fire danger indices for that day.

**The columns (features):**

| Feature | What It Measures | Range |
|---------|-----------------|-------|
| Temperature | Air temperature at noon (Celsius) | 22 to 42 |
| RH | Relative Humidity (percentage of moisture in the air) | 21% to 90% |
| Ws | Wind Speed (km/h) | 6 to 29 |
| Rain | Total daily rainfall (mm) | 0 to 16.8 |
| FFMC | Fine Fuel Moisture Code | 28.6 to 92.5 |
| DMC | Duff Moisture Code | 1.1 to 65.9 |
| DC | Drought Code | 7 to 220.4 |
| ISI | Initial Spread Index | 0 to 18.5 |
| BUI | Buildup Index | 1.1 to 68 |
| FWI | Fire Weather Index | 0 to 31.1 |
| Classes | Fire / Not Fire | Binary |

The first four (Temperature, RH, Ws, Rain) are basic weather readings that anyone can understand. The next six (FFMC through FWI) come from a specialized system called the Canadian Fire Weather Index, which we explain next.

---

## 4. The Canadian Fire Weather Index (FWI) System

The FWI system is the **international standard** for rating fire danger. It was developed in Canada and is used by fire agencies around the world. It takes the four basic weather readings (temperature, humidity, wind, rain) and computes six derived indices.

Think of it like this: the raw weather data is like the ingredients in a recipe, and the FWI indices are the dishes you cook from those ingredients. Each dish tells you something different about fire risk.

### The Six FWI Indices

**Moisture Codes (how dry things are):**

1. **FFMC (Fine Fuel Moisture Code):** Measures the moisture content of small, surface-level debris like dead leaves, twigs, and grass. These are the things that catch fire first.

   **Analogy:** Think of crumpled newspaper. When it is bone dry, a single spark ignites it. When it is wet, you cannot light it at all. FFMC tells you how "dry" that newspaper is. A high FFMC means the fine fuel on the forest floor is dry and ready to ignite.

2. **DMC (Duff Moisture Code):** Measures the moisture content of the "duff" layer. Duff is the partially decomposed organic material that sits just beneath the surface leaves but above the mineral soil. It is like a sponge of old, rotting leaves.

   **Analogy:** Imagine a thick carpet of composting leaves under a pile of dry leaves. When this middle layer dries out, fires can burn deeper into the ground and become much harder to extinguish. DMC tells you how dry that sponge layer is.

3. **DC (Drought Code):** Measures deep, long-term drought conditions. It reflects how dry the deep organic layers and compacted soil are. This takes weeks of dry weather to change.

   **Analogy:** If FFMC is about today's newspaper, and DMC is about last week's compost, DC is about the water table beneath your garden. It moves slowly. A high DC means the region has been dry for a very long time, and fires could burn deep underground.

**Behavior Indices (how a fire would act):**

4. **ISI (Initial Spread Index):** Predicts how fast a fire would spread based on wind speed and FFMC. High wind + dry surface fuel = fire spreads quickly.

   **Analogy:** Imagine blowing on a campfire. The harder you blow (wind speed) and the drier the kindling (FFMC), the faster the flames jump from one spot to the next. ISI captures exactly this.

5. **BUI (Buildup Index):** Combines DMC and DC to estimate the total amount of fuel available for burning. Not just the surface stuff, but the deeper layers too.

   **Analogy:** Think of it as the total "fuel tank" of the forest. A small campfire on wet ground burns out quickly (low BUI). A fire on deeply drought-stressed land has an enormous fuel reserve and will burn for days (high BUI).

6. **FWI (Fire Weather Index):** The grand summary. Combines ISI and BUI into one overall fire danger rating. It represents the intensity of a fire if one were to start under current conditions.

   **Analogy:** If ISI is "how fast the fire would spread" and BUI is "how much fuel it has to burn," then FWI is the overall "how bad would a fire be right now?" score.

---

## 5. The CT-RD Framework (Our Machine Learning Core)

CT-RD stands for **Causal-Temporal Risk Decomposition**. Let us unpack each word:

- **Causal:** We try to identify *what is causing* the risk, not just that risk exists.
- **Temporal:** We track how risk changes over *time* and forecast into the future.
- **Risk:** The thing we are measuring: how likely and how severe a wildfire would be.
- **Decomposition:** We break the risk down into smaller, understandable pieces.

**Analogy:** Imagine a school report card. Instead of just getting an overall grade (GPA), you get individual grades for Math, Science, English, History, and Physical Education. Each subject grade tells you something different, and the overall GPA is calculated from these individual grades. CT-RD does the same thing for wildfire risk: it gives you individual "grades" for five aspects of fire danger, and the overall risk score is computed from those five grades.

Here is how the pipeline works, step by step:

---

### 5.1 Step 1: Data Cleaning

Raw data from CSV files is messy. Column names might have extra spaces, some rows might have missing values, and the formatting can be inconsistent.

**What we do:**
- Strip whitespace from column names and convert everything to lowercase (e.g., " Temperature " becomes "temperature").
- Handle weird characters and naming inconsistencies (the dataset sometimes has columns like " RH" with a leading space, or "rain " with a trailing space).
- Remove any row where critical columns contain non-numeric or missing values.
- Filter out header-like rows that accidentally appear in the data (sometimes the CSV has a second header row in the middle).

**Analogy:** You receive a handwritten survey from 244 people. Before you can analyze it, you need to decipher messy handwriting, fix misspellings, and throw out forms where people left answers blank. That is data cleaning.

**Where in code:**
- Python: `load_data()` in `ingestion.py`
- TypeScript: `cleanRows()` in `web/src/lib/ctrd.ts`

---

### 5.2 Step 2: Normalization

Different features in our dataset have wildly different scales. Temperature ranges from 22 to 42 degrees. DC ranges from 7 to 220. If we tried to combine these directly, the DC values would dominate simply because their numbers are bigger, not because they are more important.

**What we do:** Min-Max Normalization. For each feature, we transform its values so that the smallest observed value becomes 0 and the largest becomes 1. Everything in between is proportionally scaled.

The Python version uses **scikit-learn's `MinMaxScaler`**, which is the standard ML library implementation of this operation. The TypeScript version implements the same formula manually.

**The formula:**
```
normalized_value = (value - minimum) / (maximum - minimum)
```

**Example:**
- Temperature: min = 22, max = 42. A reading of 32 becomes (32-22)/(42-22) = 10/20 = 0.50.
- DC: min = 7, max = 220. A reading of 113.5 becomes (113.5-7)/(220-7) = 106.5/213 = 0.50.

Now both are on the same 0-to-1 scale and can be fairly compared and combined.

**Analogy:** Imagine comparing a student's Math score (out of 100) with their PE score (out of 10). If the math score is 80 and the PE score is 8, you cannot just say "math is more important because 80 > 8." You need to convert both to percentages first: Math = 80%, PE = 80%. Now they are comparable. That is normalization.

**Where in code:**
- Python: `MinMaxScaler` in `feature_engineering.py`
- TypeScript: `normalizeColumns()` in `web/src/lib/ctrd.ts`

---

### 5.3 Step 3: Building the Five Risk Components

This is the heart of CT-RD. We take the normalized features and combine them into five risk components. Each component captures a different dimension of wildfire behavior.

#### Component 1: Ignition (How likely is a fire to start?)

**Formula:** `ignition = 0.4 * FFMC + 0.35 * temperature + 0.25 * (1 - humidity)`

**What it means:** Fires need a spark and dry conditions to ignite. Fine Fuel Moisture Code (FFMC) tells us if the surface material is dry enough to catch fire. High temperature accelerates ignition. Low humidity (we subtract humidity from 1 to flip it, so low humidity gives a high score) makes ignition easier.

**Analogy:** Trying to light a campfire. You need dry kindling (FFMC), a hot day helps (temperature), and humid air makes everything harder to light (humidity). This component estimates how easy it would be to start a fire.

#### Component 2: Spread (How fast would a fire move?)

**Formula:** `spread = 0.6 * ISI + 0.4 * wind_speed`

**What it means:** Once a fire starts, how quickly does it jump from tree to tree? The Initial Spread Index (ISI) already factors in wind and surface fuel dryness. We also directly include wind speed because it is the single most important factor in how fires travel across a landscape.

**Analogy:** Think about dropping a lit match in two scenarios. Scenario A: still, calm air. The flame barely moves. Scenario B: a strong breeze is blowing across a dry field. The fire races forward. Spread captures this difference.

#### Component 3: Fuel (How much material is available to burn?)

**Formula:** `fuel = (DMC + DC + BUI) / 3`

**What it means:** A fire cannot burn without something to burn. DMC measures the dryness of the mid-level organic layer. DC captures deep long-term drought. BUI estimates the total combustible material available. Together, they tell us: "Is there a lot of dry stuff waiting to be consumed by fire?"

**Analogy:** Imagine a bonfire. If you have one small log, it burns briefly. If you have a massive pile of dry wood, the fire will rage for hours. The fuel component estimates the size of that pile.

#### Component 4: Containment (How hard would it be to put out?)

**Formula:** `containment = DC`

**What it means:** This reflects how difficult it would be for firefighters (or rain) to suppress a fire once it starts. When deep drought conditions are severe (high DC), fires can burn underground in the root systems and organic layer, making them extremely difficult to extinguish even with heavy rain.

**Analogy:** Think about putting out a candle versus putting out a deep peat fire. You can blow out a candle easily. But a peat fire burns underground and can resurface days after you think it is out. The containment component tells you which scenario you are closer to.

#### Component 5: Impact (How severe would the damage be?)

**Formula:** `impact = FWI`

**What it means:** This is the overall fire intensity as measured by the Fire Weather Index. A high FWI means that if a fire starts, it will burn hot, move fast, and cause severe destruction. This combines all the other factors into a worst-case severity estimate.

**Analogy:** The difference between a controlled campfire and a raging inferno. Both are fires, but the impact is vastly different. This component captures the destructive potential.

**Where in code:**
- Python: `create_components()` in `feature_engineering.py`
- TypeScript: `buildComponents()` in `web/src/lib/ctrd.ts`

---

### 5.4 Step 4: Live Data Enrichment

The dataset gives us historical snapshots from 2012. But if you want to know the wildfire risk *right now* at a specific location, historical data alone is not enough. You need to know what the weather is like *today*, whether there are active fires *nearby*, and what the vegetation looks like *currently*.

This is where our three API integrations come in (detailed in Section 7). They overlay real-time information on top of the historical analysis.

**How it works in the TypeScript pipeline:** The live weather data (temperature, humidity, wind) is blended into the dynamic weight calculations so that the risk scores reflect current conditions at the selected coordinates.

**How it works in the Python pipeline:** The web app fetches live weather, satellite fire data, and vegetation data for the selected coordinates, then passes all of this to the Python script as a "live context" JSON file. The Python script creates a **synthetic row** that blends the last historical row from the CSV with the live conditions, and appends it to the dataset before running the ML models. This means the ARIMA, Gradient Boosting, and Exponential Smoothing models train on data that includes current conditions at the chosen location, producing location-specific predictions.

**Example:** If you pick Los Angeles (35C, 25% humidity, strong wind, 12 active fire hotspots nearby), the synthetic row will have high temperature, low humidity, high wind, and boosted fire indices. If you pick London (18C, 75% humidity, calm, no fires), the synthetic row will have low temperature, high humidity, and no fire boosts. The ML models then produce different forecasts for each location.

**Analogy:** Imagine predicting traffic on your commute. Historical data tells you that Mondays at 8 AM are usually bad. But if there is a live traffic camera showing a major accident right now, that real-time information dramatically changes your prediction. Live data enrichment is the "traffic camera" for our wildfire model.

**Where in code:**
- Live context injection: `inject_live_row()` in `ml_bridge.py`
- Weather fetch: `web/src/lib/ingestion/weather.ts`
- Fire data fetch: `web/src/lib/ingestion/firms.ts`
- Vegetation data fetch: `web/src/lib/ingestion/gee.ts`

---

### 5.5 Step 5: Dynamic Weighting

Not all five components are equally important at all times. On a windy day, the "spread" component matters more than usual. During a drought, "fuel" and "ignition" deserve extra weight. If it has been raining recently, "containment" becomes less of a concern.

**How it works (component-aware approach):**

1. Start with a small base weight (0.10) for each component.
2. Add the **actual component value** to its own weight. Components with higher risk values naturally get higher weights. If ignition = 0.7 and fuel = 0.05, ignition's weight grows far more than fuel's.
3. Look at the **recent trend** over the last 7 timesteps. If a component is trending upward (risk is increasing), give it an additional boost.
4. Apply condition-based adjustments from the raw features:
   - High temperature (> 0.4 normalized): boost ignition weight proportionally.
   - Low humidity (< 0.5 normalized): boost ignition weight.
   - High wind (> 0.3 normalized): boost spread weight.
   - High drought code (> 0.3 normalized): boost both fuel and containment.
5. In the TypeScript version, also factor in live weather data:
   - Live wind > 20 km/h: boost spread.
   - Live temperature > 32C: boost ignition.
   - Live humidity < 30%: boost ignition.
   - High vegetation dryness from satellite: boost fuel.
   - High burn severity from satellite: boost impact.
6. Re-normalize so all five weights add up to 1.0.

**Why this approach?** An earlier version used simple threshold checks (e.g., "if DC > 0.6, add 0.1 to fuel"). The problem was that on moderate days (which is most days in the dataset), no thresholds triggered and all weights stayed at a flat 20%. The component-aware approach guarantees differentiated weights because it uses the actual values, not just binary thresholds.

**Example output:** For the Algerian dataset, the weights come out as: Ignition 35.8%, Spread 32.0%, Fuel 11.7%, Containment 11.3%, Impact 9.2%. This correctly reflects that ignition and spread have the highest component values, so they deserve the most weight.

**Analogy:** A doctor evaluating a patient's overall health does not always weigh each vital sign equally. If the patient has a fever, the temperature reading becomes far more important than their blood pressure. If they are having chest pain, the heart rate takes priority. Our dynamic weighting works the same way: current conditions tell us which risk dimension to pay the most attention to.

**Where in code:**
- Python: `compute_weights()` in `dynamic_weights.py`
- TypeScript: `deriveDynamicWeights()` in `web/src/lib/ctrd.ts`

---

### 5.6 Step 6: Computing the Composite Risk Score

Once we have the five component values and their dynamic weights, we compute a single composite risk score by taking a **weighted sum**:

```
Risk = (w_ignition * ignition) + (w_spread * spread) + (w_fuel * fuel) + (w_containment * containment) + (w_impact * impact)
```

where all weights sum to 1.0.

**Example:** If the components are [ignition=0.7, spread=0.5, fuel=0.8, containment=0.6, impact=0.4] and the weights are [0.358, 0.320, 0.117, 0.113, 0.092], then:

```
Risk = (0.358 * 0.7) + (0.320 * 0.5) + (0.117 * 0.8) + (0.113 * 0.6) + (0.092 * 0.4)
     = 0.251 + 0.160 + 0.094 + 0.068 + 0.037
     = 0.609
```

The result is always between 0 (no risk) and 1 (maximum risk).

**Analogy:** Your semester GPA. Each course has a different number of credits (weights), and you multiply each grade by its credits, sum everything up, and divide by total credits. This is essentially the same operation.

**Where in code:**
- Python: `compute_composite()` in `utils.py`
- TypeScript: `analyzeRisk()` in `web/src/lib/ctrd.ts`

---

### 5.7 Step 7: Multi-Horizon Forecasting (Simple Trend)

The TypeScript pipeline uses a lightweight trending-average approach for quick in-browser forecasting at 24h, 72h, and 7-day horizons.

**How it works (for each component individually):**

1. Take the last 7 data points for a given component.
2. Compute the **mean** (average) of these values.
3. Compute the **drift**: how much the component has been trending up or down. `drift = (last_value - first_value) / (count - 1)`.
4. Extrapolate: `predicted = mean + (drift * horizon_hours / 24)`.
5. Clamp the result to [0, 1].
6. Apply the same dynamic weighting to combine the forecasted components.

This is intentionally simple. The real ML forecasting (ARIMA, Gradient Boosting, Exponential Smoothing) is handled by the Python pipeline, described in Section 6.

**Analogy:** Imagine you are tracking the water level in a river. For the past week, the level has been: 2m, 2.1m, 2.3m, 2.4m, 2.5m, 2.7m, 2.8m. The average is about 2.4m, and the trend is rising by roughly 0.13m per day. So you predict: tomorrow = 2.93m, in 3 days = 3.19m. The TypeScript pipeline does the same thing for each wildfire risk component.

**Where in code:** `forecastFromSeries()` in `web/src/lib/ml/forecast.ts`

---

### 5.8 Step 8: Uncertainty Estimation

No prediction is perfect. When we say "the risk in 7 days will be 0.61," we should also say "but it could realistically be anywhere from 0.45 to 0.77." This range is called a **prediction interval** or **confidence interval**.

**How it works:**

1. Collect all historical risk scores.
2. Compute the **standard deviation** (a measure of how much the risk scores typically vary from their average).
   - **Standard deviation explained:** If risk scores are usually very close to the average, the standard deviation is small. If they jump around a lot, the standard deviation is large.
3. Multiply the standard deviation by a z-factor (1.64 for a 90% confidence interval).
4. The prediction interval is: `[predicted - 1.64 * std_dev, predicted + 1.64 * std_dev]`

**Example:** If the predicted risk is 0.61 and the standard deviation of historical risk scores is 0.10, then:
- Lower bound = 0.61 - (1.64 * 0.10) = 0.61 - 0.164 = 0.446
- Upper bound = 0.61 + (1.64 * 0.10) = 0.61 + 0.164 = 0.774
- "We predict the risk will be 0.61, with a 90% chance it falls between 0.45 and 0.77."

**Why 1.64?** In statistics, 1.64 is the z-score for a 90% confidence level. It means: "If we assume the errors follow a roughly normal distribution, 90% of future observations should fall within this range." We could use 1.96 for 95% (wider band) or 1.28 for 80% (narrower band). We chose 90% as a practical balance.

**Analogy:** A weather forecast says "tomorrow's high will be 30 degrees, give or take 3 degrees." The "give or take 3 degrees" is the prediction interval. It tells you how confident the forecast is. Our uncertainty estimation does the same thing for wildfire risk.

**Where in code:** `estimatePredictionInterval()` in `web/src/lib/ml/uncertainty.ts`

---

### 5.9 Step 9: Alert Classification (Calibrated Thresholds)

Once we have a risk score, we need to translate it into a human-readable alert level so that a decision-maker can act on it without having to interpret numbers.

**The five alert levels:**

| Level | Color | What It Means | Recommended Action |
|-------|-------|---------------|-------------------|
| GREEN | Green | Low risk | No action needed |
| YELLOW | Yellow | Moderate risk | Monitor conditions, prepare patrol teams |
| ORANGE | Orange | High risk | Prepare response teams, coordinate with authorities |
| RED | Red | Very high risk | Deploy resources, issue public advisories |
| CRITICAL | Red (flashing) | Extreme risk | Emergency protocols, evacuation planning |

**How are the thresholds determined?**

We do NOT use fixed thresholds like "anything above 0.5 is RED." That would be arbitrary. Instead, we use **percentile-based calibration** from the actual distribution of historical risk scores.

**What are percentiles?** If you line up all the risk scores from smallest to largest, the 20th percentile is the value below which 20% of the data falls. The 90th percentile is the value below which 90% falls.

**Our calibration:**
- Sort all historical risk scores from low to high.
- GREEN threshold = 20th percentile (bottom 20% of scores are GREEN).
- YELLOW threshold = 45th percentile.
- ORANGE threshold = 70th percentile.
- RED threshold = 90th percentile (only the top 10% are RED or CRITICAL).
- Anything above the RED threshold is CRITICAL.

**Why percentile-based?** Because different datasets have different risk distributions. The Algerian dataset might have risk scores clustered between 0.2 and 0.8, while a California dataset might be clustered between 0.3 and 0.6. Percentile-based thresholds automatically adapt to whatever data you are working with.

**Analogy:** Imagine grading on a curve in school. Instead of saying "90+ is an A," you say "the top 10% of students get an A." This means the thresholds are always relative to the class performance, not some arbitrary number. Our alert calibration works the same way.

**Where in code:** `calibrateThresholds()` and `classifyAlert()` in `web/src/lib/ml/calibration.ts`

---

### 5.10 Step 10: Explainability

The system produces three pieces of explanatory information for every analysis:

**1. Dominant Driver:** Which component is contributing the most to the risk? We look at the weighted contribution of each component (`weight * component_value`) and pick the one with the highest product.

**Why it matters:** Knowing the dominant driver tells you what to focus on. If fuel is dominant, you consider vegetation management. If spread is dominant, you prepare for fast-moving fires and deploy aerial resources.

**2. Top Factors:** All five components ranked from highest to lowest contribution. This gives the full picture, not just the single most important one.

**3. Change Deltas:** For each component, we compute how much it has changed since the previous timestep. A positive delta means that component's risk is increasing. A negative delta means it is decreasing.

**Analogy:** A financial advisor does not just tell you "your portfolio lost 3% today." They tell you: "Tech stocks dropped 8% (dominant driver), energy was flat, and bonds gained 1%. The tech drop is accelerating compared to yesterday." That is explainability: telling you the what, the why, and the trend.

**Where in code:** `deriveExplainability()` in `web/src/lib/ml/explainability.ts`

---

## 6. The Python ML Models

This is where the real Machine Learning lives. The Python pipeline runs four established ML techniques from `scikit-learn` and `statsmodels`, and the web app calls it for every analysis.

### 6.1 How the Python Bridge Works

The web application is built in Next.js (JavaScript/TypeScript). The ML models are in Python. To connect them:

1. When you click "Run Analysis" in the browser, the web server receives the CSV data and the coordinates.
2. The server fetches live weather, satellite fire data, and vegetation data for those coordinates.
3. The server writes the CSV to a temporary file and the live data to a JSON file.
4. The server spawns a Python process: `.venv/bin/python3 ml_bridge.py /tmp/data.csv /tmp/context.json`.
5. The Python script runs the full ML pipeline and prints a JSON result to stdout.
6. The server reads that JSON output, parses it, and includes it in the API response.
7. The browser displays the Python ML results in the "ML Model Predictions" and "Granger Causality" panels.

If Python is not installed or the dependencies are missing, the web app still works. It just shows the TypeScript pipeline results and marks the Python ML panel as "Offline."

**Analogy:** Think of it like a restaurant where the main kitchen (TypeScript) handles all orders, but for one specialty dish (the ML models), it calls a guest chef (Python) in a separate kitchen. The guest chef prepares the dish and sends it back through a serving window (stdout). If the guest chef is not available, the main kitchen still serves the rest of the menu.

**Where in code:**
- Python script: `ml_bridge.py`
- TypeScript bridge: `web/src/lib/ml/python-bridge.ts`
- API route integration: `web/src/app/api/analyze/route.ts`

---

### 6.2 Live Context Injection

The Python pipeline receives a "live context" JSON containing the weather, satellite, and vegetation data fetched for the selected coordinates. It uses this to create a **synthetic data row** that is appended to the historical dataset before the ML models run.

**How the synthetic row is created:**

1. Take the last row of the cleaned historical dataset as the starting point.
2. Blend in live weather: the synthetic row's temperature becomes a 50/50 mix of the historical value and the live reading (normalized to the 0-1 scale). Same for humidity and wind.
3. Incorporate satellite fire detections: if there are active hotspots nearby, boost the FWI and ISI values (more active fires = higher fire intensity and spread indices).
4. Incorporate vegetation dryness: if satellite data shows dry vegetation, boost DMC and DC values (drier organic layers = more fuel).
5. Incorporate thermal anomaly: if the ground is hotter than normal, boost the temperature value.
6. Incorporate burn severity: if recent burns are detected, boost FWI.
7. Recompute all five risk components (ignition, spread, fuel, containment, impact) from the modified features.

The result: when you select Los Angeles (hot, dry, windy, fires nearby), the dataset ends with a high-risk synthetic row. When you select London (cool, wet, calm, no fires), it ends with a low-risk synthetic row. The ML models train on and extrapolate from this modified data, producing different predictions for different locations.

**Where in code:** `inject_live_row()` in `ml_bridge.py`

---

### 6.3 ARIMA

**What is ARIMA?** Auto-Regressive Integrated Moving Average. It is one of the most widely used classical time series forecasting models. The name describes three operations:

- **AR (Auto-Regressive, the "1" in ARIMA(1,1,1)):** The prediction depends on past values of the series. "Tomorrow's ignition risk depends on today's ignition risk." The "1" means we look back 1 timestep.

- **I (Integrated, the middle "1"):** We difference the series once to make it stationary. Instead of predicting the risk level directly, we predict the *change* in risk level. This removes trends. If risk has been steadily climbing, differencing subtracts out that climb so the model can focus on fluctuations.

  **Analogy:** If you want to predict tomorrow's stock price, it helps to instead predict the *change* from today to tomorrow. The overall upward trend is removed, and you focus on the daily fluctuations.

- **MA (Moving Average, the last "1"):** The prediction also depends on past forecast errors. If the model overpredicted yesterday, it adjusts downward today. The "1" means we look at the error from 1 timestep ago.

**In our system:** We run ARIMA(1,1,1) separately on each of the five risk components (ignition, spread, fuel, containment, impact). Each produces a one-step-ahead prediction.

**Where in code:** `safe_forecast_arima()` in `ml_bridge.py`, which calls `statsmodels.tsa.arima.model.ARIMA`

---

### 6.4 Exponential Smoothing (Holt-Winters)

**What is it?** A forecasting method that gives more weight to recent observations and progressively less weight to older ones. The idea is simple: recent data is more relevant than ancient data, but you do not want to throw away old data entirely.

**How it works:** Each forecast is a weighted average of all past values, where the weights decay exponentially the further back you go. The most recent observation might get 40% weight, the one before that 24%, the one before that 14%, and so on. The "smoothing factor" (alpha) controls how fast the decay happens:
- Alpha close to 1: almost all weight on the most recent value (very responsive to changes).
- Alpha close to 0: weight spread evenly across many past values (very stable, slow to react).

**Analogy:** Imagine you are guessing the temperature each day. If you weighted all 30 days of the past month equally, your guess would be very stable but slow to react to a sudden cold front. If you only looked at yesterday's temperature, you would react fast but be noisy. Exponential Smoothing finds a middle ground: it mostly trusts recent data but keeps a memory of the past.

**In our system:** We run Exponential Smoothing on each of the five components separately. It is implemented using `statsmodels.tsa.holtwinters.ExponentialSmoothing`.

**Where in code:** `safe_forecast_exp()` in `ml_bridge.py`

---

### 6.5 Gradient Boosting Regressor

**What is it?** A machine learning algorithm from the `scikit-learn` library that builds an ensemble (a team) of many small decision trees, where each tree corrects the mistakes of the previous ones.

**How it works, step by step:**

1. Start with a very simple prediction (e.g., the mean of all values).
2. Calculate the "residuals": how wrong this simple prediction is for each data point.
3. Train a small decision tree to predict these residuals. Now you have a slightly better model.
4. Calculate the new residuals (the mistakes the improved model still makes).
5. Train another small decision tree on *these* residuals.
6. Repeat this 100 times (n_estimators=100 in our config).
7. The final prediction is the sum of the initial guess plus all 100 correction trees.

**Why "gradient"?** Each new tree is trained to follow the gradient (direction of steepest descent) of the loss function. In simpler terms, each tree tries to make the biggest possible improvement given the current mistakes.

**Why "boosting"?** Because each tree "boosts" (improves upon) the previous ensemble.

**Analogy:** Imagine an exam where you make mistakes. Your teacher does not give you a completely new textbook. Instead, they look at exactly which questions you got wrong and create a targeted worksheet addressing only those mistakes. You study the worksheet and improve. Then they look at what you still get wrong and create another targeted worksheet. After 100 iterations of this, you have improved enormously. Each worksheet is a "tree" in gradient boosting.

**In our system:** We use `sklearn.ensemble.GradientBoostingRegressor` with 100 trees and max depth 3. The input is the timestep index (0, 1, 2, ..., N) and the target is the component value at that timestep. The model learns the temporal pattern and predicts the value at timestep N+1.

**Where in code:** `safe_forecast_gb()` in `ml_bridge.py`

---

### 6.6 Ensemble Averaging

We run all three models (ARIMA, Exponential Smoothing, Gradient Boosting) on all five components and then **average their predictions** for each component. This is called **ensemble averaging** or **model averaging**.

**Why average multiple models?** Different models have different strengths and weaknesses:
- ARIMA is good at capturing short-term trends and autocorrelation (today's value depends on yesterday's).
- Exponential Smoothing is good at smooth, gradual changes.
- Gradient Boosting is good at capturing nonlinear patterns.

By averaging them, we get a prediction that is more robust than any single model. If one model makes a bad prediction, the other two dilute the error.

**Analogy:** If you ask three friends to estimate the distance to a building, and they say 100m, 120m, and 110m, the average (110m) is likely closer to the truth than any single guess. This is the "wisdom of crowds" effect. Ensemble averaging applies this principle to ML models.

The ensemble composite score is then computed using the dynamic weights, and an alert level and dominant driver are determined.

**Where in code:** The ensemble averaging loop in `run_pipeline()` in `ml_bridge.py`

---

### 6.7 Granger Causality

**What is Granger Causality?** It is a statistical hypothesis test that determines whether the past values of one time series are useful for predicting the future values of another. If knowing yesterday's wind speed helps you predict today's fire risk better than just knowing yesterday's fire risk alone, we say "wind speed Granger-causes fire risk."

**Important:** Granger Causality does not prove true causation (in the philosophical sense). It only proves statistical predictive usefulness. The name comes from Nobel Prize-winning economist Clive Granger who formalized the concept.

**How the test works:**

1. Take two time series: X (e.g., spread) and Y (e.g., ignition).
2. Fit a model that predicts Y using only past values of Y. Measure the prediction error (SSR1).
3. Fit another model that predicts Y using past values of both Y and X. Measure the prediction error (SSR2).
4. If SSR2 is significantly smaller than SSR1 (using an F-test), then X provides useful predictive information about Y. We say "X Granger-causes Y."
5. The p-value from the F-test tells us the statistical significance. If p < 0.05, the relationship is significant at the 95% confidence level.

**In our system:** We test all 25 pairs of the 5 components (5 x 5 matrix), with up to 4 lags (looking back 1 to 4 timesteps). The result is a 5x5 matrix where each cell contains a p-value:
- Green cells (p < 0.05): statistically significant causal influence. For example, if the (spread, ignition) cell is 0.0001, it means past spread values significantly help predict future ignition values.
- Red cells (p > 0.05): no significant causal influence detected.

**What does the matrix tell us?** It reveals the hidden causal structure of wildfire risk. For example, in our dataset, spread Granger-causes ignition (p=0.00005), and containment Granger-causes fuel (p=0.005). This means that rising spread conditions are a leading indicator of future ignition events, and worsening containment conditions predict future fuel accumulation.

**Analogy:** Imagine you run a restaurant and want to know what predicts tomorrow's sales. You test: does yesterday's weather predict tomorrow's sales? Does yesterday's foot traffic predict tomorrow's sales? Does yesterday's menu predict tomorrow's sales? Granger Causality runs these tests systematically and tells you which "leading indicators" actually have predictive power.

**Where in code:**
- `run_granger()` in `ml_bridge.py`, which calls `statsmodels.tsa.stattools.grangercausalitytests`
- `causal_analysis.py` (the original standalone version)

---

## 7. Live Data Sources (The Three APIs)

### 7.1 Open-Meteo (Weather)

**What it is:** A free, open-source weather forecast API. No API key needed.

**What we fetch:** Current temperature (Celsius), relative humidity (%), wind speed (km/h), and precipitation probability (%) for a given latitude and longitude.

**How we use it:** The live weather data feeds into both pipelines:
- TypeScript: directly adjusts dynamic weights (hot temperature boosts ignition weight, etc.)
- Python: normalized and blended into the synthetic data row that the ML models train on.

**The endpoint:** `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,...`

**Where in code:** `web/src/lib/ingestion/weather.ts`

---

### 7.2 NASA FIRMS (Satellite Fire Detection)

**What it is:** The Fire Information for Resource Management System, operated by NASA. It uses thermal imaging from satellites (VIIRS and MODIS instruments) to detect active fires anywhere on Earth, updated multiple times per day.

**What we fetch:** A list of "hotspots" within a geographic bounding box around the target coordinates. Each hotspot includes latitude, longitude, brightness temperature, confidence level, and Fire Radiative Power (FRP).

**Key terms:**
- **Hotspot:** A single pixel from a satellite image that the algorithm has identified as containing an active fire.
- **FRP (Fire Radiative Power):** Measured in megawatts (MW). Represents how much energy the fire is releasing. A small campfire might be 1 MW. A major wildfire can exceed 1000 MW.
- **Confidence:** How certain the satellite algorithm is that the detection is a real fire and not a false alarm (e.g., a hot factory roof).
- **Bounding Box:** A rectangular area defined by four coordinates (west, south, east, north) that tells the API "give me all fire detections within this rectangle."
- **VIIRS:** Visible Infrared Imaging Radiometer Suite. A sensor on the Suomi NPP and NOAA-20 satellites. It can detect fires as small as a few hundred square meters.

**How we use it:** The count of active hotspots and average FRP are passed to the Python pipeline as part of the live context. Active fires nearby boost the FWI and ISI values in the synthetic row, making the ML models predict higher risk.

**Where in code:** `web/src/lib/ingestion/firms.ts`

---

### 7.3 Google Earth Engine (Vegetation and Land)

**What it is:** Google Earth Engine (GEE) is a cloud-based platform that provides access to decades of satellite imagery and geospatial datasets. We use it to get information about the land and vegetation at a target location.

**What we fetch:** Three indicators:

1. **Vegetation Dryness (NDVI proxy):**
   - **NDVI** stands for Normalized Difference Vegetation Index. It measures how green and healthy vegetation is by analyzing how much red and near-infrared light a plant reflects.
   - Healthy, well-watered plants absorb red light and strongly reflect near-infrared light, giving a high NDVI (close to 1.0).
   - Dry, stressed, or dead vegetation reflects both similarly, giving a low NDVI (close to 0).
   - We invert this: high "vegetation dryness" = low NDVI = dry, fire-prone vegetation.

   **Analogy:** Looking at a lawn from above. A lush green lawn has high NDVI. A brown, parched lawn has low NDVI. Satellites can do this for every patch of land on Earth.

2. **Thermal Anomaly:** The land surface temperature compared to what is normal for that location and time of year. A positive anomaly means the ground is hotter than usual, which can indicate drought stress or nearby fire activity.

3. **Burn Severity Index:** Measures how badly an area has already been burned, which affects the likelihood of fire spread.

**The fallback:** GEE requires a proxy server and authentication, which may not be configured in every deployment. If the GEE proxy is not available, the system uses **heuristic estimates** (educated guesses derived from the latitude, longitude, and other available data). This ensures the system always produces results, even without GEE.

**Where in code:** `web/src/lib/ingestion/gee.ts`

---

## 8. Caching

Every time you run an analysis, the system calls up to three external APIs. These API calls take time (typically 200-500ms each) and some have rate limits (NASA FIRMS, for example). If you run multiple analyses for nearby locations within a short period, it is wasteful to make the same API call repeatedly.

**Solution: In-memory caching with TTL.**

**How it works:**
1. When an API response comes back, we store it in a JavaScript `Map` object in server memory, along with an expiration timestamp.
2. Before making an API call, we check the cache. If a valid (non-expired) entry exists for that same key, we return it immediately without making the API call.
3. Each cache entry has a TTL (Time-To-Live): weather data = 15 minutes, FIRMS data = 10 minutes, GEE data = 30 minutes.

**Key terms:**
- **TTL (Time-To-Live):** How long a cached value remains valid before it is considered stale and discarded.
- **Cache key:** A string that uniquely identifies the request. For weather, it is `weather:36.70:3.20:7` (latitude, longitude, forecast days).
- **In-memory:** The cache lives in the server's RAM, not in a database or on disk. It is fast but disappears when the server restarts.

**Analogy:** Your web browser caches images from websites. The first time you visit a page, it downloads the image (slow). The next time, it uses the cached copy (fast). But after a while, the cache expires and it downloads a fresh version. Our API cache works exactly the same way.

**Where in code:** `web/src/lib/cache/store.ts`

---

## 9. The Notification System

When the analysis produces a RED or CRITICAL alert, the system can automatically notify people through two channels:

### Email (via Nodemailer)

Nodemailer is a popular Node.js library for sending emails. It connects to an SMTP server (like Gmail, Outlook, or a custom mail server) and sends an email with the alert details.

**What you need to configure (in `.env.local`):**
- `SMTP_HOST` (e.g., smtp.gmail.com)
- `SMTP_USER` (your email address)
- `SMTP_PASS` (your email password or app-specific password)
- `SMTP_FROM` (the "from" address)

### Telegram (via Telegram Bot API)

The system can send alerts to a Telegram chat or group via a Telegram Bot.

**What you need to configure:**
- `TELEGRAM_BOT_TOKEN` (obtained by creating a bot through Telegram's @BotFather)
- The user provides a `chat_id` in the analysis request.

**How the alert decision is made:** The `shouldTriggerAlert()` function returns `true` only if the alert level is RED or CRITICAL. YELLOW and ORANGE alerts are informational and do not trigger notifications.

**Where in code:** `web/src/lib/alerts/engine.ts` and `web/src/lib/alerts/notifiers.ts`

---

## 10. Model Evaluation

A machine learning system is only as good as its ability to prove that it works. We evaluate our pipeline through two methods.

### 10.1 Backtesting

**What is backtesting?** It is a technique where you pretend you are in the past and test whether your model would have made correct predictions. It is the standard way to evaluate forecasting models.

**How our backtesting works:**

1. Start at row 7 of the dataset (so you have at least 7 rows of history).
2. For each row `i` from row 7 to the second-to-last row:
   a. Use all data from row 0 to row `i` as "training" data.
   b. Use the training data to predict the risk at row `i+1`.
   c. Compare the prediction to the actual risk at row `i+1`.
   d. Record the error (actual minus predicted).
3. After processing all rows, compute summary metrics.

**The metrics we compute:**

- **MAE (Mean Absolute Error):** The average of the absolute differences between predictions and actual values. If MAE = 0.04, the model is off by 0.04 on average (on a 0-to-1 scale).

  **Analogy:** You guess the temperature every day. Some days you are off by 1 degree, other days by 3 degrees. MAE is the average of how far off you are.

- **RMSE (Root Mean Squared Error):** Similar to MAE, but it penalizes large errors more heavily. If you have mostly small errors but one huge mistake, RMSE will be noticeably higher than MAE.

  **Analogy:** Imagine two students estimating prices. Student A is off by $2 every time. Student B is off by $1 most times, but once is off by $10. MAE might be similar, but RMSE reveals that Student B's one big miss is more concerning.

- **Precision:** Of all the times the model said "this is a dangerous situation (RED/CRITICAL)," what fraction actually was dangerous? High precision means few false alarms.

  **Analogy:** A fire alarm that goes off 10 times. If 8 of those were real fires, precision = 80%.

- **Recall:** Of all the actually dangerous situations, what fraction did the model correctly identify? High recall means few missed threats.

  **Analogy:** There were 10 real fires. The alarm correctly went off for 8 of them. Recall = 80%. Two fires were missed.

- **F1 Score:** The harmonic mean of precision and recall. It is a single number that balances both concerns. An F1 of 0.80 means the system is reasonably good at both avoiding false alarms and catching real threats.

  **Analogy:** A security guard who catches most intruders (high recall) but also has many false reports (low precision) would have a mediocre F1. A guard who is both accurate and thorough would have a high F1.

**Where in code:** `web/src/lib/evaluation/backtest.ts`

---

### 10.2 Ablation Study

**What is an ablation study?** In machine learning, an ablation study tests how much each piece of your system contributes to the overall performance. You "ablate" (remove) components one at a time and see how performance changes.

The term comes from medicine, where "ablation" means surgically removing tissue to study its function.

**Our three configurations:**

1. **Base (historical FWI only):** The model uses only the CSV data. No live APIs.
2. **Base + Live APIs:** The model uses CSV data plus real-time weather and FIRMS satellite data.
3. **Base + Live APIs + Geospatial:** The full pipeline with weather, FIRMS, and Google Earth Engine vegetation data.

By comparing the MAE across these three setups, we can quantify the value of each data source. If adding live weather data reduces MAE from 0.041 to 0.038, we can say "live weather data provides a 7% improvement in prediction accuracy."

**Why does this matter?** It justifies the engineering effort. Building API integrations is complex. If they did not improve the model, there would be no reason to include them. The ablation study proves they do.

**Where in code:** `web/src/lib/evaluation/ablation.ts`

---

## 11. System Architecture

### 11.1 The Two Pipelines and How They Connect

The project has **two ML pipelines** that work together:

**Pipeline 1: TypeScript (runs in Node.js)**
- Handles all web interactions, API fetching, caching, and quick in-browser computations.
- Uses a lightweight trend-extrapolation forecasting method.
- Runs the Forecasts panel (24h/72h/7d predictions), Explainability, Alerts, and Evaluation.
- Always available, instant response.

**Pipeline 2: Python (runs via subprocess)**
- Runs the real ML models: ARIMA, Exponential Smoothing, Gradient Boosting, Granger Causality.
- Uses `scikit-learn` and `statsmodels` libraries.
- Called by the TypeScript API route via `child_process.execFile()`.
- Receives the CSV data plus a live context JSON with location-specific weather, fire, and vegetation data.
- Returns a JSON blob with per-model predictions, ensemble scores, and the Granger matrix.
- Populates the "ML Model Predictions" and "Granger Causality Matrix" panels.

**Why two pipelines?** The Python ML libraries (statsmodels, scikit-learn) cannot run in the browser or in Node.js natively. They need a Python runtime. The subprocess bridge keeps the project as a single application (one `npm run dev`) while still using the best tools for each job.

**Where in code:**
- TypeScript pipeline: `web/src/lib/ctrd.ts`
- Python pipeline: `ml_bridge.py` (calls `ingestion.py`, `feature_engineering.py`, `causal_analysis.py`, `forecasting.py`, `dynamic_weights.py`, `alerting.py`, `utils.py`)
- Bridge: `web/src/lib/ml/python-bridge.ts`

---

### 11.2 API Routes

Next.js lets you put files in `app/api/` and they become HTTP endpoints. Here is every API route in the project and what it does:

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/analyze` | POST | Accepts CSV data, coordinates, and horizon preferences. Fetches live data, runs both the TypeScript and Python pipelines, merges results, and returns the complete analysis. |
| `/api/global-snapshot` | GET | Returns a summary of the global situation: number of active hotspots, critical regions, average global risk, top 5 highest-risk regions, and a live event feed. |
| `/api/sample-csv` | GET | Returns the built-in Algerian dataset as CSV text, so users do not need to upload a file to try the system. |
| `/api/watchlists` | GET/POST/PATCH | Manage saved regions that you want to monitor regularly. |
| `/api/alerts` | GET/PATCH | List all triggered alerts and acknowledge them. |
| `/api/timeline` | GET | Returns the history of past risk analyses for a region, used for the timeline chart. |
| `/api/evaluation` | GET | Runs the backtesting and ablation study on the built-in dataset. |
| `/api/stream` | GET | A Server-Sent Events (SSE) endpoint for live updates. |

---

### 11.3 File-Backed Persistence

The application needs to remember things between requests: saved watchlists, past risk analyses, and alert history. Instead of requiring a database like PostgreSQL or MongoDB, we use a simple approach: a JSON file on disk.

**How it works:**
- All data is stored in `.data/store.json` in the project directory.
- When the server needs to read data, it reads this file and parses the JSON.
- When the server needs to write data (new watchlist, new alert), it reads the file, modifies the in-memory object, and writes the whole thing back to the file.
- If the file does not exist, it creates it with empty arrays for watchlists, risk runs, and alerts.

**Why not a real database?** For a course project that runs on a developer's laptop, a JSON file is simple, requires zero setup, and is easy to inspect and debug. We note in our paper that a production system would need a proper database.

**Where in code:** `web/src/lib/store/schema.ts`, `web/src/lib/store/watchlists.ts`, `web/src/lib/store/risk-runs.ts`, `web/src/lib/store/alerts.ts`

---

### 11.4 Server-Sent Events (SSE)

**What is SSE?** Server-Sent Events is a web standard that allows a server to push real-time updates to the browser without the browser having to repeatedly ask "any updates yet?" (which is called polling).

**How it works:**
1. The browser opens a long-lived HTTP connection to `/api/stream`.
2. The server keeps this connection open and periodically sends "heartbeat" messages (every 10 seconds) to keep it alive.
3. On the client side, the dashboard listens for these events and uses them as a trigger to refresh its data.

**Analogy:** Imagine two ways to check if your pizza is ready. **Polling:** You walk to the counter every 30 seconds and ask "is it ready yet?" **SSE:** The restaurant says "sit down, I will call your name when it is ready." SSE is more efficient because the server tells you when something changes, instead of you constantly asking.

In our system, the dashboard also has a 60-second polling interval as a fallback, so even if the SSE connection drops, data still gets refreshed.

**Where in code:** `web/src/app/api/stream/route.ts`

---

## 12. The Dashboard (Frontend)

### 12.1 The D3.js World Map

The map is the centerpiece of the dashboard. It takes up the full width of the screen and shows the entire world using an **equirectangular projection**.

**What is D3.js?** D3 (Data-Driven Documents) is a JavaScript library for creating data visualizations using SVG (Scalable Vector Graphics). Unlike a pre-built map library (like Google Maps), D3 gives you complete control over every pixel.

**What is an equirectangular projection?** It is the simplest way to draw a sphere (the Earth) on a flat surface: longitude maps directly to the x-axis, latitude maps to the y-axis. It distorts sizes (Greenland looks huge), but it shows the entire world at once, which is exactly what a monitoring dashboard needs.

**What is TopoJSON?** A compact format for storing geographic boundaries (country borders, coastlines). The map loads a TopoJSON file containing all country polygons and draws them using D3.

**Map features:**
- **Country borders** drawn from TopoJSON data.
- **Graticule lines** (the grid of latitude/longitude lines you see on a globe).
- **Day/night terminator:** A shaded overlay showing which parts of the world are currently in darkness. This is computed from the current date and time.
- **Fire-prone regions:** Static markers at known fire-prone locations (e.g., California, Mediterranean, Amazon, Australia, Siberia).
- **Fire zones:** Larger shaded areas indicating general fire-risk regions.
- **Ocean labels:** Labels for the Atlantic, Pacific, Indian, Arctic, and Southern oceans.
- **Weather tooltips:** Hover over any part of the map and it fetches live weather data for that location (temperature, wind speed, conditions) and displays it in a tooltip.
- **Zoom and pan:** You can scroll to zoom in and drag to pan around the map.
- **Click-to-set-coordinates:** Click anywhere on the map and the latitude/longitude are automatically filled into the Risk Analysis panel.

**Where in code:** `web/src/components/map/d3-map.tsx`

---

### 12.2 The Panel System

Below the map, all information is organized into **panels**. Each panel is a compact, dark-themed container with:

- An uppercase monospace header (e.g., "RISK ANALYSIS", "ACTIVE FIRES").
- An optional count badge (e.g., "12" next to "ALERTS").
- An optional status indicator (a colored dot: green, yellow, red).
- A collapsible body that can be expanded or collapsed.
- An optional actions slot (buttons in the top-right corner).

This design is inspired by the Situation Monitor project and mimics the look of a professional operations center.

**Where in code:** `web/src/components/ui/panel.tsx`

---

### 12.3 Masonry Grid Layout

The panels are arranged in a **masonry grid**: a layout where items flow into columns, filling in gaps like bricks in a wall. This maximizes the use of screen space and avoids large empty areas.

**How it works (CSS):** We use the CSS `column-count` property combined with `break-inside: avoid` on each panel. On wide screens (1920px+), it uses 5 columns. On medium screens, 3 columns. On narrow screens, 1 column. Panels flow into columns top-to-bottom, left-to-right.

**Analogy:** Think of a Pinterest board. Instead of a rigid grid where every card is the same size, cards of different heights stack neatly into columns without wasting space. That is a masonry layout.

---

### 12.4 Dark/Light Theme Toggle

The dashboard defaults to a dark terminal theme (black backgrounds, green accents, monospace fonts) but can be switched to a light theme with a single button click.

**How it works:**
1. CSS custom properties (variables) define all colors: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`, `--accent`, etc.
2. The default values are dark theme colors.
3. When the user clicks the theme toggle, the `html` element gets a `light` class.
4. CSS rules for `html.light` override all the color variables with light theme values.
5. Because every element in the app uses these variables (not hardcoded colors), the entire UI changes instantly.

**Analogy:** Imagine a room where every light, wall color, and furniture shade can be changed by flipping a single switch. Instead of repainting, you just toggle between two "presets." CSS variables work the same way.

---

### 12.5 Settings and Preset Profiles

The dashboard has many panels, and not everyone needs all of them. The Settings modal lets you control which panels are visible.

**Three preset profiles:**

1. **Researcher:** All 13 panels visible. For someone who wants the full ML detail: model predictions, Granger Causality, evaluation metrics, ablation results, component breakdowns, everything.
2. **Operations:** Only the operationally critical panels: risk analysis, active fires, live feed, alerts, and notifications. For someone who needs to make quick decisions.
3. **Minimal:** Only the risk analysis panel. The simplest possible view.

You can also toggle individual panels on or off using checkboxes.

---

### 12.6 All Dashboard Panels Explained

1. **Risk Analysis:** The main control panel. Upload a CSV (or use the built-in dataset), enter coordinates, select a forecast horizon, and click "Run Analysis." Shows the risk score, alert level, dominant driver, recommended action, and all five component values.

2. **ML Model Predictions:** Shows the output of the three Python ML models (ARIMA, Exponential Smoothing, Gradient Boosting) side by side for each of the five risk components. Below that, shows the ensemble (averaged) composite score, alert level, dominant driver, and the dynamic weights. This panel makes the machine learning visible and front-center. It shows "Connected" when the Python pipeline is working and "Offline" when Python is not available.

3. **Granger Causality Matrix:** Displays the 5x5 p-value matrix from the Granger Causality test. Rows represent the "cause" and columns represent the "effect." Green cells (p < 0.05) indicate statistically significant causal relationships. This panel proves that the system has identified genuine causal structure in the data, not just correlations.

4. **Active Fires:** Displays the number of fire hotspots detected by NASA FIRMS near the analyzed region, along with the average Fire Radiative Power and the confidence ratio.

5. **Live Feed:** A chronological list of recent events: analyses run, alerts triggered, system status changes.

6. **Forecasts:** Shows the predicted risk score for each horizon (24h, 72h, 7d) with confidence intervals and per-component breakdowns.

7. **Explainability:** Shows the dominant driver, top contributing factors with percentages, and change deltas (how each component shifted since the previous timestep).

8. **Alerts:** A list of all triggered alerts with severity, status (triggered/delivered/acknowledged), and timestamp.

9. **Watchlists:** Saved regions that you want to monitor repeatedly. Each entry has coordinates, a name, and an enable/disable toggle.

10. **Notifications:** Configuration for email and Telegram alert recipients.

11. **Model Evaluation:** Runs backtesting and ablation study on the built-in dataset and displays the metrics (MAE, RMSE, Precision, Recall, F1, ablation comparison).

12. **Risk Timeline:** An SVG sparkline chart showing how the risk score has changed over the last 30 timesteps, color-coded by severity (green, yellow, orange, red, crimson).

13. **Compare Regions:** Lets you pick two previously analyzed regions and compare them side by side: risk scores, alert levels, dominant drivers, and component breakdowns.

---

## 13. Technology Stack Glossary

Every technology used in this project, explained:

| Technology | What It Is | Why We Use It |
|-----------|------------|---------------|
| **Next.js** | A React-based web framework that supports both client-side rendering and server-side API routes. Built by Vercel. | Lets us build the entire app (frontend + backend) in one codebase. |
| **TypeScript** | JavaScript with static type checking. You declare what type each variable is (string, number, etc.) and the compiler catches mistakes before runtime. | Prevents bugs. If a function expects a number and you pass a string, TypeScript tells you immediately instead of crashing at runtime. |
| **React** | A JavaScript library for building user interfaces using components. Each piece of the UI (a button, a panel, the map) is a self-contained component that can be reused. | The standard for modern web UI development. |
| **Python** | A programming language widely used in data science and machine learning. | Runs the ML models (ARIMA, Gradient Boosting, Exponential Smoothing, Granger Causality). |
| **scikit-learn** | The most popular Python machine learning library. Provides implementations of hundreds of ML algorithms. | We use `GradientBoostingRegressor` for forecasting and `MinMaxScaler` for normalization. |
| **statsmodels** | A Python library for statistical modeling and hypothesis testing. | We use it for ARIMA forecasting, Exponential Smoothing, and Granger Causality tests. |
| **pandas** | A Python library for data manipulation and analysis. Provides the `DataFrame` data structure (think of it as a spreadsheet in code). | Loads, cleans, and processes the CSV dataset in the Python pipeline. |
| **NumPy** | A Python library for numerical computing. Provides fast array operations. | Used for mathematical calculations throughout the Python pipeline. |
| **D3.js** | A JavaScript library for data-driven visualization. It gives you low-level control over SVG elements, allowing you to draw custom charts, maps, and graphs. | We use it to draw the world map with complete control over styling and interactivity. |
| **TopoJSON** | A compact way to encode geographic shapes (country borders, coastlines) as JSON data. An extension of GeoJSON that reduces file size by sharing boundaries between neighboring regions. | Keeps our map data file small (~120KB for the whole world instead of megabytes). |
| **CSS Custom Properties** | Also called CSS variables. Defined once (e.g., `--bg: #0a0a0a`) and used everywhere. Changing the variable changes every element that uses it. | Powers our theme system. One variable change switches the entire app from dark to light. |
| **PapaParse** | A JavaScript library for parsing CSV files in the browser or Node.js. Handles edge cases like quoted fields, different delimiters, and malformed rows. | Parses the uploaded CSV data into a JavaScript array of objects. |
| **Nodemailer** | A Node.js library for sending emails through SMTP. | Powers the email notification system for high-severity alerts. |
| **Telegram Bot API** | An HTTP API provided by Telegram that lets bots send messages to chats and groups. | Powers the Telegram notification system. |
| **sonner** | A lightweight React toast notification library. | Shows those small pop-up notifications ("Analysis complete," "Error: CSV required") in the corner of the screen. |
| **SVG** | Scalable Vector Graphics. An XML-based format for drawing 2D graphics in the browser. Unlike images (PNG, JPG), SVGs scale to any size without losing quality. | Used for the map, the sparkline chart, and other visual elements. |
| **child_process** | A built-in Node.js module that lets you spawn external programs (like Python) from JavaScript. | The bridge that lets the Next.js server call the Python ML pipeline. |
| **SMTP** | Simple Mail Transfer Protocol. The standard protocol for sending emails across the internet. | Nodemailer uses SMTP to connect to mail servers. |

---

## 14. The Development Journey (What Went Wrong and What We Learned)

This section honestly documents the path we took, including the mistakes.

### Iteration 1: Python CLI

**What we did:** Built a command-line Python pipeline. Ran it with `python main.py`. Got terminal output and matplotlib chart images saved to disk.

**What went wrong:** It was functional but completely unsuitable for demonstration. A professor evaluating the project would see text in a terminal window and static PNG images. No interactivity, no real-time data, no way to explore different regions.

**Lesson:** A working model is not enough. Presentation and usability matter, especially for a course project.

---

### Iteration 2: Streamlit App

**What we did:** Wrapped the Python pipeline in Streamlit, a framework that lets you build web UIs for Python scripts in a few lines of code.

**What went wrong:** The result looked like a Jupyter Notebook rendered as a webpage. Dropdown menus, a table of results, and a chart. It felt like a data science demo, not a real application. Our professor said projects like this "can be easily vibe coded in one day."

**Lesson:** A thin UI wrapper around a script does not make a product. The interface needs to match the seriousness of the underlying system.

---

### Iteration 3: FastAPI + Next.js (Microservices)

**What we did:** Split the project into a Python API backend (using FastAPI, a Python web framework) serving the ML pipeline, and a separate Next.js frontend calling that API.

**What went wrong:** 
- **Environment issues:** The `uvicorn` development server (which runs FastAPI) was configured with `--reload` mode, which watches files for changes and restarts. It accidentally started watching the `.venv/` (virtual environment) directory, causing infinite reload loops.
- **Module import errors:** Python could not find our custom modules because the environment was not correctly configured.
- **CORS headaches:** When the frontend (running on port 3000) tries to call the backend (running on port 8000), browsers block this by default due to Cross-Origin Resource Sharing rules. We had to configure CORS headers.
- **Double the complexity:** Two processes to start, two sets of dependencies to manage, two things that can break.

**Lesson:** For a course project, a microservice architecture adds complexity without proportional benefit. We were spending more time on infrastructure than on Machine Learning.

---

### Iteration 4: Monolithic Next.js with 3D Globe

**What we did:** Consolidated everything into a single Next.js application. Rewrote the ML pipeline in TypeScript. Used `react-globe.gl` (a Three.js-based library) to render a 3D rotating globe.

**What went wrong:**
- The 3D globe looked cool in screenshots but was terrible for actual use. You had to rotate it to see different regions, which meant you could never see all fire-prone areas at once.
- The Three.js dependency added roughly 2 MB to the JavaScript bundle, making the page slow to load.
- The surrounding UI used white ShadCN Card components on a white background with scattered form inputs. It looked like a generic admin template.
- Our professor was still not satisfied. It did not feel like a real-world monitoring tool.

**Lesson:** Visual flashiness (a 3D rotating globe) is not the same as usability. For a monitoring dashboard where you need to see the entire world at once, a 2D map is strictly superior.

---

### Iteration 5: Discovering the Right Design

**What happened:** We found the Situation Monitor project (https://github.com/hipcityreg/situation-monitor), an open-source geopolitical event tracker with 4,000+ GitHub stars. Its design was the opposite of everything we had built:

- Dark background with monospace fonts (looks like an operations center terminal).
- The map IS the app. It fills the entire width of the screen.
- Below the map, compact dark panels in a masonry grid.
- No white cards, no rounded corners, no decorative elements. Just pure information density.

We realized: this is how monitoring tools should look.

---

### Iteration 6: Rewriting the Frontend

**What we built:** A complete rebuild of the frontend following the Situation Monitor's design language:
- D3.js 2D equirectangular map with fire hotspots, risk zones, and weather tooltips.
- Dark terminal theme with CSS custom properties.
- Responsive masonry grid of compact panels.
- All ML functionality preserved from the TypeScript pipeline.
- Added 7 new features: timeline chart, settings presets, click-on-map coordinates, region comparison, report export, theme toggle, and SSE auto-refresh.

---

### Iteration 7: Connecting the Real ML Models

**The problem:** Teammates pointed out that the Python ML files (ARIMA, Gradient Boosting, Granger Causality) were completely disconnected from the web app. The TypeScript pipeline was doing basic arithmetic, not real ML.

**The fix:** We built a Python-to-TypeScript bridge (`ml_bridge.py` + `python-bridge.ts`) that lets the web app call the Python ML pipeline via subprocess. We also made the Python pipeline location-aware by injecting live weather and satellite data into the dataset before running the models.

**Lesson:** The ML models need to be visible and integrated into the product, not hidden in unused files.

---

**The key takeaway:** Building a good ML system requires iteration across the entire stack. The model, the API, the UI, and the design language all need to work together. We went through six unsatisfactory versions before arriving at the final one. Each failure taught us something.

---

## 15. How to Run the Project

### Prerequisites

- Node.js 18 or later
- Python 3.10 or later
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anushkab16/wildfire-ctrd.git
   cd wildfire-ctrd
   ```

2. **Install Python dependencies:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
   On macOS, if xgboost fails, run `brew install libomp` first.

3. **Install web dependencies:**
   ```bash
   cd web
   npm install
   ```

4. **(Optional) Configure live API keys** by creating a `.env.local` file in the `web/` directory:
   ```
   FIRMS_MAP_KEY=your_nasa_firms_key
   GEE_PROXY_URL=your_gee_proxy_url
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```
   If you skip this step, the system works fine using the built-in dataset and heuristic estimates for geospatial data.

5. **Start the application:**
   ```bash
   npm run dev
   ```

6. **Open** `http://localhost:3000` in your browser.

7. **Try it out:**
   - Click "Sample" to load the built-in Algerian dataset.
   - Click on the map to set coordinates (e.g., click California, or type 36.7, 3.2 for Algeria).
   - Click "Run Analysis."
   - Scroll down to see the ML Model Predictions panel (ARIMA, Exp Smoothing, Gradient Boosting results), the Granger Causality Matrix, Forecasts, Explainability, Alerts, and more.
   - Try different locations and compare: the ML predictions will change based on live weather at each location.

### Running the Original Python Pipeline Standalone

```bash
cd ..  # back to the wildfire-ctrd root
source .venv/bin/activate
python main.py
```

This runs the original command-line version and produces text output and matplotlib plots.

---

*Authors: Anushka Batte, Sparsh Shah, Rushabh Shah, Shrey Parekh*
*Dept. of Computer Science, MPSTME, Mumbai University*
