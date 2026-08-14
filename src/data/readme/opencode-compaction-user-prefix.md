# opencode-compaction-user-prefix

[![npm](https://img.shields.io/npm/v/opencode-compaction-user-prefix.svg)](https://www.npmjs.com/package/opencode-compaction-user-prefix)
[![license](https://img.shields.io/npm/l/opencode-compaction-user-prefix.svg)](./LICENSE)

An [opencode](https://opencode.ai) plugin that works around a compaction bug where a freshly compacted conversation can start with an `assistant` tool-call message, causing Anthropic to reject the request with:

```
messages.N: `tool_use` ids were found without `tool_result` blocks immediately after.
```

The plugin prepends a synthetic `user` text message at the `experimental.chat.messages.transform` boundary so the body sent to the model always begins with a user turn.

## The bug

When manual or auto compaction runs after a previous compaction whose `tail_start_id` landed mid-turn on an assistant tool-call, `compaction.process` builds `selected.head` as a chain of consecutive assistant tool-call messages with no user message at the start.

`MessageV2.toModelMessagesEffect` then faithfully converts that to a model message array whose first entry is `assistant tool_use`, which Anthropic rejects.

Upstream reference: opencode session message `msg_e5550bcfb001EjDfz6hFE3lpHB` (compaction failure on session `ses_1ae999d1dffeOLwEseaIFPDg0V`).

## How it works

The plugin hooks `experimental.chat.messages.transform`, which receives the same `WithParts[]` opencode is about to pass into `toModelMessages`. If the first message is an `assistant`, it prepends a synthetic user `text` part. opencode recognises `text` parts in user messages, so the prepended turn survives the conversion and the resulting request body starts with a user message.

This is safe on the normal chat path because real chat already begins with a user message, in which case the `!== "assistant"` check short-circuits and nothing is prepended.

## Use

Register the plugin in your opencode config (`opencode.json` or `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-compaction-user-prefix"]
}
```

## License

[MIT](./LICENSE) © Quentin Nivelais
