# be-brief-opencode-plugin

An [opencode](https://opencode.ai) plugin that appends `**BE BRIEF**` to the
end of every user message before it's sent to the LLM.

## Install

```json
{
  "plugin": ["be-brief-opencode-plugin"]
}
```

Add that to your `opencode.json` (project or global,
`~/.config/opencode/opencode.json`), then restart opencode.

## How it works

Hooks into opencode's `chat.message` plugin hook and appends the text to the
last text part of the outgoing user message.
