# opencode-tok-speed-v2

**English** | [简体中文](README.zh-CN.md)

An OpenCode **V2** TUI plugin that shows the model's output token rate and TTFT in real time in the prompt footer status bar (`prompt.footer.status`).

```
42.3 tok/s · TTFT 1.6s
```

## What it looks like

| State | Display |
| --- | --- |
| Prompt submitted, no token yet | `0.0 tok/s · TTFT 1.2s` (TTFT keeps counting up) |
| Streaming normally | `42.3 tok/s · TTFT 1.6s` |
| Between tool calls / thinking pause | Falls back to `0.0 tok/s` |
| Turn finished | Keeps the last reading, rate drops to `0.0` |

TTFT climbs in real time, so you can see at a glance how long this turn has been stuck — when the context grows and things slow down, this is the first number to react.

## Install

```bash
opencode plugin add opencode-tok-speed-v2
```

Or drop it into the global plugin directory manually (hot-reloads on change, no restart needed):

```bash
git clone https://github.com/lcssos/opencode-tok-speed-v2 \
  ~/.config/opencode/plugins/opencode-tok-speed-v2
```

For TUI-only setups that never connect to a remote server, you can also add it to `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": ["opencode-tok-speed-v2"]
}
```

Verify it loaded:

```bash
opencode plugin list
```

## Development and build

The source entry point is `tui.tsx`; **the published entry point is the precompiled `tui.js`**. After editing the source you must rebuild and commit the artifact:

```bash
npm install
npm run build     # tui.tsx → tui.js
```

`tui.js` must be committed together with it. Both `publish.yml` and `release.sh` verify the two are in sync and abort the release if the build is stale.

### Why precompilation is mandatory

OpenCode's Solid JSX transform plugin only processes files outside `node_modules` (the `bun-plugin-solid` onLoad filter explicitly excludes `node_modules`). When the plugin is installed from npm, its entry point lives inside `node_modules/opencode-tok-speed-v2/`. If `exports["./tui"]` points directly at a `.tsx` file, the JSX is never transformed and the runtime tries to resolve `@opentui/solid/jsx-dev-runtime`, which fails:

```
Cannot find package '@opentui/solid' imported from
  ~/.cache/opencode/npm/opencode-tok-speed-v2@latest/.../opencode-tok-speed-v2/tui.tsx
```

That error looks like a missing peer dependency, but it really means "the entry point was never transformed". Compiling the `.tsx` into `.js` (with the same `babel-preset-solid` + `generate: "universal"` as the host) makes it load fine.

## Why not the built-in `session.tps`

`session.tps: true` in `cli.json` only shows the average rate for the turn **at the bottom of the assistant message**; it never reaches the status bar.

This plugin hooks the `prompt.footer.status` sub-slot, so its position is assigned by the layout system and it never overlaps other elements the way absolute positioning would.

Compared with similar plugins (e.g. `oc-tps`), this one focuses on trustworthy readings:

| | This plugin | Common approach |
| --- | --- | --- |
| Token estimation | Characters × ratio, corrected with real token counts each step (EMA) | Bytes ÷ constant, never corrected |
| Duplicate events | Deduplicated by `event.id` | No dedup, replays double the count |
| Multiple generations | `globalThis` singleton, new instance takes over the old one | Each instance keeps its own state and double-counts |
| Timeline | Always the server-side `event.created` | Mixes in the local clock, inflates rate on batched delivery |
| TTFT origin | `step.started.data.started` (per-step timing) | Session-level origin, which includes the previous stretch |

## How the numbers are computed

### Rate

```
(accumulated characters × tokens-per-char ratio) / (request start → last token)
```

- The real token count isn't available while streaming, so it's estimated from characters. The ratio starts at 0.5 (Chinese is roughly 2 chars/token) and is corrected after each step using the server's `tokens.output + tokens.reasoning`, smoothed with an EMA — so it gets more accurate the more you use it.
- After each step the value is corrected once more with the real token count, which keeps it consistent with the built-in assistant footer's tok/s.
- The formula includes time-to-first-token, so it lines up with the built-in footer.

### TTFT

```
time of first streamed token - session.step.started's data.started
```

The origin is `step.started.data.started` rather than `session.execution.started`: a single execution may contain multiple steps (tool calls in the middle), and using the execution origin would count the previous step's time too.

## Pitfalls hit during implementation

Four things that noticeably distort the readings if left unhandled:

