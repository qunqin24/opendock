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
   `x` abort control and an age, plus `max subagents`, the flat retention
   rows `retained subs` and `retain (min)`, and the three watchdog rows
   `silence (s)`, `in tool (min)` and `run (min)`. The sidebar also exposes collapsed
   `TUI settings` / `LLM params` / `Prompts` sections — the LLM params section
   carries the per-agent-type context ceiling, the per-agent-type reuse
   ceiling, and the per-agent-type reply ceiling behind a single agent cycler
   that walks the full role list (orchestrator included); the three rows are
   `max Token(k)` / `reuse Token(k)` / `result Token`, directly after the
   `effort` row and before `[reset current agent]`, with `★` marking a type
   that has its own value, `off` for a ceiling of `0`, and a value stepped
   below zero dropping the entry so the type falls back to the inherited
   ceiling again. `result Token` is stepped in 500 whole tokens rather than
   thousands. `[reset current agent]` does not touch these three rows.
   The orchestrator's system prompt also carries a `Limits` block with headroom per agent type — each entry lists the budget, the fixed overhead (subagent guides, PROJECT.md, the project snapshot prepended to every spawn, AGENTS.md where that type keeps it) and the headroom left for the orchestrator's prompt and the subagent's work, in the form `coder 100.0k (−12.4k fixed → 87.6k)`. The fixed overhead occupies part of every budget before the orchestrator's words do; the limits block names it so the orchestrator can see why its own prompt has less room than the bare budget suggests. The work-package size gate below measures the package against the same budget the headroom was computed from. The same block names `off` for any type whose budget is disabled.
   SDK's `layout` field is `"auto" | "stretch"` and marked deprecated with
   "Always uses stretch layout", and `tui.json` has no `sidebar` block,
   no width, no position. The column takes its width from the content
   area and that is not configurable.

The plugin manager (toggle the plugin on/off, install updates) lives at
`Ctrl+P` → `Plugins` → `Enter`. Inside the panel, `Alt+A` focuses the
subagent list; `j`/`k` move, `Enter` opens a session, `x` aborts.

Each live row is labelled `agent type · topic (Model)` — for example
`coder · Searching fo… (Luna)` — with the ` · <age> · <k> ctx` line
beneath it. The **agent type** is the role name; the internal handle (such as
`coder#1`) remains available for addressing but is not rendered. The **topic**
is the opencode session title: the spawn tool sets it from the `description`
argument, and where the caller gave none the title falls back to the opening
characters of the task prompt with a redundant `<agent>: ` prefix stripped
before display. The **model** is the agent's own entry in
`~/.config/opencode/llm-models.json`, shortened to its display name before any
parenthesis; an agent with no configured model renders the row without that
parenthesised part at all. The parts are sized against the panel's actual
laid-out width: the agent type is kept whole where the budget allows, the
model next, and the topic takes the remainder and is dropped below a minimum rather than wrapping the
row onto a second line. The `<k> ctx` figure is the session's context as the
plugin measures it against every threshold: `input + output + reasoning +
cache.read + cache.write` of the newest assistant message with a non-zero
output — `latestContextTokens` (`src/context-figure.js`), the one computation
both halves of the plugin share, so the panel row, the `list()` column and the
wake notice cannot disagree. A step still in flight (no output recorded yet)
is walked past, and the walk stops at a compaction message, where the figure
reads as no figure until the next real turn.

The line beneath a row also carries what the subagent has on the **mid-run
channel**: `asking` where it has stopped on a question of its own and is
waiting for the orchestrator to answer it with `message()`, and `msgs:N` for
the messages the orchestrator has sent it this run — the same two columns the
`list()` tool shows on a running row. Both come off the session title, where
the plugin publishes them: a subagent blocked inside `ask` is `busy` to
opencode and writes nothing, so without the marker it is indistinguishable
from one that has hung.

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
  plus `outline`, `pw`, `gen`, and the `codegraph` CLI where one is installed.
  Same capabilities, a fraction of the cost.

- **`outline` over `read`.** Which file defines `processInvoice`? Outline six
  candidates (one line of signatures each) instead of `read`ing all six and
  drowning your model in 40 KB of unrelated bodies. **~95 % token savings**
  vs `read` for orientation, measured.

- **Role-aware prompt slimming.** Roles that do not need `AGENTS.md`
  (`researcher`/`designer`/`gitter`/`scout`) get it stripped — ~17 KB saved per LLM
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

- **Compaction under your control, off by default.** opencode compacts a
  session on one global switch with no per-agent form. The plugin writes
  that switch off in every agent mode and takes the ON side itself: the
  sidebar's `compaction` row arms it per role, and an armed agent is
  compacted by the plugin at the context threshold that role already has —
  the primary's `maxPrimaryContext`, a subagent's own context budget. The
  row is live; no opencode restart. With it off for the primary, the plain
  handoff or endless mode is what relieves the session.

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
| `message(subagent, text)` | Say something to a subagent that is STILL RUNNING — a correction, a fact it is missing, or the answer to a question it asked. Queued into that session with `noReply: true`, so it starts no second turn and is read at the subagent's next step. Refused for a subagent that is no longer running, for a foreign or unknown handle, over `maxMessageTokens`, where the target is already at its own context budget and the text would put it over, and while `midRunMessaging` is off. | Orchestrator |
| `ask(question)` | Put ONE question to the caller that briefed you and block on the answer. The answer is the result of the call; on expiry the result says no answer came and the run goes on. Refused to a NESTED subagent (its caller is itself blocked and could not answer), to a session that is no tracked subagent at all, while a question is already open, over `maxMessageTokens`, and while `midRunMessaging` is off. | Subagents |
| `abort(subagent)` | Cooperatively abort and hard-deny further tool calls. User-requested stops. | Orchestrator |
| `list()` | List active subagents. A running row carries `msgs:N` and `asking` where a question is open. | Orchestrator |
| `calc(expression)` | Exact arithmetic on figures the agent already holds — sizes, budgets, offsets, token sums — with no model call and no subagent run. One or more statements separated by `;` or new lines, `name = expr` keeps a value for later statements; operators `+ - * / // % **`, comparisons, `min max abs floor ceil round sqrt log2 log10 ln pow`, `_` separators, `0x`/`0b`, suffixes `k M G T` and `Ki Mi Gi Ti`. A result beyond 2^53 is marked `(not exact: beyond 2^53)`; an error comes back as `calc: <message> at column <n>`. Bounded at 4000 characters, 100 statements and 64 levels of nesting. | Orchestrator, every subagent, the solo primary |
| `task` | Denied everywhere. opencode's native tool is blocking; the schema strip hides it. | — |
| `todos_open()` | List open tasks from `TODO.md` with their stable id (`T5`) and `accept:` criterion. | `planner`, `coder`, `debugger`, `reviewer`, `designer` |
| `todo_add(title, accept?)` / `todo_edit(id, …)` / `todo_done(id)` | Add / refine / remove a task in `TODO.md`. `todo_done` deletes the completed task — usually the wake-hook does it for you. | `planner` and `coder` own the list; `debugger`, `reviewer` and `designer` are told to read it and add to it, and to leave TODOs in other files where they stand |
| `web_search(query, numResults?)` | Anonymous web search via Exa (no key, 150/day; an Exa key lifts the cap). | `researcher` only |
| `forum_search(query, keywords?, numResults?)` | Discussion-forum search (Exa + searxng with forum-only engine bangs). Use for lived user experience; `web_search` for docs/releases/official facts. | `researcher` only |
| `grounded_search(query, max_sources?)` | One call to Google's Gemini with Search grounding on, on the fixed model `gemini-3.7-flash` and no other. Returns a written answer plus the numbered sources it was grounded in (`max_sources` 1–20, default 8). | `grounder` only |
| `outline(path)` | Top-level declarations of a source file via universal-ctags. ~100 languages, ~95 % token savings vs `read`. | Subagents (except `designer`/`documenter`/`gitter`/`grounder`/`checker`/`verifier`/`releaser`) |

