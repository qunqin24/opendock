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
- **Límites reales de free-pi**: todos los modelos parten de la ventana de
  contexto de 200k y el límite de salida de 32k que aplica el CLI del
  proveedor, aunque models.dev informe ventanas mayores para el modelo
  upstream. El plugin sube la ventana midiendo lo que el gateway acepta de
  verdad (hasta 1M) y deja que los modelos con más presupuesto de salida usen
  hasta 131k, para que el razonamiento no se corte. Así OpenCode compacta antes
  de que el servidor rechace la conversación y aun así aprovecha la capacidad
  real de la cuenta.
- **Compactación integrada**: los errores `context_too_long` de free-pi se
  reescriben para que OpenCode los reconozca como desbordamiento de contexto y
  ejecute `/compact` automáticamente en vez de terminar el turno.
- **Techo por modelo aprendido del gateway**: cuando free-pi rechaza una
  petición real por longitud, ese tamaño se guarda en `live-limits.json` como
  techo de ese modelo y el catálogo anuncia una ventana un 15 % menor, también
  sin reiniciar (`provider.reload`). Así la siguiente compactación empieza antes
  de que el gateway rechace también el propio resumen, que es lo que dejaba el
  turno detenido con solo el checkpoint en pantalla. Los rechazos causados por
  una imagen o un archivo adjunto no cuentan: su base64 no dice nada de la
  ventana de texto.
- **Resumen de compactación sin recortes**: el presupuesto de salida de la
  petición de compactación ya no se limita a 32k, porque un resumen cortado por
  el límite hace fallar la compactación completa. Si aun así el resumen no cabe
  en el techo aprendido, se descartan los turnos de usuario más antiguos (sin
  romper parejas de herramienta) en lugar de abortar el turno.
- **Ventana reciente en el resumen**: OpenCode sólo conserva el último
  intercambio junto al resumen, así que el trabajo hecho justo antes de
  compactar desaparecía. El plugin lee la sesión nativa, cita los últimos turnos
  (hasta 24k caracteres) en la petición de compactación y exige que el resumen
  termine con `## Recent window`, entregándolos también como último mensaje
  porque los modelos gratuitos ignoran las reglas del sistema. Esos turnos
  viajan una sola vez en la primera petición posterior, por si el resumen los
  comprimió de más; caducan a la hora y no se guardan en disco.
- **Poda de resultados antiguos**: las sesiones largas llegan a prompts de
  100k–170k tokens y a ese tamaño los modelos gratuitos pierden el centro de la
  conversación y dejan de seguir las reglas, aunque el gateway acepte la
  petición. Antes de enviar, el plugin colapsa los resultados de herramientas
  antiguos (conserva 600 caracteres de cabecera y 240 del final, con un aviso de
  que se podaron), sin tocar el texto de usuario, las decisiones del asistente
  ni los mensajes más recientes. El presupuesto es el 40 % de la ventana
  anunciada (mínimo 24k), así que el prompt vuelve a la zona donde el modelo
  atiende.
- **Sin bucles de compactación**: si el servidor rechaza como «demasiado
  largo» una petición que cabe de sobra en la ventana (menos de 60k tokens),
  el plugin la reintenta con un `x-session-id` nuevo en vez de compactar. Si
  aun así la sigue rechazando, devuelve un error de proveedor que OpenCode no
  clasifica como desbordamiento, para no gastar créditos en resúmenes que no
  arreglan nada.
- **Títulos locales**: OpenCode pide un título al modelo al crear una sesión.
  El plugin lo responde con la primera línea del primer mensaje, sin gastar
  créditos, sin pedir un anuncio y sin dejar la sesión atascada en
  «New session».
- **Capacidades según el modelo**: los modelos gratuitos aceptan imágenes de
  entrada de forma nativa; se comprobó con `curl_cffi` contra el gateway y los
  cuatro transcriben una captura adjunta. Los alias de pago anuncian lo que
  models.dev sabe de su modelo upstream. La salida es siempre texto: la ruta de
  chat no devuelve imágenes. Para una imagen en disco o para un modelo de solo
  texto sigue estando `look_at_image`, que además no deja el base64 en la
  conversación. OpenCode recodifica los adjuntos grandes a 2000 px y cuenta su
  base64 como tokens, así que una imagen de más de ~500 KB puede disparar una
  compactación automática antes del turno; en ese caso conviene `look_at_image`,
  que reescala y envía solo lo necesario.
