# obs-memory

Observational memory for [opencode](https://opencode.ai). It records observations of your work, consolidates them into topics, logs a journey, and injects the result into compaction so context survives across session truncation.

## How it works

OpenCode fires hooks on messages and tool calls. The plugin turns each into a structured observation:

```
## 2026-09-07T14:00:00.000Z
[TOOL: file-read]
Read memory.ts
METADATA: {"filePath":"D:\\Coding Stuff\\obs-memory\\src\\memory.ts"}
```

When the raw buffer for a session grows past the consolidation threshold, the plugin:

1. Groups observations by topic (`deriveTopicKey` from file paths).
2. Writes topic files with frontmatter (`id`, `title`, `summary`, `updated`, `observation_count`).
3. Appends a journey segment (tag counts + areas + notable content).
4. Regenerates a topic index table.
5. Clears the raw buffer.

### Memory layout

Memory is stored globally, so it is shared across projects:

```
~/.config/opencode/memory/<sessionID>/
├── observations.md   # raw observation buffer
├── topics/<topic>.md # consolidated observations by topic
├── journey.md        # per-consolidation activity log
└── index.md          # topic index table
```

### Compaction injection

On compaction (`experimental.session.compacting`), the plugin injects `index.md` and `journey.md` verbatim into the compaction context. If neither exists yet, it falls back to a slice of the raw buffer.

## Install

Add the package to your `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@virail/obs-memory"]
}
```

Then optionally add the commands and skill (see below).

## Commands and skills

The package ships two slash commands and one skill. OpenCode only loads commands and skills from your config directories, so copy them from the package once:

```sh
cp -r node_modules/@virail/obs-memory/commands ~/.config/opencode/
cp -r node_modules/@virail/obs-memory/skills ~/.config/opencode/
```

### Commands

| Command | Description |
|---|---|
| `/recall <topic>` | Combine all memory across all sessions for a topic |
| `/memory` | Show the current session's buffer, index, and journey |

### Skill

`memory-recall` lets the agent pull relevant history on its own — matching a topic across sessions, or recalling what was observed in one project's past work.

## Configuration

- `CONSOLIDATION_THRESHOLD` in `src/memory.ts` controls when consolidation runs (default `50 * 1000` characters of raw buffer). Lower it if you want more frequent consolidation.
- Observations are grouped heuristically (tag counts, file paths, content length). No LLM calls are made by the plugin.

## Local development

```sh
bun install
bun run typecheck   # tsc --noEmit
bun run build       # bun build src/index.ts -> dist/index.js
```

## License

MIT