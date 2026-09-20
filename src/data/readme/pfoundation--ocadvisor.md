# ocAdvisor

OpenCode V2 plugin: consult Claude Fable as a senior advisor with your full
session transcript (including parent sessions for subagents).

## Installation

Requires OpenCode V2 with a configured connection for the advisor provider.

```sh
opencode plugin add @pfoundation/ocadvisor
```

This installs the latest release from npmjs.com. To pin a version:

```sh
opencode plugin add @pfoundation/ocadvisor@26.9.0
```

Manage the install with:

```sh
opencode plugin list            # show installed plugins
opencode plugin update          # update all outdated plugins
opencode plugin update @pfoundation/ocadvisor
opencode plugin remove @pfoundation/ocadvisor
```

After installing, upgrading, or removing the plugin, restart the background
service so the server loads the new code (`opencode service restart`).
Location eviction does not reload plugin files.

## Naming

The tool agents call is named `advisor`. Repo/file names (`ocAdvisor`),
the plugin id (`oc-advisor`), the metrics file
(`ocAdvisor-metrics.jsonl`), and the `OCADVISOR_*` environment variables
keep the old name for continuity; history counting, session discovery,
and the usage report accept both `advisor` and the pre-rename `ocAdvisor`.

## Configuration

The advisor model and limits are configurable. Defaults:
`anthropic/claude-fable-5-1#xhigh`, a 300 s generation timeout, no
transcript cap, TypeSafe screening on when a key is present, and
model-capability evidence from a local Artificial Analysis snapshot when
one is available.

| Option | Default | Meaning |
|---|---|---|
| `model` | `claude-fable-5-1` | Model id, or a full `provider/model#variant` reference |
| `provider` | `anthropic` | Provider id (overrides the provider in `model`) |
| `variant` | `xhigh` | Reasoning-effort variant; `null` or `"none"` pins no variant |
| `timeoutMs` | `300000` | Per-consultation generation timeout, in milliseconds |
| `maxTranscriptChars` | `0` | Cap on transcript size (`0` = unlimited); the most recent tail is kept |
| `agentEffort` | `false` | Let the agent pick effort per call: `true` allows `high`, `xhigh`, `max`; an array or comma string sets an explicit allow-list |
| `disabledForModels` | `[]` | Exact caller `provider/model` IDs that must not see or invoke advisor. Applies to every effort variant of that ID. A string array is the documented form; a comma-separated string is also accepted |
| `typesafe` | enabled with a key | `false` disables screening; `true` or an object enables it (see below) |
| `benchmarks.path` | data-directory snapshot | Absolute path to the local Artificial Analysis snapshot file |
| `benchmarks.mappingsPath` | beside the snapshot | Absolute path to the local model-mapping overrides file |
| `benchmarks.matchAnyProvider` | `false` | Resolve a model on another provider route when no exact provider binding exists (see below) |

Set them as plugin options in `opencode.json`. Because a plugin loaded from
the auto-discovered `plugin/` directory cannot receive options, list it
explicitly in the `plugins` array:

```jsonc
{
  "plugins": [
    {
      "package": "@pfoundation/ocadvisor",
      "options": { "model": "anthropic/claude-opus-5#max", "maxTranscriptChars": 120000 }
    }
  ]
}
```

To let the calling agent choose the reasoning effort per consultation:

```jsonc
{
  "plugins": [
    {
      "package": "@pfoundation/ocadvisor",
      "options": { "agentEffort": true }
    }
  ]
}
```

With `agentEffort` enabled the tool accepts an optional `effort` argument
(one of the allowed levels); when the agent omits it, the configured
`variant` is used. A requested effort that is not a variant of the advisor
model fails the call with an `invalid_effort` error instead of silently
falling back.

