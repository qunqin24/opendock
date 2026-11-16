# Bitbucket CLI

A command-line interface and terminal UI for Bitbucket Cloud, with an MCP server so AI agents can work with your pull requests and pipelines.

[![CI](https://github.com/ejklock/bitbucket-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ejklock/bitbucket-cli/actions/workflows/ci.yml)
[![Release](https://github.com/ejklock/bitbucket-cli/actions/workflows/release.yml/badge.svg)](https://github.com/ejklock/bitbucket-cli/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This is a fork of [quinnjr/bitbucket-cli](https://github.com/quinnjr/bitbucket-cli), maintained at [ejklock/bitbucket-cli](https://github.com/ejklock/bitbucket-cli). It adds multi-account profiles, an MCP server and agent plugins, and is installed from this repository's releases.

## Features

- **Repository Management** - List, view, clone, create, manage repositories, and upload/manage downloads
- **Pull Requests** - Create, review, merge, approve, and manage PRs
- **Issue Tracking** - Create, view, comment on, and manage issues
- **Pipelines** - Trigger, monitor, and manage CI/CD pipelines
- **Interactive TUI** - Terminal UI for browsing and managing resources
- **Multi-account profiles** - Store several logins as named profiles and pick one per command with `--profile`
- **MCP server** - `bitbucket mcp` exposes pull request, pipeline and repository operations to any MCP client
- **Agent plugins** - One-step installs for Claude Code, Codex, OpenCode and Pi
- **Secure Authentication** - OAuth 2.0 preferred, API key fallback, with secure keyring storage

## Installation

The crate named `bitbucket-cli` on crates.io belongs to the upstream project, so `cargo install bitbucket-cli` installs the upstream, without this fork's profiles. Install this fork from its releases.

### Linux and macOS

```bash
curl -fsSL https://raw.githubusercontent.com/ejklock/bitbucket-cli/HEAD/install.sh | sh
```

The script downloads the binary for your platform (Linux or macOS, amd64 or arm64) from the latest release and installs it to `~/.local/bin` (override with `BITBUCKET_INSTALL_DIR`). Pass a release tag to pin a version: `... | sh -s -- v1.2.1`.

### Windows

```powershell
irm https://raw.githubusercontent.com/ejklock/bitbucket-cli/HEAD/install.ps1 | iex
```

This installs `bitbucket.exe` to `%LOCALAPPDATA%\Programs\bitbucket` and adds it to your user `PATH`. The `.msi` installer from the [Releases](https://github.com/ejklock/bitbucket-cli/releases) page is an alternative.

### Debian/Ubuntu

```bash
wget https://github.com/ejklock/bitbucket-cli/releases/latest/download/bitbucket-cli_amd64.deb
sudo dpkg -i bitbucket-cli_amd64.deb
```

### Arch Linux

```bash
wget https://github.com/ejklock/bitbucket-cli/releases/latest/download/PKGBUILD
makepkg -si
```

### Alpine Linux

The release carries an `APKBUILD` and an Alpine tarball (`bitbucket-cli-vX.X.X-alpine-x86_64.tar.gz`); see the [Releases](https://github.com/ejklock/bitbucket-cli/releases) page.

### From Source

```bash
cargo install --git https://github.com/ejklock/bitbucket-cli
```

or from a clone:

```bash
git clone https://github.com/ejklock/bitbucket-cli.git
cd bitbucket-cli
cargo install --path .
```

## Quick Start

### 1. Authenticate



**Option A: OAuth 2.0 (Recommended)**

```bash
bitbucket auth login --oauth
```

You'll need to create an OAuth consumer first:
1. Go to your [Bitbucket workspace settings](https://bitbucket.org/[workspace]/workspace/settings/oauth-consumers/new)
2. Set callback URL to **ONE** of these (the CLI will use the first available):
   - `http://127.0.0.1:8080/callback`
   - `http://127.0.0.1:3000/callback`
   - `http://127.0.0.1:8888/callback`
   - `http://127.0.0.1:9000/callback`
3. Select permissions:
   - Account (Read)
   - Repositories (Read)
   - Pull requests (Read, Write)
   - Issues (Read, Write)
   - Pipelines (Read, Write)
4. Copy the Key (Client ID) and Secret when prompted

**Option B: API Key (For CI/Automation)**

```bash
bitbucket auth login --api-key
```

You'll need to create an API token:
1. Go to your [Bitbucket personal settings](https://bitbucket.org/account/settings/) and open the API tokens section
2. Create a new token with the required permissions
3. Enter your Atlassian account email and token when prompted (or pass `--email` and `--token` for non-interactive use)

**Note:** App passwords are deprecated by Atlassian. OAuth 2.0 is the preferred method.

**Several accounts (profiles)**

Each login is stored as a named profile; `auth login` without a name writes the profile `default`, so a single account needs no extra flags.

```bash
bitbucket --profile work auth login --oauth    # add or replace the "work" profile
bitbucket --profile work auth login --workspace acme   # also stores acme as its default workspace
bitbucket auth list                            # name, method, username, workspace (never secrets)
bitbucket --profile work pr list myrepo        # run any command as "work"
bitbucket --profile work auth logout           # remove only "work"
```

The profile is chosen by `--profile <name>`, then the `BITBUCKET_PROFILE` environment variable, then the only stored profile. With several profiles and none chosen, commands fail and list the names. Processes using different profiles never log each other out.

Profile metadata is kept in a SQLite database, `bitbucket.db` in the config directory (override the path with `BITBUCKET_DB`); the credential itself lives in the system keychain (entry `profile:<name>`), and only without a keychain is it stored in the database file. On Linux/BSD with no reachable Secret Service (a headless server, for instance), `auth login` does exactly that: it stores the credential in the database file (mode 0600) and prints a one-line warning; a locked or otherwise failing keyring still fails the login. A credential saved by an earlier version is migrated to the `default` profile on first use.

### 2. Start Using

```bash
# List repositories
bitbucket repo list myworkspace

# View a repository
bitbucket repo view myworkspace/myrepo

# List pull requests
bitbucket pr list myworkspace/myrepo

# Create a pull request
bitbucket pr create myworkspace/myrepo --title "My PR" --source feature-branch

# Upload a file (e.g. a screenshot) to the repo downloads area, then
# reference the printed URL from a PR description or comment as ![](url)
bitbucket repo download upload myworkspace/myrepo screenshot.png

# Launch interactive TUI
bitbucket tui --workspace myworkspace
```

### Scripting

Every command accepts a global `--output` flag. The default (`table`) prints
human-readable tables; `--output json` emits the raw data as pretty-printed
JSON for piping into `jq` or scripts:

```bash
# IDs and titles of open pull requests
bitbucket pr list myworkspace/myrepo --output json | jq -r '.[] | "\(.id)\t\(.title)"'

# Machine-readable repository details
bitbucket repo view myworkspace/myrepo --output json
```

## 📖 Commands

| Command | Description |
|---------|-------------|
| `bitbucket auth` | Manage authentication (login, logout, status) |
| `bitbucket repo` | Manage repositories (list, view, clone, create, update, move, fork, delete, watchers, forks, downloads), plus branch/tag/commit/file browsing, webhooks, branch restrictions, default reviewers, permissions, deploy keys, environments, deployments, and the branching model |
| `bitbucket pr` | Manage pull requests (list, view, create, edit, merge, approve/unapprove, request-changes, decline, checkout, diff/diffstat, patch, commits, statuses, activity, pipelines), plus comments and tasks |
| `bitbucket issue` | Manage issues (list, view, create, edit, delete, close, reopen, vote, watch), plus comments, attachments, change log, and tracker components/milestones/versions |
| `bitbucket pipeline` | Manage pipelines (list, view, trigger, rerun, stop, config), plus repository and workspace variables, schedules, and caches |
| `bitbucket workspace` | Manage workspaces (list, view, members, permissions) and their projects |
| `bitbucket user` | Inspect user accounts (whoami, view, emails) |
| `bitbucket tui` | Launch interactive terminal UI |

## 🖥️ TUI Mode

Launch the interactive terminal UI for a visual way to browse and manage your Bitbucket resources:

```bash
bitbucket tui
```

**Keyboard shortcuts:**
- `q` - Quit
- `1-5` - Switch views (Dashboard, Repos, PRs, Issues, Pipelines)
- `j/k` or `↑/↓` - Navigate
- `Enter` - Select (opens the view on Dashboard)
- `r` - Refresh

## AI agents

Three ways to give an AI coding agent your Bitbucket pull requests, pipelines and repositories:

| Way | Harnesses | What the agent gets |
|---|---|---|
| CLI | Any agent with a shell | The `bitbucket` commands, with `--output json` for scripting |
| [MCP server](#mcp-server) | Any MCP client | The `bitbucket_read` and `bitbucket_write` tools |
| [Plugins](#plugins) | Claude Code, Codex, OpenCode, Pi | The MCP server wired in with one install step |

All three need `bitbucket` installed first ([Installation](#installation)) and `bitbucket auth login` run once. The MCP server and the plugins are not in the releases published before they were added: they need the next release or later.

### Plugins

Each plugin starts the `bitbucket` found on your `PATH`.

```sh
# Claude Code
claude plugin marketplace add ejklock/bitbucket-cli
claude plugin install bitbucket@bitbucket

# Codex
codex plugin marketplace add ejklock/bitbucket-cli
codex plugin add bitbucket@bitbucket
```

OpenCode: add the package to the `plugin` list in `opencode.json`:

```json
{ "plugin": ["bitbucket-agent"] }
```

Pi:

```sh
pi install npm:bitbucket-agent
```

### MCP server

`bitbucket mcp` serves Bitbucket operations as MCP tools over stdio. Register it in any MCP client with the command `bitbucket` and the argument `mcp`:

```json
{ "mcpServers": { "bitbucket": { "command": "bitbucket", "args": ["mcp"] } } }
```

Two tools, each taking an `operation` plus its arguments, and an optional `profile` and `workspace` (the profile defaults as for the CLI, see "Several accounts" above):

| Tool | Operations |
|---|---|
| `bitbucket_read` | `pr_list`, `pr_view`, `pr_diff`, `pr_diffstat`, `pr_commits`, `pr_statuses`, `pr_activity`, `pr_list_comments`, `pr_view_comment`, `pr_pipelines`, `pipeline_list`, `pipeline_view`, `repo_list`, `repo_view` |
| `bitbucket_write` | `pr_create`, `pr_edit`, `pr_comment`, `pr_approve`, `pr_unapprove`, `pr_request_changes`, `pr_merge`, `pr_decline`, `pipeline_trigger`, `pipeline_stop`, `pipeline_rerun` |

Write operations act with the permissions of the chosen profile, as the CLI commands do.

## ⚙️ Configuration

Configuration is stored in `~/.config/bitbucket-cli/config.toml`:

```toml
[auth]
username = "your-username"
default_workspace = "your-workspace"

[display]
color = true
pager = true
```

`[defaults] workspace` is still read as a legacy fallback for the default workspace; `[auth] default_workspace` takes precedence.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Forked from [quinnjr/bitbucket-cli](https://github.com/quinnjr/bitbucket-cli) by quinnjr; the original commands, TUI and authentication are theirs.
