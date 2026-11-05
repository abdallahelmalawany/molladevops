---
tags:
  - pandas
  - Python for ML
---

# Selecting & Filtering

All examples use this DataFrame:

```python
import pandas as pd

df = pd.DataFrame(
    {
        "name": ["Ana", "Ben", "Cy", "Dee", "Eli"],
        "team": ["ops", "ml", "ops", "ml", "data"],
        "age": [25, 32, 41, 29, 35],
        "salary": [3200, 4100, 5000, 3900, 4500],
    },
    index=["e1", "e2", "e3", "e4", "e5"],
)
```

## Columns

```python
import pandas as pd

df = pd.DataFrame({"name": ["Ana", "Ben"], "team": ["ops", "ml"], "age": [25, 32], "salary": [3200, 4100]})

df["age"]                   # one column  -> Series
df[["name", "age"]]         # list of columns -> DataFrame
type(df["age"]).__name__    # -> 'Series'
type(df[["age"]]).__name__  # -> 'DataFrame'
df.select_dtypes("number").columns.tolist()     # -> ['age', 'salary']
df.filter(like="a").columns.tolist()            # -> ['name', 'team', 'age', 'salary']
df.filter(regex="^s").columns.tolist()          # -> ['salary']
```

## `loc` (labels) and `iloc` (positions)

| | `loc` | `iloc` |
|---|---|---|
| Selects by | **Labels** (index values, column names) | **Integer positions** (0-based) |
| Slice end | **Included** | Excluded (like Python) |
| Accepts | Labels, label lists, label slices, boolean masks, callables | Integers, lists, slices, boolean arrays |

```python
import pandas as pd

df = pd.DataFrame(
    {"name": ["Ana", "Ben", "Cy", "Dee", "Eli"], "team": ["ops", "ml", "ops", "ml", "data"],
     "age": [25, 32, 41, 29, 35], "salary": [3200, 4100, 5000, 3900, 4500]},
    index=["e1", "e2", "e3", "e4", "e5"],
)

df.loc["e2", "name"]                    # -> 'Ben'          single value
df.loc["e2"].to_dict()                  # -> {'name': 'Ben', 'team': 'ml', 'age': 32, 'salary': 4100}
df.loc["e2":"e4", "age"].tolist()       # -> [32, 41, 29]   end label INCLUDED
df.loc[["e1", "e5"], ["name", "team"]].shape   # -> (2, 2)
df.loc[:, "age":"salary"].columns.tolist()     # -> ['age', 'salary']

df.iloc[0, 0]                           # -> 'Ana'
df.iloc[1:3, 2].tolist()                # -> [32, 41]       end position EXCLUDED
df.iloc[-1].name                        # -> 'e5'           last row's label
df.iloc[[0, 2], [0, 3]].values.tolist() # -> [['Ana', 3200], ['Cy', 5000]]

df.at["e3", "salary"]                   # -> np.int64(5000)  fast scalar by label
df.iat[2, 3]                            # -> np.int64(5000)  fast scalar by position
```

!!! warning "Don't chain indexers"
    `df["age"]["e2"] = 33` or `df[df.age > 30]["salary"] = 0` is **chained assignment**. In pandas 3 (Copy-on-Write) it **never modifies `df`**. Always use one indexer: `df.loc["e2", "age"] = 33`.

## Boolean filtering

```python
import pandas as pd

df = pd.DataFrame(
    {"name": ["Ana", "Ben", "Cy", "Dee", "Eli"], "team": ["ops", "ml", "ops", "ml", "data"],
     "age": [25, 32, 41, 29, 35], "salary": [3200, 4100, 5000, 3900, 4500]},
    index=["e1", "e2", "e3", "e4", "e5"],
)

df[df["age"] > 30]["name"].tolist()                          # -> ['Ben', 'Cy', 'Eli']
df.loc[(df["team"] == "ml") & (df["salary"] > 4000), "name"].tolist()   # -> ['Ben']
df.loc[(df["team"] == "data") | (df["age"] < 26), "name"].tolist()      # -> ['Ana', 'Eli']
df.loc[~df["team"].isin(["ops", "ml"]), "name"].tolist()     # -> ['Eli']
df.loc[df["age"].between(29, 35), "name"].tolist()           # -> ['Ben', 'Dee', 'Eli']
df.loc[df["name"].str.startswith("D"), "age"].tolist()       # -> [29]
df.loc[df["salary"] == df["salary"].max(), "name"].item()    # -> 'Cy'
```

