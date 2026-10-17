# opencode-subagent-statusline-v2

OpenCode **v2** TUI plugin: a live subagent sidebar and status footers for the OpenCode terminal UI — shows subagent sessions grouped under their parent, with running/completed/failed/interrupted counts.

Fork of [`opencode-subagent-statusline`](https://github.com/Joaquinvesapa/sub-agent-statusline) (v2.0.0) adapted for the OpenCode v2 plugin API (`{ id, setup(api) }` with `api.ui.slot`, `api.storage`, `api.data.session`).

## What it renders

- **Sidebar slot** (`sidebar.content`): subagent tree under the selected session — state per row (running / completed / failed / interrupted), token usage, duration.
- **Home & prompt footers**: `Subagents: N running` summary line.

## Install

```bash
opencode plugin add opencode-subagent-statusline-v2
```

or add it to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-statusline-v2"]
}
```

## Verification

Plugin loading is logged to `~/.local/share/opencode/log/opencode.log`. Look for:

```
msg="loading plugin" id=opencode-subagent-statusline-v2
```

## License

MIT. Upstream (c) Joaquin Vesapa; fork changes (c) roboalchemist.