A subagent answers exactly once and is then destroyed: **spawn → run → reply →
deleted.** The primary is woken automatically with the full (capped) result on
completion. No status-poll tool by design — small LLMs would call it in a
loop.

One reply is not the same as being out of reach. For the length of that run
the subagent is a correspondent: the orchestrator steers it with `message`,
the subagent puts a question back with `ask`, and both are described under
[The mid-run channel](#the-mid-run-channel) below.

A finished subagent's session can also be **held** — kept alive after its
result has been delivered, so the orchestrator can address it later. Holding
is gated on `maxRetainedSubagents > 0`, which ships at `2`; set it to `0` and
the description above is the whole story, and the orchestrator loses the
`reuse` tool.

With retention on, every clean, top-level subagent whose context fits under
the reuse ceiling is held for `retainedSubagentTtlMs` after it finishes, the
oldest entry is evicted when the capacity is reached, and a held session is
reaped once its window runs out — none of which changes what the orchestrator
receives at wake time. A held session can also be deleted from outside the
plugin (the TUI's `x` on a held row, or the user removing that session in
opencode); the plugin drops the entry and tells the orchestrator the handle is
gone, naming the held subagent and saying `reuse(...)` will not reach it — only
a fresh `spawn` with a full briefing is left. `list()` renders the held ones in
a `RETAINED` section, the per-turn snapshot does the same, and the next tool
addresses them. The orchestrator is told to send a follow-up for a subagent
`list()` shows RETAINED to it with `reuse`, before any new spawn.

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

### The mid-run channel

While a subagent runs, the two directions between it and its caller are open.

**Down — `message(subagent, text)`.** The text is framed by the plugin (never
sent bare: what arrives in the subagent's session is a user message, and an
unframed paragraph reads as a fresh task) and queued with opencode's
`noReply: true`, which persists the message without starting a turn. opencode's
own runner drains the queue at each STEP boundary, so the subagent reads it as
soon as the tool call it is inside returns — not at the next turn, and never
inside a call. The message is a persisted part of the subagent's session, so it
is visible in that session's transcript in the order it landed. Where the
subagent has a question open, the same call is read as the ANSWER to it: the
blocked `ask` returns the text and nothing is written to the session.

**Up — `ask(question)`.** The subagent's call blocks on a promise — nothing
polls, no tokens are spent while it waits — and the question goes to the caller
as a notice opening `❓ agent-intercom: your subagent "<handle>" … asks you:`,
through the same routed path the completion notice takes, so a question
survives an orchestrator handoff. The wait is bounded by `answerWaitMs`
(default 5 minutes, `0` = do not wait) and is additionally clamped against the
watchdog window the blocked call is measured on, so a subagent can never be
reaped inside its own wait. On expiry the tool result says so and the run
carries on. `ask` is refused to a nested subagent, whose caller is itself
blocked inside its `spawn` call and could not answer.

Every ending settles an open question — idle, watchdog timeout, abort, teardown
and a state reset alike — so no `ask` outlives its session.

The wake notice at the end of the run reports the traffic:
`📨 exchange: 2 messages down, 1 question answered, 1 unanswered`. A message
that was queued but never read is named explicitly, because the orchestrator
was told it had been queued and would otherwise believe a correction landed
that never did.

The channel has its own, much smaller ceiling in both directions
(`maxMessageTokens`, default 1000 tokens) and no overflow file behind it: a
question or a correction that does not fit is the wrong instrument, and the
refusal says so. `midRunMessaging: false` switches the whole channel off; unlike
retention it is read live, so it needs no opencode restart. In solo mode neither
tool is registered.

At every opencode restart the plugin also runs a one-shot **bootstrap sweep**
of its own opencode sessions — anything left over from an earlier process
whose title carries this plugin's marker, that is not its parent's parent,
that this process knows nothing about, and that has been idle for longer
than `ORPHAN_SWEEP_TTL_FACTOR * retainedSubagentTtlMs` (with a ten-minute
floor) is deleted. The marker identifies the session as one this plugin
created; sessions that cannot be attributed with certainty are left standing.
The sweep runs at the shipped default too, so a leaked session from a crashed
plugin or opencode process does not linger.

opencode can also dispose a project's instance and build a new one inside the
running process — the plugin module stays loaded, the factory runs again, and
every subagent that was running in the old instance is cut off, most of them
without an event reaching the plugin. A second factory run for a directory is
therefore read as an **instance restart**: two seconds after the last such run
(`INSTANCE_RESTART_SETTLE_MS`, re-armed by every further run and cancelled by a
dispose inside the window) the plugin settles every registered running
subagent of that directory whose run started before it, unless opencode reports
its session running in the new instance. Each one is read once and its state
filed as on every mid-work ending, the sessions are deleted nested children
first, and each primary is woken once with one notice that names every
subagent of its own the restart ended, says that neither the user nor the
orchestrator stopped them, and carries a slots line counted after all of them
are freed. This does not depend on `maxSubagentAgeMs` or on the sweep. The
plugin's `dispose` hook marks the directory while opencode disposes it; a
subagent error reported inside that window — tested on arrival and again after
the short wait for the session to go quiet, since opencode runs the hook and the
interruption of the runs side by side — is left to this reconcile instead of
being reported as an ordinary abort and its session deleted while opencode is
still writing into it (`src/instancerestart.js`).

Every notice the plugin posts into a session names the agent its turn runs as:
the primary's own agent as recorded at its last `chat.message`, falling back to
the default agent the plugin installed for the project — never whatever
opencode's default agent happens to be while an instance is being rebuilt. An
abort that reaches the plugin as a `session.error` and was not requested by it
is reported as coming from outside the plugin (a stop in the TUI, or opencode
ending the run), and every ending notice's slots line counts the ending
subagent as freed.

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

The delegating subagents (`planner`/`coder`/`debugger`/`reviewer`/`designer`)
also carry `spawn`, but each is gated to a single target — `researcher` — and the
call **blocks** until that researcher replies: there is no wake, no second ask,
and the researcher's reply comes back as the result of the `spawn` call. The
`researcher` carries `spawn` too, gated to the single target `grounder` — the
second, independent search path (Google Search grounding) the researcher's own
tools do not give it. A refusal names the caller's own allowed set, e.g.
`a "researcher" may spawn "grounder" and nothing else — you asked for a "coder"`,
or `a "grounder" may spawn nothing at all`. The spawn prompt sent on either path
carries no `T<n>:` prefix and no `DONE:` marker is expected. A per-entry quota
(`maxNestedSpawns`, default `2`, env `OPENCODE_AGENT_INTERCOM_MAX_NESTED_SPAWNS`,
`0` disables) bounds how many such nested runs one subagent may start across
every run of its session; the messages hook appends a per-turn notice to the
last user message naming what is left. `grounder` is
denied `spawn` outright. `task`, `abort`, `list` and `message` are denied for
every subagent, and `reuse` refuses a subagent caller; `ask` stays open to
every subagent.

Grounded search is not automatic: the `researcher` spawns a `grounder` only
where the briefing the orchestrator writes asks for a grounded search, and
only then does it fold the sources that come back into its own answer beside
what it found itself. Without that instruction in the briefing the
`researcher` searches exactly as before and spawns nothing. The orchestrator
can also spawn a `grounder` directly — for a plain factual question that
needs no researcher at all.

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

A `spawn` may name one of the plugin's own subagent roles and
nothing else. Any other name is refused — including an agent the project
declares in its `config.agent` map and opencode's own `general`/`explore` —
and the refusal states why that particular name is not a target and lists
them. The same closed list is what the limits block shows.

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
the reply) are ignored as hallucinations. The todo file may be named `todo.md`
or `todos.md` in any casing; where several of them exist in a directory, the
ones holding at least one task row compete and the one modified last is used
(with no task row anywhere, a regular `TODO.md` is kept). The format is fixed:

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

