# AZ-900 Exam Guide

## Exam facts

| Item | Detail |
|---|---|
| Exam | **AZ-900: Microsoft Azure Fundamentals** |
| Skills measured | As of **20 July 2026** |
| Passing score | **700** (scale 1–1000) |
| Duration | ~45 minutes of exam time (plus admin time) |
| Question types | Multiple choice, multiple response, yes/no statements, drag-and-drop, hot area |
| Price | ~US$99 in the US — varies by country |
| Validity | **Fundamentals certifications don't expire** |
| Delivery | Pearson VUE test centre or online proctored |

Official page & study guide: <https://learn.microsoft.com/credentials/certifications/azure-fundamentals/> · <https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900>

!!! tip "Free practice"
    Microsoft Learn has a **free practice assessment** for AZ-900 and the free learning path **AZ-900T00**. Microsoft Virtual Training Days sometimes include a free exam voucher.

## Domains → where to study

| Domain | Weight | Pages |
|---|---|---|
| **Describe cloud concepts** | 25–30% | [Cloud Concepts](01-cloud-concepts.md) |
| **Describe Azure architecture and services** | 35–40% | [Architecture](02-architecture.md), [Compute](03-compute.md), [Networking](04-networking.md), [Storage](05-storage.md), [Identity](07-identity.md), [Security](08-security.md) |
| **Describe Azure management and governance** | 30–35% | [Cost](11-cost-management.md), [Governance & Compliance](09-governance-compliance.md), [Management & Monitoring](10-management-tools.md) |

### Detailed objective checklist

**Cloud concepts**

- [ ] Cloud computing, shared responsibility, public/private/hybrid, use cases
- [ ] Consumption-based model, pricing models, serverless
- [ ] Benefits: HA & scalability, reliability & predictability, security & governance, manageability
- [ ] IaaS, PaaS, SaaS and their use cases

**Architecture & services**

- [ ] Regions, region pairs, sovereign regions, availability zones, datacenters
- [ ] Resources, resource groups, subscriptions, management groups and their hierarchy
- [ ] Compute types: containers, VMs, functions; VMs, scale sets, availability sets, AVD; resources a VM needs
- [ ] App hosting: web apps, containers, VMs
- [ ] VNets, subnets, peering, Azure DNS, VPN Gateway, ExpressRoute; public vs private endpoints
- [ ] Storage services, tiers, redundancy, account types; AzCopy, Storage Explorer, File Sync; Azure Migrate, Data Box
- [ ] Entra ID & Entra Domain Services; SSO, MFA, passwordless; external identities; Conditional Access; Azure RBAC; Zero Trust; defense in depth; Defender for Cloud

**Management & governance**

- [ ] Cost factors, pricing calculator, Cost Management, tags
- [ ] Microsoft Purview, Azure Policy, resource locks
- [ ] Portal, Cloud Shell, CLI, PowerShell, Azure Arc, IaC, ARM & ARM templates
- [ ] Advisor, Service Health, Azure Monitor (Log Analytics, alerts, Application Insights)

## Common traps

!!! question "Which items are *always* the customer's responsibility?"
    Information & data, devices, accounts & identities — in IaaS, PaaS and SaaS.

!!! question "Scale up vs scale out?"
    Scale **up** = bigger VM (vertical). Scale **out** = more VMs (horizontal). Elasticity = automatic scaling.

!!! question "Can a resource group contain resources from different regions?"
    **Yes.** Can RGs be nested? **No.** Can a resource be in two RGs? **No.**

!!! question "Are tags inherited from the resource group?"
    **No** — only via Azure Policy. Locks, RBAC and policies **are** inherited.

!!! question "Can an Owner delete a resource with a CanNotDelete lock?"
    **No** — the lock must be removed first.

!!! question "Does ExpressRoute use the internet?"
    **No.** VPN Gateway does (encrypted).

!!! question "Which storage tier is offline?"
    **Archive** — rehydrate before reading.

!!! question "Which tool estimates costs *before* deployment?"
    **Pricing calculator.** Cost Management analyses **actual** spend; budgets alert but don't stop resources.

!!! question "Does a preview feature have an SLA?"
    **No.** Neither do free services.

!!! question "Azure Policy vs RBAC?"
    Policy controls **what resources look like**; RBAC controls **what users can do**.

!!! question "Which service gives a secure score?"
    **Microsoft Defender for Cloud.**

!!! question "Where do you download SOC/ISO audit reports?"
    **Service Trust Portal.**

## Practice questions

??? question "1. A company wants to move existing VMs to Azure with minimal changes. Which service type?"
    **IaaS** (lift-and-shift to Azure VMs).

??? question "2. You need to apply the same policy to 20 subscriptions. What do you use?"
    A **management group** containing the subscriptions, with the policy assigned to it.

??? question "3. Data must survive a full regional outage and be readable from the secondary region at any time. Which redundancy?"
    **RA-GRS** (or **RA-GZRS** to also survive a zone failure in the primary).

??? question "4. Users must sign in with MFA when connecting from outside the corporate network. What do you configure?"
    **Microsoft Entra Conditional Access** (with MFA).

??? question "5. Which tool manages on-premises Linux servers with Azure Policy?"
    **Azure Arc** (Arc-enabled servers).

??? question "6. Two services with SLAs of 99.9% and 99.95% are both required. Composite SLA?"
    0.999 × 0.9995 ≈ **99.85%**.

??? question "7. You need to copy 80 TB to Azure but have a slow internet link."
    **Azure Data Box.**

??? question "8. Which service filters traffic to a subnet by IP, port and protocol?"
    A **network security group (NSG)**.

??? question "9. Which identity principle means 'minimise blast radius and segment access'?"
    **Assume breach** (Zero Trust).

??? question "10. Where can you see planned maintenance affecting your subscription's regions?"
    **Azure Service Health.**

??? question "11. A legacy app requires LDAP and Kerberos in Azure without managing domain controllers."
    **Microsoft Entra Domain Services.**

??? question "12. Which service provides recommendations to reduce cost and improve reliability?"
    **Azure Advisor.**

## Exam-day tips

- Read each statement in **yes/no** series independently.
- Watch for **old names** in distractors (Azure AD = Entra ID, Security Center = Defender for Cloud).
- "Most cost-effective", "least administrative effort" → usually PaaS/SaaS answers.
- Flag uncertain questions and review at the end — there's no penalty for guessing.
