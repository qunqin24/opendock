# opencode-keepgoing

An [opencode](https://opencode.ai) plugin that keeps agents working until the task
is actually done. When a session goes idle with work left, it sends one context-rich
nudge instead of looping blind "continue" messages, and stops as soon as the agent
signals real completion.

What it does:

1. Nudges idle sessions that still have open todos (or stalled output).
2. Stops nudging when the agent replies with a bare done token (`DONE`).
3. Re-arms on the next real user message.
4. Auto-approves permission asks according to your rules.
5. Retries retryable API errors (rate limits, 5xx) with incremental backoff.

## Installation

Requires Node 18+ and a built `dist/` (shipped in the npm package).

Add the plugin to your opencode config at `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@turingincomplete/opencode-keepgoing"]
}
```

Then quit and restart opencode. Config changes inside `~/.opencode/keepgoing.json`
are picked up without restarting.

## Usage

No setup is needed; defaults work out of the box. The contract:

- The plugin nags only while todos are open or output looks stalled.
- If the work is done (or there is a genuine reason to stop), the agent replies
  with exactly `DONE` and nothing else. The plugin then stays quiet until you
  send a new message.
- Otherwise the agent resumes working immediately.

### Configuration

Optional JSONC file at `~/.opencode/keepgoing.json` (global) or
`.opencode/keepgoing.json` in your project (overrides global). All keys optional:

```jsonc
{
  "enabled": true,
  "cooldown_ms": 20000,            // base wait between nudges
  "backoff_multiplier": 2,         // each consecutive nudge waits longer
  "max_consecutive": 4,            // give up after N nudges per user stretch
  "respect_questions": true,       // stay silent when the agent asked you something
  "max_context_items": 5,          // open todos listed per nudge
  "done_token": "DONE",            // reply token meaning "work is complete"
  "retry_on_error": true,
  "error_backoff_base_ms": 5000,   // API error retry: 5s -> 10s -> 20s ...
  "error_backoff_max_ms": 300000,  // ... capped at 5 min
  "nudge_prefix": "You stopped before finishing the task.",

  // permission handling (see below)
  "permissions": {
    "mode": "allow_all",           // "allow_all" | "allow_list" | "off"
    "allow": ["bash", "webfetch"], // allow_list mode: tools to auto-approve
    "ask": ["bash:rm *"]           // never auto-approved; wins over everything
  },

  // append a safety-policy block to nudges telling the agent which tools are
  // pre-approved and where it should stop instead of acting
  "inject_recommendation": false,

  // template for that block ({tools} and {done_token} are substituted)
  "recommendation_policy": "...see src/prompts.ts for the full default..."
}
```

Permission modes:

| mode | behaviour |
| --- | --- |
| `allow_all` | approve every ask except those matching `ask` |
| `allow_list` | approve only asks matching `allow`; others reach you normally |
| `off` | plugin never touches permission flow |

Glob entries match the tool name (`"bash"`) or tool plus command pattern
(`"bash:git *"`, `"bash:rm *"`). The `ask` list always wins.

With `inject_recommendation: true`, every nudge ends with a policy block built
from `recommendation_policy`. The default tells the agent to run routine,
reversible work without pausing (code edits, artifact cleanup, installs, file
I/O anywhere, project commands, tests, builds, dev servers, deploys) and to
stop instead for sudo/system-wide changes, bulk or non-project data deletion,
security/firewall/privacy changes, and anything with ethical, licensing, or
legal implications.

## License

MIT
