# REEVE

**A self-owned multi-agent orchestration layer for OpenCode v2.**

REEVE handles three things, and together they are the name:

| What it does | Historical meaning of "reeve" |
|---|---|
| Dispatch work to specialist agents | to assign work |
| Keep its own ledger of child tasks — who is running, who died | to keep accounts |
| Verify the artifacts itself instead of trusting a subagent's report | to inspect the work |

(shire reeve → sheriff: the official who supervises and keeps the accounts.)

[中文说明](README.zh-CN.md)

## What it is

REEVE is a single OpenCode v2 plugin plus an optional OpenChamber panel. It fills
the gaps v2 leaves open — child-task status, silent child death, concurrency
limits, wall-clock timeouts — without writing `agents.*.model` (that key belongs
to the OpenChamber panel).

```
GATE            in-process proxy: routing, fallback chains, ledger, catalog
Orchestration   8 subagents + 1 visible foreman, review skill, dispatch rules
Ledger          child-task ledger, concurrency gate, timeouts, reconciliation
Review          independent diff review with a fixed rubric
Panel           OpenChamber extension: chains, stats, ledger, free lane
```

GATE is plain JavaScript inside the plugin. There is **no proxy binary, no
separate service, and no Bifrost/9router dependency** — those were retired in
0.1.8/0.1.5 respectively.

## Requirements

- Node.js **>= 22**
- OpenCode **v2** (tested against 2.0.32 and 2.1.3)
- OpenChamber **>= 2.3.3** for the panel extension (2.5.0 tested)
- One or more provider credentials in `~/.local/share/opencode/auth.json`

## Install

### 1. Engine plugin

Add the plugin to `~/.config/opencode/opencode.jsonc` (or `opencode.json`):

```jsonc
{
  "model": "reeve/standard",
  "plugins": ["@bd7pil/reeve@0.2.3"]
}
```

- `model` is required. Without it, a bare `opencode run` / a fresh composer
  session can use the engine's default model and silently bypass GATE.
  `reeve/standard` is the cost-first default; choose `reeve/pro`, `reeve/flash`,
  or `reeve/multimodal` if you want a different one. 0.2.0 removed the
  `reeve/manual` single-target tier — pick a model directly in the composer instead.
- The plugin registers four tiers and all agents itself, and on first start adds
  `providers.reeve` (`http://127.0.0.1:18080/v1`) to the config if it is missing.
  The write is additive, backed up, and comment-preserving.
- GATE listens on **18080** by default when the plugin starts it. If 8080 is
  occupied on your host, set the port explicitly:

```jsonc
{
  "model": "reeve/standard",
  "plugins": [
    { "package": "@bd7pil/reeve@0.2.3", "options": { "gate": { "enabled": true, "port": 18080 } } }
  ],
  "providers": {
    "reeve": {
      "package": "@ai-sdk/openai-compatible",
      "settings": { "baseURL": "http://127.0.0.1:18080/v1" }
    }
  }
}
```

### 2. OpenChamber panel (optional but recommended)

Settings → Extensions → install one of:

- **self-updating (git):** `https://github.com/BD7PIL/reeve#reeve`
- **fixed zip:** `https://github.com/BD7PIL/reeve/releases/download/reeve-latest/reeve.zip`

Grant `sessions` + `filesystem` after installation. The panel reads the plugin
snapshot and GATE config; it never starts sessions or prompts.

## Tiers and agents

| Tier | Chain | Agents | Purpose |
|---|---|---|---|
| `reeve/pro` | `reasoning` | planner, advisor, critic | strongest reasoning; text-first |
| `reeve/standard` | `standard` | executor, reviewer | general-purpose mid tier, image-capable |
| `reeve/flash` | `free-first` | scout, librarian | free-first, then paid fallback |
| `reeve/multimodal` | `vision` | looker | image/PDF via files on disk; also the image route |

`foreman` is the visible primary orchestrator; it follows the session's model
selection (top-level default `reeve/standard`).

`looker` is a hidden, read-only subagent for images/PDFs **on disk**. Pasted
images are handled by GATE directly (see below).

