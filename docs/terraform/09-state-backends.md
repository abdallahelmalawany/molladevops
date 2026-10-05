# State, Backends & Workspaces

<span class="exam-tag">Obj 2d</span><span class="exam-tag">Obj 6a–6d</span><span class="exam-tag">Obj 7b</span>

## What is state?

Terraform keeps a **state file** (`terraform.tfstate`, JSON) that records what it manages.

- **Configuration** (`.tf`) = **desired** state.
- **Real infrastructure** = **actual** state.
- **State file** = Terraform's record that **maps** each resource address in code to a real object ID.

State is used to:

1. **Map** configuration to real-world objects (`aws_instance.web` ↔ `i-0abc123`).
2. Track **metadata**, e.g., dependencies needed to destroy in the right order.
3. **Performance**: cache attribute values so large infrastructures don't need to query everything.
4. Enable **collaboration** when stored remotely with locking.

Before most operations Terraform **refreshes** state from the real infrastructure, then `plan` shows the difference between desired and actual.

!!! danger "State contains secrets"
    State stores **all** attribute values in **plain text** — including DB passwords and values marked `sensitive`. Protect it: encrypted remote backend, restricted access, never commit it to Git.

- **Never edit the state file manually.** Use `terraform state` commands.
- Each write creates a backup locally: `terraform.tfstate.backup`.

## Local backend <span class="exam-tag">Obj 6a</span>

- The **default** backend. State is a file on disk: `terraform.tfstate` in the working directory (or `terraform.tfstate.d/<workspace>/` for non-default workspaces).
- Locks using OS file locking.
- Fine for learning / solo work; **not** suitable for teams (no sharing, easily lost, secrets on laptops).

```hcl
terraform {
  backend "local" {
    path = "relative/path/to/terraform.tfstate"   # optional
  }
}
```

## Remote backends <span class="exam-tag">Obj 6c</span>

A **backend** defines **where state is stored**. Remote state lets a team share one source of truth, adds **locking**, and keeps state off laptops.

Common backends: **`s3`**, **`azurerm`**, **`gcs`**, **`kubernetes`**, **`consul`**, **`http`**, **`pg`**, `oss`, `cos`… and **HCP Terraform** (via the `cloud` block).

!!! note "Removed backends"
    `artifactory`, `etcd`, `etcdv3`, `manta` and `swift` backends were **removed in Terraform 1.3**. The course still listed ETCD — don't use it.

Rules for the backend block:

- Only **one** backend per configuration, inside the `terraform` block.
- **No variables or expressions** allowed — use partial configuration instead.
- After adding/changing it, run `terraform init` (it offers to **migrate** existing state).

### S3 backend (with native locking)

```hcl
terraform {
  backend "s3" {
    bucket       = "mycompany-tf-state"
    key          = "network/prod/terraform.tfstate"   # path inside the bucket
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true                               # S3-native state locking (1.10+, GA in 1.11)
  }
}
```

- IAM permissions needed: `s3:ListBucket` on the bucket; `s3:GetObject`, `s3:PutObject` on the key; `s3:DeleteObject` on the `.tflock` file (when using `use_lockfile`).
- Turn on **bucket versioning** (recover old states) and **encryption**; block public access.

!!! warning "Deprecated: DynamoDB locking"
    The course used `dynamodb_table = "state_lock_table"` (table with partition key `LockID`, type String). Since Terraform 1.11 S3 supports **native locking** via `use_lockfile = true` (a `.tflock` object next to the state), and **`dynamodb_table` is deprecated**. During migration you can set both; then remove DynamoDB.

### Partial configuration

Keep environment-specific or secret settings out of code:

```hcl
terraform {
  backend "s3" {}      # empty / partial
}
```

```bash
terraform init -backend-config=backend-prod.hcl
terraform init -backend-config="bucket=mycompany-tf-state" -backend-config="key=app/prod.tfstate"
```

### Changing backends

```bash
terraform init -migrate-state    # copy state from old backend to new one
terraform init -reconfigure      # use new backend config without migrating
```

To go back to local state: remove the backend block and run `terraform init -migrate-state`.

## State locking <span class="exam-tag">Obj 6b</span>

- Prevents **two people/pipelines from writing state at the same time** (corruption, conflicts).
- If the backend supports locking, Terraform locks **automatically** for every operation that could write state (`plan`, `apply`, `destroy`, `import`, `state` commands…).
- If acquiring the lock fails, Terraform **stops**.
- Not every backend supports locking — check its docs. (Local, S3, azurerm, gcs, consul, kubernetes, pg, HCP Terraform do.)

```bash
terraform plan -lock-timeout=120s      # wait for a lock instead of failing immediately
terraform force-unlock LOCK_ID         # manual unlock — only for YOUR stale lock
```

!!! danger "`force-unlock`"
    Only use it when automatic unlocking failed (e.g., a crashed run). If someone else is still running, you'll get two writers and may corrupt state.

## Inspecting and changing state — `terraform state` <span class="exam-tag">Obj 7b</span>

