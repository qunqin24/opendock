# OpenCode Copy Last

[![npm](https://img.shields.io/npm/v/@jfrz38/opencode-copy-last)](https://www.npmjs.com/package/@jfrz38/opencode-copy-last)
[![Build](https://img.shields.io/github/actions/workflow/status/jfrz38/opencode-copy-last/build.yml)](https://github.com/jfrz38/opencode-copy-last/actions/workflows/build.yml)
[![license](https://img.shields.io/npm/l/@jfrz38/opencode-copy-last)](https://github.com/jfrz38/opencode-copy-last/blob/main/LICENSE)
[![NPM Downloads](https://img.shields.io/npm/dm/@jfrz38/opencode-copy-last)](https://www.npmjs.com/package/@jfrz38/opencode-copy-last)

Copy the latest agent, user, or user-agent exchange from your current OpenCode session directly to the clipboard.

![Demo](./assets/demo.gif)

## Why?

`@jfrz38/opencode-copy-last` is a small OpenCode plugin for quickly reusing recent conversation context without selecting text manually.

It helps when you want to:

- Paste the last agent answer into an issue, PR, note, or chat.
- Copy your latest prompt exactly as you wrote it.
- Export recent user-agent exchanges as clean Markdown.
- Keep useful context before restarting OpenCode, switching branches, or moving to another tool.

## Install

Install via CLI:

```bash
opencode plugin @jfrz38/opencode-copy-last@latest --global 
```

Or add the plugin to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@jfrz38/opencode-copy-last"]
}
```

Restart OpenCode after changing plugin configuration.

## Usage

```text
/copy-last [agent|user|pair] [count|all]
```

By default, it copies the latest agent message:

```text
/copy-last
```

## Examples

Copy the latest agent response:

```text
/copy-last
```

Copy the latest two agent responses:

```text
/copy-last agent 2
```

Copy your latest prompt:

```text
/copy-last user
```

Copy the latest three user-agent exchanges:

```text
/copy-last pair 3
```

Copy all complete user-agent exchanges:

```text
/copy-last pair all
```

Use shorter aliases when you prefer:

```text
/copy-last me
/copy-last us 2
```

## Targets

- `agent`: copies the latest assistant/agent messages.
- `user`: copies the latest user messages.
- `pair`: copies complete user-agent exchanges.
- `me`: alias for `user`.
- `us`: alias for `pair`.

`you` is intentionally unsupported because it is ambiguous.

## Count

- `count`: copies the latest matching messages or pairs, from `1` to `20`.
- `all`: copies every matching message or complete pair for the selected target.

## Output Format

Single messages are copied as trimmed Markdown content.

Pairs are copied like this:

```md
## User

Your prompt here

## Agent

The agent response here
```

Multiple copied items are separated with a Markdown horizontal rule:

```md
---
```

## How It Works

The plugin registers the `/copy-last` command with OpenCode and intercepts it before it reaches the LLM. It reads the current session, selects the requested messages, formats them as Markdown, copies the result to the clipboard, and shows a toast.

Because the command is handled locally by the plugin, running `/copy-last` does not send a new prompt to the model.
