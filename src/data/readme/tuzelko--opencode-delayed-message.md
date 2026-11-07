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
- 🪟 **Desktop pill** — the pending count above the composer; click it for the times,
  previews, edit and cancel.
- ⏱️ **On time in the desktop app** — the app's main process keeps the clock, so an idle
  window or an evicted location does not delay delivery.
- 🤫 **Zero model turns on schedule** — a successful schedule does not wake the model.
- 🌍 **Localized UI** — English, Russian, German, French, Chinese.

## 📦 Install

```sh
opencode plugin add @tuzelko/opencode-delayed-message
```

Or straight from Git:

```sh
opencode plugin add github:TuzelKO/opencode-delayed-message
```

Requires OpenCode V2. The pill is part of the desktop app; the command itself works anywhere.

## 🚀 Usage

```text
/delayed 03:00 call mom
/delayed 2026-11-05 03:00 check the deploy
/delayed +30m stretch
```

| Time | Meaning |
| --- | --- |
| `HH:MM` / `H:MM` | the next occurrence; if it already passed today, tomorrow |
| `YYYY-MM-DD HH:MM` | absolute local time; a past time is refused |
| `YYYY-MM-DDTHH:MM` | same, ISO form without the space |
| `+30s`, `+30m`, `+2h`, `+1d` | relative to now |

The first token is the time; everything after it is the message, taken verbatim.

## 🔒 Privacy

The command is a native plugin command: its executor receives the raw arguments and stores
the message in OpenCode's plugin storage. It is not submitted as a prompt, so the model
cannot read it at scheduling time.

At the scheduled moment the plugin calls `session.prompt` with the stored text, and it
arrives as a normal user message.

The honest caveat: the text is stored on disk in OpenCode's database. The model does not get
it through the prompt, but an agent with shell access to the machine could read the storage.
Treat this as a prompt-level guarantee, not encryption.

## 🪟 The desktop pill

Above the composer, while a message is pending:

```text
⏰ 2 delayed
```

The label carries the pending count, like the subagent pill; the list behind it
carries the times. Click it for one line per message with the scheduled time, a
preview, and the countdown, like the app's own subagent list. `✎` to edit and `×` to cancel appear
when you hover a row. Edit cancels the pending job and puts the whole command back
into the composer — `/delayed`, the scheduled time, and the full text —
with the cursor in the prompt. Adjust anything and submit to reschedule. The pill
disappears when the message is delivered or cancelled.

The terminal UI has no pill — there the transcript note is the only trace.

The pill follows the app language: English, Russian, German, French, and Chinese are
included. Transcript notes are English, because they are written for the model.

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
  24.8-day timer cap.
- On fire: `ctx.session.prompt({ sessionID, text })` — a real user prompt, so the session
  wakes.
- The GUI talks to the server through an RPC: `pending`, `cancel`, `edit`, `deliver`, and
  the events `scheduled`, `fired`, `cancelled`.
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
