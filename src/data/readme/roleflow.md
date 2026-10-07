# Roleflow (plugin OpenCode, público)

[![npm version](https://img.shields.io/npm/v/roleflow.svg)](https://www.npmjs.com/package/roleflow) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Un paquete público = toda tu estructura de desarrollo con IA. Lo actualizas 1 vez, todos tus proyectos, tu PC y cualquier server lo heredan. Nada de copiar a mano.

## Qué trae
- 4 agentes: `planner` (`zai-coding-plan/glm-5.3`), `explorer` (`zai-coding-plan/glm-5.3-flash`), `implementer` (`opencode-go/kimi-k2.7-code`, tractor), `reviewer` (`opencode-go/qwen3.7-plus`, solo diff).
- Chat default en tu plan Z.AI (`glm-5.3-flash`); Kimi/qwen van por el pool barato de Go.
- 2 skills: `create-task`, `pr-review`.
- Hooks anti-quema: trunca outputs gigantes (`read`/`bash`/`grep` >6000 chars), preserva estado al compactar, defaults baratos que cada proyecto puede sobreescribir.

## Requisitos
- Node.js 18+ y OpenCode instalados.
- Suscripciones/keys según tu stack (ver tabla abajo). Las keys NUNCA van en este repo.

## Instalación desde cualquier lugar

1. En el `opencode.json` de tu proyecto agrega (pineado, recomendado):
```json
{ "$schema": "https://opencode.ai/config.json", "plugin": ["roleflow@1.0.7"] }
```
OpenCode instala el plugin solo. No necesitas `npm install roleflow` en el repo destino.
2. Pon tus keys en un `.env` (raíz del proyecto o `~/.config/opencode/.env` para reusar en todos). Nombres **nativos** de OpenCode:
```sh
ZAI_API_KEY=...        # zai-coding-plan
OPENCODE_API_KEY=...   # opencode-go
```
¿Primera vez? Genera el `.env` desde el clon de roleflow con `npm run setup` y cópialo donde lo necesites. El plugin (`RoleflowPlugin`) lo autocarga, no necesitas `source .env`.
3. Abre OpenCode en tu proyecto. El plugin aplica routing + recorte + compactación en vivo y se autocopia agentes/skills a `~/.config/opencode/` en cada arranque (sin `npm install` manual).

## Dependencias: API keys

| Variable | Provider nativo | Dónde se consigue | Obligatoria |
|---|---|---|---|
| `ZAI_API_KEY` | `zai-coding-plan` (GLM: planner + flash) | Panel de Z.ai → API keys | Sí |
| `OPENCODE_API_KEY` | `opencode-go` (pool: k2.7-code / qwen-plus) | opencode.ai → Go → API key | Sí |

El setup interactivo (`npm run setup`) las pide ocultando lo tecleado y las guarda en `.env` (gitignored, nunca se publica). El plugin las autocarga al arrancar. Hay un `.env.example` con placeholders como guía. Si prefieres no usar `.env`, exporta las mismas variables en tu server por el método que uses (systemd env, Docker secrets, CI secrets, etc).

**Sobre el nombrespacing:** todos los plugins de OpenCode corren en el mismo proceso y comparten `process.env`. `ZAI_API_KEY` mantiene ese nombre porque es la que el proveedor `zai-coding-plan` de OpenCode lee de forma nativa. Los ajustes propios de roleflow siempre usan prefijo `ROLEFLOW_*`.

## Customizar modelos

Los defaults del plugin solo rellenan huecos: si tu proyecto (o tu config global) declara un modelo, gana el proyecto. En el `opencode.json` del proyecto:

```json
{
  "plugin": ["roleflow@1.0.7"],
  "model": "zai-coding-plan/glm-5.3",
  "small_model": "opencode-go/qwen3.7-plus",
  "agent": {
    "planner":     { "model": "zai-coding-plan/glm-5.3" },
    "explorer":    { "model": "zai-coding-plan/glm-5.3-flash" },
    "implementer": { "model": "opencode-go/kimi-k2.7-code" },
    "reviewer":    { "model": "opencode-go/qwen3.7-plus" }
  }
}
```

Defaults de roleflow (lo que aplica si tu config no dice lo contrario):

| Rol | Modelo | Va por |
|---|---|---|
| chat (`model`) | `zai-coding-plan/glm-5.3-flash` | ZAI $80 |
| `small_model` | `opencode-go/qwen3.7-plus` | Go $10 |
| `planner` | `zai-coding-plan/glm-5.3` | ZAI $80 |
| `explorer` | `zai-coding-plan/glm-5.3-flash` | ZAI $80 |
| `implementer` | `opencode-go/kimi-k2.7-code` | Go $10 |
| `reviewer` | `opencode-go/qwen3.7-plus` | Go $10 |

## Actualizar
- Cambios del sistema: se hacen aquí 1 vez y se publica nueva versión (`0.1.0` → `0.2.0`).
- Cada proyecto/server sube el pin cuando quiere. `latest` solo para pruebas.

## Sacar nueva versión (mantenedor)

```sh
# 1. ver qué haría (no escribe nada):
npm run release -- minor --dry-run
# patch | minor | major | 0.2.0

# 2. bump real (compila dist, valida ficheros, .gitignore, .env ignorado, npm pack --dry-run):
npm run release -- minor

# 3. revisar + publicar (lo haces tú):
git add package.json
git commit -m "release: v0.2.0"
git tag v0.2.0 && git push && git push --tags
npm publish --access public
```

El script nunca hace `push` ni `publish` solo. Si falta un fichero o `.env` no está ignorado, aborta.

## Estructura del repo
```
roleflow/
  src/index.ts            <- source (RoleflowPlugin, ships compiled to dist/)
  dist/index.js           <- build output, what OpenCode loads (`npm run build`)
  agents/*.md             <- 4 roles
  skills/*/SKILL.md       <- 2 skills
  scripts/setup.mjs       <- setup interactivo de keys (npm run setup)
  scripts/release.mjs     <- flujo release (npm run release -- minor)
  .env.example            <- placeholders, sin secretos
  postinstall.mjs         <- compat: copia agents/skills al config local
  preuninstall.mjs        <- limpieza al desinstalar
```