To hide advisor from selected *caller* models (for example Astra), list
their exact `provider/model` IDs. This is independent of `model` /
`provider`, which configure the advisor itself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@pfoundation/ocadvisor",
      "options": {
        "disabledForModels": ["openai/gpt-6-astra"]
      }
    }
  ]
}
```

Matching is exact and case-sensitive on `provider/model`. Effort variants
are ignored, so `openai/gpt-6-astra#xhigh` is still excluded by
`openai/gpt-6-astra`. Nearby names (`openai/gpt-6-astra-preview`) and other
providers do not match. Gateway IDs keep the serving provider: list
`openrouter/openai/gpt-6-astra` to exclude that route, not
`openai/gpt-6-astra`. Bare names, `#variant` suffixes, and wildcards are
rejected at config load.

Plugin options replace the environment list rather than merging it. An
explicit `[]` (or a blank string) clears configurable exclusions even when
`OCADVISOR_DISABLED_FOR_MODELS` is set:

```sh
OCADVISOR_DISABLED_FOR_MODELS=openai/gpt-6-astra,anthropic/claude-opus-5
```

After changing plugin options, restart the background service
(`opencode service restart`) so the server reloads configuration.

Environment variables work for any install and take
lower precedence than plugin options: `OCADVISOR_MODEL` (accepts
`provider/model#variant`), `OCADVISOR_PROVIDER`, `OCADVISOR_VARIANT`,
`OCADVISOR_TIMEOUT_MS`, `OCADVISOR_MAX_TRANSCRIPT_CHARS`,
`OCADVISOR_AGENT_EFFORT` (`true`, `false`, or a comma-separated allow-list),
`OCADVISOR_DISABLED_FOR_MODELS` (comma-separated exact `provider/model` IDs),
`OCADVISOR_BENCHMARKS_PATH`, `OCADVISOR_BENCHMARK_MAPPINGS_PATH`, and
`OCADVISOR_BENCHMARKS_MATCH_ANY_PROVIDER` (`true`/`false`).

The "already the advisor model" skip is still keyed to Fable
(`anthropic/claude-fable-*`); if you point the advisor at a different model,
that self-consultation guard no longer matches it. Fable sessions stay
blocked even when they also appear in `disabledForModels`.

## Usage policy (what agents are told)

Use `advisor` when an independent perspective could improve the approach, help
resolve a problem, or strengthen an implementation review. On substantial
work, consider consulting before committing to an approach, when progress
stalls, or before completing meaningful changes. Additional consultations are
welcome as the work evolves — particularly when new evidence appears, the
approach changes, or another concern needs review. Straightforward tasks
usually need no consultation.

Typical checkpoints:

| Situation | Mode / trigger |
|---|---|
| Deciding an approach with real tradeoffs | `plan` / `before_approach` |
| Stalled progress or contradictory evidence | `debug` / `stuck` |
| Reviewing meaningful changes before declaring done | `review` / `pre_complete` |

Rules enforced by the tool description and an injected session instruction:

- Always pass a concrete `question` naming the decision or artifact.
- Avoid repeating settled questions without new context (`followup` trigger to
  reconcile conflicts with primary-source evidence).
- Give the advice serious weight; a passing self-test alone is not
  counter-evidence. Clear factual corrections do not need another
  confirmation call.
- The tool is hidden in `anthropic/claude-fable-*` sessions (the current
  model is already Fable) and in sessions whose caller model is listed in
  `disabledForModels`. Direct calls there return a disabled notice and do
  not run TypeSafe screening or advisor generation. Eligibility is
  reevaluated per request, so switching models mid-session takes effect
  immediately; a child session uses its own model, not the parent's.
- When the `agentEffort` plugin option is enabled, an optional `effort`
  argument selects the reasoning effort for that consultation.
- When TypeSafe screening is active, a clearly unnecessary consultation
  returns a skip notice instead of advice, and an omitted effort may be
  chosen automatically. When model-capability evidence is available, it is
  weighed as context, not as a rule: a strong requester can still benefit
  from independent review and a weak requester still needs no advice for
  trivial work.

## TypeSafe screening (optional)

