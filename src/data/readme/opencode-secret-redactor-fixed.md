# opencode-secret-redactor

An [OpenCode](https://opencode.ai) plugin that prevents secrets from leaking
into LLM context. Secrets detected in tool output are replaced with
`🔒label🔓` tokens before the model sees them, then transparently
restored when a tool needs the real value for execution.

> **Fork note:** the upstream package (0.5.1) does not load on opencode >= 1.18
> (`"Plugin export is not a function"` — see
> [opencode #31575](https://github.com/anomalyco/opencode/issues/31575)).
> This fork fixes the packaging. The fixed build is published on npm as
> **`opencode-secret-redactor-fixed`**.

## Detected secret types

AWS keys, GitHub/GitLab tokens, OpenAI/Anthropic keys, Google Cloud
credentials, Stripe keys, Slack tokens, JWTs, private keys, database
connection strings, and many more. See
[`src/patterns.ts`](src/patterns.ts) for the full list.

## Setup

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-secret-redactor-fixed"]
}
```

or for the original (broken-on-1.18) package:

```json
{
  "plugin": ["opencode-secret-redactor@0.5.1"]
}
```

The plugin hooks into tool execution automatically -- no further configuration
is required.

## How it works

1. **After** `bash` or `read` tool output, the plugin scans for secrets using
   pattern matching and stores any matches in an in-memory vault.
2. The output sent to the LLM contains only redacted placeholders.
3. **Before** `bash`, `write`, or `edit` tool execution, placeholders in the
   tool arguments are replaced with the original values so commands run
   correctly.

## What was fixed

- The default export is now the `{ id, server }` object form, which opencode's
  loader resolves via `readV1Plugin` instead of the legacy `getLegacyPlugins`
  path (the source of the load failure).
- A new `exports["./server"]` entry points opencode to the ESM build
  (`dist/plugin.js`), avoiding the CJS interop object that broke loading.

## License

[MIT](LICENSE)
