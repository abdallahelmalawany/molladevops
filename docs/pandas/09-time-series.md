# Time Series

## Parsing dates

```python
import pandas as pd

s = pd.Series(["2026-01-15", "2026-02-01", "not a date"])
dates = pd.to_datetime(s, errors="coerce")          # invalid -> NaT
dates.isna().tolist()                               # -> [False, False, True]
str(dates.dtype)                                    # -> 'datetime64[us]'   pandas 3 default resolution

pd.to_datetime("15/01/2026", format="%d/%m/%Y")     # -> Timestamp('2026-01-15 00:00:00')
pd.to_datetime(["2026-01-15 08:30"], format="ISO8601")[0].hour   # -> 8
pd.to_datetime([1_767_225_600], unit="s")[0]        # -> Timestamp('2026-01-01 00:00:00')
pd.Timestamp("2026-11-05 14:00")                    # -> Timestamp('2026-11-05 14:00:00')
```

Pass an explicit `format=` for speed and to avoid ambiguous day/month parsing. In `read_csv` use `parse_dates=[...]` and `date_format=...`.

!!! note "Resolution in pandas 3"
    Datetimes default to **microsecond** resolution (`datetime64[us]`) instead of nanoseconds. To get integer timestamps use `.dt.as_unit("s")` / `.as_unit()` rather than `astype("int64")` (values would be 1000× smaller than in pandas 2).

## The `.dt` accessor

```python
import pandas as pd

ts = pd.Series(pd.to_datetime(["2026-01-15 08:30", "2026-06-30 23:05"]))

ts.dt.year.tolist()                 # -> [2026, 2026]
ts.dt.month.tolist()                # -> [1, 6]
ts.dt.day_name().tolist()           # -> ['Thursday', 'Tuesday']
ts.dt.day_of_week.tolist()          # -> [3, 1]   Monday = 0
ts.dt.quarter.tolist()              # -> [1, 2]
ts.dt.hour.tolist()                 # -> [8, 23]
ts.dt.is_month_end.tolist()         # -> [False, True]
ts.dt.strftime("%Y-%m").tolist()    # -> ['2026-01', '2026-06']
ts.dt.floor("h").dt.minute.tolist() # -> [0, 0]
ts.dt.date.astype(str).tolist()     # -> ['2026-01-15', '2026-06-30']
ts.dt.to_period("M").astype(str).tolist()   # -> ['2026-01', '2026-06']
```

## Date ranges & frequency aliases

```python
import pandas as pd

pd.date_range("2026-01-01", periods=3, freq="D").strftime("%m-%d").tolist()   # -> ['01-01', '01-02', '01-03']
pd.date_range("2026-01-01", "2026-03-31", freq="ME").day.tolist()             # -> [31, 28, 31]   month ends
pd.date_range("2026-01-05", periods=3, freq="W-MON").day.tolist()             # -> [5, 12, 19]
pd.date_range("2026-01-01", periods=3, freq="h").hour.tolist()                # -> [0, 1, 2]
pd.bdate_range("2026-01-01", "2026-01-07").size                               # -> 5   business days
```

| Alias | Meaning | Alias | Meaning |
|---|---|---|---|
| `D` | Calendar day | `B` | Business day |
| `h` | Hour | `min` | Minute |
| `s` | Second | `ms` / `us` / `ns` | Milli/micro/nanosecond |
| `W` / `W-MON` | Weekly (anchored) | `MS` / `ME` | Month start / end |
| `QS` / `QE` | Quarter start / end | `YS` / `YE` | Year start / end |
| `BMS` / `BME` | Business month start/end | `SME` | Semi-month end |

!!! warning "Removed aliases"
    `H`, `T`, `S`, `L`, `U`, `N` → `h`, `min`, `s`, `ms`, `us`, `ns`. `M`, `Q`, `Y`/`A` (end) → **`ME`, `QE`, `YE`**. The old aliases now raise `ValueError` in pandas 3.

## DatetimeIndex: selecting by date

```python
import pandas as pd
import numpy as np

idx = pd.date_range("2026-01-01", periods=90, freq="D")
s = pd.Series(np.arange(90), index=idx)

s.loc["2026-02"].size                       # -> 28      partial string indexing (whole month)
s.loc["2026-01-10":"2026-01-12"].tolist()   # -> [9, 10, 11]   inclusive
s[s.index.day_of_week >= 5].size              # -> 26      weekends
s.first_valid_index()                       # -> Timestamp('2026-01-01 00:00:00')
s.loc[s.index.month == 3].iloc[0]           # -> np.int64(59)
```

## Resampling (change frequency)

