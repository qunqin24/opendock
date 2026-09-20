# novaSpace

A configurable card-based replacement for OpenCode's terminal sidebar.

The product/display name is **novaSpace**. OpenCode plugin IDs use the
lowercase `novaspace.*` namespace, and the publishable npm package name is
`opencode-novaspace` because npm package names are lowercase.

novaSpace is an independent community project. It is not affiliated with or
endorsed by Microsoft or the OpenCode project.

## Cards

The framework ships two generic cards, active by default on a fresh install:

- **Profile & setup** — pinned local/GitHub profile and setup inventory with a
  compact customization hub.
- **Session info** — pinned context tokens, context usage, cost, and
  workspace/branch, using the native OpenCode sidebar data.

This checkout also carries four **personal** cards that are not part of the
framework and are opt-in through plugin options: Working Set (Git status),
Subagents (activity), Memory (OptMem status), and GitHub Copilot (usage). They
live in their own folders under `src/cards/` and are wired in
`src/cards/registry.tsx`; a fresh install does not show them unless its
`opencode.json(c)` lists the plugin and `cli.json` lists them in its options. See
"Project structure" for how to add
your own and "Publish a framework-only build" for how to drop these.

The optional Memory card can read an existing OptMem installation. novaSpace
does not register memory tools; the independent `opencode-optmem` plugin owns
that capability.

Every card uses the same theme-derived subtle surface and hover transition.

The setup modal has a compact **Set up sync** entry, then mirrors the five layers
on the card in the same order: Skills, Instructions, Plugins, MCP, and
Subagents. Layers that share a source file are rendered together; for example,
JSON-configured Plugins, MCP, and Subagents share one **OpenCode settings**
section and one `opencode.json(c)` entry. Each section links to its detected
folder and contributing files. Lists longer than five rows use a contrasting
inset panel and scroll independently. The inner list consumes wheel input only
while the pointer is inside it, leaving the outer modal available everywhere
else. Files open through the operating system's default application.

**Set up sync** opens a separate four-step onboarding dialog. Its first step is
a read-only standardization preflight that proposes compatibility-folder moves,
flags machine-specific paths and possible literal secrets, lists local-only
exclusions, and identifies project-specific configuration that remains owned
by the project rather than the private global profile.

The setup card always starts in a usable local state from OpenCode's cached
inventory. GitHub identity lookup runs only as background enrichment. A missing
GitHub CLI, sign-in, or private profile repository is the normal unconfigured
state and reports `● Set up sync`; it never blocks local setup discovery. The
profile model also reserves `syncing`, `synced`, `pending`, and `error` states
for the planned settings synchronization feature.

## Arrange cards

- Drag the small `⠿` grip to the left of a card's title to rearrange it. A highlighted line
  previews the insertion point; order is saved only when you release the mouse.
- The whole card follows the pointer with a border and shadow, while its original
  position fades. The preview preserves the card's expanded content and styles
  at pickup without mounting another card or restarting its data requests.
- Drag over the bottom area to see **Add this card to the bottom**, then release
  to pin it as another page. An empty bottom drop area appears during a drag.
- Drag a bottom card back into the middle to unpin it. Drag onto a page dot to
  reorder bottom pages. The profile card stays fixed and has no drag controls.
- The middle scrolls automatically when you drag near its top/bottom edge.
  Press **Esc** or release outside either drop area to cancel.
- Click the centered page markers, scroll horizontally over the bottom card,
  or drag sideways across the navigation row to switch pages. The selected page
  is a short neutral pill; other pages are muted dots. Navigation stays hidden
  when there is only one page.
- **Manage settings** opens the compact setup hub and its configuration links.

Card titles and body text remain selectable, and buttons such as Refresh and
Open in Zed retain their click actions. Only the grip starts a drag.

Ordering, placement, hidden cards, and the selected page are saved through
OpenCode's plugin storage (`sidebar-layout-v1`) and survive reloads/restarts.
Plugin options supply the initial layout; the reset control restores them.
Long bottom cards scroll within a height cap so the middle area remains usable.

## Installation

novaSpace is not published to npm yet. Until then, install the plugin from a
pinned commit of this repository:

```sh
opencode plugin add 'git+https://github.com/brnbtt/opencode-novaspace.git#<commit>'
```

> **Known limitation.** Git installs are currently degraded. OpenCode's managed
> package cache runs a full install for a Git specifier, which pulls this
> package's `devDependencies` (`solid-js`, `@opentui/*`) into an isolated tree.
> The plugin then resolves its own copy of Solid instead of the host's, so the
> sidebar renders its first frame and never updates: inventory counts, the
> GitHub profile, and session context all stay frozen. Use the published npm
> package instead:
>
> ```sh
> opencode plugin add opencode-novaspace@0.1.0
> ```
>
> The npm package declares its OpenTUI and Solid peers as optional
> (`peerDependenciesMeta`) so installers do not materialize a second runtime in
> the plugin's cache directory, and imports resolve against the host.

