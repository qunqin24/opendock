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
| **Context** | thin pressure bar, model limit | last assistant message carrying usage, after the last completed compaction and before the revert boundary; limit from `ModelInfo.limit.context` |
| **Git** | current branch | `data.location.vcs.info()` |
| **Meta** | model, family cost, family tokens, family cached tokens, elapsed time, active reasoning | session store plus `session.reasoning.*` events |
| **Subagents** | one row per subagent session: state, name, model and task, running work first, capped at six | the root session's family (`parentID`), the host's condensed `session.status()` and terminal `outcome` |

Sections with no data render nothing. A missing known limit collapses the section: the host already shows the exact token count, so the row would only repeat it.

- **Context ≠ session total.** Context is what the current window holds, computed with the host's own usage algorithm. The cumulative figures are labelled `Tokens` and `Cached`, so the two are never mixed.
- **Cost, Tokens and Cached** describe the same scope: the root session's family, so subagent work is counted once, and cached reads get their own dim row instead of inflating `Tokens`.
- **Subagents** covers every session the host groups under the root one (those with a `parentID`), capped at six with `+N more` for the overflow. Running beats a lingering terminal outcome; a session that neither runs nor finished reads as `stopped`, never as a guessed `done`. Durations tick while a subagent runs and freeze when the host marks it ended.
- **Pressure** is the only adaptive reading: `calm` below 70%, `warn` at 70%, `critical` at 90%. It colors the Context dot; the bar itself sits on the theme accent — one cell of fill at any usage above zero, the full row at 100%.
- **Reasoning** reads `active` only while reasoning content streams. It is never inferred from a model name.

The panel paints exclusively with the host theme tokens (text, hue and categorical ramps, with one documented fallback when a theme has no semantic accent), so it reads correctly on OpenCode's light and dark themes.

## Requirements

- Node.js 22.18+
- Tested with OpenCode 2.1.x

## Development

Requires Node.js 22.18+ and pnpm.

```sh
pnpm install
pnpm test
pnpm build
pnpm verify:pack
```

`verify:pack` packs the tarball, runs the host's real `Host.resolve` against the installed layout, imports both entrypoints and fails when either one loses its default export — or when the README ships an image — a Markdown `![]()` line or an HTML `<img>` tag — whose source is not absolute.

Node 22.18 is the floor because `dist/index.js` re-exports TypeScript and the host loads it with Node's own type stripping, which is unflagged from that release on.

CI runs the typecheck, the tests and the build on the minimum supported Node and on the current LTS, and verifies the packed artifact on a job of its own.

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
    subagents.ts  Subagent rows: states, names, durations, summary
    usage.ts     Token totals, context window, pressure
test/            Vitest unit tests
scripts/         Build helpers
docs/design/     Design references
```

## License

MIT, copyright © 2026 Federico Bordón.