```python
import pandas as pd
import numpy as np

idx = pd.date_range("2026-01-01", periods=6, freq="12h")
s = pd.Series([1, 2, 3, 4, 5, 6], index=idx)

s.resample("D").sum().tolist()                  # -> [3, 7, 11]      downsample: aggregate
s.resample("D").agg(["min", "max"]).values.tolist()   # -> [[1, 2], [3, 4], [5, 6]]
s.resample("6h").ffill().size                   # -> 11              upsample: fill
s.resample("6h").interpolate().iloc[1]          # -> np.float64(1.5)

daily = pd.Series(np.arange(60), index=pd.date_range("2026-01-01", periods=60, freq="D"))
daily.resample("ME").mean().round(1).tolist()   # -> [15.0, 44.5, 59.0]   Jan, Feb, 1 day of Mar
daily.resample("W-MON").sum().iloc[0]           # -> np.int64(10)   Thu 1 Jan … Mon 5 Jan
```

`df.resample("ME", on="date_col")` resamples using a column instead of the index.

## Rolling & expanding windows

```python
import pandas as pd

s = pd.Series([10, 12, 11, 15, 14, 18])

s.rolling(3).mean().round(2).tolist()       # -> [nan, nan, 11.0, 12.67, 13.33, 15.67]
s.rolling(3, min_periods=1).max().tolist()  # -> [10.0, 12.0, 12.0, 15.0, 15.0, 18.0]
s.rolling(3, center=True).mean().round(1).tolist()   # -> [nan, 11.0, 12.7, 13.3, 15.7, nan]
s.expanding().mean().round(2).tolist()      # -> [10.0, 11.0, 11.0, 12.0, 12.4, 13.33]
s.ewm(span=3).mean().round(2).iloc[-1]      # -> np.float64(15.84)   exponentially weighted

ts = pd.Series([1, 2, 3, 4], index=pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06"]))
ts.rolling("3D").sum().tolist()             # -> [1.0, 3.0, 3.0, 7.0]   time-based window
```

## Shifting, lags and returns

```python
import pandas as pd

price = pd.Series([100.0, 102.0, 99.0, 105.0], index=pd.date_range("2026-01-01", periods=4, freq="D"))

price.shift(1).tolist()                 # -> [nan, 100.0, 102.0, 99.0]   lag feature
price.pct_change().round(4).tolist()    # -> [nan, 0.02, -0.0294, 0.0606]
price.diff().tolist()                   # -> [nan, 2.0, -3.0, 6.0]
price.shift(1, freq="D").index[0]       # -> Timestamp('2026-01-02 00:00:00')   shift the index instead
```

## Time zones

```python
import pandas as pd

t = pd.Series(pd.to_datetime(["2026-07-01 12:00", "2026-12-01 12:00"]))
utc = t.dt.tz_localize("UTC")                       # attach a zone to naive times
cairo = utc.dt.tz_convert("Africa/Cairo")           # convert to another zone
cairo.dt.hour.tolist()                              # -> [15, 14]   (Cairo summer/winter offset)
str(cairo.dtype)                                    # -> 'datetime64[us, Africa/Cairo]'
pd.Timestamp("2026-11-05 09:00", tz="UTC").tz_convert("Asia/Dubai").hour   # -> 13
```

pandas 3 uses the standard library **`zoneinfo`** (pytz is optional). Store times in UTC; convert for display.

## Timedeltas & periods

```python
import pandas as pd

start = pd.to_datetime(pd.Series(["2026-01-01 08:00", "2026-01-01 09:30"]))
end = pd.to_datetime(pd.Series(["2026-01-01 10:15", "2026-01-01 09:45"]))
dur = end - start
dur.dt.total_seconds().div(60).tolist()           # -> [135.0, 15.0]
(start + pd.Timedelta(days=1, hours=2)).dt.day.tolist()   # -> [2, 2]
pd.Timestamp("2026-01-31") + pd.DateOffset(months=1)      # -> Timestamp('2026-02-28 00:00:00')

p = pd.Period("2026-03", freq="M")
(p + 1).strftime("%Y-%m")                         # -> '2026-04'
p.start_time                                      # -> Timestamp('2026-03-01 00:00:00')
```

## Quick recap

- [x] `pd.to_datetime(..., format=, errors="coerce")`; default resolution is `us` in pandas 3.
- [x] `.dt` accessor for parts (`year`, `day_name`, `hour`), `strftime`, `floor`.
- [x] New aliases: `h`, `min`, `s`, `ME`, `QE`, `YE`.
- [x] DatetimeIndex supports partial-string slicing (`s.loc["2026-02"]`).
- [x] `resample` (frequency change), `rolling`/`expanding`/`ewm` (windows), `shift`/`pct_change` (lags).
- [x] `tz_localize` then `tz_convert`; store UTC.
