<div align="center">

# OpenCode Peers

**Cross-session messaging for opencode.**

[![npm](https://img.shields.io/npm/v/opencode-peers)](https://www.npmjs.com/package/opencode-peers)
[![Downloads](https://img.shields.io/npm/dm/opencode-peers)](https://www.npmjs.com/package/opencode-peers)
![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
</div>

OpenCode Peers lets independent [opencode](https://opencode.ai) instances on the
same machine discover each other and exchange plain-text messages, modeled
after [Claude Code's cross-session
messaging](https://claudefa.st/blog/guide/mechanics/cross-session-messaging).
Run several opencode terminals in parallel (different repos, worktrees, or
tasks) and let them hand each other conclusions instead of copy-pasting context
between windows — the agent itself decides when to consult a peer, via tools.

One package supports both hosts: OpenCode 2.x (v2 plugin API) and opencode
>= 1.18.29 (v1 plugin API) — each host picks its own entry.

## ✨ Features

- **`list_agents` / `send_message` tools** — the agent discovers peers and
  texts them. Every message carries a tracking ID, and `peer_message_status`
  distinguishes transport receipt from final delivery. On OpenCode 2.x the
  tools are direct model tool calls (not Code Mode catalog entries), matching
  the v1 host.
- **Instant delivery, even while busy** — accepted messages are injected immediately while the target session is busy, as synthetic user
  messages (`promptAsync` on v1, `ctx.session.synthetic` on v2), one host
  call per message. The sender keeps a pending final ACK until delivery
  completes.
- **One endpoint per session** — including child sessions. Exact endpoint IDs
  disambiguate duplicate names.
- **Durable by default** — per-session queues, held messages, delivery
  outcomes, and sender outboxes survive process restarts.
- **Inbound gating** — `accept` / `auto` / `hold` / `refuse`. `auto` accepts
  same-directory peers and holds cross-directory messages.
- **Unattended peer turns** — permission requests raised while acting on an
  injected peer message are auto-approved, scoped as described in
  [Security](#-security). Your own turns are unaffected.
- **Inline results** — command output and notifications land in the session,
  no toast popups.
- **TUI controls** — palette actions with host dialogs on OpenCode 2.x and
  single-Enter slash commands on both hosts.
- **Plain text only** — no files, no shared conversation history.
- **Local only** — Unix-domain sockets on macOS/Linux, loopback TCP on
  Windows. Everything stays on your machine.

## ⌨️ Commands

| Command | What it does |
| --- | --- |
| `/peers` (alias `/list-agents`) | List other opencode sessions: state, name, directory, uptime |
| `/peers-name <name>` | Name this instance so peers can address it |
| `/peers-inbox` | List held messages. `accept <n>` / `drop all` |
| `/peers-outbox` | Receipts and final ACK outcomes |

Default peer name is `<dir>-<hex4>` (e.g. `my-app-a3f2`), so same-directory
instances stay distinguishable. `/peers-name` or the `name` option replaces it.

## ⚙️ Settings

Register the plugin in config by package name — `plugins` on OpenCode 2.x, the
singular `plugin` key on v1 — and carry options in the object/tuple form:

```json
{ "plugins": ["opencode-peers"] }
{ "plugin":  ["opencode-peers"] }

{ "plugins": [ { "package": "opencode-peers", "options": { "inboundPolicy": "hold", "name": "frontend" } } ] }
{ "plugin":  [ [ "opencode-peers", { "inboundPolicy": "hold", "name": "frontend" } ] ] }
```

| Option | Default | What it does |
| --- | --- | --- |
| `inboundPolicy` | `"accept"` | `accept` delivers immediately. `auto` accepts only when sender and receiver directories match and otherwise holds. `hold` parks messages for review. `refuse` rejects them |
| `peerPermissions` | `"allow"` | Peer-origin permission requests: `allow` auto-approves ordinary requests, `ask` leaves native prompts untouched, `deny` rejects. Even in `allow`, permission configuration, `AGENTS.md`, credentials/secrets and escalation are never auto-approved. Existing deny rules always win |
| `name` | `<dir>-<hex4>` | Display name other peers use to address you |
| `storageDir` | `$XDG_DATA_HOME/opencode-peers` | Where the registry and held inbox live |
| `heartbeatMs` | `10000` | Registry heartbeat interval |
| `staleMs` | `60000` | Peer is offline if its heartbeat is older than this |
| `maxQueue` | `50` | Queued (accepted, undelivered) message cap |
| `maxHeld` | `100` | Held inbox cap |
| `heldExpiryMs` | `300000` | Held approval expiry. Expiry produces a final ACK |
| `maxMessageBytes` | `8192` | Per-message size cap |
| `sendRatePerMin` | `10` | Outbound rate limit per peer |
| `recvRatePerMin` | `20` | Inbound rate limit per sender |
| `sweepMs` | `15000` | Fallback delivery/ACK reliability sweep interval |

## 📦 Install

One package, two hosts — pick your host's command:

```bash
opencode plugin add opencode-peers    # OpenCode 2.x (v2)
opencode plugin -g opencode-peers     # opencode v1 (>= 1.18.29)
```

Config-based registration and options live in the Settings section below.

Development checkout:

```bash
git clone https://github.com/chinese-room-solutions/opencode-peers
cd opencode-peers && make build
```

```jsonc
// ~/.config/opencode/opencode.jsonc
{ "plugins": ["/abs/path/to/opencode-peers"] }
```

Point v2 hosts at the package directory, never `dist/index.js`. On v1, symlink
instead:
`ln -sf "$PWD/dist/index.js" ~/.config/opencode/plugins/opencode-peers.js`.

## 🔒 Security

- **Same-machine trust**: any process running as your user can read the
  registry files and therefore talk to your instances' inboxes. The bearer
  token protects against other users and accidental connections, not against
  a malicious process with your UID.
- **Prompt injection**: a peer message is untrusted input to the model,
  exactly like pasted text. Plain text cannot transfer files, history,
  consent, or executable commands.
- **Auto-allow is trust, not a boundary**: the `peerPermissions: "allow"`
  default withholds auto-approval for requests that *mention* sensitive paths
  (permission config, `AGENTS.md`, credentials, shell startup files), but the
  guard matches on request text — a cleverly phrased request can dodge it.
  Treat `allow` as fully trusting every peer on the machine. Use `ask`,
  `hold`, or `refuse` when it isn't.
- Auto-allow only ever replies to turns started by a message the plugin
  injected. Requests from your own typed turns fall through to opencode's
  normal flow untouched.

## 🔧 How it works

```
OpenCode process A                         OpenCode process B
┌──────────────────────────────┐           ┌──────────────────────────────┐
│ session A1 → endpoint/spool  │           │ session B1 → endpoint/spool  │
│ session A2 → endpoint/spool  │           │ session B2 → endpoint/spool  │
│ durable outbox ◄─────────────├─final ACK─┤ local UDS/TCP listener       │
│ registry v1 + v2 ────────────┼──────────►│ promptAsync(exact session)   │
└──────────────────────────────┘           └──────────────────────────────┘
```

Discovery publishes one registry record per live session endpoint (a closed
process disappears within one stale window). HTTP acceptance is only a receipt
— final `delivered` / `refused` / `expired` / `dropped` / `duplicate` ACKs are
durably retried to the sender. Messages carry a `via` hop list. Chains longer
than 4 hops are rejected.

## 🛠️ Development

```bash
make build       # compile (tsc → dist/)
make watch       # recompile on change (auto-installs deps on first run)
make typecheck   # type-check without emitting
make test        # build + full node --test suite
make package     # build + npm pack
```

### Tests

The suite includes real-host integration tests that spawn actual
`opencode serve` processes: `tests/real-opencode.test.mjs` needs an opencode
v1 binary, `tests/real-opencode-v2.test.mjs` an opencode v2 binary — each
skips with a message when its host isn't on PATH.

CI (`.github/workflows/ci.yml`) runs the suite on Linux twice — once against
a pinned opencode v1 host, once against a pinned v2 host. Pushing a version
tag (e.g. `v0.1.0`, matching `package.json`) builds the tarball and publishes
a GitHub release with it (`.github/workflows/release.yml`).

## Credits

This project is a standalone continuation of
[opencode-plugin-peers](https://github.com/jkrandom-sudo/opencode-plugin-peers),
forked at v0.2.3 and extended with OpenCode v2 support, event-driven
discovery, synthetic delivery, and evaluate-hook permissions. The original
project is MIT-licensed. Its copyright notice is preserved in the
[LICENSE](./LICENSE) file as its license requires.
