# Observability & Troubleshooting

<span class="exam-tag">CKA</span>

!!! info
    Troubleshooting is the **largest CKA domain (30%)**.

## Observability building blocks

| Pillar | Kubernetes tooling |
|---|---|
| **Metrics** | metrics-server (`kubectl top`, HPA); **Prometheus** + kube-state-metrics + node-exporter |
| **Logs** | Container stdout/stderr → node files (`/var/log/pods`) → DaemonSet shipper (Fluent Bit, Vector, Promtail/Alloy) → Loki / Elasticsearch / CloudWatch |
| **Events** | `kubectl get events` — short-lived (default ~1h) record of what just happened |
| **Traces** | OpenTelemetry → Jaeger / Tempo |
| **Dashboards** | Grafana |
| **Alerting** | Alertmanager → Slack / PagerDuty / email |

The **kube-prometheus-stack** Helm chart installs Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter and kube-state-metrics together.

## Everyday commands

```bash
kubectl top nodes                                  # needs metrics-server
kubectl top pods -A --sort-by=memory
kubectl get events -A --sort-by=.lastTimestamp
kubectl get events --field-selector type=Warning
kubectl logs <pod> --since=10m
kubectl logs <pod> -c <container> --previous
kubectl logs -l app=web --all-containers --prefix
kubectl exec -it <pod> -- sh
kubectl port-forward svc/backend 8080:80
kubectl debug -it <pod> --image=busybox:1.36 --target=app   # ephemeral debug container
kubectl debug node/<node> -it --image=ubuntu                # shell on a node (host FS at /host)
```

!!! tip "`kubectl debug`"
    Distroless images have no shell. **Ephemeral containers** (`kubectl debug --target`) attach a toolbox container sharing the target's process namespace — no restart needed.

## Methodology

**Symptom → Scope → Inspect → Isolate → Fix → Verify**

1. **Scope** broadly: `kubectl get nodes`, `kubectl get pods -A | grep -v Running`, `kubectl get events -A`.
2. **Inspect** the object: `describe`, `logs`, `logs --previous`, `get -o yaml`.
3. **Isolate**: form a hypothesis, test it (exec, curl, nslookup, `auth can-i`).
4. **Fix** and **verify** the original symptom is gone.

## Troubleshooting reference

### Application / workload

| Symptom | Investigate | Likely cause | Fix |
|---|---|---|---|
| `Pending` | `describe pod` → Events | Insufficient CPU/memory, taints, affinity, unbound PVC, quota | Add capacity, fix scheduling rules/PVC |
| `CrashLoopBackOff` | `logs --previous`, `describe` | App error, bad command/args, missing config, failing liveness | Fix app/config/probe |
| `ImagePullBackOff` | `describe pod` | Wrong image/tag, private registry auth | Fix image, `imagePullSecrets` |
| `OOMKilled` (exit 137) | `describe` → Last State | Memory limit too low | Raise limit / fix leak |
| `CreateContainerConfigError` | `describe` | Missing ConfigMap/Secret/key | Create or fix reference |
| Running but not Ready | `describe` → readiness | Failing readiness probe | Fix endpoint/probe |
| Rollout stuck | `rollout status`, `describe rs` | New Pods not Ready | Fix or `rollout undo` |

Exit codes: `0` success · `1` app error · `137` SIGKILL (OOM or killed) · `139` segfault · `143` SIGTERM.

### Networking

| Symptom | Investigate | Fix |
|---|---|---|
| Service no endpoints | `kubectl get endpointslices -l kubernetes.io/service-name=<svc>` | Align selector/labels, make Pods Ready |
| DNS failure | `nslookup` from a Pod, CoreDNS Pods/logs | Fix CoreDNS, NetworkPolicy blocking port 53 |
| Traffic blocked | `kubectl get netpol -A` | Add allow rule |
| Ingress/Gateway 404/502 | Controller logs, `describe ingress/httproute` | Class, rules, backend readiness |

### Cluster / node

| Symptom | Investigate | Likely cause | Fix |
|---|---|---|---|
| Node `NotReady` | `describe node`, `ssh node; systemctl status kubelet; journalctl -u kubelet` | kubelet stopped/misconfigured, runtime down, disk/memory pressure, no CNI, expired certs | Restart/fix kubelet & containerd, free disk, install CNI |
| `kubectl` can't connect | `kubectl cluster-info`, kubeconfig | Wrong context/server, API server down | Fix kubeconfig; check API static Pod |
| Control-plane component down | `kubectl -n kube-system get pods`, `crictl ps -a`, `crictl logs <id>` | Typo in `/etc/kubernetes/manifests/*.yaml`, wrong cert path | Fix manifest; kubelet recreates the static Pod |
| PVC `Pending` | `describe pvc` | No StorageClass/PV, CSI down | Fix class, CSI |

```bash
# On a node
systemctl status kubelet containerd
journalctl -u kubelet -f
crictl ps -a
crictl logs <container-id>
cat /var/lib/kubelet/config.yaml
ls /etc/kubernetes/manifests/
```

## Anti-patterns

- :x: `kubectl delete pod` before reading `describe`/`logs` — evidence lost.
- :x: Ignoring `kubectl get events` — the root cause is often written there.
- :x: Reading the new container's empty log instead of `--previous`.
- :x: Debugging directly in production when you could reproduce in staging.

## Quick recap

- [x] Metrics (metrics-server, Prometheus), logs (DaemonSet shippers), events, traces.
- [x] Scope → inspect → isolate → fix → verify.
- [x] `describe`, `logs --previous`, `get events`, `kubectl debug`, `crictl`, `journalctl -u kubelet`.
