# Exercises with Solutions

Try each exercise first, then open the solution. Every solution runs on NumPy 2.5.

## Basics

**1.** Create a 1-D array of the integers 10 to 49.

??? success "Solution"

    ```python
    import numpy as np
    a = np.arange(10, 50)
    a.size            # -> 40
    ```

**2.** Create a 3×3 matrix with values 0–8.

??? success "Solution"

    ```python
    import numpy as np
    np.arange(9).reshape(3, 3)
    ```

**3.** Create a 5×5 array of zeros with 1s on the border.

??? success "Solution"

    ```python
    import numpy as np
    z = np.ones((5, 5), dtype=int)
    z[1:-1, 1:-1] = 0
    int(z.sum())      # -> 16
    ```

**4.** Reverse an array and find the indices of non-zero elements of `[1, 2, 0, 0, 4, 0]`.

??? success "Solution"

    ```python
    import numpy as np
    a = np.array([1, 2, 0, 0, 4, 0])
    a[::-1]           # -> array([0, 4, 0, 0, 2, 1])
    np.nonzero(a)[0]  # -> array([0, 1, 4])
    ```

**5.** Create an 8×8 checkerboard of 0s and 1s.

??? success "Solution"

    ```python
    import numpy as np
    board = np.indices((8, 8)).sum(axis=0) % 2
    board[:2, :4]     # -> array([[0, 1, 0, 1], [1, 0, 1, 0]])
    # alternative: np.tile([[0, 1], [1, 0]], (4, 4))
    ```

## Indexing & masks

**6.** From `x = np.arange(20)`, select the even numbers greater than 5.

??? success "Solution"

    ```python
    import numpy as np
    x = np.arange(20)
    x[(x % 2 == 0) & (x > 5)]   # -> array([ 6,  8, 10, 12, 14, 16, 18])
    ```

**7.** Replace all negative values in an array with 0 **without** a loop, and count how many were replaced.

??? success "Solution"

    ```python
    import numpy as np
    a = np.array([3, -1, 4, -5, 9, -2])
    n_neg = int((a < 0).sum())
    a[a < 0] = 0
    n_neg, a          # -> (3, array([3, 0, 4, 0, 9, 0]))
    ```

**8.** Get the diagonal and the anti-diagonal of a 4×4 matrix.

??? success "Solution"

    ```python
    import numpy as np
    m = np.arange(16).reshape(4, 4)
    np.diag(m)            # -> array([ 0,  5, 10, 15])
    np.diag(np.fliplr(m)) # -> array([ 3,  6,  9, 12])
    ```

**9.** Swap rows 0 and 2 of a matrix.

??? success "Solution"

    ```python
    import numpy as np
    m = np.arange(9).reshape(3, 3)
    m[[0, 2]] = m[[2, 0]]
    m[0]                  # -> array([6, 7, 8])
    ```

## Operations & broadcasting

**10.** Normalise each **row** of a matrix so it sums to 1.

??? success "Solution"

    ```python
    import numpy as np
    m = np.array([[1.0, 3.0], [2.0, 2.0]])
    m / m.sum(axis=1, keepdims=True)   # -> array([[0.25, 0.75], [0.5 , 0.5 ]])
    ```

**11.** Standardise each **column** of a matrix (mean 0, std 1).

??? success "Solution"

    ```python
    import numpy as np
    X = np.random.default_rng(0).normal(5, 2, size=(100, 3))
    Z = (X - X.mean(axis=0)) / X.std(axis=0)
    np.allclose(Z.mean(axis=0), 0), np.allclose(Z.std(axis=0), 1)   # -> (True, True)
    ```

**12.** Build a multiplication table 1–9 using broadcasting.

??? success "Solution"

    ```python
    import numpy as np
    t = np.arange(1, 10)[:, None] * np.arange(1, 10)
    t[6, 7]               # -> np.int64(56)   7 x 8
    ```

**13.** Compute the pairwise Euclidean distance matrix for 5 random 2-D points without loops.

??? success "Solution"

    ```python
    import numpy as np
    p = np.random.default_rng(1).random((5, 2))
    d = np.sqrt(((p[:, None, :] - p[None, :, :]) ** 2).sum(-1))
    d.shape, np.allclose(np.diag(d), 0)   # -> ((5, 5), True)
    ```

## Statistics & sorting

**14.** For a 2-D array, find the column with the highest mean and the row index of each column's maximum.

