# opencode-claude-hooks

[![CI](https://github.com/Hamza-Abili/opencode-claude-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamza-Abili/opencode-claude-hooks/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40hamzaabili%2Fopencode-claude-hooks)](https://www.npmjs.com/package/@hamzaabili/opencode-claude-hooks)
[![npm downloads](https://img.shields.io/npm/dt/%40hamzaabili%2Fopencode-claude-hooks)](https://www.npmjs.com/package/@hamzaabili/opencode-claude-hooks)
[![GitHub stars](https://img.shields.io/github/stars/Hamza-Abili/opencode-claude-hooks?style=social)](https://github.com/Hamza-Abili/opencode-claude-hooks/stargazers)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Run your Claude Code hooks natively in OpenCode V1 and V2.**

`opencode-claude-hooks` reads the Claude Code configuration you already have
(`.claude/settings.json`, `settings.local.json`, `~/.claude/settings.json`,
enabled plugin hooks, skill and subagent frontmatter) and executes it at the
matching OpenCode lifecycle point. No wrapper binary, no generated files, no
daemon, zero runtime dependencies.

```text
Claude Code settings  ─┐
Claude plugin hooks   ─┼─▶  discovery ─▶ trust ─▶ execute ─▶ decision
Skill/agent frontmatter┘                                    │
                                                   OpenCode hooks
```

## Why

Claude Code hooks are small, useful, and already written: block `rm -rf`, run a
formatter after edits, inject project context at session start, validate a
prompt, stop a turn until tests pass. Moving to OpenCode should not mean
rewriting them.

The existing bridge ecosystem covers commands, agents and skills, or provider
auth, but not the hook runtime. This plugin is the missing layer, with the
safety rails a hook runner needs: explicit trust, timeouts, output limits,
environment minimisation, and an honest compatibility report.

## Install

### OpenCode V2

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@hamzaabili/opencode-claude-hooks",
      "options": { "trust": "user" }
    }
  ]
}
```

### OpenCode V1

V1 uses the legacy `plugin` list (singular) and the same package:

```jsonc
{
  "plugin": [
    ["@hamzaabili/opencode-claude-hooks", { "trust": "user" }]
  ]
}
```

V2 requires OpenCode **2.2.1 or newer** (the first release with the
`experimental.idle` hook used for Stop/SubagentStop). V1 requires 1.19.5 or
newer. Windows is not tested; use WSL.

Restart OpenCode. The plugin logs:

```text
[opencode-claude-hooks] ready (sources=2, trust=user)
```

It then runs hooks from:

- `~/.claude/settings.json`
- `<project>/.claude/settings.json`
- `<project>/.claude/settings.local.json`
- the managed settings file, when present
- enabled Claude plugins (`hooks/hooks.json`, manifest `hooks` paths and inline hooks)
- `.claude/skills/*` plugins enabled with `@skills-dir`
- Claude subagent frontmatter (`~/.claude/agents`, `.claude/agents`)
- OpenCode skills with `hooks:` frontmatter (V2 registry, V1 filesystem scan)

## Quick start

Keep your existing hook:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

`block-rm.sh` is the canonical Claude example:

```sh
#!/bin/sh
COMMAND=$(cat | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0
fi
```

OpenCode now blocks the same command, with the same reason shown to the model.
`updatedInput`, `additionalContext`, exit code `2`, `continue: false` and
`systemMessage` work as documented by Claude Code. `suppressOutput` is parsed
but has no effect in OpenCode.

## Compatibility

### Events

| Claude event | V2 | V1 | Notes |
| --- | --- | --- | --- |
| `SessionStart` | yes | yes | Context is injected before the first model call. |
| `UserPromptSubmit` | yes | yes | Can add context or block; V1 blocks by throwing before the turn. |
| `PreToolUse` | yes | yes | Deny, ask, allow and `updatedInput`. `allow` means the hook has no objection; OpenCode's own permission rules still apply. V1 has no interactive ask, so `ask` is denied. |
| `PostToolUse` | yes | yes | `additionalContext` is appended to the tool result; block replaces it. |
| `PostToolUseFailure` | yes | no | V1 has no reliable failure hook. |
| `Stop` | yes | partial | V2 continues with a synthetic message; V1 only observes. |
| `SubagentStart` | yes | partial | V1 reports the child session; agent type may be `general`. |
| `SubagentStop` | yes | no | V1 cannot distinguish a child idle reliably. |
| `PreCompact` | yes | yes | Hook instructions are added to the compaction prompt; blocking is not honoured. |
| `PostCompact` | yes | yes | Observational. |
| `SessionEnd` | yes | yes | Fired on session deletion, not on process exit. |
| `Notification` | yes | partial | Permission requests; V1 shape is limited. |
| `StopFailure` | yes | yes | Observational. |

Recognised but **not** executed: `Setup`, `PermissionRequest`,
`UserPromptExpansion`, `PermissionDenied`, `PostToolBatch`, `MessageDisplay`,
`TaskCreated`, `TaskCompleted`, `TeammateIdle`, `InstructionsLoaded`,
`ConfigChange`, `CwdChanged`, `DirectoryAdded`, `FileChanged`,
`WorktreeCreate`, `WorktreeRemove`, `PreModelSwitch`, `PostModelSwitch`,
`Elicitation`, `ElicitationResult`. The doctor lists them explicitly; they are
never silently dropped.

### Handler types

| Type | Status | Notes |
| --- | --- | --- |
| `command` | yes | Shell or exec form (`args`), `timeout`, `statusMessage`, `once`, `async`, `onFailure`, `if`. JSON on stdin. |
| `http` | yes | POST JSON, header env interpolation, host allowlist, no redirects, timeout. |
| `prompt` | V2 only | Opt-in with `allowPromptHooks`; uses `ctx.experimental.generate.text`. |
| `mcp_tool` | no | Needs an MCP tool dispatcher that the plugin API does not expose. |
| `agent` | no | Needs a nested agent runner. |

`async` hooks run in the background but cannot wake the model (`asyncRewake`
is accepted and ignored). `once` is honoured in memory for the plugin process.

## Doctor

V2 exposes a `claude_hooks_status` tool and a `/claude-hooks` command. The same
report is available without OpenCode:

```sh
npx @hamzaabili/opencode-claude-hooks doctor
npx @hamzaabili/opencode-claude-hooks doctor --json --directory ./repo
```

It lists every source, scope, trust state, event/handler count, unsupported
entries, and untrusted fingerprints. V1 has no dynamic command/tool registry,
so use the CLI for the same report.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `trust` | `"user"` | `user` trusts user/managed settings; `all` trusts everything; `none` only trusts `trusted`; `prompt` forces `claude_hook` permission checks to `ask` through an evaluate hook (V2). |
| `trusted` | `[]` | Trusted hook fingerprints or source IDs. |
| `trustFile` | `~/.config/opencode/claude-hooks-trust.json` | Trust store, written atomically with mode `0600`. `XDG_CONFIG_HOME` is not used, so a repository `.env` cannot relocate it. |
| `managedSettings` | system path | Explicit managed settings file; must be outside the project. |
| `sources` | `[]` | Extra settings files or directories. |
| `plugins` | `[]` | Extra Claude plugin directories. |
| `disabledEvents` | `[]` | Events to skip entirely. |
| `allowHttpHooks` | `true` | Disable HTTP hooks. |
| `allowPromptHooks` | `false` | Enable prompt hooks (they spend model tokens). |
| `httpAllowlist` | `[]` | Allowed hostnames (supports `*`); empty allows any host. |
| `inheritEnv` | `false` | Pass the full process environment to command hooks. |
| `env` | `{}` | Extra environment variables. |
| `defaultTimeoutSec` | `600` | Default per-hook timeout. |
| `maxTimeoutSec` | `3600` | Hard timeout ceiling. |
| `maxOutputBytes` | `1048576` | stdout/stderr/HTTP body cap. |
| `promptModel` | selected model | Model used by prompt hooks, as `provider/model`. |
| `trace` | unset | Opt-in JSONL trace path (no payloads or command text; messages redacted). |
| `maxStopContinuations` | `3` | Stop-hook loop guard per session. |

## Security

Hooks are arbitrary local code. They run with the same operating-system
privileges as OpenCode. Treat a hook exactly like a script you are about to
run; the plugin cannot sandbox it.

The plugin still applies several boundaries:

- **Project hooks are untrusted by default.** `trust: "user"` trusts only
  user and managed settings. Project, local, plugin, skill and agent hooks
  need an explicit fingerprint. `trust: "prompt"` asks through OpenCode's
  permission UI (V2) and stores the approval with mode `0600`.
- **Fingerprints cover behaviour.** Command, args, shell, URL, headers,
  prompt, model and `if` rule are hashed; changing any of them requires a new
  approval. Presentation fields (`timeout`, `statusMessage`, `once`) do not.
- **No ambient secrets.** Command hooks receive a small allowlist (`PATH`,
  `HOME`, `USER`, `LANG`, `TERM`, `TMPDIR`, locale variables) plus
  `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` and
  `CLAUDE_HOOK_EVENT`. `inheritEnv: true` is an explicit opt-out.
- **Bounded execution.** Timeouts kill the process group, output is capped,
  HTTP redirects are disabled, and HTTP hosts can be allowlisted.
- **No raw output logging.** Trace entries contain event, source, status,
  exit code, duration and a redacted one-line message. Raw hook stdout/stderr
  is not logged. Explicit `systemMessage` values are printed to stderr after
  redaction on the lifecycle paths that surface them.

Read [SECURITY.md](SECURITY.md) before enabling hooks from a repository you do
not control.

## Differences from Claude Code

- `transcript_path` is an empty string: OpenCode has no Claude transcript file.
- `permission_mode` is `plan` for the plan agent and `default` otherwise.
- `Setup` and `PermissionRequest` have no faithful OpenCode equivalent.
  A PreToolUse `ask` decision opens the normal OpenCode permission prompt.
- `mcp_tool` and `agent` handlers are reported as unsupported.
- Prompt hooks are opt-in and use an OpenCode model, not Claude.
- `asyncRewake` cannot wake the model; use a synchronous hook when the result
  must affect the turn.
- V1 cannot continue a Stop hook or prompt for trust; see the matrix above.

## Support

- Bugs: [open an issue](https://github.com/Hamza-Abili/opencode-claude-hooks/issues/new/choose)
  with the bug template and include `doctor` output.
- Mapping questions: use [Discussions](https://github.com/Hamza-Abili/opencode-claude-hooks/discussions),
  not an issue.
- Security: [private advisory](https://github.com/Hamza-Abili/opencode-claude-hooks/security/advisories/new),
  never a public issue.

## Development

```sh
bun install
bun run ci        # biome + tsc + tests + build + smoke
bun run smoke     # doctor against a temporary fixture
```

The repository has no runtime dependencies. The plugin runs inside OpenCode's
Bun runtime; the published CLI is a Node-compatible bundle. If Bun is present,
frontmatter is parsed with `Bun.YAML`; otherwise a small built-in YAML subset
keeps the doctor working.

## License

MIT. See [LICENSE](LICENSE).
