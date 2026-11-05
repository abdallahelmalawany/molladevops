# pandas 3 Migration

pandas **3.0** (January 2026) is the biggest change since 1.0. Most tutorials and courses still show pandas 1.x/2.x code. This page explains what changed so you can read older code and write current code.

## Release timeline

| Version | Date | Highlights |
|---|---|---|
| 2.0 | Apr 2023 | Optional PyArrow backend, non-nanosecond datetimes, `append` removed |
| 2.2 | Jan 2024 | Deprecations preparing for 3.0 (frequency aliases, `fillna(method=)`) |
| 2.3 | Jun 2025 | Warnings for upcoming 3.0 behaviour |
| **3.0** | Jan 2026 | **Copy-on-Write always on**, **`str` dtype by default**, **microsecond datetimes**, `pd.col()`, `zoneinfo`, Python ≥ 3.11 |
| **3.1** | Oct 2026 | `DataFrame.select`, `filter(cond)`, parallel `read_csv`, `inplace` deprecations |

Check your version: `python -c "import pandas; print(pandas.__version__)"`.

**Upgrade path:** upgrade to **2.3** first, fix all warnings (run your tests with `-W error::FutureWarning`), then move to 3.x.

## 1. Copy-on-Write (CoW) is the only mode

```python
import pandas as pd

df = pd.DataFrame({"a": [1, 2, 3]})
sub = df[df["a"] > 1]
sub.loc[:, "a"] = 0            # never affects df
df["a"].tolist()               # -> [1, 2, 3]

df.loc[df["a"] > 1, "a"] = 0   # correct way to change df
df["a"].tolist()               # -> [1, 0, 0]
```

- Indexing results and method results **always behave as copies**.
- **Chained assignment** (`df["a"][0] = 1`, `df[mask]["a"] = 1`) never updates the original — it emits a `ChainedAssignmentError` warning.
- `SettingWithCopyWarning` is **removed**; defensive `.copy()` calls are unnecessary.
- Many methods (`rename`, `reset_index`, `drop`, `set_index`…) are cheaper because they no longer copy eagerly.
- Methods operating "in place" on a column you pulled out (`df["a"].fillna(0, inplace=True)`) do **not** update `df` → write `df["a"] = df["a"].fillna(0)`.

## 2. Default string dtype `str`

```python
import pandas as pd

s = pd.Series(["a", "b", None])
str(s.dtype)                   # -> 'str'
s.isna().tolist()              # -> [False, False, True]
```

- Text columns are inferred as **`str`** (Arrow-backed when PyArrow is installed, otherwise NumPy object-backed) instead of `object`.
- Missing values are always `NaN`; the column can only hold strings or missing values.
- Code checking `dtype == object` for text should use `pd.api.types.is_string_dtype(s)`.
- Boolean string methods (`str.contains`, `str.startswith`) return `False` for missing values.

## 3. Datetime resolution

```python
import pandas as pd

str(pd.to_datetime(["2024-03-22 11:36"]).dtype)       # -> 'datetime64[us]'
str(pd.to_datetime([1_700_000_000], unit="s").dtype)  # -> 'datetime64[us]'
ts = pd.Series(pd.to_datetime(["2026-01-01"]))
int(ts.dt.as_unit("s").astype("int64").iloc[0])       # -> 1767225600   epoch seconds
```

- Parsed strings and numeric input default to **microseconds** (`us`) instead of nanoseconds.
- `astype("int64")` on datetimes now returns microseconds (values 1000× smaller than before) — use `.dt.as_unit("s")` / `"ms"` explicitly.
- Time zones use the standard library **`zoneinfo`**; `pytz` is optional.
- `pd.offsets.Day` now means a **calendar day** (DST-aware), not exactly 24 hours.

## 4. Removed APIs

| Removed | Use |
|---|---|
| `DataFrame.append`, `Series.append` | `pd.concat` |
| `DataFrame.applymap` | `DataFrame.map` |
| `fillna(method="ffill"/"bfill")` | `ffill()` / `bfill()` |
| Frequency aliases `H`, `T`, `S`, `L`, `U`, `N` | `h`, `min`, `s`, `ms`, `us`, `ns` |
| `M`, `Q`, `Y`, `A` (period-end offsets) | `ME`, `QE`, `YE` |
| `DataFrame.swapaxes` | `.T` / `transpose` |
| `Index.sort()` | `Index.sort_values()` |
| Python 2 / pre-1.0 pickles | Re-save with a supported version |
| `py.path` objects in I/O | `pathlib.Path` |

## 5. New deprecations (3.1)

| Deprecated | Use |
|---|---|
| `inplace=True` on `drop`, `rename`, `reset_index`, `set_index`, `sort_values`, `query`, … | Reassign: `df = df.drop(...)` |
| `Timestamp.dayofweek`, `.dt.dayofweek` | `day_of_week` |
| `read_parquet(engine="fastparquet")` | PyArrow engine |
| `mode.copy_on_write`, `mode.chained_assignment`, `future.infer_string` options | Remove — behaviour is fixed |
| `float_precision` in CSV readers | Default parser |

## 6. New features worth using

```python
import pandas as pd

df = pd.DataFrame({"first": ["Ana", "Ben"], "age": [30, 41], "salary": [3000, 4500]})

df.assign(monthly=pd.col("salary") / 12)["monthly"].tolist()     # -> [250.0, 375.0]
df.loc[pd.col("age") > 35, "first"].tolist()                     # -> ['Ben']
df.select("first", age_months=pd.col("age") * 12).columns.tolist()   # -> ['first', 'age_months']   3.1
df.filter(pd.col("salary") > 3500)["first"].tolist()             # -> ['Ben']   3.1
```

| Feature | Version |
|---|---|
| `pd.col("x")` expressions in `assign`, `loc`, getitem/setitem | 3.0 |
| `DataFrame.from_arrow` / `Series.from_arrow`, Arrow PyCapsule interface | 3.0 |
| `DataFrame.select(*cols, **named)` | 3.1 |
| `DataFrame.filter(cond)` with masks / callables / `pd.col` | 3.1 |
| Parallel `read_csv` (C engine, local files ≥ 5 MB, `mode.max_threads`) | 3.1 |
| `Rolling.nunique`, `Rolling.pipe`, `Series.str.isascii`, `Styler.to_typst` | 3.1 |

## 7. Minimum requirements

- **Python ≥ 3.11**, **NumPy ≥ 1.26** (works with NumPy 2.x).
- Recommended: **PyArrow** (fast strings, Parquet), `openpyxl` or `python-calamine` (Excel).

## Migration checklist

- [ ] Upgrade to pandas 2.3 and fix every `FutureWarning` / `DeprecationWarning`.
- [ ] Remove chained assignment → single `loc` calls.
- [ ] Remove `inplace=True` and unnecessary `.copy()` calls.
- [ ] Replace `append`, `applymap`, `fillna(method=)`, old frequency aliases.
- [ ] Check code comparing text dtypes to `object`.
- [ ] Check datetime → integer conversions (`as_unit`).
- [ ] Re-run tests and compare outputs on real data.

## Quick recap

- [x] Copy-on-Write: results act as copies; chained assignment does nothing; no `SettingWithCopyWarning`.
- [x] Default `str` dtype for text; `datetime64[us]` for dates; `zoneinfo` time zones.
- [x] Old APIs removed (`append`, `applymap`, `fillna(method=)`, `H`/`M` aliases).
- [x] New: `pd.col`, `select`, `filter(cond)`, parallel CSV reading.
