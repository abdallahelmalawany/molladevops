# Pods & Workloads

<span class="exam-tag">CKA</span>

## The Pod

| | |
|---|---|
| **What** | The smallest deployable unit: one or more containers sharing a **network namespace (one IP)**, and optionally volumes. |
| **Why** | Tightly coupled helpers (log shipper, proxy) need to share `localhost` and files with the main container. |
| **How** | Kubernetes never schedules a bare container — always a Pod. Most Pods run one container; multi-container Pods use init and sidecar containers. |

Pods are **ephemeral** and don't heal themselves — always run them through a controller (Deployment, StatefulSet, DaemonSet, Job).

### Pod lifecycle phases

| Phase | Meaning |
|---|---|
| `Pending` | Accepted, but containers not running yet (scheduling, image pull) |
| `Running` | Bound to a node, at least one container running |
| `Succeeded` | All containers exited 0 and won't restart |
| `Failed` | All containers terminated, at least one non-zero |
| `Unknown` | State can't be obtained (node communication problem) |

Container states: `Waiting` (e.g. `ContainerCreating`, `CrashLoopBackOff`, `ImagePullBackOff`), `Running`, `Terminated` (e.g. `Completed`, `OOMKilled`, `Error`).

**restartPolicy**: `Always` (default) · `OnFailure` · `Never`.

### Init containers vs. sidecars

| Init containers | Sidecar containers |
|---|---|
| Run **to completion, in order**, before app containers start | Run **alongside** the app for the Pod's lifetime |
| Setup: wait for dependency, migrations, config generation | Log shipping, service-mesh proxy, metrics exporter |
| A failure restarts the init container (per `restartPolicy`) | Native sidecars = init container with `restartPolicy: Always` (**GA in 1.33**) — start before and stop after the app |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command: ["sh", "-c", "until nc -z db 5432; do sleep 2; done"]
    - name: log-shipper                 # native sidecar
      image: fluent/fluent-bit:3.2
      restartPolicy: Always
      volumeMounts:
        - { name: logs, mountPath: /var/log/app }
  containers:
    - name: app
      image: myapp:1.4
      ports: [{ containerPort: 8080 }]
      volumeMounts:
        - { name: logs, mountPath: /var/log/app }
  volumes:
    - name: logs
      emptyDir: {}
```

Other multi-container patterns: **ambassador** (proxy outbound connections), **adapter** (normalise output).

### Static Pods

- Managed **directly by the kubelet** from files in `staticPodPath` (default `/etc/kubernetes/manifests/`), not by the API server.
- The API server shows a read-only **mirror Pod** (name suffixed with the node name).
- kubeadm runs the control plane this way. Delete = remove the file.

## Labels, selectors & annotations

- **Labels**: key/value pairs (`app: frontend`, `env: prod`) used to group and select objects.
- **Selectors**: how Services find Pods and controllers find their Pods.
    - Equality-based: `env=prod`, `tier!=cache`
    - Set-based: `env in (prod,staging)`, `tier notin (cache)`, `!canary`
- **Annotations**: non-identifying metadata (build info, tool config); not used for selection.

```bash
kubectl label pod web tier=frontend env=prod
kubectl get pods -l tier=frontend
kubectl get pods -l 'env in (prod,staging)'
kubectl get pods --show-labels
kubectl delete pods -l tier=cache
```

Recommended labels: `app.kubernetes.io/name`, `app.kubernetes.io/instance`, `app.kubernetes.io/version`, `app.kubernetes.io/component`, `app.kubernetes.io/part-of`, `app.kubernetes.io/managed-by`.

## Namespaces

| | |
|---|---|
| **What** | Virtual clusters inside one physical cluster: a scope for names, quotas and RBAC. |
| **Why** | Isolate teams/environments without separate clusters. |
| **How** | Namespaced objects (Pods, Services, Deployments, Secrets) need unique names per namespace. Cluster-scoped objects (Nodes, PVs, StorageClasses, ClusterRoles, Namespaces) have none. |

```bash
kubectl create namespace staging
kubectl get pods -n staging
kubectl config set-context --current --namespace=staging
kubectl get pods -A
kubectl api-resources --namespaced=false      # list cluster-scoped kinds
kubectl delete namespace staging              # deletes EVERYTHING inside
```

Built-in: `default`, `kube-system`, `kube-public`, `kube-node-lease`.

## ReplicaSets

| | |
|---|---|
| **What** | Keeps a specified number of identical Pod replicas running. |
| **Why** | A single Pod has no self-healing. |
| **How** | Watches Pods matching its selector; creates or deletes Pods so the count equals `spec.replicas`. |

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: web-rs
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }     # must match the selector
    spec:
      containers:
        - name: web
          image: nginx:1.27
```

You rarely create ReplicaSets directly — **Deployments** manage them.

!!! warning "Legacy: ReplicationController"
    The predecessor of ReplicaSet, supports only equality-based selectors. Don't use it in new manifests.

## Deployments

