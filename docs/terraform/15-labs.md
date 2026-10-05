# Hands-on Labs & Projects

Practice tasks rewritten from the course assignments, updated to current syntax. Try each one first, then open the **solution sketch**.

!!! warning "Cost"
    These labs create real AWS resources. Use a sandbox account, stay in the free tier where possible, and **always run `terraform destroy`** at the end. NAT gateways, ALBs and RDS cost money per hour.

## Lab 1 — VPC, subnet and EC2

1. Create an IAM user (or role/SSO profile) with permissions to manage EC2, VPCs and subnets; configure it as an AWS CLI profile and use it in the provider.
2. Create a new VPC and a public subnet (any valid CIDR).
3. Launch a `t3.micro` EC2 instance tagged `Name = "lab_instance"` **with a public IP**.
4. Make sure the instance is in the new public subnet.
5. Destroy everything.

??? success "Solution sketch"

    ```hcl
    provider "aws" {
      region  = "us-east-1"
      profile = "lab"
    }

    resource "aws_vpc" "lab" {
      cidr_block = "10.10.0.0/16"
    }

    resource "aws_internet_gateway" "lab" {
      vpc_id = aws_vpc.lab.id
    }

    resource "aws_subnet" "public" {
      vpc_id                  = aws_vpc.lab.id
      cidr_block              = "10.10.1.0/24"
      map_public_ip_on_launch = true
    }

    resource "aws_route_table" "public" {
      vpc_id = aws_vpc.lab.id
      route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.lab.id
      }
    }

    resource "aws_route_table_association" "public" {
      subnet_id      = aws_subnet.public.id
      route_table_id = aws_route_table.public.id
    }

    data "aws_ami" "al2023" {
      most_recent = true
      owners      = ["amazon"]
      filter {
        name   = "name"
        values = ["al2023-ami-*-x86_64"]
      }
    }

    resource "aws_instance" "lab" {
      ami                         = data.aws_ami.al2023.id
      instance_type               = "t3.micro"
      subnet_id                   = aws_subnet.public.id
      associate_public_ip_address = true
      tags                        = { Name = "lab_instance" }
    }
    ```

    ```bash
    terraform init && terraform apply
    terraform destroy
    ```

## Lab 2 — IAM user, NAT gateway, EIP and outputs

1. Create an IAM user named `lab_user`.
2. Create an Elastic IP and a NAT gateway that uses it.
3. Print the EIP public IP, the user's ARN and the NAT gateway ID.
4. Destroy everything.

??? success "Solution sketch"

    ```hcl
    resource "aws_iam_user" "lab" {
      name = "lab_user"
    }

    resource "aws_eip" "nat" {
      domain = "vpc"                 # not "vpc = true" (deprecated)
    }

    resource "aws_nat_gateway" "this" {
      allocation_id = aws_eip.nat.id
      subnet_id     = aws_subnet.public.id   # from Lab 1
    }

    output "eip_public_ip"  { value = aws_eip.nat.public_ip }
    output "user_arn"       { value = aws_iam_user.lab.arn }
    output "nat_gateway_id" { value = aws_nat_gateway.this.id }
    ```

## Lab 3 — Targeting, refresh-only and versions

1. Create an S3 bucket with a unique name, private access, tagged `Name = "terraform_bucket"`.
2. Create a security group allowing inbound traffic from `192.168.120.0/24`.
3. Restrict the configuration to Terraform **1.12.x** only.
4. Change the bucket tag **in the AWS console** to `terraform_test`, then update **only the S3 bucket** in state to accept the change.
5. Destroy **only** the security group; keep the bucket (check state).
6. Destroy everything.

??? success "Solution sketch"

    ```hcl
    terraform {
      required_version = "~> 1.12.0"      # >= 1.12.0, < 1.13.0
      required_providers {
        aws = { source = "hashicorp/aws", version = "~> 6.0" }
      }
    }

    resource "aws_s3_bucket" "lab" {
      bucket = "lab-bucket-${random_id.suffix.hex}"
      tags   = { Name = "terraform_bucket" }
    }

    resource "random_id" "suffix" {
      byte_length = 4
    }

    resource "aws_s3_bucket_public_access_block" "lab" {   # private access
      bucket                  = aws_s3_bucket.lab.id
      block_public_acls       = true
      block_public_policy     = true
      ignore_public_acls      = true
      restrict_public_buckets = true
    }

    resource "aws_security_group" "lab" {
      name = "lab-sg"
      ingress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["192.168.120.0/24"]
      }
    }
    ```

    ```bash
    terraform apply -refresh-only -target=aws_s3_bucket.lab   # step 4
    terraform destroy -target=aws_security_group.lab         # step 5
    terraform state list                                      # bucket still there
    terraform destroy                                         # step 6
    ```

    Note: after step 4 the code still says `terraform_bucket`; the next normal `apply` would revert it unless you update the code too.

