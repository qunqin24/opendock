<div align="center">
  <img src="https://raw.githubusercontent.com/psinetron/echoes-vault-opencode/main/images/EchoesVault.png" alt="EchoesVault" width="200" />
  <h1>EchoesVault for OpenCode</h1>
  <p>An OpenCode adapter for repository-local, agent-neutral project memory.</p>

  [![npm version](https://img.shields.io/npm/v/echoes-vault-opencode.svg)](https://www.npmjs.com/package/echoes-vault-opencode)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![OpenCode](https://img.shields.io/badge/OpenCode-plugin-blueviolet)](https://opencode.ai/docs/plugins/)
  [![BundleDex](https://bundledex.net/badge/echoes-vault-opencode.svg)](https://bundledex.net/bundles/echoes-vault-opencode/)
</div>

---

EchoesVault stores architectural decisions, verified fixes, daily work notes, and other durable
project knowledge as Markdown in the repository. Version 2 is a thin adapter for EchoesVault
Protocol 1.0.0: OpenCode, Codex, Claude Code, and scripts all delegate writes to the same
project-local runtime and share one knowledge base.

## Why version 2

- **One writer across agents** — every mutation uses `.echoes-vault/echoes_vault.py`.
- **Git-friendly collaboration** — daily entries use unique UTC-sortable files and the generated
  index is ignored, removing the usual cross-branch hot spots.
- **Safe concurrent updates** — a shared local lock, atomic file replacement, and current-content
  SHA-256 checks prevent silent overwrites.
- **Explicit lifecycle** — installing the plugin never initializes or migrates a repository.
- **Agent-neutral state** — all integrations use `.echoes-vault/state.json`; state is local and
  disposable, while Markdown remains the source of truth.
- **Deterministic discovery** — `EchoesVault/index.md` is generated from validated page metadata and
  is never edited as authored knowledge.
- **Portable and inspectable** — no network service, database, API key, or third-party Python
  package is required at runtime.

The complete implementer contract is in [EchoesProtocol.md](EchoesProtocol.md).

## Requirements

- [OpenCode](https://opencode.ai) `>= 1.16.0`
- Python `>= 3.9` available as `python3`

If Python uses another executable name, set `ECHOES_VAULT_PYTHON` for the OpenCode process.

## Installation

### Via OpenCode UI

1. Press <kbd>control</kbd> + <kbd>P</kbd>.
2. Select **Install plugin**.
3. Enter `echoes-vault-opencode`.
4. Restart OpenCode.

### Via configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["echoes-vault-opencode"]
}
```

Plugin installation is intentionally read-only for the current repository. Initialize or migrate
only the repositories where memory is wanted:

```text
/echoes-init
```

## Repository layout

```text
<repository>/
├── EchoesVault/
│   ├── .echoes-vault.json       # tracked protocol marker
│   ├── AGENT_PROTOCOL.md        # tracked compact agent guide
│   ├── index.md                 # ignored deterministic view
│   ├── pages/                   # tracked curated knowledge
│   ├── daily/YYYY-MM-DD/        # tracked unique session entries
│   ├── assets/                  # tracked referenced assets
│   └── raw/                     # tracked source material
└── .echoes-vault/
    ├── echoes_vault.py          # tracked shared writer
    ├── state.json               # ignored local state
    └── lock                     # ignored local lock
```

Knowledge pages require this frontmatter:

```yaml
---
type: architecture
stack: [typescript, python]
status: active
summary: OpenCode delegates all EchoesVault mutations to the shared project runtime.
---
```

The summary must be a non-empty single line of at most 160 characters.

## Workflow

### Initialize or migrate

```text
/echoes-init
```

This is the only normal entry point that creates or migrates the vault. It installs the portable
runtime, upgrades recognized legacy OpenCode commands and skills, imports compatible local session
state, validates page metadata, and rebuilds the generated index. Unknown user-owned adapter files
are preserved and reported for manual reconciliation.

### Restore a session

```text
/echoes-start
```

Loads the generated index and the three newest daily entries. It does not load the entire vault.

### Inspect health

```text
/echoes-status
```

Reports protocol, runtime, storage, metadata, conflicts, Git readiness, and scale. Status is
strictly read-only and never initializes, migrates, hydrates, or repairs files.

### Finalize a session

```text
/echoes-end
```

Finalization is available only after this explicit user command. It writes one unique session
summary and optional validated knowledge pages. Existing pages require a fresh SHA-256 obtained
immediately before the update.

## OpenCode tools

| Tool | Purpose |
|---|---|
| `echoes_activate_vault` | Explicit initialization or migration after `/echoes-init` |
| `echoes_start_session` | Restore index and recent entries after `/echoes-start` |
| `echoes_vault_status` | Read-only health card |
| `echoes_append_to_daily_log` | Write one unique intermediate daily entry |
| `echoes_search_vault_pages` | Targeted search across curated pages |
| `echoes_hash_vault_page` | Get the current hash required for a page replacement |
| `echoes_create_or_update_page` | Validated page creation or hash-protected replacement |
| `echoes_hydrate_vault` | Rebuild only ignored local index/state files |
| `commit_memory_to_echoes_vault` | Explicit final session distillation after `/echoes-end` |

Tools invoke Python as an argument array, send Markdown payloads over standard input, keep stdout
and stderr separate, and propagate every non-zero runtime exit as a failed tool call.

## Using the same vault from different computers

Commit durable protocol files, the portable runtime, pages, daily entries, assets, raw material,
and managed agent adapters. Do not commit:

```text
EchoesVault/index.md
.echoes-vault/state.json
.echoes-vault/lock
.opencode/echoes-state.json
.codex/echoes-vault-state.json
```

After cloning, `/echoes-start` hydrates the ignored index/state and restores context. Codex and
OpenCode record their own `lastWriter.agent` and `adapterVersion`, but both use the same protocol,
runtime, pages, and daily history.

The local lock coordinates processes in one checkout. Git still handles edits made in different
clones. Unique daily files normally merge independently; edits to the same curated page require
ordinary semantic conflict resolution.

## Migrating from EchoesVault OpenCode 1.x

1. Install version 2 and restart OpenCode. Loading the plugin does not change the repository.
2. Run `/echoes-status` for a read-only preview. A legacy vault is reported as requiring migration.
3. Run `/echoes-init` explicitly.
4. Review the returned adapter and Git-readiness warnings.
5. Commit the durable files listed by the status card; untrack legacy local/generated files if
   requested by its suggested Git commands.

The migrator understands the old `.opencode/echoes-state.json`, flat daily logs, legacy index
descriptions, and recognized EchoesVault commands/skills. It never silently overwrites unknown
user-owned files.

## Development

Development tests require Node `>= 22.6` for native TypeScript execution.

```sh
npm install
npm test
npm run pack:check
```

`npm test` type-checks the server adapter, TUI, and tests, then runs bridge-level lifecycle,
migration, write-safety, and runtime-integrity checks against the bundled reference runtime.

## Updating

```sh
opencode plugin echoes-vault-opencode@X.X.X --force
```

Restart OpenCode after updating. A newer plugin may delegate to a newer compatible project runtime
and will never downgrade it; project runtime changes happen only through explicit initialization or
upgrade workflows.

## License

[MIT](LICENSE)
