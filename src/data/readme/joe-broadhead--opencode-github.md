# GitHub for OpenCode

Connects OpenCode to GitHub's hosted MCP server, so your agents can read and, if you allow it, change issues, pull
requests, code and more with GitHub's own tools. `github_api` covers what those tools cannot do, and `events_list`
feeds a consumer's collector.

Unofficial; not affiliated with GitHub. GitHub is a trademark of GitHub, Inc.; this unofficial plugin is not endorsed
by them.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Outside that range the plugin does not load, unless you set
  [`allowUntestedHost`](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/configuration.md#allowuntestedhost).
- macOS or Linux.
- A GitHub account.

## Install

Install from a release: `opencode plugin add github:we-the-rebel-alliance/github-plugin#v<version>`, then run
`opencode reload`.

The first release on plugin-contract is `v0.0.0` (phase 4b). Until it is cut, there is no release to install:
the repository carries no `dist/`, and OpenCode runs no build when it installs from Git.

## Sign in

After installing, run `/github-status`: it shows `Connection: sign-in required` until you sign in. Run `/connect`
and choose **GitHub**, then **Add account**, or run `opencode auth login GitHub`. A fine-grained
personal access token is enough; organisations can set `clientId` to offer a device sign-in with their own OAuth App
or GitHub App. The permissions a fine-grained token needs, and the full sign-in options, are in
[Configuration](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/configuration.md#fine-grained-token-permissions).

## Use

GitHub's tools are `github_<tool>`: repositories and code, issues, pull requests, labels, Actions runs and job logs,
discussions, code and secret scanning, Dependabot and code quality alerts, security advisories, users and
organisations. In Code Mode they are in the `github` namespace; `search({ namespace: "github", query })` finds a
tool's parameters. Nothing is pinned, so only a tool the model asks for is shown.

`github_api` calls GitHub's REST or GraphQL API with the same sign-in, for auto-merge, releases and their assets,
branch protection, rulesets, Actions variables, artifacts, or any GraphQL.

Three skills come with it:

- `github-pr-review`: review a pull request from its diff, reviews and checks, and find why CI failed.
- `github-issue-triage`: find and read issues, spot duplicates, and propose labels and priority.
- `github-code-research`: search repositories, read files at a ref, and follow the history with permalinks.

Each reports findings and changes nothing on GitHub unless you ask.

**Events list.** `github_events_list` is the plugin's source `github.activity` under the shared source contract: the
changes to issues and pull requests you are involved in, your commits, and other notifications, as normalised events
oldest first, for a consumer's collector and other scripts. It only reads, with GET requests, and never asks. See
[Events list](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/configuration.md#events-list).

## Permissions

The `access` option decides what the generated default rules allow: `"all"` (the default) runs every tool,
`"ask-changes"` asks before every change, and `"read-only"` refuses changes. The rules go directly after each built-in
agent's base `* * allow` rule; user rules and saved approvals keep winning. `/github-status` shows the block for an
agent defined only in your config, and names one that has no default rules.

The full block for each value, and how to narrow one tool or one `github_api` resource, are in
[Permissions](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/configuration.md#permissions).

## Scripts

A script calls GitHub's tools and `github_api` with no model through the tools RPC, `github.platform.tools`. A call
runs under the session's and agent's rules; only an explicit `allow` runs, and an `ask` is refused because a script
cannot answer a prompt.

```sh
opencode api post /api/rpc/github.platform.tools/pull_request_read -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"method":"get","owner":"OWNER","repo":"REPO","pullNumber":42}}}'
```

[Scripting](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/scripting.md) has the rest,
including the session a script must create.

## Docs

- [Configuration](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/configuration.md): options,
  toolsets, permissions, `github_api`, events, the Enterprise host, errors.
- [Scripting](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/scripting.md): the tools RPC.
- [Architecture](https://github.com/we-the-rebel-alliance/github-plugin/blob/master/docs/architecture.md): how the
  parts fit.

Issues and source: [we-the-rebel-alliance/github-plugin](https://github.com/we-the-rebel-alliance/github-plugin).
