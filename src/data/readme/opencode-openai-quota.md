<h1 align="center">OpenAI Quota for OpenCode 2</h1>

<p align="center">Codex subscription quota in your OpenCode 2 sidebar — read from your local Codex CLI, with no tokens copied and no inference spent.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-openai-quota"><img src="https://img.shields.io/npm/v/opencode-openai-quota?style=flat-square&label=npm&color=cb3837" alt="npm version"></a>
  <a href="#requirements"><img src="https://img.shields.io/badge/OpenCode-2%20TUI%20plugin-7357d5?style=flat-square" alt="OpenCode 2 TUI plugin"></a>
  <a href="#how-it-reads-quota"><img src="https://img.shields.io/badge/Quota-local%20Codex%20app--server-159b83?style=flat-square" alt="Quota from the local Codex app-server"></a>
  <a href="#privacy-and-network-behavior"><img src="https://img.shields.io/badge/Tokens-never%20touched-0b7285?style=flat-square" alt="Tokens are never read"></a>
</p>

<p align="center"><code>opencode plugin add opencode-openai-quota</code></p>

<p align="center"><a href="#quick-install"><strong>Other install options ↓</strong></a></p>

<p align="center">
  <img src="docs/assets/quota-preview.svg" alt="Recreation of the OpenCode 2 quota panel showing a 5-hour session window with 68 percent remaining, a weekly window with 9 percent remaining in red, two available banked resets, and the next reported expiration." width="440">
</p>

<p align="center"><sub>SVG recreation of the panel with example values—not a captured screenshot. Colors come from your theme; balances at or below 25% turn amber and at or below 10% turn red.</sub></p>

## What it does

Adds a small panel to OpenCode 2's sidebar with the OpenAI Codex subscription windows that are active on your machine:

- **Session (5h)** and **Weekly** windows, with the duration derived from the window Codex reports.
- **Remaining quota**, not used quota. A window with `63% used` renders as `37% remaining`.
- The **next reset** for each window as a live countdown.
- **Available banked resets** and their next known expiration.
- **Freshness**: when the numbers were last read, and an explicit warning when the read failed.

It is a quota panel, not an API billing, usage-credit, token, or cost tracker.

## How it reads quota

This is the part that changed for OpenCode 2. There is no OAuth token handling and no HTTP call to OpenAI:

```
OpenCode 2 TUI  ──spawn──▶  codex app-server  ──JSON-RPC over stdio──▶  account/rateLimits/read
```

1. The TUI plugin starts a **short-lived `codex app-server`** process.
2. It performs the `initialize` handshake, sends `initialized`, then asks for `account/rateLimits/read`.
3. It closes stdin so Codex exits on its own, and kills the child if it lingers.
4. The raw payload is normalized defensively: anything missing or malformed is shown as **unavailable** instead of being guessed.

No model turn is created, so **checking the panel never consumes quota**. The plugin never reads `auth.json` or any credential snapshot, and it never sends your token anywhere.

## Requirements

- **OpenCode 2** with the TUI plugin API (`@opencode/plugin/tui`).
- **Codex CLI** installed and logged in with the ChatGPT account whose quota you want to see:

  ```sh
  codex --version
  codex login status
  ```

  If it is not installed or not logged in, the panel says so instead of showing numbers.

> The panel reports the account signed into your **local Codex CLI**. If OpenCode uses a different OpenAI account, the numbers you see are still correct—for the Codex account, not necessarily the OpenCode one.

## Quick install

One command from npm; the source options below are for development or offline setups.

### Option A — from npm (recommended)

```sh
opencode plugin add opencode-openai-quota
```

This installs the package and configures it globally. The server and TUI parts load together, so there is no config file to edit by hand.

```sh
opencode plugin add opencode-openai-quota@0.3.0   # pin an exact version
opencode plugin update                            # update every package plugin
opencode plugin update opencode-openai-quota      # update only this one
opencode plugin list                              # see what is installed
opencode plugin remove opencode-openai-quota      # uninstall
```

If OpenCode is already running, reload with `/reload`. The panel appears in the next session's sidebar.

### Option B — installer script (Windows, from source)

```powershell
git clone https://github.com/arturobuendia/opencode-openai-quota.git
cd opencode-openai-quota
.\install.ps1
```

The script copies the plugin into OpenCode's global discovery folder:

```text
<config>/plugins/openai-quota/
├── index.ts      # server part
├── tui.tsx       # TUI part
├── package.json
├── tsconfig.json
└── src/          # codex.js, quota.js, refresh.js, index.ts, tui.tsx
```

