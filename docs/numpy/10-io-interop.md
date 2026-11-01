# File I/O & Interoperability

## NumPy binary formats (fast, exact)

```python
import numpy as np
import tempfile, os

d = tempfile.mkdtemp()
a = np.arange(10)
b = np.eye(3)

np.save(os.path.join(d, "a.npy"), a)                     # one array -> .npy
np.load(os.path.join(d, "a.npy"))                        # -> array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

np.savez(os.path.join(d, "data.npz"), features=a, matrix=b)          # many arrays
np.savez_compressed(os.path.join(d, "data_c.npz"), features=a, matrix=b)

with np.load(os.path.join(d, "data.npz")) as data:       # lazy, dict-like
    print(data.files)                                    # ['features', 'matrix']
    m = data["matrix"]
```

| Format | Use |
|---|---|
| `.npy` | One array; keeps dtype & shape exactly; fast |
| `.npz` | Several named arrays (zip); `savez_compressed` for smaller files |
| Text (CSV) | Human-readable, slower, may lose precision |

!!! warning "Security"
    `np.load` refuses pickled object arrays by default (`allow_pickle=False`). Only set `allow_pickle=True` for files you trust — pickles can execute code.

## Text files (CSV)

```python
import numpy as np
import tempfile, os

path = os.path.join(tempfile.mkdtemp(), "scores.csv")
data = np.array([[1, 85.5], [2, 90.0], [3, 77.25]])

np.savetxt(path, data, delimiter=",", header="id,score", comments="", fmt=["%d", "%.2f"])

loaded = np.loadtxt(path, delimiter=",", skiprows=1)
loaded.shape                                     # -> (3, 2)

ids = np.loadtxt(path, delimiter=",", skiprows=1, usecols=0, dtype=int)
ids                                              # -> array([1, 2, 3])

# genfromtxt handles missing values and named columns
rec = np.genfromtxt(path, delimiter=",", names=True)
rec["score"]                                     # -> array([85.5 , 90.  , 77.25])
```

For real tabular data with mixed types and missing values, use **pandas** (`pd.read_csv`) and convert with `.to_numpy()`.

## Memory-mapped files (bigger than RAM)

```python
import numpy as np
import tempfile, os

path = os.path.join(tempfile.mkdtemp(), "big.dat")
mm = np.memmap(path, dtype=np.float32, mode="w+", shape=(1000, 100))
mm[:10] = 1.0
mm.flush()

ro = np.memmap(path, dtype=np.float32, mode="r", shape=(1000, 100))
float(ro[:10].sum())                              # -> 1000.0

# .npy files can also be memory-mapped:
np.save(path + ".npy", np.zeros((1000, 100)))
lazy = np.load(path + ".npy", mmap_mode="r")      # reads pages on demand
```

## Interoperability

### pandas

```python
import numpy as np
import pandas as pd

df = pd.DataFrame({"x": [1, 2, 3], "y": [0.5, 1.5, 2.5]})
arr = df.to_numpy()                 # DataFrame -> ndarray
df["z"] = np.sqrt(df["x"])          # ufuncs work on Series
back = pd.DataFrame(arr, columns=["x", "y"])
```

### Python lists & scalars

```python
import numpy as np

a = np.array([[1, 2], [3, 4]])
a.tolist()               # -> [[1, 2], [3, 4]]   nested Python lists (JSON-serialisable)
a[0, 0].item()           # -> 1                  Python int
float(np.float32(1.5))   # -> 1.5
```

### Deep-learning frameworks & DLPack

```python
# no-run — requires PyTorch
import numpy as np
import torch

a = np.arange(6, dtype=np.float32).reshape(2, 3)
t = torch.from_numpy(a)        # shares memory with the NumPy array (CPU)
back = t.numpy()               # shares memory again
t_copy = torch.tensor(a)       # independent copy

t2 = torch.from_dlpack(a)      # zero-copy exchange via the DLPack protocol
a2 = np.from_dlpack(t)         # works with PyTorch, JAX, CuPy, TensorFlow…
```

- **DLPack** is the standard for zero-copy array exchange between libraries.
- GPU tensors must be moved to CPU first (`t.cpu().numpy()`).
- **CuPy** offers a NumPy-compatible API on NVIDIA GPUs; **JAX** offers `jax.numpy`.

### The Array API standard

NumPy 2 implements the Python **Array API standard** in its main namespace, so code written against it can run on NumPy, CuPy, PyTorch or JAX arrays:

```python
import numpy as np

def softmax(x):
    xp = x.__array_namespace__()           # get the library of the input array
    e = xp.exp(x - xp.max(x, axis=-1, keepdims=True))
    return e / xp.sum(e, axis=-1, keepdims=True)

softmax(np.array([1.0, 2.0, 3.0])).round(3)   # -> array([0.09 , 0.245, 0.665])
```

### Images

```python
# no-run — requires Pillow
import numpy as np
from PIL import Image

img = np.asarray(Image.open("photo.jpg"))   # (H, W, 3) uint8
gray = img.mean(axis=2).astype(np.uint8)
Image.fromarray(gray).save("gray.png")
```

## Quick recap

- [x] `np.save/load` (.npy), `np.savez[_compressed]` (.npz); `allow_pickle=False` by default.
- [x] `np.savetxt`, `np.loadtxt`, `np.genfromtxt` for text; pandas for messy tables.
- [x] `np.memmap` / `np.load(mmap_mode="r")` for data larger than RAM.
- [x] `df.to_numpy()`, `a.tolist()`, `.item()`; `torch.from_numpy` / DLPack for zero-copy exchange.
