# opencode-ill-be-back

Keep the active OpenCode session cache warm while you are away.

`ill-be-back` watches the active session and starts a cache countdown after the
first assistant reply. When you arm away mode with `/illbeback`, it sends a small
keep-alive ping every time the countdown hits `0:00`, until the ping limit is
used. This keeps the provider prompt cache alive so your next real message reuses
cached context instead of paying full input cost again.

Keep-alive pings use a fixed marker so they are never confused with your real
messages:

```
I'll Be Back - Ping [UN1QU3M2G] n/x - REPLY: OK
```

## Package

The npm package exports both OpenCode entrypoints:

| Export     | Type           | Loaded via      |
| ---------- | -------------- | --------------- |
| `.`        | runtime plugin | `opencode.json` |
| `./server` | runtime plugin | `opencode.json` |
| `./tui`    | TUI sidebar    | `tui.json`      |

Shared state is written to `~/.config/opencode/ill-be-back-state.json`.

## Install

OpenCode installs npm plugins automatically at startup.

### 1. Register the runtime plugin

Edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@aundal/ill-be-back@latest"]
}
```

### 2. Register the TUI sidebar

Edit `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@aundal/ill-be-back@latest"]
}
```

### 3. Restart OpenCode

Plugins load at startup. Fully quit and restart.

> Prefer letting an agent do this? See [Install with an LLM](#install-with-an-llm).

## Usage

Commands are registered by the TUI plugin (no `commands/*.md` needed):

| Command                 | Action                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `/illbeback`            | Prompt for a ping count and arm away mode                          |
| `/illbeback-toggle`     | Show or hide the sidebar block                                     |
| `/illbeback-shorttimer` | Switch the title countdown between `MM:SS` and short form (`5m`)   |
| `/illbeback-test`       | Measure the provider cache timeout and set a safe ping interval    |

### Sidebar

Title:

- first load: `I'll Be Back (-:--)`
- after first assistant reply: live countdown starts
- away mode armed: countdown resets after each ping
- state marker after the timer: `⚫` idle, `🟢 <pings left>` away, `🧪` testing

Expanded rows show `Session` and `Total` net USD savings. Each ping subtracts its
cache-read cost; on your first real reply after returning, the preserved-cache
benefit is added back once, capped to
`min(pre_away_context_tokens, return_reply.tokens.cache.read)`.

### Timeout test

`/illbeback-test` finds your provider's cache timeout:

1. starts at 5 minutes
2. doubles while the cache is still warm, until the first cache miss
3. bisects between last-cached and first-miss until the gap is under 10s
4. stores a safe interval = 90% of the last cached delay

After that, keep-alive pings use the measured interval instead of the 4-minute
default.

## Options

There is no config schema. Behavior is tuned via constants at the top of
`src/ill-be-back.ts`:

| Constant                       | Default | Meaning                                                          |
| ------------------------------ | ------- | ---------------------------------------------------------------- |
| `DEFAULT_INTERVAL_SECONDS`     | `240`   | Ping interval (seconds) until a timeout test measures a new one  |
| `DEFAULT_MAX_PINGS`            | `5`     | Ping count used when you confirm `/illbeback` without a number   |
| `DEFAULT_TEST_DELAY_MINUTES`   | `5`     | Starting delay for `/illbeback-test`                             |
| `CACHE_TIMEOUT_SAFETY_FACTOR`  | `0.9`   | Fraction of the last cached delay used as the safe interval      |
| `DEBUG`                        | `false` | Show `Last Ping` / `Time` / `Proof` debug rows in the sidebar    |

Runtime options (no restart): the ping count in the `/illbeback` prompt, and the
`toggle` / `shorttimer` commands. Editing constants requires a restart.

Pricing for the savings display is pulled best-effort from
[models.dev](https://models.dev). If it is unreachable, savings simply show `0.00`
and pings/tests still run.

## Development

```sh
npm pack
npm publish --access public
```

## Notes

- Restart OpenCode after updating plugin config or package versions.
- `/illbeback` only resets the away cycle; session/total counters persist in
  `ill-be-back-state.json`.
- Synthetic ping text is hidden from the model history but still warms the cache.

## License

MIT. See [LICENSE](LICENSE).
