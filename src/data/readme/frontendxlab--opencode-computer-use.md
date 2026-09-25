# OpenCode Computer Use

A dual-generation OpenCode plugin that provides a Codex-style Computer Use
session.

Documentation: https://opencode-computer-use.pages.dev/

The model does not receive a pile of low-level desktop MCP tools. It receives a
small persistent JavaScript tool surface, matching the way Codex Computer Use
works through `cua_repl`:

```json
{
  "code": "var app = await cua.getApp('TextEdit'); await app.getAXState();"
}
```

The session exposes `js` and `js_reset` only. The JavaScript session persists
between calls, so app bindings and variables survive across model turns. Native
desktop calls are made by the underlying open-source `open-computer-use` runtime.

This project does not copy OpenAI's closed Codex driver or bundled service. It
uses the MIT-licensed `iFurySt/open-codex-computer-use` runtime and keeps the
Codex-style session adapter separate from the native OS implementation.

## Why this is different from `computer-use-linux`

`computer-use-linux` is an established low-level MCP server. This package does
not recreate it and does not make it the model-facing interface.

The plugin adds the missing Codex-style layer:

- one persistent JavaScript session;
- an asynchronous `cua` API;
- app bindings through `cua.getApp(...)`;
- `getAXState()`, `getScreenshot()`, and `getAXStateAndScreenshot()`;
- semantic element-first actions;
- `nodeRepl.write(...)` and `nodeRepl.emitImage(...)`;
- `js_reset` for a clean session;
- a worker boundary so a timed-out JavaScript loop cannot wedge the MCP server.

The native runtime still has OS limitations. The adapter does not pretend that
a missing accessibility tree, permission, secure desktop, or unsupported window
operation is available.

## Supported runtime targets

The optional `open-computer-use@0.3.5` package ships native runtimes for:

- `darwin-arm64`, `darwin-x64`
- `linux-arm64`, `linux-x64`
- `win32-arm64`, `win32-x64`

The current project has been exercised against the Linux runtime contract. macOS
and Windows support is provided by the upstream native packages, but live
permission and desktop validation must still be run on those operating systems.

### Validation status

- Linux x64 native discovery, read-only app listing, MCP registration, and the
  persistent JavaScript session have passed local smoke tests.
- The current Ubuntu/GNOME Wayland session exposed a Chrome pseudo-window whose
  AT-SPI tree had no actionable children. The native Linux runtime accepted
  coordinate and keyboard requests, but those synthetic events did not change
  that window. The adapter reports the native result rather than claiming that
  an unsupported input path worked.
- macOS and Windows have not been live-tested in this environment. Their
  accessibility, screen-capture, foreground, and OS permission behavior must be
  verified on those operating systems.

The Codex-style surface is portable, but the native runtime's desktop
capabilities remain OS and session dependent.

## Requirements

- Node.js 18 or newer.
- OpenCode 1.18.29 or newer for the hybrid V1 entrypoint.
- OpenCode2 V2 beta 19271 or newer for the `setup(ctx)` entrypoint.
- A signed-in graphical desktop session.
- macOS Accessibility and Screen Recording permissions.
- Linux AT-SPI and the input/capture services required by the native runtime.
- Windows UI Automation in the current interactive desktop session.

The plugin cannot control a lock screen, login screen, UAC secure desktop, or
other OS-owned consent surface. It does not bypass permissions.

## Install

The published package is `@frontendxlab/opencode-computer-use`. It registers a
local MCP server named `cua_repl` by default.

```sh
npm install @frontendxlab/opencode-computer-use
# or
pnpm install @frontendxlab/opencode-computer-use
```

The package `postinstall` step detects the installed OpenCode generation and
whether the install is local or global. It safely updates `opencode.json` or
`opencode.jsonc`, preserves comments and existing settings, and is idempotent.
When both generations are installed, it uses an existing `plugin` or `plugins`
configuration to disambiguate. If that is not possible, it makes no change and
prints both manual configuration formats.

