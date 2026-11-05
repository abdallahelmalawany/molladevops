---
tags:
  - pandas
  - Python for ML
---

# Series, DataFrame & dtypes

## Series

A **Series** is a 1-D labelled array: values + an **index** + a dtype + an optional name.

```python
import pandas as pd
import numpy as np

s = pd.Series([10, 20, 30])                       # default RangeIndex 0..n-1
s.index                                           # -> RangeIndex(start=0, stop=3, step=1)
s.dtype                                           # -> dtype('int64')

prices = pd.Series({"apple": 1.2, "pear": 0.8, "kiwi": 2.5}, name="price")
prices["pear"]                                    # -> np.float64(0.8)
prices.index.tolist()                             # -> ['apple', 'pear', 'kiwi']

pd.Series(5, index=["a", "b"]).tolist()           # -> [5, 5]   scalar broadcast
pd.Series(np.arange(3), index=list("xyz")).to_dict()   # -> {'x': 0, 'y': 1, 'z': 2}
```

### Label alignment

Arithmetic aligns on **index labels**, not positions — missing matches become `NaN`.

```python
import pandas as pd

a = pd.Series([1, 2, 3], index=["x", "y", "z"])
b = pd.Series([10, 20, 30], index=["y", "z", "w"])
(a + b).to_dict()       # -> {'w': nan, 'x': nan, 'y': 12.0, 'z': 23.0}
a.add(b, fill_value=0).to_dict()   # -> {'w': 30.0, 'x': 1.0, 'y': 12.0, 'z': 23.0}
```

## DataFrame

A **DataFrame** is a 2-D table: an ordered collection of columns (Series) sharing one row index.

```python
import pandas as pd
import numpy as np

# From a dict of columns (most common)
df = pd.DataFrame({
    "name": ["Ana", "Ben", "Cy", "Dee"],
    "age": [25, 32, 41, 29],
    "salary": [3200.0, 4100.0, np.nan, 3900.0],
    "team": ["ops", "ml", "ops", "ml"],
})

# From a list of dicts (rows), e.g. JSON records
rows = [{"id": 1, "ok": True}, {"id": 2, "ok": False}]
pd.DataFrame(rows).shape                          # -> (2, 2)

# From a NumPy array
arr = np.arange(6).reshape(3, 2)
pd.DataFrame(arr, columns=["a", "b"], index=["r1", "r2", "r3"]).loc["r2", "b"]   # -> np.int64(3)

# From a list of lists
pd.DataFrame([[1, "x"], [2, "y"]], columns=["n", "c"]).columns.tolist()   # -> ['n', 'c']
```

## Inspecting a DataFrame

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "name": ["Ana", "Ben", "Cy", "Dee"],
    "age": [25, 32, 41, 29],
    "salary": [3200.0, 4100.0, np.nan, 3900.0],
    "team": ["ops", "ml", "ops", "ml"],
})

df.shape                 # -> (4, 4)
len(df)                  # -> 4
df.columns.tolist()      # -> ['name', 'age', 'salary', 'team']
df.index                 # -> RangeIndex(start=0, stop=4, step=1)
df.head(2)               # first n rows (default 5); df.tail(2) for last rows
df.sample(2, random_state=0)   # random rows
df.info()                # dtypes, non-null counts, memory
df.describe()            # count/mean/std/min/quartiles/max for numeric columns
df.describe(include="all")     # also text columns (count/unique/top/freq)
df.dtypes.astype(str).to_dict()
# -> {'name': 'str', 'age': 'int64', 'salary': 'float64', 'team': 'str'}
df["team"].value_counts().to_dict()   # -> {'ops': 2, 'ml': 2}
df["team"].nunique()     # -> 2
df.isna().sum().to_dict()   # -> {'name': 0, 'age': 0, 'salary': 1, 'team': 0}
df.memory_usage(deep=True).sum() > 0   # -> np.True_
```

## dtypes

| Kind | dtype | Notes |
|---|---|---|
| Integers | `int64`, `int32`, … | NumPy; **no missing values** |
| Nullable integers | `Int64`, `Int32`, … (capital I) | Allow `pd.NA` |
| Floats | `float64`, `float32` / `Float64` | `NaN` for missing |
| Booleans | `bool` / nullable `boolean` | |
| Text | **`str`** (default in pandas 3) | Arrow-backed if PyArrow installed; missing = `NaN` |
| Categorical | `category` | Few distinct values → big memory savings |
| Datetimes | `datetime64[us]`, `datetime64[ns, UTC]` | Default resolution **microseconds** in pandas 3 |
| Timedeltas | `timedelta64[us]` | Durations |
| Periods / intervals | `period[M]`, `interval` | |
| Arrow types | `int64[pyarrow]`, `string[pyarrow]`, … | Full Arrow type system |
| Mixed / Python objects | `object` | Slowest — avoid when possible |

```python
import pandas as pd

