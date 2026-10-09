<div align="center">

<img src="https://github.com/PhillipChaffee/ultraopen/raw/main/assets/logo.svg" width="72" alt="ultraopen logo" />

# ultraopen

Deterministic multi-agent workflow orchestration and an `ultracode` effort mode for
[opencode](https://github.com/anomalyco/opencode) — the open-source AI coding agent that runs in
your terminal.

[![CI](https://github.com/PhillipChaffee/ultraopen/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipChaffee/ultraopen/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/PhillipChaffee/ultraopen/badge.svg?branch=main)](https://coveralls.io/github/PhillipChaffee/ultraopen?branch=main)
[![Security](https://github.com/PhillipChaffee/ultraopen/actions/workflows/security.yml/badge.svg)](https://github.com/PhillipChaffee/ultraopen/actions/workflows/security.yml)
[![opencode](https://img.shields.io/badge/opencode-%3E%3D%201.18.20-7C3AED)](https://github.com/anomalyco/opencode)

**Fan out many agents at once · validated results · resume instead of restarting**

[Install](#install) · [Authoring workflows](#authoring) · [Compatibility](#compatibility) · [Development](#development)

</div>

> [!TIP]
> **See it live.** `bash test/e2e/tui-dev.sh` starts opencode with the real TUI rendering —
> nothing here between you and the thing.

A workflow is a deterministic JavaScript driver in which `agent()` is the only nondeterministic
call. Control flow — fan-out, loops, dedup, thresholds, early exit, synthesis — is real code, so
runs are reproducible and resumable: resume a failed run and the agents that already finished
replay from the journal instead of running — and billing — again.

```javascript
export const meta = {
  name: 'review-changes',
  description: 'Review changed files across dimensions, verify each finding',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const results = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, { phase: 'Review', schema: FINDINGS }),
  review => parallel(review.findings.map(f => () =>
    agent(`Adversarially verify: ${f.title}`, { phase: 'Verify', schema: VERDICT })
  )),
)

return { confirmed: results.flat().filter(Boolean) }
```

<a id="install"></a>

## 📦 Install

```bash
opencode plugin ultraopen -g
```

One command: it installs the package and registers it in both config files — `opencode.json` for
the server (the tools), `tui.json` for the TUI surfaces — then restart opencode. Without `-g` the
plugin scopes to the project's `.opencode/` configs instead.

The first boot pays the registry fetch — the TUI's startup window may stretch while the package
downloads. After that, everything is local.

Options go through the tuple form — never a new top-level key, which opencode hard-rejects:

```json
{ "plugin": [["ultraopen", { "concurrency": 8, "ultracode": true }]] }
```

<details>
<summary>Manual install — write the config yourself</summary>

The `plugin` array lives in both `opencode.json` and `tui.json` — TUI plugins are read only from
`tui.json`; `opencode.json`'s array never reaches the TUI runtime:

```jsonc
// opencode.json and tui.json, both:
{ "plugin": ["ultraopen"] }
```

`opencode plugin` does exactly this — it reads the package's manifest (its `./server` and `./tui`
exports) and patches each config file.

</details>

### Updating

Published installs are cached and `@latest` resolves only on first install — a new release doesn't
reach an existing install on its own. To pick one up:

```bash
rm -rf ~/.cache/opencode/packages/ultraopen*
```

then restart opencode. To pin a version instead, name it: `plugin: ["ultraopen@0.1.0"]` installs
into a versioned cache tree, and `opencode plugin ultraopen@0.2.0 -g -f` rewrites the pin (`-f`
rewrites config entries; it never refetches a bare `@latest`).

| Option | Default · meaning |
| --- | --- |
| `concurrency` | 8 — global cap on live agents; clamped 1–32, `0` rejected |
| `ultracode` / `mode: "ultracode"` | off — enable the `ultracode` effort mode |
| `ultracodeMaxRuns` | 8 — live runs an ultracode-active session may hold; clamped 1–32. Non-ultracode sessions always hold one |
| `agentDeadlineMs` | 4 h — wall-clock ceiling per agent; `0` disables (the wall clock only bounds pathology) |
| `agentIdleMs` | 5 min — inactivity limit per agent, reset on child progress. Stalled agent: killed at the limit, restarted up to 3 times |
| `keywordBehavior` | `"one-shot"` — a plain `ultracode` mention fans out only that task; `"session"` keeps the mode on |
| `budgetTokens` | unset — output-token ceiling per launch: one launch and its nested runs share the family ceiling; concurrent launches each hold their own. Reached: further `agent()` calls throw and the run fails. Unset or invalid = uncapped |
| `sizeGuideline` | unset — size advice appended to the tool description (the same channel as Claude Code's size guideline) |
| `effortPreference` | `["xhigh", "max", "high", "medium", "low"]` — the effort ladder tried in order |
| `runMode` | `"background"` — the launch contract ([docs/launch-contract.md](./docs/launch-contract.md)); `"blocking"` waits for the final result. Env `ULTRAOPEN_WORKFLOW_SYNC=1` forces blocking |
| `largeWorkflowAgents` | 25 — projected-agent count at which a launch is flagged "Large workflow: ~N agents projected". Advisory only |
| `autoResume` | on — re-execute interrupted background runs on the next start. A run stopped by request never resumes; `false` restores manual-resume-only |
| `autoResumeTtlHours` | 24 — how long an interrupted run stays worth auto-resuming; older runs stay hand-resumable until retention prunes them |
| `autoResumeMax` | 1 — interrupted runs may auto-resume per boot, oldest first |
| `workflowPaths` | — — extra saved-workflow directories, added between the two defaults |

The plugin also installs permission defaults — `workflow` asks, `workflow_status` is allowed —
and ships the workflow-authoring skill (see [Authoring workflows](#authoring)).

<a id="features"></a>

## ✨ What you get

| Capability | What it does |
| --- | --- |
| **`workflow` tool** | Runs a JavaScript script that fans out across parallel subagents — background by default: the tool returns the run id at once and the run continues detached. Blocking is one option flip ([Install](#install)) |
| **`workflow_status` tool** | Reads a run's live state from disk — status (`running` `completed` `failed` `cancelled` `orphaned`), phase, agent counts, token total, `budget { total, spent }`, last logs, final value or failure text once settled. A `wait` blocks one call up to 300 s instead of polling. Read-only, cross-process, crash-safe: the run directory is the source of truth |
| **Notifications, not polling** | `<workflow-completed>`/`<workflow-failed>` lands in the conversation when the run settles (mechanics in [docs/launch-contract.md](./docs/launch-contract.md)) |
| **Stop & auto-resume** | `workflow({ stop })` cancels a detached run; a run its process interrupted auto-resumes on the next start (guards in [docs/launch-contract.md](./docs/launch-contract.md)) |
| **Saved workflows** | Named scripts run by name: `workflow('deploy-check')` in any script, one `/workflow-<name>` command per saved file, `/workflow-resume <runId>` to replay a past run. Defaults: `<config>/ultraopen/workflows` and the project's `.opencode/ultraopen/workflows` (which wins on collision); `workflowPaths` adds more |
| **Schema-forced output** | `agent(prompt, { schema })` returns a validated object; invalid output retries up to three attempts in the same session; a schema that can never be satisfied is rejected before the subagent starts |
| **Resume** | `resumeFromRunId` replays unchanged calls instantly; the first edited call and everything after it in the same scope runs live. Failed runs keep their partial journal |
| **`ultracode` mode** | Raises reasoning effort and makes fan-out the default. Four ways in: the `ultracode` agent, the keyword, `/ultracode`, a project config flag. A filename mention (`src/ultracode.ts`) never triggers the keyword (`keywordBehavior` flips the default, [Install](#install)) |
| **Safety rails** | Recursion guard (a nested `workflow()` runs one level only), per-agent inactivity deadline plus wall-clock ceiling, global concurrency cap, orphan reaper, retention pruning, large-run advisory — advice only, never a block (numbers below) |
| **Run control (in progress)** | `stop` is live; a run's directory accepts `control.jsonl`: `pause`/`resume` gate new agents while in-flight work finishes, `stop-run`/`stop-agent` abort the run or one child — `stop-run` records the run `cancelled` exactly as `workflow({ stop })` does (#134), `restart-agent` parsed but not implemented. TUI selection/restart keys and the drill-down view are the next slice |
| **Approval prompt** | Names the real workflow (the launch's `title` argument is run metadata — it surfaces on the run's own renders, not in the prompt), its description and phases, the run id, the projected agent count. The script is persisted to the run directory **before** the prompt — open its `script.js` and read exactly what will run. `always` is scoped per workflow name |

**Script globals.**

| Global | Behavior |
| --- | --- |
| `pipeline(items, ...stages)` | streams items through stages with no barrier; a stage gets `(prev, item, index)` |
| `parallel(thunks)` | a barrier over an array of thunks; a failing thunk becomes `null` |
| `agent(prompt, opts?)` | spawns a subagent; returns a validated object with `{ schema }`, `null` if nothing usable |
| `phase(title)`, `log(msg)` | progress narration |
| `budget` | `{ total, spent(), remaining() }` output-token ceiling |
| `args` | the tool call's `args` value, verbatim |
| `workflow(...)` | launches a nested run — one level deep, sharing the family budget |

<details>
<summary>Engine limits and agent options</summary>

| Limit | Value |
| --- | --- |
| Agents per run | 1,000 |
| Items per `pipeline`/`parallel` call | 4,096 |
| Script size | 512 KiB (524,288 characters) |
| Concurrency | 1–32 (default 8) |
| Per-agent inactivity limit | 5 min without progress (resets on any child event) |
| Per-agent wall clock | 4 h default, `0` disables |
| Stall auto-restart | up to 3 restarts per agent after an idle-limit kill; a wall-clock kill never restarts |
| Large-run advisory | ≥ 20 scheduled agents or ≥ 500k projected output tokens |
| Retention | finished run directories pruned after 30 days |

`agent()` accepts `label`, `phase`, `schema`, `model`, `effort`, `agentType`, `isolation`,
`disallowedTools`.

</details>

<a id="how-it-works"></a>

## 🎬 What a run looks like

Real captures from the live TUI — the same machinery the e2e suites drive — re-themed in
presentation only.

**1. Hand the model the script; the engine fans out instantly.** The tool call returns at once
with a `<workflow-launched>` handle, and four review agents spawn in parallel: the bottom strip
gains one row per agent, the sidebar fills in, and `ultracode ⠋ 0/4` appears beside the input.
(The transcript also echoes the raw `workflow` call — an upstream renderer quirk, and exactly why
the progress surfaces exist.)

![Invoking a workflow](https://github.com/PhillipChaffee/ultraopen/raw/main/assets/screenshots/01-invoking.png)

**2. The run keeps working.** Two minutes in, the four reviewers have reported (green rows, token
counts) and a second wave is verifying their findings by execution — real model calls, real file
reads.

![The fan-out mid-run](https://github.com/PhillipChaffee/ultraopen/raw/main/assets/screenshots/02-grinding.png)

**3. Up close: the sidebar panel.** Opened with `Ctrl-x` then `b` — one summary line per run,
one row per agent, glyphs for state.

![The sidebar panel](https://github.com/PhillipChaffee/ultraopen/raw/main/assets/screenshots/03-sidebar.png)

**4. The findings arrive on their own.** When the run settles, a `<workflow-completed>`
notification is delivered into the transcript, and the model reports what the run confirmed:
here, concrete findings on a staged demo diff, from an uncaught fetch to an off-by-one loop in
`src/pagination.ts`.

![Findings in the transcript](https://github.com/PhillipChaffee/ultraopen/raw/main/assets/screenshots/04-results.png)

Agents show as `⠋` running, `✓` done, `✗` failed. All three surfaces (strip, sidebar, prompt
status) are served by one shared poller — one directory pass per second — so having them all
open costs one read. The surfaces update imperatively (`node.content` + `requestRender()`) to
work around an upstream 1.18.x rendering limitation; `src/tui/index.tsx` documents the
constraint.

<a id="why"></a>

## 🤔 Why ultraopen

opencode can already spawn subagents. The trouble is orchestration by prompting: ask one model to
fan out and you get a nondeterministic pile of parallel turns — lost the moment a turn stalls.
ultraopen makes the fan-out a script: short enough to read in one screen. This is not a framework
— no DSL, no server process, nothing to deploy.

| | Ad-hoc prompt fan-out | Orchestration frameworks | ultraopen |
| --- | --- | --- | --- |
| Orchestration lives | in the model's head | a graph DSL plus a server | plain JS, inside your agent |
| Runs are reproducible | every run differs | deterministic | deterministic — same script, same flow |
| Recover from a crash | start over | varies | resume; finished agents replay instantly |
| Reviewable | no | partially | the script is a diff like any other |
| Cost to start | none | a new runtime and concepts | a plugin you already installed |

If you need cross-language runtimes, hosted memory, or a standalone server, use a framework.
ultraopen only tries to be the right tool when the work already happens in opencode.

<a id="authoring"></a>

## 📖 Authoring workflows

The full authoring reference lives at
[skills/workflow-authoring/SKILL.md](./skills/workflow-authoring/SKILL.md): the globals table,
the engine-enforced rules, composable patterns, the run-directory layout, and debugging/resume
notes. It ships inside the installed package, so the model driving your workflow sees the same
reference.

<a id="compatibility"></a>

## 🧭 Compatibility and known limits

ultraopen is tested against opencode 1.18.x and aims to keep current with opencode releases; 0.1.0
was verified against opencode 1.18.31 by the live e2e suites (`test/e2e`). The full working,
known-gap, and cosmetic inventory — each probe with its implementation note — lives in
[docs/compatibility.md](./docs/compatibility.md). On an opencode older than 1.18.20, the npm
install loads nothing: the version gate skips the plugin at boot with a version error (path
installs skip this gate). Headline gaps:

- `agent()`'s `isolation: "worktree"` option is inert in the live wiring — ours to wire, not
  upstream (`worktreeRoot` is never passed).
- Schema-forced agents (`schema:` on `agent()`) can fail against Together with an empty
  `APIError` when ANY tool in the session's toolset carries a `$ref` in its JSON Schema
  (workarounds in the doc).
- The TUI hides synthetic user messages from the timeline (upstream 1.18.x), so a completion
  notification never shows as its own row — the turn it starts is what you see.

<a id="development"></a>

## 🛠️ Development

### Local development install

1. Build:
   ```bash
   bun install && bun run build
   ```
2. Reference it from both config files — the same `plugin` array in each. TUI plugins are read
   only from `tui.json`; `opencode.json`'s `plugin` array never reaches the TUI runtime.
   ```jsonc
   // opencode.json and tui.json, both:
   { "plugin": ["/absolute/path/to/ultraopen"] }
   ```
   That's it — opencode loads the plugin on next start.
3. An absolute path is classified as a file plugin, which skips the version-compatibility gate,
   so there is no publish step while iterating.
4. Options go through the tuple form — never a new top-level key, which opencode hard-rejects:
   ```json
   { "plugin": [["/path/to/ultraopen", { "concurrency": 8, "ultracode": true }]] }
   ```

### Testing

```bash
bun run check   # lint + strict typecheck + tests (95% coverage gate) + Node parity
bun run m0      # provider smoke test against a live model

bash test/e2e/probe-timeout-test.sh   # harness regression test: bounded curl probes, no live processes
bash test/e2e/technical.sh   # live end-to-end: real opencode processes, real model calls
bash test/e2e/visual.sh      # live TUI in tmux: all three progress surfaces, permission flow
bash test/e2e/tui-dev.sh     # run `opencode` locally with the TUI plugin actually rendering
```

The e2e suites run in an isolated scratch XDG home (real provider auth, throwaway state) and
assert on the plugin's own on-disk run artifacts plus captured tmux panes. They make real model
calls — pennies per run on Together, on the default suite model (override with `E2E_MODEL`).
Measured flake rate: zero flake events in one clean run of both suites — bad weather is
unmeasured, but the watchdog plus per-case retry bound it. The screenshots above are rendered
from `visual.sh` frame captures (see `assets/`).

`tui-dev.sh` exists because of a dev-checkout trap: the TUI host injects its own Solid/OpenTUI
into a plugin only when the plugin directory cannot resolve them, and `node_modules/solid-js`
ships Solid's SSR build — signals never update, so the surfaces silently render nothing. A dev
checkout must stash the shadowing packages (the wrapper does it for you); a published install is
unaffected.

`bun run m0` is a re-runnable health check for the one interaction that cannot be verified from
source: that `format: {type:"json_schema"}` works together with a high reasoning variant, and
that forced tool choice still leaves an agent free to research first — a path upstream has no
test coverage for, so it can regress silently in an opencode release.

CI runs lint, typecheck, the coverage-gated tests, and Node parity on ubuntu and macOS. The
**Coverage Status** badge is the percentage Coveralls computes from each coverage-gated run
(free for public repos, no secret to set); **Security** is a weekly zizmor audit of the workflow
files themselves.

## ⚖️ License

MIT — see [LICENSE](./LICENSE). Attribution for the adapted workflow tool description lives in
[NOTICE](./NOTICE).