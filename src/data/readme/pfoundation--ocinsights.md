# ocInsights

[![npm version](https://img.shields.io/npm/v/@pfoundation/ocinsights.svg)](https://www.npmjs.com/package/@pfoundation/ocinsights)
[![License: MIT](https://img.shields.io/npm/l/@pfoundation/ocinsights.svg)](LICENSE)

OpenCode plugin: a live insights deck over your session history and git repos. Where the time went, what it cost, which models were used — and which setups actually ship work.

While OpenCode is running: `http://127.0.0.1:4173/`

## What you get

Header KPIs (active hours · turns to ship · file edits · commits shipped · cost · tokens), then in pipeline order:

- **Time** — monthly hours by project, daily hours, tokens per day, work rhythm.
- **Inputs** — models per day (by model / family / provider), who is talking (your prompts vs subagent prompts vs replies), agents and models.
- **Output** — overall score (ten axes in six tiers, one score out of 100), human turns to ship, productivity by model (edits vs cost), shipping by model (edits vs steering, plus a funnel of how far work got).
- **Outcome** — shipping in commits (median lines vs commit count toggle).
- **Projects** — every worktree, with session depth.
- **Method** — the judgment calls, printed next to the numbers.

Global window / session-role / hide-small filters apply to every card at once.

## Installation

In `opencode.json`:

```json
{ "plugin": ["@pfoundation/ocinsights"] }
```

Restart OpenCode, then open `http://127.0.0.1:4173/`. The package has no runtime dependencies, so the first install is just this tarball (no minutes-long dependency download).

On opencode 1.x this loads the v1 surface (HTTP deck + edit ledger + auto-contribute); the TUI commands, RPC methods and agent tool need opencode2.

## Usage

- First request runs the extract (~15 s), then caches it for 5 minutes. `POST /refresh` forces a re-run; `GET /data.json` is the raw payload for scripting; `GET /health` reports status.
- TUI: `/insights` (or `ctrl+alt+i`) opens the deck, `/contribute` manages sharing.
- Agent tool: `insights_contribute` with `status | enable | disable | send` — "disable contributions" just works.
- Diagnostics: the plugin never prints into the terminal; logs live in `~/.local/share/ocInsights/logs/plugin.log` (`%USERPROFILE%\.local\share\ocInsights\logs\plugin.log` on Windows), one JSON record per line, rotated at 1 MiB with one backup. Set `OC_INSIGHTS_LOG_LEVEL` to `debug`, `info` (default), `warn`, `error`, or `off`.

## Configuration

| Plugin option | Env | Default | Notes |
|---|---|---|---|
| `port` | `OC_INSIGHTS_PORT` | `4173` | Deck + API port. |
| `host` | `OC_INSIGHTS_HOST` | `127.0.0.1` | Set `0.0.0.0` for LAN access — unauthenticated. |
| `ttlMs` | `OC_INSIGHTS_TTL_MS` | `300000` | Extract cache, 5 min. |
| `contribute` | `OC_INSIGHTS_CONTRIBUTE` | on | `false` / `0` opts out. Highest precedence. |

`~/.local/share/ocInsights/http.json` holds host/port/ttl as a file fallback; env wins, plugin options win over both.

<details>
<summary>Advanced extract overrides</summary>

- `OC_DB` (default `~/.local/share/opencode/opencode.db`), `OC_DEV_ROOT` (default `~/dev`, where the git repos live), `OC_GIT_AUTHORS` (comma-separated author names counted as yours), `OC_INSIGHTS_CACHE` (default `~/.local/share/ocInsights/data.json`).

</details>

## Sharing & privacy

Sharing is on by default: ~15 minutes after OpenCode starts (once sessions go quiet), the plugin sends per-cycle facts to the global Pragmatikos scorecard, then re-sends only what changed every 6 hours. One history is anecdote; pooled histories are evidence.

Opt out any of: `/contribute` toggle, deck Contribute panel, `OC_INSIGHTS_CONTRIBUTE=0`, or plugin option `contribute: false`.

<details>
<summary>Exactly what leaves your machine</summary>

One row per top-level cycle, 26 fields:

```
cycle_key day model prov role pm pp bm bp
u a tedits tpaths teerr tcost tship thrs tver tabort latmed tshipe
variant pv bv harness hversion
```

`cycle_key` is an opaque hash, not a session id. Never sent: session ids, file paths, worktree or project names, prompts, hostnames, usernames, token counts, commit data. Your install is a random UUID in `~/.local/share/ocInsights/contributor.json`, generated on first use.

</details>

## How it measures

| Metric | One-line definition |
|---|---|
| Active hours | Heartbeat: `min(gap, 10 min)` per message, 60 s for the first. Attention, not wall clock. |
| Attribution | Session belongs to the model behind most of its assistant messages (ids canonicalised, nothing bucketed as "other"). |
| Output | File edits: every `edit` / `write` / `patch` tool call. Line counts stopped in June 2026. |
| Verified / shipped | Verified: a build/test/lint command ran. Shipped: edits landed in your git within 7 days. |
| Turns to ship | Your prompts per shipped plan → build cycle; failed ships count against their model. |
| Overall score | Ten axes in six tiers (30/20/15/15/10/10), 0–100 with 50 at pool. |

The deck prints each definition on its card. Read per-model numbers as "how this model performed on the work it was given", not as a benchmark: heavy models get hard tasks, cheap models get lookups.

<details>
<summary>Full definitions</summary>

These are the judgment calls. They are printed on the relevant cards too, so a reader of the deck can question them.

**Active hours (heartbeat).** Messages are ordered per session; each message credits `min(gap to previous message, 10 min)` and the first message credits 60 s. Only `user` and `assistant` messages count. This is an estimate of attention, not wall clock: a session left open overnight contributes nothing for the idle span.

**Attribution to a model.** A session belongs to the model that produced most of its assistant messages. 96% of sessions have one model at 80% or more, so this loses little. Model ids are canonicalised first (`claude-opus-4-6`, `claude-opus-4.6`, `anthropic/claude-opus-4.6` and `claude-opus-46` are one model) — that is dedup, not grouping; nothing is ever bucketed as "other".

**Effort (variant).** Every assistant message also records the reasoning effort it ran at (`default`, `high`, `max`, `xhigh`, `medium`, `thinking`), and sessions do switch mid-way, so the effort is counted per message like the model and the dominant one wins each session, phase and cycle. The *model + effort* grouping ranks each model once per effort it ran at — a model used at two efforts is two entries — and keeps the family colours. The dominant model/provider pair is summed over efforts first, so turning efforts on never moves a model between pairs.

**Harness version.** Each session records the opencode version that ran it; the deck buckets releases to minor (`1.18`) and groups `0.0.0-beta-N` builds as `beta`, with the raw strings one hover away. The header chip shows the newest session's version; sessions inherit nothing, cycles inherit their session's.

**Output = file edits.** Every `edit`, `write` or `patch` tool call, parsed from message content. It is the one output signal recorded consistently across every opencode version. Line counts (`summary_additions`) stopped being written after 1.15.13 on 2026-06-05 and appear only as a supplementary column, capped at 10,000 lines per session.

**Roles and phases.** Build agents are `build`, `Sisyphus-Junior`, `Sisyphus (Ultraworker)`, `BuildAgent`, `beads-task-agent`, `general`; plan agents are `plan` and `Metis (Plan Consultant)`. A session's `agent` column is only the *last* agent it ran under, and 601 sessions switched from plan to build mid-way, so roles are taken from each message's own `agent` field. A session therefore has **phases**: its plan-phase hours, prompts, tools and (by hours share) cost, and its build-phase ones. Plan time is 293 h of 826, not the 107 h a last-agent reading gives. The global session filter selects phases; the productivity, shipping and commit cards default to group by family and pair the dominant planner with the dominant builder where available. The build-sessions-only scope applies when role is off, because explore, plan and librarian work reads by design and would make any model used for exploring look unproductive.

**Plan vs build, and planner→builder combos (productivity and shipping cards).** *Plan vs build* draws each model twice — its plan-phase work with a dashed border, its build-phase work solid. *Combos* pair the model that dominated a session's plan phase with the model that dominated its build phase, drawn with a double ring and labelled `plan → build`; the pair is credited with the whole session's output. Cross-model pairs are the interesting ones (fable-5 → grok-4.6 is the most common). On the commit cards the pairing is per commit window: the dominant plan phase among sessions active in the window (including plan-only sessions, kept as zero-credit advisors) and the dominant build phase among the sessions credited by file overlap. Planners never take shipping credit — file-overlap attribution is unchanged — they are only kept visible so the pairing exists.

**Verified / shipped (shipping card).** A session is verified if any shell command matched a build, test, type-check or lint tool (make, pnpm build, tsc, vitest, jest, pytest, playwright test, go test, go vet, cargo test, cargo check, cargo clippy, eslint, biome, ruff, mypy, pyright and similar). A session **shipped** if its edits landed in one of your git commits within 7 days of its start — read from the repositories, not from anything the agent ran. Shipping is judged only for sessions whose edit paths were recorded (see the ledger below); the column is blank for OpenAI providers, which never record them. Time to ship is the median hours from session start to that commit.

**Human turns to ship (turns card).** A cycle is a plan run followed by its build run; a new one starts every time the session returns to plan after building, and sessions that never touch plan or build are a single cycle. A cycle tree is the top-level cycle plus the subagent sessions folded into it — each descendant folds into the cycle whose span contains its first message. The cycle's turns are your prompts in it (child sessions carry exactly one `user` message, the delegation, so human engagement is `u` on top-level rows, and the turn that starts a cycle belongs to that cycle), while its edits, errors, cost and shipping come from the whole tree. Turns to ship is all your turns over ship-judged cycles divided by shipped cycles: a failed ship's turns count against its model. A judged cycle is ship-judged unless its 7-day ship window is still open (pending — the outcome is not yet knowable) or the window closed on a worktree that is not a scanned repo or received no commit in it (unshippable); pending and unshippable cycles stay in every process axis but leave the ship rate and the per-ship costs. Cycles with no edits are excluded outright, which is what keeps few-turn failures from looking good. Steer share is the share of your turns after the first per cycle; one-shot is shipped cycles that needed only the request and the plan approval, with no corrections during build. A cycle's planner → builder pair is its own plan and build models, so a session that switches models mid-way contributes each cycle to the right pair. The per-10-shipped-edits toggle adjusts for task size. The profile charts default to a relative-to-pool scale: every value is a log2 ratio (log odds for ship % and edit OK %) to its pooled value on a fixed ×4/÷4 span, so ×2 right of the pool line means twice as good on every row and every radar spoke (the middle ring is the pool, 50 on the core score). Min–max is one click away and keeps the per-axis extremes. The three primary axes are turns to ship, ship rate and edits per turn — cost per delivery, reliability of delivery, output per turn; the core score is their normalised mean, 0 to 100. Agent quality (edit reliability, replies per turn) explains them; dollars per costed shipped cycle sits last and is never primary. **Evidence weighting.** Small groups are shrunk toward the pooled value: `adjusted = (n·value + 10·pooled)/(n + 10)` with `n` = shipped cycles for turns and dollars, ship-judged cycles for the ship rate, judged cycles otherwise, so a 2-cycle group nearly vanishes into the population while a 100-cycle group barely moves. The card opens weighted; raw is one click away and tooltips show both. The header KPI is the pool itself, so it stays raw.

**Overall score.** Ten axes in six tiers, weighted 30/20/15/15/10/10: outcome (ship rate over ship-judged cycles, one-shot rate) · cost of a ship (turns and active hours per shipped cycle; dollars per costed shipped cycle — subscription ships that recorded no cost are excluded from dollars only) · precision (tool error rate, abort rate) · discipline (share of judged cycles with a verify command after the last edit) · efficiency (edits per turn) · latency (median seconds per assistant step over valid steps — `time.completed − time.created` between 0 and the 10-minute heartbeat cap). The score is the weighted mean of tier means, 0 to 100 with 50 at pool; every axis is a log ratio (log odds for the three rates) to its pooled value on a fixed ×4/÷4 span. Every axis comes from cycle trees in every view — turns, hours and cost on shipped cycles for the cost tier, tree edits/errors/cost/hours/verified/aborted flags otherwise. Missing axes redistribute within their tier; a tier with no data scores 50 and is marked *. Aborts are tool calls the human stopped (aborted, interrupted, cancelled, permission rejected or declined) and are not counted as errors. Commit-window metrics (hours per commit, lines per commit) are excluded — keyed per commit, not per session group. Same strips/radar mechanics as the turns card, ranked by score, with a top-3 weight-sensitivity line. Setups under 10 judged cycles are listed but never ranked. Click two rank rows (or two radar shapes) to pin them and read the axis-by-axis delta underneath. Everywhere in the deck a prompt is one of your turns on a top-level session; subagent delegation prompts are excluded. Axis labels, spokes and background wedges are green when higher is better and red when lower is better, with the green axes grouped at the top of the radar. The radar defaults to raw magnitudes — outward is more on every axis, so a rim red vertex is worse — and the score still reads better = 100 either way. The all-in turns and dollars per shipped cycle (ship-judged work included) and the edit yield sit in the tooltip, displayed but not scored.

**Commits (commit cards).** Your own commits, all branches, merges and bots excluded, read from each repo with `git log --numstat`. A commit's window runs from the previous commit in the same repo to the commit, capped at 72 h, plus 5 min grace. The commit is credited to the cycles whose recorded edits inside the window touched files in it, weighted by how many of its files each touched; each share goes to the cycle phase's dominant model. Cycles that were active but touched none of the commit's files get **no credit** — they advised, they did not ship — and are counted as *advised only*. Cycles that edited in the window but never had a path recorded fall back to a split by active minutes, flagged *by time* in the summary line and in each model's tooltip. Commits with no agent activity at all are the manual bucket. Prompts per commit credits cycle prompts to the window in proportion to active time. Lines come from git, so they cover every era.

**Edit paths — the edit ledger.** File-overlap attribution needs one fact per edit: when, which session, which file. opencode records it in the message JSON (still, through September 2026), and also recorded it in the legacy `part` table from February to August. opencode has already dropped two data sources without notice (line counts, the part table), so the `oc.insights` plugin appends that same fact to `~/.local/share/ocInsights/edits.jsonl` on every edit/write/patch tool call, in a directory opencode does not own. `make install-plugin` adds this repo to global `plugins` (and removes the old `editLedger.ts` symlink); `make smoke` proves the hook records through a fresh `opencode2 run`; `make smoke-http` proves `/health` answers; `make ledger` shows what it has collected and the last plugin load line from opencode's log. Extract unions all three sources per session; paths are made relative to the directory each session ran in, which also handles the `v0-dashboard → datastudio` rename and opencode's temporary git worktrees. The **edit-path coverage** strip on the commit card shows each source's share of the month's edits, and the header carries a chip when the ledger is inactive or more than a day behind the database — so if opencode's record stops carrying paths, the deck says so instead of silently falling back to the time split.

**Tokens per day.** Fresh tokens = input + output + reasoning; cache reads are reported separately because they are 67× larger and would flatten everything. Per-message token blocks exist on only ~10% of messages, so each session's tokens are split across the days its messages fall on, weighted by active time.

</details>

<details>
<summary>Global filters</summary>

Three controls in the sticky header apply to every card at once and to the KPIs:

- **Window** — all time, or the last 90 / 45 / 30 / 7 days, anchored to the latest day with activity (not the wall clock, so the deck is stable).
- **Sessions** — all, build, plan, or other agent types. Hours, models per day and every per-model card follow it. Day-level series that have no session role (tokens per day, work rhythm) stay unfiltered by role.
- **Hide small entries** — under 5 commits on the commit card, under 5 sessions on the model cards, under 5 judged sessions on the turns card, under 5 hours for projects, under 5 active days for models per day. Totals and shares are still computed on the full set.

Per-card controls (group by, metric toggles, the commit card's plan-vs-build split, planner→builder combos and y-axis, the productivity and shipping cards' build-only toggle) stay local and remember their state across filter changes. When a global session role is set, the local build-only toggles hide, because the global scope already decides.

</details>

<details>
<summary>Caveats</summary>

Selection bias: heavy models get hard tasks, cheap models get lookups. Models were used in different eras with different tooling. Task size confounds turns to ship — thirty turns for a feature beats two for a typo — which is why the turns card also reads turns per 10 shipped edits. Commit attribution is evidence-based but still not proof — a commit can include hand edits made alongside the agent, a window can hold more than one feature, and files changed by shell commands (generated code, lockfiles) do not appear as edits. Read every per-model number as "how this model performed on the work it was given", not as a benchmark.

</details>

## Requirements & notes

- OpenCode with either plugin API: v2 (opencode2, full features) or v1 (1.x, verified on 1.18.21; HTTP deck + ledger + auto-contribute only) — plus `bun` and `git`.
- The database is opened read-only; nothing here writes to OpenCode.
- The server listens on loopback by default; `0.0.0.0` is opt-in and unauthenticated.
- The deck shows cost figures and project paths — think before sharing a snapshot with a different audience.
- Formerly ocProductivity: on first load the plugin renames `~/.local/share/ocProductivity` to `~/.local/share/ocInsights` if the new path is absent, so the install UUID and edit ledger survive.

## Development

See `AGENTS.md` for the full contributor guide (architecture, metric pipeline, gotchas).

<details>
<summary>Repo layout & commands</summary>

```
index.ts           root re-export (opencode resolves directory plugins to <dir>/index.ts)
tui.ts             root re-export for the TUI side (/insights, /contribute)
plugin/            OpenCode plugin (id oc.insights)
  ledger hook      every edit/write/patch -> ~/.local/share/ocInsights/edits.jsonl
  scheduler        auto-contribute: first send ~15 min after load when quiet, then every 6 h (diff-based)
  agent tool       insights_contribute (status|enable|disable|send)
  HTTP singleton   127.0.0.1:4173  GET /  GET /data.json  GET /health  POST /refresh  POST /contribute  POST /contribute-toggle
  on request       plugin/metrics in a Bun Worker -> ~/.local/share/ocInsights/data.json (~15 s, cached 5 min)

plugin/metrics     one read-only pass over opencode.db + `git log` per repo -> data.json
plugin/build.ts    data.json + template.html -> HTML string
plugin/cli.ts      extract | build | install | template | diff | contribute
verify.mjs         opens the built deck in headless Chromium, 116 checks
template.html      the deck's CSS and JS with @@PLACEHOLDERS@@ where data goes
```

```bash
make install-plugin   # add this repo to global opencode plugins; restart opencode
make                  # extract -> build -> verify (about 20 seconds)
make serve            # HTTP server without OpenCode (same port)
make publish-npm      # typecheck, pack dry-run, npm publish
```

Verify needs node with Playwright (it falls back to `~/dev/datastudio/node_modules/playwright` if none is installed here). Publishing to npm locally needs `npm login` (with 2FA if the package disallows tokens); the tag workflow authenticates via the npm trusted publisher instead (no secret).

</details>

## Links

- [Changelog](CHANGELOG.md)
- [License (MIT)](LICENSE)
- [npm package](https://www.npmjs.com/package/@pfoundation/ocinsights)