You can run setup explicitly at any time:

```sh
npx opencode-computer-use-setup
npx opencode-computer-use-setup --local --v2
npx opencode-computer-use-setup --global --v1
```

Use `--dry-run` to inspect the action without changing files. Set
`OPENCODE_COMPUTER_USE_SKIP_SETUP=1` to disable the postinstall hook. Setup also
skips automatically when `CI=1` or `CI=true`. Restart OpenCode after a
successful setup so the plugin is loaded.

Recent pnpm releases may require explicit approval before running lifecycle
scripts from dependencies. If pnpm reports `ERR_PNPM_IGNORED_BUILDS`, approve
this package once and rerun the install:

```sh
pnpm approve-builds @frontendxlab/opencode-computer-use
pnpm install
```

If scripts are intentionally disabled, run `pnpm exec opencode-computer-use-setup` manually instead.

A local checkout can be loaded by replacing the package name with its absolute
path.

### OpenCode 1

`opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@frontendxlab/opencode-computer-use", { "backend": "auto" }]
  ]
}
```

### OpenCode2 V2

`opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@frontendxlab/opencode-computer-use",
      "options": { "backend": "auto" }
    }
  ]
}
```

If the OpenCode process cannot find Node through `PATH`, set `OPENCODE_NODE` to
an absolute Node executable before starting OpenCode. The plugin does not use
OpenCode's own executable as the MCP runtime, because that executable may be a
Bun-based OpenCode binary.

Do not configure the same package both as an explicit plugin and through
automatic plugin discovery. That loads the session twice.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `backend` | `auto` | `auto`, `native`, or `custom`. |
| `command` | none | Required for `custom`; a native MCP executable followed by argv. |
| `serverName` | `cua_repl` | MCP server name. |
| `override` | `false` | Replace an existing MCP server with the same name. |
| `safetyMode` | `full` | `full` or `read-only`; read-only blocks click, drag, key, scroll, text, value, and secondary actions. |
| `appAccess` | allow all | Optional `default`, `allow`, and `deny` rules matched against app names and IDs. |
| `timeoutMs` | `30000` | Default and maximum JavaScript evaluation timeout. |
| `disabled` | `false` | Register the server disabled. |
| `maxTextChars` | `200000` | Aggregate text budget for one tool result. |
| `maxImageBytes` | `2097152` | Aggregate image payload budget for one tool result. |
| `allowGlobalPointerFallbacks` | `false` | Explicitly allow native global pointer fallback for coordinate clicks and drags. |

For a deny-by-default desktop policy, configure the adapter explicitly:

```json
{
  "safetyMode": "read-only",
  "appAccess": {
    "default": "deny",
    "allow": ["com.apple.TextEdit", "Text"],
    "deny": ["com.apple.Safari"]
  }
}
```

App rules are exact, case-insensitive matches against app names and IDs. They
are defense in depth and do not replace macOS Accessibility and Screen Recording,
Linux AT-SPI, Windows UIA, or OpenCode approval settings. The read-only mode
also changes the MCP annotations for `js` so hosts can apply their normal
read-only approval policy.

The proxy reads corresponding `OPENCODE_COMPUTER_USE_*` environment variables
when launched directly.

For a custom native runtime, use a fixed executable and argv. Do not use shell
syntax:

```json
{
  "backend": "custom",
  "command": ["/absolute/path/to/open-computer-use", "mcp"]
}
```

The custom command must implement the native MCP operations used by `cua`:
`initialize`, `tools/list`, `tools/call`, and notifications.

## Model workflow

The `js` tool accepts:

- `code`: required JavaScript source;
- `timeout_ms`: optional timeout, capped at 300 seconds;
- `title`: optional short action title.

Typical first call:

```js
var apps = await cua.listApps({ emit: false });
var app = await cua.getApp(apps[0].id);
await app.getAXState();
```

