# future-clock

Experiment: **what does a coding agent do if it believes it is running N years in the future?**

This repository contains `future-clock`, a plugin for [opencode](https://opencode.ai) **v2** that shifts the **year** the model perceives as "now". It also contains the test suite and the experiment that measured the effect. With `years: 120`:

```
Today's date: Mon Oct 12 2026   →   Today's date: Mon Oct 12 2146
```

Only the year changes. Day, month, time, and day of the week stay as they are.

---

## Experiment results

8 prompts × 2 groups (control without the plugin, treatment with `years: 120`) × 2 repetitions, model `opencode-go/claude-haiku-5-5`, for a total of 32 runs. Full report in [docs/experiments/future-report.md](docs/experiments/future-report.md). The experiment prompts were written in Brazilian Portuguese (the original language of the study) and are kept verbatim in `scripts/experiment-prompts.ts`.

- **The model trusts the system clock.** "Que dia é hoje?" ("What day is it today?") was answered with 2146 without hesitation, and the subagent agreed.
- **Distrust is rare.** In 1 of 2 `Get-Date` runs the model suggested checking the clock because "a data é bem à frente do que é comum" ("the date is far ahead of what is usual").
- **Inconsistent calendar.** "Mês passado / mês que vem" ("Last month / next month") was answered in 2146, but with the days of the week from 2026.
- **The real world doesn't fit.** The web is still in 2026. One run noticed the conflict; another attributed to 2146 a Node version released in 2026.
- **Real side effect.** Asked to create a log "com a data de hoje no nome" ("with today's date in the name"), the model wrote `log-2146-10-12.log` to disk.

---

## Requirements

- **opencode v2.** Tested with 2.0.27. v1 is not supported (incompatible plugin API).
- **Bun.** Tested with 1.3.14.
- Windows + PowerShell 7 is the tested environment. The sandbox and experiment scripts use paths from this machine (see [Test environment](#test-environment)).

## Quick start

### From npm

The plugin is published as [`opencode-future-clock`](https://www.npmjs.com/package/opencode-future-clock). In the `opencode.json` of the project where you want to simulate the future:

```json
{
  "plugins": [
    { "package": "opencode-future-clock", "options": { "years": 120 } }
  ]
}
```

`opencode plugin add opencode-future-clock` also works, but it adds the plugin to the **global** config, where it applies to every project and loads before the project's plugins.

### From source

```powershell
bun install
bun run build
```

The build produces the **directory** `dist\future-clock\` (`package.json`, `server.js`, README and LICENSE), which is the exact content published to npm. opencode v2 only accepts local plugins as a directory; file paths and `file://` URLs are rejected.

Use the absolute path of that directory in your clone:

```json
{
  "plugins": [
    { "package": "C:\\path\\to\\future-clock\\dist\\future-clock", "options": { "years": 120 } }
  ]
}
```

Put `future-clock` **in the project config and last in the array**. That way it runs after the global plugins (see [Coexistence with other plugins](#coexistence-with-other-plugins)).

### Configuration

`years` is the only option.

| Option | Type | Default | Rule |
|---|---|---|---|
| `years` | integer | `120` | `years >= 4` or `years <= -3`; the resulting year must be between 1000 and 9999 |

Any other key, or an invalid value, makes the plugin fail at load time with an explicit message. The `>= 4` and `<= -3` limits ensure that applying the swap twice does not shift the year again, even if the real year rolls over between two events.

---

## How it works

The plugin swaps the year in four sources of "now":

| | Source | Mechanism |
|---|---|---|
| S1 | `Today's date: …` in the system prompt | `context` hook |
| S2 | `Today's date is now: …` (day rollover in the middle of a session) | `context` hook |
| S3 | `The current year is YYYY` in tool descriptions (e.g., `websearch`) | `context` hook |
| S4 | Output of commands that read the clock in `shell` (`Get-Date`, `date`, `[DateTime]::Now`, `Date.now()`, `datetime.now()`, …) | `execute.after` hook |

After all the hooks, a **final pass** in the `http.request` hook rewrites the body of the request sent to the provider, using the same rules. This is what guarantees the "last word" (see below).

There are two swap modes:

- **`context`** (system, descriptions, day rollover): the year changes only inside date-shaped patterns, such as `2026-10-12`, `Mon Oct 12 2026`, `October 12, 2026`, `12 de outubro de 2026`, `12/10/2026`, and `current year is 2026`. An arbitrary `v2026` is left intact.
- **`clock`** (clock command output): every year token delimited by non-digits changes, including the prefix of `yyyyMMdd`.

The target years are the real year and its neighbors (±1). That way, "next month" in December is also covered.

The plugin **only changes what the model sees**. Command arguments, the system clock, and files are not touched. If a hook fails, the error is logged with the `[future-clock]` prefix and the session continues normally.

## Coexistence with other plugins

- opencode loads plugins from the global config, then from the project, then in the order of the `plugins` array. Hooks run in registration order and there is no priority option.
- The final pass in `http.request` rewrites the body **after** all the hooks. If another plugin reinserts the real date (in the system prompt, in a description, or in the `shell` output), `future-clock` corrects it. The rest of the other plugin's text stays identical, byte for byte.
- The format is detected from the body, not from the URL. This works even when another plugin swaps the URL for a local bridge. Only the **Anthropic Messages** format is handled. Bodies with messages of role `system`, `tool`, or `developer` (OpenAI Chat) are left intact, with a warning, and for those providers only the hooks apply.
- Validated end to end with `opencode-model-router` active (including in the subagents it creates). The `opencode-anthropic-fix` path (local bridge, streamed body) was validated only in a unit test.
- **Not supported:** a plugin that changes the request body *after* `future-clock`.

## Debug dump

The `FUTURE_CLOCK_DUMP_DIR` variable writes, for each request, the final body sent to the model:

```powershell
$env:FUTURE_CLOCK_DUMP_DIR = "C:\temp\future-dumps"
```

- The path must be absolute, outside the repository, with no UNC and no `..`. Otherwise, the plugin fails at load time.
- Files written are `<sessionID>-<kind>-<seq>.json` (the body) and `….l3.json` (how many corrections the final pass made and the URL origin, scheme and host only). Headers are never written.
- **Dumps contain the entire prompt and conversation**, including global instructions and the contents of files read. Do not commit them, do not share them, and delete them afterward.

---

## Development

| Command | What it does |
|---|---|
| `bun run check` | typecheck + unit tests + build |
| `bun run test` | unit tests (fast, no network) |
| `bun run build` | produces `dist\future-clock\` |
| `bun run test:e2e` | end-to-end suite against the real opencode (E0–E6). Builds first. Single execution, full log in a file |
| `bun run experiment` | control × treatment experiment. Builds first, is resumable (repeat until it prints `COMPLETE`) and produces `runs\summary.json` |
| `bun run sandbox` / `sandbox:control` | recreates the sandbox with / without the plugin |
| `bun run cleanup` | deletes the sandbox and temporary configs; **preserves** runs and dumps |
| `bun run preflight` / `probe` | captures the environment and probes the v2 plugin API (used during planning) |

### Test environment

- **Sandbox:** `D:\future-sandbox`, with `git init`. It lives **outside the user folder** because opencode looks for `AGENTS.md` by walking up directories; inside the home directory, the global `AGENTS.md` leaked into the test.
- **Isolation:** `XDG_CONFIG_HOME` pointing to an empty config, plus `opencode run --standalone`. `OPENCODE_CONFIG_DIR` does not replace the global config. The E6 scenario deliberately runs **without** isolation, to exercise the real global plugins.
- **Child process environment:** the runner clears the inherited `INIT_CWD`, `npm_*`, and `OPENCODE_*`. Without this, the child opencode started in the repository directory instead of the sandbox.
- **Default model:** `opencode-go/claude-haiku-5-5`.
- **Artifacts** (runs, dumps, state, logs) live in `%TEMP%\Claude\future-artifacts\`. The paths are constants in `scripts/lib/artifacts.ts`; adjust them on another machine.

## Limitations

- **The day of the week does not change:** 12/10/2146 is a Wednesday, but the model sees "Mon". A 02/29 can become a nonexistent date.
- **Still in the real year:** epoch and ticks, web, file contents, `git log`, mtimes, and HTTP headers.
- **Composite outputs:** in a clock output that also lists files, names containing the current year are swapped (the model sees `log-2146…`, the disk has `log-2026…`).
- **Dates typed by the model are not reverted.** For example, `git log --since=2146-01-01` comes back empty.
- **Indirect reads** of the clock, such as a script in a file, are not detected.
- **Formats not covered:** `Oct 2026`, `12-Oct-2026`, `Current year: 2026`, `yy`, `yyyyMM`.
- **Command classifier gaps:** `/usr/bin/date`, `TZ=UTC date`, backticks, `$d = date`, `$(` inside double quotes.
- **Observers:** plugins that only *read* events may see the real year.

## Structure

```
src/core/         year swap (years.ts) and command classifier (classify.ts), pure
src/plugin/       entrypoint, host adapter, context / execute.after / http.request hooks, wire format
scripts/          build, sandbox, opencode runner, experiment, cleanup, pre-flight, and probes
test/unit/        unit tests (including coexistence with neighboring plugins and secret scanning)
test/e2e/         end-to-end suite (only runs via bun run test:e2e)
docs/plans/       implementation plan and evidence (pre-flight, decisions, QA, e2e)
docs/experiments/ experiment report
```

## Releasing

Releases are published by `.github/workflows/publish.yml` with npm trusted publishing (OIDC): no npm token is stored in the repository, and provenance is attached automatically. To release, bump `version` in the root `package.json`, merge, then push a matching tag (`git tag v0.1.1 && git push origin v0.1.1`). The workflow runs the checks, verifies that the tag matches the built package version, and publishes `dist/future-clock`.

## License

[MIT](LICENSE)
