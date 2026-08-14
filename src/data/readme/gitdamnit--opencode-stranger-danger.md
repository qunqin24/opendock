![strangerDanger logo](./strangerdanger2.jpeg)

# @gitdamnit/stranger-danger

Secret and PII redaction guard for AI coding agents.

[![npm version](https://img.shields.io/npm/v/@gitdamnit/stranger-danger.svg)](https://www.npmjs.com/package/@gitdamnit/stranger-danger)
[![license](https://img.shields.io/npm/l/@gitdamnit/stranger-danger.svg)](LICENSE)
[![node](https://img.shields.io/node/v/@gitdamnit/stranger-danger.svg)](https://nodejs.org)

## The Problem

Every secret scanner checks your files. None check what goes into the LLM's context window. A secret can be clean in your repo and still get sent to a cloud API inside a prompt, checkpoint, or shell summary. strangerDanger operates at three layers to catch what others miss.

## How It Works — Three Layers of Protection

- **Layer 1: File-level (before reads)** — Intercepts file reads, redacts secrets in-place before the agent sees them.
- **Layer 2: Context-level (before compaction)** — Scans everything injected into the LLM context during session compaction. Also scans outbound user messages.
- **Layer 3: Output-level (after tool execution)** — Scans tool outputs before they're written to disk.

## Installation

### OpenCode Plugin

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@gitdamnit/stranger-danger"]
}
```

### Standalone CLI

```bash
npm install -g @gitdamnit/stranger-danger
```

### Use with envsitter-guard

strangerDanger and [envsitter-guard](https://github.com/boxpositron/envsitter-guard) are complementary:
- envsitter-guard blocks `.env*` file reads entirely
- strangerDanger scans everything else and protects the context window

Use both for complete coverage.

## Quick Start

### Plugin

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@gitdamnit/stranger-danger"]
}
```

### CLI

```bash
sd scan .                    # Scan current directory
sd scan src/config.ts        # Scan a single file
sd scan - < file.txt         # Scan stdin
sd redact src/config.ts      # Redact secrets in-place (creates .backup)
sd audit                     # Show audit log
sd rules                     # List all active rules
```

## Detection Rules

- ~160 rules vendored from gitleaks (MIT)
- ~12 clean-room additions for AI/ML providers (Groq, DeepSeek, Replicate, ElevenLabs, etc.)
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
- `sd_allowlist_add` — Add allowlist entry
- `sd_allowlist_show` — Show current allowlist
- `sd_scan` — Manually scan content

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

Entry types: `fingerprint`, `ruleId`, `path`, `regex`.

## Audit Log

Location: `.opencode/state/strangerdanger-audit.jsonl`

Format: one JSON line per finding. Logs fingerprint, rule ID, timestamp, and source. **Never logs the actual secret value.**

## Architecture

```
src/engine/     → Core detection engine (zero OpenCode deps)
src/plugin/     → OpenCode plugin hooks
src/cli/        → Standalone CLI (sd binary)
```

Zero runtime dependencies beyond `@opencode-ai/plugin`. Node.js built-ins only.

## Development

```bash
npm install          # Install dependencies
npm run build:rules  # Compile gitleaks TOML → TypeScript
npm run build        # Build all TypeScript
npm run typecheck    # Type check
npm test             # Run tests
```

### Adding New Rules

Edit `scripts/compile-rules.ts` to add clean-room rules. The gitleaks TOML is compiled automatically at build time.

## Attribution

- **gitleaks/gitleaks** (MIT) — Secret detection rules vendored from `config/gitleaks.toml`. https://github.com/gitleaks/gitleaks
- **Yelp/detect-secrets** (Apache-2.0) — Shannon entropy detection approach referenced for high-entropy string detectors. Clean-room TypeScript implementation. https://github.com/Yelp/detect-secrets
- **boxpositron/envsitter-guard** (MIT) — Complementary plugin. strangerDanger coordinates with envsitter-guard to avoid duplicating `.env*` file blocking. https://github.com/boxpositron/envsitter-guard

## License

MIT. See LICENSE.
