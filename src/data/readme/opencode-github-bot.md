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
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }} # Jev key (gateway + Zen)
    JEV_MODEL: ${{ vars.JEV_MODEL }} # JSON {"cli","apiBase"}, e.g. {"cli":"jev-1.13-free","apiBase":"https://opencode.ai/inference/systemone/v1/systemone"}
```

Requires `.github/repo-role.yml` (what this repo owns, natural language). See [#9](https://github.com/link-seek/opencode-github-bot/issues/9) for routing rules and thresholds.

## Split mode (pm split)

Two-phase, human-gated. Only `needs-split` issues (see #9) enter; everything else is skipped without noise.

```yaml
# Phase 1: draft (manual dispatch, or your own trigger on needs-split)
- uses: link-seek/opencode-github-bot@v0.3.0
  with:
    model: ${{ vars.OPENCODE_MODEL }}
    github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
    mode: split-plan
    issue-number: ${{ github.event.inputs.issue-number }}
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
# -> validates entry, plans via pm-split skill, posts draft table +
#    hidden <!--pm-split-plan JSON-->, labels split-proposed (or a reject reason)

# Phase 2: create (OWNER/MEMBER comments "approve split" on the issue)
- uses: link-seek/opencode-github-bot@v0.3.0
  with:
    model: ${{ vars.OPENCODE_MODEL }}
    github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
    mode: split-apply
    issue-number: ${{ github.event.issue.number }}
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
# -> re-validates the approved plan, creates sub-issues (title "[Part i/N] ...",
#    body with 背景/改动点/验收标准/依赖 + "Part of #parent"), appends a
#    "## Split into" tasklist to the parent, labels split-applied.
```

Rules (enforced in code, not just prompting): one sub-issue = one finish-fix run
(≤3 files); max 5 subs, else the planner must reject; no dependency cycles;
apply is idempotent (same-title open children are reused). See [#10](https://github.com/link-seek/opencode-github-bot/issues/10).

## Status

v0.3.0: + pm-intake (Jev 6-question triage, docs-aligned, strict CF child tokens). Trusted Publishing (OIDC) enabled.
