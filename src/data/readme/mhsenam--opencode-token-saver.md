# TokenSaver

### Reduce Claude Code, Codex, opencode, and Qoder token usage without losing tool output

TokenSaver is a local-first context optimization plugin for **Claude Code**, **OpenAI Codex**, **opencode**, and **Qoder**. It compacts verbose command logs, test failures, repository searches, and large file reads before they consume your model context. The complete output remains available locally whenever you need it.

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb)](https://code.claude.com/docs/en/plugins/overview)
[![Codex plugin](https://img.shields.io/badge/OpenAI%20Codex-plugin-111111)](https://developers.openai.com/plugins/build/plugins)
[![opencode plugin](https://img.shields.io/badge/opencode-plugin-1f6feb)](https://opencode.ai/docs/plugins)
[![Qoder plugin](https://img.shields.io/badge/Qoder-plugin-00a0e9)](https://docs.qoder.com/extensions/plugins)

## Why TokenSaver?

Coding agents can read thousands of lines of logs, search matches, and source code into context. Those tool results are then resent in subsequent model requests, increasing token usage and leaving less room for your actual task.

TokenSaver uses **deterministic local compaction**, not another AI summarization step:

- No additional model calls or API keys.
- No cloud processing or telemetry.
- No lossy summary of the underlying output.
- Full output recovery by exact line range.
- Original exit codes, failures, paths, and line numbers remain visible.

## Features

| Capability | Claude Code | Codex | opencode | Qoder |
| --- | --- | --- | --- | --- |
| Compact verbose shell and test output | Automatic `PostToolUse` hook | `compact_run` MCP tool | Automatic `bash` hook | Automatic `PostToolUse` hook |
| Compact broad repository searches | Automatic `Grep` hook | `compact_search` MCP tool | Automatic `grep` hook | Automatic `Grep` hook |
| Compact large file reads | Opt-in (`TOKEN_SAVER_TOOLS`) | `compact_read` MCP tool | Opt-in (`TOKEN_SAVER_TOOLS`) | Opt-in (`TOKEN_SAVER_TOOLS`) |
| Suppress repeated identical output | Automatic | Automatic | Automatic | Automatic |
| Rewrite verbose commands at the source | Not needed (output never reaches the API uncompacted) | Via `compact_run` | Automatic for simple test/build commands | Not needed (output never reaches the API uncompacted) |
| Preserve explicitly requested file ranges | Yes | Yes | Yes | Yes |
| Retrieve omitted output | `output_slice` | `output_slice` | `output_slice` plugin tool | `output_slice` MCP tool |
| Report accumulated savings | `stats` tool | `stats` tool | `stats` plugin tool | `stats` tool |
| Improve automatic context compaction | `PreCompact` guidance | `PreCompact` guidance | `experimental.session.compacting` guidance | `PreCompact` guidance |
| Store full output locally | Yes | Yes | Yes | Yes |

Additional behavior:

- Removes ANSI escape sequences from compacted previews.
- Collapses consecutive duplicate lines.
- Preserves test failures and nearby stack traces.
- Groups search results by file with per-file limits.
- Truncates exceptionally long lines, including Unicode-safe truncation.
- Replacements mirror the original tool-output shape (content blocks, `stdout`/`stderr`, or plain string) instead of always substituting a plain string, recount shape metadata such as `numLines` to describe the replacement, and mark the stderr section in merged process output with a `--- stderr ---` line.
- Fails open: the original result passes through if compaction fails.
- Supports configurable retention and output limits.

Automatic compaction of `Read`/`read` output is **off by default**: an agent that edits a file it has only seen as a head/tail preview can produce wrong edits. Large-file reads stay available through the explicit `compact_read` tool (which always compacts, since calling it is an explicit request), and automatic read compaction can be enabled with `TOKEN_SAVER_TOOLS=shell,test,search,read`.

## Quick start

### Prerequisites

- **Node.js 22 or newer**
- Claude Code, Codex CLI, opencode, or Qoder
- Optional: [ripgrep](https://github.com/BurntSushi/ripgrep) for `compact_search`

### Install for Claude Code

```bash
claude plugin marketplace add mhsenam/claude-codex-token-saver
claude plugin install token-saver@token-saver
```

Restart Claude Code after installation. TokenSaver will automatically compact large `Bash`, `Read`, and `Grep` results.

### Install for Codex

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

### Install for opencode

Once `opencode-token-saver` is published to npm, add it to the `plugin` array in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-token-saver"]
}
```

opencode installs npm plugins automatically at startup. A no-install alternative is to copy `packages/opencode/dist/plugin.js` into `.opencode/plugins/token-saver.js` (project) or `~/.config/opencode/plugins/token-saver.js` (global).

Restart opencode. TokenSaver automatically compacts large `bash`, `read`, and `grep` results and registers an `output_slice` tool for retrieval.

### Install for Qoder

Import the packaged plugin folder `release/qoder/token-saver` (created by `npm run package`) from Qoder IDE via Settings > Plugins > import from a local folder, or install it from a local directory with the Qoder CLI, then restart Qoder:

```bash
qoder plugins install <path-to-release/qoder/token-saver>
qoder plugins validate <path-to-release/qoder/token-saver>
```

The plugin bundles the automatic `PostToolUse` compaction hook, the `PreCompact` guidance hook, and the token-saver MCP server (`compact_read`, `compact_search`, `compact_run`, `output_slice`). If your Qoder version does not resolve bundled MCP or hook paths, follow the manual fallback in `packages/qoder/install/README.md`, which also documents an optional Always Apply rule for biasing the agent toward the compact tools.

## Example

A 2,000-line command log becomes a small preview with head, tail, and important lines:

```text
[token-saver] shell: 2000 lines/128689 B → 104 lines/6420 B. Full output: session.…; use token-saver output_slice with startLine and maxLines.
progress 0% chunk 0 …
[… original lines 41–1940 omitted …]
FAIL: final assertion failed
[exit code: 1]
```

To recover lines 450–469 without rerunning the command:

```json
{
  "artifactId": "session.…",
  "startLine": 450,
  "maxLines": 20
}
```

Pass that object to the `output_slice` MCP tool.

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
| `TOKEN_SAVER_REWRITE` | `1` (`0` on Windows) | opencode: redirect whitelisted test/build commands to an artifact and print only a tail |
| `TOKEN_SAVER_STATS` | `1` | Append local JSONL usage statistics (set `0` to disable) |
| `TOKEN_SAVER_DATA_DIR` | `~/.token-saver/outputs` | Artifact storage directory |
| `TOKEN_SAVER_DEBUG` | unset | Set to `1` for Claude hook errors on stderr |

Set `TOKEN_SAVER_TOOLS` to a comma-separated subset of policies to limit automatic compaction, or disable the plugin for a complete bypass.

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

## Privacy and security

- TokenSaver has no analytics, network service, or model API integration.
- Full tool output is written locally with restrictive file permissions where supported.
- Artifacts may contain the same sensitive information as the original logs. Use a suitable retention period and avoid printing secrets in commands.
- `compact_run` executes the shell command requested by the agent. Only install and enable plugins you trust, and review commands as you would with a built-in shell tool.
- File and search path inputs are restricted to the current project; a shell command itself has the permissions of the user running the coding agent.
- Hook failures return the original output instead of blocking the coding session.

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

History eviction (replacing old tool results in the outgoing request with artifact placeholders, keeping recent turns verbatim) is planned next. It is gated on real `stats` data because rewriting request history invalidates prompt-cache prefixes, and cache writes bill at 1.25x versus 0.1x for cache reads; eviction must be batched and thresholded to net out positive.

## Contributing

Issues and pull requests are welcome. Include a realistic output fixture for compaction bugs, run `npm test` and `npm run smoke`, and avoid submitting logs containing credentials or private source code.
