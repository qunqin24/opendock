<p align="center"><img src="logo.svg" width="128" alt="magpie-nest logo"/></p>

<h1 align="center">Magpie Plugin Pack · magpie-plugin-pack</h1>

<p align="center">Two plugins: 27 web-session AI channels (magpie-nest) + a desktop HUD for the local AI coding agents (magpie-hud)</p>

<p align="center"><a href="https://github.com/hongmaple0820/magpie-plugin-pack/actions/workflows/test.yml"><img src="https://github.com/hongmaple0820/magpie-plugin-pack/actions/workflows/test.yml/badge.svg" alt="tests"/></a></p>

This repo (magpie-plugin-pack) publishes **two independent plugins** under `plugins/`, both standard OpenCode v1 packages you may install separately:

| Plugin | What it is | Install |
| --- | --- | --- |
| **`magpie-nest`** | One omnibus package for 27 web-session AI channels (`config` / `auth` / `provider`); its entry exports 27 plugin functions, each run by the host as its own plugin — **one install, 27 independently signed-in providers**. Vendors with a China edition and an international edition ship both. | `magpie plugin add <repo>/plugins/magpie-nest` |
| **`magpie-hud`** | A desktop HUD for the AI coding agents on this computer: two halves in one plugin — a **panel** (sessions, provider quotas, usage/cost, message delivery) plus **five MCP tools** (`list_sessions` / `send_message` / `start_session` / `get_message` / `list_quotas`); on Windows it spawns an always-on-top desktop window as soon as the plugin loads | `magpie plugin add <repo>/plugins/magpie-hud` |

Multi-account, failover, quota display and auto-update are handled by magpie.

> 中文说明见 [README.md](./README.md)。

## Included plugins

### magpie-nest: 27 web-session AI channels

Everything lives in [plugins/magpie-nest](./plugins/magpie-nest). Each channel's code is in `lib/<id>/` with its own README.

| Provider id | Channel | Sign-in |
| --- | --- | --- |
| `inkstone` | Shusheng Inkstone (Discovery): Orbit Agent + TokenPlan API, credit usage | Windows desktop client import (one click, no browser), or web SSO |
| `lobsterai` | Youdao LobsterAI: 18 models, SSE-only endpoints, daily check-in | Browser login + paste redirect URL |
| `zai-web` | Z.ai web: GLM-5.3 / 5.2 / 5.1 / 5, OpenAI-compatible passthrough | Paste web token (eyJ…) |
| `opencode-free` | OpenCode free anonymous pool: 9 models, no account | One click, no input |
| `glm` | Zhipu ChatGLM web: signed requests + cumulative shard stream | Paste `chatglm_refresh_token` |
| `qwen-ai` | Qwen AI web (chat.qwen.ai): 10 models, session-then-message protocol | Paste web token |
| `perplexity` | Perplexity web: 11 models, SSE differential patch stream | Paste session cookie |
| `kimi-web` | Kimi web: K3 / K2.7-Code / K2.6 / K2.5, gRPC-Web framing | Paste access token |
| `qwen-web` | Tongyi Qianwen web: 9 Qwen3 models | Paste `tongyi_sso_ticket` |
| `doubao` | Doubao web: samantha completion stream | Paste `sessionid` |
| `loomy` | iFlytek Loomy: 8 models, OpenAI-compatible | Paste session token |
| `gemini-code-assist` | Gemini Code Assist: v1internal envelope, 4 tiers | Paste full Google credential JSON |
| `raccoon` | SenseTime Raccoon Work: 6 models, OpenAI-compatible + org code | Paste web access token |
| `agnes` | Agnes AI text models (image/video not implemented) | Paste API key |
| `deepseek-web` | DeepSeek web: sha3 PoW (wasm bundled) + per-turn session + patch stream | Paste token or credential JSON |
| `chatgpt-web` | ChatGPT web (**experimental**): sentinel handshake + local PoW/turnstile + patch stream; may be blocked by TLS fingerprinting | Paste access token or credential JSON |

> ⚠️ All channels are reverse-engineered web protocols, not official APIs: upstream changes can break them at any time, and accounts risk rate limits — don't use a primary account. When a channel id collides with an existing community plugin (`inkstone`/`deepseek-web`/`chatgpt-web`/`qoder`/`qoder-cn`/`trae-cn`/`trae-global`/`workbuddy`/`workbuddy-ai`/`autoclaw`/`autoclaw-cn`), pick the owner with `magpie plugin use <plugin> <id>`; this pack never steals a signed-in account.
>
> **Both editions ship** where a vendor has them: Qwen (`qwen-ai` / `qwen-web`), Zhipu (`zai-web` / `glm`), Qoder, TRAE, Tencent WorkBuddy and Zhipu AutoClaw. The two editions are separate account systems at the vendor, so each gets its own provider id.

## Install

```powershell
git clone https://github.com/hongmaple0820/magpie-plugin-pack.git
magpie plugin add "F:\path\to\magpie-plugin-pack\plugins\magpie-nest"   # 27-channel omnibus
magpie plugin add "F:\path\to\magpie-plugin-pack\plugins\magpie-hud"    # desktop HUD + 5 MCP tools
```

