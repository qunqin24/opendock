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

Cards use theme-derived subtle surfaces and rounded borders, with a scrollbar
gutter. The main profile card stays visually still on hover. Its sync status is
a colored dot; hovering the dot reveals its label and otherwise leaves room for
the full account name. The small `✧` mark identifies **novaSpace settings**.

The settings modal shows each section's file or folder with one **Open** action.
Shared configuration appears once: JSON-configured Plugins, MCP and Subagents
share **OpenCode settings** and its `opencode.json(c)` link. Individual item lists
and nested scroll areas have been removed. Files open in the operating system's
default application. A single outer scrollbar is available on short terminals.

Update status and keyboard hints stay visible. Use **Tab / Shift+Tab** to move
between actions and **Enter** to activate one. **Appearance & preferences** links
directly to `cli.json`.

### Profile sync

The sync screen has compact **Files**, **Repository** and **Sync** views. Choose
groups and connect a private GitHub repository. **Connect & sync** or **Create &
sync** prepares the profile, runs the first sync and enables automatic sync after
success. It checks once a minute while an OpenCode TUI is open. **Details** is
read-only and shows portable files and entries kept local; setup requires no
path approvals or standardization review. Errors stay near the header.
Enterprise-managed GitHub usernames with underscores are supported. Use the same repository
on another machine to restore your profile and keep the selected groups in step.
GitHub CLI (`gh auth login`) is required. Sync is bound to the account used when
connecting; switching accounts pauses transfers until you reconnect or switch back.

| Group | Included |
| --- | --- |
| OpenCode settings | Portable settings in global `opencode.json` and `opencode.jsonc`: configured default model, providers, plugins, MCP, permissions, inline agents and commands |
| Appearance & preferences | `cli.json`: theme, keybindings, terminal preferences and novaSpace plugin options; global `themes/` files |
| Skills | Global `skills/`, `~/.agents/skills/` and `~/.claude/skills/`, preserving their locations |
| Instructions | Global `AGENTS.md` |
| Agents & commands | Global `agents/` and `commands/` files |
| Local plugin files | Global `plugins/` scripts, opt-in |

Groups select their source files once, even when Plugins, MCP and Subagents share
one configuration file. Preparation happens in a separate portable copy. Live
files keep their locations, paths, comments and formatting. Preparation does not
migrate a directory layout or rewrite working settings.

For JSON/JSONC settings, top-level sections containing literal credentials,
machine-specific paths, local executables or loopback endpoints stay local.
Portable sections from that same file still sync. For example, a configured
default model can sync while a local plugin checkout and private MCP credentials
stay exactly as configured on each machine. Incoming portable settings are merged
back into the original document without replacing its local-only sections.
Comments remain on their original machine; the repository holds a canonical
portable JSON representation.

Linked sources and non-config files with detected machine-specific content or
credentials are kept local automatically. If a skill or plugin bundle has a
local-only dependency, the entire bundle stays local rather than exporting an
incomplete copy. **Details** reports these exclusions without requesting action.
Changing the selected groups preserves the connection's automatic/paused setting.

Session history, the current session's model choice, sign-ins and OAuth tokens,
environment variables, service settings, caches, project configuration, installed
package caches and saved card drag positions stay local. Initial card layout
options in `cli.json` can sync; drag positions in OpenCode's plugin storage cannot.
Referenced files outside the listed roots are not copied.
Package declarations travel with settings; OpenCode installs the packages on the
destination machine. Source checkouts such as the novaSpace development repo do
not need to exist on a consumer machine.

Sync merges edits to different files and independent top-level configuration
sections. Competing changes to the same portable setting or non-config file
pause for a genuine conflict; setup never guesses which existing version to replace.
Choose the local or repository versions explicitly in the sync screen.
Remote revisions remain in GitHub history. Replaced and deleted local files are
backed up under `~/.local/state/novaspace/backups/` before being applied. Restore
writes are staged before any live replacement; a staging failure leaves existing
files untouched. Failed applies roll back completed writes when possible, while
preserving edits made concurrently by the user. Deletions
propagate only after a file has been synced; existing files on a newly connected
machine cause a conflict if their contents differ from the repository.

The GitHub repository stores a versioned `.novaspace/profile.json` snapshot with
base64 file contents (an `x:` prefix marks executable scripts). File ownership
and other permission bits stay local. Base64 is **not encryption**; repository access controls
protect the profile. Detected credentials and machine-specific values are kept
local, without changing their original values to environment references. This
detection is best-effort. Existing `{env:NAME}` references are portable; sign in
independently on each machine. Symlinks and hard-linked files stay local; `.env`,
`.git`, `node_modules` and backup directories are excluded. Profiles are limited
to roughly 500 KB of file content and 1,000 files.

State, selection, automation preference and backups are local to each machine,
under `$XDG_STATE_HOME/novaspace` (default `~/.local/state/novaspace`). Global
configuration follows `$XDG_CONFIG_HOME/opencode`. Multiple TUI windows share a
cross-process lease; concurrent remote writes use GitHub's revision check and retry
on the next sync. Offline failures keep local files and the last successful baseline.
Restart OpenCode after restoring plugins or server settings that require a reload.

Profile format **2** requires novaSpace **0.3.0 or later**. The new client can read
older snapshots and prepares them automatically. Older clients stop before
applying format 2, protecting their existing configuration. Update novaSpace on
each syncing machine.

The setup card always starts in a usable local state from OpenCode's cached
inventory. GitHub identity lookup runs only as background enrichment. A missing
GitHub CLI, sign-in, or private profile repository is the normal unconfigured
state and reports a muted dot with **Set up sync** on hover; it never blocks local setup discovery. The
profile reports `syncing`, `synced`, `pending`, `paused`, `conflict`, and `error`
from the local sync state.

