# Habit Memory

Plugin local de OpenCode para guardar hábitos agregados, checkpoints y TODOs vinculados a proyectos, y para mostrar métricas de uso en su WebUI. No conserva el texto de las conversaciones ni de los prompts.

Requiere **Node.js 24 o posterior**.

## Instalación

### Desde npm

Añade el paquete a `plugins` en la configuración global de OpenCode (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["opencode-global-habit-profile"]
}
```

OpenCode lo carga desde npm; no hace falta clonar ni compilar. Si la configuración no se recarga sola, ejecuta `/reload`.

### Desde el repositorio

Requiere Node.js 24 o posterior. Clona el repositorio y compila la WebUI:

```sh
git clone git@github.com:GNR092/opencode-habit-memory.git
cd opencode-habit-memory
npm ci
npm run build
```

Añade la ruta absoluta del proyecto a `plugins`:

```json
{
  "plugins": ["/ruta/absoluta/al/opencode-habit-memory"]
}
```

Los datos se guardan en `$XDG_DATA_HOME/habit-memory-plugin/store-v1.json`; si `XDG_DATA_HOME` no está definido, se usa `~/.local/share/habit-memory-plugin/store-v1.json`.

## WebUI

La interfaz local tiene vistas separadas para **Informes**, **Puntos guardados**, **TODOs** por proyecto y **Métricas**; los grupos muestran el directorio cuando se conoce. Se actualiza sin recargar la página cuando cambia el store local o `metrics.db`; las métricas se escriben por lotes, así que un paso nuevo puede tardar hasta ~15 s en aparecer. En OpenCode, `/habit-memory-ui` la inicia y muestra su dirección; `/habit-memory-ui-stop` la detiene. Desde el proyecto, inicia la instancia en una terminal y detenla desde otra; `npm run ui:stop` sólo actúa sobre la instancia iniciada por `npm run ui`:

```sh
npm run ui
npm run ui:stop
```

El puerto predeterminado es `43109`; se puede cambiar con `HABIT_MEMORY_UI_PORT`. Si la instancia de OpenCode ya ocupa ese puerto, configura otro puerto para iniciar la instancia del proyecto.

### Métricas

La vista **Métricas** lee `GET /api/metrics` y muestra pasos, tokens de entrada sin caché, caché leída, salida y razonamiento. Incluye filtros de 7/30/90 días y por proyecto, agente, proveedor y modelo, una gráfica SVG de tokens, tablas por agente/modelo/proyecto/tipo ordenables por nombre, pasos o tokens, y un bloque de salud del propio plugin. El coste y su cobertura siguen disponibles en la API, pero no se muestran en la vista.

El detalle se guarda en `metrics.db`, en el mismo directorio que `store-v1.json`:

```text
$XDG_DATA_HOME/habit-memory-plugin/metrics.db
~/.local/share/habit-memory-plugin/metrics.db   # si XDG_DATA_HOME no está definido
```

`store-v1.json` no se modifica. `metrics.db` se actualiza con eventos de OpenCode (`session.step.ended` y `session.usage.recorded`), con un backfill aproximado de sesiones recientes y con retención de 90 días UTC. No guarda prompts, argumentos, rutas absolutas, títulos de sesión ni IDs crudos: usa hashes, basenames y etiquetas allowlisted. La vista no estima USD sin precios y no publica un total único de tokens; mantiene las series separadas.

Consulta [`docs/metrics.md`](docs/metrics.md) para el esquema SQLite, la API, la privacidad y el troubleshooting.

Tras actualizar el plugin, reinicia OpenCode o recarga el plugin para cargar la suscripción de eventos; recargar solo la WebUI no recarga `index.js`.

## Diagnóstico de errores

Los fallos de los comandos slash, las herramientas del plugin, las herramientas MCP y los comandos `npm run mcp`, `npm run ui` y `npm run ui:stop` se registran en JSONL en `$XDG_STATE_HOME/habit-memory-plugin/errors.log`; si `XDG_STATE_HOME` no está definido, se usa `~/.local/state/habit-memory-plugin/errors.log`. El archivo guarda el comando, la fase y detalles técnicos del error. No guarda argumentos, prompts ni transcripciones; también redacta secretos y IDs de sesión. El directorio usa permisos `0700`, el archivo `0600`, y se conserva el log actual y una copia rotada de hasta 256 KiB cada una.

Para consultar los errores recientes:

```sh
tail -n 50 "${XDG_STATE_HOME:-$HOME/.local/state}/habit-memory-plugin/errors.log"
```

## Publicación

El paquete se publica en npm con:

```sh
npm login
npm publish
```

Consulta la versión publicada con `npm view opencode-global-habit-profile version`.

`prepublishOnly` ejecuta las pruebas y el build. El paquete incluye `dist/`, así que quien lo instala desde npm no necesita compilar.

## Pruebas

```sh
npm test
```

Para configurar el servidor MCP local en clientes compatibles, consulta [`docs/mcp-setup.md`](docs/mcp-setup.md).

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
