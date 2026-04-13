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
   - 5.7 [Step 7: Multi-Horizon Forecasting](#57-step-7-multi-horizon-forecasting)
   - 5.8 [Step 8: Uncertainty Estimation](#58-step-8-uncertainty-estimation)
   - 5.9 [Step 9: Alert Classification (Calibrated Thresholds)](#59-step-9-alert-classification-calibrated-thresholds)
   - 5.10 [Step 10: Explainability](#510-step-10-explainability)
6. [Live Data Sources (The Three APIs)](#6-live-data-sources-the-three-apis)
   - 6.1 [Open-Meteo (Weather)](#61-open-meteo-weather)
   - 6.2 [NASA FIRMS (Satellite Fire Detection)](#62-nasa-firms-satellite-fire-detection)
   - 6.3 [Google Earth Engine (Vegetation and Land)](#63-google-earth-engine-vegetation-and-land)
7. [Caching](#7-caching)
8. [The Notification System](#8-the-notification-system)
9. [Model Evaluation](#9-model-evaluation)
   - 9.1 [Backtesting](#91-backtesting)
   - 9.2 [Ablation Study](#92-ablation-study)
10. [System Architecture](#10-system-architecture)
    - 10.1 [Why a Single Next.js Application?](#101-why-a-single-nextjs-application)
    - 10.2 [API Routes](#102-api-routes)
    - 10.3 [File-Backed Persistence](#103-file-backed-persistence)
    - 10.4 [Server-Sent Events (SSE)](#104-server-sent-events-sse)
11. [The Dashboard (Frontend)](#11-the-dashboard-frontend)
    - 11.1 [The D3.js World Map](#111-the-d3js-world-map)
    - 11.2 [The Panel System](#112-the-panel-system)
    - 11.3 [Masonry Grid Layout](#113-masonry-grid-layout)
    - 11.4 [Dark/Light Theme Toggle](#114-darklight-theme-toggle)
    - 11.5 [Settings and Preset Profiles](#115-settings-and-preset-profiles)
    - 11.6 [All Dashboard Panels Explained](#116-all-dashboard-panels-explained)
12. [The Original Python Pipeline](#12-the-original-python-pipeline)
13. [Technology Stack Glossary](#13-technology-stack-glossary)
14. [The Development Journey (What Went Wrong and What We Learned)](#14-the-development-journey-what-went-wrong-and-what-we-learned)
15. [How to Run the Project](#15-how-to-run-the-project)

---

## 1. What Is This Project?

Wildfire Monitor is a **real-time wildfire risk monitoring and early warning system**. Think of it as a weather forecast app, but instead of telling you "it will rain tomorrow," it tells you "the wildfire risk at this location is HIGH because the vegetation is dry and the wind is strong, and here is what you should do about it."

The key difference between this and other wildfire prediction tools is that ours does not just spit out a single number like "risk = 0.73." Instead, it breaks that number down into five meaningful pieces, so that a forest ranger or emergency coordinator can understand *why* the risk is high and *what specific action* to take.

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

**Where in code:** `cleanRows()` function in `web/src/lib/ctrd.ts`

---

### 5.2 Step 2: Normalization

Different features in our dataset have wildly different scales. Temperature ranges from 22 to 42 degrees. DC ranges from 7 to 220. If we tried to combine these directly, the DC values would dominate simply because their numbers are bigger, not because they are more important.

**What we do:** Min-Max Normalization. For each feature, we transform its values so that the smallest observed value becomes 0 and the largest becomes 1. Everything in between is proportionally scaled.

**The formula:**
```
normalized_value = (value - minimum) / (maximum - minimum)
```

**Example:**
- Temperature: min = 22, max = 42. A reading of 32 becomes (32-22)/(42-22) = 10/20 = 0.50.
- DC: min = 7, max = 220. A reading of 113.5 becomes (113.5-7)/(220-7) = 106.5/213 = 0.50.

Now both are on the same 0-to-1 scale and can be fairly compared and combined.

**Analogy:** Imagine comparing a student's Math score (out of 100) with their PE score (out of 10). If the math score is 80 and the PE score is 8, you cannot just say "math is more important because 80 > 8." You need to convert both to percentages first: Math = 80%, PE = 80%. Now they are comparable. That is normalization.

**Where in code:** `normalizeColumns()` function in `web/src/lib/ctrd.ts`

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

**Where in code:** `buildComponents()` function in `web/src/lib/ctrd.ts`

---

### 5.4 Step 4: Live Data Enrichment

The dataset gives us historical snapshots from 2012. But if you want to know the wildfire risk *right now* at a specific location, historical data alone is not enough. You need to know what the weather is like *today*, whether there are active fires *nearby*, and what the vegetation looks like *currently*.

This is where our three API integrations come in. They overlay real-time information on top of the historical analysis. (These APIs are explained in detail in Section 6.)

The live weather data (temperature, humidity, wind) is blended into the component calculations so that the risk scores reflect current conditions, not just historical averages.

**Analogy:** Imagine predicting traffic on your commute. Historical data tells you that Mondays at 8 AM are usually bad. But if there is a live traffic camera showing a major accident right now, that real-time information dramatically changes your prediction. Live data enrichment is the "traffic camera" for our wildfire model.

---

### 5.5 Step 5: Dynamic Weighting

Not all five components are equally important at all times. On a windy day, the "spread" component matters more than usual. During a drought, "fuel" and "ignition" deserve extra weight. If it has been raining recently, "containment" becomes less of a concern.

**How it works:**
1. We start with equal weights: each component gets 0.2 (20%).
2. We look at the current conditions (from the latest data row and the live API data).
3. We adjust the weights:
   - High drought code or high wind? Increase the fuel weight by 0.08.
   - Very high wind? Increase the spread weight by 0.10.
   - High temperature? Increase the ignition weight by 0.08.
   - High burn severity from satellite data? Increase the impact weight by 0.10.
   - High vegetation dryness from satellite data? Add another 0.05 to fuel.
4. We re-normalize so all five weights still add up to 1.0.

**Analogy:** A doctor evaluating a patient's overall health does not always weigh each vital sign equally. If the patient has a fever, the temperature reading becomes far more important than their blood pressure. If they are having chest pain, the heart rate takes priority. Our dynamic weighting works the same way: current conditions tell us which risk dimension to pay the most attention to.

**Where in code:** `deriveDynamicWeights()` function in `web/src/lib/ctrd.ts`

---

### 5.6 Step 6: Computing the Composite Risk Score

Once we have the five component values and their dynamic weights, we compute a single composite risk score by taking a **weighted sum**:

```
Risk = (w_ignition * ignition) + (w_spread * spread) + (w_fuel * fuel) + (w_containment * containment) + (w_impact * impact)
```

where all weights sum to 1.0.

**Example:** If the components are [ignition=0.7, spread=0.5, fuel=0.8, containment=0.6, impact=0.4] and the weights are [0.25, 0.25, 0.20, 0.15, 0.15], then:

```
Risk = (0.25 * 0.7) + (0.25 * 0.5) + (0.20 * 0.8) + (0.15 * 0.6) + (0.15 * 0.4)
     = 0.175 + 0.125 + 0.160 + 0.090 + 0.060
     = 0.610
```

The result is always between 0 (no risk) and 1 (maximum risk).

**Analogy:** Your semester GPA. Each course has a different number of credits (weights), and you multiply each grade by its credits, sum everything up, and divide by total credits. This is essentially the same operation.

**Where in code:** `analyzeRisk()` function in `web/src/lib/ctrd.ts`

---

### 5.7 Step 7: Multi-Horizon Forecasting

We do not just want to know the risk right now. We want to predict what it will be in 24 hours, in 72 hours, and in 7 days. Each of these is called a "forecast horizon."

**How it works (for each component individually):**

1. Take the last 7 data points for a given component (e.g., the last 7 days of "ignition" scores).
2. Compute the **mean** (average) of these 7 values. This is the "recent average."
3. Compute the **drift**: how much the component has been trending up or down. We calculate this as: `drift = (last_value - first_value) / 6` (the slope of the line from first to last).
4. Extrapolate into the future: `predicted = mean + (drift * horizon_scale)`
   - For 24h: horizon_scale = 1.0 (one day ahead)
   - For 72h: horizon_scale = 3.0 (three days ahead)
   - For 7 days: horizon_scale = 7.0 (seven days ahead)
5. Clamp the result to [0, 1] so it stays valid.
6. Apply the same dynamic weighting to combine the forecasted components into a predicted composite risk score.

**Analogy:** Imagine you are tracking the water level in a river. For the past week, the level has been: 2m, 2.1m, 2.3m, 2.4m, 2.5m, 2.7m, 2.8m. The average is about 2.4m, and the trend is rising by roughly 0.13m per day. So you predict: tomorrow = 2.93m, in 3 days = 3.19m, in 7 days = 3.71m. Our forecasting does the same thing, but for each wildfire risk component.

**Why is this "simple" and not a neural network?** We intentionally chose a lightweight forecasting method because:
- It runs in milliseconds inside a browser/API request (no GPU needed).
- It is easy to understand and verify (transparency for a course project).
- It performs well over short horizons (24h), which is the most operationally relevant timeframe.
- For a more advanced comparison, we note in the paper that LSTMs and Transformers could be evaluated in future work.

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

**1. Dominant Driver:** Which component is contributing the most to the risk? We look at the weighted contribution of each component (`weight * component_value`) and pick the one with the highest product. If "fuel" has weight 0.25 and value 0.9, its contribution is 0.225. If "spread" has weight 0.30 and value 0.6, its contribution is 0.18. Fuel wins, so "fuel" is the dominant driver.

**Why it matters:** Knowing the dominant driver tells you what to focus on. If fuel is dominant, you consider vegetation management. If spread is dominant, you prepare for fast-moving fires and deploy aerial resources.

**2. Top Factors:** All five components ranked from highest to lowest contribution. This gives the full picture, not just the single most important one.

**3. Change Deltas:** For each component, we compute how much it has changed since the previous timestep. A positive delta means that component's risk is increasing. A negative delta means it is decreasing.

**Example output:**
- Dominant Driver: Fuel
- Top Factors: Fuel (28%), Ignition (24%), Impact (20%), Spread (16%), Containment (12%)
- Changes: Fuel +0.05 (increasing), Spread +0.12 (increasing sharply), Containment -0.03 (decreasing slightly)

**Analogy:** A financial advisor does not just tell you "your portfolio lost 3% today." They tell you: "Tech stocks dropped 8% (dominant driver), energy was flat, and bonds gained 1%. The tech drop is accelerating compared to yesterday." That is explainability: telling you the what, the why, and the trend.

**Where in code:** `deriveExplainability()` in `web/src/lib/ml/explainability.ts`

---

## 6. Live Data Sources (The Three APIs)

### 6.1 Open-Meteo (Weather)

**What it is:** A free, open-source weather forecast API. No API key needed.

**What we fetch:** Current temperature (Celsius), relative humidity (%), wind speed (km/h), and precipitation probability (%) for a given latitude and longitude.

**How we use it:** The live weather data is blended into the risk component calculations. For example, if the historical data suggests moderate wind but the live API says winds are currently at 35 km/h, the "spread" component gets boosted.

**The endpoint:** `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,...`

**Where in code:** `web/src/lib/ingestion/weather.ts`

---

### 6.2 NASA FIRMS (Satellite Fire Detection)

**What it is:** The Fire Information for Resource Management System, operated by NASA. It uses thermal imaging from satellites (VIIRS and MODIS instruments) to detect active fires anywhere on Earth, updated multiple times per day.

**What we fetch:** A list of "hotspots" within a geographic bounding box around the target coordinates. Each hotspot includes latitude, longitude, brightness temperature, confidence level, and Fire Radiative Power (FRP).

**Key terms:**
- **Hotspot:** A single pixel from a satellite image that the algorithm has identified as containing an active fire.
- **FRP (Fire Radiative Power):** Measured in megawatts (MW). Represents how much energy the fire is releasing. A small campfire might be 1 MW. A major wildfire can exceed 1000 MW.
- **Confidence:** How certain the satellite algorithm is that the detection is a real fire and not a false alarm (e.g., a hot factory roof).
- **Bounding Box:** A rectangular area defined by four coordinates (west, south, east, north) that tells the API "give me all fire detections within this rectangle."
- **VIIRS:** Visible Infrared Imaging Radiometer Suite. A sensor on the Suomi NPP and NOAA-20 satellites. It can detect fires as small as a few hundred square meters.

**How we use it:** The count of active hotspots, average FRP, and ratio of high-confidence detections feed into the dynamic weighting system. Many nearby active fires increase the urgency of the alert.

**Where in code:** `web/src/lib/ingestion/firms.ts`

---

### 6.3 Google Earth Engine (Vegetation and Land)

**What it is:** Google Earth Engine (GEE) is a cloud-based platform that provides access to decades of satellite imagery and geospatial datasets. We use it to get information about the land and vegetation at a target location.

**What we fetch:** Three indicators:

1. **Vegetation Dryness (NDVI proxy):**
   - **NDVI** stands for Normalized Difference Vegetation Index. It measures how green and healthy vegetation is by analyzing how much red and near-infrared light a plant reflects.
   - Healthy, well-watered plants absorb red light and strongly reflect near-infrared light, giving a high NDVI (close to 1.0).
   - Dry, stressed, or dead vegetation reflects both similarly, giving a low NDVI (close to 0).
   - We invert this: high "vegetation dryness" = low NDVI = dry, fire-prone vegetation.

   **Analogy:** Looking at a lawn from above. A lush green lawn has high NDVI. A brown, parched lawn has low NDVI. Satellites can do this for every patch of land on Earth.

2. **Thermal Anomaly:**
   - The land surface temperature compared to what is normal for that location and time of year. A positive anomaly means the ground is hotter than usual, which can indicate drought stress or nearby fire activity.

3. **Burn Severity Index:**
   - Measures how badly an area has already been burned, which affects the likelihood of fire spread (recently burned areas may have less fuel, but adjacent unburned areas may be at higher risk).

**The fallback:** GEE requires a proxy server and authentication, which may not be configured in every deployment. If the GEE proxy is not available, the system uses **heuristic estimates** (educated guesses derived from the latitude, longitude, and other available data). This ensures the system always produces results, even without GEE.

**Where in code:** `web/src/lib/ingestion/gee.ts`

---

## 7. Caching

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

## 8. The Notification System

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

## 9. Model Evaluation

A machine learning system is only as good as its ability to prove that it works. We evaluate our pipeline through two methods.

### 9.1 Backtesting

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

### 9.2 Ablation Study

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

## 10. System Architecture

### 10.1 Why a Single Next.js Application?

We tried multiple architectures during development (see Section 14). The final choice is a **monolithic Next.js application** where both the frontend (what you see in the browser) and the backend (the ML pipeline, API calls, data persistence) live in one codebase and one process.

**What is Next.js?** Next.js is a React-based web framework that supports both client-side rendering (the browser runs the code) and server-side logic (API routes that run on the server). It uses a system called the "App Router" where files in the `app/` directory automatically become pages or API endpoints based on their file path.

**Why monolithic for this project?**
- One `npm install` and one `npm run dev` to get everything running.
- No need to coordinate two separate processes (e.g., a Python backend and a JavaScript frontend).
- Simpler deployment (one application to host).
- For a college course project, this eliminates an entire class of infrastructure bugs.

---

### 10.2 API Routes

Next.js lets you put files in `app/api/` and they become HTTP endpoints. Here is every API route in the project and what it does:

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/analyze` | POST | Accepts CSV data, coordinates, and horizon preferences. Runs the full CT-RD pipeline. Returns the complete analysis (risk score, alert level, forecasts, explainability, hotspots). |
| `/api/global-snapshot` | GET | Returns a summary of the global situation: number of active hotspots, critical regions, average global risk, top 5 highest-risk regions, and a live event feed. |
| `/api/sample-csv` | GET | Returns the built-in Algerian dataset as CSV text, so users do not need to upload a file to try the system. |
| `/api/watchlists` | GET/POST/PATCH | Manage saved regions that you want to monitor regularly. |
| `/api/alerts` | GET/PATCH | List all triggered alerts and acknowledge them. |
| `/api/timeline` | GET | Returns the history of past risk analyses for a region, used for the timeline chart. |
| `/api/evaluation` | GET | Runs the backtesting and ablation study on the built-in dataset. |
| `/api/stream` | GET | A Server-Sent Events (SSE) endpoint for live updates. |

---

### 10.3 File-Backed Persistence

The application needs to remember things between requests: saved watchlists, past risk analyses, and alert history. Instead of requiring a database like PostgreSQL or MongoDB, we use a simple approach: a JSON file on disk.

**How it works:**
- All data is stored in `.data/store.json` in the project directory.
- When the server needs to read data, it reads this file and parses the JSON.
- When the server needs to write data (new watchlist, new alert), it reads the file, modifies the in-memory object, and writes the whole thing back to the file.
- If the file does not exist, it creates it with empty arrays for watchlists, risk runs, and alerts.

**Why not a real database?** For a course project that runs on a developer's laptop, a JSON file is simple, requires zero setup, and is easy to inspect and debug. We note in our paper that a production system would need a proper database.

**Where in code:** `web/src/lib/store/schema.ts`, `web/src/lib/store/watchlists.ts`, `web/src/lib/store/risk-runs.ts`, `web/src/lib/store/alerts.ts`

---

### 10.4 Server-Sent Events (SSE)

**What is SSE?** Server-Sent Events is a web standard that allows a server to push real-time updates to the browser without the browser having to repeatedly ask "any updates yet?" (which is called polling).

**How it works:**
1. The browser opens a long-lived HTTP connection to `/api/stream`.
2. The server keeps this connection open and periodically sends "heartbeat" messages (every 10 seconds) to keep it alive.
3. On the client side, the dashboard listens for these events and uses them as a trigger to refresh its data.

**Analogy:** Imagine two ways to check if your pizza is ready. **Polling:** You walk to the counter every 30 seconds and ask "is it ready yet?" **SSE:** The restaurant says "sit down, I will call your name when it is ready." SSE is more efficient because the server tells you when something changes, instead of you constantly asking.

In our system, the dashboard also has a 60-second polling interval as a fallback, so even if the SSE connection drops, data still gets refreshed.

**Where in code:** `web/src/app/api/stream/route.ts`

---

## 11. The Dashboard (Frontend)

### 11.1 The D3.js World Map

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

### 11.2 The Panel System

Below the map, all information is organized into **panels**. Each panel is a compact, dark-themed container with:

- An uppercase monospace header (e.g., "RISK ANALYSIS", "ACTIVE FIRES").
- An optional count badge (e.g., "12" next to "ALERTS").
- An optional status indicator (a colored dot: green, yellow, red).
- A collapsible body that can be expanded or collapsed.
- An optional actions slot (buttons in the top-right corner).

This design is inspired by the Situation Monitor project and mimics the look of a professional operations center.

**Where in code:** `web/src/components/ui/panel.tsx`

---

### 11.3 Masonry Grid Layout

The panels are arranged in a **masonry grid**: a layout where items flow into columns, filling in gaps like bricks in a wall. This maximizes the use of screen space and avoids large empty areas.

**How it works (CSS):** We use the CSS `column-count` property combined with `break-inside: avoid` on each panel. On wide screens (1920px+), it uses 5 columns. On medium screens, 3 columns. On narrow screens, 1 column. Panels flow into columns top-to-bottom, left-to-right.

**Analogy:** Think of a Pinterest board. Instead of a rigid grid where every card is the same size, cards of different heights stack neatly into columns without wasting space. That is a masonry layout.

---

### 11.4 Dark/Light Theme Toggle

The dashboard defaults to a dark terminal theme (black backgrounds, green accents, monospace fonts) but can be switched to a light theme with a single button click.

**How it works:**
1. CSS custom properties (variables) define all colors: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`, `--accent`, etc.
2. The default values are dark theme colors.
3. When the user clicks the theme toggle, the `html` element gets a `light` class.
4. CSS rules for `html.light` override all the color variables with light theme values.
5. Because every element in the app uses these variables (not hardcoded colors), the entire UI changes instantly.

**Analogy:** Imagine a room where every light, wall color, and furniture shade can be changed by flipping a single switch. Instead of repainting, you just toggle between two "presets." CSS variables work the same way.

---

### 11.5 Settings and Preset Profiles

The dashboard has many panels, and not everyone needs all of them. The Settings modal lets you control which panels are visible.

**Three preset profiles:**

1. **Researcher:** All 11 panels visible. For someone who wants the full ML detail: evaluation metrics, ablation results, component breakdowns, everything.
2. **Operations:** Only the operationally critical panels: risk analysis, active fires, live feed, alerts, and notifications. For someone who needs to make quick decisions.
3. **Minimal:** Only the risk analysis panel. The simplest possible view.

You can also toggle individual panels on or off using checkboxes.

---

### 11.6 All Dashboard Panels Explained

1. **Risk Analysis:** The main control panel. Upload a CSV (or use the built-in dataset), enter coordinates, select a forecast horizon, and click "Run Analysis." Shows the risk score, alert level, dominant driver, recommended action, and all five component values.

2. **Active Fires:** Displays the number of fire hotspots detected by NASA FIRMS near the analyzed region, along with the average Fire Radiative Power and the confidence ratio.

3. **Live Feed:** A chronological list of recent events: analyses run, alerts triggered, system status changes.

4. **Forecasts:** Shows the predicted risk score for each horizon (24h, 72h, 7d) with confidence intervals and per-component breakdowns.

5. **Explainability:** Shows the dominant driver, top contributing factors with percentages, and change deltas (how each component shifted since the previous timestep).

6. **Alerts:** A list of all triggered alerts with severity, status (triggered/delivered/acknowledged), and timestamp.

7. **Watchlists:** Saved regions that you want to monitor repeatedly. Each entry has coordinates, a name, and an enable/disable toggle.

8. **Notifications:** Configuration for email and Telegram alert recipients.

9. **Model Evaluation:** Runs backtesting and ablation study on the built-in dataset and displays the metrics (MAE, RMSE, Precision, Recall, F1, ablation comparison).

10. **Risk Timeline:** An SVG sparkline chart showing how the risk score has changed over the last 30 timesteps, color-coded by severity (green, yellow, orange, red, crimson).

11. **Compare Regions:** Lets you pick two previously analyzed regions and compare them side by side: risk scores, alert levels, dominant drivers, and component breakdowns.

---

## 12. The Original Python Pipeline

Before the web application was built, the project existed as a Python command-line pipeline. This original code is still in the repository for reference.

**The Python modules:**

| File | Purpose |
|------|---------|
| `main.py` | The entry point. Loads data, runs the pipeline, prints results. |
| `ingestion.py` | Reads and cleans the CSV data. |
| `feature_engineering.py` | Creates the five CT-RD risk components from raw features. |
| `causal_analysis.py` | Performs Granger Causality tests to check if past values of one variable can predict future values of another. |
| `forecasting.py` | Implements three forecasting models: ARIMA, Exponential Smoothing, and Gradient Boosting. |
| `dynamic_weights.py` | Computes dynamic weights based on current conditions. |
| `alerting.py` | Maps risk scores to alert levels. |
| `visualization.py` | Creates matplotlib plots and charts. |
| `utils.py` | Helper functions shared across modules. |
| `requirements.txt` | Python package dependencies. |

**Granger Causality (from the Python version):** This is a statistical test that checks whether the past values of one time series (e.g., wind speed) help predict the future values of another time series (e.g., fire risk). If wind speed from yesterday and the day before is statistically useful for predicting today's fire risk, we say "wind speed Granger-causes fire risk." The Python pipeline includes this test; the TypeScript web version does not (it uses the dynamic weighting approach instead, which achieves a similar goal more simply).

**ARIMA (from the Python version):** Auto-Regressive Integrated Moving Average. A classical time series forecasting model that predicts future values based on:
- **AR (Auto-Regressive):** Past values of the series itself. "Tomorrow's risk depends on today's risk and yesterday's risk."
- **I (Integrated):** Differencing to make the series stationary (removing trends). "Instead of predicting the risk level, predict the change in risk level."
- **MA (Moving Average):** Past forecast errors. "Adjust the prediction based on how wrong recent predictions have been."

**Exponential Smoothing (from the Python version):** A forecasting method that gives more weight to recent observations and less to older ones. The "smoothing" factor controls how quickly old data loses influence.

**Analogy:** Think about estimating next week's temperature. ARIMA is like a detailed mathematical model that considers trends, seasonality, and error corrections. Exponential Smoothing is simpler: "take the most recent temperature and blend it with the historical average, favoring the recent data." Both work, but ARIMA is more complex and powerful.

---

## 13. Technology Stack Glossary

Every technology used in this project, explained:

| Technology | What It Is | Why We Use It |
|-----------|------------|---------------|
| **Next.js** | A React-based web framework that supports both client-side rendering and server-side API routes. Built by Vercel. | Lets us build the entire app (frontend + backend) in one codebase. |
| **TypeScript** | JavaScript with static type checking. You declare what type each variable is (string, number, etc.) and the compiler catches mistakes before runtime. | Prevents bugs. If a function expects a number and you pass a string, TypeScript tells you immediately instead of crashing at runtime. |
| **React** | A JavaScript library for building user interfaces using components. Each piece of the UI (a button, a panel, the map) is a self-contained component that can be reused. | The standard for modern web UI development. |
| **D3.js** | A JavaScript library for data-driven visualization. It gives you low-level control over SVG elements, allowing you to draw custom charts, maps, and graphs. | We use it to draw the world map with complete control over styling and interactivity. |
| **TopoJSON** | A compact way to encode geographic shapes (country borders, coastlines) as JSON data. An extension of GeoJSON that reduces file size by sharing boundaries between neighboring regions. | Keeps our map data file small (~120KB for the whole world instead of megabytes). |
| **Tailwind CSS** | A utility-first CSS framework where you style elements using small, single-purpose classes directly in your HTML. | Used for some utility classes, though our main styling is through CSS custom properties. |
| **CSS Custom Properties** | Also called CSS variables. Defined once (e.g., `--bg: #0a0a0a`) and used everywhere. Changing the variable changes every element that uses it. | Powers our theme system. One variable change switches the entire app from dark to light. |
| **PapaParse** | A JavaScript library for parsing CSV files in the browser or Node.js. Handles edge cases like quoted fields, different delimiters, and malformed rows. | Parses the uploaded CSV data into a JavaScript array of objects. |
| **Nodemailer** | A Node.js library for sending emails through SMTP. | Powers the email notification system for high-severity alerts. |
| **Telegram Bot API** | An HTTP API provided by Telegram that lets bots send messages to chats and groups. | Powers the Telegram notification system. |
| **sonner** | A lightweight React toast notification library. | Shows those small pop-up notifications ("Analysis complete," "Error: CSV required") in the corner of the screen. |
| **SVG** | Scalable Vector Graphics. An XML-based format for drawing 2D graphics in the browser. Unlike images (PNG, JPG), SVGs scale to any size without losing quality. | Used for the map, the sparkline chart, and other visual elements. |
| **App Router** | Next.js's routing system where the file structure in the `app/` directory defines the pages and API endpoints. `app/page.tsx` is the homepage. `app/api/analyze/route.ts` is the `/api/analyze` endpoint. | Keeps the project organized: file structure mirrors URL structure. |
| **`dynamic()` import** | A Next.js function that lazily loads a component only on the client side, not during server-side rendering. | The D3 map uses browser APIs (`window`, `document`) that do not exist on the server. Dynamic import ensures it only loads in the browser. |
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

### Iteration 6: Final Version

**What we built:** A complete rebuild of the frontend following the Situation Monitor's design language:
- D3.js 2D equirectangular map with fire hotspots, risk zones, and weather tooltips.
- Dark terminal theme with CSS custom properties.
- Responsive masonry grid of compact panels.
- Every ML feature preserved from the TypeScript pipeline.
- Added 7 new features: timeline chart, settings presets, click-on-map coordinates, region comparison, report export, theme toggle, and SSE auto-refresh.

**The key takeaway:** Building a good ML system requires iteration across the entire stack. The model, the API, the UI, and the design language all need to work together. We went through five unsatisfactory versions before arriving at the final one. Each failure taught us something.

---

## 15. How to Run the Project

### Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anushkab16/wildfire-ctrd.git
   cd wildfire-ctrd
   ```

2. **Install dependencies:**
   ```bash
   cd web
   npm install
   ```

3. **(Optional) Configure live API keys** by creating a `.env.local` file in the `web/` directory:
   ```
   FIRMS_MAP_KEY=your_nasa_firms_key
   GEE_PROXY_URL=your_gee_proxy_url
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```
   If you skip this step, the system works fine using the built-in dataset and heuristic estimates for geospatial data.

4. **Start the application:**
   ```bash
   npm run dev
   ```

5. **Open** `http://localhost:3000` in your browser.

6. **Try it out:**
   - Click "Use Built-in Dataset" to load the Algerian dataset.
   - Enter any coordinates (e.g., 36.7, 3.2 for Algeria) or click on the map.
   - Click "Run Analysis."
   - Explore the panels: forecasts, explainability, alerts, timeline, evaluation.

### Running the Original Python Pipeline

```bash
cd ..  # back to the wildfire-ctrd root
pip install -r requirements.txt
python main.py
```

This runs the original command-line version and produces text output and matplotlib plots.

---

*Authors: Anushka Batte, Sparsh Shah, Rushabh Shah, Shrey Parekh*
*Dept. of Computer Science, MPSTME, Mumbai University*
