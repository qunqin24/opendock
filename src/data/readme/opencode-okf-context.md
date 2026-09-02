# opencode-okf-context

English | [简体中文](./README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-okf-context)](https://www.npmjs.com/package/opencode-okf-context) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An [OpenCode](https://opencode.ai) plugin that gives [OKF (Open Knowledge Format)](https://github.com/GoogleCloudPlatform/knowledge-catalog) knowledge bundles **progressive disclosure** and **use-and-unload** semantics — so an agent can read a whole knowledge base without permanently bloating its context window.

Inspired by [DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning): like DCP it rewrites message history only *on the way to the LLM* and never mutates the real session. But instead of LLM-summarized pruning, it exploits OKF's native structure (YAML `description`, `index.md`) for **deterministic, zero-extra-token** disclosure and unloading.

> **Not a memory plugin.** This is a **knowledge-access** plugin: it reads *author-curated* OKF bundles, cheaply querying a large knowledge base without permanently occupying context. It does **not** record conversations or auto-generate memories — for that, use a memory plugin (e.g. `echoes-vault-opencode`).

## How it works

```
L0 manifest (always in system prompt, ~hundreds of chars)
   bundle list + root index (titles + descriptions) + usage instructions
        │ okf_list
L1 index (on demand, small) ─────────────────────────────┐
   a bundle / sub-directory index (titles + descriptions, no full bodies)
        │ okf_read  /  okf_search
L2 full text (on demand, large, has a lifetime)
   the concept's full markdown enters context
        │ after N user turns (default 2)  ·  or  okf_unload
unload: full text → placeholder
   "[OKF] concept tables/customers unloaded — ~3.2k chars freed.
    Summary retained: customers [BigQuery Table] — Customer master table…
    Reload with okf_read(id: \"tables/customers\")."
```

Three mechanisms:

| mechanism | what happens |
|---|---|
| **deterministic unload** | a loaded concept's `okf_read` output becomes a compact placeholder (title + type + description) after enough turns, or on explicit `okf_unload`. No LLM call. |
| **deduplication** | the same concept read twice keeps only the latest full text; earlier reads collapse to a "deduplicated" placeholder. |
| **soft nudge** | when retained OKF content exceeds a threshold, a one-line reminder is anchored onto the last user message (never a new message). |

Protection: the `keepRecent` most recent reads and `protectedConcepts` globs are never auto-unloaded; explicit `okf_unload` always wins. All rewriting is outbound-only — the real history is never mutated.

## Tools

| tool | args | returns |
|---|---|---|
| `okf_list` | `bundle?`, `path?` | a bundle / sub-directory index (titles + descriptions only) |
| `okf_read` | `id` or `ids: [...]`, `bundle?` | the full concept markdown (one, or a batch loaded as a unit) + outgoing/incoming reference metadata + a footer reminding the model to unload when done |
| `okf_search` | `query`, `bundle?`, `maxResults?` | searches metadata first (title/description/tags), body only as a fallback; returns concise refs + a snippet, never full bodies |
| `okf_write` | `id`, `type?`, `title?`, `description?`, `tags?`, `body?`, `bundle?`, `mode?` | creates / updates / deletes a concept. `update` (default) changes only passed fields; `delete` removes the file, its `index.md` entry, and logs it |
| `okf_validate` | `id?` or `all: true`, `bundle?` | read-only validation report (concept-level; `all:true` adds bundle-level); each issue comes with a ready-to-run `okf_write(...)` fix command |
| `okf_unload` | `id?` or `all: true`, `bundle?` | marks concept(s) for immediate unload |
| `okf_refs` | `id`, `bundle?` | a concept's reference graph (who links to it + what it links to), metadata only — no body loaded. Use for impact analysis ("who depends on this table?") |

`okf_validate` checks each concept against OKF rules and emits a fix command per issue — it never writes files; run the `okf_write` commands it suggests:

```
✓ Validated 3 concept(s) in bundle "demo": 1 valid, 2 with issues (1 error, 3 warnings).

▶ tables/bad_type  (bundle: demo, 2 issues)
  ✗ [error] type: `type` is missing or empty. The OKF spec requires `type` …
    → fix: okf_write(id: "tables/bad_type", bundle: "demo", mode: "update", type: "<your type, …>")
```

Checks: frontmatter `type`/`title`/`description`/`tags` + body (concept-level); `okf_version`, `log.md`, and broken cross-links (bundle-level, via `all:true`). Malformed YAML in a concept no longer breaks discovery — it loads with empty frontmatter and surfaces as a `yaml-error`.

## Install

Published on [npm](https://www.npmjs.com/package/opencode-okf-context) as `opencode-okf-context`:

```bash
opencode plugin opencode-okf-context@latest --global
```

or add it to `~/.config/opencode/opencode.json`:

```json
{ "plugin": ["opencode-okf-context@latest"] }
```

Verify the 7 tools registered:

```bash
opencode debug agent build | grep okf   # -> okf_list/read/search/write/validate/unload/refs: true
```

> **Package name:** there's a separate community `opencode-okf` package for *authoring & validating* OKF bundles. This plugin (`opencode-okf-context`) is complementary — it handles *reading & context management*. Both install together without conflict.

## Configuration

Layered (deep-merged; later layers override earlier): `~/.config/opencode/okf.jsonc` → `$OPENCODE_CONFIG_DIR/okf.jsonc` → `<project>/.opencode/okf.jsonc` → plugin options in `opencode.json`. Full schema: [`okf.schema.json`](./okf.schema.json).

```jsonc
// .opencode/okf.jsonc
{
  "enabled": true,
  "scan":   { "enabled": true, "maxDepth": 4 },
  "bundles": [{ "path": "docs/knowledge", "name": "project-kb" }],
  "disclosure": { "injectManifest": true, "maxManifestChars": 2000 },
  "unload": {
    "afterTurns": 2,          // unload after 2 user turns
    "keepRecent": 1,          // never auto-unload the most recent read
    "placeholder": "description"
  },
  "nudge":   { "threshold": 6000, "frequency": 3, "force": "soft" },
  "write":   { "enabled": true, "updateIndex": true, "appendLog": true },
  "protectedConcepts": ["tables/*"],
  "debug": false
}
```

Auto-scan skips build/VCS directories (`node_modules`, `dist`, `.git`, …) and hidden directories — with one exception: **`.opencode` is scanned**, so bundles placed there (e.g. `.opencode/skill/`) are discovered automatically.

## Development

```bash
bun install
bun test            # 114 tests
bunx tsc --noEmit   # type-check
```

The repo dogfoods itself via `.opencode/plugin/okf.ts` (re-exports `src/index.ts`) — running `opencode` here loads the plugin from source and auto-discovers `fixtures/sample-bundle`. See [AGENTS.md](./AGENTS.md) for the full architecture map.

## Build & publish

```bash
bun run build       # tsup bundles JS (yaml bundled) + tsc emits d.ts
npm publish         # npm login first
```

`@opencode-ai/plugin` is a peerDependency provided by the opencode runtime, so the package has zero external runtime dependencies.

## Scope / non-goals (v1)

- No LLM-generated summaries (OKF's `description` is the deterministic summary); only soft nudge.
- Validation covers concept- and bundle-level checks; cross-link *repair* is out of scope (belongs with `opencode-okf`).

## License

MIT
