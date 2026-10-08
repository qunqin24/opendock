# ArchDev

Review coding-agent changes by risk and share what your team learns through
ArchDev's organization stream.

## Install

macOS and Linux:

```sh
curl -fsSL https://archdev.ai/install.sh | bash
```

Windows (PowerShell):

```powershell
irm https://archdev.ai/install.ps1 | iex
```

The installer does three things in order:

1. Installs the `archdev` CLI and verifies its SHA-256 against the release.
2. Signs you in with GitHub in your browser.
3. Runs `archdev setup` to install the ArchDev skill and session hooks.
   Inside a Git repository it asks where they go; anywhere else they are
   installed globally:
   - **Globally:** personal setup across every repository you work in.
   - **This repository:** shareable setup files for your teammates.

Session hooks report activity and findings to your organization's shared
stream, visible to its members; the installer says so before setup runs. Each
teammate installs and signs in for themselves; no credentials are shared
through the repository, and nothing is committed or pushed.

When it finishes, go to a repository you work in and tell your coding agent:

```text
Set up this repository with ArchDev.
```

Without a terminal (CI, or a coding agent running the command) the installer
never prompts: once signed in (`ARCHDEV_TOKEN`), it installs globally. Pass
`--scope repository` to install into the current repository instead:

```sh
curl -fsSL https://archdev.ai/install.sh | bash -s -- --scope repository
```

```powershell
$env:ARCHDEV_INSTALL_SCOPE = "repository"; irm https://archdev.ai/install.ps1 | iex
```

`bash -s -- --help` lists every option. Homebrew users can run
`brew install ArchAstro/tools/archdev` and then `archdev setup`.

### Through your coding agent

Paste this prompt into your agent:

```text
Install ArchDev with the installer at https://archdev.ai/install.sh and set it up for me.
```

Your agent installs the CLI, then asks where to install the skill and hooks
before it runs `archdev setup`.

See the [installation guide](https://docs.archdev.ai/docs/start-here/install)
for what to expect, then ask your agent to review your changes with ArchDev.

## Claude Code cloud environments

In a personal Claude Code web environment, select **Custom** network access,
keep the default package-manager hosts, and allow `platform.archastro.ai` and
`archdev.ai`. Set `ARCHDEV_TOKEN=<your token>` in **Environment variables**.
Anyone using this environment can read that token, so do not share the environment.
Paste this into **Setup script**:

```bash
curl -fsSL https://raw.githubusercontent.com/ArchAstro/archdev/main/install-cloud.sh | bash
```

The script installs the latest CLI to `/usr/local/bin` and configures Claude
hooks in the setup user's home directory (`/root` in Claude's cloud VM).
Setup runs before environment variables are available; a temporary SessionStart
hook signs in when the session starts. Installation errors are reported without
preventing the session from starting. The initial download itself must succeed.
Claude runs SessionStart hooks in parallel: until direct `ARCHDEV_TOKEN` auth
is released, the first presence update can race login. Later CLI commands use
the stored login.
Use a repository with the ArchDev skill committed or enable it in your Claude
account. Snapshot refreshes pick up installer and CLI updates.

Maintainers: follow the [cloud release checklist](RELEASE_CHECKLIST.md).

## Plugins

`plugins/` holds an ArchDev plugin for Claude Code, Codex, GitHub Copilot,
Cursor, Antigravity, Grok, OpenCode and Pi. Each bundles the skills, the remote
MCP server and, where the CLI supports the harness, session hooks. See
[plugins/README.md](plugins/README.md) for install commands.

Plugins, `npx skills add ArchAstro/archdev`, `archdev repo hook setup` and
adding the MCP server by hand are independent install paths, all generated from
`catalog/archdev.json` by [tools/plugin-gen](tools/plugin-gen/README.md).

## Distribution sources

This repository owns public installers, release metadata, downloadable
binaries, and agent skills. The implementation and release build stay in the
private firstlanding repository. Report installation and packaging problems
with a GitHub issue here.

## License

The files in this repository (including installers, skills, and documentation)
are licensed under the [MIT License](LICENSE). Release binaries are built from
a separate private source repository; this license does not apply to those
binaries.