- **Subagentes identificados**: las sesiones hijas envían
  `x-freepi-subagent: 1`, igual que los proveedores que el CLI crea para sus
  subagentes.
- **Pensamiento por defecto**: el plugin pide `reasoning_effort: "high"`
  cuando el modelo no trae variante elegida. Dejarlo sin definir hacía que los
  modelos gratuitos respondieran con prisa, gastando apenas unas decenas de
  tokens de razonamiento incluso en tareas que requieren planificar. El
  selector ofrece siempre los seis niveles que el gateway acepta —`none`,
  `minimal`, `low`, `medium`, `high` y `max`—, para todos los modelos, y el
  mismo conjunto se anuncia en `reasoning_options`; los modelos de presupuesto
  usan `high` por defecto. La opción `reasoningEffort: false` del plugin
  recupera el nivel del servidor. No se anuncian `thinking_budget` ni
  `thinking`, porque la ruta `openai-compatible` de OpenCode los descarta.
- **Más razonamiento real**: medido con `curl_cffi` contra el gateway, cambiar
  `reasoning_effort` no altera cuánto piensa el modelo (los tokens de
  razonamiento varían al azar entre ~60 y ~600 en cada nivel) y los modelos
  `flash` se detienen solos en la primera respuesta plausible. Lo que sí
  funciona es pedir el trabajo explícito: con la regla de «escribe cada paso,
  recalcula por un segundo método y no respondas hasta que coincidan», el mismo
  modelo subió de ~450 a ~1250 tokens de razonamiento y acertó 5/5 problemas de
  lógica frente a 3/5 sin la regla. Por eso la guía de trabajo prioriza la
  respuesta lenta y verificada, y el límite de salida se deja amplio para que
  esa cadena no se trunque.
- **Capacidades iguales al CLI**: todos los modelos se registran con
  razonamiento activo, coste cero, la ventana medida y el límite de salida que
  publica el upstream (32k por defecto, hasta 131k). No se fuerza temperatura ni
  `top_p`: la petición real no los incluye, así que el gateway aplica su propio
  valor. El prompt se envía con rol `system`, no `developer`.
- **Límites medidos, no inventados**: `/client-version` solo devuelve id,
  nombre, `free`, `section`, `note`, `stats_id` y `usage_x`; no hay endpoint de
  capacidades ni de ventana. El plugin no se queda en constantes: confirma la
  ventana compilada y después la agranda mientras el gateway acepte prompts
  mayores, con búsqueda binaria al primer rechazo y un 3 % de margen. Guarda el
  resultado en `live-limits.json` y anota en cada paso los tokens de prompt y de
  razonamiento que el servidor confirma. `liveLimits: false` desactiva la
  comprobación y deja la ventana compilada.
- **Reglas de trabajo en el prompt**: cada petición principal de free-pi añade
  un bloque corto al system prompt con lo que los modelos gratuitos suelen
  omitir: leer antes de editar, ejecutar las comprobaciones de verdad, no
  afirmar que algo pasó si no se ejecutó, reutilizar las decisiones y rutas ya
  establecidas en la conversación y no fingir que se compactó el contexto.
- **Compactación con instrucciones**: el resumen de compactación recibe además
  un bloque que le pide conservar requisitos sin resolver, decisiones y sus
  motivos, rutas y símbolos exactos, comandos con su resultado, errores y
  trabajo pendiente. Sin eso, los modelos gratuitos producían resúmenes
  demasiado escuetos para continuar la tarea.
- **Solo modelos utilizables**: al arrancar se consulta `/me` y el selector
  `/model` incluye únicamente lo que la cuenta puede usar: los modelos
  `free: true` siempre, los de pago mientras queden créditos de la cuota o
  monedero, y los premium solo si hay créditos premium. Los modelos ausentes o
  marcados `unavailable` no se registran.
