# opencode-compact-at-token-limit

An [OpenCode](https://opencode.ai) plugin that does one thing: when a session's context reaches a token limit, it asks OpenCode to compact the session. The default limit is **200,000 tokens**, and you can change it.

No tools, no commands, no files on disk. It watches every session.

## Why

OpenCode compacts on its own only when it knows the model's context window. A model that reports `limit.context: 0` (common for custom or proxied providers) is never auto-compacted, so a long session grows until the provider rejects it. A model with a huge window (1M) may also be cheaper and sharper if you keep the context well under its limit. This plugin puts a cap on the context either way.

## Install

Add it to the `plugin` list in `opencode.json` (global `~/.config/opencode/opencode.json` or a project's `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-compact-at-token-limit"]
}
```

Or pin a GitHub tag instead of npm:

```json
{ "plugin": ["opencode-compact-at-token-limit@github:sblattj/opencode-compact-at-token-limit#v0.1.1"] }
```

## Configure

The limit is in tokens. `0` turns the plugin off.

**Plugin option** (use the tuple form of the plugin entry):

```json
{
  "plugin": [["opencode-compact-at-token-limit", { "limit": 150000 }]]
}
```

**Environment variable:**

```sh
OPENCODE_COMPACT_AT_TOKENS=150k opencode
```

Both accept a whole number (`150000`) or a `k`/`m` suffix (`150k`, `1.5m`).

**Precedence:** plugin option `limit`, then `OPENCODE_COMPACT_AT_TOKENS`, then `200000`. If a value can't be parsed (a typo, a negative number), it is skipped and the next source is used. A typo never turns the plugin off, only an explicit `0` does.

## How it works

The mechanism comes from the forced compaction in [opencode-goal-pro-max-complete-plugin](https://github.com/sblattj/opencode-goal-pro-max-complete-plugin) (v1.5.3). It is cut down to only the compaction part and runs in every session, not only sessions with a goal.

1. On every finished assistant step, it reads the context that step ran with: `tokens.total` if the host reports it, else `input + output + reasoning + cache.read + cache.write`.
2. When that is at or over the limit, it calls `session.summarize` (`POST /session/{id}/summarize`) with the step's provider and model. The host answers only when the whole run ends, so the call is never awaited.
3. OpenCode's `session.compacted` event is the only proof a compaction happened. It clears the pending request.

Guards:

- **One request at a time** per session.
- **Retries:** if 3 more steps finish with no compaction, the request counts as failed and a new one is sent. A request the host rejects right away also counts as failed. After 3 failures, it stops forcing until the next compaction.
- **No compaction loops:** if the first step after 2 compactions in a row is still over the limit, compacting isn't helping (the limit is below what a summary needs). It holds until a step comes in under the limit.
- **No double compaction:** if OpenCode's own overflow check is active for the model (`limit.context > 0`), the first step over the limit is left to OpenCode. If the next step is still over, the plugin forces.
- **Idle backstop:** if a turn ends over the limit and no request was sent, it requests one when the session goes idle.

Each step is logged at `info` through OpenCode's app log (service `opencode-compact-at-token-limit`). The log shows the resolved limit at startup, then the context per step and each forced compaction.

## Limits and notes

- **Running it with the goal plugin:** opencode-goal-pro-max-complete-plugin has the same forcing built in (`--compact-at`, default 200k), but only while a goal runs. If you use both, set the goal plugin's `compactAtTokens` to `0` or use the same limit in both. They don't coordinate, so two different limits can mean two compaction requests.
- If the host rejects a forced compaction, the plugin does not delete the leftover compaction message. The goal plugin does. OpenCode retries that message on the next prompt.
- Works with the OpenCode v1 plugin API (`server` entry). Tested live on OpenCode 1.19.0.

## Development

```sh
npm test            # unit tests (node:test, no dependencies)
npm run smoke:live  # real opencode A/B run against a mock model; needs ~/.opencode/bin/opencode
```

The live smoke runs two isolated `opencode serve` arms on the same scripted conversation. With a small limit, a compaction must happen. In the control arm the limit is above all usage, and no compaction may happen.

## License

MIT
