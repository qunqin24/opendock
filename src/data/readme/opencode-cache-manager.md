# opencode-cache-manager

An [OpenCode](https://opencode.ai) plugin that controls the Anthropic prompt-cache TTL from inside the TUI: pick between the standard 5-minute cache, the 1-hour extended cache, or a hybrid of the two.

OpenCode marks cache breakpoints automatically (tools, system prompt, the last message) but always sends the default `ttl: "5m"`. There is no config knob for it. This plugin rewrites the outgoing request after OpenCode's own cache policy runs, so the TTL can be changed per session without forking the provider package.

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
    "@noppu-labs/opencode-cache-manager@^0.1.0"
    // or: "opencode-cache-manager@^0.1.0" -- same package, unscoped name
  ]
}
```

### Local checkout instead

If you prefer running from a clone (or while hacking on it), symlink the repo into the plugins directory. OpenCode resolves `server.ts` / `tui.ts` / `rpc.ts` from the directory:

```sh
git clone https://github.com/noppu-labs/opencode-cache-manager.git
ln -s "$(pwd)/opencode-cache-manager" ~/.config/opencode/plugins/anthropic-cache-ttl
```

Do not keep both the npm spec and a local copy installed at the same time, or the plugin loads twice.

## Usage

Run `/cache-ttl` in the TUI with no argument and a picker opens with the current mode highlighted:

```
/cache-ttl          -> picker modal (5m / 1h / hybrid)
/cache-ttl 1h       -> set 1h directly
/cache-ttl hybrid   -> set hybrid directly
/cache-ttl 5m       -> back to default
/cache-ttl status    -> toast with the current mode
```

The command also appears in the palette as "Anthropic Cache TTL". The chosen mode persists in plugin storage across restarts, and a second TUI instance sees the change through the `mode.updated` RPC event.

Explicit arguments work headless too (the server side registers the same command), with the reply posted as a synthetic message instead of a toast.

### Per-model override

Model variants can force a TTL regardless of the stored mode, via the `x-cache-ttl` sentinel header:

```jsonc
"variants": [
  { "id": "high",   "settings": { "reasoningEffort": "high" } },
  { "id": "high-1h", "settings": { "reasoningEffort": "high" }, "headers": { "x-cache-ttl": "1h" } }
]
```

The plugin reads the header before the request goes out, applies that TTL, and strips the header. `opencode.jsonc` at this repo's root is a full sample provider config with a complete set of `-1h` variants for four Claude models.

## Development

```sh
bun install
bun test        # 74 tests: logic, RPC, TUI command paths, package tarball
bun run typecheck
```

Layout:

```
server.ts    # server entry: command, http.request hook, RPC handlers, storage
tui.ts       # TUI entry: palette + slash command, picker modal, toasts
shared.ts    # pure logic, imported by both sides
rpc.ts       # the RPC contract (getMode / setMode / mode.updated)
tests/
docs/        # design notes from the original build
```

The suite includes a package smoke test: it runs `npm pack`, then replays the exact entrypoint resolution OpenCode performs for a configured npm plugin (`Bun.resolveSync("<name>/server" | "<name>/tui" | "<name>/rpc")` against the extracted tarball) and checks the shipped files are byte-identical to the tested sources.

Releases are cut by pushing a `v*` tag; the release workflow tests, packs, publishes both npm names via OIDC trusted publishing (no npm token is stored), and opens a GitHub Release.

## License

MIT -- see [LICENSE](LICENSE).