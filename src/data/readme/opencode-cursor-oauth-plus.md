# opencode-cursor-oauth-plus

OpenCode plugin that connects to Cursor's API — Cursor models inside OpenCode
with tool calling, vision, and real upstream error messages.

**npm:** [`opencode-cursor-oauth-plus`](https://www.npmjs.com/package/opencode-cursor-oauth-plus)  
**repo:** https://github.com/tanushshukla/opencode-cursor

## Requirements

- [OpenCode](https://opencode.ai) >= 1.18
- **[Bun](https://bun.sh) >= 1.3** — required by OpenCode's plugin runtime
- [Node.js](https://nodejs.org) >= 18 for the HTTP/2 bridge process
- Active [Cursor](https://cursor.com) subscription

### Installing Bun

```sh
curl -fsSL https://bun.sh/install | bash
# Restart your shell, then:
bun --version
```

> If OpenCode is started before Bun is installed, kill any running `opencode`
> processes and restart after installing Bun.

## Install in OpenCode

Add this to `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-cursor-oauth-plus"
  ],
  "provider": {
    "cursor": {
      "name": "Cursor",
      "models": {
        "composer-2.5": {
          "name": "Composer 2.5",
          "reasoning": true,
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image"], "output": ["text"] },
          "variants": {
            "low": { "effort": "low" },
            "medium": { "effort": "medium" },
            "high": { "effort": "high" },
            "max": { "effort": "max" },
            "xhigh": { "effort": "xhigh" }
          }
        }
      }
    }
  }
}
```

The `cursor` provider stub is required because OpenCode drops providers that do
not already exist in its bundled provider catalog.

> **The model list above is an example, not a default.** Cursor exposes a
> different set of models per plan. Generate your own with `cursor-models`
> below — do not copy this block verbatim.

### Static model definitions

**OpenCode v1.18.x does not call the `provider.models` hook** for non-built-in
providers. Models must be defined statically in the config. The plugin's
`auth.loader` handles dynamic connection details (proxy port, token refresh) at
inference time.

This is the single most common source of breakage: an id in the `models` block
that your account cannot use is rejected by Cursor with an opaque error such as
`Connect error internal: Error`, `not_found`, or `resource_exhausted`. Since
0.1.1 the proxy rejects unknown ids up front with the list of ids your account
*does* have.

### Listing the models your plan has

Do not hand-write the `models` block. Generate it:

```sh
# Prints a ready-to-paste provider block for YOUR account
npx opencode-cursor-oauth-plus cursor-models

# Or, if the package is already installed by OpenCode:
bun ~/.cache/opencode/packages/opencode-cursor-oauth-plus@latest/node_modules/opencode-cursor-oauth-plus/dist/cli-models.js
```

Merge the printed `provider` block into `~/.config/opencode/opencode.json`,
then restart OpenCode. Verify with:

```sh
opencode models | grep '^cursor/'
```

Every id it prints came back from Cursor for your plan. Run it again whenever
you change plans or Cursor ships a new model — new models will **not** appear
until you add them to the config.

Raw discovery output:

```sh
npx opencode-cursor-oauth-plus cursor-models --json
```

#### Fields the generator cannot infer

| Field | Why | What to do |
|---|---|---|
| `reasoning` | Cursor derives it from `thinkingDetails`, which it leaves unset even for models that do reason. The generator therefore emits `true` for everything. | Set `false` for any model that never streams thinking output. |
| `modalities` | Discovery does not report input modalities. The generator emits `["text","image"]` (live probes show vision works via Cursor `selectedImages`). | Drop `"image"` only if a model rejects vision. |
| `variants` | Effort levels are a Cursor UI feature, not part of discovery. Applied by family: `effort` for `composer*`, `reasoningEffort` for `grok*`. | Add or remove per model. |

`limit.context`, `limit.output`, `name` and the model id all come straight from
Cursor and need no editing.

## Authenticate

```sh
opencode auth login --provider cursor
```

This opens Cursor OAuth in the browser. Tokens are stored in
`~/.local/share/opencode/auth.json` and refreshed automatically.

## Features

| Feature | Notes |
|---|---|
| OAuth + auto refresh | Browser PKCE login; tokens refresh before expiry |
| Per-plan model list | `cursor-models` CLI generates a paste-ready config |
| Tool calling | OpenCode tools via Cursor MCP; native Cursor tools rejected |
| Vision / images | Native multimodal (`image_url`, base64, local paths) and images returned from tools (e.g. `Read` on a `.png`) |
| Honest errors | Connect codes mapped to HTTP + hints; unknown model ids rejected with the account's real list |
| Turn completion | Honors Cursor `turnEnded` so replies finish immediately instead of hanging for 90s |
| Stall watchdog | If Cursor produces no content, aborts after `CURSOR_NO_OUTPUT_TIMEOUT_MS` (default 90s) |

## Use

Start OpenCode and select any Cursor model. The plugin starts a local
OpenAI-compatible proxy on demand and routes requests through Cursor's gRPC API.

Images work two ways:

1. **Native** — paste/attach when OpenCode sends multimodal content (config must
   include `"image"` in `modalities.input`).
2. **Via tools** — e.g. `Read /path/to/shot.png`; image bytes are forwarded in
   the MCP tool result so the model can see them.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Cursor missing from the model picker | No `provider.cursor.models` block, or `opencode.json` is invalid JSON. Check with `opencode debug config`. |
| `Connect error not_found` / `internal` | Model id is not one your plan has (or temporary upstream reject). Re-run `cursor-models` and replace the block. |
| `Connect error resource_exhausted` | Plan quota for that model is exhausted, or rate limited. |
| `Connect error unauthenticated` | Token rejected — re-run `opencode auth login --provider cursor`. |
| `Connect error deadline_exceeded` / no output for 90s | Cursor accepted the stream but produced no content (quota, stall, or unhandled server query). Check model id and retry. |
| Reply hangs after first tokens (pre-0.1.3) | Fixed: proxy now ends the OpenAI stream on Cursor `turnEnded`. Upgrade the plugin. |
| `Read` image says “attachment lacks content” (pre-0.1.5) | Fixed: tool-result images are forwarded as `McpImageContent`. Upgrade the plugin. |
| `EPIPE` stack from `h2-bridge` during other commands | Fixed in 0.1.5+: bridge exits cleanly when the parent closes the pipe. Restart OpenCode to pick up the new package. |

OpenCode installs npm plugins automatically at startup. After `npm publish` of a
new version, clear the cache if OpenCode keeps an old copy:

```sh
rm -rf ~/.cache/opencode/packages/opencode-cursor-oauth-plus*
# restart OpenCode — it re-fetches @latest
```

## How it works

1. **Bun runtime** — OpenCode loads plugins via its bundled Bun runtime.
2. **OAuth** — browser-based login to Cursor via PKCE.
3. **Model discovery** — `GetUsableModels` (must still be mirrored into static config on 1.18.x).
4. **Local proxy** — `auth.loader` starts a `Bun.serve` proxy that translates
   `POST /v1/chat/completions` into Cursor's protobuf/HTTP/2 Connect protocol.
5. **Tool routing** — rejects Cursor native tools; exposes OpenCode tools via MCP.
6. **Vision** — OpenAI image parts and tool-result images map to Cursor
   `SelectedImage` / `McpImageContent`.

HTTP/2 transport runs through a Node child process (`h2-bridge.mjs`) because
Bun's `node:http2` support is not reliable against Cursor's API.

## Architecture

```
OpenCode  -->  /v1/chat/completions  -->  Bun.serve (proxy)
                                              |
                                    Node child process (h2-bridge.mjs)
                                              |
                                     HTTP/2 Connect stream
                                              |
                                    api2.cursor.sh gRPC
                                      /agent.v1.AgentService/Run
```

### Tool call flow

```
1. Cursor model receives OpenAI tools via RequestContext (as MCP tool defs)
2. Model tries native tools (readArgs, shellArgs, etc.)
3. Proxy rejects each with typed error (ReadRejected, ShellRejected, etc.)
4. Model falls back to MCP tool -> mcpArgs exec message
5. Proxy emits OpenAI tool_calls SSE chunk, pauses H2 stream
6. OpenCode executes tool, sends result in follow-up request
7. Proxy resumes H2 stream with mcpResult (text + optional images)
8. On turnEnded, proxy closes the OpenAI SSE stream (finish_reason=stop)
```

## Develop locally

```sh
bun install
bun run build
bun test/smoke.ts
```

Publish:

```sh
npm publish
```

## Changelog (recent)

| Version | Highlights |
|---|---|
| **0.1.6** | README: vision, turnEnded, troubleshooting, changelog |
| **0.1.5** | Tool-result images (`Read` PNG); EPIPE-safe h2-bridge |
| **0.1.4** | Native vision (`selectedImages`); modalities advertise `image` |
| **0.1.3** | End stream on Cursor `turnEnded` (no more 90s hang after reply) |
| **0.1.2** | `cursor-models` CLI; per-plan config docs |
| **0.1.1** | Surface Connect errors; model validation; stall watchdog |
