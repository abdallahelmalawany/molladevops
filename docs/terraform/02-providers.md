# Providers

<span class="exam-tag">Obj 2a</span><span class="exam-tag">Obj 2b</span><span class="exam-tag">Obj 2c</span>

## What is a provider?

- A **plugin** that lets Terraform talk to an API: cloud (AWS, Azure, GCP), platform (Kubernetes, Helm), SaaS (GitHub, Datadog, Cloudflare), or utility (`random`, `tls`, `local`, `http`).
- Each provider adds a set of **resource types** and **data sources**.
- Providers are versioned and released **independently** of Terraform Core.
- Find them and their docs on the **Terraform Registry**: <https://registry.terraform.io/browse/providers>

### Provider tiers (Registry badges)

| Tier | Maintained by |
|---|---|
| **Official** | HashiCorp (namespace `hashicorp/…`) |
| **Partner** | Third-party technology companies, reviewed by HashiCorp (formerly shown as *Verified*) |
| **Community** | Individual contributors / community groups |
| **Archived** | No longer maintained (deprecated or moved) |

## Configuring providers

Two blocks work together:

1. **`required_providers`** (inside the `terraform` block) — *which* provider, *from where*, *which version*.
2. **`provider` block** — *how* to configure it (region, credentials, endpoints…).

```hcl
terraform {
  required_version = ">= 1.12.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"   # <HOSTNAME>/<NAMESPACE>/<TYPE>; hostname defaults to registry.terraform.io
      version = "~> 6.0"          # any 6.x
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {               # tags added to every AWS resource
    tags = { ManagedBy = "terraform" }
  }
}
```

- The **local name** (`aws` above) is how you refer to the provider in the module.
- If you omit `required_providers`, Terraform guesses `hashicorp/<name>` — always declare it explicitly.
- A provider with no settings needs no `provider` block at all (e.g., `random`).

## The `terraform` settings block

Configures Terraform itself. Only **constants** are allowed (no variables).

| Setting | Purpose |
|---|---|
| `required_version` | Terraform CLI versions allowed to run this config. |
| `required_providers` | Provider source + version constraints. |
| `backend "<type>" {}` | Where to store state ([State page](09-state-backends.md)). |
| `cloud {}` | Connect to HCP Terraform / Enterprise. |
| `experiments` | Opt-in experimental language features. |
| `provider_meta` | Module metadata passed to providers. |

## Version constraints

| Operator | Meaning | Example |
|---|---|---|
| `=` (or none) | Exactly this version | `= 5.31.0` |
| `!=` | Exclude a version | `!= 5.30.0` |
| `>`, `>=`, `<`, `<=` | Comparisons | `>= 1.12, < 2.0` |
| `~>` | **Pessimistic**: only the right-most number may increase | `~> 6.0` → `>= 6.0, < 7.0`<br>`~> 6.2.1` → `>= 6.2.1, < 6.3.0` |

!!! tip "Best practice"
    - **Root modules**: use `~>` for providers and commit the lock file.
    - **Reusable modules**: set only a **minimum** (`>=`) so callers have flexibility.

## Dependency lock file — `.terraform.lock.hcl`

- Created/updated by `terraform init` in the root module directory. **Commit it to Git.**
- Records for each provider: the **selected version**, the **constraints**, and **checksums (hashes)** of the package.
- On `init`:
    - Provider **not** in the lock file → Terraform picks the **newest version** that matches the constraints and records it.
    - Provider **already** recorded → Terraform **re-selects the same version**, even if a newer one exists.
    - Downloaded packages must match a recorded checksum, otherwise `init` fails (supply-chain protection).
- To move to a newer allowed version: `terraform init -upgrade`.
- The lock file tracks **providers only** — **not** modules (pin modules with `version` or `?ref=`).
- Add hashes for other OS/architectures (e.g., CI runs on Linux, you use macOS):

```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=windows_amd64
```

Example entry:

```hcl
provider "registry.terraform.io/hashicorp/aws" {
  version     = "6.14.0"
  constraints = "~> 6.0"
  hashes = [
    "h1:abc...",
    "zh:123...",
  ]
}
```

