# Mistral Vibe for OpenCode V2

Community-maintained integration by [itsSivvis](https://github.com/itsSivvis).
Not an official Mistral or OpenCode plugin.

Adds **Mistral Vibe** to `/connect` and its account-specific model catalog to `/models`.
Requires OpenCode 2.2.5+ and **mistral-vibe 3.1.x** on the OpenCode server host.

## Install

On the machine running the OpenCode server:

```sh
uv tool install mistral-vibe==3.1.0
vibe --setup
opencode plugin add github:itsSivvis/opencode-mistral-vibe
```

Alternatively, add the GitHub package to your global
`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:itsSivvis/opencode-mistral-vibe"],
}
```

Then `/connect` → **Mistral Vibe** → **Use Vibe login**, and select a model in
`/models`, for example `mistral-vibe/mistral-medium-3.5#high`. Reconnect to refresh
the inventory after changing Vibe's user model configuration. `/reload` reloads
the plugin configuration.

### Model discovery and refresh

The plugin loads Vibe's curated online model catalog for your account, including
third-party models that Mistral hosts for Vibe. It merges the catalog through
Vibe's native configuration layer, preserving your user-defined model overrides.
Only models supporting function calls are contributed by the online catalog.
When the catalog lists Vibe's unchanged built-in default as an alias of a
canonical model, only the canonical entry is offered in the picker. The old ID
remains resolvable for existing sessions. User-customized model definitions are
preserved, and models are never deduplicated merely by their display name.

The catalog is fetched when the connected plugin loads or reloads and when you
reconnect/switch the Vibe connection. `/reload` therefore also checks for new
online models. Merely opening `/models` does not refresh it; there is no timer.

A fetch has a five-second overall budget. If it fails, the plugin uses Vibe's
credential-specific disk cache (native TTL: 30 days), then its local defaults and
user configuration. Model calls use that same cache, fetching only if no usable
cache exists, so selecting a discovered model works across bridge processes.
The probe reports `source: remote`, `cache`, or `local` for diagnostics.

## Architecture

Like Claude Agent, this registers an external login, model inventory and an AI SDK
language-model adapter. Each OpenCode model request starts a short-lived Python
bridge inside the installed Vibe environment. It uses **Vibe's own Mistral
completion adapter**, model configuration and credential resolver. This is not a
wrapper around `vibe -p`: there is no second agent loop and no textual flattening
of conversation history.

- OpenCode owns instructions, history, tools, approvals, compaction and subagents.
- Vibe owns model transport and credential resolution (environment, its `.env`,
  keyring or CLI OIDC credential, as supported by Vibe).
- Text/reasoning stream live; tool calls return to OpenCode for execution. Tool
  results preserve native roles and call IDs on the next request.
- Cancellation terminates only the bridge process belonging to the request.
- Credentials stay inside Python. Probe responses contain model metadata and an
  authentication-presence flag, never tokens. Errors omit provider response bodies.
- The bridge reads Vibe's user configuration; it does not start Vibe's tools,
  hooks, MCP connections or session storage.

The Python adapter API is internal to Vibe, so this release checks the 3.1.x
version boundary. Update and retest the adapter before supporting another minor.

## Paths

- `OPENCODE_VIBE_PATH`: path to `vibe` (otherwise PATH, then `~/.local/bin/vibe`).
- `OPENCODE_VIBE_PYTHON`: explicit Python executable with `mistral-vibe` installed;
  useful for pip installs, wrappers or Windows. With uv, the sibling `python` in
  Vibe's resolved environment is discovered automatically.
- `VIBE_HOME`: honored by Vibe for user configuration and authentication.

Set these in the **server's environment**, not just the terminal client.

## Scope and limitations

- Local-server integration; not registered in remote workspaces.
- Lists Vibe's curated Mistral-hosted models and configured Mistral-backend models;
  generic third-party provider backends are not supported.
- Supports text, reasoning, image input, function tools and token/cache usage.
- Uses OpenCode's system prompt rather than Vibe's product prompt.
- Structured output and forced tool choice fail explicitly. Unsupported sampling
  settings produce stream warnings. PDF/audio input is not supported.
- OpenCode HTTP hooks do not intercept Python's model requests.
- Pricing is not inferred: a Vibe credential can be subscription-backed or metered.
  Blank cost in OpenCode does **not** mean free usage. Vibe/Mistral determines billing.
- Credential presence is checked locally; a successful paid model request still
  depends on account access. No sign-in is performed automatically.

## Verification

For local development, clone this repository and install dependencies with
[Bun](https://bun.sh/) 1.4.4:

```sh
git clone https://github.com/itsSivvis/opencode-mistral-vibe.git
cd opencode-mistral-vibe
bun install --frozen-lockfile
bun run test
bun typecheck
VIBE_TEST_PYTHON="$HOME/.local/share/uv/tools/mistral-vibe/bin/python" bun run test
VIBE_TEST_OPENCODE="$HOME/.opencode/bin/opencode" \
  VIBE_TEST_PYTHON="$HOME/.local/share/uv/tools/mistral-vibe/bin/python" bun run test
```

The opt-in integration test runs the real installed Vibe adapter against a local
HTTP fixture, using an isolated VIBE_HOME and a dummy credential. It covers model
discovery, streaming, tool calls/results, cancellation and sanitized failures.
The OpenCode smoke test additionally runs the installed CLI in an isolated home,
connects the external integration and generates through its public API.

To load a development checkout, put its absolute directory path in `plugins`
instead of the GitHub package. The Python bridge and tests are included in this
repository; no OpenCode source checkout is required.

## License

[MIT](LICENSE). Vibe is installed separately and remains subject to its own
license and service terms.

Sources: [OpenCode Claude Agent](https://opencode.ai/v2/docs/claude-agent/),
[OpenCode plugin API](https://opencode.ai/v2/docs/build/plugins/server/),
[Mistral Vibe](https://github.com/mistralai/mistral-vibe).
