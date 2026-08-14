# opencode-ollama-orchestrator

**Zero-command, fully automatic multi-agent orchestrator for OpenCode.**
Provider-agnostic — works with any model: Ollama, OpenAI, Anthropic, Gemini, and more.

---

## Quick Start

### 1. Install

```bash
npm install -g opencode-ollama-orchestrator
```

### 2. Configure

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    ["opencode-ollama-orchestrator", {
      "maxParallelWorkers": 3,
      "maxRetries": 3,
      "doxEnabled": true
    }]
  ],
  "agent": {
    "strategist": { "model": "ollama/deepseek-v4-pro", "mode": "primary" },
    "architect":  { "model": "ollama/gemini-3-flash-preview", "mode": "subagent" },
    "engineer":   { "model": "ollama/kimi-k2.7-code", "mode": "subagent" },
    "auditor":    { "model": "ollama/kimi-k2.6", "mode": "subagent" },
    "specialist": { "model": "ollama/deepseek-v4-flash", "mode": "subagent" }
  }
}
```

Use any provider prefix: `ollama/`, `openai/`, `anthropic/`, `google/`, or omit for local models.

### 3. Use

Start OpenCode and type naturally:

```
Build a JWT auth system with refresh token support
```

That's it. The orchestrator detects the task, plans it, dispatches engineers in parallel, audits critical work, and reports back. No slash commands needed.

---

## How It Works

```
User message → Strategist detects task → Architect writes plan + todos
  → Engineers execute tasks (up to 3 parallel) → Auditor verifies critical-path
  → Specialist recovers stuck tasks → Summary back to user
