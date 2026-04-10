import pandas as pd

def load_data(file_path):
    df = pd.read_csv(file_path)

    # Clean column names
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace(r'[^a-z0-9_]', '', regex=True)
    )

    # Fix weird column names
    df = df.rename(columns={
        '_rh': 'rh',
        '_ws': 'ws',
        'rain_': 'rain',
        'classes__': 'classes'
    })

    # REMOVE duplicate header rows inside data
    df = df[df['ffmc'] != 'ffmc']

    # Convert all numeric columns properly
    numeric_cols = ['temperature','rh','ws','rain','ffmc','dmc','dc','isi','bui','fwi']
    
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Drop rows that failed conversion
    df = df.dropna()

    return df