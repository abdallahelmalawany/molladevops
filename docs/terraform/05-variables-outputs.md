# Variables, Locals & Outputs

<span class="exam-tag">Obj 4c</span><span class="exam-tag">Obj 4d</span>

Think of a module like a function:

| Terraform | Function analogy |
|---|---|
| **Input variables** (`var.x`) | Function arguments |
| **Local values** (`local.x`) | Temporary local variables |
| **Output values** (`output`) | Return values |

## Input variables

Declared with a `variable` block, referenced as **`var.<name>`**. They let the same code be reused across environments without hard-coding values.

```hcl
variable "vpn_ip" {
  description = "CIDR allowed to reach the admin ports"
  type        = string
  default     = "118.10.10.118/32"
}

resource "aws_security_group" "admin" {
  name = "admin-access"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpn_ip]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpn_ip]
  }
}
```

### Variable block arguments

| Argument | Meaning |
|---|---|
| `default` | Value used when none is supplied. **No default ⇒ the variable is required.** |
| `type` | Type constraint (see below). |
| `description` | Documentation (shown in prompts, registry docs). |
| `validation {}` | Custom rule(s) — see [Validation](07-validation-conditions.md). |
| `sensitive` | Hide value in CLI output (still stored in state). |
| `nullable` | `false` ⇒ `null` is not allowed; the default is used instead. |
| `ephemeral` | Value is available during the run but **never stored** in state/plan (1.10+). See [Secrets](12-secrets-security.md). |

### Reserved names

These names **cannot** be used as variable names (they are module meta-arguments):
`source`, `version`, `providers`, `count`, `for_each`, `lifecycle`, `depends_on`, `locals`.

## Ways to assign variables

=== "Default value"

    ```hcl
    variable "instance_type" {
      default = "t3.micro"
    }
    ```

=== "terraform.tfvars / *.auto.tfvars"

    Loaded **automatically**.

    ```hcl
    # terraform.tfvars
    instance_type = "t3.small"
    azs           = ["us-east-1a", "us-east-1b"]
    ```

=== "-var-file"

    Any file name, loaded explicitly.

    ```bash
    terraform apply -var-file="prod.tfvars"
    ```

=== "-var flag"

    ```bash
    terraform apply -var="instance_type=t3.large" -var='azs=["us-east-1a"]'
    ```

=== "Environment variable"

    ```bash
    export TF_VAR_instance_type=t3.medium
    ```

=== "Interactive prompt"

    If a required variable has no value from any source, Terraform **prompts** for it (unless `-input=false`, then it errors).

### Variable definition precedence

Terraform loads values in this order — **later sources override earlier ones**:

1. `default` in the variable block *(lowest)*
2. **Environment variables** `TF_VAR_name`
3. **`terraform.tfvars`**
4. **`terraform.tfvars.json`**
5. **`*.auto.tfvars` / `*.auto.tfvars.json`** (in lexical file-name order)
6. **`-var` and `-var-file`** on the command line, in the order given *(highest)*

!!! example "Exam trap"
    `TF_VAR_region=us-west-1`, `terraform.tfvars` sets `us-east-2`, and you run `-var region=eu-west-1` → result **eu-west-1**.
    Without the `-var` flag → **us-east-2** (tfvars beats env vars).

- A variable can't be assigned twice in the **same** source.
- In HCP Terraform, workspace variables behave like `*.auto.tfvars`.

## Type constraints

### Primitive types

| Type | Example |
|---|---|
| `string` | `"hello"` |
| `number` | `15`, `6.28` |
| `bool` | `true`, `false` |

### Collection types (all elements the same type)

| Type | Description | Example |
|---|---|---|
| `list(<TYPE>)` | Ordered sequence, index from **0**, duplicates allowed | `["us-east-1a", "us-east-1b"]` |
| `map(<TYPE>)` | Key → value, keys are strings | `{ dev = "t3.micro", prod = "t3.large" }` |
| `set(<TYPE>)` | **Unordered**, **unique** values, no index access | `toset(["a", "b"])` |

### Structural types (elements may differ)

| Type | Description |
|---|---|
| `object({ name = string, age = number })` | Fixed set of named attributes with their own types |
| `tuple([string, number, bool])` | Fixed-length sequence, each position has its own type |

`any` = accept any type (Terraform infers it). `list(any)`, `map(any)` = elements of one inferred type.

