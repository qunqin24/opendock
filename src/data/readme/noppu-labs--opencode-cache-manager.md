# opencode-cache-manager

An [OpenCode](https://opencode.ai) plugin that manages the Anthropic prompt cache from inside the TUI. It lets you pick the cache TTL (the standard 5-minute cache, the 1-hour extended cache, or a hybrid of the two) per session, and it can keep an idle session's cache warm with small hidden pings so it doesn't expire while you are away.

OpenCode marks cache breakpoints automatically (tools, system prompt, the last message) but always sends the default `ttl: "5m"`. There is no config knob for it. This plugin rewrites the outgoing request after OpenCode's own cache policy runs, so the TTL can be changed per session without forking the provider package.

When a session sits idle past its TTL, the next prompt has to write the whole context into the cache again at 1.25x (5m) or 2x (1h) the base input price, instead of reading it at about 0.1x. Keepalive avoids that by sending a ping shortly before the cache would expire.

Published to npm under two names with identical contents:

- `@noppu-labs/opencode-cache-manager`
- `opencode-cache-manager`

## The three modes

| Mode | Tools + system | Messages | Write cost |
| --- | --- | --- | --- |
| `5m` (default) | 5m ephemeral | 5m ephemeral | 1.25x base input |
| `1h` | 1h ephemeral | 1h ephemeral | 2x base input |
| `hybrid` | 1h ephemeral | 5m ephemeral | mixed |

Reads cost about 0.1x base input in every mode. `hybrid` exists because Anthropic requires 1-hour breakpoints to come before any 5-minute ones in the request: putting the long TTL on the stable prefix (tools + system) and keeping the rolling message tail on 5m keeps the cheap write cost for the part of the context that changes every turn.

Requests in `1h` or `hybrid` mode also get the `anthropic-beta: extended-cache-ttl-2025-04-11` header merged in.

## Install

Add the package to the `plugins` array in `~/.config/opencode/opencode.jsonc`. OpenCode installs it automatically at startup (no manual npm install):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@noppu-labs/opencode-cache-manager@^0.2.0"
    // or: "opencode-cache-manager@^0.2.0" -- same package, unscoped name
  ]
}
```

### Local checkout instead

If you prefer running from a clone (or while hacking on it), symlink the repo's `src/` directory into the plugins directory. OpenCode resolves `server.ts` / `tui.ts` / `rpc.ts` from the directory itself, so the link has to point at `src/`, not the repo root:

```sh
git clone https://github.com/noppu-labs/opencode-cache-manager.git
ln -s "$(pwd)/opencode-cache-manager/src" ~/.config/opencode/plugins/anthropic-cache-ttl
```

A local checkout loads `src/ui/sidebar.tsx` directly, so no build is needed; `bun run build` is only for packaging.

Do not keep both the npm spec and a local copy installed at the same time, or the plugin loads twice.

## Usage

Run `/cache-manager` in the TUI. The command also appears in the palette as "Cache Manager".

With no argument it opens a picker with two sections:

```
Session                       (only shown inside a session)
  TTL mode          1h · global
  Keepalive         on · global
  Pings per idle    3
  Min context       50k · global
  Reset session to global
Global
  TTL mode          1h
  Keepalive         on
  Pings per idle    5
  Min context       50k
