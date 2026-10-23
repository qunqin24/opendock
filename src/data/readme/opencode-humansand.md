# opencode-humansand

[humans& Ampersand](https://ampersand.humansand.ai) (`ampersand-v0.1`) in [OpenCode](https://opencode.ai), and in any
AI SDK app.

Ampersand is not a chat-completions model. It exposes an Agents API: you create a **session** on humans&'s servers,
the session keeps the whole transcript, and you feed it input events and tool results. OpenCode (like every agent
harness) resends the full transcript on every model call. This package bridges the two: it keeps one Ampersand session
per OpenCode session, sends only what is new on each step, and recreates the session (replaying history) only when it
has to.

![OpenCode running Ampersand v0.1: it finds a failing test, fixes it, and reruns the suite](https://raw.githubusercontent.com/aryankeluskar/opencode-humansand/main/demo/demo.gif)

```jsonc
// opencode.json
{ "plugins": ["opencode-humansand"] }
```

```sh
export HUMANSAND_API_KEY=...        # https://ampersand.humansand.ai
opencode run -m humansand/ampersand-v0.1 "what's in this repo?"
```

## Status

- v0.1.2. Verified against a mock of the Agents API (23 tests), end to end inside OpenCode 2.1.3, and against the
  live API (2026-10-22): session create, parallel tool calls, tool results posted as events, cancel of a waiting
  turn before new input, continued turns that rely on server-side memory, usage and cost.
- If something differs from the published API reference, open an issue with `HUMANSAND_DEBUG_FILE` and
  `HUMANSAND_TRACE_FILE` output (see Debugging).

## Setup

**With the plugin (recommended).** `plugins: ["opencode-humansand"]` registers the `humansand` provider with the
model's pricing and limits, routes OpenCode's AI SDK bridge to this package, derives session titles locally (so no
Ampersand session is created just to name a conversation), and records the OpenCode session and agent ids on the
Ampersand session. Plugin options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-humansand",
      "options": {
        "sender": "aryan",            // metadata.sender on your messages (default "user")
        "channel": "opencode",        // metadata.channel (default "opencode")
        "serverCompaction": "auto",   // Ampersand server-side compaction: "auto" | "disabled"
        "allowSilentCompletion": true, // may the agent end a turn with nothing to say?
        "titles": "local"             // "local" (default) or "model"
      }
    }
  ]
}
```

**Without the plugin.** Any OpenCode install can use the provider directly through the AI SDK bridge:

```jsonc
{
  "providers": {
    "humansand": {
      "package": "aisdk:opencode-humansand",
      "settings": { "apiKey": "{env:HUMANSAND_API_KEY}" },
      "models": { "ampersand-v0.1": { "name": "Ampersand v0.1", "limit": { "context": 1000000, "output": 32768 } } }
    }
  }
}
```

The API key is read from `settings.apiKey`, then `HUMANSAND_API_KEY`, then `AMPERSAND_API_KEY`.

**In an AI SDK app** (AI SDK 6, provider spec v3):

```ts
import { createHumansand } from "opencode-humansand"
import { generateText } from "ai"

const humansand = createHumansand({ sender: "aryan" })
const { text } = await generateText({ model: humansand("ampersand-v0.1"), prompt: "hello" })
```

## How it works

Every assistant part the provider emits carries a small **anchor** in `providerMetadata.humansand`: the Ampersand
session id, turn id, whether the turn is waiting for tool results, and a hash of the agent definition (model,
instructions, tools, Ampersand options). OpenCode stores that metadata with the message and hands it back on the next
request. The provider then decides:

| Situation | Action |
| --- | --- |
| No anchor (first step, fork, after OpenCode compaction, model switch) | Create a session, replaying the prompt as `user` messages tagged with `sender` (`user`, `assistant`, `tool`, `system`) |
| Anchor present but the agent hash changed (tools or system prompt changed) | Create a new session with full replay, delete the old one |
| Anchor present, same agent | Continue: post tool results and new messages as events, read the turn's event stream |

Details, including the wire sequence, stream translation and usage policy, are in [DESIGN.md](./DESIGN.md).

Things worth knowing:

- **Usage.** Ampersand only reports tokens per completed turn. The provider reports `GET /context` (the last model
  call's input tokens) as the step's input so OpenCode's context meter tracks the real server-side context, and the
  turn's output tokens on the completing step. Raw Ampersand usage is in `usage.raw`.
- **Reasoning effort.** Ampersand supports `high` and `max`. OpenCode variants map `low`/`medium`/`high` to `high`
  and `xhigh` to `max`. Effort changes apply in place; tools and instructions cannot change on a live session, which
  is why those recreate it.
- **Retries.** A host retry after a dropped stream posts the delta again as new work (Ampersand treats a repeated
  `Idempotency-Key` as "nothing to do", which would hang the retry). The cost is a possible duplicate user message in
  the server-side transcript.
- **Aborts** cancel the Ampersand turn so it stops spending credit.
- **Tool errors.** OpenCode reports failed tools as text; the bridge recognises that shape and sends
  `success: false` with the message.
- **Sessions that disappear** server-side (expired, deleted) are recreated transparently with a full replay.

## Settings

Provider settings (`createHumansand({...})` or `providers.humansand.settings`):

| Key | Default | Meaning |
| --- | --- | --- |
| `apiKey` | env | Bearer token |
| `baseURL` | `https://ampersand.humansand.ai/v1` | |
| `headers` | | Extra request headers |
| `serverCompaction` | `"auto"` | Ampersand server-side compaction (`auto` or `disabled`) |
| `allowSilentCompletion` | `true` | Whether a turn may end with no text and no tool call |
| `sender`, `channel` | `"user"`, `"opencode"` | Stamped on user messages as Ampersand metadata |
| `contextUsage` | `true` | Fetch `GET /context` after every step (one extra API request per step) |
| `metadataKey` | `"humansand"` | Key for the anchor in `providerMetadata` / `providerOptions` |

