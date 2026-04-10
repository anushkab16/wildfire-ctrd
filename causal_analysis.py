import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import grangercausalitytests

def granger_matrix(df, variables, maxlag=4):
    results = pd.DataFrame(index=variables, columns=variables)

    for c1 in variables:
        for c2 in variables:
            if c1 != c2:
                test = grangercausalitytests(df[[c1, c2]].dropna(), maxlag=maxlag, verbose=False)
                p_values = [test[i+1][0]['ssr_ftest'][1] for i in range(maxlag)]
                results.loc[c1, c2] = min(p_values)
            else:
                results.loc[c1, c2] = 0

    return results.astype(float)

def plot_heatmap(matrix):
    plt.figure(figsize=(8,6))
    sns.heatmap(matrix, annot=True, cmap='coolwarm')
    plt.title("Granger Causality Heatmap")
    plt.show(block=False)