`<config>` is `%USERPROFILE%\.config\opencode` on Windows, `~/.config/opencode` (or `$XDG_CONFIG_HOME/opencode`) on macOS/Linux, or the directory selected by `OPENCODE_CONFIG_DIR`.

An existing install is moved to `<config>/openai-quota-backups/` before the copy—never inside `plugins/`, where OpenCode would discover both copies. The script does not touch `opencode.json`, `cli.json`, `auth.json`, or your other plugins.

### Option C — manual, any platform

Copy the same files into the discovery folder:

```sh
mkdir -p ~/.config/opencode/plugins/openai-quota
cp -R src index.ts tui.tsx tsconfig.json package.json ~/.config/opencode/plugins/openai-quota/
```

Or point OpenCode at the checkout from `opencode.json`, which loads both the server and TUI parts of the package:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "C:/Users/YOU/Projects/opencode-openai-quota"
  ]
}
```

`file:///C:/Users/YOU/Projects/opencode-openai-quota` and relative paths such as `./plugins/openai-quota` are accepted too. Use `cli.json` instead when the TUI talks to a **remote** server and the plugin must run locally:

```json
{
  "plugins": ["C:/Users/YOU/Projects/opencode-openai-quota"]
}
```

Keep the checkout in place after configuring it. OpenCode reloads plugins when configuration changes; if the panel does not appear, run `/reload`.

### Option D — install with an AI agent

Paste this into any coding agent with shell access. It installs the published package, so no file is copied and no credential is touched.

```text
Install the "OpenAI Quota for OpenCode 2" plugin on this machine.

Rules for this task:
- Do not read, print, or copy any OAuth token, auth.json, or credential store.
- Do not hand-edit opencode.json, cli.json, auth.json, the OpenCode database, or other plugins.
- Ask before installing system packages or changing PATH.
- Stop and report instead of guessing when a prerequisite is missing.

Steps:
1. Check that `opencode --version` reports OpenCode 2. If it is v1 or missing, stop.
2. Check the Codex CLI with `codex --version`, then `codex login status`. If Codex is
   missing or not logged in to a ChatGPT account, stop and report what I have to run.
3. Install the plugin with `opencode plugin add opencode-openai-quota`. If that command
   fails, report the exact error and stop; do not clone the repository or copy files as a
   workaround.
4. Confirm with `opencode plugin list` that the plugin is listed.
5. Reload OpenCode with `/reload`, or tell me to restart the TUI if the sidebar does not
   refresh.
6. Verify: the session sidebar must show an "OpenAI Quota" panel. If it says
   "Cannot read Codex quota", report the exact message under it and stop.

Finish by reporting the installed version and whether the panel rendered.
```

The prompt never asks for your token and never hand-edits your configuration. If an agent proposes reading `auth.json` or writing config files directly, it went off-script—stop it and point it back here.

## What appears in the sidebar

```text
OpenAI Quota
Updated just now

Session (5h)
━━━━━━━━━━━━━━━━───────
68% remaining
Resets in 4h 12m

Weekly
━━━────────────────────
9% remaining
Resets in 2d 7h

───────────────────────
2 available banked resets
Next expires in 9d
```

