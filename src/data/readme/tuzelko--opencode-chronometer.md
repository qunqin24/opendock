<div align="center">

# 🕰️ opencode-chronometer

**The agent's sense of time — a wall-clock mark inside every tool result.**

[![npm](https://img.shields.io/npm/v/@tuzelko/opencode-chronometer?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@tuzelko/opencode-chronometer)
[![downloads](https://img.shields.io/npm/dm/@tuzelko/opencode-chronometer?style=flat-square)](https://www.npmjs.com/package/@tuzelko/opencode-chronometer)
[![license](https://img.shields.io/github/license/TuzelKO/opencode-chronometer?style=flat-square)](./LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-5B8DEF?style=flat-square)](https://opencode.ai)

</div>

---

An LLM lives in a timeless bubble. The system prompt tells it today's date, but not the
current time — and nothing tells it how long a step took. **Chronometer** fixes that by
appending the local wall clock to completed tool results, at most once per interval per
session.

It never interrupts the model. It just leaves a small, durable timestamp in the transcript —
a pulse the agent can read.

## 👀 What it looks like

```text
[chronometer] 2026-11-04 10:40:32 (Europe/Moscow)
```

One line, appended to a tool result that was about to be written anyway.

## 📦 Install

```sh
opencode plugin add @tuzelko/opencode-chronometer
```

Or straight from Git:

```sh
opencode plugin add github:TuzelKO/opencode-chronometer
```

Requires OpenCode V2.

## ⚙️ Configure

`opencode plugin add` writes a plain string entry. To tune the cadence, replace it with the
object form:

```jsonc
{
  "plugins": [
    {
      "package": "@tuzelko/opencode-chronometer",
      "options": { "intervalMs": 30000 }
    }
  ]
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `intervalMs` | `number` | `60000` | Minimum gap between marks in one session. Values below `1000` are ignored. |

## 🧠 How it works

- Hooks `execute.after` for every completed tool result.
- Keeps per-session state, so parallel sessions and subagents each get their own cadence.
- Appends the mark to the result's `content`, the field the server persists — so it stays
  in the transcript instead of poisoning a cache segment with a transient line.
- Any failure is swallowed: the tool result always survives.

## 📝 Notes

- The timezone is the one of the machine running the OpenCode server.
- The mark is plain text; nothing is sent anywhere.

## 📄 License

MIT © Eugene Frost
