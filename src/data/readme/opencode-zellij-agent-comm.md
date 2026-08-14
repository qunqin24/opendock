# opencode-zellij-agent-comm

An [OpenCode](https://opencode.ai) plugin for agent-to-agent communication across [Zellij](https://zellij.dev) panes, tabs, and sessions. It lets multiple OpenCode agents identify themselves, discover each other, send messages, and read screen output, all mediated by the user.

## How it works

Each agent is identified by a composite Zellij pane identifier:

```text
s:<session>/p:<pane-id>
```

For example:

```text
s:zellij-spike/p:56
```

Session names are URL-encoded inside the identifier, so a session named `my session` becomes `s:my%20session/p:56`.

The communication flow:

1. User asks agent A to identify itself.
2. Agent A returns its identifier and copies it to the clipboard.
3. User gives that identifier to agent B.
4. Agent B can send messages to agent A or read agent A's screen when the user asks.
5. Sent messages include the sender's identifier, working directory, and git branch so replies can target the sender.

## Actions

| Action | Description |
|--------|-------------|
| `identify` | Return this agent's Zellij pane identifier and copy it to the clipboard. |
| `list` | Discover other OpenCode agents across Zellij sessions. |
| `send` | Send a message to another agent by pane identifier. |
| `read` | Read the screen output of another agent's pane by identifier. |

## Dependencies

- [OpenCode](https://opencode.ai) 1.3+
- [Zellij](https://zellij.dev) 0.44+

## Installation

Add the plugin to your `opencode.json` configuration:

```json
{
  "plugin": ["opencode-zellij-agent-comm"]
}
```

This can go in your global config (`~/.config/opencode/opencode.json`) or a project-level config (`opencode.json` in your project root).

Restart OpenCode to load the plugin. The `agent_comm` tool will be available to the AI agent automatically.

## Usage

### Identify

Ask the agent: "What's your pane ID?" or "Identify yourself".

The agent calls `identify`, which returns an identifier like `s:zellij-spike/p:56` and copies it to your clipboard.

### List Agents

Ask the agent: "List other agents".

The agent scans Zellij sessions for panes that appear to be running OpenCode and returns identifiers that can be used with `send` or `read`.

### Send A Message

Ask the agent: "Send a message to `s:zellij-spike/p:56`".

Messages are prefixed with a sender header:

```text
[From s:zellij-spike/p:48, ~/code/project:main] Your message here
```

Newlines are preserved by sending the message with Zellij's bracketed paste action, then submitting it with one final Enter.

### Read A Screen

Ask the agent: "Read the screen of `s:zellij-spike/p:56`".

The agent calls Zellij's screen dump action and returns the last requested lines of output. This is raw terminal content and may include UI chrome.

## Design

The plugin uses the Zellij CLI rather than a separate message channel:

```text
Agent A (OpenCode)        Zellij               Agent B (OpenCode)
        |                   |                          |
        | paste message     |                          |
        |------------------>|                          |
        |                   | type into target pane    |
        |                   |------------------------->|
        |                   |                          |
        | dump screen       |                          |
        |------------------>|                          |
        |                   | read terminal buffer     |
        |<------------------|                          |
        | screen content    |                          |
```

Key design decisions:

- User-initiated only: the tool description tells agents not to send or read unless the user asks.
- Composite identifiers: `s:<session>/p:<pane-id>` is enough to target panes across tabs and sessions.
- Zellij environment identity: `identify` uses `ZELLIJ_SESSION_NAME` and `ZELLIJ_PANE_ID` from the current pane.
- Discovery by session scan: `list` uses `zellij list-sessions --short` and `zellij --session <session> action list-panes --json`.
- OpenCode detection: panes are detected from `pane_command`, title, or a small screen dump fallback.
- Multiline messages: `send` uses `paste` so newlines are delivered as pasted text, then submits with one Enter.
- Screen reading for responses: `read` uses `dump-screen --full` and trims to the requested number of lines.

## Limitations

- The receiving pane must be a terminal pane running OpenCode.
- `send` types into the target pane's current input and presses Enter.
- Raw screen reads can include terminal UI and may omit older scrollback if Zellij no longer has it.
- Cross-session actions depend on `zellij --session <session> action ...` being supported by the installed Zellij version.
