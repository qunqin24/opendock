# opencode-plugin-resumator

Automated context compression and project tree mapping plugin for OpenCode.

## Features

- **Automatic Context Compression:** Triggers context summarization at 30% capacity.
- **Dynamic File Tree:** Injects a real-time bounded project structure into the system prompt, respecting the project's `.gitignore` (plus `node_modules`, `dist`, `build`, `coverage`, `.cache`) so compiled files and large local folders never leak into the tree.
- **State Retention:** Preserves modified files and key technical decisions across compressions.
- **Smart Git Status Awareness:** Injects the current branch, staged/modified/untracked files, and recent commits into the system prompt. Omitted automatically when not in a git repo.
- **Advanced Project Mapping:** Injects the runtime and key dependencies from the manifest (`package.json`, `pyproject.toml`, or `Cargo.toml`), plus a static block pointing to where tests and docs live so the agent knows how to run verifications without listing every route.
- **Manual State Reset:** The `/resumator-clear` command (registered automatically by the plugin) zeroes the saved modified files and recorded decisions when the conversation changes focus.
- **Disk Persistence:** Technical state is saved in compact TOON format (Token-Oriented Object Notation, token-efficient for LLMs) to `.opencode/resumator-state.toon` in the project root and reloaded on startup, so plugin memory survives closing and reopening the terminal. Legacy `.json` state is migrated automatically.

## Installation

```bash
npm install opencode-plugin-resumator
```

## Development

```bash
npm install   # installs tiktoken + ignore + smol-toml + @toon-format/toon
npm test      # runs node --test on *.test.js
```

## Configuration

Optional settings under the `contextCompressor` key in `opencode.json` at the project root:

```json
{
  "contextCompressor": {
    "totalModelLimit": 128000,
    "triggerPercentage": 0.3,
    "enableDependencies": true,
    "enableTestsDocs": true
  }
}
```

- `enableDependencies`: toggle the runtime/dependency metadata block (default `true`).
- `enableTestsDocs`: toggle the tests/docs block (default `true`).

Token usage is counted with `tiktoken` (`cl100k_base` encoding), falling back to a char/4 heuristic if the library cannot be loaded.
