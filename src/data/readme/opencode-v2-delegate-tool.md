# opencode-v2-delegate-tool

[![npm version](https://img.shields.io/npm/v/opencode-v2-delegate-tool.svg)](https://www.npmjs.com/package/opencode-v2-delegate-tool) [![npm downloads](https://img.shields.io/npm/dm/opencode-v2-delegate-tool.svg)](https://www.npmjs.com/package/opencode-v2-delegate-tool) [![license](https://img.shields.io/npm/l/opencode-v2-delegate-tool.svg)](https://github.com/SebastianZonta/opencode-v2-delegate-tool/blob/main/LICENSE)

**Give every OpenCode session — including subagents — its own subagent.** One tool, one brief, one result. Resumable, depth-limited, with background dispatch.

An [OpenCode 2](https://opencode.ai) server plugin. No dependencies, no TUI part.

## Install

**From npm** (OpenCode 2 installs it automatically at startup, no clone needed):

```json
{
  "plugins": [{ "package": "opencode-v2-delegate-tool" }]
}
```

**From local files**: copy this folder to `~/.config/opencode/plugins/delegate`
(global) or `.opencode/plugins/delegate` (project-level). Files in those
directories load automatically at startup (TypeScript sources run directly).

## Use

One tool, `delegate`, in every session's catalog. Pass a complete brief as `task`; you get back a summary plus a `childSessionID` for follow-ups.

**New subtask:**

```json
{ "task": "Explore how auth tokens refresh. Return: files involved, trigger, expiry handling. Under 20 lines." }
```

**Resume it** (the child keeps full context, no need to repeat instructions):

```json
{ "sessionID": "<childSessionID>", "task": "You found no refresh call — check background jobs and update your verdict." }
```

**Background** (fire-and-forget; you're notified here when it finishes, like `ctrl+b` tasks):

```json
{ "task": "Research X in the background.", "background": true }
```

**Collect a background child manually:**

```json
{ "task": "collect", "sessionID": "<childSessionID>", "waitOnly": true }
```

A bundled `delegate` skill teaches the usage rules, plus a one-line context hint so subagents discover the tool on their own.

## Options

All optional. Via `options` in `opencode.json` or via env vars.

| Option | Env | Default | Description |
| --- | --- | --- | --- |
| `maxDepth` | `DELEGATE_MAX_DEPTH` | `3` | Max delegation nesting. Sessions at this depth are rejected and solve directly |
| `timeoutSeconds` | `DELEGATE_TIMEOUT_SECONDS` | `300` | Per-subtask timeout. The child is interrupted and its partial result returned |
| `maxResultChars` | `DELEGATE_MAX_RESULT_CHARS` | `4000` | Result truncation so a verbose child can't flood the parent context |

```json
{
  "plugins": [
    {
      "package": "opencode-v2-delegate-tool",
      "options": { "maxDepth": 3, "timeoutSeconds": 300, "maxResultChars": 4000 }
    }
  ]
}
```

## How it works

- **Ownership**: a session can only resume/collect children it spawned itself; anything else is rejected.
- **Depth tracking**: each child records depth N+1 in storage, with a parent-chain walk as fallback; unknown sessions count as depth 0.
- **Background notify**: finished fire-and-forget children push their result into the parent session via storage-backed pending entries, so they survive restarts; timers bound the wait and interrupt runaways.
- **No double delivery**: collecting a child untracks it first, so the completion watcher never notifies twice.

## Develop

Layout: `index.ts` (orchestration), `src/types.ts` (context types), `src/pure.ts` (pure helpers), `index.test.ts` (suite).

```sh
node --test index.test.ts   # 19 tests, stdlib only (node:test + node:assert)
npm run typecheck           # tsc --noEmit over index.ts + src/
npm run build               # tsup bundles index.ts -> dist/ (+ SKILL.md)
```

The suite covers pure helpers and the `execute` paths (ownership, nesting limit, happy path, timeout) with a mocked context. Note: Node refuses to type-strip `.ts` inside `node_modules`, so the published tarball ships compiled `dist/` only (sources stay in git; `dist/` is gitignored and rebuilt by `prepublishOnly`).

## License

Apache-2.0 — see [LICENSE](LICENSE).
