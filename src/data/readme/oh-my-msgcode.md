<div align="center">

# oh-my-msgcode

**Inter-agent messaging for OpenCode.**

Agents in different terminals talk to each other — in near real-time.

[Getting Started](#installation) · [Examples](#examples) · [한국어](./README.ko.md)

</div>

---

<div align="center">
<img src="./assets/demo.png" alt="Two agents chatting in real-time across terminals" width="100%">
<br>
<sub>Two agents having a conversation across different terminal sessions</sub>
</div>

---

## The Problem

AI coding agents are powerful, but isolated. Each lives in its own terminal, blind to what others are doing. There's no way for one agent to ask another for help, delegate work, or share findings.

## The Solution

oh-my-msgcode gives your agents a shared communication channel. One agent sends a message, the other receives it automatically — no manual copy-pasting between terminals.

> **Before:** Security scanner finds a leaked key. You copy the finding, switch terminals, paste it to the fixer agent.
>
> **After:** Security scanner finds a leaked key. Sends a message. Fixer agent receives it and patches the code. Automatically.

> **Before:** Coder finishes a feature. You manually ask the reviewer in another terminal.
>
> **After:** Coder sends review request. Reviewer receives, reviews, sends feedback. Loop until LGTM. No human in the middle.

> **Before:** Backend changes an API. Frontend breaks. You notice later.
>
> **After:** Backend notifies frontend agent. Frontend updates the client immediately.

---

## Prerequisites

- [OpenCode](https://opencode.ai) installed and configured
- Node.js >= 18

## Supported Platforms

Tested and verified on **OpenCode**. Other platforms (Claude Code, Codex, Gemini CLI) are not tested and likely require adaptation.

---

## Installation

### Quick Install — paste in OpenCode chat

```
Install and configure oh-my-msgcode by following the instructions here:
https://raw.githubusercontent.com/GonGe1018/oh-my-msgcode/master/docs/installation.md
```

<details>
<summary><strong>Manual Install</strong></summary>

Add to your `opencode.json` (global or project-level):

```json
{
  "plugin": [
    "oh-my-msgcode"
  ]
}
```

For local development:

```json
{
  "plugin": [
    "/path/to/oh-my-msgcode/dist/index.js"
  ]
}
```

</details>

---

## How It Works

```
Terminal A (coder)                      Terminal B (reviewer)
    |                                       |
    |-- send_message("reviewer", "...") --> |
    |                                       |-- [auto-injected via promptAsync]
    |                                       |-- reviews code
    | <-- send_message("coder", "LGTM") ---|
    |-- [auto-injected via promptAsync]     |
    |                                       |
    +--------  ~/.oh-my-msgcode/  ----------+
                (shared message store)
```

1. Agent calls `send_message` — message stored in `~/.oh-my-msgcode/messages.json`
2. Recipient goes idle or 5-second poll fires — message auto-injected via `promptAsync`
3. Recipient processes, replies, acknowledges with `ack_message`

All OpenCode instances on the same machine share the store.

---

## Slash Commands

```
/msg register <id> [name]              Register an agent
/msg unregister <id>                   Remove an agent
/msg send <to> <message>               Send a message
/msg broadcast <channel> <message>     Broadcast to channel members
/msg check [agent_id]                  Check inbox
/msg agents                            List all agents (shows online/offline)
/msg status                            Show system status
/msg channel create <id> [name]        Create a channel
/msg channel join <id>                 Join a channel
/msg channel leave <id>                Leave a channel
/msg channel list                      List all channels
```

## Tools

| Tool | Description |
|------|-------------|
| `register_agent` | Register an agent for messaging |
| `unregister_agent` | Remove an agent |
| `send_message` | Send a message to another agent (warns if recipient is offline) |
| `broadcast_message` | Broadcast a message to all members of a channel |
| `check_messages` | Check for incoming messages |
| `ack_message` | Acknowledge a processed message |
| `list_agents` | List all registered agents |
| `create_channel` | Create a new channel for group messaging |
| `join_channel` | Join an existing channel |
| `leave_channel` | Leave a channel |
| `list_channels` | List all channels |

---

## Examples

<details>
<summary><strong>Casual Chat</strong> — two agents having a conversation</summary>

Terminal A:

```
You are an agent named "alice". Register with register_agent.
Send bob a message: "Hey bob! I'm alice. What have you been up to?"
When you receive messages, reply naturally and keep the conversation going.
```

Terminal B:

```
You are an agent named "bob". Register with register_agent.
When you receive messages, reply naturally and keep the conversation going.
```

</details>

<details>
<summary><strong>Code Review Loop</strong> — coder and reviewer iterate until LGTM</summary>

Terminal A (Coder):

```
You are an agent named "coder". Register with register_agent.

Your role:
- Implement the feature the user requested
- Send a review request to "reviewer" via send_message (include file paths and changes)
- If reviewer sends feedback, fix the issues and request review again
- When reviewer says "LGTM", the task is complete

Task: [describe the feature to implement]
```

Terminal B (Reviewer):

```
You are an agent named "reviewer". Register with register_agent.

Your role:
- Review code changes sent by coder
- Read the actual files and check for bugs, type safety, error handling, and pattern consistency
- If there are issues, send specific feedback to coder (file, line, reason, suggested fix)
- If everything looks good, send "LGTM"

When you receive a message, review and reply automatically.
```

</details>

<details>
<summary><strong>Security Audit + Auto-Fix</strong> — scanner finds issues, fixer patches them</summary>

Terminal A:

```
You are an agent named "security-auditor". Register with register_agent.
Scan all files in this project for hardcoded secrets.
If found, send an urgent message to "code-fixer" with the file path and line number.
```

Terminal B:

```
You are an agent named "code-fixer". Register with register_agent.
When you receive a message, fix the code as requested and send a completion message back to security-auditor.
```

</details>

<details>
<summary><strong>Channel Broadcast</strong> — notify multiple agents at once</summary>

Terminal A (Backend):

```
You are an agent named "backend". Register with register_agent.
Create a channel called "api-changes" using create_channel.
```

Terminal B (Frontend):

```
You are an agent named "frontend". Register with register_agent.
Join the "api-changes" channel using join_channel.
When you receive messages, update the client code accordingly.
```

Terminal C (Tester):

```
You are an agent named "tester". Register with register_agent.
Join the "api-changes" channel using join_channel.
When you receive messages, update the test cases accordingly.
```

Then in Terminal A:

```
Broadcast to the api-changes channel: "POST /users response format changed — 'name' field split into 'firstName' and 'lastName'"
```

Both frontend and tester receive the message automatically.

</details>

---

## Data Storage

Messages are stored as JSON files in `~/.oh-my-msgcode/`. All OpenCode instances on the same machine share this directory.

## Known Limitations

- **Concurrency** — The file-based store uses atomic writes (temp file + rename) but does not implement file locking. In rare cases where multiple agents write at the exact same millisecond, a message could be lost. This is acceptable for the typical use case of 2-3 agents on a single machine.
- **No message cleanup** — Acknowledged messages are automatically removed after 30 minutes. For immediate cleanup, delete `~/.oh-my-msgcode/messages.json`.
- **Polling-based delivery** — Messages are delivered when the recipient goes idle or every 5 seconds. This is near real-time, not instant.

## Development

```bash
git clone https://github.com/GonGe1018/oh-my-msgcode.git
cd oh-my-msgcode
npm install
npm run build
npm test
```

## License

MIT
