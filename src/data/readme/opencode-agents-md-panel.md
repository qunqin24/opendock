# opencode-agents-md-panel

An OpenCode Desktop plugin for viewing and editing `AGENTS.md` instructions and Markdown agent definitions, and seeing which child agents are registered for a workspace.

## Install from npm

With [OpenCode Desktop V2](https://opencode.ai/) and the OpenCode CLI, run:

```sh
opencode plugin add opencode-agents-md-panel
```

If the CLI isn't on your PATH, add [`opencode-agents-md-panel`](https://www.npmjs.com/package/opencode-agents-md-panel) to the `plugins` array in your global `~/.config/opencode/opencode.jsonc` (or `opencode.json`), keeping any existing entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-agents-md-panel"]
}
```

OpenCode downloads the prebuilt plugin. No `npm install`, Git clone, or build is needed. Once it loads, open **Settings → AGENTS.md**. If you're switching from a local checkout, replace its plugin entry rather than adding a second one, and keep any options you want to retain.

To update manually, run `opencode plugin update opencode-agents-md-panel`. To uninstall, remove the entry from your global config or run `opencode plugin remove opencode-agents-md-panel`.

## Build and install from source

Requires Node.js 22+ to build and OpenCode Desktop V2 to run.

```sh
git clone https://github.com/wyattdave/opencode-agents-md-panel.git
cd opencode-agents-md-panel
npm ci
npm run build
```

Add the checkout's absolute path to the `plugins` array in `~/.config/opencode/opencode.jsonc`, preserving existing entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-agents-md-panel"]
}
```

Open **Settings → AGENTS.md** and select a workspace. Remove the entry from `plugins` to disable the panel.

## What it shows

The panel shows the conventional instruction-file chain:

1. **Global** — `~/.config/opencode/AGENTS.md` (or `$XDG_CONFIG_HOME/opencode/AGENTS.md`), falling back to `~/.claude/CLAUDE.md` when no global `AGENTS.md` exists.
2. **Project** — every `AGENTS.md` (or `CLAUDE.md` fallback) from the active workspace up toward your home directory (exclusive), or up to the project root for workspaces outside home.

Missing `AGENTS.md` creation targets are marked **not created**. The panel doesn't enumerate arbitrary config-based instructions or nested instructions loaded on demand.

**Registered child agents** comes from OpenCode's workspace agent API and includes built-ins and custom agents with mode `subagent` or `all`, including those marked hidden when returned by the API. This list is read-only; it does not change which agents a parent may launch.

**Agent definitions** lists editable `.md` files recursively under the global `agents/` and project `.opencode/agents/` folders. To include a source folder outside those locations, use the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{
    "package": "opencode-agents-md-panel",
    "options": {
      "extraAgentDirectories": ["/absolute/path/to/shared/agents"]
    }
  }]
}
```

Replace the existing plugin entry with this object; if you installed from source, keep your checkout path as `package`. Extra files appear separately. Adding a folder here does not register those agents or synchronize them with copies installed elsewhere. Only point the option at trusted, dedicated agent folders. Linked paths are not supported.

## Features

- Inline editor with `Ctrl+S` / `Cmd+S` to save and unsaved-changes confirmation.
- Workspace switcher when multiple projects are open.
- Copy file path and reveal in file manager actions.
- Edits are limited to the panel's discovered file set, with a 512 KiB per-file limit.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## License

[MIT](LICENSE)
