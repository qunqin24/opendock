# @npv12/opencode-jev-router

An [OpenCode](https://opencode.ai) V2 plugin that asks Jev how much reasoning effort the agent needs, and which model a subagent should run on, so cheap work stays cheap and hard work gets the budget it needs.

## What it does

- **Main session**: never changes the model. On each user prompt, and every 30 agent steps, Jev picks the reasoning effort (variant) for the model already in play, and the session switches to the same provider and model with the new variant. Upgrades always apply; downgrades apply unless `recalc.allowDowngrade` is `false`.
- **Workers**: a session with a parent routes itself. Jev picks both the model and the effort from the `models` whitelist. Workers whose agent has a pinned model are skipped entirely.
- **Failures count**: failed steps and tool calls since the last check are fed back to Jev, which pushes effort up when the current one is not working.

## Install

Add the plugin to your `opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "@npv12/opencode-jev-router",
      "options": {
        "models": {
          "opencode-go/deepseek-v4.1-flash": "Cheapest tier. Routine edits, lookups, one-liners, narrow questions.",
          "opencode-go/glm-5.3-flash": "Cheap, with more thinking than deepseek. Small multi-file work, straightforward debugging, ordinary explanations.",
          "openai/gpt-6-sol": "Expensive tier, only for heavy work: code review, larger refactors, cross-file reasoning.",
          "anthropic/claude-opus-5-5": "Most expensive tier, last resort: architecture, subtle bugs, work the cheaper tiers are unlikely to handle."
        },
        "default": "opencode-go/deepseek-v4.1-flash",
        "decider": "openrouter/typesafe/jev-1.14"
      }
    }
  ]
}
```

and restart OpenCode.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `models` | `{}` | `provider/model` to a description Jev reads when choosing a worker model. Without it, workers keep their inherited model. |
| `default` | none | Model a worker falls back to when Jev does not answer. |
| `decider` | none | `opencode/jev-<version>` (OpenCode Console) or `openrouter/typesafe/jev-<version>` (OpenRouter). |
| `recalc.steps` | `30` | Agent steps between effort checks within one turn. |
| `recalc.allowDowngrade` | `true` | Whether a check may lower the effort. |

### Decider

The plugin uses the credential you already connected for the decider's provider in OpenCode.

A pinned `decider` is a data policy, not a preference: it is used alone, with no fallback, so a failure never falls through to an endpoint that may train on prompt data. Without a pinned decider, the OpenCode Console is tried first and OpenRouter second, using whichever credentials are available. If no credential is found, routing is disabled and a warning is logged.

## How effort is decided

Both triggers send the same question and the same state shape. The question is:

> How much reasoning effort should the agent use now? Repeated failures mean the current effort is not working, so choose a higher one.

The second sentence is load-bearing. Without it Jev keeps `low` on a trivial follow-up even after five failed steps. With it, the same state returns `high`.

State is ordered most decision-relevant first, so truncation at 8,000 characters drops only old context:

```
Request: <current prompt>                      (human-message trigger only)
Agent steps since the last check: N
Failed steps and tool calls since the last check: F
Recent failures:                               (when any)
- ...
Model: <name>
Current effort: <variant|unset>
Earlier requests:                              (every prior human message, oldest dropped first)
- ...
```

Step and failure counters reset on each check, so "since the last check" is literal.

### Effort descriptions are relative to the ladder

Models expose different rungs: some offer three (`low/high/max`), others six (`none/low/medium/high/xhigh/max`). "Most requests" has to land on the second rung either way, so the descriptions are computed from the rungs actually offered rather than being fixed per name:

| Position | Description |
| --- | --- |
| first | Trivial only: yes/no answers, a single line or function to read, typo fixes, a single tiny edit. |
| second | Ordinary work, and most requests belong here: writing or changing code, adding tests, small refactors, explanations, ordinary debugging. |
| middle | Harder work: multi-file changes, non-obvious debugging, design decisions. |
| second to last | Very hard: complex architecture, subtle concurrency, extended debugging after repeated failure. |
| last | Genuinely hard: architecture and design decisions, subtle concurrency, multi-file refactors, deep debugging after repeated failure, cross-cutting migrations. |

Two-rung ladders map to trivial and ordinary. One-rung ladders have nothing to decide.

Fixed per-name hints scored 5/13 against a target distribution because `low` read as a reasonable choice for ordinary work. Relative banding scores 12/13 on the three-rung ladder and spreads sensibly on the six-rung one.

Measured gradient with the current wording:

| Failures since last check | Effort |
| --- | --- |
| 0 | low (0.88) |
| 1 | medium (0.56) |
| 2 | high (0.49) |
| 4 | high (0.85) |
| 6 | high (0.89) |

Answers on genuinely hard requests sit at 0.3 to 0.5 confidence, so the `high`/`max` boundary is noisy.

## Loading from source

A config `plugins` entry pointing at a local path must be a **directory containing `index.ts`**:

```jsonc
{
  "plugins": [{ "package": "/absolute/path/to/opencode-jev-router/src", "options": {} }]
}
```

A `.ts` file is rejected, and a package root with a `main` is silently skipped. Relative paths resolve from the config file's directory.

## Development

```sh
bun install
bun run check
bun run build
```

## Releasing

Publish a GitHub release tagged `vX.Y.Z`. The workflow sets the version from the tag, typechecks, tests, builds, publishes to npm with provenance, and commits the version bump back to `main`.