Use `&`, `|`, `~` with parentheses — not `and`/`or`/`not`.

### `query` — readable string expressions

```python
import pandas as pd

df = pd.DataFrame({"name": ["Ana", "Ben", "Cy"], "team": ["ops", "ml", "ops"], "age": [25, 32, 41]})

df.query("age > 30 and team == 'ops'")["name"].tolist()      # -> ['Cy']
min_age = 30
df.query("age >= @min_age")["name"].tolist()                 # -> ['Ben', 'Cy']   @ = Python variable
df.query("team in ['ml', 'data']")["name"].tolist()          # -> ['Ben']
```

### `pd.col()` expressions (pandas 3.0+)

`pd.col("name")` refers to a column of the DataFrame being operated on — no lambdas, no repeating the DataFrame variable (great in method chains).

```python
import pandas as pd

df = pd.DataFrame({"name": ["Ana", "Ben", "Cy"], "age": [25, 32, 41], "salary": [3200, 4100, 5000]})

df.loc[pd.col("age") > 30, "name"].tolist()                  # -> ['Ben', 'Cy']
df.assign(monthly=pd.col("salary") / 12)["monthly"].round(1).tolist()   # -> [266.7, 341.7, 416.7]

# pandas 3.1: select columns and filter rows with expressions
df.select("name", age_months=pd.col("age") * 12).columns.tolist()   # -> ['name', 'age_months']
df.filter(pd.col("salary") >= 4100)["name"].tolist()          # -> ['Ben', 'Cy']
```

## `where`, `mask`, and conditional values

```python
import pandas as pd
import numpy as np

s = pd.Series([5, -2, 8, -1])
s.where(s > 0).tolist()            # -> [5.0, nan, 8.0, nan]   keep where True, else NaN
s.where(s > 0, 0).tolist()         # -> [5, 0, 8, 0]
s.mask(s > 0, 0).tolist()          # -> [0, -2, 0, -1]          replace where True
s.clip(lower=0).tolist()           # -> [5, 0, 8, 0]

df = pd.DataFrame({"score": [45, 72, 88]})
df["grade"] = np.select([df["score"] >= 85, df["score"] >= 60], ["A", "B"], default="C")
df["grade"].tolist()               # -> ['C', 'B', 'A']
df["pass"] = np.where(df["score"] >= 60, "yes", "no")
df["pass"].tolist()                # -> ['no', 'yes', 'yes']
```

## Setting values

```python
import pandas as pd

df = pd.DataFrame({"name": ["Ana", "Ben", "Cy"], "age": [25, 32, 41], "salary": [3200, 4100, 5000]})

df["bonus"] = df["salary"] * 0.1                      # new column
df.loc[df["age"] > 30, "salary"] = 6000               # conditional update (one indexer!)
df.loc[0, "name"] = "Anna"                            # single cell
df.insert(1, "id", [101, 102, 103])                   # insert at position
df.columns.tolist()                                   # -> ['name', 'id', 'age', 'salary', 'bonus']
df["salary"].tolist()                                 # -> [3200, 6000, 6000]
```

## Sampling rows

```python
import pandas as pd

df = pd.DataFrame({"x": range(100)})
df.sample(n=5, random_state=42).shape          # -> (5, 1)
len(df.sample(frac=0.2, random_state=42))      # -> 20
df.nlargest(3, "x")["x"].tolist()              # -> [99, 98, 97]
df.nsmallest(2, "x")["x"].tolist()             # -> [0, 1]
```

## Quick recap

- [x] `df["col"]` → Series, `df[["a", "b"]]` → DataFrame.
- [x] `loc` = labels (end included), `iloc` = positions (end excluded), `at`/`iat` for scalars.
- [x] Boolean masks with `& | ~`, `isin`, `between`, `.str` methods; `query("...")` with `@var`.
- [x] `pd.col("x")` expressions in `loc`, `assign`, `select`, `filter` (pandas 3.x).
- [x] Set values with a **single** `loc` call — chained assignment does nothing in pandas 3.