Typical action and verification:

```js
var save = await app.click(12);
await app.getAXState();
```

The `cua` API includes:

- `cua.getState(options?)`
- `cua.listApps(options?)`
- `cua.getApp(nameOrBundleID)`
- `app.getAXState(options?)`
- `app.getScreenshot(options?)`
- `app.getAXStateAndScreenshot(options?)`
- `app.click(elementIndexOrPoint, options?)`
- `app.scroll(elementIndex, direction, pages?)`
- `app.drag([fromX, fromY], [toX, toY])`
- `app.typeText(text)`
- `app.pressKey(key)`
- `app.setValue(elementIndex, value)`
- `app.performSecondaryAction(elementIndex, action)`

Use `nodeRepl.write(value)` for text output and
`await nodeRepl.emitImage(bytesOrDataUrl)` for screenshots or other images.

## State and action rules

- Call `getAXState()` or `getAXStateAndScreenshot()` before acting on a new
  layout.
- Element indexes belong to the most recent state. Re-derive them after a
  navigation, dialog, scroll, resize, or rerender.
- Prefer `app.click(elementIndex)` and semantic actions over coordinates.
- Use coordinates only when the surface has no useful accessibility data.
- Batch deterministic actions and the following state read in one `js` call.
- Do not replay a mutating action after a timeout or transport failure. Observe
  again and make a new decision.
- `js_reset` discards JavaScript bindings but does not reset native application
  state.

## Safety

This is a high-privilege desktop-control surface. The restricted VM is a
capability guard, not a complete security sandbox. OpenCode permissions and
operating-system permissions remain the enforcement layer.

The model-facing `js` tool is marked conservatively as mutating. Keep
OpenCode approval prompts enabled for consequential actions such as sending,
deleting, purchasing, uploading, or changing permissions. Do not expose the
session to an untrusted model or run it unattended against password managers,
banking, administrator, or other high-value applications.

`allowGlobalPointerFallbacks` is off by default because it can move the real
pointer and change foreground focus. Enable it only for an explicit desktop
automation test where that system-level input is intended.

The JavaScript session runs in a restricted VM context. `require`, `process`,
`fetch`, Node built-ins, filesystem access, dynamic imports, code generation,
dynamic host objects, and arbitrary shell execution are not available through
the model-facing session. The native
`run_shell` operation is not part of the Codex-style `cua` API. Do not add an
arbitrary shell escape to the JavaScript session.

The adapter bounds persistent app bindings and output items, sends a native
cancellation notification when a request times out, and sends a best-effort
`notifications/turn-ended` message during shutdown. These are reliability and
cleanup safeguards, not a replacement for host approvals.

## Documentation WebMCP preview

The Cloudflare Pages documentation includes a progressive, read-only WebMCP
enhancement based on the current `document.modelContext.registerTool()` draft.
When a supporting browser exposes the API, agents can discover
`search_docs`, `get_install_config`, and `get_api_reference`. The page remains
fully usable without WebMCP, and no desktop-control or mutating tool is exposed
through the documentation site.

WebMCP is experimental. It requires a secure context, the `tools` Permissions
Policy, and a compatible browser or Cloudflare Browser Run lab session.

## Manual checks

Before asking an agent to act, run the native runtime's read-only checks:

```bash
open-computer-use doctor
open-computer-use list-apps
```

The first screenshot may trigger a desktop permission dialog. A screenshot,
accessibility tree, or typed value can contain sensitive data and should stay
local.

## Development

```bash
npm install
npm test
npm run lint
```

The adapter tests use a fake native MCP server and never require a real desktop.
Live desktop validation must be run separately on each supported OS.

## License and attribution

This package is MIT licensed. The Codex-style session adapter is adapted from
`iFurySt/open-codex-computer-use`, also MIT licensed. See
`THIRD_PARTY_NOTICES.md` for attribution and the native runtime's license.
