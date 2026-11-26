# opencode-precost

**English** | [Português (Brasil)](README.pt-BR.md)

Shows an **estimated** cost range *before* a task runs in a coding agent (OpenCode and Claude Code). Optionally asks for explicit approval when the high end of the range goes above a limit you set. No paid calls, no network access at run time.

> Status: version 0.4.0 is published on npm under the `next` tag (the `latest` tag is still 0.3.2, which has no OpenCode 2.x support). OpenCode 2.x support is EXPERIMENTAL. The packaged install is checked in CI on Linux x64, macOS arm64 and Windows (Server 2022; architecture printed in the CI log), with fake servers and no paid calls. macOS Intel is not covered (see docs/INSTALLATION.md). Read "Limits" before relying on it.

## What it does

- `precost estimate <task>` prints a per-model range (three fixed scenarios, or percentiles from your own session history). The high end is a P75 / large scenario, **not a cap**.
- A gate runs before your prompt reaches the model. With `limitUsd` set, a prompt whose high estimate is above the limit is blocked until you type `precost approve CODE`. The approval is bound to the prompt, model, session, price table, limit and estimated ceiling. It lasts 10 minutes (default) and works once.
- Fails closed when a limit is set: unreadable config, unknown model, model without a price, unreadable context file, or an internal error all block instead of letting the prompt through. Without `limitUsd` the tool only informs ("NO GATE").

## Pictures

All images are **renderings of terminal output text, not UI screenshots**. Where a model appears it is a **simulated** local server (no cost, no credentials). Everything shown was run on **Linux**; nothing here is macOS or Windows validation (see "Platforms").

![Preview and block in Claude Code 2.1.332 (simulated model server)](docs/img/01-preview-and-block.png)
![Single-use approval (simulated model server)](docs/img/02-single-use-approval.png)
![precost estimate in the terminal](docs/img/03-estimate-cli.png)
![precost update-prices (SIMULATED price table, not official prices)](docs/img/04-update-prices.png)
![OpenCode 1.19.6 TUI with precost (simulated model, partial screen)](docs/img/05-opencode-tui.png)

Image 05 illustrates the block (a model with no price in the table) as a partial crop rebuilt from the real TUI. It is not a full screenshot and not proof of the approval flow in OpenCode.

## Install

Details, prerequisites and the validation matrix: [docs/INSTALLATION.md](docs/INSTALLATION.md).

