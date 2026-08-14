# loop

Keep an opencode session working automatically — on a fixed interval or at a
pace the model sets for itself — instead of re-typing the same prompt every
time the session goes idle. `/loop` re-injects your prompt into **your own
session** each time a turn finishes, carrying the full conversation context
forward, until the task is done, you stop it, or a safety cap trips.

## Why use loop

- **Keep an agent grinding on a task.** Refactor a module, chase a flaky test,
  or work through a checklist across many turns without re-typing the prompt
  each time the session goes idle.
- **Run recurring checks on a cadence.** Re-run the test suite, a build, or a
  monitoring script every few minutes and get a fresh report each time.
- **Let the model pace itself.** Skip the fixed interval for open-ended or
  exploratory work and let the model call `schedule_wakeup` only when it
  actually has something worth checking back on.
- **Walk away without babysitting.** The loop pauses itself on a permission
  prompt or an error, and hard caps guarantee it can never run forever.

## Installation

The plugin is a self-contained ESM module whose entry file is `loop.js`. Register
it in your `opencode.json` under the singular `"plugin"` key.

For a local clone or copied checkout, register `loop.js` by an absolute path or
by a path relative to the `opencode.json` file that declares it:

```json
{
  "plugin": [
    "/path/to/opencode-loop/loop.js"
  ]
}
```

To change the safety caps, use the plugin tuple form:

```json
{
  "plugin": [
    [
      "./plugins/loop/loop.js",
      {
        "maxIterations": 50,
        "maxWallClockMinutes": 1440
      }
    ]
  ]
}
```

`maxIterations` must be a positive integer from 1 to 50 and defaults to 50.
`maxWallClockMinutes` must be a positive integer from 1 to 1440 and defaults to
60. Invalid fields independently fall back to their safe default and produce a
redacted warning diagnostic; a valid field still applies. Restart opencode after
changing these options. Each loop snapshots the effective caps when it starts,
so later caller-side mutation cannot change an active loop.

For the npm package, install it where opencode resolves plugins and register the
package name:

```json
{
  "plugin": [
    "@mcrescenzo/opencode-loop"
  ]
}
```

The `"plugin"` value is an array, so add the entry alongside any other plugins
you already register. After registering or changing the plugin, **restart
opencode** — running sessions keep already-loaded plugin code.

Register this plugin once. Do not load both a path copy and the published
package in the same opencode config. If another plugin or user command already
owns `/loop`, this plugin leaves that command definition and execution alone.

This package requires Node 20.11 or newer for its local test/package scripts. The
runtime plugin dependency is `@opencode-ai/plugin@^1.17.7`; the current release
candidate was smoke-tested against opencode `1.17.13`. opencode does not install
dependencies for path-spec plugins, so run `bun install` or `npm install` in this
directory before using a path registration during development.

## Quick start

### `/loop` command syntax

| Form | Behavior |
|---|---|
| `/loop <interval> <prompt>` | **Fixed-interval.** `<interval>` is `<n>s\|m\|h` (e.g. `5m`), clamped to 5s–24h and rejected when it cannot fit within the effective wall-clock limit. Idle-gated: the next iteration fires at least `<interval>` after the previous one finishes, so an overrun delays rather than stacks. |
| `/loop <prompt>` | **Dynamic / self-pacing.** Each iteration may call the `schedule_wakeup` tool with `delaySeconds` (clamped to 60–3600) to continue. Finishing a turn **without** calling `schedule_wakeup` ends the loop. |
| `/loop status` | Show the active loop: mode, iteration count, and elapsed time. Alias: `info`. |
| `/loop stop` | Stop the active loop. Aliases: `off`, `cancel`, `clear`, `end`. |

Examples:

```text
/loop 5m run the test suite and report any failures
/loop keep refactoring this module until it is clean, then stop
/loop status
/loop stop
```

Looped content is re-injected as plain prompt text. Re-running slash commands
(e.g. `/loop 5m /some-command`) isn't supported yet.

### What you'll see

Running:

```text
/loop 5m run the test suite and report any failures
```

starts the loop and immediately runs iteration 1 with that prompt — the
command's own turn *is* the first iteration, so the session just gets to work.
A toast confirms `Loop started (fixed, 300s).`. From then on, every time the
session goes idle, the plugin waits until at least 5 minutes have passed since
the last run and re-injects the same prompt, carrying conversation context
forward, until you stop it or a safety cap trips.

Checking in with:

```text
/loop status
```

prints something like:

```text
Active /loop: fixed (300s), status running.
Iterations: 1/50. Elapsed: 12s.
Limits: 50 iterations, 60m wall clock.
Prompt: run the test suite and report any failures
```

### Safety

- A loop stops automatically at its effective iteration or wall-clock cap. The
  defaults are **50 iterations** and **60 minutes**; plugin options may narrow
  iterations to 1–50 or set wall time to 1–1440 minutes. The time cap is
  enforced before scheduling or injecting the next iteration.
- It **pauses** while a permission prompt is open and **resumes** when the prompt
  is answered; a **rejected** permission ends the loop.
- Closing or deleting a session clears that session's in-memory loop state.
- If a running iteration reports `session.error`, the loop pauses and stays
  paused until you run `/loop stop` (an error-pause is sticky). If the plugin
  cannot dispatch the next prompt through opencode, it stops that loop instead
  and emits a diagnostic record.
- The loop drives the current session, carrying conversation context forward.
- A longer wall-clock cap does not guarantee 50 iterations. Model completion,
  errors, rejected permissions, restart or session closure, and manual stop can
  all end a loop sooner.

## For AI agents

If you're the model executing `/loop`, this plugin intercepts the command
before it reaches you — seeing this command's raw markdown as a normal prompt
means the plugin isn't loaded. In dynamic mode, call `schedule_wakeup` with a
`delaySeconds` (60–3600) to continue the loop past this turn, or just finish
the turn to end it. Iteration caps, wall-clock caps, and permission/error
pausing are enforced by the plugin, not by you.

## Diagnostics environment variables

The plugin writes local structured JSONL diagnostic records
(`opencode.plugin.diagnostic.v1`). Records are generated by this plugin only and
are not uploaded by the plugin. The redaction heuristics are adapted from the
author's local opencode diagnostics tooling and are kept self-contained in this
package. Default storage root:

```text
Linux:   ${XDG_STATE_HOME:-~/.local/state}/opencode/plugin-diagnostics/<project>-<hash>/loop/
macOS:   ~/Library/Application Support/opencode/plugin-diagnostics/<project>-<hash>/loop/
Windows: %LOCALAPPDATA%\opencode\plugin-diagnostics\<project>-<hash>\loop\
```

- `OPENCODE_PLUGIN_DIAGNOSTICS_DIR` — override the diagnostics root directory
  with an absolute path or `~` path (useful for tests or local debugging).
- `OPENCODE_PLUGIN_DIAGNOSTICS_DISABLED=1` — disable diagnostics writes entirely.

Diagnostic files are named `loop-YYYY-MM-DD-<pid>.jsonl` and rotate before they
exceed roughly 1 MB.

## Hooks

`loop.js` registers five opencode plugin hooks — `config`, `event`,
`command.execute.before`, `tool`, and `dispose`. See the full hook-by-hook
breakdown, including exactly what each one does, in
<https://github.com/mcrescenzo/opencode-loop/blob/main/docs/design.md>.

## Development

Run `npm test` (`node --test tests/*.test.mjs`) before opening a pull request;
use Node, not `bun test`, for validation. There's intentionally no committed `package-lock.json`.
The full contributor workflow — dependency license review, `npm run
smoke:package`, and CI details — lives in
<https://github.com/mcrescenzo/opencode-loop/blob/main/CONTRIBUTING.md>.

## Support & Status

This is an unofficial opencode plugin, a community project not affiliated with or endorsed by
opencode.ai. Public compatibility is limited to the opencode/plugin API
versions documented above until newer versions are tested. Report bugs and
compatibility issues at
<https://github.com/mcrescenzo/opencode-loop/issues>.

The loop is **in-memory only**: closing or restarting opencode ends every
active loop with no respawn.

To uninstall, remove `@mcrescenzo/opencode-loop` or the local `loop.js` path
from the `plugin` array in `opencode.json`, then restart opencode. Existing
loops are in-memory only, so restart also clears any active loop state.

Contributor-facing design rationale and invariants live in the repository:
<https://github.com/mcrescenzo/opencode-loop/blob/main/AGENTS.md> and
<https://github.com/mcrescenzo/opencode-loop/blob/main/docs/design.md>.
Security and contribution guidance live at
<https://github.com/mcrescenzo/opencode-loop/blob/main/SECURITY.md> and
<https://github.com/mcrescenzo/opencode-loop/blob/main/CONTRIBUTING.md>.
