# @piyush97/opencode-omniroute-v2

OpenCode v2 integration for OmniRoute. It discovers the live model catalog at startup and exposes it under the `omniroute` provider, then wires the gateway's MCP server, skills, shared memory and A2A delegation into the host.

Based on OmniRoute's MIT-licensed [`release/v3.8.51` OpenCode v2 plugin](https://github.com/diegosouzapw/OmniRoute/tree/release/v3.8.51/%40omniroute/opencode-plugin-v2). Upstream attribution and license are preserved.

## Install

OpenCode v2 currently loads the sync entrypoint from its local plugin directory:

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL https://raw.githubusercontent.com/piyush97/opencode-omniroute-v2/main/plugin.js \
  -o ~/.config/opencode/plugins/omniroute-v2.js
```

Point it at your gateway in `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "omniroute/auto/best-coding",
  "providers": {
    "omniroute": {
      "name": "OmniRoute",
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": { "baseURL": "https://your-omniroute.example/v1" },
      "models": {}
    }
  }
}
```

`opencode.jsonc` works too, and the plugin edits whichever of the two exists. Storing the API key through OpenCode's auth flow or exporting it are both fine:

```sh
export OMNIROUTE_API_KEY="your-api-key"
```

Restart OpenCode. The plugin refreshes `providers.omniroute.models` when the catalog changes, and leaves the file untouched when it has not.

## Two credentials, two planes

The gateway splits its API, and the difference decides what you can use:

| Plane | Endpoint | Credential | Gives you |
|---|---|---|---|
| Inference | `/v1/*` | `OMNIROUTE_API_KEY` | the model catalog |
| Management | `/api/*` | `OMNIROUTE_MANAGEMENT_API_KEY` | skills, memory |
| A2A | `/a2a` | `OMNIROUTE_API_KEY` | agent delegation |

A gateway answers `403 AUTH_001` if you send the inference key to `/api/*`. Skills and memory stay off, with a warning naming the variable, until you add the second key:

```sh
export OMNIROUTE_MANAGEMENT_API_KEY="your-management-token"
```

MCP is the exception: it does not use the management plane, so it registers whether or not you have that token.

## What you get

**Model catalog** — refreshed at startup, with a last-known-good snapshot on disk so a cold start against a down gateway still lists models.

**MCP** — registers the gateway's MCP server as `omniroute`. The gateway refuses MCP from any address that is not loopback (`403 LOCAL_ONLY`), so this needs a local endpoint. It is inferred from a loopback `baseURL`, or set explicitly:

```jsonc
{ "plugins": [{ "package": "@piyush97/opencode-omniroute-v2/sync", "options": { "mcpUrl": "http://127.0.0.1:8787/api/mcp/stream" } }] }
```

**Skills** — publishes the gateway's skill catalog into the host's registry. Each skill is written to `<data dir>/skills/omniroute/<id>/SKILL.md`, because the host requires a skill to exist on disk. Retired skills are removed.

**Memory** — injects relevant stored facts into the system prompt, and adds two tools:

- `omniroute_memory_search` — find facts from earlier sessions
- `omniroute_memory_add` — record a durable fact or procedure

Retrieval is memoised per session, so a multi-step agent loop does not issue a request per step.

**A2A** — uses the public A2A endpoint at `https://<gateway-host>/a2a` and the inference key, independent of the management token. Three commands:

```
/omniroute-delegate [--role <role>] <task>
/omniroute-a2a-status <task-id>
/omniroute-a2a-cancel <task-id>
```

The role comes only from the flag. An earlier revision read it from the first word, which turned `/omniroute-delegate fix the tests` into a delegation to a "fix" role with the task "the tests".

## Options

All optional; the endpoint and key fall back to the environment and then to the config file.

| Option | Default | Purpose |
|---|---|---|
| `providerId` | `"omniroute"` | Provider id to publish under |
| `baseURL` | from `OMNIROUTE_BASE_URL` | Gateway endpoint |
| `apiKey` | from `OMNIROUTE_API_KEY` or auth store | Inference key |
| `managementToken` | from `OMNIROUTE_MANAGEMENT_API_KEY` | Management read token |
| `mcp` / `mcpUrl` | `true` / inferred | MCP registration |
| `skills` / `skillsDir` | `true` / under the data dir | Skill publication |
| `memory.enabled` / `.inject` | `true` / `true` | Memory tools and injection |
| `memory.maxResults` | `5` | Cap on injected memories |
| `a2a.enabled` / `.role` | `true` / — | A2A commands and default role |
| `timeoutMs` | `10000` | Per-request timeout |
| `logLevel` | `"warn"` | `error`, `warn`, `info`, `debug` |

Unknown keys are rejected rather than ignored.

## Behaviour when something is missing

The plugin loads during OpenCode startup, so a half-configured install must not take the host down. It does not throw for any of these:

- **No gateway configured** — warns, does nothing.
- **No `opencode.json`** — a valid setup when the environment carries the config, so it creates the file on the first write.
- **A `opencode.jsonc` with comments** — parsed as JSONC. Rewriting it normalises formatting and drops comments; the plugin says so once.
- **A config that will not parse** — reported with the path, and the file is left alone for you to repair.
- **Gateway down** — falls back to the config's catalog, then the on-disk snapshot, and writes nothing.
- **Gateway answers `200` with an empty catalog** — refused, because it would destroy the last-known-good catalog.
- **API key rotated** — the snapshot is keyed by endpoint *and* both credentials, so one account's models are never served to another.
- **Host without `ctx.mcp` / `ctx.skill` / `ctx.session` / `ctx.tool`** — that feature reports itself unavailable; the rest still works.

## Requirements

- OpenCode v2 (the plugin uses the v2 plugin context; on an older host the optional features are skipped)
- Node 22.22.3 or newer

## Verify

```sh
opencode models | grep '^omniroute/'
opencode run --model omniroute/auto/best-fast 'Reply exactly: PONG'
```

## Development

```sh
npm test          # 327 tests
npm run typecheck
npm run build     # dist/ and the single-file plugin.js
```

`plugin.js` is generated from `src/sync/` and is what the install curls. It is bundled to one file with no runtime dependency, and a test fails if it is stale or imports anything but Node builtins.

## Full upstream plugin

The package also contains OmniRoute's full v2 implementation: combos, auto-combos, metadata enrichment, usable-provider filtering, Gemini schema sanitation and credential integration. OpenCode v2's current package loader is not yet compatible with that entrypoint, so the local `plugin.js` sync entrypoint is the supported installation path for now.

## Security

- API keys stay in OpenCode auth storage or environment variables; the snapshot stores a SHA-256 fingerprint of the credential, never the key.
- The plugin writes model IDs and names, skill bodies from your own gateway, and skill files under the data directory.
- Skill content is written `0600`, snapshot files `0600`.
- Do not commit API keys or management tokens.

## License

MIT. See [LICENSE](LICENSE).
