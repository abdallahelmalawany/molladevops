# NumPy for Machine Learning

How everyday ML operations look in pure NumPy — the mental model behind scikit-learn, PyTorch and TensorFlow.

## Data as arrays

| Data | Typical shape |
|---|---|
| Tabular features `X` | `(n_samples, n_features)` |
| Labels `y` | `(n_samples,)` |
| Grayscale images | `(n, H, W)` |
| Colour images | `(n, H, W, C)` (TF/PIL) or `(n, C, H, W)` (PyTorch) |
| Time series | `(n, timesteps, features)` |
| Text (token IDs) | `(n, seq_len)` |

## Train / test split

```python
import numpy as np

rng = np.random.default_rng(42)
X = rng.normal(size=(100, 3))
y = (X[:, 0] + X[:, 1] > 0).astype(int)

idx = rng.permutation(len(X))
split = int(0.8 * len(X))
train_idx, test_idx = idx[:split], idx[split:]
X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
X_train.shape, X_test.shape          # -> ((80, 3), (20, 3))
```

## Feature scaling

```python
import numpy as np

rng = np.random.default_rng(0)
X_train = rng.normal(50, 10, size=(80, 3))
X_test = rng.normal(50, 10, size=(20, 3))

# Standardisation (z-score): fit on TRAIN only, apply to both
mu, sigma = X_train.mean(axis=0), X_train.std(axis=0)
X_train_s = (X_train - mu) / sigma
X_test_s = (X_test - mu) / sigma
np.allclose(X_train_s.mean(axis=0), 0)     # -> True

# Min-max scaling to [0, 1]
mn, mx = X_train.min(axis=0), X_train.max(axis=0)
X_train_mm = (X_train - mn) / (mx - mn)
```

!!! warning "Data leakage"
    Compute statistics (mean, std, min, max) on the **training set only**, then reuse them for validation/test data.

## Encoding

```python
import numpy as np

labels = np.array([2, 0, 1, 2])
num_classes = 3
one_hot = np.eye(num_classes)[labels]         # fancy indexing trick
one_hot
# -> array([[0., 0., 1.], [1., 0., 0.], [0., 1., 0.], [0., 0., 1.]])
one_hot.argmax(axis=1)                        # -> array([2, 0, 1, 2])   back to labels

cats = np.array(["cat", "dog", "cat", "bird"])
classes, codes = np.unique(cats, return_inverse=True)
classes                                       # -> array(['bird', 'cat', 'dog'], dtype='<U4')
codes                                         # -> array([1, 2, 1, 0])
```

## Activation & loss functions

```python
import numpy as np

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

def relu(z):
    return np.maximum(z, 0)

def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)        # subtract max for numerical stability
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)

def mse(y_true, y_pred):
    return np.mean((y_true - y_pred) ** 2)

def binary_cross_entropy(y_true, p, eps=1e-12):
    p = np.clip(p, eps, 1 - eps)
    return -np.mean(y_true * np.log(p) + (1 - y_true) * np.log(1 - p))

def cross_entropy(y_onehot, probs, eps=1e-12):
    return -np.mean(np.sum(y_onehot * np.log(probs + eps), axis=1))

sigmoid(0.0)                                  # -> np.float64(0.5)
relu(np.array([-1.0, 2.0]))                   # -> array([0., 2.])
np.isclose(softmax(np.array([[1.0, 2.0, 3.0]])).sum(), 1.0)   # -> np.True_
mse(np.array([1.0, 2.0]), np.array([1.0, 4.0]))   # -> np.float64(2.0)
```

## Linear regression with gradient descent

```python
import numpy as np

rng = np.random.default_rng(1)
X = rng.uniform(-1, 1, size=(200, 2))
true_w, true_b = np.array([3.0, -2.0]), 0.5
y = X @ true_w + true_b + rng.normal(0, 0.1, 200)

w = np.zeros(2); b = 0.0; lr = 0.1
for epoch in range(500):
    y_hat = X @ w + b                      # forward pass (vectorised over all samples)
    err = y_hat - y
    grad_w = 2 * X.T @ err / len(X)        # dMSE/dw
    grad_b = 2 * err.mean()                # dMSE/db
    w -= lr * grad_w
    b -= lr * grad_b

np.round(w, 1), round(float(b), 1)         # -> (array([ 3., -2.]), 0.5)
```

## Logistic regression (binary classification)

