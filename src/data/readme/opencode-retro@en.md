# opencode-retro

[Русский](README.md) | **English** | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [日本語](README.ja.md)

Retrospectives for coding agents. An [OpenCode](https://opencode.ai) v2 plugin that reads the dialogue of a finished session, finds what would make the agent work better, and turns that into proposed changes to the project's own harness: its skills, its instructions, its tools.

An agent does not learn from its own sessions. The only record of where it struggled is the log, and logs go unread. This plugin reads the log and comes back with proposals.

> Status: complete and working, verified against OpenCode 2.0.32. The npm package is `opencode-retro`; `v0.1.0` is its first release with functionality.

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

When a session ends its log is kept, and nothing further happens until asked. An analysis costs a model call, and nothing in this plugin spends that unprompted.

`/retro` is the moment it happens. For every log that has accumulated it writes a **work order** — a file in `.retro/work/` naming that log, saying which part of it is new, and carrying the criteria and how to answer — and asks the agent in the session you ran it in to have each one read by a subagent of its own. Every waiting log gets an order in one command; `options.extractLimit` caps how many, and anything left over is reported so another `/retro` takes the next batch.

The order does not contain the log; it points at it. Reading it is the subagent's job, and it is better placed to decide how — all at once, or the head and then on — than any rule the plugin could apply from outside. A subagent that gets only part way through says so, and the rest stays owed: `selfcheck.md` lists the log as read in part until it is done, and the next `/retro` asks about the remainder.

Each order is read by one subagent, in a context of its own. The plugin calls no model and picks none: the reading happens on your session's model and your session's settings, with OpenCode's own agent loop. The agent that did the work being analysed is deliberately excluded, since it would defend its own decisions — a subagent was not in that session and has nothing of its own to defend.

The answer is a call to the `retro_record` tool, whose schema is the output format: a malformed answer is refused by OpenCode before it reaches the plugin, and the subagent is told why and can try again. An answer with no lessons is a real answer — the session went straight. Once the records are in, the agent calls `retro_propose`, and that is what puts a lesson to you. An order nobody answers is not held against the log: nothing is concluded from silence, because a reader that failed and one that was never started look identical from here. The next `/retro` asks again, and `selfcheck.md` says how many times a log has been asked about with no answer.

Sessions that have not finished are read as well, including the one the command was run in: their friction is the most recent there is. Reading one closes nothing. The plugin remembers how far each log was read, and whatever the session writes next is read on a later `/retro` — only that part: what has already become a lesson is not analysed a second time. Sessions that are left open and returned to are the normal case, so without that a `/retro` weeks later would re-read everything and re-derive lessons that were already acted on. The plugin does not need to know whether a session is still running: everything it knows is on disk in `.retro/`, so a restart, a crash or a second OpenCode on the same project changes nothing about what is read.

A session is skipped without a call only when it cannot contain evidence of anything: one instruction, one answer, nothing done. A conversation with no tool calls at all is still analysed, because that is exactly where a wrong instruction file shows up — a wrong answer and a correction, with nothing executed.

There is nothing to configure for any of this: no model, no API key, no provider. The work runs where your session already runs.

The log it reads is the shadow log as written: one JSON object per line, one step per object, with each tool result clamped head-and-tail to `maxOutput` at the moment it was captured so that a single enormous result cannot sit in the log for ever. The analysis answers one question:

> If this session ran again, what should change in the project so that it goes shorter and straighter?

The answer is a list of lessons in `.retro/lessons/`.

A finished log is analysed once; an order that goes unanswered is asked for again, and `.retro/selfcheck.md` says how many times it has been asked with no answer. That is reported as a fact rather than as a verdict about the log: the plugin cannot tell a reader that failed from one that was never started, and the usual cause is a hand-over waiting in the inbox of a session that is still working. A log the plugin itself cannot read is a different matter — after three of those it is set aside and named. A project in which `/retro` is never run is never analysed.

### What guides the extraction

The criteria are not compiled into the plugin. They live in [`prompts/extract.md`](prompts/extract.md), seeded into the project as `.retro/prompts/extract.md` and editable there. They describe the shapes worth looking for:

- Work repeated for nothing: the same call made again with no file changed in between.
- An edit made and then undone, whether by a later edit or by discarding the working tree.
- A skill followed into a dead end, where a command the skill prescribed failed afterwards.
- A failure that does not look like one: a non-zero exit code behind a status that reads "completed".
- A task dropped in silence, visible only in what the agent wrote.
- A correction the user had to make more than once.

The file states that this is a starting point and not a checklist.

### Propose

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
  "plugins": [{ "package": "opencode-retro" }]
}
```

There is nothing to configure: the plugin calls no model of its own, so there is no model to pick, no key to supply and no provider to reach. An analysis runs as a subagent of the session that asked for it. `.retro/selfcheck.md` reports whether one ran, and why it failed if it did not.

**Check what npm actually has first.** Every version below `0.1.0` is a name placeholder: it loads without error, registers no command, creates no `.retro/`, and reports nothing — so following this snippet before the first real release leaves a session that looks normal and a plugin that is not there. If `npm view opencode-retro version` is below `0.1.0`, point `package` at an absolute path to a checkout instead; that is also how the plugin is run while working on it. A relative path leaves session startup hanging without an error, and an exact version can be pinned (`opencode-retro@0.1.0`) once there is one.

Everything else is optional:

- `dir` — where everything lives, default `.retro`.
- `prompts` — the prompt directory, default `prompts` inside it.
- `halfLife` — sessions without a recurrence before a lesson's score halves, default ten.
- `proposeLimit` — lessons in one `/retro all`, default ten.
- `extractLimit` — work orders issued by one `/retro`, unlimited by default.
- `maxOutput` — characters of tool output stored in the shadow log per step, default 8000.
- `heartbeatMs` — the shortest gap between self-check writes while a session works, default 60000.
- `keepSessions` — keep every log, including ones nothing cites; off by default.

### What appears on disk

Everything the plugin writes stays under `.retro/` in the project, and nowhere else unless a proposal is accepted. All of it is plain text.

```
.retro/
  prompts/
    extract.md       what counts as a lesson
    propose.md       how a lesson is handed over, one or many
    updates/         newer defaults, not in use
  sessions/          raw logs, kept while unread, cited, or written in the last week
  work/              a work order per log waiting to be analysed
  lessons/           open questions
  archive/           accepted, rejected and evicted lessons
  selfcheck.md       whether the plugin is working
  state.json
  plugin.log         errors from hooks, commands and background work
  .gitignore         seeded once, then the project's
  README.md          what this directory is, for whoever opens it — seeded once
