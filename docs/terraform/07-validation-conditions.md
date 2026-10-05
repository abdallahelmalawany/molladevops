# Validation & Custom Conditions

<span class="exam-tag">Obj 4g</span>

!!! abstract "New in exam 004"
    Custom conditions were not in the original course. They are now an exam objective.

Terraform offers several layers of checks:

| Mechanism | Where | When it runs | On failure |
|---|---|---|---|
| **Type constraints** | `variable { type = ... }` | Early (plan) | Error |
| **`validation` block** | `variable` (and `output` with precondition) | Plan, when the value is known | **Error**, run stops |
| **`precondition`** | `lifecycle` of resource / data / output | Before the object is planned / applied | **Error** |
| **`postcondition`** | `lifecycle` of resource / data | After the object is created/read | **Error** (downstream objects stop) |
| **`check` block** | Top level | End of plan and apply | **Warning** only, run continues |

## Input variable validation

```hcl
variable "server_ami" {
  type        = string
  description = "AMI ID for the EC2 instance."

  validation {
    condition     = length(var.server_ami) > 4 && substr(var.server_ami, 0, 4) == "ami-"
    error_message = "The server_ami value must be a valid AMI id, starting with \"ami-\"."
  }
}

variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

variable "cidr" {
  type = string
  validation {
    condition     = can(cidrhost(var.cidr, 0))     # can() → true if expression succeeds
    error_message = "cidr must be a valid IPv4 CIDR block."
  }
}
```

- `condition` must evaluate to `true`/`false`; `error_message` is a full sentence.
- You can have **multiple** `validation` blocks per variable.
- Since **Terraform 1.9**, a condition can also reference **other variables, locals and data sources** (before 1.9 only the variable itself).

!!! bug "Fixed from the course"
    The course example used `substr(var.server_ami, 0, 3) == "ami-"` — a 3-character substring can never equal the 4-character `"ami-"`. Correct is `substr(..., 0, 4)` (or `startswith(var.server_ami, "ami-")`).

## Preconditions and postconditions

Placed in a `lifecycle` block (resources/data) or directly in an `output`.

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type

  lifecycle {
    # Checked BEFORE creating: are our assumptions valid?
    precondition {
      condition     = data.aws_ami.app.architecture == "x86_64"
      error_message = "The selected AMI must be for the x86_64 architecture."
    }

    # Checked AFTER creating: did we get what we needed?
    postcondition {
      condition     = self.public_dns != ""
      error_message = "EC2 instance must be in a VPC that assigns public DNS hostnames."
    }
  }
}

output "api_url" {
  value = "https://${aws_lb.api.dns_name}"
  precondition {
    condition     = aws_lb.api.internal == false
    error_message = "The API load balancer must be internet-facing."
  }
}
```

- `self` is available in **postconditions** to refer to the resource's own attributes.
- Use **preconditions** for *assumptions* about inputs, **postconditions** for *guarantees* about results.

## `check` blocks (Terraform 1.5+)

Continuous validation of your infrastructure that **doesn't block** the run — failures appear as **warnings**. Can contain a **scoped data source** that is only used for the check.

```hcl
check "website_health" {
  data "http" "site" {
    url = "https://${aws_lb.web.dns_name}"
  }

  assert {
    condition     = data.http.site.status_code == 200
    error_message = "${data.http.site.url} returned HTTP ${data.http.site.status_code}."
  }
}
```

- Runs at the end of every `plan` and `apply`.
- In HCP Terraform, **health assessments** re-run checks on a schedule (continuous validation).

## Choosing the right tool

| You want to… | Use |
|---|---|
| Reject bad user input | `validation` in the `variable` |
| Verify assumptions about data/other resources before creating | `precondition` |
| Guarantee a property of the created object | `postcondition` |
| Monitor something without failing the run | `check` block |
| Enforce org-wide rules (e.g., "no public S3") | Policy as code: Sentinel / OPA in HCP Terraform |

## Quick recap

- [x] `validation` → variables; **error**.
- [x] `precondition` / `postcondition` → inside `lifecycle` (or output); **error**; `self` in postconditions.
- [x] `check` + `assert` → top-level; **warning only**.
- [x] `can(expr)` / `try(expr, default)` are handy inside conditions.
