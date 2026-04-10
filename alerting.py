def get_alert_level(score):
    if score < 0.2:
        return "GREEN"
    elif score < 0.4:
        return "YELLOW"
    elif score < 0.6:
        return "ORANGE"
    elif score < 0.8:
        return "RED"
    else:
        return "CRITICAL"

def get_action(level):
    actions = {
        "GREEN": "No action needed",
        "YELLOW": "Monitor conditions",
        "ORANGE": "Prepare response teams",
        "RED": "High alert, deploy resources",
        "CRITICAL": "Emergency evacuation possible"
    }
    return actions[level]