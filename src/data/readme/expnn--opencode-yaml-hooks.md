# opencode-yaml-hooks

`opencode-yaml-hooks` is an OpenCode plugin that loads hook definitions from `hooks.yaml` and runs command, tool, or bash actions on session and tool lifecycle events.

Use it to run tests after edits, lint changed files, block risky commands before they run, or trigger local automation without another LLM step.

## Runtime compatibility

This package ships a single default export with two entrypoints: `server()` for OpenCode v1 and `setup()` for OpenCode v2. Each runtime calls the entrypoint it understands and ignores the other key.

| | OpenCode v1 | OpenCode v2 |
|---|---|---|
| Supported versions | `>=1.18.29 <2` | 2.0.x (verified against 2.0.18) |
| Plugin config key | `plugin` | `plugins` (legacy `plugin` also accepted) |
| Entrypoint | `server()` | `setup()` |
| Failure notification | `client.tui.showToast` | same-package `./tui` entry via the `hookFailed` RPC event, with a server-log fallback |

OpenCode documents v1 object entrypoints as supported from 1.18.29. A 1.16.0 build was observed to load this package during testing, but it is outside the declared range and the behavior of the object entrypoint on older v1 releases is not verified.

## Install

### OpenCode v1

Register it in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@expnn/opencode-yaml-hooks"]
}
```

### OpenCode v2

Register it in your `opencode.json(c)`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@expnn/opencode-yaml-hooks"]
}
```

v2 accepts both the legacy `plugin` key and the new `plugins` key. When the package is configured, the CLI also loads its TUI companion entry automatically (the package exposes `./tui`), so no `cli.json` entry is needed.

### Local directory installs

You can run the plugin from a local directory instead of the npm package.

v1 auto-discovers local plugin files in `.opencode/plugin/` (the v1 loader also scans `.opencode/plugins/`). Place the built server entry there, for example:

```
.opencode/plugin/opencode-yaml-hooks.js   # built from index.js
```

v2 discovers local plugins under `.opencode/plugins/` (plural) and `.opencode/plugin/` (singular), and also loads a plugin directory referenced by path in `opencode.json(c)`. Relative paths, absolute paths, `file://` URLs, and the `{ "package": ... }` object form are all accepted:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-yaml-hooks"]
}
```

A plugin directory must expose its entries as files at the **directory root**: opencode v2 resolves a directory plugin by looking for a root-level code file (`index.*` is preferred) and does not read `main`/`exports` from the directory's `package.json`, so a package layout that keeps its bundles only in `dist/` is skipped silently:

```
opencode-yaml-hooks/
├── index.js   # server entry: v1 server() + v2 setup()
├── tui.js     # v2 TUI companion entry (toast bridge)
└── rpc.js     # plugin RPC entry
```

`bun run build` writes these three files to the package root and leaves type declarations in `dist/`, so this repository can be referenced by path directly. To vendor the plugin into a project instead, copy `index.js` and `tui.js` from the package root into `.opencode/plugins/opencode-yaml-hooks/`. In v2, do not place the server file in both `.opencode/plugin/` and `.opencode/plugins/`; duplicate loads are de-duplicated, but do not rely on it.

## Quick start

Create one of:

- `~/.config/opencode/hook/hooks.yaml`
- `<project>/.opencode/hook/hooks.yaml`

Then add a minimal hook:

```yaml
hooks:
  - name: npm-test
    event: file.changed
    conditions: [matchesCodeFiles]
    actions:
      - bash: "npm test"
