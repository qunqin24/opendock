# opencode-bug-review-gate

An [opencode](https://opencode.ai) plugin that automatically runs a bug review
over every turn that edited files, drives fix rounds for blocking findings, and
resumes turns that were interrupted midstream.

## Why

Two failure modes make coding sessions silently stall or ship unreviewed
changes:

1. **Unreviewed edits** — agents mark turns "done" without anyone checking the
   diff. This gate runs a dedicated review subagent after every turn that
   edited files, parses its verdict, and re-prompts the session to fix every
   BUG-class finding (up to `maxFixRounds` rounds).
2. **Interrupted turns** — a model stream can terminate prematurely (e.g. a
   spurious EOS from the provider or the model itself) and report a clean
   `stop` with zero output. opencode treats that as a normal end-of-turn, so
   the session just goes idle. This gate detects the signature — a finished
   turn with no error, no text, and no tool calls — and automatically sends a
   continue prompt (up to `maxAutoContinues` times), resuming the task with
   the same agent that was interrupted. It also retries a review that dies
   the same way, and resumes a fix turn that dies the same way.

## Install

Add to `opencode.json` (or `~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["opencode-bug-review-gate"]
}
```

With options:

```json
{
  "plugin": [
    ["opencode-bug-review-gate", { "maxAutoContinues": 3 }]
  ]
}
```

Restart opencode after changing config — plugins are loaded once at startup.

## Options

| Option                | Default        | Description                                                              |
| --------------------- | -------------- | ------------------------------------------------------------------------ |
| `reviewAgent`         | `"bug-review"` | Agent that performs the static review.                                  |
| `maxFixRounds`        | `2`            | Fix-and-re-review rounds after an `ISSUES` verdict.                       |
| `maxNoVerdictRetries` | `1`            | Retries when a review ends without a verdict line.                       |
| `maxAutoContinues`    | `2`            | Resume attempts for turns that stop with no model output.                 |
| `askResponse`         | `"once"`       | How gate-driven turns answer permission asks (`"once"` or `"reject"`).    |
| `autoContinue`        | `true`         | Resume turns that stop with no model output.                             |
| `defineAgent`         | `true`         | Register a default `bug-review` subagent when the config has none.       |

## The default review agent

If your config does not define an agent named `bug-review` (or your
`reviewAgent` value), the plugin registers one via its `config` hook: a
subagent that cannot edit files (`edit: deny`, the hard guarantee — read,
glob, grep, and list default to allow), whose bash permission allows only
git diff/log/status/show and asks for everything else, and whose prompt
directs it to find real defects, classify findings (BUG / RISK / VERIFY),
cite `file:line`, and end with a verdict line:

```
PASS — no blocking issues found
ISSUES — n blocking, m advisory
```

Define your own agent with that name to override it entirely.

## Security notes

- The review agent cannot edit or write files, and the review prompt forbids
  executing the code under review.
- While the gate is driving a session (review / fix / resume turns), permission
  asks are answered automatically (`askResponse`, default `"once"` = allow one
  execution) so headless runs cannot hang on a dialog. Normal user turns are
  never auto-answered. Set `askResponse` to `"reject"` to make gate turns fail
  fast instead, or restrict the review agent's permissions further.
- Auto-resume only fires for turns that edited files (the gate only runs for
  those), only when the turn's stream ended with no error and no visible
  output, and is capped by `maxAutoContinues`.

## Verdicts

- `PASS` — toast, session goes idle.
- `ISSUES` — the gate prompts the session to fix every BUG-class finding and
  re-reviews, up to `maxFixRounds` times; remaining issues produce a warning
  toast.
- No verdict after retries — warning toast, no auto-fixing.
- Degenerate stops (main turn, review, or fix turn) — auto-continue, capped.

## Compatibility

Targets opencode ≥ 1.18 (plugin API with the `config` hook and
`client.session.messages`). No runtime dependencies.

## License

MIT
