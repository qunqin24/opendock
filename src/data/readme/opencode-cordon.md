<div align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/banner.svg" alt="opencode-cordon — a permission cordon for OpenCode 2" width="100%" />

  <h3>Declarative permission policy with an audit trail for OpenCode 2.</h3>

  <p>
    Rules live in your repo. Decisions are enforced at <code>permission.evaluate</code>.<br/>
    Every decision is logged, redacted, and one command away from a shareable HTML report.
  </p>

  <p>
    <a href="https://www.npmjs.com/package/opencode-cordon"><img src="https://img.shields.io/npm/v/opencode-cordon.svg" alt="npm version" /></a>
    <a href="https://github.com/wangyuchen5110/opencode-cordon/actions/workflows/ci.yml"><img src="https://github.com/wangyuchen5110/opencode-cordon/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A5%2020-1f2937" alt="node >= 20" /></a>
    <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-2.2.x-1f2937" alt="OpenCode 2.2.x" /></a>
    <a href="docs/REGRESSION.md"><img src="https://img.shields.io/badge/verified-2.2.5-3fb950" alt="verified on 2.2.5" /></a>
  </p>
</div>

---

**The problem in one paragraph.** An OpenCode agent reads files, runs shell commands, edits code and pushes branches. Native permissions are a coarse global switch, they are not reviewable per repository, and after a session there is no record of *which rule allowed what*. A `.env` read silently becomes a provider call. A `rm -rf` succeeds and nobody can reconstruct why.

**What this adds.** A small policy file that lives in your repo (`opencode-cordon`), enforced at the plugin hook and written to an append-only log. It **only tightens, never loosens**: `deny` always wins, `ask` only upgrades an `allow`, and a rule miss leaves OpenCode's own decision untouched. A misconfiguration can make the agent too strict — it can never silently open a door.

```console
$ cordon evaluate --action shell --command "rm -rf /tmp/x"
deny  rule preset:destructive — irreversible shell command

$ cordon audit --log .opencode/cordon/audit.jsonl --html report.html
cordon audit …  decisions 7  deny 2 · ask 0 · pass 5  …  html report.html
```

## See it in action

The screenshot below is the real report from a live OpenCode 2.2.5 session (see [`docs/REGRESSION.md`](docs/REGRESSION.md)):

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/audit-report.png" alt="opencode-cordon HTML audit report: 25 events, 2 denied" width="92%" />
</p>

In that run the agent was told to read `.env` and run `rm -rf ./scratch`, with `--auto` on (so the native decision was "allow" for `rm` and an auto-approved "ask" for `.env`):

| Attempt | Native | cordon | Result |
| --- | --- | --- | --- |
| `read .env` | `ask` | **`deny`** | `permission.rejected — regression: env files are off limits` |
| `shell: rm -rf ./scratch` | `allow` | **`deny`** | `Unable to execute command`, `scratch/keep.txt` survived |

Both decisions were written to the JSONL log with rule id and reason. That is the whole point: **the agent is stopped, and you can prove who stopped it.**

## How it works

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/architecture.svg" alt="agent tool call → permission.evaluate → cordon policy decision → deny/ask or native decision untouched → JSONL audit → HTML report" width="100%" />
</p>

The plugin is an OpenCode 2 server part that registers four hooks:

- `permission.evaluate` — evaluates the policy and tightens the effect before OpenCode acts;
- `tool.execute.before` / `tool.execute.after` — records every tool call and its outcome;
- `shell.create.before` — records every shell command that is created.

### The one rule that matters: tighten only

| native `effect` | cordon `deny` | cordon `ask` | cordon `allow` / no match |
| --- | --- | --- | --- |
| `allow` | **deny** | **ask** | allow (untouched) |
| `ask` | **deny** | ask (untouched) | ask (untouched) |
| `deny` | deny (untouched) | deny (untouched) | deny (untouched) |

A user rule with `effect: "allow"` never widens anything — it *exempts* a matching call from later cordon rules. That is the supported way to carve exceptions out of a preset.

## Install

Requires **OpenCode 2.2.x** for the plugin part, and **Node ≥ 20** for the CLI (ESM, zero runtime dependencies).

