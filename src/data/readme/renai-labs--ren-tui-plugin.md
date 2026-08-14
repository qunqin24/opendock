# @renai-labs/cli

The Ren CLI — an agent-friendly client for the Ren API. Pair once, then drive agents, skills, MCPs, pods, and projects from your terminal or from inside another agent's tool call.

## Install

```bash
npm install -g @renai-labs/cli
```

Or run without installing:

```bash
npx @renai-labs/cli whoami
```

## Quick start

```bash
# Interactive pairing (humans)
ren init

# Non-blocking pairing (agents / CI)
ren init --device-start --output json
ren init --device-poll --wait 25 --output json   # poll until status: signed-in

# Confirm
ren whoami
```

Most commands accept `--output json` for machine-parseable output, and `--profile <name>` (or `REN_PROFILE=<name>`) to target a non-default profile.

## Global flags

| Flag                          | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `--output json`               | Machine-parseable JSON output. Use when piping or parsing.        |
| `--profile <name>`            | Target a profile other than `default`. Also `REN_PROFILE=<name>`. |
| `--help`                      | Full flag listing for any command.                                |
| `REN_SBX_TOKEN`+`REN_USER_ID` | Override the stored profile entirely (CI / sandbox runners).      |

## Authentication

| Command                                 | Purpose                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `ren init` (alias `ren login`)          | Pair via browser device-code flow. Blocks until paired — for humans at a terminal.     |
| `ren init --device-start`               | Start pairing, print verification URL as JSON, exit immediately. Use this from agents. |
| `ren init --device-poll [--wait <sec>]` | Check a pending pairing. `--wait` polls briefly (keep it ≤ ~25s).                      |
| `ren whoami` / `ren auth status`        | Active user, org, scopes. Exits non-zero if unpaired.                                  |
| `ren auth list` / `switch` / `logout`   | Manage stored profiles.                                                                |
| `ren pats …`                            | Personal access tokens — non-interactive auth for CI / servers.                        |

## Workspace shape

```
Org
 └── Pod                       ← compute boundary, secrets, file/memory stores
      ├── Project              ← groups agents around an outcome
      │    └── Agent           ← prompt + model + skills + MCPs
      ├── Vault                ← scoped credentials
      ├── FileStore            ← files the agents can read/write
      └── MemoryStore          ← long-running per-agent memory
```

## Pods

| Command                    | Purpose                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ren pods list`            | List pods visible to the active profile. The personal pod has `isDefault: true` + `isPrivate: true`. |
| `ren pods create --name …` | Create a pod (provisions a sandbox).                                                                 |
| `ren pods get <id>`        | Read a single pod.                                                                                   |
| `ren pods members …`       | Add/remove pod members.                                                                              |
| `ren pods sandboxes …`     | Inspect the underlying sandbox runtime.                                                              |
| `ren pods vaults add`      | Attach a vault to a pod (priority-ordered).                                                          |

## Projects

| Command                                                                   | Purpose                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ren projects list --pod-id <podId>`                                      | List projects in a pod.                                            |
| `ren projects create --pod-id <podId> --name "…"`                         | New project.                                                       |
| `ren projects get <id>`                                                   | Read a project (includes attached agents).                         |
| `ren projects agents add <projectId> --agent-id <agentId> --type primary` | Attach an agent. `--type` is `primary` (one router) or `subagent`. |
| `ren projects agents list <projectId>` / `remove`                         | List / detach.                                                     |
| `ren projects file-stores add / remove`                                   | Mount/unmount file stores.                                         |
| `ren projects memory-stores add / remove`                                 | Mount/unmount memory stores.                                       |

## Agents

| Command                                                                                           | Purpose                                                                           |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ren agents search --query "…" --sources user org registry`                                       | Find agents across scopes. There is no separate `list` for cross-scope discovery. |
| `ren agents create --name "…" --icon "🤖"`                                                        | Create agent + initial version in one call.                                       |
| `ren agents versions create <id> --prompt "…" --model "…" --body '{"skillIds":[…],"mcpIds":[…]}'` | Ship a new version (deps are full-replace lists).                                 |
| `ren agents get <id>`                                                                             | Read latest version + deps.                                                       |
| `ren agents update <id> --name …`                                                                 | Metadata only.                                                                    |

## Skills

| Command                                                                  | Purpose                                                                                      |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `ren skills search --query "…" --sources user org registry`              | Find skills across scopes.                                                                   |
| `ren skills create <folder> --name "…" --description "…"`                | Upload a local skill folder (`SKILL.md` + optional `scripts/`, `references/`, `templates/`). |
| `ren skills versions create <id> <folder> --version patch\|minor\|major` | New skill version (full-replace upload).                                                     |
| `ren skills get <id>`                                                    | Read metadata + required credentials.                                                        |
| `ren skills versions data <id> <version> --format presigned`             | Download the bundled files.                                                                  |
| `ren skills copy <id>`                                                   | Fork a registry skill into your account.                                                     |

## MCPs

| Command                                                   | Purpose                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `ren mcps search --query "…" --sources user org registry` | Find MCPs (Linear, Gmail, Calendar, Postgres, …).          |
| `ren mcps create --name "…" …`                            | Register a custom MCP server.                              |
| `ren mcps oauths …`                                       | Start / complete OAuth flows for MCPs that need user auth. |
| `ren mcps get <id>`                                       | Read MCP metadata.                                         |

Slack and GitHub are native Ren integrations, not MCPs, and have no CLI install command. Connect them from **Settings → Integrations** in the web app (org owner/admin).

## Triggers & webhooks

| Command                                                               | Purpose                                            |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| `ren triggers list --project-id <projectId>`                          | List cron triggers.                                |
| `ren triggers create --project-id <projectId> --cron "0 9 * * MON" …` | Schedule the project's primary agent on a cron.    |
| `ren triggers update <id>` / `archive <id>`                           | Edit / disable.                                    |
| `ren webhook-triggers …`                                              | URL-invoked triggers (CI hooks, app callbacks, …). |

## Replays

| Command                                      | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `ren replays share --session-id <sessionId>` | Publish a chat session as a public replay link. |
| `ren replays list` / `get <id>` / `archive`  | List / read / unpublish replays.                |

## Secrets & data plumbing

| Command               | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `ren credentials …`   | Add/rotate credentials referenced by skills (`requiredCredentials`). |
| `ren vaults …`        | Vault CRUD (groups of credentials).                                  |
| `ren file-stores …`   | File-store CRUD.                                                     |
| `ren memory-stores …` | Memory-store CRUD.                                                   |
| `ren models …`        | Model registry — list available models and pod defaults.             |

## Issues

Bug reports and feature requests: <https://github.com/renai-labs/cli/issues>.

The CLI source lives in the Ren monorepo; this repository is the public face (README + issues only).

## License

MIT — see [LICENSE](./LICENSE).
