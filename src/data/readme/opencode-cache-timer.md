# opencode-cache-timer

Sidebar countdown showing time until your prompt cache expires.

```
Cache
4m 23s
```

## Install

Add to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-cache-timer"]
}
```

Restart OpenCode. The **Cache** panel appears in the sidebar.

> While iterating locally, point at the source file instead:
> `"plugin": ["/absolute/path/to/opencode-cache-timer/src/index.tsx"]`

## Configure

Edit `src/providers/registry.ts` to set TTLs per provider or per model.

```ts
export const DEFAULT_REGISTRY: TTLRegistry = {
  // Provider-level: applies to every model under that provider
  anthropic: 5 * MINUTE,
  openai:    5 * MINUTE,
  deepseek:  2 * HOUR,
  google:    1 * HOUR,
  xai:       5 * MINUTE,

  // Per-model override (wins over provider-level)
  "anthropic:claude-opus-4-6": 1 * HOUR,
  "openai:gpt-5.4":            24 * HOUR,
}
```

**Lookup order:** `providerID:modelID` → `providerID` → no timer.

If a provider isn't in the registry, the panel shows `◦ idle` and no countdown runs. Add an entry to enable it.

## Defaults shipped

| Provider | TTL | Notes |
|---|---|---|
| Anthropic | 5 min | Default ephemeral cache. Override per-model for the 1h tier. |
| OpenAI | 5 min | Conservative; actual 5–10 min. Override per-model for the 24h tier. |
| DeepSeek | 2 hrs | Conservative; docs say "hours to days". |
| Google Gemini | 1 hr | Explicit Context Caching API default. |
| xAI Grok | 5 min | No SLA — treated as ephemeral. |
| Mistral | — | Undocumented; intentionally omitted. |

Design bias: **conservative**. A timer that says `expired` while the cache is still warm is harmless; a timer counting down on an already-dead cache is misleading.

## Develop

```bash
bun install
bun test
```