Fifteen roles injected by the `config` hook — no per-project
`.opencode/agents/*.md` needed. Orchestrator is the default primary unless
`default_agent` is explicit.

| Agent | Role | Notes |
|---|---|---|
| `orchestrator` | Primary. Coordinates only: cuts work into one deliverable per spawn (a coder change of about 100 lines in 1–2 files), sends lookups to a `scout` first where it is unsure, sends a fact about the tree it is about to brief to a `refuter` as a claim, runs a `checker` after each coder change and a `verifier` where the change shows only at runtime, starts a `releaser` only when no coder, debugger or other releaser runs in the project and after the verifier's PASS where there is one, before each spawn takes the first cheaper move that fits — `calc` for a figure from numbers it holds, the `documenter` with the file, place and text it already holds, a `refuter` for a fact about the tree it is about to brief — and copies the coder's `Commit:`/`Docs:` lines into the gitter and documenter briefs. | Restricted to `spawn`/`message`/`abort`/`list`/`calc`, and `reuse` where retention is on. |
| `scout` | Read-only code lookup: where a symbol, call site or text stands, who calls it, what a file or function does. Replies one `path:line — quoted line` per finding, or a summary of at most 10 lines; a longer list goes to one file under `work/`. | Bash for the `codegraph` CLI, `outline`, `write` for its result file under `work/`; no `edit`, no web, no TODO tools, no AGENTS.md. `spawn` denied — may spawn nothing at all. |
| `refuter` | Checks a numbered list of claims about the code against the tree and gives each one a verdict — holds, false, or not checkable here with who checks it — with the `path:line` that decides it; first reply line `Claims: <n> — <h> hold, <f> false, <u> not checkable`. For a claim with "all", "only" or "every" it searches the whole tree (codegraph `callers`/`impact`, grep for every spelling); a longer list goes to one file under `work/`. | Bash for the `codegraph` CLI, `outline`, `write` for its result file under `work/`; no `edit`, no web, no TODO tools, no AGENTS.md. `spawn` denied — may spawn nothing at all. |
| `planner` | Concept/design docs in `plans/`; sizes each task for one coder run. Ends its reply with a `Commit:` line for the files it wrote. | Bash, no web tools — version facts come from a `researcher`. May spawn a `researcher` for web lookups. |
| `coder` | Implements code in thin vertical slices (about 100 lines in 1–2 files), or applies an exact change as briefed; a rename may span the sites the brief lists. Adds the test for a change in behaviour, installs dependencies through the package manager, and ends its reply with `Commit: <paths> \| <subject>` (subject in the style of `git log -5 --format=%s`) and `Docs: <file> — <section> — <fact>` lines. | Bash, edit, build/test. No web. May spawn a `researcher` for web lookups. |
| `checker` | Runs the checks its briefing names (tests, lint, type-check, build) once each and reports per check `Check: <command> — exit <code> — <p> pass, <f> fail, <s> skipped`, then one line per failing item with its first error line; a longer output goes to one file under `work/`. A check named without a command is looked up in AGENTS.md or the project's scripts. | Bash, AGENTS.md, `write` for its result file under `work/`; no `edit`, no `outline`, no web, no TODO tools. `spawn` denied — may spawn nothing at all. |
| `verifier` | Runs a built artefact where it really runs — a page in a real browser through `pw`, the binary, the installed package — screenshots what it renders, reads each screenshot and judges it itself. Per check it gives the command, the exit code, the evidence and `PASS`, `FAIL` or `NOT RUN` with the reason; first reply line `Checks: <n> — <p> pass, <f> fail, <r> not run`. A check only a test runner or a stub can run is marked `NOT RUN, reason: checker`. Needs a model with image input: on one without, its system prompt tells it to mark every look at a screenshot `NOT RUN, reason: no vision`, and the sidebar's model row notes `needs a vision model (V)`. | Bash, `read`, `write` with no path limit, AGENTS.md; no `edit`, no `outline`, no web, no TODO tools. `spawn` denied — may spawn nothing at all. |
| `debugger` | Diagnoses build/test/runtime errors. | Bash for repro, `write` for repro scripts and notes under `work/debug-<topic>/`, no `edit`, no web — fix goes back to `coder`. May spawn a `researcher` for web lookups. |
| `reviewer` | Reviews the diff range, staged changes or files its briefing names into `reviews/` — functional bugs first, or only the axes the briefing names. | Bash, no web tools. Convention: no source-code edits. May spawn a `researcher` for web lookups. |
| `documenter` | Writes/iterates user docs in place (README, `docs/`, changelog) exactly as briefed — the spawn prompt states the file, the place and the content; deciding what the docs should say belongs to another role (e.g. reviewer, planner or coder) beforehand. A missing file, place or content is asked once, then reported `Blocked:`. | Bash, no web tools, no `outline`, no TODO tools. Convention: no source-code edits. `spawn` denied — may spawn nothing at all. |
| `researcher` | Web research via `web_search` + `forum_search` + `webfetch`. | The only role with Exa/searxng search and full-page fetches. Reads the project, writes its own result file and has bash; no `edit`. Convention: no source-code edits. May spawn a `grounder` for a grounded search, but only where the orchestrator's briefing asks for one; without it, searches as before and spawns nothing. |
| `grounder` | Web research through Google Search grounding via `grounded_search`. | The only role that uses Search grounding. Pick over `researcher` for a plain factual question; pick `researcher` when the work needs forum threads, a named page fetched in full, or a choice between sources. No `edit`/`write`/`bash`. `spawn` denied — may spawn nothing at all. |
| `designer` | Generates images via [`gen`](#gen--image-generation-no-api-key). | No `outline`, no web. Convention: no source-code edits. May spawn a `researcher` for visual references. |
| `gitter` | Runs git operations (commits, branches, tags, pushes, pull requests with the title and body the brief gives, read-only reports such as `git status --short`, `git diff --stat`, `git log -n`) exactly as briefed — the spawn prompt states the files to stage, the commit message and whether to push; deciding what changed and what to commit belongs to another role (e.g. reviewer, planner or coder) beforehand. A missing field is asked once, then reported `Blocked:`; an unknown git or forge error comes back `Blocked:` with the command and its output. | No `edit`/`write`/`webfetch`/`web_search`/`forum_search`/`grounded_search`. `spawn` denied — may spawn nothing at all. |
| `releaser` | Carries out a project's release procedure file (the one the brief names, else `RELEASE.md`) step by step — build, sync, edit, commit, push, re-pin, install — running the check the file gives after each step and stopping at the first failure with `Blocked:`. Changes a file only where a step says so; each commit takes the message the file or the brief states (a `<value from step k>` is filled from that step's output), staged and pushed by the same steps as the `gitter`. Replies `Release: done — <n> steps`, or on a stop `Blocked: release stopped at step <k> — <n> steps` (`Blocked: no procedure file` where there is none), then one line per step. | Bash, `edit`, `write`, AGENTS.md; no `outline`, no web, no TODO tools. `spawn` denied — may spawn nothing at all. |

