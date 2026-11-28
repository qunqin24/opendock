# opencode-usage-insights 📊

[![GitHub Tag](https://img.shields.io/github/v/tag/hugobatista/opencode-usage-insights?logo=github&label=latest)](https://github.com/hugobatista/opencode-usage-insights/releases)
[![Test](https://img.shields.io/github/actions/workflow/status/hugobatista/opencode-usage-insights/test.yml?label=Test)](https://github.com/hugobatista/opencode-usage-insights/actions/workflows/test.yml)
[![Lint](https://img.shields.io/github/actions/workflow/status/hugobatista/opencode-usage-insights/lint.yml?label=Lint)](https://github.com/hugobatista/opencode-usage-insights/actions/workflows/lint.yml)
[![npm](https://img.shields.io/npm/v/opencode-usage-insights.svg)](https://www.npmjs.com/package/opencode-usage-insights)

**See what each turn costs.** OpenCode reports the cost of each request, but the
TUI no longer shows it. This plugin puts cost back in view in the **TUI** and in
**OpenCode Desktop**: a telemetry line after every turn, the session's running
spend and turn history, and an interactive `/usage` panel with charged cost,
list-price estimates, tokens, prompt-cache reuse and latency.

![The telemetry line after a turn](docs/images/line.png)

Everything stays in your OpenCode server: no prompts or responses are stored,
and the plugin sends nothing to a third party. The TUI and Desktop both read the
same recorder through an authenticated server RPC, so a client connected to a
remote server shows that server's data.

## What it does

- **The line** (`session.composer.top`): what the turn cost, the tokens and
  prompt cache behind it, when it ended, the gap since the previous prompt, the
  model and configured provider, and warnings when the prompt cache or the
  provider changed. It belongs to finished work, so it stays hidden while a
  turn is running.
- **The `/usage` panel**: nine views — `overview`, `models`, `providers`,
  `cache`, `periods`, `latency`, `sessions`, `turns`, `db` — over five ranges
  (`session`, `today`, `7d`, `30d`, `all`), with drill-downs, sorting, filters
  and remembered state. Keyboard-driven in the TUI; the same views with desktop
  controls in OpenCode Desktop. `/usage models 7d`, `/usage turns 7d`.
- **The Desktop header badge and panels**: a spend badge in the session header,
  next to the peak/off-peak badge; clicking it opens **Turns insights**, the
  session history. **Usage insights** holds the nine views and opens from
  `/usage`. The Desktop window never opens SQLite: the server's worker serves
  the panels and history over RPC.
- **The TUI sidebar**: the session's spend and last turns, in the same buckets
  as the line — time, provider, wall duration, prompt volumes, then
  `hit · tok/s · cost`. The duration is first request to last completion: tool
  waits inside the turn count, idle gaps do not.
- **The record** (server): every step with tokens, charged cost, the list-price
  estimate for `$0`, timings, finish reason and provider/model IDs; prompts,
  lifecycle, compaction and `session.usage.recorded` events too.
- **Portable data** (from a checkout): `bun run report --ndjson` exports the
  whole database, and `--import` merges it back on another machine.
- **Observational by design**: the plugin never rewrites prompts, requests or
  responses, and a failure inside the recorder is swallowed — telemetry can
  never interrupt a session.

## Requirements

- **OpenCode V2** (`>=2.4.2`). The Desktop GUI part uses the V2 GUI plugin API
  (`./gui-experimental`), introduced in the 2.4 line. The server and TUI parts
  run on the same server that records the sessions.
- [Bun](https://bun.sh) to install dependencies (development only).

| | |
| --- | --- |
| **OS** | Linux, macOS and Windows. The database lives in the per-user state directory of each (table below). `bun run check:platform` exercises the data layer on the host OS; CI runs the full suite, including the TUI render tests, on Linux. |
| **Runtime** | Bun, the runtime OpenCode ships with. SQLite comes from `bun:sqlite`: there is no native module to build and nothing to compile on install. |
| **Desktop** | OpenCode Desktop 2.4+. The GUI is one CommonJS bundle (`dist/gui-experimental.cjs`) that uses the app's shared Solid, Effect and OpenCode client modules; it never opens SQLite. |

## Install

The plugin is published on npm as `opencode-usage-insights`.

```sh
opencode plugin add opencode-usage-insights
```

This adds one entry to the global `opencode.json(c)`. That entry loads every
part of the package: the server recorder and RPC, the TUI contributions, and the
Desktop GUI. A TUI-only package goes in `~/.config/opencode/cli.json`; this
plugin has a server part, so `opencode.json(c)` is enough.

> **Desktop reads only `opencode.json(c)`.** If the plugin is in
> `~/.config/opencode/cli.json`, move that entry to `opencode.json(c)` and
> remove it from `cli.json`. One entry in `opencode.json(c)` covers the TUI and
> the Desktop; keeping both loads the TUI part twice.

If you prefer to edit the configuration yourself:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-usage-insights"]
}
```

To pass [options](#configuration), use the object form:

```jsonc
{
  "plugins": [
    { "package": "opencode-usage-insights", "options": { "sidebarTurns": 8 } }
  ]
}
```

Or register a local checkout. Point at the **package root**, not `src/`: the
loader reads the package `exports`, which resolve the server, TUI, RPC and GUI
parts. Build once before loading it, and rebuild after source changes:

```sh
cd /home/you/code/projects/opencode-usage-insights
bun install
bun run build
```

```jsonc
// ~/.config/opencode/opencode.jsonc
{ "plugins": [{ "package": "/home/you/code/projects/opencode-usage-insights" }] }
```

For GUI development, keep `bun run dev:gui` running in another terminal; each
rebuild reloads the Desktop GUI in every window without restarting the server.
Configuration changes reload on their own; after changing server or TUI source,
restart the background service with `opencode service restart`.

Send a prompt to verify: the TUI line appears above the composer when the turn
finishes, the Desktop badge appears in the session header, and `/usage` (alias
`/insights`) opens the panel.

## The TUI line

```text
14:32:07 · Δ 3m12s · opencode-go/deepseek-v4.1-flash max · in 85.4k (1.62M), cached 1.53M, out 3.7k, cost $0.21 · sess in 2.1M (14.5M), cached 12.4M, out 88k, cost $1.90 · ⚠ cache expired (−11.7k)
```

| Segment | Meaning |
| --- | --- |
| `14:32:07` | When the response ended (`completed`, else `streamed`, else `created`). |
| `Δ 3m12s` | Time since the previous prompt of the same session. |
| `opencode-go/deepseek-v4.1-flash max` | The identity of the turn: the configured provider the model ran through and the model (the variant as a trailing word; `fields.model`/`fields.variant` hide either). Yellow with `changed` when the provider differs from the previous prompt, `model changed` when only the model does. |
| `in 85.4k (1.62M), cached 1.53M, out 3.7k, cost $0.21` | `in` is the uncached prompt; the parenthesised value is the whole prompt (only when different); `cached` its cached part; `out` generated tokens (visible + reasoning); `cost` the bill. Several steps read `3 steps · …` and report the last step's tokens (`latest`); cost sums the turn. `turnTotals: "sum"` sums every step. |
| `cost $0.21` | Money, not tokens: a turn sums every step's cost whatever the token view shows. A cost of zero is left out, so a free model reads as free. `fields.cost: false` hides it. |
| `cost ≈ $0.21` | A **list-price estimate**, not money charged. When the host reports `cost: 0` for a paid model (OpenCode 2.2.0+ with an OpenCode Go subscription), the plugin prices the step from the host's model list. A turn mixing covered and paid steps keeps both parts visible: `cost $0.12 + ≈ $3.40`. `pricing: "off"` hides estimates everywhere; `fields.cost: false` hides both. |
| `sess in 2.1M (14.5M), cached 12.4M, out 88k, cost $1.90` | The session totals: tokens and charged money come from the host (including its compaction and title generations), and the list estimate comes from the steps the plugin recorded. A Go session reads `cost ≈ $3.40`; a session mixing charged and covered steps keeps both parts, `cost $0.12 + ≈ $3.40`. |
| `⚠ cache expired (−11.7k)` | Yellow. The prompt cache read fell by that many tokens against a comparable previous step; `×N` when several steps in the turn lost cache. |

The turn segment carries no label by default — the numbers are the turn's, and
`sess` marks the session's; `labels.turn` (e.g. `"turn"`) brings a prefix back.

`≈` marks a **list-price estimate**, never a charge. It appears when the host
reports `$0` for a model the catalog still prices; a known free model has no
estimate. The `sess` segment and historical views use the stored per-step
estimate, so they agree across clients; a live turn uses the client's current
catalog and can differ after a price change. The `db` view counts unpriced `$0`
steps and can backfill them (`e` in the TUI, **Backfill** in the Desktop panel).

A turn is every consecutive assistant step after a prompt. Compaction, shell,
`idle` and info messages do not split a turn; `user`, `synthetic` and `system`
messages do. From a checkout, `bun run demo` prints one example per case,
including the streaming one and both turn-total views.

## OpenCode Desktop

The Desktop app loads the package's `./gui-experimental` bundle in every window.
The GUI plugin API is experimental in the 2.4 line; the bundle is tested against
OpenCode Desktop 2.4.2. The window is Electron/Chromium: it has no Bun, no
`bun:sqlite` and no Node filesystem.

If the plugin was already installed before it gained the GUI part, restart the
background service once (`opencode service restart`) and reopen the Desktop
window. The plugin inventory caches the package's parts; a config reload may
reload the server entry without noticing the new `./gui-experimental` export.

The recorder, the database and the worker stay in the server; the window reads
them through the same RPC the TUI uses.

### The cost badge

In the session header, next to the peak/off-peak badge, the usage insights badge
shows the finished turn's spend (`$0.0210` or `≈$0.0210`):

```text
$0.0210
```

Hovering shows the full telemetry line. Clicking it opens **Turns insights**.
The badge follows the TUI line and hides while a turn is running; it reappears
with the final amount. The `fields`, `labels`, `turnTotals` and `pricing`
options apply to the line, badge tooltip and panel; `fields.cost: false` hides
the badge as well.

### Usage insights and Turns insights

`/usage` (and the hidden `/insights` alias) opens the **Usage insights** panel
in the side region. It has the same nine views, five ranges, drill-downs,
sorting and filters as the TUI, plus the database view's maintenance buttons.
The **Turns insights** tab shows the current session's history. `/usage turns`
opens the same history inside **Usage insights**, where the session/all-sessions
scope is available. Both panels have the inverse shortcut: **Usage insights**
has an **Open turns insights** footer button, and **Turns insights** has
**Open usage insights**.

The TUI's always-visible sidebar has no Desktop slot. The Desktop equivalents
are:

| Where | What it shows |
| --- | --- |
| Session header badge | The turn spend and the full line on hover; click opens Turns insights. |
| Turns insights tab | The current session's complete history. `/usage turns` adds the session/all-sessions scope. |
| Side panel `+` menu | **Usage insights** and **Turns insights** launchers. |

The panel state is stored separately from the TUI: opening the Desktop panel
does not move the TUI panel, and vice versa.

### The server side

The server part registers the usage RPC and starts a **database worker**. The worker owns a read-only SQLite connection for the panel and the
turn history, and opens a short write connection for `prune`, `wipe`, `vacuum`
and `backfill`. Panel queries therefore never block the agent's event loop, and
the TUI does not open SQLite either: it works against a local or a remote server.

The worker starts lazily on the first usage request (the panel, the history or
the header badge estimate). If it cannot start (for example in a development
runtime), the server falls back to an in-process service and logs it; the
plugin still works, but the fallback shares the server's event loop.

### Desktop options

All options are in [Configuration](#configuration). The two security-relevant
ones are `maintenance` (default `true`; set `false` on a server reachable from
other machines) and `exposePaths` (default `false`; keeps the absolute database
path out of the `db` view).

### Remote servers

The TUI and Desktop call the RPC on the server that owns the session. A TUI
connected to a remote server shows that server's usage; the Desktop GUI is
loaded from its own background server, but the panel targets the session's
server. The plugin's server part must be installed and enabled on that server.
If it is not, the panel explains that usage data is unavailable.

## How costs are calculated

**Charged money is never recalculated.** `steps.cost` is what the host reports.
When it is `0` or missing and the model has a price in the host's model list, the
plugin stores a **list-price estimate** in `steps.list_cost` (USD per 1M tokens).
`≈` marks an estimate, never a charge.

| Surface | Price source |
| --- | --- |
| Server recorder and backfill | `ctx.model.list()` |
| Live line (TUI/Desktop) | `data.location.model.list(location)` |
| Panel, sidebar, NDJSON, CLI | stored `steps.list_cost` |
| `sess` segment | `SUM(list_cost)` over the RPC |

The host resolves provider config/overrides. The plugin does not read
`~/.cache/opencode/models.json`, does not use `opencode models` for prices, and
makes no network call. `list_cost` is `NULL` for charged/unknown, `0` for a known
free model, and positive for an estimate. An unknown or inapplicable price means
no estimate; an all-zero price means free. The formula, context tiers and worked
example are in [docs/internals.md](docs/internals.md#list-price-estimates).

The host also reports compaction and title usage with no assistant step. It is
stored in `usage`, keyed by the host event ID, and included in the overview,
periods and sessions totals; it is not attributed to a model because the host
record carries none. See [docs/internals.md](docs/internals.md#non-step-usage).

The live line's turn estimate uses the client's current model list; the `sess`
segment and historical views use the stored estimate, which freezes the price at
recording time. If the plugin started mid-session, the estimate covers only the
recorded steps; the charged total still follows the host. `pricing: "off"` hides
estimates and disables the backfill without deleting data.

| Situation | Line | Panel |
| --- | --- | --- |
| Charged | `cost $0.12` | `$0.12` |
| Covered (host `0`, price known) | `cost ≈ $3.40` | `≈$3.40` |
| Mixed | `cost $0.12 + ≈ $3.40` | `$0.12 + ≈ $3.40`; table `≈$3.52` |
| Compaction/title | in the host `sess` total | overview `other`; session/period cost |
| Known free / price unknown | cost omitted | `$0` |

## The TUI panel

`/usage [view] [range]` opens the panel (`/usage` alone opens the last view, or
`overview` over `all` the first time). While the panel is open it owns input, so
the prompt cannot take the command again: `escape` closes it, `f` toggles full
screen, and the palette entry (`ctrl+p` → "Usage insights") toggles it closed.
With the composer focused, `/usage` with no arguments also toggles it closed,
and any argument — including an unknown token, which is ignored — keeps it open.
There is no default key binding — the command is palette-only, so it never
shadows a key you use.

![The /usage providers view](docs/images/panel-providers.png)

The view bar at the top names every view and brackets the active one; `?` opens
a help overlay that repeats the keys and defines every number.

### Keys

| Key | Does |
| --- | --- |
| `↑` `↓` / `j` `k` | Move the cursor; the row under it is highlighted. |
| `pageup` `pagedown` / `home` `end` | Move by ten rows / to the first or last row. |
| `enter` | Drill into the row: a model → the providers it ran through and their latency; a provider → the models it served and its latency; a session → its turns; a period → the providers of the period. In `db`, prune the steps recorded before the selected retention's cutoff date, or wipe every recorded step, session and event from the last row (asks first). |
| `backspace` | Go back from a drill-down. |
| `1`–`9` / `[` `]` | Pick a view (`9` is `db`) / cycle views. |
| `t` / `shift+t` | Next / previous range. |
| `s` / `shift+s` | Cycle the sort column / reverse it. |
| `b` | `periods` bucket: day → week → month. |
| `a` | `turns` scope: this session ↔ every session. |
| `m` `p` | Filter by model or by **provider** (a picker of the values actually observed). |
| `x` | Clear the filters. |
| `r` | Re-read the database. |
| `e` | `db`: backfill list-price estimates for the `$0` steps that have none (asks first; uses today's model list). |
| `v` | `db`: compact the file, giving the space of deleted rows back. |
| `?` | Help overlay. |
| `f` / `escape` | Full screen / close. |

The view, range, sort, bucket, scope and filters are stored through the host's
durable storage, so the panel reopens where it was left.

### Views

| View | Answers |
| --- | --- |
| `overview` | Steps, sessions, prompts, `in`/`cached`/`write`/`out`, `hit`, cost (with an `other` row naming the compaction/title part), an activity sparkline, a `this session` block and a **data coverage** block (how many models and providers were observed, and how many steps lack a model or a completion — a zero elsewhere is only trustworthy when this is complete). |
| `models` | Every model with its cache (`hit` and the per-step `hit p50`), tokens, cost, the **providers it ran through** and how often it switched model or provider — with the cache a provider switch cost. Cost is assistant steps only; `enter` opens the per-provider detail. |
| `providers` | **Which configured provider ran each model**: one row per provider, with the models it served, steps, share, prompt, cached, `hit`, p50 throughput, wall time and cost. Cost is assistant steps only. `enter` lists every model it served. Steps recorded without a provider (a model that was never observed) are dimmed and cannot be drilled into. |
| `cache` | Reuse by model, losses grouped by reason (`expired`, `compaction`, `unknown`), **cache survival against idle time**, reuse kept per provider, the observed TTL bounds (`hits up to` / `drops from`) and the most recent losses. |
| `periods` | Day, week or month totals — steps, sessions, `in`, `cached`, `write`, `hit`, `out`, cost (including compaction/title usage) — with a sparkline per metric and a totals row. `enter` lists the providers of a period. |
| `latency` | Wall time, streaming window and throughput as p50/p90/p99 overall and per model (per provider when a model is filtered). `n < 5` is dimmed. |
| `sessions` | Each session with steps, prompts, tokens, `hit`, cost (including compaction/title usage, named on the detail line), its directory and how many models it used; subagent sessions are indented under their parent and rolled up. |
| `turns` | The per-prompt history: one line per finished turn, rendered exactly like the live line. Cost is assistant steps only. `a` widens it to every session, titled. |
| `db` | File name (full path with `exposePaths: true`), contents and age. The retention table lists `30`/`90`/`365`-day prunes with step counts and cutoff; `↑`/`↓` + `enter` prunes from a cutoff, and the row below the table wipes every recorded step, session and event (both ask first). `v` reclaims space. It counts `$0` steps without an estimate; `e` backfills at today's list price. |

The panel sums the stored per-step buckets over the selected range, so a number
read in one place means the same in the other: `prompt` is everything the
provider saw (`cached + fresh + writes`), `in` the uncached part, `hit` is
`cached / prompt`, and `out` everything generated (visible output + reasoning).
A `cost` cell marked `≈` includes list-price estimates for steps the host
reported as `$0`; the overview and the sidebar keep a mixed total in two parts
(`$0.12 + ≈ $3.40`) so charged money is never mistaken for the estimate.

The identity of a step is the **configured provider** the model ran through —
`opencode`, `opencode-go`, `deepseek`, whatever the provider is called in the
OpenCode configuration — and the model itself. That is what every view groups
by. A gateway may route a request to another operator, but that upstream is not
observable, so it is not guessed. The same model through `deepseek` and through
`opencode-go` is two rows, two caches and two latency profiles, and a switch
between them forfeits the cache the previous one held (the switch counts and the
cache losses in the `models` view count exactly that).

`tps`/`wall`/`stream` are produced tokens per streaming second / request to
completed step / request to the last chunk. The sidebar's turn header shows the
turn's wall time — the first request to the last completed step, so any tool
wait inside the turn counts — while its rate is only the streaming window. The
sidebar's rate (per turn, and the session average on its totals) is the
**weighted** one — produced tokens divided by the summed streaming windows — so
it answers "how fast did this produce"; the `latency` view reports the p50 of
the per-step rates instead, which answers "how fast is a typical step". A
switch from one step to the next is not by itself a fault — moving to another
model or provider is a deliberate choice — so the `models` view pairs the count
with the cache the switch actually cost, which only a provider switch can: two
models never share a cache to lose. The panel's `?` overlay defines every
number in place.

## Configuration

Options apply to all three parts (each side reads the ones it needs):

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | `false` disables that side completely — no line, no panel, no recording. |
| `db` | per-OS state path | SQLite path override, resolved by the **server**. The TUI and Desktop read it through the RPC and never open the file. |
| `turnTotals` | `"latest"` | How the turn segment counts prompt usage: `latest` shows the prompt size the turn ended with; `sum` adds every step of the turn. |
| `pricing` | `"auto"` | `"off"` disables list-price estimates everywhere: no new `list_cost` records, no `≈` on the line, badge, panel or sidebar, and no historical backfill. Charged money is unaffected. |
| `sidebar` | `true` | TUI-only: show the session summary and the per-prompt history in the session sidebar. The Desktop history is the Turns insights tab. |
| `sidebarTurns` | `8` | How many turns the TUI sidebar and the Desktop Turns insights tab show (`1`–`50`; values outside are clamped). |
| `panel` | `true` | Show the `/usage` statistics panel and its command in the TUI and Desktop. `false` keeps the line and the history. |
| `maintenance` | `true` | Allow the RPC to prune, wipe, vacuum and backfill. Set `false` on servers reachable from other machines. |
| `exposePaths` | `false` | Return the absolute database path in the `db` view; the default returns only the file name. |
| `fields` | see below | Toggle line segments. |
| `labels` | see below | Override line labels (the plugin is English-only by default). |

### Fields and labels

```jsonc
{
  "options": {
    "fields": { "clock": true, "delta": true, "model": true, "variant": true, "turn": true, "session": true, "reasoning": false, "cost": true, "cacheExpiry": true },
    "turnTotals": "latest",
    "labels": { "delta": "Δ", "turn": "", "session": "sess", "step": "step", "steps": "steps", "input": "in", "cached": "cached", "output": "out", "reasoning": "reason", "cost": "cost", "estimate": "≈", "cacheExpired": "cache expired", "providerChanged": "changed", "modelChanged": "model changed" }
  }
}
```

`fields: { "clock": false, "delta": false, "session": false }` turns the line
into a pure `provider/model · turn …` reading.

## Database and privacy

The recorder writes to the per-user state directory:

| OS | Path |
| --- | --- |
| Linux / other | `$XDG_STATE_HOME/opencode/opencode-usage-insights/usage.db` (default `~/.local/state/opencode/opencode-usage-insights/usage.db`) |
| macOS | `~/Library/Application Support/opencode/opencode-usage-insights/usage.db` |
| Windows | `%LOCALAPPDATA%\opencode\opencode-usage-insights\usage.db` |

`OPENCODE_USAGE_INSIGHTS_DB=/path/to/usage.db` overrides the path, and the `db`
option overrides both. The file is private to the user: its directory is created
`0700` and the file `0600` (POSIX), re-applied on every open. The TUI and the
Desktop GUI never open the file. They call the usage RPC; the server's worker
holds a read-only connection for the panel and the history, so a view can never
write, migrate or take the recorder's lock. Prune, backfill and compact use a
separate short-lived writer inside the worker. The server part applies schema
migrations on open; after an upgrade, start it once before opening the panel if
the file predates the new schema.

Per step the database holds tokens, charged cost, the list-price estimate when
the host reported `$0`, timings, finish reason, the configured provider and the
model it ran through, and the session title and working directory. **Prompts and
responses are not stored**, and the plugin sends nothing to a third party; a
remote client reads the server's data over the authenticated RPC. The schema,
indexes, identity rules and security notes live in
[docs/internals.md](docs/internals.md).

### Security and remote servers

The usage RPC is served by the OpenCode server and inherits its authentication.
It is not a new unauthenticated endpoint, but it is a new authenticated surface:
any client that can call the server API can call it, and the RPC handler has no
caller identity (`RpcCallContext` exposes only cancellation and declared
errors). The plugin therefore applies least privilege at the surface:

- **Read-only by default for queries.** `panel`, `turns`, `listCost`, `filters`
  and `dbInfo` run on the worker's read-only SQLite connection. The only writes
  are `prune`, `wipe`, `vacuum` and `backfill`, gated by `maintenance` and an
  explicit confirmation.
- **No free-form access.** There is no SQL, path, import or export method. Inputs
  are validated by JSON Schema with closed objects, enums, length limits and
  numeric clamps; the service validates them again. SQL is parameterized.
- **Minimal output.** The RPC returns usage metadata — session titles,
  directories, models, providers, tokens, costs and the database shape — never
  prompts or responses. Database paths are returned as a file name unless
  `exposePaths: true`.
- **Availability.** The worker keeps panel queries off the server's event loop;
  the client queue is bounded while the worker is in use. Reads have a 10 s
  watchdog; maintenance gets five minutes. Generic errors are returned; details
  stay in the server log.

For a server reachable from another machine, set `maintenance: false` unless you
need the maintenance buttons there. The RPC is only as protected as the server:
do not expose an OpenCode server without its password/auth. The usage database
is per server user; every authenticated client on that server sees the same
sessions and aggregates. If you need per-user or per-tenant isolation, do not
expose the RPC until the database carries that dimension.

## CLI report

From a checkout, the database can be read without opening the TUI:

```sh
bun run report                          # overview over all time
bun run report models 7d                # one view, one range
bun run report all                      # every view
bun run report providers --model deepseek-v4.1-flash
bun run report periods --granularity month
bun run report models --provider opencode-go
bun run report --no-estimates           # charged money only, like pricing: "off"
bun run report --json                   # raw rows and every analysis, for scripting
bun run report --ndjson > backup.jsonl  # export the whole database
bun run report --import backup.jsonl    # merge an export (idempotent)
bun run report --help
```

The views come from the same `buildPanel` the TUI and the Desktop render, so the
terminal and the panels never drift apart. Run this on the server that owns the
database; it is the local CLI counterpart to the RPC. `--width`,
`--granularity`, `--model`, `--provider`, `--sort` and `--asc` mirror what the
panel's controls do.

## Development

```sh
bun install
bun run typecheck    # server, TUI and the separate Desktop DOM typecheck
bun run build        # dist/index.js, tui.js, rpc.js, stats-worker.js, gui-experimental.cjs
bun test             # pure logic + database + TUI harness + worker/RPC tests
bun run check:package
bun run bench        # query budgets at 20k steps (--full for 120k)
bun run check:platform
bun run demo         # print the line and every view from a seeded database
bun run docs:images  # re-render docs/images/*.png (needs ImageMagick)
bun run dev:gui      # vite build --watch for the Desktop part
```

For the Desktop development loop, point the local plugin at the package root
(built once) and keep `bun run dev:gui` running: each GUI rebuild reloads the
bundle in every Desktop window. Server or TUI source changes still need
`opencode service restart`.

- `src/core.ts`, `src/line.ts`, `src/panel-data.ts` and `src/stats/` are pure:
  turn accounting, the host-shape adapter, the view models, and the database,
  queries and analysis layer. No host imports, so they are unit-testable without
  a TUI runtime.
- `src/text.ts` — text hygiene and the token shape a provider id is validated
  against.
- `src/recorder.ts` — the event-stream state machine that fills the database.
- `src/rpc.ts`, `src/rpc-client.ts` — the shared RPC contract and its typed
  client wrapper.
- `src/service.ts`, `src/stats-worker.ts`, `src/stats-client.ts` — the database
  service, the worker that runs it off the server's event loop, and the bounded
  server-side client with its in-process fallback.
- `src/panel-build.ts`, `src/panel.tsx`, `src/sidebar.tsx` — server-side panel
  assembly, the TUI panel component, and the TUI sidebar contribution.
- `src/gui.tsx`, `src/gui/` — the Desktop entry, header badge, panels, line
  helpers, CSS, icon and copy.
- `src/index.ts`, `src/tui.tsx` — the server (recorder + RPC + worker) and TUI
  parts.
- `scripts/` — the demo, report, bench, platform-check, package-check and
  documentation-image CLIs, plus the Bun/Vite build.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the ground rules and review
expectations, and [docs/internals.md](docs/internals.md) for the database
design, performance rules and how the clients are tested.

## License

MIT — see [LICENSE](./LICENSE). Author: Hugo Batista
(<https://github.com/hugobatista>).
