# greenproof

A definition-of-done gate for code written by LLM coding agents. It answers one question:
is the green real?

greenproof runs outside the agent. It runs your project's checks itself, reads its policy
and commands from the base revision so a change cannot weaken the gate it is judged by, and
names each way a test or check was weakened, with a rule id, file and line.

## The problem

A coding agent told to make a gate pass will often make the gate pass, not the code
correct. It deletes the failing test, skips it, loosens the assertion, changes the expected
value to whatever the code now returns, excludes the test group in CI, or reports "all
tests pass" from a run that is stale or was never made. The report says done. The suite is
green, or was never run, and the behaviour it was meant to protect is no longer checked.

greenproof widens what "done" measures:

1. It runs the project's own lint, type, test and build commands, now, instead of trusting
   the agent's account of them.
2. It reads the policy and commands from the base revision. An agent that edits
   `.greenproof.toml` in the same change is reported, not obeyed.
3. It reads the diff for the specific ways tests and checks get weakened and names each one.
4. Optionally it runs the changed tests against the base source (the revert check) and
   starts the built artifact (the smoke check).

It has no runtime dependencies (Python standard library only), needs Python 3.11 or newer,
and makes no LLM calls.

## Install

```bash
uvx greenproof --version         # run without installing
pipx install greenproof          # or install it
```

## Quick start

From the root of a git repository with at least one commit:

```bash
greenproof init
greenproof check
```

`init` looks at the repository, proposes the commands it can find evidence for, runs each
once, and writes `.greenproof.toml` and an `AGENTS.md` section. When a `CLAUDE.md` exists it
also adds an `@AGENTS.md` import to it, between greenproof's markers, unless the file already
has that line. It never prompts and never commits. This is its real output on a small Python
project with a pytest suite, with greenproof installed (`pipx install greenproof`), so the
AGENTS.md line says `greenproof check`:

```text
greenproof init: /private/var/folders/qz/tmp.BCkiyAaLi0

detected: python (pip)

  created  .greenproof.toml
  created  AGENTS.md

verification:
  pass     test: python -m pytest -q (0.4s)

next steps:
  - review the files above and commit them; `greenproof check` runs the gate
```

The policy it wrote:

```toml
version = 1

[commands]
# test: from [tool.pytest.ini_options] in pyproject.toml
test = "python -m pytest -q"
timeout = 900

[modes.hook]
checks = ["static", "commands"]

[modes.local]
checks = ["static", "commands"]

[modes.ci]
checks = ["static", "commands", "revert"]
```

After committing those files, `greenproof check` on the unchanged tree:

```text
greenproof: pass (base HEAD 918debdb3, mode local)
  note: on the default branch with no upstream: only uncommitted changes are checked; pass --base REF to include commits
  PASS  test  python -m pytest -q (0.2s)
verdict: pass (exit 0)
```

Break the code so a test fails, and the same command reports it and exits 2:

```text
greenproof: not done (base HEAD 918debdb3, mode local)
  note: on the default branch with no upstream: only uncommitted changes are checked; pass --base REF to include commits
  FAIL  test  python -m pytest -q (exit 1, 0.4s)
        last lines:
        F                                                                        [100%]
        =================================== FAILURES ===================================
        __________________________________ test_total __________________________________
        
            def test_total():
        >       assert total([40, 60]) == 100
        E       assert 101 == 100
        E        +  where 101 = total([40, 60])
        
        tests/test_shop.py:5: AssertionError
        =========================== short test summary info ============================
        FAILED tests/test_shop.py::test_total - assert 101 == 100
        1 failed in 0.02s
verdict: fail (exit 2)
```

Fix the code and it passes again:

```text
greenproof: pass (base HEAD 918debdb3, mode local)
  note: on the default branch with no upstream: only uncommitted changes are checked; pass --base REF to include commits
  PASS  test  python -m pytest -q (0.2s)
verdict: pass (exit 0)
```

Skipping a test is a different outcome. With `@pytest.mark.skip` added to `test_total`, the
suite stays green, and greenproof blocks the change anyway, with exit 1:

```text
greenproof: not done (base HEAD 918debdb3, mode local)
  note: on the default branch with no upstream: only uncommitted changes are checked; pass --base REF to include commits
  BLOCK tests.skipped  tests/test_shop.py:5  `@pytest.mark.skip` added to test_total  [fp ca84db22c653]
        hint: Fix the code so test_total passes instead of skipping it; if the test is wrong, say so.
  PASS  test  python -m pytest -q (0.3s)
verdict: fail (exit 1)
```

