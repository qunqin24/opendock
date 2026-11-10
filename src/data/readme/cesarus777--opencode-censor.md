# @cesarus777/opencode-censor

A native OpenCode V2 server plugin that asks a separately selected model to review shell permissions before execution. The model can recommend `allow` or `ask`; OpenCode executes the action and owns the approval interface. The plugin contains no shell executor, agent, terminal, backend, or approval UI.

Release 0.3.1 targets **OpenCode / `@opencode/plugin` 2.2.5** and defaults to a small set of inspection commands. This is a security-sensitive initial release candidate. Package import and mocked integration are distinct from a live provider test; see [verification](docs/VERIFICATION.md) and [SDK research](docs/RESEARCH.md).

## How it works

```mermaid
flowchart TD
  T[Native shell tool input] --> C[Capture input by session, message and call ID]
  C --> R[OpenCode permission rules]
  R -->|explicit deny| D[OpenCode blocks action]
  R -->|allow or ask| H[Permission evaluate hook]
  H --> P[Check full input, resources and local policy]
  P -->|stateless inspection| L[Stateless independent model generation]
  P -->|opt-in stateful| G[Bounded project evidence and reviewer loop]
  G --> V
  P -->|unsafe or incomplete| A[Set ask]
  L --> V[Strict JSON validation and final local policy]
  V -->|valid low-risk allow| E[Set allow]
  V -->|ask, error, ambiguity or timeout| A
  A --> U[Native OpenCode manual approval]
  U --> X[OpenCode continues or rejects]
  E --> X
```

The `tool.execute.before` hook only observes input. The `permission.evaluate` hook changes the decision. Both are native V2 hooks. Explicit configured denies are final before evaluation. Other permission actions pass through untouched.

Scanner resources may omit shell operators, redirections, or other parts of the source. Stateless automatic approval therefore requires a matching captured **complete** tool command, one identical scanner resource, and a command accepted by the local inspection grammar. Missing source identifiers, expired correlation, multiple resources, changed input, an external `workdir`, or unsupported shell syntax produce `ask`. A resource that happens to say `pwd` is insufficient on its own.

Version 0.2.0 also supports opt-in [stateful project review](docs/STATEFUL.md)
for generic commands with bounded, model-requested project evidence. Project review
delegates program semantics to the reviewer and enforces local evidence,
budget and approval constraints; it does not interpret build tools or languages. These options and custom reviewer instructions require version 0.2.0 or later.

## Install from npm

OpenCode can install the package directly from configuration; no source copying is needed:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@cesarus777/opencode-censor@0.3.1",
      "options": {
        "model": { "providerID": "anthropic", "id": "MODEL_ID" },
      },
    },
  ],
  "permissions": [
    { "action": "shell", "resource": "*", "effect": "ask" },
    { "action": "shell", "resource": "git push *", "effect": "deny" },
    { "action": "external_directory", "resource": "*", "effect": "ask" },
  ],
}
```

`MODEL_ID` is a placeholder: replace it with a model available in your OpenCode installation. A literal placeholder is rejected. Use `opencode models` to inspect available models and connect the provider through OpenCode. The reviewer uses existing OpenCode provider credentials; the plugin asks for no API keys. It never inherits the working agent's selected model implicitly. A different supported provider is valid.

For **global** activation, put the configuration in `~/.config/opencode/opencode.jsonc`. For **project** activation, put it in `<project>/opencode.jsonc` or `<project>/.opencode/opencode.jsonc`. Merge entries with existing configuration; do not duplicate the plugin. OpenCode's managed configuration and rule precedence still apply. Keep independent hard-deny rules for operations that must never run.

`@cesarus777/opencode-censor@0.3.1` adds hybrid routing, project subdirectory support and bounded project queues, retaining opt-in stateful review and provider checks. Publication status is recorded in [verification](docs/VERIFICATION.md). The earlier unscoped `opencode-censor` package is deprecated: replace its configuration entry with `@cesarus777/opencode-censor@0.3.1` and do not load both packages. The plugin ID remains `opencode-censor`. See [verification](docs/VERIFICATION.md) for publication status, accepted dependency risks and deferred deployment checks.

## Install local source or a tarball

Requires Bun 1.3.11 or later for development, and the compatible OpenCode V2 host. Node 22 or later is supported for importing the compiled ESM package.

```sh
cd /absolute/path/to/opencode-censor
bun install --frozen-lockfile
bun run check
```

Use the **package directory** in your OpenCode config:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-censor",
      "options": {
        "model": { "providerID": "anthropic", "id": "MODEL_ID" },
      },
    },
  ],
  "permissions": [{ "action": "shell", "resource": "*", "effect": "ask" }],
}
```

