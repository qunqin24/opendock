# opencode-subagent-intervene

[![npm](https://img.shields.io/npm/v/opencode-subagent-intervene)](https://www.npmjs.com/package/opencode-subagent-intervene)
[![CI](https://github.com/rmk40/opencode-subagent-intervene/actions/workflows/ci.yml/badge.svg)](https://github.com/rmk40/opencode-subagent-intervene/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/rmk40/opencode-subagent-intervene)](LICENSE)
[![OpenCode 2.2+](https://img.shields.io/badge/OpenCode-2.2%2B-black)](https://opencode.ai/v2/docs/)
[![discord](https://img.shields.io/badge/discord-discussion-5865F2?logo=discord&logoColor=white)](https://discord.com/channels/1391832426048651334/1565393733204316290)

An [OpenCode](https://opencode.ai) plugin that lets an agent stop and steer its subagents,
check their progress and manage its own context usage and compaction.

OpenCode 2 lets an agent hand work to subagents, including background ones that keep going while
the parent does something else. A person can stop one by pressing `ctrl+d` in the TUI's Subagents
tab or with the stop button in the web app. On a default install the agent can't, so an agent
working on its own has to wait out a subagent that went the wrong way, or stop everything.
OpenCode 2.4 added a Code Mode tool that interrupts a session, but it sits behind an experimental
flag and doesn't keep the session stopped (see
[How does this compare with `opencode.session.interrupt`?](#how-does-this-compare-with-opencodesessioninterrupt)).
This plugin adds that control, plus the visibility an agent needs to use it well.

## Why you'd want it

You run an orchestrating agent that fans work out to background subagents, and you aren't always
watching. One subagent misreads its task, or loops on a failing test, or turns out to be
unnecessary because another one already found the answer. Without this plugin the parent can only
wait for it to finish and throw the result away. With it, the parent stops that one subagent and
leaves the rest alone.

A few things make that work in practice:

- **A stopped subagent stays stopped.** In plain OpenCode, when a stopped subagent's background shell
  or its own subagent finishes, the completion notice wakes it up and it starts a new run nobody is
  watching. This plugin interrupts those runs as they start, until the parent or a person
  deliberately gives the subagent new work.
- **Nothing is lost.** A stopped subagent keeps its history. The parent can continue it later with
  new instructions, and the subagent is told why it was stopped.
- **The parent can find its subagents again.** After compaction, the session IDs it was given may be
  gone from its context. `subagents.list` brings them back, with which ones are running, how they
  ended, and what they cost.
- **The parent can redirect without stopping.** `subagent_send` puts a message in a running
  subagent's queue. The subagent reads it as soon as its current tool calls finish, and nothing it
  was doing is thrown away. The same call can move the subagent to another model or agent from its
  next model request.
- **The parent hears when a subagent is stuck.** A subagent waiting on a permission prompt or a
  question can sit there for hours if nobody is watching. After a minute, the plugin tells the
  parent, which can then tell you or stop it. A subagent that shows no progress for ten minutes
  with no tool call running gets a notice too.
- **A hung run doesn't pass for a running one.** When OpenCode fails to record the end of a run,
  the plugin notices that the subagent is no longer running and says so, instead of reporting it
  running for hours.
- **The parent can look before it acts.** `subagents.inspect` shows what a subagent is running right
  now and for how long, when its run and its current model response started, when it last made
  progress, its latest text and error and the summary it wrote at its last compaction.

People have asked for this upstream in
[#36423](https://github.com/anomalyco/opencode/issues/36423),
[#38966](https://github.com/anomalyco/opencode/issues/38966), and
[#59566](https://github.com/anomalyco/opencode/issues/59566).

## Quick start

1. Install the plugin. It needs OpenCode 2.2.0 or later.

   ```sh
   opencode plugin add opencode-subagent-intervene
   ```

2. Start a session and ask your agent to run something in a background subagent.
3. Ask it to change that subagent's instructions. It calls `subagent_send` with the subagent's
   session ID and the message.
4. Ask it to stop the subagent. It calls `subagent_stop` with the session ID and a reason.

OpenCode picks up the plugin without a restart.

## Installation

`opencode plugin add` installs the package and adds it to your global config. To add it by hand,
list it under `plugins` in `~/.config/opencode/opencode.jsonc` or a project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-subagent-intervene"],
}
```

The package lists `@opencode/plugin` and `effect` as optional peer dependencies. OpenCode provides
both to every plugin, so installing it adds nothing else.

Install it globally if your agents work across several projects. Each project directory OpenCode
opens loads its own copy of the plugin, and a stop is only kept while at least one copy is loaded.

## Tools

| Tool                | How the model calls it          | What it does                                                                                       |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `subagent_stop`     | Direct tool, next to `subagent` | Stops subagents and everything they launched                                                       |
| `subagent_send`     | Direct tool, next to `subagent` | Sends a running subagent a message or switches its model or agent without stopping it              |
| `subagents.list`    | Code Mode                       | Lists your subagents with run state, last activity, last outcome, cost, tokens, and directory      |
| `subagents.inspect` | Code Mode                       | Shows one subagent's run times, running tools, latest text and error, pending prompts, and summary |
| `context_status`    | Direct tool                     | Reports the caller's last measured context usage and model limits                                  |
| `context_notes`     | Direct tool                     | Saves, reads or clears working notes kept through automatic and manual compaction                  |
| `context_compact`   | Direct tool                     | Requests compaction of the caller's session with optional handoff notes                            |

If Code Mode is off, OpenCode offers `subagents.list` and `subagents.inspect` as direct tools
named `subagents_list` and `subagents_inspect`.

The four subagent tools check, from fresh session data, that the target is a subagent the caller launched or
one launched below it. Anything else fails with `Session … is not one of your subagents.` The
subagent tools are hidden from agents that aren't allowed to launch subagents, such as OpenCode's built-in
`general` and `explore` agents.

Whitespace around a session ID is ignored. When an ID matches none of the caller's subagents, the
error lists up to three of the subagents the caller launched whose IDs come close, with their
title and state. A match shares at least eight characters after `ses_` with the ID given, or
equals it once stray spaces are removed. Longer shared starts rank first. Ties go to the closer
ID overall. The plugin never acts on a suggestion. If the caller has more subagents than
one scan reads, the error says the suggestions may be incomplete.

```text
Session ses_e192abab3ffe5Pp7ZAHb3S1Wsx is not one of your subagents.
Close matches among the subagents you launched; check the ID before using one:
- ses_e192ababeffe7TE8JsAA6an1OJ (general, "Run the test suite"): running
```

The context tools operate only on the caller's session and have their own `context_status`,
`context_notes` and `context_compact` permission keys. They do not require permission to launch
subagents. Agents with a deny-all tool whitelist, including built-in `explore`, need explicit
allow rules for these three keys. To use only the subagent tools, set the `contextTools` option to
`false`, which removes the three context tools and the context notices.

### `subagent_stop`

Pass `sessionIDs` (up to 20) or `all: true`, and a short `reason`. `all: true` stops every subagent
you launched that is running, or that has running work below it.

```json
{
  "sessionIDs": ["ses_2f1c8b9e4ffeQ1nV7xKpLm3RtA"],
  "reason": "The bug is in parser.ts, not lexer.ts. Stop before it rewrites the lexer."
}
```

The model gets one line per stopped session, then a short note about native notices and how to
continue:

```text
- ses_2f1c8b9e4ffeQ1nV7xKpLm3RtA (general, "Fix tokenizer bug"): stopped
```

Each session ends up with one of these results:

| Result            | Meaning                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `stopped`         | It was running and the stop ended its run                                               |
| `finished`        | It finished on its own before the stop landed                                           |
| `already_idle`    | Nothing was running                                                                     |
| `no_recorded_end` | OpenCode reports it idle, but its last run recorded no end, so there was nothing to end |
| `stopping`        | Still running when the wait ended; it stays stopped once its run ends                   |
| `continued`       | Someone gave it new work while the stop ran, so it was left alone                       |
| `deleted`         | The session was deleted during the stop                                                 |

A `no_recorded_end` subagent is rendered as `not running; its last run recorded no end`. It is
stopped like the others, so a later wake is interrupted. Continuing it with `subagent` works as
usual.

What happens during a stop:

1. The plugin records the stop for the subagent and everything below it, then interrupts them,
   deepest first. It always interrupts without resuming queued work.
2. It waits for them to settle, up to three rounds of 4 seconds, and stops anything new that
   appeared below them in the meantime. A wait that ends because OpenCode has no run left for a
   subagent counts as evidence that it is idle, which is how a run with no recorded end is told
   apart from one still stopping.
3. Until someone continues the subagent, every new run that starts in it is interrupted before it
   sends a model request. The plugin holds the run in OpenCode's `context` hook, which runs just
   before each model request, until it has handled every event that could have continued the
   subagent and the interrupt has landed. The run ends as interrupted a few milliseconds after it
   started.
4. The stop lifts when the parent continues the subagent by calling `subagent` with its session ID,
   when a person sends it a message, or after 24 hours. The continuing prompt then starts with
   `<stopped-by-parent at="…">reason</stopped-by-parent>`, so the subagent knows what happened.

The plugin keeps each stop in OpenCode's plugin storage. A stop ends when the subagent is continued,
when the stop expires or when the subagent was woken so often that the plugin stopped keeping it
stopped. A week after a subagent's latest stop ended, or twice `latchTtlHours` after if that is
longer, the plugin removes every stop record the subagent has. `subagents.list` and
`subagents.inspect` then no longer show that stop. The plugin looks for such records when it loads
and every six hours after that.

A subagent launched in the background also sends the parent OpenCode's own notice, saying it was
cancelled, or completed if it finished first. From OpenCode 2.3, OpenCode reports every run of a
subagent that ends to its parent, so each run the plugin stops in a stopped subagent sends the
parent another cancelled notice. The tool result tells the model that these notices only confirm
the stop.

If the parent's own run is interrupted while the stop runs, the stop records and interrupts nothing
more. The stops it already recorded stay in place. OpenCode 2.2 then records the call as
aborted. OpenCode versions that let a tool finish after an interrupt, such as 2.4, return the
plugin's error instead, which says the stop was cancelled before it finished and that some of the
subagents may already be stopped.

### `subagent_send`

Pass a `sessionID` and at least one of `message`, `model` and `agent` (see
[Switching the model or agent](#switching-the-model-or-agent)). A `message` holds up to 8000
characters. Line breaks and code in the message are kept. A longer message is refused with its
length, the limit and the overage. Nothing is sent.

```text
message is 8,412 characters; the limit is 8,000 (412 over). Nothing was sent.
```

```json
{
  "sessionID": "ses_8a0d2c71bffeTz4WqLx9mNc5Hd",
  "message": "Skip the Windows target for now; CI doesn't build it. Finish the Linux and macOS jobs first."
}
```

The message goes into the subagent's queue, wrapped in
`<parent-message from="…">…</parent-message>` so the subagent knows who sent it. Sending never
interrupts anything. The subagent reads the message once its current tool calls finish, before its
next model request. If it is ten minutes into a test run, the message waits for the run to end.

The result says when the subagent will read it and how long the work it waits on has been
going. Tool calls show how long each has run, or for one whose input is still streaming, how
long since its input started.

```text
Message sent to ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export"). It reads your message after its current tool calls finish: shell (running 47m). Sending never interrupts; to redirect it right away, stop it with subagent_stop and continue it with subagent.
```

With no tool call running, the note gives when the current model response started and when it
last produced output:

```text
Message sent to ses_e26c00aa1ffeLm3RtAQ1nV7xKp (general, "Plan the migration"). It reads your message once its current model response finishes; the response started 4m ago and last produced output 5s ago. Sending never interrupts; to redirect it right away, stop it with subagent_stop and continue it with subagent.
```

The last output comes from events this copy of the plugin observed. After a reload, before it
has seen any, the note gives only the start time OpenCode stored for the response. The
structured result's `lastActivityAt` holds the last progress the plugin observed, when it has
seen some.

| Status        | Meaning                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `sent`        | It is running, or its state is unknown, and reads the message at its next step; the note says which                                     |
| `delivered`   | It already read the message, and may have finished its run since                                                                        |
| `queued`      | It finished its run without reading the message; the message is delivered when the subagent is continued                                |
| `unconfirmed` | It finished its run, and whether it read the message first can't be checked; if it didn't, the message is delivered when it's continued |

A call that switches the model or agent without a message has no `status`.

`subagent_send` refuses a subagent that is idle or stopped, and sends nothing. Continue those with
`subagent` and their session ID instead. A message from the plugin can't start a run that reports
back to the parent; only `subagent` can. An idle refusal says how long ago the subagent went
idle, or that the time wasn't recorded. When the call asked for a switch, the refusal also says
how to continue a subagent you launched under another model, with `subagent`, its session ID, an
`agent` and a `model`.

A subagent that OpenCode reports idle although its last run recorded no end is refused the same
way, because nothing would read the message until it is continued:

```text
Subagent ses_e26b6053dffeQ1nV7xKpLm3RtA is not running, so nothing was sent: OpenCode reports it idle, but its last run recorded no end, so the message would not be read until it is continued with subagent. When it stopped running is unknown; its last activity was 7h ago. To give it your message, continue it: call subagent with its sessionID and the message.
```

OpenCode can also steer a running subagent when the parent calls `subagent` again with its session
ID, an agent, a prompt and optionally a `model`. `subagent_send` differs in four ways. It reaches
subagents launched by your subagents. It switches the agent or model only when the call names
one, while `subagent` switches the agent whenever the name it gets differs from the subagent's. It
can switch without a message. It tells the parent when the message will be read and when the
switch takes effect.

To change course right away, without waiting for the current tool call, stop the subagent with
`subagent_stop` and continue it with `subagent`. Only the tool call in flight is lost.

#### Switching the model or agent

`model` switches the subagent to another model, written as `providerID/modelID` or
`providerID/modelID#variant`. `agent` switches it to another agent. Without `model`, the subagent
also moves to the new agent's configured model when that agent has one. It keeps its current model
when the agent has none. Nothing switches unless the call names a `model` or an `agent`.

```json
{
  "sessionID": "ses_8a0d2c71bffeTz4WqLx9mNc5Hd",
  "model": "openai/gpt-5#high",
  "message": "The parser rewrite needs more reasoning. Keep going at the higher effort."
}
```

Before it changes anything, the plugin checks the request against the agents and models of the
directory its copy runs in. A subagent in another directory can't be switched (see
[Limits](#limits)). The first three checks are the ones OpenCode's `subagent` tool makes when it
continues a child. The fourth goes further.

- The model is an available chat model. An image or decision model is refused. So is a variant
  the model doesn't have, with an error that lists the variants it has.
- The agent exists and can run as a subagent. A primary-only agent such as `build` is refused, as
  is an unknown name. Both errors list the agents that can run as subagents.
- The caller may run the new agent as a subagent. The plugin checks OpenCode's `subagent`
  permission with the agent as the resource, as `subagent` does. A rule that allows or denies it
  decides at once. OpenCode asks a person only when the caller's rules say to ask.
- A new agent's configured model passes the same model checks. OpenCode's `subagent` switches to
  that model without checking it. A subagent left with a model that isn't available fails at its
  next step. The plugin refuses the switch up front instead, which leaves the subagent running as
  it was.

When a check fails, nothing is switched or sent.

```text
Variant "ultra" is not available for "openai/gpt-5". Available: low, medium, high. Nothing was switched or sent.
```

Reading the catalog takes a moment, while a permission prompt can wait on a person for much
longer. So once every check passes, the plugin reads the subagent's record again. If its agent or
model changed in the meantime, the plugin plans the switch again from that record, so the result
names what the subagent had right before the switch. It refuses the call if the subagent already
ran the agent you asked for and someone switched it away meanwhile, since switching it back needs
a permission check the call didn't make. It also refuses when the subagent is still being switched
after two new plans. Last, just before the first change, it checks that the subagent isn't
stopped and is still running. If any of these checks fails, it refuses the call, with nothing
switched or sent.

The plugin then switches the agent and then the model before it queues the message. If a switch
fails, nothing is sent. The error says what was switched before the failure. If the message fails
after the switch, the error says the switch stays in effect and the message wasn't sent.

From OpenCode 2.2 through 2.4, a session reads its agent and model each time a step or a retry
starts. A running subagent makes its next model request with the new agent and model. Tool calls
in flight finish first, the same as before it reads a message. A model response in flight
finishes on the old model. The step that reads the message normally uses the new ones too, with
one exception described under [Limits](#limits).

```text
Switched ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export") from model anthropic/claude-sonnet-4-5 to openai/gpt-5#high. Message sent. It reads your message after its current tool calls finish: shell (running 47m). It uses the new model from its next model request. Sending never interrupts; to redirect it right away, stop it with subagent_stop and continue it with subagent.
```

Without a message, the result says when that next model request starts.

```text
Switched ses_8a0d2c71bffeTz4WqLx9mNc5Hd (explore, "Add CSV export") from agent general to explore. It keeps model openai/gpt-5#high, since agent explore has no configured model. It uses the new agent from its next model request, which starts after its current tool calls finish: shell (running 47m). Switching never interrupts; to redirect it right away, stop it with subagent_stop and continue it with subagent. If you continue it later with subagent, pass agent explore: any other agent name switches its agent again.
```

After an agent switch on a subagent you launched yourself, the result also reminds you to pass the
new agent's name when you continue it with `subagent`, since any other name switches its agent
again.

The structured result lists what changed in `switched`, as `agent` and `model`, each with `from`
and `to`. Models are written with their variant. `from` is absent when the subagent had no value
of its own recorded and ran OpenCode's default. A value that was already in effect is left out of
`switched`. The note says so instead. The result's top-level `agent` is the agent the subagent
runs after the call.

To continue a subagent whose agent you switched, pass the new agent's name to `subagent`. OpenCode
switches a child to whatever agent `subagent` names.

### Notices when a subagent is waiting

When a subagent has been waiting on a permission prompt or a question for a minute, the plugin
posts a notice to the subagent's parent, the way OpenCode posts its own completion notices. An idle
parent wakes up to read it:

```text
<subagent-waiting sessionID="ses_8a0d2c71bffeTz4WqLx9mNc5Hd" kind="permission">Your subagent ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export") has been waiting 1m on a permission prompt: shell for cargo test --workspace. Only a person can answer it, in OpenCode. Tell the user, or stop it with subagent_stop. It continues on its own once someone answers.</subagent-waiting>
```

Each prompt gets at most one notice, even with copies of the plugin loaded in several projects, and
it still arrives when the subagent was moved to another project. The plugin follows each prompt
through OpenCode's events, so a prompt someone answered within the minute produces nothing. It never
answers a prompt itself. That stays with a person.

### Notices when a subagent appears stalled

When a running subagent shows no progress for 10 minutes, the plugin posts a notice to its parent
the same way. Progress means a step starting or ending, streamed text, reasoning or tool input,
or tool progress or a tool result. A subagent with a tool call running, a prompt open or a retry delay
pending isn't silent, so a long shell command produces no notice.

```text
<subagent-stalled sessionID="ses_e26b6053dffaTz4WqLx9mNc5Hd" kind="no-progress">Your subagent ses_e26b6053dffaTz4WqLx9mNc5Hd (general, "Write the docs") appears stalled: it is running but has shown no progress for 12m 3s, with no tool call running and no prompt open. Look at it with subagents.inspect, or stop it with subagent_stop and continue it with subagent. Nothing was interrupted; it keeps running until you act.</subagent-stalled>
```

Before posting, the plugin asks OpenCode whether the subagent still runs. If OpenCode reports it
idle although its last run recorded no end, the notice says so instead, since messages sent to
it won't be read until someone continues it:

```text
<subagent-stalled sessionID="ses_e26b6053dffeQ1nV7xKpLm3RtA" kind="no-recorded-end">Your subagent ses_e26b6053dffeQ1nV7xKpLm3RtA (general, "Fix tokenizer bug") appears stalled: it has shown no progress for 7h 2m, and OpenCode reports it idle, but its last run recorded no end. It is not running, so messages sent to it are not read until it is continued: call subagent with its sessionID. Nothing was changed.</subagent-stalled>
```

Each silent stretch gets at most one notice. New progress or the end of the run starts over,
including progress that only streamed output. Copies of the plugin in several projects post the
same notice ID for a stretch, so the parent gets one notice. The ID is built from what OpenCode
stored about the run and from the ID of the event that showed the last progress, which every copy
receives. The notice never interrupts, stops or continues anything. The plugin skips the notice
while the parent waits on that subagent in the foreground. It also skips it when either of them
is stopped. If reading the subagent or posting the notice fails, the plugin logs it once and
tries again a threshold later, with the same notice ID, so a retried post adds no second notice.
Set `stallNoticeMinutes` to change the threshold, or to `0` to turn the notice off.

After a break in OpenCode's event stream, the plugin prefers missing a repeated notice over
posting one twice. A copy that posted for a subagent before the break skips the notice after it
while what OpenCode stored about the run is unchanged. A subagent that only streamed output during
the break and then went silent again stores nothing new, so that copy misses the second stall.
Copies without a break still post it.

### Runs with no recorded end

OpenCode records the end of each run as an event. If that write fails, for example because the
disk filled up, nothing reports the run as over. The subagent can then look like it is running
for hours. When a subagent tool or a stall notice looks at a subagent that has shown no progress
for 2 minutes, the plugin first asks OpenCode whether it still has a run going. When OpenCode
says it doesn't and no new run started while it asked, the plugin treats the subagent as idle
with no recorded end until it runs again. It asks only about the subagents a call is about to
report, never all of them on a timer. `subagents.list` and `subagents.inspect` show `noRecordedEnd`, `subagent_send` refuses
it as above and `subagent_stop` reports `no_recorded_end`.

### `subagents.list`

Called from Code Mode:

```js
const { entries } = await tools.subagents.list({ state: "running" });
```

| Input                 | Default | Description                                                                                             |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `depth`               | `1`     | `1` lists the subagents you launched; up to `4` adds the ones they launched                             |
| `state`               | `"all"` | `"running"`, `"idle"`, or `"all"`. `"running"` includes unknown state                                   |
| `activeWithinMinutes` | none    | `1` to `10080`. Keeps subagents that are running, or that were active or ended within that many minutes |
| `sessionIDs`          | none    | Up to 50 session IDs to look up directly, at any depth below you                                        |
| `cursor`              | none    | The `nextCursor` of an earlier call, for the next page                                                  |

It returns up to 50 entries per call, running ones first. The filters apply before that limit,
so a page holds 50 matches when there are that many.

Each entry has `lastActivityAt` when it is known. For a running subagent that is the last
progress this copy of the plugin observed. For an idle one it is when its run ended. The
rendered line shows its age. An entry has `noRecordedEnd: true` when OpenCode reports the
subagent idle but its last run recorded no end. `stateSource` says where the state came from.
It reads `stored` when OpenCode couldn't be asked and the state comes from its stored record of
the latest run, which needs OpenCode 2.2.2 or later.

Each entry also has a `directory`. The rendered line shows it only when it differs from the
caller's own:

```text
- ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export"): running; last activity 12s ago; openai/gpt-5; no cost reported; 96 in + 4210337 cached / 31408 out tokens; directory /home/me/src/app-csv
- ses_e26b6053dffeQ1nV7xKpLm3RtA (general, "Fix tokenizer bug"): idle, its last run recorded no end; last activity 7h ago; openai/gpt-5; no cost reported; 0 in + 0 cached / 0 out tokens
```

#### Paging

When more matches remain, the result has a `nextCursor`. Pass it as `cursor` with the same
`depth`, `state` and `activeWithinMinutes` to get the next page. Following `nextCursor` until
it is absent returns every matching subagent once, give or take sessions created or deleted
between calls.

```js
let page = await tools.subagents.list({ state: "idle", activeWithinMinutes: 60 });
const ids = page.entries.map((entry) => entry.sessionID);
while (page.nextCursor !== undefined) {
  page = await tools.subagents.list({ state: "idle", activeWithinMinutes: 60, cursor: page.nextCursor });
  ids.push(...page.entries.map((entry) => entry.sessionID));
}
```

The first call reads up to 2000 sessions under your most recently updated subagents, where the
running ones are. If the tree is larger, each later page reads up to 2000 more, until the whole
tree is read. The fields relate to the cursor this way.

- `total` counts the matches the listing has found so far, across its pages. It can grow while
  `complete` is false.
- `truncated` is true when `total` is larger than the entries on this page, whether the others
  were on earlier pages or come on later ones.
- `complete` turns true once the listing has read the whole tree.

A listing fixes which subagents matched, and their order, when it finds them. A later page shows
each one's current state and details, read again for that page, even when they no longer match
the filters. A subagent deleted since is left out of its page, and `total` still counts it.

The plugin keeps each listing in memory for 30 minutes after its last page was read. A cursor
from an expired listing, from another copy of the plugin, or from before a reload fails with an
error that says to list again. A cursor passed with other filters fails the same way.

#### Looking up subagents by ID

`sessionIDs` looks each ID up directly, the way `subagent_stop` does, so it finds any subagent
you could stop, however many subagents you have. `state` and `activeWithinMinutes` still apply
but `depth` doesn't. Found entries keep the order you gave. IDs that aren't your subagents come
back in `errors`, each with its message and up to three close matches.

```text
- ses_e192ababeffe7TE8JsAA6an1OJ (general, "Run the test suite"): running; last activity 47m ago; openai/gpt-5; no cost reported; 0 in + 0 cached / 0 out tokens
- Session ses_e192abab effe7TE8JsAA6an1OJ is not one of your subagents.
  Close matches among the subagents you launched; check the ID before using one:
  - ses_e192ababeffe7TE8JsAA6an1OJ (general, "Run the test suite"): running
```

A subagent starts in its parent's directory. Its directory changes only when its session is moved,
for example with OpenCode's move tool, `tools.opencode.session.move` in Code Mode
(`tools.opencode.session_move` before OpenCode 2.4). A subagent that just runs `cd` inside its
shell commands still shows the parent's directory.

### `subagents.inspect`

```js
await tools.subagents.inspect({ sessionID: "ses_8a0d2c71bffeTz4WqLx9mNc5Hd" });
```

`maxChars` (200 to 12000, default 4000) caps the text it returns. It reads the messages since the
subagent's last compaction, plus the summary written at that compaction. Active tools show their
input, cut only to fit `maxChars`, with how long they have been going. A tool whose input is still
streaming is timed from when its input started.

```text
Session ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export")
Directory: /home/me/src/app-csv
State: running
Phase: running tool calls
Run started: 9m ago (live)
Last activity: 4m 12s ago (live)
Pending permissions: none
Scope: messages since the last compaction, plus its summary of the earlier work
Active tools:
- shell (running, 4m 12s): {"command":"bun test test/export.test.ts"}
Recent tools: read, edit, shell
Last error: none
Last assistant text:
The export test fails on quoted commas. Fixing the escaper.
Summary of earlier work (from the last compaction):
Added the CSV writer and the export command. Remaining: quoting, then the docs.
```

The structured result gives `executionStarted`, `responseStarted` and `lastActivity`, each with
the time in `at`, its age in `ageMs` and its `source`. A `live` time comes from events this copy
of the plugin observed. A `stored` time comes from what OpenCode saved, which the plugin falls
back to after a reload. Stored times never include streaming, so one can be older than the
subagent's real last activity. `phase` says what a running subagent is doing, from live events
only. It is `model` while a response streams, `tool` during tool calls, `prompt` while a
permission prompt or a question is open, `retry` while a failed model request waits to be retried
and `between` otherwise.
`noRecordedEnd` and `stateSource` mean the same as in `subagents.list`. An active tool has
`runningForMs` once it runs, or `streamingForMs` while its input streams.

The summary gets whatever room the other fields leave. If none is left, the Scope line says so and
suggests a larger `maxChars`.

### `context_status`

Call with `{}` for a short status line with measured tokens, remaining input capacity, notice
starting percentage, automatic-compaction estimate, measurement time and latest compaction
status.
Usage includes input, output, reasoning and cache tokens from the latest eligible completed
response. It is not cumulative session billing.

The primary percentage uses the usable input window, which drives the plugin's notices. This
is the smaller positive input and context limit, or whichever one is known. The status adds a
separate UI percentage only when the context limit is known and differs from that window.
For example, 214,560 tokens is 78.88% of a 272,000-token input window and 53.64% of a
400,000-token context limit. Equal denominators need only one figure.

For a 750k measurement in a 1M input window, the line includes `250k remaining` and
`assumed default auto ~850k (100k away)`. These are separate budgets. The first is capacity
left in the input window, while the second is distance to the automatic-compaction estimate.
Overruns appear as `50k over input window` or `150k past estimate`.

The structured result retains both `reportedWindowPercent` and `reportedContextPercent` when
known, along with exact token counts, the raw token breakdown, model limits and measurement IDs.
`inputHeadroomTokens` and `autoCompactionHeadroomTokens` are signed differences from those two
limits. They appear only with a current-model measurement and a known input window.

Later messages and pending tool or subagent results are not included in the measurement.
Usage is unknown before the first measurement and after compaction until
another response completes. A previous model's measurement is identified separately rather than
used to calculate the current model's percentages.

OpenCode compacts automatically once the conversation fills the usable window minus its
[`compaction.buffer`](https://opencode.ai/v2/docs/compaction#buffer). Plugins can't read
OpenCode's configuration, so the plugin's `compactionBuffer` option mirrors that setting. With
`"compactionBuffer": "10%"`, an 850.3k measurement in a 1M window shows
`configured auto ~900k (49.7k away)`. Without the option, the plugin assumes OpenCode's default
buffer, which keeps 15% of the window free, or 16k when that is more on windows of at least 32k.
The 750k example above then shows `assumed default auto ~850k (100k away)`, followed by a
reminder to set `compactionBuffer` to match `compaction.buffer`. The structured
`autoCompactionEstimate` holds the token count, the percentage of the window and its `source`,
which is `configured`, `default` or `configured-ignored` when OpenCode ignores the configured
buffer for that window (see Configuration). The estimate assumes automatic compaction is on,
because `compaction.auto` isn't visible to plugins either. Disabled plugin notices are identified
in the status line.

### `context_notes`

Save working notes whenever the agent needs to preserve exact decisions, session IDs or the
next action without requesting compaction.

```json
{
  "action": "save",
  "notes": "CSV parsing is implemented in src/import.ts. Test agent ses_8a0d2c71bffeTz4WqLx9mNc5Hd owns test/import.test.ts. Next, read its result and handle malformed rows."
}
```

`save` replaces the latest notes with 1 to 12,000 Unicode code points. Longer notes are
refused with an error that gives their length, the limit and the overage. The saved notes stay
unchanged. The notes go with every model request, so keep them concise. Whitespace and line
breaks are preserved exactly. `read` returns the saved text with its revision and save time,
or reports that no notes are saved. `clear` removes the active notes and is safe to repeat.
Pass `notes` only with `save`.

The host keeps the latest notes through automatic and manual compaction, independently of the
generated summary. They use one native session instruction entry, stored as structured JSON
labelled agent-authored reference data. OpenCode places instruction entries in system context.
The notes describe the agent's work and do not supply new user or system instructions.

Saving appends a context update at the next step boundary without requesting compaction or
starting an idle session. Updates preserve the existing context baseline until compaction,
and the host carries the latest notes or their removal into the next model request after
compaction. A change made just before manual compaction can arrive as an update to the previous
baseline on that first request. Clearing removes the active entry and announces its removal.
Earlier copies can remain in the baseline, history or summaries.
The entry persists across plugin reloads. If its stored format is unreadable, `read` and `save`
report an error, and `clear` removes it.

This tool remains available when `selfCompaction` or `contextNotices` is off, and is removed only
when `contextTools` is off. Notes saved before that stay in their session's context, because
OpenCode keeps the entry. To remove them, turn `contextTools` back on and call `clear`. The notes
are separate from the optional handoff supplied to `context_compact`.

### `context_compact`

Call with `{}` or optional handoff notes of up to 16,000 Unicode code points.

```json
{
  "handoff": "CSV parsing is implemented in src/import.ts. The quoting tests pass. Next, add the malformed-row error and run the import suite."
}
```

A longer handoff is refused before anything is requested, with an error that gives its length.

```text
handoff is 21,105 characters; the limit is 16,000 (5,105 over). Nothing was requested.
```

The tool returns once OpenCode accepts the request. Compaction normally runs after all tools in
the current step finish and the agent then continues. The result reports the actual delivery
mode. If OpenCode already has a queued compaction, it reuses that request without promoting it
to immediate delivery.

Handoff notes are stored as an ordinary synthetic message. With steered compaction, they are
delivered after the new checkpoint. With an existing queued compaction, they can arrive before
it and later be summarized. If note admission fails, the result says that compaction is already
requested but the notes were not stored. Request admission does not guarantee that summary
generation will succeed.

A child requesting compaction cannot undo a parent's stop. The tool accepts no target session
ID and does not replace OpenCode's automatic compaction.

### Context notices

After successful tool calls, the plugin reports usage at 50%, 60%, 70%, 80%, 85%, 90%, 95%
and 100% of the usable input window. Each notice gives the measured usage, model, measurement
time, remaining input capacity and distance to the automatic-compaction estimate. The estimate
reads `configured auto ~900k (49.7k away)` when `compactionBuffer` is set and
`assumed default auto ~850k (100k away)` otherwise. These measurements let the agent plan how
much work fits before compaction. The agent decides when compaction is worth its cost.

The planning guidance asks the agent to continue while the next step and its expected output
fit before the automatic-compaction point, with room left for results not yet measured. It
also asks the agent to narrow large results when possible. A notice alone is not a reason to
compact.

The `contextWarningPercent` option sets the first notice, with a default of 50%. Notices repeat
every ten percentage points below 80%, then at the fixed 80%, 85%, 90%, 95% and 100% milestones
that are above the starting percentage. A start of 65% gives 65%, 75%, 80%, 85%, 90%, 95% and
100%. A start of 83% gives 83%, 85%, 90%, 95% and 100%. A jump across several milestones emits
only the highest reached one. Notices add the UI percentage only when its denominator differs.
The automatic-compaction estimate appears when the window is known.

Notices are appended to session history without rewriting earlier messages or system
instructions. Their text stays fixed on later requests. Compaction replaces history and can
require rebuilding cached context. Plugin upgrades that change tool definitions can also
invalidate cached context. Tool-free final answers do not trigger notices or an extra response.

Each notice identifies its measurement, model and compaction checkpoint. It ends with
"Later messages and pending tool or subagent results are not included in this measurement."
A notice already queued when compaction runs can arrive afterward. The milestones control
notification frequency only. OpenCode's automatic-compaction threshold is separate.

## Configuration

Options go in the object form of the plugin entry:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-subagent-intervene",
      "options": { "confirmStop": true },
    },
  ],
}
```

| Option                  | Default | Description                                                                                        |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `confirmStop`           | `false` | Check the `subagent_stop` permission before stopping, once per kind of subagent                    |
| `latch`                 | `true`  | Keep stopped subagents stopped until someone continues them. With `false`, a stop is one interrupt |
| `latchTtlHours`         | `24`    | How long a stop is kept if nobody continues the subagent                                           |
| `notifyChild`           | `true`  | Start the prompt that continues a stopped subagent with the stop reason                            |
| `settleMs`              | `4000`  | How long each settle round waits for stopped subagents to go idle                                  |
| `promptNotices`         | `true`  | Tell the parent when a subagent is waiting on a permission prompt or a question                    |
| `promptNoticeSeconds`   | `60`    | How long a prompt stays open before the parent is told, from `0` to `3600`                         |
| `stallNoticeMinutes`    | `10`    | How long a running subagent shows no progress before the parent is told, up to `1440`; `0` is off  |
| `contextTools`          | `true`  | Offer the context tools and context notices. With `false`, the four options below have no effect   |
| `contextNotices`        | `true`  | Report context usage after successful tools at each reached milestone                              |
| `selfCompaction`        | `true`  | Offer `context_compact` while keeping the status and notes tools available                         |
| `contextWarningPercent` | `50`    | Set the starting percentage for context notices                                                    |
| `compactionBuffer`      | unset   | Mirror OpenCode's `compaction.buffer` for the automatic-compaction estimate                        |

The starting percentage must be above 0% and below 100%.

`compactionBuffer` takes the same values as OpenCode's `compaction.buffer`. That is a
percentage string from `"1%"` to below `"100%"`, such as `"10%"` or `"12.5%"`, or a whole number
of tokens. Plugins can't read OpenCode's configuration, so set it to the value in your OpenCode
config. Without it, the context tools and notices assume OpenCode's default buffer.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "compaction": { "buffer": "10%" },
  "plugins": [
    {
      "package": "opencode-subagent-intervene",
      "options": { "compactionBuffer": "10%" },
    },
  ],
}
```

As in OpenCode, a configured buffer is kept free exactly, without the default's 16k minimum. A
token count at least as large as a model's window is ignored for that model, which then gets
the default. For a 1M window the status line then shows
`configured buffer ignored, default auto ~850k` with the structured `source` set to
`configured-ignored`.

Invalid values and unknown options are ignored with a warning, and the default is used.

With `confirmStop` on, OpenCode asks before each stop unless a permission rule decides. The
resource is the stopped subagent's agent name. These rules let the agent stop `general` subagents
on its own and refuse everything else:

```jsonc
{
  "permissions": [
    { "action": "subagent_stop", "resource": "*", "effect": "deny" },
    { "action": "subagent_stop", "resource": "general", "effect": "allow" },
  ],
}
```

To hide the four subagent tools, deny the agent `subagent`. The context tools use their own
permission keys and do not grant access to other sessions.

For an agent with a deny-all whitelist, allow just the context tools in its permission rules.

```jsonc
{
  "permissions": [
    { "action": "context_status", "resource": "*", "effect": "allow" },
    { "action": "context_notes", "resource": "*", "effect": "allow" },
    { "action": "context_compact", "resource": "*", "effect": "allow" },
  ],
}
```

## Questions

### How do I cancel a background subagent in OpenCode?

Install this plugin, then ask your agent to stop it. The agent calls `subagent_stop` with the
subagent's session ID and a reason, or with `all: true` to stop every running one. A person can also
press `ctrl+d` in the TUI's Subagents tab or use the stop button in the web app; the plugin gives
the agent the same control, and keeps the subagent from being woken up again afterwards.

### How does this compare with `opencode.session.interrupt`?

OpenCode 2.4 added `opencode.session.interrupt`, a Code Mode tool that interrupts a session and
every session below it and cancels their background shells. Release builds offer it only when the
experimental `full_codemode` flag is on, set with `experimental.full_codemode: true` in your config
or `OPENCODE_FLAGS=full_codemode`. It interrupts once. It doesn't keep the session stopped when
background work wakes it, tell the session why it was stopped or report a result for each session.
It accepts any session except the caller and the sessions above it.

Use `subagent_stop` when the subagent should stay stopped until someone continues it, or when you
want the reason passed on and a result for each session. Use `opencode.session.interrupt` when its
background shells must be cancelled too, which a plugin can't do. Calling `subagent_stop` on a
subagent the native tool already interrupted keeps it stopped from then on.

### How do I send a running subagent new instructions?

Call `subagent_send` with its session ID and the message. The subagent reads it once its current
tool calls finish. Add `model` or `agent` to switch it as well, from its next model request.
OpenCode 2.2 can also steer natively when the parent calls `subagent` again with the session ID,
an agent, a prompt and optionally a `model`. That works only for direct children, always needs a
prompt and switches the subagent's agent whenever the agent name differs from its current one,
along with the model when that agent has one configured. `subagent_send` reaches subagents your
subagents launched, switches nothing unless asked and can switch without a message.

### Why does a stopped subagent start running again?

When a stopped subagent's background shell or its own subagent finishes, OpenCode's completion
notice wakes it and starts a new run. This plugin interrupts those runs as they start, until the
parent or a person continues the subagent on purpose.

### How can an agent tell which subagents are still running?

`subagents.list({ state: "running" })` from Code Mode. It works after compaction too, when the
session IDs the agent was given are no longer in its context.

### Does it work with OpenCode 1?

No. It needs OpenCode 2.2.0 or later (`@opencode/cli`). In OpenCode 1 (`opencode-ai`), subagents
were called tasks and plugins use a different API.

## Limits

- **Background shells keep running.** A shell a subagent started in the background isn't cancelled
  when the subagent stops; OpenCode gives plugins no way to do that
  ([#60107](https://github.com/anomalyco/opencode/issues/60107)). When the shell finishes and wakes
  the subagent, the plugin stops that run. With the `full_codemode` flag on, OpenCode's own
  `opencode.session.interrupt` cancels these shells.
- **The parent hears about each run the plugin stops.** From OpenCode 2.3, OpenCode reports every
  run of a subagent that ends to its parent. Plugins can't hold that report back. Each run the
  plugin stops in a stopped subagent sends the parent another cancelled notice. An idle parent
  starts a run to read it. Such runs start when a stopped subagent's background shell or its own
  subagent finishes. A subagent stopped together with its own subagents usually gets one right
  after the stop, because their cancelled notices arrive while its own run winds down.
- **A woken run can still send one model request.** Only the copy of the plugin loaded for the
  subagent's own project can hold a run before its model request. That copy also lets the run go
  ahead when it has received no events since it loaded or since its event stream last reconnected,
  or when it hasn't caught up with OpenCode's events within half a second. In those cases another
  copy, or the same one, interrupts the run once the event that started it arrives. The first
  request usually goes out about 10 ms before that. It produces no reply or tool call, but some
  providers may still bill it.
- **A woken run can still compact.** OpenCode decides whether to compact automatically before the
  hook the plugin uses runs. Near the compaction point it can also start a summary in the
  background. A woken subagent over or near that point can send a compaction request before the
  plugin stops the run. The plugin leaves compaction alone, because it can't tell an automatic
  compaction in a woken run from one a person or the agent asked for.
- **The first wake after a restart can slip through.** If a subagent is woken before any copy of the
  plugin has loaded, that one run isn't stopped. Later wakes are.
- **Only a subagent's own parent can continue it.** A stopped grandchild stays stopped until the
  subagent that launched it continues it, or the stop expires.
- **A person typing into a stopped subagent gets the note too.** The stop reason is prepended to their
  message, the same as for the parent's.
- **One stop covers at most 200 sessions and 8 levels.** A larger tree is refused before anything
  changes; stop its branches by session ID.
- **`all: true` can report an idle subagent as `stopped`.** An idle subagent with running work below
  it is included. Stopping that work sends it OpenCode's cancelled notice, which wakes it, and the
  plugin then stops that new run.
- **A stop can lose an answer that was just written.** If a subagent finishes in the same few
  milliseconds as the stop, OpenCode can record the run as cancelled even though the final reply
  was saved, and the parent never receives it.
- **A queued message switched to steer skips the stop reason.** If a person queues a message for a
  stopped subagent and then switches it to steer, the subagent continues normally but never sees why
  it was stopped.
- **A subagent in another directory can't be switched.** OpenCode's plugin API lists only the
  models of the directory a copy of the plugin runs in, whatever directory it is asked about. For
  a subagent moved to another directory, checking against those models could refuse a model that
  exists there or accept one that doesn't. So a call that asks to switch a subagent whose
  directory differs from the plugin copy's is refused, with nothing switched or sent. The error
  names both directories. A subdirectory or a worktree of the same project counts as another
  directory. Switch the subagent from a session in its directory, or continue a subagent you
  launched with `subagent`, an agent and a `model`. Messages without a switch still reach it.
- **A message can still be read under the previous model.** OpenCode reads a subagent's agent
  and model when a step starts and takes in queued messages a moment later. If a step starts just
  before `subagent_send` switches the subagent, that step can take in the message under the
  previous agent and model. The model request after it uses the new ones.
- **Messages and notices wait for tool calls.** Neither `subagent_send` nor a notice to the parent
  interrupts a tool call in flight. A parent that is itself waiting on a subagent in the foreground
  gets no notice, because it couldn't read one until that subagent returns. If the plugin loaded
  while that call was already running, or OpenCode's event stream broke during it, the parent gets
  the notice anyway. From OpenCode 2.3, `subagent` always runs in the background, so no parent
  waits on a subagent this way.
- **A notice can wake a parent that is itself a subagent.** If that parent is idle, the notice
  starts a run. Before OpenCode 2.3, that run's result doesn't reach the parent above it, the same
  as with OpenCode's own completion notices. From 2.3, OpenCode reports it to the parent above like
  any other run.
- **Notices only cover prompts the plugin saw open.** A prompt that was already open when the
  plugin loaded gets no notice. After a break in OpenCode's event stream, open questions are
  forgotten, and an open permission prompt is kept only if this project's copy of the plugin can
  still see it.
- **Copies with different delays can wake a parent twice.** If projects set different
  `promptNoticeSeconds`, a later copy's duplicate can start a short, empty run in an idle parent.
  The same goes for different `stallNoticeMinutes`. Copies agree on a notice's ID, so the parent
  reads it once, but OpenCode wakes the parent on every attempt to post it, even when a notice
  with that ID already exists.
- **Stall notices need the plugin to have watched the subagent.** A copy of the plugin posts one
  only after it has watched a whole threshold of silence itself. Usually that silence starts at
  the last progress the copy saw. A subagent that went silent before the plugin loaded gets no
  notice until it makes progress again.
- **A break in the event stream restarts the watch.** For a subagent it saw running before a break
  in OpenCode's event stream, a copy counts the silence from the end of the break. It posts once a
  whole threshold passes with no event from the subagent. The copy can't follow tool calls,
  prompts and retries across the break, so it checks OpenCode's stored messages for a running tool
  call or a pending retry, and its own project's list of permission prompts. While any of those
  shows the subagent busy, the copy checks again a threshold later. A question that was open
  before the break holds the notice back until the subagent shows an event. An answer to the
  subagent's question or permission prompt counts as such an event, and the silence is then
  watched from the answer. The copy keeps checking storage after that event until the subagent
  starts or ends a step, because a tool call that outlasted the break is still unknown to it until
  then, even after another call finishes. The same holds for a subagent first seen in the middle
  of a run.
- **A copy that may have missed the last progress can post a duplicate.** A copy can't tell
  whether a subagent's last progress came during a break in its event stream, so for a subagent
  it followed across a break, it builds the notice ID without the last progress event. Its ID
  then differs from the ID of a copy that had no break. The parent can then get the notice twice,
  once from each copy. A copy never posts twice for one silence: one that posted before the break
  skips the notice after it while what OpenCode stored about the run is unchanged.
- **A long hook in another plugin can look like a stall.** OpenCode lets a plugin continue a run
  from its `experimental.idle` hook. While such a hook runs, the subagent produces no progress
  events, so a hook that takes longer than `stallNoticeMinutes` can trigger a stall notice. The
  same holds for a model that thinks for a long time without streaming anything.
- **Run state that no event showed depends on `session.wait`.** From OpenCode 2.4 that call is
  part of the host's experimental session API, which can change within the supported versions.
  If it is missing, the plugin logs one warning and reports such state as unknown. Stall notices
  and the check for runs with no recorded end are then off.
- **Run times after a reload are stored ones.** The plugin learns live progress only from events
  it observes. After it loads, `subagents.inspect` falls back to the times OpenCode stored, which
  never include streaming. The start of an unfinished run is stored from OpenCode 2.2.2.
- **Cursors live in one copy of the plugin.** A listing is kept in memory, so its cursor fails
  after a reload, after 30 minutes without use, or in another project's copy of the plugin.
- **Pending-prompt fields only see their own project.** `waitingOnPermission` in `subagents.list`,
  `pendingPermissions` in `subagents.inspect`, and the permission line in `subagent_send`'s result
  read OpenCode's list of open prompts, which covers only the project that copy of the plugin runs
  in. For a subagent moved to another project they can show none, while the notice still arrives.
- **Inspect can't read before the last compaction.** Only the summary written at the compaction is
  available; older messages aren't readable from a plugin. With OpenCode's experimental
  `sqlite_fts` flag on, OpenCode 2.4's own `opencode.session.read` reads a session's messages from
  before its compaction. Inspect also can't show a running command's output so far.
- **Cost can read 0.** Providers that report no pricing, which is common with subscription sign-ins,
  leave `cost` at 0, shown as `no cost reported`. Token counts are still real.

## Troubleshooting

**The subagent tools don't show up.** The agent isn't allowed to launch subagents, so those tools are hidden
too. Check its `subagent` permission. A blanket allow rule in your config re-enables it for agents
like `general` that deny it by default.

If a context tool is missing, check its own permission key and the `contextTools` option. For
`context_compact`, check the `selfCompaction` option too.

**`subagents.list` returns `complete: false`.** The caller has more than 2000 subagents and their
subagents. The first page covers 2000 sessions under the most recently updated subagents, which
includes every running one in practice. Follow `nextCursor` to read the rest, or pass
`sessionIDs` to look specific subagents up.

**A cursor fails with "This cursor is unknown or expired".** The plugin reloaded, the listing went
unread for 30 minutes, or the call reached another project's copy of the plugin. List again
without `cursor`.

**`subagent_send` says the subagent is idle.** It finished, or was never started. Continue it with
`subagent`, its session ID, and your message. To continue it under another model, add `model` to
that call.

**A subagent shows as running for hours with nothing happening.** Check it with
`subagents.inspect`. If OpenCode failed to record the end of its run, the plugin finds that out
once the subagent has shown no progress for 2 minutes and reports it as idle with no recorded
end. Continue it with `subagent` to give it new work. If it still shows as running, it has a run
going that makes no progress, such as a model response that stopped streaming. Stop it with
`subagent_stop` and continue it with `subagent`.

**`Session … is not one of your subagents` for an ID you just used.** Compare the ID with the
close matches the error lists. IDs often get cut short or pick up a stray character.

**No notice arrives for a waiting subagent.** Check that `promptNotices` isn't off, and that the
prompt stayed open for `promptNoticeSeconds`. On OpenCode before 2.3, a parent that is waiting on
that subagent in the foreground gets no notice while that call runs. If someone moves the call to
the background while the prompt is still open, the notice follows about a second later.

## Development

```sh
bun install
bun run build
bun run typecheck
bun run test
bun run test:protocol
```

The end-to-end scenarios in `test/e2e/` drive a sandboxed OpenCode through
[opencode-drive](https://github.com/anomalyco/opencode-drive), with its own config, data, and
database. They need Bun 1.3.14 or later and `opencode2` on your `PATH`:

```sh
bun run build
bun run probe ./test/e2e/smoke.ts
```

To release, start from a clean working tree, run `npm version patch -m "chore(release): %s"` (or
`minor`, `major`), and `git push --follow-tags`. The tag starts the Release workflow, which publishes
to npm with provenance and creates the GitHub Release. A version with a prerelease suffix, such as
`1.1.0-beta.1`, goes to npm's `next` tag and is marked as a prerelease on GitHub.

## License

[MIT](LICENSE)
