# openchamber-cursor

OpenCode V2 plugin that lets OpenChamber (desktop, CLI/web, and VS Code) use a Cursor subscription on Windows, macOS, and Linux. OpenChamber does not have its own provider list: every surface runs OpenCode and reads `opencode.json` from the OpenCode config folder.

Repository: [github.com/aenemo/openchamber-cursor](https://github.com/aenemo/openchamber-cursor)

Requires Node.js 22.13 or newer on every platform.

## Install

Use **one** entry in your global OpenCode config (`~/.config/opencode/opencode.json` on macOS and Linux, `%USERPROFILE%\.config\opencode\opencode.json` on Windows). Do not also copy the plugin into the auto-loaded `plugins` folder under that config directory, or activation fails.

**From npm** (recommended; pin the version):

```sh
opencode plugin add openchamber-cursor@0.1.0
```

**From GitHub** (requires a built `dist/` in the ref you install, or a local clone with `npm run build`):

```sh
opencode plugin add github:aenemo/openchamber-cursor#v0.1.0
```

Restart OpenChamber or OpenCode after installing. Run `/connect` and choose **Cursor** (see Connect below).

## Where files live

| | Windows | macOS and Linux |
| --- | --- | --- |
| OpenCode config | `%USERPROFILE%\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` |
| Plugin cache and log | `%USERPROFILE%\.cache\openchamber-cursor\` | `~/.cache/openchamber-cursor/` (`$XDG_CACHE_HOME/openchamber-cursor/` when set) |
| SDK state | `%USERPROFILE%\.cursor\oc-sdk\<id>` | `~/.cursor/oc-sdk/<id>` |
| V8 compile cache | `%LOCALAPPDATA%\cursor-compile-cache` | `<plugin cache>/compile-cache` |
| `cursor-agent` launcher | `cursor-agent.ps1`, run through PowerShell | `cursor-agent` on `PATH`, usually a symlink into `~/.local/share/cursor-agent/versions/<ver>/` |

The plugin is pinned to `@opencode/plugin` 2.1.4, the OpenCode release bundled by current OpenChamber desktop builds. It registers a `cursor` provider through `ctx.provider.transform`.

## Backends

`CURSOR_BACKEND` selects the backend. The default is `auto`.

| Value | When it runs |
| --- | --- |
| `auto` | API key uses `@cursor/sdk`. Native OAuth uses the native backend. Otherwise `cursor-agent`. |
| `cli` | `cursor-agent --print --output-format stream-json` |
| `sdk` | `@cursor/sdk` with an API key. Needs Node.js 22.13+ (`CURSOR_ACP_NODE_BIN`). |
| `native` | Cursor account OAuth. Uses the SDK with a minted user API key, or Connect-RPC over a Node HTTP/2 bridge when `CURSOR_NATIVE_TRANSPORT=connect`. |

SDK state is stored under `~/.cursor/oc-sdk/<id>` so SQLite paths stay short on Windows. On Windows, login and `--list-models` start `cursor-agent` through its `.ps1` launcher (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File`), not the `.cmd` shim. On macOS and Linux they run the `cursor-agent` launcher directly. A chat run spawns the versioned `node` (`node.exe` on Windows) and `index.js` directly, with the prompt in a file, because the Windows `.ps1` launcher forwards every argument through PowerShell and a long prompt exceeds the command-line limit, and Linux caps a single argument near 128 KB. On macOS and Linux the launcher symlink is resolved first so the versioned runtime beside it is found. If that runtime is not installed beside the launcher, the chat run falls back to the launcher with the prompt as an argument.

Tool calls that match tools OpenCode advertised (`read`, `shell`, `glob`, `grep`, `edit`, `write`, `subagent`) are returned to OpenCode on the SDK and native backends. Cursor names map onto those tools: `bash` → `shell`, `Task` → `subagent`, `strreplace` → `edit`, `find` and `ls` → `glob`. The CLI backend stops `cursor-agent` at the first matching tool call and hands that call to OpenCode. Headless runs pass `--trust` so a new chat folder does not stop on the workspace prompt. Set `CURSOR_ACP_TRUST_WORKSPACE=false` to omit that flag.

