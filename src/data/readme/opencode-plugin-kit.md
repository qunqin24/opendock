# opencode-plugin-kit

[![CI](https://github.com/ranjithrajv/opencode-plugin-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithrajv/opencode-plugin-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-plugin-kit)](https://www.npmjs.com/package/opencode-plugin-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Shared building blocks for [OpenCode](https://opencode.ai) plugins — the
pieces that every widget ends up reimplementing. Covers the sidebar and the
non-sidebar surfaces around it (footer/status slots, the input composer,
session panels, full-screen pages, the command palette, session tabs, and
attention notifications). Used by four production plugins with **100% test
coverage**.

## Install

Published on [npm](https://www.npmjs.com/package/opencode-plugin-kit):

```sh
npm install opencode-plugin-kit
```

> **Still a prerelease.** `latest` currently resolves to `1.0.0-alpha.8`, an
> OpenCode v2 build. The publish workflow tags every prerelease under its own
> identifier (`alpha`, `beta`, …) and leaves `latest` alone, so later alphas
> will _not_ move `latest` automatically. To track the newest build, install
> `opencode-plugin-kit@alpha`.

Plugins depending on the kit declare it in `dependencies`; the host peer
(`@opencode/plugin`) must match your OpenCode v2 runtime version (see each
plugin's README).

## Status

**v1.0.0-alpha.8** — API stabilized, ready for integration testing. Ships the
OpenCode v2 host contract across the sidebar, footer/status, composer, panel,
pages, palette, tabs, and attention; requires `@opencode/plugin` 2.0.3 or
newer.

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

New to the kit? [QUICKSTART.md](QUICKSTART.md) walks through building a plugin
from scratch, and [`examples/hello-plugin/`](examples/hello-plugin/) is a
complete, minimal plugin to copy.

## Why

Every OpenCode plugin reimplements the same patterns:

- Reading provider lists and auth.json
- Persisting UI state across TUI restarts
- Switching views with slash commands + dialogs
- Polling authenticated endpoints
- Traversing session messages defensively
- Claiming slots safely — and rendering on surfaces other than the sidebar
- Registering palette commands, pages, tabs, and attention

Kit extracts these into tested, documented primitives so plugins focus on
their unique data and rendering — whichever surface they render on.

## Modules

| Module              | Exports                                                                                                                                                                                                               | Purpose                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `providers.ts`      | `ZEN_PROVIDER`, `GO_PROVIDER`, `providerLabel()`, `availableProviders()`, `createConnectedProviders()`, `unwrap()`, `isAssistant()`, `asArray()`, `modelId()`, `providerId()`, `readAuth()`, `hasKey()`, `authKeys()` | Provider vocabulary + defensive shape readers                  |
| `rows.ts`           | `short()`, `line()`, `bar()`                                                                                                                                                                                          | Pure text formatting                                           |
| `format.ts`         | `fmt()`, `fmtCost()`, `until()`, `compactNumber()`, `formatCost()`, `formatDuration()`, `formatClock()`, `formatDelta()`, `formatPercent()`, `shortPath()`, `truncate()`                                              | Number/date/path formatting                                    |
| `theme.ts`          | `Tone`, `toneColor()`                                                                                                                                                                                                 | Semantic tone → host theme colour                              |
| `util.ts`           | `safe()`                                                                                                                                                                                                              | Throw-safe host reads                                          |
| `tokens.ts`         | `tokenBreakdown()`, `messageCost()`, `estimateTokens()`                                                                                                                                                               | Token/cost normalization for message shapes                    |
| `cache.ts`          | `createCachedStore<T>()`, `persistedCell()`                                                                                                                                                                           | Storage-backed cache with staleness tracking                   |
| `persistedState.ts` | `createPersistedState<T>()`                                                                                                                                                                                           | Reactive persisted object (memory → store → signal)            |
| `schemas.ts`        | `parseUsage()`, `parseIntegrationList()`, `connectedProviderIds()`                                                                                                                                                    | Zod schemas for untrusted boundary shapes                      |
| `viewPicker.ts`     | `createViewPicker()`                                                                                                                                                                                                  | Registry + persistence + slash command + dialog + toast        |
| `currentModel.ts`   | `resolveCurrentModel()`                                                                                                                                                                                               | Resolve active model from session messages                     |
| `cachedResource.ts` | `createCachedResource()`                                                                                                                                                                                              | Stale-while-revalidate resource                                |
| `messages.ts`       | `walkMessages()`, `sumProviderTokens()`, `cacheReadInput()`                                                                                                                                                           | Defensive message traversal                                    |
| `pollingFetcher.ts` | `createPollingFetcher()`                                                                                                                                                                                              | Throttled polling with in-flight guard                         |
| `commands.ts`       | `createToggle()`, `registerKeymapCommand()`, `registerKeymapLayer()`                                                                                                                                                  | Toggle command + keymap registration                           |
| `slot.ts`           | `claimSlot()`                                                                                                                                                                                                         | Safe UI-slot claiming                                          |
| `panel.ts`          | `createPanel()`, `PanelInput`, `PanelController`                                                                                                                                                                      | Session-panel plumbing (open/close/keymap gating)              |
| `layout.ts`         | `budgetFor()`, `compactFor()`, `columnFor()`                                                                                                                                                                          | Sidebar width/row-budget math                                  |
| `workspace.ts`      | `resolveLocation()`, `workspaceDirectory()`                                                                                                                                                                           | Workspace location resolution                                  |
| `toast.ts`          | `showToast()`                                                                                                                                                                                                         | Toast helper                                                   |
| `hostEvents.ts`     | `createHostEvents()`                                                                                                                                                                                                  | Host event subscription with polling fallback                  |
| `catalog.ts`        | `listSkillCatalog()`, `syncSkillCatalog()`, `readSkillCatalog()`, `findAgentsMd()`                                                                                                                                    | Skill catalog + AGENTS.md discovery                            |
| `jsonc.ts`          | `tolerantParse()`, `cleanJsonc()`, `addPluginSpec()`, `addPluginsKey()`, `removePluginSpec()`, `editPluginsText()`                                                                                                    | JSONC reading + comment-preserving config edits                |
| `messageIndex.ts`   | `createMessageIndex()`, `messageFingerprint()`                                                                                                                                                                        | Incremental per-context session message index                  |
| `host.ts`           | `KitContext`, `KitMessageShape`, `KitModelShape`, `KitPanel`, `KitRouter`, `KitTabs`, `KitAttention`                                                                                                                  | Structural host-contract types                                 |
| `collapsible.tsx`   | `CollapsibleSection`, `CollapsibleGroup` (subpath `opencode-plugin-kit/collapsible`)                                                                                                                                  | Collapsible sidebar sections                                   |
| `statusbar.ts`      | `createStatusbar()`, `StatusbarSlot`, `StatusbarHandle`                                                                                                                                                               | Footer/status slot claiming (`home.footer`, `prompt.footer.*`) |
| `palette.ts`        | `paletteCommand()`, `registerPaletteCommand()`, `registerPaletteGroup()`, `dynamicPaletteCommand()`                                                                                                                   | Command palette registration helpers                           |
| `router.ts`         | `createPage()`, `navigateTo()`, `currentRoute()`, `RouterHandle`                                                                                                                                                      | Plugin page routing and navigation                             |
| `attention.ts`      | `requestAttention()`, `notifyTaskComplete()`, `notifyError()`                                                                                                                                                         | Attention notifications with toast fallback                    |
| `tabs.ts`           | `createTabs()`, `TabsHandle`, `TabInfo`                                                                                                                                                                               | Session tab helpers                                            |
| `composer.ts`       | `createComposer()`, `ComposerHandle`, `ComposerInput`                                                                                                                                                                 | Composer slot helpers (`session.composer.top`)                 |

Everything is re-exported from the package root (`src/index.ts`).

### Documentation map

Each fact has one canonical home — start there, don't duplicate it elsewhere.

| Question                                   | Doc                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Which module owns which plugin surface     | [docs/SURFACES.md](docs/SURFACES.md)                                             |
| Signatures, options, return shapes         | this file (API Reference)                                                        |
| Host APIs, slot tree, endpoints, debugging | [docs/opencode2-api.md](docs/opencode2-api.md)                                   |
| Which host builds are verified             | [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)                                   |
| Build your first plugin                    | [QUICKSTART.md](QUICKSTART.md) · [examples/hello-plugin](examples/hello-plugin/) |

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

### Statusbar / Footer

Claim one of the host's footer or status slots. The render function receives the
slot's input reactively and the claim is released by the returned `cleanup`.

```ts
import { createStatusbar } from "opencode-plugin-kit"

const bar = createStatusbar(context, {
  slot: "prompt.footer.status", // or "home.footer", "prompt.footer", …
  render: (input) => <Text>{status()}</Text>,
})
bar.slot     // The claimed slot path
bar.cleanup() // Release the claim
```

Supported paths: `home.footer`, `home.footer.status`, `prompt.footer`,
`prompt.footer.status`, `prompt.footer.file`. A host that lacks the slot renders
nothing rather than throwing.

### Composer

Augment the input composer (`session.composer.top`) — hints, context previews,
model-specific prompts. The last render input is exposed for callers that need
the active session id.

```ts
import { createComposer } from "opencode-plugin-kit"

const composer = createComposer(context, {
  render: (input) => <Hint sessionID={input?.sessionID} />,
})
composer.input()   // Last render input, if any
composer.cleanup() // Release the claim
```

### Command Palette

Register palette commands through a keymap layer owned by a rendered `app` slot
(the only reliable way to activate them). `registerPaletteGroup` shares one layer
across a group and applies the group name to commands that omit their own.

```ts
import { registerPaletteCommand, registerPaletteGroup } from "opencode-plugin-kit"

registerPaletteCommand(context, {
  id: "usage.view",
  title: "Usage: switch view",
  group: "Usage",
  slash: { name: "usage-view", aliases: ["uv"], arguments: true },
  run: (arg) => picker.pick(arg),
})

registerPaletteGroup(context, {
  group: "Usage",
  commands: [
    { id: "usage.refresh", title: "Usage: refresh", run: () => refresh() },
    { id: "usage.reset", title: "Usage: reset counters", run: () => reset() },
  ],
})
```

`paletteCommand()` builds a single entry from a config; `dynamicPaletteCommand()`
takes a title factory so the label re-evaluates on every palette render.

### Pages (Router)

Register a full-screen plugin page and navigate to it. Returns a no-op handle on
hosts without router support.

```ts
import { createPage, navigateTo, currentRoute } from "opencode-plugin-kit"

const page = createPage(context, {
  name: "usage.settings",
  data: { tab: "general" },
  render: ({ data }) => <Settings tab={data?.tab} />,
})
page.navigate()   // Open the page
page.isActive()   // True when this page is the current route
page.current()    // Current route info, if any
page.cleanup()    // Unregister

navigateTo(context, "usage.settings") // Fire-and-forget navigation
currentRoute(context)                 // Read the current route
```

### Attention

Interrupt the user for important events with a system notification and/or sound.
Falls back to a toast when the host has no attention support, and never throws.

```ts
import { requestAttention, notifyTaskComplete, notifyError } from "opencode-plugin-kit"

await requestAttention(context, {
  title: "Build",
  message: "Compilation finished",
  notification: true, // default true
  sound: true, // default false
})
// → { ok, notified, sounded, fellBack }

await notifyTaskComplete(context, "Quota refreshed") // notification + sound
await notifyError(context, "Usage fetch failed") // notification, no sound
```

### Session Tabs

Read and control session tabs. A host without tab support yields a handle whose
methods return `false` / empty values.

```ts
import { createTabs } from "opencode-plugin-kit"

const tabs = createTabs(context)
tabs.enabled()      // Whether tabs are supported
tabs.list()         // Reactive tab list
tabs.active()       // The active tab, if any
tabs.open(id)       // Open without focusing
tabs.focus(id)      // Open and focus
tabs.move(id, idx)  // Reorder
tabs.close(id?)     // Close one (or the active tab)
tabs.isOpen(id)     // Whether a session has an open tab
```

### Panel

Claim the `session.panel` slot and drive the host's open/close/fullscreen
actions. (See `panel.ts`.) Rendering is filtered to your panel's name; the slot
is claimed immediately so a failed claim can't be delayed by later setup work.

```ts
import { createPanel } from "opencode-plugin-kit"

const { controller, cleanup } = createPanel(context, {
  name: "usage",
  render: (input) => <UsagePanel input={input} />,
})

controller.open("fullscreen") // "panel" | "fullscreen"
controller.close()
controller.toggleFullscreen()
controller.isActive()
controller.input() // Last matching render input
cleanup()
```

## Consuming Plugins

| Plugin                                                                                      | What it does                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [opencode-usage-quota-tracker](https://github.com/ranjithrajv/opencode-usage-quota-tracker) | Live provider quota + usage in sidebar footer                  |
| [opencode-model-recommender](https://github.com/ranjithrajv/opencode-model-recommender)     | Model recommendations by cache ratio, token cost, session cost |
| [opencode-skill-lister](https://github.com/ranjithrajv/opencode-skill-lister)               | Skills list in sidebar                                         |
| [opencode-plugin-browser](https://github.com/ranjithrajv/opencode-plugin-browser)           | Plugin manager in sidebar                                      |

Install from the registry:

```sh
npm install opencode-plugin-kit
```

`latest` currently points at `1.0.0-alpha.8`, so a plain install gets the v2
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
- **Runtime smoke** — `tests/runtime-smoke.test.ts` imports the real host
  runtime and executes every kit factory, catching import-time and runtime
  breakage the types cannot see
- **Host-compat checker** — `npm run check:host-compat` installs each supported
  `@opencode/plugin` version into a temp dir and runs **both** checks against it,
  so drift is caught per-version instead of only on the pinned release. Results
  are published in [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) and enforced
  in [host-compat.yml](.github/workflows/host-compat.yml) plus a release gate in
  `publish.yml`.

Every surface beyond the sidebar is **optional on the host**: panel, router,
tabs, attention, and the footer/composer slots all degrade to a no-op (or a
toast fallback) when the running host doesn't provide them.

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

# Test with coverage (100% gate on lines/branches/functions/statements)
vp test --coverage

# Runtime smoke only (imports the real host, runs every factory)
npm run test:smoke

# Type + runtime host compatibility across pinned @opencode/plugin versions
npm run check:host-compat
npm run check:host-compat -- --type-only      # tripwire only
npm run check:host-compat -- --runtime-only   # runtime smoke only
npm run check:host-compat -- --write-matrix   # refresh docs/COMPATIBILITY.md
```

The coverage gate is 100% — new code without covering tests fails CI.

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

The job skips the upload when the tagged version is already on the registry
(a release published by hand, or a re-run of an older tag), so a redundant run
reports green instead of failing on a duplicate version.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — and keep
[docs/opencode2-api.md](docs/opencode2-api.md) in sync if your change adopts
a new OpenCode API surface.

Platform patterns proposed for upstreaming into the official plugin API are
tracked in [docs/UPSTREAM.md](docs/UPSTREAM.md) — absorbing a pattern
upstream and deleting it here is the project's exit goal, not a failure.

## License

MIT — see [LICENSE](LICENSE).
