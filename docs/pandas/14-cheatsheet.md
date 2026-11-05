# pandas Cheat Sheet

```python
import pandas as pd
import numpy as np
```

## Create & load

| Code | Purpose |
|---|---|
| `pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})` | From dict of columns |
| `pd.DataFrame(records)` | From list of dicts |
| `pd.Series([1, 2], index=["a", "b"], name="s")` | Series |
| `pd.read_csv(path, usecols=, dtype=, parse_dates=, na_values=)` | CSV |
| `pd.read_parquet(path, columns=, filters=)` | Parquet |
| `pd.read_excel(path, sheet_name=, engine="openpyxl")` | Excel |
| `pd.read_json(path, lines=True)`, `pd.json_normalize(data)` | JSON |
| `pd.read_sql(query, con, params=)` | SQL |
| `df.to_csv(path, index=False)`, `df.to_parquet(path)` | Write |

## Inspect

| Code | Purpose |
|---|---|
| `df.shape`, `df.dtypes`, `df.columns`, `df.index` | Structure |
| `df.head()`, `df.tail()`, `df.sample(5)` | Peek |
| `df.info()`, `df.describe(include="all")` | Summary |
| `df["c"].value_counts(normalize=True)`, `df["c"].nunique()` | Categories |
| `df.isna().sum()`, `df.duplicated().sum()` | Quality |
| `df.memory_usage(deep=True)` | Memory |

## Select

| Code | Selects |
|---|---|
| `df["a"]`, `df[["a", "b"]]` | Column(s) |
| `df.loc[row_label, col_label]` | By label (slice end included) |
| `df.iloc[0:3, 1]` | By position (end excluded) |
| `df.at[label, col]`, `df.iat[i, j]` | Single value |
| `df[df["a"] > 1]`, `df.loc[mask, "b"]` | Boolean filter |
| `df[(cond1) & (cond2)]`, `df[~df["a"].isin([...])]` | Combined filters |
| `df.query("a > 1 and b == 'x'")` | String expression (`@var` for variables) |
| `df.loc[pd.col("a") > 1]` | `pd.col` expression (3.0+) |
| `df.select("a", b2=pd.col("b") * 2)`, `df.filter(pd.col("a") > 1)` | Select / filter with expressions (3.1+) |
| `df.select_dtypes("number")`, `df.filter(regex="^x")` | Columns by type / name |
| `df.nlargest(5, "a")`, `df.nsmallest(5, "a")` | Top/bottom rows |

## Clean

| Code | Effect |
|---|---|
| `df.dropna(subset=["a"])`, `df.fillna({"a": 0})` | Missing values |
| `s.ffill()`, `s.bfill()`, `s.interpolate()` | Fill forward/backward/linear |
| `df.drop_duplicates(subset=["id"], keep="last")` | Duplicates |
| `df.rename(columns={"old": "new"})`, `df.drop(columns=["x"])` | Rename / drop |
| `df.astype({"a": "float32"})`, `pd.to_numeric(s, errors="coerce")` | Types |
| `pd.to_datetime(s, format="%Y-%m-%d")` | Dates |
| `s.replace({"a": "b"})`, `s.map(mapping)` | Replace / map |
| `s.str.strip().str.lower()`, `s.str.contains("x", na=False)` | Text |
| `s.astype("category")` | Categorical |

## Transform

| Code | Effect |
|---|---|
| `df.assign(c=pd.col("a") * 2)` | New column (chainable) |
| `df["c"] = np.where(cond, x, y)` | Conditional column |
| `s.map(func)`, `df.map(func)`, `df.apply(func, axis=1)` | Element / row functions |
| `df.sort_values(["a", "b"], ascending=[True, False])` | Sort |
| `s.rank(method="dense")` | Rank |
| `pd.cut(s, bins, labels=)`, `pd.qcut(s, q=4)` | Bin |
| `s.shift(1)`, `s.diff()`, `s.pct_change()`, `s.cumsum()` | Lags & running totals |
| `df.pipe(func, arg)` | Custom step in a chain |

## Group & aggregate

| Code | Effect |
|---|---|
| `df.groupby("k")["v"].mean()` | Group mean |
| `df.groupby("k").agg(n=("v", "size"), avg=("v", "mean"))` | Named aggregation |
| `df.groupby(["k1", "k2"], as_index=False)["v"].sum()` | Multiple keys, flat result |
| `df.groupby("k")["v"].transform("mean")` | Per-row group value |
| `df.groupby("k").filter(lambda g: len(g) > 1)` | Keep groups |
| `df.groupby("k").cumcount()` | Position in group |
| `df.pivot_table(index=, columns=, values=, aggfunc="sum", margins=True)` | Pivot table |
| `pd.crosstab(df["a"], df["b"], normalize="index")` | Frequency table |

## Combine & reshape

| Code | Effect |
|---|---|
| `pd.concat([df1, df2], ignore_index=True)` | Stack rows |
| `df1.merge(df2, on="id", how="left", validate="one_to_one")` | SQL join |
| `df1.join(df2)` | Join on index |
| `pd.merge_asof(left, right, on="time")` | Nearest-key join |
| `df.melt(id_vars="id")` | Wide → long |
| `df.pivot(index=, columns=, values=)` | Long → wide |
| `df.stack()`, `df.unstack()`, `df.T` | Reshape / transpose |
| `df.explode("list_col")` | List items → rows |
| `pd.get_dummies(df, columns=["c"], dtype=int)` | One-hot |

## Time series

| Code | Effect |
|---|---|
| `s.dt.year`, `s.dt.day_name()`, `s.dt.strftime("%Y-%m")` | Date parts |
| `pd.date_range(start, periods=, freq="D")` | Date range |
| `s.loc["2026-02"]` | Partial-string selection (DatetimeIndex) |
| `s.resample("ME").sum()` | Change frequency |
| `s.rolling(7).mean()`, `s.expanding().max()`, `s.ewm(span=7).mean()` | Windows |
| `s.dt.tz_localize("UTC").dt.tz_convert("Africa/Cairo")` | Time zones |
| `h`, `min`, `s`, `D`, `W`, `MS`, `ME`, `QE`, `YE` | Frequency aliases |

## Output & interop

| Code | Effect |
|---|---|
| `df.to_numpy()`, `s.tolist()`, `df.to_dict("records")` | To NumPy / Python |
| `df.plot(...)`, `s.plot.hist()` | Plot (Matplotlib) |
| `df.style.format(...).highlight_max()` | Styled table |
| `pd.set_option("display.max_columns", None)` | Display |

## Removed / deprecated → use instead

| Old | New |
|---|---|
| `df.append(other)` | `pd.concat([df, other])` |
| `df.applymap(f)` | `df.map(f)` |
| `df.fillna(method="ffill")` | `df.ffill()` |
| `inplace=True` | `df = df.method(...)` |
| `df["a"][0] = x` (chained) | `df.loc[0, "a"] = x` |
| `freq="H"`, `"T"`, `"S"` | `"h"`, `"min"`, `"s"` |
| `freq="M"`, `"Q"`, `"Y"`/`"A"` | `"ME"`, `"QE"`, `"YE"` |
| `.dt.dayofweek`, `Timestamp.dayofweek` | `.dt.day_of_week` |
| `df.swapaxes(0, 1)` | `df.T` |
| `object` dtype for text | default `str` dtype |
| `SettingWithCopyWarning` workarounds (`.copy()`) | Not needed (Copy-on-Write) |
