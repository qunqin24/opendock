# Shiftwork

> Autonomous coding agents that work in **shifts**. Every ticket gets a fresh shift (a clean context). When a model uses up its budget or hits a provider limit, it hands the shift over to the next model, possibly from another provider.

**Status: early development (0.x).** How to set it up and use it: [docs/guide.md](docs/guide.md). The design is in [RESEARCH.md](RESEARCH.md) (Ukrainian).

![shiftwork tui: the queue with live agents, ticket details, search and the tabs](docs/media/tui.gif)

## What it does

- **Fresh context per ticket.** Tickets are Markdown files in `.scratch/<feature>/issues/NN-*.md`, in the [mattpocock-skills](https://github.com/mattpocock/skills) local tracker format (or [OpenSpec](https://openspec.dev) changes). Only a ticket's `Verify` commands decide that it is done.
- **The runner is the orchestrator.** `shiftwork run` works the frontier on its own, feature by feature, one ticket after another (or `--parallel N`), each in its own git worktree, and merges a ticket only when its gate passes.
- **Review before merge.** By default a fresh agent on your strongest tier reviews each ticket's branch before it lands: accept merges it, reopen sends it back with the findings, follow-up files a new ticket.
- **Per-type model routing and skill tiers.** A cheap model for git and docs, a strong one for refactors; untyped tickets can be classified by Jev. Weaker models get more skills, preloaded.
- **Budgets with handoff.** Limits on tokens, cost, turns, time, context and stalls. Past a limit, or on a provider rate or usage limit, the shift is handed to the next model, with a cooldown shared by every worker. Limits can be lifted per run, tier, model or backend.
- **Backends:** [pi](https://pi.dev) (any pi provider, OpenRouter, xAI and local [Ollama](https://ollama.com) models included), Claude Code, Codex, OpenCode, Grok Build and Cursor.
- **Live dashboard.** `shiftwork tui`: the queue with readable statuses, live agents, budgets, cooldowns and logs; run, stop, pause a feature, search, mouse.
- **Dark-factory mode.** `shiftwork run --dark-factory` takes work from your repo's GitHub issues (collaborators only, by label), plans and builds it, and reports back on the issue with links to the commits.

![shiftwork run --dry-run and feature pause/resume](docs/media/cli.gif)

## The `shiftwork` skill

One install command per harness (the same skill: writing tickets, running the runner, reviewing a ticket's work):

| Harness | Command |
| --- | --- |
| [pi](https://pi.dev) | `pi install npm:pi-shiftwork` |
| Claude Code | `/plugin marketplace add Ivlad003/shiftwork`, then `/plugin install shiftwork@shiftwork` |
| OpenCode · Codex · Cursor | `npx degit Ivlad003/shiftwork/skills/shiftwork .agents/skills/shiftwork` |

The skill lives at [`skills/shiftwork/`](skills/shiftwork/SKILL.md) (packaged into [`packages/pi`](packages/pi) and the Claude Code plugin in [`plugins/shiftwork`](plugins/shiftwork); `npm run sync-skills` refreshes the copies). To keep it on a checkout instead of a one-off copy, link it: `ln -s <shiftwork-checkout>/skills/shiftwork .agents/skills/shiftwork`.

## Quick start

```bash
npx shiftwork@latest init --model anthropic/claude-sonnet-4-5
npx shiftwork@latest run --dry-run
```

Needs Node ≥ 22 and [pi](https://pi.dev) (`npm i -g @earendil-works/pi-coding-agent`). Or install the CLI once: `npm i -g shiftwork`.

## Packages

| Package | npm | What |
|---|---|---|
| [`shiftwork`](packages/cli) | [npmjs.com/package/shiftwork](https://www.npmjs.com/package/shiftwork) | CLI (`npx shiftwork`) |
| [`shiftwork-core`](packages/core) | [npmjs.com/package/shiftwork-core](https://www.npmjs.com/package/shiftwork-core) | Ticket parsing and frontier, with no pi or OpenCode dependencies |
| [`pi-shiftwork`](packages/pi) | [npmjs.com/package/pi-shiftwork](https://www.npmjs.com/package/pi-shiftwork) | pi package (`pi install npm:pi-shiftwork`) |
| [`opencode-shiftwork`](packages/opencode) | [npmjs.com/package/opencode-shiftwork](https://www.npmjs.com/package/opencode-shiftwork) | OpenCode V2 plugin (in development) |

## License

MIT
