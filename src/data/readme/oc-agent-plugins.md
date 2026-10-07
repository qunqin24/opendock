# oc-agent-plugins

An OpenCode v2 plugin that loads [Agent Plugins](https://agent-plugins.org/) 1.0.0 packages, plus Claude Code, Codex and Cursor plugins. Their skills, MCP servers, commands, rules and agents show up in OpenCode as if you'd configured them by hand. Each format and each component type can be turned off.

Plugin skill IDs and displayed names use `<plugin>:<skill>`. Rule-backed skills use `<plugin>:rule-<rule>`. OpenCode's skill registry has no separate owner tag; prefixes make the origin visible without changing the vendor skill's source or content.

## Install

### Manage vendor packages with npx

The package includes the `oc-agent-plugins` CLI. It runs on Node without requiring Bun and installs vendor packages into the directories this adapter discovers.

```sh
npx oc-agent-plugins install cloudflare/skills
npx oc-agent-plugins install ./my-plugin --global
npx oc-agent-plugins install https://github.com/acme/plugins.git --ref main --subdir plugins/review
npx oc-agent-plugins list
npx oc-agent-plugins info cloudflare
npx oc-agent-plugins update cloudflare
npx oc-agent-plugins update --all
npx oc-agent-plugins disable cloudflare
npx oc-agent-plugins enable cloudflare
npx oc-agent-plugins uninstall cloudflare
npx oc-agent-plugins doctor
```

Project scope is the default, using the current directory's `.opencode/agent-plugins/`. Use `--project /path/to/project` for an explicit project or `--global` for OpenCode's global vendor directory. `OPENCODE_CONFIG_DIR` and the XDG/home fallback are respected. `--json` gives machine-readable results.

Successful JSON results are written to stdout. Failures write a JSON error object to stderr and exit with status 1. `update --all` runs serially and stops on the first failure; earlier successful updates are retained.

`help --json` returns an object with `command` and `help` fields. `version --json` returns a `version` field.

Installations are copied snapshots with ownership receipts and content fingerprints. Updates refresh the recorded local source or Git ref. Edited or unmanaged packages are never overwritten; a plugin's persistent runtime data is retained on uninstall. Disable/enable keeps a managed package outside/inside discovery without changing OpenCode settings.

The CLI does not start OpenCode, connect MCP servers, execute package scripts or grant hooks/monitor trust. You still need to load the OpenCode adapter separately and configure trust explicitly when needed. After changing installations, run `/agent-plugins` in OpenCode to rescan.

When the adapter is loaded, run the same management commands directly in OpenCode:

```text
/agent-plugins-manage install cloudflare/skills
/agent-plugins-manage install "./my plugin" --global
/agent-plugins-manage list
/agent-plugins-manage update --all
/agent-plugins-manage disable cloudflare
/agent-plugins-manage doctor
```

The native command defaults to the invoking session's directory and accepts the CLI's options. It calls the manager directly without spawning `npx`, evaluating shell expressions or asking the model to perform the operation. Results do not resume the model. Run `/agent-plugins` separately to rescan after mutations.

Agents can call the structured `agent_plugins_manage` tool when the adapter is loaded. For example:

```json
{ "action": "install", "source": "cloudflare/skills" }
```

Use `name` for named operations, `all: true` for bulk updates and `global: true` for global scope. Git installation also accepts `ref` and `subdir`. The tool uses the invoking session's directory and returns JSON results or safe diagnostic errors.

The tool asks for explicit approval through OpenCode's native question tool before every invocation, including inventory reads. A missing or denied question tool blocks the operation. The management tool's deny policy also remains enforced. There is no approval-bypass argument, vendor execution trust grant or automatic rescan.

Package management runs on Linux, macOS and Windows with Node 22.14 or newer. Git is only required for repository sources. GitHub shorthand, HTTPS and SSH Git URLs (including `ssh://git@host/repository.git`) are supported; archives, npm packages and submodules are not installation sources.

Source symlinks, Windows junctions and special files are rejected. Reads check canonical containment and file identity before and after reading. Linux also checks opened descriptor paths when available. Portable Node APIs cannot guarantee containment against an untrusted process repeatedly swapping directories between checks. Source and managed directories must not be concurrently writable by untrusted processes.

An interrupted mutation fails closed. `doctor` reports the adjacent `.agent-plugins-manager` state directory; the CLI does not automatically break locks or delete journals/backups. Before manual recovery, stop concurrent CLI commands, preserve that directory and inspect the journal's source, target and backup paths. Do not delete a lock just because it looks old. Disabled snapshots live in the adjacent `.agent-plugins-disabled` directory.

Once published on npm, add `oc-agent-plugins` to OpenCode's `plugins` array. The public source is [theacrat/oc-agent-plugins](https://github.com/theacrat/oc-agent-plugins).

For a local checkout, point `plugins` in `opencode.json(c)` at this directory. It has to be the directory, not `index.ts`, because OpenCode only accepts a directory as a local plugin path.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "/path/to/oc-agent-plugins",
      "options": {
        "discovery": { "paths": ["~/src/my-plugins"] },
        "formats": { "cursor": false },
        "components": { "rules": false },
      },
    },
  ],
}
```

If you don't need options, symlinking the directory into `~/.config/opencode/plugins/` or `.opencode/plugins/` also works.

## Settings layout

Settings inside the OpenCode plugin entry's `options` have two groups of responsibility:

- **Feature settings** configure discovery, storage, formats and individual component types.
- **`plugins.<name>`** keeps every setting for one imported plugin in one place. Use its manifest name, not its folder name.

Only set what you need. Defaults still load skills, agents, commands and MCP servers; hooks and monitors require explicit per-plugin trust.

| Group            | Settings                                                                                                                 | Default                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `discovery`      | `paths`                                                                                                                  | No extra paths                                     |
| `storage`        | `dataDir`                                                                                                                | `$XDG_DATA_HOME/opencode/agent-plugins`            |
| `formats`        | `agent-plugins`, `claude`, `codex`, `cursor` booleans                                                                    | All on                                             |
| `components`     | `skills`, `agents`, `mcp`, `rules`, `hooks`, `monitors`, `lsp` booleans                                                  | All on; trust still required for execution         |
| `commands`       | `enabled`, `shellInjection`                                                                                              | Both on                                            |
| `styles`         | `enabled`, `selected` (`plugin:name`), `allowSystemReplacement`                                                          | Enabled; no selected style; system replacement off |
| `plugins.<name>` | `enabled`, `components`, `hooks.trusted`, `monitors.trusted`, `configuration`, `agents.modelAliases`, `mcp.appEndpoints` | Normal activation; no trust or supplied values     |

Unknown fields are reported with their full path. Malformed nested settings reject the configuration rather than silently changing trust. There is no legacy layout or migration support.

## Where plugins are found

The search paths are `~/.agents/plugins`, `$OPENCODE_CONFIG_DIR/agent-plugins` (fallback `$XDG_CONFIG_HOME/opencode/agent-plugins`, then `~/.config/opencode/agent-plugins`), `<project>/.agents/plugins`, `<project>/.opencode/agent-plugins`, and everything in `discovery.paths`. The first plugin found with a given name wins.

### Global vendor packages

Put portable, Claude, Codex or Cursor packages in `~/.config/opencode/agent-plugins/` to make them available across projects. `OPENCODE_CONFIG_DIR` takes precedence and names the OpenCode directory itself, so use `$OPENCODE_CONFIG_DIR/agent-plugins/` when set. Otherwise `XDG_CONFIG_HOME` selects `$XDG_CONFIG_HOME/opencode/agent-plugins/`, with the normal user config path as the fallback. Empty environment overrides are treated as unset, matching native OpenCode.

```sh
git clone https://github.com/cloudflare/skills ~/.config/opencode/agent-plugins/cloudflare
```

This is not `~/.config/opencode/plugins/`, which OpenCode uses for executable native plugins. The adapter must be loaded separately.

### Project-only installation

Put portable, Claude, Codex or Cursor packages in `.opencode/agent-plugins/` to make them available only in that project:

```sh
git clone https://github.com/cloudflare/skills .opencode/agent-plugins/cloudflare
```

No global installation or extra discovery setting is needed. The adapter itself must still be loaded by OpenCode, either globally or from the project's `opencode.json(c)` plugin entry.

Do not confuse this directory with `.opencode/plugins/` or `~/.config/opencode/plugins/`: OpenCode loads native executable plugins from those locations. This adapter discovers vendor packages from `.opencode/agent-plugins/` without importing their manifests as native OpenCode code.

Each search path can be any of these:

- A plugin root.
- A marketplace (`.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` or `.agents/plugins/marketplace.json`). Only local `source` entries are followed. Git, URL and npm entries are counted and reported, because installing them is the host tool's job.
- A directory whose immediate children are plugin roots or marketplaces.

A directory containing more than one manifest loads once, using the first enabled format in this order: `agent-plugins` (root `plugin.json`), `claude`, `codex`, `cursor`. Turning a format off lets the next one claim the directory. If two plugins share a name, the first one found wins and the other is reported.

## What you get

| Source                                 | OpenCode                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Skills from every format               | Skill `<plugin>:<skill>`                                                  |
| MCP servers from every format          | MCP server `<plugin>-<server>`. Stdio becomes local, HTTP becomes remote. |
| Claude `commands/`, Cursor `commands/` | Command `/<plugin>:<command>`                                             |
| Cursor rules with `alwaysApply: true`  | Added to the system prompt on every agent request                         |
| Other Cursor rules                     | Skill `<plugin>:rule-<name>`, with any globs listed in the description    |

The plugin also adds `/agent-plugins`. It rescans everything, reloads it, and posts a report into the session showing each plugin's format, what loaded, and every diagnostic. It doesn't start a model turn.

### Format details

- **Agent Plugins** follow the spec strictly. See [Conformance](#agent-plugins-conformance).
- **Claude Code**: reads `.claude-plugin/plugin.json` (optional when a marketplace lists the plugin), `skills/` plus any declared `skills`, and `commands/` or declared `commands`, including the inline object form. `.mcp.json` and declared `mcpServers` are merged, with later names winning.
  - `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are expanded in MCP config and in skill and command bodies. `${CLAUDE_SKILL_DIR}` is expanded in skill bodies.
  - `${VAR}` and `${VAR:-default}` read the OpenCode server's environment in MCP config only. They're never expanded in Markdown bodies. This matches Claude Code, and it's how the GitHub plugin's `Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}` header works. It also means a Claude plugin can send any variable from the OpenCode server's environment to its own MCP host, so only load Claude plugins you'd trust with that. To opt out, turn off `claude` in `formats`, or set `components.mcp` to false.
  - Commands follow Claude's argument rules: `$ARGUMENTS`, 0-based `$N` and `$ARGUMENTS[N]`, named `arguments`, and the trailing `ARGUMENTS:` fallback. They also run `` !`cmd` `` injection in the session directory. Injections only come from the command file itself. Anything in the text you type after the command is never run.
  - A Claude plugin with no manifest still loads when a marketplace lists it. Codex and Cursor plugins need their manifest.
  - `disable-model-invocation` hides a skill from the model, but you can still load it by ID.
