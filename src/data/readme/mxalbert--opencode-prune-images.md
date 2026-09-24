# opencode-prune-images

An OpenCode plugin that keeps image-heavy chats manageable.

Browser work, screenshots, and visual checks can add many image attachments to
one conversation. Large requests may hit a provider or gateway limit. This
plugin changes the outgoing context before it is sent: it keeps the newest
images within two budgets and replaces older images with small recall cards.

It is deliberately conservative about what it promises. It reduces image
payload pressure, but it cannot guarantee that every provider accepts every
request. Provider limits, prompt size, tool schemas, and other request data
still matter.

## What it does

- Keeps up to **7 newest images** in the active context by default.
- Keeps their estimated cumulative wire Base64 payload under **16 MiB** by
  default (`16,777,216` bytes).
- Allocates the budgets from newest to oldest. A large recent image can cause
  older images to become cards even when there are fewer than seven images.
- Replaces pruned images with a three-point card containing the cached path,
  what was visible, why it was captured, and a best-effort way to recall it.
- Copies pasted data and ephemeral `/tmp` captures into a rolling cache with a
  default cap of **100 files**.
- Removes recognized image data from the outgoing context on the compaction
  path, leaving text cards for the compaction model. The dedicated v2
  `compaction` session hook is registered with zero budgets, so no heuristic
  detection is involved.
- Avoids double-wrapping cards that it has already created.
- Targets the payload the v2 context hook exposes: tool media appears in
  tool-result content values (`content[].result.value[]`) as
  `{ type: "file", uri, mime, name }`, and is replaced in place by a text card.

The transformation is **outgoing-context only**. It runs in memory in the
OpenCode context/message hook. It does not rewrite the conversation transcript
or delete image rows from OpenCode's SQLite history. The cache is also not a
permanent archive: its oldest files are removed when the 100-file cap is
exceeded.

## How it works

```text
[Screenshot or image attachment]
                |
                v
[OpenCode context/message hook]
                |
                v
  Scan recognized image parts
  Estimate wire Base64 size
  Keep newest images within:
    - 7 images
    - 16 MiB cumulative wire Base64
                |
       +--------+--------+
       |                 |
       v                 v
  Keep raw image       Create text card
  in outgoing context  and cache when possible
                |
                v
        [Provider request]
```

The plugin registers two OpenCode v2 session hooks: `context` for normal agent
requests (dual budgets) and `compaction` for compaction summarization (zero
budgets). Both are fired by the host before the request is dispatched, and the
plugin mutates the outgoing messages in place.

## Recall cards

A card looks like this:

```text
[Pruned Image: /Users/username/.cache/opencode/recent-images/img_3f8a91b2.png]
• What's visible: Found a 12px alignment issue around the checkout button.
• Why it was captured: Check UI alignment on the checkout button.
• Recall: Read the cached path if it still exists, or re-capture the screen.
```

Cards are intentionally lossy. They provide a useful summary and a best-effort
cached path; they do not preserve the original pixels. Caching can fail for a
restricted or missing file, and cached files can later be evicted.

## Installation

```bash
npm install @mxalbert/opencode-prune-images
```

Then add it to `~/.config/opencode/opencode.json` or to a project-level config:

```json
{
  "plugins": ["@mxalbert/opencode-prune-images"]
}
```

The package is **source-only** — it ships `index.ts` plus a `server.ts`
re-export, with no build step. OpenCode's Bun runtime loads them directly.

### From a local checkout

Point OpenCode at the **directory**, not at a file:

```bash
git clone https://github.com/mxalbert1996/opencode-prune-images.git \
  ~/.config/opencode/plugins/opencode-prune-images
```

Then point the config at that directory:

```json
{
  "plugins": [
    "/Users/username/.config/opencode/plugins/opencode-prune-images"
  ]
}
```

The v2 loader resolves a directory entry through its root `server.ts` (a thin
re-export of `index.ts`), or through a package `./server` export. A path
pointing straight at `index.ts` is rejected with *configured plugin path must be
a directory*. Keep the repository in place while OpenCode loads it, and restart
OpenCode after changing the plugin configuration.

Confirm it loaded by finding this line in the server log
(`<data>/opencode/log/opencode.log`):

```text
msg="loading plugin" id=.../opencode-prune-images entrypoint=.../server.ts
```

## Configuration

Each setting resolves in this order: **environment variable → plugin `options` →
built-in default**, so an exported variable overrides config without editing any
file. Values are read when the module initializes and again during `setup()`,
so plugin options apply on load. Restart OpenCode after changing either.

`setup()` establishes the budgets, so the exported setters (`setMaxImages`,
`setMaxImageBytes`, `setCacheDir`) are runtime overrides — call them **after**
`setup()`. A later `setup()` re-resolves the budgets and supersedes them.

