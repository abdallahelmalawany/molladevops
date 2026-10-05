# Hands-on Labs & Capstones

Use a local **kind**/**Minikube** cluster for labs 1, 2, 4–7; a **kubeadm** cluster for lab 8; **EKS** for lab 3 and the capstones. Try first, then open the solution sketch.

## Lab 1 — Deploy, expose, scale, roll back

1. Create namespace `lab1`.
2. Deployment `web` running `nginx:1.27` with 3 replicas.
3. Expose it with a ClusterIP Service on port 80.
4. Inspect Pods and logs.
5. Scale to 5.
6. Update the image to `nginx:1.28` and watch the rollout.
7. Roll back and confirm the image.

??? success "Solution sketch"

    ```bash
    kubectl create ns lab1
    kubectl -n lab1 create deployment web --image=nginx:1.27 --replicas=3
    kubectl -n lab1 expose deployment web --port=80
    kubectl -n lab1 get pods -o wide && kubectl -n lab1 logs deploy/web
    kubectl -n lab1 scale deployment web --replicas=5
    kubectl -n lab1 set image deployment/web nginx=nginx:1.28
    kubectl -n lab1 rollout status deployment/web
    kubectl -n lab1 rollout undo deployment/web
    kubectl -n lab1 get deploy web -o jsonpath='{.spec.template.spec.containers[0].image}'
    ```

## Lab 2 — Ingress, Gateway API & NetworkPolicy

1. Deploy `blue` and `green` apps (Deployment + Service each).
2. Install Traefik; create an Ingress routing `/blue` and `/green`.
3. Install Envoy Gateway; route the same paths with a Gateway + HTTPRoute (try a 90/10 weight split).
4. Test both from outside the cluster.
5. Add a default-deny NetworkPolicy in the namespace, then allow only the gateway/ingress namespace to reach the apps (needs Calico/Cilium).

??? success "Solution sketch"

    ```bash
    for c in blue green; do
      kubectl create deployment $c --image=hashicorp/http-echo -- /http-echo -text=$c -listen=:8080
      kubectl expose deployment $c --port=80 --target-port=8080
    done
    kubectl create ingress colors --class=traefik \
      --rule="/blue*=blue:80" --rule="/green*=green:80"
    ```

    ```yaml
    apiVersion: gateway.networking.k8s.io/v1
    kind: HTTPRoute
    metadata: { name: colors }
    spec:
      parentRefs: [{ name: eg, namespace: envoy-gateway-system }]
      rules:
        - backendRefs:
            - { name: blue, port: 80, weight: 90 }
            - { name: green, port: 80, weight: 10 }
    ```

## Lab 3 — Persistent storage on EBS

1. Install the `aws-ebs-csi-driver` add-on (with Pod Identity/IRSA permissions).
2. Create a gp3 StorageClass (`ebs.csi.aws.com`, `WaitForFirstConsumer`).
3. Create a PVC and a Pod that writes `/data/test.txt`.
4. Delete the Pod, recreate it, read the file back.

??? success "Solution sketch"
    Use the StorageClass, PVC and Pod from [Storage → Dynamic provisioning](11-storage.md#dynamic-provisioning-aws-ebs-csi), then:

    ```bash
    kubectl exec writer -- cat /data/test.txt
    kubectl delete pod writer && kubectl apply -f pod.yaml
    kubectl exec writer -- cat /data/test.txt     # still "hello"
    ```

## Lab 4 — Scheduling control

1. Label two nodes `disktype=ssd`; schedule a Pod with `nodeSelector`.
2. Taint a third node `dedicated=true:NoSchedule`; schedule a Pod with a matching toleration **and** node affinity onto it.
3. Deployment with 3 replicas and pod anti-affinity (or topology spread) so no two share a node.

??? success "Solution sketch"

    ```bash
    kubectl label nodes kind-worker kind-worker2 disktype=ssd
    kubectl taint nodes kind-worker3 dedicated=true:NoSchedule
    kubectl label nodes kind-worker3 dedicated=true
    ```

    ```yaml
    spec:
      tolerations:
        - { key: dedicated, operator: Equal, value: "true", effect: NoSchedule }
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - { key: dedicated, operator: In, values: ["true"] }
    ```

## Lab 5 — RBAC least privilege

1. Create a client certificate for user `bob` (CSR API).
2. Role allowing only `get,list` on Pods in `team-a`; bind it to bob.
3. Verify with `kubectl auth can-i` and confirm bob can't read Secrets.

??? success "Solution sketch"

    ```bash
    kubectl create role pod-reader --verb=get,list --resource=pods -n team-a
    kubectl create rolebinding bob-pods --role=pod-reader --user=bob -n team-a
    kubectl auth can-i list pods --as=bob -n team-a       # yes
    kubectl auth can-i get secrets --as=bob -n team-a     # no
    ```

## Lab 6 — Security hardening

1. Start from a Deployment running as root without a securityContext.
2. Add `runAsNonRoot`, drop ALL capabilities, `readOnlyRootFilesystem`, seccomp `RuntimeDefault`.
3. Label the namespace `pod-security.kubernetes.io/enforce=restricted`.
4. Default-deny NetworkPolicy + allow DNS + required traffic.
5. Confirm the app still works (`nginxinc/nginx-unprivileged` helps).

## Lab 7 — Troubleshooting drill

Fix and document (symptom → root cause → fix):

1. Pod in `ImagePullBackOff` (wrong tag).
2. Service with zero endpoints (selector mismatch).
3. Deployment stuck mid-rollout (failing readiness probe).
4. Bonus: a worker `NotReady` because kubelet is stopped (`systemctl stop kubelet`).

## Lab 8 — Cluster maintenance (kubeadm)

1. Take an etcd snapshot and check its status.
2. Delete a Deployment, restore the snapshot, confirm it's back.
3. Drain a worker with a PDB in place, observe evictions, uncordon.
4. Upgrade the cluster by one minor version (control plane, then workers).
5. Check certificate expiration.

See [Maintenance](17-maintenance.md) for commands.

## Lab 9 — GPU workloads

1. Install the GPU Operator (or device plugin on EKS GPU AMIs).
2. Run `nvidia-smi` in a Pod requesting `nvidia.com/gpu: 1`.
3. Enable time-slicing with 4 replicas; schedule 4 Pods on one GPU.
4. (A100/H100) Apply `nvidia.com/mig.config=all-2g.10gb` and verify 3 MIG devices.
5. **Challenge**: a PyTorch Job requesting 2 GPUs; then with time-slicing (replicas 4) verify 8 Pods fit on 2 physical GPUs.

---

## Capstone 1 — WordPress + MySQL on EKS

1. Secrets for MySQL root and WordPress DB credentials.
2. MySQL as a **StatefulSet** with an EBS-backed `volumeClaimTemplate` + headless Service.
3. WordPress as a **Deployment** pointing to `mysql-0.mysql` (or the Service), with an EFS/EBS PVC for `wp-content` if needed.
4. Expose WordPress via Gateway API / Ingress (AWS Load Balancer Controller) or a LoadBalancer Service.
5. Add requests/limits, probes, a PDB and an HPA.
6. Verify the site survives WordPress and MySQL Pod restarts.

## Capstone 2 — MongoDB + Mongo Express

1. Secret with MongoDB root credentials.
2. MongoDB StatefulSet + PVC + headless Service.
3. Mongo Express Deployment connecting via the MongoDB Service (credentials from the Secret).
4. Expose Mongo Express for browser access (restrict with a NetworkPolicy / auth).
5. Create a database and collection in the UI; confirm it survives a Pod restart.

!!! tip "Make it GitOps"
    Put either capstone in Git as a Kustomize base + overlays and deploy it with an Argo CD `Application` — that's the real-world shape.
