# OpenCode Kubernetes Workspaces

![NPM Version](https://img.shields.io/npm/v/opencode-k8s-workspaces)

Run remote [OpenCode](https://opencode.ai) workspaces in Kubernetes. Create a workspace from OpenCode and it spins up a pod in your cluster.

## Setup

The setup is split across two components, a [controller](./packages/controller) running in your Kubernetes cluster and an OpenCode [plugin](./packages/plugin) running on your client that is connecting to the controller.

A Kubernetes cluster with an ingress controller and DNS pointing to it is required. The cluster distribution can be anything — a local dev cluster, a managed cloud cluster, an on-prem cluster.

### 1. Deploy the controller

```bash
kubectl apply -f k8s/controller.yaml
```

You need two DNS records pointing to your ingress:

- `controller.<domain>` — for the management API
- `workspaces.<domain>` — for workspace pods

Edit `WORKSPACE_HOST` in the Deployment and the Ingress host to match your domain.

Idle workspaces are automatically cleaned up after 60 minutes by default. The TTL resets every time opencode polls the workspace status. Set `WORKSPACE_TTL_MINUTES` to `0` to disable.

### 2. Add the plugin to OpenCode

In `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    [
      "opencode-k8s-workspaces",
      {
        "host": "https://controller.example.com"
      }
    ]
  ]
}
```

### 3. Code cloning

When creating a workspace from a git project, the plugin auto-detects your HTTPS remote URL and branch, then uses your git credential helper to clone the repo into the workspace pod. No SSH — HTTPS only. If your remote is SSH, you'll get an error telling you to convert it.

For private repos where the credential helper isn't available, use the `cloneToken` option with opencode's env var syntax:

```jsonc
{
  "plugin": [
    [
      "./packages/plugin/src/index.ts",
      {
        "cloneToken": "{env:OPENCODE_K8S_GIT_CLONE_TOKEN}"
      }
    ]
  ]
}
```

```bash
export OPENCODE_K8S_GIT_CLONE_TOKEN=ghp_xxx
```

### 4. Enable workspaces

```bash
OPENCODE_EXPERIMENTAL_WORKSPACES=true opencode
```

Press `Ctrl+P`, type `warp`, and select **Kubernetes**.

## Contributing

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Docker](https://docker.com)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [k3d](https://k3d.io) — local K8s cluster
- [Tilt](https://tilt.dev) — live reload for K8s development

Or use the Nix flake:

```bash
nix develop
```

### Setup

```bash
bun install
```

### Typecheck

```bash
bun run --cwd packages/controller typecheck
bun run --cwd packages/plugin typecheck
```

### Local dev with k3d + Tilt

Start a local cluster:

```bash
k3d cluster create opencode --registry-create opencode-registry --port 80:80@loadbalancer --port 443:443@loadbalancer
```

k3d ships with Traefik as the ingress controller — no additional install needed. If using another cluster, install any ingress controller (NGINX, Contour, Traefik).

Launch Tilt:

```bash
tilt up
```

Tilt builds the controller image, deploys it to the cluster, and port-forwards `localhost:3000`.

Code changes sync directly into the running container via Tilt's `live_update` — no image rebuild needed. Bun's `--watch` picks up the change and restarts instantly. Open the UI at `http://localhost:10350` to see build status and pod logs.

### Testing

```bash
# Create a workspace
curl -X POST http://localhost:3000/workspaces \
  -H "Content-Type: application/json" \
  -d '{"id":"wrk_test123","name":"test","projectID":"proj_123","env":{"FOO":"bar"}}'

# Check status
curl http://localhost:3000/workspaces/wrk_test123

# List all
curl http://localhost:3000/workspaces
```

### Releasing

The root `package.json` is the single source of truth for the version. Run `bun run sync-version` to propagate it to sub-packages.

```bash
# 1. Bump version in package.json (e.g. 0.1.0 → 0.1.1)

# 2. Sync and release
bun run release
# → syncs sub-packages, commits, tags, and pushes

# 3. Publish the npm plugin
cd packages/plugin && bun publish
```

CI builds the controller image on every push to `main` (`:latest`) and on tags (`:v0.1.1`).
