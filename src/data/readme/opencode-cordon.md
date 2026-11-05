<div align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/banner.svg" alt="opencode-cordon — a permission cordon for OpenCode 2" width="100%" />

  <h3>Git-committable rules that can force-deny even when OpenCode allows.</h3>

  <p>
    A lightweight policy layer for OpenCode 2.<br>
    Rules live in your repo. They only tighten. Every decision is logged.
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

**What this is.**  
OpenCode's native permissions are a coarse global switch. You can't commit them with the repo, you can't review them in a PR, and after a session there is no record of which decision came from which rule.

`opencode-cordon` adds a small policy file (`.opencode/cordon.jsonc`) that lives in git. It hooks `permission.evaluate` and can **force-deny** actions that native permissions would have allowed. It never loosens anything.

**What it is not.**  
Not a sandbox. Not a replacement for OpenCode's own permissions. Not a secrets manager. It only sees what goes through OpenCode's permission system.

### Real example (OpenCode 2.2.5, `--auto` on)

| Attempt | Native | cordon | Result |
| --- | --- | --- | --- |
| `read .env` | `ask` | **`deny`** | blocked — secrets stay out of context |
| `rm -rf ./scratch` | `allow` | **`deny`** | blocked — file survived |

Both decisions were written to the JSONL log with the exact rule id and reason.

```bash
npx opencode-cordon init
npx opencode-cordon evaluate --action shell --command "rm -rf ./build"   # exit 20 = deny
```

## See it in action

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/audit-report.png" alt="opencode-cordon HTML audit report: 25 events, 2 denied" width="92%" />
</p>

The report above is from a live session (see [`docs/REGRESSION.md`](docs/REGRESSION.md)). The agent was told to read `.env` and run `rm -rf ./scratch`. Both were denied by cordon rules even though native permissions would have allowed or auto-approved them.

## How it works

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/architecture.svg" alt="agent tool call → permission.evaluate → cordon policy decision → deny/ask or native decision untouched → JSONL audit → HTML report" width="100%" />
</p>

The plugin registers four hooks:

- `permission.evaluate` — evaluates the policy and can tighten the effect before OpenCode acts
- `tool.execute.before` / `tool.execute.after` — records every tool call and its outcome
- `shell.create.before` — records every shell command that is created

### Tighten only

| native `effect` | cordon `deny` | cordon `ask` | cordon `allow` / no match |
| --- | --- | --- | --- |
| `allow` | **deny** | **ask** | allow (untouched) |
| `ask` | **deny** | ask (untouched) | ask (untouched) |
| `deny` | deny (untouched) | deny (untouched) | deny (untouched) |

A user rule with `effect: "allow"` never widens anything — it only exempts a matching call from later cordon rules. A misconfiguration can make the agent too strict. It can never silently open a door.

## Install

Requires **OpenCode 2.2.x** for the plugin, and **Node ≥ 20** for the CLI (zero runtime dependencies).

```bash
# plugin (loaded by OpenCode on next start)
opencode plugin add opencode-cordon

# CLI (optional; npx works too)
npm install -g opencode-cordon    # short alias: cordon
```

The CLI works on its own for policy validation and audit reports.

## Quick start

```bash
# 1. create a policy for the current project
npx opencode-cordon init
# → .opencode/cordon.jsonc (balanced preset by default)

# 2. validate it — 0 = ok, 2 = invalid
npx opencode-cordon check

# 3. try decisions
npx opencode-cordon evaluate --action shell --command "rm -rf ./build"        # 20 = deny
npx opencode-cordon evaluate --action shell --command "git push origin main"  # 10 = ask
npx opencode-cordon evaluate --action read  --path "/repo/README.md"          #  0 = pass

# 4. render the audit report
npx opencode-cordon audit --log .opencode/cordon/audit.jsonl --html audit.html --open
```

