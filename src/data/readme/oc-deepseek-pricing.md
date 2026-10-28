# oc-deepseek-pricing

An OpenCode v2 TUI plugin that displays the current DeepSeek API pricing window in the prompt footer and session sidebar.

The indicator is shown when the selected model ID contains `deepseek`. DeepSeek off-peak rates are half of peak rates.

### Footer indicator

The plugin displays the current DeepSeek pricing window and the remaining time in the OpenCode footer.

![DeepSeekpricingindicatorintheOpenCodefooter](./images/footer.png)

### Detailed pricing status

Run `/deepseek-pricing` to display the current state, reason, next transition, local transition time, and Chinese calendar date.

![DetailedDeepSeekpricingstatus](./images/toast_image.png)


## Features

- Displays the current pricing window in the prompt footer.
- Displays a compact pricing status in the session sidebar.
- Exposes complete pricing details through `/deepseek-pricing`.
- Distinguishes peak and off-peak periods with whale emoji indicators.
- Shows the next pricing transition and a countdown.
- Treats weekends as fully off-peak.
- Supports Chinese public-holiday overrides.
- Warns when the holiday calendar does not cover the current Chinese calendar year.
- Uses local computation only; no network request is needed at runtime.

## Pricing schedule

Peak windows are evaluated in UTC:

- 01:00-04:00 UTC, Monday through Friday;
- 06:00-10:00 UTC, Monday through Friday.

All other times are off-peak, including:

- 04:00-06:00 UTC on weekdays;
- all hours after 10:00 UTC and before 01:00 UTC;
- Saturdays and Sundays in full;
- Chinese public holidays in full.

The off-peak price multiplier is 0.5.

## Installation

Install the published plugin directly with the OpenCode CLI:

```sh
opencode plugin add oc-deepseek-pricing
```

To install this exact release:

```sh
opencode plugin add oc-deepseek-pricing@0.1.0
```

OpenCode registers the plugin automatically. No manual change to `cli.json`, `opencode.json`, or `tui.jsonc` is required.

Verify the installation with:

```sh
opencode plugin list
```

## Requirements

- OpenCode v2 with TUI plugin support;
- a terminal supported by OpenCode.

Development dependencies include:

- `@opencode/plugin`;
- `@opentui/core`;
- `@opentui/solid`;
- `solid-js`;
- TypeScript.

## Repository structure

```text
oc-deepseek-pricing/
├── CALENDAR_UPDATE.md
├── LICENSE
├── README.md
├── bun.lock
├── package.json
├── src/
│   ├── holidays.ts
│   ├── pricing.test.ts
│   ├── pricing.ts
│   └── tui.tsx
├── tsconfig.json
└── tui.ts
```

## Development setup

Install dependencies:

```sh
bun install
```

Run all validation checks:

```sh
bun run check
```

Run the test suite:

```sh
bun test
```

A successful validation completes without formatting, lint, TypeScript, or test errors.

## Restarting OpenCode

After changing the plugin source or configuration, close the OpenCode TUI completely and start it again.

Opening a new conversation is not necessarily sufficient because plugin entrypoints are loaded during TUI startup.

## Expected interface

When a DeepSeek model is selected during an off-peak window, the prompt and home footers display:

```text
🐋💤 off-peak · 9h 13m left
```

During a peak window, they display:

```text
🐳 peak · 1h 15m left
```

The session sidebar displays only the current status and remaining time:

```text
Status 🐋💤 off-peak
9h 13m left
```

During a peak window, the sidebar displays:

```text
Status 🐳 peak
1h 15m left
```

Run `/deepseek-pricing` to display the complete pricing details:

```text
DeepSeek pricing
Status 🐋💤 off-peak
Reason outside peak windows
Next peak in 9h 13m
At 10/28/2026, 2:00:00 AM
China 2026-10-27
```

The `Next` line intentionally uses the state name without an emoji. If the Chinese public-holiday calendar does not cover the current year, the command also displays a warning.

The exact local transition time depends on the operating-system timezone and daylight-saving rules. Pricing classification is based on UTC, while holiday lookup uses the Asia/Shanghai calendar date.

## Chinese public holidays

Holiday data is stored in:

```text
src/holidays.ts
```

Only officially verified calendar years should be added to `COVERED_HOLIDAY_YEARS`.

For the complete annual update procedure, source requirements, timezone rules, validation checklist, and required tests, see [CALENDAR_UPDATE.md](./CALENDAR_UPDATE.md).

If the current Chinese calendar year is not covered, the plugin continues to apply the normal UTC weekday and weekend schedule but displays a coverage warning. Do not suppress the warning by adding a year without adding and reviewing the complete official calendar.

## Tests

The test suite covers:

- the first weekday peak window;
- the off-peak gap between the two peak windows;
- the second weekday peak window;
- exact peak-window boundaries;
- weekends;
- ordinary weekday off-peak periods;
- Chinese public-holiday overrides;
- calendar-year coverage;
- next-transition calculation;
- weekend skipping when finding the next peak period;
- duration formatting;
- invalid date handling.

Run:

```sh
bun test
```

## Type checking

Run:

```sh
bun run typecheck
```

The repository uses NodeNext module resolution. Relative TypeScript imports must therefore use the emitted JavaScript extension, for example:

```ts
import { getPricingSnapshot } from "./pricing.js"
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
