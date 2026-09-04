# @alexeyco/tea

[Forgejo](https://forgejo.org) / [Gitea](https://gitea.io) `tea` skill for coding agents — works in both [pi](https://pi.dev) and [OpenCode](https://opencode.ai).

Teaches the agent to drive the [`tea`](https://gitea.com/gitea/tea) CLI: browse repos, issues, pulls, releases, branches, comments and notifications. Read-only by default; anything state-changing requires explicit confirmation.

<p align="center">
  <img src="https://raw.githubusercontent.com/alexeyco/tea/master/docs/gallery/terminal.png" alt="@alexeyco/tea demo" width="640">
</p>

## Install

pi:

```sh
pi install npm:@alexeyco/tea          # latest
pi install git:github.com/alexeyco/tea@v0.1.0
```

OpenCode:

```sh
opencode2 plugin add @alexeyco/tea    # npm
opencode2 plugin add github:alexeyco/tea
```

Without a plugin, point `skills` in `opencode.json` at the package, or copy
`skills/tea/` into `.opencode/skills/`:

```json
{ "skills": ["node_modules/@alexeyco/tea/skills/tea"] }
```

Requires the `tea` CLI and a configured login (`tea login add`).

## Usage

Ask in natural language; the agent loads the skill when relevant:

- “List open issues in `owner/repo`, most recent first.”
- “Summarize PR #42, including the comments.”
- “What’s in the latest release of `owner/repo`?”
- “Any unread notifications?”

State-changing actions (commenting, creating issues, merging) are proposed
as exact commands and run only after you confirm.

## See also

- [CONTRIBUTING.md](CONTRIBUTING.md) — development and release workflow.
