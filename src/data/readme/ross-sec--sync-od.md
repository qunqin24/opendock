<p align="center">
  <img src="https://raw.githubusercontent.com/ross-sec/ross-sec/main/assets/header.svg" alt="Ross Technologies" width="100%">
</p>

<h1 align="center">Sync With Open Design</h1>

<p align="center">
  <strong>Sync any codebase to <a href="https://open-design.ai">Open Design</a> and/or extract its design system.</strong><br>
  Script-driven, adversarial grading, bidirectional sync with managed blocks.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ross-sec/sync-od"><img src="https://img.shields.io/npm/v/@ross-sec/sync-od?style=flat-square&color=2891e2&label=npm%20version" alt="npm version"></a>
  <a href="https://github.com/ross-sec/sync-od/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-2891e2?style=flat-square" alt="license: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-2891e2?style=flat-square" alt="node >=20"></a>
  <a href="https://open-design.ai"><img src="https://img.shields.io/badge/Open%20Design-compatible-2891e2?style=flat-square" alt="Open Design"></a>
  <a href="https://github.com/ross-sec/sync-od"><img src="https://img.shields.io/badge/GitHub-ross--sec%2Fsync--od-2891e2?style=flat-square&logo=github" alt="GitHub"></a>
</p>

---

## What it does

| Mode | What happens |
|------|-------------|
| **A — Project sync** | Turn a codebase into an OD project: build `od-bundle/` OD-safe pages, upload, grade, keep in sync |
| **B — Design system sync** | Extract the design system: `DESIGN.md` + tokens (light + dark) |
| **Both** (default) | Mode B then Mode A |

---

## Features

| Feature | Description |
|---------|-------------|
| 18 bundled scripts | Detect, extract, build, validate, grade, upload — all automated |
| Adversarial grading | 5-axis rubric: THEME / RTL / FIDELITY / COMPLETENESS / POLISH |
| Bidirectional sync | Pull designer edits back safely via managed blocks |
| Secret guard | Blocks secret-bearing content from reaching OD |
| Drift detection | Logs when tracked files are edited |
| Subagent support | Lead / worker / extractor agents |

---

## Install

### Global (recommended — available everywhere)

```bash
opencode plugin @ross-sec/sync-od --global
```

This installs to `~/.config/opencode/` and makes `/sync-od` available in **all** projects.

### Per-project

```bash
opencode plugin @ross-sec/sync-od
```

Adds to project's `.opencode/opencode.json` — only available in that project.

---

## Prerequisites

**OpenDesign daemon MUST be running** for sync operations:

- **Desktop**: Open the OpenDesign app (starts daemon on `http://127.0.0.1:7456`)
- **Server/CLI**: `pnpm tools-dev` (from OpenDesign repo)

The plugin auto-detects MCP connectivity and falls back to `od` CLI if needed.

---

## Usage

```bash
/sync-od                    # full pipeline (both modes)
/sync-od --mode project     # Mode A: codebase → OD project
/sync-od --mode design-system  # Mode B: extract DESIGN.md + tokens
/sync-od --test             # connectivity check only
```

The tool runs **Step A of RE-ANCHOR RITUAL** — executes `ods-status.js`, reports exact next phase. You run that phase's script, verify DONE-gate, flip task box, call `/sync-od` again. Loop until DONE.

---

## Usage

Once installed, run the autonomous pipeline:

```bash
/sync-od                    # full pipeline (both modes)
/sync-od --mode project     # Mode A only: codebase → OD project
/sync-od --mode design-system  # Mode B only: extract DESIGN.md + tokens
/sync-od --test             # connectivity check only
```

The plugin runs **Step A of RE-ANCHOR RITUAL** — executes `ods-status.js`, reports the exact next phase, then **you run that phase's script**, verify DONE-gate, flip the task box, and call `/sync-od` again. Loop until DONE.

---

## Plugin hooks

| Hook | Purpose |
|------|---------|
| `tool.execute.before` | Secret guard — blocks secret-bearing content from being synced |
| `file.edited` | Drift detection — logs edits to tracked design-sync files |

---

## Scripts

All scripts live in `scripts/` and are run by the agent (never by the plugin directly):

| Script | Purpose |
|--------|---------|
| `ods-init.js` | Bootstrap `.design-sync/` |
| `ods-detect.js` | Detect stack (Tailwind, CSS vars, etc.) |
| `ods-extract-tokens.js` | Extract light+dark tokens |
| `ods-build-design-system.js` | Build DESIGN.md + tokens |
| `ods-build.js` | Build OD-safe bundle |
| `ods-validate.js` | Validate bundle |
| `ods-capture.js` | Grade lifecycle |
| `ods-resync.js` | The driver (final build) |
| `ods-upload-plan.js` | Generate upload plan |
| `ods-upload-verify.js` | Verify upload |
| `ods-manifest.js` | Track src↔od pairs |
| `ods-pull.js` | Pull designer edits |

---

## Links

| Platform | Link | Description |
|----------|------|-------------|
| npm | [@ross-sec/sync-od](https://www.npmjs.com/package/@ross-sec/sync-od) | Public package |
| GitHub Packages | [ross-sec/sync-od](https://github.com/ross-sec/sync-od/packages) | GitHub mirror |
| Open Design | [open-design.ai](https://open-design.ai) | The design workspace |
| Skills Hub | [skills.ross-developers.com](https://skills.ross-developers.com/) | Ross Technologies skills |

---

<p align="center">
  <a href="https://ross-developers.com/"><img src="https://raw.githubusercontent.com/ross-sec/ross-sec/main/assets/connect-website.svg" alt="Website"></a>
  <a href="https://github.com/ross-sec"><img src="https://raw.githubusercontent.com/ross-sec/ross-sec/main/assets/badge-github.svg" alt="GitHub"></a>
</p>

<p align="center"><em>MIT © Andre Ross / Ross Technologies</em></p>
