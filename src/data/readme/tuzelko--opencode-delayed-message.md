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

`/delayed-message` schedules a message for a future time and delivers it as a normal user
message. The trick: the text never enters the model context at scheduling time. The model
sees it only when it arrives.

Built for "remind me at 3:00" without trusting the model to remember — and without leaking
the text into the conversation early.

## ✨ Features

- 🕰️ **Say it your way** — `HH:MM`, an absolute date, or a relative duration.
- 🔒 **Private until delivery** — the text lives in plugin storage, not in the prompt.
- 💾 **Durable** — jobs survive a service restart; timers re-arm from storage.
- 🪟 **Desktop pill** — pending count and time above the composer, with a preview and a
  cancel button.
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
/delayed-message 03:00 call mom
/delayed-message 2026-11-05 03:00 check the deploy
/delayed-message +30m stretch
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
⏰ Scheduled · 10:18
```

Click it for the list: time, relative countdown, a preview of the text, and `×` to cancel.
The pill disappears when the message is delivered or cancelled. The terminal UI has no pill —
there the transcript note is the only trace.

The pill follows the app language: English, Russian, German, French, and Chinese are
included. Transcript notes are English, because they are written for the model.

## 💾 Durability

Jobs are kept in the plugin's storage, not only in memory. After `opencode reload` or a
service restart, timers are re-armed when the plugin loads for that directory. If the
service is down at the scheduled moment, the message is delivered on the next start.

## 🧠 How it works

- `ctx.command.transform` registers `/delayed-message`; the executor gets the raw text
  outside the prompt.
- The job goes to `ctx.storage` (`pending/<uuid>`) and a `setTimeout` chain, split at the
  24.8-day timer cap.
- On fire: `ctx.session.prompt({ sessionID, text })` — a real user prompt, so the session
  wakes.
- The GUI talks to the server through an RPC: `pending`, `cancel`, and the events
  `scheduled`, `fired`, `cancelled`.

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
