# opencode-auto-translate

[![npm version](https://img.shields.io/npm/v/opencode-auto-translate?logo=npm)](https://www.npmjs.com/package/opencode-auto-translate)
[![CI](https://github.com/dogalyir/opencode-auto-translate/actions/workflows/ci.yml/badge.svg)](https://github.com/dogalyir/opencode-auto-translate/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/dogalyir/opencode-auto-translate)](LICENSE)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-7c3aed)](https://opencode.ai/docs/plugins)

An OpenCode plugin that translates user prompts to English before they reach the main model, then translates assistant text back to the configured language.

## Features

- Translate user prompts to English before the main model request.
- Translate completed assistant prose to the configured language.
- Preserve tool calls, tool arguments, tool output, reasoning, code, paths, URLs, commands, diffs, and errors.
- Localize `question` tool prompts and restore their answers to English for the model.
- Toggle translation with `/translate` or `Ctrl+Shift+T`.
- Show the current state and language in the TUI prompt badge.
- Use an explicit translation model or OpenCode's global `small_model`.
- Share one global `translate.json` configuration between the server and TUI plugins.
- Persist the toggle state through OpenCode KV.
- Fail open: translation failures never replace the original content with an error.

Translation uses temporary OpenCode sessions with a hidden internal translator agent. Each session has no tools, receives only the text being translated, and is deleted after the response. Provider authentication, protocol handling, and OAuth behavior are delegated to OpenCode. Temporary sessions may briefly appear in OpenCode's normal session machinery and incur its usual session overhead. See [the temporary translation session note](docs/direct-api.md) for details.

## Compatibility

- OpenCode `>=1.18.5`
- Bun
- Node-style npm plugin loading

## Installation

For a guided global setup, run:

```bash
npx opencode-auto-translate
```

The installer registers the server and TUI plugin in `opencode.json` and `tui.json`, then creates or replaces `translate.json`. It preserves existing JSON settings in the two plugin files and refuses to modify an invalid or unsupported configuration file. Restart OpenCode after setup.

Install the package through OpenCode:

```bash
opencode plugin opencode-auto-translate@latest
```

The package exposes separate server and TUI entrypoints. OpenCode can therefore load it from both configuration files:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-auto-translate@latest"],
}
```

```jsonc
// ~/.config/opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-auto-translate@latest"],
}
```

OpenCode caches npm plugins. To force a newly published `@latest` version to be downloaded, close OpenCode and remove its cache entry:

```bash
rm -rf ~/.cache/opencode/packages/opencode-auto-translate@latest
```

Use `opencode debug paths` to find the cache root when it differs from `~/.cache/opencode`.

### Server-only installation

For headless use, configure only the server plugin:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-auto-translate@latest"],
}
```

Server-only mode translates prompts and assistant text but does not provide the TUI toggle, keybind, badge, toast notifications, or KV persistence. A TUI-only installation cannot translate server messages.

## Configuration

The recommended setup is one global `translate.json` file. The plugin checks these locations in order:

1. `$OPENCODE_CONFIG_DIR/translate.json`
2. `$XDG_CONFIG_HOME/opencode/translate.json`
3. `~/.config/opencode/translate.json`

Only the global file is read. Project-level `translate.json` files are ignored.

```json
{
  "$schema": "https://unpkg.com/opencode-auto-translate@latest/dist/translate.schema.json",
  "enabled": true,
  "model": "openai/gpt-5.6-luna",
  "variant": "minimal",
  "lang": "Spanish",
  "input": "show original + translation",
  "output": "show original + translation",
  "excluded_agents": ["general"],
  "verbose": false,
  "show_translation_failures": false
}
```

The published schema is generated from the same Zod schema used by both runtimes. It provides editor autocomplete, descriptions, defaults, enum suggestions, and validation. Unknown properties are rejected by the schema so misspelled options are visible in the editor.

### Options

| Option                      | Type     | Default                       | Description                                                                                                                           |
| --------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | boolean  | unset                         | Initial translation state used when no persisted TUI state exists.                                                                    |
| `model`                     | string   | unset                         | Translation model in `provider/model` format. Overrides OpenCode's `small_model`.                                                     |
| `variant`                   | string   | unset                         | Reserved optional provider-specific model variant. It is stored in configuration but is not currently passed to translation sessions. |
| `lang`                      | string   | `English`                     | Target language for assistant translations and the TUI badge.                                                                         |
| `input`                     | enum     | `show original + translation` | User-prompt display mode.                                                                                                             |
| `output`                    | enum     | `show original + translation` | Assistant display mode.                                                                                                               |
| `excluded_agents`           | string[] | `[]`                          | Agent and sub-agent names that bypass all plugin behavior, including translation and the English system instruction.                  |
| `verbose`                   | boolean  | `false`                       | Log translation metrics without logging translated content.                                                                           |
| `show_translation_failures` | boolean  | `false`                       | Show a visible marker when assistant translation fails.                                                                               |

Valid `input` and `output` values are:

- `show original`: display only the original text. For output this is English; for input this is the user's language.
- `translation`: for input only, display the translated English prompt without the original text. The translation is reused when sending the prompt to the model.
- `show original + translation`: display the same English text plus the `[Translation]` label and localized translation.

With `input: "show original"`, original user text remains visible and is translated in the outbound message clone. The translation cache is held in memory and historical prompts can be translated again after an OpenCode restart. With `input: "show original + translation"`, the English translation is persisted in the canonical block and reused without retranslating when it is detected.

With `input: "translation"`, the user message is replaced with its English translation for display and model context. Historical messages already in English are not translated again.

The translation-inclusive format is:

```text
English original

----------------------------------------
[Translation]
Localized translation
```

The English original is retained because hiding it can break future model context with the current OpenCode API.

Missing, unreadable, malformed, or invalid configuration files fail open. The plugin logs the problem and falls back to inline options and defaults. Options are resolved in this order:

1. Built-in defaults.
2. Global `translate.json`.
3. Inline plugin options.
4. Persisted TUI enabled state from OpenCode KV.

Inline options remain supported, but using the shared file avoids server and TUI configuration drift:

```jsonc
{
  "plugin": [
    [
      "opencode-auto-translate@latest",
      {
        "model": "openai/gpt-5.4-mini",
        "variant": "minimal",
        "lang": "Spanish",
        "enabled": true,
        "input": "show original",
        "output": "show original + translation",
      },
    ],
  ],
}
```

The translation model is selected in this order:

1. `model` from inline options or `translate.json`.
2. OpenCode's global `small_model`.

Both model values must use the `provider/model` format. Configure `small_model` in `opencode.json` when an explicit plugin `model` is not needed.

## Runtime behavior

1. The user writes a prompt in the configured language.
2. The plugin translates the model-facing user text to English.
3. The main model receives English and responds in English.
4. Completed assistant `TextPart` content is translated to `lang` for display.

Input translation changes only the model-facing message, so visible user history keeps the original text. Tool calls, tool arguments, tool output, reasoning, code, paths, URLs, commands, diffs, and errors are not translated. `question` tool prompts are localized before display, and their selected answers are restored to English before the model receives them. Permission prompts remain English because the current plugin API does not expose a safe mutable display hook for them.

Each translation uses a temporary OpenCode session with the configured model, and repeated text is cached for the current plugin instance. Batch translation reduces requests for multi-part messages and question dialogs.

If configuration lookup, provider discovery, direct translation, response parsing, or authentication fails, the original content remains unchanged and the failure is logged without breaking the main request.

Response display is idempotent: if multiple server plugin instances receive the same completed text, an existing canonical translation block is left unchanged. If duplicate output persists, run `opencode debug info` and remove mixed registrations such as both a local `dist/server.js` path and `opencode-auto-translate@latest`. The server and TUI registrations are separate runtimes; registering the TUI entrypoint does not translate server responses.

## TUI controls

Use `/translate` from the command palette or press `Ctrl+Shift+T`. The prompt badge shows the current state, for example:

```text
[translate: on -> Spanish]
```

The TUI reads persisted KV state first. Without a stored value, it uses `enabled` from `translate.json`. Startup publishes the initial state to the server without showing a toast. User-triggered toggles update KV, update the badge, show a toast, and publish the state. If publishing fails, the local state is rolled back.

## Local development

Install dependencies and run the complete verification gate:

```bash
bun install
bun run check:all
```

The build performs two tasks and produces three entrypoints:

1. Generates `dist/translate.schema.json` from `pluginOptionsSchema`.
2. Builds `dist/server.js`, `dist/tui.js`, and `dist/cli.js`.

To load a local build directly:

```bash
bun run build
```

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["/absolute/path/to/opencode-auto-translate/dist/server.js"],
}
```

```jsonc
// ~/.config/opencode/tui.json
{
  "plugin": ["/absolute/path/to/opencode-auto-translate/dist/tui.js"],
}
```

The local build uses the same shared `translate.json`. Restart OpenCode after changing plugin files or OpenCode configuration because plugins and configuration are loaded at startup.

`check:all` runs TypeScript typechecking, Bun tests, Oxlint, duplicate detection, Knip, Fallow analysis, and the production build. Git hooks lint staged TypeScript files before commits and run `check:all` before pushes.

## Publishing

GitHub Actions publishes releases to npm when a GitHub Release is published. The release tag must match the package version, such as `v0.1.0` for version `0.1.0`.

The first npm publication must be performed manually. After the package exists, configure npm Trusted Publishing for `dogalyir/opencode-auto-translate` with workflow `publish.yml` and the GitHub `npm` environment. Later releases require updating `version`, merging to `main`, and publishing the matching GitHub Release.

## License

MIT
