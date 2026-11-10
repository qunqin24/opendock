# opencodev2-cursor

OpenCode V2 plugin that lets OpenChamber (desktop, CLI/web, and VS Code) and OpenCode use a Cursor subscription on Windows, macOS, and Linux. OpenChamber does not have its own provider list: every surface runs OpenCode and reads `opencode.json` from the OpenCode config folder, so one install covers all of them.

Source and issues: [github.com/aenemo/opencodev2-cursor](https://github.com/aenemo/opencodev2-cursor)

## What you need

- OpenCode V2, or OpenChamber (desktop, CLI/web, or VS Code extension). The plugin targets `@opencode/plugin` 2.1.4, the version bundled with current OpenChamber desktop builds.
- **Node.js 22.13 or newer** on your `PATH`. The Cursor SDK worker runs under `node`. If your default `node` is older, point `CURSOR_ACP_NODE_BIN` at a newer one.
- A Cursor account, and one of these for sign-in:
  - the Cursor CLI (`cursor-agent`) installed and logged in, or
  - a Cursor API key from [cursor.com/settings](https://cursor.com/settings), or
  - nothing extra, if you use **Cursor account (native OAuth)** in the browser.

## Install

1. Install the plugin from npm:

   ```sh
   opencode plugin add opencodev2-cursor
   ```

   This adds one entry to your global OpenCode config and downloads the package into OpenCode's plugin cache.

   If the `opencode` command is not on your `PATH` (for example, you only use OpenChamber desktop), add the entry by hand instead. Open the global config file, add the plugin to the `plugins` array, and save:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": ["opencodev2-cursor"]
   }
   ```

   | | Global config file |
   | --- | --- |
   | Windows | `%USERPROFILE%\.config\opencode\opencode.json` |
   | macOS and Linux | `~/.config/opencode/opencode.json` |

2. **Restart OpenChamber or OpenCode** so it loads the plugin.
3. Confirm it loaded: `opencode plugin list` should show `opencodev2-cursor` once.
4. Sign in. In OpenCode or OpenChamber, run `/connect` and choose **Cursor**, then pick one method:
   - **Log in with cursor-agent (browser)**. Run `cursor-agent login` first if you have not.
   - **API key**. Paste a key from [cursor.com/settings](https://cursor.com/settings), or set `CURSOR_API_KEY` in your environment.
   - **Cursor account (native OAuth)**. Sign in through the browser. The plugin mints and caches a Cursor user API key for the SDK.
5. Pick a model from the **Cursor** provider. See [Models and the Thinking menu](#models-and-the-thinking-menu) for how context size, reasoning, and fast mode are chosen.

Install it **once**, in the global config. Do not also copy the plugin into the `plugins` folder under the OpenCode config folder, and do not list it in more than one config file. OpenCode loads that folder automatically, and a second copy fails activation.

## Models and the Thinking menu

Cursor lists every combination of context size, reasoning, thinking, and fast mode as its own model id. The plugin groups those into one picker row per model and context size, and puts the rest in OpenCode's **Thinking** menu (the same menu Claude and other providers use for effort).

**Context size stays on the model.** OpenCode reads the context limit from the model itself, and that limit drives compaction and the token meter. A Thinking-menu choice cannot change it. A family that Cursor offers at two sizes is therefore two rows, each with the size Cursor reports:

- `GPT-5.6 Sol` at 272K and at 1M
- `Grok 4.7` at 256K and at 500K
- Claude models at the sizes Cursor lists (200K, 300K, or 1M)

`opencode models` shows the grouped id, for example `cursor/gpt-5.6-sol[context=272k]`, not every combination.

**Reasoning, thinking, and fast are Thinking-menu variants.** Open the menu on a Cursor model and pick one. Names are built from the options that actually differ for that model:

| What Cursor offers | Menu entries |
| --- | --- |
| Reasoning only (`low` through `max`, `xhigh`, `extra-high`, `none`, `minimal`) | `low`, `medium`, `high`, … |
| A fast toggle as well | `medium` and `medium-fast`, `high` and `high-fast`, … |
| Claude thinking on/off | `medium` and `medium-thinking`, plus `-fast` when speed is also a choice |
| Fast only (Composer) | `standard` and `fast` |

A parameter that is the same on every variant of a model (for example `cyber=false`) is left out of the name. The plugin still sends it.

**The default is medium, fast off, thinking on** when you leave the menu on `default`. If Cursor marks one variant as its own default, that one is used instead. The three Auto Router rows stay separate models, because each one is a different routing mode rather than an effort level:

- `Auto-Cursor-Balanced`
- `Auto-Cursor-Cost`
- `Auto-Cursor-Intelligence`

The raw `auto-smart` and `default` ids are hidden so they do not duplicate those three rows. `cursor/auto` still routes to Balanced.

**Picker labels for Cursor models start with the provider**, for example `Cursor - Claude Opus 5.5`. This is always on. It keeps Cursor's Claude rows apart from the same models offered by another provider, such as Claude Code, which bills a different account. OpenChamber also shows the context size on the model line.

**Label every other provider the same way** with `labelAllProviders`. It is off by default, because it renames models that other plugins publish. With it on, Claude Code's `Opus 5.5` becomes `Claude Code - Opus 5.5`, and OpenCode's own models pick up an `OpenCode -` prefix too.

`opencode plugin add opencodev2-cursor` writes a plain string entry and does not turn the option on. If the entry is already an object, running `plugin add` again replaces it and drops the option. Add it by hand in the global config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencodev2-cursor", "options": { "labelAllProviders": true } }
  ]
}
```

| | Global config file |
| --- | --- |
| Windows | `%USERPROFILE%\.config\opencode\opencode.json` |
| macOS and Linux | `~/.config/opencode/opencode.json` |

A provider you define yourself under `providers` in that file keeps the `name` you wrote. The option does not rename those rows. Put the provider in the name there, for example `"name": "JJS AI - jjs-code"`.

Restart OpenChamber or OpenCode after changing the option so it reloads the model list. The cache at `models.json` keeps the previous list until the next discovery.

## Concurrent sessions and timeouts

Each OpenCode session has its own Cursor agent and run. A tool call that pauses one session does not cancel a run in another session, and a new turn only cancels the run in its own session.

A turn that produces no output fails instead of waiting forever:

- **Idle timeout:** 5 minutes with no output. Option `idleTimeoutMs`.
- **Turn timeout:** 15 minutes for one step. Option `turnTimeoutMs`.

On timeout, or when you press Stop, the plugin writes an SSE error, ends the stream with `[DONE]`, cancels that session's run, and lets the next turn start. The model list is cached for about 10 minutes (`modelsCacheTtlMs`) so reloads do not call Cursor `get_models` on every start. A rate-limit response uses the cached list.

```jsonc
{
  "plugins": [
    {
      "package": "opencodev2-cursor",
      "options": {
        "labelAllProviders": true,
        "idleTimeoutMs": 300000,
        "turnTimeoutMs": 900000,
        "modelsCacheTtlMs": 600000
      }
    }
  ]
}
```

## Updates

Installing from npm does **not** silently replace the version you have. What happens depends on how the entry is written:

- **Unpinned** (`"opencodev2-cursor"`, the default from `opencode plugin add opencodev2-cursor`): OpenCode checks npm for a newer version when it starts, but it keeps using the installed one until you update.
- **Pinned** (`"opencodev2-cursor@0.1.0"`): never changes until you edit the entry. Choose this if you want a fixed version, for example while a specific OpenChamber build is known to work with it.

To see and apply updates:

```sh
opencode plugin check
opencode plugin update opencodev2-cursor
```

Restart OpenChamber or OpenCode afterwards. Version bumps follow semver: a patch or minor release should be safe to take, and the changelog on GitHub says when a release needs a newer OpenChamber.

## Uninstall

```sh
opencode plugin remove opencodev2-cursor
```

Or delete the `opencodev2-cursor` entry from `opencode.json`. Restart afterwards. Optional cleanup: remove the plugin cache folder shown in the file locations table below.

## Troubleshooting

- **No Cursor provider or models.** Check `opencode plugin list`, restart, and read the log (`opencodev2-cursor.log` in the plugin cache folder).
- **"Plugin failed to activate" or a duplicate plugin.** Make sure there is only one entry, and nothing in the config folder's `plugins` directory.
- **"Cursor SDK needs Node.js 22.13 or newer".** Install a newer Node, or set `CURSOR_ACP_NODE_BIN` to its path.
- **"Agent … already has active run".** Send the message again. A new turn cancels the stuck run.
- **Sign-in with cursor-agent fails.** Run `cursor-agent login` in a terminal, then retry `/connect`.
- **A turn goes quiet.** After the idle timeout the chat shows an error instead of hanging. The log records `turn start`, `timeout`, `client abort`, `run cancelled`, and `orphan tool result`, each with `sessionKey` and `model`.
- **Still stuck?** Open a [Bug report](https://github.com/aenemo/opencodev2-cursor/issues/new?template=bug_report.yml). It asks for OS, surface, Node version, and sign-in method so install problems can be separated from auth problems. Do not paste API keys or tokens.

## Where files live

| | Windows | macOS and Linux |
| --- | --- | --- |
| OpenCode config | `%USERPROFILE%\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` |
| Plugin cache and log | `%USERPROFILE%\.cache\opencodev2-cursor\` | `~/.cache/opencodev2-cursor/` (`$XDG_CACHE_HOME/opencodev2-cursor/` when set) |
| SDK state | `%USERPROFILE%\.cursor\oc-sdk\<id>` | `~/.cursor/oc-sdk/<id>` |
| V8 compile cache | `%LOCALAPPDATA%\cursor-compile-cache` | `<plugin cache>/compile-cache` |
| `cursor-agent` launcher | `cursor-agent.ps1`, run through PowerShell | `cursor-agent` on `PATH`, usually a symlink into `~/.local/share/cursor-agent/versions/<ver>/` |

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

Session-title prompts are answered locally with a short title so they do not start a Cursor run. Logs are written to `opencodev2-cursor.log` in the plugin cache folder.

## Environment

| Variable | Role |
| --- | --- |
| `CURSOR_BACKEND` | `auto` (default), `cli`, `sdk`, or `native` |
| `CURSOR_API_KEY` | API key when no integration credential is connected |
| `CURSOR_AGENT_BIN` | Explicit `cursor-agent` launcher path |
| `CURSOR_ACP_NODE_BIN` | Node.js 22.13+ binary for the SDK worker |
| `CURSOR_ACP_TRUST_WORKSPACE` | Set to `false` to omit `--trust` |
| `CURSOR_ACP_SDK_STATE_ROOT` | SDK store root (default `~/.cursor/oc-sdk`) |
| `OPENCODEV2_CURSOR_CACHE` | Cache directory (default `~/.cache/opencodev2-cursor`; `OPENCHAMBER_CURSOR_CACHE` and `CURSOR_CHAMBER_CACHE` still work) |
| `CURSOR_RIPWALK_CACHE_TTL_MS` | Workspace scan cache (default 30 minutes) |
| `NODE_COMPILE_CACHE` | V8 compile cache for the SDK worker and cursor-agent |
| `CURSOR_NATIVE_TRANSPORT` | `connect` uses the HTTP/2 bridge; otherwise native uses the SDK |
| `CURSOR_SDK_HTTP1` | Set to `1` to force HTTP/1 for the SDK agent transport |
| `CURSOR_BACKEND_URL` | Connect bridge origin (default `https://api2.cursor.sh`) |
| `CURSOR_REFRESH_URL` | Native token refresh endpoint |

## Develop

Contributors only. End users should use the npm install above.

```bash
git clone https://github.com/aenemo/opencodev2-cursor.git
cd opencodev2-cursor
npm install
npm test
npm run build
node scripts/install-dev.mjs
```

The installer works on Windows, macOS, and Linux. It adds one `plugins` entry that points at your clone. Remove any npm-installed `opencodev2-cursor` entry first, so only one copy loads. It does not also copy the plugin into the `plugins` folder under the OpenCode config folder, because OpenCode loads that folder automatically and a second copy fails activation. Restart OpenCode or OpenChamber after every rebuild.

## Publish to npm

Maintainers only. The tarball ships only `dist/` (see `files` in `package.json`); `prepublishOnly` runs `npm run build` before upload, so `dist/` does not need to be committed to git.

1. Create an [npm account](https://www.npmjs.com/signup) and enable 2FA.
2. Check the name is free: `npm view opencodev2-cursor` (a 404 means it is available).
3. From the repo root: `npm install`, `npm test`, `npm run build`.
4. Dry-run the tarball: `npm pack --dry-run` (expect `dist/`, `LICENSE`, `README.md`, `package.json`).
5. Log in: `npm login`, then `npm whoami`.
6. Publish: `npm publish` (add `--access public` for a scoped name).
7. Tag GitHub to match: `git tag v0.1.0`, `git push origin v0.1.0`.
8. Verify: `npm view opencodev2-cursor version`, then `opencode plugin add opencodev2-cursor`.

Later releases: bump with `npm version patch` (updates `package.json`, creates a git tag), push tags, then `npm publish`. You cannot republish the same version.
