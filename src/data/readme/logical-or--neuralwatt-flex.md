# neuralwatt-flex

An [opencode](https://opencode.ai) plugin that silently routes your **NeuralWatt** traffic onto cheaper, lower-priority **flex** capacity whenever it's available, and gives you per-session reporting on usage, cost, energy and carbon.

It is a small TypeScript package with no build step and no network calls of its own. opencode loads it directly. Requires OpenCode V2 (the V1 plugin API build is no longer supported; see `CHANGELOG.md`).

---

## What it does

When opencode sends a request to the NeuralWatt provider (`api.neuralwatt.com/chat/completions`), this plugin:

1. **Injects `service_tier: "flex"`** into the request body. Eligible turns then run on flex capacity at a discount instead of the standard tier — invisibly, with no change to your prompts or workflow.
2. **Tagging + teardown for telemetry.** It attaches an `x-flex-session-id` header so NeuralWatt's streaming telemetry can be correlated back to the opencode session that caused it, then parses the `:energy` and `:cost` SSE comment lines NeuralWatt emits alongside the streamed response.
3. **Aggregates everything** into per-session and per-model stats — flex turns, API calls, token breakdown, estimated vs actual cost, energy, carbon, grid id, and your remaining allowance — and exposes three tools you can call from chat (or from anywhere an opencode tool runs) to print a report or manage per-model toggles.

If a model errors on the flex tier, the plugin **auto-disables** flex for that model and the turn proceeds on standard capacity. Nothing breaks; you just stop getting the discount for that model until the process restarts.

## Requirements

- A working [opencode](https://opencode.ai) install.
- A NeuralWatt provider configured in opencode with your own API key. **The plugin never reads, stores, or transmits your API key** — it only intercepts requests opencode is already making and adds the `service_tier` field + a correlation header. Your key stays in opencode's own provider config.

## Install

This repo is npm-ready. Pick whichever form you prefer.

### Option A — clone + local path reference (recommended)

```bash
git clone https://github.com/logicalor/neuralwatt-flex.git ~/.config/opencode/plugins/neuralwatt-flex
```

Then add the plugin to your opencode config (`~/.config/opencode/opencode.jsonc`, or `.opencode/opencode.jsonc` in a project). OpenCode V2 resolves local plugin **directories** (through their `server.ts` entry), so point the `plugins` array at the checkout:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "./plugins/neuralwatt-flex"
  ],
  "permission": {
    "tool": {
      "flex-session": "allow",
      "flex-stats": "allow"
    }
  }
}
```

Paths in the `plugins` array are resolved relative to the config file, so this mirrors where you cloned it. The `permission` block is optional — without it opencode will ask before each tool runs.

### Option B — install from npm

```bash
npm install @logical-or/neuralwatt-flex
```

Then reference the package by name (it ships the `.ts` entry, no compile needed):

```jsonc
{
  "plugins": ["@logical-or/neuralwatt-flex"]
}
```

## Configure

The only thing the plugin needs to function is a working NeuralWatt provider in opencode. Configure it like any other OpenAI-compatible provider (host `api.neuralwatt.com`, your API key in opencode's secrets, the models you want). Once the provider is reachable and you've installed the plugin as above, the next NeuralWatt turn will already be flex-injected and counted.

## Tools

The plugin exposes three tools. None makes network requests.

| Tool | Scope | Output |
|------|-------|--------|
| `flex-session` | The current session **and** all subagent child sessions | Per-model table for the main session, a per-model table for each subagent, combined totals, disabled models, and the last known allowance remaining. |
| `flex-stats` | Process lifetime (every session in this opencode process) | Rollup aggregated by **agent × model** with session counts and an overall flex rate (`flex turns / (flex turns + skipped turns)`). |
| `flex-toggle` | Global (this opencode config) | List per-model flex state, or `disable` / `enable` / `reset` per model or glob pattern. |

### Toggling flex per model

Flex is **on by default** for every model. Turn it off per model (or pattern) with the `flex-toggle` tool or the `/flex` slash command:

```text
/flex                        # list every model's state
/flex off kimi-k3            # disable one model (persistent)
/flex off deepseek-*         # disable by glob pattern
/flex on kimi-k3             # re-enable (also clears auto-disables)
/flex reset                  # everything back on
```

Preferences persist in `~/.config/opencode/.neuralwatt-flex.json` and are shared by every opencode server reading this config; the file is re-read when it changes on disk, and can be edited by hand. Patterns without a `/` match bare model IDs (`deepseek-*`); patterns with a `/` match the full `neuralwatt/<model>` reference. Models disabled here run on the standard tier and show `[std]` + `*` in the stats reports.

Both prints distinguish two cost figures:

- **Est.Cost** — what opencode estimates the turn cost using its own `models.dev` pricing. This does **not** include the flex discount, so it's an upper bound / "list price" view.
- **Act.Cost** — what NeuralWatt actually billed for the turn (parsed from its `:cost` SSE telemetry). This **does** include the flex discount, plus any prompt-cache savings. The gap between the two is your real savings.

Energy (kWh), carbon (gCO2eq) and grid id come from NeuralWatt's `:energy` SSE telemetry and are shown when available.

## Sample output

A trimmed `flex-session` report (real reports vary; captured on OpenCode 2.0.x):

```
==============================================================================
NeuralWatt Flex Stats — Session <session-id>
==============================================================================

