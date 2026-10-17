# Databases

!!! info
    Databases are no longer a separate AZ-900 objective, but they appear across the exam as PaaS examples and are essential in practice.

## Overview

| Service | Engine / model | Type |
|---|---|---|
| **Azure SQL Database** | SQL Server engine, single DB or elastic pool | PaaS |
| **Azure SQL Managed Instance** | Near 100% SQL Server compatibility, instance-level features | PaaS |
| **SQL Server on Azure VMs** | Full SQL Server, you manage OS & SQL | IaaS |
| **Azure Cosmos DB** | Globally distributed multi-model NoSQL | PaaS / serverless |
| **Azure Database for PostgreSQL – Flexible Server** | PostgreSQL | PaaS |
| **Azure Database for MySQL – Flexible Server** | MySQL | PaaS |
| **Azure Cache for Redis / Azure Managed Redis** | In-memory cache | PaaS |

## Azure SQL family

| | Azure SQL Database | SQL Managed Instance | SQL Server on Azure VM |
|---|---|---|---|
| Model | PaaS (database-scoped) | PaaS (instance-scoped) | IaaS |
| Compatibility | Most common features | Near 100% SQL Server (SQL Agent, cross-DB queries, CLR, linked servers) | 100% |
| Management | Fully managed (patching, backups, HA) | Fully managed | You manage OS and SQL |
| Best for | Modern cloud apps, SaaS | Lift-and-shift of SQL Server estates | Full control, OS-level access |

Azure SQL Database highlights:

- Always runs the **latest stable SQL Server engine**; automatic patching, backups and point-in-time restore.
- Purchasing models: **vCore** (General Purpose, Business Critical, **Hyperscale**) or DTU; **serverless** compute tier auto-pauses.
- Built-in HA up to **99.99%** SLA (higher with zone redundancy in some tiers); active geo-replication & failover groups.
- **Server-level firewall rules** restrict access by IP; private endpoints for private access; Microsoft Entra authentication.
- **Azure Hybrid Benefit** lets you reuse SQL Server licences for vCore-based SQL DB/MI.

## Azure Cosmos DB

- **Globally distributed**, multi-region writes, **single-digit-millisecond** latency, automatic and instant scalability.
- Multiple APIs: **NoSQL** (native), **MongoDB**, **Apache Cassandra**, **Table**, **Apache Gremlin** (graph), and **PostgreSQL** (distributed relational).
- Five consistency levels: Strong, Bounded staleness, Session (default), Consistent prefix, Eventual.
- Capacity: provisioned throughput (RU/s), autoscale, or serverless.
- Up to **99.999%** availability SLA with multi-region accounts.

## Azure Database for PostgreSQL / MySQL — Flexible Server

- Fully managed community engines: automatic backups, **point-in-time restore**, patching, monitoring and alerts.
- **Zone-redundant high availability** (standby in another zone), read replicas, stop/start to save cost.
- VNet integration or private endpoints, Microsoft Entra authentication.

!!! warning "Retired: Single Server"
    **Azure Database for MySQL – Single Server** (retired Sept 2024) and **Azure Database for PostgreSQL – Single Server** (retired March 2025) are gone. The course's "single server" option is replaced by **Flexible Server**. The old "Hyperscale (Citus)" option became **Azure Cosmos DB for PostgreSQL**.

## Choosing quickly

| Requirement | Pick |
|---|---|
| New relational app, minimal ops | Azure SQL Database (or PostgreSQL Flexible Server) |
| Migrate SQL Server with instance features | SQL Managed Instance |
| Need OS access / unsupported features | SQL Server on Azure VM |
| Global NoSQL, low latency, multi-region writes | Cosmos DB |
| Open-source engine (PostgreSQL/MySQL) | Flexible Server |
| Caching, session state | Azure Cache for Redis / Azure Managed Redis |

## Quick recap

- [x] SQL Database (PaaS, DB-scoped) · Managed Instance (PaaS, instance-scoped, lift-and-shift) · SQL on VM (IaaS).
- [x] Cosmos DB: global, multi-model APIs, 5 consistency levels.
- [x] PostgreSQL/MySQL → **Flexible Server** (Single Server retired).
