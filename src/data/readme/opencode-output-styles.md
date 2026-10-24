# opencode-output-styles

Opt-in output styles for OpenCode: system prompts injected via the `experimental.chat.system.transform` hook, activated only via tuple config.

## How it works

Styles are system prompts injected via the `experimental.chat.system.transform` hook. Each style is an entry in an internal map that returns a block of instructions to append to the system prompt — or `undefined` to inject nothing.

Styles are opt-in: they only reach the system prompt when activated by a tuple `[name, { options }]` in your `opencode.json` / `opencode.jsonc`. Installing by bare name or auto-loading a local file activates the neutral `default` fallback: the plugin loads but changes nothing. New styles are added as entries in the internal `STYLES` map.

## Styles

- `learning`: active learning mode ("build and understand"). Requires user contribution on code decisions; `★ Insight` blocks; instructions in English.
- `default`: neutral. Injects nothing. Useful for installing the package without altering any session's behavior.

## Custom styles

Drop a Markdown file into a `styles/` directory and it becomes a style named after the file (without `.md`):

- Global: `~/.config/opencode/styles/*.md` (respects `XDG_CONFIG_HOME`)
- Project: `{project}/.opencode/styles/*.md`

Singular `style/` is also supported for backwards compatibility with OpenCode's own convention. Precedence on name collision: built-in < global < project (a project file can override a built-in such as `learning`).

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
- Styles are discovered once per process; new files require restarting OpenCode.
- `insights` is specific to the built-in `learning` style; custom styles are static text.

## Installation

Add the tuple to `opencode.json` (or `opencode.jsonc`) in your project, or to the global config `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": [["opencode-output-styles", { "style": "learning" }]]
}
```

Only a tuple activates a style. Bare name or auto-load means `default` (no-op).

## Warning — token cost

Injected instructions run on **every LLM call** of every session, including title generation of the first message (the hook fires there too). Measured: about 498 tokens per call. Same upfront cost the original plugin declares explicitly. Consider before enabling on long or high-volume sessions.

## Uninstallation

Remove the tuple from `opencode.json` / `opencode.jsonc`. To remove the package: `npm uninstall opencode-output-styles`.

## Limitations

- `experimental.chat.system.transform` is experimental in the OpenCode plugin API; its signature may change between versions. Minimum: `engines.opencode >=1.18.0`; tested with OpenCode 1.18.35.
- The plugin cannot distinguish title calls from build calls: instructions reach the title model on the first message of every session. Small cost, accepted and documented here.
- `input.model` does not reliably expose the model identifier at runtime; no model-based filtering.

## Attribution

Ports behaviors from Claude Code's [Learning Output Style Plugin](https://github.com/anthropics/claude-code/blob/main/plugins/learning-output-style/README.md) and [Explanatory Output Style Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style) into OpenCode as an opt-in style manager. The `learning` style was the first implementation; its instruction text was reimplemented from scratch (clean-room), no literal copying, attribution by link. MIT License.

## Example interaction

### With `default` (or no tuple at all)

User: any request

Plugin: injects nothing; OpenCode behaves as usual.

### With `learning` activated

User: "Implement a retry function with backoff in TypeScript"

Plugin: prepares the `RetryOptions` interface and signature `export async function retry<T>(...)`, inserts `// TODO: backoff policy and attempt limit`, outlines 2-3 approaches (fixed exponential backoff, jitter, circuit breaker) with trade-offs, and stops. Never reveals the solution in prose. Waits for you to write the missing lines.

User: "Create the package.json for the project"

Plugin: implements directly, no contribution requested — not a relevant code decision.

User: "How do you decide between LRU and TTL cache here?"

Plugin: `★ Insight` block with codebase-specific points (e.g. lazy `TTLCache` scan, `cache.ts:9`, `Map.get` O(1)), not generic concepts.
