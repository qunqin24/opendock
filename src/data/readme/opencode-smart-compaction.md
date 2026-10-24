# opencode-smart-compaction

Better compaction for [OpenCode](https://opencode.ai) 2. When a long session is compacted, this plugin writes the checkpoint itself. The model writes a strict six-section summary, the plugin checks it, and then the plugin appends the state that models tend to get wrong: the exact identifiers you gave, every file the session touched, what git reports as uncommitted, and the shells and subagents still running. The next turn picks up where the last one stopped instead of rediscovering it.

It started as a port of the Smart Compaction extension in [shariq-pi-extensions](https://github.com/shariqriazz/shariq-pi-extensions) and is now developed for OpenCode on its own.

## Why use it

- **The summary is checked.** A checkpoint is accepted only when all six sections are present in order. Otherwise the plugin retries, and if every attempt fails, OpenCode compacts with its own prompt. A session never blocks on the plugin; Pi's Smart Compaction cancels compaction instead.
- **Identifiers survive.** Commit SHAs, UUIDs, URLs, and IPv4 addresses from your messages and the previous checkpoint are restored verbatim when the summary drops them.
- **State comes from the source.** File lists come from the session's tool calls, and dirty files and the uncommitted diff come from git, not from the model's memory.
- **No duplicate work after compaction.** Running background shells and subagents are listed, so the next turn waits for them instead of starting a second dev server or relaunching a subagent.
- **Reuses the prompt cache.** When the session's cache is still warm, the checkpoint is written from the live conversation itself, with full tool output, and most of the input is billed at the cache-read rate. In a live test with Claude Sonnet 5.5, a checkpoint read 21,224 of its 22,718 input tokens (93%) from the cache.
- **Bounded growth.** Recent turns kept beside the checkpoint are capped at about 40,000 tokens per request, so a long autonomous run doesn't leave a huge verbatim tail in every later request.
- **Earlier compaction.** An optional threshold compacts at 95% of the window or 600,000 tokens, whichever comes first.

## Compared with OpenCode's compaction

| | OpenCode 2.1 built-in | Smart Compaction |
| --- | --- | --- |
| Summary format | Seven-heading template; accepted when any heading appears | Six numbered sections, all required in order, with content after the resume anchor |
| Identifiers | Whatever the model remembers | Protected SHAs, UUIDs, URLs, and IPs restored verbatim |
| Files | Up to 15 "relevant files" chosen by the model | Every file read or changed through tools, carried across compactions (40 read, 60 changed, most recent kept) |
| Git state | Not included | Dirty files, lockfile and generated-asset changes, and a bounded diff including untracked previews |
| Shells and subagents | Not included | Running ones listed, so they aren't duplicated or polled |
| Prompt cache | Reused (whole conversation) | Reused when warm; otherwise a bounded transcript |
| On failure | One retry, then the compaction fails | Retries with other model settings, then falls back to OpenCode's compaction |
| Recent turns after compaction | `compaction.keep.tokens`, which can grow after long runs | Capped at about 40,000 tokens per request |

## What a checkpoint contains

The model writes six sections:

1. Primary goal and constraints, including every "never do X" rule the user stated.
2. Progress ledger: done, in progress (with batch counts), and blocked.
3. Code changes with short verbatim snippets of in-flight work.
4. Errors, root causes, and fixes.
5. Key decisions and discarded approaches.
6. Resume anchor and the next concrete step.

The plugin then appends what the model doesn't write:

- **Retained identifiers** the summary dropped, under `### Retained Identifiers`.
- **Files** the session read or changed, accumulated across compactions.
- **Git state:** dirty files and lockfile/generated-asset changes (each capped at 60, with omission counts) and a bounded diff of uncommitted work. Untracked symlinks are never followed; a diff that is too large or unavailable is noted without losing the file inventory. A clean worktree adds nothing.
- **Running background shells**, and **background subagents** that haven't reported back, with a note not to poll, relaunch, or duplicate them.

If the model copies one of the appended state blocks into its own text, the copy is removed, so each block appears once and is always exact.

On the next compaction, the previous checkpoint is merged with the new turns under hierarchical retention rules, and the appended state is regenerated.

## How the summary is written

The plugin tries two paths:

1. **Cached.** If the compaction model is the one the session just used and its last step started less than 270 seconds ago with cache activity, the plugin asks the session itself (`session.generate`) for the summary. The request repeats the live conversation exactly, so the provider reads it from the cache, and the model sees everything, including full tool output. The output limit is fitted to the room left in the window.
2. **Stateless.** Otherwise, or when the cached reply is incomplete, the conversation goes to the compaction model as a bounded transcript. Long tool output keeps its beginning and end, failures and the newest messages get more room, large tool arguments are shortened, and terminal escape codes and repeated lines are removed. If the summary is incomplete, the plugin retries the same model without its variant, then the session's model when compaction uses a different one. Authentication, permission, and quota errors stop the retries.

Session history itself is never changed.

Each checkpoint records what happened in the compaction message's `metadata.smartCompaction`: the path used, model, duration, sizes, and every attempt's outcome. If the cached path was skipped, it also records the guard that skipped it. The server log gets one line per checkpoint:

```
[opencode-smart-compaction] checkpoint: mode=cached model=cliproxy/claude-sonnet-5-5#high attempts=1 8.2s summary=2813 chars
```

## Install

Add the package to `plugins` in `~/.config/opencode/opencode.json` or a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-smart-compaction"]
}
```

OpenCode installs it from npm on the next start. It needs OpenCode 2.0.26 or later and supports 2.1. OpenCode checks unpinned plugins for new versions but doesn't install them on its own; run `opencode plugin update` to upgrade.

## Configure

```json
{
  "plugins": [
    {
      "package": "opencode-smart-compaction",
      "options": { "thresholdMode": "hybrid", "thresholdPercent": 95, "hardLimitTokens": 600000 }
    }
  ]
}
```

- `thresholdMode`: `hybrid` (default, whichever comes first), `percent`, `hard`, or `off` to leave timing to OpenCode alone. After each model step, the plugin compares the context that step used with the threshold and, once it is reached, requests a compaction, which OpenCode runs before the next step.
- `thresholdPercent` (default `95`) and `hardLimitTokens` (default `600000`).
- `cacheReuse` (default `true`): try the cached path first. Set `false` to always use the bounded transcript.
- `maxRecentTokens` (default `40000`): maximum recent-context size in each request, estimated as characters divided by four. Keeps the newest turns, with an omission note, and prefers a turn boundary. Only checkpoints marked as covering those turns are shortened, and the cut is deterministic, so it doesn't break the prompt cache. Set `0` to disable trimming and the extra summary coverage of kept turns.

OpenCode's own automatic compaction still runs at the model window minus `compaction.buffer` (15% of the window by default since OpenCode 2.1, 10% before), and it fires first when that is lower than the plugin's threshold. For the 95% threshold to apply, set `compaction.buffer` below 5% of your smallest model window; `8000` works for windows of 200,000 tokens and up. OpenCode's own trigger then remains a backstop. Other compaction settings:

- `compaction.auto` (default `true`) turns OpenCode's automatic compaction and overflow recovery on or off; `/compact` runs it on demand.
- `compaction.keep.tokens` (default `15000`) sets OpenCode's target for recent conversation kept verbatim beside the checkpoint; its user-turn boundary can make the actual amount larger. `maxRecentTokens` is the plugin's separate request-side ceiling.

The checkpoint is written by the session's model with its selected variant, so reasoning settings carry over. To use another model, set `agents.compaction.model` (for example `"provider/model#variant"`); that model always takes the stateless path, since it has no warm cache. Models set to provider-native compaction (`settings.compaction.type: "native"`) still call the hook (checked in OpenCode 2.0.26 and 2.1.3), so the plugin's checkpoint replaces the native one.

### Other plugins and the cache

The cached path only hits the cache when its request matches the session's last request. OpenCode runs the `context` hook for agent requests and the `generate` hook for `session.generate`, so a plugin that changes requests in `context` (for example, adding system text) should make the same change in `generate`. [opencode-fusion-mode](https://github.com/lemon07r/opencode-fusion-mode) does this from 0.1.4. In a live test without it, the checkpoint read 4,806 of 22,874 input tokens from cache; with it, 22,104 of 23,596.

## Limits

- **No timeout or thinking-off retry.** OpenCode's generation APIs take only a prompt and a model, so an attempt can't be cancelled after a time limit and retries use the model's default settings rather than turning reasoning off.
- **Compaction cost isn't recorded.** Neither path adds the summary request to OpenCode's session cost. OpenCode logs the cached path's usage, including cache reads, as `session generation usage diagnostic` in `~/.local/share/opencode/log/opencode.log`.
- **Cache warmth is inferred.** The cached path is chosen from the last step's model, age, and cache activity; a warm step doesn't prove the next prefix matches. A miss costs an uncached request, never a broken checkpoint.
- **Request-patching plugins don't reach the stateless path.** It uses `ctx.generate.text`, which runs no session hooks, so a plugin that fixes provider requests in a session `http.request` hook doesn't apply to it. Prefer a model `compatibility` setting where one exists.
- **Background shells after a restart.** Running shells are learned from OpenCode's events, so shells started before the OpenCode service last restarted aren't listed.
- **Conservative recent-context trimming.** Checkpoints without a reliable kept-turn boundary or with unsupported content, such as user attachments, are left untrimmed on the stateless path. If session context can't be read, previously recorded subagents are kept and marked unverified.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): the hooks, both summary paths and their guards, and how the summary is completed.
- [Development](docs/DEVELOPMENT.md): commands, tests, live verification, and releases.

## License

[MIT](LICENSE)
