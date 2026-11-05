# Performance & Copy-on-Write

## Copy-on-Write (CoW) — the pandas 3 memory model

In pandas 3, **every indexing result and every method result behaves like a copy**. Internally pandas shares memory and only copies when one side is modified ("copy on write").

What this means in practice:

```python
import pandas as pd

df = pd.DataFrame({"a": [1, 2, 3], "b": [10, 20, 30]})

subset = df[df["a"] > 1]
subset.loc[:, "b"] = 0          # modifies only `subset` — no SettingWithCopyWarning
df["b"].tolist()                # -> [10, 20, 30]   original untouched

col = df["a"]
col.iloc[0] = 100               # modifies the Series object only
df["a"].tolist()                # -> [1, 2, 3]

df["a"][0] = 999                # chained assignment: NEVER updates df (ChainedAssignmentError warning)  # warns
df.loc[0, "a"] = 999            # correct: one indexing call on the object you want to change
df["a"].tolist()                # -> [999, 2, 3]
```

| Before (pandas ≤ 2) | pandas 3 |
|---|---|
| Some results were views, some copies — unpredictable | Results always behave as copies |
| `SettingWithCopyWarning` | Removed |
| Defensive `.copy()` everywhere | Not needed (still fine for explicit intent) |
| Chained assignment sometimes worked | Never works (warns with `ChainedAssignmentError`) |
| Many methods copied data | Methods like `rename`, `reset_index`, `set_index`, `drop` avoid copies until needed |

## Vectorise

```python
import pandas as pd
import numpy as np
import time

df = pd.DataFrame({"a": np.random.default_rng(0).random(200_000), "b": 2.0})

t = time.perf_counter(); slow = df.apply(lambda r: r["a"] * r["b"], axis=1); t_apply = time.perf_counter() - t
t = time.perf_counter(); fast = df["a"] * df["b"]; t_vec = time.perf_counter() - t
bool(np.allclose(slow, fast))       # -> True
t_apply > t_vec                     # -> True   typically 100x+ faster
```

Speed ranking (fast → slow): **vectorised ops / built-in methods** → `.str` / `.dt` accessors → `map(dict)` → `map(func)` → `apply(axis=1)` → `iterrows()`.

Never loop with `iterrows()` for computation. If you must iterate, `itertuples()` is much faster.

## Use efficient dtypes

```python
import pandas as pd
import numpy as np

n = 100_000
rng = np.random.default_rng(0)
df = pd.DataFrame({
    "country": rng.choice(["EG", "DE", "US", "IN"], n),
    "clicks": rng.integers(0, 100, n),
    "ratio": rng.random(n),
})
before = df.memory_usage(deep=True).sum()

df["country"] = df["country"].astype("category")             # few distinct strings
df["clicks"] = pd.to_numeric(df["clicks"], downcast="unsigned")
df["ratio"] = df["ratio"].astype("float32")
after = df.memory_usage(deep=True).sum()
after < before / 3                                            # -> np.True_
df.dtypes.astype(str).to_dict()   # -> {'country': 'category', 'clicks': 'uint8', 'ratio': 'float32'}
```

| Column type | Efficient choice |
|---|---|
| Low-cardinality text | `category` |
| Free text | `str` (Arrow-backed with PyArrow) |
| Small integers | `int8`/`int16`/`uint8` (`downcast=`) |
| Floats for ML | `float32` |
| Integers with missing | `Int64` (nullable) instead of float |

Read only what you need: `pd.read_csv(..., usecols=[...], dtype={...})`, `pd.read_parquet(..., columns=[...])`.

## PyArrow-backed data

```python
import pandas as pd
from io import StringIO

csv = StringIO("id,name,score\n1,Ana,9.5\n2,Ben,\n")
df = pd.read_csv(csv, engine="pyarrow", dtype_backend="pyarrow")
df.dtypes.astype(str).to_dict()   # -> {'id': 'int64[pyarrow]', 'name': 'string[pyarrow]', 'score': 'double[pyarrow]'}
```

Arrow types support missing values in every type, are memory-efficient for strings and allow zero-copy exchange with Polars, DuckDB and Spark (`DataFrame.from_arrow`, Arrow PyCapsule interface).

## `eval` and `query` for big frames

```python
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.default_rng(1).random((100_000, 3)), columns=["a", "b", "c"])
r1 = df.eval("a + b * c")                  # uses numexpr if installed — fewer temporaries
r2 = df["a"] + df["b"] * df["c"]
bool(np.allclose(r1, r2))                  # -> True
len(df.query("a > 0.5 and b < 0.5")) > 0   # -> True
```

## Group-by tips

- Group on `category` columns with `observed=True` (only seen combinations).
- Use built-in aggregations (`"sum"`, `"mean"`) instead of Python lambdas.
- Use `transform("mean")` instead of `apply` for per-group features.
- `sort=False` skips sorting group keys when order doesn't matter.

## Bigger-than-memory & faster engines

| Tool | When |
|---|---|
| `chunksize=` in `read_csv`/`read_sql` | Stream and aggregate pieces |
| Parquet + `columns=` / `filters=` | Read only needed data |
| **DuckDB** | SQL on Parquet/CSV/DataFrames, out-of-core |
| **Polars** | Fast multi-threaded DataFrames (lazy API) |
| **Dask** / **Modin** | pandas-like API on partitions / clusters |
| **Spark** (pandas API on Spark) | Cluster scale |
| `engine="numba"` (rolling/groupby) | JIT-compiled custom functions |

## Profiling

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({"x": np.arange(1_000)})
df.info(memory_usage="deep")      # memory per DataFrame
# In Jupyter: %timeit df["x"].sum()   ·   %prun   ·   %memit (memory_profiler)
```

## Quick recap

- [x] pandas 3 = Copy-on-Write: results act like copies, no `SettingWithCopyWarning`, chained assignment does nothing.
- [x] Modify with a single `df.loc[...] = ...`.
- [x] Vectorise; avoid `apply(axis=1)` and `iterrows`.
- [x] Shrink memory with `category`, downcasting, `float32`, Arrow dtypes, `usecols`.
- [x] `eval`/`query` for large expressions; DuckDB/Polars/Dask beyond memory.
