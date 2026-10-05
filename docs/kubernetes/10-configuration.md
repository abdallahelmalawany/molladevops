# ConfigMaps & Secrets

<span class="exam-tag">CKA</span><span class="exam-tag">CKS</span>

Decouple configuration and credentials from container images: same image, different config per environment.

## ConfigMap vs. Secret

| | ConfigMap | Secret |
|---|---|---|
| Purpose | Non-sensitive config (URLs, flags) | Sensitive data (passwords, tokens, TLS certs) |
| Storage in etcd | Plain text | **Base64-encoded — NOT encrypted by default** |
| Protection | — | Enable encryption at rest + RBAC restrictions |
| Size limit | 1 MiB | 1 MiB |
| Consumption | Env vars, mounted files, command args | Same |

Secret types: `Opaque` (default), `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson` (image pull), `kubernetes.io/basic-auth`, `kubernetes.io/ssh-auth`, `kubernetes.io/service-account-token` (legacy).

## Creating them

```bash
kubectl create configmap app-config --from-literal=LOG_LEVEL=info --from-file=app.properties
kubectl create secret generic db-creds --from-literal=DB_PASSWORD='S3cur3P@ss'
kubectl create secret tls shop-tls --cert=tls.crt --key=tls.key
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com --docker-username=me --docker-password='...'
echo -n 'S3cur3P@ss' | base64          # encode manually (-n avoids a trailing newline)
kubectl get secret db-creds -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: app-config }
data:
  LOG_LEVEL: "info"
  FEATURE_X: "enabled"
---
apiVersion: v1
kind: Secret
metadata: { name: db-creds }
type: Opaque
stringData:                 # plain text; Kubernetes stores it base64-encoded in .data
  DB_PASSWORD: "S3cur3P@ss"
```

## Consuming them

```yaml
apiVersion: v1
kind: Pod
metadata: { name: app }
spec:
  containers:
    - name: app
      image: myapp:1.0
      envFrom:                              # all keys as env vars
        - configMapRef: { name: app-config }
      env:
        - name: DB_PASSWORD                 # one key
          valueFrom:
            secretKeyRef: { name: db-creds, key: DB_PASSWORD }
        - name: POD_IP                      # Downward API
          valueFrom:
            fieldRef: { fieldPath: status.podIP }
      volumeMounts:
        - { name: config, mountPath: /etc/app, readOnly: true }
        - { name: creds, mountPath: /etc/creds, readOnly: true }
  imagePullSecrets:
    - name: regcred
  volumes:
    - name: config
      configMap: { name: app-config }
    - name: creds
      secret:
        secretName: db-creds
        defaultMode: 0400
```

| Method | Updates live? |
|---|---|
| Mounted volume | **Yes** (after kubelet sync, ~1 min) — except `subPath` mounts |
| Env vars | **No** — restart the Pod (`kubectl rollout restart`) |

## Best practices

- **Never commit real Secrets to Git.** Use **Sealed Secrets**, **External Secrets Operator** (AWS Secrets Manager / SSM / Vault), **SOPS**, or the Secrets Store CSI driver.
- **Enable encryption at rest** — base64 is encoding, not encryption.
- Prefer **mounted files** over env vars for secrets (env vars leak into logs, crash dumps, child processes).
- Restrict `get/list/watch` on Secrets with RBAC — `list` exposes all values.
- Use `immutable: true` for config that shouldn't change (prevents drift, reduces API server load).
- Reload on change: mounted files refresh; for env vars use `rollout restart` or a tool like **Reloader**.

## Encrypting Secrets at rest (kubeadm) <span class="exam-tag">CKS</span>

```yaml
# /etc/kubernetes/enc/encryption-config.yaml  (each control-plane node)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:                 # first provider = used for new writes
          keys:
            - name: key1
              secret: <base64 32-byte key>   # head -c 32 /dev/urandom | base64
      - identity: {}            # fallback so existing plaintext stays readable
```

1. Add `--encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml` to `/etc/kubernetes/manifests/kube-apiserver.yaml` and mount the directory (`hostPath` volume + `volumeMount`).
2. Wait for the API server static Pod to restart.
3. Re-write existing Secrets so they're stored encrypted:

```bash
kubectl get secrets -A -o json | kubectl replace -f -
# verify directly in etcd — value should start with k8s:enc:aescbc:v1:
ETCDCTL_API=3 etcdctl --cacert=... --cert=... --key=... get /registry/secrets/default/db-creds | hexdump -C | head
```

Providers: `identity` (none), `aescbc`, `aesgcm`, `secretbox`, **`kms` v2** (recommended in production; on EKS use **KMS envelope encryption**).

## Quick recap

- [x] ConfigMap = plain config; Secret = base64, not encrypted by default.
- [x] Consume via `envFrom`, `valueFrom`, or volumes (volumes update live).
- [x] Encryption at rest via `EncryptionConfiguration` + `--encryption-provider-config`, then rewrite Secrets.
- [x] Keep secrets out of Git: Sealed Secrets / External Secrets / SOPS.
