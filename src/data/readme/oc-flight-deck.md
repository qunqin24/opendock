<p align="center">
  <img src="assets/icon.svg" width="120" height="120" alt="oc-flight-deck icon" />
</p>
<h1 align="center">oc-flight-deck</h1>
<p align="center"><strong>See live cost, tokens, and context for every OpenCode session, right in your sidebar.</strong></p>

## Install

Add the entry to the `plugins` array in your `opencode.jsonc`, then restart OpenCode:

```json
{ "plugins": ["oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git"] }
```

The panel renders beside your next open session with defaults and no config file.
You need OpenCode `2.0.30` already installed, on Node 22+ or Bun 1.4+.

### Or let your AI install it

```text
Install the oc-flight-deck plugin: add "oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git" to the plugins array in my opencode.jsonc, restart OpenCode, then open a session and confirm the telemetry panel renders in the sidebar. Report which of the default rows you see: status, agent, model, cost, project, tokens, cache, context, perms, elapsed, tps.
```

### Offline or pinned

The registry is the slow track: tagged releases only.

```json
{ "plugins": ["oc-flight-deck@latest"] }
```

The git entry is the fast track and follows the default branch at install. To fix a commit, append `#<full sha>` to the git entry.

## Use it

Open a session and read the rail. Three scopes shape the numbers you see. `cost`, `tokens`, `cache`, and `reasoning` roll up this conversation plus the subagent sessions linked by the host's parentID. `project` covers every session in the project. `elapsed` counts active turn time, not wall clock.

A session with subagents, defaults, 200k window:

```text
status    ⠙ running
agent     build
model     claude-sonnet-4-5 · high
cost      $1.84 · 3 subagents
project   $12.40 · 21 sessions
tokens    1.2M in · 84k out
cache     92% hit · 1.1M read
context   ████████░░ ~78%
perms     1 waiting · bash
elapsed   2h 14m 07s
tps       41 tok/s
```

Add `"ses"` to `sidebar.rows`, then click the `session` row to copy the full id. Add `"go"` to `sidebar.rows` for quota.

## What you get

- One money row that rolls up this conversation plus its subagent tree
- A stable rail: every named row draws its zero skeleton until data arrives
- Elapsed time that survives a restart, recomputed from recorded turn spans
- Speed as a settled-turn average, a realtime estimate, or both with ttft
- An opt-in watchdog row that stays silent until something stops moving
- One `notifications` section that silences every toast, together or by kind
- One global config file, and nothing per project

## Configure it

You configure one global file: `~/.config/opencode/flight-deck.jsonc`. The `.json` name is also read, and `.jsonc` is tried first. When `$XDG_CONFIG_HOME` holds an absolute path, the file lives at `$XDG_CONFIG_HOME/opencode/flight-deck.jsonc` instead. There is no per-project lookup, so a copy left in a project root configures nothing. A missing file is normal and silent: you get the defaults below. If the file does not exist, create it; the snippet below is a complete file. Where the host forwards plugin options, those win key by key. Comments and trailing commas are accepted by the Bun-hosted TUI. A bad value restores its default with a one-time toast naming the key; silence that toast with `notifications.config: false`.

```jsonc
{
  "sidebar": { "rows": ["status", "cost", "context", "elapsed"] }
}
```

### What each row shows