## Policy file

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
    "commandHash": false
  },
  "rules": [
    {
      "id": "no-destructive",
      "effect": "deny",
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

**No policy file means the plugin stays idle** — it logs one line and invents no rules.

### Matching

`match` fields (all present must match):

| Field | Matches | Notes |
| --- | --- | --- |
| `action` | permission action (`shell`, `read`, `edit`, …) | `a|b` for alternatives |
| `tool` | tool name | falls back to `action` |
| `command` | shell command | `*` crosses spaces |
| `path` | file paths | `*` stays in one segment |
| `agent` | agent id | |

Globs: `*`, `**`, `?`, `{a,b}`, `a|b`. Case-insensitive. User rules are evaluated first, then preset rules; first match wins. A miss leaves the native decision untouched.

A command rule is also tried against the text inside `bash -c`, `sh -c`, `powershell -Command` and `cmd /c`, including a path prefix such as `/bin/bash`. The raw command is still tested, so a wrapper can only add a match. The destructive preset also denies split `rm` flags, `Remove-Item -Recurse`, `rmdir /s`, and a force-push whose `--force` or `-f` comes after the remote. `git push origin main` still asks. `git -C repo push --force` still misses those globs.

### Presets

| Preset | What it adds |
| --- | --- |
| `relaxed` | denies secret paths and irreversible shell commands; asks for outbound network |
| `balanced` | `relaxed` + asks for `git push`, publish/release, and web fetch |
| `strict` | `balanced` + asks for every shell command and every edit |

## CLI

| Command | Exit codes |
| --- | --- |
| `check [--policy f] [--json]` | 0 ok, 2 invalid |
| `evaluate --action a [--command c] [--path p]` | 0 pass, 10 ask, 20 deny |
| `audit --log f [--html out] [--open] [--json]` | 0 ok, 4 missing log, 5 broken chain |
| `init [--preset p] [--out f] [--force]` | 0 ok, 1 exists |
| `redact [file]` | 0 |

## Audit log

Each JSONL line is one event:

```json
{"v":1,"ts":"2026-11-03T03:57:37.927Z","event":"decision","sessionID":"ses_…","agent":"build","action":"shell","decision":"deny","nativeEffect":"allow","effect":"deny","rule":"deny-rm","reason":"regression: no destructive rm","command":"rm -rf ./scratch","commandHash":"dfc8ec3b…"}
```

Secrets are redacted before writing. Every command gets a stable hash so records can be correlated without plaintext. Logs written by 0.1.5 and later also store `prev` and `hash`. `cordon audit` exits 5 when that chain breaks. Older logs have no hashes and still audit as success.

## Verified

| Check | Result |
| --- | --- |
| Live regression | Passed on OpenCode 2.2.5: `.env` and `rm -rf` both force-denied under `--auto` — [`docs/REGRESSION.md`](docs/REGRESSION.md) |
| Unit + adapter tests | 61 passing |
| Packaging | `npx opencode-cordon --version` works |
| CI | Node 20/22/24 × Ubuntu/Windows |

## Limits

- Not a sandbox. Commands you run outside OpenCode are out of scope.
- Not a replacement for native permissions. It only tightens.
- `redact` is best-effort by pattern. The reliable move is a rule that keeps secret paths out of context.
- The hash chain detects an edited, deleted or reordered line. A full rewrite can be recomputed, so the log is not tamper-proof. Ship it to an external sink if you need a stronger guarantee.
- OpenCode 1.x has no equivalent permission hook.

Full threat model: [SECURITY.md](SECURITY.md).

## Roadmap

- [x] Live regression on OpenCode 2.2.5
- [ ] Live "what is being blocked right now" TUI panel
- [ ] `cordon check --explain`
- [x] Hash-chained audit entries, checked by `cordon audit` (exit 5 when the chain breaks)
- [ ] GitHub Action that fails a PR when dangerous rules are removed
- [ ] Community policy templates

## Contributing

Issues and PRs welcome. Run `npm ci && node --test test/guard.test.mjs test/plugin.test.mjs` before sending. Keep the package dependency-free (`node:` built-ins only).

## License

[MIT](LICENSE) © 2026 wangyuchen5110

[English](README.md) · [简体中文](docs/README.zh-CN.md)
