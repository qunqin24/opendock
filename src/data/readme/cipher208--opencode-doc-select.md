# @cipher208/opencode-doc-select

> Your agent re-reads whole files because you cannot hand it a fragment.
> Drag across the lines you mean in a tmux pane, release, and the agent gets
> exactly those lines — no copy-paste, no re-reading, no guessing.

[![CI](https://github.com/Cipher208/opencode-doc-select/actions/workflows/ci.yml/badge.svg)](https://github.com/Cipher208/opencode-doc-select/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.json)

```
agent: doc_open("src/server.ts")
  → pane, raw text with line numbers

user: drags over lines 40–46, releases

agent: doc_selection()
  → {"file":"src/server.ts","startLine":40,"endLine":46,"chars":214,"text":"..."}
```

## Quick Start

Install it, then add one line to `~/.config/opencode/opencode.json`:

```json
{ "plugins": ["@cipher208/opencode-doc-select"] }
```

The key is `plugins` (plural) on OpenCode **v2**. v1 used `plugin` (singular);
that key is deprecated in v2 and ignored, so a v1-style entry loads nothing.

Restart OpenCode, ask the agent to open a file, drag over what you mean, release.
Requires `tmux` and `bun` on `PATH`.

## Features

- **Exact fragments.** Line range and text, not the file. Character count included.
- **Line numbers in the pane**, so a selection reads as a citation.
- **Shell-safe paths.** A filename containing `;`, `$` or a backtick is quoted
  before it reaches tmux — see [SECURITY.md](SECURITY.md).
- **No hardcoded paths.** State follows `XDG_STATE_HOME`, with a `$HOME` fallback.
- **Both plugin APIs documented.** v2 needs `Plugin.define` + `ctx.tool.transform`;
  v1 needed a function returning a hooks object. The wrong shape fails silently,
  so the README shows both and how to tell them apart.

## Writing a plugin like this

Two contracts that are not in the OpenCode documentation, both learned the hard way:

- A plugin's export must be a **function** returning the hooks object. A bare object
  fails with `Plugin export is not a function` and the plugin is dropped silently.
- An **empty log proves nothing**. A hook gated on a size threshold logs nothing when
  output is small, so "loaded fine", "never loaded" and "loaded but never triggered"
  look identical.

## Install

```bash
opencode plugin @cipher208/opencode-doc-select
```

Add `-g` to install into the global config instead of the current project. To do
it by hand, add it to `plugins` in `~/.config/opencode/opencode.json`:

```json
{ "plugins": ["@cipher208/opencode-doc-select"] }
```

`plugins` (plural) is the v2 key; v1's singular `plugin` is deprecated and
ignored by v2, so an old entry silently loads nothing.

Restart OpenCode afterwards — plugins load at startup. On v2 a restart means the
background server process, not just the terminal client: a module already loaded
in the old shape stays cached (Bun caches by realpath).

> The package is published from GitHub Actions through npm's trusted publishing
> (OIDC), so there is no npm token in this repository. See
> [CONTRIBUTING](CONTRIBUTING.md#releasing).

### Manual install

Copy all five modules from `src/` into `~/.config/opencode/plugins/`:

```
plugin.ts  doc-select-cli.ts  doc-select-core.ts  paths.ts  shell.ts
```

The plugin locates its CLI relative to its own file, so they must sit together and
nothing needs configuring.

## Requirements

- `tmux` on `PATH`, and the agent process running inside it (`$TMUX` set)
- `bun` on `PATH` — OpenCode already runs on it, and the pane script is launched
  with `bun run`

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `doc_open` | `path` | `pane` id and resolved path, or an error |
| `doc_selection` | — | `file`, `startLine`, `endLine`, `text`, `chars`, `at` |

`doc_selection` returns `{"success": false, "error": "выделений ещё не было"}`
until the user has actually selected something.

## In the pane

| Key | Action |
|---|---|
| drag | select |
| `PgUp` / `PgDn` | page scroll |
| arrows | line scroll |
| `q`, `Esc`, `Ctrl-C` | quit |

The selection is highlighted in reverse video. The status bar shows the current
line range and the total line count.

## Paths

State lives in `${XDG_STATE_HOME:-~/.local/state}/opencode/doc-select.json`.
Nothing is hardcoded to a specific home directory. If neither `$HOME` nor the XDG
variables are set, `doc_open` fails with an explicit error instead of writing
somewhere unexpected.

## Writing a plugin like this: two contracts that are not in the docs

**1. The export shape is version-specific — and a wrong one fails silently.**

OpenCode **v2** (2.x) wants a definition object built by `Plugin.define`:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "doc-select",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({ name: "doc_open", description: "...", input: { /* JSON Schema */ }, execute })
    })
  },
})
```

OpenCode **v1** (1.x, up to 1.19.5) wanted a *function* that returned the hooks
object instead:

```ts
// v1 only — does not run on v2
export const DocSelect = async () => ({ tool: { doc_open, doc_selection } })
export default DocSelect
```

Getting it wrong is silent. The plugin is dropped and every tool it was supposed
to provide simply never appears; the only trace is one line in
`~/.local/share/opencode/log/opencode.log`:

```
# v1 binary, function-shaped export missing
level=ERROR message="failed to load plugin" error="Plugin export is not a function"

# v2 binary, function-shaped export (the v1 form)
level=WARN message="failed to load plugin"
  cause="Plugin must export a default definition with an id and an effect or setup function.
         (cause: SchemaError(Expected object at [\"default\"]))"
```

`opencode plugin list` is the fastest check: a plugin that failed to load shows
`-` in the `ID` column. A plugin that loaded shows its `id`.

Note that neighbouring plugins in the same directory may use different export
shapes, so "the other one works" is not evidence that yours will.

**2. An empty log does not mean the plugin is fine.**

A hook that only fires above a size threshold produces no log entry when the
output is small. "No log" can mean "loaded fine" or "never loaded" or "loaded but
never triggered". Check for the export-shape error line explicitly, and test with
an input that actually crosses the threshold.

**3. On v2, a ported plugin stays invisible until the server process restarts.**

Bun caches ES modules by realpath and ignores the reload query string, so a file
whose realpath was already loaded in the v1 shape stays pinned in a long-lived
server. `opencode reload` does not clear it. Verify a port in a fresh process
(`opencode run --standalone`) or restart the service; `plugin list` in the old
process will keep reporting `-` even though the code is correct.

## Limitations

- Mouse events only. No keyboard selection.
- The mouse wheel is parsed and ignored; there is no wheel scrolling yet.
- ANSI-styled source is shown raw, so escape sequences appear as literal text.
- The selection is whatever the pane rendered; text below the visible window is
  not selectable until scrolled to.
- `doc_selection` returns the last selection only. There is no history.

## Development

```bash
bun install
bun test        # 27 tests: SGR parsing, selection extraction, viewport, path resolution
bun run typecheck
```

Tests import the real modules. An earlier version of a sibling hook project had
tests that re-declared the hook's functions as copies — the hook could be deleted
entirely and the suite stayed green. Do not do that.

## License

MIT