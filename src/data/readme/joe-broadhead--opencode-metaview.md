# Metaview for OpenCode

Find, read and cite your recruiting interviews, AI notes and candidates in Metaview from OpenCode, through Metaview's
official MCP server.

Unofficial; not affiliated with Metaview.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Metaview account in a workspace where an admin has turned on **MCP integration**. Members also need **MCP for
  non-admins** (Metaview: Workspace settings).
- What you can read follows your Metaview role: admins see every conversation in the workspace, members their own and
  those shared with them. Which tools appear depends on the Metaview products you have, and reports, AI fields and full
  transcripts may need a paid Metaview plan.
- Metaview stores its data on AWS in the UK.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-metaview
```

Run `opencode reload`, or restart OpenCode. Then run `/metaview-status`: it shows `sign-in required` until you sign in
(see [Sign in](#sign-in)).

The plugin registers Metaview's MCP server under the name `metaview`, adds default permission rules, the
`/metaview-status` command, the `/metaview` status view and three skills. Every tool is Metaview's, and OpenCode handles
the connection, the sign-in and the stored credentials.

**Update** with `opencode plugin update @joe-broadhead/opencode-metaview`, then run `opencode reload`. An entry pinned
to a version does not update: remove the `@version` from its `plugins` entry first.

## Sign in

Run `/connect` and choose **Metaview** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the link
to Metaview's sign-in page in your browser, and sign in with your Metaview account. No key is needed.

From a terminal, run `opencode mcp auth metaview` instead; it opens the link automatically. `/mcps` also offers the
same sign-in.

When the sign-in expires and cannot be renewed, `/connect` marks the Metaview account as needing a new sign-in, and
OpenCode shows its "MCP server needs authentication" notice.

To sign out, or to switch account, run `opencode mcp logout metaview`, or remove the account in `/connect` → Metaview.
Then sign in again. To sign out before you remove the plugin, see [Uninstall](#uninstall).

On a machine without a browser, you can use a Metaview API key in your own server entry instead; see
[Configure](#configure).

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
| `/metaview-status` | Posts the status report into the session: connection, account, access, plan, tools, agents without the default rules, the OpenCode check and the next step. The model can read it too. |
| `/metaview`, or "Metaview: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes when Metaview's connection, the sign-in or the agents change. |

The account, role and plan in the report appear after the model's first account read (`metaview_get_user_context`)
since OpenCode started; the plugin makes no Metaview call of its own.

Three skills teach the model to use Metaview well:

- `metaview`: finding a candidate or interviewer, filters and dates, how much of a transcript to read, citing
  conversations and moments, job posts and their checks, and the rules for candidate data.
- `metaview-candidate-brief`: interview prep, debriefs, evidence comparisons and draft scorecards, with every hiring
  decision left to you.
- `metaview-write`: who each change reaches (candidates, your ATS, the workspace, credits), reading first, saying
  whom a change reaches before the call, and leaving the yes to OpenCode's permission prompt.

### Scripts

A script or a cron job can call Metaview's read tools with no model, through `opencode api`. It runs as a session and
its agent, under that agent's permission rules and the session's own. Write tools are never available to scripts:

```sh
opencode api post /api/rpc/metaview.workspace.tools/search_conversations \
  -d '{"input":{"sessionID":"ses_…","input":{"rationale":"weekly interview list","limit":20}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds these rules to every agent, directly after the agent's base rule that allows everything:

1. `{ "action": "metaview_*", "resource": "*", "effect": "ask" }`: every Metaview tool asks, including tools Metaview
   adds later.
2. One `allow` rule for each of Metaview's read tools, listed in
   [`src/metaview-tools.ts`](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/src/metaview-tools.ts).
   These run without a prompt.
3. Three `deny` rules, for tools that are off until you turn them on. A deny also hides the tool from the model.
   - `{ "action": "metaview_give_application_review_candidate_feedback", "resource": "*", "effect": "deny" }`:
     application review decisions. A REJECT or PROGRESS syncs to your ATS, and a REJECT can email the candidate; it
     can't be undone once sent.
   - `{ "action": "metaview_manage_candidate_sequence", "resource": "*", "effect": "deny" }`: adds candidates to
     outreach sequences (email, LinkedIn, SMS or WhatsApp), or pauses or removes them.
   - `{ "action": "metaview_submit_feedback", "resource": "*", "effect": "deny" }`: sends text to the Metaview team,
     and its own description asks the model to call it after any error, unasked.

   Two tools that only ask still act on candidates: `metaview_update_screen_outreach` with `reject_at_deadline` rejects
   candidates automatically at their deadline, and `metaview_manage_sequence` can restart a sequence's outreach. Each
   call asks, and the `metaview-write` skill says whom it reaches before the call.

   To turn one on for an agent, add a rule that makes it **ask** to that agent's own `permissions`, which come after
   the plugin's block. For the build agent:

   ```json
   {
     "agents": {
       "build": {
         "permissions": [{ "action": "metaview_manage_candidate_sequence", "resource": "*", "effect": "ask" }]
       }
     }
   }
   ```

   Not in the top-level `permissions`: a top-level rule reaches every agent, Explore included. Never make the two
   candidate tools `allow`, and don't answer "Always allow" for them: that would save an allow for every agent in the
   project.