1. **The TUI calls `setup` on the same plugin multiple times** (multiple generations coexist and the old instance is never cleaned up). Every instance subscribing to events would double-count tokens and duplicate the label. So state and subscriptions are collapsed into a `globalThis` singleton; a new instance tears down the old one before taking over.
2. **The event stream replays.** The same `event.id` may be delivered more than once, so deduplication is mandatory — otherwise token counts double.
3. **The local `Date.now()` cannot serve as the rate timeline.** The server can deliver several increments packed into the same millisecond, and local time is also affected by read batching; a squashed span inflates the rate several-fold. Always use `event.created` (server time). The local clock is only used for silence detection, i.e. "how long since the last token".
4. **A cumulative average is more trustworthy than an instantaneous window.** Under real event pacing, the instantaneous rate over the last N seconds bounces between tens and hundreds, while the cumulative average approaches the final value monotonically.

## Configuration

All at the top of `tui.tsx` (remember to run `npm run build` afterwards):

| Constant | Default | Description |
| --- | --- | --- |
| `SHOW_TTFT` | `true` | Set to `false` for a plain `x.x tok/s` |
| `MIN_TTFT_MS` | `200` | Don't show TTFT below this value (`started` and the first token in the same millisecond carry no information) |
| `IDLE_MS` | `1000` | Zero out the rate after this long without a token |
| `HIDE_WHEN_IDLE` | `false` | Set to `true` to hide the whole cell after the turn ends |
| `TICK_MS` | `500` | Refresh interval |
| `MIN_SPAN_MS` | `1200` | Don't display until there's enough data, to avoid flashing a low number |
| `MIN_CHARS` | `40` | Same as above, character threshold |
| `DEFAULT_TOKENS_PER_CHAR` | `0.5` | Initial token/char ratio, auto-corrected per step |

To exclude reasoning from the rate, just remove the `session.reasoning.delta` subscription.

## Compatibility

Developed and verified on OpenCode **v2.2.5**. Depends on `context.data.on` and `context.ui.slot` from `@opencode/plugin/tui`; event names come from the V2 schema:

`session.step.started` / `session.step.ended` / `session.step.failed` / `session.text.delta` / `session.reasoning.delta` / `session.idle`

## Releasing

### One-command release (recommended)

```bash
npm run release patch    # 0.1.0 → 0.1.1
npm run release minor    # → 0.2.0
npm run release major    # → 1.0.0
npm run release 1.2.3    # explicit version
```

The `scripts/release.sh` script: bumps the version → commits → creates the `vX.Y.Z` tag → pushes.

After the tag is pushed, GitHub Actions (`.github/workflows/publish.yml`) publishes to npm automatically.

Four checks run before publishing; any failure aborts immediately:

| Check | Description |
| --- | --- |
| Clean working tree | Uncommitted changes are rejected so unrelated edits don't end up in the release commit |
| On `main` | Other branches are rejected |
| `tui.js` in sync with `tui.tsx` | Rebuilds if stale and prints the diff, telling you to commit first |
| Version format | Only `patch` / `minor` / `major` or `X.Y.Z` |

On the CI side it also verifies the tag matches the `package.json` version, whether that version already exists on npm, that `tui.js` and `tui.tsx` are in sync, and that no JSX is left in the entry point.

Watch release progress:

```bash
gh run watch
```

### First-time setup: npm Trusted Publisher

CI uses **OIDC trusted publishing**; no npm token is stored in the repository. You need to authorize it once on the npm website:

1. Open <https://www.npmjs.com/package/opencode-tok-speed-v2/access>
2. Find the **Trusted Publisher** section and click **GitHub Actions**
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Organization or user | `lcssos` |
   | Repository | `opencode-tok-speed-v2` |
   | Workflow filename | `publish.yml` |
   | Environment name | leave empty |
   | Allowed actions | check **Allow npm publish** |

4. Save.

Notes:

- After configuring, the first publish must happen **within 2 days**, otherwise the configuration expires and must be deleted and recreated.
- `repository.url` in `package.json` must exactly match the GitHub repository (npm compares them and refuses to publish on a mismatch).
- After a successful publish, npm automatically generates a provenance attestation for the package (source: public repo + OIDC).

### Manual publish (fallback)

If OIDC isn't configured, or you just want a one-off publish:

```bash
npm publish --access public
```

npm now requires one of the following to publish:

- 2FA enabled on the account — enter the 6-digit TOTP code when publishing;
- A Granular Access Token with **Bypass two-factor authentication** checked.

The token approach suits non-interactive environments; be careful never to commit it.

## License

MIT
