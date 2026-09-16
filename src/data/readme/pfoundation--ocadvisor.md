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

The advisor model and limits are configurable. Defaults are unchanged:
`anthropic/claude-fable-5-1#max`, a 300 s generation timeout, and no
transcript cap.

| Option | Default | Meaning |
|---|---|---|
| `model` | `claude-fable-5-1` | Model id, or a full `provider/model#variant` reference |
| `provider` | `anthropic` | Provider id (overrides the provider in `model`) |
| `variant` | `max` | Reasoning-effort variant; `null` or `"none"` pins no variant |
| `timeoutMs` | `300000` | Per-consultation generation timeout, in milliseconds |
| `maxTranscriptChars` | `0` | Cap on transcript size (`0` = unlimited); the most recent tail is kept |

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

Environment variables work for any install and take
lower precedence than plugin options: `OCADVISOR_MODEL` (accepts
`provider/model#variant`), `OCADVISOR_PROVIDER`, `OCADVISOR_VARIANT`,
`OCADVISOR_TIMEOUT_MS`, `OCADVISOR_MAX_TRANSCRIPT_CHARS`.

The "already the advisor model" skip is still keyed to Fable
(`anthropic/claude-fable-*`); if you point the advisor at a different model,
that self-consultation guard no longer matches it.

## Usage policy (what agents are told)

Use `advisor` selectively on substantial, non-trivial work. Straightforward
tasks normally need no consultation.

- Normally **at most one consultation per task**, at the point where a
  second opinion has the most value — pick one stage, not all three:

| Situation | Mode / trigger |
|---|---|
| Consequential unresolved design decision | `plan` / `before_approach` |
| Blocker after two substantially different attempts | `debug` / `stuck` |
| High-risk change with a specific unresolved correctness concern | `review` / `pre_complete` |

Rules enforced by the tool description and an injected session instruction:

- Always pass a concrete `question` naming the decision or artifact.
- A second consultation requires material new evidence, a distinct
  unresolved issue, or an explicit user request (`followup` trigger to
  reconcile conflicts with primary-source evidence).
- Give the advice serious weight; a passing self-test alone is not
  counter-evidence. Clear factual corrections do not need another
  confirmation call.
- The tool is hidden in `anthropic/claude-fable-*` sessions (the current
  model is already Fable); calls there return a disabled notice.

## How it works

- `src/index.ts` → `dist/index.js` is the published entrypoint (default
  export). `src/ocAdvisor.ts` holds the plugin implementation: it registers
  the `advisor` tool, injects a
  short selective-use instruction into eligible sessions via the `context` hook,
  and builds the transcript from the OpenCode SQLite database.
- The tool is registered as a direct tool (`options.codemode: false`).
  OpenCode 2 otherwise exposes plugin tools only through the `execute` Code
  Mode tool, whose tool log records each nested call's input but hides the
  script output on success, so the advisor's answer never appeared in the
  TUI. As a direct tool, the TUI's tool log shows the call's `mode`,
  `trigger`, and `question` fields followed by `output:` with the answer.
  Direct calls also avoid Code Mode's output-size truncation. The `context`
  hook can only hide the tool (Fable sessions), never add one, and the
  selective-use instruction is injected only when the tool is available to
  the request.
- Before each consultation it checks OpenCode for support of the configured
  advisor model: the provider is enabled (`catalog.provider.get`), the model
  is available (`catalog.model.list`, configured variant when listed), and a
  connection exists (`integration.connection.active`).
- Consultations run as transient generations on a dedicated, reusable
  `advisor` session pinned to the configured model (default
  `anthropic/claude-fable-5-1#max`) via `session.create` +
  `session.switchModel` once, then `session.generate` per call. Transient
  generations do not mutate session history, so the advisor session stays
  empty while its stats attribute advisor spend. Title discovery also
  accepts the pre-rename `ocAdvisor` session title.
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
  silent `completed` results. Fable skips still return the disabled notice.

## Metrics

Every invocation appends one JSON line to
`~/.local/share/opencode/ocAdvisor-metrics.jsonl` with timestamp, session,
caller model/agent, mode, trigger, outcome (`advisor_response`,
`skipped_fable`, `error`, `no_transcript`, `no_session`), error type
(`provider_unavailable`, `model_unavailable`, `auth`, …), latency,
transcript size, prior-consultation count, and transport (`via`).
Token usage is `null`: OpenCode generation returns text only.
Logging is best-effort and never breaks a call.

## Activation

The server loads plugin files once per process, so after installing or
updating the plugin restart the background service
(`opencode service restart`) or the old code keeps running. Location
eviction does not reload plugin files.

## Development

```sh
bun install           # install dependencies (frozen lockfile in CI)
bun test              # unit tests
bun run typecheck     # typecheck (tsc --noEmit)
bun run build         # compile dist/ (runs automatically on npm pack/publish)
bun run report        # advisor usage over the last 30 days
bun src/usageReport.ts --days 7
```

## Evaluation

The report combines the metrics log with the session database and shows
invocation counts by outcome/mode/trigger plus eligibility coverage
(sessions with ≥10 non-Fable tool calls vs. sessions that consulted).
Re-run it after a few weeks of the new checkpoints to judge coverage and
whether advice is changing outcomes. The usage report is a maintainer tool
run from a source checkout; it is not shipped in the npm package.

## Versioning

Releases use calendar versioning (`YY.M.patch`, e.g. `26.9.0`). The Git tag
(`v26.9.0`) must match `package.json` exactly; tag pushes publish to npm.

## Releasing (maintainers)

1. Bump `version` in `package.json` (CalVer `YY.M.patch`), commit, push to
   `master`, and wait for CI to pass.
2. Tag and push: `git tag -a vYY.M.patch -m "@pfoundation/ocadvisor vYY.M.patch" && git push origin vYY.M.patch`
3. The `publish` workflow validates the tag, re-runs every gate, and
   publishes via OIDC trusted publishing (no npm token). `v*` tag creation
   is restricted to maintainers by a ruleset.
4. Verify: `npm view @pfoundation/ocadvisor@YY.M.patch`.
