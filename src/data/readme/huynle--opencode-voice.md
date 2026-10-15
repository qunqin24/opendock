# OpenCode Hub

A remote console for your [OpenCode](https://opencode.ai) sessions, from your phone or any browser.
Formerly **opencode-voice** ([what changed](#migrating-from-opencode-voice)).

- **Every session, anywhere**: one hub connects all your OpenCode processes and machines. Follow live
  activity (tool calls, thinking, subagents, streamed replies), read the conversation, and get push
  notifications when a session needs you.
- **Remote control**: send a turn (it steers the run while the session is busy), stop a whole session
  tree, answer permissions, switch models, and start new sessions, from the phone.
- **What's open in your terminals first**: sessions open in Herdr or the OpenCode TUI, grouped like
  Herdr's sidebar, with the rest under Recent; pin and hide in sync across devices.
- **Session details**: context usage, todos, MCP status, branch and per-file diffs, on demand; unread
  marks synced per user.
- **Voice (optional)**: dictation and a hands-free conversation mode with a voice agent that answers in
  short spoken sentences on a fast model and hands real work to background subagents. Bring your own
  speech: OpenRouter or any OpenAI-compatible STT/TTS service (including self-hosted).
- **Runs where you want**: a hub on your computer with nothing extra to install, or your own hub for
  phones anywhere, with single-owner pairing or sign-in with Google for several people.

Requires OpenCode v2 (tested with 2.0.25). The hub runs on OpenCode's own runtime, a standalone binary,
Docker, or [Bun](https://bun.sh) ≥ 1.3.

## Quick start

Install the plugin (adds it to your global OpenCode config), then restart the background service so it
loads:

```sh
opencode plugin add @huynle/opencode-hub
opencode service restart
```

Install from npm: the npm package ships the built web app, so the plugin can run a local hub. A GitHub
install (`opencode plugin add github:huynle/opencode-hub`) has no built web app (`web/dist` is not in the
repository): it works for connecting to a hub that runs elsewhere, but a local hub it starts answers 503
until you build the app. To run a hub yourself, use the npm package, a [release binary](#running-the-hub)
or Docker, or run `npm install && npm run build:web` in a source checkout.

Then run **`/hub`** in OpenCode (`/voice` still works as an alias). The first time, it offers **Set up
OpenCode Hub** with two paths.

### Local: everything on this computer

1. `/hub` → **On this computer (local — nothing to install)**. The plugin starts a hub in the background,
   connects this machine (a fresh local hub approves it by itself), shares every session ("On this
   computer, only sessions I choose" shares only sessions you switch on), and opens the hub in your
   browser with a one-time sign-in link.
2. Use it: open any session to follow and steer it. For Voice, set up speech once (Settings → Speech):
   pick a provider and paste its API key (one [OpenRouter](https://openrouter.ai/keys) key covers both
   directions, or point both at your own OpenAI-compatible servers), **Save**, then **Test voice**. Keys
   stay on this computer in `~/.local/state/opencode-hub`.
3. `/hub` → **Talk on this device** opens the current session; **Open hub** opens the home page any time.
   **Conversation** on a session page is the hands-free Voice loop.

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
`~/.config/opencode-hub/config.json`, `/hub` leads with **Connect to hub.example.com**.
`/hub` → **Server** → **Set up again…** switches between local and a hosted hub later.

Optional: put the voice agent on a fast model in `~/.config/opencode-hub/config.json`:
`"voiceModel": "anthropic/claude-haiku-4-5"` (any `provider/model` you have). Subagents keep the
session's model.

## Running the hub

The hub serves the web app, pairs devices, enrolls machines, and does push and (for Voice) speech. Pick one:

| Way | For | How |
|---|---|---|
| **`/hub` → On this computer** | Local use; nothing to install (plugin from npm) | started by the plugin with OpenCode's own runtime (`BUN_BE_BUN=1 opencode bin/hub.ts`), or `bun` when installed |
| **Standalone binary** | Any server or laptop, no runtime needed | `opencode-hub-<os>-<arch>` from the [releases](https://github.com/huynle/opencode-hub/releases) |
| **Docker** | Servers | `ghcr.io/huynle/opencode-hub` (linux/amd64, linux/arm64) |
| **bunx / from source** | Bun users, development | `bunx --package @huynle/opencode-hub opencode-hub` · `bun bin/hub.ts` |

Every way reads the same configuration (env vars over `hub.json`, see [Configuration](#configuration)) and
answers `--help` and `--version`. While no device is paired, the hub logs a pairing code for the first one.

**Standalone binary.** One file per platform with the runtime and the web app embedded:
`opencode-hub-<darwin|linux>-<arm64|x64>` and `opencode-hub-windows-x64.exe`, plus `SHA256SUMS`.

```sh
curl -LO https://github.com/huynle/opencode-hub/releases/latest/download/opencode-hub-linux-x64
curl -LO https://github.com/huynle/opencode-hub/releases/latest/download/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS && chmod +x opencode-hub-linux-x64
HUB_PUBLIC_URL=https://hub.example.com ./opencode-hub-linux-x64
```

On macOS, a downloaded binary is quarantined: `xattr -d com.apple.quarantine opencode-hub-darwin-arm64`.
Build them yourself with `scripts/build-binaries.sh [target…]` (writes `dist/`).

**Docker.**

```sh
docker run -d --name opencode-hub -p 127.0.0.1:4097:4097 -v hub-data:/data \
  ghcr.io/huynle/opencode-hub
docker logs opencode-hub          # the first device's pairing code
```

Without `HUB_PUBLIC_URL` the app is at `http://127.0.0.1:4097`. Behind a reverse proxy, set
`HUB_PUBLIC_URL` to the public origin. Docker Compose:

```yaml
services:
  hub:
    image: ghcr.io/huynle/opencode-hub:latest
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
`docker build -t opencode-hub .`.

**bunx / from source.** `bunx --package @huynle/opencode-hub opencode-hub` (needs Bun ≥ 1.3), or in
a checkout: `npm install --no-audit --no-fund && bun bin/hub.ts`. `scripts/hub-local.sh` runs it in the
foreground with `hub.json`; `scripts/com.opencode-hub.hub.plist` is a launchd template. The
`opencode-voice-hub` command still works as an alias of `opencode-hub`.

**Security:** the hub can drive your OpenCode sessions, which can run tools. Every API call needs a
paired device or a signed-in user; spokes need machine tokens; nothing trusts the client IP. For a public
hostname, consider [sign-in with Google](#multi-user-sign-in-with-google) or an authenticating proxy in
front of the web app, and leave `/spoke/*`, `/auth/*`, `/healthz`, the manifest and icons reachable for
spokes, sign-in and the PWA.

## Configuration

- **Hub**: env vars (`HUB_HOST`, `HUB_PORT`, `HUB_PUBLIC_URL`, `HUB_STATE_DIR`, `OPENROUTER_API_KEY`, …)
  over `~/.config/opencode-hub/hub.json` (`$HUB_CONFIG`); see [Central server](#central-server) and
  [hub.json](#hubjson). Speech providers and keys are easiest to set in the app (Settings → Speech).
- **Plugin**: `~/.config/opencode-hub/config.json` (`$OPENCODE_HUB_CONFIG`; server, mode, machine token,
  voice model…), written by `/hub`; see [Spoke](#spoke-opencode-plugin).
- The former `VOICE_*` / `OPENCODE_VOICE_*` names and `opencode-voice` directories still work; see
  [Migrating from opencode-voice](#migrating-from-opencode-voice).

## How it works

The hub serves the web app, push and (for Voice) speech. The OpenCode plugin ("spoke") runs in every
OpenCode process (the background service and each `opencode --standalone`), connects **outbound** to the
hub over a WebSocket, lists sessions, forwards compact events, and runs prompts, stops and permission
replies on the hub's request.

## Remote console (hub API)

Every session a connected process of yours reports can be inspected and controlled; Voice only gates
conversation mode and utterances (403 `not_exposed` for sessions not shared with Voice in `session` mode).

| Route | Result |
|---|---|
| `POST /api/sessions/:id/turn {text}` | sends a turn; while the session tree is running it steers instead. Answers `{mode: "turn" \| "steer"}`. 400 empty or over 100,000 characters; 409 "A turn is already running for this session" |
| `POST /api/sessions/:id/stop` | interrupts running descendants deepest first, then the root; idempotent. Also releases the hub's turn lock for the tree: a turn request still waiting answers `{outcome: "interrupted"}` and the next turn can start (`/interrupt` does the same) |
| `GET /api/sessions/:id/summary` | context usage, todos, MCP status (at most 100 servers), branch and working-tree change stats (each part optional). `changes` lists at most 500 files, most-changed first, with `totalFiles` and `truncated`; its `additions`/`deletions` cover every file |
| `GET /api/sessions/:id/diff?file=` | one file's patch, on demand (capped at 400 KB as JSON, then `truncated: true`); never stored in the hub |
| `POST /api/sessions/:id/read` · `GET /api/reads` | per-user read marks, synced to your other devices |

## Spoke (OpenCode plugin)

The plugin is a thin client ("spoke") of the hub. Every OpenCode process that loads
it opens **one** outbound WebSocket (`/spoke/ws`, protocol in `src/protocol.ts`), lists the sessions it
knows, forwards their events, and runs turns, stops and permission replies on the hub's request.
The web app, speech and phones live on the hub.

| Entry | File | Role |
|---|---|---|
| server | `server.ts` → `src/index.ts` | Starts the process-wide spoke (`src/spoke/`), `hub.*` RPC (also under the legacy id `voice.*`), the `voice` agent, short-reply and orchestrator `context` hook |
| tui | `tui.ts` → `src/tui.ts` | `/hub` dialog (alias `/voice`); reports the sessions it shows (`hub.presence`) |
| rpc | `rpc.ts` → `src/rpc.ts` | `HubRpc` (id `hub`; `VoiceRpc` is the deprecated id `voice`): `status / setServer / checkServer / enroll / startLocalHub / setMode / setSession / pairCode / handoff / openLink / conversation / presence` |

OpenCode resolves a local plugin directory as `<dir>/server`, `<dir>/tui` and `<dir>/rpc` (`package.json`
`main` is ignored), and an installed package through its `exports` (`./server`, `./tui`, `./rpc`).

- **Config**: `~/.config/opencode-hub/config.json` (or `$OPENCODE_HUB_CONFIG`), shared by all
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
- **/hub** (alias **/voice**): before this machine is enrolled (or after the hub revoked it), **Set up
  OpenCode Hub**: On this computer (local hub, every session or only chosen ones), Connect to a hub… (URL
  checked with `hub.checkServer`, i.e. `GET <url>/healthz`, then device-code approval in the browser), or Not now; a
  configured remote server comes first as "Connect to <host>". The decisions are pure functions in
  `src/setup.ts`. Once set up: Talk on this device, Open hub (home page via a one-time sign-in link;
  starts a local hub first when it is down, `hub.startLocalHub`), Send to phone, Conversation mode on/off,
  This session on/off, Mode, Pair a phone, and Server (Set up again…).
- **One-time links** (`hub.openLink`, `sessionID` optional): `<hub>/login?code=…&next=/s/<id>` or `next=/`.
  While speech is not usable (see `ready` below) the hub redirects to `<next>#speech`, and the page opens
  Settings → Speech.
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
a fresh one.

The phone composer exposes separate **Voice** and **Worker** model controls for each session. Each picker
lists the connected OpenCode process's available models and variants. Choices are saved per user and
session, apply to the next turn or newly started worker, and fall back to the machine's `voiceModel` and
`workModel` when unset.

The conversation is an inline execution timeline: streamed thinking, tools and nested subagents appear
between messages as compact expandable rows. Reopening a session pages its projected message history from
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
- Child text and execution events are paired by the hub. The latest assistant message of a successful
  child is emitted as root-session speech; failures, interruptions and stale partial results are not.
- Server ops: `steer` sends the text with `delivery: "steer"` (metadata `{source: "opencode-hub", mode:
  "conversation"}`, or `mode: "remote"` for a session not shared with Voice; 0.4 and earlier wrote
  `source: "opencode-voice"`, and readers accept both) and returns the inbox ID at once; `interrupt`
  interrupts the session; `conversation` turns the mode on/off and returns the agent now in effect, and
  is refused for sessions not shared with Voice. Replies reach the hub as forwarded
  `session.text.ended`, `session.inbox.delivered` and `session.agent.selected` events.
- State is per process and in memory; the hub re-sends `conversation on` after a reconnect.
- From the terminal: `/hub → Conversation mode` toggles it for the current session (same code path),
  then offers to send the session to your phone.

## Central server

The hub (`bin/hub.ts`, `src/central/`) serves the web app, pairs devices, enrolls machines, routes turns
to the right OpenCode process, does speech for Voice, and sends web push notifications.

See [Running the hub](#running-the-hub) for the binaries, the Docker image and bunx. `src/central/main.ts`
holds the startup (`bin/hub.ts` serves `web/` from disk; the compiled binaries embed it through
`src/central/assets.ts`, generated entry `scripts/gen-web-entry.ts`).

| Env | Default | |
|---|---|---|
| `HUB_CONFIG` | `~/.config/opencode-hub/hub.json` | optional config file ([Local only](#local-only)); env vars win over it |
| `HUB_AUTH` | `pairing` | `oidc` for several users signing in with Google; see [Multi-user](#multi-user-sign-in-with-google) |
| `HUB_HOST` / `HUB_PORT` | `127.0.0.1` / `4097` | listen address |
| `HUB_PUBLIC_URL` | `http://<host>:<port>` (`http://127.0.0.1:<port>` when the host is `0.0.0.0` / `::`) | origin used in links, cookies and CSRF checks |
| `HUB_STATE_DIR` | `~/.local/state/opencode-hub` | `state.json` (0600): users, machines and devices (token hashes only) with their owners, VAPID keys, push subscriptions, speech settings (server default and per user; provider API keys set from the phone), the audit log (last 500 entries) |
| `HUB_TURN_TIMEOUT_MS` | `600000` | the hub waits this + 15 s so the spoke's own timeout result arrives first |
| `HUB_VAPID_SUBJECT` | the https public URL, else `mailto:opencode-hub@localhost` | contact sent to push services |
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

`web/` is the OpenCode Hub console, a Solid + Vite + TypeScript PWA built to `web/dist` (`npm run build:web`;
the Docker image, npm package and binaries ship the build). One store fed by the hub's SSE stream drives:

- **Sidebar** (⌘B collapses; a drawer on phones): search, New session, Needs you, Running, Pinned, sessions open in a
  terminal grouped by project (or server) with `+`, Recents; rows show status, Voice, an unread dot and a `⋯` menu
  (pin, hide, stop, Voice on/off).
- **`/`**: All sessions as a sortable, filterable table (a list on phones); filters and sort are kept per device.
- **`/s/<id>`**: the transcript (markdown replies, "Thought for Ns", "Used N tools" with full details on demand,
  subagent rows linking to their sessions), permission cards, and the composer: Send while idle, Steer while the
  session tree runs, Stop for the whole tree, Dictate, Voice mode (hands-free, see below; turns Voice on first when
  needed) with a microphone picker, and the Voice/Worker model menus. The right rail (a bottom sheet on phones) shows
  the server, branch, context use, MCP servers and changed files with a diff viewer. Every session works with Voice
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
  All · Active · Needs you · Today · Voice on · Enabled. Groups that are pinned, active, blocked or changed
  within a day start open; only open groups render rows, 50 at a time ("Show more"). A **Standalone**
  section lists standalone processes.
- **Hidden**: hidden workspaces (with how many sessions they hide) and hidden sessions, each with Unhide.
- **Menus**: ⋯ on a row (or long-press / right-click it): Open, Pin to top / Unpin, Hide / Unhide. ⋯ on a
  group: New session here, Pin / Unpin workspace, Hide / Unhide workspace (and Collapse / Expand in
  Recent). Hiding a workspace hides the sessions in it: a Herdr workspace (`herdr:<id>`), a project
  folder, or a nested folder such as a worktree.
- **Synced view settings**: pins and hides are per user on the hub (`GET`/`PUT /api/prefs/view`), shown at
  once, reverted with a message if the hub refuses, with Undo after a hide. Other devices update live
  (SSE `prefs`). Pins from 0.3 (stored on the device) are moved into them once. With an older hub
  without `/api/prefs/view`, they stay on the device. Open/closed groups and the filter stay per device.
- **Voice off** sessions (`exposed: false`, mode `session`) open, show their status and live activity, and
  take Send, Steer, Stop and permission replies like any other session. Only Voice is off: the row's ⋯
  menu has **Turn Voice on** (`POST /api/sessions/:id/expose {on:true}`; shown at once, reverted on
  error), and Voice mode on such a session turns Voice on first.
- **New session** (+ in the header, + on any group, or a group's ⋯ menu): machine (when several are
  online), workspace (Herdr workspaces first, then known folders), folder (a Herdr workspace's pane
  folders, most used first), optional title, and **Open in Herdr** (shown when the machine runs Herdr; on
  by default for a Herdr workspace). Sends `POST /api/machines/:id/sessions {directory, title?,
  herdrWorkspace?}`; the new session opens with an offer to start conversation mode. "Opened in Herdr ·
  <workspace>" confirms the new tab; if Herdr failed, the session still exists and the hub's `warning`
  is shown. 409 (background service not connected) is shown in the sheet.

**Notifications** (web push, VAPID keys generated once and stored in the state file): hand-offs from the
terminal and blocked sessions are on by default, "finished" (a root session's run succeeded or failed,
except voice turns started from the page) is opt-in per device. Payloads are `{kind, sessionID, title,
body}` with a short title only (e.g. "api-server needs permission"); at most one per session and kind
every 30 s; expired subscriptions (404/410) are pruned. "Read agent replies as notifications when the phone is locked"
(push pref `say`) is opt-in per device: the hub pushes spoken replies while no phone shows the session.

- **Android (Chrome)**: open the public URL, pair, tap the bell (Enable notifications). Use Chrome's
  "Add to Home screen"/"Install app" for a standalone window.
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
opencode-hub
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
| `GET /api/prefs/view` | – | `{prefs: {hiddenSessions, hiddenWorkspaces, pinnedSessions, pinnedWorkspaces}}`, the caller's view preferences (pairing mode: the single user) |
| `PUT /api/prefs/view {any of the four lists}` | – | Replaces the lists given (each ≤ 500 non-empty strings of ≤ 4096 characters, duplicates dropped; other keys 400). Stored on the user record; SSE `{type: "prefs", prefs}` goes to the user's other devices (never to other users, not to the device that changed them) |

For a session reported only with `exposed: false`, `utterance` and `conversation` answer
`403 {error: "Voice is not enabled for this session", code: "not_exposed"}`; inspecting and controlling it
(timeline, turn, stop, interrupt, permission and form replies, models, context) works as for any other
session.

## Conversation mode (hub and phone)

### Hub API

All routes need the device cookie; POSTs also need a same-origin `Origin` (or `Referer`). Every
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

The hub keeps the conversation flag per session in memory. When a process sends a sessions snapshot,
owns a session in conversation mode, and was not told yet (it reconnected or took over ownership), the
hub sends it `{op: "conversation", on: true}` once. Deleting the session clears the flag.

SSE (`/api/events`) adds:

- `{type: "conversation", sessionID, on}` when the flag changes.
- `{type: "say", sessionID, messageID, ordinal, text}` for each `session.text.ended` of a **root** session
  in conversation mode (subagent text is not spoken); deduped by `(messageID, ordinal)` across
  processes; blank text is skipped.
- `{type: "heard", sessionID, inboxID}` when OpenCode delivers an utterance's inbox item (also when the
  delivery event arrives before the steer result).
- `{type: "activity", sessionID, rootID, item}` when an activity item is created or changes state, for
  every session (all of the owner's devices see it, like `status`). `item` is `{id, sessionID, kind: "tool" | "thinking",
  tool?, summary?, background?, state: "running" | "done" | "failed", error?, at}`; `sessionID` is where it
  happened (a subagent session maps to its root `rootID`). The hub keeps the 30 most recent items per
  root (in memory) and returns them, newest last, as `activity` in `GET /api/sessions/:id`. Spokes forward
  tool and reasoning events in compact form (`compactActivity`): tool name, a one-line summary of the
  input (command, path, pattern…), ok/error; never file contents or outputs. Thinking items close on
  `session.reasoning.ended`, when the next activity in that session starts, or when its run ends.
- `{type: "delta", sessionID, rootID, messageID?, text}` (assistant text) and `{type: "reasoning", sessionID,
  rootID, messageID?, delta}` (reasoning text; spokes cut each delta to 2000 chars and never forward the full
  text of `session.reasoning.ended`) for root **and** subagent sessions. Per session they are coalesced to at
  most one send per 100 ms (the first delta goes out at once, later ones in the window are joined); anything
  else in that session (e.g. the `say` for that text) is sent only after its held text.
- `status` entries of working sessions carry `since` (ms epoch the current run started), also in the catalog
  and `GET /api/sessions/:id`.

Pushes in conversation mode depend on presence: while the session is watched, "finished" is not sent
(the phone is open and speaking). When nobody watches, "finished" is sent as usual and each spoken text
of the root session is pushed as kind `say` (title = session title, body = the text, max 180 chars; at
most one every 10 s per session; on by default, pref `say`). "blocked" is always sent. `/api/transcribe` and `/api/speak` have no rate limit; `/api/speak` accepts up to
`HUB_MAX_SPEECH_CHARS` per call, so the phone sends sentence-sized chunks.

### Speech settings

STT and TTS each use a provider configured from the phone (Settings → Speech) and stored in
`state.json`. Precedence, per direction and field: phone settings > `hub.json` `speech` > the environment
(`OPENROUTER_API_KEY`, `HUB_STT_MODEL`, `HUB_TTS_MODEL`, `HUB_VOICE`). When the phone picks another
provider than `hub.json`, the file's section is ignored for that direction; when it picks another base
URL, the file's key is not sent there. Providers:

- `openrouter` (default, base `https://openrouter.ai/api/v1`): STT is JSON with base64 `input_audio`,
  TTS is `POST /audio/speech`.
- `openai-compatible` (`baseURL` required: `https://…`, or `http://localhost` / `127.0.0.1` for local
  servers): STT is multipart `POST {baseURL}/audio/transcriptions` (`file`, `model`, `language?`), TTS is
  `POST {baseURL}/audio/speech {model, input, voice, response_format: "mp3", speed?}`. No env key.

A TTS `speed` (0.5–2.0) is sent when set; a provider that answers 400 gets one retry without it.

| Route | Result |
|---|---|
| `GET /api/settings/speech` | `{stt: {provider, model, baseURL?, language?, apiKey}, tts: {provider, model, voice, baseURL?, speed?, apiKey}, voiceHints, ready}`. `apiKey` is `{set, last4?, source: "settings" \| "config" \| "env" \| "none"}` (`config`: hub.json); a key is never returned. `voiceHints` maps model ID prefixes to known voices. `ready` is `{stt, tts, reason?}`: a direction is usable when `openrouter` has a key or `openai-compatible` has a base URL; `reason` says what is missing. The page shows a **Set up speech** card (home and session view) until both are ready, and the mic opens speech settings instead of recording while STT is not usable |
| `PUT /api/settings/speech {stt?, tts?}` | partial update, answers like GET. `apiKey`: string sets, `null` clears, absent keeps; changing `provider` or `baseURL` without a new key drops the stored one. 400 for unknown providers, names over 200 chars, bad URLs, speed outside 0.5–2.0, `openai-compatible` without `baseURL` |
| `GET /api/settings/speech/models?kind=stt\|tts` | `[{id, name}]`. OpenRouter: its model list filtered by output modality (`transcription` / `speech`), cached 10 min, 502 when unreachable. OpenAI-compatible: `GET {baseURL}/models`, `[]` on any failure |
| `POST /api/settings/speech/test {kind: "tts", text?}` | `audio/mpeg` preview with the current settings (text capped at 300 chars). `kind: "stt"` is 501 |

Writes need the same-origin `Origin`. Provider failures are 502 with the provider's message.

### Conversation mode (phone)

On `/s/<id>`, the **Conversation** button next to the mic starts hands-free mode. It turns on the mic
(echo cancellation, noise suppression and auto gain on), then calls `POST …/conversation {on:true}`, keeps
the screen awake (Screen Wake Lock, taken again when the page becomes visible) and shows a level ring
around the mic with the current state: Listening, Hearing you, Transcribing, Sent ✓ and Speaking. Tap
it again, say "pause listening", or leave the page to turn it off. Leaving the page calls
`{on:false}` with `keepalive`. While conversation mode is off, tap-to-talk works as before.

- **VAD** (`web/conversation-core.js`, frames from `web/vad-worklet.js`, with a ScriptProcessor fallback):
  energy-based detection on about 20 ms frames. The noise floor falls fast and rises slowly, and the
  threshold is 10 dB above it with 4 dB of hysteresis. Speech must last 250 ms to count, and 300 ms of
  audio before it is kept. The threshold rises by 8 dB while the phone is speaking.
- **Endpointing**: a segment ends after 550 ms of silence. It is encoded to 16 kHz mono 16-bit WAV
  and sent to `/api/transcribe` at once. A transcript that reads as complete is sent right away:
  it ends in `. ? !`, or has 3+ words and doesn't end in "and", "but", "so", "um", "the" and the like.
  Otherwise it waits up to 1.5 s. If you speak again during the wait, the next segment's transcript
  is joined to it. Empty and filler-only transcripts are dropped. Utterances are capped at 60 s.
- **Commands**: an utterance that is only "stop", "cancel", "never mind", "stop that" or "hold on"
  calls `POST …/interrupt` and stops speech. "Pause listening" turns the mode off.
- **Speech out**: each SSE `say` is split into sentences. Abbreviations, decimals, file names and
  list items are handled, and fenced code becomes "(code omitted)". Each sentence goes to `/api/speak`,
  one ahead of playback, and plays through one `<audio>` element. Speech that lasts 250 ms or more
  (barge-in) pauses playback and clears the queue. The transcript shows your utterances with ✓ (sent)
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
  tone when the agent hears an utterance, then "Working on it." if the session is working and the
  agent has not spoken within 5 s. "Started a subagent." plays when a subagent starts, unless the agent
  spoke in the last 3 s. "Still working." plays after 40 s without speech while work continues, and
  a double tone plays when a subagent finishes. Failed tools are not spoken (they show in the feed). Cues never
  play while you are talking or the agent's speech is playing; they wait, and are dropped once the agent
  speaks. Each phrase is synthesized once per page load and cached in memory.
- **Presence**: while a session view is open, the phone posts `POST /api/sessions/:id/presence
  {visible}` on visibility changes and every 30 s while visible, and `{visible:false}` on `pagehide` and
  when leaving the view. The hub uses this to decide when to push.
- **Screen off** (Settings → Voice → "Keep listening when screen is off", off by default). Off: the
  Screen Wake Lock keeps the screen on while listening. On: no wake lock. The mic and VAD keep running
  when the page is hidden. The lock screen shows media controls (`navigator.mediaSession`: session
  title, "OpenCode Voice"); pause stops listening (mic muted, speech cleared) and play resumes. A
  silent looping audio element plays to make suspension less likely. **This is best-effort:** whether
  listening survives a locked screen depends on Android Chrome (battery saver, OS version), and iOS
  suspends it. The OpenCode session keeps running on the laptop either way. When the phone is not
  listening, turn on the `say` notification to get replies as push notifications.
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
2. Speech: on the page (Settings → Speech), or in `~/.config/opencode-hub/hub.json` (`chmod 600`;
   examples below).
3. `/hub → Talk on this device` / **Open hub** open the page with a one-time sign-in link; no
   pairing needed. To use a phone on the same network, the hub must listen beyond loopback (see notes).

Or run the hub yourself: `scripts/hub-local.sh` (foreground, reads `hub.json`), or keep it running with
the launchd template `scripts/com.opencode-hub.hub.plist` (not installed by anything; install steps are
in the file).

### hub.json

`~/.config/opencode-hub/hub.json` (or `$HUB_CONFIG`). All fields are optional.

| Field | |
|---|---|
| `host`, `port` | listen address (default `127.0.0.1`, `4097`) |
| `publicURL` | origin used in links (default `http://<host>:<port>`) |
| `stateDir` | hub state (default `~/.local/state/opencode-hub`; `~/` is expanded) |
| `speech.stt` | `{provider, model, baseURL?, language?, apiKey?}` |
| `speech.tts` | `{provider, model, voice, baseURL?, speed?, apiKey?}` |
| `auth` | `{mode, issuer?, clientId, clientSecret, allowed, admins}`; see [Multi-user](#multi-user-sign-in-with-google) |

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
(inside OpenCode that is the `opencode` binary, a compiled Bun, so nothing else needs installing). Output is appended to `~/.local/state/opencode-hub/hub.log` (`$HUB_STATE_DIR`
if set; a legacy `~/.local/state/opencode-voice` is copied there first). It happens on setup (**On this
computer**, any process), on **Open hub** (even with auto-start
off), and when an enrolled connection is refused:
the shared service process (`--service`) tries at once, other processes after 8 s so the service goes
first. A lock file (`hub.pid`, `{pid, port, started}`) lets only one process start it; a lock whose pid is
gone, or that has not answered for a minute, is replaced. If a hub from the lock answers on another
port, nothing is started (two hubs would share one state). Failed starts are retried after 30 s, then
doubling up to 15 min, and `/hub` shows the reason. Something else answering on the port (any HTTP
reply) is left alone. Servers that are not loopback are never started. Turn it off with
`"autoStartLocalHub": false` in `~/.config/opencode-hub/config.json`.

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
  ~/.local/state/opencode-hub/hub.pid)` or `pkill -f bin/hub.ts`.
- The microphone works on `http://localhost` / `127.0.0.1` without https (browsers treat loopback as a
  secure context); web push works on `127.0.0.1` / `localhost` in Chrome.
- Cookies are host-only, so `localhost` and `127.0.0.1` each need their own sign-in; both are accepted
  as origins. Over http no `Secure` flag is set.
- A phone needs the hub on a reachable address (`"host": "0.0.0.0"` plus a `publicURL` the phone can
  open, ideally https, e.g. through Tailscale). Then the first-machine shortcut is off, and phone mic and
  push need https.

## Migrating from opencode-voice

opencode-voice 0.5.0 is **OpenCode Hub**: same features, Voice optional. Nothing needs to change on
day one; everything below keeps working with a one-time warning where noted.

1. Replace the plugin: `opencode plugin add @huynle/opencode-hub` (a `github:huynle/opencode-hub` install
   has no built web app, so it only suits connecting to a hub that runs elsewhere),
   remove `@huynle/opencode-voice` from your OpenCode plugins, and `opencode service restart`. The final
   `@huynle/opencode-voice` 0.5.0 only re-exports `@huynle/opencode-hub` and prints a rename notice.
2. Start OpenCode or the hub once: on first start, the legacy files are **copied** (file modes such as
   0600 kept; the old files are never deleted; one log line each) when the new location does not exist
   yet. Explicit paths (`HUB_CONFIG`, `OPENCODE_HUB_CONFIG`, `HUB_STATE_DIR`, `stateDir` in hub.json, or
   their legacy names) are used as they are, without copying. Stop a running opencode-voice hub first so
   its state is copied in a consistent state; after checking the new hub, you may remove the old
   directories yourself.
3. Rename environment variables when convenient. The new name wins when both are set; a legacy name logs
   `VOICE_X is deprecated; rename it to HUB_X` once (or `… is ignored because HUB_X is set`).

| Before (opencode-voice) | Now (OpenCode Hub) |
|---|---|
| npm `@huynle/opencode-voice` | `@huynle/opencode-hub` |
| `opencode plugin add github:huynle/opencode-voice` | `github:huynle/opencode-hub` |
| `/voice` | `/hub` (`/voice` kept as an alias) |
| `opencode-voice-hub` command | `opencode-hub` (`opencode-voice-hub` kept as an alias) |
| binaries `opencode-voice-hub-<os>-<arch>` | `opencode-hub-<os>-<arch>` |
| image `ghcr.io/huynle/opencode-voice-hub` | `ghcr.io/huynle/opencode-hub` |
| `~/.config/opencode-voice/config.json` (plugin) | `~/.config/opencode-hub/config.json` (copied) |
| `~/.config/opencode-voice/hub.json` | `~/.config/opencode-hub/hub.json` (copied) |
| `~/.local/state/opencode-voice/` (hub state, `hub.log`) | `~/.local/state/opencode-hub/` (copied, without the `hub.pid` lock) |
| `OPENCODE_VOICE_CONFIG` | `OPENCODE_HUB_CONFIG` |
| `VOICE_HUB_CONFIG` | `HUB_CONFIG` |
| `VOICE_HOST`, `VOICE_PORT`, `VOICE_PUBLIC_URL`, `VOICE_STATE_DIR` | `HUB_HOST`, `HUB_PORT`, `HUB_PUBLIC_URL`, `HUB_STATE_DIR` |
| `VOICE_AUTH`, `VOICE_OIDC_ISSUER`, `VOICE_OIDC_CLIENT_ID`, `VOICE_OIDC_CLIENT_SECRET`, `VOICE_OIDC_ALLOWED`, `VOICE_ADMIN_EMAILS`, `VOICE_OIDC_INSECURE_ISSUER` | `HUB_AUTH`, `HUB_OIDC_ISSUER`, `HUB_OIDC_CLIENT_ID`, `HUB_OIDC_CLIENT_SECRET`, `HUB_OIDC_ALLOWED`, `HUB_ADMIN_EMAILS`, `HUB_OIDC_INSECURE_ISSUER` |
| `VOICE_STT_MODEL`, `VOICE_TTS_MODEL`, `VOICE_VOICE`, `VOICE_MAX_AUDIO_BYTES`, `VOICE_MAX_SPEECH_CHARS`, `VOICE_TURN_TIMEOUT_MS`, `VOICE_VAPID_SUBJECT` | `HUB_STT_MODEL`, `HUB_TTS_MODEL`, `HUB_VOICE`, `HUB_MAX_AUDIO_BYTES`, `HUB_MAX_SPEECH_CHARS`, `HUB_TURN_TIMEOUT_MS`, `HUB_VAPID_SUBJECT` |
| dev scripts: `VOICE_SERVE_LOG`, `VOICE_SERVE_PORT`, `VOICE_LOG_LEVEL` | `HUB_SERVE_LOG`, `HUB_SERVE_PORT`, `HUB_LOG_LEVEL` |
| launchd `com.opencode-voice.hub` | `com.opencode-hub.hub` (bootout the old agent first; steps in the plist) |
| RPC id `voice` | `hub` (the server registers both) |
| prompt metadata `source: "opencode-voice"` | `"opencode-hub"` (readers accept both) |

Unchanged: the `voice` agent and conversation mode, the hub's HTTP API and spoke protocol (old and new
spokes and hubs interoperate), device cookies, `state.json` and `hub.json` contents.

**Docker**: the image sets `HUB_HOST`, `HUB_PORT` and `HUB_STATE_DIR`, which win over `VOICE_HOST`,
`VOICE_PORT` and `VOICE_STATE_DIR`: if you override those on the container, rename them to `HUB_*`. Other
`VOICE_*` variables (e.g. `VOICE_PUBLIC_URL`, OIDC settings) keep working.

**A new domain** (e.g. moving from `voice.example.com` to `hub.example.com`):

- Set `HUB_PUBLIC_URL` (or `publicURL` in hub.json) to the new origin.
- Sign-in with Google: add `<public URL>/auth/callback` (e.g. `https://hub.example.com/auth/callback`)
  as an authorized redirect URI of the OAuth client (and the origin, if listed). Keep the old URI until
  the move is done.
- Point each machine's plugin at the new URL (`/hub` → **Server**, or `"server"` in
  `~/.config/opencode-hub/config.json`). Changing the URL drops the machine token, so approve the machine
  again; keeping the old hostname as a redirect avoids that only for browsers, not for spokes.
- Device cookies belong to a hostname: browsers and phones sign in (or pair) once more on the new domain.

## Development

```sh
git clone https://github.com/huynle/opencode-hub && cd opencode-hub
npm install         # bun install works too
npm test            # bun test (scripts/test-ci.sh runs each file alone and builds the web app first)
npm run typecheck   # hub and web app
npm run build:web   # web/dist, served by `bun bin/hub.ts`
```

Console development: `bun test/web-mock-hub.ts 4311` fakes a hub with fixtures (serves `web/dist`), and
`npm run dev:web` serves the console with hot reload, proxying `/api` to it (`HUB_URL` for a real hub).
`npm run test:e2e` runs a headless Chromium smoke test against the mock hub at desktop and phone sizes
(`CHROMIUM_PATH` if Playwright's browsers are not installed; screenshots go to the temp dir).

Point a project's `.opencode/opencode.jsonc` at your checkout to try changes:
`{ "plugins": [{ "package": "/path/to/opencode-hub" }] }`. If the plugin is also installed globally,
OpenCode keeps the first copy with the same id, so test with `OPENCODE_CONFIG_DIR` pointing at a copy of
your config without the global entry.

Headless loop without a TUI (used for the end-to-end checks):

```sh
HUB_SERVE_LOG=$TMPDIR/hub-serve.log scripts/serve.sh &      # private `opencode serve` on :4199
scripts/oc.sh POST /api/session '{"location":{"directory":"'$PWD'/test-project"}}'
D=$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.path.abspath("test-project"),safe=""))')
scripts/oc.sh POST "/api/rpc/hub/status?directory=$D" '{"input":{}}'
```

Set `OPENCODE_HUB_CONFIG` to a temp file for such checks so the real machine config is untouched.

Releasing: bump `version` in `package.json`, add a `CHANGELOG.md` entry, and push a tag `vX.Y.Z`.
`.github/workflows/release.yml` tests, then publishes the binaries with `SHA256SUMS` to the GitHub
Release, `ghcr.io/huynle/opencode-hub:<version>` and `:latest`, and `@huynle/opencode-hub` to npm through
trusted publishing (OIDC, no token; the trusted publisher is configured for the package on npmjs.com).
`scripts/build-binaries.sh` and `docker build .` do the same locally.

The legacy package `@huynle/opencode-voice` lives in `packages/opencode-voice-shim/` (a re-export of
`@huynle/opencode-hub` with a rename notice; not part of the main package and not published by the
workflow). Publish it by hand after `@huynle/opencode-hub` of the same version is on npm:
`cd packages/opencode-voice-shim && npm publish --access public`, then
`npm deprecate @huynle/opencode-voice@"<0.5.0" "Renamed to @huynle/opencode-hub"`.

## Known limits

- Speech-to-text is batch per utterance (on-device voice detection + one request per utterance); no
  streaming STT provider yet.
- Voice detection is a simple energy detector; noisy rooms may need tuning.
- Questions (forms) are shown on the page but must be answered in the terminal.
- Listening with the phone screen off depends on the browser (best-effort on Android Chrome; not
  possible on iOS). Replies and alerts still arrive as push notifications.
- The voice agent registers as a visible primary agent (`voice`) in OpenCode's agent list.

## License

MIT
