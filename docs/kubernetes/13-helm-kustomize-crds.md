# Helm, Kustomize & CRDs

<span class="exam-tag">CKA</span>

## Helm vs. Kustomize

| | Helm | Kustomize |
|---|---|---|
| Model | Templating (Go templates) → YAML | Overlays/patches on plain YAML |
| Packaging | **Charts**, versioned, with `values.yaml` | **Bases + overlays**, no registry needed |
| Built into kubectl | No (`helm` CLI) | Yes (`kubectl apply -k`) |
| Release tracking | Yes (history, rollback) | No (plain apply) |
| Best for | Distributing reusable apps (Prometheus, cert-manager) | Environment variants of your own manifests |

They combine well: Argo CD can render Helm charts and Kustomize overlays; Kustomize can inflate Helm charts.

## Helm

Concepts: **chart** (package) · **values** (config) · **release** (installed instance) · **repository** (HTTP or OCI registry).

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm search repo kube-prometheus-stack --versions | head
helm show values prometheus-community/kube-prometheus-stack > values.yaml

helm install mon prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f values-prod.yaml --version <chart-version>   # pin it
helm upgrade --install mon prometheus-community/kube-prometheus-stack -n monitoring -f values-prod.yaml
helm list -A
helm status mon -n monitoring
helm get values mon -n monitoring
helm history mon -n monitoring
helm rollback mon 1 -n monitoring
helm uninstall mon -n monitoring

helm template mon ./mychart -f values.yaml     # render locally, no install
helm lint ./mychart
helm install app oci://registry.example.com/charts/app --version 1.2.0   # OCI registry
```

Chart structure:

```text
mychart/
├── Chart.yaml          # name, version (chart), appVersion (app)
├── values.yaml         # defaults
├── templates/          # Go-templated manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl
└── charts/             # dependencies
```

!!! warning "Legacy"
    - **Helm 2 / Tiller** is long gone — Helm 3+ has no in-cluster component and stores releases as Secrets in the release namespace.
    - **Bitnami** moved most free images/charts to a legacy repository in 2025 — check image availability before using older Bitnami examples.

## Kustomize

```text
app/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/kustomization.yaml
    └── production/kustomization.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
labels:
  - pairs: { app.kubernetes.io/name: web }
    includeSelectors: true
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base
images:
  - name: myapp
    newTag: "2.1.0"
patches:
  - target: { kind: Deployment, name: web }
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
configMapGenerator:
  - name: app-config
    literals: [LOG_LEVEL=warn]       # hashed name → automatic rollout on change
```

```bash
kubectl kustomize overlays/production      # render
kubectl apply -k overlays/production       # apply
kubectl diff -k overlays/production
```

!!! note
    `commonLabels` and `patchesStrategicMerge` / `patchesJson6902` are deprecated in Kustomize — use `labels` and `patches`.

## CRDs & the Operator pattern

| | |
|---|---|
| **What** | A **CustomResourceDefinition** adds a new resource type to the API (`Certificate`, `Application`, `ClusterPolicy`). An **Operator** is a controller that reconciles those resources. |
| **Why** | Built-in objects can't express domain logic like "a 3-node PostgreSQL cluster with nightly backups". Operators encode operational knowledge as a reconcile loop. |
| **How** | Apply the CRD → API server serves the new kind and stores it in etcd; the Operator (usually installed with Helm) watches it and creates real objects. |

Common Operators: Argo CD, cert-manager, Prometheus Operator, External Secrets, CloudNativePG, Strimzi, NVIDIA GPU Operator.

```bash
kubectl get crds
kubectl api-resources --api-group=cert-manager.io
kubectl explain certificate.spec
kubectl get certificates -A
```

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata: { name: shop-tls, namespace: shop }
spec:
  secretName: shop-tls
  dnsNames: [shop.example.com]
  issuerRef: { name: letsencrypt-prod, kind: ClusterIssuer }
```

!!! danger
    `kubectl delete crd certificates.cert-manager.io` deletes **every** Certificate object in the cluster.

Minimal CRD:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.ops.example.com        # <plural>.<group>
spec:
  group: ops.example.com
  scope: Namespaced
  names: { plural: backups, singular: backup, kind: Backup, shortNames: [bk] }
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                schedule: { type: string }
                retentionDays: { type: integer, minimum: 1 }
```

## Quick recap

- [x] Helm = templated charts + releases (`install/upgrade/rollback/uninstall`, `template` to render).
- [x] Kustomize = base + overlays, built into kubectl (`-k`).
- [x] CRD = new API type; Operator = controller for it. Deleting a CRD deletes all its objects.