When `TYPESAFE_API_KEY` is available to the OpenCode server process, the
plugin can screen each consultation before paying for advisor generation.
One [TypeSafe](https://docs.typesafe.ai) System One request asks whether an
independent advisor would materially help at this point and — when the caller
did not pin an effort — which allowed effort fits. Only a clearly low need
probability skips generation; uncertain judgments preserve the consultation,
and any gate failure (timeout, transport, malformed answer) falls back to the
ordinary advisor call.

The need question asks what material value advice would add beyond the agent's
next direct action. Its explicit yes/no criteria distinguish unresolved design,
diagnosis, and correctness concerns from direct lookups, deterministic operations,
mechanical edits, and unchanged already-answered questions. Independent review
does not require the agent to be stuck. The criteria favor proceeding when the
user explicitly asks for the advisor or task context is missing; model identities
and benchmark advantages alone do not make a routine task worth consulting on.

Screening is enabled automatically when the key is present. Configure it with
the `typesafe` plugin option:

```jsonc
{
  "plugins": [
    {
      "package": "@pfoundation/ocadvisor",
      "options": {
        "typesafe": {
          "model": "jev-1.13.0",
          "timeoutMs": 3000,
          "skipBelow": 0.2,
          "minEffortConfidence": 0.6,
          "maxStateBytes": 16384,
          "efforts": ["high", "xhigh", "max"]
        }
      }
    }
  ]
}
```

| Option | Default | Meaning |
|---|---|---|
| `typesafe` | `true` when the key is set | `false` disables the gate completely; an object enables it with overrides |
| `model` | SDK default (`TYPESAFE_DEFAULT_MODEL`, else `jev-latest`) | Gate model; pin a version for reproducible decisions |
| `timeoutMs` | `3000` | Total gate budget, no retries |
| `skipBelow` | `0.20` | Skip only below this need probability |
| `minEffortConfidence` | `0.60` | Below this, keep the configured effort |
| `maxStateBytes` | `16384` | Byte budget for the compact decision state |
| `efforts` | `["high", "xhigh", "max"]` | Allowed automatic effort levels, intersected with the model's live variants |

Behavior notes:

- The gate runs only when an agent invokes `advisor`; ordinary model turns
  never trigger TypeSafe calls.
- A missing or blank key, or `typesafe: false`, means no client is created and
  no request is sent.
- Effort precedence when generation proceeds: an explicit tool `effort`, then
  a confident gate selection, then the configured `variant`.
- A skip returns a visible `advisor consultation skipped (typesafe)` notice
  and does not create, switch, or generate on the advisor session. On a
  proceed or fallback the tool output gains one short line, for example
  `gate: need=0.31, effort=xhigh (gate), decision=proceed` or
  `gate: decision=fallback, timeout`; bypassed screening adds nothing.
- Gate metrics (decision, need probability, selected effort, latency, tokens)
  are recorded alongside the consultation in `ocAdvisor-metrics.jsonl`.

## Model-capability benchmarks (Artificial Analysis)

The gate judges how much an independent advisor could help *this* requesting
model. To do that it needs two things: the actual model that made the call —
including its reasoning effort — and measured capability data for both that
model and the advisor. The plugin reads a local snapshot of
[Artificial Analysis](https://artificialanalysis.ai/) results; ordinary
consultations never touch the network for benchmark data.

What the gate receives, in the same single TypeSafe request:

- `models.requester` — `provider`, `model`, effort variant, and where the
  identity came from (`invocation_message`, `latest_message`,
  `session_fallback`, or `unknown`). The requester is the model behind the
  outgoing tool call, not the parent session or whatever the session row
  points at after a later switch.
- `models.advisor` — `provider`, `model`, and the effort policy in force:
  a pinned caller effort, gate-selectable candidates with their fallback, or
  a fixed default.
- `benchmarks` — the snapshot source and age, one match per profile, and
  comparisons for the shared metrics: Artificial Analysis Coding Index,
  Intelligence Index, and up to two reasoning/math results (HLE, GPQA, Math
  Index) when present. Code computes oriented differences
  (`advisor_minus_requester`); the model never does arithmetic. Scores that
  cannot be strictly compared carry an explicit `reason` (`effort_mismatch`,
  `effort_unknown`, `missing_requester`, …) and no delta.

Policy rule baked into the gate instructions: scores estimate comparative
capability, not certainty about the task. A strong requester can still benefit
from independent review or a fresh perspective when stuck, and a weaker
requester still needs no advice for trivial work. Unknown, mismatched, or
stale data is uncertainty — never evidence against consultation. No
automatic skip is ever derived from scores alone.

### Refreshing data between releases

The data lives in a local file the plugin reads at consultation time:

```text
$XDG_DATA_HOME/opencode/ocadvisor/artificial-analysis.json   # or ~/.local/share/...
```

The `ocadvisor` CLI refreshes it independently of plugin releases:

```sh
# Installed (npm bin):
ARTIFICIAL_ANALYSIS_API_KEY=... ocadvisor benchmarks update

# One-shot without a global install:
ARTIFICIAL_ANALYSIS_API_KEY=... bunx --package @pfoundation/ocadvisor ocadvisor benchmarks update

# Custom locations (absolute paths):
ocadvisor benchmarks update --path /srv/ocadvisor/artificial-analysis.json
ocadvisor benchmarks status --path /srv/ocadvisor/artificial-analysis.json --model openai/gpt-6-astra#xhigh
```

- `benchmarks update` fetches the official models endpoint once, validates it,
  and atomically replaces the snapshot. The old file is preserved byte-for-byte
  if fetch, validation, or write fails; concurrent updaters coordinate through
  a per-target lock. It prints the path, fetch time, model count, metric
  coverage, and content hash.
- `benchmarks status` is fully offline. It reports the active source
  (user file, bundled baseline, or unavailable), schema version, age, model
  count, metric coverage, mapping counts, and — with `--model` — the exact
  match or the reason a model is unresolved. Status describes what is on
  disk; a running plugin keeps serving its last good in-memory copy until a
  valid replacement is observed.
- Exit codes: `0` success; `1` update failed, no usable snapshot, or model
  unresolved; `2` usage error.
- The plugin picks up a refreshed snapshot on the next consultation without a
  restart. A consultation already in flight keeps the snapshot it started
  with, so both models are always resolved against one consistent dataset.

The API key is read from the environment, trimmed, sent only as the
`x-api-key` header, and never stored or logged. The free Artificial Analysis
API is rate-limited, so refresh manually (for example between releases)
rather than in a loop. Benchmark data is provided by Artificial Analysis
(https://artificialanalysis.ai/).

A validated snapshot from the package release date ships inside the package
as the bundled baseline, so a fresh install has real coverage before the
first refresh. Regenerate the shipped data with
`ARTIFICIAL_ANALYSIS_API_KEY=... bun scripts/buildBenchmarkData.ts
--refresh-snapshot` (mappings only without the flag; the docs recommend
refreshing the user snapshot instead of rerunning this).

### Model mappings

Published model IDs do not always line up with serving providers (gateways
add prefixes) or with the effort used in an evaluation. The plugin resolves
matches only through explicit bindings to stable Artificial Analysis IDs —
never fuzzy names, prefix stripping, or sibling substitution:

- `src/data/artificialAnalysis.mappings.json` ships baseline bindings
  (curated in `scripts/buildBenchmarkData.ts`, every entry pointing at a
  stable Artificial Analysis ID with its published evaluated effort).
- `model-mappings.json` beside the snapshot holds user overrides; these
  survive refreshes and plugin upgrades.
- Binding keys are exact `(providerID, modelID, variant)` tuples. A null
  variant covers unset variants only — it is never a wildcard. Variants are
  independent: a `high` binding does not match an `xhigh` call.
- Local bindings override bundled ones per tuple and can cover a newly
  released model with no plugin release:

```jsonc
{
  "schemaVersion": 1,
  "bindings": [
    {
      "providerID": "openai",
      "modelID": "gpt-6-astra",
      "variant": "xhigh",
      "aaModelID": "the-stable-artificial-analysis-uuid",
      "evaluatedEffort": "max",
      "evidenceURL": "https://artificialanalysis.ai/models/gpt-6-astra"
    }
  ]
}
```

Set `evaluatedEffort` to the effort the evaluation actually ran at when the
source documents it, or `null` when it is unreported. Bindings with a null
evaluated effort still show scores but are labeled `effort_unknown`, and
their deltas are withheld from strict comparison. Use `benchmarks status
--model` to check exactly how a model resolves.

Unknown or unmapped models are not an error: consultations proceed with no
benchmark evidence for them, and the gate treats the gap as uncertainty.

### Matching across provider routes

Bindings are provider-exact by default, which is the safest behavior: the
same model can differ by serving route. When the same model is served
through several routes (an aggregator, a gateway, or the host's own
provider namespace), enable the cross-provider fallback instead of
maintaining a binding per route:

```jsonc
{
  "plugins": [
    {
      "package": "@pfoundation/ocadvisor",
      "options": {
        "benchmarks": { "matchAnyProvider": true }
      }
    }
  ]
}
```

With it on, a request for `opencode/deepseek-v4.1-flash#max` resolves through
the official `deepseek/deepseek-v4.1-flash#max` binding: exact provider
bindings still win first, variants stay independent (`high` never borrows
`max`), and the stable AA ID plus its published evaluated effort are
preserved. If several providers define the same model and variant, local
bindings win over bundled ones. Check the outcome before relying on it:

```sh
ocadvisor benchmarks status --match-any-provider true --model opencode/deepseek-v4.1-flash#max
```

The equivalent environment variable is
`OCADVISOR_BENCHMARKS_MATCH_ANY_PROVIDER=true`.

## How it works

- `src/index.ts` → `dist/index.js` is the published entrypoint (default
  export); `index.js` at the repository root forwards to it so OpenCode's
  local-directory loader can resolve a configured checkout.
  `src/ocAdvisor.ts` holds the plugin implementation: it registers the
  `advisor` tool, injects a short selective-use instruction into eligible
  sessions via the `context` hook, and builds the transcript from the OpenCode
  SQLite database. `src/typesafeGate.ts` and `src/typesafeState.ts` hold the
  optional TypeSafe preflight. `src/benchmarkTypes.ts`, `src/artificialAnalysis.ts`,
  `src/benchmarkUpdate.ts`, `src/benchmarkStore.ts`, `src/benchmarkMatch.ts`,
  and `src/benchmarkEvidence.ts` hold the local Artificial Analysis snapshot,
  its refresh transaction, the hot-reloading reader, and exact model mapping;
  `src/cli.ts` exposes the maintenance commands.
- The tool is registered as a direct tool (`options.codemode: false`).
  OpenCode 2 otherwise exposes plugin tools only through the `execute` Code
  Mode tool, whose tool log records each nested call's input but hides the
  script output on success, so the advisor's answer never appeared in the
  TUI. As a direct tool, the TUI's tool log shows the call's `mode`,
  `trigger`, and `question` fields followed by `output:` with the answer.
  Direct calls also avoid Code Mode's output-size truncation. The `context`
  hook can only hide the tool (Fable sessions and `disabledForModels`
  callers), never add one, and the selective-use instruction is injected
  only when the tool is available to the request.
- Before each consultation it checks OpenCode for support of the configured
  advisor model: the provider is enabled (`provider.get`), the model is
  available (`model.list`, configured variant when listed), and a connection
  exists (`integration.connection.active`). The older `catalog.*` discovery
  namespace remains as a compatibility fallback.
- Benchmark snapshots and mapping overrides are read through one cached
  store per process. Before each gate-enabled consultation the store
  re-stats both files and reloads only when their identity changed, so CLI
  refreshes land on the next call without a restart; invalid replacements
  keep the last good data and unmatched scenarios report explicit coverage
  instead of guessing.
- Consultations run as transient generations on a dedicated, reusable
  `advisor` session pinned to the configured model (default
  `anthropic/claude-fable-5-1#xhigh`) via `session.create` +
  `session.switchModel` once, then `session.generate` per call. Transient
  generations do not mutate session history, so the advisor session stays
  empty while its stats attribute advisor spend. Title discovery also
  accepts the pre-rename `ocAdvisor` session title. When the agent requests
  a different effort, the session is re-pinned to that variant first
  (a no-op when it already matches).
- The generation timeout wraps only the model call, not the time a call
  spends queued behind another consultation. Oversized transcripts are
  capped to the configured `maxTranscriptChars` (keeping the recent tail)
  because transcript size drives latency and can otherwise exhaust the
  timeout.
  Session instructions are folded into the prompt because the generation
  APIs accept prompt text only.
- Why a pinned session instead of one-shot `POST /api/generate`? One-shot
  generation returns 503 for Anthropic (OAuth credential not resolved on
  that path) while the session path works. Revisit if that changes.
- Repeat control is advisory, not blocking: the plugin counts prior
  consultations in the session chain and tells the advisor to focus on
  what is new since then.
- Real failures (provider/model/connection issues, missing
  transcript/session) throw so OpenCode records them as errors instead of
  silent `completed` results. Fable and configured-model skips still return
  a disabled notice without TypeSafe or advisor requests.

## Metrics

Every invocation appends one JSON line to
`~/.local/share/opencode/ocAdvisor-metrics.jsonl` with timestamp, session,
caller model/agent, mode, trigger, effective effort, outcome (`advisor_response`,
`skipped_fable`, `skipped_model`, `skipped_typesafe`, `error`, `no_transcript`,
`no_session`), error type
(`provider_unavailable`, `model_unavailable`, `invalid_effort`, `auth`, …), latency,
transcript size, prior-consultation count, and transport (`via`).
Token usage is `null`: OpenCode generation returns text only.
Logging is best-effort and never breaks a call.
When the tool is hidden for the request, there is no invocation and no
metrics row. A direct call that still reaches the executor for an excluded
caller records one `skipped_model` line and no TypeSafe gate field.

Gate-enabled calls also carry a compact `benchmarks` object: snapshot source
(`user`/`seed`/`unavailable`), content hash, fetch time, hash-verified flag,
requester identity plus match status, advisor effort policy, the default
match, and — once generation runs — the final effort and its match. Rows
from before this feature simply lack the field; the report treats it as
optional and summarizes benchmark coverage when present.

## Activation

The server loads plugin files once per process, so after installing or
updating the plugin, or after changing plugin options such as
`disabledForModels`, restart the background service
(`opencode service restart`) or the old code and config keep running.
Location eviction does not reload plugin files.

## Local development install

A configured local checkout (the global `plugins` entry pointing at the
repository directory) is resolved through the root `index.js` shim, which
forwards the compiled `dist/index.js`. After changing `src/`, run
`bun run build` and restart the service:

```sh
opencode plugin list
opencode api get '/api/plugin?location%5Bdirectory%5D=%2Fhome%2Fubuntu%2Fdev%2FocAdvisor'
```

The first command lists CLI-managed package plugins; the second reports the
server plugins for an explicit location, where `oc-advisor` should appear
active. The config-directory watcher only tracks the `plugin/` and `plugins/`
directories, so changes to this checkout need an explicit service restart.

## Development

```sh
bun install           # install dependencies (frozen lockfile in CI)
bun test              # unit tests
bun run typecheck     # typecheck (tsc --noEmit)
bun run build         # compile dist/ + copy benchmark data (runs on npm pack/publish)
bun run report        # advisor usage over the last 30 days
bun src/usageReport.ts --days 7
bun src/cli.ts benchmarks status          # the shipped CLI, from source
```

## Evaluation

The report combines the metrics log with the session database and shows
generated advice, skips, gate decisions, and caller results plus eligibility
coverage (sessions with ≥10 non-Fable tool calls vs. sessions that received
generated advice). That coverage figure is a non-Fable activity proxy, not a
historical reconstruction of per-location `disabledForModels` settings.
Database and metrics views are independent and must not be
summed: a caller entry can fail while the plugin still recorded a generated
response, and a completed entry without visible output is reported as
unknown rather than success. Re-run it after a few weeks of the new
checkpoints to judge coverage and whether advice is changing outcomes. The
usage report is a maintainer tool run from a source checkout; it is not
shipped in the npm package.

## Gate evaluation

`bun src/typesafeGate.eval.ts [--model jev-1.13.0]` runs labeled cases from
`src/fixtures/typesafeGate.cases.json` against the gate and prints per-case
decisions plus false-skip, unnecessary-proceed, fallback, latency, token, and
cost figures. Cases may carry synthetic benchmark profiles (fake model IDs
and scores) that exercise the full evidence wire format without touching real
snapshot files; the fixture file says so explicitly. It requires
`TYPESAFE_API_KEY` in the process environment and calls TypeSafe only — never
the advisor model. Neither the script nor its fixtures are published.

Initial run (2026-09-19, `jev-1.13.0`, six cases, 4,240 input tokens,
≈$0.00018): no false skips on must-consult cases, no fallbacks, latency
p50/p95 266/626 ms.

Benchmark-aware run (same model and day, ten cases including four synthetic
benchmark profiles — stronger requester, weaker requester, unknown scores,
stale snapshot — 11,164 input tokens, ≈$0.00047): **0 false skips** on
must-consult cases, including the stronger-requester review and the
unknown-scores debug; the stale-snapshot review proceeded as well. Two
unnecessary proceeds on routine questions landed at need 0.23–0.33, above the
conservative default `skipBelow` (0.20): uncertainty preserves consultation
by design. No fallbacks; latency p50/p95 280/607 ms. Adjust the threshold
only from observed cases and re-run the evaluation after changing it.

The [2026-09-20 gate-policy report](docs/reports/2026-09-20-gate-policy.md)
compares threshold changes, identity-neutral wording, explicit material-value
criteria, task-only screening, and a separate routine classifier over 24 synthetic
scenarios. The selected material-value question keeps `skipBelow: 0.20` and model
evidence. In 72 final confirmation calls it skipped all 30 routine consultations
and preserved all 42 useful ones. The report records the held-out check, full
criteria, tradeoffs, and limitations; these are scenario results, not a measured
production error rate. The opt-in evaluation now includes mechanical edits,
unchanged repeat questions, explicit advisor requests, and consequential small
changes. Recalibrate after changing either question wording or threshold.

### End-to-end benchmark data flow

1. Fresh install: the plugin reads the bundled snapshot shipped with the
   package, so real coverage exists before any refresh. User files, when
   present, take precedence over it.
2. An operator with an Artificial Analysis key runs
   `ocadvisor benchmarks update`. The validated snapshot lands in the data
   directory and the next consultation logs its content hash.
3. `ocadvisor benchmarks status --model ...` confirms which models now
   resolve, and local `model-mappings.json` entries cover anything missing.
4. A later plugin upgrade leaves the user snapshot and mappings untouched —
   they live outside the package — so coverage persists across releases.

## Versioning

Releases use calendar versioning (`YY.M.patch`, e.g. `26.9.0`). The GitHub
Release tag (`v26.9.0`) is the source of truth: the publish workflow overwrites
`package.json` `version` from the tag. Do not bump `version` in `package.json`
for a release; leave it at the last published version.

## Releasing (maintainers)

1. Land the change on `master` and wait for CI to pass. Leave `package.json`
   `version` as the last published release.
2. Cut a GitHub Release on tag `vYY.M.patch`. Pre-releases (the release's
   pre-release flag, or a `-suffix` version) publish under dist-tag `next`;
   stable releases publish `--tag latest`. Pushing a tag alone publishes
   nothing.
3. The `publish` workflow sets the package version from the tag, re-runs
   every gate, and publishes via OIDC trusted publishing (no npm token).
   `v*` tag creation is restricted to maintainers by a ruleset.
4. Verify: `npm view @pfoundation/ocadvisor@YY.M.patch`.
