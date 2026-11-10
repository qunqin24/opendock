# OpenCode V2 Context Guard

Configurable early compaction for root sessions and nested agents, using OpenCode's native durable compaction API. Preserves the original request and latest complete exchange as text by default, summarizes intermediate work, and warns when exact-text preservation or the post-compaction token target fails. Observe mode is the default: it observes thresholds without requesting compaction, while preservation still applies to manual and native automatic compactions. Set `compaction.preserve.enabled: false` in plugin options to use native summarization; token-target warnings remain active.

Targets **`@opencode/plugin@2.0.29`**. The published SDK, official documentation, runner implementation, and upstream continuation test were inspected. The real 2.0.29 server and native TUI now pass [local verification with a synthetic provider](docs/validation/tui-2.0.29-2026-10-16.md); real-provider compaction and Superpowers validation remain unverified. OpenCode 2.1.2 also passes [local server/TUI validation](docs/validation/context-chart-2.1.2-2026-10-22.md). See [compatibility](docs/compatibility.md).

Release **0.6.0** changes default compaction behavior. Preservation protects text only; attachments, hidden reasoning and tool-message structure are excluded. Middle summarization depends on the SDK’s experimental generation endpoint and falls back to native compaction with a warning if unavailable. Monitor v1/v2 include optional verification data; update older clients with closed schemas alongside the server. See [configuration](docs/configuration.md#compaction-preservation-and-verification), [compatibility](docs/compatibility.md#text-preservation), and the [changelog](CHANGELOG.md).

## Install

The npm package is **`@cesarus777/opencode-cgp`**. The unscoped `opencode-context-guard` name belongs to another project; do not install it expecting this plugin.

Minimum supported host: **OpenCode V2 2.0.29**. Versions 2.0.29 and 2.1.2 have been tested locally with a synthetic provider; V1 is unsupported.

Register the global package through the native manager:

```sh
opencode plugin add @cesarus777/opencode-cgp@latest
```

The CLI manages global package registration and installation. To register the plugin manually, add the following to **one** applicable `opencode.jsonc` instead. The host installs missing packages; a separate `npm install` in your project is unnecessary.

```jsonc
{
  "plugins": [
    {
      "package": "@cesarus777/opencode-cgp",
      "options": {
        "mode": "observe",
        "defaults": {
          "threshold": {
            "type": "tokens",
            "value": 131072,
          },
        },
      },
    },
  ],
}
```

Global configuration is `~/.config/opencode/opencode.jsonc` (or the OpenCode config directory selected by `XDG_CONFIG_HOME`). Project configuration is `./opencode.jsonc` or `./.opencode/opencode.jsonc`; relative plugin paths resolve from the containing configuration file. Plugin arrays accumulate across applicable configurations. Avoid duplicate registration through global/project configuration, discovery directories, or CLI registration. When adding options to a CLI-managed entry, edit that entry rather than adding another copy. The plugin never edits configuration itself.

Restart/reload OpenCode and look for `context-guard: observe; diagnostics ...`. Observe mode records policy decisions and never requests compaction; OpenCode's own automatic compaction remains active. Inspect diagnostics first, then set `mode` to `enforce` to admit native compaction at runtime step boundaries. The complete [example](examples/opencode.jsonc) includes model, role, and agent policies. **Last matching rule wins**; selectors within a rule are ANDed.

Pin the exact published version in the existing entry's `package` field or use the manager. Release `0.5.0` adds the Orbit workspace to the standalone dashboard and expanded native panel, terminal-default styling, and native fullscreen/split controls. It retains the restored per-agent metrics and bounded archive/discovery work from 0.4.x. Cold first reads and remaining Models stalls are documented in the [performance validation](docs/validation/dashboard-performance-2026-11-08.md). See the [changelog](CHANGELOG.md) and [0.5.0 release record](docs/validation/release-0.5.0-2026-11-10.md).

```sh
opencode plugin add @cesarus777/opencode-cgp@0.5.0
```

Manage the configured target with the [official V2 CLI](https://dev.opencode.ai/v2/docs/plugins):

```sh
opencode plugin list
opencode plugin check
opencode plugin update @cesarus777/opencode-cgp@latest
opencode plugin remove @cesarus777/opencode-cgp@latest
```

Use the actual configured target when it differs. Exact versions and full Git commit hashes stay pinned and are skipped by updates. To change a pin, edit the existing `package` field while preserving its options, or remove the old CLI target and add the desired version. Manually configured entries are removed by deleting that entry from its configuration file. Remote TUI clients also need the package registered in their client `cli.json`, in addition to server registration; see [client configuration](examples/cli.jsonc).

For development or unreleased Git revisions, V2 supports npm-compatible Git targets:

```sh
opencode plugin add 'github:cesarus777/opencode-cgp#master'
```

Replace `master` with a version tag or full commit hash to pin a revision. Git installs require Bun and development dependencies to run `prepare`; unlike npm artifacts they build from source. Prefer an exact published npm version for reproducible installs. Git preparation has not been verified with the real plugin manager; use a built local checkout if it fails.

Contributors can build and register a checkout without publishing:

```sh
git clone https://github.com/cesarus777/opencode-cgp.git
cd opencode-cgp
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
bun run test:package
```

Use `{"plugins":[{"package":"/absolute/path/to/opencode-cgp","options":{"mode":"observe"}}]}` in a disposable project's `opencode.jsonc`. Local paths are configured directly; `plugin add` does not accept local paths or tarballs. Root checkout wrappers continue to support the host's source loader. The npm package instead uses built JavaScript exports. See [build and release instructions](docs/releasing.md).

If loading fails, run `opencode plugin list` and `opencode plugin check`, confirm V2 2.0.29 and the correct configuration scope, and inspect OpenCode's startup logs. A missing `@opencode/plugin` or client module indicates an incomplete package installation: remove/re-add the configured package using the manager. TUI-only missing `solid-js`/OpenTUI modules usually indicate an unsupported host or loading the TUI outside its host runtime. These optional peers are supplied by the native TUI and must share its runtime instances; do not bundle private renderer copies. Standalone renderer tests need the pinned peers and public runtime preload described in [testing](docs/testing.md). Never reset persisted safety state merely to fix loading. For remote clients, check both client installation and server registration in the session's owning location.

## Run after installation

From your project directory, start OpenCode:

```sh
opencode
```

Inside OpenCode, enter `/context-guard` to open the Context Guard panel. The plugin loads automatically with OpenCode after registration; there is no separate plugin process to start. Observe mode is the default. Press **c** in the panel for history charts, or **q** to close it.

The installed diagnostic command is **`context-guard`** (Bun required):

```sh
context-guard --help
context-guard dashboard tui --help
context-guard models --help
context-guard metrics --help
context-guard charts --help
context-guard help journal
```

Each command's help explains its inputs and shows an example. In a source checkout, use `bun run inspect` in place of `context-guard`, for example `bun run inspect charts --help`. OpenCode's plugin manager installs the plugin for the host; if `context-guard` is absent from your shell's PATH, you can still use the native panel. To expose the CLI separately, install the same package with your package manager, for example `npm install -g @cesarus777/opencode-cgp@0.5.0`.

## Standalone terminal dashboard

Run the dashboard in a separate terminal tab, window or pane while continuing to work in OpenCode. Both clients connect to the same running server, with Context Guard registered in the owning location. Launch `context-guard dashboard tui` from the same project directory, or select the server and directory explicitly. Each full-screen TUI needs its own terminal. The standalone command requires **Bun >=1.3.0**. The package automatically installs **`@opentui/core@0.5.17`** and its platform renderer; no separate OpenTUI install is needed. Keep optional dependencies enabled so OpenTUI's native platform library is installed. Server imports and existing diagnostic commands retain Bun >=1.1.34 support. Solid and the native TUI plugin are unnecessary for this command.

The dashboard reads live updates without controlling OpenCode's sessions or server lifecycle. Concurrent dashboard/native-client PTYs pass local synthetic-provider validation on OpenCode 2.0.29 and 2.1.2; quitting the dashboard leaves the native client running.

For an unreleased checkout:

```sh
bun install --frozen-lockfile
bun run build
bun dist/cli.js dashboard tui
bun dist/cli.js dashboard tui --server https://server.example --directory /server/project
```

For a packed artifact, install the tarball into a separate client directory, then launch with Bun >=1.3.0:

```sh
npm install /absolute/path/cesarus777-opencode-cgp-0.5.0.tgz
bun node_modules/.bin/context-guard dashboard tui
```

Local discovery uses the current directory by default. An explicit server requires an absolute **server-side** `--directory`; it is passed unchanged. Set `CONTEXT_GUARD_PASSWORD` and optional `CONTEXT_GUARD_USERNAME` (default `opencode`) in the environment for remote authentication. Use HTTPS except on loopback. Credentials in URLs are rejected.

Use `1` overview, `2` detail, `3` history, `4` models, arrows or `j/k` to navigate, `/` to search sessions, `f` for exact agent/model filters, `l` for location, `r` to refresh, and `?` for help. History uses Left/Right for six metrics, `w` for 5m/1h/24h/7d, and `[`/`]` to inspect exact samples or requests. Detail scrolls through full IDs and every exposed snapshot field. Editors take precedence over shortcuts; Enter applies and Escape cancels. Quit with `q` or Ctrl+C.

At 110×28 cells or larger, Overview and Detail use a session workspace: a family tree beside context and performance panels. Context bars show capacity occupancy with `┆` marking the policy trigger. Overview shows retained TPS samples after opening History; it does not initiate history reads. Detail scrolls through the panels and full diagnostics. Smaller terminals use aligned columns at 72 cells or wider and compact cards below that width. Rows show agent/model, execution state, context occupancy, threshold distance, and a bounded exception line; `T` abbreviates threshold and `+N` points to more diagnostics in Details. The workspace uses `#N` list positions; compact layouts use positions below 100 cells and unique session-ID suffixes at wider sizes. Selection follows the full session ID through updates and resizing. PageUp/PageDown moves by visible session rows; Enter/2 opens full details and Escape returns to the selection. Filters preserve the selected session even when they hide its row; arrows select a visible result. At very small heights, the selected identity takes precedence over additional row lines. Only visible rows receive full formatting; independent discovery branches use at most four requests and publish partial results early. See the [overview validation](docs/validation/standalone-overview-density-2026-11-06.md) and [current performance report](docs/validation/dashboard-performance-2026-11-08.md).

The standalone dashboard uses the terminal's default foreground/background and standard ANSI red, green, yellow and cyan slots. Headings are bold, supporting text is dim, and the selected session uses inverse video. Your terminal controls the actual colors, including on light backgrounds; there are no custom themes or palettes to configure. Status text also identifies warnings, failures and stale readings without relying on color.

For **aggregate statistics and charts for a model**, press **4**, select its full `provider/model` identity and press **Enter**. This combines completed requests from root, child and archived sessions in the owning location; no live session selection is needed. **Left/Right** selects weighted request TPS, TTFT median/p95, completed requests or reported output. **w** selects the time window, **[ / ]** inspects a bucket, **f** filters by agent, **d** toggles request details, and **n/p** pages models or requests. **s** cycles model-list sorting and **Escape** returns to the list. Existing inventory model filters seed model selection; session search does not restrict these aggregates.

Models refreshes while visible using the dashboard's 30-second refresh interval; **r** requests a refresh that validates the shared archive revision. Range totals precede pagination and chart reduction. Weighted request TPS divides reported output by summed matched request durations, including TTFT; concurrent durations add, so this measures request performance rather than fleet output per wall-clock second. In-flight requests appear after stream completion, which does not establish task success. TTFT is observed/approximate. Empty or ineligible buckets stay blank and partial coverage remains labeled. See [model analytics](docs/configuration.md#terminal-model-analytics) for server requirements and limits.

The location editor's Tab key cycles up to four remembered owning directories; this is not server-wide discovery. History shows bounded retention, partial/downsampled data and gaps. Unknown measurements stay unknown, while stale occupancy remains labeled and pressure becomes unknown. Browser delivery is a later milestone. See [terminal validation and dependency sizes](docs/validation/dashboard-terminal-2026-10-28.md).

## Thresholds

| Type        | Example  | Trigger                                    |
| ----------- | -------- | ------------------------------------------ |
| `tokens`    | `131072` | Prompt tokens ≥ value                      |
| `ratio`     | `0.25`   | Prompt tokens ≥ ceil(usable input × value) |
| `remaining` | `32768`  | Usable input − prompt tokens < value       |

Usable input is `min(positive limit.input, limit.context − output reservation)` when both constraints are known. Without an explicit input limit, the context-minus-reservation budget is used. Reservation defaults to positive `limit.output`; `safety.outputReserveTokens` can explicitly override this accounting assumption. Unknown limits are not fabricated. Absolute thresholds still work without model metadata; relative decisions abstain. Model metadata is never mutated.

A provider measurement refers to its **completed request**, not the next assembled prompt. Prompt tokens include uncached input plus cache reads and writes; output and reasoning are separate. Approximate fallback measurements are visibly labeled. See [configuration and accounting](docs/configuration.md).

## Native TUI

Open `/context-guard` or **Open Context Guard** in the command palette for current prompt occupancy, effective input capacity, trigger/headroom, measurement freshness, compaction phase and nested agent status. A native sidebar section appears where the host mounts its sidebar; the panel also works on child routes and narrow terminals. The panel opens with selected-session metrics and a nested family list, using Orbit on wide allocations and a compact summary/list otherwise. **Up / Down** selects an agent; **i** opens its full Details and returns to Overview, while **c** opens retained performance Charts. Selection stays on the same session across views. The sidebar shows the primary session’s live context chart by default, horizontal occupancy bars for subagents, and conservative completed-agent grouping, with panel access before the tree. Click **History: hide** (or its palette command) to collapse the chart; it starts visible on each route and remount. Panel Details also includes it. The chart is scaled to effective input capacity, with a horizontal compaction threshold and recent usage samples. Pauses and temporarily lower values retain the previous chart level in gray with a dashed top; a confirmed compaction followed by reported usage permits a visible drop within the same trace. Key values stay visible as text. Estimates, unknown values, stale measurements and uncertain compaction remain explicit.

At 110 content cells × 28 usable rows or larger, the expanded native panel uses the Orbit workspace: a persistent family tree beside selected-session context/performance panels. Overview includes recent context history; Details scrolls through the panels, context history and complete diagnostics; Charts uses the right pane for retained performance. Smaller allocated panels keep the compact summary/list. The panel inherits its surrounding background and uses terminal-default text, standard ANSI colors and bold/dim/inverse styles, with no custom theme settings. Expired or disconnected performance readings show unknown current rates. The compact sidebar keeps its existing appearance. Use the **fullscreen** footer action to give the panel the full terminal width; **split** restores the host panel. The **Toggle Context Guard fullscreen** palette action has no default binding.

Across the sidebar, panel, and standalone dashboard, context percentages describe effective input capacity. “Near threshold,” “Threshold reached,” and tokens below/over threshold describe policy pressure; crossing a threshold does not promise a compaction. Stale quantities say “Last measured” and current pressure stays unknown. Status explains whether Guard can request compaction. A disconnected client shows last-known Guard status and whether measurements were retained; reconnecting never clears server suspension. Event-stream gaps require reload. Safety-storage failures require repairing storage and reloading. Summaries label measurements as “Provider reported” or “Estimated.” Details explains the request scope, compaction lifecycle, and performance terms before a labeled diagnostics section that retains exact codes. “Request accepted · waiting to start” is not completion; “ended · checking context reduction” still needs a confirming measurement. Exact reason codes remain available in panel/dashboard Details. OpenCode's native compaction remains available in observe mode.

The TUI reads bounded snapshots over public OpenCode RPC, including when telemetry is disabled. Remote clients also need a client-side package registration in `cli.json`; see [the example](examples/cli.jsonc) and [controls, installation and bounds](docs/configuration.md#native-context-guard-view). It targets the inspected 2.0.29 API. The actual local host passes wide root, child and narrow grandchild panel checks. Use **Context Guard: open panel** above a child composer, where the host hides its usual prompt and palette shortcut. For keyboard entry, set `options: { "openShortcut": "<leader>v" }` on the plugin registration in the client `cli.json`; this is unbound by default, and the child action displays the effective shortcut. tmux, Neovim and cross-machine remote validation remain open.

Press **?** in the native panel for scrollable help; **?** or **Escape** returns to the same view, selection, scroll position, and chart settings. Help pauses chart polling and keeps Guard status visible. Contextual footers reserve help/close controls at narrow widths. Overview distinguishes discovery in progress, resumable inventory, failed discovery, and the node bound; help exposes complete discovery diagnostics. Existing standalone keyboard meanings remain unchanged.

Enabling Context Guard after work has already started also shows the last reported prompt usage for idle sessions and subagents. Opening the sidebar or panel restores it from the public session context, preserving its original age and **out of date** label. Stale usage still shows tokens and occupancy percentage. Restoration respects model changes, reverts and completed compactions; unavailable provider usage stays unknown. These reads never request compaction, and transcript content is never retained or sent through the plugin RPC.

Per-session live TPS, average model throughput, average session throughput and observed TTFT appear for the main agent and each visible subagent in the sidebar and native panel agent rows. They also appear in panel Details, alongside explicitly labeled route-family statistics independent of selection or folded branches. Live TPS and TTFT use `~` to mark estimates; completed rates use provider totals. Configurable local history defaults to seven days with a 64 MiB total cap, independently of diagnostic telemetry. See [metric definitions and history exports](docs/configuration.md#live-performance-and-retained-history).

Compare models across retained sessions with `bun run inspect models /absolute/history-directory --model provider/model` (installed: `context-guard models ...`). JSON/CSV summaries include weighted request TPS, TTFT mean/median/p95, eligibility counts and coverage limits. Use `--from`, `--to` and `--agent` to scope the analysis. The standalone dashboard's Models screen shares these definitions; see [analytics definitions](docs/configuration.md#offline-model-analytics).

Press **c** in the Context Guard panel for retained-history terminal charts. View one metric at a time with **Left / Right**, change the time window with **[ / ]**, and select an agent instance with **Up / Down**. Press **c** to return to Overview or **q** to close the panel; controls and Guard status stay visible around the scrollable content. In Details, **Up / Down** scrolls instead of changing selection. **PageUp / PageDown** and **Home / End** move through family selection in Overview and scroll content in Details/Charts. Generate a self-contained interactive browser report with `bun run charts /absolute/history-directory --output report.html`. It includes filters, UTC timestamp tooltips, request statistics and SVG export. Installed packages expose the same command as `context-guard charts ...` (Bun required). See [chart controls and limits](docs/configuration.md#performance-charts).

Native Charts and standalone History distinguish a missing history service, timeout, incompatible response, rejected request, and temporary failure. A failed refresh keeps matching results labeled **Showing previous results**, with their last-loaded timestamp and original range. Press **r** to retry. Native Charts pause automatic polling for disabled recording or missing/incompatible/rejected services; retry checks again. Context monitoring and Guard enforcement remain independent of chart recovery.

## Inspect

The startup message reports a location-specific JSONL file under `$XDG_STATE_HOME/opencode-context-guard/` (default `~/.local/state/opencode-context-guard/`). A custom absolute `telemetry.path` is supported. Use a distinct file per plugin location/process.

```sh
bun run inspect /absolute/path/from/startup.jsonl --json
bun run inspect /absolute/path/from/startup.jsonl --history
```

Latest retained session records show parent ID, agent/model, measurement scope/confidence, current and cumulative usage, model limits, effective threshold/percentage, policy, peak, compaction count, lifecycle state, failures, and timestamps. History includes degraded-capability and capacity events. Logs rotate at 8 MiB by default, retaining one previous file; this is a bounded diagnostic history, not an audit database. The CLI reads files and does not contact the model.

## Safety and validation

Compaction runs at a runtime step boundary, including active subagent continuations. Admission is asynchronous: the plugin cannot promise a hard ceiling on the immediately following prompt or interrupt a long-running tool. It does not wait for an agent's task to finish.

Cooldown, hysteresis, deduplication, failure limits, persisted safety state, and completion-event tracking prevent repeated summaries. An accepted request is never labeled completed. Ambiguous admission, missing completion, and interrupted-plugin recovery suppress further automatic requests until explicit lifecycle evidence resolves uncertainty. Native manual compaction remains available. No private/experimental API is used.

```sh
bun run typecheck
bun test
bun run test:live   # explicitly SKIPs without the required server environment
```

Tests cover the core, mocked V2 events for concurrent nested subagents, restart safety, telemetry rotation, and CLI reading. [Live test instructions](docs/testing.md) describe the optional disposable-session check against an existing V2 host and a local OpenAI-compatible endpoint; no model download is required.

Further reading: [API investigation](docs/reconnaissance.md), [architecture](docs/architecture.md), [Budget Controller extension](docs/budget-controller.md), [compatibility and limitations](docs/compatibility.md), and [TUI UX review](docs/plans/tui-ux-review.md). [Compact sidebar defaults](docs/plans/sidebar-density.md) (UX-07) are implemented; see the [validation record](docs/validation/sidebar-density-2026-11-06.md). [Plain-language terminology](docs/plans/plain-language-terminology.md) (UX-09) is implemented; see the [delivery record](docs/validation/plain-language-terminology-2026-11-07.md). [Chart recovery (UX-10)](docs/plans/chart-failure-recovery.md) is implemented; see the [delivery record](docs/validation/chart-failure-recovery-2026-11-07.md).