`CURSOR_NATIVE_TRANSPORT=connect` is a fallback. It sends the OAuth access token, not the minted `crsr_` SDK key, and the request includes the model, prompt, `optimize_for` params, advertised tools, and tool results. The HTTP/2 bridge emits each Connect frame as it arrives. The default native backend uses `@cursor/sdk`.

## Request path

OpenCode talks to one loopback OpenAI-compatible proxy per process (`GET /health`, `GET /v1/models`, `POST /v1/chat/completions`). OpenChamber starts this plugin once per project. Each project registers its own auth and backends on that shared proxy; a request uses the most recently attached project, and an earlier project takes over when that one unloads.

Session-title prompts are answered locally with a short title so they do not start a Cursor run. Logs are written to `openchamber-cursor.log` in the plugin cache folder.

## Environment

| Variable | Role |
| --- | --- |
| `CURSOR_BACKEND` | `auto` (default), `cli`, `sdk`, or `native` |
| `CURSOR_API_KEY` | API key when no integration credential is connected |
| `CURSOR_AGENT_BIN` | Explicit `cursor-agent` launcher path |
| `CURSOR_ACP_NODE_BIN` | Node.js 22.13+ binary for the SDK worker |
| `CURSOR_ACP_TRUST_WORKSPACE` | Set to `false` to omit `--trust` |
| `CURSOR_ACP_SDK_STATE_ROOT` | SDK store root (default `~/.cursor/oc-sdk`) |
| `OPENCHAMBER_CURSOR_CACHE` | Cache directory (default `~/.cache/openchamber-cursor`; `CURSOR_CHAMBER_CACHE` still works) |
| `CURSOR_RIPWALK_CACHE_TTL_MS` | Workspace scan cache (default 30 minutes) |
| `NODE_COMPILE_CACHE` | V8 compile cache for the SDK worker and cursor-agent |
| `CURSOR_NATIVE_TRANSPORT` | `connect` uses the HTTP/2 bridge; otherwise native uses the SDK |
| `CURSOR_SDK_HTTP1` | Set to `1` to force HTTP/1 for the SDK agent transport |
| `CURSOR_BACKEND_URL` | Connect bridge origin (default `https://api2.cursor.sh`) |
| `CURSOR_REFRESH_URL` | Native token refresh endpoint |

## Connect

In OpenCode or OpenChamber, run `/connect` and choose **Cursor**:

- **Log in with cursor-agent (browser)** after `cursor-agent login`
- **API key** from [cursor.com/settings](https://cursor.com/settings), or `CURSOR_API_KEY`
- **Cursor account (native OAuth)** for the native backend

## Develop

Clone [aenemo/openchamber-cursor](https://github.com/aenemo/openchamber-cursor):

```bash
git clone https://github.com/aenemo/openchamber-cursor.git
cd openchamber-cursor
npm install
npm test
npm run build
node scripts/install-dev.mjs
```

The installer works on Windows, macOS, and Linux. It adds one `plugins` entry for this repository. It does not also copy the plugin into the `plugins` folder under the OpenCode config folder, because OpenCode loads that folder automatically and a second copy fails activation. Restart OpenCode or OpenChamber after every rebuild.

## Publish to npm

Maintainers only. The tarball ships only `dist/` (see `files` in `package.json`); `prepublishOnly` runs `npm run build` before upload.

1. Create an [npm account](https://www.npmjs.com/signup) and enable 2FA.
2. Check the package name is free: `npm view openchamber-cursor`. If taken, publish as `@aenemo/openchamber-cursor` and use `npm publish --access public`.
3. From the repo root: `npm install`, `npm test`, `npm run build`.
4. Dry-run the tarball: `npm pack --dry-run` (expect `dist/`, `LICENSE`, `README.md`, `package.json`).
5. Log in: `npm login`, then `npm whoami`.
6. Publish: `npm publish` (add `--access public` for a scoped name).
7. Tag GitHub to match: `git tag v0.1.0`, `git push origin v0.1.0`.
8. Verify: `npm view openchamber-cursor version`, then `opencode plugin add openchamber-cursor@0.1.0`.

Later releases: bump with `npm version patch` (updates `package.json`, creates a git tag), push tags, then `npm publish`. You cannot republish the same version.
