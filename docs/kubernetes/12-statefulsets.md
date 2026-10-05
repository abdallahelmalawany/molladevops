# StatefulSets

<span class="exam-tag">CKA</span>

| | |
|---|---|
| **What** | Controller for workloads that need **stable identity** and **per-replica persistent storage**. |
| **Why** | Databases and clustered systems (PostgreSQL, Kafka, etcd, Elasticsearch) need each replica to keep its name and its own data — `db-0` must always be `db-0`. |
| **How** | Pods get ordinal names (`db-0`, `db-1`…), are created/scaled **in order**, and each gets its own PVC from `volumeClaimTemplates` that survives rescheduling. |

## Example

```yaml
apiVersion: v1
kind: Service
metadata: { name: db-headless }
spec:
  clusterIP: None              # headless
  selector: { app: db }
  ports:
    - { name: pg, port: 5432 }
---
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: db }
spec:
  serviceName: db-headless     # governing headless Service
  replicas: 3
  selector:
    matchLabels: { app: db }
  template:
    metadata:
      labels: { app: db }
    spec:
      containers:
        - name: db
          image: postgres:17
          env:
            - name: POSTGRES_PASSWORD
              valueFrom: { secretKeyRef: { name: pg-secret, key: password } }
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports: [{ containerPort: 5432, name: pg }]
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: gp3
        resources:
          requests: { storage: 20Gi }
```

Resulting PVCs: `data-db-0`, `data-db-1`, `data-db-2` — **not deleted** when the StatefulSet is scaled down or deleted (unless `persistentVolumeClaimRetentionPolicy` says so).

## Headless Services & stable DNS

- `clusterIP: None` → no virtual IP; DNS returns individual Pod IPs.
- Each Pod gets a stable name: **`db-0.db-headless.default.svc.cluster.local`**.
- Clients can target a specific replica (e.g. the primary); add a normal ClusterIP Service for "any replica" reads.

## Ordering & updates

| Setting | Behaviour |
|---|---|
| `podManagementPolicy: OrderedReady` (default) | Create 0→N one at a time (each Ready first); delete N→0 |
| `podManagementPolicy: Parallel` | Start/stop all at once |
| `updateStrategy: RollingUpdate` (default) | Update from highest ordinal to lowest; `partition: N` updates only ordinals ≥ N (staged/canary) |
| `updateStrategy: OnDelete` | Update a Pod only when you delete it |

## Deployment vs. StatefulSet

| | Deployment | StatefulSet |
|---|---|---|
| Pod identity | Random suffix, interchangeable | Stable ordinal names |
| Storage | Shared or none | Dedicated PVC per Pod |
| Scaling order | Any order, at once | Sequential (by default) |
| DNS | Service only | Per-Pod via headless Service |
| Typical workload | Stateless web/API/workers | Databases, queues, clusters |

!!! tip "Prefer Operators for production databases"
    Running a database well (failover, backups, upgrades) needs more than a StatefulSet. Use a mature **Operator** (CloudNativePG, Percona, Strimzi for Kafka, MongoDB Community Operator) — or a managed service (RDS) where possible.

## Quick recap

- [x] StatefulSet = stable names + ordered operations + per-Pod PVCs.
- [x] Requires a headless Service (`serviceName`) → `pod-N.svc.ns.svc.cluster.local`.
- [x] PVCs outlive the StatefulSet by default.
- [x] `partition` enables staged rollouts.
