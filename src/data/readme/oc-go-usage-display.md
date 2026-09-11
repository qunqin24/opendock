# oc-go-usage-display

[![npm version](https://img.shields.io/npm/v/oc-go-usage-display.svg)](https://www.npmjs.com/package/oc-go-usage-display)

OpenCode Go subscription usage plugin (dual target):

- **server** (`src/index.ts`): `go_usage` tool (manual query: `Go 5h … | 7d … | 30d …`).
- **tui** (`src/tui.tsx`): `Go Usage` sidebar block (muted `5h`/`7d`/`30d` rows) + `session_prompt_right` statusline.

![Go Usage sidebar and statusline showing 5h, 7d, and 30d subscription usage](docs/screenshot.png)

## Install (npm)

```sh
npm install oc-go-usage-display
npx oc-go-usage-display-init
```

Or one-shot without installing:

```sh
npx -y oc-go-usage-display@latest oc-go-usage-display-init
```

This links `src/*` into `~/.config/opencode/plugins/*` and registers the
`opencode.jsonc` + `tui.json` entries. Restart opencode afterwards.
No secrets are touched. Requires Node >= 22.

## Installation scope

| Scope | Command | Writes to | Notes |
| ----- | ------- | --------- | ----- |
| Global | `npx oc-go-usage-display-init` (or `bunx oc-go-usage-display-init`) | `~/.config/opencode/plugins/*` + `opencode.jsonc` + `tui.json` | Restart opencode afterwards |
| Project | `npx oc-go-usage-display-init --scope project` (or manual: `.opencode/plugins/*` + `opencode.json`/`tui.json` in repo) | Repo-local `.opencode/` + `opencode.json`/`tui.json` | Restart opencode afterwards |
| Bun | `bunx oc-go-usage-display-init` + `bunx oc-go-usage-display-show` | Same as global (`~/.config/opencode/…`) | `show` prints effective config (secrets redacted) |

Project-scope manual fallback: copy `src/index.ts` → `.opencode/plugins/oc-go-usage-display.ts`
and `src/tui.tsx` → `.opencode/plugins/oc-go-usage-display.tsx`, then register the
`opencode.json` (server) + `tui.json` (TUI) entries from the manual section below.

## Install (manual plugin entries)

If you prefer to wire the plugin by hand (e.g. npm / OpenDock managed
plugins), add the package to your config and restart opencode:

```jsonc
// opencode.jsonc — server target (go_usage tool)
{
  "plugin": ["oc-go-usage-display"]
}
```

```jsonc
// tui.json — TUI target (Go Usage sidebar + statusline)
{
  "plugin": [["oc-go-usage-display", { "sidebar": true, "statusline": true }]]
}
```

The `oc-plugin: ["server", "tui"]` manifest auto-discovers both targets
from the published package (`dist/`). Set `OPENCODE_GO_API_KEY` (Bearer for
`GET https://opencode.ai/zen/go/v1/usage`) or sign in via the `opencode-go`
provider so `auth.json` supplies the key.

## Install (local repo, easy update)

```sh
./install.sh
```

This symlinks `src/*` into `~/.config/opencode/plugins/*` and registers the
`opencode.jsonc` + `tui.json` entries. Edits in this repo apply after an
opencode restart. No secrets are touched.

## Commands

```sh
node ./bin/oc-go-usage-display-init.js     # (re-)install
node ./bin/oc-go-usage-display-show.js     # show effective config (secrets redacted)
node ./bin/oc-go-usage-display-status.js   # health check (exit 0/1)
node ./bin/oc-go-usage-display-update.js   # re-link (+ git pull when a remote exists)
node ./bin/oc-go-usage-display-remove.js   # uninstall (files + config entries; secrets untouched)
```

After installing the package, the commands are also available as
`oc-go-usage-display-init|show|status|update|remove`.

## Uninstall

```sh
npx oc-go-usage-display-remove
npm uninstall oc-go-usage-display
```

Or from a checkout: `node ./bin/oc-go-usage-display-remove.js`.
This removes the plugin files plus the `opencode.jsonc` (server) and
`tui.json` (TUI) entries (`--config-dir` / `OPENCODE_CONFIG_DIR` supported).
Secrets are never touched: env vars, `auth.json`, and
`oc-go-usage-display.json` stay in place — delete them by hand if desired.
Restart opencode afterwards.

Manual file list (global scope):

- `~/.config/opencode/plugins/oc-go-usage-display.ts`
- `~/.config/opencode/plugins/oc-go-usage-display.tsx`
- server entry (`./plugins/oc-go-usage-display.ts`) in `~/.config/opencode/opencode.jsonc`
- TUI entry (`./plugins/oc-go-usage-display.tsx`) in `~/.config/opencode/tui.json`

## Display toggles

Both surfaces default on and are independent:

```json
["./plugins/oc-go-usage-display.tsx", { "sidebar": true, "statusline": true }]
```

![Toggle via commands](docs/commands.png)

Sidebar/statusline toggles are also accessible via opencode commands (ctrl+p) as
`Go usage: toggle sidebar` / `Go usage: toggle statusline`
(`opencode-go-usage-display.toggle-sidebar` / `opencode-go-usage-display.toggle-statusline`),
in addition to the `tui.json` `sidebar` / `statusline` booleans.

`OPENCODE_GO_SIDEBAR` / `OPENCODE_GO_STATUSLINE` env vars override when the
toggles are absent. Restart opencode after changing them.

## Build

```sh
npm install
npm run build   # tsc -> dist/
npm run check   # typecheck only
```

## Troubleshooting

### Pre-rename files removed in 1.0.x

Pre-rename `opencode-go-usage.*` shims were removed in 1.0.x. The installer and
plugin now use only `oc-go-usage-display.*` plugin files, config entries, and
the `oc-go-usage-display.json` file config. Delete any leftover
`opencode-go-usage.*` files by hand if they remain from an older install.
