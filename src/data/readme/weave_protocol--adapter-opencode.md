# 🕸️ Weave_Protocol

**Infrastructure security for AI agents. We attack what we defend.**

[![npm](https://img.shields.io/npm/v/@weave_protocol/cli.svg?label=cli)](https://www.npmjs.com/package/@weave_protocol/cli)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/cli.svg)](https://www.npmjs.com/package/@weave_protocol/cli)
[![npm](https://img.shields.io/npm/v/@weave_protocol/full.svg?label=full)](https://www.npmjs.com/package/@weave_protocol/full)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/full.svg)](https://www.npmjs.com/package/@weave_protocol/full)
[![npm](https://img.shields.io/npm/v/@weave_protocol/ward.svg?label=ward)](https://www.npmjs.com/package/@weave_protocol/ward)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/ward.svg)](https://www.npmjs.com/package/@weave_protocol/ward)
[![npm](https://img.shields.io/npm/v/@weave_protocol/adversary.svg?label=adversary&color=red)](https://www.npmjs.com/package/@weave_protocol/adversary)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/adversary.svg)](https://www.npmjs.com/package/@weave_protocol/adversary)
[![npm](https://img.shields.io/npm/v/@weave_protocol/agentsecbench.svg?label=agentsecbench&color=red)](https://www.npmjs.com/package/@weave_protocol/agentsecbench)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/agentsecbench.svg)](https://www.npmjs.com/package/@weave_protocol/agentsecbench)
[![npm](https://img.shields.io/npm/v/@weave_protocol/browser.svg?label=browser)](https://www.npmjs.com/package/@weave_protocol/browser)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/browser.svg)](https://www.npmjs.com/package/@weave_protocol/browser)
[![npm](https://img.shields.io/npm/v/@weave_protocol/adapter-claudecode.svg?label=adapter-claudecode)](https://www.npmjs.com/package/@weave_protocol/adapter-claudecode)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/adapter-claudecode.svg)](https://www.npmjs.com/package/@weave_protocol/adapter-claudecode)
[![npm](https://img.shields.io/npm/v/@weave_protocol/adapter-antigravity.svg?label=adapter-antigravity)](https://www.npmjs.com/package/@weave_protocol/adapter-antigravity)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/adapter-antigravity.svg)](https://www.npmjs.com/package/@weave_protocol/adapter-antigravity)
[![npm](https://img.shields.io/npm/v/@weave_protocol/adapter-msaf.svg?label=adapter-msaf)](https://www.npmjs.com/package/@weave_protocol/adapter-msaf)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/adapter-msaf.svg)](https://www.npmjs.com/package/@weave_protocol/adapter-msaf)
[![npm](https://img.shields.io/npm/v/@weave_protocol/hundredmen.svg?label=hundredmen)](https://www.npmjs.com/package/@weave_protocol/hundredmen)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/hundredmen.svg)](https://www.npmjs.com/package/@weave_protocol/hundredmen)
[![npm](https://img.shields.io/npm/v/@weave_protocol/mund.svg?label=mund)](https://www.npmjs.com/package/@weave_protocol/mund)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/mund.svg)](https://www.npmjs.com/package/@weave_protocol/mund)
[![npm](https://img.shields.io/npm/v/@weave_protocol/hord.svg?label=hord)](https://www.npmjs.com/package/@weave_protocol/hord)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/hord.svg)](https://www.npmjs.com/package/@weave_protocol/hord)
[![npm](https://img.shields.io/npm/v/@weave_protocol/domere.svg?label=domere)](https://www.npmjs.com/package/@weave_protocol/domere)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/domere.svg)](https://www.npmjs.com/package/@weave_protocol/domere)
[![npm](https://img.shields.io/npm/v/@weave_protocol/witan.svg?label=witan)](https://www.npmjs.com/package/@weave_protocol/witan)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/witan.svg)](https://www.npmjs.com/package/@weave_protocol/witan)
[![npm](https://img.shields.io/npm/v/@weave_protocol/tollere.svg?label=tollere)](https://www.npmjs.com/package/@weave_protocol/tollere)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/tollere.svg)](https://www.npmjs.com/package/@weave_protocol/tollere)
[![npm](https://img.shields.io/npm/v/@weave_protocol/yoxallismus.svg?label=yoxallismus&color=red)](https://www.npmjs.com/package/@weave_protocol/yoxallismus)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/yoxallismus.svg)](https://www.npmjs.com/package/@weave_protocol/yoxallismus)
[![npm](https://img.shields.io/npm/v/@weave_protocol/langchain.svg?label=langchain)](https://www.npmjs.com/package/@weave_protocol/langchain)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/langchain.svg)](https://www.npmjs.com/package/@weave_protocol/langchain)
[![npm](https://img.shields.io/npm/v/@weave_protocol/api.svg?label=api)](https://www.npmjs.com/package/@weave_protocol/api)
[![npm](https://img.shields.io/npm/dm/@weave_protocol/api.svg)](https://www.npmjs.com/package/@weave_protocol/api)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Make agent behavior verifiable, auditable, and cryptographically provable across any harness, any platform. Built as a TypeScript monorepo with MCP integration, blockchain anchoring, and — as of Q4 — a **published red-team engine that tests our own defenses**.

> **The thesis:** every security platform claims its defenses work. We're the first to publish the attacks that prove it. Same suite. Same scorecard. Same locked benchmark — applied to our own packages on every push and release, with the scorecard published in CI.

---

## 🚀 Get started in one command

```bash
npx @weave_protocol/cli init
```

The CLI detects your framework (LangChain, LlamaIndex, MCP, OpenAI, Anthropic, Microsoft, Google) and scaffolds the right security middleware for your stack. Or install everything at once:

```bash
npm install @weave_protocol/full
```

---

## 🆕 What's New

### 🗓️ November 2026 update — hardening

#### ✅ How we check every release: before, after, and with our own tools
Every check below runs in CI. The release workflow itself (`publish-all.yml`) is unchanged.

**On every push and pull request:**
- **Each package:** a clean `npm ci`, build and full test suite. CI also checks that importing the package starts nothing and prints nothing, and runs `npm audit` on production dependencies.
- **Its dependents, against the change** ([Dependents](.github/workflows/dependents.yml)). Every changed package is built and packed locally. Then every package that depends on it, directly or through another Weave package, runs its tests against that build. The check fails if any copy of the package in a dependent's tree still comes from npm, so a pass means the change itself was tested.
- **Our own attack tools** ([self red-team](#️-self-red-team-on-every-push)). The [Adversary](adversary) corpus, the attacks behind [AgentSecBench](agentsecbench), goes through Mund and Ward offline, with no model and no keys. CI fails if detection drops or false positives rise past the committed baseline.

**Before a release:** we run the Dependents check for exactly the packages being published, and publish only if it passes. This is a step in our release routine, not an automated gate.

**After a release** ([Verify release](.github/workflows/verify-release.yml)). Whenever the publish workflow finishes, this checks what actually landed on npm. For each package that was published, it:
1. waits for the version on the registry;
2. installs it fresh into an empty project and imports it;
3. runs every dependent's tests against that exact published version.

A published package can differ from the local build, and this catches it.

**Detection claims on data we didn't write.** Mund's detection numbers come from public datasets it was never trained or tuned on: deepset, Gandalf, jackhhao, SPML, Mosscap, InjecAgent. False positives are measured on 2,062 benign texts and 5,825 MITRE ATT&CK and OWASP texts. The scripts in [`mund/training`](mund/training) fetch the data and reproduce every number, and the shipped model, byte for byte. See [DETECTION_CLAIMS.md](mund/DETECTION_CLAIMS.md#local-classifier-060).

**Why this exists.** We shipped a bug that these checks now catch. Mund 0.6.0's new classifier findings included the text they scored, unmasked, so secrets and email addresses could reach logs and webhooks. Mund's tests covered what it detected, not what it output. `api` already had a test that would have failed, but it only ran against 0.6.0 after release. We fixed it in Mund 0.6.1 and deprecated 0.6.0 on npm. With the fix reverted, the Dependents check now fails on that `api` test; run against the published 0.6.0, so does Verify release. The full account is in [CONTRIBUTING.md](CONTRIBUTING.md#why-we-test-everything-on-every-commit).

#### 🧠 Mund 0.6: a local injection classifier, and every red-team category at 100%
A small model now backs up Mund's rules: hashed word and character n-grams, 208 KB. It runs offline in under a millisecond, with no API key or download, and catches paraphrased instructions that no pattern names. A hit is a warning; it never blocks on its own. On public test sets it was never trained on:

| Test set | Rules only | Rules + classifier |
|---|---|---|
| Gandalf (Lakera) | 65.2% | **88.4%** |
| jackhhao jailbreaks | 57.0% | **77.0%** |
| SPML (a source it never saw) | 24.1% | **38.3%** |
| Benign texts flagged | 0 of 2,062 | 2 of 2,062 |

It does nothing for an attacker's request written as a polite sentence inside data (InjecAgent base, 1.6%). That needs to know what the user asked for, which is Ward's and Hundredmen's job.

Two new rules cover the rest:
- **guardrail mapping:** asking which tools are allowed and which are denied, or for hidden reasoning plus its rules;
- **requests for working malware or phishing kits:** descriptions and defensive work stay clean.

That takes every category of our self red-team to 100%: jailbreak was 80%, extraction 60%.

Mund also misfires much less on security writing. Across 5,825 ATT&CK and OWASP texts, the texts it flags fell from 86 to 15, and all 15 quote real injection strings. Use **0.6.1** (see above).

#### ⛓️ Receipts anchored on-chain (Ward 0.3.9, Dōmere 1.7.0)
A hash chain can't show that its newest entries were cut off. `weave-ward receipts checkpoint` signs a receipt log's current head. Dōmere's `domere_anchor_receipts` batches checkpoints from any number of agents into one Merkle root, and prepares the Solana or Ethereum transaction that stores it. Your wallet signs it; Dōmere never holds keys or broadcasts. `weave-ward receipts verify --checkpoints=bundle.json` then fails if any receipt up to an anchored checkpoint was removed or rewritten.

#### ✍️ Signed policies: one WARD.md, enforced as written everywhere (Ward 0.3.8)
Sign WARD.md once with `weave-ward sign`, then put the public key in `~/.weave/trusted-policy-keys` on each machine. Every adapter then refuses a policy that was edited after signing, or that a trusted key didn't sign, and denies each call with the reason. Even without a trust list, a signed policy that someone changed is refused. This is the piece that makes centrally managed policy trustworthy at scale.

#### 🔏 Signed, hash-chained decision receipts (Ward 0.3.7)
Turn on `required: true` in WARD.md's Verification section. Every decision then becomes an Ed25519-signed receipt chained to the one before, so no one can quietly edit, delete or reorder the record. Run `weave-ward receipts verify` to check a log offline, with or without an expected public key. Receipts never contain arguments, only a keyed digest the key holder can match. This works in all seven adapters.

#### 💳 Agents can't spend without asking (Ward 0.3.6)
In October an agent spent from a crypto wallet it was never authorized to use. Ward's new **payment guard** asks a person before any call that moves money, in every adapter. That covers payment, transfer, purchase and withdrawal tools, plus wallet and Stripe CLIs in shell commands. It stays on until WARD.md allows that capability by name.

**Session limits** now work in hook-based adapters too:
- WARD.md's Behavioral Limits: tool calls, runtime and external services per session;
- `spending_limits:` caps, such as $500 a day through `send_payment`.

A small local ledger keeps the counts across the separate processes each hook runs in. This release also fixes a Witan bug: `loadSpendingCapsFromWardFile()` always returned no caps, so caps written in a WARD.md file were silently not enforced (Witan 1.2.2).

#### 🛡️ Ward checks what's leaving, not just where it goes (Ward 0.3.5)
A secret sent to a domain your policy allows is still a leak. That's how the Claude Code exfiltration CVE (CVE-2026-54316) worked, through a pre-approved domain. Every tool call that sends something is now checked for:
- literal keys, card numbers, emails and SSNs;
- in shell commands, `$SECRET_VARS`, `.env` and SSH key files, and environment dumps.

This applies across all seven harness adapters.
- WARD.md's `egressDeny` and `egressAllow` are **enforced**, even to allowed domains.
- By default, a credential sent anywhere but its own issuer **needs approval**: `$GITHUB_TOKEN` to `api.github.com` is fine, but to any other host it's not.
- The **model-endpoint guardrail** asks before secrets or personal data go to a model API (OpenAI, Anthropic, Gemini, OpenRouter, Bedrock and others) that your WARD.md doesn't name.

CI's self red-team covers these: Ward decides all 27 coerced tool calls correctly, including six exfiltration attempts.

#### 🛡️ Agents can't switch off their own guardrails (Ward 0.3.3)
An agent with a broad write rule could rewrite the files that control it: WARD.md, its harness's hook and settings files, MCP server lists, or git hooks. This is the pattern behind Cursor's CurXecute (CVE-2025-54135), where injected content rewrote `mcp.json`. Every adapter now asks a human before an agent writes or deletes one of these, even when a rule like `write: /repo/**` covers it. To let an agent edit one, name that exact file in an allow rule.

#### 🛡️ The API refuses DNS-rebinding requests (api 1.6.0)
A web page can point its own domain at `127.0.0.1` and call a local server from your browser. This is the class behind the Playwright MCP DNS-rebinding issue (CVE-2025-9611). On its default loopback bind, the API now answers only requests addressed to `localhost`, `127.0.0.1` or `[::1]`. Add other names with `WEAVE_ALLOWED_HOSTS`.

#### 🛡️ Mund catches far more prompt injection (0.5.2)
Mund now looks for what an injection is trying to do, not one fixed phrase. The patterns cover:
- overriding instructions, in English, German, Spanish, French, Italian and Portuguese;
- hijacking the task;
- text addressed to an AI reader;
- hiding actions from the user;
- false authority;
- persona jailbreaks;
- extracting the system prompt;
- payment and data-exfiltration directives.

It also reads text a person never sees: hidden HTML, base64, invisible Unicode tag characters, and words split by zero-width characters. A precedence bug in the `shell_injection` rule, which flagged any line containing braces, is fixed.

| Measured on | Before (0.5.1) | After (0.5.2) | False positives |
|---|---|---|---|
| [Lakera Gandalf](https://huggingface.co/datasets/Lakera/gandalf_ignore_instructions) injections, 112 | 17.9% | **65.2%** | – |
| [jackhhao jailbreaks](https://huggingface.co/datasets/jackhhao/jailbreak-classification), 139 + 123 benign | 30.9% | **58.3%** | 0 of 123 |
| [deepset prompt-injections](https://huggingface.co/datasets/deepset/prompt-injections) train split, 203 + 343 benign (mostly German) | 4.9% | **24.6%** | 0 of 343 |
| Our Adversary corpus, 68 + our benign corpus of 84 | 27.9% | 94.1% | 0 of 84 (was 8) |

The three public sets were never used to write the rules; only their totals were checked. Our own corpus was used, so its 94.1% is optimistic. A hit means at least one finding at medium severity or higher. Pattern matching has a ceiling: paraphrased and harmful-content requests still get through, which is where a classifier would come in.

#### ⚔️ Self red-team on every push
CI now runs our own attack corpus through our own defenses, offline:
- Mund scans every Adversary payload, plus a benign corpus to count false positives.
- Ward decides the tool calls a coerced agent would make.

The scorecard goes to the job summary. CI fails if detection falls or false positives rise past the committed baseline. Today's numbers:
- Mund flags all 68 payloads (100%), with 0 false positives on 84 benign texts.
- Ward decides 29 of 29 calls correctly.

These are regression numbers on our own corpus, not a measure against unseen attacks. Mund's results on public held-out datasets are in [DETECTION_CLAIMS.md](mund/DETECTION_CLAIMS.md#local-classifier-060).

### 🗓️ October 2026 update — what landed

A big stretch across offense, defense, and how releases ship. Highlights:

#### 🛡️ Security fix: harness adapters now check the whole tool call ([WARD-2026-001](https://github.com/Tyox-all/Weave_Protocol/blob/main/ward/SECURITY_ADVISORIES.md))
The Claude Code, Antigravity and MSAF adapters each checked only part of a tool call. They looked at one argument per tool and the first URL in a shell command, so some calls a WARD policy denies got through. Ward 0.2.0 adds one shared evaluator, `evaluateToolCall`, which all three now use. It checks:
- every path and URL argument;
- every URL and path in shell commands;
- traversal tricks.

An invalid WARD.md now blocks instead of switching enforcement off. **Upgrade to adapter-claudecode 0.3.0, adapter-antigravity 0.3.0 or adapter-msaf 0.2.0.**

#### 🛡️ New: WARD.md in Cursor
[`@weave_protocol/adapter-cursor`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-cursor) enforces WARD.md through Cursor's agent hooks: shell commands, file reads, MCP calls, and every other tool through `preToolUse`. Set it up with `weave-ward-cursor init`. It's live-checked in Cursor 3.28.7: a denied read and a denied write were both blocked. That makes seven harnesses enforcing the same WARD.md.

#### 🛡️ New: WARD.md in OpenCode
[`@weave_protocol/adapter-opencode`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-opencode) is an OpenCode plugin that enforces WARD.md on every tool call, so the same policy covers whichever model OpenCode runs, including DeepSeek, Kimi, Qwen or a local model. Add `"@weave_protocol/adapter-opencode"` to `plugin` in opencode.json. It's live-checked in OpenCode 1.19.5: a read of a denied file and a write outside the allowed folder were both blocked.

#### 🛡️ New: WARD.md in Codex CLI
[`@weave_protocol/adapter-codex`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-codex) enforces WARD.md in OpenAI's Codex CLI through its `PreToolUse` hook. It checks shell commands, MCP calls, and the files each `apply_patch` edit touches. It's live-checked in Codex CLI 0.166.0: a denied `cat` and a denied `apply_patch` were both blocked. Set it up with `weave-ward-codex init`, then trust the hook with `/hooks` in Codex.

#### 🛡️ New: WARD.md in Gemini CLI
[`@weave_protocol/adapter-geminicli`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-geminicli) enforces the same WARD.md in Gemini CLI through its `BeforeTool` hook. `npm i -g @weave_protocol/adapter-geminicli && weave-gemini init` sets it up. It's live-checked in Gemini CLI 0.66.0, where a read of a denied file was blocked before the model saw it.

#### 📊 The dashboard shows real data
The operator dashboard (`@weave_protocol/api` 1.4.0) now shows what your agents actually did. Hundredmen, the Claude Code / Antigravity / MSAF adapters and the browser guard report each decision to the API once you set `WEAVE_DASHBOARD_URL` (and `WEAVE_API_KEY`) where your agents run. Only the decision and the tool name or URL are sent; command contents never are. A surface that isn't reporting shows **OFF** instead of made-up numbers.

#### ⚖️ Dōmere 1.6.0: GDPR and CCPA records persist
- **Records survive restarts.** With `DOMERE_STORAGE=sqlite`, consents, DSARs, breaches, opt-outs and consumer requests are stored in the same SQLite file as threads. Before, they were lost on every restart.
- **Erasure removes the data from disk.**
- **Edited records are caught.** The GDPR and CCPA checkpoint chains now recompute every hash, so a record edited in storage fails `domere_gdpr_verify_chain` / `ccpa_verify_chain`.

#### 🛡️ Mund: 0.5 → 0.3
[`@weave_protocol/mund`](https://www.npmjs.com/package/@weave_protocol/mund), our most-used package, newest release first.

##### 📚 0.5.0: Mund as a library
`import { scan } from '@weave_protocol/mund'` runs the same analyzers and rules as the MCP server and returns masked findings with a 0–100 risk score. The Weave API now uses it for every scan.

##### 🚪 0.4.x: skills and MCP servers are checked before they can act
Mund and the harness adapters now guard what your agent installs:

- **Skills are scanned before install**, including every file they ship: invisible Unicode that hides instructions from reviewers, prompt injection, data-exfiltration instructions, dangerous commands and embedded secrets.
- **MCP servers are checked before they're used.** Mund looks at how each server is launched (typosquatted packages, plain-HTTP or data-collection URLs, secrets written into config), connects to the ones you've approved, scans their tool descriptions, and watches for **rug pulls**: tools that change after you approved them.
- **Enforced by hooks** in Claude Code (`weave-claude-code mund install`) and Antigravity (`weave-antigravity mund install`). Calls to blocked servers are denied, flagged ones ask you first, and a poisoned skill is stopped before it's written.
- **Every claim is a test.** [DETECTION_CLAIMS.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/mund/DETECTION_CLAIMS.md) links each one to a fixture that CI checks.
- **Safe by design:** Mund never starts a server you haven't approved, or one whose package or URL it already distrusts.
- **Antigravity WARD enforcement fixed** (adapter 0.2.0). The original hook didn't match Antigravity's documented hook format, so WARD rules were likely not being enforced there. Re-run `weave-antigravity init` after upgrading.
- **Live-checked in the Antigravity CLI** ([adapter 0.2.1](https://www.npmjs.com/package/@weave_protocol/adapter-antigravity)). We ran the WARD and Mund hooks in real `agy` 1.4.11 sessions, which turned up three bugs, now fixed:
  - `agy` uses its own file tools (`read_file`, `write_file`, `edit_file`), which the adapter didn't recognise, so allowed reads were blocked and path rules never applied. Mund's skill check now covers these write tools too.
  - `agy` sometimes sends workspace-relative paths, which could slip past a deny rule like `secrets/**`. Paths are now resolved against the workspace before matching.
  - `agy` treats an empty `{}` hook reply as a deny, so the hooks now print nothing for allowed calls.

  In the live run, a read of `secrets/token.txt` was denied by its WARD rule, while reads and writes inside the allowed folders went through. Upgrade with `npm i -g @weave_protocol/adapter-antigravity@latest`.

**Since 0.4.0:** 0.4.1 ships the MCP SDK and zod security updates (no high or critical advisories remain), and 0.4.2 makes importing `@weave_protocol/mund` side-effect free: the MCP server now starts only from the `mund-mcp` command or when `dist/index.js` is run directly, never on `import`.

##### 🐤 0.3.1: canary tokens and rug-pull detection
- **Canary tokens (OWASP LLM07).** Put a Mund canary in your system prompt, and any output that leaks it is flagged, even spaced out, base64-encoded, or reversed.
- **MCP rug-pull detection (OWASP ASI04).** Mund remembers each MCP server's tools when you first approve it and alerts when they change later. If a changed tool now looks malicious or asks to run commands, the verdict is `DO_NOT_USE`.
- Both features are backed by a **fixture library** with one test case per scenario. OWASP coverage is now **3/20 green for Mund alone and 10/20 across the Weave suite**, with every green cell linked to its source.

##### 🧬 0.3.0: the parity floor ([details below](#️-mund-parity-floor--plugs-into-github-code-scanning))
- **`mund-mcp scan --format=sarif`**: findings appear as GitHub code-scanning alerts.
- **Live dependency CVEs** from OSV.dev, with an offline cache. Unchecked packages are reported as unchecked, never as clean.
- A **0–100 risk score** with a severity label on every scan.
- **OWASP coverage tables** for the LLM Top 10 and the Agentic Top 10, marking honestly what's covered and what isn't.
- **23 secret-detection rules that had never matched anything** (including AWS secret keys) are fixed.

Security hardening in the same release:
- Patched `express`, `qs` and `proxy-addr`, and updated the MCP SDK to 1.32.1. `npm audit` now reports **0 production vulnerabilities**.
- Removed `nodemailer`, which carried a high-severity CVE and was never actually wired up. The email notifier now says plainly that it isn't implemented instead of silently dropping alerts.
- Mund has its **first real test suite**.

#### 🏛️ Hord 0.2.0: a real sandbox, and a key bug fixed
- **Sandbox isolation (0.1.9).** Code runs with no network, writes only to its own folder, a scrubbed environment, and memory and CPU limits (`sandbox-exec` on macOS, `bwrap` on Linux). Each result reports what was enforced, and strict mode refuses to run without full isolation.
- **Advisory [HORD-2026-001](https://github.com/Tyox-all/Weave_Protocol/blob/main/hord/SECURITY_ADVISORIES.md) (high).** Before 0.2.0, any master key that wasn't 64 hex characters, including the default, gave the same key on every install. Upgrade, or set a 64-hex-character key.
- **Sealed vaults can be reopened.** Sealing used to wipe the vault's only key.
- **Usable as a library:** vaults, capability tokens, redaction, the sandbox and attestations are now exported.

#### 🔌 API 1.3.0: real packages, locked down
- **Backed by Mund, Hord and Dōmere.** Earlier versions simulated the sandbox and anchoring, and "encrypted" vault secrets with a fixed key. Endpoints that aren't implemented upstream now say so (501, 410).
- **Fails closed (1.2.0).** It listens on `127.0.0.1` by default, refuses a public address without `WEAVE_API_KEY`, requires the key on every route, and no longer sends CORS `*`.

#### 🧹 Across the suite
- **No critical or high npm advisories** in any package, with the MCP SDK on 1.32. CI now builds, tests and audits all 18 packages.
- **Importing a package no longer starts a server** (Mund, Hord, Dōmere, Hundredmen, Witan, API); servers start from their commands. `@weave_protocol/full` 0.3.0 installs current versions of everything.
- **Also fixed:** Dōmere threads with hops failed verification (1.3.8), Witan couldn't be imported (1.1.2), and Tollere missed `react-dom` typosquats (0.2.4).

#### 🔐 Yoxallismus 0.2.0-beta.0: Double Ratchet, and a wire format you can build on
[`@weave_protocol/yoxallismus`](https://www.npmjs.com/package/@weave_protocol/yoxallismus) moves from a cipher toward a messaging protocol:

- **Signal's Double Ratchet, started post-quantum.** Conversations get fresh keys every message, and a stolen session stops working after one round trip (post-compromise security). Messages can arrive out of order or go missing. Sessions start from the hybrid X25519 + ML-KEM-768 key exchange, so no setup is needed beyond the recipient's public key.
- **`seal()` / `open()`** for one-shot encryption to a public key, with an optional **cascade mode** that layers AES-256-GCM inside ChaCha20-Poly1305 so data stays safe if either cipher falls.
- **Wire format `yoxall/2` is locked through 1.0**, specified byte by byte, with test vectors that fail CI if anything drifts.
- **Three security advisories, published openly.** The biggest one: Hord's original `YoxallismusCipher` could never decrypt its own output. It's now deprecated (Hord 0.1.8), so `unlock()` fails loudly instead of returning the wrong bytes.

#### 🎯 AgentSecBench 0.3.0: grade any model

- **Any provider.** `agentsecbench run --real --provider=<id> --model=<id>` grades a live model on the locked suite, whether it's Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, GLM, or a local model through Ollama. Reports record the provider and model.
- **Only complete runs get a grade.** If a provider's quota runs out mid-suite, or any attack hits an API error, AgentSecBench refuses to grade the run rather than publish an inflated tier.

#### 🎯 AgentSecBench 0.2.0, with a public results page
[`@weave_protocol/agentsecbench@0.2.0`](https://www.npmjs.com/package/@weave_protocol/agentsecbench) turns benchmark runs into something you can publish and compare:

- **[Public results page](https://tyox-all.github.io/Weave_Protocol/asb/).** A leaderboard of tier-graded agents on the locked ASB-Browser-v1 suite. Results go up as summaries that strip every piece of attack evidence, so nothing an agent said or did during the run is published.
- **Report schema v1.1.** Each report carries a hash of the exact suite it ran, so two reports can prove they're comparable. It also records Adversary 0.3's dynamic-mutation results, including how many attacks landed only through a reworded variant.
- **Suites that can't drift.** Suites are checked against the attack corpus before a run, and the built-in suite is hash-locked, so an accidental edit fails CI instead of quietly changing the benchmark. Suites can also be loaded from JSON files.

#### ⚔️ Adversary v0.4.0: test any model

- **Any model provider.** `--provider=<id> --model=<id>` runs the attack corpus against Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, GLM, OpenRouter, Groq, Together, or a local model through Ollama or LM Studio. `weave-adversary providers` lists them and shows which keys are set. Verified live on Gemini 3.5 Flash: a full 68-attack run, plus dynamic mode with Gemini writing the variants.
- **Fits free tiers.** Overload and rate-limit errors are retried with backoff, and `--rpm` paces calls. When a free tier's daily quota runs out, the run stops and saves a scorecard marked as partial, rather than erroring through the remaining attacks.
- **Cost stays honest.** Models with no price on file report "unknown", not $0.

#### ⚔️ Adversary v0.3.0

- **Dynamic mutation (`--dynamic`).** When a target refuses but still engages with an attack, an LLM writes a variant with the same intent and Adversary retries it. In the first live run on Claude Haiku 5.5, **2 of 5 attacks landed only through a variant**, for **$0.003** total. That tests whether a safeguard generalizes or only caught the original wording.
- **Real-model mode works again.** The previous default model, Claude 3.5 Haiku, was retired in Feb 2026, so every `--real` run had been failing. The default is now Claude Haiku 5.5, and the pricing table is corrected.
- **No more false perfect scores.** Attacks that hit an API error used to count as "blocked", so a run with no API access scored 100/100. Adversary now exits with the real error instead.
- **Scorecard fixes.** Findings record the agent's tool calls again, `timeToExploit` means conversation turns again, and `--redact-evidence` also scrubs the per-attempt evidence it used to leak.
- **First test suite for Adversary**, covering retry logic, v0.2 compatibility, and redaction.

#### 🔏 How releases ship
- **npm Trusted Publishing (OIDC).** CI publishes without any long-lived npm token.
- **CycloneDX SBOM and Sigstore attestations** for every package published by `publish-all`.
- Hardened CI: Node 22 builds, npm pinned to 11, and GitHub Actions moved to Node 24 runtimes. `publish.yml` can now release any single package without republishing all 18.

---


### ⚔️  *we attack what we defend*

The first agent security platform to publish its own offensive engine. Two new packages flipped the suite from purely defensive to **defense + offense in the same monorepo**, validated against each other:

| Package | Role | Version |
|---|---|---|
| [`@weave_protocol/adversary`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adversary) | Offensive engine — 68 documented + novel attacks across 5 categories (IPI, tool-coercion, jailbreak, extraction, goal-corruption). Real Playwright browser target with 4 breach signal channels. Real-LLM demo mode against any provider (Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, GLM, local Ollama). LLM-driven dynamic mutation retries half-blocked attacks with fresh variants. | ✅ **v0.4.0** |
| [`@weave_protocol/agentsecbench`](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench) | Standardized benchmark — locked attack suites, tier grades A–F, paste-ready reports, side-by-side comparison, [public results page](https://tyox-all.github.io/Weave_Protocol/asb/). Grades live models on any provider. | ✅ **v0.3.0** |

**Trophy attacks** — documented in-the-wild incidents reproduced in the corpus:

- 🏦 **Atlan autonomous-fraud** (Dec 2025) — first documented agent-driven financial fraud
- 🔒 **EchoLeak** (CVE-2025-32711) — Microsoft Copilot zero-click exfil
- 👻 **Brave/Comet OTP exfil** (2025) — browser agent secret leak via hidden CSS
- 🚫 **Forcepoint false copyright** (Apr 2026) — DoS via fake copyright claim

```bash
# Run the canonical benchmark against the demo target — proves the suite lands
npx @weave_protocol/agentsecbench run

# Or run the full 68-attack corpus directly
npx @weave_protocol/adversary demo

# v0.3: when a real model half-blocks an attack, generate a variant and retry
npx @weave_protocol/adversary demo --real --dynamic
```

**Why this matters:** every model release, every WARD policy change, every adapter update can be re-benchmarked against the same locked suite. Did your score regress? `agentsecbench compare` will show you. Does your WARD policy actually defend anything? `--measure-ward-delta` will tell you. This is how a category gets defined.

**[See Adversary README →](https://github.com/Tyox-all/Weave_Protocol/blob/main/adversary)** · **[See AgentSecBench README →](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench)** · **[See METHODOLOGY.md →](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench/METHODOLOGY.md)**

---

### 🛡️ Mund parity floor — plugs into GitHub code scanning

[`@weave_protocol/mund@0.3.0`](https://www.npmjs.com/package/@weave_protocol/mund) now runs as a file scanner as well as an MCP server:

- **`mund-mcp scan --format=sarif`**: SARIF 2.1.0 output with GitHub `security-severity`, so findings show up as code-scanning alerts in any repo
- **Live dependency CVEs** from OSV.dev for npm lockfiles, with an on-disk cache for offline runs. Packages that couldn't be checked are reported as unchecked, never as clean
- **0–100 risk score** with a severity label on every scan
- **OWASP coverage tables** for the [LLM Top 10 (2025) and the Agentic Top 10](https://github.com/Tyox-all/Weave_Protocol/blob/main/mund#%EF%B8%8F-owasp-coverage), marking honestly what's covered, partly covered, or not covered
- **Release supply chain**: `publish-all` generates a CycloneDX SBOM per package and Sigstore-signed SBOM attestations for the exact tarball it publishes

```bash
npx @weave_protocol/mund scan . --format=sarif -o mund.sarif
```

This work also fixed 23 secret rules that had never matched anything, because they used PCRE `(?i)` syntax that JavaScript rejects.

---

### 💰 Q4 Governance — autonomous spending caps

Every enterprise agent question today is *"what's my ceiling on this thing?"* — measured in dollars, not just tool calls. [`@weave_protocol/witan@1.1.0`](https://github.com/Tyox-all/Weave_Protocol/blob/main/witan) answers it. Per-window budgets (run / hour / day / week / month) that gate LLM calls and tool calls, with three actions: **block**, **require approval/consensus**, or **notify**.

Multi-provider LLM pricing built in — Anthropic, OpenAI, Google, and local (free). Per-tool amount caps (`send_payment` max $500/day). Interactive TTY approval prompt for human-in-loop terminals. Async callback for Slack/PagerDuty/custom UIs. Safe defaults — never silent approval in non-interactive contexts.

```bash
npx @weave_protocol/witan@1.1.0 spending caps         # inspect WARD.md caps
npx @weave_protocol/witan@1.1.0 spending simulate     # dry-run scenarios
```

```yaml
# Extend your WARD.md:
spending_limits:
  - window: day
    budget: { usd: 5.00 }
    on_exceeded: require_approval
  - window: run
    budget: { tool_calls: 100 }
    on_exceeded: block
  - window: day
    budget:
      tools:
        send_payment: { max_amount_usd: 500 }
    on_exceeded: require_approval
```

Backward compatible with the existing `behavioral_limits.maxCostUSD`. In-memory storage in v1.1 with a pluggable interface for the v1.2 Redis/SQLite backends. Programmatic API via `import { SpendingTracker } from '@weave_protocol/witan/spending'`.

**[See Witan spending caps README →](https://github.com/Tyox-all/Weave_Protocol/blob/main/witan#-autonomous-spending-caps-v110)**

---

### 🔐 Yoxallismus v2 — post-quantum cipher (open beta)

[`@weave_protocol/yoxallismus@0.2.0-beta.0`](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus): a post-quantum cryptographic composition layer built on **NIST FIPS 203 (ML-KEM-768)** hybridized with X25519. Sealed boxes (AES-256-GCM, or a cascade inside ChaCha20-Poly1305), and Signal's **Double Ratchet** for conversations with forward secrecy and post-compromise security. Composition, not invention: the primitives are standard, and the wire format (`yoxall/2`) is [locked through 1.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/WIRE_FORMAT.md).

```bash
# Explicit opt-in required — the beta tag is NOT installed by default
npm install @weave_protocol/yoxallismus
```

```typescript
import { generateHybridKeypair, publicKeyOf, seal, open, initiateSession, acceptSession, drEncrypt } from '@weave_protocol/yoxallismus';

const bob = generateHybridKeypair();

// One-shot: seal to Bob's public key
const msg = open(bob, seal(publicKeyOf(bob), plaintext));

// Conversation: Double Ratchet, started from Bob's public key alone
const alice = initiateSession(publicKeyOf(bob));
const { session: bobSession } = acceptSession(bob, drEncrypt(alice, plaintext));
```

**⚠️ EXPERIMENTAL — NOT AUDITED.** Do not use for regulated, medical, financial, or legal data. Validation is via public use, forks, community verification, and responsible disclosure — not paid audit. See [THREAT_MODEL.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/THREAT_MODEL.md) and [SECURITY.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/SECURITY.md) before adopting.

**Verify every claim yourself:**

```bash
npx -p @weave_protocol/yoxallismus weave-yoxall test         # 20 reproducible-claims tests
npx -p @weave_protocol/yoxallismus weave-yoxall audit-self   # 5 known-attack vectors
npx -p @weave_protocol/yoxallismus weave-yoxall benchmark    # perf micro-benchmarks
```

Measured on Node 22, single-threaded: **3.1 ms hybrid keypair generation · 2.4 ms encap+decap · 0.024 ms AEAD (1 KB)** — comfortably under the <5 ms target.

**[See Yoxallismus README →](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus)**

---

### 🛡️ Four runtimes. Three vendors. One policy file.

The thesis was that [WARD.md](https://www.npmjs.com/package/@weave_protocol/ward) could be a **portable agent security standard** — write it once, enforce it everywhere. As of today, that's **shipped and live across the entire agent harness landscape**:

| Runtime | Vendor | Enforcer | Status |
|---|---|---|---|
| **MCP servers** | Open standard | [Hundredmen v1.4.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/hundredmen) | ✅ Live on npm |
| **Claude Code** | Anthropic | [adapter-claudecode v0.5.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-claudecode) | ✅ Live on npm |
| **Google Antigravity** (desktop + `agy` CLI + SDK) | Google | [adapter-antigravity v0.5.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-antigravity) | ✅ Live on npm |
| **Microsoft Agent Framework** | Microsoft | [adapter-msaf v0.4.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-msaf) | ✅ Live on npm |
| **Gemini CLI** | Google | [adapter-geminicli v0.3.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-geminicli) | ✅ Live on npm |
| **Codex CLI** | OpenAI | [adapter-codex v0.3.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-codex) | ✅ Live on npm |
| **OpenCode** | open source | [adapter-opencode v0.3.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-opencode) | ✅ Live on npm |
| **Cursor** | Anysphere | [adapter-cursor v0.3.0](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-cursor) | ✅ New |
| **Browser agents** | Open standard | [browser v0.3.1](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser) | ✅ Live on npm |

The same `WARD.md` file in your project root is now read and enforced by **Anthropic's, Google's, Microsoft's, MCP's, and the browser harness's runtimes** — without any platform-specific edits.

```
my-agent-project/
├── AGENTS.md          # what the agent does
├── SKILL.md           # how the agent does it
└── WARD.md            # what the agent can't do  ← all five surfaces respect this
```

---

### 🌐 Browser agent security (Q3) — fifth enforcement surface

[`@weave_protocol/browser`](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser) adds runtime IPI (indirect prompt injection) scanning to browser-driving agents. 33 detection patterns cover the documented threat surface: hidden CSS payloads, role-hijack directives, tool-call mimicry, action-injection directives, payment-recipient proximity patterns (Atlan), copyright-DoS markers (Forcepoint), and more.

Pair with the [Browser Guard extension](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser-extension) for client-side visibility into what your agent sees vs. what you see.

**[See browser README →](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser)**

---

### 📊 State of AI Agent Security: Q3 2026 Report

Industry analysis of agent security trends, platform maturity, supply chain risks, and market gaps. Live at: **[tyox-all.github.io/Weave_Protocol/q3-2026.html](https://tyox-all.github.io/Weave_Protocol/q3-2026.html)**

---

### Previously shipped (Q3)

- **adapter-msaf v0.1.0** — Microsoft Agent Framework enforcement via middleware. `WardMiddleware` class, one-line integration, Azure credential heuristic.
- **adapter-antigravity v0.1.0** — Google Antigravity enforcement. One install protects desktop + `agy` CLI + SDK.
- **adapter-claudecode v0.1.0** — Claude Code enforcement via PreToolUse hooks.
- **Hundredmen v1.1.0** — WARD.md is now the first gate in the MCP decision flow, ahead of reputation/drift/approval.
- **WARD.md v0.1.0** — Agent security policy standard. Ten domains: filesystem, network, capabilities, data boundaries, behavioral limits, multi-agent, compliance, verification, threat model, incident response. [Spec →](https://github.com/Tyox-all/Weave_Protocol/blob/main/ward/SPEC.md)
- **Tollere v0.2.2** — Multi-channel supply chain security. npm, PyPI, Cargo, Go, Maven, Docker Hub, VS Code Marketplace, Open VSX, JetBrains. Sandwich pattern detection.
- **Weave CLI v0.1.0 + Full Bundle v0.1.0** — `weave init` / `audit` / `dashboard` / `doctor`. One-command security setup.

---

## 📦 Packages

The suite is now organized into three layers — **defense**, **offensive**, and **operations**. All 17 packages live on npm under the `@weave_protocol` scope, plus one Python package on PyPI.

### 🛡️ Defense Layer (12 packages)

The packages that keep your agent within policy: declare it, enforce it across every harness, scan everything that enters, encrypt everything that exits.

| Package | Version | Description |
|---|---|---|
| [🛡️ @weave_protocol/ward](https://github.com/Tyox-all/Weave_Protocol/blob/main/ward) | 0.3.9 | **WARD.md** — agent security policy standard (parser, validator, runtime checks, shared tool-call evaluator, dashboard reporting) |
| [🛡️ @weave_protocol/adapter-claudecode](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-claudecode) | 0.5.0 | **Claude Code adapter** — enforces WARD.md via PreToolUse hooks; Mund pre-install hooks for skills + MCP |
| [🛡️ @weave_protocol/adapter-antigravity](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-antigravity) | 0.5.0 | **Google Antigravity adapter** — enforces WARD.md across desktop, `agy` CLI, and SDK; Mund pre-install hooks |
| [🛡️ @weave_protocol/adapter-msaf](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-msaf) | 0.4.0 | **Microsoft Agent Framework adapter** — middleware-based WARD enforcement |
| [🛡️ @weave_protocol/adapter-geminicli](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-geminicli) | 0.3.0 | **Gemini CLI adapter** — enforces WARD.md via the BeforeTool hook |
| [🛡️ @weave_protocol/adapter-codex](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-codex) | 0.3.0 | **Codex CLI adapter** — enforces WARD.md via the PreToolUse hook, including apply_patch file edits |
| [🛡️ @weave_protocol/adapter-opencode](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-opencode) | 0.3.0 | **OpenCode plugin** — enforces WARD.md on every tool call, whatever model OpenCode runs |
| [🛡️ @weave_protocol/adapter-cursor](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-cursor) | 0.3.0 | **Cursor adapter** — enforces WARD.md via Cursor's agent hooks (shell, file, MCP and tool calls) |
| [🌐 @weave_protocol/browser](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser) | 0.3.1 | **Browser agent security** — runtime IPI scanner (33 patterns) for headless agents |
| [🔍 @weave_protocol/hundredmen](https://github.com/Tyox-all/Weave_Protocol/blob/main/hundredmen) | 1.4.0 | **MCP proxy** — intercept, scan, gate tool calls; enforces WARD.md as first gate |
| [🛡️ @weave_protocol/mund](https://github.com/Tyox-all/Weave_Protocol/blob/main/mund) | 0.6.1 | **Scanner** — secrets, PII, injection, MCP vetting, pre-install checks for skills + MCP (rug pulls), OSV dependency CVEs, SARIF, threat intel |
| [🏛️ @weave_protocol/hord](https://github.com/Tyox-all/Weave_Protocol/blob/main/hord) | 0.3.2 | **Vault** — encrypted storage, sandboxing, capability tokens, attestation |
| [🔐 @weave_protocol/yoxallismus](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus) | **0.2.0-beta.1** | **Post-quantum cipher** — X25519 + ML-KEM-768 hybrid KEM · sealed boxes · cascade AEAD · Double Ratchet · locked `yoxall/2` format · ⚠️ NOT AUDITED |
| [⚖️ @weave_protocol/domere](https://github.com/Tyox-all/Weave_Protocol/blob/main/domere) | 1.7.0 | **Judge** — compliance (PCI-DSS, ISO27001, SOC2, HIPAA, GDPR, CCPA), blockchain anchoring |
| [👥 @weave_protocol/witan](https://github.com/Tyox-all/Weave_Protocol/blob/main/witan) | **1.2.2** | **Council** — multi-agent consensus & governance, autonomous spending caps (Q4 v1.1) |
| [🛂 @weave_protocol/tollere](https://github.com/Tyox-all/Weave_Protocol/blob/main/tollere) | 0.2.5 | **Customs** — supply chain security (npm, PyPI, Docker, IDE extensions, sandwich detection) |

### ⚔️ Offensive Layer (2 packages) — **NEW Q4**

The red team. We attack what we defend.

| Package | Version | Description |
|---|---|---|
| [⚔️ @weave_protocol/adversary](https://github.com/Tyox-all/Weave_Protocol/blob/main/adversary) | **0.4.2** | **Offensive engine** — 68 attacks · any model provider · LLM dynamic mutation · real Playwright browser target · real-LLM demo mode · WARD-aware attack selection |
| [🎯 @weave_protocol/agentsecbench](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench) | **0.3.1** | **Standardized benchmark** — locked suites (ASB-Browser-v1), any model provider, tier grading A–F, trophy attacks, WARD delta, paste-ready reports |

### 🔧 Operations & Integrations (5 packages, plus 1 PyPI)

The front door, the dashboard, the bridges to other frameworks.

| Package | Version | Description |
|---|---|---|
| [🕸️ @weave_protocol/cli](https://github.com/Tyox-all/Weave_Protocol/blob/main/cli) | 0.2.1 | **The `weave` CLI** — `init`, `audit`, `dashboard`, `doctor` |
| [📦 @weave_protocol/full](https://github.com/Tyox-all/Weave_Protocol/blob/main/full) | 0.5.1 | **Bundle** — installs all packages in one command |
| [🔌 @weave_protocol/api](https://github.com/Tyox-all/Weave_Protocol/blob/main/api) | 1.6.2 | **REST API + Operator Dashboard** — `npx @weave_protocol/api` → http://localhost:3000/dashboard |
| [🔗 @weave_protocol/langchain](https://github.com/Tyox-all/Weave_Protocol/blob/main/langchain) | **1.1.1** | **LangChain.js** security callbacks & tool wrappers (0 audit vulnerabilities via npm overrides) |
| [🐍 weave-protocol-llamaindex](https://github.com/Tyox-all/Weave_Protocol/blob/main/llamaindex-py) | 0.1.0 | **Python/LlamaIndex** security callbacks & tools (on PyPI) |

---

## 🤖 AI Agent Skills

Each package includes a `SKILL.md` file following the [Claude Agent Skills specification](https://docs.anthropic.com/en/docs/claude-code/skills). These teach AI agents how to use Weave Protocol tools effectively.

| Package | Skill Name | Triggers |
|---|---|---|
| 🕸️ CLI | `weave-cli` | set up Weave, init project, scaffold security, audit, dashboard, doctor |
| 🛡️ Ward | `ward` | WARD.md, agent security policy, guardrails, lock down agent |
| 🛡️ adapter-claudecode | `adapter-claudecode` | secure Claude Code, install WARD hooks, block Claude Code actions |
| 🛡️ adapter-antigravity | `adapter-antigravity` | secure Antigravity, agy hooks, block GCP credential reads |
| 🛡️ adapter-msaf | `adapter-msaf` | secure MSAF agent, WardMiddleware, lock down Copilot SDK, Azure enforcement |
| 🌐 browser | `browser-security` | secure browser agent, IPI scanning, hidden CSS detection, page-context safety |
| 🛡️ Mund | `security-scanning` | scan, detect secrets, check injection, vet MCP server, threat intel |
| 🏛️ Hord | `encrypting-data` | encrypt, decrypt, vault, Yoxallismus, protect |
| 🔐 Yoxallismus | `pq-crypto` | post-quantum, ML-KEM, Kyber, hybrid KEM, PQ-hybrid, quantum-safe |
| ⚖️ Domere | `compliance-auditing` | audit, checkpoint, SOC2, HIPAA, PCI-DSS, GDPR, CCPA, blockchain |
| 👥 Witan | `consensus-governance` | consensus, vote, approve, policy, escalate |
| 🔍 Hundredmen | `security-inspection` | intercept, drift, reputation, approve, block, live feed, enforce WARD |
| 🛂 Tollere | `supply-chain-security` | npm install, docker pull, install extension, typosquat, CVE, sandwich pattern |
| ⚔️ Adversary | `adversarial-testing` | red-team agent, attack, penetration test, find vulnerabilities, IPI test, run attack corpus |
| 🎯 AgentSecBench | `security-benchmarking` | benchmark agent, security score, tier grade, ASB-Browser, citable security report, compare runs |
| 🔗 Langchain | `langchain-security` | LangChain, callback, secure tool, RAG security, PII redaction |
| 🔌 API | `weave-api-calling` | REST API, HTTP endpoint, curl, fetch |

**Installation:**

The SKILL.md format is shared across Claude Code and Antigravity, so the same files work for both — only the install path differs.

```bash
git clone https://github.com/Tyox-all/Weave_Protocol.git
cd Weave_Protocol

# For Claude Code:
mkdir -p ~/.claude/skills/weave-protocol
cp */SKILL.md ~/.claude/skills/weave-protocol/

# For Google Antigravity (global, all sessions):
mkdir -p ~/.gemini/antigravity-cli/skills/weave-protocol
cp */SKILL.md ~/.gemini/antigravity-cli/skills/weave-protocol/

# Or per-project under .agents/:
mkdir -p .agents/skills/weave-protocol
cp /path/to/Weave_Protocol/*/SKILL.md .agents/skills/weave-protocol/
```

For **Microsoft Agent Framework**, skills aren't used — MSAF is code-level. Use the `WardMiddleware` class from `@weave_protocol/adapter-msaf` instead.

---

## 🚀 Quick Start

### Option 1: Guided setup (recommended)

```bash
npx @weave_protocol/cli init
```

### Option 2: Install everything

```bash
npm install @weave_protocol/full
```

### Option 3: Install individual packages

```bash
npm install @weave_protocol/mund @weave_protocol/tollere @weave_protocol/ward
```

### Option 4: Benchmark first, defend second

```bash
# See what attacks land on your agent before you start hardening
npx @weave_protocol/agentsecbench run --measure-ward-delta
```

### Claude Desktop Integration (MCP)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mund":       { "command": "npx", "args": ["-y", "@weave_protocol/mund"] },
    "hord":       { "command": "npx", "args": ["-y", "@weave_protocol/hord"] },
    "domere":     { "command": "npx", "args": ["-y", "@weave_protocol/domere"] },
    "hundredmen": { "command": "npx", "args": ["-y", "@weave_protocol/hundredmen"] },
    "tollere":    { "command": "npx", "args": ["-y", "@weave_protocol/tollere"] }
  }
}
```

### Claude Code / Antigravity / MSAF Integration

```bash
# Anthropic
npm install -g @weave_protocol/adapter-claudecode && weave-claude-code init

# Google
npm install -g @weave_protocol/adapter-antigravity && weave-antigravity init

# Microsoft (code-level)
npm install @weave_protocol/adapter-msaf
```

```typescript
import { WardMiddleware } from '@weave_protocol/adapter-msaf';
const ward = new WardMiddleware();
agent.useFunctionMiddleware(ward.functionMiddleware());
```

Drop a `WARD.md` in your project root. Any (or all) of the adapters will gate every tool call.

---

## ✨ Package Details

### 🕸️ CLI — One Command for Everything

```bash
npx @weave_protocol/cli init        # detect framework, scaffold middleware
npx @weave_protocol/cli audit       # supply chain scan (Tollere)
npx @weave_protocol/cli dashboard   # launch monitoring UI
npx @weave_protocol/cli doctor      # environment health check
```

📄 **Skill:** [`weave-cli`](https://github.com/Tyox-all/Weave_Protocol/blob/main/cli/SKILL.md)

---

### 🛡️ Ward — The Policy Standard

WARD.md files declare what an agent is allowed to do, version-controlled alongside `AGENTS.md` and `SKILL.md`.

| Section | Controls |
|---|---|
| **Filesystem** | Read/write/execute/delete/list rules with glob patterns |
| **Network** | Outbound HTTP allowlist with optional method restrictions |
| **Capabilities** | Tools the agent may invoke (with optional approval gating) |
| **Data Boundaries** | Egress classifications (PII, PHI, credentials...) and redaction |
| **Behavioral Limits** | Iterations, runtime, cost, tokens, tool calls |
| **Multi-Agent** | Trust chain, isolation level, semantic drift threshold |
| **Compliance** | SOC2 / HIPAA / GDPR / CCPA / ISO27001 / PCI-DSS |
| **Verification** | Attestation backend (Dōmere), blockchain, frequency |
| **Threat Model** | In-scope / out-of-scope threats |
| **Incident Response** | Actions on violation (log / alert / terminate / attest) |

Enforced at runtime by five independent surfaces: Hundredmen (MCP), adapter-claudecode (Claude Code), adapter-antigravity (Antigravity), adapter-msaf (Microsoft Agent Framework), and browser (Browser agents).

📄 **Skill:** [`ward`](https://github.com/Tyox-all/Weave_Protocol/blob/main/ward/SKILL.md) · 📋 **Spec:** [WARD.md SPEC →](https://github.com/Tyox-all/Weave_Protocol/blob/main/ward/SPEC.md)

---

### 🛡️ The Harness Adapters

All four enforcement surfaces share the same WARD.md file. Pick the adapter(s) for your harness:

- **[adapter-claudecode](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-claudecode)** — Claude Code via PreToolUse hooks
- **[adapter-antigravity](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-antigravity)** — Google Antigravity (one install, three surfaces)
- **[adapter-msaf](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-msaf)** — Microsoft Agent Framework via middleware
- **[browser](https://github.com/Tyox-all/Weave_Protocol/blob/main/browser)** — Browser agents (Playwright/Stagehand/Puppeteer-driven), 33-pattern IPI scanner

WARD resolution (all adapters): `$WEAVE_WARD_PATH` → `<cwd>/WARD.md` → `<cwd>/.weave/WARD.md` → harness-specific user-global location.

---

### 🛡️ Mund — The Guardian

Real-time security scanning for AI agents. Catches secrets (30+ patterns), PII, prompt injection, dangerous code, malicious MCP server descriptions. Threat intel auto-updates from community feeds.

Also runs as a CLI: `mund-mcp scan` scans files on disk and checks npm dependencies against OSV.dev. It prints a 0–100 risk score and can output text, JSON, or SARIF for GitHub code scanning. See the [OWASP coverage tables](https://github.com/Tyox-all/Weave_Protocol/blob/main/mund#%EF%B8%8F-owasp-coverage).

📄 **Skill:** [`security-scanning`](https://github.com/Tyox-all/Weave_Protocol/blob/main/mund/SKILL.md)

---

### 🏛️ Hord — The Vault

Encrypted vault storage (AES-256-GCM), PII redaction and tokenization, sandboxed execution, capability tokens with delegation, and signed attestations. Its old `YoxallismusCipher` is **deprecated**: its output can't be decrypted (YOXALL-2026-003). Use the [Yoxallismus](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus) package for encryption.

📄 **Skill:** [`encrypting-data`](https://github.com/Tyox-all/Weave_Protocol/blob/main/hord/SKILL.md)

---

### 🔐 Yoxallismus — Post-Quantum Cipher (open beta)

Standalone post-quantum cryptographic composition layer. NIST FIPS 203 (ML-KEM-768) hybridized with X25519 for the KEM, AES-256-GCM (optionally cascaded inside ChaCha20-Poly1305) for AEAD, HKDF-SHA-256 for KDF, and Signal's Double Ratchet for sessions with forward secrecy and post-compromise security. Composition over invention: all primitives are NIST-standardized or de facto industry standard.

⚠️ **EXPERIMENTAL. NOT AUDITED.** Do not use for regulated, medical, financial, or legal data. Validation is via public use, forks, and responsible disclosure — not paid audit.

```bash
# Explicit opt-in required — beta tag not installed by default
npm install @weave_protocol/yoxallismus

# CLI subcommands
weave-yoxall status         # library posture + known limitations
weave-yoxall keygen         # hybrid keypair (X25519 + ML-KEM-768)
weave-yoxall encrypt        # encrypt to a recipient's public key
weave-yoxall decrypt        # decrypt with private key
weave-yoxall test           # reproducible-claims tests
weave-yoxall audit-self     # known-attack test vectors
weave-yoxall benchmark      # perf micro-benchmarks
```

**Performance** — 3.1 ms hybrid keypair generation · 2.4 ms encap+decap · 0.024 ms AEAD (1 KB), all under the <5 ms target.

📄 **Skill:** [`pq-crypto`](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/SKILL.md) · 📋 **Threat model:** [THREAT_MODEL.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/THREAT_MODEL.md) · 🔒 **Disclosure:** [SECURITY.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/yoxallismus/SECURITY.md)

---

### ⚖️ Domere — The Judge

Enterprise-grade verification, orchestration, compliance, and audit infrastructure. SOC2, HIPAA, PCI-DSS, ISO27001, GDPR, CCPA. Solana and Ethereum blockchain anchoring for immutable audit trails.

**Blockchain Anchoring:**

- Solana Mainnet: `6g7raTAHU2h331VKtfVtkS5pmuvR8vMYwjGsZF1CUj2o`
- Solana Devnet: `BeCYVJYfbUu3k2TPGmh9VoGWeJwzm2hg2NdtnvbdBNCj`
- Ethereum: `0xAA8b52adD3CEce6269d14C6335a79df451543820`

📄 **Skill:** [`compliance-auditing`](https://github.com/Tyox-all/Weave_Protocol/blob/main/domere/SKILL.md)

---

### 👥 Witan — The Council

Multi-agent consensus and governance. Unanimous, majority, weighted, and quorum protocols. Rule enforcement, escalation, agent bus.

**New in v1.1.0** — autonomous spending caps. Per-window budgets on LLM cost, tokens, tool calls, and per-tool spend limits. Gated by three actions: `block`, `require_approval`, `notify`. Multi-provider LLM pricing built in (Anthropic, OpenAI, Google, local). Interactive TTY prompt or async callback for approval workflows. Safe defaults for non-interactive contexts.

```bash
npx @weave_protocol/witan spending caps        # inspect WARD.md spending caps
npx @weave_protocol/witan spending simulate    # dry-run scenarios
```

```typescript
import { SpendingTracker } from '@weave_protocol/witan/spending';

const tracker = new SpendingTracker({
  caps: [{ window: 'day', budget: { usd: 5.00 }, onExceeded: 'require_approval' }],
});
const check = await tracker.checkAction({ kind: 'tool', tool: 'send_payment', amountUSD: 1000 });
if (check.blocked) throw new Error(check.reason);
if (check.requiresApproval && !(await check.approve!())) throw new Error('denied');
```

📄 **Skill:** [`consensus-governance`](https://github.com/Tyox-all/Weave_Protocol/blob/main/witan/SKILL.md)

---

### 🔍 Hundredmen — The Watchers

Real-time MCP security proxy. v1.1.0 enforces WARD.md as the first gate in the decision flow, ahead of reputation, drift, and approval checks.

📄 **Skill:** [`security-inspection`](https://github.com/Tyox-all/Weave_Protocol/blob/main/hundredmen/SKILL.md)

---

### 🛂 Tollere — The Customs Inspector

Supply chain security for AI-generated code. Catches malicious packages, Docker images, and IDE extensions **before** they reach `node_modules/`, your container, or your editor. npm, PyPI, Cargo, Go, Maven, Docker Hub, VS Code Marketplace, Open VSX, JetBrains.

📄 **Skill:** [`supply-chain-security`](https://github.com/Tyox-all/Weave_Protocol/blob/main/tollere/SKILL.md)

---

### ⚔️ Adversary — The Red Team

Where the other packages defend, Adversary attacks. 68 documented and novel attacks across 5 categories: IPI (33), tool-use coercion (15), jailbreak (10), extraction (5), goal corruption (5). Three targets: pattern-mock (CI smoke tests, no API), real-LLM (`--real` via Anthropic API, Claude Haiku 5.5 by default), and real-browser (Playwright with four breach signal channels: network, form, DOM, console). WARD-aware attack selection prioritizes probes against capabilities your policy claims to enforce.

**v0.3 dynamic mutation (`--dynamic`):** when a target refuses but still engages with an attack (a half-block), an LLM writes a variant with the same intent and Adversary retries, up to `--dynamic-max-retries` (default 2). This tests whether a safeguard generalizes or only caught the original wording. The corpus stays fixed. Every attempt is recorded in `Finding.attempts[]`, and existing scorecard consumers keep working. In the first live run on Claude Haiku 5.5, 2 of 5 attacks landed only through a variant, for $0.003 total. If the API fails on every call, Adversary now exits with the error instead of reporting a clean score.

```bash
npx @weave_protocol/adversary demo               # mock, ~50ms
npx @weave_protocol/adversary demo --real        # real LLM (Haiku 5.5)
npx @weave_protocol/adversary demo --real --provider=deepseek --model=<id>   # any provider
npx @weave_protocol/adversary demo --real --dynamic   # + LLM variants on half-blocks
npx @weave_protocol/adversary attack --url=...   # real browser agent
npx @weave_protocol/adversary demo --real --redact-evidence   # shareable scorecard
```

Locked scorecard schema v1.0 — consumed unchanged by AgentSecBench.

📄 **Skill:** [`adversarial-testing`](https://github.com/Tyox-all/Weave_Protocol/blob/main/adversary/SKILL.md)

---

### 🎯 AgentSecBench — The Benchmark

The interpretation layer on top of Adversary. Locked, versioned attack suites that produce tier-graded reports. `ASB-Browser-v1` (v1.0) is 40 curated attacks: all 33 IPI + 4 critical tool-coercion + 3 highest-impact extraction.

```bash
npx @weave_protocol/agentsecbench run                          # default suite, tier-graded report
npx @weave_protocol/agentsecbench run --measure-ward-delta     # quantify policy effectiveness
npx @weave_protocol/agentsecbench run --real --provider=gemini --model=<id>   # grade a live model
npx @weave_protocol/agentsecbench compare baseline.json new.json
```

Tier grades A–F, four trophy attacks (Atlan, EchoLeak, Brave/Comet, Forcepoint), category gap analysis, optional WARD delta, plain-English interpretation prose. Reports are paste-ready Markdown — for blog posts, RFP responses, vendor audits, internal reviews.

📄 **Skill:** [`security-benchmarking`](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench/SKILL.md) · 📋 **Methodology:** [METHODOLOGY.md →](https://github.com/Tyox-all/Weave_Protocol/blob/main/agentsecbench/METHODOLOGY.md)

---

### 🔌 API + Operator Dashboard

```bash
npx @weave_protocol/api
# → http://localhost:3000/dashboard
```

Live monitoring across all five enforcement surfaces in one view. The dashboard renders WARD.md at the top of a hierarchy diagram, fanning out to your configured enforcers (Hundredmen + the three vendor adapters + browser). Surfaces you're not using appear dimmed, so it's instantly clear what's protecting your agent versus what's available.

Includes a live activity feed (allows / denies / IPI detections / approvals), a WARD policy panel, and 24-hour aggregate stats. Auto-refreshes every 5 seconds. Monochrome design — built for ops rooms, not marketing decks.

📄 **Skill:** [`weave-api-calling`](https://github.com/Tyox-all/Weave_Protocol/blob/main/api/SKILL.md)

---

### 🔗 Langchain — The Bridge

Security integration for LangChain.js applications. Drop-in callbacks, secured tool wrappers, RAG retriever scanning with PII redaction.

📄 **Skill:** [`langchain-security`](https://github.com/Tyox-all/Weave_Protocol/blob/main/langchain/SKILL.md)

---

## 🏗️ Architecture

```mermaid
flowchart TD
    CLI["🕸️ <b>weave init / audit</b><br/><i>front door — @weave_protocol/cli</i>"]
    WARD["🛡️ <b>WARD.md</b><br/><i>policy standard — declares what the agent can't do</i>"]
    CLI --> WARD

    WARD -.->|enforced at runtime by| HM
    WARD -.->|enforced at runtime by| CC
    WARD -.->|enforced at runtime by| AG
    WARD -.->|enforced at runtime by| MSAF
    WARD -.->|enforced at runtime by| BR

    HM["🔍 <b>Hundredmen</b><br/>MCP layer<br/><i>open standard</i>"]
    CC["🛡️ <b>adapter-claudecode</b><br/>Anthropic<br/>✅ Live"]
    AG["🛡️ <b>adapter-antigravity</b><br/>Google · desktop + agy + SDK<br/>✅ Live"]
    MSAF["🛡️ <b>adapter-msaf</b><br/>Microsoft · middleware<br/>✅ Live"]
    BR["🌐 <b>browser</b><br/>Browser agents<br/>✅ Live"]

    CC -.->|Mund hooks: skills + MCP servers| MUND
    AG -.->|Mund hooks: skills + MCP servers| MUND

    HM --> AGENT
    CC --> AGENT
    AG --> AGENT
    MSAF --> AGENT
    BR --> AGENT

    subgraph AGENT["🤖 AI Agent System"]
        direction TB
        subgraph CORE["Defense — Core security"]
            direction LR
            MUND["🛡️ Mund<br/>Guardian<br/><i>scanning · pre-install checks</i>"]
            HORD["🏛️ Hord<br/>Vault<br/><i>secrets · isolated sandbox</i>"]
            YOX["🔐 Yoxallismus<br/>PQ cipher<br/><i>beta</i>"]
            DOMERE["⚖️ Domere<br/>Judge<br/><i>compliance</i>"]
            WITAN["👥 Witan<br/>Council<br/><i>consensus</i>"]
        end
        subgraph OPS["Operations"]
            direction LR
            TOLLERE["🛂 Tollere<br/>Customs<br/><i>supply chain</i>"]
            API["🔌 API + Dashboard<br/><i>REST + UI</i>"]
            LC["🔗 LangChain bridge"]
        end
        CORE --> OPS
    end

    subgraph OFFENSIVE["⚔️ Offensive — we attack what we defend"]
        direction LR
        MUT["🧬 <b>Dynamic mutation</b><br/>LLM variants on half-blocks<br/><i>v0.3</i>"]
        ADV["⚔️ <b>Adversary</b><br/>68 attacks · 5 categories<br/><i>offensive engine</i>"]
        MUT -.->|retries with variant| ADV
        ASB["🎯 <b>AgentSecBench</b><br/>locked suites · tier A–F<br/><i>citable benchmark</i>"]
        ADV --> ASB
    end

    subgraph EXTERNAL["🌍 External integrations"]
        direction LR
        OSV["📚 OSV.dev<br/><i>dependency CVEs</i>"]
        GHCS["📋 GitHub code scanning<br/><i>SARIF alerts</i>"]
    end

    OSV -.->|advisories, cached offline| MUND
    MUND -.->|SARIF 2.1.0| GHCS

    AGENT -.->|attacked by| OFFENSIVE
    OFFENSIVE -.->|scorecards inform| WARD

    classDef policy fill:#1f2937,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef enforcer fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef core fill:#312e81,stroke:#818cf8,stroke-width:1px,color:#fff
    classDef ops fill:#1e3a8a,stroke:#60a5fa,stroke-width:1px,color:#fff
    classDef offensive fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff
    classDef external fill:#374151,stroke:#9ca3af,stroke-width:1px,color:#fff

    class CLI,WARD policy
    class HM,CC,AG,MSAF,BR enforcer
    class MUND,HORD,DOMERE,WITAN,YOX core
    class TOLLERE,API,LC ops
    class ADV,ASB,MUT offensive
    class OSV,GHCS external
```

The diagram shows the loop. Defense surfaces enforce the policy at runtime. The offensive engine attacks the agent. Scorecards feed back into WARD as new evidence — what attacks land, which need new policy domains, what regressed since the last release. **The loop is what makes the moat.**

---

## 🔐 Security Model

Defense-in-depth across the entire AI agent lifecycle, validated continuously by an offensive engine that lives in the same monorepo:

1. **🛡️ Ward** declares what the agent can and can't do (policy-as-code)
2. **🛡️ Harness adapters** enforce WARD inside the IDE / CLI / framework:
   - `adapter-claudecode` for Claude Code (PreToolUse hooks)
   - `adapter-antigravity` for Google Antigravity (PreToolUse hooks across desktop/CLI/SDK)
   - `adapter-msaf` for Microsoft Agent Framework (middleware pipeline)
   - `browser` for browser-driving agents (runtime IPI scanning)
3. **🛂 Tollere** inspects every dependency, image, and extension before it enters your project
4. **🛡️ Mund** scans all inputs for threats before processing
5. **🏛️ Hord** encrypts sensitive data at rest and in transit
6. **⚖️ Domere** logs all actions with tamper-evident checksums and blockchain anchoring
7. **👥 Witan** requires consensus for high-risk operations
8. **🔍 Hundredmen** intercepts and gates tool calls in real-time — enforcing WARD policy at the MCP layer
9. **🔗 Langchain / Python** secures LangChain.js and LlamaIndex chains and agents
10. **⚔️ Adversary** attacks the entire stack with 68 documented and novel attacks
11. **🎯 AgentSecBench** scores it, grades it A–F, and reports it in a standardized, citable format

### CORS Model Integration

| CORS Layer | Weave Package | Function |
|---|---|---|
| **Policy** | 🛡️ Ward | Declares allowed/denied actions, behavioral limits, attestation requirements |
| **Policy Enforcement (Claude Code)** | 🛡️ adapter-claudecode | Reads WARD, gates Claude Code tool calls via hooks |
| **Policy Enforcement (Antigravity)** | 🛡️ adapter-antigravity | Reads WARD, gates Antigravity calls across desktop/CLI/SDK |
| **Policy Enforcement (MSAF)** | 🛡️ adapter-msaf | Reads WARD, gates Microsoft Agent Framework calls via middleware |
| **Policy Enforcement (Browser)** | 🌐 browser | Runtime IPI scanning for browser-driving agents |
| **Policy Enforcement (MCP)** | 🔍 Hundredmen | Reads WARD, gates tool calls at the MCP layer |
| **Supply Chain** | 🛂 Tollere | Vets dependencies, images, extensions before install |
| **Origin Validation** | 🛡️ Mund | Validates input sources, detects injection |
| **Context Integrity** | 🏛️ Hord | Protects data integrity through encryption |
| **Deterministic Enforcement** | ⚖️ Domere | Ensures consistent policy application |
| **Adversarial Validation** | ⚔️ Adversary + 🎯 AgentSecBench | Continuously tests every layer above |

---

## 🛠️ Development

```bash
git clone https://github.com/Tyox-all/Weave_Protocol.git
cd Weave_Protocol

# Build each package
for pkg in mund hord domere witan hundredmen tollere langchain api cli ward \
           adapter-claudecode adapter-antigravity adapter-msaf browser \
           adversary agentsecbench; do
  (cd $pkg && npm install && npm run build)
done
```

---

## 🗺️ Roadmap

### Q1 2027: coming soon

The full Q1 2027 roadmap is on its way. Planned so far:

- **More harness adapters: done.** [Gemini CLI](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-geminicli), [Codex CLI](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-codex), [OpenCode](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-opencode) and [Cursor](https://github.com/Tyox-all/Weave_Protocol/blob/main/adapter-cursor) now enforce the same `WARD.md` through Ward's shared evaluator. Next is adding them to the dashboard.
- **Model-endpoint guardrails.** A WARD network rule and a Mund check that flag secrets or personal data sent to model endpoints your policy doesn't list.

Everything shipped through Q4 2026 is under [What's New](#-whats-new) and in each package's README.

---

## 🤝 Contributing

Bug reports and feature requests welcome via [GitHub Issues](https://github.com/Tyox-all/Weave_Protocol/issues).

For security issues, please see [SECURITY.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/SECURITY.md).

For all other inquiries: **<TYox-all@tutamail.com>**

See [CONTRIBUTING.md](https://github.com/Tyox-all/Weave_Protocol/blob/main/CONTRIBUTING.md) for guidelines.

---

## 📄 License

Apache 2.0 — See [LICENSE](https://github.com/Tyox-all/Weave_Protocol/blob/main/LICENSE)

---

## 🔗 Links

- **GitHub:** <https://github.com/Tyox-all/Weave_Protocol>
- **npm packages:** <https://www.npmjs.com/~tyox-all>
- **PyPI:** <https://pypi.org/project/weave-protocol-llamaindex/>
- **MCP Registry:** <https://registry.modelcontextprotocol.io> (search "mund")
- **Q3 2026 Report:** <https://tyox-all.github.io/Weave_Protocol/q3-2026.html>
- **Adversary on npm:** <https://www.npmjs.com/package/@weave_protocol/adversary>
- **AgentSecBench on npm:** <https://www.npmjs.com/package/@weave_protocol/agentsecbench>

---

*Built with ❤️ for the AI agent ecosystem. We attack what we defend.*
