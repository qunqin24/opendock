# Roleflow (plugin OpenCode, público)

[![npm version](https://img.shields.io/npm/v/roleflow.svg)](https://www.npmjs.com/package/roleflow) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Un paquete público = toda tu estructura de desarrollo con IA. Lo actualizas 1 vez, todos tus proyectos, tu PC y cualquier server lo heredan. Nada de copiar a mano.

## Qué trae
- 4 agentes: `planner` (glm-5.3, caro/poco uso), `explorer` (flash barato), `implementer` (k2.7-code tractor), `reviewer` (solo diff).
- 2 skills: `create-task`, `pr-review`.
- Hooks anti-quema: trunca outputs gigantes (`read`/`bash`/`grep` >6000 chars), preserva estado al compactar, defaults baratos que cada proyecto puede sobreescribir.

## Requisitos
- Node.js 18+ y OpenCode instalados.
- Suscripciones/keys según tu stack (ver tabla abajo). Las keys NUNCA van en este repo.

## Instalación desde cualquier lugar

1. En el `opencode.json` de tu proyecto agrega:
```json
{ "$schema": "https://opencode.ai/config.json", "plugin": ["roleflow"] }
```
2. Instala (el usuario lo corre en su máquina/server):
```sh
npm install roleflow
```
3. Configura las keys con el setup interactivo (no quedan en el repo):
```sh
npm run setup
set -a; source .env; set +a
```
4. Abre OpenCode en tu proyecto. El plugin aplica routing + recorte + compactación en vivo; el `postinstall` deja agentes/skills en `~/.config/opencode/` solo por compatibilidad.

Proyectos estables pinean versión para no romperse con updates:
```json
{ "plugin": ["roleflow@1.0.0"] }
```

## Dependencias: API keys

| Variable | Para qué | Dónde se consigue | Obligatoria |
|---|---|---|---|
| `ZAI_API_KEY` | GLM Coding Plan (planner `glm-5.3`) | Panel de Z.ai → API keys | Sí |
| `OPENCODE_GO_API_KEY` | Pool barato Go (flash / k2.7-code / qwen-plus) | opencode.ai → Go → API key | Sí |
| `OPENCODE_ZEN_API_KEY` | Buffer pay-as-you-go para picos | opencode.ai → Zen | No |

El setup interactivo (`npm run setup`) las pide ocultando lo tecleado, las guarda en `.env` (gitignored, nunca se publica) y te muestra cómo exportarlas. Hay un `.env.example` con placeholders como guía. Si prefieres no usar `.env`, exporta las mismas variables en tu server por el método que uses (systemd env, Docker secrets, CI secrets, etc).

## Actualizar
- Cambios del sistema: se hacen aquí 1 vez y se publica nueva versión (`0.1.0` → `0.2.0`).
- Cada proyecto/server sube el pin cuando quiere. `latest` solo para pruebas.

## Sacar nueva versión (mantenedor)

```sh
# 1. ver qué haría (no escribe nada):
npm run release -- minor --dry-run
# patch | minor | major | 0.2.0

# 2. bump real (valida ficheros, .gitignore, .env ignorado, npm pack --dry-run):
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
  src/index.ts            <- hooks vivos (routing, recorte, compactación)
  agents/*.md             <- 4 roles
  skills/*/SKILL.md       <- 2 skills
  scripts/setup.mjs       <- setup interactivo de keys (npm run setup)
  scripts/release.mjs     <- flujo release (npm run release -- minor)
  .env.example            <- placeholders, sin secretos
  postinstall.mjs         <- compat: copia agents/skills al config local
  preuninstall.mjs        <- limpieza al desinstalar
```
