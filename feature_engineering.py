import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def normalize_columns(df, cols):
    scaler = MinMaxScaler()
    df[cols] = scaler.fit_transform(df[cols])
    return df

def create_components(df):
    from sklearn.preprocessing import MinMaxScaler

    # Clean column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Rename dataset columns → standard names
    df = df.rename(columns={
        'rh': 'humidity',
        'ws': 'wind'
    })

    # Check columns (debug)
    print("Columns after renaming:", df.columns.tolist())

    # Required columns
    cols = ['ffmc', 'temperature', 'humidity', 'isi', 'wind', 'dmc', 'dc', 'bui', 'fwi']

    # Normalize
    scaler = MinMaxScaler()
    df[cols] = scaler.fit_transform(df[cols])

    # Create components
    df['ignition'] = (
        0.4 * df['ffmc'] +
        0.35 * df['temperature'] +
        0.25 * (1 - df['humidity'])
    )

    df['spread'] = (
        0.6 * df['isi'] +
        0.4 * df['wind']
    )

    df['fuel'] = df[['dmc', 'dc', 'bui']].mean(axis=1)
    df['containment'] = df['dc']
    df['impact'] = df['fwi']

    return df

def add_lag_features(df, cols, lag=7):
    for col in cols:
        df[f"{col}_lag"] = df[col].shift(lag)
    return df

def convert_to_weekly(df):
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df[['year','month','day']])
        df = df.set_index('date')
        df = df.resample('W').mean()
    return df