# opencode-asyntai

OpenCode plugin for [Asyntai](https://asyntai.com), the AI support agent for
your website.

Asyntai puts an AI chatbot on your website that answers visitors from your own
content. This plugin connects OpenCode to your Asyntai account, so you can run
the chatbot from OpenCode: add knowledge, crawl a site, change the widget, read
conversations and leads, and reply live to visitors.

## Install

```bash
opencode plugin opencode-asyntai
```

Or add it to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-asyntai"]
}
```

Then check the connection:

```bash
opencode mcp list
```

## Sign in

```bash
opencode mcp auth asyntai
```

Your browser opens the Asyntai sign-in page once. Any Asyntai account works,
including the free plan. [Create an account](https://asyntai.com/register/) if
you do not have one.

## What it adds

- The hosted Asyntai MCP server (`https://asyntai.com/mcp`) as `asyntai`.
- An `asyntai` skill that tells the agent how to use the tools safely.

A server named `asyntai` that you already set up yourself is kept as it is.

## Options

```json
{
  "plugin": [["opencode-asyntai", { "name": "asyntai", "skills": true }]]
}
```

- `name`: the MCP server name. Default `asyntai`.
- `url`: the MCP server address. Default `https://asyntai.com/mcp`.
- `skills`: set to `false` to leave out the skill.

## Try it

- "Create an Asyntai chatbot for shop.example.com and give me the embed code."
- "Add the text in docs/faq.md to my chatbot's knowledge."
- "Show me what visitors asked my chatbot this week."

Full guide: https://asyntai.com/documentation/integrations/opencode/

## License

MIT
