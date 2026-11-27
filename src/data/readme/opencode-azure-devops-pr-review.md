# Azure DevOps PR Review for OpenCode

[![CI](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/actions/workflows/ci.yml?query=branch%3Amain)
[![npm](https://img.shields.io/npm/v/opencode-azure-devops-pr-review)](https://www.npmjs.com/package/opencode-azure-devops-pr-review)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tested with OpenCode 2.4.1](https://img.shields.io/badge/OpenCode-2.4.1%20tested-blue)](docs/VALIDATION.md)

**Review Azure DevOps pull requests from a URL. No checkout required.**

Use your own OpenCode models to review code, inspect the proposed comments,
and choose what gets published. No MCP server or CI pipeline setup is required.

0.5.0 reviews with independent passes in place of two reviewers and a
verifier ([what changed](#what-changed-in-050)). Its default two passes found
about as many issues as 0.4.6 on two public benchmarks, at 58% to 83% of the
cost depending on the model, and on Martian's open
[Code Review Bench](#martians-code-review-bench) more of the listed issues in
50 real pull requests than any of the 21 tools on its dashboard
([the measurements](#benchmark-results)).

AZPR is an independent community project. It is not built by or affiliated with
the OpenCode team.

[Get started](#your-first-review) · [Benchmark](#benchmark-results) ·
[15-second recording](#watch-the-workflow) · [Full demo](docs/DEMO.md) ·
[Documentation](#documentation)

## See the review in Azure DevOps

Findings include a source location, evidence and a suggested fix. Preview the
planned comments in OpenCode, then publish them as inline comments and a PR
summary.

[![Actual Azure DevOps inline comment on fulfillment.py: the changed line replaces a deep copy with a shallow copy; the review explains the shared-state defect, cites evidence and suggests a fix.](docs/assets/azure-inline-review.png)](docs/assets/azure-inline-review.png)

*Actual output on a dedicated test PR with seeded defects, published by AZPR
0.3.1 in a different run than the recording below. 0.5.0 posts the same
layout; its disclosure line also names the review method
([the differences](docs/DEMO.md)). The image joins cropped excerpts of the
diff and the comment, with identifying UI removed; code and review text are
unchanged. It shows the output format, not review accuracy. Click the image to
enlarge, or
[read the pictured comments and capture details](docs/DEMO.md#actual-azure-devops-comments).*

<details>
<summary>See the complete PR summary from the same review</summary>

[![Actual Azure DevOps PR summary: zero high, three medium and zero low findings, with a review note and a finding index pointing to fulfillment.py lines 24, 29 and 37.](docs/assets/azure-review-summary.png)](docs/assets/azure-review-summary.png)

The summary keeps the full finding index in one place. Like the image above, it
is an actual capture excerpt with identifying UI removed and its text unchanged.

</details>

## Watch the workflow

[![Real OpenCode run: a review starts and a panel beside the conversation lists its sessions, with a step at its foot that stops the run; the panel then shows the report and the comment preview rendered, with the next step at its foot, and the findings as a list.](docs/assets/terminal-panel-teaser.gif)](docs/DEMO.md#the-terminal-panel)

*A 15-second edit of a real OpenCode 2.3.0 session with the AZPR 0.4.5 release
candidate on a dedicated test PR. 0.5.0's panel works the same; the sessions it
lists are review passes, duplicate checks and the severity rating instead of
two reviewers and a verifier. Waiting time is shortened, so the length is not
the review duration.
[Recording details and other walkthroughs](docs/DEMO.md), among them
[adjusting findings before publishing](docs/DEMO.md#adjust-findings-before-publishing).*

## Your first review

1. Install the npm package using OpenCode's plugin manager (already installed?
   see [upgrading](#upgrading); behind a company proxy, see
   [company networks](docs/ENTERPRISE.md#company-networks) first):

   ```sh
   opencode plugin add opencode-azure-devops-pr-review@0.5.1
   ```

2. In OpenCode's terminal UI, type `/pr-setup`. Dialogs ask for your Azure
   DevOps organization, a proxy if your network needs one, your token (PAT) and
   a model. AZPR checks the token with Azure DevOps, saves it in a file only
   you can read, and is ready at once: no restart. The
   [quickstart](docs/QUICKSTART.md#3-set-azpr-up-opencodes-terminal-ui) walks
   through it with a recording of the dialogs; in another client, such as the
   desktop app, see
   [without the terminal UI](docs/QUICKSTART.md#without-the-terminal-ui).
3. In one OpenCode conversation, check access, then review:

   ```text
   /pr-check https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_git/YOUR_REPO/pullrequest/123
   /pr-review https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_git/YOUR_REPO/pullrequest/123
   ```

Replace the sample URL with your PR. Wait for `/pr-check` to report `READY`
before starting the review; it uses no model. The review runs two independent
passes of the model you chose, each checking its own findings against the
source, then merges what both reported and rates the severities; nothing
verifies a finding after its reviewer. If the completed review has findings to
comment on, a **comment preview** follows in a separate, cancellable run and
shows the comments as they would be posted. **Nothing is posted by these
commands** unless you set `afterReview` to `publish`. Previewing comments also
uses a model; add `--no-comment` after the URL for a review without a preview.
For a lighter first pass, use `/pr-quick <PR URL>`: the same review with one
pass. Every command answers `--help` with its options, without a model.

In OpenCode's terminal UI a [panel](#terminal-panel) opens beside the
conversation: it shows the report and the preview rendered, and at its foot
what you can do next, without typing a command. While the review runs that is
**Stop this run…**. After the preview, pick **Post N comments…** there, or
leave findings out first with **Adjust findings…**. Stopping and posting
always ask once more.

<details>
<summary>Optional: adjust findings and publish after reading the preview</summary>

Read the preview; it ends with the commands for the next step, and the
terminal panel lists the same steps at its foot, to pick. Before publishing,
you can leave findings out or change their severity, using the finding IDs the
preview and the report show:

```text
/pr-comment --exclude F-1,F-2                     leave two findings out
/pr-comment --severity F-3=low,F-4=medium         change two severities
/pr-comment --exclude F-1,F-2 --severity F-3=low  both in one command
```

With the last line, F-1 and F-2 are excluded from the new preview and F-3
appears as low in the summary, with no inline comment. Adjusting runs comment
planning again with a model. Read the whole new preview, then publish from the
same conversation:

```text
/pr-comment --publish
```

None of these commands needs a review ID: they act on the conversation's
current review, the one completed or used there last, and each receipt names
that review and its PR. To act on an older review, put its ID first
(`/pr-comment 1a2b3c4d --publish`); `/pr-comment --list` shows the saved
reviews. The command posts the saved
preview as the PAT owner and skips matching comments AZPR already posted. It
never edits them; for an adjusted review, the receipt identifies those whose
text differs from the new preview. See
[adjusting findings](#adjusting-findings-after-a-preview) for how repeating an
option replaces its earlier list.

</details>

## Why AZPR?

- **Control what gets posted.** Read a preview, exclude findings or change
  severity, then inspect the newly planned comments. The original review stays
  intact. Publication rechecks the PR head, skips matching comments and reads
  new comments back; automatic publication is opt-in.
- **Read beyond the diff.** Reviewers can follow definitions, callers and
  tests at the selected PR commit, without a local checkout or an Azure Code
  Search index.
- **Review more than once.** Each model you list for a mode is one pass: an
  independent session that reviews every changed file and checks each of its
  findings against the source it read. Passes do not see each other's work. A
  duplicate check merges what they report twice, and a rating puts the
  findings on one severity scale.
- **Know what was checked.** No stage verifies a finding after its reviewer,
  and the report, the receipt and every posted comment say so. More passes
  find more; they do not make a finding more certain.
- **Use the models you already have.** One model is enough to start. List it
  twice for two passes, give a second vendor's model a pass of its own, or
  keep stronger models for selected PRs with `/pr-deep`.

For company networks, configure a proxy and additional CA certificates for
AZPR's Azure requests; model-provider connections stay in OpenCode. Content
search downloads a bounded repository archive into memory, source context goes
to your selected model providers, and review records are saved locally. See
[team setup and data handling](docs/ENTERPRISE.md) and
[content-search limits](docs/AZURE_DEVOPS.md#who-calls-what).

## What changed in 0.5.0

0.5.0 changes how a review is made, not only its options. If you used 0.4.x:

| | 0.4.x | 0.5.0 |
| :--- | :--- | :--- |
| Who reviews | `/pr-review` and `/pr-deep`: a functional and a risk reviewer, each with a prompt of its own. `/pr-quick`: one reviewer. | Every mode: one reviewer prompt that covers both, run once per model you list (one to four passes). Each pass reviews every changed file on its own. |
| Checking findings | A verifier checked every finding with tools and could reject, merge, rewrite or add findings. | Each reviewer checks its own findings against the source before it answers. No stage checks them afterwards, and the report, the receipt and every comment say so. |
| Repeated findings | Merged by the verifier, with a short duplicate check after it. | Merged by a duplicate check where different passes reported the same defect. |
| Severity | Set by the verifier; a separate rating ran only with a named `rater`. | Set by a rating that sees only each finding's text, on by default; `"rater": false` keeps the reviewers' levels. |
| Modes | Different stages per mode. | The same stages in every mode; the modes differ only in their models. |
| Settings | A `functional`, a `risk` and a `verifier` model per mode; one reviewer model for `/pr-quick`. | `models.<mode>.reviewers`, a list, and `rater`. `/pr-setup` shows the update of a 0.4.x file and writes it only when you confirm ([upgrading](#upgrading-from-04x)). |
| Finding IDs | `F-`, `R-` and `V-` by role. | `F-1 … F-n` for the whole review. |

Reviews that 0.4.x saved can still be shown, previewed and published. What
the change does to findings, cost and time is measured
[below](#benchmark-results): on ReviewBench with its own judge, and on
Martian's Code Review Bench with Martian's.

## Choose a review

Every mode runs the same review: reviewer passes, a duplicate check, a
severity rating, then comment planning. The modes differ only in the models
you list for them.

| Command | Best starting point | What runs |
| --- | --- | --- |
| `/pr-review` | The everyday review | One pass per model of `models.review.reviewers`. A first setup lists your model twice: two passes. |
| `/pr-deep` | Important or risky changes | The same review with the models of `models.deep.reviewers`: stronger models, a higher variant or more passes. Off until you list models there. |
| `/pr-quick` | Small or routine changes, or a first look | The same review with the models of `models.quick.reviewers`, usually one pass of a fast model. A first setup lists your model once; an empty list leaves it off. |

All three modes use the same Azure comment layout and the same disclosure
line. Each reviewer checks its own findings against the source, and the
runtime checks only their form and source. No stage verifies a finding
afterwards, so a finding can be wrong and a defect can be missed. A finding
that two passes reported is one finding after the duplicate check; it is not
confirmed by that. See [model configuration](#configuration) for how to choose
the lists.

<details>
<summary>Sessions, model requests and cost</summary>

A review starts these private sessions:

- **Review:** one session per pass and shard. A shard holds up to
  `workflow.shardFiles` changed files (25), so a small PR is one shard:
  `/pr-review` with two passes starts two reviewer sessions, `/pr-quick` with
  one pass starts one.
- **Duplicate check:** one session for each file (and side, HEAD or BASE) in
  which different reviewer sessions reported findings. None when no file has
  findings of more than one session, as with one pass over one shard.
- **Severity rating:** one session without tools per 25 reported findings.
  None when nothing was reported or `rater` is `false`.
- **Comment planning** (the preview): one session per page of about four
  findings, and one grouping session before the pages when the findings need
  more than one page and some could be one defect at several places. A
  review without findings to comment on gets no automatic preview.

So a small PR with a few findings needs two reviewer sessions, a duplicate
check for each file in which both passes reported, one rating session and
one planning session with `/pr-review`; and one reviewer session, one rating
session and one planning session with `/pr-quick`.
**Sessions are not API requests:** each can make multiple requests, and
repairs, retries, larger PRs and extra planning pages add work. More passes
run side by side, within `workflow.parallelSessions`, so they mainly add
cost. See the [validation record](docs/VALIDATION.md) for measured runs and
the version each was made with, rather than treating a session count as a
price guarantee.

</details>

## Benchmark results

0.5.0 was scored on two public benchmarks with each benchmark's own judge,
against 0.4.6 with the same model. We ran the judging pipelines ourselves, so
these are not leaderboard results; the method, the noise and the limits are
in the [validation record](docs/VALIDATION.md).

### What was measured for 0.5.0

0.4.6 and 0.5.0 reviewed the same 24 pull requests of
[ReviewBench](https://github.com/review-bench/ReviewBench)'s test set with
GPT-6.2 Sol at its default reasoning effort, scored by ReviewBench's own
judging pipeline with Claude Sonnet 5, the model that judges its leaderboard.

| Per pull request | Findings | Judged valid | Reference issues found | High and medium found | Cost | Time |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.4.6: two reviewers and a verifier, all GPT-6.2 Sol | 34.1 | 93.2% | 51.5% | 60.6% | US$1.30 | 367 s |
| **0.5.0: two passes of GPT-6.2 Sol (the default)** | **27.8** | **89.7%** | **49.1%** | **61.9%** | **US$0.76** | **293 s** |
| 0.5.0: three passes | 31.1 | 93.2% | 51.2% | 63.7% | US$1.01 | 290 s |
| 0.5.0: four passes | 33.7 | 91.0% | 54.8% | 65.6% | US$1.36 | 338 s |

- **Two passes, the default,** found about as many reference issues as 0.4.6
  at 58% of its cost, with 89.7% of their findings judged valid against 93.2%.
- **Three passes** matched 0.4.6 at 78% of its cost; **four** found 54.8% at
  about its cost. To review with three passes, write the model as `MODEL*3`
  ([setup with options](#setup-with-options)).
- **The rating marks more findings high** than 0.4.6's verifier did (about
  20% against 9%), and the judge rated fewer of those high (27% to 33%
  against 47%).
- **Why there is no verifier:** with reviewers of its own strength, 0.4.6's
  verifier rejected 0 of 280 findings (GPT-6.1 Terra) and 3 of 1,185
  (GPT-6.2 Sol), for 30% and 54% of a review's cost.

*Judged valid: the share the judge found correct (augmented precision).
Reference issues found: the share of the listed issues a finding covered
(grounded recall). Cost: the list price of each run's tokens. Time: the median
per review, four at a time. The 25th test pull request, simnaut/emdash#2, is
left out of every row: 0.4.6 filed 449 findings there, more than the judge can
score at a reasonable cost. One run per row;
[details](docs/VALIDATION.md#050-against-046-on-reviewbench-with-its-own-judge-2026-11-24).*

### Martian's Code Review Bench

On Martian's open [Code Review Bench](https://codereview.withmartian.com),
which evaluates AI code reviewers on 50 real-world pull requests from
**cal.com, Discourse, Grafana, Keycloak and Sentry**, **AZPR 0.5.0
(`/pr-deep` with the default two passes of Claude Opus 5.5) found more of the
benchmark's expected issues than any of the 21 tools on its public
dashboard.**

- **Highest recall (73.4%) and highest High and Critical recall (80.3%)** on
  the dashboard.
- **F2 56.9, would rank 6th:** `/pr-deep` puts every finding in the preview,
  and you choose which ones to publish. The benchmark counts an accurate
  comment outside its list of about three issues per PR as wrong, so precision
  is 29.9% ([why](#why-pr-deep-favors-recall)).
- **83% of 0.4.6's model cost** with the same model, which found 67.1%.

| Tool | Issues found (recall) | High and Critical found | Comments on the benchmark's list (precision) | F2 |
| :--- | ---: | ---: | ---: | ---: |
| **AZPR 0.5.0 (`/pr-deep`, two passes of Claude Opus 5.5)** | **73.4%** 🏆 | **80.3%** 🏆 | **29.9%** | **56.9** |
| copilot-v2 | 66.5% | 71.2% | 38.5% | 58.0 |
| cubic-v2 | 65.8% | 72.7% | 61.5% | 64.9 |
| augment | 65.2% | 74.2% | 59.5% | 64.0 |
| qodo-extended-v2 | 64.6% | 74.2% | 67.1% | 65.1 |
| qodo-v2 | 62.0% | 71.2% | 55.4% | 60.6 |
| coderabbit | 59.5% | 63.6% | 32.6% | 51.1 |

*Data as of 2026-11-25: AZPR 0.5.0 from npm on OpenCode 2.4.0, one run,
scored with the benchmark's own pipeline and judge and counted as its
published results count (precision 31.3% and F2 57.8 under the corrected
counting of 2026-11-20). Other tools: the six with the highest recall in the
default view of Martian's dashboard (core issues, judged by Claude Opus 4.5;
published results of 2026-08-30, the latest on 2026-11-25), sorted by recall.
The dashboard includes tools by their public GitHub review activity; AZPR
reviews **Azure DevOps** pull requests, so we ran the official pipeline and
judge ourselves, as Martian invites. Every run, including one with three
passes, is in the
[validation record](docs/VALIDATION.md#050-on-martians-code-review-bench-with-claude-opus-55-2026-11-25).*

### Why `/pr-deep` favors recall

Bots that comment on every pull request usually keep the number of comments
low to avoid noise. AZPR posts nothing until you decide: **you review every
finding in a preview and publish only the comments you want.**

The benchmark's precision also counts accurate comments it does not list:

1. **Unlisted issues count as false positives.** Code Review Bench lists about
   three issues per PR and counts every comment that matches none of them as a
   false positive. 0.5.0's two passes reported 7.0 findings per PR.
2. **Most unmatched findings were accurate.** We checked a random sample of 40
   of 0.3.5's findings that matched no expected issue against the source code:
   **36 were accurate**, and **18 were genuine defects** introduced or exposed
   by the PR that the benchmark's list does not include.
3. **A judge that checks each finding found them valid.** ReviewBench's judge
   checks every finding that matches no listed issue against the code: it
   judged 89.7% to 93.2% of 0.5.0's findings valid ([above](#what-was-measured-for-050)),
   and 95.6% of 0.3.5's.

### Models and passes

- **Two passes, the default,** are the setup measured on both benchmarks.
- **More passes cost more and trade precision for recall;** what a pass adds
  depends on the model and the pull requests.
- **The model matters more than the number of passes:** in our own runs, a
  pass of GPT-6.1 Terra found more than twice what a pass of GPT-6 Luna found,
  and one pass each of Terra and Claude Sonnet 5.5 found more than four passes
  of Terra at about the same cost. Use `/pr-deep`, or stronger review models,
  where a missed defect costs more.
- **Effort:** among twelve combinations measured for 0.3.5, Claude Opus 5.5 at
  `medium` scored best; 0.5.0 was measured at `medium`.

### Earlier releases on ReviewBench

<details>
<summary>0.3.5, 0.3.6 and 0.3.7 on ReviewBench's test set</summary>

Two releases of the earlier pipeline, with two reviewers and a verifier, were
checked on ReviewBench's test set, which was not used to write their changes:
recall stayed within the run-to-run variation, and agreement with the judge on
which findings deserve an inline comment rose from 70.0 (0.3.5) to 83.0
(0.3.7).

0.3.6 changed two reviewer instructions because of issues 0.3.5's run on
Martian's benchmark missed:
defects in code a pull request moves unchanged, and findings dropped because
the behavior might be intended. They were written after reading three of the
benchmark's expected issues, and in a local scoring run they raised its recall
by 2.5 points. To see whether they help only there, 0.3.5 and 0.3.6 also
reviewed the 25 pull requests of the
[ReviewBench](https://github.com/review-bench/ReviewBench) test set, which was
not used to write them, once each with `/pr-deep` and Claude Opus 5.5 at
medium effort. Both were scored with ReviewBench's own judging pipeline and
Claude Sonnet 5, the model that judges its leaderboard. We ran the pipeline
ourselves, so this is not a leaderboard result.

| ReviewBench test set | Issues found (recall) | Findings judged valid | High and medium found | Inline decisions (F1) |
| :--- | ---: | ---: | ---: | ---: |
| 0.3.5 | 35.5% | 95.6% | 55.3% | 70.0 |
| 0.3.6 | 39.5% | 96.5% | 55.3% | 65.5 |
| 0.3.7 | 37.5% | 97.4% | 54.7% | 83.0 |

For 0.3.6, none of the four measures fell by more than the run-to-run
variation allowed for in advance. The last one is agreement with the judge on
which findings deserve an inline comment; it fell because more findings the
judge rated medium or high were labeled low, 8 of them questions about intent,
which that release's rule rates low. Our local judge scored these runs and a pair with GPT-6.1
Sol. With Sol all four measures rose slightly; with Claude Opus 5.5 it rated
2.4 points fewer of 0.3.6's findings valid, more than allowed. The criteria,
both judges' results and the limits are in the
[validation record](docs/VALIDATION.md#defects-in-moved-code-and-unknown-intent-2026-11-09).

0.3.7 changes how severity is set for that reason: a change that breaks what
worked before is at least medium, and the verifier sets each level without
seeing the reviewer's label. It reviewed the same pull requests once, with the
same setup, and was scored the same way. Agreement on inline comments rose
from 65.5 to 83.0: 27% of the findings the judge rated medium or high were
labeled low, against 51% for 0.3.6. Recall fell by 2.0 points and the high and
medium issues found by 0.6, both within the variation allowed for 0.3.6. The
runs and their limits are under
[severity from verified harm](docs/VALIDATION.md#severity-from-verified-harm-2026-11-11-and-12).

</details>

## Is this the right workflow?

AZPR fits reviewers who already use OpenCode, review Azure DevOps Services PRs
on demand, and want to choose their models and inspect comments before posting.
It combines source retrieval, review stages and publication checks in one plugin.

If you need an unattended review on every PR event, look for a webhook or CI
integration; AZPR runs when you invoke a command. If your work includes editing
code or running the project's tests, use a local checkout for that work.

If you need a second stage to re-check every finding before you see it, AZPR
has none since 0.5.0: each reviewer checks its own findings against the
source, and you read the preview before anything is posted.

The [validation record](docs/VALIDATION.md) includes real model/Azure runs, a
316-file test PR, isolated OpenCode host checks, and an offline test suite for
runtime and packaging behavior. It also records missed defects and untested
environments. Each of its sections names the version it was made with; runs
before 0.5.0 used the earlier pipeline, with two reviewers and a verifier. The
demo shows the workflow; for review quality, see the
[benchmark results](#benchmark-results), and expect findings to vary between
models and runs.

## Compatibility

| Component | Tested target |
| --- | --- |
| OpenCode | **OpenCode CLI 2.4.1** (`@opencode/cli`; V2 plugin API). On another OpenCode 2.x, `/pr-check` shows an OpenCode WARNING row and reviews still run. OpenCode 1.x is not supported. |
| Operating system | **Ubuntu 22.04** (validation environment: WSL2). Other operating systems are not yet validated. |
| Azure | **Azure DevOps Services**, REST API **7.1**. Azure DevOps Server is not supported by the current URL handling. |
| Installation | OpenCode's plugin manager with the npm package or the versioned Git package, or the source installer with POSIX `sh` and Python 3; no plugin build step or npm dependencies. |
| Terminal UI | The [review panel](#terminal-panel) and the [setup dialogs](#setup-in-the-terminal-ui) need OpenCode's terminal UI. Other clients, such as the desktop app, show AZPR's notices as text and take `/pr-setup` with options. |
| Models | Your OpenCode provider/model IDs. Reviewer models need tool support; a model named only as `rater` does not. Each mode checks the models it uses. Name a concrete model, not one that routes each session to another model (see [configuration](#configuration)). |

The npm package, the Git package and the release source archive contain the
same runtime. A fresh installation exposes `/pr-setup` before
reviewing is enabled; the [quickstart](docs/QUICKSTART.md) configures one model
for `/pr-review` (two passes) and `/pr-quick` (one pass).

## Documentation

| I want to… | Start here |
| --- | --- |
| Install AZPR and run a first review | [Step-by-step quickstart](docs/QUICKSTART.md) |
| Upgrade an existing installation | [Upgrade instructions](#upgrading) |
| Choose models, language or settings | [Configuration](#configuration) |
| Look up one setting | [All settings and defaults](#all-settings-and-defaults) |
| Look up a command or a status | [Commands](#commands) |
| Read reports and pick the next step beside the conversation | [Terminal panel](#terminal-panel) |
| Adjust, preview or publish comments | [Commenting guide](docs/COMMENTING.md) |
| Set up a company proxy or understand data handling | [Team setup](docs/ENTERPRISE.md) |
| Understand what has been tested | [Validation and limitations](docs/VALIDATION.md) |
| Troubleshoot or contribute | [Debugging](docs/DEBUGGING.md) · [Contributing](CONTRIBUTING.md) |

The sections below are reference: how reviews work, installation and
upgrading, configuration with every setting, the commands, the terminal panel,
comments, and what is kept on your machine.

## How reviews work

<details>
<summary>Review stages, recovery and saved results</summary>

1. The runtime reads the PR deterministically from Azure DevOps: identity, the
   latest iteration's source commit and merge base, and the complete
   changed-file list. Reviewers read the repository through AZPR's own
   read-only tools at exact commits.
2. **Reviewer passes.** Each model in the mode's list
   (`models.<mode>.reviewers`) is one pass: an independent session for every
   **shard**, a bounded group of changed files. A reviewer covers function and
   failure behaviour, reads beyond the diff where a change reaches, and
   checks each of its findings against the source it read before it answers.
   Passes do not see each other's work. A shard that fills its model context
   is split in half and run again instead of failing. Reviewer sessions never
   compact: AZPR also refuses OpenCode's background summary in them
   (`compaction.background`, on by default from OpenCode 2.3.1 on;
   `experimental.background_compaction` in earlier releases) before anything
   is sent, and that refusal ends nothing.
3. **The runtime's checks.** The runtime checks the form and the source of
   every finding, never whether the defect is real: its fields are there, its
   location exists at the reviewed commit, and the session that reports it
   read that file. An answer that breaks the output contract gets a short
   **correction turn** in the same session. A finding that still fails is
   NEEDS_INFO and is never commented on; the rest of the review is kept.
   Findings that pass are REPORTED. The runtime numbers the findings
   `F-1 … F-n` in a fixed order (by place, then by pass) and removes records
   that are identical in every field.
4. **Duplicate check.** Where different reviewer sessions reported findings
   on one side of one file, one session of the first reviewer model compares
   them and merges repeated reports of one defect: the same root cause and
   the same correction. It never merges two findings of one session, and a
   check that fails keeps every finding.
5. **Severity rating.** Sessions without tools rate the reported findings
   from their text alone, without the level their reviewer gave them, so that
   the findings of different reviewers stand on one scale.
   `models.<mode>.rater` says which model rates: the first reviewer model
   (`""`, the default), a model you name, or none (`false`: the reviewers'
   levels stay). A finding without a usable rating keeps its reviewer's
   level.
6. The runtime rechecks the PR versions. Only a changed **source** commit makes
   the review STALE; a moved base is reported as a warning.
7. `/pr-comment` plans a preview with the mode's first reviewer model. With
   `--publish`, the runtime posts the saved text itself, skipping comments
   that already exist and reading every created comment back from Azure
   DevOps. Re-running a publish is safe. A COMPLETE review is followed by a
   preview unless `afterReview` or a flag after the PR URL says otherwise
   ([automatic comments](#automatic-comments)).

**No stage verifies a finding.** Nothing re-checks a finding after its
reviewer. The report says so in its first lines, the receipt says
`verification none`, and the disclosure line of every posted comment reads
`Review method: findings checked by their reviewer against the source, no
separate verification`. More passes find more defects; a finding that two
passes reported is not confirmed by that.

With several passes, coverage has two numbers: the changed files reviewed in
at least one pass, and those reviewed in every pass. A pass that fails costs
depth, which the second number and a warning show; a file is unreviewed only
when no pass reviewed it.

**Your local project's instructions are not a review's.** OpenCode adds to
every request what it collects for a conversation's directory: instruction
files (`AGENTS.md`, `CLAUDE.md`, configured ones) and what MCP servers,
references and skills say of themselves. AZPR keeps all of that out of its
private sessions, which get AZPR's own instructions and OpenCode's date and
environment; your own conversations are not touched. With a `claude-agent`
model that holds for what OpenCode hands the Claude Code program: the date
and the environment are then Claude Code's own, and whether that program
reads a `CLAUDE.md` of the working directory by itself was not tried with
the real program. A reviewer can still read
the instruction files of the PR's repository with AZPR's tools, at the
reviewed commit, and local files on purpose. Where AZPR cannot tell these
parts of a request apart (another plugin rewrote them, or a later OpenCode
builds them another way), it sends them as it received them, with whatever
of your local instructions they hold, and the stage's
[debug record](docs/DEBUGGING.md) counts the request; see
[what the selected model receives](docs/ENTERPRISE.md#what-the-selected-model-receives).

`/pr-quick` and `/pr-deep` run this same review with the models listed for
them (`models.quick.reviewers`, `models.deep.reviewers`). An empty list leaves
the command off, and no mode falls back to another mode's models. `/pr-quick`
is meant for one pass of a fast model on small or routine PRs, `/pr-deep` for
stronger models, a higher variant or more passes on the PRs that need them.
`/pr-check` says when `/pr-deep` is off or its models repeat the review
models.

Readiness checks, reviews, comment planning, adjustments and publication
acknowledge `STARTED` and continue in the current OpenCode process; short
`PROGRESS` notices and a final receipt return to the invoking conversation.
They start no response of that conversation's own model; when you prompt it
later, it reads them together with your prompt, in one request. Use
the displayed `/pr-stop <run-id>` to cancel, or **Stop this run…** at the
foot of the [terminal panel](#terminal-panel). `/pr-setup` (including `--help`),
`/pr-stop`, `/pr-comment --show`, an adjustment that changes nothing and a
refused command answer directly, without a background run.
Completed reviews, previews and publication ledgers are saved privately and
survive an OpenCode restart.

See [current validation](docs/VALIDATION.md) for what was tested and what was
not; earlier runs are kept in [validation history](docs/VALIDATION_HISTORY.md).

</details>

## Requirements and installation

The plugin has no npm dependencies, build step or provider SDK. It calls the
Azure DevOps REST API with the runtime's built-in `fetch`.

### Native package (npm or Git)

Install the npm package with OpenCode's plugin manager:

```sh
opencode plugin add opencode-azure-devops-pr-review@0.5.1
```

The same release is also a versioned Git package, which needs Git but not the
npm registry:

```sh
opencode plugin add 'github:WTLAIB/opencode-azure-devops-pr-review-v2#v0.5.1'
```

Add only one of them. OpenCode (2.3.0 and later) loads the plugin into a
running OpenCode service within a few seconds; if `/pr-setup` does not appear in a new
conversation, run `opencode service restart`. Then run `/pr-setup`: in the
terminal UI it asks for what it needs, elsewhere it prints the instructions.
Native packages
use `${XDG_CONFIG_HOME:-~/.config}/azpr/settings.json`; configuration and the
separate PAT file stay outside the package cache when the plugin is updated.
To select another configuration file, use an absolute path in the host config:

```json
{
  "plugins": [{
    "package": "opencode-azure-devops-pr-review@0.5.1",
    "options": { "settingsFile": "/absolute/path/to/azpr/settings.json" }
  }]
}
```

Use one installation method per OpenCode profile. Existing source installations
can keep using `install.sh --replace`. To move one to the native package,
copy its settings to the external configuration path with owner-only
permissions, archive the old installation with its uninstaller, then add the
package. Keep the PAT file and private state directory in place.

**Install an exact version, as the commands above do.** OpenCode 2.4.0 and
later update a plugin entry that follows a version by themselves
(`…@latest`, a range such as `^0.5.0`, a Git branch, a `#semver:` range), when
the service starts and every 24 hours, and load the new version at once: a
review that is running ends as `CANCELLED`, and coming from 0.4.x AZPR then
waits for the [settings update](#upgrading-from-04x). An exact version and a
Git tag are never changed that way.

OpenCode also loads AZPR again whenever a plugin that is loaded before it
changes, another plugin's automatic update included, and that ends a running
review the same way. Local plugins in the configuration directory's `plugin/`
and `plugins/` folders are loaded first, by path, then the entries of the
`plugins` list in their order: list AZPR first there, and do not edit a local
plugin while a review runs.

### Upgrading

Keep one AZPR entry in the `plugins` list. **Running only `opencode plugin add`
with a new version adds a second entry**: OpenCode keeps running the version
listed first and reports the new one as `Duplicate plugin ID: azpr` (from
0.3.1, `/pr-check` also warns about it). Upgrade when no AZPR command is
running, since
OpenCode (2.3.0 and later) replaces the running plugin as soon as its entry
changes.

For an entry that `opencode plugin add` created, add the new version and,
only when that succeeds, remove the previous one:

```sh
opencode plugin add opencode-azure-devops-pr-review@0.5.1 &&
  opencode plugin remove opencode-azure-devops-pr-review@PREVIOUS_VERSION
```

The first command downloads the new version in your terminal, with that
terminal's proxy settings. If it fails, `&&` skips the removal and nothing
changes; do not remove the previous entry by itself after a failed download.
Once the removal runs, the running OpenCode service switches to the new
version within a few seconds, with no restart. Use the same commands with the
`github:` specifications for the Git package, or to move between npm and Git.

For an entry with options (an object with `package` and `options`), change
only its `package` value and keep the options. The OpenCode service then
downloads the new version itself, with the service's network settings (see
[company networks](docs/ENTERPRISE.md#company-networks)); if that download fails,
AZPR's commands disappear until the package is available and the service
restarts.

External settings, the PAT file and review records stay in place; a working
configuration needs no new `/pr-setup`, with one exception: the settings of
0.4.x need an update that you confirm (see
[upgrading from 0.4.x](#upgrading-from-04x)). Settings that a new version brings
are written into your settings file, at their defaults, when OpenCode first
loads that version: AZPR behaves as it did, and each new setting is in the
file for you to change. `/pr-check` then lists what was added. Your values
and their order stay, and the file is written with two-space indentation and
readable by its owner only (mode 600). A settings file that is a symbolic
link, or in a directory other users can write to, is left as it is, and
`/pr-check` names the settings it leaves out. To go back to an earlier
version afterwards, remove the settings that version does not know: it names
the first one (`Unknown setting settings.terminalPanel`) instead of starting. `opencode plugin list` should then
show a single `azpr` row with the new version (from 0.3.1, `/pr-check` names
it too); if it still shows the previous one, run `opencode service restart`.
Exact versions stay pinned: `opencode plugin update` leaves them unchanged,
and so do OpenCode's automatic plugin updates (2.4.0 and later).
See the [0.5.1 release notes](docs/releases/v0.5.1.md) for the move to OpenCode 2.4.1, the
[0.5.0 release notes](docs/releases/v0.5.0.md) for review passes in place of roles, the
[0.4.6 release notes](docs/releases/v0.4.6.md) for one comment for a defect at several places, the
[0.4.5 release notes](docs/releases/v0.4.5.md) for stopping a run from the panel, the
[0.4.4 release notes](docs/releases/v0.4.4.md) for the steps at the panel's foot, the
[0.4.3 release notes](docs/releases/v0.4.3.md) for setup in the terminal UI, the
[0.4.0 release notes](docs/releases/v0.4.0.md) for commands without review IDs and the
[0.2.0 release notes](docs/releases/v0.2.0.md) for automatic comments. A
preview follows each COMPLETE review unless `afterReview` says otherwise;
automatic publication stays off unless you configure it or request it with a
review command flag.

#### Upgrading from 0.4.x

0.5.0 reviews with a list of reviewer models per mode and has no verifier, so
its settings file has another layout (`"version": 3`). A settings file of
0.4.x (`"version": 2`) is kept exactly as it is and is not used until you
have confirmed its update:

1. After the upgrade, AZPR's review commands only answer
   `[AZPR] SETTINGS UPDATE REQUIRED`, and OpenCode's command list describes
   them as `AZPR is not ready here; run /pr-setup to see what it needs`. No
   review and no Azure request starts.
2. Run `/pr-setup`. It shows what the update changes before anything is
   written:
   - for `/pr-review` and for `/pr-deep`, the functional and the risk model
     become the mode's two passes, in that order, and the verifier model is
     dropped;
   - the quick reviewer becomes a list of one;
   - a named `rater` stays. A mode without one gets its findings rated by its
     first reviewer model from now on; `"rater": false` in the settings file
     turns that off;
   - a mode that was off stays off, also `/pr-deep` with only some of its
     three models set;
   - `workflow.shardFindings` and `models._help` are dropped, and every other
     setting keeps its value. The update repairs nothing: a value 0.4.x could
     not use, or a setting this version does not know, stays as it is, and
     `/pr-setup` names it afterwards;
   - where `afterReview` is `publish`, the comments of new reviews are posted
     automatically as before, although no verifier confirmed their findings.
     Set that mode to `preview` to read the comments first.
3. Confirm. In OpenCode's terminal UI a list asks, and its first row, **Not
   now**, keeps the file. In other clients `/pr-setup` prints the changes and
   the command that confirms them:

   ```text
   /pr-setup --migrate <word>
   ```

   The word names the very change that was shown. When the settings file
   changed since, or OpenCode was restarted, it fits no longer: run
   `/pr-setup` again and use the word it shows. `--migrate` stands alone, and
   every other option of `/pr-setup` is refused until the file is updated.
4. The updated file is loaded at once by the OpenCode process that updated
   it; `/pr-check <PR URL>` then shows each mode's passes and which model
   rates. Another OpenCode process, or another project directory of the same
   one, reads it after `opencode service restart`.

Every settings file of 0.4.x takes this one way, also a file with a fault or
one that was never completed, such as starter settings with a placeholder for
a model. The update changes the layout and repairs nothing: the changes it
shows then end with `After the update the settings still cannot be used: …`,
and after the update `/pr-setup` sets what is missing.

Nothing is changed until you confirm. The update replaces the file and keeps
no copy, and 0.4.x refuses a version-3 file (`settings.version must be 2`),
so copy the file first if you may want to go back. Reviews that 0.4.x saved
stay: they can still be listed, shown, previewed and published, and their
comments keep the wording of the version that made them.

A source installation is replaced with `sh install.sh --replace` as before:
the installer carries a version-2 settings file over exactly as it is and
says so, and `/pr-setup` then updates it as above.

### Source archive or checkout

<details>
<summary>Source installation and replacement</summary>

Download the [v0.5.1 source archive](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/archive/refs/tags/v0.5.1.tar.gz)
and extract it, or check out tag `v0.5.1`. The installer needs POSIX `sh` and
Python 3's standard library. From that source directory:

```sh
sh install.sh --config-dir /absolute/path/to/v2-opencode-config
```

The installer creates `plugins/azpr-v2/` with a generated ESM `package.json`
and a `server.js` entry that re-exports `plugin.js`. It never edits the main
OpenCode configuration, provider choices or MCP connections, and it refuses
conflicting legacy files, reserved command names and unowned packages. Run
`/pr-setup` in the terminal UI to complete the generated starter settings
(with options: `/pr-setup ... --replace`), or edit them yourself and restart
OpenCode.

To replace an existing source installation (current settings are kept and new
defaults are added; a settings file of 0.4.x is carried over exactly as it is,
see [upgrading from 0.4.x](#upgrading-from-04x)):

```sh
sh install.sh --config-dir /absolute/path/to/v2-opencode-config --replace
```

</details>

### Manual copying without Git

Keep these relative paths under one source directory, then run its installer.
These **33 files** include the runtime and its license:

<details>
<summary>Show the required files</summary>

```text
install.sh
LICENSE
scripts/merge-settings.py
config/settings.example.json
src/plugin.js
src/setup.mjs
src/session.mjs
src/runtime.mjs
src/config.mjs
src/output.mjs
src/comments.mjs
src/comment-data.mjs
src/comment-work.mjs
src/diagnostics.mjs
src/attribution.mjs
src/host.mjs
src/tool-queue.mjs
src/azure.mjs
src/diff.mjs
src/search.mjs
src/review-tools.mjs
src/review-work.mjs
src/store.mjs
src/tui-model.mjs
src/tui-setup.mjs
src/tui-actions.mjs
src/tui.js
src/prompts/common.md
src/prompts/review.md
src/prompts/dedupe.md
src/prompts/rating.md
src/prompts/comment-policy.md
src/prompts/comment-plan.md
```

README, `docs/`, the changelog, the settings schema and `uninstall.sh` are optional.
Keep `LICENSE` with copied or redistributed packages.

</details>

## Configuration

`/pr-setup` sets AZPR up and changes its settings; what it answers names the
settings file. Native packages use the external configuration described
above; source installations retain their installed
`plugins/azpr-v2/settings.json`. The file names every setting, each at its
default until you change it (see [all settings](#all-settings-and-defaults)).

A first setup is loaded at once. A later change, made with `/pr-setup` or by
editing the file, takes effect when the OpenCode service restarts
(`opencode service restart`, or your own `opencode serve` process). A changed
file blocks new commands until the restart; running commands keep the settings
they started with.

### Setup in the terminal UI

In OpenCode's terminal UI, `/pr-setup` without options opens dialogs. The
command palette has them too ("AZPR: settings").

[![The dialogs of a first setup in OpenCode's terminal UI: the organization, a proxy that Enter skips, the token in a field that shows only bullets and a count, a model from OpenCode's list, what will be saved, and "AZPR is set up".](docs/assets/setup-dialogs.gif)](docs/QUICKSTART.md#3-set-azpr-up-opencodes-terminal-ui)

*AZPR's dialogs in OpenCode 2.3.0's terminal UI, recorded with AZPR 0.4.4, a
test organization and token and a stand-in for Azure DevOps; waiting time is
shortened. A first setup asks the same questions in 0.5.0; its summary now
says that the model gets two passes of `/pr-review` and one of `/pr-quick`.*

- **First setup.** Your organization (its name, or the URL of a pull request);
  a proxy, only if your network needs one (Enter skips it; after a proxy, the
  CA certificate file of a company that inspects HTTPS, which Enter skips
  too); your token; and a model from OpenCode's list, which AZPR lists twice
  for `/pr-review` (two passes) and once for `/pr-quick`. The proxy is asked
  before the token because the token is checked over the network.
- **The token** is typed or pasted into a field that shows only how many
  characters it holds. AZPR asks Azure DevOps once whether the token works for
  your organization, and says what was refused when it does not: the token,
  the organization, or the way there. If Azure DevOps cannot be reached, you
  can set the proxy or the CA file right there and try the same token again,
  or save it unchecked. The token is then saved alone in a file only you can
  read (mode 600): a new file, `${XDG_CONFIG_HOME:-~/.config}/azpr/pat-<organization>`
  (with a number where that name is taken), or the token file your settings
  name already for that organization. Setup overwrites no other file. The
  token is in no conversation, notice or log, and is not shown again.
- **Afterwards** `/pr-setup` lists the settings with their values:
  organization, token, proxy, CA certificate file, the review, quick and deep
  models, output language, what follows a review, the report in the
  conversation, progress notices, the review panel and debug records. Choose
  one to change it. It is saved at once, and the list says that a restart is
  needed. Posting comments without a preview asks once more, with "no" first.
  Another organization asks for a token of its own, since the saved one was
  saved for the organization it was checked for; the two are saved together,
  the new token in a new file beside the first, and AZPR says where the
  earlier token still is.
  The list says what each model row is for and shows its passes: `MODEL ×2`
  for two passes of one model, `A + B` for one pass each of two. A model row
  asks for one model and then for the passes: take what is shown (two passes
  for `/pr-review` and `/pr-deep`, one for `/pr-quick`), add a pass of the
  same or of another model, or take the last one away, up to four passes.
  The dialog of the deep models says what makes them: a model stronger than
  the review model, or the same model with a higher variant.
  The other settings are in the settings file, which the list names together
  with the section that describes them all:
  [all settings and defaults](#all-settings-and-defaults).
- **Settings of 0.4.x.** When the settings file is from 0.4.x, `/pr-setup`
  first shows what the update to this version changes, then asks in a list
  whose first row, **Not now**, keeps the file (see
  [upgrading from 0.4.x](#upgrading-from-04x)).

![OpenCode's terminal UI with the list of AZPR's settings open: the organization, the access token, the proxy and the CA certificate file, then the review, quick and deep models, each with what it is for and its value.](docs/assets/setup-settings.png)

*The list goes on below what is shown: the settings of reviews, of the terminal
UI and of diagnostics, and the settings file. Recorded like the picture above,
with test values and AZPR 0.4.4, whose model rows read Review model, Quick
model and Deep model. Since 0.5.0 they read Review models, Quick models and
Deep models, and each shows its passes.*

The dialogs only ask. The plugin's server part checks every answer, writes
the two files, and is the only part that contacts Azure DevOps. Other OpenCode
clients, such as the desktop app, do not load the dialogs; there `/pr-setup`
prints the instructions and takes options.

### Setup with options

Without the terminal UI, or from a script, one command sets the organization,
an existing PAT file and one model, listed twice for `/pr-review` (two passes)
and once for `/pr-quick`, without calling a model or Azure:

```text
/pr-setup --organization YOUR_ORG --model YOUR_PROVIDER/YOUR_MODEL --pat-file "/absolute/path/to/pat"
```

`--organization` also accepts a PR or organization URL. Without `--pat-file`,
setup uses `${XDG_CONFIG_HOME:-~/.config}/azpr/pat`, the file the
[quickstart](docs/QUICKSTART.md#save-the-pat-in-a-private-file-terminal)
creates. An existing file requires `--replace`, which keeps the PAT file
already set unless you name another; unrelated advanced settings and deep
models are preserved. Setup checks the model catalog and PAT file before
saving. It never accepts the PAT itself as a command argument. A first setup
is loaded at once; run `/pr-check` to verify Azure read access.

Each of these options changes one setting of existing settings, without
`--replace`, and several can be given together:

| Option | Sets |
| --- | --- |
| `--proxy URL` (or `none`) | `azure.proxy` |
| `--ca-file PATH` (or `none`) | `azure.caFile` |
| `--review-model MODELS` | `models.review.reviewers` |
| `--quick-model MODELS` (or `off`) | `models.quick.reviewers` |
| `--deep-model MODELS` (or `off`) | `models.deep.reviewers` |
| `--language TAG` | `outputLanguage` |
| `--after-review preview`, `none` or `publish` | `afterReview` of every mode |
| `--report receipt` or `full` | `returnReport` |
| `--progress on` or `off` | `progressNotices` |
| `--panel auto` or `manual` | `terminalPanel` |
| `--debug on` or `off` | `debug.enabled` |

`MODELS` is a mode's review passes, in order:

```text
/pr-setup --review-model YOUR_PROVIDER/YOUR_MODEL                  two passes of one model
/pr-setup --review-model YOUR_PROVIDER/YOUR_MODEL*1                one pass
/pr-setup --review-model PROVIDER_A/MODEL_A,PROVIDER_B/MODEL_B     one pass each of two models
/pr-setup --review-model PROVIDER_A/MODEL_A*2,PROVIDER_B/MODEL_B   three passes
/pr-setup --deep-model YOUR_PROVIDER/YOUR_STRONGER_MODEL#high      two passes of a stronger model for /pr-deep
/pr-setup --quick-model off                                        /pr-quick off
```

A model named alone gets the mode's usual number of passes: two for
`/pr-review` and `/pr-deep`, one for `/pr-quick`. `MODEL*N` sets the number,
and entries separated by commas run different models, at most four passes in
all. With another option in the same command:

```text
/pr-setup --language zh-TW --deep-model YOUR_PROVIDER/YOUR_STRONGER_MODEL
```

They also go with the options of a first setup, for example `--proxy` behind
a company proxy. After a change to settings that are in use, restart the
OpenCode service. `rater` has no option: like every setting without one, it
is changed in the settings file, where the models look like this:

```json
{
  "version": 3,
  "models": {
    "review": {
      "reviewers": [
        "YOUR_PROVIDER/YOUR_MODEL",
        "YOUR_PROVIDER/YOUR_MODEL"
      ],
      "rater": ""
    },
    "deep": {
      "reviewers": [],
      "rater": ""
    },
    "quick": {
      "reviewers": [
        "YOUR_PROVIDER/YOUR_MODEL"
      ],
      "rater": ""
    }
  },
  "azure": {
    "organization": "YOUR_ORGANIZATION",
    "patFile": "/absolute/path/to/your/pat-file"
  }
}
```

Model IDs use `provider/model` form and must exist in OpenCode. To choose a
model variant such as a reasoning effort, use OpenCode's `provider/model#variant`
form (for example `provider/model#high`); `/pr-check` reports a variant the
model does not offer. Without a variant the model's default is used.

Each entry of `reviewers` is one review pass: an independent session per shard
that reviews every changed file. A list holds one to four entries, and an
entry may repeat. `/pr-review` needs at least one. An empty list leaves
`/pr-deep` or `/pr-quick` off, and no mode falls back to another mode's
models; a command checks only the models it uses, so an unavailable quick
model never blocks `/pr-review`. The first entry also runs the duplicate
check and plans the comments.

`rater` says which model rates the severities of a mode's findings:

| `rater` | Who rates |
| --- | --- |
| `""` (the default) | The mode's first reviewer model. |
| `"provider/model"` | That model. It reads only the findings' text, so it needs no tool support. |
| `false` | Nobody: the reviewers' own levels stay. |

Name the model that should do the work. AZPR binds every private session to
the exact model in its settings and refuses a request that OpenCode sends on
another one, so an entry that lets the provider pick the model for each
session, such as GitHub Copilot's **Auto** (OpenCode 2.2.7 and later), cannot
be an AZPR model: its sessions fail with `Model mismatch`. `/pr-check` finds
such an entry in the model catalog and does not detect this.

How to choose the lists:

- **Start with one model.** `/pr-setup` lists it twice for `/pr-review` and
  once for `/pr-quick`.
- **Two passes for `/pr-review`.** Passes are independent, so a second pass
  finds defects the first one missed, also with the same model. More passes
  find more; they do not make a finding more certain.
- **Two vendors, one pass each.** With models of two vendors, one pass each
  tends to find more than two passes of one model.
- **A sound severity scale first.** The first entry also checks duplicates
  and, by default, rates every finding, those of the other models included.
  Put a model whose severity levels you trust first, or name a `rater`.
- **`/pr-deep` is the same review** with stronger models, a higher variant
  (`provider/model#high`, which reasons longer) or more passes, for the PRs
  that need it.
- **More passes mainly cost more.** They run side by side, within
  `workflow.parallelSessions`.
- **`claude-agent` models need memory.** Each session of OpenCode's
  `claude-agent` provider has a local `claude` process of about 200 MB, which
  ends five minutes after the session's last turn. OpenCode 2.4.0 and later
  also end it when the session is deleted, so after a run whose sessions AZPR
  deleted only the session that holds the report still has one. Where the
  sessions stay (`debug.enabled`, `deletePrivateSessions: false`, or a run
  whose stop OpenCode did not confirm), each keeps its process for those
  five minutes. A review starts one session per pass and shard, plus its
  duplicate checks, its rating and its comment planning, and they run side
  by side: leave memory for them.

What was measured about these choices, with which models, judge and version,
is in the [validation record](docs/VALIDATION.md).

A reviewer's two focuses, function and failure behaviour, order its attention
and are not a filter: every reviewer files every concrete defect it finds, in
any area, as a finding. A finding's severity
says how much it matters to fix it before the change merges, judged from the
harm the evidence shows and how often realistic use reaches it, not from the
reviewer's confidence, the size of the fix or the kind of issue:

- **high** (must fix before merging): realistic use leaves a core function or
  what the change is for not working, or causes serious harm such as a
  security breach, lost or exposed data, or silently wrong results.
- **medium** (should fix in this change): realistic use hits a failure that
  people notice and recover from, a rare trigger causes serious harm, or the
  change breaks something that worked before, however rarely it is used.
- **low** (can wait): anything else, such as a recoverable failure that only a
  rare trigger reaches, or an issue with no effect on behavior.

<details>
<summary>More on severity, and on what counts as a finding</summary>

A rare trigger lowers the severity; it does not keep a defect out of the
findings. Neither does the code's history: a defect on lines the PR adds or
moves is a finding even when the same code existed before (a function moved to
a new file), marked as carried over. Nor does a possible intention: behavior
that is wrong only if the author did not mean it, with nothing showing whether
they did, is a low finding (medium when it stops something that worked before
from working) whose summary asks whether the author meant it and whose
suggestion asks them to confirm or document the intent. Before asking, a
reviewer looks for a statement of that intent in the tests, the comments and
documents beside the code, the PR description and the commit messages.
An easy fix and an effect the reviewer could not confirm are not reasons for a
lower level. The reviewer sets a first level; the severity rating then sets
the final one from the finding's text, without seeing the reviewer's level,
and the report shows both where they differ. With `rater: false` the
reviewer's level stays. Concrete gaps the change leaves are findings too, rated
by their effect: a changed behavior no test would catch where the project
already tests comparable code, a test that cannot fail, a comment or document
that now contradicts the code, and duplicated or dead code the change adds. A
missing test is low unless the test is what the change delivers, and a
document is rated by what following it does; documented steps that worked
before the change and fail after it are a regression (medium) even though the
failure shows at once. A concern that a reviewer could not confirm from the
source goes into its report as an open question, not into the findings. A
finding states one defect: a
second one noticed on the way is filed on its own. A mistake repeated in places
that each need their own fix is one finding per place. Identical copies of one file
count as one place when one reviewer has them; in a large PR split into shards,
copies that different reviewers get can each produce a finding.

</details>

### All settings and defaults

Every setting is in the settings file, each at its default until you change
it; `/pr-setup` names the file and changes the common ones. After a change,
restart the OpenCode service.

| Setting | Default and meaning |
| --- | --- |
| `version` | `3`, the settings layout of 0.5.0 and later. A file with `2` (AZPR 0.4.x) is not used until `/pr-setup` has updated it; see [upgrading from 0.4.x](#upgrading-from-04x). |
| `models.review.reviewers` | Required: the review passes of `/pr-review`, in order, as a list of 1 to 4 models (`provider/model` or `provider/model#variant`; an entry may repeat). Each needs tool support. The first entry also checks duplicates and plans the comments. See [setup with options](#setup-with-options). |
| `models.deep.reviewers` | `[]`: `/pr-deep` is off. Otherwise its passes, as for `/pr-review`: stronger models, a higher variant or more passes. |
| `models.quick.reviewers` | `[]`: `/pr-quick` is off. Otherwise its passes, usually one fast model. |
| `models.review.rater` / `.deep.rater` / `.quick.rater` | Which model rates the severities of that mode's findings; `""` each.<br>`""`: the mode's first reviewer model.<br>`"provider/model"`: that model (it needs no tool support).<br>`false`: no rating; the reviewers' own levels stay. |
| `enabled` | `true`; `false` registers nothing. |
| `returnReport` | `receipt`; `full` also encloses the rendered report in the receipt. |
| `outputLanguage` | `en`; used by reviews, the report and comments. `zh-TW` for Traditional Chinese. |
| `runTimeoutSeconds` | `null` (no whole-command timer); an integer 10–7200 enables one. |
| `shell` | `deny`: private reviewers cannot run shell commands (the tool is hidden). `ask`: each command needs your approval in OpenCode; the request is the reviewer session's, and one that nobody answers stops the stage after `workflow.stageIdleSeconds`. `inherit`: host permissions decide. A command that goes on in the background (OpenCode 2.3.1 and later move one there when its timeout runs out, after 120 seconds by default) tells its reviewer when it has ended, and the pass goes on. One that ends after the reviewer's session has gone idle is not waited for; one that ends right after the answer, while the session is still at work, is still handed to the reviewer, which may answer once more. A mode in which reviewers run code in an isolated sandbox was prototyped and measured with two models; it changed neither recall nor the share of valid findings measurably, so there is none ([validation](docs/VALIDATION.md#reviewers-running-code-in-a-sandbox-2026-11-25-and-26)). |
| `progressNotices` | `true`: short PROGRESS notices in the invoking conversation. |
| `deletePrivateSessions` | `true`: when a command ends, AZPR deletes its private reviewer sessions except the one that holds the review's report (see [retention](#retention-and-privacy)); `false` keeps every session. |
| `terminalPanel` | `auto`: the [terminal panel](#terminal-panel) opens by itself when a review or comment run starts and when a report or preview arrives.<br>`manual`: it opens only with `/pr-panel`. |
| `afterReview.quick` / `.review` / `.deep` | What follows a COMPLETE review of that mode; `preview` each.<br>`preview`: plan a comment preview (a model runs; nothing is posted).<br>`none`: nothing follows; run `/pr-comment` yourself.<br>`publish`: plan the comments and post them as the PAT owner; a comment that a safeguard holds back waits for a person.<br>A flag after the PR URL (`--preview`, `--publish`, `--no-comment`) overrides it for one run. See [automatic comments](#automatic-comments). |
| `azure.organization` | Required. The `<org>` of `https://dev.azure.com/<org>`; PR URLs of other organizations are refused. |
| `azure.pat` | A personal access token for that organization with **Code (Read)** and **Pull Request Threads (Read & write)**, or `""` when `azure.patFile` is set. Sent only to `https://dev.azure.com/<org>` and never logged. |
| `azure.patFile` | `""`. Recommended: the absolute path of a file that holds only the PAT, so `settings.json` holds no secret. It must be a regular file you own that only you can access (mode 600, not a symbolic link). AZPR reads it at start and before each command; after replacing it, restart the OpenCode service. Set either this or `azure.pat`. |
| `azure.concurrency` | `6` (1–8) simultaneous Azure DevOps calls across all AZPR commands. |
| `azure.callTimeoutSeconds` | `120`; a hung call is aborted and its slot released (reads are retried). |
| `azure.archiveMegabytes` | `100` (1–1024): the largest repository zip that content search downloads per run and commit; a larger repository is not searched, and the review's report and receipt say so. It is held in memory during a review. |
| `azure.proxy` | `""`: no AZPR proxy (`HTTPS_PROXY` and `NO_PROXY` in OpenCode's environment still apply; a host in `NO_PROXY` bypasses a set proxy too). A forward proxy for AZPR's Azure DevOps calls only, such as `http://proxy.example.com:8080`; credentials go in the URL as `http://user:password@host:port` (percent-encoded) and are never shown. See [proxies](docs/AZURE_DEVOPS.md#proxies-and-tls-inspection). |
| `azure.caFile` | `""`. The absolute path of a PEM file with CA certificates AZPR trusts in addition to the built-in roots, for a proxy that inspects HTTPS. |
| `azure.verifyTls` | `true`. `false` skips certificate checks for AZPR's Azure DevOps calls (like `curl -k`), so anyone who can intercept the connection can read the PAT; prefer `azure.caFile`. `/pr-check` warns while it is off. |
| `workflow.shardFiles` | `25` (1–1000) changed files per reviewer session. A shard that fills its model context is split in half. |
| `workflow.parallelSessions` | `8` (1–16) private sessions at once within a command. Every pass of every shard shares it, so two passes over one shard run side by side. Lower it, to `4` for example, when the provider limits your request rate. It limits how many sessions run at once, not how many a review starts: with OpenCode's `claude-agent` provider each session has a local process of about 200 MB that outlives its last turn by five minutes (OpenCode 2.4.0 and later end it when AZPR deletes the session), so a review with many passes and shards can need more memory than this setting suggests. Comment planning runs at most two pages at once (one when this is `1`). |
| `workflow.repairAttempts` | `2` correction turns when an answer breaks the output contract. A reviewer's one follow-up turn for unfinished work uses the same budget. |
| `workflow.stageRetries` | `1` new-session retry after a transient failure (provider 429/5xx, an interrupted stream that OpenCode did not recover by itself) or an inactivity stop. While the provider's host cannot be reached (no DNS answer, no route), OpenCode 2.3.0 retries the request by itself for up to an hour; AZPR allows that, so the review waits instead of failing, and `/pr-stop` ends it. A used-up usage or spend limit (provider quota; a ChatGPT usage limit, also the one a workspace's admin sets; an OpenCode Go usage limit; an OpenCode free-model or spend limit) is named and not retried, whatever its status, and AZPR refuses OpenCode's own retries of it. |
| `workflow.stageIdleSeconds` | `600` (`0` turns it off, otherwise 60–7200): a reviewer stage that shows no activity this long while it waits on OpenCode (the model stream, a tool or the host stopped responding) is stopped with `failure=idle` and an error naming its last activity, then retried in a new session. Every model request, streamed chunk of output, tool start or end and announced host retry restarts the window, so a stage that keeps working, including a long answer that keeps streaming, is never cut. With shell allowed, an approval or a command that takes longer counts as inactivity. |
| `debug.enabled` / `debug.directory` / `debug.keepRuns` | `false` / `""` / `20` run directories kept (`0` keeps all); see [debugging](docs/DEBUGGING.md). |

`steps`, `maxStageCharacters`, `structuredOutput`, `comments`,
`auxiliaryModels`, `outputRetries`, `verification` and `shellToolPermission`
are unsupported and rejected. `mcp` is retired: a file that still has it is
refused, with what to move into `azure`. The model settings of 0.4.x
(`models.<mode>.functional`, `risk` and `verifier`, `models.quick.reviewer`,
`models._help`) and `workflow.shardFindings` are unknown settings in a
version-3 file; `/pr-setup` updates a version-2 file that has them (see
[upgrading from 0.4.x](#upgrading-from-04x)). There is deliberately no
per-stage step cap; see the
[roadmap](docs/ROADMAP.md#deferred) for why. The inactivity watchdog
(`workflow.stageIdleSeconds`) is not one: it stops only a stage that stopped
working.

### Azure DevOps access

AZPR talks to the Azure DevOps Services REST API itself (api-version 7.1). Create
a PAT scoped to **one organization** (global "all accessible organizations"
PATs stop working on 2026-12-01) with **Code: Read** and **Pull Request Threads:
Read & write**, which cover every call AZPR makes, and give it an expiry you
renew. Keep it alone in a file that only you can read and point `azure.patFile`
at it, so `settings.json` holds no secret. In the terminal UI, `/pr-setup`
does both for you (see [setup](#setup-in-the-terminal-ui)). Without it, the
[quickstart](docs/QUICKSTART.md#save-the-pat-in-a-private-file-terminal) shows
how to create that file without echoing the PAT, recording it in your shell
history or overwriting an existing file, and `/pr-setup` with options sets
`azure.patFile`.

To set it by hand, put that file's absolute path (for example
`/home/you/.config/azpr/pat`) in `"patFile"`, leave `"pat"` empty in the
settings file `/pr-setup` names, and restart the OpenCode service. `azure.pat`
can hold the PAT instead; the
installer keeps `settings.json` at mode 600. A file only you can read protects
the PAT from other accounts, not from programs you run yourself, so keep its
scopes minimal and its lifetime short. Keep the PAT out of this repository,
shared settings profiles, chat and environment variables that child processes
inherit. Behind a corporate proxy, also set `azure.proxy`, and `azure.caFile`
when the proxy inspects HTTPS (see
[proxies and TLS inspection](docs/AZURE_DEVOPS.md#proxies-and-tls-inspection),
and [company networks](docs/ENTERPRISE.md#company-networks) for package
downloads and model providers).

Reviewers read source through six read-only AZPR tools (`azpr_read_diff`,
`azpr_read_file`, `azpr_search_code`, `azpr_find_files`, `azpr_list_files`,
`azpr_pr_threads`) that are visible only in AZPR's private sessions; other
tools, including other MCP servers, are hidden from them. They start from each
file's diff, read whole files only for the context a change needs, search the
repository's contents at the PR's commit for callers, definitions and the code
a test exercises, and see the PR's commit messages. See
[Azure DevOps access](docs/AZURE_DEVOPS.md) for the API list, versions and
troubleshooting.

## Commands

| Command | Behavior |
| --- | --- |
| `/pr-setup [options]` | Set AZPR up, or change its settings. Without options, the terminal UI asks in dialogs and checks the token with Azure DevOps (other clients get the instructions). With options: an organization, one model and an existing PAT file, or one setting per option, or `--migrate <word>` alone to confirm the [update of settings of 0.4.x](#upgrading-from-04x), without an Azure request. No model request either way. A first setup is loaded at once; a later change needs a restart of the OpenCode service. |
| `/pr-check <PR URL> [context]` | Deterministic readiness check: PR metadata, changed files, a HEAD and BASE file read, discussions, each mode's passes and which model rates, and model availability (configured quick and deep models only as warnings, and whether `/pr-deep` is off or would repeat `/pr-review`), and `afterReview` (the configured modes and posting identity, shown as information); warns when OpenCode has no permission hook to keep native read tools inside the project. No model is used. |
| `/pr-review <PR URL> [flag] [context]` | One review pass per model of `models.review.reviewers`, then the duplicate check and the severity rating. Findings are reported, not verified. |
| `/pr-deep <PR URL> [flag] [context]` | The same review with the models of `models.deep.reviewers`: stronger models, a higher variant or more passes. Off while that list is empty. |
| `/pr-quick <PR URL> [flag] [context]` | The same review with the models of `models.quick.reviewers`, usually one pass of a fast model. Off while that list is empty. |
| `/pr-stop [run-id]` | Cancel this conversation's active command. The terminal panel offers the same while a run is under way (**Stop this run…**). |
| `/pr-comment [review-id]` | Preview comments for this conversation's current review. |
| `/pr-comment [review-id] --publish` | Post the saved preview. A review that was never adjusted is planned first if needed; an adjusted one needs its new preview. Safe to repeat. |
| `/pr-comment [review-id] --show` | Show the saved preview again; no model or Azure DevOps request. |
| `/pr-comment [review-id] --exclude <IDs>` / `--severity <ID=level,…>` / `--reset` | Leave findings out or change their severity after reading the preview, then preview again, for example `--exclude F-1,F-2` (see [adjusting findings](docs/COMMENTING.md#adjusting-findings-after-a-preview)). |
| `/pr-comment --list` | The reviews saved for this conversation, with their IDs, PRs and state; no model or Azure DevOps request. |
| `/pr-comment … --seen <word>` | What the terminal panel adds to the commands it sends: the word names the preview and the adjustments its step was offered for, and the command is refused when they have changed since. A typed command needs none. |
| `/<command> --help` | The command's usage and examples; no model or Azure DevOps request. |

A `/pr-comment` command without a review ID acts on the conversation's
**current review**: the one completed or used there last (in one of a review's
own sessions, that review). Its STARTED notice and receipt name the review and
its PR, and a preview ends with the commands for the next step. OpenCode's
command list shows one line per command and cuts what does not fit, so the
options are in `--help`.

Supported PR URLs are `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`
and `https://<org>.visualstudio.com/[DefaultCollection/]<project>/_git/<repo>/pullrequest/<id>`.
The optional flag of a review command, `--preview`, `--publish` or
`--no-comment`, comes right after the URL and sets [`afterReview`](#automatic-comments)
for that run only; `/pr-check` takes none. Anything else there that looks like
an option (`--no-coment`, `-p`) is refused, so start your context with a word.
Text after the URL (and the flag) is supplementary context for that command
only. PR content, comments and tool responses are untrusted data.

<details>
<summary>Status meanings: COMPLETE, STALE, PARTIAL, and what a receipt states</summary>

- **COMPLETE**: at least one review session produced a usable result (a
  parsed answer is not enough) and no source-commit change was detected.
  Only COMPLETE reviews can be commented on.
- **STALE**: the PR source commit changed during the review; run a new one.
- **PARTIAL**: review sessions answered, but none produced a usable result;
  what they wrote is shown for reference only.
- **INCOMPLETE / CANCELLED / TIMED_OUT**: the command did not finish. A
  review ends INCOMPLETE when every review session failed; an INCOMPLETE
  review whose reviewers had answered keeps their observations as an
  unconfirmed draft.

A finding is **REPORTED** when it passed the runtime's checks (its fields, a
location that exists at that commit, a file its session read), **NEEDS_INFO**
when it did not, and **MERGED** when it repeats another finding, which it
names. Only REPORTED findings can be commented on. None of these says that a
finding was verified: each was checked by its reviewer against the source and
by the runtime for form and source only.

A receipt states status, coverage and verification separately. It starts like
`[AZPR 1a2b3c4d] COMPLETE; coverage complete; verification none`, and with
several passes like `[AZPR 1a2b3c4d] COMPLETE; coverage complete, 12/12
file(s) in every pass; verification none`. Coverage says whether every changed
file was reviewed in at least one pass, so zero findings never hide unreviewed
files; the second number says how many files every pass reviewed, which a
failed pass lowers. A reviewer whose answer is PARTIAL and names unfinished
work is asked once, in the same session, to continue (receipt
`follow-up=completed`, `still-partial`, `unusable` or `failed`); a follow-up
that fails or gives no usable answer keeps the answer it followed. In every
stage, a correction turn that fails or gives no usable answer keeps the
latest usable answer, with the items it would have repaired degraded
(`repair=failed:<class>`).

A failed final version recheck adds a warning; it does not by itself prevent
COMPLETE in any review mode. Read the receipt warnings. Publication separately
rechecks that the PR's source commit is unchanged before posting.

</details>

In OpenCode's terminal UI, `/pr-panel` shows or hides the
[terminal panel](#terminal-panel); it runs no model and makes no Azure DevOps
request.

## Terminal panel

OpenCode shows what a plugin tells a conversation as plain text, so a report
or a comment preview appears there as Markdown source. In OpenCode's terminal
UI, AZPR therefore adds a panel beside the conversation: it shows the newest
report or preview rendered, lists the sessions of the review so that you can
open one, and lists at its foot what you can do next (stop a run that is
under way; after a preview, post it or adjust its findings), so that you pick
a step instead of typing its command. The
[recording of a real review](docs/DEMO.md#the-terminal-panel) shows the report
and the conversation side by side.

- **It opens by itself** when a review or a comment run starts and when a
  report or preview arrives, in the conversation that is on screen. The
  keyboard stays with the prompt, so the next command can be typed while the
  report is in view. To have it open only when you ask, set `terminalPanel`
  in the [settings](#all-settings-and-defaults):

  ```json
  "terminalPanel": "manual"
  ```

- **Sessions.** While a review runs, each of its sessions is a row with its
  state: `running` while its model works, `finished` once it has answered, and
  the stage's result (`complete`, `failed`) when the run's receipt names it.
  Click a row to open that session; OpenCode opens it in a tab, and the
  panel is there again when you return to the conversation. After the review
  the rows are the sessions that still exist (see
  [retention](#retention-and-privacy)), first the one that holds the report.
  OpenCode's own session list has them too.
- **Report or preview.** Below the sessions: the report of the review, then
  the comment preview once one is planned, and the saved preview again after
  `/pr-comment --show`. A check (`/pr-check`) shows its table there too. A
  preview that is planned again is shown from its beginning.
- **What you can do next** is one row at the foot of the panel, where reading
  ends. It stays in place while the text scrolls and is level with OpenCode's
  status bar:

  ```text
  [p] Post 4 comments…   [a] Adjust findings…   [u] Reset adjustments
  ```

  Click one, or press its key while the panel has the keyboard; the keys are
  drawn dim while they would only type a letter into the prompt. A label that
  ends in `…` asks before anything is sent: posting asks once more, with "No,
  post nothing" first, and adjusting opens the findings as a list, where you
  pick one to leave it out or to choose its level and then apply everything
  at once (**apply** at the foot of the list, `ctrl+s`, or the list's last
  row). **Reset adjustments** is there once you have adjusted something and
  clears all of it. After a review that no preview follows by itself
  (`afterReview: none`), the row offers **Preview comments** (`c`) instead of
  posting. Each of them sends the `/pr-comment` command you would type, for
  the review shown, and its STARTED notice and receipt follow as always. A
  click there leaves the keyboard with the prompt. If the preview is planned
  again, or another session comes on screen, while a question is open, the
  answer is not acted on and the panel says so. Each command also says which
  preview and adjustments it was picked for (`--seen`), and AZPR refuses it
  when they are others by now, for instance after a command typed in the
  review's own session or in another client: nothing is posted that you have
  not read.

  While a run is under way (a review, a preview that is being planned, a
  publication), the row offers one thing instead:

  ```text
  [s] Stop this run…
  ```

  It asks first, with "No, let it run" first, and then sends `/pr-stop` for
  that run, as if you had typed it: the run ends with its `CANCELLED`
  receipt, and requests that were already sent may still be billed. If the
  run has ended while the question was open, nothing is sent and the panel
  says so. A run that an earlier AZPR started is stopped by typing the
  command its STARTED notice shows.
- **Keys.** `/pr-panel` shows and hides the panel; it is the panel's only
  command. A click inside its text gives it the keyboard: the arrow keys or
  `j` and `k`, Page Up and Page Down, Home and End scroll, `p`, `a`, `u`,
  `c` and `s` pick what the foot offers, and Escape or `q` closes it.
- **A narrow terminal** (fewer than 108 columns) has no room for two panes,
  and OpenCode would show the panel in place of the conversation. There the
  panel does not open by itself; it says that something is ready, and
  `/pr-panel` shows it full screen.

The panel shows what AZPR already put into your conversation and into the
session that holds a report. It sends nothing by itself and never a prompt:
the one thing it sends is the command of a step you pick (`/pr-comment`, or
`/pr-stop` for a run under way), which AZPR takes like a typed one, and
posting and stopping always ask first. It comes with
the package and needs no setup; `terminalPanel` is its one setting. Other
OpenCode clients, such as the desktop app, do not load it and show AZPR's
notices as before. The same terminal part brings the
[setup dialogs](#setup-in-the-terminal-ui).

## Comments

`/pr-comment` plans one general summary plus inline comments for high
and medium findings (low findings stay in the summary index). Planning runs in
pages of at most four findings (more only where one defect at several places
keeps its findings together), two pages at a time, and the pages are joined
in page order, so the result does not depend on which page finishes first; each
page may get a correction turn, and an item that still cannot be posted
faithfully is skipped with a reason instead of failing the command. Inline
titles start with `🔴 high:` or `🟡 medium:` followed
by **📝 Summary**, **🔎 Evidence** and **💡 Suggested fix**; the summary starts
with a 🤖 AI/model disclosure and may carry improvement suggestions. The
disclosure line of every comment says how the review was made: `Review method:
findings checked by their reviewer against the source, no separate
verification` (and, in the summary, incomplete coverage). An inline comment
needs a location on a changed HEAD file. The comments of a review that 0.4.x
saved keep the wording of that version (see [commenting](docs/COMMENTING.md)).

One mistake is often made at several places of a pull request: the same wrong
call in each handler, the same stale text in each copy. Each place is a
finding of its own, and the planner may give such findings one inline comment
instead of a thread per place. The comment stands at the place that shows the
mistake most clearly, and AZPR lists every other place under it:

```text
**📍 Also at** (the same defect; fix these places with it):
- `/src/orders/refund.ts:41-44` (F-3)
- `/src/orders/cancel.ts:18` (F-5)
```

The findings must have the same severity and need the same correction; places
that need different corrections keep their own comments. Every place keeps
its row in the summary index, and you can still exclude or regrade each one
after a preview. A shared comment has a marker of its own, so it counts as
already posted only when this very comment, with every place, is on the pull
request; and a shared comment and a comment for one place are not planned
onto the same quoted lines (see
[one defect at several places](docs/COMMENTING.md#one-defect-at-several-places)).

### Adjusting findings after a preview

When a preview contains findings you disagree with, leave them out or change
their severity, then read the new preview. In the terminal UI, **Adjust
findings…** at the foot of the panel does this from a list of the findings.
With commands, several IDs go in one list, separated by commas:

```text
/pr-comment --exclude F-1,F-2                     leave F-1 and F-2 out
/pr-comment --severity F-3=low,F-4=medium         publish F-3 as low and F-4 as medium
/pr-comment --exclude F-1,F-2 --severity F-3=low  both in one command
/pr-comment --exclude none                        put every finding back
/pr-comment --reset                               undo every adjustment
```

The commands act on the conversation's current review; put a review ID first
to adjust another one (`/pr-comment 1a2b3c4d --exclude F-1`). The finding IDs
are those of the report and the preview, and `f1` reads as F-1.

Changed adjustments trigger new model planning when findings remain, so
combine both options in one command when you use both. Repeating the saved
adjustments changes nothing and does not plan again. Comments are planned
without the excluded findings and with the new severities, so their wording
may change; the summary index follows them, and nothing on the PR mentions the
adjustment. Each option replaces its whole saved list: `--exclude F-1` and then
`--exclude F-2` excludes only F-2. A changed severity changes how a finding is
published, not the finding itself; when a finding is wrong, exclude it.
Excluding every finding posts nothing. `--reset` clears the adjustments, and
`/pr-comment --show` shows the saved preview without a model. An
adjusted review is posted only from the preview planned after its latest
adjustment; once its publication has started, it is neither adjusted nor
planned again. Comments that an earlier publication put on the PR are never
changed: they are skipped as always, and the receipt of an adjusted review
names those whose text differs from the preview. See
[adjusting findings](docs/COMMENTING.md#adjusting-findings-after-a-preview).

### Automatic comments

By default a comment preview follows a COMPLETE review: it shows the comments
as they would be posted and posts nothing, and you post them with
`/pr-comment --publish`. `afterReview` sets, per mode, what follows a COMPLETE
review, and a flag right after the PR URL sets it for one run:

```json
{ "afterReview": { "quick": "preview", "review": "preview", "deep": "none" } }
```

```text
/pr-review <PR URL>               what afterReview.review says (a preview unless you changed it)
/pr-review <PR URL> --preview     plan a preview after a COMPLETE review
/pr-review <PR URL> --publish     plan and post the comments after a COMPLETE review
/pr-review <PR URL> --no-comment  nothing follows this review, whatever afterReview says
```

Set a mode to `none` when you mostly read the report and comment rarely, for
example for `/pr-deep` with a costly model: the preview is planned by that
mode's first reviewer model, one request for about four findings. A settings file
that names `afterReview` keeps its values on an upgrade; one that does not,
such as the file `/pr-setup` writes, follows this default.

The step runs after the review's receipt as a separate comment command with
its own run ID, `STARTED` notice and receipt; `/pr-stop` stops it like any
command. It is the same planning and publication as `/pr-comment`, so a
preview uses a model, and `/pr-comment --publish` later posts exactly that
preview. Nothing follows a review that is not COMPLETE, or that was stopped
while its report was delivered. A review without
findings to comment on gets one notice instead, with no planning, model
request or comment. When another AZPR command is running in the conversation
or on the PR, the step is skipped and the notice names the command to run.

Automatic publication posts as the PAT owner, item by item, and holds back
for a person every item whose text could notify someone, load content or run a
script; a plan that would post nothing new posts nothing (`NOTHING_TO_POST`).
A command you type, such as `/pr-comment --publish`, posts every item of the
saved preview, held ones included.

<details>
<summary>What automatic publication holds back, exactly</summary>

A comment (or the
summary) whose text contains an `@<…>` mention, an image, HTML that embeds
content or runs a script (such as `<img>`, `<iframe>`, `<script>`, or an
`on…=`, `src=` or `style=` attribute, read as a browser reads a tag), HTML
that hides text (a comment, `<!…>`, `<?…>` or `</` without a tag name), or a
`javascript:`, `vbscript:`, `data:` or `file://` link waits in the saved
preview for a person;
the other items are posted, and the receipt names each held item and why. The
checks prefer a false alarm and also decode escapes and character references
in script links and mentions, and read a link without tabs and line breaks, as
a browser does (`java&#9;script:` is a script link). Ordinary web and mail
links, markup that neither
loads content nor runs a script (such as `<input name="id">` or
`List<String>`), and literal code (fenced code blocks and code spans, such as
`` `<img src="a.png">` ``) are posted; only mentions are checked in code too,
since Azure DevOps may resolve them anywhere. Where a renderer could read the
code differently, for example a fence inside a list, code next to an HTML
line, or a backtick that a link or tag could take, the text is checked as
written.
Every comment is posted with the disclosure that no separate verification
ran, and the summary names incomplete coverage; leave `afterReview` at
`preview` to read the comments first.
When every finding is already discussed on the PR, typically by AZPR's own
comment from an earlier run, there is nothing new to post: the receipt says
`NOTHING_TO_POST` and the plan is saved (the summary's marker follows the
inline comments, so re-reviewing an unchanged PR would otherwise add a summary
each time). Publication itself still rechecks that the PR's source commit is
unchanged. A command you type, such as `/pr-comment --publish`, posts
every item of the saved preview, held ones included.

</details>

### Publication

Publication is runtime code: it refuses a changed source commit, lists every
existing thread, skips items whose hidden marker already exists, creates the
rest with the exact saved text, and reads the markers back. The PR's status
stops nothing: a PR that was completed or abandoned, such as one merged before
its review was commented on, is reviewed and takes comments like an active
one, and the receipt names that status.
Markers are stable fingerprints of PR, file and anchored lines, so a later
review of unchanged code does not post duplicates. A failed or uncertain item can
simply be published again; a comment someone deleted on the PR is reported as
`DELETED` and not posted again. See [commenting](docs/COMMENTING.md).

## Retention and privacy

Completed reviews, previews, publication ledgers and their source excerpts are
kept under `${XDG_STATE_HOME:-~/.local/state}/opencode/azpr-v2/` with owner-only
permissions. The newest 20 reviews are kept; older ones and stale scratch data
are removed automatically. A receipt that cannot reach the conversation is saved
under `receipts/` there. `/pr-comment` only accepts reviews started in the same
conversation (or from one of that review's sessions). Reviews that 0.4.x
saved stay usable: they can be listed, shown, previewed and published, with
the comment wording of the version that made them.

AZPR's private reviewer sessions are sessions of their own, not children of
your conversation: OpenCode 2.3.0 and later hand every answer of a child
session to its parent and let the parent's model respond to it. OpenCode therefore lists them
next to your conversations, titled `[AZPR <id>] …`, and does not delete
sessions by itself, so AZPR removes them (`deletePrivateSessions`, on by
default). When a review ends, only the session that holds its report or draft
stays, which is the one the receipt names, and the other sessions are deleted
at once; a comment run keeps none, since its receipt carries the preview or
the publication result. That one session goes when its review is evicted (a
review that did not complete follows the same limit of 20 runs). A session
OpenCode did not delete when asked stays on record: it goes with its review,
or, when no review keeps it, takes no AZPR commands and is tried again after
every later run. While debug is enabled every session is kept until its
review is evicted, so turn `debug.enabled` off for everyday use if the list
gets long. A review that an OpenCode restart interrupts leaves its sessions in
the list; delete those yourself. Your own conversations are never deleted.
With a `claude-agent` model, Claude Code also keeps a transcript of every
session under its own configuration directory (`~/.claude/projects/` by
default), with what AZPR sent, source excerpts of the PR included. Deleting
the OpenCode session does not delete it: Claude Code's cleanup does (after 30
days by default). The folder of a working directory there also holds the
transcripts of your own Claude Code conversations in that directory, so do
not delete it to be rid of a review's; the
[team guide](docs/ENTERPRISE.md#local-records-and-cleanup) says what can be done sooner.
A conversation nobody named yet, which OpenCode lists as **New session**, is
named after the PR when its first check or review starts
(`AZPR: PR #123 (repository)`): an AZPR command never makes the conversation's
own model run, which is what names a conversation otherwise. A conversation
that has a name keeps it. OpenCode has no rename that applies only to an
unnamed conversation, so AZPR follows the renames OpenCode reports: a name
that you or OpenCode's model give in that very moment is written back where
AZPR's own may have replaced it. What that cannot rule out is said in
[the architecture](docs/ARCHITECTURE.md#authorization-and-isolation).
In the terminal UI you need not look for these sessions in the list: the
[terminal panel](#terminal-panel) names those of the latest review and opens
the one you click.

## Development and removal

See [Contributing](CONTRIBUTING.md) for bug reports and development checks,
[Security](SECURITY.md) for private vulnerability reporting, and the
[code of conduct](CODE_OF_CONDUCT.md) for community conduct.

```sh
npm ci
npm run check
npm test
node tests/host-v2-smoke.mjs /absolute/path/to/opencode
node tests/host-v2-smoke.mjs /absolute/path/to/opencode --replace
node tests/host-v2-smoke.mjs /absolute/path/to/opencode --native
node tests/host-v2-comment-scale.mjs /absolute/path/to/opencode
node tests/host-v2-background-compaction.mjs /absolute/path/to/opencode
node tests/host-v2-comment-scale.mjs /absolute/path/to/opencode --cleanup
node tests/host-v2-background-compaction.mjs /absolute/path/to/opencode --cleanup
node tests/host-v2-tui-panel.mjs /absolute/path/to/opencode
node tests/host-v2-tui-panel.mjs /absolute/path/to/opencode --native
node tests/host-v2-tui-setup.mjs /absolute/path/to/opencode
node tests/host-v2-tui-setup.mjs /absolute/path/to/opencode --native
node tests/host-v2-tui-setup.mjs /absolute/path/to/opencode --migrate
node tests/host-v2-tui-setup.mjs /absolute/path/to/opencode --migrate --native
sh uninstall.sh --config-dir /absolute/path/to/v2-opencode-config
sh uninstall.sh --config-dir /absolute/path/to/v2-opencode-config --apply
```

The host fixtures run a real OpenCode binary with a loopback fake model provider
and a loopback fake Azure DevOps REST service in disposable directories under
`.local/`. They keep debug on to read its records, and debug keeps every
private session; the two `--cleanup` runs turn it off, so that each run deletes
its sessions as an installation with default settings does. The
`host-v2-tui-panel` and `host-v2-tui-setup` runs drive the real terminal UI in
`tmux`, which they need, each once installed from source and once as
OpenCode's plugin manager installs the package; with `--migrate` the setup
runs start from settings of AZPR 0.4.x and confirm their update. `npm ci` installs the compiler of the terminal panel's JSX, which only
`npm run check` and `npm run build:tui` use; the installed plugin has no
dependency and is not built on your machine.
Uninstall without `--apply` previews; `--apply` archives only this package under
`azpr-v2-backups` and leaves the private state directory for you to delete.
For a native installation, remove the entry you added, for example
`opencode plugin remove opencode-azure-devops-pr-review@0.5.1` or
`opencode plugin remove 'github:WTLAIB/opencode-azure-devops-pr-review-v2#v0.5.1'`;
the external settings, PAT file and private review state remain available.

[Architecture](docs/ARCHITECTURE.md), [commenting](docs/COMMENTING.md),
[Azure DevOps access](docs/AZURE_DEVOPS.md), [verification](docs/VERIFICATION.md),
[debugging](docs/DEBUGGING.md), [roadmap](docs/ROADMAP.md),
[current validation](docs/VALIDATION.md) and [AI maintenance guidance](AGENTS.md)
describe the current behavior. Never commit `.local/`, diagnostics, credentials
or personal model selections.

## License and releases

[MIT](LICENSE), copyright 2026 WTLAIB. See the [changelog](CHANGELOG.md) for the
release scope, [v0.5.1](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/releases/tag/v0.5.1)
for downloads, the [npm package](https://www.npmjs.com/package/opencode-azure-devops-pr-review),
the [demo page](docs/DEMO.md) for the recordings and the version each was made
with, and [releasing](docs/RELEASING.md) for the release process.
