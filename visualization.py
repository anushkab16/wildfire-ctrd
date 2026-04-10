import matplotlib.pyplot as plt

def plot_components(df):
    df[['ignition','spread','fuel','containment','impact']].plot(figsize=(10,6))
    plt.title("Component Trends")
    plt.show()

def plot_composite(df):
    plt.plot(df['composite_risk'])
    plt.title("Composite Risk Over Time")
    plt.show()