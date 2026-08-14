# opencode-compaction-guard

[![CI & Publish](https://github.com/viiqswim/opencode-compaction-guard/actions/workflows/publish.yml/badge.svg)](https://github.com/viiqswim/opencode-compaction-guard/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/opencode-compaction-guard.svg)](https://www.npmjs.com/package/opencode-compaction-guard)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An [OpenCode](https://github.com/anomalyco/opencode) plugin that **prevents** and **auto-recovers** from the error that makes a session permanently unrecoverable after auto-compaction (or after an interrupted tool call):

```
messages.N: `tool_use` ids were found without `tool_result` blocks immediately
after: toolu_XXXX. Each `tool_use` block must have a corresponding `tool_result`
block in the next message.
```

When this happens, Anthropic returns a `400` and **every subsequent message in
the session fails** — including `continue`. Without this plugin your only escape
is to abandon the session (open a new terminal) or do manual DB surgery.

## The problem

Anthropic's API requires that every `tool_use` block is immediately followed by
its matching `tool_result` block. Two things in OpenCode can break that pairing:

1. **Interrupted / aborted tool calls** — a tool left in `pending`/`running`
   state produces a `tool_use` with no `tool_result`.
2. **Session compaction** — when OpenCode trims a long session, the slice
   boundary can split a `tool_use` from its `tool_result`, and on auto-compaction
   it can re-fire and wedge the session into a non-recoverable loop.

This is a known, still-unreleased-fix bug. See **Prior art & references** below.

## What this plugin does (two layers)

Think of it as a **seatbelt** and an **airbag**.

1. **Prevent (`experimental.chat.messages.transform`)** — runs before every
   request *and* before compaction, on the exact message array opencode is about
   to convert and send. It's a *pairing-normalization* pass: it mirrors
   opencode's own conversion rules (which tool-part states emit a `tool_use` /
   `tool_result`, and the assistant-error skip), then drops any tool part that
   would emit a `tool_use` with no matching `tool_result` (and any dangling
   result). It **never fabricates tool output** — it only removes provably
   unpaired members, so it can't feed the model fake results. The pass is
   idempotent and order-independent, so it's correct no matter where it runs
   relative to other plugins. This closes the genuinely-unpaired classes
   (interrupted/aborted turns, and any future opencode regression where a state
   stops emitting its counterpart).

2. **Recover (`event` → `session.error`)** — if an orphan still reaches Anthropic
   and it returns the `400`, the plugin parses the offending `toolu_` ids out of
   the error, finds the message that actually holds that orphaned `tool_use`, and
   reverts to that turn's clean boundary (the nearest preceding user message) so
   the orphan is excluded from the next send. A **per-orphan-id state machine**
   acts once per distinct orphan and **hard-stops with an actionable toast** if
   the same orphan recurs after it acted — so you never sit in a silent `400`
   loop again. Reverts are reversible with `/unrevert`.

> **Why two layers?** The post-compaction reorder class of orphan is created
> *inside the AI-SDK message conversion*, downstream of the prevention hook, so
> prevention can't always reach it. The recover layer is the real safety net for
> that class; prevention covers everything reachable before conversion.

## Install

### Option A — one line (recommended)

Add the package to the `plugin` array in your OpenCode config
(`~/.config/opencode/opencode.json` or your project's `opencode.json`):

```jsonc
{
  "plugin": [
    "opencode-compaction-guard@latest"
  ]
}
```

Restart OpenCode. Done.

### Option B — manual (no npm)

Download [`plugin/compaction-tool-pair-guard.js`](plugin/compaction-tool-pair-guard.js)
into your global plugin folder:

```bash
mkdir -p ~/.config/opencode/plugin
curl -fsSL https://raw.githubusercontent.com/viiqswim/opencode-compaction-guard/main/plugin/compaction-tool-pair-guard.js \
  -o ~/.config/opencode/plugin/compaction-tool-pair-guard.js
```

Restart OpenCode. It loads automatically — no config changes needed, and it
applies to every project and every worktree.

> **The file extension must be `.js` (or `.ts`).** OpenCode's local-plugin
> directory scanner only picks up `.js`/`.ts` children of `~/.config/opencode/plugin/`
> — a `.mjs` file (this plugin's name before v1.1.1) sits there silently
> unloaded, with no error anywhere. If you installed an older version this way,
> re-download with the command above and delete the old `.mjs` copy.

## How do I know it's working?

OpenCode captures the plugin's `console.log` output. When it acts you'll see
lines prefixed `[compaction-tool-pair-guard]`, e.g.:

```
[compaction-tool-pair-guard] dropped 1 unpaired tool part(s) before request
[compaction-tool-pair-guard] detected orphaned tool_use error in <session> (ids: toolu_...)
[compaction-tool-pair-guard] reverted to <id> to recover session <id>
[compaction-tool-pair-guard] orphan(s) toolu_... recurred after recovery in <session>; stopping
```

…and the recovery path also pops a toast: **"Session recovered."**

## Known limitations (read this)

- The **prevent** layer covers everything that's unpaired *before* opencode's
  message conversion: interrupted/aborted turns and any unpaired tool part in the
  array it's handed. Note opencode already pairs `pending`/`running` parts itself
  during conversion, so prevention's real job is the genuinely-orphaned parts and
  future regressions — not the common interrupted case opencode already handles.
- The pure *post-compaction reorder* orphan class is created **inside the AI-SDK
  message conversion, downstream of the prevention hook**, so prevention can't
  always stop it. For that class the **recover** layer is the safety net: it
  reverts to the orphan turn's clean boundary and **hard-stops** (with a toast)
  if the same orphan recurs, so you never loop on a silent `400` again.
- **Recovery is not free.** Reverting to the orphan's turn boundary drops that
  turn and everything after it from the active context (reversible with
  `/unrevert`). It unwedges the session; it does not losslessly preserve the
  failed tail.
- This is a **stopgap, not the upstream fix.** The real fix belongs in
  OpenCode's message-conversion / compaction logic. Track
  [anomalyco/opencode#27594](https://github.com/anomalyco/opencode/issues/27594).
  When a release ships the fix, you can remove this plugin.

## Compatibility

- Built against the `@opencode-ai/plugin` `1.3.x` hook API; uses only stable
  public hooks (`event`, `experimental.chat.messages.transform`) and SDK methods
  (`session.messages`, `session.revert`, `tui.showToast`).
- Most relevant to **Anthropic / Claude** models, which enforce strict
  `tool_use`/`tool_result` pairing. Harmless on other providers.

## Prior art & references

This plugin packages and combines approaches already identified by the
community — credit to those investigations:

- The "convert pending/running tool calls to error results" heal is essentially
  the approach in **[anomalyco/opencode#8497](https://github.com/anomalyco/opencode/issues/8497)**.
- The "revert on `session.error`" recovery was described in a comment on
  **[anomalyco/opencode#1662](https://github.com/anomalyco/opencode/issues/1662)**.
- Root-cause analysis of the compaction slice / auto-retrigger:
  **[#27594](https://github.com/anomalyco/opencode/issues/27594)**,
  **[#14367](https://github.com/anomalyco/opencode/issues/14367)**,
  **[#17065](https://github.com/anomalyco/opencode/issues/17065)**,
  **[#21326](https://github.com/anomalyco/opencode/issues/21326)**,
  **[#10616](https://github.com/anomalyco/opencode/issues/10616)**.

## License

[MIT](LICENSE)
