# opencode-brainbox

Brainbox as [opencode](https://opencode.ai)'s native memory backend.

A **Tier-2** memory integration — not just an on-demand tool, but a plugin that:

1. exposes `brainbox_recall` / `brainbox_store` / `brainbox_get` tools the model can call,
2. auto-injects a **WakeBrief** into the system prompt at session start (recalled context, before turn 1), and
3. files a **digest** at session end for Brainbox's server-side dream cycle.

Ported from [`openclaw-brainbox`](https://github.com/CIF-AI/openclaw-brainbox) onto opencode's
`@opencode-ai/plugin` hook surface. Same transport client, same never-throws + cooldown contract.

## Install

From a local checkout, reference it in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    ["file:///Users/you/opencode-brainbox/index.js", { "baseUrl": "https://brainbox-mcp.thexi.dev" }]
  ]
}
```

(Non-secret options only — the API key comes from the environment, never the config file.)

## Auth — never put the key in plaintext config

The `bbk_` tenant key is read from `BRAINBOX_BBK` (or `BRAINBOX_KEY`). On macOS, keep it in the
Keychain and export it at launch:

```bash
# one-time: store the key (service name matches the openclaw plugin's convention)
security add-generic-password -a "$USER" -s brainbox-api-key -w 'bbk_...' -U

# per shell / wrapper, before running opencode:
export BRAINBOX_BBK="$(security find-generic-password -s brainbox-api-key -w)"
opencode run -m openrouter/z-ai/glm-5.2 "…"
```

## Hooks used (`@opencode-ai/plugin`)

| Behaviour | Hook |
| --- | --- |
| recall / store / get tools | `tool` |
| WakeBrief injection at session start | `experimental.chat.system.transform` |
| open session + capture user text | `chat.message` |
| digest + continuous-encoder turn sync | `experimental.text.complete` |
| carry recalled context across compaction | `experimental.session.compacting` |
| file digest on explicit session end | `event` (`session.deleted`) |
| best-effort close on teardown | `dispose` |

> **Note on session end:** opencode has no explicit "session ended" hook. For headless
> `opencode run` (one-shot), `dispose` fires on process exit — an exact, clean end. For the
> long-lived TUI, the digest is filed on `session.deleted` and on `dispose`. Server-side
> lazy-close + TTL sweep means a missed end degrades, never corrupts.

## Transport

- `brainbox_recall` → REST `POST /ask` (salience-ranked recall, confidence grades, evidence tags,
  honest abstention).
- `brainbox_store` / `brainbox_get` and the session tools → the worker's `/mcp` door (hand-rolled
  JSON-RPC streamable-HTTP client, no SDK).

All tools never throw: on any backend failure they return `{ disabled: true, unavailable: true,
error }` and open a cooldown window (default 60s) so a dead backend costs one timeout, not one per
turn.

## Memory-free runs

Set `BRAINBOX_RECALL=off` to disable the read paths (recall tool + WakeBrief injection) for a run;
writes still flow. For a fully memory-free run, simply don't load the plugin. This switch carries no
mode semantics — it's plain ergonomics.

## Config options

| key | default | |
| --- | --- | --- |
| `baseUrl` | `https://brainbox-mcp.thexi.dev` | |
| `apiKey` | — | prefer `${BRAINBOX_BBK}` env; a literal `bbk_…` is accepted |
| `requestTimeoutMs` | `8000` | per-request timeout |
| `failureCooldownMs` | `60000` | backoff after a backend failure |
| `sessionChoreography` | `true` | set `false` for tools-only (no WakeBrief / digest) |
| `turnSync` | `true` | continuous-encoder per-turn ingest |