- **Window titles** follow the duration Codex reports: `Session (5h)` and `Weekly` for the usual windows, otherwise the generic name plus the real duration.
- **Balances** are remaining percentages; the bar length follows the value, so a tiny nonzero balance is still visibly nonzero.
- **Resets** are relative (`in 3d 4h`), recalculated every 30 seconds. A window the service gives no reset time for says `Reset unavailable`.
- **Banked resets** are manual redemption benefits, separate from automatic resets and purchased credits. The panel shows a genuine `0`, says `Banked resets: unavailable` when the count is missing or malformed, and only shows an expiration when every available reset has a complete, valid timestamp. It never redeems anything. See [OpenAI's reset guide](https://help.openai.com/en/articles/20001498-how-resets-work-in-codex) for the distinctions and offer terms.

### Reading the status line

| Panel content | Meaning |
| --- | --- |
| `Updated just now` / `Updated 4m ago` | Time of the last successful read. |
| `Checking · Updated 4m ago` | A read is running; the previous numbers stay visible. |
| `Reading Codex…` | First read in progress, nothing to show yet. |
| `Unavailable` | No successful read yet and none in flight. |
| `Refresh failed · showing saved data` | The last read failed; the previous good numbers stay on screen. |
| `Cannot read Codex quota` | No usable numbers yet plus the reason, for example Codex missing from `PATH`, not logged in, or the 15-second timeout. |
| `Try /quota-refresh` | The suggested next step while nothing is displayed. |

## When it refreshes

- On startup.
- **7 seconds after a session execution succeeds**, so Codex can publish the new numbers first.
- Every **2 minutes**, as a safety net.
- Immediately when a displayed reset time has passed, so a reset window does not sit at 0% until the next poll.
- The countdown text alone re-renders every **30 seconds**; the panel does not re-read Codex for that.

Automatic attempts respect a **60-second cooldown**, and overlapping requests share a single read instead of starting a second `codex` process. A manual refresh skips the cooldown; reset-triggered and post-execution reads wait for it like any other automatic attempt.

### Manual refresh

- Command palette: **Refresh OpenAI quota** (group **OpenAI quota**).
- Slash command: **`/quota-refresh`**.

## Privacy and network behavior

- The plugin makes **no HTTP requests of its own** and holds **no credentials**.
- It does not read `auth.json`, `OPENCODE_AUTH_CONTENT`, or any token file.
- The only side effect is a local child process per read: `codex app-server`, with a 15-second timeout, stdin closed to let it exit, and a kill if it does not.
- Codex `stderr` is drained but never rendered, so diagnostics that may contain private data cannot leak into the sidebar.
- Errors shown in the panel never include tokens or full command output.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_QUOTA_CODEX` | `codex` | Command used to start Codex. Point it at another executable or shim. On Windows it runs through the shell, so only use a value you trust. |

## Compatibility

Targets **OpenCode 2** and its built-in TUI plugin API. The published package declares `@opencode/plugin` as a dependency and `@opentui/core`, `@opentui/solid`, and `solid-js` as peers, so OpenCode supplies the rendering runtime and you install nothing by hand. No `engines.opencode` range is declared; older or newer TUI APIs are not guaranteed.

## Troubleshooting

- **No panel:** confirm `opencode plugin list` shows the plugin (or that a source install exists at `<config>/plugins/openai-quota`), then run `/reload`.
- **`Cannot read Codex quota`:** read the message under it. `codex` missing from `PATH` → install the Codex CLI. Not logged in → run `codex login`. Timeout → the app-server took longer than 15 seconds.
- **Numbers look wrong:** check which account the local CLI is using with `codex login status`. The panel follows Codex, not OpenCode.
- **Verify outside OpenCode:** `npm run probe` prints the same snapshot the panel uses, or fails with the underlying reason.
- **Banked reset expiration says unavailable:** the count can still be right while the detail list is missing, incomplete, or uses an unknown expiration. The plugin never infers an expiration from a normal reset time.
- **No weekly or no session row:** Codex only returned one window. The plugin shows what exists and never invents the other.
- **`TUI plugin error` mentioning `Cannot find package 'react'`:** a broken release older than 0.3.2. Update with `opencode plugin update opencode-openai-quota` and restart OpenCode.

## Development

Node.js **20 or newer** is required for the development scripts. The package has one runtime dependency (`@opencode/plugin`) plus the OpenTUI peers that OpenCode provides.

```sh
npm test              # offline suite: codex handshake, normalization, refresh, labels
npm run probe         # one real read through your local codex app-server
npm run check         # syntax-check the source modules, then run the suite
npm pack --dry-run    # inspect exactly what would be published
```

Tests use a synthetic Codex fixture (`test/fake-codex.mjs`) and injected clocks, so they stay offline and never read real credentials.

| Path | Role |
| --- | --- |
| `src/index.ts` | Server part. Registers no resources; the work happens in the TUI. |
| `src/tui.tsx` | Panel, sidebar slot, `/quota-refresh` command, scheduling, and disposal. |
| `src/codex.js` | Spawns `codex app-server` and runs the JSON-RPC handshake. |
| `src/quota.js` | Normalizes the payload; formats percentages, bars, and relative times. |
| `src/refresh.js` | Cooldown and coalescing so only one read runs at a time. |
| `install.ps1`, `uninstall.ps1` | Source checkout install/removal for the discovery folder. |

## Publishing (maintainers)

```sh
npm login                        # once per machine
npm run check                    # also runs automatically via prepublishOnly
npm version patch|minor|major    # bumps package.json, commits, tags
npm publish --access public
git push --follow-tags
```

The `files` field limits the tarball to `src/`, the two root entrypoints, and `tsconfig.json`; tests, scripts, installers, and assets stay in the repository. Pinned installs keep their version, and `opencode plugin update` moves unpinned ones forward.

## Uninstall

```sh
opencode plugin remove opencode-openai-quota
```

If you installed from a source checkout instead, run `.\uninstall.ps1`, which removes only `<config>/plugins/openai-quota`. If you configured a path in `opencode.json`/`cli.json`, delete that entry. Run `/reload` afterwards; backups under `<config>/openai-quota-backups/` are yours to delete.

## License

MIT. See [LICENSE](LICENSE).
