# opencode-glm-extras

TUI plugin for [opencode](https://opencode.ai) with extras for the Z.ai **GLM Coding Plan**:

- **Rate indicator** in the left sidebar: shows whether you are in off-peak (0.5x credits) or peak (1x) hours, with a countdown to the next transition. Per [Z.ai docs](https://docs.z.ai/devpack), peak is Mon–Fri 14:00–18:00 UTC+8; everything else is off-peak at 50% credit rate.
- **Prompt navigation**: `PgUp` / `PgDn` jump to the previous / next **user prompt** in the session. Past the first/last prompt they fall through to the built-in top/bottom scroll. Also available as palette commands ("GLM Extras" category).

## Install

Add to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-glm-extras"]
}
```

## Options

Pass a `[name, options]` tuple to configure the peak window or keys:

```json
[
  "opencode-glm-extras",
  {
    "peak": {
      "start": "14:00",
      "end": "18:00",
      "days": [1, 2, 3, 4, 5],
      "utcOffsetMinutes": 480
    },
    "promptNav": { "pageUp": "pageup", "pageDown": "pagedown" }
  }
]
```

| Option | Default | Description |
| --- | --- | --- |
| `peak.start` / `peak.end` | `"14:00"` / `"18:00"` | Peak window in the plan's timezone (must not cross midnight) |
| `peak.days` | `[1,2,3,4,5]` | Days with a peak window (0 = Sunday, 1 = Monday … 6 = Saturday; default is Mon–Fri) |
| `peak.utcOffsetMinutes` | `480` | UTC offset of the plan's timezone (UTC+8 Singapore) |
| `promptNav.pageUp` / `pageDown` | `pageup` / `pagedown` | Keys bound to previous/next prompt |

## Notes

- The indicator counts time only; it does not fetch quota data (see
  [@slkiser/opencode-quota](https://www.npmjs.com/package/@slkiser/opencode-quota)
  for 5-hour/weekly credit windows in the sidebar).
- Prompt jumps anchor on the last user prompt and step through visible
  messages, mirroring the TUI's own scrolling. Very short prompts can
  occasionally be skipped due to the TUI's scroll margin.
- Bindings are active only while a session is open; `PgUp`/`PgDn` keep their
  normal behavior on the home screen.

## License

MIT