Per-call `providerOptions.humansand`: `reasoningEffort`, `sender`, `channel`, `serverCompaction`,
`allowSilentCompletion`, `metadata` (merged into message metadata), `sessionMetadata` (string map stored on the
Ampersand session). With the plugin, anything you put under `providers.humansand.settings` reaches both places.

## Limits and guard rails

- **Rate limits.** The normal tier allows 10 work requests per minute (burst 5); each OpenCode step is one. 429s
  are surfaced as retryable with `Retry-After`, so OpenCode backs off, but a tool-heavy loop will feel it. Ask
  humans& for the high tier for serious use.
- **Tool schema budget.** 32 KiB per tool, 128 KiB for all tools, names matching `^[a-zA-Z0-9_-]{1,96}$`. The
  provider fails fast with the offending tools listed instead of letting the API reject the session. OpenCode's
  Code Mode is the usual fix for large MCP catalogs.
- **Prompt injection.** humans&'s model card reports higher susceptibility than frontier models. Keep `shell` and
  `edit` on `ask` when Ampersand orchestrates; see [docs/chief-of-staff.md](./docs/chief-of-staff.md).
- **Not supported.** Image input (dropped with a warning), sampling parameters (`temperature`, `topP`, …, warned),
  `maxOutputTokens` (silently ignored; Ampersand has no such knob), `toolChoice` other than `auto`, JSON response
  format, provider-defined tools. Ampersand returns no reasoning text, only reasoning token counts.
- **Request size.** Replayed history is trimmed to Ampersand's 4 MiB request cap (large tool outputs first, then
  the oldest messages, with a marker).

## Chief of staff

Ampersand's server-held, long-running sessions make it a good coordinator for long-horizon work: it plans, delegates
to OpenCode subagents running other models, and keeps your notes in the loop. The agent definition, permissions and
rationale are in [docs/chief-of-staff.md](./docs/chief-of-staff.md).

## Debugging

`HUMANSAND_DEBUG_FILE=/path/to/log.jsonl` appends one line per step with the prompt shape (roles, part types, anchors)
and the chosen plan (create or continue, and which events were posted). No message text is written.
`HUMANSAND_TRACE_FILE=/path/to/trace.jsonl` appends every raw server event (this does include message text).

`bun --env-file=.env e2e/live.ts` runs a four-step smoke test against the live API.

## Development

```sh
bun install
bun run typecheck
bun test                      # mock Agents API + provider tests
bun run build
```

End to end against OpenCode with the mock:

```sh
bun e2e/mock-server.ts 48181 e2e/script-basic.json e2e/requests.jsonl &
cd e2e/project && opencode run --standalone -m humansand/ampersand-v0.1 "Please read NOTES.md and tell me what it says"
```

`e2e/project/opencode.json` loads this repository as a plugin from its directory (`file://`), which is also how to
hack on the bridge locally.

## Roadmap

- Native `@opencode/ai` protocol inside OpenCode (precise `contextTokens`, native compaction operations), as an
  upstream PR.
- `humansand` provider entry on [models.dev](https://models.dev) so OpenCode installs this package automatically.
- AI SDK provider spec v4 export (AI SDK 7).

## License

MIT