Each delegating role maps to exactly one target: `planner`, `coder`, `debugger`, `reviewer` and `designer` reach `researcher` (the call blocks and the reply is the tool result); `researcher` reaches `grounder` for a grounded search only when its briefing asks for one; `grounder`, `documenter`, `gitter`, `releaser`, `scout`, `refuter`, `checker` and `verifier` may spawn nothing, and no subagent may spawn a `scout`, a `refuter`, a `checker` or a `verifier` — the orchestrator alone starts them. The refusal text names the caller's own allowed set — e.g. `a "researcher" may spawn "grounder" and nothing else — you asked for a "coder"`, or `a "grounder" may spawn nothing at all` — so the model has somewhere to go instead of retrying.

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
   plugin's role names** — `prompt`, `permission`, `model`,
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
  it no longer shares one of the plugin's role names, or accept the
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
- **`max subagents [-N+]`** — the concurrent subagent cap; `0` switches
  the gate off. Writes `"maxSubagents"`.
- **`retained subs [-N+]`** — how many finished subagents the process holds
  at once; `0` switches retention off and the sidebar then has no held
  rows. Writes `"maxRetainedSubagents"`.
- **`max Token(k) [-N+]`**, **`reuse Token(k) [-N+]`**, **`result Token
  [-N+]`** — the per-agent-type context ceiling, reuse ceiling, and reply
  ceiling. All three rows sit in the LLM params section, directly after
  the `effort` row and before `[reset current agent]`, and share one
  agent cycler that walks the full role list (`AGENT_NAMES`,
  orchestrator included). `★` marks a type that has its own value,
  `off` for a ceiling of `0`, and a value stepped below zero drops the
  entry so the type falls back to the inherited ceiling again. `result
  Token` is stepped in 500 whole tokens; the other two step in
  thousands.
  - `max Token(k)` writes `"agentContext": { "<agent>": tokens }`. A type
    with no entry of its own falls back to the flat `maxContext` key, then
    to the env var `OPENCODE_AGENT_INTERCOM_MAX_CONTEXT`, then to a
    built-in per-type default, then to 100 000. `0` is a real value at
    every level and means the budget is disabled for that type.
  - `reuse Token(k)` writes `"reuseContext": { "<agent>": tokens }` and
    inherits the flat `maxReuseContext` (env
    `OPENCODE_AGENT_INTERCOM_MAX_REUSE_CONTEXT`, default `70000`)
    wherever the map has no entry. `0` means that type is never reused.
  - `result Token` writes `"resultTokens": { "<agent>": tokens }` and
    inherits the flat `maxResultTokens` (env
    `OPENCODE_AGENT_INTERCOM_MAX_RESULT_TOKENS`, default `2000`)
    wherever the map has no entry. `0` means that type's reply is never
    cut. Everything past the ceiling is cut out of the wake notice and
    written to a file the notice names. `[reset current agent]` does not
    touch any of these three rows.
- **`compaction [on/off]`** — automatic compaction for the agent type the
  same cycler has selected, last of its rows and directly above
  `[reset current agent]`. Writes `"agentCompaction": { "<agent>": true |
  false }` and inherits the flat `"compaction"` key (env
  `OPENCODE_AGENT_INTERCOM_COMPACTION`, default `false`) wherever the map
  has no entry; `★` marks a type that has its own value, and flipping back
  to the inherited value deletes the entry again. opencode's own automatic
  compaction is switched off for the whole process
  (`applyCompactionPolicy`, `src/compaction.js`), so this row is the only
  thing that compacts anything: an agent switched on is compacted by the
  plugin through `client.session.summarize` at the context threshold that
  agent already has — `maxPrimaryContext` for the primary, the type's own
  context budget for a subagent. The row is LIVE and carries no restart
  note, because the global write reads no setting. The line under it says
  when the cell cannot take effect: `no threshold armed — compaction never
  fires` for an `on` with a threshold of `0`, `endless mode owns the
  primary threshold` for an `on` primary while the cycle is in effect, and
  `no context relief armed — the session will overflow` for an `off`
  primary with no handoff threshold and no cycle either.
- **`retain (min)`** — the retention window in whole minutes, the unit the
  row is shown and stepped in. Writes `"retainedSubagentTtlMs"` in ms; the
  row's floor is one whole minute. A `0` typed by hand into the file
  resolves to `1` ms at the plugin, since nothing else ever deletes a
  subagent session.
- **`silence (s) [-N+]`** — how long a subagent may be silent with no tool
  call in flight before the watchdog aborts it, frees its slot and wakes the
  orchestrator with a timeout notice. Shown and stepped in whole seconds, 15
  at a step; writes `"maxSubagentAgeMs"` in ms. `0` shows as `off` and
  switches that watchdog off entirely, the `in tool` window with it; the
  `run (min)` ceiling stays in force. With it off the orphan sweep in
  `src/teardown.js`, whose window is a multiple of this one, stops running
  too; the settling of subagents an instance restart ended does not depend on
  it. Default 90 s.
- **`in tool (min) [-N+]`** — the same watchdog's window for a subagent that
  is WORKING: one with a tool call in flight, from the moment the call starts
  until its result comes back. opencode publishes nothing between the part that
  announces a tool call and the part that reports its result, so such a
  subagent is silent by construction and the row above says nothing about it.
  Counted from the START of the call, so it is a ceiling on the call rather
  than a lease the events arriving during it keep renewing. Shown and stepped in
  whole minutes; writes `"maxSubagentToolCallMs"` in ms. `0` shows as `off`
  and means no ceiling at all while a subagent works — the silence window
  still governs every subagent that is not working. Default 11 min, which
  clears the 600 000 ms ceiling opencode's own bash tool allows plus a minute
  for the kill and one sweep tick.
- **`run (min) [-N+]`** — the watchdog's third window, the wall-clock ceiling
  on ONE RUN of a subagent, whatever it is doing. Counted from
  `entry.runStartedAt` (seeded on spawn, re-seeded on every accepted reuse) and
  not moved by any tool call, wait or message from the caller — unlike
  `lastActivityAt`, which the two rows above also count from and which
  restarts on every event. At 75 % of the ceiling the wrap-up band fires
  (`RUN_WRAP_UP` in `src/settings.js`): no denial, the room left in minutes is
  named, and the subagent is told its two moves — hand back NOW with a
  `Blocked:` message naming what it is waiting for and what it already has,
  or `ask(...)` its caller whether to keep waiting. At the ceiling the watchdog
  cuts the run off where it stands (the session is aborted and deleted). Shown
  and stepped in whole minutes; writes `"maxSubagentRunMs"` in ms. `0` shows
  as `off` and means NO run ceiling — not the `0` of the two windows next to
  it, which switches those windows off and leaves this ceiling standing. The
  per-role `agentRunMs` map overrides the flat key; `0` at that level means no ceiling
  for that type only. Default 44 min.