- **Sin cache warming**: el plugin desactiva los keep-alives de OpenCode para
  free-pi. El CLI nunca los hace y cada ping gastaría créditos y anuncios.
- **Timeouts del CLI**: 5 minutos para las cabeceras y para cada trozo de la
  respuesta, los mismos valores que `httpIdleTimeoutMs` de pi.
- Anuncios e impresiones asociados al turno correcto.
- Cada agente y subagente usa su propio `x-session-id`, `x-turn-id` y contexto
  de anuncios; nunca reutiliza los del agente principal.
- **Cierre de sesión**: free-pi limita la cuenta a 4 sesiones simultáneas. El
  plugin finaliza la sesión del proveedor cuando la ejecución del modelo
  termina (éxito, fallo o interrupción) y al apagar OpenCode.
- Recuperación automática del límite de sesiones concurrentes.
- **Recuperación de `concurrent`**: free-pi admite una sola petición en vuelo por
  `x-session-id` y puede dejar el slot bloqueado en el servidor tras un stream
  abortado. El plugin repite la petición con un `x-session-id` nuevo desde el
  hook de respuesta y entrega el resultado a OpenCode, así que el turno sigue sin
  mostrar «one request at a time»; el reintento normal también rota el id como
  respaldo.
- **Catálogo y metadatos en vivo**: el catálogo de free-pi y el registro de
  models.dev se consultan en cada arranque y solo se guardan en memoria para el
  proceso actual. El único archivo persistente es `live-limits.json`, con la
  ventana y los tokens que el servidor confirmó. Si la red falla, se usa lo que
  ya esté en memoria en vez de inventar límites. Los avisos que el servidor
  manda en el catálogo y en `/me` (`notice`) se registran una vez en el log del
  plugin.
- **Catálogo que se recupera solo**: si `/client-version` no responde, el
  proveedor quedaría registrado sin modelos y el selector de esa ubicación
  mostraría «Model unavailable» para todos los modelos free-pi. Por eso la
  petición se reintenta una vez de inmediato y, si aun así falla, el plugin
  vuelve a pedir el catálogo en segundo plano (2 s, 5 s, 10 s, 20 s, 30 s y 60 s)
  y, en cuanto lo obtiene, registra los modelos y recarga proveedor y modelo en
  caliente. No hace falta reiniciar OpenCode ni elegir otra carpeta.
- **Aislamiento por proveedor**: todo lo que añade el plugin —herramientas,
  cabeceras, anuncios, reglas de prompt, compactación, reintentos, topes de
  tokens y ajustes— se aplica solo a `free-pi` y `free-pi-defense`. Los demás
  proveedores no reciben las herramientas en su lista (el plugin las quita de la
  petición), no ven las cabeceras free-pi y conservan sus propias imágenes y su
  propio uso. Si una sesión cambia de free-pi a otro modelo, pierde las
  herramientas en la siguiente petición y las llamadas directas se rechazan.
- Compatible con rutas, credenciales y navegador de cada sistema operativo.

## Lectura de imágenes

Los modelos gratuitos de free-pi aceptan imágenes adjuntas de forma nativa: al
adjuntar una captura en la conversación, el gateway la reenvía al modelo upstream
y el modelo la ve. En los modelos de solo texto, o cuando la imagen está en disco
y no conviene cargarla entera, el modelo llama a `look_at_image` con una ruta y
una pregunta concreta. El plugin:

- Acepta PNG, JPEG y WebP.
- Solo lee archivos dentro de la carpeta del proyecto (incluidos enlaces
  simbólicos resueltos).
- Lee las dimensiones de la cabecera y envía el archivo intacto mientras no
  supere los 5 MB, conservando la resolución y la calidad originales. Solo las
  imágenes mayores se recodifican con Photon, manteniendo el mayor tamaño y la
  mejor calidad JPEG que quepan en el límite.
- Envía la imagen a `/tools/vision` y devuelve la respuesta del modelo de
  visión como texto.
