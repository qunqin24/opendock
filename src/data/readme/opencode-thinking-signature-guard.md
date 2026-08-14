# opencode-thinking-signature-guard: stop Anthropic "Invalid signature in thinking block" 400s in OpenCode

An OpenCode session using Anthropic (Claude) with extended thinking can get **permanently stuck** on:

```
AI_APICallError: messages.N.content.M: Invalid `signature` in `thinking` block
```

Once it starts, every retry fails the same way and the session cannot continue. `opencode-thinking-signature-guard` is a small, zero-config OpenCode plugin that removes the offending thinking blocks from the outgoing request so the session recovers. It does not edit your saved transcript; it only rewrites the message array OpenCode is about to send to the model.

## The problem

Anthropic re-validates the cryptographic `signature` on every `thinking` block you replay in the conversation history. Most signed thinking blocks replay fine. The ones that do **not** are the turns where Anthropic engaged **safety redaction**: those turns come back with `redacted_thinking` blocks plus a short "lightweight" signature (~236 characters, metadata only, no encrypted payload). That short signature is not replayable.

The moment one such turn lands in your history, it poisons the whole session: every subsequent request replays it and Anthropic rejects the entire request with `400 Invalid signature in thinking block`. This is not specific to any proxy, prompt-cache setup, or organization, and it is unrelated to session size — a single poisoned turn is enough. The same failure is reported across many Anthropic-based tools (see [References](#references)).

## What the plugin does

It hooks `experimental.chat.messages.transform`, which runs right before OpenCode serializes messages for the model, and:

1. Finds **poisoned** assistant turns — a turn that contains a `redacted_thinking` reasoning part, or a signed thinking part whose signature is shorter than a threshold (default `256`).
2. Removes **all** reasoning parts from those turns, leaving their text and tool calls intact. Anthropic accepts a completed tool-use turn that has no thinking block, so the request validates again.
3. Leaves **healthy** turns (normal long signatures, no redaction) completely untouched, so their prompt cache and reasoning continuity are preserved.

This targeted approach is why the default does not simply strip all history thinking: healthy turns keep their signatures and stay cacheable, and only the turns that are already causing a hard `400` are modified.

### Verified against the real failure

On the exact request that produced a real `400` in production (131 messages, one poisoned turn: `redacted_thinking × 3 + thinking(sig len 236) + text + tool_use × 2`):

| Request | Result |
| --- | --- |
| Original, unmodified | `400 messages.*.content.*: Invalid signature in thinking block` |
| After this plugin's policy | `200 OK` (stream starts normally) |

## Installation

OpenCode auto-installs the plugin when its npm name appears in `opencode.json` (see [Quick start](#quick-start)). To install it manually:

```bash
bun add opencode-thinking-signature-guard
# or
npm install opencode-thinking-signature-guard
```

Requires Node.js `>=18.17` and OpenCode `>=1.15.12`.

## Quick start

Add the package name to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-thinking-signature-guard"]
}
```

That is all. With defaults, the plugin only acts on poisoned turns and is otherwise invisible.

To use a local checkout instead of npm, point at the built file:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///abs/path/to/opencode-thinking-signature-guard/dist/plugin.js"]
}
```

## Configuration

Options are optional. Pass them with the tuple form in `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-thinking-signature-guard",
      {
        "mode": "redacted",
        "shortSignatureThreshold": 256,
        "dryRun": false,
        "verbose": false,
        "log": false
      }
    ]
  ]
}
```

| Option | Default | What it means |
| --- | --- | --- |
| `mode` | `"redacted"` | `"redacted"`: strip reasoning only from poisoned turns (redacted or short-signature). `"all-stale"`: also strip reasoning from every completed assistant turn before the active user boundary (more aggressive; sacrifices prompt cache but maximally defensive). `"off"`: disable. |
| `shortSignatureThreshold` | `256` | A signed thinking block whose signature is shorter than this is treated as a non-replayable redaction signature. The real poisoned signatures are ~236 chars; healthy ones are 500+. |
| `dryRun` | `false` | Detect and log without mutating the outgoing request. |
| `verbose` | `false` | Log a one-line summary to stderr whenever a request is modified. |
| `log` | `false` | Append JSON-line records to `~/.local/share/opencode/thinking-signature-guard.log`. |

Every option also has an environment-variable equivalent, which takes effect even without editing `opencode.json`:

```bash
THINKING_SIGNATURE_GUARD_MODE=redacted        # redacted | all-stale | off
THINKING_SIGNATURE_GUARD_SHORT_SIG=256
THINKING_SIGNATURE_GUARD_DRYRUN=1
THINKING_SIGNATURE_GUARD_VERBOSE=1
THINKING_SIGNATURE_GUARD_LOG=1
```

## When to use it

Reach for this plugin when an OpenCode session on Claude with extended thinking starts failing every turn with `Invalid signature in thinking block`, especially after a long or tool-heavy run. If you never see that error, the plugin stays dormant and changes nothing.

## Caveats

- **Prompt cache**: modifying a turn changes the request prefix from that point on, which invalidates Anthropic's prompt cache after the poisoned turn. This is unavoidable — the poisoned turn already forces a `400`, so there is no working cache to preserve. Healthy turns are left intact precisely to keep as much cache as possible.
- **Scope**: the plugin targets the Anthropic redaction/replay case (`metadata.anthropic.signature` / `metadata.anthropic.redactedData`). It does not touch Bedrock/Vertex thought signatures or non-Anthropic providers.
- **Fail-open**: if anything unexpected happens inside the hook, the plugin passes the request through unmodified rather than breaking your session.

## Development

```bash
bun install
bun run typecheck   # tsgo --noEmit
bun run check       # biome
bun run test        # fixture + hook tests
bun run build       # emit dist/
```

## References

- Anthropic SDK: [anthropics/anthropic-sdk-python#1598](https://github.com/anthropics/anthropic-sdk-python/issues/1598) — invalid thinking-block signature on replay.
- Claude Code: [anthropics/claude-code#21726](https://github.com/anthropics/claude-code/issues/21726) — empty / truncated thinking signatures.
- The same failure and "replay only current-turn thinking" fix pattern appears across multiple Anthropic-based coding agents.

## License

[MIT](LICENSE) © isac322