```

This runs `npm test` after a supported file mutation tool changes at least one tracked code file.

## Current config locations

Hooks are merged from global and project locations.

| Platform | Global config | Project config |
|---|---|---|
| macOS / Linux | `~/.config/opencode/hook/hooks.yaml` | `<project>/.opencode/hook/hooks.yaml` |
| Windows | `~/.config/opencode/hook/hooks.yaml` preferred, otherwise `%APPDATA%/opencode/hook/hooks.yaml` | `<project>/.opencode/hook/hooks.yaml` |

## Start with these defaults

Unless you need something more specific:

- prefer `file.changed` for file-oriented automation
- leave `scope` unset unless you need `main` or `child`
- leave `runIn` unset unless you need actions to execute in the root session
- treat `tool.after.*` and `tool.after.<name>` as advanced hooks for observability or non-file workflows

Explicit defaults in the current runtime:

- `scope` defaults to `all`
- `runIn` defaults to `current`
- `conditions` are optional
- bash `timeout` defaults to `60000` milliseconds

## Schema overview

```yaml
hooks:
  - name: <hook-name>
    event: <hook-event>
    action: <stop>            # optional, only for tool.before.* hooks
    scope: <all|main|child>   # optional, defaults to all
    runIn: <current|main>     # optional, defaults to current
    async: <boolean>          # optional, fire-and-forget execution
    conditions:               # optional
      - matchesCodeFiles
      - matchesAnyPath: src/**/*.ts
      - matchesAllPaths:
          - package.json
          - apps/*/package.json
    actions:                  # required, non-empty
      - command: <string>
      - command:
          name: <string>
          args: <string>
      - tool:
          name: <string>
          args: <object>
      - bash: <string>
      - bash:
          command: <string>
          timeout: <positive integer milliseconds>
```

Validation rules enforced by the runtime:

- `hooks` must exist and be an array
- each hook must be an object with a supported `event`
- `scope`, if present, must be `all`, `main`, or `child`
- `runIn`, if present, must be `current` or `main`
- `action`, if present, must be `stop` and is only supported on `tool.before.*` and `tool.before.<name>` hooks
- `async`, if present, must be a boolean; cannot be `true` on `tool.before` or `session.idle` events; async hooks must use only `bash` actions
- `conditions`, if present, must be an array of supported condition entries
- `actions` must be a non-empty array
- each action must define exactly one of `command`, `tool`, or `bash`

## Supported events

### Session events

| Event | When it fires |
|---|---|
| `session.created` | When OpenCode creates a session |
| `session.deleted` | When OpenCode deletes a session |
| `session.idle` | When a work turn ends: v1 emits `session.idle`; v2 emits `session.execution.succeeded`, `session.execution.failed`, or `session.execution.interrupted` (interrupts caused by shutdown are excluded) |
| `file.changed` | After a supported mutation tool reports file changes |

### Tool events

| Event | When it fires |
|---|---|
| `tool.before.*` | Before every tool execution |
| `tool.before.<name>` | Before a specific tool, such as `tool.before.write` |
| `tool.after.*` | Advanced: after every tool execution |
| `tool.after.<name>` | Advanced: after a specific tool, such as `tool.after.edit` |

Tool hook order for a tool named `write`:

1. `tool.before.*`
2. `tool.before.write`
3. tool executes
4. `file.changed` if the tool changed tracked files
5. `tool.after.*`
6. `tool.after.write`

## Public API versus advanced hooks

### Preferred public API: `file.changed`

Use `file.changed` when your automation depends on changed files.

Why it is preferred:

- it only fires for supported mutation tools: `write`, `edit`, `patch`, and `apply_patch` (`multiedit` is kept as a historical alias for existing `hooks.yaml` files, but neither v1 nor v2 currently emits that tool name)
- it includes `files` and structured `changes` metadata
- it avoids catch-all after-hook ambiguity
- it is the recommended path for linting, formatting, indexing, and atomic commit workflows

### Advanced escape hatches: `tool.after.*` and `tool.after.<name>`

Keep using low-level tool hooks only when you need:

- observability for every tool call, including non-file tools
- tool-specific post-processing unrelated to changed files
- compatibility with workflows that truly depend on raw tool arguments instead of normalized file changes

## Conditions

All configured conditions must pass for a hook to run.

| Condition | Meaning |
|---|---|
| `matchesCodeFiles` | Run only when tracked modified files include at least one supported code extension |
| `matchesAnyPath` | Run only when at least one final changed file path matches one or more glob patterns |
| `matchesAllPaths` | Run only when every final changed file path matches at least one glob pattern |

`matchesCodeFiles` is extension-based. Extensionless files such as `Dockerfile` do not currently count as code changes.

`matchesAnyPath` and `matchesAllPaths` only work on `file.changed` and `session.idle`. Both accept either a single string or a string array, and both fail when there are no changed files to evaluate.

Examples:

```yaml
hooks:
  - event: file.changed
    conditions:
      - matchesAnyPath: src/**/*.ts
    actions:
      - bash: "npm run lint -- --fix"

  - event: session.idle
    scope: main
    conditions:
      - matchesAllPaths:
          - package.json
          - apps/*/package.json
    actions:
      - bash: "npm test"
```

Invalid usage example:

```yaml
hooks:
  - event: tool.after.write
    conditions:
      - matchesAnyPath: src/**/*.ts # invalid: path conditions are file.changed/session.idle only
    actions:
      - bash: "echo nope"
