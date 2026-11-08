# opencode-openrouter-optimizer

[![npm](https://img.shields.io/npm/v/opencode-openrouter-optimizer.svg)](https://www.npmjs.com/package/opencode-openrouter-optimizer)
[![CI](https://github.com/raphvallee/opencode-openrouter-optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/raphvallee/opencode-openrouter-optimizer/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/opencode-openrouter-optimizer.svg)](./LICENSE)

An OpenCode v2 plugin (Bun + TypeScript) that keeps OpenRouter routing cheap. It ranks
OpenRouter providers by expected cost and injects a per-request provider blacklist into
each routed request, so you always land on one of the cheapest providers that actually
works.

## What it does

- Tracks every OpenRouter model your sessions use.
- Per model, fetches per-provider prices and endpoint health from OpenRouter, ranks the
  providers, and caches the result in memory (with a sqlite-backed snapshot for restarts).
- Keeps the cheapest providers routable and blacklists the rest by injecting
  `provider.ignore` (plus `provider.sort: "price"`) into each request.
- A model served by exactly one provider bypasses all of that: no filter runs, the
  Tool Call Error Rate probe is never fetched, and the request goes out completely
  unmodified (no `provider` block at all). The ranking is still recorded so the
  pass-through is stable across restarts; blacklisting that provider in `extraIgnore`
  is the one case where the bypass does not apply.
- Merges real usage data from OpenRouter Activity (when you provide a management key)
  and OpenCode's own stats, so ranking reflects how _you_ actually use each model.
- Fails open: a request it cannot route goes out unmodified. When the session is attached,
  the failure is surfaced as a `Routing failure` message in the transcript and an error
  toast in the TUI (once per session/model/reason per process); when it is not, a one-line
  warning is printed to the console instead. A routing failure is never silent.

## Requirements

- OpenCode v2 (the plugin uses the v2 plugin API).
- Bun. The plugin reads its state from `bun:sqlite`, and OpenCode itself runs on Bun.

## Install

The plugin is published on npm as `opencode-openrouter-optimizer`. Install it with the
OpenCode CLI:

```sh
opencode plugin add opencode-openrouter-optimizer
```

That installs the package and adds it to your OpenCode configuration. The result is
equivalent to adding the package name to `opencode.jsonc` yourself:

```jsonc title="opencode.jsonc"
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-openrouter-optimizer"],
}
```

Restart OpenCode afterwards. That is it. The defaults work out of the box: the plugin ranks
providers by cost, keeps the 3 cheapest that pass its quality filters, and blocks the rest.

You can also install it manually with any package manager, for example:

```sh
npm install opencode-openrouter-optimizer
```

## Configuration

Optionally, but recommended: export an OpenRouter **management** key (Settings >
Management Keys on openrouter.ai, not an inference key) so ranking can use 30 days of your
real account activity:

```sh
export OPENROUTER_MANAGEMENT_KEY=sk-mgmt-...
```

Without it, ranking uses OpenCode-side usage and a fallback profile until real data
accumulates.

You normally never need to set any option, the defaults are sane. Common tweaks:

```jsonc title="opencode.jsonc"
{
  "plugins": [
    {
      "package": "opencode-openrouter-optimizer",
      "options": {
        "topN": 3, // how many cheapest providers stay routable
        "keepAtLeastN": 1, // rescue floor; 0 disables
        "debug": true, // verbose logging while you tune
        "noTUI": false, // false = show error toasts for routing failures in the TUI
        "noGUI": false, // false = show error toasts for routing failures on desktop/web
        "extraIgnore": [], // provider slugs to always blacklist, e.g. "chutes"
      },
    },
  ],
}
```

### Full reference

| Option                                                            | Default                     | Meaning                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttlHours`                                                        | `6`                         | Prices/refresh staleness window                                                                                                                                                                                        |
| `topN`                                                            | `3`                         | Cheapest providers allowed through (the `keepAtLeastN` floor raises this cap when it is higher)                                                                                                                        |
| `keepAtLeastN`                                                    | `1`                         | Floor on the providers that stay routable: when the filters starve the routing, the providers that fail least hard are kept instead of letting the request go out unrouted; `0` disables the fallback                  |
| `minContextLength`                                                | `64000`                     | Endpoint context filter                                                                                                                                                                                                |
| `minMaxCompletionTokens`                                          | `8000`                      | Endpoint output-cap filter (3072-token style providers are excluded)                                                                                                                                                   |
| `minUptimePercent`                                                | `90`                        | Endpoint uptime filter                                                                                                                                                                                                 |
| `maxToolCallErrorRate`                                            | `1`                         | Provider Tool Call Error Rate cap in percent; providers above it are filtered out and blacklisted. `100` disables                                                                                                      |
| `requireToolSupport`                                              | `true`                      | Require `tools`+`tool_choice` params                                                                                                                                                                                   |
| `injectSort`                                                      | `true`                      | Add `provider.sort: "price"`                                                                                                                                                                                           |
| `noTUI`                                                           | `false`                     | Disable the TUI part (no routing-failure toasts in the terminal); server routing is unaffected                                                                                                                         |
| `noGUI`                                                           | `false`                     | Disable the GUI part (no routing-failure toasts in desktop app windows / web tabs); server routing is unaffected                                                                                                       |
| `rankingWaitMs`                                                   | `15000`                     | Max time a first request waits for its initial ranking; `0` disables waiting (pass through immediately)                                                                                                                |
| `fallbackAvgInput` / `fallbackAvgOutput` / `fallbackCacheHitRate` | `20000` / `800` / `0.2`     | Fallback profile until stats exist                                                                                                                                                                                     |
| `preferFreeProviders`                                             | `true`                      | $0 providers ("free mode") always stay routable; paid providers get blacklisted; the rescue floor also prefers free providers when none pass the filters                                                               |
| `extraIgnore`                                                     | `[]`                        | Provider slugs always blacklisted                                                                                                                                                                                      |
| `managementKeyEnv`                                                | `OPENROUTER_MANAGEMENT_KEY` | Env var name for the Activity key                                                                                                                                                                                      |
| `statsCommand`                                                    | `opencode`                  | CLI used for `stats --json` (background only; executed with your user's privileges, with an allowlisted environment)                                                                                                   |
| `statsDays`                                                       | `30`                        | Stats window, aligned with the Activity 30-day aggregate                                                                                                                                                               |
| `statsCacheMinutes`                                               | `10`                        | Stats snapshot cache; concurrent refreshes share one snapshot                                                                                                                                                          |
| `dbPath`                                                          | global OpenCode data dir    | sqlite file override (tests); foreign sqlite files are refused, never modified                                                                                                                                         |
| `debug`                                                           | `false`                     | Verbose logging                                                                                                                                                                                                        |
| `debugBlacklistReasons`                                           | `false`                     | With `debug`, also log why every blacklisted provider was blocked, with the threshold each check enforces, the provider's own value that missed it, and providers ordered from the closest miss to the hardest failure |

Two options are test hooks, not things you would set in `opencode.jsonc`: `statsRun`
(a function injected in code to replace the stats CLI runner) and `dbPath` (a sqlite
path override, used by tests).

Configuration is strict. Unknown option names and invalid values abort plugin startup
with a message naming the option and the expected type or range. Check the exact spelling
in the table above, for example `topn` is rejected with a suggestion to use `topN`, and
`injectSort: 0` is rejected because booleans must be `true` or `false`. This is deliberate:
silently falling back to a default would change routing without telling you.

## How routing works

For every OpenRouter model, the plugin filters endpoints by quality (context window,
completion cap, uptime, tool-call support and error rate), ranks the survivors by
expected cost, and lets only the cheapest few through. Four behaviors matter to know:

- **Single-provider bypass**: when OpenRouter lists exactly one provider for a model,
  no filter runs, the tool-call error rate probe is not fetched, and the request goes
  out completely unmodified (no `provider` block at all). The ranking is still recorded
  so the pass-through behaves the same after a restart. The bypass is skipped only when
  that provider is named in `extraIgnore`.
- **Cheapest-first routing**: the `topN` cheapest survivors (default 3) stay routable
  and `provider.sort: "price"` tells OpenRouter to prefer the cheapest of those.
- **Free mode**: when any surviving provider serves the model at $0, every free provider
  stays routable (the top-3 cap does not apply to them) and all paid providers are
  blacklisted. Free status is judged at your workload's context length, so a tier that
  prices long contexts does not sneak in.
- **The rescue floor**: when a model has more than one provider and the quality filters
  would starve the routing (e.g. all fail context/uptime checks), the `keepAtLeastN`
  floor keeps the least-bad providers instead of sending the request unrouted. `0`
  disables the floor, the default `1` guarantees at least one provider stands.

The first request for a new model waits (up to `rankingWaitMs`, default 15s) for its
ranking, so the session starts on the provider it will keep using and does not pay a
cache-write charge twice. Refreshes run in the background and apply to the next request.

## Seeing routing failures

A request the plugin cannot route is sent unfiltered, which can cost real money. The
plugin refuses to let that happen silently: it writes a `Routing failure` message into the
session transcript naming the model and the reason (no ranking available, no endpoint
passed the filters and none could be kept by the `keepAtLeastN` floor, non-JSON body,
routing error), once per session/model/reason.

The package also ships client parts that raise an error toast for each of those messages,
so the failure is visible even when you are not reading the transcript, and they need no
extra configuration: one `plugins` entry loads every part of the package. The OpenCode
TUI host resolves the `./tui` subpath export of the loaded plugin automatically and runs
it in the TUI process, where `@opentui/*` is already provided as peer dependencies.
OpenCode Desktop resolves the `./gui-experimental` export the same way and runs it in
every desktop app window (desktop app and web tabs alike), where `solid-js` is provided.
There is no `tui` or `gui` key in `opencode.jsonc`; if you ever want only the TUI part
(no server routing), reference the subpath directly, e.g.
`"plugins": ["opencode-openrouter-optimizer/tui"]` in the TUI's `cli.json`.

The `noTUI` option disables the TUI part instead: set it to `true` and the TUI part
registers nothing, so no toasts are raised while the server routing keeps running.
`noGUI` does the same for the desktop/web part; both are separate switches, so you can
for example keep toasts only in the terminal with `"noGUI": true`.

## Cost model

```
Rate      = BaseRate * (1 - d)              d = pricing.discount from the endpoints API
readRate  = parsed input_cache_read ?? prompt   (unparseable means "no cache")
writeRate = parsed input_cache_write ?? 0       (absent is 0; unparseable is unknown pricing)
perRequest  = T_in * (h*readRate + (1-h)*(inputRate + writeRate)) + T_out * outputRate
total       = perRequest * numRequests
```

`T_in`, `T_out`, `h`, `numRequests` are merged from OpenCode usage (all providers,
because OpenCode request shapes do not depend on the provider) and OpenRouter Activity
rows (all clients using the OpenRouter account), treated as equals.

**Context-tiered pricing**: some endpoints charge more above a prompt-token threshold
(recent OpenAI models, for example). OpenRouter reports those tiers in
`pricing.overrides`; the plugin picks the tier matching the workload's average input
size, so a long-context session is billed at the long-context rate, not the base rate.

**The rescue floor in detail**: a rescued provider stands as a whole (every alias of it
goes back on the route), so a provider with any dead, unpriceable or tool-less alias is
never rescued, that broken alias could get the traffic. In free mode only an all-free
provider can be rescued. Rescued providers are named in a warning, so a relaxed filter
is never silent.

How the blacklist is built from that cost, in one paragraph: each OpenRouter model has
a single price point; its providers are ranked by the expected cost above (a cheap
provider with a 3072-token output cap is excluded for workloads that write more than
that). Endpoints that fail quality filters (context, completion cap, uptime, tool-call
error rate) are excluded regardless of price, with one caveat: an endpoint with an
unparseable cache-write price is blacklisted rather than billing the cache write as $0,
and an unparseable cache-read price is treated as "no cache" (cached input billed at the
prompt rate). The ranking keeps the `topN` cheapest survivors; the `keepAtLeastN` floor
rescues the least-bad failures when nothing else stands, ordered by how badly each
provider failed (magnitude-weighted: context and tool-call error rate weigh most, the
completion cap least).

## Storage

The DB lives next to OpenCode's own storage (`~/.local/share/opencode`, honoring
`XDG_DATA_HOME`) as `openrouter-optimizer.db`; every OpenCode instance and project
feeds the same stats.

## Package layout

The published package exposes three parts. The server part is compiled to ESM
JavaScript with type declarations, the TUI part likewise, and the GUI part is compiled
to a single prebuilt CommonJS bundle (desktop app windows cannot load a second chunk):

| Export                                           | Part   | Runs in                  |
| ------------------------------------------------ | ------ | ------------------------ |
| `opencode-openrouter-optimizer`                  | server | the OpenCode server      |
| `opencode-openrouter-optimizer/tui`              | TUI    | the OpenCode TUI         |
| `opencode-openrouter-optimizer/gui-experimental` | GUI    | OpenCode Desktop windows |

## Development

```sh
bun install        # installs dependencies and builds dist/
bun test           # unit tests: pricing formula, ranking, stats merge, db round-trip
bun run typecheck
bun run lint
bun run fmt:check
bun run build      # compiles src/ to dist/ (JavaScript, .d.ts, source maps) and bundles src/gui.tsx into dist/gui-experimental.cjs with the @opencode/plugin/gui vite preset
bun run verify     # format check, lint, typecheck and tests, the way CI runs them
```

A local clone can be loaded by OpenCode by path, the same way as the published package:

```jsonc title="opencode.jsonc"
{
  "plugins": [
    {
      "package": "/path/to/opencode-openrouter-optimizer",
      "options": { "debug": true },
    },
  ],
}
```

The package entry points point at `dist/`, so run `bun run build` (or `bun install`, which
builds it) before loading a clone by path.

### Inspecting the state

```sh
bun run inspect
```

prints fetch/rank state (last fetch, survivors, blacklist size). OpenCode-side token
usage now comes straight from OpenCode's own `stats --json` (no plugin-side copy).

To preview exactly what the plugin's local stats side sees:

```sh
bun run scripts/stats-probe.ts
```

Optional live network check (no OpenCode needed):

```sh
bun run selfcheck [vendor/model]
```

## Publishing

The package is published from this repository. A release on GitHub triggers the
`Publish` workflow, which verifies the tree, builds it and publishes the tarball to npm
with provenance. To publish by hand:

```sh
bun run verify     # the same checks CI runs
npm publish --access public
```

`prepublishOnly` runs the verification and `prepack` builds `dist/` before the tarball is
written, so a published package always contains a fresh build and never contains tests,
development scripts or local configuration. `npm pack --dry-run` shows the exact file
list that would be published.

To check an install the way OpenCode loads it, install the tarball in a scratch project
and run the install check:

```sh
npm pack
mkdir /tmp/check && cd /tmp/check && npm init -y
npm install /path/to/opencode-openrouter-optimizer-0.3.0.tgz solid-js
cp /path/to/repo/scripts/check-install.mjs .
bun check-install.mjs
```

`solid-js` is a peer dependency that OpenCode provides at runtime. The check loads
both parts and fails when either one is missing or has no plugin id.

The package name on npm is `opencode-openrouter-optimizer`. The version in `package.json`
is the published version, and `CHANGELOG.md` records what changed in it.
