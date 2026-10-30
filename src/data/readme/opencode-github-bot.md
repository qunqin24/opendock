# opencode-github-bot

OpenCode v2 GitHub bot: composite action + server plugin for PR review and issue fix.

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
      - uses: link-seek/opencode-github-bot@v0.1.0
        with:
          model: ${{ vars.OPENCODE_REVIEW_MODEL }}
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
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-github-bot"]
}
```

Registers tools: `gh-pr-comment`, `gh-pr-review`, `gh-pr-create`. Skills: `pr-review`, `issue-fix`.

## Status

MVP (v0.1.0): PR review only. Issue-fix in progress.