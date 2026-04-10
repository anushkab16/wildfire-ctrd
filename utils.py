def compute_composite(preds, weights):
    score = sum(preds[k]*weights[k] for k in preds)
    return score

def dominant_driver(preds, weights):
    contributions = {k: preds[k]*weights[k] for k in preds}
    return max(contributions, key=contributions.get)