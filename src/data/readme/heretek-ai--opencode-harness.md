# `@heretek-ai/opencode-harness` (`v1.0.12`)

Plugin-first OpenCode v2 in-process harness targeting **Muse 1.3** (`opencode-go/muse-spark-1.3-contributor`): zero-patch built-in tool interceptors (`edit`, `read`, `write`, `patch`, `shell`, `subagent`), post-formatter FNV-1a `<post-edit-anchors>` resync receipts, adaptive `session.hook("retry")` stream/overload recovery, cross-file relative import & named-export contract verification, lexer-safe atomic multi-file `rename_symbol`, Dual Direct + Code Mode (`tools.harness.*`) tool registration, 4-hex FNV-1a hash-anchored file edits, AST structural codemods, PageRank repository mapping, lexer-aware symbol reference & call-site search, blast-radius, circular-dependency & dead-code architecture auditing, all-or-nothing atomic transactions, warm-cached post-mutation diagnostics, stack-frame `<fault-context>` localization, head+tail anti-truncation output compaction, KV-cache-safe context budgeting, automatic circuit-breaker episodic lesson synthesis, role/path/contract/taint permission guards, a doom-loop circuit breaker, and DOM geometry auditing.

Single-session in-process plugin only — no HTTP servers, daemons, or multi-agent DAG schedulers. See `AGENTS.md` for the scope contract and `docs/prompts/SPEC.md` for the full build specification.

### Requirements (OH-8.2-install-story)

