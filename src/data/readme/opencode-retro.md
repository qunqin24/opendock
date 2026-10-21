# opencode-retro

**English** | [Русский](README.ru.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [日本語](README.ja.md)

Retrospectives for coding agents. An [OpenCode](https://opencode.ai) v2 plugin that reads the dialogue of a finished session, finds what would make the agent work better, and turns that into proposed changes to the project's own harness: its skills, its instructions, its tools.

An agent does not learn from its own sessions. The only record of where it struggled is the log, and logs go unread. This plugin reads the log and comes back with proposals.

> Status: complete and working, verified against OpenCode 2.0.32. The npm package goes live with `v0.1.0`; until that tag lands, point `opencode.json` at a checkout.

## The problem

The same obstacles repeat across sessions:

- A skill says to run the linter. The project has no linter. The agent runs it anyway, rewrites forty files, notices, and reverts everything.
- An instruction file requires a build command before committing. The project defines no such script, so the step fails every time it is obeyed.
- The code style is written down nowhere, so each session re-derives it by reading the sources first.
- A failing command is retried several times with nothing changed between attempts.
- A task from the plan is dropped quietly, as "not possible right now".
- The same correction is given by hand for the third week running.

All of it is in the log. None of it reaches the next session.

## How it works

Two loops, deliberately separate. One runs by itself and costs no attention. The other runs on request and produces one decision at a time.

### Capture

Every tool call and every prompt is appended to a shadow log at `.retro/sessions/<id>.jsonl`. No model is involved; the plugin only writes. The log is therefore independent of context compaction: the raw trajectory survives whatever the session does to its own history.

### Extraction

When a session ends its log is kept, and by default nothing further happens until asked. Analysis costs a model call, and by default nothing in this plugin spends that unprompted.

`/retro` is the moment it happens. One command compresses the logs that have accumulated, turns them into lessons, and only then looks for something to hand over. Every waiting log is analysed in one command; `options.extractLimit` caps how many, and anything left over is reported so another `/retro` takes the next batch.

Each log is analysed in a session of its own, created for that one call and removed afterwards: the log goes in, no agent, no history and no tools are involved, and text comes out. The agent that did the work is deliberately excluded, since it would defend its own decisions.

Sessions that have not finished are read as well, including the one the command was run in: their friction is the most recent there is. Nothing about them is settled, though. The log is not marked analysed, because the session will have more to say, and it is not removed while the session is working. A working session is read again only once its log has grown, so running `/retro` twice costs nothing for a session that has said nothing new.

A session is skipped without a call only when it cannot contain evidence of anything: one instruction, one answer, nothing done. A conversation with no tool calls at all is still analysed, because that is exactly where a wrong instruction file shows up — a wrong answer and a correction, with nothing executed.

`options.autoExtract` moves the analysis of a finished session to the start of the next session instead, for anyone who would rather have lessons ready before asking.

By default the analysis uses the model your own sessions run on, falling back to the workspace default. This works on OpenCode's free-tier models too, so nothing needs configuring. `options.model` pins a different one, which is worth doing if the analysis should run somewhere cheaper than the work.

That call receives a compressed view of the session. Tool output is trimmed hard; prompts and replies are kept in full up to a few thousand characters each. It answers one question:

> If this session ran again, what should change in the project so that it goes shorter and straighter?

The answer is a list of lessons in `.retro/lessons/`.

A finished log is analysed once; a failed reply is retried on the next two runs and then set aside. By default, a project in which `/retro` is never run is never analysed.

### What guides the extraction

The criteria are not compiled into the plugin. They live in [`prompts/extract.md`](prompts/extract.md), seeded into the project as `.retro/prompts/extract.md` and editable there. They describe the shapes worth looking for:

- Work repeated for nothing: the same call made again with no file changed in between.
- An edit made and then undone, whether by a later edit or by discarding the working tree.
- A skill followed into a dead end, where a command the skill prescribed failed afterwards.
- A failure that does not look like one: a non-zero exit code behind a status that reads "completed".
- A task dropped in silence, visible only in what the agent wrote.
- A correction the user had to make more than once.

The file states that this is a starting point and not a checklist.

### Review

The plugin reads the log. The human reads proposals. It stops at the proposal and does not edit project files.

| Command | What it does |
|---|---|
| `/retro` | Analyses what has accumulated, then delivers one lesson: the highest scoring one still undecided. |
| `/retro all` (or `/retro-all`) | The same analysis, then waiting lessons as a single plan, up to `proposeLimit` (ten by default), to be approved in one pass. |

There is no third command. Whether the plugin is working is reported in `.retro/selfcheck.md`, rewritten from the first prompt of every session and again when it ends.

A lesson is delivered into the session the command was run in, addressed to the agent already there. The agent is asked first whether the lesson still holds, then to relay it, and to change nothing until a decision has been made.

```
# retro — lint-skill-no-config

The lint skill prescribes `npx eslint . --fix`, which this project cannot run.

Seen in 2 sessions, 9 steps spent on it, confidence 0.9, score 16.2.
Last seen 3 sessions ago.

Proposed change
  AGENTS.md — make the lint requirement conditional on a committed ESLint config.

Needs a decision
  Should this project have ESLint configured, or should the convention be dropped?
```

The decision belongs to the human and the agent in that session. The agent has the files, the history and the project's own skills, which makes it a better judge of whether a lesson still applies than the plugin can be. Once a decision is made, the agent records it through a `retro_decide` tool. That tool only keeps books: a rejection is remembered, and the lesson is not proposed again.

`/retro all` is the same hand-over for everything at once. Waiting lessons are ranked and handed over together, up to `proposeLimit`; the agent checks which still hold and gathers the rest into one plan grouped by file, which is approved once.

### Where a fix belongs

A lesson records a problem. Where to fix it is decided during the hand-over, by the agent and the human, after looking at what the workspace actually has: which instruction files the harness reads here, whether skills exist at project or global level, whether something more specific already covers the task.

The options:

- Amend an instruction file, for a fact or a constraint that applies broadly.
- Amend a skill, when a skill gave the wrong steps or fired when it should not have.
- Create a skill, or an instruction file scoped to the directory where the rule applies, when the right place does not exist yet.
- Request a tool, when the gap is a missing capability rather than a missing instruction.
- Change the project's code, when the trap is in the code. Never applied without explicit agreement.
- Leave it unplaced, when the right home is genuinely unclear.

Lessons themselves are always local to one workspace. A fix may not be: when the cause is how a person works everywhere, the fix belongs in their global harness, because fixing it in one project leaves it broken in the rest. Nothing outside the project is edited without asking.

The procedure and this list live in [`prompts/propose.md`](prompts/propose.md), which is seeded into the project and can be edited there.

## Lessons

A lesson is a Markdown file with YAML frontmatter.

```yaml
id: lint-skill-no-config
statement: The lint skill assumes eslint; this project has no linter.
evidence:
  - session: a81f
    steps: [41, 58]
  - session: c204
    steps: [12, 19]
cost: 34
recurrence: 3
confidence: 0.9
lastSeen: 41
recordedAt: 2026-10-19T15:16:04.134Z
proposal:
  target: .opencode/skills/lint/SKILL.md
  change: |
    Before running, check for a lint config and a lint script.
    If absent, do not run; report instead.
ask: Is the linter really unused here?
status: new
```

`cost` is the number of steps the problem consumed, summed across sessions. `recurrence` is the number of independent sessions it appeared in. `lastSeen` is the workspace session count when the lesson was last written.

### Ranking

The score is `cost × recurrence × confidence × freshness`.

Freshness halves every `halfLife` sessions — ten by default — in which the problem has not appeared, counted in sessions rather than days. At one session a day, decay measured by the clock would bury everything overnight.

Recurrence weighs more than a single expensive incident. A problem seen in three sessions will be seen in a fourth.

### Lifecycle

A lesson is keyed by problem, not by session. A second session that hits the same thing adds its evidence and increments `recurrence` instead of creating another file.

`lessons/` holds open questions only. Accepting or rejecting moves the file into `archive/`, and nothing is ever deleted; marking it `later` keeps it open. A problem that returns after being closed is the same problem plus the news that the fix did not hold, so it is reopened with its history intact. A fixed cap of thirty keeps the list short; what overflows is archived as well, except lessons marked `later`.

## Install

OpenCode fetches the plugin from npm; name it in `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-retro",
      "options": {
        "model": { "providerID": "deepseek", "id": "deepseek-flash" }
      }
    }
  ]
}
```

`options.model` is optional. Without it the plugin uses the model your sessions run on, falling back to the workspace default. `.retro/selfcheck.md` reports whether an analysis ran, and why it failed if it did not.

To run a checkout instead — when working on the plugin itself — point `package` at its absolute path. A relative path leaves session startup hanging without an error.

Everything else is optional:

- `dir` — where everything lives, default `.retro`.
- `prompts` — the prompt directory, default `prompts` inside it.
- `halfLife` — sessions without a recurrence before a lesson's score halves, default ten.
- `proposeLimit` — lessons in one `/retro all`, default ten.
- `extractLimit` — logs analysed by one `/retro`, unlimited by default.
- `maxOutput` — characters of tool output stored in the shadow log per step, default 8000.
- `maxInput` — characters one analysis may send, default 32000. Past a limit of its own the model returns an empty answer rather than an error, so a long log is trimmed to fit: less tool output first, then whole steps from the middle, each gap saying how many went.
- `extractTimeoutMs` — how long one analysis may take before it is given up on, default 90000.
- `heartbeatMs` — the shortest gap between self-check writes while a session works, default 60000.
- `keepSessions` — keep every log, including ones nothing cites; off by default.
- `autoExtract` — analyse at the start of the next session instead of waiting to be asked; off by default.

### What appears on disk

Everything the plugin writes stays under `.retro/` in the project, and nowhere else unless a proposal is accepted. All of it is plain text.

```
.retro/
  prompts/
    extract.md       what counts as a lesson
    propose.md       how a lesson is handed over, one or many
    updates/         newer defaults, not in use
  sessions/          raw logs, kept while an open lesson cites them
  lessons/           open questions
  archive/           accepted, rejected and evicted lessons
  selfcheck.md       whether the plugin is working
  state.json
  plugin.log         errors from hooks, commands and background work
  .gitignore         seeded once, then yours
```

A log stays on disk as long as an open lesson cites it. A lesson's evidence names a session and a range of steps, and during review the question "what actually happened there?" has to have an answer that is not a summary. Once every lesson citing a log has been decided, the log is removed. Growth is bounded by the number of open lessons, which is capped, rather than by the age of the project.

There is nothing to add to the project's `.gitignore`. On first run the plugin writes `.retro/.gitignore` and git applies it to everything below: sessions, state, the self-check, the plugin log and prompt update notices are ignored, while `lessons/`, `archive/` and the live prompt files are not. That file is seeded once and is the project's own from then on.

The split is the design rather than a convenience. Lessons and the archive are knowledge about the project: readable, visible in review, and they travel with the repository. The prompts are its configuration, worth sharing with whoever else works here. The rest would only make noise in a diff.

### Prompts

Two prompts shape what the plugin does, and both are files in the project: what counts as a lesson, and how a lesson is handed over. The second covers a batch as well — `/retro all` sends the same rule, whose last section says what changes when several lessons arrive at once: one plan, grouped by file, the dropped ones named. One rule rather than one per command, so editing it cannot leave a second copy disagreeing with it.

Each is seeded from the packaged default on first run and never written to again. Resolution is the project first, then `~/.config/opencode/retro/prompts/`, then the packaged default, so a prompt can be pinned for one project, for every project, or for neither.

When a newer default ships it arrives as `prompts/updates/<name>.vN.md`, with a note at the top saying that the file is not in use. Nothing is applied on the user's behalf.

What stays in the source is the machinery: the output format the parser requires, the order of a lesson's fields, and the instruction to record a decision. The output format is never written to disk, so editing a prompt cannot remove the format the parser requires.

## Checking that it works

A registered hook proves nothing. A hook registered under a name the API no longer uses registers successfully and then never fires.

`.retro/selfcheck.md` therefore reports liveness rather than setup, by comparing what the event stream saw against what the hooks received. It carries its own staleness rule:

> If work is in progress and `heartbeat` is more than a few minutes old, the plugin is not running.

Those checks run on every review and cost nothing: the API surface the plugin depends on, which prompt layer is in force, and what is waiting, under a header naming the plugin and OpenCode versions. Whether the model answers and whether the output format still parses are not asked separately — every analysis exercises both, and an unparseable reply is reported in the model's own words.

## Requirements

- OpenCode v2, `@opencode/plugin` 2.0.18 or newer. Verified against 2.0.32.
- Nothing beyond OpenCode itself. The analysis runs on your own model by default; an inexpensive one is enough.
- No runtime dependencies.

## License

MIT
