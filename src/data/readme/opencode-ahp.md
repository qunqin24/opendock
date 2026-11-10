# opencode-ahp

OpenCode v2 plugin that hosts the **Agent Host Protocol (AHP) 1.0.0**
in-process so opencode is a native agent in the **VS Code Agents window** —
on this machine and on other machines over the local LAN.

## What you get

In the Agents window, an `opencode` host with:

- **Sessions** — new sessions (AHP `createSession`), a live session list
  (opencode titles/statuses), and chat state across reconnects (snapshot +
  replay).
- **Model picker** — the real opencode catalog: every provider/model the
  opencode server exposes, including llama.cpp servers registered by sync
  plugins.
- **Agent picker** — opencode's user-invocable agents (Build, Plan, and
  anything user-defined) appear as AHP custom agents; subagent-mode agents
  are hidden from the picker.
- **Chat** — streaming text + reasoning, the full tool-call lifecycle
  (started → ready → confirmed → complete), and usage totals.
- **Permissions** — opencode's `permission.asked` becomes an in-window
  approval prompt; approve runs the tool, deny blocks it.
- **Client tools** — a client can register its own tools per session
  (`createSession` or `session/activeClientSet`): the model calls them
  directly, the host delegates execution to the owning client
  (`toolClientExecution` request — the session stays in progress while the
  client runs), and the client's result flows back into the turn, including
  `requiresResultConfirmation` approval. Client tools bypass opencode's
  permission prompt; only the client that provided the tool may execute it
  or confirm its result.
- **Multi-chat** — a session can host additional chats (AHP `createChat`,
  gated on the advertised `multipleChats` capability): each chat runs
  against its own opencode backend session with fully isolated turns, and
  `disposeChat` removes a chat without touching the session. The chats
  appear in the session's catalog (default chat first); each chat carries
  its own changesets. Fork/side-chat creation is not supported (opencode
  exposes no fork to plugins). Peer-chat backends appear in opencode's own
  UI as ordinary sessions — they are real opencode sessions underneath.
  **Survives restarts:** the host stamps small binding markers into the
  opencode sessions' metadata at create, so after a location reload each
  chat re-attaches at its original URI (and a client-chosen session
  channel resurfaces under its original name); re-attached chat titles are
  re-derived (`Chat 2`, …) while session titles and messages persist.
- **Steering + queue** — a message sent mid-turn steers the active turn or
  queues for the next one (AHP `pendingMessageSet`).
- **Changesets** — per-session diff channels (uncommitted, session, and
  per-turn) backed by the location's git state: live `file://` refs,
  `git show HEAD:` before-refs, and in-memory turn snapshots; the
  `discard-changes` operation restores a file. Requires the location
  directory to be a git repository (otherwise the changesets are empty);
  opt out with `capabilities.changesets: false`.
- **Terminals** — read-only `ahp-terminal:` channels rendered from
  `shell`-tool executions (`isPty: false`, completed-command output with
  exit codes): while a turn runs a foreground shell command, the terminal
  appears in the root catalog, streams
  `data` → `commandFinished` → `exited` to subscribers, and leaves the
  catalog at turn end (the channel state stays subscribable until the
  chat/session is removed). The terminals are renderings, not pty —
  `createTerminal`/`disposeTerminal` and client `terminal/*` actions get
  clean read-only errors. Opt out with
  `capabilities.terminals: false`.

## Requirements

- **opencode v2** (≥ 2.2.6 verified). The plugin runs *inside* the opencode
  server — no extra process; it only opens one extra port.
- **VS Code ≥ 1.144** (1.145.2 verified) for the Agents window and
  `Agents: Add Remote Agent Host…`. VS Code ships the AHP client — nothing
  is installed on the client machine.
