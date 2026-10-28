# Hub

<img src="web/public/icon.svg" alt="" width="72" align="right">

**Hub** is a central hub that your AI agent harnesses connect to. Each harness (a coding agent's
terminal app, server or IDE plugin) runs a thin client, a *spoke*, that connects outbound to your hub;
the hub gives you one place to follow, steer and be notified about every agent session on every machine,
from your phone or any browser.

Hub is harness-agnostic by design: the hub's API, web console and spoke protocol are not tied to one
agent. [OpenCode](https://opencode.ai) is the first supported harness, through the `@huynle/hub` OpenCode
plugin; Claude Code, Codex and terminal agents described by a preset connect through spokes of their own
([docs/harnesses.md](docs/harnesses.md)). More harnesses can connect by speaking the same spoke protocol
(`packages/protocol`), most easily on the spoke SDK ([docs/spoke-sdk.md](docs/spoke-sdk.md)).

| Harness | Connect it with | Evidence | What the hub can do |
|---|---|---|---|
| OpenCode | `opencode plugin add @huynle/hub` | native | everything below |
| Claude Code | `hub claude [claude args…]` | hooks | follow, message, answer permissions, stop; launches |
| Codex | `hub codex [codex args…]` | rpc | follow, message, turns, steer, interrupt, answer approvals, stop; launches |
| Presets (Aider, goose, your own) | `hub preset run <name>` | screen | paste prompts and messages, Ctrl-C |

The full per-harness matrix, setup, limits and threat model: [docs/harnesses.md](docs/harnesses.md).

Formerly **opencode-voice** and, briefly, **opencode-hub**
([what changed](#migrating-from-opencode-voice-or-opencode-hub)).

## Features

- **Remote console**: one hub connects all your agent processes and machines. Follow live activity
  (tool calls, thinking, subagents, streamed replies), read the conversation, send a turn (it steers the
  run while the session is busy), stop a whole session tree, answer permissions, switch models, and
  start new sessions, from the phone.
- **Notifications**: web push when a session asks a question, needs permission, fails, or is **all done** (the
  session and all its subagents and scripts settled, once per run), plus opt-in finer kinds (every turn,
  stopped, retrying, each subagent, each script, long tools) and **Activity updates** (one quiet, self-replacing
  notification per session); one toggle per kind and device, quiet hours and per-session mute
  ([docs/notifications.md](docs/notifications.md)).
- **Live without waste**: the console's stream resumes where it left off after a lock or app switch (event
  ids + replay), pauses while the page is hidden, and carries streamed text only for the session on screen.
- **Running detection**: a session counts as working while OpenCode reports it busy or retrying, or while a
  shell or terminal it started still runs (e.g. a background `sleep 60 &` or build script), also when it was
  already running before the plugin started.
- **Voice** (optional feature, `/voice`): dictation and a hands-free conversation mode with a voice agent
  that answers in short spoken sentences on a fast model and hands real work to background subagents.
  Bring your own speech: OpenRouter or any OpenAI-compatible STT/TTS service (including self-hosted).
- **What's open in your terminals first**: sessions open in Herdr or the OpenCode TUI, grouped like
  Herdr's sidebar, with the rest under Recent; rename, pin and archive in sync across devices.
- **Agent identity**: every session's shells carry its own hub identity, so an agent can run `hub status`, name
  itself (`@scout`), claim a role (`@@reviewer`) and read other sessions, with app tokens for scripts and device
  tokens for apps ([Agent identity](#agent-identity-agent-api)).
- **Agent messaging**: sessions, scripts and you message each other through the hub (`hub msg @reviewer …`,
  `hub ask`, the OpenCode `hub` tool, `/msg`, `hub mcp`); asks to `@me` become Decisions you answer from the
  console ([Agent messaging](#agent-messaging)).
- **Launches**: you, a script or an app start a session on one of your machines (`hub launch --branch feat/x
  --prompt "…"`): a `hub node` daemon prepares a git worktree, the session gets its name, roles, labels and first
  prompt, and ends by itself when it is done, with signed webhooks for apps ([docs/launches.md](docs/launches.md)).
- **More harnesses**: Claude Code (`hub claude`, through its hooks), Codex (`hub codex`, through its app-server)
  and any terminal agent described by a data-only preset (`hub preset run`); the console shows only the controls
  each harness's spoke serves, with an evidence badge and honest delivery labels
  ([docs/harnesses.md](docs/harnesses.md)). Write a spoke for another harness on the spoke SDK and check it with the
  conformance suite ([docs/spoke-sdk.md](docs/spoke-sdk.md)).
- **Session details**: context usage, todos, MCP status, branch and per-file diffs, on demand; unread
  marks synced per user.
- **Self-hostable**: a hub on your computer with nothing extra to install, or your own hub for phones
  anywhere (standalone binary, Docker or Bun), with single-owner pairing or sign-in with Google for
  several people.

In a harness, `/hub` configures the harness's connection to the hub, and each feature is its own
`/<command>`: today `/voice`, `/who` and `/msg`; more features will be added the same way.

Requires OpenCode v2 (tested with 2.0.25) for the OpenCode harness; the Claude Code spoke is tested with Claude
Code 2.1.296 and the Codex spoke with Codex 0.160.0. The hub runs on OpenCode's own runtime, a standalone binary,
Docker, or [Bun](https://bun.sh) ≥ 1.3.

## Quick start (OpenCode)

Install the plugin (adds it to your global OpenCode config), then restart the background service so it
loads:

```sh
opencode plugin add @huynle/hub
opencode service restart
```

Install from npm: the npm package ships the built web app, so the plugin can run a local hub. A GitHub
install (`opencode plugin add github:huynle/hub`) has no built web app (`web/dist` is not in the
repository): it works for connecting to a hub that runs elsewhere, but it does not start a local hub
(`/hub` → **Start local hub** and the automatic start say the web app is missing; a hub started by hand
from such an install answers 503 on its pages). To run a hub yourself, use the npm package, a [release binary](#running-the-hub)
or Docker, or run `npm install && npm run build:web` in a source checkout.

Then, in OpenCode:

| Command | What it does |
|---|---|
| **`/hub`** | Configures this harness's hub connection: the server URL, connect and approve (enroll) this machine, which sessions to share (mode), pair a phone, and open the hub in the browser. The first time it offers **Set up Hub** with two paths (below). |
| **`/voice`** | The Voice feature: talks to the session on screen. It connects (running the setup first when needed), shares the session for Voice and opens it in the browser with Voice mode starting. |
| **`/who [project \| @@role]`** | Lists the hub's named and role-holding sessions (name, project, state, online, roles), asked as the session on screen. |
| **`/msg @name text`** | Sends the text word for word to another session (`@name`, `@@role`, `@name.project`, `ses_…`, or `@me` for you) as the session on screen. Needs a shared, connected session. |

### Local: everything on this computer

1. `/hub` → **On this computer (local — nothing to install)**. The plugin starts a hub in the background,
   connects this machine (a fresh local hub approves it by itself), shares every session ("On this
   computer, only sessions I choose" shares only sessions you switch on), and opens the hub in your
   browser with a one-time sign-in link.
2. Use it: open any session to follow and steer it. For Voice, set up speech once (Settings → Speech):
   pick a provider and paste its API key (one [OpenRouter](https://openrouter.ai/keys) key covers both
   directions, or point both at your own OpenAI-compatible servers), **Save**, then **Test voice**. Keys
   stay on this computer in `~/.local/state/hub`.
3. **`/voice`** in a session opens it in the browser with Voice mode (the hands-free loop) starting;
   `/hub` → **Open hub in browser** opens the home page any time.

### Your own hub (phones anywhere)

Phones need HTTPS (for the microphone and push), so for phone use away from this computer, run the hub
on a server behind your HTTPS reverse proxy (see [Running the hub](#running-the-hub)), then:

1. Open `https://<your hub>/pair` in the browser you will approve from and enter the 6-digit code from
   the hub's log (first device only; later devices get codes from `/hub` → **Pair a phone**).
2. `/hub` → **Connect to a hub…** → `https://hub.example.com`. The plugin checks the hub answers, then
   opens its approve page: check the code and approve this machine. OpenCode notices the approval and
   asks which sessions to share (default: all).
3. On each further machine: `/hub` → **Connect to a hub…** again. Add phones with `/hub` → **Pair a
   phone**.

Pre-configured machines: with `"server": "https://hub.example.com"` in
`~/.config/hub/config.json`, `/hub` leads with **Connect to hub.example.com**.
`/hub` → **Server** → **Set up again…** switches between local and a hosted hub later.

Optional: put the voice agent on a fast model in `~/.config/hub/config.json`:
`"voiceModel": "anthropic/claude-haiku-4-5"` (any `provider/model` you have). Subagents keep the
session's model.

## Running the hub

The hub serves the web app, pairs devices, enrolls machines, and does push and (for Voice) speech. Pick one:

| Way | For | How |
|---|---|---|
| **`/hub` → On this computer** | Local use; nothing to install (plugin from npm) | started by the plugin with OpenCode's own runtime (`BUN_BE_BUN=1 opencode bin/hub.ts`), or `bun` when installed |
| **Standalone binary** | Any server or laptop, no runtime needed | `hub-<os>-<arch>` from the [releases](https://github.com/huynle/hub/releases) |
| **Docker** | Servers | `ghcr.io/huynle/hub` (linux/amd64, linux/arm64) |
| **bunx / from source** | Bun users, development | `bunx --package @huynle/hub hub-server` · `bun bin/hub.ts` |
| **Kubernetes (cluster mode)** | Several pods on Postgres + Valkey, rolling updates | [docs/cluster.md](docs/cluster.md), manifests in [`deploy/k8s/`](deploy/k8s/) |

Every way reads the same configuration (env vars over `hub.json`, see [Configuration](#configuration)) and
answers `--help` and `--version`. While no device is paired, the hub logs a pairing code for the first one.

**Standalone binary.** One file per platform with the runtime and the web app embedded:
`hub-<darwin|linux>-<arm64|x64>` and `hub-windows-x64.exe`, plus `SHA256SUMS`.

```sh
curl -LO https://github.com/huynle/hub/releases/latest/download/hub-linux-x64
curl -LO https://github.com/huynle/hub/releases/latest/download/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS && chmod +x hub-linux-x64
HUB_PUBLIC_URL=https://hub.example.com ./hub-linux-x64
```

On macOS, a downloaded binary is quarantined: `xattr -d com.apple.quarantine hub-darwin-arm64`.
Build them yourself with `scripts/build-binaries.sh [target…]` (writes `dist/`).

**Docker.**

```sh
docker run -d --name hub -p 127.0.0.1:4097:4097 -v hub-data:/data \
  ghcr.io/huynle/hub
docker logs hub          # the first device's pairing code
```

Without `HUB_PUBLIC_URL` the app is at `http://127.0.0.1:4097`. Behind a reverse proxy, set
`HUB_PUBLIC_URL` to the public origin. Docker Compose:

```yaml
services:
  hub:
    image: ghcr.io/huynle/hub:latest
    restart: unless-stopped
    ports: ["127.0.0.1:4097:4097"]   # your reverse proxy terminates HTTPS in front of this
    environment:
      HUB_PUBLIC_URL: https://hub.example.com
      # OPENROUTER_API_KEY: sk-or-…  # optional, for Voice; keys can be set in the app instead
    volumes: ["hub-data:/data"]
volumes:
  hub-data:
```

The image sets `HUB_HOST=0.0.0.0`, `HUB_PORT=4097` and `HUB_STATE_DIR=/data`. Build it locally with
`docker build -t hub .`.

**bunx / from source.** `bunx --package @huynle/hub hub-server` (needs Bun ≥ 1.3), or in
a checkout: `npm install --no-audit --no-fund && bun bin/hub.ts`. `scripts/hub-local.sh` runs it in the
foreground with `hub.json`; `scripts/io.github.huynle.hub.plist` is a launchd template. The
`opencode-hub` and `opencode-voice-hub` commands still work as aliases of `hub-server`.

**Security:** the hub can drive your OpenCode sessions, which can run tools. Every API call needs a
paired device or a signed-in user; spokes need machine tokens; nothing trusts the client IP. For a public
hostname, consider [sign-in with Google](#multi-user-sign-in-with-google) or an authenticating proxy in
front of the web app, and leave `/spoke/*`, `/auth/*`, `/healthz`, `/.well-known/hub`, the manifest and
icons reachable for spokes, sign-in, app discovery and the PWA (and `/mcp`, bearer-authenticated, if MCP clients
or gateways use [MCP over HTTP](#over-http-mcp)).

## Configuration

- **Hub**: env vars (`HUB_HOST`, `HUB_PORT`, `HUB_PUBLIC_URL`, `HUB_STATE_DIR`, `OPENROUTER_API_KEY`, …)
  over `~/.config/hub/hub.json` (`$HUB_CONFIG`); see [Central server](#central-server) and
  [hub.json](#hubjson). Speech providers and keys are easiest to set in the app (Settings → Speech).
- **Plugin** (OpenCode spoke): `~/.config/hub/config.json` (`$HUB_SPOKE_CONFIG`; server, mode, machine
  token, voice model…), written by `/hub`; see [Spoke](#spoke-opencode-plugin).
- The former `VOICE_*`, `OPENCODE_VOICE_CONFIG` and `OPENCODE_HUB_CONFIG` names and the `opencode-voice`
  and `opencode-hub` directories still work; see
  [Migrating from opencode-voice or opencode-hub](#migrating-from-opencode-voice-or-opencode-hub).

## How it works

The hub serves the web app, push and (for Voice) speech, and talks to harnesses only through
spokes over one protocol (`src/protocol.ts`). The OpenCode plugin is the first spoke: it runs in every
OpenCode process (the background service and each `opencode --standalone`), connects **outbound** to the
hub over a WebSocket, lists sessions, forwards compact events, and runs prompts, stops and permission
replies on the hub's request.

## Remote console (hub API)

Every session a connected process of yours reports can be inspected and controlled; Voice only gates
conversation mode and utterances (403 `not_exposed` for sessions not shared with Voice in `session` mode).

| Route | Result |
|---|---|
| `POST /api/sessions/:id/turn {text, images?}` | sends a turn; while the session tree is running it steers instead (202 `{mode: "steer", inboxID}`). An idle turn answers its `TurnResult` (`{outcome, reply, message?}`) when it ends; with `Prefer: respond-async` (the console sends it) a turn still running after 1.5 s answers 202 `{mode: "turn"}` (`Preference-Applied: respond-async`) and its result follows as an SSE `turn` event `{sessionID, outcome, reply, message?}`, so no proxy cuts a long request. The session stays busy until the turn ends either way. `images` is up to 4 `{mime, data, name?}` (PNG, JPEG, WebP or GIF; canonical base64 whose bytes match the type; each at most 512 KB decoded, together at most 750,000 base64 characters); `text` may be empty when images are attached. They reach OpenCode as inline file attachments. 400 empty, over 100,000 characters or invalid images (with the reason); 409 "A turn is already running for this session" |
| `GET /api/sessions/:id/timeline?limit=N&order=desc` · `?limit=N&before=<older>` | the conversation as timeline rows, newest first: the latest `limit` rows (1–200, default 50) in chronological order, plus `older` (the cursor of the rows before them) while there are more. `before=<older>` returns the page before that cursor. Cursors are row keys, so they stay valid while new messages arrive. A page starts at a message boundary when it can (it may be up to twice `limit` then). 400 for an unknown cursor (history reverted or compacted: start again from the newest page). The forward mode `?limit=N&cursor=` (oldest rows first, `cursor` for the next page) still works; it cannot be combined with `before` or `order=desc`. The spoke reads OpenCode's history for a first page and serves the following pages from a short-lived per-session cache (30 s, dropped when the session changes) |
| `GET /api/sessions/:id/timeline/messages/:message/files/:index` | one image attached to a user message, as bytes with its type (`cache-control: private, no-store`). Timeline user items list their attachments as `files: [{index, mime, name?}]` (never the bytes). Every timeline row carries `pos` (ordering position: session message order, then part order; derived from the message's creation time, kept increasing, so it does not change as pages move); tool rows `callID`, subagent tool rows `childSessionID` and `title` (the task description), assistant text rows `ordinal`. Only PNG, JPEG, WebP and GIF are served (404 otherwise or when missing); 413 when the image would not fit in a protocol frame (about 650 KB) |
| `POST /api/sessions/:id/rename` `{auto: true}` | Auto-name: OpenCode regenerates the title with its Title agent (`session.update` with an empty title on the process's own server). 200 `{title}` (or `{title, unchanged: true}` when OpenCode kept it), 202 `{pending: true}` when it is still generating after 20 s (the catalog updates when it lands), 409 `plugin_outdated` when no process reporting the session supports it, 502 when the process cannot reach its server or the title model failed |
| `POST /api/sessions/:id/rename` | `{title}` → `{title}`: renames the session in OpenCode (`session.update`), through the process that owns it, else any other process that reports it. The title is trimmed and must be 1–200 characters (400 otherwise). Works with Voice off; the new title shows in every console at once (the spoke reports it before answering) |
| `POST /api/sessions/:id/stop` | interrupts running descendants deepest first, then the root; idempotent. Also releases the hub's turn lock for the tree: a turn request still waiting answers `{outcome: "interrupted"}` and the next turn can start (`/interrupt` does the same) |
| `GET /api/sessions/:id/summary` | context usage, todos, MCP status (at most 100 servers), branch and working-tree change stats (each part optional). `changes` lists at most 500 files, most-changed first, with `totalFiles` and `truncated`; its `additions`/`deletions` cover every file |
| `GET /api/sessions/:id/diff?file=` | one file's patch, on demand (capped at 400 KB as JSON, then `truncated: true`); never stored in the hub |
| `POST /api/sessions/:id/read` · `GET /api/reads` | per-user read marks, synced to your other devices |
| `GET /api/events?lite=1&session=<id>&last=<id>` | the live stream (SSE). Every message has an `id:`; reconnecting with `Last-Event-ID` (EventSource does it) or `?last=` replays what was missed when the hub still has it (last 2000 events or 5 minutes per user; one fresh `catalog` stands for any catalog changes), else sends the catalog then `{type: "resync"}` (the page refetches what it shows). Ids are `<epoch>.<n>`; a hub restart starts a new epoch. `lite=1` leaves out `delta`/`reasoning` except of `session`'s tree (status, activity, catalog, turns and the rest still come). Heartbeat: `event: ping` every 20 s |
| `GET /api/push/prefs?endpoint=` | `{prefs, quietHours, activityMinutes, muted, subscriptions, subscribed?}`: this device's toggles (`handoff, question, permission, done, failed, turn, stopped, retry, subagentDone, subagentFailed, jobDone, jobFailed, longTool, say, activity`; `PUT` also accepts the legacy `finished` → `done` and `blocked` → question + permission), activity update interval and quiet hours, the user's muted sessions, how many subscriptions the hub holds for this device, and whether it holds `endpoint` |
| `PUT /api/push/prefs {toggles…, quietHours?, activityMinutes?}` | boolean toggles (a 0.5.0 `blocked` sets question and permission); `quietHours` `{start: "HH:MM", end: "HH:MM", timeZone}` or `null`; `activityMinutes` a whole number 1–60 (400 when invalid) |
| `POST /api/push/subscribe {subscription, prefs?, oldEndpoint?}` · `POST /api/push/unsubscribe {endpoint}` | this device's subscriptions; `oldEndpoint` is dropped (rotated subscription). The endpoint must be https on a public hostname that resolves only to public addresses (no loopback, private, link-local, CGNAT or ULA hosts, no `localhost`/`*.local`/`*.internal`), else 400 |
| `POST /api/push/test {kind?}` | a test notification to the caller's device only, shaped like `kind` when given (400 for an unknown kind): `{sent, failed: [{host, status?}], subscriptions}`; 429 with `retry-after` within 10 s of the last one |
| `PUT /api/push/mute {sessionID, muted}` | mutes or unmutes a session's notifications for the user: `{muted}` |

## Agent identity (agent API)

**Organization.** `PUT /api/agent/sessions/:addr/archive {archived: true|false}` archives or unarchives one
session in Hub views without deleting it in its harness. Users always may; app tokens need `sessions:manage`.
The operation is idempotent, returns `{sessionID, archived, changed}`, and preserves unrelated view preferences.
MCP exposes the same operations as `archive` and `unarchive`. Naming (`POST /api/agent/name`) also takes an app
token with `sessions:manage`; role claims and releases take one with `sessions:manage` **and** a grant allowing
`roles` whose projects cover the session's directory (the session must be online), under the kill switch and hourly
cap, with every outcome in the agent audit (verbs `roles` and `roles.release`). Reserved roles stay yours to assign.
Apps and users name the session (`session`); foreign and unknown sessions are both `404 not_found`. MCP: `name`,
`role_claim` and `role_release`. Each change is one `session.named`, `role.claimed` or `role.released` event.

**Events.** `GET /api/agent/events?cursor=&wait=&limit=&type=&session=` reads a bounded per-user journal (24 h or
10,000 events) of compact events: `session.added/removed/changed`, `blocker.opened/closed`, `machine.changed`,
`message.changed`, `launch.changed`, `session.archived`, `session.named`, `role.claimed`, `role.released`. Each is `{id, at, type, subject, data}` with IDs and states
only: never prompts, message bodies, titles, blocker summaries, launch reasons or labels. Without a cursor the answer
is empty with a cursor at the latest event; pass the returned `cursor` back to get what came after. `wait` (0–60 s)
holds the request while nothing matches; `limit` is 1–200 (default 50); `type` (exact, or `launch.*`) and `session`
may repeat and still advance the cursor over what they skip. At most 1,000 events are inspected per request; `more`
means some remain. A cursor the journal no longer covers (expired, trimmed, hub restarted) answers
`{events: [], cursor, more: false, reset: true, refresh: ["status", "sessions", "inbox", "decisions", "launches"]}`:
re-read those, then continue with the new cursor. `GET /api/agent/watch` streams the same events live over SSE
(`{type: "ready"}` first, `{type: "reset", refresh}` when its cursor is no longer covered, `event: ping` while
idle), with the same visibility and filters (`blocked=1` is `type=blocker.*`). A malformed, forged or another user's cursor is
`400 invalid_cursor`. Unknown event types are valid; ignore them. App tokens need `events:subscribe`, and see each
family only with its scope: session and machine events with `sessions:read`, archive, name and role events with `sessions:manage`,
messages they are a party to with `messages:read`, launches they started with `sessions:launch`. MCP: `events`.

Agents, scripts and apps talk to the hub through `/api/agent/*`, a small API with its own credentials, separate
from the console's routes. Every request resolves to exactly one **actor**:

| Actor | Credential | Who holds it |
|---|---|---|
| user | the device cookie (browsers) or the same secret as `Authorization: Bearer <device token>` (apps, CLIs; [linked with a code](#multi-user-sign-in-with-google)) | you, on one of your devices |
| session | a **session token** `hst1.…` the hub mints for each session a spoke reports | that session's shells (`HUB_SESSION_TOKEN`) |
| app | an **app token** `hat_…` you create (scopes `sessions:read`, `sessions:manage`, `messages:send`, `messages:read`, `sessions:act`, `sessions:launch`, `events:subscribe`) | a script or tool outside a session (`hub login`) |

**Session tokens in shells.** The hub mints a 24 h token for every session (subagents included) its spokes report
for you and pushes it to the spoke, which keeps it in memory only. Every shell an agent starts through OpenCode's
shell tool gets that session's `HUB_SESSION_TOKEN` and `HUB_URL` (the spoke's hub), with the hub bin dir first on
PATH, so [`hub`](#hub-cli) inside a session acts as that session: `hub whoami` prints `session ses_… on machine
mch_…`. Tokens are renewed automatically before they expire; a shell started earlier keeps its old token, so a
`token_expired` answer means: start a new shell. A token stops working as soon as the session is no longer
reported by that machine, the machine is revoked or the user is disabled (see
[docs/multi-user.md](docs/multi-user.md#agent-actors-and-tokens)). Spokes of other harnesses get tokens only
when they announce the `sessionTokens` feature. Each session also has a separate **act token**, which never goes
into a shell; see [Agent actions and grants](#agent-actions-and-grants).

**Addressing.** Wherever a route or command takes a session, it takes an address, resolved among the caller's
own sessions only:

| Address | Means |
|---|---|
| `ses_…` | a session ID, or an unambiguous prefix of one |
| `@name` | a named root session. Names are `[a-z0-9-]`, 2–40 characters; each root session gets one from its first real title: its first few words, at most 4 and 24 characters, with ID-like tokens such as `ses_…` dropped (`-2`, `-3` on a clash; later title changes keep it) and can be renamed (`hub name @scout`); the old name stays an alias for 24 h. `me` is reserved (`@me` is always the user): a title like "Me" derives `me-2` |
| `@me` | the user (messages and Decisions; never a session) |
| `@@role` | the session(s) holding a role (`hub role claim reviewer`); `--exclusive` claims fail while another live holder exists |
| `@name.project`, `@@role.project` | scoped to a project (its name, else the folder name) |

An address several sessions match answers `ambiguous` with the candidates; another user's sessions, names and
roles do not exist (`not_found`). A name is released 7 days after its session is archived or deleted; a role
holder offline for 30 minutes loses the role. Some role names (such as `orchestrator…`) are reserved to the user.

In an OpenCode prompt, an address is a reference, not routing: the prompt still goes to the session you typed it
in, word for word, and the plugin attaches a short `hub-references.txt` note naming the session(s) it means (state,
machine, project, your open asks to it) so the agent can contact them with the `hub` tool. OpenCode's own `@file`
and `@agent` mentions win; unknown names add nothing; if the hub does not answer within 1.5 s the prompt goes on
without the note.

**Routes.** Errors are `{error: {code, message, hint?, …}}` with the codes the [CLI](#hub-cli) maps to exit
codes. Console routes refuse session and app tokens (403); `/api/agent` refuses a request carrying both the
cookie and a hub bearer token (400).

| Route | User | Session | App (`sessions:read`) | Result |
|---|---|---|---|---|
| `GET /api/agent/whoami` | ✓ | ✓ | ✓ (any scope) | `{actor, user}` |
| `GET /api/agent/status` | ✓ | ✓ | ✓ | machines → projects → sessions, each with name, roles, state, harness, activity and blockers, plus `attention` |
| `GET /api/agent/sessions?project=&state=&machine=&label=k=v` | ✓ | ✓ | ✓ | the same sessions as a flat list |
| `GET /api/agent/sessions/:addr` | ✓ | ✓ | ✓ | one session with full blockers and the spoke's summary (`unsupported` when its harness lacks it) |
| `GET /api/agent/sessions/:addr/log?n=20` | ✓ | ✓ | ✓ | newest timeline rows (1–200); `422 unsupported {feature, harness}` when the spoke has no timeline, `503 offline` |
| `GET /api/agent/watch?blocked=1&session=<addr>&cursor=` | ✓ | ✓ | ✓ (+ each family's scope) | SSE of the same compact events as `/api/agent/events` (see **Events**), after `ready`; each frame's `id:` is a cursor to resume with (`?cursor=` or `Last-Event-ID`); `reset` when it is no longer covered |
| `GET /api/agent/events?cursor=&wait=&limit=&type=&session=` | ✓ | ✓ | `events:subscribe` (+ each family's scope) | compact events after a resumable cursor (see **Events** above) |
| `GET /api/agent/who?project=&role=` | ✓ | ✓ | ✓ | named, role-holding and online sessions |
| `POST /api/agent/name {name, session?}` | ✓ | own session | `sessions:manage` | names a session (`409 name_taken`) |
| `POST /api/agent/roles/claim {role, exclusive?, project?, session?}` · `…/roles/release` | ✓ | own session | `sessions:manage` + `roles` grant | claims (with a new `generation`) or releases a role; never a reserved role for an app |
| `POST /api/agent/msg {to, text, wake?, urgent?, all?}` | ✓ | ✓ | `messages:send` | tells a session (`all`: every holder of a role); never yourself |
| `POST /api/agent/ask {to, text, expiresIn?, wait?}` | ✓ | ✓ | `messages:send` | an ask, open until answered, declined or expired; `wait` (≤ 60 s) returns the `answer` |
| `POST /api/agent/ask {to: "@me", text, options?, recommendation?, urgency?, tier?, deadline?, onTimeout?, about?, wait?}` | – | ✓ | `messages:send` | opens a **Decision** for the user (below): `{message, decision, answer?}` |
| `GET /api/agent/decisions?state=` · `…/decisions/:id` | ✓ (all) | own | `messages:read` (own) | the Decisions the caller asked |
| `POST /api/agent/reply {replyTo, text}` · `…/decline {replyTo, why}` | ✓ | ✓ | `messages:send` | answers a message you received (to its real sender); not a Decision's ask |
| `GET /api/agent/inbox` · `GET /api/agent/messages/:id?wait=` | ✓ | ✓ | `messages:read` | open asks, your waiting asks, recent messages, mutes · one message and its answer |
| `POST /api/agent/mute {session}` · `…/unmute` | ✓ | ✓ | `messages:send` | refuses (or allows again) messages from a session |
| `GET` · `PUT /api/agent/messaging {enabled}` | ✓ | – | – | the per-user messaging switch (off: `423 paused`) |
| `POST /api/agent/app-tokens {label?, scopes?}` · `GET` · `DELETE …/:id` | ✓ | – | – | creates (token shown once), lists, revokes app tokens |

The act verbs, grants, kill switches and the agent audit are in [Agent actions and grants](#agent-actions-and-grants).

**Decisions and `@me`.** `@me` addresses the user: `msg @me` is stored in the user's inbox (push kind `message`);
`ask @me` opens a Decision `{id: "dec_…", from, about, question, options: [{id, label, safe?}], recommendation:
{option, why?}, urgency: low|normal|high, tier: confirm|tap, deadline, onTimeout, state, answer?}` (push kind
`decision`, generic body, opens `about[0]`, default the asking session). Only the user answers, on the console:
`GET /api/decisions?state=`, `GET /api/decisions/:id`, `POST /api/decisions/:id/answer {option, text?}` (`text` alone
for a Decision without options; same-origin cookie or a device token; `tap` Decisions only with the console
cookie, else `403 forbidden`). The first answer wins, a later one gets `409 {code: "gone"}`; the answer reaches the
asker as the user's reply to its ask (`Decision dec_…: Hold [hold]`). At the deadline, `onTimeout` (only an option
marked `safe`) answers it (`answeredBy: "timeout"`); without one the Decision stays open and is pushed again once.
`deadline` is in seconds and must fall before the ask expires (default: a day past the deadline, at most 7 days).
The console shows open Decisions as cards on Home and in the sessions they concern (SSE `{type: "decision",
decision}` on every open, answer, timeout, escalation and expiry); a `decision` push opens its card
(`?decision=<id>`).

Reads come from the hub's catalog; only `show` (summary) and `log` (timeline) ask the session's spoke, so they
depend on what its harness supports. A session token reads all of its user's sessions but names and claims roles
only for itself; an app token reads, and messages only with the `messages:*` scopes. `GET /.well-known/hub` (public) answers `{publicURL, version,
minClientVersion, auth, features}` for apps and CLIs.

**Apps.** A native app links with a code from Settings → Devices → **Add app** (`POST /api/devices/link`, then
`POST /api/devices/redeem` from the app; see [Multi-user](#multi-user-sign-in-with-google)) and uses the device
token as a user actor, on console routes and `/api/agent` alike. Revoking the device ends it.

## Agent messaging

Sessions, scripts, apps and you can message each other through the hub. Everything goes through the
[`/api/agent` routes](#agent-identity-agent-api) above; the sender is always the credential that made the request
(a session token, an app token or your device), never a field of the request.

**Addresses.** `@name` (a session's name), `@@role` (the session holding a role: the idle holder, else the most
recently active one; `--all` sends to every holder), `@name.project` / `@@role.project`, `ses_…`, and `@me` for
you. Addresses resolve among your own sessions only; another user's sessions do not exist (`not_found`).

**Verbs.** The same verbs exist in the CLI (`hub …`), the OpenCode `hub` tool, `hub mcp` and the SDK:

| Verb | What it does |
|---|---|
| `msg <addr> "text"` | tells a session something (fire and forget) |
| `ask <addr> "question"` | an ask, open until answered, declined or expired (1 minute to 7 days, default 24 h); `--wait` blocks for the answer |
| `reply <msgID> "text"` · `decline <msgID> --why "…"` | answers a message you received; it goes to the message's real sender, never through the role |
| `inbox` | asks waiting for your answer, your own open asks, recent messages, mutes |
| `mute <addr>` · `unmute <addr>` | refuses (or accepts again) messages from a session (`forbidden`, exit 5) |
| `who` | named and role-holding sessions |

`--no-wake` admits a message without starting a turn and `--urgent` steers it into a running turn. Texts are at
most 10,000 characters (a decline's reason 1,000).

**Delivery.** A message reaches an OpenCode session as a hub message in its conversation (the spoke's `deliver`,
OpenCode's synthetic message; it shows in the console's conversation as a message row). An idle session gets a
turn; a busy one gets a plain `msg` after its running turn and an `ask` steered into it; subagent sessions and
`--no-wake` messages wait for the next turn. A session that is offline gets it when it comes back (pending, for 24
hours). A session on a spoke that cannot take messages (an older plugin, another harness without `deliver`) answers
`unsupported` (exit 7) and nothing is stored. An open ask to an idle session is re-woken with a short reminder
after waits of 5, 15 and 45 minutes in turn, then you are notified. Messages to you and to apps are stored in an inbox (`hub inbox`).

**Envelope.** The recipient sees the message framed so its body cannot pose as anything else:

```
[hub] ask from @api (laptop) to @@reviewer → you · 10-24 08:15Z · msg_7f3a…
----- msg_7f3a… -----
please review the login fix
----- msg_7f3a… -----
↩ hub reply msg_7f3a… "…" · hub decline msg_7f3a… --why "…" · expires 10-25 08:15Z
```

The boundary carries the message's own id; body lines that look like a header, a boundary or a reply hint are
escaped with a leading backslash; control characters, ANSI escapes, bidi overrides and zero-width characters are
removed from the text and from every interpolated name.

**Primer.** Once per session, the first time it is named explicitly or gets its first message, the hub adds a short
note without starting a turn: who the session is (`@name`, its roles), how to message others (`hub msg`, `hub who`),
and that messages headed `[hub]` come from other sessions or apps, not from the user. When that first message
wakes an idle session, the note and the message reach the model together, in one model call.

**Decisions.** `ask @me` from a session or app opens a Decision (question, options, a recommendation, urgency, a
deadline with an optional safe `onTimeout`). You answer it from the console (cards on Home and in the sessions it
concerns, a `decision` push); the answer goes back to the asker as your reply. Only users answer Decisions, never
sessions or apps; see [Decisions and `@me`](#agent-identity-agent-api) for the routes.

**Where agents send from.**
- In a shell of an OpenCode session: `hub msg @reviewer "…"` acts as that session ([hub CLI](#hub-cli)).
- The model itself: the plugin's `hub` tool (verbs `msg`, `ask`, `reply`, `decline`, `inbox`, `who`, `status`,
  `whoami`, and the [act verbs](#agent-actions-and-grants)), as the calling session ([Spoke](#spoke-opencode-plugin)).
- You, in the OpenCode TUI: `/msg @name text` (as the session on screen) and `/who`.
- Other agents and tools: [`hub mcp`](#hub-mcp-mcp-server), as the app token you logged in with, or the hub's
  [`POST /mcp`](#over-http-mcp) as the bearer token sent.
- Scripts: `hub login` with an app token that has the `messages:send` (and `messages:read`) scopes.

**Limits.** Per 10 minutes: 20 messages per sender→recipient pair and 300 per user (`rate_limited`, exit 6, with
`retryAfter`), and 30 turns started per recipient (more messages are still delivered, without waking it). A chain of
replies between agents may run 8 hops without a human turn; past that, messages are delivered without waking and
you are notified once. Typing into a session (console, Voice, the harness) starts its chain over. You can switch
messaging off for your account (`PUT /api/agent/messaging {enabled: false}`): sends then answer `paused` (exit 5),
reading still works.

## Agent actions and grants

Agents can do more than message: a session or a script may **approve** or **deny** a permission request, **answer**
a form, **prompt** a session or **stop** it, in your sessions and only as far as you allow. You always may (your
own sessions, any of your credentials); an agent acts only under a **grant** you created, and anything outside it
comes back to you as a Decision.

**Who can act.**

| Credential | Acts? |
|---|---|
| you (device cookie, device token) | always, on your own sessions; no grant, no kill switch |
| a session's **act token** (held by the OpenCode `hub` tool) | under a grant held by that session (by its ID, its `@name`, or a reserved `@@orchestrator…` role it holds) |
| an app token with scope `sessions:act` | under a grant held by `app:<token id>` |
| a session's **shell token** (`HUB_SESSION_TOKEN`) | never: `403 forbidden` |

**Act tokens vs shell tokens.** Every session has two hub tokens. The shell token goes into the shells the session
starts, so `hub msg` and the other read and message verbs work from any script it runs. The act token (`typ act`)
is pushed only to spokes that announce `actTokens`, kept apart from the shell tokens, never put in any
environment and never shown in tool output; only the plugin's `hub` tool uses it, for the act verbs. A command an
agent runs in a shell therefore cannot act, even with the session's own credential; the model has to call the tool,
where the call is visible and audited.

**Grants.** A grant says who may do what, where, until when:

```json
{
  "holder": "@@orchestrator",
  "scope": { "projects": ["/home/you/projects/api"] },
  "allow": ["approve", "deny", "prompt", "stop"],
  "permissions": { "allow": ["shell:bun test*", "edit:src/*"], "never": ["shell:git push*"] },
  "expires": "8h",
  "maxActionsPerHour": 60,
  "allowAlways": false
}
```

- **holder**: `ses_…` or `@name` (pinned to that session when the grant is created; the grant never follows the name
  to another session), a reserved `@@orchestrator…` role (follows whoever holds it when it is used; only you assign
  reserved roles), or `app:<token id>` (one of your app tokens).
- **scope.projects**: 1–20 absolute project directories; a session is in scope when its directory is one of them or
  inside one (on a path boundary, after resolving `.`/`..`; worktrees inside the project count).
- **allow**: the verbs (`approve`, `deny`, `answer`, `prompt`, `stop`; `roles` lets an app token with `sessions:manage` claim and release roles of sessions in scope).
  `deny`, `answer`, `prompt` and `stop` need only the verb; `approve` also needs the request to pass the patterns.
- **permissions**: patterns `action[:glob]` in OpenCode's wildcard syntax (`*` any run, `?` one character, a trailing
  ` *` optional; `bash` is OpenCode's `shell`; the action alone means every resource). A request is allowed only
  when **every** resource it names matches an allow pattern; any never pattern wins over every allow. In shell allow
  patterns, `$(`, backticks and `<`/`>` must be written literally (a wildcard never matches them), so
  `shell:bun test*` does not allow `bun test $(rm -rf ~)`. Never patterns also see the command without leading
  `VAR=…` assignments and wrappers (`sudo`, `env`, `command`, `exec`, `nohup`, `time`), so `sudo git push` is still
  a `git push`.
- **expires**: 1 minute to 30 days (seconds, or `30m`, `8h`, `2d`; default 8 h). **maxActionsPerHour**: 1–1000
  (default 60), per clock hour; past it `429 rate_limited`. **allowAlways**: lets the holder reply `always` (OpenCode
  then saves the request's rules), and only when every rule it would save lies inside the allow patterns.
- At most 50 active grants per user. Editing replaces a grant (its holder stays, its expiry restarts); revoking ends
  it at once and keeps it listed for the audit.

**hub never rules.** `agents.never` in [hub.json](#hubjson) lists patterns no agent may approve for any user,
checked before every grant (`{"agents": {"never": ["shell:git push*", "shell:rm -rf*", "external_directory"]}}`).
The user can still approve such a request themselves.

**The check order** for an agent: the session belongs to you (else `not_found`, like a session that does not
exist) → kill switches → a usable grant for the verb and the session's project → not its own session tree (a
session never answers a request or form in its own tree) → the hub's never rules → the grant's never rules → the
allow patterns (else `needs_user`) → the hourly cap → the kill switches again → the spoke.

| Answer | HTTP | CLI exit | Means |
|---|---|---|---|
| ok | 200 | 0 | done (the result names the grant used) |
| `needs_user` | 403 | 4 | outside the grant: the user decides (a Decision is open) |
| `forbidden` | 403 | 5 | no grant, a never rule, its own tree, or a shell token |
| `paused` | 423 | 5 | a kill switch is on |
| `rate_limited` | 429 | 6 | the grant's hourly cap |
| `not_found` | 404 | 3 | not your session, or no such pending request or form |
| `gone` | 410 | 8 | answered elsewhere first, expired or ended |
| `unsupported` | 422 | 7 | the session's spoke cannot do it (e.g. an agent's prompt without `hubPrompt`) |
| `offline` | 503 | 7 | no spoke reports the session now |

**Escalation.** An approval outside the grant answers `needs_user` with the evaluation (`verdict`, `reason`, the
grants checked, and a `tier`) and opens a Decision for you: one per agent and request (asking again updates its
reason), with Approve once (or Approve always, when asked), Deny (safe), and the agent's `--why` as its
recommendation. The hub sets the tier, never the agent: `tap` (answered by a tap in the console, not from a
notification) for shell, `external_directory`, MCP and unknown tools and for anything near a never rule; `confirm`
otherwise. Your answer replies to the permission **as you** (no grant or kill switch applies to you); if the request
was answered elsewhere or ended first, the Decision closes and the agent's next try is `not_found`. A request's
blocker in the console shows the recommendation ("@orchestrator recommends Approve once: …"). Limits: 20 new
escalations per agent an hour and 20 open at once per user; escalations within a minute of the last push open
quietly.

**Grant requests.** Agents never create grants. A session (any of its tokens) or an app token with `messages:send`
may **request** one: `POST /api/agent/grants/requests {grant, why}` (`hub grant request …`). The holder defaults to
the requester and may only be the requester itself or a reserved role it holds. It opens a tap Decision summarising
the grant; approving creates it as yours, and the requester is told the grant id in a reply. One open request per
requester, 5 an hour.

**Prompts.** An agent's prompt reaches the session as the hub's, never as yours: the spoke wraps it in a provenance
envelope (`[hub] prompt from @lead · grant g_… · msg_…`, the body between boundary lines) and admits it as a hub
message, so it never resets the loop protection's hop chain the way your own typing does. Agents may prompt root
sessions only, never themselves, text only, always waking the session (`--delivery queue|steer` picks how it enters
a busy one).

**Deny reasons.** `deny --why "…"` passes the reason to the harness as the rejection's feedback (prefixed with who
denied it and under which grant), on spokes that announce `permissionMessage`; an older spoke takes the reject
without it, and the answer says so (`reasonSent: false`).

**Kill switches.** Settings → Agents (or `PUT /api/agent/acting {enabled: false}`) turns agent actions off for you;
an admin's `PUT /api/admin/agents/acting {enabled: false}` turns them off for the whole hub. Either one answers
every act verb `423 paused`; reading and messaging keep working (messaging has its own switch), and your own
actions and Decision answers still go through.

**Verbs.** The same act verbs are in the [CLI](#hub-cli) (`hub approve | deny | answer | prompt | stop`, `hub grant
list | show | create | revoke | request`), the OpenCode `hub` tool (verbs `approve`, `deny`, `answer`, `prompt`,
`stop`, with the session's act token), [`hub mcp`](#hub-mcp-mcp-server) (tools of the same names, as the app token)
and the SDK. Only you manage grants: the console (Settings → Agents) or the CLI with your device token
(`hub login --token <device token>`).

| Route | User | Session (act token) | App (`sessions:act`) |
|---|---|---|---|
| `POST /api/agent/sessions/:addr/approve {requestID, always?, why?}` | ✓ | under a grant | under a grant |
| `POST /api/agent/sessions/:addr/deny {requestID, why?}` | ✓ | under a grant | under a grant |
| `POST /api/agent/sessions/:addr/answer {formID, answer \| cancel: true, why?}` | ✓ | under a grant | under a grant |
| `POST /api/agent/sessions/:addr/prompt {text, delivery?, why?}` (users: `images?`) | ✓ | under a grant | under a grant |
| `POST /api/agent/sessions/:addr/stop {why?}` | ✓ | under a grant | under a grant |
| `POST /api/agent/grants` · `GET` · `GET`/`PUT`/`DELETE …/grants/:id` | ✓ | – | – |
| `POST /api/agent/grants/requests {grant, why}` | – | ✓ (any token) | `messages:send` |
| `GET` · `PUT /api/agent/acting {enabled}` | ✓ | – | – |
| `GET` · `PUT /api/admin/agents/acting {enabled}` | admins | – | – |
| `GET /api/agent/audit?limit=&before=` | ✓ | – | – |

**Audit.** Every agent action and every attempt (allowed, `needs_user`, `forbidden`, `paused`, `rate_limited`) is in
your agent audit with who acted, the verb, the session and request, the grant, the reason and the outcome (`ok`,
`gone`, `offline`, `unsupported`, `escalated`, `refused`, `failed`); so are your answers to escalations, grant
requests and switch changes. Read it in Settings → Agents → Activity or with `GET /api/agent/audit` (newest first,
pages of up to 500; the last 2000 entries are kept); new entries stream to your console as SSE `{type: "agent",
entry}`. Admins see only a summary in the hub audit (the user, `agent.<verb>` and the actor kind; grant changes as
`grant.create`, `grant.update`, `grant.revoke` with the grant id), never sessions, requests, reasons, holders or
patterns.

## Launches

A **launch** starts a session for you on one of your machines and ends it when it is done. On each machine that
should take launches, enrol it (the OpenCode plugin's `/hub` dialog), list where its repositories live in
`~/.config/hub/node.json` and run the node daemon:

```sh
echo '{"workspaceRoots": ["/Users/you/projects"]}' > ~/.config/hub/node.json
hub node install        # writes the launchd agent / systemd user unit and prints how to load it
```

Then, from anywhere:

```sh
hub launch --repo ~/projects/app --branch feat/search --name search --prompt "Add full-text search" --cleanup remove
hub launches list       # queued → placing → provisioning → running → ended (idle, stopped, …)
```

The node makes the git worktree `~/projects/app/.worktrees/feat/search`, the machine's OpenCode service starts the
session there as `@search`, the hub primes and prompts it, and once the session has worked and stays idle the
launch ends `idle` and the worktree is removed (the branch stays; nothing uncommitted is ever removed). Apps launch
with an app token (scope `sessions:launch`) under a grant with verb `launch`, retry safely with a `key`, tag
launches with labels and follow them with signed webhooks. `--harness claude-code` or `--harness codex` launches
those harnesses through their service spokes ([docs/launches.md](docs/launches.md#harnesses)). Everything, from the
spec's fields and limits to placement, caps, the node's git rules, webhook signatures and sandboxed launches in
OpenShell (`hub node openshell check`): [docs/launches.md](docs/launches.md).

## hub CLI

`hub` (also installed as `hubctl`) reads, names, messages and acts on your sessions through the hub's [`/api/agent` API](#agent-identity-agent-api),
for agents and scripts. The OpenCode plugin writes both launchers into the hub bin dir (`$HUB_STATE_DIR/bin`, default
`~/.local/state/hub/bin`) at start and puts that dir first on PATH in every shell it prepares, so inside a
session `hub` just works. A launcher runs the CLI bundle shipped in this package (`packages/cli/dist/hub-cli.js`)
with the OpenCode binary itself (`BUN_BE_BUN=1 exec <opencode> hub-cli.js "$@"`), so neither bun nor node has to
be installed; without Bun it falls back to `node`. The launchers are rewritten only when their content changes.

**Name clash:** GitHub's old `hub` CLI (github/hub) uses the same name. In hub sessions ours comes first on PATH;
elsewhere use `hubctl`, or call the bundle directly (`bun …/packages/cli/dist/hub-cli.js`).

```
hub status [--json]                       machines → projects → sessions, and what needs attention
hub sessions [--project P] [--state S[,S]] [--machine M] [--label k=v]
hub show <addr>                           state, blockers, activity, summary
hub log <addr> [-n 20]                    newest timeline rows (1–200), printed oldest first
hub watch [--blocked] [--session <addr>]  events as JSON lines until Ctrl-C (pings skipped)
hub whoami                                who this credential is
hub who [--project P] [--role R | @@role] named and role-holding sessions
hub name <@name> [--session <addr>]
hub role claim <role[.project]> [--exclusive] [--session <addr>]
hub role release <role[.project]> [--session <addr>]
hub msg <addr> "text" [--all] [--no-wake] [--urgent]     tell: fire and forget
hub ask <addr> "text" [--wait [secs]] [--expires 2h] [--all] [--no-wake] [--urgent]
hub reply <msgID> "text" [--no-wake]      to the message's real sender, never via the role
hub decline <msgID> --why "reason"
hub ask @me "question" [--option id=label[:safe]]... [--recommend id [--why "…"]] [--urgency low|normal|high]
        [--deadline 2h [--on-timeout <safe id>]] [--tier confirm|tap] [--about <addr>]...   a Decision for the user
hub decisions list [--state open|answered|expired|closed]   the Decisions you asked
hub inbox                                 asks to answer, your open asks, recent messages, mutes
hub mute <addr> · hub unmute <addr>       refuse (or accept again) messages from a session
hub approve <addr> <requestID> [--always] [--why "…"]   answer a permission request (once, or always)
hub deny <addr> <requestID> [--why "…"]   reject it; the reason reaches the harness
hub answer <addr> <formID> key=value… | --json '{…}' | --json - | --cancel [--why "…"]
hub prompt <addr> "text" [--delivery queue|steer] [--why "…"]
hub stop <addr> [--why "…"]               stop its running turn
hub grant list · hub grant show <id> · hub grant revoke <id>
hub grant create --holder <h> --project <path>... --allow approve,deny,… [--permit <pattern>]... [--never <pattern>]...
         [--expires 8h] [--max-per-hour N] [--allow-always] | --json '{…}'
hub grant request --project <path>... --allow approve,deny,… [--permission-allow <pattern>]... [--never <pattern>]...
         [--holder <@@role you hold>] --why "…"     (agents) ask the user for a grant
hub launch [--repo <path>] [--mode worktree|checkout|clone] [--branch B] [--base B] [--remote URL]
         [--name <@name>] [--role R]... [--harness H] [--agent A] [--model provider/model]
         [--runtime host|openshell [--profile P]] [--machine M] [--node-label k=v]... [--prefer]
         [--label k=v]... [--prompt "text" | --prompt -] [--end idle|asked|never] [--timeout 4h]
         [--cleanup keep|remove] [--key K]          start a session on a hub node
hub launches list [--state S[,S]] [--label k=v]... · hub launches show <id> · hub launches stop <id>
hub node run                              the node daemon on this machine, until Ctrl-C or SIGTERM
hub node install [--dry-run] · hub node uninstall [--dry-run] · hub node status
hub claude [claude args…]                 Claude Code with the hub plugin (--plugin-dir; ~/.claude untouched)
hub claude-code install|uninstall [--dry-run] · hub claude-code status   the Claude Code daemon as a service
hub codex [codex args…]                   Codex with its shared app-server daemon on (~/.codex untouched)
hub codex-spoke install|uninstall [--dry-run] · hub codex-spoke status   the Codex spoke as a service
hub preset list · hub preset check <name|file>
hub preset run <name|file> [--socket <name> | --current] [--cwd <dir>] [--resume <id>] [--no-hub] [-- args…]
hub mcp                                   an MCP server on stdio (see below)
hub login [--url URL] [--token APP_TOKEN] · hub logout
hub help · hub --version
```

Addresses are `ses_…` (or an unambiguous prefix), `@name`, `@@role`, `@name.project` and `@me` (the user). Output is short text
(one session per line: name and ID, state, harness, current activity, blockers); `--json` prints the hub's answer
unchanged (for errors, the `{error: {code, message, hint?, …}}` envelope on stdout as well). Errors print the
message, any candidates or retry time, a missing feature, and the hint on stderr.

**Messaging.** `msg` and `ask` print what was stored and how it reached the recipient (`delivered` into a new or
the running turn, `queued` for its next turn, `retained` while it has a question open, `pending` while offline, or
`stored` in a user's or app's inbox); `--all` sends to every session the address names (each holder of a role),
`--no-wake` admits without starting a turn, `--urgent` steers into a running turn. A text (or `--why`) of `-` is
read from stdin, so long or quoted bodies need no escaping: `git diff | hub msg @reviewer -`. `--expires` and
`--wait` take seconds or `30s`, `5m`, `2h`, `1d` (asks expire after 1 minute to 7 days, default 24 h). `ask --wait N`
waits up to N seconds for the answer (the CLI loops on the hub's 60 s long poll); a bare `--wait` waits until the
ask expires. A waiting `ask` exits 0 with the answer, 1 when declined (with the reason) or still open when the
wait is spent, and 8 when it expired; `--wait` cannot be combined with `--all`. `hub inbox` shows each open ask
with its `hub reply` / `hub decline` line. A recipient whose spoke cannot receive messages exits 7 (`unsupported`,
feature `deliver`: update the plugin there), messaging switched off by the user exits 5 (`paused`), sending too
much exits 6 (`rate_limited`), and answering an ask that is already answered or expired exits 8 (`gone`). Sessions
message with their session token; an app token needs the `messages:send` (and `messages:read` for `inbox`) scopes.

**Acting.** `approve`, `deny`, `answer`, `prompt` and `stop` act on another session: the user's credential always
may (its own sessions); an app token needs scope `sessions:act` **and** a grant; a session's shell token
(`HUB_SESSION_TOKEN`) never acts — agents act through the OpenCode `hub` tool, which holds the session's separate
act token. Outside the grant the hub answers `needs_user`: the CLI exits 4 and prints the evaluation (verdict,
tier, reason, the grants checked) and the Decision opened for the user, if any. `answer` takes `key=value` pairs (a
repeated key becomes a list), or the whole answer as JSON (`--json '{…}'`, or `--json -` from stdin; a bare
`--json` still means raw output), or `--cancel`. `--why` is recorded in the agent audit; for `deny` it is passed to
the harness. An already-answered request is `gone` (8), an offline machine `offline` (7).

**Grants.** `hub grant list | show | create | revoke` manage what a holder (`ses_…`, `@name` — pinned to that
session at creation —, a reserved `@@orchestrator…` role, or `app:<token id>`) may do: which verbs,
in which projects, which permission patterns (`--permit`, `--never`; never wins), for how long and how often. Only
the user manages grants (the console, or `hub login` with a device token): from a session's shell `create` and
`revoke` exit 5 without asking the hub, and any credential the hub refuses exits 5. Agents `hub grant request` one
instead (a session, or an app token with `messages:send`): the same flags, the holder defaulting to the requester,
and a `--why` the user reads; it prints the Decision it opened, and the user's answer comes back as a reply. See
[Agent actions and grants](#agent-actions-and-grants).

**Launching.** `hub launch` starts a session on a machine running `hub node` ([docs/launches.md](docs/launches.md)): the flags become the
body of `POST /api/agent/launches`, with only the given fields (the hub fills in its defaults: harness `opencode`,
mode `worktree` — which needs `--branch` and uses `<repo>/.worktrees/<branch>` —, runtime `host`, end `idle`,
cleanup `keep`). `--repo` defaults to the working directory and relative paths resolve against it; the path is the
repository on the node and must be under that node's workspace roots. `--label k=v` tags the launch for apps
(`hub launches list --label brain.task=abc` finds it again); `--node-label k=v` and `--machine` pick nodes, required
unless `--prefer`. `--prompt -` reads the first prompt from stdin. `--key` makes retries safe: the same key and
flags answer the existing launch (`… was already launched with key …`), the same key with other flags is invalid
(exit 2). It prints the launch and its state (`queued`, `placing`, `provisioning`, `running` with the session,
`ended` with an outcome: `idle`, `needs_user`, `failed`, `timeout`, `stopped`, `lost`); `hub launches show` adds the
workspace, steps and artifacts (branch, head, commits). `hub launches stop` ends a launch (`stopped`); one that
already ended exits 8 (`gone`). The user may always launch; an app token needs scope `sessions:launch` **and** a
grant with verb `launch` covering the repo (exit 5 otherwise; the kill switch pauses it); sessions launch only
through the OpenCode `hub` tool's act token. Apps and sessions see and stop only the launches they started.
Too many launches exit 6 with the retry time. Apps that register a webhook verify its `Hub-Signature` with the
SDK's `verifyWebhook({body, headers, secret})` (HMAC-SHA256 of `<t>.<raw body>`, compared in constant time,
timestamps older than 5 minutes refused). The spec's fields and limits, states, placement, caps and webhooks are in
[docs/launches.md](docs/launches.md).

**hub node.** `hub node run` is the per-machine daemon that prepares launch workspaces: it needs an enrolled
machine (it only reads the machine token in `~/.config/hub/config.json`) and `~/.config/hub/node.json` with at
least `{"workspaceRoots": ["/Users/you/projects"]}` (optional `labels`, `slots`, `memoryMB`); it exits 1 when the
machine is not enrolled, 78 when there are no workspace roots, and 0 on SIGINT/SIGTERM. `hub node install` writes a
launchd agent (macOS, `~/Library/LaunchAgents/io.github.huynle.hub-node.plist`) or a systemd user unit (Linux,
`~/.config/systemd/user/hub-node.service`) from the templates in `scripts/`, with the runtime and CLI entry running
the command (so `hubctl node install` from a hub session runs the bundle with the OpenCode binary) and
`HUB_SPOKE_CONFIG` / `XDG_CONFIG_HOME` when set, and **prints** the `launchctl` / `systemctl` commands that load it;
hub never runs them. `--dry-run` prints the file without writing it; a second install says it is up to date (or
updates it), and warns when the node would not run yet. `hub node uninstall` removes the file and prints the
commands that stop the service; `hub node status` shows the file (up to date or not), the enrolment (never the
token), node.json and the commands to inspect the service. What the node does to your repositories (worktrees under
`<repo>/.worktrees/<branch>`, cleanup that never forces) is in [docs/launches.md](docs/launches.md#hub-node).

**Other harnesses.** `hub claude` runs Claude Code with the hub's plugin loaded through `--plugin-dir` and starts the
per-user Claude Code daemon (`hub claude-code daemon`) when none runs; `hub codex` runs Codex with its shared
app-server daemon turned on for that run and starts the per-user Codex spoke (`hub codex-spoke serve`). Both pass
every other argument and the exit code through, never write `~/.claude` or `~/.codex`, and run the harness without
the hub (saying why) when the machine is not enrolled. `hub claude-code install` and `hub codex-spoke install` write
a launchd agent or systemd user unit for those processes, like `hub node install` (printed, never loaded), so
`claude-code` and `codex` launches can be placed without a wrapper run. `hub preset list | check | run` drives a
harness without a spoke through a pane on a private tmux server. Settings, the op matrix and the limits:
[docs/harnesses.md](docs/harnesses.md).

**Credentials.** `HUB_URL` + `HUB_SESSION_TOKEN` (the spoke sets them in each session's shells; the CLI then
acts as that session) win over the login file. Outside a session, `hub login --url https://hub.example` stores
an app token in `~/.config/hub/cli.json` (`$XDG_CONFIG_HOME` respected; mode 0600) after checking it with
`whoami`; the token is read from stdin (or prompted) unless `--token` is given — prefer stdin, since arguments are
visible to other local users in `ps`. App tokens are created by a signed-in user with
`POST /api/agent/app-tokens {label?, scopes?}` (scopes `sessions:read`, `messages:send`, `messages:read`; shown once) and revoked with
`DELETE /api/agent/app-tokens/:id`; `hub logout` only deletes the file. App tokens can read but not name or
claim roles (writes are for sessions and users). `whoami` and `status` warn on stderr when `OPENCODE_SESSION_ID`
is set and the credential is not that session. The CLI removes `BUN_BE_BUN` from its own environment.

| Exit | When |
|---|---|
| 0 | ok |
| 1 | other errors, network failures, a watch stream the hub closed, an `ask --wait` declined or not yet answered |
| 2 | usage (unknown command or option, missing argument; also the hub's `invalid`) |
| 3 | `not_found`, `ambiguous` (candidates listed), `name_taken` |
| 4 | `needs_user` |
| 5 | `forbidden`, `paused` |
| 6 | `rate_limited` (with `retryAfter`) |
| 7 | `unsupported`, `offline` |
| 8 | `gone`; an `ask --wait` that expired |
| 9 | `unauthorized`, `token_expired` (a session token: start a new shell), or not logged in |

### hub mcp (MCP server)

`hub mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server on stdio for MCP clients outside
OpenCode (Claude Desktop, Cursor, other agents). It speaks JSON-RPC 2.0, one message per line (MCP's stdio
transport; protocol revisions `2025-06-18`, `2025-03-26` and `2024-11-05`), and answers `initialize`, `ping`,
`tools/list` and `tools/call`; notifications (`notifications/initialized`, `notifications/cancelled`, which aborts
the call) get no answer, other methods answer `-32601`. Its tools are the CLI's verbs: `whoami`, `status`,
`sessions`, `show`, `log`, `who`, `msg`, `ask`, `reply`, `decline`, `inbox`, `message_show` (`id`, `wait`),
`mute` and `unmute` (`addr`; agent-message mutes, not console notifications), `decisions` (`state`) and
`decision_show` (`id`) (reading the Decisions you asked; no tool answers one, only the user does), and
`webhook_create` (`url`, `events`, `label`), `webhooks`, `webhook_show` (`id`) and `webhook_delete` (`id`). Webhooks
carry the same canonical compact events as `events`; their signing secret appears only in `webhook_create`. The act verbs are `approve`, `deny`,
`answer` (`answer` object or `cancel`), `prompt` (`delivery`) and `stop`, and the launch tools `launch` (`repo`
required and absolute; `mode`, `branch`, `base`, `remote`, `key`, `name`, `roles`, `harness`, `agent`, `model`,
`runtime`, `profile`, `machine`, `nodeLabels` and `labels` objects, `prefer`, `prompt`, `end`, `timeout`,
`cleanup`), `launches` (`state`, `label`), `launch_show` and `launch_stop` (`id`), with the same arguments
(`to`, `text`, `addr`, `id`, `requestID`, `formID`, `why`, `n`, `wake`, `urgent`, `all`, `project`, `role`, …). The act
tools need an app token with scope `sessions:act` and a grant, the launch tools scope `sessions:launch` and a
launch grant; `needs_user` results include the evaluation. `ask` takes `wait` of at
most 60 s (one long poll; a longer wait is cut to 60) and `expires` in seconds or as `2h`; `ask @me` reports the
Decision it opened. Answers are the CLI's
short text; messages and answers from other sessions come in the hub's envelope and are marked as not from the
user. Hub errors are tool results with `isError: true` and the hub's `code: message` (plus candidates and hint),
never protocol errors. Only protocol frames go to stdout; the server ends when stdin closes (after answering the
calls in flight) or on SIGINT/SIGTERM.

```json
{ "mcpServers": { "hub": { "command": "/home/you/.local/state/hub/bin/hubctl", "args": ["mcp"] } } }
```

(the launcher in the hub bin dir, `$HUB_STATE_DIR/bin`; just `hubctl` when that dir is on the client's PATH).

**Identity.** The server acts as the CLI's credential, read for each call: `HUB_URL` + `HUB_SESSION_TOKEN` when
set, else the `hub login` file. MCP clients start servers without a hub session's shell environment, so in practice
it acts as the **app token** you logged in with (needs `sessions:read`, `messages:send` and `messages:read`), not
as an OpenCode session: messages are sent from the app, and replies to them land in its inbox (the `inbox` tool),
not in a session. App tokens can archive, unarchive and name sessions with `sessions:manage`, and claim or release roles with it plus a `roles` grant. Inside OpenCode, agents use the plugin's
`hub` tool instead, which acts as the calling session.

#### Over HTTP (/mcp)

The hub serves the same tools at **`POST /mcp`** ([Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http)),
for MCP clients and gateways that take a remote server URL. It is stateless: one JSON-RPC message per POST, answered
as `application/json` (no SSE stream, no `Mcp-Session-Id`); notifications and responses get `202` with no body;
batches answer `-32600`; `GET`/`DELETE` answer `405` (`Allow: POST`). `initialize` also returns short
`instructions`. Requests need `Content-Type: application/json`, an `Accept` that allows `application/json` (or
none), a body of at most 1 MiB (else `413`) and, when sent, a supported `MCP-Protocol-Version` (else `400`). A
browser `Origin` other than the hub's own is refused (`403`); requests without one (servers, gateways) are fine.

**Auth.** `Authorization: Bearer <token>`: any credential the agent API takes, in practice an **app token**
(Settings → Agents, or `POST /api/agent/app-tokens`) with the scopes the tools need: `sessions:read` (reading), `sessions:manage` (archive/unarchive, name; roles also need a `roles` grant), `events:subscribe` (events),
`messages:send` and `messages:read` (messaging), `sessions:act` plus a grant (act tools), `sessions:launch` plus a
launch grant (launch tools). Device, session and act tokens work too. No or a bad token answers `401` with
`WWW-Authenticate: Bearer realm="hub"` (no OAuth discovery). The tools call `/api/agent` as that token, inside the
hub process: scopes, grants, tenancy, kill switches and the agent audit apply as on the HTTP API, and a scope the
token lacks is an `isError` tool result. Cookies never authenticate `/mcp`.

Add it to an MCP client or gateway as a remote (HTTP) server with bearer auth, one token per user:

```json
{ "mcpServers": { "hub": { "type": "http", "url": "https://hub.example.com/mcp", "headers": { "Authorization": "Bearer hat_…" } } } }
```

(an MCP gateway: URL `https://<hub>/mcp`, auth kind bearer, per-user credential: each user pastes their own app token).

## Spoke (OpenCode plugin)

The plugin is a thin client ("spoke") of the hub. Every OpenCode process that loads
it opens **one** outbound WebSocket (`/spoke/ws`, protocol in `src/protocol.ts`), lists the sessions it
knows, forwards their events, and runs turns, stops and permission replies on the hub's request.
The web app, speech and phones live on the hub.

Besides the session, tool and permission events, a spoke forwards `session.status` (busy/retry/idle) and the
shells and terminals sessions start (`session.shell.started/ended`, `shell.created/exited/deleted`,
`pty.created/updated/exited/deleted`) in compact form: id, session, command (≤ 200 characters), status and exit
code; never output, files or environment. When it connects (and again after its hub connection or OpenCode
event stream comes back) it asks its own server what runs now (`session.active` and `shell.list`) and sends a
`session.seed` event per running session, so a session that was already running shows as working at once.

| Entry | File | Role |
|---|---|---|
| server | `server.ts` → `src/index.ts` | Starts the process-wide spoke (`src/spoke/`), `hub.*` RPC (also under the legacy id `voice.*`), the `voice` agent, short-reply and orchestrator `context` hook |
| tui | `tui.ts` → `src/tui.ts` | `/hub` dialog and the feature commands (`/voice`), registered through `src/tui-commands.ts` (ids `hub.<id>`, palette group "Hub"); reports the sessions it shows (`hub.presence`) |
| rpc | `rpc.ts` → `src/rpc.ts` | `HubRpc` (id `hub`; `VoiceRpc` is the deprecated id `voice`): `status / setServer / checkServer / enroll / startLocalHub / setMode / setSession / pairCode / handoff / openLink / conversation / presence` |

The plugin ids are `hub` (server) and `hub.tui`. OpenCode resolves a local plugin directory as `<dir>/server`, `<dir>/tui` and `<dir>/rpc` (`package.json`
`main` is ignored), and an installed package through its `exports` (`./server`, `./tui`, `./rpc`).

- **Config**: `~/.config/hub/config.json` (or `$HUB_SPOKE_CONFIG`), shared by all
  processes on the machine, mode 0600, watched live. Holds the server URL, mode, machine token,
  `subagent` (the agent conversation mode delegates to; default `general`, `[A-Za-z0-9_.-]+`),
  `autoStartLocalHub` (default `true`; see [Local only](#local-only)), `herdr` (default `true`; read open
  sessions and workspaces from [Herdr](#open-sessions-herdr-and-tuis)), and `list` (the history window,
  default `{"days": 30, "max": 100}`; days 1–365, max 1–500; out-of-range values fall back per field).
- **Modes**: `off` (no connection), `always` (every session this process knows, Voice on for all),
  `session` (Voice only for sessions switched on in `/hub` or from the phone, plus their subagent
  sessions). Every reported session can be inspected and controlled in both modes; in `session` mode the
  others are listed with `exposed: false` so the phone can offer "Enable voice", and only Voice
  (conversation mode, utterances) is refused for them.
- **/hub** configures the hub connection. Before this machine is enrolled (or after the hub revoked it),
  **Set up Hub**: On this computer (local hub, every session or only chosen ones), Connect to a
  hub… (URL checked with `hub.checkServer`, i.e. `GET <url>/healthz`, then device-code approval in the
  browser), or Not now; a configured remote server comes first as "Connect to <host>". The decisions are
  pure functions in `src/setup.ts`. Once set up, the title shows the server and connection state, and the
  menu has: **Server** (keep it, Change server URL… with the same reachability check, Use a hub on this
  computer, Set up again…), **Start local hub** (a local server that is not answering), **This machine:
  approved / waiting for approval / revoked**, **Mode**, **This session on/off** (mode "This session
  only"), **Pair a phone**, **Open hub in browser** (home page via a one-time sign-in link; starts a local
  hub first when it is down, `hub.startLocalHub`), and for a shared session **Send to phone** and
  **Conversation mode on/off**.
- **/voice** (no menu; `src/voice-command.ts`): with a session on screen, it (1) runs the /hub setup when
  the machine is not set up (then continues once connected; a hub that still waits for approval says to run
  /voice again), asks for a mode when sharing is off, and connects (starting a local hub when needed); (2)
  shares the session for Voice (`hub.setSession` in "This session only" mode); (3) opens
  `<hub>/s/<session>?voice=1` through a one-time sign-in link (`hub.openLink {sessionID, voice: true}`).
  The page turns Voice mode on for that session (turning it off in any other session first) and removes
  `?voice=1` from the address. When the browser will not start audio without a tap (a link opened from the
  terminal), the page shows **Tap to start Voice mode** instead of an error. The `voice` agent keeps its
  name.
- **One-time links** (`hub.openLink`, `sessionID` and `voice` optional): `<hub>/login?code=…&next=/s/<id>`
  (with `voice`: `next=/s/<id>?voice=1`) or `next=/`; `/login` accepts no other `next`. While speech is not
  usable (see `ready` below) the hub redirects to `<next>#speech`, and the page opens Settings → Speech.
- One active spoke per process (`globalThis` singleton); the shared background service
  (`opencode serve --service`) also lists its root sessions from the last `list.days` days, at most
  `list.max`, newest first (no subagent children, nothing archived; `src/spoke/listing.ts`), plus sessions
  that are always listed whatever their age: open in a terminal, running or blocked, in conversation mode,
  and voice-enabled sessions in `session` mode (fetched one by one when the window misses them). Each comes
  with its workspace: `project` = the OpenCode project root
  (worktrees map to their repository), else the directory minus its `subpath`; `projectName` = the
  project name or the root's basename. It re-lists every 60 s and 2 s after `session.created/renamed/deleted`.
  Snapshots are capped at 500 sessions / 900 kB (exposed, then most recent, are kept).
- **Session browser ops**: `expose {sessionID, on}` (any process, only sessions it reported; in `session`
  mode it edits the config's session list, which every process watches; `always` answers `exposed: true`)
  and `create {directory, title?, herdrWorkspace?}` (service process only; `directory` must be a reported
  workspace root or session directory, or a folder of a Herdr pane, else `unknown workspace`; in `session`
  mode the new session is exposed). Both send a fresh snapshot before answering. With `herdrWorkspace` the
  service then opens the session in Herdr (below) and answers `{sessionID, openedIn: "herdr"}`, or
  `{sessionID, warning}` when Herdr failed (the session exists either way).

### Open sessions (Herdr and TUIs)

Sessions open in a terminal are reported with `open: true` and `terminal` (`src/spoke/herdr.ts`,
`src/spoke/presence.ts`, `src/tui-presence.ts`):

- **Herdr**: the background service's spoke runs `herdr agent list` every 5 s and `herdr workspace list` +
  `herdr pane list` every 30 s (3 s timeout each). Every `opencode` pane with a session ID is open with
  `terminal: {source: "herdr", workspaceID, workspace (label), title (pane title without "OC | "),
  status}`. It sends a `terminals` frame with the Herdr workspaces in Herdr's order, each with its pane
  folders, most used first. No `herdr`, its server down, or `"herdr": false`: no Herdr data, silently.
  Standalone processes never read Herdr (one reader per machine); a machine without a background service
  only gets TUI presence.
- **TUIs**: the TUI plugin reports the root of the session it shows and its open tabs (when session tabs
  are on) to its server's spoke with `hub.presence({sessionIDs, reporter})` on change (polled every 2 s)
  and every 15 s. A session is open while some TUI reported it within 45 s (`terminal: {source: "tui"}`);
  a TUI's report replaces its previous one, so a closed tab stops counting at once. Herdr wins when both
  apply.
- **Opening in Herdr** (`create` with `herdrWorkspace`): `herdr tab create --workspace <id> --cwd <dir>
  [--label <title>] --no-focus`, then in its root pane `herdr agent start <title-slug>-<id-tail> --kind
  opencode --pane <pane> --timeout 20000 -- --session <sessionID>`. The hub waits up to 45 s for this op.

## Conversation mode (OpenCode side)

In conversation mode the session's main agent becomes a voice orchestrator: it answers in one or two
spoken sentences, handles quick answers and up to two low-risk tool calls directly, and hands multi-step
work to a background subagent. Routine workers inherit the fast voice model; coding, debugging,
architecture and risky work use the configured full work model. Successful workers finish with a short
speech-ready result that the hub reads directly, without waiting for another voice-agent summary. You
can keep talking while work runs; related follow-ups continue the active worker and unrelated tasks start
a fresh one. Several independent requests in one breath ("check the deploy and update the changelog") start
one background worker each, in parallel, in the same turn; each worker gets a short name ("Deploy check") that
the task board and announcements use.

The phone composer exposes separate **Voice** and **Worker** model controls for each session. Each picker
lists the connected OpenCode process's available models and variants. Choices are saved per user and
session, apply to the next turn or newly started worker, and fall back to the machine's `voiceModel` and
`workModel` when unset.

The conversation is an inline execution timeline: streamed thinking, tools and nested subagents appear
between messages as compact expandable rows. Rows keep the session's order, never wall-clock order: history
rows carry the spoke's `pos` (message order, then part order), live rows go after the history loaded when they
arrived (in arrival order) and are replaced in place by their stored row, and a subagent row stands where the
tool call that spawned it is (timeline tool rows of `subagent`/`task` carry `childSessionID`; a subagent whose
spawn is not loaded yet shows at the top of the loaded history). Reopening a session pages its projected message history from
OpenCode. Expanding a tool fetches its complete input/output from the owning OpenCode process; the hub does
not persist those potentially sensitive details.

**Spoke side** (`src/spoke/conversation.ts`, `src/spoke/spoke.ts`):

- The plugin registers a primary agent **`voice`** through `ctx.agent.transform` (the agent editor's
  `update()` creates missing agents). Its system prompt is the orchestrator prompt; it inherits the
  default `build` agent's permissions so your rules still apply. A `voice` agent you define yourself
  (e.g. `~/.config/opencode/agents/voice.md`) takes precedence and is left untouched.
- `conversation on` remembers the session's current agent and switches it to `voice`; `off` switches
  back (or to the default agent), unless you picked another agent in the meantime. If no `voice`
  agent exists, the session keeps its agent and the `context` hook adds the orchestrator prompt instead.
- The delegate agent (`subagent` in the config) is added per request by the `context` hook, so changing
  it needs no restart.
- **Task board**: the `context` hook also gives the voice agent (and a conversation on another agent) a live
  list of the workers it started (`src/spoke/taskboard.ts`, from this process's events): title, sessionID,
  state (working, blocked with what it waits for, done with its latest text, failed with the reason, stopped)
  and for how long, at most 8 (live ones first) of at most 200 characters each. So "what's running?" or "how's
  the deploy going?" needs no tool call. A session without workers gets no board.
- **Stopping one task by voice**: the plugin adds a tool `hub_task_stop {sessionID} | {all: true}`. The voice
  agent calls it for "cancel the deploy one" (that worker and whatever runs below it are interrupted, deepest
  first) or "stop all the workers" (every running worker of the session). It only reaches sessions below the
  calling session (never the caller itself, its siblings or another session's workers), so the voice agent
  keeps listening. The phone's stop words ("stop", "cancel", "never mind", "stop that", "hold on") still
  interrupt the root turn at once.
- **Messaging other sessions**: the plugin adds a tool `hub {verb, …}` with the verbs `msg`, `ask`, `reply`,
  `decline`, `inbox`, `who`, `status` and `whoami` (`src/spoke/hub-tool.ts`). It acts as the calling session
  with that session's own hub token (the token never appears in the tool's output). `ask` with `wait` (seconds,
  at most 600) blocks for the answer until the tool call is stopped; without it the answer arrives later as a hub
  message. Messages from other sessions are shown in the hub's envelope and are not from the user.
- Child text and execution events are paired by the hub. The latest assistant message of a successful
  child is emitted as root-session speech; interruptions and stale partial results are not. **Announcements**
  (hub, `src/central/registry.ts`): while another worker of the session runs or waits, or one was announced in
  the last minute, a result starts with the task's title ("Deploy check finished: …"); a result the voice agent
  already said in the last two minutes is not read again. A failed worker is announced once with its reason
  ("Lint failed: rate limit exceeded."), a worker's permission request or question once per request ("Cleanup
  needs your permission.", "… has a question."); a stopped worker is not. Announcements are ordinary `say`s
  without `seq` (`messageID` `announce:failed:<session>`, `announce:permission:<id>`, `announce:form:<id>`),
  so the phone queues them after the sentence playing and never cuts one off.
- Server ops: `steer` sends the text with `delivery: "steer"` (metadata `{source: "hub", mode:
  "conversation"}`, or `mode: "remote"` for a session not shared with Voice; 0.5 wrote `source:
  "opencode-hub"` and 0.4 and earlier `source: "opencode-voice"`, and readers accept all three) and returns the inbox ID at once; `interrupt`
  interrupts the session; `conversation` turns the mode on/off and returns the agent now in effect, and
  is refused for sessions not shared with Voice. Replies reach the hub as forwarded
  `session.text.ended`, `session.inbox.delivered` and `session.agent.selected` events.
- State is per process and in memory; the hub re-sends `conversation on` after a reconnect.
- From the terminal: `/voice` opens the current session in the browser with Voice mode starting; `/hub →
  Conversation mode` toggles conversation mode only (same code path as the phone), then offers to send the
  session to your phone.

## Central server

The hub (`bin/hub.ts`, `src/central/`) serves the web app, pairs devices, enrolls machines, routes turns
to the right OpenCode process, does speech for Voice, and sends web push notifications.

See [Running the hub](#running-the-hub) for the binaries, the Docker image and bunx. `src/central/main.ts`
holds the startup (`bin/hub.ts` serves `web/` from disk; the compiled binaries embed it through
`src/central/assets.ts`, generated entry `scripts/gen-web-entry.ts`).

| Env | Default | |
|---|---|---|
| `HUB_CONFIG` | `~/.config/hub/hub.json` | optional config file ([Local only](#local-only)); env vars win over it |
| `HUB_AUTH` | `pairing` | `oidc` for several users signing in with Google; see [Multi-user](#multi-user-sign-in-with-google) |
| `HUB_HOST` / `HUB_PORT` | `127.0.0.1` / `4097` | listen address |
| `HUB_PUBLIC_URL` | `http://<host>:<port>` (`http://127.0.0.1:<port>` when the host is `0.0.0.0` / `::`) | origin used in links, cookies and CSRF checks |
| `HUB_STATE_DIR` | `~/.local/state/hub` | `state.json` (0600): users, machines and devices (token hashes only) with their owners, VAPID keys, push subscriptions, speech settings (server default and per user; provider API keys set from the phone), the audit log (last 500 entries); `token-keys.json` (0600): the HMAC keys that sign session tokens (created on first use, older keys kept so their tokens still verify); `agent/` (0700, files 0600, created on first use): agent data such as messages and name claims, one JSON file per user and collection, written shortly after each change and on shutdown |
| `HUB_TOKEN_KEYS` | | overrides `token-keys.json` with the same JSON, `{"active": "<kid>", "keys": [{"kid": "<kid>", "secret": "<base64 of ≥ 32 random bytes>", "created": <ms>}]}`, e.g. a secret shared by several hub instances; the file is then never written |
| `HUB_DATABASE_URL` / `HUB_VALKEY_URL` | | cluster mode: several hub pods sharing Postgres and Valkey (both or neither; requires `HUB_AUTH=oidc` and `HUB_TOKEN_KEYS`); see [docs/cluster.md](docs/cluster.md) |
| `HUB_POD_ID` | the hostname | cluster mode: this pod's unique id |
| `HUB_TURN_TIMEOUT_MS` | `600000` | the hub waits this + 15 s so the spoke's own timeout result arrives first |
| `HUB_VAPID_SUBJECT` | the https public URL, else `mailto:hub@localhost` | contact sent to push services |
| `OPENROUTER_API_KEY` | | default key for the `openrouter` speech provider (never sent to other providers) |
| `HUB_STT_MODEL`, `HUB_TTS_MODEL`, `HUB_VOICE`, `HUB_MAX_*` | see `src/central/config.ts` | speech defaults; the phone's speech settings override them |

The Docker image installs only the hub's runtime packages (web-push and its dependencies, pinned by
`package-lock.json`; see `docker/hub-deps.ts`).

**First device**: while nothing is paired the hub logs a 6-digit code; open `<public URL>/pair` and enter
it. Later devices get codes from `/hub → Pair a phone`. **Machines**: `/hub → Connect to a hub…`
shows a code; approve it on the phone (`/approve?code=…`, or Settings → Machines waiting). A local hub
approves the very first machine by itself (see [Local only](#local-only)).

**Turn routing**: a process that owns the session (viewed or ran it last) → a service process that reports
it → the service process of the reporting machine → otherwise the reporting process with the most
recent activity.

### Phone app (PWA)

`web/` is the Hub console, a Solid + Vite + TypeScript PWA built to `web/dist` (`npm run build:web`;
the Docker image, npm package and binaries ship the build). One store fed by the hub's SSE stream drives:

- **Sidebar** (⌘B collapses; a drawer on phones): search, New session, Needs you, Running, Pinned, sessions open in a
  terminal grouped by project (or server) with `+`, Recents; rows show status, a pulsing green dot left of the
  title for the session live in Voice (in Voice mode here, or in a conversation), an unread dot and a `⋯` menu
  (rename, pin, archive, stop, Allow/Disallow Voice).
- **Archive**: **Archive** in a session's `⋯` menu takes it out of the table, the sidebar's groups, Recents and
  Running, on all your devices (with **Undo**). Nothing is deleted and OpenCode's history is untouched:
  archiving is the hub's own, per user, because OpenCode has no archive API yet (when it gets one, Archive
  will map to it). The **Archived** chip on `/` lists archived sessions with **Unarchive**. One exception: an
  archived session that needs you (a permission or question) also shows under **Needs you** (sidebar and the
  Needs you chip), so a question is never missed. In the table, tick rows (or the header box for all shown
  rows) and press **Archive** (or **Unarchive** under Archived); **Archive inactive…** archives every session
  without activity for more than N days (30 by default; not running, pinned or open in a terminal) after a
  confirmation with the count. Sessions archived in OpenCode itself (`time.archived`) never reach the hub.
  Sessions hidden with an earlier version are archived now (same stored list, `hiddenSessions`).
- **Rename**: **Rename…** in a session's `⋯` menu (table row, sidebar row, phone list, the session's title
  menu), or a click on the title in the session's top bar, turns the title into a text field with the title
  selected: Enter (or clicking away) saves, Escape cancels. The new title shows at once and is set in
  OpenCode itself (`POST /api/sessions/:id/rename`), so terminals see it too; if that fails the old title
  comes back with a message.
- **Auto-name**: **Auto-name** in the same `⋯` menus, or the ✨ button next to the rename field, has OpenCode
  name the session with its Title agent (what `/rename` without a title does in the terminal; the model is
  `agents.title.model`), from the first request and the recent conversation. The title shows "Naming…" until
  OpenCode answers, then a toast says "Renamed to …" or "OpenCode kept the title". Needs this plugin version
  in the session's OpenCode process (older ones answer "Update the Hub plugin to use Auto-name") and a process
  that can reach its own server: the background service, or `opencode serve --port …` with
  `OPENCODE_SERVER_PASSWORD` (a TUI's own `serve --stdio` server cannot; use `/rename` there).
- **`/`**: All sessions as a sortable, filterable table (a list on phones); filters and sort are kept per device.
  There is no Voice column or Voice filter: the live Voice session gets the green dot before its title, and the
  row's `⋯` menu has **Allow Voice** / **Disallow Voice**.
- **`/s/<id>`**: the transcript (markdown replies, "Thought for Ns", "Used N tools" with full details on demand,
  subagent rows linking to their sessions), permission cards, and the composer: Send while idle, Steer while the
  session tree runs, Stop for the whole tree, Dictate (into this session's draft; leaving the session while
  recording cancels it; each session keeps its own unsent draft), Voice mode (hands-free, see below; a toggle that
  turns Voice on first when needed; one session at a time, so turning it on elsewhere turns the first one off; it
  keeps running while you look at other sessions, which show a "Voice: <session>" pill with End) with a
  microphone picker, and the Voice/Worker model menus. The right rail (a bottom sheet on phones) has
  cards that collapse from their header (remembered per device): **Environment** (machine with
  online/offline/Connecting, project folder with the full path as tooltip, branch, and where it is open:
  TUI, Herdr or background), Context, **Connectors · N connected** (MCP servers) and Changes with a diff
  viewer. Every session works with Voice
  off; Voice only adds speech.
- **`/new`**, **`/settings`** (account, notifications, Voice, Speech, machines and approvals, devices, admin),
  **`/pair`**, **`/approve`**.

Pure logic lives in `web/src/core` and `web/src/lib` (bun tests in `test/web-*.test.ts`).

**Accounts** (multi-user hub, contract in [docs/multi-user.md](docs/multi-user.md); pure logic in
`web/account-core.js`, tested with bun):

- **Signing in**: with `HUB_AUTH=oidc` the sign-in screen shows **Sign in with Google**
  (`/auth/login?next=<page>`), with the pairing code behind "Have a pairing code?" (a code signs the browser
  in as the owner of the computer that made it). In pairing mode the pair screen is unchanged.
- **Account menu** (avatar in the header): name and email (or "This hub" in pairing mode), an Admin badge,
  My devices, Speech, Admin (admins only) and Sign out (`POST /api/logout`, then the sign-in screen).
- **Speech** is per user: each field you have not set shows "Using server default: …" (keys: "Key: server
  default"), and each card has **Reset to server default** (sends `null` for every field and the key).
  Admins also get **Server default** (`/api/settings/speech/default`), used by everyone for what they have
  not set themselves.
- **Admin** (in Settings, admins only): **Users** (search, filter, sort; make/remove admin and
  disable/enable with a confirmation; the hub refuses to demote or disable the last active admin and the
  page shows its message; not shown in pairing mode), **Machines** (every machine with its owner; Revoke),
  **Approvals** (pending machines; approving makes the machine yours) and the **Audit log** (newest
  first, e.g. "Approved a machine", "Changed a role").
- **Approving a machine** (`/approve?code=`) says "This machine will belong to you (<email>)". Only admins
  see the list of pending requests; everyone else approves by the code OpenCode shows.
- A session link that is not yours (or is gone) shows **Session not found** with a link home.

**Session browser** (`/`; contract in [docs/session-view.md](docs/session-view.md); pure logic in
`web/src/core/view-core.ts` and `web/src/core/browser-core.ts`, tested with bun). Three tabs with counts:

- **Open** (default): what is open in your terminals right now, like Herdr's sidebar. A **Needs you**
  strip first (blocked sessions from every machine, open or not, with the blocker and an Open button),
  then one group per Herdr workspace (in Herdr's order), then one per project folder for sessions open in
  an OpenCode TUI. Rows are compact: status dot (Herdr's agent status combined with the session state:
  blocked > working > error > idle), **workspace** · title, and `opencode · folder` or what it is doing
  now (`shell · bun test`, `Thinking…`). Within a group: pinned, then blocked, working, idle, then most
  recent; pinned groups come first. Sessions that are not open but working or in conversation mode are
  listed under **Not in a terminal**. With nothing open: "No sessions open in a terminal" with links to
  Recent and New session. Machine headers appear only when several machines are online; offline machines
  are one line at the end.
- **Recent**: everything else the machine reported (its history window), grouped by workspace with
  nested worktrees and subfolders, with search (title, project name, directory; case- and
  diacritic-insensitive, all words must match, matches highlighted; opens every group) and filter chips
  All · Active · Needs you · Today · Enabled. Groups that are pinned, active, blocked or changed
  within a day start open; only open groups render rows, 50 at a time ("Show more"). A **Standalone**
  section lists standalone processes.
- **Hidden**: hidden workspaces (with how many sessions they hide) and hidden sessions, each with Unhide.
- **Menus**: ⋯ on a row (or long-press / right-click it): Open, Pin to top / Unpin, Hide / Unhide. ⋯ on a
  group: New session here, Pin / Unpin workspace, Hide / Unhide workspace (and Collapse / Expand in
  Recent). Hiding a workspace hides the sessions in it: a Herdr workspace (`herdr:<id>`), a project
  folder, or a nested folder such as a worktree.
- **Synced view settings**: pins, archived sessions and hidden workspaces are per user on the hub (`GET`/`PUT /api/prefs/view`), shown at
  once, reverted with a message if the hub refuses, with Undo after an archive. Other devices update live
  (SSE `prefs`). Pins from 0.3 (stored on the device) are moved into them once. With an older hub
  without `/api/prefs/view`, they stay on the device. Open/closed groups and the filter stay per device.
- **Voice off** sessions (`exposed: false`, mode `session`) open, show their status and live activity, and
  take Send, Steer, Stop and permission replies like any other session. Only Voice is off: the row's ⋯
  menu has **Allow Voice** (`POST /api/sessions/:id/expose {on:true}`; shown at once, reverted on
  error), and Voice mode on such a session turns Voice on first.
- **New session** (`/new`; + in the header, + on any group, or a group's ⋯ menu), composer first: "Describe
  a task or ask a question" (images can be attached), and under it where it runs: **Environment** (your
  machines on this hub: online first with their process and OpenCode version, offline ones listed but not
  selectable; ✓ on the chosen one), **Project** (a popover with search: Herdr workspaces with their pane
  folders, then known folders), the folder's **branch** (from the summary of the latest session in that
  folder, when there is one) and **Open in Herdr tab** (a Herdr workspace on a machine that runs Herdr; on
  by default). Submitting sends `POST /api/machines/:id/sessions {directory, herdrWorkspace?}`, opens the
  new session and sends the prompt (and images) as its first turn (`POST /api/sessions/:id/turn`). The last
  environment and folder are remembered on the device (`localStorage` `hub.newSession`); the group "+"
  preselects with `?machine=&key=&dir=`. "Opened in Herdr · <workspace>" confirms the new tab; if Herdr
  failed, the session still exists and the hub's `warning` is shown. 409 (background service not
  connected) is shown under the composer.

**Notifications** (web push, VAPID keys generated once and stored in the state file). Each device picks each
kind it wants (Settings → Notifications, grouped, with a one-line description each and a "You'll get: …"
summary); [docs/notifications.md](docs/notifications.md) lists every kind, its trigger and what is not notified:

- **Needs you**: a **question**, a **permission** (on by default).
- **Session**: **All done** (on): the root session's last turn succeeded and the whole tree is settled (no
  subagent or shell job running, nothing waiting for an answer, no hub turn) for 15 s, once per run;
  **Failed** (on, with the reason); **Turn finished** (every root turn, 0.7's "finished": off, noisy because
  each background subagent that completes starts a short continuation turn); **Stopped** (shutdown,
  inactivity) and **Retrying** (provider retries), off.
- **Subagents**: each subagent **finished** / **failed** (off). **Scripts and tools**: a background shell or
  terminal **exited 0** / **failed** (non-zero, killed, timed out), a **long tool** (≥ 30 s) ended (off).
- **Voice**: spoken replies while no device shows the session (`say`) and **hand-offs** from the terminal (on).
- **Activity digest** (off, below).

Titles read "*session* · *kind*" ("KVM Rewrite · All done", "KVM Rewrite · Subagent S3 macros finished",
"KVM Rewrite · Script exited 1"). Nothing but questions, permissions, hand-offs and spoken replies is sent
while a device shows the session. Stored 0.7 prefs migrate on start: `finished` becomes All done (not every
turn), the rest is kept and the new kinds start off (0.5.0's single "blocked" toggle still becomes question +
permission). Optional **quiet hours** per device (local start/end time in the browser's time
zone) hold everything except hand-offs; **Mute notifications** in a session's ⋯ menu silences one session
for you on every device (hand-offs still come through). At most one per session and kind every 30 s
(Voice replies: 10 s; subagents, scripts and long tools: per subagent, job or call); expired subscriptions
(404/410) are pruned.

**Activity updates** (pref `activity`, off by default on every device; Settings → Notifications shows a hint
until it is on): to know what happens without keeping the screen on. Steps of interest in a session tree — a
subagent started or ended, a tool that took 30 s or more, a background shell or terminal that ended (with its
exit code: "bun run build exited 0", "was killed", "timed out"), the session going idle — become one
notification per session, tagged per session so each replaces the last quietly (no new sound, normal
urgency, 5-minute TTL). The first step after a quiet spell goes out at once; later ones are collected until the
device's interval ends (Settings: 1–60 minutes, default 5) and sent together ("3 tools · explore finished ·
Finished"). Short tools are only counted. Quiet hours and muted sessions apply; nothing is sent while a
device shows the session.

- **Status per device**: Settings → Notifications shows the browser permission, whether the service worker
  is registered and whether this hub holds this browser's subscription. "Allowed, but this device is not
  subscribed on this hub" means nothing will arrive (typical after the hub moved to a new address): **Enable
  notifications on this device** fixes it. When permission is granted, the app re-subscribes by itself on
  load if the hub lost the subscription, and the service worker re-subscribes when the browser rotates it
  (`pushsubscriptionchange`). **Send test notification** sends one to this device only and shows the result
  (sent, or the push service's status); pick a kind next to it to see how that kind looks.
- **Delivery**: questions, permissions and failures are sent with `urgency: high` and a TTL of one hour so a
  phone in doze gets them; they stay on screen until handled (`requireInteraction`), vibrate, and replace the
  previous one of the same session and kind. A permission notification asks the hub (with the device's
  cookie, from the service worker) what the request is, shows it, and offers **Allow once** / **Reject**;
  the payload itself never carries it. Payloads are `{kind, sessionID, title, body, requestID?, test?}`.
  Failures (and failed subagents and scripts) vibrate; progress kinds (turn, retrying, subagent and script
  finished, long tool, activity) replace the previous one of the session quietly.
- **Android (Chrome)**, for notifications that arrive with the screen off: open the public URL, sign in or
  pair, then Chrome's menu → **Install app** (or Add to Home screen) and use the installed app; Settings →
  Notifications → **Enable notifications on this device** and **Send test notification**. In Android
  settings → Apps → Chrome (and the installed app, if listed): Notifications allowed (all categories), and
  **Battery → Unrestricted** (not "Optimized"), so Chrome may receive pushes while dozing. Notifications of
  an app you have not opened for a long time can be delayed by Android's adaptive battery.
- **iPhone/iPad**: web push needs iOS/iPadOS 16.4+ and the app added to the Home Screen
  (Share → Add to Home Screen); open it from the icon, then enable notifications. Audio replies need a
  tap first (the mic or Send button unlocks playback).
- Microphone and push need a secure context: HTTPS, or `http://localhost` / `127.0.0.1` for testing.

## Multi-user (sign in with Google)

One hub can serve several people. Each person signs in with Google (or any OpenID Connect provider)
and sees and controls only their own machines, sessions, phones and speech settings. Without it
(`HUB_AUTH=pairing`, the default) the hub has one owner, exactly as before. The full contract is in
[docs/multi-user.md](docs/multi-user.md).

**Google Cloud console**

1. APIs & Services → OAuth consent screen: set it up (External or Internal; scopes `openid`, `email`,
   `profile` are enough).
2. APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
3. Authorized redirect URI: `<public URL>/auth/callback`, e.g. `https://hub.example.com/auth/callback`
   (Google wants https, except for `localhost`).
4. Copy the client ID and client secret into the hub's environment or `hub.json`.

**Configuration** (env vars win over `hub.json`'s `auth` object):

| Env | hub.json | |
|---|---|---|
| `HUB_AUTH` | `auth.mode` | `pairing` (default) or `oidc` |
| `HUB_OIDC_ISSUER` | `auth.issuer` | default `https://accounts.google.com`; must be https |
| `HUB_OIDC_CLIENT_ID` | `auth.clientId` | required |
| `HUB_OIDC_CLIENT_SECRET` | `auth.clientSecret` | required; never logged or returned. In `hub.json` it is ignored (with a warning) unless the file is `chmod 600` |
| `HUB_OIDC_ALLOWED` | `auth.allowed` | required: who may sign in, emails and/or `@domain` entries (comma list, or an array in hub.json) |
| `HUB_ADMIN_EMAILS` | `auth.admins` | at least one admin email (admins are always allowed) |

```sh
HUB_PUBLIC_URL=https://hub.example.com \
HUB_AUTH=oidc \
HUB_OIDC_CLIENT_ID=1234567890-abc.apps.googleusercontent.com \
HUB_OIDC_CLIENT_SECRET=GOCSPX-… \
HUB_OIDC_ALLOWED=alice@example.com,bob@example.com,@example.org \
HUB_ADMIN_EMAILS=alice@example.com \
hub-server
```

```json
{
  "publicURL": "https://hub.example.com",
  "auth": {
    "mode": "oidc",
    "clientId": "1234567890-abc.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-…",
    "allowed": ["bob@example.com", "@example.org"],
    "admins": ["alice@example.com"]
  }
}
```

An invalid or incomplete `oidc` setup stops the hub with the reason. The startup log shows the issuer,
the redirect URI to register and how many allow-list entries and admins there are.

**Who may sign in**: an email on the allow-list, any address of an `@domain` entry (exactly that domain,
not its subdomains), or an admin. The provider must report the email as verified. There is no open
sign-up. Others get a "Not allowed" page (and an audit entry).

**Admins** manage users (make admin, disable), everyone's machines and devices, the server default
speech settings and pending machine enrollments, and read the audit log (Account → Admin). They do
**not** see other users' sessions. Emails in `HUB_ADMIN_EMAILS` become admins when they sign in; the
last active admin cannot be demoted or disabled. Disabling a user signs out all their devices and
disconnects their machines at once.

**Ownership**: a machine belongs to whoever approves its enrollment code; pairing codes and one-time
login links from `/hub` belong to the machine's owner. The bootstrap pairing code and the local
first-machine auto-approve exist only in `pairing` mode.

**Native apps** link from Settings → Devices → **Add app**: the dialog shows a QR code of
`hubapp://link?hub=<public URL>&code=<code>` (and the link itself), with a 5-minute countdown. The code is
single use, 256-bit, belongs to the user who opened the dialog (who must still be active when it is redeemed)
and works only for linking: `/login` and `/api/pair` refuse it. The app calls `POST /api/devices/redeem
{code, deviceName?, publicKey?}` (no cookie, and no `Origin` needed: the code is the only credential) and gets
`{device, token}`; it keeps `token` and sends it as `Authorization: Bearer <device token>`. The device appears
in the list (audit `device.pair`, "app link"); revoking it invalidates the token. `deviceName` is cleaned
(control characters dropped, at most 64 characters, "App" when empty); `publicKey` (PEM or base64, at most
4096 characters) is stored with the device for later strong approvals.

**Speech**: each user can set their own provider, models, voice and key (Settings → Speech); fields they
leave empty come from the server default (admins: Settings → Speech → Server default), then `hub.json`,
then the env. A user's key is only ever shown (masked) to that user.

**Migrating a single-owner hub**: existing machines and devices belong to the built-in owner `local`.
The first time an admin signs in, all of them move to that admin (audit `migrate.local`) and `local` is
disabled. Nothing else changes; a running spoke stays connected.

**Security notes**

- `/auth/login` and `/auth/callback` must be reachable from browsers (an auth proxy in front of the hub
  is still optional, but must let `/auth/*`, `/spoke/*` and the app through).
- Sign-in uses the authorization code flow with PKCE (S256), `state` and `nonce`; the ID token comes
  straight from the provider's token endpoint over TLS (client_secret_post) and its claims are checked
  (`iss`, `aud`/`azp`, `exp`, `nonce`, `email_verified`).
- Another user's sessions, machines and devices answer 404 (like unknown ones), so IDs don't leak; SSE
  events and push notifications only go to the owner.
- `HUB_OIDC_INSECURE_ISSUER=1` allows a plain-http issuer on loopback. It exists for local
  development and tests with a fake provider only; never set it in production.

## Session browser (hub)

Catalog sessions (`GET /api/machines` → `machines[].processes[].sessions[]`, SSE `catalog`) carry, besides
the reported `id, title, directory, parentID?, updated, owned, status, busy, conversation`:
`exposed` (any process exposes it), `project?`, `projectName?`, `processID`, `machineID`, `state` (whole
subtree: `blocked` if anything waits for the user, else `error` (own), `working`, `idle`), `blockers[]`
(`{kind, id, summary, sessionID, sessionTitle}` for the subtree) and `now?` (`{kind: "tool" | "thinking",
tool?, summary?}`, the latest running activity item), and `open?` / `terminal?` as the process reported them
(`GET /api/sessions/:id`: open from any reporting process, Herdr first). Machines carry `terminals?:
{herdr?: {workspaces: [{id, label, directories}]}}`, the latest `terminals` frame of the machine, while
the process that sent it is connected. `now` and `state` are snapshots: the phone follows
SSE `activity` and `status` for live changes. Every reported session has a status board, Voice on or
off: unexposed sessions report `status`, `state`, `blockers`, `now` and activity like exposed ones. An
unchanged sessions frame does not re-broadcast the catalog.

| Route | Spoke op | Result |
|---|---|---|
| `POST /api/sessions/:id/expose {on}` | `expose` | `200 {exposed}` from a reporting process (service first). 400 bad body, 404 not reported, 502 spoke error |
| `POST /api/machines/:machineID/sessions {directory, title?, herdrWorkspace?}` | `create` | `201 {sessionID, openedIn?: "herdr", warning?}` from the machine's service process; with `herdrWorkspace` (≤ 100 characters) the session is also opened in a new tab of that Herdr workspace, and when that fails the answer has a `warning` instead of `openedIn`. 400 bad input or `unknown workspace` (not a workspace root, session directory or Herdr pane folder of that machine), 404 unknown machine, 409 no service process connected |
| `GET /api/prefs/view` | – | `{prefs: {hiddenSessions, hiddenWorkspaces, pinnedSessions, pinnedWorkspaces}}`, the caller's view preferences (pairing mode: the single user). `hiddenSessions` is the user's **archived** sessions (the name is from before Archive was called Hide) |
| `PUT /api/prefs/view {any of the four lists}` | – | Replaces the lists given (each ≤ 500 non-empty strings, `hiddenSessions` ≤ 5000, of ≤ 4096 characters, duplicates dropped; other keys 400). Stored on the user record; SSE `{type: "prefs", prefs}` goes to the user's other devices (never to other users, not to the device that changed them) |

For a session reported only with `exposed: false`, `utterance` and `conversation` answer
`403 {error: "Voice is not enabled for this session", code: "not_exposed"}`; inspecting and controlling it
(timeline, turn, stop, interrupt, permission and form replies, models, context) works as for any other
session.

## Conversation mode (hub and phone)

### Hub API

All routes need the device cookie; POSTs also need a same-origin `Origin` (or `Referer`). Native apps and
other non-browser clients send the same device secret as `Authorization: Bearer <device token>` instead: same
powers, no same-origin check (a request with both a cookie and a bearer token is refused with
`400 {"error": …, "code": "invalid"}`; an unknown bearer token is `401 {"code": "unauthorized"}`). Other bearer
tokens (session and app tokens) are refused on these routes (`403 {"code": "forbidden"}`); they are for
`/api/agent/*` only. Every
`/api/sessions/:id…` route answers `404 {"error": "Not found"}` for a session that none of the caller's
machines reports (since 0.3.0; before, a session nobody reported was 409), so another user's session looks
exactly like an unknown one. For a loopback
public URL, `localhost`, `127.0.0.1` and `[::1]` with the same scheme and port count as the same origin.

| Route | Spoke op | Result |
|---|---|---|
| `POST /api/sessions/:id/utterance {text}` | `steer` | `202 {inboxID}`; allowed while the session is busy (no turn lock). 400 empty or over 4000 chars, 404 no machine of yours reports the session, 502 spoke error, 504 no answer in 15 s |
| `POST /api/sessions/:id/interrupt` | `interrupt` | `204` |
| `POST /api/sessions/:id/conversation {on}` | `conversation` | `200 {on, agent}`. 404 when no machine of yours reports the session |
| `GET /api/sessions/:id` | | `{id, title, directory, parentID?, project?, projectName?, updated, exposed, state, blockers, now?, busy, conversation, status, activity}`; catalog sessions also carry `conversation` |
| `POST /api/sessions/:id/presence {visible}` | | `204`; the phone posts on `visibilitychange` and every 30 s while visible. A root session is *watched* while any device reported it (or one of its subagent sessions) visible within 45 s |
| `POST /api/sessions/:id/permission {requestID, decision}` | `permission` | `204`. `decision` is `once`, `always` or `reject`; `:id` is the session or any ancestor. Tried on every process that forwarded the request (OpenCode keeps pending permissions per process and per location; the spoke replies through the plugin instance of the location that holds it). `409 {code: "gone"}` "This request was already answered or expired" when none holds it (its card is dropped). 400 bad decision |
| `POST /api/sessions/:id/form {formID, answer}` · `{formID, cancel: true}` | `form` | `204`. Answers (or dismisses) a pending OpenCode form, e.g. the agent's question tool. `answer` is field key → text, number, true/false or list of texts (≤ 50 fields, texts ≤ 20,000 characters, lists ≤ 100). Form blockers carry their `fields` (key, type, title, description, options, custom, required, limits, `when`) so a client can render them. The plugin API has no forms: the spoke uses its own server's HTTP API (the background service, or a foreground `opencode serve` with `--port` and `OPENCODE_PASSWORD`), else relays to a TUI of that server that polls RPC `hub.formActions`; with neither, 502 "answer it in the terminal". `409 {code: "gone"}` when no process holds it |

The hub keeps the conversation flag per session in memory. When a process sends a sessions snapshot,
owns a session in conversation mode, and was not told yet (it reconnected or took over ownership), the
hub sends it `{op: "conversation", on: true}` once. Deleting the session clears the flag.

SSE (`/api/events`) adds:

- Each session's status tree entry may carry `jobs` (`[{id, kind: "shell" | "pty", command?, status:
  "running" | "exited" | "timeout" | "killed", exit?, background?, started?, ended?}]`: running ones plus the
  last 5 that ended) and `retry` (`{attempt?, message?}`, with `detail` "Retrying: …"). A session is
  `working` while its run, a busy/retry `session.status` or a running job lasts. The console shows a job count
  next to the status (table, sidebar), "Retrying …" or "· 1 job" in the session header, and a **Jobs** card in
  the rail (command, running time, exit code for a minute after it ends).

- `{type: "conversation", sessionID, on}` when the flag changes.
- `{type: "say", sessionID, messageID, ordinal, seq, text}`: **root** text in conversation mode is spoken
  while it is written. The hub cuts the streamed `session.text.delta`s of each text part (`messageID`,
  `ordinal`) into sentences (`src/central/say-stream.ts`: sentence ends followed by the next sentence, line
  breaks, whole fenced code blocks, abbreviations/decimals/file names kept together, runs over 300 chars cut
  at a comma) and sends one `say` per completed sentence right after its delta, `seq` counting from 0 per text
  part; `session.text.ended` (authoritative: missed deltas are recovered) flushes the rest. Sentences are
  raw slices of the text: `/api/speak` makes each one speakable. One process's deltas are used per text part
  and the end is handled once, so each sentence is sent once; an interrupted or failed run, or conversation
  mode turning off, drops the unspoken rest. A successful subagent's final message is spoken through its
  root as before: one `say` per text part without `seq`. Blank text is skipped.
- `{type: "heard", sessionID, inboxID}` when OpenCode delivers an utterance's inbox item (also when the
  delivery event arrives before the steer result).
- `{type: "activity", sessionID, rootID, item}` when an activity item is created or changes state, for
  every session (all of the owner's devices see it, like `status`). `item` is `{id, sessionID, kind: "tool" | "thinking",
  tool?, summary?, background?, childSessionID?, state: "running" | "done" | "failed", error?, at}`
  (`childSessionID`: the session a subagent tool started, once the tool reports it); `sessionID` is where it
  happened (a subagent session maps to its root `rootID`). The hub keeps the 30 most recent items per
  root (in memory) and returns them, newest last, as `activity` in `GET /api/sessions/:id`. Spokes forward
  tool and reasoning events in compact form (`compactActivity`): tool name, a one-line summary of the
  input (command, path, pattern…), ok/error; never file contents or outputs. A subagent tool's
  `session.tool.progress` goes out only as `session.tool.called {id, childSessionID}` (a type every hub
  accepts); other progress is dropped. Thinking items close on
  `session.reasoning.ended`, when the next activity in that session starts, or when its run ends.
- `{type: "delta", sessionID, rootID, messageID?, ordinal?, text}` (assistant text; `ordinal`: which text part of
  the message, as OpenCode numbers them) and `{type: "reasoning", sessionID,
  rootID, messageID?, delta}` (reasoning text; spokes cut each delta to 2000 chars and never forward the full
  text of `session.reasoning.ended`) for root **and** subagent sessions. Per session they are coalesced to at
  most one send per 100 ms (the first delta goes out at once, later ones in the window are joined); anything
  else in that session (e.g. the `say` for that text) is sent only after its held text.
- `status` entries of working sessions carry `since` (ms epoch the current run started), also in the catalog
  and `GET /api/sessions/:id`.

Pushes depend on presence: while the session is watched, run notifications (all done, turn, failed, …) are
not sent (the page is open, and in conversation mode speaking). When nobody watches, they are sent as usual and in conversation mode each spoken text
of the root session (the whole text part, when it ends) is pushed as kind `say` (title = session title, body = the text, max 180 chars; at
most one every 10 s per session; on by default, pref `say`). Questions and permissions are always sent. `/api/transcribe` and `/api/speak` have no rate limit; `/api/speak` accepts up to
`HUB_MAX_SPEECH_CHARS` per call, so the phone sends sentence-sized chunks. `/api/speak` streams the provider's MP3 through as it
arrives (chunked; nothing is buffered on the hub, and a phone that cancels aborts the upstream request), so playback
can start before synthesis ends; provider errors still answer 502 before any audio.

### Speech settings

STT and TTS each use a provider configured from the phone (Settings → Speech) and stored in
`state.json`. Precedence, per direction and field: phone settings > `hub.json` `speech` > the environment
(`OPENROUTER_API_KEY`, `HUB_STT_MODEL`, `HUB_TTS_MODEL`, `HUB_VOICE`). When the phone picks another
provider than `hub.json`, the file's section is ignored for that direction; when it picks another base
URL, the file's key is not sent there. Providers:

- `openrouter` (default, base `https://openrouter.ai/api/v1`): STT is an OpenAI-style multipart upload
  (`file`, `model`, `language?`: the audio goes up as binary, not base64 JSON), TTS is `POST /audio/speech`.
- `openai-compatible` (`baseURL` required: `https://…`, or `http://localhost` / `127.0.0.1` for local
  servers): STT is multipart `POST {baseURL}/audio/transcriptions` (`file`, `model`, `language?`), TTS is
  `POST {baseURL}/audio/speech {model, input, voice, response_format: "mp3", speed?}`. No env key.

A TTS `speed` (0.5–2.0) is sent when set; a provider that answers 400 gets one retry without it.

| Route | Result |
|---|---|
| `GET /api/settings/speech` | `{stt: {provider, model, baseURL?, language?, apiKey}, tts: {provider, model, voice, baseURL?, speed?, apiKey}, voiceHints, ready}`. `apiKey` is `{set, last4?, source: "settings" \| "config" \| "env" \| "none"}` (`config`: hub.json); a key is never returned. `voiceHints` maps model ID prefixes to known voices. `ready` is `{stt, tts, reason?}`: a direction is usable when `openrouter` has a key or `openai-compatible` has a base URL; `reason` says what is missing. The page shows a **Set up speech** card (home and session view) until both are ready, and the mic opens speech settings instead of recording while STT is not usable |
| `PUT /api/settings/speech {stt?, tts?}` | partial update, answers like GET. `apiKey`: string sets, `null` clears, absent keeps; changing `provider` or `baseURL` without a new key drops the stored one. 400 for unknown providers, names over 200 chars, bad URLs, speed outside 0.5–2.0, `openai-compatible` without `baseURL` |
| `GET /api/settings/speech/models?kind=stt\|tts` | `{models: [{id, name, current?}], note?}`, the configured model first (`current`, added when the provider does not list it). OpenRouter: its model list filtered by output modality (`transcription` / `speech`), cached 10 min, 502 when unreachable. OpenAI-compatible: `GET {baseURL}/models` classified by kind (speech-to-text: transcribe/whisper/stt/asr names or audio-in/text-out audio models; text-to-speech: tts/speech/voice names or speech/audio output, never chat, embedding, image, rerank or music models); when nothing is labeled, every model with `note`; only the configured model on any failure |
| `POST /api/settings/speech/test {kind: "tts", text?}` | `audio/mpeg` preview with the current settings (text capped at 300 chars). `kind: "stt"` is 501 |

Writes need the same-origin `Origin`. Provider failures are 502 with the provider's message.

### Conversation mode (phone)

On `/s/<id>`, the **Conversation** button next to the mic starts hands-free mode. It turns on the mic
(mono, with the browser's echo cancellation, noise suppression and auto gain on), then calls `POST …/conversation {on:true}`, keeps
the screen awake (Screen Wake Lock, taken again when the page becomes visible) and shows a level ring
around the mic with the current state: Listening, Hearing you, Transcribing, Sent ✓ and Speaking. Tap
it again, say "pause listening", or leave the page to turn it off. Leaving the page calls
`{on:false}` with `keepalive`. While conversation mode is off, tap-to-talk works as before.

- **Speech detection** (`web/src/core/speech-vad.ts`; ~20 ms frames from `web/public/vad-worklet.js`, with a
  ScriptProcessor fallback): on-device [Silero VAD](https://github.com/snakers4/silero-vad) v5 (MIT) through
  onnxruntime-web (MIT, wasm, single-threaded, so no COOP/COEP headers are needed) in a Web Worker
  (`web/src/voice/silero-worker.ts`). The mic audio is resampled to 16 kHz and cut into 32 ms chunks; each
  chunk's speech probability starts speech at ≥ 0.6 sustained for 250 ms (most of the onset voiced, so
  isolated clicks never add up) and ends it after 350 ms below 0.35. Typing, a fan, clatter, beeps and hum
  score low; speech scores high at any loudness. An energy detector stays as a cheap pre-gate (chunks within
  3 dB of the adaptive noise floor skip the model) and as the fallback while the model loads, if it fails to
  load (logged once in the console) or stalls: noise floor that falls fast and rises slowly, threshold 10 dB
  above it with 4 dB of hysteresis, 300 ms to count. 300 ms of audio before the onset is kept. The model
  (2.3 MB) and the wasm (12 MB; 2.3 MB with Brotli) load when Voice mode first starts, as hashed static
  assets the hub serves with `cache-control: immutable` (and compressed when the browser accepts it), outside
  the main JS chunk; the Voice bar's tooltip says which detector runs and its time per chunk (about 1 ms).
- **Mic sensitivity** (Settings → Voice, per device, Normal by default, applies at once): Low needs ≥ 0.75 for
  350 ms (ends below 0.45; pre-gate 6 dB; energy fallback 13 dB / 400 ms), Normal as above, High ≥ 0.45 for
  180 ms (ends below 0.25; no pre-gate margin; energy fallback 7 dB / 250 ms).
- **Echo guard**: while a reply or a progress cue plays, and 400 ms after, a barge-in needs more: the model's
  probability ≥ 0.85 (Low 0.92, High 0.75) and 8 dB more energy. The browser's echo cancellation removes most
  of the reply from the mic first.
- **Noise transcripts** (`web/src/core/junk-transcript.ts`): what speech-to-text makes of noise is dropped
  before it reaches the agent and shown dim in the Voice bar for 3 s ("ignored: “Thank you.”"): empty or
  punctuation-only text, sound tags ("[Music]", "(applause)", "♪"), Whisper's stock phrases ("Thank you.",
  "you", "Bye.", "Thanks for watching!", "Subtitles by …", "Amara.org" …), one word repeated, and one or two
  words from under 400 ms of speech unless they hold a command or answer word ("yes", "no", "okay", "stop",
  "cancel", "wait", "go ahead", "cancel that" …). With a Whisper model the hub also asks for `verbose_json` and
  leaves out segments Whisper rates `no_speech_prob` > 0.6 (OpenRouter and OpenAI-compatible providers; one
  that refuses `verbose_json` gets plain requests from then on).
- **Endpointing**: a segment ends after 350 ms of silence. It is encoded to 16 kHz mono 16-bit WAV
  and sent to `/api/transcribe` at once. A transcript that reads as complete is sent right away:
  it ends in `. ? !`, or has 3+ words and doesn't end in "and", "but", "so", "um", "the" and the like.
  Otherwise it waits up to 0.8 s. If you speak again during the wait, the next segment's transcript
  is joined to it. Empty and filler-only transcripts are dropped. Utterances are capped at 60 s.
- **Commands**: an utterance that is only "stop", "cancel", "never mind", "stop that" or "hold on"
  calls `POST …/interrupt` and stops speech. "Pause listening" turns the mode off.
- **Speech out**: root replies arrive one sentence at a time while they are written (`say` with `seq`);
  the phone plays them in `seq` order per text part and drops duplicates (`SayAssembler`). A `say` without
  `seq` (a subagent's result) is split into sentences. Abbreviations, decimals, file names and
  list items are handled, and fenced code becomes "(code omitted)". Each sentence goes to `/api/speak`,
  up to two ahead of playback, and plays through one `<audio>` element while its MP3 is still downloading:
  through MediaSource (`audio/mpeg` SourceBuffer; Chrome, Android, Firefox), appending bytes as they arrive
  (`web/src/core/audio-stream.ts`). Browsers without MP3 in MediaSource (some iOS Safari versions) play each
  sentence once it has fully downloaded, as before. Prefetched sentences keep downloading while they wait. Speech while a reply plays
  (barge-in, past the echo guard) pauses playback, clears the queue and mutes the rest of the replies that were speaking, also a reply still
  being written whose next sentence has not arrived yet (their later sentences still show in the transcript); a
  new reply speaks again. Barge-in never interrupts anything: what you say steers the agent, and background
  workers keep running (only a stop phrase interrupts the agent's turn).
- **Turn timing**: each turn's steps are `performance.mark`s (`hub-voice:speech-end`, `…:transcript`,
  `…:accepted`, `…:first-say`, `…:first-byte` (the reply's first audio byte arrived), `…:first-audio` (it plays); visible in the browser's performance tools), and the Voice bar's
  state has the last turn as its tooltip: "last turn: 1.8 s to first audio" with the steps (transcript,
  accepted, first reply, first byte, audio). A typed turn counts from when the hub accepted it. The transcript shows your utterances with ✓ (sent)
  and ✓✓ (heard). Agent text is merged with the bubble already streamed from deltas. Subagents
  starting, finishing or failing appear as small notes. Typed text is sent as an utterance while the
  mode is on.
- **Android Chrome** is the main target. Install the app ("Add to Home screen") so it runs in a
  standalone window. By default the screen stays on while listening; Settings → Voice → "Keep
  listening when screen is off" is a best-effort alternative (see below).
- **iOS caveats**: Safari needs a tap before audio plays (the Conversation tap unlocks it). The Screen
  Wake Lock API needs iOS 16.4+ and, before iOS 18.4, works only in Safari tabs, not in Home Screen
  apps. Locking the screen or switching apps suspends the mic and the AudioContext, so turn the mode
  on again when you come back. Echo cancellation is weaker with the speaker at full volume, so use
  headphones or lower the volume if the phone keeps interrupting itself.
- Local UI checks without OpenCode: `bun test/web-mock-hub.ts` serves `web/` with a fake hub API
  (queue transcripts with `POST /mock/transcripts`, push SSE messages with `POST /mock/emit`, set the
  status tree with `POST /mock/status {sessions}`, add activity with `POST /mock/activity {sessionID?, item}`,
  read calls from `GET /mock/log`). It also fakes presence, push prefs and the speech settings API, and
  the session browser: ~55 sessions in 8 workspaces (worktrees, blocked, working, voice-off ones, a
  standalone process, an offline machine), 14 of them open (Herdr workspaces general, api-server, research,
  ops; one in a TUI), expose, create (with `herdrWorkspace`) and 403 `not_exposed`, and the view prefs
  (`GET`/`PUT /api/prefs/view`, SSE `prefs`). `POST /mock/prefs {…lists}` acts as another device changing
  prefs, `POST /mock/herdr {on?, fail?}` removes Herdr or makes opening in Herdr fail (201 with a `warning`).
  `POST /mock/session {id, ...patch}` changes a session live, `POST /mock/fail {expose?, create?, models?,
  prefs?}` makes those calls fail,
  `POST /mock/service {connected}` disconnects the service (create answers 409). `POST /mock/stream {sessionID?,
  kind: "text" | "reasoning", messageID, text}` streams text in chunks; `POST /mock/scenario` plays a run of
  `ses_mock` (reasoning, a shell tool, two subagents streaming output, reply text with `say` in conversation
  mode, then idle).

### Voice feedback (phone)

Pure logic is in `web/src/core/feedback-core.ts` (tested with bun); `web/src/core/cues.ts` plays cues.

- **Voice speed**: 0.75×–2.0× in 0.05 steps, next to "Read replies aloud" and in Settings → Voice
  (default 1.0×, stored per device in `localStorage`). It is applied on the phone as the audio
  element's `playbackRate` with `preservesPitch`, so it changes the reply that is playing right away.
  It is separate from the optional server-side TTS speed in Settings → Speech.
- **Now header**: a sticky line at the top of the session view. While the session or any subagent works it
  shows a spinner, "Working… 12s" (since the run started: status `since`, else when the phone first saw it
  busy) and what is happening: "Thinking", "Running shell · bun test", "Writing reply", "2 subagents
  working" (combined, e.g. "Writing reply · 2 subagents working"). Otherwise "Needs you" or "Idle · last
  activity 2m ago". Screen readers hear only changes of what is happening, not the timer. This works for
  models without reasoning too (e.g. Claude Haiku): status, tools and streamed text drive it.
- **Activity feed**: a collapsible panel below it: a live "Thinking…" block streaming the reasoning text
  (last ~4 lines; More/Less expands it; finished ones stay as "Thought"), tool calls (`▶ shell · bun test` → ✓,
  or ✗ with a short error), and subagents ("Subagent: <title> — working/done") with their latest streamed
  output line and their own steps indented below. It is seeded from `GET /api/sessions/:id` (`activity`), then
  follows SSE `activity`, `reasoning`, `delta` and status trees. Items with the same id update in place; the
  newest are at the bottom, and it keeps about 30. The agent's reply streams into its bubble (one bubble per
  assistant message); in conversation mode the spoken `say` text is merged into the bubble of the same message.
  The home list shows the same "now" text with a spinner for working sessions.
- **Progress cues** (conversation mode; Settings → Voice → "Progress cues", on by default): a soft
  tone as soon as you stop speaking (the moment the segment goes to transcription; typed text gets it when
  the agent receives it), then a short acknowledgement ("On it.", "One moment.", "Let me check." …) if the
  session is working and the agent has not spoken within 2.5 s of the end of your speech. A hand-off phrase
  ("I'll hand that off.", "Getting a helper on it." …) plays when a subagent starts, unless the agent
  spoke in the last 3 s. A still-working phrase ("Still on it.", "Almost there." …) plays after 40 s without
  speech while work continues, and a double tone plays when a subagent finishes. Failed tools are not spoken (they show in the feed). Cues never
  play while you are talking or the agent's speech is playing; they wait, and are dropped once the agent
  speaks. Cues are event-driven: one timer for the next deadline (no polling), re-armed on speech, status and
  playback changes. Each cue has several variants (`CUE_VARIANTS` in `web/src/core/feedback-core.ts`), chosen
  from a shuffle-bag: every variant once before any repeats, never the same phrase twice in a row, and a variant
  whose audio is already loaded wins. All variants are synthesized, 2 at a time, when Voice mode starts (ending Voice mode
  cancels what is left) and kept in memory and in the browser's Cache Storage (`hub-cues-v2`, keyed by TTS provider, model, voice, speed and server, so a later
  session starts with them ready and a voice change fetches them again); a ready phrase starts playing at
  once. A phrase that is not ready yet when its cue fires plays a short tone instead.
- **Cue loudness**: short TTS phrases come out several dB louder or quieter than the spoken replies, so each
  phrase is normalised while it is prefetched (never when it plays): decoded (`OfflineAudioContext`), measured
  (ITU-R BS.1770 K-weighted, gated loudness), trimmed to at most 80 ms of leading/trailing silence, gained to the
  replies' loudness with a look-ahead limiter keeping peaks at or below −1 dBFS, and stored as a 16-bit mono WAV
  (with the target it was normalised to; a target that moved by more than 1 dB re-normalises the cached audio
  without new synthesis). The target is −19.5 LUFS until replies are measured: each completed reply sentence of
  at least 1 s is decoded when the page is idle, and the median of the last 21 per TTS voice
  (`localStorage` `voice.replyLoudness`, clamped to −26…−14 LUFS) becomes the target. Audio that cannot be decoded
  plays as synthesized. Cues and replies keep their plain `<audio>` elements (no Web Audio playback graph, which
  would break background and iOS playback), both at volume 1 and the chosen speed. Pure parts:
  `web/src/core/loudness.ts`; browser decoding: `web/src/voice/cue-loudness.ts`.
- **Presence**: while a session view is open, the phone posts `POST /api/sessions/:id/presence
  {visible}` on visibility changes and every 30 s while visible, and `{visible:false}` on `pagehide` and
  when leaving the view. The hub uses this to decide when to push.
- **Screen off** (Settings → Voice → "Keep listening when screen is off", off by default). Off: the
  Screen Wake Lock keeps the screen on while listening. On: no wake lock. The mic and VAD keep running
  when the page is hidden. A silent looping audio element plays to make suspension less likely. **This is best-effort:** whether
  listening survives a locked screen depends on Android Chrome (battery saver, OS version), and iOS
  suspends it. Android Chrome usually stops the microphone when the screen turns off (the track is muted
  or ended, the AudioContext suspended, no audio frames). Voice mode watches for that: no frames for 1.5 s,
  a muted/ended track or a suspended AudioContext → the Voice bar says "Paused — mic stopped by the phone
  (screen off). Unlock to resume.", the notification becomes "Voice mode paused · unlock to talk", the lock
  screen controls show paused and a short falling tone plays. While hidden it keeps nudging the audio
  (resume every 3 s, the silent loop); it says "listening" again only once audio frames arrive. On unlock
  (visible, `pageshow`, focus, track unmute) it resumes the AudioContext, asks for the microphone again if
  the track ended (or shows "Tap to start Voice mode" when that needs a tap), retries with backoff while
  visible, and plays a rising tone. The OpenCode session keeps running on the laptop either way. When the
  phone is not listening, turn on the `say` notification to get replies as push notifications.
- **"Voice mode on" notification**: while Voice mode is on, the page shows a silent, persistent system
  notification through the service worker (tag `voice-mode`): "<session title> · listening" (thinking,
  speaking, muted; updated at most every 3 s, at once when the phone stops or gives back the microphone) with **End** and **Open**. End reaches the page (which ends
  Voice mode); with no page open, the service worker turns conversation mode off at the hub itself with the
  device cookie. It closes when Voice mode ends or the page goes away. It needs notification permission:
  without it the Voice bar shows **Allow notifications**. The Media Session shows "Voice mode on" with the
  session title on the lock screen while Voice audio plays; its pause and stop end Voice mode (logic in
  `web/src/core/voice-notifier.ts`).
- **Settings → Speech** (your own settings; admins also edit the server default): cards for Speech-to-text and Text-to-speech, with provider
  (OpenRouter / OpenAI-compatible), base URL (OpenAI-compatible only), model, voice (TTS), language (STT,
  optional), server-side speed (TTS, optional, 0.25–4) and API key. Model and voice are buttons that open a
  full-height picker (logic in `web/picker-core.js`): a search box (every word must match the ID or name,
  case- and accent-insensitive; exact ID, then ID prefix, then other matches), the options with the current
  one marked, and "Use “<typed text>”" for any other value. Models come from `GET
  /api/settings/speech/models` (loading, error with Retry, and empty states); voices from `voiceHints` for the
  chosen model's prefix. Arrow keys, Home/End and Enter work in the search box; Escape closes and focus
  returns to the field. (A `<datalist>` was used before; Android Chrome only suggests entries matching the
  current value, so nothing appeared.)
  The key is never shown or prefilled: the card says "Key set ••••last4 (from settings|env)", with
  Replace, and Clear for keys stored in settings. Save sends `PUT /api/settings/speech` with only the
  changed fields: cleared optional fields are `null`, the key is a string to replace it or `null` to
  clear it. Errors show next to each field. "Preview voice" plays `POST /api/settings/speech/test` (the
  saved settings).

## Local only

You don't need a hosted hub: the hub runs fine on the laptop, and speech goes straight from the
laptop to the providers in your config.

1. `/hub` → **On this computer**. If no hub is running, the plugin starts one in the background; the
   first machine is approved by itself, the mode is set, and the hub opens.
2. Speech: on the page (Settings → Speech), or in `~/.config/hub/hub.json` (`chmod 600`;
   examples below).
3. `/voice` / `/hub` → **Open hub in browser** open the page with a one-time sign-in link; no
   pairing needed. To use a phone on the same network, the hub must listen beyond loopback (see notes).

Or run the hub yourself: `scripts/hub-local.sh` (foreground, reads `hub.json`), or keep it running with
the launchd template `scripts/io.github.huynle.hub.plist` (not installed by anything; install steps are
in the file).

### hub.json

`~/.config/hub/hub.json` (or `$HUB_CONFIG`). All fields are optional.

| Field | |
|---|---|
| `host`, `port` | listen address (default `127.0.0.1`, `4097`) |
| `publicURL` | origin used in links (default `http://<host>:<port>`) |
| `stateDir` | hub state (default `~/.local/state/hub`; `~/` is expanded) |
| `speech.stt` | `{provider, model, baseURL?, language?, apiKey?}` |
| `speech.tts` | `{provider, model, voice, baseURL?, speed?, apiKey?}` |
| `auth` | `{mode, issuer?, clientId, clientSecret, allowed, admins}`; see [Multi-user](#multi-user-sign-in-with-google) |
| `cluster` | `{database, valkey}` URLs for cluster mode (env `HUB_DATABASE_URL` / `HUB_VALKEY_URL` win); see [docs/cluster.md](docs/cluster.md) |
| `agents.never` | permission patterns (`action[:glob]`) no agent may ever approve, for every user, checked before any grant; see [Agent actions and grants](#agent-actions-and-grants) |
| `agents.launches` | per-user launch caps `{maxQueued?, maxActive?, perHour?}` (defaults 50, 4, 60); see [docs/launches.md](docs/launches.md#placement-and-caps) |
| `agents.webhooks.allowPrivate` | `true` lets webhooks target `http://`, loopback and private hosts (self-hosted receivers); see [docs/launches.md](docs/launches.md#where-webhooks-may-go) |

Server fields: env vars (`HUB_HOST`, `HUB_PORT`, `HUB_PUBLIC_URL`, `HUB_STATE_DIR`) > hub.json >
defaults. Speech: phone settings > hub.json > env vars. Values are checked like the phone's speech
settings (providers `openrouter` / `openai-compatible`; base URLs `https://…`, or `http://` for
loopback and private-network hosts; speed 0.5–2.0); an invalid file stops the hub with the reason, and
unknown keys are logged. The file must be private: if group or others can read it, its API keys are
ignored and the hub logs `chmod 600 <file>`.

OpenRouter for both directions:

```json
{
  "speech": {
    "stt": { "provider": "openrouter", "model": "openai/gpt-4o-mini-transcribe", "apiKey": "sk-or-v1-…" },
    "tts": { "provider": "openrouter", "model": "openai/gpt-4o-mini-tts", "voice": "nova", "apiKey": "sk-or-v1-…" }
  }
}
```

Local servers with an OpenAI-compatible API (e.g. a Whisper server on :8000 and Kokoro-FastAPI on :8880;
no key needed unless the server asks for one):

```json
{
  "port": 4097,
  "speech": {
    "stt": { "provider": "openai-compatible", "baseURL": "http://127.0.0.1:8000/v1", "model": "whisper-1", "language": "en" },
    "tts": { "provider": "openai-compatible", "baseURL": "http://127.0.0.1:8880/v1", "model": "kokoro", "voice": "af_heart" }
  }
}
```

### Auto-start

When the configured server is loopback (`localhost`, `127.0.0.1`, `[::1]`, http only) and nothing answers
on it, the plugin starts `<this repo>/bin/hub.ts` as a detached background process bound to that
address and port. The runtime (`resolveHubRuntime` in `src/spoke/localhub.ts`): this process when it is
`bun`, else `bun` on `PATH`, else `~/.bun/bin/bun`, else the current executable with `BUN_BE_BUN=1`
(inside OpenCode that is the `opencode` binary, a compiled Bun, so nothing else needs installing). Output is appended to `~/.local/state/hub/hub.log` (`$HUB_STATE_DIR`
if set; a legacy `~/.local/state/opencode-hub`, else `~/.local/state/opencode-voice`, is copied there first). It happens on setup (**On this
computer**, any process), on **Open hub** (even with auto-start
off), and when an enrolled connection is refused:
the shared service process (`--service`) tries at once, other processes after 8 s so the service goes
first. A lock file (`hub.pid`, `{pid, port, started}`) lets only one process start it; a lock whose pid is
gone, or that has not answered for a minute, is replaced. If a hub from the lock answers on another
port, nothing is started (two hubs would share one state). Failed starts are retried after 30 s, then
doubling up to 15 min, and `/hub` shows the reason. Something else answering on the port (any HTTP
reply) is left alone. Servers that are not loopback are never started. Turn it off with
`"autoStartLocalHub": false` in `~/.config/hub/config.json`.

### First machine

A local hub approves the first machine without the approval step only when all of these hold: it listens
on loopback (`host` is `127.0.0.1`, `localhost` or `::1`), its public URL is loopback, the enrollment
request comes from a loopback address without proxy headers (`Forwarded`, `X-Forwarded-*`, `X-Real-IP`),
no machine was ever enrolled and no device paired, and it has not done so before in this run. The hub logs
it. Everything else stays authenticated: loopback is never trusted for the API, devices, or later
machines (a reverse proxy on the same host makes every request look local).

### Notes

- **Switching** between the local hub and a hosted hub: `/hub → Server`. Machine tokens belong to
  one hub, so switching drops the token; `/hub` → **Server** → **Set up again…** reconnects (each hub keeps its own
  machines, devices, and speech settings).
- **One hub per machine at a time** (port and state). Stop a background hub with `kill $(jq .pid
  ~/.local/state/hub/hub.pid)` or `pkill -f bin/hub.ts`.
- The microphone works on `http://localhost` / `127.0.0.1` without https (browsers treat loopback as a
  secure context); web push works on `127.0.0.1` / `localhost` in Chrome.
- Cookies are host-only, so `localhost` and `127.0.0.1` each need their own sign-in; both are accepted
  as origins. Over http no `Secure` flag is set.
- A phone needs the hub on a reachable address (`"host": "0.0.0.0"` plus a `publicURL` the phone can
  open, ideally https, e.g. through Tailscale). Then the first-machine shortcut is off, and phone mic and
  push need https.

## Migrating from opencode-voice or opencode-hub

The project was **opencode-voice** (≤ 0.4), then **opencode-hub** (0.5, `@huynle/opencode-hub` was never
published to npm), and is now **Hub** (0.6): same features, harness-agnostic name. Nothing needs to
change on day one; everything below keeps working, with a one-time warning where noted.

1. Replace the plugin: `opencode plugin add @huynle/hub` (a `github:huynle/hub` install has no built web
   app, so it only suits connecting to a hub that runs elsewhere), remove `@huynle/opencode-voice` or a
   `github:huynle/hub` / `github:huynle/opencode-voice` entry from your OpenCode plugins, and
   `opencode service restart`. `@huynle/opencode-voice` 0.6.0 only re-exports `@huynle/hub` and prints a
   rename notice. There is no `@huynle/opencode-hub` package to replace.
2. Start OpenCode or the hub once: on first start, when the new location does not exist yet, the most
   recent legacy copy is **copied** there: the `opencode-hub` one first, else the `opencode-voice` one
   (file modes such as 0600 kept; the old files are never deleted; one log line each). Explicit paths
   (`HUB_CONFIG`, `HUB_SPOKE_CONFIG`, `HUB_STATE_DIR`, `stateDir` in hub.json, or their legacy names) are
   used as they are, without copying. Stop a running old hub first so its state is copied in a
   consistent state; after checking the new hub, you may remove the old directories yourself.
3. Rename environment variables when convenient. The new name wins when both are set, then the most
   recent legacy name; a legacy name logs `VOICE_X is deprecated; rename it to HUB_X` once (or `… is
   ignored because HUB_X is set`).

| Before (opencode-voice ≤ 0.4) | Before (opencode-hub 0.5) | Now (Hub 0.6) |
|---|---|---|
| npm `@huynle/opencode-voice` | (not published) | `@huynle/hub` |
| `github:huynle/opencode-voice` | `github:huynle/hub` | `github:huynle/hub` |
| plugin ids `opencode-voice` / `opencode-voice.tui` | `opencode-hub` / `opencode-hub.tui` | `hub` / `hub.tui` |
| `/voice` (connection and Voice) | `/hub` (connection), `/voice` (Voice) | `/hub` (connection), `/voice` (Voice) |
| `opencode-voice-hub` command | `opencode-hub` | `hub-server` (`opencode-hub` and `opencode-voice-hub` kept as aliases) |
| binaries `opencode-voice-hub-<os>-<arch>` | `hub-<os>-<arch>` | `hub-<os>-<arch>` |
| image `ghcr.io/huynle/opencode-voice-hub` | `ghcr.io/huynle/hub` | `ghcr.io/huynle/hub` |
| `~/.config/opencode-voice/config.json` (plugin) | `~/.config/hub/config.json` | `~/.config/hub/config.json` (copied) |
| `~/.config/opencode-voice/hub.json` | `~/.config/hub/hub.json` | `~/.config/hub/hub.json` (copied) |
| `~/.local/state/opencode-voice/` (hub state, `hub.log`) | `~/.local/state/hub/` | `~/.local/state/hub/` (copied, without the `hub.pid` lock) |
| `OPENCODE_VOICE_CONFIG` | `OPENCODE_HUB_CONFIG` | `HUB_SPOKE_CONFIG` |
| `VOICE_HUB_CONFIG` | `HUB_CONFIG` | `HUB_CONFIG` |
| `VOICE_HOST`, `VOICE_PORT`, `VOICE_PUBLIC_URL`, `VOICE_STATE_DIR` | `HUB_*` | `HUB_HOST`, `HUB_PORT`, `HUB_PUBLIC_URL`, `HUB_STATE_DIR` |
| `VOICE_AUTH`, `VOICE_OIDC_ISSUER`, `VOICE_OIDC_CLIENT_ID`, `VOICE_OIDC_CLIENT_SECRET`, `VOICE_OIDC_ALLOWED`, `VOICE_ADMIN_EMAILS`, `VOICE_OIDC_INSECURE_ISSUER` | `HUB_*` | `HUB_AUTH`, `HUB_OIDC_ISSUER`, `HUB_OIDC_CLIENT_ID`, `HUB_OIDC_CLIENT_SECRET`, `HUB_OIDC_ALLOWED`, `HUB_ADMIN_EMAILS`, `HUB_OIDC_INSECURE_ISSUER` |
| `VOICE_STT_MODEL`, `VOICE_TTS_MODEL`, `VOICE_VOICE`, `VOICE_MAX_AUDIO_BYTES`, `VOICE_MAX_SPEECH_CHARS`, `VOICE_TURN_TIMEOUT_MS`, `VOICE_VAPID_SUBJECT` | `HUB_*` | `HUB_STT_MODEL`, `HUB_TTS_MODEL`, `HUB_VOICE`, `HUB_MAX_AUDIO_BYTES`, `HUB_MAX_SPEECH_CHARS`, `HUB_TURN_TIMEOUT_MS`, `HUB_VAPID_SUBJECT` |
| dev scripts: `VOICE_SERVE_LOG`, `VOICE_SERVE_PORT`, `VOICE_LOG_LEVEL` | `HUB_*` | `HUB_SERVE_LOG`, `HUB_SERVE_PORT`, `HUB_LOG_LEVEL` |
| launchd `com.opencode-voice.hub` | `com.opencode-hub.hub` | `io.github.huynle.hub` (bootout the old agent first; steps in the plist) |
| RPC id `voice` | `hub` | `hub` (the server also registers `voice`) |
| prompt metadata `source: "opencode-voice"` | `"opencode-hub"` | `"hub"` (readers accept all three) |
| default VAPID subject `mailto:opencode-voice@localhost` | `mailto:hub@localhost` | `mailto:hub@localhost` (existing subscriptions keep working) |

Unchanged: the `voice` agent and conversation mode, the hub's HTTP API and spoke protocol (old and new
spokes and hubs interoperate), device cookies (`voice_device`, `voice_oidc`: nobody is signed out),
`state.json` and `hub.json` contents.

**Docker**: the image sets `HUB_HOST`, `HUB_PORT` and `HUB_STATE_DIR`, which win over `VOICE_HOST`,
`VOICE_PORT` and `VOICE_STATE_DIR`: if you override those on the container, rename them to `HUB_*`. Other
`VOICE_*` variables (e.g. `VOICE_PUBLIC_URL`, OIDC settings) keep working. The state lives in the `/data`
volume, so only the image name changes.

**A new domain** (e.g. moving from `voice.example.com` to `hub.example.com`):

- Set `HUB_PUBLIC_URL` (or `publicURL` in hub.json) to the new origin.
- Sign-in with Google: add `<public URL>/auth/callback` (e.g. `https://hub.example.com/auth/callback`)
  as an authorized redirect URI of the OAuth client (and the origin, if listed). Keep the old URI until
  the move is done.
- Point each machine's plugin at the new URL (`/hub` → **Server**, or `"server"` in
  `~/.config/hub/config.json`). Changing the URL drops the machine token, so approve the machine
  again; keeping the old hostname as a redirect avoids that only for browsers, not for spokes.
- Device cookies belong to a hostname: browsers and phones sign in (or pair) once more on the new domain.

## Development

```sh
git clone https://github.com/huynle/hub && cd hub
npm install         # bun install works too
npm test            # bun test (scripts/test-ci.sh runs each file alone and builds the web app first)
npm run typecheck   # hub and web app
npm run build:web   # web/dist, served by `bun bin/hub.ts`
npm run build:cli   # packages/cli/dist/hub-cli.js, the hub CLI bundle (prepack builds both)
```

Console development: `bun test/web-mock-hub.ts 4311` fakes a hub with fixtures (serves `web/dist`), and
`npm run dev:web` serves the console with hot reload, proxying `/api` to it (`HUB_URL` for a real hub).
`npm run test:e2e` runs a headless Chromium smoke test against the mock hub at desktop and phone sizes
(`CHROMIUM_PATH` if Playwright's browsers are not installed; screenshots go to the temp dir).

`test/e2e-phase2.test.ts` does the same for messaging: the OpenCode spoke (with `deliver`) and a spoke without it,
`hub msg`/`ask`/`mute` as session tokens, replies through the `hub` tool's code path, an app token with the
`messages:*` scopes, `hub mcp` over pipes, a Decision answered on the console route, a second user who cannot see or
answer any of it, the pair rate limit and the messaging switch. The opt-in `HUB_IT_OPENCODE=1 bun test
test/e2e-phase2-live.it.test.ts` connects a private `opencode serve` to a real in-process hub: one session's (stub)
model calls `hub msg` to another session, whose model is then handed the envelope.

`test/e2e-phase3.test.ts` does the same for agent actions: a spoke with `deliver`, `actTokens`, `hubPrompt` and
`permissionMessage` and a raw spoke without them; a grant to `@@orchestrator` used through the `hub` tool's code
path (act token) and an app token's grant through the CLI; shell tokens refused, never patterns (the grant's and
hub.json's), the own-tree ban, `needs_user` escalated to a Decision answered on the console, the user answering
first, both kill switches, the hourly cap, prompts with provenance, deny reasons, grant requests and the audit
(admins see summaries only). `test/central-tenancy.test.ts` checks every phase-3 route and CLI verb across two
users. The opt-in `HUB_IT_OPENCODE=1 bun test test/e2e-phase3-live.it.test.ts` connects a private `opencode serve`
with shell permissions set to ask: session A's (stub) model runs a shell command, session B's model calls `hub
approve` under its grant, and OpenCode runs A's command. `HUB_IT_OPENCODE=1 bun test test/spoke-acting.it.test.ts`
checks hub prompts and deny reasons inside OpenCode.

`test/e2e-phase1.test.ts` (part of `npm test`) runs agent identity end to end in process: a hub, the OpenCode spoke
and a second spoke of another harness, and the `hub` CLI as a session token, an app token, a linked device and a
second user. The opt-in `HUB_IT_OPENCODE=1 bun test test/spoke-env-inject.it.test.ts` starts a private
`opencode serve` (own port, password and XDG dirs) with a local stub model and checks a real shell: its
`HUB_SESSION_TOKEN`, and that `hub whoami` there prints the session. `HUB_IT_OPENCODE=1 bun test
test/spoke-deliver.it.test.ts` does the same for hub messages: the model sees the delivered envelope, a repeated
message id is applied once, `wake: false` waits for the next turn, and inbox deliveries carry their origin. `HUB_IT_OPENCODE=1 bun test test/spoke-hub-tool.it.test.ts` has the stub model call the `hub` tool and checks
that the hub sees the session's token while the model and the transcript never do. `HUB_IT_OPENCODE=1 bun test
test/spoke-prompt-refs.it.test.ts` checks that a prompt naming a session reaches the model unchanged with the
reference note attached, and that hub-sourced prompts get none.

`test/e2e-phase7.test.ts` runs the other harnesses end to end in process (the Claude Code daemon fed fixture hook
inputs, the Codex spoke on a fake shared app-server daemon, a preset on a private tmux server, and claude-code and
codex launches in node worktrees), and `test/e2e-phase7-conformance.test.ts` runs the spoke conformance suite against every shipped spoke
(OpenCode included). The opt-in `HUB_IT_CLAUDE=1 bun test ./packages/claude-code/test/live.it.test.ts` and
`HUB_IT_CODEX=1 bun test ./packages/codex/test/live.it.test.ts` run the real CLIs against the testkit's stub model
with a throwaway `HOME`, `CLAUDE_CONFIG_DIR` / `CODEX_HOME` and a deny-all proxy. A new harness spoke starts from
`bun packages/spoke-sdk/scaffold.ts <name> <dir>`, whose output passes `npx hub-conformance spoke --driver "bun
<dir>/driver.ts"` as written ([docs/spoke-sdk.md](docs/spoke-sdk.md)).

Point a project's `.opencode/opencode.jsonc` at your checkout to try changes:
`{ "plugins": [{ "package": "/path/to/hub" }] }`. If the plugin is also installed globally,
OpenCode keeps the first copy with the same id, so test with `OPENCODE_CONFIG_DIR` pointing at a copy of
your config without the global entry.

Headless loop without a TUI (used for the end-to-end checks):

```sh
HUB_SERVE_LOG=$TMPDIR/hub-serve.log scripts/serve.sh &      # private `opencode serve` on :4199
scripts/oc.sh POST /api/session '{"location":{"directory":"'$PWD'/test-project"}}'
D=$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.path.abspath("test-project"),safe=""))')
scripts/oc.sh POST "/api/rpc/hub/status?directory=$D" '{"input":{}}'
```

Set `HUB_SPOKE_CONFIG` to a temp file for such checks so the real machine config is untouched.

Releasing: bump `version` in `package.json`, add a `CHANGELOG.md` entry, and push a tag `vX.Y.Z`.
`.github/workflows/release.yml` tests, then publishes the binaries with `SHA256SUMS` to the GitHub
Release, `ghcr.io/huynle/hub:<version>` and `:latest`, and `@huynle/hub` to npm through
trusted publishing (OIDC, no token; the trusted publisher is configured for the package on npmjs.com).
`scripts/build-binaries.sh` and `docker build .` do the same locally.

The legacy package `@huynle/opencode-voice` lives in `packages/opencode-voice-shim/` (a re-export of
`@huynle/hub` with a rename notice; not part of the main package and not published by the
workflow). Publish it by hand after `@huynle/hub` of the same version is on npm:
`cd packages/opencode-voice-shim && npm publish --access public`, then
`npm deprecate @huynle/opencode-voice@"<0.6.0" "Renamed to @huynle/hub"`. The interim name
`@huynle/opencode-hub` was never published, so it has no shim. A new package name needs one manual first
publish before trusted publishing can take over (see the comment in `release.yml`).

## Known limits

- Speech-to-text is batch per utterance (on-device voice detection + one request per utterance); no
  streaming STT provider yet.
- Voice detection tells speech from noise, not whose speech it is: a TV or people talking nearby still count
  (Mic sensitivity Low helps; mute or headphones are the sure way).
- The compiled binaries and the Docker image grow by about 14 MB (the speech model and onnxruntime's wasm).
- Questions (forms) of a headless standalone server (`opencode serve --stdio` without its TUI) cannot be
  answered from the hub; the background service, a foreground `opencode serve` and TUI-launched
  standalone servers can.
- Stop on a subagent session's page stops its whole tree (as on the root's page).
- Listening with the phone screen off depends on the browser (best-effort on Android Chrome; not
  possible on iOS). Replies and alerts still arrive as push notifications.
- The voice agent registers as a visible primary agent (`voice`) in OpenCode's agent list.
- A catalog change still sends every machine's full catalog to each stream (about 1 KB per few sessions); the
  replay buffer is in memory (a hub restart means a full catalog + `resync`).
- Running shells are seeded from the spoke's own server (`shell.list` for the 20 most recent session
  directories); shells in other directories show up once they emit an event.
- Claude Code, Codex and presets serve fewer operations than OpenCode (no timeline or summary; Claude Code takes
  hub turns only in sessions the hub launched, and its permission requests race its own dialog); see
  [docs/harnesses.md](docs/harnesses.md#known-limits).

## License

MIT