## Lab 4 — Provisioners

1. Create an EC2 instance and install Apache (`httpd`) using a **remote-exec** provisioner.
2. Save the instance's private IP to a local file with a **local-exec** provisioner.
3. Destroy everything **without an interactive prompt**.

??? success "Solution sketch"

    ```hcl
    resource "aws_instance" "web" {
      ami                    = data.aws_ami.al2023.id
      instance_type          = "t3.micro"
      key_name               = "lab-key"
      vpc_security_group_ids = [aws_security_group.ssh_http.id]

      connection {
        type        = "ssh"
        user        = "ec2-user"
        private_key = file("~/.ssh/lab-key.pem")
        host        = self.public_ip
      }

      provisioner "remote-exec" {
        inline = [
          "sudo dnf install -y httpd",
          "sudo systemctl enable --now httpd",
        ]
      }

      provisioner "local-exec" {
        command = "echo ${self.private_ip} >> private_ips.txt"
      }
    }
    ```

    ```bash
    terraform destroy -auto-approve
    ```

    Better in real life: use `user_data` instead of `remote-exec`.

## Lab 5 — Multi-region, import, replace

1. Use an identity with admin rights.
2. Create two EC2 instances: one in `us-east-1`, one in `us-west-1`.
3. In the AWS console, manually create an EC2 instance in `us-east-1` tagged `manually_created`.
4. Bring that manual instance under Terraform management.
5. List all managed resources **from the terminal**, without opening the state file.
6. Someone installed unwanted software on one instance by hand. Return it to the desired state.
7. Destroy everything.

??? success "Solution sketch"

    ```hcl
    provider "aws" { region = "us-east-1" }
    provider "aws" {
      alias  = "west"
      region = "us-west-1"
    }

    resource "aws_instance" "east" {
      ami           = data.aws_ami.al2023.id
      instance_type = "t3.micro"
    }

    data "aws_ami" "al2023_west" {
      provider    = aws.west
      most_recent = true
      owners      = ["amazon"]
      filter {
        name   = "name"
        values = ["al2023-ami-*-x86_64"]
      }
    }

    resource "aws_instance" "west" {
      provider      = aws.west
      ami           = data.aws_ami.al2023_west.id   # AMI IDs are per region
      instance_type = "t3.micro"
    }

    import {
      to = aws_instance.manual
      id = "i-0123456789abcdef0"   # ID of the console-created instance
    }
    ```

    ```bash
    terraform plan -generate-config-out=manual.tf   # step 4: generate the resource block
    terraform apply
    terraform state list                            # step 5
    terraform apply -replace="aws_instance.east"    # step 6 (not taint)
    terraform destroy                               # step 7
    ```

## Lab 6 — Workspaces

1. Create three CLI workspaces: `dev`, `staging`, `prod`.
2. Write an EC2 configuration whose instance type depends on the workspace: dev → `t3.micro`, staging → `t3.medium`, prod → `t3.large`.
3. Apply in each workspace, then destroy all.

??? success "Solution sketch"

    ```hcl
    locals {
      types = {
        dev     = "t3.micro"
        staging = "t3.medium"
        prod    = "t3.large"
      }
    }

    resource "aws_instance" "app" {
      ami           = data.aws_ami.al2023.id
      instance_type = lookup(local.types, terraform.workspace, "t3.micro")
      tags          = { Name = "app-${terraform.workspace}" }
    }
    ```

    ```bash
    for ws in dev staging prod; do
      terraform workspace new $ws
      terraform apply -auto-approve
    done
    for ws in dev staging prod; do
      terraform workspace select $ws
      terraform destroy -auto-approve
    done
    terraform workspace select default
    ```

## Lab 7 — Remote state with S3 native locking

1. Create (separately, e.g. in a bootstrap config) a versioned, encrypted S3 bucket for state.
2. Configure the `s3` backend with `use_lockfile = true` and migrate local state.
3. Run `terraform state pull` and check the `.tflock` object appears during an apply.

