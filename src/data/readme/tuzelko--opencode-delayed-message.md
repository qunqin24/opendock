<div align="center">

# ⏰ opencode-delayed-message

**Schedule a message that wakes the session later — without putting it in the prompt now.**

[![npm](https://img.shields.io/npm/v/@tuzelko/opencode-delayed-message?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@tuzelko/opencode-delayed-message)
[![downloads](https://img.shields.io/npm/dm/@tuzelko/opencode-delayed-message?style=flat-square)](https://www.npmjs.com/package/@tuzelko/opencode-delayed-message)
[![license](https://img.shields.io/github/license/TuzelKO/opencode-delayed-message?style=flat-square)](./LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-5B8DEF?style=flat-square)](https://opencode.ai)
[![desktop UI](https://img.shields.io/badge/UI-desktop-8B5CF6?style=flat-square)](https://opencode.ai)

</div>

---

`/delayed` schedules a message for a future time and delivers it as a normal user
message. The trick: the text never enters the model context at scheduling time. The model
sees it only when it arrives.

Built for "remind me at 3:00" without trusting the model to remember — and without leaking
the text into the conversation early.

## ✨ Features

- 🕰️ **Say it your way** — `HH:MM`, an absolute date, or a relative duration.
- 🔒 **Private until delivery** — the text lives in plugin storage, not in the prompt.
- 💾 **Durable** — jobs survive a service restart; timers re-arm from storage.
- 🪟 **Pills above the composer** — in the desktop app and the terminal UI; click for the
  times, previews, edit, reschedule, send now and cancel.
- 🤖 **Agent check-backs** — the model can schedule a message for itself; the pill marks it
  with `✦`, and it arrives as a synthetic note, not as a message from you.
- ⏱️ **On time in the desktop app** — the app's main process keeps the clock, so an idle
  window or an evicted location does not delay delivery.
- 🤫 **Zero model turns on schedule** — a successful schedule adds nothing to the
  transcript: no wake, no note in the context.
- 🌍 **Localized UI** — English, Russian, German, French, Chinese.

## 📦 Install

```sh
opencode plugin add @tuzelko/opencode-delayed-message
```

Or straight from Git:

```sh
opencode plugin add github:TuzelKO/opencode-delayed-message
```

Requires OpenCode V2. The desktop app and the terminal UI each have a pill; the command
itself works anywhere.

## 🚀 Usage

```text
/delayed 03:00 call mom
/delayed 2026-11-05 03:00 check the deploy
/delayed 30m stretch
```

| Time | Meaning |
| --- | --- |
| `HH:MM` / `H:MM` | the next occurrence; if it already passed today, tomorrow |
| `YYYY-MM-DD HH:MM` | absolute local time; a past time is refused |
| `YYYY-MM-DDTHH:MM` | same, ISO form without the space |
| `30s`, `30m`, `2h`, `1d` | relative to now; a leading `+` is optional |

The first token is the time; everything after it is the message, taken verbatim.

## 🔒 Privacy

The command is a native plugin command: its executor receives the raw arguments and stores
the message in OpenCode's plugin storage. It is not submitted as a prompt, so the model
cannot read it at scheduling time.

At the scheduled moment the plugin calls `session.prompt` with the stored text, and it
arrives as a normal user message.

The `delayed` tool is separate: it lists only the messages the agent scheduled itself. A
user-scheduled message is never returned to the model by the tool.

The honest caveat: the text is stored on disk in OpenCode's database. The model does not get
it through the prompt, but an agent with shell access to the machine could read the storage.
Treat this as a prompt-level guarantee, not encryption.

## 🪟 The pill

Above the composer, while a message is pending:

```text
⏰ 2 delayed
```

The label carries the pending count, like the subagent pill; the list behind it
carries the times. Every row starts with a marker: `•` for your messages and `✦` for
messages the agent scheduled. Click it for one line per message with the scheduled time, a
preview, and the countdown, like the app's own subagent list. In the desktop app,
`»` sends the message now, `✎` edits the text, `↻` changes the time, and `×` cancels it
when you hover a row. Editing and rescheduling go through the plugin's `update` RPC, so
the job keeps its id, its timer is re-armed, and its origin stays the same — an
agent-scheduled message does not silently become yours.

In the terminal UI the same pill opens a list: `Enter` edits the message in place,
`ctrl+t` changes the time, `ctrl+e` sends it now, `ctrl+x` cancels. Editing and
rescheduling go through the plugin's `update` RPC, so the job keeps its id and its timer
is re-armed without a new command. There is no command to remember; the pill is the
entry point.

The pill disappears when the message is delivered or cancelled. A successful schedule
leaves no trace in the transcript — the session sees the text only when it is delivered.
A malformed command is different: the error returns to the client that ran it, which
shows it next to the composer and restores the typed text; it never becomes a session
message.

The desktop pill follows the app language: English, Russian, German, French, and Chinese
are included. The terminal commands are English. Command errors are English. Notices
written by earlier versions are dropped from model requests, so an old error in a
session's history cannot wake the session again.

## 🤖 Agent scheduling

The plugin also registers a `delayed` tool, so the agent can schedule a message for
itself without asking you to retype the time:

- `schedule` — takes `time` and `text`; returns the job id and the absolute time.
- `list` — shows only the messages the agent scheduled in this session.
- `cancel` — removes one of the agent's own messages by id.

The tool's description tells the model to write a self-contained message: by the time it
arrives, the conversation may have been compacted, so "check that" with no context is not
useful.

Agent-scheduled messages carry `✦` before the preview in the pill. When one becomes due,
it arrives as a synthetic note with a visible `Scheduled by agent — …` description, not as
a message from you; the session wakes and sees the note, and you can see why it woke. You
can still edit, reschedule, send now, or cancel an agent-scheduled message from the pill.

The tool sees only agent-scheduled messages. A user-scheduled `/delayed` message never
appears in `list`, and its id cannot be cancelled through the tool.

## 💾 Durability

Jobs are kept in the plugin's storage, not only in memory. After `opencode reload` or a
service restart, timers are re-armed when the plugin loads for that directory. If the
service is down at the scheduled moment, the message is delivered on the next start.

OpenCode unloads a directory's services after 60 minutes without activity (the
`experimental.location_idle_timeout` setting), and plugin timers die with them. In the
desktop app that no longer delays a message: the app's main process keeps its own timer,
persists it across app restarts, and asks the server to deliver at the scheduled moment,
which wakes the directory if it was unloaded. Without the desktop app, delivery still
waits for the next time that directory loads.

## 🧠 How it works

- `ctx.command.transform` registers `/delayed`; the executor gets the raw text
  outside the prompt.
- The job goes to `ctx.storage` (`pending/<uuid>`) and a `setTimeout` chain, split at the
  24.8-day timer cap. Each job records `origin: "user" | "agent"`; jobs stored by older
  versions without the field count as user jobs.
- On fire, a user job calls `ctx.session.prompt({ sessionID, text })` — a real user prompt,
  so the session wakes. An agent job calls `ctx.session.synthetic` with the text, a
  `Scheduled by agent — …` description, and metadata; it wakes the session without looking
  like a message from the user.
- The `delayed` tool scans the same storage but returns only agent jobs of the calling
  session; `list` and `cancel` enforce that filter.
- Hooks on `context`, `compaction`, `generate`, and `title` drop notices written by
  earlier versions from every model request.
- The desktop and TUI parts talk to the server through an RPC: `pending`, `cancel`,
  `update`, `deliver`, and the events `scheduled`, `fired`, `cancelled`.
- The TUI pill renders in `session.composer.top`, follows the same events, and opens a
  `dialog.select`; `update` changes the text or time in place and re-arms the timer.
- The GUI main process mirrors `scheduled` jobs into its own storage and arms Node timers.
  When one is due it calls `deliver` with the job's directory, which boots the location
  and delivers the message even though the server-side timer is gone.

## 🛠 Development

```sh
npm install
npm run build   # emits gui-experimental.cjs
```

Point OpenCode at the checkout while developing:

```jsonc
{
  "plugins": ["/path/to/opencode-delayed-message"]
}
```

## 📄 License

MIT © Eugene Frost
