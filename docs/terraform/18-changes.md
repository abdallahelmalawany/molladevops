# What Changed vs. the Course

The original course slides (written for Terraform ~1.5 and the **003** exam) were reorganised, rewritten and updated. This page lists every correction, removal and addition so you know what differs from the PDF.

## Removed or replaced (deprecated / outdated)

| In the course | Status today | Now in these notes |
|---|---|---|
| "Terraform Cloud" | Renamed **HCP Terraform** (2024) | [HCP Terraform](13-hcp-terraform.md) |
| `terraform taint` | Deprecated since 0.15.2 | `terraform apply -replace=ADDR` |
| `terraform refresh` | Deprecated | `terraform apply -refresh-only` |
| `null_resource` (null provider) | Superseded (1.4) | `terraform_data` |
| S3 backend `dynamodb_table` locking | Deprecated (1.11) | `use_lockfile = true` |
| `backend "remote"` for Terraform Cloud | Legacy | `cloud {}` block |
| `aws_eip { vpc = true }` | Deprecated in AWS provider v5 | `domain = "vpc"` |
| AWS provider `~> 4.0` in examples | Old major version | `~> 6.0` |
| `amazon-linux-extras install nginx1` | Amazon Linux 2 only (EOL 30 Jun 2026) | `dnf install` on Amazon Linux 2023 |
| `#!bin/bash` in capstone user data | Typo | `#!/bin/bash` |
| ETCD listed as a backend | `etcd`/`etcdv3` backends removed in 1.3 | Current backend list |
| `required_version = "<0.11"` example | Pre-1.0 | `>= 1.12.0` |
| `aws_instance.web.*.public_ip` | Legacy splat | `aws_instance.web[*].public_ip` |
| Exam **003** info (57 Q, PSI) | 003 retired | **004** exam page |
| webgraphviz.com for graphs | Third-party site, unreliable | Graphviz `dot -Tsvg` locally |
| Terraform Cloud pricing tiers link | Changed | Current pricing page link |

## Corrected statements

| Course said | Correct version |
|---|---|
| Terraform is "open source" | Source-available under **BSL 1.1** since 1.6; OpenTofu is the open-source fork |
| Provider tiers: Official, **Verified**, Community, Archived | Official, **Partner**, Community, Archived |
| "Verified modules are always maintained by HashiCorp" | Partner/verified modules are maintained by the **partner**, reviewed by HashiCorp |
| Workspaces keep "configurations in separate directories" | CLI workspaces share **one** configuration; only **state** is separated |
| Terraform loads files "in alphabetical order" | All `.tf` files are merged into one configuration; order doesn't matter |
| Validation example `substr(var.server_ami, 0, 3) == "ami-"` | Must be `substr(..., 0, 4)` (or `startswith`) |
| Reserved variable names list (6 names) | Also `version` and `locals` |
| Variable precedence list without defaults/CLI note | Full list incl. defaults (lowest) and `-var`/`-var-file` (highest) |
| `Prevent_destroy` | Arguments are case-sensitive: `prevent_destroy` |
| Capstone: both servers print "server *1*" | Script prints the real hostname and AZ |

## Added (missing from the course)

**Language & configuration**

- `for` expressions, `optional()` object attributes, `object`/`tuple` types, `nullable`
- Full **lifecycle** options: `replace_triggered_by`, preconditions/postconditions
- **Custom conditions**: `precondition`, `postcondition`, `check` blocks <span class="exam-tag">Obj 4g</span>
- Cross-variable validation (1.9)
- Provider-defined functions (1.8), more built-in functions (`templatefile`, `try`, `can`, `cidrsubnet`…)
- String directives and heredocs
- `self`, `path.module`, `terraform.workspace` references

**Workflow & state**

- More CLI flags: `-detailed-exitcode`, `-lock-timeout`, `-parallelism`, `-reconfigure`, `-migrate-state`, `-backend-config`
- `terraform console`, `terraform test` (1.6), `terraform providers lock`, `state replace-provider`, `output -raw/-json`
- `TF_LOG_CORE`, `TF_LOG_PROVIDER`, `TF_LOG=JSON`, `crash.log`
- **Drift** handling table <span class="exam-tag">Obj 6d</span>
- Partial backend configuration & state migration
- **`moved`** (1.1) and **`removed`** (1.7) blocks; `import` with `for_each` (1.7)

**Security**

- **Ephemeral variables/outputs/resources** (1.10) and **write-only arguments** (1.11) <span class="exam-tag">Obj 4h</span>
- Vault provider examples (data source vs. ephemeral)
- OIDC / dynamic provider credentials, code scanning tools

**HCP Terraform**

- **Projects** and workspace organisation <span class="exam-tag">Obj 8c</span>
- VCS / CLI / API workflows, execution modes, agents
- Variable sets, run triggers, run tasks, OPA, health assessments, no-code modules, Stacks, `tfe_outputs`
- `terraform login` and the `cloud` block

**Practice**

- Solution sketches for all assignments, a new remote-state lab, CI/CD pipeline example, `.gitignore` template, cheat sheet, practice questions.