Minimum supported host: **`anomalyco/opencode@ed772f5`** (dev, 2026-10-16 —
the pinned commit `scripts/host-test/run.sh` verifies against) or any newer
`anomalyco/opencode` dev commit whose promise-plugin API (`ctx.tool`,
`ctx.permission`, `ctx.session`, `ctx.shell`, `ctx.agent`, `ctx.command`,
`ctx.mcp`, `Tool.Options` `{namespace, codemode, pinned}`) still matches the
shapes in `src/host/contract-adapter.ts`. Stock `opencode-ai@latest`
compatibility is **unproven** (no `repository`/`homepage` metadata to
cross-check the fork's promise-plugin API against it) — do **not** install
the stock host and expect the harness to load.

Install the supported host (one command):

```bash
git clone https://github.com/anomalyco/opencode.git && \
  git -C opencode checkout ed772f5009755b5262805a7ba07e66e1417f140a && \
  (cd opencode && bun install --ignore-scripts)
```

then point the harness at it:

```bash
OPENCODE_DIR=/path/to/opencode make host-test
```

Pin-advance matrix note: whenever `OPENCODE_REF` in `scripts/host-test/run.sh`
advances, update the commit in this section in the same change and re-run
`make host-test` at both the old pin and the new head before merging — the
two pins are the supported-host matrix until a newer floor is proven.

### LOC budget note (OH-scope-loc-budget)

`src/` currently holds 22 modules (~12.0k raw / ~10.0k stripped LOC, self-cap
raw ≤ 12,100 / stripped ≤ 10,100 — revised by audit-remediation-C for the
mandated P1/P2/P3 security fixes, which cannot stay net-zero against a
99.9%-full cap; functionality is never deleted to hit a line count)
against the
original blueprint budget of 3,000–5,000 LOC (and the original ~450-line sketch
ask). The overage is authorized scope growth, not drift: 8 waves delivered a
14-tool plugin with 8 pinned Code Mode companions, 16+ zero-patch interceptors,
permission/taint/circuit-breaker guards, RepoMap/blast-radius/rename engines,
incremental verification, architecture auditing, calibration, episodic memory,
transactions, and DOM auditing. The revised tracked budget is raw ≤ 12,260 /
stripped ≤ 10,180, enforced as a CI tracking signal (`bash
scripts/check-loc.sh`, wired into `.github/workflows/ci.yml`) — it reports and
warns but never fails the build in its default form, and functionality is never
deleted to hit a line count. The same script doubles as a hard gate:
`bash scripts/check-loc.sh --fail-over=12260 --fail-over-stripped=10180`
(the CI gate form) exits non-zero over either cap.

## Install & Build

```bash
bun install
bun run check   # tsc --noEmit — must exit 0
bun test        # full unit suite — must exit 0
make check      # bun run check + bun test
make accept     # wave-1 through wave-7 acceptance scripts
make host-test  # load the plugin into a real OpenCode V2 host (see below)
```

### Real-host test

`make host-test` (`scripts/host-test/run.sh`) clones `anomalyco/opencode` at a
pinned commit, copies `scripts/host-test/harness-host.upstream.ts` into
`packages/core/test/plugin/`, and runs it with the upstream plugin fixture. It
asserts every tool registers through the real promise-plugin adapter and tool
registry, executes all 14 tools (mutating tools via in-memory/no-op and
fail-closed failure paths so the checkout is never modified), executes a
Code Mode `tools.harness.*` companion, fires every hook through the real
pipeline, and asserts scope-close unload removes all tools/hooks and reload
restores them exactly once. Override the upstream commit with
`OPENCODE_REF=<sha>` or reuse a checkout with `OPENCODE_DIR=<path>`. CI runs
it on every pull request.

## Plugin Usage

### 1. Native OpenCode V2 `PluginModule` (`default` export)

When loaded by OpenCode V2's plugin system (`packages/core/src/plugin/module.ts`), `@heretek-ai/opencode-harness` exports a native promise-plugin definition (`default: { id: "@heretek-ai/opencode-harness", setup(ctx) }`) that wires all 14 direct tools (`options: { codemode: false }`), pinned Code Mode companion tools (`tools.harness.*`), all zero-patch tool/session/compaction/retry/shell/permission interceptors, and `/doctor` + `/audit` slash commands.

Host contract notes:

- Tool `input` schemas are passed to the host as plain JSON Schema (`toHostInputSchema`). The host rejects zod v3 schemas outright, so the zod schemas are used only to validate arguments inside each tool's `execute`.
- `setup` awaits every `hook` / `transform` registration and resolves to a cleanup function the host calls on unload; it disposes every registration.
- Plugin options come from the `plugins` entry in `opencode.json` (delivered on `ctx.options`):

```jsonc
{
  "plugins": [
    { "package": "@heretek-ai/opencode-harness", "options": {
      "contextBudgetTokens": 4000,
      // Opt-in: add lsp-mcp-server (bunx) and fallow-mcp (npx --yes) when absent.
      // Off by default because both download and run npm packages.
      "seedRecommendedMcp": false,
      // Opt-in: rewrite OpenCode's subagent rule and append the Muse 1.3
      // tool guidance to the system prompt. Off by default because it changes
      // the system prompt for every model.
      "museCalibration": false
    } }
  ]
}
```

> Config shape note: under the native v2 `plugins` key, entries must be
> strings or `{ "package": ..., "options"?: ... }` objects. The legacy tuple
> form (`["pkg", { ... }]`) belongs to the old v1 `plugin` key only — under
> `plugins` the upstream decoder drops tuple entries, so the harness would
> never load. Always use the object form above.

For tests or custom hosts, `setupOpenCodeV2Harness(ctx, options)` returns `{ report, ready, dispose }`, where `report` is the `/doctor` self-diagnostics.

### KV-cache note on `event.system`

The original spec required `event.system` to stay byte-for-byte unchanged. With `museCalibration: true`, the `session.hook("context" | "generate")` calibration deliberately rewrites the upstream `meta.txt` subagent bullet and appends a static guidance overlay to `event.system[0]`. The result is identical on every turn, so provider prefix caches still hit; dynamic context (task, plan, lessons) is still appended only to the last user message. The `session.hook("prompt")` handler sanitizes upstream prompt text (compaction pseudo-transcripts) — the shape the real host sends, which carries no `system` — and only calibrates `system` on hosts that provide it. If upstream rewords the bullet, a one-line fallback matcher still replaces it. With the default (`false`), the system prompt is left untouched.

### 2. Explicit Programmatic Activation (`activate` / `createHarnessPlugin`)

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

## Zero-Patch Plugin Interceptors (Plugin Over Patching)

| Interceptor | Hook Surface | What It Fixes in OpenCode V2 (`opencode-2`) Without Upstream Patching |
| --- | --- | --- |
| **`EditTool` Auto-Repair & Near-Miss Recovery** | `tool.hook("execute.before" \| "execute.after")` | Strips accidental `ReadTool` (`12: `) or `file_hash_read` (`12#a3f2\| `) line prefixes from `oldString`/`newString` and resolves leading indentation drift in-place before `EditTool` runs. On failure, appends a 4-hex FNV-1a `<near-miss-anchor>` slice so Muse 1.3 can immediately issue `file_hash_edit`. |
| **Post-Formatter `<post-edit-anchors>` Resync Receipt** | `tool.hook("execute.after")` | OpenCode V2 runs `Formatter.file(filePath)` (`packages/core/src/formatter.ts:45-80`) after `edit`/`write`/`patch`, silently reflowing lines on disk without returning updated line numbers. `buildPostMutationAnchorReceipt` diffs `beforeContent` vs. post-formatter `afterContent` and appends `<post-edit-anchors>` with fresh 4-hex FNV-1a `<lineNo>#<hash>\| <content>` anchors around the modified span. |
| **`PatchTool` Envelope & Hunk Prefix Auto-Repair** | `tool.hook("execute.before")` | Wraps bare `*** (Update\|Add\|Delete) File:` hunks in `*** Begin Patch` / `*** End Patch` markers and strips accidental `12: ` / `12#a3f2\| ` prefixes inside hunk lines before `Patch.parse` runs. |
| **Cross-File Import & Export Contract Verifier** | `tool.hook("execute.after")` (`collectFileDiagnostics`) | Resolves relative TS/JS imports (`.js` -> `.ts`/`.tsx`, `/index.ts`) and verifies every named import against the target module's exports (including `export * from` re-exports), catching hallucinated imports or broken paths in `<10ms`. |
| **Pre/Post-Edit Contract Impact Analyzer** | `tool.hook("execute.before" \| "execute.after")` | Diffs exported symbol signatures (`extractOutline`) before and after every file mutation; when an exported signature changes, appends `<contract-impact>` listing downstream importers, symbol callers, and affected test files. |
| **Head+Tail Anti-Truncation Output Compactor** | `tool.hook("execute.after")` | Compacts middle lines of oversized tool outputs (`>1,400` lines or `>38 KiB`) into a 35% head + 65% tail window before `ToolOutput.truncate` (`2,000` lines / `50 KiB`) runs, ensuring error tails and appended `<diagnostics>` / `<fault-context>` / `<circuit-breaker>` blocks are never sliced off. |
| **Adaptive `session.hook("retry")` Stream & Overload Recovery** | `session.hook("retry")` | Overrides `event.decision` in `SessionRunnerRetry` (`packages/core/src/session/runner/retry.ts:62-80`) to recover from transient Muse 1.3 `incomplete-stream` drops, `502`/`503`/`504`/`529` gateway overloads, and `ECONNRESET`/`ETIMEDOUT` (`attempt <= 3`), while halting retries immediately on fatal `auth`/`invalid_api_key`/`context-overflow` errors. |
| **Circuit-Breaker Recovery Episodic Lesson Synthesis** | `tool.hook("execute.after")` | Tracks when a session trips the doom-loop circuit breaker and automatically synthesizes a scope-tagged `<episodic-recovery-lesson>` on the subsequent recovery action (`trackCircuitBreakerAndAutoProposeLesson`). |
| **Dual Direct + Code Mode (`tools.harness.*`) Bridge** | `tool.transform` (`editor.namespace`) | Registers all 14 tools with `options: { codemode: false }` for direct calls AND registers pinned `tools.harness.*` companions (`codemode: true, pinned: true`) so Code Mode (`execute({ code })`) scripts can batch-query `repo_map`, `blast_radius`, `symbol_references`, `rename_symbol`, `file_outline`, and `file_hash_read`. |
| **`ReadTool` Fuzzy Path Resolver & Outline Header** | `tool.hook("execute.before" \| "execute.after")` | Auto-resolves unambiguous moved/mis-pathed filenames in the workspace before `ReadTool` fails, and appends `<file-outline-summary>` on windowed reads of large files. |
| **`ShellTool` Non-Zero Exit `<fault-context>` Localizer & Env Hardener** | `shell.hook("create.before")`, `tool.hook("execute.after")` | Injects `CI=1`, `GIT_TERMINAL_PROMPT=0`, and `PAGER=cat`; detects non-zero exit codes inside `ShellTool`'s `status: "completed"` (`result.output.exit !== 0`) and appends 4-hex FNV-1a hash-anchored `<fault-context>` stack frames. |
| **`SubagentTool` SHA-256 `<mutation-receipt>` Verifier** | `tool.hook("execute.before" \| "execute.after")` | Captures pre/post workspace SHA-256 digests around `subagent` calls, appending `<mutation-receipt>` and running syntax/import diagnostics on every file touched by the subagent. |
| **`MetaPlugin` (`meta.txt`) Calibration & Compaction Decontaminator** | `session.hook("context" \| "generate" \| "compaction")` | With `museCalibration: true` (off by default), replaces `meta.txt`'s subagent over-trigger in-place and appends static Muse 1.3 tool guidance to `event.system[0]`. Always sanitizes `<recent-context>` `[Assistant tool call]:` pseudo-transcripts, and strips coding-agent, `# Your Model`, and worktree prompt/tool contamination from `compaction` requests. |
| **Multi-Hop Root `promptCacheKey` Affinity** | `session.hook("model.request")` | Tracks `childSessionID -> parentSessionID` across unlimited subagent/fork hops and rewrites `x-session-affinity` / `X-Session-Id` headers to the true root session ID. |

## Tools (`HARNESS_TOOL_NAMES` & `EXTENDED_HARNESS_TOOL_NAMES`)

| Tool | Module | Behaviour |
| --- | --- | --- |
| `file_hash_read` | `src/editors/hashline-tools.ts` | Reads a file as `<lineNo>#<4-hex-hash>\| <content>` lines; 1-based `offset`/`limit` windows. |
| `file_hash_edit` | `src/editors/hashline-tools.ts` | Applies hash-anchored hunks; anchors resolve across ±25 shifted lines; any mismatch fails closed with no disk write. |
| `ast_structural_search` | `src/editors/ast-codemod.ts` | Structural search with `$VAR` / `$$$ARGS` metavariables (`@ast-grep/napi` + deterministic fallback). |
| `ast_structural_rewrite` | `src/editors/ast-codemod.ts` | Substitutes metavariable bindings into the rewrite template; writes only when at least one match is replaced. |
| `ui_geometry_audit` | `src/ui-auditor/dom-auditor.ts` | Pure DOM geometry audit (overflow-x, <24px targets, descender-clip risk, sibling collision, baseline jitter) or headless Chromium + WCAG 2.2 axe audit. |
| `repo_map` | `src/repomap/repomap.ts` | Lexer-aware TS/JS/Py/Go/Rust dependency graph with PageRank centrality ranking and exported symbol summaries. |
| `blast_radius` | `src/repomap/repomap.ts` | Computes direct importers, transitive dependents, symbol callers, and affected test files for any target file/symbol. |
| `file_outline` | `src/repomap/repomap.ts` | Extracts exported functions, classes, interfaces, types, and structs with 1-based line numbers without reading full file bodies. |
| `symbol_references` | `src/repomap/repomap.ts` | Lexer-verified definitions, imports, exports, and call sites of a symbol across the workspace with 1-based line numbers and 4-hex FNV-1a anchors. |
| `rename_symbol` | `src/repomap/repomap.ts` | Atomically renames an identifier across all definitions, imports, exports, and call sites in live code (ignoring comments and strings), with automatic syntax/import verification and rollback on error. |
| `verify_scoped` | `src/verify/verifier.ts` | Runs blast-radius-scoped incremental verification (`typecheck`, `lint`, and affected tests) with structured `file:line:col` extraction. |
| `architecture_audit` | `src/verify/architecture-advisor.ts` | Detects circular module dependencies (Tarjan SCC), unused exported symbols, orphan modules, oversized god-files (>650 lines), empty catch blocks, and high-arity functions. |
| `checkpoint_create` / `checkpoint_rollback` | `src/transactions/edit-transaction.ts` | Creates and restores in-memory file checkpoints prior to multi-step refactors. |
