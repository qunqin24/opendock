# fast-jev-opencode

[![npm](https://img.shields.io/npm/v/fast-jev-opencode.svg)](https://www.npmjs.com/package/fast-jev-opencode)
[![CI](https://github.com/roshan-shaik-ml/fast-jev-opencode/actions/workflows/ci.yml/badge.svg)](https://github.com/roshan-shaik-ml/fast-jev-opencode/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/fast-jev-opencode.svg)](./LICENSE)

**Verbatim context pruning for [OpenCode](https://opencode.ai) v1 and v2.** Every request to the
model is scored by [TypeSafe Jev](https://docs.typesafe.ai): stale tool calls are removed, bulky
tool outputs are truncated, and everything that stays is kept word for word. Nothing is
summarized and nothing is rewritten.

- One package, two hosts: v2 registers `ctx.session.hook("context", …)`, v1 uses
  `experimental.chat.messages.transform`.
- Persisted history, the UI, and your files are never touched — only the outgoing request.
- Fail-open everywhere: a missing key, timeout, transport error, or malformed answer leaves the
  request exactly as it was.
- Credential-shaped inputs and secrets in prose are redacted before anything is scored.
- Optional per-request reasoning effort, chosen by Jev from the levels the model declares.

## Install

Needs a Jev key from the [TypeSafe console](https://console.typesafe.ai).

```sh
# OpenCode v2
opencode plugin add fast-jev-opencode
```

```sh
# or straight from GitHub
opencode plugin add github:roshan-shaik-ml/fast-jev-opencode
```

```jsonc
// OpenCode v1 (1.18.29+) — ~/.config/opencode/opencode.json
{ "plugin": ["fast-jev-opencode@git+https://github.com/roshan-shaik-ml/fast-jev-opencode.git"] }
```

Versions older than 1.18.29 cannot load an object entrypoint; pin `#v0.1.0` on the same spec.

## Quick start

1. Install with one of the commands above.
2. Put your key where the plugin can find it:

   ```sh
   printf 'TYPESAFE_API_KEY=your-key-here\n' >> ~/.config/opencode/.env
   ```

3. Restart OpenCode. It starts in `dryRun` mode, so nothing is pruned until you create
   `~/.config/opencode/fast-jev.json` with `{ "dryRun": false }`. The full set of options is in
   [fast-jev.example.json](./fast-jev.example.json).

Keys are resolved in order: inline `apiKey`, the `TYPESAFE_API_KEY` variable of the OpenCode
process, a `TYPESAFE_API_KEY=…` line in `~/.config/opencode/.env` (easiest), or the file named by
`apiKeyFile`. For `provider: "zen"` or `"openrouter"`, supply `OPENCODE_API_KEY` or
`OPENROUTER_API_KEY` instead.

## What it asks Jev

For each candidate tool call the plugin sends one question — a three-way choice with the
competing options spelled out, plus a short head/tail excerpt of the output so the decision is
made on content rather than a byte count:

```jsonc
{
  "state": {
    "task": "Fix the failing /login test. Never edit src/generated.",
    "history": [
      { "role": "user", "text": "…" },
      {
        "role": "assistant",
        "text": "…",
        "calls": [
          {
            "n": 1,
            "tool": "read",
            "input": "{\"filePath\":\"src/auth.ts\"}",
            "outcome": "ok",
            "bytes": 4820,
          },
        ],
      },
    ],
  },
  "questions": {
    "c1": {
      "type": "choice",
      "instructions": "Tool call c1 (read, 4820 characters of output) is in the conversation history. Decide what the next step still needs from it.\nOutput preview: export function login(… ) … }",
      "criteria": {
        "keep": "Both the call and its full output are still needed, and re-running the tool would not reproduce the output.",
        "truncate": "The call still matters, but only a short head of its output does. The rest can go.",
        "drop": "Neither the call nor its output matters for the next step; it is stale or superseded.",
      },
    },
  },
}
```

Jev answers with probabilities, which are compared against two thresholds
(`keepCallThreshold` / `keepResultThreshold`):

```jsonc
{ "answers": { "c1": { "probabilities": { "keep": 0.72, "truncate": 0.2, "drop": 0.08 } } } }
```

Calls the transcript can prove stale by itself — an identical request made later, or an error a
later identical request resolved — are dropped without asking Jev at all. A pass that scored
`minScored` calls and kept none is refused: a blanket removal is a bad answer, not a decision.

## Configuration

`~/.config/opencode/fast-jev.json` is re-read on every request, so edits apply without a
restart. `FAST_JEV_CONFIG` points the plugin at a different file. The options most people touch:

| Option                   | Default    | Meaning                                                              |
| ------------------------ | ---------- | -------------------------------------------------------------------- |
| `dryRun`                 | `true`     | Score and log, but do not rewrite the request                        |
| `provider`               | `typesafe` | `typesafe`, `zen`, `openrouter`, or `custom`                         |
| `keepCallThreshold`      | `0.25`     | Minimum probability for the call itself to stay                      |
| `keepResultThreshold`    | `0.15`     | Minimum probability for its output to stay verbatim                  |
| `questionStyle`          | `choice`   | One three-way question per call, or `noul` for two yes/no questions  |
| `preserveRecentMessages` | `6`        | Newest messages never judged                                         |
| `minResultChars`         | `2000`     | Results below this size are never candidates                         |
| `removedCallStyle`       | `"stub"`   | Keep a dropped call with its output cut short, or `"delete"` it      |
| `protectTools`           | `[]`       | Tool names whose calls and results are always kept                   |
| `cacheAware`             | `false`    | With `inputPrice` / `cachedInputPrice`, refuse prunes that cost more |
| `verbatimCheckpoint`     | `false`    | At compaction, record the messages themselves instead of a summary   |
| `effortEnabled`          | `false`    | v2: let Jev choose the request's reasoning effort                    |
| `logFile`                | `""`       | v2 only: append decisions to this file; `~` is expanded              |

Provider presets: `typesafe` (`api.typesafe.ai/v1/systemone`, `jev-latest`), `zen`
(`opencode.ai/zen/v1/systemone`, `jev-1.13-free`), `openrouter`
(`openrouter.ai/api/v1/systemone`, `typesafe/jev-1.13`). `custom` needs `baseUrl` and `model`.

## Seeing it work

v2 gives plugins no log sink, so the plugin's output has nowhere to go unless you give it a
file. Set `"logFile": "~/.local/share/opencode/fast-jev.log"` and it writes one line per
decision — counts only, no prompts, no tool output, no keys:

```
2026-09-27T00:12:03Z [fast-jev] info: pruned outgoing request {"droppedCalls":0,"stubbedCalls":1,"droppedResults":2,"removedMessages":0,"ruleDrops":0,"requests":1,"stateTokens":8159,"estimatedCostUsd":0,"stage":"full"}
```

Set `logFile` alone and logging turns on. The file rotates to `.old` at 2 MB. This option is
v2-only and ignored by v1, whose host surfaces plugin logs itself.

A quiet file is not always a fault: nothing is judged unless a result is at least
`minResultChars` and older than the newest `preserveRecentMessages` messages, and the keep-signal
guard can refuse a pass outright. Short sessions legitimately produce nothing.

## How it works

```
outgoing request -> map OpenCode messages to the message model
                 -> drop what the transcript proves stale (no request)
                 -> ask Jev one choice question per remaining candidate
                 -> rewrite only the outgoing request
```

A candidate is a tool call that is not pinned (the first message or the newest
`preserveRecentMessages`), whose result is at least `minResultChars`, and whose tool is not in
`protectTools`. Calls rated as no longer needed keep their place with the output cut short
(`removedCallStyle: "stub"`), so the assistant's narration never loses the evidence behind it.

## Effort selection (v2, opt-in)

With `effortEnabled: true`, the plugin asks Jev one extra question — how much reasoning does
this request need? — and records the answer as an `effort` part on the outgoing request, which
the host resolves into whatever the provider speaks (OpenAI's `reasoning_effort`, a thinking
budget, and so on). The levels offered are computed for the target model: your
`effortModels["provider/model"]` override first, then the variants the model declares, then
`effortLevels` (default `low`/`medium`/`high`). Injection happens **only** when the host
explicitly declares `compatibility.supportsEffortUpdates: true` for that model; anything else,
including silence, does nothing. The decision is cached per session and digest, and failures
fail open.

## Measured

```sh
npm run bench           # engine <-> adapter consistency
npm run bench:savings   # token savings, with and without Jev
npm run bench:baseline  # selection vs plain head+tail truncation, size-equalised
npm run bench:replay    # the same over a real session from OpenCode's SQLite store
```

Across eight real sessions the defaults saved **25.3%** of outgoing request characters on
average, 42.5% with aggressive settings; roughly half of a real session's payload is tool
_inputs_, which is why clearing outputs alone tops out near 10%. Selection is not magic —
size-equalised against plain truncation it keeps comparable evidence — so install this for the
safety: pairing preserved, text untouched, secrets redacted, failures failing open. Defaults
were calibrated from live `choice` answers on real sessions. Tokens are estimated with the
plugin's own estimator, not provider-billed tokens.

## Development

```sh
npm test               # offline, no key: mock endpoint, both hooks
npm run format:check
```

Requires Node >= 22.6 (`--experimental-strip-types`).

## License

MIT — see [LICENSE](./LICENSE). Not affiliated with TypeSafe or OpenCode.
