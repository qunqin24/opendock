# cmux-opencode-agent-comm

An [OpenCode](https://opencode.ai) plugin for agent-to-agent communication across [CMUX](https://cmux.com) workspaces. Lets multiple OpenCode agents send messages to each other, read each other's screen output, and discover each other — all mediated by the user.

## How it works

When you have multiple OpenCode instances running in different CMUX workspaces (or even the same workspace), this plugin lets them communicate. Each agent has a composite surface identifier (`ws:N/surf:M`) that encodes both the CMUX workspace and surface refs. The user shares identifiers between agents to establish communication, or agents can discover each other with `list`.

```
┌─ Workspace: Project A ─────────┐    ┌─ Workspace: Project B ──────────┐
│                                │    │                                 │
│  Agent A: "My ID is            │    │  Agent B: "Sending bug report   │
│  ws:8/surf:33"                 │    │  to ws:8/surf:33"               │
│                                │    │                                 │
│  [User copies ID]  ────────────┼────┼─> [User pastes ID]             │
│                                │    │                                 │
│  Agent A: "Got it, I'll fix    │    │  Agent B: "Found a null ref     │
│  the null ref in handleClick"  │<───┼──  in Project A's handleClick"  │
│                                │    │                                 │
└────────────────────────────────┘    └─────────────────────────────────┘
```

The communication flow:

1. User asks agent A to `identify` — it returns its composite identifier and copies it to the clipboard (alternatively, agent B can use `list` to discover agent A's identifier directly)
2. User pastes the identifier into agent B's chat
3. Agent B can now `send` messages to agent A using the identifier
4. Messages include the sender's identifier in a header, so replies work without another identify step

## Actions

| Action | Description |
|--------|-------------|
| `identify` | Return this agent's composite surface identifier (`ws:N/surf:M`) and copy it to the clipboard. |
| `list` | Discover all other OpenCode agents across CMUX workspaces. Returns identifiers that can be used directly with `send`/`read`. |
| `send` | Send a message to another agent by surface identifier. Includes a header with the sender's identifier, cwd, and git branch. |
| `read` | Read the screen output of another agent's OpenCode surface by identifier. |

## Dependencies

- [OpenCode](https://opencode.ai) 1.3+
- [CMUX](https://cmux.com) 0.60+

## Installation

Add the plugin to your `opencode.json` configuration:

```json
{
  "plugin": ["cmux-opencode-agent-comm"]
}
```

This can go in your global config (`~/.config/opencode/opencode.json`) or a project-level config (`opencode.json` in your project root).

Restart OpenCode to load the plugin. The `agent_comm` tool will be available to the AI agent automatically.

## Usage

### Identify (share your surface identifier)

Ask the agent: *"What's your surface ID?"* or *"Identify yourself"*

The agent calls `identify`, which returns a composite surface identifier (`ws:N/surf:M`) and copies it to your clipboard. Paste it into another agent's chat to let them target this agent.

### Send a message

Ask the agent: *"Send a message to \<paste identifier\>"*

The agent calls `send` with the target identifier and your message. Messages are prefixed with a header containing the sender's identifier, working directory, and git branch:

```
[From ws:2/surf:46, ~/code/project-a:main] Your message here
```

The receiving agent can extract the sender's identifier from the header to reply.

### Read another agent's screen

Ask the agent: *"Read the screen of \<paste identifier\>"*

The agent calls `read` with the target identifier and returns the raw screen content (including scrollback). This is useful for checking what another agent is doing or what it last said.

### List other agents

Ask the agent: *"List other agents"*

The agent calls `list`, which scans all CMUX workspaces for other OpenCode instances. Returns composite identifiers (`ws:N/surf:M`) that can be used directly with `send` or `read`.

## Design

### Architecture

```
Agent A (OpenCode)                  CMUX                        Agent B (OpenCode)
      │                               │                              │
      │  cmux send                    │                              │
      │  --workspace workspace:N      │                              │
      │  --surface surface:M          │                              │
      │  "message text"               │                              │
      │ ─────────────────────────────>│  types text into surface     │
      │                               │ ────────────────────────────>│
      │                               │                              │
      │  cmux read-screen             │                              │
      │  --workspace workspace:N      │                              │
      │  --surface surface:M          │                              │
      │ ─────────────────────────────>│  reads terminal buffer       │
      │                               │ ────────────────────────────>│
      │  screen content               │                              │
      │ <─────────────────────────────│                              │
```

The plugin uses the CMUX CLI to communicate between surfaces. `cmux send` types text into a target surface's terminal input, and `cmux read-screen` reads the terminal buffer of a target surface.

Key design decisions:

- **User-initiated only**: The tool description explicitly instructs the agent to never proactively send messages. Communication only happens when the user asks for it, preventing runaway agent-to-agent chatter.
- **Composite identifier targeting**: Each agent is identified by a composite `ws:N/surf:M` that pairs the CMUX workspace ref number with the surface ref number. The workspace ref is needed because CMUX requires `--workspace` to resolve surfaces across workspaces. These refs are derived from `cmux identify` output and map directly to `cmux` CLI `--workspace` and `--surface` flags.
- **Sender identity in headers**: Every sent message includes `[From <ws:N/surf:M>, <cwd>:<branch>]` so the receiver knows who sent it and can reply directly using the identifier.
- **Newline stripping**: `cmux send` interprets newlines as Enter keypresses, which would prematurely submit the message in OpenCode's input. All newlines are replaced with spaces before sending.
- **Screen reading for responses**: Rather than building a structured response channel, the plugin uses `cmux read-screen` to read raw terminal output. This is "noisy" (includes UI chrome) but the receiving LLM handles it well and it avoids any complex response coordination.
- **Discovery via screen scanning**: The `list` action finds other OpenCode instances by reading the last few lines of every terminal surface and checking for the "OpenCode" signature in the status bar. This works regardless of surface naming.

## Future improvements

### Structured response channel

Currently, reading another agent's response requires `cmux read-screen` which returns raw terminal output including UI elements. A structured channel (e.g., via files or a shared socket) could provide cleaner response data.

### Deliver messages into plan mode

Currently, `cmux send` types text directly into the receiving agent's terminal input, which means the message lands in whatever mode the agent is in. Ideally, incoming messages would always arrive in plan mode so the receiving agent presents the message to the user for review before acting on it. This would add a layer of safety for cross-agent communication. It's unclear how to achieve this given the current `cmux send` mechanism — it would likely require OpenCode to expose a way to switch modes programmatically, or a dedicated message ingestion endpoint.
