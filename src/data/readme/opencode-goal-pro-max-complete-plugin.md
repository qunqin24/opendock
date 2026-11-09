# opencode-goal-pro-max-complete-plugin

A session-scoped `/goal` workflow for [OpenCode](https://opencode.ai/): set a goal, and the plugin auto-continues the session until the goal is marked complete with evidence, a concrete blocker is reported, a budget limit is reached, or you halt it. State persists per session, so a goal survives compaction and a restart, and the whole loop runs with no model call of its own.

## Install

```sh
npx -y opencode-goal-pro-max-complete-plugin install
```

- Writes the server entry into `opencode.json`: the `/goal` command, the agent tools, the hooks, the sidebar payload.
- Writes the TUI entry into `tui.json`, pointed at a local copy of the package, so the sidebar panel loads and not just the status line.
- Installs the shipped skill (below) into your global OpenCode skill directory. Restart OpenCode when it finishes.

From GitHub instead of npm: `npx -y github:sblattj/opencode-goal-pro-max-complete-plugin install`.

No `npx`? `sh install.sh`, or `curl -fsSL https://raw.githubusercontent.com/sblattj/opencode-goal-pro-max-complete-plugin/main/install.sh | sh`; from a clone, `node scripts/cli.mjs install`. Manual two-file install, upgrade and uninstall: [docs/install.md](docs/install.md).

Requires Node 18 or newer for the `npx` install (the plugin itself runs inside OpenCode, not under your Node) and OpenCode `>=1.17.15 <3`, both the 1.x and 2.x lines (`engines` in `package.json`; the documented OpenCode 2 caveats are in [docs/compatibility.md](docs/compatibility.md)). Re-running the installer is safe: `--dry-run` previews it, `uninstall` reverses it, `status` reports what is currently wired.

## Use

- `/goal <objective>` sets or replaces the focused goal. Flags such as `--max-turns 20` or `--budget 5m` go on the first line; everything after it is objective text, kept verbatim.
- `/goal status` reports state, budget usage and the verified action plan. `/goal list`, `/goal halt` (alias `/goal pause`), `/goal resume`, `/goal clear` cover the rest.
- A run stops only on evidence-backed completion, a concrete blocker the model cannot get past without you, a budget limit (8 hours, 100m tokens of spend; context fullness is never a stop; at 200k tokens of context the plugin asks the host to compact, tune or disable with `--compact-at`, see [forced compaction](docs/reference.md#forced-compaction)), or your `/goal halt`. Messages you send mid-goal steer it and never pause it; compactions, errors, restarts and stalls are recorded and the goal keeps going. The full list is in [docs/reference.md](docs/reference.md#when-a-goal-stops).

While a goal runs, its state rides the session title on every client, and the TUI panel renders the whole plan beside it:

```
▶ ship the release · 2/4 · 3/∞ · 2m/8h · 147k/100m · 3/7✓
```

Objective label, sequence position, turns used, elapsed time against the clock, token spend against the budget, and verified actions of the total. Every command, flag, tool, option and default is in [docs/reference.md](docs/reference.md).

The sidebar's Todo section is drawn from the same plan: while a plan exists, every `todowrite` is redrawn from the plan's actions, with any items of the model's own kept below them. `mirrorTodos: "off"` restores the host's stock behaviour.

## Why the name

"pro max complete" is a claim about process, not feature count: every behaviour is pinned by a test, most safety properties are pinned by a mutation that must turn the suite red, and each number below was re-measured on this tree before it was written down.

| Rung | Proves | Result |
|---|---|---|
| `bun run test` | an executable spec for every documented behaviour | 660 of 660 pass |
| `bun run test:mutation` | those tests are not vacuous | 99 of 99 critical mutants killed |
| `bun run benchmark:behavior` | six end-to-end autonomy scenarios | 6 of 6, 0 model calls |
| `bun run benchmark:todo-mirror` | the Todo mirror against a pre-v1.0.1 control | 0 of 8 turns diverge, 1 persistent checklist |
| `bun run release:check` | the whole gate, in order | passes in about 2.5 to 3 minutes |

The full 14-rung ladder, the review process behind the 0.11.0 defaults, the one-session measurement that drove the turn-aggregation fix, and what none of it proves, are in [docs/verification.md](docs/verification.md).

## The shipped skill

`skills/using-the-goal-plugin/SKILL.md` ships inside the package and teaches the agent, not the human, the grammar this plugin enforces silently: what it must emit to finish a goal, and what it must not do while one is running. The installer copies it verbatim into OpenCode's skill directory, where it loads whenever a goal is active. It names no package and no path, so it works the same from any install method above.

## Docs

- [docs/install.md](docs/install.md): the installer, the manual two-file form, upgrade, uninstall.
- [docs/reference.md](docs/reference.md): usage, flags, subcommands, markers, agent tools, the verified action plan, budgets and brakes, every option, state and persistence, the sidebar and its payload, plan-mode and prompt safety, compatibility, identifier policy, diagnostics, development.
- [docs/verification.md](docs/verification.md): the verification ladder, the process behind 0.11.0, and its limits.
- [docs/compatibility.md](docs/compatibility.md) and [docs/providers.md](docs/providers.md): supported surface, host versions, OpenCode 2 status, tested models.
- [docs/releasing.md](docs/releasing.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md): cutting a release, contributing, reporting a vulnerability.
- [CHANGELOG.md](CHANGELOG.md) is the authoritative record of what changed and why. Read it before trusting anything here.

## Lineage and license

Forked from [willytop8/OpenCode-goal-plugin](https://github.com/willytop8/OpenCode-goal-plugin) (MIT), continued at [sblattj/OpenCode-goal-plugin](https://github.com/sblattj/OpenCode-goal-plugin) through v0.11.0, renamed here. MIT, copyright (c) 2026 willytop8: see [LICENSE](LICENSE), retained unchanged, and [docs/reference.md#lineage](docs/reference.md#lineage) for the full credit.
