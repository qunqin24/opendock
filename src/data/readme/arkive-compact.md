# Arkive Compact

[![npm](https://img.shields.io/npm/v/arkive-compact?logo=npm&label=npm)](https://www.npmjs.com/package/arkive-compact)

Lossless context compression for OpenCode.

<p align="center">
  <img src=".github/assets/preview.png" alt="Arkive Compact Preview" />
</p>

## Why

OpenCode's built-in compaction replaces an entire conversation with one summary blob. The user messages, the assistant's reasoning, tool calls, design decisions, and workflow are all flattened into a generic template (Goal, Progress, Key Decisions...). The agent wakes up with amnesia, forced to reconstruct its working state from an abstraction that captured a fraction of what mattered.

Magic Compact takes a different approach: preserve the conversation skeleton, partition eligible old assistant turns into bounded native-history batches, and ask a hidden deny-all summarizer to write one continuation summary per turn. Safety comes from OpenCode's native history conversion, bounded explicit turn indexes, strict global response ordering, exact profitability projection, source revalidation, and non-destructive backup recovery.

## How

Instead of collapsing an entire session into a single generic summary, Magic Compact replaces old assistant turns with validated per-turn continuation summaries while leaving user messages and tool calls in place.

Exact user messages remain in context. Magic Compact resolves the model and variant explicitly configured on OpenCode's native compaction agent plus its live provider limits once; it never silently falls back to the source session model. It estimates ordinary model-visible text with the local tokenizer, charges real file parts and tool attachments as typed media, and estimates `data:` strings embedded in tool values by encoded length without tokenizing their payloads. Selected turns stay chronological and whole, with at most 32 targets per batch, a 400K normal estimated-input target scaled down for smaller models, and at most five independent batches in flight. The fixed 8K reserve covers only non-explicit host, system, and provider overhead. Separately, every batch tokenizes its complete rendered explicit request exactly once, including static instructions, the repeated global index, target JSON, conservative fixed-shape markers and marker injections, exact ordinals and anchors, media counts, punctuation, and any following-halo stop record.

Before batch execution, Magic Compact builds one immutable global orientation index from every complete turn in the effective post-checkpoint source history. This includes eligible targets, opaque existing-summary turns, and the retained complete tail, but excludes an active incomplete turn. Each `{sourceOrdinal, anchor}` entry contains only the stable one-based source-turn position and the escaped first ordinary user-text line capped at 160 characters. Every batch receives the same byte-identical map.

Each batch starts from a fresh complete source fork changed to deny-all permissions. Magic Compact verifies rewritten IDs and history shape, captures the exact retained rewritten IDs, order, roles, parent links, part types, and fork references, deletes every unrelated fork message through OpenCode's message-delete endpoint, then requires that exact retained identity after reload. Native checkpoint artifacts are never used as halos. OpenCode supplies only that batch's retained target and permitted neighboring-halo user, assistant, tool, reasoning, and media history through native conversion. The exact target index remains separate: each entry contains its marker, target ordinal, escaped first ordinary user-text line capped at 300 characters, and expected user-and-assistant inline-image count, plus an optional nonce-bound stop marker on a following halo. The global map provides long-range user-anchor orientation, not distant detailed assistant or tool history. Magic Compact never serializes SDK objects, tool states, assistant traces, data URLs, provider metadata, or encrypted reasoning, and it never manually attaches files. Output packing separately budgets estimated summary and visual-description content plus the mandatory JSON envelope, array/object punctuation, echoed marker/ordinal/anchor fields, `summary` property, and every visual-description record. One JSON response per batch must map every target by exact marker, ordinal, and anchor. All batch responses and exact target-ordinal coverage are validated before backup or source mutation.

Model requests have no local wall-clock deadline. Fork creation, permission update, message isolation, marker injection, abort, deletion, and toast delivery remain bounded. A single turn above the normal target receives a dedicated batch when it fits the hard model-derived limit; otherwise Magic Compact fails before backup with `/magic-trim`-first guidance. A mandatory explicit request or global index that cannot fit fails before fork creation with trim-first/model-capacity guidance. Planning uses a conservative fixed-shape nonce, then generates each real nonce, renders the exact immutable prompt, and checks its normal, hard, halo, usable-input, and output estimates before creating any fork. Batches are planned from the same pre-generation source and remain independent; no generated summary is fed into another batch. The first batch failure stops new admission, every already-active batch is drained, and all active failures are surfaced in deterministic batch order without raw provider payloads. Single-turn output exhaustion requires a model with more output capacity; multi-turn output exhaustion advises a larger `N`. There are no retries, adaptive splitting, per-turn fallbacks, partial writes, or model fallback.

<p align="center">
  <img src=".github/assets/visualization.png" alt="Compaction Comparison" />
</p>

## Features

- Lossless boundary — Preserve exact user messages, native checkpoint safety, source ordering, and retrievable omitted tool I/O instead of flattening history into one recap.
- On-demand compaction overhead — Model summarization happens only when you run `/magic-compact`, not during the normal agentic loop.
- Preserved user messages — Exact requirements and guidance remain visible to the agent, verbatim.
- Smart tool call pruning — Bulky completed tool I/O is replaced with omission notices, with original content cached and retrievable on demand via `read_omitted_content`.
- Recompactable — Run `/magic-compact` again later to compact new turns while preserving prior summaries.
- Trim without summarizing — OpenCode can prune historical tool I/O with `/magic-trim` while preserving assistant responses.
- Bounded native batches — Fresh complete forks are isolated to whole target turns and bounded neighboring halos, then prompted once each with no more than 32 targets and five batches in flight. Every request also receives the same bounded global user-anchor map, while distant assistant and tool detail stays out of the fork. A one-batch fast path occurs naturally when all selected turns fit.
- Native media handling — OpenCode's normal retained-fork conversion carries user files, assistant files, and tool-result attachments as typed media. Magic Compact requires image capability when retained fork content may expose an image. It does not redact, reattach, fetch, resize, OCR, encode media in its prompt, or tokenize data-URL bytes for batch estimates.
- Lossless media persistence — Original user file parts and v3-covered assistant inline image parts remain untouched in the source, backup, API, and exports. New v3 summary envelopes carry a locally built user-then-assistant ordinal/MIME/SHA-256 manifest that remains valid when OpenCode rewrites IDs during forks or recovery. Persisted v2 manifests remain user-only and readable, but their historical `partId` does not override canonical content identity. Tool `state.attachments` stay on OpenCode's native media path and are not added to the persisted manifest. OpenCode's transient message-transform hook validates exact v2/v3 manifest matches and replaces each with a declarative placeholder only when the placeholder is strictly smaller than the original file URL token contribution; otherwise the exact file part stays inline and model-facing. Missing manifests do nothing and mismatches fail closed.
- Useful-savings gate — A turn is replaced only when its exact projected replacement (summary plus the same planned pruning) is strictly smaller than the turn's exact source. Net-negative turns stay byte-identical. If the projected result cannot save at least 20% of the selected profitable turns' eligible removable content, Magic Compact fails unchanged before backup, mutation, or a stats increment instead of claiming weak savings.

## Installation

Install the `arkive-compact` package by adding it to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["arkive-compact@latest"]
}
```

The OpenCode CLI helper is optional:

```bash
opencode plugin arkive-compact --global
```

If OpenCode has cached an older package version, clear it before reinstalling:

```bash
rm -rf ~/.cache/opencode/packages/arkive-compact*

# If you are encountering "No versions available":
NPM_CONFIG_MIN_RELEASE_AGE=0 opencode plugin arkive-compact --global
```

Install `arkive-compact`; run `/magic-compact`, `/magic-trim`, and `/magic-stats`. The distribution rename does not add `/arkive-*` command aliases: the runtime remains Magic Compact.

## Usage

### `/magic-compact`

To compact, run `/magic-compact [N]` with an optional argument indicating how many turns to preserve.

- `N` is the number of recent assistant turns to preserve as-is. Default: `0` (summarize everything).
- A backup session is created before the first source write. Pre-backup failures leave the current source unchanged, and every failure after backup creation preserves both the live source and its named backup for manual recovery.
- Summary generation and the useful-savings projection run before backup creation without mutating the source. A backup still exists before the first durable compaction write.
- From the first summary insertion attempt onward, any failure preserves both the live source and its named backup without selecting either or deleting the live source. The surfaced error names both session IDs for manual recovery, and no successful stats increment is recorded.
- After inserting its own summaries and boundary, Magic Compact revalidates the full source before executing the exact preplanned prune mutations. Unexpected drift preserves both sessions before pruning or accounting writes.

Examples:

- `/magic-compact` — summarize all old assistant turns.
- `/magic-compact 3` — keep the 3 most recent assistant turns, summarize the rest.

### Pending reverts

`/magic-compact` refuses to run while the session has a pending revert left by `/undo`. OpenCode's prompt-time revert cleanup silently deletes the reverted suffix whenever the session is prompted, so Magic Compact fails closed instead of losing content you may still want.

- Want the undone content back? Run `/redo` first to restore it without a model call, then compact.
- Meant to discard it? Let OpenCode finish the revert through its normal flow — the next message you send commits it — then retry.

Magic Compact does not force the cleanup itself: OpenCode exposes no session-serialized or compare-and-swap revert commit, so forcing cleanup could delete messages appended after the revert point.

### `/magic-trim` (Experimental)

Run `/magic-trim [N]` to apply the same tool I/O pruning rules without summarizing or deleting ordinary user and assistant content.

- `N` preserves tool I/O in the most recent assistant turns. Default: `0` (trim all eligible turns).
- Trimming does not call an LLM or create a compaction boundary.
- A backup session is created before trimming.
- Token reductions are included in `/magic-stats` on the exact canonical active-content basis. The ignored trim notice is stored for display but excluded from that model-facing count.

Examples:

- `/magic-trim` — trim eligible tool I/O throughout the session.
- `/magic-trim 3` — preserve tool I/O in the 3 most recent assistant turns.

### `/magic-stats`

Run `/magic-stats` to show cumulative token savings for the current conversation. Net tokens physically pruned and inline-image tokens projected out of model requests are persisted and reported separately, as are their subsequent cache-read savings.

Reported token counts are canonical active-content estimates, not provider usage. Model-facing before/after counts use the same pure manifest projection as OpenCode's request transform, include model-facing synthetic content such as the compaction boundary, exclude ignored user reporting notices including the notice that displays the count, and include ignored assistant text. OpenCode's context meter is a provider usage snapshot and can remain stale after in-place compaction until a later assistant response refreshes it. Magic Compact never mutates provider usage metadata or fabricates an after-provider count.

### The Omitted Content Tool

Magic Compact registers a `read_omitted_content` tool that the agent can call to retrieve any tool input or output that was pruned during compaction or trimming.

Each omission notice in the conversation includes an integrity-protected Content ID such as `2c4f6a8b0d1e:omitted-yH8kQ2pL5vN7sR4tU6wXzA`. The agent uses that ID to fetch the original content when it needs stale information that cannot be reproduced via a new tool call. OpenCode preserves historical v1 bare entries during migration and backup copying, but cannot retrieve them because they have no cryptographic binding. Unavailable or integrity-invalid entries fail closed instead of returning guessed bytes.

## Pruning Rules

During `/magic-compact`, pruning applies only to summarized turns. `/magic-trim [N]` applies only the tool I/O rules to turns outside the preserved tail.

Kept:

- User messages (verbatim)
- User file parts and exact inline image URLs (verbatim in persistence; accepted manifest-covered images are projected only from future model requests)
- Assistant inline image file parts covered by an accepted v3 manifest (verbatim in persistence; projected only from future model requests)
- Per-turn summaries
- Tool calls (structure preserved)
- Selected high-value synthetic messages (shell wrappers, background task results, working-directory change reminders)

Removed or condensed:

- Assistant reasoning, text, and step markers — replaced by the per-turn summary; v3 manifest-covered inline image files stay persisted
- Most synthetic/injected messages (file expansions, plan reminders, prior compaction notices, etc.)
- Bulky completed tool I/O — replaced with an omission notice pointing to the cache

### Tool I/O Rules

Completed tool outputs over 128 words or 1024 characters are omitted by default. A few tools have special handling.

- `read` — output always omitted (stale file contents are reloadable)
- `write` / `edit` / `apply_patch` — large file content omitted
- `bash` — commands over 1024 characters are truncated
- `task` — output omitted above a higher threshold (512 words / 4096 characters)
- `question` — input and output preserved
- `todowrite` / `skill` — output discarded without caching (redundant or reloadable)

Pending, running, and errored tool calls are always preserved as-is.

Completed tool calls processed by pruning are marked so later trim and compaction operations do not trim them again.

## Vs DCP Plugin (OpenCode)

OpenCode-DCP is a runtime context management system that rewrites messages when requested by the model. Magic Compact takes a different approach.

Magic Compact Offers:

- Simplicity — One command, zero configuration.
- Lossless quality — Turn-by-turn flow stays intact. All user commands are preserved. All past tool calls are preserved.
- Maximum token savings — Old assistant prose is represented once in a validated per-turn summary, reasoning is removed, and long completed tool I/O is aggressively pruned. Net-negative turns remain unchanged.
- No cache churn — Compaction happens once and is cache friendly, whereas DCP may invalidate entire conversations multiple times within one request.
- Zero assistant overhead — No prompt injections asking the assistant to compact. Your assistant stay focused on its task.

If you want runtime model-driven compaction initiated by the assistant rather than explicit user-driven compaction, consider using DCP instead.

## Vs Magic Context (OpenCode)

Magic Context is a much broader runtime context-management system: it runs background historian and dreamer processes, maintains project memory, and injects recalled memories and history back into the prompt on an ongoing basis. That makes it powerful, but also much heavier in tokens and cache churn.

Magic Compact Offers:

- Efficiency — One explicit compaction command, no background summarization loop, no always-on memory RAG, and no recurring prompt injections.
- Lower token burn — Context reduction happens once on demand instead of continuously consuming tokens across every turn.
- Fewer cache invalidations — The session is rewritten once, then stays stable, instead of repeatedly re-rendering volatile background state.
- Lossless conversation shape — User messages stay verbatim, tool structure is preserved, ordered continuation summaries remain in place, and omitted tool I/O remains retrievable. Assistant prose is never stored in the omission cache.
- Focused compaction — The plugin does one job: compress the conversation without turning the runtime into a memory subsystem.

If you want a lightweight, user-driven compaction tool with minimal ongoing overhead, Magic Compact is the better fit. If you want a full long-term memory system with background maintenance, Magic Context is the heavier alternative.

## License

Arkive Compact is a modified distribution of [Magic Compact](https://github.com/aerovato/magic-compact). Original Magic Compact remains under the BSD 3-Clause License; the required notice is in [`NOTICE.md`](./NOTICE.md). This repository's modifications and packaging are not licensed. See [`LICENSE.md`](./LICENSE.md).

## Development

See [`docs/Development.md`](./docs/Development.md) for setup and maintenance commands.
