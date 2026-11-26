# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so an agent can find, read and cite issues,
projects, cycles, initiatives, documents and comments, and change them within the access you allow. It serves several
Linear workspaces at once: one account alias per workspace, each with its own sign-in.

OpenCode holds the credentials in its MCP servers; this plugin holds no token. It adds two reads of its own on top of
Linear's tools: the activity feed a collector follows and the assigned-issues snapshot a page renders.

Unofficial; not affiliated with Linear. Linear is a trademark of Linear Orbit, Inc.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Outside the range the plugin refuses to start, unless you set
  `allowUntestedHost`.
- Node 24 for the development checks; OpenCode provides the runtime.
- A Linear account.

## Install

Install from a release tag:

```sh
opencode plugin add github:we-the-rebel-alliance/linear-plugin#v0.0.0
opencode reload
```

`v0.0.0` is the first release on plugin-contract v0: it registers one Linear MCP server per alias and ships the YAML
skills. Do not install an older `v0.x` tag: those name the previous plugin.

## Sign in

The plugin adds one Linear MCP server per account alias:

| Alias | MCP server |
|---|---|
| `default` (no `accounts` option) | `linear` |
| `work` | `linear-work` |
| `personal` | `linear-personal` |

Each server has its own OAuth, so two aliases are two independent Linear workspaces. Sign in once per alias: run
`/connect` and choose the alias's server, or from a terminal run `opencode mcp auth linear-work`. To change a server's
workspace, sign it out (`opencode mcp logout linear-work`) and sign in again.

Configure the aliases in `opencode.json`:

```json
{ "accounts": { "work": {}, "personal": {} } }
```

An alias has no profile fields: which workspace it reads is decided by the sign-in. Every method that takes an account
accepts `account: "work"`; with two aliases and no account, a call is refused with `ACCOUNT_REQUIRED`.

## Access

`access` is `all` (the default), `ask-changes` or `read-only`. Every read runs under every level.

| Value | What runs |
| --- | --- |
| `all` | Every method runs without asking, reads and changes alike. |
| `ask-changes` | Reads run; every change asks first. |
| `read-only` | Reads run; every change is denied. |

The rules cover this plugin's own methods and Linear's MCP tools, one alias at a time: a rule for `work` never reaches
`personal`'s tools. They are inserted after each agent's base allow, and `status` names any agent that lacks them.
Each of Linear's 78 tools has its own class, and one `mcp:*` write rule comes before them, so a tool Linear renames or
adds is denied at `read-only` and asks at `ask-changes` instead of reaching OpenCode's base allow-all.

The plugin's own methods are reads. The changes are Linear's MCP tools, which OpenCode runs under the same access
rules; the plugin never proxies them and holds no credential.

## Skills

The plugin ships two skills and registers them when it starts: `linear`, for finding, reading and citing work, and
`linear-write`, for a change. OpenCode does not discover a plugin's `skills/` folder on its own, so the plugin adds
both itself; they are listed with the host's other skills once the plugin loads. The frontmatter is parsed as YAML, so
a `>` or `|` description registers its text, not the marker. A malformed skill fails setup with `SCHEMA_VIOLATION`,
so a broken package is visible immediately.

## Options

| Option | Default | Meaning |
|---|---|---|
| `access` | `"all"` | `all`, `ask-changes` or `read-only`; the ceiling for every method. |
| `accounts` | one `default` | One empty profile per alias; the alias's sign-in decides the workspace. |
| `allowUntestedHost` | `false` | Start outside `>=2.4.1 <2.5.0`. Leave it `false`. |

