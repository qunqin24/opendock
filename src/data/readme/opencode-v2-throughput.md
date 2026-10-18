# opencode-v2-throughput

**Find out which of your models is actually fast, and which one is quietly wasting your time.**

OpenCode shows you token counts and cost. It does not tell you *why* one request felt instant and
the next one dragged. This plugin adds the missing half: real latency and throughput numbers, live
in your sidebar, per request.

Built for the **OpenCode v2 plugin API**. It does not run on v1, where the plugin system is different.

---

## What you get

A live sidebar panel, one toast per response, and a tool your agent can query for the history.

```
▼ Throughput  12 reqs  $0.4310
  claude-sonnet-4-5 1.2s 446/s 3.2s ↑1.2k ↓892
  gpt-5 0.4s 310/s 1.1s ↑980 ↓1.6k
  space-bunny-free 6.8s 94/s 12.6s ↑125 ↓550
  Recent
  space-bunny-free 6.8s 94/s 12.6s ↑125 ↓550
  gpt-5 0.4s 310/s 1.1s ↑980 ↓1.6k
```

Each column is: **TTFT** (time to first token, so you know when the response *starts*),
**TPS** (generation speed), **total latency**, then token counts.

That single line tells you something the default footer never does. In the panel above,
`gpt-5` starts answering in 0.4s while `space-bunny-free` takes 6.8s to say anything. For a
codebase you iterate on, the model that feels responsive is the one worth paying for.

---

## Install

Requires **OpenCode v2.0.0+**. No build step and no dependencies to install.

```sh
opencode plugin add opencode-v2-throughput -g
```

Restart OpenCode. That's it.

<details>
<summary>Install without npm</summary>

Copy the source into any plugin directory. There is nothing to build and no
`node_modules` to create:

```sh
mkdir -p ~/.opencode/plugins/throughput
git clone https://github.com/mrakha60/opencode-v2-throughput.git /tmp/opencode-v2-throughput
cp /tmp/opencode-v2-throughput/src/* ~/.opencode/plugins/throughput/
```

Works globally from your home directory, or drop the same directory into any
project's `.opencode/plugins/`. The folder name does not matter; the plugin takes
its identity from the `id` in the code, so `throughput` is just a short label.

</details>

### A note on dependencies

`@opentui/core`, `@opentui/solid`, and `solid-js` are declared as **optional** peer
dependencies on purpose. OpenCode provides them, and the plugin must resolve them from
the host runtime.

They are marked optional so npm does not install its own copy. This is not a
formality: a second physical copy of `@opentui/core` makes the terminal client abort on
import with

```
Environment variable "OPENTUI_FORCE_UNICODE" is already registered with different configuration
```

which is exactly how the [original package](#credits) fails. Only `@opencode/plugin` is
installed, because it has no native registration and guarantees the import resolves.

---

## The numbers, precisely

Metrics are per **model request**, which is the same granularity as one assistant message.

| Metric | Meaning |
| --- | --- |
| **TTFT** | Step start to the first token streamed. `null` for tool-call-only turns. |
| **TPS** | Output tokens ÷ generation time. Excludes the TTFT wait, so a fast model is not flattered by a slow first token. |
| **Latency** | Step start to step end. |

Token usage (input / output / reasoning / cache read-write) and cost come straight from the
server's own accounting, so they match what you are billed.

Reasoning counts as a first token, so a reasoning-heavy turn reports a real TTFT instead of `N/A`.

---

## Ask your agent about it

A `throughput_benchmark` tool is registered for the agent to call:

> "Which model is fastest for me?"
>
> "Compare my latency on claude vs gpt-5"
>
> "Show the last 10 requests"

```
## Model Performance Benchmark
Total requests: 12

### anthropic/claude-sonnet-4-5
  Requests: 7

  **Latency:**
    TTFT:  avg 1.2s | min 0.9s | max 2.1s
    Total: avg 3.4s | min 2.2s | max 5.1s

  **Throughput:**
    TPS:  avg 446 | max 612

  **Tokens:**
    Input:     8.4k
    Output:    6.2k
    Reasoning: 1.1k
    Cache R/W: 3.5k / 0.0

  **Cost:** $0.3120
```

---

## Your data stays yours

Every request is appended to `~/.opencode/throughput.jsonl`, one JSON object per line:

```json
{"ts":"2026-10-17T10:54:14.336Z","model":"opencode/space-bunny-free","providerID":"opencode",
 "modelID":"space-bunny-free","ttft_ms":6769,"tps":94.4,"latency_ms":12593,
 "inputTokens":125,"outputTokens":550,"reasoningTokens":324,"cacheReadTokens":265259,
 "cacheWriteTokens":0,"cost":0,"finish":"stop"}
```

No network calls, no telemetry, no accounts. A rolling human-readable log also lands in
`<project>/.opencode/throughput.md`.

The log trims itself past 32 MB, so it stays bounded over time.

---

## How it works

Subscribes to the v2 server event stream and measures each request:

| Event | Role |
| --- | --- |
| `session.step.started` | anchors the request, resolves the model |
| `session.text.started` / `session.reasoning.started` | anchors time to first token |
| `session.step.ended` | supplies cost, tokens, finish, and closes the window |

Reconnects with backoff if the stream drops, so a flaky connection does not silently stop
recording. Handlers are individually guarded, so a bug costs one metric rather than the panel.

---

## Development

```sh
npm install
npm run verify     # typecheck + all four verification scripts
npm run sync       # install src/ to ~/.opencode/plugins/throughput
```

The verification suite checks both entrypoints against a copy of OpenCode's own plugin
validator, drives a scripted event stream to check the metric arithmetic, exercises the TUI
setup path, and guards against a duplicate `@opentui/core` breaking the sidebar. All of it runs
in CI.

`npm run sync` installs a **real copy**, never a symlink. Module resolution follows `realpath`,
so a link back to a checkout would let the plugin load a second copy of OpenTUI and fail at
import. The script refuses to install if it detects that.

---

## Credits

Forked from [`Howardzhangdqs/opencode-throughput`](https://github.com/Howardzhangdqs/opencode-throughput),
which is stuck on the v1 plugin API and cannot load under OpenCode v2. This fork is a full port
to the v2 API: the entrypoint, the event stream, the TUI widget, and the tool registration were
all rewritten, and the metric definitions were corrected along the way.

## License

MIT