# Habit Memory

Plugin local de OpenCode para guardar hábitos agregados, checkpoints y TODOs vinculados a proyectos. No conserva el texto de las conversaciones ni de los prompts.

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

Requiere Node.js 20 o posterior. Clona el repositorio y compila la WebUI:

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

La interfaz local tiene vistas separadas para informes, checkpoints y TODOs por proyecto; los grupos muestran el directorio cuando se conoce. Se actualiza en vivo cuando cambia el store local, sin recargar la página. En OpenCode, `/habit-memory-ui` la inicia y muestra su dirección; `/habit-memory-ui-stop` la detiene. También se puede iniciar desde el proyecto con:

```sh
npm run ui
```

El puerto predeterminado es `43109`; se puede cambiar con `HABIT_MEMORY_UI_PORT`.

## Publicación

```sh
npm login
npm publish
```

`prepublishOnly` ejecuta las pruebas y el build. El paquete incluye `dist/`, así que quien lo instala desde npm no necesita compilar.

## Pruebas

```sh
npm test
```

Para configurar el servidor MCP local en clientes compatibles, consulta [`docs/mcp-setup.md`](docs/mcp-setup.md).

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
