# opencode-handsfree

Voz bidireccional manos libres para **OpenCode Desktop**.

[![CI](https://github.com/antmarpen/OpenCode-HandsFree/actions/workflows/ci.yml/badge.svg)](https://github.com/antmarpen/OpenCode-HandsFree/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenCode Desktop](https://img.shields.io/badge/OpenCode-Desktop-blue)](https://opencode.ai)

[English](README.md) | [Español](README.es.md)

## Qué hace

- **Dictado**: graba el micrófono, lo transcribe con un modelo local de voz a texto o con un proveedor compatible con OpenAI, y deja el texto en el compositor.
- **Lectura de respuestas**: lee en voz alta cada bloque de texto del asistente con la voz del sistema operativo o con un motor de texto a voz en la nube.
- **Modo conversación (experimental)**: escucha solo, cierra el turno al detectar silencio, envía el mensaje, lee la respuesta y vuelve a escuchar.
- **Interruptores por chat** de entrada y salida, persistentes por sesión, más una página de ajustes en **Settings > Voice**.

## Requisitos

- **OpenCode Desktop** con la API experimental de plugins GUI. La parte GUI se carga solo desde la entrada del plugin en el `opencode.json(c)` **global**.
- **Plataforma**: solo se ha probado en Windows en tiempo de ejecución. Las rutas de los motores locales de macOS y Linux existen en el código pero no están verificadas; el CI solo comprueba que el proyecto compila en Linux.
- **Node.js** `20.19+` o `22.12+` para compilar (Vite 7).
- **Dictado local** (opcional): un ejecutable de voz a texto compatible con `whisper.cpp` (`whisper-cli`, `main.exe`, ...) y un modelo `ggml-*.bin`. El plugin graba WAV 16 kHz mono, así que no hace falta ffmpeg.
- **Lectura local** (opcional): voces SAPI en Windows, `say` en macOS, `espeak-ng` en Linux.
- **Nube** (opcional): cualquier proveedor que implemente el contrato de OpenAI `/audio/transcriptions` y `/audio/speech`.

## Cómo funciona

1. La ventana graba el micrófono y codifica en memoria un WAV mono de 16 kHz.
2. El proceso principal lo transcribe con el ejecutable local o con el proveedor configurado y devuelve el texto.
3. El texto va al compositor del chat o se envía como prompt si `autoSend` está activo.
4. Cuando el asistente termina un bloque de texto, el plugin lo sintetiza con la voz local o el TTS en la nube y lo reproduce en la ventana, para poder elegir el dispositivo de salida.
5. El modo conversación encadena esos pasos: escucha, cierra el turno al detectar silencio, envía el prompt, lee la respuesta y vuelve a escuchar.

Las claves y las credenciales del proveedor se quedan en el proceso principal. La ventana solo envía texto y audio en base64, y el audio se borra de la carpeta temporal después de cada petición.

## Instalación

### Desde npm (recomendado)

El paquete publicado incluye el bundle GUI ya construido, así que no hay que compilar nada en tu máquina.

```sh
opencode plugin add opencode-handsfree
```

O añádelo al array `plugins` de tu `opencode.jsonc` **global** (normalmente `%USERPROFILE%\.config\opencode\opencode.jsonc` en Windows o `~/.config/opencode/opencode.jsonc` en el resto):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-handsfree"]
}
```

Fija una versión con `opencode-handsfree@0.1.0`. Reinicia OpenCode Desktop tras la primera instalación.

### Desde el código fuente

Para desarrollar, clona el repositorio, instala dependencias y compila una vez, y apunta `plugins` a la ruta absoluta:

```powershell
git clone https://github.com/antmarpen/OpenCode-HandsFree.git
cd opencode-handsfree
npm ci
npm run build
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["C:/ruta/a/opencode-handsfree"]
}
```

Después de cada recompilación la parte GUI se recarga en todas las ventanas; un método Ipc nuevo necesita un reinicio completo.

## Uso

### Atajos y comandos

| Acción | Cómo |
| --- | --- |
| Iniciar o parar el dictado | `mod+shift+space`, `/dictate` o el icono del micrófono |
| Dictar con el prompt vacío | `Enter` |
| Activar o desactivar la voz en este chat | `/voice on`, `/voice off` |
| Elegir una dirección | `/voice input`, `/voice output` |
| Abrir los ajustes | `/voice settings` |
| Leer o callar las respuestas | `/speak`, `/shush` |
| Cancelar grabación o transcripción | `Escape` (si no hay dictado, interrumpe la sesión como siempre) |

Con `autoSend` desactivado, el texto se inserta en el compositor para revisarlo. Activado, el mensaje se envía en cuanto termina la transcripción.

### Píldora del compositor

- Mientras graba muestra la onda en vivo (64 barras simétricas) y una `✕` al final que cancela el dictado; al transcribir quedan el icono y la `✕` dentro de la píldora.
- El micrófono solo aparece cuando el dictado tiene un proveedor configurado y el interruptor de dictado del chat está activado.
- Mientras se lee una respuesta, esa misma píldora muestra un **stop** que corta la cola y el audio en curso.
- En modo conversación la píldora cambia al icono de conversación; al pulsarla empieza el ciclo.

| Grabando | Transcribiendo | Modo conversación |
| --- | --- | --- |
| ![Píldora del compositor grabando](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/dictate-recording.png) | ![Píldora del compositor transcribiendo](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/dictate-transcribe.png) | ![Píldora del compositor en modo conversación](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/conversation.png) |

### Encabezado del chat

- El engranaje está siempre visible y abre un popover con los dos interruptores (entrada y salida) alineados a la derecha y el acceso a **Settings > Voice**.
- Los iconos de micrófono y de bocadillo aparecen solo si su dirección está configurada.
- Cada chat conserva sus interruptores en el store de sesión del plugin; los chats nuevos heredan el valor por defecto de los ajustes.
- El interruptor de dictado es la puerta única: con él apagado no hay icono de micrófono, `Enter` y el atajo no dictan, y apagarlo mientras graba o transcribe cancela el trabajo.

![Menú de voz del encabezado](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/session-header-options.png)

### Modo conversación

- Lleva el micrófono, el turno del asistente y la reproducción como un solo ciclo. Mientras está activo, los interruptores de entrada y salida quedan bloqueados juntos.
- Si hablas mientras se lee la respuesta, la lectura se corta y tu turno se envía en cuanto callas.
- Con una respuesta sonando, el extremo de la píldora muestra el stop y solo calla la voz.
- La `✕`, `Escape` o volver a pulsar la píldora detiene el ciclo y deja el modo listo para volver a empezar.
- El ciclo se detiene si cambias de chat. El micrófono queda abierto mientras esperas y mientras se lee, así que con altavoces conviene usar auriculares.

## Settings > Voice

La página tiene tres pestañas.

![Ajustes de entrada](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-input.png)

![Ajustes de salida](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-output.png)

![Ajustes experimentales](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-experimental.png)

**Entrada**

- Motor: `Local` o `Nube`.
- Micrófono: cualquier dispositivo de entrada o el predeterminado del sistema.
- Proveedor: reutilizar un proveedor de OpenCode (se usan su URL y su credencial automáticamente, sin escribir URL ni clave) o `Manual` con la URL y la clave del plugin.
- Los modelos se cargan solo después de configurar el proveedor o la URL y la clave. Al cambiar de proveedor se deselecciona el modelo. El selector es un diálogo con buscador que lista todos los modelos (los de audio primero); si el proveedor devuelve modelos hay que elegir uno, y el campo de texto queda solo como respaldo cuando no se carga ninguno.
- Motor local: ruta o comando del ejecutable de voz a texto, fichero de modelo e idioma.

**Salida**

- Motor: `Local` o `Nube`.
- Dispositivo de salida: cualquier salida o el predeterminado del sistema.
- Nube: modelo, voz y formato de respuesta, con las mismas reglas de proveedor o manual que la entrada.
- Local: hay que activar explícitamente la voz del sistema antes de que se puedan leer respuestas; las voces se listan del sistema operativo y la velocidad es ajustable.
- **Probar** reproduce una muestra corta con los ajustes de salida actuales.

**Experimental**

- Empezar los chats nuevos en modo conversación.
- Silencio tras la voz que cierra el turno (1200 ms por defecto).
- Cerrar el micrófono cuando la ventana no tiene el foco.

La página también fija los valores por defecto de los interruptores por chat.

Las claves de API manuales se cifran en reposo con el llavero del sistema operativo (`safeStorage`, DPAPI en Windows) y nunca se escriben en `opencode.json` ni en los logs. Si el llavero no está disponible, la clave se guarda como texto plano y se avisa en el log.

## Desarrollo

```powershell
npm run watch   # recompila dist/gui-experimental.cjs al guardar
npm run typecheck
npm run build
```

Cada recompilación recarga la GUI en todas las ventanas. Si añades o cambias **métodos Ipc**, reinicia OpenCode Desktop para que el proceso principal registre el contrato nuevo; la línea `voice: main ready { version }` indica qué bundle cargó main. Todavía no hay tests automáticos; los helpers puros (`text.ts`, `audio/wav.ts`, `audio/meter.ts`, `main/urls.ts`) se mantienen sin APIs del host para poder añadirlos.

## Estructura del proyecto

- `src/index.ts`, `src/rpc.ts`: mitad servidor mínima (id del plugin y RPC de credenciales).
- `src/gui.tsx`: entrada GUI que compone la definición, el setup de ventana y el proceso principal.
- `src/gui/audio/`: helpers puros de WAV, medición y dispositivos.
- `src/gui/main/`: secretos, credenciales, ejecución de procesos, transcripción, voz, modelos, voces y temporales.
- `src/gui/window/`: dictado, bucle de conversación, entrega, reproducción, respuestas, comandos, píldora y encabezado.
- `src/gui/settings/`: página de ajustes, filas y selectores de proveedor, modelo y voz.
- `src/gui/i18n/`: catálogos en inglés y español.

## Seguridad

- Las claves de API se cifran con el llavero del sistema operativo (`safeStorage`/DPAPI) y nunca se escriben en `opencode.json` ni en los logs. Con un motor en la nube activo, la clave solo se envía al endpoint del proveedor que hayas configurado.
- Las credenciales del proveedor se resuelven bajo demanda en la mitad del servidor local, así que el plugin nunca las copia a su propio almacenamiento.
- Los clips dictados y las respuestas sintetizadas se escriben en el directorio temporal del sistema solo mientras dura una petición y se borran después.

## Notas de comportamiento

- El audio se captura en la ventana y se envía al proceso principal como WAV en base64. Main sintetiza la voz y la ventana la reproduce con `<audio>` y `setSinkId`, que es la única forma de elegir el dispositivo de salida; Chromium decodifica WAV y MP3 sin programas externos.
- Las respuestas se encolan por ventana: una respuesta larga no se pisa a sí misma, y empezar a dictar corta la cola y la reproducción en curso.
- La lectura se dispara con `session.text.ended` por cada bloque de texto e ignora las sesiones hijas (subagentes).
- El texto se limpia de Markdown y de URLs antes de hablarlo, pero conserva el contenido del código en línea porque suele ser lo importante de la frase; los bloques de código se omiten. Se trocea en frases de unos 600 caracteres.
- Las tablas se leen como frases de celdas; desaparecen reglas, casillas, imágenes, notas al pie, emojis, fórmulas y corchetes sueltos. Los enlaces se leen por su texto; una dirección escrita se dice sin esquema ni query, con los separadores nombrados.
- El dictado no se detiene solo al hacer una pausa: hay que volver a pulsar el atajo o el micrófono. Una captura silenciosa se avisa de forma distinta a «no se ha detectado voz».
- La salida en la nube en `mp3`, `wav`, `opus`, `aac` o `flac` se decodifica en la ventana. Si el proveedor responde con JSON o texto, el error muestra el cuerpo.
- Para desactivar el plugin entero: **Settings > Extensions > Plugins**, o quita su entrada de la configuración.
- Logs: `~/.local/share/opencode/log/opencode.log`.

## Contrato de la nube

La ruta en la nube asume el contrato de OpenAI `/audio/transcriptions` y `/audio/speech`. Para otro formato, cambia `transcribeCloud` en `src/gui/main/transcribe-cloud.ts` y `speakCloud` en `src/gui/main/speech-cloud.ts`; no hace falta tocar nada más.

## Limitaciones

- La API de plugins GUI es experimental y puede cambiar entre versiones.
- El modo conversación con altavoces puede oír su propia voz; usa auriculares para interrumpir hablando.
- La parte GUI se carga solo desde la entrada de la configuración global.
- Las voces locales dependen del sistema: SAPI en Windows, `say` en macOS, `espeak-ng` en Linux. Solo se ha probado la ruta de Windows.

## Licencia

MIT. Consulta [LICENSE](./LICENSE).

## Contribución

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) y [AGENTS.md](./AGENTS.md).
