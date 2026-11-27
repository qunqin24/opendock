# SpecTorque

<p align="center">
  <img src="docs/assets/brand/icon-128.png" width="72" height="72" alt="">
</p>

<p align="center">
  <a href="https://github.com/jayanez/spec-torque/releases"><img src="https://img.shields.io/github/v/release/jayanez/spec-torque?include_prereleases&amp;label=release&amp;logo=github" alt="Latest GitHub release, including previews"></a>
  <a href="https://www.npmjs.com/package/spectorque"><img src="https://img.shields.io/npm/v/spectorque/next?label=npm%20next&amp;logo=npm" alt="npm prerelease version of spectorque"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=jayanez.spectorque"><img src="https://img.shields.io/badge/VS%20Code%20Marketplace-jayanez.spectorque-007ACC" alt="SpecTorque on the VS Code Marketplace"></a>
  <a href="https://registry.modelcontextprotocol.io/v0/servers?search=io.github.jayanez/spectorque"><img src="https://img.shields.io/badge/MCP%20Registry-io.github.jayanez%2Fspectorque-1f6feb" alt="Listed in the MCP Registry"></a>
  <a href="https://github.com/jayanez/spec-torque/actions/workflows/check.yml?query=branch%3Adevelop"><img src="https://img.shields.io/github/actions/workflow/status/jayanez/spec-torque/check.yml?branch=develop&amp;label=Validate%20repository&amp;logo=githubactions&amp;logoColor=white" alt="Validate repository on develop"></a>
</p>

<p align="center">
  <a href="docs/releases.md#versioning-and-releases"><img src="https://img.shields.io/badge/product-0.3.0-173f4f" alt="Product version 0.3.0"></a>
  <a href="#how-the-engine-works"><img src="https://img.shields.io/badge/engine-0.1.16-196d83" alt="Engine version 0.1.16"></a>
  <a href="docs/rubric.md"><img src="https://img.shields.io/badge/rubric-epic--heuristic--1-196d83" alt="Rubric epic-heuristic-1"></a>
  <a href=".nvmrc"><img src="https://img.shields.io/badge/node-%E2%89%A522.20-339933?logo=nodedotjs&amp;logoColor=white" alt="Node.js 22.20 or later"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="Apache-2.0 license"></a>
</p>

<p align="center">
  <a href="docs/integrations.md#claude-code"><img src="https://img.shields.io/badge/Claude%20Code-integration-D97757?logo=anthropic&amp;logoColor=white" alt="Claude Code integration"></a>
  <a href="docs/integrations.md#codex-desktop"><img src="https://img.shields.io/badge/Codex-integration-412991?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI%2BPHBhdGggZD0ibTMgNCA0IDQtNCA0bTYgMGg0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8%2BPC9zdmc%2B" alt="Codex Desktop integration"></a>
  <a href="docs/integrations.md#opencode"><img src="https://img.shields.io/badge/OpenCode-integration-211E1E?logo=opencode&amp;logoColor=white" alt="OpenCode integration"></a>
  <a href="docs/integrations.md#pi"><img src="https://img.shields.io/badge/Pi-integration-555?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI%2BPHBhdGggZD0ibTMgNCA0IDQtNCA0bTYgMGg0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8%2BPC9zdmc%2B" alt="Pi integration"></a>
  <a href="docs/integrations.md#vs-code-workbench"><img src="https://img.shields.io/badge/VS%20Code-preview-007ACC?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI%2BPHBhdGggZD0iTTYgNCAyIDhsNCA0bTQtOCA0IDQtNCA0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8%2BPC9zdmc%2B" alt="VS Code workbench preview"></a>
  <a href="docs/integrations.md#mcp-and-skills"><img src="https://img.shields.io/badge/MCP-read--only-1f6feb?logo=modelcontextprotocol&amp;logoColor=white" alt="Read-only MCP server"></a>
</p>

**See where your coding agent would have to guess.**

SpecTorque is a local workbench for writing and reviewing software specifications. It takes you from a rough idea or an existing Markdown workspace to a spec, plan and tasks with traceable requirements, reviewable changes and explicit open decisions.

