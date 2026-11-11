# GitHub for OpenCode

Connects OpenCode to GitHub's hosted MCP server, so your agents can read and, if you allow it, change issues, pull
requests, code and more with GitHub's own tools.

Unofficial; not affiliated with GitHub. GitHub is a trademark of GitHub, Inc.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. A later 2.2 release loads too, and the status marks it
  untested. Outside `>=2.2.3 <2.3.0` the plugin does not load, unless you set
  [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md#allowuntestedhost).
- macOS or Linux.
- A GitHub account.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-github#v0.0.0
```

Run `opencode reload`, or restart OpenCode. Then run `/github-status`: it shows `Connection: sign-in required` until
you sign in, and `opencode mcp list` shows `github  needs authentication`.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-github#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-github#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-github#v0.0.0" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

## Sign in

Run `/connect` and choose **GitHub**, then **Add account**. `/mcps` → `github` opens the same sign-in. From a
terminal, run `opencode auth login GitHub`.

Choose **Use a fine-grained personal access token**. OpenCode shows a link to GitHub's new-token page, already
filled in with the name "OpenCode GitHub" and the read access below. Choose the repositories, create the token and
paste it. The plugin checks the token with GitHub before it is saved. Classic tokens (`ghp_…`) work too.

**Fine-grained token permissions.** A fine-grained token reaches only what it is granted, and a tool without its
permission fails with "Resource not accessible by personal access token". The default toolsets read with these,
all read-only:

- Repository permissions (the token page fills these in): Metadata, Contents, Issues, Pull requests, Commit
  statuses, Actions, Code quality, Code scanning alerts, Dependabot alerts, Secret scanning alerts, Repository
  security advisories and Discussions.
- Organisation permissions, when the token's resource owner is an organisation: Members (teams), Issue Types and
  Issue Fields.

Leave out any you don't need; only the tools that use them fail. Listing an organisation's repository security
advisories needs write access to Repository security advisories, so it fails with a read-only token.

Organisations can set `clientId` to their own OAuth App (Device Flow on, no client secret); `/connect` then also
offers **Sign in with GitHub**, a device sign-in with the scopes `repo` and `read:org`, which needs none of the token
permissions above.

**The browser.** In the TUI, press `o` or Enter to open the link in your browser (`c` copies a device code). The CLI,
`opencode auth login GitHub`, opens the browser automatically.

A fine-grained token reaches only the repositories you select, and GitHub enforces that. For writes, give the token
write access to what those tools change, for example Issues or Pull requests.

To sign out, run `opencode auth logout GitHub <login>`, where `<login>` is the account's label, your GitHub login,
or remove the account in `/connect` → **GitHub**.

## Use

Ask your agent about GitHub, for example "summarise the open pull requests in owner/repo" or "why did CI fail on
pull request 42?". Agents use GitHub's own tools, reads and writes alike, from these toolsets: repositories and code,
issues, pull requests, labels, Actions runs and job logs, Git trees, discussions, code scanning, secret scanning,
Dependabot and code quality alerts, security advisories, users and organisations. Examples: `github_issue_read`,
`github_pull_request_read`, `github_get_file_contents`, `github_search_code` and `github_get_job_logs`. In Code Mode
they are in the `github` namespace. Their signatures are not pinned in the catalogue; the host can still show unpinned tools. The skills name the tool, and `search` finds its parameters. Projects, gists and notifications need extra scopes, so they are off by default.

**`github_api`** covers what GitHub's MCP tools cannot do: auto-merge, creating releases and uploading their assets,
branch protection, rulesets, Actions variables, downloading artifacts and logs to a file, and any GraphQL. It calls
GitHub's REST or GraphQL API with your GitHub sign-in, for example
`{ "method": "GET", "path": "/repos/OWNER/REPO/branches/main/protection" }` or
`{ "graphql": { "query": "query { viewer { login } }" } }`. GET, HEAD, `POST /markdown` and a single GraphQL query
read; every other call changes GitHub, and follows the `access` value: at the default it runs,
`"ask-changes"` asks for it, and `"read-only"` refuses it. Requests go only to
GitHub's API. A change never follows a redirect, a read follows one only within the API, and only a download follows
one to GitHub's file storage, without your token. `download: { path }` saves a response to a file in the
project, and `upload: { path, contentType }` sends a project file as a release asset; both are changes.

Three skills come with it:

- `github-pr-review`: review a pull request from its description, changed files, diff, earlier reviews and checks.
- `github-issue-triage`: find and read issues, spot duplicates, and propose labels, priority and next steps.
- `github-code-research`: search repositories, read files at a branch or commit, and follow the history, citing
  files and lines.

Each skill reports findings and changes nothing on GitHub unless you ask.

**Events list.** `github_events_list`, the plugin's own read, is for Memory's collector and other scripts, not for
answering questions: what you were involved in since a cursor (changes to issues and pull requests, your commits, and
other notifications where the sign-in may read them), as normalised events, oldest first. It only reads, with GET
requests, and never asks. See [Events list](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md#events-list).

**Scripts.** A script or a cron job can call GitHub's tools and `github_api` with no model, through `opencode api`.
It runs as a session and its agent, and every call resolves the rule for its action, the agent's and then the
session's: only an `allow` runs, an `ask` is refused, and a saved "Always allow" is not enough. A non-GET/HEAD `api`
call resolves the same write permission the direct path asserts — action `github_api`, resource `METHOD /path` — from a
prior explicit `allow` only, and an allow scoped to GETs cannot POST.

```sh
opencode api post /api/rpc/github.platform.tools/pull_request_read -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"method":"get","owner":"OWNER","repo":"REPO","pullNumber":42}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/scripting.md).

