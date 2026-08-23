# opencode-retry-forever

Keeps long-running opencode sessions alive across transient provider failures.

If you leave a fleet of agents running for hours, a single upstream hiccup kills a whole
session. opencode's built-in retry gives up after a handful of attempts, and then
`SessionRunner.drain` throws:

```
level=ERROR message="Failed to drain Session" cause="AI.Error: RequestExecutor.execute: Provider request failed with HTTP 503"
level=ERROR message="Failed to drain Session" cause="AI.Error: RequestExecutor.request: getaddrinfo ENOTFOUND opencode.ai"
level=ERROR error.error="AI_RetryError: Failed after 3 attempts. Last error: Service Unavailable"
```

This plugin wraps `globalThis.fetch` — which is what opencode's request executor ultimately
calls (`effect/http/FetchHttpClient/Fetch` defaults to `() => globalThis.fetch`) — so retries
happen *below* the session runner. The session never learns that anything went wrong.

## Install

```sh
mkdir -p ~/.config/opencode/plugin
curl -fsSL https://raw.githubusercontent.com/aryanranderiya/opencode-retry-forever/main/index.ts \
  -o ~/.config/opencode/plugin/retry-forever.ts
```

Or, once published to npm:

```sh
opencode plugin opencode-retry-forever -g
```

Per-project instead of global: drop the same file in `.opencode/plugin/` inside the project.
It loads on the next `opencode` start; `opencode run --pure` bypasses it.

## Configuration

All optional, read from the environment at startup.

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPENCODE_RETRY_DELAY_MS` | `250` | Fixed wait between attempts. No backoff, no growth. Set `0` for an immediate hot retry. |
| `OPENCODE_RETRY_MAX_ATTEMPTS` | `0` | `0` means unlimited — retry until it gets through. |
| `OPENCODE_RETRY_HONOR_RETRY_AFTER` | `1` | Respect a `Retry-After` header when the server sends one. Turning this off is a good way to get rate limited harder. |
| `OPENCODE_RETRY_MAX_RETRY_AFTER_MS` | `60000` | Ceiling on how long a `Retry-After` may park you. |
| `OPENCODE_RETRY_VERBOSE` | `1` | Log every retry. Keep this on — an unlimited retry loop that logs nothing is indistinguishable from a hang. |

## What gets retried

- **HTTP status**: 408, 409, 425, 429, 500, 502, 503, 504, 520–525, 527, 529, 530.
- **Thrown network errors**, in both vocabularies that matter: Node/undici POSIX codes
  (`ENOTFOUND`, `ECONNRESET`, `ETIMEDOUT`, …) *and* Bun's own codes (`ConnectionRefused`,
  `FailedToOpenSocket`, `DNSResolutionFailed`, `ConnectionClosed`, `ConnectionTimeout`,
  `IdleTimeout`). opencode runs on Bun, and matching only the POSIX set silently misses
  every connect failure — the same blind spot that makes opencode's own retry give up on an
  unreachable provider.

Aborts are never retried: hitting Esc stops the loop immediately, including mid-wait. That
guard is load-bearing, because a cancelled in-flight request can surface as `ECONNRESET` or
`terminated`, both of which otherwise look retryable.

Request bodies are buffered once and replayed verbatim on every attempt, so `Request`
objects and `ReadableStream` bodies survive a retry instead of failing as already-consumed.

## Auto-resume: turns that die with an unknown finish reason

A transport retry cannot save a turn the provider ended mid-flight — the request succeeded,
the stream opened, then stopped with `finish: "unknown"`:

```
⚠ Retry attempt 2 scheduled: The provider response ended with an unknown finish reason.
⚠ Retry attempt 3 scheduled: The provider response ended with an unknown finish reason.
Error: Provider request failed with HTTP 503
```

opencode schedules a couple of retries and then gives up, taking the session with it. This
plugin watches for that specific ending and re-sends the user's own prompt, indefinitely.

It only fires on a genuine drop. A turn that produced output and then stopped without a
reason is a drop; a zero-token `unknown` finish is a deliberate abort — an interrupt, a
denied permission, a compaction — and resending there would fight you.

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPENCODE_RESUME_PROVIDER` | `opencode-go` | Provider to watch. `*` matches every provider. |
| `OPENCODE_RESUME_MODEL` | `ox-alpha-free` | Model prefix to watch. `*` matches every model. |
| `OPENCODE_RESUME_DELAY_MS` | `3000` | Wait before re-sending. |
| `OPENCODE_RESUME_MAX_ATTEMPTS` | `0` | `0` means resend until the turn completes. |

## What does not get retried

- **Failures mid-response-stream** are handled by auto-resume above, not by the fetch retry:
  once the provider returns 200 and starts streaming, fetch has already resolved.
- **Non-transient statuses** (400, 401, 403, 404, …) pass straight through.

## opencode 1.x vs 2.x

The plugin loads on both — the default export carries `id`, `server` (1.x) and `setup` (2.x).
What runs differs sharply, because **opencode 2.x never calls `server` at all**, only `setup`:

| | 1.x | 2.x beta |
| --- | --- | --- |
| Fetch-level retry (503, DNS, resets) | works | inert — v2 keeps provider traffic away from the plugin's `globalThis.fetch` |
| Language-model retry | n/a | only for providers that register `aisdk.hook("language")` |
| Auto-resume | via the `event` hook | via `event.subscribe()` + `session.prompt()` |

On 2.x the transport is simply not reachable from a plugin: `session.hook("http.request")`
can mutate a request but never sees its response. Recovery therefore happens one level up,
on `session.execution.failed` — the terminal event, raised once opencode's own retries are
spent. A turn you stop yourself raises `session.execution.interrupted` instead, so resuming
cannot fight an interrupt.

Verified against a provider that opens a stream, emits text, then dies with no finish chunk
— 20 consecutive drops, which is well past opencode's own budget of about six turns:

| | resumer disabled | enabled |
| --- | --- | --- |
| provider turns | 6 | 22 |
| outcome | session dead | recovered on turn 21 |

Under 2.x, opencode runs a long-lived background service that loads plugins once at startup,
so a plugin change is not picked up until `opencode2 service restart`.

## License

MIT