```bash
# plugin (loaded by OpenCode on next start)
opencode plugin add opencode-cordon

# CLI (optional; npx works too)
npm install -g opencode-cordon    # short alias: cordon
```

The CLI works on its own: policy validation and audit reports do not need a running OpenCode.

## Quick start (5 minutes)

```bash
# 1. create a policy for the current project
npx opencode-cordon init
# → .opencode/cordon.jsonc (balanced preset by default)

# 2. validate it — 0 = ok, 2 = invalid
npx opencode-cordon check

# 3. try decisions and their exit codes
npx opencode-cordon evaluate --action shell --command "rm -rf ./build"        # 20 = deny
npx opencode-cordon evaluate --action shell --command "git push origin main"  # 10 = ask
npx opencode-cordon evaluate --action read  --path "/repo/README.md"          #  0 = pass

# 4. render the audit report
npx opencode-cordon audit --log .opencode/cordon/audit.jsonl --html audit.html --open
```

## Policy file

Two locations, same format:

| Location | Purpose |
| --- | --- |
| `.opencode/cordon.jsonc` | project policy, committed and reviewed with the repo |
| `~/.config/opencode/cordon.jsonc` | global policy, shared across projects |

```jsonc
{
  "version": 1,
  "preset": "balanced",            // balanced (default) | strict | relaxed
  "audit": {
    "enabled": true,
    "path": ".opencode/cordon/audit.jsonl",
    "redact": true,
    "storeCommand": true,
    "commandHash": false           // true = only sha256 of the command, no plaintext
  },
  "rules": [
    {
      "id": "no-destructive",
      "effect": "deny",            // deny | ask | allow
      "match": { "action": "shell", "command": "rm -rf *" },
      "reason": "destructive shell command"
    },
    {
      "id": "protect-env",
      "effect": "deny",
      "match": { "action": "read|edit", "path": ["**/.env*", "**/.ssh/**"] },
      "reason": "secrets never enter the context"
    },
    {
      "id": "exempt-fixtures",
      "effect": "allow",
      "match": { "action": "read", "path": "test/fixtures/**" },
      "reason": "tests may read fixtures"
    }
  ]
}
```

### Fields

| Field | Type | Notes |
| --- | --- | --- |
| `version` | number | currently `1` |
| `preset` | string | `balanced` (default) / `strict` / `relaxed` |
| `audit.enabled` | boolean | write the JSONL log (default `true`) |
| `audit.path` | string | default `.opencode/cordon/audit.jsonl` |
| `audit.redact` | boolean | redact secrets before writing (default `true`) |
| `audit.storeCommand` | boolean | store redacted command text (default `true`) |
| `audit.commandHash` | boolean | store only the SHA-256 of commands (default `false`) |
| `rules` | array | user rules, evaluated before preset rules |

A policy without `preset` falls back to `balanced`. **No policy file at all means the plugin stays idle** — it logs one line and invents no rules.

### Matching

`match` supports five fields; every field present must match (AND), array values are OR:

| Field | Matches against | Path mode |
| --- | --- | --- |
| `action` | the permission action (`shell`, `read`, `edit`, …) | no |
| `tool` | the tool name (falls back to `action`) | no |
| `command` | the shell command(s) of the request | no (`*` crosses spaces) |
| `path` | file paths of the request | yes (`*` stays in one segment) |
| `agent` | the agent id | no |

Globs: `*` (any characters except `/` in path mode), `**` (across directories, `**/` may match zero directories), `?` (one character), `{a,b}` (alternatives), `a|b` (alternatives for action/tool/agent). Matching is case-insensitive.

Evaluation order: **user rules in declaration order, then preset rules; first match wins.** A miss leaves the native decision untouched.

### Presets

| Preset | What it adds |
| --- | --- |
| `relaxed` | denies secret paths and irreversible shell commands; asks for outbound network commands |
| `balanced` | `relaxed` + asks for `git push`, publish/release commands and web fetch |
| `strict` | `balanced` + asks for every shell command and every edit |

Run `cordon check` to see how many user and preset rules are active.

## CLI

