# Modules & Registry

<span class="exam-tag">Obj 5a–5d</span>

## What is a module?

- A **module** = a set of `.tf` / `.tf.json` files in **one directory**. Every Terraform configuration is a module.
- The directory where you run Terraform is the **root module**.
- A module called from another module is a **child module**.
- Modules are the main way to **package and reuse** configuration (DRY), enforce standards, and hide complexity.

```text
project1/                 ← root module
├── main.tf
└── ...
modules/
├── ec2/                  ← child module
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── sg/
```

## Calling a module

```hcl
module "web_server" {
  source = "../../modules/ec2"     # required

  # input variables of the child module
  instance_type = "t3.large"
  subnet_id     = aws_subnet.public.id
}
```

Arguments of a `module` block:

| Argument | Notes |
|---|---|
| `source` | **Required.** Where the module lives (see sources below). |
| `version` | Version constraint — **only for registry modules**. |
| `<input> = value` | Values for the child's input variables. |
| `count` / `for_each` | Multiple instances of the module (0.13+). |
| `providers` | Pass (aliased) providers to the child. |
| `depends_on` | Explicit dependency on other resources/modules. |

After adding or changing a module `source`, run **`terraform init`** (or `terraform get`) to download it into `.terraform/modules/`.

## Module sources <span class="exam-tag">Obj 5a</span>

| Source | Example |
|---|---|
| **Local path** (must start with `./` or `../`) | `source = "./modules/vpc"` |
| **Terraform Registry** (`<NAMESPACE>/<NAME>/<PROVIDER>`) | `source = "terraform-aws-modules/vpc/aws"` |
| **Private registry** (`<HOST>/<ORG>/<NAME>/<PROVIDER>`) | `source = "app.terraform.io/my-org/vpc/aws"` |
| **GitHub** (HTTPS / SSH) | `source = "github.com/hashicorp/example"`<br>`source = "git@github.com:hashicorp/example.git"` |
| **Bitbucket** | `source = "bitbucket.org/hashicorp/terraform-consul-aws"` |
| **Generic Git** | `source = "git::https://example.com/vpc.git"`<br>`source = "git::ssh://username@example.com/storage.git"` |
| **Mercurial** | `source = "hg::http://example.com/vpc.hg"` |
| **HTTP URL** (archive) | `source = "https://example.com/vpc-module.zip"` |
| **S3 bucket** | `source = "s3::https://s3-eu-west-1.amazonaws.com/bucket/vpc.zip"` |
| **GCS bucket** | `source = "gcs::https://www.googleapis.com/storage/v1/modules/foomodule.zip"` |

Git options:

```hcl
# Specific branch, tag or commit with ?ref=
module "vpc" {
  source = "git::https://github.com/acme/terraform-vpc.git?ref=v1.4.0"
}

# A sub-directory of a repo with //
module "consul" {
  source = "git::https://github.com/hashicorp/terraform-aws-consul.git//modules/consul-cluster?ref=v0.11.0"
}
```

By default Git sources use the repository's **default branch (HEAD)**. Pin with `ref` (tag or commit SHA) for reproducibility.

## Variable scope in modules <span class="exam-tag">Obj 5b</span>

