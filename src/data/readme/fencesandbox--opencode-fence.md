# Fence Sandbox Plugin for OpenCode

OpenCode plugin that routes the `bash` tool through [Fence](https://github.com/fencesandbox/fence)'s pre-tool-use hook for command-policy enforcement.

Fence is a lightweight, container-free process sandbox for running commands with network, filesystem, and command policies.

## What it does

When OpenCode's agent calls the `bash` tool, this plugin intercepts the call and asks Fence to evaluate the command against your policy. Three outcomes:

| Fence verdict | Plugin behavior |
|---|---|
| **Deny** | Throws an `Error` with Fence's reason. OpenCode surfaces the error in the UI and the command does not run. |
| **Wrap** | Rewrites the command to run inside `fence -c "..."`. The command then inherits Fence's filesystem and network policy in addition to the command-policy check it just passed. |
| **Allow** | Leaves the command unchanged. |

## Why use this

Fence's command policy is enforced at two points:

1. **Preflight** — once, on whatever command is given to `fence` (e.g. `fence -- opencode` only preflights `opencode`).
2. **Runtime exec** — at the kernel exec boundary, against descendant processes.

Runtime exec on macOS, and Linux without `runtimeExecPolicy: "argv"`, only handles single-token denies (e.g. `sudo`). Multi-token rules like `gh repo create`, `git push`, and `npm publish` are preflight-only — so when OpenCode spawns one of those after Fence has already preflighted `opencode`, the deny rule does not fire.

This plugin closes that gap by re-running preflight on every shell invocation OpenCode's agent issues, before the command runs. See Fence's [Enforcement Across Child Processes](https://github.com/fencesandbox/fence/blob/main/docs/configuration.md#enforcement-across-child-processes) for the full model.

## Installation

> [!NOTE]
> This package moved from `@use-tusk/opencode-fence` to `@fencesandbox/opencode-fence`. If you installed the old package manually, remove it from your OpenCode config and use the new package name below.

### Prerequisite

Install [Fence](https://github.com/fencesandbox/fence) and confirm it's on your `PATH`:

```bash
fence --version
```

You need Fence v0.1.52 or later for the `--opencode-pre-tool-use` subcommand the plugin spawns.

### Add the plugin to OpenCode

The easiest way is to let Fence install it for you:

```bash
fence hooks install --opencode
```

This adds `@fencesandbox/opencode-fence` to your `~/.config/opencode/opencode.json` (or `opencode.jsonc` if you use that). See [`fence hooks install --opencode`](https://github.com/fencesandbox/fence/blob/main/docs/agents.md#hooks) for details and flags (e.g. `--file` to target a project-local config).

If you'd rather edit the config file by hand:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@fencesandbox/opencode-fence"]
}
```

OpenCode installs the package via Bun and loads the plugin automatically on next launch.

## Configuration

The package's default export is a `Plugin` configured with sensible defaults — it is what gets loaded when you list `@fencesandbox/opencode-fence` in opencode.json's `plugin` array.

To customize behavior (custom fence binary, pinned settings file, or template), import the factory from the `/factory` sub-path and construct the plugin yourself in a local plugin shim:

```ts
// ~/.config/opencode/plugins/fence.ts
import { createFencePlugin } from "@fencesandbox/opencode-fence/factory";

export const Fence = createFencePlugin({
  // Pin a specific config file (mutually exclusive with `template`).
  settingsPath: "/Users/me/work/fence.json",

  // Or pin a built-in Fence template (mutually exclusive with `settingsPath`).
  // template: "code",

  // Override the fence binary location (default: "fence" on PATH).
  // fenceBinary: "/opt/homebrew/bin/fence",

  // For local development only. In production this turns the plugin into a no-op
  // when fence is missing or crashes; leave false.
  // failOpenOnRunnerError: false,
});
```

If you use the local-shim form, **remove `@fencesandbox/opencode-fence` from opencode.json's `plugin` array** to avoid registering the plugin twice. The shim file is auto-loaded by OpenCode; the array entry would also load the no-options version.

The factory and the supporting types live on a sub-path so they don't appear in the main entry's exports — OpenCode's plugin loader iterates every export of a package's entry module and tries to register each one as a plugin, so anything other than the `Plugin` itself must live elsewhere.

If neither `settingsPath` nor `template` is set, Fence resolves config from the working directory the same way it does for direct invocations: walking upward for `fence.jsonc`/`fence.json`, falling back to `~/.config/fence/`.

### Composing with whole-agent wrapping

You can (and should) run OpenCode itself under Fence:

```bash
fence -t code -- opencode
```

…and additionally enable this plugin. The plugin detects `FENCE_SANDBOX=1` (set by Fence on the wrapped process) and stops adding `fence -c` wrappers, so commands aren't double-sandboxed. The deny check still runs, which is the whole point of using both: whole-agent wrapping handles filesystem and network policy; the plugin handles multi-token command policy on platforms where Fence's runtime exec deny can't.

## Limitations

### User-typed `!` commands bypass this plugin

OpenCode's plugin lifecycle does **not** currently fire `tool.execute.before` for commands typed directly into the TUI with the `!` prefix. Those commands still run, just outside this plugin's reach.

If you need user-typed `!` commands to also be policy-checked today, run OpenCode under Fence (`fence -t code -- opencode`). That gives you Fence's whole-process sandbox for all descendants, with the documented caveat that multi-token denies (which this plugin would catch) remain preflight-only for the `!` path.

### Spawn cost per bash call

The plugin spawns `fence` once per `bash` tool call. Fence's preflight is fast (sub-100ms in our benchmarks), but cold OS-level process spawn cost adds up if your agent is hammering `bash`. If this becomes a problem in practice, let us know.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, local-development install patterns, and the release process.

Bug reports, feature requests, and PRs welcome.