Main Session (agent: build):

  Model                  API    Tokens   Est.Cost    Act.Cost        Energy Grid
  ─────────────────────────────────────────────────────────────────────────────────────
  glm-5.3                   9        1  2,368,625   $0.38078    $0.00322  6.61e-4 kWh US-MIDA-PJM
  kimi-k3 [std] *           1        1      19,162   $0.05812           $0              —
  ─────────────────────────────────────────────────────────────────────────────────────
  Total                    10        2  2,387,787   $0.43890    $0.00322  6.61e-4 kWh

Combined: 10 turns (2,387,787 tokens)
  Flex:         9 turns  2,368,625 tokens   Est $0.38078   Billed $0.00322
  Non-flex:     1 turns    19,162 tokens   Est $0.05812   Billed $0
  Estimated cost (opencode): $0.43890
  Actual billed cost (NeuralWatt): $0.00322
  Energy: 6.61e-4 kWh  Carbon: 2.91e-1g  Grid: US-MIDA-PJM
  Allowance remaining: $20.08

User-disabled (persistent): deepseek-v4.1-flash
Auto-disabled (this process): (none)
  (* = std tier, flex disabled for that model)

==============================================================================
Note: "Flex" = runs on flex capacity (discounted). "[std]" = non-flex fallback runs.
"Est.Cost" = opencode cost estimate (list price). "Billed" = NeuralWatt actual.
==============================================================================
```

## Notes & caveats

- **Flex is best-effort.** Flex capacity is lower-priority and can be unavailable or rejected for a given model. When a model errors on the flex tier, the plugin auto-disables flex for it and subsequent turns proceed on standard capacity. Re-enable it with `/flex on <model>` (or `flex-toggle enable`); without that, the auto-disable clears when the opencode process restarts.
- **Telemetry depends on the stream.** Energy/carbon/actual-cost rows come from SSE comment lines NeuralWatt emits during streaming. Non-streaming responses or provider quirkiness can mean those fields stay at zero for a turn, and the capture is matched to the *next* completed turn for that session, so billed-cost figures can lag one turn behind; estimated cost and token counts still work because they come from opencode's own message events.
- **In-memory only.** Stats live in the opencode process. They are not persisted to disk and are not sent anywhere. Restart opencode and the counters reset. (Per-model *toggles* are the exception — those persist in the state file.)
- **Provider-scoped.** The plugin only acts on the NeuralWatt provider. Other providers in your opencode config are untouched.
- **Server build note.** Child-session discovery (the `flex-session` subagent section) tracks `session.created` events because some OpenCode 2.0.x server builds don't expose a session-listing method on the plugin context. Subagent rows can therefore miss sessions that were created before the plugin loaded.

## Privacy

- Does **not** read your API key, secrets, or env.
- Does **not** make any outbound network requests; it only observes and annotates the provider HTTP exchange through opencode's native plugin hooks.
- Does **not** persist or transmit any usage data. Reporting happens locally, in-process, only when you call a tool. The only file it writes is your own toggle state (`~/.config/opencode/.neuralwatt-flex.json`).

## Development

No build. Typecheck against the plugin SDK:

```bash
npm install
npm run typecheck
```

The implementation is one file, [`src/neuralwatt-flex.ts`](src/neuralwatt-flex.ts), exposed through the root-level [`server.ts`](server.ts) package entry that OpenCode V2 resolves for local plugin directories.

## Use cases

- [`docs/use-cases/tic-tac-toe/`](docs/use-cases/tic-tac-toe/) — a single-file tic-tac-toe app built across an orchestrator and a `bmad-dev` subagent, plus verbatim reports captured on the OpenCode V1 plugin build (the report footer has gained the user/auto-disable split since).

## License

[MIT](LICENSE) © logicalor
