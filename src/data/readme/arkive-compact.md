# Arkive Compact

[![npm](https://img.shields.io/npm/v/arkive-compact?logo=npm&label=npm)](https://www.npmjs.com/package/arkive-compact)

Lossless context compression for OpenCode.

<p align="center">
  <img src=".github/assets/preview.png" alt="Arkive Compact Preview" />
</p>

## Why

OpenCode's built-in compaction replaces an entire conversation with one summary blob. The user messages, the assistant's reasoning, tool calls, design decisions, and workflow are all flattened into a generic template (Goal, Progress, Key Decisions...). The agent wakes up with amnesia, forced to reconstruct its working state from an abstraction that captured a fraction of what mattered.

Magic Compact takes a different approach: preserve the conversation skeleton, give each eligible old assistant turn its own bounded native-history generation request, and ask a hidden summarizer to write that turn's continuation summary while denying its operational tools. OpenCode injects the side-effect-free `StructuredOutput` response tool for the JSON-schema request and returns its response on assistant `info.structured`; the fork's ordered session rule allows that one host tool after denying the rest. Safety comes from OpenCode's native history conversion, bounded explicit turn indexes, strict global response ordering, exact profitability projection, at-rest source checks, and a new successor session that leaves the original session untouched.

## How

Instead of collapsing an entire session into a single generic summary, Magic Compact replaces old assistant turns with validated per-turn continuation summaries while leaving user messages and tool calls in place.

Exact user messages remain in context. Magic Compact resolves the model and variant you configure on its own `magic-compact-summarizer` agent plus its live provider limits once; it never falls back to the source session model or OpenCode's native compaction agent. It estimates ordinary model-visible text with the local tokenizer, charges real file parts and tool attachments as typed media, and estimates `data:` strings embedded in tool values by encoded length without tokenizing their payloads. Selected turns stay chronological and whole, with exactly one target turn per generation request, a 400K normal estimated-input target scaled down for smaller models, and at most five independent requests in flight. The fixed 8K reserve covers only non-explicit host, system, and provider overhead. Separately, every batch tokenizes its complete rendered explicit request exactly once, including static instructions, the repeated global index, target JSON, conservative fixed-shape markers and marker injections, exact ordinals, media counts, and punctuation.

Each selected turn requires a fresh full-source fork and isolation, plus a request that repeats the fixed instructions, response schema, global index, and any optional preceding turn. Long histories therefore increase both model input and control work for copying, verifying, isolating, and deleting forks. Each fork is populated by one host replay of the planned history rather than the host's native copy, so that work grows with the stored message and part count, and each fork rereads the source once to confirm it has not changed. The repeated index cost grows with both the number of selected targets and the number of indexed turns.

Before batch execution, Magic Compact builds one immutable global orientation index from every complete turn in the effective post-checkpoint source history. This includes eligible targets, opaque existing-summary turns, and the retained complete tail, but excludes an active incomplete turn. Each `{sourceOrdinal, anchor}` entry contains only the stable one-based source-turn position and the escaped first ordinary user-text line capped at 160 characters. Every batch receives the same byte-identical map.

Each batch starts from a fresh complete source fork with an ordered session rule that denies every operational tool and then allows the injected `StructuredOutput` response tool. OpenCode 1.18.30 still resolves the final model tool map through the merged agent-and-session rules, where the last matching rule wins, so the trailing allow is what keeps the host response tool. Magic Compact verifies rewritten IDs and history shape, captures the exact retained rewritten IDs, order, roles, parent links, part types, and fork references, deletes every unrelated fork message through OpenCode's message-delete endpoint, then requires that exact retained identity after reload. Native checkpoint artifacts are never used as halos. OpenCode supplies only that batch's retained target and permitted preceding-turn user, assistant, tool, reasoning, and media history through native conversion; later turns never enter the request. The exact target index remains separate: each entry contains its marker, target ordinal, and expected user-and-assistant inline-image count. The global map provides long-range user-anchor orientation, not distant detailed assistant or tool history. Magic Compact never serializes SDK objects, tool states, assistant traces, data URLs, provider metadata, or encrypted reasoning, and it never manually attaches files. Output packing separately budgets estimated summary and visual-description content plus the mandatory JSON envelope, array/object punctuation, echoed marker/ordinal fields, `summary` property, and every visual-description record. Each request's JSON response must contain exactly one result carrying its target's exact marker and ordinal. All batch responses and exact target-ordinal coverage are validated before any successor session is created.

Fork creation and model requests have no local wall-clock deadline, so Magic Compact retains ownership of every generation fork even when OpenCode takes longer than 30 seconds to clone a session. Permission updates, message isolation, marker injection, and toast delivery remain bounded. Once a fork exists, provider or validation failure abort and fork deletion are command-owned and awaited; every started batch drains through cleanup before the command settles. A turn above the normal target is still planned when it fits the hard model-derived limit; otherwise Magic Compact fails before creating a successor, with `/magic-trim`-first guidance. A mandatory explicit request or global index that cannot fit fails before fork creation with trim-first/model-capacity guidance. Planning uses a conservative fixed-shape nonce, then generates each real nonce, renders the exact immutable prompt, and checks its normal, hard, halo, usable-input, and output estimates before creating any fork. Batches are planned from the same pre-generation source and remain independent; no generated summary is fed into another batch. The first batch failure stops new admission, every already-active batch is drained, and all active failures are surfaced in deterministic batch order without raw provider payloads. Output exhaustion requires a model with more output capacity, because every request already covers a single turn. Magic Compact makes one `session.prompt` call per fork and adds no plugin-level retry, adaptive splitting, per-turn fallback, partial writes, or model fallback. OpenCode may apply its runtime provider/transport retry policy or additional model steps required by structured-output processing.

<p align="center">
  <img src=".github/assets/visualization.png" alt="Compaction Comparison" />
</p>

## Features

- Lossless boundary — Preserve exact user messages, native checkpoint safety, source ordering, and retrievable omitted tool I/O instead of flattening history into one recap.
- On-demand compaction overhead — Model and retention-backend calls happen only when you run `/magic-compact` or `/magic-trim`, not during the normal agentic loop.
- Preserved user messages — Exact requirements and guidance remain visible to the agent, verbatim.
- Smart tool call pruning — Bulky completed tool I/O is replaced with compact recovery references, with original content cached and retrievable on demand via `read_omitted_content`.
- Recompactable — Run `/magic-compact` again later to compact new turns while preserving prior summaries.
- Trim without summarizing — OpenCode can prune historical tool I/O with `/magic-trim` while preserving assistant responses.
- Task-aware retention — Before `/magic-compact` or `/magic-trim` changes a tool call, a decision backend (TypeSafe Jev by default, or the OpenAI Decisions API) judges whether its content is likely to help the current task. Calls it is confident about are kept whole for that run; the rest follow the normal pruning rules. `--heuristic` on either command skips this step; `/magic-compact --heuristic` still summarizes your turns with the summarizer model.
- Bounded native batches — Fresh complete forks are isolated to whole target turns and a bounded preceding turn, then prompted once each with exactly one target turn and at most five requests in flight. Every request also receives the same bounded global user-anchor map, while distant assistant and tool detail stays out of the fork. Selecting more turns means more requests and more repeated request input.
- Native media handling — OpenCode's normal retained-fork conversion carries user files, assistant files, and tool-result attachments as typed media. Magic Compact requires image capability when retained fork content may expose an image. It does not redact, reattach, fetch, resize, OCR, encode media in its prompt, or tokenize data-URL bytes for batch estimates.
- Lossless media persistence — Original user file parts and v3-covered assistant inline image parts remain untouched in the original session, the successor, the API, and exports. New v3 summary envelopes carry a locally built user-then-assistant ordinal/MIME/SHA-256 manifest that remains valid when record IDs are rewritten for a fork or successor. Persisted v2 manifests remain user-only and readable, but their historical `partId` does not override canonical content identity. Tool `state.attachments` stay on OpenCode's native media path and are not added to the persisted manifest. OpenCode's transient message-transform hook validates exact v2/v3 manifest matches and replaces each with a declarative placeholder only when the placeholder is strictly smaller than the original file URL token contribution; otherwise the exact file part stays inline and model-facing. Missing manifests do nothing and mismatches fail closed.
- Model-written image descriptions — The summarizer describes each inline image in a summarized turn, and later model requests rely on that description wherever the image is projected out. Magic Compact checks that every image has a description and that the stored images still match the manifest, but it cannot check that a description is accurate, and live runs have seen the summarizer misdescribe a simple test image. The original images stay stored in the original session and the successor. See `docs/Core.md` for the limits.
- Useful-savings gate — A turn is replaced only when its exact projected replacement (summary plus the same planned pruning) is strictly smaller than the turn's exact source. Net-negative turns stay byte-identical. If the projected result cannot save at least 20% of the selected profitable turns' eligible removable content, Magic Compact fails before creating a successor or a stats increment instead of claiming weak savings.

## Installation

Arkive Compact supports OpenCode 1 (1.18.30 and later 1.x releases) and OpenCode 2 (2.0.28) from the same package. On OpenCode 1, install the `arkive-compact` package by adding it to your OpenCode config, together with a model for the plugin's summarizer agent:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["arkive-compact@latest"],
  "agent": {
    "magic-compact-summarizer": {
      "model": "openai/gpt-5.1",
      "variant": "low"
    }
  }
}
```

The plugin registers `magic-compact-summarizer` as a hidden subagent with its own prompt and a deny-all tool rule, and keeps the `model` and optional `variant` you set. Every per-turn summary and every temporary retention summary uses that model unless you add `--match-model` (see [Reasoning-aware summaries](#reasoning-aware-summaries)). There is no fallback: without a configured model, compaction and task-aware retention fail with setup guidance. Pick a model whose context window fits your longest single turn.

The OpenCode 1 TUI loads its own plugins from `tui.json`, not from `opencode.json`. List the package there too so every TUI still showing a compacted or trimmed session opens its successor automatically; without it the commands still work and name the successor:

```json
{
  "$schema": "https://opencode.ai/tui.json",
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

### HTTP listener

On OpenCode 1, `/magic-compact`, `/magic-trim`, `/magic-recover`, and `/magic-stats` talk to OpenCode through its public HTTP API, so OpenCode must be running with a listener:

```bash
opencode --port 0          # TUI with a listener on a free local port
opencode serve --port 4096 # or a headless server; connect with `opencode attach`
```

Without `--attach`, `opencode run` uses an embedded server even when given `--port`, so for scripted use start `opencode serve` and pass its URL to `opencode run --attach`.

Before writing anything, the plugin proves that the listener belongs to the same OpenCode instance. It registers a disabled, per-process agent entry carrying a random value and requires the listener's config to return that value. A plain `opencode` run without `--port` has no listener of its own, and another instance may own the default port, so the commands refuse with startup guidance instead of guessing. If the server uses basic auth, set `OPENCODE_SERVER_PASSWORD` (and `OPENCODE_SERVER_USERNAME` when it is not `opencode`) in the server environment.

### OpenCode 2

On OpenCode 2, list the package under `plugins` and define the summarizer agent yourself; OpenCode 2 plugins can update an agent but not create one:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["arkive-compact"],
  "agents": {
    "magic-compact-summarizer": { "model": "openai/gpt-5.1#low" },
  },
}
```

The plugin turns that agent into a hidden subagent with its own prompt and a deny-all permission rule, and keeps your model and variant. Without the agent or its model, compaction and task-aware retention fail with setup guidance.

`/magic-compact`, `/magic-trim`, and `/magic-recover` need this server's HTTP API, because OpenCode 2 gives plugins no session transfer or history APIs. The plugin uses OpenCode's registered background service, which the OpenCode 2 TUI and `opencode run` use by default (`opencode serve --service` starts it headless). A private server (`opencode run --standalone`) is not supported. To use a standalone `opencode serve` listener instead, pass its URL as the `serverUrl` option and export `OPENCODE_SERVER_PASSWORD` (and `OPENCODE_SERVER_USERNAME` when it is not `opencode`) in the server environment:

```jsonc
{
  "plugins": [
    {
      "package": "arkive-compact",
      "options": { "serverUrl": "http://127.0.0.1:4096" },
    },
  ],
}
```

Before any read or write, the plugin requires the endpoint to report its own process ID and the same source session as the plugin context, and refuses otherwise. It never guesses a port or starts a service.

What differs on OpenCode 2:

- Commands report their result as the command's error message, which OpenCode 2 returns to the client; there are no progress toasts. Every TUI still showing the original session opens a ready successor and shows the outcome as a toast. The outcome is also stored on the successor in `metadata.magicCompact.outcome`, and `/magic-stats` returns its summary as the command message.
- The successor copies the original's active instruction entries and leaves out the host's old instruction-change notices, which describe changes against the original's history. User messages and all other records are copied unchanged.
- Summaries are stored in the first assistant message of each summarized turn, with the summary metadata on that message. Inline user images stay stored unchanged; once summarized, a request that replays the summary and its images sends a short placeholder in their place when that is smaller. A request that replays history from before the session's latest native compaction (after a switch to a model the compaction's provider checkpoint does not serve) needs the server's HTTP API to read the complete history; without it that request is refused rather than sent with the summarized images inline. Compaction refuses before any model request when the summarizer would not receive every image it must describe: a model without image input, an image type the provider does not accept, malformed image data, or more than OpenCode's 25 MiB of image data in one request.
- OpenCode 1 and OpenCode 2 sessions keep separate omission caches and stats; nothing is migrated between hosts.

### Task-aware retention setup

Task-aware retention asks a decision backend whether each tool call is likely to help the current task. There are two backends, each pinned to one model:

| Backend            | Service and model                  | Key variable                             |
| ------------------ | ---------------------------------- | ---------------------------------------- |
| `jev` (default)    | TypeSafe Jev `jev-1.13.0`          | `TYPESAFE_API_KEY`                       |
| `openai-decisions` | OpenAI Decisions API, `gpt-6-luna` | `MAGIC_COMPACT_OPENAI_DECISIONS_API_KEY` |

Set the selected backend's key in the environment of the OpenCode server process, which is the process that loads plugins:

```bash
export TYPESAFE_API_KEY=...                         # jev, the default
export MAGIC_COMPACT_OPENAI_DECISIONS_API_KEY=...   # openai-decisions
```

The backend is chosen per command: `--backend jev` or `--backend openai-decisions` on `/magic-compact` or `/magic-trim` wins, then `MAGIC_COMPACT_RETENTION_BACKEND` in the server environment, then `jev`. Existing setups therefore keep using Jev unchanged. To make OpenAI Decisions the default for both commands:

```bash
export MAGIC_COMPACT_RETENTION_BACKEND=openai-decisions
```

The variable takes exactly `jev` or `openai-decisions`, with surrounding spaces ignored. Any other value, including an empty one, fails the command before any summary or provider request, and the message lists the accepted names; `--backend` on the command overrides it without reading it. Setting only `MAGIC_COMPACT_OPENAI_DECISIONS_API_KEY` does not switch the backend. The plugin reads only the selected backend's key, never loads a `.env` file, and never falls back from one backend to the other or to `--heuristic`. `MAGIC_COMPACT_OPENAI_DECISIONS_API_KEY` must be a plain OpenAI API key; OpenCode's ChatGPT sign-in is not used. A generic `OPENAI_API_KEY` is never read, so setting it neither supplies the key nor selects the backend.

Restart the OpenCode server process after setting a variable; restarting an attached TUI does not reload the environment. Without the selected key, `/magic-compact` and `/magic-trim` fail without changing anything whenever they find a tool call to evaluate, before the retention summary is generated, and suggest your own command with `--heuristic`: `/magic-trim --heuristic` trims by the rules below without any model or backend call, and `/magic-compact --heuristic` skips only retention and still summarizes your turns. A command with nothing to evaluate needs no key.

Retention uses the summarizer agent's model: it first generates a temporary whole-session summary on a fork, then sends one excerpted tool call at a time to the selected backend, with at most four requests in flight, a 30-second limit per request and only two retries: an OpenAI Decisions HTTP 503 is resent unchanged up to twice per tool call after a short wait, and `--truncate` (below) shortens a token-limit refusal once. Every first request carries that whole summary, so the full summary text goes to the selected provider with each tool call; OpenAI Decisions receives the same request state as a JSON string, and the question under an opaque name rather than a session or part ID. The backend changes only who makes the keep judgment: the summary still comes from the summarizer model, within that model's context budget. No retention model calls occur when there are no candidates. In the real-session evaluation, native summary generation took 10.1 to 17.8 seconds including fork and cleanup; Jev added 0.96 to 1.59 seconds for 16 to 24 candidates. Those are measurements from one environment, not latency guarantees, and no comparable OpenAI Decisions measurement exists.

The default keep threshold is `0.60` for both backends. The operator chose it on 2026-10-18 after a development study of Jev on one real session. It is not a held-out or native-summary calibration, and it was not calibrated for OpenAI Decisions, whose probabilities need not mean the same as Jev's; the earlier `0.80` was the threshold frozen for the September held-out evaluation. Each call is judged independently for likely reuse of concrete input or output: useful duplicates, recoverable content, still-relevant procedures and unchanged useful content in partly edited reads can qualify. Uncertainty follows the pruning rules. The session summary is sent whole. User request text and tool content are excerpted by fixed JSON-byte allocations: latest request 5,000, originating request 600, input 3,000 and output 9,000; short input fields up to 200 bytes stay whole when they fit. A keep retains the whole current call, without a size cap or persistent pin. See [the evaluation](docs/RetentionEvaluation.md) for the 144-case protocol, the development study behind `0.60`, the whole-summary study, observed results and limitations.

Each backend enforces its own token limits. TypeSafe documents Jev's as 32K tokens for the state plus any one question and 64K for the state plus all questions. OpenAI publishes no request size limit for Decisions; a test on 2026-10-23 accepted a request of 677,677 input tokens and refused one with a 4 MiB summary. When a summary is long enough that a request goes over the limit, the backend refuses it and the command stops with a message that says so: the original session is unchanged and no retention decisions were applied. The message suggests two ways forward, repeating the command you ran with your own `N`, `--threshold` and the backend you chose: the same command with `--truncate`, which retries each refused call once with a shorter summary, or with `--heuristic`, which skips task-aware keep protection (`/magic-trim --heuristic` then makes no model call, while `/magic-compact --heuristic` still summarizes your turns). When the whole summary already fits the 8,000-byte excerpt, a shorter summary does not exist, so the message offers only `--heuristic`. `--threshold` does not make the request smaller. No other retry or fallback happens on its own. For Jev, a request body above TypeSafe's 32 MiB limit is refused before anything is sent and suggests only `--heuristic`; `--truncate` does not get around it. An OpenAI Decisions refusal to answer a question, a reply from another model, a redirect or any other error also stops the command with no decisions applied, apart from the OpenAI Decisions 503 retry above, which ends the same way if it runs out.

To use a different threshold, set `MAGIC_COMPACT_KEEP_THRESHOLD_PERCENT` in the same server environment. The value is a plain decimal percent from 0 to 100 without a `%` sign, for example `60`, `70` or `60.5`; a call is kept when the probability is at or above it. The default needs no variable, so leave it unset to keep `0.60`.

```bash
export MAGIC_COMPACT_KEEP_THRESHOLD_PERCENT=70
```

The server reads the variable each time a command runs, so the value must be in the environment of the OpenCode server process. When that process runs as a service, such as under systemd, set the variable in the service's environment and restart the service after changing it; an attached shell's exports do not reach it. `/magic-compact` and `/magic-trim` use the same value on OpenCode 1 and OpenCode 2. An invalid value (empty, `60%`, above 100, not a number) fails the command before any summary or backend request and before any session change, and the message names the variable. `--threshold P` on `/magic-compact` or `/magic-trim` sets the threshold for that command instead and does not read the variable, so it also works while the server value is invalid. `--heuristic` does not read it either.

Install `arkive-compact`; run `/magic-compact`, `/magic-trim`, `/magic-recover`, and `/magic-stats`. The distribution rename does not add `/arkive-*` command aliases: the runtime remains Magic Compact.

Compact and trim show a long-lived view-only progress toast while they run, then send terminal success, no-op, or failure feedback. If a timed-out progress delivery later settles, Magic Compact best-effort reasserts the terminal toast. Progress feedback does not add conversation history, model input, stats, or omission-cache entries, and toast delivery failure does not change the command or recovery outcome. A host-side delivery after the client promise has rejected cannot be detected.

A failure toast (`Magic Compact Failed`, `Magic Trim Failed` or `Magic Recover Failed`) says what stopped the command. Most of the plugin's own messages also say what happened to the original session and what to do next; a plain argument error says only what the argument must be. On OpenCode 1 that includes failures before any session work: a bad argument (a bad `--threshold` or `--backend` value names its flag), an invalid `MAGIC_COMPACT_KEEP_THRESHOLD_PERCENT` or `MAGIC_COMPACT_RETENTION_BACKEND`, or a listener the plugin cannot verify. The toast stays up for 50 ms per character of its text, at least 8 seconds. When a successor step failed, a `Details:` line gives the stage and, when known, the HTTP status and system error code; quote it when you report a problem. A candidate session that was kept is named as kept, with the note that this run did not mark it ready (another writer may have), so inspect or delete it rather than continue in it. When several summary requests fail, the message lists up to three distinct reasons once each, then every temporary session or partial fork it could not delete, so you can delete them yourself. Magic Compact shows only messages it wrote for this purpose. Any other error, including one from a dependency, is shown only as an unexpected error with its HTTP status or system error code; the OpenCode server log has the original. On OpenCode 2 the same text is the command error.

## Usage

### `/magic-compact`

To compact, run `/magic-compact [N] [--backend jev|openai-decisions] [--threshold P] [--truncate] [--match-model]` or `/magic-compact [N] --heuristic [--match-model]`. Arguments go in any order, each at most once, and mean what they mean for [`/magic-trim`](#magic-trim-experimental).

- `N` is the number of recent request turns to preserve whole. A request turn is one user request plus every assistant message and tool call that follows it until the next user request, so a single preserved turn can hold a large share of the context. Default: `0` (summarize everything, including the most recent complete turn). A trailing user request with no assistant reply is never counted.
- Success feedback and the ignored compaction notice report how many request turns were summarized, how many whole turns `N` preserved, and a retention line (see `/magic-trim`) that names the mode, the backend and model, the threshold that applied and the kept calls. The no-op message also states the preserved turns whenever `N` kept any, as when `N` covers every eligible turn; run `/magic-compact 0` to include them.
- The notice reports `Stored history (estimate)`: canonical counts of the whole stored session. A session with a native checkpoint stores a prefix that OpenCode does not send to the model, so these totals include that hidden prefix and can exceed the request size the model receives. They are estimates, not provider usage, and OpenCode's context meter can differ.
- `--backend`, `--threshold P`, `--truncate` and `--heuristic` work as they do for `/magic-trim`. `--heuristic` skips only the retention summary and the retention backend: every summarized turn is still sent to the summarizer model, and the budget, image, response and savings checks still apply, so `--match-model` still applies with it.
- `--match-model` runs each summary on the model that wrote the protected reasoning it covers, where that is possible; see [Reasoning-aware summaries](#reasoning-aware-summaries).
- Task-aware retention runs first when any summarized turn has a tool call whose content pruning would change: one whole-session summary from the summarizer model, then one judgment from the selected backend per such call. A call kept whole still counts toward the per-turn and overall savings checks, so keeping it can leave its turn unsummarized or fail the savings gate. A missing key or any summary or classification failure, including a token-limit refusal, stops the command before generation or a successor.
- The result is a new root session, the successor, with fresh session, message, and part IDs. The original session and its subagent sessions are never written: no message, part, title, or metadata changes. The success message and toast name the successor's session ID. When the successor is ready, every TUI with this plugin that is still showing the original session opens it, whichever terminal or headless client ran the command: two terminals on the original both move to the successor. A TUI showing any other conversation is left alone, and the original stays available to reopen.
- The successor copies the original's title, agent, model, permission rules, metadata, directory, and workspace, so your next prompt there resolves the way it would have in the original. Its lineage lives under `metadata.magicCompact` (`successorOf`, `operation`, `compactionCount`, `ready`, and for a recovery `recovery`).
- Compaction runs only on a root session at rest: no running model response or tool call, no busy or retrying session in its subagent tree, no pending permission request or question, no native compaction in progress, and no pending revert. An unknown session state counts as active. The whole stored history is checked, so an assistant message with no completion time or error, or a tool call that never finished, refuses a session that is otherwise idle, even after later turns completed. The error says that the stored history holds an unfinished record, which blocks even an idle session, and what to do: if work may still be running, wait and retry; if it was abandoned, run [`/magic-recover`](#magic-recover). Compaction and trimming never edit stored records themselves. A last `Record:` line names the first such record by message ID (and tool name, call ID and state) and counts the rest. `--heuristic` on either command does not bypass the check. The source is read again, completely, just before the successor is marked ready; any change to its history or continuation state discards the unready successor and leaves the original as it was.
- A failure before the successor is ready deletes the candidate only when it still holds nothing but records Magic Compact wrote. A candidate someone else changed, or one whose ready update may have applied, is kept and named in the error.
- While one compact, trim or recover command runs for a session, a second one for the same session in the same OpenCode process is refused. Other clients are covered by the at-rest and drift checks above, which detect a change but cannot lock the session.

Examples:

- `/magic-compact` — summarize all old assistant turns.
- `/magic-compact 1` — keep the most recent request turn whole, summarize the older eligible turns.
- `/magic-compact 3` — keep the 3 most recent request turns whole, summarize the rest.
- `/magic-compact --heuristic` — the same, without task-aware retention; turns are still summarized.
- `/magic-compact 1 --threshold 70 --truncate` — keep calls at probability 0.70 or above, and retry calls the backend refuses for its token limit once with a shortened summary.
- `/magic-compact --backend openai-decisions` — judge calls with OpenAI Decisions for this run.
- `/magic-compact --match-model` — summarize each turn on the model that wrote its protected reasoning when the route allows it.

### Reasoning-aware summaries

Reasoning models store their reasoning in two forms. Plain reasoning is readable text. Protected reasoning (OpenAI's encrypted reasoning items) carries an encrypted payload that the host replays only to the model that produced it; every other model gets none of it. A summary request on another model therefore cannot read that reasoning.

- By default every summary request runs on the configured `magic-compact-summarizer` model, as before. When `--match-model` would have run a request on the model that wrote its protected reasoning, the result adds a `Reasoning` line that says how many requests that is and how many protected reasoning units were replayed to the model that wrote them. The line holds counts only.
- `--match-model` runs each per-turn summary on the model that wrote its target turn's protected reasoning, and the retention session summary on the session's current model, with the summarizer's configured variant. Only `openai/gpt-6.1-sol` and `openai/gpt-6.1-sol-fast` are matched, because those are the catalog entries whose reasoning behavior Magic Compact verified on OpenAI Responses; each matches only reasoning recorded under its own ID. The `-pro` and `-ultrafast` entries, other OpenAI models and custom providers are not verified. A turn whose reasoning comes from several models or from a message with no recorded model, an unverified model, a configured variant that model does not offer, options set on the summarizer agent, images the model cannot read, or a request too large for that model keeps the configured summarizer. A request on the model that wrote the reasoning is sent that reasoning again, so on OpenCode 1 its size check counts the provider's reasoning count for it. That choice is made before any request, and the `Reasoning` line counts each fallback by reason. The preceding turn a request carries for context never decides the model, and reasoning from other models in the history stays unreadable, so a matched session summary can still read only part of the history.
- On OpenCode 1, Magic Compact's own summary requests on `gpt-6.1-sol` or `gpt-6.1-sol-fast` ask for every turn's reasoning to be sent. On OpenCode 2, which offers plugins no such option, the host's default applies, and the `Reasoning` line counts requests whose size estimate leaves out that reasoning.
- On OpenCode 2, another model's plain reasoning reaches a summary request on any OpenAI Responses model as assistant text marked as provisional analysis, because OpenCode 2 would otherwise drop it from that request. OpenCode 1 already sends it as text. Stored records are never changed, and encrypted payloads never become text.
- When the summarizer is DeepSeek and the history holds plain reasoning, the retention session summary is submitted through a response tool, because DeepSeek reads earlier reasoning only in a request that has tools. The summary text is the same.
- A turn is summarized when the model that continues the session would be sent less afterwards. On OpenCode 1, when the session continues on `gpt-6.1-sol` or `gpt-6.1-sol-fast`, that measure includes an estimate of the protected reasoning the model would be sent again, taken from the provider's reasoning counts of the step that produced it. A turn that carries such reasoning can be summarized even when the stored history grows; the notice then reports the growth and a `Reasoning replay (estimate)` line. Reasoning whose cost cannot be attributed is counted only by its visible text and reported as not counted. OpenCode 2 never estimates it. The estimate does not enter the cache-savings figures in `/magic-stats`.

### Pending reverts

`/magic-compact` and `/magic-trim` refuse to run while the session has a pending revert left by `/undo`, because a successor cannot tell whether you meant to keep or discard the undone messages.

- Want the undone content back? Run `/redo` first to restore it without a model call, then compact.
- Meant to discard it? Let OpenCode finish the revert through its normal flow — the next message you send commits it — then retry.

### `/magic-trim` (Experimental)

Run `/magic-trim [N] [--backend jev|openai-decisions] [--threshold P] [--truncate] [--match-model]` or `/magic-trim [N] --heuristic` to apply the same tool I/O pruning rules without summarizing or deleting ordinary user and assistant content. Arguments go in any order, each at most once.

- `N` preserves tool I/O in the most recent assistant turns. Default: `0` (trim all eligible turns).
- By default, trimming applies task-aware retention like `/magic-compact`: when a tool call's content would change, it asks the summarizer model for one whole-session summary and the selected backend for one judgment per such call, then keeps confidently useful calls whole. A missing key or any summary or classification failure stops before a successor is created.
- `--backend jev` or `--backend openai-decisions` selects the retention backend for this command, written after a space like `--threshold`. It wins over `MAGIC_COMPACT_RETENTION_BACKEND` and the `jev` default, and every call of the command, retries included, goes to that backend.
- `--threshold P` sets the keep threshold for this command, a plain decimal percent from 0 to 100 written after a space (`--threshold 70`, not `--threshold=70`). It wins over `MAGIC_COMPACT_KEEP_THRESHOLD_PERCENT` and the `0.60` default. It changes which calls are kept, not the size of any backend request.
- `--truncate` lets a call the backend refuses for its token limit be judged once more by the same backend with the summary cut to its head and tail (at most 8,000 bytes). It works with both backends. The shortened summary can leave out context the backend needs, so the result says how many decisions used it. A second refusal stops the command unchanged, and a summary already that short gets no retry. Without the flag no token-limit refusal is retried. Separately, when OpenAI Decisions answers HTTP 503 (temporarily unavailable), that call is sent again unchanged up to twice, after a short backoff or the wait the service asks for (up to 30 seconds); if it is still unavailable, the command stops unchanged.
- `--match-model` runs the retention session summary on the session's current model where that unlocks its protected reasoning; see [Reasoning-aware summaries](#reasoning-aware-summaries).
- `--heuristic` skips retention and makes no model or backend request; it cannot be combined with `--backend`, `--threshold`, `--truncate` or `--match-model`. Trimming never generates turn summaries or creates a compaction boundary.
- Like compaction, trimming writes its result to a new successor session and never changes the original. It covers the complete stored history, not only what the model currently sees, and has the same at-rest, drift, and candidate-cleanup rules. If no tool state would change, no successor is created.
- Token reductions are included in `/magic-stats` on the exact canonical active-content basis. The ignored trim notice is stored for display but excluded from that model-facing count.
- The trim notice reports `Stored history (estimate)` with the same meaning as the compaction notice. Trimming tool output that sits in a prefix a native checkpoint hides from the model reduces these stored totals even though the model's request does not change.

Examples:

- `/magic-trim` — trim eligible tool I/O throughout the session.
- `/magic-trim 3` — preserve tool I/O in the 3 most recent assistant turns.
- `/magic-trim --heuristic` or `/magic-trim 3 --heuristic` — the same, without task-aware retention.
- `/magic-trim 1 --threshold 70 --truncate` — preserve the most recent assistant turn, keep calls at probability 0.70 or above, and retry calls the backend refuses for its token limit once with a shortened summary.
- `/magic-trim 1 --backend openai-decisions --threshold 70 --truncate` — the same, judged by OpenAI Decisions.

The compaction and trim results add one retention line, matching the terminal toast, for example:

```text
Retention | Task-aware retention with jev (jev-1.13.0) at keep threshold 60% kept 21 of 233 evaluated tool call(s) whole (read 7, hive_status 3, task 2, +9 other calls).
```

The line names the backend and its model, and the threshold that applied, whether each came from the command, the server variables or the defaults. When `--truncate` retries answered some calls, the line adds how many decisions used the shortened summary. The denominator counts evaluated candidates, not all completed calls. The breakdown shows at most three tool names, ordered by kept count then name; remaining keeps are counted as other calls. Names are shortened to 24 characters and control/whitespace characters are collapsed. No arguments or tool content appear. Zero keeps, no candidates and heuristic mode are explicit. An all-kept no-op reports through the toast only and creates no successor.

Held-out evaluation kept 10 unique calls, nine labelled useful, with 32% consensus useful recall. This small sample does not establish universal precision or probability calibration.

### `/magic-recover`

Run `/magic-recover` (no arguments) when compaction or trimming refuses a session because its stored history holds an unfinished record, and you know the work behind that record was abandoned: for example, OpenCode was killed or restarted while a response or tool call was running. Running the command is your declaration that the work was abandoned. Magic Compact cannot check that, and it stops, cancels and undoes nothing, so files and subagent sessions that work touched stay as they are.

- The result is a successor session, as with compaction and trimming. The original session, its subagent sessions, stats and omission cache are never written. Ordinary user and assistant content, tool inputs, partial outputs and subagent references are copied unchanged.
- Each unfinished assistant response and pending, running or streaming tool call is closed the way OpenCode closes an interrupted one: the response gets OpenCode's aborted error and the call becomes a tool error. The model receives a closed call's error text, which says the outcome is unknown and that `/magic-recover` closed it. A response's aborted error stays in the stored record and is not part of what the model receives, so the recovery context described below reports it. Any partial output stays stored with the call. The response's completion time is the latest time it already recorded. Nothing is presented as a success, and no output is made up.
- A background subagent or background command whose result never arrived is marked on its launch as never delivered, naming its child session or shell. The launch's own stored result still says the job was running and is not changed, and no delivery is invented; the recovery context is what tells the model that delivery was abandoned.
- The model receives one recovery context with the history: a synthetic text part in a trailing message on OpenCode 1, a synthetic message on OpenCode 2. It counts the interrupted responses, lists every interrupted tool call and every abandoned background launch with its call and job (or child session), and lists unfinished subagent records left unchanged. It says that none of this is a success or a failure and that files and the named jobs or sessions should be inspected before relying on the work. The context is never shortened, unlike the short notice below, and it creates no fake notification or result. Later trims and compactions keep it, and a repeat run adds none. A recovery that only adds completion times (below) sends no context.
- Live work still refuses, as for compaction: a running session or subagent, a pending permission or question, a queued message, a running background command, a running native compaction and a pending revert. In the original session itself, a record OpenCode has no interrupted form for (an unfinished native compaction summary, a running user shell command on OpenCode 2, or a background call that names no child session) is refused instead of guessed. Inside a subagent session on OpenCode 2, any unfinished record, a running compaction or shell record included, is listed and left as it is, because subagent sessions are never copied.
- On OpenCode 2, the host's import drops an assistant response that has no completion time even when it already carries an error. Such a response is copied with its error and content unchanged and with the latest time it already recorded as its completion time, and the lineage lists it as a completion-time record. It counts as something to recover, so a session with only these gets a successor.
- On OpenCode 2, each background start is settled by one later notification for its job, in stored order. A job started twice owes two notifications, and a notification stored before its start settles nothing; a recovery marks only the starts that are still owed.
- The successor's notice (OpenCode 1) or `metadata.magicCompact.outcome` (OpenCode 2) counts what was closed and names the first record; `metadata.magicCompact.recovery` lists every record by its ID in the original session. The successor passes the same at-rest checks as any other session, so `/magic-trim` and `/magic-compact` work on it.
- A session with nothing to recover is a no-op and creates no successor, and so is a second run on a recovered successor. If the original changes while the successor is prepared, including a record the host finishes after all, the unready successor is discarded.
- No model or retention-backend request is made.

### `/magic-stats`

Run `/magic-stats` to show cumulative token savings for the current conversation. Net tokens physically pruned and inline-image tokens projected out of model requests are persisted and reported separately, as are their subsequent cache-read savings.

Reported token counts are canonical active-content estimates, not provider usage. `/magic-stats` totals and the compact and trim notices all count the whole stored history, including any prefix a native checkpoint hides from the model, so they describe stored size rather than the request the model receives. Model-facing before/after counts use the same pure manifest projection as OpenCode's request transform, include model-facing synthetic content such as the compaction boundary, exclude ignored user reporting notices including the notice that displays the count, and include ignored assistant text. Each successor starts with the original's cumulative totals and adds its own reduction; the original's stats stay unchanged. Counts describe the conversation, not disk space: the original session still holds its full history. OpenCode's context meter is a provider usage snapshot; in a successor it can show the copied last response's usage until a later assistant response refreshes it. Magic Compact never mutates provider usage metadata or fabricates an after-provider count.

### The Omitted Content Tool

Magic Compact registers a `read_omitted_content` tool that the agent can call to retrieve any tool input or output that was pruned during compaction or trimming.

Each recovery reference in the conversation includes an integrity-protected Content ID such as `2c4f6a8b0d1e:omitted-yH8kQ2pL5vN7sR4tU6wXzA`, for example `[Omitted; Content ID: 2c4f6a8b0d1e:omitted-yH8kQ2pL5vN7sR4tU6wXzA]`. The agent uses that ID to retrieve the exact original input or output from the authorized current-session cache. OpenCode may truncate a large tool result and provide a reference to the full output. A successor session holds copies of its source's entries; an ID copied into an unrelated session, such as a subagent's, does not grant access. Historical content is not a new assignment or proof of current file state; reread files when current contents are needed. OpenCode preserves historical v1 bare entries during migration and successor copying, but cannot retrieve them because they have no cryptographic binding. Unavailable or integrity-invalid entries fail closed instead of returning guessed bytes.

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
- Bulky completed tool I/O — replaced with a recovery reference pointing to the cache

### Tool I/O Rules

Completed tool outputs over 128 words or 1024 characters are omitted by default. A few tools have special handling.

- `read` — output always replaced with a reference carrying its size and Content ID; retrieve the exact captured result or reread for current file contents
- `write` / `edit` / `apply_patch` — large file content replaced in the input field itself with a reference (`edit` keeps one entry for `oldString` and `newString` together)
- `bash` — commands over 1024 characters keep their first 512 characters followed by a truncation reference; the whole command is cached
- `task` — large prompts replaced with a historical placeholder carrying their Content ID; output omitted above a higher threshold (512 words / 4096 characters), and the reference names the native child session when the host reports one
- `question` — input and output preserved
- `todowrite` / `skill` — output discarded without caching (redundant or reloadable)

Pending, running, and errored tool calls are always preserved as-is.

Completed tool calls processed by pruning are marked so later trim and compaction operations do not output-trim them again. Idempotent input rules still apply to calls processed under earlier rules.

Task prompt placeholders identify historical omissions, not runnable assignments. Retrieve the original before reuse. A new input reference sits in the field it replaced, so the output carries no separate input notice. Histories already trimmed keep their earlier XML notices, bare `[Omitted]` placeholders and long task placeholders unchanged; they are not reformatted.

A call kept by task-aware retention is left exactly as it was, including its trim marker, and is judged again the next time either command runs. Nothing about the decision is stored.

## Vs DCP Plugin (OpenCode)

OpenCode-DCP is a runtime context management system that rewrites messages when requested by the model. Magic Compact takes a different approach.

Magic Compact Offers:

- Simplicity — One command; the only setup is an API key for the task-aware retention backend.
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

## Model evaluations

### Compaction evaluation

The compaction evaluation measures how well a model works as the Magic Compact summarizer. It packs this checkout, loads it into an OpenCode server you already run on this machine, and runs `/magic-compact 1` on three frozen synthetic cases in fresh sessions of a private temporary project. Each attempt is checked mechanically against its source and, when you pass a judge model or import your own grades, scored against the cases' gold facts. Without grades the report says `Semantic: UNGRADED`.

The model's provider must already be signed in to that server; the eval reads only the server's Basic Auth from `OPENCODE_SERVER_USERNAME` and `OPENCODE_SERVER_PASSWORD`, and never reads or copies provider credentials. It does not touch your existing sessions or global configuration. Supported servers are OpenCode 1.18.30, 1.19.0 and 2.0.28.

```bash
bun run eval:compact check
mkdir -p runs
bun run eval:compact run --server http://127.0.0.1:4096 --model anthropic/claude-haiku-5-5#low --out runs/haiku-low-preflight --dry-run
bun run eval:compact run --server http://127.0.0.1:4096 --model anthropic/claude-haiku-5-5#low --out runs/haiku-low --repeat 2
bun run eval:compact report runs/haiku-low
```

`check` is offline, and `--dry-run` stops after preflight without creating a session or calling a model. `--out` must not exist yet but its parent must, and a dry run still creates its own `--out` directory, so the preflight above has a name of its own. A run makes one paid summarizer request per attempt, and `--judge provider/model[#variant]` adds one paid request per delivered summary. Three synthetic cases describe one model on one host setup, not a general accuracy rate. See [the compaction evaluation](docs/CompactionEvaluation.md) for isolation, cleanup, mechanical checks, grading and host versions.

### Decision evaluation

Task-aware retention asks a decision model whether the assistant would use a tool call's content again. The decision evaluation scores a model on that question with fixed cases: each gives the latest request, a session summary and one completed tool call, and compares the model's probability with a hand-written label. It measures the keep/trim decision only. It does not run `/magic-trim` end to end, judge summaries, or change the production model or its keep threshold.

It runs against any versioned TypeSafe Jev model (`jev-1.13.0` by default; aliases such as `jev-latest` are refused so runs stay repeatable) or the OpenAI Decisions API. Each provider needs its own API key in the environment: `TYPESAFE_API_KEY` or `MAGIC_COMPACT_OPENAI_DECISIONS_API_KEY`. OpenCode sign-ins are not used.

```bash
bun run eval:decisions check
bun run eval:decisions run --provider jev --model jev-1.14.0 --dry-run
export TYPESAFE_API_KEY=<your TypeSafe key>
bun run eval:decisions run --provider jev --model jev-1.14.0 --out /tmp/decisions/jev-1.14.0
bun run eval:decisions report /tmp/decisions/jev-1.14.0
```

The first two commands are offline. The bundled pack has 17 synthetic smoke cases, so a score is a sanity check, not a held-out result. Its `--threshold` reference is `0.8`, independent of production's default and of the environment override; `--threshold 0.6` compares a model at the production default on non-held-out data, and held-out datasets accept only `0.8`. See [the decision evaluation](docs/DecisionEvaluation.md) for providers, dataset format, saved results, metrics and limits.

## License

Arkive Compact is a modified distribution of [Magic Compact](https://github.com/aerovato/magic-compact). Original Magic Compact remains under the BSD 3-Clause License; the required notice is in [`NOTICE.md`](./NOTICE.md). This repository's modifications and packaging are not licensed. See [`LICENSE.md`](./LICENSE.md).

## Development

See [`docs/Development.md`](./docs/Development.md) for setup and maintenance commands.