- **`endless mode [on/off]`** / **`endless (k)`** — arms the self-restarting
  orchestrator loop and sets its context threshold. The row has a third
  state `[paused]`, set when endless mode has stopped itself for the
  current session: the stop's cause is written on the line beneath.
  The pause is per session, is not written to the settings file, and
  is cleared by switching the row off and on again. A fourth state
  `[restarting]` stands while a cycle is pending or running for the
  current session, with its step on the line beneath: `waiting for the
  turn to end`, `waiting for subagents (N running)` — the whole wait,
  through which the orchestrator keeps working, until none of its
  subagents runs and its turn has ended — `saving open points`,
  `starting fresh session`. It goes when the successor has
  taken over or the cycle is abandoned (the row reads `[on]` again) or
  the mode stops itself (`[paused]`). The plugin publishes the step to
  `~/.cache/opencode-agent-intercom/endless-cycles.json`
  (`src/endlesscycle.js`), next to the pauses in `endless-pauses.json`;
  both files are indicators only, and an entry whose plugin process is
  gone is ignored.
- **`mode [orchestrator|solo]`** — the agent mode the plugin runs the
  primary in. `orchestrator` is the delegation pattern this plugin
  enforces — the primary delegates, the subagent roles do the
  work; `solo` runs the primary as a single agent that does the work
  itself, with no second agent of any kind starting. In solo mode none
  of `spawn`/`abort`/`list`/`reuse` is registered, opencode's native
  `task` stays denied, the plugin's own subagent roles are disabled in
  the registry (`disable: true` and `hidden: true` written from
  `installAgents`, `src/agents.js`), opencode's hidden `title` and
  `summary` agents are switched off (`suppressBuiltinAgentTurns`,
  `src/agents.js`), endless mode counts as off (`endlessModeInEffect`,
  `src/settings.js`), and the orchestration guide and the `Limits` block
  are not injected into the primary's system prompt — the primary's role
  prompt and description (`rolePrompt` / `roleDescription`, `src/agents.js`)
  say so. The row
  uses a two-step arm-and-confirm: the first click arms it, the note
  beneath names the opencode restart and asks for confirmation, and the
  second click writes the flip of the file's current value; the
  arming falls away on its own after four seconds, on Escape, and on
  the next interaction elsewhere in the sidebar
  (`tui/src/agent-mode.ts`). The value is LATCHED at plugin load, so
  a change needs an opencode restart before it takes effect, and then
  holds across every further restart until it is switched back.
  Writes `~/.config/opencode/agent-intercom.json` as
  `"agentMode": "orchestrator" | "solo"`, picked up at the next opencode
  instance; env var `OPENCODE_AGENT_INTERCOM_AGENT_MODE` resolves with
  the same two strings, and its value overrides the file. Default
  `orchestrator`. With `compaction.auto:false` written in every mode by
  `applyCompactionPolicy` (`src/compaction.js`), opencode's own context
  relief is gone — the plugin's own primary handoff replaces it, but a
  user who sets `maxPrimaryContext: 0` gets a `ContextOverflowError`
  instead of a compaction. Solo mode exists for a local model server
  running with `parallel 1`, where any second agent competes with the
  primary for the only slot.
