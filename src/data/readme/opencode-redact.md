# opencode-redact

> Automatically redact API keys, tokens, passwords and secrets from all data sent to LLMs — before they leave your machine.

[![npm](https://img.shields.io/npm/v/opencode-redact)](https://www.npmjs.com/package/opencode-redact)
[![license](https://img.shields.io/npm/l/opencode-redact)](LICENSE)

OpenCode dual-target plugin (v1 + v2) with **112 built-in detection rules** covering GitHub PAT, AWS keys, OpenAI/Anthropic API keys, Stripe tokens, JWT, Slack webhooks, private keys, and more.

## Requirements

- **OpenCode v2** — `plugins` config / `opencode2 plugin add`
- **OpenCode v1 ≥ 1.18.29** — `plugin` config; v1 reads the `server()` export
- Older v1 function-style hosts can import the named `RedactPlugin` export

## Quick Start

```bash
npx opencode-redact install
```

That's it. The CLI updates your `opencode.json` and `package.json`, then runs `bun install` to fetch the plugin. Restart OpenCode and all your secrets are protected.

Uninstall any time:

```bash
npx opencode-redact uninstall
```

### Manual install

Add to `opencode.json`:

```json
{ "plugin": ["opencode-redact"] }
```

Then add the dependency and install:

```bash
cd ~/.config/opencode
echo '{"dependencies":{"opencode-redact":"^2.0.0"}}' > package.json
bun install
```

## Features

- **Zero config** — works out of the box with 112 built-in patterns
- **Automatic detection** — keyword pre-filter + regex matching
- **Invisible Unicode stripping** — removes Unicode Tags block characters (anti-prompt-injection)
- **Deep traversal** — recursively scans objects/arrays, preserves image/base64 data
- **Path-based redaction** — optional: redact specific fields like `token`, `credentials.password`
- **Hot-path optimized** — shared string cache across hooks, single-pass lowercasing, copy-on-write deep walk

## Hooks

### OpenCode v2

```
User prompt  →  session.prompt         →  prompt text / attachments redacted
LLM context  →  session.context        →  system + full message history redacted
               session.compaction
               session.generate
               session.title
Tool call    →  tool.execute.before    →  args redacted
Tool result  →  tool.execute.after     →  output / content / metadata redacted
Command      →  /redact:toggle         →  enable / disable at runtime
```

`session.context` is the primary gate: every model request (including compaction and title generation) passes through it.

### OpenCode v1

```
User message  →  [chat.message]                          →  parts redacted
Tool call     →  [tool.execute.before]                   →  args redacted
Tool result   →  [tool.execute.after]                    →  output redacted
Full history  →  [experimental.chat.messages.transform]  →  all messages redacted
```

## Covered Secrets

| Category | Examples |
|----------|----------|
| Git hosting | GitHub (PAT/OAuth/App/Fine-grained), GitLab, Bitbucket, Sourcegraph |
| Cloud | AWS (Access + Secret Key), GCP Service Account, Cloudflare, Heroku, Alibaba |
| AI/LLM | OpenAI (4 variants), Anthropic |
| Collaboration | Slack (6), Discord (3), LinkedIn, Twitch, Twitter, Facebook |
| Payments | Stripe, Flutterwave |
| Infrastructure | Docker config, JWT, npm, PyPI, Rubygems, Pulumi, Age, SendGrid |
| Monitoring | Grafana, New Relic, Databricks, Dynatrace |
| Other | HubSpot, Intercom, Mailchimp, Mailgun, Typeform, Todoist, Canva |
| Generic | `api-key`, `webhook-secret`, `password`, `sk-secret`, private keys |

See [`patterns.ts`](patterns.ts) for the full list.

## Configuration

```jsonc
// opencode.json
{
  "plugin": [
    [
      "opencode-redact",
      {
        "disabled": false,         // set true to disable
        "extraPatterns": [],        // custom secret patterns
        "redactPaths": [],          // path-based redaction: ["token", "user.password"]
        "pathCensor": "[REDACTED]"  // censor text for path redaction
      }
    ]
  ]
}
```

### Custom patterns

```jsonc
{
  "extraPatterns": [
    {
      "id": "my-company-key",
      "category": "custom",
      "title": "My Company API Key",
      "pattern": "(mykey-[a-z0-9]{32})",
      "keywords": ["mykey-"]
    }
  ]
}
```

## CLI

```bash
npx opencode-redact install              # one-command setup
npx opencode-redact uninstall            # remove
npx opencode-redact status               # check
npx opencode-redact install --local ./   # from local clone
```

## Plugin API shape

```ts
// Dual-target default export
export default {
  // OpenCode v2
  id: "opencode-redact",
  setup: async (ctx) => {
    await ctx.session.hook("context", (event) => {
      // redact event.system / event.messages
    })
  },

  // OpenCode v1 (>= 1.18.29)
  server: async (input, options) => {
    return {
      "experimental.chat.messages.transform": async (_input, output) => {
        // redact output.messages
      },
    }
  },
}

// Older v1 hosts
export const RedactPlugin = async (input, options) => plugin.server(input, options)
```

## License

MIT

## Links

- [npm](https://www.npmjs.com/package/opencode-redact)
- [GitHub](https://github.com/meimingqi222/opencode-redact)
