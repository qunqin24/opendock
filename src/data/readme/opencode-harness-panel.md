# OpenCode Harness Panel

A configurable, read-only OpenCode TUI plugin that summarizes the active session and its surrounding agent harness in
one sidebar block.

## Status

Version 0.1.1 is the current public release. It supports OpenCode `>=1.18.4 <2` and uses only the public TUI plugin API.

## Features

- A focused default view of available skills and available or observed subagents
- A concise session summary and optional safe per-tool activity counts
- Clear `Used this session` and `Available now` groups with visual status markers
- Proven conventional-file contributions for agents, with unknown provenance kept explicit
- Collapsible sections using the same mouse interaction as OpenCode's built-in sidebar
- Optional runtime, plugins, hook sources, Code Mode, MCP, LSP, files, todos, and configuration catalogs
- Optional agents, commands, references, requests, MCP, LSP, files, and todo summaries
- Explicitly partial hook-source reporting
- Safe defaults that hide arguments, raw errors, secrets, and absolute paths

The panel distinguishes capabilities that are available from those observed in the messages currently loaded by
OpenCode. It does not fetch older session messages solely for analysis.

`●` marks session-observed activity and `○` marks an available capability. Agent badges retain each observed contribution,
for example `[built-in base + user file?]`, `[user file?]`, `[project file?]`, or `[user file? + project file?]`.
`[source unknown]` remains when the public catalog and conventional filenames provide no safe evidence. Skill labels
`project?` and `user?` remain path-derived.

## Development

Requirements:

- OpenCode 1.18.4 or newer, below 2.0
- Bun 1.2 or newer

Install dependencies and validate the project:

```bash
bun install
bun run check
```

Run OpenCode from this repository to load `src/index.tsx` through the included `tui.jsonc`:

```bash
opencode
```

To test the compiled entrypoint instead, change the local plugin spec to `./dist/index.js` after running
`bun run build`.

## Install from npm

Add the package to your user or project `tui.jsonc`. OpenCode installs npm TUI plugins on startup.

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-harness-panel",
      {
        "preset": "balanced",
      },
    ],
  ],
}
```

Quit and restart OpenCode after changing `tui.jsonc`. The package supports OpenCode `>=1.18.4 <2`.

To validate a release candidate before publishing, run:

```bash
bun run test:consumer
```

This packs the project, installs the tarball into an isolated temporary consumer, and imports its public
`opencode-harness-panel/tui` entrypoint.

Maintainers should follow [RELEASING.md](RELEASING.md) for versioning, npm publication, and trusted GitHub Actions
publishing.

## Configuration

TUI plugin options are supplied in the tuple form supported by `tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "./src/index.tsx",
      {
        "preset": "balanced",
        "provenance": false,
        "sections": {
          "mcp": true,
          "files": false,
        },
        "privacy": {
          "paths": "basename",
          "arguments": "hidden",
          "errors": "summary",
        },
        "limits": {
          "itemsPerSection": 8,
        },
      },
    ],
  ],
}
```

Invalid values fall back to safe defaults and never prevent the plugin from loading.

`provenance` defaults to `false`. Set it to `true` to show capability-origin badges and enable the agent filename scan.

### Presets

| Preset     | Sections                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `minimal`  | Subagents                                                               |
| `balanced` | Skills and subagents                                                    |
| `all`      | Every supported section, including MCP, LSP, files, todos, and commands |

Per-section booleans override the selected preset. Supported section keys are:

```text
runtime, skills, subagents, tools, plugins, hooks, integrations, agents, commands,
references, permissions, mcp, lsp, files, todos
```

`itemsPerSection` is clamped between 1 and 20. The default is 8.

Click a section title to collapse or expand it. This view state is local and resets when the sidebar is remounted.

### Privacy

The plugin never renders tool inputs, tool outputs, prompt text, todo content, OAuth tokens, environment values, or raw
errors. Common token formats are redacted from labels as an additional safeguard.

Tool activity is disabled by default. Enable `sections.tools` to aggregate persisted tool parts by tool name and render
only call counts; it never reads tool arguments, titles, metadata, outputs, or error bodies.

Agent provenance collection recursively reads directory-entry names and types only. It never reads agent file contents,
prompts, or configuration files, and discovered paths are neither retained in the projection nor rendered.

Path policies:

- `basename` is the default and renders only the final path component.
- `hidden` replaces paths with `[hidden]`.

Arguments are always `hidden`. Errors can be `summary` or `hidden`; neither setting renders the raw error body.

## Introspection Limits

- Hook registrations and executions are not enumerable through the public OpenCode API. The panel lists configured
  server plugins only as possible hook sources and states that registry and activity are unavailable.
- Code Mode has no authoritative public state field. The panel reports it as available when the loaded message tool map
  contains `execute`, and observed after an `execute` tool part appears.
- The agent and model selected in an unsent prompt are private TUI state. The panel uses values persisted in the session
  or loaded messages.
- Catalog requests for skills, agents, and commands use public SDK endpoints. A failed request is shown only as
  `Catalog unavailable`, without exposing the underlying error.
- Skill use is detected from persisted `skill` tool parts by reading only the public `name` field. The panel never reads
  or renders any other skill arguments or tool output.
- OpenCode merges global, project, and local agent configuration before exposing the public catalog. The panel supplements
  it only with recursive `*.md` filenames under `agent/` and `agents/` in the public user configuration root, and under
  `.opencode/agent/` and `.opencode/agents/` from the active directory through the worktree. Missing or unreadable
  directories never prevent the panel from loading, and project files are skipped when project configuration is disabled.
- Agent badges are contribution lists, not a claim of one origin or a complete precedence chain. `Agent.native` proves
  only a partial `built-in base`, since a user or project override may exist. The scanner does not detect inline agent
  declarations, plugin-provided agents, non-conventional roots, or whether uninspected file contents are valid. The `?`
  marker therefore means the filename is evidence, not proof that OpenCode accepted it or that it won every merged field.
- Skill origins are more visible because the public skill catalog includes a location. `project?` and `user?` remain
  explicitly derived because configured paths, remote caches, symlinks, and name overrides can obscure the true source.

## Packaging

Build and inspect the package contents:

```bash
bun run build
bun run pack:dry-run
```

The npm package exposes only `./tui`, as expected by the OpenCode TUI plugin loader.

## License

MIT