The directory exports `dist/index.js`; run the build after editing source. OpenCode also accepts relative plugin directories and `file://` directory URLs.

To distribute a standalone archive:

```sh
bun run build
npm pack
npm install --prefix /path/to/plugins ./cesarus777-opencode-censor-0.3.1.tgz
```

Set `plugins[].package` to `/path/to/plugins/node_modules/@cesarus777/opencode-censor`. The installed package contains compiled JavaScript, declarations, license, documentation and examples; it does not require copying this repository into each project.

Version 0.3.1 implements the [development workflow plan](docs/DEVELOPMENT-WORKFLOW-PLAN.md): explicit hybrid review, project subdirectory working directories and bounded project review queues. Use [the development configuration](examples/opencode-development.jsonc) to select hybrid; the default remains stateless. See [verification](docs/VERIFICATION.md) for staging and public availability.

Hybrid routes an eligible closed-grammar inspection with matching complete source
and scanner resource to the existing stateless reviewer. It requires no project
file read. Other eligible commands use project evidence review. Both paths need a
fresh valid model decision; an inspection ask, error or timeout ends as ask and is
never retried through project review. `alwaysAsk` applies before routing. On the
hybrid inspection path, forbidding either `workspace_read` or `process_execution`
conservatively forces ask for every inspection, including `pwd`. Other effect
restrictions retain the existing inspection boundary and its trusted-host limits.
Hybrid requires `review.project.allowFileContents: true`; evidence scopes constrain
the project path, while inspection commands retain their documented grammar.
Explicit stateful review still requires full-file evidence even for inspections.

Native workdirs may be project subdirectories such as `packages/app`. The plugin
validates canonical containment and directory identities, rejects symlink components and native home-relative `~`/`~/…` spellings,
and rechecks the native workdir before allow. Evidence paths remain project-root-relative;
project prompts receive the actual relative workdir. Filesystem changes after the
final check remain possible. The original 2.2.5 scanner has been verified with
execution prevented; remote-provider and interactive-client acceptance remain separate.

## Configuration

Options are read once during setup from `ctx.options`. Reload the plugin after changing them. See [the complete example](examples/opencode.jsonc).

| Option                    | Default        | Contract                                                                                                                                    |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                 | `true`         | `false` delegates to OpenCode rules; a valid model configuration remains required                                                           |
| `model.providerID`        | required       | OpenCode provider ID, independent of the agent model                                                                                        |
| `model.id`                | required       | OpenCode model ID; no automatic fallback to another model                                                                                   |
| `mode`                    | `balanced`     | `strict`, `balanced`, or `permissive`                                                                                                       |
| `review.strategy`         | `stateless`    | `stateless` inspection, opt-in `stateful` project review, or `hybrid` routing; see [project options](docs/STATEFUL.md)                      |
| `systemPrompt`            | `""`           | Additional operator review instructions; at most 6000 characters; cannot override local policy                                              |
| `fallback`                | `ask`          | Only `ask` is supported                                                                                                                     |
| `timeoutMs`               | `15000`        | Integer 10–60000; covers source/directory checks, queue waiting, context, evidence, generation and rechecks together                        |
| `context.enabled`         | `false`        | Opt in to local extraction of task-intent labels                                                                                            |
| `context.maxMessages`     | `5`            | Inspect at most the last 1–20 returned context entries locally                                                                              |
| `context.maxCharacters`   | `6000`         | Scan at most 1–12000 characters of user text locally                                                                                        |
| `logging.enabled`         | `true`         | Write structured JSON audit records                                                                                                         |
| `logging.level`           | `info`         | `info`: all decisions; `error`: fallback records only                                                                                       |
| `logging.file`            | XDG state path | Absolute JSONL audit file path; defaults to `~/.local/state/opencode-censor/audit.jsonl` (or `$XDG_STATE_HOME/opencode-censor/audit.jsonl`) |
| `logging.includeCommands` | `true`         | Include the exact captured shell command; set `false` to omit command text                                                                  |
| `cache.enabled`           | `false`        | Only `false` supported; no cached or transferable approvals                                                                                 |