??? success "Solution"

    ```python
    import numpy as np
    m = np.array([[1, 9, 3], [4, 2, 8], [7, 5, 6]])
    int(m.mean(axis=0).argmax())   # -> 2
    m.argmax(axis=0)               # -> array([2, 0, 1])
    ```

**15.** Find the 3 largest values in an array and their indices, largest first.

??? success "Solution"

    ```python
    import numpy as np
    a = np.array([5, 1, 9, 3, 7, 8])
    idx = np.argsort(a, descending=True)[:3]
    idx, a[idx]           # -> (array([2, 5, 4]), array([9, 8, 7]))
    ```

**16.** Count the occurrences of each value in `[1, 2, 2, 3, 3, 3]` and return the most frequent value.

??? success "Solution"

    ```python
    import numpy as np
    vals, counts = np.unique([1, 2, 2, 3, 3, 3], return_counts=True)
    int(vals[counts.argmax()])     # -> 3
    ```

**17.** Fill NaNs in each column with that column's mean.

??? success "Solution"

    ```python
    import numpy as np
    X = np.array([[1.0, np.nan], [3.0, 4.0], [np.nan, 6.0]])
    col_mean = np.nanmean(X, axis=0)
    X_filled = np.where(np.isnan(X), col_mean, X)
    X_filled              # -> array([[1., 5.], [3., 4.], [2., 6.]])
    ```

## Reshaping

**18.** Convert a batch of 10 images `(10, 28, 28)` into a feature matrix `(10, 784)` and back.

??? success "Solution"

    ```python
    import numpy as np
    imgs = np.zeros((10, 28, 28))
    flat = imgs.reshape(len(imgs), -1)
    flat.shape, flat.reshape(-1, 28, 28).shape   # -> ((10, 784), (10, 28, 28))
    ```

**19.** Split an array of 10 samples into 3 nearly equal folds (k-fold style).

??? success "Solution"

    ```python
    import numpy as np
    folds = np.array_split(np.arange(10), 3)
    [len(f) for f in folds]   # -> [4, 3, 3]
    ```

## Linear algebra & ML

**20.** Solve: `x + 2y + z = 8`, `2x + y + 3z = 13`, `x + y + z = 6`.

??? success "Solution"

    ```python
    import numpy as np
    A = np.array([[1, 2, 1], [2, 1, 3], [1, 1, 1]], dtype=float)
    b = np.array([8, 13, 6], dtype=float)
    np.linalg.solve(A, b).round(6)   # -> array([1., 2., 3.])
    ```

**21.** Implement a numerically stable softmax for a batch `(n, k)` and check rows sum to 1.

??? success "Solution"

    ```python
    import numpy as np
    def softmax(z):
        z = z - z.max(axis=1, keepdims=True)
        e = np.exp(z)
        return e / e.sum(axis=1, keepdims=True)
    p = softmax(np.array([[1000.0, 1001.0], [1.0, 1.0]]))
    np.allclose(p.sum(axis=1), 1)    # -> True
    ```

**22.** One-hot encode `[0, 2, 1]` with 3 classes, then compute accuracy of predictions `[0, 1, 1]`.

??? success "Solution"

    ```python
    import numpy as np
    y = np.array([0, 2, 1])
    Y = np.eye(3)[y]
    pred = np.array([0, 1, 1])
    float((pred == Y.argmax(axis=1)).mean())   # -> 0.6666666666666666
    ```

**23.** Fit `y = a·x + b` with `np.linalg.lstsq` on noisy data where `a = 2`, `b = -1`.

??? success "Solution"

    ```python
    import numpy as np
    rng = np.random.default_rng(3)
    x = np.linspace(0, 10, 100)
    y = 2 * x - 1 + rng.normal(0, 0.5, 100)
    A = np.column_stack([x, np.ones_like(x)])
    (a, b), *_ = np.linalg.lstsq(A, y, rcond=None)
    round(float(a)), round(float(b))   # -> (2, -1)
    ```

**24.** Compute a 3-point moving average without loops.

??? success "Solution"

    ```python
    import numpy as np
    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    np.convolve(x, np.ones(3) / 3, mode="valid")   # -> array([2., 3., 4.])
    ```

**25.** Given scores `(n_samples, n_classes)`, return the top-2 class indices per sample.

??? success "Solution"

    ```python
    import numpy as np
    s = np.array([[0.1, 0.5, 0.4], [0.7, 0.2, 0.1]])
    np.argsort(s, axis=1, descending=True)[:, :2]   # -> array([[1, 2], [0, 1]])
    ```
