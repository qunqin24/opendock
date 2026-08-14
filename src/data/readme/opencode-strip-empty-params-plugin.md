# opencode-strip-empty-params-plugin

[![npm version](https://img.shields.io/npm/v/opencode-strip-empty-params-plugin.svg)](https://www.npmjs.com/package/opencode-strip-empty-params-plugin)
[![npm downloads](https://img.shields.io/npm/dm/opencode-strip-empty-params-plugin.svg)](https://www.npmjs.com/package/opencode-strip-empty-params-plugin)
[![license](https://img.shields.io/npm/l/opencode-strip-empty-params-plugin.svg)](https://github.com/EmilioEsposito/opencode-strip-empty-params-plugin/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-source-black?logo=github)](https://github.com/EmilioEsposito/opencode-strip-empty-params-plugin)

An [opencode](https://opencode.ai) plugin that strips empty-string values from
non-required MCP tool-call arguments before the call reaches the server.

## Problem

Some LLMs (notably OpenAI GPT-family models) always emit every JSON key defined
in a tool's input schema, filling optional parameters with empty strings, zeros,
or `false` even when no value was intended.

Several MCP servers treat `""` differently from an absent key. For example,
Slack's MCP server returns zero results when `cursor: ""` is passed, even though
omitting `cursor` entirely works correctly. This makes the same MCP tool work
with one model family and silently fail with another.

## How it works

The plugin hooks `tool.execute.before` and, for each MCP tool call, removes any
argument whose value is `""` **and** whose key is not in the tool schema's
`required` array.

Required parameters are never touched so genuine validation errors still surface.

## Installation

```bash
# in opencode.json
```

```jsonc
{
  "plugin": [
    "opencode-strip-empty-params-plugin"
    // or with options:
    // ["opencode-strip-empty-params-plugin", { "scope": "all", "verbose": true }]
  ]
}
```

## Options

| Option    | Type                | Default | Description                                    |
|-----------|---------------------|---------|------------------------------------------------|
| `scope`   | `"mcp"` \| `"all"` | `"mcp"` | Which tools to apply to                        |
| `verbose` | `boolean`           | `false` | Log each stripped key to stderr for debugging  |

## Links

- [npm package](https://www.npmjs.com/package/opencode-strip-empty-params-plugin)
- [GitHub repository](https://github.com/EmilioEsposito/opencode-strip-empty-params-plugin)
- [opencode plugin docs](https://opencode.ai/docs/plugins)

## Publishing

This package publishes through GitHub Actions trusted publishing from
`.github/workflows/publish.yml`.

For maintainer release steps and verification, use:

- `.claude/skills/publish-package/SKILL.md`

## License

[MIT](LICENSE)
