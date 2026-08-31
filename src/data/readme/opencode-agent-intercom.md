# opencode-agent-intercom

> **Make your local LLM ship real features. Without the wait. Without the context bloat.**

**Built for local LLMs in the 3–40 B range** (currently tested daily on a 9 B
model). Designed around the failure modes of small models — short contexts,
shaky planning, weak tool selection — not retrofitted from a frontier-model
pattern.

You spin up a local model on your own hardware, point
[opencode](https://opencode.ai) at it, and… it kind of works. Edits one file,
then forgets the project. Calls `task`, your terminal hangs for four minutes,
comes back with garbage. Melts down at 80 % context. You go back to the cloud.

**This plugin closes that gap.**

It turns a modest local model into a workflow-driven team. A long-living
**primary** that coordinates and **never blocks** — keep steering,
course-correct mid-flight, or fan out subagents in parallel while the first one
runs. By default a subagent does exactly one job in its own lean context, replies,
and disappears; with retention on its session is held so the orchestrator can `reuse` it later. The framework guards your model's most precious resource — its
context window — at every layer.

The difference between *"interesting demo"* and *"this just shipped feature X."*

## Install

```sh
npx opencode-agent-intercom-install
```

That is the whole setup. The installer wires both halves of the plugin
(server-side + sidebar TUI), builds universal-ctags so `outline` works, fetches
Chromium for the `pw` browser CLI, and writes a `.bak` of every config file it
touches. Restart opencode. Done.

### Global wiring (active everywhere)

For the plugin to load in every project, without per-project config, add the
absolute path to both halves of the user-global opencode config:

- `~/.config/opencode/opencode.json` — `"plugin": ["/absolute/path/to/opencode-agent-intercom"]` (server half)
- `~/.config/opencode/tui.json` — `"plugin": ["/absolute/path/to/opencode-agent-intercom"]` (TUI half; `tui.jsonc` also accepted)

opencode honours `${XDG_CONFIG_HOME:-$HOME/.config}/opencode/opencode.json`
and `${XDG_CONFIG_HOME:-$HOME/.config}/opencode/tui.json` for the global
config. Global and project plugin entries merge rather than replace — a later
entry of the same identity wins, and an absolute path works identically from
either place. With both global entries present the plugin loads in any
directory, with no `opencode.json` and no `.opencode/` needed.

### Manual fallback (project-scoped)

Add `"opencode-agent-intercom"` to your project's
`opencode.json` `plugin` array and `"opencode-agent-intercom-tui"` to
`~/.config/opencode/tui.json` (user-global, **not** the project file). The TUI
plugin does **not** resolve from a directory path — for a local checkout,
point at the built file directly (`/path/to/.../tui/dist/tui.js`, after
`npm run build` in `tui/`).


### How you actually see it

After restarting opencode, two things still have to happen before the
`Subagents` panel paints:

1. **Turn on the sidebar.** opencode ships the sidebar hidden. The toggle is
   the opencode command `session.sidebar.toggle` (palette entries `Show
   sidebar` / `Hide sidebar`, default keybind `<leader>b` — i.e. `Ctrl+X`
   then `b`). Without this step the plugin loads but you see nothing of it.
   Note: when the sidebar is already open the palette offers `Hide sidebar`,
   so a literal search for `show sidebar` returns no result — that is the
   command doing the right thing, not a missing entry.
2. **Enter or create a session.** The panel only renders on a session
   route — the home screen has no sidebar slot. Open or start a session
   and the right sidebar (its own column beside the content, not an
   overlay) shows `Subagents (N)` with `● N running · ✓ M done · ◆ K retained`
   counters (`◆ K retained` only when something is held), agent rows with an
   `x` abort control and an age, plus `max subagents`
   and a per-agent-type context ceiling: an agent cycler and the selected
   type's ceiling in k tokens (with `★` marking a type that has its own
   value and `off` for a ceiling of `0`; stepping a type's own value below
   zero drops the entry so it falls back to the inherited ceiling again),
   plus the selected type's reuse ceiling as `reuse Token(k)` (the same
   own-versus-inherited marker; `0` means never reused), plus the selected
   type's reply ceiling as `result Token` (whole tokens rather than
   thousands, stepped in 500s; `0` means that type's reply is never cut),
   and the orchestrator's system prompt also carries a `Limits` block with headroom per agent type — each entry lists the budget, the fixed overhead (subagent guides, PROJECT.md, the project snapshot prepended to every spawn, AGENTS.md where that type keeps it) and the headroom left for the orchestrator's prompt and the subagent's work, in the form `coder 100.0k (−12.4k fixed → 87.6k)`. The fixed overhead occupies part of every budget before the orchestrator's words do; the limits block names it so the orchestrator can see why its own prompt has less room than the bare budget suggests. The work-package size gate below measures the package against the same budget the headroom was computed from. The same block names `off` for any type whose budget is disabled. The sidebar itself also exposes collapsed `TUI settings` / `LLM params` / `Prompts` sections.
   SDK's `layout` field is `"auto" | "stretch"` and marked deprecated with
   "Always uses stretch layout", and `tui.json` has no `sidebar` block,
   no width, no position. The column takes its width from the content
   area and that is not configurable.

The plugin manager (toggle the plugin on/off, install updates) lives at
`Ctrl+P` → `Plugins` → `Enter`. Inside the panel, `Alt+A` focuses the
subagent list; `j`/`k` move, `Enter` opens a session, `x` aborts.

Each live row is labelled `handle · topic (Model)` — for example
`coder#1 · Searching fo… (Luna)` — with the `↳ <age> · <k> ctx` line
unchanged beneath it. The **topic** is the opencode session title: the
spawn tool sets it from the `description` argument, and where the caller
gave none the title falls back to the opening characters of the task
prompt with a redundant `<agent>: ` prefix stripped before display. The
**model** is the agent's own entry in `~/.config/opencode/llm-models.json`,
shortened to its display name before any parenthesis; an agent with no
configured model renders the row without that parenthesised part at all.
The parts are sized against the panel's actual laid-out width: the
handle is kept whole, the model next, and the topic takes the remainder
and is dropped below a minimum rather than wrapping the row onto a
second line.