pd.Series(["a", "b"]).dtype                     # -> <StringDtype(na_value=nan)>
str(pd.Series(["a", "b"]).dtype)                # -> 'str'
pd.Series([1, None]).dtype                      # -> dtype('float64')   int + missing -> float
pd.Series([1, None], dtype="Int64").tolist()    # -> [1, <NA>]
pd.Series([True, None], dtype="boolean").isna().tolist()   # -> [False, True]
pd.Series(["low", "high", "low"], dtype="category").cat.categories.tolist()   # -> ['high', 'low']
pd.to_datetime(pd.Series(["2026-01-01"])).dtype # -> dtype('<M8[us]')
```

### Converting types

```python
import pandas as pd

df = pd.DataFrame({"qty": ["1", "2", "x"], "price": ["1.5", "2.0", "3.25"], "flag": [1, 0, 1]})

df["price"] = df["price"].astype("float64")
df["qty"] = pd.to_numeric(df["qty"], errors="coerce")    # invalid -> NaN
df["flag"] = df["flag"].astype(bool)
df.dtypes.astype(str).to_dict()   # -> {'qty': 'float64', 'price': 'float64', 'flag': 'bool'}

df2 = df.convert_dtypes()         # best nullable dtypes (Int64, Float64, boolean, string)
str(df2["qty"].dtype)             # -> 'Int64'

df.astype({"price": "float32"}).dtypes["price"]   # -> dtype('float32')
```

Helpers: `pd.to_numeric`, `pd.to_datetime`, `pd.to_timedelta`, `Series.astype`, `DataFrame.convert_dtypes`, `pd.api.types.is_numeric_dtype`.

## Index basics

```python
import pandas as pd

df = pd.DataFrame({"id": [101, 102, 103], "score": [88, 92, 75]})

df_i = df.set_index("id")             # column -> index (returns new DataFrame)
df_i.loc[102, "score"]                # -> np.int64(92)
df_i.index.name                       # -> 'id'
df_i.reset_index().columns.tolist()   # -> ['id', 'score']   index -> column
df_i.index.is_unique                  # -> True
df.set_index("id").sort_index(ascending=False).index.tolist()   # -> [103, 102, 101]
```

Indexes can be: `RangeIndex` (default), integer/labels, `DatetimeIndex`, `CategoricalIndex`, or a `MultiIndex` (several levels — see [GroupBy](07-groupby.md#multiindex-results)).

## Columns as attributes

```python
import pandas as pd

df = pd.DataFrame({"age": [25, 32], "first name": ["Ana", "Ben"]})
df.age.tolist()                 # -> [25, 32]   attribute access works for simple names...
df["first name"].tolist()       # -> ['Ana', 'Ben']   ...but brackets always work
```

Prefer `df["col"]`: attribute access fails for names with spaces, names that clash with methods (`count`, `index`, `size`) and when creating new columns.

## Quick recap

- [x] `Series` = values + index + dtype; arithmetic **aligns on labels**.
- [x] Build DataFrames from dicts of columns, lists of records, or arrays.
- [x] Inspect with `shape`, `info()`, `describe()`, `head()`, `dtypes`, `value_counts()`, `isna().sum()`.
- [x] Default text dtype is `str`; use nullable `Int64`/`boolean`, `category`, `datetime64[us]`.
- [x] `set_index` / `reset_index`; prefer `df["col"]` over `df.col`.
