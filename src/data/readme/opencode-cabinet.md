# opencode-cabinet

Five Ming-cabinet-style role agents for [opencode](https://opencode.ai), modeled on the
cabinet workflow used in Qoder. Works on both runtimes from one package:

- **OpenCode 2** — the default export's `setup(ctx)` registers an `agent.transform`
  that upserts the five roles and sets the default agent.
- **opencode 1.x** — the `server(input, options)` export returns a `config` hook that
  injects agent definitions into the merged config (the oh-my-openagent pattern).

User-defined entries always win over the shipped defaults, key by key, on both runtimes.

## The roster

| Agent | Mode | Role |
|---|---|---|
| `grand-secretary` | primary | Captain. Frames the task, breaks it into subtasks, dispatches members with the `task` tool, adjudicates conflicts, consolidates the deliverable. |
| `hanlin-researcher` | subagent | Research and drafting. Gathers and screens sources, separates facts from inference, writes the report draft. |
| `works-executor` | subagent | Hands-on work. Runs code, experiments and data collection, produces output files — the only member allowed to edit the workspace. |
| `court-reviewer` | subagent | Verification. Audits evidence chains, logic and counterexamples; rejects substandard conclusions with concrete remediation requirements. |
| `censor-inspector` | subagent | Final acceptance. Checks subtask completion, conclusion/evidence separation and open issues; the task is done only when it passes. |

The workflow is a closed loop: the Grand Secretary dispatches, members report back, the
Court Reviewer bounces anything weak, and the Censor Inspector gives the final verdict.
The Grand Secretary's prompt mandates acceptance before declaring completion.

The plugin also sets `default_agent` to `grand-secretary`, so opencode opens in the
captain instead of `build` — every session starts with him framing and dispatching the
work. An explicit `default_agent` in your config wins over the plugin.

## Install

### From npm (recommended)

Add the package name to the `plugin` array in `opencode.json` (global
`~/.config/opencode/opencode.json` or per-project `.opencode/opencode.json`):

```json
{
  "plugin": ["opencode-cabinet"]
}
```

That's it. opencode installs npm plugins automatically with Bun at startup
(cached under `~/.cache/opencode/node_modules/`) — no manual `npm install`.
Restart opencode, then confirm:

```bash
opencode plugin list           # shows opencode-cabinet
```

One-command alternative (writes the config for you):

```bash
opencode plugin add opencode-cabinet    # OpenCode 2
opencode plugin opencode-cabinet -g     # opencode 1.x
```

### With the installer script

The package ships `scripts/install.js`, which wires the plugin into the config file
for you — idempotent, backs up before writing, and refuses to touch a file it cannot
parse (e.g. JSONC):

```bash
cd opencode-cabinet
npm install                      # postinstall runs the installer
# or run it directly:
node scripts/install.js          # global ~/.config/opencode/opencode.json
node scripts/install.js --project /path/to/project   # <project>/.opencode/opencode.json
node scripts/install.js --config /path/to/opencode.json
node scripts/install.js --dry-run                    # show, don't write
```

### Local path plugin

Point opencode at the directory in `opencode.json`:

```json
{
  "plugin": ["/absolute/path/to/opencode-cabinet"]
}
```

Restart opencode after changing the config, then check:

```bash
opencode agent list
```

## Options

Per-agent model overrides, in case you want a different model for different roles:

```json
{
  "plugin": [
    [
      "opencode-cabinet",
      {
        "models": {
          "grand-secretary": "anthropic/claude-sonnet-5",
          "works-executor": "openai/gpt-6.1-mini"
        }
      }
    ]
  ]
}
```

Agents without an override inherit opencode's default model.

## Permissions

Permissions are part of the design, not decoration:

- The **Grand Secretary** may read, search the web and dispatch to the four members, but
  cannot edit files or run shell commands — hands-on work goes through the Works Executor.
- The **Works Executor** is the only member with `edit: allow`.
- The **Court Reviewer**, **Hanlin Researcher** and **Censor Inspector** can read, search
  and run read-only shell commands for reproduction, but cannot edit.
- No subagent can fan out to further subagents (`task: deny`); only the captain dispatches.

A user-defined entry for the same agent name in `opencode.json` overrides these defaults
key by key, so you can widen or tighten any rule without forking the plugin. The key is
`agents` on OpenCode 2 (`"agents": { "grand-secretary": { ... } }`) and `agent` on
opencode 1.x; OpenCode 2 also renamed two permission actions — `bash` becomes `shell`
and `task` becomes `subagent` — which this plugin maps automatically.

## Layout

```
opencode-cabinet/
├── package.json        # entrypoint (main / exports["./server"]), postinstall wiring
├── index.js            # plugin: default export { id, setup, server }; v2 agent.transform + v1 config hook
├── scripts/
│   └── install.js      # install-time config wiring (idempotent, backup, JSONC-safe)
├── agents/             # one prompt file per role, English
│   ├── grand-secretary.md
│   ├── hanlin-researcher.md
│   ├── works-executor.md
│   ├── court-reviewer.md
│   └── censor-inspector.md
├── test/sandbox/       # minimal opencode.json loading the plugin by path
└── test/sandbox-npm/   # minimal opencode.json loading the plugin by npm name
```

## Verify

```bash
# OpenCode 2
opencode debug agents         # lists all agents (JSON)
opencode api GET /api/agent   # first id = the resolved default agent

# opencode 1.x
opencode agent list           # should show the five cabinet agents
opencode agent list --pure    # baseline without external plugins

# full resolved config of one agent (prompt, description, color, permissions)
opencode debug agent grand-secretary     # 1.x
```

To verify the online npm path exactly as another user would experience it, isolate the
global config so only the sandbox's `"plugin": ["opencode-cabinet"]` applies:

```bash
cd test/sandbox-npm
XDG_CONFIG_HOME=$(mktemp -d) opencode debug agents   # five agents = auto-install worked
```

`test/sandbox-override` additionally exercises the `models` option and a user-defined
agent entry overriding the shipped defaults key by key.

## Credits

Registration pattern follows [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)
(config-hook agent injection); the role design follows the Qoder cabinet setup.