```hcl
variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "instance_types" {
  type = map(string)
  default = {
    us-east-1  = "t3.micro"
    us-west-2  = "t3.nano"
    ap-south-1 = "t3.small"
  }
}

variable "server" {
  type = object({
    name     = string
    size     = string
    disk_gb  = optional(number, 20)   # optional attribute with default (1.3+)
    tags     = optional(map(string), {})
  })
}

resource "aws_instance" "web" {
  ami               = data.aws_ami.al2023.id
  instance_type     = var.instance_types["us-east-1"]   # map → by key
  availability_zone = var.azs[0]                        # list → by index
}
```

!!! tip "Type conversion"
    Terraform auto-converts where safe (`"5"` ↔ `5`, `"true"` ↔ `true`). Explicit functions: `tostring`, `tonumber`, `tobool`, `tolist`, `toset`, `tomap`.

## Local values

A `locals` block names an **expression** so you can reuse it. Referenced as **`local.<name>`** (singular!).

```hcl
locals {
  common_tags = {
    Owner       = "platform-team"
    Environment = var.env
    Service     = "database"
  }
  name_prefix = "${var.project}-${var.env}"
}

resource "aws_instance" "db" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.large"
  tags          = merge(local.common_tags, { Name = "${local.name_prefix}-db" })
}
```

### Locals vs. variables

| | Input variable | Local value |
|---|---|---|
| Set by | The **caller / user** (tfvars, CLI, env) | The **module author** only |
| Can be overridden from outside | Yes | **No** |
| Can contain expressions / references | Default must be a literal* | Yes — any expression |
| Use for | Things that differ per environment | Repeated values, computed names, values you want to **lock down** inside a module |

\* Variable defaults can't reference other variables, resources or functions.

- Locals don't change during a run and can't be set from the command line.
- Don't overuse locals: too many indirections make code hard to read.

## Output values

Expose values after `apply`: print them in the CLI, pass them to a **parent module**, or share them with **another configuration** (`terraform_remote_state` / `tfe_outputs`).

```hcl
output "instance_id" {
  value = aws_instance.web.id
}

output "instance_ip_addr" {
  value       = aws_instance.web.private_ip
  description = "Private IP of the main server."
}

output "db_password" {
  value     = aws_db_instance.db.password
  sensitive = true          # shown as (sensitive value) in CLI
}

output "all_user_arns" {
  value = aws_iam_user.users[*].arn   # splat → list
}

output "web_url" {
  value = "http://${aws_lb.web.dns_name}"

  # The SG rule must exist before the URL is usable.
  depends_on = [aws_security_group_rule.http_in]
}
```

| Argument | Notes |
|---|---|
| `value` | **Required.** Any expression. |
| `description` | Documentation. |
| `sensitive` | Hides value in CLI/plan output. **Still stored in plaintext in state** and visible with `terraform output -json` / `terraform output NAME`. |
| `depends_on` | Rare; last resort with a comment. |
| `ephemeral` | (child modules only, 1.10+) pass ephemeral values without storing them. |
| `precondition` | Validate before exposing. |

Reading outputs:

```bash
terraform output                    # all root outputs
terraform output instance_id        # one output (quoted string)
terraform output -raw instance_id   # plain string, good for scripts
terraform output -json              # JSON, includes sensitive values!
```

!!! note
    Only **root module** outputs are shown by `terraform output`. A child module's outputs are accessed by the parent as `module.<name>.<output>`.

## String interpolation & templates

- `"${ ... }"` inserts the result of an expression into a string:

```hcl
name = "Hello, ${var.name}!"       # → "Hello, Abdallah!"
```

- `%{ if }` / `%{ for }` **directives** inside strings:

```hcl
greeting = "Hello, %{ if var.name != "" }${var.name}%{ else }unnamed%{ endif }!"
```

- **Heredoc** strings for multi-line text (`<<-EOT` strips leading indentation):

```hcl
user_data = <<-EOT
  #!/bin/bash
  echo "env=${var.env}" > /etc/app.conf
EOT
```

- A reference on its own doesn't need interpolation: write `ami = var.ami`, **not** `ami = "${var.ami}"` (old 0.11 style).

## Quick recap

- [x] `var.x` inputs, `local.x` internal expressions, `output` return values.
- [x] No `default` ⇒ required variable (prompt or error).
- [x] Precedence (low → high): default < env `TF_VAR_` < `terraform.tfvars` < `.tfvars.json` < `*.auto.tfvars` < `-var`/`-var-file`.
- [x] Types: string, number, bool · list, map, set · object, tuple · `optional()`.
- [x] `sensitive = true` hides from CLI but **not** from state.
