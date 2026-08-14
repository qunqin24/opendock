# opencode-skill-usage

[![npm version](https://img.shields.io/npm/v/opencode-skill-usage.svg)](https://www.npmjs.com/package/opencode-skill-usage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

OpenCode plugin that records skill invocations and auto-registers a `/skill-usage` slash command for querying the stats.

- **Write**: `tool.execute.before` + `command.execute.before` hooks record every skill invocation — both agent-initiated calls and user slash-commands.
- **Query**: a `config` hook auto-registers the bundled `skill-usage` command so it is available as `/skill-usage` with zero extra configuration.

Zero runtime dependencies, plain JavaScript ESM.

## Install

Add the plugin to `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": ["file:///absolute/path/to/opencode-skill-usage"]
}
```

For npm installs:

```jsonc
{
  "plugin": ["opencode-skill-usage"]
}
```

Restart OpenCode. The `/skill-usage` command is registered automatically by the plugin's `config` hook — no `skills.paths` or manual skill setup needed.

## Usage

Run `/skill-usage` in the TUI, or just ask the agent:

- "Show me skill call stats"
- "Which skill was called the most in the last 7 days"
- "How many skill calls happened inside the opencode-image-vision project"

The command injects the skill body (query templates + log format docs) into the session, and the agent aggregates the log as requested.

The agent also triggers the query automatically when the conversation mentions skill usage statistics or reports — even content that looks like plain context or notes — since the injected skill body instructs it to treat such content as an active request.

## Log location

The `skill-usage.log` file is written to the opencode config directory, independent of where the plugin is installed:

- `~/.config/opencode/skill-usage.log`

Because the log lives outside the plugin package directory, upgrading or reinstalling the plugin never deletes it.

Each line is TSV with 4 columns:

```
timestamp	skill name	project directory	call_type
[2026/08/10 23:28:22]	tech-briefing	/Users/showlotus/Desktop/MyCode/xxx	manual
```

The timestamp is local time in `[YYYY/MM/DD HH:MM:SS]` format. The call_type is manual (user slash-command) or auto (agent-initiated).

## Manual aggregation

```bash
# Count calls per skill name, highest first
cut -f2 ~/.config/opencode/skill-usage.log | sort | uniq -c | sort -rn
```

## How it works

```
opencode.json plugin entry
        ↓
plugin loaded → config hook fires
        ↓
registers /skill-usage command (template = bundled SKILL.md body)
        ↓
tool.execute.before / command.execute.before hooks
append TSV rows to skill-usage.log on every skill invocation
```

The `config` hook works because Command init runs after Plugin config hooks (the Command layer depends on the Skill layer, which finishes before Command starts).

## Project layout

```
opencode-skill-usage/
├── package.json          # npm manifest, files includes plugin/ and skills/
├── plugin/
│   └── index.js          # config hook (register command) + tool/command execute hooks (write log)
├── skills/
│   └── skill-usage/
│       └── SKILL.md      # query templates, used as the command template
└── README.md
```

## License

MIT
