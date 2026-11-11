# Metaview for OpenCode

Find, read and cite your recruiting interviews, AI notes and candidates in Metaview from OpenCode, through Metaview's
official MCP server.

Unofficial; not affiliated with Metaview.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Outside that range the plugin does not start, unless
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
opencode plugin add github:joe-broadhead/opencode-metaview#v0.0.0
```

Run `opencode reload`, or restart OpenCode. Then run `/metaview-status`: it shows `sign-in required` until you sign in
(see [Sign in](#sign-in)).

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

The plugin registers Metaview's MCP server under the name `metaview`, adds default permission rules, the
`/metaview-status` command, the `/metaview` status view and three skills. Every tool is Metaview's, and OpenCode handles
the connection, the sign-in and the stored credentials.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-metaview#v0.0.0" }] }
```

### Update

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-metaview#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-metaview#v<version>`.

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

A script or a cron job can call every tool this plugin knows with no model, through `opencode api`. It runs as a
session and its agent, under that agent's permission rules and the session's own. The rule is resolved first, and a
script gets the same default as the model: every tool is allowed by default, and `access` decides what it runs; restrict a script with `"access"` or with a rule
in the session's agent or the session. An `ask` is refused, because no one can answer it, and so is a `deny`. A saved
"Always allow" does not authorize an ad-hoc script:

```sh
opencode api post /api/rpc/metaview.workspace.tools/search_conversations \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"rationale":"weekly interview list","limit":20}}}'
```

Without `x-opencode-directory:$PWD` the call reaches the service's default location and fails `rpc.unavailable` when
the plugin is not loaded there.

