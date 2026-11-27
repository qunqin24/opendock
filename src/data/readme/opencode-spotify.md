# OpenCode Spotify

Spotify playback, synchronized lyrics and album artwork inside your OpenCode terminal.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Platform: Windows](https://img.shields.io/badge/platform-Windows-blue)
![OpenCode: >=2.3.0](https://img.shields.io/badge/OpenCode-%3E%3D2.3.0-grey)

An independent, MIT-licensed OpenCode plugin. Not affiliated with Spotify AB or the OpenCode project.

## What you get

- A pinned sidebar card in the OpenCode footer: connection header, Music / Lyrics / More
  navigation, framed album art, track and artist, progress, transport, compact volume,
  and a synchronized lyric window (5 → 3 → 1 lines as space shrinks).
- A dedicated Now Playing panel with immersive lyrics (dialog fallback where the host
  offers no panel slot).
- Queue, library, playlists, Liked Songs, search, lyrics, and playback dialogs with
  mouse-first controls. Seeks preview while dragging and commit on release; volume
  drags update immediately.
- Monochrome chrome throughout — the album artwork is the only color. No accent fills,
  karaoke colors, gradients, or glow.
- A guided installer CLI (`setup`, `status`, `update`, `repair`, `doctor`, `uninstall`)
  that provisions a per-installation secret, syncs the Spicetify bridge, and verifies
  its own work.

## Install

Prerequisites: **Windows**, **Node.js ≥ 22.18.0**, **Bun ≥ 1.3.14** (the OpenCode-hosted
TUI runs on Bun), **OpenCode ≥ 2.3.0**, plus **Spotify Desktop + Spicetify CLI ≥ 2.0.0**
for live playback. Spicetify installs through the pinned, hash-verified official
installer on x64; on ARM64 (or when no matching release asset exists) the
installer prints manual guidance instead. Updates migrate every existing copy —
official script, Winget, Scoop, or Chocolatey — through that same official
installer, so there is never a second copy or a mixed package manager. The
Spicetify Marketplace is installed by default (skip with `--no-marketplace`).

Register the exact version once, globally. `setup` performs the
registration itself as one of its plan steps, so a single command installs:

```powershell
npx opencode-spotify@0.6.0-beta.3 setup
```

Re-running `setup` on an already-registered install opens the maintenance menu
(Update to latest when achievable, Repair installation, Uninstall, Exit) —
choose **Repair** to install the bridge.

Then open Spotify and OpenCode in either order. The full walkthrough — including
the local-tarball QA path, existing-Spicetify handling, and lyrics-provider
setup — is in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Requirements

| Component | Version |
|-----------|---------|
| Windows | Required (installer and live use) |
| Node.js | ≥ 22.18.0 |
| Bun | ≥ 1.3.14 (OpenCode-hosted TUI) |
| PowerShell | `pwsh` 7 — required for bridge provisioning and the official installer |
| OpenCode | ≥ 2.3.0 (compatible with 2.4.2) |
| Spicetify CLI | ≥ 2.0.0 (live use only) |
| Spotify Desktop | Live use only |

`@opentui/core@0.9.0` declares `node >= 26.4.0` as install metadata; `npm ci` prints
`EBADENGINE` on Node 22/24 and still succeeds with `engine-strict` off. The installer
runs on Node, the TUI runs under the host's Bun. No OpenTUI, Solid, React, or Ink
packages need manual installing — the package ships the exact runtime dependencies
it needs; the host does not inject them.

## Features

- Pinned footer player that survives Context / MCP / Todo growth without moving.
- Mouse-first controls; the sidebar takes no editor focus and registers no Spotify
  key bindings. Native OpenCode dialogs keep their usual keyboard behavior.
- Music opens queue, library, playlists, search, lyrics, and playback dialogs.
  Lyrics prefers the Now Playing panel with dialog fallback. More exposes shuffle,
  repeat, and related actions. Settings groups playback, lyrics, appearance, and
  diagnostics (monochrome-only; legacy accent keys are accepted but no longer painted).
- Queue with current / queued / next-up, refresh, play, add, and safe UID-specific
  removal. Playlists with folder navigation, paged tracks, play-entire-playlist, plus
  paged Liked Songs and explicit-submit search.
- Lyrics from Spotify's authenticated provider by default; opt-in LRCLIB support with
  exact-match validation and attribution. No transliteration is generated.
- Unavailable actions are disabled or return an actionable error. Timed-out mutations
  are never retried.

## Using the player

- **Sidebar** stays pinned in the footer, outside the scrollbox.
- **Mouse first.** Click or drag either slider. Dialogs and text fields behave as usual.
- **Music** opens queue, library, playlists, search, lyrics, and playback dialogs.
  **Lyrics** prefers the Now Playing panel. **More** exposes shuffle, repeat, and
  related playback actions. The gear opens Settings.
- **Queue:** current / queued / next up with refresh, play, add, and safe UID-specific
  removal. **Playlists:** folder navigation, paged tracks, play-entire-playlist, plus
  paged Liked Songs and explicit-submit search.

## Updates, repair, and uninstall

```powershell
npx opencode-spotify@0.6.0-beta.3 update --dry-run
npx opencode-spotify@0.6.0-beta.3 status --json
npx opencode-spotify@0.6.0-beta.3 doctor
npx opencode-spotify@0.6.0-beta.3 repair
npx opencode-spotify@0.6.0-beta.3 uninstall
```

`--json` is supported by `status` and `doctor` only; it is rejected with exit 2 for
`setup`, `update`, `repair`, and `uninstall`. `uninstall` defaults to plugin-only
(registration + owned bridge; credentials and backups are kept). Complete permanent
removal additionally deletes credentials and owner-safe Spicetify state and requires
typing `UNINSTALL` interactively (or `--complete` with `--non-interactive` and `--yes`).

## Troubleshooting

- `status` and `doctor` are read-only — run them any time, including with `--offline`.
- Bridge reports "Config error" with no Spicetify install: expected until setup
  provisions the bridge. Run `setup` first.
- `Duplicate plugin ID`: keep exactly one registration — remove the project-local
  entry (or `-`-disable it) and restart OpenCode, including any background process
  (or run `opencode service restart`).
- Something changed after a Spotify update: private Spicetify/Spotify APIs can break;
  check `doctor`, then `repair`.
- Full command reference and fixes: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Privacy and compatibility

- Mutual HMAC authentication over loopback only (`127.0.0.1:18765`), exact Host/Origin
  checks, bounded limits. Credentials live in your user configuration and the installed
  extension — never in the package, logs, or localStorage. Spotify lyrics are
  memory-only, never logged or persisted. Optional LRCLIB use is disclosed in Settings;
  provider terms apply.
- Bridge wire protocol **2 / auto-1**. Do not run two differently named copies of the
  bridge at once. This package is not affiliated with Spotify AB or the OpenCode project.
- The secret scanner covers bridge-placeholder and 64-hex values plus a path denylist
  only — it is not a general PII/secret scan.
- Known limits: automated checks only (no live QA is claimed); terminal font shaping,
  Kitty/Sixel output, audio responsiveness, and every Spotify CDN payload still need
  user-side checks; exact selected-track playlist context and selected-track library
  mutations remain subject to Spotify API limits.

## Docs

| Doc | Contents |
|-----|----------|
| [User guide](docs/USER_GUIDE.md) | Install walkthrough, player use, troubleshooting |
| [Architecture](docs/ARCHITECTURE.md) | Server, TUI, bridge protocol, rendering, security boundaries |
| [Maintainers](docs/MAINTAINERS.md) | CI, release process, installer trust spec |
| [Release QA](docs/RELEASE_QA.md) | Developer-run Windows checklist (local tarball, isolated env) |

## Contribute

User install comes first — see the Install section above. To hack on the plugin,
see [CONTRIBUTING.md](CONTRIBUTING.md) (checkout setup, test commands, PR rules).
CI and release internals live in [docs/MAINTAINERS.md](docs/MAINTAINERS.md).

## License

MIT — see `LICENSE` at the repository root (also shipped as `plugin/LICENSE` so the
packed tarball carries it). Spotify, Spicetify, OpenCode, and OpenTUI retain their own
terms. Optional lyric providers retain theirs.
