# Opencode: Never Stop Never Stopping

Your agent finishes a task and just sits there — tokens idle, deep thoughts unthought. This plugin makes opencode never stop: when the session goes quiet, it pokes the agent with a nudge from your config and gets it working again. No compute wasted, no babysitting.

[![npm version](https://img.shields.io/npm/v/opencode-never-stop.svg)](https://www.npmjs.com/package/opencode-never-stop)

## Install

```bash
# npm
opencode plugin opencode-never-stop -g

# or locally, straight from this repo
./scripts/install.sh   # macOS / Linux
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1  # Windows
```

Restart opencode. Done.

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

| Field                  | Default          | Description                              |
| ---------------------- | ---------------- | ---------------------------------------- |
| `checkIntervalSeconds` | `15`             | Idle seconds before the agent gets nudged |
| `message`              | the quote above  | What to tell the idle agent               |

That's it. The agent stays busy, you stay productive.