The signed-in account can change at any time, so the card re-reads it when the
setup hub opens and whenever `gh` rewrites its configuration. It watches that
file's change stamp rather than polling the GitHub API, so an idle sidebar
spends no API calls and starts no processes.

The hub also reports novaSpace's own version and, for a managed package
install, offers an update when OpenCode reports one. See "Packaging".

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
- **✧ novaSpace settings** opens the compact setup hub and its configuration links.

Card titles and body text remain selectable, and buttons such as Refresh and
Open in Zed retain their click actions. Only the grip starts a drag.

Ordering, placement, hidden cards, and the selected page are saved through
OpenCode's plugin storage (`sidebar-layout-v1`) and survive reloads/restarts.
Plugin options supply the initial layout; the reset control restores them.
Long bottom cards scroll within a height cap so the middle area remains usable.

## Installation

```sh
opencode plugin add opencode-novaspace
```

Restart the TUI completely after installing. Reloading the service alone does
not rebuild the already-mounted sidebar.

Options are **CLI plugin options** and belong in `cli.json`; see
"Configuration". The package ships compiled JavaScript rather than its `.tsx`
sources, for the reason described under "Packaging".

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
- **Stable installation:** configure `opencode-novaspace` in the global profile.
  OpenCode owns its managed package cache; do not edit it.
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

Keep the stable package entry unpinned to use the hub's update check. An explicit
`@version` stays on that version and cannot offer later releases. Active feature
work should use the development host.

## Packaging

An installed plugin always lands under `node_modules`, and that single fact
decides how this package must be built.

OpenCode shares its own Solid and OpenTUI runtime with a plugin by rewriting
the import specifiers it finds in a module's **source text**. The Solid JSX
transform that would normally produce those specifiers is skipped for anything
under `node_modules`, so a published `.tsx` module never gets rewritten. It
then fails one of two ways:

- with peers optional, nothing resolves `@opentui/solid` and the TUI half fails
  to load with `Cannot find package '@opentui/solid'`;
- with peers materialized beside the plugin, they resolve to a **second** Solid
  runtime, so the sidebar paints one frame and no reactive update ever lands —
  inventory counts stay `0`, the profile stays `Local profile`, and session
  context stays `—`.

`bun run build` (`scripts/build.ts`) compiles `src/**` ahead of time using the
same Babel pipeline `@opentui/solid` ships. The compiled modules carry literal
`@opentui/solid`, `solid-js`, and `@opentui/core` imports, which is the form
the host rewrite recognises, so an installed package binds the host's runtime
exactly like a local checkout does. `package.json` therefore publishes `dist/`
only, and peers stay optional in `peerDependenciesMeta` so no second runtime is
ever installed.

`tests/package.test.ts` guards this: the compiled output must contain literal
runtime imports, no JSX, no surviving `@jsxImportSource` pragma, and only
`.js`-suffixed relative specifiers.

Local-path development is unaffected and still loads the `.tsx` sources
directly through OpenCode's JSX loader.

## Releases

Peer dependencies must stay optional in `peerDependenciesMeta`, and the
published tarball must contain compiled `dist/` output rather than `.tsx`
sources. Both are covered by "Packaging" and enforced by the test suite.

Before publishing `opencode-novaspace`:

1. Verify CI, typecheck, tests, `bun run build`, and `bun pm pack --dry-run`.
2. Configure npm 2FA and GitHub trusted publishing for this repository.
   Publish from CI: a local `npm publish` can target a corporate registry proxy.
3. Tag the matching `vX.Y.Z` commit.
4. Publish with provenance and create release notes from the same tag.
5. Verify the managed installation and leave its package entry unpinned for
   future updates.

npm versions are immutable, so verify the install path with a `0.1.0-rc.N`
prerelease on the `next` dist-tag before spending the `0.1.0` version. Confirm
the managed cache does not materialize `solid-js` or `@opentui/*`, and that
inventory counts, the GitHub profile, and session context update after mount —
a populated count is the proof that a reactive update landed after the first
frame.

## Project structure

Two entry points and a two-tier layout: the top-level `src/` files are the
sidebar **framework**, and `src/cards/` holds one subfolder per **card**. Each
file has a single owner.

Entry points

- `index.ts` / `tui.tsx` (repo root) — thin re-export facades named by the
  `package.json` exports. Published builds expose their compiled counterparts,
  `dist/index.js` and `dist/tui.js`.
- `src/index.ts` — minimal package entrypoint used to load the TUI extension;
  novaSpace registers no server tools.
- `src/tui.tsx` — TUI plugin; mounts the sidebar, footer, and drag-overlay
  slots and composes cards through `RenderCard`.
- `scripts/build.ts` — publish-time compilation into `dist/`; see "Packaging".

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
   primitives and default-exports `defineCard({ id, title, render })`. Start the
   file with `/** @jsxImportSource @opentui/solid */`, like every other card.
2. Add the id to `cardIDs` (and a `defaultPins` entry) in `src/config.ts`.
3. Import it and add it to the card list in `src/cards/registry.tsx`.
4. List the id in your `cli.json` `cards` option, then restart the TUI
   completely — a reload does not remount an already-mounted sidebar.

`CardID` and the layout stay type-safe because they derive from `cardIDs`.

Keep reactive helpers on the `.tsx` path even when they contain no JSX; see the
runtime note under "Host integration". New files need no build step while you
develop against a local checkout, and are picked up automatically by
`bun run build` when publishing.

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
These shims matter only for local-path development; `bun run build` compiles
every module the same way, so it drops them from the published output.

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
bun run build
```

## License

MIT © Bruno Bett. See [LICENSE](LICENSE).
