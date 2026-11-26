# opencode-debug-harness

An opencode plugin that makes an agent debug like a careful engineer. It reproduces the failure first, changes one thing per experiment, lets the harness (not the model) observe the result, puts the tree back between experiments and checks that it did, and accepts a fix only when toggling it toggles the failure.

```
debug_open (lock a repro) → hypothesize → experiment → observe → verified reset → repeat
                                                              └→ conclude: fixed (toggle proof) | understood | abandoned
```

See [SPEC.md](SPEC.md) for the design, and §3.13 there for how Phase 1 differs from it.

## Install (global, inert until `debug_open`)

`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "opencode-debug-harness"
    // or with options: ["opencode-debug-harness", { "reportDir": "docs/debugging" }]
  ]
}
```

The plugin registers its `debugger` agent, `/debug` command and `debug-loop`
skill itself; there is nothing to link into `~/.config/opencode`. A
`debugger` entry in your own config is layered over the bundled one, so you
can change its model or permissions and keep its prompt. To run a checkout
instead of the release, `bun install` in it and list its `src/index.ts` by
absolute path in place of the package name.

Then, in any git repo, run `/debug <symptom>` or switch to the `debugger` agent.

**Load it once.** A second copy for the same directory disables itself and logs a warning.

## Tools

| Tool | What it does |
|---|---|
| `debug_open` | Locks a repro, runs it N times on the untouched tree, records the failure fingerprint, locks the test files. Edits are blocked from here on. |
| `debug_attach` | Takes over the investigation already open in this work tree (new session, crash). |
| `debug_refine_repro` | Replaces the repro and re-derives the baseline. |
| `debug_hypothesize` / `debug_hypothesis_note` | Records a hypothesis with a mechanism and a checkable prediction. |
| `debug_experiment_start` | Opens one experiment with an edit scope and any non-git state it touches. |
| `debug_run` | Runs the repro (and optionally the guard) as an independent observation. |
| `debug_experiment_end` | Records the verdict, saves the patch, resets to the baseline and verifies the repro is red again. |
| `debug_experiment_abort` / `debug_reset` | Abandons an experiment, or retries a reset. |
| `debug_rebaseline` | Keeps an experiment's change (e.g. logging) as the new baseline. |
| `debug_conclude` | `fixed` runs the toggle proof and leaves the fix applied. `understood` needs a supported hypothesis. `abandoned` is always allowed. |
| `debug_status` / `debug_close` | Show the state, or bail out (restores the tree by default). |

## Where things live

- **State:** `~/.local/share/opencode-debug-harness/`. That holds `debug.sqlite` and, per work tree, logs, patches, copies of edited ignored files, and `report.md`. It lives outside the repo so a reset can't erase it.
- **Snapshots:** git commits under `refs/debug-harness/<investigation>/`, never on a branch. They're deleted when the investigation closes; the patches are kept.
- The harness never commits, never moves `HEAD` and never touches the real index.

## Releasing

Releases go through [`jflowers/ship`](https://github.com/jflowers/ship)'s shared
npm workflow, the same one the other opencode plugins use, so the pipeline
is fixed in one place. To release:

1. Make sure CI passed on `main`. There is no version bump: `package.json`
   holds `0.0.0-development`, and the release sets the version from the tag.
2. Dispatch the Publish workflow with the tag (don't push tags yourself):

   ```bash
   gh workflow run publish.yml -f tag=vX.Y.Z
   ```

ship's preflight checks the tag (semver, new, newer than the last), that CI
passed on `main`, and that there are unreleased commits, then creates the
tag. The package is published to npm with provenance through trusted
publishing (no token) and the GitHub release is created with generated
notes. A version already on npm is skipped, so a re-run is safe.

npm trusts `publish.yml` by name: renaming it breaks publishing until the
trusted publisher on npmjs.com is updated.

## Development

```bash
bun install
bun test
bun run typecheck
```
