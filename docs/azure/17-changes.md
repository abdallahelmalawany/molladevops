# What Changed vs. the Course

The source was an **AZ-900 course PDF** (11 modules, 212 slides) written for an older version of the exam. Content was rewritten, reorganised to the **July 2026** skills outline, and checked against Microsoft Learn.

## Renamed or retired products

| In the course | Now |
|---|---|
| Azure Active Directory / AAD Connect | **Microsoft Entra ID** / **Microsoft Entra Connect** (Sync & Cloud Sync) |
| Security Center | **Microsoft Defender for Cloud** (CSPM + workload protection) |
| Azure Sentinel | **Microsoft Sentinel** (moving into the Defender portal) |
| Windows Virtual Desktop | **Azure Virtual Desktop** |
| Azure Cognitive Services | **Foundry Tools** (via Azure AI services) |
| Azure Blueprints | **Retiring 31 Jan 2027** → Template Specs + Deployment Stacks |
| TCO Calculator | Deprecated → Azure Migrate business case + pricing calculator |
| Trust Center as the place for audit reports | **Service Trust Portal** for audit reports; Trust Center for overview |
| Online Services Terms | **Microsoft Product Terms** |
| DDoS Basic / Standard | DDoS **infrastructure protection** (free) / **IP Protection** / **Network Protection** |
| PostgreSQL "single server and hyperscale" | Single Server retired (Mar 2025) → **Flexible Server**; Hyperscale (Citus) → Cosmos DB for PostgreSQL |
| MySQL (implied Single Server) | Single Server retired (Sep 2024) → **Flexible Server** |
| IoT Central | Retiring (no new apps since Sep 2026; ends **20 Sep 2029**) |
| Azure Sphere | Retirement announced for **2031** |
| Managed vs unmanaged disks | Unmanaged disks retired (**30 Sep 2025**) |
| Function Apps "~10 min window", "per-second consumption" | Flex Consumption is the recommended plan; Consumption 5/10 min; others unbounded; Linux Consumption retiring 2028 |

## Corrected statements

| Course said | Correct version |
|---|---|
| Queue Storage "maintains message order (FIFO)" | Queue Storage **does not guarantee FIFO**; use Service Bus for ordering |
| Virtual disks "SATA for OS and SCSI for data" | Managed disk **types** (Ultra, Premium SSD v2, Premium SSD, Standard SSD, Standard HDD) and roles (OS, data, temp) |
| Storage tiers: Hot, Cool, Archive | Added **Cold** tier (90-day minimum); Cool 30 days, Archive 180 days |
| "Redundancy across regions (3–6 copies)" | Full LRS / ZRS / GRS / GZRS / RA-* breakdown |
| Azure Firewall "IDPS", "up to 100 public IPs" | IDPS and TLS inspection are **Premium** SKU features; multiple public IPs supported |
| NSG default rules "can't be altered" | Can't be deleted, but **overridden** by higher-priority custom rules |
| Advisor category "High availability" | Now **Reliability** |
| Cloud Shell "needs storage account" | Persistent storage optional — **ephemeral sessions** need none |
| Logic Apps "90+ connectors" | **1,400+ connectors** |
| ExpressRoute "secured" | Private (not over the internet) but **not encrypted by default** |
| Region pairs as universal | Many newer regions have **no pair** and rely on availability zones |
| ARM template schema `2021-06-01` | Current schema `2019-04-01/deploymentTemplate.json` |
| AKS "scaling out a container to a separate ACI" | Virtual nodes (ACI) for burst — niche; main point: managed control plane |

## Added (missing from the course)

- Consumption model, pricing models, **serverless**, reliability/predictability/manageability benefits, use cases per cloud model
- Management group limits, resource IDs, ARM request flow
- **VM Scale Sets, availability sets** (fault/update domains), resources needed for a VM, **Azure Container Apps**, ACR, Functions hosting plans comparison, Functions vs Logic Apps
- **VNet peering, Azure DNS, public vs private endpoints**, service endpoints, load-balancing services, Bastion, NAT gateway
- Storage account types & endpoints, **redundancy**, **AzCopy, Storage Explorer, File Sync**, **Azure Migrate, Data Box**, lifecycle policies
- SQL family comparison, Cosmos DB consistency levels
- **Entra Domain Services**, licences, SSO, **passwordless**, **external identities**, **Zero Trust**, mandatory MFA
- Defender for Cloud capabilities, Key Vault CLI, confidential computing
- RBAC built-in roles & scopes, Policy effects & initiatives, **Microsoft Purview**, Well-Architected Framework
- **Azure Arc**, **IaC & Bicep**, Copilot in Azure, Azure Monitor details (**Log Analytics/KQL, alerts, Application Insights**), Resource Health
- Cost-saving options (reservations, savings plans, spot), budgets & alerts CLI
- Composite SLA math, VM SLA by deployment type, lifecycle stages
- Microsoft Fabric, Azure Data Factory, Foundry, Azure OpenAI, GitHub Actions OIDC example
- Labs with CLI solutions, CLI cheat sheet, renamed-products table, AZ-900 exam guide with practice questions
