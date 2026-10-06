# 🗜️ opencode-jev-context-compactor

<p>
  <img alt="status: beta" src="https://img.shields.io/badge/status-beta-orange">
  <a href="https://www.npmjs.com/package/opencode-jev-context-compactor"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-jev-context-compactor?color=blue&include_prereleases"></a>
  <img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="OpenCode v2" src="https://img.shields.io/badge/OpenCode-v2%20(2.0.21%2B)-111">
  <img alt="scored by Jev" src="https://img.shields.io/badge/scored%20by-Jev-9b59b6">
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A5%2022-brightgreen">
</p>

> ⚠️ **Beta (`0.1.x`).** Behaviour and configuration may change. Best-effort, **no support promise** —
> [open an issue](https://github.com/theOnlyBoy/opencode-jev-context-compactor/issues) rather than expect an SLA.

> Context compression for OpenCode **v2**, scored by [Jev](https://docs.typesafe.ai). **Jev judges, the
> code acts**: drop stale tool calls, truncate the rest, drop unnecessary prose, keep surviving words
> **verbatim** — no summariser.

## 🧠 Why

OpenCode v2 will summarise your context and quietly lose the detail that mattered. This plugin does the opposite
for the parts that *can* be judged: it decides which tool calls and which older prose still count, keeps
the rest verbatim, and only ever trims the **outgoing request** — stored history is never rewritten
behind your back.

## ⚡ What it does

Two levers, both driven by Jev:

- **`context` hook — request pruning (default).** Prunes the **outgoing request** (non-destructive):
  - **Tool calls/results** — Jev scores staleness; stale calls are dropped, bulky results truncated.
  - **Prose** — on a manual `/compress`, Jev is asked per older prose message *"is this unnecessary?"*
    (`noul` probability ≥ `0.7`) and the unnecessary ones are dropped.
  - Pruning runs **only when forced** — a manual `/compress`/`compress` tool call, or when the context
    reaches `autoAtPercent` of `contextLimitTokens`. Normal turns are untouched.
- **`compaction` hook — stats checkpoint.** When Jev actually compresses something during v2's own
  compaction, it hands v2 a stats summary instead of letting v2 summarise; otherwise v2's own
  continuation summary stands.

Plus two ways to trigger it:

- **Model-callable `compress` tool** (`ctx.tool.transform`) — the agent can compress when it judges the
  context is large.
- **TUI `/compress` command** (and the palette) — you force it.

## 📊 Where the stats show

- **Chat** — on a forced compression with a gain, a message:
  ```
  ▣ Jev Context Compactor | -49% · -4.1K removed, 3.2K left
  → kept 0 calls, truncated 1 results
  → ░░▓▓▓░░░░░░░░░░░  385ms · judgement
  ```
  The `▓/░` bar marks **where in the conversation** content was compressed. (v2 has no silent chat
  surface, so this message is model-visible.)
- **Sidebar** — a per-session list, newest first (`• -49% 4.1K→3.2K` + time), collapsible.
- **Toasts** — `compressing…`, the result header, or `nothing to compress`.

## 🔄 How it works

1. A request comes in; the `context` hook maps `input.messages` to the engine's shape.
2. **Facts first** — calls whose target (path/command/id) appears in later prose are pinned in code, no
   model call (strategies below).
3. Jev judges the remainder; the engine decides drop-call / drop-result / keep.
4. Decisions are applied to the **request view**; history is untouched.
5. Any error, missing key, or sub-threshold reduction → stand down (fail-open).

## 🧷 Deletion policy

A model answer may only **truncate**; only deterministic evidence may **delete**:

- `superseded` — an earlier call to the same target (path / command / url / id) as a later one.
- `error-resolved` — an earlier errored call, followed by a success on the same target.

The recent tail (`preserveRecentMessages`) and `protectedTools`/`protectedFiles` are never touched. A
manual `/compress` shrinks the protected window to `0` and judges with `judgement` (no reference-pinning),
so it can compress everything you asked it to.

## 🧭 Strategies

`factsFirst` (default) → `judgement` → `deterministic` → `auto`. Facts-first pins referenced calls with
no model call; `judgement` asks Jev about every call; `deterministic` truncates the rest locally without
a model. A manual compress uses `judgement`.

## ⚙️ Config

Precedence: plugin `options` (v2 config) → env → defaults.

| option | env | default | meaning |
|---|---|---|---|
| `model` | — | `jev-1.13.0` | Jev model |
| `strategy` | — | `factsFirst` | `judgement` \| `factsFirst` \| `deterministic` \| `auto` |
| `keepThreshold` | `FAST_JEV_KEEP_THRESHOLD` | `0.15` | keep probability threshold |
| `preserveRecentMessages` | `FAST_JEV_PRESERVE_RECENT` | `10` | recent tail never touched |
| `minResultChars` | — | `4000` | below this, no compaction (fail-open) |
| `autoAtPercent` | — | `60` | auto-prune when context use ≥ this % |
| `contextLimitTokens` | — | `128000` | used for the % estimate |
| `minReductionRatio` | `FAST_JEV_MIN_REDUCTION` | `0.1` | below this, stand down |
| `prune` | `FAST_JEV_PRUNE` | `true` | enable request pruning |
| `summaryStyle` | — | `minimal` | `minimal` \| `stats` \| `outline` \| `verbatim` |
| `protectedTools` / `protectedFiles` | — | — | globs never touched |
| `timeoutMs` | — | `30000` | Jev request timeout |

## 🧩 Install

Install the **beta** from npm:

```sh
npm i opencode-jev-context-compactor@beta
```

Then enable it in `opencode.jsonc`:

```jsonc title="opencode.jsonc"
{
  "plugins": ["opencode-jev-context-compactor"]
}
```

Needs `TYPESAFE_API_KEY` in the environment (BYOK). No key → the plugin is inert (fail-open).

## 🔬 Develop

```sh
npm install
npm run build     # tsc → dist/
npm test          # policy · mapper · facts · cache · prose · manual · config
npm run demo      # offline, deterministic
```

## 🧪 Status, issues & PRs

This is a **beta**: APIs, config keys, and behaviour can change between `0.1.x` releases, and support is
**best-effort with no SLA**. Bug reports and small PRs are welcome.

- **Report a bug / request a feature:** [open an issue](https://github.com/theOnlyBoy/opencode-jev-context-compactor/issues/new/choose)
- **Existing issues:** <https://github.com/theOnlyBoy/opencode-jev-context-compactor/issues>
- **Pull requests:** <https://github.com/theOnlyBoy/opencode-jev-context-compactor/pulls> — small and focused, with `npm test` green.

See `CONTRIBUTING.md` before sending code.

## 🙏 Prior art & licence

Built on the vendored `fast-jev-compaction` engine (MIT) by
[tamaratran](https://github.com/tamaratran/fast-jev-compaction), via the v1 adapter. The engine is
byte-identical; only the adapter and the v2 message mapper are new. See
`src/vendor/fast-jev-compaction/LICENSE`. MIT — see `LICENSE`.