## How a check works

`greenproof check` runs these steps in order.

1. **Snapshot.** It finds the repository and snapshots the candidate (staged, unstaged and
   untracked, non-ignored files) into a git tree using a temporary index. Your index and
   working tree are not touched. Agents often do not commit, so the uncommitted state is
   what gets checked.
2. **Base.** It resolves the revision to compare against, first match wins: `--base REF`;
   on a GitHub pull request, the merge base with the pull request's base branch; the
   revision recorded by `greenproof session-start` for this worktree; the merge base with
   the default branch (`origin/HEAD`'s target, else `main`, else `master`). If HEAD is the
   default branch, the base is the merge base with its upstream, so commits not yet pushed
   are checked along with uncommitted changes; with no upstream, or when HEAD equals it,
   only uncommitted changes are checked (the report says so; pass `--base REF` to include
   commits). A base it cannot resolve, such as an upstream with no shared history in a
   shallow clone, is exit 4 with the fix (`fetch-depth: 0`).
3. **Policy from the base.** It reads `.greenproof.toml` with `git show <base>:.greenproof.toml`.
   The commands, test globs and rule severities for the run all come from there. If the
   candidate's policy differs from the base's (compared as parsed TOML, so comment and
   formatting edits do not count), `policy.changed` blocks unless `--allow-policy-change` is
   given. If the base has no policy file yet, the candidate's is used and the JSON report
   records `policy.source` as `candidate`.
4. **Static rules.** It diffs the base and candidate trees and applies the rules below.
   Static findings do not stop later checks from running, so the report is complete. In hook
   mode a blocking static finding skips the rest, to keep the agent loop short.
5. **Commands.** It runs the policy's commands (`setup` in CI mode and isolated worktrees
   only, then `lint`, `typecheck`, `test`, `build`) with `sh -c` in the candidate tree, each
   under the policy `timeout`, killing the whole process group on timeout. The environment
   is inherited, plus `GREENPROOF=1`.
6. **Revert.** When the change touches both test files and non-test source, it builds the
   base tree with the candidate's test files laid over it, checks it out in a temporary
   worktree, runs `setup` there, then runs only the added or changed tests. If they all pass
   without the source change, they do not exercise it, and
   `revert.passes_without_change` is reported. It supports pytest, jest, vitest and
   `go test`; for any other runner it is skipped with a note and never fails.
7. **Smoke.** When the policy has a `[smoke]` table, it starts `smoke.start` in its own
   process group, polls `ready_url` until it answers 2xx or 3xx, runs each probe, and
   always terminates the group.
8. **Cache.** In local and hook modes, a previous pass for the same candidate tree, base,
   policy, version, mode and checks is replayed as "unchanged since the last verified pass".
   Failures are never cached. `--no-cache` turns it off. CI mode never reads or writes the
   cache, because anything running as the user can edit that file.
9. **Report and exit.**

`--isolate` runs `setup`, the commands and smoke in a git worktree of the candidate tree
instead of in place.

Which checks run is set per mode in the policy (`[modes.local]`, `[modes.hook]`,
`[modes.ci]`) and can be narrowed with `--checks static,commands,revert,smoke`.

### Exit codes

| code | meaning |
|---|---|
| 0 | pass |
| 1 | a blocking integrity finding (static or revert) |
| 2 | a configured command failed or timed out |
| 3 | the smoke check failed |
| 4 | usage or configuration error (not a repository, base unresolvable, bad policy) |
| 5 | internal error; greenproof fails closed |

When several of 1 to 3 apply, the lowest wins. 4 and 5 override everything.

### Reports

Text goes to stdout. `--json PATH` writes a JSON report (schema `greenproof/report@1`, the
schema file ships in the package as `src/greenproof/schema/report-v1.json`).
`--markdown PATH` appends a Markdown summary, which suits `$GITHUB_STEP_SUMMARY`.
`--github-annotations` prints `::error`, `::warning` and `::notice` lines. Each finding
shows a fingerprint such as `[fp ca84db22c653]`, which is how it is accepted (below).

## Rules

`greenproof explain RULE_ID` prints the full description of a rule. Each rule's severity is
`block`, `warn` or `off`, and can be changed in the base policy's `[rules]` table, for
example `"tests.expected_changed" = "off"`.

