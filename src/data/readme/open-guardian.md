# open-guardian

LLM permission judge for [OpenCode](https://opencode.ai). Inspired by Codex
Guardian: instead of approving every escalated action by hand, a fast model
reviews each one against a written policy and the session transcript, then
allows it, denies it, or escalates to you.

Every verdict scores two independent axes before deriving an outcome:

- `risk_level` — intrinsic risk of the exact action (`low` / `medium` / `high` / `critical`)
- `user_authorization` — whether *trusted* user messages authorize that specific
  action (`unknown` / `low` / `medium` / `high`)

Only user messages count as trusted evidence. Assistant output, tool results,
and quoted file contents can never expand approval scope, which blunts prompt
injection through poisoned context.

| risk | authorization | effect |
| --- | --- | --- |
| low | any | allow |
| medium | medium / high | allow |
| medium | low / unknown | ask |
| high | medium / high | ask |
| high | low / unknown | deny |
| critical | any | deny |

Judge errors, timeouts, and unparseable verdicts always fall back to `ask`, so
a broken judge degrades to OpenCode's normal permission prompt, never to
silent approval.

## Install

```jsonc
// opencode.jsonc
{
  "plugins": ["open-guardian"]
}
```

The judge only sees decisions that resolve to `ask`, so pair it with a
permissions floor. Route what you want judged to `ask`, keep the
non-negotiables as `deny` (a configured deny is final — the judge cannot
override it):

```jsonc
{
  "permissions": [
    { "action": "shell", "resource": "*", "effect": "ask" },
    { "action": "shell", "resource": "git status *", "effect": "allow" },
    { "action": "shell", "resource": "git diff *", "effect": "allow" },
    { "action": "read", "resource": "*.env", "effect": "deny" },
    { "action": "read", "resource": "*.env.*", "effect": "deny" },
    { "action": "read", "resource": "*.env.example", "effect": "allow" },
    { "action": "shell", "resource": "git push --force*", "effect": "deny" }
  ]
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "open-guardian",
      "options": {
        "model": "openai/gpt-5.6-luna",   // judge model, "provider/model-id[#variant]"
        "timeout": 15000,                  // ms before falling back to ask
        "actions": ["shell"],              // permission actions to judge
        "policy": "/path/to/policy.md",    // replace the bundled policy entirely
        "rules": "Deny anything touching production databases.", // append inline rules
        "log": false                       // decision log path, or false to disable
      }
    }
  ]
}
```

Defaults: judge `shell` only, 15s timeout, bundled `policy.md`, decisions
logged to `~/.local/share/opencode/guardian/decisions.jsonl`.

## Customizing the policy

Three layers, from broadest to narrowest:

1. **`policy` option** — path to a file that replaces the bundled policy.
   Start from [`policy.md`](./policy.md) and edit; keep the output contract
   section intact.
2. **`rules` option** — inline text appended to the policy as an extra
   section. Good for a personal rule or two without maintaining a file.
3. **`.opencode/guardian.md`** — if this file exists in the project, its
   contents are appended as project rules. Commit it so the whole team's
   judge enforces repo-specific constraints (deploy commands, migration
   safety, protected infrastructure).

Later sections take precedence when they conflict, but no layer can weaken
the critical category: secret exfiltration and irreversible destruction stay
denied.

## Decision log

Each judged action appends one JSON line with the resources, both axis scores,
the effect, and the reason:

```json
{"time":"...","action":"shell","resources":["rm -rf ~/Documents/backups"],"verdict":{"effect":"deny","risk":"high","authorization":"unknown","reason":"Irreversibly deletes a potentially important directory without trusted user authorization."}}
```

Use it to audit the judge and tune the policy.

## Policy

The bundled [`policy.md`](./policy.md) defines evidence-handling rules, the
risk taxonomy, authorization scoring, and the derivation table. Point the
`policy` option at your own file to customize any of it.

## Caveats

- OpenCode shell commands run with your full user authority and no sandbox.
  Keep destructive non-negotiables as static `deny` rules; the judge is a
  convenience layer above that floor, not a substitute for it.
- The judge sees session context. The trusted/untrusted evidence split
  mitigates prompt injection but is not a proof; `critical`-category actions
  are denied regardless of claimed authorization for that reason.
- Verdicts are cached per session and command, so a repeated command reuses
  its verdict without a second model call.