| Row | What it shows | Default |
| --- | --- | --- |
| `caution` | Annunciator, opt-in with `caution.enabled`. Silent unless a tool or turn stops moving. Reports observations, never verdicts (`shell running 8m41s`). Never aborts, kills, retries, or blocks. `▲` watch, `●` caution, `○` reserved and not drawn. | opt-in |
| `status` | `⠙ running` while anything works (this session, a subagent, or a shell); `○ idle` otherwise. | yes |
| `agent` | Active agent name. | yes |
| `model` | Model id, plus ` · variant` when one is present. | yes |
| `branch` | Current git branch. Costs a VCS call. | opt-in |
| `cost` | Money for this conversation plus its subagent tree. With `total` on the rail, this row shows the session's own figure. Merged shape `$1.84 · 3 subagents`; childless shows `$1.84`. Follows the host's parentID link only: an independently spawned top-level session is not counted, and `project` is the surface for that. | yes |
| `total` | Family total plus subagent count, `$1.84 · 0 subagents` when childless. | opt-in |
| `project` | Every session in the project: `$12.40 · 21 sessions` when more than one, else just the figure. | yes |
| `tokens` | `1.2M in · 84k out`, same family scope as `cost`. | yes |
| `cache` | `92% hit · 1.1M read`, family scope. The hit-rate denominator is cache read plus input; cache write is excluded because a write is not a lookup. A zero read is drawn (`0 read`, or `0% hit · 0 read` when input exists), never hidden. | yes |
| `context` | Occupancy proxy (last request input plus cache read plus cache write), drawn as a `layout.barWidth`-cell gauge (10 by default) plus `~78%`, or `~N used` when no limit is known. The `~` is deliberate: this is an estimate. | yes |
| `perms` | Pending approvals. One names the action plus an 18-cell clipped resource (`bash · src/tui…`); several lead with the count (`3 waiting · bash`). | yes |
| `elapsed` | Active generation time, recomputed from the assistant-turn spans the host recorded for this session and its subagents. Survives a restart, never steps backwards while the host reports those turns, and is not wall-clock since the session began. | yes |
| `tps` | Session speed. Default `avg`: generation tokens (output plus reasoning) over the union of settled turns' `streamed − created` spans; idle gaps never billed. `rt`: realtime estimate from streaming deltas, zero while nothing generates. `both`: `106 rt · 41 avg`, plus `1.2s ttft` once a step settles. Scope `family` (default; open session plus subagents, overlapping spans merged) or `session`. Below half a token per second no figure is drawn; with `persist: true` the row falls back to its `0 tok/s` skeleton, and `persist: false` omits it. | yes |
| `spark` | Recent turn sizes as a sparkline; the newest samples are kept. | opt-in |
| `reasoning` | Reasoning tokens, family scope. | opt-in |
| `turns` | Prompts sent this session. | opt-in |
| `guard` | Harness status when a guard bridge supplies it (breaches, orphans, findings, or ok). Without the bridge the row has no data. | opt-in |
| `go` | Zen Go usage: three dials (`○ ◔ ◑ ◕ ●`) plus percent for 5h, 1w, 1m, read from OpenCode's own active opencode-go credential store; no env var. A window at 90% or more, or non-ok, turns red; only the worst flagged window carries a reset countdown. | opt-in |
| `ses` | Clipped 18-cell preview of the session id (less when the label column is narrow, floored at 8), labelled `session`. Click copies the full id. A verified copy is silent: the host write reports `written`, or an exact clipboard read-back confirms an OSC52 dispatch. An unconfirmed dispatch is an advisory warning (paste to verify). Gate the failure toast with `notifications.copy`. | opt-in |
| `session` | Alias for `ses`; accepted in `sidebar.rows` and folded to it. | opt-in |

With `sidebar.persist` (the default) every named row renders, drawing its zero skeleton until data arrives: `$0.000` money rows, `0 in · 0 out`, `0 read`, empty gauge plus `~0%`, `0 waiting`, `0s`, `0 tok/s` (`0 rt · 0 avg` in both), flat `▁` spark, `0` reasoning and turns, `○ 0 ○ 0 ○ 0` go, `○ idle`, `none` agent, model, and ses, `no branch`, `unknown` guard. `caution` never draws a skeleton. Set `persist: false` to omit rows with no data instead.

### Settings

**Refresh**

- **`refresh`** (default `100`) — ms between ticks, 0–60000. Values 1–15 clamp to 16; `0` turns the ticker off, so clock-derived rows move only on host events. While idle the tick backs off to about 1s.

**Sidebar**

- **`sidebar.enabled`** (default `true`) — `false` leaves the plugin loaded but invisible.
- **`sidebar.rows`** (default `["status","agent","model","cost","project","tokens","cache","context","perms","elapsed","tps"]`) — live rows, top to bottom, any subset in any order. Max 24 names; unknown names are ignored with a one-time warning.
- **`sidebar.lines`** (default `[]`) — fixed lines above the rows. Max 24. These plus rows share the rail cap (`maxLines`, default 24); fixed lines render at full brightness while live rows are dimmed.
- **`sidebar.footer.lines`** (default `[]`) — fixed lines in the host footer slot, outside the rail cap; max 24. The documented branding pair is `["▸ FLIGHT DECK","─────────────────"]`.
- **`sidebar.footer.go`** (default `false`) — `true` or an object draws the live Go usage panel: three fixed-width lines above the host location row, sharing one account-wide poll with the `go` row. Object keys: `header` (`false`), `barWidth` (`10`, 1–40), `labelWidth` (`6`, 5–24, auto-widens), `percent` (`true`), `reset` (`true`), `align` (`"right"`, left, right, or center), `sweep` (`false`), `labels` (`{rolling,weekly,monthly}`, each 1–24 chars), `blink` (`true`), `blinkMs` (`700`, 200–5000).
- **`sidebar.persist`** (default `true`) — every named row renders, drawing its zero skeleton until data arrives; `false` omits rows with no data.
- **`sidebar.placeholder`** (default `"—"`) — non-empty string; only for a data-less row with no skeleton, unreachable for shipped fields.
- **`sidebar.maxLines`** (default `24`) — whole rail, fixed lines plus rows, 1–24.
- **`sidebar.tps.scope`** (default `"family"`) — `"family"` paces the open session plus subagents; `"session"` paces the open session alone.
- **`sidebar.tps.display`** (default `"avg"`) — `"avg"` settled-turn average, `"rt"` realtime estimate, `"both"` both figures plus ttft.