| Command | What it does | Exit codes |
| --- | --- | --- |
| `check [--policy f] [--json]` | validate the policy, print effective rules | 0 ok, 2 invalid |
| `evaluate --action a [--command c] [--path p] [--tool t] [--agent id]` | decide a single call | 0 pass, 10 ask, 20 deny |
| `audit --log f [--html out] [--open] [--json]` | summarise a log, render HTML | 0 ok, 4 missing log |
| `init [--preset p] [--out f] [--force]` | write a starter policy | 0 ok, 1 exists/usage |
| `redact [file]` | redact secrets from a file or stdin | 0 |

## Audit log and report

Each JSONL line is one event (`decision`, `tool` or `shell`):

```json
{"v":1,"ts":"2026-11-03T03:57:37.927Z","event":"decision","sessionID":"ses_…","agent":"build","action":"shell","decision":"deny","nativeEffect":"allow","effect":"deny","rule":"deny-rm","reason":"regression: no destructive rm","command":"rm -rf ./scratch","commandHash":"dfc8ec3b…"}
```

Fields: `ts`, `event`, `sessionID`, `agent`, `action`, `tool`, `decision` (deny/ask/allow/pass), `nativeEffect`, `effect`, `rule`, `reason`, `paths`, `command` (redacted), `commandHash`, `redactions`, and `status` / `durationMs` for tool events.

`cordon audit --html report.html` renders summary cards, the rules that fired, and a filterable timeline. Secrets are redacted before they reach the log, and every command always gets a stable hash, so records can be correlated without the plaintext.

## Verified

| Check | Result |
| --- | --- |
| Live regression | **Passed on OpenCode 2.2.5** (2026-11-03): `.env` read tightened `ask → deny`, `rm -rf ./scratch` tightened `allow → deny` under `--auto`, both logged, target file survived — [`docs/REGRESSION.md`](docs/REGRESSION.md) |
| Unit + adapter tests | **57 passing** (`node --test test/guard.test.mjs test/plugin.test.mjs`), including a suite that drives the real `@opencode/plugin` hooks through a fake context |
| Packaging | published as [`opencode-cordon`](https://www.npmjs.com/package/opencode-cordon); `npx opencode-cordon --version` works |
| CI | Node 20/22/24 × Ubuntu/Windows |

## What it is not

- **Not a sandbox.** No process, filesystem or network isolation. It sees what goes through OpenCode's permission decisions and tool/shell events; commands you run outside OpenCode are out of scope.
- **Not a replacement for native permissions.** It only tightens. To loosen something, edit OpenCode's own permission config.
- **Not a secrets manager / DLP product.** `redact` is best effort by pattern; the reliable move is a rule that keeps secret paths out of the context window.
- **Not cryptographically tamper-proof.** "Tamper-evident" means each record is bound to a rule and reason, remote commands are hashed, secrets are redacted, and the file is append-only. Anyone with local write access can still edit it — ship the JSONL to an external sink if you need real guarantees.
- **Not a V1 compatibility layer.** OpenCode 1.18.x has no equivalent permission hook.
- **Not an LLM permission reviewer.** Decisions are local, deterministic rules: no tokens, no network calls.

Full threat model and vulnerability reporting: [SECURITY.md](SECURITY.md).

## Roadmap

- [x] Live regression on OpenCode 2.2.5 and a recorded fixture of hook payloads
- [ ] `session.panel` TUI part: a live "what is being blocked right now" panel
- [ ] `cordon check --explain`: why a call matched, and what to change
- [ ] Hash-chained audit entries plus `cordon audit --verify`
- [ ] GitHub Action that fails a PR when dangerous rules are removed
- [ ] Community policy templates

## Research

This project started from a survey of the OpenCode ecosystem; the raw reports are committed:

- [`docs/research/scout-tooling.md`](docs/research/scout-tooling.md) — tooling, security, DB ops, migration
- [`docs/research/scout-visual.md`](docs/research/scout-visual.md) — TUI/visual plugins and the gaps
- [`docs/WHY.md`](docs/WHY.md) — why a policy engine + audit trail, and what a cordon is not

## Contributing

Issues and pull requests are welcome. Run `npm ci && node --test test/guard.test.mjs test/plugin.test.mjs` before sending a PR; keep the package dependency-free (`node:` built-ins only) and add a test for every new rule matcher or redaction pattern.

## License

[MIT](LICENSE) © 2026 wangyuchen5110

[English](README.md) · [简体中文](docs/README.zh-CN.md)
