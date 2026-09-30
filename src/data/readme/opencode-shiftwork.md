# Shiftwork

> Autonomous coding agents that work in **shifts**. Every ticket gets a fresh shift (a clean context). When a model uses up its budget or hits a provider limit, it hands the shift over to the next model, possibly from another provider.

**Status: early development (0.0.x).** Right now only ticket parsing and `shiftwork status` work. The design is in [RESEARCH.md](RESEARCH.md) (Ukrainian).

## Planned

- **Fresh context per ticket.** Tickets live as Markdown files in `.scratch/<feature>/issues/NN-*.md`, in the [mattpocock-skills](https://github.com/mattpocock/skills) local tracker format. Shiftwork runs the frontier until the `Verify` commands pass.
- **Per-type model routing.** For example, a cheap model for git tasks. Tickets without a type can be classified by Jev (TypeSafe).
- **Skill tiers.** Strong models get a small set of skills; weaker models get more, with key skills preloaded.
- **Model budgets.** Limits on tokens, cost, turns, context and stalls. Past a limit, Shiftwork hands off to another model, in the same process or a new one.
- **Provider fallback on rate and usage limits,** with a shared cooldown for all workers.
- **Backends:** [pi](https://pi.dev), Claude Code, Codex, OpenCode, OpenRouter, xAI.

## Packages

| Package | What |
|---|---|
| [`shiftwork`](packages/cli) | CLI |
| [`shiftwork-core`](packages/core) | Ticket parsing and frontier, with no pi or OpenCode dependencies |
| [`pi-shiftwork`](packages/pi) | pi package (`pi install npm:pi-shiftwork`) |
| [`opencode-shiftwork`](packages/opencode) | OpenCode V2 plugin (in development) |

## License

MIT