- Under **`TUI settings`**: **`thinking [on/off]`** and **`tool details
  [on/off]`**, opencode's built-in visibility toggles, plus **`show agentcom
  [on/off]`**, which decides whether the plugin's own notices (subagent
  completion messages, handoff kickoffs, doc-summary prompts) appear in the
  transcript. The switch is retroactive: with it off, notice text parts are
  stamped `synthetic: true`, which opencode's TUI does not render; with it on,
  the same parts are PATCHed back to `synthetic: false` and reappear. The
  switch finds its own notices by `metadata.agentIntercom === true` and mutates
  the `synthetic` field through opencode's part route, which the drawn TUI
  picks up at once; a missing or refused route leaves the notices as they
  were. The model still receives the text unchanged either way, so the
  orchestrator keeps being woken and keeps receiving its subagent results.
  The task prompt sent to a subagent stays visible whatever the switch says —
  it is the subagent's entire instruction, not chatter — and tool results stay
  under opencode's own `tool_details_visibility`. Writes
  `~/.config/opencode/agent-intercom.json` as `"showAgentcom": true|false`.
  A watch on the settings directory drops the plugin's settings cache on the
  write and rewrites the already-posted notices 120 ms after it; every new
  notice reads the switch at its send through that cache, whose entries live
  2 s, so where the watch does not report the write a new notice follows the
  switch within 2 s and the retroactive rewrite waits for the 5-minute
  fallback tick. Env var `OPENCODE_AGENT_INTERCOM_SHOW_AGENTCOM`
  resolves with `1`/`0`. Default `true`. With the switch off, the transcript
  no longer shows why the orchestrator continues — the orchestrator is told
  to relay the substance itself. The part route the switch relies on is
  annotated experimental in opencode; a server that does not answer it, or
  refuses the PATCH, costs the retroactive rewrite on that flip and the
  notices stay exactly as they were posted. Each parent notice is durable
  through `src/noticejournal.js`: it is journalled before the post, confirmed
  by a delivery id read back from the session tail, replayed at the next
  plugin load, and reported as `notice delivery LOST` where it never lands.
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
  the reasoning effort for that agent over a per-model ladder
  `default → low → medium → high → xhigh → off`. `off` is not an amount
  of thinking but its absence — the step that switches thinking off
  entirely. The ladder offered for the selected model is built from the
  key list of that model's `variants` map as
  `client.config.providers()` reports it: each of `low`, `medium`,
  `high`, `xhigh`, `off` is offered only when the model names it as a
  key. A model that reports no `variants` map at all is taken to offer
  `low`/`medium`/`high` — `xhigh` and `off` are never assumed; a model
  that reports an empty `variants` map,
  or one without `capabilities.reasoning === true`, makes the row
  inert. `default` is the absence of a stored value; any other step
  writes the entry's optional `variant` key. The row is inert and muted
  where the resolved model has no reasoning capability, where the model
  is not on the pick list, or where no model is resolved. Setting an
  effort pins the model at the same time
  (`{providerID, modelID, variant}`); changing the model clears the
  effort. The effort travels three ways from the stored `variant`:
  `applyModelChoices` (`src/llmmodel.js`) writes it into
  `config.agent[<name>].variant`, which is what actually reaches the
  provider for the families opencode's own `variants` map covers;
  `chatParamsHook` (`src/llmparams.js`) translates the value into the
  provider family's own option key and writes it through `output.options`
  — `reasoningEffort` for `@ai-sdk/openai` /
  `@ai-sdk/openai-compatible` / `@ai-sdk/azure` / `@ai-sdk/xai`; `effort`
  for `@ai-sdk/anthropic` / `@ai-sdk/google-vertex-anthropic`;
  `reasoning.effort` for `@openrouter/ai-sdk-provider`. The
  `thinkingConfig.thinkingLevel` family of `@ai-sdk/google` /
  `@ai-sdk/google-vertex` takes only `low`/`medium`/`high` (with
  `includeThoughts: true`) and emits nothing for `xhigh`; nothing is
  written for any other family. `off` is the one step that is not an
  effort string: `@ai-sdk/openai-compatible` gets
  `chat_template_kwargs: {"enable_thinking": false}` and no
  `reasoningEffort` — a top-level effort of `none` does not switch
  llama-server's thinking off, the chat-template switch does — and every
  other family writes nothing for it, so there `off` travels by
  `config.agent[<name>].variant` alone. Keys already set in `llm-params.json`
  win over the ladder; and `applyModelChoices` additionally seeds
  opencode's own variant store at
  `${XDG_STATE_HOME:-$HOME/.local/state}/opencode/model.json` under its
  `variant` map, keyed `"<providerID>/<modelID>"`, so opencode's TUI
  shows the active variant in a freshly started session. That store is
  keyed per model, so its entry takes the effort of the visible primary
  agent (`mode === "primary"` and not `hidden`; `default_agent` wins
  where two share a model); every ladder step goes in under its own
  name, `off` included, and a `default`, absent or out-of-ladder effort
  writes `"default"`. Writes are atomic; a store that does not parse is
  left untouched; every failure is swallowed so the plugin cannot break
  on load.
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

Every subagent's shell has a `pw` CLI — a thin wrapper around
[Playwright](https://playwright.dev) driving a **persistent** headless
Chromium; the `verifier` and the `debugger` are the roles told to use it.
State survives across calls: navigate once, then `pw screenshot`,
`pw textContent`, `pw click` against the same page in separate shell
invocations.

The plugin's `shell.env` hook puts its own `bin/shims` in front of a
subagent's `PATH`, so `pw` resolves to the plugin's copy with no installer
step, and sets `PW_SESSION` to the subagent's session id: each session runs
its own daemon (`pw-<session>.sock`), so two subagents never drive the same
page. A `pw` run by hand, without `PW_SESSION`, uses `pw.sock`.

```sh
pw start
pw goto http://localhost:3000
pw waitForSelector "#app" 5000
pw screenshot /tmp/page.png       # then `read /tmp/page.png`
pw textContent "main"
pw click "button.submit"
pw console                        # what the page logged and threw so far
pw stop
```

All command names mirror Playwright's
[Page API](https://playwright.dev/docs/api/class-page) 1:1 — an LLM that
knows Playwright already knows `pw`. The escape hatch is
`pw evaluate '<expr>'` (any JS expression) or `pw evaluate --body '<js>'`
(multi-statement). `pw console [--clear]` prints the page's console messages
(`[<type>] <text>`) and uncaught page errors (`[pageerror] <message>`), the
last 500 lines, recorded from the daemon's start — an error thrown while a page
loads included; `--clear` empties the record. `pw start` uses the Chromium
the installer put in place and downloads nothing: where no browser is
installed it exits 1 at once with `pw: browser not installed — report this
check as NOT RUN`. Internally: a detached daemon on a Unix socket
under `$XDG_RUNTIME_DIR/opencode-agent-intercom/` (else
`~/.cache/opencode-agent-intercom/`); it exits on its own after
`PW_IDLE_EXIT_MS` (default 900000, `0` = never) without a request.

### `codegraph` — code search, where installed

The code-reading roles — `scout`, `planner`, `coder`, `debugger`, `reviewer`,
`researcher`, and in solo mode the primary — run the
[CodeGraph](https://github.com/colbymchenry/codegraph) CLI from their shell
when this plugin finds one. It is optional: with no binary found, no role is
told about it and nothing else changes. Where one is found, each of those roles
whose `bash` is allowed in the resolved opencode config gets a short usage card
in its system prompt, so it knows the commands without looking them up —
`explore` to find code, `outline` and `read` for a file it already knows:

```sh
codegraph explore "how is a user saved" -p <project root>   # source of the matching symbols + call paths
codegraph node saveUser -p <project root>                   # one symbol's source with callers and callees
codegraph callers saveUser -p <project root>                # what calls it (callees: what it calls)
codegraph impact saveUser -p <project root>                 # the code a change to it affects
codegraph query saveUser -p <project root>                  # where a name is defined, as file:line
```

The binary is found in this order: the file key `"codegraphBin"` in
`~/.config/opencode/agent-intercom.json`, then the environment variable
`OPENCODE_AGENT_INTERCOM_CODEGRAPH_BIN` — each an absolute path to the
executable — then `codegraph` on `PATH`. A configured path that is not an
executable file is logged and falls to the next level. With a configured path the card names
that path, so the binary need not be on the subagents' `PATH`:

```json
{ "codegraphBin": "/absolute/path/to/node_modules/.bin/codegraph" }
```

A project without a `.codegraph/` index makes every query exit 1; the card
tells the role to go on with its usual tools then. Indexing a project
(`codegraph init`) is the user's step. The binary is resolved once per opencode
process: after installing codegraph or changing `codegraphBin`, restart opencode.

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
`reuse`/retention feature, `"midRunMessaging"`, `"answerWaitMs"` and
`"maxMessageTokens"` for the mid-run channel, `"maxResultTokens"` and the per-agent-type
`"resultTokens"` map for the reply ceiling, `"compaction"` and the
per-agent-type `"agentCompaction"` map for automatic compaction,
`"searxngUrl"`, `"exaApiKey"` and `"codegraphBin"`
(each overriding its environment variable), and `"forumBangs"` (no env var —
the array REPLACES the built-in set rather than extending it). Everything else
is environment-variable-driven:

`forumBangs` defaults to `["!st", "!ubuntu", "!su", "!hn", "!lo"]` — Stack Overflow, Ask Ubuntu, Super User, Hacker News, lobste.rs. A non-empty `"forumBangs"` array in the file replaces this set entirely; an empty, missing, or non-array value leaves the defaults in effect. The key exists so a project whose topic lives on a product Discourse instance — `!dpy`, `!caddy`, `!pi` and the like — can list those engines once for the plugin to use.

| Variable | Default | Effect |
|---|---|---|
| `OPENCODE_AGENT_INTERCOM_DEBUG` | on | `"0"` disables logging to `~/.cache/opencode-agent-intercom/debug.log` |
| `OPENCODE_AGENT_INTERCOM_LOG_REQUESTS` | off | `"1"` writes per-LLM-call JSONL to `~/.cache/opencode-agent-intercom/requests.jsonl` (path override: `_LOG_REQUESTS_FILE`) |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENTS` | `1` | Concurrent subagents per primary. `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_MAX_NESTED_SPAWNS` | `2` | Nested `spawn` calls one subagent may start, across every run of its session (the caller's one allowed target — `researcher` for `planner`, `coder`, `debugger`, `reviewer` and `designer`, `grounder` for `researcher`). `"0"` disables — the subagent must do the work itself. TUI file overrides via `"maxNestedSpawns"`. |
| `OPENCODE_AGENT_INTERCOM_MAX_CONTEXT` | `100000` | Subagent context budget (tokens). `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENT_AGE_MS` | `90000` | Watchdog window (ms) for a subagent with nothing in flight. `"0"` switches the silence and tool-call windows off, and with them the orphan sweep whose window is a multiple of this one; the run ceiling stays in force. TUI file overrides via `"maxSubagentAgeMs"`; the TUI's `silence (s)` row steps it in whole seconds. |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENT_TOOL_CALL_MS` | `660000` | The same watchdog's window (ms) for a subagent with a tool call in flight, counted from the start of that call. `"0"` means no ceiling while it works; the silence window still applies to every subagent that is not working. TUI file overrides via `"maxSubagentToolCallMs"`; the TUI's `in tool (min)` row steps it in whole minutes. |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENT_RUN_MS` | `2640000` | The watchdog's third window (ms), the wall-clock ceiling on ONE RUN of a subagent, counted from `entry.runStartedAt` and not moved by activity. At `RUN_WRAP_UP = 0.75` of the ceiling the wrap-up band fires and names the room left; at the ceiling the watchdog cuts the run off. `"0"` disables — no run ceiling, not the `0` of the two windows above. TUI file overrides via `"maxSubagentRunMs"` (and per-role `"agentRunMs"`); the TUI's `run (min)` row steps it in whole minutes. |
| `OPENCODE_AGENT_INTERCOM_MAX_RETAINED_SUBAGENTS` | `2` | How many finished subagents may be held as retained sessions in this process. `"0"` switches retention off — every subagent's session is deleted the moment its result is delivered. TUI file overrides. **Enabling retention needs an opencode restart** — the tool surface is resolved at plugin load, so the `reuse` tool only appears once the next instance boots with this set. Disabling takes effect at once. |
| `OPENCODE_AGENT_INTERCOM_MID_RUN_MESSAGING` | on | `"0"` switches the mid-run channel off: `message` and `ask` stay registered and both refuse, naming the switch. Read LIVE, not latched — unlike retention it needs no opencode restart. TUI file overrides via `"midRunMessaging"`. |
| `OPENCODE_AGENT_INTERCOM_ANSWER_WAIT_MS` | `300000` | How long a subagent's `ask` blocks on its caller's answer before the tool hands it back "no answer came" and the run carries on. `"0"` means do not wait at all — the question is delivered and the tool returns at once. Clamped against the tool-call watchdog window, so the wait can never outlive the reap. TUI file overrides via `"answerWaitMs"`. |
| `OPENCODE_AGENT_INTERCOM_MAX_MESSAGE_TOKENS` | `1000` | Ceiling (estimated tokens) on ONE mid-run message in either direction. No overflow file behind it: an over-long message or question is refused, naming the figure. TUI file overrides via `"maxMessageTokens"`. |
| `OPENCODE_AGENT_INTERCOM_RETAINED_SUBAGENT_TTL_MS` | `3600000` | Retention window per held subagent, in ms. Clamped to a floor of `1`. The TUI's row steps in whole minutes with a one-minute floor. |
| `OPENCODE_AGENT_INTERCOM_MAX_REUSE_CONTEXT` | `70000` | Reuse ceiling for every agent type the `reuseContext` map does not name. `"0"` means that type is never reused at all. The TUI panel shows and edits the per-type map; the flat key is only what an untouched type inherits. |
| `OPENCODE_AGENT_INTERCOM_MAX_RESULT_TOKENS` | `2000` | Per-type token ceiling on a subagent's final reply forwarded to the primary. `"0"` disables — that type's reply is never cut. The TUI panel shows and edits the per-type `resultTokens` map; the flat key is only what an untouched type inherits. Everything past the ceiling is cut out of the wake notice and written to `<entry.directory>/work/agent-intercom-result-<handle>-<sessionID>[-runN].md` (mode `0600`) where the subagent's directory is absolute — the project owns the file, and only a subagent can read it. Where the subagent has no absolute project directory, the overflow file falls back to `~/.cache/opencode-agent-intercom/results/` (mode `0700`); project files are not pruned, only the cache fallback is reaped after 7 days. If the write fails the session is HELD, not deleted — the opencode session is the only remaining copy of the cut text and is collected by the orphan sweep at the next plugin load. Each subagent is told its own ceiling in its system prompt and again at the context bands: a role holding `write` is told to file its detail under the project and name the path, a role without it (`gitter`, `grounder`) to keep its reply to the findings that fit and name what it left out. |
| `OPENCODE_AGENT_INTERCOM_PROJECT_CONTEXT` | on | `"0"` skips the project snapshot prepended to spawn prompts |
| `OPENCODE_AGENT_INTERCOM_RESPECT_TASK_PERMS` | on | `"0"` ignores `permission.task` allowlist in `spawn` |
| `OPENCODE_AGENT_INTERCOM_DISABLE_WEBSEARCH` / `_DISABLE_OUTLINE` / `_DISABLE_FORUM_SEARCH` / `_DISABLE_GROUNDED_SEARCH` / `_DISABLE_CALC` | off | `"1"` skips that tool |
| `OPENCODE_AGENT_INTERCOM_SKIP_CTAGS` / `_SKIP_CHROMIUM` | off | Installer-only: skip ctags build / Chromium download |
| `OPENCODE_AGENT_INTERCOM_GROUNDING_TIMEOUT_MS` | `90000` | Per-request ceiling (ms) for `grounded_search`. |
| `OPENCODE_AGENT_INTERCOM_CODEGRAPH_BIN` | — | Absolute path to the [`codegraph`](#codegraph--code-search-where-installed) binary the code-reading roles are told to run. Unset or unusable: `codegraph` on `PATH`; neither found: no role is told about it. A usable file key `"codegraphBin"` overrides. Read once per opencode process. |
| `EXA_API_KEY` | — | If set, `web_search` uses Exa's paid tier. A non-empty file key `exaApiKey` overrides it, so a key rotated in the environment alone never reaches the plugin while the file carries one: a rotation updates both, or removes `exaApiKey` from the file. |
| `OPENCODE_AGENT_INTERCOM_GOOGLE_API_KEY` / `GEMINI_API_KEY` / `GOOGLE_API_KEY` | — | API key for `grounded_search` (consulted in that order). Falls back to the `google.key` field of `${XDG_DATA_HOME:-$HOME/.local/share}/opencode/auth.json`, where `opencode auth login` writes a Gemini key. |
| `POLLINATIONS_TOKEN` | — | If set, the `gen` Pollinations fallback uses your account |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_MODE` | on | `"1"` arms endless mode — replaces the orchestrator when its context reaches `endlessContext`, after a permitted `planner` subagent has rewritten the project's todo file. `"0"` switches it off. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_CONTEXT` | `250000` | Orchestrator context threshold (tokens) while endless mode is on. Displaces the plain handoff threshold. `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_QUIESCE_TIMEOUT_MS` | `600000` | How long (ms) one endless cycle's quiesce wait may go on with none of the orchestrator's subagents running before it abandons — the orchestrator stays inside a turn, or a spawn or delivery window stays open. While a subagent of the orchestrator runs, the wait never abandons. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_WIND_DOWN_TIMEOUT_MS` | `900000` | How long (ms) the cycle waits for the permitted wind-down subagent to rewrite the todo file before abandoning. Not shown in the sidebar. |
| `OPENCODE_AGENT_INTERCOM_ENDLESS_MAX_CYCLES` | `10` | Cycle ceiling per opencode process. At the ceiling endless mode writes itself off. `"0"` arms no ceiling. |
| `OPENCODE_AGENT_INTERCOM_SHOW_AGENTCOM` | on | `"0"` hides the plugin's own postings — subagent notices, handoff kickoff, doc-summary prompts — from the transcript. Their text still reaches the model unchanged. `"1"` shows them. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_COMPACTION` | off | Automatic compaction for every agent type the `agentCompaction` map does not name. `"1"` on, `"0"` off. opencode's own `compaction.auto` is written `false` in every agent mode by `applyCompactionPolicy` (`src/compaction.js`), so the ON side is the plugin's own: it compacts that agent's session through `client.session.summarize` at the threshold that agent already has — `maxPrimaryContext` for the primary (endless mode wins over it where the cycle is in effect), the type's own context budget for a subagent, capped at three compactions per subagent run. Read LIVE at every crossing, not latched. TUI file overrides via `"compaction"` and the per-agent-type `"agentCompaction"` map; the sidebar's `compaction` row edits it per role. |
| `OPENCODE_AGENT_INTERCOM_AGENT_MODE` | `orchestrator` | `"orchestrator"` (default) runs the primary as the delegation pattern this plugin enforces; `"solo"` runs the primary as a single agent that does the work itself, with no second agent of any kind starting — none of `spawn`/`abort`/`list`/`reuse`, opencode's native `task` denied, the plugin's subagent roles disabled in the registry, opencode's hidden `title` and `summary` agents switched off, endless mode counting as off, and the orchestration guide and the limits block not injected into the primary. Latched at plugin load — a change needs an opencode restart and then holds across every further restart until it is switched back. TUI file overrides via `"agentMode"` in `~/.config/opencode/agent-intercom.json`; the `mode` row in the sidebar's TUI settings block steps through the two values with a two-step arm-and-confirm. `compaction.auto` is set to `false` in every mode by `applyCompactionPolicy` (`src/compaction.js`), so opencode's own context relief is gone — the plugin's own primary handoff replaces it, but a user who sets `maxPrimaryContext: 0` gets a `ContextOverflowError` instead of a compaction. Solo mode exists for a local model server running with `parallel 1`, where any second agent competes with the primary for the only slot. |

## Endless mode

Endless mode is on by default and turns the orchestrator handoff into a
self-restarting loop. With the switch on, the orchestrator's context is watched against
`OPENCODE_AGENT_INTERCOM_ENDLESS_CONTEXT` (default 250 000 tokens) — a higher
ceiling than the plain handoff threshold (`OPENCODE_AGENT_INTERCOM_MAX_PRIMARY_CONTEXT`,
default 80 000 tokens), and the one in effect while endless mode is on. When
the ceiling is reached the orchestrator is replaced by a fresh orchestrator
session, which is told to work the project's todo file off; that fresh session
reaches the ceiling in turn and is replaced again, and so on. A successor keeps
its predecessor's session title unchanged, so the title carries no handoff marker
or session id. The cycle-completion log records the new session id, while the
sidebar context counter starts at zero for the fresh session.

A cycle runs in this order:

1. **Trigger.** The orchestrator's turn-end hook sees the context cross
   `endlessContext` and sets a pending latch. The latch restricts nothing: the
   orchestrator keeps spawning, aborting and reusing as usual, through the
   quiesce wait, the wind-down and the hand-over. From the latch until the
   wind-down claim, its limits block on every turn says a restart is pending
   and asks it to finish only the work already running, wait for its running
   subagents, then end its turn and leave new tasks for the next session. This
   is a prompt notice only; `spawn` and `reuse` refuse nothing.
2. **Quiesce.** On the orchestrator's `session.idle`, the cycle waits until
   none of that orchestrator's own subagents is running — those it spawned
   after the latch included — and the orchestrator is idle between turns. The
   wait never abandons while one of its subagents runs; a stuck one is reaped
   by the subagent watchdog, and the orchestrator can abort it. Only a wait in
   which none runs and the orchestrator still does not go idle abandons, after
   `OPENCODE_AGENT_INTERCOM_ENDLESS_QUIESCE_TIMEOUT_MS` (default 10 minutes).
   The moment both hold, the cycle claims the wind-down. `spawn` and `reuse`
   stay open after the claim: the result of a subagent the orchestrator starts
   then is buffered and delivered to the fresh session after its kickoff, a
   subagent still running at the hand-over moves to the fresh session, and where
   the cycle ends without a replacement the buffered results go back to the
   orchestrator.
3. **Wind-down.** The orchestrator is asked to spawn a single `planner`
   subagent through a one-time permit — the one spawn the cycle recognises
   as its own. That subagent is handed the orchestrator's open work and rewrites
   the project's todo file (`TODO.md` / `todos.md`) itself with the todo
   tools, inside a machine-owned `## Intercom tasks` section the plugin fences
   off. The orchestrator has no file-writing tool of its own (`PRIMARY_TOOLS`
   is `spawn` / `abort` / `list` / `message` / `reuse` / `calc`); the permitted subagent does the writing.
   When it has finished, the plugin verifies the file it left — one regular
   file, still parsing, nothing outside the machine section moved except whole
   migrated task blocks — and restores the exact pre-write bytes if any check
   fails, bounded by `OPENCODE_AGENT_INTERCOM_ENDLESS_WIND_DOWN_TIMEOUT_MS`
   (default 15 minutes). Any failure here abandons the cycle without replacing
   the session; if the orchestrator never spawns the subagent, the plugin
   starts it itself as a fallback. A file the disk shows unchanged beside a
   reply that claims plain open work gets ONE bounded re-ask with a fresh
   permit token: a second result that changes the file completes normally, a
   byte-equal second file whose reply says `## WIND-DOWN DONE — no change` is
   believed, a re-ask answering `nothing open` with a zero-task parse ends in
   the no-open-points stop, and anything else restores the snapshot and
   abandons with the rejected bytes filed.
4. **Replace.** The plain orchestrator handoff runs with an additional kickoff
   block carrying the todo file's name and its own text; the old orchestrator
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

- **Nothing left to do.** When the wind-down subagent reports
  `## WIND-DOWN DONE — nothing open` *and* the todo file parses to no open
  tasks, the mode pauses instead of starting a session that would have nothing
  to work on.
- **No progress.** If none of the previous cycle's open task ids has cleared
  after `ENDLESS_MAX_STALLED_CYCLES` (2) consecutive cycles, the mode pauses —
  the bound against an orchestrator that keeps the same work open every cycle
  and never finishes one. Ids are monotone (an id watermark stops one being
  reused), so a rephrased list cannot read as progress that did not happen.
  This one fires after the replacement, so the pause goes on the new
  orchestrator, which is the session that would otherwise carry the loop on.
- **Cycle ceiling.** `OPENCODE_AGENT_INTERCOM_ENDLESS_MAX_CYCLES` (default
  10) cycles per opencode process. At the ceiling the mode pauses with a
  warning toast.
- **Failed-cycle cooldown.** A cycle that abandoned (quiesce timeout, save
  failure, handoff failure) arms a cooldown on that orchestrator so an
  already-over-threshold turn cannot retry on its next message; the cooldown
  lifts on its own.
- **The switch.** Turning the toggle off in the sidebar (or
  `OPENCODE_AGENT_INTERCOM_ENDLESS_MODE=0`) drops a latch that has not been
  claimed yet at the next settings read; a cycle that has already armed the wind-down permit
  still runs through to its confirm or its abandon, because the permitted
  subagent may already be rewriting the file and the cycle must not leave the
  orchestrator half-replaced. The switch-off takes effect from the next
  schedule.

Only the sidebar toggle (or the env var) writes `endlessMode`; none of these
stops touches the settings file, deletes a session, aborts a subagent or
removes a task.

## Under the hood

Built for behaviour, not deference: the orchestration pattern is **enforced**,
not requested.

- **Primary tool-gating** — `tool.execute.before` rejects any tool call from
  a primary session other than `spawn`/`abort`/`list`/`message`/`reuse`/`calc` (and denies two `list`
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
- **Compaction is per session upstream, not per agent.** opencode's
  `compaction.auto` is one global key, its agent schema carries no
  compaction entry, and no hook can veto a compaction once started. So the
  per-agent row here is the plugin's own: the global switch is written
  `false` and an agent that is switched on is compacted by a
  `client.session.summarize` call the plugin makes at its own threshold.
  Setting `compaction.auto: true` in a project's `opencode.json` does not
  survive — the plugin's write wins, or the row would say something that is
  not in effect.
- **Solo-maintainer surface area.** `pw` daemon, `gen` CLI, Exa SSE parser,
  ctags subprocess, eleven opencode hooks. 2671 unit tests, no CI against real
  opencode. Bugs are addressed at hobby-project pace.

## Development

```sh
npm run check   # syntax check (node --check over src/, scripts/ and bin/)
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
