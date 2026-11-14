# opencode-plugin-peers-v2

Let separate **OpenCode 2** sessions on the same machine discover each other
and exchange plain-text messages, even while a session is busy.

This is an independent OpenCode 2 adaptation of
[jkrandom-sudo/opencode-plugin-peers](https://github.com/jkrandom-sudo/opencode-plugin-peers),
based on upstream 0.2.5. The original authors' MIT licence and credit are preserved.
This fork is maintained by [hmseeb](https://github.com/hmseeb).

## Install

Requires **OpenCode 2.3.0 or newer** and Node.js 18 or newer.

```sh
opencode plugin add opencode-plugin-peers-v2
```

Or add it to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-plugin-peers-v2",
      "options": { "peerPermissions": "ask" }
    }
  ]
}
```

OpenCode automatically loads both the server and terminal parts. Do not also load
the original V1 plugin. If migrating from an existing local adaptation, replace
its configuration entry rather than adding a second copy.

The compiled package is also available as a download on
[GitHub Releases](https://github.com/hmseeb/opencode-plugin-peers-v2/releases).

## Use

Name each session, then inspect its peers:

```text
/peers-name frontend
/peers
```

Ask the agent:

```text
Tell the backend session that the login form is ready.
```

Agent tools:

- `list_agents` finds other local session endpoints.
- `send_message` sends plain text to an exact session or an unambiguous name.
- `peer_message_status` reports receipt and final delivery confirmation.

Commands:

| Command | Purpose |
| --- | --- |
| `/peers` or `/list-agents` | List other local sessions |
| `/peers-name frontend` | Set the peer's display name |
| `/peers-inbox` | Show messages held for review |
| `/peers-inbox accept 1` | Deliver a held message |
| `/peers-outbox` | Show outgoing delivery confirmations |

The terminal command palette includes naming, peer list, inbox and outbox actions.
Results appear directly in the transcript without starting a model call.
An accepted peer message starts a normal agent turn and may use your configured model.

## Safety

- **Local only.** No remote-machine messaging, shared transcripts, or file transfer.
- **Peer messages are untrusted text**, not consent to perform actions.
- **Your normal OpenCode approval rules remain in force.** The old plugin's
  automatic permission approval is not enabled. Only `peerPermissions: "ask"`
  is supported.
- Local processes running as your operating-system user can contact these peers.
  Use `inboundPolicy: "hold"` or `"refuse"` when immediate incoming messages
  are inappropriate.

Incoming-message policies:

```json
{
  "plugins": [
    {
      "package": "opencode-plugin-peers-v2",
      "options": {
        "peerPermissions": "ask",
        "inboundPolicy": "auto"
      }
    }
  ]
}
```

`accept` delivers immediately; `auto` accepts same-directory peers and holds
others; `hold` requires review; `refuse` rejects incoming messages.
The default is `accept`.

## Verification and development

```sh
npm install --ignore-scripts --legacy-peer-deps
npm run typecheck
npm run test:v2
npm run test:package
```

The OpenCode 2 adaptation has been checked in real isolated OpenCode 2.3.0 servers
and a real terminal interface: visible empty and populated menus, messaging
while busy, native approval prompts, held and queued message recovery after
receiver restarts, and saved delivery confirmations after sender restarts.
No paid model calls are needed for the real-host test.

`npm run verify:v2` starts and stops **two isolated test servers and a local
test-model endpoint**. Get permission to start and stop those processes before
running it. It does not use your normal OpenCode settings or credentials.

Abrupt crashes and machine power loss have not been tested.

See [V2.md](./V2.md) for adaptation details and
[UPSTREAM.md](./UPSTREAM.md) for the original V1 documentation.

## Licence

[MIT](./LICENSE), retaining the upstream authors' copyright notice.