```

## Actions

### Command action

Runs an OpenCode command in the same session, unless `runIn: main` redirects it to the root session.

```yaml
actions:
  - command: simplify-changes
  - command:
      name: review-pr
      args: "main feature"
```

### Tool action

Prompts the session to use a tool with specific arguments.

```yaml
actions:
  - tool:
      name: bash
      args:
        command: "echo done"
```

### Bash action

Runs a bash command directly without another LLM step.

```yaml
actions:
  - bash: "npm run lint"
  - bash:
      command: "$OPENCODE_PROJECT_DIR/.opencode/hooks/init.sh"
      timeout: 30000
```

If `timeout` is omitted, bash actions use the runtime default of `60000` milliseconds.

`OPENCODE_PROJECT_DIR` remains the action cwd / project directory that triggered the hook.

## Bash payloads

Every bash action receives:

- inherited `process.env`
- `OPENCODE_PROJECT_DIR` for the action cwd / project directory
- `OPENCODE_SESSION_ID`
- `OPENCODE_GIT_COMMON_DIR` when available
- JSON over stdin

Example `file.changed` payload:

```json
{
  "session_id": "abc123",
  "event": "file.changed",
  "cwd": "/path/to/project",
  "files": ["src/index.ts", "src/renamed.ts"],
  "changes": [
    { "operation": "modify", "path": "src/index.ts" },
    { "operation": "rename", "fromPath": "src/old.ts", "toPath": "src/renamed.ts" }
  ],
  "tool_name": "apply_patch",
  "tool_args": {
    "patchText": "*** Begin Patch\\n...\\n*** End Patch"
  }
}
```

## Blocking behavior

Only `tool.before.*` and `tool.before.<name>` hooks can block execution.

- a bash action that exits with `2` blocks the tool
- `action: stop` escalates a blocking pre-tool hook into a best-effort session abort for the active session (v1 `session.abort`, v2 `session.interrupt`)
- `tool.after.*`, `tool.after.<name>`, `file.changed`, and session hooks do not block execution
- non-blocking failures are logged and later actions continue

Example:

```yaml
hooks:
  - event: tool.before.bash
    action: stop
    actions:
      - bash: |
          payload=$(cat)
          cmd=$(printf '%s' "$payload" | jq -r '.tool_args.command // empty')

          case "$cmd" in
            "git push"|git\ push\ *)
              echo "Blocked and stopping session: git push is not allowed." >&2
              exit 2
              ;;
          esac