Unknown keys, bad types, invalid bounds, unsupported sensitive options, or a missing model install a fail-safe hook that changes in-scope decisions to `ask`. Invalid configuration emits fixed metadata without echoing supplied values. Check `event.message` or audit records for `invalid_configuration`. Explicit `deny` and other permission actions remain unchanged.

### Custom reviewer instructions

`mode` sets the caution level: `strict`, `balanced` (default), or `permissive`.
Add `systemPrompt` to the existing plugin options for extra review instructions:

```json
{
  "mode": "strict",
  "systemPrompt": "Treat uncertain intent as suspicious. Ask whenever repository inspection could disclose sensitive information. Require clear evidence before recommending allow."
}
```

Keep the required `model` option alongside these fields. `systemPrompt` defaults to
an empty string and accepts at most 6000 characters, without NUL characters.
It is sent to your reviewer provider; do not put secrets in it. Reload after edits.
The pinned SDK accepts one prompt string, so this option supplements the built-in
instructions rather than creating a separate provider system message. It cannot
expand the selected strategy's local command grammar, replace its JSON response
contract, or bypass source checks. Custom instructions can request greater caution; a prompt asking
for broader approvals cannot make unsupported commands eligible.

## Decision criteria and modes

Every automatic approval needs **both** a valid model decision and the independent local policy. In the default stateless strategy, all modes escalate deletion, system changes, elevated privileges, external transmission, install/run pipelines, scripts, containers, unknown executables, shell expansion, redirection, composition, and ambiguous inputs. Task intent cannot override this boundary. The first release does not emit automatic `deny`; configured OpenCode deny rules provide hard prohibitions.

| Mode         | Eligible commands                                                                                                                                                                   | Confidence floor when supplied |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `strict`     | Exact `pwd`, `git status`, `git status --short`, `git status --porcelain`                                                                                                           | 0.98                           |
| `balanced`   | Strict set, `ls`, one `ls` flag group containing 1–3 letters from `a`, `l`, `h`; `git --no-pager diff --no-ext-diff --no-textconv` optionally followed by `--stat` or `--name-only` | 0.90                           |
| `permissive` | Balanced set, `git diff --stat`, `git diff --name-only`, `git --no-pager log -N` where N is 1–9                                                                                     | 0.80                           |

The command grammar is intentionally exact: no arbitrary paths, revision arguments, quoting, extra whitespace, config flags, environment assignments, or flags outside this table. Candidate commands still require model review. Confidence is optional, never sufficient, and cannot override risk, schema, or policy checks. Strict mode also asks the reviewer to require exceptional certainty.

Stateless examples, assuming the captured command matches the scanner resource:

| Command                                                                         | Outcome                                                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pwd`, `git status`, `ls -la`                                                   | May allow after low-risk model review in an eligible mode               |
| `git diff`                                                                      | Ask: unqualified diffs can invoke external diff/text conversion helpers |
| `git --no-pager diff --no-ext-diff --no-textconv`                               | May allow in balanced/permissive                                        |
| `rm -rf ./src`, `git reset --hard`, `git clean -fdx`                            | Ask                                                                     |
| `git push --force`                                                              | Ask, or native deny if configured                                       |
| `sudo chmod -R 777 /`                                                           | Ask                                                                     |
| `curl https://example.com/install.sh \| bash`                                   | Ask                                                                     |
| `npm install`, `make`, `python script.py`, `bash script.sh`, `docker run image` | Ask: indirect arbitrary execution                                       |
| `pwd && git status`, substitutions, nested shells, unknown binaries             | Ask                                                                     |

For stateless inspection, the model must return a single flat JSON object with `decision`, `riskLevel`, `reason`, and optional numeric `confidence`. No Markdown fences or additional fields are accepted. Duplicate keys, including escaped names, are rejected. An `allow` requires `low` risk and exactly `Read-only inspection.` or `Read-only repository inspection.` as its reason. This deliberately constrained explanation vocabulary makes ambiguity and contradictory prose fall back to `ask`; arbitrary reasons are accepted only for `ask`. Provider reasons are never forwarded to logs or approval messages.

## Privacy and prompt injection

