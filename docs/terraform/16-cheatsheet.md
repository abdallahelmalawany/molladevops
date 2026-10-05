# CLI Cheat Sheet

## Setup & init

```bash
terraform -version
terraform -install-autocomplete
terraform init                         # backend + modules + providers + lock file
terraform init -upgrade                # newest allowed provider/module versions
terraform init -reconfigure            # new backend config, no migration
terraform init -migrate-state          # move state to new backend
terraform init -backend-config=prod.hcl
terraform get -update                  # modules only
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
terraform login                        # HCP Terraform token
```

## Write & check

```bash
terraform fmt -recursive               # format
terraform fmt -check -diff             # CI check
terraform validate                     # static validation
terraform console                      # test expressions
terraform test                         # run *.tftest.hcl
```

## Plan & apply

```bash
terraform plan
terraform plan -out=tfplan
terraform plan -var-file=prod.tfvars -var="region=eu-west-1"
terraform plan -refresh=false
terraform plan -refresh-only           # see drift only
terraform plan -destroy
terraform plan -detailed-exitcode      # 0 none, 1 error, 2 changes
terraform plan -generate-config-out=generated.tf   # with import blocks

terraform apply                        # plan + prompt
terraform apply tfplan                 # no prompt
terraform apply -auto-approve
terraform apply -replace="aws_instance.web"        # instead of taint
terraform apply -refresh-only          # accept drift into state
terraform apply -target="module.vpc"   # exceptional use
terraform apply -parallelism=20
terraform apply -lock-timeout=120s
```

## Destroy

```bash
terraform destroy
terraform destroy -auto-approve
terraform destroy -target="aws_security_group.lab"
terraform apply -destroy               # alias
```

## Inspect

```bash
terraform show                         # state, human readable
terraform show -json tfplan            # plan as JSON
terraform output
terraform output -raw instance_ip
terraform output -json
terraform graph | dot -Tsvg > graph.svg
terraform providers
terraform version
```

## State

```bash
terraform state list
terraform state show 'aws_iam_user.users["alice"]'
terraform state mv aws_instance.a aws_instance.b
terraform state rm aws_s3_bucket.legacy        # forget, don't destroy
terraform state pull > backup.tfstate
terraform state push backup.tfstate
terraform state replace-provider hashicorp/aws registry.acme.corp/acme/aws
terraform force-unlock <LOCK_ID>
terraform import aws_instance.web i-0abc123    # legacy import
```

## Workspaces

```bash
terraform workspace list
terraform workspace show
terraform workspace new dev
terraform workspace select -or-create prod
terraform workspace delete dev
```

## Debug

```bash
export TF_LOG=TRACE          # TRACE | DEBUG | INFO | WARN | ERROR | JSON
export TF_LOG_PATH=./tf.log
export TF_LOG_PROVIDER=DEBUG # providers only
export TF_LOG_CORE=WARN      # core only
unset TF_LOG TF_LOG_PATH
```

## Deprecated → modern

| Old | Use instead |
|---|---|
| `terraform taint ADDR` | `terraform apply -replace=ADDR` |
| `terraform refresh` | `terraform apply -refresh-only` |
| `terraform import` command | `import {}` block (+ `-generate-config-out`) |
| `terraform state mv` | `moved {}` block |
| `terraform state rm` | `removed {}` block with `destroy = false` |
| `null_resource` | `terraform_data` |
| `backend "remote"` | `cloud {}` block |
| S3 `dynamodb_table` | S3 `use_lockfile = true` |
| `aws_eip { vpc = true }` | `aws_eip { domain = "vpc" }` |
| `"${var.x}"` alone | `var.x` |
| `aws_instance.web.*.id` | `aws_instance.web[*].id` |

## HCL snippets

```hcl
# count / for_each
count    = var.enabled ? 1 : 0
for_each = toset(var.names)          # each.key / each.value

# for expressions
[for s in var.list : upper(s) if s != ""]
{for k, v in var.map : k => v.id}

# splat
aws_instance.web[*].id

# conditional
var.env == "prod" ? "t3.large" : "t3.micro"

# dynamic block
dynamic "ingress" {
  for_each = var.ports
  content {
    from_port = ingress.value
    to_port   = ingress.value
    protocol  = "tcp"
  }
}

# lifecycle
lifecycle {
  create_before_destroy = true
  prevent_destroy       = true
  ignore_changes        = [tags]
  replace_triggered_by  = [aws_launch_template.lt.latest_version]
}

# references
var.name   local.name   data.TYPE.NAME.ATTR   module.NAME.OUTPUT
path.module   terraform.workspace   self.ATTR   count.index   each.key
```
