# Azure CLI Cheat Sheet & Key Facts

## Azure CLI basics

```bash
az login                                   # browser / device code (--use-device-code)
az account list -o table
az account set --subscription "<name-or-id>"
az account show
az configure --defaults group=rg-demo location=westeurope
az find "az vm"                            # AI-powered command suggestions
az <group> --help
# Output formats: -o json | jsonc | table | tsv | yaml | none ;  filter with --query (JMESPath)
az vm list --query "[].{name:name, rg:resourceGroup}" -o table
```

## Resource groups & resources

```bash
az group create -n rg-demo -l westeurope --tags Env=Dev
az group list -o table
az resource list -g rg-demo -o table
az group delete -n rg-demo --yes --no-wait
az lock create -n no-del -g rg-demo --lock-type CanNotDelete
```

## Compute

```bash
az vm create -g rg-demo -n vm1 --image Ubuntu2404 --size Standard_B2s --generate-ssh-keys
az vm list-sizes -l westeurope -o table
az vm start|stop|deallocate|restart -g rg-demo -n vm1
az vm open-port -g rg-demo -n vm1 --port 443
az vmss create -g rg-demo -n vmss1 --image Ubuntu2404 --instance-count 2 --zones 1 2 3
az webapp up -n <unique-app> --runtime "NODE:20-lts"
az functionapp create -g rg-demo -n <fn> --flexconsumption-location westeurope \
  --runtime python --runtime-version 3.12 --storage-account <sa>
az aks create -g rg-demo -n aks1 --node-count 2 --generate-ssh-keys
az aks get-credentials -g rg-demo -n aks1
az container create -g rg-demo -n aci1 --image mcr.microsoft.com/azuredocs/aci-helloworld \
  --ports 80 --ip-address Public --os-type Linux --cpu 1 --memory 1.5
```

## Networking

```bash
az network vnet create -g rg-demo -n vnet1 --address-prefixes 10.0.0.0/16 \
  --subnet-name snet1 --subnet-prefixes 10.0.1.0/24
az network vnet peering create -g rg-demo -n hub-to-spoke --vnet-name hub \
  --remote-vnet spoke --allow-vnet-access
az network nsg rule create -g rg-demo --nsg-name nsg1 -n allow-ssh --priority 100 \
  --destination-port-ranges 22 --access Allow --protocol Tcp
az network public-ip create -g rg-demo -n pip1 --sku Standard
az network private-dns zone create -g rg-demo -n privatelink.blob.core.windows.net
```

## Storage

```bash
az storage account create -g rg-demo -n <name> --sku Standard_LRS --kind StorageV2
az storage container create --account-name <sa> -n data --auth-mode login
az storage blob upload --account-name <sa> -c data -f file.txt --auth-mode login
az storage blob set-tier --account-name <sa> -c data -n file.txt --tier Cool --auth-mode login
az storage share-rm create -g rg-demo --storage-account <sa> -n share1 --quota 100
azcopy copy ./dir "https://<sa>.blob.core.windows.net/data" --recursive
```

## Identity, governance, security

```bash
az ad signed-in-user show
az role assignment create --assignee <upn|objectId> --role Reader --scope <scope-id>
az role definition list --query "[?roleType=='BuiltInRole'].roleName" -o tsv
az policy assignment list -o table
az keyvault create -g rg-demo -n <kv> --enable-rbac-authorization true
az keyvault secret set --vault-name <kv> -n MySecret --value '...'
```

## Monitoring & cost

```bash
az monitor metrics list --resource <id> --metric "Percentage CPU"
az monitor activity-log list -g rg-demo --offset 1d -o table
az monitor log-analytics workspace create -g rg-demo -n law1
az advisor recommendation list --category Cost -o table
az consumption usage list --top 10 -o table
```

## IaC

```bash
az bicep install
az deployment group what-if -g rg-demo -f main.bicep
az deployment group create  -g rg-demo -f main.bicep -p env=dev
az group export -n rg-demo > exported.json         # export ARM template
```

## AZ-900 key facts table

| Topic | Remember |
|---|---|
| Shared responsibility | You always own **data, devices, accounts/identities** |
| IaaS / PaaS / SaaS | VM / App Service, Azure SQL / Microsoft 365 |
| Scale up vs out | Vertical (bigger) vs horizontal (more instances) |
| Region pair | ~300+ miles apart, same geography, sequential updates |
| Availability zones | ≥3 per zone-enabled region, independent power/cooling/network |
| Management groups | Up to **6 levels** deep |
| Resource groups | No nesting; a resource in exactly one RG; delete RG = delete contents |
| Storage tiers | Hot · Cool (30d) · Cold (90d) · Archive (180d, offline) |
| Redundancy | LRS 3 · ZRS 3 (zones) · GRS/GZRS 6 (2 regions) · RA- = read secondary |
| VPN vs ExpressRoute | Encrypted over internet vs private connection |
| Entra ID | Formerly Azure AD; Conditional Access needs P1 |
| Zero Trust | Verify explicitly, least privilege, assume breach |
| Defense in depth | Physical → identity → perimeter → network → compute → app → data |
| Locks | CanNotDelete, ReadOnly; inherited; even Owners blocked |
| Tags | Not inherited |
| Policy vs RBAC | Resource properties vs user actions |
| Advisor categories | Reliability, Security, Performance, Cost, Operational excellence |
| Service Health | Azure status + Service Health + Resource Health |
| SLA | Free & preview = no SLA; credits if missed |
| Pricing tools | Pricing calculator (estimate); Cost Management (actual) |

## Renamed / retired cheat sheet

| Old name | Current |
|---|---|
| Azure Active Directory | **Microsoft Entra ID** |
| Azure AD Connect | **Microsoft Entra Connect** (Sync / Cloud Sync) |
| Azure AD Domain Services | **Microsoft Entra Domain Services** |
| Azure AD B2C | **Microsoft Entra External ID** (B2C no longer sold to new customers) |
| Azure Security Center / Azure Defender | **Microsoft Defender for Cloud** |
| Azure Sentinel | **Microsoft Sentinel** |
| Windows Virtual Desktop | **Azure Virtual Desktop** |
| Cognitive Services / Azure AI services | **Foundry Tools** |
| Azure AI Studio / Azure AI Foundry | **Microsoft Foundry** |
| Azure Blueprints | Retiring 31 Jan 2027 → **Template Specs + Deployment Stacks** |
| TCO Calculator | Deprecated → **Azure Migrate business case** + pricing calculator |
| Online Services Terms | **Microsoft Product Terms** |
| DDoS Basic / Standard | **DDoS infrastructure protection** / **DDoS Network Protection** (+ IP Protection) |
| MySQL / PostgreSQL Single Server | **Flexible Server** |
| Unmanaged disks | **Managed disks** |
| AzureRM PowerShell | **Az** module |
| Azure Purview / Compliance Center | **Microsoft Purview** |