| rule id | default | fires when |
|---|---|---|
| `policy.changed` | block | the candidate's `.greenproof.toml` differs from the base's |
| `tests.deleted` | block | a test file is deleted, or renamed to a path that is not a test file or that the runner does not collect |
| `tests.removed` | block | a test that exists at the base is gone and its assertions appear in no collected test of the candidate |
| `tests.replaced` | block | in one file a test was removed and a different one added, and the removed test is not covered; `warn` when the new tests are at least as strong. Folding tests into one table-driven test (a parametrized Python test, `it.each`, a Go table, Rust `#[case]`) stays a `warn` only when the table runs, no row leaves early and the row values reach an assertion (a Python `parametrize` whose body ignores its row values is not caught and still warns); an assertion inside a `try`/`catch` that swallows the failure, `assert a or b` with `a` depending on a row, and a skip, skipif or xfail row mark the folded tests did not carry block it |
| `tests.skipped` | block | a skip, xfail, ignore or todo marker is added to an existing test, or at module, class or conftest scope; `warn` for an unconditional skip on a brand-new test |
| `tests.focused` | block | a focus marker is added (`it.only`, `fit`, `describe.only`, `test.only`) |
| `tests.weakened` | block | a test checks less than before: fewer assertions, a weaker assertion, a wider tolerance, fewer parametrize cases, a vacuous or unreachable assertion, or one wrapped in a swallowing `try/except` |
| `tests.expected_changed` | warn | the expected value in an assertion changed, with or without a code change (a test edited to match what the code returns) |
| `suppress.added` | warn | an added line introduces a type, lint or coverage suppression |
| `runner.tampered` | block | a change narrows or neuters how checks run: test selection, coverage thresholds, linter or type-checker strictness, test scripts, a conftest hook that rewrites outcomes. A swallowed failure (`\|\| true`, `; exit 0`, `set +e`) blocks only when it follows a test, lint or type-check command: `rm -rf build \|\| true` is not one. A Go `TestMain` that always exits 0 after its guards is a block, a conditional exit is a `warn`. Fewer steps count checks only (a cleanup line or a `pretest` split off is not one), selection flags belong to their tool (`-k` is pytest's, `-t` is mocha's timeout), `-p no:<plugin>` is judged by the plugin, `--disable-plugin-autoload` and `PYTEST_DISABLE_PLUGIN_AUTOLOAD` are a `warn`, `PYTEST_ADDOPTS` and `GOFLAGS` are read as flags (inline, `export`, make, a wrapper's env file; an unreadable value warns), `nyc`, `cross-env`, `dotenv`, `op run` and the like read through to the runner, and a nested `package.json` is a `warn` only when it is known that no policy command reaches it (a workspace, filter, `cd`, lerna or make policy keeps the block). Makefile variables are expanded before a recipe is read, a script that no longer runs a kind of check the base ran blocks (`jest` became `eslint`; a policy shell script is read with the scripts it calls), a script or recipe that now runs fewer paths blocks (`jest` became `jest cart.test`; a plain directory or a widened path is not narrowing, and a command that names exact test files covering every file the base path selected, `pytest .` to `pytest test_shop.py` when that is the only test file, is a `warn` that says files added later will not run, while fewer files or a test file added in the same change block), an added statement that removes or moves a base test file or a directory holding one (`rm -rf tests`, `git rm`, `mv`, `find ... -delete`, `rimraf`, a glob, read from the directory after a `cd`) blocks while `rm -rf .pytest_cache`, `rimraf coverage` and a removal the base already had do not and a make target named like a path and not in `.PHONY` runs nothing. Selection is read from more than flags: tox and nox `commands` (a `-` prefix, `ignore_errors`, `ignore_outcome`, nox `success_codes` or a swallowing `try`/`except`, a dropped check), jest and vitest path and changed-file flags, Go `-tags`, cargo target kinds, monorepo package filters (turbo, pnpm, nx `run-many`, lerna, yarn `workspaces foreach` and npm `-w`: adding or narrowing one blocks, widening passes, a rename or glob passes when it still selects every package the old filter did and warns when it does not, and `nx run-many` becoming `nx affected` warns) and the pytest keys `python_files`, `python_classes`, `python_functions`, `testpaths`, `norecursedirs`, `--doctest-modules`, `--doctest-glob` and `-o`, which are judged per run (config `addopts`, then `PYTEST_ADDOPTS`, then the run's own flags, so a flag moved between them passes and one dropped from a command line blocks). Makefile recipes are judged in the directory they run in, a deleted root Makefile is followed, `include` files (literal paths, variable paths, `$(wildcard ...)` globs of tracked files), `define` macros called with `$(call ...)`, conditionals, double-colon, pattern and multi-target rules, and a `GNUmakefile` that make reads first are followed. Known limits: a lint ignore for a rule new in a linter bump still blocks, and coverage floors moved to a `codecov` block read as lowered; the rest are in SPEC 5.6 |
| `ci.tampered` | block | a CI workflow change removes or neuters a test or lint step (judged across all workflow files, so splitting one into a reusable workflow is fine; a local composite action, a local script or a launcher such as `docker compose run`, `uv run` or `bash -c` that still runs the check counts as keeping it), swallows a check's failure, adds `continue-on-error: true`, `if: false`, `--collect-only` or `--passWithNoTests`, an `exit 0` before the first check, or a selection flag, runs on fewer events, or hides a test or source file behind a `paths` or `paths-ignore` filter; or changes or removes the greenproof step (adding the first one is fine; the step's `with:` inputs are compared, so changing one blocks). The selection-flag, `--collect-only`, early `exit 0` and `set +e` checks read GitHub Actions `run:` steps only; GitLab CI and CircleCI files get the line-level swallow check (`|| true`, `; exit 0`) and nothing more. On Windows runners (or `shell: pwsh`, `powershell`, `cmd`) a check followed by another command without a status check, `; exit 0`, a trailing `exit 0`, `|| true` and `$LASTEXITCODE = 0` block; `shell: python` is not read. Dropping `push` while keeping `pull_request`, and splitting `-m 'not slow'` / `-m slow` into separate steps, still block. A step that replaces a check with something the rule cannot classify (`poe test`, `pre-commit run`, an unknown `uses:`) is `warn` only when it sits in the same workflow file and job, is not disabled and, for a script, exists; elsewhere it blocks. Scripts, composite steps and `bash -c` strings are judged like a `run:` step (a swallow, `if: false`, `continue-on-error`, `bash -n` or a missing script blocks), and a check inside one is counted on both sides of the change. A commit that changes only a local script or a local composite action's `action.yml` is judged too, for every GitHub workflow that runs it (read to depth 4: nested scripts, `make` recipes, `package.json` scripts, `bash -c`); the finding names the changed file. A script runs in a shell of its own, so it has errexit only when its shebang passes `-e` (`#!/bin/bash -e`, `#!/bin/sh -eu`, `#!/usr/bin/env -S bash -e`) or the step runs it as `bash -e ci.sh`; otherwise a check followed by another command in it blocks, and the finding says to add `set -e`. A script whose shebang names another interpreter (`python`, `node`, `pwsh`, ...) is not read as shell. A retry `A || B` must be A plus `--lf`/`--ff`/`--sw`/`--reruns`, a trailing `&` or `trap ... exit 0` swallows, `docker run -d` runs no check, and a moved greenproof step must keep its `if:`, job `if:` and automatic triggers. A recipe line has no errexit (`-` prefix, `make -i`, `.IGNORE` swallow). A changed `sed -i` or `perl -i` rewrite of tests the base already rewrote blocks, and a `cp`, `install`, `ln` or `rsync` into the test tree blocks when it lands on a test, a runner file or a tracked file and warns for a new non-test file. Where errexit is off, a subshell or group around a check that ends in another command, or holds `exit 0`, `return 0` or an EXIT or ERR trap, swallows the check's status; `( pytest )` alone does not. Removing tests in a step blocks; `PYTEST_DISABLE_PLUGIN_AUTOLOAD` warns. Monorepo package filters (turbo, pnpm, nx `run-many`, lerna, yarn `workspaces foreach`, npm `-w`) are read as selection: `pnpm -r` to `pnpm -r --filter web` and `npm test` to `npm test -w web` block. Not read: flow-style `steps: [...]`, `fromJSON` runners, `always() && false`, GitLab CI and CircleCI scripts, and a Makefile `include` whose path uses `$(shell ...)` or an unset variable; past 4 levels or 32 files it warns. An `if:` is read with its redundant outer parentheses peeled, and a new or changed `if:` on a job or step that runs a check with more than 32 levels of `&&`/`||` nesting warns that it is nested too deeply to read. A check whose status is saved and then dropped (`rc=$?; ...; exit 0`) is swallowed, and `exit $rc` keeps it. Also `warn`: narrowed `branches`/`tags`/`types` filters (a `branches` or `branches-ignore` filter added under `push` passes while `pull_request` runs on every branch, and warns when it takes the default branch, `main` or `master`, off `push`), a selection flag chosen by `${{ matrix.* }}`, `continue-on-error: ${{ ... }}`, fewer steps of a kind that still exists, and a ref-only bump of the greenproof action. `continue-on-error` on a step that runs no check (checkout, cache, upload, codecov) is fine, and so is the same flag the base already had on the same step |
| `static.parse_error` | warn | a changed Python, TOML, JSON or INI file does not parse, so line-level checks are used for it |
| `tests.self_mocked` | warn | a test patches the same callable its assertions call, so it tests the mock |
| `code.hardcoded` | warn | non-test code gains a literal lookup table or an equality branch on a literal that also appears in a test changed in the same diff (Python only) |
| `revert.passes_without_change` | warn | every added or changed test also passes against the base source |
| `smoke.failed` | block | the artifact did not become ready in time, or a probe failed |

