# Services, Ingress & Gateway API

<span class="exam-tag">CKA</span>

## Services

| | |
|---|---|
| **What** | A stable virtual IP + DNS name that load-balances to a dynamic set of Pods selected by labels. |
| **Why** | Pods are ephemeral and change IPs; clients need a fixed address. |
| **How** | The EndpointSlice controller tracks **ready** Pods matching the selector; kube-proxy programs node rules to forward traffic to them. |

### Service types

| Type | Behaviour |
|---|---|
| **ClusterIP** (default) | Internal virtual IP, reachable inside the cluster |
| **NodePort** | ClusterIP + a static port (**30000–32767**) on every node |
| **LoadBalancer** | NodePort + an external cloud load balancer (AWS NLB/ELB) |
| **ExternalName** | DNS CNAME to an external name, no proxying |
| **Headless** (`clusterIP: None`) | No virtual IP; DNS returns Pod IPs (StatefulSets) |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - name: http
      port: 80          # Service port
      targetPort: 8080  # container port (number or named port)
---
apiVersion: v1
kind: Service
metadata: { name: web-nodeport }
spec:
  type: NodePort
  selector: { app: web }
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080     # optional; auto-assigned if omitted
---
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  annotations:            # AWS Load Balancer Controller → NLB
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  type: LoadBalancer
  selector: { app: web }
  ports:
    - port: 80
      targetPort: 8080
```

```bash
kubectl expose deployment web --port=80 --target-port=8080 --type=NodePort
kubectl get svc,endpointslices -l app=web
```

| | ClusterIP | NodePort | LoadBalancer |
|---|---|---|---|
| Reachable from | Inside cluster | Any node IP : high port | Internet via cloud LB |
| Needs cloud | No | No | Yes (or MetalLB on-prem) |
| Typical use | Internal microservices | Dev / on-prem | Production entry point |
| Cost | Free | Free | One LB per Service |

Useful fields: `sessionAffinity: ClientIP`, `externalTrafficPolicy: Local` (preserve client IP, only nodes with Pods), `internalTrafficPolicy`, `trafficDistribution: PreferClose`.

## Ingress

| | |
|---|---|
| **What** | API object for external **HTTP/HTTPS** access: host/path routing and TLS termination behind one entry point. |
| **Why** | One LoadBalancer per app is expensive; Ingress routes many Services through one LB. |
| **How** | An **Ingress controller** (Traefik, AWS Load Balancer Controller, F5 NGINX, HAProxy, Contour…) watches Ingress objects and configures the proxy. **No controller = nothing happens.** |

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: traefik        # replaces the deprecated kubernetes.io/ingress.class annotation
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls          # kubernetes.io/tls Secret (or issued by cert-manager)
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix        # Prefix | Exact | ImplementationSpecific
            backend:
              service: { name: api-svc, port: { number: 80 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: web-svc, port: { number: 80 } }
```

!!! warning "Retired: Ingress-NGINX (kubernetes/ingress-nginx)"
    The community **ingress-nginx** controller was **retired in March 2026** — no more releases or security patches. Existing installs keep running, but new clusters should use **Gateway API** or a maintained controller (Traefik, F5 NGINX Ingress Controller, AWS Load Balancer Controller…).

!!! warning "Removed: `extensions/v1beta1` and `networking.k8s.io/v1beta1` Ingress"
    Removed in 1.22. Use `networking.k8s.io/v1` (with `pathType` and `service.port.number`).

## Gateway API

The successor to Ingress: **role-oriented**, expressive and portable (traffic splitting, header matching, TLS, TCP/UDP/gRPC) without vendor annotations.

| Resource | Owned by | Purpose |
|---|---|---|
| **GatewayClass** | Infrastructure provider | Which controller implements gateways (Envoy Gateway, Cilium, Istio, NGINX Gateway Fabric, AWS…) |
| **Gateway** | Platform/cluster operator | A listener (ports, protocols, TLS) — an actual load balancer |
| **HTTPRoute / GRPCRoute / TLSRoute / TCPRoute** | App teams | Routing rules attached to a Gateway |
| **ReferenceGrant** | Target namespace owner | Allows cross-namespace references |

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: { name: shop-gw, namespace: infra }
spec:
  gatewayClassName: envoy
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces: { from: All }
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: shop-route, namespace: shop }
spec:
  parentRefs:
    - { name: shop-gw, namespace: infra }
  hostnames: [shop.example.com]
  rules:
    - matches:
        - path: { type: PathPrefix, value: /api }
      backendRefs:
        - { name: api-v1, port: 80, weight: 90 }
        - { name: api-v2, port: 80, weight: 10 }   # 10% canary
    - matches:
        - headers: [{ name: x-beta, value: "true" }]
      backendRefs:
        - { name: api-v2, port: 80 }
```

Gateway API CRDs are installed separately (`kubectl apply -f` the standard-channel release) and Gateway API is part of the **CKA** curriculum.

| | Ingress | Gateway API |
|---|---|---|
| Roles | One object for everyone | Split: class / gateway / routes |
| Traffic splitting, header match | Vendor annotations | Native |
| Protocols | HTTP(S) | HTTP, gRPC, TLS, TCP, UDP |
| Status | Stable but frozen | Actively developed successor |

## Troubleshooting

| Symptom | Investigate | Likely cause | Fix |
|---|---|---|---|
| Service unreachable | `kubectl get endpointslices -l kubernetes.io/service-name=<svc>` | Selector doesn't match Pod labels, or Pods not Ready | Fix labels/selector; fix readiness |
| Wrong port | `kubectl describe svc` | `targetPort` ≠ container port | Correct `targetPort` |
| DNS fails | `kubectl exec <pod> -- nslookup <svc>` | CoreDNS down / bad resolv.conf | Check `k8s-app=kube-dns` Pods |
| Ingress not routing | `kubectl describe ingress`, controller logs | No controller, wrong `ingressClassName` | Install controller; set class |
| 502/504 | Controller logs | Backend has no Ready endpoints | Fix backend health |
| HTTPRoute not attached | `kubectl describe httproute` (status conditions) | `allowedRoutes` / `parentRefs` mismatch, missing ReferenceGrant | Fix namespaces/refs |

```bash
# Test from inside the cluster
kubectl run curl --rm -it --image=curlimages/curl --restart=Never -- curl -sv http://backend.default
kubectl port-forward svc/backend 8080:80
```

## Interview questions

??? question "How does a Service find its Pods?"
    Through its label selector; the EndpointSlice controller lists ready matching Pods and kube-proxy programs rules on every node.

??? question "Service vs Ingress?"
    A Service is L4 load balancing to a set of Pods; Ingress is an L7 HTTP router fronting many Services and needs a controller.

??? question "Why move from Ingress to Gateway API?"
    Gateway API separates roles, supports traffic splitting/header routing natively and multiple protocols, avoiding vendor-specific annotations.

## Quick recap

- [x] ClusterIP · NodePort (30000–32767) · LoadBalancer · ExternalName · Headless.
- [x] `port` = Service port, `targetPort` = container port.
- [x] Ingress needs a controller and `ingressClassName`; ingress-nginx is retired.
- [x] Gateway API: GatewayClass → Gateway → HTTPRoute (weights for canary).
