<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./icon.svg">
  <img alt="leakshield" src="./icon.svg" width="64">
</picture>

# leakshield

> 🌐 English | [繁體中文](./README.zh-TW.md)

**A gatekeeper that scans for sensitive content before you feed code, documents, or data to AI services.**

Three supported modes:
- **OpenCode Plugin**: The enforced ingress gate for OpenCode. Use this when OpenCode sends content to a model.
- **CLI**: Manual or CI scanning of text, files, and directories; supports redaction.
- **Web UI**: Local browser interface and REST endpoint for manual scanning.

MCP server mode has been removed. It depended on the model voluntarily calling a scan tool after it had already received the relevant context, so it cannot provide the plugin's security boundary.

| Mode | Start it with | Use it for |
|------|---------------|------------|
| OpenCode Plugin | Add the `leakshield` package or the `dist` directory to `opencode.json` (OpenCode v2) | Automatic, fail-closed protection for OpenCode model inputs and tool outputs |
| CLI | `npm run scan -- --file ./path` (or `leakshield --file ./path` after a global install / `npm link`) | Explicit local or CI scans; it never sends content to a model |
| Web UI | `npm run web` | Manual browser scans at `http://localhost:3000` |

## Project status

**Experimental, `0.x`.** Published to npm as `leakshield`: run `npx leakshield --help` to see the commands, or build locally (`npm ci && npm run build`) and point OpenCode at the `dist` directory. Without arguments or input, the CLI waits on stdin.

