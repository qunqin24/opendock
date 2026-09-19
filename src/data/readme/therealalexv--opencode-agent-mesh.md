# opencode-agent-mesh

Peer-to-peer messaging and edit coordination for [OpenCode](https://opencode.ai) agents.

When several OpenCode sessions run at once on the same machine, nothing stops two of them from editing the same file. This project gives each session a presence on a small local hub so they can find each other, send messages, and claim files before editing.

Published on npm as [`@therealalexv/opencode-agent-mesh`](https://www.npmjs.com/package/@therealalexv/opencode-agent-mesh).

## How it works

A small Bun service (the hub) runs on localhost and tracks three things: live agents with their directory, worktree, git branch, agent name, and status; messages addressed to each agent; and leases over file paths, soft or exclusive.

An OpenCode plugin (the client) registers the current session, heartbeats every few seconds, and adds a set of `mesh_*` tools the agent can call. It also injects pending peer messages into the session context on the next turn, so an idle agent does not need to be poked.

The hub never calls OpenCode. Each plugin instance delivers messages to its own server's sessions through the OpenCode SDK. The hub only routes and arbitrates.

## Install

Prerequisites: bun, and OpenCode with a global config.

### From npm

```sh
bun add -g @therealalexv/opencode-agent-mesh
meshctl install
```

Then add the plugin and the rules file to `opencode.json`:

```jsonc
{
  "plugin": ["@therealalexv/opencode-agent-mesh"],
  "instructions": ["~/.config/opencode/plugin/global-rules/agent_mesh.md"]
}
```

### From source

```sh
git clone https://github.com/TheRealAlexV/opencode-agent-mesh
cd opencode-agent-mesh
bun install
./bin/meshctl install
```

The from-source install links `~/.config/opencode/plugin/agent-mesh.ts` to the repo plugin, so use `"./plugin/agent-mesh.ts"` in `opencode.json` instead.

Either way, `meshctl install` writes a systemd user unit and generates `~/.config/opencode/agent-mesh/client.json` with a random token.

Start and inspect:

```sh
./bin/meshctl status
./bin/meshctl agents
```

## Tools

Each agent gets these tools:

| Tool | Purpose |
| --- | --- |
| `mesh_who` | List live agents |
| `mesh_send` | Send a note, request, reply, or handoff to an agent or broadcast |
| `mesh_inbox` | Read messages addressed to this session |
| `mesh_claim` | Claim a soft or exclusive lease on paths |
| `mesh_release` | Release leases |
| `mesh_leases` | List active leases |
| `mesh_announce` | Set this session's status and note |

## Messages

Messages are coordination notes, not a data channel. A sender can tag a message `note`, `request`, `reply`, or `handoff`. Messages arrive passively: they appear in the target's context on its next turn. A sender can set `wake: true` on a direct message to start a turn in an idle target, subject to a rate limit.

## Leases

Soft leases never block anyone. They warn a second agent that touches the same path. Exclusive leases block another agent's edit to that path in the `tool.execute.before` hook. Leases expire on a TTL and are released when their holder goes stale.

If the hub is unreachable, everything fails open: edits proceed, and the tools report "mesh offline". The mesh must not stop an agent from editing its own repo.

## Configuration

`~/.config/opencode/agent-mesh/config.json`:

```jsonc
{
  "hub": { "host": "127.0.0.1", "port": 8788 },
  "heartbeatMs": 10000,
  "agentTtlMs": 45000,
  "softTtlMs": 60000,
  "exclusiveTtlMs": 600000,
  "enforcement": "soft",
  "injectInboxMax": 5,
  "injectCharsMax": 1200,
  "wake": { "enabled": true, "perTargetMinMs": 60000, "perTargetHourMax": 6 },
  "neverLock": ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.opencode/**"],
  "autoStartHub": true
}
```

`enforcement` is `advisory`, `soft`, or `hard`. Advisory records touches but never blocks. Soft adds warnings and auto-taken soft claims. Hard blocks edits to paths under an exclusive lease held by another agent.

## Reserved port

The hub uses loopback port 8788. See `PORTS.md`. To move it, set `hub.port` in `config.json` or set `MESH_HUB_PORT`, then update `client.json` and restart.

## Development

```sh
bun test
bun run typecheck
```

## License

MIT.
