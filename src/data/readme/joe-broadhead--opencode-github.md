# GitHub for OpenCode

Connects OpenCode to GitHub's hosted MCP server, so your agents can read and, if you allow it, change issues, pull
requests, code and more with GitHub's own tools.

Unofficial; not affiliated with GitHub. GitHub is a trademark of GitHub, Inc.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3 and 2.2.4. On any other release the plugin refuses to load (see
  [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md#allowuntestedhost)).
- macOS or Linux.
- A GitHub account.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-github
```

Restart OpenCode. `opencode mcp list` then shows `github  needs authentication` until you sign in.

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

A fine-grained token reaches only the repositories you select, and GitHub enforces that. For writes
(`readOnly: false`), give the token write access to what those tools change, for example Issues or Pull requests.

To sign out, run `opencode auth logout GitHub`, or remove the account in `/connect` → **GitHub**.

## Use

Ask your agent about GitHub, for example "summarise the open pull requests in owner/repo" or "why did CI fail on
pull request 42?". Agents use GitHub's own tools, read-only by default, from these toolsets: repositories and code,
issues, pull requests, labels, Actions runs and job logs, Git trees, discussions, code scanning, secret scanning,
Dependabot and code quality alerts, security advisories, users and organisations. Examples: `github_issue_read`,
`github_pull_request_read`, `github_get_file_contents`, `github_search_code` and `github_get_job_logs`. In Code Mode
they are in the `github` namespace; `github_get_me`, `github_issue_read` and `github_pull_request_read` stay in the
direct tool list. Projects, gists and notifications need extra scopes, so they are off by default.

**`github_api`** covers what GitHub's MCP tools cannot do: auto-merge, creating releases and uploading their assets,
branch protection, rulesets, Actions variables, downloading artifacts and logs to a file, and any GraphQL. It calls
GitHub's REST or GraphQL API with your GitHub sign-in, for example
`{ "method": "GET", "path": "/repos/OWNER/REPO/branches/main/protection" }` or
`{ "graphql": { "query": "query { viewer { login } }" } }`. GET, HEAD and a single GraphQL query read; every other
call changes GitHub, asks first, and is refused while the plugin is read-only. Requests go only to GitHub's API; a
redirect to file storage is followed without your token. `download: { path }` saves a response to a file in the
project, and `upload: { path, contentType }` sends a project file as a release asset; both ask first.

Three skills come with it:

- `github-pr-review`: review a pull request from its description, changed files, diff, earlier reviews and checks.
- `github-issue-triage`: find and read issues, spot duplicates, and propose labels, priority and next steps.
- `github-code-research`: search repositories, read files at a branch or commit, and follow the history, citing
  files and lines.

Each skill reports findings and changes nothing on GitHub unless you ask.

**Scripts.** A script or a cron job can call GitHub's read tools and `github_api`'s reads with no model, through
`opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own.
Scripts can never change anything on GitHub:

```sh
opencode api post /api/rpc/github.platform.tools/pull_request_read \
  -d '{"input":{"sessionID":"ses_…","input":{"method":"get","owner":"OWNER","repo":"REPO","pullNumber":42}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/scripting.md).

**Status.** `/github` in the TUI, or **GitHub: Status** in the command palette, opens a dialog with the state, the
account and access, the tools (with the names of any the plugin does not know yet), the agents that miss the default
rules with the rules to paste, the OpenCode check and the next step. `r` refreshes it and `Esc` closes it. It also
refreshes when the sign-in, an account, the `github` server or the agents change. `/github-status` posts the same
status into the session as a note, without starting a model turn.

## Permissions

The plugin adds default rules to every agent that has OpenCode's base "allow everything" rule:

- Known GitHub read tools run without a prompt, also in `opencode run`.
- Writes (only present with `readOnly: false`) and GitHub tools the plugin does not know yet ask first. In
  `opencode run`, nobody can answer, so they are denied.

Your own rules and saved approvals still win:

- A rule in the top-level `permissions` of your config overrides the defaults. For example, this lets
  `github_create_pull_request` run without a prompt, and blocks merges:

  ```json
  {
    "permissions": [
      { "action": "github_create_pull_request", "resource": "*", "effect": "allow" },
      { "action": "github_merge_pull_request", "resource": "*", "effect": "deny" }
    ]
  }
  ```

  Every rule needs a `"resource"`. OpenCode skips a rule without it.
- `github_api` rules match `METHOD /path`, and `*` matches any text, slashes included. This lets the agent change one
  owner's repositories without a prompt, and never delete anything:

  ```json
  {
    "permissions": [
      { "action": "github_api", "resource": "POST /repos/OWNER/*", "effect": "allow" },
      { "action": "github_api", "resource": "DELETE *", "effect": "deny" }
    ]
  }
  ```

  A GraphQL change is `POST /graphql`, and saving a download is `download <file>`. A deny on
  `{ "action": "github_api", "resource": "*" }` removes the tool from the agent.
- Choosing **Always allow** at a prompt saves the approval for the whole project, for every agent, including Plan.
- Stricter agents stay strict: Plan keeps its own rules, and Explore still cannot run GitHub tools.

**Agents defined only in your config miss the defaults.** OpenCode creates them after plugins load, so they run
GitHub tools, including writes, without asking. `/github-status` and the `/github` dialog name these agents and show
the rules to copy. Put them **first** in **that agent's own** `permissions` list, in `opencode.json` or in the
agent's Markdown file, followed by your top-level rules for `github_` tools, so yours keep winning. Do not put these rules in the top-level `permissions`: that would weaken Explore
and any other agent that denies by default.

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
  "plugins": [{ "package": "@joe-broadhead/opencode-github", "options": { "toolsets": ["context", "repos", "issues"] } }]
}
```

The options are `toolsets`, `readOnly`, `lockdown`, `unknownTools`, `clientId`, `scopes`, `allowUntestedHost` and
`host`.

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
      "package": "@joe-broadhead/opencode-github",
      "options": {
        "clientId": "<your organisation's OAuth App client ID>",
        "scopes": ["repo", "read:org"],
        "toolsets": ["context", "repos", "issues", "pull_requests", "actions"],
        "readOnly": true
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
without default rules, OpenCode and Next step. The Connection row and its next step:

| Connection | Next step |
| --- | --- |
| `connected` | Nothing to do. |
| `sign-in required` | Run /connect and choose GitHub (GitHub Enterprise with `host`). |
| `connecting` | GitHub is still starting. Check again in a few seconds. |
| `failed` | OpenCode could not reach GitHub's MCP server. Check your network connection, then reconnect github in /mcps. |
| `disabled` | Turn the github server back on in /mcps. |
| `not configured` | Restart OpenCode. If GitHub is still missing, check that no other plugin removes the MCP server named github. |
| `conflict` | Your OpenCode config or another plugin defines its own MCP server named github, so this plugin left it unchanged. Rename or remove that server to use this plugin's GitHub sign-in. |

Error codes:

| Code | What to do |
| --- | --- |
| `HOST_UNTESTED` | OpenCode is outside `>=2.2.3 <2.3.0`. Update OpenCode or the plugin, or set the option `allowUntestedHost: true` to load it anyway, with a warning in the status. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value; the message names it. Fix that option for the plugin in `opencode.json`. |
| `SIGN_IN_…`, `TOKEN_…`, `DEVICE_…`, `CLIENT_ID_UNKNOWN` | Sign-in failed. The message ends with the next step; [the error codes](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md#errors) list them all. |

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

1. Sign out: `opencode auth logout GitHub`.
2. Run `opencode plugin remove @joe-broadhead/opencode-github`, and remove any default rules you copied into agents.
3. On GitHub, delete the token under **Settings → Developer settings → Personal access tokens**, or, after a device
   sign-in, revoke the OAuth App under **Settings → Applications → Authorized OAuth Apps**.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/configuration.md): options,
  toolsets, permission rules and error codes.
- [Scripting](https://github.com/joe-broadhead/opencode-github/blob/HEAD/docs/scripting.md): calling GitHub's reads
  from scripts, with no model.
- [Security](https://github.com/joe-broadhead/opencode-github/blob/HEAD/SECURITY.md): network endpoints,
  credentials, untrusted content and reporting a vulnerability.
- [Contributing](https://github.com/joe-broadhead/opencode-github/blob/HEAD/CONTRIBUTING.md): development, checks
  and releases.
- [Changelog](https://github.com/joe-broadhead/opencode-github/blob/HEAD/CHANGELOG.md).
- [Issues](https://github.com/joe-broadhead/opencode-github/issues).

MIT licensed. See [LICENSE](https://github.com/joe-broadhead/opencode-github/blob/HEAD/LICENSE).
