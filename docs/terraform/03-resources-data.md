# Resources, Data Sources & Dependencies

<span class="exam-tag">Obj 4a</span><span class="exam-tag">Obj 4b</span><span class="exam-tag">Obj 4f</span>

## Configuration files

- Terraform code lives in files ending in **`.tf`** (HCL) or **`.tf.json`** (JSON).
- Terraform loads **all** `.tf` / `.tf.json` files in the working directory and treats them as **one configuration** — file names and order do not matter for behaviour. (Sub-directories are **not** loaded; they are modules.)
- Common layout:

```text
project/
├── main.tf          # resources
├── providers.tf     # terraform {} + provider blocks
├── variables.tf     # input variables
├── outputs.tf       # outputs
├── locals.tf        # locals (optional)
├── terraform.tfvars # variable values (don't commit secrets)
└── .terraform.lock.hcl
```

### HCL block syntax

```hcl
<BLOCK TYPE> "<LABEL>" "<LABEL>" {
  argument = value          # argument
  nested_block {            # nested block
    key = "value"
  }
}
```

## Resources

A **resource** block declares one infrastructure object Terraform will **create, update and delete** (EC2 instance, VPC, IAM user, DNS record…).

```hcl
resource "aws_instance" "web" {      # resource "<TYPE>" "<LOCAL NAME>"
  ami           = "ami-0abc1234"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

- **Type** (`aws_instance`): defined by the provider; prefix = provider name.
- **Local name** (`web`): only meaningful **inside the same module**.
- **Type + name** = the resource **address** (`aws_instance.web`) — must be unique within a module.

### Arguments vs. attributes

- **Arguments** = inputs you set (`ami`, `instance_type`). Some are **required**, others **optional**.
- **Attributes** = values available **after** creation, many computed by the API (`id`, `arn`, `public_ip`, `private_ip`).
- Every argument is also readable as an attribute.

### Referencing attributes (cross-resource references)

Syntax: **`<TYPE>.<NAME>.<ATTRIBUTE>`**

```hcl
resource "aws_eip" "lb" {
  domain = "vpc"
}

resource "aws_security_group" "allow_tls" {
  name = "allow-tls"

  ingress {
    description = "TLS from the EIP only"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["${aws_eip.lb.public_ip}/32"]   # reference inside a string
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id                   # direct reference
  subnet_id     = aws_subnet.public.id
}

output "nat_gateway_id" {
  value = aws_nat_gateway.this.id
}
```

!!! warning "Deprecated: `vpc = true` on `aws_eip`"
    Older code (and the original course) uses `vpc = true`. It was deprecated in AWS provider v5 and removed later. Use **`domain = "vpc"`**.

Other reference forms:

| Expression | Refers to |
|---|---|
| `var.<name>` | Input variable |
| `local.<name>` | Local value |
| `data.<TYPE>.<NAME>.<ATTR>` | Data source attribute |
| `module.<NAME>.<OUTPUT>` | Child module output |
| `aws_instance.web[0].id` | Instance created with `count` |
| `aws_instance.web["a"].id` | Instance created with `for_each` |
| `self.<attr>` | The parent resource (only in provisioners / connection / postconditions) |
| `path.module`, `path.root`, `path.cwd` | Filesystem paths |
| `terraform.workspace` | Current workspace name |

## Data sources

A **data** block **reads** information that already exists — outside Terraform or managed by another configuration. It never creates anything.

```hcl
# Latest Amazon Linux 2023 AMI
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_region" "current" {}

resource "aws_instance" "web" {
  ami               = data.aws_ami.al2023.id
  instance_type     = "t3.micro"
  availability_zone = data.aws_availability_zones.available.names[0]
}

output "all_azs"        { value = data.aws_availability_zones.available.names }
output "current_region" { value = data.aws_region.current.region }   # .name on AWS provider < 6.0
```

| | `resource` | `data` |
|---|---|---|
| Purpose | Create / manage | Read / look up |
| Lifecycle | create, update, destroy | read only |
| Reference | `aws_vpc.main.id` | `data.aws_vpc.main.id` |
| Mode in state | `managed` | `data` |

!!! note
    Data sources are normally read during **plan**. If their arguments depend on values unknown until apply, reading is deferred to **apply**.

## Resource dependencies

Terraform builds a **dependency graph** and creates/destroys resources in the correct order, running independent resources **in parallel** (default `-parallelism=10`).

### Implicit dependency (preferred)

Created automatically when one resource **references** another.

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id     # → EIP waits for the instance
}
```

### Explicit dependency — `depends_on`

Use only when a resource relies on another's **behaviour** but does **not reference any of its data** (hidden dependency).

```hcl
resource "aws_s3_bucket" "artifacts" {
  bucket = "my-artifacts-bucket-123456"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  # The app downloads files from the bucket at boot,
  # but no argument references it.
  depends_on = [aws_s3_bucket.artifacts]
}
```

- `depends_on` takes a **list of resource/module addresses** (no attributes).
- Works on resources, data sources, modules and outputs.
- Use as a **last resort**, and add a **comment** explaining why — it makes plans more conservative.

Visualise the graph:

```bash
terraform graph | dot -Tsvg > graph.svg     # needs Graphviz installed
terraform graph -type=plan
```

## Meta-arguments (work on any resource)

| Meta-argument | Purpose | Page |
|---|---|---|
| `depends_on` | Explicit dependency | this page |
| `count` | Create N copies | [Expressions](06-expressions-functions.md#count) |
| `for_each` | One copy per map/set element | [Expressions](06-expressions-functions.md#for_each) |
| `provider` | Choose an aliased provider | [Providers](02-providers.md) |
| `lifecycle` | Customise create/update/destroy behaviour | below |

## The `lifecycle` block

```hcl
resource "aws_instance" "web" {
  # ...
  lifecycle {
    create_before_destroy = true          # build the replacement first, then destroy old
    prevent_destroy       = true          # any plan that destroys this errors out
    ignore_changes        = [tags, ami]   # don't revert drift on these attributes (or = all)
    replace_triggered_by  = [aws_launch_template.web.latest_version]  # replace when this changes

    precondition {
      condition     = data.aws_ami.al2023.architecture == "x86_64"
      error_message = "AMI must be x86_64."
    }
    postcondition {
      condition     = self.public_dns != ""
      error_message = "Instance must get a public DNS name."
    }
  }
}
```

| Argument | Effect / typical use |
|---|---|
| `create_before_destroy` | Default replacement is **destroy → create**. With `true` it's **create → destroy** — avoids downtime (e.g., launch templates, certificates). New object needs a unique name. |
| `prevent_destroy` | Protects critical resources (databases, state buckets). Note: removing the block from code still allows deletion. |
| `ignore_changes` | Ignore changes made outside Terraform on listed attributes (e.g., tags added by another tool, autoscaling `desired_capacity`). |
| `replace_triggered_by` | Force replacement when another resource/attribute changes (Terraform 1.2+). |
| `precondition` / `postcondition` | Custom checks — see [Validation](07-validation-conditions.md). |

## Quick recap

- [x] `resource` = create/manage; `data` = read-only lookup.
- [x] Address = `TYPE.NAME`; reference attributes with `TYPE.NAME.ATTR`, data with `data.TYPE.NAME.ATTR`.
- [x] References create **implicit** dependencies; `depends_on` for hidden ones (last resort, comment why).
- [x] `lifecycle`: `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`, pre/postconditions.
- [x] `aws_eip`: use `domain = "vpc"`, not `vpc = true`.
