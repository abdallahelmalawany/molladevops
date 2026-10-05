# Environment & Cluster Setup

<span class="exam-tag">CKA</span>

## Choosing a setup method

| Method | Best for |
|---|---|
| **kind** (Kubernetes in Docker) | Fast local multi-node clusters, CI testing |
| **Minikube** | Single-node local learning cluster with add-ons |
| **k3s / k3d / RKE2** | Lightweight or hardened distributions (edge, on-prem) |
| **kubeadm** | Self-managed multi-node clusters on your own VMs — **the CKA tool** |
| **Amazon EKS / GKE / AKS** | Managed control plane for production |

## Local clusters

=== "kind"

    ```bash
    # Install: https://kind.sigs.k8s.io
    cat <<EOF > kind.yaml
    kind: Cluster
    apiVersion: kind.x-k8s.io/v1alpha4
    nodes:
      - role: control-plane
      - role: worker
      - role: worker
    EOF
    kind create cluster --name lab --config kind.yaml
    kubectl get nodes
    kind delete cluster --name lab
    ```

=== "Minikube"

    ```bash
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube
    minikube start --driver=docker
    minikube status
    minikube addons enable metrics-server
    minikube dashboard
    ```

## kubeadm — multi-node cluster

### Prerequisites (every node)

```bash
# 1. Disable swap (or configure kubelet to tolerate it)
sudo swapoff -a && sudo sed -i '/ swap / s/^/#/' /etc/fstab

# 2. Kernel modules & sysctl
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay && sudo modprobe br_netfilter
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# 3. containerd with systemd cgroup driver
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd

# 4. kubeadm, kubelet, kubectl from pkgs.k8s.io (same minor version)
K8S=v1.35
curl -fsSL https://pkgs.k8s.io/core:/stable:/$K8S/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/$K8S/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update && sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

!!! warning "Deprecated repositories"
    The old `apt.kubernetes.io` / `yum.kubernetes.io` (Google-hosted) repos were frozen in 2023 and removed. Always use **`pkgs.k8s.io`**, which has one repo per minor version.

### Initialise the control plane

```bash
sudo kubeadm init --pod-network-cidr=192.168.0.0/16   # match your CNI's default

mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install a CNI (nodes stay NotReady until you do)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.30.0/manifests/calico.yaml
```

### Join workers

```bash
# Printed by kubeadm init; regenerate any time:
kubeadm token create --print-join-command

# On each worker:
sudo kubeadm join <control-plane-ip>:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

### What kubeadm creates

| Path | Content |
|---|---|
| `/etc/kubernetes/manifests/` | Static Pod manifests: apiserver, controller-manager, scheduler, etcd |
| `/etc/kubernetes/pki/` | Cluster CA and component certificates |
| `/etc/kubernetes/admin.conf` | Admin kubeconfig |
| `/var/lib/kubelet/config.yaml` | kubelet configuration (`staticPodPath`, cgroup driver…) |

!!! note
    With kubeadm **you** own the VMs, OS patching, certificates, etcd backups and upgrades. Managed services (EKS) take the control plane off your hands.

### HA control plane (overview)

- 3 control-plane nodes behind a load balancer (`--control-plane-endpoint "lb:6443" --upload-certs`).
- etcd **stacked** (on the control-plane nodes) or **external** (separate etcd cluster).
- Join extra control-plane nodes with `kubeadm join ... --control-plane --certificate-key <key>`.

## Interview questions

??? question "Why must swap be disabled?"
    Historically the kubelet refused to start with swap on because memory accounting/limits become unpredictable. Newer versions support swap with explicit configuration, but disabling it is still the standard kubeadm prerequisite.

??? question "Why are nodes NotReady after kubeadm init?"
    No CNI plugin is installed yet, so Pod networking isn't configured. Install Calico/Cilium/Flannel.

## Quick recap

- [x] Local: kind, Minikube. Self-managed: kubeadm. Managed: EKS/GKE/AKS.
- [x] kubeadm prereqs: swap off, `br_netfilter`, `ip_forward=1`, containerd with `SystemdCgroup = true`, packages from `pkgs.k8s.io`.
- [x] `kubeadm init` → copy kubeconfig → install CNI → `kubeadm join`.
- [x] Control-plane components are static Pods in `/etc/kubernetes/manifests/`.
