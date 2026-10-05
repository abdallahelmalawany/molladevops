# Import & Refactoring

<span class="exam-tag">Obj 7a</span><span class="exam-tag">Obj 6d</span>

## Importing existing infrastructure

Bring resources created **outside Terraform** (console, scripts, other tools) under Terraform management. After import they are in the state file and managed like any other resource.

### Option 1 — `import` block (recommended, Terraform 1.5+)

Declarative, reviewed in `plan`, can import **many resources at once**, works in CI and HCP Terraform.

```hcl
# imports.tf
import {
  to = aws_instance.legacy
  id = "i-0abcd1234ef567890"
}

resource "aws_instance" "legacy" {
  ami           = "ami-0abc..."
  instance_type = "t3.micro"
  # ... must match the real object, or plan will show changes
}
```

```bash
terraform plan      # shows: aws_instance.legacy will be imported
terraform apply     # import happens during apply
```

- `id` format depends on the resource type (see the "Import" section at the bottom of each resource's Registry docs).
- After a successful import you **may delete** the `import` block (or keep it as a record — it's a no-op once imported).
- Since **1.6**, `id` can be an expression (variables etc.). Since **1.7**, `import` supports **`for_each`**:

```hcl
import {
  for_each = var.bucket_names          # set of strings
  to       = aws_s3_bucket.this[each.key]
  id       = each.key
}
```

#### Generate the configuration automatically

Write only the `import` block (no resource block), then:

```bash
terraform plan -generate-config-out=generated.tf
```

Terraform writes HCL for the imported resources into `generated.tf` (file must not exist yet). **Review and clean it up** — it may include computed or conflicting arguments — then `terraform apply`.

### Option 2 — `terraform import` command (legacy)

```bash
terraform import aws_instance.legacy i-0abcd1234ef567890
terraform import 'aws_iam_user.users["alice"]' alice
terraform import module.vpc.aws_vpc.this vpc-0a1b2c3d
```

- You **must write the resource block first** — the command only updates **state**, it doesn't generate code.
- One resource per command, writes to state immediately with no plan review.
- Still supported, but `import` blocks are preferred.

| | `import` block | `terraform import` |
|---|---|---|
| Since | 1.5 | early versions |
| Reviewed in plan | Yes | No (immediate state change) |
| Multiple resources | Yes (`for_each`, many blocks) | One per command |
| Generate config | Yes (`-generate-config-out`) | No |
| Works in HCP Terraform VCS workflow | Yes | No (CLI only) |

## Forcing replacement — `-replace` (replaces `taint`)

When an object is degraded/damaged (or someone changed it by hand and you want a clean rebuild):

```bash
terraform plan  -replace="aws_instance.web[0]"
terraform apply -replace="aws_instance.web[0]"
```

!!! warning "Deprecated: `terraform taint` / `untaint`"
    `terraform taint ADDR` marked a resource in state as tainted so the **next** apply would recreate it. It's deprecated since **v0.15.2** because it changes state without a plan and could affect teammates' runs.
    Use **`terraform apply -replace=ADDR`** — you see the replacement in the plan before it happens.

    A resource still becomes **tainted automatically** if creation fails partway (e.g., a creation-time provisioner fails). `terraform untaint ADDR` removes that mark.

## Refactoring without destroying

### `moved` blocks (1.1+)

Rename a resource or move it into a module **without destroy/recreate**. Declarative, reviewed in plan — preferred over `terraform state mv`.

```hcl
# Renamed aws_instance.web → aws_instance.app
moved {
  from = aws_instance.web
  to   = aws_instance.app
}

# Moved into a module
moved {
  from = aws_s3_bucket.logs
  to   = module.logging.aws_s3_bucket.this
}

# Switched from count to for_each
moved {
  from = aws_iam_user.users[0]
  to   = aws_iam_user.users["alice"]
}
```

Keep `moved` blocks for a while (especially in shared modules) so every caller gets migrated.

### `removed` blocks (1.7+) {#removed-blocks}

Stop managing a resource **without destroying** it — the declarative version of `terraform state rm`.

```hcl
# Delete the resource "aws_instance.legacy" block from code and add:
removed {
  from = aws_instance.legacy

  lifecycle {
    destroy = false     # forget it, keep the real instance
  }
}
```

With `destroy = true` (or deleting the block without `removed`), Terraform destroys the object.

## Summary table

| Task | Modern way | Legacy way |
|---|---|---|
| Bring existing resource under management | `import` block | `terraform import` |
| Rebuild a resource | `apply -replace=ADDR` | `terraform taint` |
| Rename / move address | `moved` block | `terraform state mv` |
| Stop managing (keep the real object) | `removed` block + `destroy = false` | `terraform state rm` |
| Accept out-of-band changes into state | `apply -refresh-only` | `terraform refresh` |

## Quick recap

- [x] `import { to = ..., id = ... }` + `plan -generate-config-out=file.tf`.
- [x] `terraform import` needs the resource block written first; state-only.
- [x] `taint` → deprecated; use `-replace`.
- [x] `moved` = rename without recreate; `removed` = forget without destroy.
