# Cleaning Data

A typical cleaning pass: **inspect → fix types → handle missing values → remove duplicates → normalise text → validate**.

## Missing values

pandas uses `NaN` (floats, `str` dtype), `pd.NA` (nullable dtypes) and `NaT` (datetimes) for missing data. `None` is converted to the right marker.

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "city": ["Cairo", None, "Giza", "Cairo"],
    "temp": [31.0, np.nan, 29.5, np.nan],
    "rain": [0, 1, np.nan, 0],
})

df.isna().sum().to_dict()          # -> {'city': 1, 'temp': 2, 'rain': 1}
df.isna().any(axis=1).tolist()     # -> [False, True, True, True]   rows with any missing
df.notna().all(axis=1).sum()       # -> np.int64(1)                complete rows
round(df["temp"].isna().mean(), 2) # -> 0.5                        share missing
```

### Dropping

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({"a": [1, np.nan, 3], "b": [np.nan, np.nan, 6], "c": [7, 8, 9]})

df.dropna().index.tolist()                  # -> [2]        rows with no missing values
df.dropna(subset=["a"]).index.tolist()      # -> [0, 2]     only check column a
df.dropna(how="all", axis=1).shape          # -> (3, 3)     drop columns that are all missing
df.dropna(thresh=2).index.tolist()          # -> [0, 2]     keep rows with >= 2 non-missing
```

### Filling

```python
import pandas as pd
import numpy as np

s = pd.Series([1.0, np.nan, np.nan, 4.0, np.nan])

s.fillna(0).tolist()                 # -> [1.0, 0.0, 0.0, 4.0, 0.0]
s.fillna(s.mean()).tolist()          # -> [1.0, 2.5, 2.5, 4.0, 2.5]
s.ffill().tolist()                   # -> [1.0, 1.0, 1.0, 4.0, 4.0]   forward fill
s.bfill().tolist()                   # -> [1.0, 4.0, 4.0, 4.0, nan]   backward fill
s.ffill(limit=1).tolist()            # -> [1.0, 1.0, nan, 4.0, 4.0]
s.interpolate().tolist()             # -> [1.0, 2.0, 3.0, 4.0, 4.0]   linear

df = pd.DataFrame({"team": ["a", "a", "b", "b"], "score": [10, np.nan, 30, np.nan]})
df["score"] = df["score"].fillna(df.groupby("team")["score"].transform("mean"))
df["score"].tolist()                 # -> [10.0, 10.0, 30.0, 30.0]   fill with group mean

pd.DataFrame({"a": [np.nan], "b": [np.nan]}).fillna({"a": 0, "b": -1}).iloc[0].tolist()   # -> [0.0, -1.0]
```

!!! warning "Removed: `fillna(method=...)`"
    `df.fillna(method="ffill")` was removed in pandas 3 — use `df.ffill()` / `df.bfill()`.

## Duplicates

```python
import pandas as pd

df = pd.DataFrame({"id": [1, 2, 2, 3, 3], "val": ["a", "b", "b", "c", "d"]})

df.duplicated().tolist()                          # -> [False, False, True, False, False]
int(df.duplicated().sum())                        # -> 1
df.drop_duplicates().shape                        # -> (4, 2)
df.drop_duplicates(subset=["id"], keep="last")["val"].tolist()   # -> ['a', 'b', 'd']
df["id"].is_unique                                # -> False
```

## Renaming & dropping

```python
import pandas as pd

df = pd.DataFrame({"First Name": ["Ana"], "AGE ": [25], "tmp": [0]})

df = df.rename(columns={"First Name": "first_name"})
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")   # normalise all names
df = df.drop(columns=["tmp"])
df.columns.tolist()                               # -> ['first_name', 'age']
df.drop(index=[0]).shape                          # -> (0, 2)
```

## Replacing values

```python
import pandas as pd
import numpy as np

s = pd.Series(["yes", "no", "Y", "N", "n/a"])
s.replace({"Y": "yes", "N": "no", "n/a": np.nan}).tolist()   # -> ['yes', 'no', 'yes', 'no', nan]
s.map({"yes": 1, "no": 0}).tolist()                       # -> [1.0, 0.0, nan, nan, nan]
pd.Series([-999, 5, -999]).replace(-999, pd.NA).isna().tolist()   # -> [True, False, True]
```

