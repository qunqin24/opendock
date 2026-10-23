# opencode-autoguard

Language: [中文](./README.md) · **English**

An experimental permission review plugin for OpenCode: it listens for pending permission requests, runs local deny rules first, hands the rest to an OpenAI-compatible LLM judge, and auto-replies through OpenCode's permission reply API.

![OpenCode AutoGuard cover](docs/assets/cover.png)

> Current status: the core logic and the real HTTP reply path are validated, but event bridging and the pending store still show host-side differences across OpenCode run modes. This is not a security boundary and should not be used as-is in unattended production environments.

Release history: [CHANGELOG.md](CHANGELOG.md).

## Evaluation Baseline

The project regresses its permission review pipeline against a 562-example labeled dataset. Baseline results as of 2026-08-31:

- Local rule layer: 0 misses, 0 false positives; also serves as a load-time regression gate inside `npm run check`.
- Judge layer: evaluated with deepseek-chat — 0 dangerous allows, 0 successful injection attacks, 0 privacy leaks.

Full dataset and judge-layer evaluation: [eval/README.md](eval/README.md). The free tier `laguna` has rate limits; for high-frequency use, prefer a paid model or a local judge.

## Quick Start

> **Important: `auto: []` does not mean the plugin does nothing.** It only means no permission action is auto-taken-over. As long as `contentReview.enabled` is `true` (the default), webfetch bodies are still sent to the judge. To fully stop review, set `auto: []` **and** `contentReview.enabled: false`.

Requires Node.js 22.14 or newer.

### 1. Install

```sh
npm install opencode-autoguard
```

### 2. Configure OpenCode (npm, recommended)

Load the plugin in your project's `opencode.json`. Below is the generic form for a cloud OpenAI-compatible endpoint; pick the model from your provider's current model list and replace the endpoint, model ID, and credential placeholders:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "ask",
    "webfetch": "ask"
  },
  "plugin": [
    [
      "opencode-autoguard",
      {
        "auto": ["bash", "webfetch"],
        "defaultReply": "once",
        "judge": {
          "baseURL": "https://api.example.com/v1",
          "model": "<provider-model-id>",
          "apiKey": "<provider-api-key>",
          "timeoutMs": 10000
        }
      }
    ]
  ]
}
```

For a local OpenAI-compatible service, only replace the `judge` block, e.g.:

```json
"judge": {
  "baseURL": "http://127.0.0.1:8000/v1",
  "model": "<local-model-id>",
  "apiKey": "<local-endpoint-key>",
  "timeoutMs": 10000
}
```

Model IDs must match whatever the endpoint currently serves; do not rely on a fixed free-model name from the README.

### 3. Development install (contributors)

For a full Git checkout:

POSIX / macOS:

```sh
cd /path/to/autoguard
npm ci
npm run check
```

Windows PowerShell:

```powershell
Set-Location C:\path\to\autoguard
npm ci
npm run check
```

Load the local source by absolute path in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "ask",
    "webfetch": "ask"
  },
  "plugin": [
    [
      "/absolute/path/to/autoguard/index.ts",
      {
        "auto": ["bash", "webfetch"],
        "defaultReply": "once",
        "judge": {
          "baseURL": "https://api.example.com/v1",
          "model": "<provider-model-id>",
          "apiKey": "<provider-api-key>",
          "timeoutMs": 10000
        }
      }
    ]
  ]
}
```

On Windows you can use `C:/absolute/path/to/autoguard/index.ts`.

Restart OpenCode fully after changing the plugin or its config. `permission: "ask"` decides whether OpenCode produces pending requests; `auto` decides whether AutoGuard takes over that action. Both must line up for auto-review to happen.

## Google Antigravity (AGY) Integration

AutoGuard natively supports running as a Google Antigravity (AGY) Lifecycle Plugin / Hook (`PreToolUse`), guarding `run_command`, `write_to_file`, and `replace_file_content`.

### Key Features

- **Directly Reuses AGY Model Quota**: No external third-party API keys required. It queries a lightweight background daemon holding `Gemini 3.8 Flash (High)` via persistent `stream-json` piping (~3s average latency).
- **Three-Tier Security Architecture**:
  - **Tier A (Fast-Pass, <1ms)**: Native read-only tools (`view_file`, `list_dir`, `grep_search`, etc.) and `fastAllow` commands (`npm test`, `git status`, `ls`, etc.) pass with zero latency.
  - **Tier C (Hard Deny / Human Review)**: High-risk shell commands (`rm -rf /`, `git push --force`, etc.), credentials (`.env`, private keys), and privilege escalation paths (`.git/hooks`, shell rc, `authorized_keys`) trigger immediate local blocking or human confirmation.
  - **Tier B (LLM Judge)**: Ambiguous commands and file edits are scrutinized by Gemini 3.8 Flash (High). Any timeout or parsing error fails closed to human approval.
