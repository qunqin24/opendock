# reflexkit

**A fast, local reflex layer ("System 1") for coding agents.** Ships as an OpenCode plugin.

reflexkit watches the deterministic facts a coding harness already produces — exit codes, test counts, error output, edits — and makes the small, frequent decisions the big model should not be spending tokens on: *is the agent stuck? is it making progress? is this command destructive? is the task objectively done? which tool outputs are still relevant?*

It never writes code, never calls an LLM, never talks to the network. Every decision comes with named signals so you can see why it was made.

```text
S0 — Deterministic      exit codes · test counts · fingerprints · git diff
        ↓
S1 — reflexkit          stuck · progress · tool risk · completion · context relevance
        ↓
S2 — Main model         Claude / Codex / Gemini / DeepSeek …
```

> Don't think when you can know. Don't ask an LLM when a classifier is enough. Don't call a classifier when a rule is enough.

## Why

Coding LLMs burn reasoning on decisions that are cheap to compute: re-running the same failing test five times, re-reading a file they already have in context, asking whether `npm test` passed when the exit code already says so. Each of those costs a full model turn with the whole context attached. A reflex layer answers them in microseconds and only nudges the model when it is actually looping.

## Goals

- fewer tokens
- fewer unnecessary turns
- loops caught early
- smaller, more relevant context
- faster task completion
- big models only when they are needed

## Non-goals

- replacing Claude, Codex, Gemini or any other coding model
- writing or fixing code
- hiding a small LLM behind the plugin

## Install

