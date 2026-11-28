# opencode-agent-plus

Per-agent reminders, request settings and safe-command auto-allow for [OpenCode](https://opencode.ai) v2.

## Why this plugin exists?

OpenCode v2 is a capable coding agent, but in daily use — especially with local and small models — we kept running into
the same friction points. agent-plus is a **collection of experiments** addressing each one. None of these are proven
solutions; they are ideas that seemed worth trying, and some of them work well enough to keep around.

### 1. System prompt drift (reminders)

The system prompt sits at the very start of the conversation. As messages and tool output pile up, the model seems to
pay less attention to it and drifts: longer answers, extra unrequested work, guessing instead of asking. This matches
the **"lost in the middle"** effect — LLMs show a U-shaped attention bias, favoring the start and end of the input and
neglecting the middle ([Liu et al., 2023, arXiv:2307.03172](https://arxiv.org/abs/2307.03172);
[Hsieh et al., 2024, ACL Findings](https://arxiv.org/abs/2403.04799)).

**Idea:** inject a short reminder as the last message of every request, right where the model starts writing.

**Upstream requests:** [anomalyco/opencode#14210](https://github.com/anomalyco/opencode/issues/14210) (configurable
per-agent reminders), [#25753](https://github.com/anomalyco/opencode/issues/25753) (extensible lifecycle message
injection), [#12498](https://github.com/anomalyco/opencode/issues/12498) (config-driven agent system). All open or
stale.

### 2. Unnecessary tool calls (auto green light)

Agents often call tools even when they could answer directly. Each wasted call costs latency, tokens, and risk.
Research suggests models **already know** when a tool is needed — the signal is linearly decodable from hidden states
(AUROC 0.89–0.96) — but they fail to act on it during generation
([Sun et al., 2025, arXiv:2605.09252](https://arxiv.org/abs/2605.09252)). Prompt-only suppression cuts necessary calls
too; reasoning about tool necessity still hurts hard tasks.

**Idea:** before the first tool call of each turn, a hidden judge (same model, same context) decides whether the call
seems justified. Deny with a reason; the model must explain or ask instead.

**Related:** [tool-gates](https://github.com/camjac251/tool-gates) does rule-based gating (YAML patterns, AST parsing)
for Claude Code and Codex. agent-plus tries model self-judgment instead — no rules to maintain.

### 3. No per-agent request settings (temperature, thinking, etc.)

OpenCode v2 dropped `temperature`, `top_p`, `reasoning_effort`, and `chat_template_kwargs` for OpenAI-compatible
providers. There is no built-in way to set them per agent.

**Idea:** read them from agent `.md` frontmatter and inject into every request body.

### 4. Permission fatigue (safe commands)

With `shell: ask`, every `ls` or `git status` pops a prompt. Users tend to approve reflexively, which defeats the
purpose.

**Idea:** auto-allow a curated list of read-only tools and commands. Anything with pipes, subshells, or unknown flags
still asks.

### 5. Model drift and loops (anti-repetition, anti-loop, verifier)

Small models sometimes repeat text endlessly or call the same tool in a loop. They also over-explain, use jargon, or
state facts without checking — especially when the system prompt says "be concise" but the model has forgotten it by
turn 20.

**Idea:**
- `max_word_repeat` — cut the stream when text loops.
- `max_tool_repeat` — deny the 6th identical call.
- `verifier` — after each turn, a judge checks the reply against the rules and injects a correction if needed.

**Related:** self-verification as hallucination mitigation is an active research area
([Moncada-Ramirez et al., 2025](https://arxiv.org/abs/2509.18970);
[MeCo, ACL 2025, arXiv:2502.12961](https://arxiv.org/abs/2502.12961)).

### 6. No idle-time planning (pondering)

Agents only think when the user sends a message. Between turns, they sit idle even when the next step seems obvious.

**Idea:** when the session goes idle, run one quiet generate (not saved to history). The result rides into the next
user message as a `<pondering>` block the model uses silently.

### 7. No hands-off loop (clockwork)

For long tasks (refactors, migrations), you want the agent to keep going without clicking "continue" every 30 seconds.

**Idea:** a judge reads the plan and progress after each turn, replies CONTINUE / WAIT / DONE, and the plugin drives
the loop.

### What is unique here

Existing tools cover pieces: [tool-gates](https://github.com/camjac251/tool-gates) (rule-based permission gates),
Sage by Pillar Security (enterprise policy enforcement), Claude Code's built-in hooks (pattern matching). None combine
model self-judgment, reminder injection, self-verification, idle thinking, and hands-off loops — all configured from
agent frontmatter with no external config files.

---

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
   COPYFILE_DISABLE=1 tar czf opencode-agent-plus-<version_number>.tgz --no-mac-metadata --exclude=.git --exclude=node_modules --exclude=local --exclude=screenshot.png --exclude=.DS_Store -C <REPO_DIR> .
   ```

   (`COPYFILE_DISABLE=1` and `--no-mac-metadata` keep macOS from adding `._*` files and extended attributes; macOS ships a `tar` that supports the flag.)

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
| `reminder` | `concise`, `off`, or text (one line or a `\|` block) | Built-in or custom reminder, added as the last message of every model request |
| `on_error_command` | shell command, one line or a `\|` block | Run when a request fails with a connection error (server off), then retry |
| `safe_commands` | `off` (default: on) | Turn safe-command auto-allow off for this agent |
| `max_word_repeat` | `on` or `off` (default: off) | Stop the reply when the model repeats the same text |
| `max_tool_repeat` | whole number | Max times the same tool call may repeat in a row |
| `manual_green_light` | `on` or `off` (default: off) | Tools run only when your message ends with an approval word |
| `manual_green_light_words` | comma-separated words | The approval words for `manual_green_light` |
| `auto_green_light` | `on` or `off` (default: off) | The model checks itself before the first tool call of each turn |
| `temperature` | number from `0` to `1` | Request body |
| `max_completion_tokens` | whole number | Request body |
| `reasoning_budget_tokens` | whole number | Request body |
| `reasoning_effort` | `low`, `medium`, `high` or `xhigh` | Request body |
| `enable_thinking` | `true` or `false` | Request body, under `chat_template_kwargs` |
| `tools_override` | path to a JSON file (relative to the agent file) | Replace tool descriptions with your own |
| `pondering` | `on` or `off` (default: off) | Run a quiet thinking request when the session goes idle |
| `misplaced_tag_filter` | `on` or `off` (default: off) | Replace leaked tag signs in thinking/message text |
| `show_settings_on_sidebar` | `on` or `off` (default: on) | Show this agent's settings in the TUI sidebar |
| `clockwork` | `on` or `off` (default: off) | Run the agent hands-off with auto-continue |
| `verifier` | `on` or `off` (default: off) | After each turn, judge the reply and nudge the agent to self-correct |
| `verifier_max_nags` | number, or `fib` (default: `1`) | Max correction nudges per user turn; `fib` uses Fibonacci windows |

Names are sent as written. A setting with a wrong value is not sent.

## Settings menu

Type `/agent-plus` in the chat input to open a settings menu for the current agent. Every key from the table above
has a row:

- Toggles (`on` / `off`) flip with **space**.
- Choice rows (`reasoning_effort`, `temperature`, …) offer the valid values in a picker.
- `reminder` offers the built-in names, `edit…` for your own text, and `off`.
- Every row has a `default (…)` option that removes the key from the file, so the model default applies.

Choices are written straight into the agent's `.md` frontmatter (agent-plus keys are kept first, in menu order), so
the sidebar and the file always match.

## Reminders

### Why

The system prompt sits at the start of the conversation. As the conversation grows with messages and tool output, the
model pays less attention to that early text and drifts: longer answers, extra work, guessing. Models weigh recent text
most, so a short reminder at the end puts the rules right where the model starts writing. Small local models benefit
the most.

### How

Before every model request, agent-plus adds one message at the end of the conversation with the agent's `reminder`.

`reminder` takes a built-in name (`concise`, `off`) for wording held in
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
- wrong values, like `max_completion_tokens: must be a whole number`

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

Turn it off for one agent with `safe_commands: off` in its frontmatter.

## Anti-repetition

With `max_word_repeat: on`, agent-plus watches the model's reply as it streams. When the same stretch of text
repeats 5 or more times, the reply is cut and the session is interrupted, instead of filling up with garbage.

## Anti-loop

With `max_tool_repeat: 5`, the same tool call (same tool, same arguments) may repeat at most 5 times in a row.
The 6th is denied with a message telling the model to stop. The count resets when you send a new message.

## Pondering

With `pondering: on`, when the session goes idle the plugin runs one quiet
thinking request in it (opencode's transient generate: same conversation, not
saved to history). The model ponders where the conversation is going. The
result rides into your next message as a `<pondering>` block, which the model
uses silently — like the reminder, it never replies to it.

## Misplaced tag filter

With `misplaced_tag_filter: on`, tag signs (`<`, `>`, `|`) that leak into the
thinking or message text are swapped for safe look-alikes, so they cannot break
the next turn. Tool calls are not touched. When a message was changed, a short
note is added so you do not copy broken code from it.

## Green light

With `manual_green_light: on`, tool calls are denied unless your latest message ends with an approval word (in its last
3 words), like "run the tests, go". Deny messages tell you to approve or answer without tools. The `read` tool
is always allowed. Set your own words with `manual_green_light_words: yes, do, go`.

With `auto_green_light: on`, before the first non-read tool call of each turn a hidden judge request checks whether the call is justified. The judge denies when:

- The user's last message ends with `?` or `>` (typo of `?`) — always denied, no exceptions.
- The user is in the middle of a chat or trying to understand code.
- The agent's intent is unclear, based on assumptions, or the tool call is irrelevant.

If allowed, the tool runs normally. If denied, the model gets the judge's reason and must explain to the user or ask a question instead. The `read` tool is always allowed. The check fires once per turn and is not saved in the chat history.

## Tool overrides

With `tools_override: ＜file＞.json` (relative to the agent file), tool
descriptions are replaced with the ones from that file. The file maps tool
names to replacement descriptions:

```json
{
  "bash": "Run a shell command.",
  "read": "Read a file."
}
```

Tools not listed keep their original description. The file is re-read only when
it changes on disk, so the prompt cache stays warm.

## Clockwork

With `clockwork: on`, the agent runs hands-off. Every permission ask is denied.
After each finished turn a judge request reads the plan and the work so far and
replies with one word:

- `CONTINUE` — the plugin sends a fresh "keep going" message. Every 7–10 turns
  it instead nudges the agent to re-read its plan document (PLAN.md, TODO.md,
  etc.) and list remaining work.
- `WAIT` — the agent is waiting on a background job, so the plugin waits 30s
  and judges again.
- `DONE` — the plugin sends a wrap-up message. The next `DONE` sends a final
  "JOB COMPLETED" line and stops the loop.

Only agents with `clockwork: on` are affected.

## Verifier

With `verifier: on`, after each finished turn a hidden judge checks the agent's last reply for: over-explaining,
jargon, drifting from the system prompt, losing the user's goal, unrequested actions, or unsourced facts. If a problem
is found, a correction message (phrased as if from the user) is injected asking the agent to fix it. Messages always
reach you — the verifier never blocks output.

`verifier_max_nags` limits how many nudges fire per user turn: a number (`1`, `2`, …) caps it, or `fib` uses growing
Fibonacci windows (one nudge per window, no hard cap).

## Notes

- Use `max_completion_tokens`, not `max_tokens`: OpenCode already sends `max_completion_tokens`, and servers use that one.
- `enable_thinking` and `reasoning_budget_tokens` need a server that supports them, like llama.cpp.

## License

MIT
