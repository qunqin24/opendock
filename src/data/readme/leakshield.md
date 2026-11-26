<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./icon.svg">
  <img alt="leakshield" src="./icon.svg" width="64">
</picture>

# leakshield

> 🌐 English | [繁體中文](./README.zh-TW.md)

**A gatekeeper that scans for sensitive content before you feed code, documents, or data to AI services.**

> **Design principles:** Invisible by default. Observable on demand. Fail-closed at the model boundary.
> New adapter work is built and accepted against these ([ADR 0008](docs/adr/0008-transparent-protection-and-native-ux.md)). They are a contract for adapter work, not a claim that every host meets them today; see [host capabilities](docs/host-capabilities.md) for current status.

Five entry points share one scanner and decision model:
- **OpenCode plugin**: The enforced ingress gate for OpenCode v2, at its content hooks and, in transparent mode, the final provider body.
- **pi extension**: An in-process pi extension that guards the agent's provider requests through the shared wire core and restores local tool arguments.
- **Claude Code proxy** (experimental): A local proxy behind `ANTHROPIC_BASE_URL` that masks Anthropic Messages requests and restores assistant text.
- **CLI**: Manual or CI scanning of text, files, and directories; supports redaction.
- **Web UI**: Local browser interface and REST endpoint for manual scanning.

MCP server mode has been removed. It depended on the model voluntarily calling a scan tool after it had already received the relevant context, so it cannot provide a model-boundary guarantee.

| Entry point | Start it with | Use it for |
|------|---------------|------------|
| OpenCode plugin | Add the `leakshield` package or the `dist` directory to `opencode.json` (OpenCode v2; [guide](docs/opencode.md)) | Automatic, fail-closed protection for OpenCode model inputs and tool outputs |
| pi extension | `pi install npm:leakshield` (0.4.0+, or `pi install /absolute/path/to/built/leakshield` for a local build; [guide](docs/pi.md)) | Masked pi provider requests and restored read/write/edit/bash arguments |
| Claude Code proxy | `leakshield --claude-code-proxy`, then `ANTHROPIC_BASE_URL=http://127.0.0.1:8787` ([guide](docs/claude-code.md)) | Masked Claude Code model requests and restored assistant text; tool arguments are not restored yet |
| CLI | `npm run scan -- --file ./path` (or `leakshield --file ./path` after a global install / `npm link`) | Explicit local or CI scans; it never sends content to a model |
| Web UI | `npm run web` | Manual browser scans at `http://localhost:3000` |

## Project status

**Experimental, `0.x`.** Published to npm as `leakshield`: run `npx leakshield --help` to see the commands, or build locally (`npm ci && npm run build`) and point a host at the build. Run without arguments in a terminal, the CLI prints usage. When stdin is not a terminal (a pipe, CI or a script), it reads stdin until EOF, so close or redirect stdin there.

None of the hosts is a guarantee that nothing sensitive reaches a model. `leakshield --doctor <host>` prints each host's declared coverage and residuals; the [host capability matrix](docs/host-capabilities.md) summarizes them.

