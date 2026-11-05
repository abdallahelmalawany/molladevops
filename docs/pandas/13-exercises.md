# Exercises with Solutions

Each exercise uses small inline data so you can paste it into a notebook. All solutions run on pandas 3.1.

## Basics & selection

**1.** Create a DataFrame of 4 employees (`name`, `dept`, `salary`) and print the average salary per department.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"name": ["Ana", "Ben", "Cy", "Dee"], "dept": ["ops", "ml", "ops", "ml"],
                       "salary": [3000, 5000, 4000, 4500]})
    df.groupby("dept")["salary"].mean().to_dict()   # -> {'ml': 4750.0, 'ops': 3500.0}
    ```

**2.** Select employees in `ops` earning more than 3500, returning only `name`.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"name": ["Ana", "Ben", "Cy"], "dept": ["ops", "ml", "ops"], "salary": [3000, 5000, 4000]})
    df.loc[(df["dept"] == "ops") & (df["salary"] > 3500), "name"].tolist()   # -> ['Cy']
    # or: df.query("dept == 'ops' and salary > 3500")["name"]
    ```

**3.** Get the 2nd and 3rd rows and the last column by position.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"a": [1, 2, 3, 4], "b": [5, 6, 7, 8]})
    df.iloc[1:3, -1].tolist()    # -> [6, 7]
    ```

**4.** Give everyone in `ml` a 10% raise **without** chained assignment.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"dept": ["ops", "ml", "ml"], "salary": [3000.0, 5000.0, 4000.0]})
    df.loc[df["dept"] == "ml", "salary"] *= 1.10
    df["salary"].round(0).tolist()   # -> [3000.0, 5500.0, 4400.0]
    ```

## Cleaning

**5.** Count missing values per column and fill numeric NaNs with the column median.

??? success "Solution"

    ```python
    import pandas as pd
    import numpy as np
    df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": [np.nan, 4.0, 6.0], "c": ["x", None, "z"]})
    df.isna().sum().to_dict()                 # -> {'a': 1, 'b': 1, 'c': 1}
    num = df.select_dtypes("number").columns
    df[num] = df[num].fillna(df[num].median())
    df[["a", "b"]].values.tolist()            # -> [[1.0, 5.0], [2.0, 4.0], [3.0, 6.0]]
    ```

**6.** Normalise messy column names (`" First Name"`, `"AGE"`) to snake_case.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame(columns=[" First Name", "AGE", "Zip-Code "])
    df.columns = df.columns.str.strip().str.lower().str.replace(r"[\s-]+", "_", regex=True)
    df.columns.tolist()     # -> ['first_name', 'age', 'zip_code']
    ```

**7.** Remove duplicate orders, keeping the latest per `order_id`.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"order_id": [1, 1, 2], "ts": pd.to_datetime(["2026-01-01", "2026-01-03", "2026-01-02"]),
                       "status": ["new", "paid", "new"]})
    latest = df.sort_values("ts").drop_duplicates("order_id", keep="last")
    latest.sort_values("order_id")["status"].tolist()   # -> ['paid', 'new']
    ```

**8.** Extract the domain from email addresses and count users per domain.

??? success "Solution"

    ```python
    import pandas as pd
    s = pd.Series(["a@x.com", "b@y.org", "c@x.com"])
    s.str.split("@").str[1].value_counts().to_dict()   # -> {'x.com': 2, 'y.org': 1}
    ```

## Transform & group

**9.** Add a column with each employee's salary as a share of their department total.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"dept": ["ops", "ops", "ml"], "salary": [3000, 1000, 5000]})
    df["share"] = df["salary"] / df.groupby("dept")["salary"].transform("sum")
    df["share"].tolist()    # -> [0.75, 0.25, 1.0]
    ```

**10.** For each department: headcount, mean salary, and max salary using named aggregation.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"dept": ["ops", "ml", "ops"], "salary": [3000, 5000, 4000]})
    out = df.groupby("dept").agg(n=("salary", "size"), avg=("salary", "mean"), top=("salary", "max"))
    out.loc["ops"].tolist()   # -> [2.0, 3500.0, 4000.0]
    ```

