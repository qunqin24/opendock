# Hush

Minimal telemetry for the [OpenCode](https://opencode.ai) TUI: the context window's pressure, the Git branch and the secondary session metrics the host does not draw. Quiet while everything is healthy, specific when something needs attention.

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/federicobordon09-dev/opencode-Hush/main/docs/design/hush-tema-claro.png" alt="Hush sidebar panel on a light OpenCode theme" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/federicobordon09-dev/opencode-Hush/main/docs/design/hush-tema-oscuro.png" alt="Hush sidebar panel on a dark OpenCode theme" /></td>
  </tr>
</table>

Every figure comes from the plugin context; nothing is estimated, scraped, or fetched from outside the local runtime.

## Install

```sh
opencode plugin add opencode-hush
```

Restart OpenCode afterwards. The command prints no progress, and the first load can take close to a minute while the host fetches and precompiles the plugin.

## What it shows

| Section | Content | Where it comes from |
| --- | --- | --- |
| **Context** | tokens in the window, model limit, thin pressure bar | last assistant message carrying usage, after the last completed compaction and before the revert boundary; limit from `ModelInfo.limit.context` |
| **Git** | current branch | `data.location.vcs.info()` |
| **Meta** | model, family cost, family tokens, family cached tokens, elapsed time, active reasoning | session store plus `session.reasoning.*` events |

Sections with no data render nothing. A missing limit still shows tokens, just without a pressure bar.

- **Context ≠ session total.** Context is what the current window holds, computed with the host's own usage algorithm. The cumulative figures are labelled `Tokens` and `Cached`, so the two are never mixed.
- **Cost, Tokens and Cached** describe the same scope: the root session's family, so subagent work is counted once, and cached reads get their own dim row instead of inflating `Tokens`.
- **Pressure** is the only adaptive reading: `calm` below 70%, `warn` at 70%, `critical` at 90%. It colors the Context dot; the bar itself sits on the theme accent — one cell of fill at any usage above zero, the full row at 100%.
- **Reasoning** reads `active` only while reasoning content streams. It is never inferred from a model name.

The panel paints exclusively with the host theme tokens (text, hue and categorical ramps, with one documented fallback when a theme has no semantic accent), so it reads correctly on OpenCode's light and dark themes.

## Requirements

- Node.js 22.12+
- Tested with OpenCode 2.1.x

## Development

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm test
pnpm build
pnpm verify:pack
```

`verify:pack` packs the tarball, runs the host's real `Host.resolve` against the installed layout, imports both entrypoints and fails when either one loses its default export — or when the README ships an image that is not absolute.

## Structure

```
src/
  index.ts       Server entrypoint: inert, so the package resolves as a plugin
  tui.tsx        TUI entrypoint: claims slots and releases them on deactivate
  telemetry.ts   Reactive session state: store reads, clock, event subscriptions
  panel.tsx      Presentation: sidebar panel
  core/
    bar.ts       Width contract for the context bar's fill
    format.ts    Token, percent, duration and cost formatting
    usage.ts     Token totals, context window, pressure
test/            Vitest unit tests
scripts/         Build helpers
docs/design/     Design references
```

## License

MIT, copyright © 2026 Federico Bordón.
