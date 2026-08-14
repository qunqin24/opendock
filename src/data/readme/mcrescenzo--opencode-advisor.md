# advisor

Coding agents are built to keep moving — even at the moments where the better
move is to stop and think: a broad or risky refactor, a test that keeps
failing for reasons that aren't obvious, a fork in the road between two
architectures, an unfamiliar dependency's API. Left alone, an executor agent
either guesses and presses on, or burns its own context exploring options it
will mostly discard. `advisor` gives that executor a second opinion on
demand: it asks a focused question and gets back a short, distilled,
actionable answer, without stalling the task or filling the executor's own
conversation with the exploratory research that produced it.

Under the hood, `advisor` is an opencode plugin that registers a single
**`mcrescenzo_opencode_advisor` tool**: a budgeted, read-only child-session
strategist. Its unconditional value is separation: an explicitly opted-in
executor gets a separate child session, a curated and redacted transcript, a
stricter read-only policy, and a non-refunding per-session budget. The model is
configurable with `OPENCODE_ADVISOR_MODEL`; the plugin does not claim that the
default model is more capable than the caller's model. Only the distilled
advice is exposed as model-visible tool output (alongside runtime diagnostic
metadata), so intermediate research does not fill the executor's context.

## Quick Start

1. **Register the plugin.** Add the package name to `opencode.json` under the
   singular `"plugin"` key — opencode installs it automatically before
   loading it:

   ```json
   {
     "plugin": [
       "@mcrescenzo/opencode-advisor"
     ]
   }
   ```

   opencode loads plugins once at startup, so restart opencode after adding
   or changing this entry.

2. **Opt in the agents that should have it.** Registering the plugin makes
   the `mcrescenzo_opencode_advisor` tool available. OpenCode's host baseline
   includes a broad `"*": "allow"`, so the plugin enforces the trust decision
   itself at execution time: only an agent with an exact per-agent allow may
   call it. Grant it to the agents that should be able to consult the advisor,
   for example:

   ```json
   {
     "agent": {
       "build": {
         "permission": {
           "mcrescenzo_opencode_advisor": "allow"
         }
       }
     }
   }
   ```

3. **That's it.** Any opted-in executor agent can now call the
   `mcrescenzo_opencode_advisor` tool mid-task with a `question` (required)
   and optional `context` — see the example below for what that looks like in
   practice.

## Example: a mid-refactor decision

Say an executor agent is partway through refactoring a payments module and
hits a genuine fork in the road. It calls `mcrescenzo_opencode_advisor`:

```json
{
  "question": "Should I extract billing into two services (invoicing, payment-processing) or keep it as one monolithic payments module?",
  "context": "Currently one `payments/` package handling invoice generation, charge processing, and webhook handling. Team is 3 engineers. No multi-region or independent-scaling requirement yet, but webhook volume is growing fast."
}
```

The plugin snapshots the recent transcript, runs the question past the
`mcrescenzo-opencode-advisor-strategist` child session, and returns the
distilled answer as the tool result — the executor's own context never sees
the advisor's intermediate file reads or research. A response follows a fixed shape
(recommendation, rationale, risks, next steps); abridged here for length:

```
1. Recommendation
Keep it one module for now; split invoicing out only once webhook volume
or team size forces it.

2. Rationale
A 3-engineer team gets more value from one deploy/test surface than from
service boundaries you don't have a scaling reason for yet. Webhook growth
is a signal to watch, not a reason to split today.

3. Risks / Watchpoints
Watch webhook handler latency and invoice-generation coupling — if either
starts blocking the other's deploys, that's the trigger to split.

4. Concrete Next Steps
- Add a latency/error-rate dashboard for the webhook handler specifically.
- Keep invoice generation and charge processing behind separate internal
  interfaces now, so a future extraction is a module move, not a rewrite.
```

Real advisor responses are not artificially compressed — the prompt asks for
whatever depth the question warrants, so expect fuller answers on harder
questions.

## Security guarantees

### Enforced by this plugin

- **Child-session context isolation.** Intermediate research stays in the
  child; only final advice text returns to the executor.
