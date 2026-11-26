# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español** · [Português (Brasil)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md)

> Esto es una traducción. La referencia es el [README en inglés](../../README.md); donde difieran, el inglés es el correcto.

Mensajes directos entre los subagentes de una misma sesión de [opencode](https://opencode.ai), para que el agente principal (el líder) no tenga que llevar cada dato de un subagente al siguiente.

![Dos subagentes en segundo plano: el coder envía un mensaje con crew_send, el researcher lo lee en su siguiente paso y el líder también recibe una nota](../media/demo.gif)

*Una ejecución guionizada contra el plugin real en un `opencode serve` aislado.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

Dos subagentes que trabajan al mismo tiempo a menudo necesitan un dato el uno del otro: el nombre de una interfaz que uno de ellos acaba de crear, un archivo que el otro no debe tocar, un hallazgo que cambia el siguiente paso del otro. Sin este plugin, ese dato va a un informe, el líder lo lee y el líder inicia o continúa al otro subagente con él: es lento y llena el contexto del líder. Con él, el coder se lo dice directamente al tester.

## Qué añade

Dos herramientas, disponibles para todos los agentes de un árbol de sesiones:

| Herramienta | Qué hace |
|---|---|
| `crew_list` | Lista el equipo: el líder y los subagentes que el líder inició, con un nombre corto (`coder`, `coder-2`, `tester`...), su tarea y si siguen en ejecución. |
| `crew_send` | `{ to, text }`: deja un mensaje en la bandeja de entrada de un miembro (`to` = nombre corto, id de sesión, `lead`), o de todos los subagentes en ejecución del equipo (`to` = `all`). |

El destinatario recibe el mensaje como un mensaje sintético en su **siguiente paso**. Un agente en ejecución nunca se interrumpe y nadie espera una respuesta, así que dos agentes no pueden bloquearse entre sí. El mensaje va envuelto de forma que el modelo sepa quién lo escribió y que viene de otro agente, no del usuario:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

Reglas:

- Un subagente que ya ha **terminado** no recibe mensajes: un mensaje lo volvería a iniciar y enviaría su informe al líder por segunda vez. Al remitente se le indica que escriba a `lead` o que lo incluya en su informe.
- Un mensaje a un líder que está **inactivo** (por ejemplo, esperando a subagentes en segundo plano) espera en su bandeja de entrada y se lee la próxima vez que el líder se ejecute, normalmente cuando lo despierta el siguiente informe. Activa `wakeLead` para iniciarlo de inmediato.
- Los mensajes solo circulan dentro de un árbol: el líder y sus subagentes directos. No se puede llegar a otra sesión de la misma máquina.

## Instalación

Con el gestor de plugins de opencode (desde npm o directamente desde GitHub):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

O a mano: copia `crew-mail.js` en la carpeta de plugins de tu configuración de opencode y reinicia opencode.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

Después, cuéntaselo a los agentes. Todos los subagentes ya ven las descripciones de las herramientas; una línea en el prompt del líder le ayuda a informarles, por ejemplo:

> Los subagentes que se ejecutan al mismo tiempo pueden escribirse entre sí con `crew_send` (ver `crew_list`). Indícales en las instrucciones qué otros trabajan al mismo tiempo y en qué.

Las herramientas son más útiles con subagentes que se ejecutan al mismo tiempo: varias llamadas a `subagent` en un mismo mensaje, o subagentes en segundo plano (`background: true`).

Si otro de tus plugins rechaza las herramientas desconocidas (una lista de permitidas), añade `crew_list` y `crew_send` a ella; en [opencode-win-guard](https://github.com/retretor/opencode-win-guard) es su ajuste `extraTools`. Para negar las herramientas a un agente, usa los permisos habituales en su archivo de agente, p. ej. `{ action: crew_send, resource: "*", effect: deny }`, o el ajuste `agents` que se describe más abajo.

## Ajustes

Archivo opcional `crew-mail.json` junto a `opencode.json` (ver [crew-mail.example.json](../../crew-mail.example.json)). Se lee cuando se carga el plugin.

| Clave | Valor predeterminado | Significado |
|---|---|---|
| `maxChars` | 4000 | Longitud máxima de un mensaje. Los más largos se rechazan con la sugerencia de escribir un archivo y enviar su ruta. |
| `maxPerSession` | 40 | Mensajes que una sesión puede enviar en total. |
| `maxPerPair` | 6 | Mensajes entre dos sesiones, sumando ambas direcciones, dentro de `pairWindowMinutes`. Evita el ping-pong. |
| `pairWindowMinutes` | 10 | Ventana de tiempo de `maxPerPair`. |
| `wakeLead` | false | `true`: un mensaje a un líder inactivo lo inicia. |
| `copyToLead` | false | `true`: el líder recibe una copia de una línea de cada mensaje entre subagentes (consume contexto del líder). |
| `agents` | null | `null`: todos los agentes pueden usar las herramientas; o bien una lista de nombres de agentes. |
| `logText` | true | `false`: el registro guarda solo el remitente, el destinatario y la longitud. |

Cada mensaje y cada rechazo se registra como una línea JSON en `<data dir>/opencode/log/crew-mail.log` (`~/.local/share/opencode/log/` de forma predeterminada). El plugin no establece conexiones de red.

## Seguridad

- Un mensaje es salida de un modelo. Un agente que haya leído algo malicioso (una página web, un archivo) puede transmitir instrucciones a otro agente. El sobre le indica al destinatario que el mensaje no es del usuario y que no cambia su tarea, pero eso es una pista para un modelo, no una barrera. Mantén tus otras protecciones (permisos, sandbox) para todos los agentes, no solo para el líder.
- El líder no ve los mensajes entre subagentes a menos que `copyToLead` esté activado; el registro sí los ve. De todos modos, se les indica a los agentes que pongan lo importante en sus informes.

## Compatibilidad

- opencode 2.2 o posterior (la API de plugins V2: `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Probado con opencode 2.2.3 en Windows 10, Node 24.
- Sin dependencias, sin paso de compilación. Solo la exportación por defecto de `crew-mail.js` es un plugin.

## Pruebas

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

La prueba de extremo a extremo inicia un `opencode serve` real en carpetas temporales con un modelo falso guionizado (sin proveedor, sin cuenta, sin red) y comprueba que un subagente en ejecución lee el mensaje de un hermano en su siguiente paso, que uno que ya terminó no se despierta y que el líder recibe su mensaje en su siguiente ejecución. Tu propia configuración de opencode y tus sesiones no se tocan. En Windows PowerShell, define la variable con `$env:CREW_MAIL_E2E = "1"`.

## Proyectos relacionados

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): un sandbox de escritura y una parada de emergencia para agentes desatendidos en Windows, del mismo autor; funciona junto con este plugin.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): un canal de control del líder a sus subagentes en ejecución (mensajes, estado, cancelación) y preguntas de un subagente a quien lo llamó; los subagentes no pueden escribirse entre sí.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): subagentes en otras carpetas que informan a quien los llamó.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): mensajería entre iguales ("teammates") mediante cambios en el propio opencode; quedan excluidos los subagentes iniciados con la herramienta task.

## Contribuir

Los informes de errores, las ideas y los pull requests son bienvenidos: consulta [CONTRIBUTING.md](../../CONTRIBUTING.md). Problemas de seguridad: [SECURITY.md](../../SECURITY.md).

## Licencia

[MIT](../../LICENSE)