- A child module **can't see** the parent's variables, locals or resources — and vice versa. Everything must be passed explicitly:
    - **Parent → child**: as module **input arguments** (child's `variable` blocks).
    - **Child → parent**: through the child's **`output`** blocks, read as `module.<NAME>.<OUTPUT>`.
- Don't hard-code environment-specific values in a child module; expose them as **variables with sensible defaults**.
- Values set in the module block **override** the child's defaults.
- Use **locals** inside the child for values callers must **not** be able to change.

=== "Child: modules/ec2/main.tf"

    ```hcl
    variable "instance_type" {
      type    = string
      default = "t3.micro"            # caller can override
    }

    locals {
      ami_owner = "amazon"            # caller can NOT override
    }

    data "aws_ami" "al2023" {
      most_recent = true
      owners      = [local.ami_owner]
      filter {
        name   = "name"
        values = ["al2023-ami-*-x86_64"]
      }
    }

    resource "aws_instance" "this" {
      ami           = data.aws_ami.al2023.id
      instance_type = var.instance_type
    }

    output "instance_id" {
      value = aws_instance.this.id
    }
    ```

=== "Root: main.tf"

    ```hcl
    module "ec2" {
      source        = "../modules/ec2"
      instance_type = "t3.large"      # overrides default
    }

    output "web_id" {
      value = module.ec2.instance_id  # module.<name>.<output>
    }
    ```

!!! example "Child module outputs as inputs"

    ```hcl
    module "sg" {
      source = "../modules/sg"
    }

    resource "aws_instance" "app" {
      ami                    = data.aws_ami.al2023.id
      instance_type          = "t3.micro"
      vpc_security_group_ids = [module.sg.sg_id]   # child must declare output "sg_id"
    }
    ```

## Terraform Registry

<https://registry.terraform.io> — public **providers** and **modules**.

- Registry module address: **`<NAMESPACE>/<NAME>/<PROVIDER>`**, e.g. `hashicorp/consul/aws`, `terraform-aws-modules/vpc/aws`.
- Modules are backed by public **GitHub repositories**; versions come from Git **tags** (semantic versioning).
- **Partner** (verified) modules are maintained by third-party vendors and reviewed by HashiCorp.
- The Registry auto-generates docs: inputs, outputs, dependencies, resources, examples.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name            = "main"
  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
}
```

!!! note "Correction to the course"
    Verified/partner modules are **not** maintained by HashiCorp — they're maintained by the partner company. HashiCorp maintains modules under its own namespace.

## Module versions <span class="exam-tag">Obj 5d</span>

- `version` works **only** for modules from a **registry** (public or private).
- For Git sources use `?ref=<tag>`; local paths have no versions.
- Always **pin** external modules to avoid surprise changes. `version` is optional but strongly recommended.
- `terraform init -upgrade` fetches the newest version that matches the constraint.
- Module versions are **not** recorded in `.terraform.lock.hcl`.

```hcl
module "iam" {
  source  = "terraform-aws-modules/iam/aws"
  version = "~> 6.0"
}
```

## Publishing modules to the public registry

Requirements:

- Public **GitHub** repository named **`terraform-<PROVIDER>-<NAME>`** (e.g., `terraform-aws-vpc`).
- Repository **description** (used as the short description).
- **Standard module structure** (below).
- At least one **semantic version tag**, e.g. `v1.0.0` or `1.0.0`.
- Sign in to the registry with GitHub and select the repo. New tags are published automatically (webhook).

### Standard module structure

```text
terraform-aws-vpc/
├── README.md          # required (description + usage)
├── LICENSE            # recommended
├── main.tf            # recommended entry point
├── variables.tf       # inputs with descriptions
├── outputs.tf         # outputs with descriptions
├── versions.tf        # terraform {} required_version / required_providers
├── modules/           # nested sub-modules (optional)
│   └── nat/
│       ├── README.md
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── examples/          # usage examples (optional)
    └── complete/
        └── main.tf
```

Minimal structure = root module files (`main.tf`, `variables.tf`, `outputs.tf`) + `README.md`.

## Private registry

- **HCP Terraform** includes a **private registry** to share modules (and providers) inside an organization. **Terraform Enterprise** also supports sharing across organizations.
- Source format adds a hostname: **`<HOSTNAME>/<ORGANIZATION>/<NAME>/<PROVIDER>`**.

```hcl
module "s3_webapp" {
  source  = "app.terraform.io/my-org/s3-webapp/aws"
  version = "1.0.0"

  name   = var.name
  region = var.region
}
```

- Authenticate the CLI with `terraform login` (stores an API token in `~/.terraform.d/credentials.tfrc.json`).
- HCP Terraform also offers **no-code modules**: users provision a module from the UI without writing HCL.

## Quick recap

- [x] Root module = where you run Terraform; child modules are called with `module {}`.
- [x] Sources: local, registry, private registry, GitHub, Bitbucket, Git, HTTP, S3, GCS.
- [x] `version` only for registry modules; Git → `?ref=`; local paths → none.
- [x] Pass data in with arguments, out with outputs: `module.NAME.OUTPUT`.
- [x] Locals in a child = values callers can't override.
- [x] Publish: `terraform-<PROVIDER>-<NAME>` repo on GitHub + semver tag + standard structure.
