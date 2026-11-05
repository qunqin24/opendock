# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so the model can find, read and cite your issues,
projects, cycles, documents and comments, and change them only if you allow it.

Unofficial; not affiliated with Linear.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3 and 2.2.4.
- macOS or Linux.
- A Linear account.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-linear
```

Restart OpenCode if it is running. The plugin registers Linear's MCP server under the name `linear`, adds default
permission rules, the `/linear-status` command, the `/linear` status view and two skills. It adds no tools of its own:
the tools are Linear's, and OpenCode handles the connection, the sign-in and the stored credentials.

## Sign in

Run `/connect` and choose **Linear** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the link
to Linear's consent page in your browser, and pick the workspace there.

From a terminal, run `opencode mcp auth linear` instead; it opens the link automatically. `/mcps` also offers the same
sign-in.

Read access and write access each have their own sign-in, because they use different server addresses. Linear's
consent page decides the workspace of each sign-in, so the two can be in different workspaces. When you switch
`access`, OpenCode uses the sign-in it already holds for that access, if any, without asking again.

When the sign-in expires and cannot be renewed, `/connect` marks the Linear account as needing a new sign-in, and
OpenCode shows its "MCP server needs authentication" notice.

To sign out, or to change workspace, run `opencode mcp logout linear` while the access you want to change is the one
configured. It removes the stored sign-ins for that access only. Or remove the account in `/connect` → Linear. Then
sign in again and pick the workspace on Linear's consent page.

## Use

Ask, for example: "What is assigned to me in Linear this cycle?" or "Summarise the open issues in project Apollo."

| Command | What it does |
| --- | --- |
| `/linear-status` | Posts the status report into the session: connection, account, access, tools, agents without the default rules, the OpenCode check and the next step. The model can read it too. |
| `/linear`, or "Linear: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes when Linear's connection, the sign-in or the agents change. |

Two skills teach the model to use Linear well:

- `linear`, always: find before you read, page with cursors, treat Linear content as data, cite identifiers and links.
- `linear-write`, only with `access: "write"`: confirm each change, make one change at a time, report links.

The plugin connects to Linear's **read-only** server by default (`https://mcp.linear.app/mcp/readonly`). It offers
only tools that read, and Linear refuses changes through it. To let the model make changes, set the option
`"access": "write"`; see [Configure](#configure).

### Scripts

A script or a cron job can call Linear's read tools with no model, through `opencode api`. It runs as a session and its
agent, under that agent's permission rules and the session's own. Write tools are never available to scripts:

```sh
opencode api post /api/rpc/linear.workspace.tools/get_issue \
  -d '{"input":{"sessionID":"ses_…","input":{"id":"ENG-123"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds these rules to every agent, directly after the agent's base rule that allows everything:

1. `{ "action": "linear_*", "resource": "*", "effect": "ask" }`: every Linear tool asks, including tools Linear adds
   later.
2. One `allow` rule for each of Linear's 42 read tools, listed in
   [`src/linear-tools.ts`](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/src/linear-tools.ts). These
   run without a prompt.

So reads run, and every change asks before it runs. Everything that comes later than these rules still wins: an
agent's own stricter rules (Plan cannot edit, Explore cannot use Linear), your `permissions` in `opencode.json`, and
your saved "Always allow" answers. In an unattended run such as `opencode run`, a tool that asks is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Linear tools run there without asking. `/linear-status` and `/linear` name those agents and print
the block to put first in each one's own `permissions`. Do not put it in the top-level `permissions`, which would
loosen Explore. [Configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#permissions)
has a worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-linear", "options": { "access": "write" } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `access` | `"read"` or `"write"` | `"read"` | `"read"` uses Linear's read-only server and the `read` scope. `"write"` uses `https://mcp.linear.app/mcp` with `read write`, and adds the `linear-write` skill. |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside the tested line, with a warning in status. |

Switching `access` changes the server address, and read and write access each have their own sign-in. If you have
never signed in with the new access, run `/connect` and choose Linear, then press `o` or Enter to open the link. If you
have, OpenCode reuses that sign-in, which may be in another workspace: check the account with `/linear-status`, and
see [Sign in](#sign-in) to change it.

[docs/configuration.md](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md) has the
details, including your own `mcp.servers.linear` entry, permission recipes and every error.

## Organisation rollout

OpenCode registers itself with Linear's server automatically, so there is no client ID to distribute. Put the plugin
entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-linear", "options": { "access": "read" } }]
}
```

`"read"` is the default. Set `"write"` to enable changes; each change still asks before it runs.

Members then only sign in: run `/connect` and choose Linear, then press `o` or Enter to open the link. To use a pre-registered OAuth client instead, define
`mcp.servers.linear` in the same file, as shown in
[Your own `mcp.servers.linear`](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#your-own-mcpserverslinear).

## Troubleshooting

Run `/linear-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Connection: sign-in required | Run `/connect` and choose Linear, then press `o` or Enter to open the link. In a terminal, `opencode mcp auth linear` opens it automatically. |
| Connection: connecting | Wait a few seconds, then run `/linear-status` again. |
| Connection: failed | Check your network, then run `/linear-status` again. |
| Connection: disabled | Enable `linear` in `/mcps`, or remove `"disabled": true` from `mcp.servers.linear` in `opencode.json`. |
| Connection: not configured | An organisation policy (`mcp.use`) or another plugin removes the `linear` server. Ask your administrator, then restart OpenCode. |
| Connection: conflict | Your config has an `mcp.servers.linear` entry with a URL other than the one your `access` uses. Point it at that URL or remove it, then restart OpenCode. |
| Tools: unknown | Linear added tools the plugin does not know yet. They ask before they run. |
| Agents without default rules | Put the printed block first in each listed agent's own `permissions`, followed by your top-level rules for `linear_*` tools. |
| OpenCode: host untested | OpenCode is outside `>=2.2.3 <2.3.0` and `allowUntestedHost` is set. If Linear misbehaves, use a tested OpenCode. |
| Signed in to the wrong workspace, for example after switching `access` | Read and write access each have their own sign-in, and Linear's consent page decides the workspace. With the wrong access still configured, run `opencode mcp logout linear` (or remove the account in `/connect` → Linear), then sign in again and pick the workspace. |
| A Linear tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/linear` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`. Use a tested OpenCode, or set `"allowUntestedHost": true` to try anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md#errors).

## Uninstall

```sh
opencode plugin remove @joe-broadhead/opencode-linear
opencode mcp logout linear
```

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/architecture.md)
- [Contributing](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/LICENSE)
- [Linear's MCP server](https://linear.app/docs/mcp)