[Configuration](docs/configuration.md) has the schema and examples.

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | `get_workspace`, `get_user` |
| `events_list` | read | optional | `get_workspace`, `get_user`, `list_issues`, `get_notifications` |
| `issues` | read | optional | `list_issues` |
| `mcp:*` | write | optional | — |
| `mcp:create_attachment` | write | optional | `create_attachment` |
| `mcp:create_attachment_from_upload` | write | optional | `create_attachment_from_upload` |
| `mcp:create_initiative_label` | write | optional | `create_initiative_label` |
| `mcp:create_issue_label` | write | optional | `create_issue_label` |
| `mcp:delete_attachment` | delete | optional | `delete_attachment` |
| `mcp:delete_comment` | delete | optional | `delete_comment` |
| `mcp:delete_diff_comment` | delete | optional | `delete_diff_comment` |
| `mcp:delete_status_update` | delete | optional | `delete_status_update` |
| `mcp:extract_images` | read | optional | `extract_images` |
| `mcp:get_agent_skill` | read | optional | `get_agent_skill` |
| `mcp:get_attachment` | read | optional | `get_attachment` |
| `mcp:get_diff` | read | optional | `get_diff` |
| `mcp:get_diff_threads` | read | optional | `get_diff_threads` |
| `mcp:get_document` | read | optional | `get_document` |
| `mcp:get_initiative` | read | optional | `get_initiative` |
| `mcp:get_issue` | read | optional | `get_issue` |
| `mcp:get_issue_status` | read | optional | `get_issue_status` |
| `mcp:get_milestone` | read | optional | `get_milestone` |
| `mcp:get_notifications` | read | optional | `get_notifications` |
| `mcp:get_project` | read | optional | `get_project` |
| `mcp:get_release` | read | optional | `get_release` |
| `mcp:get_release_note` | read | optional | `get_release_note` |
| `mcp:get_status_updates` | read | optional | `get_status_updates` |
| `mcp:get_team` | read | optional | `get_team` |
| `mcp:get_template` | read | optional | `get_template` |
| `mcp:get_triage_responsibility` | read | optional | `get_triage_responsibility` |
| `mcp:get_user` | read | optional | `get_user` |
| `mcp:get_workspace` | read | optional | `get_workspace` |
| `mcp:list_agent_skills` | read | optional | `list_agent_skills` |
| `mcp:list_comments` | read | optional | `list_comments` |
| `mcp:list_custom_views` | read | optional | `list_custom_views` |
| `mcp:list_cycles` | read | optional | `list_cycles` |
| `mcp:list_diffs` | read | optional | `list_diffs` |
| `mcp:list_documents` | read | optional | `list_documents` |
| `mcp:list_initiative_labels` | read | optional | `list_initiative_labels` |
| `mcp:list_initiatives` | read | optional | `list_initiatives` |
| `mcp:list_issue_labels` | read | optional | `list_issue_labels` |
| `mcp:list_issue_statuses` | read | optional | `list_issue_statuses` |
| `mcp:list_issues` | read | optional | `list_issues` |
| `mcp:list_milestones` | read | optional | `list_milestones` |
| `mcp:list_project_labels` | read | optional | `list_project_labels` |
| `mcp:list_projects` | read | optional | `list_projects` |
| `mcp:list_release_notes` | read | optional | `list_release_notes` |
| `mcp:list_release_pipelines` | read | optional | `list_release_pipelines` |
| `mcp:list_releases` | read | optional | `list_releases` |
| `mcp:list_teams` | read | optional | `list_teams` |
| `mcp:list_templates` | read | optional | `list_templates` |
| `mcp:list_users` | read | optional | `list_users` |
| `mcp:mark_notification` | write | optional | `mark_notification` |
| `mcp:merge_diff` | write | optional | `merge_diff` |
| `mcp:prepare_attachment_upload` | write | optional | `prepare_attachment_upload` |
| `mcp:prepare_file_upload` | write | optional | `prepare_file_upload` |
| `mcp:resolve_diff_thread` | write | optional | `resolve_diff_thread` |
| `mcp:restore_initiative_label` | write | optional | `restore_initiative_label` |
| `mcp:restore_issue_label` | write | optional | `restore_issue_label` |
| `mcp:restore_project_label` | write | optional | `restore_project_label` |
| `mcp:retire_initiative_label` | write | optional | `retire_initiative_label` |
| `mcp:retire_issue_label` | write | optional | `retire_issue_label` |
| `mcp:retire_project_label` | write | optional | `retire_project_label` |
| `mcp:save_comment` | send | optional | `save_comment` |
| `mcp:save_diff_comment` | send | optional | `save_diff_comment` |
| `mcp:save_document` | write | optional | `save_document` |
| `mcp:save_initiative` | write | optional | `save_initiative` |
| `mcp:save_initiative_label` | write | optional | `save_initiative_label` |
| `mcp:save_issue` | write | optional | `save_issue` |
| `mcp:save_issue_label` | write | optional | `save_issue_label` |
| `mcp:save_milestone` | write | optional | `save_milestone` |
| `mcp:save_project` | write | optional | `save_project` |
| `mcp:save_project_label` | write | optional | `save_project_label` |
| `mcp:save_release` | write | optional | `save_release` |
| `mcp:save_release_note` | write | optional | `save_release_note` |
| `mcp:save_status_update` | send | optional | `save_status_update` |
| `mcp:search_documentation` | read | optional | `search_documentation` |
| `mcp:share_issue` | share | optional | `share_issue` |
| `mcp:submit_diff_review` | send | optional | `submit_diff_review` |
| `mcp:unshare_issue` | share | optional | `unshare_issue` |
| `mcp:update_diff` | write | optional | `update_diff` |
| `mcp:whoami` | read | optional | `whoami` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `linear.activity` | events | `issue` | `events_list` | free |
| `linear.issues` | snapshot | `list` | `issues` | free |

