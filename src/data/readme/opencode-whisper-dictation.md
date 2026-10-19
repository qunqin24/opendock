# plugin-whisper-dictation

[![npm opencode-whisper-dictation](https://img.shields.io/npm/v/opencode-whisper-dictation?label=opencode-whisper-dictation)](https://www.npmjs.com/package/opencode-whisper-dictation)
[![npm dsh-whisper-provider](https://img.shields.io/npm/v/dsh-whisper-provider?label=dsh-whisper-provider)](https://www.npmjs.com/package/dsh-whisper-provider)
[![license](https://img.shields.io/npm/l/opencode-whisper-dictation)](LICENSE)

Repositorio con **dos paquetes independientes** de dictado local con Whisper:

| Paquete | Para | Carpeta | Instalación |
|---|---|---|---|
| `opencode-whisper-dictation` | OpenCode v2 (TUI) | [`opencode/`](opencode/README.md) | `opencode plugin add opencode-whisper-dictation` |
| `dsh-whisper-provider` | DeepSeek Harness | [`dsh-whisper-provider/`](dsh-whisper-provider/README.md) | Plugins → Add plugin → `dsh-whisper-provider` |

## OpenCode

```bash
# npm (recomendado)
opencode plugin add opencode-whisper-dictation

# GitHub (el repositorio debe ser público; envoltorio raíz)
opencode plugin add github:muelabyte/plugin-whisper-dictation
```

Reinicia OpenCode y dicta en una sesión de la TUI. Detalles:
[opencode/README.md](opencode/README.md).

## DeepSeek Harness

1. **Plugins** → **Add plugin** → `dsh-whisper-provider` → **Install**.
2. **Enable now** → **Download and prepare**.
3. El micrófono aparece entre el selector de modelo y **Enviar**.

Desde GitHub, en **Add plugin** (el repositorio debe ser público):

```
git+https://github.com/muelabyte/plugin-whisper-dictation.git#path:/dsh-whisper-provider
```

Detalles: [dsh-whisper-provider/README.md](dsh-whisper-provider/README.md).

## Avisos

- **Todo es local**: el audio se procesa en el equipo y se borra; no se envía a
  ningún servidor.
- **Primera vez**: ~2 GB de descarga (Python gestionado, `faster-whisper` y modelo).
  No hace falta instalar Python ni ffmpeg: `uv` y `ffmpeg-static` lo resuelven.
- **OpenCode** solo en la TUI; Desktop/web no admite plugins de interfaz.
  Probado con OpenCode `2.0.32` en Windows 11.
- **DSH** es una integración experimental fijada a `0.2.1-rc.2` (probada en
  Windows 11, Escritorio). No actives a la vez el bundle oficial *Voice Input*.
- En DSH, si el micrófono no aparece tras instalar o actualizar, cierra la app
  **desde la bandeja** y vuelve a abrirla.

## Estado del proyecto

- **Actualizado:** 2026-10-19. Ambos paquetes están publicados y en uso:
  `opencode-whisper-dictation@0.2.1` y `dsh-whisper-provider@0.2.0`.
- **Pendiente:** prueba en máquina limpia con el modelo `medium`, macOS/Linux,
  verificar la instalación de DSH por nombre y cambiar el repositorio de GitHub
  a público.
- **Traspaso completo** (decisiones, evidencias, errores resueltos y tareas):
  [estado-proyecto/ESTADO-PROYECTO.md](estado-proyecto/ESTADO-PROYECTO.md).

## Desarrollo

Requisitos: **Node ≥ 20** y npm. Python, ffmpeg y el modelo se aprovisionan
solos en tiempo de ejecución.

```powershell
# Dependencias del paquete de OpenCode (solo para typecheck/desarrollo)
cd opencode; npm install --ignore-scripts; cd ..

# Comprobaciones que debe pasar cualquier cambio (desde la raíz)
npm run typecheck        # OpenCode (tsc)
npm test                 # DSH (node --test, 9 pruebas)
npm run pack:check       # npm pack --dry-run de OpenCode
npm run pack:check:dsh   # npm pack --dry-run de DSH
```

- `opencode/src/dictation.ts` es el **núcleo** (sin OpenCode); `tui.tsx` es solo
  el adaptador. El paquete de DSH no tiene dependencias de runtime propias.
- El `tsconfig.json` de `opencode/` **se publica**: sin él, la TUI crashea
  (`@jsxImportSource @opentui/solid`). Ver el estado del proyecto §3.7.
- CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta el typecheck
  (Ubuntu/Windows, Node 20/22), las pruebas del bundle de DSH y el `npm pack`.

Guía de publicación y rollback: [PUBLICAR.md](PUBLICAR.md).

## Estructura

```
plugin-whisper-dictation/
├─ opencode/                    # paquete de OpenCode
│  ├─ src/                      # plugin de servidor + adaptador de TUI
│  ├─ whisper/                  # sidecar HTTP (faster-whisper)
│  ├─ scripts/, examples/
│  ├─ package.json
│  └─ README.md
├─ dsh-whisper-provider/        # paquete de DeepSeek Harness
│  ├─ lib/                      # proveedor + motor
│  ├─ client.js                 # UI de voz
│  ├─ engine/                   # sidecar + requirements
│  ├─ package.json
│  └─ README.md
├─ index.ts / tui.tsx           # shims de compatibilidad para registro local
├─ package.json                 # envoltorio privado para instalación desde Git
├─ PUBLICAR.md                  # guía de publicación (mantenedor)
├─ estado-proyecto/             # documento de traspaso
└─ .github/workflows/ci.yml
```

## Licencia

MIT. Ver [LICENSE](LICENSE).