- Serializa las preguntas entre sesiones y procesos de OpenCode mediante un
  bloqueo en el directorio de datos del plugin. Si el servidor responde `rate_limited` porque
  otra sesión o el CLI está consultando una imagen, reintenta automáticamente
  respetando `Retry-After` en vez de hacer fallar el turno.

Cada llamada consume parte del allowance diario del usuario, como en el CLI.
La herramienta solo se ejecuta en sesiones de free-pi; en otros proveedores
responde que no está disponible. Si el modelo activo acepta imágenes, un `read`
de una imagen conserva el archivo y el modelo la ve; si es de solo texto, el
plugin sustituye el base64 por un aviso que le indica usar `look_at_image` con la
misma ruta.

## Herramientas free-pi

El plugin registra las mismas herramientas de servidor que el CLI. OpenCode no
permite registrar una herramienta solo para un proveedor, así que el plugin las
quita de la lista de herramientas de cada petición servida por otro proveedor y,
además, todas comprueban que la sesión sea de free-pi antes de gastar cuota. Los
demás modelos no las ven ni pueden ejecutarlas.

| Herramienta      | Qué hace                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| `look_at_image`  | Pregunta a un modelo de visión por una imagen del proyecto.              |
| `generate_image` | Genera una imagen desde un prompt y la guarda en `images/`.              |
| `web_search`     | Busca en la web y devuelve título, URL, fecha y texto de cada resultado. |
| `docs_lookup`    | Consulta documentación actual de una librería o framework.               |
| `free_pi_usage`  | Muestra cuota restante, créditos, tokens y tier de la cuenta.            |
| `free_pi_subagent_read` | Lee la transcripción de una sesión hija: prompts, herramientas y respuesta. |

`generate_image` acepta `prompt`, `aspect_ratio` (`1:1`, `16:9`, `9:16`, `4:3`,
`3:2`) y un `name` opcional para el archivo. Rechaza tipos que no sean PNG,
JPEG o WebP y limita el archivo a 8 MB, igual que el CLI. Los nombres se
normalizan a `images/<slug>-<6 hex>.<ext>` para que una respuesta del servidor
no pueda escribir fuera de `images/`.

`web_search` y `docs_lookup` usan `/tools/web-search` y `/tools/docs`. Los
códigos `daily_cap`, `rolling_cap`, `rate_limited`, `not_found`,
`not_configured`, `upstream_error` y los de invitado se traducen al mismo texto
que el CLI, para que el agente sepa cuándo no debe reintentar. Igual que
`look_at_image`, cada llamada consume allowance y se ejecuta tal cual: el plugin
no reutiliza respuestas ni oculta llamadas repetidas.

`free_pi_usage` consulta `/me/stats` y resume el tier, los créditos restantes
con su hora de recarga en ET, los créditos premium o de referidos y los tokens
de hoy y de por vida. Si el servidor asigna el carril lento, incluye el aviso
del CLI.

`free_pi_subagent_read` recibe el `sessionID` que devuelve la herramienta
`subagent` y devuelve la conversación de esa sesión hija: el prompt recibido,
cada llamada a herramienta con su entrada y su resultado, y el texto final del
subagente. Antes de leer comprueba con `session.get` que `parentID` sea la sesión
que llama, así que no puede abrir sesiones ajenas. Sin `sessionID` lista las
sesiones hijas de la sesión actual con su agente y su resultado. El transcript se
mantiene dentro de un presupuesto de caracteres (`maxChars`, 60k por defecto) y,
si no cabe, conserva los turnos más recientes y lo indica.

La compra de créditos y la guía de free-pi ya no se exponen como herramientas:
se resuelven en el dashboard y la documentación de free-pi, sin gastar cuota ni
añadir ruido al contexto.

## Agentes y subagentes

El CLI incluye cuatro personalidades de agente. El plugin las instala como
agentes Markdown nativos de OpenCode en el directorio global de configuración:

```text
~/.config/opencode/agents/free-pi/
├── scout.md      → free-pi/scout
├── planner.md    → free-pi/planner
├── worker.md     → free-pi/worker
└── reviewer.md   → free-pi/reviewer
```

