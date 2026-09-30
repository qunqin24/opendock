<div align="center">

<img src="./assets/logo.svg" width="128" alt="agent-router logo" />

# agent-router

**Switch the models assigned to your opencode agents.**
Named stacks applied to agent frontmatter · one command, one restart, new model crew.

[![npm version](https://img.shields.io/npm/v/@dylanrussell/agent-router.svg?color=06b6d4&label=npm&logo=npm&logoColor=white&style=flat-square)](https://www.npmjs.com/package/@dylanrussell/agent-router)
[![npm downloads](https://img.shields.io/npm/dm/@dylanrussell/agent-router.svg?color=06b6d4&label=downloads&style=flat-square)](https://www.npmjs.com/package/@dylanrussell/agent-router)
[![license](https://img.shields.io/npm/l/@dylanrussell/agent-router.svg?color=06b6d4&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@dylanrussell/agent-router.svg?color=06b6d4&logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/dylanrussellmd/agent-router/ci.yml?branch=main&label=CI&logo=github&logoColor=white&style=flat-square)](https://github.com/dylanrussellmd/agent-router/actions/workflows/ci.yml)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![tested with vitest](https://img.shields.io/badge/tested%20with-vitest-FCC72B.svg?logo=vitest&logoColor=black&style=flat-square)](https://vitest.dev)

[Install](#install) · [Quickstart](#quickstart) · [Stacks](#stacks) · [In the TUI](#in-the-tui) · [FAQ](#faq) · [Issues](https://github.com/dylanrussellmd/agent-router/issues)

</div>

---

## What it does

opencode agents are markdown files (`~/.config/opencode/agents/*.md`) whose YAML frontmatter carries a `model:` line:

```markdown
---
description: High-reasoning review, debugging, and architecture counsel
mode: subagent
model: anthropic/claude-opus-4-8        # ← agent-router rewrites this
reasoningEffort: high                   # ← and any option keys a stack names
temperature: 0.1
tools: { write: false, edit: false }
---
<prompt body — owned by you, never touched by agent-router>
```

`agent-router` keeps named **stacks** — JSON files mapping agent names to models (and optionally to provider options) — and applies them to those frontmatter lines on demand. Premium models for the workday, cheap ones for bulk chores, one command to swap the whole crew:

```json
{
  "agents": {
    "Omni":      { "model": "anthropic/claude-fable-5" },
    "oracle":    { "model": "openai/gpt-5.5", "reasoningEffort": "high" },
    "explorer":  { "model": "openai/gpt-5.4-mini" },
    "librarian": { "model": "openai/gpt-5.4-mini" },
    "fixer":     { "model": "openai/gpt-5.5", "thinking": { "effort": "low" } }
  }
}
```

The prompt body and opencode framework keys (`description`, `mode`, `permission`, `tools`, …) are yours; agent-router rewrites only the `model:` line and the option keys a stack entry names, atomically, through symlinks (dotfile-manager setups survive intact).

```
~/.config/opencode/
├── agents/                     ← your agent .md files (the live target)
└── agent-router/
    ├── state.json              ← {active, previousActive, …}   (machine state)
    ├── stacks/
    │   ├── premium.json        ← named stacks                   (your config)
    │   └── cheap.json
    └── history/                ← rolling 20 most-recent switches
```

Stacks are config, history is state — point `stacksDir` somewhere dotfile-managed if you version your setup (see [Configuration](#configuration)).

## Install

Version 2 targets **OpenCode 2.x**, with **2.0.8** as its minimum supported host. Compatibility is exercised on native 2.0.8, 2.0.14, and 2.0.15 hosts; CI also tracks the newest 2.x release. Version 1 remains the legacy OpenCode release. See [release notes and operational limits](./CHANGELOG.md).

```bash
npx -y @dylanrussell/agent-router init
```

`init` will:

1. Capture your agents' current models into a first stack (`default`) and mark it active.
2. Add `@dylanrussell/agent-router@latest` to the `plugins` array in `opencode.json` (backing it up first).
3. Add the same entry to `cli.json` — this loads the sidebar + `/agent-*` commands.
4. Remove the legacy `@dylanrussell/omo-router` plugin entry if present.

Then **restart opencode** so it picks up the plugin.

The API peer accepts `@opencode/plugin@^2.0.8` (all 2.x releases from 2.0.8, excluding 3.x). The local development SDK is pinned to 2.0.14; CI typechecks against the matching SDK for its minimum, known, and latest-2.x host jobs. OpenCode provides the terminal renderer at runtime. Both package entrypoints default-export V2 plugin definitions.

## Quickstart

```bash
agent-router capture my-mix           # snapshot current frontmatter models as a stack
agent-router list                     # show stacks; * marks active
agent-router use cheap                # apply a stack (validates first)
agent-router back                     # undo the most recent switch
agent-router current                  # print the agent → model mapping in frontmatter
agent-router status                   # print active stack name
agent-router show cheap               # print a stack's JSON
agent-router edit cheap               # open a stack in $EDITOR
agent-router validate --all           # check model IDs and variants against the V2 catalog
agent-router history                  # list recent switches
agent-router import my-mix <file>     # import a stack from a file
agent-router export my-mix <file>     # export a stack to a file
agent-router rm my-mix                # remove a stack
agent-router path                     # print all paths used (debugging)
agent-router completion               # install shell autocompletion
```

The everyday loop: tune your agents until you like them → `capture <name>` → repeat with other models → `use <name>` to swap between the results.

## Stacks

A stack file needs one thing: an `agents` record whose entries carry a `model` string. Agent names are the `.md` basenames in your agents dir (`Omni` ↔ `Omni.md`). Except for router-owned `fallbacks`, other keys on an entry are provider pass-through options (`reasoningEffort`, `thinking`, `temperature`, `topP`, `maxOutputTokens`, …) that opencode forwards to the model — agent-router transcribes these to the agent's frontmatter alongside `model:` and captures them back. Unknown keys are preserved round-trip.

```json
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.5",
      "reasoningEffort": "high",
      "thinking": { "effort": "low" }
    }
  }
}
```

- **Apply** writes/updates only the option keys a stack entry names; options the stack omits are left in place. To **clear** an option, set it to `null` in the stack entry.
- Reserved opencode framework keys (`description`, `mode`, `permission`, `tools`, `prompt`, `steps`, `color`, `name`) are never transcribed — a stack entry can't clobber them.
- Option values serialize to a single frontmatter line: scalars bare (quoted only when needed), objects/arrays as JSON flow. Block-style values an apply replaces are collapsed to flow; `capture` parses them back into typed JSON.

`use` is strict by design: if a stack references an agent file that doesn't exist, or one without a `model:` line, the switch fails **before anything is written**. It validates model IDs and variants against the V2 catalog first (skip with `--no-validate`, override with `--force-invalid`).

`capture` is the inverse: it reads the current `model:` line and option keys of every agent file (files without a `model:` line are skipped) and writes a stack. There are no bundled seed stacks — your real setup is the seed.

## Ordered Fallbacks

Optional per-agent fallback chains select a model for the **next explicitly submitted user turn**, not an automatic retry of the failed turn. Enable by adding `fallbacks` to a stack, applying that stack, and restarting opencode with the server plugin loaded:

```json
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.5",
      "variant": "high",
      "fallbacks": [
        { "model": "anthropic/claude-sonnet-4-6", "variant": "low" },
        { "model": "openai/gpt-5.4-mini" }
      ]
    }
  }
}
```

Model IDs and variants above are illustrative; use models and variants supported by your providers.

- `model` remains the primary. Primary `variant` is an optional nonempty string; `null` clears it on apply.
- `fallbacks` is optional, or an array of 0 to 8 objects. Each object contains only `model` (non-whitespace `provider/model`) and optional `variant` (nonempty string). `null`, bare strings, unknown candidate fields, and longer chains are rejected.
- Candidate order is preserved. Exact `(model, variant)` duplicates, including the primary, are skipped at runtime. An omitted fallback variant clears the previous candidate's variant.
- Only model and variant change at runtime. Agent prompts, permissions, tools, and other provider options remain unchanged; ensure those options are compatible with every candidate.
- Validation checks every primary and fallback ID and variant, reporting paths such as `agents.oracle.fallbacks.0.variant`. Server tools use the connected host catalog; the standalone CLI uses `opencode api model.list`. Catalog membership does not prove live provider health or quota. `validate --active` includes applied fallback metadata when its primary still matches frontmatter.
- Failover does not rewrite frontmatter, stacks, history, or router state. `use` stores the applied chains in optional `state.json.fallbackAgents`. Old state files without that field remain valid and have no enabled chains until the stack is reapplied.
- `capture` and displaced-history snapshots merge those applied chains with live frontmatter only when primary model and variant still match. Editing a stack alone does not alter applied metadata. Applying a stack without chains clears the applied chains, including agents omitted from that stack.
- `back` retains its existing semantics: reapply a previous **named stack as it exists now**, not restore historical snapshot bytes. Runtime failover never adds a history entry.

### Runtime Behavior And Limits

The V2 plugin watches `retry` hooks correlated with the admitted user turn, agent and selected model. A retryable HTTP **429, 500, 502, 503, or 504** stages the next candidate and vetoes the same-turn retry. Only primary model requests participate.

Authentication/permission errors, context overflow, content filtering, output-length errors, unknown errors, transport errors without an HTTP status, and ambiguous `session.error` notifications do not advance the chain. Router never classifies errors by substring matching.

After a qualifying failure a server log names the next model and asks for an explicit retry/continue instruction. **Review partial output and completed tools before continuing.** The next `prompt` admission hook calls `session.switchModel`; it never submits a prompt. Chains advance monotonically, never wrap, and never replay prompts or tools.

Observed interruption, explicit model/agent selection events, and an unexpected incoming model disable routing for that session. Router state changes disable startup routing at the next prompt admission. Restart to activate a newly applied stack.

Duplicate failures advance only once per admitted user turn. Routing budgets are isolated by session and agent and bounded to 1,024 sessions. Subagents without user prompt admission are left alone.

**Verified boundary:** the compatibility workflow compiles against each matrix SDK and runs the suite on native OpenCode **2.0.8, 2.0.14, and 2.0.15** hosts, plus the latest 2.x release. Deterministic adapter tests cover next-turn selection, retry veto, auxiliary-request exclusion, variants, and no replay or persistent agent writes. These are not real-provider end-to-end tests. An LLM may choose to repeat a tool when explicitly asked to continue.

The tested OpenCode 2.0.8, 2.0.14, and 2.0.15 hosts expose no atomic compare-and-switch in the prompt hook and no request kind in the retry hook. Concurrent manual selections/admissions or auxiliary requests remain host API limitations. The sidebar displays configured routing and highlights the current session selection, not pending fallback state. Terminal stack operations require local filesystem access; remote server filesystem management is not supported.

### Opt-in quota preflight (phase 1)

The server plugin can consult the usage-tracker server's `direct-api-usage.query`
RPC before each new explicit main-session prompt and each new native `subagent`
start. Configure the server plugin using the object form:

```jsonc
{
  "plugins": [
    {
      "package": "@dylanrussell/agent-router",
      "options": {
        "quotaPreflight": {
          "enabled": true,
          "allowPaidFallbacks": false
        }
      }
    }
  ]
}
```

Both options default to `false`. Existing applied fallback chains supply candidate
order; preflight never writes agent frontmatter, router state, or stacks. A staged
reactive fallback has precedence on the next eligible admission, even when the
primary has available or unknown quota. Preflight checks that backup and later
candidates for known exhaustion. Otherwise, each eligible admission reconsiders
the configured primary. Retry hooks and same-turn retry behavior are unchanged.

- Only fresh, account-and-scope-matched `exhausted` evidence skips a candidate.
  An available or unknown primary remains the primary. Expired observations,
  reached resets, unavailable methods, malformed replies, and timeouts are unknown.
- After earlier candidates are exhausted, an unknown backup with a service-proven
  subscription binding may be tried. Without that binding, selecting a backup
  requires explicit `allowPaidFallbacks: true`, which permits potentially paid
  configured backups. If no eligible candidate remains, selection is unchanged.
- The usage service owns shared caching, bounded stale refreshes, credential
  resolution, explicit Headroom/Go account bindings, and model-specific OpenAI
  scope matching. Router receives opaque references and quota decisions only;
  it neither polls providers nor infers account equivalence from provider names.
- Quota queries have a 3-second caller deadline and at most 16 outstanding calls,
  including timed-out calls that ignore cancellation. Excess admissions use
  unknown evidence rather than joining a queue. Admission ownership is bounded
  to 1,024 sessions and concurrent main admission checks to 64.
- Explicit initial model selections and observable manual selections take priority,
  including selections equal to the configured primary. Native child overrides
  are checked before model resolution in `tool.execute.before`; resumed children
  are excluded. Main sessions whose agent is unresolved are left native.
- Automatic selection ownership is in memory. After plugin restart, a stored
  model is conservatively treated as pinned; explicit pins also persist in
  plugin-scoped server storage. A second session read and observed
  selection events guard asynchronous admission, but the host offers no atomic
  compare-and-switch.

**Explicit session controls:** with preflight or quota fallback enabled, the server exposes three
additional tools. Pin/auto tools are for explicit user requests, under the host's
normal tool-permission policy. They take no model or session arguments; their
scope is the calling session.

- `router_pin` freezes the current selection, resolving the native agent/default
  model when no selection is stored. It disables quota preflight and same-turn quota fallback, and clears staged
  reactive fallback for this session. The pin persists in server plugin storage.
  Pins share one durable value capped at 1,024 sessions across restarts. Serialized
  writes prevent lost updates; session deletion removes its durable pin, including
  when deletion races a pin write. Plugin cleanup drains dispatched pin writes.
- `router_auto` clears the explicit pin and authorizes automatic routing on the
  **next explicit user turn**. It neither switches the model nor sends a prompt.
  Automatic ownership is not restored across plugin restarts: use this control
  again to opt an existing selected session back in.
- `router_routing_status` reports `automatic`/`pinned`, the current model, and a
  concise reason. Admissions and controls also write concise server-log notices
  such as `primary_unknown`, `known_exhaustion_fallback`, and
  `staged_reactive_fallback`.

**Picker boundary:** The tested OpenCode 2.0.8, 2.0.14, and 2.0.15 hosts treat selecting the already-active model as a
no-op and emits no selection event. Selecting an automatic fallback again in the
standard picker does **not** pin it. Explicitly request `router_pin` to freeze it;
request `router_auto` when ready to resume automatic routing. Different-model
picker selections remain observable and take priority.

`npm run bundle && npm run test:quota` exercises the production router and a fake
quota RPC on a private native OpenCode 2.x host, including true native child starts,
fresh/exhausted/unknown/reset evidence, explicit pin/auto controls, staged 429/503
precedence, timeout, recovery, and tool continuation without midtask switching.
It explicitly reports the native same-model picker boundary.
`scripts/probe-admission-v2.mjs` independently records
native admission/provenance behavior. Neither script contacts real quota APIs.
Set `USAGE_TRACKER_SOURCE` to the usage-tracker source directory to run the same
native main/child checks with its actual RPC definition and quota implementation,
using synthetic credentials and direct-provider response fixtures. Service-side
account approvals belong in usage-tracker's `options.quotaBindings`, whose records
use `{ providerID, source, models, connection: { type, id }, approval }` for saved
credentials (`{ type: "env", name }` for environment connections). Router options
do not contain credentials or binding attestations.

### Opt-in same-turn quota fallback (phase 2, native OpenCode 2.x)

Configure this separately from `quotaPreflight` in the server plugin's `options`:

```json
{
  "quotaFallback": {
    "enabled": true,
    "allowPaidFallbacks": true,
    "maxSwitches": 8
  }
}
```

Both booleans default to **false**. Phase 2 requires explicit paid-fallback approval
before switching, including when quota-service bindings exist. `maxSwitches` is an
integer from 1 to 8 (default 8); only later entries in the configured chain are
eligible. Each explicit main-session admission and each newly admitted automatic
child gets its own budget, shared by all tool continuations in that turn. There is
no wraparound. Confirmed, fresh, account-scoped exhausted backups are skipped;
unknown or unavailable quota-service evidence does not block an approved backup.

The router requests a **native same-session retry** only for a structured
`provider.quota` failure with matching HTTP 402/429 rejection evidence. It never
submits another prompt, starts a replacement child, or retries a partial stream.
Authentication, timeouts, generic rate limits, 5xx, WebSockets, auxiliary requests,
and unsupported endpoints are ineligible. Existing reactive next-turn handling
continues to apply to its qualifying non-quota errors. Disabling phase 2 preserves
the previous retry policy.

Correlation is deliberately conservative: exact original request-object identity,
agent/model/variant and admission generation, configured base URL plus a recognized
`/chat/completions`, `/responses`, or `/messages` operation, no URL credentials or
query, single-use evidence, and a five-second monotonic expiry. Observations are
bounded to 1,024 sessions and periodically pruned; no response bodies are read.
Overlapping primary requests poison the admission. Auxiliary requests (including
title generation) are isolated when their agent or model differs from the primary;
they cannot overwrite its rejection evidence or consume it through an unrelated
retry. Auxiliary traffic with the same agent **and** model still poisons the
admission, including an HTTP 200 that may still be streaming. These auxiliary
identities are retained until the admission ends. Capacity exhaustion fails closed.
Expiry removes retry permission but retains an unresolved/ambiguous-request
tombstone until the admission ends or a new admission replaces it. Quota RPC
candidates contain only provider/model IDs; configured variants remain attached
to the eventual model selection.

`router_quota_diagnostics` includes the main admission outcome and reason, whether
the current selection was router-owned, the most recent Automatic/Pinned control
and any later ownership-invalidating event. HTTP observations carry local numeric
IDs; if one is cleared before its response or retry, the trace records the clear
reason and the response's last-cleared observation. The trace is bounded to four
attempts and 64 events per attempt and records no prompts, request/response bodies,
headers, or credentials. These diagnostic callbacks do not change routing.

#### Transport-rewrite cooperation

A trusted in-process transport plugin that replaces a native HTTP `Request` must
preserve its provenance for fallback correlation. Attach the original request to
the replacement as an immutable, non-enumerable own data property:

```js
Object.defineProperty(replacement, Symbol.for("@dylanrussell/agent-router.original-request"), {
  value: original,
});
event.request = replacement;
```

This works whether the transport hook runs before or after agent-router. The router
validates the **original** endpoint and correlates responses using that exact
original object, not URL equality. Untagged clones, malformed/cyclic provenance,
and unrelated original requests remain ineligible. Chains are bounded to eight
rewrites. The property is local metadata, never an HTTP header; network responses
cannot assert it. Setting it is a trust assertion by the transport plugin that the
replacement carries the same logical request and preserves upstream rejection
semantics. Only use it for trusted, transparent transports—not synthesized quota
responses. Request bodies and authentication headers are not read by the router.

Explicit main model selections, original child model overrides, and resumed child
tasks are not claimed merely because their models match a chain. Automatic child
ownership requires a fresh admission ticket, a unique running parent tool call,
matching parent/agent/model, and a matching digest of the native child's initial
user message. Parent tool metadata is checked when available. Tickets expire after
five seconds; ambiguous concurrent child admissions are skipped. Neither prompt
text nor response bodies are retained in this correlation state.
Native metadata binding the child to a different parent call vetoes fingerprint
matching. Ticket overflow disables new automatic child claims until plugin reload,
including claims already awaiting host reads; dropping negative evidence cannot
make a child eligible.

**Accepted host limits:** the tested native 2.0.8, 2.0.14, and 2.0.15 retry hooks lack request ID, request kind,
output-started, cancellation, and atomic switch-and-retry fields. Correlation and
observable manual/cancel guards are therefore best effort, not transactional
guarantees. Same-model picker no-ops remain unobservable; use `router_pin`.
A later retry-hook veto can leave the backup selected without dispatching it.
The router does not roll back that selection, which could overwrite a newer user
choice. Status/log reasons distinguish
`quota_fallback_selected_retry_requested_not_confirmed` from
`quota_fallback_attempt_dispatched`; the latter observes the HTTP request hook,
not provider acceptance or successful completion.

After building, `npm run test:quota-fallback` runs the production router in a
disposable native OpenCode 2.x host with synthetic local providers. Set
`ROUTER_PREFLIGHT=1` to exercise both opt-ins together. The fixture verifies first
quota rejection, main/child post-tool continuation with a durable counter of one,
chain exhaustion, partial stream, explicit selections, manual/cancel/pin gates,
compaction, attribution, and the accepted later-veto residual selection. Its
timeout control vetoes native timeout retries only after recording router policy.
No real inference or credentials are used. `npm run test:compat` runs the build,
unit suite, and all native integration suites against the installed host (or the
binary selected by `OPENCODE_TEST_BINARY`); use it when upgrading to another 2.x
release. It rejects versions below 2.0.8 and major-version changes so compatibility
drift is caught instead of silently claimed.

### Install This Checkout

To test a local V2 checkout, run `npm run typecheck`, `npm test`, and `npm run bundle` (a fresh checkout uses `pnpm install --frozen-lockfile`). Replace the registry entry in the server `opencode.json` **plugins** array with the package directory:

```json
"file:///absolute/path/to/agent-router"
```

Use the same package directory in `cli.json` **plugins** when explicitly registering the terminal half. Do not load both registry and local copies. The local CLI is `node /absolute/path/to/agent-router/dist/cli.js`. Applying a stack still requires restarting OpenCode; inspect server logs for next-turn fallback notices.

Supported OpenCode 2.x hosts resolve local directories through the literal root
`index.ts` and `tui.ts` wrappers; published packages use their exports. Run
`npm run bundle` before using the source directory.

The GitHub plugin entry uses the committed `dist/` bundles so OpenCode can
install the Git dependency without a nested preparation install. After changing
runtime source, run `npm run bundle` and include updated `dist/` files in the
same commit.

`npm run test:integration` starts an isolated supported OpenCode 2.x server,
initializes its location, verifies router activation and terminal discovery, and
exercises a disposable RPC probe with absent, null, and invalid input. It uses
temporary HOME/XDG/router directories and never modifies live configuration. Set
`OPENCODE_TEST_BINARY` to test another installed 2.x binary, and set
`AGENT_ROUTER_TEST_PACKAGE` to an unpacked tarball directory to test release
contents. Stack management remains tool/local-filesystem based; the first-party
TUI uses a narrow, location-scoped RPC for per-session routing status and controls.

## Inside opencode

The plugin exposes six tools the agent (or you, by asking it) can call:

| tool | what it does |
|---|---|
| `router_status` | active stack + current frontmatter mapping + available stacks |
| `router_list` | stack list with `isActive` flags |
| `router_use({name, validate?})` | apply a stack; pops a TUI toast |
| `router_capture({name, force?})` | snapshot current models into a stack |
| `router_back({n?})` | undo last N switches |
| `router_validate({name?, active?})` | check model IDs against current opencode auth |

> *"Switch to cheap"* — your agent calls `router_use`, the toast pops up, you restart opencode.

## In the TUI

The V2 terminal half loads from the package's `./tui` export (`cli.json`, wired up by `init`):

- **Sidebar panel** — lists available stacks with the active one checked. Under **Current Stack**, each agent has one indented model per line, in precedence order, without Primary/Fallback labels. Explicit variants appear in brackets; full model IDs wrap rather than truncate. A `⟳ restart required` badge appears when the active stack differs from the one at TUI startup. File changes update live (≤1.5s).
- **Current selection** — every agent's selected model is highlighted in the warning/orange color at normal font weight with `●`. Headings show only the agent name. Selection prefers the viewed session, then running direct children at the same location, then the native agent default, then the stack default; conflicting active children retain multiple distinct selections. Out-of-chain selections are shown separately. Configured chains still come from the active stack file, not the applied `state.json.fallbackAgents` snapshot. Editing a stack changes the preview but does not apply it: use the stack and restart opencode to activate changes. Default highlights do not imply a running session or predict quota preflight.
- **Routing visibility and control** — the native CLI polls the location-scoped `agent-router.status` RPC for the visible session's Automatic/Pinned mode and reason. `/agent-routing` opens a native TUI selector that reads status and calls the matching session-control RPC directly; it does not send a prompt to the LLM. The RPC and `router_routing_status` share the same reader. Session directory, workspace, and project must match the serving plugin's location; unavailable or foreign sessions return `null`.
- **Quota observation** — “Last quota” is the service's actual `checkedAt`/`validUntil` observation used by routing, never the sidebar poll time. “Unexpired” describes that historical observation, not a fresh account check; expired observations say “stale”. Missing/unbound evidence says freshness unknown. Diagnostics are bounded, memory-only, cleared on session deletion/disposal, and freshness is cleared on observed integration/connection events. A reload loses observations. Status polling never fetches quota, generates text, changes routing ownership, or switches models.
- **Fallback diagnostics** — “Fallback selected; retry requested” does not claim a request was sent: a later host hook can veto the retry. “Fallback attempt dispatched” requires the matching native primary HTTP request hook; it does not claim completion. Explicitly known paid-policy, switch-limit, and exhausted-chain skips are reported. Other unproven causes remain unknown.
- **Polling lifecycle** — only the mounted, visible session is polled, with a three-second deadline and three-second interval after settlement. Navigation, location/client changes, unmount, and disposal abort and invalidate old requests. One physical request is allowed at a time, including transports that ignore cancellation; late results cannot replace the current session's status.
- **Commands** — type `/` or open the command palette:

| command | what it does |
|---|---|
| `/agent-switch` (alias `/ar`) | pick a stack, validate, apply |
| `/agent-view` | browse a stack's agent → model assignments |
| `/agent-edit` | reassign a model, picking from your reachable model catalog |
| `/agent-back` | confirm + revert to the previous stack |
| `/agent-validate` | check a stack's model IDs against current auth |
| `/agent-status` | toast the active stack + list |
| `/agent-routing` | view or switch this session between Automatic and Pinned |

Everything degrades gracefully: on older opencode versions (or if the TUI API changes) the sidebar and commands simply don't appear — the CLI and agent tools keep working.

Debugging the TUI half: `AGENT_ROUTER_TUI_DEBUG=/tmp/agent-router-tui.log opencode` writes a trace of the plugin's init steps.

## Configuration

Paths resolve in this order: explicit option → `config.json` → env var → default.

`~/.config/opencode/agent-router/config.json` (read identically by the CLI and the plugin — the recommended place):

```json
{
  "agentsDir": "~/.agents/agents",
  "stacksDir": "~/.agents/agent-router/stacks"
}
```

| setting | env var | default |
|---|---|---|
| agents dir | `AGENT_ROUTER_AGENTS_DIR` | `~/.config/opencode/agents` |
| stacks dir | `AGENT_ROUTER_STACKS_DIR` | `${routerHome}/stacks` |
| state home | `AGENT_ROUTER_HOME` (legacy `OMO_ROUTER_HOME`) | `~/.config/opencode/agent-router` |

## ⚠ Things to know

- **Restart required.** opencode reads agent files once at startup. After every `agent-router use`, restart opencode for the new models to take effect. The CLI reminds you.
- **Hand-edits to frontmatter are not auto-saved into stacks.** If you hand-tune a model or option and want to keep it, `capture` it (or `capture <active> --force`). The next `use` that touches that agent overwrites the hand-edit for keys the stack names; keys the stack omits are preserved (set an option to `null` in a stack entry to clear it).
- **Validation is catalog-dependent.** `agent-router validate` uses the active V2 model catalog, including variants. Catalog membership does not guarantee provider health, valid credentials, or available quota.

## FAQ

**Why no variants/fallback models?** Native agent frontmatter has a single `model:` line. If you want a fallback, make it a stack (`cheap`, `free`) and switch to it. For per-stack *behavior* variants (reasoning effort, thinking budget, temperature, …), add the option as a sibling key on the stack entry — it transcribes to frontmatter on `use`.

**Can I have per-project stacks?** Point `AGENT_ROUTER_STACKS_DIR` at a project-local directory in that project's shell env.

## Architecture in 60 seconds

```
┌──────────────────────────────────────────────┐
│ opencode (Bun)                               │
│  └─ agents loaded from agents/*.md ──────────┼── reads at startup ─┐
│  └─ plugin: agent-router (this package) ─────┼─ tools, toast       │
└──────────────────────────────────────────────┘                     ▼
~/.config/opencode/agents/*.md             ◄── `model:` lines rewritten on `use`
~/.config/opencode/agent-router/
  stacks/<name>.json                       ◄── source of truth for each stack
  state.json                               ◄── pointer to active stack
  history/<ts>__<from>-to-<to>.json        ◄── displaced mappings, rolling 20
```

## Contributing

Issues and PRs welcome. Run locally:

```bash
git clone https://github.com/dylanrussellmd/agent-router.git
cd agent-router
pnpm install
pnpm test
pnpm bundle
```

## License

MIT — see [LICENSE](./LICENSE).
