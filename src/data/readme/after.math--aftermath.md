# Aftermath — post-failure recovery skill for AI coding agents

[![skills.sh](https://skills.sh/b/moah0911/aftermath)](https://skills.sh/moah0911/aftermath)
[![npm](https://img.shields.io/npm/v/@after.math/aftermath)](https://www.npmjs.com/package/@after.math/aftermath)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![Aftermath logo](assets/logo.png)

Most agent skills teach how to build. Aftermath teaches how to **stop and recover** when something already broke: a test suite goes green → red, the same error recurs, a build or dependency resolution fails, a test is flaky, a merge conflicts, a destructive command looms, or the user says "you broke it".

<details>
<summary>ASCII banner (terminal)</summary>

```
 ██  ████ █████ ████ ███  █   █  ██  █████ █  █
█  █ █      █   █    █  █ ██ ██ █  █   █   █  █
███ ███    █   ███  ███  █ █ █ ████   █   ████
█  █ █      █   █    █ █  █   █ █  █   █   █  █
█  █ █      █   ████ █  █ █   █ █  █   █   █  █

            stop · revert · recover
```
</details>

## Two names, one project

| Namespace | Identifier | Used for |
|-----------|-----------|----------|
| **npm** | `@after.math/aftermath` | The npm package: `npm i @after.math/aftermath`, `npx @after.math/aftermath init` |
| **GitHub** | `moah0911/aftermath` | The repo: source for Claude Code / Codex marketplaces, skills, curl installer |

The npm scope is the publisher's npm account (`after.math`); the GitHub org is `moah0911`. They are different namespaces — use the npm scope for npm commands and the GitHub org for marketplace/source commands.

## Install

```bash
npm i @after.math/aftermath      # project scope: wires the agent(s) in this project
npm i -g @after.math/aftermath    # global: installs the CLI; run `aftermath-install` for user scope
```

The install script wires whichever agents it finds on your machine:

| Agent | What happens on `npm i` |
|-------|--------------------------|
| **OpenCode** | Plugin, commands, hooks, and skills are copied into the project; `opencode.json` gets `"plugin": ["./.opencode/plugins/aftermath.mjs"]` (a relative path — no symlinks into `node_modules`, which npm prunes) |
| **Claude Code** | `claude plugin install aftermath --marketplace moah0911/aftermath --scope project` (Claude ≥ 2.1.292; older versions fall back to `claude plugin marketplace add moah0911/aftermath` + `claude plugin install aftermath@aftermath`) |
| **Codex** | `codex plugin marketplace add moah0911/aftermath` + `codex plugin add aftermath@aftermath` (Codex has no project scope — this is user scope) |

Not installed? Nothing is touched for that agent — the summary just says "not detected".

Opt out entirely with `AFM_SKIP_INSTALL=1` or npm's `--ignore-scripts`.

### User scope (all projects)

```bash
aftermath-install                 # wire every detected agent for the current user
aftermath-install --host codex    # one agent
aftermath-install --dry-run       # show what would change
aftermath-install --uninstall     # remove the wiring
```

User-scope OpenCode wiring stages a durable copy under `~/.config/aftermath/runtime/` and points `~/.config/opencode/opencode.json` at it.

### Initialize a project

```bash
npx @after.math/aftermath init          # detect stack + write .aftermath/config.json
npx @after.math/aftermath init --dry-run --json
npx @after.math/aftermath init --run-tests   # also record a baseline (opt-in)
```

`init` wires **only the agent you are running in** — it detects OpenCode,
Claude Code (`CLAUDECODE`), or Codex (`CODEX_*`) and never touches another
agent's configuration. Use `--host opencode|claude|codex|all` (or
`AFTERMATH_HOST=<host>`) to choose explicitly.

Init detects test/build commands, disposable artifacts, and protected paths, then writes
`.aftermath/config.json`. From then on, `rm -rf node_modules` or `rm -rf dist` is allowed
while `rm -rf src`, `.env`, `.git`, and unknown targets stay blocked. It never runs
destructive commands and never enables `autoRevert`.

Full flags, detection matrix, config schema, and policy reasons: [`docs/init.md`](docs/init.md).

```json
{
  "version": 1,
  "defaultMode": "full",
  "autoRevert": false,
  "stacks": ["node"],
  "packageManager": "npm",
  "testCommands": ["npm test"],
  "buildCommands": ["npm run build"],
  "safePaths": ["node_modules", "dist", "coverage"],
  "protectedPaths": [".git", ".env*", "src", "tests", "package.json"],
  "destructiveAllowlist": []
}
```

### Python toolchains (no Node.js needed)

The same `init` flow ships as a standalone Python wheel — stdlib only, no runtime dependencies:

```bash
uv run --project . python -m afm init     # from a checkout
# PyPI publish is pending — `uvx afm-recovery init` will work once released.
```

## The ladder (`AFTERMATH.md`)

After any failure, stop at the first rung that holds:

1. Uncommitted / one file / cheap to undo? → Revert now. Do not patch forward.
2. Last-known-good exists? → Diff it, isolate one change, revert just that.
3. 2nd+ failed attempt at the same fix? → State exact error, state theory, ask.
4. Next action irreversible? → Confirm state explicitly. Never assume.
5. Filling a gap with a guess? → Say so out loud.
6. User just corrected you? → Do not defend. Find the diff. Fix only that.

Honesty under pressure: never hide a break, never silently revert, never invent an unverified root cause.

## What the plugin enforces

- **Destructive commands are blocked** at `full`/`ultra` (force push, reset --hard, clean -f, rm -rf, drop, prune, destroy). `lite` only flags them. `destructiveAllowlist` handles intentional exceptions.
- **Project-aware path policy:** after `aftermath init`, filesystem deletes are allowed only when every target is a literal path under `safePaths` and outside `protectedPaths`. Unknown, dynamic, absolute-outside, or protected targets stay blocked. Claude Code and Codex use the same policy through `PreToolUse`.
- **Forward edits are frozen while a failure is unresolved.** OpenCode blocks `edit`/`write`; Claude Code and Codex block Edit/Write/MultiEdit in `PreToolUse`. Get a test green, run `/aftermath-revert`, or drop to `lite`/`off`.
- **Ultra checkpoints (opt-in):** snapshot files before edits, mark last-known-good on a green test, restore only matching files on a green→red test. Manual edits become reported conflicts, never overwritten.
- **Detection:** test failures, repeat-error attempt ledger, flaky alternation, build failure, dependency resolution, merge conflicts, and phrase-level correction signals. Claude Code and Codex receive the same pointers through `PostToolUse` and `UserPromptSubmit`.

| Host | Destructive block | Forward-edit freeze | Failure signals | Checkpoints |
|------|-------------------|--------------------|-----------------|-------------|
| OpenCode | full/ultra, path-aware | full/ultra | in-process | ultra + `autoRevert` |
| Claude Code | PreToolUse, path-aware | full/ultra | PostToolUse + UserPromptSubmit | — |
| Codex | PreToolUse, path-aware | full/ultra | PostToolUse + UserPromptSubmit | — |

## Intensities

| Level | Behavior |
|-------|----------|
| `lite` | Flags the problem, suggests the revert, lets the user decide. No blocks or auto-revert. |
| `full` | Default. Stops forward motion, blocks destructive commands and edits after a failure, runs the diff/isolate diagnostic, asks before the next edit. |
| `ultra` | Same guards as full, plus checkpoint auto-revert when `autoRevert: true`. Reports what was restored and what conflicted. |
| `off` | Disabled. |

Switch with `/aftermath [lite|full|ultra|off]`.

## Configuration

Global: `~/.config/aftermath/config.json` (or `$XDG_CONFIG_HOME/aftermath/config.json`).
Project: `.aftermath/config.json` (written by `aftermath init`; found by walking up to the nearest `.git`).

```json
{
  "defaultMode": "full",
  "autoRevert": true,
  "destructiveAllowlist": ["rm -rf ./dist", "git clean -fd"]
}
```

- `autoRevert` defaults to `false`; it only matters at `ultra`.
- `destructiveAllowlist` entries are command substrings; keep them narrow.
- Project values override scalars; `destructiveAllowlist`, `testCommands`, `buildCommands`, and `protectedPaths` union with global values. `AFTERMATH_DEFAULT_MODE` overrides `defaultMode`.
- `safePaths`/`protectedPaths` power the path-aware destructive policy.

## Slash commands

- `/aftermath [lite|full|ultra|off]` — switch intensity or report state
- `/aftermath-status` — what changed since last-known-good, plus failure/checkpoint state
- `/aftermath-revert` — undo the last change, nothing more
- `/aftermath-audit` — scan the diff for scope creep
- `/aftermath-log` — append a one-line postmortem to `AFTERMATH.log`
- `/aftermath-checkpoint status|clear|restore` — inspect, clear, or manually restore checkpoints
- `/aftermath-init` — initialize the project with destructive-safe paths

## Other install paths

<details>
<summary>Checkout / manual, curl bootstrapper, skills-only</summary>

**Checkout / manual:**

```bash
git clone https://github.com/moah0911/aftermath
node aftermath/scripts/install.js --project --host all
```

`--host opencode|claude|codex|all` filters the host steps, `--source` uses an existing
checkout, `--mode lite|full|ultra|off` persists a default level, `--dry-run` prints the
actions, and `--uninstall` removes the wiring. OpenCode is wired by copying assets into
the project; Claude Code and Codex are installed through their CLIs when available.

**Curl bootstrapper (no npm):**

```bash
curl -fsSL https://raw.githubusercontent.com/moah0911/aftermath/main/scripts/install.sh | bash -s --
```

**Any skills-compatible agent (skills only):**

```bash
npx skills add moah0911/aftermath -g -y
```

This installs the skills only. Hosts with lifecycle hooks get the fuller enforcement;
see [`docs/agent-portability.md`](docs/agent-portability.md).

</details>

## Uninstall

```bash
npm uninstall @after.math/aftermath      # removes staged project assets + the opencode entry
aftermath-install --uninstall             # removes user-scope wiring
```

Both only delete files they created — anything you edited is left in place. Claude Code
and Codex plugins are removed through their own CLIs when present.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm error 404 ... Scope not found` | Scope doesn't match your npm account | The scope must equal your npm username (`@after.math` for account `after.math`). Scopes are case-sensitive and dots are literal. |
| `npx @after.math/aftermath init` prints "No matching version found" | npm's metadata CDN lags a fresh publish by a few minutes | Retry in a minute, or pin the exact tarball URL: `npx https://registry.npmjs.org/@after.math/aftermath/-/aftermath-0.6.0.tgz` |
| Plugin loads but skills are missing | OpenCode caches plugin config at startup | Restart the agent after installing |
| `aftermath init` doesn't detect your stack | No recognized manifest in the project root | Run it from the project root; see the detection matrix in [`docs/init.md`](docs/init.md) |
| Claude Code: "invalid manifest file" | Plugin manifest shape | Must be `author` as an object and `skills`/`hooks` starting with `./` — fixed in 0.6.0 |
| Install script did nothing | Opted out or global install | `npm i` without `--ignore-scripts` and without `AFM_SKIP_INSTALL=1`; global installs need `aftermath-install` |
| `init` wired the wrong agent | Host auto-detection picked another one | `init --host opencode` (or set `AFTERMATH_HOST=opencode`) |

Node.js ≥ 18 is required (the installer and plugin use modern APIs).

## Layout

```
AFTERMATH.md          # the ladder — always loaded, ~dozen lines
SKILL.md              # root skill entry (discovery pointer)
AGENTS.md             # agent-facing ruleset pointer
assets/               # logo.png, icon.png, aftermath.txt (via scripts/make-logo.py)
docs/                 # init/config and agent-portability references
hooks/                # config, instruction builder, signals, checkpoints, policy, host hooks
skills/               # aftermath + 7 failure-category playbooks
commands/             # portable slash commands (mirrored to .opencode/commands/)
.opencode/plugins/    # server plugin (ladder injection + enforcement + tripwires)
scripts/              # cli.js, init.js, install.js, postinstall.js, postuninstall.js, checks
src/afm/              # Python port of init (stdlib only; PyPI: afm-recovery, pending)
pyproject.toml        # Python packaging
tests/                # node:test suite + python unittest suite
```

## Verify

```bash
npm test              # full node:test suite
npm run test:py       # python suite (incl. node↔python parity)
npm run test:coverage # runtime coverage gate (95% lines / 85% branches / 98% funcs)
npm run check         # rule-copy + version alignment
```

## Release

Versions are kept in lockstep across `package.json`, `.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `pyproject.toml`, and
`src/afm/__init__.py` — `npm run check` fails if they drift.

```bash
npm version patch     # bump everywhere, then npm run check
npm publish --access public
```

The GitHub Actions workflows (`.github/workflows/npm-publish*.yml`) publish on GitHub
release events when the `npm_token` repository secret is present; without it, publish
locally as above.

## License

MIT — see `LICENSE`.