| | |
|---|---|
| **What** | The standard controller for **stateless** apps: manages ReplicaSets and adds versioned rollouts. |
| **Why** | Editing a ReplicaSet template doesn't roll out anything. Apps need controlled, observable, reversible updates. |
| **How** | A template change creates a **new ReplicaSet**, scaled up while the old one scales down, per the strategy. |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels: { app: web }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1     # Pods that may be down during update (number or %)
      maxSurge: 1           # extra Pods allowed above replicas
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { memory: 256Mi }
```

```bash
kubectl scale deployment web --replicas=5
kubectl set image deployment/web web=nginx:1.28
kubectl rollout status deployment/web
kubectl rollout history deployment/web
kubectl annotate deployment/web kubernetes.io/change-cause="bump to 1.28"   # shown in history
kubectl rollout undo deployment/web
kubectl rollout undo deployment/web --to-revision=2
kubectl rollout pause|resume deployment/web
kubectl rollout restart deployment/web     # re-create Pods (e.g. to reload config)
```

!!! warning "Deprecated: `--record`"
    `kubectl ... --record` is deprecated. Set the `kubernetes.io/change-cause` annotation instead.

### Rollout strategies

| Strategy | Behaviour |
|---|---|
| **Recreate** | Kill all old Pods, then create new — brief downtime; for apps that can't run two versions |
| **RollingUpdate** (default) | Gradual replacement controlled by `maxUnavailable` / `maxSurge` — zero downtime |
| **Blue-Green** | Two full environments; switch traffic at once by changing the Service selector |
| **Canary** | Send a small share of traffic to the new version first (Gateway API weights, Argo Rollouts, Flagger, service mesh) |

Blue-green and canary aren't built-in Deployment strategies — they're patterns built with Services, Gateway API or tools like **Argo Rollouts**.

## Probes

| Probe | Question | On failure |
|---|---|---|
| **Startup** | Has the app finished starting? | Disables liveness/readiness until it succeeds; kills after `failureThreshold × periodSeconds` |
| **Liveness** | Is the container still alive? | kubelet **restarts** the container |
| **Readiness** | Can it serve traffic? | Removed from Service endpoints (**not restarted**) |

Mechanisms: `httpGet`, `tcpSocket`, `exec`, `grpc`.

```yaml
containers:
  - name: web
    image: myapp:2.0
    startupProbe:
      httpGet: { path: /healthz, port: 8080 }
      failureThreshold: 30
      periodSeconds: 10        # up to 300s to start
    livenessProbe:
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet: { path: /ready, port: 8080 }
      periodSeconds: 5
      failureThreshold: 2
```

!!! tip
    Don't use the same endpoint for liveness and readiness. A slow dependency should make the Pod *unready*, not restart it in a loop.

## Graceful termination

1. Pod marked `Terminating`; removed from Service endpoints (in parallel).
2. **`preStop`** hook runs (drain connections, flush buffers).
3. **SIGTERM** sent to containers.
4. After **`terminationGracePeriodSeconds`** (default **30s**) → **SIGKILL**.

`postStart` runs right after a container starts (no ordering guarantee vs. the entrypoint).

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: web
      image: myapp:2.0
      lifecycle:
        preStop:
          exec: { command: ["sh", "-c", "sleep 10"] }   # let LB stop sending traffic
```

## Common mistakes

- :x: Bare Pods in production (no self-healing).
- :x: No resource requests/limits → noisy neighbours, OOMKills.
- :x: Same probe for liveness and readiness → restart loops.
- :x: Grace period too short → dropped requests.
- :x: Editing a ReplicaSet owned by a Deployment → overwritten.
- :x: `:latest` tag → non-reproducible rollouts.

## Troubleshooting

| Symptom | Investigate | Likely cause | Fix |
|---|---|---|---|
| `Pending` | `kubectl describe pod`, events | Not enough resources, no matching node, taints, unbound PVC | Add capacity, fix selectors/tolerations, fix PVC |
| `CrashLoopBackOff` | `kubectl logs --previous` | App crash, bad config, missing env/dependency | Fix app/config, check probes |
| `ImagePullBackOff` / `ErrImagePull` | `kubectl describe pod` | Wrong tag, private registry without credentials | Fix tag; add `imagePullSecrets` |
| `OOMKilled` | `describe` → Last State | Memory limit too low / leak | Raise limit or fix the app |
| `CreateContainerConfigError` | `describe` | Missing ConfigMap/Secret key | Create it / fix the reference |
| Rollout stuck | `rollout status`, `describe rs` | New Pods failing readiness | Fix probe/app or `rollout undo` |

## Interview questions

??? question "What happens when you create a Deployment?"
    The Deployment controller creates a ReplicaSet, which creates the Pods; the scheduler assigns them to nodes and kubelets start the containers.

??? question "What happens when a Pod is deleted?"
    It's marked Terminating and removed from endpoints, `preStop` runs, SIGTERM is sent, and after the grace period SIGKILL.

??? question "How does a rolling update work?"
    A new ReplicaSet is created and scaled up while the old one scales down, respecting `maxSurge` and `maxUnavailable`.

??? question "Liveness vs readiness?"
    Liveness failure restarts the container; readiness failure only removes it from load balancing.

## Quick recap

- [x] Pod = shared IP + volumes; always behind a controller.
- [x] Native sidecars = init containers with `restartPolicy: Always`.
- [x] Deployment → ReplicaSet → Pods; `rollout status/history/undo`.
- [x] Startup / liveness / readiness probes do different jobs.
- [x] Termination: endpoints removed → preStop → SIGTERM → grace period → SIGKILL.
