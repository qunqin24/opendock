# opencode-github-bot

OpenCode v2 GitHub bot: composite action + server plugin for PR review, issue fix, and pm-intake triage.

Built on OpenCode v2's plugin system (`@opencode/plugin`). Does not modify OpenCode core.

## Usage

```yaml
# .github/workflows/opencode.yml
name: opencode
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  issues:
    types: [assigned]

jobs:
  bot:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: link-seek/opencode-github-bot@v0.2.9
        with:
          model: ${{ vars.OPENCODE_MODEL }}
          github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
          mode: review
          pr-number: ${{ github.event.pull_request.number }}
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
```

## Plugin

Add to `opencode.json(c)`:

```jsonc
{
  "": "https://opencode.ai/config.json",
  "plugins": ["opencode-github-bot"]
}
```

Registers tools: `gh-pr-comment`, `gh-pr-review`, `finish-review`, `finish-fix`. Skills: `pr-review`, `issue-fix`.

## Intake mode (pm triage)

```yaml
- uses: link-seek/opencode-github-bot@v0.3.0
  with:
    model: ${{ vars.OPENCODE_MODEL }}
    github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
    mode: intake
    issue-number: ${{ github.event.issue.number }}
    recall-mode: keyword # off | keyword | cf | custom
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }} # Jev via OpenCode gateway
```

Requires `.github/repo-role.yml` (what this repo owns, natural language). See [#9](https://github.com/link-seek/opencode-github-bot/issues/9) for routing rules and thresholds.

## Status

v0.3.0: + pm-intake (Jev 6-question triage, docs-aligned, strict CF child tokens). Trusted Publishing (OIDC) enabled.
