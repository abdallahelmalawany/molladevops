# NumPy Cheat Sheet

```python
import numpy as np
rng = np.random.default_rng(42)
```

## Create

| Code | Result |
|---|---|
| `np.array([1, 2, 3])` | From list |
| `np.zeros((2, 3))`, `np.ones(5)`, `np.full((2, 2), 7)` | Filled |
| `np.empty((3,))` | Uninitialised |
| `np.eye(3)`, `np.diag([1, 2])` | Identity / diagonal |
| `np.arange(0, 10, 2)` | `[0 2 4 6 8]` (stop excluded) |
| `np.linspace(0, 1, 5)` | 5 points, stop included |
| `np.zeros_like(a)` | Same shape/dtype |
| `rng.random((2, 2))`, `rng.integers(0, 10, 5)`, `rng.normal(0, 1, 3)` | Random |

## Inspect

| Code | Meaning |
|---|---|
| `a.shape`, `a.ndim`, `a.size` | Dimensions, rank, element count |
| `a.dtype`, `a.itemsize`, `a.nbytes` | Type, bytes/element, total bytes |
| `a.astype(np.float32)` | Cast (copy) |
| `np.info(np.sum)`, `help(np.sum)` | Docs |

## Index

| Code | Selects |
|---|---|
| `a[0]`, `a[-1]` | First / last |
| `a[1:4]`, `a[::2]`, `a[::-1]` | Slice, step, reverse |
| `m[1, 2]`, `m[:, 0]`, `m[0, :]` | Element, column, row |
| `m[:2, 1:]` | Block |
| `a[a > 0]` | Boolean mask |
| `a[(a > 0) & (a < 5)]` | Combined mask (bitwise operators + parentheses) |
| `a[[0, 2, 4]]` | Fancy indexing |
| `np.where(c, x, y)` | Element-wise if/else |
| `a[..., 0]`, `a[:, None]` | Ellipsis, new axis |

## Reshape & combine

| Code | Effect |
|---|---|
| `a.reshape(3, -1)` | New shape (`-1` inferred) |
| `a.ravel()` / `a.flatten()` | 1-D view / copy |
| `a.T`, `np.transpose(a, (2, 0, 1))` | Transpose / permute axes |
| `np.expand_dims(a, 0)`, `np.squeeze(a)` | Add / remove size-1 axes |
| `np.concatenate([a, b], axis=0)` | Join on existing axis |
| `np.stack([a, b])` | Join on new axis |
| `np.vstack`, `np.hstack` | Rows / columns |
| `np.split(a, 3)`, `np.array_split(a, 3)` | Split |
| `np.tile(a, 2)`, `np.repeat(a, 2)` | Repeat |

## Math

| Code | Effect |
|---|---|
| `a + b`, `a * b`, `a / b`, `a ** 2` | Element-wise |
| `a @ b`, `np.matmul(a, b)` | Matrix product |
| `np.sqrt`, `np.exp`, `np.log`, `np.abs`, `np.sin` | ufuncs |
| `np.maximum(a, 0)`, `np.clip(a, 0, 1)` | ReLU, clipping |
| `np.round(a, 2)`, `np.floor`, `np.ceil`, `np.trunc` | Rounding |
| `np.isnan(a)`, `np.isclose(a, b)`, `np.allclose(a, b)` | Checks |

## Aggregate (use `axis=`, `keepdims=`)

| Code | Effect |
|---|---|
| `a.sum()`, `a.mean()`, `a.std()`, `a.var()` | Totals / stats |
| `a.min()`, `a.max()`, `a.argmin()`, `a.argmax()` | Extremes & positions |
| `np.median`, `np.percentile(a, 90)` | Robust stats |
| `np.cumsum`, `np.cumprod`, `np.diff` | Running ops |
| `np.nanmean`, `np.nansum` | Ignore NaN |
| `np.any`, `np.all`, `np.count_nonzero` | Logic |
| `np.unique(a, return_counts=True)` | Distinct values |

## Sort & search

| Code | Effect |
|---|---|
| `np.sort(a)`, `np.sort(a, descending=True)` | Sorted copy |
| `a.sort()` | In place |
| `np.argsort(a)` | Sorting indices |
| `np.partition(a, k)` | k-th element in place, O(n) |
| `np.searchsorted(sorted_a, v)` | Insertion index |
| `np.isin(a, values)` | Membership |

## Linear algebra

| Code | Effect |
|---|---|
| `np.linalg.solve(A, b)` | Solve `Ax = b` |
| `np.linalg.inv(A)`, `np.linalg.det(A)` | Inverse, determinant |
| `np.linalg.norm(v)` | L2 norm |
| `np.linalg.lstsq(X, y, rcond=None)` | Least squares |
| `np.linalg.eigh(S)`, `np.linalg.svd(M)` | Eigen / SVD |
| `np.einsum("ij,jk->ik", A, B)` | Index-notation contraction |

## Random (Generator)

| Code | Effect |
|---|---|
| `rng = np.random.default_rng(seed)` | Create generator |
| `rng.random`, `rng.uniform`, `rng.normal` | Floats |
| `rng.integers(low, high, size)` | Ints (high excluded) |
| `rng.choice(a, size, replace=False, p=...)` | Sample |
| `rng.permutation(n)`, `rng.shuffle(a)` | Shuffle |

## I/O

| Code | Effect |
|---|---|
| `np.save("a.npy", a)`, `np.load("a.npy")` | Binary single array |
| `np.savez_compressed("d.npz", x=a, y=b)` | Multiple arrays |
| `np.savetxt("a.csv", a, delimiter=",")` | Text out |
| `np.loadtxt("a.csv", delimiter=",")`, `np.genfromtxt(...)` | Text in |
| `np.load("big.npy", mmap_mode="r")` | Memory-map |
| `a.tolist()`, `x.item()` | To Python |

## Removed / renamed in NumPy 2.x

| Old | Use |
|---|---|
| `np.float_`, `np.complex_` | `np.float64`, `np.complex128` |
| `np.NaN`, `np.Inf`, `np.NINF` | `np.nan`, `np.inf`, `-np.inf` |
| `np.product`, `np.cumproduct` | `np.prod`, `np.cumprod` |
| `np.alltrue`, `np.sometrue` | `np.all`, `np.any` |
| `np.round_` | `np.round` |
| `np.trapz` | `np.trapezoid` |
| `np.in1d` | `np.isin` |
| `np.row_stack` | `np.vstack` |
| `np.array(x, copy=False)` | `np.asarray(x)` |
| `a.ptp()` | `np.ptp(a)` |
| `np.fix` | `np.trunc` |
| `a.shape = (...)` | `a = a.reshape(...)` |
| `np.random.seed`, `np.random.rand` | `np.random.default_rng(...)` |
| `np.char.*` | `np.strings.*` |