Published on npm as [`reflexkit`](https://www.npmjs.com/package/reflexkit). Add it to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global) and OpenCode installs it on next start:

```json
{
  "plugin": ["reflexkit"]
}
```

Or from the CLI:

```bash
opencode plugin reflexkit
```

From a local checkout:

```json
{
  "plugin": [["/abs/path/to/reflexkit/dist/index.js", { "mode": "observe" }]]
}
```

## Modes

| mode | behaviour |
|---|---|
| `off` | plugin registers nothing |
| `observe` (default) | every reflex runs and is traced, nothing is altered — safe for any session |
| `enforce` | stuck → one-line nudge appended to the tool output; destructive commands → blocked with the rule id |

Switch with config (`reflexkit.json`, plugin options) or the environment:

```bash
REFLEXKIT_MODE=enforce opencode
```

## Configuration

`<project>/reflexkit.json`, `<project>/.opencode/reflexkit.json` or `~/.config/opencode/reflexkit.json` (later files win, plugin options win over files, env wins over everything):

```json
{
  "enabled": true,
  "mode": "observe",
  "reflexes": {
    "stuck":      { "enabled": true, "evaluateEvery": 1, "threshold": 0.85, "cooldown": 3 },
    "progress":   { "enabled": true },
    "toolRisk":   { "enabled": true, "extraBlock": [], "extraAsk": ["terraform apply"] },
    "completion": { "enabled": true, "threshold": 0.9 },
    "context":    { "enabled": false, "keepRecent": 6 }
  },
  "performance": { "maxEvaluationMs": 25, "cache": true },
  "dataDir": ".reflexkit",
  "trace": true,
  "dataset": true
}
```

## What you get

Everything lands in `<project>/.reflexkit/`:

- `trace.jsonl` — one line per decision:
  ```json
  {"reflex":"stuck","mode":"observe","action":"would-nudge","confidence":0.9,
   "value":{"stuck":true,"stuckProbability":0.93,"oscillationProbability":0.2,"progressProbability":0.07},
   "signals":{"sameError":0.97,"errorRepeat":0.8,"sameCommand":0.75,"noTestImprovement":1,"fileOscillation":0.33},
   "latencyMs":0.41,"source":"heuristic"}
  ```
- `metrics.json` — counters: evaluations, latency, stuck/oscillation/progress detections, tool calls, repeated calls, blocked/asked tools, interventions, context bytes.
- `dataset.jsonl` — anonymized `{label, features}` examples (stuck / not-stuck / completion-ready …) for training a small classifier later. Secrets are redacted before writing.

## Reflexes

| reflex | signals | decision |
|---|---|---|
| **stuck** | sameError, errorRepeat, sameCommand, toolRepetition, noTestImprovement, sameFailingTests, fileOscillation, sameFileChurn, failStreak | stuckProbability, oscillationProbability, progressProbability (noisy-OR over three providers) |
| **progress** | testDelta, testsGreen, errorChange, checksPassing, recentSuccessRatio, newFilesTouched | progressScore 0..1 |
| **toolRisk** | ~30 regex rules (`rm -rf /`, `git reset --hard`, `git push --force`, `DROP DATABASE`, migrations, `sudo`, …) + custom patterns | allow / ask / block, with matched rule ids |
| **completion** | testsGreen, typecheckGreen, lintGreen, buildGreen, hasChanges, noOpenErrors | completionConfidence + blockers |
| **context** | recency, taskOverlap, errorRef, fileRef, staleness | keep / compress / drop per tool output (observe only) |

Details, ensemble policy and hook wiring: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Benchmark

```bash
npm run build
bun bench/run.ts --modes off,observe,enforce --repeat 3 --model opencode-go/deepseek-v4.1-flash
```

Runs each fixture task through `opencode run` with the plugin off / observing / enforcing and reports success rate, model turns, tool calls, repeated calls, tokens, duration and S1 overhead. Results go to `bench/results/<runId>/report.md`. See [docs/BENCHMARK.md](docs/BENCHMARK.md) for the latest numbers.

## Development

```bash
npm install
npm run check      # lint + typecheck + test + build
```

Zero runtime dependencies. Tests run on Bun; the plugin runs on whatever OpenCode runs on.

## What it does, in one paragraph

A coding agent spends most of its budget on the same few decisions, over and over: *did the tests pass? is this the same error as last time? am I going in circles? is this command safe? am I done?* reflexkit answers those from facts the harness already has (exit codes, test counts, normalized error fingerprints, edit history) in about 0.1 ms, without a model call. When it is sure the agent is looping, it tells the model to change approach and, if the loop continues, to stop and report the blocker instead of burning more turns. When it is not sure, it stays silent.

## Measured so far

All numbers come from real `opencode run` sessions driven by the benchmark runner (DeepSeek v4.1 flash, 2026-09-18, 41 sessions). Details and raw reports: [docs/BENCHMARK.md](docs/BENCHMARK.md).

**Cost of the layer** (12 plugin-enabled sessions on solvable tasks):

| metric | value |
|---|---|
| reflex evaluations | 248 |
| mean latency per evaluation | 0.11 ms |
| max latency | 1.29 ms |
| overhead vs session duration | < 0.05 % |
| false stuck alarms | 0 |
| effect on turns / tokens / success | none (as intended) |

**Effect on a guaranteed loop** (`locked-source`: the cause of the failure is outside what the agent may read, so every edit produces the same failure; n = 2 per cell):

| mode | turns | tool calls | tokens in+out | duration |
|---|---|---|---|---|
| off | 22, 24 | 31, 37 | 54k, 60k | 176 s, 134 s |
| enforce, "re-evaluate" nudge only | 24, 22 | 33, 23 | 72k, 54k | 227 s, 218 s |
| enforce, escalating to "stop and report" | **10, 11** | **11, 14** | **49k, 49k** | **57 s, 67 s** |

Means, escalating enforce vs off: **turns −54 %, tool calls −63 %, duration −60 %, tokens −14 %.** The stuck reflex fired at tool call 10–11 in all six sessions; the enforce sessions ended with a precise blocker report instead of more identical edit-test cycles.

What this does and does not show:

- It shows the mechanism works end to end in real sessions and costs nothing when idle.
- It does not yet show savings on everyday work: strong models rarely loop three times on small repos they can explore, and n = 2 is too small to quote the percentages as general numbers.
- A nudge that only asks the model to rethink did not help; the intervention has to change what the model does next.
- The path to real numbers is running it in `observe` mode on real projects for a couple of weeks and replaying the traces (`bun bench/replay.ts <opencode.jsonl>`).

## Status and limitations

- OpenCode's plugin API has no wired `permission.ask` hook, so `ask` decisions are traced and warned about but not enforced. Use OpenCode's own `permission` config for hard prompts.
- Context relevance is observe-only by design until the benchmark shows a net win.
- Test-output parsing covers bun, jest, vitest, mocha, pytest, cargo, go, node --test, tsc and eslint; other runners fall back to exit codes.
- Heuristics are hand-tuned. The dataset the plugin records is the path to replacing them with a trained classifier.

## License

MIT
