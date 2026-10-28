# opencode-tokscope

[![npm version](https://img.shields.io/npm/v/opencode-tokscope.svg)](https://www.npmjs.com/package/opencode-tokscope)
[![license](https://img.shields.io/npm/l/opencode-tokscope.svg)](https://github.com/mihaellenic/opencode-tokscope/blob/main/LICENSE)
[![made for OpenCode](https://img.shields.io/badge/made%20for-OpenCode%20V2-1024D3)](https://opencode.ai/docs/plugins/)

**Which models and providers are fastest in your actual OpenCode usage? And are they getting faster or slower?**

Tokscope is an OpenCode V2 terminal UI plugin with:

- A full-screen `/tokscope` page comparing median tokens per second for each model/provider pair.
- A daily median trend for the selected pair, with project, time-range, and reasoning-setting filters.
- A clickable sidebar summary of the fastest pairs so far today (local calendar day).

![Real OpenCode session with the Tokscope widget in the sidebar: fastest model/provider pairs; illustrative capture](https://raw.githubusercontent.com/mihaellenic/opencode-tokscope/main/docs/images/tokscope-sidebar.png)

![Model/provider comparison and daily trend — synthetic mockup](https://raw.githubusercontent.com/mihaellenic/opencode-tokscope/main/docs/images/tokscope-overview.png)

## Install

Requires **OpenCode V2 TUI**.

```sh
opencode plugin add opencode-tokscope
```

## Use

Run `/tokscope`, or press `Ctrl+P` and select **Tokscope**.

The page opens with **all projects · last 30 days · all reasoning settings**. Active filters and measured/unavailable coverage remain visible.

| Key | Action |
| --- | --- |
| `↑` / `↓` or `k` / `j` | Select a model/provider pair |
| `←` / `→` | Select a day in its trend |
| `s` | Choose current project or all projects |
| `t` | Choose last 7 / 30 / 90 days or all history |
| `r` | Choose all / a recorded reasoning setting / unknown |
| `Esc` | Return to the previous screen |

**Sidebar:** shows up to three fastest pairs across **all projects on the connected instance**, each requiring at least **three measured calls since local midnight today**. Click anywhere in the widget to open the page. It refreshes after a model step completes and once a minute while visible. Read failures retain the last successful rows; no qualifying pairs shows `No models with 3+ calls today.`

## What tok/s means

One sample is one completed model request (assistant step), including main-agent, subagent, and background activity:

```text
tok/s = (tokens.output + tokens.reasoning) / ((time.streamed - time.created) / 1000)
```

- Comparisons use the **median of individual request rates**, not an average or total tokens divided by total duration.
- The interval ends when the provider response body ends, excluding tool settlement time. Input and cache tokens do not count.
- Measurements require completion without error, a recorded stream end, positive duration, and positive generated tokens. Failed, cancelled, and in-progress requests are excluded.
- Completed requests without usable data count as **unavailable**, never zero throughput. Pairs with only unavailable data appear after measured rows with `0` measured calls.
- Existing history is read through the connected OpenCode server, including requests made before installation when the recorded data supports measurement. Daily trends use the local calendar day of completion; missing days are gaps, not zeros.

## Project links

- [Contributing and local development](https://github.com/mihaellenic/opencode-tokscope/blob/main/CONTRIBUTING.md)
- [MIT license](https://github.com/mihaellenic/opencode-tokscope/blob/main/LICENSE)