# opencode-backstop

A single OpenCode V2 server plugin that bundles:

- **`backstop_check`** — a System-1 escalation gate backed by a decision model you configure, called
  over the System One HTTP protocol (for example `typesafe/jev` on CommandCode or `jev-1.13-free` on OpenCode Zen). It asks a fast,
  cheap decision model how much frontier-model involvement a task actually needs.
- **`backstop` skill** — a voluntary loop that tells the agent when to call `backstop_check`, and
  how to escalate to a frontier read-only `oracle` or a frontier `general` agent when the decision
  says so.

The point is to keep routine work fast while making expensive frontier involvement a deliberate,
evidence-based decision instead of a default.

## Install

Add the plugin to the `plugins` array in `opencode.jsonc`. The `decision` block (the decision model
`backstop_check` consults) needs `endpoint`, `model`, and one credential source; none have defaults.
`activeModels` picks the session models backstop runs for.

Reuse a provider you already connected with `/connect` by naming its integration ID. For example,
`typesafe/jev` on CommandCode:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-backstop",
      "options": {
        "decision": {
          "endpoint": "https://api.commandcode.ai/provider/v1/systemone",
          "model": "typesafe/jev",
          "integration": "commandcode",
        },
        "activeModels": ["*deepseek*"],
      },
    },
  ],
}
```

Or pass the key directly with OpenCode's config substitution, `{env:VAR}` or `{file:path}`:

```jsonc
"decision": {
  "endpoint": "https://opencode.ai/inference/systemone/v1/systemone",
  "model": "jev-1.13-free",
  "apiKey": "{env:OPENCODE_API_KEY}"
}
```

`opencode api get /api/integration` lists integration IDs and their connections. For a local checkout, use `"package": "./opencode-backstop"`; relative paths resolve from
the config file.

### Prerequisite: `oracle` subagent

The bundled skill sends `plan` and `review` to a subagent named `oracle`, which OpenCode does not
ship. Define it as a read-only subagent pinned to a frontier model:

```jsonc
{
  "agents": {
    "oracle": {
      "description": "Read-only frontier advisor for planning, root-cause diagnosis, diff review, and independent second opinions. Select a frontier model per routing at dispatch.",
      "mode": "subagent",
      "model": "claude-agent/opus#high",
      "permissions": [
        { "action": "*", "resource": "*", "effect": "deny" },
        { "action": "read", "resource": "*", "effect": "allow" },
        { "action": "glob", "resource": "*", "effect": "allow" },
        { "action": "grep", "resource": "*", "effect": "allow" },
        { "action": "webfetch", "resource": "*", "effect": "allow" },
        { "action": "websearch", "resource": "*", "effect": "allow" },
        { "action": "skill", "resource": "*", "effect": "allow" },
        { "action": "external_directory", "resource": "*", "effect": "allow" },
        { "action": "shell", "resource": "*", "effect": "allow" },
        { "action": "read", "resource": "*.env", "effect": "ask" },
        { "action": "read", "resource": "*.env.*", "effect": "ask" },
        { "action": "read", "resource": "*.env.example", "effect": "allow" },
      ],
    },
  },
}
```

`handoff` gives the work to the built-in `general` agent, so make sure `general` runs on a frontier
model (pin `agents.general.model`, or have your own model-selection guidance pick one at dispatch).

## Options

| Option                 | Type                 | Default                                  | Description                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decision.endpoint`    | `string`             | **required**                             | Full URL of a System One decision endpoint, including its path (e.g. `https://opencode.ai/inference/systemone/v1/systemone`). Must be an absolute `http(s)` URL.                                                                                                                                                                                                                               |
| `decision.model`       | `string`             | **required**                             | Decision model ID sent as the request's `model` field (e.g. `typesafe/jev`); IDs differ per provider.                                                                                                                                                                                                                                                                                          |
| `decision.integration` | `string`             | one of these two required                | ID of a connected OpenCode integration (e.g. `commandcode`) whose key or OAuth token is sent as `Authorization: Bearer <key>`. Resolved on every check, so reconnecting takes effect without a reload.                                                                                                                                                                                         |
| `decision.apiKey`      | `string`             | one of these two required                | The key itself, normally written as `"{env:VAR}"` or `"{file:path}"`. OpenCode substitutes an unset variable with `""`, which fails setup.                                                                                                                                                                                                                                                     |
| `activeModels`         | `string[]`           | all models                               | Session (chat) models backstop runs for, as glob patterns (e.g. `"*deepseek*"`, `"commandcode/deepseek/*"`) or exact `"providerID/modelID"` / `"modelID"` strings (case-insensitive). When set, `session.hook("context")` exposes `backstop_check` and auto-injects the `backstop` skill into `event.system` **only** for matching sessions, stripping `backstop_check` from all other models. |
| `includeSubagents`     | `boolean`            | `false`                                  | When `activeModels` is set, whether child subagent sessions (`parentID` present) also activate backstop. Keeping this `false` prevents `explore`/`general` subagents on DeepSeek from self-escalating.                                                                                                                                                                                         |
| `skill`                | `boolean`            | `true`                                   | Register (and, when `activeModels` is set, auto-inject) the bundled `backstop` skill. Set to `false` to keep only the tool.                                                                                                                                                                                                                                                                    |
| `autoinvoke`           | `boolean`            | `false` with `activeModels`, else `true` | Controls the registered skill's global `autoinvoke` flag. Defaults to `false` when `activeModels` is set so non-matching models pay zero context load while matching sessions get auto-injected via hook.                                                                                                                                                                                      |
| `signalThreshold`      | `number` in `(0, 1]` | `0.5`                                    | Minimum predicate probability for a signal to be reported as elevated in the decision `reason`. It does not change the chosen action.                                                                                                                                                                                                                                                          |

