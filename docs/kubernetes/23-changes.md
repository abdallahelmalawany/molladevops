# What Changed vs. the Course

The source was the **Kubernetes Mastery** deck (208 slides, 23 sections). It was already modernised, so most content carried over directly. This page lists what was corrected, removed and added.

## Corrected or updated

| In the deck | Now |
|---|---|
| Sidecars "since 1.28" as restartable init containers | Native sidecars are **GA since 1.33**; example rewritten to use `initContainers` + `restartPolicy: Always` |
| Multi-container demo used `fluent-bit:2.2` as a normal container | Uses `fluent/fluent-bit:3.2` as a native sidecar |
| `kubectl get endpoints` as the Service check | **EndpointSlices** (Endpoints API deprecated in 1.33); both shown |
| Illustrative GPU cost/utilisation figures (~35%, $2.5M, 72 hrs, ~$15k per A100) | Removed — not verifiable figures for revision notes |
| Fixed image tags for vLLM / NGC images | Placeholders `<tested-version>` / `<tag>` — pin what you've tested |
| `etcdctl` used for snapshot | `etcdctl snapshot save` + **`etcdutl`** for status/restore (etcdctl versions deprecated) |
| `kubectl rollout history` without change-cause | Added `kubernetes.io/change-cause` annotation (`--record` deprecated) |
| EKS access via aws-auth or access entries | Access entries as the default, aws-auth marked legacy |
| IRSA for Pod AWS permissions | **EKS Pod Identity** recommended, IRSA still covered |
| `postgres:16` in StatefulSet demo | `postgres:17`, with `PGDATA` set correctly for mounted volumes |

## Removed (kept only as Deprecated notes)

- PodSecurityPolicy, dockershim, kube-dns, in-tree EBS provisioner, ReplicationController, Ingress-NGINX (retired Mar 2026), `kubernetes.io/ingress.class`, `apt.kubernetes.io`, Secret-based SA tokens, `batch/v1beta1`, `autoscaling/v2beta*`, `Recycle` reclaim policy, Helm 2/Tiller, Kustomize `commonLabels`/`patchesStrategicMerge`.

## Added (missing from the deck)

**Core & CKA**

- kind cluster config, full kubeadm prerequisites (modules, sysctl, `SystemdCgroup`), `pkgs.k8s.io` setup, HA control plane overview, kubeadm file layout
- Static Pods and mirror Pods; important ports; etcd quorum math
- kubectl output formatting (JSONPath, custom-columns), `explain --recursive`, server-side apply, YAML scaffolding list
- Container states & exit codes, recommended labels, annotations
- kube-proxy modes (iptables / IPVS / **nftables**), CIDR ranges, DNS record formats, DNS debugging
- Service fields (`externalTrafficPolicy`, `trafficDistribution`), Gateway API resources table and header matching, ReferenceGrant
- **Topology spread constraints**, PriorityClass & preemption, **in-place Pod resize (GA 1.35)**, KEDA, Karpenter, HPA `behavior`
- Job patterns (indexed, `ttlSecondsAfterFinished`, `podFailurePolicy`), CronJob `timeZone`, manual trigger from CronJob
- Secret types, Downward API, live-update behaviour of volumes vs env vars, verify encryption in etcd
- Static PV example, reclaim policies, volume expansion, VolumeSnapshots, default StorageClass
- StatefulSet ordering policies, `partition` updates, PVC retention
- Helm OCI registries, chart structure, `helm template/lint`; Kustomize generators & images; minimal CRD example
- CSR API YAML, `kubectl create token`, RBAC escalation risks
- seccomp & `appArmorProfile` fields, **ValidatingAdmissionPolicy**, PSA modes, NetworkPolicy DNS egress and AND/OR rules, audit policy, RuntimeClass sandboxes, kube-bench, cosign, SBOM
- `kubectl debug` (ephemeral containers & node debugging), node-level troubleshooting with `crictl`/`journalctl`
- kubeadm certificate renewal, version-skew rules
- Deprecated-API detection tools (pluto, kubent)
- Argo CD CLI, ApplicationSets, sync waves

**EKS & AI**

- EKS Auto Mode, Karpenter, **Pod Identity**, add-ons table, extended support
- DRA example (`resource.k8s.io/v1`), Kueue Job example, MPS, EKS GPU AMIs

**Practice**

- Solution sketches for labs, a GPU lab section, a kubectl cheat sheet, and a CKA/CKS exam guide with domain → page mapping.