- **Curated, bounded, redacted evidence.** The transcript excludes prior
  Advisor output and ignored/display-only parts, deduplicates identical
  synthetic controls, keeps the recent tail, and applies best-effort secret
  redaction. Redaction remains a safety net, not a data-loss-prevention system.
- **Child-prompt edit and recursion pins.** The child prompt removes `task`, the
  canonical and historical Advisor tool IDs, and the edit family from the
  model's tool set. The agent permission map and prompt instruction add
  defense in depth.
- **Explicit caller opt-in.** An executor agent without an exact per-agent
  `mcrescenzo_opencode_advisor: "allow"` (or the equivalent `tools` boolean)
  receives actionable configuration guidance before budget or session work.
- **Bounded, non-evicting call budget.** Setup failures before prompt dispatch
  roll their reservation back; spent consultations are not refunded. Internal
  tracker capacity has a separate diagnostic rather than pretending a new
  session spent its budget.
- **Explicit-model identifier validation.** Combined `provider/model-id` syntax
  and the resolved provider/model catalog entry are checked before budget is
  consumed whenever Advisor selects a model explicitly; the session-default
  fallback remains the host's responsibility.

These package-enforced claims are covered by
`tests/advisor-plugin.test.mjs` and `tests/advisor-core.test.mjs`.

### Depends on your OpenCode version and configuration

- **Not local-only.** The question, optional context, bounded transcript, and
  child tool results can be sent to the configured model provider and retained
  in normal OpenCode child-session storage.
- **Credential-path mediation.** The plugin installs path denies for `read`,
  `glob`, and `grep` (plus a defensive `list` permission key; OpenCode 1.17.7
  and 1.18.x have no standalone `list` tool). Active Advisor children also get
  a pre-execution argument guard for credential-bearing `grep`/`read` paths.
  This relies on the host's permission and hook semantics.
- **Read-only bash policy.** A narrow inspection allowlist and hard-denied
  destructive, publication, credential-path, chaining, and redirection
  patterns rely on OpenCode's insertion-order, last-match permission evaluator.
- **Web and MCP tools.** `webfetch` is host-exposed unconditionally but denied
  by Advisor defaults; `websearch` is host-exposed only for the OpenCode
  provider or when its Exa feature flag is enabled, and is also denied by
  Advisor defaults. MCP tools depend on the runtime and operator configuration.
- **Known mediation limits.** `session.shell()` does not pass through
  `tool.execute.before` (Advisor does not use it). Hosted server-side search
  models with `tool_call: false` bypass tool hooks but also lose Advisor's local
  read/glob/grep/bash tools, degrading the feature visibly. A deliberate human
  "always allow" approval in the exact child session is appended after session
  rules and can outrank them.

The properties in this second list are not guarantees of this package alone.

