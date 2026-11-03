# Iris Chat agent channels

[Iris Chat](https://irischat.org) is Signal-like messaging without phone numbers or signup. It uses Nostr Double Ratchet for end-to-end encryption and supports nearby messaging over local networks and Bluetooth. These native plugins connect your existing agent, model, and tools.

## Install

### OpenClaw

```sh
openclaw plugins install clawhub:@irislib/openclaw-iris-chat
openclaw iris setup
```

[ClawHub listing](https://clawhub.ai/irislib/plugins/openclaw-iris-chat). Run `openclaw gateway run` or restart your gateway. Review the plugin trust prompt.

### Hermes

```sh
hermes plugins install irislib/iris-chat-channels/hermes --ref 86ac4f4ddd696e7e2df4b737ea0251c0be5272c1 --enable
hermes gateway setup
```

Choose Iris Chat, then run `hermes gateway run` or restart your gateway.

### All platforms

| Platform | Install and setup | Package source | Tested host |
| --- | --- | --- | --- |
| OpenClaw | [Commands above](#openclaw) | [ClawHub](https://clawhub.ai/irislib/plugins/openclaw-iris-chat) | 2026.10.9 |
| Hermes | [Channel guide](https://github.com/irislib/iris-chat-channels/blob/main/hermes/README.md) | Pinned GitHub source | 0.22.5 |
| OpenCode | [Project channel](https://github.com/irislib/iris-chat-channels/blob/main/opencode/README.md) | [npm](https://www.npmjs.com/package/@irislib/opencode-iris-chat) | 1.19.5 |
| Pi | [Session extension](https://github.com/irislib/iris-chat-channels/blob/main/pi/README.md) | [npm](https://www.npmjs.com/package/@irislib/pi-iris-chat) | 1.4.0 |
| nanobot | [Native channel package](https://github.com/irislib/iris-chat-channels/blob/main/nanobot/README.md) | Release wheel | 0.4.0 |
| ZeroClaw | [WASM channel and bridge](https://github.com/irislib/iris-chat-channels/blob/main/zeroclaw/README.md) | Release archives | 0.8.7 |

Requires macOS/Linux (including WSL) and Python. Setup reuses your Iris CLI or offers to install the tested release (2026.10.30) for you. No administrator access or PATH changes are needed. Automatic installation supports Apple Silicon/Intel Macs and x86_64 Linux; other systems need a compatible [Iris CLI](https://irischat.org/#command-line-interface). Follow each guide for host-specific requirements.

Setup asks for your public Iris ID (`npub…`) and an invite link from your app. It creates a separate agent identity; never enter your personal secret key. Keep Iris online for first contact, then send tasks in the resulting chat.

## Behavior and privacy

One approved direct contact per profile. Text, seen receipts, and typing are supported; groups and attachments are not. Typing stays on while working and clears afterward. Interrupted tasks are reported without automatically repeating their tools.

For OpenClaw, Hermes, and OpenCode, use Reply on the specific permission message and type `allow once` or `deny`. OpenClaw also offers `always allow` when it can save that command and its arguments for the displayed folder. Each prompt lists its available choices.

Keep the private Iris state directory across updates, and let only one agent process use each profile. Keep profiles, invites, and logs out of public issues. Iris encrypts transport; the agent and its configured model provider receive plaintext prompts. Each host retains its normal tool permissions. For filesystem/network isolation, see [iris-agent-dockers](https://github.com/irislib/iris-agent-dockers).

The plugins run the Iris CLI and a Python transport. With your confirmation during setup, a missing CLI is downloaded from its tagged GitHub release, checked against a bundled SHA-256, and installed in the private channel folder. Existing installations and identities are preserved. Gateway startup never downloads software; there is no telemetry or self-updater. Iris connects to its configured message servers/transports and stores its own keys and history locally. See [permissions and data](https://github.com/irislib/iris-chat-channels/blob/main/hermes/README.md#permissions-and-data).

## Development

[Tests and pinned hosts](https://github.com/irislib/iris-chat-channels/blob/main/tests/README.md) · [Releases and checksums](https://github.com/irislib/iris-chat-channels/releases) · [Iris Chat](https://irischat.org)