| Agente            | Uso                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `free-pi/scout`   | Reconocimiento de solo lectura; devuelve hallazgos estructurados. |
| `free-pi/planner` | Plan de implementación de solo lectura, listo para un worker.     |
| `free-pi/worker`  | Ejecuta una tarea completa en su propia ventana de contexto.      |
| `free-pi/reviewer`| Revisión de solo lectura con archivo y línea.                     |

Usan `mode: all`, así que aparecen en el selector `/agents` de la TUI como
agente principal **y** se pueden lanzar con la herramienta `subagent` nativa.
Heredan el modelo free-pi de la sesión padre. Como subagentes corren en segundo
plano, comparten el allowance diario y envían su informe al agente principal.
Así se conservan las sesiones hijas, los permisos, la profundidad de subagentes
y el resto del comportamiento nativo.

La herramienta `subagent` es la de OpenCode y está disponible para **cualquier
modelo**, no solo para los agentes `free-pi/*`: también puede lanzarlos un
modelo de otro proveedor configurado en OpenCode. El plugin garantiza además que
todos los modelos gratuitos anuncien soporte de tools, de modo que el runner
nunca oculte `subagent` por una capacidad incorrecta de models.dev. Cuando el
hijo termina, OpenCode inyecta su informe en la sesión padre; para ver lo que
realmente ejecutó, el padre llama a `free_pi_subagent_read` con el `sessionID`
del hijo.

El plugin solo reescribe estos archivos si conservan su marca de gestión; si el
usuario edita o reemplaza uno, se respeta tal cual.

## Skill y contexto

El plugin instala una skill nativa en:

```text
~/.config/opencode/skills/free-pi/SKILL.md
```

OpenCode la descubre con su propio cargador (ID `free-pi`), la anuncia cuando es
relevante y el agente la carga con su herramienta `skill`. Contiene la lista de
herramientas, los subagentes y las reglas de allowance. Si el directorio de
configuración no se puede escribir, el plugin la registra mediante la API de
skills como respaldo.

Cada petición principal de free-pi recibe además una guía breve que pide
delegar el trabajo grande en `free-pi/scout`, `free-pi/planner`,
`free-pi/worker` o `free-pi/reviewer` con `subagent`, cargar skills con `skill`
y seguir `AGENTS.md` en lugar de inventar convenciones. Esa guía solo se añade a
las peticiones de `free-pi` y `free-pi-defense`.

La memoria, las sesiones y el contexto son los de OpenCode: `AGENTS.md` y los
archivos de `instructions` se cargan de forma nativa, las sesiones persisten y
se reanudan, y la compactación pliega conversaciones largas en un resumen. El
plugin no crea archivos de memoria propios ni duplica el almacén de sesiones;
los hechos duraderos del proyecto van en `AGENTS.md`.

Las herramientas `todo` y `ask_user` del CLI no se duplican: OpenCode ya tiene
un gestor de todos nativo y su propia herramienta de preguntas al usuario, con
mejor integración en la TUI. Los servidores MCP, comandos, referencias y
permisos también siguen siendo los de OpenCode; free-pi no los reemplaza.

## Cabeceras enviadas

El plugin replica las cabeceras del plugin V1 de free-pi:

- **Modelo**: `authorization`, `x-session-id`, `x-client-version` y
  `x-turn-id`. Las sesiones hijas añaden `x-freepi-subagent: 1`.
- **Resultados de herramientas**: `x-freepi-tool-meta` (duración, código de
  salida y truncado de las últimas llamadas), `x-freepi-tool-errors` (IDs de
  herramientas fallidas) y `x-freepi-compacted` (mensajes plegados por la
  última compactación, en la petición siguiente).
- **Catálogo** (`/client-version`): `authorization`.
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

El plugin mide el cuerpo de cada petición rechazada. Cuando el rechazo llega
con un cuerpo que no puede agotar la ventana, lo trata como un fallo del
proveedor: repite la petición con un `x-session-id` nuevo y, si el servidor
insiste, devuelve un `400` con un mensaje de error de proveedor. Ese texto no
coincide con el patrón de desbordamiento de OpenCode, así que el runner deja de
compactar en lugar de entrar en un ciclo de resúmenes que no reducen nada.

