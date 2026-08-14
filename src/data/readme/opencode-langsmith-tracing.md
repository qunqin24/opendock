# LangSmith Tracing Plugin for opencode

[![npm version](https://img.shields.io/npm/v/opencode-langsmith-tracing.svg?logo=npm&logoColor=white)](https://www.npmjs.com/package/opencode-langsmith-tracing)
[![npm downloads](https://img.shields.io/npm/dm/opencode-langsmith-tracing.svg?logo=npm&logoColor=white)](https://www.npmjs.com/package/opencode-langsmith-tracing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](./tsconfig.json)
[![Node >=20](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white)](./package.json)

> **Full observability for [opencode](https://opencode.ai) sessions.**
> Stream every conversation turn, LLM call, tool call, reasoning step, token
> usage, cost, and context compaction to
> [LangSmith](https://smith.langchain.com). Trace taxonomy compatible with
> the official
> [`langsmith-claude-code-plugins`](https://github.com/langchain-ai/langsmith-claude-code-plugins),
> so existing LangSmith dashboards and evaluators built for Claude Code
> work unchanged.

**Keywords**: opencode tracing · LangSmith tracing for opencode · opencode
plugin · opencode observability · LLM tracing · agent tracing · Claude Code
equivalent for opencode.

## Quick start (30 seconds)

```jsonc
// opencode.json (project root, or ~/.config/opencode/opencode.json globally)
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-langsmith-tracing"]
}
```

```bash
# .opencode/langsmith.env (auto-loaded by the plugin; gitignore it!)
LANGSMITH_TRACING=true
OC_LANGSMITH_API_KEY=lsv2_pt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OC_LANGSMITH_PROJECT=my-opencode
```

That's it — start `opencode` and every conversation will appear in your
LangSmith project in real time.

> Tested with opencode `1.4.x`.

## Trace hierarchy

```
OpenCode Turn                (chain)  ← one per user prompt
├── OpenCode Assistant       (llm)    ← step 1 (e.g. reasoning + tool call)
├── <tool name>              (tool)   ← e.g. bash
├── OpenCode Assistant       (llm)    ← step 2 (continuation after tool result)
└── Context Compaction       (chain)  ← when session is compacted
```

Multi-step turns (tool use → continuation) keep the Turn open across
steps, so each LLM call you make to your model becomes its own
`OpenCode Assistant` run, all nested under the same `OpenCode Turn`.

Every run carries:

- `ls_provider` / `ls_model_name` extracted from opencode's provider/model ids
- `usage_metadata` (input, output, reasoning, cache read/write tokens)
- `cost_usd` from opencode's own cost accounting
- `thread_id`, `turn_number`, `agent`, and any custom metadata you supply

Interrupted turns (e.g. the user starts a new prompt before the assistant
finishes) are closed with `error: "Interrupted"` so they remain visible in
LangSmith rather than hanging open.

## Installation

### From npm (recommended)

Add the plugin to your opencode configuration (`opencode.json` at the
project root, or `~/.config/opencode/opencode.json` globally):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-langsmith-tracing"]
}
```

opencode will install it from npm at startup; no manual `npm install`
needed.

### From a local clone (development)

```bash
git clone https://github.com/Dramalf/opencode-langsmith-tracing.git
cd opencode-langsmith-tracing
npm install
npm run build
```

Then create a thin loader inside your opencode config directory so opencode
loads the built `dist/` directly (no npm install needed):

```ts
// ~/.config/opencode/plugins/langsmith.ts  (or .opencode/plugins/langsmith.ts in any project)
export { default } from "/absolute/path/to/opencode-langsmith-tracing/dist/index.js";
```

If you publish a fork to npm under a different name, you can also reference
it from `opencode.json` like the recommended path above, just with your
package name in `"plugin": [...]`.

## Configuration

The plugin reads its configuration from environment variables. At minimum,
set `TRACE_TO_LANGSMITH=true` and an API key.

| Variable                           | Aliases (lower priority)                     | Required | Default                           | Description                                                          |
| ---------------------------------- | -------------------------------------------- | -------- | --------------------------------- | -------------------------------------------------------------------- |
| `TRACE_TO_LANGSMITH`               | `OC_TRACE_TO_LANGSMITH`, `LANGSMITH_TRACING` | Yes\*    | —                                 | Set to `"true"` to enable tracing.                                  |
| `OC_LANGSMITH_API_KEY`             | `CC_LANGSMITH_API_KEY`, `LANGSMITH_API_KEY`  | Yes\*\*  | —                                 | LangSmith API key.                                                   |
| `OC_LANGSMITH_PROJECT`             | `CC_LANGSMITH_PROJECT`, `LANGSMITH_PROJECT`  | No       | `"opencode"`                       | LangSmith project name.                                              |
| `OC_LANGSMITH_ENDPOINT`            | `CC_LANGSMITH_ENDPOINT`, `LANGSMITH_ENDPOINT`| No       | `https://api.smith.langchain.com` | LangSmith API base URL (use this for self-hosted LangSmith).        |
| `OC_LANGSMITH_DEBUG`               | `CC_LANGSMITH_DEBUG`, `LANGSMITH_DEBUG`      | No       | `"false"`                         | Verbose debug logs to stderr.                                        |
| `OC_LANGSMITH_PARENT_DOTTED_ORDER` | `CC_LANGSMITH_PARENT_DOTTED_ORDER`           | No       | —                                 | Dotted-order of an existing run to nest every opencode trace under.  |
| `OC_LANGSMITH_METADATA`            | `CC_LANGSMITH_METADATA`                      | No       | —                                 | JSON object of metadata merged into every run's `extra.metadata`.    |
| `OC_LANGSMITH_RUNS_ENDPOINTS`      | `CC_LANGSMITH_RUNS_ENDPOINTS`                | No       | —                                 | JSON array of LangSmith replica endpoints for multi-project tracing. |
| `OC_LANGSMITH_ENV_FILE`            | —                                            | No       | —                                 | Path to a custom env file (overrides the default `.opencode/langsmith.env` lookup). |

\* Tracing is disabled unless one of the `*_TRACING` vars is truthy.
\*\* Required unless `OC_LANGSMITH_RUNS_ENDPOINTS` is supplied.

The `CC_LANGSMITH_*` aliases are accepted on purpose so you can share a
single env file between this plugin and the
[`langsmith-claude-code-plugins`](https://github.com/langchain-ai/langsmith-claude-code-plugins)
plugin. Resolution order for any setting: `OC_*` → `CC_*` → bare
`LANGSMITH_*`.

### Option 1 — project-local `.opencode/langsmith.env` (recommended)

The plugin auto-loads a `.opencode/langsmith.env` file from the project
directory at startup and injects its contents into `process.env` (without
overriding variables already set in your shell). Create one per project:

```bash
mkdir -p .opencode
cat > .opencode/langsmith.env <<'EOF'
LANGSMITH_TRACING=true
OC_LANGSMITH_API_KEY=lsv2_pt_...
OC_LANGSMITH_PROJECT=my-opencode
EOF
echo '.opencode/langsmith.env' >> .gitignore   # don't commit your API key
```

The same file format and key naming is intentionally compatible with
`langsmith-claude-code-plugins`, so you can share one env file between
opencode and Claude Code.

You can override the search path with `OC_LANGSMITH_ENV_FILE=/abs/path`.

### Option 2 — shell profile

Add to your `~/.zshrc` / `~/.bashrc`:

```bash
export TRACE_TO_LANGSMITH="true"
export OC_LANGSMITH_API_KEY="lsv2_pt_..."
export OC_LANGSMITH_PROJECT="my-opencode"
```

Shell-exported variables take precedence over anything in the env file.

### Note on `opencode.json`

opencode does not currently support an `env` field in `opencode.json`
(unlike Claude Code's `settings.json`). Use one of the two options above.

### Nesting under an existing LangSmith run

```bash
export OC_LANGSMITH_PARENT_DOTTED_ORDER="$(python - <<'PY'
from langsmith import traceable, get_current_run_tree
print(get_current_run_tree().dotted_order)
PY
)"
```

or, from TypeScript:

```ts
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { spawnSync } from "node:child_process";

const run = traceable(async (prompt: string) => {
  const tree = getCurrentRunTree();
  return spawnSync("opencode", ["run", prompt], {
    env: {
      ...process.env,
      TRACE_TO_LANGSMITH: "true",
      OC_LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
      OC_LANGSMITH_PROJECT: "my-opencode",
      OC_LANGSMITH_PARENT_DOTTED_ORDER: tree?.dotted_order,
    },
  });
}, { name: "run_opencode" });
```

## Which opencode events are captured

| opencode hook / event                | LangSmith effect                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `chat.message`                       | Opens a new `Turn` chain run with the full user prompt + attachments. (Canonical entry point.)            |
| `message.updated` (role `user`)      | No-op if the message belongs to the current turn. Synthetic user messages (compaction, subtask, replays) are ignored to avoid ghost turns. |
| `message.updated` (role `assistant`) | Opens / updates an `OpenCode Assistant` LLM run with provider, model, agent, and token metadata.          |
| `message.part.updated` (text)        | Accumulates assistant text output.                                                                        |
| `message.part.updated` (reasoning)   | Captured as a `thinking` block on the assistant run output.                                               |
| `message.part.updated` (tool)        | Creates a tool run on `running`, patches it on `completed` / `error` with output, latency, and metadata.  |
| `message.part.updated` (step-finish) | Accumulates input / output / reasoning / cache token counts and cost into the assistant run.              |
| `tool.execute.before` / `.after`     | Captures argument and output fidelity for tools opencode routes through plugin hooks.                     |
| `message.updated` (assistant completed) | Closes the assistant LLM run. **Closes the Turn too** unless `finish` is `tool-calls` / `tool_use` (then waits for the continuation step). |
| `experimental.session.compacting`    | Starts a compaction timer so the duration can be attached later.                                          |
| `session.compacted`                  | Creates a `Context Compaction` chain run under the active turn.                                           |
| `session.idle` / `session.status: idle` | Backup turn-close trigger if the assistant-completed path missed it.                                   |
| `session.error`                      | Closes the open turn with the error details.                                                              |
| `session.deleted`                    | Closes the open turn with `error: "Session deleted"`.                                                     |

Unknown event types are silently ignored. Interrupted turns (the user
cancels mid-response) are closed with `error: "Interrupted"` so they
remain visible in LangSmith rather than hanging open.

## Development

```bash
npm install
npm run dev       # tsc --watch
npm run build     # ./dist
npm run typecheck # no-emit typecheck
```

## License

MIT
