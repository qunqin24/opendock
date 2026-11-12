<p align="center">
  <a href="https://github.com/miguelmartens/opencode-gearbox">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/brand/banner-readme-dark.svg">
      <img src="assets/brand/banner-readme-light.svg" width="880" alt="gearbox: automatic transmission for OpenCode">
    </picture>
  </a>
</p>

<h3 align="center">Automatic transmission for OpenCode.</h3>

<p align="center">
  Gearbox picks the reasoning effort for every prompt and every subagent,<br>
  and the cheapest model that fits each subagent. <strong>You stop shifting by hand.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-gearbox"><img src="https://img.shields.io/npm/v/opencode-gearbox?style=flat-square&color=34343A&labelColor=0C0C0D&label=npm" alt="npm"></a>
  <a href="https://github.com/miguelmartens/opencode-gearbox/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/miguelmartens/opencode-gearbox/ci.yml?style=flat-square&color=34343A&labelColor=0C0C0D&label=ci" alt="CI"></a>
  <img src="https://img.shields.io/badge/opencode-V2%20%E2%89%A5%202.2.6-34343A?style=flat-square&labelColor=0C0C0D" alt="OpenCode V2 2.2.6+">
  <img src="https://img.shields.io/badge/judge%20bench-75%20prompts-34343A?style=flat-square&labelColor=0C0C0D" alt="Judge benchmark: 75 labelled prompts">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-34343A?style=flat-square&labelColor=0C0C0D" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://getgearbox.dev"><strong>Website</strong></a> ·
  <a href="#install"><strong>Install</strong></a> ·
  <a href="#supported-models">Models</a> ·
  <a href="#the-five-gears">Gears</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#board">Board</a> ·
  <a href="#options">Options</a> ·
  <a href="#how-model-switching-decides">Model switching</a>
</p>

<p align="center">
  <img src="assets/brand/statusbar.svg" width="720" alt="Status bar: high · haiku-5-5 · 38% context · cache 4:12 · Auto">
</p>

---

## Why

You pick a variant, forget it, and burn `max` effort on `rename this variable`. Or you leave it on `low` and the hard bug gets a shallow answer. Subagents inherit your most expensive model even when they only grep.

Gearbox fixes that. A small judge model rates each prompt. Gearbox shifts the effort for the turn and gives each subagent its own level and a cheaper model when it fits. A status bar shows what it chose and why.

```
⚙ high · haiku-5-5 · ◔ 38% · cache 4:12 · Auto
```