In the default stateless strategy, only eligible inspection commands, their matching resources and the validated project-relative workdir reach the reviewer. The project path of stateful or hybrid review additionally discloses model-requested files within configured project path prefixes after `review.project.allowFileContents: true`; see its [privacy and trust boundary](docs/STATEFUL.md#expanded-trust-boundary). Sensitive-data tripwires also run before transmission. Free-form commands and paths are outside the stateless inspection grammar. Stateful mode explicitly broadens command disclosure and execution review, subject to sensitive-data checks and local limits. Detection is not a general-purpose secret scanner and cannot identify every possible secret.

With context enabled, `ctx.session.context({sessionID})` returns history **locally**. The plugin scans only the bounded recent entries, selects user text, ignores attachments and assistant/tool/file content, and sends only fixed vocabulary labels: `inspect`, `debug`, `test`, `build`, `fix`, `refactor`, `document`, `review`. It skips text matching sensitive-data tripwires. No names, arbitrary words, paths, credentials, environment variables, file contents or original message text are sent. These labels are intentionally lossy; disable context to avoid even their disclosure. The SDK context endpoint currently has no pagination or size limit, so the local fetch may still be large even though scanning and provider input are bounded.

Instructions and JSON data are visibly separated. The current text API accepts a **single prompt string**, without an independent system-message or JSON-schema parameter; the prompt module cannot create a provider-enforced trust boundary. The stateless closed grammar, source correlation, strict response parsing, configured evidence boundaries, risk checks and fail-safe behavior are independent protections. Project-path semantic judgments remain delegated to the model. They reduce exposure without promising immunity to prompt injection or model mistakes.

## Timeouts, concurrency and lifecycle

Each evaluation owns its deadline and cancellation controller. Unload settles pending evaluations as `ask`, clears correlation state, and disposes registrations. Setup failure disposes registrations already acquired. Late results and late rejections cannot mutate a resolved permission event and do not create unhandled promise rejections.

The 2.2.5 Promise API types expose request cancellation, but the local Promise adapter ignores generation request options. We pass the signal for future compatibility and independently enforce the deadline. A timed-out request may continue consuming provider resources. At most eight active or still-unsettled review tasks are admitted per plugin instance; additional evaluations ask immediately. If all eight hang forever, reviews keep asking until reload. Project reviews wait FIFO per session, with at most 32 waiting requests globally and eight per session. Other sessions can use available slots. Queue overflow and expiry ask; expired waiters never start generation. Hung operations retain their slot and session lock until settlement. Inspection overload still asks immediately. Unload clears queues. There is no retry, coalescing, persistent storage or approval cache; native provider retry behavior remains controlled by OpenCode.

Correlation is keyed by session/message/call, capped at 256 entries, expires logically after 60 seconds, and is removed on tool completion or unload. Expired entries are pruned on subsequent tool calls. Expired or missing data always asks. Correlation state is temporary memory, not an approval cache.

## Audit and troubleshooting

Version 2 JSON audit records include selected `reviewPath` and `queueWaitMs`, alongside `schemaVersion`, effective `strategy`/`mode`, `stage`, `detailCode`, the initial `resourceCount`, and an always-present `reviewCalls` count (including zero). Validated confidence is recorded as `reviewerConfidence` when supplied. See [the audit field and diagnostic reference](docs/AUDIT.md). Records contain timestamp, `shell` action, final decision, risk, elapsed milliseconds, a fixed reason code, and fallback status. Validated replies also add `reviewerDecision` and `reviewerRiskLevel`, distinct from the final policy decision. Stateful reviews add model-call/evidence counts and a validated fixed `reviewerReasonCode`. Malformed replies produce `invalid_review_response`; provider/context failures produce `review_error`. Missing reviewer fields mean no validated reply is attached, not a model rejection. Records include the native `sessionID` and, by default, the exact captured `command`, including whitespace and newlines. If complete source is unavailable, `command` is omitted rather than reconstructed from scanner fragments. Set `logging.includeCommands: false` to omit commands, or `logging.enabled: false` to disable audit logging. Commands may contain secrets and private paths; redact audit files before sharing. Context, raw provider output and exception messages remain excluded. Invalid configuration omits commands and may write the session ID to stderr. Risk defaults to `medium` when unknown; a skipped high-risk command is not a complete risk assessment. The public SDK has no general plugin logger. Records go to a separate JSONL file. A file write failure cannot turn `ask` into `allow`, but can make counts incomplete. Invalid configuration falls back to stderr. Keep the file private and rotate/archive it as needed.

After starting OpenCode with this plugin, run `censor-stats` from a standalone installation, or `bun run stats` in this checkout after building. Pass a custom audit path as the first argument, for example `bun run stats /absolute/path/audit.jsonl`. The report shows automatic approvals divided by all audited shell evaluations, counts by reason/detail, and reviewer reach among evaluations with known call data. Legacy records without call data or a validated reviewer decision are reported as unknown, not skipped. `ask` means sent to native approval, not necessarily rejected; native configured denies, non-shell actions, and later human decisions are outside the count. Set `logging.level` to `info` for complete totals.

| Symptom                       | Check                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Every command asks            | Model ID/provider availability, exact command grammar, plugin order, `event.message`, SDK version and captured source               |
| `invalid configuration`       | Replace placeholder model, remove unknown options, keep caching disabled                                                            |
| `missing full command`        | Built-in `shell` input/source could not be correlated; custom tools and scanner-only evaluations deliberately ask                   |
| `review error`                | Provider unavailable, rate limit, context API failure, malformed/ambiguous output; inspect OpenCode provider diagnostics separately |
| `timeout` / `review capacity` | Provider latency or hung requests; adjust bounded timeout or reload after investigating                                             |
| No manual prompt appears      | Ensure an interactive OpenCode client is attached; unattended clients may reject asks                                               |
| A command unexpectedly runs   | Check global auto-approve, saved approvals, other plugins, actual permission path, and whether this plugin loaded successfully      |
| Plugin fails loading          | Rebuild local `dist`, inspect package exports/dependency installation, and use OpenCode 2.2.5                                       |

OpenCode's global auto-approve can settle `ask` without the intended human interaction. Do not use global auto-approve for this workflow. The plugin does not reply to already-created approval requests. The human's native approval/rejection remains the final manual decision; rejection does not run the command.

## Security boundaries and known limitations

LLMs can be wrong. This plugin is **not a sandbox** and cannot constrain a command after OpenCode permits it. See [SECURITY.md](SECURITY.md).

- Only actions that reach the native `shell` permission hook are covered. Direct terminals, unrelated MCP tools and arbitrary plugin code are outside scope.
- Host executables, shell startup files, environment, Git configuration, filesystem and other plugins must be trusted. Even inspection may invoke configured helpers (for example Git fsmonitor), write index metadata, or expose output to the working agent. Closed syntax does not prove absence of side effects in a hostile runtime.
- The plugin never verifies executable binaries or provides filesystem isolation. All paths validate canonical project-local workdirs and recheck directory identity. Project review inspects model-requested files within permitted scopes, rejects symlinked evidence paths and rechecks file hashes. Filesystem races during inspection and the final check/run interval remain host concerns.
- Other trusted plugins may mutate tool inputs or override a decision later. Put this gate after command-rewriting plugins, avoid conflicting permission hooks, and test your actual plugin combination. An explicit native configured deny is stronger than a plugin-generated ask.
- The reviewer shares OpenCode's process/provider infrastructure and may use the same vendor; independent model selection is not process isolation. Native generation hooks or provider diagnostics may observe prompts.
- Experimental generation contracts can change. Dependency and host compatibility are pinned and must be retested when upgraded. No V1 adapter is supplied.
- A plugin that fails to load cannot intercept anything. The broad native shell `ask` rule is an essential deployment fallback.

## Development, tests and release

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun test tests
bun run build
bun run test:package
```

`bun:test` provides deterministic TypeScript mocks, fake provider responses and bounded real timers without another runner dependency. Tests never execute the shell strings being reviewed. Integration tests load the real SDK entrypoint against a mocked host; they cover hook registration, source correlation, effects, provider failures, context filtering, explicit deny preservation, concurrency and cleanup. These are not live provider integration tests.

`test:package` creates an npm archive, installs it with npm and lifecycle scripts disabled into an isolated consumer, and imports the public export through Bun and Node. Installation may access the registry for dependencies. It requires subprocess execution and an available npm executable. Source maps/declarations are included; tests and probe code are not published. CI runs formatting, typecheck, tests, build and package validation.

Optional native host probe:

```sh
bun run build
OPENCODE_BIN=/absolute/path/to/opencode bun run test:live
```

This installs the npm archive into an isolated consumer and starts exactly OpenCode 2.2.5 with synthetic credentials and a controlled loopback HTTP provider. The test driver replaces the shell tool with permission assertions; no reviewed command is executed and no pending request is approved. It checks native source hooks, allow/ask/error/deny, tool completion, delayed and late replies, eight-request capacity, concurrent requests, reload, and the generic evidence loop with allow/ask/unavailable-file outcomes. It requires subprocess and loopback access. The native CI job pins Bun 1.3.11 and OpenCode 2.2.5 and needs no external provider credentials.

This command always uses the controlled loopback provider and consumes no remote-model allowance. The separate optional free-provider check below uses a remote service.

The separate original-scanner phase preserves the native shell tool, records the gate decision and forces native deny before process creation. Thirteen fixed fixtures cover exact inspections, flags, unsupported arguments, compounds, pipelines and subdirectory workdirs; see [the inspected hook order](docs/RESEARCH.md#original-225-scanner-and-pre-spawn-interception--2026-11-09). Real reviewer and interactive native-client acceptance remain mandatory; follow the [release checklist](docs/RELEASE-CHECKLIST.md) and record evidence in [verification](docs/VERIFICATION.md). Provider cancellation is limited by the pinned SDK adapter even when native permission waiting is bounded.

Source and non-sensitive bug reports: [cesarus777/opencode-censor](https://github.com/cesarus777/opencode-censor). Security reports must follow [SECURITY.md](SECURITY.md). Before publishing, complete or explicitly defer the checklist items, triage dependency advisories, confirm npm account access and inspect/install the final archive. Private reporting and deployment verification remain outstanding; the two moderate dependency advisories are explicitly accepted. `npm view` checks availability, not ownership. See [CHANGELOG.md](CHANGELOG.md) for release changes.

The build and test scripts do not stage or publish. The [staging workflow](.github/workflows/publish.yml) stages a verified archive when a stable version tag is pushed, or when manually run on `main` with the matching package version. It runs the full checks and native smoke, then inspects and installs the exact archive it stages with lifecycle scripts disabled. A maintainer must approve the staged package with 2FA on npm before it becomes public. For `0.3.1`, push tag `v0.3.1` or run the workflow manually on `main` with version `0.3.1`.

Before the first Actions publication, configure a GitHub Actions trusted publisher in the **scoped package's** npm Settings: owner `cesarus777`, repository `opencode-censor`, workflow filename `publish.yml`, and no environment name. A publisher configured for the old unscoped package does not transfer. Allow `npm stage publish` (enabled by default). The workflow uses Node 24, GitHub-hosted runners and OIDC; no `NPM_TOKEN` secret is needed. See [npm's trusted publishing instructions](https://docs.npmjs.com/trusted-publishers/).

For each release, update the package version, changelog and verification record, review outstanding dependency risks and deployment acceptance, and commit the release changes. Push the matching tag only when staging is intended; approve the staged package on npm to make it public. The scoped package starts at `0.1.0`; after its initial publication, use a new version for the next release. After npm approval, stable versions become available under `latest`; prerelease versions are rejected.

### Free-provider integration check

`bun run test:live:free` loads the installed archive into isolated OpenCode 2.2.5
and uses its built-in `opencode` provider for the reviewer. Select a model explicitly:

```sh
CENSOR_FREE_MODEL=YOUR_FREE_MODEL_ID OPENCODE_BIN=/absolute/path/to/opencode bun run test:live:free
```

Use Bun 1.3.11 or later on `PATH` (including for nested scripts) and build first.
The host catalog must report an enabled text model with explicit zero input,
output and cache prices in every pricing tier. Missing pricing, unavailable models
and paid models fail preflight; there is no model fallback. Catalog pricing is a
preflight check, not a billing guarantee. The check does not inherit account
credentials or personal host configuration. A model requiring authentication will
fail safely rather than use your saved account.

Only synthetic inspection input reaches the remote reviewer. A deterministic
loopback working model drives an inert replacement shell; reviewed commands never
execute and pending permissions are never answered. The suite checks missing
source, local policy ask, native deny, one real stateless reviewer decision and
reload cleanup. It reports fixed reason codes and exits unsuccessfully if the
reviewer cannot produce a valid automatic allow, including when a safe ask results
from provider errors, invalid JSON or timeout. The review deadline is 15 seconds;
a host watchdog stops the isolated process after two minutes. Native provider
retries and transport cancellation remain host controlled.

The **Free provider acceptance** GitHub workflow is manual and accepts a model ID.
It is separate from required deterministic CI. Free model availability changes;
model discovery and zero-price validation occur on each run. Stateful remote
review and interactive approval acceptance remain
separate from this check.
