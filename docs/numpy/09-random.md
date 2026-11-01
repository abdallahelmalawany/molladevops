# Random Numbers

## The modern API: `Generator`

```python
import numpy as np

rng = np.random.default_rng(seed=42)   # create ONE generator and pass it around

rng.random(3)                     # floats in [0.0, 1.0)
rng.random((2, 3))                # shape (2, 3)
rng.uniform(-1, 1, size=5)        # uniform in [low, high)
rng.integers(0, 10, size=5)       # ints in [0, 10)   (high excluded)
rng.integers(1, 7, size=3, endpoint=True)   # dice 1..6 inclusive
rng.normal(loc=0.0, scale=1.0, size=(2, 2)) # Gaussian
rng.standard_normal(4)
```

Same seed → same sequence (reproducible experiments):

```python
import numpy as np

a = np.random.default_rng(7).integers(0, 100, 5)
b = np.random.default_rng(7).integers(0, 100, 5)
np.array_equal(a, b)             # -> True
```

!!! warning "Legacy API"
    `np.random.seed(42)`, `np.random.rand()`, `np.random.randn()`, `np.random.randint()` use a **global** `RandomState`. They still work but are legacy: global state is hard to reproduce in parallel code and libraries. Prefer `rng = np.random.default_rng(seed)`.

    | Legacy | Modern |
    |---|---|
    | `np.random.seed(0)` | `rng = np.random.default_rng(0)` |
    | `np.random.rand(3)` | `rng.random(3)` |
    | `np.random.randn(3)` | `rng.standard_normal(3)` |
    | `np.random.randint(0, 10, 3)` | `rng.integers(0, 10, 3)` |
    | `np.random.shuffle(a)` | `rng.shuffle(a)` |

## Distributions

| Method | Distribution |
|---|---|
| `rng.normal(mu, sigma, size)` | Normal / Gaussian |
| `rng.uniform(low, high, size)` | Uniform |
| `rng.binomial(n, p, size)` | Binomial (coin flips) |
| `rng.poisson(lam, size)` | Poisson (event counts) |
| `rng.exponential(scale, size)` | Exponential (waiting times) |
| `rng.beta(a, b, size)` | Beta |
| `rng.gamma(shape, scale, size)` | Gamma |
| `rng.lognormal(mean, sigma, size)` | Log-normal |
| `rng.multivariate_normal(mean, cov, size)` | Correlated Gaussians |
| `rng.dirichlet(alpha, size)` | Dirichlet |

```python
import numpy as np

rng = np.random.default_rng(0)
heights = rng.normal(170, 10, size=10_000)
round(float(heights.mean()))      # -> 170
flips = rng.binomial(1, 0.5, size=1000)     # 0/1 coin flips
clicks = rng.poisson(3, size=7)             # events per day
```

## Sampling, shuffling, permutations

```python
import numpy as np

rng = np.random.default_rng(1)
items = np.array(["a", "b", "c", "d"])

rng.choice(items)                          # one element
rng.choice(items, size=3, replace=False)   # sample without replacement
rng.choice(items, size=5, p=[0.7, 0.1, 0.1, 0.1])   # weighted
rng.permutation(10)                        # shuffled copy of arange(10)
a = np.arange(10); rng.shuffle(a)          # shuffle in place (first axis)
rng.permuted(np.arange(6).reshape(2, 3), axis=1)    # shuffle each row independently
```

### Shuffle features and labels together

```python
import numpy as np

rng = np.random.default_rng(42)
X = np.arange(10).reshape(5, 2)
y = np.array([0, 1, 0, 1, 1])

idx = rng.permutation(len(X))
X_shuf, y_shuf = X[idx], y[idx]            # same order for both
```

## Reproducibility in practice

```python
import numpy as np

SEED = 2026
rng = np.random.default_rng(SEED)

# Independent streams for parallel workers
child_seeds = np.random.SeedSequence(SEED).spawn(4)
streams = [np.random.default_rng(s) for s in child_seeds]
```

For full ML reproducibility also seed Python's `random`, your framework (`torch.manual_seed`, `tf.random.set_seed`) and record library versions.

## Bit generators

`default_rng` uses **PCG64**. Others: `Philox`, `SFC64`, `MT19937` (Mersenne Twister, used by the legacy API):

```python
import numpy as np

rng = np.random.Generator(np.random.Philox(seed=1))
```

## Quick recap

- [x] `rng = np.random.default_rng(seed)`; methods `random`, `integers`, `normal`, `choice`, `permutation`, `shuffle`.
- [x] `integers` excludes `high` unless `endpoint=True`.
- [x] Shuffle X and y with the same permutation index.
- [x] Legacy `np.random.seed/rand/randn` → use the Generator API; `SeedSequence.spawn` for parallel streams.
