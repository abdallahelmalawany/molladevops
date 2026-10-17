# Hands-on Labs

Use a free account or a sandbox subscription. Run labs in **Cloud Shell (Bash)** or locally after `az login`. **Delete the resource group at the end of every lab.**

```bash
# Common variables for all labs
RG=rg-az900-lab
LOC=westeurope
az group create -n $RG -l $LOC
```

## Lab 1 — Explore the hierarchy

1. Find your tenant ID, subscriptions and current subscription.
2. List management groups (if you have access).
3. Create a resource group with tags `Env=Lab` and `Owner=<you>`.

??? success "Solution"

    ```bash
    az account show --query "{tenant:tenantId, sub:name, id:id}" -o table
    az account list -o table
    az account management-group list -o table
    az group create -n $RG -l $LOC --tags Env=Lab Owner=abdallah
    ```

## Lab 2 — Linux VM in a VNet with an NSG

1. Create a VNet `10.10.0.0/16` with subnet `10.10.1.0/24`.
2. Create an Ubuntu VM (B-series) in that subnet with SSH key auth.
3. Allow inbound HTTP (80) via the NSG and install nginx with Run Command.
4. Browse to the public IP. Then **deallocate** the VM and note what still costs money.

??? success "Solution"

    ```bash
    az network vnet create -g $RG -n vnet-lab --address-prefixes 10.10.0.0/16 \
      --subnet-name snet-web --subnet-prefixes 10.10.1.0/24

    az vm create -g $RG -n vm-web --image Ubuntu2404 --size Standard_B1s \
      --vnet-name vnet-lab --subnet snet-web \
      --admin-username azureuser --generate-ssh-keys --public-ip-sku Standard

    az vm open-port -g $RG -n vm-web --port 80 --priority 1010
    az vm run-command invoke -g $RG -n vm-web --command-id RunShellScript \
      --scripts "sudo apt-get update && sudo apt-get install -y nginx"

    az vm show -d -g $RG -n vm-web --query publicIps -o tsv
    az vm deallocate -g $RG -n vm-web      # compute billing stops; disk + public IP still billed
    ```

## Lab 3 — Storage account, tiers and redundancy

1. Create a GPv2 storage account with **ZRS**.
2. Create a container, upload a file, set its tier to **Cool**, then **Archive**.
3. Add a lifecycle rule that moves blobs to Cool after 30 days.
4. Change the account redundancy to **GZRS** (where supported).

??? success "Solution"

    ```bash
    SA=stlab$RANDOM
    az storage account create -g $RG -n $SA -l $LOC --sku Standard_ZRS --kind StorageV2
    az storage container create --account-name $SA -n docs --auth-mode login
    echo "hello azure" > hello.txt
    az storage blob upload --account-name $SA -c docs -f hello.txt -n hello.txt --auth-mode login
    az storage blob set-tier --account-name $SA -c docs -n hello.txt --tier Cool --auth-mode login
    az storage blob set-tier --account-name $SA -c docs -n hello.txt --tier Archive --auth-mode login

    cat > policy.json <<'EOF'
    {"rules":[{"enabled":true,"name":"to-cool","type":"Lifecycle",
      "definition":{"filters":{"blobTypes":["blockBlob"]},
      "actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":30}}}}}]}
    EOF
    az storage account management-policy create -g $RG --account-name $SA --policy @policy.json
    az storage account update -g $RG -n $SA --sku Standard_GZRS
    ```

    `--auth-mode login` requires a data-plane role such as *Storage Blob Data Contributor* on the account.

## Lab 4 — Web app on App Service

1. Create an App Service plan (B1 Linux) and a web app.
2. Deploy a sample from a local folder (`az webapp up`).
3. Enforce HTTPS only and scale out to 2 instances.

??? success "Solution"

    ```bash
    az appservice plan create -g $RG -n plan-lab --is-linux --sku B1
    az webapp create -g $RG -p plan-lab -n web-lab-$RANDOM --runtime "PYTHON:3.12"
    # or from a folder containing an app:
    # az webapp up -g $RG -n <unique-name> --runtime "PYTHON:3.12" --sku B1
    az webapp update -g $RG -n <app-name> --https-only true
    az appservice plan update -g $RG -n plan-lab --number-of-workers 2
    ```

## Lab 5 — Governance: RBAC, locks, tags, policy

1. Give a colleague (or a test user) the **Reader** role on the resource group.
2. Add a **CanNotDelete** lock; try deleting the RG — it should fail.
3. Assign the built-in policy **"Allowed locations"** to the RG with only `westeurope`, then try creating a resource in `eastus`.
4. Remove the lock.

??? success "Solution"

    ```bash
    RG_ID=$(az group show -n $RG --query id -o tsv)
    az role assignment create --assignee user@contoso.com --role Reader --scope $RG_ID

    az lock create -n keep -g $RG --lock-type CanNotDelete
    az group delete -n $RG --yes            # fails while the lock exists

    POLICY=$(az policy definition list --query "[?displayName=='Allowed locations'].name" -o tsv)
    az policy assignment create -n allowed-loc --policy $POLICY --scope $RG_ID \
      --params '{"listOfAllowedLocations":{"value":["westeurope"]}}'
    az storage account create -g $RG -n stdeny$RANDOM -l eastus   # denied by policy

    az lock delete -n keep -g $RG
    ```

## Lab 6 — Key Vault secret

1. Create a Key Vault with RBAC authorisation.
2. Grant yourself *Key Vault Secrets Officer*, store a secret, read it back.

??? success "Solution"

    ```bash
    KV=kv-lab-$RANDOM
    az keyvault create -g $RG -n $KV --enable-rbac-authorization true
    ME=$(az ad signed-in-user show --query id -o tsv)
    az role assignment create --assignee $ME --role "Key Vault Secrets Officer" \
      --scope $(az keyvault show -n $KV --query id -o tsv)
    az keyvault secret set --vault-name $KV -n DbPassword --value 'S3cr3t!'
    az keyvault secret show --vault-name $KV -n DbPassword --query value -o tsv
    ```

## Lab 7 — Monitoring & cost

1. Create a **budget** of 10 (your currency) on the subscription with an 80% alert (portal: Cost Management → Budgets).
2. Create a **CPU > 80%** metric alert on the VM from Lab 2 with an email action group.
3. Check **Azure Advisor** recommendations and **Service Health** for your regions.

??? success "Solution"

    ```bash
    az monitor action-group create -g $RG -n ag-email --short-name email \
      --action email me abdallah@example.com
    VM_ID=$(az vm show -g $RG -n vm-web --query id -o tsv)
    az monitor metrics alert create -g $RG -n cpu-high --scopes $VM_ID \
      --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m \
      --action ag-email
    az advisor recommendation list -o table
    ```

## Lab 8 — Bicep deployment

Deploy the storage account from [Management tools → Bicep](10-management-tools.md#bicep) with `what-if` first, then `create`.

## Clean up

```bash
az group delete -n $RG --yes --no-wait
```