**Footer**

- **`footer.enabled`** (default `true` when any other footer key is present, `false` when the section is absent) — writing any footer key turns it on.
- **`footer.text`** (default `"Flight Deck"`) — max 120 chars; control chars become spaces.

**Caution**

- **`caution.enabled`** (default `false`) — run the annunciator; off means no row and no timer.
- **`caution.toolWatchSeconds`** (default `180`) — a tool running longer draws `▲`.
- **`caution.toolCautionSeconds`** (default `420`) — a tool running longer becomes `●`; raised to the watch value if lower.
- **`caution.turnWatchSeconds`** (default `600`) — a running session producing nothing draws `▲`; suppressed while a tool or shell runs.
- **`caution.turnCautionSeconds`** (default `1200`) — quiet session becomes `●`; same raise rule. All four thresholds take 0 or more.
- **`caution.repeatThreshold`** (default `3`, min 2) — identical consecutive calls before a loop is reported; applies to successes and failures.
- **`caution.exemptTools`** (default `["question","task","subagent","agent","delegate","delegate_many","delegate_task","tools.delegate","tools.delegate_many","tools.subagent","tools.task"]`) — matched by exact name. Calibrated against 54,218 settled calls: 307 exceed 180s and 200 of those are these tools; `subagent` alone crossed 152 times, p99 14.7 min.
- **`caution.toast`** (default `false`) — toast once per distinct problem, re-arming when the session goes quiet.

**Notifications**

- **`notifications.enabled`** (default `true`) — the one-key off switch; `false` silences every toast.
- **`notifications.config`** (default `true`) — the one-time toast naming a bad config key.
- **`notifications.copy`** (default `true`) — the toast for an unverified copy.
- **`notifications.caution`** (default `true`) — the opt-in caution toast. Every flag only silences.

**Layout**

- **`layout.labelWidth`** (default `10`, 6–24) — label column width.
- **`layout.barWidth`** (default `10`, 1–40) — context gauge cells.
- **`layout.sparkWidth`** (default `12`, 2–64) — sparkline samples.
- **`layout.labels`** (default `{}`) — rename any row by its canonical key, for example `{ "cost": "session", "total": "lifetime" }`. A label wider than the column still gets a space before its value.

**Format**

- **`format.duration`** (default `"spaced"`, `2h 14m 37s`) — or `"compact"` (`2h14m37s`). Zero-padding is the same either way (`14m 07s`, never `14m 7s`).

**Glyphs**

- **`glyphs.watch`** (default `"▲"`), **`glyphs.caution`** (default `"●"`), **`glyphs.clear`** (default `"○"`, reserved, not drawn today) — 1–2 chars each.

**Style**

- **`style.lines`** (default `{color:"default", attributes:[]}`) — fixed-line look.
- **`style.rows`** — wildcard `"*": {color:"subdued", attributes:[]}` plus per-row overrides. Colors are theme roles: default, subdued, warning, error, success, info. Attributes: bold, dim, italic, underline, blink, inverse, hidden, strikethrough.

Config precedence: host plugin options beat `flight-deck.jsonc`, which beats defaults, merged key by key.

### Recipes

Quota, session id, and branch:

```jsonc
{ "sidebar": { "rows": ["status", "cost", "project", "go", "ses", "branch", "elapsed"] } }
```

Split the money rows: session and lifetime:

```jsonc
{
  "sidebar": { "rows": ["status", "cost", "total", "elapsed"] },
  "layout": { "labels": { "cost": "session", "total": "lifetime" } }
}
```

With `total` on the rail, `cost` draws the session's own figure, so this reads `session $1.00` and `lifetime $2.00 · 1 subagent`.

Realtime speed plus time to first token:

```jsonc
{ "sidebar": { "rows": ["status", "tps", "elapsed"], "tps": { "display": "both" } } }
```

Silence every toast with one key:

```jsonc
{ "notifications": { "enabled": false } }
```

Watchdog on for long runs:

```jsonc
{ "sidebar": { "rows": ["status", "caution", "cost", "elapsed"] }, "caution": { "enabled": true } }
```

## Requirements

- OpenCode `2.0.30`
- Node `>=22` or Bun `>=1.4.0`

## Links

- Repository: https://github.com/nathwn12/oc-flight-deck
- Package: https://www.npmjs.com/package/oc-flight-deck
- Issues: https://github.com/nathwn12/oc-flight-deck/issues
- OpenCode V2 plugin API: https://opencode.ai/v2/docs/build/plugins/cli
- Example config: [flight-deck.example.jsonc](flight-deck.example.jsonc)
- Config schema: [flight-deck.schema.json](flight-deck.schema.json)
- Local install routes: [INSTALL.md](INSTALL.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Releases: https://github.com/nathwn12/oc-flight-deck/releases
- Licence: MIT, see [LICENSE](LICENSE)

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
