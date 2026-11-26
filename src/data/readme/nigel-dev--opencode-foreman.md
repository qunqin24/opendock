<h1 align="center">OpenCode Foreman</h1>

<p align="center">
  <strong>Keep your agents on the job until it is actually done.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nigel-dev/opencode-foreman"><img src="https://img.shields.io/npm/v/@nigel-dev/opencode-foreman.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/nigel-dev/opencode-foreman/actions/workflows/ci.yml"><img src="https://github.com/nigel-dev/opencode-foreman/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

An [OpenCode](https://opencode.ai) V2 plugin that gives you a team of agents and keeps them honest. It does three things:

- **Agents.** It registers a roster of primary agents and subagents, and assigns each one a model from a config file.
- **Workflow.** It adds slash commands for planning, executing a plan, reviewing, and handing off, and it tracks the plan a session is carrying out.
- **Terminal UI.** It shows the active plan and what the gates are doing in the TUI, and logs every gate decision to a file.
- **Supervision.** It watches sessions through these gates and guards:

| Gate | Hook | What it does | Default |
| --- | --- | --- | --- |
| Done gate | `session` `experimental.idle` | When a session is about to go idle, checks whether the final message leaves requested work unfinished or claims completion without a check, runs the project checks you configure, and sends a synthetic message telling the agent to continue. | on |
| Report gate | `session` `experimental.idle` | When a subagent is about to hand back, checks that its report states an outcome and is not half-finished, and sends it back once if not. | on |
| Loop guard | `tool` `execute.before` | Blocks a tool call once the same call, or the same cycle of up to three calls, has repeated four times in a row within one request. Uses no model. | on |
| Intent gate | `session` `prompt` + `context` | Classifies each user request (intent, size, ambiguity) and adds an advisory routing hint to the system instructions for that turn. The stored user message is not modified. | on |
| Approval gate | `permission` `evaluate` | Scores the risk of `ask`-level shell commands that pass a strict lexical filter, and allows the low-risk ones. | off, dry run |

The done, report, intent, and approval gates use [TypeSafe Jev](https://docs.typesafe.ai), a model that returns probabilities for typed questions instead of text. If the model is unreachable or returns something unusable, those gates do nothing, so an outage never blocks a session. The loop guard, the commands, and plan tracking work without it.

Requires OpenCode 2.3.0 or newer. Two of the hooks are marked experimental by OpenCode and may change.

## Install

```jsonc
// opencode.jsonc
{
  "plugins": ["@nigel-dev/opencode-foreman"]
}
```

From a local checkout, build first and use the directory path:

```sh
bun install && bun run build
```

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-foreman"]
}
```

## Agents

Installing the plugin registers these agents. Nothing needs to be copied into your config directory.

| Agent | Mode | Tier | Role |
| --- | --- | --- | --- |
| `orchestrator` | primary | `lead` | Sizes each request, does small work itself, delegates the rest, and verifies results |
| `planner` | primary | `reasoning` | Interviews you, researches the code, and writes a plan to `.foreman/plans/`; edits nothing else |
| `deep` | primary or subagent | `deep` | Carries one substantial goal through on its own |
| `security-researcher` | primary | `security` | Threat models, audits for vulnerabilities, and checks dependency risk and CVEs; writes reports to `.foreman/security/` and edits nothing else |
| `worker` | subagent | `standard` | Ordinary, clearly specified implementation |
| `worker-quick` | subagent | `fast` | Small mechanical edits |
| `worker-deep` | subagent | `deep` | Hard or cross-cutting implementation |
| `worker-visual` | subagent | `reasoning` | User interface work |
| `tester` | subagent | `standard` | Writing and repairing tests |
| `writer` | subagent | `standard` | Documentation and prose |
| `librarian` | subagent | `fast` | External docs, library source, and web research; no file edits |
| `oracle` | subagent | `consult` | Second opinion on architecture and hard bugs; no file edits |
| `plan-consultant` | subagent | `reasoning` | Finds gaps before a plan is written; no file edits |
| `plan-reviewer` | subagent | `consult` | Approves or rejects a written plan; no file edits |
| `reviewer` | subagent | `deep` | Independent review of finished changes; no file edits |

OpenCode's built-in `explore` agent is used as is and takes its model from the `fast` tier.

"No file edits" means the edit tools are denied, along with shell commands that change the working tree or git history (`rm`, `mv`, `git commit`, `git checkout`, and similar). It is not a sandbox: these agents can still run the project's build and tests, which may write files.

An agent you define yourself with the same ID as a bundled one is overwritten while the bundled agent is enabled. Disable the bundled one to keep yours.

### Models

Each agent belongs to a tier, and you assign a model to each tier in a Foreman config file:

```text
~/.config/opencode/foreman.jsonc     all projects
<project>/.opencode/foreman.jsonc    one project
```

`.json` is also accepted. The global directory follows `OPENCODE_CONFIG_DIR` and `XDG_CONFIG_HOME` the way OpenCode does.

```jsonc
{
  "models": {
    "lead": "anthropic/claude-opus-5-5#high",
    "reasoning": "anthropic/claude-fable-5-2#high",
    "consult": "openai/gpt-6-astra#high",
    "security": "openai/gpt-6-astra#xhigh",
    "deep": "openai/gpt-6.1-sol#high",
    "standard": "anthropic/claude-sonnet-5-5#medium",
    "fast": "anthropic/claude-haiku-5-5#low"
  },
  "agents": {
    "plan-reviewer": { "model": "openai/gpt-6-astra#xhigh" },
    "writer": { "disabled": true }
  },
  "defaultAgent": "orchestrator"
}
```

- `models` sets one model per tier, as `provider/model` or `provider/model#variant`.
- `agents.<id>.model` overrides the tier for one agent. It works for any agent, including ones Foreman does not ship.
- `agents.<id>.disabled` withholds a bundled agent, or removes any other agent.
- OpenCode's stock `build` agent is replaced by a hidden alias of `orchestrator`, so commands and configs that name `build` still work. The alias mirrors the orchestrator, including its model, and ignores `agents.build` settings. It is not registered when `bundledAgents` is `false` or the orchestrator is disabled; `agents.build` then applies to the stock agent as usual.
- `defaultAgent` selects the agent for new sessions. Unset, OpenCode's default stays.
- `bundledAgents: false` skips the roster and keeps the gates and model assignment.

A tier or agent with no model inherits the session's model, so the plugin works with no config file at all. A model that is not in OpenCode's catalog is reported in the server log a few seconds after startup. See [`foreman.example.jsonc`](foreman.example.jsonc) for a commented starting point.

Foreman watches both locations and applies a change within a second of the file being saved: models, agents, commands, and gate settings are rebuilt in place, with no restart. A project `.opencode/` directory that did not exist when OpenCode loaded the project is picked up on the next `/reload`.

Settings merge in this order, later wins: plugin `options` in `opencode.json`, the global file, the project file.

Only the global Foreman file is trusted. A project file and plugin `options` can both come from a repository, so neither can set `jev.url` or `jev.apiKey` (where your decision-model key is sent), anything under `approval` (which shell commands run without asking), or `log.path`. Those are ignored with a warning in the server log. Put them in the global file, or use the `FOREMAN_JEV_*` environment variables.

If a config file cannot be parsed, for example while you are halfway through an edit, Foreman keeps the settings already in use until the file is valid again. The gate options below can go in the same files.

In the global file, any string value can reference an environment variable with `{env:NAME}`. An unset variable resolves to an empty string and is reported in the server log. References in a project file or in plugin options are left as written, so a repository cannot read one of your secrets into text that is sent to a model.

## Plans and commands

| Command | What it does |
| --- | --- |
| `/plan <request>` | Switches the session to `planner` and starts planning the request |
| `/start-work [name]` | Opens a new `orchestrator` session titled `Plan: <name>`, makes `.foreman/plans/<name>.md` its active plan, and starts on it. The current session says where the work went; find the new session in the session list. The name can be omitted when there is only one plan |
| `/stop-work` | Stops tracking the active plan |
| `/review-work [focus]` | Sends the `reviewer` subagent over the current changes |
| `/foreman-pause` | Pauses the done gate, project checks, and report gate for this session and its subagents |
| `/foreman-resume` | Turns them back on |
| `/handoff [focus]` | Writes a summary for continuing in a fresh session: goal, state, decisions, files, checks, open issues, next step |

`/plan`, `/start-work`, and `/review-work` are each registered only while the agent they need (`planner`, `orchestrator`, `reviewer`) is enabled. `/plan` switches the session to the planner and its configured model; `/start-work` opens a new session with the orchestrator and its configured model. Files and skills attached to a command are passed on to the agent.

A plan's tasks are Markdown checkboxes. While a plan is active in a session:

- The plan file is read fresh and added to the system instructions of every model request, so it survives compaction. The first 12,000 characters are included.
- The orchestrator ticks a task's checkbox once the task is done and verified.
- The done gate keeps the session going while unticked tasks remain, within `maxContinuations`, and stops tracking the plan once every task is ticked.

The active plan is stored per session in plugin storage and survives a restart. Subagent sessions do not inherit it.

## Terminal UI

The package includes a TUI part, loaded automatically with the server part:

- **Footer.** `plan <name> 2/5` next to the prompt while the session has an active plan.
- **Sidebar.** A Foreman section with the active plan, a progress bar, and the most recent gate decision.
- **Toasts.** One when a gate steps in: a nudge to continue, a failed check, a subagent report sent back, a blocked repeat, an auto-approved command. Routine "left alone" verdicts and routing hints stay quiet.
- **`/foreman`.** A status dialog, also in the command palette as "Foreman: Show status": the plan and its progress, which gates are on, whether the decision model is actually answering, whether supervision is paused, the last ten decisions, and the config and log files in use.
- **Check progress.** While a project check runs, the footer and sidebar show its command and elapsed time. `/foreman-cancel-check` stops it.
- **Health.** A toast appears when the decision model stops answering, with the reason, and again when it recovers.

A toast also confirms each config reload.

**Variant sync.** The TUI remembers the last variant you picked for each model and applies it over an agent's configured one. When the prompt's model changes, Foreman's TUI part sets the variant back to the one configured for the agent using that model. A variant you pick afterwards stays until the model changes again. Before a session exists the TUI does not say which agent is selected, so the variant is taken from the primary agents configured with that model, and an agent with no model of its own that inherits the same model gets that variant too. If those agents disagree, the variant is left alone until the first message creates the session and its agent is known, then that agent's variant is applied; a variant you pick while it waits is kept. Because the session only exists once the first message is sent, that first message can go out with the earlier variant. Turn it off with `"tui": { "syncVariants": false }`.

## Decision log

Every gate decision is appended to a JSON Lines file, one object per line:

```text
~/.local/share/opencode/foreman/decisions.jsonl
```

```json
{"time":"2026-11-16T05:30:12.114Z","sessionID":"ses_…","gate":"done","action":"continue","reason":"checks-failed","detail":"bun test","directory":"/repo","answers":{"work":0.97,"blocked":0.04,"unfinished":0.06,"claimsDone":0.95,"verified":0.9,"waived":0.01},"jevMs":212}
```

`answers` holds the probabilities the decision model returned, which is what you need to tune a threshold. The log never contains prompts, replies, or check output; it does contain check commands, tool names, and, for the approval gate, the shell command that was scored.

The file follows `XDG_DATA_HOME`. It is renamed to `decisions.jsonl.1` once it passes `maxBytes`, replacing the previous `.1`. Change it with:

```jsonc
{ "log": { "enabled": true, "path": "/custom/decisions.jsonl", "maxBytes": 5000000 } }
```

## Project checks

By default the done gate only reads what the agent says. Give it commands and it checks the work instead. Put them in the project's `.opencode/foreman.jsonc`:

```jsonc
{
  "doneGate": {
    "checks": ["bun run typecheck", "bun test"],
    "checkTimeoutMs": 120000
  }
}
```

When the agent says requested work is complete, Foreman runs the commands in order in the session's directory and stops at the first failure. A failure is sent back to the agent with the last 6,000 characters of output. If they all pass, the session goes idle, whatever the agent did or did not say about checking.

Pressing Stop, sending a new message, or running `/foreman-cancel-check` kills a running check together with the processes it started, and nothing is sent to the agent afterwards. A check that passes its timeout is killed the same way. A process that deliberately detaches itself into its own process group or session is not tracked and keeps running.

The commands run through the shell with your permissions, each time an agent claims completion, so keep them fast and free of side effects. A project config file can set them, so treat a `.opencode/foreman.jsonc` in a repository you do not trust like any other script in it.

## Configure the gates

The gates need an API key for the decision model. Without one the agents still load and the gates stay inactive.

| Environment variable | Option | Default |
| --- | --- | --- |
| `FOREMAN_JEV_API_KEY` | `jev.apiKey` | none |
| `FOREMAN_JEV_URL` | `jev.url` | `https://api.typesafe.ai/v1/systemone` |
| `FOREMAN_JEV_MODEL` | `jev.model` | `jev-latest` |

The same settings can go in a Foreman config file. Use `{env:NAME}` to keep the key itself out of the file, and keep a literal key out of project files, which can end up committed:

```jsonc
// ~/.config/opencode/foreman.jsonc
{
  "jev": {
    "apiKey": "{env:TYPESAFE_API_KEY}",
    "url": "https://api.typesafe.ai/v1/systemone",
    "model": "jev-latest"
  }
}
```

The global config file wins over the `FOREMAN_JEV_*` environment variables. Set environment variables on the background service with `opencode service set env NAME value`.

To route through a LiteLLM proxy, point the URL at its System One path and use the proxy's model name, for example `http://127.0.0.1:4000/v1/systemone` and `typesafe/jev-1.14.0`.

All settings, with their defaults, as they would appear in the global `~/.config/opencode/foreman.jsonc`:

```jsonc
{
  "jev": { "timeoutMs": 3000 },
  "doneGate": { "enabled": true, "maxContinuations": 2, "threshold": 0.5, "checks": [], "checkTimeoutMs": 120000 },
  "reportGate": { "enabled": true, "threshold": 0.5 },
  "loopGuard": { "enabled": true, "maxRepeats": 4, "ignore": [] },
  "plans": { "enabled": true },
  "commands": true,
  "tui": { "syncVariants": true },
  "log": { "enabled": true, "maxBytes": 5000000 },
  "intentGate": {
    "enabled": true,
    "minConfidence": 0.5,
    // Override the suggested handling per intent to name your own agents.
    "routes": { "implement": "Delegate to worker-deep, then verify." }
  },
  "approval": {
    "enabled": false,
    "dryRun": true,
    "riskThreshold": 0.2,
    "prefixes": ["git status", "git diff", "bun test"]
  }
}
```

## Behaviour

**Scope.** The done and intent gates act only on root sessions. The report gate acts only on subagent child sessions. The loop guard acts on every session.

**Done gate.** It sends the latest user request and the assistant's final message to the model. It does nothing when the request did not ask for a change, when the assistant is waiting on the user, when the turn failed, or while the session's own background work is still running. It sends at most `maxContinuations` nudges per user request, counting nudges for failed checks and open plan tasks. The limit only caps how often the agent is restarted: once it is used up the gate still runs the checks and reads the plan, and records the result as exhausted so you can see the work did not pass. The count is kept in plugin storage, so a config change or plugin reload does not reset it.

The gates take the request from the conversation, and from a copy recorded when you sent it, so they keep working after OpenCode compacts a long session.

**Report gate.** It sends the subagent's brief and its final message to the model, and asks for one revision per brief when the report is empty, states no outcome, or says the task is half-done. A second weak report goes to the parent as it is.

**Loop guard.** It compares each tool call's name and arguments with the previous call in the same session. After `maxRepeats` identical calls in a row, the next one fails with a message telling the agent to change approach, and keeps failing until the agent makes a different call. It catches short cycles the same way: two or three different calls repeating in the same order with the same arguments. Any call that breaks the pattern resets it, so re-running a test after each edit is unaffected. The history starts again with each message you send, so asking for the same command several times is not counted as a loop. List tools that legitimately repeat, such as a polling tool, in `ignore`.

**Intent gate.** Intents are `trivial`, `explore`, `implement`, `plan`, `research`, and `discuss`. A classification below `minConfidence` produces no hint.

**Approval gate.** It only considers a permission request that is already `ask`, is a single shell command, starts with one of `prefixes`, and contains no chaining, redirection, substitution, secret-like paths, or risky flags. Every scored command is recorded in plugin storage under `approval/`; a command whose record cannot be written is not approved. With `dryRun` on, nothing is approved.

The lexical filter is a heuristic, not a shell parser or a security boundary. A command such as `bun test` runs project scripts, so keep `prefixes` narrow in repositories you do not trust. The command text is sent to the decision-model provider.

The model judges wording, not evidence. It can tell that a message says tests passed; it cannot tell whether they did.

## Develop

```sh
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layout and local testing.

## License

MIT
