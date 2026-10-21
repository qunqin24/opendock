# opencode-pillbox-statusline

A config-driven footer statusline for [OpenCode V2](https://opencode.ai/v2/docs/).
The footer is a row of pills: project, Git, agent and model, elapsed time,
subagents, context, cost, model tier, and provider quota. Every pill is a node
with its own settings, and all colors come from the active OpenCode theme.

Developed against OpenCode 2.0.29 and its plugin API.

## Table of Contents

- [Install](#install)
- [Configuration](#configuration)
- [Diagnostics](#diagnostics)
- [Data sources and privacy](#data-sources-and-privacy)
- [Development](#development)
- [Related projects](#related-projects)
- [License](#license)

## Install

Install [Pillbox from npm](https://www.npmjs.com/package/opencode-pillbox-statusline)
by adding the pinned package to your OpenCode configuration below. OpenCode
installs it automatically. For local development, use [a checkout](#from-a-checkout).

OpenCode passes `opencode.jsonc` options only to a plugin's server half, so
pillbox is registered twice: once in `opencode.jsonc` for the server half, which
fetches quota, and once in `cli.json` with the options for the terminal half.
Pin the same exact version in both.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-pillbox-statusline@0.1.0", "options": { "tiers": false } }
  ]
}
```

The server half's only option is `tiers`; see
[Data sources and privacy](#data-sources-and-privacy) before turning it on.

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "-opencode.prompt.footer",
    { "package": "opencode-pillbox-statusline@0.1.0", "options": {} }
  ]
}
```

Pillbox replaces the `prompt.footer.status` slot and adds to
`home.footer.status`. When two plugins replace the same slot, the one enabled
last wins, so disable any other footer plugin with a `-<plugin id>` entry in
the same `plugins` list. `-opencode.prompt.footer` also removes OpenCode's
command-palette hint.

### From a checkout

Use the absolute path of the checkout's `src` directory in place of the package
spec in both files, and run `npm install` in the checkout first. OpenCode looks
for the `index` and `tui` entry points in the directory you register, and the
terminal reloads plugins when their files change.

## Configuration

Options are keyed by pill id, so an override names only what changes. Lists
replace rather than merge. Built-in defaults apply first, then the preset, then
your options. A mistake drops only its own entry and shows up as an error; the
rest of the footer still renders.

```jsonc
{
  "package": "opencode-pillbox-statusline",
  "options": {
    "$schema": "https://raw.githubusercontent.com/crag-h4k/opencode-pillbox-statusline/main/schema.json",
    "preset": "default",
    "pills": {
      "cost": { "enabled": false },
      "git": { "order": 15, "maxWidth": 24, "dirtyAccent": ["hue.yellow", "feedback.warning"] }
    }
  }
}
```

[`schema.json`](schema.json) describes the terminal options object for editors
and agents. See [Configuration](docs/config.md) for schema association, complete
defaults, validation behavior, and source settings, and [Pills](docs/pills.md)
for each pill's sizes, visibility rules, and specific options.

| Key | Purpose |
| --- | --- |
| `preset` | `default` or `minimal` (project, Git, context, and provider quota) |
| `icons` | `nerd`, `nerd-bmp` (no glyphs above U+FFFF), `unicode`, or `ascii` |
| `style` | `surface` (pill background), `caps` (`round`, `angled`, `square`, or `flat`; a style the icon set cannot draw falls back to `flat`), `gap` |
| `layout` | `reserve` (columns to leave empty after the session footer's pills; 0 by default, since the footer measures its own slot) and `hysteresis` |
| `sources` | `usage.refresh` and `tiers.refresh`: seconds between quota and model-category refreshes |
| `pills.<id>` | `enabled`, `when`, `group`, `order`, `priority`, `attach`, `size`, `minSize`, `minColumns`, `maxWidth`, `icon`, `accent`, `value`, plus the pill's own settings |

Pills: `hint`, `project`, `git`, `spinner`, `identity`, `elapsed`, `subagents`,
`sidequest` (off by default), `context`, `cost`, `tier`, and `provider`.

### Colors

Colors are tokens resolved against the active OpenCode theme, so pillbox has no
palette of its own. A setting can list several tokens; the first opaque color
wins.

| Token | Resolves to |
| --- | --- |
| `text.base`, `text.muted` | Theme text colors |
| `feedback.error`, `.warning`, `.success`, `.info` | Theme feedback colors |
| `hue.<name>` or `hue.<name>.<step>` | A hue scale; no step means 200 in dark mode and 300 in light |
| `categorical.<n>` | A categorical theme color |
| `agent` | The active agent's configured color |
| Any other dot path | For example `diff.background.context` |
| `#rrggbb` | A fixed color, for themes without a match |

Themes converted from the V1 format name their hues by angle, so `hue.yellow`
may be missing or another color. The defaults use only `text.*`, `feedback.*`,
`hue.accent`, `hue.interactive`, and `agent`, which every theme defines.

### Layout

Each pill starts at its preferred size. While the footer is too wide, the
lowest-priority pill that can still shrink steps down one size (full, compact,
icon, hidden). Ties go to the pill with the higher `order`. A pill with
`attach` hides together with that pill, and `minColumns` hides a pill below a
terminal width. A pill only grows back once `hysteresis` spare columns are free.

## Diagnostics

Run `/pillbox` or choose **Pillbox diagnostics** in the command palette. The
dialog has four sections: actual layout widths and hide reasons, sanitized
usage and tiers source states, resolved options and errors, and a glyph width
check. Use 1-4 to switch sections, arrows or Page Up/Down to scroll, and Escape
to close. No default keybinding is installed.

Layout uses the displayed footer's fit, including hysteresis, rather than a
second estimate. The glyph check shows code points and cell-width rulers for
the chosen icon set and custom overrides; compare the rulers in your terminal
to find missing or overlapping glyphs. See the
[diagnostics reference](docs/config.md#diagnostics) for state and hide-reason
definitions.

## Data sources and privacy

The server half reads your provider logins through OpenCode's integration API
and returns quota figures and source status to the terminal half: never tokens, account
ids, or raw responses. Every request has a 10-second timeout and refuses
redirects. Each provider is queried at most once a minute.

| Source | Host and endpoint | When |
| --- | --- | --- |
| GitHub Copilot quota | `api.github.com` (or your GitHub Enterprise API host) `/copilot_internal/user` | A `github-copilot` login exists |
| Codex quota | `chatgpt.com/backend-api/wham/usage` | OpenAI is connected with ChatGPT OAuth and the token has not expired |
| Claude quota | `api.anthropic.com/api/oauth/usage` | Anthropic is connected with OAuth |
| Gateway quota | Local file `OPENCODE_PROVIDER_USAGE_FILE`, or `~/.cache/opencode/provider-usage/usage.json` | The file exists |
| Copilot model categories | Your account's `*.githubcopilot.com/models` (Enterprise: `copilot-api.<your host>`) | Only with `tiers: true` |

All of these endpoints are undocumented and can change without notice. The
pills show "unavailable" or disappear rather than display stale quota figures,
which are dropped after five minutes. Model categories keep their last good
map for the same account; diagnostics mark it stale after the six-hour cache
expires.

When the server option `tiers` is `true`, pillbox calls GitHub Copilot's
undocumented `/models` endpoint with your Copilot token and identifies as the
VS Code Copilot Chat integration (`Copilot-Integration-Id: vscode-chat`),
because that endpoint only answers editor clients. This may conflict with
GitHub's terms for Copilot. Leave it off unless you accept that. Without it, the
tier pill bands models by their catalog output price.

A gateway file is read only if it is a regular file of 64 KiB or less. It lists
`providers` keyed by provider id, each with `updatedAt` (epoch milliseconds) and
`windows` of `{ "period": "5h" | "week", "usedPercent": 0-100 }`. Entries for
`github-copilot`, `openai`, and `anthropic` are ignored because pillbox queries
those directly.

The quota RPC is local to your OpenCode server, but any client or plugin that
can call it learns which of these providers you are logged in to.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

The tests need Node 26.4 or newer: the render tests draw real frames with
OpenTUI, whose Node build uses `node:ffi`. The test script enables experimental
FFI explicitly and selects the test files by glob.

`npm run build` compiles `src/tui.tsx` and `src/diagnostics.tsx` into `dist/`
(ignored by Git). OpenCode compiles Solid JSX only for files outside
`node_modules`, so an installed package that ships the TSX paints its footer once
and never updates it: the spinner stays on one frame and late quota or cost
figures never appear. The package therefore exports the compiled `dist/tui.js`.
`npm pack` and `npm publish` build first.

`npm run verify-pack` packs the package the way `npm publish` does, unpacks the
tarball, and checks that `exports["./tui"]` names compiled JavaScript, that the
compiled files contain no JSX or automatic JSX runtime, that the entry imports
`effect` from `@opentui/solid`, and that every relative import resolves inside
the tarball. It runs as a hook on every commit that touches the sources and in the
publish job before the release is staged, so a tarball that would freeze the footer
never reaches npm.

Linting and the other checks run through [prek](https://prek.j178.dev/), locally on
every commit and in CI. The type check and the tests are hooks too, so run
`npm install` first.

```sh
uv tool install prek==0.5.4
prek install --overwrite
prek run --all-files
```

| Hook | Checks |
| --- | --- |
| gitleaks | Secrets in staged content |
| pre-commit-hooks | Whitespace, end of file, YAML and JSON syntax, merge markers, large files |
| actionlint | GitHub Actions workflows |
| markdownlint-cli2 | Markdown, configured in `.markdownlint.yaml` |
| biome-ci | TypeScript and JavaScript lint rules, configured in `biome.jsonc`; read-only, with the formatter off |
| typecheck, test | `tsc --noEmit` and the `node:test` suites |
| schema | `schema.json` matches the options schema; run `npm run schema` to regenerate it |

CI runs the same hooks from `.github/workflows/ci.yaml`, which calls the reusable
`.github/workflows/prek.yaml`. On `main`, the same workflow runs Release Please
and stages releases on npm; see [RELEASING.md](RELEASING.md). Commit messages
follow [Conventional Commits](https://www.conventionalcommits.org/), because
Release Please builds the version and changelog from them.

The source lives in `src/`; everything at the top level is configuration, docs,
or tooling. A checkout loads from `src/`, which holds the `index`, `tui`, and
`rpc` entry points OpenCode looks for; the npm package maps `./tui` to the
compiled `dist/tui.js` and the other entry points to the same files in `src/`
through `package.json` exports.

```text
opencode-pillbox-statusline/
  src/
    index.ts            Server half: registers the pillbox.usage and pillbox.tiers RPCs
    tui.tsx             Terminal half: builds the data snapshot, measures, draws both footers
    diagnostics.tsx     Scrollable /pillbox dialog with layout, sources, options, and glyph sections
    diagnostics.mjs     Pure diagnostic reports and glyph samples; reads the displayed fit
    rpc.ts              RPC contracts shared by both halves
    quota.mjs           Quota parsing, normalization, and staleness shared by both halves
    config/             Options schema, defaults and presets, and the resolver
    pills/              One module per pill: defaults, own settings, and render
    render/             Bar model, priority fit, theme tokens, icons, widths, formatting
    server/             Quota and Copilot model-category sources
  test/                 node:test suites, OpenTUI render checks, real theme fixtures
  scripts/build.mjs     Compiles tui.tsx and diagnostics.tsx into dist/ for the npm package
  scripts/verify-pack.mjs  Packs the package and checks the tarball ships the compiled terminal half
  scripts/schema.mjs    Writes schema.json; --check fails when it is stale
  dist/                 Generated by npm run build; not committed, shipped in the package
  schema.json           JSON Schema for the terminal half's options
  docs/config.md        Options, schema setup, source states, and diagnostics reference
  docs/pills.md         Pill defaults, supported sizes, visibility, and specific settings
  RELEASING.md          How versions reach npm
```

## Related projects

- [opencode-sidequest](https://github.com/crag-h4k/opencode-sidequest) runs
  dependency graphs of sub-agent tasks with a live side panel. Pillbox's optional
  `sidequest` pill shows run progress; it is off by default.
- [dotfiles](https://github.com/crag-h4k/dotfiles) manages a selective macOS and
  Debian workstation with chezmoi, shared terminal palettes, and OpenCode tooling.

Pillbox works independently of both projects. You can use it with your own
OpenCode configuration.

## License

MIT. See [LICENSE](LICENSE). `server/copilot.mjs` adapts code from
opencode-copilot-statusline; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