[Try it](#try-it-in-one-command) · [Install](#install) · [Quickstart](#quickstart) · [What's new](#whats-new-in-030) · [How the engine works](#how-the-engine-works) · [Research basis](#why-wording-matters) · [Tested compatibility](docs/compatibility.md) · [Guía en español](docs/es.md)

**40 EPIC practice checks · 10 quality dimensions · English and Spanish · One deterministic engine**

## Try it in one command

From the root of a git repository that holds your specs (Node.js 22.20+):

```bash
npx -y spectorque serve --root .
```

It opens the workbench on a loopback address and analyzes that work tree locally: no account, model or telemetry. To give your coding agent the six read-only tools instead, add the MCP server in one line:

```bash
claude mcp add spectorque -- npx -y spectorque mcp
```

```bash
codex mcp add spectorque -- npx -y spectorque mcp
```

Other MCP clients take the same command (`npx -y spectorque mcp`) as a stdio server ([configuration](docs/integrations.md#mcp-and-skills)). The server analyzes the git work tree of the folder the client starts it in; set `SPECTORQUE_ROOT` to point it elsewhere. The npm package is published from [`release.yml`](.github/workflows/release.yml) with npm provenance. For the native panels (`/spectorque` in Claude Code, OpenCode and Pi, the Codex viewer, the VS Code workbench), install the plugin for your host below.

## Install

SpecTorque 0.3.0 is a **prerelease**, published on the `next` channel until the [pilot's stable candidate gate](docs/pilot-operations.md#stable-candidate-gate) passes. As the first version on npm it is also `latest` there, so `npm i spectorque` installs it. Every route runs the same local engine and needs **Node.js 22.20+** on `PATH`. No account, model or telemetry is needed for analysis.

| Platform | Install | Then |
|---|---|---|
| **Claude Code** (CLI and Desktop Code tab) | `claude plugin marketplace add jayanez/spec-torque`<br>`claude plugin install spectorque@spectorque` | `/spectorque` |
| **Codex** (CLI and Desktop) | `codex plugin marketplace add jayanez/spec-torque`<br>`codex plugin add spectorque@spectorque` | [Bind a trusted worktree](integrations/codex/README.md#install-and-bind-a-worktree), then `open_spectorque` |
| **OpenCode** | Add `"opencode-spectorque@0.3.0"` to `plugins` in `~/.config/opencode/cli.json` (a terminal-only plugin) | `/spectorque` in a session |
| **Pi** | `pi install npm:pi-spectorque@0.3.0` | `/spectorque` |
| **ThinkRail** (runs Pi) | Install the Pi package `pi-spectorque` from ThinkRail's extensions, or run the Pi command above | `/spectorque` in a trusted project |
| **VS Code** | Extensions view → search **SpecTorque** → *Switch to Pre-Release*, or `code --install-extension jayanez.spectorque --pre-release` | **SpecTorque: Open Specification Workbench** |
| **Cursor, Windsurf, VSCodium** | The VSIX from the [GitHub release](https://github.com/jayanez/spec-torque/releases) (*Install from VSIX…*); the Open VSX listing follows once the `jayanez` namespace is approved. Installable, not yet qualified | Same command |
| **Any MCP client** | `npx -y spectorque@0.3.0 mcp` as a stdio server ([configuration](docs/integrations.md#mcp-and-skills)); listed in the [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.jayanez/spectorque) as `io.github.jayanez/spectorque` | Six read-only tools |
| **Browser workbench / CLI** | `npx -y spectorque@0.3.0 serve --root .` | Open the printed loopback URL |

**Where it is published:** [npm](https://www.npmjs.com/package/spectorque) (`spectorque`, `spectorque-claude`, `spectorque-codex`, `opencode-spectorque`, `pi-spectorque`), the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jayanez.spectorque) (pre-release), the [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.jayanez/spectorque), this repository's Claude Code and Codex catalogs, and the [GitHub release](https://github.com/jayanez/spec-torque/releases/tag/v0.3.0). The Pi and ThinkRail galleries list `pi-spectorque` from npm. Open VSX follows once its namespace is approved.

Install details, updates and removal for each host are in the [integration guides](docs/integrations.md). Offline or air-gapped installs use the ZIP, VSIX and tarball assets of each [GitHub release](docs/releases.md). Check [tested compatibility](docs/compatibility.md) for the host versions we observed.

## Quickstart

From source, with **Node.js 22.20+** and npm:

```sh
git clone https://github.com/jayanez/spec-torque.git
cd spec-torque
npm ci --ignore-scripts
npm run build
node dist/cli.js serve --root fixtures/en-draft
```

Open the printed loopback URL. Select the finding for `FR-001`, jump to its source line, and review the suggested clarification. To use your own Markdown workspace, replace `fixtures/en-draft` with its path. The [EN/ES pilot walkthrough](docs/pilot.md) ([Spanish](docs/pilot.es.md)) covers review and export step by step.

## What's new in 0.3.0

- **Native marketplace installs** for Claude Code and Codex (this repository is a marketplace for both), npm packages for OpenCode, Pi and ThinkRail, and the VS Code Marketplace for editors (Open VSX once its namespace is approved). One [release workflow](.github/workflows/release.yml) publishes them all from one commit with npm provenance.
- **Engine 0.1.16** after the 0.2.x precision series: requirement IDs count only in a defining position (H3a), hard-wrapped continuations stay with their item (H5a), acceptance scenarios and validation tables count as verification evidence (H6, H6a), plan-local `R-n` labels and references qualified by another specification are no longer reported as undefined (H8, H9), demonstratives no longer read as pronoun subjects (H85), and Spec Kit `checklists/` are review context, not requirements (H7a). Each change went through the pre-registered replay, and those from engine 0.1.10 on show no change in corpus predictions; see [precision decisions](docs/precision-decisions.md).
- **Work-tree-scoped discovery** with feature, folder and changed-on-branch scopes in every host, a shared presentation layer so every panel shows the same title, summary, finding card and disclaimer, and a refined workbench with collapsible, resizable panels.
- **One product version** across the CLI, every host package, the catalogs and the citation, checked in CI. See the [changelog](CHANGELOG.md) and the [versioning policy](docs/releases.md#versioning-and-releases).

## See the difference

The [booking draft](fixtures/en-draft/specs/booking/spec.md#room-booking) starts with a requirement an agent cannot test as written.

> **FR-001** The system MUST be fast.

1. **Find the gap.** SpecTorque flags **fast** as unbounded wording at `specs/booking/spec.md:5`. An agent still has to decide which operation to time, what limit to meet and under what load.
2. **Ask what changes acceptance.** Which booking operation should we measure, what response time is acceptable, and under what load? The answers determine the performance test and can change implementation choices.
3. **Keep the decision open.** Preview the change before accepting it. The proposed wording preserves the requirement ID and obligation and records what the team still needs to decide.

   > **FR-001** The system MUST be [NEEDS CLARIFICATION: define the response-time limit and measurement conditions].

Once the team answers, it can write a testable requirement. For example, if the team chooses booking confirmation, a 500 ms limit at the 95th percentile and a load of 50 concurrent users, the requirement could read:

> **FR-001** The system MUST return a booking confirmation within 500 ms at the 95th percentile under a load of 50 concurrent users.

These values illustrate a possible team decision. Follow the [pilot walkthrough](docs/pilot.md#analyze-review-and-export) to preview the clarification and see how the workbench records it as pending.

## Why wording matters

**Precision** makes an obligation testable by naming observable behavior and its conditions. **Selectivity** directs questions to decisions that affect implementation or acceptance. The studies below examine specification quality, wording signals and clarification behavior.

- **EPIC defines what to review.** Claudino et al. assessed specifications, plans and tasks from 114 open-source repositories using ISO/IEC/IEEE 29148 as a reference. They derived 40 practices across ten dimensions, then sought feedback from 15 practitioners. The study observed a lower share of bug-fix commits in repositories with higher-rated specifications. Its observational design supports an association. [The EPIC Framework for Spec-Driven Development](https://arxiv.org/abs/2610.07534)
- **Wording can flag requirements that need review.** Femmer et al. found that lightweight checks surfaced relevant requirements problems, with detection accuracy varying substantially across cases. [Requirements Smells](https://doi.org/10.1016/j.jss.2016.02.047)
- **Ambiguity can change program behavior.** Mu et al. used divergent outputs from candidate implementations to identify requirements worth clarifying in function-generation benchmarks. [ClarifyGPT](https://doi.org/10.1145/3660810)
- **Agent studies examine when to ask.** On an underspecified variant of SWE-bench Verified, Edwards and Schuster's uncertainty-aware setup asked fewer questions on simpler tasks and sought more information on complex ones. That finding applies to the systems and tasks evaluated in the study. [Ask or Assume?](https://arxiv.org/abs/2603.26233)

EPIC is the basis for SpecTorque's rubric. SpecTorque implements explainable English and Spanish heuristics, cites the evidence behind each finding, and keeps unsupported evidence and unresolved decisions visible. Scores are advisory. Estimating the tool's effect on implementation defects would require a separate outcome study. [Rubric](docs/rubric.md) · [Research methods and limitations](docs/research.md) · [EN/ES corpus and reproduction](docs/format-corpus.md)

## Explore the workbench

Expand a view to read its description and see the capture. Click the image for the original size.

<details open>
<summary><strong>Analyze</strong></summary>

Inspect findings at their exact source lines and see which dimensions are still unknown.

[![Analyze view with the EPIC radar, dimension scores and findings](docs/assets/workbench/analyze.jpg)](docs/assets/workbench/analyze.jpg)

</details>

<details>
<summary><strong>Build a spec</strong></summary>

Answer guided questions to turn a project brief into a spec, plan and tasks.

[![Guided builder showing the four steps and a sample project](docs/assets/workbench/build.jpg)](docs/assets/workbench/build.jpg)

</details>

<details>
<summary><strong>History</strong></summary>

Revisit earlier assessments, check their revision and rubric version, and export the report you need.

[![Assessment history showing revisions and rubric versions](docs/assets/workbench/history.jpg)](docs/assets/workbench/history.jpg)

</details>

<details>
<summary><strong>Connect agents</strong></summary>

Find the host integration guides and copy the local MCP configuration for your project.

[![Integration cards and local MCP configuration](docs/assets/workbench/connect.jpg)](docs/assets/workbench/connect.jpg)

</details>

## Native panels

Each integration brings the same engine into the host you already use. `npm run docs:capture` regenerates the workbench, Codex viewer, Claude Code, OpenCode, Pi and VS Code captures from the bundled booking draft in real hosts with isolated profiles and no model calls; the desktop captures are recorded in [docs/assets](docs/assets/README.md). Check [tested compatibility](docs/compatibility.md) for the host versions we observed.

<details open>
<summary><strong>Claude Code (CLI)</strong> · <code>/spectorque</code> pane</summary>

Read dimension scores and the current finding beside the conversation, step through findings, propose a replacement, refresh the analysis or open the common workbench. The pane calls no model. [Install for Claude Code](docs/integrations.md#claude-code)

[![SpecTorque 0.3.0 pane beside the Claude Code prompt, showing scope, dimension scores and the first of five findings](docs/assets/panels/claude.png)](docs/assets/panels/claude.png)

</details>

<details>
<summary><strong>Claude Code Desktop</strong> · <code>/spectorque</code> pane</summary>

Install the plugin from the marketplace, start a session in the Code tab, then run `/spectorque` to view dimension scores and findings in the native pane. Starting the session takes a model turn. The pane runs its analysis locally. [Install for Claude Desktop](docs/integrations.md#claude-code) · capture from the 0.2.0 qualification

[![SpecTorque pane in Claude Code Desktop showing dimension scores and the first of five findings](docs/assets/panels/claude-desktop.png)](docs/assets/panels/claude-desktop.png)

</details>

<details>
<summary><strong>Codex</strong> · inline viewer</summary>

The viewer opens in the conversation from the project's local MCP server. Choose a scope and finding, preview a change, then hand off to the local workbench to approve or export. Opening it in Codex Desktop takes one model turn. The capture shows the viewer as Codex renders it, driven by a local MCP Apps host. [Install for Codex](integrations/codex/README.md) · [Codex Desktop capture](docs/assets/panels/codex-desktop.jpg)

[![SpecTorque 0.3.0 inline viewer with the summary, dimensions, finding card and change preview](docs/assets/panels/codex.png)](docs/assets/panels/codex.png)

</details>

<details>
<summary><strong>OpenCode</strong> · <code>/spectorque</code> panel</summary>

Press **s** for scope, **e** for the exact source line, **r** for reviewed changes and **w** for the local workbench URL. [Install for OpenCode](docs/integrations.md#opencode)

[![SpecTorque 0.3.0 panel in the OpenCode terminal UI with dimension scores and findings](docs/assets/panels/opencode.png)](docs/assets/panels/opencode.png)

</details>

<details>
<summary><strong>Pi</strong> · <code>/spectorque</code> widget and finding picker</summary>

The widget shows the scope and dimension scores; pick a finding to open its exact evidence, then review the before and after wording. Headless runs print the same report without a model turn. [Install for Pi](docs/integrations.md#pi)

[![SpecTorque 0.3.0 widget and finding picker in the Pi terminal](docs/assets/panels/pi.png)](docs/assets/panels/pi.png)

</details>

<details>
<summary><strong>ThinkRail</strong> · Pi package in a desktop host</summary>

ThinkRail runs Pi natively and installs the same `pi-spectorque` package. `/spectorque` runs as a project extension command without a model turn: the widget line and the finding picker appear above the message box. [Install in ThinkRail](docs/integrations.md#thinkrail)

[![SpecTorque 0.3.0 finding picker and summary in ThinkRail running Pi](docs/assets/panels/thinkrail.jpg)](docs/assets/panels/thinkrail.jpg)

</details>

<details>
<summary><strong>VS Code</strong> · embedded workbench</summary>

The shared workbench opens in an editor tab, with findings that jump to source. The capture is the end of the automated extension-host walkthrough, after a reviewed change was applied. [Install for VS Code](docs/integrations.md#vs-code-workbench)

[![SpecTorque workbench in a VS Code editor tab after a reviewed change](docs/assets/panels/vscode.png)](docs/assets/panels/vscode.png)

</details>

See the [integration guides](docs/integrations.md) for each host's behavior and limits.

## How it works

[![SpecTorque workflow from create or import through local analysis, human review, reanalysis and export, with paths for rejection and undo](docs/assets/workbench/workflow.png)](docs/assets/workbench/workflow.png)

1. **Create or import.** Start with guided questions or load existing documents. Select the scope you want the local engine to assess.
2. **Review and decide.** Follow a finding to its source and compare the exact wording. Rejection leaves the source intact. Approval updates the draft, with a separate opt-in for writing to disk.
3. **Reanalyze and hand off.** Inspect the new revision and its pending decisions. Export the current assessment and selected artifacts, or undo the change where applicable. You can also export an assessment before proposing an edit.

[Archify diagram source](docs/assets/workbench/workflow.archify.json)

## How the engine works

One deterministic TypeScript engine (`src/core`) runs in Node and the browser. The CLI, MCP server, workbench and every host adapter call it; adapters may change presentation, never scoring.

1. **Discover.** Inside a git work tree, candidates come from `git ls-files` (tracked plus unignored drafts); elsewhere a bounded walk. A path-only index lists features without reading content, and only the selected scope (feature, folder or changed on the branch) is read, up to 500 artifacts. [Discovery criteria](docs/architecture.md#discovery-criteria)
2. **Classify.** Layout hints for Spec Kit, Spec Kitty, OpenSpec, Kiro, BMAD, ZeeSpec and generic Markdown assign each file a role: spec, plan, tasks, instruction file, or context such as `quickstart.md` (validation evidence only) and Spec Kit `checklists/` (review context, never requirements).
3. **Recognize requirements.** Normative words are recognized as whole words in English and Spanish (`MUST`, `SHALL`, `DEBE`, `DEBERÁ`…), keeping obligation, recommendation and permission apart. An ID defines a requirement only in a defining position; a hard-wrapped line belongs to the item it continues. [Normative recognition](docs/normative-recognition.md) · [Requirement classification](docs/requirement-classification.md)
4. **Resolve references.** Plan and task references resolve inside the selected feature's ID namespace. Plan-local labels and references qualified by another specification are not reported as undefined.
5. **Check 40 practices.** Explainable line and document rules for the 40 EPIC practices produce findings with the exact path, line and text as evidence. Each practice is supported, partial, missing, not applicable or unknown.
6. **Score ten dimensions.** Supported = 1, partial = 0.5, missing = 0, averaged per dimension and rounded to 0–3. An unknown practice leaves its dimension unscored, and the /30 total appears only when every dimension is known. The assessment carries the engine and rubric versions and a SHA-256 revision of its inputs.
7. **Refine with review.** A clarification question is offered only when the cited wording identifies a decision. A proposal changes one line, must preserve requirement IDs, quantities, obligations and negative clauses, is bound to the source hash, and is written only after explicit human approval. MCP never writes files.

Precision changes follow a pre-registered replay against a frozen comparator and a labeled EN/ES corpus before they ship. [Architecture](docs/architecture.md) · [Rubric](docs/rubric.md) · [Precision method](docs/research.md#precision-method)

## From draft to reviewed handoff

| Step | What you can do |
| --- | --- |
| **Create or import** | Generate spec, plan and tasks from guided questions with stable requirement IDs. Start from a sample, paste text, import Markdown files, load a local workspace or explicitly import a public GitHub repository. |
| **Scope the review** | Discover features and document roles across Spec Kit, Spec Kitty, OpenSpec, Kiro, BMAD, ZeeSpec and generic Markdown/PRDs using layout hints. Review all active artifacts or one feature. Archived artifacts stay outside active analysis. |
| **Inspect the evidence** | Explore a ten-dimension radar, all 40 practices, findings, requirement references and pending decisions. Jump to the cited path and line. Missing evidence remains visible as unknown. |
| **Decide and revise** | Compare exact before and after wording. Guarded proposals check identifiers, quantities and obligations. Reject or explicitly approve, reanalyze and undo where applicable. Disk writes require a separate opt-in and reject stale source. |
| **Share the result** | Export editable artifacts as a scoped ZIP with original paths, download Markdown or JSON reports and a revision-bound SVG badge, or revisit a prior assessment in session history. Save or export unsaved drafts before ending the session. |

The basic workflow runs locally without an account, a model, a GPU or telemetry. Model assistance is optional through a host prompt, local Ollama or an explicitly configured OpenAI request. See [privacy and data flows](docs/privacy.md).

## Browser, CLI and coding agents

The workbench, CLI and six read-only MCP tools share the same analysis engine. Integrations and portable skills cover Claude Code, Codex, OpenCode, Pi and ThinkRail, and the VS Code extension installs in Cursor, Windsurf and VSCodium from its VSIX (Open VSX once the namespace is approved); they are not yet qualified. See the [native panels](#native-panels) and check the tested routes and versions before installing. [Integration guides](docs/integrations.md) · [Compatibility matrix](docs/compatibility.md)

```sh
node dist/cli.js analyze fixtures/en-complete --json
node dist/cli.js create --answers fixtures/builder-en.json
node dist/cli.js mcp
```

For CI, opt into policies such as `--require-complete`, `--fail-on-open` or `--min 23`. An unknown total fails the minimum-score check. Use `npm run check` and `npm run package:integrations` to verify a source checkout.

[Architecture](docs/architecture.md) · [Requirements](docs/requirements.md) · [Roadmap](docs/roadmap.md) · [Contributing](CONTRIBUTING.md) · [Español](docs/es.md)

Original code and documentation are licensed under [Apache-2.0](LICENSE). EPIC-derived paraphrases carry separate CC BY 4.0 attribution in [NOTICE](NOTICE).
