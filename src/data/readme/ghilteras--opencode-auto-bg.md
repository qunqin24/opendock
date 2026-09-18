# opencode-auto-bg

Transparent automatic backgrounding for OpenCode subagents. Zero API changes — you keep calling `task()` as usual, and this plugin backgrounds the children of your configured parent agent(s) automatically.

Subagent delegation normally blocks the parent until the child finishes, and OpenCode's native wake-back is usually reliable but not always. This plugin makes backgrounding automatic and adds a bounded, generation-deduped delivery path for the cases where the native delivery of a child's result never reaches the parent.

## What it does

Three responsibilities, all on OpenCode's `event` hook:

1. **Auto-background** (`session.created`) — when a child subagent is created under a parent in `AUTO_BG_PARENT_AGENTS`, the plugin polls child status until the child is busy, then calls `POST /experimental/session/<parentID>/background`. The parent goes idle immediately and the turn returns to you. Politeness rule: if the child never becomes busy within 10s, nothing is backgrounded and there is no harm done.

   A `tool.execute.before` hook also fills in an omitted `background` argument on top-level `task` calls, so delegation is backgrounded by default without you passing anything. Explicit `background: true` / `background: false` is always left untouched.

2. **Deterministic wake delivery** (`session.idle` on a child) — a bounded condition-wait for the native `<task id="...">` result marker. If the marker arrives, nothing is delivered (the native path won). If it does not arrive before the deadline, the plugin posts the child's **final report verbatim** to the parent session via the synchronous `/session/{id}/message` route.

3. **TODO-sync nudge** (`session.idle` on a top-level parent session) — reads `GET /session/{id}/todo` and, if any task is still `in_progress`, injects a short reminder to close the ledger before responding. Guarded: no nudge while a child delegation is in flight, no nudge if the last turn already called `todowrite`, and a 2-minute cooldown prevents loops.

## Install

```bash
npm install @ghilteras/opencode-auto-bg
```

Add to your `opencode.json` or `opencode.jsonc`:

```json
{
  "plugin": ["@ghilteras/opencode-auto-bg"]
}
```

## Configure

The only configuration surface is environment variables, read at plugin load.

By default the plugin targets sessions whose parent agent is `architect`. To target different primary agents, set a comma-separated allowlist:

```bash
# default: "architect"
AUTO_BG_PARENT_AGENTS=architect,build
```

> A locally-vendored copy of this plugin and the npm package must not both be enabled — OpenCode loads each entry separately, and two copies will both try to deliver.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `AUTO_BG_PARENT_AGENTS` | `architect` | Comma-separated allowlist of parent agent names. Backgrounding, wake delivery and the TODO nudge all apply only to these. |
| `OPENCODE_AUTO_BACKGROUND` | `true` | Set to `false` to preserve native foreground delegation: backgrounding is off and the `tool.execute.before` hook becomes a no-op. This does not disable wake delivery or the TODO-sync nudge, which run on the event hook. |
| `OPENCODE_PORT` | `4097` | OpenCode server port. |
| `OPENCODE_INSTANCE_ROLE` | `fleet` | Set to `worktree` to disable all cross-session machinery for per-worktree instances. |
| `AUTO_BG_DELIVER_POLL_MS` | `1000` | Poll interval while waiting for the native result marker. |
| `AUTO_BG_DELIVER_MAX_WAIT_MS` | `20000` | How long to wait for the native result marker before delivering. |

## How delivery works

The delivery path is deliberately boring, because silent loss is worse than a rare duplicate:

- **Bounded wait.** On child idle, poll the parent timeline for a native `<task id="...">` marker for up to `AUTO_BG_DELIVER_MAX_WAIT_MS` (20s). Marker found → done, no delivery. The marker is matched against the child *session id*, not against a specific generation — see the generation-reuse limitation below.
- **Payload integrity.** Only the text of an assistant message whose `finish` is `"stop"` is ever delivered — a genuinely completed turn. Aborted, errored or incomplete turns (`finish` empty or `"tool-calls"`) are never delivered, because partial text is worse than nothing. If the newest turn is incomplete but an earlier `stop` turn exists, that earlier result is delivered with an explicit staleness note prepended.
- **Abort fast-path.** Aborting a child consumes the native one-shot completion observer, so a later clean completion of that same child can never deliver natively. If the child's history contains an abort error, the grace wait is shortened to ~2s so delivery happens promptly. Children with no abort keep the full grace wait, to avoid racing the native path.
- **Generation dedup.** Each delivery is keyed `childID:messageID`. Keys are persisted to `~/.config/opencode/auto-bg-delivered.json` (atomic write via same-directory temp file + rename, capped at the most recent 500 keys), so dedup survives plugin restarts. Dedup is bounded, not absolute: the 500-key cap evicts older keys, a crash between POST and save can lose a key, and the file assumes a single writable instance — concurrent instances sharing one \$HOME can overwrite each other's key set.
- **Timed-out POST is not a failure.** Every delivery embeds a per-generation nonce in the posted text. Before posting, the parent timeline is checked for that nonce; if it is already there, the POST landed and only the client timed out, so the generation is recorded as delivered with no duplicate post. A POST that times out without a detectable nonce is not recorded, so a later idle event retries it.
- **Fail toward delivery.** If the parent timeline cannot be read, the plugin does not treat that as "already delivered" — it proceeds. The trade is a possible duplicate rather than a possible silent drop.
- **Model preservation.** The delivery reuses the parent's last real turn model so the prompt cache survives; if no real turn exists, the model field is omitted and OpenCode inherits it from the session. There is no model pinning.

## Non-goals

- No process-wide sweep, no `setInterval` timer, and no `POST .../interrupt`. This plugin never interrupts a running child.
- It does not poll historical child sessions, and it does not infer that a quiet child is hung. Silence is not treated as completion.
- **Known limitation — generation reuse.** The native-marker check is keyed to the child *session id*, not to an individual result. If a child session is reused (for example by resuming it), a native completion marker left by an *earlier* generation of that session suppresses delivery for a *later* generation of the same session: a missed native delivery on the resumed generation is therefore not recovered. Children that are never reused — a fresh session per delegation — are unaffected. The intended fix is a record that binds `childID + final message id` to the marker that satisfied it.
- **Known limitation — parent turn died after the marker.** If the native `<task>` marker *did* reach the parent but the parent's turn then died before responding, this plugin does not detect that and will not re-wake the parent. Operators can intervene with OpenCode's native interrupt or a manual message.

## Requirements

- OpenCode with plugin support
- No npm dependencies (uses built-in `fetch()`)
- A writable `~/.config/opencode/` if you want dedup state to persist across restarts

## API notes

- `POST /session/{id}/prompt` does not exist. The real routes are `/session/{id}/message` (v1 sync), `/session/{id}/prompt_async` (v1 async) and `/api/session/{id}/prompt` (v2 durable).
- Unmatched paths return `200` with `text/html` (SPA fallback), never `404`. Timeline reads require an `application/json` content-type before being trusted, and a delivery or TODO POST that returns `text/html` is treated as a failure and is not recorded.
- `session.idle` carries only `{sessionID}`, so the parent is resolved with a follow-up `GET`.
- Plugin logs go to `journalctl -u opencode.service`, not to a log file.

## Tests

```bash
npm test
```

## License

MIT
