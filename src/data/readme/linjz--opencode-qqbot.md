# OpenCode QQ Bot

[English](README.md) | [简体中文](README.zh-CN.md)

Talk to [OpenCode](https://opencode.ai) — the open-source AI coding agent — through QQ. Monitor desktop sessions from your phone, launch tasks remotely, approve permission requests and answer form prompts right in QQ, with two-way images and voice, and long tasks that never lose their answers.

Built for production, not just message bridging: a self-healing watchdog, an auditable kill log, dead-turn auto-continuation, official-quota-aligned rate governance, and multi-bot single-process isolation.

[![npm version](https://img.shields.io/npm/v/@linjz/opencode-qqbot)](https://www.npmjs.com/package/@linjz/opencode-qqbot)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![QQ Bot](https://img.shields.io/badge/QQ_Bot-API_v2-red)](https://bot.q.qq.com/wiki/)
[![Bun](https://img.shields.io/badge/Bun->=1.0-fbf0df)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)

> Target users: Chinese-speaking QQ users. OpenCode V2 (desktop background service) + an official QQ open-platform bot (C2C private chat / group @mention).

## Features

| Capability | What it does |
|---|---|
| Two-way chat | QQ messages reach the OpenCode session; AI replies are pushed back to QQ (markdown rendering, long answers auto-split with table atoms intact and code-fence repair) |
| Desktop session mirror | 📋 Digest card: the latest Q&A round of a desktop session is mirrored to QQ in real time (full text by default) |
| Status cockpit | `/status` is the single dashboard — server/session/model/agent/observation/mirror/queue/logs in one view; `/status watch on|off` and `/status mirror on|off` are the only switches (tool-call milestones 🔧 + desktop digest mirror) |
| **Permission approval** | OpenCode permission requests arrive as 🔐 four-button cards (allow once / always allow / reject / ignore). Taps take effect silently (the tapped button shows ✓/✗ via native visited state). The card also shows exactly which rule "always allow" will save. Text replies ("允许/总是/拒绝") work too |
| **Form prompt bridge** | OpenCode Forms (single-choice / multi-choice / boolean / text) render as 📝 QQ cards — answer by tapping buttons or replying with a letter (A/B/C). Requests and forms from desktop-side turns are pushed as well (always-on watcher, 12s poll) |
| Remote commands | `/new /cancel /status /sessions /history /models /agents /rename /progress /queue /ledger /send /undo /amend /goal /compact /redo /btw` |
| Busy-time steer | New messages while a turn is running merge into the current turn (official steer semantics — the default); enqueue explicitly with `/queue <text>`; classic FIFO via `QQ_BUSY_DEFAULT=queue` |
| Goal mode | `/goal <objective>` passes through to the engine's goal mode with status-change notifications and kickoff attribution; `/goal` shows status, `pause|resume|clear` to control |
| Rich media | Receive images (native attachments go to the AI for vision); **receive voice** (QQ's built-in ASR transcribes to text into the prompt for free); **send images/files** — the AI calls the native `qq_send_file` tool (path allowlist + idempotent dedupe + precise errors; `QQ_SEND_FILE:` marker retained as fallback) or you run `/send <path>`; 20MB limit |
| Quote context | Long-press quote a message and ask — the AI sees the quoted content (our own replies are indexed too) |
| Long tasks never lost | 30-min foreground timeout falls back to a background wait (SSE + polling, up to 24h); a 30-min stall triggers a proactive notice with status (stalled / unknown / finished-but-lost), the latest tool action, and how long there's been no progress |
| Duplicate-proof delivery | Two-layer dedup: cross-process atomic msgId claim + same-content in-flight fingerprint; long identical replies deduped outbound for 24h; "received" ack bubble off by default (`QQ_ACK_RECEIPT=1` to enable) |
| Restart recovery | Gateway session/seq persisted — restart prefers RESUME (server only backfills the disconnect window, no backlog replay); the in-flight ledger reconciles on startup: answered→re-delivered, running→re-attached, queued→notified (never mis-dispatched) |
| Rendering fidelity | Ordered lists auto-convert `1.` → `1、` (QQ's renderer renumbers `N.` across paragraphs; `N、` is faithful), code blocks untouched, idempotent |
| Self-healing | Startup race backoff, port-drift auto-discovery with hot base-swap, patrol alerts (QQ proactive messages), a production watchdog (OTP-style restart intensity, dual-signal liveness, 10s post-spawn re-spawn), single-instance lock with heartbeat + 60s self-check |
| Auditability | Every watchdog kill decision lands in a dedicated JSONL audit log (`~/.openqq/kills.log`): the rationale (health snapshot), the action (pid + TERM/KILL escalation), and the consequence (new pid + restart counter) |
| Security | fail-closed allowlist admission (non-listed users always rejected), download-domain allowlist, secret masking in logs, push content redaction, dangerous-command approval driven by OpenCode's permission rules (four-button cards) |

### What's new in v0.3.18

- **v0.3.19 hotfix** — `bin/openqq.js` TDZ (temporal dead zone) broke every `openqq` subcommand on 0.3.16-0.3.18 with a module-eval `ReferenceError`; declaration order fixed and a bin smoke suite added to the test chain. Also fixes the supervisor lease `--once` self-deferral that diluted 5-min patrols to 10-min (channel-priority + timestamp lease, pid is diagnostics only).
- **`qq_send_file` first-class tool** — the AI sends local files/images to QQ via a native tool with JSON-Schema contract and precise structured errors (allowlist roots on failure); the old `QQ_SEND_FILE:` text marker survives as a fallback. No more syntax guessing.
- **System-level channel instructions** — QQ rendering/format rules are injected as session instructions (`<context key="qq">`), not appended to your prompt text. Session history stays clean on the desktop side.
- **Status cockpit** — `/status` becomes the single dashboard and the only switch entry for observation (`watch`) and digest mirror (`mirror`); standalone `/watch` `/mirror` commands retired.
- **Honest dead-turn resumption** — a dead background turn is judged by three signals (last-activity threshold + running-tool grace window + turn-unterminated), aborted with the outcome recorded, and resumed with a targeted dedupe hint naming the in-flight tool; if the abort is unconfirmed the model must verify processes/side effects before redoing any write.
- **Busy-time steer by default** — messages arriving mid-turn merge into the running turn (official steer semantics); `/queue <text>` enqueues explicitly.
- Engineering: 69 test suites on a parallel runner, state-store hardening, `deploy/` retired, design-doc reconciliation batch. Full details in the [v0.3.18 release notes](https://github.com/linjz3376/opencode-qqbot/releases/tag/v0.3.18).

Why QQ instead of the official mobile app: the official OpenCode Mobile (TestFlight / Google Play) is a remote for the desktop app — install required, out-of-region store accounts needed in China, and pairing through tunnels. This bot closes the loop natively in QQ: no app, no QR pairing, approval cards delivered straight to your chat.

## Quick start

### Prerequisites

1. **QQ bot credentials**: create a bot on the [QQ Open Platform](https://q.qq.com) and get the **AppID** and **AppSecret** (for sandbox debugging, configure sandbox accounts in the admin console first; production requires a server public-IP allowlist).
2. **OpenCode V2** running on the same machine (the bot connects to its background service API).
3. **Runtime**: bun or node, either one (bun recommended; node ≥ 20 also works via the bundled runtime build).

### Pick a flavor (either one)

| | Plugin flavor (recommended) | Standalone flavor |
|---|---|---|
| Best for | OpenCode already installed locally, zero-config | Servers / your own daemon setup |
| Install | `opencode plugin add @linjz/opencode-qqbot` (or add `"@linjz/opencode-qqbot"` to the plugins array) | `npm i -g @linjz/opencode-qqbot` (or `github:linjz3376/opencode-qqbot`) |
| Keep-alive | The plugin auto-launches the bot and recovers when the OpenCode service restarts | Self-managed: `openqq` in foreground / systemd / Task Scheduler |
| Config entry | `npx @linjz/opencode-qqbot setup` (QR scan) or hand-write `~/.openqq/.env` | Same (the global `openqq-setup` command also works) |

Developers installing from source: `bun run deploy:plugin` (full package unpacked into the global plugin directory — byte-identical to what npm users get).

### Configuration (`~/.openqq/.env`, single point of secrets)

Bind by scanning a QR code with your phone (writes credentials automatically; the connector installs on demand):

```bash
npx @linjz/opencode-qqbot setup
# standalone flavor with -g: openqq-setup
```

Or create it manually:

```ini
QQ_APP_ID=your AppID
QQ_APP_SECRET=your AppSecret
ALLOWED_USERS=your QQ openid   # fail-closed: required; users not on the list are always rejected
OPENCODE_BASE_URL=http://127.0.0.1:<port>/api   # OpenCode desktop service address (2.1.x ports are dynamic; the bot auto-discovers on connect failure)
OPENCODE_PASSWORD=opencode service password (Basic auth password from the desktop service config)
QQ_SANDBOX=false
```

### Start

- **Plugin flavor**: nothing to start manually — once the plugin is installed and credentials are set, the plugin's patrol launches the bot; it also recovers when the OpenCode service restarts.
- **Standalone flavor**: run `openqq` in the foreground; for daemon mode pick your OS (Windows: Task Scheduler via `openqq service install`; Linux: `systemd --user`; macOS: launchd or `nohup`).

<details>
<summary>Linux: systemd --user unit (copy-paste ready)</summary>

`~/.config/systemd/user/openqq.service`:

```ini
[Unit]
Description=OpenCode QQ Bot
After=network.target

[Service]
Type=simple
ExecStart=openqq
Restart=on-failure
RestartSec=30
Environment=HOME=%h

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now openqq
# keep running without login: loginctl enable-linger $USER
```
</details>

<details>
<summary>macOS: launchd plist (copy-paste ready)</summary>

`~/Library/LaunchAgents/net.opencode-qqbot.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>net.opencode-qqbot</string>
  <key>ProgramArguments</key>
  <array><string>/usr/local/bin/openqq</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/openqq.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/openqq.err.log</string>
</dict></plist>
```

```bash
launchctl load ~/Library/LaunchAgents/net.opencode-qqbot.plist
```
</details>

> **Single instance**: the bot holds a file lock on startup (`~/.openqq/openqq-<appId>.lock`, 10s heartbeat, 30s zombie takeover) — a second instance waits in standby and takes over when the host exits, preventing QQ gateway mutual-kick between twins. `QQ_INSTANCE_LOCK=false` disables it.

> **Cross-platform**: the bot body has zero OS branches (pure TS, same shape as the official QQ SDK); bun preferred, node ≥ 20 falls back automatically. Port auto-discovery works on all three OSes (Linux `ss -tln`, macOS `netstat -an -p tcp`, Windows `netstat -ano -p tcp`).

## Commands

| Command | What it does |
|---|---|
| `/new` | Start a new session |
| `/cancel` | Abort the current generation and clear the busy queue |
| `/status` | Cockpit: server / auth / session / model / agent / watch / mirror / queue / log; `watch` / `mirror` + `on`/`off` are the only switch entries |
| `/sessions` | List sessions and switch by number |
| `/history [N]` | Last N rounds (default 3, max 10; newlines / code blocks / tables preserved) |
| `/models` | View or switch the model (session-level) |
| `/agents` | View or switch the agent |
| `/rename <name>` | Rename the current session (local title only) |
| `/progress` | Manual progress query: tool/failure stats and in-flight status (local event source, zero model calls) |
| `/queue` | Busy queue: view / `clear` / `drop <n>` / `<text>` explicit enqueue (busy messages steer into the running turn by default; `QQ_BUSY_DEFAULT=queue` restores auto-queuing) |
| `/ledger` | Ledger view: snapshot / `check` reconcile / `settle <suffix> confirm` manual settle (orphans and in-flight traceable) |
| `/send <path>` | Send a file/image from an allowlisted directory to QQ |
| `/undo` | Official semantics: revert the last turn and restore files (receipt carries the reverted prompt; re-send after edits) |
| `/amend <text>` | Steer a busy turn with supplementary instructions (official steer semantics); or `/queue <text>` to explicitly enqueue |
| `/goal <objective>` | Official goal mode (engine built-in, v2.2.1+): the session drives itself until done or blocked; `/goal` for status, `pause`/`resume`/`clear` to control |
| `/compact` `/redo` `/btw` | Official engine commands: compact session / restore an undo / side question (not written into session context) |

## Environment variables (optional tuning)

| Variable | Default | Meaning |
|---|---|---|
| `QQ_ACTIVE_DAILY_LIMIT` | 100 | Proactive message daily quota (official QQ limit is 1000/day/relation; headroom kept) |
| `QQ_PASSIVE_RIDE_WINDOW_MS` | 300000 | How long to "ride" a passive reply window before falling back to proactive |
| `QQ_STREAM_STAGGER_MS` | 300 | Stagger between split-reply chunks (0 = send all at once) |
| `QQ_SESSION_IDLE_HOURS` | 6 | Idle session eviction threshold |
| `QQ_INTERACTION_WATCH_SECONDS` | 12 | Always-on interaction watcher poll interval (0 = off) |
| `QQ_BUSY_DEFAULT` | `steer` | Busy-time delivery, aligned with the official TUI (Enter steers): new messages merge into the running turn. Set `queue` for client-side FIFO queuing (legacy behavior) |
| `QQ_REDISPATCH_MAX_AGE_MS` | 7200000 | Startup-reconcile auto-redispatch window for lost messages (0 = notify only; capped by the 24h ledger trim) |
| `QQ_ACK_RECEIPT` | off | "Received, working on it" ack bubble (set `true`/`on`/`1` for debugging) |
| `QQ_GATEWAY_STATE_MAX_HOURS` | 6 | Gateway session persistence window (older / RESUME-rejected falls back to IDENTIFY) |
| `QQ_EVENT_PROBE` | off | Plugin-side event probe (`true` dumps all event types to `~/.openqq/opencode-events.jsonl`, for diagnosis) |
| `OPENCODE_TURN_TIMEOUT_MINUTES` | 30 | Foreground turn timeout (falls back to background wait) |
| `QQ_DIGEST_ANSWER_MAX_CHARS` | 0 (full text) | Digest card answer truncation limit |
| `QQ_HISTORY_USER_CLIP` / `QQ_HISTORY_TEXT_CLIP` | 500 / 1200 | /history user/AI line truncation |
| `QQ_SEND_EXTRA_ROOTS` | — | Extra allowed directories for `/send` (comma-separated) |
| `QQ_ORPHAN_MS` | 90000 | Orphan threshold (accepted but silent beyond this; valid 5s–60min, invalid falls back) |
| `QQ_WATCHDOG_INTERVAL_MS` | 300000 | Plugin bootstrap patrol interval (5min; the service-side autostart default is 10min) |
| `QQ_PERM_DEFER_MS` | 500 | Approval card deferral window (0–10s): if the request is resolved elsewhere within the window, no QQ card — aligns with desktop silent handling |
| `QQ_QUEUE_RECEIPTS` | off | Queue-completion receipt "queue #N done" (off by default to prevent batch spam) |
| `QQ_LOG_FILE` | `~/.openqq/openqq.log` (unified log, bot + watchdog in one file) | In-process file log path; 20MB × 4 generations, 100MB total budget (`QQ_LOG_MAX_MB`/`QQ_LOG_KEEP`/`QQ_LOG_TOTAL_MB` tunable) |
| `QQBOT_DEFAULT_CWD` | bot process cwd | Default project directory for new sessions |
| `QQ_SANDBOX` | false | QQ sandbox environment (REST domain switches to sandbox) |
| `QQ_INSTANCE_LOCK` | on | Single-instance file lock (`false` to disable; only for multi-instance debugging) |
| `QQ_BOTS` | — | Multi-role JSON table (multiple QQ bots in one process, data bucketed per role; absent = single-role legacy) |
| `QQ_LANE_SCOPE` | `per-session-peer` | Session isolation granularity: `per-session-peer` (official per-peer refined per-session) or `per-peer` |

**Internal knobs (troubleshooting/tests only — safe to ignore day to day)**

| Variable | Default | Meaning |
|---|---|---|
| `QQ_ACTIVE_MINUTE_LIMIT` | 20 | Proactive message per-minute rolling window (official 20/min aligned) |
| `QQ_API_CALL_TIMEOUT_MS` | 30000 | Per-call engine API timeout (P11 req-layer defense) |
| `QQ_SSE_SILENCE_MS` | 120000 | SSE silence kill threshold (P8: zero-byte proactive reconnect) |
| `QQ_BG_RESUME_MAX` | 3 | Dead-turn auto-continuation cap (0 = off; valid 0–5) |
| `QQ_BG_STREAM_DEAD_MS` | 15min | Background stream-liveness dead threshold (valid 1–60min) |
| `QQ_BG_TOOL_GRACE_MS` | 60min | Bounded tool-execution grace window before dead judgment |
| `QQ_REAPER_MIN_AGE_MS` | 40min | Zombie reaper age gate |
| `QQ_REAPER_SILENCE_MS` | 30min | Zombie reaper silence gate |
| `QQ_REAPER_SCAN_SECONDS` | 60 | Zombie/orphan patrol interval (same tick) |
| `QQ_ORPHAN_SCAN_SECONDS` | 60 | Orphan ledger patrol interval |
| `QQ_DISPATCH_STALL_MS` | 120000 | Dispatch-stall sentinel threshold (valid 30s–60min) |
| `QQ_NOTIFY_MAX_ATTEMPTS` | 8 | `openqq notify` delivery attempt cap |
| `QQ_NOTIFY_TTL_HOURS` | 24 | notify outbox queue retention |
| `QQ_DATA_DIR` | `~/.openqq` | Runtime data root (ledgers/logs/locks; whole directory is portable) |
| `QQ_INFLIGHT_FILE` | `<data dir>/inflight.json` | In-flight ledger file path |
| `QQ_OUTBOX_FILE` | `<data dir>/outbox.json` | notify outbox file path |
| `QQ_FORM_JOURNAL_FILE` | `<data dir>/forms.json` | Form-bridge persistence file |
| `QQ_DELIVERY_DEDUPE_FILE` | `<data dir>/delivery-dedupe.json` | Outbound dedupe state file |

> All variables go into `~/.openqq/.env` (one `KEY=value` per line). Secrets discipline: the file is read by the bot only; no tool or session may echo its contents.

### Behavior config (`~/.openqq/config.json`, optional)

Mirrors the official OpenCode layering ("json = behavior, env = secrets"): behavior knobs can move to `config.json` (flat JSON, **same key names as the env vars**), leaving `.env` for secrets only. Precedence, high to low:

```
inherited env  >  ~/.openqq/.env  >  ~/.openqq/config.json  >  built-in defaults
```

```json
{
  "QQ_BUSY_DEFAULT": "queue",
  "QQ_STREAM_STAGGER_MS": 500
}
```

`QQ_CONFIG_FILE` overrides the config path (tests/multi-instance). Keep secrets (QQ_APP_SECRET, OPENCODE_PASSWORD, …) out of config.json — behavior keys only.

## Architecture

Four layers (every file carries an `@input/@output/@pos` header):

```
src/qq/        QQ transport (WS gateway / REST API / sender / media)
src/opencode/  OpenCode V2 client (REST + SSE event stream / sessions / history rendering)
src/core/      Business domains (approval/cards/form-bridge/delivery/mirror/link-watch/port-discovery/reply-limiter/context-buffer/send-media, plus inbound-dedupe, gateway-state, inflight-journal, instance-lock, zombie-reaper, watchdog, notices)
src/bridge.ts  Orchestration facade + commands.ts + entry index.ts
```

## Tests

```bash
npm run verify        # tsc + 56 unit suites (admission idempotency, gateway persistence, turn attribution, rendering adaptation, ledger recovery, watchdog decisions, kill-audit, notices, ...)
npm run test:e2e      # five e2e suites (requires a running OpenCode service)
```

## Operations (all TypeScript, cross-platform, shipped with the package)

```bash
openqq restart                            # wait for idle → stop → start (replaces the old safe-restart.ps1)
openqq restart --force                    # skip idle wait (maintenance window)
openqq watchdog --once                    # single patrol (autostart / systemd timer / launchd)
openqq watchdog --loop --interval-min 10  # resident loop
openqq service install|uninstall|status   # autostart registration: win32=schtasks / linux=systemd user / darwin=launchd
```

Liveness = lock-file pid + `process.kill(pid, 0)` + heartbeat freshness (>5min stale triggers restart, 60s grace during startup).
`~/.openqq/` holds **runtime data only** (`.env`, ledgers, unified log `openqq.log`, `heartbeat`); the kill-decision audit line lives in `kills.log`.

## Troubleshooting

| Symptom | Check first |
|---|---|
| QQ not responding | Unified log `~/.openqq/openqq.log` (bot output and watchdog audits in one file, 20MB × 4 generations, 100MB budget) |
| Process疑似 frozen | `openqq watchdog --once` — judges and self-heals in one pass (kill residue, then relaunch) |
| ECONNREFUSED | Desktop service port drift — restarting the bot auto-discovers the new port (`~/.openqq/last-discovered.json` trail) |
| Desktop popup blocking a task | The background wait sends stall notices with recent actions; `/stop` aborts |
| Log shows "instance standing by" | Single-instance lock active — another instance holds the lock (the 60s self-check converges twins on lock changes; normally nothing to do) |

## Platform notes

Hard-won findings from real deployments (Windows 11 / OpenCode v2.2.2) — the plugin can't fix these, but they keep tripping users:

**QQ platform**

1. The token endpoint `POST https://bots.qq.com/app/getAppAccessToken` takes **`clientSecret`** (older docs say `appSecret`); the `100016 invalid appid or secret` error is misleading — check the field name before resetting your secret.
2. Tokens are environment-independent and always use the production domain `bots.qq.com`; **the sandbox domain `sandbox.api.sgroup.qq.com has no token endpoint** (it returns `11001 unsupported call`).
3. Sandbox bots have a separate gateway: `GET https://sandbox.api.sgroup.qq.com/gateway` → `wss://sandbox.api.sgroup.qq.com/websocket`; a sandbox bot connecting to the production gateway is rejected with 4914.

**OpenCode side**

4. `opencode plugin add` occasionally hangs silently (>3min); retrying usually works.
5. `opencode reload` **only adds, never removes**: entries removed from the plugins array stay loaded in server memory (old plugin timers keep running); a full service restart is required.
6. The global plugin-directory scanner only recognizes root-level entrypoints (a package.json `exports` pointing at a `./dist` subpath gets skipped) — **directory-flavor installs only**; the npm package flavor has no such limit.
7. `opencode plugin update` needs the fully scoped name (`@linjz/opencode-qqbot`); the bare short name errors with `Plugin is not configured`.
8. npm plugin cache lives in `~/.cache/opencode/npm/<pkg>@<tag>/<timestamp>/` — `update` creates a new timestamp directory, so local patches on cached copies silently stop applying. Never patch cache copies.

## Alignment matrix with the OpenCode desktop

The QQ bridge is an adapter from "OpenCode interaction events" to "QQ interaction primitives". Every blocking interaction the desktop TUI can handle should have a counterpart on the QQ side (bridged or explicitly degraded):

| Desktop interaction | QQ side today | Gap |
|---|---|---|
| Permission requests | ✅ Four-button cards (once/always/reject/ignore) + text replies + desktop-pending requests pushed too (always-on watcher, 12s) | None |
| Single-field Form (choice/multi/bool/text) | ✅ Letter-button cards + text parsing + 30min TTL + form-journal persistence | None |
| **Multi-field Form (Questions)** | ⚠️ Falls back to "please complete on desktop" (explicit degradation) | Per-field wizard is a candidate enhancement (not implemented) |
| Future OpenCode interaction types | ⚠️ No alignment mechanism; patched one by one after the fact | Matrix acceptance: bridge with the version or register as "explicit degradation" — undefined states are not allowed |

Principle: unsupported types always get explicit copy + desktop guidance, never silent drops; enhancements like the per-field wizard land with minimal intrusion.

## License

MIT
