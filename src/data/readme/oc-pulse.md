# oc-pulse

Real-time LLM inference metrics visualization for OpenCode.

## Purpose

Designed for AI researchers and developers using self-hosted inference servers. See generation speed and progress in real-time while waiting for LLM responses in OpenCode.

## Demo

**Prompt processing (prefill phase)** — progress and processing speed while the prompt is being processed:

![Prompt processing demo](Prompt_processing.gif)

**Generation and processing** — generation speed and token counts in real-time:

![Generation and processing demo](Generation_and_processing.gif)

## Architecture

This plugin works with **llama-swap-pulse**, a companion server that:
- Reads logs from your llama-swap instance
- Exposes metrics via HTTP API and Server-Sent Events (SSE)
- Provides real-time inference data in a plugin-friendly format

The plugin automatically connects to the pulse server based on your provider's `baseURL` configuration.

When several OpenCode instances share one llama-swap, each instance only displays
tasks belonging to its current session's model (`upstream` filtering; for llama.cpp
models without upstream identity a local busy-session heuristic is used).

## Install

Add to your `~/.config/opencode/cli.json`:

**From npm:**
```json
{
  "plugins": [
    { "package": "oc-pulse", "options": { "port": 8090, "debug": true } }
  ]
}
```

Pin a specific version with `oc-pulse@2.0.0` in `package` if you want to avoid
automatic updates. Use `cli.json` (not `opencode.json`) for oc-pulse: it is a
TUI-only plugin and stays active when the CLI connects to a remote server.

**From local file:**
```json
{
  "plugins": [
    { "package": "file:///path/to/oc-pulse", "options": { "port": 8090, "debug": true } }
  ]
}
```

**From git** (default branch `main` = oc-pulse 2.x):
```bash
git clone <repo-url>
```

> oc-pulse 2.x requires OpenCode 2.x. For OpenCode 1.x use the legacy oc-pulse 1.x
> from the `v1` branch (tag `v1.1.0`), registered in `tui.json`.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `8090` | Pulse server port. If omitted, defaults to `8090`. |

## How it works

- Reads the current session's provider `baseURL` automatically
- Strips path components (e.g. `/v1`, `/openai`) and uses host + port
- Displays LLM metrics in the session prompt area
- Automatically reconnects when switching providers

## Metrics

Live metrics are displayed in the right side of the session prompt:

### Prefill Phase (prompt processing)
- Progress percentage
- Processing speed (tokens/sec)
- Number of prompt tokens

### Generation Phase (response generation)
- Generation speed (tokens/sec)
- Number of tokens generated
- Engine semantic status (Strata/Maya engines only): `Thinking` while the model
  reasons, `Tool call` while it writes a tool call — shown instead of `Generation`
  (e.g. `Thinking | 94.5 t/s | 132 tokens`)

### Completed Tasks
- Total duration
- Total tokens (prompt + generated)

### Additional Info
- Graph cache reuse count (when available)
- Model restoration similarity score (when restoring cached context)

**Status indicators:**
- `◯` — Connected but no task running
- `✕` — Pulse server running but disconnected from llama-swap
- `(empty)` — Inactive (no session or no baseURL)

## Requirements

- OpenCode >= 2.1.4
- A provider with a `baseURL` configured (e.g., a llama-swap instance)
- **llama-swap-pulse** running on your llama-swap server

  Install and configure: https://github.com/LeBohdan/llama-swap-pulse

Providers without `baseURL` (e.g., OpenRouter, API-key providers) will show `inactive` state.

## Troubleshooting

The plugin does not load at all (no widget, no errors in the session):

1. **Stale clone on the legacy v1 branch (when installing from source).** Until
   late October 2026 the default `main` branch contained the OpenCode 1.x plugin.
   Older clones may still have that v1 code (`@opencode-ai/plugin <2`), which
   OpenCode 2 will not load.

   ```bash
   git checkout main && git pull
   ```

   Check that `package.json` has `"version": "2.x"` and an `@opencode/plugin >=2.1.4`
   peer dep. Legacy v1 code is preserved on the `v1` branch (tag `v1.1.0`).
2. **OpenCode version.** Run `opencode --version`; oc-pulse 2.x requires `>= 2.1.4`.
3. **Wrong config file.** OpenCode 2 reads plugins from `~/.config/opencode/cli.json`
   (v1 used `tui.json`). A stale `tui.json` entry does nothing on OpenCode 2.
4. **Local path.** For `"package": "file:///path/to/oc-pulse"`, the path must point
   to the checkout that contains the v2 code (see item 1).
5. **Debug logs.** Set `"options": { "debug": true }` and check
   `$OPENCODE_DIR/logs/oc-pulse.log` for connection errors.

The widget shows `✕` or stays `disconnected`: the pulse server is unreachable —
check that llama-swap-pulse is running and that `port` (default `8090`) matches,
or set the correct `port` in the plugin `options`.

---

## Copyright

(c) Bohdan Futerko, 2026, [https://www.bf.com.ua](https://www.bf.com.ua), [https://github.com/LeBohdan](https://github.com/LeBohdan)
