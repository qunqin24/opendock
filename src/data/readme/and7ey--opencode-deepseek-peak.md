# opencode-deepseek-peak

An [OpenCode 2](https://opencode.ai/v2) TUI plugin that shows whether the current DeepSeek API time is
**PEAK** or **OFF-PEAK**, next to the prompt. During peak it renders in red.

The banner appears **only while the selected provider is the native `deepseek` provider**; switch to
another provider (including `opencode-go/deepseek-*` or `openrouter/deepseek/*`) and it disappears.

```text
DS PEAK | LOCAL 10:40 CEST | next 12:00 CEST
```

`PEAK` is shown in the theme's error colour; `OFF-PEAK` is muted.

The schedule is calculated locally from UTC. No API request or credentials are needed.

## Schedule

According to the [official DeepSeek API pricing page](https://api-docs.deepseek.com/quick_start/pricing/), peak pricing is:

- `01:00–04:00 UTC`
- `06:00–10:00 UTC`

The intervals are half-open: `01:00` is peak, `04:00` is off-peak, `06:00` is peak, and `10:00` is off-peak.

The displayed clock uses the computer's system timezone, including automatic daylight-saving changes. The timezone abbreviation is shown after the local time (for example, `CET`, `CEST`, or `PST`).

## Install

Add the plugin to your global **CLI** config (`~/.config/opencode/cli.json`), not `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@and7ey/opencode-deepseek-peak"]
}
```

OpenCode installs npm plugins with Bun on startup. Restart OpenCode after changing `cli.json`.

### From a local checkout

```bash
git clone https://github.com/and7ey/opencode-deepseek-peak.git
cd opencode-deepseek-peak
npm install
```

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-deepseek-peak"]
}
```

## Options

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "@and7ey/opencode-deepseek-peak",
      "options": { "slot": "prompt.footer.status" }
    }
  ]
}
```

| Option | Default                 | Meaning                                      |
| ------ | ----------------------- | -------------------------------------------- |
| `slot` | `prompt.footer.status`  | V2 prompt slot to append the banner to.      |

`prompt.footer.status` is the status area of the prompt footer. Other V2 slots you can try:
`prompt.footer`, `prompt.footer.file`, `session.composer.top`.

## Development

```bash
npm test
```

The pure logic in `deepseek-peak-status.mjs` (peak windows, local-time formatting, next transition,
clock) is covered by `deepseek-peak-status.test.mjs` using `node --test`.
`opencode-deepseek-peak-tui.mjs` is the V2 CLI plugin entrypoint and is only exercised inside OpenCode.

## Credits

A port of [kolodziejm/opencode-deepseek-pricing](https://github.com/kolodziejm/opencode-deepseek-pricing)
to the OpenCode 2 plugin API. MIT.

## License

[MIT](./LICENSE)
