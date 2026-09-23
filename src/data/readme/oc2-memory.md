# oc2-memory

**A memory plugin for [OpenCode](https://opencode.ai)** — durable facts, a daily log, and a scratchpad, all as plain markdown, with optional semantic search powered by [qmd](https://github.com/tobi/qmd).

Your coding agent forgets everything between sessions. oc2-memory gives it a memory: durable facts and decisions, a running daily log, and a scratchpad of things to come back to — all as plain markdown files you can read, edit, and commit. With optional [qmd](https://github.com/tobi/qmd) it also gets keyword, semantic, and hybrid **search** across everything it has ever remembered.

## This is a port

oc2-memory is a port of **[pi-memory](https://github.com/jayzeng/pi-memory)** — the memory extension for the [pi](https://github.com/earendil-works/pi) coding agent — onto the **OpenCode V2 plugin platform**.

The design is carried over deliberately and largely unchanged: the same markdown store, the same seven tools, the same KV-cache-stable snapshot. What changes is the platform underneath — pi's hook API is replaced by OpenCode's plugin SDK (`@opencode/plugin`), and the storage path is chosen so that an existing pi installation keeps working.

**Port status: released.** `oc2-memory@0.1.1` is on npm — the seven tools, their JSON-Schema inputs, and the byte-stable snapshot all run on `@opencode/plugin` with no dependency on pi. Install it with `npx oc2-memory install` (see [Installation](#installation)).

## Installation

The package is on npm — the installer CLI is the simplest path:

```bash
npx oc2-memory install     # adds "oc2-memory" to your global OpenCode config
npx oc2-memory status      # config entry + memory path + qmd / collection / embeddings
npx oc2-memory uninstall   # removes the entry (leaves OpenCode's npm cache alone)
```

`install` adds the package spec to the **`plugins`** array of your global OpenCode config (`~/.config/opencode/opencode.json`) and lets OpenCode fetch it into its own cache under `~/.cache/opencode/`. The write is atomic and `0600`, and a config file that fails to parse is never overwritten. `opencode plugin add oc2-memory` does the same thing if you prefer the host CLI.

That's it — the seven core tools (`memory_write`, `memory_forget`, `memory_restore`, `memory_read`, `scratchpad`, `memory_search`, `memory_status`) work with no other setup.

### Optional: enable search with qmd

`memory_search` gets much better with [qmd](https://github.com/tobi/qmd). Either install method works:

```bash
npm install -g @tobilu/qmd                      # no Bun required
bun install -g https://github.com/tobi/qmd      # ensure ~/.bun/bin is on PATH
```

When qmd is present, the plugin **automatically creates** the `pi-memory` collection over the memory directory on the next session start — no manual step. Run `memory_status` any time to confirm qmd, the collection, and embeddings are ready.

**Without qmd, nothing breaks.** Search falls back to plain keyword matching across the markdown files, which is what a fresh installation uses. Semantic and deep modes need vector embeddings; the plugin keeps them current in the background (`qmd embed` runs at session start and after writes), and the very first embed downloads a model, so semantic search may take a minute to come online. To set the collection up by hand:

```bash
qmd collection add ~/.pi/agent/memory --name pi-memory
qmd context add /daily "Daily append-only work logs organized by date" -c pi-memory
qmd context add / "Curated long-term memory: decisions, preferences, facts, lessons" -c pi-memory
qmd embed
```

## Tools

| Tool | Description |
|------|-------------|
| `memory_write` | Write to MEMORY.md (long-term) or the daily log |
| `memory_forget` | Delete matching entries and create a durable recovery record |
| `memory_restore` | Restore a deletion using the recovery ID returned by `memory_forget` |
| `memory_read` | Read any memory file, or list the daily logs |
| `scratchpad` | Add / done / undo / clear / list checklist items |
| `memory_search` | Search across all memory files (qmd-backed when available, keyword fallback otherwise) |
| `memory_status` | Health check: where files live, qmd / collection / embeddings, active config |

### memory_search modes

| Mode | Speed | Method | Best for |
|------|-------|--------|----------|
| `keyword` | ~30ms | BM25 | Specific terms, dates, names, `#tags`, `[[links]]` |
| `semantic` | ~2s | Vector search | Related concepts, different wording |
| `deep` | ~10s | Hybrid + reranking | When the other modes miss |

If the first search doesn't find what you need, try rephrasing or switching modes.

## File layout

```
~/.pi/agent/memory/          # falls back to ~/.oc2-memory/ — see below
  MEMORY.md                  # Curated long-term memory
  SCRATCHPAD.md              # Checklist of things to fix/remember
  daily/
    2026-02-15.md            # Daily append-only log
    2026-02-14.md
    ...
  recovery/
    <recovery-id>.json       # Complete payload and restore state for a memory_forget deletion
```

**Where the files live.** The plugin uses `~/.pi/agent/memory/` when that directory exists, so it shares memory with an existing pi installation rather than starting empty. Only if the base directory is absent does it create and use `~/.oc2-memory/`. The check is on the base directory alone and runs once per session; an empty `~/.pi/agent/memory/` still counts as pi storage. `PI_MEMORY_DIR` overrides both.

## How it works

### One snapshot per session, kept byte-identical

Memory reaches the model as a single block injected into the system prompt. The block is built once and then held **byte-for-byte identical** for the rest of the session.

Local prefix-caching runtimes (llama.cpp, vLLM, MLX) invalidate their cache from the first divergent token onward. If the injected block changed turn to turn, every subsequent user / assistant / tool token would be reprocessed — effectively the whole conversation, every turn. Emitting the same bytes avoids that.

The block contains, in priority order:

1. **Open scratchpad items** (up to 2K chars)
2. **Today's daily log** (up to 3K chars, tail)
3. **MEMORY.md** (up to 4K chars, middle-truncated)
4. **Yesterday's daily log** (up to 3K chars, tail — lowest priority, trimmed first)

Total injection is capped at 16K chars. The block is rebuilt only on a deliberate trigger:

- **Session start** — a fresh snapshot per session.
- **Deletions and restores** — these are rare, authority-changing operations: forgotten content must leave the prompt immediately. `memory_forget` and `memory_restore` mark *every* live session's snapshot dirty, so a sibling session cannot keep serving a fact you just deleted.
- **Day rollover** — today's log becomes yesterday's.

`memory_write` with `target: daily` and `scratchpad` writes do **not** invalidate the snapshot. They are high-frequency, and the written content is already echoed in the tool call; re-rendering would rewrite the tail of the system prompt and void the prefix cache for the whole conversation, which is the exact cost the snapshot exists to avoid. The model can always call `memory_read` or `memory_search` for the authoritative latest state.

### Tags and links

Use `#tags` and `[[wiki-links]]` in memory content to improve searchability:

```markdown
#decision [[database-choice]] Chose PostgreSQL for all backend services.
#preference [[editor]] User prefers Neovim with LazyVim config.
#lesson [[api-versioning]] URL prefix versioning (/v1/) avoids CDN cache issues.
```

These are content conventions, not enforced metadata. Full-text indexing makes them searchable for free.

### Session handoff

When the context window compacts, the plugin captures a handoff entry into today's daily log and asks the summariser to preserve it:

```markdown
<!-- HANDOFF 2026-02-15 14:30:00 [a1b2c3d4] -->
## Session Handoff
**Open scratchpad items:**
- [ ] Fix auth bug
- [ ] Review PR #42
**Recent daily log context:**
...last 15 lines of today's log...
```

In-progress context therefore survives compaction, and — because it is written to the file rather than only into the summary — it is still there in the next session and reachable through `memory_read` / `memory_search`. Writing the handoff does not invalidate the running session's snapshot.

### Other behavior

- **Persistence**: memory files are plain markdown on disk — readable, editable, and git-friendly.
- **Recoverable deletion**: `memory_forget` stores complete deleted entries under `recovery/` before changing memory, and returns an ID that `memory_restore` can use. Recovery JSON is outside qmd's `**/*.md` index.
- **Tool response previews**: write and scratchpad tools return size-capped previews instead of full file contents.
- **qmd auto-setup**: on session start with qmd available, the collection and path contexts are created automatically.
- **qmd re-indexing**: after every write, a debounced `qmd update` runs in the background (fire-and-forget, non-blocking) unless disabled via `PI_MEMORY_QMD_UPDATE`.
- **qmd embeddings**: vectors for semantic/deep search are kept current automatically — `qmd embed` (incremental) runs after each re-index and as a catch-up at session start. Disabled together with re-indexing.
- **Concurrent sessions**: sessions share one markdown store, and two sessions can safely write at the same time — not through a queue, but because every disk mutation is synchronous (`fs.writeFileSync`, never `appendFileSync`) with no `await` between reading and writing, so each read-modify-write is atomic within the server process. The one remaining, untested risk is a *second OpenCode server process* pointed at the same memory directory.
- **Graceful degradation**: without qmd, the core tools work fully.

### Configuration

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `PI_MEMORY_DIR` | path | `~/.pi/agent/memory` | Override the memory storage directory (checked first, before the base-directory fallback) |
| `PI_MEMORY_QMD_UPDATE` | `background`, `manual`, `off` | `background` | Controls automatic `qmd update` + `qmd embed` after writes |
| `PI_MEMORY_QMD_SEARCH_TIMEOUT_MS` | positive integer (milliseconds) | `60000` | Timeout for explicit `memory_search` qmd queries |
| `PI_MEMORY_EMBED_PROBE_TIMEOUT_MS` | positive integer (milliseconds) | `15000` | Timeout for the `memory_status` embeddings readiness probe. Raise it on slower machines if the probe reports `unknown` |

The environment-variable name keeps the `PI_` prefix on purpose: the same variable configures a pi installation and an OpenCode one over the same memory files.

**Not carried over.** pi-memory's `PI_MEMORY_SNAPSHOT` (`refresh` / `per-turn`), `PI_MEMORY_NO_SEARCH`, and the `PI_MEMORY_EXIT_SUMMARY*` group are not read by this port: the snapshot is always byte-stable for the session and search is always on demand, so these variables have no effect here — see the non-goals below.

## Troubleshooting

Run `memory_status` first — it reports most of these at a glance, including the storage path and the active configuration.

| Symptom | Cause | Fix |
|---------|-------|-----|
| `memory_search` says qmd is required | qmd not installed or not on `PATH` | Install qmd (`npm install -g @tobilu/qmd`); if installed via Bun, ensure `~/.bun/bin` is on `PATH` |
| Search returns nothing for terms you know exist | Index is stale | A background `qmd update` runs after writes; if disabled (`PI_MEMORY_QMD_UPDATE=off`), run `qmd update` manually |
| “need embeddings” on semantic/deep search | Vectors not built yet | Embedding starts automatically in the background — retry shortly. If `PI_MEMORY_QMD_UPDATE` is `manual`/`off`, run `qmd embed` yourself |
| Collection `pi-memory` missing | Auto-setup didn't run (qmd installed mid-session) | Run any `memory_search` (which creates it) or `qmd collection add ~/.pi/agent/memory --name pi-memory` |
| qmd works in the shell but not from OpenCode on Windows | Broken `.cmd`/`.ps1` shims | The plugin bypasses them by invoking qmd's JS entry with `node`; make sure the npm global `node_modules` dir is on `PATH` |
| Memory isn't injected after a write | The snapshot is taken once per session and deliberately not re-rendered | The write is visible in the tool call; use `memory_read` / `memory_search` for the current state. This is by design, not a bug |
| Memory is empty despite using pi | Neither `~/.pi/agent/memory/` nor `~/.oc2-memory/` holds anything | Check the path `memory_status` reports — this is expected on a machine that never ran pi or oc2-memory |

## Non-goals

Deliberately **not** ported from pi-memory:

- **`per-turn` mode** and its automatic per-prompt search injection. The model gets the same capability by calling `memory_search` on demand, without giving up the prefix cache on every turn.
- **Exit summary** on quit, and the Ctrl+D detection behind it. OpenCode's server plugin API exposes no quit/shutdown event, and the model already writes explicitly via `memory_write`.
- **A separate TUI plugin and toast notifications.** The server-side plugin context offers no toast or log channel; startup is reported through `console.warn` and the diagnostics live in `memory_status`.
- **Support for OpenCode 1.x.** Only the V2 plugin API is targeted.

## Development

The plugin is `index.ts`, built with `tsup` to `dist/index.js`. The installer CLI is a second entry point, `bin/cli.ts`, built to `dist/cli.js` by a separate `tsup` run so the plugin bundle stays standalone. OpenCode resolves a plugin's entrypoints as module paths, so there is a build step.

### Working documents

`DECISIONS.md` records every settled technical decision behind the port, and `PLAN.md` holds the phase plan with its gates. Both are written in **German** — the language they were drafted in — while the rest of the repository is English. `AGENTS.md` points at them, and where they disagree with it about the port's target behaviour, they win.

```bash
npm install          # also points git at .githooks
npm run build        # tsup → dist/index.js + dist/cli.js, then tsc --noEmit
npm run lint         # biome
```

To run a local build, register the built directory — the easiest way is the CLI itself, which builds if needed and writes the config:

```bash
npx oc2-memory install --local /absolute/path/to/oc2-memory
```

Equivalently, add the **built directory** to the `plugins` array of `~/.config/opencode/opencode.json` by hand — `opencode plugin add` refuses local paths, so this is a config edit:

```json
{ "plugins": ["/absolute/path/to/oc2-memory/dist"] }
```

The path must be a **directory**; a bare file is ignored with a warning. Inside it OpenCode looks for `server.*` then `index.*` and does not consult `package.json`, so point it at `dist/` and never at the repository root — the root `index.ts` is the source file, not the built entrypoint. Alternatively, copy the built `dist/index.js` into `~/.config/opencode/plugins/`, which OpenCode scans for `.js` and `.ts` files.

```bash
npm test             # fast unit suite: no API key, no qmd
npm run test:e2e     # end-to-end: real agent, needs an API key
npm run test:eval    # recall effectiveness A/B: agent + API key + qmd

# Pin provider/model for cheaper eval runs
PI_E2E_PROVIDER=openai PI_E2E_MODEL=gpt-4o-mini npm run test:eval

# Multiple runs for statistical robustness
EVAL_RUNS=3 npm run test:eval
```

All tests back up and restore existing memory files.

### Test levels

| Level | Command | Requirements | What it tests |
|-------|---------|-------------|---------------|
| Unit | `npm test` (`test/unit.test.ts`) | Bun | Context builder, truncation, handoff, scratchpad parsing, qmd plumbing |
| E2E | `npm run test:e2e` (`test/e2e.ts`) | OpenCode + API key | Tool registration, write/recall, scratchpad lifecycle, search |
| Eval | `npm run test:eval` (`test/eval-recall.ts`) | OpenCode + API key + qmd | Recall accuracy |

### A note on the OpenCode plugin API

OpenCode 2.x ships **two** plugin APIs side by side: the legacy one (`@opencode-ai/plugin`, flat hooks such as `experimental.chat.system.transform`) and the V2 one (`@opencode/plugin`, `define({ id, setup })` with imperative hooks such as `ctx.session.hook("context", …)`). This plugin targets **V2 only**.

The public documentation at `opencode.ai/docs` still describes the legacy API and the legacy `plugin` config key, so treat it as stale; the installed `@opencode/plugin` type declarations are the accurate reference.

## Publishing (maintainers)

Releases are tag-driven. Pushing a `v*` tag runs the publish workflow, which lints, builds, runs the unit tests, verifies the tag matches `package.json`, and then publishes to npm.

Publishing uses **trusted publishing** (OIDC): no `NPM_TOKEN` secret is needed, and npm generates the provenance automatically. The workflow declares `permissions: id-token: write` for that. Releases are therefore restricted to the GitHub Actions workflow — the tokenless path is the only one configured.

```bash
npm version patch   # or minor / major — updates package.json
git push --follow-tags
```

## Authors

- **Marc Kerkmann ([swapdte](https://github.com/swapdte))** — port to the OpenCode V2 plugin platform
- **Jay Zeng ([jayzeng](https://github.com/jayzeng))** — original [pi-memory](https://github.com/jayzeng/pi-memory), from which the design, the tool set, and the markdown store are carried over

Thanks to https://github.com/skyfallsin/pi-mem for the original inspiration.

## License

[MIT](LICENSE) — both copyrights are retained, as above.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