### Actions

None.

### Bus events

`rpc.linear.status`, `rpc.linear.account`
<!-- /generated:capabilities -->

## Errors

<!-- generated:errors -->
| Code | Meaning |
|---|---|
| `NEEDS_SIGN_IN` | the account is not signed in |
| `SCOPE_MISSING` | the call needs a scope the person has not confirmed |
| `ACCOUNT_REQUIRED` | the plugin serves several accounts and the call names none |
| `ACCOUNT_UNKNOWN` | the call names an alias the plugin does not serve |
| `ACCOUNT_MISMATCH` | the item belongs to another account |
| `CURSOR_INVALID` | the cursor is malformed, or belongs to another source, account or scope |
| `CURSOR_EXPIRED` | the provider no longer keeps the history the cursor names |
| `RATE_LIMITED` | the provider asked the plugin to slow down |
| `BUDGET_EXCEEDED` | the read would cost more than the person allows |
| `SOURCE_DISABLED` | the person turned this source or action off |
| `TOO_LARGE` | the answer is larger than the source's maxBytes |
| `INPUT_INVALID` | the input does not match the method's schema |
| `SOURCE_UNKNOWN` | the plugin declares no such source |
| `SCHEMA_VIOLATION` | an answer does not keep the contract's shape |
| `PERMISSION_DENIED` | the person's grant does not cover the call |
| `PLAN_INVALID` | the plan is missing, or belongs to another method |
| `PLAN_USED` | the plan was already used by an earlier commit |
| `GRANT_INVALID` | the action grant did not verify, or was already spent |
| `HOST_UNTESTED` | OpenCode is outside the plugin's tested range |
| `OPTIONS_INVALID` | the plugin's options do not match their schema |
| `UNAVAILABLE` | the provider could not be reached |
<!-- /generated:errors -->

## Troubleshooting

- **No Linear tools, or `NEEDS_SIGN_IN`.** Sign in to the alias's server: `/connect`, or `opencode mcp auth linear-work`.
  Then read `tools.linear.status`; it reports each alias as `ready`, `needs_sign_in` or `error`.
- **`ACCOUNT_REQUIRED`.** Several aliases are configured: pass `account: "work"` or the alias the options name.
  **`ACCOUNT_UNKNOWN`.** The alias is not in `options.accounts`.
- **`CURSOR_INVALID`.** The cursor was issued for another plugin, source, account or scope. Read again without it;
  never reuse another account's cursor.
- **`HOST_UNTESTED`.** OpenCode is outside `>=2.4.1 <2.5.0`. Install 2.4.1, or set `allowUntestedHost` knowingly.
- **A change did not run.** `read-only` denies every change and `ask-changes` asks first; the plugin itself only reads.
  Check the `access` option and the permission prompt's answer.

## Docs

- [Capabilities](docs/capabilities.md)
- [Configuration](docs/configuration.md)
- [Accounts](docs/accounts.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract)
