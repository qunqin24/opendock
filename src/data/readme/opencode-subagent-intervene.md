# opencode-subagent-intervene

[![npm](https://img.shields.io/npm/v/opencode-subagent-intervene)](https://www.npmjs.com/package/opencode-subagent-intervene)
[![CI](https://github.com/rmk40/opencode-subagent-intervene/actions/workflows/ci.yml/badge.svg)](https://github.com/rmk40/opencode-subagent-intervene/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/rmk40/opencode-subagent-intervene)](LICENSE)
[![OpenCode 2.2+](https://img.shields.io/badge/OpenCode-2.2%2B-black)](https://opencode.ai/v2/docs/)
[![discord](https://img.shields.io/badge/discord-discussion-5865F2?logo=discord&logoColor=white)](https://discord.com/channels/1391832426048651334/1565393733204316290)

An [OpenCode](https://opencode.ai) plugin that lets an agent stop the subagents it launched, including
background ones, send them new instructions while they work, see which ones are still running, and
check what each one is doing.

OpenCode 2 lets an agent hand work to subagents, including background ones that keep going while
the parent does something else. It gives the parent no way to stop one. A person can press `ctrl+d`
in the TUI's Subagents tab or use the stop button in the web app, but the agent can't, so an agent
working on its own has to wait out a subagent that went the wrong way, or stop everything. This
plugin adds that control, plus the visibility an agent needs to use it well.

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
  was doing is thrown away.
- **The parent hears when a subagent is stuck.** A subagent waiting on a permission prompt or a
  question can sit there for hours if nobody is watching. After a minute, the plugin tells the
  parent, which can then tell you or stop it.
- **The parent can look before it acts.** `subagents.inspect` shows what a subagent is running right
  now and for how long, its latest text and error, and the summary it wrote at its last
  compaction.

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
| `subagent_send`     | Direct tool, next to `subagent` | Sends a running subagent a message without stopping it                                             |
| `subagents.list`    | Code Mode                       | Lists your subagents with run state, last outcome, cost, tokens, and directory                     |
| `subagents.inspect` | Code Mode                       | Shows one subagent's running tools, latest text and error, pending permission prompts, and summary |

If Code Mode is off, OpenCode offers the last two as direct tools named `subagents_list` and
`subagents_inspect`.

Every call checks, from fresh session data, that the target is a subagent the caller launched or
one launched below it. Anything else fails with `Session … is not one of your subagents.` The
tools are hidden from agents that aren't allowed to launch subagents, such as OpenCode's built-in
`general` and `explore` agents.

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

| Result         | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `stopped`      | It was running and the stop ended its run                             |
| `finished`     | It finished on its own before the stop landed                         |
| `already_idle` | Nothing was running                                                   |
| `stopping`     | Still running when the wait ended; it stays stopped once its run ends |
| `continued`    | Someone gave it new work while the stop ran, so it was left alone     |
| `deleted`      | The session was deleted during the stop                               |

What happens during a stop:

1. The plugin records the stop for the subagent and everything below it, then interrupts them,
   deepest first. It always interrupts without resuming queued work.
2. It waits for them to settle, up to three rounds of 4 seconds, and stops anything new that
   appeared below them in the meantime.
3. Until someone continues the subagent, every new run that starts in it is interrupted right away.
4. The stop lifts when the parent continues the subagent by calling `subagent` with its session ID,
   when a person sends it a message, or after 24 hours. The continuing prompt then starts with
   `<stopped-by-parent at="…">reason</stopped-by-parent>`, so the subagent knows what happened.

A subagent launched in the background also sends the parent OpenCode's own notice, saying it was
cancelled, or completed if it finished first. The tool result tells the model that the notice only
confirms the stop.

### `subagent_send`

Pass a `sessionID` and a `message` of up to 8000 characters. Line breaks and code in the message
are kept.

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

The result says when the subagent will read it:

```text
Message sent to ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export"). It reads your message after its current tool calls finish: shell. Sending never interrupts; to redirect it right away, stop it with subagent_stop and continue it with subagent.
```

| Status        | Meaning                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `sent`        | It is running, or its state is unknown, and reads the message at its next step; the note says which                                     |
| `delivered`   | It already read the message, and may have finished its run since                                                                        |
| `queued`      | It finished its run without reading the message; the message is delivered when the subagent is continued                                |
| `unconfirmed` | It finished its run, and whether it read the message first can't be checked; if it didn't, the message is delivered when it's continued |

`subagent_send` refuses a subagent that is idle or stopped, and sends nothing. Continue those with
`subagent` and their session ID instead. A message from the plugin can't start a run that reports
back to the parent; only `subagent` can.

OpenCode can also steer a running subagent when the parent calls `subagent` again with its session
ID. `subagent_send` differs in three ways: it reaches subagents launched by your subagents, it never
switches the subagent's agent or model, and it tells the parent when the message will be read.

To change course right away, without waiting for the current tool call, stop the subagent with
`subagent_stop` and continue it with `subagent`. Only the tool call in flight is lost.

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

### `subagents.list`

Called from Code Mode:

```js
const { entries } = await tools.subagents.list({ state: "running" });
```

| Input   | Default | Description                                                                 |
| ------- | ------- | --------------------------------------------------------------------------- |
| `depth` | `1`     | `1` lists the subagents you launched; up to `4` adds the ones they launched |
| `state` | `"all"` | `"running"`, `"idle"`, or `"all"`. `"running"` includes unknown state       |

It returns up to 50 entries, running ones first, with `total`, `truncated` (more matches than
shown), and `complete`. `complete` is false when the tree was too large to read in full; the list
then covers 2000 sessions under your most recently updated subagents.

Each entry has a `directory`. The rendered line shows it only when it differs from the caller's
own:

```text
- ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export"): running; openai/gpt-5; no cost reported; 96 in + 4210337 cached / 31408 out tokens; directory /home/me/src/app-csv
```

A subagent starts in its parent's directory. Its directory changes only when its session is moved,
for example with OpenCode's `session_move` tool. A subagent that just runs `cd` inside its shell
commands still shows the parent's directory.

### `subagents.inspect`

```js
await tools.subagents.inspect({ sessionID: "ses_8a0d2c71bffeTz4WqLx9mNc5Hd" });
```

`maxChars` (200 to 12000, default 4000) caps the text it returns. It reads the messages since the
subagent's last compaction, plus the summary written at that compaction. Running tools show their
input, cut only to fit `maxChars`, and how long they have been running:

```text
Session ses_8a0d2c71bffeTz4WqLx9mNc5Hd (general, "Add CSV export")
Directory: /home/me/src/app-csv
State: running
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

The summary gets whatever room the other fields leave. If none is left, the Scope line says so and
suggests a larger `maxChars`.

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

| Option                | Default | Description                                                                                        |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `confirmStop`         | `false` | Check the `subagent_stop` permission before stopping, once per kind of subagent                    |
| `latch`               | `true`  | Keep stopped subagents stopped until someone continues them. With `false`, a stop is one interrupt |
| `latchTtlHours`       | `24`    | How long a stop is kept if nobody continues the subagent                                           |
| `notifyChild`         | `true`  | Start the prompt that continues a stopped subagent with the stop reason                            |
| `settleMs`            | `4000`  | How long each settle round waits for stopped subagents to go idle                                  |
| `promptNotices`       | `true`  | Tell the parent when a subagent is waiting on a permission prompt or a question                    |
| `promptNoticeSeconds` | `60`    | How long a prompt stays open before the parent is told, from `0` to `3600`                         |

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

To keep an agent from seeing the tools at all, deny it `subagent`. The tools follow the same rule as
launching subagents.

## Questions

### How do I cancel a background subagent in OpenCode?

Install this plugin, then ask your agent to stop it. The agent calls `subagent_stop` with the
subagent's session ID and a reason, or with `all: true` to stop every running one. A person can also
press `ctrl+d` in the TUI's Subagents tab or use the stop button in the web app; the plugin gives
the agent the same control, and keeps the subagent from being woken up again afterwards.

### How do I send a running subagent new instructions?

Call `subagent_send` with its session ID and the message. The subagent reads it once its current
tool calls finish. OpenCode 2.2 can also do this natively when the parent calls `subagent` again
with the session ID, but only for direct children, and a mismatched agent name switches the
subagent's agent and model.

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
  the subagent, the plugin stops that run.
- **A woken run sends one model request.** OpenCode starts the run before the plugin hears about it,
  so the first request usually goes out before the interrupt lands, about 10 ms later. It produces
  no reply or tool call, but some providers may still bill it.
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
- **Messages and notices wait for tool calls.** Neither `subagent_send` nor a notice to the parent
  interrupts a tool call in flight. A parent that is itself waiting on a subagent in the foreground
  gets no notice, because it couldn't read one until that subagent returns. If the plugin loaded
  while that call was already running, or OpenCode's event stream broke during it, the parent gets
  the notice anyway.
- **A notice can wake a parent that is itself a subagent.** If that parent is idle, the notice
  starts a run whose result doesn't reach the parent above it. OpenCode's own completion notices
  work the same way.
- **Notices only cover prompts the plugin saw open.** A prompt that was already open when the
  plugin loaded gets no notice. After a break in OpenCode's event stream, open questions are
  forgotten, and an open permission prompt is kept only if this project's copy of the plugin can
  still see it.
- **Copies with different delays can wake a parent twice.** If projects set different
  `promptNoticeSeconds`, a later copy's duplicate can start a short, empty run in an idle parent.
- **Pending-prompt fields only see their own project.** `waitingOnPermission` in `subagents.list`,
  `pendingPermissions` in `subagents.inspect`, and the permission line in `subagent_send`'s result
  read OpenCode's list of open prompts, which covers only the project that copy of the plugin runs
  in. For a subagent moved to another project they can show none, while the notice still arrives.
- **Inspect can't read before the last compaction.** Only the summary written at the compaction is
  available; older messages aren't readable from a plugin. Inspect also can't show a running
  command's output so far.
- **Cost can read 0.** Providers that report no pricing, which is common with subscription sign-ins,
  leave `cost` at 0, shown as `no cost reported`. Token counts are still real.

## Troubleshooting

**The tools don't show up.** The agent isn't allowed to launch subagents, so the tools are hidden
too. Check its `subagent` permission. A blanket allow rule in your config re-enables it for agents
like `general` that deny it by default.

**`subagents.list` returns `complete: false`.** The caller has more than 2000 subagents and their
subagents. The list covers 2000 sessions under the most recently updated subagents, which includes
every running one in practice. Use `subagents.inspect` or `subagent_stop` by session ID for older
ones.

**`subagent_send` says the subagent is idle.** It finished, or was never started. Continue it with
`subagent`, its session ID, and your message.

**No notice arrives for a waiting subagent.** Check that `promptNotices` isn't off, and that the
prompt stayed open for `promptNoticeSeconds`. A parent that is waiting on that subagent in the
foreground gets no notice while that call runs. If someone moves the call to the background while
the prompt is still open, the notice follows about a second later.

## Development

```sh
bun install
bun run build
bun run typecheck
bun run test
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
