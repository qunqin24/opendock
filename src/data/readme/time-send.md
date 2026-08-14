# time-send

Publishable OpenCode plugin that delays provider calls until a configured local send window. It is built as an external plugin package with separate server and TUI targets.

Default behavior:

- Send window: `02:00 <= now < 09:00` local time.
- Before `02:00`: wait until today's `02:00`.
- From `02:00` through `08:59`: send immediately.
- At or after `09:00`: wait until the next local `02:00`.
- Malformed JSON or invalid times fail closed before any provider call.

The wait is process-local: if OpenCode exits while waiting, the request is not durable-rescheduled.

## Install

Local development config:

```json
{
  "plugin": [
    "file:///C:/Users/Zhang/opencode-timed-send"
  ]
}
```

After `npm view time-send@latest version` succeeds, replace the local file URL with the published package name in both `opencode.json` and `tui.json`:

```json
{
  "plugin": [
    "time-send@latest"
  ]
}
```

Keep the local `file:///C:/Users/Zhang/opencode-timed-send` entry active until the npm lookup succeeds. Switching active config to `time-send@latest` before publish will make OpenCode fail to load the plugin on restart.

The same package-name plugin entry is needed in `opencode.json` for server gating and `tui.json` for the TUI indicator. Do not use `time-send/tui` in `tui.json`: OpenCode installs the configured package spec first, then resolves the package's `./tui` export from that installed package.

No plugin option is required. `time-send` looks for `opencode-timed-send.json` by default: it first checks the active directory OpenCode provides, then falls back to `OPENCODE_CONFIG_DIR` or `$XDG_CONFIG_HOME/opencode`, so the JSON can live next to your active OpenCode config files without being referenced from `opencode.json` or `tui.json`.

## JSON Config

Create `opencode-timed-send.json` in the OpenCode config directory:

```json
{
  "$schema": "C:/Users/Zhang/opencode-timed-send/schema.json",
  "enabled": true,
  "start": "01:30",
  "end": "09:30",
  "statusFile": "opencode-timed-send.status.json",
  "display": {
    "promptRight": true,
    "appBottom": true
  }
}
```

Fields:

- `enabled`: set `false` to bypass waiting while keeping the plugin installed.
- `start`: local `HH:mm` window start.
- `end`: local `HH:mm` window end. The window is `[start,end)`.
- `statusFile`: relative to the JSON config directory, or absolute.
- `display.promptRight` / `display.appBottom`: legacy display toggles. If either is `true`, the TUI shows the indicator in the public `sidebar_content` slot.

Example waiting indicator:

```text
01:30 in 4h 12m
```

Example open-window indicator:

```text
window open until 09:30
```

## Status UI

The TUI target uses only public OpenCode TUI plugin APIs:

- `sidebar_content` for a sidebar indicator alongside the built-in sidebar blocks.
- `/timed-send-status` for a plugin-owned status command.
- `/time-send-now` to release the current timed-send wait through the shared status file.

OpenCode does not currently expose a public plugin slot for replacing the built-in lower-right progress spinner or injecting custom rows into the built-in `/status` dialog. This plugin therefore provides a supported external-plugin indicator instead of patching OpenCode core.

## Package Exports

The package exposes target-only OpenCode modules:

- `time-send/server`: default export `{ id, server }`.
- `time-send/tui`: default export `{ id, tui }`.
- `time-send/schema.json`: JSON schema for config editors.

The package root defaults to the server target for OpenCode package detection. The TUI target stays available through the `./tui` export while `tui.json` still points at the package name.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```

The tests cover config parsing, malformed JSON fail-closed behavior, `[02:00,09:00)` window semantics, DST-safe next-start calculation, status file read/write, server `chat.params` gating, TUI slot/command registration, and target-only package exports.

## Publish Checklist

1. Run `bun test`, `bun run typecheck`, and `bun run build`.
2. Verify `dist/server.js`, `dist/tui.js`, `schema.json`, `README.md`, and `LICENSE` are included by the `files` list.
3. Log in with `npm login`, confirm with `npm whoami`, then run `npm publish --dry-run`.
4. Publish with `npm publish` only after the dry run reports package `time-send@0.1.4` and the expected files.
5. Verify the network package with `npm view time-send@latest version`, then replace the local plugin entries with `time-send@latest` and restart OpenCode.

## GitHub Checklist

1. Initialize and commit the repository locally.
2. Create an empty GitHub repository named `time-send`.
3. Add the SSH remote, for example `git remote add origin git@github.com:<owner>/time-send.git`.
4. Push with `git push -u origin main`.

## License

MIT. See `LICENSE`.
