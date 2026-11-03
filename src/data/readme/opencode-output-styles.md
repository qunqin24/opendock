# opencode-output-styles

[![CI](https://github.com/felipeverse/opencode-output-styles/actions/workflows/ci.yml/badge.svg)](https://github.com/felipeverse/opencode-output-styles/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-output-styles)](https://www.npmjs.com/package/opencode-output-styles)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Opt-in output styles for OpenCode: system prompts injected alongside the base system, activated only via config. Works on OpenCode 1.x and 2.x.

## How it works

Styles are system prompts placed alongside the base system. A style injects a block of instructions, or nothing at all. Two entry points, same outcome: a hook for 1.x, an agent transform for 2.x.

Styles are opt-in: they apply only when activated by `["opencode-output-styles", { options }]` in `opencode.json` / `opencode.jsonc`. Without options, the neutral `default` applies (no-op).

## Styles

- `learning`: active learning mode ("build and understand"). Requires user contribution on code decisions; `★ Insight` blocks; instructions in English.
- `default`: neutral. Injects nothing. Useful for installing the package without altering any session's behavior.

## Custom styles

Drop a Markdown file into a `styles/` directory and it becomes a style named after the file (without `.md`):

- Global: `~/.config/opencode/styles/*.md` (respects `XDG_CONFIG_HOME`)
- Project: `{project}/.opencode/styles/*.md`

Singular `style/` is also searched (OpenCode convention). On collision, project > global > built-in: a project `learning.md` replaces the built-in `learning`.

```json
{
  "plugin": [["opencode-output-styles", { "style": "my-style" }]]
}
```

Escape hatch for a file anywhere on disk:

```json
{
  "plugin": [["opencode-output-styles", { "style": "./prompts/reviewer.md" }]]
}
```

Absolute paths are used as-is; relative paths resolve against the current working directory. A missing file or unknown name throws with the list of available styles and searched directories.

Notes:

- Styles are Markdown text only (no code execution). Safe against broken or malicious files.
- Style files are cached by mtime: edits are picked up automatically without restarting OpenCode. An empty or unreadable style file logs a warning and injects nothing.

## Options

- `style` (string, default `default`): the mode to activate — built-in (`learning`, `default`), a discovered name from `styles/` dirs (project overrides global, which overrides built-in), or a file path (absolute or relative to the working directory).
- `insights` (boolean, default `true`): `learning` only. Set `false` to drop the `★ Insight` block. Custom styles are static text and ignore this option.
- `agent` (string, default `build`): which agent receives the style — an agent id from your OpenCode config (built-in or custom), or `all`. On OpenCode 1.x the hook cannot scope by agent, so the style reaches whichever agent is running.

```json
{
  "plugin": [["opencode-output-styles", { "style": "learning", "insights": false, "agent": "all" }]]
}
```

## Installation

Add the tuple to `opencode.json` (or `opencode.jsonc`) in your project, or to the global config `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": [["opencode-output-styles", { "style": "learning" }]]
}
```

## Warning — token cost

Runs on **every LLM call** of every session, including title generation of the first message. About 498 tokens per call. Consider before enabling on long or high-volume sessions.

## Uninstallation

Remove the tuple from `opencode.json` / `opencode.jsonc`. To remove the package: `npm uninstall opencode-output-styles`.

## Limitations

- Supports OpenCode 1.x and 2.x (hook on 1.x, agent transform on 2.x). Minimum `engines.opencode >=1.18.0`. Tested with 1.18.35 (1.x) and 2.2.5 (2.x).
- On OpenCode 2.x the project directory is taken from `process.cwd()` (the v2 plugin context exposes no directory). Opening a project from a different working directory may resolve project styles against the wrong root.
- The plugin cannot distinguish call types — title generation receives the same instructions as chat.
- `input.model` does not reliably expose the model identifier at runtime; no model-based filtering.

## Attribution

Ports behaviors from Claude Code's [Learning Output Style Plugin](https://github.com/anthropics/claude-code/blob/main/plugins/learning-output-style/README.md) and [Explanatory Output Style Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style) into OpenCode as an opt-in style manager. The `learning` style was the first implementation; its instruction text was reimplemented from scratch (clean-room), no literal copying, attribution by link. MIT License.

## Example interaction

### With `default` (or no config)

User: any request

Plugin: injects nothing; OpenCode behaves as usual.

### With `learning` activated

User: "Implement a retry function with backoff in TypeScript"

Plugin: scaffolds `RetryOptions` + `retry<T>(...)`, inserts `// TODO: backoff policy`, outlines 2-3 approaches with trade-offs, then stops. Never reveals the solution; waits for you to write it.

User: "Create the package.json for the project"

Plugin: implements directly, no contribution requested.

User: "How do you decide between LRU and TTL cache here?"

Plugin: `★ Insight` block with codebase-specific points (e.g. lazy `TTLCache` scan, `cache.ts:9`, `Map.get` O(1)), not generic concepts.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the commit convention and the PR flow. By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/felipeverse/opencode-output-styles/security/advisories). See [SECURITY.md](SECURITY.md) for the support policy.
