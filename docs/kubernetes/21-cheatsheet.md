# kubectl Cheat Sheet

## Setup

```bash
alias k=kubectl
source <(kubectl completion bash); complete -o default -F __start_kubectl k
export do="--dry-run=client -o yaml"
export now="--force --grace-period=0"
```

## Contexts & namespaces

```bash
kubectl config get-contexts
kubectl config use-context <ctx>
kubectl config set-context --current --namespace=<ns>
kubectl config view --minify
```

## Get / describe / explain

```bash
kubectl get pods -A -o wide
kubectl get all -n <ns>
kubectl get pod <p> -o yaml
kubectl describe pod <p>
kubectl get events -A --sort-by=.lastTimestamp
kubectl explain pod.spec.containers.securityContext
kubectl api-resources
kubectl get pods -l app=web --show-labels
kubectl get pods --field-selector=status.phase!=Running -A
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName
kubectl get pods --sort-by=.status.startTime
```

## Generate YAML

```bash
kubectl run nginx --image=nginx:1.27 --port=80 $do
kubectl create deployment web --image=nginx:1.27 --replicas=3 $do
kubectl expose deployment web --port=80 --target-port=8080 --type=ClusterIP $do
kubectl create service nodeport web --tcp=80:8080 --node-port=30080 $do
kubectl create configmap cfg --from-literal=k=v --from-file=app.conf $do
kubectl create secret generic s --from-literal=pass=x $do
kubectl create secret tls tls --cert=t.crt --key=t.key
kubectl create job j --image=busybox $do -- echo hi
kubectl create cronjob c --image=busybox --schedule="*/5 * * * *" $do -- date
kubectl create sa app $do
kubectl create role r --verb=get,list --resource=pods $do
kubectl create rolebinding rb --role=r --serviceaccount=ns:app $do
kubectl create clusterrole cr --verb=get --resource=nodes $do
kubectl create ingress web --class=traefik --rule="host/path*=svc:80" $do
kubectl create quota q --hard=pods=10,requests.cpu=4 $do
kubectl create pdb web --selector=app=web --min-available=2 $do
kubectl create priorityclass high --value=1000 $do
```

## Change things

```bash
kubectl apply -f f.yaml        # / -k dir
kubectl diff -f f.yaml
kubectl edit deploy web
kubectl scale deploy web --replicas=5
kubectl set image deploy/web web=nginx:1.28
kubectl set resources deploy web --requests=cpu=100m,memory=128Mi --limits=memory=256Mi
kubectl set env deploy/web LOG_LEVEL=debug
kubectl rollout status|history|undo|restart|pause|resume deploy/web
kubectl autoscale deploy web --min=2 --max=10 --cpu-percent=70
kubectl label|annotate pod p k=v [--overwrite]
kubectl taint nodes n k=v:NoSchedule        # add  ( ...- to remove)
kubectl patch deploy web -p '{"spec":{"replicas":2}}'
kubectl replace --force -f pod.yaml
kubectl delete pod p $now
```

## Debug

```bash
kubectl logs p [-c c] [-f] [--previous] [--since=10m]
kubectl exec -it p -- sh
kubectl debug -it p --image=busybox:1.36 --target=app
kubectl debug node/n -it --image=ubuntu
kubectl port-forward svc/web 8080:80
kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -- sh
kubectl top nodes|pods
kubectl auth can-i <verb> <resource> --as=<user> -n <ns>
kubectl get endpointslices -l kubernetes.io/service-name=<svc>
```

## Nodes & cluster

```bash
kubectl get nodes -o wide
kubectl describe node n
kubectl cordon|uncordon n
kubectl drain n --ignore-daemonsets --delete-emptydir-data
kubectl cluster-info
kubeadm token create --print-join-command
kubeadm certs check-expiration
kubeadm upgrade plan
```

## On a node

```bash
systemctl status kubelet containerd
journalctl -u kubelet -f
crictl ps -a ; crictl logs <id> ; crictl images ; crictl pods
ls /etc/kubernetes/manifests/
cat /var/lib/kubelet/config.yaml
```

## etcd

```bash
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key snapshot save /backup/snap.db
etcdutl snapshot status /backup/snap.db -w table
etcdutl snapshot restore /backup/snap.db --data-dir /var/lib/etcd-restore
```

## Helm

```bash
helm repo add|update ; helm search repo <x> ; helm show values <chart>
helm upgrade --install <rel> <chart> -n <ns> --create-namespace -f values.yaml
helm list -A ; helm history <rel> ; helm rollback <rel> <rev> ; helm uninstall <rel>
helm template <rel> <chart> -f values.yaml
```

## Deprecated → modern

| Old | Use instead |
|---|---|
| PodSecurityPolicy | Pod Security Admission labels + Kyverno/Gatekeeper/ValidatingAdmissionPolicy |
| dockershim / Docker runtime | containerd / CRI-O (`crictl`) |
| kube-dns | CoreDNS |
| In-tree `kubernetes.io/aws-ebs` | `ebs.csi.aws.com` (EBS CSI driver) |
| Ingress-NGINX (community) | Gateway API, Traefik, F5 NGINX, AWS LB Controller |
| `kubernetes.io/ingress.class` annotation | `spec.ingressClassName` |
| `extensions/v1beta1` Ingress | `networking.k8s.io/v1` |
| `batch/v1beta1` CronJob | `batch/v1` |
| `autoscaling/v2beta*` | `autoscaling/v2` |
| `policy/v1beta1` PDB | `policy/v1` |
| Endpoints | EndpointSlices |
| Secret-based SA tokens | Projected tokens / `kubectl create token` |
| `aws-auth` ConfigMap | EKS access entries |
| `--record` | `kubernetes.io/change-cause` annotation |
| `apt.kubernetes.io` | `pkgs.k8s.io` |
| `etcdctl snapshot restore` | `etcdutl snapshot restore` |
| AppArmor annotation | `securityContext.appArmorProfile` |
| sidecar as a regular container | native sidecar (`initContainers` + `restartPolicy: Always`) |