## What this gives you that stock opencode doesn't

- **The primary never blocks. Ever.** opencode's native `task` is blocking —
  your terminal sits there. Our `spawn` returns in ~200 ms. Keep typing, ask
  the orchestrator something, fan out three more subagents in parallel. The
  primary is yours, always.

- **A primary that lasts dozens of turns.** Hard tool-gating on the
  orchestrator (it coordinates only — no edits, no shells), a per-type token
  ceiling on subagent replies, and a live snapshot of running work injected each turn
  instead of a status-poll tool. Its context stays clean for the long haul.
  When the orchestrator's context does approach the limit, the plugin hands
  the session off to a fresh orchestrator — the threshold is configurable
  (`OPENCODE_AGENT_INTERCOM_MAX_PRIMARY_CONTEXT`, default 80 000 tokens), and
  **endless mode** raises it to a much higher ceiling for a self-restarting
  loop. Both paths share the same handoff mechanism.

- **No MCP servers — and that's the *feature*.** Every MCP server permanently
  injects 1–2 KB of tool descriptions into *every* LLM call. For a 200K
  frontier model: fine. For your 32K local model: **5 % of your window, every
  turn, forever**. We ship custom thin tools instead — `web_search` at ~300 B,
  plus `outline`, `pw`, `gen`. Same capabilities, a fraction of the cost.

- **`outline` over `read`.** Which file defines `processInvoice`? Outline six
  candidates (one line of signatures each) instead of `read`ing all six and
  drowning your model in 40 KB of unrelated bodies. **~95 % token savings**
  vs `read` for orientation, measured.

- **Role-aware prompt slimming.** Roles that do not need `AGENTS.md`
  (`researcher`/`designer`/`gitter`) get it stripped — ~17 KB saved per LLM
  call for those roles. opencode's "you are powered by …" boilerplate is
  stripped globally for all roles.

- **A TUI sidebar that is a *co-pilot*, not a viewer.** Live-tunable subagent
  concurrency, context budget, per-agent sampling params (temperature, top-p,
  min-p, repeat-penalty…), visibility toggles, subagent list always on screen,
  hot-repeat on `[-]`/`[+]`. Every change live on the next LLM call.

- **A structured workflow baked into the system prompt.** Definition → design
  → architecture → milestones → tasks → implementation → review. State lives
  in `AGENTS.md`, so your project is resumable across restarts. Zero
  per-project prompt engineering.

- **Graceful context-limit handling.** When a subagent runs out of context, it
  does not die and it does not hallucinate. The plugin tells *the parent*
  (which still has headroom) so the orchestrator can re-plan. We never
  auto-abort. You are always in charge.

- **Nine consolidated roles**, not 11+. Orchestrator + 8 specialists, each
  with a narrow, complete prompt. We tried more. Fewer was better — small
  models pick decisively when the menu is short.

Add it up: a stock opencode orchestrator turn costs 20–25 K prompt tokens.
Under this plugin: 5–10 K. Your model spends what is left on actual
*thinking* — not on re-reading its own toolbox.

## What a session feels like

```
you: implement a search modal with keyboard shortcuts
orchestrator: spawning coder#1...
              (200 ms later — your turn is back)

you: actually also make sure it works on mobile
orchestrator: noted. I'll have coder#1 cover both, and I'll
              spawn designer#1 for the visual. Slot 2/2 used.

[both subagents working in parallel — you keep typing]

you: how's it going?
orchestrator: coder#1 is at 6 K ctx, editing src/search/modal.tsx.
              designer#1 just finished — output at designs/search.webp.

coder#1 idle: implemented + tests passing. Files: src/search/modal.tsx,
              src/search/modal.test.tsx. Want a reviewer pass?

you: yes
orchestrator: spawning reviewer#1...
```

The primary never blocks. You stay in the driver's seat the entire time.

## Tools

| Tool | Purpose | Who |
|---|---|---|
| `spawn(agent, prompt, description?)` | Start a subagent non-blocking. Returns a handle (`researcher#1`). Sizes the work package against the agent's context budget — refused over 40 %, warned over 20 %, gated off when the type's budget is `0`. Unknown agent types are refused and the refusal lists the accepted set. | Orchestrator |
| `abort(subagent)` | Cooperatively abort and hard-deny further tool calls. User-requested stops. | Orchestrator |
| `list()` | List active subagents. | Orchestrator |
| `task` | Denied everywhere. opencode's native tool is blocking; the schema strip hides it. | — |
| `todos_open()` | List open tasks from `TODO.md` with their stable id (`T5`) and `accept:` criterion. | All agents |
| `todo_add(title, accept?)` / `todo_edit(id, …)` / `todo_done(id)` | Add / refine / remove a task in `TODO.md`. `todo_done` deletes the completed task — usually the wake-hook does it for you. | The six deliverable roles |
| `web_search(query, numResults?)` | Anonymous web search via Exa (no key, 150/day; an Exa key lifts the cap). | `researcher` only |
| `forum_search(query, keywords?, numResults?)` | Discussion-forum search (Exa + searxng with forum-only engine bangs). Use for lived user experience; `web_search` for docs/releases/official facts. | `researcher` only |
| `outline(path)` | Top-level declarations of a source file via universal-ctags. ~100 languages, ~95 % token savings vs `read`. | Subagents (except `designer`/`gitter`) |

By default a subagent runs once and is destroyed: **spawn → run → reply →
deleted.** The primary is woken automatically with the full (capped) result on
completion. No status-poll tool by design — small LLMs would call it in a
loop.

A finished subagent's session can also be **held** — kept alive after its
result has been delivered, so the orchestrator can address it later. Holding
is gated on `maxRetainedSubagents > 0` and is off by default; with retention
off the default description above is the whole story, and the orchestrator
loses the `reuse` tool.

With retention on, every clean, top-level subagent whose context fits under
the reuse ceiling is held for `retainedSubagentTtlMs` after it finishes, the
oldest entry is evicted when the capacity is reached, and a held session is
reaped once its window runs out — none of which changes what the orchestrator
receives at wake time. `list()` renders the held ones in a `RETAINED` section,
the per-turn snapshot does the same, and the next tool addresses them.

