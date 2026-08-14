# OpenCode Omni Memory Plugin

Native, local, Git-friendly long-term memory and project continuity for [OpenCode](https://opencode.ai/).

The package installs a global `omni-memory` skill, a companion plugin, seven slash commands, global memory files, and OpenCode instruction wiring. It keeps durable memory separate from mutable project state such as specifications, roadmaps, progress, findings, decisions, and session handoffs.

Formerly published as `opencode-markdown-memory`; installing this version over an old install migrates it in place.

## Features

- Global cross-project memory
- Host-specific memory
- Project-scoped durable memory
- Branch-aware continuation handoffs
- Protected project charter and agent-maintained working specification
- Roadmap, progress, findings, and decision tracking
- Temporary journals for concurrent sessions
- Conservative automatic capture at meaningful transitions
- Self-evolution: user corrections and repeated friction are captured once, then promoted from memory into governing configuration
- Session bootstrap injected by the companion plugin so memory behavior is in context from turn one
- Compaction defense: the plugin instructs continuation summaries to carry forward memory pointers and un-persisted decisions
- Bounded startup injection with detailed retrieval on demand
- Plain Markdown storage with no external memory service
- Idempotent installer with update, status, backup, and uninstall support

## How it works

Three layers cooperate:

1. **Instructions** (`opencode.json` `instructions` array) auto-load global memory, project memory, and the project handoff into every request.
2. **Plugin** (`plugins/omni-memory.js`) injects a compact orientation bootstrap into the first user message of each session (idempotent, marker-guarded) and pushes continuation requirements into the compaction prompt via `experimental.session.compacting`. The plugin cannot write files; it makes behavior consistent, while the skill defines it.
3. **Skill** (`skills/omni-memory`) holds the full rulebook — orientation, precedence, retention, transitions, concurrency, handoff, archival — and is loaded on demand for substantive work.

## Storage model

Global state:

```text
~/.config/opencode/memory/
├── GLOBAL.md                 # Always loaded
├── HANDOFF.md                # Cross-project continuation, loaded on demand
├── hosts/<hostname>.md       # Host-specific facts
└── archive/
```

Project state is created lazily under the active project:

```text
.opencode/project/
├── INDEX.md
├── MEMORY.md                 # Always loaded
├── HANDOFF.md                # Always loaded
├── CHARTER.md
├── SPEC.md
├── ROADMAP.md
├── PROGRESS.md
├── FINDINGS.md
├── DECISIONS.md
├── sessions/                 # Temporary and Git-ignored
└── archive/<milestone>/
```

Only global memory, project memory, and project handoff are inserted automatically. Detailed project state is retrieved when relevant, keeping normal startup context small.

## Requirements

- OpenCode
- Bash
- Git
- Node.js

The installer edits strict JSON. If your only global configuration is an `opencode.jsonc` containing comments or trailing commas, follow the manual configuration section before running the installer.

## Install

### Recommended: npm package

The package bundles the installer and all managed files, so no separate clone is required:

```bash
npx opencode-omni-memory-plugin install
```

Or install it globally to keep the `update`, `status`, and `uninstall` subcommands handy:

```bash
npm install -g opencode-omni-memory-plugin
opencode-omni-memory-plugin install
```

Then quit and restart OpenCode. The same subcommands documented below (`update`, `status`, `uninstall`) work through the `opencode-omni-memory-plugin` binary.

### Alternative: inspect and clone

```bash
INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/opencode-omni-memory-plugin/repo"
git clone https://github.com/caoool/opencode-omni-memory-plugin.git "$INSTALL_DIR"
"$INSTALL_DIR/install.sh" install
```

Then quit and restart OpenCode.

### One-line bootstrap

This downloads the installer, which clones the repository into the managed data directory before installing:

```bash
curl -fsSL https://raw.githubusercontent.com/caoool/opencode-omni-memory-plugin/main/install.sh | bash -s -- install
```

Review remote scripts before piping them to a shell if you do not control the source.

### Migrating from opencode-markdown-memory

Run `install` (or `update`) from this repository. The installer:

- Replaces the legacy `skills/markdown-memory` with `skills/omni-memory` (the legacy copy is backed up)
- Migrates the managed `AGENTS.md` block from the old `opencode-markdown-memory` markers to the new ones in place
- Leaves all memory data untouched

If your old managed checkout lives at `~/.local/share/opencode-markdown-memory/repo`, point its remote at the renamed repository or re-clone into the new path shown above.

## Update

For the recommended managed checkout:

```bash
"${XDG_DATA_HOME:-$HOME/.local/share}/opencode-omni-memory-plugin/repo/install.sh" update
```

If you cloned the repository elsewhere:

```bash
/path/to/opencode-omni-memory-plugin/install.sh update
```

The updater performs a fast-forward-only Git update and reinstalls managed files. Existing managed files that differ are backed up under:

```text
${XDG_DATA_HOME:-$HOME/.local/share}/opencode-omni-memory-plugin/backups/<timestamp>/
```

User memory files are created only when missing and are never overwritten during updates.

Restart OpenCode after every install or update because configuration, commands, plugins, and skills are loaded at startup.

## Status

```bash
"${XDG_DATA_HOME:-$HOME/.local/share}/opencode-omni-memory-plugin/repo/install.sh" status
```

## Uninstall

```bash
"${XDG_DATA_HOME:-$HOME/.local/share}/opencode-omni-memory-plugin/repo/install.sh" uninstall
```

Uninstall removes the managed skill, plugin, commands, the managed `AGENTS.md` block, and the three configuration instruction entries. It deliberately preserves:

- `~/.config/opencode/memory/`
- Every project's `.opencode/project/`
- The downloaded repository checkout

Delete those manually only if you no longer need the stored memory or updater source.

## Commands

After restarting OpenCode:

```text
/project-init [full]
/remember [global|host|project] <fact>
/recall <query>
/forget <query>
/handoff
/project-status
/memory-audit [global|project|all]
```

Natural language works too:

```text
Remember globally that I prefer pnpm.
Remember for this project that migrations must be backward compatible.
Recall what we decided about authentication.
Prepare a handoff for the next session.
```

## Automatic behavior

For substantive tasks, the injected bootstrap and installed global instructions tell OpenCode to:

1. Orient silently from memory before acting; verified repository state overrides remembered state.
2. Load the `omni-memory` skill for the full procedure when work is substantive.
3. Retrieve charter, spec, roadmap, progress, findings, and decisions only when relevant.
4. Update project state after material decisions, milestone changes, blockers, or verification results.
5. Capture user corrections and repeated friction once, in the narrowest correct scope, and promote standing behavior rules out of memory into governing configuration.
6. Enforce a single writer: only the primary agent writes memory or project state; subagents report candidate lessons instead.
7. Perform a conservative durable-memory check at task completion.

The skill does not record raw transcripts, logs, secrets, temporary status, or unverified assumptions. The plugin's compaction hook asks the summarizer to carry forward memory pointers and un-persisted state, but it cannot write files; if OpenCode terminates abruptly, meaningful-transition checkpoints and `/handoff` provide best-effort continuity.

## Project initialization

Project state is normally created on the first durable project fact. To initialize explicitly:

```text
/project-init
```

This creates `INDEX.md`, `MEMORY.md`, and `HANDOFF.md`.

For the complete project-control structure:

```text
/project-init full
```

The initializer preserves existing files. Existing project documentation remains independent; `.opencode/project/INDEX.md` records its relationship to the agent working specification.

## Manual configuration

The installer adds these entries to the global `instructions` array:

```json
{
  "instructions": [
    "~/.config/opencode/memory/GLOBAL.md",
    ".opencode/project/MEMORY.md",
    ".opencode/project/HANDOFF.md"
  ]
}
```

If your configuration uses commented JSONC, add those entries manually, temporarily provide a strict `opencode.json`, then rerun the installer. The installer refuses to rewrite commented JSONC because doing so could destroy comments or formatting.

The installer also maintains an idempotent block in `~/.config/opencode/AGENTS.md` between:

```text
<!-- opencode-omni-memory-plugin:start -->
<!-- opencode-omni-memory-plugin:end -->
```

Legacy `opencode-markdown-memory` markers are migrated automatically.

## Custom locations and versions

```bash
OPENCODE_CONFIG_DIR=/custom/opencode \
OPENCODE_OMNI_MEMORY_HOME=/custom/data/opencode-omni-memory-plugin \
OPENCODE_OMNI_MEMORY_REF=main \
./install.sh install
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `OPENCODE_CONFIG_DIR` | Override the OpenCode config directory |
| `OPENCODE_OMNI_MEMORY_HOME` | Override checkout, backups, and install metadata |
| `OPENCODE_OMNI_MEMORY_REF` | Select the Git branch/ref used by update |
| `OPENCODE_OMNI_MEMORY_SOURCE` | Install from a local checkout for development/testing |
| `OPENCODE_MEMORY_HOSTNAME` | Override the host-memory filename |

## Development test

Install into an isolated temporary home without touching your actual OpenCode configuration:

```bash
TEST_HOME="$(mktemp -d)"
HOME="$TEST_HOME" \
XDG_CONFIG_HOME="$TEST_HOME/.config" \
XDG_DATA_HOME="$TEST_HOME/.local/share" \
OPENCODE_OMNI_MEMORY_SOURCE="$PWD" \
./install.sh install
```

Then run `status`, `update`, and `uninstall` with the same environment.

The repository also includes an isolated smoke test:

```bash
./tests/install-smoke.sh
```
