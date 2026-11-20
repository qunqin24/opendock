# @eduardo191labs/opencode-free-pi

Proveedor **free-pi** para [OpenCode](https://opencode.ai): modelos gratuitos
financiados con anuncios, sin claves de API. Funciona en **Windows, Linux, macOS
y Termux**.

## Instalación desde npm

```bash
npm i -g @eduardo191labs/opencode-free-pi
opencode plugin --global @eduardo191labs/opencode-free-pi
```

El primer comando instala el paquete y sus dependencias. El segundo instala
las dependencias dentro de la configuración de OpenCode, escribe la entrada
`plugin` y es la forma recomendada, porque npm 12 bloquea los scripts de
instalación por defecto. En versiones nuevas de OpenCode el subcomando es
`opencode plugin add`.

El `postinstall` del paquete copia el plugin a
`~/.config/opencode/plugins/opencode-free-pi.ts` (en Windows,
`%USERPROFILE%\.config\opencode\plugins\opencode-free-pi.ts`) para que
OpenCode lo descubra automáticamente. Si tu npm bloquea scripts, ejecuta
también `opencode plugin --global @eduardo191labs/opencode-free-pi` (o
`opencode plugin add ...` en versiones nuevas).

Para una instalación local sin `-g`, fuerza el registro con
`FREEPI_CONFIGURE=1 npm install`.

### OpenCode 2

OpenCode 2 usa la entrada `plugins` (plural) y carga el paquete desde su
`exports`. Este paquete exporta las dos formas: el `server` de OpenCode 1.x y
el `setup` de OpenCode 2, así que el mismo paquete funciona en ambos.

```bash
opencode plugin add @eduardo191labs/opencode-free-pi@latest
opencode plugin list
```

La lista debe mostrar `free-pi` como `active`, con la versión del paquete. Si
aparece `failed`, ejecuta `opencode --print-logs` y revisa el `cause=` del log;
el `ref=` solo no contiene el motivo.

`opencode plugin add` acumula versiones exactas en `plugins`. Si antes
instalaste otra versión, la entrada vieja queda como `failed` y no muestra
`id` ni `version`. Elimínala y deja solo una:

```bash
opencode plugin remove @eduardo191labs/opencode-free-pi@0.2.3
opencode plugin list
```

El `postinstall` antiguo copiaba `dist/index.js` a
`~/.config/opencode/plugins/opencode-free-pi.ts`. Ese archivo local no tiene
versión de paquete y puede quedar desactualizado; en OpenCode 2 bórralo para
que no compita con el paquete:

```powershell
Remove-Item "$env:USERPROFILE\.config\opencode\plugins\opencode-free-pi.ts" -Force -ErrorAction SilentlyContinue
```

```bash
rm -f ~/.config/opencode/plugins/opencode-free-pi.ts
```

En OpenCode 2 el proveedor y las herramientas se registran igual. El plugin
también registra la integración `free-pi`, así que el inicio de sesión
interactivo funciona en OpenCode 2:

```bash
opencode auth login free-pi
```

Puedes elegir GitHub o pegar un JWT. Las credenciales también se leen de
`FREEPI_JWT` o de `~/.free-pi/agent/credentials.json`.

## Instalación rápida con script

> Pasa el cursor por el bloque de comandos y usa el icono de copiar de GitHub.
> No necesitas definir variables de entorno para instalar.

### Windows (PowerShell + curl)

```powershell
curl.exe -fsSL "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1" | powershell -NoProfile -ExecutionPolicy Bypass -Command -
```

Si tu terminal no acepta la tubería, descarga y ejecuta el `.ps1`:

```powershell
curl.exe -fsSL -o "$env:TEMP\install-free-pi.ps1" "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\install-free-pi.ps1"
```

Alternativa si `curl.exe` no está disponible:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1' | iex"
```

### Linux, macOS y Termux

```bash
curl -fsSL "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.sh" | bash
```

En Termux, si falta `curl`:

```bash
pkg install curl
```

## Después de instalar

OpenCode 2:

```bash
opencode auth login free-pi
opencode
```

OpenCode 1.x:

```bash
opencode auth login -p free-pi
opencode
```

El plugin se registra como proveedor `free-pi`, elige un modelo gratuito por
defecto y desactiva el agente `title` para no gastar una petición extra.

## Qué hace

- Catálogo de modelos free-pi y free-pi-defense en vivo.
- Inicio de sesión con GitHub, dispositivo o JWT existente.
- Cuota diaria, créditos premium y límites con mensajes claros.
- Anuncios e impresiones asociados al turno correcto.
- Herramientas: `free_pi_usage`, `free_pi_buy_credits`, `free_pi_redeem`,
  `free_pi_invite`, `free_pi_feedback`, `free_pi_dashboard`, `web_search`,
  `docs_lookup`, `look_at_image`, `generate_image` y más.
- Recuperación automática del límite de sesiones concurrentes.
- Compatible con rutas, credenciales y navegador de cada sistema operativo.

## Rutas por plataforma

| Elemento        | Windows                                                      | Linux / macOS / Termux                           |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Plugin          | `%USERPROFILE%\.config\opencode\plugins\opencode-free-pi.ts` | `~/.config/opencode/plugins/opencode-free-pi.ts` |
| Credenciales    | `%USERPROFILE%\.free-pi\agent\credentials.json`              | `~/.free-pi/agent/credentials.json`              |
| Config OpenCode | `%USERPROFILE%\.config\opencode\opencode.json[c]`            | `~/.config/opencode/opencode.json[c]`            |

Si `XDG_CONFIG_HOME` o `OPENCODE_CONFIG_DIR` están definidos, el instalador los
respeta.

## Variables de entorno (opcionales)

| Variable                  | Uso                                                  |
| ------------------------- | ---------------------------------------------------- |
| `FREEPI_JWT`              | Token JWT directamente, sin archivo de credenciales. |
| `FREEPI_CREDENTIALS_PATH` | Ruta alternativa a `credentials.json`.               |
| `FREEPI_BASE_URL`         | Cambiar la URL base de la API.                       |
| `FREEPI_MODELS_URL`       | Cambiar el registro de modelos.                      |
| `FREEPI_NO_BROWSER=1`     | No abrir el navegador.                               |
| `FREEPI_DEVICE_LOGIN=1`   | Forzar inicio de sesión por dispositivo.             |
| `OPENCODE_CONFIG_DIR`     | Directorio de configuración de OpenCode.             |

No hay variables obligatorias. El plugin usa el entorno nativo de cada sistema
para `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `APPDATA` cuando aplica, Termux y
Windows.

## Paquete npm

El paquete incluye `dist/index.js` ya compilado y tipos TypeScript:

```bash
npm pack
npm install -g ./eduardo191labs-opencode-free-pi-*.tgz
```

También puedes declararlo en OpenCode como plugin npm:

```json
{
  "plugin": ["@eduardo191labs/opencode-free-pi"]
}
```

El comando `opencode plugin` es la instalación recomendada. El script sigue
siendo útil si prefieres copiar el archivo directamente a la carpeta de plugins.

## Publicación automática

Cada push a `main` ejecuta `.github/workflows/publish.yml`, compila, empaqueta,
comprueba la última versión en npm, sube un patch si ya existe, publica el
paquete y crea el commit `chore(release): vX.Y.Z [skip ci]` con el tag
`vX.Y.Z`. El workflow también actualiza `dist/` en ese commit.

El workflow usa el secret `NPM_TOKEN` del repositorio. Para una prueba sin
publicar, ejecuta el workflow manualmente con `publish = false`.

Después de un push, haz `git pull` para recibir el commit de versión que crea el
workflow.

## Desarrollo

```bash
npm install
npm run typecheck
npm run build
npm pack
```

Estructura:

```text
src/index.ts      código fuente del plugin
dist/index.js     build ESM listo para OpenCode
dist/index.d.ts   tipos
install.sh        instalador Linux/macOS/Termux
install.ps1       instalador Windows PowerShell
```

## Desinstalar

Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Join-Path $env:TEMP 'install-free-pi.ps1'; irm 'https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.ps1' -OutFile $p; & $p -Uninstall"
```

Linux/macOS/Termux:

```bash
curl -fsSL "https://raw.githubusercontent.com/eduardo191-star/opencode-free-pi/main/install.sh" | bash -s -- --uninstall
```

O borra manualmente `opencode-free-pi.ts` de la carpeta de plugins y reinicia
OpenCode.

## Privacidad

El plugin se comunica con `https://api.freepi.ai` para autenticación, cuota,
anuncios y completions. El contexto de anuncios no se envía al modelo. No
incluye claves ni tokens en el repositorio.

## Licencia

MIT
