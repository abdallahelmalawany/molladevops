# Compute Services

<span class="exam-tag">AZ-900 · Architecture & services</span>

## Choosing a compute type

| Need | Service | Model |
|---|---|---|
| Full OS control, lift-and-shift | **Virtual Machines** | IaaS |
| Many identical VMs that autoscale | **VM Scale Sets** | IaaS |
| Remote desktops & apps for users | **Azure Virtual Desktop** | Desktop-as-a-service |
| Host web apps/APIs without managing servers | **App Service** | PaaS |
| Run one container quickly | **Azure Container Instances (ACI)** | PaaS / serverless containers |
| Microservices in containers, scale to zero | **Azure Container Apps** | Serverless containers |
| Full Kubernetes | **Azure Kubernetes Service (AKS)** | Managed Kubernetes |
| Event-driven code | **Azure Functions** | Serverless |
| Low-code workflows & integrations | **Logic Apps** | Serverless |
| Large-scale parallel/HPC jobs | **Azure Batch** | PaaS |

### Containers vs. VMs vs. functions

| | Virtual machine | Container | Function |
|---|---|---|---|
| Virtualises | Hardware | Operating system | Nothing you see — just code |
| Includes OS | Full guest OS | Shares host kernel | Managed by Azure |
| Start time | Minutes | Seconds | Milliseconds–seconds |
| You manage | OS, patches, runtime, app | Image + app | Code only |
| Billing | Per second while running | Per second (ACI/Container Apps) or per node (AKS) | Per execution / per usage |
| Best for | Legacy, custom OS needs | Microservices, portability | Short event-driven tasks |

## Virtual Machines (IaaS)

- Software emulation of a computer: vCPU, RAM, disks, network.
- Windows or Linux; marketplace images (plain OS or with software pre-installed) or your own custom images.
- You control and **patch** the OS → most control, most responsibility.
- Use cases: lift-and-shift, test/dev, custom software, full control needs.
- **Sizes/families**: general purpose (B, D), compute optimised (F), memory optimised (E, M), storage optimised (L), GPU (N), HPC (H).
- Stopped (deallocated) VMs **don't incur compute cost**, but disks still cost.

### Resources a VM needs

| Resource | Purpose |
|---|---|
| **Size** (CPU/RAM) | Compute capacity |
| **Managed disks** | OS disk (+ optional data disks; temporary disk on many sizes) |
| **Virtual network + subnet** | Private IP connectivity |
| **Network interface (NIC)** | Connects the VM to the subnet |
| **Public IP** (optional) | Internet reachability |
| **Network security group** (optional) | Traffic filtering |

### VM availability options

| Option | Protects against | Notes |
|---|---|---|
| **Availability set** | Rack/hardware failure and planned maintenance within one datacenter | VMs spread over **fault domains** (separate power/network racks, up to 3) and **update domains** (rebooted one at a time, up to 20). No extra cost |
| **Availability zones** | Datacenter failure | Place VMs in different zones — higher SLA |
| **VM Scale Sets** | Load & failures | Identical (or flexible) VMs, **autoscale** on metrics/schedule, can span zones, work with load balancers |

### Azure Virtual Desktop (AVD)

- Desktop and app virtualisation running in Azure; users connect from any device.
- **Windows 11/10 Enterprise multi-session** — many users on one VM (cost-efficient).
- Host pools (pooled or personal), centralised security with Microsoft Entra ID, MFA and Conditional Access; no data on the user's device.

!!! warning "Renamed"
    **Windows Virtual Desktop** was renamed **Azure Virtual Desktop** (2021).

## App Service (PaaS)

- Fully managed hosting for **web apps, REST APIs, mobile back ends**; also Web App for Containers.
- Languages: .NET, Java, Node.js, Python, PHP (Windows/Linux).
- Built-in **autoscale**, deployment slots (staging → swap), custom domains/TLS, authentication, CI/CD from GitHub/Azure DevOps.
- Runs on an **App Service plan** (defines region, instance size and count — the thing you pay for).

## Containers

### Azure Container Instances (ACI)

- Run a container **without managing VMs or orchestrators** — fastest, simplest way.
- Per-second billing; good for simple apps, task automation, build jobs, burst from AKS (virtual nodes).

### Azure Container Apps

- **Serverless platform for microservices** built on Kubernetes (KEDA, Dapr, Envoy) without exposing Kubernetes.
- Autoscale on HTTP/events, **scale to zero**, revisions & traffic splitting, jobs.

### Azure Kubernetes Service (AKS)

- Managed Kubernetes: Azure runs the control plane; you manage node pools and workloads.
- Integrations: Entra ID, Azure CNI, Azure Monitor, Azure Container Registry, cluster autoscaler, KEDA.
- See the [Kubernetes section](../kubernetes/index.md).

**Azure Container Registry (ACR)** stores and manages private container images and Helm charts.

## Serverless & integration

### Azure Functions

- Run small pieces of code in response to **triggers**: HTTP, timer, queue, Blob, Event Grid, Service Bus, Cosmos DB…
- Languages: C#, JavaScript/TypeScript, Python, Java, PowerShell (+ custom handlers).
- **Stateless** by default; **Durable Functions** add stateful orchestration.

| Hosting plan | Notes | Timeout (default / max) |
|---|---|---|
| **Flex Consumption** | Recommended serverless plan; fast scale, VNet support | 30 min / unbounded |
| **Consumption** (legacy) | Pay-per-execution, scale to zero | 5 / 10 min |
| **Premium** | Pre-warmed instances (no cold start), VNet | 30 min / unbounded |
| **Dedicated (App Service plan)** | Predictable cost, run on existing plan | 30 min / unbounded (Always On) |
| **Container Apps** | Functions in containers | 30 min / unbounded |

HTTP-triggered functions must respond within **230 seconds** regardless of plan.

!!! warning "Retiring: Linux Consumption plan"
    Hosting Functions on **Linux in the Consumption plan** retires on **30 Sep 2028** — migrate to **Flex Consumption**.

### Logic Apps

- **Low-code / no-code workflow** automation designed in a visual designer.
- **1,400+ connectors** (Microsoft 365, Salesforce, SAP, SQL, Service Bus…) plus on-prem data gateway.
- Plans: Consumption (multi-tenant, per action) and Standard (single-tenant, VNet).

| | Functions | Logic Apps |
|---|---|---|
| Approach | Code-first | Designer-first (workflow) |
| State | Stateless (Durable for state) | Stateful workflows |
| Best for | Custom logic, compute | Integrations, orchestration between services |

### Azure Batch

- Run **large-scale parallel and HPC** jobs (rendering, media transcoding, simulations, OCR).
- Batch creates and manages pools of VMs, schedules tasks, scales the pool; you pay only for the underlying compute.

## Azure Marketplace

- Catalogue of thousands of certified apps and services from Microsoft and partners (VM images, firewalls, databases, SaaS).
- Deploy in a few clicks; charges appear on your Azure bill.

## Quick recap

- [x] VMs = IaaS, most control; resources: size, disks, VNet/subnet, NIC, (public IP, NSG).
- [x] Availability sets (fault/update domains) < availability zones < multi-region.
- [x] VM Scale Sets autoscale identical VMs.
- [x] App Service = PaaS web hosting; ACI = single containers; Container Apps = serverless microservices; AKS = managed Kubernetes.
- [x] Functions (code, triggers) vs Logic Apps (low-code workflows); Batch for HPC.
- [x] AVD = virtual desktops with multi-session Windows.
