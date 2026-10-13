# OpenCode Vitals Terminal

**Session usage, below your prompt and in your sidebar.**

Turns, model steps, and context usage **in OpenCode V2's existing terminal prompt footer**, with cumulative tokens and cost **in the session sidebar**. No separate dashboard, desktop renderer injection, server hooks, telemetry, or extra model requests.

**For the full-screen terminal client**, not Desktop or `opencode mini`.

Inspired by [OpenCode Vitals](https://github.com/moutazideal/opencode-vitals) and its idea of keeping session metrics beside the composer. This project brings that idea to the terminal with usage counts, not streaming tokens per second.

![Earlier OpenCode Vitals terminal layout](screenshot.png)

*Screenshot from an earlier layout; cumulative tokens and cost now appear only in the sidebar and details view.*

```text
~/code/project                                 8 turns · 42 steps · 24K (19%)
```

The line automatically abbreviates on smaller terminals:

```text
8t · 42s · 24K
```

When OpenCode's right sidebar is visible, a **Vitals** section shows the full metrics with exact counts:

```text
Vitals
Turns: 8
Steps: 42
Total tokens: 320,000
Context: 24,000 (19%)
Cost: $0.43
```

With the sidebar visible, the footer switches to a standard-style model-context summary, without repeating turns or steps:

```text
~/code/project                                                    24K (19%)
```

Hiding the sidebar or narrowing the terminal restores turns and steps in the footer alongside current context usage. Cumulative tokens and cost stay out of the footer; they remain available through `/vitals` even when the sidebar is hidden. This follows the sidebar's actual visibility, including manual toggling, rather than just terminal width. Both views share the same history and live updates.

Click the footer summary or sidebar vitals section, or run `/vitals`, for an input/output/reasoning/cache breakdown. `/vitals-refresh` rereads the session history if needed.

## What you get

| Feature | What it does |
| --- | --- |
| **Session counts** | Delivered user turns and primary model steps for the session you are viewing, including work in progress. |
| **Usage at a glance** | Turns, steps, and current context below the prompt; cumulative provider-reported tokens and recorded cost in the sidebar. |
| **Details on demand** | Click the summary or run `/vitals` for exact counts and a token breakdown. |
| **History-aware totals** | Read full history on resume and reconnect, and exclude reverted messages after undo. Incomplete totals are marked with `~`. |
| **A footer that fits** | Abbreviate on narrow terminals while retaining the host's spinner, working directory, and editor-file display. |
| **Sidebar vitals** | Show exact counts, cumulative tokens, and cost in the right sidebar, with a context-only footer. Restore turns and steps in the footer when the sidebar is hidden. |

## Install

Requires **OpenCode V2 2.0.26 or later**, with the CLI plugin API. Tested against 2.0.26 and 2.0.27. OpenCode supplies the runtime that loads the plugin.

### Install from npm (recommended)

The plugin is published as [`opencode-vitals-terminal` on npm](https://www.npmjs.com/package/opencode-vitals-terminal). OpenCode installs the npm package and supplies the runtime that loads the plugin; no separate `npm install` is needed.

Merge these entries into `plugins` in `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "-opencode.prompt.footer",
    "-opencode.sidebar.context",
    "opencode-vitals-terminal"
  ]
}
```

**Keep your other settings and plugin entries.** [`cli.example.json`](cli.example.json) contains the configuration above; do not copy it over an existing config. To pin a release, use `opencode-vitals-terminal@0.3.0` instead of the unversioned package name. See [CHANGELOG.md](CHANGELOG.md) for release notes.

The first entry disables only the built-in footer contribution that contains the original token/cost line. Without it, both summaries appear. Our contribution uses the same `prompt.footer` slot, rather than replacing the whole footer: the host's spinner, working directory, interrupt status, and editor-file display remain intact. Shell-mode hints, command/agent shortcuts when space permits, and running-subagent/shell indicators are retained.

The `-opencode.sidebar.context` entry disables OpenCode's built-in **Context** section, since Vitals already includes context usage and cost. Only that duplicate section is hidden; the rest of the sidebar and our prompt footer stay intact. If you already installed the plugin, add this entry to your existing `plugins` array.

Restart or reload the terminal client to load the plugin.

### Install from source

Use **Node 26.4.0 or newer** and npm for the checkout's dependencies and development checks, matching OpenTUI's declared Node runtime minimum:

```sh
git clone https://github.com/skatkov/opencode-vitals-terminal.git
cd opencode-vitals-terminal
npm ci
```

For **mise** users, `mise.toml` pins a compatible Node version for this checkout. Run `mise install` before `npm ci`. If mise is not activated in your shell, use `mise exec -- npm ci` instead.

In the configuration above, replace `opencode-vitals-terminal` with the absolute path to your checkout, such as `/absolute/path/opencode-vitals-terminal`. Keep both `-opencode.prompt.footer` and `-opencode.sidebar.context` entries, then restart or reload the terminal client.

### Preview without changing configuration

```sh
OPENCODE_CLI_CONFIG_CONTENT='{"plugins":["-opencode.prompt.footer","-opencode.sidebar.context","/absolute/path/opencode-vitals-terminal"]}' opencode
```

The environment override replaces the configured plugin array for that process; include any other terminal plugins you want in that preview.

## Display

There are no display options to configure. Turns, steps, cumulative tokens, context usage, and recorded cost are always enabled. Previous `tokens` and `cost` options are ignored.

Cumulative total tokens and recorded cost are shown in the sidebar and `/vitals`, never in the footer. Cost includes `$0.00`. With the sidebar hidden, the footer shows turns, steps, and current context usage. With the sidebar visible, it shows only model-context usage to avoid repeating the sidebar metrics.

## What the numbers mean

- **Turns:** delivered user messages in this session's timeline. Includes the current turn. Steering messages count as separate user turns; this is **not** a count of completed assistant responses. Queued/pending messages, synthetic messages, and shell commands do not count.
- **Steps:** distinct primary assistant/model-call messages, including a call in progress or a failed call. Multiple tool calls in one response are one step. Provider retries reusing the same assistant message ID do not inflate the counter. Title generation and compaction are not primary steps.
- **Total:** cumulative provider-reported token usage: input + output + reasoning + cache-read + cache-write across primary model steps. Repeated context/cache tokens are counted per request, just as in OpenCode's usage accounting. This is neither unique transcript size nor billed cost. Usage updates when the provider finishes a step; missing usage is not estimated. Auxiliary title/compaction/generate usage is excluded.
- **Context:** the unlabeled token count in the footer. This is the original footer's estimate: the latest primary step's token usage since the last completed compaction, with its model's context-window percentage when known. It is not the cumulative token total.
- **Cost:** OpenCode's existing session-cost value, which can include auxiliary work and descendants. It is not recalculated from the primary-step token total. `$0.00` means zero recorded cost, not necessarily zero actual billing; missing pricing information is not estimated.

Turn, step, and token counters are **for the session you are viewing**. Subagent sessions have their own counters; the running-subagent indicator is still displayed.

Full history is paginated independently of the TUI's recent-message cache, so resuming a long session does not reset its counters. Until history finishes loading, or if it cannot be read, incomplete totals carry a `~` prefix. Context remains available from the recent-message cache. Reconnects reread history, and staged/committed undo excludes the reverted part of the timeline. Removed history is not a lifetime-spend ledger.

On narrow terminals the labels abbreviate first, then the context percentage and separators are removed. The detailed `/vitals` view remains available at any width.

## Privacy

Only lightweight usage metadata is kept in client memory. The plugin does not persist or log prompts, responses, file attachments, or tool output. There is no telemetry or separate analytics service. History comes from the connected OpenCode server, including remote servers, through the TUI's existing authenticated client. Disabling/reloading the plugin unsubscribes events and aborts its pending history reads.

## Remove

Remove this plugin's entry, `-opencode.prompt.footer`, and `-opencode.sidebar.context` from `cli.json`, then restart or reload the terminal client. Removing the disabling entries restores OpenCode's built-in footer contribution and Context section. Keep your other plugin entries and settings.

## Development

```sh
npm ci
npm run check
npm test
npm pack --dry-run
```

The host loads the TypeScript/TSX entrypoints directly; no build is required. OpenTUI/Solid are peer dependencies supplied by the host. Local tests exercise accounting, pagination, deduplication, responsive formatting, sidebar lifecycle, undo boundaries, concurrent reads, and cleanup without making model requests.

The plugin was also smoke-tested in the actual OpenCode 2.0.26 TUI at 160, 80, and 44 columns, including the `/vitals` dialog and live counter updates. Loading it did not require changing global configuration.

The development dependency override keeps `seroval` on a patched release. If npm reports `EBADENGINE`, check `node --version` and upgrade to Node 26.4.0 or newer (or run `mise install` and use `mise exec -- npm ci`).

For npm versions with install-script approvals, `allowScripts` explicitly denies the optional `msgpackr-extract` native build script. MessagePack decoding still works without native acceleration, using the JavaScript fallback. This avoids unreviewed-script warnings without enabling dependency install scripts broadly.

CI runs the same install, type check, tests, and package preview on pushes and pull requests, using Node 26. A separate publishing workflow runs manually or when a version tag is pushed.

API references: [CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli/) · [CLI plugin configuration](https://opencode.ai/v2/docs/cli/plugins/).

### Mutation testing

[StrykerJS](https://stryker-mutator.io/docs/stryker-js/getting-started/) checks the tests by making small changes to production code and verifying that tests fail. Run it with the same Node 26.4.0-or-newer runtime used for development:

```sh
npm run test:mutation
```

If mise is not activated in your shell, use `mise exec -- npm run test:mutation`.

Open `reports/mutation/index.html` for the interactive report; `reports/mutation/mutation.json` contains the machine-readable results. Reports and Stryker's temporary sandbox are ignored by git.

`stryker.config.mjs` targets the logic in `src/**/*.ts`, including accounting, history, formatting, and reactive stores/views. It does not mutate tests or the host-loaded `index.ts` and `tui.tsx` entrypoints, which the unit suite does not load. The TAP runner uses the `node:test` suite directly, preserving Solid's `browser` condition and Node's TypeScript stripping, with coverage-based selection at the test-file level.

The [TypeScript checker](https://stryker-mutator.io/docs/stryker-js/typescript-checker/) validates each mutant against `tsconfig.json` before running tests. Type-invalid mutants appear as `CompileError` and are excluded from the mutation score, not counted as caught by tests. It runs in accuracy-first mode (`prioritizePerformanceOverAccuracy: false`), which checks mutants individually and can take several minutes. The four-worker concurrency limit is shared between checker and test-runner processes. Keep running `npm run check` separately to validate the original project.

Stryker is a development-only dependency. A scoped override keeps its transitive `qs` dependency on a patched release without changing the plugin's runtime dependencies.

For a quicker configuration check or a focused run:

```sh
npm run test:mutation -- --dryRunOnly
npm run test:mutation -- --mutate src/metrics.ts
```

The mutation score must stay at **100%** (`thresholds.break` is `100`); any surviving or uncovered type-valid mutant fails the run. There are no excluded mutation categories or inline suppression comments. Simplify redundant implementation paths and add behavioral tests rather than hiding surviving mutants. This score applies to the configured `src/` scope, not the host-loaded entrypoints, and is not a line/branch code-coverage measurement.

The separate **Mutation testing** GitHub Actions workflow runs on demand via **Run workflow** and uploads the reports as the `mutation-report` artifact. It does not slow down push/pull-request CI or publishing, and no Stryker dashboard credentials are needed.

## Publishing

The **Publish** GitHub Actions workflow publishes to npm on demand via **Run workflow**, or automatically when a `v*` tag is pushed. It uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) with OIDC, so no npm token is stored in GitHub.

Before the first run, configure a GitHub Actions trusted publisher in the npm package's **Settings → Trusted publishing**:

- Organization or user: `skatkov`
- Repository: `opencode-vitals-terminal`
- Workflow filename: `publish.yml`
- Environment name: leave blank
- Allowed actions: enable direct publishing with `npm publish`

After the workflow is pushed to `main` and the trusted publisher is configured, publish the current package version with:

```sh
gh workflow run publish.yml --ref main
```

`npm publish` runs the existing `prepublishOnly` type check and tests before publishing. The package ships the TypeScript/TSX entrypoints and runtime source directly, with the README, screenshot, example configuration, and license; no compilation step is needed. `publishConfig` targets the public npm registry.

For subsequent releases, bump the version with `npm version patch` (or `minor`/`major`) and push the release commit and corresponding `vX.Y.Z` tag. The workflow verifies that the tag matches `package.json` before publishing. npm will not overwrite an already published version.

## License

MIT. See [LICENSE](LICENSE).
