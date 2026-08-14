# opencode-gemini-dejavu: mitigate Gemini repeated tool-call loops and thinking runaway in OpenCode

[![npm version](https://img.shields.io/npm/v/opencode-gemini-dejavu.svg)](https://www.npmjs.com/package/opencode-gemini-dejavu)
[![npm downloads](https://img.shields.io/npm/dm/opencode-gemini-dejavu.svg)](https://www.npmjs.com/package/opencode-gemini-dejavu)
[![license](https://img.shields.io/npm/l/opencode-gemini-dejavu.svg)](https://github.com/isac322/opencode-gemini-dejavu/blob/main/LICENSE)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue?logo=npm)](https://docs.npmjs.com/generating-provenance-statements)

Gemini 3.x in OpenCode can get stuck in two related failure modes:

1. **Tool-call deja vu**: the agent's reasoning says it should move on, but the next model request calls the same tool with the same arguments again.
2. **Thinking-budget runaway**: the model spends nearly the entire `maxOutputTokens` budget on internal thinking and emits no visible output (`finishReason: STOP` with `candidatesTokenCount: 1`).

`opencode-gemini-dejavu` is a small OpenCode plugin that catches both at the request boundary. It does not edit your saved transcript. It rewrites the message array OpenCode is about to send to Gemini, and (for Gemini models only) sets `thinkingConfig.includeThoughts: false` on the outgoing request, then lets the run continue.

Use it when an OpenCode session with Gemini keeps repeating calls like `read({ filePath: "..." })`, or when the model thinks for tens of thousands of tokens and returns essentially nothing.

## Installation

OpenCode auto-installs the plugin when its npm name appears in `opencode.json` (see [Quick start](#quick-start) below). To install it manually:

```bash
bun add opencode-gemini-dejavu
# or
npm install opencode-gemini-dejavu
```

Requires Node.js `>=18.17` and OpenCode `>=1.15.12`.

## Quick start

Add the npm package name to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-dejavu"]
}
```

OpenCode installs npm plugins automatically at startup and caches them under its package cache.

To tune the loop detector:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-gemini-dejavu",
      {
        "callRepeat": 3,
        "batchRepeat": 2,
        "prune": "repeated",
        "dryRun": false
      }
    ]
  ]
}
```

Defaults are deliberately conservative:

| Option | Default | What it means |
| --- | --- | --- |
| `callRepeat` | `3` | Trigger when the same individual `tool + args` call repeats this many times at the tail. |
| `batchRepeat` | `2` | Trigger when the same ordered batch of tool calls repeats this many times at the tail. |
| `prune` | `"repeated"` | Remove thought signatures from older repeated calls only. Use `"none"` to disable pruning or `"all"` to prune more aggressively. |
| `dryRun` | `false` | Detect and log without mutating the outgoing request. |
| `disableThoughtSuppression` | `false` | Skip setting `thinkingConfig.includeThoughts: false` on Gemini requests. Set to `true` if you want the model to emit visible thought summaries (useful for debugging) even at the cost of higher reasoning token volume. |

Set `GEMINI_DEJAVU_VERBOSE=1` to log rewrites:

```bash
GEMINI_DEJAVU_VERBOSE=1 opencode
```

## When to use it

Reach for this plugin when all of these are true:

- You're using Gemini 3.x in OpenCode.
- The agent is making progress in text, but the tool call keeps snapping back to the same action.
- The repeated call has the same tool name and effectively the same arguments.
- You want a mitigation that leaves the persisted session history alone.

Skip it when:

- You're not using Gemini 3.x.
- You're debugging raw Gemini request payloads and need every thought signature preserved exactly.
- Your workflow intentionally performs identical back-to-back tool calls and you don't want a loop breaker involved.

## What it changes

The plugin runs in two OpenCode hooks:

### `experimental.chat.messages.transform` — request-local boundary

When it detects a repeated Gemini 3.x tool-call tail, it:

1. Finds the latest meaningful user message. Empty continuation messages are ignored.
2. Finds repeated assistant tool-call batches after that user message.
3. Inserts a request-local `role: "user"` boundary immediately before the latest repeated tool-call message.
4. Prunes older repeated `thoughtSignature` values by default.
5. Preserves the latest current-turn tool call signatures.

The boundary text is short on purpose:

```text
Continue from the evidence above. Treat the following tool result as the latest completed step for this generation.
```

### `chat.params` — `includeThoughts: false` on Gemini

For every request the active model is a Gemini variant (any `id` / `modelID` / `api.id` containing `gemini`), the plugin sets `thinkingConfig.includeThoughts: false` on the outgoing request. Other `thinkingConfig` fields (notably `thinkingLevel`) are preserved exactly as OpenCode supplied them.

In testing on `gemini-3.5-flash`, this single flip reliably prevented the budget-exhaustion runaway (where `thoughtsTokenCount` would otherwise reach ~30k of a 32k `maxOutputTokens` budget with `candidatesTokenCount` of 1). The `thoughtSignature` carry across turns is preserved, so multi-turn reasoning continuity is not lost.

Set `disableThoughtSuppression: true` in plugin options to skip this hook entirely.

The saved OpenCode transcript is not rewritten. Both changes exist only in the outgoing request for that generation.

## Why this helps

The deja-vu failure mode is not just "the model called a tool twice." In the captured repro used to build this plugin, the model's reasoning moved on while the emitted `functionCall` kept returning to an older `read(...)` call. Exact preservation of call IDs and available Gemini thought signatures did not stop the repeat. The working mitigation was a request-local turn boundary: make the latest completed tool result look like the current step, then remove older repeated signatures that were pulling the model back into the stale call.

The thinking-runaway failure mode is different. In the captured repro on `gemini-3.5-flash` with `thinkingLevel: "high"` and a session containing several large recent tool results, the model would consume close to the full `maxOutputTokens` budget on internal thinking and return essentially no visible output. Per Google's docs `includeThoughts` is nominally a summary-return toggle, but on this model the server-side decoding path shifts dramatically when summaries are not requested: streaming response parts collapse from ~90 chunks to 2, and `thoughtsTokenCount` falls from ~30k to under ~2k. The `thoughtSignature` continues to be emitted on the final response part, so multi-turn reasoning state still carries forward.

Both mitigations are applied at the request boundary only. No cache, no database, no transcript migration.

## Verification

This plugin was checked against the OpenCode loop that motivated it:

- Plugin off: continuing the imported looping session caused Gemini to call the same `read(...)` tool again.
- Plugin on: the same continuation inserted one request-local boundary, pruned older repeated signatures, and the assistant finished without making a new tool call.

Local package checks:

```bash
bun run prepublishOnly
node -e "import('./dist/plugin.js').then((m) => console.log(m.default.id))"
bun pm pack --dry-run
```

The test harness uses a repo-local fixture. It is not included in the npm tarball.

## Package facts

```yaml
name: opencode-gemini-dejavu
type: opencode-plugin
runtime: node >=18.17
models: gemini-3.x (boundary), gemini-* (thinkingConfig)
hooks:
  - experimental.chat.messages.transform
  - chat.params
entrypoint: dist/plugin.js
types: dist/plugin.d.ts
published_files:
  - dist
  - README.md
```

Runtime code uses standard Node APIs: `node:crypto`, `structuredClone`, and `console`. Bun is used for development scripts, tests, and packaging checks, not for the published plugin runtime.

`@opencode-ai/plugin` is a dev dependency for the official OpenCode plugin types. The compiled JavaScript does not import it.

## Build and publish

```bash
bun install
bun run prepublishOnly
bun pm pack --dry-run
```

Publish with npm if it is available:

```bash
npm publish --access public
```

Or publish with Bun after npm authentication is configured:

```bash
bunx npm login
bun publish --access public
```

`publishConfig.access` is already set to `public`, but passing `--access public` makes the registry intent explicit.
