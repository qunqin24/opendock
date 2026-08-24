# opencode-plugin-resumator

Automated project context injection and technical state retention for OpenCode.

## Features

- **Per-turn context injection:** Injects a bounded project tree, git status, runtime/deps metadata, tests/docs map, and session technical state into the system prompt via `experimental.chat.system.transform`.
- **Dynamic File Tree:** Real-time bounded project structure, respecting the project's `.gitignore` (plus `node_modules`, `dist`, `build`, `coverage`, `.cache`).
- **State Retention:** Tracks modified files and key technical decisions from session messages (`experimental.chat.messages.transform`) and surfaces them across turns.
- **Native compaction enrich:** On OpenCode session compaction, injects technical state (and optional metadata) through `experimental.session.compacting` so memory survives summarization. History compression itself is handled by OpenCode — this plugin does not rewrite the session transcript.
- **Smart Git Status Awareness:** Branch, staged/modified/untracked files, and recent commits. Omitted when not in a git repo.
- **Advanced Project Mapping:** Runtime and key dependencies from `package.json`, `pyproject.toml`, or `Cargo.toml`, plus where tests and docs live.
- **Manual State Reset:** `/resumator-clear` zeroes saved modified files and recorded decisions when focus changes.
- **Manual Context Injection:** `/resumator-context` injects the full project context on demand.
- **Disk Persistence:** Technical state saved in compact TOON format to `.opencode/resumator-state.toon` and reloaded on startup. Legacy `.json` is migrated automatically.

## Installation

```bash
npm install opencode-plugin-resumator
```

Add to your OpenCode config (`opencode.json` / `~/.config/opencode/opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-resumator"]
}
```

Restart OpenCode after installing or upgrading — plugins are not hot-reloaded.

## Development

```bash
npm install   # installs tiktoken + ignore + smol-toml + @toon-format/toon
npm test      # runs node --test on *.test.js
npm run release  # tags and pushes the version from package.json (triggers CI publish)
```

Local path (without publishing):

```json
{
  "plugin": ["file:///absolute/path/to/opencode-plugin-resumator/index.js"]
}
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

- `totalModelLimit`: used to report approximate context usage % in the injected block (default `128000`).
- `triggerPercentage`: retained for metrics/display compatibility (default `0.3`). Compaction is owned by OpenCode.
- `enableDependencies`: toggle the runtime/dependency metadata block (default `true`).
- `enableTestsDocs`: toggle the tests/docs block (default `true`).

Token usage is counted with `tiktoken` (`cl100k_base` encoding), falling back to a char/4 heuristic if the library cannot be loaded.

## Commands

| Command | Description |
| --- | --- |
| `/resumator-clear` | Reset saved modified files and recorded decisions |
| `/resumator-context` | Inject the full project context block into the prompt |
