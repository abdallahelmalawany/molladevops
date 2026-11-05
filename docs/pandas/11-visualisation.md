---
tags:
  - pandas
  - Python for ML
---

# Visualisation & Styling

## Plotting with `.plot`

pandas wraps **Matplotlib**: `df.plot(...)` / `series.plot(...)` returns a Matplotlib `Axes`.

```python
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")                      # headless backend (scripts/CI); omit in Jupyter
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
df = pd.DataFrame(
    {"revenue": rng.normal(100, 10, 12).cumsum(), "cost": rng.normal(80, 8, 12).cumsum()},
    index=pd.date_range("2026-01-01", periods=12, freq="MS"),
)

ax = df.plot(title="Revenue vs cost", ylabel="EGP", figsize=(8, 4))   # line chart
type(ax).__name__                          # -> 'Axes'
plt.savefig("revenue.png", dpi=120, bbox_inches="tight")
plt.close("all")
```

| Kind | Call | Use |
|---|---|---|
| Line | `df.plot()` / `kind="line"` | Trends over time |
| Bar | `df.plot.bar()`, `df.plot.barh()` | Compare categories |
| Stacked bar | `df.plot.bar(stacked=True)` | Composition |
| Histogram | `s.plot.hist(bins=20)` | Distribution |
| Box | `df.plot.box()` | Spread & outliers |
| KDE | `s.plot.kde()` | Smoothed distribution (needs SciPy) |
| Scatter | `df.plot.scatter(x="a", y="b", c="c")` | Relationship |
| Hexbin | `df.plot.hexbin(x="a", y="b")` | Dense scatter |
| Area | `df.plot.area()` | Cumulative composition |
| Pie | `s.plot.pie()` | Shares (use sparingly) |

```python
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
df = pd.DataFrame({"team": rng.choice(["ops", "ml", "data"], 200), "salary": rng.normal(4000, 600, 200)})

fig, axes = plt.subplots(1, 3, figsize=(12, 3))
df["salary"].plot.hist(bins=20, ax=axes[0], title="Salary distribution")
df.groupby("team")["salary"].mean().sort_values().plot.barh(ax=axes[1], title="Mean by team")
df.boxplot(column="salary", by="team", ax=axes[2])
fig.tight_layout()
fig.savefig("dashboard.png")
plt.close(fig)
len(axes)                                   # -> 3
```

Other options: `pd.plotting.scatter_matrix(df)`, `pd.plotting.autocorrelation_plot(s)`; the plotting backend can be switched to Plotly (`pd.options.plotting.backend = "plotly"`) if installed. For statistical plots, **seaborn** takes DataFrames directly.

## Display options

```python
import pandas as pd

pd.set_option("display.max_rows", 100)
pd.set_option("display.max_columns", None)       # show all columns
pd.set_option("display.precision", 3)
pd.set_option("display.float_format", "{:,.2f}".format)
pd.get_option("display.precision")               # -> 3

with pd.option_context("display.max_rows", 5):   # temporary
    pass
pd.reset_option("display.float_format")
pd.reset_option("display.precision")
pd.reset_option("display.max_rows")
pd.reset_option("display.max_columns")
```

## Styling tables (`DataFrame.style`)

The **Styler** formats tables for notebooks, HTML reports, Excel and LaTeX/Typst.

```python
import pandas as pd

df = pd.DataFrame({"team": ["ops", "ml", "data"], "revenue": [12500.5, 9800.0, 15200.25], "growth": [0.12, -0.05, 0.31]})

styled = (
    df.style
    .format({"revenue": "{:,.0f} EGP", "growth": "{:+.1%}"})
    .highlight_max(subset=["revenue"], color="lightgreen")
    .map(lambda v: "color: red" if v < 0 else "", subset=["growth"])
    .hide(axis="index")
)
html = styled.to_html()
"12,500 EGP" in html                 # -> True
"+12.0%" in html                     # -> True
```

| Styler method | Purpose |
|---|---|
| `format` | Number/date formatting per column |
| `highlight_max` / `highlight_min` / `highlight_null` | Highlight cells |
| `background_gradient` / `bar` | Heatmap colours / in-cell bars (needs Matplotlib) |
| `map` / `apply` | Custom CSS per cell / per column |
| `hide` | Hide index or columns |
| `to_html`, `to_excel`, `to_latex`, `to_typst` | Export |

## Quick recap

- [x] `df.plot(kind=...)` / `df.plot.bar()`, `.hist()`, `.box()`, `.scatter()` return Matplotlib Axes.
- [x] Use `plt.subplots` + `ax=` for dashboards; `savefig` to export.
- [x] `pd.set_option` / `option_context` for display settings.
- [x] `df.style.format().highlight_max().map()` for report-ready tables.
