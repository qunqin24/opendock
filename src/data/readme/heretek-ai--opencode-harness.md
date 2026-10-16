# `@heretek-ai/opencode-harness`

Lean OpenCode v2 in-process harness plugin: hash-anchored file edits, AST
structural codemods, KV-cache-safe context budgeting, role/path/contract
permission guards, a doom-loop circuit breaker, and DOM geometry auditing.

Single-session plugin only — no servers, daemons, or schedulers. See
`AGENTS.md` for the scope contract and `docs/prompts/SPEC.md` for the full
build specification.

## Install

```bash
bun install
```

## Build commands

```bash
bun run check   # tsc --noEmit — must exit 0
bun test        # full unit suite — must exit 0
make check      # bun run check + bun test
make accept     # wave-1 + wave-2 + wave-3 acceptance scripts
make accept WAVE=3  # one wave only
```

## Plugin usage

Register with default settings (workspace root at `process.cwd()`,
default guard policy, 4000-token context budget):

```ts
import { activate } from "@heretek-ai/opencode-harness";

activate(context);
```

Or configure explicitly — guard policy, workspace root, context budget,
and the task/plan/episodic artifacts that feed the session context hook:

```ts
import { createHarnessPlugin } from "@heretek-ai/opencode-harness";

const plugin = createHarnessPlugin({
  rootDir: "/home/user/project",
  guardConfig: {
    lockedContractGlobs: ["**/contracts/**", "**/schemas/*.schema.json"],
  },
  contextBudgetTokens: 4000,
  taskMd: "# Current task\n...",
  planMd: "# Plan\n...",
  lessons: [{ id: "l-1", trigger: "anchor drift", lesson: "re-read before retry" }],
});

plugin.activate(context);
```

`resolveHarnessOptions()` validates options fail-closed; `buildHarnessTools()`
returns the five bound tool definitions for embedding or inspection.

## Tools

| Tool | Wraps | Behaviour |
| --- | --- | --- |
| `file_hash_read` | `hashReadFile` | Reads a file as `<lineNo>#<4-hex-hash>\| <content>` lines; 1-based `offset`/`limit` windows. |
| `file_hash_edit` | `hashEditFile` | Applies hash-anchored hunks; anchors resolve across ±25 shifted lines; any mismatch fails closed with no disk write. |
| `ast_structural_search` | `astSearch` | Structural search with `$VAR` / `$$$ARGS` metavariables (`@ast-grep/napi` + deterministic fallback); returns text plus 1-based lines. |
| `ast_structural_rewrite` | `astRewriteFile` | Substitutes metavariable bindings into the rewrite template; writes only when at least one match is replaced. |
| `ui_geometry_audit` | `evaluateDomGeometryInPage` / `auditLivePageWithPlaywright` | With `elements`: pure geometry check (overflow-x, <24px targets, descender-clip risk, sibling collision, baseline jitter). With `url`: headless Chromium audit plus `@axe-core/playwright` WCAG 2.2 tags. Provide one of the two — otherwise it throws fail-closed. |

All tool args are zod-validated before any work happens; invalid args
throw instead of running permissively.

## Hooks

| Hook | Handler | Behaviour |
| --- | --- | --- |
| `permission.hook("evaluate")` | `evaluateBoardGuard` | Rules 0–4 + task paths: destructive shell denied for all roles; leadership roles read-only; red-team roles locked out of `src/**`; contract globs locked to `architect`. |
| `tool.execute.after` | `recordAndEvaluateCircuitBreaker` | Records every attempt; critical intervention (`shouldEscalateModel: true`) after ≥2 consecutive failed edits on one path or ≥3 consecutive failed shells on one command prefix. |
| `session.hook("context")` | `registerContextBudgetHook` | Packs task/plan/episodic blocks into the token budget and appends them to the last `role === "user"` message. |

KV-cache invariants (enforced by `test/plugin.test.ts` and
`test/context-budget.test.ts`): `event.system` is never mutated;
episodic lessons are sorted by `id.localeCompare` and carry bare
`id="..."` tags with no relevance scores or timestamps; an empty pack is
a no-op, while a non-empty pack with no user message throws fail-closed.

## MCP config

`getRecommendedMcpConfig()` returns exactly two servers:

```json
{
  "mcpServers": {
    "lsp-mcp-server": { "command": "bunx", "args": ["lsp-mcp-server"] },
    "fallow-mcp": { "command": "npx", "args": ["--yes", "--package", "fallow", "fallow-mcp"] }
  }
}
```

A fresh object is returned on every call.

## Project structure

```text
src/
├── index.ts                    # Unified plugin entrypoint (this wave)
├── editors/hashline-tools.ts   # 4-hex FNV-1a hash-anchored read/edit
├── editors/ast-codemod.ts      # Structural search + rewrite
├── guards/shell-parse.ts       # Shell command classifier
├── guards/permission-guard.ts  # Role/path/contract guard (Rules 0–4)
├── guards/circuit-breaker.ts   # Doom-loop circuit breaker
├── context/context-budget.ts   # KV-cache-safe context packer
└── ui-auditor/
    ├── dom-auditor.ts          # Geometry verifier + live audit
    └── mcp-defaults.ts         # Recommended MCP server blocks
test/
├── editors.test.ts
├── guards.test.ts
├── circuit-breaker.test.ts
├── context-budget.test.ts
├── dom-auditor.test.ts
├── mcp-defaults.test.ts
├── bootstrap.test.ts
└── plugin.test.ts              # Wave 3 entrypoint suite (61 tests)
scripts/accept/
├── wave-1.sh
├── wave-2.sh
└── wave-3.sh
```
