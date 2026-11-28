# opencode-go-usage-limits

If this panel helps you, please star the repo on GitHub—it helps other OpenCode users find it!

[![npm](https://img.shields.io/npm/v/opencode-go-usage-limits)](https://www.npmjs.com/package/opencode-go-usage-limits)
[![CI](https://github.com/987poiuytrewq/opencode-go-usage-limits/actions/workflows/ci.yml/badge.svg)](https://github.com/987poiuytrewq/opencode-go-usage-limits/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Your [OpenCode Go](https://opencode.ai) usage limits in the OpenCode V2 sidebar. See the rolling 5-hour, weekly and
monthly meters at a glance, whether you're ahead of or behind pace, and when each one resets, without leaving OpenCode.

<img src="https://raw.githubusercontent.com/987poiuytrewq/opencode-go-usage-limits/main/demo/pace.svg" alt="The OpenCode Go panel in pace mode: the 5-hour meter at 42% and behind pace, Weekly at 61% and ahead of pace, Monthly at 28% and behind pace" width="464" />

## Features

- **All three Go meters** in one sidebar panel: 5-hour, weekly and monthly.
- **Pace view:** each bar compares how much you've used with how much of the window has passed, so you can see at a
  glance whether you're on course to run out early.
- **Full view:** two-line meters with the percentage used, a reset countdown and a runout warning.
- **One-click switching:** click `pace` or `full` in the panel's title to change view.
- **Follows your theme:** colours come from your active OpenCode theme.
- **Nothing to set up:** uses the workspace OpenCode is already signed in to. It doesn't read API keys or show spend
  or billing details.

## Requirements

- OpenCode **V2 with TUI plugin support**. CI tests against OpenCode `2.2.7`, `2.3.2` and `2.4.2`.
- An OpenCode Console workspace with an active **OpenCode Go** subscription.
- [Bun](https://bun.sh), if installing from source.

## Install from npm

This is a TUI-only plugin, so it goes in the global CLI config at `~/.config/opencode/cli.json` (or
`$XDG_CONFIG_HOME/opencode/cli.json`), not in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-go-usage-limits"]
}
```

Or let OpenCode add it for you:

```bash
opencode plugin add opencode-go-usage-limits
```

Run `/reload` in the TUI. The **OpenCode Go** panel appears in the session sidebar.

## Install from source

1. Clone the repository and install its dependencies:

   ```bash
   git clone https://github.com/987poiuytrewq/opencode-go-usage-limits.git
   cd opencode-go-usage-limits
   bun install
   ```

2. Add the clone's absolute path to the `plugins` array in `~/.config/opencode/cli.json`:

   ```json
   {
     "$schema": "https://opencode.ai/v2/cli.json",
     "plugins": [
       {
         "package": "/absolute/path/to/opencode-go-usage-limits"
       }
     ]
   }
   ```

3. Run `/reload` in the TUI. The **OpenCode Go** panel appears in the session sidebar.

## Using the panel

The panel has two views. Click the label at the right of the **OpenCode Go** title to switch between them. Set
[`mode`](#configuration) to choose which one you start in.

### Pace view

The default, shown at the top of this page. Each row shows a meter's label, a bar and the percentage used.

The bar compares usage with how much of the window has passed:

| Segment | Meaning |
| --- | --- |
| Green `━` | Usage up to the elapsed part of the window. You're on pace. |
| Grey `━` | Elapsed time you haven't used yet. You're behind pace. |
| Yellow `━` | Usage beyond the elapsed part of the window. You're ahead of pace. |
| `─` | The rest of the window. |

A meter at 100%, or one OpenCode marks as limited, turns red.

In the screenshot at the top, the 5-hour meter is behind pace (42% used, halfway through the window), Weekly is ahead
of pace (61% used, halfway through), and Monthly is behind pace (28% used, a third of the way through).

### Full view

Each meter takes two lines: its name and reset countdown, then the percentage used and a bar.

<img src="https://raw.githubusercontent.com/987poiuytrewq/opencode-go-usage-limits/main/demo/expanded.svg" alt="The OpenCode Go panel in full mode: 5-hour at 42% resetting in 2h 30m, Weekly at 61% resetting in 3d 12h with a runout warning for Sun 18:00, Monthly at 28% resetting in 20d" width="464" />

| Element | Meaning |
| --- | --- |
| Countdown | Time until the meter resets, such as `4h 42m`, `5d 13h`, `<1m` or `now`. |
| Bar colour | Green below 80%, yellow from 80%, red at 100% or when the meter is limited. |
| `⚠` and a time | The meter is on course to run out before it resets, and roughly when. In the screenshot, Weekly is on course to run out on Sunday at 18:00, before it resets in 3d 12h. |

The runout time is shown as a local time for the 5-hour meter (`⚠ 10:45`, to the nearest 15 minutes), a local day and
hour for the weekly meter (`⚠ Sat 20:00`) and a UTC date for the monthly meter (`⚠ Dec 2`).

### How pace and runout are worked out

Both use the meter's reset time to infer when its window started: 5 hours before for the 5-hour meter, 7 days before
for the weekly meter, and the same day and time in the previous calendar month for the monthly meter.

The runout warning assumes your average rate since the window started continues:

```text
time to run out = time elapsed × (100 − percent used) / percent used
```

Keep in mind:

- **Monthly figures are approximate.** Go resets the monthly allowance when your paid period renews, which may not
  line up with a calendar month.
- **Projections are linear.** A burst of activity or a quiet spell will move the real runout time.
- **No warning is shown** when a meter is already used up, usage is zero, the reset time is missing or past, or the
  window resets before it would run out.
- **Spend and balance aren't shown.** For those, use OpenCode Console: **Activity › Usage** and **Settings › Billing**
  for owners and admins, or **My usage** under **Activity** for members.

### Refreshing

The panel loads usage when it appears, then every 60 seconds. A refresh is skipped while the previous one is still
running, so a slow connection can't queue up requests. Change the interval with [`refreshMs`](#configuration).

## Configuration

Pass options in the plugin's entry in `cli.json`. Every option is optional. For a source install, use the clone's
absolute path as the `package` value:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-go-usage-limits",
      "options": {
        "mode": "expanded",
        "refreshMs": 30000
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `mode` | `"pace"` | The view to start in: `"pace"`, or `"expanded"` for the full view. Other values fall back to `"pace"`. |
| `refreshMs` | `60000` | How often usage reloads, in milliseconds. Clamped to between 15 seconds and 30 minutes; non-numbers fall back to the default. |

Run `/reload` or restart OpenCode after changing options.

## Troubleshooting

| You see | What to do |
| --- | --- |
| No **OpenCode Go** panel | Run `opencode plugin list` to check the plugin is listed and active. Check that it's in `cli.json`, not `opencode.json`. For a source install, check the path points at the clone root and that `bun install` has run there. Then `/reload`. Load errors are written to `~/.local/share/opencode/log/opencode.log`. |
| **OpenCode Go usage is unavailable for this workspace** | OpenCode returned no Go meters. Check the workspace has an active Go subscription and that OpenCode is signed in to it. |
| A network or sign-in error | Check your connection and OpenCode sign-in. The panel retries on the next refresh. |
| Options have no effect | Put `options` on the matching entry in `cli.json`, use the exact values above, then `/reload`. |
| Usage looks stale | Lower `refreshMs` (minimum 15 seconds), then `/reload`. |
| Rows are cut off or bars look short | The panel clips rather than wraps. Widen the sidebar. |
| The monthly runout date looks wrong | See [How pace and runout are worked out](#how-pace-and-runout-are-worked-out). The monthly window is an estimate. |

## Releasing

Releases are published to npm by GitHub Actions after a GitHub Release is published. To make a release:

1. Set the `version` in `package.json` to the release version and merge that change to `main`.
2. Create and publish a GitHub Release with the matching `v`-prefixed tag (for example, package version `0.2.0` uses
   tag `v0.2.0`).
3. The release workflow checks that the release isn't a prerelease, the tag matches the version, and the commit is on
   `main`. It then runs `make ci` and `npm pack --dry-run`, and publishes to npm with provenance.

The npm package must be configured for **trusted publishing** on npmjs.com with GitHub Actions as the publisher:
repository `987poiuytrewq/opencode-go-usage-limits`, workflow `release.yml`, and environment `npm`. Trusted publishing
can only be added once the package exists, so the first version is published by hand with `npm publish --access
public`. The `npm` environment in the GitHub repository settings can be given required reviewers to gate publication.

## Development

```bash
make install
```

The plugin has no build step: `package.json` exports the TypeScript TUI entry directly.

### Project layout

| Path | Contents |
| --- | --- |
| `src/tui.tsx` | Plugin entry: sidebar slot, usage requests, refresh timer and Solid UI. |
| `src/pace.ts` | Pace view: elapsed-window maths and bar segments. |
| `src/usage.ts` | Formatting and runout estimates. |
| `src/settings.ts` | Option defaults, fallbacks and clamping. |
| `test/` | Unit, integration and end-to-end tests. |
| `demo/` | Screenshot capture script and the committed SVGs. |

### Tests

| Command | Runs |
| --- | --- |
| `make test` | Everything below except `test-e2e`. Needs no OpenCode binary. |
| `make format-check` | Formatting, and checks that the first JSON example in this README is strict JSON. |
| `make typecheck` | TypeScript. |
| `make test-unit` | Unit tests. |
| `make test-integration` | Renders the plugin in a test OpenTUI renderer against a mock host. |
| `make test-e2e` | Opt-in smoke test against a real OpenCode TUI in tmux. |

The end-to-end test needs `tmux` and the OpenCode CLI on `PATH`, plus `make install`. It runs in a temporary home
directory and Git repository, so it never touches your config or account. To use a specific binary:

```bash
make test-e2e OPENCODE_BIN=/path/to/opencode
```

Set `E2E_KEEP=1` to keep the temporary files after a passing run; failed runs keep them automatically, and
`make e2e-debug` prints their logs. If your checkout's path contains `#`, which OpenCode can't load plugins from, set
`E2E_PLUGIN_ROOT` to a path without one.

### Updating the screenshots

```bash
make demo
```

This renders both views through the real OpenTUI renderer with fake usage data and a frozen clock, then rewrites
`demo/pace.svg` and `demo/expanded.svg`. It needs no network access or OpenCode account.

## License

[MIT](LICENSE)