**Status.** `/github` in the TUI, or **GitHub: Status** in the command palette, opens a dialog with the state, the
account and access, the tools (with the names of any the plugin does not know yet), the agents that miss the default
rules with the rules to paste, the OpenCode check and the next step. `r` refreshes it and `Esc` closes it. It also
refreshes when the sign-in, an account, the `github` server or the agents change. `/github-status` posts the same
status into the session as a note, without starting a model turn.

## Permissions

**Every tool is allowed by default.** An agent can read any repository, issue and pull request the signed-in account
can see, and change them: comment, push, open and merge pull requests, create releases, delete files and repositories,
run workflows. `github_api` is allowed too, so an agent can make any REST or GraphQL call the token permits. Nothing
asks first. Restrict it in any of these three ways:

1. **The `access` option**, which drives the default rules the plugin inserts:

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool GitHub adds later | nothing |
   | `"ask-changes"` | the read tools | every write, and new tools |
   | `"read-only"` | the read tools | nothing: every write is **denied**, and GitHub's own server lists no write tools |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-github#v0.0.0", "options": { "access": "read-only" } }] }
   ```

   `readOnly: true` and `false` still work: they mean `"read-only"` and `"all"`, and `/github-status` says they are
   deprecated. An explicit `access` wins over them.

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reviewer": { "permissions": [
     { "action": "github_*", "resource": "*", "effect": "ask" },
     { "action": "github_get_me", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names: `github_<tool>`, listed in the [toolsets table](docs/configuration.md#toolsets).
   A later rule wins:

   ```json
   { "permissions": [
     { "action": "github_merge_pull_request", "resource": "*", "effect": "deny" },
     { "action": "github_issue_write", "resource": "*", "effect": "ask" }
   ] }
   ```

   Every rule needs a `"resource"`. OpenCode skips a rule without it.

The plugin inserts this block directly after each agent's base rule that allows everything, generated from
`defaultRules("all")` in `src/permissions.ts`:

```json
[
  { "action": "github_*", "resource": "*", "effect": "allow" },
  { "action": "github_actions_get", "resource": "*", "effect": "allow" },
  { "action": "github_actions_list", "resource": "*", "effect": "allow" },
  { "action": "github_check_dependency_vulnerabilities", "resource": "*", "effect": "allow" },
  { "action": "github_custom_properties_read", "resource": "*", "effect": "allow" },
  { "action": "github_get_code_quality_finding", "resource": "*", "effect": "allow" },
  { "action": "github_get_code_scanning_alert", "resource": "*", "effect": "allow" },
  { "action": "github_get_commit", "resource": "*", "effect": "allow" },
  { "action": "github_get_copilot_space", "resource": "*", "effect": "allow" },
  { "action": "github_get_dependabot_alert", "resource": "*", "effect": "allow" },
  { "action": "github_get_discussion", "resource": "*", "effect": "allow" },
  { "action": "github_get_discussion_comments", "resource": "*", "effect": "allow" },
  { "action": "github_get_file_contents", "resource": "*", "effect": "allow" },
  { "action": "github_get_gist", "resource": "*", "effect": "allow" },
  { "action": "github_get_global_security_advisory", "resource": "*", "effect": "allow" },
  { "action": "github_get_job_logs", "resource": "*", "effect": "allow" },
  { "action": "github_get_label", "resource": "*", "effect": "allow" },
  { "action": "github_get_latest_release", "resource": "*", "effect": "allow" },
  { "action": "github_get_me", "resource": "*", "effect": "allow" },
  { "action": "github_get_notification_details", "resource": "*", "effect": "allow" },
  { "action": "github_get_release_by_tag", "resource": "*", "effect": "allow" },
  { "action": "github_get_repository_tree", "resource": "*", "effect": "allow" },
  { "action": "github_get_secret_scanning_alert", "resource": "*", "effect": "allow" },
  { "action": "github_get_tag", "resource": "*", "effect": "allow" },
  { "action": "github_get_team_members", "resource": "*", "effect": "allow" },
  { "action": "github_get_teams", "resource": "*", "effect": "allow" },
  { "action": "github_github_support_docs_search", "resource": "*", "effect": "allow" },
  { "action": "github_issue_artifact_read", "resource": "*", "effect": "allow" },
  { "action": "github_issue_read", "resource": "*", "effect": "allow" },
  { "action": "github_list_branches", "resource": "*", "effect": "allow" },
  { "action": "github_list_code_scanning_alerts", "resource": "*", "effect": "allow" },
  { "action": "github_list_commits", "resource": "*", "effect": "allow" },
  { "action": "github_list_copilot_spaces", "resource": "*", "effect": "allow" },
  { "action": "github_list_dependabot_alerts", "resource": "*", "effect": "allow" },
  { "action": "github_list_discussion_categories", "resource": "*", "effect": "allow" },
  { "action": "github_list_discussions", "resource": "*", "effect": "allow" },
  { "action": "github_list_gists", "resource": "*", "effect": "allow" },
  { "action": "github_list_global_security_advisories", "resource": "*", "effect": "allow" },
  { "action": "github_list_issue_fields", "resource": "*", "effect": "allow" },
  { "action": "github_list_issue_types", "resource": "*", "effect": "allow" },
  { "action": "github_list_issues", "resource": "*", "effect": "allow" },
  { "action": "github_list_label", "resource": "*", "effect": "allow" },
  { "action": "github_list_notifications", "resource": "*", "effect": "allow" },
  { "action": "github_list_org_repository_security_advisories", "resource": "*", "effect": "allow" },
  { "action": "github_list_pull_requests", "resource": "*", "effect": "allow" },
  { "action": "github_list_releases", "resource": "*", "effect": "allow" },
  { "action": "github_list_repository_collaborators", "resource": "*", "effect": "allow" },
  { "action": "github_list_repository_security_advisories", "resource": "*", "effect": "allow" },
  { "action": "github_list_secret_scanning_alerts", "resource": "*", "effect": "allow" },
  { "action": "github_list_starred_repositories", "resource": "*", "effect": "allow" },
  { "action": "github_list_tags", "resource": "*", "effect": "allow" },
  { "action": "github_projects_get", "resource": "*", "effect": "allow" },
  { "action": "github_projects_list", "resource": "*", "effect": "allow" },
  { "action": "github_pull_request_read", "resource": "*", "effect": "allow" },
  { "action": "github_repository_ruleset_read", "resource": "*", "effect": "allow" },
  { "action": "github_search_code", "resource": "*", "effect": "allow" },
  { "action": "github_search_commits", "resource": "*", "effect": "allow" },
  { "action": "github_search_issues", "resource": "*", "effect": "allow" },
  { "action": "github_search_orgs", "resource": "*", "effect": "allow" },
  { "action": "github_search_pull_requests", "resource": "*", "effect": "allow" },
  { "action": "github_search_repositories", "resource": "*", "effect": "allow" },
  { "action": "github_search_users", "resource": "*", "effect": "allow" },
  { "action": "github_events_list", "resource": "*", "effect": "allow" },
  { "action": "github_actions_run_trigger", "resource": "*", "effect": "allow" },
  { "action": "github_add_comment_to_pending_review", "resource": "*", "effect": "allow" },
  { "action": "github_add_issue_comment", "resource": "*", "effect": "allow" },
  { "action": "github_add_reply_to_pull_request_comment", "resource": "*", "effect": "allow" },
  { "action": "github_assign_copilot_to_issue", "resource": "*", "effect": "allow" },
  { "action": "github_assign_copilot_to_issue_with_intent", "resource": "*", "effect": "allow" },
  { "action": "github_create_branch", "resource": "*", "effect": "allow" },
  { "action": "github_create_gist", "resource": "*", "effect": "allow" },
  { "action": "github_create_or_update_file", "resource": "*", "effect": "allow" },
  { "action": "github_create_pull_request", "resource": "*", "effect": "allow" },
  { "action": "github_create_pull_request_with_copilot", "resource": "*", "effect": "allow" },
  { "action": "github_create_repository", "resource": "*", "effect": "allow" },
  { "action": "github_create_repository_ruleset", "resource": "*", "effect": "allow" },
  { "action": "github_custom_properties_write", "resource": "*", "effect": "allow" },
  { "action": "github_delete_file", "resource": "*", "effect": "allow" },
  { "action": "github_delete_repository", "resource": "*", "effect": "allow" },
  { "action": "github_discussion_comment_write", "resource": "*", "effect": "allow" },
  { "action": "github_dismiss_notification", "resource": "*", "effect": "allow" },
  { "action": "github_fork_repository", "resource": "*", "effect": "allow" },
  { "action": "github_issue_artifact_write", "resource": "*", "effect": "allow" },
  { "action": "github_issue_write", "resource": "*", "effect": "allow" },
  { "action": "github_label_write", "resource": "*", "effect": "allow" },
  { "action": "github_manage_notification_subscription", "resource": "*", "effect": "allow" },
  { "action": "github_manage_repository_notification_subscription", "resource": "*", "effect": "allow" },
  { "action": "github_mark_all_notifications_read", "resource": "*", "effect": "allow" },
  { "action": "github_merge_pull_request", "resource": "*", "effect": "allow" },
  { "action": "github_projects_write", "resource": "*", "effect": "allow" },
  { "action": "github_pull_request_review_write", "resource": "*", "effect": "allow" },
  { "action": "github_push_files", "resource": "*", "effect": "allow" },
  { "action": "github_request_copilot_review", "resource": "*", "effect": "allow" },
  { "action": "github_star_repository", "resource": "*", "effect": "allow" },
  { "action": "github_sub_issue_write", "resource": "*", "effect": "allow" },
  { "action": "github_unstar_repository", "resource": "*", "effect": "allow" },
  { "action": "github_update_gist", "resource": "*", "effect": "allow" },
  { "action": "github_update_issue_comment", "resource": "*", "effect": "allow" },
  { "action": "github_update_pull_request", "resource": "*", "effect": "allow" },
  { "action": "github_update_pull_request_branch", "resource": "*", "effect": "allow" }
]
```

`github_api` rules match `METHOD /path`, and `*` matches any text, slashes included. **Write owner and repo names in
lower case**: GitHub reads them without regard to case, so the plugin checks `/repos/Owner/Prod/…` as
`/repos/owner/prod/…`, and a rule with an upper-case name never matches (the status warns about it). The same holds for
organisation, user and team names, and environment, label, secret and variable names. This lets an agent change one
owner's repositories without a prompt, and never delete anything:

```json
{
  "permissions": [
    { "action": "github_api", "resource": "POST /repos/my-org/*", "effect": "allow" },
    { "action": "github_api", "resource": "DELETE *", "effect": "deny" }
  ]
}
```

A GraphQL change is `POST /graphql`, and saving a download is `download <file>`. A deny on
`{ "action": "github_api", "resource": "*" }` removes the tool from the agent. A script's `api` call resolves its own
`METHOD /path`, so a rule for another method does not cover it.

Your own rules still win over the defaults: a later rule, a saved **Always allow** (for the model), and a stricter
agent's own rules (Plan keeps its rules, and Explore still cannot run GitHub tools).

**Agents defined only in your config miss the defaults.** OpenCode creates them after plugins load, so they get no
block; their own rules decide, and if they have none a GitHub tool runs. `/github-status` and the `/github` dialog name
these agents and show the block to copy. Put it **first** in **that agent's own** `permissions` list, in
`opencode.json` or in the agent's Markdown file, followed by your top-level rules for `github_` tools, so yours keep
winning. Do not put these rules in the top-level `permissions`: that would weaken Explore and any other agent that
denies by default.

### If you have `gh` installed

The plugin does not use the GitHub CLI. If `gh` is installed and signed in on your machine, agents can still run it
through OpenCode's bash tool, with your own account, and OpenCode's bash tool runs commands without asking by
default. To keep `gh` behind a prompt, and its token out of reach, add bash rules:

```json
{
  "permissions": [
    { "action": "bash", "resource": "gh *", "effect": "ask" },
    { "action": "bash", "resource": "gh pr view *", "effect": "allow" },
    { "action": "bash", "resource": "gh auth *", "effect": "deny" }
  ]
}
```

## Configure

Options go in the plugin's entry in `opencode.json`:

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-github#v0.0.0", "options": { "toolsets": ["context", "repos", "issues"] } }]
}
```