- **Codex**: reads `.codex-plugin/plugin.json`, `skills/` plus any declared `skills`, `.mcp.json` and declared `mcpServers`. `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` are expanded, along with their `CLAUDE_` aliases. Enablement, OAuth, timeouts and tool availability/approval policies are preserved. Settings native V2 cannot preserve reject that server instead of weakening its policy.
- **Cursor**: reads `.cursor-plugin/plugin.json`, `skills/`, `rules/`, `commands/` and `mcp.json`. A declared path replaces the default location. A root `SKILL.md` counts as a single-skill plugin. `${CURSOR_PLUGIN_ROOT}` is expanded. Commands use OpenCode's own argument rules.

See [the compatibility audit](docs/compatibility-audit.md) for native support, opt-in bridges and actual API blockers. Unsupported security-sensitive server settings reject the server; they are never silently ignored.

## Diagnostics

Every problem is logged to the OpenCode server log with an `[agent-plugins]` prefix, and also shows up in the `/agent-plugins` report. Problems are isolated: a bad skill, server or command skips only itself, and a bad manifest skips only that plugin.

## Agent Plugins conformance

- `plugin.json` is validated against the closed schema. Unknown fields and a non-object `extensions` are reported and ignored. Every other violation rejects the plugin.
- Only the 1.0.0 `$schema` identifiers are accepted, and schemas are never fetched.
- Every package path is checked after resolving symlinks on both sides. Escapes are handled at the narrowest boundary: the whole plugin, one component type, one skill, or one server.
- Skills come only from the immediate children of `skills/`, and they're validated against the Agent Skills spec.
- `mcp.json` must match the plugin's spec version. A bad document disables MCP for that plugin only, and a bad entry skips only that server.
- `command` is a single token, either a bare name or `./`-relative. `cwd` must be `./`, `${PLUGIN_ROOT}` or `${PLUGIN_DATA}` rooted and stay inside its root.
- `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` are expanded once, with no rescanning, in `args`, `env` values and `cwd` only.
- `env` can't set `PLUGIN_ROOT` or `PLUGIN_DATA`, and on Windows that check is case-insensitive.
- Remote URLs must be absolute http(s) with no user info or fragment, and https unless the host is loopback. Header names must be valid and unique regardless of case.

