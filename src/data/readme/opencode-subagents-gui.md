# OpenCode Subagents (Desktop GUI)

Create, edit, override and delete **subagents** in OpenCode Desktop's Settings, and track the ones
running in the current session from a side panel. The plugin writes ordinary Markdown agent files,
picks models from the models OpenCode already knows, exposes the advanced agent properties, and
keeps the side panel focused on live runs.

The Desktop plugin pattern is based on
[`opencode-usage-gui`](https://github.com/nguyenhoanhson797/opencode-usage-gui) (MIT): one server
entry for RPC and file access, one `./gui-experimental` bundle for the window.

## Features

- **Settings › Subagents**: the full agent manager. It lists the Markdown agents in the current
  project and globally, plus the built-in and config-defined agents that are not files.
- **CRUD**: create, edit and delete `agents/*.md` files. Nested ids such as `team/reviewer` create
  the matching folders.
- **Override**: pick a built-in (`general`, `explore`, `build`, `plan`) or a config-defined agent,
  and write a Markdown definition with the same id.
- **Model picker**: every chat model OpenCode returns, grouped by provider, with the provider's
  variants (`low`, `high`, `max`, …). “Inherit parent session model” is always available.
- **Advanced properties**: `description`, `mode`, `steps`, `color`, `hidden`, `disabled`,
  ordered `permissions`, and the `request` header/body overlay.
- **Side panel tracker only**: the child sessions under the current session, indented by depth,
  with running/done/failed status, model, tokens, cost, elapsed time, and Open/Stop actions. A
  **Manage agents** button jumps to Settings.
- **Settings page**: surface switches, default save location, live refresh interval, whether
  hidden agents list, and the exact agents folders.
- **No config edits**: agent changes go to Markdown files, and OpenCode is asked to reload its
  agent list. The plugin never edits `opencode.json`.

## Files it manages

| Scope | Folder |
| --- | --- |
| Global | `~/.config/opencode/agents/` (`$XDG_CONFIG_HOME/opencode/agents` when set) |
| Project | `<session directory>/.opencode/agents/` |

A file named `reviewer.md` becomes agent `reviewer`; `team/reviewer.md` becomes
`team/reviewer`. The Markdown body is the system prompt. Each write is validated and confined to
the agents directory; ids cannot contain `..`, separators outside `/`, Windows reserved names, or
more than six segments.

## Install

One command. It installs into your **global** OpenCode setup, so every window has it, and needs no
`opencode.json` edit.

### npm

```sh
opencode plugin add opencode-subagents-gui
```

### GitHub release, no npm account

**Windows** (PowerShell):

```powershell
irm https://github.com/nguyenhoanhson797/opencode-subagents-gui/releases/latest/download/install.ps1 | iex
```

**macOS, Linux, WSL**:

```sh
curl -fsSL https://github.com/nguyenhoanhson797/opencode-subagents-gui/releases/latest/download/install.sh | sh
```

The script downloads the built plugin into `~/.config/opencode/plugins/opencode-subagents-gui`,
which OpenCode loads automatically. If Windows says a file is in use, close Desktop and run it
again.

### After installing

Open OpenCode Desktop. **Settings → Extensions → Plugins** lists `subagents-desktop` with its
switch on, and **Settings › Subagents** is the editor. If you previously added the plugin to
`opencode.json` by hand, remove that entry so it does not load twice.

| Task | Command |
| --- | --- |
| Update | Run the same install command again. |
| Check | `opencode plugin list` |
| Update from npm | `opencode plugin update opencode-subagents-gui` |
| Uninstall | `opencode plugin remove opencode-subagents-gui`, or delete the plugin folder. |

Requirements: OpenCode Desktop with the experimental GUI plugin API, built against
`@opencode/plugin` 2.3.2. The web/mobile client does not load GUI plugin bundles.

### From a checkout (unreleased code)

```sh
git clone https://github.com/nguyenhoanhson797/opencode-subagents-gui.git
cd opencode-subagents-gui
pnpm install
pnpm build
pnpm selftest        # parser and file-CRUD checks, in the OS temp folder
```

Point the **global** config at the directory:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-subagents-gui"]
}
```

Window changes reload when the bundle is rebuilt; server changes load once per Desktop start.

## Use

Open a session and use any of:

- the **Subagents** tab in the side panel to watch live runs;
- **Settings › Subagents** to create, edit, override and delete agents;
- `/subagents` in the composer;
- **Open subagents** in the command palette;
- **New subagent** in the palette, which opens Settings with the editor ready;
- the **Subagents** item in the side panel's `+` menu.

### The editor

- **Agent ID** is the file name. It is fixed while editing an existing file.
- **Save in** chooses the global or current-project agents folder.
- **Description** is shown to the model when it chooses a subagent. It is required for a
  subagent.
- **Mode** is `subagent`, `primary`, or `all`.
- **Model** is `provider/model`, with an optional `#variant`. Leave it on
  “Inherit parent session model” to use the parent's model.
