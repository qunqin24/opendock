# opencode-ds-peak

[![npm version](https://img.shields.io/npm/v/opencode-ds-peak.svg)](https://www.npmjs.com/package/opencode-ds-peak)
[![npm downloads](https://img.shields.io/npm/dm/opencode-ds-peak.svg)](https://www.npmjs.com/package/opencode-ds-peak)
[![CI](https://github.com/MendelDamian/opencode-ds-peak/actions/workflows/ci.yml/badge.svg)](https://github.com/MendelDamian/opencode-ds-peak/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/opencode-ds-peak.svg)](https://github.com/MendelDamian/opencode-ds-peak/blob/main/LICENSE)

**See whether DeepSeek is charging full or half price right now.**

DeepSeek charges full price during peak hours and half price the rest of the
time. This OpenCode TUI plugin adds a small live block to your sidebar showing
the current price tier and how long until the next switch.

<img src="assets/sidebar.svg" alt="Preview: the sidebar block shows OFF-PEAK in green with a countdown, and switches to red PEAK in a peak window. The dot turns amber when the switch is under 30 minutes away." width="920">

It runs with no configuration. The block follows your OpenCode language, uses
DeepSeek's published schedule, and only appears in sessions that use a DeepSeek
model.

## Requirements

- **OpenCode 1.18.x or 2.0.x.** The package ships both plugin shapes at once:
  the v1 TUI plugin (`tui`) and the v2 CLI plugin (`setup`). Each OpenCode
  release loads the entry it understands.
- No Node or Bun setup. OpenCode installs npm plugins for you.

Verified against OpenCode 2.0.22 and 1.18.34. v2 support ships in
`opencode-ds-peak` 0.3.0 and newer.

## Install

One package serves both OpenCode lines. OpenCode 2.x reads the v2 CLI plugin
entry; OpenCode 1.x reads the v1 TUI plugin entry.

### OpenCode 2.x

```sh
opencode plugin add opencode-ds-peak
```

OpenCode installs the package, adds it to your global config, and loads it on
the next start.

To keep the plugin CLI-only, so it also runs when the CLI is connected to a
remote server, add the package to `~/.config/opencode/cli.json` instead:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-ds-peak"]
}
```

### OpenCode 1.x

```sh
opencode plugin opencode-ds-peak -g
```

Or add the entry yourself. Use `~/.config/opencode/tui.json` for every project,
or `.opencode/tui.json` for one:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-ds-peak"]
}
```

Restart OpenCode, then open the sidebar with your leader key plus `b` (default
`ctrl+x`, then `b`). The block appears above the built-in context section.

> **The block only appears in sessions that use a DeepSeek model.** Open a
> session with any other model and the sidebar stays empty by design. If you are
> not sure it is working, run `/peak`.

## Verify it works

Run `/peak` from the command palette. It reports the current tier and the next
switch for any session, whether or not that session uses DeepSeek. If it opens,
the plugin is installed.

For the sidebar block itself, open a session whose model id contains
`deepseek`, then toggle the sidebar (leader + `b`).

## Uninstall

On OpenCode 2.x, run `opencode plugin remove opencode-ds-peak`, or remove
`opencode-ds-peak` from the `plugins` array in `~/.config/opencode/opencode.json`
or `~/.config/opencode/cli.json`. On OpenCode 1.x, remove it from the `plugin`
array in `tui.json` (global or project). Restart OpenCode.

If you set `notify` or changed the view or language through `/peak`, those
choices are stored under the plugin's keys and can be cleared from OpenCode's
key-value store.

## Why

- **The switch is silent.** DeepSeek changes price without notice. The block
  states the current tier so you do not have to track the schedule.
- **A countdown.** The block shows the time until the next switch, so you can
  decide whether to wait.
- **Only for DeepSeek sessions.** The block appears when the active session uses
  a DeepSeek model and hides otherwise.

## Features

- The status dot is green off-peak, red at peak, and yellow when peak starts
  within 30 minutes.
- The countdown updates every 60 seconds. It shows whole days past 24 hours,
  whole hours past one, and minutes below that.
- The wording follows the state. During peak it reads "in 3h"; during off-peak,
  "8h left".
- A compact one-line mode. It drops the box and shows the dot with the label.
- Chinese public holidays are off-peak. A built-in table covers 2026, and you
  can add your own dates.
- The schedule is configurable. Override the peak windows, the weekdays, and the
  holiday list.
- Optional notifications. A single toast appears when the price tier changes
  while a DeepSeek session is active, even when the sidebar is closed.
- A `/peak` command. It shows the current tier and the next switch, and changes
  the view, the notifications, and the language.
- Five languages: English, Polish, Spanish, German, and Chinese. The plugin
  detects your locale.
- One package for OpenCode v1 and v2. The two entries share the same logic, so
  the sidebar, command and schedule behave the same on both.
- No runtime dependencies. The i18n layer is hand-rolled and the package ships
  raw `.tsx`.

## Schedule

Peak hours are 01:00 to 04:00 and 06:00 to 10:00 UTC, Monday through Friday.
Everything else is off-peak, including weekends and Chinese public holidays.

The built-in holiday table covers China 2026. DeepSeek follows the Chinese
holiday calendar, so a weekday holiday is off-peak. Add dates for other years
through the `schedule.holidays` option, or turn the table off with
`schedule.builtinHolidays: false`.

The label reads `HOLIDAY` only on a working-day holiday. On a holiday that falls
on a weekend it stays `OFF-PEAK`, since the day is off-peak either way.

DeepSeek defines prices in UTC. The plugin computes the window in UTC and
renders it in your local time zone, and it handles daylight saving. In Poland
that works out to:

| Season        | Peak (local)                   | Off-peak (local)                   |
| ------------- | ------------------------------ | ---------------------------------- |
| Summer (CEST) | 03:00 to 06:00, 08:00 to 12:00 | 12:00 to 03:00 + weekends/holidays |
| Winter (CET)  | 02:00 to 05:00, 07:00 to 11:00 | 11:00 to 02:00 + weekends/holidays |

## Configuration

Every option is optional. These are the defaults:

| Option                    | Type       | Default                          | Description |
| ------------------------- | ---------- | -------------------------------- | ----------- |
| `locale`                  | string     | system locale                    | UI language. One of `en`, `pl`, `es`, `de`, `zh`. Detected from `LC_ALL`, `LC_MESSAGES` or `LANG` when omitted, falling back to `en`. |
| `view`                    | string     | `box`                            | `box` for the bordered block, `line` for a single compact line. |
| `notify`                  | boolean    | `false`                          | Show a toast when the tier changes while a DeepSeek session is active. |
| `schedule.days`           | number[]   | `[1,2,3,4,5]`                    | Peak weekdays as ISO numbers, `1` for Monday through `7` for Sunday. |
| `schedule.windows`        | string[][] | `[["01:00","04:00"],["06:00","10:00"]]` | Peak windows as `[from, to]` `HH:MM` UTC pairs. Half-open, so `to` is the first off-peak minute. |
| `schedule.holidays`       | string[]   | `[]`                             | Extra off-peak dates as `YYYY-MM-DD` UTC keys. |
| `schedule.builtinHolidays`| boolean    | `true`                           | Include the built-in China 2026 holiday table. |

A full example:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-ds-peak",
      {
        "locale": "pl",
        "view": "line",
        "notify": true,
        "schedule": {
          "days": [1, 2, 3, 4, 5],
          "windows": [["01:00", "04:00"], ["06:00", "10:00"]],
          "holidays": ["2026-12-25"]
        }
      }
    ]
  ]
}
```

Bad values fall back to the default for that field. A window or day list keeps
its valid entries and falls back to the default only when none are valid. An
empty window or day list means peak never applies, which turns peak off
entirely. An invalid holiday date is dropped.

## Command

Run `/peak` from the command palette. It opens a menu with the current tier and
the next switch, plus settings:

- **Sidebar** switches between `box` and `line`.
- **Notifications** turns the transition toast on or off.
- **Language** opens a list of the five UI languages.

The settings persist and override the matching config option.

## Languages

English `en`, Polish `pl`, Spanish `es`, German `de`, Chinese `zh`. Pick a
language from `/peak`; the choice persists and overrides the `locale` option.
Otherwise the plugin detects your locale from the environment.

To add a language, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Troubleshooting

**The sidebar shows nothing.**
The block is hidden unless the active session uses a DeepSeek model. Open a
session whose model id contains `deepseek` (for example `deepseek/...`, or a
provider route that includes it). Also make sure the sidebar is open. Use leader
key plus `b` by default. Running OpenCode with `--pure` disables all external
plugins, so the block will not load.

**I want to confirm the plugin is installed.**
Run `/peak`. It responds for every session, not only DeepSeek ones.

**The countdown looks wrong.**
The schedule is defined in UTC and rendered in your local time zone; daylight
saving is handled automatically. Check that your system clock and time zone are
correct.

**Holidays are wrong.**
The built-in table covers China 2026 only. Add other dates with
`schedule.holidays`, or set `schedule.builtinHolidays: false` to ignore it.

**Notifications do not appear.**
Turn them on in `/peak`. A toast appears only when the tier changes while a
DeepSeek session is active.

**My config changes do not apply.**
OpenCode reloads config on restart. A bad value falls back to its default
without an error. On v1 the options live in `tui.json`. On v2 they live beside
the `plugins` entry in `opencode.json` or `cli.json`.

## FAQ

**Does it work with DeepSeek through OpenRouter, or a self-hosted route?**
Yes. A model counts as DeepSeek when the provider id or model id contains
`deepseek`, for example `openrouter/...deepseek...`.

**Does it make network calls or phone home?**
No. There is no network access, no telemetry, and no runtime dependency. The
schedule is computed locally.

**Can I turn peak pricing off, or use a different schedule?**
Yes. Override `schedule.windows` and `schedule.days`, or set both to empty
arrays to turn peak off permanently.

**Will it work on OpenCode v2?**
Yes, since 0.3.0. One package serves both the v1 and v2 plugin APIs. See
[Requirements](#requirements).

**How do I add a language?**
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

- Questions, ideas and show-and-tell: [Discussions](https://github.com/MendelDamian/opencode-ds-peak/discussions).
- Bugs and feature requests: [open an issue](https://github.com/MendelDamian/opencode-ds-peak/issues).
- Problems with OpenCode itself: [OpenCode Discord](https://opencode.ai/discord).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, how to add
a language, and how releases are cut.

## License

MIT
