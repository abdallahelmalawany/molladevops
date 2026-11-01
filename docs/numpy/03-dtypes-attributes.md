# Array Attributes & dtypes

## Attributes

```python
import numpy as np

a = np.arange(12, dtype=np.int32).reshape(3, 4)

a.ndim        # -> 2            number of axes
a.shape       # -> (3, 4)       size of each axis
a.size        # -> 12           total elements
a.dtype       # -> dtype('int32')
a.itemsize    # -> 4            bytes per element
a.nbytes      # -> 48           total bytes = size * itemsize
a.strides     # -> (16, 4)      bytes to step along each axis
a.T.shape     # -> (4, 3)       transpose
len(a)        # -> 3            length of the first axis
```

## Data types (dtypes)

| Kind | dtypes | Character code |
|---|---|---|
| Boolean | `bool` | `?` |
| Signed int | `int8`, `int16`, `int32`, `int64` | `i1 i2 i4 i8` |
| Unsigned int | `uint8`, `uint16`, `uint32`, `uint64` | `u1 u2 u4 u8` |
| Float | `float16`, `float32`, `float64` | `f2 f4 f8` |
| Complex | `complex64`, `complex128` | `c8 c16` |
| Datetime / timedelta | `datetime64[D]`, `timedelta64[s]` | `M8 m8` |
| Fixed-width strings | `str_` (Unicode), `bytes_` | `U10`, `S10` |
| Variable-width string | `np.dtypes.StringDType()` | `T` |
| Python objects | `object` | `O` |

Defaults: integers → **`int64`** (on all 64-bit platforms, including Windows since NumPy 2.0); floats → **`float64`**.

```python
import numpy as np

np.array([1, 2, 3]).dtype          # -> dtype('int64')
np.array([1.0, 2]).dtype           # -> dtype('float64')
np.array([True, False]).dtype      # -> dtype('bool')
np.array(["a", "bcd"]).dtype       # -> dtype('<U3')

np.dtype("float32").itemsize       # -> 4
np.iinfo(np.int8)                  # min -128, max 127
np.finfo(np.float32).eps           # -> np.float32(1.1920929e-07)
```

### Choosing dtypes (memory matters)

| Data | Good dtype | Why |
|---|---|---|
| Image pixels 0–255 | `uint8` | 1 byte per value |
| Deep-learning weights / features | `float32` (or `float16`/`bfloat16` in frameworks) | Half the memory of float64, GPU-friendly |
| Scientific precision | `float64` | Default, more precise |
| Flags / masks | `bool` | 1 byte |
| Counts / IDs | `int32` / `int64` | Range dependent |

```python
import numpy as np

big64 = np.zeros((1000, 1000))                    # float64
big32 = np.zeros((1000, 1000), dtype=np.float32)
big64.nbytes / 1e6, big32.nbytes / 1e6            # -> (8.0, 4.0)  MB
```

## Casting

```python
import numpy as np

a = np.array([1.7, -2.3, 3.9])
a.astype(np.int64)                 # -> array([ 1, -2,  3])   truncates toward 0
a.astype(np.int64, copy=False)     # avoid a copy if the dtype already matches
np.round(a).astype(int)            # -> array([ 2, -2,  4])

np.array([300]).astype(np.uint8)   # -> array([44], dtype=uint8)   wraps around silently!
np.can_cast(np.int64, np.float32)  # -> False (may lose precision)
np.can_cast(np.int8, np.int16)     # -> True
```

!!! warning "Overflow"
    Integer arithmetic **wraps around** without error: `np.array([127], dtype=np.int8) + 1` gives `-128`. Choose a dtype large enough for your values.

## Type promotion (NEP 50, NumPy 2)

When mixing types, NumPy picks a result type:

```python
import numpy as np

(np.array([1, 2]) + np.array([0.5, 1.5])).dtype   # -> dtype('float64')  int + float -> float
(np.array([1], dtype=np.int8) + np.array([1], dtype=np.int16)).dtype  # -> dtype('int16')

# NumPy 2: Python scalars are "weak" — they don't upcast the array
(np.array([1, 2], dtype=np.float32) + 3.0).dtype  # -> dtype('float32')
(np.float32(3) + 3.0).dtype                       # -> dtype('float32')   (was float64 in NumPy 1.x)

np.result_type(np.int8, np.float32)               # -> dtype('float32')
np.promote_types("int32", "float32")              # -> dtype('float64')
```

## Strings

```python
import numpy as np

names = np.array(["alice", "bob"])              # fixed-width '<U5'
np.strings.upper(names)                          # -> array(['ALICE', 'BOB'], dtype='<U5')
np.strings.str_len(names)                        # -> array([5, 3])

s = np.array(["short", "a much longer string"], dtype=np.dtypes.StringDType())
s.dtype                                          # -> StringDType()  variable-width UTF-8
```

Use the **`np.strings`** module (ufunc-based) instead of the older `np.char` functions.

## Datetimes

```python
import numpy as np

d = np.array(["2026-01-01", "2026-03-15"], dtype="datetime64[D]")
d[1] - d[0]                                     # -> np.timedelta64(73,'D')
np.arange("2026-01", "2026-04", dtype="datetime64[M]")
# -> array(['2026-01', '2026-02', '2026-03'], dtype='datetime64[M]')
np.datetime64("2026-11-01") + np.timedelta64(7, "D")   # -> np.datetime64('2026-11-08')
```

## Quick recap

- [x] `ndim`, `shape`, `size`, `dtype`, `itemsize`, `nbytes`, `strides`.
- [x] Default int64 / float64; pick `float32`/`uint8` to save memory.
- [x] `astype` casts (truncates floats, wraps ints silently).
- [x] NumPy 2 promotion: Python scalars don't upcast arrays (`float32 + 3.0 → float32`).
- [x] Strings: `np.strings` functions, `StringDType` for variable-length text.
