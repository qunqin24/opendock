<h1 align="center">OpenCode Souk</h1>

<p align="center">
  <strong>A marketplace for OpenCode extensions.</strong><br>
  Browse, inspect, compare, and install plugins, MCP servers, agents, commands, themes, and skills from inside the terminal.
</p>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

<p align="center">
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-souk"><img src="https://img.shields.io/npm/v/%40mirrowel%2Fopencode-souk/latest?label=latest&style=flat-square&color=blue" alt="npm latest version"></a>
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-souk"><img src="https://img.shields.io/npm/dm/%40mirrowel%2Fopencode-souk?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/Mirrowel/opencode-souk/releases"><img src="https://img.shields.io/github/v/release/Mirrowel/opencode-souk?style=flat-square&color=purple" alt="GitHub release"></a>
  <a href="https://github.com/Mirrowel/opencode-souk/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Mirrowel/opencode-souk/ci.yml?branch=main&style=flat-square&label=ci" alt="CI status"></a>
  <a href="https://github.com/Mirrowel/opencode-souk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#install">Install</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#goods-on-offer">Goods</a> &middot;
  <a href="#forge-with-kaf">Forge</a> &middot;
  <a href="#safety">Safety</a> &middot;
  <a href="#configuration">Config</a> &middot;
  <a href="#development">Development</a>
</p>

---

OpenCode Souk replaces the built-in plugin manager with a TUI marketplace for the wider OpenCode ecosystem. A **souk** is a market or bazaar: many stalls, many merchants, many useful goods under one roof. Souk brings community extension sources into OpenCode, merges duplicate listings into one stall, and lets you inspect provenance before anything touches your config.

Souk is built around three habits:

1. **Inspect first.** Press `i` on screens, menu actions, and items to see what they mean, where data came from, and what risk matters.
2. **Install carefully.** Native installs preview writes, create backups, preserve JSONC comments, and refuse conflicting overwrites.
3. **Ask Kāf when the map is incomplete.** Forge mode opens an experimental guided install session for ambiguous, custom, or high-risk goods.

## Name Lore

The names are part of the interface.

| Name | Meaning |
| --- | --- |
| **Souk** | From Arabic سُوق (*sūq*), meaning market or marketplace. Souk is the covered marketplace: useful goods, many stalls, many merchants, competing sources, and provenance checks before purchase. Also spelled *suq*. |
| **Forge** | The forge is where raw material becomes a fitted artifact. In Souk, your selected goods and install intent are shaped into an install plan, then into OpenCode config and files — only after approval. |
| **Kāf** | Kāf is Souk's appraiser-guide. The name plays on two related forms: Arabic كَفّ (*kaff*, palm of the hand) and the Semitic letter *kāf/kaph*, whose name traces back to a palm-of-hand pictogram. The two words differ in vowel length: the letter has a long *ā*, the word for palm a short *a*. The image holds either way: what is held in the hand should be inspected before it is accepted. |

