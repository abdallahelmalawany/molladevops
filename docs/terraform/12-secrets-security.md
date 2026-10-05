# Secrets & Sensitive Data

<span class="exam-tag">Obj 4h</span>

## Golden rules

- **Never** put secrets (passwords, access keys, tokens) in `.tf` files, `.tfvars` files committed to Git, or anywhere in version control.
- **Never** store secrets in plain text.

Why plain-text secrets are dangerous:

- Anyone with repo access has the secret.
- Every clone (laptops, CI runners) keeps a copy — forever, in Git history.
- Every tool that reads the repo can read the secret.
- No way to **audit** who used it or to **revoke** access.

## Where secrets can leak in Terraform

| Place | Protection |
|---|---|
| `.tf` / `.tfvars` in Git | Don't put them there; `.gitignore` secret files |
| CLI output / logs | `sensitive = true` |
| **State file** | Encrypted remote backend + strict access; **ephemeral** values / write-only args |
| **Saved plan files** | Treat as secret; don't upload as public CI artifacts |
| `TF_LOG` debug logs | Don't share unchecked |

## 1. Mark values as `sensitive`

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

output "db_password" {
  value     = var.db_password
  sensitive = true      # required when an output contains a sensitive value
}
```

- Terraform shows `(sensitive value)` in plan/apply output.
- Sensitivity **propagates**: expressions using a sensitive value become sensitive.
- :material-alert: The value is **still stored in plain text in state** (and visible via `terraform output -json`).
- Functions: `sensitive(value)` marks a value; `nonsensitive(value)` removes the mark (use carefully).

## 2. Pass secrets through environment variables

```bash
export TF_VAR_db_password="S3cr3t!"      # sets var.db_password
terraform apply
unset TF_VAR_db_password                 # remove afterwards
```

Keeps the value out of code — but it still ends up in **state** if a resource argument stores it.

## 3. Ephemeral values & write-only arguments (Terraform 1.10 / 1.11+)

!!! abstract "New in exam 004"

These features keep secrets **out of state and plan files entirely**.

### Ephemeral input variables and outputs (1.10)

```hcl
variable "db_password" {
  type      = string
  sensitive = true
  ephemeral = true        # available during the run, never persisted
}
```

- Ephemeral values can only be used in places that accept them: other ephemeral variables/outputs (child modules), locals, **ephemeral resources**, **write-only arguments**, provider and provisioner configuration.
- Using one in a normal resource argument is an error.

### Ephemeral resources (1.10)

An `ephemeral` block **fetches/creates** a temporary value (e.g., a secret or a token) for the duration of the run — never written to state.

```hcl
ephemeral "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/db/password"
}
```

Referenced as `ephemeral.<TYPE>.<NAME>.<ATTR>`.

### Write-only arguments (1.11)

Resource arguments (names usually end in `_wo`) that accept a value but **never store it** in plan or state. They go with a `_wo_version` argument you bump to trigger an update.

```hcl
resource "aws_db_instance" "main" {
  identifier          = "app-db"
  engine              = "postgres"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  username            = "app"
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db.secret_string
  password_wo_version = 1          # increment to rotate
  skip_final_snapshot = true
}
```

## 4. Use a secrets manager — HashiCorp Vault

Store secrets in **Vault** (or AWS Secrets Manager / SSM Parameter Store, Azure Key Vault) and read them at run time with the matching provider.

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
  # token from VAULT_TOKEN env var, or auth_login {} block
}

# Classic data source — value WILL be stored in state
data "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "prod/db"
}

# Ephemeral resource (recent Vault provider releases) — NOT stored in state
ephemeral "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "prod/db"
}

resource "aws_db_instance" "main" {
  # ...
  password_wo         = ephemeral.vault_kv_secret_v2.db.data["password"]
  password_wo_version = 1
}
```

Vault benefits:

- Central storage, encryption, fine-grained policies, **audit log**, **revocation**.
- **Dynamic secrets**: Vault generates short-lived credentials (e.g., AWS keys valid for 1 hour) on demand.
- Install: <https://developer.hashicorp.com/vault/install> · Dev server for labs: `vault server -dev`.

## 5. Short-lived cloud credentials

- Locally: AWS SSO / profiles, never long-lived keys in files you share.
- CI/CD: **OIDC** federation (GitHub Actions, GitLab CI → IAM role).
- HCP Terraform: **dynamic provider credentials** (workload identity) for AWS, Azure, GCP, Vault.

## 6. Protect state

- Remote backend with **encryption at rest** (S3 SSE-KMS, `encrypt = true`) and **TLS**.
- Restrict IAM access to the state bucket/workspace.
- Enable versioning for recovery.
- Never commit `*.tfstate` to Git.

## Static security scanning (good to know)

Scan Terraform code in CI before apply: **Trivy** (formerly tfsec), **Checkov**, **TFLint**, **KICS**, plus policy as code (**Sentinel**, **OPA**) in HCP Terraform.

## Quick recap

- [x] No secrets in code or Git; use env vars (`TF_VAR_`), Vault/secret managers, OIDC.
- [x] `sensitive = true` hides from CLI only — **state still has it**.
- [x] `ephemeral = true` variables, `ephemeral` resources and `*_wo` write-only arguments keep secrets **out of state**.
- [x] Vault provider: data sources (stored in state) vs. ephemeral resources (not stored).
- [x] Encrypt and lock down remote state.
