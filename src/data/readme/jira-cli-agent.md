# jira-cli — Jira Cloud CLI, terminal UI and MCP server

[![CI](https://github.com/ejklock/jira-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ejklock/jira-cli/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/ejklock/jira-cli)](https://github.com/ejklock/jira-cli/releases/latest)
[![License: MIT](https://img.shields.io/github/license/ejklock/jira-cli)](LICENSE)

**Unofficial** command-line client, interactive terminal UI (TUI) and
[MCP](https://modelcontextprotocol.io) server for
[Jira Cloud](https://www.atlassian.com/software/jira) (Jira Server and Data
Center are not supported). Read and browse your issues, post comments and
download attachments from the terminal, or let an AI coding agent (Claude Code,
Codex, OpenCode, Pi) do it for you through the `jira mcp` server and the
`jira-ticket` skill.

One self-contained Rust binary (`jira`) for Linux (x86\_64 and arm64), macOS and
Windows. No interpreter or runtime is required.

**Features**

- `jira mine` and `jira search`: your open issues, or any JQL search.
- `jira get` / `jira current`: an issue by key or URL, or the one for your
  current git branch, with comments; `--download-attachments` saves its
  attachments.
- `jira browse`: a keyboard-driven TUI over your issues.
- `jira comment`: post a comment to an issue.
- `--json` on `get`, `current`, `mine` and `search`, for scripts and agents.
- `jira mcp`: the same commands as MCP tools (`jira_read`, `jira_write`,
  `jira_download_attachments`), installed in one step by the
  [Claude Code, Codex, OpenCode and Pi plugins](#plugins).
- Several Jira instances at once, with a local-first SQLite cache.
- English and Brazilian Portuguese interface.

> ## Unofficial — not affiliated with Atlassian
>
> This is an independent, community-built project. It is **not** an official
> Atlassian product and is **not affiliated with, endorsed by, sponsored by,
> or supported by** Atlassian. **"Jira" and "Atlassian" are trademarks of
> their respective owners** and are used here **only** to describe compatibility
> with the Jira Cloud REST API. This tool stores no credentials beyond a local
> API token, sends that token only to your configured host, and is provided
> "as is", without warranty. Use at your own risk.

---

## Quickstart

From zero to your first issue in three steps:

```sh
# 1. Install (macOS / Linux — Windows: see the PowerShell one-liner below)
curl -fsSL https://raw.githubusercontent.com/ejklock/jira-cli/main/install.sh | sh

# 2. Register your Jira Cloud instance.
#    Prompts once for an API token — the token is stored locally in SQLite.
jira setup add --name work --url https://yourorg.atlassian.net --email you@example.com

# 3. Fetch an issue
jira get PROJ-123
```

To let an AI coding agent use it, add the plugin to your harness (see
[Plugins](#plugins) for Codex, OpenCode and Pi):

```sh
claude plugin marketplace add ejklock/jira-cli
claude plugin install jira-cli@jira-cli
```

Then, day to day:

```sh
jira                    # issues assigned to you (TTY) or help (non-TTY)
jira get PROJ-123       # a specific issue by key or full URL
jira current            # the issue for your current git branch
jira mine --json        # machine-readable output for scripts and agents
```

---

## Install

### macOS / Linux (curl one-liner)

```sh
curl -fsSL https://raw.githubusercontent.com/ejklock/jira-cli/main/install.sh | sh
```

The script downloads the pre-built `jira` binary for your platform from the
latest GitHub Release and places it on your PATH.

### Windows (PowerShell one-liner)

```powershell
irm https://raw.githubusercontent.com/ejklock/jira-cli/main/install.ps1 | iex
```

Installs `jira.exe` into `%LOCALAPPDATA%\Programs\jira` and adds it to your
user PATH.

### Manual download

Download the pre-built binary for your platform from the
[Releases page](https://github.com/ejklock/jira-cli/releases), place it on your
PATH, and make it executable (`chmod +x jira` on Unix).

| Platform | Asset |
|---|---|
| Linux x86\_64 | `jira-linux-x86_64` |
| Linux arm64 | `jira-linux-arm64` |
| macOS x86\_64 (Intel) | `jira-macos-x86_64` |
| macOS arm64 (Apple Silicon) | `jira-macos-arm64` |
| Windows x86\_64 | `jira-windows-x86_64.exe` |

### Build from source (Docker required)

No local Rust toolchain needed. The crate is at the repo root; Docker provides
the build environment.

```sh
# Development build
docker compose run --rm dev cargo build

# Release binary (placed in target/release/jira)
docker compose build
docker compose run --rm build
```

---

## Commands

### setup — manage instances

```sh
# Register a Jira Cloud instance (interactive wizard prompts for missing fields)
jira setup add
jira setup add --name work --url https://yourorg.atlassian.net --email me@example.com
# API token is always entered hidden via a prompt — never passed as a flag.

# List configured instances (tokens never shown)
jira setup list

# Remove an instance and its cached issues
jira setup remove --name work

# Test connectivity to all (or one) configured instance
jira setup test
jira setup test --name work

# Show the current display language
jira setup language

# Set the display language (persists to SQLite; survives across invocations)
jira setup language en
jira setup language pt-BR
```

### get — fetch an issue by key or URL

```sh
jira get PROJ-123
jira get https://yourorg.atlassian.net/browse/PROJ-123
```

### current — fetch the issue from the current git branch

Branch must contain a valid Jira issue key (e.g. `PROJ-123`, `feature/PROJ-123`).

```sh
jira current
```

### mine — list open issues assigned to you

```sh
jira mine
jira list          # alias
```

When run in a terminal (TTY), `mine` opens an interactive arrow-key list of
your open issues. When output is piped or redirected (non-TTY), it falls back
to a plain table suitable for scripts.

### search — search for issues with JQL

```sh
jira search "assignee = currentUser() AND status = In Progress"
```

### browse — interactive TUI

Arrow-key terminal browser for your open issues. Navigate projects, view
issue detail, attachments, and comments.

```sh
jira browse
```

### comment — post a comment to an issue

```sh
jira comment PROJ-123 -m "Investigating now."
# or pipe a multi-line comment from stdin:
echo "Full investigation notes" | jira comment PROJ-123
```

When invoked without an issue key, `jira comment` resolves the key from the
current git branch.

### skill — print the agent skill contract

```sh
jira skill jira-ticket   # print the full --json read contract
```

### mcp — serve the CLI as MCP tools

```bash
jira mcp
```

Starts an [MCP](https://modelcontextprotocol.io) server on stdio, meant to be
spawned by an agent harness. It exposes three tools whose results are the
`--json` output of the matching command:

| Tool | Operations | Notes |
|---|---|---|
| `jira_read` | `get`, `current`, `mine`, `search` | read-only |
| `jira_write` | `comment` | posts to Jira |
| `jira_download_attachments` | `download` | writes files on the server's machine; changes nothing in Jira |

Every operation takes an optional `instance`. Register it in Claude Code with
`claude mcp add jira -- jira mcp`; the `jira-ticket` skill lists the Codex and
OpenCode forms.

---

## Authentication

`jira-cli` supports **Jira Cloud only** via Basic auth with an Atlassian API
token. The token is stored locally in a SQLite database. The password is
never stored. See the [Atlassian documentation](https://id.atlassian.com/manage-profile/security/api-tokens)
for generating API tokens.

---

## Internationalization

The binary ships with English (default) and Brazilian Portuguese (`pt-BR`)
translations for all user-facing output. Translations are embedded at compile
time — no external files required at runtime.

**Durable setting** — persist your preferred language to SQLite:

```sh
jira setup language pt-BR   # set
jira setup language          # show current
```

**One-off override** — the `JIRA_CLI_LANG` environment variable overrides the
stored setting for a single invocation:

```sh
JIRA_CLI_LANG=pt-BR jira browse
```

**Resolution order:** `JIRA_CLI_LANG` env var → SQLite setting → `en`.

---

## Plugins

Give an AI coding agent your Jira issues in one install step per harness. The
plugin adds the `jira mcp` tools and the `jira-ticket` skill (Pi: the skill,
which drives `jira --json`).

| Harness | Install |
|---|---|
| Claude Code | `claude plugin marketplace add ejklock/jira-cli`, then `claude plugin install jira-cli@jira-cli` |
| Codex | `codex plugin marketplace add ejklock/jira-cli`, then `codex plugin add jira-cli@jira-cli` |
| OpenCode | add `jira-cli-agent` to `plugin` in `opencode.json`: `{ "plugin": ["jira-cli-agent"] }` |
| Pi | `pi install npm:jira-cli-agent` |

The plugins need `jira` **0.2.0 or later**, which has the `mcp` subcommand, on
your `PATH`; an older `jira` lists the server but cannot start it. Run
`jira setup add` once for your instance.

The plugins and the [skill installer](#install-the-skill-into-your-agent-harness)
below give the agent the same skill. `install-skill.sh` stays for GitHub Copilot
and Cursor, which have no plugin, and for anyone who wants only the skill.

| Way | Harnesses | What the agent gets |
|---|---|---|
| Plugin (above) | Claude Code, Codex, OpenCode, Pi | The `jira mcp` tools and the skill in one install step (Pi: the skill) |
| `jira mcp` by hand | Any MCP client | The `jira_read`, `jira_write` and `jira_download_attachments` tools |
| [`install-skill.sh`](#install-the-skill-into-your-agent-harness) | Claude Code, Codex, OpenCode, Pi, Cursor, GitHub Copilot | The skill, which drives `jira --json` |

The marketplace and the npm package are unofficial and not affiliated with
Atlassian.

---

## Agent skill

`jira` ships a self-describing **agent skill** for the `--json` read contract,
so an LLM coding agent can learn how to read your Jira issues non-interactively.
The full contract lives in **one place** — inside the binary — and `jira` prints
it on demand:

```sh
jira skill jira-ticket   # print the full jira-ticket contract
```

### Install the skill into your agent harness

Run the installer from your project root:

```sh
curl -fsSL https://raw.githubusercontent.com/ejklock/jira-cli/main/install-skill.sh | sh -s -- --harness all
```

| Harness | Project file (`--scope project`, default) | User-level file (`--scope global`) |
|---|---|---|
| Claude Code | `.claude/skills/jira-ticket/SKILL.md` | `~/.claude/skills/jira-ticket/SKILL.md` |
| pi | `.pi/skills/jira-ticket/SKILL.md` | `~/.pi/agent/skills/jira-ticket/SKILL.md` |
| Codex CLI | `.codex/skills/jira-ticket/SKILL.md` | `~/.codex/skills/jira-ticket/SKILL.md` |
| OpenCode | `.opencode/skills/jira-ticket/SKILL.md` | — (install per-project) |
| GitHub Copilot | `.github/skills/jira-ticket/SKILL.md` | — (install per-project) |
| Cursor | `.cursor/rules/jira-ticket.mdc` | — (install per-project) |

---

## Configuration

**Database path:** `~/.config/jira/jira.db`

Override with the `JIRA_DB` environment variable:

```sh
JIRA_DB=/custom/path/jira.db jira get PROJ-123
```

---

## Flags

| Flag | Applies to | Effect |
|---|---|---|
| `--instance NAME` | `get`, `current`, `mine`, `search`, `browse` | Force a specific configured instance |
| `--json` | `get`, `current`, `mine`, `search` | Print curated minified JSON for agents |
| `--refresh` | `get`, `current` | Bypass the cache and re-fetch from the API |
| `--no-comments` | `get`, `current` | Omit the comments section |
| `--download-attachments` | `get`, `current` | Download all attachments to the local downloads dir |

---

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Issue not found / HTTP error / parse error |
| 2 | Usage error, unknown instance, no instances configured, branch mismatch |

---

## Development

```sh
# Run all tests (unit + integration, including comment-policy gate)
docker compose run --rm dev cargo test

# Run only the comment-policy gate
docker compose run --rm dev cargo test --test comment_policy

# Lint
docker compose run --rm dev cargo clippy --all-targets -- -D warnings

# Format check
docker compose run --rm dev cargo fmt --check
```

---

## License

[MIT](LICENSE)
