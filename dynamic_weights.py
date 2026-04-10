def compute_weights(df):
    latest = df.iloc[-1]

    weights = {
        'ignition': 0.2,
        'spread': 0.2,
        'fuel': 0.2,
        'containment': 0.2,
        'impact': 0.2
    }

    if latest['dc'] > 0.6:
        weights['fuel'] += 0.1

    if latest['wind'] > 0.6:
        weights['spread'] += 0.1

    if latest['temperature'] > 0.6:
        weights['ignition'] += 0.1

    # Normalize
    total = sum(weights.values())
    for k in weights:
        weights[k] /= total

    return weights