<h1 align="center">OpenCode Foreman</h1>

<p align="center">
  <strong>Keep your agents on the job until it is actually done.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nigel-dev/opencode-foreman"><img src="https://img.shields.io/npm/v/@nigel-dev/opencode-foreman.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/nigel-dev/opencode-foreman/actions/workflows/ci.yml"><img src="https://github.com/nigel-dev/opencode-foreman/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

An [OpenCode](https://opencode.ai) V2 plugin that supervises agent sessions with a decision model. It adds three gates:

| Gate | Hook | What it does | Default |
| --- | --- | --- | --- |
| Done gate | `session` `experimental.idle` | When a session is about to go idle, checks whether the final message leaves requested work unfinished or claims completion without a check, and sends a synthetic message telling the agent to continue. | on |
| Intent gate | `session` `prompt` + `context` | Classifies each user request (intent, size, ambiguity) and adds an advisory routing hint to the system instructions for that turn. The stored user message is not modified. | on |
| Approval gate | `permission` `evaluate` | Scores the risk of `ask`-level shell commands that pass a strict lexical filter, and allows the low-risk ones. | off, dry run |

All three use [TypeSafe Jev](https://docs.typesafe.ai), a model that returns probabilities for typed questions instead of text. If the model is unreachable or returns something unusable, every gate does nothing, so an outage never blocks a session.

Requires OpenCode 2.3.0 or newer. Two of the hooks are marked experimental by OpenCode and may change.

## Install

```jsonc
// opencode.jsonc
{
  "plugins": ["@nigel-dev/opencode-foreman"]
}
```

From a local checkout, build first and use the directory path:

```sh
bun install && bun run build
```

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-foreman"]
}
```

## Configure

The plugin needs an API key for the decision model. Without one it loads and stays inactive.

| Environment variable | Option | Default |
| --- | --- | --- |
| `FOREMAN_JEV_API_KEY` | `jev.apiKey` | none |
| `FOREMAN_JEV_URL` | `jev.url` | `https://api.typesafe.ai/v1/systemone` |
| `FOREMAN_JEV_MODEL` | `jev.model` | `jev-latest` |

Options win over environment variables. Set environment variables on the background service with `opencode service set env NAME value`.

To route through a LiteLLM proxy, point the URL at its System One path and use the proxy's model name, for example `http://127.0.0.1:4000/v1/systemone` and `typesafe/jev-1.14.0`.

All options, with their defaults:

```jsonc
{
  "plugins": [
    {
      "package": "@nigel-dev/opencode-foreman",
      "options": {
        "jev": { "timeoutMs": 3000 },
        "doneGate": { "enabled": true, "maxContinuations": 2, "threshold": 0.5 },
        "intentGate": {
          "enabled": true,
          "minConfidence": 0.5,
          // Override the suggested handling per intent to name your own agents.
          "routes": { "implement": "Delegate to worker-deep, then verify." }
        },
        "approval": {
          "enabled": false,
          "dryRun": true,
          "riskThreshold": 0.2,
          "prefixes": ["git status", "git diff", "bun test"]
        }
      }
    }
  ]
}
```

## Behaviour

**Scope.** The done and intent gates act only on root sessions, not on subagent child sessions.

**Done gate.** It sends the latest user request and the assistant's final message to the model. It does nothing when the request did not ask for a change, when the assistant is waiting on the user, when the turn failed, or while the session's own background work is still running. It sends at most `maxContinuations` nudges per user request.

**Intent gate.** Intents are `trivial`, `explore`, `implement`, `plan`, `research`, and `discuss`. A classification below `minConfidence` produces no hint.

**Approval gate.** It only considers a permission request that is already `ask`, is a single shell command, starts with one of `prefixes`, and contains no chaining, redirection, substitution, secret-like paths, or risky flags. Every scored command is recorded in plugin storage under `approval/`; a command whose record cannot be written is not approved. With `dryRun` on, nothing is approved.

The lexical filter is a heuristic, not a shell parser or a security boundary. A command such as `bun test` runs project scripts, so keep `prefixes` narrow in repositories you do not trust. The command text is sent to the decision-model provider.

The model judges wording, not evidence. It can tell that a message says tests passed; it cannot tell whether they did.

## Develop

```sh
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layout and local testing.

## License

MIT
