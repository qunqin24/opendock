# OpenCode V2 Context Guard

Configurable early compaction for root sessions and nested agents, using OpenCode's native durable compaction API. No model-limit changes, prompt injection, custom summaries, or task/workflow rewrites. Observe mode is the default.

Targets **`@opencode/plugin@2.0.29`**. The published SDK, official documentation, runner implementation, and upstream continuation test were inspected. The real 2.0.29 server and native TUI now pass [local verification with a synthetic provider](docs/validation/tui-2.0.29-2026-10-16.md); real-provider compaction and Superpowers validation remain unverified. See [compatibility](docs/compatibility.md).

## Install

The intended npm distribution is **`@cesarus777/opencode-cgp`**. It becomes available after this repository's first publication. The unscoped `opencode-context-guard` name belongs to another project; do not install it expecting this plugin.

Minimum supported host: **OpenCode V2 2.0.29**. Only 2.0.29 has been tested; V1 is unsupported.

After this project's first publication, register the global package through the native manager:

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

For a known-good published version, pin the exact version in the existing entry's `package` field or use the manager. Use `0.1.0` only after this project publishes that version.

```sh
opencode plugin add @cesarus777/opencode-cgp@0.1.0
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

Replace `master` with a version tag or full commit hash to pin a revision. Git installs require Bun and development dependencies to run `prepare`; unlike npm artifacts they build from source. Prefer an exact published prerelease such as `@cesarus777/opencode-cgp@0.2.0-beta.1` after publication. Git preparation has not been verified with the real plugin manager; use a built local checkout if it fails.

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

## Thresholds

| Type        | Example  | Trigger                                    |
| ----------- | -------- | ------------------------------------------ |
| `tokens`    | `131072` | Prompt tokens ≥ value                      |
| `ratio`     | `0.25`   | Prompt tokens ≥ ceil(usable input × value) |
| `remaining` | `32768`  | Usable input − prompt tokens < value       |

Usable input is `min(positive limit.input, limit.context − output reservation)` when both constraints are known. Without an explicit input limit, the context-minus-reservation budget is used. Reservation defaults to positive `limit.output`; `safety.outputReserveTokens` can explicitly override this accounting assumption. Unknown limits are not fabricated. Absolute thresholds still work without model metadata; relative decisions abstain. Model metadata is never mutated.

A provider measurement refers to its **completed request**, not the next assembled prompt. Prompt tokens include uncached input plus cache reads and writes; output and reasoning are separate. Approximate fallback measurements are visibly labeled. See [configuration and accounting](docs/configuration.md).

## Native TUI

Open `/context-guard` or **Open Context Guard** in the command palette for current prompt occupancy, effective input capacity, trigger/headroom, measurement freshness, compaction phase and nested agent status. A native sidebar section appears where the host mounts its sidebar; the panel also works on child routes and narrow terminals. Estimates, unknown values, stale measurements and uncertain compaction remain explicit.

The TUI reads bounded snapshots over public OpenCode RPC, including when telemetry is disabled. Remote clients also need a client-side package registration in `cli.json`; see [the example](examples/cli.jsonc) and [controls, installation and bounds](docs/configuration.md#native-context-guard-view). It targets the inspected 2.0.29 API. The actual local host passes wide root, child and narrow grandchild panel checks. Use **Context Guard: open panel** above a child composer, where the host hides its usual prompt and palette shortcut. tmux, Neovim and cross-machine remote validation remain open.

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

Further reading: [API investigation](docs/reconnaissance.md), [architecture](docs/architecture.md), [Budget Controller extension](docs/budget-controller.md), [compatibility and limitations](docs/compatibility.md).