References: [Dictionary.com — souk](https://www.dictionary.com/browse/souk), [Etymonline — souk](https://www.etymonline.com/word/souk), [Lane's Arabic-English Lexicon — سُوق](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A2002.02.0026%3Aroot%3Dswq%3Aentry%3DsuwqN), [Lane — كَفّ](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A2002.02.0044%3Aentry%3Dkaf%7EN), [Wikipedia — Kaph](https://en.wikipedia.org/wiki/Kaph), [Britannica — K](https://www.britannica.com/topic/K-letter).

## Why Souk?

OpenCode's ecosystem now includes more than plain plugins. Useful extensions can arrive as MCP servers, markdown agents, slash commands, themes, skills, apps, tools, and GitHub projects with partial metadata. A flat plugin list does not explain enough.

Souk treats each listing like a stall in a bazaar:

| Souk idea | What it means in OpenCode |
| --- | --- |
| Stall | One deduplicated marketplace item, even if multiple sources list it. |
| Provenance | Every source record that contributed to the item. |
| Appraisal | The `i` inspection view: confidence, source, install hint, warnings, and security notes. |
| Safe install | Deterministic native install for supported OpenCode extension shapes. |
| Souk Forge | Experimental Kāf-assisted planning/action flow for installs that need judgement. |

## Goods On Offer

| Good | Native support |
| --- | --- |
| Plugins | Uses OpenCode's plugin installer when available, with config patch fallback for tool-driven installs. |
| MCP servers | Writes OpenCode `mcp` config; can convert Claude `mcpServers` only after approval; can connect and authenticate at runtime. |
| Agents | Installs inline agent config or markdown agent files from conventional repo paths. |
| Commands | Installs command markdown files from inline snippets or conventional repo paths. |
| Themes | Installs theme JSON/config and can activate a theme when metadata is sufficient. |
| Skills | Installs `SKILL.md` folders, including companion files under the skill directory. |

Souk also lists tools, apps, projects, and resources when sources expose them. If an item is not a native OpenCode extension, Souk should not pretend it is; inspect it, then use Forge or install it manually with care.

## Sources

Souk fetches three community sources by default:

| Source | What Souk uses it for |
| --- | --- |
| `opencode.cafe` | Approved community extensions with structured metadata. |
| `awesome-opencode` | Broad ecosystem registry with names, tags, repos, homepages, and type hints. |
| OpenCode ecosystem docs | Official docs table for known ecosystem projects. |

When the same repo or install spec appears in multiple places, Souk merges those records into one item. The browser shows the best primary display record, while `i` inspection keeps every contributing source visible.

## Install

Install globally with OpenCode's plugin installer:

```sh
opencode plugin @mirrowel/opencode-souk@latest --global
```

Restart OpenCode after installation. Souk has both server and TUI entry points, so a full restart is the most reliable way to load the palette command, Kāf agents, and bundled skill.

### Manual Install

If you prefer to edit config yourself, add the package to both OpenCode config files.

`opencode.jsonc`:

```jsonc
{
  "plugin": ["@mirrowel/opencode-souk@latest"]
}
```

`tui.jsonc` (or `tui.json`):

```jsonc
{
  "plugin": ["@mirrowel/opencode-souk@latest"]
}
```

During TUI startup, Souk deactivates `internal:plugin-manager` and registers one palette command: `Plugin Manager > Souk`.

For local development, use a file URL or local path instead of the npm package name.

## Quick Start

1. Install the plugin globally.

```sh
opencode plugin @mirrowel/opencode-souk@latest --global
```

2. Restart OpenCode.

3. Open the command palette and run:

```txt
Plugin Manager > Souk
```

4. Choose `Browse items` to enter the marketplace.

5. Press `i` on anything unfamiliar before selecting it.

6. Press `Enter` to select one or more items, then `Space` to open the install menu.

## What It Looks Like

The marketplace browser is designed for keyboard-first inspection. `[ ]` means unselected, `[*]` means selected:

```txt
OpenCode Souk                         152 goods · search: mcp

sel kind     confidence source           name
--- -------- ---------- ---------------- --------------------------------
[ ] mcp      partial    opencode-docs    Context7 MCP
[ ] plugin   verified   opencode.cafe    Agent Memory
[*] agent    partial    awesome-opencode Code Reviewer

enter select · space install · / search · i inspect · r refresh · esc back
```

Item inspection shows the merged listing, all contributing sources, alternate kind guesses, install hints, warnings, and the security considerations for that good.

## Controls

| Key | Action |
| --- | --- |
| `Enter` | Select or unselect the highlighted marketplace item. |
| `Space` | Open the install menu for selected items. Requires an explicit selection. |
| `/` | Search marketplace items by name, alias, description, tag, kind, source, repo, or install spec. |
| `i` | Inspect the highlighted item, menu action, setting, backup, or screen. |
| `r` | Refresh community sources. |
| `Shift+Up/Down` or `Ctrl+Up/Down` | Jump between kind groups. |
| `Shift+Left/Right` | Jump between tag groups. |
| `Esc` | Go back or close the current dialog. |

Installed plugins live in a separate `Installed plugins` view. That screen is toggle-only: `Enter` activates/deactivates the highlighted plugin, `i` inspects it, `r` refreshes, and `Esc` returns.

<a id="forge-with-kaf"></a>

## Forge With Kāf

Forge is Souk's experimental workshop. It is where uncertain goods go when a deterministic native install is not enough.

Kāf is the Forge guide: a dedicated OpenCode agent pair that starts in read-only planning mode, inspects the item and its sources, performs a security review, and asks before switching to action mode. Think of Kāf as the bazaar's in-house appraiser: careful, skeptical, and useful when the label on a crate is not quite enough.

Kāf supports personality presets (`curio-shelf`, `wary-antiquarian`, `friendly-stallkeeper`, and more) that affect tone only; risk warnings stay direct and practical.

Use Forge when:

| Situation | Why Forge helps |
| --- | --- |
| Metadata is incomplete | Kāf can inspect the repo and installation docs before proposing a plan. |
| The item is not clearly native | Kāf can explain whether it is a plugin, MCP, agent, command, skill, theme, tool, app, or just a resource. |
| You want a second opinion | Kāf performs a security analysis even for verified items. |
| A batch needs coordination | Selected items are sent to one dedicated Forge session. |

Forge is disabled by default. Enable it from `Kāf Forge settings` or `souk.jsonc`.

## Safety

> The souk can make mistakes. Souk is a map, not an oracle.

That phrase appears whenever install confidence is below 100%.

Safety behavior:

- Native installs preview planned writes before execution.
- Supported native installs create a pre-install backup snapshot under `souk-install-backups/`.
- JSONC config patching preserves comments where possible.
- Existing files and conflicting config entries are refused, not overwritten.
- Claude `mcpServers` conversion requires explicit approval.
- Kāf must review source provenance, package risk, config writes, permissions, shell commands, OAuth/token handling, backups, and restart requirements.

## Configuration

Souk runs with sensible defaults. Create a sidecar config only when you want to override those defaults:

```txt
~/.config/opencode/souk.jsonc
```

On Windows, the default config directory is `%APPDATA%\opencode` unless `OPENCODE_CONFIG_DIR` or `XDG_CONFIG_HOME` is set.

Minimal Forge config:

```jsonc
{
  "forge": {
    "enabled": true
  }
}
```

Full reference: [docs/CONFIG.md](docs/CONFIG.md). Commented starter file: [`souk.example.jsonc`](souk.example.jsonc).

## Backups And Logs

| File | Purpose |
| --- | --- |
| `souk.backup.json` | Sidecar config restore journal. |
| `souk-install-backups/` | Pre-install snapshots for native installs. |
| `souk-cache.json` | Marketplace cache and per-source status. |
| `souk.debug.log` | Best-effort debug log when `debug` is enabled. |

Debug and UI-only config changes avoid backup spam. Meaningful settings saves create restore points.

## Development

Install dependencies:

```sh
npm install
```

Run the normal checks:

```sh
npm run typecheck
npm run build
npm run pack:dry-run
```

Run the full local CI:

```sh
npm run ci
```

Run live source and installer verification:

```sh
npm run verify:registry:live
npm run verify:install-plans
```

The live registry check verifies source counts, parsing, classification, dedupe provenance, and the integrated `loadRegistry()` path. The install-plan check uses a temporary OpenCode config directory and verifies plugin, MCP, Claude MCP conversion, agent, command, skill, and theme plans.

## Status

Souk is early software, but the core path is in place: three default sources, source-preserving dedupe, native installers for OpenCode's first-class extension shapes, install backups, and experimental Forge sessions. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for technical details.

## License

MIT