`map` turns unmapped values into `NaN`; `replace` leaves them unchanged.

## Text cleaning with `.str`

```python
import pandas as pd

s = pd.Series(["  Ana Ali ", "BEN  smith", None, "cy-o'neil"])

s.str.strip().tolist()                  # -> ['Ana Ali', 'BEN  smith', nan, "cy-o'neil"]
s.str.strip().str.title().tolist()      # -> ['Ana Ali', 'Ben  Smith', nan, "Cy-O'Neil"]
s.str.lower().str.contains("smith").tolist()        # -> [False, True, False, False]   missing -> False with the str dtype
s.str.contains("smith", case=False, na=False).tolist()   # -> [False, True, False, False]
s.str.replace(r"\s+", " ", regex=True).str.strip().tolist()   # -> ['Ana Ali', 'BEN smith', nan, "cy-o'neil"]
s.str.len().tolist()                    # -> [10.0, 10.0, nan, 9.0]

emails = pd.Series(["ana@x.com", "ben@y.org"])
emails.str.split("@").str[1].tolist()   # -> ['x.com', 'y.org']
emails.str.extract(r"@(\w+)\.(\w+)").values.tolist()   # -> [['x', 'com'], ['y', 'org']]
pd.Series(["a,b", "c"]).str.split(",", expand=True).shape   # -> (2, 2)
pd.Series(["red|blue", "blue"]).str.get_dummies("|").columns.tolist()   # -> ['blue', 'red']
```

Common `.str` methods: `lower`, `upper`, `title`, `strip`, `replace`, `contains`, `startswith`, `endswith`, `match`, `extract`, `extractall`, `split`, `cat`, `pad`, `zfill`, `slice`, `len`, `isdigit`, `isascii`.

## Categorical data

```python
import pandas as pd

sizes = pd.Series(["M", "S", "L", "M", "S"])
cat = sizes.astype(pd.CategoricalDtype(["S", "M", "L"], ordered=True))

cat.cat.codes.tolist()           # -> [1, 0, 2, 1, 0]
(cat > "S").tolist()             # -> [True, False, True, True, False]   ordered comparison
cat.sort_values().tolist()       # -> ['S', 'S', 'M', 'M', 'L']
cat.value_counts(sort=False).to_dict()   # -> {'S': 2, 'M': 2, 'L': 1}
```

Use `category` for low-cardinality text (country, status, size): less memory, faster group-bys, explicit ordering.

## Outliers & validation

```python
import pandas as pd

s = pd.Series([10, 12, 11, 13, 95, 12])
q1, q3 = s.quantile([0.25, 0.75])
iqr = q3 - q1
outliers = s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)]
outliers.tolist()                         # -> [95]
s.clip(upper=s.quantile(0.95)).max() < 95 # -> np.True_    winsorise

df = pd.DataFrame({"age": [25, -3, 41], "email": ["a@x.com", "bad", "c@y.org"]})
problems = df[(~df["age"].between(0, 120)) | (~df["email"].str.contains("@"))]
problems.index.tolist()                   # -> [1]
```

For production pipelines, validate schemas with tools like **pandera** or **Great Expectations**.

## A reusable cleaning function

```python
import pandas as pd
import numpy as np

def clean(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df
        .rename(columns=lambda c: c.strip().lower().replace(" ", "_"))
        .drop_duplicates()
        .assign(
            city=lambda d: d["city"].str.strip().str.title(),
            temp=lambda d: pd.to_numeric(d["temp"], errors="coerce"),
        )
        .dropna(subset=["city"])
        .reset_index(drop=True)
    )

raw = pd.DataFrame({" City ": [" cairo", "giza ", None, " cairo"], "Temp": ["31", "x", "29", "31"]})
clean(raw).to_dict("list")    # -> {'city': ['Cairo', 'Giza'], 'temp': [31.0, nan]}
```

## Quick recap

- [x] `isna().sum()` to measure; `dropna(subset=, thresh=)` or `fillna`, `ffill`, `bfill`, `interpolate`.
- [x] `duplicated` / `drop_duplicates(subset=, keep=)`.
- [x] `rename`, `drop(columns=)`, normalise column names with `.str`.
- [x] `replace` (keeps unmatched) vs `map` (unmatched → NaN).
- [x] `.str` accessor for text; `category` for low-cardinality columns.
- [x] Wrap cleaning in a function using method chaining.
