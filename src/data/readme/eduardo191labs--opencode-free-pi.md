# @eduardo191labs/opencode-free-pi

Proveedor **free-pi** para [OpenCode](https://opencode.ai) 2.3.2 o superior:
modelos gratuitos financiados con anuncios, sin claves de API. Funciona en
**Windows, Linux, macOS y Termux**.

El paquete usa el SDK de plugins de OpenCode V2 (`@opencode/plugin`) y exporta
el plugin en el formato `Plugin.define({ id, setup })`.

## Requisitos

- OpenCode **2.3.2+**
- Node.js **20+**
- Una cuenta de free-pi (GitHub) o un JWT de free-pi

## Instalación desde npm

```bash
npm i -g @eduardo191labs/opencode-free-pi
opencode plugin add @eduardo191labs/opencode-free-pi@latest
opencode plugin list
```

`opencode plugin add` instala el paquete dentro de la configuración de OpenCode
y lo añade a la lista `plugins`. Es la forma recomendada. En versiones antiguas
del CLI el subcomando equivalente es `opencode plugin --global ...`.

La lista debe mostrar `free-pi` como `active`. Si aparece `failed`, ejecuta
`opencode --print-logs` y revisa el `cause=` del log.

### Registro manual

Añade el paquete a la lista `plugins` de tu `opencode.json`:

```json
{
  "plugins": ["@eduardo191labs/opencode-free-pi"]
}
```

El `postinstall` del paquete hace esto automáticamente cuando la instalación es
global (`npm i -g`) o cuando defines `FREEPI_CONFIGURE=1`. No copia archivos a
`~/.config/opencode/plugins/`: el paquete debe seguir resolviéndose desde
`node_modules` porque importa `@opencode/plugin` en tiempo de ejecución.

## Iniciar sesión

```bash
opencode auth login free-pi
```

Métodos disponibles:

1. **GitHub OAuth**: abre el navegador y confirma el código. Si el navegador no
   está disponible, usa el flujo de dispositivo de GitHub.
2. **Pegar un JWT**: útil si ya tienes un token de free-pi.
3. **Variable de entorno**: define `FREEPI_JWT`.

El plugin también lee `~/.free-pi/agent/credentials.json`, el archivo que crea
`free-pi-cli`, como respaldo.

Después de iniciar sesión, ejecuta `/reload` en OpenCode o reinícialo.

## Qué hace

- Catálogo en vivo de modelos **free-pi** y **free-pi-defense**.
- Integración nativa de OpenCode V2 para credenciales OAuth, clave y entorno.
- Cuota diaria, créditos premium y límites con mensajes claros.
- **Límites reales de free-pi**: todos los modelos anuncian la ventana de
  contexto de 200k y el límite de salida de 32k que aplica el CLI del
  proveedor, aunque models.dev informe ventanas mayores para el modelo
  upstream. Así OpenCode compacta antes de que el servidor rechace la
  conversación.
- **Compactación integrada**: los errores `context_too_long` de free-pi se
  reescriben para que OpenCode los reconozca como desbordamiento de contexto y
  ejecute `/compact` automáticamente en vez de terminar el turno.
- Anuncios e impresiones asociados al turno correcto.
- Cada agente y subagente usa su propio `x-session-id`, `x-turn-id` y contexto
  de anuncios; nunca reutiliza los del agente principal.
- **Cierre de sesión**: free-pi limita la cuenta a 4 sesiones simultáneas. El
  plugin finaliza la sesión del proveedor cuando la ejecución del modelo
  termina (éxito, fallo o interrupción) y al apagar OpenCode.
- Recuperación automática del límite de sesiones concurrentes.
- **Catálogo y metadatos resistentes**: el catálogo de free-pi y el registro de
  models.dev se guardan en disco; si la red falla al arrancar se usan las copias
  locales en vez de quedarse sin modelos o sin límites de contexto.
- Compatible con rutas, credenciales y navegador de cada sistema operativo.

No incluye herramientas personalizadas. Usa las herramientas integradas de
OpenCode.

## Cabeceras enviadas

El plugin replica las cabeceras del plugin V1 de free-pi:

- **Modelo**: `authorization`, `x-session-id`, `x-client-version`,
  `x-turn-id` y `x-freepi-cost-exp` (cuando el catálogo asigna un experimento).
- **Anuncios** (`/ads/next`): `authorization`, `x-session-id`,
  `x-client-version`, `x-turn-id`, `x-ad-trigger`, `x-client-os`,
  `x-client-arch`, `x-client-timezone`, `x-client-locale` y `x-ad-context`.
- **Impresión** (`/ads/impression`): `authorization`, `content-type` y
  `x-session-id`.
- **Reset de sesión** (`/session/reset`): `authorization`,
  `x-client-version` y, cuando aplica, `x-session-id`.

Las respuestas `429` de límites largos se reescriben a un `400` con el mensaje
amigable, igual que en el plugin V1. Las respuestas `413` (o `429`/`400`) con
código `context_too_long`, `context_too_long_for_fallback` o `context_ceiling`
se reescriben a un `400` con el texto que OpenCode clasifica como
desbordamiento de contexto, para que dispare la compactación automática.

free-pi cobra en créditos contra una cuota diaria, no en USD por token. Por
eso los modelos se registran con costo `0`, igual que el CLI del proveedor; el
consumo real se consulta en `/me` y `/me/stats` y se refleja en los mensajes de
cuota y límite.

## Rutas por plataforma

| Elemento        | Windows                                                      | Linux / macOS / Termux                 |
| --------------- | ------------------------------------------------------------ | -------------------------------------- |
| Credenciales    | `%USERPROFILE%\.free-pi\agent\credentials.json`              | `~/.free-pi/agent/credentials.json`    |
| Config OpenCode | `%USERPROFILE%\.config\opencode\opencode.json[c]`            | `~/.config/opencode/opencode.json[c]`  |

Si `XDG_CONFIG_HOME` o `OPENCODE_CONFIG_DIR` están definidos, se respetan.

## Variables de entorno (opcionales)

| Variable                  | Uso                                                  |
| ------------------------- | ---------------------------------------------------- |
| `FREEPI_JWT`              | Token JWT directamente, sin archivo de credenciales. |
| `FREEPI_CREDENTIALS_PATH` | Ruta alternativa a `credentials.json`.               |
| `FREEPI_BASE_URL`         | Cambiar la URL base de la API.                       |
| `FREEPI_MODELS_URL`       | Cambiar el registro de modelos.                      |
| `FREEPI_NO_BROWSER=1`     | No abrir el navegador.                               |
| `FREEPI_DEVICE_LOGIN=1`   | Forzar inicio de sesión por dispositivo.             |
| `FREEPI_CONFIGURE=1`      | Registrar el paquete en `opencode.json` al instalar. |
| `OPENCODE_CONFIG_DIR`     | Directorio de configuración de OpenCode.             |
| `FREE_PI_CACHE_DIR`       | Directorio de caché del plugin.                      |
| `FREE_PI_LOG_FILE`        | Ruta alternativa del archivo de log del plugin.      |

No hay variables obligatorias.

## Caché y logs

El plugin guarda el catálogo de free-pi y el registro de models.dev en:

```text
~/.cache/opencode/free-pi/catalog.json
~/.cache/opencode/free-pi/models-dev.json
```

En Windows es `%USERPROFILE%\.cache\opencode\free-pi\`. El catálogo se reutiliza
hasta 24 h y el registro hasta 7 días si la red falla; cuando la petición
funciona, las copias se refrescan solas.

Los mensajes del plugin se escriben en la consola con el prefijo `[free-pi]` y
también en:

```text
~/.cache/opencode/free-pi/plugin.log
```

El archivo rota a `plugin.log.1` al llegar a 1 MB. Ejemplo:

```text
2026-11-21T08:20:00.000Z INFO [free-pi] Loaded 20 free-pi model(s) and 7 defense model(s)
2026-11-21T08:20:00.000Z WARN [free-pi] models.dev is unreachable; using cached model metadata {"reason":"request timed out"}
```

## Instalación rápida con script

### Windows (PowerShell)

```powershell
curl.exe -fsSL "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1" | powershell -NoProfile -ExecutionPolicy Bypass -Command -
```

Si tu terminal no acepta la tubería:

```powershell
curl.exe -fsSL -o "$env:TEMP\install-free-pi.ps1" "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\install-free-pi.ps1"
```

### Linux, macOS y Termux

```bash
curl -fsSL "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.sh" | bash
```

En Termux, si falta `curl`: `pkg install curl`.

## Paquete npm

El paquete incluye `dist/` compilado y tipos TypeScript:

```bash
npm pack
npm install -g ./eduardo191labs-opencode-free-pi-*.tgz
```

## Desarrollo

```bash
npm install
npm run typecheck
npm run build
npm test
```

Estructura:

```text
src/
  index.ts              export público
  plugin.ts             entrada V2 (Plugin.define)
  constants.ts          identificadores y valores por defecto
  types.ts              tipos del dominio
  state.ts              estado mutable por instancia
  deps.ts               dependencias compartidas
  logging.ts            logger con prefijo [free-pi]
  auth/                 OAuth, JWT, credenciales y conexión
  api/                  cuota y reset de sesión
  ads/                  contexto, turnos e impresiones
  catalog/              catálogo en vivo y registro models.dev
  errors/               parseo, mensajes y reescritura de límites
  integration/          integración y métodos de inicio de sesión
  session/              hooks, eventos, seguimiento y uso
  utils/                helpers pequeños (incluye cache.ts)
dist/                   build ESM y tipos
scripts/postinstall.mjs registro en opencode.json
test/smoke.mjs          prueba de humo del build
test/registry.mjs       caché y tolerancia a fallos de models.dev
test/models.mjs         capacidades, variantes, límites reales y costos
test/hooks.mjs          hooks de sesión, anuncios, cuota y compactación
```

## Desinstalar

1. Quita `@eduardo191labs/opencode-free-pi` de la lista `plugins` de tu
   `opencode.json`.
2. Desinstala el paquete:

```bash
npm uninstall -g @eduardo191labs/opencode-free-pi
```

3. Si tenías una copia antigua, borra
   `~/.config/opencode/plugins/opencode-free-pi.ts` (en Windows,
   `%USERPROFILE%\.config\opencode\plugins\opencode-free-pi.ts`).

## Privacidad

El plugin se comunica con `https://api.freepi.ai` para autenticación, cuota,
anuncios y completions. El contexto de anuncios se redacta antes de enviarse y
no se incluye en la petición al modelo. No incluye claves ni tokens en el
repositorio.

## Licencia

MIT
