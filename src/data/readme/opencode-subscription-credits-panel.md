# opencode-subscription-credits-panel

An OpenCode Desktop side-panel plugin that shows remaining account usage for
**ChatGPT / Codex**, **GitHub Copilot**, **Claude Code**, **OpenCode Go**, and **Cursor**.
Copilot shows both the percentage of allowance used and the request count.
Go shows its reported 5-hour, weekly, and monthly allowance percentages and resets.
Free-model allowances are not shown: no reliable account-wide usage counter is available.

Everything is resolved on the OpenCode server. The renderer only ever receives
normalized usage numbers — raw tokens never cross the RPC boundary.

## Install

### One-command setup (npx)

```powershell
npx opencode-subscription-credits-panel
```

That's it. The installer registers the plugin in your global OpenCode config
(`~/.config/opencode/opencode.json(c)`, `OPENCODE_CONFIG`, or `--config <path>`),
backing up the previous file first. OpenCode then installs the package from npm
by itself — the GUI bundle ships prebuilt, so no local build step is needed.
Older manual installs (a local path entry such as `~/.opencode-plugins/opencode-credits`)
are migrated to the package name automatically, and duplicate entries are
cleaned up.

To undo:

```powershell
npx opencode-subscription-credits-panel remove
```

OpenCode reloads the configuration automatically. Open the session side panel
and click **+** → **Account usage**; use `/reload` if a full reload is needed.

### From npm (manual)

Add the package name to your OpenCode plugin config:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-subscription-credits-panel"]
}
```

### From a local checkout

```powershell
git clone https://github.com/wyattdave/opencode-subscription-credits-panel
cd opencode-subscription-credits-panel
npm install
npm run build
```

Then point your config at the checkout path:

```jsonc
{
  "plugins": ["C:/path/to/opencode-subscription-credits-panel"]
}
```

OpenCode picks the plugin up on config reload; open the session side panel and
click **+** to see **Account usage** (restart the desktop app if it is missing).

## Use

In any session, open the side panel and click **+** → **Account usage**.
A `Refresh` button re-queries all providers; auto-refresh runs on open.

Click the **⚙ Provider settings** button beside Refresh to hide or show individual
providers. Changes save automatically in OpenCode's app-wide plugin store and
survive closing the panel or reloading OpenCode. **Show all** restores every card;
if all are hidden, **Choose providers** brings the settings back. These are display
preferences: hidden accounts remain connected and are still included in refreshes.

Cursor shows the allowance percentages, billing-cycle reset, and on-demand spend
reported by its usage-summary API. It supports included-plan and individual/shared
team allowance data; unsupported plan shapes show **Unavailable**, not a guessed
balance. Cursor's private dashboard API may change.

## Where credentials come from

| Provider | Source |
| --- | --- |
| ChatGPT / Codex | `~/.codex/auth.json`, then the OpenCode SQLite credential store (`openai`) |
| GitHub Copilot | OpenCode SQLite credential store (`github-copilot`), legacy `hosts.json`, env vars |
| Claude Code | `~/.claude/.credentials.json`, `CLAUDE_CODE_OAUTH_TOKEN` |
| OpenCode Go | OpenCode SQLite credential store (`opencode`, then `opencode-go`), `OPENCODE_GO_API_KEY`, then `OPENCODE_API_KEY` |
| Cursor | `CURSOR_SESSION_TOKEN`, then Cursor app `state.vscdb`, then Cursor CLI `cursor/auth.json` |

Cursor's app database is read-only: `%APPDATA%/Cursor/User/globalStorage/state.vscdb`
on Windows, `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` on
macOS, and `$XDG_CONFIG_HOME/Cursor/User/globalStorage/state.vscdb` (default
`~/.config/...`) on Linux. CLI credentials are read from
`$XDG_CONFIG_HOME/cursor/auth.json` (default `~/.config/cursor/auth.json`).
The plugin derives a `WorkosCursorSessionToken` cookie from a valid app/CLI JWT
and sends it only to `https://cursor.com/api/usage-summary`, without following
redirects or refreshing/writing credentials. Encrypted app tokens are not decrypted.
If needed, set `CURSOR_SESSION_TOKEN` on the OpenCode server to the value of your
cursor.com `WorkosCursorSessionToken` cookie (or the app JWT). Treat it as a password;
never commit it or paste it into chat. An explicit manual session never silently
falls back to another account. Cursor API keys cannot read this dashboard endpoint.