- **System prompt** is written as the Markdown body.
- **Advanced** contains the remaining V2 frontmatter fields and the request overlay. Unknown
  frontmatter keys already in a file are preserved when the file is saved.

A saved file looks like:

```md
---
description: "Reviews changes for correctness"
mode: subagent
model: "ltn/claude-sonnet-5-5#high"
color: "#ff6b6b"
steps: 8
permissions:
  - action: "edit"
    resource: "*"
    effect: "deny"
---

Review the current changes. List findings in severity order with file and line references.
```

### Live tracking

The side panel's **In this session** section is the whole tab: it polls the child sessions of the
routed session (direct and nested, up to four levels). A row shows the agent id, session title,
status, model, token total, API-equivalent cost, and elapsed or updated time. Running rows offer
**Stop**; every row offers **Open subagent session**. The refresh interval is set in Settings, or
turned off.

## Permissions and safety

- The plugin writes only inside `~/.config/opencode/agents` and
  `<session>/.opencode/agents`. Every path is resolved and checked against its base directory.
- It makes no network request. Models and agents come from OpenCode's local API.
- It adds no tools and no session/context hooks; the model cannot call the plugin.
- It edits no OpenCode configuration file. Deleting an agent deletes its Markdown file after the
  app's confirmation dialog.
- Request header/body overlays are preserved in the file. The V2 runner does not send them with
  requests yet; use provider/model settings for active request options.

## Limitations

- Markdown agent files are editable. Agents defined in `opencode.json` are read-only here; use
  **Override** to create a Markdown definition with the same id.
- The live tracker reads child sessions. It does not show subagents that ran before the current
  session view, and it does not show shell background tasks.
- Overriding a built-in copies its *effective* settings, including merged permissions. Review
  the copied rules before saving if you only meant to change the model or prompt.
- Desktop only.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Plugin is not under Settings → Extensions → Plugins | Run `opencode plugin list`, or check the global folder `~/.config/opencode/plugins/opencode-subagents-gui`. Desktop lists plugins when its own server is selected. |
| `opencode` is not recognized (Windows) | Desktop ships the CLI inside the app: `%LOCALAPPDATA%\Programs\@opencode-aidesktop\resources\opencode-cli.exe`. Put an `opencode.cmd` shim in a folder on your `PATH`, or use the release installer, which needs no CLI. |
| Settings › Subagents lists nothing | That scope has no Markdown agent files yet. Use **New subagent**, or check the resolved global and project folders shown on the same Settings page. |
| The side panel tab is empty | It lists the child sessions of the routed session. Run a task that delegates to a subagent first. |
| The model picker is empty | Models come from OpenCode's local API; connect a provider before choosing one. |

## Development

```sh
pnpm typecheck
pnpm build
pnpm selftest
pnpm preview        # local preview harness on http://127.0.0.1:5199
```

`pnpm build` writes both halves: `dist/server` (plain ESM) and
`dist/gui-experimental.cjs` (CommonJS for OpenCode Desktop). The build script mirrors the
`opencode-usage-gui` build: staged output and in-place moves so a running app never sees a missing
bundle.

## License

MIT. The Desktop plugin structure and build approach are adapted from
[`opencode-usage-gui`](https://github.com/nguyenhoanhson797/opencode-usage-gui), also MIT.
