# copilot-second-opinion

[![npm version](https://img.shields.io/npm/v/copilot-second-opinion.svg)](https://www.npmjs.com/package/copilot-second-opinion)
[![npm downloads](https://img.shields.io/npm/dm/copilot-second-opinion.svg)](https://www.npmjs.com/package/copilot-second-opinion)
[![license](https://img.shields.io/npm/l/copilot-second-opinion.svg)](./LICENSE)

OpenCode plugin + MCP server + agent skill that runs the full GitHub Copilot PR review loop — request review, wait deterministically, triage every comment, push fixes, reply, resolve, repeat, and merge with safety gates.

## What it does

- **`request_copilot_review`** — POSTs Copilot as a reviewer and **verifies** the request took effect by re-reading `requested_reviewers`. The built-in `github_request_copilot_review` returns HTTP 200 even when Copilot isn't actually added; this one catches the silent-fail.
- **`wait_for_copilot_review`** — blocks via `gh run watch` on the Copilot Actions workflow run for the head SHA. No blind polling. Falls back to REST polling for older repos.
- **`get_copilot_threads`** / **`reply_to_review_comment`** / **`resolve_review_thread`** — full thread lifecycle with both the GraphQL `thread_id` and the REST `comment_id` returned in one shot.
- **`enable_copilot_auto_review`** — idempotently creates the repo ruleset that auto-requests Copilot on new PRs.
- **`safe_merge_pr`** — gated merge: blocks unless Copilot has reviewed the current HEAD, all threads are resolved, and all checks are green. Replaces `github_merge_pull_request`, which does none of that.
- **`copilot-second-opinion` skill** — the playbook the agent loads to drive the loop. Auto-discoverable on phrases like "address the Copilot comments" or "Copilot didn't re-review after my push".

## Why

OpenCode's built-in GitHub MCP tools have two footguns this package fixes:

1. **`github_request_copilot_review` silently no-ops** when Copilot code review isn't enabled on the repo. GitHub returns HTTP 200, so the agent thinks the request worked and waits forever for a review that's never coming. Across one user's session history (~66k tool calls), the prefixed MCP tools from this package were called zero times because the agent kept finding the broken built-in first — the skill exists in part to shadow it.
2. **`github_merge_pull_request` does zero gating.** It will happily merge a PR with failed CI, unresolved Copilot threads, or a Copilot review that's only for the previous HEAD.

## Install

```bash
opencode plugin copilot-second-opinion -g
```

This installs the package globally and, on next session start, the plugin:

1. Symlinks the skill into `~/.config/opencode/skills/copilot-second-opinion/SKILL.md`.
2. Registers the MCP server **in-memory** via the `config()` hook (no `opencode.json` mutation — uninstalling the plugin un-registers it automatically).
3. Disables the built-in `github_merge_pull_request` so `safe_merge_pr` is the only merge path.

Or manually:

```bash
npm install -g copilot-second-opinion
```

Then add `"copilot-second-opinion"` to the `plugin` array in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["copilot-second-opinion"]
}
```

### Opt out of the in-memory config injection

Some users want full control over their `opencode.json`. Set:

```bash
export OPENCODE_COPILOT_REVIEW_NO_AUTOCONFIG=1
```

The plugin will still install the skill file, but will skip MCP registration and the tools filter. Add them manually to `opencode.json` instead (snippet in the [manual section](#manual-install-claude-code-or-custom-mcp-hosts)).

### Manual install (Claude Code or custom MCP hosts)

```bash
git clone https://github.com/Adamkadaban/copilot-second-opinion
cd copilot-second-opinion
./install.sh
```

The bash installer copies the skill into the first existing of `~/.config/opencode/skills/`, `~/.claude/skills/`, or `~/.opencode/skill/`, runs `npm install` for the MCP server, and prints the exact config snippet to paste into your MCP host.

## Requirements

- Node 18+
- [`gh`](https://cli.github.com/) CLI authenticated (`gh auth status` returns a green check)
- Copilot code review enabled on the target repo. If it isn't, the first `request_copilot_review` call will return `{requested: false, hint: "..."}` and the skill will offer to enable it via repository ruleset.

## Usage

Inside an OpenCode session, the skill is auto-discoverable. Any of these will trigger it:

> get a second opinion from Copilot on PR 42
> address the Copilot comments on this PR
> Copilot didn't re-review after my last push
> merge PR 42 if Copilot is happy and checks pass

The agent will load the skill, run the loop, and use `safe_merge_pr` for the final merge.

## Tools

| Tool | Purpose |
|---|---|
| `request_copilot_review` | POST Copilot as a reviewer + **verify** the request took effect |
| `check_copilot_review_status` | Non-blocking snapshot: `done` / `pending` / `absent` for the current HEAD |
| `wait_for_copilot_review` | Blocking wait via `gh run watch`, with REST-poll fallback for older repos |
| `get_copilot_threads` | List unresolved threads with both `thread_id` and `root_comment_id` |
| `reply_to_review_comment` | Post a reply to a specific review comment |
| `resolve_review_thread` | Resolve a thread via GraphQL `resolveReviewThread` |
| `enable_copilot_auto_review` | Create/update the repo ruleset with `copilot_code_review` (idempotent) |
| `safe_merge_pr` | Gated merge — blocks unless review, threads, and checks all pass |

Each tool has its own server-side timeout budget (30s–120s) so a hung `gh` call can't block the full session.

## Development

```bash
git clone https://github.com/Adamkadaban/copilot-second-opinion
cd copilot-second-opinion
npm install
npm run check         # smoke-test plugin import
npm run mcp:smoke     # smoke-test MCP server initialize
```

For live development against your OpenCode session:

```bash
cd ~/.config/opencode
npm link /path/to/copilot-second-opinion
```

Then add `"copilot-second-opinion"` to your `plugin` array in `opencode.json`.

## Releasing

Releases are automated via GitHub Actions. To cut a new release:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) sanity-checks the plugin + MCP server, publishes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements) via Trusted Publishing, and creates a GitHub Release with auto-generated notes.

## License

[MIT](./LICENSE)
