# opencode-rate-limit-retry-v2

An [OpenCode](https://opencode.ai) 2 plugin that retries **the same model** with exponential backoff and jitter when a provider answers with a rate limit, instead of leaving the turn failed.

This is a port of [`@bdliyq/opencode-rate-limit-retry`](https://github.com/bdliyq/opencode-rate-limit-retry) to the OpenCode 2 plugin API. The original targets the OpenCode 1 API and does not load on OpenCode 2.

## Install

```sh
opencode plugin add opencode-rate-limit-retry-v2
```

Or add it to `opencode.json(c)` yourself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-rate-limit-retry-v2"]
}
```

To configure it inline, use the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-rate-limit-retry-v2",
      "options": { "baseDelayMs": 10000, "maxRetries": 6 }
    }
  ]
}
```

Restart OpenCode after changing `plugins`.

## What it does

When a model call fails with a rate limit, the plugin waits, then sends a short follow-up prompt to the same session so the assistant continues where it left off. The prompt runs on the session's current model, which is normally the model that hit the limit — the plugin tracks that model and does not retry into a different one (see [Model changes](#model-changes)).

- **Backoff:** `baseDelayMs * 2^attempt`, capped at `maxDelayMs`, with ±`jitterFactor` randomisation. Defaults give 5s → 10s → 20s → 40s → 80s.
- **Bounded:** at most `maxRetries` attempts per incident, where an incident is one session on one model. The budget resets on a genuine successful execution, after `resetAfterMs` of inactivity, or when the session switches model.
- **One at a time:** a lock file serialises retries per session across every plugin instance and every OpenCode server process, so duplicate events cannot produce duplicate prompts.
- **Cancelled by you:** switching models, or sending a message during the wait, drops the pending retry instead of queueing a continuation behind your turn.
- **Private by default:** nothing is written to disk unless you enable the debug log.

### Model changes

`session.prompt` has no model parameter: a retry runs on whatever model the session has when the prompt is admitted. To keep that from becoming a surprise, the plugin:

- records the model when each run starts (the failure event carries none), and again as part of the persisted attempt state;
- treats a different model as a different incident, so an exhausted budget on one model does not block a retry on another;
- re-reads the session's model immediately before prompting, and **drops the pending retry** if it changed — the switch is a deliberate user choice, and injecting a continuation into the model they just picked would be a duplicate turn;
- cancels the backoff wait as soon as `session.model.selected` fires, instead of waking up minutes later to a retry that no longer applies;
- resets the budget on the new model, so it starts with the full `maxRetries`;
- proceeds with the retry when the model cannot be read (`session.get` failure), because losing a wanted retry is worse than an occasional retry on the current model.

## Configuration

Settings come from three places, highest priority first:

1. **`options`** on the plugin entry in `opencode.json(c)` (see above)
2. **`rate-limit-retry.json`**, first file found:
   - `~/.config/opencode/rate-limit-retry.json` (on Windows, `%USERPROFILE%\.config\opencode\`)
   - `<workspace>/.opencode/rate-limit-retry.json`
   - `<workspace>/rate-limit-retry.json`

`<workspace>` is the directory OpenCode reports for the plugin instance, not the
directory the server happened to start in, so a project file is still found when
the server runs from elsewhere.
3. built-in defaults

Every key is optional.

```json
{
  "enabled": true,
  "maxRetries": 5,
  "baseDelayMs": 5000,
  "maxDelayMs": 120000,
  "jitterFactor": 0.2,
  "resetAfterMs": 300000,
  "errorPatterns": ["rate limit", "too many requests", "quota exceeded"],
  "debug": false,
  "logFile": null
}
```

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch. Read at load time. |
| `maxRetries` | `5` | Attempts per incident before backing off. |
| `baseDelayMs` | `5000` | First wait. |
| `maxDelayMs` | `120000` | Delay ceiling. |
| `jitterFactor` | `0.2` | Randomisation as a fraction of the delay (`0` disables). |
| `resetAfterMs` | `300000` | Inactivity after which the attempt budget resets. |
| `errorPatterns` | see source | Case-insensitive substrings matched against the provider error. |
| `debug` | `false` | Write lifecycle lines to the log file. |
| `logFile` | `~/.config/opencode/rate-limit-retry.log` | Log destination when `debug` is on. |

Values are validated on load: out-of-range numbers are clamped and bad types fall back to defaults, so a typo cannot produce `NaN` delays or an unbounded retry loop.

### Tuning

- Hitting limits often? Raise `baseDelayMs` to `10000` and `maxRetries` to `6`.
- Slow to recover? Raise `maxDelayMs`.
- Want to see what matched? Set `"debug": true` and read the log file.

## Differences from the original

The port fixes issues that only become visible once the plugin actually runs:

1. **Duplicate instances.** OpenCode can create several plugin instances for one file (Windows file watchers emit multiple change events per write, and instances are not always disposed). The original deduplicated with an in-memory `Set`, which is per-instance and therefore useless here; in testing a single write produced six live instances and 72 retry prompts. Retries are now serialised with a lock file.
2. **Attempt counter reset too early.** The original reset the counter as soon as a retry prompt was *admitted*, which says nothing about whether the model call succeeded, so it never reached its own cap. The counter now resets only on a successful execution.
3. **Cap never held.** On reaching `maxRetries` the original deleted its state, so the next failure started again at zero. The state is now kept, so the cap holds until a success or the inactivity timeout.
4. **Config path on Windows.** The original resolved its config directory via `process.env.HOME`, which is unset on Windows, so `rate-limit-retry.json` was never read there. This port uses `XDG_CONFIG_HOME ?? ~/.config`, matching OpenCode itself.
5. **Log is opt-in.** Provider error bodies can contain account-specific text, so the debug log is disabled by default.
6. **Model switches during backoff.** A prompt carries no model, so the original retried into whatever model the session had when the wait ended — often a model the user had just picked, producing an unexpected extra turn, while still counting the attempt against the model that actually failed. The retry is now tied to the failing model, dropped if the session moved on, and the wait is cancelled immediately.

The trigger is also different by necessity: OpenCode 2 has no `session.error` event, so this uses `session.execution.failed`, which carries the structured error.

## Troubleshooting

Set `"debug": true` and read the log (default
`~/.config/opencode/rate-limit-retry.log`). Each decision is one line:

| Line | Meaning |
| --- | --- |
| `[RETRY] attempt 2/5 … waiting 10s` | A rate limit matched and the wait started. |
| `[SKIP] retry cap reached` | `maxRetries` is spent; a success, a model switch, or `resetAfterMs` frees it. |
| `[SKIP] another instance is already retrying` | Normal when OpenCode loads the plugin more than once. |
| `[SKIP] lock unavailable` | The lock directory cannot be written; retries are disabled until this is fixed. |
| `[SKIP] user prompt superseded the pending retry` | You sent a message while the plugin was waiting; that is intentional. |
| `[EVENT] OpenCode scheduled its own retry` | The host is retrying before the turn fails; both policies are active. |

If retries never happen at all, check in this order:

1. Is the error text matched by `errorPatterns`? A provider that returns a
   bare 429 with no message does not match; add the phrase it does return.
2. Is `enabled` true and the config file the one you edited? Plugin `options`
   override the file, and the file is read when the plugin loads.
3. Does the log show `lock unavailable`? Point `TMPDIR` somewhere writable, or
   remove a stale lock file left by a crashed process.

## Known limitations

- **The retry is a follow-up prompt, not a replayed request.** It is admitted through `session.prompt`, so it appears in the transcript as an ordinary user message, other plugins' `prompt` hooks see it, and the model starts a fresh turn with the full conversation.
- **Each retry costs a full turn.** `maxRetries: 5` on a long session is five additional full-price requests.
- **OpenCode has its own retry policy.** The host exposes a `session` retry hook and emits `session.retry.scheduled`; this plugin uses neither. It reacts after a turn has failed, so both policies can be active for the same provider — lower `maxRetries` if that produces more attempts than you want.
- **Config is read when the plugin loads.** Editing `rate-limit-retry.json` requires a restart. `enabled: false` is the off switch; `maxRetries` is clamped to at least 1.
- **State is per plugin, not per project.** Attempt budgets are keyed by session, and a success, a model switch, or `resetAfterMs` of inactivity clears the entry.

## Requirements

- OpenCode 2.1 or newer (`@opencode/plugin` is provided by the host)
- Node 20+ at build time; the published ESM output uses explicit `.js` specifiers, so it imports under both Node and Bun

## Development

```sh
bun install
bun test
bun run test:types   # `bun test` does not typecheck the tests
bun run build
```

## License

MIT. See [LICENSE](./LICENSE).

Original work Copyright (c) 2026 leoli, from
[`bdliyq/opencode-rate-limit-retry`](https://github.com/bdliyq/opencode-rate-limit-retry), also MIT.