Full detail — the exact denylist, redaction regexes, child-session abort
handling, and other edge cases — lives in
[`docs/security-model.md`](https://github.com/mcrescenzo/opencode-advisor/blob/main/docs/security-model.md).

## Migrating from 0.1.x

`0.2.0` replaced the old unqualified global IDs with
package-qualified canonical IDs:

| Surface | Old ID | Canonical ID |
| --- | --- | --- |
| Executor tool and permission key | `advisor` | `mcrescenzo_opencode_advisor` |
| Hidden agent customization | `advisor-strategist` | `mcrescenzo-opencode-advisor-strategist` |

There is no legacy alias or compatibility window. Update executor permissions
and any hidden-agent model/permission overlay, then restart opencode. A
same-ID foreign tool or agent now produces a fail-closed collision diagnostic
instead of silently winning by plugin load order. The complete decision and
collision contract is recorded in
[`docs/identity-contract.md`](https://github.com/mcrescenzo/opencode-advisor/blob/main/docs/identity-contract.md).

## Configuration

### Advisor model — `OPENCODE_ADVISOR_MODEL`

The model used by the `mcrescenzo-opencode-advisor-strategist` agent is
resolved from configuration rather than a hard-coded literal. Resolution
precedence (highest first):

1. The `OPENCODE_ADVISOR_MODEL` environment variable (a combined `provider/model-id` string, for example `openai/gpt-5.5`).
2. A `model` set on the `mcrescenzo-opencode-advisor-strategist` agent in `opencode.json`.
3. opencode's configured default `model`.

If none resolve, the advisor falls back to the agent's / session default model. To pin the advisor model, set the env var before launching opencode:

```sh
export OPENCODE_ADVISOR_MODEL="openai/gpt-5.5"
```

Model identifiers must use the combined `provider/model-id` form. A malformed
`OPENCODE_ADVISOR_MODEL` falls back to the next valid configured source and is
reported once in tool metadata. A resolved model that is absent from OpenCode's
provider catalog is refused before the call budget is touched.

OpenAI advisor calls set the provider-specific `reasoningEffort` option to
`high`. Non-OpenAI providers use their provider/runtime reasoning defaults; this
package does not claim a provider-portable high-reasoning knob.

Each consultation that returns advice persists `advisorModel`,
`advisorModelSource`, `advisorProviderID`, and `advisorReasoningApplied` in the
tool result metadata, and includes the resolved model (or `session default`) in
the metadata title. The same fields are reported as in-progress metadata after
child creation.

The canonical strategist's supported operator overlay keys are exactly
`description`, `model`, and `permission`. Unsupported keys such as
`temperature`, `steps`, or `maxSteps` fail closed with a diagnostic naming the
offending and supported keys; Advisor does not silently discard those values.

### Call budget — `MAX_CALLS_PER_SESSION`

Each consultation runs a separate model request over up to ~90 KB of transcript
and is the most expensive thing this plugin does, so consultations are capped
per executor session by the `MAX_CALLS_PER_SESSION` constant (default `10`).
Once the budget is spent, the tool returns a polite "continue without additional
advisor consultation" notice instead of running.

This budget is a source-code constant, not an environment variable. To change it, edit `MAX_CALLS_PER_SESSION` in `advisor-core.js`; `advisor.js` imports the same helper and message formatting so the runtime and tests stay in sync.

## For AI agents

If you are an executor agent deciding whether to call
`mcrescenzo_opencode_advisor`: it costs one unit of a small per-session
budget, runs read-only, and returns only distilled text — no research
artifacts leak into your context. Use it for non-obvious design decisions,
repeated failures, or before a broad/risky edit, not for routine steps. The
plugin's internal hook wiring is documented in
[`docs/internals.md`](https://github.com/mcrescenzo/opencode-advisor/blob/main/docs/internals.md) if you need it.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for
the full license text.

## Compatibility and contributing

This package targets the public `@opencode-ai/plugin@1.17.7` host contract and
Node.js 20.11.0+; its only runtime dependency is pinned `zod@4.1.8`, and Bun is the
contributor package manager. See [`CONTRIBUTING.md`](CONTRIBUTING.md)
for the full toolchain, test commands, and dependency-license audit process,
and [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## Support and reporting issues

File bugs and feature requests in the [GitHub issue tracker](https://github.com/mcrescenzo/opencode-advisor/issues). The package metadata (`bugs`, `homepage`, `repository`) points here as well, so the reporting surface is discoverable from npm. For private vulnerability reports, use the process in [`SECURITY.md`](SECURITY.md).

When reporting an advisor issue, please include:

- The `@mcrescenzo/opencode-advisor` version and your opencode version.
- The Advisor tool metadata fields `advisorModel`, `advisorModelSource`,
  `advisorProviderID`, and `advisorReasoningApplied` (plus any model warning).
- Which surface is affected — the `mcrescenzo_opencode_advisor` tool itself (for example the per-session budget notice, tool registration, or permission behavior) versus the quality/content of the advice returned.
- The advisor tool result text, with any secrets, credentials, or private paths redacted.
- If the problem is permission-related, the advisor command or pattern you expected to be allowed/denied and what actually happened.

The child prompt disables file-editing tools, and the default Advisor permission
policy denies destructive shell commands. If those package-controlled
boundaries are bypassed without a deliberate higher-precedence human approval,
that is a security-relevant report; please report it privately through
[`SECURITY.md`](SECURITY.md).
