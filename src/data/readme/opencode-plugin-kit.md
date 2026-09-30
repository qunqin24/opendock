# opencode-plugin-kit

[![CI](https://github.com/ranjithrajv/opencode-plugin-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithrajv/opencode-plugin-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-plugin-kit)](https://www.npmjs.com/package/opencode-plugin-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Shared building blocks for [OpenCode](https://opencode.ai) sidebar plugins —
the pieces that every sidebar widget ends up reimplementing. Used by four
production plugins with **100% test coverage**.

## Install

Published on [npm](https://www.npmjs.com/package/opencode-plugin-kit):

```sh
npm install opencode-plugin-kit
```

> **Still a prerelease.** `latest` currently resolves to `1.0.0-alpha.7`, an
> OpenCode v2 build. The publish workflow tags every prerelease under its own
> identifier (`alpha`, `beta`, …) and leaves `latest` alone, so later alphas
> will _not_ move `latest` automatically. To track the newest build, install
> `opencode-plugin-kit@alpha`.

Plugins depending on the kit declare it in `dependencies`; the host peer
(`@opencode/plugin`) must match your OpenCode v2 runtime version (see each
plugin's README).

## Status

**v1.0.0-alpha.7** — API stabilized, ready for integration testing. Ships the
OpenCode v2 host contract; requires `@opencode/plugin` 2.0.3 or newer.

## Quick Start

```ts
import { createViewPicker, createCachedStore } from "opencode-plugin-kit"

// Persisted view picker with slash command + dialog
const picker = createViewPicker(context, {
  registry: [
    { id: "go", title: "Go", description: "Go plan usage" },
    { id: "zen", title: "Zen", description: "Zen usage" },
  ],
  storageKey: "view",
  command: {
    id: "usage.view",
    group: "Usage",
    name: "usage-view",
    title: (v) => `Usage footer: view provider (${v.title})`,
    description: "Pick which provider view the sidebar shows",
  },
  dialog: { title: "Usage view", message: "Choose the provider view" },
  toastPrefix: "Usage footer",
})
picker.registerCommand()

// Storage-backed cache (instant restore after TUI restart)
const cache = createCachedStore<Usage | null>(context, "usage", {
  initial: null,
  staleAfterMs: 120_000,
})
```

## Why

Every OpenCode sidebar plugin reimplements the same patterns:

- Reading provider lists and auth.json
- Persisting UI state across TUI restarts
- Switching views with slash commands + dialogs
- Polling authenticated endpoints
- Traversing session messages defensively

Kit extracts these into tested, documented primitives so plugins focus on
their unique data and rendering.

## Modules

| Module                  | Exports                                                                                                                                                                    | Purpose                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `providers.ts`          | `ZEN_PROVIDER`, `GO_PROVIDER`, `providerLabel()`, `availableProviders()`, `unwrap()`, `isAssistant()`, `modelId()`, `providerId()`, `readAuth()`, `hasKey()`, `authKeys()` | Provider vocabulary + defensive shape readers           |
| `rows.ts`               | `short()`, `line()`, `bar()`                                                                                                                                               | Pure text formatting                                    |
| `format.ts`             | `fmt()`, `fmtCost()`, `until()`                                                                                                                                            | Number/date formatting                                  |
| `cache.ts`              | `createCachedStore<T>()`                                                                                                                                                   | Storage-backed cache with staleness tracking            |
| `schemas.ts`            | `parseUsage()`, `parseIntegrationList()`, `connectedProviderIds()`                                                                                                         | Zod schemas for untrusted boundary shapes               |
| `viewPicker.ts`         | `createViewPicker()`                                                                                                                                                       | Registry + persistence + slash command + dialog + toast |
| `currentModel.ts`       | `resolveCurrentModel()`                                                                                                                                                    | Resolve active model from session messages              |
| `connectedProviders.ts` | `createConnectedProviders()`                                                                                                                                               | Reactive integration-list polling                       |
| `cachedResource.ts`     | `createCachedResource()`                                                                                                                                                   | Stale-while-revalidate resource                         |
| `messages.ts`           | `walkMessages()`, `sumProviderTokens()`                                                                                                                                    | Defensive message traversal                             |
| `pollingFetcher.ts`     | `createPollingFetcher()`                                                                                                                                                   | Throttled polling with in-flight guard                  |
| `sidebarSlot.ts`        | `createSessionResource()`                                                                                                                                                  | Session-reactive data resource                          |
| `commands.ts`           | `createToggle()`, `registerKeymapCommand()`                                                                                                                                | Toggle command + keymap registration                    |
| `workspace.ts`          | `resolveLocation()`, `workspaceDirectory()`                                                                                                                                | Workspace location resolution                           |
| `toast.ts`              | `showToast()`                                                                                                                                                              | Toast helper                                            |
| `host.ts`               | `KitContext`, `KitMessageShape`, `KitModelShape`                                                                                                                           | Structural host-contract types                          |

Everything is re-exported from the package root (`src/index.ts`).

## API Reference

### View Picker

```ts
import { createViewPicker } from "opencode-plugin-kit"

const picker = createViewPicker(context, {
  registry: readonly PickerOption[],  // View options
  storageKey: string,                 // Persistence key
  command: {
    id: string,                       // Command ID
    group: string,                    // Command group
    name: string,                     // Slash command name
    aliases?: string[],               // Slash aliases
    title: (current) => string,       // Dynamic title
    description: string,              // Command description
  },
  dialog: { title: string, message: string },
  toastPrefix?: string,               // Toast prefix on switch
  selectable?: (entry) => boolean,    // Gate entries (e.g. provider-key check)
  unavailableMessage?: (entry) => string,
})
picker.registerCommand()  // Call once from setup
picker.current()          // Reactive current entry
picker.currentID()        // Reactive current ID
picker.apply(entry)       // Switch without UI
picker.pick(arg?)         // Open picker or select by arg
```

### Cached Store

```ts
import { createCachedStore } from "opencode-plugin-kit"

const cache = createCachedStore<T>(context, key, {
  initial: T, // Initial value
  staleAfterMs: number, // Staleness threshold
})
cache.value // Current value (restored from storage)
cache.lastSet // Epoch ms of last set (0 = never)
cache.stale // True when staleAfterMs elapsed
cache.set(value) // Update + persist
```

### Connected Providers

```ts
import { createConnectedProviders } from "opencode-plugin-kit"

const connected = createConnectedProviders(context, {
  extra: () => ["huggingface"], // Extra providers (e.g. env-only)
  pollMs: 30_000, // Poll interval (0 = disable)
})
connected.ids() // Reactive Set of connected provider IDs
connected.has(id) // Check if provider is connected
connected.refresh() // Force immediate refresh
connected.stop() // Stop polling
```

### Polling Fetcher

```ts
import { createPollingFetcher } from "opencode-plugin-kit"

const fetcher = createPollingFetcher({
  fetch: () => Promise<T | null>,
  intervalMs: 60_000,
  throttleMs: 60_000,     // Min gap between fetches
  onResult: (value) => void,
  onError: (err) => void,
})
fetcher.refresh()   // Trigger immediate fetch
fetcher.stop()      // Stop polling
fetcher.inFlight()  // Whether a fetch is in progress
```

### Message Traversal

```ts
import { walkMessages, sumProviderTokens } from "opencode-plugin-kit"

// Fold over a session's messages defensively
const totals = walkMessages(
  context,
  sessionID,
  (message, acc) => {
    acc.tokens += message?.tokens?.input ?? 0
    return acc
  },
  { provider: "opencode", since: Date.now() - 3600_000 },
  { tokens: 0 },
)

// Convenience: sum tokens for a provider
const { input, output, cost } = sumProviderTokens(context, sessionID, "opencode")
```

### Collapsible

Imported from the `collapsible` subpath so the Solid JSX stays out of the main
entry.

```ts
import { CollapsibleSection, CollapsibleGroup } from "opencode-plugin-kit/collapsible"

// From a host component that already has the plugin context:
const { theme } = usePlugin()

CollapsibleSection({
  title: "Skills",
  count: items.length,
  threshold: 2,        // Collapse the body at or below this count
  pinned: <Note />,    // Always visible between header and body
  theme,               // Header colors; pass the host's theme
  children: <List />,
})

CollapsibleGroup({
  title: "Providers",
  count: ids.length,
  defaultCollapsed: true,
  theme,
  children: (collapsed) => (collapsed() ? <Summary /> : <List />),
})
```

`theme` is optional but **recommended**. Without it the kit falls back to
`usePlugin()`, which throws when the kit is installed from `node_modules`
(it resolves its own copy of `@opencode/plugin` / `solid-js`, so the host's
plugin context is not visible). If the context is missing the header falls back
to unthemed text rather than throwing.

## Consuming Plugins

| Plugin                                                                                      | What it does                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [opencode-usage-quota-tracker](https://github.com/ranjithrajv/opencode-usage-quota-tracker) | Live provider quota + usage in sidebar footer                  |
| [opencode-model-recommender](https://github.com/ranjithrajv/opencode-model-recommender)     | Model recommendations by cache ratio, token cost, session cost |
| [opencode-skill-lister](https://github.com/ranjithrajv/opencode-skill-lister)               | Skills list in sidebar                                         |
| [opencode-plugin-manager](https://github.com/ranjithrajv/opencode-plugin-manager)           | Plugin manager in sidebar                                      |

Install from the registry:

```sh
npm install opencode-plugin-kit
```

`latest` currently points at `1.0.0-alpha.7`, so a plain install gets the v2
kit. The publish workflow tags each prerelease under its own identifier and
leaves `latest` alone, so later alphas will not move it automatically — install
`opencode-plugin-kit@alpha` to track the newest build.

For local development, link the sibling checkout with
`"opencode-plugin-kit": "file:../opencode-plugin-kit"` in the consumer's
`package.json`, then `npm install` (or `bun install`). Note that a linked
checkout shares one module graph with the host, so the collapsible components
find the plugin context without a `theme` prop; a registry install does not.

## Compatibility

The OpenCode v2 host plugin API's types are the spec. Kit consumes the context
structurally — anything the host ships with the expected members satisfies it.

- **Floor: `@opencode/plugin` 2.0.3.** Earlier 2.x releases have no `./tui`
  subpath export, so nothing that imports `@opencode/plugin/tui` can resolve it.
  Verified by typecheck and the type-tripwire against 2.0.3, 2.0.10 and 2.0.18.
- **No runtime dependency** on `@opencode/plugin` — types only
- **Optional peer** — declared as optional so consumers share one copy
- **CI tripwire** — `host.test-d.ts` pins published host types against kit's
  contract; drift fails CI with a readable diff

## Development

```sh
# Install
vp install

# Check (format + lint + typecheck)
vp check

# Fix issues
vp check --fix

# Format
vp fmt

# Lint
vp lint

# Typecheck
vp check --typecheck

# Test
vp test

# Test with coverage
vp test --coverage
```

### Publishing

`.github/workflows/publish.yml` runs on a published GitHub release (and on
`workflow_dispatch`) and uses **npm trusted publishing**: the job carries
`id-token: write` and `npm publish` trades that OIDC identity for a
short-lived registry token. There is no `NPM_TOKEN` secret to store, rotate or
leak, which is why long-lived tokens are no longer used here — npm has started
restricting 2FA-bypass tokens for direct publishing.

One-time setup on npmjs.com, required before the first OIDC publish:

1. Package → **Settings** → **Trusted Publisher** (or Access Tokens →
   Trusted Publishing).
2. Add a GitHub Actions publisher with
   - Organization/user: `ranjithrajv`
   - Repository: `opencode-plugin-kit`
   - Workflow filename: `publish.yml`
     (npm matches on the workflow _filename_, not the ref or event.)

Until that is registered the job fails with an authentication error. The
`NPM_TOKEN` repo secret can be deleted afterwards.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — and keep
[docs/opencode2-api.md](docs/opencode2-api.md) in sync if your change adopts
a new OpenCode API surface.

Platform patterns proposed for upstreaming into the official plugin API are
tracked in [docs/UPSTREAM.md](docs/UPSTREAM.md) — absorbing a pattern
upstream and deleting it here is the project's exit goal, not a failure.

## License

MIT — see [LICENSE](LICENSE).