Where are plugins stored? In `.terraform/providers/` inside the working directory (never commit `.terraform/`). A shared cache can be enabled with `TF_PLUGIN_CACHE_DIR` / `plugin_cache_dir` in the CLI config file (`~/.terraformrc`).

## Provider authentication (AWS example)

The AWS provider looks for credentials in this order (first match wins):

1. **Parameters in the `provider` block** (`access_key`, `secret_key`, `token`) — :material-alert: never hard-code secrets.
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`, `AWS_PROFILE`.
3. **Shared credentials / config files** (`~/.aws/credentials`, `~/.aws/config`) with a **profile**.
4. Container credentials (ECS task role) / instance profile (EC2 IAM role) / IMDS.

Also supported: `assume_role {}`, `assume_role_with_web_identity {}` (OIDC, used by CI systems), SSO profiles.

=== "Profile (recommended locally)"

    ```hcl
    provider "aws" {
      region  = "us-east-1"
      profile = "dev_admin"
      # optional custom file locations
      shared_config_files      = ["~/.aws/config"]
      shared_credentials_files = ["~/.aws/credentials"]
    }
    ```

=== "Environment variables"

    ```bash
    export AWS_ACCESS_KEY_ID="AKIA..."
    export AWS_SECRET_ACCESS_KEY="..."
    export AWS_REGION="us-west-2"
    terraform plan
    ```

=== "Assume role"

    ```hcl
    provider "aws" {
      region = "us-east-1"
      assume_role {
        role_arn     = "arn:aws:iam::123456789012:role/terraform"
        session_name = "terraform"
      }
    }
    ```

=== "Hard-coded (avoid)"

    ```hcl
    provider "aws" {
      region     = "us-west-2"
      access_key = "my-access-key"   # ends up in Git — don't
      secret_key = "my-secret-key"
    }
    ```

!!! tip "In CI/CD"
    Prefer short-lived credentials: **OIDC** (GitHub Actions / GitLab → AWS IAM role), or **dynamic provider credentials** in HCP Terraform. No long-lived keys stored anywhere.

## Multiple provider configurations — `alias`

Use when you need the **same provider** with different settings: several **regions**, several **accounts/profiles**, or different credentials.

- The block **without** `alias` is the **default** configuration.
- Each extra block gets an `alias`; reference it as `<provider>.<alias>`.

```hcl
provider "aws" {               # default → referenced as aws
  region  = "us-east-1"
  profile = "dev_admin"
}

provider "aws" {
  alias   = "west"             # referenced as aws.west
  region  = "us-west-2"
  profile = "dev_admin"
}

provider "aws" {
  alias   = "prod"             # a different account / user
  region  = "eu-west-1"
  profile = "prod_admin"
}

resource "aws_instance" "east" {
  ami           = "ami-0abc..."
  instance_type = "t3.micro"   # uses default provider
}

resource "aws_instance" "west" {
  provider      = aws.west     # meta-argument selects the alias
  ami           = "ami-0def..."
  instance_type = "t3.micro"
}
```

Passing aliased providers into a **module**:

```hcl
module "dr_site" {
  source    = "./modules/site"
  providers = {
    aws = aws.west
  }
}
```

!!! note "Multiple *different* providers"
    One configuration can use many providers at once (AWS + Cloudflare + Kubernetes…). This is how Terraform handles **multi-cloud and hybrid** workflows <span class="exam-tag">Obj 1c / 2c</span>.

## Useful commands

```bash
terraform providers                 # tree of providers required by config & state
terraform providers schema -json    # full schema of all providers
terraform version                   # CLI + provider versions
terraform init -upgrade             # upgrade providers within constraints
```

## Quick recap

- [x] `required_providers` = source + version; `provider` block = settings.
- [x] `~> 6.0` allows 6.x; `~> 6.2.1` allows 6.2.x.
- [x] `.terraform.lock.hcl` pins provider versions + hashes → commit it; `init -upgrade` to update.
- [x] Lock file does **not** cover modules.
- [x] `alias` + `provider = aws.west` for multi-region / multi-account.
- [x] Never hard-code credentials; prefer profiles, env vars, roles, OIDC.
