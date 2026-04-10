import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

def forecast_arima(series):
    model = ARIMA(series, order=(1,1,1)).fit()
    pred = model.forecast(1)
    return pred.iloc[0]

def forecast_exp(series):
    model = ExponentialSmoothing(series).fit()
    return model.forecast(1).iloc[0]

def forecast_gb(series):
    X = np.arange(len(series)).reshape(-1,1)
    y = series.values
    model = GradientBoostingRegressor()
    model.fit(X, y)
    return model.predict([[len(series)]])[0]

def forecast_all(df):
    preds = {}

    preds['ignition'] = forecast_arima(df['ignition'])
    preds['spread'] = forecast_arima(df['spread'])
    preds['fuel'] = forecast_arima(df['fuel'])
    preds['containment'] = forecast_exp(df['containment'])
    preds['impact'] = forecast_gb(df['impact'])

    return preds