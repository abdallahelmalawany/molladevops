# Creating Arrays

## From Python sequences

```python
import numpy as np

a = np.array([1, 2, 3])                 # 1-D
b = np.array([[1, 2, 3], [4, 5, 6]])    # 2-D, shape (2, 3)
c = np.array([1, 2, 3], dtype=np.float32)
d = np.array([[1, 2], [3, 4]], ndmin=3) # force at least 3 dims -> shape (1, 2, 2)

b.shape            # -> (2, 3)
c.dtype            # -> dtype('float32')
np.array([1, 2.5]) # -> array([1. , 2.5])   (upcast to float64)
```

`np.asarray(x)` converts **without copying** when `x` is already a matching ndarray; `np.array(x)` copies by default (`copy=None` copies only if needed).

## Filled arrays

```python
import numpy as np

np.zeros(3)                 # -> array([0., 0., 0.])
np.zeros((2, 3), dtype=int) # 2x3 of 0
np.ones((2, 2))             # -> array([[1., 1.], [1., 1.]])
np.full((2, 3), 7)          # -> array([[7, 7, 7], [7, 7, 7]])
np.empty((2, 2))            # uninitialised memory — values are garbage, fast
np.eye(3)                   # 3x3 identity matrix
np.identity(3)              # same, always square
np.diag([1, 2, 3])          # diagonal matrix from a vector

x = np.array([[1, 2], [3, 4]])
np.zeros_like(x)            # -> array([[0, 0], [0, 0]])   same shape & dtype
np.ones_like(x, dtype=float)
np.full_like(x, 9)
np.empty_like(x)
```

## Ranges and grids

```python
import numpy as np

np.arange(5)              # -> array([0, 1, 2, 3, 4])
np.arange(2, 10, 3)       # -> array([2, 5, 8])            start, stop (excluded), step
np.arange(0, 1, 0.25)     # -> array([0.  , 0.25, 0.5 , 0.75])

np.linspace(0, 1, 5)      # -> array([0.  , 0.25, 0.5 , 0.75, 1.  ])  stop INCLUDED
np.linspace(0, 1, 5, endpoint=False)  # -> array([0. , 0.2, 0.4, 0.6, 0.8])
np.logspace(0, 3, 4)      # -> array([   1.,   10.,  100., 1000.])

xs, ys = np.meshgrid(np.arange(3), np.arange(2))   # coordinate grids
xs                        # -> array([[0, 1, 2], [0, 1, 2]])
ys                        # -> array([[0, 0, 0], [1, 1, 1]])
```

!!! tip "`arange` vs `linspace`"
    Use `arange` for **integer steps**; use `linspace` when you know the **number of points** — floating-point steps in `arange` can give an unexpected length because of rounding.

## Random arrays (preview)

```python
import numpy as np

rng = np.random.default_rng(seed=42)   # modern Generator API
rng.random((2, 3))                     # uniform [0, 1)
rng.integers(0, 10, size=5)            # ints in [0, 10)
rng.normal(loc=0, scale=1, size=(3,))  # Gaussian
```

Details in [Random Numbers](09-random.md).

## From functions and other sources

```python
import numpy as np

np.fromfunction(lambda i, j: i * 10 + j, (2, 3), dtype=int)
# -> array([[ 0,  1,  2], [10, 11, 12]])

np.fromiter((x * x for x in range(5)), dtype=np.int64)
# -> array([ 0,  1,  4,  9, 16])

np.tri(3, dtype=int)        # lower-triangular ones
# -> array([[1, 0, 0], [1, 1, 0], [1, 1, 1]])

np.repeat([1, 2], 3)        # -> array([1, 1, 1, 2, 2, 2])
np.tile([1, 2], 3)          # -> array([1, 2, 1, 2, 1, 2])
```

Loading from files (`np.loadtxt`, `np.genfromtxt`, `np.load`) is covered in [File I/O](10-io-interop.md).

## Summary table

| Function | Creates |
|---|---|
| `np.array`, `np.asarray` | From lists/tuples/other arrays |
| `np.zeros`, `np.ones`, `np.full`, `np.empty` | Filled arrays of a shape |
| `*_like` versions | Same shape/dtype as another array |
| `np.eye`, `np.identity`, `np.diag` | Identity / diagonal matrices |
| `np.arange` | Evenly spaced by **step** |
| `np.linspace`, `np.logspace` | Evenly spaced by **count** (linear / log) |
| `np.meshgrid` | Coordinate matrices |
| `np.fromfunction`, `np.fromiter` | From a function / iterator |
| `rng.random`, `rng.integers`, `rng.normal` | Random values |

## Quick recap

- [x] `np.array` from lists; dtype is inferred or given with `dtype=`.
- [x] `zeros/ones/full/empty` (+ `_like`), `eye`, `diag`.
- [x] `arange(start, stop, step)` excludes stop; `linspace(start, stop, num)` includes it.
- [x] Use `np.random.default_rng()` for random arrays.
