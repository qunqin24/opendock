# opencode-egm

Unofficial OpenCode V2 adapter for Google's
[Elephant-Goldfish Model (EGM)](https://github.com/google/elephant-goldfish-model)
skill pack. It bundles the EGM skills, reviewer personas, and `/egm-*` commands
as one self-contained plugin.

This is **not** an officially supported Google product.

## Requirements

- OpenCode V2 (latest), with a configured model provider.
- Recommended: allow one level of subagent nesting so the synthesizer and
  bootstrap orchestrator can spawn reviewers and scouts:
  ```jsonc
  {
    "experimental": { "subagent_depth": 2 }
  }
  ```
  Without it, everything still runs, but the primary agent does all spawning.

A full review spawns several subagents. Use a capable model and allow a few
minutes.

## Install

```sh
opencode plugin add opencode-egm
```

Restart OpenCode afterward. From a local checkout, add its absolute path to
`plugins` in `opencode.jsonc` instead.

## Use

The plugin adds seven commands:

| Command | What you pass | What it produces |
| --- | --- | --- |
| `/egm-brainstorm <idea>` | Idea in plain language | `concepts_brief.md` |
| `/egm-draft [context file]` | Brief or notes; defaults to `concepts_brief.md` | `design_draft.md` |
| `/egm-review <file> [step]` | Target design file; optional preset or stage | `goldfish_review_report.md` |
| `/egm-review-loop <file>` | Target plus reviewers and standards; asks for anything missing | `goldfish_review_report.md` |
| `/egm-resolve <file>` | Target plus findings; defaults to `goldfish_review_report.md` | Edits to the target file |
| `/egm-bootstrap <path>` | Directory to document | `README.md` files across the tree |
| `/egm-drift-report <dir>` | Directory of designs or READMEs | `YYYY-MM-DD_DRIFT_REPORT.md` |

Paths are relative to the project you opened in OpenCode.

### Typical flow

1. `/egm-brainstorm` turns a rough idea into a reviewed `concepts_brief.md`.
2. `/egm-draft` turns the brief into `design_draft.md`, section by section.
3. `/egm-review` sends fresh-context reviewers at the draft.
4. `/egm-resolve` classifies each finding and applies the fixes you approve.

You can start at any step; `/egm-review` works directly on a design document you
already wrote.

### Examples

```text
/egm-brainstorm Add an offline mode to the mobile app
/egm-draft concepts_brief.md
/egm-review design_draft.md
/egm-review design_draft.md feature_spec Context: src/api/
/egm-review-loop design_draft.md
/egm-resolve design_draft.md
/egm-bootstrap src/
/egm-drift-report docs/designs
```

- `/egm-review` asks for a pipeline preset unless you name one:
  `feature_spec`, `implementation`, `uninterrupted`, or a stage from `5` to `9`.
- `/egm-resolve` works best in the session that produced the draft.
- `/egm-bootstrap` writes documentation only. Pass `target_filename=EGM.md` to
  leave existing READMEs untouched.
- Gates use OpenCode's `question` tool. The agent waits for your answer and
  continues in the same turn; pick an option or type your own answer.

### Artifacts

Artifacts go to the working directory of the project you opened. To choose
another folder, put this in your prompt or `AGENTS.md`:

```text
EGM artifact directory: docs/egm
```

Long outputs are written to files, not pasted into chat.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/egm-*` commands are missing | Restart OpenCode, then confirm the plugin is listed by `opencode plugin list` or in your `opencode.jsonc`. |
| Commands run but no reviewers appear | Set `experimental.subagent_depth` to `2` and restart. |
| Artifacts land in the wrong folder | Set `EGM artifact directory: <path>` in the prompt or `AGENTS.md`. |

## Documentation

For the full EGM workflow, standards, persona details, and advanced
configuration, see the original project:
https://github.com/google/elephant-goldfish-model

OpenCode-specific details are in
[`assets/egm/docs/opencode.md`](assets/egm/docs/opencode.md).

## License

Apache-2.0. Vendored EGM content remains Copyright 2026 Google LLC and is
distributed under Apache-2.0. See `LICENSE` and `NOTICE`.
