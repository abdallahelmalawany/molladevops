# Provisioners & `terraform_data`

!!! warning "Provisioners are a last resort"
    HashiCorp recommends avoiding provisioners when possible: they are not modelled in the plan, depend on network/SSH access, and can't be fully tracked in state. Prefer:

    - **`user_data` / cloud-init** (EC2), custom images built with **Packer**
    - Provider-native resources (e.g., `aws_s3_object` instead of `aws s3 cp`)
    - Configuration management (Ansible) triggered from your pipeline

## What provisioners do

Run actions on the **local machine** or a **remote machine** to prepare an object for service (e.g., install NGINX after an EC2 instance is created). They are declared **inside a resource block**.

Built-in provisioners: **`local-exec`**, **`remote-exec`**, **`file`**.

!!! warning "Removed"
    Vendor provisioners `chef`, `puppet`, `salt-masterless`, `habitat` were **removed in Terraform 0.15**.

## `local-exec`

Runs a command on the machine **running Terraform**.

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> private_ips.txt"
    # optional: working_dir, interpreter = ["bash", "-c"], environment = { KEY = "v" }
  }
}
```

!!! tip
    Inside a provisioner, refer to the parent resource with **`self`** (e.g., `self.private_ip`), not `aws_instance.web.private_ip` — direct references to the parent can cause cycle errors.

## `remote-exec` and `connection`

Runs commands **on the created resource** over **SSH** (Linux) or **WinRM** (Windows). Needs a `connection` block.

```hcl
resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id   # Amazon Linux 2023
  instance_type          = "t3.micro"
  key_name               = "ec2_key"
  vpc_security_group_ids = [aws_security_group.ssh_http.id]

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("~/.ssh/ec2_key.pem")
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo dnf install -y nginx",
      "sudo systemctl enable --now nginx",
    ]
    # or: script = "./install.sh"   /  scripts = ["a.sh", "b.sh"]
  }
}
```

!!! warning "Updated from the course"
    The course used `amazon-linux-extras install nginx1`, which only exists on **Amazon Linux 2** (end of support **30 June 2026**). On **Amazon Linux 2023** use `dnf`.

## `file`

Copies files/directories from the local machine to the remote resource (uses the same `connection`).

```hcl
provisioner "file" {
  source      = "conf/app.conf"
  destination = "/tmp/app.conf"
}
```

## When provisioners run

### Creation-time (default)

- Run **only when the resource is created** — not on updates.
- If a creation-time provisioner **fails**, the resource is marked **tainted** → it will be **destroyed and recreated** on the next apply.

### Destroy-time — `when = destroy`

- Run **before** the resource is destroyed.
- If it fails, Terraform errors and re-runs it on the next apply → make destroy provisioners **idempotent**.
- Can only reference `self`, `count.index` and `each.key`.

```hcl
provisioner "local-exec" {
  when    = destroy
  command = "echo 'Instance ${self.id} is being destroyed' >> audit.log"
}
```

### Failure behaviour — `on_failure`

| Value | Behaviour |
|---|---|
| `fail` (default) | Error, stop, **taint** the resource (creation-time). |
| `continue` | Ignore the error and continue. |

```hcl
provisioner "local-exec" {
  command    = "echo ${self.private_ip} >> private_ips.txt"
  on_failure = continue
}
```

## `terraform_data` (replaces `null_resource`)

A built-in resource (Terraform **1.4+**, no provider needed) that follows the normal resource lifecycle but **creates nothing** in the cloud. Uses:

- Run provisioners not tied to a real resource (scripts, Ansible playbooks).
- `triggers_replace`: re-run when a value changes.
- Store an arbitrary value (`input` → `output`) to use with `replace_triggered_by`.

```hcl
resource "terraform_data" "ansible" {
  triggers_replace = [
    aws_instance.web.id,
    filesha256("playbook.yml"),     # re-run when the playbook changes
  ]

  provisioner "local-exec" {
    command = "ansible-playbook -i '${aws_instance.web.public_ip},' playbook.yml"
  }
}
```

!!! warning "Legacy: `null_resource`"
    Older code uses `null_resource` from the `hashicorp/null` provider with a `triggers` map. It still works, but `terraform_data` is the built-in replacement — no extra provider download.

    ```hcl
    resource "null_resource" "example" {
      triggers = { instance_id = aws_instance.web.id }
      provisioner "local-exec" { command = "echo changed" }
    }
    ```

## Quick recap

- [x] `local-exec` (local machine), `remote-exec` (target via SSH/WinRM + `connection`), `file`.
- [x] Default = creation-time; failure ⇒ resource **tainted**.
- [x] `when = destroy` runs before destroy; `on_failure = continue | fail`.
- [x] Use `self` inside provisioners.
- [x] `terraform_data` replaces `null_resource`. Provisioners = last resort.
