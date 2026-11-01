# NumPy 2 Migration

NumPy **2.0** (June 2024) was the first major release since 2006. Many tutorials, books and courses still use NumPy 1.x code that now fails or warns. This page lists what changed so you can read old code and write current code.

## Release timeline

| Version | Date | Highlights |
|---|---|---|
| **2.0** | Jun 2024 | Cleaned-up namespace, NEP 50 promotion rules, 64-bit default int on Windows, `numpy.strings`, `StringDType`, Array API support, new ABI |
| **2.1** | Aug 2024 | Python 3.13, preliminary free-threaded Python support |
| **2.2** | Dec 2024 | `np.matvec` / `np.vecmat`, StringDType improvements |
| **2.3** | Jun 2025 | Better free-threading & typing, Windows on ARM |
| **2.4** | Dec 2025 | `casting="same_value"`, typing/introspection improvements, Python 3.11–3.14 |
| **2.5** | Jun 2026 | `sort(..., descending=True)`, pattern matching on arrays, N-D polynomial evaluators; removed `numpy.distutils`, `np.row_stack`; Python 3.12–3.14 |

Check your version: `python -c "import numpy; print(numpy.__version__)"`.

## 1. Removed aliases & functions

| Removed | Replacement |
|---|---|
| `np.float_` | `np.float64` |
| `np.complex_`, `np.cfloat` | `np.complex128` |
| `np.longfloat` / `np.longcomplex` | `np.longdouble` / `np.clongdouble` |
| `np.string_` / `np.unicode_` | `np.bytes_` / `np.str_` |
| `np.NaN` | `np.nan` |
| `np.Inf`, `np.Infinity`, `np.infty`, `np.PINF` | `np.inf` |
| `np.NINF` | `-np.inf` |
| `np.alltrue`, `np.sometrue` | `np.all`, `np.any` |
| `np.product`, `np.cumproduct` | `np.prod`, `np.cumprod` |
| `np.round_` | `np.round` |
| `np.cast` | `np.asarray(a, dtype=...)` |
| `np.asfarray` | `np.asarray(a, dtype=float)` |
| `np.find_common_type` | `np.result_type` / `np.promote_types` |
| `np.recfromcsv`, `np.recfromtxt` | `np.genfromtxt` |
| `np.safe_eval` | `ast.literal_eval` |
| `arr.ptp()`, `arr.newbyteorder()` | `np.ptp(arr)`, `arr.view(arr.dtype.newbyteorder())` |
| `np.row_stack` (removed in 2.5) | `np.vstack` |
| `numpy.distutils` (removed in 2.5) | meson / setuptools / scikit-build |

Deprecated (replace now): `np.in1d` → `np.isin`, `np.trapz` → `np.trapezoid`, `np.fix` → `np.trunc`, `np.char.*` → `np.strings.*`, assigning `arr.shape`/`arr.dtype` → `reshape`/`view`.

Automatic fixing: the **Ruff** linter rule `NPY201` rewrites most of these.

```bash
pip install ruff
ruff check --select NPY201 --fix .
```

## 2. Type promotion — NEP 50

Python scalars (`int`, `float`, `complex`) are now **"weak"**: they adapt to the array's dtype instead of upcasting it. NumPy scalars keep their precision.

```python
import numpy as np

(np.float32(3) + 3.0).dtype                     # -> dtype('float32')   NumPy 1.x: float64
(np.array([1], dtype=np.float32) + np.float64(3)).dtype   # -> dtype('float64')
(np.array([100], dtype=np.uint8) + 200)         # -> array([44], dtype=uint8)   overflow wraps
```

!!! warning
    `np.uint8(100) + 200` can now **overflow** (or raise for out-of-range Python ints such as `np.uint8(1) + 300`). Cast explicitly when mixing small integer dtypes with large values.

## 3. `copy` keyword

```python
import numpy as np

a = np.arange(3)
np.asarray(a) is a                # -> True    copy only if needed (replaces copy=False)
b = np.array(a, copy=True)        # always copy
c = np.array(a, copy=None)        # copy only if needed
# np.array(a, copy=False) now raises ValueError if a copy would be required
```

## 4. Default integer on Windows

The default integer is now **64-bit on all 64-bit platforms** (Windows used 32-bit `long` before). `np.array([1, 2]).dtype` is `int64` everywhere.

## 5. Namespace clean-up

- `np.core` → private `np._core`; import from `np` directly.
- `np.lib` only contains submodules (`np.lib.stride_tricks`, `np.lib.npyio`, `np.lib.array_utils`…).
- Exceptions live in `numpy.exceptions` (`AxisError`, `ComplexWarning`…).
- `np.char.chararray` / `np.char.array` are deprecated → plain arrays with string dtypes.

## 6. New features worth using

| Feature | Example |
|---|---|
| `numpy.strings` ufuncs | `np.strings.upper(names)`, `np.strings.str_len(s)` |
| `StringDType` | `np.array(texts, dtype=np.dtypes.StringDType())` |
| Array API standard | `x.__array_namespace__()`, `np.vecdot`, `np.matrix_transpose`, `np.unique_values` |
| Batched matrix-vector | `np.matvec(A, v)`, `np.vecmat(v, A)` |
| Descending sort | `np.sort(a, descending=True)`, `np.argsort(a, descending=True)` (2.5) |
| Pattern matching | `match arr: case [x, y]: ...` (2.5) |
| Free-threaded Python | NumPy works on `python3.13t` / `python3.14t` |

```python
import numpy as np

match np.array([10, 20]):
    case [x, y]:
        result = int(x + y)
result                                     # -> 30
```

## 7. Pickles & compiled extensions

- NumPy 2 reads 1.26 pickles and vice versa (older versions can't read 2.x pickles).
- Packages with compiled extensions must be **rebuilt** for NumPy 2 (new ABI). If you see `ImportError: numpy.core.multiarray failed to import` or "module compiled against NumPy 1.x", upgrade the dependent package (pandas, scikit-learn, etc.) or pin `numpy<2` temporarily.

## Quick recap

- [x] Replace removed aliases (`np.float_`, `np.NaN`, `np.product`…); run `ruff --select NPY201`.
- [x] NEP 50: Python scalars don't upcast arrays; watch small-int overflow.
- [x] `np.asarray` instead of `copy=False`; default int is int64 everywhere.
- [x] Use `np.strings`, `StringDType`, `descending=True`, Array API functions.
