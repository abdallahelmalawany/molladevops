# kubectl & YAML

<span class="exam-tag">CKA</span>

## kubectl basics

- A thin client: every command becomes an **HTTPS request to the API server**.
- Configuration (clusters, users, namespaces) lives in a **kubeconfig** file: `~/.kube/config` (or `$KUBECONFIG`).
- Supports **imperative** commands (`run`, `create`, `expose`, `scale`) and **declarative** manifests (`apply -f`).
- Short names: `po` pods · `svc` services · `deploy` deployments · `rs` replicasets · `ns` namespaces · `cm` configmaps · `sa` serviceaccounts · `pv` · `pvc` · `ds` daemonsets · `sts` statefulsets · `ing` ingresses · `netpol` networkpolicies.

```bash
alias k=kubectl
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
```

## Essential commands

```bash
kubectl get pods                         # list Pods in current namespace
kubectl get pods -o wide                 # + node and IP
kubectl get all -A                       # common objects, all namespaces
kubectl get pod web -o yaml              # full live object
kubectl describe pod web                 # details + recent Events
kubectl logs web [-c container]          # container logs
kubectl logs -f web                      # stream
kubectl logs web --previous              # crashed container's logs
kubectl exec -it web -- sh               # shell inside
kubectl apply -f deploy.yaml             # declarative create/update
kubectl delete -f deploy.yaml
kubectl get events --sort-by=.lastTimestamp
kubectl explain pod.spec.containers      # built-in API docs
kubectl explain deploy.spec --recursive | less
kubectl api-resources                    # every resource type + short name + scope
```

`describe` and `logs` are the two commands you'll use most when troubleshooting.

## Anatomy of a manifest

Every object shares the same envelope:

```yaml
apiVersion: v1            # API group/version (apps/v1, batch/v1, networking.k8s.io/v1 …)
kind: Pod                 # object type
metadata:
  name: web-pod           # unique within namespace + kind
  namespace: default
  labels:
    app: web              # key/value tags used by selectors
  annotations:
    team: platform        # non-identifying metadata
spec:                     # DESIRED state — you write this
  containers:
    - name: nginx
      image: nginx:1.27
      ports:
        - containerPort: 80
status:                   # OBSERVED state — written by Kubernetes, never edit
  phase: Running
```

| Field | Meaning |
|---|---|
| `apiVersion` + `kind` | Select the API type |
| `metadata` | Identity: name, namespace, labels, annotations, ownerReferences |
| `spec` | Desired state |
| `status` | Observed state (read-only) |

YAML rules: indentation with **spaces** only, lists start with `-`, `---` separates multiple documents in one file.

## Imperative vs. declarative

| | Imperative | Declarative |
|---|---|---|
| Example | `kubectl create deployment web --image=nginx` | `kubectl apply -f deployment.yaml` |
| Source of truth | Whatever you last typed | The YAML file (in Git) |
| Auditability | Low | High (file history) |
| Repeatable | Error-prone | Idempotent |
| Best for | Quick tests, exam scaffolding | Production, GitOps, CI/CD |

### Generate YAML fast (exam essential)

```bash
export do="--dry-run=client -o yaml"

kubectl run web --image=nginx:1.27 --port=80 $do > pod.yaml
kubectl create deployment web --image=nginx:1.27 --replicas=3 $do > deploy.yaml
kubectl expose deployment web --port=80 --target-port=8080 $do > svc.yaml
kubectl create configmap app --from-literal=LOG_LEVEL=info $do
kubectl create secret generic db --from-literal=PASSWORD=s3cr3t $do
kubectl create job once --image=busybox $do -- echo hi
kubectl create cronjob nightly --image=busybox --schedule="0 2 * * *" $do -- date
kubectl create role pod-reader --verb=get,list --resource=pods $do
kubectl create ingress web --rule="shop.example.com/*=web:80" $do
```

## Dry runs, diffs and server-side apply

```bash
kubectl apply -f deploy.yaml --dry-run=client -o yaml   # render locally only
kubectl apply -f deploy.yaml --dry-run=server           # full validation + admission, not persisted
kubectl diff -f deploy.yaml                              # what would change on the live cluster
kubectl apply --server-side -f deploy.yaml               # server-side apply with field ownership
```

Server-side dry-run is more thorough: it runs admission webhooks/policies.

## Output formatting

```bash
kubectl get pods -o name
kubectl get pods --show-labels
kubectl get pods -l app=web
kubectl get pods --field-selector status.phase=Running
kubectl get pods --sort-by=.metadata.creationTimestamp
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'
kubectl get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,IMAGE:.spec.containers[0].image
kubectl get pods -w                       # watch
```

## Editing live objects

```bash
kubectl edit deployment web               # opens $EDITOR
kubectl patch deployment web -p '{"spec":{"replicas":5}}'
kubectl set image deployment/web nginx=nginx:1.28
kubectl label pod web tier=frontend --overwrite
kubectl annotate pod web owner=abdallah
kubectl replace --force -f pod.yaml       # delete + recreate (for immutable fields)
```

## Interview questions

??? question "Why prefer `kubectl apply` over `kubectl create` in production?"
    `apply` is declarative and idempotent; re-applying is safe and the file in Git becomes the auditable record of intent.

??? question "Client-side vs server-side dry-run?"
    Client-side only renders locally; server-side sends the object to the API server for full validation and admission without persisting it.

## Quick recap

- [x] kubectl → HTTPS → API server, configured by kubeconfig.
- [x] Manifest = `apiVersion`, `kind`, `metadata`, `spec` (+ read-only `status`).
- [x] Scaffold with `--dry-run=client -o yaml`; check with `diff` and `--dry-run=server`.
- [x] `explain`, `describe`, `logs`, `get events` = your best friends.
