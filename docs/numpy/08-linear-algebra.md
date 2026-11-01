# Linear Algebra

NumPy's `np.linalg` uses optimised **BLAS/LAPACK** libraries (OpenBLAS, MKL, Accelerate).

## Products

```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
v = np.array([1, 1])

A * B            # -> array([[ 5, 12], [21, 32]])   element-wise (Hadamard)
A @ B            # -> array([[19, 22], [43, 50]])   matrix product
np.matmul(A, B)  # same as @
A @ v            # -> array([3, 7])                 matrix-vector
np.dot(v, v)     # -> np.int64(2)                   dot product of vectors
np.vdot(v, v)    # -> np.int64(2)
np.inner(v, v)   # -> np.int64(2)
np.outer(v, [1, 2, 3])   # -> array([[1, 2, 3], [1, 2, 3]])
np.cross([1, 0, 0], [0, 1, 0])   # -> array([0, 0, 1])   (3-D vectors only)
np.vecdot(np.array([[1, 2], [3, 4]]), np.array([1, 1]))   # -> array([3, 7])  batched dot
np.matvec(A, v)  # -> array([3, 7])                 NumPy 2.2+
```

| Operation | Use |
|---|---|
| `*` | Element-wise |
| `@` / `np.matmul` | Matrix product; **batched** over leading axes |
| `np.dot` | Dot/matrix product (older; avoid for N-D) |
| `np.vecdot`, `np.matvec`, `np.vecmat` | Explicit batched vector/matrix ops (array-API style) |
| `np.einsum` | Any contraction with index notation |

### Shapes rule for `@`

`(n, k) @ (k, m) → (n, m)` — inner dimensions must match.

```python
import numpy as np

X = np.ones((100, 3))      # 100 samples, 3 features
w = np.ones((3, 1))        # weights
(X @ w).shape              # -> (100, 1)

batch = np.ones((8, 4, 5)) @ np.ones((8, 5, 2))   # batched matmul
batch.shape                # -> (8, 4, 2)
```

### `einsum`

```python
import numpy as np

A = np.arange(6).reshape(2, 3); B = np.arange(12).reshape(3, 4)
np.einsum("ij,jk->ik", A, B).shape   # -> (2, 4)    matrix multiply
np.einsum("ii->", np.eye(3))          # -> np.float64(3.0)   trace
np.einsum("ij->ji", A).shape          # -> (3, 2)    transpose
np.einsum("bi,bi->b", A, A)           # -> array([ 5, 50])   row-wise dot products
```

## `np.linalg` essentials

```python
import numpy as np

A = np.array([[4.0, 7.0], [2.0, 6.0]])

np.linalg.det(A)                 # -> np.float64(10.000000000000002)
A_inv = np.linalg.inv(A)
np.allclose(A @ A_inv, np.eye(2))   # -> True
np.linalg.matrix_rank(A)         # -> np.int64(2)
np.trace(A)                      # -> np.float64(10.0)
np.linalg.norm([3, 4])           # -> np.float64(5.0)     L2 norm
np.linalg.norm([3, -4], ord=1)   # -> np.float64(7.0)     L1 norm
np.linalg.norm(A, "fro")         # Frobenius norm
np.linalg.matrix_power(A, 2)     # A @ A
```

### Solving linear systems

Solve `A x = b` — **use `solve`, not `inv(A) @ b`** (faster and more accurate).

```python
import numpy as np

# 2x + y = 5 ; x + 3y = 10
A = np.array([[2.0, 1.0], [1.0, 3.0]])
b = np.array([5.0, 10.0])
x = np.linalg.solve(A, b)
x                                # -> array([1., 3.])
np.allclose(A @ x, b)            # -> True
```

### Least squares (linear regression)

```python
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 50)
y = 3.0 * x + 2.0 + rng.normal(0, 1, 50)

X = np.column_stack([x, np.ones_like(x)])         # design matrix [x, 1]
coef, residuals, rank, sv = np.linalg.lstsq(X, y, rcond=None)
slope, intercept = coef                            # ≈ 3, ≈ 2
round(float(slope))                                # -> 3

np.polyfit(x, y, deg=1)                            # same fit via polynomial helper
```

### Decompositions

```python
import numpy as np

S = np.array([[2.0, 1.0], [1.0, 2.0]])     # symmetric

vals, vecs = np.linalg.eig(S)              # general eigen-decomposition
vals_h, vecs_h = np.linalg.eigh(S)         # symmetric/Hermitian: faster, sorted, real
vals_h                                     # -> array([1., 3.])

M = np.arange(6, dtype=float).reshape(2, 3)
U, s, Vt = np.linalg.svd(M, full_matrices=False)
np.allclose(U @ np.diag(s) @ Vt, M)        # -> True

Q, R = np.linalg.qr(np.array([[1.0, 2.0], [3.0, 4.0]]))
L = np.linalg.cholesky(S)                  # S = L @ L.T for positive-definite S
np.linalg.pinv(M).shape                    # -> (3, 2)   pseudo-inverse
```

| Function | Purpose |
|---|---|
| `eig`, `eigvals` | Eigenvalues/vectors (general) |
| `eigh`, `eigvalsh` | Symmetric/Hermitian (use for covariance matrices, PCA) |
| `svd` | Singular value decomposition (PCA, low-rank approx, recommender systems) |
| `qr` | QR decomposition |
| `cholesky` | Positive-definite matrices |
| `pinv` | Pseudo-inverse (non-square / singular) |
| `cond` | Condition number (numerical stability) |

### PCA in a few lines

```python
import numpy as np

rng = np.random.default_rng(1)
X = rng.normal(size=(200, 3)) @ np.array([[3, 0, 0], [1, 1, 0], [0, 0, 0.1]])

Xc = X - X.mean(axis=0)
U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
explained = s**2 / (s**2).sum()
X2 = Xc @ Vt[:2].T          # project onto the first 2 principal components
X2.shape                    # -> (200, 2)
```

## Quick recap

- [x] `*` element-wise, `@` matrix product (batched), `einsum` for anything.
- [x] `(n,k) @ (k,m) → (n,m)`.
- [x] `np.linalg.solve` (not inv), `lstsq` for regression, `norm`, `det`, `inv`.
- [x] `eigh` for symmetric matrices, `svd` for PCA.
