# Expressions, Loops & Functions

<span class="exam-tag">Obj 4d</span><span class="exam-tag">Obj 4e</span>

## `count`

Create **N copies** of a resource (or module) from one block.

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  tags = {
    Name = "web-${count.index}"        # web-0, web-1, web-2
  }
}
```

- `count.index` starts at **0**.
- Addresses: `aws_instance.web[0]`, `aws_instance.web[1]`…
- Combine with a list to get distinct values:

```hcl
variable "env_names" {
  type    = list(string)
  default = ["dev", "prod", "lab"]
}

resource "aws_instance" "env" {
  count         = length(var.env_names)
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  tags          = { Name = var.env_names[count.index] }
}
```

- **Conditional creation** — the classic pattern:

```hcl
resource "aws_eip" "this" {
  count  = var.create_eip ? 1 : 0
  domain = "vpc"
}
```

!!! warning "The problem with `count` + lists"
    Resources are tracked by **index**. Removing `"dev"` from `["dev","prod","lab"]` shifts everything: `prod` moves from `[1]` to `[0]` → Terraform **replaces** resources you didn't mean to touch. Use `for_each` when items have identity.

## `for_each`

Create **one instance per element** of a **map** or **set of strings**. Instances are tracked by **key**, not index.

```hcl
# Set of strings
resource "aws_iam_user" "accounts" {
  for_each = toset(["todd", "james", "alice", "dottie"])
  name     = each.key                 # for a set, each.key == each.value
}

# Map
variable "buckets" {
  default = {
    logs    = "private"
    website = "public-read"
  }
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "myco-${each.key}"       # each.key   → logs / website
  tags     = { Access = each.value }  # each.value → private / public-read
}

output "user_arns" {
  value = { for name, u in aws_iam_user.accounts : name => u.arn }
}
```

- Addresses: `aws_iam_user.accounts["alice"]`.
- A **list** is not accepted directly → wrap it with `toset()`.
- Keys must be **known at plan time** (can't come from attributes of resources not yet created).
- A block can use **`count` or `for_each`, not both**.

| | `count` | `for_each` |
|---|---|---|
| Input | number | map or set of strings |
| Identifier | `count.index` | `each.key`, `each.value` |
| Address | `res[0]` | `res["key"]` |
| Removing a middle item | shifts & recreates others | only that item is destroyed |
| Best for | N identical copies, on/off toggle | Distinct, named items |

Both also work on **`module`** blocks.

## `for` expressions

Transform one collection into another (like Python list/dict comprehensions).

```hcl
locals {
  names = ["alice", "bob", "carol"]

  upper_names = [for n in local.names : upper(n)]
  # ["ALICE", "BOB", "CAROL"]

  name_lengths = { for n in local.names : n => length(n) }
  # { alice = 5, bob = 3, carol = 5 }

  long_names = [for n in local.names : n if length(n) > 3]
  # ["alice", "carol"]

  ids_by_az = { for s in aws_subnet.private : s.availability_zone => s.id }

  # Group values with the same key using ...
  by_env = { for s in var.servers : s.env => s.name... }
}
```

- `[ ... ]` produces a **list/tuple**; `{ ... }` produces a **map/object**.
- Iterating a map: `for k, v in var.map : ...`; a list: `for i, v in var.list : ...` (index, value).

## Splat expressions `[*]`

A short form of a `for` expression to collect one attribute from every element of a list.

```hcl
resource "aws_iam_user" "sys_adm" {
  count = 3
  name  = "sys_adm${count.index}"
}

output "all_arns" {
  value = aws_iam_user.sys_adm[*].arn          # list of 3 ARNs
}

output "second_arn" {
  value = aws_iam_user.sys_adm[1].arn          # sys_adm1
}
```

- `var.list[*].id` ≡ `[for o in var.list : o.id]`.
- Splat works on **lists** (e.g., `count` resources). For `for_each` resources (maps), use `values(aws_x.y)[*].id` or a `for` expression.
- Legacy form `aws_instance.web.*.id` still works but `[*]` is preferred.

## Conditional expressions

```hcl
condition ? true_value : false_value
```

```hcl
variable "env" { default = "dev" }

resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = var.env == "prod" ? "t3.large" : "t3.micro"
}

