# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so the model can find, read and cite issues,
projects, cycles, initiatives, documents and comments, and change them within the access you allow.

Unofficial; not affiliated with Linear.

Linear is a trademark of Linear Orbit, Inc.; this unofficial plugin is not endorsed by them.

This repository is being rebuilt on [plugin-contract v0](https://github.com/we-the-rebel-alliance/plugin-contract);
version `0.0.0` is the first release under the new name, and the full documentation is still being written.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Outside the range the plugin does not start, unless you set
  `allowUntestedHost`.
- macOS or Linux.
- A Linear account.

## Install

Install from a release: `opencode plugin add github:we-the-rebel-alliance/linear-plugin#v<version>`, then run
`opencode reload`.

The first release on plugin-contract is `v0.0.0` (phase 4b). Until it is cut, there is no release to install:
the repository carries no `dist/`, and OpenCode runs no build when it installs from Git.

## Sign in

Run `/connect` and choose **Linear** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the
consent page, and pick the workspace there. From a terminal, `opencode mcp auth linear` opens it automatically.

The plugin uses one Linear server, `https://mcp.linear.app/mcp`, for every `access` value, so one sign-in serves them
all: changing `access` keeps it. To change the workspace, run `opencode mcp logout linear` and sign in again.

## Use

The plugin registers Linear's MCP server as `linear`, adds the default permission rules, the `/linear-status` command,
the `/linear` status view, two skills and two reads of its own:

- `tools.linear.issues`, the plugin's own read in Code Mode, answers the issues assigned to you as a table: identifier, title,
  state, priority and link, in every state, most recently updated first, 25 rows by default and at most 100. It is a
  quick look, not a count; use Linear's `list_issues` for totals and filters. It reads through Linear's own
  `list_issues`, under that tool's sign-in and permission rules, and holds no credential.
- `linear_events_list` is for a consumer's collector, not for answering questions: it lists what changed in Linear for
  you since a cursor, as normalised events, oldest first: each change to an issue assigned to you, and each
  notification in your inbox. Each listing names its account, `<workspace id>/<email>`, which must be the signed-in
  one. It is the source `linear.activity`, declared in `package.json` under source-contract version 1. The tools RPC
  method `probe` names who is signed in.

Every other tool is Linear's, and OpenCode handles the connection, the sign-in and the stored credentials.

## Access

`access` is a plugin option: `"all"` (the default), `"ask-changes"` or `"read-only"`.

| Value | What runs |
| --- | --- |
| `"all"` | Every tool Linear lists runs without asking, reads and changes alike, and so does a tool Linear adds later. |
| `"ask-changes"` | Reads run; every change, and every new tool, asks first. |
| `"read-only"` | Reads run; every change is denied. |

The rules are inserted after each agent's base allow, and `/linear-status` prints them in full and names any agent
that lacks them.

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/linear-plugin#v<version>", "options": { "access": "read-only" } }] }
```

## Scripts

A script or an OpenCode automation can call the same reads with no model through the tools RPC
`linear.workspace.tools`; writes run only where the session's rules allow them. [Scripting](docs/scripting.md) has the
calls and the errors.

## Status and errors

`/linear-status` and the `/linear` dialog show the connection, the account, the access mode, the tools, the agents
without default rules, the OpenCode version and one next step. Every plugin error reads
`CODE: What happened. Next step: What to do.`; [Configuration](docs/configuration.md#errors) lists them all.

## Uninstall

1. Sign out first, while the plugin is still installed: `opencode mcp logout linear`.
2. Remove the plugin: `opencode plugin remove github:we-the-rebel-alliance/linear-plugin#v<version>`, then `opencode reload`.

## Links

- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Scripting](docs/scripting.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT license](LICENSE)
