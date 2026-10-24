# opencode-cache-manager

[![npm version](https://img.shields.io/npm/v/@noppu-labs/opencode-cache-manager?label=npm)](https://www.npmjs.com/package/@noppu-labs/opencode-cache-manager)
[![npm downloads](https://img.shields.io/npm/dm/@noppu-labs/opencode-cache-manager)](https://www.npmjs.com/package/@noppu-labs/opencode-cache-manager)
[![ci](https://github.com/noppu-labs/opencode-cache-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/noppu-labs/opencode-cache-manager/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@noppu-labs/opencode-cache-manager)](LICENSE)

An [OpenCode](https://opencode.ai) plugin for Claude's prompt cache. Pick the cache TTL per session (5 minutes, 1 hour, or a hybrid of the two) from inside the TUI, keep idle sessions' caches warm with hidden pings so they don't expire while you're away, and watch the cache state in the sidebar.

It works with Claude through the Anthropic API, through proxies that speak the Anthropic Messages API, and through OpenAI-compatible endpoints such as OpenRouter and proxies like OmniRoute. For models that aren't Claude, it shows how much of each prompt was cached and leaves the cache alone.

<p align="center">
  <img src="docs/images/sidebar.svg" alt="The Cache section of the OpenCode sidebar: status warm, cached 92% · 141k / 153k, expires 14:52 (52m), ttl 1h (detected), next ping 14:42 (42m), pings 2/5 ✓ hit" width="420">
</p>

## Why

OpenCode marks cache breakpoints on its own (tools, system prompt, the last message) but always sends `ttl: "5m"`, and there is no config option for it. Step away for ten minutes and your next prompt writes the whole context into the cache again at 1.25x the base input price (2x for the 1h cache) instead of reading it at about 0.1x.

This plugin rewrites the outgoing request after OpenCode's own cache policy runs, so you can switch a session to the 1-hour cache without forking the provider package. Keepalive handles the other half: it sends a small ping shortly before the cache would expire, so the context is still cached when you come back.

Published to npm under two names with identical contents: `@noppu-labs/opencode-cache-manager` and `opencode-cache-manager`.

## The three modes

| Mode | Tools + system | Messages | Write cost |
| --- | --- | --- | --- |
| `5m` (default) | 5m ephemeral | 5m ephemeral | 1.25x base input |
| `1h` | 1h ephemeral | 1h ephemeral | 2x base input |
| `hybrid` | 1h ephemeral | 5m ephemeral | mixed |

Reads cost about 0.1x base input in every mode. `hybrid` exists because Anthropic requires 1-hour breakpoints to come before any 5-minute ones in a request: the stable prefix (tools + system) gets the long TTL, and the message tail, which changes every turn, stays on the cheaper 5m write.

Requests in `1h` or `hybrid` mode also get the `anthropic-beta: extended-cache-ttl-2025-04-11` header merged in.

## Supported providers and endpoints

The plugin handles the Anthropic Messages API (`POST …/messages`) and OpenAI Chat Completions (`POST …/chat/completions`). Claude models get the full treatment on both. Other models (OpenAI, DeepSeek, Gemini, …) manage their own cache, so the plugin only shows how much of each prompt was cached.

[docs/SUPPORTED_PROVIDERS.md](docs/SUPPORTED_PROVIDERS.md) covers what the plugin does on each wire, how it decides a model is Claude, the example provider configs, and how each provider caches, with links to their docs.

## Install

Add the package to the `plugins` array in `~/.config/opencode/opencode.jsonc`. OpenCode installs it at startup; there is no manual `npm install`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@noppu-labs/opencode-cache-manager@^0.4.0"
    // or: "opencode-cache-manager@^0.4.0" -- same package, unscoped name
  ]
}
```

To run from a clone instead, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Upgrading from 0.1.x? See [docs/UPGRADE.md](docs/UPGRADE.md).

## Usage

Run `/cache-manager` in the TUI. It's also in the palette as "Cache Manager".

With no argument it opens a picker with a Session section (only shown inside a session) and a Global section:

<p align="center">
  <img src="docs/images/picker.png" alt="The Cache Manager picker: a Session section with TTL mode 5m · global, Keepalive on · global, Pings per idle 5 · global, Min context 50k · global and Reset session to global; a Global section with TTL mode 5m, Keepalive on, Pings per idle 5, Min context 50k" width="640">
</p>

Session rows that show `· global` inherit the global value; a row without it has a session override. Picking a row opens a list of values, and the numeric settings also offer "Custom…" for a typed value.

With an argument, the command edits the **current session only**, never the global settings:

```
/cache-manager 5m                -> session TTL mode 5m
/cache-manager 1h                -> session TTL mode 1h
/cache-manager hybrid            -> session TTL mode hybrid
/cache-manager keepalive on|off  -> turn keepalive on or off for this session
/cache-manager pings 3           -> at most 3 pings per idle stretch (0-100)
/cache-manager min 50k           -> minimum context size to ping (50000 or 50k)
/cache-manager reset             -> drop the session's overrides
/cache-manager status            -> toast with the session's effective settings
```

Typed arguments need an open session. Global settings are changed from the picker's Global section or in the plugin options (see [Settings](#settings)). Session overrides and global settings persist in plugin storage across restarts.

The server side registers the same command, so explicit arguments also work headless; the reply is posted as a synthetic message instead of a toast. With no argument the server-side command toggles the session's TTL mode between `5m` and `1h`.

### Per-model override

Model variants can force a TTL regardless of the session or global mode, via the `x-cache-ttl` sentinel header:

```jsonc
"variants": [
  { "id": "high",   "settings": { "reasoningEffort": "high" } },
  { "id": "high-1h", "settings": { "reasoningEffort": "high" }, "headers": { "x-cache-ttl": "1h" } }
]
```

The plugin reads the header before the request goes out, applies that TTL, and strips the header. The [example configs](docs/SUPPORTED_PROVIDERS.md#endpoints) are full provider configs with `-1h` variants; the Anthropic one covers four Claude models.

### Proxies and other provider ids

Requests to the `anthropic` provider are rewritten automatically. If you reach Claude through a proxy registered under another provider id, the plugin recognises it by the request: `POST …/messages` is the Anthropic wire, and `POST …/chat/completions` is the OpenAI wire (see [Supported providers and endpoints](docs/SUPPORTED_PROVIDERS.md)). To force a TTL for one model, add the `x-cache-ttl` header to a model variant as above. Keepalive and the sidebar work with any provider on either wire, since they only need the cache usage in the response.

## Keepalive

Keepalive sends a hidden request shortly before a session's cache expires. The request reads the cached prefix, which restarts the TTL. A ping costs roughly one cache read of the session's context, far less than the cold rewrite you pay once the cache is gone.

The ping is a transient request that uses the session's context. Nothing is added to the conversation history, and the model is told to reply `OK` without using tools. It reuses the exact conversation bytes of the session's last agent request, so it hits the cache even when other plugins rewrite the history. Those bytes stay in memory and are never written to disk.

On a 5m cache the ping goes out 4 minutes after the last request; on a 1h cache, 50 minutes after it. `hybrid` follows the 5m schedule, because its message tail is cached for 5 minutes. A ping is itself a request, so it restarts the clock and the next ping is scheduled the same way. Any real request on the session (your prompt, a tool-loop request, compaction) cancels the pending ping and resets the ping count to 0.

After `maxPings` pings (default 5) in one idle stretch, keepalive stops and the cache expires. Failed pings count towards the limit. A ping is never sent after the cache would have expired; a failed ping is retried after 30 seconds, but only if it can still land before the original expiry.

A ping that reads at least 90% of the context from cache is a hit. If it reads less, it's a miss, and keepalive stops for that session until the next real request, so a provider that doesn't reuse the cache can't turn into a stream of paid pings.

Keepalive skips:

- subagent (child) sessions
- sessions waiting on a tool call, such as a running subagent or a long build; they are pinged again once the next request has gone out
- sessions whose context is below `minContextTokens` (default 50,000)
- sessions with keepalive turned off
- sessions where no cache activity has been seen, such as sessions on models without prompt caching

All eligible top-level sessions are kept warm at once, not only the one in view. Timers live in memory and are not restored when OpenCode restarts.

**Detected TTL.** The schedule uses the TTL the provider actually granted, read from the cache-write breakdown in the response usage. Some providers (for example Claude Code-backed ones) grant 1h regardless of the mode requested. If a response has both 5m and 1h writes, the shorter one wins. Reads don't change the TTL. When the provider gives no breakdown, the requested mode is used. The sidebar labels the source as `detected` or `requested`.

> **Pings cost tokens.** Each one is a real provider request that reads the whole context from cache. Keepalive saves money when you come back after a long gap and stay within the ping limit; it costs money for sessions you never return to.

> **Don't combine this with OpenCode's built-in `warming: true`.** Both would ping the same session, so you would pay for double the pings. Use one or the other.

## Settings

Plugin options set the defaults. They live in the plugin entry in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "@noppu-labs/opencode-cache-manager",
      "options": {
        "defaultMode": "1h",
        "keepalive": {
          "enabled": true,           // default true
          "maxPings": 5,             // default 5
          "minContextTokens": 50000  // default 50000
        },
        "openaiCompatible": true,    // default true
        "explicitCacheModels": ["opus", "!gpt"]
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `defaultMode` | `"5m"` | TTL mode when nothing else is set |
| `keepalive.enabled` | `true` | Whether keepalive runs |
| `keepalive.maxPings` | `5` | Pings per idle stretch |
| `keepalive.minContextTokens` | `50000` | Smallest context worth pinging |
| `openaiCompatible` | `true` | Handle OpenAI Chat Completions requests. `false` leaves them untouched, except that a model variant's `x-cache-ttl` header is still applied and stripped |
| `explicitCacheModels` | `[]` | Patterns that decide which models are managed as Claude (explicit cache) |

`explicitCacheModels` entries are matched against `<providerID>/<modelID>`, in order, and the first match wins:

- `"opus"` is a case-insensitive substring match.
- `"/^my-proxy\\/(opus|sonnet)/i"` is a regex: `/body/flags`.
- A leading `!` marks matching models as never managed: `"!gpt"` keeps every model with `gpt` in its name out of TTL rewriting, injection and keepalive.

Entries that are empty or aren't valid regexes are ignored. Patterns win over the built-in name check and over what the plugin has learned from responses. Patterns only apply to OpenAI Chat Completions requests. These two options aren't in the picker and have no typed command; they're read at startup.

The effective value of each setting is the first one set, in this order:

1. the session's override (`/cache-manager` typed argument, or the picker's Session section)
2. the global value stored from the picker's Global section
3. the plugin option (`defaultMode` or `keepalive.*`)
4. the built-in default

A global value stored from the picker overrides the plugin option for the same setting, so changing `defaultMode` in `opencode.jsonc` has no effect once the picker has stored a global value for that setting.

Changes take effect immediately. Turning keepalive off cancels the pending ping, and lowering `pings` to or below the pings already used ends the run. A TTL mode change is picked up by the next request.

The `x-cache-ttl` model-variant header (see [Per-model override](#per-model-override)) still wins over the session mode for the requests it is on.

## Sidebar

Inside a session, the sidebar shows a Cache section. It ticks once a second from timestamps the server sends, so countdowns stay live without server traffic.

```
Cache
• status      warm
  cached      92% · 141k / 153k
  expires     14:52 (52m)
  ttl         1h (detected)
  next ping   14:42 (42m)
  pings       2/5 ✓ hit
```

- `status` is `warm` with a green bullet, amber once the pings are used up, and `expired` with a red bullet once the cache has expired (then `expired 12m ago` replaces the `expires` row).
- `expires` is the clock time and time left until the cache expires.
- `ttl` is the TTL being scheduled and where it came from (`detected` or `requested`). Before the first response, including right after a restart, the section reads `waiting for first response`.
- `cached` describes the latest primary turn: the share of its prompt that was read from cache, then the tokens read / the prompt total, such as `92% · 14.8k / 16.1k`. Pings, titles and other one-off requests don't change it. It shows for every session with cache usage, Claude or not, once a response has arrived.
- `next ping` is when the next ping goes out. It reads `none` once the limit is reached.
- `pings 2/5` counts pings used in this idle stretch, followed by the last result: `✓ hit`, `✗ miss` or `✗ failed`. No result is shown before the first ping.
- When keepalive isn't running, a `keepalive` row says why: `off · 31k < 50k` (context below the minimum), `off · disabled`, `waiting · session busy` (waiting on a tool call), or `stopped · last ping missed`.

Every other state the section can show:

<p align="center">
  <img src="docs/images/sidebar-states.svg" alt="Ten captioned Cache sections: before the first response; a 5m cache with the first ping pending; a ping that failed and retries in 30s; pings used up with next ping none; last ping missed with keepalive stopped; waiting on a tool call; context below the minimum (off · 31k < 50k); keepalive turned off; a provider-managed cache with cached 87% · 14k / 16k and keepalive n/a · implicit cache; and an expired cache (expired 12m ago)" width="520">
</p>

For a model with an implicit cache (anything that isn't Claude, see [Supported providers and endpoints](docs/SUPPORTED_PROVIDERS.md)) there's no TTL or expiry to show, so the section is the `cached` row and a keepalive row:

```
Cache
  cached      92% · 14.8k / 16.1k
  keepalive   n/a · implicit cache
```

The section is hidden for subagent sessions and for sessions with no cache activity.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the local setup, the checks CI runs and how releases are cut.