- **Claude Code (plugin):** `claude --plugin-dir /path/to/opencode-precost` to try it locally. Marketplace install from this repository (checked on Linux x64 with Claude Code 2.1.332 and a local mock model, no paid call): `claude plugin marketplace add glauberportella/opencode-precost`, then `claude plugin install precost@precost-marketplace`. This is the repository's own marketplace, not the Anthropic directory. It is not listed in any third-party directory.
- **Claude Code (manual):** copy `adapters/claude-code/settings.example.json` into your Claude settings and fix the path. Keep `"onFailure": "block"`: without it a crashing, missing or hanging hook lets the prompt reach the model.
- **OpenCode (1.19.6 only):** `npm i opencode-precost @opencode-ai/plugin@1.19.6` (published on npm: https://www.npmjs.com/package/opencode-precost; the registry install was checked on Linux x64 only) and create `.opencode/plugins/precost.js`:
  ```js
  import { PrecostPlugin } from 'opencode-precost';
  export const P = async (input) => PrecostPlugin(input, { limitUsd: 5 });
  ```
  Loading the plugin only through `opencode.json` was not verified.
- **OpenCode 2.x (EXPERIMENTAL, new in 0.4.0, tested only with 2.4.2):** a separate V2 plugin, because V1 plugins do not run in V2. Install with `npm i opencode-precost@next` (the `latest` tag, 0.3.2, has no V2 plugin). In `.opencode/plugins/precost.js`: `import { precostV2 } from 'opencode-precost/opencode-v2'; export default precostV2({ limitUsd: 5 });`. It is a gate only: estimate, block above `limitUsd`, `precost approve CODE`. What to expect:
  - Only OpenCode 2.4.2 is verified; any other version blocks every prompt (fail closed). Do not set `allowUnverifiedVersion` unless you accept that untested risk.
  - When it blocks, the OpenCode 2.4.2 client shows only a generic `UnexpectedStatus: 500`, not the reason and not a preview. Read the reason in a terminal with `precost last` (or in the plugin `log`). Typed `precost ...` commands are intercepted but their text is not shown by the client either.
  - The model is read from the session. If the effective model of a request differs from the estimated one, the request is blocked. Image or inline attachments are not counted: the gate blocks with a "not counted" notice.
  - `sessionLimitUsd` is NOT supported on V2 and blocks every prompt while it is configured (so it is never ignored silently). The spend ledger and history are not ported.
  - Auxiliary requests (session title, compaction, generate) do NOT go through the gate and are not estimated.
  - Blocking by throwing in the prompt hook is not a documented rejection API in OpenCode 2.x. The TUI and loading through `opencode.json` were not tested.
  - Checked in CI (Linux x64, macOS arm64, Windows) with the packed tarball and the real `@opencode/cli` 2.4.2 against a fake local model (`E2E_PACKED=1 npm run e2e:opencode-v2`). Never against a paid model. macOS Intel is not covered.
- **Config** (`~/.config/precost/config.json`, Windows `%APPDATA%\precost\config.json`): `{"model":"claude-sonnet-5.5","limitUsd":5}`.
- **Check the install:** `node bin/precost.js doctor`. It cannot prove the client loaded the hook in your session. In a real session type `precost last` first: if a model answers, the hook is not loaded.

## Commands

Typed in the prompt (they never reach the model): `precost estimate <task>`, `precost last`, `precost approve CODE`, `precost revoke CODE|all`.
In a terminal: `node bin/precost.js estimate "task" --model claude-sonnet-5.5`.

### Update the reference price table

```
precost prices                                   # table in use, date, age (warns after 30 days)
precost update-prices --from FILE_OR_URL         # validates and shows the diff; nothing is written (URL must be https)
precost update-prices --from FILE_OR_URL --yes   # writes ~/.config/precost/prices.json (Windows: %APPDATA%\precost\prices.json)
precost update-prices                            # default source: data/prices.json on main of the project repo (works only once the repo is public; until then HTTP 404, exit 1, nothing changes)
precost update-prices --reset                    # back to the bundled table
```

It rejects an invalid table, one older than the current one, or one with a removal or a change above 5x (use `--force` only after checking the source). It runs only from the CLI, never inside the hook or plugin. A user table is used only if it is not older than the bundled one. Changing the table invalidates pending approvals. There is **no automatic reading of official pricing pages**. The default source is the table published on `main` of the project repository, which exists only once the repository is public (until then HTTP 404 and nothing changes); `--from` or `PRECOST_PRICES_SOURCE` give another source (file or https URL). Today the bundled `data/prices.json` is the reference; the official pages cited per model remain the source of truth. Always check them.

## Platforms

What was actually executed is in the matrix in [docs/INSTALLATION.md](docs/INSTALLATION.md#validation-matrix). Linux is not validation of macOS or Windows. The code uses per-platform paths (`src/paths.js`) and the Claude Code hook uses `node` + `args` (no shell). `npm run e2e:native` (Node, no bash) runs the real clients against fake local servers on Linux, macOS and Windows; results per system are in the matrix. Official client support on Windows: Claude Code runs natively on Windows 10 1809+ (Git for Windows recommended); OpenCode runs on Windows but its docs recommend WSL.

## Test it

```
npm ci            # installs the dev dependency @opencode-ai/plugin@1.19.6 (needed by the OpenCode adapter test)
npm test          # 71 unit tests (English and Portuguese output)
npm run e2e:native            # real Claude Code 2.1.332 and OpenCode 1.19.6 vs fake servers: block, approve, single use, fail closed
npm run e2e:claude-plugin     # Claude Code plugin cycle (bash, Linux/macOS)
npm run e2e:claude-plugin-failure   # hook crash / missing node / timeout never reach the model (bash)
npm run e2e:opencode          # OpenCode 1.19.6 block/approve/single-use cycle (bash)
```
End-to-end scripts download pinned client versions through `npx` and call only local fake servers. No paid model is called.

## Limits

- It is an estimate: tokens are chars/4 (x1.3 for observed Claude 4.7+ tokens) plus an assumed system prompt (8k OpenCode, 13k Claude Code). It is not a known cost.
- The high end is not a cap. The gate acts before the prompt; it does not limit spend during a task or inside long loops.
- Claude Code does not tell the hook which model is active (observed in 2.1.332). An unproven model uses the worst case in the supported catalog, labeled as such.
- OpenCode has no automatic preview before the model; this plugin computes it inside `chat.message`. Blocking by throwing is undocumented behavior, so the plugin is pinned to OpenCode 1.19.6 and fails closed on other versions (unless `allowUnverifiedVersion` is set).
- Approval is a local file of the same user. It protects against accidental spend, not against an agent with a shell.
- The gate only works while the plugin or hook is loaded.
- Prices: Gemini from cloud.google.com/vertex-ai/generative-ai/pricing and Claude from platform.claude.com/docs/en/about-claude/pricing, read on 2026-11-25. Not modeled: batch, priority, fast mode, data residency. Carbon/Argon raw price is inferred.
- Token semantics were checked against real events and transcripts from OpenCode and Claude Code with **fake** providers. No comparison with a real invoice has been done.

More detail: [docs/CAPABILITIES.md](docs/CAPABILITIES.md).

## Language

The documentation is available in English (main) and Portuguese (Brasil). The messages printed by the tool (CLI, Claude Code hook, OpenCode plugin) are in English by default. For Portuguese, set `"lang": "pt"` in the config file (or the `lang` option of the OpenCode plugin), or set the environment variable `PRECOST_LANG=pt`. The config value wins over the environment variable. Only the text changes: commands (`precost approve CODE`, `precost revoke CODE`, `precost last`, `precost estimate ...`), approval codes, config keys and the gate's behavior are the same in both languages, and the tests check both.

The notes in the price table (`data/prices.json`) are in English. Code comments in `src/` and `adapters/` and the messages of the test and e2e scripts are still partly Portuguese.

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Glauber Portella.
