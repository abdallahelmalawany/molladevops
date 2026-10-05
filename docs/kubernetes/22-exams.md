# CKA / CKS Exam Guide

!!! warning "Check before booking"
    Prices, versions and domain weights change. Confirm on the Linux Foundation pages: [CKA](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/) · [CKS](https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/) · [curricula](https://github.com/cncf/curriculum).

## Exam facts

| | CKA | CKS |
|---|---|---|
| Format | 100% hands-on, live terminal, online proctored | Same |
| Duration | 2 hours | 2 hours |
| Tasks | ~15–20 | ~15–20 |
| Passing score | **66%** | **67%** |
| Price | ~US$445 (incl. 1 free retake + 2 killer.sh simulator sessions) | ~US$445 (same inclusions) |
| Validity | 2 years | 2 years |
| Prerequisite | — | **Active CKA** |
| Allowed docs | kubernetes.io/docs, /blog and other listed project docs | + docs of tools in scope (Falco, Trivy, AppArmor, etc.) |
| Version | A recent Kubernetes minor (check the curriculum) | Same |

## CKA domains → pages

| Domain | Weight | Study |
|---|---|---|
| **Troubleshooting** | 30% | [Observability & Troubleshooting](16-observability-troubleshooting.md), [Pods](05-pods-workloads.md#troubleshooting), [Services](07-services-ingress-gateway.md#troubleshooting) |
| **Cluster Architecture, Installation & Configuration** | 25% | [Architecture](02-architecture.md), [Setup](03-cluster-setup.md), [Maintenance](17-maintenance.md), [RBAC](14-security.md#rbac), [Helm/Kustomize/CRDs](13-helm-kustomize-crds.md) |
| **Services & Networking** | 20% | [Networking](06-networking.md), [Services/Ingress/Gateway](07-services-ingress-gateway.md), [NetworkPolicy](14-security.md#networkpolicies) |
| **Workloads & Scheduling** | 15% | [Workloads](05-pods-workloads.md), [Scheduling](08-scheduling-autoscaling.md), [Config](10-configuration.md), [Jobs](09-jobs-cronjobs.md) |
| **Storage** | 10% | [Storage](11-storage.md), [StatefulSets](12-statefulsets.md) |

## CKS domains → pages

| Domain | Weight | Study |
|---|---|---|
| **Cluster Setup** | 15% | NetworkPolicies, CIS/kube-bench, Ingress TLS, protect node metadata, verify binaries — [Security](14-security.md) |
| **Cluster Hardening** | 15% | RBAC, ServiceAccounts, restrict API access, upgrades — [Security](14-security.md), [Maintenance](17-maintenance.md) |
| **System Hardening** | 10% | Minimise host OS footprint, IAM, seccomp, AppArmor |
| **Minimize Microservice Vulnerabilities** | 20% | SecurityContext, Pod Security Admission, Secrets & encryption at rest, RuntimeClass sandboxes (gVisor/Kata), mTLS/Cilium — [Security](14-security.md), [Config](10-configuration.md) |
| **Supply Chain Security** | 20% | Minimal images, SBOM, image scanning (Trivy), signing (cosign), admission policies — [Security](14-security.md#supply-chain-runtime-security-cks) |
| **Monitoring, Logging & Runtime Security** | 20% | Audit logging, Falco, immutable containers, behavioural analysis |

## Exam-day tips

- **Set context first.** Every task names a context — run the given `kubectl config use-context` command. Wrong cluster = zero points.
- **Check the namespace** in every task (`-n`).
- Scaffold with `--dry-run=client -o yaml`, edit, apply. Don't type YAML from scratch.
- Use `kubectl explain <res>.<field>` instead of guessing field names.
- Bookmark key docs pages (kubeadm upgrade, etcd backup, NetworkPolicy, PV/PVC, Ingress, Gateway API, RBAC, Pod Security, audit policy).
- Flag hard tasks and move on — partial credit exists; time is the main enemy.
- Vim basics: `:set paste`, `dd`, `u`, `/search`, `:wq`. Set `set expandtab tabstop=2 shiftwidth=2` in `~/.vimrc`.
- After `ssh` to a node for a task, remember to `exit` back.
- Verify each answer (`get`, `describe`, `auth can-i`, `curl`).

## High-yield tasks to drill

**CKA**

- [ ] etcd snapshot save + restore
- [ ] kubeadm upgrade (control plane + worker)
- [ ] Join a node / fix a NotReady node (kubelet, containerd, certificates)
- [ ] Fix a broken static Pod manifest
- [ ] RBAC: Role/ClusterRole + bindings for a user or ServiceAccount
- [ ] NetworkPolicy ingress/egress with pod + namespace selectors
- [ ] Services, Ingress and Gateway API HTTPRoute
- [ ] PV / PVC / StorageClass, mount into a Pod
- [ ] Scheduling: nodeSelector, affinity, taints/tolerations
- [ ] Sidecar / init container, resources, probes
- [ ] HPA, PDB, PriorityClass
- [ ] Helm install/upgrade; Kustomize overlay; inspect CRDs
- [ ] Troubleshoot Pods, Services, DNS, nodes

**CKS**

- [ ] Pod Security Admission labels; fix Pods to pass `restricted`
- [ ] SecurityContext hardening; seccomp & AppArmor profiles
- [ ] Encryption at rest for Secrets
- [ ] Audit policy + enable audit logging on the API server
- [ ] Falco rule / find the offending Pod from Falco output
- [ ] Trivy scan; remove images with CRITICAL CVEs
- [ ] ImagePolicyWebhook / admission policy for allowed registries
- [ ] RuntimeClass (gVisor) for untrusted workloads
- [ ] kube-bench findings → fix
- [ ] Disable SA token automount; minimise RBAC

## Practice resources

- **killer.sh** simulator (2 sessions included with the exam).
- **Killercoda** free interactive scenarios.
- The labs on this site: [Hands-on Labs](20-labs.md).
