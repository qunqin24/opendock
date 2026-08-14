# OpenCode Code Relay Plugin

OpenCode plugin that automates the [Code Relay](https://github.com/yan5xu/code-relay)
protocol: cross-session and cross-repo state handoff for AI coding agents. It turns
the manual HANDOFF / CHECKPOINT routine into single commands plus a session hook, so
context survives across sessions and repositories without the agent starting from zero.

> Concept based on [yan5xu/code-relay](https://github.com/yan5xu/code-relay). Licensed MIT.

## Why

AI coding agents lose context across sessions and across repositories. Code Relay solves
this with a file-based handoff protocol, but it relies on the developer remembering to
write HANDOFF docs. This plugin automates capture, cross-repo awareness, and restoration.

## Install

```bash
# from npm
opencode plugin add opencode-code-relay-plugin
# or locally (during development)
opencode plugin add .
```

## Commands

- `relay init` — create `relay.json` at the workspace root and capture project context.
- `relay save` — snapshot the current repo to `.code-relay/state.json`, update the root
  state, run Spec Sync, and render `RESUME.md`.
- `relay close` — **Closing Ritual**: consistency check → delta snapshot → `next_step.md`
  → atomic commit with a `session-end` tag.
- `relay switch <repo>` — move the active baton to another repo and load its `specs/` as context.
- `relay resume` — print the current repo's `RESUME.md`.
- `relay status` — condensed view of `relay.json`.

## How it works

- **Relay Manager** — `relay.json` at the workspace root holds `project_context`,
  `active_baton`, and a per-repo map. Per-repo snapshots live in `.code-relay/state.json`.
- **Spec Sync** — deterministic diff of `specs/**/*.spec.md` (no LLM) compresses intent
  into the root state and powers the `relay close` consistency check.
- **Context Injector** — renders a Resume Prompt from state + handover templates, injected
  automatically via the `experimental.session.compacting` hook and on demand via `relay resume`.

## State model (hybrid)

- `relay.json` — machine-readable global state (workspace root).
- `<repo>/.code-relay/state.json` — per-repo snapshot.
- `<repo>/.code-relay/RESUME.md` — rendered, agent-readable resume prompt.
- `<repo>/.code-relay/next_step.md` — next session's first action.

## Non-goals

LLM-based spec summarization, GitHub Collaboration Mode, multi-agent swarm orchestration,
and a GUI are deferred.

## License

MIT — see [LICENSE](./LICENSE).