- Transparent mode has been verified on OpenCode v2.0.28 with local loopback providers, and once against a real OpenAI model. The 0.3.0 tool restoration was rechecked on OpenCode v2.2.5 with a loopback provider, the OpenChamber render tool and `rtk` ([record](docs/evidence/2026-11-06-opencode-2.2.5-tool-restoration.md)). It is **not** a guarantee that nothing sensitive reaches a model: the recommended hook-first setup is reported as `PARTIAL` by `--doctor`, and content added after the plugin's hooks or sent by permitted tools (curl, remote MCP) is outside its coverage.
- Claude Code is supported through a local proxy (`leakshield --claude-code-proxy`, then `ANTHROPIC_BASE_URL`), verified with Claude Code 2.1.321 against a loopback stub upstream ([record](docs/evidence/2026-11-21-claude-code-proxy.md)). It masks model requests and restores assistant text, but does not restore placeholders at tool execution yet: see [Claude Code](docs/claude-code.md).
- Not yet verified: OS-keychain custody on Windows and Linux (macOS verified 2026-10-20), a real Anthropic provider, long histories on other providers, long-running use ([#26](https://github.com/jwcrystal/leakshield/issues/26)).
- Defaults may still change during `0.x`; see the [changelog](CHANGELOG.md).
- Verification records: [docs/evidence](docs/evidence/README.md). Report vulnerabilities privately: [SECURITY.md](SECURITY.md). License: [Apache-2.0](LICENSE).

---

## Quickstart

Needs OpenCode v2 and Node.js 20 or later.

1. Install:

   ```bash
   npm install -g leakshield
   ```

2. Register the plugin in your project's `opencode.json`. With no options, `mode` defaults to `transparent`:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield" }]
   }
   ```

3. Check the install. Exit code 0 means `PROTECTED` or `PARTIAL`; see [what `PARTIAL` means](#what-partial-means). This check cannot see inside a live session, so run step 4 as well.

   ```bash
   leakshield --doctor
   ```

4. Run the smoke test. It uses a temporary directory and a synthetic value, not a real credential:

   ```bash
   SMOKE_DIR="$(mktemp -d)"
   cat > "$SMOKE_DIR/opencode.json" <<'EOF'
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield", "options": { "mode": "block" } }]
   }
   EOF
   (cd "$SMOKE_DIR" && opencode run --standalone \
     "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
   rm -rf "$SMOKE_DIR"
   ```

   The model-facing message must contain the LeakShield block notice and must not contain the synthetic token. Do not use a real credential for this test.

Before relying on it, read [what this protects — and what it does not](#what-this-protects--and-what-it-does-not). For source builds and other options, see [Installation](#installation) and [OpenCode Plugin](#opencode-plugin-recommended). New contributors: [3-minute onboarding](docs/ONBOARDING.zh-TW.md) (Traditional Chinese only).

---

## Detection Coverage

| Type | Description | Severity |
|------|-------------|----------|
| API Key | OpenAI, Anthropic, Google, AWS, Stripe (live keys) | 🔴 HIGH |
| Secret / Password | Generic password assignments, AWS Secret | 🔴 HIGH |
| Token | GitHub, Slack, Hugging Face, JWT, Bearer Token | 🔴 HIGH |
| Private Key | PEM private key blocks | 🔴 HIGH |
| DB Connection String | MongoDB, PostgreSQL, MySQL, Redis, ADO format, etc. | 🔴 HIGH |
| Taiwan National ID | Format validation | 🔴 HIGH |
| Credit Card Number | 13–19 digits, Luhn checksum required | 🔴 HIGH |
| IBAN | Compact or 4-char groups, mod-97 checksum required | 🔴 HIGH |
| Public IPv4 Address | Private/loopback/CGNAT/reserved ranges excluded; runs longer than four groups are reported whole | 🟡 MEDIUM |
| Private IPv4 / VPN CIDR | **Opt-in** — disabled by default (`rule_overrides["private-ipv4"]: true`); networks from `settings.private_cidrs`, default RFC 1918 + CGNAT + link-local | 🟡 MEDIUM |
| Email Address | All email formats | 🟡 MEDIUM |
| URL Embedded Credential | `scheme://user:password@host` — only the userinfo span is masked | 🔴 HIGH |
| Taiwan Mobile Number | **Opt-in** — disabled by default (`rule_overrides["phone-tw"]: true`); digit runs are a measured false-positive source | 🟡 MEDIUM |
| International Phone | **Opt-in** — disabled by default (`rule_overrides["phone-intl"]: true`); same trade-off as above | 🟢 LOW |
| HTTP(S) URL | **Opt-in** — disabled by default (`rule_overrides.url: true`) | 🟢 LOW |
| NDA Keywords | Custom (see `config/guard.config.yaml`) | 🔴 HIGH |
| Private Domains | Custom (see `config/guard.config.yaml`) | 🟡 MEDIUM |

> **Detection boundaries** (per `src/rules/builtin.ts`): the generic secret rule matches only the keywords `password`, `passwd`, `secret`, `private_key`, `client_secret` with a value of **8+ characters** — generic `api_key=`/`token=` assignments are not matched unless the value itself matches a vendor pattern. It also skips an unquoted value that is a code expression, such as `process.env.DB_PASSWORD` or `z.string().min(6)`; a call whose arguments hold another string literal is still reported. Credit card and IBAN matches require a valid checksum, and the credit card rule skips a run of one repeated digit and digits inside a UUID. The URL credential and DB connection rules skip a password that is a `${…}`, `{{…}}` or `<…>` placeholder. IP matches cover only public/routable IPv4, and a dotted run longer than four groups is reported whole so an address embedded in it is masked instead of left behind (dotted dates such as `2026.10.21.14.32.59` therefore report as an IP run too). Not covered by any rule: street/postal addresses, dates, IPv6, and values below the 8-character minimum for generic secret assignments. SSH remote authorities (`user@host:path`, `ssh://user@host/…`) are not reported as email; private domains and path keywords still apply inside them, and the password half of `scheme://user:password@host` is reported as a URL credential instead. Private IPv4 is opt-in because the literal also matches version numbers and timestamps; `settings.private_cidrs` narrows it to the organisation's own ranges, and an entry that does not parse fails the config load. Every built-in rule has a stable id and can be toggled via `settings.rule_overrides` in `config/guard.config.yaml` (unknown ids fail config load); the URL rule ships disabled because always-on URL masking would flag provider endpoints. The same rule set (built-in + `config/guard.config.yaml`) applies to every mode — `block`, `redact`, and `transparent`.

---

## Decision Model

Every scan produces a **decision** that tells the caller how to handle the content:

| Decision | When | Risk Level | Meaning |
|----------|------|-----------|---------|
| `ALLOW` | No findings | LOW | Content is clean — safe to send |
| `WARN` | LOW-severity findings only | MEDIUM | Minor items detected — reminder shown, content can be sent |
| `CONFIRM` | MEDIUM or HIGH findings | HIGH / CRITICAL | Sensitive content detected — user must explicitly confirm |

### CONFIRM Handling

When the decision is `CONFIRM`, the CLI is non-interactive: it prints a warning card and a next-step hint, and does not prompt you to choose. The hint points to `--format json` (read `redactedContent`) or `--redact` (sanitized output). Exit code `1` means the content was blocked.

The `CONFIRM` decision includes:
- `recommendedAction`: `REVIEW` (MEDIUM findings) or `BLOCK` (HIGH findings)
- `safePreview`: a masked excerpt around the first finding
- `redactedContent`: the full content with all sensitive spans replaced

`safePreview` and `redactedContent` are left out when a sensitive span cannot be located exactly, such as an encoded run split by a zero-width character. A missing field means no safe version is available.

### JSON Output Fields

When using `--format json`, the output includes these decision-oriented fields:

| Field | Description |
|-------|-------------|
| `decision` | `ALLOW`, `WARN`, or `CONFIRM` |
| `riskLevel` | `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` |
| `recommendedAction` | `REVIEW` or `BLOCK` (CONFIRM only) |
| `findings` | Array of sanitized findings (no internal metadata) |
| `safePreview` | Masked excerpt (CONFIRM only; can be absent) |
| `redactedContent` | Full redacted text (CONFIRM only; can be absent) |

---

## Installation

Requires Node.js 20 or later. Mapping persistence needs 22.13 or later.

```bash
npm install -g leakshield
leakshield --help
```

`npx leakshield …` runs the published package without installing it. The npm
package ships only the compiled code, so it has no `config/` directory; see
[Configuration](#configuration) to add one.

To build from source:

```bash
git clone https://github.com/jwcrystal/leakshield.git
cd leakshield
npm install
npm run build
```

For local development, install the build globally or `npm link` it, then use
`leakshield` directly. `npm run scan -- ...` works from this repository without
installing.

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Clean, then compile TypeScript → `dist/` |
| `npm run clean` | Remove `dist/` |
| `npm start` | Run the built CLI (`node dist/cli.js --cli`) |
| `npm run dev` | CLI mode (no build needed) |
| `npm run scan` | CLI scan (no build needed) |
| `npm run web` | Start the local Web UI (no build needed) |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run binary` | Build standalone binary for current platform (macOS ARM) |
| `npm run binary:win` | Cross-compile for Windows x64 |
| `npm run binary:linux` | Cross-compile for Linux x64 |
| `npm run binary:mac-intel` | Cross-compile for macOS Intel |
| `npm run binary:win-icon` | Build the Windows binary with the app icon (`scripts/build-win.js`) |
| `npm run binary:all` | Build all platforms at once |
| `npm run bundle:mac` | Build the binary and package a macOS bundle (`scripts/bundle-mac.sh`) |

---

## Standalone Binary

Can't use Node.js or npm? Build a standalone binary with [Bun](https://bun.sh) — no runtime needed on the target machine.

```bash
# One-command build for current platform
npm run binary

# Cross-compile for other platforms
npm run binary:win     # Windows x64  → leakshield.exe
npm run binary:linux   # Linux x64    → leakshield-linux
npm run binary:all     # All platforms
```

Or directly with Bun:

```bash
bun build --compile --target=bun-windows-x64 ./src/cli.ts --outfile=leakshield.exe
```

The output is a single executable — hand it to anyone, no dependencies required.

### Configuration for binary and npm users

The binary and the npm package work out of the box with built-in defaults. To customize rules (NDA keywords, private domains, custom regex patterns), place a config file in one of these locations:

| Location | Scope |
|----------|-------|
| `./config/guard.config.yaml` | Current working directory |
| `~/.leakshield/guard.config.yaml` | All sessions (user home) |

```bash
# Quick start: copy config/guard.config.example.yaml from this repository,
# then replace its sample keywords and domains
mkdir -p ~/.leakshield
cp config/guard.config.example.yaml ~/.leakshield/guard.config.yaml

# Or per-project
mkdir -p ./config
# Create/edit ./config/guard.config.yaml as needed
```

See [Configuration](#configuration) section for available options.

---

## Usage

### OpenCode Plugin (recommended)

When loaded successfully, the OpenCode plugin is the enforced integration. It scans and blocks user text before OpenCode persists or sends it to a model, sanitizes system prompts and tool definitions, protects tool output before the next model turn, and re-scans history before replay. It always enables encoded-content detection. Invalid plugin options or scanner configuration make every protected hook fail closed and abort the model request. A bounded SHA-256 decision cache avoids repeatedly scanning unchanged history without retaining original or redacted content.

Transparent mode details: [Encoded content and tool schemas](docs/plugin/transparent-mode.md#encoded-content-and-tool-schemas).

LeakShield supports OpenCode v2 only. v2 hosts load the package `id` + `setup(ctx)` definition. OpenCode v1 is no longer supported: a v1 host that loads the package gets hooks that fail closed and abort every model request, and `leakshield --doctor` reports `BROKEN`. Upgrade to OpenCode v2.

**OpenCode v2** — point `plugins` at the published package, or at the `dist` directory of a local build:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "leakshield" // or "/absolute/path/to/leakshield/dist"
      // No options: mode defaults to "transparent" on v2.
      // Add "options": { "mode": "block" } to refuse instead of pseudonymize.
    }
  ]
}
```

Note that v2 only accepts plugin *directories* (it resolves `dist/index.js`) or package names; a `file://` URL to a single `.js` file is rejected with `configured plugin path must be a directory`.

The default `mode` is **`transparent`** (see [Transparent mode](docs/plugin/transparent-mode.md)). `block` replaces unsafe content with a disclosure-free notice; set `"mode": "block"` to use it. Set `mode` to `redact` only when you explicitly want recognized direct matches replaced with `[REDACTED_TYPE]` placeholders. `--doctor` shows the mode in effect and marks it `(default)` when the options omit it.

#### What `PARTIAL` means

`leakshield --doctor` exits 0 for two statuses. They are install-level results, not a guarantee that nothing sensitive reaches a model.

| Status | Setup | Meaning |
|--------|-------|---------|
| `PROTECTED` | `block` or `redact`, or transparent with `wireProtection` omitted or `true` (the v2 default) | Install-level checks pass. In transparent mode, the final HTTP body or supported WS frame is validated too |
| `PARTIAL` | Transparent with `wireProtection: false` ([hook-first example](config/opencode.hook-first.example.json)) | Final outbound HTTP bodies are not inspected |

With `PARTIAL`:

- Later-added content or attachments may leave unmasked, even with `attachments: "block"`.
- **Content-hook masking failures still refuse the affected call**; hook-only does not silently forward unprotectable raw content.

See [Wire protection](docs/plugin/wire-protection.md) for both levels.

#### Detailed guides

- [Transparent mode](docs/plugin/transparent-mode.md): placeholders, supported protocols, tool argument restoration (per field, `code`/`script` fields, Code Mode, `curl`, `rtk`), restart limitation
- [Wire protection](docs/plugin/wire-protection.md): hook-only and final wire levels, AI SDK providers, refusals, reply-side recovery
- [Native WebSocket](docs/plugin/websocket.md): experimental Responses-family support and its limits
- [Mapping persistence](docs/plugin/persistence.md): opt-in encrypted storage, key custody, erasure
- [Capacity and lifecycle](docs/plugin/capacity.md): budgets, session limits, retention
- [Readonly env queries](docs/plugin/env-queries.md): opt-in tools that answer configuration questions without returning values

#### Persistence risk notes (read before enabling)

Mapping persistence is opt-in; see [Mapping persistence](docs/plugin/persistence.md).

- The design is dual-secret — the DB file alone or the key alone exposes nothing; both together do.
- Backups (Time Machine, cloud sync) copy `SGP.db`: `forget` cannot reclaim what a backup already captured, and a restored backup plus a surviving key can re-identify old sessions — treat backup retention accordingly.
- The keychain defends offline file theft (stolen disk, stolen backups, a copied `SGP.db`); it does not defend malware already running inside your login session.
- The keyfile option lowers the bar to "both files from the same directory tree" and is intended for headless/server environments without a keychain service.

**OpenCode v2 only — email de-identification trial:** the opt-in `deidentify` option (valid only together with `mode: "redact"`) additionally replaces repeated MEDIUM email findings with stable, opaque `[SG-EMAIL-…]` placeholders so an agent can correlate records without seeing the addresses. The mapping key is generated once per plugin setup (one OpenCode session), held in memory only, and never persisted — placeholders are stable within a live session but change after a restart, and no reverse mapping exists. Everything else keeps its existing disposition: HIGH credentials are still redacted/blocked, and truncated, encoded, or unverifiable content blocks the whole unit.

```jsonc
{ "package": "/absolute/path/to/leakshield/dist", "options": { "mode": "redact", "deidentify": true } }
```

Attachments: transparent mode supports an `attachments` policy (plural; `attachment` is not recognized). **`"block"` (default)** omits media/file parts at content hooks and replaces them with a notice; the model cannot read those omitted images. Final wire protection also refuses residual wire attachment parts; hook-first does not inspect late-added attachments. **`"allow"`** sends attachments through unscanned and appends a visible notice part — an explicit decision that you vouch for their content (`"allow"` requires `mode: "transparent"`). In block/redact modes attachments are blocked as before. Existing conversations can replay originals, subject to the [restart limitations](docs/plugin/transparent-mode.md#restart-limitation); starting a new conversation is not a substitute for verifying recovery. The plugin protects OpenCode model requests only, not other AI clients or local tools.

OpenCode currently logs and skips modules that fail before their plugin factory can run, such as a missing package or JavaScript syntax error. After installation or upgrade, run a smoke test with a synthetic key matching `sk-` followed by at least 20 letters or digits and verify that LeakShield replaces the message before using real sensitive data.

#### Isolated smoke test (OpenCode v2)

Run this from the project root. It uses a temporary working directory and a synthetic value, not a real credential:

```bash
npm run build
SMOKE_DIR="$(mktemp -d)"
PROJECT_DIR="$(pwd)"
cat > "$SMOKE_DIR/opencode.json" <<EOF
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "$PROJECT_DIR/dist", "options": { "mode": "block" } }
  ]
}
EOF
(cd "$SMOKE_DIR" && opencode run --standalone \
  "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
rm -rf "$SMOKE_DIR"
```

The model-facing message must contain the LeakShield block notice and must not contain the synthetic token. Do not use a real credential for this test.

To test the published package, use `"leakshield"` instead of the local `dist` path.

#### Automated install check: `--doctor`

```bash
npm run scan -- --doctor     # or: leakshield --doctor after global install
```

The doctor verifies the install without sending anything anywhere: it checks the OpenCode host version, reads the `opencode.json` or `opencode.jsonc` files OpenCode applies (`.opencode/`, the project root and one global directory), combines their `plugins` arrays the way the host does, confirms LeakShield is registered with options that the plugin itself would accept, verifies a local `dist` entry point actually exists (a missing one makes OpenCode silently log-and-skip the plugin — sessions look normal but are unprotected), loads the guard config, and runs the synthetic-canary smoke scan locally. Exit code 0 means `PROTECTED` or `PARTIAL` (`wireProtection: false`: final outbound HTTP bodies are not inspected); a v1 host is reported `BROKEN` with a fix that says to upgrade to OpenCode v2; any other status prints the failing check with a concrete fix, including a copy-paste registration snippet when the plugin is missing. A separate `Claude Code:` section checks the [Claude Code proxy](docs/claude-code.md) wiring; the exit code is also 0 when Claude Code is behind a running LeakShield proxy, even without OpenCode.

Doctor is an install-level check that runs outside the host — it cannot see inside a live session. Runtime proof comes from the smoke test above or `scripts/e2e/run-boundary.mjs`.

### What this protects — and what it does not

LeakShield protects model-conversation content: prompts, replayed history, tool outputs, and (in transparent mode) provider-bound request bodies whose shape it can parse. It is **not** a tool-egress firewall: a permitted local tool can still transmit originals over the network via `curl`, a remote MCP server, or any other channel. Controlling tool destinations requires a separate permission layer outside this plugin. Since 0.3.0, `curl` and `http` may also hold a placeholder inside an argument, so a tool can call an API with the protected value; the original then leaves the machine by design.

Detection also has known gaps: street/postal addresses, dates, IPv6, and generic assignments outside the keyword list or below the 8-character minimum pass through undetected. Credit card and IBAN numbers are detected only when the checksum validates; IP detection covers public IPv4 only; URL detection exists but is opt-in — see [Detection Coverage](#detection-coverage).

Local originals may remain in history, logs, and generated files — this protects the model boundary, not your disk.

---

### Claude Code (local proxy)

```bash
leakshield --claude-code-proxy                     # listens on 127.0.0.1:8787
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787    # or the "env" block of ~/.claude/settings.json
leakshield --doctor                                # the "Claude Code:" section checks the wiring
```

The proxy masks every Anthropic Messages request Claude Code sends (and `count_tokens`), restores placeholders in the assistant's JSON or streamed text, and blocks anything it cannot mask instead of forwarding it. It is verified with an API key; Claude Code documents that the base URL also applies to a claude.ai login, which has not been tested here. It does not restore placeholders inside tool calls, and it cannot see traffic that bypasses the base URL, such as WebFetch's domain check, which sends the hostname to Anthropic. Setup and the full list of gaps: [docs/claude-code.md](docs/claude-code.md).

---

### CLI

```bash
# Scan text
npm run scan -- --text 'sk-proj-test1234567890abcdef my_password="super_secret"'

# Scan a single file
npm run scan -- --file ./src/config.ts

# Scan an entire directory
npm run scan -- --dir ./src

# Scan specific file extensions only
npm run scan -- --dir ./src --ext .ts .env .json

# Read from stdin
cat .env | npm run scan -- --stdin

# Global installation
leakshield --file ./config.ts
```

Exit codes: `0` = safe (ALLOW), `1` = findings detected (WARN or CONFIRM), `2` = file not found

#### Redaction Mode

Replace sensitive content with `[REDACTED_TYPE]` placeholders instead of just reporting it:

```bash
# Redact stdin and print to stdout
echo 'token=sk-proj-test1234567890abcdef' | npm run scan -- --redact --stdin

# Redact a file and write result to a new file
npm run scan -- --redact --file .env --out .env.redacted

# Dry-run: preview what would be redacted without producing any output
npm run scan -- --redact --dry-run --file .env
```

Redacted output goes to **stdout**; the findings summary goes to **stderr** so they can be separated in pipelines.

| Flag | Behaviour |
|------|-----------|
| `--redact` | Replace findings with `[REDACTED_TYPE]`, write to stdout; output is suppressed if findings remain after redaction |
| `--redact --dry-run` | Preview findings only, no output; exit `1` if any found |
| `--redact --out <path>` | Write redacted text to file instead of stdout |
| `--redact --format json` | Return JSON with `redacted`, `findings`, and `summary` fields |

#### CLI Options

| Option | Description |
|--------|-------------|
| `--format json` | JSON output (CI/CD friendly) |
| `--min-severity high` | Only report HIGH (or `medium` / `low`) |
| `--allow-outside` | Allow scanning paths outside the current working directory (disabled by default) |
| `--enable-encoding-detection` | Also decode Base64, URL-encoded and hex content before scanning (disabled by default) |

#### Encoding Detection

**Why encoding detection?**

Encoding tricks can bypass sensitive-data detection:
- **Base64 encoding**: an API key or password is encoded before it is sent
- **URL encoding**: formats such as `%20` hide keywords
- **Hex encoding**: hexadecimal encoding evades pattern matching

**Enabling**

```bash
# Enable encoding detection
npm run scan -- --enable-encoding-detection --text "c2stcHJvai10ZXN0MTIzNDU2Nzg5MGFiY2RlZg=="

# Combine with other options
npm run scan -- --enable-encoding-detection --file ./config.yaml --format json

# Enable when scanning a directory
npm run scan -- --enable-encoding-detection --dir ./src --ext .ts .env
```

**Performance**

Decoding and rescanning can add 10-30% to scan time. Recommendations:
- **Off by default**: ordinary scans can use the default
- **Enable on demand**: turn it on for external or unknown content
- **CI/CD**: recommended in CI pipelines to catch encoding attacks

**Examples**

```bash
# Base64-encoded API key
echo "c2stcHJvai10ZXN0MTIzNDU2Nzg5MGFiY2RlZg==" | npm run scan -- --enable-encoding-detection --stdin
# → Detects an OpenAI API Key (synthetic value)

# URL-encoded sensitive content
echo "password%3Dsecret123" | npm run scan -- --enable-encoding-detection --stdin
# → Detects the password keyword

# Normal text is unaffected
echo "This is safe content" | npm run scan -- --enable-encoding-detection --stdin
# → Safe, no sensitive content
```

When encoded content is found, the text and JSON summaries name the encoding types, in the language set by `LEAKSHIELD_LANG`:

```
[WARNING: Encoded content: Base64, URL]
```

#### Workspace Path Restriction

By default, `--file` and `--dir` only accept paths **inside the current working directory**. Attempts to scan outside (e.g. `../shared.env` or `/etc/passwd`) will be rejected with an error.

To intentionally scan a path outside the workspace, pass `--allow-outside`:

```bash
npm run scan -- --file ../shared.env --allow-outside
```

> ⚠️ Outside-workspace scanning is opt-in. Only use it when you explicitly need to scan a file that lives outside the project root.

#### Ignore Directives

The CLI and Web UI skip any line containing `leakshield-ignore`, `guard:skip`, `guard:ignore`, `sg-ignore`, `no-scan` or `skip-guard` (case-insensitive). A real secret on that line reports as `ALLOW`.

> ⚠️ Anyone who can edit a scanned file can add a directive, so a CLI scan is not a gate against untrusted changes. The OpenCode plugin does not honor directives.

---

### Web UI

Start a local web server and use it in your browser:

```bash
# Default port 3000
npx tsx src/cli.ts --web

# Custom port
npx tsx src/cli.ts --web --port 3001

# Built version
node dist/cli.js --web --port 3001
```

Open `http://localhost:3001` in your browser, paste content, and press **Scan** or `Ctrl+Enter`.

#### REST API

You can also call the API directly:

```bash
# Scan text
curl -s -X POST http://localhost:3001/scan \
  -H 'Content-Type: application/json' \
  -d '{"content": "sk-proj-test1234567890abcdef my_password=\"super_secret\""}' | jq

# Response format
{
  "decision": "CONFIRM",
  "riskLevel": "CRITICAL",
  "summary": "...",
  "findings": [
    { "type": "API_KEY", "severity": "HIGH", "description": "OpenAI API Key", "preview": "****", "line": 1 },
    { "type": "SECRET", "severity": "HIGH", "description": "...", "preview": "****", "line": 1 }
  ],
  "recommendedAction": "BLOCK",
  "redactedContent": "[REDACTED_API_KEY] my_[REDACTED_SECRET]",
  "redactionVerified": true,
  "residualFindings": 0,
  "wasTruncated": false
}
```

`redactedContent` is omitted when `redactionVerified` is `false`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI HTML |
| `/scan` | POST | Scan `{ "content": string }`, returns JSON |

---

## Configuration

LeakShield loads the first config file it finds: `./config/guard.config.yaml`, then `config/guard.config.yaml` in the LeakShield directory (source builds only), then `~/.leakshield/guard.config.yaml`. With no file, the built-in defaults apply. The OpenCode plugin also accepts a `configPath` option. To start a new file, copy [`config/guard.config.example.yaml`](config/guard.config.example.yaml) and replace its sample keywords and domains.

```yaml
# NDA keywords (case-insensitive)
nda_keywords:
  - "CONFIDENTIAL"
  - "INTERNAL ONLY"
  - "DO NOT SHARE"
  - "NDA"
  - "PROPRIETARY"
  # Add your own internal keywords:
  # - "Project Phoenix"
  # - "MyCompany Internal"

# Private domains
private_domains:
  - "internal.mycompany.com"
  # - "dev.yourcompany.io"

settings:
  max_chars: 200000      # scan bound; transparent mode refuses past it instead of truncating
  show_line_numbers: true
  preview_length: 60
  encoding_detection: false  # Base64/URL/Hex decoding; off by default
```

After editing:
- **CLI**: Reloaded automatically on next run
- **OpenCode Plugin**: Restart OpenCode to reload the plugin configuration
- **Web UI**: Restart the local server

### Exact `.env` Value Detection

Enable this only for files whose values should never enter an LLM context:

```yaml
settings:
  env_files:
    - .env
    - .env.local
```

Paths are relative to the workspace root and must remain inside it. LeakShield reads non-empty values of at least eight characters, then detects exact occurrences in text sent to the model. It does not automatically read `.env`, process environment variables, or send, log, or serialize the loaded values. Restart OpenCode after changing an enabled env file. The opt-in `envQueries` plugin tools (see [Readonly env queries](docs/plugin/env-queries.md)) query these same files and never return their values.

### Custom Rules

```yaml
custom_rules:
  - description: "Company token"
    pattern: "MYCO_[A-Z0-9]{32}"
    severity: HIGH
    flags: "i"            # subset of gimsuy; g is always implied
    word_boundary: true   # \b only at literal ASCII word edges
    allow:                # exact strings this rule never reports
      - "MYCO_EXAMPLE0000000000000000000000000"
    # path: ["src/**"]    # accepted, but NOT implemented (see below)

settings:
  allowlist:              # exact strings no rule reports (see the bypass warning)
    - "qa@example.com"
```

- **`flags`** — any subset of `gimsuy`; `g` is always added. The default is `i`, so
  existing rules keep matching case-insensitively. An unknown flag (such as `x`)
  fails the config load, and the pattern is compiled with the final flags, so a
  pattern that is only invalid under `u` also fails the load.
  Zero-length matches are skipped (they contain no value to report or redact);
  scanning continues to later nonempty matches, including under Unicode flags.
- **`word_boundary`** — adds `\b` where the pattern's edge is a literal ASCII word
  character. A CJK edge (「機密」) is left alone: `\b` never holds between two
  non-word characters, and wrapping it would stop the rule matching. An edge that
  is a group, character class, quantifier or escape cannot take a boundary safely,
  so none is added and `--doctor` warns that the rule is looser than it looks —
  write `\b` in the pattern yourself, e.g. `\bEMP-\d{6}\b`. A top-level alternation
  (`a|b`) is a config error; group it as `(?:a|b)`.
- **`allow` / `settings.allowlist`** — exact matches against the matched text, not
  substrings and not regexes. `allow` applies to that rule; `settings.allowlist`
  applies to every rule, including the built-in ones and exact `.env` values.
  Caps: 32 entries per rule, 64 globally, 200 characters each.
  **Allowlisting a live secret is a real bypass**: the value still leaves the
  machine unmasked, and LeakShield will not report that value as a rule or
  `.env` finding. Use it only for values you have decided are not sensitive.
  Unicode evasion diagnostics are separate: a zero-width or look-alike-letter
  warning means removing those characters exposes a finding the raw text hides,
  and an allowlist on the raw text does not silence it. Cyrillic or Greek text
  on its own is not flagged. `--doctor` reports how many entries exist, exercises up to eight
  of them, and reports how many it could not exercise (a context-dependent
  pattern can only be judged in place). Suppressions are counted rather than
  silent.
- **`path`** — accepted and validated, but path scoping is **not implemented**: the
  scanner has no source path for prompts or tool output. These rules currently
  apply to every scanned text, and `--doctor` warns when `path` is set.

Allowlist entries are part of the config file, so they change its fingerprint
(sha256 of the file), which is what authorizations compare against.

---

## Practical Examples

### Scenario 1: Asking OpenCode to review a config file

With `mode: "block"`, shown below. In the v2 default, transparent mode, the model sees a placeholder instead and the task continues.

```
You (to OpenCode): Please review this config.ts for issues
OpenCode: [reads config.ts]
→ Tool output contains an API_KEY
→ Plugin replaces it before the next model turn
→ OpenCode receives a block notice instead of the secret
You: Replace line 12 with a dummy key, then continue
```

### Scenario 2: CLI scan before submitting a project

```bash
npm run scan -- --dir ./my-project
# If exit code = 1, there are findings — fix them before sharing with AI
```

### Scenario 3: CI/CD integration (block sensitive prompts from the pipeline)

```bash
# Add to your CI script
node dist/cli.js --cli --dir ./prompts
if [ $? -ne 0 ]; then
  echo "❌ Sensitive content detected — stopping pipeline"
  exit 1
fi
```

---

## Configuration Validation

Input lengths for dynamic rules are validated when the config is loaded:

| Field | Max length |
|-------|-----------|
| `nda_keywords` entries | 200 characters |
| `private_domains` entries | 255 characters |
| `custom_rules` `description` / `pattern` | 200 characters |

Values exceeding these limits will cause `loadConfig()` to throw a Zod validation error, preventing oversized patterns from entering the scanner.

List sizes are capped too, and a config over a cap fails the load:

| Field | Max entries |
|-------|-------------|
| `nda_keywords` | 4096 |
| `private_domains` | 4096 |
| `custom_rules` | 1024 |

A `custom_rules` pattern that does not compile as a regular expression also makes `loadConfig()` throw, naming the rule's index and `description` (not the pattern): a rule that cannot be enforced must not load. A pattern that compiles but runs slowly on a fixed probe input is skipped as a ReDoS suspect, with a warning on stderr and a `custom-rules` warning in `leakshield --doctor`. That check is a timing heuristic, not a guarantee: it runs the pattern once and cannot interrupt it, so it cannot prove a pattern safe.

## Secret Preview Behavior

All secret previews in scan results are **fully masked** as `****`, regardless of the secret's length. No prefix or suffix characters from the original value are preserved. This eliminates partial secret exposure in logs, CI output, and Web UI responses.

## Internationalization (i18n)

CLI output language is controlled by the `LEAKSHIELD_LANG` environment variable.

| Value | Language |
|-------|----------|
| `en` (default) | English |
| `zh-TW` or `zh` | Traditional Chinese |

```bash
# English output (default)
npm run scan -- --text "your content"

# Traditional Chinese output
LEAKSHIELD_LANG=zh-TW npm run scan -- --text "你的內容"
```

You can also set it persistently in your shell profile:

```bash
export LEAKSHIELD_LANG=zh-TW
```

## Notes

- This tool performs **static pattern matching** and cannot guarantee 100% coverage
- **Common false positives**: literal test values long enough to match (e.g. `password: "aaaaaaaa"`), placeholder values in example code
- The tool is meant to **warn**, not guarantee — final judgment is always yours
- Keep NDA keywords focused on truly confidential terms to avoid excessive false positives
