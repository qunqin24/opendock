# skill-audit

[![CI](https://github.com/DepickereSven/skill-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/DepickereSven/skill-audit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/opencode-skill-audit?logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/opencode-skill-audit)
[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-D97757?logo=claude&logoColor=white)](#claude-code)
[![Codex](https://img.shields.io/badge/Codex-supported-000000?logoColor=white)](#codex)
[![OpenCode](https://img.shields.io/badge/OpenCode-supported-FBBF24?logo=opencode&logoColor=white)](#opencode)

Deterministic audit trail for [Claude Code](https://code.claude.com),
[Codex](https://developers.openai.com/codex/) and [opencode](https://opencode.ai) sessions: which
observable **skills** were invoked, when, and which **files** were changed afterwards. It gives you
a quick skill-compliance signal before you read the code.

On opencode it also renders live in the TUI sidebar, so the audit sits next to the conversation
with no command to run.

```text
● Skill audit — f3a91c2e · ~/Dev/Web · 14:02→14:20 UTC

  14:02 ⚡ superpowers:brainstorming
  14:05 ⚡ superpowers:test-driven-development
  14:06 │  ✎ src/auth/token.ts  Edit
  14:09 │  ✎ src/auth/token.test.ts  Write
  14:20 ⚠ (no skill active)
  14:20 │  ✎ src/index.ts  Edit

● 2 skill runs (2 distinct) · 3 files touched · ⚠ 1 edits outside skill context
```

## Why

You ask an agent to follow a skill. Did it? Reading the transcript to find out is slow, and asking
another model to judge costs tokens and is itself non-deterministic.

LLMs are not deterministic. Hook events are. This plugin logs the facts exposed by each host's
documented hook API:

- **No LLM judging, no tokens.** Everything except the two in-session slash/skill commands runs
  entirely outside the model.
- **No transcript parsing.** Only documented hook payloads, so nothing silently breaks on a
  transcript format change.
- **One data model across three hosts.** The NDJSON log is the only contract, so the CLI reads
  opencode sessions and the opencode sidebar reads Claude Code sessions.
- **The red flag is a number.** `⚠ edits outside skill context` counts files changed while no
  observable skill was active.

## Contents

- [Why](#why)
- [How it works](#how-it-works)
- [Install](#install)
- [Verify the install](#verify-the-install)
- [Usage](#usage)
- [Data format](#data-format)
- [Troubleshooting](#troubleshooting)
- [Honest limitations](#honest-limitations)
- [Uninstall](#uninstall)
- [Requirements](#requirements)
- [Development](#development)
- [License](#license)

## How it works

`PostToolUse` hooks capture skill-tool calls and file edits. On Codex, a `UserPromptSubmit` hook
also captures explicit `$skill-name` references, and `apply_patch` payloads are expanded into one
file event per path. On opencode a plugin does the same job through the `tool.execute.after` hook.
Events are appended as NDJSON to `~/.claude/skill-audit/<session_id>.ndjson`. All three hosts
write to that one directory on purpose, so any viewer can read any host's session. Override the
location with `SKILL_AUDIT_DIR`.

```text
Claude Code / Codex ──hooks───▶ logger.sh ──┐
                                            ├─▶ ~/.claude/skill-audit/<sid>.ndjson
opencode ──tool.execute.after──▶ plugin ────┘             │
                                                          ├─▶ skill-audit status/report/watch/list
                                                          └─▶ opencode sidebar (live)
```

The log is the only contract between the writers and the viewers, so the CLI reads opencode
sessions and the opencode sidebar reads Claude Code sessions.

Subagent hook calls use the parent session ID, so delegated edits appear in the same audit.

## Install

### Claude Code

```text
/plugin marketplace add DepickereSven/skill-audit
/plugin install skill-audit@depickeresven-skill-audit
```

Restart Claude Code so the hooks load.

> **Migrating from a manual setup?** Remove any `logger.sh` entries from the `hooks` block of
> `~/.claude/settings.json` first, or every event is logged twice.

### Codex

```bash
codex plugin marketplace add DepickereSven/skill-audit
codex plugin add skill-audit@depickeresven-skill-audit
```

Start a new Codex session after installation. Codex asks you to review and trust plugin-bundled
hooks before they run. Plugins are available in Codex CLI and the ChatGPT desktop app's Codex
surface, but not in the IDE extension. See the official
[plugin](https://developers.openai.com/codex/plugins/build) and
[hook](https://developers.openai.com/codex/hooks) documentation.

Invoke the bundled Codex skill with `$skill-audit`.

### opencode

```bash
opencode plugin opencode-skill-audit --global
```

The plugin is published on npm as
[`opencode-skill-audit`](https://www.npmjs.com/package/opencode-skill-audit).

Restart opencode so the plugin loads. It registers two things: a server hook that logs
`skill`, `edit`, `write`, `multiedit`, `apply_patch` and `patch` tool calls, and a sidebar section
that renders the current session's timeline live.

![The opencode sidebar rendering a live skill-audit timeline beside a conversation](docs/opencode.png)

Click the header to collapse the section, or a skill row to fold its files away.

opencode discovers skills natively, including from `.claude/skills/` and `.agents/skills/`, so
skills you already use are logged without moving them. To get the in-session report as well, link
the bundled skill into a directory opencode scans:

```bash
ln -sf "$PWD/skills/skill-audit" ~/.config/opencode/skills/skill-audit
```

### CLI on your PATH (recommended)

The viewer works from any terminal. Link the installed script somewhere on your PATH.

Claude Code:

```bash
ln -sf ~/.claude/plugins/cache/*/skill-audit/*/scripts/skill-audit ~/.local/bin/skill-audit
```

Codex:

```bash
ln -sf ~/.codex/plugins/cache/*/skill-audit/*/scripts/skill-audit ~/.local/bin/skill-audit
```

You can also clone this repository and link `scripts/skill-audit` directly.

`~/.local/bin` is not on every system's `PATH`. Check with `command -v skill-audit`. If it prints
nothing, add the directory in your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Claude Code statusline segment (optional)

Plugins cannot modify your statusline. Add this to your own statusline script to get a live
`⚡2 ✎5 tdd` segment:

```sh
sid=$(echo "$input" | jq -r '.session_id // empty')
audit_log="$HOME/.claude/skill-audit/$sid.ndjson"
if [ -n "$sid" ] && [ -s "$audit_log" ]; then
  audit=$(jq -rs '
    [ .[] | select(.kind=="skill") ] as $s
    | ([ .[] | select(.kind=="file") | .path ] | unique | length) as $f
    | "⚡\($s|length) ✎\($f)"
      + (if ($s|length) > 0 then " " + ($s[-1].name | split(":") | last) else "" end)
  ' "$audit_log" 2>/dev/null)
  [ -n "$audit" ] && parts="$parts | $audit"
fi
```

## Verify the install

Hooks that never fire look exactly like a session with no skill usage, so confirm once after
installing.

1. In a **new** session on the host you installed, invoke any skill and edit one file. Invoking
   this plugin's own skill is enough:
   - Claude Code: `/skill-audit`
   - Codex: `$skill-audit`
   - opencode: watch the sidebar section appear
2. Check that a log exists and is growing. Look in `~/.claude/skill-audit`, or in the directory
   you set as `SKILL_AUDIT_DIR`:

   ```bash
   ls -la ~/.claude/skill-audit/
   ```

3. Read it back from any terminal:

   ```bash
   skill-audit list      # sessions, newest first
   skill-audit status    # counts + recent timeline for the newest session
   ```

If `list` prints `no session logs in ...`, nothing was written. Go to
[Troubleshooting](#troubleshooting).

## Usage

| Command                    | What                                                             |     Tokens |
|----------------------------|------------------------------------------------------------------|-----------:|
| `skill-audit status [sid]` | Compact counts and recent timeline                               |          0 |
| `skill-audit report [sid]` | Full timeline                                                    |          0 |
| `skill-audit watch [sid]`  | Live view, refreshed every two seconds. `q` quits                |          0 |
| `skill-audit list`         | Recent sessions                                                  |          0 |
| `skill-audit --help`       | Usage summary                                                    |          0 |
| `! skill-audit status`     | Run inside a Claude Code session. Queues while the model is busy |          0 |
| opencode sidebar           | Live timeline beside the conversation. No command to run         |          0 |
| `/skill-audit`             | Show the report inside Claude Code                               | Model turn |
| `$skill-audit`             | Show the report inside Codex                                     | Model turn |

`status`, `report` and `watch` all take an optional session ID. Without one they use the most
recently modified log, which is the wrong session if you run several at once. Get the ID from
`skill-audit list` and pass it explicitly.

The `⚠ edits outside skill context` counter is the compliance red flag: files changed while no
observable skill was active.

## Data format

One NDJSON file per session, one event per line, appended in chronological order:

```json
{"ts":"2026-07-10T14:05:11Z","kind":"skill","name":"superpowers:test-driven-development","args":"","cwd":"/Users/me/proj","source":"tool"}
{"ts":"2026-07-10T14:06:40Z","kind":"file","tool":"apply_patch","path":"/Users/me/proj/src/auth/token.ts","cwd":"/Users/me/proj"}
```

| Field     | On      | Meaning                                                                       |
|-----------|---------|-------------------------------------------------------------------------------|
| `ts`      | both    | UTC timestamp, `YYYY-MM-DDThh:mm:ssZ`                                         |
| `kind`    | both    | `skill` or `file`, the only two event kinds                                   |
| `cwd`     | both    | Session working directory as reported by the host                             |
| `name`    | `skill` | Skill identifier, e.g. `superpowers:test-driven-development`                  |
| `args`    | `skill` | Arguments passed to the skill tool, empty string when there were none         |
| `source`  | `skill` | `tool` for an observed skill tool call, `prompt` for a Codex `$skill-name`    |
| `turn_id` | `skill` | Codex turn identifier, present only when the host supplies one                |
| `tool`    | `file`  | Tool that made the edit: `Edit`, `Write`, `MultiEdit`, `apply_patch`, etc.    |
| `path`    | `file`  | Absolute path of the changed file (relative paths are resolved against `cwd`) |

Within a Codex turn, a repeated `(turn_id, name)` skill pair is written once, so a skill named
several times in one prompt does not inflate the counts.

The format is open, so you can build other viewers on top. Prune old logs with:

```bash
find ~/.claude/skill-audit -name '*.ndjson' -mtime +30 -delete
```

## Troubleshooting

**Nothing is logged / `no session logs in ...`**

- Did you restart the host after installing? Hooks and plugins load at startup, and an existing
  session keeps running without them.
- Confirm the plugin is installed: `claude plugin list`, `codex plugin list`, or check the
  `plugin` array in `~/.config/opencode/opencode.json`.
- On Codex, hooks only run after you review and trust them, so accept the prompt.
- Is `jq` installed? `logger.sh` exits silently without it, by design: the hook must never block a
  session. Check with `command -v jq`.

**Every event appears twice.** A manual `logger.sh` entry is still in the `hooks` block of
`~/.claude/settings.json` alongside the plugin's. Remove the manual one.

**The CLI shows an empty or unrelated session.** Without an argument the viewer picks the most
recently modified log, which is the wrong one when sessions run in parallel. Run `skill-audit list`
and pass the ID: `skill-audit report <sid>`.

**The CLI finds nothing but the logs exist.** Writer and viewer disagree about the directory. If
you set `SKILL_AUDIT_DIR` for the host, export it for your shell too. Otherwise the CLI looks in
`~/.claude/skill-audit`.

**`skill-audit: command not found`.** The symlink is missing or its directory is not on `PATH`.
See [CLI on your PATH](#cli-on-your-path-recommended).

**A skill ran but is missing from the timeline.** Expected in some cases. See
[Honest limitations](#honest-limitations).

## Honest limitations

- **Invocation is not compliance.** The log proves that a skill was explicitly selected or exposed
  as a tool event, not that the result followed every instruction.
- **Codex automatic skill loading is not a hook event today.** Explicit `$skill-name` references
  are captured. Skills that Codex chooses automatically are not. No transcript parsing is used to
  fill that gap.
- **Prompt-sourced entries are syntax-level evidence.** Codex supplies plain prompt text to the
  hook, so a lower-case dollar-prefixed token can be logged even if it does not resolve to an
  installed skill. The NDJSON `source: "prompt"` field distinguishes these entries.
- **Only observable file tools are captured.** Claude `Edit`/`Write`/`MultiEdit`/`NotebookEdit`,
  Codex `apply_patch`, and opencode `edit`/`write`/`multiedit`/`apply_patch`/`patch` edits are
  logged. Files created indirectly by shell commands are not visible as separate file events.
- **opencode agents and subagents are not logged.** They have no equivalent on the other two
  hosts, so logging them would add an event kind only one host can emit. The audit keeps one data
  model across all three.
- **Session-start injected skills** are context, not skill tool calls, and do not appear.
- **Concurrent sessions:** the newest-log default can pick the wrong session. Pass the session ID
  explicitly after using `skill-audit list`.

## Uninstall

Claude Code:

```bash
claude plugin uninstall skill-audit@depickeresven-skill-audit
```

Codex:

```bash
codex plugin remove skill-audit@depickeresven-skill-audit
```

opencode has no removal subcommand. Delete the `"opencode-skill-audit"` entry from the `plugin`
array in `~/.config/opencode/opencode.json` (or the project-local `opencode.json`), and remove the
skill symlink if you made one:

```bash
rm -f ~/.config/opencode/skills/skill-audit
```

Then restart the host. Finally, clean up the CLI symlink and the logs, which no uninstall touches:

```bash
rm -f ~/.local/bin/skill-audit
rm -rf ~/.claude/skill-audit
```

## Development

The hooks and the CLI viewer are plain bash (`scripts/`) with no build step. The opencode plugin
and sidebar are TypeScript (`src/`) built with [Bun](https://bun.sh).

| Path              | What                                                                       |
|-------------------|----------------------------------------------------------------------------|
| `scripts/`        | `logger.sh` hook target, the `skill-audit` CLI, `sync-versions.mjs`        |
| `src/`            | opencode plugin (`index.ts`), sidebar (`tui.ts`), shared log and view code |
| `test/`           | Bun tests, fixtures, and `test/format-contract.sh`                         |
| `.claude-plugin/` | Claude Code plugin manifest and marketplace entry                          |
| `.codex-plugin/`  | Codex plugin manifest                                                      |
| `.agents/`        | Codex marketplace manifest                                                 |
| `skills/`         | The `skill-audit` skill used by Codex and opencode                         |
| `commands/`       | The `/skill-audit` slash command for Claude Code                           |
| `.opencode/`      | Local opencode workspace for testing the plugin during development         |

```bash
bun install
bun run check     # format:check + lint + typecheck (src and test) + tests
bun run build     # dist/index.js (plugin) and dist/tui.js (sidebar)
```

| Script                   | What                                                     |
|--------------------------|----------------------------------------------------------|
| `bun run format`         | Prettier, write mode                                     |
| `bun run lint`           | ESLint over `src` and `test`                             |
| `bun run typecheck`      | `tsc --noEmit` for `src`                                 |
| `bun test`               | Bun test suite in `test/`                                |
| `bun run check`          | Everything CI runs                                       |
| `bun run check:versions` | Assert `package.json` and both `plugin.json` files agree |
| `bun run sync:versions`  | Rewrite the plugin manifests from `package.json`         |

Tests live in `test/`. `test/format-contract.sh` pins the rendered CLI output against fixtures, so
a change to the timeline format has to be updated there deliberately. That output is the contract
the sidebar and any third-party viewer rely on.

### Releasing

Two workflows, chained.

`.github/workflows/ci.yml` runs four jobs: it checks that both plugin manifests carry the same
version as `package.json`, runs `bun run check` on Bun 1.2.0 and on the latest Bun, builds the
bundles, and packs the npm tarball to confirm it ships every entry point `package.json` exports.
It runs on pull requests and on pushes to `main`, not on every branch, so a pull request is never
tested twice.

`.github/workflows/publish.yml` starts only when a CI run on `main` finishes successfully. It
checks out that exact commit and asks npm whether the version in `package.json` already exists:

- **Already on npm.** Nothing is released. This is what an ordinary push to `main` does.
- **Not on npm.** It publishes with provenance over OIDC, tags the commit, and opens a GitHub
  release with notes generated from the merged commits.

So a version bump landing on `main` *is* the release, and it can only happen after CI has gone
green on that commit.

To cut one:

```bash
npm version patch --no-git-tag-version   # or minor / major
git commit -am "chore: release $(node -p 'require("./package.json").version')"
git push
```

`--no-git-tag-version` matters. The workflow creates the `v<version>` tag itself, and it aborts
the release if that tag already exists while npm has never seen the version. The bump still runs
`scripts/sync-versions.mjs` and stages `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`
alongside it, keeping both manifests on the same version as `package.json`, which CI fails the
build over if they ever drift.

Use the publish workflow's manual trigger (`workflow_dispatch`) with *dry run* enabled to rehearse
a publication without releasing anything.

## Requirements

- macOS or Linux
- `bash` and `jq` for the CLI viewer and the Claude Code / Codex hooks
- opencode `>= 1.14` for the plugin and its sidebar

## License

[MIT](LICENSE) © Sven Depickere
