# Shiftwork

> Autonomous coding agents that work in **shifts**. Every ticket gets a fresh shift (a clean context). When a model uses up its budget or hits a provider limit, it hands the shift over to the next model, possibly from another provider.

**Status: early development (0.x).** How to set it up and use it: [docs/guide.md](docs/guide.md). The design is in [RESEARCH.md](RESEARCH.md) (Ukrainian).

## Planned

- **Fresh context per ticket.** Tickets live as Markdown files in `.scratch/<feature>/issues/NN-*.md`, in the [mattpocock-skills](https://github.com/mattpocock/skills) local tracker format. Shiftwork runs the frontier until the `Verify` commands pass.
- **Per-type model routing.** For example, a cheap model for git tasks. Tickets without a type can be classified by Jev (TypeSafe).
- **Skill tiers.** Strong models get a small set of skills; weaker models get more, with key skills preloaded.
- **Model budgets.** Limits on tokens, cost, turns, context and stalls. Past a limit, Shiftwork hands off to another model, in the same process or a new one.
- **Provider fallback on rate and usage limits,** with a shared cooldown for all workers.
- **Backends:** [pi](https://pi.dev), Claude Code, Codex, OpenCode, OpenRouter, xAI.

## The `shiftwork` skill

One install command per harness (the same skill: writing tickets, running the runner, reviewing landed work):

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