- **OpenCode**: transparent mode verified on OpenCode v2.0.28 with local loopback providers, and once against a real OpenAI model. The 0.3.0 tool restoration was rechecked on OpenCode v2.2.5 with a loopback provider, the OpenChamber render tool and `rtk` ([record](docs/evidence/2026-11-06-opencode-2.2.5-tool-restoration.md)). The hook-first setup is reported as `PARTIAL` by `--doctor`, and content added after the plugin's hooks or sent by permitted tools (curl, remote MCP) is outside its coverage. See [OpenCode plugin](docs/opencode.md).
- **pi**: an in-process extension wraps the agent's `fetch`, masks the three wire APIs it supports, and restores read/write/edit/bash arguments locally. Verified against pi 1.6.0 with a recording stub upstream ([record](docs/evidence/2026-11-23-pi-extension.md)); providers whose transport bypasses fetch (Codex WebSocket, Bedrock) are refused, and OAuth-only accounts are not supported. See [pi adapter](docs/pi.md).
- **Claude Code** (experimental): a local proxy (`leakshield --claude-code-proxy`, then `ANTHROPIC_BASE_URL`), verified with Claude Code 2.1.321 against a loopback stub upstream ([record](docs/evidence/2026-11-21-claude-code-proxy.md)). It masks model requests and restores assistant text, but does not restore placeholders at tool execution yet. See [Claude Code](docs/claude-code.md).
- Not yet verified: OS-keychain custody on Windows and Linux (macOS verified 2026-10-20), a real Anthropic provider, long histories on other providers, long-running use ([#26](https://github.com/jwcrystal/leakshield/issues/26)).
- Defaults may still change during `0.x`; see the [changelog](CHANGELOG.md).
- Planned work: [Roadmap](docs/ROADMAP.md) (Traditional Chinese; priorities, candidates and research, separate from current support claims).
- Verification records: [docs/evidence](docs/evidence/README.md). Report vulnerabilities privately: [SECURITY.md](SECURITY.md). License: [Apache-2.0](LICENSE).

---

## Quickstart

Install once (Node.js 20 or later; the pi extension needs Node.js 22.19 or later):

```bash
npm install -g leakshield
```

Then connect the host you use and check it with `leakshield --doctor <host>`. Exit code 0 means `PROTECTED` or `PARTIAL`. The doctor checks the install outside the host and cannot see inside a live session, so finish with a synthetic-value test before using real data. Never use a real credential for that test.

### OpenCode v2

1. Register the plugin in your project's `opencode.json`. With no options, `mode` defaults to `transparent`:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield" }]
   }
   ```

2. Check the install; see [what `PARTIAL` means](docs/opencode.md#what-partial-means):

   ```bash
   leakshield --doctor opencode
   ```

3. Run the smoke test. It uses a temporary directory and a synthetic value:

   ```bash
   SMOKE_DIR="$(mktemp -d)"
   cat > "$SMOKE_DIR/opencode.json" <<'JSON'
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield", "options": { "mode": "block" } }]
   }
   JSON
   (cd "$SMOKE_DIR" && opencode run --standalone \
     "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
   rm -rf "$SMOKE_DIR"
   ```

   The model-facing message must contain the LeakShield block notice and must not contain the synthetic token.

### pi

1. Install the pi package (it registers the extension in `settings.packages`):

   ```bash
   pi install npm:leakshield
   ```

2. Check the install. A package install reports `PARTIAL` because pi's load order cannot be verified; for `PROTECTED`, register the extension first in `settings.extensions` instead ([explicit path](docs/pi.md#explicit-extension-path)):

   ```bash
   leakshield --doctor pi
   ```

3. Send pi a synthetic value such as `sk-AAAAAAAAAAAAAAAAAAAA` and confirm the provider receives a placeholder. See [pi adapter](docs/pi.md) for the provider APIs it supports.

### Claude Code (experimental)

1. Start the proxy and leave it running:

   ```bash
   leakshield --claude-code-proxy        # listens on 127.0.0.1:8787
   ```

2. Point Claude Code at it, in the shell or in the `env` block of `~/.claude/settings.json`:

   ```bash
   export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
   ```

3. Check the wiring:

   ```bash
   leakshield --doctor claude-code
   ```

Tool-call arguments are not restored yet, and traffic that bypasses the base URL is not covered; see [Claude Code](docs/claude-code.md).

### CLI only

```bash
leakshield --file ./path/to/file
```

Before relying on any host, read [what this protects — and what it does not](#what-this-protects--and-what-it-does-not). For source builds and other options, see [Installation](#installation). New contributors: [3-minute onboarding](docs/ONBOARDING.zh-TW.md) (Traditional Chinese only).

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
| Passport (MRZ) | TD3 line 2 only: 44 uppercase characters plus four ICAO 9303 check digits | 🔴 HIGH |
| US SSN | **Opt-in** — `rule_overrides["ssn-us"]: true`; hyphenated form only, invalid areas, groups and serials excluded | 🔴 HIGH |
| Taiwan Business No | **Opt-in** — `rule_overrides["tw-business-no"]: true`; 8 digits, divisible-by-5 checksum (2023 rule); about one in five random numbers passes, so dates can match | 🟡 MEDIUM |
| Credit Card Number | 13–19 digits, Luhn checksum required | 🔴 HIGH |
| IBAN | Compact or 4-char groups, mod-97 checksum required | 🔴 HIGH |
| Public IPv4 Address | Private/loopback/CGNAT/reserved ranges excluded; runs longer than four groups are reported whole | 🟡 MEDIUM |
| Private IPv4 / VPN CIDR | **Opt-in** — disabled by default (`rule_overrides["private-ipv4"]: true`); networks from `settings.private_cidrs`, default RFC 1918 + CGNAT + link-local | 🟡 MEDIUM |
| Email Address | All email formats | 🟡 MEDIUM |
| URL Embedded Credential | `scheme://user:password@host` — only the userinfo span is masked | 🔴 HIGH |
| Taiwan Mobile Number | **Opt-in** — disabled by default (`rule_overrides["phone-tw"]: true`); `09xx` or `+886 9xx`, with optional spaces or hyphens; digit runs are a measured false-positive source | 🟡 MEDIUM |
| International Phone | **Opt-in** — disabled by default (`rule_overrides["phone-intl"]: true`); `+` and 7–15 digits, one space or hyphen allowed between digits; same trade-off as above | 🟢 LOW |
| HTTP(S) URL | **Opt-in** — disabled by default (`rule_overrides.url: true`) | 🟢 LOW |
| NDA Keywords | Defaults plus your own (see [Configuration](#configuration)) | 🔴 HIGH |
| Private Domains | Your own (see [Configuration](#configuration)) | 🟡 MEDIUM |

> **Detection boundaries** (per `src/rules/builtin.ts`): the generic secret rule matches only the keywords `password`, `passwd`, `secret`, `private_key`, `client_secret` with a value of **8+ characters** — generic `api_key=`/`token=` assignments are not matched unless the value itself matches a vendor pattern. It also skips an unquoted value that is a code expression, such as `process.env.DB_PASSWORD` or `z.string().min(6)`; a call whose arguments hold another string literal is still reported. Credit card and IBAN matches require a valid checksum, and the credit card rule skips a run of one repeated digit and digits inside a UUID. The URL credential and DB connection rules skip a password that is a `${…}`, `{{…}}` or `<…>` placeholder. IP matches cover only public/routable IPv4, and a dotted run longer than four groups is reported whole so an address embedded in it is masked instead of left behind (dotted dates such as `2026.10.21.14.32.59` therefore report as an IP run too). Passport detection reads the MRZ line only, so a bare passport number beside a label needs a custom rule, and SSN detection requires the hyphenated 3-2-4 form. Not covered by any rule: street/postal addresses, dates, IPv6, and values below the 8-character minimum for generic secret assignments. SSH remote authorities (`user@host:path`, `ssh://user@host/…`) are not reported as email; private domains and path keywords still apply inside them, and the password half of `scheme://user:password@host` is reported as a URL credential instead. Private IPv4 is opt-in because the literal also matches version numbers and timestamps; `settings.private_cidrs` replaces its default networks, for example with your organisation's own ranges, and an entry that does not parse fails the config load. Every built-in rule has a stable id and can be toggled via `settings.rule_overrides` in your config file ([ids](docs/configuration.md#built-in-rule-ids); unknown ids fail config load); the URL rule ships disabled because always-on URL masking would flag provider endpoints. The same rule set (built-in rules plus your config) applies to every mode — `block`, `redact`, and `transparent` — and every host.

---

## Installation

Requires Node.js 20 or later. Mapping persistence needs 22.13 or later, and the pi extension needs 22.19 or later.

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

To run without Node.js, build a standalone binary of the CLI with Bun: see [Build it yourself](BINARY-GUIDE.md#build-it-yourself). Development scripts are listed in [CONTRIBUTING](CONTRIBUTING.md#npm-scripts).

---

## Usage

### What this protects — and what it does not

LeakShield protects model-conversation content: prompts, replayed history, tool outputs, and provider-bound request bodies whose shape it can parse. How much of that each host covers differs; `leakshield --doctor <host>` and the [host capability matrix](docs/host-capabilities.md) list it. It is **not** a tool-egress firewall: a permitted local tool can still transmit originals over the network via `curl`, a remote MCP server, or any other channel. Controlling tool destinations requires a separate permission layer outside LeakShield. The same holds for traffic the host or its dependencies send on their own, such as telemetry, analytics and crash reports: it never passes the model boundary, so LeakShield cannot see it, even with a zero-data-retention provider. Restricting that traffic is a job for the host's own settings or an OS-level sandbox or firewall. Since 0.3.0, `curl` and `http` may also hold a placeholder inside an argument, so a tool can call an API with the protected value; the original then leaves the machine by design.

Detection also has known gaps: street/postal addresses, dates, IPv6, and generic assignments outside the keyword list or below the 8-character minimum pass through undetected. Credit card and IBAN numbers are detected only when the checksum validates; IP detection covers public IPv4 only; passport detection reads the MRZ line only; United States SSN, Taiwan business-number, phone and URL detection are opt-in — see [Detection Coverage](#detection-coverage).

Local originals may remain in history, logs, and generated files — this protects the model boundary, not your disk.

---

### OpenCode plugin

When loaded successfully, the OpenCode plugin is the enforced integration. It scans and blocks user text before OpenCode persists or sends it to a model, sanitizes system prompts and tool definitions, protects tool output before the next model turn, and re-scans history before replay. In transparent mode (the default) it also validates the final provider body. Invalid plugin options or scanner configuration make every protected hook fail closed and abort the model request. OpenCode v2 only.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "leakshield" // or "/absolute/path/to/leakshield/dist"
      // Add "options": { "mode": "block" } to refuse instead of pseudonymize.
    }
  ]
}
```

Modes, `PARTIAL`, attachments, email de-identification, the isolated smoke test and what `--doctor` checks: [OpenCode plugin](docs/opencode.md). Feature guides: [transparent mode](docs/plugin/transparent-mode.md), [wire protection](docs/plugin/wire-protection.md), [native WebSocket](docs/plugin/websocket.md), [mapping persistence](docs/plugin/persistence.md), [capacity](docs/plugin/capacity.md), [readonly env queries](docs/plugin/env-queries.md).

---

### pi (in-process extension)

```bash
pi install npm:leakshield      # or: pi -e /path/to/leakshield/dist/adapters/pi/extension.js
leakshield --doctor pi         # checks registration, order and wire API
```

pi resolves `fetch` when it builds a provider client, including compaction and branch summaries, so an extension that wraps `globalThis.fetch` covers the same traffic the OpenCode plugin covers through its wire hook. Every provider request is masked in-process; assistant text is restored in the reply, and `read`, `write`, `edit`, `bash` and `powershell` arguments are restored at the local execution boundary. Session files stay with pi, so `--continue`, `--resume` and `--session` keep working. Verified against pi 1.6.0 with a recording stub; providers that bypass fetch (Codex WebSocket, Bedrock, Google auth) are refused, OAuth-only accounts are not supported, and loading the extension first keeps other extensions from holding the raw fetch. See [pi adapter](docs/pi.md).

---

### Claude Code (local proxy, experimental)

```bash
leakshield --claude-code-proxy                     # listens on 127.0.0.1:8787
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787    # or the "env" block of ~/.claude/settings.json
leakshield --doctor claude-code                    # checks the wiring
```

The proxy masks every Anthropic Messages request Claude Code sends (and `count_tokens`), restores placeholders in the assistant's JSON or streamed text, and blocks anything it cannot mask instead of forwarding it. It is verified with an API key; Claude Code documents that the base URL also applies to a claude.ai login, which has not been tested here. It does not restore placeholders inside tool calls, and it cannot see traffic that bypasses the base URL, such as WebFetch's domain check, which sends the hostname to Anthropic. Setup and the full list of gaps: [docs/claude-code.md](docs/claude-code.md).

---

### Across hosts

- [Host capability matrix](docs/host-capabilities.md): per-host declaration of which model egress and surfaces are protected, refused, absent, or outside interception, and the invariants a new adapter must satisfy
- [Agent hook coverage](docs/hooks.md): how OpenCode, pi and Claude Code expose hooks, and which hook points can mask a request or restore a placeholder

#### Persistence risk notes (read before enabling)

Mapping persistence is opt-in for the OpenCode plugin ([setup](docs/plugin/persistence.md)) and pi (`LEAKSHIELD_PI_PERSIST`, [setup](docs/pi.md#sessions-and-persistence)). The Claude Code proxy keeps mappings in memory only.

- The design is dual-secret — the DB file alone or the key alone exposes nothing; both together do.
- Backups (Time Machine, cloud sync) copy `SGP.db`: `forget` cannot reclaim what a backup already captured, and a restored backup plus a surviving key can re-identify old sessions — treat backup retention accordingly.
- The keychain defends offline file theft (stolen disk, stolen backups, a copied `SGP.db`); it does not defend malware already running inside your login session.
- The keyfile option lowers the bar to "both files from the same directory tree" and is intended for headless/server environments without a keychain service.

---

### CLI and Web UI

```bash
leakshield --file ./src/config.ts          # scan a file (also --text, --dir, --stdin)
leakshield --redact --file .env --out .env.redacted
leakshield --web                           # local browser UI at http://localhost:3000
```

Exit codes: `0` = safe, `1` = findings, `2` = path error. Options, redaction, encoding detection, ignore directives, the REST API, the decision model and JSON fields: [CLI and Web UI](docs/cli.md).

---

## Configuration

LeakShield loads the first config file it finds: `./config/guard.config.yaml`, then `config/guard.config.yaml` in the LeakShield directory (source builds only), then `~/.leakshield/guard.config.yaml`. With no file, the built-in defaults apply. The OpenCode plugin also accepts a `configPath` option. The repository does not ship a `config/guard.config.yaml`, and Git ignores one you create there, so your keywords stay local. To start a new file, copy [`config/guard.config.example.yaml`](config/guard.config.example.yaml) and add your own keywords and domains. Listing `nda_keywords` replaces the four defaults (`CONFIDENTIAL`, `INTERNAL ONLY`, `DO NOT SHARE`, `NDA`); the example keeps them.

Without a checkout (npm or binary install), download the example into your home directory:

```bash
mkdir -p ~/.leakshield
curl -fsSL https://raw.githubusercontent.com/jwcrystal/leakshield/main/config/guard.config.example.yaml \
  -o ~/.leakshield/guard.config.yaml
leakshield --doctor   # confirms the file loads
```

After editing:
- **CLI**: Reloaded automatically on next run
- **OpenCode Plugin**: Restart OpenCode to reload the plugin configuration
- **pi extension**: Restart pi (`LEAKSHIELD_CONFIG` selects another file)
- **Claude Code proxy**: Restart the proxy (`--config` selects another file)
- **Web UI**: Restart the local server

Every key, the built-in rule ids, `.env` value detection, custom rules and limits: [Configuration reference](docs/configuration.md).

---

## Documentation

| Topic | Page |
|-------|------|
| OpenCode plugin | [docs/opencode.md](docs/opencode.md) |
| pi extension | [docs/pi.md](docs/pi.md) |
| Claude Code proxy | [docs/claude-code.md](docs/claude-code.md) |
| CLI and Web UI | [docs/cli.md](docs/cli.md) |
| Configuration reference | [docs/configuration.md](docs/configuration.md) |
| Host capability matrix | [docs/host-capabilities.md](docs/host-capabilities.md) |
| Standalone binary | [BINARY-GUIDE.md](BINARY-GUIDE.md) |
| Verification records | [docs/evidence](docs/evidence/README.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Notes

- This tool performs **static pattern matching** and cannot guarantee 100% coverage
- **Common false positives**: literal test values long enough to match (e.g. `password: "aaaaaaaa"`), placeholder values in example code
- The tool is meant to **warn**, not guarantee — final judgment is always yours
- Keep NDA keywords focused on truly confidential terms to avoid excessive false positives
