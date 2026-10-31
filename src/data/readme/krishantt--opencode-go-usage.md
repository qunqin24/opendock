# @krishantt/opencode-go-usage

OpenCode Go usage limits — with burn-rate pacing — in the OpenCode TUI status bar.

```
GO r4% · w42% ⚠10h/2d · m21% ⚠3d/18d
```

Shows rolling / weekly / monthly quota consumption of the managed OpenCode Go
provider, and warns when your current burn rate will exhaust a window before
it resets.

## Install

Requires OpenCode v2.2+ and the OpenCode Go provider.

```json title="~/.config/opencode/cli.json"
{
  "plugins": ["@krishantt/opencode-go-usage"]
}
```

Restart the TUI. The indicator appears after its first fetch (up to a minute).

## Reading the bar

Per window: `r` rolling (5h), `w` weekly, `m` monthly, as percent consumed.

| Glyph | Meaning |
| --- | --- |
| (none) | fine |
| `▲` | window at ≥ 85% — nearly spent |
| `!` | window currently rate-limited; value shows `→<time>` until reset |
| `⚠eta/reset` | at your current pace this window hits 100% in *eta*, but only *reset* remains — plan accordingly |
| `GO ⋯` | first fetch in flight |
| `GO ?` | fetch failed or hung; see debug below |

Pacing is linear extrapolation of your own usage (samples kept ~6 h in memory,
rebuilds after a TUI restart) and only appears when exhaustion actually
precedes the reset — otherwise the bar stays clean. Warns need ≥ 10 minutes
of history per window; rolling warns only count your current 5h cycle.

## Debug

Run `/go-usage-debug` in the prompt (also in the Ctrl+P palette) to toggle
fetch logging to `~/.cache/opencode/go-usage-debug.log`: raw response
envelopes, errors with stacks, and toggle events. Off by default and resets
to off on restart because it logs a couple of lines per poll.

## Status bar placement

`prompt.footer.status` and `home.footer.status` via TUI plugin slots. These
and `context.client.experimental.usage.limits` are OpenCode v2 internals and
may change between releases — if the bar goes missing or shows `GO ?`, check
this repo's issues and your `~/.local/share/opencode/log/opencode.log`.

## License

MIT