| Setting | Default | Environment variable | Plugin option | Notes |
| --- | ---: | --- | --- | --- |
| Active image count | `7` | `OPENCODE_MAX_IMAGES` | `maxImages` | Newest images win. Positive integers only. |
| Active image bytes | `16 MiB` (`16,777,216`) | `OPENCODE_MAX_IMAGE_BYTES` | `maxImageBytes` | Cumulative estimated wire Base64 size. |
| Rolling cache files | `100` | — | — | Fixed default cap. `enforceCacheCap()` accepts an explicit cap for programmatic use. |
| Rolling cache directory | `$XDG_CACHE_HOME/opencode/recent-images`, else `~/.cache/opencode/recent-images` | — | `cacheDir` | Can also be changed with `setCacheDir()`. |

The cache directory follows `XDG_CACHE_HOME` the same way OpenCode itself does.

Options go in the plugin entry:

```json
{
  "plugins": [
    {
      "package": "/Users/username/.config/opencode/plugins/opencode-prune-images",
      "options": { "maxImages": 5, "maxImageBytes": "16MiB" }
    }
  ]
}
```

Invalid option values are reported on stderr and ignored, leaving the default in
place.

The byte parser accepts values such as `500KB`, `16MB`, `16MiB`, and raw byte
counts. In this plugin, `KB`/`MB` use binary units (`1024` and `1024 * 1024`).

Example:

```bash
export OPENCODE_MAX_IMAGES=5
export OPENCODE_MAX_IMAGE_BYTES=16MiB
```

The source also exports `setMaxImages`, `setMaxImageBytes`, `setCacheDir`,
`applyPluginOptions`, and `pruneImages` for local wrappers and tests. The package
is marked private because there is no supported npm distribution yet.

## Prompt cache interaction

Prefix caching means a change at some position invalidates the provider's cached
state from that point onward; everything before it can still be reused. Replacing a
pruned image with a card is such a change, so pruning can reduce prefix-cache
reuse. A card may settle into a stable byte sequence once its local context stops
changing, letting the provider match through it — but cards are regenerated on
every request, so this is not guaranteed.

How much this costs is provider- and model-specific: it depends on cache
granularity, block boundaries, TTL, and how the provider tokenizes and caches
media. **Measure against your own provider and model** rather than assuming a
magnitude. In one sandbox experiment on a free Zen model, dense reads cost roughly
170 uncached tokens per prune, while the same plugin with a sentence between each
read produced a single full-prefix miss (9,468 uncached, 0 cached). Read the
direction, not the numbers.

This is not a reason to avoid pruning — a rejected request costs more than a cache
miss. Compaction is the larger cost of the two, since it replaces the whole head
with a summary and so invalidates essentially the entire prefix.

Pruning also saves less *token* cost than the payload suggests, because providers
tokenize images by patch rather than by Base64 length. Its value is staying under
provider image-count caps and request-payload limits.

## Limits and safety notes

- The 16 MiB budget covers the plugin's estimated image payload, not the full
  HTTP request. It is not a guarantee against 413 responses.
- Inline Base64/data URIs are measured from their Base64 content. Local files
  are estimated from their size. Remote URLs use a nominal estimate.
- The plugin does not transcode or resize images.
- It does not delete original project files. Only files in the rolling cache
  are subject to the cache cap.
- The plugin does not inspect or clean OpenCode's SQLite database. If an old
  conversation itself is too large, use OpenCode's supported history controls
  or handle database cleanup separately and carefully.
- Compaction receives text cards because the plugin sets the active image and
  byte budgets to zero for recognized images. The plugin does not control the
  summary text that the model writes.

## Development

Requires Bun and TypeScript.

```bash
bun install
bun test
bun run typecheck
```

The test suite covers normal and malformed inputs, nested tool results, image
count and byte budgets, cache rotation, compaction behavior, duplicate cards,
and plugin hook registration.

## Known limitations

- Image recognition depends on the attachment shapes exposed by OpenCode. An
  unknown future media shape may pass through untouched.
- The causal card summary is based on nearby conversation text. It cannot see
  pixels after an image has been pruned.
- The rolling cache is local to one machine and is not synced between devices.
- The plugin has been verified end-to-end against opencode 2.0.15: both session
  hooks register and fire, pruning changes what the model sees, and the stored
  transcript is left untouched. Provider-specific request limits still vary and
  remain outside this plugin's control.
- Image collection reads only the two positions observed in the OpenCode 2.0.15
  hook payload (message content parts and tool-result content values). Media
  nested in any other shape passes through untouched by design.

## License

[MIT](LICENSE) © 2026 Sugam
