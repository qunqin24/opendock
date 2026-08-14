# OmniCoder v5

> Fork profesional de [`sst/opencode`](https://github.com/sst/opencode) con plugin propio `@nicolas2601/omnicoder-core` que añade skill-router BM25, security guard, token budget, provider failover, memoria compartida y **picker nativo de personalidades**. Instalable cross-plataforma desde npm con un comando.

```
  ___                  _  ____          _
 / _ \ _ __ ___  _ __ (_)/ ___|___   __| | ___ _ __
| | | | '_ ` _ \| '_ \| | |   / _ \ / _` |/ _ \ '__|
| |_| | | | | | | | | | | |__| (_) | (_| |  __/ |
 \___/|_| |_| |_|_| |_|_|\____\___/ \__,_|\___|_|     v5
```

- Base runtime: [`opencode-ai`](https://www.npmjs.com/package/opencode-ai) upstream (per-platform binaries).
- Plugin: [`@nicolas2601/omnicoder-core`](https://www.npmjs.com/package/@nicolas2601/omnicoder-core) — 7 hooks TypeScript, 89 tests.
- Wrapper: [`@nicolas2601/omnicoder`](https://www.npmjs.com/package/@nicolas2601/omnicoder) — bin + assets (172 agents, 29 commands, purple theme, 7 routing presets).
- Owner: `nicolas2601 <nm5571762@gmail.com>`.

## Instalación — **un solo comando** (Linux / macOS / Windows)

```bash
npm install -g @nicolas2601/omnicoder@alpha
```

Luego:

```bash
omnicoder                         # lanza la TUI en tu cwd
omnicoder doctor                  # verificar instalación
omnicoder update                  # actualizar a la última @alpha
omnicoder --version               # info de versión, runtime, node, platform
omnicoder-routing list            # presets de per-phase routing
omnicoder-routing apply balanced  # Sonnet plan, Haiku build, Sonnet general
```

La primera ejecución siembra tu `~/.config/opencode/` (o `%APPDATA%\opencode\` en Windows) con 172 agents + 29 commands + theme morado + routing presets. **Nunca** sobreescribe ediciones tuyas.

## Auto-update

Al arrancar, el wrapper chequea el registry cada 24h (TTY-only). Si hay versión nueva, imprime un hint violeta:

```
→ omnicoder 5.0.0-alpha.12 available (current: 5.0.0-alpha.11)
  run:  omnicoder update
```

Desactivar con `OMNICODER_NO_UPDATE_CHECK=1`.

## Providers (una API key mínima)

```bash
export NVIDIA_API_KEY=...      # NVIDIA NIM · MiniMax M2.7 + Qwen3 Coder (free 40 RPM)
export MINIMAX_API_KEY=...     # MiniMax directo (Anthropic-compat, prompt caching)
export DASHSCOPE_API_KEY=...   # Alibaba Qwen Max
export ANTHROPIC_API_KEY=...   # Claude Opus / Sonnet / Haiku
export OPENAI_API_KEY=...      # OpenAI GPT-4o / o1
```

Failover automático con cool-down 60s. Matriz completa en [`docs/03-providers.md`](docs/03-providers.md).

## Slash commands nativos en la TUI

- `/personality` — picker visual con 6 personas Invincible (Omni-Man, Conquest, Thragg, Anissa, Cecil, Immortal) + Off. El plugin inyecta el preamble al system prompt en el siguiente mensaje.
- `/themes` — cambiar tema (default `omnicoder`, palette morada).
- `/help` — ver todos los slash commands disponibles.
- `/routing` — ver routing por-fase actual.

## Estructura de packages (monorepo bun)

```
omnicoder-v5/
├── bin/                                wrappers legacy (sh · cmd · ps1) que
│                                       delegan al npm install cuando existe
├── packages/
│   ├── opencode/                       base upstream + parches `// OMNICODER:`
│   │                                   (DialogPersonality, theme, title)
│   ├── omnicoder/                      @nicolas2601/omnicoder-core
│   │                                   (plugin TS compilado con tsup → dist/)
│   └── omnicoder-npm/                  @nicolas2601/omnicoder (wrapper npm)
│                                       con bin/omnicoder.mjs + assets bundle
├── .opencode/
│   ├── agent/                          172 agents especializados
│   └── command/                        29 slash commands de referencia
├── .github/workflows/                  omnicoder-release.yml publica AMBOS
│                                       packages en cada tag v*.*.*
└── docs/                               8 docs + ADRs + MIGRATION + install
```

## Documentación

| Tema | Archivo |
|---|---|
| Guía de instalación Windows (para testers) | [`docs/install-paula.md`](docs/install-paula.md) |
| Quickstart (5 min, Linux/mac/Win) | [`docs/01-quickstart.md`](docs/01-quickstart.md) |
| Instalación detallada + desinstalación | [`docs/02-install.md`](docs/02-install.md) |
| Providers y failover | [`docs/03-providers.md`](docs/03-providers.md) |
| Skills y agentes | [`docs/04-skills-agents.md`](docs/04-skills-agents.md) |
| Hooks del plugin core | [`docs/05-hooks.md`](docs/05-hooks.md) |
| Benchmarks y QA | [`docs/06-benchmarks.md`](docs/06-benchmarks.md) |
| Troubleshooting | [`docs/07-troubleshooting.md`](docs/07-troubleshooting.md) |
| Control del CLI (cómo modificar cualquier parte) | [`docs/control-del-cli.md`](docs/control-del-cli.md) |
| Migración desde v4 (Qwen Code) | [`docs/MIGRATION.md`](docs/MIGRATION.md) |
| ADRs (decisiones de arquitectura) | [`docs/adr/`](docs/adr) |

## Estado

| Métrica | Valor |
|---|---|
| Versión actual en npm | `@nicolas2601/omnicoder@alpha` · `5.0.0-alpha.11` |
| Tests | **89** (Bun test, <3s) |
| CI | 3-OS matrix (Ubuntu + macOS + Windows) |
| Assets bundleados | **172 agents + 29 commands + 7 presets + theme omnicoder** |
| Hooks | 7 TS: router, security, memory, budget, personality, dispatcher, failover |
| Package size | 733 kB tarball / 2.2 MB unpacked / 213 files |
| Instalación | `npm install -g @nicolas2601/omnicoder@alpha` |

## Contribuir / Desarrollo local

```bash
git clone https://github.com/nicolas2601/omnicoder.git ~/omnicoder-v5
cd ~/omnicoder-v5
bun install --frozen-lockfile

# Typecheck + tests del plugin
bun turbo typecheck
bun --cwd packages/omnicoder test

# Correr el TUI desde el source (usa tu repo como runtime,
# con cambios en vivo — no requiere npm install):
bun run dev
```

Los cambios al plugin core (`packages/omnicoder/`) se compilan con `tsup` antes de publicar: `bun --cwd packages/omnicoder run build` genera `dist/index.js` + `dist/index.d.ts`.

Release: push de tag `v*.*.*` → el workflow `omnicoder-release.yml` compila, empaqueta, y publica `@nicolas2601/omnicoder-core` primero, luego `@nicolas2601/omnicoder` a npm.

## Licencia

MIT. Fork de [sst/opencode](https://github.com/sst/opencode) (MIT). Ver [`LICENSE`](LICENSE) y [`NOTICE`](NOTICE).
