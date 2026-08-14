# opencode-usage-sidebar

OpenCode TUI plugin that displays **Claude / Codex / Copilot** usage limits in the right sidebar, powered by [`usage-tui`](https://pypi.org/project/usage-tui/).

> Linux fork of [`hkay-dev/opencode-limits-sidebar`](https://github.com/hkay-dev/opencode-limits-sidebar) — same UI, swapped data source. The reference plugin polls the macOS-only `openusage` menu-bar daemon; this fork polls the cross-platform `usage-tui` Python CLI instead, so it works on Linux without a daemon.

## Prerequisites

1. **OpenCode** ≥ 1.3.13 (tested on 1.14.x)
2. **`usage-tui`** installed and authenticated:
   ```bash
   pipx install usage-tui
   usage-tui setup     # interactive provider setup (Claude / Codex / Copilot / OpenAI / OpenRouter)
   usage-tui doctor    # verify connectivity
   ```

## Install

### Via npm (after first publish)

```bash
opencode plugin @joserdf/opencode-usage-sidebar -g
```

### From source

```bash
mkdir -p ~/.config/opencode/plugins
cd ~/.config/opencode/plugins
git clone https://github.com/joserdf/opencode-usage-sidebar.git
cd opencode-usage-sidebar
npm install
npm run build
opencode plugin "$PWD" -g
```

Restart OpenCode after install. The sidebar header `USAGE LIMITS` should appear in the right sidebar within 30 seconds.

## How it works

Every 30 seconds the plugin spawns:

```
usage-tui show --provider all --window 5h --json
```

…parses the JSON, filters to `[claude, codex, copilot]`, and renders one row per provider with:

- Provider name + plan label (Session / Weekly / Monthly)
- Percentage used — computed as `(limit - remaining) / limit`
- Time-until-reset (`in 2h`, `in 24d`)

`usage-tui` reads each provider's local CLI credentials, so no extra auth lives inside OpenCode.

### Failure modes

| Condition | Behavior |
|---|---|
| `usage-tui` binary missing on `PATH` | Banner `usage-tui not installed`; last-good rows persist |
| Provider returns `error != null` | That row shows `—`; others keep updating |
| Transient JSON / network error | Silent retry on next cycle (last-good rows preserved) |

## Customizing providers

The provider allow-list is hard-coded at the top of `src/shared/usage-tui.ts`:

```ts
const PROVIDERS = ["claude", "codex", "copilot"] as const
```

`usage-tui` also supports `openai` and `openrouter`. To include them, add the keys to `PROVIDERS`, run `npm run build`, then `opencode plugin "$PWD" -g` again.

## Architecture

| Layer | File | Source |
|---|---|---|
| SolidJS sidebar UI (`ProviderLimits`, `LimitRow`) | `src/index.tsx` | upstream — unchanged |
| Types and rendering helpers | `src/shared/limits.ts` | upstream — unchanged |
| Data fetch + parse + translate | `src/shared/usage-tui.ts` | **new in this fork** |
| `fetchUsage()` body | `src/index.tsx` | rewritten to call the new module |
| Server-side hook | `src/server.ts` | upstream — unchanged (no-op) |

The translator boundary in `src/shared/usage-tui.ts` keeps UI types insulated from `usage-tui`'s schema, so a future schema change is a one-file fix.

## Credit

- Fork of [hkay-dev/opencode-limits-sidebar](https://github.com/hkay-dev/opencode-limits-sidebar) — the entire UI scaffolding (SolidJS + OpenTUI, sidebar slot registration, theming) is theirs.
- Data source: [`usage-tui`](https://pypi.org/project/usage-tui/) — Python CLI that aggregates AI-service quotas.

## License

MIT — see [LICENSE](./LICENSE). Original work © hkay-dev, fork © joserdf.