**11.** Find the best-selling product per region.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"region": ["N", "N", "S", "S"], "product": ["a", "b", "a", "b"], "units": [5, 9, 7, 2]})
    best = df.loc[df.groupby("region")["units"].idxmax(), ["region", "product"]]
    best.values.tolist()      # -> [['N', 'b'], ['S', 'a']]
    ```

**12.** Bin ages into `young` (<30), `mid` (30–49), `senior` (50+) and count each bin.

??? success "Solution"

    ```python
    import pandas as pd
    ages = pd.Series([22, 35, 51, 29, 64, 40])
    bins = pd.cut(ages, [0, 29, 49, 120], labels=["young", "mid", "senior"])
    bins.value_counts(sort=False).to_dict()   # -> {'young': 2, 'mid': 2, 'senior': 2}
    ```

## Merge & reshape

**13.** Join orders to customers and list customers with no orders.

??? success "Solution"

    ```python
    import pandas as pd
    customers = pd.DataFrame({"id": [1, 2, 3], "name": ["Ana", "Ben", "Cy"]})
    orders = pd.DataFrame({"cust_id": [1, 1, 3], "total": [10, 20, 5]})
    m = customers.merge(orders, left_on="id", right_on="cust_id", how="left", indicator=True)
    m.loc[m["_merge"] == "left_only", "name"].tolist()   # -> ['Ben']
    ```

**14.** Convert a wide table of monthly sales to long format, then back.

??? success "Solution"

    ```python
    import pandas as pd
    wide = pd.DataFrame({"store": ["A", "B"], "jan": [1, 2], "feb": [3, 4]})
    long = wide.melt(id_vars="store", var_name="month", value_name="sales")
    len(long)                                             # -> 4
    long.pivot(index="store", columns="month", values="sales").loc["B", "feb"]   # -> np.int64(4)
    ```

**15.** Build a pivot table of total revenue by region (rows) and quarter (columns) with totals.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"region": ["N", "S", "N"], "q": ["Q1", "Q1", "Q2"], "rev": [10, 20, 30]})
    pt = df.pivot_table(index="region", columns="q", values="rev", aggfunc="sum", fill_value=0, margins=True)
    int(pt.loc["All", "All"])   # -> 60
    ```

## Time series

**16.** Resample daily sales to weekly totals (weeks ending Sunday).

??? success "Solution"

    ```python
    import pandas as pd
    s = pd.Series(range(14), index=pd.date_range("2026-01-05", periods=14, freq="D"))   # starts Monday
    s.resample("W-SUN").sum().tolist()   # -> [21, 70]
    ```

**17.** Add a 7-day rolling average and a day-over-day % change.

??? success "Solution"

    ```python
    import pandas as pd
    s = pd.Series([10, 12, 11, 13, 15, 14, 16, 18], index=pd.date_range("2026-01-01", periods=8, freq="D"))
    out = pd.DataFrame({"value": s, "ma7": s.rolling(7).mean(), "pct": s.pct_change()})
    round(out["ma7"].iloc[-1], 2)        # -> 14.14
    ```

**18.** Convert UTC timestamps to Cairo time and extract the local hour.

??? success "Solution"

    ```python
    import pandas as pd
    t = pd.Series(pd.to_datetime(["2026-01-15 10:00", "2026-07-15 10:00"])).dt.tz_localize("UTC")
    t.dt.tz_convert("Africa/Cairo").dt.hour.tolist()   # -> [12, 13]
    ```

## ML prep

**19.** One-hot encode `plan` and `country` and return the feature column names.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"plan": ["free", "pro"], "country": ["EG", "DE"], "spend": [0, 30]})
    pd.get_dummies(df, columns=["plan", "country"], dtype=int).columns.tolist()
    # -> ['spend', 'plan_free', 'plan_pro', 'country_DE', 'country_EG']
    ```

**20.** Create a lag feature (previous purchase amount) per customer.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"cust": ["a", "a", "b", "a"], "amount": [10, 20, 5, 30]})
    df["prev"] = df.groupby("cust")["amount"].shift(1)
    df["prev"].tolist()     # -> [nan, 10.0, nan, 20.0]
    ```

**21.** Split data by time: train before 2026-03-01, test from that date.

??? success "Solution"

    ```python
    import pandas as pd
    df = pd.DataFrame({"date": pd.date_range("2026-02-25", periods=6, freq="D"), "y": range(6)})
    cutoff = pd.Timestamp("2026-03-01")
    train, test = df[df["date"] < cutoff], df[df["date"] >= cutoff]
    len(train), len(test)   # -> (4, 2)
    ```

**22.** Downcast a DataFrame to save memory and report the reduction in %.

??? success "Solution"

    ```python
    import pandas as pd
    import numpy as np
    df = pd.DataFrame({"cat": np.random.default_rng(0).choice(["a", "b"], 10_000),
                       "n": np.arange(10_000), "x": np.random.default_rng(1).random(10_000)})
    before = df.memory_usage(deep=True).sum()
    small = df.astype({"cat": "category", "x": "float32"}).assign(n=lambda d: pd.to_numeric(d["n"], downcast="integer"))
    saved = 1 - small.memory_usage(deep=True).sum() / before
    saved > 0.5             # -> np.True_
    ```
