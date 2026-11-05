# opencode-orchestrator-uni

**English** · [Русский](./README.ru.md)

A native [OpenCode V2](https://opencode.ai/v2/docs/build/plugins) package plugin that
ships the **orchestrator agent kit**:

- `orchestrator` — the root orchestrator (primary agent) with the audit loop as a
  built-in mode; it delegates every code/doc/test edit and writes only audit and
  session-state artifacts;
- read-only audit subagents — `factcheck`, `empiric`, `invariant`,
  `arbiter`, `meta`, `redteam`, `context-lint`;
- `fix-runner` — the only writing subagent of the kit (applies the "to close" list);
- the kit's process documents, exposed as the **`audit-kit` reference**
  (`call-mechanics.md`, `process-ready-loop.md`, `root-runbook.md`,
  `instruction-other-session.md`, `context-efficiency.md`, `session-discipline.md`);
- five deterministic, read-only tools — `orch_uni_validate_report`, `orch_uni_context_lint`,
  `orch_uni_snapshot`, `orch_uni_sessions`, `orch_uni_session_stats` (see [Tools](#tools));
- three slash commands — `/agents-md`, `/spec` and `/handoff` (see [Commands](#commands)).

Read-only audit agents are enforced at the tool level for `edit`/`write`/`patch`
(`edit: deny`) and by the prompt ban for everything else; their `shell` permission
stays allowed so they can run verification commands. A write through shell (redirect,
`sed -i`, `tee`) is forbidden by the prompt, not by a sandbox — an accepted risk, same
as I-M15; no permission is relaxed.

The orchestrator itself has `edit` denied on `*`; the flat `permissions` are only a narrow fallback allowlist for audit/state artifacts, and the real guard is the `permission.hook("evaluate")` hook in `lib/write-guard.ts` with path-root semantics. The session directory is read per event (`session.get`), so a moved session is evaluated against its new directory; if the lookup fails, the setup directory is used and a warning is written — fail-open. A resource outside the session directory is denied: the guard is the workspace boundary, so `reports/`, `docs/planning/` and `audit-*` are not writable outside it. Inside it the first **root** segment decides. `reports/` is a reserved artifact root — the whole subtree is writable (even `reports/src/x.ts`), so project code must not live there (a `packages/reports/**` path counts as an artifact by contract); `docs/planning/**/*.md` is allowed (nested Markdown at any depth; a `.ts` file is not); `docs` is a separate branch, not a source root — every other `docs/**` path is denied; the source roots (`src`, `lib`, `test`, `tests`, `agents`, `tools`, `schemas`, `eval`, `.github`) are denied even under an artifact-looking prefix (`src/reports/x.ts`, `src/docs/planning/x.md`). Root artifact files (`case-*`, `risks-*`, `handoff-*`, `decisions-*`, `state.md`) are allowed only in the location root, under `reports/`, `docs/planning/` or an `audit-*` directory — `app/state.md` is denied. The hook runs after the flat rules, so a local `edit: allow` for `orchestrator` is closed too. The flat fallback carries only that artifact set as location-root rules (`reports/*`, `case-*.md`, `risks-*.md`, `handoff-*.md`, `decisions-*.md`, `state.md`, `docs/planning/*.md`) plus `audit-*/…`; the broad `*/state.md`-style patterns are gone, so `src/state.md` is denied even without the hook, but last-match still cannot express root priority everywhere (`audit-x/src/case-y.md`) — a warning is written. The fallback is narrower than the hook for nested artifact roots: `lab/x/reports/*` and similar paths are written only with the hook (the root rules cover `reports/*` at the location root only). A failing or timed-out session lookup (250 ms bound) falls back to the setup directory and writes the warning once per guard; for a moved session an absolute artifact path may then be denied (fail-closed for that class). A single `sessionWarned` flag without a counter is accepted: failures after the first warning stay silent. `shell` stays allowed for git and checks; a shell write and symlinks/junctions (the host matches the normalized lexical path, not `realpath`) are accepted risks, as is fail-open (a broken guard never breaks the session), governed by the prompt rather than a sandbox. A tool denial is a role rule — the edit goes to a subagent.

The package is loaded directly from TypeScript: `exports` points at
[`index.ts`](./index.ts). There is **no build step and no `dist/`** — OpenCode's
Bun-based runtime resolves and loads the entry point natively (same pattern as the
official `@opencode/plugin-figma` package).

## What the plugin registers

On setup (`ctx.agent.transform` / `ctx.reference.transform`):

| Agent             | Mode       | Role                                                     |
| ----------------- | ---------- | -------------------------------------------------------- |
| `orchestrator`    | `primary`  | Root orchestrator; delegates edits; writes audit/state artifacts |
| `factcheck` | `subagent` | Read-only: staleness pre-pass (already done / outdated)  |
| `empiric`   | `subagent` | Read-only: reproductions, measurements, first sources    |
| `invariant` | `subagent` | Read-only: states, cancels, races, hostile input         |
| `arbiter`   | `subagent` | Read-only: resolves disputed findings only               |
| `meta`      | `subagent` | Read-only: meta-audit of reports (pass/fail gate)        |
| `redteam`   | `subagent` | Read-only: acceptance red team (release gates)           |
| `context-lint` | `subagent` | Read-only: audits AGENTS.md/SPEC.md for token efficiency |
| `fix-runner`      | `subagent` | Writer: applies the fix list and proves closure          |

All agents ship **without a model**: models are deployment configuration (see
[Models](#models)). Definitions live in [`agents/`](./agents) as plain Markdown agent
files and are parsed at setup time — the files are the single source of truth.

"Read-only" here means `edit` is denied and the prompt forbids writes; `shell` stays
allowed so an auditor can run the verification commands it needs (accepted risk
I-M15). The audit loop treats that as a contract, not as a sandbox.

The `audit-kit` reference points at this package's per-locale `docs/<locale>/`
directory (see [Locale](#locale)). OpenCode lists it in session context as an
additional local directory, so the orchestrator (and any other agent) can read
the process documents directly, for example `<reference path>/call-mechanics.md`.

The plugin also registers five deterministic, **read-only** tools in the `orch_uni`
namespace and three slash commands — see [Tools](#tools) and [Commands](#commands).

## Commands

| Command | What it does |
| --- | --- |
| `/agents-md` | Injects the AGENTS.md audit/draft workflow: `context-efficiency.md` template, `orch_uni_context_lint`, `context-lint`, approval before writing. |
| `/spec` | Injects the SPEC.md workflow: brief, clarifying questions, EARS/AC/traceability, `orch_uni_context_lint`, `context-lint`, approval before writing. |
| `/handoff` | Injects the slice-closing workflow: session and working-tree facts, the `session-discipline.md` handoff template, writes `docs/planning/handoff-<YYYY-MM-DD>.md`. |

A command is a prompt, not a writer: its handler injects a workflow prompt into the
current session. The orchestrator then follows the usual evidence and approval rules.

## Tools

| Effective name           | Read-only | What it does                                                                  |
| ------------------------ | --------- | ----------------------------------------------------------------------------- |
| `orch_uni_validate_report`  | yes       | Extract the SGR JSON block of a report, resolve its schema, validate it        |
| `orch_uni_context_lint`     | yes       | Deterministic audit of AGENTS.md/SPEC.md: budget, vague phrases, links, sections |
| `orch_uni_snapshot`         | yes       | Deterministic revision of a directory tree (per-file sha256 + aggregate hash)  |
| `orch_uni_sessions`         | yes       | Child sessions of a session: agent, model, cost, tokens, time                  |
| `orch_uni_session_stats`    | yes       | Session protocol counters: prompt, compactions, tools/turn, capped outputs      |

Every tool answers with a JSON text body. Failures are **typed codes** inside the body
(`E_INPUT`, `E_NO_JSON`, …) instead of thrown tool errors, so an agent can branch on the
code without parsing prose. None of the five writes to the workspace, the session store
or the configuration.

### `orch_uni_validate_report`

```jsonc
{ "text": "<report text>" }              // or
{ "path": "reports/empiric-r1.md",        // absolute, or relative to the location directory
  "schema": "empiric/v1" }          // optional: expected schema id
```

Provide exactly one of `text` / `path`. The tool takes the **last** fenced ```` ```json ````
block that parses and carries a `schema` field, resolves the schema by that field and
validates the document.

```jsonc
{ "valid": true, "schema": "empiric/v1", "errors": [], "warnings": [ … ] }
{ "valid": false, "code": "E_INVALID", "schema": "empiric/v1",
  "errors": [ { "path": "$.findings[0].severity", "message": "expected one of …" } ],
  "warnings": [] }
```

| Code                | Meaning                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `E_INPUT`           | Bad call: neither/both of `text`/`path`, wrong types, unreadable file |
| `E_NO_JSON`         | No fenced ```` ```json ```` block found                          |
| `E_PARSE`           | A block exists but none parses as JSON                           |
| `E_UNKNOWN_SCHEMA`  | The report names an id that is not shipped (or no id at all)     |
| `E_SCHEMA_MISMATCH` | The report names another schema than the expected one            |
| `E_INVALID`         | The document does not satisfy its schema (see `errors`)          |
| `E_SCHEMA_IO`       | `schemas/*.json` unreadable/malformed (see `directory`, `file`)  |
| `E_ABORTED`         | The session was stopped while reading the report                 |

`warnings` carry the prompt rules a *structurally valid* report can still miss — things
JSON Schema cannot express: a missing `rc` on an `empiric` claim whose `method` is
`run|measure|compare_base`, `self_check` items other than 1–19, an `invariant`
invariant that is `violated` without a counterexample, an uncovered mandatory
`lines_checked` line, `meta`'s `verdict` diverging from its `gate`, and
`redteam`'s `closing_list`/`verdict` invariants.

The schemas ship as `schemas/*.json` and are derived **strictly** from the SGR
sections of `agents/*.md`, which stay the source of truth: the test suite parses every
agent's SGR template and fails when a prompt field or enum value is not accepted by its
schema. `context-lint-failure/v1` is the typed failure envelope of
`orch_uni_context_lint` — it has no agent template and is never a report. Schemas set
`additionalProperties` permissively — agents may add fields of their
own (`verdict_label`, `check`, …).

### `orch_uni_context_lint`

```jsonc
{ "path": "AGENTS.md" }                  // file or directory, relative to the location
{ "path": ".", "max_lines": 150, "max_tokens": 2000 }
{ "path": ".", "max_words": 2000 }       // SPEC word budget; default 1500 (target), ceiling 2000
{ "path": ".", "max_file_bytes": 500000, "max_files": 100, "max_findings": 50, "max_total_findings": 500 }
```

Deterministic, read-only audit of `AGENTS.md`, `SPEC.md` and `CLAUDE.md`. It returns
`{ schema: "context-lint/v1", ok: true, verdict, closing_list, files, summary, truncated? }`;
each finding carries `id`, `severity`, `kind`, `evidence`, `detail` and `fix`. Checks:
line/token/word budget, distinct vague phrases, duplicate lines, broken relative links,
placeholders, dates/versions in the first three lines, required sections and AC test
columns. Links and explicit targets are confined by their **real** path: a symlink or
junction that resolves outside the root is skipped, and such a target is refused
(`E_OUT_OF_ROOT`). Code fences, inline code and HTML comments are masked, so a sample is
never a rule: structural checks (commands, boundaries, verification) read the full mask,
while requirements, AC ids and non-goals read the fence mask. Link targets are
streamed from the line scanner one at a time (no candidate array), so memory does
not grow with the number of links; checks are capped per file at 50 000
candidates, the signal is checked per line and every 100 candidates, and the
link caches keep at most 5 000 entries, so an abort wins; 2001 links are checked
normally, 50 000 valid links still pass, and the 50 001st candidate makes the list
incomplete (`truncated: true` plus a MAJOR `link candidates truncated` marker in
`closing_list`), so a capped run can never pass. Broken
links have no separate per-file cap: the finding caps bound the output and report the
overflow. A line is scanned however long it is: the link scanner and the placeholder regex
are linear, so a 4100-character line is checked like any other and a broken link or
placeholder on it is the real finding, not a marker. Duplicate lines have no inner cap.
UNC/network targets are never probed. Measured (bun 1.4.2, Windows, fresh
process): 50 001 broken links with `max_findings: 2` → ~1.4 s and ~67 MB peak
RSS; 50k plain lines → ~0.14 s / ~65 MB; a 2 MB single line with links →
~3.1 s / ~116 MB (~41 MB without links). Masking reuses a line as-is when it
has no backtick and no `<pre>`/`<code>`/`<!--`, so it never copies a line
character by character, and a 2 MB single line stays capped at 50 000
candidates instead of materializing every link.
Limits: ≤ 2 MB per file, ≤ 500 files per scan. `max_findings` (per file) is N per
severity: up to N MAJOR and N MINOR/INFO are kept, and any excess is replaced by one
marker (MAJOR when a MAJOR was dropped, otherwise INFO); a MAJOR marker stays in
`closing_list`. `max_total_findings` (global, default 1000) keeps MAJOR
findings first; when MAJOR overflow, `max_total` findings plus one MAJOR `truncated`
marker are kept. A capped list sets `truncated: true` instead of hiding findings.
Markers are additional to `max_findings` and do not consume its budget: a capped
link-candidate list and a capped findings list report one marker each in the same run, so
`max_findings: 2` over 20 001 broken links yields 2 kept findings plus 2 markers. Cap
markers point at `file:1` in `evidence`.
Non-goals are counted as top-level items: a wrapped paragraph is one item, inline
`;`/`,`/`and`/`и` split only at the top level (not inside `(…)`, `[…]`, backticks of any
width or `<code>`), and a bullet at 0–4 spaces under the label is an item — fenced,
`<pre>` and deeper-indented code is not.
Placeholders are `<...>` (three or more dots) and `TODO`/`TBD`/`FIXME`; `<DoD>` and
`<name>` are markup.
`max_lines` is the single 200-line root budget the tool applies: the 60/200/100
per-level figures in [`docs/`](./docs) are authoring guidance, not separate tool limits.
`max_words` defaults to the 1500-word SPEC target; pass `max_words: 2000` to enforce the
documented ceiling instead.
Typed failures: `E_INPUT`, `E_NOT_FOUND`, `E_NO_FILES`, `E_IO`, `E_ABORTED`,
`E_LIMIT_FILE`, `E_LIMIT_FILES`, `E_OUT_OF_ROOT`.
A failure is a typed payload `{schema:"context-lint-failure/v1", ok:false, code, message, path?, bytes?, files?, max?}`
that validates only against `context-lint-failure/v1`; a report is
`{schema:"context-lint/v1", ok, verdict, closing_list, files, summary, truncated?}` and every file carries `lines`,
`words`, `chars` and `tokens_est` (tokens are estimated as Cyrillic/3 + the rest/4). A directory
target is scanned to depth 3, and `max_files` refuses early: the walk stops at the first file above
the limit. Nothing is dropped silently: a directory below the depth limit, a link or junction that
resolves outside the workspace root, and an unclosed fence, `<pre>` or HTML comment are INFO
findings, so a `pass` never hides an unchecked region. An unclosed `<code>` is a
line-local mask: it hides the rest of its line and is not reported (only fence,
`<pre>` and HTML comments span lines and get an INFO marker). An abort is observed
between files, every 2048 lines of a line-oriented check and at each gate, so the
worst-case latency is one mask pass over a file capped by `max_file_bytes` (tens of
milliseconds per 2 MB), not the whole scan. Commands count only inside code, a Task table
or a Commands section, an HTML comment such as `<!-- npm install -->` is not a command, and `make`
needs a target, so prose such as "Make sure …" is not a command. A scan started at the root also
picks up fixture trees such as `eval/`; pass an explicit path for the canonical files.

### `orch_uni_snapshot`

```jsonc
{ "path": "lab/stack-test", "exclude": ["tmp"] }   // exclude is optional and additive
```

```jsonc
{ "root": "C:\\…\\lab\\stack-test",
  "files": [ { "path": "a.txt", "sha256": "…", "bytes": 1 } ],
  "aggregate": "…" }
```

- `aggregate = sha256` over the sorted lines `"<relpath>\0<sha256>\n"` (`/` separators,
  codepoint order) — stable across runs, machines and traversal order, and it changes
  whenever one file's path or content changes.
- Excluded by default (always): `node_modules`, `.git`, `.ae`; `exclude` adds names,
  whole relative paths or relative prefixes (`lab/tmp`). Symlinks are skipped.
- Limits: ≤ 5000 files, ≤ 50 MiB per file — `E_LIMIT_FILES` / `E_LIMIT_BYTES` (fail the
  whole snapshot; a truncated snapshot would be a wrong aggregate). `E_NOT_FOUND` for a
  missing path or a non-directory, `E_ABORTED` when the session is stopped.

### `orch_uni_sessions`

```jsonc
{}                                        // children of the calling session
{ "sessionID": "ses_…", "recursive": true }  // whole subtree of another session
```

```jsonc
{ "sessionID": "ses_parent", "recursive": false, "source": "session.index",
  "authoritative": false, "indexSize": 1, "count": 1,
  "limitations": [ … ],
  "sessions": [ { "sessionID": "ses_child", "parentID": "ses_parent", "agent": "explore",
                  "model": "deepseek/deepseek-flash", "variant": "default", "title": "…",
                  "cost": 0.0005, "tokens": { "input": 3491, "output": 2 },
                  "created": "2026-10-15T04:01:06.627Z", "updated": "…" } ] }
```

`source` tells which route produced the answer:

- `session.list` — this build exposes a session listing API; the answer is
  **authoritative** and complete (`recursive` walks the subtree page by page).
- `session.index` — the fallback used by OpenCode 2.0.28: `ctx.session` has
  `get/create/…` but **no `list`**, so children cannot be enumerated from the store. The
  plugin subscribes to `session.created` / `session.deleted` events at setup and keeps
  `child → parent` in its plugin-scoped storage; per-child details are read from
  `ctx.session.get()` at call time. The answer is **not authoritative**; the caveats are
  returned in `limitations` (sessions created before the plugin instance started are
  invisible, and an event gap hides children created while the plugin was unloaded).
- `E_NO_API` — neither route exists. The context-scan fallback (looking for the
  `subagent` tool parts in `ctx.session.context`) was evaluated and rejected: in-flight
  children carry no session id in their tool part and compaction drops the history.
  Open question: a plugin-facing session listing (or a `parentID` filter on
  `ctx.session.context`) would remove the fallback entirely.

`E_INPUT` for malformed arguments, `E_NOT_FOUND` when the parent session does not exist,
`E_ABORTED` when the session is stopped.

### `orch_uni_session_stats`

```jsonc
{}                                  // counters of the calling session
{ "sessionID": "ses_…" }            // any session on this server, not only a child
```

```jsonc
{ "ok": true, "sessionID": "ses_…",
  "counters": {
    "requests": 12, "promptTokensLast": 151204, "promptTokensMax": 161002,
    "promptTokensMedian": 148900, "band": 1, "compactions": 1,
    "compactionAttempts": 1, "compactionFailures": 0, "compactionSource": "event",
    "reminders": 2, "toolCalls": 31, "outputsCapped": 1,
    "outputCharsSaved": 18422, "errors": 0,
    "toolCallsByTool": { "shell": 18, "bash": 6, "webfetch": 2, "read": 5 },
    "toolOutputsCappedByTool": { "shell": 1, "bash": 0, "webfetch": 0, "read": 0 }
  },
  "limits": { "promptTokensSoft": 150000, "maxCompactions": 1, "maxToolOutputChars": 20000 },
  "overBudget": true, "compactionLimitReached": true, "toolsPerTurn": 2.58,
  "tracked": true,
  "guard": { "available": true, "hooksRegistered": true, "sessionEnabled": true,
             "toolOutputEnabled": true,
             "toolOutputTools": ["shell", "bash", "webfetch"],
             "compactionSource": "event", "eventLive": true,
             "streamFailures": 0, "unkeyedCalls": 0 } }
```

`sessionID` may name **any session on this server**, not only a child of the caller;
that is deliberate — the orchestrator uses the report to control every slice it runs.
Counters are per plugin instance, and `tracked` is `true` once any event or hook
observed the session; a `session.deleted` event forgets it. `band` is the highest
budget level reached (`0` below the soft threshold); `promptTokensMedian` is the
median over the last 256 requests; `toolCalls` and the per-tool counters include
nested Code Mode calls; `toolCallsByTool` and `toolOutputsCappedByTool` split calls
and capped outputs by the normalized tool name (namespace stripped, lower-case);
`outputCharsSaved` is a character count, not bytes, and an upper estimate (the
injected stub is subtracted). `compactions` counts confirmed
`session.compaction.ended` events only; `compactionAttempts` counts every
`session.compaction` hook call, so on a host with a dead or absent event stream
attempts keep growing while `compactions` and `compactionLimitReached` stay put (a
failed attempt is never a stop signal). A dead stream is reported once in
`guard.streamFailures`; the per-session `errors` counts hook failures only, so a
transport incident is not attributed to every session. Duplicate compaction events
are counted once only when the host supplies `event.id` or a durable position;
without either identity a re-delivered event may be counted again (fail-open in the
direction of counting). A
session the store does not return and this instance never observed is
`E_NOT_FOUND` (recognized by the typed `_tag`/`name`/`code` — `Session.NotFoundError`,
`SessionNotFoundError`, `NotFoundError`, `ENOENT` — with a narrow message fallback);
`session.get` returning `undefined` for an untracked session is the same not-found
answer; a transient `session.get` failure (a lock, permission, `unknown database`) is
`E_INTERNAL`; a known session with zero requests is a valid report with
`tracked: false`. Without `session.get`,
an untracked session is `E_NO_API`, a tracked one is `ok` with `session: null` and a
`limitations` entry. Codes: `E_INPUT`, `E_NOT_FOUND`, `E_INTERNAL`, `E_NO_API`,
`E_UNAVAILABLE` (the guard is not registered or its hooks failed), `E_ABORTED`.

## Session hygiene

The plugin implements the [`session-discipline.md`](./docs/en/session-discipline.md)
protocol: a session is one slice, the prompt budget is ≤150k tokens, at most one
compaction, tool output goes to a file, and a slice ends with a handoff.

The runtime part is three hooks (`session.context`, `session.compaction`,
`tool.execute.after`) plus a compaction-event subscription:

- `session.context` — estimates the prompt (system + messages) and, when it crosses
  a budget level, adds one short reminder. The reminder is injected **once, when a
  new level is crossed**, not on every request; within a level the text is stable,
  so the prefix cache is not broken.
- compaction events — the `session.compaction` hook is registered on **every** host:
  it counts attempts (`compactionAttempts`) and sends a tentative note to the
  nearest request; the note names no compaction number and claims no limit. Only
  `session.compaction.ended` confirms a compaction (deduplicated by `event.id` or
  the durable position) and raises a confirmed note with the number and the limit;
  `session.compaction.failed` increments `compactionFailures`, drops the tentative
  note and keeps a confirmed note that is still waiting for delivery. If the event
  stream ends or throws, `guard.eventLive` turns `false`,
  `guard.compactionSource` becomes `hook` and `guard.streamFailures` becomes `1`
  (the per-session `errors` stays `0`); the hook keeps counting attempts, but no
  confirmed compaction and no false "limit reached" is invented on that path.
- `tool.execute.after` — for `shell`, `bash`, `webfetch` it caps output over
  `maxChars`: the full text goes to a private per-process root
  `os.tmpdir()/opencode-tool-output-<random>/` (POSIX 0700 for the root and the
  session directory, 0600 for the file). Windows ignores mode (measured: 0666),
  so privacy there rests on the ACL of `os.tmpdir()` and is not checked by code.
  The model gets a head and the path; the root is created with `mkdtemp` at plugin
  setup, so a
  pre-created `opencode-tool-output` directory or junction is never used; on POSIX
  the root must belong to the current uid with no group/other access, otherwise
  the guard disables itself with a warning (fail-open: results are untouched).
  Session directories (`s-<uuid>`) and files (`c-<uuid>.txt`, written with `wx`)
  are random, and each `realpath` is proven inside the root. The root is removed
  when the plugin unloads (best effort). A lone surrogate is normalized once
  (U+FFFD), so the file, the head and the counters describe the same string.
  Residual risk accepted: a same-user
  attacker can still swap a session directory between `realpath` and `writeFile`
  (Node has no `openat`). If `TMPDIR` points inside the workspace, the files land
  there instead. `read`, `write`, `edit`, `execute` and the kit's own tools are
  not capped, and a kit tool named without its namespace (`session_stats`) is
  refused in the config with a warning.

`maxCompactions: 0` disables the compaction limit. The guard is fail-open: a hook
error neither breaks the request nor corrupts the result. Either part can be
disabled with its `enabled` flag:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-orchestrator-uni",
      "options": {
        "sessionGuard": { "enabled": true, "promptTokensSoft": 150000, "maxCompactions": 1 },
        "toolOutputGuard": {
          "enabled": true,
          "maxChars": 20000,
          "headChars": 4000,
          "tools": ["shell", "bash", "webfetch"]
        }
      }
    }
  ]
}
```

Slice metrics — `orch_uni_session_stats`; closing a slice — the `/handoff` command.

## Models

Agent definitions carry no `model`; models are configured on the plugin entry in
`opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-orchestrator-uni",
      "options": {
        // Default for every kit agent.
        "model": "deepseek/deepseek-flash",
        // Per-agent overrides (id -> string or expanded form).
        "agents": {
          "meta": "deepseek/deepseek-reasoner",
          "fix-runner": { "providerID": "anthropic", "model": "claude-sonnet-4-5", "variant": "high" }
        }
      }
    }
  ]
}
```

- `model` — default model for every kit agent; `agents.<id>` — per-agent override.
  Both accept `"provider/model[#variant]"` or `{ providerID, model, variant }`.
- Without options, kit agents keep no model, so subagents inherit the session's model.
- Invalid values are ignored with a warning (`[orchestrator.uni] …`).
- Subagents run on their configured model; the primary `orchestrator` runs on the
  session's model, so a model set for `orchestrator` is informational for clients
  (as of OpenCode 2.0.28).
- An `agents` config entry or a local Markdown agent file that defines its own
  model still wins — configuration is applied after package plugins.

## Locale

Agent definitions and process documents ship per locale — `agents/<locale>/`
and `docs/<locale>/`; currently `ru` and `en` (the English content is a
translation of the Russian originals). The kit picks one locale in this order:

1. `options.locale` (`"ru"` or `"en"`; full tags such as `"ru-RU"` are accepted);
2. auto-detection: `LC_ALL` / `LC_MESSAGES` / `LANG`, then the runtime's Intl
   locale (the OS setting);
3. the default: `en`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-orchestrator-uni",
      "options": { "locale": "ru", "model": "deepseek/deepseek-flash" }
    }
  ]
}
```

A requested locale that ships no content falls back to the default locale and is
reported with a warning in the plugin log. Both locales register the same agents
under the same ids — switching the locale only changes the language of the
prompts, the process documents and the reference description.

## Requirements

- **OpenCode 2.x** with the V2 plugin API (the `plugins` config field). V1's plugin
  loader expects the legacy `server()` export and will not load this plugin.

## Install

### With the OpenCode CLI

```sh
opencode plugin add opencode-orchestrator-uni
```

### Manually

Add the package to the `plugins` array in your global
`~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-orchestrator-uni"]
}
```

Pin a version if you prefer:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-orchestrator-uni@0.1.0"]
}
```

To set kit models at the same time, use the object form — see [Models](#models):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-orchestrator-uni",
      "options": { "model": "deepseek/deepseek-flash" }
    }
  ]
}
```

Restart the OpenCode service after changing the config:

```sh
opencode service restart
```

## Precedence

Agent **definitions** are only filled in for ids that are not defined elsewhere: an
agent with the same id coming from your configuration — an `agents` config entry, or a
Markdown file under `~/.config/opencode/agents/` (or `.opencode/agents/`) — wins and the
plugin skips its definition. A **configured model** (see [Models](#models)) is still
applied to kit agents; a model defined by your own agent entry or file wins over it,
because configuration is applied after package plugins. The same skip-if-taken rule
applies to the `audit-kit` reference.

If you previously installed the kit by copying agent files into your config directory,
**remove those copies** after enabling the plugin, otherwise the stale copies keep
overriding the plugin-provided definitions.

## Development

There is no build. `index.ts` is the shipped entry point.

```sh
npm install          # installs gray-matter + dev tooling
npm run typecheck    # tsc --noEmit
npm test             # bun test ./test/ (hermetic: registration, tools, validator, snapshot, prompt↔schema + identifier guards)
npm run check:locales # bun tools/locale-check.ts (ru↔en parity of agents + docs)
npm run verify:kit   # bun tools/kit-verify.ts (locales, tests, lint, types — the kit's stand)
npm run lint         # biome check . (lint + format + import order; read-only)
npm run lint:fix     # biome check --write . (applies safe fixes)
```

The `check:locales` and `verify:kit` scripts need a git checkout of the kit — the npm package ships no `tools/` directory, so in an installed package they are unavailable (`stand: unavailable` plus your own reproducible checks).

`npm test` scans only `./test/` — the shipped suite (400 tests in 10 files, up from
72 in 5 before the identifier guards). A bare `bun test` from the repository root is red by
design: the positional argument of `bun test` is a path substring filter, so the
bare command also picks up the intentionally failing fixtures under `eval/cases/`
and the scratch drafts under `lab/`. Use `npm test` [F5].

[Biome](https://biomejs.org) ([`biome.json`](./biome.json)) covers the code surface —
`index.ts`, `lib/`, `test/`, `eval/*.ts` — and skips `lab/` and `eval/results/` through the
git ignore file, plus two frozen data kinds: `eval/cases/**` (fixtures with intentional
defects) and `eval/baselines/**` (records generated in `JSON.stringify(…, null, 2)` style;
reformatting them would churn on the next `eval:recompute`). `lint/style/noNonNullAssertion`
is the one rule turned off — the dev contour and tests use `!` deliberately after in-code
checks.

Test against a live server by pointing a project config at the checkout:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["file:///C:/path/to/opencode-orchestrator-uni"]
}
```

Configured local plugin paths must be directories (or `file://` URLs of directories);
OpenCode watches them and reloads on change.

## Notes

- One runtime dependency: [`gray-matter`](https://www.npmjs.com/package/gray-matter)
  for frontmatter parsing. OpenCode installs package plugin dependencies automatically.
- Plugin id: `orchestrator.uni`.
- Ships only the files listed in `package.json#files`: `index.ts`, `lib/`, `schemas/`,
  `agents/`, `docs/`, `README.md`, `README.ru.md`, `LICENSE`.

## License

MIT