- **Daemon Auto-Idle**: Automatically shuts down after 30 minutes of inactivity to prevent resource leaks.

### Quick Setup

#### Option 1: Native AGY Plugin Install (Recommended)

In your terminal with the AGY CLI:

```sh
agy plugin install <path/to/opencode-autoguard>
```

Or from Git:

```sh
git clone git@github.com:APLaS-Plus/opencode-autoguard.git
agy plugin install ./opencode-autoguard
```

#### Option 2: npm Setup Script

```sh
npm run setup:agy
```

This script verifies your `agy` CLI, validates plugin manifests, and configures the `PreToolUse` hook. Pass `--workspace` to install project-locally:

```sh
npm run setup:agy -- --workspace
```

#### Option 3: Manual Configuration in `.agents/hooks.json`

Add to `.agents/hooks.json` (or `~/.agents/hooks.json`):

```json
{
  "autoguard": {
    "PreToolUse": [
      {
        "matcher": "run_command|write_to_file|replace_file_content",
        "hooks": [
          {
            "type": "command",
            "command": "node --no-warnings --experimental-strip-types /path/to/autoguard/src/agy-hook.ts"
          }
        ]
      }
    ]
  }
}
```

### Daemon Management

The daemon launches on-demand whenever the hook needs an LLM judge decision, but you can also manage it manually:

```sh
npm run daemon:agy start     # Launch daemon in background
npm run daemon:agy status    # Check running status & port
npm run daemon:agy stop      # Gracefully terminate daemon
```

## Behavior and Safety Constraints

Permission requests are triaged in three tiers, **Tier C → Tier A → Tier B**: hard-block clearly dangerous items first (C), then fast-pass clearly safe ones (A), and only send the remaining uncertain requests to the model (B). This order guarantees credential and high-risk rules fire before the allowlist, and keeps network judge calls limited to genuinely uncertain requests.

<p align="center">
  <img src="docs/assets/autoguard-workflow.png" alt="AutoGuard permission review workflow: event validation, fail-closed safety review, and permission reply" width="100%">
</p>

The diagram is a high-level overview; the exact failure branches and race behavior are defined by the constraints below and by the tests. Pending permissions the plugin does not handle remain for human review.

