# Lacuna

An OpenCode V2 plugin that lets the model manage its own context window.

Most context management runs on fixed rules: drop old tool output, summarise when the window is full. Lacuna leaves
those decisions to the model. It sees what is in its context, decides what it no longer needs, writes the summary
itself, and brings the originals back when it needs them again. There are no heuristics to tune, so it improves as
models improve.

## How it works

1. Every message the model sees carries a ref tag with its ID, size and kind:
   `<ref id="m12" tokens="3.1k" kind="tools:read"/>`.
2. When a stretch of work is done, the model archives the range (`m5` to `m40`) with a summary it writes. Before
   each request, Lacuna swaps that range for the summary. The session history is never changed and the originals are
   kept.
3. If the model later needs the details, it searches the archive and restores the block. Blocks can be archived
   again inside larger ones, so a long session folds into layers.
4. Instructions in the system prompt explain all of this. Once the context passes `nudgeAt`, the model also gets a
   short reminder to archive.

| Tool | What it does |
| --- | --- |
| `archive` | Move one or more ranges out of context into the archive, leaving summaries. Each range has `start`, `end`, `summary` and an optional `topic`. Endpoints may be message refs (`m12`) or existing blocks (`b3`), so blocks can be nested. |
| `restore` | Bring an archived block back one level: its original messages, or the child blocks it contains. |
| `search_archive` | Search block summaries and the archived originals; returns matching blocks with snippets. |
| `context_status` | Token usage, active blocks, and the largest unarchived ranges worth archiving next. |

## Prompt cache

Archiving does cost one cache miss: the provider reprocesses the conversation from the first archived message
onward. After that, every request is smaller. Lacuna renders everything identically from one request to the next, so
the cache only breaks when the model actually archives, and the model is told to archive several ranges in one call
so the miss is paid once.

That trade is almost always worth it. Cached input is usually billed at around a tenth of the fresh price, but it is
billed again on every step. Removing 50k tokens pays back the one miss within a few steps and keeps saving for the
rest of the session. The paper
[Model-Driven Incremental Hierarchical Compression](https://github.com/ranxianglei/billion-context/blob/master/paper/model-driven-incremental-hierarchical-compression-training-free-multi-generational-context-management-for-long-lived-coding-agents.md),
from the billion-context repository, reports the same approach in production over 4.5 months and about 175,000 model
calls: 91% of input tokens were still served from cache, and most misses came from the provider's cache expiring, not
from archiving. These figures are self-reported by a single author.

Some models also charge a higher rate for the whole request above a context size; several GPT models double the
input price above 272k tokens. The default `nudgeAt` of 200k keeps sessions below the common thresholds. OpenCode
lists the tiers in each model's `cost` metadata; if yours is lower, set `nudgeAt` below it.

## Install

Add the package to `plugins` in `opencode.json`. OpenCode installs it from npm on the next start:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-lacuna", "options": { "nudgeAt": 0.6 } }]
}
```

`nudgeAt` is either a fraction of the context window (`0.6`) or an absolute token count (`150000`). Default `200000`.

Don't run another context pruning plugin at the same time: two plugins rewriting the same messages will conflict.

## Develop

```sh
git clone https://github.com/Trollgeir/lacuna
cd lacuna && npm install
npm test          # node --test, core logic
npm run typecheck
```

To run your clone, set `"package"` to its absolute path instead of `opencode-lacuna`. Local plugin directories are hot-reloaded by OpenCode, so edits take effect without a restart.

## Limitations

- Token figures are estimates (characters ÷ 4), corrected against the usage the provider reports.
- No automatic cleanup of duplicate or failed tool output; everything is model-driven.
- Unless disabled (`"compaction": { "auto": false }`), OpenCode's own compaction still runs at the context limit and
  summarises the material that was never archived.
- Saved originals are kept until the session is deleted, so a long session's storage grows with everything it has archived. Sessions deleted while Lacuna isn't loaded leave their saved data behind.

## Acknowledgements

Inspired by [Dynamic Context Pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) and
[billion-context](https://github.com/ranxianglei/billion-context). No code is shared; Lacuna is a separate
implementation for the OpenCode V2 plugin API.

## License

MIT
