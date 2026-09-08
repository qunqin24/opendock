# opencode-plugin-lisp

OpenCode plugin that runs a persistent [SBCL](https://www.sbcl.org/) (Steel Bank Common Lisp) sidecar. Provides Common Lisp evaluation plus cross-language repository indexing, dependency graph queries, and change verification via ctags.

State, packages, and `defvar`s persist across evaluations for the lifetime of the sidecar process.

## Prerequisites

You need SBCL and [ctags](https://github.com/universal-ctags/ctags) installed on your system:

```bash
# macOS
brew install sbcl universal-ctags

# Ubuntu / Debian
sudo apt install sbcl universal-ctags

# Fedora
sudo dnf install sbcl ctags

# Windows — download SBCL from https://www.sbcl.org, ctags from https://github.com/universal-ctags/ctags
```

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-lisp"]
}
```

OpenCode will automatically install the plugin via Bun on startup.

## Tools

### `lisp_eval`

Evaluate a Common Lisp expression in the persistent SBCL sidecar. The expression must be a single line. State, packages, and `defvar`s persist between calls.

```
lisp_eval code="(let ((x 40)) (+ x 2))"
```

Returns the printed value, its type, and any output the expression wrote.

### `lisp_reset`

Reset the sidecar: clear observation history, session knowledge, and the repository index/graph, then re-index the project.

```
lisp_reset
```

### `repo_context`

Query the persistent repository index and dependency graph for symbols, definitions, locations, and dependencies relevant to a task description. Works with any language ctags supports — not limited to Lisp.

```
repo_context problem="Add password-reset links that expire"
repo_context problem="Fix the auth middleware" limit=20
```

Returns matched symbols and files with roles, ranked by relevance. Graph-expanded results are labeled `caller` / `defines` / `called-by` / `same-file` / `match` / `lexical` with a hop `distance` and `score`, so callers of a symbol surface above unrelated name matches.

### `change_impact`

Analyze the blast radius of a change *before* running tests. Give it a diff (or a description of an intended change) and it returns the symbols touched, the files that call them, and the tests that exercise them — plus a suggested targeted test run.

```
change_impact diff="<patch content>"
change_impact target="change createToken to accept an expiry"
```

Roots are symbols whose definition falls inside the diff's changed line ranges (or lexical matches when you describe the change instead of diffing it). Callers come from the graph's reverse call edges; the covering tests reuse the same two-layer mapping as `verify_change`. Use it to plan a change and to decide what to verify.

### `verify_change`

Run a test suite against the current working tree and return structured results with recovery actions on failure. The diff is used to attribute failures to the files you changed.

```
verify_change diff="<patch content>"
verify_change diff="<patch content>" test_command="cargo test"
```

When `test_command` is omitted the plugin auto-detects one (`npm test` for Node, `cargo test`, `go test ./...`, `python -m pytest`, ...). Verification is **targeted first**: for each changed file it finds the tests that exercise it and runs them first, so a broken change fails fast. If the targeted tests pass (or none can be found), the full suite runs. Tests run from Node (no `sh` dependency, works on Windows); the sidecar parses captured output into structured failures, distinguishing **setup/infra errors** from real **assertion failures**, extracting failing test files, and returning targeted recovery actions.

## Hooks

The plugin observes OpenCode events and feeds context to the sidecar automatically:

- **`chat.message`** — records user messages to the sidecar's observation history
- **`experimental.chat.messages.transform`** — auto-injects a compact ranked list of likely-relevant locations into each new user turn, so the agent starts with the repo map instead of discovering it (`OPL_AUTO_CONTEXT=0` disables)
- **`tool.execute.before`** — logs tool calls before execution
- **`tool.execute.after`** — logs tool results and schedules an **incremental index refresh** of exactly the files that were edited (`edit`, `write`, `apply_patch`, `patch`)
- **`experimental.session.compacting`** — injects a session summary into the context when a session is compacted (recently edited files, recent requests, stored knowledge)

On startup, the plugin auto-indexes the project root and builds the dependency graph. After edits, only the changed files are re-indexed — unchanged files reuse their cached call-site tokens.

## How It Works

The plugin spawns a persistent SBCL subprocess that communicates over stdin/stdout using a line-based, tab-separated protocol. The sidecar maintains state between evaluations — variables, packages, and definitions persist until the process is restarted.

**Repository indexing** uses ctags (`--output-format=json`) to extract symbols in any supported language, excluding junk directories (`node_modules`, `.git`, `dist`, `build`, `target`, venvs, caches, ...) by default. The sidecar then builds a reference graph with two node kinds: **symbols** and **files**. A file node points to every symbol it defines (`:defines`) and to every symbol it calls elsewhere (`:calls`) — a call is detected as an identifier directly followed by `(` (or preceded by `(`, Lisp-style). Comments and string literals are skipped so they cannot fabricate call sites, and when several same-named definitions tie for the most plausible target the edge is dropped rather than guessed. Per-file call-site tokens are cached in memory so refreshes re-read only changed files.

**Querying** tokenizes the input, scores symbols by name/scope/path matches, uses the top hits as graph seeds, and expands one or two hops. Ranking combines the lexical score with a graph reward (seeds > direct neighbors > two-hop) plus a small boost for files edited earlier in the session, and each result is annotated with its role relative to the seeds — so a query like "who calls `createUser`" returns the calling *files* first, not just unrelated symbols that share words with the query.

**Test mapping** uses two layers so it works across test layouts. First, the graph: a changed file's symbols are matched against test files (recognized by a broad set of conventions — `.test.*`/`.spec.*`/`test_*`/`*_test`/`_spec`/`*Test.java|php|cs`, `__tests__/`, `tests/`, `spec/`, `e2e/`, ...) whose call sites reach them. Second, a filesystem fallback scans test roots and the changed files' directories for same-stem test files when the graph finds none. If no tests can be found or run, verification transparently falls back to the full suite.

**Verification** runs the test command from the Node host (cross-platform, no `sh`), sends the captured output to the sidecar, which parses failures into structured categories and recovery suggestions.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPL_SBCL` | `sbcl` | Path to the SBCL binary |
| `OPL_DEBUG` | `0` | Set to `1` to enable debug logging |
| `OPL_CTAGS_EXCLUDES` | *(built-ins)* | Comma-separated extra names to exclude from indexing (e.g. `generated,legacy`) |
| `OPL_AUTO_CONTEXT` | `1` | Set to `0` to disable auto-injecting repo context into each user turn |

## Development

See [`ROADMAP.md`](./ROADMAP.md) for the ranked list of improvements yet to implement.

The sidecar speaks a line-based protocol over stdin/stdout, so it can be exercised without OpenCode:

- `npm run test:sidecar` — protocol basics (ping, eval, persistence, reset)
- `npm run test:graph` — graph expansion, roles, ranking, test mapping, session memory (synthetic tags)
- `npm run test:index` — real ctags indexing, excludes, incremental refresh (requires ctags)
- `npm run benchmark` — offline retrieval benchmark comparing graph vs lexical recall (requires ctags)

## Security

`lisp_eval` evaluates arbitrary Common Lisp in the sidecar by design — treat it as code execution with full access to the host machine. If you use this plugin with untrusted prompts, gate the tool behind OpenCode permission rules (e.g. deny `lisp_eval` for untrusted sessions).

## License

MIT
