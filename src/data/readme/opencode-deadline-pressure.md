# OpenCode Deadline Pressure Plugin

OpenCode plugin that warns agents about time budget consumption, enforces phased lockdowns, and nudges handoff before the deadline expires.

## Features

- Tracks the execution time budget of the agent using a sentinel file (`.opencode-deadline-start`) for cross-process persistence.
- Fires tiered warnings as the agent approaches its timeout limit (info → warning → critical).
- Enforces **investigation lockdown** at 75% budget — diagnostic/exploration bash commands are blocked.
- Enforces **full lockdown** at 90% budget — only write, edit, build, and run commands are permitted.
- **Phase-aware exemptions** — during `verify_*` and `fix_*` phases, read-only tools and test-running commands are exempted from lockdown so the agent can verify deliverables and test fixes.
- Recognizes common test runners (`pytest`, `npm test`, `cargo test`, `go test`, `make test`) as "run" intent, allowing them during fix phases even under full lockdown.
- Configurable time limits and threshold percentages.

## Installation

```bash
npm install opencode-deadline-pressure
```

## Quick Start

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-deadline-pressure"
  ]
}
```

To pass configuration options, use the tuple form:

```json
{
  "plugin": [
    ["opencode-deadline-pressure", { "budgetMs": 1800000 }]
  ]
}
```

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
  - [Sentinel File](#sentinel-file)
  - [Threshold Tiers](#threshold-tiers)
  - [Intent Classification](#intent-classification)
  - [Phase Awareness](#phase-awareness)
- [Configuration](#configuration)
  - [Options](#options)
  - [Examples](#examples)
- [Limitations](#limitations)
- [Programmatic Usage](#programmatic-usage)
- [License](#license)

## How It Works

The plugin hooks into three points of OpenCode's tool lifecycle:

- **`event`** (on `step-finish`): Checks elapsed time against the budget and fires threshold warnings.
- **`tool.execute.before`**: Enforces lockdown restrictions based on the current tier and phase.
- **`tool.execute.after`**: Injects non-blocking warnings into tool output.

### Sentinel File

The plugin writes a sentinel file (`.opencode-deadline-start`) in the working directory on first init. This file contains the Unix timestamp (milliseconds) when the deadline clock started. On subsequent loads, the plugin reads this file to restore the start time, ensuring the clock persists across process restarts (e.g., when the orchestrator launches a new opencode session for verification or fixing).

If the sentinel file is missing or corrupt, the plugin creates a new one with the current time.

### Threshold Tiers

The plugin has three default threshold tiers:

| Tier | % of budget | Severity | What happens |
|---|---|---|---|
| 1 | 50% | info | Non-blocking warning: "You should be writing your solution file soon." |
| 2 | 75% | warning | **Investigation lockdown**: diagnostic/exploration bash commands are blocked. Non-blocking. |
| 3 | 90% | critical | **Full lockdown**: read/grep/glob tools blocked, investigate-intent bash blocked. Blocking. Write/edit always allowed. |

**Investigation lockdown (Tier 2)**: Bash commands classified as "investigate" intent (e.g., `ls`, `cat`, `grep`, `find`) are blocked with an error. The agent must focus on writing, compiling, and testing.

**Full lockdown (Tier 3)**: All read-only tools (`read`, `grep`, `glob`) and investigate-intent bash commands are blocked. Only `write`, `edit`, and bash commands with "build" or "run" intent are permitted. This forces the agent to finalize its solution.

> **Write/edit are never blocked.** Even at critical threshold, the agent can always write or edit files — it just can't explore or diagnose anymore.

### Intent Classification

The plugin classifies bash commands into five intents to determine which are blocked during lockdown:

| Intent | Examples | Blocked in investigation lockdown? | Blocked in full lockdown? |
|---|---|---|---|
| `setup` | `pip install`, `npm install`, `apt-get install` | No | No |
| `build` | `gcc`, `make`, `cmake`, `tsc`, `cargo build` | No | No |
| `run` | `python3 solution.py`, `./a.out`, `pytest`, `npm test` | No | No (during fix phase) |
| `write` | heredoc redirects, `cp`/`mv` to `/app/` | No | No |
| `investigate` | `ls`, `cat`, `grep`, `find`, `which` | Yes | Yes |

**Test runner recognition**: The following commands are classified as `run` intent (not `investigate`):
- `pytest`, `python -m pytest`
- `npm test`, `npm run test`
- `cargo test`
- `go test`
- `make test`

This ensures that running tests is permitted during fix phases even under full lockdown.

### Phase Awareness

The plugin reads the `AGENT_PHASE` environment variable to adjust lockdown behavior during different phases of an agent pipeline (e.g., FrankCode's main → verify → fix cycle).

| Phase prefix | Read/grep/glob | Investigate bash | Run bash (tests) | Write/edit |
|---|---|---|---|---|
| `verify_*` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `fix_*` | ❌ Blocked (full lockdown) | ❌ Blocked (full lockdown) | ✅ Allowed | ✅ Allowed |
| `main` or unset | ❌ Blocked (full lockdown) | ❌ Blocked (full lockdown) | ❌ Blocked (full lockdown) | ✅ Allowed |

**Why**: During verification phases, the agent's primary job is to read deliverables and test output — activities that would normally be blocked by full lockdown. During fix phases, the agent needs to run tests to verify its fixes. The phase awareness feature ensures these essential activities are not blocked by the deadline pressure.

**How to set the phase**: The orchestrator (e.g., FrankCode) sets `AGENT_PHASE` in the environment before launching each opencode session. The value is typically `main`, `verify_1`, `verify_2`, `fix_1`, `fix_2`, etc.

```bash
AGENT_PHASE=verify_1 opencode run "verify the deliverables..."
```

## Configuration

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `budgetMs` | `number` | `2400000` (40 min) | Total time budget in milliseconds |
| `thresholds` | `ThresholdConfig[]` | (see below) | Custom threshold tiers |

**Default thresholds:**

```typescript
[
  { percent: 50, severity: "info",    blocking: false, investigationLockdown: false, fullLockdown: false },
  { percent: 75, severity: "warning", blocking: false, investigationLockdown: true,  fullLockdown: false },
  { percent: 90, severity: "critical",blocking: true,  investigationLockdown: false, fullLockdown: true  },
]
```

Each `ThresholdConfig` has:

| Field | Type | Description |
|---|---|---|
| `percent` | `number` | Percentage of budget at which this tier fires |
| `severity` | `"info" \| "warning" \| "critical"` | Severity level (affects emoji prefix) |
| `message` | `string` | Warning message template with `{percent}`, `{elapsed}`, `{remaining}` placeholders |
| `blocking` | `boolean` | If true, the warning is delivered as a thrown error on the next tool call |
| `investigationLockdown` | `boolean` | If true, activates investigation lockdown at this tier |
| `fullLockdown` | `boolean` | If true, activates full lockdown at this tier |

### Examples

**Custom budget (30 minutes):**

```json
{
  "plugin": [
    ["opencode-deadline-pressure", { "budgetMs": 1800000 }]
  ]
}
```

**Custom thresholds:**

```json
{
  "plugin": [
    ["opencode-deadline-pressure", {
      "budgetMs": 3600000,
      "thresholds": [
        { "percent": 33, "severity": "info", "message": "Third of budget used.", "blocking": false },
        { "percent": 80, "severity": "critical", "message": "Almost out of time!", "blocking": true, "fullLockdown": true }
      ]
    }]
  ]
}
```

## Limitations

- **Sentinel file is per-directory.** The `.opencode-deadline-start` file is created in the working directory. If the working directory changes between sessions, the start time is reset.
- **Phase awareness requires `AGENT_PHASE` env var.** Without it, all lockdowns apply at full strength regardless of phase.
- **Intent classification is regex-based.** Complex commands (e.g., `bash -c "pytest && ls"`) may be misclassified. The classifier checks the first command token.
- **No per-tool exemptions.** You cannot whitelist specific files or commands. The phase-based exemptions are the only way to bypass lockdowns.
- **Thresholds fire once.** Each threshold fires exactly once per session. If the agent's budget is extended (e.g., by restarting with a new sentinel), thresholds will fire again.

## Programmatic Usage

```typescript
import { contextWarning } from "opencode-deadline-pressure";

// Called by OpenCode's plugin loader with (ctx, options)
// Returns a Hooks object
```

## License

[MIT](LICENSE)