- Node + pnpm (via [mise](https://mise.jdx.dev)) for **development only**.

## Install

The plugin loads from an explicit `plugins` entry — never from a discovery
path (which would double-load it).

**Published (npm):**

```sh
opencode plugin add opencode-ahp
# or from git:
opencode plugin add github:mattzink/opencode-ahp
```

**Dev (local checkout):**

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [{
    "package": "/path/to/opencode-ahp",
    "options": { /* see Options below */ }
  }]
}
```

Restart the opencode service afterwards (`opencode service restart`). The
AHP listener starts when the location for the configured directory boots.

## Options

Per-key resolution: the config entry's `options` ▸ an `options.jsonc`
sibling of `src/index.ts` (checkouts only — copy
[`options.example.jsonc`](options.example.jsonc)) ▸ built-in defaults.

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch; `false` → no listener, the plugin is fully inert |
| `port` | `8765` | WS listen port |
| `host` | `"127.0.0.1"` | Bind address; a **non-loopback bind requires an explicit `token`** (the listener refuses to start otherwise) |
| `path` | `"/ahp"` | WS path — VS Code's URL carries it verbatim |
| `token` | auto | Omit → generated on first start, persisted in opencode's plugin storage, printed once to the service log. Accepted via the `?token=` query param and `Authorization: Bearer <token>`. **Always enforced**, loopback or not |
| `allowedOrigins` | `"*"` | `"*"` or an exact list, e.g. `["vscode://vscode"]`. The token is still always required regardless |
| `tls` | `null` | `{ keyPath, certPath }` — native TLS termination → `wss://` (off-LAN transports, D3). PEM **file paths**; the port becomes TLS-only (plain-HTTP requests to it fail) and the health endpoint is then HTTPS: `curl -k https://…:8765/healthz`. A missing/unreadable file disables the AHP listener — the opencode server keeps running |
| `healthPath` | `"/healthz"` | Health endpoint (no auth): `curl …:8765/healthz` → `ok` (over the same TLS termination when `tls` is set) |
| `keepAlive` | `true` | Keep the opencode location loaded against its idle timeout (`experimental.location_idle_timeout`, default 60 min) by periodically touching an internal anchor session — with this on, **no `location_idle_timeout` config entry is needed**. The anchor (`opencode-ahp (keep-alive)`) is a real opencode session: it shows in the TUI session list but is hidden from AHP clients (opencode's plugin surface cannot archive it) |
| `keepAliveIntervalMinutes` | `10` | Minutes between keep-alive touches; keep well below the effective idle timeout |
| `replayWindow` | `1000` | Per-channel actions kept for reconnect replay; older gaps → fresh snapshot |
| `capabilities` | `{ changesets: true, terminals: true, automations: false }` | Host-side switches — never advertise what we don't implement (in AHP 1.0.0 none of these is a wire field; discovery is the state's optionality). Set `changesets` to `false` to disable the diff channels (the session/chat snapshots then carry no changeset catalogues and changeset URIs resolve to nothing); set `terminals` to `false` to disable the synthetic shell-command terminal channels (no `root/terminals` list, `shell` calls open no `ahp-terminal:` channels) |

## Remote access (local LAN)

The LAN transport is plain `ws://` + token (the token in the URL is
cleartext — LAN only, by design). Off-LAN options (Tailscale, a dev-tunnel
port forward, any `wss://` proxy) are operational; the host accepts any
`ws(s)://` URL whose path and token match.

### Host side

1. Serve the project on all interfaces: `opencode service set hostname
   0.0.0.0` + restart, or a dedicated
   `opencode serve --hostname 0.0.0.0 --port <port>`.
2. Configure the plugin (project or global `opencode.jsonc`):

   ```jsonc
   {
     "plugins": [{
       "package": "opencode-ahp",
       "options": {
         "host": "0.0.0.0",
         "token": "change-me-to-a-long-random-string"
         // "allowedOrigins": "vscode://vscode"  // tighten once it works
       }
     }]
   }
   ```

   No `experimental.location_idle_timeout` entry needed: by default the
   plugin keeps its own location loaded (`keepAlive`, see Options) by
   periodically touching an internal anchor session (visible in the TUI
   session list as "opencode-ahp (keep-alive)", hidden from AHP clients)
   — opencode's idle sweep never fires.

3. **Boot the location once** — the AHP listener exists only while the
   location is up, and a location boots on first use. After a fresh server
   start (e.g. machine reboot), open the project once (run the `opencode`
   TUI in it, or open it in an IDE), or headless:

   ```sh
   curl -g -u opencode:<server-password> \
     'http://127.0.0.1:<port>/api/location?location[directory]=<project-dir>'
   ```

   This is a one-time step per server process: the keep-alive then holds
   the location (and the listener) indefinitely, and reloading the
   location (config change, `opencode service restart`) re-boots it
   automatically. (The one-time boot itself is an opencode limitation —
   plugins cannot run before their location has booted; a zero-touch boot
   needs an upstream auto-boot option.)
4. Verify: `curl -s http://<host-lan-ip>:<port>/healthz` → `ok`.

Full two-machine walkthrough (and the complete testing strategy: unit,
static, live verification, two-machine, conformance):
[`docs/testing.md`](docs/testing.md).

### Client side (each PC)

Command Palette → **`Agents: Add Remote Agent Host…`** → paste:

```
ws://<host-lan-ip>:8765/ahp?token=<token>
```

Or persist it in `settings.json` — with Settings Sync on, that one line
propagates to every PC:

```jsonc
"chat.remoteAgentHosts": [{ "name": "opencode", "address": "ws://…:8765/ahp?token=…" }]
```

Note: the Agents window's built-in **SSH** and **Dev tunnels** flows run
*VS Code's bundled* agent host — they are **not** a path to this plugin.
For a third-party host, only raw network reachability of the `ws(s)://`
URL matters.

### Off-LAN: native `wss://`

When plain LAN `ws://` doesn't fit (host on another network, or
token-in-URL on a shared network you don't want), set `tls` and the same
listener serves `wss://` — native termination in `Bun.serve`, no proxy in
the middle:

```jsonc
"options": {
  "host": "0.0.0.0",
  "token": "change-me-to-a-long-random-string",
  "tls": {
    "keyPath": "/path/tls-key.pem",
    "certPath": "/path/tls-cert.pem"
  }
}
```

The client URL becomes `wss://<host>:8767/ahp?token=<token>` and the
token/Origin policy is unchanged. The certificate must be trusted by the
client machine for the URL's hostname: VS Code expects a real chain
(mkcert on a dev network, or any CA the client trusts); self-signed
certs only work for script-based checks
(`NODE_TLS_REJECT_UNAUTHORIZED=0`). With `tls` set the port is
**TLS-only** — plain-HTTP requests to it fail, and the health check
becomes `curl -k https://<host>:<port>/healthz` → `ok`.

## Development

```sh
mise install        # node + pnpm per mise.toml / package.json
pnpm install
pnpm typecheck
pnpm test           # pure modules + a captured turn replayed through the real AHP reducers
```

Dependency-free live probes (Node ≥ 20 global WebSocket):

```sh
node scripts/ahp-client.mjs --token <token> [--base http://127.0.0.1:8765]
# end-to-end: createSession → agent-picker snapshot → full turn lifecycle
node scripts/ahp-turn-lifecycle.mjs --token <token> --base http://127.0.0.1:8765 --provider opencode
# changesets end-to-end: edit → diffs → discard, plus mid-turn reconnect/replay
node scripts/ahp-changesets.mjs --token <token> --base http://127.0.0.1:8765
# client-provided tools (ping tool, failed result, confirmation cycle)
node scripts/ahp-client-tools.mjs --token <token> --base http://127.0.0.1:8765
# multi-chat (createChat/disposeChat, per-chat backends, no ghost sessions)
node scripts/ahp-multi-chat.mjs --token <token> --base http://127.0.0.1:8765
# multi-chat durability: leave the peer chat + backend alive, reload the
# location, then recheck the re-attachment (chat at its original URI)
node scripts/ahp-multi-chat.mjs --token <token> --base http://127.0.0.1:8765 --leave-peer
node scripts/ahp-multi-chat.mjs --token <token> --base http://127.0.0.1:8765 --recheck <sessionChannel> <peerChatURI>
# the same probes over native wss:// (self-signed test cert):
NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/ahp-changesets.mjs --token <token> --base https://127.0.0.1:8765
```

## Publishing

House pattern: push to `main` → CI (`typecheck` + `test`) → the publish
workflow computes the version as `<major>.<minor>.<run-number>` and
`npm publish`es via **npm trusted publishing (OIDC)** — no npm token or
repo secret is stored (one-time setup: npmjs.com → package → *Package
settings* → *Trusted publishers* → this workflow).

Installed copies don't auto-update: `opencode plugin update opencode-ahp`
- `opencode service restart`.

## Documentation

- [`docs/design.md`](docs/design.md) — architecture and wire-contract findings.
- [`docs/futures.md`](docs/futures.md) — candidate future work
- [`docs/testing.md`](docs/testing.md) — the testing strategy: unit, live
  verification, two-machine, and conformance.

## License

MIT — see [LICENSE](LICENSE).
