# HuGR-Lean

An [OpenCode](https://opencode.ai) plugin that shrinks large tool outputs before they reach the model.
Long shell logs, big file reads and web pages are summarized; failures stay whole; every original
is stored locally so the model (or you) can fetch it back exactly.

Local and deterministic: no network calls, no extra model calls, no runtime dependencies. MIT.

## What it does

After each tool call, before the result is sent to the model:

- **bash** output above 4 KiB keeps about 1.5 KiB of head, 1.5 KiB of tail and the failure lines.
  If the command failed or its exit code is unknown, every failure line and its continuation block is kept,
  whatever the budget.
- **read** output is capped at 8 KiB and ends by naming the `offset` to read next.
- **webfetch** output is capped at 8 KiB.
- Each summary ends with `[full output: lean recall <id>]`. The complete original is in a local store.
- Smaller rewrites that lose nothing need no recall: ANSI/carriage-return cleanup, marking repeated lines,
  compacting read line-number prefixes, exact-preserving views for `glob`, `grep`, directory reads and
  some MCP JSON/accessibility snapshots, and 20 built-in profiles for common test/build tools
  (Cargo, pytest, Go, Node TAP, tsc, ESLint/Biome, Git status, ripgrep, ...).
- A summary is never larger than its input. Tool metadata, titles and attachments are not touched.

## Numbers

Offline replay of `summarize()` with the 0.4.0 defaults over 27 recorded OpenCode session databases
(343,045 tool calls, 1,626.1 MB of tool output):

| Scope | Calls | Before (MB) | After (MB) | Tool reduction | Share of total |
| --- | ---: | ---: | ---: | ---: | ---: |
| **All tools** | 343,045 | 1,626.1 | 955.3 | — | **41.3%** |
| bash | 138,373 | 538.9 | 224.7 | 58.3% | 19.3% |
| read (file) | 101,309 | 764.7 | 483.9 | 36.7% | 17.3% |
| webfetch | 6,561 | 103.6 | 40.6 | 60.8% | 3.9% |
| grep | 24,252 | 100.5 | 94.4 | 6.0% | 0.4% |
| glob | 13,570 | 17.7 | 11.2 | 36.6% | 0.4% |
| read (directory) | 6,383 | 9.9 | 9.7 | 1.3% | 0.0% |
| other tools | 52,597 | 91.3 | 91.3 | 0% | 0% |

**41.3% is an upper bound.** The replay cannot see the extra calls a model makes to get omitted
content back (`lean_recall`, or a `read` with a further `offset`); each adds bytes back. The corpus
is one developer's sessions, and these are UTF-8 bytes, not tokens or cost. A live A/B has not been
run. Method, mechanism breakdown and sensitivity:
[docs/BENCHMARK_REAL.md](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/docs/BENCHMARK_REAL.md#lean-20-summarize-replay-2026-10-12).

## Install

Requires Node 22+ and OpenCode. Add the package to the `plugin` list of your `opencode.json`
(global `~/.config/opencode/opencode.json` or a project `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["hugr-lean"]
}
```

Restart OpenCode. It installs the package from npm on startup. Use tools as usual; nothing needs a prefix.
To pin a version, write `"hugr-lean@0.4.0"`.

For the `hugr-lean` command line (recall, raw store maintenance), install it globally too:

```sh
npm install -g hugr-lean
hugr-lean doctor
```

Without npm, download `hugr-lean-<version>.tgz` and its `.sha256` from the
[GitHub releases](https://github.com/gustavomhss/HuGR-Lean/releases), check the hash, run
`npm install -g ./hugr-lean-<version>.tgz`, and put the `pluginURL` printed by `hugr-lean doctor`
in the `plugin` list instead of `"hugr-lean"`.

## Configuration

Options go in a tuple. Every field is optional; the values shown are the defaults:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["hugr-lean", {
    "mode": "summarize",
    "summarize": {
      "shellThresholdBytes": 4096, "headBytes": 1536, "tailBytes": 1536, "errorBytes": 4096,
      "readCapBytes": 8192, "webfetchCapBytes": 8192, "readLineNumbers": false
    },
    "raw": { "maxBytes": 67108864, "ttlMs": 604800000 },
    "enabled": true,
    "automatic": true,
    "excludeCommands": [],
    "maxInputBytes": 4194304
  }]]
}
```

- `mode`: `"summarize"` (default) or `"lossless"`. Lossless is the 0.3 behavior: only exact-preserving
  profiles and views, no summaries, no recall line.
- `summarize`: byte thresholds. `readLineNumbers: true` keeps read's `N: ` prefixes.
- `raw`: the local store of originals. Default directory `~/.cache/hugr-lean/raw` (set `directory` to change it),
  64 MiB, seven-day expiry; in summarize mode the oldest records are evicted when full.
  `"raw": false` disables storage, which also disables summaries (only lossless rewrites remain).
- `enabled: false` turns the plugin off. `automatic: false` disables the automatic views.
  `excludeCommands` lists shell commands left alone (matched as a prefix of the command line).
  `maxInputBytes` (1–16 MiB) is the input limit of the exact-preserving profiles and views.
- Invalid options disable the plugin rather than guess.

## Getting originals back

The model has a `lean_recall` tool, registered by the plugin. It takes the `id` from the recovery
line and an optional 1-based line range such as `"120-240"`.

From a terminal:

```sh
hugr-lean recall <id>                 # the exact original
hugr-lean recall <id> --lines 120-240 # one line range
hugr-lean raw list                    # stored records
hugr-lean raw purge                   # delete all stored records
```

Add `--directory PATH` for a custom store. A missing or expired record prints `unavailable` and exits 2.

## Guarantees

- Failures are never summarized away: on a nonzero or unknown exit, all failure lines are kept whole.
- Every lossy summary has its complete original in the local store. If storing fails, no summary is
  made: the model gets the full output (with lossless cleanup at most).
- Unknown tools, MCP `isError` results, attachments and binary content pass through untouched.
- Host truncation happens before the plugin runs: the stored original is what OpenCode captured,
  not more.
- No network access, telemetry or model calls. Originals stay on your machine.

Tested host: OpenCode 1.18.17 on macOS. CI runs the package tests on Linux, macOS and Windows;
Linux and Windows OpenCode hosts are not separately proven.

## Uninstall

1. Remove `hugr-lean` from the `plugin` list and restart OpenCode.
2. Optionally delete stored originals: `hugr-lean raw purge` (add `--directory PATH` for a custom store).
3. If installed globally: `npm uninstall -g hugr-lean`.

## Library

```ts
import { summarize } from "hugr-lean/core";   // also filter, filterStructured, getProfiles, tokenizeCommand
import { RawStore } from "hugr-lean/raw";
```

See the [core manual](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/src/core/MANUAL.md).

## Development

```sh
npm ci
npm run check   # structure, typecheck, tests, build
npm run smoke   # pack, install and inspect the tarball
```

See [CONTRIBUTING.md](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/CONTRIBUTING.md),
[SECURITY.md](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/SECURITY.md),
[CHANGELOG.md](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/CHANGELOG.md) and
[NOTICE](https://github.com/gustavomhss/HuGR-Lean/blob/v0.4.0/NOTICE) for third-party fixture provenance.

## License

MIT. See [LICENSE](LICENSE).
