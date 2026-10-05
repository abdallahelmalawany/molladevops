# Terraform Associate (004) Exam Guide

## Exam facts

| Item | Detail |
|---|---|
| Exam | HashiCorp Certified: **Terraform Associate (004)** — replaced **003** |
| Version tested | **Terraform 1.12** |
| Format | Online proctored (webcam, quiet room) |
| Question types | Multiple choice, multiple select, true/false |
| Questions | ~57–60 (not officially published) |
| Duration | **1 hour** |
| Price | **US$70.50** + local taxes (free retake **not** included) |
| Language | English |
| Validity | **2 years** |

Official page & booking: <https://developer.hashicorp.com/certifications/infrastructure-automation>

!!! info "What's new in 004 vs 003"
    - Tested on Terraform **1.12** (003 tested an older 1.x release).
    - New objectives: **4f** `depends_on` & `create_before_destroy`, **4g** custom conditions, **4h** ephemeral values & write-only arguments (secrets incl. Vault), **8c** HCP Terraform **workspaces and projects**.
    - HCP Terraform (not "Terraform Cloud") wording throughout.

## Objectives → where to study

| # | Objective | Page |
|---|---|---|
| **1** | **Infrastructure as Code with Terraform** | |
| 1a | Explain what IaC is | [Introduction](01-introduction.md) |
| 1b | Advantages of IaC patterns | [Introduction](01-introduction.md#benefits-of-iac) |
| 1c | Multi-cloud, hybrid, service-agnostic workflows | [Introduction](01-introduction.md#why-terraform), [Providers](02-providers.md) |
| **2** | **Terraform fundamentals** | |
| 2a | Install and version providers | [Providers](02-providers.md) |
| 2b | How Terraform uses providers | [Providers](02-providers.md) |
| 2c | Configuration with multiple providers | [Providers → alias](02-providers.md#multiple-provider-configurations-alias) |
| 2d | How Terraform uses and manages state | [State](09-state-backends.md) |
| **3** | **Core workflow** | |
| 3a–3g | Workflow, init, validate, plan, apply, destroy, fmt | [Workflow & CLI](04-workflow-cli.md) |
| **4** | **Terraform configuration** | |
| 4a | `resource` vs `data` | [Resources & Data](03-resources-data.md) |
| 4b | Attributes & cross-resource references | [Resources & Data](03-resources-data.md#referencing-attributes-cross-resource-references) |
| 4c | Variables and outputs | [Variables & Outputs](05-variables-outputs.md) |
| 4d | Complex types | [Variables → types](05-variables-outputs.md#type-constraints) |
| 4e | Expressions and functions | [Expressions & Functions](06-expressions-functions.md) |
| 4f | Resource dependencies (`depends_on`, `create_before_destroy`) | [Dependencies](03-resources-data.md#resource-dependencies) |
| 4g | Custom conditions | [Validation](07-validation-conditions.md) |
| 4h | Sensitive data, Vault, ephemeral, write-only | [Secrets](12-secrets-security.md) |
| **5** | **Modules** | [Modules](11-modules.md) |
| **6** | **State management** (local backend, locking, remote backend, drift) | [State](09-state-backends.md) |
| **7** | **Maintain infrastructure** (import, inspect state, verbose logging) | [Import](10-import-refactor.md), [State](09-state-backends.md#inspecting-and-changing-state-terraform-state-obj-7b), [Debug](04-workflow-cli.md#debugging-logging-obj-7c) |
| **8** | **HCP Terraform** | [HCP Terraform](13-hcp-terraform.md) |

## High-yield facts (memorise)

- `terraform init` is the **first** command; it's safe to re-run. `-upgrade` updates providers/modules.
- `terraform validate` needs `init`, does **not** call cloud APIs.
- `terraform fmt` only formats the **current directory** unless `-recursive`.
- `plan` is speculative; `apply tfplan` runs **without** prompting.
- `terraform destroy` ≡ `terraform apply -destroy`.
- Lock file `.terraform.lock.hcl` → **providers only**, commit it.
- `~> 1.2.0` → `>= 1.2.0, < 1.3.0`; `~> 1.2` → `>= 1.2, < 2.0`.
- Variable precedence: **-var / -var-file > *.auto.tfvars > terraform.tfvars.json > terraform.tfvars > TF_VAR_ env > default**.
- `sensitive = true` hides from CLI, **not** from state. `ephemeral = true` keeps out of state.
- `for_each` needs a **map or set**; `count` uses indexes.
- `depends_on` only when there's no reference; implicit dependencies are preferred.
- Provisioners are a **last resort**; failed creation-time provisioner ⇒ resource **tainted**.
- `terraform taint` & `terraform refresh` are **deprecated** → `-replace`, `-refresh-only`.
- `terraform state rm` doesn't destroy anything.
- Backend blocks can't use variables → partial config with `-backend-config`.
- Not all backends support locking; `force-unlock` only for your own stuck lock.
- CLI workspaces share code, separate **state**; default workspace can't be deleted.
- Module `version` only works for **registry** modules.
- Registry module format: `NAMESPACE/NAME/PROVIDER`; private: `HOST/ORG/NAME/PROVIDER`.
- Public module repo name: `terraform-<PROVIDER>-<NAME>`.
- `TF_LOG` levels: TRACE (most verbose), DEBUG, INFO, WARN, ERROR (+ JSON); `TF_LOG_PATH` to file.
- Sentinel runs **after plan, before apply**: advisory / soft-mandatory / hard-mandatory.
- HCP Terraform: organization → project → workspace; VCS, CLI and API-driven workflows.
- Terraform Enterprise = self-hosted HCP Terraform; supports **air-gapped** installs.
- Terraform has **no user-defined functions**.
- Terraform state is stored as **JSON**, in plain text.

## Common traps

!!! question "Trap: `terraform plan` changes nothing — but does it refresh?"
    Yes, plan refreshes state **in memory** to compare, but doesn't write state (except with `-refresh-only` apply).

!!! question "Trap: which command shows only one output as plain text?"
    `terraform output -raw NAME`.

!!! question "Trap: can you use `count` and `for_each` together?"
    No — one or the other per block.

!!! question "Trap: where are local workspace states stored?"
    `terraform.tfstate.d/<workspace>/terraform.tfstate`.

!!! question "Trap: does `terraform import` (command) write configuration?"
    No. Only `import` blocks with `plan -generate-config-out` generate HCL.

!!! question "Trap: does `.terraform.lock.hcl` lock module versions?"
    No — providers only.

## Practice questions

??? question "1. You need to create the replacement EC2 instance before the old one is destroyed. What do you use?"
    `lifecycle { create_before_destroy = true }`.

??? question "2. `TF_VAR_env=dev`, `terraform.tfvars` has `env = \"stage\"`, `prod.auto.tfvars` has `env = \"prod\"`. No CLI flags. Value of `var.env`?"
    **prod** — `*.auto.tfvars` overrides `terraform.tfvars`, which overrides env vars.

??? question "3. Which block lets you warn about a failing health endpoint without failing the apply?"
    A `check` block with an `assert`.

??? question "4. A teammate's apply crashed and the S3 state lock remains. What command releases it?"
    `terraform force-unlock LOCK_ID` — only once you're sure nobody else is running.

??? question "5. True/False: Marking an output `sensitive = true` prevents the value from being stored in state."
    **False.** Use ephemeral values / write-only arguments to keep values out of state.

??? question "6. How do you rename `aws_instance.web` to `aws_instance.app` without recreating it?"
    Add a `moved { from = aws_instance.web  to = aws_instance.app }` block (or `terraform state mv`).

??? question "7. Which Sentinel enforcement level can be overridden by authorised users?"
    **Soft mandatory.**

??? question "8. What's the module source for version `1.0.0` of module `vpc` for AWS in the private registry of org `acme` on HCP Terraform?"
    `source = "app.terraform.io/acme/vpc/aws"` with `version = "1.0.0"`.

??? question "9. Which command upgrades providers to the latest version allowed by the constraints?"
    `terraform init -upgrade`.

??? question "10. Which workflow runs a speculative plan automatically when a pull request is opened?"
    The **VCS-driven** workflow in HCP Terraform.

## Study resources

- Official study path (004): <https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-study-004>
- Official review / content list (004): <https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004>
- Terraform docs: <https://developer.hashicorp.com/terraform/docs>
- Do the [labs](15-labs.md) and use extra practice exams.