| Command | What it does |
|---|---|
| `terraform state list` | List all resource addresses in state. |
| `terraform state show ADDR` | Show all attributes of one resource. |
| `terraform state mv SRC DST` | Rename/move a resource address (no destroy/recreate). *Prefer `moved` blocks.* |
| `terraform state rm ADDR` | Stop managing a resource — **does not destroy** it. *Prefer `removed` blocks.* |
| `terraform state pull` | Download and print the current (remote) state as JSON. |
| `terraform state push FILE` | Upload a local state file to the backend (dangerous; has safety checks). |
| `terraform state replace-provider OLD NEW` | Change the provider source of resources in state. |
| `terraform show` | Human-readable view of the whole state. |

```bash
terraform state list
terraform state show 'aws_iam_user.users["alice"]'     # quote addresses with brackets
terraform state mv aws_instance.web aws_instance.app
terraform state rm aws_s3_bucket.legacy
```

See [Import & Refactoring](10-import-refactor.md) for `moved`, `removed` and `import` blocks.

## Drift <span class="exam-tag">Obj 6d</span>

**Drift** = real infrastructure changed **outside Terraform** (console click, another tool).

How Terraform handles it:

| Goal | Command |
|---|---|
| Detect drift and **revert** infra to match code | `terraform plan` → `terraform apply` |
| **Accept** the real-world change into state (no infra change) | `terraform apply -refresh-only` (review first with `terraform plan -refresh-only`) |
| Make the code match reality | Update the `.tf` files, then plan shows no changes |
| A resource is broken/degraded → rebuild it | `terraform apply -replace=ADDR` |
| Ignore drift on certain attributes | `lifecycle { ignore_changes = [...] }` |

!!! warning "Deprecated: `terraform refresh`"
    `terraform refresh` updates state **without showing you** what changes and without confirmation. It's deprecated — use **`terraform apply -refresh-only`**, which shows the changes and asks for approval.

HCP Terraform (Standard/Premium plans) offers **automatic drift detection** via health assessments.

## Large infrastructures

Very large configurations hit **provider API rate limits** and slow plans. Options:

- **Split** into smaller configurations, each with its **own directory and state** (network, data, app…) and connect them via outputs / `terraform_remote_state`.
- `-refresh=false` — skip querying remote objects (faster; risk of missing drift).
- `-target=ADDR` — operate on part of the config (exceptional use only).
- `-parallelism=N` — tune concurrent operations.
- HCP Terraform **Stacks** — orchestrate many components/deployments together (newer feature).

## Sharing data between configurations

### `terraform_remote_state` data source

Reads the **root-module outputs** of another configuration's latest state.

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "mycompany-tf-state"
    key    = "network/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id     = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
}
```

- Only **outputs** are accessible, but the reader needs access to the **whole state** (secrets included).
- Alternatives: provider data sources (`aws_vpc`, `aws_subnets` with tag filters), SSM Parameter Store, or in HCP Terraform the **`tfe_outputs`** data source.

## Workspaces (CLI)

**CLI workspaces** let one configuration directory keep **several independent state files** — e.g., `dev`, `staging`, `prod` — using the **same code** and the **same backend**.

```bash
terraform workspace list            # * marks the current one
terraform workspace show
terraform workspace new dev
terraform workspace select prod     # -or-create flag available
terraform workspace delete dev      # must not be current; state must be empty (or -force)
```

- There is always a **`default`** workspace, which can't be deleted.
- Local backend stores non-default workspaces under **`terraform.tfstate.d/<name>/terraform.tfstate`**.
- Use the current name in code with **`terraform.workspace`**:

```hcl
locals {
  instance_type = {
    default = "t3.micro"
    dev     = "t3.micro"
    staging = "t3.medium"
    prod    = "t3.large"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = local.instance_type[terraform.workspace]
  tags          = { Name = "app-${terraform.workspace}" }
}
```

!!! warning "Correction to the course"
    CLI workspaces do **not** keep configurations in separate directories — they share **one** configuration and only separate the **state**. For strongly isolated environments (different credentials, backends, approval rules), use **separate directories / root modules** (or HCP Terraform workspaces).

!!! note "CLI workspaces ≠ HCP Terraform workspaces"
    In HCP Terraform a **workspace** is a full unit of work: its own config source (VCS repo/dir), variables, state, permissions and run history. See [HCP Terraform](13-hcp-terraform.md).

## Quick recap

- [x] State maps code ↔ real IDs, stores metadata, caches attributes; it holds **secrets in plaintext**.
- [x] Default = **local** backend; teams need a **remote** backend with **locking**.
- [x] S3: `use_lockfile = true` (DynamoDB locking is deprecated).
- [x] Backend block: no variables → use `-backend-config`; change ⇒ `init -migrate-state`.
- [x] `state list/show/mv/rm/pull/push`; `rm` doesn't destroy.
- [x] Drift: `apply` to revert, `apply -refresh-only` to accept; `terraform refresh` is deprecated.
- [x] CLI workspaces = same code, separate state; `terraform.workspace`.