Invalid options fail plugin setup with a clear error (for example a missing `decision.endpoint`, both
or neither of `decision.integration` and `decision.apiKey`, an empty `decision.apiKey`, or
`signalThreshold` outside `(0, 1]`). The pre-rename top-level keys (`endpoint`, `model`,
`integration`, `apiKey`, `models`) fail with a message naming their replacement.

## `backstop_check` tool

### Input

| Field      | Type                                  | Required | Description                                             |
| ---------- | ------------------------------------- | -------- | ------------------------------------------------------- |
| `phase`    | `"pre-edit" \| "stuck" \| "pre-done"` | yes      | The judgment point in the session.                      |
| `request`  | `string` (non-empty)                  | yes      | What the agent is trying to do, stated as plain facts.  |
| `evidence` | `string` (non-empty)                  | yes      | Inspected files, scope, attempts, errors, verification. |

Input is truncated before it reaches the decision model:

- `request`: **8,000 characters**
- `evidence`: **32,000 characters**

Truncation keeps the head and tail of the text with an explicit `[...truncated N chars...]` marker,
so the beginning and the most recent evidence both survive. A decision made on truncated input is
flagged with `truncated: true` in the tool metadata.

### Phase to action

| Phase      | Possible actions                 |
| ---------- | -------------------------------- |
| `pre-edit` | `proceed` \| `plan` \| `handoff` |
| `stuck`    | `proceed` \| `plan` \| `handoff` |
| `pre-done` | `proceed` \| `review`            |

- `proceed` — the cheap model can continue solo.
- `plan` — get a concrete plan from a frontier read-only oracle first.
- `handoff` — hand the implementation to a frontier model.
- `review` — send the diff and verification output to a frontier read-only oracle before finishing.

### Output

The tool returns compact JSON for the agent:

```json
{
  "action": "review",
  "reason": "Recommended review (70% confidence). Elevated signals: verification gap (62%)."
}
```

| Field      | Description                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| `action`   | The recommended action for the phase. Absent when the check failed.                    |
| `reason`   | The confidence and any elevated risk signals, or why the check failed.                 |
| `fallback` | Present and `true` **only** when the check failed; the result then recommends nothing. |

Tool metadata carries the numbers for telemetry: `phase`, `action`, `confidence`, `model`,
`fallback`, `truncated`, phase-specific `signals` (design/invariant/execution risk; flawed
approach/unclear root cause/frontier need; logic risk/verification gap/design drift), the full action
`probabilities`, and `cost`/`tokens` when the decision model reports usage.

**Fail-open vs abort.** If the integration has no usable credential, the decision endpoint errors
(network failure, non-2xx status, non-JSON body), or the model returns a missing/invalid action, the
tool fails open: it returns `fallback: true` and a reason ending "The check recommends nothing;
choose the action yourself.", with no `action`. The agent keeps working on its own judgment rather
than blocking. An explicit cancellation is different: aborting the tool call propagates the abort
instead of failing open.

## Bundled `backstop` skill

[`skills/backstop/SKILL.md`](skills/backstop/SKILL.md) tells the agent when to call
`backstop_check` (before non-trivial edits, when stuck, before declaring done) and how to act on each
result, with a circuit breaker capping frontier rounds per task. It sends `plan` and `review` to
`oracle` and `handoff` to `general` (see [Prerequisite](#prerequisite-oracle-subagent)).

If a skill named `backstop` already exists in the user's configuration (for example a custom
`SKILL.md`), the plugin leaves it untouched instead of overwriting it. Set `"skill": false` to
disable the bundled skill entirely.

## Development

```sh
bun install --frozen-lockfile

bun run typecheck
bun test

# Live evaluation against a decision endpoint (all three variables are required)
BACKSTOP_ENDPOINT=https://api.commandcode.ai/provider/v1/systemone \
BACKSTOP_MODEL=typesafe/jev \
BACKSTOP_API_KEY=... \
bun run eval:live
```

`eval:live` runs the real `buildDecisionRequest` / System One client / `synthesizeDecision`
pipeline against the configured endpoint (the same settings as the plugin's `decision.endpoint`,
`decision.model`, and `decision.apiKey` options) with 8 calibration cases spanning `pre-edit`, `stuck`, and
`pre-done`. It prints a per-case table (expected vs actual action, confidence, latency, pass/miss),
elevated signals for misses, and a total. It exits `0` only when every case matches its expected
action.

### Manual smoke test

Add the local checkout to a throwaway project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-backstop",
      "options": {
        "decision": {
          "endpoint": "https://api.commandcode.ai/provider/v1/systemone",
          "model": "typesafe/jev",
          "integration": "commandcode",
        },
      },
    },
  ],
}
```

Then check that the plugin loaded and the skill registered (run from that project):

```sh
# Plugin is active
opencode api get "/api/plugin?location[directory]=$(pwd)" | grep -o '"id": *"backstop"'

# Bundled skill is listed
opencode api get "/api/skill?location[directory]=$(pwd)" | grep -o '"id": *"backstop"'
```

Verify `backstop_check` is callable end to end:

```sh
opencode run "Call backstop_check once with phase 'pre-edit', request 'fix a one-line typo in README.md line 12', and evidence 'inspected README.md only; 1-line docs edit'. Then repeat its JSON result."
```

The tool output should be a JSON object with `action`, `confidence`, `reason`, and `signals`.

## License

MIT