Default chains (editable in the panel; config at
`~/.config/opencode/reeve/fallback.jsonc`):

- `standard`: zhipu glm-5.3-flash → lmuai glm-5.3-flash → free → deepseek
- `reasoning`: zhipu glm-5.3 → deepseek → lmuai glm-5.3-flash → free
- `free-first`: free → zhipu glm-5.3-flash → lmuai → deepseek
- `vision`: zhipu glm-5.3-flash → lmuai → free → deepseek

## Images

All four tiers declare image input so the engine does not strip attachments
before GATE sees them. When a request to `reasoning` contains an image, GATE
routes **that request only** to the `vision` chain; the session model and
composer selection do not change. Text requests to `reeve/pro` still use
GLM-5.3.

Pasted images have no filesystem path in OpenCode v2; they are stored inline in
the session database. A text-only model can see only an error text, and the
built-in `subagent` tool cannot carry attachments. REEVE therefore routes pasted
images at the proxy layer, and uses `looker` only for file paths.

## Free lane

Chains can contain `@free`. At request time GATE discovers free models from
OpenCode Zen and OpenRouter, filters them by `modalities.input` from
`https://models.dev/api.json` (6-hour TTL, last-good cache), and expands up to
`free.max` candidates. With `require_image: true`, only image-capable free
models are eligible; if the metadata is unavailable, the request falls back to
paid instead of using a text-only model. Failed free models cool down globally
(3 failures → 600s by default).

Bifrost and 9router are retired; free routing is implemented natively.

## Files and state

| Path | What |
|---|---|
| `~/.config/opencode/opencode.jsonc` | engine config (plugin + `model`) |
| `~/.config/opencode/reeve/fallback.jsonc` | GATE chains/providers/free policy (panel-editable) |
| `~/.reeve/ledger.json` | read-only snapshot for the panel |
| `~/.reeve/gate.jsonl` | GATE request ledger (no keys) |

## Upgrade notes

- Remove any per-agent `model` overrides; the plugin owns the agent definitions.
- `reeve/coding` no longer exists — use `reeve/standard`.
- 0.2.0 removed the `reeve/manual` tier and its chain. Use `reeve/standard` as
  the default and pick a model directly in the composer when you want a specific
  one. Remove the `manual` chain, `agents.foreman`, and the
  `chain_for_model["reeve/manual"]` entry from your `fallback.jsonc`, and change
  any `"model": "reeve/manual"` line to `reeve/standard`. The plugin logs a
  warning when it still sees a stale manual registration.
- Remove the old `free.image_models` static list; image filtering is dynamic.
- Bifrost/9router config, binaries, and autostart entries are obsolete; delete them.
- A top-level `model` line is still required.

## Development

```bash
npm install
npm --prefix plugin test             # plugin suite (194 assertions across 10 files)
npm run test:coverage                # coverage hard floor
npm run lint
npm --prefix extensions/reeve run build
node extensions/reeve/scripts/audit.mjs --fixture   # 40 UI audit items
```

CI runs lint, plugin tests on Ubuntu 22/24 and Windows 24, coverage, the
extension build/byte-identical check, the UI audit, the config sample, and the
public-tree gate. Releases use npm Trusted Publishing (OIDC) and SLSA
provenance. See [CHANGELOG.md](CHANGELOG.md) for release notes.

Development records (`PLAN`, `HANDOFF`, `PROGRESS`, research notes) are kept in
the private development tree and are not part of the public repository. Public
references point only to files in this tree.

## Known limitations

- Free-model catalogs and rate limits change; availability is best-effort.
- Third-party relays can have quota/cache surprises; the default chains keep
  auditable official providers as the paid backstop.
- Image routing requires GATE to be enabled. PDF/video are not declared by the
  tiers; convert or extract text first.
- Review false-positive rate is not yet measured over a long window.

## License

REEVE is MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for the two
pieces of outside material (MIT ledger implementation; Apache-2.0 review rules).
No code or prompt literal from `oh-my-openagent` (SUL-1.0) is included.
