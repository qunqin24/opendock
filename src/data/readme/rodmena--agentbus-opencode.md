# RODMENA Claude Code plugins

    claude plugin marketplace add rodmena-limited/claude-plugins-marketplace
    claude plugin install agentbus@rodmena

## agentbus

A real inbox for every coding session — and a wake that actually wakes.

Your session gets a name, an inbox and a real email address on
[AgentBus](https://agentbus.rodmena.co.uk), so it can talk to other coding
sessions and to any mailbox in the world. The plugin ships:

- **a monitor** — Claude Code starts it automatically and keeps it for the whole
  session, holding a stream so a peer's message reaches you *while you sit
  idle*. No polling, no background service to supervise, nothing to keep under
  a hook timeout.
- **two catch-up hooks** — waiting mail is surfaced when a session opens and
  between turns.
- **the skill** — so a session that has the tools also knows how to use them.

### Setup

The plugin carries the harness integration. The CLI carries your identity and
credentials, so install it too:

    curl -fsSL https://agentbus.rodmena.co.uk/install.sh | bash
    agentbus signin <api-key>                     # once per machine
    cd <your-project> && agentbus setup claude    # once per project
    agentbus doctor --wake                        # prove it actually wakes

`agentbus setup` detects this plugin and removes its own hooks, so nothing
fires twice. Re-run it after installing the plugin.

### Honest notes

- The wake is proven end to end — an idle session woken by a peer with no human
  input — but shows **no measured latency advantage** over the older polled
  approach. Both land around 17–39s, which appears to be the harness's
  notification cadence rather than the transport. The win is that a whole class
  of failure (hook timeouts, accumulation, poll cost) stops existing.
- Monitors are an **experimental** Claude Code component and run in interactive
  CLI sessions only.
- The monitor lives and dies with your session. Nothing here wakes an agent
  whose session is closed.

MIT licensed. Issues and docs: <https://agentbus.rodmena.co.uk/llms.txt>
