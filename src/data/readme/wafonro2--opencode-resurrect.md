# opencode-resurrect

OpenCode plugin that saves the active session ID in the project folder and restores that session when OpenCode starts.

## What it does

- Listens for `session.created`, `session.updated`, and `session.deleted` events.
- Writes `<project root>/.opencode-session-<YYYYMMDD-HHMMSSmmm>.txt` containing only the session ID.
- Avoids redundant writes by caching the last value written for each file.
- On startup, restores the most recent saved session in that project.

## Install from npm (recommended)

Add the published package to your OpenCode config.

Project config (`opencode.json` in your repo root):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@wafonro2/opencode-resurrect"]
}
```

Global config (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@wafonro2/opencode-resurrect"]
}
```

Then restart `opencode`. OpenCode installs npm plugins automatically at startup.

## Verify it works

1. Start `opencode` in a project.
2. Create or update a session.
3. Confirm a file like `.opencode-session-20260411-021857123.txt` appears in the project root.
4. Restart `opencode` in the same project and confirm the session restores automatically.

## Local development install (optional)

For local file-based plugin loading during development:

- `./install.sh --global` installs to `~/.config/opencode/plugins/`.
- `./install.sh --project /path/to/project` installs to `/path/to/project/.opencode/plugins/`.
