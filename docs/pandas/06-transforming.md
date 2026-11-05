# Transforming Data

## Adding & computing columns

```python
import pandas as pd

df = pd.DataFrame({"item": ["pen", "book", "bag"], "qty": [3, 1, 2], "price": [1.5, 12.0, 25.0]})

df["total"] = df["qty"] * df["price"]                         # vectorised column math
df = df.assign(
    vat=lambda d: d["total"] * 0.14,                           # callable sees the DataFrame
    total_with_vat=pd.col("total") * 1.14,                     # pandas 3 expression
)
df[["total", "vat"]].round(2).values.tolist()                 # -> [[4.5, 0.63], [12.0, 1.68], [50.0, 7.0]]
df["expensive"] = df["price"] > 10
df["expensive"].tolist()                                       # -> [False, True, True]
```

`assign` returns a **new** DataFrame — perfect for method chaining. Later keywords can use earlier ones.

## Vectorised first, then `map`/`apply`

| Need | Fastest option |
|---|---|
| Math between columns | Operators: `df["a"] * df["b"]` |
| Conditions | `np.where`, `np.select`, `Series.where`, `.clip` |
| Text | `.str` methods |
| Dates | `.dt` accessor |
| Value lookup | `Series.map(dict)` |
| Element-wise custom function | `Series.map(func)` |
| Row-wise logic across columns | `df.apply(func, axis=1)` — **slow**, last resort |
| Element-wise on whole DataFrame | `df.map(func)` |

```python
import pandas as pd

df = pd.DataFrame({"first": ["ana", "ben"], "last": ["ali", "omar"], "score": [81, 67]})

df["score"].map(lambda x: "pass" if x >= 70 else "fail").tolist()   # -> ['pass', 'fail']
df["first"].map({"ana": "A", "ben": "B"}).tolist()                  # -> ['A', 'B']
df.apply(lambda r: f"{r['first'].title()} {r['last'].title()}", axis=1).tolist()   # -> ['Ana Ali', 'Ben Omar']
(df["first"].str.title() + " " + df["last"].str.title()).tolist()   # -> ['Ana Ali', 'Ben Omar']   vectorised, faster
df[["score"]].map(lambda x: x * 2)["score"].tolist()                # -> [162, 134]
df["score"].apply(lambda x: x + 1).tolist()                         # -> [82, 68]
```

!!! warning "Removed: `DataFrame.applymap`"
    `df.applymap(f)` was removed in pandas 3 — use **`df.map(f)`**.

## Sorting & ranking

```python
import pandas as pd

df = pd.DataFrame({"name": ["Ana", "Ben", "Cy", "Dee"], "team": ["b", "a", "b", "a"], "score": [88, 92, 88, 75]})

df.sort_values("score", ascending=False)["name"].tolist()            # -> ['Ben', 'Ana', 'Cy', 'Dee']
df.sort_values(["team", "score"], ascending=[True, False])["name"].tolist()   # -> ['Ben', 'Dee', 'Ana', 'Cy']
df.sort_values("name", key=lambda s: s.str.len())["name"].tolist()   # -> ['Cy', 'Ana', 'Ben', 'Dee']
df.sort_index(ascending=False).index.tolist()                         # -> [3, 2, 1, 0]

df["score"].rank(ascending=False).tolist()                 # -> [2.5, 1.0, 2.5, 4.0]   ties averaged
df["score"].rank(ascending=False, method="dense").tolist() # -> [2.0, 1.0, 2.0, 3.0]
df["score"].rank(pct=True).round(2).tolist()               # -> [0.62, 1.0, 0.62, 0.25]
```

## Binning

```python
import pandas as pd

ages = pd.Series([5, 17, 25, 42, 67, 90])

pd.cut(ages, bins=[0, 17, 64, 120], labels=["child", "adult", "senior"]).tolist()
# -> ['child', 'child', 'adult', 'adult', 'senior', 'senior']
pd.cut(ages, bins=3).cat.categories.size     # -> 3             equal-width bins
pd.qcut(ages, q=2, labels=["low", "high"]).tolist()   # -> ['low', 'low', 'low', 'high', 'high', 'high']
```

`cut` = fixed edges/equal width; `qcut` = quantiles (equal counts).

## Window-free row operations

```python
import pandas as pd

df = pd.DataFrame({"q1": [10, 20], "q2": [30, 5], "q3": [20, 15]})

df.sum(axis=1).tolist()                    # -> [60, 40]      row totals
df.max(axis=1).tolist()                    # -> [30, 20]
df.idxmax(axis=1).tolist()                 # -> ['q2', 'q1']  column of the max
df.div(df.sum(axis=1), axis=0).round(2).values.tolist()   # -> [[0.17, 0.5, 0.33], [0.5, 0.12, 0.38]]
df.cumsum(axis=1)["q3"].tolist()           # -> [60, 40]
df.pct_change(axis=1)["q2"].round(2).tolist()   # -> [2.0, -0.75]
```

## Shifting, differences, cumulative

```python
import pandas as pd

s = pd.Series([100, 110, 99, 120])
s.shift(1).tolist()                 # -> [nan, 100.0, 110.0, 99.0]   previous value
s.diff().tolist()                   # -> [nan, 10.0, -11.0, 21.0]
s.pct_change().round(3).tolist()    # -> [nan, 0.1, -0.1, 0.212]
s.cumsum().tolist()                 # -> [100, 210, 309, 429]
s.cummax().tolist()                 # -> [100, 110, 110, 120]
```

## Method chaining & `pipe`

Write transformations as one readable pipeline instead of many temporary variables:

```python
import pandas as pd

def add_margin(df, rate):
    return df.assign(margin=df["revenue"] * rate)

raw = pd.DataFrame({
    "region": ["N", "S", "N", "E"],
    "revenue": [100, 80, 120, 60],
    "cost": [70, 50, 90, 55],
})

report = (
    raw
    .assign(profit=pd.col("revenue") - pd.col("cost"))
    .loc[pd.col("profit") > 10]
    .pipe(add_margin, rate=0.1)                 # call your own function in the chain
    .groupby("region", as_index=False)
    .agg(profit=("profit", "sum"), margin=("margin", "sum"))
    .sort_values("profit", ascending=False)
    .reset_index(drop=True)
)
report.to_dict("list")      # -> {'region': ['N', 'S'], 'profit': [60, 30], 'margin': [22.0, 8.0]}
```

!!! tip "Avoid `inplace=True`"
    `inplace=True` is **deprecated** on many methods in pandas 3.1 (`drop`, `rename`, `sort_values`, `reset_index`, `set_index`, `query`…). It rarely saved memory anyway. Reassign instead: `df = df.drop(columns="x")`.

## Quick recap

- [x] Vectorised column math; `assign` (+ `pd.col`) for chainable new columns.
- [x] `map` for lookups/element-wise, `apply(axis=1)` only as a last resort; `df.map` replaces `applymap`.
- [x] `sort_values(by, ascending, key)`, `rank(method=)`.
- [x] `cut` (fixed bins) vs `qcut` (quantiles).
- [x] `shift`, `diff`, `pct_change`, `cumsum`; row-wise with `axis=1`.
- [x] Chain with `assign`, `loc`, `pipe`; don't use `inplace=True`.