See [Scripting](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** The `access` option decides whether each tool runs, asks or is denied. At its default, `"all"`, an agent can act on candidates and your ATS without asking: it can record an
application review decision, which can reject a candidate and sync to your ATS; add candidates to an outreach sequence
or restart one, sending email, LinkedIn, SMS or WhatsApp; send job-post and sourcing messages; spend enrichment
credits; and send feedback to the Metaview team. Every read runs without asking too, such as `search_conversations` and
`fetch_candidates`. Restrict it in any of these three ways:

1. **The `access` option**, which drives the default rules the plugin inserts:

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Metaview adds later | nothing |
   | `"ask-changes"` | the read tools | everything else, new tools included |
   | `"read-only"` | the read tools | nothing: everything else is **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-metaview#v0.0.0", "options": { "access": "read-only" } }] }
   ```

2. **An agent that asks, or reads only**, with rules of its own, later than the plugin's. Put them in the agent: a
   top-level `allow` or `ask` would reach Explore, which otherwise cannot use Metaview.

   ```json
   { "agents": { "recruiter": { "permissions": [
     { "action": "metaview_*", "resource": "*", "effect": "ask" },
     { "action": "metaview_search_conversations", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, in the agent's own `permissions`, with the exact names in
   [`src/metaview-tools.ts`](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/src/metaview-tools.ts). A
   `deny` may also go in the top-level `permissions`, where it only tightens, and a deny also hides the tool.

   ```json
   { "agents": { "build": { "permissions": [
     { "action": "metaview_give_application_review_candidate_feedback", "resource": "*", "effect": "ask" },
     { "action": "metaview_manage_candidate_sequence", "resource": "*", "effect": "deny" }
   ] } } }
   ```

The plugin inserts this block directly after each agent's base rule that allows everything, generated from
`defaultRules("all")` in `src/permissions.ts`:

```json
[
  { "action": "metaview_*", "resource": "*", "effect": "allow" },
  { "action": "metaview_fetch_candidates", "resource": "*", "effect": "allow" },
  { "action": "metaview_find_candidate_in_sequences", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_application_review_details", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_application_review_rules", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_chart_data", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_enrichment_status", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_job_post", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_job_post_template", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_job_post_thread", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_note_template", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_platform_credits", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_screen_details", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_screen_interview", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_search_details", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_sourcing_analytics", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_sourcing_messages", "resource": "*", "effect": "allow" },
  { "action": "metaview_get_user_context", "resource": "*", "effect": "allow" },
  { "action": "metaview_group_conversations", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_application_review_candidates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_application_review_rejection_options", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_application_reviews", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_ats_jobs", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_ats_stages", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_connectors", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_field_values", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_fields", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_job_post_checks", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_job_post_templates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_job_post_threads", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_job_posts", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_mailboxes", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_note_template_groups", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_note_templates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_screen_candidates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_screens", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_sequence_candidates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_sequences", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_sourcing_candidates", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_sourcing_knowledge", "resource": "*", "effect": "allow" },
  { "action": "metaview_list_sourcing_searches", "resource": "*", "effect": "allow" },
  { "action": "metaview_search_conversations", "resource": "*", "effect": "allow" },
  { "action": "metaview_search_reports", "resource": "*", "effect": "allow" },
  { "action": "metaview_search_snippets", "resource": "*", "effect": "allow" },
  { "action": "metaview_create_ai_field", "resource": "*", "effect": "allow" },
  { "action": "metaview_create_job_post_check", "resource": "*", "effect": "allow" },
  { "action": "metaview_create_report", "resource": "*", "effect": "allow" },
  { "action": "metaview_create_snippet", "resource": "*", "effect": "allow" },
  { "action": "metaview_enrich_candidate_contacts", "resource": "*", "effect": "allow" },
  { "action": "metaview_generate_notes", "resource": "*", "effect": "allow" },
  { "action": "metaview_give_sourcing_feedback", "resource": "*", "effect": "allow" },
  { "action": "metaview_manage_note_template", "resource": "*", "effect": "allow" },
  { "action": "metaview_manage_notes_sources", "resource": "*", "effect": "allow" },
  { "action": "metaview_manage_sequence", "resource": "*", "effect": "allow" },
  { "action": "metaview_manage_sourcing_knowledge", "resource": "*", "effect": "allow" },
  { "action": "metaview_post_sourcing_candidates_to_ats", "resource": "*", "effect": "allow" },
  { "action": "metaview_resolve_job_post_suggestion", "resource": "*", "effect": "allow" },
  { "action": "metaview_restore_application_review_icp", "resource": "*", "effect": "allow" },
  { "action": "metaview_run_job_post_checks", "resource": "*", "effect": "allow" },
  { "action": "metaview_send_job_post_message", "resource": "*", "effect": "allow" },
  { "action": "metaview_send_sourcing_message", "resource": "*", "effect": "allow" },
  { "action": "metaview_update_application_review_icp", "resource": "*", "effect": "allow" },
  { "action": "metaview_update_application_review_rules", "resource": "*", "effect": "allow" },
  { "action": "metaview_update_screen_outreach", "resource": "*", "effect": "allow" },
  { "action": "metaview_update_screen_plan", "resource": "*", "effect": "allow" },
  { "action": "metaview_upsert_job_post_template", "resource": "*", "effect": "allow" },
  { "action": "metaview_give_application_review_candidate_feedback", "resource": "*", "effect": "allow" },
  { "action": "metaview_manage_candidate_sequence", "resource": "*", "effect": "allow" },
  { "action": "metaview_submit_feedback", "resource": "*", "effect": "allow" }
]
```

Three tools are classed destructive, because each changes something that cannot be undone once sent: application
review decisions (`give_application_review_candidate_feedback`), candidate outreach (`manage_candidate_sequence`), and
feedback to the Metaview team (`submit_feedback`, which its own description asks the model to call after any error).
Two more reach people when they run: `update_screen_outreach` emails candidates and, with `reject_at_deadline` true,
rejects them automatically at their deadline, and `manage_sequence` with `set_enabled` true restarts a sequence's
outreach. All of them are allowed by default like every other tool; the `access` option, an agent's own rules, or a
rule per tool are how you restrict them.

In an unattended run such as `opencode run`, a tool that asks is refused. Everything later than the plugin's rules
still wins: an agent's own rules (Explore cannot use Metaview), your `permissions` in `opencode.json`, and your saved
answers.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Metaview tools run there under that agent's own rules. `/metaview-status` and `/metaview` name the
agents that have no rules of the plugin's and show the default block to put first in each one's own `permissions`. Do
not put it in the top-level `permissions`, which would loosen Explore.
[Configuration](https://github.com/joe-broadhead/opencode-metaview/blob/HEAD/docs/configuration.md#permissions) has a
worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-metaview#v0.0.0", "options": { "allowUntestedHost": true } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `access` | `"all"`, `"ask-changes"` or `"read-only"` | `"all"` | What the default rules allow: every tool, the reads only with everything else asking, or the reads only with everything else denied. See [Permissions](#permissions). |
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
  "plugins": ["github:joe-broadhead/opencode-metaview#v0.0.0"],
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
| Access: every tool runs without asking | At `access: "all"`, the plugin's default rules let every tool run, candidates and your ATS included. Set the `access` option, or add a rule, as in [Permissions](#permissions). |
| Access: default rules missing or not added | Some agents lack the default rules (see the agents row), or OpenCode could not add them (see the OpenCode row). Follow the next step. |
| Tools: unknown | Metaview added tools the plugin does not know yet. The default block's `metaview_*` rule decides them: they run at the default `access`, ask at `"ask-changes"` and are denied at `"read-only"`. A known tool missing from the count is normal: Metaview lists only the tools for the products you have. |
| Plan: free | Transcripts, summaries and AI fields may be limited; the model passes on Metaview's upgrade text. |
| Plan: shared credits | Conversations unlock on your workspace's shared platform credits rather than your own plan. |
| Answers miss rounds a colleague ran | As a member you see your own conversations and those shared with you. Ask the colleague to share them, or ask an admin. |
| Agents without default rules | Put the default rules shown by `/metaview-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Metaview tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4, 2.2.5 or 2.2.6. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Metaview misbehaves, use a tested release. |
| Signed in to the wrong Metaview account | Run `opencode mcp logout metaview` (or remove the account in `/connect` → Metaview), then sign in again. |
| A Metaview tool is refused in `opencode run` | Nobody could answer its prompt, so an `access: "ask-changes"` or a rule of yours asked for it. Add an `allow` rule for that tool to the agent's own `permissions`, or set `access: "all"`. |
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
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-metaview#v0.0.0`, then `opencode reload`.
   `opencode mcp list` no longer lists `metaview`.
4. Remove any Metaview rules you copied into your agents' own `permissions`. If you used an API key, delete it in
   Metaview: Settings, MCP.

## Known limits

- **Some changes reach people.** A screening or sequence message, an application-review decision that can reject a candidate and sync to your ATS, and feedback to the Metaview team (a hiring decision can email the candidate) all reach people or systems outside OpenCode. At the default `access`, an agent can make them without a prompt.
- **Metaview's server decides the tools.** The plugin classifies the tools it knows. A tool Metaview adds later is not classed by the plugin: the `access` option decides whether it runs, asks or is denied, and `/metaview-status` counts it as unknown.
- **Role and plan limits.** What you can read follows your Metaview role, and reports, AI fields and full transcripts may need a paid plan. The plugin does not change either.
- **No retries.** The plugin does not retry a failed call. The error names the next step.
- **Hosts and platforms.** The plugin is tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6, and runs on macOS or Linux. A later 2.2 release starts and is reported as untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

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
