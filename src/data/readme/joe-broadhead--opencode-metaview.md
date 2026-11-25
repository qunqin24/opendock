# Metaview for OpenCode

Find, read and cite your recruiting interviews, AI notes and candidates in Metaview from OpenCode, through Metaview's
official MCP server. The plugin registers that server, adds default permission rules, a status command and dialog, three
skills, and a tools RPC for scripts. It adds no tool of its own and makes no Metaview call of its own.

Unofficial; not affiliated with Metaview.

Metaview is a trademark of Metaview Labs Inc.; this unofficial plugin is not endorsed by them.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1 only. Outside that range the plugin refuses to start, unless you set
  `allowUntestedHost`.
- macOS or Linux.
- A Metaview account in a workspace where an admin has turned on **MCP integration**. Members also need **MCP for
  non-admins** (Metaview: Workspace settings).
- What you can read follows your Metaview role: admins see every conversation in the workspace, members their own and
  those shared with them. Which tools appear depends on the Metaview products you have, and reports, AI fields and full
  transcripts may need a paid Metaview plan.
- Metaview stores its data on AWS in the UK.

## Install

Install from a release tag:

```sh
opencode plugin add github:we-the-rebel-alliance/metaview-plugin#v<version>
```

The first release on plugin-contract is `v0.0.0` (phase 4b). Run `opencode reload`, or restart OpenCode. Then run
`/metaview-status`: it shows `sign-in required` until you sign in (see [Sign in](#sign-in)).

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/metaview-plugin#v<version>" }] }
```

## Sign in

Run `/connect` and choose **Metaview** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the link
to Metaview's sign-in page in your browser, and sign in with your Metaview account. No key is needed.

From a terminal, run `opencode mcp auth metaview` instead; it opens the link automatically. `/mcps` also offers the
same sign-in. On a machine without a browser, you can use a Metaview API key in your own server entry instead; see
[Configuration](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/configuration.md).

## Use

Ask, for example:

- "Prep me for my final round with Example Candidate tomorrow."
- "What did the backend engineer candidate say about why they want to leave their current job?"
- "Summarise yesterday's technical screen for the data engineer role."
- "Which interviews did Example Interviewer run in the first week of October?"
- "Compare our three finalists for the product designer role on the evidence."

The model labels Metaview's AI notes and summaries as Metaview's, never makes a hiring decision you didn't ask for, and
keeps candidate data out of other tools unless you name the destination.

| Command | What it does |
| --- | --- |
| `/metaview-status` | Posts the status report into the session: connection, account, access, plan, tools, agents without the default rules, the OpenCode check and the next step. |
| `/metaview`, or "Metaview: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. |

Three skills teach the model to use Metaview well:

- `metaview`: finding a candidate or interviewer, filters and dates, how much of a transcript to read, citing
  conversations and moments, job posts and their checks, and the rules for candidate data.
- `metaview-candidate-brief`: interview prep, debriefs, evidence comparisons and draft scorecards, with every hiring
  decision left to you.
- `metaview-write`: who each change reaches (candidates, your ATS, the workspace, credits), reading first, saying
  whom a change reaches before the call, and leaving the yes to OpenCode's permission prompt.

### Scripts

A script can call every tool this plugin knows with no model, through the tools RPC. It runs as a session and its
agent, under that agent's permission rules and the session's own. An `ask` is refused, because no one can answer it,
and so is a `deny`:

```sh
opencode api post /api/rpc/metaview.workspace.tools/search_conversations \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"rationale":"weekly interview list","limit":20}}}'
```

See [Scripting](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** The `access` option decides whether each tool runs, asks or is denied. At its
default, `"all"`, an agent can act on candidates and your ATS without asking: it can record an application review
decision, which can reject a candidate and sync to your ATS; add candidates to an outreach sequence or restart one,
sending email, LinkedIn, SMS or WhatsApp; send job-post and sourcing messages; spend enrichment credits; and send
feedback to the Metaview team. Every read runs without asking too, such as `search_conversations` and
`fetch_candidates`.

| Value | What runs | What asks |
| --- | --- | --- |
| `"all"` (the default) | every tool, and any tool Metaview adds later | nothing |
| `"ask-changes"` | the read tools | everything else, new tools included |
| `"read-only"` | the read tools | nothing: everything else is **denied** |

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/metaview-plugin#v<version>", "options": { "access": "read-only" } }] }
```

A rule of your own in an agent's `permissions` still wins over the plugin's block. Put it in the agent, not in the
top-level `permissions`, which would reach Explore too.
[Configuration](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/configuration.md#permissions)
has worked examples, including one rule per tool.

## Options

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `access` | `"all"`, `"ask-changes"` or `"read-only"` | `"all"` | What the default rules allow: every tool, the reads only with everything else asking, or the reads only with everything else denied. |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.4.1 <2.5.0`, with a warning in status. |

[Configuration](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/configuration.md) has the
details, including your own `mcp.servers.metaview` entry (also with a Metaview API key), permission recipes and every
error.

## Troubleshooting

Run `/metaview-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Connection: sign-in required | Run `/connect` and choose Metaview, then press `o` or Enter to open the link. In a terminal, `opencode mcp auth metaview` opens it automatically. |
| Connection: failed | Check your network, then run `/metaview-status` again. With your own entry that sends an API key, check the key. |
| Connection: conflict | Your config has an `mcp.servers.metaview` entry with a URL other than `https://mcp.metaview.ai/mcp`. Point it there or remove it, then restart OpenCode. |
| Tools: 0 available | Metaview lists no tools for your account. Ask a workspace admin to turn on **MCP integration**, and **MCP for non-admins** if you are a member. |
| Agents without default rules | Put the default rules shown by `/metaview-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.4.1 <2.5.0`, so the plugin did not start. Use a supported release, or set `"allowUntestedHost": true` to run anyway. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `RULES_NOT_ADDED` | The default permission rules could not be added, so Metaview tools may run without asking. Restart OpenCode. |
| `SERVER_NOT_REGISTERED` | The plugin could not register the `metaview` server. Restart OpenCode. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `metaview` server, so
`opencode mcp logout metaview` fails with `MCP server not found: metaview` and the sign-in stays in OpenCode's
credential store.

1. Sign out: `opencode mcp logout metaview`.
2. Check: `opencode auth list` no longer lists **Metaview**.
3. Remove the plugin: `opencode plugin remove github:we-the-rebel-alliance/metaview-plugin#v<version>`, then
   `opencode reload`.
4. Remove any Metaview rules you copied into your agents' own `permissions`. If you used an API key, delete it in
   Metaview: Settings, MCP.

## Links

- [Configuration](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/configuration.md)
- [Scripting](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/scripting.md)
- [Architecture](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/docs/architecture.md)
- [Contributing](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/CONTRIBUTING.md)
- [Security](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/SECURITY.md)
- [Changelog](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/CHANGELOG.md)
- [MIT license](https://github.com/we-the-rebel-alliance/metaview-plugin/blob/master/LICENSE)
- [Metaview's MCP integration](https://support.metaview.ai/integrations/mcp-integration/mcp-overview)