```

A log is removed once three things are true: it has been read to the end, no open lesson cites it, and nothing has been written to it for seven days. A lesson's evidence names a session and a range of steps, and during review the question "what actually happened there?" has to have an answer that is not a summary, so a cited log stays. The seven days are what make removal safe without knowing whether a session is still running: a session that keeps writing keeps its log, and one picked up after a quiet week starts a new log, read from its start. A log nobody has read is never removed, however old. Growth is bounded by the number of open lessons, which is capped, and by a week of sessions, rather than by the age of the project.

There is nothing to add to the project's `.gitignore`. On first run the plugin writes `.retro/.gitignore` and git applies it to everything below: sessions, work orders, state, the self-check, the plugin log, prompt update notices and any half-written `.tmp` file a crash left are ignored, while `lessons/`, `archive/` and the live prompt files are not. That file is seeded once and is the project's own from then on.

The split is the design rather than a convenience. Lessons and the archive are knowledge about the project: readable, visible in review, and they travel with the repository. The prompts are its configuration, worth sharing with whoever else works here. The rest would only make noise in a diff.

### Prompts

Two prompts shape what the plugin does, and both are files in the project: what counts as a lesson, and how a lesson is handed over. The second covers a batch as well — `/retro all` sends the same rule, whose last section says what changes when several lessons arrive at once: one plan, grouped by file, the dropped ones named. One rule rather than one per command, so editing it cannot leave a second copy disagreeing with it.

Each is seeded from the packaged default on first run and never written to again. Resolution is the project first, then `~/.config/opencode/retro/prompts/`, then the packaged default, so a prompt can be pinned for one project, for every project, or for neither.

When a newer default ships it arrives as `prompts/updates/<name>.vN.md`, with a note at the top saying that the file is not in use. Nothing is applied on the user's behalf.

What stays in the source is the machinery: the answer's format, the order of a lesson's fields, and the instruction to record a decision. The format is written into each work order rather than into the prompt file, so editing a prompt cannot remove it — and its machine half is the schema of the `retro_record` tool, which OpenCode enforces before an answer reaches the plugin.

## Checking that it works

A registered hook proves nothing. A hook registered under a name the API no longer uses registers successfully and then never fires.

`.retro/selfcheck.md` therefore reports liveness rather than setup, by comparing what the event stream saw against what the hooks received. It carries its own staleness rule:

> **If you are working right now and `heartbeat` is more than a few minutes old, this plugin is not running.**

Those checks run every time the file is written and cost nothing: the API surface the plugin depends on, which prompt layer is in force, and what is waiting, under a header naming the plugin and OpenCode versions. Whether an analysis gets through is not asked separately — every `/retro` exercises it, and an order that came back unanswered is reported as what it was.

## Requirements

- OpenCode v2, `@opencode/plugin` 2.0.18 or newer. Verified against 2.0.32.
- Nothing beyond OpenCode itself. An analysis runs as a subagent of the session you ran `/retro` in, on that session's model.
- No runtime dependencies.

## License

MIT
