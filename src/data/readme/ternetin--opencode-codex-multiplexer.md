# @ternetin/opencode-codex-multiplexer

OpenCode TUI plugin for switching saved Codex/OpenAI auth profiles and showing Codex usage windows.

![OpenCode Codex usage sidebar](assets/opencode-session.png)

## Install

Add the TUI plugin to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@ternetin/opencode-codex-multiplexer"]
}
```

Optional hot-switch hook in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@ternetin/opencode-codex-multiplexer/server"]
}
```

Restart OpenCode after changing plugin config.

OpenCode installs npm plugins from config automatically. You do not need to run `bun add` unless you want to test or use the package from another JavaScript project.

For a local unpublished checkout, replace `/absolute/path/to/codexmx` with the checkout's absolute path:

```json
{
  "plugin": ["/absolute/path/to/codexmx/src/tui.tsx"]
}
```

```json
{
  "plugin": ["/absolute/path/to/codexmx/dist/server.js"]
}
```

## Commands

- `codexmx:save` saves current `auth.json` and, when present, `account.json` into a named Codex profile.
- `codexmx:switch` switches current live Codex auth to a saved profile.
- `codexmx:show` shows redacted debug info about live and selected auth.

Slash commands:

- `/codexmx-save`
- `/codexmx-switch` or `/codexmx`
- `/codexmx-show`

## Storage

Profiles are stored under:

```txt
$OPENCODE_DATA_DIR/codexmx/profiles/
```

Default `OPENCODE_DATA_DIR` is `~/.local/share/opencode`.

Profile files:

- `<name>.auth.json`
- `<name>.account.json`

The selected profile name is stored at:

```txt
$OPENCODE_DATA_DIR/codexmx/.current
```

Files are written with `0600` permissions.

## Hot Switch

The TUI switch copies the selected profile into the live `auth.json` and, when available, `account.json`, then updates `.current`. Usage API data refreshes without restart.

Model request hot-switch is best effort through the server plugin. It injects the selected profile bearer token in `chat.headers` for OpenAI/Codex-like providers. This affects new requests only. If OpenCode/provider code overwrites headers after plugin hooks, restart remains required.
