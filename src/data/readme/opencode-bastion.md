# OpenCode Bastion

Agent Fleet for OpenCode Desktop. See what the orchestrator and its subagents in
the open session are doing — status, live activity, duration, cost, context and
changed lines — without leaving the conversation.

Requires OpenCode Desktop 2.4.x. Read-only: Bastion never starts, stops, approves
or answers anything.

![Animated Agent Fleet: six agents with delegation beams, a waiting agent, a failure and retry, a follow-up execution, and Agent Lanes](https://raw.githubusercontent.com/PVLPM/opencode-bastion/main/docs/images/agent-fleet.webp)

## Features

- **Agent Status pill** above the composer once the session has delegated work:
  agent count and the most actionable state (needs you, failed, running).
  Clicking it opens the panel.
- **Agent Fleet panel** (side region): the orchestrator card, active subagents
  connected by a line, and finished ones in a greyed Finished group that stays
  connected. A pulse runs along a line when the orchestrator delegates
  (orchestrator → agent) and when a subagent returns (agent → orchestrator).
- **Cards** with the agent badge and session title, model and provider logo,
  status (Running, Needs you, Done, Failed, Unknown), a one-line activity ticker,
  duration, `+added −removed` lines, cost and a context ring. The card body opens
  the session; the disclosure shows the full agent name, session, task, current
  activity, model, time, context, cost and lines.
- **Agent Lanes** below the cards: one lane per session on a shared time axis,
  execution blocks as long as they ran, a live block reaching for now, and
  handoff curves from each delegation to the child run it fed. Fit shows the
  whole session; Detail is a true time scale. Past waiting is not drawn because
  OpenCode does not persist waiting intervals.

Open it from the pill, the session panel menu (**Agent Fleet**) or the command
palette (**Open Agent Fleet**).

## Install (local build)

```sh
pnpm install
pnpm build
```

Add the absolute path of this folder to `plugins` in your OpenCode config
(`~/.config/opencode/opencode.json`), then restart OpenCode Desktop:

```json
{ "plugins": ["C:/path/to/opencode-bastion"] }
```

## What the numbers mean

- **Cost** is OpenCode's recorded cumulative cost plus estimates for loaded
  zero-cost requests. Bastion pages the family's native message history, so every
  loaded request is priced on its own route: OpenCode's recorded cost wins; a
  zero-cost request is estimated from the host's model rates, else models.dev
  list prices, using that request's own model and context tier. `~` marks a value
  with estimates. The cost tooltip says the value covers loaded messages and may
  be incomplete: OpenCode's ledger also includes title, generate and reverted
  usage that has no message, so token totals are never used as proof of
  completeness. If a zero-cost request cannot be priced, cost is Unknown rather
  than understated. A session with no reported cost, no loaded usage evidence and
  zero ledger tokens is a measured $0; loaded usage can still produce an
  estimate, and positive ledger usage with no loaded message is Unknown.
  The header total starts from the family total OpenCode reports and adds only
  the estimated share of each member, so nothing is counted twice. It covers the
  family OpenCode knows about for the routed root; a nested agent the host has
  not registered is not discovered by Bastion. That is not your subscription
  spend.
  `claude-agent` is Anthropic CLI routing for subscription use; its unversioned
  aliases are resolved from the host's model metadata and display name, never a
  hardcoded version, and its estimate uses Anthropic list prices, so it is an
  API-list-price equivalent. An alias estimate uses the alias's current listed
  tariff, not the rate in effect when the request ran.
- **Context** is the latest token-bearing assistant turn over the context limit
  of the model that produced those tokens. No limit, zero limit or a completed
  compaction shows no ring.
- **Lines** come from each session's own cumulative file diff, refreshed after a
  completed turn changes files. An explicit empty file list skips a refresh rather
  than clearing an earlier count, so the last known diff stays until a later turn
  changes it. They are not an exact per-agent attribution when agents touch the
  same files; the card says so in a tooltip.
- **Status** is shown only on evidence; anything else is Unknown (for example an
  interrupted session). A live Running or Needs you member also becomes Unknown
  while the host is disconnected; its recorded cost, tokens and history remain.
- The fleet covers one session family: the routed session's root and its direct
  subagents.

## Development

`pnpm verify` runs the format check, Oxlint (with vendored anti-slop rules),
Knip, jscpd, tsc, Vitest and the production build. `pnpm exec vite --config
preview/vite.config.ts` serves a visual preview with fixture fleets.

Contribution and agent rules live in `AGENTS.md`; visual rules and measured
values in `DESIGN.md`; per-flow procedures in `docs/agents/`.

## License

MIT. Provider logos: see `src/ui/logos/NOTICE.md`.