So reads run, every other change asks before it runs, and the three above don't run at all. Some changes that ask
reach candidates or your ATS too: screening plans and invitations, edits to a live sequence, and posting sourced
candidates to the ATS. Everything that comes later than these rules still wins: an agent's own stricter rules
(Explore cannot use Metaview), your `permissions` in `opencode.json`, and your saved "Always allow" answers. In an unattended run such as
`opencode run`, a tool that asks is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Metaview tools run there without asking. `/metaview-status` and `/metaview` name those agents and
show the default rules to put first in each one's own `permissions`. Do not put them in the top-level `permissions`,
which would loosen Explore.
[Configuration](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/configuration.md#permissions) has a
worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-metaview", "options": { "allowUntestedHost": true } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.2.3 <2.3.0`, with a warning in status. |

[docs/configuration.md](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/configuration.md) has the
details, including your own `mcp.servers.metaview` entry (also with a Metaview API key), permission recipes and every
error.

## Organisation rollout

OpenCode signs in to Metaview's server with its own client metadata, so there is no client ID to distribute. Put the
plugin entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux. This example also turns off two more changes, for everyone: posting sourced
candidates to the ATS, and spending enrichment credits:

```json
{
  "plugins": ["@joe-broadhead/opencode-metaview"],
  "permissions": [
    { "action": "metaview_post_sourcing_candidates_to_ats", "resource": "*", "effect": "deny" },
    { "action": "metaview_enrich_candidate_contacts", "resource": "*", "effect": "deny" }
  ]
}
```

To let members record application review decisions or manage outreach from OpenCode, with a prompt on every call, add
the `ask` rule for that tool to the agent's own `permissions` in the same config, as [Permissions](#permissions) shows
for `agents.build`. Not to the top-level `permissions`, which reach every agent, Explore included.

Members then only sign in: run `/connect` and choose Metaview, then press `o` or Enter to open the link. Metaview's own
controls stay in Metaview: Workspace settings → **MCP integration** and **MCP for non-admins**. Metaview API keys are
personal, so an organisation cannot set one for its members. Your organisation's approval of AI tools applies to
candidate data; Metaview recommends checking with your legal or data protection team before you turn on MCP.

## Troubleshooting

Run `/metaview-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Connection: sign-in required | Run `/connect` and choose Metaview, then press `o` or Enter to open the link. In a terminal, `opencode mcp auth metaview` opens it automatically. |
| Connection: connecting | Wait a few seconds, then run `/metaview-status` again. |
| Connection: failed | Check your network, then run `/metaview-status` again. With your own entry that sends an API key, check the key (Metaview: Settings, MCP). |
| Connection: disabled | Enable `metaview` in `/mcps`, or remove `"disabled": true` from `mcp.servers.metaview` in `opencode.json`. |
| Connection: not configured | An organisation policy (`mcp.use`) or another plugin removes the `metaview` server. Ask your administrator, then restart OpenCode. |
| Connection: conflict | Your config has an `mcp.servers.metaview` entry with a URL other than `https://mcp.metaview.ai/mcp`. Point it at `https://mcp.metaview.ai/mcp` or remove it, then restart OpenCode. |
| Tools: none listed yet | Metaview connected moments ago and is still listing its tools. Run `/metaview-status` again, or press `r` in the dialog, in a few seconds. |
| Tools: 0 available | Metaview lists no tools for your account. Ask a workspace admin to turn on **MCP integration**, and **MCP for non-admins** if you are a member. |
| Tools: off by default | The tools the default rules deny, listed by name. See [Permissions](#permissions) to turn one on, as an ask. |
| Access: default rules missing or not added | Some agents lack the default rules (see the agents row), or OpenCode could not add them (see the OpenCode row). Follow the next step. |
| Tools: unknown | Metaview added tools the plugin does not know yet. They ask before they run. A known tool missing from the count is normal: Metaview lists only the tools for the products you have. |
| Plan: free | Transcripts, summaries and AI fields may be limited; the model passes on Metaview's upgrade text. |
| Plan: shared credits | Conversations unlock on your workspace's shared platform credits rather than your own plan. |
| Answers miss rounds a colleague ran | As a member you see your own conversations and those shared with you. Ask the colleague to share them, or ask an admin. |
| Agents without default rules | Put the default rules shown by `/metaview-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Metaview tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4 or 2.2.5. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Metaview misbehaves, use a tested release. |
| Signed in to the wrong Metaview account | Run `opencode mcp logout metaview` (or remove the account in `/connect` → Metaview), then sign in again. |
| A Metaview tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool to the agent's own `permissions` (never for the two candidate tools: run those interactively). |
| A skill seems ignored, and status names a skill to rename or move | A skill of yours with the same id, such as `metaview`, replaces the plugin's. Rename or move it. |
| `/metaview` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `SERVER_NOT_REGISTERED` | The plugin could not register the `metaview` server. Restart OpenCode. |
| `RULES_NOT_ADDED` | The default permission rules could not be added, so Metaview tools may run without asking. Restart OpenCode. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `metaview` server, so
`opencode mcp logout metaview` fails with `MCP server not found: metaview` and the sign-in stays in OpenCode's
credential store.

1. Sign out: `opencode mcp logout metaview`. Right after OpenCode starts or reloads, it can answer
   `MCP server not found: metaview` for a few seconds; wait, then run it again.
2. Check: `opencode auth list` no longer lists **Metaview**.
3. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-metaview`, then `opencode reload`.
   `opencode mcp list` no longer lists `metaview`.
4. Remove any Metaview rules you copied into your agents' own `permissions`. If you used an API key, delete it in
   Metaview: Settings, MCP.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/configuration.md)
- [Scripting](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/scripting.md)
- [In Jelly](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/jelly.md)
- [Architecture](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/architecture.md)
- [Contributing](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/LICENSE)
- [Metaview's MCP integration](https://support.metaview.ai/integrations/mcp-integration/mcp-overview)