```

### Agent Roles

- **Strategist** (primary) — Detects missions, orchestrates flow, summarizes results
- **Architect** (subagent) — Writes plans and todos, runs once per mission
- **Engineer** (subagent) — Implements code, runs in parallel (up to 3)
- **Auditor** (subagent) — Verifies critical-path tasks only
- **Specialist** (subagent) — Diagnoses and recovers stuck missions

Each agent uses its own configured model. The orchestrator switches models automatically per agent.

---

## Configuration Reference

### Plugin Options

- `maxParallelWorkers` (number, default 3, range 1–3) — Max concurrent engineer tasks
- `maxRetries` (number, default 3, range 0–5) — Max retries per failed task
- `maxSubagentDepth` (number, default 2, range 1–3) — Max nesting depth for subagent calls
- `doxEnabled` (boolean, default true) — Enable DOX timestamped run records
- `doxAutoInit` (boolean, default true) — Auto-create `.opencode/DOX/` + `AGENTS.md`
- `doxAutoCloseout` (boolean, default true) — Append run summary on completion
- `verbose` (boolean, default false) — Extra console logging

### Per-Agent Options

Each agent in the `agent` block supports:

- `model` — Model string with provider prefix (e.g. `"ollama/kimi-k2.7-code"`)
- `fallbackModel` — Fallback model if primary fails
- `temperature`, `topP`, `maxTokens` — LLM parameters
- `mode` — `"primary"` (strategist) or `"subagent"` (all others)
- `prompt` — Custom prompt override
- `tools` — Tool overrides
- `permission` — Permission overrides

### Full Config Example

```json
{
  "plugin": [
    ["opencode-ollama-orchestrator", {
      "maxParallelWorkers": 3,
      "maxRetries": 3,
      "maxSubagentDepth": 2,
      "doxEnabled": true,
      "doxAutoInit": true,
      "doxAutoCloseout": true,
      "verbose": false
    }]
  ],
  "agent": {
    "strategist": {
      "model": "ollama/deepseek-v4-pro",
      "fallbackModel": "ollama/deepseek-v4-flash",
      "temperature": 0.3,
      "mode": "primary"
    },
    "architect": {
      "model": "ollama/gemini-3-flash-preview",
      "temperature": 0.8,
      "mode": "subagent"
    },
    "engineer": {
      "model": "ollama/kimi-k2.7-code",
      "temperature": 0.2,
      "mode": "subagent"
    },
    "auditor": {
      "model": "ollama/kimi-k2.6",
      "temperature": 0.3,
      "mode": "subagent"
    },
    "specialist": {
      "model": "ollama/deepseek-v4-flash",
      "temperature": 0.4,
      "mode": "subagent"
    }
  }
}
```

---

## File Layout

Each mission creates files under `.opencode/`:

```
{project}/
├── .opencode/
│   ├── AGENTS.md                        # DOX contract
│   ├── DOX/{slug}.md                    # Timestamped run record
│   ├── plans/{slug}/plan.md             # Architect's plan
│   ├── plans/{slug}/state.json          # Live mission state
│   └── todo/{slug}.md                   # Task list with checkboxes
```

---

## Features

- **Zero commands** — Natural language input only, no slash commands
- **Provider-agnostic** — Works with any model/provider
- **Parallel execution** — Up to 3 engineers run concurrently
- **Smart task detection** — Heuristic rejects casual chat, accepts real task requests
- **Critical-path auditing** — Auditor verifies only mission-critical tasks
- **Anti-stuck system** — Loop detection, timeout watchdog, Specialist auto-recovery
- **Model fallback** — Falls back to alternate model if primary fails (circuit breaker after 5 failures)
- **State persistence** — Mission state survives conversation compaction
- **Sideline Q&A** — `/btw how does X work?` spawns a read-only Q&A session
- **DOX integration** — Auto-generates timestamped run records
- **Pre-mission backup** — Auto-creates git stash or directory snapshot before execution
- **Rate limiting** — Token bucket limits concurrent session creation
- **Automation toggle** — `automation: false` (default) requires human interaction with phase gate approvals; `automation: true` runs fully autonomous with no human gates
- **Ponytail integration** — "Lazy senior dev" ruleset injected into every system prompt via `experimental.chat.system.transform`. Configurable intensity: `lite`, `full` (default), `ultra`, `off`. No commands needed — active by default.

---

## Tools

The plugin registers these tools (callable by agents or via slash commands):

- `delegate_task` — Delegate a subtask to a specific agent
- `abort_mission` — Abort all active missions
- `mission_status` — Show mission and session status
- `skip_task` — Skip a specific task by ID
- `resume_from` — Resume from a specific task ID
- `check_watchdog` — Detect and kill stuck sessions
- `revert_mission` — Revert to pre-mission state using backup
- `toggle_automation` — Toggle automation on/off (true = fully autonomous, false = human interaction)
- `auto_run` — Queue a mission for autonomous execution (requires automation: true)

---

## Troubleshooting

### Plugin not loading

1. Verify: `npm ls -g opencode-ollama-orchestrator`
2. Check `opencode.json` has `"plugin": ["opencode-ollama-orchestrator"]` (array, not object)

### All agents use the same model

**Fixed in v2.5.0.** The plugin now uses the `chat.message` SDK hook (instead of the non-existent `message.created` event) and passes `agent` + `model` to `session.prompt` (instead of `session.create`, which doesn't accept them).

### Missions not detected

- Messages shorter than 15 chars or with fewer than 3 words are ignored
- Messages starting with `/` or `@` are treated as system commands
- Common acknowledgements ("ok", "thanks", "got it") are ignored
- Questions ("explain", "what is", "how does") are treated as chat, not tasks

### Model not found

- Ensure model name includes provider prefix: `"ollama/kimi-k2.7-code"`, not just `"kimi-k2.7-code"`
- For Ollama Cloud: set `OLLAMA_API_KEY` environment variable

### Plan/todo files never created

**Fixed in v2.2.1.** Agent prompts now use relative paths that match permission globs.

---

## Testing

```bash
cd $(npm root -g)/opencode-ollama-orchestrator
npm test
```

228 tests covering all core modules.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### Recent Versions

- **2.6.0** — Replace slow/fast modes with simple automation on/off toggle. Ponytail integration.
- **2.5.3** — Ponytail integration: "lazy senior dev" ruleset in system prompts
- **2.5.1** — Fix question modal: strategist now controls pipeline launch via start_mission tool
- **2.5.0** — Critical fix: model switching now works (chat.message hook + prompt-based model passing)
- **2.4.0** — God class split: SessionManager + MissionStore extracted, 28 integration tests
- **2.3.0** — Major overhaul: 16 critical bug fixes, config caching, dedup, dead code cleanup
- **2.2.1** — Fix: plan/todo files never created (absolute→relative path mismatch)
- **2.2.0** — Spark sideline Q&A (`/btw`), anti-recursion guards
- **2.1.17** — Rate limiting, real session kill, notifications, structured logging

---

## License

MIT © 2026 muhaimin