```

Session rows that show `· global` inherit the global value; a row without it has a session override. Picking a row opens a list of values; the numeric settings also offer "Custom…" for a typed value.

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

Typed arguments need an open session. Global settings are changed from the picker's Global section or in the plugin options (see [Settings](#settings)).

Session overrides and global settings persist in plugin storage across restarts.

The server side registers the same command, so explicit arguments also work headless; the reply is posted as a synthetic message instead of a toast. With no argument the server-side command toggles the session's TTL mode between `5m` and `1h`.

### Per-model override

Model variants can force a TTL regardless of the session or global mode, via the `x-cache-ttl` sentinel header:

```jsonc
"variants": [
  { "id": "high",   "settings": { "reasoningEffort": "high" } },
  { "id": "high-1h", "settings": { "reasoningEffort": "high" }, "headers": { "x-cache-ttl": "1h" } }
]
```

The plugin reads the header before the request goes out, applies that TTL, and strips the header. `opencode.jsonc` at this repo's root is a full sample provider config with a complete set of `-1h` variants for four Claude models.

## Keepalive

Keepalive sends a hidden request shortly before a session's cache expires. The request reads the cached prefix, which restarts the TTL. A ping costs roughly a cache read of the session's context, which is much less than the cold re-write you pay when the cache has expired.

- **Hidden.** The ping is a transient request that uses the session's context. Nothing is added to the conversation history, and the model is told to reply `OK` without using tools.
- **Schedule.** The ping goes out 4 minutes after the last request on a 5m cache, and 50 minutes after it on a 1h cache. `hybrid` follows the 5m schedule, because its message tail is cached for 5 minutes. A ping is itself a request, so it restarts the clock and the next ping is scheduled the same way.
- **Idle stretches.** Any real request on the session (your prompt, a tool-loop request, compaction) cancels the pending ping and resets the ping count to 0.
- **Limit.** After `maxPings` pings (default 5) in one idle stretch, keepalive stops and the cache expires. Failed pings count towards the limit.
- **Never late.** A ping is never sent after the cache would have expired. A failed ping is retried after 30 seconds, but only if it can still land before the original expiry.
- **Hit or miss.** A ping that reads at least 90% of the context from cache is a hit. If it reads less, it is a miss: keepalive stops for that session until the next real request, so a provider that doesn't reuse the cache can't turn into a stream of paid pings.

Keepalive skips:

- subagent (child) sessions
- sessions waiting on a tool call, such as a running subagent or a long build; they are pinged again once the next request has gone out
- sessions whose context is below `minContextTokens` (default 50,000)
- sessions with keepalive turned off
- sessions where no cache activity has been seen, such as sessions on non-Anthropic models

All eligible top-level sessions are kept warm at once, not only the one in view. Timers live in memory and are not restored when OpenCode restarts.

**Detected TTL.** The schedule uses the TTL the provider actually granted, read from the cache-write breakdown in the response usage. Some providers (for example Claude Code-backed ones) grant 1h regardless of the mode requested. If a response has both 5m and 1h writes, the shorter one wins. Reads don't change the TTL. When the provider gives no breakdown, the requested mode is used. The sidebar labels the source as `detected` or `requested`.

**Cache hits for pings.** A ping reuses the exact conversation bytes of the session's last agent request, so it hits the cache even when other plugins rewrite the history. Those bytes are kept in memory only, never written to disk.

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
        }
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
  expires     14:52 (52m)
  ttl         1h (detected)
  next ping   14:42 (42m)
  pings       2/5 ✓ hit
```

- `status` is `warm` with a green bullet, amber once the pings are used up, and `expired` with a red bullet once the cache has expired (then `expired 12m ago` replaces the `expires` row).
- `expires` is the clock time and time left until the cache expires.
- `ttl` is the TTL being scheduled and where it came from (`detected` or `requested`). Before the first response, including right after a restart, the section reads `waiting for first response`.
- `next ping` is when the next ping goes out. It reads `none` once the limit is reached.
- `pings 2/5` counts pings used in this idle stretch, followed by the last result: `✓ hit`, `✗ miss` or `✗ failed`. No result is shown before the first ping.
- When keepalive isn't running, a `keepalive` row says why: `off · 31k < 50k` (context below the minimum), `off · disabled`, `waiting · session busy` (waiting on a tool call), or `stopped · last ping missed`.

The section is hidden for subagent sessions and for sessions with no cache activity.

## Upgrading from 0.1.x

Two changes break existing habits:

1. **`/cache-ttl` is now `/cache-manager`.** The palette entry is "Cache Manager" and the old command name is gone, with no alias.
2. **Typed commands change only the current session.** `/cache-ttl 1h` used to set the global mode; `/cache-manager 1h` sets the mode for the session you are in. To change the global default, use the picker's Global section. A global mode stored by 0.1.x is kept and takes precedence over `defaultMode`, so editing `defaultMode` alone will not change it; set it from the picker's Global section instead. There is nothing else to migrate.

## Development

```sh
bun install
bun test        # logic, keepalive engine, RPC, TUI command paths, package tarball
bun run typecheck
```

Layout:

```
src/
├── server.ts      # server entry: wires the command, HTTP hooks and RPC handlers
├── tui.ts         # TUI entry: palette + slash command, sidebar
├── rpc.ts         # the RPC contract (settings, keepalive snapshot, events)
├── config/        # settings shape, defaults, option parsing, layer merging
├── constants/     # Anthropic header values, keepalive timings
├── models/        # shared types (TTL modes, usage, keepalive snapshot)
├── controllers/   # /cache-manager command and RPC handlers
├── middleware/    # http.request / http.response hooks
├── services/      # TTL rewrite, keepalive engine, ping alignment, usage parsing, settings store
├── ui/            # picker, typed command, sidebar
└── utils/         # small shared helpers
tests/             # mirrors src/
docs/              # design notes from the original build
```

The suite includes a package smoke test: it runs `npm pack`, then replays the exact entrypoint resolution OpenCode performs for a configured npm plugin (`Bun.resolveSync("<name>/server" | "<name>/tui" | "<name>/rpc")` against the extracted tarball) and checks the shipped files are byte-identical to the tested sources, including the compiled sidebar matching a fresh build of the shipped source.

Releases are cut by pushing a `v*` tag; the release workflow tests, packs, publishes both npm names via OIDC trusted publishing (no npm token is stored), and opens a GitHub Release.

## License

MIT -- see [LICENSE](LICENSE).