# opencode-vise

An [opencode](https://opencode.ai) plugin that gates an agent's changes against a
**frozen behavioural baseline** — using [vise](https://github.com/NakliTechie/vise)
as a tamper-proof judge.

Every other safety plugin blocks bad *actions* (destructive commands, secret
leaks) or applies *judgement* (LLM review). vise judges *outcomes*: it freezes a
project's observable behaviour — command outputs, exit codes, metrics — into a
committed `vise.lock`, then re-runs it against the agent's diff and returns a
fail-closed verdict. Same behaviour → green. Anything drifted → refused, with a
one-word instruction the agent obeys.

This plugin is a thin adapter. The `vise` binary stays the judge; the plugin runs
it when the agent finishes a turn and feeds the typed verdict back into the
session.

## What it does

- **Gates on `session.idle`.** When the agent finishes a turn, the plugin runs
  `vise gate --json` in the worktree and surfaces the verdict.
  - **Green** (exit 0): a quiet success toast.
  - **Not green**: the typed verdict — exit code + `next.action` (`revert`,
    `fix_probe`, `fix_invocation`, `human`, …) + detail — is posted back into the
    session so the agent knows exactly what to do.
- **Exposes two tools** the agent can call on demand: `vise_gate` (judge now) and
  `vise_status` (read-only readiness).
- **Injects vise's contract** into the system prompt, so the agent reads the exit
  codes and the closed `next.action` vocabulary natively.

## Requirements

- The [`vise`](https://github.com/NakliTechie/vise) binary on `PATH`
  (`go install github.com/NakliTechie/vise/cmd/vise@latest`).
- A committed baseline in the project: `vise init && vise record`, then commit
  `vise.lock`. Without a baseline the plugin stays inert.

## Install

Add it to your `opencode.json`:

```json
{
  "plugin": ["opencode-vise"]
}
```

With options:

```json
{
  "plugin": [["opencode-vise", { "mode": "advisory", "bin": "vise", "gateOnIdle": true }]]
}
```

| Option | Default | Meaning |
|---|---|---|
| `mode` | `"advisory"` | `advisory` surfaces the verdict without forcing a turn; `enforce` posts it as a live prompt the agent must answer. |
| `bin` | `"vise"` | Path or name of the vise binary. |
| `gateOnIdle` | `true` | Gate automatically when the agent goes idle. Set `false` to gate only via the `vise_gate` tool. |

## How it maps to vise's exit codes

| exit | verdict | `next.action` | agent does |
|---|---|---|---|
| 0 | green | `proceed` | continue |
| 1 | behaviour changed | `revert` | undo the drift, or ask an operator to re-baseline |
| 2 | harness error | `fix_probe` / `fix_invocation` / `human` | fix the probe, the command line, or stop |
| 3 | indeterminate | `human` | stop and report |
| 5 | metric | `revert` / `human` | a frozen metric regressed |

Run `vise verify` for the exact expected/got diff behind a red verdict.

## Notes / limits

- **Per-turn gating adds latency** — the probes re-run each idle. Gate on the turn
  boundary (`session.idle`), not every edit. Keep probes fast, or set
  `gateOnIdle: false` and let the agent call `vise_gate` at checkpoints.
- **A stable red state is surfaced once** per distinct `(exit, next.action)` per
  session — no idle→prompt→idle loop.
- `enforce` mode nudges once per distinct verdict; it is not a hard commit block.
  A future version may deny via the `permission.ask` hook.

## License

MIT
