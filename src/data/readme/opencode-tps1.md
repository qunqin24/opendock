# opencode-tps1

Displays live TPS (tokens per second), average TPS, and average TTFT (time to first token) at the right side of the OpenCode session prompt.

A **TUI-only** plugin for OpenCode 1.x (`opencode`, stable channel). Metrics are computed from **OpenCode's own usage events** — no byte-estimation of token counts beyond the transient live window.

## Requirements

- `opencode` `1.14` or newer (stable channel; the TUI plugin API and `message.part.delta` event stream).
- The TUI runtime injects `@opentui/*` and `solid-js`; `@opencode-ai/plugin` is pulled in as a peer.

## Install

### From npm (recommended, once published)

```bash
opencode plugin opencode-tps1 --global
```

`opencode plugin` downloads the package and registers the TUI entry (`opencode-tps1/tui`) in your global `~/.config/opencode/tui.json`. Restart `opencode` afterwards.

### Quick install script (from source)

```bash
curl -fsSL https://raw.githubusercontent.com/fengye110/opencode-tps1/main/install.sh | bash
```

The script clones the repository to `~/.local/share/opencode-tps1` and registers `tui.tsx` in `~/.config/opencode/tui.json(c)`. Set `OC_TPS_DIR` to choose a different install directory. It backs up an existing config first and never duplicates entries.

### Manual

1. Clone and register in `~/.config/opencode/tui.json(c)`:

```jsonc
{
  "plugin": ["/absolute/path/to/opencode-tps1/tui.tsx"]
}
```

2. Restart `opencode`. The status line appears at the right side of the session prompt footer.

## Configuration

TTFT display is off by default. Enable it by passing the `showTtft` option; note that plugin options are supported through the `[spec, options]` tuple form in `tui.json`:

```jsonc
{
  "plugin": [
    ["opencode-tps1/tui", { "showTtft": true }]
  ]
}
```

## Usage

The footer updates live while a session streams:

```
TPS 42.3 | AVG 51.2            ← default
TPS 42.3 | AVG 51.2 | TTFT 0.8s  ← with showTtft
```

- **TPS** — live tokens/second from the rolling window between stream chunks.
- **AVG** — session average tokens/second over completed messages (provider-reported totals).
- **TTFT** — average time-to-first-token across completed messages in the session (only when enabled).

## Uninstall

```bash
opencode plugin remove opencode-tps1
```

> `opencode` does not hot-reload plugins in current builds. Restart the TUI after every plugin change.

## How it works

`tui.tsx` is the only entrypoint. It consumes OpenCode's public TUI event stream:

| Event | Purpose |
|---|---|
| `message.updated` | authoritative per-message token totals, TTFT anchor and stream duration |
| `message.part.delta` (field `text`) | live rolling TPS window |
| `message.part.updated` (tool parts) | drop stale live samples on tool boundaries |

The metrics engine lives in `src/metrics.ts` (pure TypeScript, no runtime deps).

## Development

```bash
npm install
npx tsc --noEmit          # type check
npm pack                  # inspect the publish contents
```

## Publishing

```bash
npm login
npm publish               # runs the CI workflow; publishes src/tui.tsx + src/metrics.ts
```

The package is published to npm as **`opencode-tps1`**.
