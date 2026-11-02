# opencode-mnemon

OpenCode plugin for **project-scoped automatic memory** on top of the [mnemon](https://github.com/dsh) CLI.

Conversation turns are captured at runtime, distilled (rules first, LLM as fallback), written back through `mnemon remember`, and injected again on the next `SessionStart` / idle turn. No per-user setup: memories land in `<cwd>/.mnemon/` when the project has one, and fall back to `~/.mnemon` when it does not.

## What it does

Two sides, sharing one mnemon store.

| Side | Trigger | Effect |
|---|---|---|
| **Write** | `session.text.ended` | Append the turn to a per-project runtime file, then after a 60s finalize window claim + extract + `mnemon remember` (async, BUSY backoff) |
| **Read** | `SessionStart` + tail sweep | Inject the most relevant memories into context |

Three layers, mirroring dsh-mnemon:

```
.mnemon/
  runtime/      per-session scratch (this plugin owns opencode-memories.json)
  data/         the mnemon store (sqlite graph)
  documents/    read-only: indexed for recall, never auto-written
```

## Hard invariants

These are load-bearing. Breaking them corrupts shared state.

- **Never write to `runtime/memories.json`.** That file is dsh-mnemon's own runtime memory with a different schema (`{content, created_at, target, importance}`). OpenCode uses `runtime/opencode-memories.json` (+ `.opencode-memories.lock`) instead. The 50-entry trim would otherwise delete dsh's entries.
- **Never write to `documents/`.** Index it, don't own it.
- **Claim leases, not permanent marks.** Claims write `claimedAt`; a claim older than 300s can be taken over. Permanent marks have stalled 11 entries before.
- **Rule extract first, LLM only as a fallback.** `extractMemory(entry) ?? (await llmExtractMemory(entry))`. LLM calls never enter the writer lock, time out at 25s (`unref`), and fail silently back to the rule result.
- **LLM entry point is `ctx.generate.text`, not a session.** `ctx.session.prompt` is not on the V2 `ctx`, and `generate.text` does not re-enter the session prompt hook, so there is no recursion. The `[mnemon-extract]` marker is kept as a textual backstop.

## Deployment model

One real file, symlinked into the OpenCode plugin slot — so editing the repo edits what OpenCode loads and nothing can drift.

```sh
npm run deploy            # ~/.config/opencode/plugins/mnemon.js -> ../opencode-mnemon/mnemon.js
npm run deploy -- --copy  # force a real copy instead
```

The deploy script never leaves the slot momentarily empty: the new link is created at a temp path and swapped in with `rename()`.

## Testing

```sh
npm test                          # rebuild the test copy, then run all three suites
npm run test:deploy               # same, but against $PWD/mnemon.js instead of the live deploy
```

Suites (132 checks total):

| File | Coverage |
|---|---|
| `tests/mnemon-extract-test.mjs` | Rule extraction: headlines, entities, categories, fence ratio, dedupe |
| `tests/mnemon-remember-e2e.mjs` | Real `mnemon remember --data-dir` round trip; global-root isolation |
| `tests/mnemon-llm-extract-test.mjs` | LLM switch matrix, model catalog resolution, prompt/parse, timeout, silent fallback |

Tests import `/tmp/mnemon-test-plugin.mjs`, a copy of the plugin with internals appended as exports. **Always run `tests/build-mnemon-test.sh` after editing** — otherwise you are testing a stale copy. The production file stays in its clean `{ id, setup, server }` shape.

`build-mnemon-test.sh` accepts the source path as `$1` or `$MNEMON_PLUGIN_PATH`; with neither, it uses the live deployment and falls back to the repo copy when no deployment exists (fresh clone, CI). Set `MNEMON_REQUIRE_DEPLOYMENT=1` to disable that fallback.

### Environment overrides

| Variable | Effect |
|----------|--------|
| `MNEMON_BIN` | Path to the `mnemon` CLI the e2e suite drives. Defaults to bare `mnemon` on `PATH`. |
| `MNEMON_TASK_DIR_OPTIONAL=1` | Allow `sync:docs:check` to skip when no Trellis task directory exists. Without it the check fails, since a comparison against nothing is not a pass. |
| `MNEMON_TEST_DST` | Where the exported test copy is written. Defaults to `/tmp/mnemon-test-plugin.mjs`. |

CI (`.github/workflows/test.yml`) installs `@mnemon-dev/mnemon` from npm — it is publicly published with per-platform binaries and needs no credentials — then runs the suite under a scratch `HOME` so the fallback assertions cannot touch a real memory root.

## Switches

| Switch | Scope | Timing |
|---|---|---|
| `<root>/opencode-llm-extract` | per-project | `touch` on, `rm` off, next sweep — no restart |
| `MNEMON_LLM_EXTRACT=1` | process | restart required |
| `MNEMON_LLM_EXTRACT=0` | process | master kill, overrides the flag file |
| `MNEMON_LLM_MODEL` | process | overrides the flag file's model content |
| `MNEMON_AUTOMEM=0` | process | write side off; **read side stays on** |
| `TRELLIS_HOOKS=0` / `TRELLIS_DISABLE_HOOKS=1` | process | master kill, **both sides stop** |

The flag file's non-empty content is treated as a model ID.

**Env switches are process-level.** Every plugin instance lives in the long-running OpenCode *server* process, so `TRELLIS_HOOKS=0 opencode run ...` does nothing — `opencode run` is a client and the env never reaches the server. Export it in the environment that starts the server. This also means env switches cannot be scoped per-project; use the flag file for that.

## LLM model resolution

Models are resolved against the live catalog, never hardcoded — a hardcoded provider that is not in `ctx.model.list()` fails every call.

- `pickModelRef(models, wanted)` searches `[configured, ...LLM_MODEL_CHAIN]` in order. Empty catalog → trust the config; nothing matches → `null` and a silent give-up.
- `LLM_MODEL_CHAIN = ["opencode-go/qwen3.8-flash", "opencode-go/deepseek-v4-flash", "opencode-gemini-3.5-flash-lite", "opencode-go/longcat-2.5-preview-free"]`
- `ctx.model.list()` returns `{ location, data }` — take `.data`.
- The model ref must be `{ id, modelID, providerID }` and **`id` must be the bare modelID**. Passing the full `provider/model` string gets re-joined into `provider/provider/model`. `{ id }` alone fails with `Missing key at ["model"]["providerID"]`; a bare string fails with `Expected Model.Ref | null`. Omitting `model` hits the free tier, which rejects out-of-OpenCode calls.

All of the above was found by probing, not reading docs.

## mnemon invocation

`mnemon` on PATH is an npm JS launcher; `SIGKILL`ing it leaves the native child orphaned. `mnemonCommand()` resolves the real native binary once and caches it: `realpathSync` detects `bin/mnemon.js` → reads `targets.json` for the platform/arch match → `createRequire` resolves the optional dep. On win32 it goes through the `.cmd` shim branch. Resolves to e.g. `.../@mnemon-dev/mnemon-darwin-x64/bin/mnemon`.

## Timing constants

| Constant | Value |
|---|---|
| `MIN_AGE_MS` / `FINALIZE_MS` | 60 000 |
| `BATCH` | 3 |
| `MIN_TOTAL_CHARS` | 24 |
| `SUBSTANTIVE_CHARS` | 60 |
| `MAX_FENCE_RATIO` | 0.7 |
| `ASSISTANT_CHARS` / `USER_CHARS` / `HEADLINE_CHARS` | 700 / 150 / 110 |
| `MAX_ENTITIES` / `MIN_IMP` | 8 / 3 |
| `BUSY_RETRY_MS` | 350 |
| `TAIL_DELAY_MS` | 75 000 |
| `CLAIM_LEASE_MS` | 300 000 |
| `MIN_RUNTIME_TEXT_CHARS` | 20 |
| `RUNTIME_RECENT_COUNT` | 5 |
| `LLM_TIMEOUT_MS` / `LLM_MAX_ENTITIES` | 25 000 / 6 |

`MIN_RUNTIME_TEXT_CHARS` drops short turns **silently** — a probe that replies `好` will look like a broken pipeline. It is not.

## Debugging

- Plugin log: `/tmp/trellis-plugin-debug.log`, grep `mnemon-auto` (append / remember / `llm extract ok|drop|skipped` / sweep / lease). Rotates at 8 MB to `.log.1` / `.log.2`, so an investigation can still read the previous generation after a rotation lands mid-diagnosis.
- Load log: `~/.local/share/opencode/log/opencode.log`, `loading plugin` / `failed to load plugin` — the raw counts are inflated; filter with `grep -av "spawning process"`

## Project conventions

- Config files (JSON, `.env`, `package.json`) use **tabs**, not spaces.
- This repo is the single source of truth. There is no per-project copy: `BalanceDeck/.opencode/plugins/mnemon.js` was deleted as a stale fork.

## Documentation

`docs/prd.md`, `docs/design.md`, `docs/implement.md` hold the requirements, technical design, and the 8-step execution record with verification evidence. The Trellis task directory at `~/project/others/.trellis/tasks/10-04-opencode-mnemon-auto-memory/` is the working copy; `docs/` is a one-way snapshot of it, kept in git because that task directory is not version controlled anywhere.

Edit the task documents, then sync:

```
npm run sync:docs          # copy prd/design/implement into docs/
npm run sync:docs:check    # report drift only; non-zero exit on drift
```

`npm test` runs the check, so a stale snapshot fails the suite. `docs/` is derived: never edit it directly, your changes will be overwritten on the next sync.

The script finds the task directory whether it is still active (`tasks/<slug>/`) or already archived (`tasks/archive/<YYYY-MM>/<slug>/`) — archiving moves it, and an archived task is still the source of record. Override with `MNEMON_TASK_DIR=...` or a positional path.

**If no task directory is found, the check fails rather than passing.** A check that cannot find its source has verified nothing, and exiting clean would read as protection while checking nothing. On a machine that genuinely has no Trellis task directory, opt out explicitly:

```
MNEMON_TASK_DIR_OPTIONAL=1 npm test
```

Not covered by the sync: `tests/`. Those are live code here, not a snapshot, so they are never written from the task directory. `build-mnemon-test.sh` intentionally differs from the archived copy — the repo version accepts `MNEMON_PLUGIN_PATH` and a path argument and validates the source exists, while the archived one hardcodes the live deployment path. The archived copy stays as it is: it is the frozen record of what that task produced, and rewriting it would misrepresent that.
