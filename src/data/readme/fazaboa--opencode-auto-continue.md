# opencode-auto-continue

[English](./README.md) · [Português (BR)](./README.pt-BR.md)

An [OpenCode](https://opencode.ai) plugin that **automatically continues responses cut off by the model's output limit**.

## The problem

Large-context models sometimes stop mid-answer — the response gets truncated by the output token cap (or the model enters a long reasoning loop and hits it), leaving you with half a file, a broken diff, or an unfinished explanation. You then have to type "continue" manually… over and over.

If you've experienced this, you know exactly how annoying it is:

![Example: response truncated mid-file](docs/assets/before.png)

## The solution

This plugin watches your session from the outside. When the assistant's last message:

- ends with `finish: "length"` / a `MessageOutputLengthError`, **or**
- crosses a soft limit of output tokens (~88% of the cap),

it automatically injects a continuation prompt telling the model to pick up **exactly where it left off** — no repetition.

![Example: plugin detects truncation and auto-continues](docs/assets/after.png)

### Guardrails

| Guardrail | Default |
|---|---|
| Max auto-continues per user turn (anti infinite-loop) | 3 |
| Counter resets when you send a new message | ✓ |
| Soft limit well below the cap (catches "finished but glued to the cap") | 115k tokens |
| Silent failure (never breaks your session) | ✓ |

## Install

```bash
npm install @fazaboa/opencode-auto-continue
```

Then register it in your `opencode.json`:

```jsonc
{
  "plugin": ["@fazaboa/opencode-auto-continue"]
}
```

Or drop the source file directly into `.opencode/plugins/auto-continue.ts` in your project — it's a single self-contained file.

## Configuration (optional)

```jsonc
{
  "plugin": [
    [
      "opencode-auto-continue",
      {
        "outputSoftLimit": 115000,
        "maxAutoContinues": 3,
        "continueText": "[auto-continue] Continue exactly where you left off."
      }
    ]
  ]
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `outputSoftLimit` | `number` | `115_000` | Output-token threshold that triggers a continue |
| `maxAutoContinues` | `number` | `3` | Max continuations per user turn |
| `continueText` | `string` | *(see source)* | The prompt injected on continue |

Programmatic usage:

```ts
import { autoContinue } from "@fazaboa/opencode-auto-continue"

export const AutoContinuePlugin = autoContinue({ maxAutoContinues: 5 })
```

## How it works

1. Listens for OpenCode events.
2. On `session.idle`, fetches the session's messages via the SDK client.
3. Checks the last assistant message for truncation (`finish === "length"` / `MessageOutputLengthError`) or output tokens ≥ soft limit.
4. If triggered, sends a `promptAsync` with the continuation text and increments the per-session counter.
5. A new user message resets the counter.

## License

[MIT](./LICENSE)
