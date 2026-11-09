# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so the model can find, read and cite your issues,
projects, cycles, documents and comments, and change them only if you allow it.

Unofficial; not affiliated with Linear.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Linear account.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-linear
```

Run `opencode reload`, or restart OpenCode. Then run `/linear-status`: it shows `sign-in required` until you sign in
(see [Sign in](#sign-in)).

The plugin registers Linear's MCP server under the name `linear`, adds default permission rules, the `/linear-status`
command, the `/linear` status view, two skills and two tools of its own, `linear_issues` and `linear_events_list`.
Every other tool is Linear's, and OpenCode handles the connection, the sign-in and the stored credentials.

`linear_issues` answers the issues assigned to you as a table: identifier, title, state, priority and link, in every
state, most recently updated first, 25 rows by default and at most 100. It is a quick look, not a count: the model
also reads whether Linear has more, and uses Linear's `list_issues` for totals and filters. It reads them through
Linear's own `list_issues`, under that tool's sign-in and permission rules, and holds no credential. It is
a direct tool, offered to the model even when Code Mode holds Linear's other tools, because
[Jelly](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/jelly.md) draws a tool's result as a table only
for a direct call, not for one made inside Code Mode.

`linear_events_list` is for Memory's collector, not for answering questions: it lists what changed in Linear for you
since a cursor, as normalised events, oldest first: each change to an issue assigned to you, and each notification in
your Linear inbox, with the issue's identifier and link. It only reads, through Linear's `get_workspace`, `get_user`,
`list_issues` and `get_notifications`, and never asks with the default rules. It is this plugin's side of the shared
`events_list` source contract
([configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#events-list)).

**Update** with `opencode plugin update @joe-broadhead/opencode-linear`, then run `opencode reload`. An entry pinned
to a version, such as `@joe-broadhead/opencode-linear@0.0.1`, does not update: remove the `@version` from its
`plugins` entry first.

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
sign in again and pick the workspace on Linear's consent page. To sign out of both before you remove the plugin, see
[Uninstall](#uninstall).

## Use

Ask, for example: "What is assigned to me in Linear this cycle?" or "Summarise the open issues in project Apollo."

| Command | What it does |
| --- | --- |
| `/linear-status` | Posts the status report into the session: connection, account, access, tools, agents without the default rules, the OpenCode check and the next step. The model can read it too. |
| `/linear`, or "Linear: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes when Linear's connection, the sign-in or the agents change. |

Two skills teach the model to use Linear well:

- `linear`, always: when `linear_issues` is enough and when to filter and page `list_issues`, filters, counts, treating
  Linear content as data, and citing identifiers and links.
- `linear-write`, only with `access: "write"`: read first, confirm each change, take extra care with sharing, merging
  and reviews, make one change at a time, report links.

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

The method `events_list` runs `linear_events_list` the same way. See
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds these rules to every agent, directly after the agent's base rule that allows everything:

1. `{ "action": "linear_*", "resource": "*", "effect": "ask" }`: every Linear tool asks, including tools Linear adds
   later.
2. One `allow` rule for each of Linear's 41 read tools, listed in
   [`src/linear-tools.ts`](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/src/linear-tools.ts). These
   run without a prompt.
3. `{ "action": "linear_issues", "resource": "*", "effect": "allow" }`: the plugin's own `linear_issues`, which only
   reads, runs without a prompt too. Its call to `list_issues` still follows that tool's rules.
4. `{ "action": "linear_events_list", "resource": "*", "effect": "allow" }`: the plugin's own `linear_events_list`,
   which only reads, for Memory's collector. Its calls to Linear's reads still follow those tools' rules.

So reads run, and every change asks before it runs. Everything that comes later than these rules still wins: an
agent's own stricter rules (Plan cannot edit, Explore cannot use Linear), your `permissions` in `opencode.json`, and
your saved "Always allow" answers. In an unattended run such as `opencode run`, a tool that asks is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Linear tools run there without asking. `/linear-status` and `/linear` name those agents and show
the default rules to put first in each one's own `permissions`. Do not put them in the top-level `permissions`, which would
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
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.2.3 <2.3.0`, with a warning in status. |

Switching `access` changes the server address, and read and write access each have their own sign-in. If you have
never signed in with the new access, run `/connect` and choose Linear, then press `o` or Enter to open the link. If you
have, OpenCode reuses that sign-in, which may be in another workspace. Ask the model which Linear workspace it is
connected to; Linear's `get_workspace` answers. See [Sign in](#sign-in) to change it.

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
| Agents without default rules | Put the default rules shown by `/linear-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Linear tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4 or 2.2.5. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Linear misbehaves, use a tested release. |
| Signed in to the wrong workspace, for example after switching `access` | Read and write access each have their own sign-in, and Linear's consent page decides the workspace. With the wrong access still configured, run `opencode mcp logout linear` (or remove the account in `/connect` → Linear), then sign in again and pick the workspace. |
| A Linear tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/linear` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `AUTH_REQUIRED` from `linear_issues` | Linear needs a sign-in. Run `/connect` and choose Linear, then press `o` or Enter to open the link. |
| `SERVER_CONFLICT` from `linear_issues` | Your own `mcp.servers.linear` points at another URL than your `access` uses. Point it at the URL `/linear-status` names, or remove it, then restart OpenCode. |
| `TOOL_UNAVAILABLE` from `linear_issues` | OpenCode does not list Linear's `list_issues` yet. Follow the next step in the message, or run `/linear-status`. |
| `UPSTREAM_UNREADABLE` from `linear_issues` | Linear's `list_issues` answered with something other than a list of issues. Ask for `list_issues` with assignee `me` instead. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `linear` server, so
`opencode mcp logout linear` fails with `MCP server not found: linear` and the sign-ins stay in OpenCode's credential
store. Read access and write access each have their own sign-in, and OpenCode signs out only the one for the `access`
configured now.

1. Sign out: `opencode mcp logout linear`. Right after OpenCode starts or reloads, it can answer
   `MCP server not found: linear` for a few seconds; wait, then run it again.
2. If you ever used the other access, sign out of it too. Set `"access"` in the plugin's `plugins` entry in
   `opencode.json` to the other value (`"write"`, or `"read"`, the default), for example
   `{ "package": "@joe-broadhead/opencode-linear", "options": { "access": "write" } }`, run `opencode reload`, then
   run `opencode mcp logout linear` again.
3. Check: `opencode auth list` no longer lists **Linear**.
4. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-linear`, then `opencode reload`.
   `opencode mcp list` no longer lists `linear`.
5. Remove any Linear rules you copied into your agents' own `permissions`.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md)
- [In Jelly](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/jelly.md)
- [Architecture](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/architecture.md)
- [Contributing](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/LICENSE)
- [Linear's MCP server](https://linear.app/docs/mcp)
