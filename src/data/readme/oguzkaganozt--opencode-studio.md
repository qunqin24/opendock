# OpenCode Studio

Isolated OpenCode Studios for Concept, CAD, PCB, and Firmware, plus a general Files explorer.

**Package:** [`@oguzkaganozt/opencode-studio`](https://www.npmjs.com/package/@oguzkaganozt/opencode-studio) · **CLI:** `opencode-studio`

**All Studios are always on.** Install wires OpenCode once with globally registered tools, one managed skill and primary agent per Studio, and isolation permissions that keep Home/Files on stock `build` without Studio capabilities.

## Prerequisites

1. **[OpenCode](https://opencode.ai)** ≥ 1.18.16 — authenticate your model providers.
2. **Bun ≥ 1.3** on PATH (install channel + CLI runtime).
3. **Node + npm** recommended for PCB project scripts (if missing, build falls back to bundled `tsci`).
4. Restart OpenCode after install/repair so plugins, skills, agents, and permissions load.

## Install

```bash
bun add -g @oguzkaganozt/opencode-studio
hash -r
command -v opencode-studio

# Greenfield: postinstall is soft — always repair
opencode-studio repair
opencode-studio status --workspace /path/to/your/project
# exit 0; plugins + skills + agents + permissions + engines must pass
```

From a git checkout (before/without registry publish):

```bash
bun install && bun run build
bun link   # or: bun add -g "$(pwd)"
opencode-studio repair
```

Domain engines ship in the package:

| Engine | Source |
| --- | --- |
| `tsci` | bundled `tscircuit` CLI |
| `uv` | downloaded once into XDG cache on first CAD/status use |
| ESP-IDF / QEMU / `esp-emu` | reused from `~/.espressif` when present, otherwise downloaded once into XDG cache on first Firmware build/sim |

## Quick start

```bash
# after repair (wires plugins/skills/agents/permissions into OpenCode)
opencode-studio up
# → attaches or spawns OpenCode API, starts Studio host
```

Open **[http://127.0.0.1:4173/studio](http://127.0.0.1:4173/studio)** — Agent home, Concept / CAD / PCB / Firmware / Files. One browser URL; OpenCode API is proxied (loopback child by default).

| URL | What |
| --- | --- |
| `http://127.0.0.1:4173/studio` | Studio shell (native Agent panel) |
| `http://127.0.0.1:4173/studio/studios/concept` | Concept briefs and moodboards |
| `http://127.0.0.1:4173/studio/studios/cad` | CAD viewer |
| `http://127.0.0.1:4173/studio/studios/pcb` | PCB schematic, layout, BOM, and 3D viewer |
| `http://127.0.0.1:4173/studio/studios/fw` | Firmware projects, UART console, build/sim |
| Status (drawer footer) | Compact health modal: repair / restart agent |
| `http://127.0.0.1:4173/` or `/opencode` | Optional OpenCode web UI (same-origin proxy) |

**Lifecycle:** `opencode-studio up` supervises OpenCode (`opencode serve` on loopback if nothing is healthy; auto-restarts when this host spawned it). Attach instead with `OPENCODE_URL`. Disable spawn: `OPENCODE_STUDIO_NO_SUPERVISE=1`. Disable host: `OPENCODE_STUDIO_AUTOSTART=0`. Studio Home defaults to `$HOME`; agent directory follows the open project. PATH wrapper is removed on repair — do not rely on it.

Health: `opencode-studio status` (exit 1 if unwired). Prefer **`OPENCODE_SERVER_PASSWORD`** when binding non-loopback (shared with Studio Basic auth).

### Web / LAN

```bash
export OPENCODE_SERVER_PASSWORD='strong-password'
export OPENCODE_STUDIO_HOSTNAME=0.0.0.0
opencode-studio up
# → http://<server-ip>:4173/studio
```

| Env | Role |
| --- | --- |
| `OPENCODE_STUDIO_HOSTNAME` / `OPENCODE_STUDIO_BIND=0.0.0.0\|web` | Force Studio bind (default: inherit parent `0.0.0.0`, else loopback) |
| `OPENCODE_STUDIO_PORT` | Studio port (default `4173`; multi-user: one port per Linux user) |
| `OPENCODE_STUDIO_WORKSPACE` | Explicit fixed Studio Home override (default `$HOME`; restart serve to change) |
| `OPENCODE_SERVER_PASSWORD` or `OPENCODE_STUDIO_PASSWORD` | Required for non-loopback — Basic on **all** Studio routes except `/studio-api/health` |
| `OPENCODE_SERVER_USERNAME` / `OPENCODE_STUDIO_USERNAME` | Basic user (default `opencode` if only server password is set) |
| `OPENCODE_STUDIO_ALLOWED_ORIGINS` | Extra origins when browser Origin ≠ Host (reverse-proxy) |

Prefer SSH tunnel to loopback. If public: TLS at your reverse-proxy; enable WebSocket upgrade; app stays HTTP.

### Config (global)

| File | Purpose |
| --- | --- |
| `~/.config/opencode-studio/studio.json` | Optional absolute `roots` only (domains always on) |
| `~/.config/opencode/opencode.json` | Package-local plugins + managed Studio isolation permissions |
| `~/.config/opencode/skills/studio-<id>/` | Managed skills (`studio-concept`, `studio-cad`, `studio-pcb`, `studio-fw`) |
| `~/.config/opencode/agents/<agent>.md` | Managed primary Studio agents (`concept`, `cad`, `pcb`, `firmware`) |

```json
{ "roots": { "cad": "/absolute/path" } }
```

Missing `studio.json` is fine. Default layout under Studio Home (`$HOME` or `OPENCODE_STUDIO_WORKSPACE`):

```text
$STUDIO_HOME/studio/
  concepts/<id>/             # Concept (concept.json, moodboards/, BRIEF.md)
  designs/<id>/              # CAD (design.json, parts/, …)
  circuits/<id>/             # PCB (src/circuit.tsx, …)
  circuits/catalog/parts/    # optional PCB catalog
  firmware/<id>/              # Firmware (project.json, main/main.c, sim/)
```

`roots.<id>` are absolute domain-root overrides: Concept points at the concepts folder, CAD at designs, PCB at circuits, and Firmware at the firmware projects folder. Keep **one** of `opencode.json` / `opencode.jsonc`.

`image_generate` is a platform tool (not a Studio). It writes to `outputPath` or the workspace cwd. Fallback: ChatGPT OAuth → xAI Grok Imagine quality → fal Nano Banana 2. Set `FAL_KEY` only if you want the last fallback.

**Upgrade from project-local config:** if global config is missing and the domain still has `.opencode/studio.json` with roots, roots are migrated on plugin load. Run `opencode-studio repair` once to finish.

### CLI

```bash
opencode-studio status [--workspace <path>]     # health + version (exit 1 if broken)
opencode-studio repair [--workspace <path>]     # reinstall managed OpenCode state
opencode-studio remove                          # uninstall managed OpenCode state
opencode-studio upgrade [--check]               # bun add -g @latest
opencode-studio --help | -v
```

Shell completion installs on global `bun add -g`. Skip: `OPENCODE_STUDIO_SKIP_POSTINSTALL=1`.

### Upgrade / rollback

```bash
opencode-studio upgrade
# or: bun add -g @oguzkaganozt/opencode-studio@latest
opencode-studio repair
opencode-studio status
# restart OpenCode

# Rollback
opencode-studio remove
bun add -g @oguzkaganozt/opencode-studio@<previous>
opencode-studio repair
```

## Package exports

| Export | Role |
| --- | --- |
| `@oguzkaganozt/opencode-studio` | Primary OpenCode plugin |

`repair` registers the main plugin unversioned.

## Develop (this repo)

```bash
bun install
bun run check          # typecheck + test + lint + build
bun run dev:ui         # Vite :5173
```

See `AGENTS.md` for layout, security hard rules, and contribution gates.
