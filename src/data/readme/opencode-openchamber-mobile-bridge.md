# opencode-openchamber-mobile-bridge

Expose OpenChamber running in a devcontainer to your private Tailscale network.

This package provides:

- a minimal OpenCode plugin entrypoint, and
- a host-side CLI that starts OpenChamber inside a devcontainer, creates a local Docker bridge, and registers Tailscale Serve.

It is generic and does not require a specific project manager.

## Requirements

- Docker
- Dev Containers CLI, when the target devcontainer is not already built
- Tailscale on the host
- Node.js 18+

## Install

```bash
npm install -g opencode-openchamber-mobile-bridge
```

## Configure

Create `~/.config/opencode/openchamber-mobile-bridge.json`:

```json
{
  "projects": [
    {
      "name": "example-project",
      "workspace": "/path/to/project",
      "hostPort": 31001,
      "containerPort": 3000
    }
  ]
}
```

Or generate a starter file:

```bash
opencode-openchamber-mobile-bridge init-config
```

## Use

```bash
opencode-openchamber-mobile-bridge start example-project
opencode-openchamber-mobile-bridge status example-project
opencode-openchamber-mobile-bridge stop example-project
opencode-openchamber-mobile-bridge list
```

You can also run without a config entry:

```bash
opencode-openchamber-mobile-bridge start example-project \
  --workspace /path/to/project \
  --host-port 31001
```

The command prints a Tailscale URL and the generated OpenChamber UI password.

## Runtime model

```text
Tailnet client
  -> Tailscale Serve on host
  -> host localhost:<hostPort>
  -> Docker bridge sidecar
  -> devcontainer OpenChamber on <containerPort>
  -> OpenCode server detected by OpenChamber
```

## Privacy

Do not commit your local config file. It may contain local paths and project names.
Examples use placeholders only.
