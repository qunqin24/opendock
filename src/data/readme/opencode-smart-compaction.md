# opencode-smart-compaction

Smart Compaction for [OpenCode](https://opencode.ai) 2. When OpenCode compacts a long session, this plugin writes the checkpoint itself: a structured six-section summary that keeps the identifiers it must not lose and ends with the exact file and worktree state.

It is the OpenCode counterpart of the Smart Compaction extension in [shariq-pi-extensions](https://github.com/shariqriazz/shariq-pi-extensions) and produces the same checkpoint format.

## What a checkpoint contains

The model writes six sections:

1. Primary goal and constraints, including every "never do X" rule the user stated.
2. Progress ledger: done, in progress (with batch counts), and blocked.
3. Code changes with verbatim snippets of in-flight work.
4. Errors, root causes, and fixes.
5. Key decisions and discarded approaches.
6. Resume anchor and the next concrete step.

The plugin then adds two things the model doesn't write:

- **Retained identifiers.** Commit SHAs, UUIDs, URLs, and IPv4 addresses from your messages or the previous checkpoint are protected. Any the summary dropped are appended verbatim under `### Retained Identifiers`.
- **File and worktree state.** Files the session read or changed through tools, accumulated across compactions; the files git reports as dirty; lockfile and generated-asset changes; background shells the session still has running, so the next turn doesn't start a duplicate dev server; and a bounded diff of uncommitted work, including previews of untracked files. Untracked symlinks are never followed.

The conversation goes to the model in a bounded form: long tool output keeps its beginning and end, failures and the newest messages get more room, large tool arguments such as file contents are shortened, and terminal escape codes and repeated lines are removed. Session history itself is never changed.

A summary is accepted only when it has all six sections. Otherwise the plugin retries the same model with its default settings (no variant), then the session's model when compaction uses a different one. Authentication, permission, and quota errors stop the retries.

On the next compaction, the previous checkpoint goes back to the model as `<previous-summary>` and is merged with the new turns, including the recent conversation OpenCode kept verbatim beside it. The appended state is regenerated each time.

OpenCode still keeps the most recent conversation (`compaction.keep.tokens`) verbatim beside the checkpoint.

## Install

Add the package to `plugins` in `~/.config/opencode/opencode.json` or a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-smart-compaction"]
}
```

OpenCode installs it from npm on the next start. It needs OpenCode 2.0.26 or later. OpenCode checks unpinned plugins for new versions but doesn't install them on its own; run `opencode plugin update` to upgrade.

## Configure

Compaction triggers at whichever comes first: 95% of the model's context window or 600,000 tokens. After each model step, the plugin compares the context that step used with that threshold and, once it is reached, requests a compaction, which OpenCode runs before the next step. Change it with plugin options:

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

- `thresholdMode`: `hybrid` (default, whichever comes first), `percent`, `hard`, or `off` to leave timing to OpenCode alone.
- `thresholdPercent` (default `95`) and `hardLimitTokens` (default `600000`).

OpenCode's own automatic compaction still runs at the model window minus `compaction.buffer` (10% of the window by default), and it fires first when that is lower than the plugin's threshold. For the 95% threshold to apply, set `compaction.buffer` below 5% of your smallest model window; `8000` works for windows of 200,000 tokens and up. OpenCode's own trigger then remains a backstop. Other compaction settings:

- `compaction.auto` (default `true`) turns OpenCode's automatic compaction and overflow recovery on or off; `/compact` runs it on demand.
- `compaction.keep.tokens` (default `15000`) sets how much recent conversation stays verbatim beside the checkpoint.

The checkpoint is written by the session's model with its selected variant, so reasoning settings carry over. To use another model, set `agents.compaction.model` (for example `"provider/model#variant"`); OpenCode passes that model to the plugin instead. Models set to provider-native compaction (`settings.compaction.type: "native"`) don't call the hook, so the checkpoint format doesn't apply to them; the threshold still does.

## Limits

- **Fails open.** If no attempt produces a complete checkpoint, the plugin logs a warning and OpenCode compacts with its own prompt. A session never blocks on the plugin. Pi's Smart Compaction cancels compaction instead.
- **No timeout or thinking-off retry.** OpenCode's generation API takes only a prompt and a model, so an attempt can't be cancelled after a time limit and the retry uses the model's default settings rather than turning reasoning off.
- **Compaction cost isn't recorded.** The same API returns no token usage, so the summary request doesn't appear in OpenCode's session cost.
- **Background shells after a restart.** Running shells are learned from OpenCode's events, so shells started before the OpenCode service last restarted aren't listed.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): the hook, the request it builds, and how the summary is completed.
- [Development](docs/DEVELOPMENT.md): commands, tests, and releases.

## License

[MIT](LICENSE)
