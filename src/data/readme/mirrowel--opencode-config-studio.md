<h1 align="center">OpenCode Config Studio</h1>

<p align="center">
  <strong>The visual config editor for OpenCode.</strong><br>
  Every setting, every file, one studio — with provenance, staged saves, and a request capture that shows exactly what gets sent.
</p>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

<p align="center">
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-config-studio"><img src="https://img.shields.io/npm/v/%40mirrowel%2Fopencode-config-studio/latest?label=latest&style=flat-square&color=blue" alt="npm latest version"></a>
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-config-studio"><img src="https://img.shields.io/npm/v/%40mirrowel%2Fopencode-config-studio/dev?label=dev&style=flat-square&color=orange" alt="npm dev version"></a>
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-config-studio"><img src="https://img.shields.io/npm/dm/%40mirrowel%2Fopencode-config-studio?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/Mirrowel/opencode-config-studio/releases"><img src="https://img.shields.io/github/v/release/Mirrowel/opencode-config-studio?style=flat-square&color=purple" alt="GitHub release"></a>
  <a href="https://github.com/Mirrowel/opencode-config-studio/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Mirrowel/opencode-config-studio/ci.yml?branch=dev&style=flat-square&label=ci" alt="CI status"></a>
  <a href="https://github.com/Mirrowel/opencode-config-studio/blob/dev/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-config-studio">Why</a> ·
  <a href="#what-it-looks-like">Tour</a> ·
  <a href="#editing-safety">Editing Safety</a> ·
  <a href="#request-capture">Capture</a> ·
  <a href="#keyboard">Keyboard</a> ·
  <a href="#where-things-live">Map</a> ·
  <a href="#agent-variants-module">Agent Variants</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#development">Development</a>
</p>

---

OpenCode's configuration is spread across layered JSONC files, a TUI config, markdown agent files, a models.dev catalog, and internal defaults. Config Studio turns all of that into one navigable TUI: you see what's in effect, where each value came from, what it actually does — and you change it without ever touching a JSON file by hand (or without fear, if you still prefer to).

