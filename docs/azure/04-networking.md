# Networking

<span class="exam-tag">AZ-900 · Architecture & services</span>

## Virtual networks (VNets)

- The fundamental private network in Azure: resources (VMs, private endpoints, AKS nodes…) communicate securely with each other, the internet and on-prem.
- Defined by one or more **private IP address ranges** (CIDR, e.g. `10.0.0.0/16`).
- Scoped to **one region and one subscription**.
- Divided into **subnets** (e.g. `10.0.1.0/24`); Azure reserves **5 IPs** in every subnet.
- Outbound internet access works by default for resources; **inbound** requires a public IP or load balancer and NSG rules.

Capabilities:

| Capability | How |
|---|---|
| Isolation & segmentation | VNets and subnets; NSGs |
| Internet communication | Public IPs, load balancers, NAT gateway |
| Communicate between Azure resources | Same VNet, **VNet peering**, service/private endpoints |
| Communicate with on-prem | **VPN Gateway**, **ExpressRoute** |
| Route traffic | System routes, **user-defined routes (UDRs)**, BGP |
| Filter traffic | **Network security groups**, Azure Firewall, network virtual appliances |

```bash
az network vnet create -g rg-net -n vnet-hub --address-prefixes 10.0.0.0/16 \
  --subnet-name snet-app --subnet-prefixes 10.0.1.0/24
```

## VNet peering

- Connects two VNets so they behave as one network for connectivity, using **private IPs over the Microsoft backbone** (never the public internet).
- **Regional** (same region) or **global** (different regions) peering.
- Non-transitive by default (A↔B and B↔C does not give A↔C) — use a hub with a firewall/route server or **Azure Virtual WAN**.
- Address spaces must not overlap.

## Azure DNS

- Hosts DNS domains on Microsoft's global network of name servers.
- **Public DNS zones** (internet names) and **private DNS zones** (name resolution inside VNets).
- Managed with the same credentials, RBAC, tags and logs as other Azure resources; you **can't buy domain names** with Azure DNS (use App Service Domains or a registrar).

## Connecting to on-premises

### VPN Gateway

- Sends **encrypted traffic over the public internet** (IPsec/IKE) between a VNet and other networks.

| Type | Connects |
|---|---|
| **Site-to-site (S2S)** | On-prem network ↔ VNet (via on-prem VPN device) |
| **Point-to-site (P2S)** | Individual devices ↔ VNet (remote workers) |
| **VNet-to-VNet** | VNet ↔ VNet |

- **Route-based** (recommended, supports P2S/BGP) vs **policy-based** VPN.
- One VPN gateway per VNet; deploy **active-active** or zone-redundant SKUs for HA.

### ExpressRoute

- **Private, dedicated connection** from on-prem to Microsoft cloud through a **connectivity provider** — **does not go over the public internet**.
- Higher reliability, consistent latency, higher bandwidth (up to 100 Gbps with ExpressRoute Direct).
- Connects to Azure services and Microsoft 365.
- Connectivity models: CloudExchange co-location, point-to-point Ethernet, any-to-any (IPVPN), ExpressRoute Direct.
- **Global Reach** links on-prem sites to each other through ExpressRoute.
- Traffic is private but **not encrypted by default** (use MACsec or IPsec over ExpressRoute if needed).

| | VPN Gateway | ExpressRoute |
|---|---|---|
| Path | Public internet (encrypted tunnel) | Private provider connection |
| Bandwidth | Up to ~10 Gbps (SKU-dependent) | 50 Mbps – 100 Gbps |
| Latency | Variable | Predictable |
| Cost / setup | Lower, quick | Higher, needs a provider |
| Common pattern | Backup path for ExpressRoute | Primary for mission-critical / large data |

## Public vs. private endpoints

| | Public endpoint | Service endpoint | Private endpoint |
|---|---|---|---|
| What | Service reachable on a public IP/FQDN | Extends VNet identity to a PaaS service over the backbone | A **private IP in your VNet** mapped to a specific PaaS resource (Private Link) |
| Traffic path | Internet (can be restricted by firewall rules) | Microsoft backbone, service still has a public IP | Fully private; can disable public access |
| Reachable from on-prem via VPN/ER | Via internet | No | **Yes** |

Private endpoints are the recommended way to lock PaaS services (Storage, SQL, Key Vault) inside your network; pair them with **private DNS zones**.

## Load balancing & delivery (good to know)

| Service | Layer | Scope | Use |
|---|---|---|---|
| **Azure Load Balancer** | L4 (TCP/UDP) | Regional | Distribute traffic to VMs/scale sets |
| **Application Gateway** | L7 (HTTP/S) | Regional | Path-based routing, TLS termination, **WAF** |
| **Azure Front Door** | L7 | Global | Global HTTP load balancing, CDN, WAF |
| **Traffic Manager** | DNS | Global | DNS-based routing (priority, weighted, performance, geographic) |

Other networking services: **NAT Gateway** (outbound internet), **Azure Bastion** (RDP/SSH through the browser without public IPs), **Azure Firewall**, **DDoS Protection** → see [Security](08-security.md).

## Quick recap

- [x] VNet = private network per region/subscription, split into subnets.
- [x] Peering connects VNets over the Microsoft backbone (regional or global, non-transitive).
- [x] Azure DNS: public and private zones; no domain purchase.
- [x] VPN Gateway = encrypted over internet (S2S, P2S, VNet-to-VNet); ExpressRoute = private, not over internet.
- [x] Private endpoint = private IP for a PaaS resource; public endpoint = internet-facing.