Restart the TUI completely after installing. Reloading the service alone does
not rebuild the already-mounted sidebar.

## Configuration

novaSpace renders in the terminal, so its options are **CLI plugin options** and
belong in `cli.json`, not `opencode.json(c)`. OpenCode delivers options declared
in `opencode.json(c)` to a plugin's server half only; the TUI half receives an
empty object, so options placed there are silently ignored.

```jsonc title="~/.config/opencode/cli.json"
{
  "plugins": [
    {
      "package": "opencode-novaspace",
      "options": {
        "cards": ["setup", "working-set", "subagents", "memory", "session-info"],
        "hidden": [],
        "pins": {
          "setup": "top",
          "session-info": "bottom"
        },
        "surfaceStrength": 0.14,
        "pinnedSurfaceStrength": 0.08,
        "hoverStrength": 0.08,
        "hoverDuration": 120,
        "gap": 1
      }
    }
  ]
}
```

Keep the plugin itself listed in `opencode.json(c)`; OpenCode loads its TUI
component automatically. The `cli.json` entry only supplies options.

`surfaceStrength` blends the normal sidebar background toward the theme's
hovered-action surface, so the cards remain subtle and work in light and dark
themes.

`pinnedSurfaceStrength` gives the fixed top and bottom cards a separate,
quieter surface from cards in the scrolling middle area.

`pins` accepts `"top"`, `"bottom"`, or `false` for each card. All bottom-pinned
cards become pages in a single footer carousel, in their configured order.

`cards` lists which cards to show and in what order. The example above opts into
the four personal cards; omit it to get the framework default (`setup` plus
`session-info`). Ordering, placement, hidden cards, and the selected page are
then saved to plugin storage and take over from these initial options.

## Development and installation model

Keep plugin source, development loading, and stable installation separate:

```text
~/DEV/labs/plugins/novaspace/                 # source checkout
~/DEV/labs/plugin-hosts/novaspace/            # disposable dev workspace
└── .opencode/opencode.jsonc                  # loads the source checkout

~/.config/opencode/opencode.jsonc             # stable package plugins only
~/.config/opencode/plugins/                   # tiny profile-owned scripts only
```

- **Source checkout:** edit and test novaSpace under `DEV/labs/plugins`. Do not
  copy installed package contents into the checkout or config directory.
- **Development host:** disable the exact stable IDs, then load a tiny wrapper
  with `novaspace.dev.*` IDs that imports the checkout. This avoids package
  deduplication while keeping mutable source confined to the dev workspace.
- **Stable installation:** configure an exact npm version or complete Git commit
  in the global profile. OpenCode owns its managed package cache; do not edit it.
- **Config plugins:** reserve `~/.config/opencode/plugins/` for small personal
  scripts intentionally versioned with the profile, not cloned package repos.

Example development-host override (the relative path is resolved from this
`.opencode/opencode.jsonc` file):

```jsonc
{
  "plugins": [
    "-novaspace",
    "-novaspace.tui",
    "./plugins/novaspace-dev"
  ]
}
```

Card options for the development host go in `cli.json` like any other CLI
plugin option, keyed by the same package path.

Once published, the global profile should use a pinned stable package such as
`opencode-novaspace@0.1.0`; active feature work should never be the globally
installed copy.

## Releases

Git commit installation is the stable channel until the first npm release, but
it is a degraded one: see the limitation under "Installation". Peer
dependencies must stay optional in `peerDependenciesMeta` so a managed install
never materializes a second Solid/OpenTUI runtime beside the plugin.

Before publishing `opencode-novaspace`:

1. Verify CI, typecheck, tests, and `bun pm pack --dry-run`.
2. Configure npm 2FA and GitHub trusted publishing for this repository.
   Publish from CI: a local `npm publish` can target a corporate registry proxy.
3. Remove `private: true`, then tag the matching `vX.Y.Z` commit.
4. Publish with provenance and create release notes from the same tag.
5. Update the global OpenCode profile from the prior full Git commit to the
   exact npm version only after installation verification.

npm versions are immutable, so verify the install path with a `0.1.0-rc.N`
prerelease on the `next` dist-tag before spending the `0.1.0` version. Confirm
the managed cache no longer materializes `solid-js` or `@opentui/*` and that
inventory counts, the GitHub profile, and session context update after mount.

## Project structure

