<div align="center">

# 🧠 opencode-proprioception

**The agent's sense of its own context window — fill reports inside tool results.**

[![npm](https://img.shields.io/npm/v/@tuzelko/opencode-proprioception?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@tuzelko/opencode-proprioception)
[![downloads](https://img.shields.io/npm/dm/@tuzelko/opencode-proprioception?style=flat-square)](https://www.npmjs.com/package/@tuzelko/opencode-proprioception)
[![license](https://img.shields.io/github/license/TuzelKO/opencode-proprioception?style=flat-square)](./LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-5B8DEF?style=flat-square)](https://opencode.ai)

</div>

---

Context pressure is invisible until compaction arrives like a brick. **Proprioception**
measures how full the window is on every request and leaves a small report inside completed
tool results whenever the fill crosses a new step.

Proprioception is the sense of where your own body is without looking. This plugin gives the
agent the same sense about its own memory.

## 👀 What it looks like

```text
[proprioception] context fill: 42% of the window (step 5pp, last crossing).
```

The line rides a tool result that was about to be written anyway, so it survives in history
and costs no extra cache.

## 📦 Install

```sh
opencode plugin add @tuzelko/opencode-proprioception
```

Or straight from Git:

```sh
opencode plugin add github:TuzelKO/opencode-proprioception
```

Requires OpenCode V2.

## ⚙️ Configure

`opencode plugin add` writes a plain string entry. To change the reporting granularity,
replace it with the object form:

```jsonc
{
  "plugins": [
    {
      "package": "@tuzelko/opencode-proprioception",
      "options": { "step": 0.1 }
    }
  ]
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `step` | `number` | `0.05` | Reporting granularity as a fraction of the window. `0.05` = one report every 5 percentage points. Must be greater than `0` and at most `1`. |

## 🧠 How it works

- `session.hook("context")` observes every assembling request.
- The fill is the last completed message's token usage (input, output, reasoning, cache)
  divided by the model's declared context limit.
- The report is appended to the next completed tool result when the bucket
  (`floor(percent / step / 100)`) changes.
- Per-session state; failures are swallowed, the request always goes through.

## 📝 Notes

- Silent when the selected model declares no context limit.
- The percentage is approximate: it is derived from the last message's token usage and the
  declared window, not from a fresh tokenizer run.

## 📄 License

MIT © Eugene Frost
