# opencode-ts-typecheck

Automatic TypeScript type checking and agent repair for **OpenCode 2.4.1**.
When relevant project files change during a session, the plugin runs a typecheck
before AI agent turn completion, and returns diagnostics to the agent to fix and check again.

This uses the **experimental** `experimental.idle` server hook, not an idle
event listener. Host upgrades may require a compatible plugin update.

## Installation

Add this to your project's (or global) `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-ts-typecheck"]
}
```

### Options

Optional bounds use the object form of the plugin entry:

```json
{
  "plugins": [{
    "package": "opencode-ts-typecheck",
    "options": {
      "maxAttempts": 3,
      "timeoutMs": 60000,
      "maxOutputBytes": 16384
    }
  }]
}
```

The example shows the defaults. All values must be positive integers, capped at
10 attempts, 300,000 milliseconds, and 65,536 output bytes respectively.
Invalid options fail activation.

## Behavior and limitations

### Unsupported projects

Before scanning, the plugin checks only the session directory's root
`package.json` and whether root `tsconfig.json` exists. It activates when there
is a nonempty `scripts.typecheck` string or a root `tsconfig.json`. Explicit
scripts remain authoritative, even for non-TypeScript checkers.

Otherwise, the request is quietly skipped: no recursive traversal, snapshots,
hashing, compiler discovery, checker processes, permission requests, or diagnostic
turns. Hook dispatch and small in-memory session state remain. Detection does not
search nested packages or ancestors, and its cost depends on root metadata, not
the number of files in the repository.

Applicability is checked once per genuine user request and cached through model
steps and synthetic turns. Adding a config or script during a skipped request
activates checking on the **next genuine user prompt**, not the current request.
Malformed/unreadable manifests or invalid declared typecheck scripts are
configuration errors, not unsupported-project skips.

### Command selection and permissions

1. If the session directory's `package.json` defines `scripts.typecheck`, use
   the project's package manager to run that exact script.
2. Otherwise, require root `tsconfig.json` and run locally available `tsc --noEmit`.

Install TypeScript and the selected package manager in the target project.
The plugin never downloads a compiler through `npx` or installs missing tools,
and disables Corepack network/bootstrap behavior in checker subprocesses.
A missing compiler or broken configuration is an **unresolved check**, not a pass.
These restrictions do not sandbox network access in trusted project scripts.

Package-manager selection uses `packageManager`, then an unambiguous lockfile,
then npm. Project scripts retain their normal package-manager semantics,
including applicable pre/post scripts. These are arbitrary project code:
OpenCode execution permissions apply to both script and compiler execution.

### Repair budget

The plugin limits each failure episode to three repair requests by
default. A genuine new user request or verified passing check resets the budget;
synthetic diagnostics and file changes do not.

An exhausted budget is **unresolved** and allows completion with errors.
One final diagnostic message can ask the agent to report the remaining errors.
  It is not another repair request, and the plugin prevents further continuations.
The plugin cannot guarantee that a model can repair every project.

### Checked files

For applicable requests, the plugin snapshots relevant inputs before the first
model call. At completion, it compares file contents and paths—not Git status or
edit-tool calls. This catches
shell edits, additions, and deletions without triggering on pre-existing changes.

Coverage includes TypeScript/TSX and JS-family source, declarations,
JSON/configuration inputs, manifests, and lockfiles inside the session directory.
Dependency trees and VCS/process metadata are excluded, but `dist` is not:
its declarations may be inputs. Before/after snapshots prevent accepting a pass
if inputs changed during the check.

Checks run one at a time per directory and wait while the session owns active
background work. Child sessions have separate state; their background work is
not assumed to wake the parent.

### Limitations

- No complete TypeScript dependency graph, monorepo orchestration, or tracking
  of inputs outside the session directory.
- Concurrent user/other-session edits can trigger checks; snapshots do not
  establish which actor wrote a file.
- Retry accounting is in memory; a host reload/restart resets it.
- Timeouts, permission denial, missing tools, and exhausted retries are not
  success. Stop/cancellation must not be used as evidence of passing.
- A command may have side effects before cancellation. Killing its process
  cannot roll back those effects or retract already-admitted diagnostics.
- This is completion-time feedback, not V1's full per-edit LSP diagnostics UI.

## Development

```sh
npm ci
npm --prefix playground ci
npm run check
```

Develop the plugin in this repository:

```sh
opencode .
```

Exercise it in a separate session:

```sh
cd playground
opencode .
```

Only `playground/opencode.json` activates the plugin, using `"plugins": [".."]`
relative to the config file. This keeps an unfinished checker out of its own
development session. The playground has its own TypeScript dependency and config.

OpenCode watches configuration directories, but may not watch linked source.
After plugin edits, use `/reload` in the exercise session and verify the change.
For a fresh isolated host, use `opencode --standalone .` rather than restarting
a shared service.

Further reading:

- [Verification evidence and dependency notes](docs/verification.md)
- [Release procedures](docs/releasing.md)
- [Architecture decision records](docs/ADR/README.md), including
  [why continuations use `resume: false`](docs/ADR/0003-admit-continuations-without-an-additional-wake.md)

## License

[MIT](LICENSE).