Two entry points and a two-tier layout: the top-level `src/` files are the
sidebar **framework**, and `src/cards/` holds one subfolder per **card**. Each
file has a single owner.

Entry points

- `index.ts` / `tui.tsx` (repo root) — thin re-export facades named by the
  `package.json` exports.
- `src/index.ts` — minimal package entrypoint used to load the TUI extension;
  novaSpace registers no server tools.
- `src/tui.tsx` — TUI plugin; mounts the sidebar, footer, and drag-overlay
  slots and composes cards through `RenderCard`.

Framework (`src/`)

- `types.ts` — the host `TuiContext` / `ServerContext` contract and shared data
  types (`Session`, `Theme`).
- `config.ts` — card IDs, default order and pins, and option parsing.
- `card.ts` — the card contract: `CardProps`, `CardDefinition`, and `defineCard`.
- `ui.tsx` — shared card primitives: `Card`, `CardTitle` (the drag grip),
  `CardAction`, `Divider`, and surface/scrollbar helpers.
- `layout.tsx` — persistent layout controller (order, pins, hidden, active page).
- `drag.tsx` — drag-and-drop state machine, drop-target geometry, and auto-scroll.
- `drag-overlay.tsx` — full-screen drag overlay: previews, drop hints, and Esc.
- `card-preview.tsx` — snapshots a mounted card into the floating drag copy.
- `carousel.tsx` — bottom page carousel and the page markers.
- `host.ts` — adapts the native OpenCode sidebar host layout (see below).
- `services/refresh.ts` — generic serialized, abortable refresh queue.
- `layout.ts` / `drag.ts` — stable re-export entrypoints (see the runtime note below).

Cards (`src/cards/`)

- `registry.tsx` — the active card list, `cards` lookup, and `partitionCards`
  (top/scroll/bottom). Generic and personal imports are grouped here.
- `<id>/index.tsx` — one subfolder per card, each default-exporting one
  `defineCard(...)`. Cards that need helpers keep them in the same folder:
  `setup/` (inventory, modal, profile, standardization preflight), `memory/`
  (backend, store, format, tools, types), `copilot/` (usage, store).

### Add a card

1. Create `src/cards/<id>/index.tsx` that renders with the shared `Card`
   primitives and default-exports `defineCard({ id, title, render })`.
2. Add the id to `cardIDs` (and a `defaultPins` entry) in `src/config.ts`.
3. Import it and add it to the card list in `src/cards/registry.tsx`.

`CardID` and the layout stay type-safe because they derive from `cardIDs`.

### Publish a framework-only build

The generic cards (`setup`, `session-info`) are the framework's default. To ship
without the personal cards, remove the personal block in `src/cards/registry.tsx`,
delete their `src/cards/<id>/` folders, and trim their ids from `cardIDs` /
`defaultPins` in `src/config.ts`. A consumer then adds their own cards the same
way. Because plugins are referenced from `opencode.json(c)` by path or package,
this repo is the checkout you own and edit; installed npm packages live in
OpenCode's managed location and are not hand-edited.

## Host integration

`src/host.ts` adapts the sidebar wrapper observed in OpenCode 2.0.7: it bounds
the native outer scroll area and removes the title/footer's extra padding so
only the middle cards scroll. The public slot API has no host layout controls;
the adapter checks the renderable hierarchy before applying changes and restores
the host styles on disposal. Bottom padding is removed so the footer reaches the
sidebar's lower edge. Recheck this adapter when upgrading OpenCode.
It uses structural checks because the live host and plugins can load separate
OpenTUI modules, making `instanceof ScrollBoxRenderable` fail across that boundary.

Reactive state lives in `drag.tsx` and `layout.tsx`; their `.ts` files are stable
re-export entrypoints. OpenCode 2.0.7 rewrites Solid imports through its JSX loader,
but ordinary `.ts` helpers resolve the local Solid package. Signals from that
second runtime do not notify the rendered components. Keep reactive helpers on
the `.tsx` path, even when they contain no JSX. Same-runtime headless tests alone
do not catch this; the fix was checked with a cancelled gesture in the live TUI.

`card-preview.tsx` copies public box/text paint properties from the mounted card.
JSX text comes from `textNode.gatherWithInheritedStyle`; `.chunks` only describes
manually assigned content. The preview uses `style.content` to preserve StyledText
because the renderer's direct JSX `content` prop stringifies objects.

Scrollbars use a one-cell track with native semantic theme colors. The setup
modal sizes itself from terminal dimensions and applies dialog settings after
`show()`, which resets the host's dialog size and centering.

## Development

```sh
bun install
bun test
bun run typecheck
```

## License

MIT © Bruno Bett. See [LICENSE](LICENSE).
