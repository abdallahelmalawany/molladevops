# Security & RBAC

<span class="exam-tag">CKA</span><span class="exam-tag">CKS</span>

Security is built into every API request: **Authentication → Authorization → Admission**.

## Authentication vs. authorization

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | Who are you? | What may you do? |
| Mechanisms | Client certs, bearer tokens, OIDC, webhook (e.g. AWS IAM on EKS) | **RBAC** (default), Node, Webhook, ABAC (legacy) |
| Failure | `401 Unauthorized` | `403 Forbidden` |

- Kubernetes has **no User object**. Humans are managed outside (IdP, certificates). The API server trusts the identity in a certificate's **CN** (user) / **O** (groups) or a token's claims.
- **ServiceAccounts** *are* API objects — identities for workloads.
- On EKS, IAM principals map to Kubernetes identities via **EKS access entries** (modern) or the legacy `aws-auth` ConfigMap.

## Client-certificate users

```bash
openssl genrsa -out alice.key 2048
openssl req -new -key alice.key -out alice.csr -subj "/CN=alice/O=developers"

cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata: { name: alice }
spec:
  request: $(base64 -w0 < alice.csr)
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages: [client auth]
EOF

kubectl certificate approve alice
kubectl get csr alice -o jsonpath='{.status.certificate}' | base64 -d > alice.crt

kubectl config set-credentials alice --client-certificate=alice.crt --client-key=alice.key --embed-certs
kubectl config set-context alice@lab --cluster=kubernetes --user=alice --namespace=team-a
```

## kubeconfig

Three sections + a pointer:

| Section | Holds |
|---|---|
| `clusters` | API endpoint + CA certificate |
| `users` | Credentials (cert/key, token, exec plugin) |
| `contexts` | cluster + user + namespace |
| `current-context` | The active context |

```bash
kubectl config get-contexts
kubectl config use-context staging
kubectl config set-context --current --namespace=team-a
kubectl config view --minify
```

## RBAC

| | |
|---|---|
| **What** | Default authorization model: bind **subjects** (User, Group, ServiceAccount) to **roles** listing allowed **verbs** on **resources**. |
| **Why** | Without it any authenticated identity could do everything. Least privilege needs explicit, auditable grants. |
| **How** | Role/ClusterRole = rules; RoleBinding/ClusterRoleBinding = who gets them. RBAC is **additive only** (no deny rules). |

Verbs: `get list watch create update patch delete deletecollection` (+ `use`, `bind`, `escalate`, `impersonate`). Core API group = `""`.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { namespace: team-a, name: pod-reader }
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: read-pods, namespace: team-a }
subjects:
  - { kind: User, name: alice, apiGroup: rbac.authorization.k8s.io }
  - { kind: ServiceAccount, name: ci-bot, namespace: team-a }
