# opencode-guardian 🛡️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenCode: V1 tested, V2 adapter](https://img.shields.io/badge/OpenCode-V1%20live%20%7C%20V2%20mock--tested-blue.svg)](https://github.com/huseyincig/opencode-guardian)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/huseyincig/opencode-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/huseyincig/opencode-guardian/actions/workflows/ci.yml)

A TypeScript quality and safety plugin for **OpenCode** AI agents. See [CHANGELOG.md](CHANGELOG.md) for version history.

Designed to detect common AI agent failure modes using request-time guidance and post-turn inspection: unsupported claims, responsibility evasion, silent failure masking, test weakening, unsafe destructive operations, hardcoded secrets, undeclared dependencies, incomplete implementations, and repetitive error loops.

Uses OpenCode's supported plugin hooks — **no manual markdown rules or system prompt files required**. Actual hook delivery depends on the host version and capabilities.

---

## Features

**OpenCode Guardian** runs in-process with prebuilt TypeScript and provides:
- **Task fidelity:** Captures explicit user requirements before model execution (V1 `chat.message`/system transform; V2 `prompt`/`context` hooks) and checks completion on `session.idle`. Historical deferrals do not override a new explicit instruction.
- **Prebuilt server:** Compiled JavaScript with no added server runtime dependencies; the optional V2 TUI uses the host’s UI runtime. See [V1 performance measurements](https://github.com/huseyincig/opencode-guardian/blob/main/docs/performance-benchmark.md) for isolated guard timings and end-to-end measurements.
- **V1/V2 adapters:** V1 was tested with OpenCode 1.18.34 on an earlier revision. V2 is typechecked and mock-host tested; live V2 validation remains outstanding. See [verification](#testing-and-verification).
- **Pre-Built Distribution:** Pre-compiled `dist/` is included in the package and git repository — no build toolchain (`tsc`) required on target systems.
- **Evidence-Aware Inspection:** Correlates tool commands, exit codes, test/build/audit results, file mutations, git state, baseline checks, and normalized error fingerprints before deciding.
- **False-Positive Defenses:** Explicit uncertainty is allowed, stale verification after a later edit is not treated as proof, and Python local/stdlib modules are distinguished from third-party dependencies.
- **Bounded continuation:** Explicit repeated-review tasks use a separate `iterationBudget` (default 3, maximum 5) and require observable progress. Ordinary remediation remains capped at one prompt per human turn.

---

## Installation

### Method 1: npm package

**OpenCode v1:**

```json
{
  "plugin": [
    "opencode-guardian@latest"
  ]
}
```

**OpenCode v2 (real-host integration not yet verified):**

```json
{
  "plugins": [
    "opencode-guardian@latest"
  ]
}
```

Before enabling strict preflight on V2, validate the target OpenCode build and its tool hook in an isolated environment.

### Method 2: Local Directory / Development

If developing or testing locally:

```bash
git clone https://github.com/huseyincig/opencode-guardian.git ~/.config/opencode/vendor/opencode-guardian
```

Use the absolute `file:///` path in the matching host configuration.

**OpenCode v1:**

```json
{
  "plugin": [
    "file:///home/me/.config/opencode/vendor/opencode-guardian"
  ]
}
```

**OpenCode v2:**

```json
{
  "plugins": [
    "file:///home/me/.config/opencode/vendor/opencode-guardian"
  ]
}
```

The package name is `opencode-guardian`. The `OpencodeGuard` JavaScript export is retained for compatibility.

---

## The 14 rules

| Rule | Default | What it checks |
| :--- | :---: | :--- |
| **`discipline/no-evasion`** | error | Unsupported dismissal such as pre-existing/unrelated/out-of-scope claims. A successful baseline/main check allows factual pre-existing or unrelated claims. |
| **`discipline/no-apology`** | error | Sycophantic, defensive, or excessive apology language across multiple languages. |
| **`quality/no-shortcuts`** | error | Concrete deferred-work language and `TODO`/`FIXME`/`HACK` comments block; ambiguous descriptive words such as “temporary” and “workaround” are advisory. |
| **`integrity/no-stubs`** | error | `NotImplementedError`, empty stubs, Rust `todo!/unimplemented!`, and explicit placeholder constant returns. |
| **`integrity/no-unverified-claims`** | error* | Correlates claims such as “tests pass”, “build succeeded”, “audit clean”, “pushed”, “working tree clean”, and “bug fixed” with tool evidence. Direct contradictions block; missing evidence is advisory by default. |
| **`integrity/no-silent-failure`** | error* | Blocks test/build/lint/typecheck/audit commands whose failure is masked with `|| true`, `exit 0`, etc. Empty catch/`except: pass` handlers are advisory by default. |
| **`safety/no-truncation`** | error | Lazy file-edit placeholders that can delete real code. |
| **`safety/destructive-operations`** | **warn** | Hard reset, force push, recursive force removal, plain `rm` with target-specific consent, database drop, Terraform destroy, registry unpublish, and similar operations. Questions and explanations do not grant removal permission. |
| **`testing/no-cheat`** | error | Targeted skip/focus/todo edits block. Existing skips in whole-file writes, assertion weakening, test deletion, coverage reduction, CI test-step removal, and snapshot regeneration are advisory by default unless strict settings or failed-test evidence require blocking. |
| **`security/no-secrets`** | error | OpenAI/GitHub/AWS/Slack/npm/GitLab/Google/Stripe credentials, JWTs, private keys, registry auth, bearer tokens, and credential-bearing DB URLs. |
| **`manifest/no-ghost-deps`** | error | Undeclared imports against the nearest Node (`package.json`), Python (`pyproject.toml` / `requirements*.txt`), Go (`go.mod`), or Rust (`Cargo.toml`) manifest. Python findings are advisory by default because import names can differ from package names. Python lookup recognizes local PEP 420 namespace directories, PEP 508 extras, and explicit `#egg=` distribution names in legacy VCS requirements; unnamed URLs never imply a package name. |
| **`runtime/circuit-breaker`** | error | Exact repeated failures plus cosmetic command variants that keep hitting the same normalized root-cause error without successful progress. |
| **`task/instruction-fidelity`** | error | A current, explicit action is refused solely because the user previously deferred or paused the work. Questions and negative instructions do not count as authorization. |
| **`task/completion-gate`** | error* | Explicit repeated-review and requested verification requirements. A fix without a subsequent required review can trigger bounded continuation; missing verification evidence is advisory unless an observed failure contradicts completion. |

`*` These rules distinguish high-confidence blocking behavior from lower-confidence advisory findings.

For `git clean`, an explicit request authorizes normal cleanup; mentioning the command, forbidding it, or requesting a different command does not. Deleting ignored files with `-x` or `-X` requires separate authorization. A scoped `git -C ... clean` requires matching scope in the request, and shell substitutions or chained commands are not treated as authorized. Dry-run (`-n` / `--dry-run`) is not classified as destructive. **By default Guardian inspects after the tool runs:** findings are advisory at the default `warn` severity, not a pre-execution safety barrier. The separate optional preflight feature below can reject selected risky shell calls before execution.

GuardFall-inspired detection recognizes selected literal shell rewrites (empty quotes, escaped command letters, literal `$IFS` separation, simple literal substitutions, paired backtick substitutions, nested shell commands), `find -delete` / `find -exec`, and Base64 decoding piped into a shell. Decoded scripts are flagged as **opaque execution**, not proven deletion. This is deliberately limited pattern recognition, **not** a complete shell interpreter: dynamic payloads, arbitrary expansions, different shells, and unobserved side effects may escape detection. Use host-level permissions, confirmation, and filesystem isolation for prevention.

For literal file removals (including plain `rm path`), post-turn authorization is target-specific: permission for one path does not authorize another, a different target in the same command, or an unrequested `sudo` privilege escalation. Quoted examples, questions and requests for explanations do not grant permission. Complex shell syntax is not interpreted as authorization; the finding remains advisory under the default `warn` severity.

For measured test cases and limitations, see the [security benchmark](https://github.com/huseyincig/opencode-guardian/blob/main/docs/security-benchmark.md) and [OWASP Agentic Top 10 coverage map](https://github.com/huseyincig/opencode-guardian/blob/main/docs/owasp-agentic-top10-2026.md).

---

## Configuration (`opencode-guardian.json`)

OpenCode Guardian works out of the box with zero configuration. `safety/destructive-operations` defaults to `warn`; the other blocking rules default to `error`.

To customize behavior, create `opencode-guardian.json` (or legacy `opencode-guard.json`) in the project root, `.opencode/`, or the global OpenCode config directory:

```json
{
  "enabled": true,
  "remediationBudget": 1,
  "iterationBudget": 3,
  "preflight": { "enabled": false },
  "rules": {
    "discipline/no-evasion": "error",
    "discipline/no-apology": "error",
    "quality/no-shortcuts": {
      "severity": "error",
      "customPhrases": ["works on my machine", "not my job"],
      "exceptions": ["temporarydirectory", "tempdir"]
    },
    "integrity/no-stubs": "error",
    "integrity/no-unverified-claims": {
      "severity": "error",
      "blockUnverified": false
    },
    "integrity/no-silent-failure": {
      "severity": "error",
      "blockEmptyHandlers": false
    },
    "safety/no-truncation": "error",
    "safety/destructive-operations": "warn",
    "testing/no-cheat": {
      "severity": "error",
      "blockSnapshotUpdates": false,
      "blockStructuralTestChanges": false
    },
    "security/no-secrets": "error",
    "manifest/no-ghost-deps": {
      "severity": "error",
      "blockPythonGhostDeps": false
    },
    "runtime/circuit-breaker": "error",
    "task/instruction-fidelity": "error",
    "task/completion-gate": "error"
  }
}
```

### Dependency audit policy

CI blocks on any production dependency advisory with `npm audit --omit=dev`. It also runs a full development-dependency audit through `scripts/check-dev-audit.mjs`. Babel is overridden to a patched `7.29.7+` release in the current source. The remaining 12 high-severity npm reports refer to the **same unresolved upstream** `http-cache-semantics` advisory ([GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)) propagated through the dev-only OpenCode V2 SDK dependency tree. The dev audit prints this exception and fails if new advisory sources or affected packages appear; these 12 reports are **not fixed**. Avoid using development SDK dependencies as production runtime dependencies. When upstream publishes a fix, update the lockfile and remove the exception.

### Guardian event log, status command, and optional V2 sidebar

Guardian records **minimal redacted events** in `~/.local/state/opencode-guardian/events.jsonl` (or `OPENCODE_GUARDIAN_STATE_DIR/events.jsonl`). The directory is created with mode `0700` and the file with `0600` on POSIX. Events include plugin startup, inspected **shell** calls (when strict preflight is enabled), pre-execution blocks, post-turn warnings/remediations, and inspection errors. No raw commands, prompts, tool arguments, credentials, or original session IDs are written; session IDs are short SHA-256 fingerprints. Logging is best-effort and does not block tool execution if its directory is unwritable.

Run `opencode-guardian-status` with the installed package, or `node scripts/guardian-status.mjs` from the repository. The command shows counters and the last-start preflight state. Counters are calculated from the newest **2 MiB** of the log; when older entries are omitted, the command and sidebar explicitly say so. The displayed preflight state reflects the **last recorded successful plugin start**, not proof that a plugin process is currently alive. Only shell calls checked by strict preflight count as "inspected"; a zero does not mean that no other tools ran.

On compatible **OpenCode V2** CLI builds, the package also exports `./tui`. The sidebar appears if the CLI discovers and loads that TUI entrypoint; this has not yet been visually verified on a live V2 host. It **appends** a compact Guardian section to `sidebar.content`; it does not replace built-in widgets or other plugins' sections. The TUI reads the **local** log, so a CLI connected to a server on a different machine cannot display that server's counters. OpenCode V1 continues to use the server plugin and status command; there is no V1 sidebar API assumed here. Native TUI rendering requires the host's `@opentui/core`, `@opentui/solid` and `solid-js` runtime.

### Optional pre-execution protection (strict opt-in)

Set `"preflight": { "enabled": true }` in `opencode-guardian.json` to register a pre-execution shell-tool hook. This is **disabled by default**; the existing `session.idle` checks and `safety/destructive-operations: warn` behavior remain unchanged.

- **V1:** uses `tool.execute.before`. **V2:** uses `ctx.tool.hook("execute.before", ...)`. When an explicitly configured strict V2 preflight encounters an incomplete host context, unavailable event subscription or missing tool hook, setup fails visibly rather than silently claiming that protection is active.
- When enabled, the strict hook rejects recognized destructive shell operations (including plain `rm path`, paired active backtick substitutions and selected GuardFall-inspired literal rewrites) and decoded payloads piped into a shell. Shell-tool calls without an inspectable string command are also rejected. It does not modify tool arguments or invoke shell commands itself.
- This initial strict mode rejects recognized risks **even when the user has requested the operation**. It has no implicit consent bypass. Leave it disabled when legitimate destructive operations must be authorized through OpenCode's own permission mechanisms.
- Only recognized shell-execution tool names are inspected. Custom tool names, arbitrary shell expansions, scripts launched by other tools, filesystem writes through non-shell APIs, and other paths may fall outside its detection. This is **not a complete shell parser, a sandbox, or a replacement for host permissions**.

```json
{
  "enabled": true,
  "preflight": { "enabled": true }
}
```

### Severity Levels:
- `"error"`: a blocking rule can send one combined remediation prompt, subject to the turn remediation budget.
- `"warn"`: findings remain in the engine result but do **not** trigger remediation.
- `"off"`: disables the rule.

`iterationBudget` independently accepts `0..5` (default `3`), and only applies to explicit iterative tasks. Both budgets fail open when exhausted; repeating an idle message without new tool progress does not trigger another continuation.

For a task-focused configuration, the older conversation-style rules can be changed to `"warn"` without disabling the new task rules. Unknown evidence never justifies declaring a comprehensive audit complete.

`remediationBudget` accepts `0..5`; `0` keeps findings but disables automatic remediation, and the default is `1`. The strict options `blockUnverified`, `blockEmptyHandlers`, `blockSnapshotUpdates`, `blockStructuralTestChanges`, and `blockPythonGhostDeps` are deliberately `false` by default to reduce false positives. Structural test changes become blocking automatically when the same turn contains failed-test evidence.

---

## Explicit task contracts

When the latest genuine user prompt **explicitly** requests a repeated debug/review, Guardian builds a task contract for that human turn. It guides the agent before its model request and checks the observed tools at `session.idle`. A source-review loop requires a new, nonempty source inspection **after** the last change; a test-only loop can be supported by a successful later test run. Omitted or ambiguous evidence remains advisory where a direct contradiction cannot be established. A concrete blocker is reported instead of causing an infinite retry.

The contract detects supported instructions and observed post-change evidence; it does not prove full repository coverage. See the [V1/V2 architecture](https://github.com/huseyincig/opencode-guardian/blob/main/docs/task-contract-v1-v2.md) and [international policy](https://github.com/huseyincig/opencode-guardian/blob/main/docs/international-policy.md).

---

## Language-neutral task decisions

English and Turkish task extraction now has conservative signal support for **Spanish, Portuguese, French, German, Russian, Arabic, Hindi, Chinese, Japanese, Korean and Indonesian**. These identify explicit actions, repeated review, negation, requested tests, historical refusal, completion reports and blockers. They are **not** universal language understanding or an exhaustive list of paraphrases.

Every supported language produces the same typed task contract; `evaluateTaskPolicy` makes the actual task/verification decision from **structured tool evidence**, not from the detected language. Missing or ambiguous evidence is not accepted as a proven success. The optional first-line directive below gives deterministic task conditions even in unsupported languages:

```text
@guardian-task {"mode":"iterative-review","review":"source","verify":["test"]}
[Write the task in any language.]
```

The header is optional, accepts only the documented fields, and does not grant tool permissions or authorize a release. Recognized explicit prohibitions in the body override conflicting directives. See [international architecture and source review](docs/international-policy.md).

---

## Evidence and remediation flow

```mermaid
flowchart TD
    Z[Explicit human task] --> Y[V1 chat.message or V2 prompt hook]
    Y --> X[Task contract guidance before model call]
    X --> A[Agent executes tools and responds]
    A --> B[OpenCode emits session.idle]
    B --> C[Extract current human turn]
    C --> D[EvidenceCollector]
    D --> E[Normalize tools, exit codes, mutations, git state, error fingerprints]
    E --> F[Run 14 rules]
    F --> G{High-confidence blocking findings?}
    G -->|No| H[Pass / advisory findings only]
    G -->|Yes| I{Remediation budget available?}
    I -->|No| H
    I -->|Yes| J[Send remediation or bounded task continuation]
    J --> K[Agent remediation response]
    K --> L[Loop guard passes remediation turn]
```

1. **Evidence collection:** Each completed human turn is normalized once. Tests, builds, typechecks, lint, audits, git operations, file mutations, explicit exit codes, and failure fingerprints become shared evidence.
2. **Rule evaluation:** Rules inspect both text/code and the same evidence snapshot. A successful verification that happened before a later file edit is considered stale for completion claims. A completed file read/view or an actual source-bearing search/diff can support post-change inspection; file-name listings and diff statistics alone cannot. Compound commands are tracked by verification kind; ambiguous failures in multi-step commands remain advisory.
3. **Conservative blocking:** Missing or ambiguous evidence is generally advisory. Direct contradictions and concrete code/tool violations are the primary blocking path.
4. **Remediation budgets:** Standard remediation defaults to one intervention per human turn. Explicit iterative reviews use a separate `iterationBudget` (default 3) and will not retry without progress.
5. **Loop protection:** Guardian's remediation marker is recognized on both V1 and V2. During a Guardian continuation, the completion gate checks the entire human turn, while other rules inspect **only the new assistant work**; prior findings are not repeatedly reprocessed. Synthetic messages from other plugins do not reset the human-turn budget.

---

## Testing and verification

```bash
# Build + 323 unit/regression tests (current main)
npm test

# Typecheck TypeScript sources
npm run typecheck

# Isolated plugin smoke test
node sandbox/smoke-test.mjs

# 18 isolated sandbox scenarios
node sandbox/comprehensive-test.mjs

# Runtime dependency/security audit
npm audit --omit=dev

# Full dev audit with a tracked upstream exception
node scripts/check-dev-audit.mjs

# Inspect npm package contents
npm pack --dry-run
```

CI runs the full verification sequence on Node **22** and **24**. The 323 source tests include active backtick and plain-removal regression cases, deletion questions versus explicit scoped authorization, strict V2 preflight failure on incomplete contexts/invalid event subscriptions, partial-V2 fallback when strict mode is off, remediation budgets, and the existing rule regressions. Live V2 host integration remains unverified.

---

## Project layout and documentation

- [`src/`](src/): OpenCode adapters (`index.ts`), rules, evidence and task policy, opt-in preflight, telemetry and V2 TUI.
- [`tests/`](tests/) and [`sandbox/`](sandbox/): automated regressions and isolated host scenarios.
- [`dist/`](dist/): prebuilt package; [`scripts/`](scripts/): status command and development-audit check.
- [`CHANGELOG.md`](CHANGELOG.md): version history, publication status and compatibility notes.
- [`docs/task-contract-v1-v2.md`](docs/task-contract-v1-v2.md): V1/V2 hook design and task contracts.
- [`docs/international-policy.md`](docs/international-policy.md): supported languages and task-decision limits.
- [`docs/security-benchmark.md`](docs/security-benchmark.md): synthetic security tests and their limits.
- [`docs/owasp-agentic-top10-2026.md`](docs/owasp-agentic-top10-2026.md): risk coverage and gaps.
- [`docs/performance-benchmark.md`](docs/performance-benchmark.md): earlier V1 measurements (not current-version latency claims).

---

## License

[MIT](LICENSE) © Hüseyin Hadi Çığ