```

## Failure visibility

A bash action that fails or times out produces one notification (no aggregation or rate limiting):

| Runtime | Notification |
|---|---|
| OpenCode v1 | `client.tui.showToast` (warning on timeout, error otherwise) |
| OpenCode v2 with TUI | the same-package `./tui` entry receives the `hookFailed` RPC event and shows a toast |
| OpenCode v2 headless / web | server log only; no toast surface is available |

In v2 the server plugin always writes the failure to the server log as a fallback and additionally emits the `hookFailed` RPC event. The TUI entry is loaded automatically when the package is configured in `opencode.json(c)`; no `cli.json` entry is required. Headless runs (`opencode run`) and the web UI do not show toasts.

Blocking failures are independent of toasts: a `tool.before.*` hook that exits with code `2` returns the error to the session as a tool error.

## Logs

### v2 server logs

v2 server plugins have no `app.log` equivalent, so plugin logs go to the OpenCode server log:

- default install: `~/.local/share/opencode/log/opencode.log` (entries carry `role=server`)
- isolated/XDG installs: `$XDG_DATA_HOME/opencode/log/opencode.log`

### v1 logs

v1 plugin logs go through `client.app.log` and appear in the same OpenCode log locations.

## Execution behavior on this branch

- hooks for the same event run in declaration order
- global hooks load before project hooks
- the runtime reloads discovered `hooks.yaml` files at each hook entrypoint
- invalid reloads are rejected and the last known good config stays active
- `session.idle` clears tracked changes only after successful dispatch
- if idle dispatch fails, tracked changes are preserved for retry
- reentrant `file.changed` and `tool.after.*` dispatches are queued and replayed after the active dispatch finishes
- `async: true` hooks return immediately without blocking the tool pipeline; their actions run in the background as best-effort work
- async actions for the same event and source session are serialized to prevent overlapping executions; note that serialization is per source session, not per target — `runIn: main` hooks from different child sessions are not serialized against each other

## Copy-paste examples

See [`examples/hooks.yaml`](examples/hooks.yaml) for:

- main-session only examples
- child-to-main `runIn: main` routing
- recommended `file.changed` automation
- advanced `tool.after.*` observability
- conservative atomic commit wiring

## See also

- [`docs/hooks-v2-reference.md`](docs/hooks-v2-reference.md) for the current public config shape
- [`docs/comparison-with-claude-code-hooks.md`](docs/comparison-with-claude-code-hooks.md) for how this compares to Claude Code's hook system

## Known limitations

- file tracking is limited to supported OpenCode mutation tools, not arbitrary filesystem changes
- `matchesCodeFiles` is extension-based and ignores extensionless code-like files
- tool hooks depend on actual emitted OpenCode tool names
- Windows discovery is supported, but bash actions still require a working shell runtime
- `async: true` is not allowed on `tool.before.*` or `session.idle` events; async hooks cannot block tool execution or idle dispatch
- async hooks must use only `bash` actions; `command` and `tool` actions have no timeout and can stall the queue
- async hook failures are logged but not retried; async execution is best-effort and not guaranteed to complete if the host process exits

## Explicit non-goals for v1/v2 runtime scope

This package does **not** currently try to:

- define custom hook events beyond session, file, and tool lifecycle events
- provide config inheritance or override priority beyond global-then-project merging
- provide retries, scheduling, or concurrency controls per hook
- track arbitrary filesystem changes outside OpenCode mutation tools
- make command or tool actions blocking

## Development

```bash
bun install
bun run typecheck
bun run test
bun run build
```

`bun run build` writes the bundles to the package root (`index.js`, `tui.js`, `rpc.js`) and the type declarations to `dist/`; both are git-ignored, and both are rebuilt by the publish workflow before packing.

## Releasing

Releases are published by pushing a `v*` tag. The tag push runs [`.github/workflows/publish.yml`](.github/workflows/publish.yml), which verifies that the tag names the checked-out commit and matches `package.json`, reruns the checks, and publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, automatic provenance). No `NPM_TOKEN` secret is involved, and a token must not be configured: a `.npmrc` token makes npm skip the OIDC exchange.

One-time setup on npmjs.com — **Packages → `@expnn/opencode-yaml-hooks` → Settings → Trusted publishing → GitHub Actions**:

- organization or user: `expnn`
- repository: `opencode-yaml-hooks`
- workflow filename: `publish.yml`
- allowed actions: direct `npm publish` (configurations created after 2026-09-03 default to `npm stage publish` only, so a plain `npm publish` fails until this is enabled)

A new trusted-publisher configuration must complete its first publish within two days or it expires and has to be recreated.

To cut a release:

1. set `version` in `package.json` and in both places in `package-lock.json` (the root field and `packages[""].version`)
2. commit it, then tag that commit and push the tag:

   ```bash
   jj describe -m "Bump version to 2.1.1"   # @ is now the release commit
   jj tag set v2.1.1 -r @
   jj git push --tag v2.1.1
   ```

The workflow then checks that the ref is `refs/tags/v*`, that `HEAD` is exactly that tag, and that the tag equals the package version; runs `bun install --frozen-lockfile`, `bun run typecheck`, `bun run test`, and `bun run build`; inspects the packed tarball with `npm pack --dry-run`; and publishes over OIDC. To re-run an existing tag, dispatch the workflow against the tag itself: `gh workflow run publish.yml --ref v2.1.1`.
