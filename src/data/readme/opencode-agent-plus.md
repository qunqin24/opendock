# opencode-agent-plus

Per-agent reminders and request settings for [OpenCode](https://opencode.ai) v2, set in the agent's frontmatter.

Set `chat_template_kwargs` (like `enable_thinking`), sampling settings (`temperature`, `top_p`, `top_k`, `min_p`,
penalties) and a system reminder for each OpenCode agent. Works with llama.cpp, LiteLLM and other OpenAI-compatible
servers, and with thinking models like Qwen.

OpenCode v2 drops request settings such as `temperature` for OpenAI-compatible providers, and has no per-agent
reminder. agent-plus reads extra keys from the agent's `.md` file and applies them to every model request.

Tested with OpenCode 2.0.28 and llama.cpp behind LiteLLM.

![agent-plus settings in the OpenCode sidebar](screenshot.png)

## Install

Add it to the `plugin` list in `opencode.json`:

```json
{
  "plugin": ["opencode-agent-plus"]
}
```

Or, from GitHub: `"plugin": ["github:Anooshiravan/opencode-agent-plus"]`.
Agents: follow [AGENTS.md](AGENTS.md).

## Example

```markdown
---
description: Writing and editing text
mode: primary
model: litellm/my-model
temperature: 1.0
enable_thinking: false
reminder: |
  - Keep replies short, simple words
  - If unclear, say so — don't guess
---

You help the user write and edit text.
```

## Keys

| Key | Value | Effect |
| --- | --- | --- |
| `reminder` | text, one line or a `\|` block | Added as the last message of every model request |
| `reminder_file` | path, relative to the agent's `.md` file | Like `reminder`, read from a file |
| `on_error_command` | shell command, one line or a `\|` block | Run when a request fails with a connection error (server off), then retry |
| `temperature` | number | Request body |
| `top_p` | number | Request body |
| `top_k` | whole number | Request body |
| `min_p` | number | Request body |
| `presence_penalty` | number | Request body |
| `repeat_penalty` | number | Request body |
| `max_completion_tokens` | whole number | Request body |
| `reasoning_budget_tokens` | whole number | Request body (llama.cpp) |
| `reasoning_effort` | `none`, `minimal`, `low`, `medium`, `high` or `xhigh` | Request body |
| `enable_thinking` | `true` or `false` | Request body, under `chat_template_kwargs` |

Names are sent as written. A setting with a wrong value is not sent.

## Reminders

### Why

The system prompt sits at the start of the conversation. As the conversation grows with messages and tool output, the
model pays less attention to that early text and drifts: longer answers, extra work, guessing. Models weigh recent text
most, so a short reminder at the end puts the rules right where the model starts writing. Small local models benefit
the most.

### How

Before every model request, agent-plus adds one message at the end of the conversation with, in this order:

1. the agent's `reminder`
2. the agent's `reminder_file`
3. `reminder.txt` in the project folder, for every agent

The text is wrapped in `<system-reminder>` tags with a note that it is not from the user. Without this, the model may
take the reminder as your message and reply to it ("Understood. Short replies...") instead of answering you.

The message is only added to the outgoing request, **NOT saved in the chat history**. Every request has exactly one
reminder at the end, so reminders never pile up.

### Prompt cache

The impact on the server's prompt cache (KV cache) is small and does not grow with the conversation:

- Request 1 is `history + reminder`; the model writes its reply after the reminder.
- Request 2 is `history + reply + new message + reminder`.

The cache matches up to the end of `history`, where the old reminder was. The server then processes the model's last
reply again, plus the new message and the new reminder, which are new anyway. The extra cost per request is the length
of the last reply (one answer or one tool call), never the whole conversation. Servers that can reuse shifted cache
chunks, like llama.cpp with `--cache-reuse`, may recover part of it.

## Warnings

At start, a toast lists problems in agent files:

- misspelled keys, like `temprature → temperature`
- wrong values, like `top_k: must be a whole number`
- a `reminder_file` that is missing or empty

Unknown keys that don't look like a misspelling are left alone, so other plugins can add their own keys.
With no problems, the toast says "agent-plus is loaded".

## Sidebar

The session sidebar shows an "Agent-plus" section with the settings of the session's agent. It updates when you
switch agents or save an agent file.

## Wake the server

`on_error_command` runs a shell command when a model request fails with a connection error (the server is off or
unreachable), then asks OpenCode to retry after a short delay. HTTP errors (like 500 or 429) never trigger it.

```yaml
---
on_error_command: |
  server-on
  curl -sf http://litellm:4000/health
---
```

It fires once per outage per session: after a request gets through, the next connection error can run it again.

## Notes

- Use `max_completion_tokens`, not `max_tokens`: OpenCode already sends `max_completion_tokens`, and servers use that one.
- Do not give `reminder_file` a `.md` name: OpenCode loads every `.md` in the agent folder as an agent.
- `enable_thinking` and `reasoning_budget_tokens` need a server that supports them, like llama.cpp.

## License

MIT
