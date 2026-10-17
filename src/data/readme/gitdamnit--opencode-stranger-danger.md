![strangerDanger logo](./strangerdanger2.jpeg)

# @gitdamnit/stranger-danger

Secret and PII redaction guard for AI coding agents.

[![npm version](https://img.shields.io/npm/v/@gitdamnit/stranger-danger.svg)](https://www.npmjs.com/package/@gitdamnit/stranger-danger)
[![license](https://img.shields.io/npm/l/@gitdamnit/stranger-danger.svg)](LICENSE)
[![node](https://img.shields.io/node/v/@gitdamnit/stranger-danger.svg)](https://nodejs.org)

## The Problem

Every secret scanner checks your files. None check what goes into the LLM's context window. A secret can be clean in your repo and still get sent to a cloud API inside a prompt, checkpoint, or shell summary. strangerDanger operates at the OpenCode V2 request boundaries to catch what others miss.

## How It Works — Protection at the V2 boundaries

strangerDanger registers only documented V2 hooks. Reading a file never rewrites it.

| Boundary | Hook | What it protects |
| --- | --- | --- |
| Incoming prompt | `session.prompt` | User prompts, before durable admission |
| Tool results | `tool.execute.after` | `read`/`bash`/`grep`/`fetch` output before it reaches the model |
| Agent-loop request | `session.context` | System instructions, messages, tool-call inputs, tool results |
| Transient generation | `session.generate` | `ctx.session.generate` requests (not part of the agent loop) |
| Title generation | `session.title` | Title requests, plus a plugin-supplied title `result` |
| Checkpoint compaction | `session.compaction` | The transcript being summarized, plus a plugin-provided summary |
| File inspection | `tool.execute.before` | Read-only detection + audit; **never writes to disk** |
| Event stream | `event.subscribe` | Detection/audit only (observational, post-admission; cannot prevent transmission) |

The four `session.*` model-request hooks are separate V2 request kinds. Registering all
four is what makes redaction ordering-independent: whatever path a request takes, its
assembled system prompt and messages are re-scanned immediately before dispatch.

All outgoing content is scanned with a **bounded, chunk-safe** scanner: large
outputs are fully covered (secrets that straddle a window boundary are still
found), and content that cannot be inspected fails **closed** with an explicit
marker instead of leaking.

## Installation

### OpenCode V2 plugin

Add to your `opencode.jsonc` (`plugins`, not the V1 `plugin` key):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@gitdamnit/stranger-danger"]
}
```

> **0.2.0 is not yet on npm.** Until it is published, install it from the
> repository or a local checkout — see
> [Loading from a directory or a checkout](#loading-from-a-directory-or-a-checkout)
> below. The `plugins` entry above resolves once the package is published.

The plugin requires the V2 runtime and `@opencode/plugin` (peer dependency).

#### Loading from a directory or a checkout

OpenCode resolves a plugin **directory** to `<directory>/index.{ts,js}` and does
**not** consult `main` or `exports`. That is why this package ships a root
`index.js` in addition to `dist/`: it makes `{ "package": "/path/to/plugin" }`
and `"./plugins/stranger-danger"` entries load correctly. A published npm
package (the form above) resolves through `exports` as usual.

If a plugin path is misconfigured, OpenCode logs `Plugin entrypoint not found`
and the plugin does **not** load — the session runs unprotected. After install,
confirm the plugin is active:

```bash
# in an OpenCode session
> call the sd_status tool
```

`sd_status` reports the version, rule count, and the project audit-log path. If it
is unavailable, the plugin did not load.

### Standalone CLI

```bash
npm install -g @gitdamnit/stranger-danger   # once published to npm
```

### Use with envsitter-guard

strangerDanger and [envsitter-guard](https://github.com/boxpositron/envsitter-guard) are complementary:
- envsitter-guard blocks `.env*` file reads entirely
- strangerDanger scans everything else and protects the model context

## Quick Start

### CLI

```bash
sd scan .                    # Scan current directory
sd scan src/config.ts        # Scan a single file
sd scan - < file.txt         # Scan stdin
sd scan . --json             # Machine-readable output (never contains raw secrets)

sd redact src/config.ts                  # Atomic in-place redaction, no plaintext backup
sd redact src/config.ts --backup         # Keep a 0600 backup outside the working tree
sd redact src/config.ts --backup-dir ~/bak

sd audit                     # Show audit log (no raw secrets)
sd rules                     # List all active rules
sd version
```

Every `scan`/`sd_scan` result reports **safe metadata only** — rule ID,
description, source, line/column, fingerprint, and the redaction token. Raw
matched secrets are never printed, logged, or written to the audit log.

## Detection Rules

- 221 rules vendored from gitleaks (MIT), translated to valid JavaScript regex
- 12 clean-room additions for AI/ML providers (Groq, DeepSeek, Replicate, ElevenLabs, W&B, LangSmith, LangFuse, Supabase, Vercel, and DB connection strings)
- 3 entropy-based detectors (Base64, Hex, Alphanumeric)

### Key Providers Covered

| Category | Providers |
|----------|-----------|
| Cloud | AWS, GCP, Azure, Alibaba, DigitalOcean, Heroku, Cloudflare |
| AI/ML | OpenAI, Anthropic, Groq, DeepSeek, Cohere, HuggingFace, Replicate, ElevenLabs |
| Version Control | GitHub, GitLab, Bitbucket |
| Communication | Slack, Discord, Telegram, Twilio, SendGrid, Mailgun |
| Payment | Stripe, Square, PayPal, Coinbase, Plaid |
| Databases | MongoDB, PostgreSQL, Redis (connection strings) |
| Generic | Private keys, JWTs, high-entropy strings |

## OpenCode Plugin Tools

- `sd_status` — Show rule count, findings, audit log path
- `sd_audit` — Show audit log with timestamps and rule IDs
- `sd_allowlist_add` — Add allowlist entry (also available as `sd allowlist add`)
- `sd_allowlist_show` — Show current allowlist
- `sd_scan` — Manually scan content (secret-free output)

## Allowlist

Create `.strangerdanger-allowlist.toml` in your project root:

```toml
[[entries]]
description = "Known test key"
fingerprint = "a3f7b2c1"

[[entries]]
description = "Ignore generic-api-key in test files"
ruleId = "generic-api-key"
path = "test/"
```

Entry types: `fingerprint`, `ruleId`, `path`, `regex`. Invalid regexes are
rejected on write and skipped on read.

## Audit Log

Location: `<project>/.opencode/state/strangerdanger-audit.jsonl` (project- and
session-scoped; ignored by Git).

- One JSON object per line; records rule ID, description, source, fingerprint,
  optional session ID and file path. **Never stores the secret value.**
- Written with `O_APPEND` so concurrent writers interleave whole records.
- Files are `0600`; the containing directory is `0700`.
- Grows to 10 MB, then rotates to `.1`, `.2`, `.3` (records are renamed, never
  truncated away).

## Security guarantees and known limitations

This section is the security contract. To report a vulnerability, see
[SECURITY.md](SECURITY.md).

Verified against OpenCode `2.0.21` / `@opencode/plugin` `2.0.29` on the real
runtime (isolated server, disposable project, loopback mock provider): a
synthetic secret in a prompt is transmitted by a control run and is **absent**
with the plugin loaded, while a redaction token and a secret-free audit record
are present.

Guaranteed:

- Reading a file through the plugin **never modifies it** on disk.
- Prompts, tool results, the agent-loop request (`session.context`), transient
  `session.generate` requests, title requests, and compaction transcripts are
  redacted before transmission on the supported request path.
- No raw secret is emitted by the CLI, the plugin tools, or the audit log.
- `sd redact` writes atomically and creates **no** plaintext backup unless you
  explicitly ask for one.
- Hook callbacks never throw: a malformed or unexpected event cannot break the
  runtime or a companion plugin.

Not covered (documented, by design):

- **Provider-native WebSocket traffic.** OpenCode exposes experimental
  `experimental.ws.handshake` / `experimental.ws.send` / `experimental.ws.receive`
  hooks, but this plugin does **not** register them. Providers that stream over a
  WebSocket are not inspected. Plain-HTTP providers, and the HTTP fallback of a
  WebSocket route, are covered by the `session.*` hooks.
- **Raw HTTP bodies.** This plugin edits assembled messages, not `http.request`
  bodies. Any content a provider layer adds to a request that is not derived from
  `system`/`messages` is not scanned. `event.subscribe` is observation only
  (post-admission) and cannot prevent disclosure.
- **Structured values.** String leaves of plain objects/arrays are redacted.
  Exotic objects (anything whose prototype is not `Object.prototype`/`null`, e.g.
  `Map`, `Set`, `Date`, typed arrays) are passed through unchanged to avoid
  corrupting non-plain data; content inside them is not inspected. Nesting deeper
  than 32 levels, and cyclic structures, fail **closed** with an explicit marker
  rather than being silently passed.
- **Encoded secrets.** Detection is pattern-based. Base64-encoded or otherwise
  obfuscated secrets that do not match a rule are not detected by that rule (the
  high-entropy detectors may still flag them).

Size limits (all fail closed rather than truncating):

| Surface | Limit | Behavior past the limit |
| --- | --- | --- |
| Bounded scanner (hooks, CLI) | 256 MiB (characters) | whole input replaced by the fail-closed marker |
| Per scan window | 1 MiB, 64 KiB overlap, 2.5 s budget | window timeout/error fails the scan closed |
| Event-stream text | 200,000 chars per field | field skipped |
| File pre-read inspection (`execute.before`) | 10 MiB | skipped; result/context hooks still cover it |
| `sd_scan` tool input | 8 MiB (characters) | refused with a message |


## Independence & interoperability

Stranger Danger is a self-contained security inspector. It is being developed
alongside two other independent OpenCode V2 plugins (Git That Shit and
Checkpoint Orchestrator) but **requires neither**, and neither requires it.

### Responsibilities

- Inspect tool calls/arguments and model traffic for secrets and unsafe content.
- Detect risks and report them through its own tools and audit log.
- Own its security policy and audit records. Nothing else.
- Its pre-execution hook is **read-only** and never mutates tool arguments.

### Independence guarantees

- **Works alone.** No companion plugin is needed to start or operate. There are
  no cross-plugin imports, no shared database, and no shared configuration.
- **No required order.** Correctness never depends on another plugin running
  before or after. The `execute.before` hook is read-only, and the `session.*`
  model-request hooks (`context`, `generate`, `title`, `compaction`) re-scan the
  fully assembled request, so even if a companion rewrites a tool result after
  this plugin's `execute.after` hook, the secret is still removed before the
  model request.
- **Failure isolation.** Every hook callback is wrapped so that a malformed or
  unexpected event can never throw out of the hook. A broken companion, a
  missing optional interface, or a bad event cannot cascade into this plugin or
  the runtime, and this plugin cannot cascade into others.
- **Namespaced surface.** All tools use the `sd_` prefix; the plugin id is
  `gitdamnit.stranger-danger`; storage and config are namespaced (below).
- **Session isolation.** Each plugin instance captures its own project-scoped
  audit path in a closure and passes it explicitly to every write. There is no
  shared mutable process-global audit state, so concurrent sessions/projects in
  one server never mix records. Audit entries carry a session ID when available.

### Hooks registered

| Hook | Mutates? | Purpose |
| --- | --- | --- |
| `tool.execute.before` | no (read-only) | Detect/audit secrets in files about to be read |
| `tool.execute.after` | redacts tool result text/output/metadata | Keep secrets out of the model context |
| `session.prompt` | redacts prompt text | Pre-admission prompt protection |
| `session.context` | redacts system + messages | Ordering-independent agent-loop backstop |
| `session.generate` | redacts system + messages | Transient generation requests |
| `session.title` | redacts system + messages + `result` | Title generation |
| `session.compaction` | redacts transcript/summary | Prevent secret propagation into checkpoints |
| `event.subscribe` | no | Detection/audit only (observational) |

### Configuration namespace

- No required options. Unknown/companion options are ignored.
- Optional allowlist: `.strangerdanger-allowlist.toml` in the project root.
- Loaded via the standard V2 `plugins` entry; no global configuration is written.

### Owned storage

- Audit log: `<project>/.opencode/state/strangerdanger-audit.jsonl`
  (git-ignored, `0600`; rotations `.1`/`.2`/`.3`). This plugin writes nowhere else.
- It never writes into another plugin's storage and never reads a live companion
  database.

### Optional interoperability (read-only, versioned)

The only interop surface is the semver-versioned, read-only engine export:

```js
import { scan, redact, scanAndRedact, scanAndRedactBounded, toSafeFinding }
  from "@gitdamnit/stranger-danger/engine";
```

A companion plugin or the Docker Plugin Test Lab may call these to sanitize or
inspect text. They are pure functions over strings with no shared state, no I/O
beyond the project allowlist, and no dependency on this plugin being loaded. No
integration is implemented that requires a companion to be present.

### Compatible OpenCode V2 versions

Targets the V2 runtime and `@opencode/plugin >= 2.0.0` (tested against
`@opencode/plugin@2.0.29` and OpenCode `2.0.21`).

Note on plugin resolution: OpenCode distinguishes **package** entries (resolved
through `exports`/`main`) from **directory** entries (resolved to
`<directory>/index.{ts,js}`). This package ships a root `index.js` so both forms
load. The local plugin directory is *not* watched recursively — only the resolved
entrypoint and its imports are.

## Architecture

```
src/engine/     → Core detection engine (zero OpenCode deps)
src/plugin/     → OpenCode V2 plugin (hooks, transforms, tools)
src/cli/        → Standalone CLI (sd binary)
scripts/        → Rule compiler, package validation
```

The detection engine is decoupled from OpenCode: the standalone `sd` binary and
the plugin share `src/engine` and nothing else. Runtime dependency on
`@opencode/plugin` is a peer dependency, loaded only when the plugin entry is
imported.

## Development

```bash
npm install          # Install dependencies
npm run build:rules  # Compile gitleaks TOML → TypeScript
npm run typecheck    # Type check
npm run lint         # Lint
npm run build        # Build
npm test             # Full test suite
npm run test:security
npm run verify:package   # Pack, install into a temp dir, exercise the artifact
```

### Adding New Rules

Edit `scripts/compile-rules.ts` to add clean-room rules. The gitleaks TOML is
compiled automatically at build time; RE2/Pcre constructs (`(?i:…)`, `(?-i:…)`,
`(?s:…)`, POSIX classes, `\z`) are translated to plain JavaScript regex.

## Attribution

- **gitleaks/gitleaks** (MIT) — Secret detection rules vendored from `config/gitleaks.toml`. https://github.com/gitleaks/gitleaks
- **Yelp/detect-secrets** (Apache-2.0) — Shannon entropy detection approach referenced for high-entropy string detectors. Clean-room TypeScript implementation. https://github.com/Yelp/detect-secrets
- **boxpositron/envsitter-guard** (MIT) — Complementary plugin. https://github.com/boxpositron/envsitter-guard

## License

MIT. See LICENSE.
