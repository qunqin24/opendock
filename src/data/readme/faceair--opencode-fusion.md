# opencode-fusion

[中文](README.zh.md)

An [OpenCode](https://opencode.ai) plugin. Expensive model makes decisions, cheap model does the work.

Inspired by Cognition's [Devin Fusion](https://cognition.com/blog/devin-fusion) — the sidekick architecture comes from them.

## Installation

Add the npm plugin to your OpenCode config (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugin": [
    [
      "@faceair/opencode-fusion",
      {
        "sidekick": {
          "model": "provider/model-name",
          "variant": "medium"
        }
      }
    ]
  ],
  "default_agent": "fusion"
}
```

Restart OpenCode after saving the config. OpenCode installs npm plugins automatically at startup.

Set the environment variable for background subagents (enables parallel investigation mode):

```sh
export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
```

Add this to your shell config (e.g. `~/.config/fish/config.fish` or `~/.bashrc`) so it persists across sessions.

| Option | Agent | Description |
|--------|-------|-------------|
| `model` | sidekick | Model in `provider/model-id` format |
| `variant` | sidekick | Reasoning effort (`low`, `medium`, `high`, `xhigh`) |
| `options` | sidekick | Provider-specific options (e.g. `serviceTier`) |

If `model` is omitted, the agent inherits the session's current model. If you don't want Fusion as your default agent, omit `default_agent` and select the `fusion` agent manually when needed.

## What it solves

A few common problems when using a single-model agent for engineering work:

- Frontier model time gets spent running tests and reading files — wasting money. Switch everything to a cheap model and decision quality drops. Cognition's data shows the sidekick architecture cuts cost 35% while maintaining frontier performance; delegating test suites to sidekick saves 62%, mechanical removal tasks save 32%.
- "Ask another model" tools lose context cache on every cross-model call, and you pay the full prompt cost again. On a long task, this adds up fast.
- Context compaction wipes working memory. Subagent `task_id`s are recovered after compaction via `get_task_ids`.

## How it works

Two agents, each with its own model and cached context:

```
┌─────────────────────────────────────────────────┐
│  fusion (expensive model)                       │
│  owns: decisions, judgment, final verification  │
│                                                 │
│  delegates via task() ──────────────┐           │
│                                     ▼           │
│                          ┌─────────────────┐    │
│                          │ sidekick        │    │
│                          │ (cheap model)   │    │
│                          │ execute         │    │
│                          │ discover        │    │
│                          │ verify          │    │
│                          └─────────────────┘    │
└─────────────────────────────────────────────────┘
```

**fusion** is the main agent you talk to. It owns judgment and decisions — reads code when a decision requires it, makes architectural calls, and does the final verification of changed code before accepting it. It delegates mechanical execution by default, but never lets delegation block it from looking at implementation details when necessary to make a decision.

**sidekick** is the execution partner. It reads code, gathers facts, writes implementation, runs tests, and diagnoses failures in its own cached context. It excels at local execution but lacks global architectural foresight — fusion owns the judgment, sidekick owns the mechanical work within boundaries fusion sets.

Sidekick keeps its own persistent, cached context. Delegation doesn't trigger cache misses — that's the key difference from "ask another model" tools. fusion calls it via the `task` tool, gets back a `task_id`, and reuses it on follow-ups to continue the same thread. Tasks in the same domain go to the same sidekick to reuse cached context; parallel investigations run in separate sessions.

### How fusion decides

Fusion doesn't follow a rigid workflow. It aligns dispatch to the nature of the task:

- **Gathering facts** — ask sidekick for specific references, definitions, caller locations, invariants. Not solutions. Audit the fact chain before deciding.
- **Executing changes** — provide interface contracts, dependencies, and a behavior checklist. Don't write implementation internals — that's sidekick's space.
- **Verification** — read the actual changed code, not the diff summary. Find what's missing: unhandled edge cases, behaviors requested but quietly omitted, critical paths with no test.

These are common patterns, not a rigid pipeline. When serial dispatch is too slow, fusion parallelizes — how to split the work is its call.

## Good fit for

- Complex debugging where the obvious fix treats the symptom
- Multi-stage refactors with judgment-heavy decisions
- Open-ended work where the next step can't be planned upfront

If you just want a lightweight chat assistant, this is probably overkill.

## License

[MIT](LICENSE)
