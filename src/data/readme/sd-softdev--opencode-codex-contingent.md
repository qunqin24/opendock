# OpenCode Codex Contingent

Show your **Codex subscription quota and reset times** in OpenCode or VS Code.
OpenCode gets a sidebar and footer; VS Code gets a small status-bar item with
quota/reset details on hover.

![Quota preview with fictional data](docs/preview.svg)

## Requirements

- **OpenCode 2.2.x** (tested with 2.2.0) or **VS Code desktop 1.96+**.
- The [Codex CLI](https://developers.openai.com/codex/cli), signed into your
  ChatGPT account. API-key-only authentication does not provide subscription quotas.

If needed, install Codex and sign in:

```sh
npm install -g @openai/codex
codex login
```

## OpenCode: install from npm

```sh
opencode plugin add @sd-softdev/opencode-codex-contingent
```

No plugin build is needed. Use `/reload` if the plugin does not appear.

## VS Code: install

Install [Codex Contingent](https://marketplace.visualstudio.com/items?itemName=SD-SoftDev.codex-contingent)
from the VS Code Marketplace, or run:

```sh
code --install-extension SD-SoftDev.codex-contingent
```

You can also download `codex-contingent-<version>.vsix` from the
[GitHub releases](https://github.com/sd-softdev/opencode-codex-contingent/releases).
Run **Extensions: Install from VSIX…** in VS Code and select the file.

Hover the status item for quotas and reset countdowns; click for details.
The Command Palette provides **Codex Contingent: Refresh Quotas** and
**Codex Contingent: Show Quotas**.

If Codex is not on VS Code's `PATH`, set `codexContingent.codexBinary` to its
absolute executable path in User Settings. The extension always uses the local
CLI, including in remote workspaces. Uninstall through the Extensions view.

## OpenCode: install from GitHub source

Building from source requires **Node.js 26.4+**:

```sh
git clone https://github.com/sd-softdev/opencode-codex-contingent.git
cd opencode-codex-contingent
npm ci --ignore-scripts
npm run build
```

Add the clone's absolute path to the existing `plugins` array in
`~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`). Keep your
other settings and plugins:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-codex-contingent"]
}
```

Run `/reload`. To update a GitHub installation, pull the latest changes, then
run `npm ci --ignore-scripts` and `npm run build` again.

## Usage

- Quotas refresh at startup and every **five minutes**.
- Manual refreshes are limited to once every **30 seconds**. In OpenCode,
  `/codex-limits` shows details and requests a refresh.
- Reset countdowns update locally each minute. Stale data is marked after errors.
- If Codex cannot start, check `codex --version` and `codex login status`.
  You can set `options.codexBinary` to its absolute executable path in the plugin's
  `cli.json` entry.
- If the sidebar is hidden, widen the terminal or use `/codex-limits`.

The displayed quota belongs to the account signed into the **local Codex CLI**,
which may differ from your IDE or OpenCode account. It is not an app-specific
allowance or API billing. The plugin does not start model requests.

To uninstall the OpenCode plugin, remove its entry from `cli.json`.

Community project, not affiliated with OpenAI, OpenCode, or Microsoft. OpenCode
live-tested on macOS.
[MIT](LICENSE) · [Security policy](SECURITY.md)
