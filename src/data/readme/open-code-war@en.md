<div align="center">

# ⚔️ Open Code War

**Nobody sees your effort anymore. We put it on a board.**

A record of every day you build with Claude Code, Codex, OpenCode or pi: times asked, characters written, days in a row (never the content).
No money, no prompt text, no code — effort is the only thing we take.

**English** · [한국어](README.md)

[![website](https://img.shields.io/badge/opencodewar.dev-1a1a1a?style=for-the-badge)](https://opencodewar.dev)
[![status](https://img.shields.io/badge/status-early%20development-e08a2e?style=for-the-badge)](#-roadmap)
[![agents](https://img.shields.io/badge/Claude%20Code%20·%20Codex%20·%20OpenCode%20·%20pi-supported-6c5ce7?style=for-the-badge)](#-install-the-plugin)
[![npm](https://img.shields.io/npm/v/open-code-war?style=for-the-badge&color=cb3837&logo=npm)](https://www.npmjs.com/package/open-code-war)

<sub>Codename: <b>OCW</b> · First target 🇰🇷 Korea → eventually a worldwide per-country globe ranking</sub>

</div>

---

## 🔒 Privacy first

Open Code War **never collects prompt content.** It only counts the number of submissions and the character count (a number).

| ✅ Collected | ❌ Not collected |
|--------------|------------------|
| Anonymous `userId` (auto-generated on device, irreversible) | Prompt **content** |
| Number of prompt **submissions** | Code · files · paths |
| Prompt **character count** (a single integer) | Email · real name or other PII |
| **Agent type** used (Claude Code·Codex etc., a single label) | Raw IP storage |
| (server-side) request country `cf.country` | |
| **Barracks chat · guestbook** — text you write yourself for others to read | Prompts · tool calls · commands · file paths (never part of the work status either) |
| **Barracks work status** — a single `working` / `idle` value | |

> Even though the hook receives the raw prompt, it **computes only the character count and sends that — never the text.** It runs **fail-open** (short timeout + background fire-and-forget) so it never blocks or slows down your agent, even if the network fails.

**What the barracks (`/space`) adds** (Claude Code 2.1.287 or later)
- **Work status**: while Claude Code is open, it sends only a `working` / `idle` value at session start, at the start and end of a turn, and every 2 minutes. As a result **your barracks door lights up in the plaza and "working" is public.** Opt out with `/space presence off`. Nothing is sent while `/ocw disable` is on.
- **Chat**: visible to the people in that room. Each room keeps the latest 50 lines, **deleted automatically after 24 hours**.
- **Guestbook**: visible to everyone who enters that barracks. Each barracks keeps the latest 100 lines, **until the owner clears them (`/space guestbook clear`) or bans the author**.
- **Visit log**: each barracks keeps nicknames and times from the last 7 days for the owner's "N people dropped by" briefing line.
- Deleting your account also deletes your barracks' chat, guestbook, visit log and ban list. Guestbook lines you left in someone else's barracks stay until that owner clears them.

---

## 🧩 How it works

```
┌──────────────────────────────┐   POST /track      ┌───────────────────────────┐
│  Coding agent hook / adapter  │ userId,chars,agent▶│  Cloudflare Worker         │
│  · one prompt submit = 1 event│                    │  · detects cf.country      │
│  · /ocw nickname command      │  ─ POST /register ▶│  · records events + aggreg.│
│  · ~/.open-code-war/config    │                    │  · Cron snapshot (KV)      │
└──────────────────────────────┘                    └───────────┬───────────────┘
                                                                 │ D1 (SQLite)
                                    GET /leaderboard             ▼
┌──────────────────────────────┐   GET /countries    ┌───────────────────────────┐
│  Leaderboard web (static)     │  ◀──── JSON ─────── │  daily/weekly/weekend/by  │
│  daily·weekly·weekend · map   │                    │  country ranking snapshot │
└──────────────────────────────┘                    └───────────────────────────┘
```

- **Collection** — the plugin's `UserPromptSubmit` hook sends an event to the Worker on every submission (content excluded).
- **Storage / aggregation** — the Worker attaches the request country (`cf.country`) and records to D1, aggregating by KST (UTC+9) day. The leaderboard is served from a **Cron batch snapshot** (KV) rather than live, reducing D1 load.
- **Display** — the static web calls the Worker's read API to render rankings / the map.

---

## 📂 Repository layout (monorepo)

```
open-code-war/
├── plugin/            # Claude Code plugin (collection hook + /ocw command)
├── adapters/          # adapters for other agents (Codex·OpenCode·pi)
│   ├── .claude-plugin/plugin.json
│   ├── hooks/hooks.json          # UserPromptSubmit → track.mjs (async·non-blocking)
│   ├── commands/ocw.md           # /ocw slash command
│   └── scripts/                  # track.mjs, ocw-cli.mjs, lib/
├── backend/           # Cloudflare Worker + D1 API
│   ├── src/                      # Worker source
│   ├── migrations/               # D1 schema
│   ├── seed/                     # test seed
│   └── wrangler.jsonc
├── web/               # static leaderboard web (daily·weekly·weekend + map)
├── mockups/           # web design mockups
└── DESIGN.md          # detailed design doc (v0.1)
```

---

## 🚀 Install the plugin

### From the marketplace (recommended)

```
/plugin marketplace add dodohankim/opencodewar
/plugin install open-code-war@opencodewar
```

Manage/enable it under the **Installed** tab of the `/plugin` menu.
On Claude Code v2.1.275 or later, the one-liner `/plugin install open-code-war --marketplace dodohankim/opencodewar` also works.

### Turn on auto-update (recommended)

The plugin is **unpinned and tracks the latest commit**, so once you enable auto-update it picks up every new release automatically at Claude Code startup.

```
/plugin   →   Marketplaces tab   →   select opencodewar   →   enable auto-update
```

To update right now manually, update from your shell, then apply it to the running session:

```bash
claude plugin update open-code-war@opencodewar   # refreshes the marketplace + installs the new version
```

```
/reload-plugins                                  # apply to the running session (or restart)
```

Inside a session, `/plugin` → **Installed** tab → open-code-war → **Update now** works too.

> ℹ️ The backend is **deployed and live (beta)** with its URL baked into the plugin, so collection works right after install. (The `/plugin marketplace add` command requires this repo to be pushed to GitHub.)

### Codex

Codex uses the same plugin / marketplace system, so you install **the very same plugin**.

```bash
codex plugin marketplace add dodohankim/opencodewar
codex plugin add open-code-war@opencodewar
```

Then start `codex`: the startup screen shows **"Hooks need review"** — pick
**Trust all and continue**, otherwise the hook is silently skipped. Update with
`codex plugin marketplace upgrade`.

### OpenCode · pi

Both install from the single npm package `open-code-war`.

```bash
# pi
pi install npm:open-code-war
```

For OpenCode, add it to the `plugins` array in `opencode.json(c)` (auto-installs on startup).
`plugins` is the OpenCode 2 field name; 1.x's `plugin` keeps working.

```jsonc
{ "plugins": ["open-code-war"] }
```

> ℹ️ OpenCode 2 does not run V1 plugins. This package exports both APIs, so it collects on 1.x and
> 2.x alike. If counting stops, check `~/.local/share/opencode/log/opencode.log` for
> `failed to load plugin`.

All four add up under the same `userId`; the per-agent split shows on your profile chart.
See [`adapters/README.md`](adapters/README.md) for requirements and counting rules.

### Development (local load)

```bash
export OCW_API_URL="http://localhost:8787"   # local backend (cd backend && npm run dev)
claude --plugin-dir ./plugin
```

Register a nickname / check status / turn collection on-off:

```
/ocw nickname <name>     # register or change your leaderboard display name
/ocw status              # show your userId · nickname · collection state
/ocw brief on | off      # toggle the one-line session briefing (rank · rank title · streak)
/ocw enable | disable    # turn collection on/off
```

Barracks:

```
/space                   # open the plaza (a/d walk · e enter a door · t chat · g guestbook · Esc close)
/space home              # go straight to your barracks
/space kick <nick>       # remove someone from your barracks (blocked for 10 minutes)
/space ban <nick>        # ban (unban <nick> to lift · bans to list)
/space close | open      # lock · unlock your barracks
/space guestbook clear   # clear your guestbook
/space presence off | on # stop · resume sending your work status
```

The plaza is also on the web at [`/plaza`](https://opencodewar.dev/plaza): sign in to walk and talk, or watch without signing in. In-game text is Korean for now. The terminal client needs Claude Code 2.1.287+ and Node 22+.

When a session starts you get a **one-line briefing** in the terminal — just the single thing worth
knowing right now (your streak is about to break, the next rank is close, how far the person above you is).
If nothing changed, it stays quiet.

- Config file: `~/.open-code-war/config.json` (userId · nickname · on/off)
- ⚠️ Your `userId` is **both your identity and your secret key.** Don't share it.

---

## 🛠️ Local development

### Backend (Cloudflare Worker + D1)

```bash
cd backend
npm install
npm run db:migrate:local     # apply schema to local D1
npm run db:seed:local        # seed test data
npm run dev                  # wrangler dev (http://localhost:8787)
```

Other scripts: `npm run typecheck` · `npm run test` (vitest) · `npm run deploy`.

### Web

Serve `web/index.html` with any static server (it connects to the backend read API).

---

## 🔌 API (Worker endpoints)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/track` | collect an input event (rate-limit, attaches `cf.country`) |
| `POST` | `/register` | register/change nickname (uniqueness · profanity check) |
| `GET`  | `/leaderboard?type=daily\|weekly\|weekend&metric=prompts\|chars&limit=100` | ranking (snapshot cache) |
| `GET`  | `/countries?type=…` | per-country totals (for the globe) |
| `POST` | `/space/ticket` | 60-second barracks entry ticket (terminal) |
| `POST` | `/space/status` | owner work-status heartbeat |
| `POST` | `/space/admin` | owner controls: kick · ban · lock · clear guestbook |
| `GET`  | `/space/ws?room=plaza\|<public_id>` | plaza · barracks WebSocket |

All aggregation windows are **KST (UTC+9)**; weekend = Fri · Sat · Sun.

---

## 🗺️ Roadmap

| Stage | What | Status |
|-------|------|--------|
| **M1** | Backend skeleton — Worker + D1 schema + `/track` `/leaderboard` | ✅ |
| **M2** | Collection plugin — `UserPromptSubmit` hook, anonymous ID, `/register` nickname | ✅ |
| **M3** | Connect leaderboard web to the real API + KV snapshot caching | ✅ |
| **Next** | Marketplace release · globe per-country ranking · stronger anti-abuse (rate-limit) | ⬜ |

See [`DESIGN.md`](./DESIGN.md) for detailed design and decisions.

### Non-goals (out of scope for v1)
- Collecting/storing prompt **content** (never, for privacy)
- Cash / monetary rewards (abuse-verification burden — discussed separately)
- Real-time PvP / multiplayer (v1 is batch-aggregated ranking)

---

## 📄 License

**Business Source License 1.1 (BSL)** — see [`LICENSE`](./LICENSE) for full terms.

- The source is **public** so anyone can read and audit it. (Important for verifying the privacy claims.)
- **Personal, educational, and internal plugin use, and non-commercial self-hosting are free.**
- However, offering it as an ad/sponsorship-based **commercial or competing service**, or **removing/circumventing the ad · sponsorship · attribution features**, is not permitted.
- On the **Change Date (2030-07-09)** it automatically converts to the **Apache License 2.0**.

> BSL is not an OSI-approved open-source license; it is 'source-available'. The name/logo (Open Code War, opencodewar) and the domain trademark are protected independently of the license.

<div align="center">
<sub>Made for the coding agent community · <a href="https://opencodewar.dev">opencodewar.dev</a></sub>
</div>
