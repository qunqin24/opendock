# opencode-session-guard

Hard token-threshold guard for [opencode](https://opencode.ai). When a session crosses a configurable fraction of the model's context budget, the plugin injects a system message that:

- **For subagents** (default ≥ 70 % of budget): tells the agent to **STOP** and return its current status to the orchestrator immediately, without further tool calls.
- **For primary agents** (default ≥ 80 % of budget, agents named `orchestrator` and `build`): tells the model to ask the user to **start a new session** and stop calling tools.

The default fallback budget is **100 000 tokens**. If opencode reports the active model's real context window, the plugin uses that instead, so ratios scale automatically across models.

The plugin does not modify or truncate history. It only appends an urgent instruction to the system prompt of the next LLM call once the threshold is reached.

## Why

Local and remote LLMs tend to keep going past the point where their context is still useful — once a session gets too long, output quality collapses and you waste tokens on increasingly noisy attempts. Models cannot reliably self-monitor token usage. This plugin enforces the limit externally.

It complements [opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) (which compresses context) rather than replacing it: pruning extends the useful window, this plugin stops the session cleanly when even that is exhausted.

## Install

### From npm

```json
{
  "plugin": ["opencode-session-guard"]
}
```

opencode installs and loads it automatically at startup.

### Local (development)

Drop `src/index.js` into `.opencode/plugin/` of your project (rename freely), or clone this repo and reference it via npm `file:` install in your project's `package.json`.

## Configuration

All settings via environment variables — nothing is hard-coded.

| Variable | Default | Meaning |
|---|---|---|
| `OPENCODE_SESSION_GUARD_CONTEXT_LIMIT` | `100000` | Fallback context budget in tokens when the model's real limit is unknown |
| `OPENCODE_SESSION_GUARD_USE_MODEL_LIMIT` | `1` | If `1`, prefer the model's reported `model.limit.context` over the fallback |
| `OPENCODE_SESSION_GUARD_PRIMARY_RATIO` | `0.8` | Fraction of budget at which primary agents are warned |
| `OPENCODE_SESSION_GUARD_SUBAGENT_RATIO` | `0.7` | Fraction of budget at which subagents are stopped |
| `OPENCODE_SESSION_GUARD_PRIMARY_THRESHOLD` | _(unset)_ | Absolute token threshold for primary agents — overrides the ratio when set |
| `OPENCODE_SESSION_GUARD_SUBAGENT_THRESHOLD` | _(unset)_ | Absolute token threshold for subagents — overrides the ratio when set |
| `OPENCODE_SESSION_GUARD_PRIMARY_AGENTS` | `orchestrator,build` | Comma-separated list of agent names treated as primary |
| `OPENCODE_SESSION_GUARD_LANG` | `en` | Message language. Built-in: `en`, `de`. Unknown values fall back to `en`. |
| `OPENCODE_SESSION_GUARD_PRIMARY_MESSAGE` | _(unset)_ | Full custom primary template (overrides language). Placeholders: `{used}`, `{threshold}`. |
| `OPENCODE_SESSION_GUARD_SUBAGENT_MESSAGE` | _(unset)_ | Full custom subagent template (overrides language). Placeholders: `{used}`, `{threshold}`. |
| `OPENCODE_SESSION_GUARD_DEBUG` | _(unset)_ | Set to `1` to log to `/tmp/opencode-session-guard.log` |

With defaults and the fallback budget of 100 000 tokens that resolves to a 70 000-token subagent cutoff and an 80 000-token primary cutoff. If the model itself reports a larger context window, both cutoffs scale up proportionally.

Token usage is the sum of `input + output + reasoning + cache.read + cache.write` from the most recent assistant message in the session, as reported by opencode itself.

## How it works

Subscribes to the `experimental.chat.system.transform` hook. Before each LLM call:

1. Fetches the session's messages via `client.session.messages`.
2. Reads the latest assistant message's `tokens.*` fields.
3. Determines whether the active agent is primary (configurable) or a subagent.
4. If the token sum has crossed the matching threshold, appends a stop/warning instruction to the last system prompt entry.

Subagent invocations run in their own opencode sub-sessions, each with their own session ID and token count, so subagent thresholds are evaluated independently of the parent session.

## Limitations

- The instruction-following depends on the model. Small or weak instruction-tuned models may ignore the injected warning. Tested working with Qwen-3.5-9B-class models.
- The hook runs before each LLM call, so the very first turn in a session never triggers (no prior assistant tokens yet). This is intentional.
- This plugin cannot forcibly terminate a runaway agent; it can only ask the model to stop. Pair with sensible `permission.task` limits in your agent config for defence in depth.

## License

MIT
