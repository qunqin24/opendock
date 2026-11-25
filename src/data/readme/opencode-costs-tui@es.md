# opencode-costs

**Español** · [English](README.md)

[![versión npm](https://img.shields.io/npm/v/opencode-costs-tui.svg)](https://www.npmjs.com/package/opencode-costs-tui)
[![descargas npm](https://img.shields.io/npm/dm/opencode-costs-tui.svg)](https://www.npmjs.com/package/opencode-costs-tui)
[![licencia](https://img.shields.io/npm/l/opencode-costs-tui.svg)](LICENSE)

Panel de costes en la barra lateral de **OpenCode 2.x**: coste y tokens por agente de la sesión activa **y de todos sus subagentes**.

![Panel de opencode-costs en el sidebar](docs/images/sidebar.png)

> **Tokens en lugar de dólares.** OpenCode 1.x guardaba un coste en dólares por sesión, así que el CLI antiguo mostraba el gasto de la sesión padre y de sus subagentes en USD. OpenCode 2.x reporta `cost: 0` para modelos de suscripción o gratuitos — por ejemplo todo el catálogo de `opencode-go` — aunque el modelo tenga precio de lista. Por eso el panel muestra dólares **cuando el host los reporta**, y si no, pasa a tokens en el total, en el valor de cada sesión y en el porcentaje. Nunca inventa un precio. Para el gasto facturado de un plan Go, usa el panel de cuota.

## Qué muestra

- **Cabecera**: coste total de la familia de sesiones (la sesión más todos sus descendientes), con un conmutador `▾`/`▸`.
- **Una fila por sesión**: coste (o tokens, cuando el modelo no tiene precio), porcentaje sobre el total de la familia y sangría según la profundidad del subagente. Los subagentes terminados siguen listados.
- **Pie**: número de sesiones de la familia y tokens agregados de entrada / salida / razonamiento.
- **En vivo**: se repinta con cada evento de sesión que emite OpenCode, más una sincronización de seguridad cada 30 segundos.

Haz clic en la cabecera para plegar el panel; la elección se guarda en el estado duradero del plugin.

## Por qué 2.0 es una reescritura

La versión 1.x era un CLI en Python (`costs`) que leía la base SQLite de OpenCode. Se rompió con OpenCode 2.x por dos motivos independientes:

1. **La base de datos cambió.** OpenCode 1.x escribía las sesiones en `session`; 2.x escribe las nuevas en `session_v2` (y los mensajes en `session_message`). Las tablas antiguas dejan de recibir filas, así que el CLI seguía mostrando una sesión vieja y sus subagentes desaparecían.
2. **Los plugins de TUI cambiaron.** En OpenCode 2.x un plugin de barra lateral es un **paquete npm** que usa la API `@opencode/plugin/tui`; los archivos locales y las entradas antiguas de `tui.json` no se cargan. Tampoco cabe un comando de menú al lado.

Por eso 2.0 elimina el CLI y el motor en Python. El panel lee el almacén de sesiones de OpenCode en ejecución: sin SQLite, sin proceso externo y sin un segundo runtime. Como contrapartida, **solo soporta OpenCode 2.x**; `1.x` deja de estar soportado.


## Limitación conocida (OpenCode 2.4.0)

La barra lateral no se repinta cuando un plugin cambia su propio estado. El panel pide datos frescos cada 10 segundos (verificado), pero el host solo pinta los valores nuevos en su siguiente render — por ejemplo al hacer clic en la cabecera o al cambiar de sesión. Es comportamiento del host, no un problema de datos; `renderer.requestRender()` ni escribir en un store del host lo cambian. Reportado upstream: https://github.com/anomalyco/opencode/issues/66252.

## Instalación

Los plugins de TUI se listan en `~/.config/opencode/cli.json`, no en `opencode.jsonc`. (`opencode plugin add` registra plugins **de servidor**, que no es el caso de este paquete.)

```json
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-costs-tui"]
}
```

O ejecuta el instalador, que parchea ese archivo por ti:

```sh
curl -fsSL https://raw.githubusercontent.com/caertos/opencode-costs/main/install.sh | sh
```

Reinicia OpenCode (o ejecuta `/reload`). El panel aparece al principio de la barra lateral de la sesión.

Desinstalar: elimina `opencode-costs-tui` de `~/.config/opencode/cli.json` → `plugins`.

## Qué significan los números

- **Coste**: sale de la contabilidad de sesiones de OpenCode. Si el proveedor o el modelo no tienen precio configurado (algunas capas gratuitas, modelos locales), el coste es `$0.00` y los tokens se siguen mostrando.
- **Familia**: la sesión que estás viendo más todas aquellas cuya cadena de `parentID` empieza ahí. Incluye los subagentes que crean las herramientas de tarea/delegación.
- **Filas**: son sesiones individuales, para ver qué subagente gastó qué. Cuando toda la familia reporta `$0.00` (modelo sin precio o gratuito), las columnas de valor y porcentaje pasan a tokens en vez de mostrar una columna de ceros.

## Requisitos

- OpenCode **2.x** con la API de plugins de TUI (verificado en 2.4.0).
- Sin Python, sin acceso a la base de datos y sin claves: el plugin solo formatea datos que el host ya tiene.

## Desarrollo

```sh
npm test          # tests de lógica pura (node --test)
npm run build     # src/tui.tsx -> dist/tui.js (esbuild vía npx)
```

`dist/` se compila y se versiona, porque OpenCode solo activa paquetes cuyo entrypoint de TUI es un archivo JavaScript.

## Licencia

MIT
