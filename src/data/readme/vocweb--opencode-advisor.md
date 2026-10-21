# @vocweb/opencode-advisor

A plugin for [opencode](https://opencode.ai) that adds a second model to watch your session. It reads what your main agent does and sends advice while the agent is still working. It is a port of the advisor (watchdog) in oh-my-pi. Tiếng Việt: [README.vi.md](README.vi.md).

After each step of the main agent, the advisor reads only the new part of the transcript, in a hidden child session of its own. It speaks up only when it finds something real, using an `advise` tool that the main agent never sees.

## Install

Add the package to `opencode.json`, either the global `~/.config/opencode/opencode.json` or one in your project:

```json
{ "plugin": ["@vocweb/opencode-advisor"] }
```

opencode installs it on startup. The first time it runs, the plugin creates a starter `~/.config/opencode/WATCHDOG.yml` and shows a toast. Then pick a model from inside opencode:

```
/advisor setup anthropic/claude-haiku-4-5
```

This saves the model and applies it right away, no restart needed. Until a model is set, the advisor does nothing and never touches your main agent. Run `/advisor` to see its status.

To stop the plugin from creating the starter file, set `OPENCODE_ADVISOR_NO_SETUP=1`.

## How it works

| Part | What it does |
|---|---|
| Delta reading | Each review sends only the new messages. The advisor keeps its own context in a child session titled `[advisor] ...`. |
| `advise` tool | Takes a `note` and a `severity`: `nit`, `concern` or `blocker`. Only advisors can use it. |
| Routing | A `nit` rides along with the next LLM call and is not saved. A `concern` found mid-run waits until the agent stops. A `blocker`, or a `concern` at the end, is injected into the running turn or wakes an idle agent. After a final answer, only notes at or above `continueSeverity` wake the agent; lower ones become cards. If you pressed Esc, the steering cap was reached, or you are in plan mode, the note is shown as a card and the agent is not restarted. Notes from several advisors that arrive together are merged into one message and cause at most one wake. |
| Emission guard | Drops empty notes ("LGTM"), duplicates and notes over budget. `immuneTurns` adds a cooldown after a steer, and `maxSteersPerPrompt` stops the advisor and agent from going back and forth forever. |
| Safety | Advisor output is untrusted. Notes that look like prompt injection, or that suggest destructive commands (`rm -rf`, `curl \| sh`, force-push) not present in the transcript, are rejected. Two rejections in a row reset the advisor's context. |
| Permissions | The advisor gets `advise` plus `read`, `grep` and `glob` (configurable). Common secret files such as `.env`, keys and credentials are denied. Everything else is denied. |
| Failure handling | A failing review is retried three times with backoff, then the batch is dropped. After `maxConsecutiveFailures` dropped batches the advisor halts; your main agent is not affected. With `retry.fallbackChains`, a failing model is replaced by the next one. If every model hits its usage limit, the advisor pauses as `quota_paused` and keeps its batch. `/advisor reset` clears both states. Compacting the main session resets the advisor, and an oversized advisor context is rebuilt. |

## The `/advisor` command

| Command | What it does |
|---|---|
| `/advisor` | Turns the advisor on or off for this session |
| `on` / `off` | Same, but explicit. `off` aborts running reviews and leaves other sessions alone. `on` reviews only what happens afterwards |
| `status` | One row per advisor: state (`idle`, `reviewing`, `paused`, `inactive/no_model`, `halted`, `quota_paused`), model in use, a `fallback` marker, context tokens, total tokens, cost, notes n/c/b, filtered and deferred counts. Also session flags and config warnings |
| `dump` / `dump raw` | The advisor's own transcript: updates, answers and `[advise severity] note` calls. `raw` adds the system prompt, tool list, reasoning and every tool call. Returned as text, nothing goes to the clipboard |
| `configure` | Where the project and user `WATCHDOG.yml` files are, whether they exist, all validation warnings, and each roster entry with its state |
| `configure init [project\|user]` | Creates a commented sample file (default `project`). Never overwrites |
| `enable <name>` / `disable <name>` | Changes `enabled` for a roster entry in its file, keeping comments, and applies it immediately |
| `setup <provider/model[:level]>` | Writes `modelRoles.advisor` to the user `WATCHDOG.yml`, keeping comments. Applies immediately |
| `reset` | Starts a fresh advisor context and clears `halted` and `quota_paused` |
| `pause` / `resume` / `inbox` | Hold reviews, continue them, or list the notes delivered so far |

In oh-my-pi, `/advisor configure` is a TUI editor. Here it prints text, and you change things with `enable`, `disable` and `setup`. Other changes (tools, instructions, cadence, retry) need an opencode restart.

## Configuration: `WATCHDOG.yml`

The schema is the same as oh-my-pi's. Files are read from oldest to newest, and later ones win: `~/.config/opencode/WATCHDOG.yml` and `.yaml`, then, for each directory from the repo root down to your project, `<dir>/WATCHDOG.yml`, `.yaml`, `<dir>/.opencode/WATCHDOG.yml` and `.yaml`. Roster entries merge by the slug of their name, and top-level `instructions` are joined in the order they are read. A file with invalid YAML is skipped with a warning. One broken roster entry does not affect the others.

`OPENCODE_ADVISOR=off` disables the plugin and `OPENCODE_ADVISOR=1` forces it on. A full sample is in [`WATCHDOG.example.yml`](WATCHDOG.example.yml), or run `/advisor configure init`.

```yaml
instructions: |            # shared by every advisor; "@./file.md" is expanded
  Prefer small, concrete findings.
modelRoles:
  advisor: anthropic/claude-haiku-4-5   # default model; "inherit" = the main agent's model
advisor:
  reviewMode: turn         # turn | agent-end (default advisor only)
  reviewInterval: 1        # (default advisor only)
  syncBacklog: off         # off | 1 | 3 | 5 | strict
  continueSeverity: concern
retry:
  fallbackChains:
    advisor: [google/gemini-3-pro]
task:
  agentAdvisor: { task: on }
advisors:
  - name: Security
    model: anthropic/claude-sonnet-4-5
    tools: [read, grep]
    reviewMode: agent-end
    reviewInterval: 2
    instructions: |
      Focus on secrets and injection.
```

| Key | Default | Meaning |
|---|---|---|
| `advisor.enabled` | true | Master switch. oh-my-pi defaults to false, but here installing the plugin already means you want it |
| `modelRoles.advisor` | none | Default model for advisors that have no `model` of their own |
| `maxNotesPerUpdate` | 4 | 1 to 32. Order of precedence: per advisor, top level, `advisor.maxNotesPerUpdate`, then 4 |
| `advisor.reviewMode`, `reviewInterval` | `turn`, 1 | `turn` reviews every Nth step; `agent-end` reviews every Nth time the agent stops. These apply to the default advisor only. Roster entries set their own, defaulting to `turn` and 1 |
| `advisor.syncBacklog`, entry `syncBacklog` | off | Makes the main agent wait for the advisor before its next LLM call once N reviews are queued (`1`, `3`, `5`). `strict` waits with no limit; the others give up after 30 s. An abort, a failure or a pause ends the wait |
| `advisor.immuneTurns` | 3 | After a steer, later concerns become asides for this many turns. Blockers are not affected |
| `advisor.continueSeverity` | concern | After a final answer, notes at or above this level wake the agent. Lower ones become cards |
| `advisor.evictStaleResults` | true | Old `read`, `grep` and `glob` outputs in the advisor's context are replaced by a short stub |
| `retry.*` | see sample | `enabled`, `modelFallback`, `fallbackOn` (`any`, `usage-limit`, `except-usage-limit`), `fallbackRevertPolicy` (`cooldown-expiry`, `never`), `maxDelayMs` (cooldown for a failing model), `fallbackChains` (keys `advisor`, `provider/model`, `provider/*`; the most specific wins) |
| `task.agentAdvisor` | none | Maps a subagent name to `on`, `off` or `provider/model`. An agent definition can also set `advisor: true` or `advisor: "provider/model"` |
| `advisors[]` | one default advisor | `name`, `enabled`, `model`, `tools`, `reviewMode`, `reviewInterval`, `syncBacklog`, `maxNotesPerUpdate`, `instructions` |
| `advisor.*` plugin extras | | `maxSteersPerPrompt` (6), `contextTokenBudget` (120000), `reviewTimeoutMs` (300000), `maxConsecutiveFailures` (3, counted in dropped batches), `toast`, `explainToPrimary`, `includeReasoning`, `fetchLimit`, `primeMessages`, `primeChars`, `maxMessageChars`, `maxToolInputChars`, `maxToolOutputChars`, `maxEditChars`, `controlModel` |

Tool names follow oh-my-pi: `search` is `grep`, `find` is `glob`, and `write` and `ast_edit` are `edit`. Names with no opencode equivalent (`recall`, `eval`, `debug` and so on) are dropped with a warning. If a list has entries but none are valid, it falls back to `read, grep, glob`. `tools: []` means no investigation tools at all.

Some oh-my-pi options have no counterpart in opencode. They are accepted and ignored with a warning: `tier.advisor`, usage-aware fallback (`retry.usageAwareFallback`, `usageReserve*`, `waitForUsageReset`), credential rotation, signed-reasoning eviction, Agent Hub, RPC and ACP integration, the TUI editor, and clipboard copy. A `:level` suffix on a model is parsed but ignored, because the opencode SDK has no thinking-level field in its prompt.

`WATCHDOG.md`, placed in your project or in `~/.config/opencode/`, holds guidance for advisors only. It supports `@./file.md` imports.

## Privacy and cost

- Transcript content, including tool output and files the advisor reads, goes to the advisor's model provider. Common secret formats (API keys, JWTs, PEM blocks, credentials in URLs) are redacted from the transcript. The output of the advisor's own `read` calls is not redacted, and secrets in files with unusual names are not blocked. Pick a provider you trust, or set `tools: []`.
- In `turn` mode the advisor model is called after every step, which adds up on long sessions. Use a cheap model, `reviewMode: agent-end`, or a larger `reviewInterval`.
- `/advisor` costs one very small model call, because opencode always runs the model for a command. The real answer replaces the reply in a hook.

## Known limitations

- Config changes other than `/advisor setup`, `enable` and `disable` need an opencode restart.
- `syncBacklog` can only hold the main agent before its next LLM call, not before it returns its last answer. With `agent-end` and `strict`, the review runs after the final answer, and a note at or above `continueSeverity` then wakes the agent.
- On shutdown the plugin waits up to 15 seconds for running reviews, but opencode 1.19.3 does not await a plugin's `dispose`. With `opencode run` the process exits about 15 ms after `dispose` starts, so the last review of a headless run is lost. `opencode serve` on SIGTERM does not call `dispose` at all.
- It is built against the opencode plugin API 1.19.x and uses `experimental.*` hooks that may change. TUI toasts are not covered by the automated tests. Everything else is tested against a real `opencode serve`.
- A custom agent with `"*": "allow"` can see the `advise` tool. Its calls are rejected.

## Development

```bash
npm install
npm run check      # typecheck, unit tests, build
npm run test:e2e   # needs the opencode binary: OPENCODE_BIN=/path/to/opencode
npm run test:pack  # installs the packed tarball through opencode.json and runs a review
```

The E2E suite starts a real `opencode serve` in an isolated sandbox and points it at a scripted OpenAI-compatible mock, so the advisor and agent behave the same on every run. Use opencode 1.19.x for it; 2.x has a different API.

## Author

Tien ([chutien@gmail.com](mailto:chutien@gmail.com), [github.com/vocweb](https://github.com/vocweb))

## License

MIT
