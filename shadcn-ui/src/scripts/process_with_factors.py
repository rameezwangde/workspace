
import json, sys
import pandas as pd
import numpy as np

CSV_IN = sys.argv[1] if len(sys.argv) > 1 else "Carbon Emission.csv"
FACTORS = sys.argv[2] if len(sys.argv) > 2 else "emission_factors.json"
CSV_OUT = sys.argv[3] if len(sys.argv) > 3 else "carbon_emission_augmented.csv"
SUB_OUT = sys.argv[4] if len(sys.argv) > 4 else "subdomain_stats.csv"
CITY_OUT = sys.argv[5] if len(sys.argv) > 5 else "city_stats.csv"
COUNTRY_OUT = sys.argv[6] if len(sys.argv) > 6 else "country_stats.csv"

# Load data & factors
df = pd.read_csv(CSV_IN)
with open(FACTORS, "r") as f:
    ef = json.load(f)

# Ensure compulsory columns exist
for col in ["subdomain","city","country"]:
    if col not in df.columns:
        df[col] = np.nan

# Fill compulsory columns if missing
subdomains = ["Engineering","Finance","Sales","Operations","Student","Other"]
cities = ["Mumbai","Navi Mumbai","Delhi","Bengaluru","Chennai","Kolkata","Hyderabad","Pune","Jaipur","Ahmedabad"]
if df["subdomain"].isna().any(): df.loc[df["subdomain"].isna(), "subdomain"] = [subdomains[i % len(subdomains)] for i in range(df["subdomain"].isna().sum())]
if df["city"].isna().any(): df.loc[df["city"].isna(), "city"] = [cities[i % len(cities)] for i in range(df["city"].isna().sum())]
df["country"] = df["country"].fillna("India")

# Drop heavy-missing columns (>40% missing), but do NOT drop CarbonEmission/compulsory
thresh = 0.4 * len(df)
protected = set(["CarbonEmission","subdomain","city","country"])
to_drop = [c for c in df.columns if c not in protected and df[c].isna().sum() > thresh]
df = df.drop(columns=to_drop)

# Map categorical factors to numeric contributions
factor_cols = []
for col, mapping in ef.items():
    if col in df.columns:
        df[col] = df[col].astype(str).str.strip()
        df[col + "_factor"] = df[col].map(mapping).fillna(0.0)
        factor_cols.append(col + "_factor")

# Identify numeric contributor columns (exclude target & identifiers)
exclude_cols = set(["CarbonEmission","subdomain","city","country"])
# Also exclude original categorical text columns that have factor variants
exclude_cols.update(ef.keys())

numeric_cols = []
for c in df.columns:
    if c in exclude_cols: 
        continue
    # Coerce to numeric when possible
    s = pd.to_numeric(df[c], errors="coerce")
    if s.notna().any():
        df[c] = s.fillna(s.median(skipna=True) if s.notna().any() else 0.0)
        numeric_cols.append(c)

# Contributors = numeric_cols + factor_cols
contributors = numeric_cols + factor_cols

# Compute total_co2 and shares
df["total_co2"] = df[contributors].sum(axis=1)
for c in contributors:
    share_col = f"{c}_share"
    df[share_col] = np.where(df["total_co2"]>0, df[c]/df["total_co2"], 0.0)

# Save augmented dataset
df.to_csv(CSV_OUT, index=False)

# Aggregations
def aggregate(dfin, group_cols):
    # Basic stats: count, median total, p75 total, mean per contributor
    aggs = {"total_co2": ["count","median",lambda s: np.percentile(s,75)]}
    for c in contributors:
        aggs[c] = ["mean"]
    out = dfin.groupby(group_cols).agg(aggs)
    out.columns = [f"{a}_{b if isinstance(b,str) else 'p75'}".replace("<lambda_0>", "p75") for a,b in out.columns.to_flat_index()]
    out = out.reset_index()
    return out

sub_stats = aggregate(df, ["subdomain"])
city_stats = aggregate(df, ["country","city"])
country_stats = aggregate(df, ["country"])

sub_stats.to_csv(SUB_OUT, index=False)
city_stats.to_csv(CITY_OUT, index=False)
country_stats.to_csv(COUNTRY_OUT, index=False)

print("Processed with factors. Dropped columns:", to_drop)
