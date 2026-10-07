# ArchDev

Review coding-agent changes by risk and share what your team learns through
ArchDev's organization stream.

## Install through your coding agent

Paste this prompt into your agent:

```text
Read https://archdev.ai/install.md and set up ArchDev for me.
```

Your agent checks the required software, installs ArchDev, and helps you sign
in. It asks where to configure the setup and waits for your answer:

- **For me on this machine:** personal setup across repositories.
- **For this repository:** shareable setup files for your teammates.

Before enabling activity reporting, it explains organization stream visibility
and asks for your approval. Each teammate installs software and signs in for
themselves. No credentials are shared through the repository, and the agent
won't commit or push setup files without permission.

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