The options are `toolsets`, `access`, `lockdown`, `unknownTools`, `clientId`, `scopes`, `allowUntestedHost` and
`host`. `readOnly` is deprecated: it maps onto `access`.

**`unknownTools`** decides only whether GitHub tools the plugin does not know are listed. `"ask"` (the default) keeps
them, and they follow the `github_*` rule and `access` like every other tool: they run at the default, ask at
`"ask-changes"` and are denied at `"read-only"`. The value's name is older than the all-allow default and does not
make a tool ask; to make one ask or stop, use `access` or a rule. `"hide"` removes them from the agents' tool list.

**GitHub Enterprise Server.** Set `host` to the server's host name, such as `"host": "github.example.com"`. GitHub's
hosted MCP server does not support GitHub Enterprise Server, so the plugin then registers no MCP tools and
`github_api` is the tool. Sign in with `/connect` → **GitHub Enterprise**; device sign-in there needs `clientId` from an
OAuth App your administrator registers. For the MCP tools, run GitHub's `github-mcp-server` yourself. GHE.com (data
residency) is not supported yet.
[docs/configuration.md](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md) describes
each one, the toolsets, the default rules and permission recipes.

## Organisation rollout

An organisation can set the options for everyone on a machine in OpenCode's system config
(`/Library/Application Support/opencode/opencode.json` on macOS, `/etc/opencode/opencode.json` on Linux). It
overrides user and project config, so members only sign in:

```json
{
  "plugins": [
    {
      "package": "github:joe-broadhead/opencode-github#v0.0.0",
      "options": {
        "clientId": "<your organisation's OAuth App client ID>",
        "scopes": ["repo", "read:org"],
        "toolsets": ["context", "repos", "issues", "pull_requests", "actions"],
        "access": "read-only"
      }
    }
  ]
}
```

`clientId` is needed only to use your organisation's own GitHub OAuth App (Device Flow on, no client secret).

- If the organisation restricts OAuth App access, its private repositories stay hidden from device sign-in until an
  owner approves the app. Members can request approval on GitHub under **Settings → Applications → Authorized OAuth
  Apps**.
- An organisation can require approval for fine-grained tokens, or block them. To reach its repositories, members
  choose the organisation as the token's resource owner.

## Troubleshooting

`/github-status` and the `/github` dialog show the rows Connection, Account, Access, Toolsets, Host, Tools, Agents
without default rules, OpenCode and Next step, with `none` where a row is empty. The Connection row and its next step:

| Connection | Next step |
| --- | --- |
| `connected` | Nothing to do. |
| `sign-in required` | Run /connect and choose GitHub (GitHub Enterprise with `host`). |
| `connecting` | GitHub is still starting. Check again in a few seconds. |
| `failed` | OpenCode could not reach GitHub's MCP server. Check your network connection, then reconnect github in /mcps. |
| `disabled` | Turn the github server back on in /mcps. |
| `not configured` | Restart OpenCode. If GitHub is still missing, check that no other plugin removes the MCP server named github. |
| `conflict` | Your OpenCode config or another plugin defines its own MCP server named github, so this plugin left it unchanged. Rename or remove that server to use this plugin's GitHub sign-in. |

