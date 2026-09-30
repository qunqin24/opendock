# TurnPrune

Trims stale tool outputs from long coding-agent sessions. It prunes once per user turn and only behind the already-cached prefix, so tool loops stay fully cached.

Once per user turn, [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) (`typesafe/jev-1.13`, a small decision model on the [OpenRouter Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)) judges each tool output from the last turn against your new message and decides whether it is still needed. The ones that are not get replaced by a fixed placeholder. The tool call stays visible, and everything else stays byte-identical. The prompt cache before the first replaced output stays valid; only the part behind it is written to the cache again, once per user turn. Inside a tool loop nothing changes (unless the context window is almost full, see [How it decides](#how-it-decides)).

```
[Tool output removed by TurnPrune to save tokens. Run the tool again if you need this content.]
```

If the model needs a removed output again, it sees the call and runs the tool again.

It pays off in long sessions with large tool outputs (file reads, logs, test runs): in sessions of about 200k tokens the bill fell by about 20 %. In short sessions it can cost more than it saves. See [Limitations](#limitations).

**You need** an [OpenRouter](https://openrouter.ai) account with credits. Jev cost about 0.004 USD per measured session. The Decisions API is an alpha endpoint.

## Install (OpenCode)

1. Set your OpenRouter key as an environment variable before OpenCode starts. It is never read from config files.

   ```sh
   # macOS / Linux (add it to ~/.zshrc or ~/.bashrc to keep it)
   export OPENROUTER_API_KEY=sk-or-v1-...
   # Windows (persistent)
   setx OPENROUTER_API_KEY "sk-or-v1-..."
   ```

   OpenCode 2 runs a background service that keeps the environment it was started with. **Open a new terminal** (on Windows, `setx` only reaches terminals opened afterwards) and restart the service from there:

   ```sh
   opencode service restart
   ```

   Restarting from the old terminal starts the service without the key. TurnPrune then prunes nothing, and the status line says `TurnPrune: OPENROUTER_API_KEY missing`.

2. Add the plugin to `opencode.json` (project) or your global OpenCode config:

   ```json
   {
     "plugins": ["@turnprune/opencode"]
   }
   ```

   Or run `opencode plugin add @turnprune/opencode`.

   Run `opencode service restart` again afterwards. On the first start the service downloads the package, so `opencode plugin list` can report "No plugins found" for a few seconds. Run it again and it shows `turnprune`.

3. Keep working as usual. The status line appears with the first message of a session.

Requires OpenCode 2.0.13 or newer (V2 plugin API) and Node.js 22.13 or newer for the `turnprune` command.

## Update

OpenCode installs a plugin package once and keeps that version. To get a new TurnPrune release:

```sh
opencode plugin check                        # shows "update available"
opencode plugin update @turnprune/opencode
opencode service restart
opencode plugin list                         # shows the new version (can take a few seconds)
```

Running `opencode plugin add` again does not update: it only reports that the plugin is already configured.

## See what it saves

**Status line.** In a session, OpenCode's status line under the prompt shows the savings of the current turn and of the whole session:

```
TurnPrune −12.4k tok (−38%) · Session −41k (−22%)
```

Before anything was pruned it reads `TurnPrune — nothing pruned yet`; with the kill switch on, `TurnPrune off`. When TurnPrune cannot work, the status line says why, already on the start screen:

| Status line | Meaning | Fix |
| --- | --- | --- |
| `TurnPrune: OPENROUTER_API_KEY missing` | The OpenCode service has no key | Set the key, open a new terminal, `opencode service restart` |
| `TurnPrune: OpenRouter key rejected` | OpenRouter answered 401/403 | Check the key at [openrouter.ai/keys](https://openrouter.ai/keys), set it again, restart the service from a new terminal |

In both cases the context goes out unchanged. `turnprune stats` shows the same hint below the session.

**Command line.** `turnprune stats` reads OpenCode's database read-only and prints the same numbers:

```sh
npx -p @turnprune/opencode turnprune stats                 # latest session
npx -p @turnprune/opencode turnprune stats --all           # every session, newest first
npx -p @turnprune/opencode turnprune stats --session <id> --json
```

It finds the database like OpenCode does (`OPENCODE_DB`, relative to `$XDG_DATA_HOME/opencode`, default `~/.local/share/opencode/opencode.db`); `--db <path>` overrides it. Sessions from before the ledger existed are computed from the stored metrics.

**How it counts.** A *request* is one model call; OpenCode sends the whole history every time. Saved = tokens before TurnPrune − tokens after, per request. A *turn* runs from one user message to the finished answer and sums its requests (the placeholders apply to every request of the turn); the percentage is saved ÷ tokens before. The *session* sums all turns. All numbers are TurnPrune's own token estimates, not the provider's billed tokens, and there is no money display.

**What the numbers are not.** They show the direction, not the bill:

- They count characters ÷ 4, not the model's tokenizer.
- System prompt and tool definitions are not included, so the percentage is higher than the share of the real prompt.
- Tokens are not money. Most of the history is read from the cache at a fraction of the input price, and every prune writes part of the cache again. In the measured D2 session the status line showed `Session −310k (−52%)`, while the bill fell by 21 %.

For money, use OpenCode's own cost figure.

## Configuration

Options go into the plugin entry. Environment variables override them.

```json
{
  "plugins": [
    { "package": "@turnprune/opencode", "options": { "timeoutMs": 1500 } }
  ]
}
```

| Option | Environment variable | Default | Purpose |
| --- | --- | --- | --- |
| `enabled` | `TURNPRUNE_ENABLED` | `true` | Kill switch: `false` / `0` registers no hook at all |
| `timeoutMs` | `TURNPRUNE_TIMEOUT_MS` | `1500` | Upper bound per Jev request (500–5000 ms) |
| `pricingFile` | `TURNPRUNE_PRICING_FILE` | automatic | Your own prices for models OpenCode does not know |
| `diagnostic` | `TURNPRUNE_DIAGNOSTIC` | `false` | Logs field names and types of hook events, never contents |
| – | `OPENROUTER_API_KEY` | – | Required; environment only |

### Prices

TurnPrune does not ship a price list. It reads the input price, the cache-read price and the context window of the model you use from OpenCode's own model catalog (models.dev) and caches them for 24 hours. If a model is not in the catalog (custom provider, local model), TurnPrune still prunes per turn and assumes a 108k window. Older context is then only re-judged under context pressure, never on growth, because without prices a removal cannot be shown to pay. To add missing models, save a JSON file like this and point `pricingFile` (or `TURNPRUNE_PRICING_FILE`) to it:

```json
{
  "models": {
    "myprovider/my-model": { "inputPerM": 1.0, "cacheReadPerM": 0.1, "cacheWritePerM": 1.25, "contextLimit": 200000 }
  }
}
```

Prices are in USD per 1M tokens. `cacheWritePerM` is optional and defaults to the input price.

## How it decides

- **Tool loop** (no new user message): the previous request is reused byte for byte, and new messages are only appended. No Jev call. OpenCode's own "continue" note after an interrupted answer counts as part of the same turn.
- **New user turn**: only the tool outputs of the last turn go to Jev. Each one is judged against your new message. Everything sent before stays frozen.
- **Context growth** (from 40k prompt tokens and 1.5× growth since the last full judgement, only with known prices): frozen outputs are judged again. The result is applied only if the removed tokens pay for the cache break within 10 dispatches.
- **Context pressure** (80 % of the model's window): full re-judgement, always applied. This is checked before the tool loop, so it also happens inside a tool loop, on every request while the prompt stays above the mark (repeated questions are answered from a local cache).
- **No valid previous request** (the first request TurnPrune sees in a session, after compaction, an edited history or a model switch): the whole history is judged. The cache is broken at that point anyway.

User messages, assistant answers, reasoning, errors, unfinished tools and the current turn are never candidates. Neither is tool work that looks like it contains a secret (pattern-based: private keys, `sk-…`, `Bearer …`, `password=…` and similar) or touches credential files (`.env`, keys, `.npmrc` …); that tool work is never sent to OpenRouter.

**Fail-safe:** a missing key, a network error, a timeout, an invalid answer or any internal error sends the context unchanged (or the already-frozen prefix, so nothing that was removed comes back).

## Measured results

Live OpenCode sessions against native OpenCode: the same prompts ran in isolated copies of a repository, in parallel. Costs are provider-billed costs plus Jev. Single runs; cache hits vary between runs, so each number is noisy.

**TurnPrune 0.1.0, installed as a package** (session "D2", 16 prompts, ~200k tokens of native prompt, topic switches, pauses, full reads of large files; `glm-5.3-flash`, one run): 0.0861 → 0.0676 USD incl. Jev (**−21 %**), largest prompt 209k → 134k, must-keep facts correct, no fallbacks, hook ≤ 685 ms.

**Earlier runs of the same policy** with the experiment plugin before the package ([jev-smart-context](https://github.com/guschi18/jev-smart-context), Phase 6), same D2 session, tool work fixed per prompt:

| Model | Run | Native USD | TurnPrune policy USD (incl. Jev) | Difference | Largest prompt |
| --- | --- | --- | --- | --- | --- |
| `glm-5.3-flash` | 1 | 0.1436 | 0.0764 | −47 % | 205k → 133k |
| `glm-5.3-flash` | 2 | 0.1154 | 0.0765 | −34 % | 206k → 134k |
| `gpt-5.6-luna` | 1 | 0.0936 | 0.0736 | −21 % | 193k → 122k |
| `gpt-5.6-luna` | 2 | 0.0936 | 0.0789 | −16 % | 193k → 139k |

Must-keep facts (canary codes, session rules, earlier answers) were correct in all 8 arms, every turn made exactly the required tool calls, and no read results were invented. Jev cost ≈ 0.004 USD per session.

**Small context** (18–33k tokens): between −18 % and +20 % per session, close to zero with a model that caches reliably. Little is left to prune, while each pruned turn costs a Jev call and rewrites part of the cached prompt. These runs used an earlier version without placeholders and were not repeated with the package.

**Latency:** once per user turn the hook waits for Jev (p95 0.9–1.6 s in the experiments, capped by `timeoutMs`). Tool-loop steps add about 1 ms.

Details and the 0.1.0 verification: [docs/decisions.md](docs/decisions.md).

## Limitations

- **Short sessions:** below roughly 40k tokens there is little to prune, and each pruned turn still costs a Jev call and a partial cache rewrite. It can cost more than it saves.
- **Jev only sees your new message.** Each output is judged against that message alone. A short message such as "ok, continue" gives it little to go on. Jev keeps what it is unsure about (relevance ≥ 0.4), but it can still remove something the model needs later.
- **Re-running a tool is not free:** it costs a tool call and time, and the file may have changed since.
- **Latency:** up to `timeoutMs` (default 1.5 s) once per user turn, and on every request under context pressure.
- **Alpha API:** Jev runs on OpenRouter's alpha Decisions API. If it changes or fails, TurnPrune falls back to sending the context unchanged.
- **Estimates:** the savings display counts its own token estimates, see [See what it saves](#see-what-it-saves).

## Packages

| Package | Content |
| --- | --- |
| [`@turnprune/core`](packages/core) | Agent-neutral core: chunking, pins, redaction, Jev client, turn policy |
| [`@turnprune/opencode`](packages/opencode) | OpenCode V2 adapter |

Claude Code and Codex adapters are planned on the same core.

## Privacy

Sent to OpenRouter: the candidate tool outputs (secrets redacted, at most 20,000 characters each), your current message (redacted, capped the same way) and the repository path. Nothing else. OpenRouter's own data policy applies to these requests. Your model provider still receives the whole context as usual; TurnPrune only decides which outputs go out as placeholders. Plugin storage holds content-free state only: message keys, hashes, token counts and timestamps. The savings ledger per session (`stats/<sessionID>`) holds numbers only. Per-dispatch metrics (routes, token estimates, Jev latency and cost) are also content-free and can be replayed offline.

## Development

```sh
npm install
npm run check   # lint, typecheck, tests, build
```

Node 22.13 or newer. TurnPrune grew out of the [Jev Smart Context](https://github.com/guschi18/jev-smart-context) experiments.

## License

MIT