It also embeds [Agent Variants](https://github.com/Mirrowel/opencode-agent-variants) as a module — the full feature set, integrated into the Agents screen. More Mirrowel plugins are planned as modules: [Souk](https://github.com/Mirrowel/opencode-souk), the plugin manager, is next in line.

## Why Config Studio?

A few problems this exists to solve:

- **"Which file wins?"** OpenCode merges global config, `OPENCODE_CONFIG`, project configs walking up the tree, and `.opencode` directories. When something behaves unexpectedly, the answer is usually buried in that merge. The studio parses every layer itself and badges each value with its source — including "this is just the models.dev catalog" and "this is OpenCode's internal default".
- **"What does default actually send?"** Selecting no variant isn't "sending nothing" — it's a per-SDK base defaults table you can't normally see. The studio computes it, lets you override it per model (`models.<id>.options` — change the default, change every default invocation), and can capture the real outgoing request to prove what happens.
- **"I don't want to hand-edit JSONC."** Fair. Everything editable in the config files is editable here with pickers, suggestions, docs, and validation. And when you do edit by hand elsewhere, a save-time guard detects outside changes and shows the diff before overwriting.
- **"Did my edit break anything?"** Nothing writes immediately. Edits stage in memory, every view previews the post-save state, and one review screen shows the full diff before anything touches disk.
- **"What do I not know about?"** Every field has an `[i]` help view with the allowed values, defaults, and a source citation into OpenCode's code. There's also a shipped reference doc covering every setting.

## What It Looks Like

The main menu, with the Quick access section and staged-change counter:
<img width="1065" height="485" alt="image" src="https://github.com/user-attachments/assets/da3e2834-43e5-49a7-93e3-975956d41312" />

A model's page shows its variants with source badges (catalog / config / hidden), the default-options view (base defaults ⊕ your overrides), which agents use it, and the capture actions:

<img width="1060" height="352" alt="image" src="https://github.com/user-attachments/assets/1c857b5f-2669-4ad9-bace-86111c305da6" />
<img width="1063" height="313" alt="image" src="https://github.com/user-attachments/assets/46319848-1562-4512-85e3-ef68f35a87aa" />
<img width="1054" height="298" alt="image" src="https://github.com/user-attachments/assets/1b92a3df-4d32-4598-9b89-b297be7882d6" />
<img width="1049" height="452" alt="image" src="https://github.com/user-attachments/assets/1e5e9d75-3d7a-43e7-b8e1-51dded3ab063" />

Settings groups present every root key as a field row — current value, provenance, timing badge, `[i]` docs:

<img width="1045" height="368" alt="image" src="https://github.com/user-attachments/assets/31765eb3-5768-457c-b44a-b0c74806cea2" />

## Editing Safety

1. **Pick happens implicitly.** The studio suggests the file that currently wins the merge for the value you're editing and warns when a higher-precedence file would shadow your change.
2. **Nothing writes until you say so.** Edits are staged in memory and overlaid onto the parsed files — every view already shows the post-save state.
3. **Save & exit writes everything together.** Each staged edit becomes a minimal JSONC text patch via jsonc-parser (the same library OpenCode uses), so comments, formatting, and unrelated keys survive. A snapshot of the previous content lands in `~/.config/opencode/config-studio/backups/`.
4. **Atomic + verified.** Temp file + rename, then read-back verification. If a file changed on disk since you staged, you get an outside-change diff and an explicit confirm before it's overwritten.
5. **One reload, honest restart notes.** OpenCode reloads its config once (instance disposal); changes that need a restart are summarized in red, like Agent Variants does.

## Request Capture

The capture button spawns a temporary headless `opencode serve` in a temp directory with an inline env config that redirects the target provider's `baseURL` to a local listener on `127.0.0.1`. The provider keeps its real ID and SDK package, so base defaults and serialization match reality exactly. A minimal prompt goes through the full pipeline — system prompt, tools, the whole merge chain — and the outgoing body is captured at the listener.

- Nothing reaches any real provider. No config file is modified. The temp session is deleted and the server shut down afterwards.
- Heavy sections (`messages`, `tools`, ...) are collapsed by default; toggles persist.
- **A/B mode** captures two configurations and diffs the bodies — the empirical answer to "what does this variant actually change?"

<img width="717" height="152" alt="image" src="https://github.com/user-attachments/assets/56134c71-7c86-4fa4-b07c-ee3ea66cb09a" />
<img width="1051" height="310" alt="image" src="https://github.com/user-attachments/assets/7777b63e-32b9-4aa9-9a5a-d99afe4b4dd1" />
<img width="1041" height="702" alt="image" src="https://github.com/user-attachments/assets/5fd5744f-271f-47f5-b1b2-c00ea22c9e7b" />


## Fast Navigation

- **Quick access** — the two staples (Providers & models, Agents) are always at the top. Press `f` on any deeper screen's menu to pin it there too; pins persist.
- **`/` search in every menu** — opens a search box that locks the keyboard: letters type, backspace edits, Enter saves the filter (list stays filtered, footer shows it), Esc clears.
- **`[i]` everywhere** — field help injected with the live value, provenance, and a `Source:` citation into OpenCode's code.
- **Sections** — long paged views (diagnostics, captures, how-it-works) scroll with the mouse or scrollbar; `n`/`p` and `1-9` jump between sections.

## Keyboard

| Key | Action |
| --- | --- |
| `up`/`down`, `ctrl+p`/`ctrl+n` | move |
| `enter` | select |
| `i` | help for the highlighted row |
| `/` | search the menu (Enter saves, Esc clears) |
| `f` | pin/unpin this screen to Quick access (deep screens) |
| `n`/`p`, `1-9` | next/previous section, direct section jump (paged views) |
| `esc` | back exactly one level |

## Where Things Live

| You want to change | Screen |
| --- | --- |
| Root `model` / `small_model`, default agent | Settings → Models & agents |
| Any root key (sharing, autoupdate, shell, instructions, skills, ...) | Settings → its group |
| Providers — including adding custom ones (SDK, base URL, keys, models) | Settings → Providers (full universe, green = enabled) |
| Model entries — limits, cost, modalities, status, default options | Provider entry → Models, or the explorer's model page |
| Variants of a model (add/edit/clone/disable/delete) | Explorer → model detail |
| Agents — model, variant, params, prompt, description, color, options | Agents |
| MCP servers, permissions, slash commands, references | Settings → Tools & files |
| Theme, keybinds (184 commands), cursor, sounds, TUI toggles | TUI settings |
| Installed plugins (both config families) | Plugins |
| Deprecated keys on old configs | Cleanup & migrations |
| What changed and what's about to be written | Review staged changes |

The complete menu map ships in the package: [`docs/TUI_MAP.md`](docs/TUI_MAP.md).

## Reference Docs

Both ship inside the npm package:

- **`docs/SETTINGS_REFERENCE.md`** — every setting with its type, allowed values, defaults, behavior, edge cases, and source citations into OpenCode's code. Verified against the OpenCode source; re-verified on update.
- **`docs/TUI_MAP.md`** — the full TUI map: which option lives in which menu, links vs editors, navigation rules.

## Install

```sh
opencode plugin @mirrowel/opencode-config-studio@latest --global
```

Requires OpenCode with TUI plugin support (`@opencode-ai/plugin` >= 1.14.0). Registering the server side in `opencode.json` is enough — the plugin wires its TUI registration into `tui.json` automatically (and removes the standalone Agent Variants entry if you had one, with a restart notice).

Use `@mirrowel/opencode-config-studio@dev` for the prerelease channel.

## Quick Start

1. Install and restart OpenCode.
2. Open the palette → **Config Studio: Configure** (or `/config-studio`).
3. Take a look around: **Providers & models** → your provider → a model → `[i]` on anything. Provenance badges tell you which file (if any) sets what you're seeing.
4. Change something — say, your main model's default reasoning effort: model detail → Default options → Copy from variant.
5. **Save & exit** shows the staged diff, writes with a backup, reloads config once.
6. Optionally press the capture button on that model and check what actually gets sent now.

## Agent Variants module

The full [agent-variants](https://github.com/Mirrowel/opencode-agent-variants) feature set runs as a studio module: variant management and parent fields on each agent's page, model presets on the Agents screen, merged diagnostics and docs.

- **Integrated layout (default):** variants live on the Agents screen. **Own-menu layout:** one Agent Variants entry opens the full wizard (Modules screen toggles this).
- **Saves are staged** into the studio's unified queue, like everything else.
- **Routing:** the embedded server router activates only when the standalone plugin isn't registered and the module is enabled; a duplicate install is detected at startup with an offer to remove it.
- The standalone plugin remains fully independent and keeps working on its own — see its [README](https://github.com/Mirrowel/opencode-agent-variants) for the variant system itself (sidecar config, routing internals, selection presets, backups).

## Roadmap

The studio is built as a module host — Agent Variants is the first module, not a special case. Next up:

- **[OpenCode Souk](https://github.com/Mirrowel/opencode-souk)** — the OpenCode plugin manager (browse, install, and update plugins). Souk is still incomplete, but it will be developed alongside this plugin so the two grow together: first-class config editing and plugin management in one place — MCP servers, plugins, skills, agents, all included.

## Development

```sh
npm install
npm run ci:package   # typecheck + build + unit tests + menu-tree/startup/reactivity smokes + pack + package smoke
```

The TUI is precompiled with OpenTUI's Solid transform (`npm run build:tui`) — raw TSX exports don't repaint reactively in npm-installed plugins.

Developing against a local agent-variants checkout: `node scripts/dev-link.mjs link && npm install` (switch back with `unlink <version>`; releases refuse `file:` dependencies).

## Additional Screenshots

<img width="1056" height="323" alt="image" src="https://github.com/user-attachments/assets/4b1eb7f9-a9a7-4371-8714-1272f714ee71" />
<img width="1051" height="366" alt="image" src="https://github.com/user-attachments/assets/ba05823f-b3a9-47af-889e-e20bc63a5b0c" />


## License

MIT
