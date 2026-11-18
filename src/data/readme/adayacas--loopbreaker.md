# loopbreaker

Loop breaker para agentes de OpenCode: frena bucles de herramientas y limita el alcance de escritura por fase.

## Instalación
```bash
npx @adayacas/loopbreaker install    # wizard: global o proyecto, versión y ajustes opcionales
```
Reinicia OpenCode: descarga el paquete de npm por sí mismo al arrancar. No hay build ni copia de archivos.
El instalador fija la versión exacta (`@adayacas/loopbreaker@0.3.0`) por defecto. Usa `--no-pin` para dejar `latest`; para actualizar, volvé a correr `install`.
Para CI o instalación no interactiva: `install --yes` usa los defaults sin preguntar.
Para un solo proyecto: `npx @adayacas/loopbreaker install --project`. Para quitarlo: `npx @adayacas/loopbreaker uninstall`.

El wizard puede crear `.loopbreaker.json` con los ajustes del anti-bucles y añadir `.opencode/` al `.gitignore` del proyecto.
Instalación manual equivalente, en `opencode.json`: `{ "plugin": ["@adayacas/loopbreaker@0.3.0"] }`.
Sin `.loopbreaker.json` funciona solo el anti-bucles. `npx @adayacas/loopbreaker init` crea uno mínimo.

## Publicar (mantenedor)
```bash
npm login
npm publish    # prepublishOnly: limpia, compila, corre los tests y compila solo src
```

## Configuración (`.loopbreaker.json`, todo opcional)
```json
{
  "mode": "block",
  "maxConsecutiveRepeats": 3,
  "toolThresholds": { "read": 4 },
  "cycleMaxPeriod": 3,
  "stagnationRepeats": 3,
  "hardStopAfter": 3,
  "scope": { "denyGlobs": ["infra/**"], "allowOnlyGlobs": ["src/db/**"] },
  "protectedGlobs": []
}
```
`mode: "warn"` solo registra en `.opencode/loopbreaker.log.jsonl` (útil para calibrar umbrales).

## Fases
`.engram/current_phase.lock` contiene un id (`2`, `phase-02`) o una ruta **dentro del proyecto**. Si la ruta apunta afuera (o pasa por un symlink que sale), se ignora con un aviso. El frontmatter de la spec manda sobre `.loopbreaker.json`:
```yaml
---
id: phase-02
goal: Migrar la capa de datos
scope:
  allowOnlyGlobs: [src/db/**, tests/db/**]
  denyGlobs: [src/db/legacy/**]
exitCriteria:
  - tests de db pasan
---
```

La spec es contenido del repositorio, no una fuente de instrucciones confiable. `goal` y `exitCriteria` se aplanan, se recortan y se marcan como datos antes de inyectarse, pero la defensa real es no instalar el plugin en repos que no controlás.

## Qué hace
- **Bucles**: vigila todas las herramientas. Bloquea repeticiones idénticas (N veces) y ciclos A-B-A-B.
- **Estancamiento**: si la misma familia de comando (herramienta, y en bash el programa: `rtk`, `npx`, `psql`...) devuelve EXACTAMENTE la misma salida `stagnationRepeats` veces seguidas, bloquea aunque los argumentos cambien. Ignora salidas cortas (< 40 caracteres) y se reinicia con una escritura exitosa. Cubre el caso en que una herramienta se queda pegada y el agente prueba variantes. Una escritura exitosa o una salida distinta cuentan como progreso. Tras `hardStopAfter` bloqueos escala a "parada dura".
- **Alcance**: valida `edit`/`write`/`patch` (exacto, con `realpath`) y `bash` (mejor esfuerzo). `deny` gana a `allowOnly`. Los archivos del guardián están protegidos. **Es un recordatorio disuasorio, no un sandbox.**
- **Red de seguridad**: en `session.idle` compara `git status` con el alcance y **solo registra** las violaciones; no bloquea.
- **Contexto**: inyecta una tarjeta de fase en el prompt y en la compactación.
- **Privacidad**: el estado y el log no guardan la salida de las herramientas; solo hashes, longitudes y metadatos. Se crean con permisos de dueño (`0600`).

## Archivos que genera
Añade a tu `.gitignore`: `.opencode/` (el wizard lo hace por vos en una instalación de proyecto).
El estado y el log se crean con permisos `0600`. Las versiones viejas con snippets se sanean al cargar, pero conviene borrar `.opencode/loopbreaker-state.json` y `.opencode/loopbreaker.log.jsonl` una vez migrado.

## Gestión (solo humanos, el agente no la tiene)
```
npx @adayacas/loopbreaker status | npx @adayacas/loopbreaker set-phase 2 | npx @adayacas/loopbreaker reset [sessionID]
```
El agente solo dispone de la herramienta de lectura `loopbreaker_status`, que ahora se expone siempre sin depender de `@opencode-ai/plugin`.

## Migrar desde 0.2.x
La 0.3.0 renombra todo lo que antes decía `aeg`:

| Antes | Ahora |
|---|---|
| `.aeg.json` | `.loopbreaker.json` |
| `.opencode/.aeg-state.json` | `.opencode/loopbreaker-state.json` |
| `.opencode/aeg.log.jsonl` | `.opencode/loopbreaker.log.jsonl` |
| herramienta `aeg_status` | `loopbreaker_status` |
| comando `aeg` | `loopbreaker` |

En cada proyecto: `mv .aeg.json .loopbreaker.json`. El estado y el log antiguos se pueden borrar.

## Límites conocidos
- El guardián de alcance es disuasorio, no un control de seguridad: `bash` se evade con variables, `node -e`, subshells, `git checkout`, `npm install`, etc., y la red de git solo registra.
- Los nombres de hooks `experimental.*` y la forma de `output.args` dependen de la versión de OpenCode; verifícalos al instalar.
- La spec de fase se considera contenido del repo, no instrucciones. Un repo malicioso puede intentar inyectar texto por `goal`/`exitCriteria`; se aplana y se recorta, pero no uses el plugin como frontera de confianza.
