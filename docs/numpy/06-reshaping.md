# Reshaping, Stacking & Splitting

## Reshape

```python
import numpy as np

a = np.arange(12)

a.reshape(3, 4).shape       # -> (3, 4)
a.reshape(2, -1).shape      # -> (2, 6)    -1 = "infer this dimension"
a.reshape(-1, 3).shape      # -> (4, 3)
a.reshape(2, 3, 2).shape    # -> (2, 3, 2)
np.reshape(a, (4, 3)).shape # -> (4, 3)
```

- The total number of elements must stay the same (`12 = 3 × 4`).
- `reshape` returns a **view** when possible.
- Default order is **C (row-major)**: the last axis changes fastest. `order="F"` = column-major (Fortran).

```python
import numpy as np

np.arange(6).reshape(2, 3)              # -> array([[0, 1, 2], [3, 4, 5]])
np.arange(6).reshape(2, 3, order="F")   # -> array([[0, 2, 4], [1, 3, 5]])
```

!!! warning "Deprecated: assigning to `.shape`"
    `a.shape = (3, 4)` is **deprecated in NumPy 2.5**. Use `a = a.reshape(3, 4)`. Resizing an array in place (`a.resize(...)`) is also deprecated — use `np.resize`.

## Flatten

```python
import numpy as np

m = np.arange(6).reshape(2, 3)
m.ravel()      # -> array([0, 1, 2, 3, 4, 5])   view if possible (fast)
m.flatten()    # -> array([0, 1, 2, 3, 4, 5])   always a copy
m.reshape(-1)  # -> array([0, 1, 2, 3, 4, 5])
```

## Adding / removing axes

```python
import numpy as np

v = np.array([1, 2, 3])                  # (3,)
np.expand_dims(v, axis=0).shape           # -> (1, 3)
np.expand_dims(v, axis=1).shape           # -> (3, 1)
v[None, :, None].shape                    # -> (1, 3, 1)

x = np.zeros((1, 3, 1))
np.squeeze(x).shape                       # -> (3,)     remove all size-1 axes
np.squeeze(x, axis=0).shape               # -> (3, 1)
```

Typical ML use: a single image `(H, W, C)` → batch of one `(1, H, W, C)` with `img[None, ...]`.

## Transpose & moving axes

```python
import numpy as np

m = np.arange(6).reshape(2, 3)
m.T.shape                                 # -> (3, 2)

img = np.zeros((32, 64, 3))               # (H, W, C) — TensorFlow/PIL layout
chw = np.transpose(img, (2, 0, 1))        # (C, H, W) — PyTorch layout
chw.shape                                 # -> (3, 32, 64)
np.moveaxis(img, -1, 0).shape             # -> (3, 32, 64)   same thing
np.swapaxes(img, 0, 1).shape              # -> (64, 32, 3)
```

## Joining arrays

```python
import numpy as np

a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])

np.concatenate([a, b], axis=0)   # -> array([[1, 2], [3, 4], [5, 6], [7, 8]])   (4, 2)
np.concatenate([a, b], axis=1)   # -> array([[1, 2, 5, 6], [3, 4, 7, 8]])       (2, 4)
np.vstack([a, b]).shape          # -> (4, 2)    vertical (rows)
np.hstack([a, b]).shape          # -> (2, 4)    horizontal (columns)
np.stack([a, b]).shape           # -> (2, 2, 2) NEW axis 0
np.stack([a, b], axis=-1).shape  # -> (2, 2, 2) new last axis
np.dstack([a, b]).shape          # -> (2, 2, 2) along depth (axis 2)
np.column_stack([[1, 2], [3, 4]])   # -> array([[1, 3], [2, 4]])   1-D arrays as columns
np.block([[a, b], [b, a]]).shape    # -> (4, 4)   build from blocks
```

| Function | Joins along | New axis? |
|---|---|---|
| `concatenate(axis=k)` | Existing axis `k` | No |
| `vstack` | Axis 0 (rows) | No (1-D treated as rows) |
| `hstack` | Axis 1 (or 0 for 1-D) | No |
| `stack(axis=k)` | **New** axis `k` | Yes — all inputs must have the same shape |
| `column_stack` | 1-D arrays become columns | — |

!!! warning "Removed: `np.row_stack`"
    `np.row_stack` was removed in NumPy 2.5 — use `np.vstack`.

## Splitting

```python
import numpy as np

a = np.arange(12)
np.split(a, 3)                    # 3 equal parts (must divide evenly)
np.split(a, [3, 8])               # split at indices -> [0:3], [3:8], [8:]
np.array_split(a, 5)              # nearly equal parts, uneven allowed

m = np.arange(16).reshape(4, 4)
top, bottom = np.vsplit(m, 2)     # along rows
left, right = np.hsplit(m, 2)     # along columns
top.shape, left.shape             # -> ((2, 4), (4, 2))
```

## Repeating, padding, flipping

```python
import numpy as np

a = np.array([[1, 2], [3, 4]])
np.repeat(a, 2, axis=0)        # each row twice
np.tile(a, (1, 2))             # -> array([[1, 2, 1, 2], [3, 4, 3, 4]])
np.pad(a, 1).shape             # -> (4, 4)   zero padding (e.g. images)
np.pad(a, ((0, 0), (1, 1)), mode="edge")
# -> array([[1, 1, 2, 2], [3, 3, 4, 4]])
np.flip(a, axis=0)             # -> array([[3, 4], [1, 2]])
np.flipud(a); np.fliplr(a)
np.rot90(a)                    # -> array([[2, 4], [1, 3]])
np.roll(np.arange(5), 2)       # -> array([3, 4, 0, 1, 2])
```

## Adding & removing elements (copies)

```python
import numpy as np

a = np.array([1, 2, 3])
np.append(a, [4, 5])          # -> array([1, 2, 3, 4, 5])
np.insert(a, 1, 99)           # -> array([ 1, 99,  2,  3])
np.delete(a, 0)               # -> array([2, 3])
np.unique([3, 1, 3, 2, 1])    # -> array([1, 2, 3])
```

These always allocate new arrays — never `append` in a loop. Collect values in a list and call `np.array` once, or pre-allocate with `np.empty`.

## Quick recap

- [x] `reshape` (with `-1`), `ravel` (view) vs `flatten` (copy); don't assign `.shape`.
- [x] `expand_dims` / `None` add axes; `squeeze` removes size-1 axes.
- [x] `.T`, `transpose(axes)`, `moveaxis` for layouts like HWC ↔ CHW.
- [x] `concatenate` (existing axis) vs `stack` (new axis); `vstack`/`hstack`.
- [x] `split`, `array_split`; `tile`, `repeat`, `pad`, `flip`, `roll`.
