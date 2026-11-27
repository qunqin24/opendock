# opencode-ahp

An opencode v2 plugin that makes opencode an agent in the **VS Code
Agents window** — on this machine, and on any other machine on your LAN.

It works by adding one WebSocket listener to your existing opencode
server, speaking [AHP](https://microsoft.github.io/agent-host-protocol/)
(Agent Host Protocol) on it — the protocol VS Code uses to talk to
external coding agents. No separate process runs on the host, and nothing
is installed on the client machine: VS Code ships the AHP client.

## What you get

In the Agents window, an `opencode` host with:

- **Sessions** — start new sessions, see the live list with opencode's
  titles and statuses, and pick up where you left off after a reconnect.
- **Working directories** — VS Code's folder picker works against the host's
  filesystem, and a session started in a picked folder runs *there*: its
  agent, changesets, terminal, and file reads are scoped to that
  directory (sessions without one use the plugin's own location).
  The host advertises its default directory as a `file://` URI so VS Code
  can pass the selected workspace folder when creating a session.
- **Model picker** — the real opencode catalog: every provider and model
  your server exposes. Models with variants offer a **Reasoning Effort**
  picker; **Default** uses the model without a variant.
- **Agent picker** — opencode's user-invocable agents (Build, Plan, and
  anything you define) appear as selectable agents; subagent-only agents
  are hidden.
- **Chat** — streaming text and reasoning, the full tool-call lifecycle
  (a call appears, gets approved, and shows its result as it runs), and
  context usage from the latest model call.
- **Permissions** — when opencode asks for permission to run a tool, the
  Agents window shows an approval prompt: approve runs the tool, deny
  blocks it.
- **Client tools** — other AHP clients can register their own tools on a
  session; the model calls them directly and the host delegates execution
  back to the client that provided the tool, with optional approval of the
  result.
- **Multi-chat** — one session can host additional chats, each running
  against its own opencode backend session with fully isolated turns; a
  chat can be removed without touching the session. Chats (and
  client-chosen session names) survive location reloads, and the peer-chat
  backends are real opencode sessions, so they also appear in opencode's
  own UI. Forking a chat into a new one is not supported (opencode
  exposes no fork to plugins).
- **Steering + queue** — send a message mid-turn and it either steers the
  running turn or queues for the next one.
- **Changesets** — diff views of the uncommitted, per-session, and
  per-turn changes, backed by the project's git state, with a
  discard-changes operation to restore a file. Requires the project
  directory to be a git repository (otherwise the views are empty);
  opt out with `capabilities.changesets: false`.
- **Terminals** — two kinds:
  - **Interactive shells** — a real shell in the project directory (your
    `$SHELL`, default 80×24); input and resize drive the process, and
    closing it kills the shell. This is what makes a VS Code Agents-window
    session usable — clicking it opens a working terminal.
  - **Command output** — read-only renderings of `shell`-tool runs: while
    a turn runs a foreground command, a terminal shows its streaming
    output and exit code, and leaves the list at turn end.

  Opt out of both with `capabilities.terminals: false`.

## Requirements

- **opencode v2** (≥ 2.2.6 verified; check with `opencode --version`). The
  plugin runs *inside* the opencode server — no extra process; it only
  opens one extra port.
- **VS Code ≥ 1.144** (1.148.0 verified) for the Agents window and
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

`opencode plugin add` writes a bare entry to your global config (the
command prints which file). To set options, edit that entry into object
form — and keep it the only entry for this plugin:

```jsonc
{ "plugins": [{ "package": "opencode-ahp", "options": { "token": "…" } }] }
```

Installed copies don't auto-update. To update:

```sh
opencode plugin update opencode-ahp
opencode service restart
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
AHP listener starts when the project containing the plugin config —
opencode calls it a *location* — is first opened.

## Options

Set options in the `options` object of your plugin entry (see
[Install](#install)). If you're running from a checkout, you can instead
keep them in an `options.jsonc` file next to `src/index.ts` — start from
[`options.example.jsonc`](options.example.jsonc), which documents the
full option set, key by key. When both are present they merge per key,
with the `opencode.jsonc` value winning. A few of the important ones:

| Key | Default | Description |
| --- | --- | --- |
| `token` | auto | The credential clients must present, via `?token=…` in the URL or an `Authorization: Bearer` header. **Always enforced**, loopback or not. Omit to have the plugin generate one on first start — it's persisted in opencode's plugin storage and printed once to the server log (`[opencode-ahp] AHP token …`) |
| `host` | `"127.0.0.1"` | Bind address; a **non-loopback bind requires an explicit `token`** (the listener refuses to start otherwise) |
| `port` | `8765` | WS listen port |
| `allowedWorkingDirectories` | `[]` (unrestricted) | Optional directory allowlist: absolute path prefixes that bound which paths a client may name (the `createSession.workingDirectories` target and the unconfined `resource*` commands). Opt-in hardening — the AHP token is a full client credential, so this scopes blast radius rather than sandboxing (design.md §3.3) |

## Quick start (this machine)

1. **Install** (above), then put your options in the plugin entry. The
   cleanest setup is a single plugin entry in the project's
   `.opencode/opencode.jsonc` (if `opencode plugin add` wrote a bare
   entry to your global config, remove it — the plugin should be
   configured in exactly one place):

   ```jsonc
   // the project's .opencode/opencode.jsonc
   {
     "experimental": { "location_idle_timeout": false },
     "plugins": [{
       "package": "opencode-ahp",
       "options": { "token": "change-me-to-a-long-random-string" }
     }]
   }
   ```

   Two things worth knowing:

   - **Set your own `token`.** If you omit one, the plugin generates a
     token and prints it to the opencode server log once — that works,
     but picking your own is easier.
   - **`location_idle_timeout: false` is required.** In opencode v2 a
     project directory (a *location*) loads when it's first used and is
     unloaded after 60 minutes of idleness. AHP connections don't count
     as location activity, so without this line the listener — and your
     host in VS Code — goes away while you're away. A plugin cannot
     prevent this sweep ([docs/design.md](docs/design.md) §15.3).

2. **Restart the server** (`opencode service restart`) and **open the
   project once** — in the opencode TUI, in your IDE, or headless:

   ```sh
   curl -g -u opencode:<server-password> \
     'http://127.0.0.1:<port>/api/location?location[directory]=<project-dir>'
   ```

   (Drop `-u opencode:<server-password>` if your server has no
   password.) This is the only manual step per server process: the plugin
   can't run before its location has booted, and booting starts the AHP
   listener.

3. **Add the host in VS Code** — Command Palette →
   **`Agents: Add Remote Agent Host…`** → paste:

   ```
   ws://127.0.0.1:8765/ahp?token=<token>
   ```

   Pick the `opencode` host in the Agents window's picker, start a
   session, and you're chatting with your local opencode.

## Use it from another machine on your LAN

Everything in the [quick start](#quick-start-this-machine) still applies;
this section is the delta. The transport is plain `ws://` with the token
in the URL (cleartext — LAN only, by design). Off-LAN options (Tailscale,
a dev-tunnel port forward, any `wss://` proxy) are operational; the host
accepts any `ws(s)://` URL whose path and token match.

### Host side

1. **Bind the listener to a LAN address, with an explicit token** — a
   non-loopback bind refuses to start without one:

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

   Keep the quick start's `experimental.location_idle_timeout: false`
   line — it's mandatory for every setup, LAN or not.

2. **The opencode server itself can stay on loopback.** The AHP listener
   binds its own address, and the client talks only to the AHP
   WebSocket — the opencode HTTP API is not involved. Expose the server
   on all interfaces (`opencode service set hostname 0.0.0.0` + restart)
   only if you also want to reach the opencode HTTP API from the second
   machine (e.g. to boot the location headlessly from there).

3. **Boot the location once after each fresh server process** (e.g. a
   machine reboot) — the AHP listener exists only while the location is
   up, and a location boots on first use. Open the project once (run the
   `opencode` TUI in it, or open it in an IDE), or headless:

   ```sh
   curl -g -u opencode:<server-password> \
     'http://127.0.0.1:<port>/api/location?location[directory]=<project-dir>'
   ```

   With the idle-timeout line set, the location (and the listener) then
   stays loaded indefinitely, and reloading the location (config change,
   `opencode service restart`) re-boots it automatically. (The one-time
   boot is an opencode limitation — plugins cannot run before their
   location has booted; a zero-touch boot needs an upstream auto-boot
   option.)

4. Verify: `curl -s http://<host-lan-ip>:<port>/healthz` → `ok`. If the
   second PC can't reach the port: check the host's firewall, e.g.
   `sudo ufw allow 8765/tcp`.

Full two-machine walkthrough (and the complete testing strategy: unit,
static, live verification, two-machine, conformance):
[`docs/testing.md`](docs/testing.md).

### Client side (each PC)

Command Palette → **`Agents: Add Remote Agent Host…`** → paste:

```
ws://<host-lan-ip>:8765/ahp?token=<token>
```

The host then appears in the Agents window's picker — select it and start
a session.

Or persist the URL in `settings.json` — with Settings Sync on, that one
line propagates to every PC:

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

The client URL becomes `wss://<host>:<port>/ahp?token=<token>` and the
token/Origin policy is unchanged. The certificate must be trusted by the
client machine for the URL's hostname: VS Code expects a real chain
(mkcert on a dev network, or any CA the client trusts); self-signed
certs only work for script-based checks
(`NODE_TLS_REJECT_UNAUTHORIZED=0`). With `tls` set the port is
**TLS-only** — plain-HTTP requests to it fail, and the health check
becomes `curl -k https://<host>:<port>/healthz` → `ok`.

---

*Everything below is for people who work on the plugin itself, not for
users.*

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

### Local environment (git-ignored)

`docs/local.md` is the designated place for each developer to keep
local development environment specifics — facts about their own machine
that never belong in the committed tree, such as LAN IPs and hostnames,
per-machine versions, the port and config location of a daily opencode
service, the current LAN test server token/URL, reference checkouts
(the opencode and AHP repos, the extracted VS Code AHP client
sources), and scratch roots. The file is git-ignored and optional: it
does not exist on machines that have never created it, and nothing in
this repo requires it.

## Publishing

The published package is [`opencode-ahp` on npm](https://www.npmjs.com/package/opencode-ahp).

Publishing is CI-only, on a **daily schedule** (09:00 America/Denver) with
a manual trigger (Actions tab → *Create release* → *Run workflow*) for urgent
releases — a push to `main` no longer publishes on its own, so merged PRs
(batched, including external contributors') don't each get a release.
Each run first guards on commits since the last release tag and skips if
there are none; a published build is `npm publish`ed and tagged
`v<version>` as a GitHub release listing the commits since the previous
one. The version is computed as `<major>.<minor>.<run-number>` — run
numbers are consumed by skipped runs too, so the sequence has gaps — via
**npm trusted publishing (OIDC)** — no npm token or repo secret is stored
(one-time setup: npmjs.com → package → *Package settings* → *Trusted
publishers* → this workflow).

## Documentation

- [`docs/design.md`](docs/design.md) — architecture and wire-contract findings.
- [`docs/futures.md`](docs/futures.md) — candidate future work
- [`docs/testing.md`](docs/testing.md) — the testing strategy: unit, live
  verification, two-machine, and conformance.

## License

MIT — see [LICENSE](LICENSE).
