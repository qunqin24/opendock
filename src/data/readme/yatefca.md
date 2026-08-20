# yatefca

<!-- README_HEAD:START -->

[![npm version](https://img.shields.io/npm/v/yatefca)](https://www.npmjs.com/package/yatefca)
[![types](https://img.shields.io/npm/types/yatefca)](./src/index.ts)
[![CI](https://github.com/jayf0x/yatefca/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/yatefca/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/yatefca)](./LICENSE)

<!-- README_HEAD:END -->

### **Y**et **A**nother **T**itle **E**xtractor **F**or **C**oding **A**gents

**Single purpose tool: text in, title out - no AI**


Chat tools today use a small LLM to generate titles for your sessions. This is often done by a smaller model. This means extra invisible costs and opens a possibility for prompt injection - let alone the often terribly generic session names in tools like Claude code.

When I was working on a project using [Opencode](https://opencode.ai/), I wanted a none AI solution for generating titles for my sessions. Could not find a plug and play solution, so made it. Now sharing the result as a standalone tool or [Opencode plugin](https://opencode.ai/docs/plugins/).

Has one runtime deps [`yake-ts`](https://www.npmjs.com/package/yake-ts) which handled the keywords extraction. 


```ts
import { getTitle } from "yatefca";

getTitle("resolve the bug with the widgets not resizing correctly");
// "resolve the bug resizing correctly"
```




## What's new

<!-- WHATSNEW:START -->
| Version | Highlights |
| ------- | ---------- |
| `1.2.0` | Deterministic session titler with ready-to-use opencode plugin |
<!-- WHATSNEW:END -->

Full history in [CHANGELOG.md](./CHANGELOG.md).

## Install

```bash
npm install yatefca   # bun / pnpm / yarn all fine
```

## Quick start

The core is one pure function: text in, title out. No state, no storage, no session concept.

```ts
import { getTitle } from "yatefca";

getTitle("fix flaky auth test in login flow");
// "fix flaky auth login flow"

getTitle("y");
// "" — too short/generic to say anything about
```

Want numbered titles ("#1", "#2", ...) or a guard against re-titling an already-titled session?
That's bookkeeping your host almost certainly already has a place for (a DB row, a session object,
a list index) — copy [`examples/session-numbering.ts`](./examples/session-numbering.ts) instead of
this library owning a second copy of that state.

## Opencode plugin

For [opencode](https://opencode.ai), no glue code needed — add the package to `opencode.jsonc`:

```jsonc
{
  "plugin": ["yatefca/opencode"]
}
```

Every session renames itself from its first message automatically. Under the hood, this hooks
opencode's `"chat.message"` event, and guards against re-titling twice with two checks stacked: a
per-plugin-instance "already titled this session" set, plus a live `client.session.messages` count
check that survives a plugin process restart (see [AGENTS.md](./AGENTS.md) for the full mental
model).

Want custom `TitleOptions` (e.g. a different `maxPhrases`)? Build your own instance instead of
using the default export:

```ts
// opencode.jsonc: "plugin": ["./my-plugin.ts"]
import { createYatefcaPlugin } from "yatefca/opencode";

export default createYatefcaPlugin({ maxPhrases: 4 });
```


> ps: "yatefca" is the result of a long lasting battle with NPM registry to find a none-too-similar name for this package.

## API

### `getTitle(text, options?) => string`

The pure algorithm. Empty, all-filler, or otherwise content-free input returns `""`.

### `TitleOptions`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `maxPhrases` | `number` | `3` | Max independent candidate phrases kept in the title. |
| `maxLength` | `number` | `60` | Hard cap on the rendered title's length. |
| `candidatePoolSize` | `number` | `8` | How many raw YAKE candidates to pull before filtering. |
| `filler` | `Iterable<string>` | `yake.stopwords` (English + a few chat words if unset too) | Words treated as filler when judging redundancy between candidates — a separate pass from `yake.stopwords`, though it defaults to following whatever that's set to; pass your own to override either independently. |
| `yake` | `YakeTsOptions` | — | Passed straight through to `yake-ts`'s `extractKeywords` (`stopwords`, `maxNgramSize`, ...). |

### `createYatefcaPlugin(options?) => Plugin` (from `yatefca/opencode`)

`options` is a `TitleOptions` (same table as above). The subpath's default export is the same thing
pre-built with defaults, for referencing by package specifier alone.

## Limitations

- **Not a summarizer.** It extracts words already present in the input — it won't produce a title
  that paraphrases or infers intent the way an LLM summary would.
- **Short input gives thin results**, same as `yake-ts` itself — a five-word prompt has almost no
  statistics to score; `getTitle` returns `""` rather than force a title out of nothing. See
  [`examples/session-numbering.ts`](./examples/session-numbering.ts) for a `"#{{counter}}"`
  fallback pattern.
- **English by default.** Pass `yake.stopwords` for other languages — see `yake-ts`'s own
  `yake-ts/stopwords/<code>` subpath exports; `filler` follows it automatically unless you also
  override `filler` itself.
- **The opencode plugin's restart-safety guard costs one extra API call** (`client.session.messages`)
  per `chat.message` event, to check the real message count rather than trust in-memory state alone.

## Development

```bash
bun install
bun run test         # bun test
bun run typecheck    # tsc --noEmit
bun run build        # vite → dist/
bun run format       # biome check --write
```

## License

[MIT](./LICENSE) © [jayF0x](https://github.com/jayf0x)
