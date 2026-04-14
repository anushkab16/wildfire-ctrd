def compute_weights(df):
    components = ['ignition', 'spread', 'fuel', 'containment', 'impact']
    latest = df.iloc[-1]

    base = 0.10
    weights = {c: base for c in components}

    for c in components:
        val = float(latest.get(c, 0))
        weights[c] += val

    recent = df[components].tail(7)
    if len(recent) >= 2:
        trend = recent.iloc[-1] - recent.iloc[0]
        for c in components:
            delta = float(trend.get(c, 0))
            if delta > 0:
                weights[c] += delta * 0.5

    latest_raw = df.iloc[-1]
    temp = float(latest_raw.get('temperature', 0))
    wind = float(latest_raw.get('wind', 0))
    dc = float(latest_raw.get('dc', 0))
    humidity = float(latest_raw.get('humidity', 0.5))

    if temp > 0.4:
        weights['ignition'] += (temp - 0.4) * 0.3
    if humidity < 0.5:
        weights['ignition'] += (0.5 - humidity) * 0.2
    if wind > 0.3:
        weights['spread'] += (wind - 0.3) * 0.3
    if dc > 0.3:
        weights['fuel'] += (dc - 0.3) * 0.2
        weights['containment'] += (dc - 0.3) * 0.15

    total = sum(weights.values())
    for k in weights:
        weights[k] /= total

    return weights