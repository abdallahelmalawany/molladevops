# Performance & Memory

## 1. Vectorise — avoid Python loops

```python
import numpy as np

x = np.random.default_rng(0).random(1_000_000)

# Slow: Python loop
def loop_square_sum(arr):
    total = 0.0
    for v in arr:
        total += v * v
    return total

# Fast: vectorised
def vec_square_sum(arr):
    return float(np.dot(arr, arr))        # or (arr * arr).sum()

np.isclose(loop_square_sum(x[:1000]), vec_square_sum(x[:1000]))   # -> np.True_
```

Typical speed-ups are **10–100×**. Think in whole-array operations: masks instead of `if`, `np.where` instead of branches, reductions instead of accumulators.

| Loop pattern | Vectorised |
|---|---|
| `for i: out[i] = a[i] + b[i]` | `a + b` |
| `if x > 0: ... else: ...` per element | `np.where(x > 0, f(x), g(x))` |
| running total | `np.cumsum` |
| count matches | `(a > t).sum()` |
| nested loops over pairs | broadcasting `a[:, None] - b[None, :]` |
| loop of matrix products | batched `@` / `einsum` |

## 2. Understand memory layout

```python
import numpy as np

a = np.zeros((1000, 1000))          # C-order (row-major) by default
a.flags["C_CONTIGUOUS"]             # -> True
a.T.flags["C_CONTIGUOUS"]           # -> False   transpose is a strided view
a.strides                           # -> (8000, 8)

b = np.ascontiguousarray(a.T)       # make contiguous copy when a library needs it
```

- Iterating/reducing along the **last axis** of a C-ordered array is cache-friendly (`a.sum(axis=1)` on rows).
- Slices with steps (`a[::2]`) and transposes are **views with strides** — no copy, but non-contiguous.

## 3. Avoid unnecessary copies

```python
import numpy as np

a = np.ones(1_000_000)

b = a * 2          # allocates a new array
a *= 2             # in place, no allocation
np.add(a, 1, out=a)

v = a[100:200]     # view — free
c = a[[1, 2, 3]]   # fancy indexing — copy
np.asarray(a) is a # -> True   no copy when already an ndarray
```

Chained expressions create temporaries: `y = a * 2 + b * 3 - c` makes several intermediate arrays. For big arrays use `out=` or tools like **numexpr**.

## 4. Choose smaller dtypes

```python
import numpy as np

n = 10_000_000
np.zeros(n, dtype=np.float64).nbytes // 1_000_000   # -> 80 (MB)
np.zeros(n, dtype=np.float32).nbytes // 1_000_000   # -> 40
np.zeros(n, dtype=np.uint8).nbytes // 1_000_000     # -> 10
```

Half the bytes ≈ half the memory bandwidth → often faster too.

## 5. Pre-allocate instead of appending

```python
import numpy as np

# Bad: O(n²) copying
out = np.array([])
for i in range(1000):
    out = np.append(out, i * i)

# Good: pre-allocate
out = np.empty(1000)
for i in range(1000):
    out[i] = i * i

# Best: vectorise
out = np.arange(1000) ** 2
```

## 6. Use the right function

| Instead of | Use | Why |
|---|---|---|
| `np.linalg.inv(A) @ b` | `np.linalg.solve(A, b)` | Faster, more accurate |
| `np.sort(a)[-k:]` | `np.partition(a, -k)[-k:]` | O(n) vs O(n log n) |
| `np.vectorize(f)` | Real ufunc expressions | `vectorize` is a Python loop |
| `eig` on symmetric matrices | `eigh` | Faster, real results |
| Python `sum(arr)` | `arr.sum()` | C loop |
| `a.astype(float)` repeatedly | Create with the right dtype once | Avoid copies |

## 7. Stride tricks: sliding windows

```python
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

x = np.arange(8)
w = sliding_window_view(x, window_shape=3)     # (6, 3) view, no copy
w[:2]                                          # -> array([[0, 1, 2], [1, 2, 3]])
w.mean(axis=1)                                 # moving average
# -> array([1., 2., 3., 4., 5., 6.])
```

## 8. Profile first

```python
import numpy as np
import timeit

a = np.random.default_rng(0).random(100_000)
t_vec = timeit.timeit(lambda: np.sqrt(a), number=100)
t_loop = timeit.timeit(lambda: [v ** 0.5 for v in a], number=5) * 20
print(f"vectorised {t_vec:.3f}s vs loop {t_loop:.3f}s for 100 runs")
```

- Jupyter: `%timeit`, `%prun`, `%memit` (memory_profiler).
- Check BLAS threads: `np.show_config()`; control with `OMP_NUM_THREADS` / `OPENBLAS_NUM_THREADS` or **threadpoolctl**.

## 9. When NumPy isn't enough

| Tool | When |
|---|---|
| **Numba** (`@njit`) | Loops that can't be vectorised — compiles Python to machine code |
| **numexpr** | Large element-wise expressions without temporaries |
| **CuPy** / **JAX** | GPU acceleration with a NumPy-like API |
| **Dask** | Arrays larger than memory / parallel chunks |
| **Cython** | Hand-written C extensions |
| Free-threaded Python (3.13t/3.14t) | NumPy 2.x supports it — true multi-threading without the GIL |

## Quick recap

- [x] Vectorise; replace loops with masks, `where`, reductions, broadcasting.
- [x] Views vs copies; in-place ops and `out=` save memory.
- [x] Smaller dtypes = less memory and bandwidth.
- [x] Pre-allocate; never `np.append` in a loop.
- [x] `solve` over `inv`, `partition` over full sort, `eigh` for symmetric.
- [x] Profile, then reach for Numba/numexpr/CuPy/Dask if needed.