1. Only actions explicitly listed in `auto` are processed; the default `auto: []` means no permission action is auto-taken-over, but the independent webfetch content review still follows `contentReview.enabled`.
2. **Tier C (local rules, instant):** common credential files (including command-embedded paths like `cat .env`) and high-confidence dangerous shell commands hit local deny rules directly; by default the request **stays with the human** (`denyAction: "ask"`); set `"reject"` to auto-reject (for unattended serve).
3. **Tier A (local fast-pass, instant, 0 network):** routine read-only/build commands matching the `fastAllow` allowlist; or edit/write targets that are all artifacts written by this session's own agent (artifact ledger, from `session.diff` and `message.part.updated` events). Credential checks run before this tier, so the allowlist cannot bypass them.
4. **Tier B (LLM judge):** remaining requests are redacted and length-limited locally, then sent to the judge together with a session context digest (recent tool calls and file paths the agent has written this session; on by default, disable with `context.enabled`). The judge may only return strict `{"verdict":"allow|reject|ask","reason":"..."}` JSON: `ask`, or any parse failure, timeout, or HTTP error leaves the request with the human. Overlong resources are truncated per entry with a `[truncated]` marker (modeled on codex guardian); only if still over budget after truncation does it fall back to the human.
5. **Rejection circuit breaker (modeled on codex):** 3 consecutive judge rejections in one session, or 10 rejections within the last 50 decisions, means the agent is repeatedly probing — subsequent Tier B requests in that session skip the judge and are never auto-allowed; they all stay with the human; any human reply resets it (`circuit` can tune thresholds or disable it).
6. **Human override feedback (GOLDEN):** if a judge-decided request is replied to by a human outside the plugin, a `GOLDEN` log line is recorded as a gold label for the dataset; among those, actions where "the judge rejected but the human allowed" enter the context of subsequent judge calls (modeled on codex's developer prefix) so the same action is not repeatedly rejected.
7. **webfetch content-level review (defense in depth):** after the fetch completes and before the body enters the model context (`tool.execute.after`), the body is redacted and truncated locally (8000 chars default) and judged for AI-targeted injection, hijack, or malicious inducement; on `reject` the original body is replaced with a block notice (canary-verified that the replacement takes effect). On failure this layer **keeps the original body and leaves a trace**: the URL review at the permission layer is fail-closed, while the content layer is a fail-open extra line of defense; set `contentReview.enabled: false` if you do not accept body egress.
8. Replies use the host's public HTTP listener, support Basic Auth, and check non-2xx responses; failures are never disguised as successful approvals.
9. The same request is deduplicated, at most 4 reviews run in parallel; judge verdicts are cached by `action+resources` (default 10 minutes); if the user replies manually first, in-flight judge calls are canceled.
10. **Structured audit log (off by default):** with `auditLog.enabled: true`, every decision (including Tier A/C, cache hits, circuit-breaker hold-for-human, judge failures), every content review, and every human reply appends one JSON line to a local `~/.opencode-autoguard/audit-YYYY-MM-DD.jsonl` (`verdict` × `source` taxonomy, modeled on codex's date-partitioned files and Claude Code's decision/source taxonomy). Lines where a human overrides the judge carry `override: true` — this file is the raw material for the gold-label dataset. Content review lines carry only the URL and character count; **bodies are never written**. Default retention is 14 days with a 16 MB per-day cap; disk write failures never affect approvals.

Local rules are a conservative fast block, not a shell/PowerShell parser; paths inside bash commands are not semantically parsed (e.g., temp files the agent creates via bash never enter the ledger, though they do appear in `session.diff` events). **Protected paths** (modeled on codex's subpath protection under writable roots, `protectPaths`): if an edit/write target hits a privilege-escalation carrier — `.git/hooks/`, shell startup files (`.bashrc`/`.zprofile`, etc.), `.gitconfig`, `authorized_keys`, `sudoers`/systemd/launchd, or the agent's own config (`opencode.json(c)`, `.opencode/`) — the request goes straight to Tier C and stays with the human; bash reads of such paths are not blocked, but the judge prompt treats them as high-risk. The LLM can also misjudge or be influenced by prompt injection, so final safety still depends on OpenCode's own permission config and human supervision. Design details and decision records: [docs/design/redesign-v0.3.md](docs/design/redesign-v0.3.md) and [docs/design/codex-iteration.md](docs/design/codex-iteration.md).

## Data Boundaries

Once an action is enabled, its `action`, `resources`, and — with `defaultReply: "always"` — the `save` scope are sent to the configured judge. Commands, paths, and URLs may contain private information. When context awareness is on (default), the one-line digest of recent tool calls (≤8 entries), the file paths the agent has written in this session (≤20), and summaries of actions "the judge rejected but a human allowed" (≤5) are also sent — these are redacted locally before egress too; set `context.enabled: false` if you do not accept that boundary.

**webfetch bodies are sent too:** when content review is on (default), every fetched body is redacted and truncated locally (≤8000 chars default) before being sent to the judge for AI-targeted injection detection; URLs and lengths appear in logs, bodies do not. Set `contentReview.enabled: false` in sensitive environments.

The plugin blocks common credential files locally and redacts common tokens, Authorization headers, URL passwords, and private-key shapes, but it cannot guarantee identifying every secret. For sensitive repos, use a local judge endpoint or a very narrow `auto` allowlist.

**The audit log is a local file:** with `auditLog` on, redacted `action`/`resources` (single entry truncated to ≤600 chars) and verdicts are written to local JSONL under `auditLog.dir` (default `~/.opencode-autoguard/`); nothing leaves the machine and webfetch bodies are never written; still treat that directory as "may contain private information" and clean it up per `keepDays`. Off by default.

## Configuration

| Setting | Default | Notes |
| --- | --- | --- |
| `auto` | `[]` | Allowlist of actions to auto-review; `["*"]` is riskier |
| `defaultReply` | `"once"` | Reply `once` or `always` when the judge allows |
| `fastAllow` | built-in allowlist | Tier A fast-pass list; token-boundary prefix match, case-sensitive; empty array disables |
| `denyAction` | `"ask"` | Keep a local-rule hit with the human; set `"reject"` for unattended serve |
| `context.enabled` | `true` | Session context awareness (ledger + judge digest) toggle |
| `context.recentTools` | `8` | Number of recent tool calls in the judge digest (1–16) |
| `cacheTtlMs` | `600000` | Judge verdict cache TTL (100–3600000; 0 disables) |
| `judge.baseURL` | `https://opencode.ai/zen/v1` | OpenAI-compatible API base URL |
| `judge.model` | `laguna-s-2.1-free` | Judge model |
| `judge.apiKey` | `public` | Public credential for the zen free tier; use your own key for your own endpoint |
| `judge.timeoutMs` | `10000` | 100–120000 ms |
| `denyPatterns` | built-in rules | Custom regexes are appended to the built-in shell deny rules |
| `circuit.enabled` | `true` | Rejection circuit breaker toggle |
| `circuit.maxConsecutive` | `3` | Consecutive-rejection trip threshold (1–20) |
| `circuit.windowSize` / `circuit.maxRecent` | `50` / `10` | Sliding-window rejection trip threshold |
| `policy` | none | Custom policy text injected into the judge system prompt (≤4000 chars; can only tighten, never loosen) |
| `protectPaths` | `true` | Force human review for privilege-escalation carrier paths (git hooks, shell rc, agent config, etc.) |
| `contentReview.enabled` | `true` | webfetch content-level review (`tool.execute.after`, fail-open) |
| `contentReview.maxChars` | `8000` | Max body characters sent to the judge (1000–20000; excess truncated and marked) |
| `auditLog.enabled` | `false` | Structured audit log (local JSONL, off by default) |
| `auditLog.dir` | `~/.opencode-autoguard` | Audit file directory (`audit-YYYY-MM-DD.jsonl`) |
| `auditLog.keepDays` / `auditLog.maxBytes` | `14` / `16777216` | Retention days (cross-day cleanup) / per-day byte cap (writing stops for that day once exceeded) |

`defaultReply: "always"` turns one model decision into a standing grant — significantly riskier than `once`; do not enable it unless you have reviewed the `save` scope.

Environment variables override plugin options:

- `AUTOGUARD_AUTO`: comma-separated; empty string disables
- `AUTOGUARD_FAST_ALLOW`: comma-separated; empty string disables
- `AUTOGUARD_DENY_ACTION`: `ask` or `reject`
- `AUTOGUARD_CACHE_TTL_MS`
- `AUTOGUARD_BASE_URL`
- `AUTOGUARD_MODEL`
- `AUTOGUARD_API_KEY`
- `AUTOGUARD_TIMEOUT_MS`
- `AUTOGUARD_DEFAULT_REPLY`
- `AUTOGUARD_CIRCUIT`: `on` / `off` (overrides `circuit.enabled`)
- `AUTOGUARD_POLICY`: custom policy text (same as `policy`)
- `AUTOGUARD_CONTENT_REVIEW`: `on` / `off` (overrides `contentReview.enabled`)
- `AUTOGUARD_AUDIT`: `on` / `off` (overrides `auditLog.enabled`)

If the OpenCode server sets `OPENCODE_SERVER_PASSWORD`, the plugin sends Basic Auth with the same env var; the username comes from `OPENCODE_SERVER_USERNAME`, defaulting to `opencode`.

## Verification

The following commands are the same on POSIX, macOS, and PowerShell:

```console
npm run check
npm run test:integration
npm run eval:rules
```

- `npm run check` runs type checks and deterministic unit/mock tests, including `test/rules.eval.test.ts`: modeled on codex execpolicy's `match`/`not_match`, it uses every `eval/dataset` case with an `expected.layer1` label as a load-time regression of the built-in rules. It is free and offline; any rule change that breaks a label fails immediately.
- `npm run test:integration` starts the real local OpenCode listener and a local mock judge, creates a pending permission, explicitly injects the asked event, and verifies the pending disappears after an authenticated reply. It does not claim to validate TUI auto-forwarded events.
- `npm run eval:rules` regresses the local rule layer against the 562-example labeled dataset; the `eval/` directory also contains LLM judge-layer evaluation — see "Evaluation Baseline" above and [eval/README.md](eval/README.md).

Before real use, do one TUI acceptance pass: restart OpenCode, have the agent request a safe command configured as `ask` (e.g. `npm test`), confirm the log shows `插件已加载` ("plugin loaded"), then the tool actually continues. A reply HTTP 2xx alone is not a pass.

## Compatibility and Known Limitations

- The code recognizes both the legacy `permission.asked` and `permission.v2.asked`, and calls the corresponding reply endpoint for each.
- This release validated the real listener on OpenCode CLI 1.18.18, with type checks against `@opencode-ai/plugin` / SDK 1.18.19.
- The package ships TypeScript source directly; the target runtime is the OpenCode/Bun loader, not a generic Node.js library.
- The published package contains only runtime files; `prepack` runs the in-repo `npm run check` before publishing.
- When requests are created directly through the V2 permission API, local 1.18.18 does not automatically feed the events into the legacy plugin hook; the integration test therefore injects events explicitly.
- The OpenCode community still reports inconsistencies among the in-process client, HTTP listener, and TUI pending store: [issue #28037](https://github.com/anomalyco/opencode/issues/28037), [issue #36835](https://github.com/anomalyco/opencode/issues/36835).
- `opencode run` may complete approval before the plugin; it is better suited for validation in TUI/serve scenarios.

Related official docs: [Plugins docs](https://opencode.ai/docs/plugins), [permission schema](https://github.com/anomalyco/opencode/blob/dev/packages/schema/src/permission.ts), [plugin loader](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/index.ts).