resource "aws_instance" "bastion" {
  count         = var.create_bastion ? 1 : 0     # create or not
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
}
```

Both result values must be of a compatible type.

### Operators

- **Arithmetic**: `+ - * / %`, unary `-`
- **Comparison**: `== != < <= > >=`
- **Logical**: `&&` (and), `||` (or), `!` (not)

## Dynamic blocks

Generate **repeated nested blocks** (e.g., `ingress`, `setting`) from a collection, instead of copy-pasting them.

=== "Without dynamic block"

    ```hcl
    resource "aws_security_group" "web" {
      name = "web"
      ingress {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
      }
      ingress {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
      }
      ingress {
        from_port   = 8080
        to_port     = 8080
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
      }
    }
    ```

=== "With dynamic block"

    ```hcl
    variable "ingress_ports" {
      type    = list(number)
      default = [80, 443, 8080]
    }

    resource "aws_security_group" "web" {
      name = "web"

      dynamic "ingress" {               # label = name of the nested block to generate
        for_each = var.ingress_ports
        iterator = port                 # optional; default iterator name = "ingress"
        content {
          from_port   = port.value
          to_port     = port.value
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        }
      }
    }
    ```

- `for_each`: collection to iterate (list, set, map).
- `iterator`: temporary variable name; has `.key` and `.value`. **Defaults to the block label** (`ingress.value`).
- `content {}`: body of each generated block.
- Supported inside `resource`, `data`, `provider` and `provisioner` blocks. **Not** for meta-argument blocks such as `lifecycle`.
- Overuse hurts readability — use when the list is truly variable.

## Built-in functions

- Syntax: `name(arg1, arg2, ...)`, e.g. `max(1, 2, 3)` → `3`.
- Terraform has **no user-defined functions**. Only built-ins (plus **provider-defined functions** since 1.8, called as `provider::<name>::<function>(...)`).
- Test them in `terraform console`.

### Most useful functions by category

| Category | Functions (examples) |
|---|---|
| **Numeric** | `max(5, 12, 9)`→12 · `min` · `abs` · `ceil(4.1)`→5 · `floor` · `pow` |
| **String** | `upper` · `lower` · `title` · `format("%s-%03d", "web", 7)`→`web-007` · `join("-", ["a","b"])`→`a-b` · `split(",", "a,b")` · `replace` · `substr("hello",0,3)`→`hel` · `trimspace` · `startswith` · `endswith` · `regex` |
| **Collection** | `length` · `element(["a","b","c"], 1)`→`b` (wraps around) · `index` · `lookup({a="ay"}, "c", "what?")`→`what?` · `merge` · `concat` · `flatten` · `distinct` · `keys` · `values` · `zipmap` · `contains` · `slice` · `range` · `coalesce` · `one` · `setunion` |
| **Encoding** | `jsonencode` · `jsondecode` · `yamlencode` · `yamldecode` · `base64encode` · `base64decode` · `urlencode` |
| **Filesystem** | `file("${path.module}/hello.txt")` · `fileexists` · `templatefile("tpl.sh", { port = 80 })` · `filebase64` · `fileset` |
| **Date & time** | `timestamp()` (changes every run!) · `formatdate("DD MMM YYYY hh:mm ZZZ", "2018-01-02T23:12:01Z")`→`02 Jan 2018 23:12 UTC` · `timeadd` · `plantimestamp()` |
| **Hash & crypto** | `md5` · `sha256` · `filesha256` · `bcrypt` · `uuid` |
| **IP network** | `cidrsubnet("10.0.0.0/16", 8, 2)`→`10.0.2.0/24` · `cidrhost` · `cidrnetmask` · `cidrsubnets` |
| **Type conversion** | `tostring` · `tonumber` · `tobool` · `tolist` · `toset` · `tomap` · `try(expr, fallback)` · `can(expr)` · `sensitive()` · `nonsensitive()` |

Examples:

```hcl
locals {
  ami_by_region = {
    us-east-1 = "ami-0aaa"
    us-west-2 = "ami-0bbb"
  }
  ami = lookup(local.ami_by_region, var.region, "ami-default")

  user_data = templatefile("${path.module}/init.sh.tftpl", {
    app_port = 8080
    env      = var.env
  })

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "s3:GetObject", Resource = "*" }]
  })

  subnets = [for i in range(3) : cidrsubnet("10.0.0.0/16", 8, i)]
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]

  port = try(var.settings.port, 80)   # fallback if attribute missing
}
```

!!! note "`lookup` vs index syntax"
    `var.map["key"]` errors if the key is missing; `lookup(var.map, "key", default)` returns the default. `element()` wraps around (`element(["a","b"], 2)` → `"a"`), plain indexing `list[2]` errors.

## Comments

```hcl
# single-line comment (preferred style — fmt keeps it)
// also a single-line comment
/* multi-line
   comment block */
```

## Quick recap

- [x] `count` → index-based (`[0]`), good for N copies / on-off toggles.
- [x] `for_each` → key-based (`["key"]`), needs a **map or set**; use `toset()` for lists.
- [x] `for` expressions: `[for x in list : f(x) if cond]`, `{for k, v in map : k => v}`.
- [x] Splat `[*]` collects one attribute from a list.
- [x] `cond ? a : b`; dynamic blocks generate nested blocks (`iterator` defaults to block label).
- [x] No user-defined functions — only built-ins (and provider functions).
