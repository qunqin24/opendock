<!-- translated-from: README.en.md@f654c69bf54f -->
# opencode-retro

[Русский](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md) | **Español** | [日本語](README.ja.md)

> Traducción de [`README.en.md`](README.en.md). La versión en inglés es la canónica (canonical); si discrepan, prevalece ella.

Retrospectivas para agentes de programación. Un plugin de [OpenCode](https://opencode.ai) v2 que lee el diálogo de una sesión terminada, encuentra en él lo que puede mejorar el trabajo del agente y lo convierte en cambios propuestos al propio entorno del proyecto: sus skills, sus instrucciones, sus herramientas.

Un agente no aprende de sus propias sesiones. El único registro de dónde se atascó es el log, y los logs no se leen. Este plugin lee el log y vuelve con propuestas.

> Estado: completo y en funcionamiento, verificado contra OpenCode 2.0.32. El paquete de npm es `opencode-retro`; `v0.1.0` es su primera versión con funcionalidad.

## El problema

Los mismos obstáculos se repiten sesión tras sesión:

- Una skill indica ejecutar el linter. El proyecto no tiene ninguno. El agente lo ejecuta igualmente, reescribe cuarenta archivos, se da cuenta y lo revierte todo.
- Un archivo de instrucciones exige ejecutar la compilación antes de hacer commit. El proyecto no define ese script, así que el paso falla cada vez que se obedece.
- El estilo del código no está escrito en ninguna parte, de modo que cada sesión lo deduce de nuevo leyendo las fuentes.
- Un comando que falla se reintenta varias veces sin que nada cambie entre intentos.
- Una tarea del plan se abandona en silencio, como «ahora mismo no es posible».
- La misma corrección se da a mano por tercera semana consecutiva.

Todo está en el log. Nada de ello llega a la sesión siguiente.

## Cómo funciona

Dos bucles, deliberadamente separados. El primero se ejecuta solo y no consume atención. El segundo se ejecuta a petición y produce una decisión cada vez.

### Captura

Cada llamada a herramienta y cada prompt se añaden a un log paralelo en `.retro/sessions/<id>.jsonl`. No interviene ningún modelo: el plugin solo escribe. Por eso el log es independiente de la compactación del contexto; la trayectoria en bruto sobrevive a lo que la sesión haga con su propio historial.

### Extracción

Cuando una sesión termina, su log se conserva y no ocurre nada más hasta que se pide. El análisis cuesta una llamada al modelo, y nada en este plugin la gasta sin que se lo pidan.

`/retro` es el momento en que ocurre. Para cada log acumulado escribe una **orden de trabajo** —un archivo en `.retro/work/` que nombra ese log, dice qué parte de él es nueva y lleva los criterios y cómo responder— y pide al agente de la sesión en la que lo ejecutaste que haga leer cada una a un subagente propio. Todo log pendiente recibe una orden en un solo comando; `options.extractLimit` limita cuántas, y lo que queda se informa para que otro `/retro` tome el siguiente lote.

La orden no contiene el log: lo señala. Leerlo es tarea del subagente, y él está mejor situado para decidir cómo —de una vez, o la cabeza y luego el resto— que cualquier regla que el plugin pudiera aplicar desde fuera. Un subagente que solo llega a una parte lo dice, y el resto sigue pendiente: `selfcheck.md` señala ese log como leído en parte, y el siguiente `/retro` pregunta por lo que falta.

Cada orden la lee un subagente, en un contexto propio. El plugin no llama a ningún modelo ni elige ninguno: la lectura ocurre con el modelo y los ajustes de tu sesión, con el propio bucle de agente de OpenCode. El agente que hizo el trabajo analizado queda excluido a propósito, porque defendería sus propias decisiones; un subagente no estuvo en esa sesión y no tiene nada propio que defender.

La respuesta es una llamada a la herramienta `retro_record`, cuyo esquema es el formato de salida: una respuesta mal formada la rechaza OpenCode antes de que llegue al plugin, y al subagente se le dice por qué y puede intentarlo de nuevo. Una respuesta sin lecciones es una respuesta de verdad: la sesión fue recta. Una vez dentro los registros, el agente llama a `retro_propose`, y es eso lo que te pone una lección delante. Una orden que nadie responde no se le carga al log: del silencio no se concluye nada, porque desde aquí un lector que falló y uno que nunca se puso en marcha son indistinguibles. El siguiente `/retro` vuelve a pedirla, y `selfcheck.md` dice cuántas veces se ha preguntado por un log sin respuesta.

Las sesiones que aún no han terminado también se leen, incluida aquella en la que se ejecutó el comando: su fricción es la más reciente que hay. Leerlas no cierra nada. El plugin recuerda hasta dónde se leyó cada log, y lo que la sesión escriba después se lee en un `/retro` posterior, y solo esa parte: lo que ya se convirtió en lección no se analiza otra vez. Lo normal es dejar las sesiones abiertas y volver a ellas, así que de otro modo un `/retro` semanas después releería todo y volvería a deducir lecciones sobre las que ya se trabajó. El plugin no necesita saber si una sesión sigue en marcha: todo lo que sabe está en disco, en `.retro/`, así que un reinicio, un fallo o un segundo OpenCode sobre el mismo proyecto no cambian nada de lo que se lee.

Solo se omite sin llamada la sesión que no puede contener evidencia de nada: una instrucción, una respuesta, nada hecho. Una conversación sin ninguna llamada a herramientas sí se analiza, porque es justo ahí donde se manifiesta un archivo de instrucciones equivocado: una respuesta errónea y una corrección, sin nada ejecutado.

No hay nada que configurar para nada de esto: ningún modelo, ninguna clave de API, ningún proveedor. El trabajo se ejecuta donde ya se ejecuta tu sesión.

Lo que lee es el log paralelo tal como se escribió: un objeto JSON por línea, un paso por objeto, con cada resultado de herramienta recortado por cabeza y cola a `maxOutput` en el momento en que se capturó, para que un único resultado enorme no se quede en el log para siempre. El análisis responde a una sola pregunta:

> Si esta sesión volviera a ejecutarse, ¿qué debería cambiar en el proyecto para que fuera más corta y más recta?

La respuesta es una lista de lecciones en `.retro/lessons/`.

Un log terminado se analiza una vez; una orden que nadie responde se vuelve a pedir, y `.retro/selfcheck.md` dice cuántas veces se ha pedido sin respuesta. Eso se registra como un hecho y no como un veredicto sobre el log: el plugin no puede distinguir un lector que falló de uno que nunca se puso en marcha, y la causa habitual es una orden esperando en la bandeja de una sesión que sigue trabajando. Un log que el plugin no puede leer él mismo es otra cosa: tras tres de esos se deja de lado y se nombra. Un proyecto en el que nunca se ejecuta `/retro` no se analiza nunca.

### Qué guía la extracción

Los criterios no están compilados en el plugin. Residen en [`prompts/extract.md`](prompts/extract.md), que se siembra en el proyecto como `.retro/prompts/extract.md` y se edita allí. Describen las formas que vale la pena buscar:

- Trabajo hecho en balde: la misma llamada repetida sin que ningún archivo haya cambiado entre intentos.
- Una edición hecha y luego deshecha, ya sea por una edición posterior o al descartar el árbol de trabajo.
- Una skill seguida hasta un callejón sin salida, cuando un comando que la skill prescribía falló después.
- Un fallo que no parece un fallo: un código de salida distinto de cero detrás de un estado que dice «completed».
- Una tarea abandonada en silencio, visible solo en lo que el agente escribió.
- Una corrección que el usuario tuvo que dar más de una vez.

El propio archivo indica que esto es un punto de partida y no una lista de verificación.

### Propuesta

El plugin lee el log. La persona lee propuestas. El plugin se detiene en la propuesta y no edita los archivos del proyecto.

| Comando | Qué hace |
|---|---|
| `/retro` | Analiza lo acumulado y entrega después una lección: la de mayor puntuación aún sin decidir. |
| `/retro all` (o `/retro-all`) | El mismo análisis y después las lecciones pendientes como un único plan, hasta `proposeLimit` (diez por omisión), para aprobarlo de una pasada. |

No hay un tercer comando. Si el plugin funciona se informa en `.retro/selfcheck.md`, reescrito desde el primer prompt de cada sesión y de nuevo cuando termina.

La lección se entrega en la sesión donde se ejecutó el comando, dirigida al agente que ya está allí. Primero se le pide que determine si la lección sigue siendo válida, después que la transmita, y que no cambie nada hasta que haya una decisión.

```
# retro — lint-skill-no-config

La skill lint prescribe `npx eslint . --fix`, que este proyecto no puede ejecutar.

Vista en 2 sesiones, 9 pasos gastados en ella, confianza 0.9, puntuación 16.2.
Vista por última vez hace 3 sesiones.

Cambio propuesto
  AGENTS.md — condicionar el requisito de lint a que exista una configuración de ESLint
  en el repositorio.

Requiere una decisión
  ¿Debería este proyecto tener ESLint configurado, o conviene abandonar la convención?
```

La decisión corresponde a la persona y al agente de esa sesión. El agente tiene los archivos, el historial y las skills propias del proyecto, lo que lo convierte en mejor juez de si una lección sigue aplicándose que el plugin. Una vez tomada la decisión, el agente la registra mediante una herramienta `retro_decide`. Esa herramienta solo lleva la contabilidad: un rechazo se recuerda y la lección no se vuelve a proponer.

`/retro all` es la misma entrega para todo a la vez. Las lecciones pendientes se ordenan y se entregan juntas, hasta `proposeLimit`; el agente comprueba cuáles siguen en pie y reúne el resto en un único plan agrupado por archivo, que se aprueba una sola vez.

### Dónde corresponde el arreglo

Una lección registra un problema. Dónde arreglarlo se decide durante la entrega, entre el agente y la persona, después de mirar lo que el espacio de trabajo tiene realmente: qué archivos de instrucciones lee el entorno aquí, si existen skills a nivel de proyecto o globales, si hay algo más específico que ya cubra la tarea.

Las opciones:

- Modificar un archivo de instrucciones, para un hecho o una restricción de alcance amplio.
- Modificar una skill, cuando una skill dio los pasos equivocados o se activó donde no debía.
- Crear una skill, o un archivo de instrucciones limitado al directorio donde la regla se aplica, cuando el sitio adecuado todavía no existe.
- Pedir una herramienta, cuando lo que falta es una capacidad y no una instrucción.
- Cambiar el código del proyecto, cuando la trampa está en el código. Nunca se aplica sin acuerdo explícito.
- Dejarlo sin ubicar, cuando el sitio correcto no está realmente claro.

Las lecciones en sí son siempre locales a un espacio de trabajo. El arreglo puede no serlo: si la causa está en cómo trabaja una persona en todas partes, el arreglo pertenece a su entorno global, porque arreglarla en un proyecto la deja rota en los demás. Nada fuera del proyecto se edita sin preguntar.

El procedimiento y esta lista están en [`prompts/propose.md`](prompts/propose.md), que se siembra en el proyecto y se puede editar allí.

## Lecciones

Una lección es un archivo Markdown con frontmatter YAML.

```yaml
id: lint-skill-no-config
statement: The lint skill assumes eslint; this project has no linter.
evidence:
  - session: a81f
    steps: [41, 58]
  - session: c204
    steps: [12, 19]
cost: 34
recurrence: 3
confidence: 0.9
lastSeen: 41
recordedAt: 2026-10-19T15:16:04.134Z
proposal:
  target: .opencode/skills/lint/SKILL.md
  change: |
    Before running, check for a lint config and a lint script.
    If absent, do not run; report instead.
ask: Is the linter really unused here?
status: new
```

`cost` es el número de pasos que el problema consumió, sumados entre sesiones. `recurrence` es el número de sesiones independientes en las que apareció. `lastSeen` es el contador de sesiones del espacio de trabajo cuando la lección se escribió por última vez.

### Ordenación

La puntuación es `cost × recurrence × confidence × freshness`.

La frescura se reduce a la mitad cada `halfLife` sesiones —diez por omisión— en las que el problema no ha aparecido, contadas en sesiones y no en días. A razón de una sesión diaria, un decaimiento medido por el calendario lo enterraría todo de un día para otro.

La recurrencia pesa más que un único incidente caro. Un problema visto en tres sesiones se verá en una cuarta.

### Ciclo de vida

Una lección se indexa por problema, no por sesión. Una segunda sesión que choca con lo mismo añade su evidencia e incrementa `recurrence` en lugar de crear otro archivo.

En `lessons/` solo hay cuestiones abiertas. Aceptar o rechazar mueve el archivo a `archive/`, y nada se borra nunca; marcarla como `later` la mantiene abierta. Un problema que vuelve después de haberse cerrado es el mismo problema más la noticia de que el arreglo no se sostuvo, así que se reabre con su historial intacto. Un límite fijo de treinta mantiene la lista corta; lo que desborda también se archiva, salvo las lecciones marcadas como `later`.

## Instalación

OpenCode descarga el plugin desde npm; basta con nombrarlo en `opencode.json`:

```jsonc
{
  "plugins": [{ "package": "opencode-retro" }]
}
```

No hay nada que configurar: el plugin no llama a ningún modelo propio, así que no hay modelo que elegir, ni clave que aportar, ni proveedor al que llegar. Un análisis se ejecuta como subagente de la sesión que lo pidió. `.retro/selfcheck.md` informa de si se ejecutó y de por qué falló si no lo hizo.

**Mira primero qué hay realmente en npm.** Toda versión por debajo de `0.1.0` es un reservador de nombre: carga sin error, no registra ningún comando, no crea `.retro/` y no informa de nada. Es decir, seguir este fragmento antes del primer lanzamiento real deja una sesión de aspecto normal y un plugin que no está. Si `npm view opencode-retro version` está por debajo de `0.1.0`, apunta `package` a la ruta absoluta de una copia local; así se ejecuta también mientras se trabaja en el propio plugin. Una ruta relativa deja el arranque de la sesión colgado sin dar ningún error, y se puede fijar una versión exacta (`opencode-retro@0.1.0`) cuando haya alguna que fijar.

Todo lo demás es opcional:

- `dir` — dónde vive todo, por omisión `.retro`.
- `prompts` — el directorio de prompts, por omisión `prompts` dentro de él.
- `halfLife` — sesiones sin recurrencia antes de que la puntuación de una lección se reduzca a la mitad, por omisión diez.
- `proposeLimit` — lecciones en un `/retro all`, por omisión diez.
- `extractLimit` — órdenes de trabajo que emite un `/retro`, sin límite por omisión.
- `maxOutput` — caracteres de salida de herramienta que se guardan en el log paralelo por paso, por omisión 8000.
- `heartbeatMs` — el intervalo mínimo entre escrituras de la autocomprobación mientras una sesión trabaja, por omisión 60000.
- `keepSessions` — conservar todos los logs, incluidos los que nadie cita; desactivado por omisión.

### Qué aparece en disco

Todo lo que el plugin escribe se queda bajo `.retro/` dentro del proyecto, y en ningún otro sitio salvo que se acepte una propuesta. Todo es texto plano.

```
.retro/
  prompts/
    extract.md       qué cuenta como lección
    propose.md       cómo se entrega una lección, una o todas
    updates/         valores por omisión más nuevos, sin usar
  sessions/          logs en bruto, se conservan mientras no se hayan leído, una lección los cite o se haya escrito en ellos esta semana
  work/              una orden de trabajo por cada log pendiente de análisis
  lessons/           cuestiones abiertas
  archive/           lecciones aceptadas, rechazadas y desalojadas
  selfcheck.md       si el plugin funciona
  state.json
  plugin.log         errores de hooks, comandos y trabajo en segundo plano
  .gitignore         se siembra una vez y pasa a ser del proyecto
  README.md          qué es este directorio, para quien lo abra; se siembra una vez
```

Un log se elimina cuando se cumplen tres cosas: se ha leído hasta el final, ninguna lección abierta lo cita y nadie ha escrito en él durante siete días. La evidencia de una lección nombra una sesión y un rango de pasos, y durante la revisión la pregunta «¿qué pasó realmente ahí?» tiene que tener una respuesta que no sea un resumen, así que un log citado se queda. Los siete días son lo que hace seguro eliminar sin saber si una sesión sigue en marcha: una sesión que sigue escribiendo conserva su log, y una que se retoma tras una semana en silencio empieza un log nuevo, que se lee desde el principio. Un log que nadie ha leído no se elimina nunca, por antiguo que sea. El crecimiento lo marcan el número de lecciones abiertas, que está acotado, y una semana de sesiones, no la edad del proyecto.

No hay nada que añadir al `.gitignore` del proyecto. En la primera ejecución el plugin escribe `.retro/.gitignore`, y git lo aplica a todo lo que hay debajo: las sesiones, las órdenes de trabajo, el estado, la autocomprobación, el log del plugin, los avisos de actualización de prompts y cualquier archivo `.tmp` a medio escribir que deje un fallo quedan ignorados, mientras que `lessons/`, `archive/` y los archivos de prompt vigentes no. Ese archivo se siembra una vez y a partir de entonces es del proyecto.

La separación es el diseño, no una comodidad. Las lecciones y el archivo son conocimiento sobre el proyecto: se leen, aparecen en la revisión y viajan con el repositorio. Los prompts son su configuración, que conviene compartir con quien más trabaje aquí. El resto solo haría ruido en un diff.

### Prompts

Dos prompts determinan lo que hace el plugin, y ambos son archivos dentro del proyecto: qué cuenta como lección y cómo se entrega una lección. El segundo cubre también un lote: `/retro all` envía la misma regla, cuya última sección dice qué cambia cuando llegan varias lecciones a la vez — un plan, agrupado por archivo, las descartadas nombradas. Una regla, no una por comando, para que editarla no deje una segunda copia que la contradiga.

Cada uno se siembra desde el valor por omisión del paquete en la primera ejecución y no se vuelve a escribir. La resolución va primero por el proyecto, después por `~/.config/opencode/retro/prompts/` y por último por el valor del paquete, de modo que un prompt puede fijarse para un proyecto, para todos o para ninguno.

Cuando se publica un valor por omisión más nuevo, aparece como `prompts/updates/<name>.vN.md`, con una nota al principio que advierte de que ese archivo no está en uso. Nada se aplica en nombre del usuario.

Lo que permanece en el código es la maquinaria: el formato de la respuesta, el orden de los campos de una lección y la instrucción de registrar la decisión. El formato se escribe en cada orden de trabajo y no en el archivo de prompt, así que editar un prompt no puede eliminarlo; y su mitad mecánica es el esquema de la herramienta `retro_record`, que OpenCode valida antes de que una respuesta llegue al plugin.

## Comprobar que funciona

Que un hook se registre no demuestra nada. Un hook registrado con un nombre que la API ya no usa se registra con éxito y luego no se dispara nunca.

Por eso `.retro/selfcheck.md` informa de que está vivo, no de que está instalado: compara lo que vio el flujo de eventos con lo que recibieron los hooks. El archivo lleva su propia regla de caducidad:

> **Si estás trabajando ahora mismo y `heartbeat` tiene más de unos pocos minutos, este plugin no está en marcha.**

Esas comprobaciones se ejecutan cada vez que se escribe el archivo y no cuestan nada: la superficie de API de la que el plugin depende, qué capa de prompts está vigente y qué hay esperando, bajo un encabezado que nombra las versiones del plugin y de OpenCode. Si un análisis llega a buen puerto no se pregunta por separado: cada `/retro` lo ejercita, y una orden que volvió sin respuesta se informa por lo que fue.

## Requisitos

- OpenCode v2, `@opencode/plugin` 2.0.18 o posterior. Verificado contra 2.0.32.
- Nada más allá de OpenCode. Un análisis se ejecuta como subagente de la sesión en la que ejecutaste `/retro`, con el modelo de esa sesión.
- Ninguna dependencia en tiempo de ejecución.

## Licencia

MIT