- Or in the magpie app: Plugins → Add plugin → paste the folder path. Each plugin installs on its own; one never affects the other.
- The repo's `install.ps1` / `install.sh` walk `plugins/*/` and add both plugins in one go, and are safe to re-run.

Channels you never sign in to simply sit there; they do not affect the others.

## Sign in

Example:

```powershell
magpie plugin login inkstone
magpie provider test inkstone
magpie quota
```

Other channels: see `plugins/magpie-nest/lib/<id>/README.md`.

## Update

Before publishing to npm, updating = `git pull`:

```powershell
cd magpie-plugin-pack
git pull
```

- Terminal CLI: nothing to do, every command loads the folder's current content.
- magpie app: toggle **each plugin** off and on in Plugins → Installed, or restart magpie.

## magpie-hud: a desktop HUD for the local AI coding agents

Two halves sharing one data engine (session scan / journal / quota read):

- **Panel half**: one quota card per client (ring of the fullest window, per-window progress / reset countdown / 24h sparkline / burn rate), 24h/7d/30d usage with real token and **cost** per provider — requests whose model has no price are listed separately as `unpriced` instead of being silently counted; session list (client color tag + state pill, installed agents only by default); message delivery with 15-second reminder cards. Works both as a plugin page and inside magpie's panel slot.
- **Tool half**: five MCP tools available to any MCP-capable agent — `list_sessions` / `send_message` / `start_session` / `get_message` / `list_quotas`.
- **Desktop HUD** (Windows): an always-on-top native window spawned as soon as the plugin loads. Default is the **Rust + WebView2 shell with the real page** (`desktop-rust/`, sharing the panel's tokens: a 52px status bar, double-click to expand for running sessions, pending approvals with approve/deny, and totals); the **Go + Win32 GDI** build (`desktop-native/`) is the fallback that needs no WebView2. With neither present the plugin just skips it and the page keeps working.
- **Answer for you**: approvals and questions live in the agent client's process memory, unreachable from a plugin hook, so a small companion plugin is installed into DSH from the settings page ("Install to DSH", restart to apply) that captures approval / user-question requests and lets you answer from the panel.
- **Platform boundary**: full functionality on Windows; the macOS / Linux desktop window is not built yet (a stub exits and the plugin skips it) while the page and MCP tools keep working. See [plugins/magpie-hud/README.md](./plugins/magpie-hud/README.md).

## Tests

One command at the repo root runs both plugins' suites (cross-platform):

```bash
npm test
```

Each package's packaging regression lives in its `test/pack-install.test.mjs`: `magpie-nest`'s entry exports exactly the 27 plugin functions and `magpie-hud`'s exactly one, and the `files` whitelist installs each pack standalone (including the deepseek wasm asset and the hud frontend plus published binaries).

GitHub Actions runs the full suite on **ubuntu + windows** for every push / PR. `magpie-hud` declares one runtime dependency (fzstd, to decompress DSH's `.jsonl.zstd` transcripts), so CI runs `npm ci` first; `magpie-nest` remains dependency-free.

## Layout

```
magpie-plugin-pack/
├── README.md / README.en.md      # docs, Chinese / English
├── LICENSE                       # MIT
├── install.ps1 / install.sh      # one-shot install (walk plugins/*, adds both)
├── scripts/test-all.mjs          # run every test
├── .github/workflows/test.yml    # CI: push/PR tests on two platforms
└── plugins/
    ├── magpie-nest/     # 27-channel omnibus
    │   ├── index.mjs             # exports the 27 plugin functions, nothing else
    │   ├── lib/<id>/             # per-channel protocol code + README
    │   ├── assets/               # deepseek-web sha3 wasm
    │   ├── test/
    │   └── package.json          # zero dependencies
    └── magpie-hud/      # desktop HUD: panel + 5 MCP tools
        ├── index.mjs             # exports exactly one plugin function (test/entry.test.mjs guards it)
        ├── lib/                  # data engine (sessions / journal / quotas) + pageservice + 5 tools
        ├── page/ webapp/         # panel page and static assets (zero dependency, zero build)
        ├── desktop-rust/         # Windows native shell (Rust + WebView2, the default)
        ├── desktop-native/       # Windows fallback shell (Go + Win32 GDI, no WebView2)
        ├── test/
        └── package.json          # runtime dependency fzstd (decompresses DSH's zstd transcripts)
```

Rules:

- **The entry module exports plugin functions only**: the host executes every exported function as a plugin, so one stray helper export crashes at load. Helpers live under `lib/`.
- Zero shared state between `magpie-nest` channels; a new channel = a new `lib/` dir + one export line + a test.
- The two plugins **do not depend on each other**: each has its own package.json and may be installed, published and disabled separately. `magpie-hud`'s only dependency is fzstd, imported dynamically with a fallback, so a missing package makes the panel state "engine unavailable" while the tool half keeps working.
- The former standalone-plugin layout was folded into `magpie-nest` (still in git history).

## Publishing (later)

Both packages publish on their own:

```bash
cd plugins/magpie-nest
npm publish --tag beta
```

Then users install with `magpie plugin add magpie-nest`. A PR to `magpie-community/plugins`'s `registry.json` lists it in the community index.

## License
