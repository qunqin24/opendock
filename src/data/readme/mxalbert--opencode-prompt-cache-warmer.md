# opencode-prompt-cache-warmer

OpenCode v2 plugin that keeps a provider's prompt cache warm by replaying the
last assembled request instead of sending a fresh, unrelated keep-alive prompt.

## Why

Providers cache a request's prefix for a few minutes. OpenCode's built-in
warming (`"warming": true`) sends its keep-alive through `session.generate`,
which only fires the `generate` session hook. Plugins that contribute system
parts or messages on `context` are therefore missing from the warm request, so
it shares no cacheable prefix with real turns and warms nothing useful.

This plugin observes the real request as the host assembles it — after every
configured plugin that mutates the request fields has had its turn — and
replays the captured hook-visible prompt fields with the keep-alive appended as
a final user message. The warm request then contains the same prompt prefix as
the real turn, which is the most a warm request can hit.

Replay covers the four fields the hook exposes: `system`, `messages`,
`options`, and tool descriptions/schemas. Everything else stays derived from
the warm request itself — `toolChoice`, transport selection (a warm request is
always HTTP, never the primary's WebSocket), and any `model.request` hook
adjustments. Those do not affect the cached prefix.

## Install

```json
{
  "plugins": ["@mxalbert/opencode-prompt-cache-warmer"],
  "warming": false
}
```

Set `"warming": false`. This plugin replaces the built-in warmer; leaving both
on warms every session twice.

### The plugin must be last in `plugins`

Hook callbacks run in registration order, and activation is serial: built-in
request-shaping plugins, then SDK and instance plugins, then configured packages
in config order, then a trailing group of built-in config plugins that derive
their contributions from configuration (instructions, agents, commands,
providers, skills, and similar).

So last-in-config makes this plugin last among **configured** plugins, which is
the part that matters: it sees everything the other configured plugins
contributed to the request. The trailing group can still register after it, but
none of those plugins register a `context` hook, so the captured snapshot is
complete.

The guarantee is "last among configured plugins," not "last overall." If it is
not last, the captured snapshot is incomplete and the warm request misses part
of the cache — degraded, never corrupt: the real turn is unaffected, the warm
request is simply less useful.

## Options

```json
{
  "plugins": [
    {
      "package": "@mxalbert/opencode-prompt-cache-warmer",
      "options": {
        "enabled": true,
        "interval": "4 minutes",
        "duration": "30 minutes",
        "models": ["!opencode-go/deepseek-*"],
        "prompt": "This is a keep-alive request. Do not perform any work or use tools. Reply with exactly: OK"
      }
    }
  ]
}
```

| Option     | Default    | Description                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------ |
| `prompt`   | see above  | Text of the appended keep-alive message.                                 |
| `interval` | `4m`       | Idle time before a warm request; also the re-arm delay between warms.    |
| `duration` | `30m`      | How long after the last real request warming continues before it stops.  |
| `models`   | all models | Which models to warm. Absent or empty means every model.                 |
| `enabled`  | `true`     | Set `false` to load the plugin without warming anything.                 |

`interval` and `duration` accept milliseconds as a number or a string with a
unit: `"90s"`, `"4m"`, `"4 minutes"`, `"1 hour"`. A non-finite, non-positive,
overflowing, or over-long value disables the plugin and logs a warning.
`interval` is capped at 2,147,483,647 ms (about 24.8 days) because larger
delays are clamped by the runtime.

### `models`

Some providers hold a prompt cache for hours, so those models gain little from
warming. Exclude them:

```json
{
  "models": ["!opencode-go/deepseek-*", "!openai/*"]
}
```

Providers with a short cache TTL are the opposite case — Anthropic's cache
typically expires in minutes, which is exactly what warming exists to prevent.
To warm only a select set, use plain patterns instead of a leading `!`:

```json
{
  "models": ["anthropic/*"]
}
```

A value is a pattern or an array of patterns. `*` matches any run of characters
and `?` matches one; matching is case-insensitive and a dot is literal. Each
pattern is tested against three forms of the active model:

- the full key, `providerID/modelID#variant` (for example `anthropic/claude-haiku#high`)
- the provider-qualified id, `providerID/modelID`
- the bare model id

A leading `!` marks an exclusion. Exclusions are checked first and always win.
If any plain pattern is present, a model must match one to be warmed; with no
plain patterns, every non-excluded model is warmed. An empty list is the same as
omitting the option. A malformed value — a non-string entry, a blank string, or
a bare `!` — disables the plugin and logs a warning, the same as an invalid
`interval`.

The filter is checked when a request is assembled, so a session that switches to
a skipped model stops scheduling further warms, and switching back resumes after
the next real request. A warm request that was already dispatched cannot be
recalled; it completes against the model it was sent for.

## Behavior

- **Capture** — on every `context` hook run, the assembled `system`, `messages`,
  `options`, `tools`, `agent` and model are recorded for that session, and the
  session's idle timer restarts. Subagent sessions (`parentID` set) and sessions
  whose model the `models` filter excludes are skipped, and each session's status
  is cached in a bounded session-status cache.
- **Warm** — after `interval` of inactivity, if the last real request is still
  within `duration`, the plugin calls `session.generate` with the keep-alive
  prompt. A `finally`-balanced in-flight counter lets the `generate` hook
  recognize its own request, and the request must also end with the configured
  keep-alive prompt, so a concurrent `generate` call from another plugin on the
  same session is passed through untouched. The one case this cannot separate
  is a foreign concurrent `generate` whose prompt is byte-identical to the
  configured keep-alive: the plugin cannot tell it apart and will replay it.
- **Replay** — for its own warm request only, the plugin restores the captured
  `system`, `options` and tool descriptions/schemas, sets `messages` to the
  captured history plus the keep-alive, and skips this entirely if the snapshot
  is missing, expired, or was captured for a different model or agent. Tools
  are restored onto the objects the host already supplied, because the host
  resolves each tool by object identity; a tool whose *key* a `context` hook
  renamed cannot be matched back and is left alone.
- **Invalidate** — the snapshot is dropped on any event that can change the
  selected transcript: compaction start/end/failure, revert stage/clear/commit,
  agent or model selection, instruction updates, message content updates, skill
  activation, foreground shell completion, synthetic messages, and session
  deletion, moves and forks. Background shell results never reach the model, so
  they do not cancel warming.

## Coverage

Because it replays the last *assembled* request, this works with any plugin
whose injections are visible in the `context` event — regardless of which hooks
that plugin registers. That covers the common case of a plugin that appends
system parts or messages on `context` only.

It does not cover cases where the warm request's own assembly differs in a way
the `context` event cannot express: a `context` hook that renames tool keys, a
hook that runs *after* `generate` (such as `model.request`), or transport
selection. In those cases the warm request still works, it just shares a
smaller prefix.

It does not help the turn *after* the next real one beyond the shared prefix.
Each warm request extends the provider's cache window for the same prefix; it
adds no new context of its own.

## Development

```bash
bun install
bun run build      # dist/server/index.js and dist/index.js
bun test
bun run typecheck
```

The state machine lives in `src/warmer.ts`, which has no host imports and is
unit tested directly.

## License

MIT
