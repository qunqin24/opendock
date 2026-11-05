# OpenCode Queue Manager — Batch prompts for Desktop & TUI

**Build a queue of 100–200 (or custom-count) prompts, edit and reorder them before sending, then manage OpenCode's native message queue.** Open-source, MIT-licensed extension for **OpenCode v2 Desktop and TUI**.

[![npm](https://img.shields.io/npm/v/%40bybrawe%2Fopencode-queue-manager?label=npm)](https://www.npmjs.com/package/@bybrawe/opencode-queue-manager) [![CI](https://github.com/ByBrawe/OpenCode-Queue-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/ByBrawe/OpenCode-Queue-Manager/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[**Türkçe rehber**](docs/tr/README.md) · [**20-language guide**](docs/languages/README.md) · [Installation](#installation) · [Examples](#examples) · [FAQ](#faq) · [Roadmap](#other-platforms-and-model-providers)

> **Experimental:** OpenCode v2's Desktop GUI plugin SDK changes between releases. Automated mock tests pass, but actual OpenCode Desktop/TUI compatibility still requires testing. The install/update helper is already available on npm; future package updates are published automatically after tests pass. Published versions are listed at [npm](https://www.npmjs.com/package/@bybrawe/opencode-queue-manager).

## Highlights

| Feature | Desktop GUI | TUI |
| --- | --- | --- |
| Repeat a prompt 10 / 25 / 50 / 100 / 200 / custom (1–500) times | Yes | Yes |
| Paste a newline-separated task list or import `.txt` | Yes | Yes |
| Save drafts per session before submitting | Yes | Yes (separate store) |
| Edit, delete, duplicate, reorder and sort drafts | Yes | Yes |
| Search and multi-select drafts | Yes | Via terminal menus (limited) |
| Send to native OpenCode queue | Yes | Yes |
| Inspect/remove queued pending prompts | Yes | Yes |
| Install/uninstall CLI helper (Windows/macOS/Linux) | Terminal helper | Terminal helper |
| 20-language interface, automatic host locale, manual language picker, RTL | Yes | No (English TUI) |

Publishing drafts to OpenCode **starts real model work and may incur usage charges**. The word “publish” in the UI means *send to the OpenCode message queue*, not publish this package to npm. Editing/reordering applies to drafts, not already queued messages.

## Installation

### Fastest: official OpenCode v2 CLI

OpenCode v2 has a built-in plugin manager. You can install the current **published** package directly:

```sh
opencode plugin add @bybrawe/opencode-queue-manager
opencode plugin list
```

Restart OpenCode Desktop or TUI and open a session; use `/qm` or search the command palette for **Queue Manager**. A GUI plugin is loaded in Desktop only if the current OpenCode v2 Desktop app supports its experimental `./gui-experimental` export. [Official plugin reference](https://opencode.ai/v2/docs/plugins).

### One-command installer (current npm release)

Our installer recognizes the OpenCode CLI. If it's missing, it can edit only the user's Desktop/server `opencode.jsonc` as a fallback. It preserves unrelated settings and creates a timestamped backup for changes.

```sh
npx @bybrawe/opencode-queue-manager install
npx @bybrawe/opencode-queue-manager doctor
npx @bybrawe/opencode-queue-manager update
npx @bybrawe/opencode-queue-manager uninstall
```

**Note:** `npm install @bybrawe/opencode-queue-manager` downloads the npm package into the current folder but does **not** register it with OpenCode. Run `npx @bybrawe/opencode-queue-manager@latest install` (or `opencode plugin add @bybrawe/opencode-queue-manager`), then `doctor`. Windows OpenCode CLI versions such as `opencode v2.0.22` are recognized. The installer does not require globally installing the package.

For Desktop-only installations with no `opencode` command on `PATH`:

```sh
npx @bybrawe/opencode-queue-manager install --method config
npx @bybrawe/opencode-queue-manager uninstall --method config
```

For a **dry run** before writing anything:

```sh
npx @bybrawe/opencode-queue-manager install --dry-run
npx @bybrawe/opencode-queue-manager doctor --json
```

The CLI helper can also install the **official OpenCode v2 CLI** via npm; these operations require a separate explicit `--yes` flag and do **not** install/uninstall the Desktop app:

```sh
npx @bybrawe/opencode-queue-manager install-opencode --yes
npx @bybrawe/opencode-queue-manager uninstall-opencode --yes
```

`uninstall-opencode` refuses to remove an OpenCode CLI installed by a different package manager. To install the **Desktop application**, use [OpenCode's official download page](https://opencode.ai/download). [Full install, upgrade, uninstall, backup and troubleshooting guide](docs/en/installation.md).

### Configure manually

Add the package to your **global** `~/.config/opencode/opencode.jsonc` (Windows: `%USERPROFILE%\.config\opencode\opencode.jsonc`) without overwriting existing options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@bybrawe/opencode-queue-manager"]
}
```

OpenCode Desktop reads the global `opencode.json(c)`. TUI also loads active packages from the server; use `cli.json` only for TUI-local plugins. Avoid configuring both unnecessarily. See [OpenCode plugin docs](https://opencode.ai/v2/docs/cli/plugins).

## Quick start

1. Install the plugin and restart OpenCode v2.
2. Open a session and choose **Queue Manager** (`/qm`).
3. Enter `devam et` (or any custom prompt), select **100**, **200** or a custom count.
4. Review the numbered **draft list**. Search, sort, move, edit or delete unwanted entries.
5. Confirm **Send to native queue**. Start with 2–3 messages to verify the host integration.
6. Review **native pending queue** to cancel entries that have not started yet.

## Examples

**Repeat an instruction 100 times**

```text
Prompt: devam et
Count: 100
Drafts: 100 numbered entries
Action: Review -> Send to native queue
```

**Work from a task list** — save the following as `tasks.txt`, then paste or import it:

```text
Check all failing tests and summarize root causes.
Fix TypeScript errors without changing public APIs.
Run lint, formatting and unit tests.
Document the remaining blockers and stop when complete.
```

**Recover from a wrong working directory** — fix the root path first; repeating an error 200 times will not solve it.

**Edit a staged task** — select an entry, update its text and move it before other entries; only then submit the queue.

Examples: [`examples/messages.txt`](examples/messages.txt), [`examples/tasks.txt`](examples/tasks.txt), [`examples/desktop-opencode.jsonc`](examples/desktop-opencode.jsonc). More usage scenarios: [English examples](docs/en/examples.md) and [Turkish guide](docs/tr/README.md).

## Other platforms and model providers

**OpenCode v2 is the only implemented host adapter.** The installer and host registry are separated in `src/platforms/registry.mjs` so community contributors can add other supported coding-agent applications later. The adapter contract and acceptance tests are documented in [platform adapters](docs/en/platform-adapters.md). Cursor, Claude Code, Codex and other clients are **not** claimed to be supported.

**DeepSeek, Anthropic, OpenAI, OpenRouter and similar names identify model providers, not additional host applications.** The queue manager sends text to OpenCode's session and uses whichever model is selected there. DeepSeek works through OpenCode's provider integration; Queue Manager does **not** collect or manage API keys. OpenCode: `/connect` → choose provider → `/models` → choose a model. [Provider docs](https://opencode.ai/v2/docs/providers).

A reference to “harmless” has not been mapped to a verified coding-agent host; no support is claimed. If a specific host tool is requested, an adapter must be built and integration-tested against its APIs.

## Limits and safety

- **Desktop GUI:** experimental SDK; host installation and UI integration are not yet tested in a real Desktop app in this repository's current automated suite.
- Queue Manager drafts in Desktop and TUI are not synchronized. Native queue items use the same session/server inbox.
- Sorting, editing and reordering **cannot atomically modify already queued native items**; these actions happen before sending.
- Canceling a pending item does not stop a model request that is already running.
- A crash between successful native queue admission and a local draft checkpoint could duplicate a prompt when retried.
- The installer alters only the selected user's OpenCode global config (or calls the official OpenCode v2 plugin manager). Timestamped backups may contain your other OpenCode settings, including credentials if you placed them there: keep them private.
- The OpenCode CLI is optional for Desktop users; Node.js 20+ is required for the installer (via `npx`), not for OpenCode Desktop itself.

## Development

```sh
npm install
npm run verify
npm pack --dry-run
node bin/opencode-queue-manager.mjs doctor
```

The `prepack` hook builds and tests the bundle. The npm package contains the two OpenCode plugin entries and the standalone installer binary. Read [CONTRIBUTING](CONTRIBUTING.md) and [platform adapters](docs/en/platform-adapters.md) before contributing.

**npm publishing is automatic.** A merge to `main` runs [the release workflow](.github/workflows/publish-npm.yml): build/tests, npm registry version check, automatic patch version increase when needed, then tokenless npm Trusted Publishing (OIDC). No local `npm login`, `npm version`, or `npm publish` command is required. Keep GitHub Environment `npm` and the npm Trusted Publisher configured for `publish-npm.yml` with `npm publish` permission. A rerun of the same Git commit is skipped. See [release details](docs/en/releasing.md).

## FAQ

**Does 200 messages automatically cost 200 model calls?** The app may begin processing each queued message; the number and cost of provider calls depend on the host, model and session behavior. Do not flood the queue without reviewing it.

**Can I reorder a message after sending it?** Not directly using the public native queue API. Cancel outstanding pending messages and stage a corrected list instead.

**Does this work with DeepSeek?** As an OpenCode-selected model provider, yes in principle. It is not an independent DeepSeek app integration, and real model/provider combinations must be tested on the host.

**Can I remove the plugin later?** Yes: `opencode plugin remove @bybrawe/opencode-queue-manager` or the installer `uninstall` command. This will not remove OpenCode or your projects.

**How do I get the project indexed in Google?** Enable GitHub Pages from `/docs`, register the URL in Google Search Console, and submit its sitemap; discovery and ranking are not guaranteed. See [SEO checklist](docs/en/seo.md).

## Links

- [npm](https://www.npmjs.com/package/@bybrawe/opencode-queue-manager)
- [Source, issues and contributions](https://github.com/ByBrawe/OpenCode-Queue-Manager)
- [OpenCode v2 official docs](https://opencode.ai/v2/docs)
- [English installation](docs/en/installation.md) · [Türkçe kullanım](docs/tr/README.md) · [Platform adapters](docs/en/platform-adapters.md)

## License

MIT — see [LICENSE](LICENSE). Independent community project; not an official OpenCode product.

### Windows diagnostic / npm audit notes

If `doctor` shows `cliFound: true` and `cliV2: true` but `configured: false`, the OpenCode plugin is not registered. Running `npm i` in `C:\\Users\\...\\` does not activate it; use `npx @bybrawe/opencode-queue-manager@latest install` or `opencode plugin add @bybrawe/opencode-queue-manager`. `doctor` inspects both the fallback config file and the OpenCode CLI's plugin list when available.

`npm audit` reports vulnerabilities in **the current working directory's entire dependency tree**, including transitive packages. Do not assume every warning is a defect in Queue Manager, and avoid `npm audit fix --force` in your Windows user home directory. Inspect the report before changing dependencies. `@opencode/plugin` is a documented runtime dependency for OpenCode v2 plugins.


### OpenCode v2 default server export

Queue Manager ships the three standard host exports: `.` (minimal, no-op
server definition), `./tui` and `./gui-experimental`. The server definition
is needed for OpenCode to resolve npm packages as plugins; a missing root
export previously caused `Plugin entrypoint not found` in the OpenCode log.
An installer `doctor` result of `configured: true` means the package is
**registered**, not that its GUI has successfully loaded. The GUI remains
experimental and host-dependent.


### OpenCode Desktop: why `/qm` may not appear

The experimental Desktop UI must be loaded **by the Desktop app's own background server**. It is not installed or registered by running `npm i` in Windows CMD. The package now builds `./gui-experimental` with the **official OpenCode GUI Vite preset**. The `/qm` palette/slash command is always registered if GUI setup succeeds; the `Queue Manager` launcher is also available in the session panel's `+` menu. Without an active chat session the command shows a notice.

1. Run `opencode plugin update @bybrawe/opencode-queue-manager` to install the newest npm package. Exact version pins need explicit config edits.
2. Restart Desktop and go to **Settings → Extensions → Plugins**. Make sure the current Desktop server's `@bybrawe/opencode-queue-manager` row is loaded, its GUI switch is on, and use **Reload** after failures.
3. Open a chat session; type `/qm` or search the command palette for Queue Manager, or use the session panel's `+` launcher.
4. If Desktop reports `SQLiteError: disk I/O error`, fix the OpenCode background service before debugging the GUI. A running server with a failing database cannot load a GUI plugin.

OpenCode's GUI SDK is **experimental**. Passing our plugin contract tests does not prove compatibility with every Desktop version; inspect the live plugin status if it is missing. [Official Desktop GUI plugin reference](https://opencode.ai/v2/docs/build/plugins/gui).


### Drag-and-drop and bulk queue ordering (Desktop)

Within the **draft list** (before sending to OpenCode):

- Drag the **⠿** handle and drop on a message to move it before or after that row. Select multiple checkboxes first to drag those rows **as one group**, keeping their relative order.
- Use **↑ Seçilileri yukarı / ↓ Seçilileri aşağı** to move multiple selected rows one step, or **⇡ Başa / ⇣ Sona** to move them to the beginning or end. All changes operate on the underlying full draft list, including when filtered or paginated.
- **Bu sayfayı seç** selects the current page, **Eşleşenleri seç** selects filtered matches across pages, and **Tümünü seç** selects all drafts. Selections persist across pages. **Seçimi kaldır** clears them.
- The drag handle supports **Alt+ArrowUp / Alt+ArrowDown / Alt+Home / Alt+End** for accessible keyboard reordering. Each row still offers single-message move buttons.
- Reordering changes **only local drafts** and doesn't invoke a model or alter already accepted native inbox messages. Sort and review drafts, then explicitly confirm **Tümünü kuyruğa aktar**. Already running/admitted queue items cannot safely be reordered with OpenCode's published Inbox API; queued items can be listed or canceled separately.

## Localization: 20 languages (Desktop)

Open Queue Manager with `/qm`. Select a language from the panel's **Language / Dil / 🌐** dropdown. The **Auto** option follows OpenCode Desktop's interface language; picking a language overrides it. Your selection is **remembered globally**, including after restarting Desktop. It does **not** translate or modify user-authored prompts, queued messages, or saved drafts.

Supported languages: **Turkish, English, German, French, Spanish, Italian, Portuguese (Brazil), Russian, Ukrainian, Polish, Dutch, Swedish, Japanese, Korean, Simplified Chinese, Arabic, Hindi, Indonesian, Vietnamese and Persian**. Arabic and Persian use right-to-left panel direction.

Localized: menu labels, list controls, batch/drag-and-drop instructions, confirmations and cost/safety warnings, plus the expandable **feature overview** in the panel. Common uncommon error diagnostics fall back to English for languages other than English/Turkish. The **TUI is not yet fully translated**; this release's 20-language selector applies to the Desktop GUI.

Read the [**20-language feature descriptions and safety notes**](docs/languages/README.md), or the [searchable HTML language page](https://bybrawe.github.io/OpenCode-Queue-Manager/languages.html). Community corrections and improvements are welcome.
