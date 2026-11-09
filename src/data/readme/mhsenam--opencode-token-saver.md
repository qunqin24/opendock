# TokenSaver

### Reduce Claude Code, Codex, opencode, and Qoder token usage without losing tool output

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb)](https://code.claude.com/docs/en/plugins/overview)
[![Codex plugin](https://img.shields.io/badge/OpenAI%20Codex-plugin-111111)](https://developers.openai.com/plugins/build/plugins)
[![opencode plugin](https://img.shields.io/badge/opencode-plugin-1f6feb)](https://opencode.ai/docs/plugins)
[![Qoder plugin](https://img.shields.io/badge/Qoder-plugin-00a0e9)](https://docs.qoder.com/extensions/plugins)

**TokenSaver is a local-first context optimization plugin.** Coding agents read thousands of lines of command logs, test output, search matches, and source code into context, then pay to resend all of it on every turn. TokenSaver compacts that noise before the model sees it, keeps what matters visible (failures, exit codes, paths, line numbers), and stores the complete original output on disk so nothing is ever lost.

## TL;DR

- Compacts verbose shell, test, search, and file-read output using deterministic rules: no extra model calls, no API keys, no cloud, no telemetry.
- Test failures, stack traces, exit codes, and line numbers stay visible in the compacted preview.
- The full output is saved locally; the agent can retrieve any line range later with `output_slice`, without rerunning anything.
- Synthetic fixtures show 93-95% smaller tool output (see [Benchmarks](#benchmarks)).

## Why TokenSaver?

Tool results are resent in every subsequent model request. Verbose output inflates token usage, fills the context window, and leaves less room for your actual task.

TokenSaver uses **deterministic local compaction**, not another AI summarization step:

- No additional model calls or API keys.
- No cloud processing or telemetry.
- No lossy summary of the underlying output.
- Full output recovery by exact line range.
- Original exit codes, failures, paths, and line numbers remain visible.

## What it does

| Host | Verbose output is compacted | Tools available |
| --- | --- | --- |
| Claude Code | Automatically via the `PostToolUse` hook (`Bash`, `Grep`; `Read` is opt-in) | MCP server: `compact_read`, `compact_search`, `compact_run`, `output_slice`, `stats` |
| Codex CLI | On request (Codex hooks do not support output replacement yet) | MCP tools plus a bundled skill that teaches the agent when to use them |
| opencode | Automatically via the plugin hook (`bash`, `read`, `grep`) | Plugin tools: `output_slice`, `stats` |
| Qoder | Automatically via the `PostToolUse` hook | MCP server: `compact_read`, `compact_search`, `compact_run`, `output_slice`, `stats` |

Compaction keeps a small preview with the head, the tail, and the important lines:

```text
[token-saver] shell: 2000 lines/128689 B → 104 lines/6420 B. Full output: session.…; use token-saver output_slice with startLine and maxLines.
progress 0% chunk 0 …
[… original lines 41–1940 omitted …]
FAIL: final assertion failed
[exit code: 1]
```

Additional behavior:

- Removes ANSI escape sequences from compacted previews.
- Collapses consecutive duplicate lines.
- Preserves test failures and nearby stack traces.
- Groups search results by file with per-file limits.
- Truncates exceptionally long lines, including Unicode-safe truncation.
- Replacements mirror the original tool-output shape (content blocks, `stdout`/`stderr`, or plain string) instead of always substituting a plain string, recount shape metadata such as `numLines` to describe the replacement, and mark the stderr section in merged process output with a `--- stderr ---` line.
- Suppresses byte-identical repeat output with a small stub instead of re-compacting.
- Preserves explicitly requested file ranges.
- Supports per-policy budgets so each tool kind can keep a different amount of output.
- At auto-compact time, guides the host's own compactor to replace old verbose tool results with artifact placeholders when enough output has been stored (see the [Roadmap](#roadmap)).
- Fails open: the original result passes through if compaction fails.

Automatic compaction of `Read`/`read` output is **off by default**: an agent that edits a file it has only seen as a head/tail preview can produce wrong edits. Large-file reads stay available through the explicit `compact_read` tool (which always compacts, since calling it is an explicit request), and automatic read compaction can be enabled with `TOKEN_SAVER_TOOLS=shell,test,search,read`.

## Quick start

Prerequisites: **Node.js 22 or newer** and one of the supported hosts below. Optional: [ripgrep](https://github.com/BurntSushi/ripgrep) for `compact_search`.

### Claude Code

```bash
claude plugin marketplace add mhsenam/claude-codex-token-saver
claude plugin install token-saver@token-saver
```

Restart Claude Code after installation. TokenSaver will automatically compact large `Bash`, `Read`, and `Grep` results.

### Codex CLI

```bash
codex plugin marketplace add mhsenam/claude-codex-token-saver
codex plugin add token-saver@token-saver
codex plugin list
```

Restart your Codex host and review/trust the bundled hook when prompted. Codex uses TokenSaver's MCP tools because its documented `PostToolUse` hooks do not currently provide Claude-style tool-output replacement.

For verbose operations, ask Codex to use the tools directly:

```text
Run the test suite with compact_run and inspect only the failures.
Search for authentication middleware with compact_search.
Read this large file with compact_read, then retrieve any missing lines you need.
```

The bundled skill also teaches Codex when to select these tools.

### opencode

Download the prebuilt plugin file, then restart opencode:

```bash
mkdir -p .opencode/plugins
curl -L -o .opencode/plugins/token-saver.js \
  https://raw.githubusercontent.com/mhsenam/claude-codex-token-saver/main/packages/opencode/dist/plugin.js
```

For a global install, write to `~/.config/opencode/plugins/token-saver.js` instead (or download the file in your browser and place it there manually). TokenSaver automatically compacts large `bash`, `read`, and `grep` results and registers an `output_slice` tool for retrieval.

> Note: the npm package named `opencode-token-saver` is an unrelated project. Install TokenSaver only from the file above or the official repository.

### Qoder

Import the packaged plugin folder `release/qoder/token-saver` (created by `npm run package`) from Qoder IDE via Settings > Plugins > import from a local folder, or install it from a local directory with the Qoder CLI, then restart Qoder:

```bash
qoder plugins install <path-to-release/qoder/token-saver>
qoder plugins validate <path-to-release/qoder/token-saver>
```

The plugin bundles the automatic `PostToolUse` compaction hook, the `PreCompact` guidance hook, and the token-saver MCP server (`compact_read`, `compact_search`, `compact_run`, `output_slice`). If your Qoder version does not resolve bundled MCP or hook paths, follow the manual fallback in `packages/qoder/install/README.md`, which also documents an optional Always Apply rule for biasing the agent toward the compact tools.

## Recovering omitted output

To recover lines 450-469 of a compacted result without rerunning the command, pass this object to the `output_slice` tool (MCP tool, or plugin tool on opencode):

```json
{
  "artifactId": "session.…",
  "startLine": 450,
  "maxLines": 20
}
```

Request a small range, then continue from the returned line number if needed. A result marked `[token-saver] duplicate:` is a byte-identical repeat of an earlier output; its preview plus the referenced artifact covers everything.

## How it works

```text
Verbose tool output
        |
        v
  Full output ------------------> Local artifact store
        |                              |
        v                              |
Deterministic policy                   |
        |                              |
        v                              |
Compact model-visible result           |
        |                              |
        +-------- artifact ID ---------+
                       |
                       v
               output_slice retrieval
```

Compaction policies are shared across hosts. Claude Code, Qoder, and opencode compact automatically through host hooks; Claude and Qoder additionally bundle the MCP server for retrieval and explicit compact operations, opencode registers `output_slice` as a plugin tool, and Codex registers everything through MCP tools and a skill.

## Benchmarks

Run the reproducible synthetic fixtures with:

```bash
npm run benchmark
```

Current fixture results:

| Fixture | Original | Compacted | Estimated reduction |
| --- | ---: | ---: | ---: |
| Verbose shell log | 128,689 B | 6,622 B | 94.9% |
| Test failures | 33,377 B | 2,293 B | 93.1% |
| Repository search | 94,899 B | 6,594 B | 93.0% |
| Large source read | 69,779 B | 4,840 B | 93.1% |

These numbers measure **tool-output bytes and bytes-divided-by-four token estimates**, not provider billing. Total session savings will be lower and vary by workflow because prompts, model responses, cached context, and small tool results are not compacted.

## Configuration

TokenSaver works without configuration. Set environment variables to override defaults:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `TOKEN_SAVER_TOOLS` | `shell,test,search` | Enabled automatic compaction policies (`read` is opt-in; see above) |
| `TOKEN_SAVER_MAX_LINES` | `120` | Output-line budget |
| `TOKEN_SAVER_MAX_BYTES` | `30000` | Approximate output-byte budget |
| `TOKEN_SAVER_MAX_LINE_LENGTH` | `500` | Characters retained per long line |
| `TOKEN_SAVER_HEAD_LINES` | `40` | Lines retained from the beginning |
| `TOKEN_SAVER_TAIL_LINES` | `60` | Lines retained from the end |
| `TOKEN_SAVER_SEARCH_PER_FILE` | `8` | Search matches retained per file |
| `TOKEN_SAVER_RETENTION_HOURS` | `24` | Full-output artifact retention |
| `TOKEN_SAVER_DEDUP` | `1` | Return a small stub instead of re-compacting byte-identical repeat output |
| `TOKEN_SAVER_DEDUP_PREVIEW_LINES` | `20` | Lines kept in a duplicate stub |
| `TOKEN_SAVER_MAX_LINES_<KIND>` | global | Per-policy line-budget override; `<KIND>` is `SHELL`, `TEST`, `SEARCH`, or `READ` (e.g. `TOKEN_SAVER_MAX_LINES_TEST=200`) |
| `TOKEN_SAVER_MAX_BYTES_<KIND>` | global | Per-policy byte-budget override (e.g. `TOKEN_SAVER_MAX_BYTES_SHELL=10000`) |
| `TOKEN_SAVER_HEAD_LINES_<KIND>` | global | Per-policy head override (e.g. `TOKEN_SAVER_HEAD_LINES_SEARCH=0`) |
| `TOKEN_SAVER_TAIL_LINES_<KIND>` | global | Per-policy tail override |
| `TOKEN_SAVER_EVICTION` | `1` | Eviction features (see the roadmap): PreCompact guidance on all hosts, continuous history eviction on opencode |
| `TOKEN_SAVER_EVICTION_MIN_BYTES` | `100000` | Minimum compacted bytes stored for a session before PreCompact eviction guidance activates |
| `TOKEN_SAVER_EVICTION_KEEP_RECENT` | `3` | opencode: most recent artifact-backed tool results kept verbatim before eviction |
| `TOKEN_SAVER_EVICTION_MIN_NET_SAVINGS` | `6000` | opencode: minimum bytes a batch must recover before rewriting anything (protects the prompt cache) |
| `TOKEN_SAVER_REWRITE` | `1` (`0` on Windows) | opencode: redirect whitelisted test/build commands to an artifact and print only a tail |
| `TOKEN_SAVER_STATS` | `1` | Append local JSONL usage statistics (set `0` to disable) |
| `TOKEN_SAVER_DATA_DIR` | `~/.token-saver/outputs` | Artifact storage directory |
| `TOKEN_SAVER_DEBUG` | unset | Set to `1` for Claude hook errors on stderr |

Set `TOKEN_SAVER_TOOLS` to a comma-separated subset of policies to limit automatic compaction, or disable the plugin for a complete bypass.

Per-policy budgets tune each kind independently. A common setup keeps failure context for tests while staying aggressive on routine shell output:

```bash
TOKEN_SAVER_MAX_LINES_TEST=200   # test failures keep more context
TOKEN_SAVER_MAX_LINES_SHELL=60   # routine commands stay small
```

## Measuring impact

Call the `stats` tool (MCP on Claude Code, Codex, and Qoder; plugin tool on opencode) to report accumulated savings:

```text
[token-saver] session statistics (bytes/4 token estimates, not billed tokens)
compactions: 12 | duplicates avoided: 4 | retrievals: 2 | commands rewritten: 3 | sessions: 2
original: 184,320 B | returned: 21,140 B | estimated reduction: 88.5% (~40,795 tokens)
```

Statistics are local-only (`stats.jsonl` beside the artifact store), contain no command content, and are estimates: bytes divided by four, counting only outputs token-saver touched. They deliberately do not claim billed-cost savings — prompt caching (cache reads bill near 0.1x) and extra retrieval turns mean token reduction and cost reduction are related but distinct. Compare provider-reported usage with the plugin disabled for a billed-cost baseline.

## Using alongside other token optimizers

TokenSaver stacks safely with tools like RTK or output-sandboxing plugins, but compressing the same output twice wastes effort and multiplies the places where output is altered. One layer per output type is the goal:

- If another tool already filters shell output (for example RTK's command rewriting), disable the overlapping policies: `TOKEN_SAVER_TOOLS=test,search` keeps token-saver's test and search policies while leaving bash output to the other tool.
- Keep token-saver's distinct advantages: its full-output artifacts with exact line-range recovery (`output_slice`), duplicate suppression, and the `stats` report — most filtering tools have no recovery path.
- Output that passes through another compressor first is simply re-measured by token-saver; below the size thresholds it passes through untouched.

## Privacy and security

- TokenSaver has no analytics, network service, or model API integration.
- Full tool output is written locally with restrictive file permissions where supported.
- Artifacts may contain the same sensitive information as the original logs. Use a suitable retention period and avoid printing secrets in commands.
- `compact_run` executes the shell command requested by the agent. Only install and enable plugins you trust, and review commands as you would with a built-in shell tool.
- File and search path inputs are restricted to the current project; a shell command itself has the permissions of the user running the coding agent.
- Hook failures return the original output instead of blocking the coding session.

## Limitations

- TokenSaver cannot guarantee a specific reduction in provider-reported token usage or cost.
- Small outputs pass through unchanged by design.
- Lossy context can still result from aggressive limits; retrieve the artifact when exact omitted details matter.
- Codex does not currently have feature parity with Claude's automatic `PostToolUse` output replacement, so its MCP tools must be selected by the agent or requested explicitly.
- opencode's hook covers its built-in `bash`, `read`, and `grep` tools only (MCP tool outputs are not hook-addressable), opencode truncates exceptionally large tool output before plugins run, and its TUI may display the original output while the model receives the compacted version.
- opencode source-side command rewriting applies only to simple whitelisted test/build commands (no pipes, redirections, or command substitution) and defaults to off on Windows (`TOKEN_SAVER_REWRITE=1` to enable) because the host shell is not guaranteed to be POSIX.
- Qoder reads hook configuration at startup, so restart after changing hooks or MCP settings; Qoder plugins cannot bundle rules, so the optional tool-preference rule is installed separately.
- Very large commands that exceed the process buffer must be narrowed or split before compaction.

## Roadmap

History eviction attacks the largest remaining cost: a tool result compacted once is still resent in full on every later request until the host discards it. Two mechanisms shipped in 0.4.0:

- **PreCompact-time eviction (all hosts).** At auto-compact the PreCompact hooks read local `stats.jsonl` and, once a session has stored enough compacted output (3+ artifacts totalling 100+ KB by default), instruct the host's own compactor to replace older verbose tool results with one-line artifact placeholders instead of summarizing them, keeping the newest turns verbatim. The host's compactor already rewrites history at that moment, so this adds no extra cache invalidation.
- **Continuous eviction (opencode).** opencode v2 exposes `experimental.chat.messages.transform`, the full mutable message list before every LLM call. TokenSaver replaces artifact-backed tool results older than `TOKEN_SAVER_EVICTION_KEEP_RECENT` turns with placeholders, but only when a batch recovers at least `TOKEN_SAVER_EVICTION_MIN_NET_SAVINGS` bytes, so the 1.25x cache-write tax is only paid when it clearly nets out positive. Only results whose full output is already stored as an artifact are touched, and expired artifacts are skipped.

Claude Code is deliberately excluded from continuous rewriting: its own microcompaction (on by default, keeps roughly the 3 most recent tool results) already clears old results, and TokenSaver's artifact store is the recovery path for exactly those clearings. Codex and Qoder stay on PreCompact-time eviction until they ship comparable request-transform APIs. The full analysis, including the evidence that token reduction is not automatically cost reduction, lives in [docs/history-eviction.md](docs/history-eviction.md).

## Contributing

Issues and pull requests are welcome. Include a realistic output fixture for compaction bugs, run `npm test` and `npm run smoke`, and avoid submitting logs containing credentials or private source code.

## Local development

```bash
git clone https://github.com/mhsenam/claude-codex-token-saver.git
cd claude-codex-token-saver
npm ci
npm test
npm run build
npm run smoke
npm run package
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Type-check all TypeScript sources |
| `npm test` | Run unit and protocol tests |
| `npm run build` | Bundle both plugin adapters |
| `npm run smoke` | Exercise the built Claude and Qoder hooks, the opencode plugin, and the MCP server |
| `npm run benchmark` | Measure synthetic compaction ratios |
| `npm run package` | Create installable directories under `release/` |
| `claude plugin validate packages/claude` | Validate the Claude plugin |

The `packages/*/dist` bundles are tracked so marketplace installs work without a build step. To confirm an installed bundle matches the reviewed source, run `npm run build` and check `git diff -- packages/*/dist` is empty.

## Project structure

```text
packages/
├── core/        # Compaction policies, configuration, artifact storage, shared hook handler
├── mcp-server/  # compact_read, compact_search, compact_run, output_slice
├── claude/      # Claude manifest, hooks, skill, bundled runtime
├── codex/       # Codex manifest, hooks, skill, bundled runtime
├── opencode/    # opencode plugin (npm package and drop-in bundle)
└── qoder/       # Qoder plugin manifest, hooks, MCP config, skill, bundled runtime
benchmarks/      # Reproducible synthetic fixtures
scripts/         # Build, package, and smoke-test automation
```