Go uses the official `/zen/go/v1/usage` endpoint, including the signed-in workspace
when available. Connect OpenCode Console/Go in Settings → Integrations first.
An unavailable allowance can mean no Go subscription, a different workspace, or
insufficient API-key permissions. The plugin never renews OpenCode-owned tokens.

Expired OAuth tokens owned by this plugin (Codex and Claude credential files)
are refreshed server-side and written back to the original file when the
refresh succeeds. OpenCode's own credential-store tokens are never rotated.

## Not connected?

- **Codex expired** → click **Sign in with ChatGPT** in the Codex card. Your
  browser opens the normal ChatGPT OAuth sign-in page. Sign in and approve. A
  loopback-only callback completes authorization using PKCE. The panel saves the
  credentials to `~/.codex/auth.json` and refreshes usage automatically. No CLI
  installation or device-code setting is needed. Attempts expire after 15
  minutes; **Cancel** stops the callback server. Callback ports 1455 and 1457
  are tried without interrupting other apps. `codex login` still works as an
  alternative. Signing in here does not replace OpenCode's provider
  credentials: its direct-access OAuth token lacks the ChatGPT account claims
  needed by the usage API.
- **Claude not connected** → run `claude` and sign in, or set
  `CLAUDE_CODE_OAUTH_TOKEN`.
- **Cursor not connected** → sign in to Cursor or run `cursor-agent login`, then
  refresh. Encrypted app credentials require the manual session described above.

### OpenCode free tier

OpenCode's free models do have limits (for example, LongCat 2.5 Free documents a
100-request daily cap). However, neither the current Console API documentation nor
OpenCode's usage-limits contract exposes a reliable remaining free-tier allowance.
Local session counts miss other devices and cannot reproduce server-side limits,
so this panel deliberately does not invent a percentage or claim unlimited usage.

## Architecture

- `index.mjs` — server plugin entry, registers RPC handlers.
- `rpc.mjs` — shared RPC contract (`snapshot`, `refresh`, sign-in status).
- `providers.mjs` — credential discovery, token refresh, usage fetching/parsing.
- `codex-login.mjs` — server-side browser OAuth, PKCE callback, and credential saving.
- `src/gui.tsx` — panel definition, **+** menu item, command, and UI components.
- `src/panel.css` — panel styling.
- `dist/gui-experimental.cjs` — built GUI bundle loaded by the desktop renderer.

```powershell
npm run typecheck        # type-check the GUI sources
npm test                 # sign-in, installer, and provider/usage tests
npm run build            # emit dist/gui-experimental.cjs
node scripts/probe.mjs   # print raw provider results without the UI
```

The GUI bundle must not import Node built-ins at top level; the host externalizes
`solid-js`, `@opencode/plugin/gui`, `@opencode/plugin/rpc`, and `effect`.

## Publishing

`npm publish` runs `prepublishOnly` first: typecheck, tests, and the GUI bundle
build. The `files` allowlist ships only the runtime modules plus `dist` and
docs. Release flow:

```powershell
npm version patch   # or minor / major
npm publish         # logs in to npm interactively on first use
git push --follow-tags
```

MIT — see [LICENSE](LICENSE).

## Troubleshooting

Check that the plugin is loaded:

```powershell
opencode-cli api get /api/plugin
```

`opencode-credits-panel` should appear with `server`, `rpc`, and `gui` features
and `state.status: "active"`. Server-side logs live in
`~/.local/share/opencode/log/opencode.log`.