A **Rules that never match** row lists `github_api` rules with an upper-case owner or repo name (see
[Permissions](#permissions)), and the next step gives the lower-case form. A **Skills** row such as
`github-pr-review replaced by <path>` means that a skill of yours with the same id, for example in
`~/.config/opencode/skills/`, loads instead of the plugin's; the next step says to rename or move that file. Otherwise, when the connection needs
nothing and agents are listed, the next step reads: "Put the default rules shown by /github-status first in each listed agent's own permissions, in opencode.json or the agent's Markdown file, followed by your top-level rules for GitHub tools." (see [Permissions](#permissions)). With `allowUntestedHost` outside the supported
range, it names the tested OpenCode releases. Otherwise it is "Nothing to do."

Error codes:

| Code | What to do |
| --- | --- |
| `HOST_UNTESTED` | OpenCode is outside the supported range `>=2.2.3 <2.3.0`, so the plugin does not load: there is no `/github-status`, `/github` dialog or status RPC. Update OpenCode or the plugin, or set the option `allowUntestedHost: true` to load it anyway, with a warning in the status. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value; the message names it. Fix that option for the plugin in `opencode.json`. |
| `SKILLS_INVALID` | A skill file the plugin ships is missing or malformed. Reinstall the plugin. |
| `STATUS_UNAVAILABLE` | OpenCode did not report the `github` server's state. Try again in a few seconds; if it persists, restart OpenCode. |
| `SIGN_IN_EXPIRED` | The device code expired before it was entered. Start the sign-in again. |
| `SIGN_IN_CANCELLED` | The sign-in was cancelled on GitHub. Start the sign-in again. |
| `SIGN_IN_CODE_UNKNOWN` | GitHub did not recognise the device code. Start the sign-in again. |
| `SIGN_IN_FAILED` | GitHub ended the device sign-in with another error, named in the message. Start the sign-in again. |
| `SIGN_IN_UNREACHABLE` | github.com could not be reached. Check your network, then start the sign-in again. |
| `SIGN_IN_UNEXPECTED_RESPONSE` | GitHub answered the device sign-in with something unexpected. Start the sign-in again. |
| `DEVICE_FLOW_DISABLED` | The OAuth App has Device Flow turned off. Enable it in the app's settings, or use a fine-grained personal access token. |
| `CLIENT_ID_UNKNOWN` | GitHub does not know the `clientId`. Check the plugin option `clientId`, or use a fine-grained personal access token. |
| `DEVICE_GRANT_REJECTED` | GitHub rejected the device sign-in request. Update the plugin, or use a fine-grained personal access token. |
| `TOKEN_FORMAT` | The pasted text is not a GitHub personal access token. Paste one that starts with `github_pat_` or `ghp_`. |
| `TOKEN_REJECTED` | GitHub rejected the token: invalid, expired or revoked. Create a new token and try again. |
| `TOKEN_FORBIDDEN` | GitHub refused the token (HTTP 403). Check that it is allowed for your account or organization, then try again. |
| `TOKEN_CHECK_TIMEOUT` | GitHub did not answer the token check within 10 seconds. Try again. |
| `TOKEN_CHECK_UNREACHABLE` | api.github.com could not be reached. Check your network, then try again. |
| `TOKEN_CHECK_FAILED` | GitHub could not check the token, or returned no account name. Try again later. |
| `READ_ONLY` | A `github_api` call would change GitHub while `access` is `"read-only"` (or the deprecated `readOnly: true`). Tell the user that this needs the plugin option `access: "all"`; each change then runs without asking, unless they keep `ask-changes`. |
| `AUTH_REQUIRED` | There is no GitHub sign-in to use. Run /connect and choose GitHub (GitHub Enterprise with `host`). |
| `PERMISSION_DENIED` | A rule asks or denies the call. In a script an `ask` cannot be answered; for `github_api` the rule must name the call's own `METHOD /path`. Add or narrow the rule for the session or its agent. |
| `API_INPUT_INVALID` | The `github_api` input does not fit, for example `download` with a method other than GET. Fix the input and call it again. |
| `API_PATH_INVALID` | The path is not a relative API path, has a `.` or `..` segment (also percent-encoded), or percent-encodes a character it can hold as itself. Pass a path such as `/repos/OWNER/REPO/pulls`. |
| `API_GRAPHQL_PATH` | `/graphql` was called through method and path. Pass `{ graphql: { query, variables } }` instead. |
| `API_FILE_OUTSIDE_PROJECT` | A download or upload file is outside the project. Use a path inside the project folder. |
| `API_FILE_EXISTS` | The download file already exists. Choose another path, or pass `download.overwrite: true`. |
| `API_UPLOAD_TOO_LARGE` | The upload file is over 100 MiB. Upload files up to 104857600 bytes. |
| `API_DOWNLOAD_TOO_LARGE` | The download is over 2 GiB; the partial file is removed. Narrow the request, or download it outside OpenCode. |
| `API_UNREACHABLE` | The API host could not be reached. Check your network, then try again. |
| `API_REDIRECT_LOOP` | GitHub redirected more than 5 times. Try again later. |
| `API_REDIRECT_INSECURE` | GitHub redirected to a non-HTTPS address. Try again later. |
| `API_REDIRECT_OFF_HOST` | GitHub redirected a read outside its API. For job logs, call `get_job_logs` with `return_content: true`; for other files, pass `download: { path }`. |
| `API_REDIRECTED` | GitHub redirected a change, which is never followed. The message names the new path: call `github_api` again with that path, so the change is checked for it. |
| `EVENTS_INVALID_INPUT` | The `events_list` input breaks the shared contract, or names another account or source. | Pass only since, cursor, limit (1 to 500), account and source, as the tool's schema describes. |
| `EVENTS_CURSOR_INVALID` | The cursor was not issued by GitHub's `events_list` for this account and its signed-in user. | Pass a cursor from a previous result of the same account, or start again with since. |
| `EVENTS_OWNER_UNKNOWN` | GitHub's `get_me` (or `GET /user`) did not name the signed-in user. | Run /github-status, and sign in again if it shows a problem. |
| `EVENTS_READ_FAILED` | A search or notifications read for `events_list` failed, or its answer was too large to read whole. | Call events_list again with the same cursor; if it keeps failing, run /github-status. |

Each row's own next step is in the message, and [the error codes](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md#errors) give the same set with when each one happens.

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/scripting.md#errors).

Other problems:

| You see | What to do |
| --- | --- |
| `/connect` shows **Sign in required** on your GitHub account ("GitHub rejected the saved sign-in. Sign in again.") | GitHub refused the saved token: it was revoked or expired. Choose the account to sign in again. |
| `UnexpectedStatus: 500` while signing in | OpenCode hides the reason when a pasted token fails its check, or when a device sign-in (with `clientId`) fails before the code is shown. OpenCode's log has it (`opencode debug paths` shows the log folder). Common reasons: the token has the wrong format or GitHub rejected it, or the OAuth App has Device Flow turned off. |
| GitHub tools cannot see an organisation's private repositories | See [Organisation rollout](#organisation-rollout). |
| `github_get_teams` returns `null` | The account is in no team, or the sign-in cannot read organisations. Sign in with `read:org`, or give the token organisation read access. |
| A rule in `permissions` has no effect | Add `"resource": "*"` to it. |

## Uninstall

Sign out first: once the plugin is removed, `opencode auth list` no longer shows the GitHub sign-in, but OpenCode
still stores its token.

1. Sign out: `opencode auth logout GitHub <login>`, where `<login>` is the account's label in `/connect`, your GitHub
   login (with `host`: `opencode auth logout "GitHub Enterprise" <login>`). Without `<login>` it asks you to pick the
   account, which works only in an interactive terminal. Then, on GitHub, delete the token under **Settings →
   Developer settings → Personal access tokens**, or, after a device sign-in, revoke the OAuth App under **Settings →
   Applications → Authorized OAuth Apps**.
2. Run `opencode plugin remove github:joe-broadhead/opencode-github#v0.0.0` (the spec you installed), then `opencode reload`.
3. Data folders: none. The plugin stores nothing of its own.
4. Remove the default rules you copied into agents' own `permissions`.

## Known limits

- **GitHub decides its tools.** The plugin's tool table follows GitHub's hosted server at this release. A tool GitHub adds later runs under `access`, is listed as unknown in `/github-status`, and is not a script method until the plugin classifies it. `npm run drift` compares the table with the server.
- **The token limits what is possible.** The scopes you granted decide what the account's token can do. The default `repo` scope reaches every repository the account can write.
- **Toolsets are a selection.** The default `toolsets` turn on 15 of the 24 toolsets, which show 69 tools. Nine toolsets are off by default, such as `copilot` and `gists`, and GitHub's two issue artifact tools need a feature flag the plugin does not turn on. See the [toolsets table](docs/configuration.md#toolsets).
- **An allow on `github_api` covers writes.** An allow for `github_api` authorises every `api` call, reads included, and also its writes, downloads and uploads. Grant it only to a session that may change GitHub, or set `access` to `"read-only"` for a read-only script.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6 only.** Other releases in `>=2.2.3 <2.3.0` run untested.
- **GitHub's rate limits and error text are GitHub's.** Errors from OpenCode and GitHub pass through unchanged.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md): options,
  toolsets, permission rules and error codes.
- [Scripting](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/scripting.md): calling GitHub's tools
  from scripts, with no model, under a prior allow.
- [Security](https://github.com/joe-broadhead/opencode-github/blob/HEAD/SECURITY.md): network endpoints,
  credentials, untrusted content and reporting a vulnerability.
- [Contributing](https://github.com/joe-broadhead/opencode-github/blob/HEAD/CONTRIBUTING.md): development, checks
  and releases.
- [Changelog](https://github.com/joe-broadhead/opencode-github/blob/HEAD/CHANGELOG.md).
- [Issues](https://github.com/joe-broadhead/opencode-github/issues).

MIT licensed. See [LICENSE](https://github.com/joe-broadhead/opencode-github/blob/HEAD/LICENSE).
