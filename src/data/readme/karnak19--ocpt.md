# ocpt

Ponytail plugin for OpenCode — makes your AI agent think like the laziest senior dev in the room.

## Install

```bash
npm install @karnak19/ocpt
```

Then add to your `opencode.json`:

```json
{
  "plugin": ["@karnak19/ocpt"]
}
```

## What it does

Before writing code, the agent stops at the first rung that holds:

1. Does this need to exist? → no: skip it (YAGNI)
2. Stdlib does it? → use it
3. Native platform feature? → use it
4. Installed dependency? → use it
5. One line? → one line
6. Only then: the minimum that works

Lazy, not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Commands

| Command | What it does |
|---------|--------------|
| `/ponytail [lite\|full\|ultra\|off]` | Set the intensity, or turn it off. No argument reports the current level. |
| `/ponytail-review` | Review the current diff for over-engineering, hands back a delete-list. |
| `/ponytail-audit` | Audit the whole repo for over-engineering, not just the diff. |
| `/ponytail-debt` | Harvest the `ponytail:` shortcuts you've deferred into a ledger. |
| `/ponytail-help` | Quick reference for the commands above. |

## Levels

| Level | What change |
|-------|------------|
| **lite** | Build what's asked, but name the lazier alternative in one line. User picks. |
| **full** | The ladder enforced. Stdlib and native first. Shortest diff, shortest explanation. Default. |
| **ultra** | YAGNI extremist. Deletion before addition. Ship the one-liner and challenge the rest of the requirement in the same breath. |

## Configuration

Set the default level with the `PONYTAIL_DEFAULT_MODE` environment variable:

```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

Or just use `/ponytail ultra` in a session to switch for that session.

## Why a standalone plugin?

The original [ponytail](https://github.com/DietrichGebert/ponytail) repo requires you to run OpenCode from a checkout of their repo. This plugin is self-contained — install it and forget it.

## License

MIT
