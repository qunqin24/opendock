# @orvix-id/opencode

[OpenCode](https://opencode.ai) v2 plugin for the **Orvix Coding Plan**. OpenCode runs the agent; this plugin
connects it to `https://api.orvix.id/coding/v1` and keeps every session on the prompt cache.

Using Pi or Oh My Pi instead? See [@orvix-id/pi](https://github.com/Orvix-id/pi-plugin) and
[@orvix-id/omp](https://github.com/Orvix-id/omp-plugin).

## Setup

1. **Create a Coding key.** In [platform.orvix.id/api-keys](https://platform.orvix.id/api-keys), create a key and
   tick **Orvix Coding** (`coding:invoke`). The default AI Router scope (`ai:invoke`) is not enough; Coding
   endpoints answer `401 coding:invoke scope required`.
2. **Expose the key** to OpenCode:

   ```bash
   export ORVIX_CODING_API_KEY="orv-sk_live_..."
   ```

   Put it in your shell profile or secret manager rather than typing it into commands you share.
3. **Install the plugin:**

   ```bash
   opencode plugin add @orvix-id/opencode
   ```

   or add it to `~/.config/opencode/opencode.json` yourself:

   ```jsonc
   {
     "plugins": ["@orvix-id/opencode"],
     "model": "orvix-coding/glm-5.2"
   }
   ```

4. **Pick a model:** `opencode -m orvix-coding/deepseek-v4-flash`. Models with reasoning profiles expose variants,
   for example `orvix-coding/glm-5.2#high`.

The plugin needs OpenCode 2.0.21 or newer.

## Models

The model list comes from `GET /coding/v1/models` when the key is available, so it always matches your plan.
Without network access the plugin falls back to the lineup it shipped with. Model ids drop the `orvix/` prefix:
`orvix-coding/glm-5.2` calls `orvix/glm-5.2`.

## What the plugin does

| Piece | Why |
| --- | --- |
| Provider `orvix-coding` on OpenCode's built-in OpenAI-compatible driver | Streaming, tool calls, and usage accounting stay OpenCode's own. |
| `session_id` added to every agent and compaction request | Orvix keeps a session on the same upstream route and prompt cache only when the request body carries `session_id`. OpenCode's session id is reused, so follow-up requests hit the cache. |
| `prompt_cache_key` enabled for every model | Lets cache-aware upstreams group the session as well. |
| `x-orvix-coding-client` header | Reports the client name and plugin version. Used for diagnostics only. |

Session title requests are sent without `session_id`; they use a different, very small prompt.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Model unavailable: orvix-coding/...` | The plugin did not load. Check `plugins` in `opencode.json` and run `opencode` with `--print-logs`. |
| `401 coding:invoke scope required` | The key was created without the **Orvix Coding** scope. |
| `429 coding_concurrency_exceeded` | Too many Coding requests in flight at once. OpenCode retries automatically; `retry_after` is a few seconds. |
| `429 coding_quota_exceeded` | A 5-hour, weekly, or monthly window is used up. `resets_at` says when. |

## Development

```bash
bun install
bun run check        # tsc + bun test
bun run probe        # 3 real OpenCode turns against a local mock, reports prefix reuse per request
```

## License

MIT