roleRef:
  { kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata: { name: node-viewer }
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata: { name: view-nodes-global }
subjects:
  - { kind: Group, name: sre-team, apiGroup: rbac.authorization.k8s.io }
roleRef:
  { kind: ClusterRole, name: node-viewer, apiGroup: rbac.authorization.k8s.io }
```

```bash
kubectl create role pod-reader --verb=get,list,watch --resource=pods -n team-a
kubectl create rolebinding alice-read --role=pod-reader --user=alice -n team-a
kubectl create clusterrole node-viewer --verb=get,list,watch --resource=nodes
kubectl create rolebinding alice-view --clusterrole=view --user=alice -n team-a
kubectl auth can-i list pods --as=alice -n team-a
kubectl auth can-i '*' '*' --as=system:serviceaccount:team-a:ci-bot
kubectl auth can-i --list --as=alice -n team-a
```

| | Namespaced | Cluster-wide |
|---|---|---|
| Define permissions | **Role** | **ClusterRole** |
| Grant permissions | **RoleBinding** (in one namespace) | **ClusterRoleBinding** (all namespaces) |
| Cluster-scoped resources (nodes, PVs, namespaces) | — | ClusterRole + ClusterRoleBinding |

**ClusterRole + RoleBinding** = define once, grant per namespace (the built-in `view`, `edit`, `admin` roles are used this way). `cluster-admin` = everything.

`kubectl auth can-i` is the #1 command for debugging permission problems.

## ServiceAccounts

| | |
|---|---|
| **What** | Identity for processes in Pods. Every namespace has a `default` SA; every Pod runs as one. |
| **Why** | Controllers, operators, CI runners call the API and need least-privilege identities separate from humans. |
| **How** | Since 1.24, Pods get **short-lived, audience-bound projected tokens**, auto-rotated by the kubelet — no long-lived Secret tokens. |

```yaml
apiVersion: v1
kind: ServiceAccount
metadata: { name: app-reader, namespace: team-a }
automountServiceAccountToken: false     # opt in only where needed
---
apiVersion: v1
kind: Pod
metadata: { name: app, namespace: team-a }
spec:
  serviceAccountName: app-reader
  automountServiceAccountToken: true    # this Pod needs API access
  containers:
    - { name: app, image: myapp:1.0 }
```

```bash
kubectl create token app-reader -n team-a --duration=1h   # mint a short-lived token
```

!!! warning "Legacy: Secret-based ServiceAccount tokens"
    Before 1.24 every SA got a non-expiring token Secret. These are a classic CKS finding — remove unused ones. Create a `kubernetes.io/service-account-token` Secret manually only when a long-lived token is truly required.

### RBAC anti-patterns

- :x: `cluster-admin` for something that needs read access in one namespace.
- :x: Wildcards (`"*"`) in verbs/resources.
- :x: Auto-mounted tokens on Pods that never call the API.
- :x: One shared ServiceAccount for every workload.
- :x: Granting `list` on Secrets (returns their values) or `create pods` (can mount any Secret / SA in the namespace).
- :x: Never auditing bindings.

## SecurityContext

| | |
|---|---|
| **What** | Pod/container settings for user IDs, privilege, capabilities, filesystem, seccomp, AppArmor. |
| **Why** | Root + all capabilities + writable filesystem = easy path from container to host. |
| **How** | Pod-level applies to all containers; container-level overrides it. |

```yaml
spec:
  securityContext:                  # Pod level
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:1.0
      securityContext:              # container level
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        privileged: false
        capabilities:
          drop: ["ALL"]
          # add: ["NET_BIND_SERVICE"]
        appArmorProfile:
          type: RuntimeDefault      # field GA in 1.30 (replaces the old annotation)
      volumeMounts:
        - { name: tmp, mountPath: /tmp }   # writable scratch when root FS is read-only
  volumes:
    - name: tmp
      emptyDir: {}
```

CKS baseline: **non-root, no privilege escalation, read-only root FS, drop ALL capabilities, seccomp RuntimeDefault.**

## Pod Security Standards & Admission

| | |
|---|---|
| **What** | Three levels — **Privileged**, **Baseline**, **Restricted** — enforced per namespace by the built-in **Pod Security Admission** controller. |
| **Why** | PodSecurityPolicy was confusing; it was deprecated in 1.21 and **removed in 1.25**. |
| **How** | Label the namespace; violating Pods are rejected (enforce) or reported (audit/warn). |

```bash
kubectl label namespace team-a \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

| Mode | Effect |
|---|---|
| `enforce` | Reject violating Pods |
| `audit` | Record in audit log |
| `warn` | Show a warning to the user |

!!! warning "Removed: PodSecurityPolicy (PSP)"
    Gone since **1.25**. Replace with Pod Security Admission + a policy engine (Kyverno, OPA Gatekeeper) or **ValidatingAdmissionPolicy** for custom rules.

### Admission policies

- **ValidatingAdmissionPolicy** (GA 1.30): in-tree CEL rules, no webhook to run.
- **Kyverno** / **OPA Gatekeeper**: policy engines via admission webhooks (validate, mutate, generate).

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata: { name: max-replicas }
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: "object.spec.replicas <= 10"
      message: "replicas must be <= 10"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata: { name: max-replicas-binding }
spec:
  policyName: max-replicas
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels: { env: prod }
```

## NetworkPolicies

| | |
|---|---|
| **What** | Firewall rules for Pod traffic. By default all Pods can talk to all Pods. |
| **Why** | A compromised Pod could otherwise reach everything. |
| **How** | Select Pods by label, allow ingress/egress from peers (`podSelector`, `namespaceSelector`, `ipBlock`) on ports. **Needs a CNI that enforces it** (Calico, Cilium; not Flannel). Policies are additive allow-lists. |

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-all, namespace: team-a }
spec:
  podSelector: {}                 # all Pods in the namespace
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-dns, namespace: team-a }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-web-to-api, namespace: team-a }
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: web }
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: monitoring }
      ports:
        - { protocol: TCP, port: 8080 }
```

!!! tip "AND vs OR"
    Items in the same `from` list entry (`- namespaceSelector: … podSelector: …` without a second dash) are **AND**. Separate list entries (each starting with `-`) are **OR**. Remember to allow **DNS egress** when you default-deny egress.

## Supply chain & runtime security <span class="exam-tag">CKS</span>

| Area | Tools / practices |
|---|---|
| Image scanning | **Trivy**, Grype in CI and in-cluster; fail on HIGH/CRITICAL |
| Minimal images | Distroless/minimal bases, pin digests, no `:latest` |
| Signing | **Sigstore cosign** + admission verification (Kyverno, policy-controller) |
| SBOM | Syft / Trivy SBOM |
| Admission policies | Kyverno, Gatekeeper, ValidatingAdmissionPolicy: approved registries, limits, no privileged |
| Audit logging | API server `--audit-policy-file` + `--audit-log-path` |
| Runtime detection | **Falco** (syscalls: shells in containers, sensitive file reads) |
| Node hardening | seccomp, AppArmor, minimal OS, **kube-bench** (CIS benchmark) |
| Sandboxing | RuntimeClass with gVisor / Kata Containers |

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:1.4
kube-bench run --targets master,node
```

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: disallow-latest-tag }
spec:
  rules:
    - name: require-pinned-tag
      match:
        any:
          - resources: { kinds: [Pod] }
      validate:
        failureAction: Enforce
        message: "Images must use a pinned tag, not :latest"
        pattern:
          spec:
            containers:
              - image: "!*:latest"
```

Audit policy example:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  - level: RequestResponse
    verbs: ["delete"]
  - level: None
    users: ["system:kube-proxy"]
```

Levels: `None`, `Metadata`, `Request`, `RequestResponse`.

## Troubleshooting

| Symptom | Investigate | Likely cause | Fix |
|---|---|---|---|
| `Forbidden` | `kubectl auth can-i <verb> <res> --as=<user>` | Missing Role/binding, wrong namespace | Grant minimal Role |
| Pod can't reach peer | `kubectl get netpol -n <ns>` | Default deny without allow (or missing DNS egress) | Add allow rule |
| SA token errors | `kubectl describe sa`, Pod spec | `automountServiceAccountToken: false` | Enable mount for that Pod |
| Pod rejected | `kubectl get events`, apply output | Violates Pod Security level / policy | Fix securityContext or policy |

## Interview questions

??? question "Role vs ClusterRole?"
    A Role grants permissions in one namespace; a ClusterRole can grant cluster-wide or be reused per namespace via RoleBindings, and is required for cluster-scoped resources.

??? question "How do you lock down Pod-to-Pod traffic?"
    Default-deny NetworkPolicy for all Pods (ingress + egress), then explicit allow rules, including DNS egress — with a CNI that enforces policies.

??? question "What replaced PodSecurityPolicy?"
    Pod Security Standards enforced by Pod Security Admission, plus Kyverno/Gatekeeper/ValidatingAdmissionPolicy for custom rules.

??? question "Are Secrets encrypted?"
    No — base64 only, unless encryption at rest is configured. Restrict RBAC access to them.

## Quick recap

- [x] AuthN (401) → AuthZ/RBAC (403) → Admission.
- [x] No User objects; certs CN=user, O=group. ServiceAccounts for Pods with short-lived projected tokens.
- [x] Role/RoleBinding (namespace) vs ClusterRole/ClusterRoleBinding (cluster); `auth can-i`.
- [x] SecurityContext baseline: non-root, no escalation, RO root FS, drop ALL, seccomp RuntimeDefault.
- [x] PSA labels (enforce/audit/warn) replace PSP.
- [x] Default-deny NetworkPolicy + allow DNS + explicit allows.
- [x] Supply chain: Trivy, cosign, Kyverno; runtime: Falco; nodes: kube-bench.
