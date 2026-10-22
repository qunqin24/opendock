# @vocweb/opencode-advisor

A plugin for [opencode](https://opencode.ai) that adds a second model to watch your session. It reads what your main agent does and sends advice while the agent is still working. It is a port of the advisor (watchdog) in oh-my-pi. Tiếng Việt: [README.vi.md](README.vi.md).

After each step of the main agent, the advisor reads only the new part of the transcript, in a hidden child session of its own. It speaks up only when it finds something real, using an `advise` tool that the main agent never sees.

## Install

This plugin runs on opencode 1.19.x and on opencode 2.x (tested on 1.19.3 and 2.1.0). One package serves both: opencode 1 calls its `server` export, opencode 2 calls its `setup` export. Check your version with `opencode --version`.

Add the package to your opencode config, either the global one in `~/.config/opencode/` or one in your project. The key differs by major version:

```json
{ "plugin": ["@vocweb/opencode-advisor"] }
```

```json
{ "plugins": ["@vocweb/opencode-advisor"] }
```

The first block is for opencode 1.x (`opencode.json`), the second for opencode 2.x.

opencode installs it on startup. The first time it runs, the plugin creates a starter `~/.config/opencode/WATCHDOG.yml` (and shows a toast on opencode 1.x). Then pick a model from inside opencode:

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
| Context | The advisor also sees your project `AGENTS.md`. Plan-mode reminders opencode adds to your messages are kept as `<primary-context kind="plan-mode">` (once), other `<system-reminder>`s shrink to one line. Outside Git with exactly one child repository, it is told which one is the active project. A forked session is reviewed from now on, and reverting history resets the advisor. |
| Loop guard | If an advisor repeats the exact same investigative call, it is reminded on the third time and its review is stopped on the fourth. That is not counted as a failure and does not trigger a fallback. |
| Safety | Advisor output is untrusted. Notes that look like prompt injection, or that suggest destructive commands (`rm -rf`, `curl \| sh`, force-push) not present in the transcript, are rejected. Two rejections in a row reset the advisor's context. |
| Permissions | The advisor gets `advise` plus `read`, `grep` and `glob` (configurable). Common secret files such as `.env`, keys and credentials are denied. Everything else is denied. |
| Failure handling | A failing review is retried three times with backoff, then the batch is dropped. After `maxConsecutiveFailures` dropped batches the advisor halts; your main agent is not affected. With `retry.fallbackChains`, a failing model is replaced by the next one. If every model hits its usage limit, the advisor pauses as `quota_paused` and keeps its batch. opencode retries 429 and 5xx answers by itself; the plugin watches those retries and moves to the next model instead of waiting. A refusal by the main advisor model (content filter) pins the advisor to its fallback until its context is rebuilt, for example by a compaction or `/advisor reset`. `/advisor reset` clears both states. Compacting the main session resets the advisor, and an oversized advisor context is rebuilt. |

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
| `model <name> <provider/model[:level]\|inherit>` | Sets the `model` of one roster entry in its file, keeping comments, and applies it immediately |
| `reload` | Re-reads every `WATCHDOG.yml` now. It also happens by itself before the next model call whenever a file changed |
| `reset` | Starts a fresh advisor context and clears `halted` and `quota_paused` |
| `pause` / `resume` / `inbox` | Hold reviews, continue them, or list the notes delivered so far |

In oh-my-pi, `/advisor configure` is a TUI editor. Here `/advisor configure` prints text. On opencode 2.x the package also ships a TUI plugin (`./tui`, loaded automatically beside the server plugin) that adds `/advisor-config`: a menu with status, dump, reload, enable/disable, set a model and create a sample file, and a toast for each advisory (`blocker` shows as an error) and for advisor warnings. Set the plugin option `toast: false` to silence the toasts.

**Live reload.** Edits to any `WATCHDOG.yml` apply before the next model call, without a restart: cadence, retry, fallback chains, models, instructions and `enabled`. On opencode 2.x new advisors, tools and permissions apply too, because the plugin rebuilds the agents. On opencode 1.x an advisor that is new in the file, and tool or permission changes, need a restart; `/advisor reload` and `/advisor status` say so. If opencode restarts and the session still has an `[advisor] <name>` child, the advisor continues in it instead of starting over (verified on 1.x only).

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
| `retry.*` | see sample | `enabled`, `modelFallback`, `fallbackOn` (`any`, `usage-limit`, `except-usage-limit`), `fallbackRevertPolicy` (`cooldown-expiry`, `never`), `maxDelayMs` (cooldown for a failing model, and the longest wait for a provider that asks to retry later), `fallbackChains` (keys `advisor`, `provider/model`, `provider/*`; the most specific wins) |
| `task.agentAdvisor` | none | Maps a subagent name to `on`, `off` or `provider/model`. An agent definition can also set `advisor: true` or `advisor: "provider/model"` |
| `advisors[]` | one default advisor | `name`, `enabled`, `model`, `tools`, `reviewMode`, `reviewInterval`, `syncBacklog`, `maxNotesPerUpdate`, `instructions` |
| `tier.advisor` | none | Service tier for advisor requests: `none` (standard), `inherit` (the main agent's tier) or `auto`, `default`, `flex`, `scale`, `priority`. Only sent to providers that support it (the OpenAI family today). Not verified against a real provider |
| `advisor.*` plugin extras | | `maxSteersPerPrompt` (6), `contextTokenBudget` (120000), `reviewTimeoutMs` (300000), `permissionTimeoutMs` (120000), `maxConsecutiveFailures` (3, counted in dropped batches), `toast`, `explainToPrimary`, `includeReasoning`, `fetchLimit`, `primeMessages`, `primeChars`, `maxMessageChars`, `maxToolInputChars`, `maxToolOutputChars`, `maxEditChars`, `controlModel` |

Tool names follow oh-my-pi: `search` is `grep`, `find` is `glob`, and `write` and `ast_edit` are `edit`. Names with no opencode equivalent (`recall`, `eval`, `debug` and so on) are dropped with a warning. If a list has entries but none are valid, it falls back to `read, grep, glob`. `tools: []` means no investigation tools at all.

A tool that changes files (`edit`, `write`, `bash`, `task`) is only available when you list it in an advisor's `tools`, and it then follows your own permission rules for that tool. If you have no rule, it asks. The question appears in the TUI for the hidden advisor session. If nobody answers within `permissionTimeoutMs`, the request is rejected so the review does not hang. `read`, `grep` and `glob` never ask, and secret files stay denied.

Some oh-my-pi options have no counterpart in opencode. They are accepted and ignored with a warning: usage-aware fallback (`retry.usageAwareFallback`, `usageReserve*`, `waitForUsageReset`), credential rotation, signed-reasoning eviction, Agent Hub, RPC and ACP integration, the TUI editor, and clipboard copy. A `:level` suffix on a model (for example `anthropic/claude-sonnet-4-5:high`) is sent as the thinking level (the model variant); `:auto` follows the level the main agent last used, when opencode reports it.

`WATCHDOG.md`, placed in your project or in `~/.config/opencode/`, holds guidance for advisors only. It supports `@./file.md` imports.

## Privacy and cost

- Transcript content, including tool output and files the advisor reads, goes to the advisor's model provider. Common secret formats (API keys, JWTs, PEM blocks, credentials in URLs) are redacted from the transcript. The output of the advisor's own `read` calls is not redacted, and secrets in files with unusual names are not blocked. Pick a provider you trust, or set `tools: []`.
- In `turn` mode the advisor model is called after every step, which adds up on long sessions. Use a cheap model, `reviewMode: agent-end`, or a larger `reviewInterval`.
- `/advisor` costs one very small model call, because opencode always runs the model for a command. The real answer replaces the reply in a hook.

## Known limitations

- On opencode 1.x, new advisors and changes to `tools` or permissions need an opencode restart (see Live reload). Everything else in `WATCHDOG.yml` applies live.
- `syncBacklog` can only hold the main agent before its next LLM call, not before it returns its last answer. With `agent-end` and `strict`, the review runs after the final answer, and a note at or above `continueSeverity` then wakes the agent.
- On shutdown the plugin waits up to 15 seconds for running reviews, but opencode 1.19.3 does not await a plugin's `dispose`. With `opencode run` the process exits about 15 ms after `dispose` starts, so the last review of a headless run is lost. `opencode serve` on SIGTERM does not call `dispose` at all.
- opencode 1.x: built against plugin API 1.19.x; it uses `experimental.*` hooks that may change. On 1.x, advisories use opencode's own toasts; the toasts are not covered by the automated tests.
- opencode 2.x: advisories are delivered as synthetic messages and `/advisor` replies appear in the transcript. The server plugin API has no toast, so toasts come from the bundled TUI plugin (covered by unit tests with a fake TUI context, checked by hand in a real opencode 2.1.0 TUI via tmux, no automated E2E). If the advisor model is not in the catalog (yet), the advisor waits as `no_model`, keeps its batch and tries again after 30 seconds at a later boundary; it does not halt. An advisor whose context grows over `contextTokenBudget` is summarized and kept on opencode 1.x, but rebuilt in a fresh session on 2.x. Frontmatter `advisor:` on an agent file is not readable through the 2.x plugin API, so use `task.agentAdvisor` in `WATCHDOG.yml` instead (tested). `/advisor` is not available in headless `opencode run`. If a future opencode renames a hook the plugin uses, that feature is skipped with a log line instead of failing the load. Everything is tested against a real `opencode serve` on both lines.
- opencode 2.x web client (checked by hand in 2.1.0, not automated): a `/advisor` reply shows under "Updates" as one truncated line with raw markdown, so long replies (`status`, `dump`) are not readable there; use the TUI for those. Advisor sessions do not appear in the session list of the TUI or the web client. The desktop app was not tried.
- A custom agent with `"*": "allow"` can see the `advise` tool. Its calls are rejected.

## Development

```bash
npm install
npm run check      # typecheck, unit tests, build
npm run test:e2e      # opencode 1.x; needs OPENCODE_BIN=/path/to/opencode
npm run test:e2e:v2   # opencode 2.x; needs OPENCODE_BIN=/path/to/opencode
npm run test:pack     # installs the packed tarball through opencode.json (1.x) and runs a review
npm run test:pack:v2  # the same through the 2.x "plugins" key
```

The E2E suite starts a real `opencode serve` in an isolated sandbox and points it at a scripted OpenAI-compatible mock, so the advisor and agent behave the same on every run. Run the 1.x suite with an opencode 1.19.x binary and the 2.x suite with an opencode 2.x binary.

## Author

Tien ([chutien@gmail.com](mailto:chutien@gmail.com), [github.com/vocweb](https://github.com/vocweb))

## License

MIT
