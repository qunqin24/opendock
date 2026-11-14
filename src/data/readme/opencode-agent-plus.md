# opencode-agent-plus

Per-agent reminders, request settings and safe-command auto-allow for [OpenCode](https://opencode.ai) v2.

Set `chat_template_kwargs` (like `enable_thinking`), sampling settings (`temperature`, `top_p`, `top_k`, `min_p`,
penalties) and a system reminder for each OpenCode agent. Works with llama.cpp, LiteLLM and other OpenAI-compatible
servers, and with thinking models like Qwen.

Auto-allows read-only tool calls and safe shell commands (`ls`, `cat`, `git status`, `docker compose ps`, …), so
with `shell: ask` in your permissions you get no prompt window for them — everything else still asks.

OpenCode v2 drops request settings such as `temperature` for OpenAI-compatible providers, and has no per-agent
reminder. agent-plus reads extra keys from the agent's `.md` file and applies them to every model request.

Tested with OpenCode 2.2.0 and llama.cpp behind LiteLLM.

![agent-plus settings in the OpenCode sidebar](screenshot.png)

## Install

Copy the files into the global plugins folder (plugins there load automatically):

```bash
rsync -a --exclude=.git <REPO_DIR>/ ~/.config/opencode/plugins/opencode-agent-plus/
```

Or add it to the `plugins` list in `opencode.json`:

```json
{
  "plugins": ["opencode-agent-plus"]
}
```

Or, from GitHub: `"plugins": ["github:Anooshiravan/opencode-agent-plus"]`.
Agents: follow [AGENTS.md](AGENTS.md).

To update an already-installed plugin, copy all files to the plugin folder:

```bash
rsync -a --exclude=.git <REPO_DIR>/ ~/.config/opencode/plugins/opencode-agent-plus/
```

## Offline package

The plugin has no build step and no own dependencies (the `peerDependencies` are provided by OpenCode itself). To move it to a machine with no internet:

1. Package the files:

   Name the package `opencode-agent-plus-<version_number>.tgz`, where `<version_number>` is the `version` in `package.json`:

   ```bash
   tar czf opencode-agent-plus-<version_number>.tgz -C <REPO_DIR> --exclude=.git --exclude=node_modules --exclude=local --exclude=screenshot.png .
   ```

2. On the offline machine, extract into `~/.config/opencode/plugins/opencode-agent-plus/`.

3. Restart: `opencode service restart`.

No `opencode.json` entry is needed; plugins in that folder load automatically.

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
| `reminder` | `concise`, `ultra-concise`, `creative`, `off`, or text (one line or a `\|` block) | Preset or custom reminder, added as the last message of every model request |
| `on_error_command` | shell command, one line or a `\|` block | Run when a request fails with a connection error (server off), then retry |
| `safe_commands` | `none` (default: on) | Turn safe-command auto-allow off for this agent |
| `anti_repetition` | `on` or `off` (default: off) | Stop the reply when the model repeats the same text |
| `max_same_tool` | whole number | Max times the same tool call may repeat in a row |
| `manual_green_light` | `on` or `off` (default: off) | Tools run only when your message ends with an approval word |
| `manual_green_light_words` | comma-separated words | The approval words for `manual_green_light` |
| `auto_green_light` | `on` or `off` (default: off) | The model checks itself before the first tool call of each turn |
| `temperature` | number | Request body |
| `top_p` | number | Request body |
| `top_k` | whole number | Request body |
| `min_p` | number | Request body |
| `presence_penalty` | number | Request body |
| `repeat_penalty` | number | Request body (llama.cpp) |
| `repetition_penalty` | number | Request body (vLLM, HF) |
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
2. the `reminder` from `AGENTS.md` in the project folder, for every agent

`reminder` takes a preset name (`concise`, `ultra-concise`, `creative`, `off`) for wording held in
the plugin, or your own text (more than 3 words). A short unknown value means
`off`.

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

## Safe commands

With `shell: ask` in your `permissions`, every shell command would prompt. agent-plus skips the prompt for calls
that can only read:

- Tools: `read`, `glob`, `grep`, `websearch`
- Commands: `ls`, `cat`, `head`, `tail`, `wc`, `find`, `grep`, `rg`, `sort`, `diff`, `pwd`, `echo`, `du`, `df`,
  `git status/log/diff/show/branch`, `docker ps/logs/inspect`, `docker compose ps/logs`, `npm ls/view/outdated`,
  `node --version`, `psql`/`sqlite3` with read-only queries, and `ssh host <safe command>`
- Anything with `;`, `|`, `&&`, `$( )` or redirections is checked **per part**: all parts must be safe

It never overrides a configured `deny`, and only turns `ask` into `allow`. Doubtful = asked.

Known unsafe flags are refused, e.g. `find -exec`, `env <cmd>`, `rg --pre`, `sort -o`, `git branch -D`,
`git log --output=`, `ssh -o ProxyCommand=`.

Turn it off for one agent with `safe_commands: none` in its frontmatter.

## Anti-repetition

With `anti_repetition: on`, agent-plus watches the model's reply as it streams. When the same stretch of text
repeats 5 or more times, the reply is cut and the session is interrupted, instead of filling up with garbage.

## Anti-loop

With `max_same_tool: 5`, the same tool call (same tool, same arguments) may repeat at most 5 times in a row.
The 6th is denied with a message telling the model to stop. The count resets when you send a new message.

## Pondering

With `pondering: on`, when the session goes idle the plugin runs one quiet
thinking request in it (opencode's transient generate: same conversation, not
saved to history). The model ponders where the conversation is going. The
result rides into your next message as a `<pondering>` block, which the model
uses silently — like the reminder, it never replies to it.

## Green light

With `manual_green_light: on`, tool calls are denied unless your latest message ends with an approval word (in its last
3 words), like "run the tests, go". Deny messages tell you to approve or answer without tools. The `read` tool
is always allowed. Set your own words with `manual_green_light_words: yes, do, go`.

With `auto_green_light: on`, the model checks itself before the first tool call of each turn: it must allow the call
and state its plan, or explain why it cannot. The check fires once per turn and is not saved in the chat history.

## Notes

- Use `max_completion_tokens`, not `max_tokens`: OpenCode already sends `max_completion_tokens`, and servers use that one.
- `enable_thinking` and `reasoning_budget_tokens` need a server that supports them, like llama.cpp.

## License

MIT