Gearbox is built for **Claude models** first; other models with effort variants work too (see [Supported models](#supported-models)). It is an OpenCode plugin and does not run in Claude Code. It was inspired by [HeyCubit/effortless](https://github.com/HeyCubit/effortless), a Claude Code mod, but written from scratch for OpenCode V2.

## The five gears

<p align="center"><img src="assets/brand/gears.svg" width="760" alt="Gears 1 to 5: low, medium, high, xhigh, max"></p>

| Gear | Level    | Typical prompt                      | Subagent model on the ladder | Expected output |
| :--: | -------- | ----------------------------------- | ---------------------------- | --------------: |
|  1   | `low`    | Renames, lookups, one-line fixes    | cheapest                     |      800 tokens |
|  2   | `medium` | Everyday edits; also the fallback   | middle                       |    3 000 tokens |
|  3   | `high`   | Debugging across files              | the chat model               |    8 000 tokens |
|  4   | `xhigh`  | Refactors, design trade-offs        | the chat model               |   16 000 tokens |
|  5   | `max`    | Full reasoning, or say "max effort" | the chat model               |   32 000 tokens |

The "typical prompt" column is a guide; the judge decides.

## What it does

- **Auto effort.** The judge rates each main-chat prompt `low | medium | high | xhigh | max`. Gearbox applies that level as the model's matching variant settings on every request of the turn.
- **Subagents.** Each task-tool subagent gets its own level. By default it also gets a model from your provider's price ladder on its first prompt, because a fresh subagent has no cache to lose. A subagent whose agent file sets `model` keeps that model; Gearbox only sets its effort.
- **No judge for the obvious cases.** Follow-ups (`ok`, `go`, `yes please`, `continue`) reuse the last level. "max effort", "low effort" and the other level names in a prompt set that level directly, unless a negation comes just before ("no need for max effort").
- **Never in your way.** If you pick a variant yourself, Gearbox pauses for that session and tells you once. A judge timeout, an unreadable answer or a provider error falls back to the last level, else `medium`. The judge never blocks a prompt.
- **Context care.**
  - Compaction summaries are written by the judge model (see [Pick a fast judge](#pick-a-fast-judge)) when that is cheaper than the session's own compaction and the conversation fits the judge's context. A warm session cache can make the session's model cheaper; then OpenCode compacts as usual. A judge summary that takes over 30 s also falls back to OpenCode. The summary model receives the whole conversation, so a judge model picked automatically from another provider (e.g. your `small_model`) is never used for it: compaction stays with OpenCode, and handoff summaries use the session's model.
  - `/gearbox handoff` starts a fresh session seeded with a summary.
  - A warning when the context gets swamped.
  - Handoff advice when the work has moved on.
- **Stats, save mode and budget.**
  - Per session: user turns per level, model requests, tokens, cost and judge cost.
  - Save mode caps effort for a few hours.
  - An optional daily spend budget turns save mode on at 80%. It counts the cost each provider reports per request. A reported cost of 0 (subscriptions) is trusted, so on those providers only judge calls add to the spend.
- **Benchmark.** `/gearbox bench` scores a judge model on 75 labelled prompts.

## Benchmark

> [!WARNING]
> **Partial run, not comparable across setups.** The 2026-11-11 run was stopped after 30 of 432 planned task runs. Each setup ran a different 3 to 7 of the 24 tasks, so a row reflects its own tasks as much as its effort control. One of the two failures (always max, `m07`) ended with a transport error after 324 s, well before the 15-minute task limit; its cause is not yet known. A full run will replace these numbers. Raw data and coverage: [bench/README.md](bench/README.md#published-runs).

<!-- The block between bench:start and bench:end is generated from the published bench run. Do not edit it by hand. -->
<!-- bench:start -->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/bench/chart-dark.svg">
  <img src="assets/bench/chart-light.svg" width="720" alt="Tasks solved vs cost per task for each setup">
</picture>

| Setup                 |   Solved | Output tokens / task | Cost / task | Time / task | Cost vs always-high |
| --------------------- | -------: | -------------------: | ----------: | ----------: | ------------------: |
| always medium         |     100% |                 1.8k |     $0.0053 |        16 s |                −66% |
| always high           |     100% |                13.6k |      $0.016 |        68 s |            baseline |
| always xhigh          |     100% |                19.1k |      $0.019 |        93 s |                +23% |
| always max            |      67% |                37.2k |       $0.03 |       207 s |                +94% |
| gearbox · effort only |      83% |                14.0k |      $0.016 |        67 s |                 +3% |
| **gearbox auto**      | **100%** |             **4.5k** |  **$0.007** |    **28 s** |            **−55%** |

<sub>18 tasks × 1 run · model opencode-go/claude-haiku-5-5 · judge opencode-go/claude-haiku-5-5#none · OpenCode 2.2.6 · Gearbox 0.2.0 · 2026-11-11 · medians, judge cost included. [Method and raw data](bench/README.md)</sub>
<!-- bench:end -->

## Supported models

Gearbox works per model, not per provider. A model is supported when its OpenCode catalog entry has at least one effort variant named after a level (`low`, `medium`, `high`, `xhigh`, `max`). Gearbox copies the chosen variant's settings into each request, so it speaks whatever API the model uses.

Only Claude models usually have all five levels. Many GPT, DeepSeek and other models stop at `high`, or offer only some levels. When the model lacks the judged level, Gearbox uses the nearest lower variant. If there is no lower one, it uses the nearest higher one. For example, on a model with `low`, `medium` and `high`:

| Judged level      | Variant sent |
| ----------------- | ------------ |
| `low` … `high`    | the same     |
| `xhigh` and `max` | `high`       |

On a model with only `high` and `max`, a `low` turn runs on `high`. The status bar shows both, e.g. `xhigh→high`. `/gearbox stats` counts the turn at the judged level, and `/gearbox debug` shows the variant actually sent. Variants such as `none`, `minimal` and `thinking` are never used for effort.

| Models                               | API                                    | Status on OpenCode 2.2.6                                 |
| ------------------------------------ | -------------------------------------- | -------------------------------------------------------- |
| **Claude** (e.g. `claude-haiku-5-5`) | Anthropic Messages (`output_config`)   | **Primary target.** Verified, and the recommended judge  |
| GPT (e.g. `gpt-6-luna`)              | OpenAI Responses (`reasoning.effort`)  | Verified                                                 |
| DeepSeek and other OpenAI-compatible | OpenAI-compatible (`reasoning_effort`) | Verified                                                 |
| Gemini, Mistral                      | Google (`thinkingConfig`), Mistral     | Should work; unverified                                  |
| Any model without effort variants    | any                                    | Runs unchanged; the bar says `Paused: no effort control` |

What "Claude first" means:

- The end-to-end run and the judge benchmark used Claude through the `opencode-go` provider. Claude through `anthropic` or any other provider that speaks Anthropic Messages gets the same treatment.
- The recommended judge is a Claude Haiku model with thinking off (`#none`); it scored 71/75 at about 1 s per answer.
- The 5-minute default cache TTL in the status bar matches Anthropic. For other providers it is an assumption; set `settings.cache.ttl` to correct it.
- Model switching for subagents needs model prices. Subscription catalogs without prices give effort control only.

## Install

**Requirements:** OpenCode **V2, 2.2.6 or later** (V1 is not supported). Bun 1.4 or later only to develop and run the tests.

Add the package to the `plugins` list of your global (`~/.config/opencode/opencode.jsonc`) or project `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-gearbox"],
}
```

To set options, use the object form:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-gearbox",
      "options": { "judge": { "model": "anthropic/claude-haiku-5-5#none" }, "bias": 1 },
    },
  ],
}
```

OpenCode reloads its plugins when you save the config, so no restart is needed. The TUI status bar ships in the same package and loads with it.

To run it from a checkout, use the absolute path of the repository instead of the package name. The path must be a directory.

### Pick a fast judge

The judge must answer within `judge.timeoutMs` (4 s by default), or the turn falls back to the last level. The same model writes compaction and handoff summaries. Gearbox uses, in order:

1. `judge.model`.
2. Your `small_model` (V2 stores it as the `title` agent's model).
3. The cheapest tool-capable model of the session's provider.
4. The session's own model.

For options 2–4, Gearbox picks the model's `none`, `minimal` or `low` variant when it has one, so the judge does not think for long. An explicit `judge.model` is used as given: add the variant yourself, e.g. `#none`.

Run `/gearbox bench` for your judge, and `/gearbox bench provider/model` for a candidate, before you rely on it. In the end-to-end run on `opencode-go`, `claude-haiku-5-5#none` scored 71/75 at about 1 s per answer. `deepseek-v4.1-flash` was often overloaded and missed the 4 s timeout. See `test/e2e/CHECKLIST.md`.

## Try it

After you install Gearbox, open the TUI in any project and watch the status bar while you work through these steps. The judge decides, so your levels can differ by a step.

1. **A small task.** Send `rename the variable x to count`. The bar shows `low` or `medium`.
2. **A hard task.** Send `debug why the tests fail across these modules`. The bar shows `high` or above.
3. **A named level.** Send `max effort: review this design`. The bar shows `max`, and no judge call is made.
4. **A follow-up.** Send `ok`. Gearbox reuses the last level without the judge.
5. **Your own pick.** Choose a variant by hand. The bar shows `Paused: manual variant`. Run `/gearbox auto on` to hand control back.
6. **A subagent.** Ask for work that starts a subagent, e.g. `use a subagent to find every TODO`. Its first request runs on a cheaper model from the ladder when your provider lists prices.
7. **The numbers.** Run `/gearbox stats` for turns, tokens and cost, `/gearbox debug` for the last decision, and `/gearbox bench` to score your judge.

## Commands

All output appears as a toast or, for long text, as a dialog. No model turn is started.

| Command                   | What it does                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/gearbox`                | Status: level, model, mode, reason, context, save mode, today's spend                                  |
| `/gearbox help`           | The command list                                                                                       |
| `/gearbox auto on\|off`   | Automatic effort on or off. `on` also resumes a session paused by a manual variant                     |
| `/gearbox set <key> <v>`  | Change a setting, e.g. `set bias -1`, `set judge.model openai/gpt-6-luna#none`, `set judge.model null` |
| `/gearbox settings`       | Show the current settings                                                                              |
| `/gearbox save [on\|off]` | Cap effort at `saveMode.cap` for `saveMode.hours`                                                      |
| `/gearbox stats`          | User turns per level, model requests, tokens, cost and judge cost for this session                     |
| `/gearbox bench [p/m]`    | Score the judge model (or `provider/model[#variant]`) on the 75 labelled prompts; see below            |
| `/gearbox handoff [full]` | Continue in a fresh session seeded with a summary. `full` also writes `HANDOFF.md`                     |
| `/gearbox compact [note]` | Compact now; the summary keeps `note` in mind, whether the judge model or OpenCode writes it           |
| `/gearbox debug`          | Last decision, the judge's raw answer, whether a judge call is running, and the last request's model   |
| `/gearbox board`          | Write the [board](#board), a local page of every session and project, and open it in the browser       |

Plugin commands run from the TUI (or `client.session.command`). `opencode run "/gearbox …"` sends the text as a normal prompt.

In `/gearbox stats` a **turn** is one user prompt, counted once at the level Gearbox set for it. A turn Gearbox did not route (auto off, paused by a manual variant, or a model without effort control) counts as **manual**. A **request** is one model call; a turn with tool calls makes several. Tokens and cost add up per request. Stats of a deleted session are removed, and daily spend is kept for 30 days.

`/gearbox bench` retries a failed judge call (timeout or provider error) once. It prints how many cases were answered, the score over the answered cases and over all 75, and lists wrong answers ("Misses") apart from cases that got no answer. Bench calls are real spend: they count in today's spend (and the budget), and the bench output shows their cost, but they stay out of the session's stats.

## Status bar

```
⚙ <level>[→<sent>] · <model> · ◔ <context %> · cache <m:ss> · <Auto | Manual | Paused: reason> [· ↻ handoff? | · ⚠ swamped]
```

- **Level:** the effort of the current turn. `→<sent>` follows when the model lacks that level and Gearbox sent the nearest variant instead (see [Supported models](#supported-models)).
- **Model:** the model id without the provider and a leading `claude-`.
- **Context:** how full the context window is.
- **Cache:** how long the provider's prompt cache stays warm. It uses the model's `settings.cache.ttl`, else the provider's `settings.cache.ttl`, else 5 minutes.
- **Mode:** `Manual` means `auto` is off. `Paused: manual variant` means you picked a variant. `Paused: no effort control` means the model has no effort variants.

## Board

<p align="center"><img src="assets/board/board-preview.png" width="720" alt="The Gearbox board, with sample data: effort mix per day, spend per day, judge answer times, subagent model switches and sessions"></p>

The board shows how Gearbox shifted across all your sessions and projects: the effort mix per day, spend per day against the budget, judge answer times and timeouts, subagents moved to a cheaper model, and every session as a strip of its turns. Switch between 7, 30 and 90 days, or pick one project. The preview above uses sample data.

Run `/gearbox board`. Gearbox writes one self-contained HTML file and opens it in your browser:

- `<OpenCode data dir>/gearbox/board.html`, usually `~/.local/share/opencode/gearbox/board.html`;
- `~/.local/share/opencode-gearbox/board.html` when OpenCode has no data directory.

If no browser opens, the toast gives the path. Run the command again to refresh the page.

The page is built from a turn log that Gearbox keeps in plugin storage: one record per user turn (or subagent run) with its project, session title, model, level, tokens, cost and judge result. The page has no server, makes no network requests and carries its own fonts. Nothing leaves your machine.

Two plugin options control the log. Set them in the plugin entry's `options`; `/gearbox set` does not change them.

| Key                   | Default | Meaning                                                                    |
| --------------------- | ------- | -------------------------------------------------------------------------- |
| `board.retentionDays` | `90`    | Days of turns to keep; older records are removed once a day                |
| `board.titles`        | `true`  | Store session titles. `false` stores none, and the board shows session IDs |

```jsonc
{ "package": "opencode-gearbox", "options": { "board": { "retentionDays": 30, "titles": false } } }
```

## Options

Options from the plugin entry are the base. Changes made with `/gearbox set` are stored on top of them, in plugin storage (key `settings`). Gearbox never writes to `opencode.json(c)`.

| Key                          | Default    | Meaning                                                                                                    |
| ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `auto`                       | `true`     | Choose effort automatically                                                                                |
| `bias`                       | `0`        | Shift every level (judged, follow-up or named) by −2…2 steps                                               |
| `floor`                      | `"low"`    | Lowest level Gearbox may choose                                                                            |
| `ceiling`                    | `"max"`    | Highest level Gearbox may choose                                                                           |
| `saveMode.until`             | `null`     | Save mode end (epoch ms); set by `/gearbox save`                                                           |
| `saveMode.cap`               | `"medium"` | Highest level while save mode is on                                                                        |
| `saveMode.hours`             | `5`        | How long `/gearbox save` lasts                                                                             |
| `judge.model`                | unset      | Judge and summary model, `provider/model[#variant]`. Unset: see [Pick a fast judge](#pick-a-fast-judge)    |
| `judge.timeoutMs`            | `4000`     | How long a turn waits for the judge before it falls back                                                   |
| `modelSwitch.main`           | `false`    | Reserved. **No effect:** the main chat gets effort only (see below)                                        |
| `modelSwitch.subagents`      | `true`     | Give subagents without an explicit `model` a model from the price ladder                                   |
| `modelSwitch.minSavingRatio` | `0.2`      | A resumed subagent's switch must save at least this share of the cost of staying                           |
| `compactWith`                | `"small"`  | `small`: the judge model writes compaction summaries when cheaper. `session`: OpenCode compacts as usual   |
| `swampedAt`                  | `0.7`      | Context ratio for the swamped warning                                                                      |
| `handoffAdviceFrom`          | `0.3`      | Context ratio from which the judge is asked, every second prompt, whether a handoff would help             |
| `budget.dailyUSD`            | `null`     | Daily spend budget. At 80% one warning, and save mode turns on. Above 100%, a warning every turn           |
| `effortModels`               | `".*"`     | Regular expression of model ids Gearbox manages. Other models run unchanged and are left out of the ladder |

The levels, lowest to highest: `low`, `medium`, `high`, `xhigh`, `max`. Shaping order: `bias`, then `floor` and `ceiling`, then the save-mode cap.

## How model switching decides

Gearbox only switches between models of the session's own provider and never picks a model above the session's own model.

**The ladder.**

- **Who is on it:** every enabled, tool-capable model of the provider whose id matches `effortModels`.
- **Price limit:** its output price is at or below the chat model's. Models without a price (subscription catalogs with an empty `cost`) are left out.
- **Order:** cheapest first, with the chat model last.

**Which rung a level gets.**

- `low` → the cheapest model.
- `medium` → the middle of the ladder.
- `high`, `xhigh`, `max` → the chat model itself.

**Subagents** (`modelSwitch.subagents`, on by default). A subagent's model can only change in its prompt hook. So in a child session Gearbox waits for the judge there, at most `judge.timeoutMs` in total, session and catalog reads included.

- **First prompt:** the child has no cache yet, so Gearbox switches it to the ladder model with the matching variant.
- **Later prompts** (a resumed subagent): the child holds a warm cache. Gearbox changes its model only when the cost check below (with `minSavingRatio`) says switching is cheaper than staying. So a resumed child never climbs to a pricier model; its effort still follows the level.
- **Effort rungs first:** the subagent ladder skips cheaper models without effort variants, unless no model on it has any.
- **Your pick wins:** an agent with its own `model` keeps it. While the root session runs on a variant you picked (and you have not run `/gearbox auto on`), its subagents are left alone too.
- **No model of its own:** a subagent whose session has no model is routed from its nearest ancestor's model, else from OpenCode's default model. If that ancestor runs on a picked variant, the subagent keeps it.

A free or "contributor" model at the bottom of the ladder may not suit you; leave it out with `effortModels`, e.g. `"^(?!.*free).*$"`.

**Main chat.** Gearbox never switches the main chat's model; it sets effort only.

**The cost check** (resumed subagents; the cache counts as warm only on the model that served the last request):

- Staying costs `context × (warm ? cache-read price : input price) + expected output × output price`.
- Switching costs `context × cache-write price (else input price) + expected output × the target's output price`.
- Gearbox switches only when switching costs at most `1 − minSavingRatio` of staying.

Expected output per level is 800, 3 000, 8 000, 16 000 and 32 000 tokens.

**OpenCode 2.2.6 limits.**

- 2.2.6 does not fire the `experimental.model.resolve` hook, the only place a main-chat switch could happen per request. So the main chat gets effort only and `modelSwitch.main` does nothing. Gearbox does not register the hook; main-chat switching will be built and probed against a release that fires it.
- Effort goes through the `context` hook on every agent-loop step. Gearbox copies the chosen variant's settings into the request options, e.g. `output_config.effort` on Anthropic and `reasoning.effort` on OpenAI.

## Development

```
bun install
bun test                # tests
bun run format:check    # formatting
bun run check           # both
```

- `src/core/`: pure decisions, with no OpenCode imports.
- `src/server/`: the OpenCode V2 hooks.
- `src/tui/`: the status bar.
- `docs/api-probe.md`: the verified OpenCode V2 API facts.
- `docs/adr/`: architecture decision records ([guidance](https://architecture-decision-record.github.io/en-us/)).
- `test/e2e/CHECKLIST.md`: the manual end-to-end run against a real OpenCode.

## Brand

Logo, emblems and banners live in [`assets/brand/`](assets/brand). They are free to use when you write or talk about Gearbox. Show that your project runs on it:

```md
[![Shifted by Gearbox](https://raw.githubusercontent.com/miguelmartens/opencode-gearbox/main/assets/brand/badge-shifted-by-gearbox.svg)](https://github.com/miguelmartens/opencode-gearbox)
```

## Credits

- The 75 labelled benchmark prompts in `bench/judge-cases.json` come from [HeyCubit/effortless](https://github.com/HeyCubit/effortless) (MIT). They were taken via [tehchaoz/effortless-opencode](https://github.com/tehchaoz/effortless-opencode) (MIT). See [NOTICE.md](./NOTICE.md).
- No code is shared with either project.

## License

MIT © Miguel Martens. Gearbox is an independent project and is not affiliated with OpenCode.

<p align="center"><br><img src="assets/brand/emblem-round.svg" width="140" alt="Gearbox emblem"></p>