??? success "Solution sketch"

    ```hcl
    terraform {
      backend "s3" {
        bucket       = "abdallah-tf-state-lab"
        key          = "labs/lab7.tfstate"
        region       = "us-east-1"
        encrypt      = true
        use_lockfile = true
      }
    }
    ```

    ```bash
    terraform init -migrate-state
    terraform state pull | head
    ```

---

## Capstone project 1 — Highly available web app on AWS

Design a multi-tier web application in a custom VPC.

**Network**

- VPC `10.0.0.0/16` in `us-east-1`.
- Two **public** subnets in `us-east-1a` / `us-east-1b`: `10.0.10.0/24`, `10.0.20.0/24`.
- Two **private** subnets in the same AZs: `10.0.100.0/24`, `10.0.200.0/24`, with their own route table(s).
- One **NAT gateway per AZ**; private route tables send `0.0.0.0/0` to the NAT in the same AZ.

**Compute**

- Two EC2 instances (web/app tier), one per private subnet, EBS volumes **encrypted at rest**.
- Run the user-data script below at launch.
- Security group **webSG**: allow 22, 80, 443 inbound — then tighten so HTTP is only allowed **from the ALB security group**.

**Load balancing & scaling**

- Target group **webTG** on port 80 (HTTP) with HTTP health checks; register both instances.
- **Application Load Balancer** in the two public subnets, HTTP listener → webTG.
- **ALBSG**: inbound HTTP from the internet; outbound HTTP to webSG.
- An **Auto Scaling group** with a **target tracking** policy (e.g., average CPU 50 %) that replaces failed instances and scales on demand (use a launch template).

**Database**

- **Multi-AZ RDS** instance; its security group only allows the DB port from **webSG**.

**Test & clean up**

- Browse to the ALB DNS name and see the message from each server.
- `terraform destroy`.

User data (Amazon Linux 2023):

```bash
#!/bin/bash
dnf update -y
dnf install -y httpd
systemctl enable --now httpd
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "Hello from $(hostname -f) in $AZ" > /var/www/html/index.html
```

!!! note "Fixed from the course"
    The original script had `#!bin/bash` (missing `/`), used yum on Amazon Linux 2, and both servers printed "server *1*". The version above uses IMDSv2 to print the real AZ.

??? tip "Suggested structure"

    ```text
    capstone1/
    ├── versions.tf      # terraform + providers + backend
    ├── network.tf       # VPC, subnets, IGW, NAT, route tables (use for_each over a map of AZs)
    ├── security.tf      # ALBSG, webSG, dbSG
    ├── compute.tf       # launch template, ASG, scaling policy
    ├── alb.tf           # ALB, target group, listener
    ├── database.tf      # aws_db_subnet_group, aws_db_instance (multi_az = true)
    ├── variables.tf
    └── outputs.tf       # alb_dns_name
    ```

    Or use registry modules: `terraform-aws-modules/vpc/aws`, `.../alb/aws`, `.../autoscaling/aws`, `.../rds/aws`.

## Capstone project 2 — Jenkins server on EC2

**Requirements**

- Jenkins runs on an EC2 instance, reachable from the internet on **port 80** and via **SSH**.
- Everything is created with Terraform.

**Steps**

1. Create the VPC.
2. Create an Internet Gateway and a route table with a default route to it.
3. Create a public subnet and associate it with the route table.
4. Create a security group (22 from your IP, 80 from anywhere).
5. Write a user-data script that installs Java + Jenkins, and makes Jenkins reachable on port 80 (e.g., NGINX reverse proxy to 8080, or `JENKINS_PORT=80`).
6. Create the EC2 instance with a key pair and an Elastic IP.
7. Output the URL and verify Jenkins loads.

??? tip "User data hint (Amazon Linux 2023)"

    ```bash
    #!/bin/bash
    dnf install -y java-21-amazon-corretto nginx
    wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
    rpm --import <CURRENT_JENKINS_KEY_URL>   # see Jenkins Linux install docs (key rotates)
    dnf install -y jenkins
    systemctl enable --now jenkins
    cat > /etc/nginx/conf.d/jenkins.conf <<'EOF'
    server {
      listen 80;
      location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
      }
    }
    EOF
    systemctl enable --now nginx
    ```

    Get the current repo key URL from <https://www.jenkins.io/doc/book/installing/linux/>.
