# opencode-secret-redactor

An [OpenCode](https://opencode.ai) plugin that prevents secrets from leaking
into LLM context. Secrets detected in tool output are replaced with
`🔒label🔓` tokens before the model sees them, then transparently
restored when a tool needs the real value for execution.

## Detected secret types

AWS keys, GitHub/GitLab tokens, OpenAI/Anthropic keys, Google Cloud
credentials, Stripe keys, Slack tokens, JWTs, private keys, database
connection strings, and many more. See
[`src/patterns.ts`](src/patterns.ts) for the full list.

## Setup

Add the plugin to your `opencode.json`:

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

## License

[MIT](LICENSE)