## Agents

`greenproof init` installs hooks that call `greenproof check --hook AGENT` when the agent
tries to stop, and `greenproof session-start --hook AGENT` when a session begins. The agent
is told what failed and is asked to fix the code, not the check.

When the agent runs `greenproof check` itself in a sandbox that cannot write to `.git` (Codex's
workspace-write, for one), it still works: greenproof keeps its snapshot in a temporary
object store, skips the revert check (the stop hook runs it) and says so in the report.

| agent | hook file | status |
|---|---|---|
| Claude Code | `.claude/settings.json` | supported |
| Cursor | `.cursor/hooks.json` | supported |
| Codex CLI | `.codex/hooks.json` | supported; review and trust the hooks once with `/hooks`, because Codex skips untrusted project hooks |
| OpenCode 2.x | `.opencode/plugins/greenproof.js` | a plugin file, see [OpenCode](#opencode); 2.x only |
| Gemini CLI | `.gemini/settings.json` | experimental; superseded by Antigravity CLI (below) |
| GitHub Copilot CLI | `.github/hooks/greenproof.json` | experimental; see [Copilot also runs the Claude Code hooks](#copilot-also-runs-the-claude-code-hooks) |
| Qwen Code | `.qwen/settings.json` | experimental; Qwen runs project hooks only after you approve them or trust the folder |
| Factory Droid | `.factory/hooks.json` | experimental; Droid snapshots hooks at startup, so restart it and review them in `/hooks` |
| Antigravity CLI | `.agents/hooks.json` | experimental; the successor to Gemini CLI |
| OpenHands | `.openhands/hooks.json` | experimental |
| Auggie | `.augment/settings.json` | experimental |

An adapter is `supported` once a real-CLI end-to-end run (a block on a requested test skip, then
a release on the next unchanged stop) is recorded in [MEASUREMENTS.md](MEASUREMENTS.md). Until
then it is `experimental`: the file `init` writes follows the vendor's documentation as read on
2026-11-12 and has not been run against the real CLI, so it may not gate anything. `init`
installs an experimental adapter only when you name it in `--agents`, and prints a warning.

`--agents auto` (the default) installs Claude Code when `.claude/` or `CLAUDE.md` exists,
Cursor when `.cursor/` exists, Codex CLI when `.codex/` exists and OpenCode when `.opencode/`,
`opencode.json` or `opencode.jsonc` exists. It never installs an experimental adapter; name
it in `--agents` to get it, with a warning (`--agents qwen,droid`). Once they are supported,
`auto` will also pick GitHub Copilot CLI when `.github/hooks/` or
`.github/copilot-instructions.md` exists, Qwen Code when `.qwen/` exists and Droid when
`.factory/` exists. Gemini CLI was superseded by Antigravity CLI, and an open upstream issue
reports its `AfterAgent` hooks not firing. `--agents none` installs nothing. `--hook-command
CMD` sets how the hooks invoke greenproof, for example `uv run greenproof`.

By default `init` looks on PATH for an installed `greenproof`, skipping the scripts directory
of the virtual environment it is running in (what `uvx`, `pipx run` and a project venv use),
because the agent's process does not have that directory. A `pipx install` or `uv tool install`
symlink in `~/.local/bin` counts. If one is found, the hooks and the AGENTS.md line call
`greenproof`. If not, they call `uvx greenproof@<version>` and `init` says so in its next
steps. That needs `uv` on the PATH of the agent's process; without it the hook cannot start,
and a hook that cannot start fails open (see below). The AGENTS.md line, "run `<command>
check`", always uses the same command as the hooks.

If your uv config sets `exclude-newer` (for example `"3 days"`), `uvx greenproof@<version>`
does not resolve until that release is older than the window, so `uvx` hooks fail open in the
meantime. Install greenproof with `uv tool install greenproof` or `pipx install greenproof`,
or exempt it with `exclude-newer-package = { greenproof = false }` in `uv.toml`.

Installing the gate twice is safe. A plugin and the hooks `init` writes, or user and project
settings, can both run for one stop, in parallel. greenproof serialises them with a lock in
the git directory and records its decision for the stop, so the second hook gives the first
one's decision again: one decision per stop, not a block followed by a release.

### Copilot also runs the Claude Code hooks

GitHub Copilot CLI and Copilot in VS Code read the repository's `.claude/settings.json` as
well as `.github/hooks/`, and run a `Stop` entry there with Copilot's own payload (it has a
`timestamp` field, which Claude Code's does not). Copilot treats exit code 2 from a stop hook
as a warning, so greenproof's Claude block would not block, and a repository with both files
would run two greenproof hooks for one stop. So `greenproof check --hook claude` and
`session-start --hook claude` look at the payload: when it is Copilot's and a
`.github/hooks/*.json` file holds a greenproof `--hook copilot` entry for that event, the Claude
hook defers (it exits 0, prints nothing and writes no state) and the Copilot hook answers.
Without that file it answers in Copilot's format itself.

### OpenCode

OpenCode has no command hooks, so greenproof ships a plugin for it. It supports OpenCode 2.x
only. OpenCode 1.x is not supported: its loader logs an error for the plugin and runs without
it, so nothing is gated. The plugin runs `greenproof check --hook opencode` when a top-level
session is about to go idle, and `greenproof session-start --hook opencode` on the first prompt
of a top-level session. `uv` (for `uvx greenproof@<version>`) or `greenproof` itself must be on the
PATH of the OpenCode process; without either the check cannot start and fails open. See
[integrations/opencode/README.md](integrations/opencode/README.md) for exactly what runs.

- A block continues the same run, with greenproof's message as the next input.
- A release is only a console warning; 2.x gives plugins no toast or log API, so it is not
  shown in the session.
- Session start runs on the first prompt the OpenCode process sees for a top-level session
  (2.x has no session-start hook, and `session.created` is published before plugins can
  subscribe); a `--continue` run sends `resume`. If the hook cannot be registered or the
  session cannot be read, the session start is skipped with a warning and the gate on stop
  still works.
- Every failure (a missing executable, an error exit, invalid output, a timeout after 3600
  seconds for the check or 120 seconds for session start) fails open with a
  `greenproof could not run: ...` warning.

Two ways to install it:

```bash
greenproof init --agents opencode
```

writes `.opencode/plugins/greenproof.js` with the hook command filled in. The file is
greenproof's: its first line says so and re-running `init` replaces it. A file at that path
without that first line is never overwritten; `init` exits with code 4 and writes nothing.
Or use the npm package [`opencode-greenproof`](https://www.npmjs.com/package/opencode-greenproof) in `opencode.json`:

```json
{ "plugins": ["opencode-greenproof"] }
```

Having both is safe: when two copies of the plugin load in one process, one stop is checked
and continued once.

### Agents without a hook that can block

These agents have no stop hook that can hold the agent at the end of a task, so greenproof
installs no hook for them (as of 2026-11-12). What they have is AGENTS.md, which `init` writes
and which tells the agent to run `greenproof check`, and CI: `greenproof init --ci github`
adds the check to every pull request, and that is their gate.

| agent | hook situation | reads AGENTS.md (per [agents.md](https://agents.md)) |
|---|---|---|
| Cline | `afterRun` is observe-only | not documented |
| Roo Code | no hook that can block a stop | yes |
| Windsurf Cascade | `post_cascade_response` is fire-and-forget | yes |
| Zed | no hook that can block a stop | yes |
| Warp | no hook that can block a stop | yes |
| Aider | no hook that can block a stop | yes |
| Continue | no hook that can block a stop | not documented |
| Kiro | blocking on Agent Stop is not documented | not documented |
| Devin | no hook that can block a stop | yes |
| Jules | no hook that can block a stop | yes |

Goose, Junie, Amp and Kilo Code do have hooks that can block, in a new format or a plugin
runtime. They are planned, not supported yet.

### What hooks can and cannot do

- **Hooks are advisory.** The agent shares your shell. It can edit the hook files, the
  session marker and greenproof's state files under the git directory, or run the check
  and ignore it.
- **Hooks fail open.** Every supported agent treats a hook that cannot start as a
  non-blocking error, so a missing `greenproof` executable means no gate.
- **The gate does not trap the agent.** If nothing has changed since the base, the check
  passes without running. If the agent stopped again with the same candidate tree after
  being blocked, it is released, so an agent that cannot fix something can stop and tell
  you. The 8th consecutive failed stop in a session is released too.
- **CI is the authority.** Run the same check in CI on every pull request, where the
  agent's edits to local files do not count.

## Plugins

One plugin installs the hooks in Claude Code, Codex and Cursor, without running
`greenproof init` in each repository. On stop it runs `uvx greenproof@<version> check --hook
AGENT`; on session start it runs `uvx greenproof@<version> session-start --hook AGENT`. It
needs [uv](https://docs.astral.sh/uv/) on your PATH: without it the hook cannot start and
fails open, so nothing is gated. See [plugins/greenproof/README.md](plugins/greenproof/README.md)
for exactly what runs.

Claude Code:

```bash
claude plugin marketplace add technobasant/greenproof
claude plugin install greenproof@greenproof
```

Claude Code 2.1.275 or later can do both in one step:
`/plugin install greenproof --marketplace technobasant/greenproof`.

Codex, from this repository's marketplace (the public Codex directory does not accept
plugins with lifecycle hooks):

```bash
codex plugin marketplace add technobasant/greenproof
```

Cursor: copy `plugins/greenproof` to `~/.cursor/plugins/local/greenproof` and reload the
window, or have a team admin import this repository as a team marketplace.

The plugin does not read your policy, so its Stop hook has a one-hour timeout. Add the
policy with `uvx greenproof@<version> init --agents none`, which writes `.greenproof.toml`
and the AGENTS.md section (and the `@AGENTS.md` import in an existing `CLAUDE.md`) and no
hooks. With both the plugin and `init` hooks installed,
greenproof makes one decision per stop.

## CI

### The GitHub Action

```yaml
name: greenproof
on: pull_request
permissions:
  contents: read
jobs:
  greenproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<full commit SHA>
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: technobasant/greenproof@<full commit SHA>
```

Pin actions to a full commit SHA. Inputs: `base`, `checks`, `allow-policy-change` (default
`false`), `accept-comments` (default `true`) and `token`. The output is `exit-code`. The
action runs `greenproof check --mode ci`, writes the job summary and annotations, uploads
`greenproof.json` as the `greenproof-report` artifact, and exits with greenproof's code.

### The generated workflow

`greenproof init --ci github` writes `.github/workflows/greenproof.yml`. It does not use the
action, so it needs no greenproof release SHA. It triggers on `pull_request` only, with
`contents: read` and `pull-requests: read`, checks out with `fetch-depth: 0`, sets up the
toolchain for the stacks it detected, and runs
`uvx greenproof@<version> check --mode ci --github-annotations --github-accept`. An existing
workflow file is kept unless `--yes` is given. Actions in the generated file are pinned to
full commit SHAs.

In CI mode `setup` runs first when the policy has one. When it has none, `init` adds the
install step to the workflow: for a plain-pip Python project (no uv or poetry), an
"Install Python dependencies" step running `python -m pip install` with the package
(`-e ".[test]"`, or the `tests`, `testing` or `dev` extra, else `-e .`), `-r` for
`requirements.txt` and the development and test requirements files, and the pytest, ruff, mypy
or pyright the policy runs; for npm without a lockfile, `npm install`. If the project has a
`src/` directory and the install is editable, the run step also sets `PYTHONPATH: src`, so the
revert check's base worktree imports its own `src/` and not the editable install of the
checkout. `init` does not propose these as `setup`, because `setup` also runs in `--isolate`
and revert worktrees. For a policy you wrote by hand without `setup`, add `setup` or your own
install step.

### pre-commit

The repository exposes a `greenproof` hook (`entry: greenproof check`, stage `pre-push`,
`always_run: true`, no filenames) for the pre-commit framework.

## Accepting a finding

Some changes are legitimate: dropping the test of a removed feature, a platform-specific
skip. There are two ways through, and only one of them counts.

- **In CI (authoritative).** With `--github-accept` on a pull request, greenproof reads the
  pull request's comments. A line `/greenproof accept FINGERPRINT [FINGERPRINT ...]` in a
  comment by a repository owner, member or collaborator accepts those findings. Comments by
  bots and outside contributors are ignored. If the comments cannot be read, nothing is
  accepted and the report says so. When a finding blocks, the job summary shows the exact
  comment to post; post it and re-run the job. The workflow does not trigger on comments.
- **Locally (advisory).** `greenproof accept FINGERPRINT... [--reason TEXT]` records the
  acceptance, with your git identity, in `<git-common-dir>/greenproof/accepted.json`.
  `greenproof accept --list` shows them and `greenproof accept --revoke FINGERPRINT` removes
  one. Local and hook modes honour these; CI mode ignores them. The agent can run this
  command too, which is why the agent instructions say never to, and why it carries no
  weight in CI.

An accepted finding keeps its severity, is marked accepted in every report, and does not
affect the exit code.

## Smoke checks

`greenproof init` never writes a `[smoke]` table, because it cannot know how to start your
application. Add it by hand, and add `"smoke"` to the CI checks:

```toml
[smoke]
start = "uv run uvicorn app.main:app --port 8765"
ready_url = "http://127.0.0.1:8765/health"
probes = ["curl -fsS http://127.0.0.1:8765/health"]
timeout = 60

[modes.ci]
checks = ["static", "commands", "revert", "smoke"]
```

`start`, `ready_url` and at least one probe are required for the check to run. With no
`[smoke]` table it is skipped with a note. A table that sets some of the three keys but not
all is a policy error (exit 4). A table that sets all three but leaves one empty (`start = ""`,
`probes = []`) is skipped with a note that names what is missing.

`greenproof init --yes` rewrites the whole policy file from what it detects. Tables written
by hand, such as `[smoke]` and `[rules]`, are not carried over, so keep them in version
control before re-running it with `--yes`. Without `--yes`, an existing policy is kept.

## Limits

greenproof reports patterns, not proofs. Read these before relying on it.

- **The rules are heuristics.** Python test files are analysed as syntax trees. JavaScript,
  TypeScript, Go and Rust test files get line-level checks: assertion counts, matcher
  strength and skip markers. They see less.
- **Some rules are Python only.** `code.hardcoded` works on Python syntax trees only, and
  so do the finest `tests.weakened` checks (an exact check loosened, a vacuous assertion).
- **Known limits in 0.4.0.** SPEC 5.6, "Known limits (0.4.0)", lists them by area. The 0.3.0
  list below it is kept, with each item marked closed, narrowed or still open in 0.4.0. The
  main ones: with more than 32
  different pytest runs on the policy path the runs are not compared one by one (the configuration alone is judged, with a warning); a check that moves
  to a different subject blocks as weakened; and among the line-level engines only Go credits
  a table loop or helper that replaces separate checks (it warns), while a Rust or JS loop
  that replaces them blocks.
- **Intent is not visible.** A legitimate rewrite and a weakened test can look alike.
  That is why the noisier rules default to `warn`, and why there is a way to accept a
  finding.
- **It blocks some honest changes.** Replaying 698 test-touching commits from four
  projects, 12 were blocked although the checking was still there in another form, for
  example moved to another file or merged into one larger assertion (21 on 0.3.1).
  MEASUREMENTS.md lists them.
- **The revert check supports four runners:** pytest, jest, vitest and `go test`. A make or
  just target, or any other runner, is skipped with a note.
- **Hooks are advisory,** as described above, and CI is where the gate holds.
- **It does not judge code.** It does not review the change, scan for vulnerabilities or
  measure coverage. A suite that was weak at the base is still weak.
- **Windows is not tested.** CI runs on Linux and macOS.

## Measurements

What greenproof detects and what it wrongly flags is measured, not asserted here. See
[MEASUREMENTS.md](MEASUREMENTS.md).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). The design is in
[SPEC.md](SPEC.md) and changes are listed in [CHANGELOG.md](CHANGELOG.md). Licensed under
the Apache License 2.0.