## Develop

```sh
bun install
bun run check                         # oxlint, oxfmt --check, vitest
bun run inspect <path>...             # what OpenCode would get; exits 1 on any error
bun run inspect --no-claude <path>    # turn a format off
```

Source files import each other through the `#src/*` subpath import in `package.json`. That's because OpenCode runs `src/` as raw TypeScript, where tsconfig `paths` don't apply. A lint rule enforces it.

[cloudflare/skills](https://github.com/cloudflare/skills) ships all four manifests and is the real-world fixture. CI clones it at a pinned commit, and locally `CLOUDFLARE_SKILLS=/path/to/checkout bun run test` runs the same check. `examples/hello` is a minimal Agent Plugin with a dependency-free stdio MCP server.

Release and trusted-publisher setup are documented in [docs/publishing.md](docs/publishing.md).

### Agents

Claude and Cursor `agents/` files (or declared `agents` paths) become OpenCode subagents named `<plugin>:<agent>`. Their prompts, descriptions, colours, step limits and tool restrictions are mapped. Restricted tools are never widened to unrestricted grants. Claude model aliases such as `sonnet` and `opus` inherit the session model and produce a warning; explicit `provider/model` values are retained. Set `components: { agents: false }` to disable agent registration.

## Per-plugin settings

This is an example `options` object. It belongs inside the OpenCode plugin entry, not in the imported plugin's manifest. The two plugins are configured independently, and each feature's options sit together.

```jsonc
{
  "discovery": {
    "paths": ["~/src/my-plugins"],
  },
  "components": {
    "skills": true,
    "agents": true,
    "mcp": true,
    "rules": true,
    "hooks": true,
    "monitors": false,
    "lsp": true,
    "commands": { "enabled": true, "shellInjection": false },
    "styles": { "enabled": true, "selected": "my-plugin:concise" },
  },
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "components": {
        "mcp": false,
        "commands": { "shellInjection": true },
      },
      "hooks": { "trusted": true },
      "monitors": { "trusted": false },
      "configuration": {
        "userConfig": {
          "tenant": "public",
          "api_token": { "env": "PLUGIN_API_TOKEN" },
        },
      },
      "agents": {
        "modelAliases": { "sonnet": "anthropic/claude-sonnet-4-5" },
      },
      "mcp": {
        "appEndpoints": {
          "asdk_app_example": { "url": "https://example.com/mcp" },
        },
      },
    },
    "unwanted-plugin": { "enabled": false },
  },
}
```

For a Cursor plugin, put `variables` and optionally `publicVariables` inside that plugin's `configuration` group. Sensitive values use environment references, never literal credentials. App endpoint mappings are scoped to their owning plugin, even when two plugins use the same app ID.

- **Configuration:** Claude `userConfig` and Cursor variable declarations are validated, including required fields/defaults. Sensitive values must use environment references. Cursor variables default to sensitive; only names in `publicVariables` may enter model bodies. Secrets are rejected in prompt bodies, rules, descriptions and runtime exports.
- **Hooks:** supported command/exec tool hooks translate vendor inputs, matchers and outputs. Explicit `plugins.<name>.hooks.trusted` opt-in is required. Events or decisions without an equivalent contract are reported precisely; failed pre-tool translation blocks execution. This is a tested subset, not complete vendor hook parity.
- **Styles:** `/agent-plugins-style plugin:name` selects a style for that session; `clear` removes the selection. Forced plugin styles take precedence. Styles that discard coding instructions require explicit `components.styles.allowSystemReplacement: true`, because V2 cannot isolate that part of the assembled system prompt.
- **Rules:** matching file-tool calls activate Cursor glob-scoped rules for subsequent requests in that session. Arbitrary shell file access is not tracked.
- **Monitors:** `/agent-plugins-monitors start` explicitly starts trusted monitors; `stop` terminates them. Process ownership, output limits, aborts, session deletion and reload/unload cleanup are enforced. POSIX only; Windows process-group termination is not implemented.
- **LSP:** `/agent-plugins-lsp` produces a validated project-config fragment. It never writes configuration. Unsupported LSP operational fields are rejected rather than lost.
- **Apps:** `.app.json` IDs resolve only through explicit `appEndpoints` mappings. Those endpoints receive normal MCP validation/policies. No OpenAI app endpoint or credential is inferred.
- **Export-only runtimes:** `/agent-plugins-export` shows workflows, themes and channel declarations with bridge requirements. Workflow scripts are never evaluated in the server. There is no safe Claude-isolated workflow runtime, native vendor theme importer or Claude channel notification/routing API in this adapter.

`enabled: false` and `disabled: true` MCP servers stay disabled. Exact tool allowlists and denylists filter the catalog and are rechecked at execution; `prompt` approval requests permission without overriding configured denies. OAuth `false` and validated native-compatible settings are retained. Timeout seconds are converted to native milliseconds. An environment whitelist (`env_vars`), dynamic header helper, unsupported OAuth resource/policy, SSE/WebSocket transport or bundle archive rejects that entry with remediation. It is not substituted with a less restrictive connection.

### Per-plugin component overrides

`plugins.<name>.components` has the same shape as the global `components` object. Omitted settings inherit global values. An explicit `true` or `false` overrides the global switch for that plugin only. Command and style objects inherit each omitted field individually.

```jsonc
{
  "components": {
    "agents": false,
    "mcp": true,
    "commands": { "enabled": true, "shellInjection": false },
  },
  "plugins": {
    "my-plugin": {
      "components": {
        "agents": true,
        "mcp": false,
        "commands": { "shellInjection": true },
      },
    },
  },
}
```

Here only `my-plugin` gets agents, its MCP servers are disabled, and only its commands may perform shell injection. Other component defaults and every other plugin remain unchanged. Hook/monitor enablement does not grant trust; their separate per-plugin trust opt-ins are still required. A per-plugin `components.styles.selected` may use a local style name; only one enabled plugin can supply a default selected style for a session.
