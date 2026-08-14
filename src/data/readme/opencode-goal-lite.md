# opencode-goal-lite

Un único Goal visual para OpenCode. Escribes qué quieres conseguir y OpenCode continúa hasta terminar, necesitar tu ayuda o alcanzar un límite seguro.

Este proyecto es un fork incompatible de [`opencode-goal-plugin`](https://github.com/willytop8/OpenCode-goal-plugin) v0.6.2. Conserva su historial, licencia MIT y atribución, pero reduce deliberadamente la experiencia a un solo objetivo por sesión.

## Instalar

Requiere OpenCode `>=1.17.18 <2` y Node.js 18 o posterior.

```sh
opencode plugin opencode-goal-lite --global
```

No hace falta añadir comandos ni opciones a `opencode.json`. Reinicia OpenCode después de instalarlo.

> No actives a la vez `opencode-goal-plugin` y `opencode-goal-lite`. Goal Lite detecta el conflicto y deshabilita la continuación automática.

## Usar

En la TUI escribe:

```text
/goal
```

El diálogo solo muestra las acciones pertinentes:

- Sin Goal: escribir el objetivo e iniciar.
- Trabajando: pausar, editar o descartar.
- Pausado o bloqueado: reanudar, editar o descartar.
- Límite alcanzado: continuar otro bloque o descartar.
- Terminado: ver el resumen, la evidencia informada por el agente o crear otro Goal.

Editar no reanuda el trabajo. Descartar siempre pide confirmación.

En Desktop o un servidor persistente también se aceptan mensajes normales:

```text
goal: corrige el fallo y demuestra que las pruebas pasan
goal: status
goal: pause
goal: resume
goal: clear
```

Si un cliente envía `/goal ...` como texto normal, se interpreta del mismo modo. No se registra un segundo comando de servidor.

`opencode run` puede crear y consultar un Goal, pero no mantiene un proceso vivo para las continuaciones autónomas. Para esa función usa la TUI, Desktop o un servidor persistente.

## Qué puede hacer la IA

El agente solo recibe tres herramientas:

- `create_goal({ objective })`, únicamente ante una petición explícita del usuario.
- `get_goal()`, para consultar estado, progreso y consumo.
- `update_goal(...)`, para terminar con resumen y evidencias o declarar un bloqueo con un motivo concreto.

La IA no puede pausar, reanudar, editar ni borrar el Goal. Esas decisiones pertenecen al usuario. Tampoco existen marcadores de texto como `[goal:complete]`.

## Límites fijos

Cada bloque permite como máximo:

- 10 continuaciones automáticas.
- 15 minutos de trabajo activo.
- 200.000 tokens efectivos acumulados.

Hay al menos 1,5 segundos entre continuaciones. Dos turnos sin progreso pausan el Goal. Los errores de proveedor, autenticación, cuota, cancelación o permisos rechazados también lo pausan para no insistir a ciegas.

“Continuar otro bloque” suma otros 10 turnos, 15 minutos y 200.000 tokens al techo, pero mantiene visible el consumo histórico. Reanudar una pausa normal no reinicia nada.

Los tokens se cuentan por ID de mensaje, incluidos pasos con herramientas y subagentes relacionados. Las lecturas de caché son diagnósticas y no se duplican como consumo efectivo. Compactar o borrar el chat nunca devuelve presupuesto.

## Persistencia y seguridad

El servidor es la fuente de verdad. Guarda un JSON por sesión en:

```text
${XDG_STATE_HOME:-~/.local/state}/opencode-goal-lite/
  projects/<project-hash>/sessions/<session-hash>.json
```

Los directorios usan permisos `0700` y los archivos `0600` en sistemas POSIX. Las escrituras son atómicas, se serializan por sesión, rechazan enlaces simbólicos y mantienen un ledger JSONL limitado. Tras reiniciar, cualquier Goal que estuviera trabajando se recupera como `Pausado`.

El objetivo se reenvía como contenido sintético de usuario, nunca como instrucción de sistema. Durante la compactación solo se conservan el objetivo original y contadores generados por el plugin.

## Desarrollo

```sh
npm ci
npm run verify
```

La CI prueba Node 18, 20, 22 y 24, además de Linux, macOS y Windows. `npm run smoke:packed` instala el tarball generado y verifica los exports y las tres herramientas. `npm run smoke:opencode-install` ejecuta la orden de instalación de OpenCode con HOME/XDG vacíos y comprueba que solo se registran los destinos servidor y TUI esperados.

Consulta [compatibilidad](docs/compatibility.md), [contribución](CONTRIBUTING.md) y [publicación](docs/releasing.md).

## Licencia y atribución

MIT. El copyright original de William Ricchiuti permanece en [LICENSE](LICENSE). El rediseño Goal Lite se distribuye bajo la misma licencia.
