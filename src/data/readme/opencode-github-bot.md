# opencode-github-bot

OpenCode v2 GitHub bot: composite action + server plugin for PR review, issue fix, and pm-intake triage.

Built on OpenCode v2's plugin system (`@opencode/plugin`). Does not modify OpenCode core.

## Usage

The only supported dependency is the npm package `opencode-github-bot`. Generated workflows are
self-contained: they check out the consumer repo, install the package from npm, and run the
bundled composite action from `node_modules`. No cross-repo `uses:` is required.

```yaml
# .github/workflows/opencode.yml
name: opencode
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  issues:
    types: [assigned]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  bot:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Install opencode-github-bot
        run: npm install "opencode-github-bot@v0.6.0" --no-audit --no-fund

      - name: Run OpenCode bot
        uses: ./node_modules/opencode-github-bot
        with:
          # Code comes from the npm install above (pinned); do NOT re-install.
          package-source: repo
          mode: review
          model: ${{ vars.OPENCODE_MODEL }}
          github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
          pr-number: ${{ github.event.pull_request.number }}
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
```

Upgrading: `npx opencode-github-bot init upgrade vX.Y.Z` (rewrites every version reference in the repo).

## One-click setup

```bash
npx opencode-github-bot init
```

Detects repo type, writes `.github/workflows/opencode.yml`, lists any missing secrets/vars (`AGENT_GITHUB_TOKEN`, `OPENCODE_API_KEY`, `OPENCODE_MODEL`) instead of skipping them, and reminds about `.github/repo-role.yml` (needed for intake triage; review/fix work without it).
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
- uses: ./node_modules/opencode-github-bot
  with:
    # Code comes from the npm install above (pinned); do NOT re-install.
    package-source: repo
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
- uses: ./node_modules/opencode-github-bot
  with:
    # Code comes from the npm install above (pinned); do NOT re-install.
    package-source: repo
    model: ${{ vars.OPENCODE_MODEL }}
    github-token: ${{ secrets.AGENT_GITHUB_TOKEN }}
    mode: split-plan
    issue-number: ${{ github.event.inputs.issue-number }}
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
# -> validates entry, plans via pm-split skill, posts draft table +
#    hidden <!--pm-split-plan JSON-->, labels split-proposed (or a reject reason)

# Phase 2: create (OWNER/MEMBER comments "approve split" on the issue)
- uses: ./node_modules/opencode-github-bot
  with:
    # Code comes from the npm install above (pinned); do NOT re-install.
    package-source: repo
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

## 任务分流 (routing, not "dual-key")

按任务形态分流，短交互与长批处理互不挡路：
- fast lane：Jev intake、llm-judge、探针（单次 API 调用）。撞 429 立刻切 bulk lane 重试一次，10 分钟任务不等 quota 窗口。
- bulk lane：review / fix-issue / split-plan 等 agent 长任务、smoke、e2e。有 bulk key 时只用 bulk（撞限则等，不回切 fast）；无 bulk 时回落 fast（单 key 老环境不断）。

lane 到 key 的映射放 env（`OPENCODE_API_KEY` = fast，`OPENCODE_API_KEY_BULK` = bulk，`KEY_FAST` / `KEY_BULK` 可选覆盖），路由策略放代码（`scripts/keys.ts` 的 `keysFor(env, "short"|"long")`）。加订阅、轮换 key、以后按模型/按 endpoint 分，都只改 env 不改代码。

## Tracing (Laminar)

Optional: bot runs can push traces to [Laminar](https://laminar.sh) for visibility into multi-step agent runs.

- Secret: `LMNR_PROJECT_API_KEY` (org-level). Set it in repo/org secrets; missing key => tracing is silently skipped (zero behavior change).
- Where to view: Laminar project dashboard (traces for intake Jev calls, llm-judge calls, and agent long tasks, carrying issue/PR number, mode, and model id).
- No timed export to OBS and no eval scoring in this version.

## Input reference

### Composite action inputs (`action.yml`)

| Input item | Default value | Introduced version |
| --- | --- | --- |
| model |  | v0.2.9 |
| agent-kind | opencode | v0.2.9 |
| acp-command |  | v0.2.9 |
| github-token |  | v0.2.9 |
| mode | review | v0.2.9 |
| issue-number |  | v0.2.9 |
| pr-number |  | v0.2.9 |
| require-evidence | false | v0.2.9 |
| require-pinned-actions | false | v0.2.9 |
| collect-feedback | true | v0.2.9 |
| review-prompt |  | v0.2.9 |
| use-sub-agents | false | v0.2.9 |
| llm-api-key |  | v0.2.9 |
| llm-base-url |  | v0.2.9 |
| timeout-minutes | 60 | v0.6.0 |
| recall-mode | keyword | v0.3.0 |
| package-source | npm | v0.6.0 |
| package-version | latest | v0.6.0 |

> `review.yml` reusable workflow 已在 v0.7.0 删除（#103/#105）：新仓只用 `init` 生成的自包含 workflow，升级走 `init upgrade`。以下仅为历史对照，不再作为接入路径。

### Reusable workflow inputs (`.github/workflows/review.yml`, ≤ v0.6.0, removed)

| Input item | Default value | Introduced version |
| --- | --- | --- |
| mode | review | v0.6.0 |
| model |  | v0.6.0 |
| pr-number |  | v0.6.0 |
| runs-on | ubuntu-latest | v0.6.0 |
| bot-repository | link-seek/opencode-github-bot | v0.6.0 |
| package-source | repo | v0.6.0 |
| package-version | latest | v0.6.0 |
| bot-version | v0.6.0 | v0.6.0 |

Empty default value cells mean an empty string (or no default for required inputs).

## Status

v0.3.0: + pm-intake (Jev 6-question triage, docs-aligned, strict CF child tokens). Trusted Publishing (OIDC) enabled.
