# Cost Management

<span class="exam-tag">AZ-900 · Management & governance</span>

## Factors that affect cost

| Factor | Notes |
|---|---|
| **Resource type & size** | Service, tier/SKU, VM size, storage tier and redundancy |
| **Consumption** | Pay-as-you-go vs **reservations** (1/3 years) and **savings plans** |
| **Maintenance** | Leftover resources (unattached disks, idle IPs, deallocated VMs' disks) keep costing |
| **Geography (region)** | Prices differ by region (power, labour, taxes) |
| **Network traffic** | **Inbound (ingress) is mostly free; outbound (egress)** and cross-region/zone transfer are billed; bandwidth zones |
| **Subscription / offer type** | Free account credits, Dev/Test pricing, EA/MCA/CSP agreements |
| **Azure Marketplace** | Third-party software adds its licence cost to your bill |
| **Licensing** | **Azure Hybrid Benefit** reuses Windows Server, SQL Server and Linux subscriptions |

## Ways to save

| Option | Saving idea |
|---|---|
| **Reservations** | Commit 1 or 3 years to specific resources (VMs, SQL, Cosmos DB…) — up to ~72% vs pay-as-you-go |
| **Savings plan for compute** | Commit an hourly spend for 1 or 3 years, flexible across VM sizes/regions/services |
| **Spot VMs** | Spare capacity at deep discounts; can be evicted — for interruptible work |
| **Azure Hybrid Benefit** | Bring existing licences with Software Assurance |
| **Dev/Test pricing** | Discounted rates for non-production subscriptions |
| **Right-sizing & auto-shutdown** | Advisor recommendations, schedules, autoscale |
| **Storage lifecycle policies** | Move cold data to cool/cold/archive tiers |
| **Delete unused resources** | Orphaned disks, public IPs, old snapshots |

## Pricing calculator

- Web tool to **estimate the cost of Azure services before deploying** them.
- Configure region, tier, instance count, hours, reservations, support plan, currency; **export/share** estimates.
- Estimates only — no charges, no provisioning.
- <https://azure.microsoft.com/pricing/calculator/>

## Total cost of ownership (TCO)

- Compares the cost of running workloads **on-prem vs. in Azure** (servers, storage, network, electricity, datacenter, labour).
- The standalone **TCO Calculator** has been deprecated. Use **Azure Migrate business case** (based on discovered on-prem inventory) together with the pricing calculator.

!!! info "Exam note"
    The current AZ-900 outline names only the **pricing calculator**. Older material (and the course) also teaches the TCO calculator — know what it did, but expect pricing calculator / Azure Migrate questions.

## Microsoft Cost Management

Built into the portal for every subscription.

| Feature | What it does |
|---|---|
| **Cost analysis** | Explore and visualise actual and forecast costs; group/filter by subscription, resource group, service, region, **tag** |
| **Budgets** | Set spending thresholds per scope; budgets **don't stop resources** by themselves |
| **Cost alerts** | **Budget alerts**, **credit alerts** (EA monetary commitment), **department spending quota alerts**; can trigger action groups/automation |
| **Recommendations** | Cost recommendations from **Azure Advisor** |
| **Exports** | Scheduled cost data exports to storage for reporting (FinOps, Power BI) |
| **Anomaly detection** | Alerts on unusual spending |

```bash
az consumption budget create --budget-name monthly-200 --amount 200 \
  --category cost --time-grain monthly \
  --start-date 2026-11-01 --end-date 2027-10-31
```

## Tags for cost

- Tag resources (`CostCenter`, `Project`, `Env`, `Owner`) and group costs by tag in Cost analysis.
- Enforce tagging with **Azure Policy** (require/inherit tags).

## Billing scopes (good to know)

- Costs roll up from resource → resource group → subscription; invoices depend on the agreement (MOSP pay-as-you-go, EA, MCA, CSP).
- **Spending limit** exists on free/credit-based subscriptions only.

## Quick recap

- [x] Cost drivers: resource type/size, consumption model, region, **egress traffic**, subscription type, marketplace, licences.
- [x] Save: reservations, savings plans, spot, Hybrid Benefit, right-size, delete orphans.
- [x] Pricing calculator = estimate before deploying; TCO → Azure Migrate business case.
- [x] Cost Management: cost analysis, budgets, alerts, Advisor recommendations, exports.
- [x] Tags make costs attributable.
