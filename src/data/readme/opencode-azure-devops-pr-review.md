# Azure DevOps PR Review for OpenCode

[![CI](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/actions/workflows/ci.yml?query=branch%3Amain)
[![npm](https://img.shields.io/npm/v/opencode-azure-devops-pr-review)](https://www.npmjs.com/package/opencode-azure-devops-pr-review)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tested with OpenCode 2.1.4](https://img.shields.io/badge/OpenCode-2.1.4%20tested-blue)](docs/VALIDATION.md)

**Review Azure DevOps pull requests from a URL. No checkout required.**

Review across repositories in your configured Azure DevOps organization without
managing a local clone of each project. AZPR uses your OpenCode models to inspect
the changes, check findings, and prepare inline comments you can preview before
publishing. No MCP server or CI pipeline setup is required.

AZPR is an independent community project. It is not built by or affiliated with
the OpenCode team.

[Get started](docs/QUICKSTART.md) · [See the demo](docs/DEMO.md) ·
[Team setup and data handling](docs/ENTERPRISE.md) ·
[Validation and limitations](docs/VALIDATION.md) ·
[Download v0.2.3](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/releases/tag/v0.2.3)

[![Real OpenCode review, comment preview and verified publication on a dedicated Azure test PR.](docs/assets/live-review-teaser.gif)](docs/DEMO.md)

*A 12-second edit of a real OpenCode 2.1.2 run. Watch the
[73-second walkthrough](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/releases/download/v0.2.0/azpr-live-demo.mp4)
or read the [demo and recording details](docs/DEMO.md). Waiting time is shortened;
the Azure portion shows an actual REST read-back in a terminal.*

## Why AZPR?

- **Follow the code beyond the diff.** Reviewers can look up definitions,
  callers and tests using file reads and text search at the selected PR commit,
  without depending on an Azure Code Search index.
- **Give findings a separate check.** Functional and risk reviewers propose
  findings; independent verifier sessions re-read the source and look for
  counterevidence. Quick mode skips this second check when you want a lighter
  pass.
- **Choose where to spend model effort.** Assign different OpenCode models to
  functional review, risk review and verification, or use one model for all
  roles. Keep a stronger model profile for selected PRs with `/pr-deep`.
- **Control what reaches the PR.** Preview the summary and inline comments,
  then publish when ready. The runtime rechecks the PR head, skips comments
  already published by AZPR and reads new comments back. Automatic publication
  is available when you opt in.
- **Configure the Azure connection for your network.** Set a forward proxy and
  additional CA certificates for AZPR's Azure DevOps requests. Model-provider
  connections remain configured in OpenCode.

Content search downloads a bounded repository archive into memory; source
context is sent through your selected model providers, and review records are
saved locally. See [content-search limits](docs/AZURE_DEVOPS.md#who-calls-what)
for archive and file-size bounds, and [team setup and data handling](docs/ENTERPRISE.md)
for proxy authentication and retention.

## Your first review

1. Install the npm package using OpenCode's plugin manager:

   ```sh
   opencode plugin add opencode-azure-devops-pr-review@0.2.3
   ```

2. Follow the [quickstart](docs/QUICKSTART.md) to save your PAT in a private
   file and run `/pr-setup` with your organization and one model. Restart the
   OpenCode service to load the settings.
3. In one OpenCode conversation, check access, then review and preview:

   ```text
   /pr-check https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_git/YOUR_REPO/pullrequest/123
   /pr-review https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_git/YOUR_REPO/pullrequest/123 --preview
   ```

Replace the sample URL with your PR. Wait for `/pr-check` to report `READY`
before starting the review; it uses no model. The review runs functional and risk
reviewers, then separate verification. If the completed review has findings to
comment on, `--preview` prepares their comments in a separate, cancellable run.
**Nothing is posted by these commands.** Previewing comments also uses a model.

Read the report and preview, then publish from the same conversation:

```text
/pr-comment REVIEW_ID_FROM_RECEIPT --publish
```

Use the review ID from the completed receipt. The command posts the saved
preview as the PAT owner. For a lighter first pass, use
`/pr-quick <PR URL> --preview`; its findings are not independently verified.

## Choose a review

| Command | Best starting point | What runs |
| --- | --- | --- |
| `/pr-quick` | Small or routine changes | One reviewer per shard covers function and risk. Findings are **reported, not independently verified**. |
| `/pr-review` | Changes that need an independent second check | Functional and risk reviewers, followed by separate verification sessions. |
| `/pr-deep` | Important or risky changes worth a stronger model | The same verified pipeline as `/pr-review`, run with the stronger models you set in `models.deep`; usually slower and costlier. |

All three modes use the same Azure comment layout. Quick comments disclose their
method. Separate verification adds scrutiny; it does not guarantee correct
findings or complete defect coverage. Mixing models is a choice about capability
and cost, not a proven accuracy improvement. See [model configuration](#configuration).

<details>
<summary>Sessions, model requests and cost</summary>

For a small PR that fits in one shard and one comment-planning page, quick
usually needs one review session plus one planning session; review needs two
reviewer sessions, a verifier, and comment planning. **Sessions are not API
requests:** each can make multiple requests, and repairs, retries, larger PRs
and extra planning pages add work. Previewing comments also uses a model.
See [measured runs and their limits](docs/VALIDATION.md) for cost and timing
examples, rather than treating a session count as a price guarantee.

</details>

## Is this the right workflow?

AZPR fits reviewers who already use OpenCode, review Azure DevOps Services PRs
on demand, and want to choose their models and inspect comments before posting.
It combines source retrieval, review stages and publication checks in one plugin.

If you need an unattended review on every PR event, look for a webhook or CI
integration; AZPR runs when you invoke a command. If your work includes editing
code or running the project's tests, use a local checkout for that work.

The [validation record](docs/VALIDATION.md) includes real model/Azure runs, a
316-file test PR, isolated OpenCode host checks, and an offline test suite for
runtime and packaging behavior. It also records missed defects and untested
environments. The demo shows the workflow; these checks do not establish a
general review-accuracy score.

## Compatibility

| Component | Tested target |
| --- | --- |
| OpenCode | **OpenCode CLI 2.1.4** (`@opencode/cli`; V2 plugin API). OpenCode 1.x is not supported. |
| Operating system | **Ubuntu 22.04** (validation environment: WSL2). Other operating systems are not yet validated. |
| Azure | **Azure DevOps Services**, REST API **7.1**. Azure DevOps Server is not supported by the current URL handling. |
| Installation | OpenCode's plugin manager with the npm package or the versioned Git package, or the source installer with POSIX `sh` and Python 3; no plugin build step or npm dependencies. |
| Models | Your OpenCode provider/model IDs with tool support. Each mode checks the models it uses. |

The npm package, the Git package and the release source archive contain the
same runtime. A fresh installation exposes `/pr-setup` before
reviewing is enabled; the [quickstart](docs/QUICKSTART.md) configures one model
for both quick and verified reviews.

## How reviews work

<details>
<summary>Review stages, recovery and saved results</summary>

1. The runtime reads the PR deterministically from Azure DevOps: identity, the
   latest iteration's source commit and merge base, and the complete
   changed-file list. Reviewers read the repository through AZPR's own
   read-only tools at exact commits.
2. Two full-scope reviewers (functional and risk) review the changed files in
   bounded **shards**. A shard that fills its model context is split in half
   and run again instead of failing. Reviewer sessions never compact, so
   OpenCode's opt-in `experimental.background_compaction` does not apply to
   them: AZPR refuses its summary requests before anything is sent.
3. A verifier independently re-checks every candidate finding against the
   source, sharded by finding. Answers that break the output contract get a
   short **correction turn** in the same session; whatever is still unusable is
   downgraded per finding (UNREVIEWED, NEEDS_INFO) instead of discarding the review.
   When findings that different verifiers confirmed end up in the same file (a
   verifier moved one there, or the file had more findings than one verifier
   holds), a short **duplicate check** with the verifier model merges only true
   duplicates; it never drops a finding.
4. The runtime rechecks the PR versions. Only a changed **source** commit makes
   the review STALE; a moved base is reported as a warning.
5. `/pr-comment` plans a preview with a model. With `--publish`, the runtime
   posts the saved text itself, skipping comments that already exist and
   reading every created comment back from Azure DevOps. Re-running a publish
   is safe. `afterReview` or a flag after the PR URL can start this step after
   a COMPLETE review ([automatic comments](#automatic-comments)).

`/pr-quick` is the lighter alternative for small or routine PRs: one reviewer
per shard covers both the functional and the risk focus and checks its own
findings against the source it read; no verifier or duplicate check runs. The
runtime checks only the form and source of those findings, so they are
reported, not verified, and the report, the receipt and the posted comments
say so. A small PR needs one review session (plus one planning session for
comments) instead of three; each session still makes several model requests.

`/pr-deep` is the heavier alternative for PRs that justify a stronger model: it
runs the same review as `/pr-review` with the models of `models.deep`, so its
depth comes from those models alone. On the test PRs a stronger model found
regressions that the everyday model missed, at many times its cost and time
(see [deep versus review](docs/VALIDATION.md#deep-versus-review-2026-10-19)).
`/pr-check` says when `/pr-deep` is off or its models repeat the review models.

Every command acknowledges `STARTED` immediately and continues in the current
OpenCode process; short `PROGRESS` notices and a final receipt return to the
invoking conversation. Use the displayed `/pr-stop <run-id>` to cancel.
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
opencode plugin add opencode-azure-devops-pr-review@0.2.3
```

The same release is also a versioned Git package, which needs Git but not the
npm registry:

```sh
opencode plugin add 'github:WTLAIB/opencode-azure-devops-pr-review-v2#v0.2.3'
```

Add only one of them. Restart OpenCode, then run `/pr-setup` for setup instructions. Native packages
use `${XDG_CONFIG_HOME:-~/.config}/azpr/settings.json`; configuration and the
separate PAT file stay outside the package cache when the plugin is updated.
To select another configuration file, use an absolute path in the host config:

```json
{
  "plugins": [{
    "package": "opencode-azure-devops-pr-review@0.2.3",
    "options": { "settingsFile": "/absolute/path/to/azpr/settings.json" }
  }]
}
```

Use one installation method per OpenCode profile. Existing source installations
can keep using `install.sh --replace`. To move one to the native package,
copy its settings to the external configuration path with owner-only
permissions, archive the old installation with its uninstaller, then add the
package. Keep the PAT file and private state directory in place.

To upgrade a native installation, change the version in its existing `plugins`
entry, for example from `#v0.2.2` to `#v0.2.3` for the Git package. To move a
Git installation to npm, replace that entry's Git specification with
`opencode-azure-devops-pr-review@0.2.3`. Both use the same external settings.
Preserve any `options.settingsFile` and other options; keep one AZPR entry.
Restart the OpenCode service to load the new version. External settings, the
PAT file and review records stay in place. Exact versions stay pinned, so
`opencode plugin update` leaves them unchanged. See the
[0.2.3 release notes](docs/releases/v0.2.3.md) for upgrade details and the
[0.2.0 release notes](docs/releases/v0.2.0.md) for automatic comments, which
remain disabled unless you configure `afterReview` or request them with a
review command flag.

### Source archive or checkout

<details>
<summary>Source installation and replacement</summary>

Download the [v0.2.3 source archive](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/archive/refs/tags/v0.2.3.tar.gz)
and extract it, or check out tag `v0.2.3`. The installer needs POSIX `sh` and
Python 3's standard library. From that source directory:

```sh
sh install.sh --config-dir /absolute/path/to/v2-opencode-config
```

The installer creates `plugins/azpr-v2/` with a generated ESM `package.json`
and a `server.js` entry that re-exports `plugin.js`. It never edits the main
OpenCode configuration, provider choices or MCP connections, and it refuses
conflicting legacy files, reserved command names and unowned packages. Run
`/pr-setup ... --replace` to configure the generated starter settings, or edit
them yourself before restarting OpenCode.

To replace an existing source installation (current settings are kept, new defaults
are added, and a retired `mcp` section is moved into `azure`):

```sh
sh install.sh --config-dir /absolute/path/to/v2-opencode-config --replace
```

</details>

### Manual copying without Git

Keep these relative paths under one source directory, then run its installer.
These **31 files** include the runtime and its license:

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
src/prompts/common.md
src/prompts/functional.md
src/prompts/risk.md
src/prompts/final.md
src/prompts/dedupe.md
src/prompts/quick.md
src/prompts/comment-policy.md
src/prompts/comment-plan.md
```

README, `docs/`, the changelog, the settings schema and `uninstall.sh` are optional.
Keep `LICENSE` with copied or redistributed packages.

</details>

## Configuration

Run `/pr-setup` to see the active settings path. Native packages use the
external configuration described above; source installations retain their
installed `plugins/azpr-v2/settings.json`. Edit that file and restart OpenCode.
A changed file blocks new commands until the restart; running commands keep the
settings they started with.

For initial setup, one command sets the organization, existing PAT file and
the same model for review and quick roles without calling a model or Azure:

```text
/pr-setup --organization YOUR_ORG --model YOUR_PROVIDER/YOUR_MODEL --pat-file "/absolute/path/to/pat"
```

An existing file requires `--replace`; unrelated advanced settings and deep
models are preserved. Setup checks the model catalog and PAT file before
saving. It never accepts the PAT itself as a command argument. Restart after
saving, then run `/pr-check` to verify Azure read access.

```json
{
  "models": {
    "review": {
      "functional": "YOUR_PROVIDER/YOUR_FUNCTIONAL_MODEL",
      "risk": "YOUR_PROVIDER/YOUR_RISK_MODEL",
      "verifier": "YOUR_PROVIDER/YOUR_VERIFIER_MODEL"
    },
    "deep": { "functional": "", "risk": "", "verifier": "" },
    "quick": { "reviewer": "" }
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
model does not offer. Without a variant the model's default is used. `/pr-deep`
needs all three deep models and never falls back to the review models; choose
models stronger than the review models there, since the models are the only
difference from `/pr-review`. Likewise `/pr-quick` needs `models.quick.reviewer`,
and a command checks only the models it uses, so an unavailable quick model
never blocks `/pr-review`. Comment planning uses the review's risk model
(`models.deep.risk` for a deep review, the quick reviewer for a quick review).

| Role | Focus and useful model capabilities |
| --- | --- |
| `functional` | Requirements, boundaries, state changes, API compatibility and regressions. Strong code comprehension in the project's language. |
| `risk` | Failures, retries, concurrency, authorization and data consistency. Evidence-based reasoning across call paths and reliable tool use. Also plans comments. |
| `verifier` | Independent source re-checks, counterevidence, duplicate merging (including the same-file duplicate check) and the final report. Strong evidence judgment and instruction following. |
| `quick.reviewer` | `/pr-quick` only: both focuses in one session per shard, its own source checks, and comment planning for quick reviews. Strong code comprehension, evidence judgment and reliable tool use. |

A role's focus orders its attention and is not a filter: every reviewer files
every concrete defect it finds, in any area, as a finding.

### All settings and defaults

<details>
<summary>Show the settings reference</summary>

| Setting | Default and meaning |
| --- | --- |
| `enabled` | `true`; `false` registers nothing. |
| `returnReport` | `receipt`; `full` also encloses the rendered report in the receipt. |
| `outputLanguage` | `en`; used by reviews, the report and comments. `zh-TW` for Traditional Chinese. |
| `runTimeoutSeconds` | `null` (no whole-command timer); an integer 10–7200 enables one. |
| `shell` | `deny`: private reviewers cannot run shell commands (the tool is hidden). `ask`: each command needs your approval in OpenCode. `inherit`: host permissions decide. |
| `progressNotices` | `true`: short PROGRESS notices in the invoking conversation. |
| `deletePrivateSessions` | `true`: AZPR deletes its private reviewer sessions once they are no longer needed (see [retention](#retention-and-privacy)); `false` keeps every session. |
| `afterReview.quick` / `.review` / `.deep` | `none` each: nothing follows a review; run `/pr-comment` yourself. `preview` plans a comment preview after a COMPLETE review of that mode (a model runs; nothing is posted); `publish` plans and posts it as the PAT owner; a comment that a safeguard holds back waits for a person. A flag after the PR URL overrides it for one run. See [automatic comments](#automatic-comments). |
| `azure.organization` | Required. The `<org>` of `https://dev.azure.com/<org>`; PR URLs of other organizations are refused. |
| `azure.pat` | A personal access token for that organization with **Code (Read)** and **Pull Request Threads (Read & write)**, or `""` when `azure.patFile` is set. Sent only to `https://dev.azure.com/<org>` and never logged. |
| `azure.patFile` | `""`. Recommended: the absolute path of a file that holds only the PAT, so `settings.json` holds no secret. It must be a regular file you own that only you can access (mode 600, not a symbolic link). AZPR reads it at start and before each command; after replacing it, restart OpenCode. Set either this or `azure.pat`. |
| `azure.concurrency` | `3` simultaneous Azure DevOps calls across all AZPR commands. |
| `azure.callTimeoutSeconds` | `120`; a hung call is aborted and its slot released (reads are retried). |
| `azure.archiveMegabytes` | `100` (1–1024): the largest repository zip that content search downloads per run and commit; a larger repository is not searched. It is held in memory during a review. |
| `azure.proxy` | `""`: no AZPR proxy (`HTTPS_PROXY` and `NO_PROXY` in OpenCode's environment still apply). A forward proxy for AZPR's Azure DevOps calls only, such as `http://proxy.example.com:8080`; credentials go in the URL as `http://user:password@host:port` (percent-encoded) and are never shown. See [proxies](docs/AZURE_DEVOPS.md#proxies-and-tls-inspection). |
| `azure.caFile` | `""`. The absolute path of a PEM file with CA certificates AZPR trusts in addition to the built-in roots, for a proxy that inspects HTTPS. |
| `azure.verifyTls` | `true`. `false` skips certificate checks for AZPR's Azure DevOps calls (like `curl -k`), so anyone who can intercept the connection can read the PAT; prefer `azure.caFile`. `/pr-check` warns while it is off. |
| `workflow.shardFiles` | `25` changed files per initial-review session. |
| `workflow.shardFindings` | At most `15` findings per verification session; one file's findings stay in the same session (a file is split only when it alone has more). |
| `workflow.parallelSessions` | `4` reviewer sessions at once within a command; comment planning runs at most two pages at once (one when this is `1`). |
| `workflow.repairAttempts` | `2` correction turns when an answer breaks the output contract. A quick review's one follow-up turn for unfinished work uses the same budget. |
| `workflow.stageRetries` | `1` new-session retry after a transient failure (provider 429/5xx, interrupted stream) or an inactivity stop. A used-up provider quota or OpenCode free-model limit is named and not retried, whatever its status. |
| `workflow.stageIdleSeconds` | `600` (`0` turns it off, otherwise 60–7200): a reviewer stage that shows no activity this long while it waits on OpenCode (the model stream, a tool or the host stopped responding) is stopped with `failure=idle` and an error naming its last activity, then retried in a new session. Every model request, streamed chunk of output, tool start or end and announced host retry restarts the window, so a stage that keeps working, including a long answer that keeps streaming, is never cut. With shell allowed, an approval or a command that takes longer counts as inactivity. |
| `debug.enabled` / `debug.directory` / `debug.keepRuns` | `false` / `""` / `20` run directories kept (`0` keeps all); see [debugging](docs/DEBUGGING.md). |

`steps`, `maxStageCharacters`, `structuredOutput`, `comments`,
`auxiliaryModels`, `outputRetries`, `verification` and `shellToolPermission`
are unsupported and rejected; `mcp` is retired (the installer moves its limits
into `azure`). There is deliberately no per-stage step cap; see the
[roadmap](docs/ROADMAP.md#deferred) for why. The inactivity watchdog
(`workflow.stageIdleSeconds`) is not one: it stops only a stage that stopped
working.

</details>

### Azure DevOps access

AZPR talks to the Azure DevOps Services REST API itself (api-version 7.1). Create
a PAT scoped to **one organization** (global "all accessible organizations"
PATs stop working on 2026-12-01) with **Code: Read** and **Pull Request Threads:
Read & write**, which cover every call AZPR makes, and give it an expiry you
renew. Keep it alone in a file that only you can read and point `azure.patFile`
at it, so `settings.json` holds no secret (the prompt does not echo the PAT and
it stays out of your shell history):

```sh
umask 077 && mkdir -p ~/.config/azpr
read -rs -p 'Azure DevOps PAT: ' AZPR_PAT && printf '%s' "$AZPR_PAT" > ~/.config/azpr/pat; unset AZPR_PAT; echo
```

Then set `"patFile"` to that file's absolute path (for example
`/home/you/.config/azpr/pat`) and leave `"pat"` empty in the installed
`settings.json`, and restart OpenCode. `azure.pat` can hold the PAT instead; the
installer keeps `settings.json` at mode 600. A file only you can read protects
the PAT from other accounts, not from programs you run yourself, so keep its
scopes minimal and its lifetime short. Keep the PAT out of this repository,
shared settings profiles, chat and environment variables that child processes
inherit. Behind a corporate proxy, also set `azure.proxy`, and `azure.caFile`
when the proxy inspects HTTPS (see
[proxies and TLS inspection](docs/AZURE_DEVOPS.md#proxies-and-tls-inspection)).

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
| `/pr-setup [options]` | Show setup guidance or save an organization, one model and an existing PAT file. No model or Azure request. Restart the OpenCode service after saving. |
| `/pr-check <PR URL> [context]` | Deterministic readiness check: PR metadata, changed files, a HEAD and BASE file read, discussions and model availability (configured quick and deep models only as warnings, and whether `/pr-deep` is off or would repeat `/pr-review`), and `afterReview` (the configured modes and posting identity, shown as information); warns when OpenCode has no permission hook to keep native read tools inside the project. No model is used. |
| `/pr-review <PR URL> [flag] [context]` | Sharded functional and risk reviews, then sharded verification. |
| `/pr-deep <PR URL> [flag] [context]` | The same review with the stronger models of `models.deep`; usually slower and costlier. |
| `/pr-quick <PR URL> [flag] [context]` | One reviewer per shard for both focuses, no verification; findings are reported, not verified. |
| `/pr-stop [run-id]` | Cancel this conversation's active command. |
| `/pr-comment [review-id]` | Preview comments for this conversation's latest completed review. |
| `/pr-comment [review-id] --publish` | Post the saved preview (planning it first if needed). Safe to repeat. |

Supported PR URLs are `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`
and `https://<org>.visualstudio.com/[DefaultCollection/]<project>/_git/<repo>/pullrequest/<id>`.
The optional flag of a review command, `--preview`, `--publish` or
`--no-comment`, comes right after the URL and sets [`afterReview`](#automatic-comments)
for that run only; `/pr-check` takes none. Anything else there that looks like
an option (`--no-coment`, `-p`) is refused, so start your context with a word.
Text after the URL (and the flag) is supplementary context for that command
only. PR content, comments and tool responses are untrusted data.

Status meanings:

- **COMPLETE**: verification produced structured decisions and the PR source did
  not change. Findings without a usable decision are listed as UNREVIEWED and
  are never posted. Only COMPLETE reviews can be commented on.
- **STALE**: the PR source commit changed during the review; run a new one.
- **PARTIAL**: no verification session produced a structured result; initial
  observations are shown for reference only.
- **INCOMPLETE / CANCELLED / TIMED_OUT**: the command did not finish; a review
  keeps an unconfirmed draft of finished initial work.

A quick review states its status, coverage and verification separately; its
receipt starts like `[AZPR 1a2b3c4d] COMPLETE; coverage incomplete;
verification none (quick review)`. COMPLETE means at least one shard produced a
usable result (a parsed answer is not enough) and the source did not change;
its findings are REPORTED when they passed the runtime's checks (fields, a
location that exists at that commit, a file the session read) and NEEDS_INFO
otherwise, and only REPORTED ones can be commented on. Coverage says whether
every changed file was reviewed, so zero findings never hide unreviewed files.
A quick reviewer whose answer is PARTIAL and names unfinished work is asked
once, in the same session, to continue (receipt `follow-up=completed`,
`still-partial`, `unusable` or `failed`); a follow-up that fails or gives no
usable answer keeps the answer it followed. When the quick review found a
high-severity issue or left coverage incomplete, the receipt suggests
`/pr-review` before publishing; the hint is advisory, also when automatic
publication follows (see [automatic comments](#automatic-comments)).

## Comments

`/pr-comment` plans one general summary plus inline comments for confirmed high
and medium findings (low findings stay in the summary index). Planning runs in
pages of at most four findings, two pages at a time, and the pages are joined
in page order, so the result does not depend on which page finishes first; each
page may get a correction turn, and an item that still cannot be posted
faithfully is skipped with a reason instead of failing the command. Inline
titles start with `🔴 high:` or `🟡 medium:` followed
by **📝 Summary**, **🔎 Evidence** and **💡 Suggested fix**; the summary starts
with a 🤖 AI/model disclosure and may carry improvement suggestions. Comments of
a quick review keep this layout; their disclosure line adds `Review method:
quick review, not independently verified` (and, in the summary, incomplete
coverage), and their inline comments need a location on a changed HEAD file.
When two shards of a quick review report one defect, the planner may combine
them into one comment under fixed rules (see [commenting](docs/COMMENTING.md)).

### Automatic comments

By default nothing follows a review: you preview with `/pr-comment` and post
with `/pr-comment <id> --publish`. `afterReview` sets, per mode, what follows
a COMPLETE review, and a flag right after the PR URL sets it for one run:

```json
{ "afterReview": { "quick": "preview", "review": "none", "deep": "none" } }
```

```text
/pr-review <PR URL> --preview     plan a preview after a COMPLETE review
/pr-review <PR URL> --publish     plan and post the comments after a COMPLETE review
/pr-review <PR URL> --no-comment  nothing follows this review, whatever afterReview says
```

The step runs after the review's receipt as a separate comment command with
its own run ID, `STARTED` notice and receipt; `/pr-stop` stops it like any
command. It is the same planning and publication as `/pr-comment`, so a
preview uses a model, and `/pr-comment <id> --publish` later posts exactly that
preview. Nothing follows a review that is not COMPLETE, or that was stopped
while its report was delivered. A review without
findings to comment on gets one notice instead, with no planning, model
request or comment. When another AZPR command is running in the conversation
or on the PR, the step is skipped and the notice names the command to run.

Automatic publication posts as the PAT owner, item by item. A comment (or the
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
written. A
quick review is posted when you chose
it: its comments keep the disclosure `quick review, not independently
verified`, and its summary names incomplete coverage; its verification hint
is advisory (set `afterReview.quick` to `preview` to read the comments first).
When every finding is already discussed on the PR, typically by AZPR's own
comment from an earlier run, there is nothing new to post: the receipt says
`NOTHING_TO_POST` and the plan is saved (the summary's marker follows the
inline comments, so re-reviewing an unchanged PR would otherwise add a summary
each time). Publication itself still rechecks that the PR is active and
unchanged. A command you type, such as `/pr-comment <id> --publish`, posts
every item of the saved preview, held ones included.

### Publication

Publication is runtime code: it refuses an inactive PR or a changed source
commit, lists every existing thread, skips items whose hidden marker already
exists, creates the rest with the exact saved text, and reads the markers back.
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
conversation (or from one of that review's sessions).

OpenCode does not delete sessions by itself, so AZPR removes its private
reviewer sessions (`deletePrivateSessions`, on by default): a completed review's
sessions go when the review is evicted, since `/pr-comment` needs them until
then. A review that did not complete keeps only the session holding its report
or draft (every session while debug is enabled), and these kept sessions follow
the same limit of 20 runs. Your own conversations are never deleted.

## Development and removal

See [Contributing](CONTRIBUTING.md) for bug reports and development checks,
[Security](SECURITY.md) for private vulnerability reporting, and the
[code of conduct](CODE_OF_CONDUCT.md) for community conduct.

```sh
npm run check
npm test
node tests/host-v2-smoke.mjs /absolute/path/to/opencode
node tests/host-v2-smoke.mjs /absolute/path/to/opencode --replace
node tests/host-v2-smoke.mjs /absolute/path/to/opencode --native
node tests/host-v2-comment-scale.mjs /absolute/path/to/opencode
node tests/host-v2-background-compaction.mjs /absolute/path/to/opencode
sh uninstall.sh --config-dir /absolute/path/to/v2-opencode-config
sh uninstall.sh --config-dir /absolute/path/to/v2-opencode-config --apply
```

The host fixtures run a real OpenCode binary with a loopback fake model provider
and a loopback fake Azure DevOps REST service in disposable directories under
`.local/`.
Uninstall without `--apply` previews; `--apply` archives only this package under
`azpr-v2-backups` and leaves the private state directory for you to delete.
For a native installation, remove the entry you added, for example
`opencode plugin remove opencode-azure-devops-pr-review@0.2.3` or
`opencode plugin remove 'github:WTLAIB/opencode-azure-devops-pr-review-v2#v0.2.3'`;
the external settings, PAT file and private review state remain available.

[Architecture](docs/ARCHITECTURE.md), [commenting](docs/COMMENTING.md),
[Azure DevOps access](docs/AZURE_DEVOPS.md), [verification](docs/VERIFICATION.md),
[debugging](docs/DEBUGGING.md), [roadmap](docs/ROADMAP.md),
[current validation](docs/VALIDATION.md) and [AI maintenance guidance](AGENTS.md)
describe the current behavior. Never commit `.local/`, diagnostics, credentials
or personal model selections.

## License and releases

[MIT](LICENSE), copyright 2026 WTLAIB. See the [changelog](CHANGELOG.md) for the
release scope, [v0.2.3](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/releases/tag/v0.2.3)
for downloads, the [npm package](https://www.npmjs.com/package/opencode-azure-devops-pr-review),
[v0.2.0](https://github.com/WTLAIB/opencode-azure-devops-pr-review-v2/releases/tag/v0.2.0)
for the recorded demonstration, and [releasing](docs/RELEASING.md) for the
release process.
