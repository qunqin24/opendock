# opencode-context-indicator

Real-time **context-window usage** indicator for [OpenCode](https://opencode.ai),
with a **per-category token breakdown** and an optional **terminal-UI sidebar**.

It tells you how full the current model's context window is, and *what* is
filling it: system prompt, tool schemas, user/assistant text, reasoning, tool
arguments and the residual "other" bucket.

The package ships a **dual V1 + V2 plugin** (one entry works in both OpenCode
generations) plus an optional TUI sidebar module exposed as the `./tui` entry.
The V2 path is **tested against opencode v2.0.19**; the V1 path against 1.18.29+.

![TUI sidebar — per-category context breakdown](docs/sidebar.png)

---

## What it shows

### Per-category breakdown

For every served request the plugin estimates how the context window is split:

```
[2026-…] session=ses_abc model=… ctx=45.2k/120k (38%) … input=44.1k
  user        4.2k (est tokens)
  assistant   3.1k (est tokens)
  reasoning   0.8k (est tokens) (exact 1.2k)
  tool args   0.3k (est tokens, input only)
  system      2.1k (est tokens)
  tool schemas 1.4k (est tokens)
  other       5.6k (= input - sum of estimates)
  source      context-hook
  subagents   2 session(s): in=8.1k out=2.3k r=1.0k worst=12%
```

* Token counts are **estimates** from a unicode-aware heuristic
  (Cyrillic ≈ 2.5, CJK ≈ 1.5, latin/ASCII ≈ 4 chars/token) — not a tokenizer.
  `reasoning` also carries the exact value reported by the model when present.
* `other` is the residual (`input − sum of estimates`).
* Tool **results** are deliberately not counted; only tool **call arguments**
  (results are not part of the sent prompt).
* `ctx` is OpenCode's native overflow count: `tokens.total` when present, else
  `input + output + cache.read + cache.write`. Percentages are **not clamped**
  at 100% — exceeding the window stays visible.

### Toast (V1 only)

On OpenCode 1.x, after each assistant message a throttled toast appears:

```
ctx 45.2k / 120k (38%) · r 1.2k · c 3.4k
```

`r` = reasoning tokens, `c` = cache-read tokens (both only when nonzero); cost
is appended only when the model config carries explicit pricing.

### TUI sidebar (V2, terminal only)

On the OpenCode 2.x terminal TUI the `./tui` entry renders a compact sidebar
panel with the same breakdown:

```
Context
gpt-4o · 45.2k / 120k (38%)
user           4.2k    9%
assistant      3.1k    7%
reasoning      0.8k    2%
tool args      0.3k    1%
system         2.1k    5%
tool schemas   1.4k    3%
other          5.6k   12%
updated 12:30:01
```

> Requires a `file://` install from a path outside `node_modules`; on the npm
> path the sidebar is auto-disabled. See
> [Live sidebar: npm vs file:// install](#live-sidebar-npm-vs-file-install).

### Slash commands (V2)

On OpenCode 2.x (Desktop **and** terminal TUI) the plugin registers two slash
commands:

| Command | Scope | Delivery | Agent turn? |
| --- | --- | --- | :---: |
| `/context` | **this session only** (no subagents); cache + `state.json` only | `resume:true` — the model echoes the 3-line summary into the transcript | yes |
| `/context-breakdown` | this session **+ all subagent descendants** | `resume:true` — the model echoes the table into the transcript | yes |

#### `/context` — quick summary (main session only)

A 3-line summary of the current session, built purely from the in-memory cache
and the `state.json` snapshot: **no subagent traversal and no live RPC**, so
collection is instant (delivery itself still runs an agent turn — see below).
The synthetic notice chip shows a self-contained one-liner (label =
`description`):

```
Context: 41.5k (25%) · your-model · 12:36
```

The payload is delivered with `resume:true` and a verbatim instruction prefix,
so the model's answer (a normal assistant message) carries the detail:

```
Reproduce the markdown table below exactly, verbatim, with no changes and no commentary:

**Context** — your-model · 41.5k / 168k (25%)
usr 2.3k · asst 285 · rsn 9.6k · tool 2.1k · sys 8.5k · schm 3.8k · oth 14.9k
updated 12:36:16 (snap)
```

The Desktop renders the model's answer in full; the notice chip only shows the
one-liner description.

#### `/context-breakdown` — full table (main + subagents)

The full markdown table for the current session **and every subagent (child)
session**:

```
### Context breakdown

| role | model | ctx | usr | asst | rsn | tool | sys | schm | oth | updated (src) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| main | gpt-4o | 45.2k (38%) | 4.2k | 3.1k | 0.8k | 0.3k | 2.1k | 1.4k | 5.6k | 12:30:01 live |
| sub:build | gpt-4o | 8.1k (7%) | 1.2k | 0.9k | 0.3k | 0.1k | 2.1k | 1.4k | 2.1k | 12:29:58 snap |

_1 subagent session(s). Tokens are estimates (unicode heuristic). usr=user,
asst=assistant, rsn=reasoning, tool=tool args, sys=system prompt, schm=tool
schemas, oth=residual input. src: live=context hook, snap=state.json,
fallback=session.context (no system/schemas → n/a), no-data=categories
unavailable._
```

It is delivered with `resume:true` **and** a verbatim instruction prefix, so the
agent's answer (a normal assistant message) carries the table and the Desktop
renders it in full:

```
Reproduce the markdown table below exactly, verbatim, with no changes and no commentary:

### Context breakdown
| … |
```

#### Delivery semantics (`resume`)

`ctx.session.synthetic({ sessionID, text, description, resume })` durably *admits*
the message to the session **inbox**; the `resume` flag only gates whether the
session is woken (opencode `Session.synthetic`:
`if (resume !== false) wake(session)`):

| `resume` | Effect |
| --- | --- |
| `false` | durable inbox notice; **no** LLM request; session context unchanged. A synthetic message is rendered as a compact **Notice chip** whose label is `description ?? text` (the client row-builder maps `synthetic` → Notice) — so the chip shows the description, **not** the table. |
| `true` | the same inbox item **plus** a wake → a real agent turn runs. The model sees the payload as input and its answer is a **normal assistant message**, rendered in full. |

Both commands now use `resume:true` and a verbatim instruction prefix. A
real agent turn runs and the model renders the payload as a normal assistant
message — the only way the content is visible in the Desktop (the chip only
shows `description`). `CONTEXT_BREAKDOWN_RESUME` controls `/context-breakdown`
back to a plain notice if needed.

> **E2E note (Desktop 2.0.19, local model `llama3.2:latest`, `build` agent).**
> `resume:true` behaved as designed: the synthetic item was drained into
> `/message` and a turn ran; the assistant message contained the table verbatim
> (the trailing `_…_` note line was dropped by the model). Because `resume:true`
> runs a **real agent turn with tools**, the model may additionally emit tool
> calls — in the E2E it attempted one stray `edit` (harmless: the path did not
> exist). Treat `/context-breakdown` as *"ask the agent to show the table"*, not
> as a pure UI action.

* **Both commands run an agent turn.** `/context` collects from the in-memory
  cache and `state.json` only (no RPC, no subagent traversal) and
  `/context-breakdown` collects the full tree, but both deliver with
  `resume:true` — so each issues a real LLM request and the session context
  grows by that turn.
* Subagents are discovered by walking the **parentID chain persisted in
  `state.json`** (breadth-first from the current session, every level — subagents
  of subagents included). `state.json` is the only source: each entry is keyed by
  its own `sessionID` and carries the `parentID` recorded when it was written, so
  the chain is root-consistent and entries of *other* sessions are unreachable.
  A `seen` set guards against cycles and double-listing. Subagents that already
  finished stay listed while their `state.json` entry exists.
* **Phantom sessions are hidden.** A session registered via `session.created`
  but with no served step (no tokens in any category, `ctx = 0`, `input = 0`) —
  e.g. an E2E/test registration or an agent ping without a turn — is skipped.
  Traversal still descends through such a node so real grandchildren behind it
  are found. The footer's `N subagent session(s)` counts only non-phantom rows.
* Collection is **parallel** (root + all descendants) under a single wall-clock
  deadline of 3.5 s, with each per-session live lookup capped at 3 s — so the
  command takes roughly the per-session cap (not the sum), rather than N × 3 s
  for N subagents. Per session the data is resolved as: live breakdown cache →
  `state.json` snapshot → a bounded `session.context()` fallback. A session left
  with no category data (no cache/snapshot and the fallback failed or ran out of
  budget) is tagged `no-data`; `ctx` / `model` / `updatedAt` still come from
  `state.json` / the live lookup, while its category cells stay `n/a`.
* **The denominator survives a transient model-registry miss.** If the serving
  instance's `ctx.model.list()` returns no usable limits (freshly loaded instance,
  provider not yet registered, malformed payload), the window is recovered from
  the `state.json` snapshot instead of degrading the `ctx` column to `?`; limits
  are also seeded from the snapshot at startup, and the retry backs off
  (30 s → 5 min, capped). A known `usable`/`limit`/`agent` is never overwritten
  with `null` when another instance rewrites the snapshot.
* Both commands append their payload to `context-breakdown.log` (final-summaries
  section), so it stays recoverable even if delivery fails.
* If `ctx.session.synthetic` throws, the command logs an actionable error and the
  payload is preserved in the log — there is no other delivery channel in this
  runtime (no `noReply`/`prompt` option exists).
* **The model may echo the instruction line.** Because delivery is an agent turn,
  the model can reproduce the verbatim instruction prefix
  (`Reproduce the markdown table below exactly…`) in its answer instead of
  echoing only the payload.
* **Deleted sessions can linger.** `session.deleted` clears the in-memory caches
  but not the `state.json` entry, so a deleted session that had already served a
  step (has tokens) is not filtered as a phantom and stays listed until its entry
  is evicted by the `state.json` LRU cap (`MAX_TRACKED_SESSIONS`) — it may
  momentarily appear in the table.

---

## Surface matrix

| Surface | Toast | TUI sidebar | Breakdown log file | Slash commands |
| --- | :---: | :---: | :---: | :---: |
| OpenCode **1.x** — Desktop | ✅ | — | ✅ | — |
| OpenCode **1.x** — TUI | ✅ | — | ✅ | — |
| OpenCode **2.x** — TUI | — | ✅ | ✅ | ✅ |
| OpenCode **2.x** — Desktop | — | — | ✅ | ✅ |

Notes — these reflect what the plugin API actually exposes today:

* **V2 has no toast channel on the server side.** The V2 plugin API
  (`ctx.*`) exposes no TUI/toast method (opencode issue `#49380`); the V2 path
  therefore delivers everything through the log file, the TUI sidebar and the
  `/context` / `/context-breakdown` slash commands. The sidebar is a TUI-process
  slot and does not exist in the Desktop app; the slash commands work in **both**.
  The TUI sidebar is **live only for a `file://` install** from a path outside
  `node_modules`; on the npm path it is auto-disabled (upstream `#33884`) — see
  [Live sidebar: npm vs file:// install](#live-sidebar-npm-vs-file-install).
* **V1 has no sidebar and no slash command.** The command/slot API (and the
  `./tui` entry) is a V2 feature; OpenCode 1.x has no equivalent, so V1 is
  toast + log only.
* The Desktop app is TUI-less; its V2 surfaces are the log file and the
  `/context` / `/context-breakdown` slash commands.

---

## Log / state file locations

All paths use the OS temp directory (`os.tmpdir()`), i.e. `%TEMP%` on Windows
and `$TMPDIR` (usually `/tmp`) elsewhere:

| File | Purpose |
| --- | --- |
| `context-breakdown.log` | Human-readable live snapshot + bounded final summaries |
| `opencode-context-indicator-state.json` | Machine-readable snapshot consumed by the TUI sidebar |
| `context-events.log` | Raw event tap — **only** when `DEBUG_EVENTS` is flipped to `true` in the source (off by default) |

The live `context-breakdown.log` snapshot is **rewritten** (never grows); final
summaries (on `session.idle`) and compaction notes are **appended** — log writes
use plain `appendFileSync`, not atomic replacement. Only the machine-readable
`opencode-context-indicator-state.json` is written **atomically** (temp file +
rename), so concurrent plugin instances cannot corrupt it. Cross-instance
duplicate final summaries are prevented separately by an atomic claim marker
(see `lib/dedup.js`).

---

## Installation

### OpenCode 2.x (V2)

Per the [OpenCode v2 plugin docs](https://opencode.ai/v2/docs/plugins), npm
plugins are listed under the `plugins` (plural) config key. Use the CLI:

```sh
opencode plugin add opencode-context-indicator
```

or add it to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-context-indicator"]
}
```

The `./tui` sidebar entry is loaded automatically alongside the main plugin in
the terminal TUI — but its live behaviour depends on the install method, see
[Live sidebar: npm vs file:// install](#live-sidebar-npm-vs-file-install) below.
For a CLI-only setup against remote servers, the package can also be listed in
[`cli.json`](https://opencode.ai/v2/docs/cli/plugins):

```json
{ "plugins": ["opencode-context-indicator"] }
```

### Live sidebar: npm vs file:// install

The TUI sidebar is a **TUI-process slot**. On OpenCode 2.x it behaves
differently depending on **how the plugin was installed** — an upstream OpenCode
limitation (`anomalyco/opencode#33884`), not a plugin bug: OpenCode's TUI loader
skips the host Solid transform for any path inside a `node_modules` directory, so
a slot mounted from an npm install renders once and then never live-updates.

| Install | Desktop | TUI commands | TUI live sidebar |
| --- | :---: | :---: | :---: |
| npm (`opencode plugin add opencode-context-indicator`) | ✅ | ✅ | ❌ auto-disabled (upstream #33884) |
| `file://` (path **outside** any `node_modules`) | ✅ | ✅ | ✅ live |

On the **npm** path the plugin detects that it lives under `node_modules` and
**disables the sidebar gracefully** — it logs a single hint and registers no
slot, so you never see a frozen "no data yet" panel. The `/context` /
`/context-breakdown` slash commands and the breakdown log file keep working on
every install.

#### Getting the live sidebar (`file://` install)

1. Put the package **outside** any `node_modules`: clone the repository, or
   unpack the npm tarball (`npm pack opencode-context-indicator`, then extract
   the `.tgz`) — e.g. into `C:\Users\you\plugins\opencode-context-indicator`.
   Double-check that the chosen path contains **no `node_modules` segment**
   (e.g. `C:\Users\you\plugins\...`, not `.../node_modules/...`).
2. Point OpenCode at that directory in `~/.config/opencode/opencode.jsonc`:

   ```jsonc
   {
     "plugins": ["file:///C:/Users/you/plugins/opencode-context-indicator"]
   }
   ```

3. Restart OpenCode. The sidebar is now live and updates as context grows.

> ⚠️ The `file://` path must **not** contain a `node_modules` segment. If it
> does, OpenCode skips the Solid transform and the sidebar will not update; the
> plugin auto-disables it and logs the hint above.

### OpenCode 1.x (V1)

Add the package name to the `plugin` array in your `opencode.json`:

```json
{
  "plugin": ["opencode-context-indicator"]
}
```

### Local file (no npm)

Copy `index.js` and `lib/dedup.js` into `~/.config/opencode/plugins/`, keeping
the `lib/` subdirectory next to the plugin file so the plugin's `import` of the
helper resolves. The `lib/` folder is support code, not a separate plugin entry:

```
~/.config/opencode/plugins/context-indicator.js
~/.config/opencode/plugins/lib/dedup.js
```

To use the sidebar locally as well, point OpenCode at a `file://` copy of the
package that lives **outside any `node_modules`** (see
[Live sidebar: npm vs file:// install](#live-sidebar-npm-vs-file-install)) — that
is the only install path that keeps the sidebar live. An npm install auto-disables
the sidebar instead.

---

## Requirements

* **Node.js ≥ 18** (the main plugin uses only Node built-ins). `@opencode/plugin`
  is an **optional** peer dependency: OpenCode resolves it at runtime, and
  `index.js` itself does not import it (the V2 `define` helper is inlined).
* **OpenCode ≥ 1.18.29** for the V1 path. ⚠️ The V1 path relies on
  `experimental.chat.*` hooks, which are **experimental** and may change or stop
  firing in future OpenCode 1.x releases; if they do, the indicator degrades
  gracefully (the breakdown falls back to throttled `session.messages` fetches
  and toasts keep working).
* **OpenCode ≥ 2.0.16** for the V2 path (built and verified against
  **2.0.19**).
* **TUI sidebar**: terminal TUI only, requires the OpenTUI rendering stack that
  ships with OpenCode. `@opentui/core` and `solid-js` are **optional** peer
  dependencies resolved by OpenCode at runtime; the main plugin installs and runs
  fine without them (the sidebar simply is not available). `@opentui/solid` is
  instead shipped as a **pinned direct dependency** (exact `0.5.12`): OpenCode's
  TUI loader does not expose a host instance of it, so for npm-installed plugins
  the JSX pragma would otherwise fail to resolve `@opentui/solid/jsx-runtime`
  (upstream: opencode issue #33884 — `node_modules` plugins are excluded from the
  host Solid transform and get an isolated OpenTUI copy). Because of that same
  upstream limitation, on the **npm** path the sidebar is **auto-disabled**
  (the plugin logs one hint and registers no slot) — use a `file://` install for
  the live sidebar, see [Live sidebar: npm vs file:// install](#live-sidebar-npm-vs-file-install).

---

## Configuration

There are **no user-facing plugin options**. The plugin reads the merged
OpenCode configuration only to *harvest* each model's context limits and
explicit pricing (the `config` hook on the V1 path; the model registry on the
V2 path). It does not register configurable keys of its own.

---

## How it works

The package default export is a dual plugin:

* `setup(ctx)` — V2 entry (OpenCode ≥ 2.0.16). Registers a `session.hook("context", …)`
  to capture the final messages / system prompt / tool schemas right before each
  model request, subscribes to the event stream (`session.created`,
  `session.step.ended`, `session.idle`, `session.compacted`, failure events),
  records limits from the model registry and registers the
  `/context` + `/context-breakdown` slash commands (via
  `ctx.command.transform`). Read-only: the context is never mutated (the
  commands wake the session via `resume:true`, which is what renders the table).
* `server({ client })` — V1 entry (OpenCode ≥ 1.18.29). Classic event handler +
  experimental transform hooks + toasts.

Both paths write the same breakdown log; the V2 path additionally feeds the
sidebar through `opencode-context-indicator-state.json`. Cross-instance
duplicate final summaries are suppressed with an atomic claim marker
(`lib/dedup.js`). Every file / estimate / subagent path is fault-tolerant: a
failure is logged and never breaks the main event or toast path.

This plugin does not touch `opencode-token-monitor`
(`token_stats` / `token_history` / `token_export` keep working unchanged).

---

## Screenshots

<!-- TODO: add screenshots -->

_(to be added)_

---

## Contributing

Issues and pull requests are welcome. Please keep changes minimal and
fault-tolerant: any code on the event / hook path must never throw into the
caller.

---

## Development / Testing

### Running tests

```bash
npm run test:prepublish       # fast gate: tarball + tui.tsx + resolve + T1–T12 unit
npm run test:e2e              # full E2E: isolated plugin load + one "Say OK" round-trip
npm run test:e2e:quick        # E2E load-only, no LLM call
```

`prepublishOnly` runs **both** gates automatically on `npm publish`
(`node test/prepublish.mjs && node test/e2e-tui.mjs --full`) and is skipped with
`--ignore-scripts`. The whole chain takes roughly **1 minute** (fast gate ~20 s,
isolated E2E ~10 s warm / up to ~90 s cold); the E2E is bounded by INIT 45 s +
STEP 80 s, ~3 min total.

### What the gates check

**Fast gate — `test/prepublish.mjs`**

| Step | What | Why |
|---|---|---|
| (a) tarball composition | `package.json` `files[]` field expands to exactly 6 members | no test/node_modules/tsconfig in the tarball |
| (b) pragma regression | esbuild `--jsx=automatic` → `@opentui/solid/jsx-runtime` present, `react/jsx-runtime` absent | a removed/broken pragma kills the sidebar on npm install |
| (c) resolve chain | replica install → `import.meta.resolve` for all tui.tsx imports | broken peer/optional dep silently breaks the sidebar |
| (d) unit harness T1–T12 | all limit/agent/state fix assertions | regressions in modelLimits, writeStateFile, hydrate |

**Isolated E2E — `test/e2e-tui.mjs`** (requires the OpenCode CLI)

| Check | What | Why |
|---|---|---|
| A — plugin load | spins a private `opencode --standalone` PTY, asserts `msg="loading plugin" → opencode-context-indicator` and that the `file:///` entrypoint is **this checkout** | catches a plugin that no longer imports cleanly, or a config pointing at the published npm copy |
| B — live update | one `opencode run "Say OK" --standalone` round-trip; asserts the LLM answered **and** the isolated `state.json` gained a session with `ctx > 0` | catches a regression in the `session.idle` → `writeStateFile` path |

The E2E is fully **non-invasive** to your running OpenCode Desktop:

- `--standalone` starts a *private* server instead of the background service Desktop uses;
- `OPENCODE_DB` points at a throwaway DB in `%TEMP%` (your sessions are untouched);
- `OPENCODE_CONTEXT_INDICATOR_STATE_FILE` points at a throwaway state file in `%TEMP%`
  — the live `opencode-context-indicator-state.json` is never read or written;
- `OPENCODE_DISABLE_PROJECT_CONFIG=1` avoids project-level config;
- exactly **one** minimal LLM call (`Say OK`) is made, in the isolated session.

The script prints `[e2e] running against ISOLATED opencode instance — your running
sessions are not touched` at start and reports the Desktop service/GUI PIDs before
and after the run. Override the binary with `OPENCODE_CLI`. The full run needs a
model for the one round-trip: set `OPENCODE_E2E_MODEL` to *your* `provider/model`
id (e.g. `OPENCODE_E2E_MODEL=myprovider/some-model`); it is **required** in full
mode and the script exits with an instruction if it is unset. `--quick` needs no
model.

### CI

`.github/workflows/ci.yml` runs `test/prepublish.mjs` on every push/PR and additionally
does a standalone esbuild transpile check (pragmas, no React). The Node-pty E2E is not
run in CI (requires the OpenCode Desktop binary) and is skipped gracefully when the CLI
is absent (`[SKIP] opencode CLI not found`).

---

## License

[MIT](./LICENSE)
