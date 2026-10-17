# IoT, Data, AI & DevOps Solutions

!!! info
    These services were part of the older AZ-900 outline (the course's Module 5). They're no longer separate exam objectives, but useful context — especially for MLOps.

## IoT

| Service | What it is |
|---|---|
| **Azure IoT Hub** | PaaS gateway for **bidirectional communication** with millions of devices: telemetry in, commands/config out (device twins), per-device identity, MQTT/AMQP/HTTPS |
| **Device Provisioning Service (DPS)** | Zero-touch, at-scale provisioning of devices to IoT Hub |
| **Azure IoT Operations** | Edge data plane on Arc-enabled Kubernetes for industrial IoT |
| **Azure Digital Twins** | Model physical environments as digital twins |

!!! warning "Retiring"
    - **Azure IoT Central** (SaaS IoT app platform): new applications can no longer be created (since Sept 2026); existing apps run until **20 Sep 2029**. Microsoft recommends IoT Hub + DPS + Microsoft Fabric.
    - **Azure Sphere** (secured MCU hardware + Linux-based OS + security service): retirement announced for **2031**.

## Data & analytics

| Service | What it is |
|---|---|
| **Microsoft Fabric** | Unified SaaS analytics platform: OneLake, data engineering (Spark), data warehouse, real-time intelligence, data science, Power BI — Microsoft's strategic analytics platform |
| **Azure Synapse Analytics** | PaaS analytics: pipelines (ETL/ELT), dedicated & serverless **SQL pools**, Apache Spark, Synapse Studio — enterprise data warehousing |
| **Azure Databricks** | Apache Spark-based analytics & AI platform (Databricks lakehouse) as a first-party Azure service; collaborative notebooks, MLflow, Unity Catalog |
| **Azure HDInsight** | Managed open-source clusters (Hadoop, Spark, Kafka, HBase, Hive) |
| **Azure Data Factory** | Managed data integration (ETL/ELT) with 90+ connectors |
| **Azure Data Explorer** | Fast analytics on logs/telemetry with KQL |
| **Azure Stream Analytics / Event Hubs** | Real-time stream ingestion & processing |

!!! note
    New analytics projects increasingly start on **Microsoft Fabric**; Synapse and HDInsight remain supported. **HDInsight on AKS** was retired in January 2025.

## AI

| Service | What it is |
|---|---|
| **Azure Machine Learning** | End-to-end ML platform: notebooks, **AutoML**, designer (drag-and-drop), training on managed compute, model registry, managed online/batch endpoints, MLOps pipelines, responsible AI |
| **Microsoft Foundry** (formerly Azure AI Foundry / Azure AI Studio) | Platform to build generative-AI apps and agents: model catalogue (Azure OpenAI, open models), prompt flow, evaluation, agent service |
| **Foundry Tools** (formerly **Azure AI services / Cognitive Services**) | Prebuilt AI APIs: **Vision**, **Speech** (speech-to-text, text-to-speech, translation), **Language** (NLP, sentiment, entities, question answering), **Translator**, **Document Intelligence**, **Content Safety** |
| **Azure OpenAI in Foundry Models** | GPT and other OpenAI models with Azure security, networking and compliance |
| **Azure AI Bot Service** | Build conversational bots (multichannel: Teams, web chat); often paired with Copilot Studio |

!!! warning "Renamed"
    **Cognitive Services** → **Azure AI services** (2023) → **Foundry Tools** (2025/26). The course's "Azure Cognitive Services" and "Azure Bot Service" map to these.

## DevOps & developer services

| Service | What it is |
|---|---|
| **Azure DevOps** | Boards (Agile/Kanban), **Repos** (Git), **Pipelines** (CI/CD for any platform), Test Plans, Artifacts |
| **GitHub & GitHub Actions** | Microsoft-owned code hosting, CI/CD workflows, Codespaces, Advanced Security; first-class Azure integration (OIDC login) |
| **Azure DevTest Labs** | Self-service lab environments with policies (allowed VM sizes, auto-shutdown, quotas), reusable templates and artifacts; REST API for CI integration |
| **Azure Load Testing** | Managed load testing (JMeter/Locust) |
| **Azure Deployment Environments** | Self-service, template-based app infrastructure for developers |

```yaml
# GitHub Actions: deploy Bicep with OIDC (no stored secrets)
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az deployment group create -g rg-demo -f infra/main.bicep
```

## Quick recap

- [x] IoT Hub (bidirectional device messaging) + DPS; IoT Central & Azure Sphere retiring.
- [x] Fabric (strategic), Synapse (warehouse + Spark), Databricks (Spark lakehouse), HDInsight (open-source clusters).
- [x] Azure ML (build/train/deploy models), Foundry (gen-AI apps & agents), Foundry Tools (prebuilt AI APIs), Bot Service.
- [x] Azure DevOps / GitHub Actions for CI/CD; DevTest Labs for governed lab environments.
