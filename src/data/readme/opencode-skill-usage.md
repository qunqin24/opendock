# opencode-skill-usage

[![npm version](https://img.shields.io/npm/v/opencode-skill-usage.svg)](https://www.npmjs.com/package/opencode-skill-usage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

OpenCode plugin (v1 and v2) that records skill invocations and auto-registers a `/skill-usage` slash command for querying the stats.

- **Write**: skill invocations are recorded to JSONL — both agent-initiated calls (`auto`) and user slash-invocations (`manual`).
- **Query**: the plugin auto-registers the bundled `skill-usage` command so it is available as `/skill-usage` with zero extra configuration.

Zero runtime dependencies, plain JavaScript ESM. One package supports both plugin APIs:

- **opencode 1.x** — `server()` hooks: `config`, `tool.execute.before`, `command.execute.before`
- **opencode 2.x** — `setup()` domain APIs: `command.transform`, `tool.hook("execute.before")`, `session.hook("prompt")`

## Install

Add the plugin to `~/.config/opencode/opencode.json`.

OpenCode 2.x uses the `plugins` array:

```jsonc
{
  "plugins": ["opencode-skill-usage"]
}
```

OpenCode 1.x uses the singular `plugin` array:

```jsonc
{
  "plugin": ["opencode-skill-usage"]
}
```

For local installs, point at the package directory instead:

```jsonc
// v2
{
  "plugins": ["file:///absolute/path/to/opencode-skill-usage"]
}
// v1
{
  "plugin": ["file:///absolute/path/to/opencode-skill-usage"]
}
```

Restart OpenCode. The `/skill-usage` command is registered automatically by the plugin — no `skills.paths` or manual skill setup needed.

## Usage

Run `/skill-usage` in the TUI, or just ask the agent:

- "Show me skill call stats"
- "Which skill was called the most in the last 7 days"
- "How many skill calls happened inside the opencode-image-vision project"

The command injects the skill body (query templates + log format docs) into the session, and the agent aggregates the log as requested.

The agent also triggers the query automatically when the conversation mentions skill usage statistics or reports — even content that looks like plain context or notes — since the injected skill body instructs it to treat such content as an active request.

## Log location

The `skill-usage.jsonl` file is written to the opencode config directory, independent of where the plugin is installed:

- `~/.config/opencode/skill-usage.jsonl`

Because the log lives outside the plugin package directory, upgrading or reinstalling the plugin never deletes it. On upgrade from older versions, a legacy TSV `skill-usage.log` is converted to JSONL once at plugin startup, then removed.

Each line is one JSON object (JSONL):

```
{"timestamp":"2026/08/10 23:28:22","skill":"tech-briefing","directory":"/Users/showlotus/Desktop/MyCode/xxx","call_type":"manual"}
```

The timestamp is local time in `YYYY/MM/DD HH:MM:SS` format. The call_type is manual (user slash-command) or auto (agent-initiated).

## Manual aggregation

```bash
node -e 'const r=require("fs").readFileSync(process.env.HOME+"/.config/opencode/skill-usage.jsonl","utf8").trim().split("\n").filter(Boolean).map(JSON.parse),c={};r.forEach(x=>c[x.skill]=(c[x.skill]||0)+1);console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+"\t"+k).join("\n"))'
```

## How it works

```
opencode.json plugin/plugins entry
        ↓
plugin loaded
        ↓
v1: config hook registers /skill-usage (template = bundled SKILL.md body)
v2: setup() registers /skill-usage via ctx.command.transform
        ↓
v1: tool.execute.before / command.execute.before hooks
v2: ctx.tool.hook("execute.before") + command executor + session prompt hook
append JSONL lines to skill-usage.jsonl on every skill invocation
```

On v1 the `config` hook works because Command init runs after Plugin config hooks (the Command layer depends on the Skill layer, which finishes before Command starts). On v2, `setup()` registers the command through `ctx.command.transform`, records agent-initiated skill tool calls (skill input is now `{ id }`), records the `/skill-usage` command itself, and records skills selected via slash through the session prompt hook.

## Project layout

```
opencode-skill-usage/
├── package.json          # npm manifest, files includes plugin/ and skills/
├── plugin/
│   └── index.js          # dual entry: v1 server() hooks + v2 setup() registrations, JSONL writer
├── skills/
│   └── skill-usage/
│       └── SKILL.md      # query templates, used as the command template
└── README.md
```

## License

MIT
