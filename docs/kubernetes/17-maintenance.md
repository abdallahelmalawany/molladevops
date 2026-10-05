# Cluster Maintenance

<span class="exam-tag">CKA</span>

## Node maintenance

| Command | Effect |
|---|---|
| `kubectl cordon <node>` | Mark unschedulable (existing Pods stay) |
| `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data` | Cordon + evict Pods (respects **PDBs**) |
| `kubectl uncordon <node>` | Schedulable again |

- Bare Pods (no controller) block drain unless `--force` (they're lost).
- DaemonSet Pods are ignored with `--ignore-daemonsets`.
- A PDB that can't be satisfied makes drain wait/retry.

## etcd backup & restore

| | |
|---|---|
| **What** | Point-in-time snapshot of the whole etcd keyspace. |
| **Why** | etcd is the only stateful control-plane component; without a snapshot, corruption or a mass delete is unrecoverable. Near-certain CKA task. |
| **How** | `etcdctl snapshot save` over TLS; restore with `etcdutl snapshot restore` into a **new** data dir and point the etcd static Pod at it. |

Find the certificate paths first:

```bash
kubectl -n kube-system describe pod etcd-<node> | grep -E 'cert|key|trusted|listen-client'
# or: cat /etc/kubernetes/manifests/etcd.yaml
```

```bash
# Save
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /backup/etcd-snap.db

# Verify
etcdutl snapshot status /backup/etcd-snap.db -w table

# Restore into a NEW directory
etcdutl snapshot restore /backup/etcd-snap.db --data-dir /var/lib/etcd-restore

# Point etcd at it: edit /etc/kubernetes/manifests/etcd.yaml
#   volumes -> hostPath path: /var/lib/etcd  ->  /var/lib/etcd-restore
# kubelet recreates the static Pod; wait, then:
kubectl get pods -A
```

!!! warning "Deprecated: `etcdctl snapshot restore` / `snapshot status`"
    These moved to **`etcdutl`** (etcd 3.5+); the `etcdctl` versions are deprecated. `ETCDCTL_API=3` is the default in current etcd, but setting it does no harm.

On **EKS** AWS operates etcd — back up workloads and volumes with **Velero** instead.

## Upgrading a kubeadm cluster

Rules:

- **One minor version at a time** (1.34 → 1.35 → 1.36).
- **Control plane first**, then nodes.
- kubelet may be up to **3 minors older** than the API server, never newer.
- Check the deprecation guide for removed APIs before upgrading.

```bash
# --- Control plane node ---
# 1. Switch the pkgs.k8s.io repo to the target minor (edit /etc/apt/sources.list.d/kubernetes.list)
sudo apt-get update
sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm='1.35.*' && sudo apt-mark hold kubeadm
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.35.x          # additional control-plane nodes: sudo kubeadm upgrade node

kubectl drain cp-1 --ignore-daemonsets
sudo apt-mark unhold kubelet kubectl && sudo apt-get install -y kubelet='1.35.*' kubectl='1.35.*' && sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload && sudo systemctl restart kubelet
kubectl uncordon cp-1

# --- Each worker, one at a time ---
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data
# on worker-1:
sudo apt-get install -y kubeadm='1.35.*' && sudo kubeadm upgrade node
sudo apt-get install -y kubelet='1.35.*' && sudo systemctl daemon-reload && sudo systemctl restart kubelet
# back on the control plane:
kubectl uncordon worker-1
kubectl get nodes
```

On EKS the order is the same: **control plane → node groups → add-ons**.

## Certificates (kubeadm)

kubeadm certificates are valid for **1 year** (CA for 10). `kubeadm upgrade apply` renews them automatically.

```bash
sudo kubeadm certs check-expiration
sudo kubeadm certs renew all
# then restart control-plane static Pods (move manifests out and back, or restart kubelet)
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -text | grep -A2 Validity
```

## Interview questions

??? question "How do you back up and restore etcd on kubeadm?"
    `etcdctl snapshot save` with the etcd CA/cert/key; restore with `etcdutl snapshot restore` to a new data dir, then point the etcd static Pod's hostPath to it.

??? question "cordon vs drain?"
    Cordon only marks unschedulable; drain also evicts Pods (respecting PDBs).

??? question "Correct upgrade order?"
    One minor at a time: control plane (kubeadm, then kubelet/kubectl) → workers one by one with drain/upgrade/uncordon.

## Quick recap

- [x] cordon / drain (`--ignore-daemonsets --delete-emptydir-data`) / uncordon.
- [x] etcd: `etcdctl snapshot save` → `etcdutl snapshot restore --data-dir new` → update static Pod hostPath.
- [x] Upgrade one minor at a time, control plane first; `kubeadm upgrade plan/apply/node`.
- [x] `kubeadm certs check-expiration` / `renew all`.
