# Opencode: Never Stop Never Stopping

Your agent finishes a task and just sits there — tokens idle, deep thoughts unthought. This plugin makes opencode never stop: when the session goes quiet, it pokes the agent with a nudge from your config and gets it working again. No compute wasted, no babysitting.

[![npm version](https://img.shields.io/npm/v/opencode-never-stop.svg)](https://www.npmjs.com/package/opencode-never-stop)

## Install

opencode does **not** install slash commands from plugin packages — and this
plugin is switched on by its commands. So install the plugin *and* the commands,
either with the installer script (does both) or via npm plus a manual copy.

### From a repo checkout (recommended)

```bash
./scripts/install.sh                                            # macOS / Linux
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1  # Windows
```

This copies the plugin to `~/.config/opencode/plugins/`, the commands to
`~/.config/opencode/commands/`, and writes a default config. Re-run it after
pulling updates.

### Via npm

```bash
opencode plugin opencode-never-stop -g
cp ~/.cache/opencode/node_modules/opencode-never-stop/commands/*.md ~/.config/opencode/commands/
```

`opencode plugin` only installs the module and registers it in your config, so
the second step is required: without the commands the plugin loads but can never
be turned on.

Restart opencode afterwards.

## Usage

| Command                  | Effect                          |
| ------------------------ | ------------------------------- |
| `/opencode-never-stop`   | Start poking this session       |
| `/opencode-stop`         | Stop poking                    |

## Configure

Create `~/.config/opencode/opencode-never-stop.json`:

```json
{
  "checkIntervalSeconds": 15,
  "message": "Have you done all your assignments? If anything is left, continue — or spend some more time double-checking your work."
}
```

Two other locations are checked first, in order: the `OPENCODE_NEVER_STOP_CONFIG`
environment variable (a path), then `<project>/.opencode/opencode-never-stop.json`.

| Field                  | Default          | Description                              |
| ---------------------- | ---------------- | ---------------------------------------- |
| `checkIntervalSeconds` | `15`             | Idle seconds before the agent gets nudged |
| `message`              | the quote above  | What to tell the idle agent               |

That's it. The agent stays busy, you stay productive.