The reuse tool:

| Tool | Purpose | Who |
|---|---|---|
| `reuse(subagent, prompt, mode?)` | Put a follow-up to a retained subagent — a question (the default, `mode: "question"`) or a further related piece of work (`mode: "task"`). Refuses when the session's context is over the per-type reuse ceiling, when the prompt would push it over its budget, when the window has run out, when the handle is unknown or foreign, when the caller is itself a subagent, or when the snapshot fetch fails — each refusal names the rule that fired and the figure it fired on, and `spawn` is always the way forward. | Orchestrator |

Reach for `reuse` when something about a finished reply strikes you later
("which of the two did you mean?", "did you also look at X?") — the held
session already has the context, so a follow-up costs no re-briefing and no
re-reading. Reach for `spawn` instead for work that is new, for work the held
session's own history would push the wrong way, and after a `Blocked:`
report (a blocked task continues through a FRESH subagent carrying the
decision, never through the one that stopped).

At every opencode restart the plugin also runs a one-shot **bootstrap sweep**
of its own opencode sessions — anything left over from an earlier process
whose title is this plugin's marker and that has been idle for longer than
twice the retention window is deleted, so a retention that survived a
process crash or a manual restart does not leak into the new instance.

When a subagent hits a problem its spawn prompt did not cover — a blocker, a
missing precondition, an ambiguity, a tool that keeps failing, a decision
that is not its to make — it stops that step, still finishes every part of
the task that does not depend on it, and opens its final reply with
`Blocked:` naming the problem, what it completed, and what it needs to go
on. The matching wake notice says the subagent "came back BLOCKED and was
destroyed" and treats the report as a **decision for you**, not a failed
run to retry: decide what happens about the problem and whether the
original task continues; where it continues, spawn a FRESH subagent
carrying that decision. Never re-send the same prompt — the previous one
is gone — and never tell a subagent to work around a blocker it reported.
A blocked report carries no `DONE: <id>` marker by design, so the matching
`TODO.md` entry stays open until you decide.

The delegating subagents (`planner`/`coder`/`debugger`/`reviewer`/`documenter`)
also carry `spawn`, but it is gated to the single target `researcher` and
the call **blocks** until that researcher replies: there is no wake, no
second ask, and the researcher's reply comes back as the result of the
`spawn` call. The spawn prompt sent in this path carries no `T<n>:` prefix
and no `DONE:` marker is expected. A per-run quota
(`maxNestedSpawns`, default `2`, env
`OPENCODE_AGENT_INTERCOM_MAX_NESTED_SPAWNS`, `0` disables) bounds how many
such nested runs one subagent may start; the messages hook appends a per-turn
notice to the last user message naming what is left. `researcher`, `designer` and
`gitter` are denied
`spawn` outright. `abort`, `list` and `task` are denied for every
subagent.

### Work-package size gate

`spawn` measures the package it is about to send — the project context the
plugin prepends plus the orchestrator's own prompt — against the context
budget of the agent type it is going to. The figure is an estimate
(characters divided by four), the same estimator the limits block uses.

- **Above 40 % of the budget** — refused before any session is created. The
  refusal names the measured size, the budget and the threshold so the
  caller can split the work into smaller packages.
- **Above 20 % of the budget** — goes ahead, with a warning line on the
  spawn result reporting how much of the budget the package took and how
  much headroom is left for the subagent's own work.
- **At or under 20 %** — spawns silently on that axis.

A budget of `0` for a type disables the gate for that type: no refusal, no
warning. The limits block the orchestrator sees lists `off` for a
disabled type.

A `spawn` may name one of the plugin's own eight subagent roles and
nothing else. Any other name is refused — including an agent the project
declares in its `config.agent` map and opencode's own `general`/`explore` —
and the refusal states why that particular name is not a target and lists
the eight. The same closed list is what the limits block shows.

When a subagent finishes, the completion notice carries a `run-size` line
that reports the tokens the whole run consumed against the same budget,
with the spawn-time package figure printed beside it. The run-size
measures the whole run, not just the package — system prompt, every
tool result, the model's own output — and the two figures separate an
oversized prompt from a task that sprawled while it ran.