```python
import numpy as np

rng = np.random.default_rng(2)
X = rng.normal(size=(300, 2))
y = (X[:, 0] - X[:, 1] > 0).astype(float)

w = np.zeros(2); b = 0.0; lr = 0.5
for _ in range(300):
    p = 1 / (1 + np.exp(-(X @ w + b)))
    w -= lr * X.T @ (p - y) / len(X)
    b -= lr * (p - y).mean()

pred = (1 / (1 + np.exp(-(X @ w + b))) > 0.5).astype(float)
accuracy = (pred == y).mean()
accuracy > 0.95                            # -> np.True_
```

## Mini-batches

```python
import numpy as np

def iterate_minibatches(X, y, batch_size, rng):
    idx = rng.permutation(len(X))
    for start in range(0, len(X), batch_size):
        batch = idx[start:start + batch_size]
        yield X[batch], y[batch]

rng = np.random.default_rng(0)
X = np.arange(20).reshape(10, 2); y = np.arange(10)
sizes = [len(xb) for xb, yb in iterate_minibatches(X, y, 4, rng)]
sizes                                      # -> [4, 4, 2]
```

## Evaluation metrics

```python
import numpy as np

y_true = np.array([1, 0, 1, 1, 0, 1])
y_pred = np.array([1, 0, 0, 1, 1, 1])

tp = np.sum((y_pred == 1) & (y_true == 1))   # 3
fp = np.sum((y_pred == 1) & (y_true == 0))   # 1
fn = np.sum((y_pred == 0) & (y_true == 1))   # 1
accuracy = np.mean(y_pred == y_true)
precision = tp / (tp + fp)
recall = tp / (tp + fn)
f1 = 2 * precision * recall / (precision + recall)
round(float(f1), 2)                          # -> 0.75

# Confusion matrix for k classes
k = 2
cm = np.zeros((k, k), dtype=int)
np.add.at(cm, (y_true, y_pred), 1)           # unbuffered in-place add
cm                                           # -> array([[1, 1], [1, 3]])
```

## Distances & nearest neighbours

```python
import numpy as np

train = np.array([[0.0, 0.0], [1.0, 1.0], [5.0, 5.0]])
labels = np.array([0, 0, 1])
query = np.array([[0.9, 0.8], [4.0, 4.5]])

# Pairwise squared Euclidean distances via broadcasting: (2,1,2) - (1,3,2)
d2 = ((query[:, None, :] - train[None, :, :]) ** 2).sum(axis=-1)   # (2, 3)
nearest = d2.argmin(axis=1)
labels[nearest]                              # -> array([0, 1])

# Cosine similarity (embeddings / semantic search)
def cosine_sim(a, b):
    a = a / np.linalg.norm(a, axis=1, keepdims=True)
    b = b / np.linalg.norm(b, axis=1, keepdims=True)
    return a @ b.T

cosine_sim(np.array([[1.0, 0.0]]), np.array([[1.0, 0.0], [0.0, 1.0]]))   # -> array([[1., 0.]])
```

## Images as arrays

```python
import numpy as np

img = np.random.default_rng(0).integers(0, 256, size=(64, 64, 3), dtype=np.uint8)

gray = img @ np.array([0.299, 0.587, 0.114])          # weighted RGB -> (64, 64)
normalized = img.astype(np.float32) / 255.0           # scale to [0, 1]
flipped = img[:, ::-1]                                # horizontal flip (augmentation)
crop = img[16:48, 16:48]                              # center crop (32, 32, 3)
batch = np.stack([img, flipped])                      # (2, 64, 64, 3)
chw = batch.transpose(0, 3, 1, 2)                     # NHWC -> NCHW for PyTorch
chw.shape                                             # -> (2, 3, 64, 64)
```

## From NumPy to frameworks

| NumPy | PyTorch | TensorFlow |
|---|---|---|
| `np.array(x)` | `torch.tensor(x)` | `tf.constant(x)` |
| `a.shape` | `t.shape` | `t.shape` |
| `a.reshape(2, -1)` | `t.reshape(2, -1)` / `view` | `tf.reshape(t, (2, -1))` |
| `a @ b` | `t @ u` | `t @ u` |
| `a.mean(axis=0)` | `t.mean(dim=0)` | `tf.reduce_mean(t, axis=0)` |
| `np.random.default_rng(0)` | `torch.manual_seed(0)` | `tf.random.set_seed(0)` |

Frameworks add **GPU execution** and **automatic differentiation** on top of the same array ideas.

## Quick recap

- [x] `X (n_samples, n_features)`, `y (n_samples,)`; shuffle indices with `rng.permutation`.
- [x] Scale with train statistics only; one-hot with `np.eye(k)[labels]`.
- [x] Softmax: subtract the max; clip probabilities in log losses.
- [x] Gradient descent = vectorised forward pass + `X.T @ err`.
- [x] Broadcasting for pairwise distances; `np.add.at` for confusion matrices.
