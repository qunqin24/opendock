# OpenCode Codex Contingent

Show your **Codex subscription quota and reset times** in the OpenCode sidebar
and footer. Run `/codex-limits` for details and a manual refresh.

![Quota preview with fictional data](docs/preview.svg)

## Requirements

- **OpenCode 2.2.x** (tested with 2.2.0).
- The [Codex CLI](https://developers.openai.com/codex/cli), signed into your
  ChatGPT account. API-key-only authentication does not provide subscription quotas.

If needed, install Codex and sign in:

```sh
npm install -g @openai/codex
codex login
```

## Install from npm

```sh
opencode plugin add @sd-softdev/opencode-codex-contingent
```

No plugin build is needed. Use `/reload` if the plugin does not appear.

## Install from GitHub

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
- `/codex-limits` shows details and refreshes at most once every **30 seconds**.
- Reset countdowns update locally each minute. Stale data is marked after errors.
- If Codex cannot start, check `codex --version` and `codex login status`.
  You can set `options.codexBinary` to its absolute executable path in the plugin's
  `cli.json` entry.
- If the sidebar is hidden, widen the terminal or use `/codex-limits`.

The displayed quota belongs to the account signed into the **local Codex CLI**,
which may differ from your OpenCode account. It is not an OpenCode app-specific
allowance or API billing. The plugin does not start model requests.

To uninstall, remove the plugin's entry from `cli.json`.

Community plugin, not affiliated with OpenAI or OpenCode. Live-tested on macOS.
[MIT](LICENSE) · [Security policy](SECURITY.md)