For a parent whose subagent had children of its own (a subagent that
started one or more nested `researcher` runs) the notice carries an
extra `⤷ nested:` line naming what those nested runs consumed (count
and tokens, not counted in the parent's own figure above).

### Task tracking that doesn't depend on the model remembering

`TODO.md` is the single source of truth for what's still open in the current
milestone. A deliverable-role subagent is spawned with a stable task id
(`spawn("coder", "T5: implement the export endpoint")`), it ends its reply with
a one-line marker (`DONE: T5`), and the wake-hook removes that task from
`TODO.md` for you — **deterministic, no LLM step**. A task in the file is open;
"done" means the line is gone. Mismatched ids (`spawn for T5` but `DONE: T3` in
the reply) are ignored as hallucinations. The format is fixed:

```
- T5: <task title>
  accept: <one-line, observable "done" criterion>
```

The `T<n>:` prefix on a spawn prompt is opt-in: present it and the
wake-hook auto-removes the task on a matching `DONE:` line; leave it off
(status checks, ad-hoc questions) and the spawn runs without tracking. Any
agent can read fresh state via `todos_open()`; the deliverable roles manage the
list with `todo_add` / `todo_edit` / `todo_done`.

## Agent roles

Nine roles injected by the `config` hook — no per-project
`.opencode/agents/*.md` needed. Orchestrator is the default primary unless
`default_agent` is explicit.

| Agent | Role | Notes |
|---|---|---|
| `orchestrator` | Primary. Coordinates only. | Restricted to `spawn`/`abort`/`list`. |
| `planner` | Concept/design docs in `plans/`. | No `bash`, no web — version facts come from a `researcher`. May spawn a `researcher` for web lookups. |
| `coder` | Implements code in thin vertical slices. | Bash, edit, build/test. No web. Catch-all. May spawn a `researcher` for web lookups. |
| `debugger` | Diagnoses build/test/runtime errors. | Bash for repro, no `edit`/`write`, no web — fix goes back to `coder`. May spawn a `researcher` for web lookups. |
| `reviewer` | Reviews staged work into `reviews/`, iterates on it. | No `bash`, no web. Convention: no source-code edits. May spawn a `researcher` for web lookups. |
| `documenter` | Writes/iterates user docs in place (README, `docs/`, changelog). | No `bash`, no web. Convention: no source-code edits. May spawn a `researcher` for web lookups. |
| `researcher` | Web research via `web_search` + `forum_search` + `webfetch`. | The only role with web access. No `edit`/`write`/`bash`. `spawn` denied — names needed lookups in the final reply instead. |
| `designer` | Generates images via [`gen`](#gen--image-generation-no-api-key). | No `outline`, no web. Convention: no source-code edits. `spawn` denied — requests visual references in the final reply instead. |
| `gitter` | Repo operations matching project's git style. | No `edit`/`write`/`webfetch`/`web_search`/`forum_search`. `spawn` denied. |

A project can override any role by defining one of the same name — either
through `.opencode/agent/<name>.md` (a markdown agent file opencode loads
into `config.agent[name]`) or through an explicit `agent` entry in the
project's `opencode.json`. Overrides are **reported, not refused**: the
plugin never drops a project's entry and never refuses a spawn because of
one. See [Project files that override this plugin](#project-files-that-override-this-plugin)
for what gets reported and how to silence a report.

The orchestrator is identified through a resolution chain, not through a
hard-coded `orchestrator.md` lookup: the name recorded from the
`chat.message` hook, then the `# Role:` header in the system prompt, then
the `default_agent` the project set. A primary that the project renamed
(e.g. `default_agent: "build"`) loads `build.md` and stops loading
`orchestrator.md`. `ORCHESTRATION_GUIDE` still goes in unconditionally,
because the protocol it carries is a property of the three tools, not of
the role name.

## Project files that override this plugin

Two kinds of project file can silently displace what this plugin installs:

1. **A markdown agent file or `opencode.json` entry that shares one of the
   plugin's nine role names** — `prompt`, `permission`, `model`,
   `description`, `mode`, `hidden` or `color` from that entry overrides
   the plugin's value of the same field. `prompt`, `model` and
   `description` are the user's to own, so the plugin records that they
   were replaced and moves on. `permission` is different: opencode
   materialises an empty `permission` object on every markdown agent
   whether or not the author wrote one, so a wholesale overlay reads "the
   author said nothing" as "grant this role everything" and hands a
   `coder.md` with no frontmatter the web tools this plugin denies it.
   For that reason `permission` is the one field that merges **per tool
   key** — the plugin's denies are the base and each key the project
   names wins over them. A `read: allow` line still wins; a project map
   that names no key expresses nothing to overlay. The deny keys the
   project did not relax are listed in the report as "this plugin's
   deny stays in force for …". Overriding `mode` on one of the plugin's
   roles changes what opencode's own agent switcher and `task` catalog
   show; it does not make the role unspawnable and does not remove its
   context-ceiling row in the sidebar, because the spawn gate and that
   list both read the plugin's own role set and neither consults `mode`.
2. **A customised prompt file under
   `.opencode/agent-intercom/<agent>.md`** that predates a change to the
   plugin's prompt contract. The prompt contract covers the four elements
   the plugin relies on subagents to carry — the `Blocked:` report, the
   `DONE: T<n>` marker, the orchestrator's `spawn` protocol, and the
   delegation block a spawning role needs. The default file
   `bin/init-prompts.js` writes for each role substitutes the guide
   blocks at call time through a `{{guide}}` placeholder and carries a
   numeric contract stamp in its top-of-file comment, so a freshly
   rendered file cannot go stale on its own. A file that carries a stamp
   is judged by that stamp alone — it is reported once the plugin's
   contract number moves past it. A file with no stamp, which is every
   file written before the stamp existed, is judged by whether its text
   still carries those four elements. What a stamp guarantees is fixed on
   the plugin's side: the rendered text of the four elements is pinned per
   contract number in `test/fixtures/prompt-contract.json`, so the number
   a file carries names a known wording rather than whatever the guides
   happened to say.

Both kinds are reported through three outlets:

- **A debug log line at detection** — `override: project agent entry` or
  `override: stale prompt file`, written to
  `~/.cache/opencode-agent-intercom/debug.log`. Full finding with the
  field list and the source file path.
- **A warning toast, once per project directory per opencode process**,
  on the first primary transform that has findings to show — `<N> role(s)
  overridden by project files, <M> prompt file(s) out of date — see the
  orchestrator's first answer`. Two projects served by one process each
  get their own toast; a second session in the same project does not
  repeat it, and neither does a finding that appears later in the
  session: once the toast is spent, the orchestrator's block is the only
  outlet for anything found afterwards. The orchestrator reports the
  substance in its next answer, where a toast alone would already be
  gone.
- **A block in the orchestrator's stable system prompt**, listing every
  finding with role, displacement, source file and the instruction to
  pass it on once. The block lives in the cached stable element, so its
  text never moves inside a turn; between turns it moves only where a
  file on disk changed. The prompt files are re-judged whenever the
  orchestrator's session goes idle, so a file repaired mid-session loses
  its finding on the next turn, with no restart.

How to silence a report:

- For a markdown-agent collision: remove the file, or rename the agent so
  it no longer shares one of the plugin's nine role names, or accept the
  override and leave it. There is no way to keep the file, keep the name
  and clear the report for `prompt`: a markdown agent's prompt is the file
  **body**, not a frontmatter key, and an empty body still resolves to a
  prompt the plugin honours in place of its own. `permission` is the one
  field with a middle course — the report names only the keys the file
  actually took away, so a frontmatter map that names no key produces no
  permission finding. Whichever course you take, this finding stands for
  the life of the opencode process: opencode folds project agent files
  into its config once, at instance bootstrap, so the file's effect and
  the report of it end together, at the next restart.
- For a stale prompt file: re-render it (`bin/init-prompts.js` writes the
  current contract with the `{{guide}}` placeholder and the contract
  stamp) and overwrite, or paste in the guide text the placeholder would
  have substituted at call time to freeze it deliberately — a file frozen
  that way is clean while its stamp matches the plugin's contract number,
  and is reported again when that number moves past the stamp. Either way
  the finding clears on the turn after the edit: the prompt files are
  re-judged whenever the orchestrator's session goes idle, so a
  mid-session repair needs no restart.

Findings are scoped by project directory, so two projects in one
opencode instance each receive their own block; the per-key `permission`
merge is also applied per instance. A subagent's project directory
contributes its findings to the orchestrator's block, because the
register is process-scoped.

## The TUI sidebar (companion plugin)

[`opencode-agent-intercom-tui`](tui/README.md) is the user-side co-pilot,
installed by the command above. Surfaces the live subagent snapshot and
exposes every runtime knob:

- **Subagent list** — open-session, abort (✕), keyboard navigation.
- **`max subagents [-N+]`** and a per-agent-type context ceiling —
  an agent cycler plus the selected type's ceiling in k tokens, with `★`
  marking a type with its own value and `off` for a ceiling of `0`.
  Writes `~/.config/opencode/agent-intercom.json` as
  `"agentContext": { "<agent>": tokens }`, picked up within ~2 s.
  A type with no entry of its own falls back to the flat legacy
  `maxContext` key in the same file, then to the env var
  `OPENCODE_AGENT_INTERCOM_MAX_CONTEXT`, then to a built-in per-type
  default, then to 100 000. `0` is a real value at every level and means
  the budget is disabled for that type.
- **`reuse Token(k)`** — the selected type's reuse ceiling, the maximum
  context under which a held subagent of that type may be re-prompted. The
  same agent cycler edits it; the same `★` marks an own value, `0` means
  that type is never reused. Writes
  `"reuseContext": { "<agent>": tokens }` and inherits the flat
  `maxReuseContext` (env `OPENCODE_AGENT_INTERCOM_MAX_REUSE_CONTEXT`,
  default `70000`) wherever the map has no entry.
- **`result Token`** — the selected type's reply ceiling, the maximum number
  of tokens of that type's final reply forwarded to the orchestrator.
  Everything past it is cut out of the wake notice and written to a file the
  notice names. The same agent cycler edits it; `★` marks an own value, the
  row shows `off` at `0`. Writes `"resultTokens": { "<agent>": tokens }` and
  inherits the flat `maxResultTokens` (env
  `OPENCODE_AGENT_INTERCOM_MAX_RESULT_TOKENS`, default `2000`) wherever the
  map has no entry. Stepped in 500s (the other two rows step in thousands).
- **`retained subs [-N+]`** — how many finished subagents the process holds
  at once; `0` switches retention off and the sidebar then has no held
  rows. Writes `"maxRetainedSubagents"`.
- **`retain (min)`** — the retention window in whole minutes, the unit the
  row is shown and stepped in. Writes `"retainedSubagentTtlMs"` in ms; the
  row's floor is one whole minute. A `0` typed by hand into the file
  resolves to `1` ms at the plugin, since nothing else ever deletes a
  subagent session.
- **`endless mode [on/off]`** / **`endless (k)`** — arms the self-restarting
  orchestrator loop and sets its context threshold.
- Under **`TUI settings`**: **`thinking [on/off]`** and **`tool details
  [on/off]`**, opencode's built-in visibility toggles, plus **`show agentcom
  [on/off]`**, which decides whether the plugin's own notices (subagent
  completion messages, handoff kickoffs, doc-summary prompts) appear in the
  transcript. With it off, the text part the plugin posts is stamped
  `synthetic: true`, which opencode's TUI does not render; the model still
  receives the text unchanged, so the orchestrator keeps being woken and keeps
  receiving its subagent results. The task prompt sent to a subagent stays
  visible whatever the switch says — it is the subagent's entire instruction,
  not chatter — and tool results stay under opencode's own
  `tool_details_visibility`. Writes
  `~/.config/opencode/agent-intercom.json` as `"showAgentcom": true|false`,
  picked up within ~2 s; env var `OPENCODE_AGENT_INTERCOM_SHOW_AGENTCOM`
  resolves with `1`/`0`. Default `true`. With the switch off, the transcript
  no longer shows why the orchestrator continues — the orchestrator is told
  to relay the substance itself.
- **Per-agent LLM sampling** — temperature, top-p/top-k, max-tokens, plus
  llama.cpp keys (`min_p`, `repeat_penalty`, `chat_template_kwargs`) routed
  through `output.options`. Writes `~/.config/opencode/llm-params.json`.
  Every parameter starts out unset (`not set` in the sidebar) — the plugin's
  roles set none, so nothing is sent until you set it.
- **Per-agent model** — `model [<name>]` cycles the models this opencode
  instance has configured (`/config/providers`, i.e. config + auth +
  `opencode.json` overrides), with a `not set` slot in front of the first
  entry that hands the agent back to opencode's own model. Two ASCII
  capability columns follow the `★` slot: `V` for vision
  (`capabilities.input.image`) and `R` for reasoning
  (`capabilities.reasoning`), `-` when the model is on the pick list but
  lacks the capability, `?` when it is not in the pick list, and a blank
  when nothing is resolved. Writes `~/.config/opencode/llm-models.json` as
  `{"<agent>": {"providerID": "…", "modelID": "…", "variant": "…"}}` (the
  `variant` key is optional and absent for the plain pair); the
  `chat.message` hook applies it by setting `output.message.model`. Its
  own file, because the sampling params file is a number-valued map whose
  unknown keys are forwarded to the provider.
  An `effort [<value>]` row sits directly under the model row and sets
  the reasoning effort for that agent over a fixed ladder
  `default → low → medium → high`. `default` is the absence of a stored
  value; `low`/`medium`/`high` write the entry's optional `variant` key.
  The row is inert and muted where the resolved model has no reasoning
  capability, where the model is not on the pick list, or where no model
  is resolved. Setting an effort pins the model at the same time
  (`{providerID, modelID, variant}`); changing the model clears the
  effort. The effort is applied per request through the `chat.params`
  hook, which translates the value into the provider family's own option
  key — `reasoningEffort` for `@ai-sdk/openai` / `@ai-sdk/openai-compatible`
  / `@ai-sdk/azure` / `@ai-sdk/xai`; `effort` for `@ai-sdk/anthropic` /
  `@ai-sdk/google-vertex-anthropic`; `thinkingConfig.thinkingLevel`
  (with `includeThoughts: true`) for `@ai-sdk/google` /
  `@ai-sdk/google-vertex`; `reasoning.effort` for
  `@openrouter/ai-sdk-provider`; nothing for any other family. Keys
  already set in `llm-params.json` win over the ladder.
  The choice is applied by two hooks that share the same stored pair. The
  `config` hook writes it into `config.agent[<name>].model` (the
  `providerID/modelID` form opencode resolves an agent's model from), so
  it holds for every prompt of the instance — including ones the message
  hook never sees. That hook runs once at instance bootstrap, so a file
  change lands on the next opencode start. The `chat.message` hook still
  applies the same pair live by setting `output.message.model`, so an
  edit to the file takes effect on the next message without a restart.
  A choice stored for an opencode built-in agent that the project does
  not list in its `opencode.json` `agent` map is applied by the
  `chat.message` hook only — the `config` hook never creates an agent key.
- `[reset current agent]` drops that agent's sampling overrides *and* its
  model choice, returning every row to what opencode resolves.

Every change applies on the next LLM call. No opencode restart — with one
exception on the way back out. Once the `config` hook has pinned a model at
bootstrap, that string is what opencode resolves for the agent, so dropping
the choice again cannot simply fall through to it: the `chat.message` hook
puts back the `model` the pin displaced. For an agent that carried no model
before the pin there is nothing to put back, and dropping its choice takes
effect at the next opencode start.

## CLIs the subagents use

### `pw` — headless Chromium with persistent state

`coder` and `debugger` get a `pw` CLI in their shell — a thin wrapper around
[Playwright](https://playwright.dev) driving a **persistent** headless
Chromium. State survives across calls: navigate once, then `pw screenshot`,
`pw textContent`, `pw click` against the same page in separate shell
invocations.

```sh
pw start
pw goto http://localhost:3000
pw waitForSelector "#app" 5000
pw screenshot /tmp/page.png       # then `read /tmp/page.png`
pw textContent "main"
pw click "button.submit"
pw stop
```

All command names mirror Playwright's
[Page API](https://playwright.dev/docs/api/class-page) 1:1 — an LLM that
knows Playwright already knows `pw`. The escape hatch is
`pw evaluate '<expr>'` (any JS expression) or `pw evaluate --body '<js>'`
(multi-statement). First `pw start` fetches Chromium (~170 MB, one time).
Internally: detached daemon on a Unix socket under `$TMPDIR`.

### `gen` — image generation, no API key

The `designer` gets a `gen` CLI that turns a written brief into an image.
Two free backends, both without keys, with auto-fallback:

1. **Stable Horde** (default) — real SDXL/FLUX workers via
   [stablehorde.net](https://stablehorde.net), anonymous tier. **20–90 s**
   typical at public priority.
2. **Pollinations** — fast (~3–10 s) but only the `sana` model and a
   1024 px anon cap (lifted with `POLLINATIONS_TOKEN`).

```sh
gen "modern SaaS dashboard, dark theme, sidebar + KPI cards, no humans, no logos" \
    --out designs/dashboard.jpg --width 1920 --height 1080 --seed 42
```

Wait time is normal — Horde prints `queue_pos=N wait=Ms done=false` while
polling. The designer is instructed to keep paths under `designs/` and not
embed legibility-critical text in images (the model garbles letters).

## Configuration

All optional. The subagent and context caps usually live in
`~/.config/opencode/agent-intercom.json` (written by the TUI panel); that file
also takes `"maxRetainedSubagents"`, `"retainedSubagentTtlMs"`,
`"maxReuseContext"` and the per-agent-type `"reuseContext"` map for the
`reuse`/retention feature, `"maxResultTokens"` and the per-agent-type
`"resultTokens"` map for the reply ceiling, `"searxngUrl"` and `"exaApiKey"`
(each overriding its environment variable), and `"forumBangs"` (no env var —
the array REPLACES the built-in set rather than extending it). Everything else
is environment-variable-driven:

`forumBangs` defaults to `["!st", "!ubuntu", "!su", "!hn", "!lo"]` — Stack Overflow, Ask Ubuntu, Super User, Hacker News, lobste.rs. A non-empty `"forumBangs"` array in the file replaces this set entirely; an empty, missing, or non-array value leaves the defaults in effect. The key exists so a project whose topic lives on a product Discourse instance — `!dpy`, `!caddy`, `!pi` and the like — can list those engines once for the plugin to use.

| Variable | Default | Effect |
|---|---|---|
| `OPENCODE_AGENT_INTERCOM_DEBUG` | on | `"0"` disables logging to `~/.cache/opencode-agent-intercom/debug.log` |
| `OPENCODE_AGENT_INTERCOM_LOG_REQUESTS` | off | `"1"` writes per-LLM-call JSONL to `~/.cache/opencode-agent-intercom/requests.jsonl` (path override: `_LOG_REQUESTS_FILE`) |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENTS` | `1` | Concurrent subagents per primary. `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_MAX_NESTED_SPAWNS` | `2` | Nested `spawn` calls a single subagent run may start (always targeting `researcher`). `"0"` disables — the subagent must do the work itself. TUI file overrides via `"maxNestedSpawns"`. |
| `OPENCODE_AGENT_INTERCOM_MAX_CONTEXT` | `100000` | Subagent context budget (tokens). `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_MAX_RETAINED_SUBAGENTS` | `0` | How many finished subagents may be held as retained sessions in this process. `"0"` switches retention off — every subagent's session is deleted the moment its result is delivered, the one-shot behaviour. Recommended non-zero value: `3`. TUI file overrides. **Enabling retention needs an opencode restart** — the tool surface is resolved at plugin load, so the `reuse` tool only appears once the next instance boots with this set. Disabling takes effect at once. |
| `OPENCODE_AGENT_INTERCOM_RETAINED_SUBAGENT_TTL_MS` | `3600000` | Retention window per held subagent, in ms. Clamped to a floor of `1`. The TUI's row steps in whole minutes with a one-minute floor. |
| `OPENCODE_AGENT_INTERCOM_MAX_REUSE_CONTEXT` | `70000` | Reuse ceiling for every agent type the `reuseContext` map does not name. `"0"` means that type is never reused at all. The TUI panel shows and edits the per-type map; the flat key is only what an untouched type inherits. |
| `OPENCODE_AGENT_INTERCOM_MAX_RESULT_TOKENS` | `2000` | Per-type token ceiling on a subagent's final reply forwarded to the primary. `"0"` disables — that type's reply is never cut. The TUI panel shows and edits the per-type `resultTokens` map; the flat key is only what an untouched type inherits. Everything past the ceiling is cut out of the wake notice and written to a file under `~/.cache/opencode-agent-intercom/results/` (mode `0600`, pruned after 7 days) — the orchestrator receives the path, and only a subagent can read the file. |
| `OPENCODE_AGENT_INTERCOM_PROJECT_CONTEXT` | on | `"0"` skips the project snapshot prepended to spawn prompts |
| `OPENCODE_AGENT_INTERCOM_RESPECT_TASK_PERMS` | on | `"0"` ignores `permission.task` allowlist in `spawn` |
| `OPENCODE_AGENT_INTERCOM_DISABLE_WEBSEARCH` / `_DISABLE_OUTLINE` / `_DISABLE_FORUM_SEARCH` | off | `"1"` skips that tool |
| `OPENCODE_AGENT_INTERCOM_SKIP_CTAGS` / `_SKIP_CHROMIUM` | off | Installer-only: skip ctags build / Chromium download |
| `EXA_API_KEY` | — | If set, `web_search` uses Exa's paid tier. File key `exaApiKey` overrides. |
| `POLLINATIONS_TOKEN` | — | If set, the `gen` Pollinations fallback uses your account |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_MODE` | on | `"1"` arms endless mode — replaces the orchestrator when its context reaches `endlessContext`, after saving its open points to the project's todo file. `"0"` switches it off. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_CONTEXT` | `250000` | Orchestrator context threshold (tokens) while endless mode is on. Displaces the plain handoff threshold. `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_QUIESCE_TIMEOUT_MS` | `600000` | How long (ms) one endless cycle waits for the last subagent to finish before abandoning. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_MAX_CYCLES` | `10` | Cycle ceiling per opencode process. At the ceiling endless mode writes itself off. `"0"` arms no ceiling. |
| `OPENCODE_AGENT_INTERCOM_SHOW_AGENTCOM` | on | `"0"` hides the plugin's own postings — subagent notices, handoff kickoff, doc-summary prompts — from the transcript. Their text still reaches the model unchanged. `"1"` shows them. TUI file overrides. |

## Endless mode

Endless mode is on by default and turns the orchestrator handoff into a
self-restarting loop. With the switch on, the orchestrator's context is watched against
`OPENCODE_AGENT_INTERCOM_ENDLESS_CONTEXT` (default 250 000 tokens) — a higher
ceiling than the plain handoff threshold (`OPENCODE_AGENT_INTERCOM_MAX_PRIMARY_CONTEXT`,
default 80 000 tokens), and the one in effect while endless mode is on. When
the ceiling is reached the orchestrator is replaced by a fresh orchestrator
session, which is told to work the project's todo file off; that fresh session
reaches the ceiling in turn and is replaced again, and so on.

A cycle runs in this order:

1. **Trigger.** The orchestrator's turn-end hook sees the context cross
   `endlessContext` and sets a pending latch. `spawn` then refuses new
   subagents from that orchestrator until the cycle ends, so an orchestrator
   that spawns as fast as its subagents finish can never starve the cycle.
2. **Quiesce.** On the orchestrator's `session.idle`, the cycle waits for every
   running subagent in the process to finish, bounded by
   `OPENCODE_AGENT_INTERCOM_ENDLESS_QUIESCE_TIMEOUT_MS` (default 10 minutes).
   A timeout abandons the cycle rather than aborting a working subagent —
   killing real work to save context is the loss the mode exists to prevent.
3. **Save.** The orchestrator is asked to state its open points in plain text;
   the plugin parses the reply and writes one task per point into the
   project's todo file (`TODO.md` / `todos.md`), then reads the file back and
   confirms every id it just wrote is there. The orchestrator itself has no
   file-writing tool (`PRIMARY_TOOLS` is `spawn` / `abort` / `list`), so the
   plugin does the writing on its behalf. Any failure here abandons the cycle
   without replacing the session — replacing the orchestrator after failing
   to save its open points is the data loss the mode exists to prevent.
4. **Replace.** The plain orchestrator handoff runs with an additional kickoff
   block naming the todo file and the confirmed task ids; the old orchestrator
   is archived, the new one starts with the instruction to work the file off.
5. **Work off.** The new orchestrator runs normally — it spawns subagents, the
   wake-hook ticks tasks off via the existing `DONE: T<n>` marker path, its
   context grows, and step 1 applies to it again.

### What bounds the loop

Endless mode is a loop, so it stops itself rather than waiting for someone to
watch it. A self-stop **pauses** the mode for the orchestrator session in hand:
it never writes `endlessMode: false`, because the mode is on by default and the
key is the user's own switch. A paused session gets no further cycle — it is
told so in its own limits block — but it is still relieved of its context: the
threshold falls back to `maxPrimaryContext` and the plain orchestrator handoff
owns it, exactly as in a session with the mode switched off. The pause dies with
the session it was set on, so the next orchestrator starts with the mode
available again.

- **Nothing left to do.** When the orchestrator reports no new open points
  *and* the todo file has no open tasks, the mode pauses instead of starting
  a session that would have nothing to work on.
- **No progress.** If the open-task count has not fallen after
  `ENDLESS_MAX_STALLED_CYCLES` (2) consecutive cycles, the mode pauses — the
  bound against an orchestrator that saves the same points every cycle and
  never finishes one. This one fires after the replacement, so the pause goes
  on the new orchestrator, which is the session that would otherwise carry the
  loop on.
- **Cycle ceiling.** `OPENCODE_AGENT_INTERCOM_ENDLESS_MAX_CYCLES` (default
  10) cycles per opencode process. At the ceiling the mode pauses with a
  warning toast.
- **Failed-cycle cooldown.** A cycle that abandoned (quiesce timeout, save
  failure, handoff failure) arms a cooldown on that orchestrator so an
  already-over-threshold turn cannot retry on its next message; the cooldown
  lifts on its own.
- **The switch.** Turning the toggle off in the sidebar (or
  `OPENCODE_AGENT_INTERCOM_ENDLESS_MODE=0`) drops the latch at the next
  settings read; a cycle already past the save step still completes, because
  it has written to the todo file and must not leave the orchestrator
  half-replaced.

Only the sidebar toggle (or the env var) writes `endlessMode`; none of these
stops touches the settings file, deletes a session, aborts a subagent or
removes a task.

## Under the hood

Built for behaviour, not deference: the orchestration pattern is **enforced**,
not requested.

- **Primary tool-gating** — `tool.execute.before` rejects any tool call from
  a primary session other than `spawn`/`abort`/`list` (and denies two `list`
  calls in a row). The primary orchestrates; it cannot read, edit, run commands
  or fetch the web. Subagents are not restricted by this guard — their tool
  limits come from the per-role `permission:` map in `agents.js`, which also
  makes opencode strip the unavailable tools from the LLM schema so the model
  never sees them as options.
- **System-prompt injection** — `experimental.chat.system.transform` prepends
  the orchestration protocol and live subagent snapshot to primary sessions
  and a shorter discipline block to subagents.
- **Per-agent LLM overrides** — the `chat.params` hook merges
  `~/.config/opencode/llm-params.json` live into every request, and the
  `chat.message` hook sets `message.model` from
  `~/.config/opencode/llm-models.json` (TUI panel writes both files).
  `chat.params` cannot carry a model — its output holds only sampling fields.
- **Async spawn** — `spawn` owns subagent session creation (`session.create`
  + `promptAsync`) and returns immediately. The primary stays alive.
- **Wake** — opencode never re-activates an idle primary on its own. The
  `event` hook does, on `session.idle`, pushing the subagent's full (capped)
  result to the parent.
- **Soft-notify on context budget** — escalates over a few LLM turns; after
  three ignored injections, the parent is notified of the denial loop (with
  a TUI toast). Subagent stays alive. Abort is user-only (TUI ✕ or asking
  the orchestrator).
- **Race-safe subagent cap** — `pendingSpawns` reservation in the same turn
  prevents N parallel spawns from all seeing "slot free".

opencode's plugin API has no hook to make `task` itself non-blocking, so
removing every "do it yourself" tool from the primary is the enforcement lever.

## Limitations

- **Abort is best-effort.** `session.abort` is cooperative; the
  `tool.execute.before` hard-deny is the backstop.
- **No mid-flight subagent steering** — by design. A subagent runs
  through to its reply and is not steered from the outside; only its
  held session may be re-prompted through `reuse` after it finishes.
  A subagent that ran into a problem its prompt did not cover hands the
  decision up via a `Blocked:` wake notice; you handle it, not the live
  subagent. Continue by spawning a fresh one with a clearer prompt.
- **The prompt contract's text is pinned; the number is still bumped by
  hand.** `PROMPT_CONTRACT` is a hand-edited integer in `prompts.js`, and
  the rendered text of the four elements it covers — the `Blocked:`
  report, the `DONE: T<n>` marker, the orchestrator's `spawn` protocol,
  the delegation block — is pinned in
  `test/fixtures/prompt-contract.json`. Rewording one of them fails
  `npm test` with the element named, and the decision is the
  maintainer's: bump the integer and re-pin with `npm run pin:contract`,
  which reports every customised file below the new number, or re-pin
  alone for a cosmetic edit, which reports nothing and leaves the
  re-pinned text visible in the diff. Two things stay uncovered: guide
  text outside those four elements, and a maintainer who re-pins a real
  contract change without bumping.
- **Solo-maintainer surface area.** `pw` daemon, `gen` CLI, Exa SSE parser,
  ctags subprocess, four opencode hooks. 1046 unit tests, no CI against real
  opencode. Bugs are addressed at hobby-project pace.

## Development

```sh
npm run check   # syntax check (node --check)
npm test        # unit tests (node --test)
```

`npm test` needs Node 22.18 or newer (`devEngines.runtime` in
`package.json`): part of the suite imports the TUI stores from
`tui/src/*.ts` directly, and Node strips those types without a flag only
from that version on. The published package itself is plain ESM and runs on
Node 18 (`engines.node`); the TUI ships as a `node20` bundle under
`tui/dist`.

### Local development loop

With the plugin wired into a test project by path (see
[Project-scoped registration](#project-scoped-registration-that-works)):

- **Server (`src/*.js`)** has no build step. Save the file and restart
  opencode; the change is live.
- **TUI (`tui/src/tui.tsx`)** runs from `tui/dist/tui.js` and needs a build.
  `npm run dev` in `tui/` is `tsup --watch` and rebuilds on every change —
  run it in a separate terminal while working.
- **No hot reload for plugin code.** opencode resolves plugins once at
  instance bootstrap, so a restart is required either way. The live-applying
  settings in the sidebar are runtime knobs, not code.

Before debugging a load or visibility problem, read
[learnings.md](learnings.md) — durable findings about running this plugin
under opencode (plugin resolution at bootstrap, the accepted spec forms,
how to prove a plugin actually loaded, why the TUI half may be missing).

The loop: `npm run dev` in `tui/`, edit, restart opencode.

## License

MIT — see [LICENSE](LICENSE).
