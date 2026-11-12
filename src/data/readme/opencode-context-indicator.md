# opencode-context-indicator

Real-time **context-window usage** for [OpenCode](https://opencode.ai): a
per-category token breakdown of what fills the window (system prompt, tool
schemas, user/assistant text, reasoning, tool arguments, tool results and the
residual "other" bucket). Release notes: [CHANGELOG.md](./CHANGELOG.md).

The package ships a **dual V1 + V2 plugin**, an optional TUI module (`./tui`:
live sidebar, composer capsule, zero-LLM `/cx` panel with measured contributors
and redacted export) and an **experimental Desktop GUI part**
(`./gui-experimental`: side-panel tab + composer pill). V2 is tested against
**opencode 2.2.7 / OpenTUI 0.8.1** (the e2e also passes on the 2.2.0-2.2.5
Desktop CLI); V1 against 1.18.29+. **V1 is feature-frozen** (bug fixes only).

![TUI sidebar — per-category context breakdown](docs/sidebar.png)

---

## What it shows

### Per-category breakdown

For every served request the plugin estimates how the context window is split:

```
[2026-…] session=ses_abc model=… ctx=45.2k/120.0k (37.7%) count=45.2k usable=… limit=… maxOutput=… reserved=… input=44.1k
  user        4.2k (est tokens)
  assistant   3.1k (est tokens)
  reasoning   0.8k (est tokens) (exact 1.2k)
  tool args   0.3k (est tokens, input only)
  tool results 26.6k (est tokens, outputs fed back)
  system      2.1k (est tokens)
  tool schemas 1.4k (est tokens)
  other       5.6k (= input - sum of estimates)
  source      context-hook
  prompt cache read=12.0k write=1.1k (provider-reported; subset of input)
  reclaim     ~9.8k redundant tool output (3 duplicate(s) — estimate)
  subagents   2 session(s): in=8.1k out=2.3k r=1.0k worst=12%
```

* Token counts are **estimates** from a unicode-aware heuristic
  (Cyrillic ≈ 2.5, CJK ≈ 1.5, latin/ASCII ≈ 4 chars/token) — not a tokenizer.
  `reasoning` also carries the exact value reported by the model when present.
* `other` is the residual (`input − sum of estimates`): images/media and unknown
  part types. `ctx` is OpenCode's native overflow count: `tokens.total` when
  present, else `input + output + cache.read + cache.write`. Percentages are
  **not clamped** at 100% — exceeding the window stays visible.
* `toolOut` names the former blind spot: **tool results** fed back into the
  context (webfetch pages, file reads, subagent reports). `/cx` splits it **by
  tool name** and its *largest contributors* section attributes it **per call**;
  the Desktop panel shows the total only.
* `prompt cache` is **provider-reported and exact** (`tokens.cache.read` /
  `.write`); it is a *subset* of input, so it is deliberately **not** added to the
  category sum (a cache read means the provider served those tokens from its
  cache, not that they left the window). `n/a` when the provider reports nothing.
* `subagents` (V1 free-text log) rolls up the **whole descendant tree**: BFS, at
  most **3 levels** and **64 sessions** (counted at discovery, so a deep fan-out
  cannot slip past the cap), a visited set for cycles, a failing child isolated,
  and message lists fetched in waves of **4**. The `worst=` figure is the highest
  per-child share of that child's own window; a hit bound or a failed `children`
  call is reported (`depths=`, `truncated=`), so a partial rollup is never
  mistaken for a complete one.
* `reclaim` is the **waste detector**: tool output already in the context that is
  redundant - the **same target** called repeatedly (same file read twice, same
  URL fetched again) or **byte-identical output**. It estimates what trimming
  could reclaim (the non-largest member of each duplicate group) and says
  *"N redundant tool outputs ≈ X tokens"* - never "the model wasted effort".
  Findings are per-session and **path-free** in the persisted/exported form.
* The denominator is the **opencode 2.x compaction ceiling**: `window =
  min(input, context)` (or whichever exists), `reserve = max(15% of the window,
  16k)` once the window reaches 32k, ceiling = `window - reserve`. A
  `compaction.buffer` set in opencode itself is honoured (project over global),
  and `OPENCODE_CONTEXT_INDICATOR_COMPACT_BUFFER` overrides it for tests.
  `node test/drift-watch.mjs` parses the released host and fails when the
  formula changes. Exact rationale (#51271, the released 0.15 vs the PR's 10%,
  the multi-project caveat) - [docs/internals.md](docs/internals.md#compaction-ceiling).

### Toast (V1 only)

On OpenCode 1.x, after each assistant message a throttled toast appears:

```
ctx 45.2k / 120.0k (38%) · r 1.2k · c 3.4k
```

`r` = reasoning tokens, `c` = cache-read tokens (both only when nonzero); cost
is appended only when the model config carries explicit pricing.

### TUI sidebar (V2, terminal only)

On the OpenCode 2.x terminal TUI the `./tui` entry renders a compact sidebar
panel with the same breakdown:

```
Context
gpt-4o · 45.2k / 120.0k (38%)
user           4.2k    9%
assistant      3.1k    7%
reasoning      0.8k    2%
tool args      0.3k    1%
tool out      26.6k   59%
system         2.1k    5%
tool schemas   1.4k    3%
other          5.6k   12%
updated 12:30:01
```

Open it with `session.sidebar.toggle` (default `<leader>b`: `Ctrl+X`, then `B`;
remappable through `keybinds`). The plugin **appends** its rows to the host's
sidebar content, so the block can sit below the host's own rows - scroll if it
is not visible. This is the only surface that lists the eight categories; `/cx`
shows the family, cost and contributors instead. Live on **every** install path,
npm included - see [Live sidebar](#live-sidebar).

### TUI composer capsule (V2, terminal only)

The `./tui` entry also fills the `prompt.footer.status` slot, so the same
percentage stays on screen **inside the composer** - no sidebar, no `/cx`:

```
38% ctx
```

It is the terminal counterpart of the Desktop composer pill: neutral below
65 %, amber from 65 %, red from 85 % of the usable window. With `showDetails` on
it also prints the raw numbers (`38% ctx 45.2k/120.0k`), and it is hidden in
shell mode (`!` prompt), where the number would describe the previous exchange.
A host without the slot (older 2.0.x) renders no capsule; the rest is unaffected.

### Slash command (V2)

On OpenCode 2.x (Desktop **and** terminal TUI) the plugin registers one slash
command:

| Command | Scope | Delivery | Agent turn? |
| --- | --- | --- | :---: |
| `/context-diff` | **this session only**; previous measurement vs current | `resume:true` - the model echoes the delta table into the transcript | yes |

The full breakdown is **not** a command any more (1.9.0 removed `/context` and
`/context-breakdown`): the terminal TUI renders the eight categories in the
sidebar and the family/cost/contributor view in the `/cx` panel, and the Desktop
renders the categories plus the per-subagent rollup in its own panel tab — all
from the same `state.json` snapshot, **without an LLM call**. Anything that
scripted the removed commands should read
`opencode-context-indicator-state.json` instead.

#### Removed in 1.9.0: `/context` and `/context-breakdown` (deprecated)

> Neither command exists since 1.9.0; the last releases that register them are
> `1.8.x` (`npm install opencode-context-indicator@1.8`, or pin
> `opencode-context-indicator@1.8.4`). They were removed because each spent a
> real agent turn making the model echo numbers the plugin already had. The
> 1.9.0 entry in [CHANGELOG.md](./CHANGELOG.md) lists the old behaviour and the
> replacement for each surface.

#### `/context-diff` — what changed since the previous measurement

`state.json` keeps one `previous` measurement per session: the record that was
**replaced** by the most recent distinct write. `/context-diff` compares it with
the current one and renders only the rows that actually moved:

```
**Context diff** — your-model
total 41.5k -> 45.2k (+3.7k tokens, +9%)

| category | previous | now | delta |
| --- | --- | --- | --- |
| toolOut | 24.7k | 28.4k | +3.7k |

_previous 12:36:16 · current 12:40:11 · tokens are estimates._
```

Collection is instant (cache + `state.json`, no subagent traversal, no RPC) and
delivery uses `resume:true` + a `<context-diff>` tag (see below). An unchanged
(mirror / repeated) write does **not** shift `previous`, so the diff always spans
two different observations. A session with only one measurement reports
`No previous measurement yet`.

Category cells are model-dependent, so when the model changed between the two
observations the command prints the `model A -> B` line and the window change
only, with a note that the categories are not comparable across models.

#### Delivery semantics (`resume`)

`ctx.session.synthetic({ sessionID, text, description, resume })` durably *admits*
the message to the session **inbox**; the `resume` flag only gates whether the
session is woken (opencode `Session.synthetic`:
`if (resume !== false) wake(session)`):

| `resume` | Effect |
| --- | --- |
| `false` | durable inbox notice; **no** LLM request. It renders as a compact **Notice chip** whose label is `description ?? text` — the chip shows the description, **not** the table. |
| `true` | the same inbox item **plus** a wake → a real agent turn runs; the model's answer is a **normal assistant message**, rendered in full. |

The command uses `resume:true` with a `<context-diff>`-tagged payload, because a
`resume:false` notice is the only other channel and it cannot show the table.
Consequences:

* **It runs an agent turn (tools included).** Collection is instant (cache +
  `state.json`, no RPC or traversal), but the session context grows by that
  turn, and the model may add light commentary or echo the tag. The family
  breakdown is not a command at all: `/cx` and the Desktop tab render it with
  **zero** LLM calls.
* If `synthetic` throws, the error is logged and the payload stays in
  `context-breakdown.log` — there is no other delivery channel in this runtime.
* Family traversal (parentID BFS), phantom-row filtering, the 3.5 s collection
  budget, `no-data` tagging, registry-miss recovery and the immediate
  deleted-session purge are internal details:
  [docs/internals.md](docs/internals.md#family-collection).

### TUI session panel (V2, terminal only)

#### TUI panel (/cx) — zero-LLM breakdown

`/cx` opens a full `session.panel` showing the breakdown for the current session
**and its subagent descendants**, from the same `state.json` bridge as the
sidebar. Keys: `/cx` opens, `esc` closes, `r` refreshes, `e` exports a redacted
snapshot, `s` picks a family session.

Every row carries a **cost** column from the host data layer: a main session
shows the **family-aggregated** spend, each subagent its own (no more invisible
subagent spend, upstream #45417). `s` opens a searchable picker (title / model /
cost / running marker); `Enter` navigates - root sessions focus their tab,
subagent sessions switch the route. Above the table, a **`family total`** line
sums each session's own `ctx` and prints the session count (token spend, not one
window's fill), in millions when large (`10.3M`).

The list is **capped at the 20 heaviest subagent sessions** (`MAX_FAMILY_ROWS`);
the rest collapse into one muted tail row, `+125 more - 8.9M (88%)`, carrying
the hidden rows' summed `ctx` and their share. The root is always first and
never counts against the cap; the total still sums **every** row - the cap
shortens the list, never the arithmetic. The eight category rows are **not**
repeated here: they live in the sidebar (and the Desktop panel).

Works from **subagent session views too** (those views have no prompt input), so
`/cx` is also in the command palette and bound to `<leader>c` / `f4`; the family
is then rooted at the topmost ancestor. **Zero LLM calls**: the panel only reads
local TUI data and the state file, unlike `/context-diff`, which runs an agent
turn to render its table.

The **largest contributors (measured)** section char-counts the in-process
message list: role, message clock time, bucket (`reasoning` / `message` /
`tool args (bash)` / `tool result (task)`), token estimate with its unit, and a
one-line preview. Tool calls are measured per call; tool result outputs are
counted here but not by the server's categories, which is why residual `other`
can look large. Top 5, empty state `no messages yet`.

Live on every install path (npm and `file://`). The Desktop has no TUI, so it
shows the same numbers in its own tab and offers `/context-diff` for the delta.

#### Export (redacted)

`e` writes a redacted JSON snapshot — no message text, no full session id, no
tool output content — under `%TEMP%/opencode-context-indicator/exports/`
(`$TMPDIR/...` elsewhere), named `context-<id8>-<yyyymmdd-HHMMSSmmm>.json`, and
shows a toast with the file name. It never throws; on failure it logs and shows
an error toast.

---

## Desktop panel (experimental)

OpenCode Desktop has no TUI, so the sidebar above cannot exist there. The
package therefore ships a **GUI part** (`./gui-experimental`) that renders the
same numbers as a Desktop **side-panel tab**, plus a **composer pill** with the
current percentage.

> **Experimental.** The host API it uses (`@opencode/plugin/gui`, opencode
> 2.2.0+) is explicitly marked experimental upstream and may change between
> releases; the export name `./gui-experimental` says so. If the host changes
> the API, the GUI part fails to load while the server part, the slash command
> and the TUI surfaces keep working.

### What it shows

**Context tab** (side region): the model, `ctx / usable (percent)`, the eight
categories as value + bar + share, the deterministic `HH:MM:SS` measurement time
(host locale never changes the layout), the `source` tag (`live` / `snapshot` /
`client-context` / `no-data`), a `stale after compaction` marker, the compaction
reserve, then a **`Family total`** row (the sum of every session's own `ctx` plus
the session count - each session has its own window, so this is token spend, not
one window's fill) and one line per subagent with its own window and percentage.
The total sits above the list so it stays visible for hundreds of sessions; the
list itself is capped at the **20 heaviest subagents** (`MAX_FAMILY_ROWS`,
shared with the TUI panel) and the rest collapse into a muted `+N more` row
showing their summed `ctx` and share. Category rows with a measured **zero** are
omitted (a fresh session keeps the full eight-row layout). The header tooltip
carries `provider/model`; a subagent on a **different model** shows it next to
its agent name.

**Composer pill**: `38% ctx` above the composer, amber from 65 % and red from
85 % of the usable window; clicking it opens the panel.

### Opening it

Open it from the side region's `+` menu ("Context"), from the command palette /
`/cx` ("Open context panel"), or by clicking the composer pill (opens the tab
for the current session).

### Where the numbers come from

A Desktop window has **no filesystem access**, so the server part exposes an
**RPC contract** (`lib/rpc.js`, id `context-indicator`, method `family`); the GUI
calls it via `ctx.client.rpc()`. It is published as the `./rpc` export:

```js
import { DesktopContextRpc } from "opencode-context-indicator/rpc"
const { rows } = await client.rpc(DesktopContextRpc).family({ sessionID })
```

The panel polls every 1.5 s (the pill every 5 s): a poll costs no provider call,
and polling recovers when the background server restarts. Per-request cost:
[docs/internals.md](docs/internals.md#desktop-rpc-contract).

### Install

The Desktop part loads from the same plugin entry - nothing extra to configure:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-context-indicator"]
}
```

Restart the app and check **Settings > Extensions**; the plugin must be listed
with its GUI part loaded. `dist/gui-experimental.cjs` is prebuilt, so no build
step is needed on install.

### Limits

* **Desktop only.** The TUI has its own surfaces; loading a GUI bundle there does
  nothing.
* **Polling, not push:** up to 1.5 s to appear (5 s for the pill); the numbers are
  the same snapshot the sidebar reads.
* **Not exercised in CI.** CI typechecks, builds and validates the artifact (gate
  `g`); the panel and pill are verified manually in the app before a release.

---

## Surface matrix

| Surface | Toast | TUI sidebar | TUI panel (/cx) | Desktop panel | Desktop pill | Breakdown log file | Slash commands |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| OpenCode **1.x** — Desktop | ✅ | — | — | — | — | ✅ | — |
| OpenCode **1.x** — TUI | ✅ | — | — | — | — | ✅ | — |
| OpenCode **2.x** — TUI | — | ✅ | ✅ | — | — | ✅ | ✅ |
| OpenCode **2.x** — Desktop | — | — | — | ✅ (exp) | ✅ (exp) | ✅ | ✅ |

Notes — these reflect what the plugin API exposes today:

* **V2 has no server-side toast channel** (`ctx.*` exposes no TUI/toast method,
  `#49380`), so the V2 path delivers through the log file, the TUI sidebar, the
  `/cx` panel and `/context-diff`. The sidebar and the composer capsule are
  TUI-process slots (live on every install path - see
  [Live sidebar](#live-sidebar)); the command works in the TUI **and** Desktop.
* **V1 is toast + log only**: OpenCode 1.x has no command/slot API and no
  `./tui` entry. The Desktop is TUI-less; its V2 surfaces are the log, the
  command and the experimental GUI part (see
  [Desktop panel](#desktop-panel-experimental)).

---

## Log / state file locations

All paths use the OS temp directory (`os.tmpdir()`), i.e. `%TEMP%` on Windows
and `$TMPDIR` (usually `/tmp`) elsewhere:

| File | Purpose |
| --- | --- |
| `context-breakdown.log` | Human-readable live snapshot + bounded final summaries |
| `opencode-context-indicator-state.json` | Machine-readable snapshot consumed by the TUI sidebar, `/cx` and the Desktop panel. Per-entry fields (`sessionID`, `parentID`, `ctx`, `usable`, `limit`, `categories`, `source`, `reclaim`, `cacheRead`/`cacheWrite`, `compactedAt`, `previous`, ...) are listed in [docs/internals.md](docs/internals.md#statejson-fields). |
| `context-events.log` | Raw event tap — **only** when `DEBUG_EVENTS` is flipped to `true` in the source (off by default) |

The state file is **bounded by family, not by row**: at most **1024 entries** and
**2 MB** (soft cap; measured rows are ~1.1 KB), evicting **whole families**
freshest-first - a missing intermediate row hides its subtree from the BFS, so a
split family is a silent data loss. An oversized single family is kept whole and
the eviction is logged (`state: evicted N families (...)`). The 7-day tombstone
prune follows the same rule (a family expires only when its **newest** row is
stale), a `parentID` cycle counts as one family, and the row the current write
just measured is pinned. In-memory maps keep their own FIFO cap (256) and never
touch the file. Full mechanics: [docs/internals.md](docs/internals.md#shared-statejson).

`context-breakdown.log` is **rewritten atomically** (temp file + rename): the live
snapshot is regenerated and summaries (idle), compaction notes and command
payloads are re-rendered from a bounded buffer (last 50 blocks per instance), so
the file never grows and no reader sees a half-written file. Every write merges
the on-disk summary section (de-duplicated, max 400 lines), so notes from another
instance survive; duplicate summaries are suppressed by an atomic claim marker
(`lib/dedup.js`).

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
the terminal TUI, on every install method - see [Live sidebar](#live-sidebar).
The same package name also works in a CLI-only `cli.json` for remote servers.

### Live sidebar

The TUI sidebar and the `/cx` panel are **TUI-process slots**, live on every
install path - npm (`opencode plugin add opencode-context-indicator`), `file://`
and the local `plugins/` copy alike.

That used to be false: OpenCode skips its Solid/JSX transform under
`node_modules` (upstream `anomalyco/opencode#33884`), so a JSX-built slot from
npm froze after one render. Since **1.8.0** the package ships **no JSX syntax**
and **no runtime dependencies**; the one `jsx()` helper lives in `lib/tui-h.ts`,
whose literal `@opentui/solid/jsx-runtime` import the host rewrites to its own
in-process module ([details](docs/internals.md#why-npm-installs-stay-live)).

| Install | Desktop | TUI commands | TUI live sidebar | TUI panel (`/cx`) |
| --- | :---: | :---: | :---: | :---: |
| npm | ✅ | ✅ | ✅ live | ✅ live |
| `file://` (any path) | ✅ | ✅ | ✅ live | ✅ live |

`/context-diff` and the breakdown log work on every install regardless. On 1.7.x
and older the npm path was disabled by design; a sidebar stuck on "no data yet"
on 1.8.0+ is a bug - report it with the host version.

### OpenCode 1.x (V1)

Add the package name to the `plugin` array in your `opencode.json`:

```json
{
  "plugin": ["opencode-context-indicator"]
}
```

### Local file (no npm)

Copy `index.js`, the whole `lib/` directory (22 files) and, for the TUI
surfaces, `tui.ts` into `~/.config/opencode/plugins/`, keeping `lib/` next to the
plugin file so relative imports resolve. A missing module only disables the
surface that imports it; the server part stops loading if one of its own imports
is absent. To use the sidebar locally, point OpenCode at a `file://` copy - it
behaves like an npm install ([Live sidebar](#live-sidebar)).

---

## Requirements

* **Node.js ≥ 18** (Node built-ins only). `@opencode/plugin` is an **optional**
  peer resolved by the host; `index.js` does not import it (the V2 `define`
  helper is inlined).
* **OpenCode ≥ 1.18.29** for V1. **V1 is feature-frozen** (bug fixes only): it
  relies on `experimental.chat.*` hooks, and if those change or stop firing the
  breakdown falls back to throttled `session.messages` fetches.
* **OpenCode ≥ 2.2.3** for V2 with TUI surfaces (verified on **2.2.7** /
  OpenTUI **0.8.1**; the load + state-write e2e also passes on the 2.2.0-2.2.5
  Desktop CLI). Server-only V2 works on 2.0.16+. The TUI module is typed against
  the host's OpenTUI generation, so older hosts (0.7, 0.6) may not load it.
* **TUI surfaces** resolve `@opentui/core`, `@opentui/solid` and `solid-js` from
  the host, so they are optional peers and the package installs **no runtime
  dependencies**; `@opentui/solid` is a devDependency for local typechecking.
* **Desktop GUI part** (optional, experimental): opencode 2.2.0+ with the GUI
  plugin API. The prebuilt bundle adds no runtime dependency; without the API the
  export is not loaded and everything else keeps working.
* **Developing in a checkout**: `npm install` may print `WARN EBADENGINE` for
  `@opentui/core` (`node >= 26.4.0`; the repo runs on Node 20/22). The plugin
  itself runs in the host's Bun, so CI audits `npm audit --omit=dev`.

---

## Configuration

There are **no user-facing plugin options**. The plugin reads the merged
OpenCode configuration only to *harvest* model limits and explicit pricing (the
V1 `config` hook; the V2 model registry).

---

## How it works

The default export is a dual plugin:

* `setup(ctx)` - V2 (OpenCode ≥ 2.0.16): registers `session.hook("context")` and
  `session.hook("compaction")` to capture the final messages / system prompt /
  tool schemas before each model request, subscribes to the event stream, records
  limits from the model registry and registers `/context-diff` via
  `ctx.command.transform`. Read-only: the context is never mutated (the command
  wakes the session via `resume:true` to render the delta).
* `server({ client })` - V1 (OpenCode ≥ 1.18.29): event handler + experimental
  transform hooks + toasts.

Both write the same breakdown log; V2 additionally feeds the sidebar and `/cx`
through `opencode-context-indicator-state.json`. The `./tui` entry renders the
sidebar slot and `session.panel`, with measured contributors and the redacted
export. Every file / estimate / subagent path is fault-tolerant: a failure is
logged and never breaks the main event path.

**Compaction staleness.** The `compaction` hook carries the pre-compaction
payload; the plugin persists that *true* breakdown and flags the entry stale
(`compactStale`), so every surface marks the row (`*` in the TUI panel, `stale
after compaction` in the Desktop) until the next request refreshes it. The
`session.compacted` event remains a fallback; a no-op compaction writes no stale
entry.

This plugin does not touch `opencode-token-monitor` (`token_stats` /
`token_history` / `token_export` keep working unchanged).

---

## Contributing

Issues and PRs are welcome. Keep changes minimal and fault-tolerant: code on the
event / hook path must never throw into the caller.

---

## Development / Testing

### Running tests

```bash
npm run build:gui             # build dist/gui-experimental.cjs (required by the gate)
npm run test:prepublish       # fast gate: tarball + JSX-free TUI + resolve + T1-T47 + GUI gates
npm run test:types            # tsc for the TUI entry AND the Desktop GUI part
npm run test:e2e              # full E2E: load + one "Say OK" round-trip + npm-layout liveness
npm run test:e2e:quick        # load-only, no LLM call (--check-c: npm-layout only)
npm run test:drift            # advisory host-drift warning (also in CI)
npm run test:drift:strict     # release check: fails on ANY host drift
```

`prepublishOnly` runs **all** of it automatically on `npm publish`
(`npm run build:gui && node test/prepublish.mjs && node test/e2e-tui.mjs --full`) and is skipped with
`--ignore-scripts`. Locally the fast gate takes ~2 s; a warm isolated E2E ~25 s
(cold ~90 s; the E2E is bounded by INIT 45 s + STEP 80 s and a 260 s total
budget), so the full chain is roughly **30 s warm to ~2 min cold**.

### What the gates check

**Fast gate — `test/prepublish.mjs`**

| Step | What | Why |
|---|---|---|
| (a) tarball composition | `package.json` `files[]` expands to the base files plus every `lib/*` module (count asserted dynamically); `docs/` may contain images and `internals.md` only; `dist/` only the built GUI bundle | no test/node_modules/tsconfig in the tarball, and no published export pointing at nothing |
| (b) JSX-free TUI | no `.tsx`/`.jsx` in the TUI surface (root + `lib/`), every TUI source parses with esbuild `loader:"ts"`, no `@jsx*` pragma, imports stay inside the host-bridgeable allowlist, relative imports carry a file extension | OpenCode skips its Solid transform under `node_modules` (#33884): one JSX file freezes the npm-installed sidebar |
| (c) resolve chain | walks the real TUI import graph (`resolve-bridge.cjs`): every bare specifier is host-bridged, every relative one resolves to a shipped file, and **no host-bridged module is a production dependency** | an accidental runtime dependency, or a bad local import, silently breaks the sidebar |
| (d) unit harness T1-T47 | **137 checks** against the extracted lib modules: limits/agent/state, contributors, redacted export, sanitizers, prompt-cache, waste detector, compaction reserve, diff, subagent rollup, Desktop RPC, panel width budget, deleted-session purge, the released-core ceiling, the family-list cap, family-aware retention (incl. a randomized 40-forest invariant test and a 120-step merge/evict soak) and the recursive V1 walk (caps, diamond/shared child, exact 64/65 boundary, waves, failures). The full list is in `test/prepublish.mjs` | regressions in modelLimits, writeStateFile, hydrate, contributors, export, categories, compaction reserve, panel layout, retention or the V1 rollup |
| (e) corporate-identifier scan | no forbidden identifiers in the published surface (`index.js`, `tui.ts`, `lib/*`, `gui/*`, `README.md`, `CHANGELOG.md`, `package.json`, the GUI build config) or the test tree | compliance |
| (f) non-English scan | no non-ASCII letters (`\p{L}` above U+007F) in the same published surface and test tree (`docs/` is not text-scanned) | English-only source rule |
| (g) Desktop GUI bundle | `dist/gui-experimental.cjs` exists and is a non-trivial single-file CJS bundle: no ESM `import`, no dynamic `import()`, no Node built-in, and every app-provided module (`solid-js`, `solid-js/web`, `@opencode/plugin/gui`, `@opencode/plugin/rpc`) still a `require()` - no bundled second copy, no React/OpenTUI/bare-`opencode` import; the artifact must also be newer than every source file it inlines | a stale or hand-edited bundle, or a build that inlines the app instance, breaks the Desktop panel at load time |
| (h) Desktop GUI runtime smoke | loads the built bundle with synthetic host modules and runs `setup()` against a fake window context: the four contributions are registered (`Panel`/`MenuItem`/`Command`/`ComposerPill`), the panel lists its tab only while the host stores the key, the RPC contract is defined, and the pill renders `70% ctx` with the warning tone from a 70/100 row and clears its poll on cleanup | a renamed host member or a changed entry shape loads fine but renders nothing in the Desktop; text-level bundle checks cannot see it |

**Isolated E2E — `test/e2e-tui.mjs`** (requires the OpenCode CLI)

| Check | What | Why |
|---|---|---|
| A — plugin load | spins a private `opencode --standalone` PTY against an **isolated global config** (`OPENCODE_CONFIG_DIR` → `%TEMP%/oci-e2e-config`, sole plugin entry = this checkout's `file://` URL), then asserts **from the host opencode log** (atomic lines, immune to PTY interleaving) that the plugin loaded and its `entrypoint` is **this checkout's `index.js`** — both fail-closed | catches a plugin that no longer imports cleanly, or an isolated config the host did not honor |
| B — live update | one `opencode run "Say OK" --standalone` round-trip; asserts the LLM answered **and** the isolated `state.json` gained a session with `ctx > 0` | catches a regression in the `session.idle` → `writeStateFile` path |
| C — npm-layout liveness | `npm pack` → extract into a throwaway `node_modules/opencode-context-indicator` → isolated `--standalone` TUI from there; an env-gated probe node (getter-driven `ref`) must produce three different rendered texts | proves the #33884 workaround: the packaged install stays **reactive** from a `node_modules` path, where the host skips the Solid transform |

The E2E is fully **non-invasive** to your running OpenCode Desktop:

- `--standalone` starts a *private* server; `OPENCODE_DB`,
  `OPENCODE_CONTEXT_INDICATOR_STATE_FILE` and `_LOG_FILE` point at throwaway
  files in `%TEMP%` (the live state/log is never read or written), and
  `OPENCODE_DISABLE_PROJECT_CONFIG=1` avoids project-level config;
- Check A writes its own global config (this checkout only, `update: "disable"`);
  Check B reads your real global config **read-only** (the round-trip needs its
  provider/model); Check C uses its own root under `%TEMP%/oci-check-c`;
- only instances the test spawned are killed (`serve --service`, your Desktop
  background service, is never touched), exactly **one** minimal LLM call is
  made, and a Desktop PID snapshot difference **fails** the run;
- a passing run deletes every artifact it created; a failing run keeps them and
  prints their paths as the only evidence. The unit gate does the same for its
  `oci-prepublish-*` files and dedup markers.

The script prints `[e2e] running against ISOLATED opencode instance — your running
sessions are not touched` at start and snapshots the Desktop service/GUI PIDs
before and after the run: a **difference fails** the run (the isolated test must
never restart, kill or close your Desktop), while an unavailable snapshot is
logged and the comparison is skipped. Override the binary with `OPENCODE_CLI`.
The full run needs a model for the one round-trip: set `OPENCODE_E2E_MODEL` to
*your* `provider/model` id (e.g. `OPENCODE_E2E_MODEL=myprovider/some-model`); it
is **required** in full mode and the script exits with an instruction if it is
unset. `--quick` needs no model.

### CI

`.github/workflows/ci.yml` runs on every push/PR to `main`, on `workflow_dispatch`,
and on a daily schedule (GitHub auto-parks scheduled workflows after 60 days of
repo inactivity — a push or manual run re-enables them):

1. `tsc --noEmit` and `tsc -p tsconfig.gui.json --noEmit` - typecheck the TUI
   entry (`tui.ts` + `lib/*`) and the Desktop GUI part (`gui/*.tsx`);
2. `npm run build:gui` - build the bundle the gate inspects;
3. `test/prepublish.mjs` - gates **(a)-(h)**, 137 unit checks, via the esbuild
   **programmatic API** (a Linux bin/esbuild binary cannot be spawned);
4. `test/drift-watch.mjs` - compares the OpenTUI pins and `@opencode/plugin`
   types with the **latest released** opencode. Advisory by default: patch drift
   prints a `::warning::` and exits 0. Only a **breaking** drift fails (a major,
   a `@opencode/plugin` minor, a 0.x `@opentui/*` minor, or a structural host
   change). `npm run test:drift:strict` fails on any drift before a release;
5. `npm audit --omit=dev --audit-level=moderate` - production tree only (the dev
   tree carries advisories inside npm's own CLI packages).

The Node-pty E2E is not run in CI (requires the OpenCode binary) and is skipped
gracefully when the CLI is absent (`[SKIP] opencode CLI not found`). The Desktop
GUI part cannot be exercised headless at all: CI typechecks it, builds the
bundle and checks the artifact, and the panel/pill are verified manually in a
real Desktop window before a release.

---

## License

[MIT](./LICENSE)
