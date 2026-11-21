# opencode-tokscope

[![npm version](https://img.shields.io/npm/v/opencode-tokscope.svg)](https://www.npmjs.com/package/opencode-tokscope)
[![license](https://img.shields.io/npm/l/opencode-tokscope.svg)](https://github.com/mihaellenic/opencode-tokscope/blob/main/LICENSE)
[![made for OpenCode](https://img.shields.io/badge/made%20for-OpenCode%20V2-1024D3)](https://opencode.ai/docs/plugins/)

**Which models and providers are fastest in your actual OpenCode usage? And are they getting faster or slower?**

Tokscope is an OpenCode V2 terminal UI plugin with:

- A full-screen `/tokscope` page comparing requests, token usage, response time, and median tokens per second for each model/provider pair.
- A daily median trend for the selected pair, with project and time-range filters.
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

The page opens with **all projects · today** (since local midnight). The active filters stay in the header, each followed by the key that changes it.

| Key | Action |
| --- | --- |
| `↑` / `↓` or `k` / `j` | Select a model/provider pair |
| `←` / `→` | Select a day in its trend |
| `s` | Choose current project or all projects |
| `t` | Choose today, last 7 / 30 / 90 days, or all history |
| `Esc` | Return to the previous screen |

**Sidebar:** shows up to three fastest pairs across **all projects on the connected instance**, each requiring at least **three measured calls since local midnight today**. Click anywhere in the widget to open the page. It refreshes after a model step completes and once a minute while visible. Read failures retain the last successful rows; no qualifying pairs shows `No models with 3+ calls today.`

## What the columns mean

- **Requests:** recorded assistant requests, including failed, cancelled, and in-progress requests, grouped by model and provider. All columns and selected details use the same scope and time-range filters. Requests of every reasoning setting for a model and provider are combined. Large counts are abbreviated (`5.2k`, `4.3M`).
- **Tokens = input + output + reasoning**, summed only for requests with all three valid categories reported. This means complete token records, not necessarily successful requests. Cache tokens are excluded. The short bars compare these totals across visible rows.
- **Details:** for the selected row.
  - **Prompt** = everything sent to the model: fresh input + cache read + cache write. Input alone is only the fresh, uncached part. Cache write is listed only when non-zero.
  - **Cache reuse** = cache read ÷ Prompt, with a bar. It is token reuse, not a per-request cache-hit rate.
  - **Generated** = output + reasoning.
  - Each category sums its valid reported values independently, so these can include requests that Tokens (which needs all three of input, output, and reasoning) leaves out.
- **Response:** recorded request duration, from creation to stream end (full response time, not time to first token), excluding tool settlement time. The table shows the median (**p50**); selected details show **p50** and **p95**, where 95% of responses finished within the p95 time. Only completed, non-errored requests with valid timestamps and a positive duration qualify; a missing stream end means no response measurement.
- **Speed:** median generated tok/s, defined below. Its eligibility rules do not limit Requests or token totals.
- **n/a:** no valid data for that metric, not zero. Recorded zero token counts remain `0`. Rows without Speed data remain selectable after measured rows.

## What tok/s means

One sample is one completed model request (assistant step), including main-agent, subagent, and background activity:

```text
tok/s = (tokens.output + tokens.reasoning) / ((time.streamed - time.created) / 1000)
```

- Comparisons use the **median of individual request rates**, not an average or total tokens divided by total duration.
- The interval ends when the provider response body ends, excluding tool settlement time. Input and cache tokens do not count.
- Speed measurements require completion without error, a recorded stream end, positive duration, and positive generated tokens. Failed, cancelled, and in-progress requests are excluded from Speed only.
- Requests without usable throughput data show **n/a** for Speed, never zero throughput.
- Existing history is read through the connected OpenCode server, including requests made before installation when the recorded data supports measurement. Daily trends use the local calendar day of completion; missing days are gaps, not zeros.

## Project links

- [Contributing and local development](https://github.com/mihaellenic/opencode-tokscope/blob/main/CONTRIBUTING.md)
- [MIT license](https://github.com/mihaellenic/opencode-tokscope/blob/main/LICENSE)