Cuando el rechazo sí corresponde a una conversación larga, el tamaño medido se
guarda como `rejectedPromptTokens` del modelo en `live-limits.json`. El
`provider.transform` reconstruye el catálogo con ese techo (85 % del tamaño
rechazado, sin bajar de la ventana ya aceptada) y `provider.reload` lo aplica en
caliente, de modo que la siguiente compactación se dispara antes de que el
gateway rechace el resumen. Si el resumen aún no cupiera, el hook de
compactación descarta los turnos de usuario más antiguos en lugar de dejar que
OpenCode aborte el turno.

free-pi cobra en créditos contra una cuota diaria, no en USD por token. Por
eso los modelos se registran con costo `0`, igual que el CLI del proveedor; el
consumo real se consulta en `/me` y `/me/stats` y se refleja en los mensajes de
cuota y límite.

Los reintentos siguen la política de pi: como máximo 3 reintentos, con espera
`min(2s · 2^(n-1), 60s)`. Los límites terminales (`free_usage_limit`, cupos
diarios u horarios, créditos, cuenta bloqueada) se convierten en un 400 con el
mensaje amigable y no se reintentan, igual que hace el CLI de pi; así OpenCode no
muestra un «Retrying…» que nunca termina. El 429 `concurrent` («one request at a
time») es la excepción: como OpenCode reutiliza la petición ya preparada al
reintentar, el plugin **repite la petición** desde el hook de respuesta con un
`x-session-id` nuevo y devuelve el resultado bueno a OpenCode; el turno continúa
sin fallar ni mostrar reintentos. Además libera el id anterior, y si el replay no
puede completarse el hook de reintento rota el id para los siguientes pasos. Un
turno que se aborta o falla a mitad de stream marca su `x-session-id` como sucio:
la siguiente petición arranca directamente con un id nuevo y libera el anterior,
de modo que la sesión continúa sin interrupciones y sin pasar por un reintento.

Los fallos de transporte (`ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, DNS
temporal, `socket hang up`) no son límites de cuenta: el plugin los reintenta con
espera exponencial hasta cinco veces más (2 s, 4 s, 8 s, 16 s y 30 s) y marca el
`x-session-id` como sucio para que el siguiente intento use una conexión y un
slot nuevos. Así un corte breve de red, del router o del servicio local de
OpenCode no termina el turno en el segundo intento.

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
| `FREE_PI_DATA_DIR`        | Directorio de datos del plugin.                      |
| `FREE_PI_LOG_FILE`        | Ruta alternativa del archivo de log del plugin.      |
| `FREE_PI_TRACE=1`         | Registra en el log la forma real de cada petición: herramientas enviadas, tamaños y último mensaje. |

No hay variables obligatorias.

## Datos y logs

El catálogo y el registro de models.dev se piden en vivo en cada arranque: no
se guardan copias en disco ni se muestran datos de una ejecución anterior. El
plugin solo conserva en:

```text
~/.cache/opencode/free-pi/live-limits.json
```

la ventana de contexto que midió contra el gateway y lo que cada paso real
demostró sobre el modelo. Esa medición se vuelve a comprobar cada 7 días.

En Windows es `%USERPROFILE%\.cache\opencode\free-pi\`.

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
  catalog/              catálogo en vivo, models.dev y límites medidos
  errors/               parseo, mensajes y reescritura de límites
  integration/          integración y métodos de inicio de sesión
  session/              hooks, eventos, seguimiento y uso
  utils/                helpers pequeños (directorio de datos y URLs)
dist/                   build ESM y tipos
scripts/postinstall.mjs registro en opencode.json
test/smoke.mjs          prueba de humo del build
test/registry.mjs       models.dev en vivo y tolerancia a fallos
test/models.mjs         capacidades, variantes y límites
test/live.mjs           ventana medida y observaciones del gateway
test/diet.mjs           poda de resultados de herramientas antiguos
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
