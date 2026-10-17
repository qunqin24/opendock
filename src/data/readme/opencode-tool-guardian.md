# opencode-tool-guardian

Plugin para **OpenCode V2** que observa cada llamada a herramientas y detecta
desperdicio y riesgo **antes** de que se ejecuten.

No decide como resolver tu problema, no reescribe tu codigo y no llama a ningun
modelo. Solo aplica reglas deterministas y registra lo que ve.

- **Sin LLM.** Cero llamadas a modelos, embeddings o servicios externos.
- **Local-first.** Todo el estado vive en memoria, por sesion.
- **Seguro por defecto.** El modo por defecto es `observe` y no bloquea nada.
- **Coexiste** con Ponytail, Hashline, Context Mode, Encoding Guard y RTK.

Verificado ejecutandose contra OpenCode **2.0.26** real.

---

## Requisitos

- OpenCode >= 2.0.0 (probado en 2.0.26)
- [Bun](https://bun.sh) solo para desarrollar y compilar. En uso, el plugin es un
  unico archivo JavaScript sin dependencias en tiempo de ejecucion.

---

## Instalacion

### macOS y Linux

OpenCode descubre plugins locales en el directorio de plugins de su configuracion.
Crea un archivo shim que reexporta el bundle compilado:

~~~bash
bun install
bun run build

mkdir -p ~/.config/opencode/plugins
cat > ~/.config/opencode/plugins/tool-guardian.ts <<'SHIM'
export { default } from "/ruta/absoluta/a/opencode-tool-guardian/dist/index.js";
SHIM
~~~

Comprueba que aparece en la lista:

~~~bash
opencode plugin list | grep opencode-tool-guardian
~~~

Deberias ver una linea con el id `opencode-tool-guardian`. Reinicia OpenCode para que lo cargue.

### Windows

El mismo mecanismo funciona en PowerShell. La ruta debe ser absoluta y usar barras
inversas escapadas o barras dobles:

~~~powershell
mkdir "$env:USERPROFILE\.config\opencode\plugins" -Force
notepad "$env:USERPROFILE\.config\opencode\plugins\tool-guardian.ts"
~~~

Contenido del shim (las barras invertidas van duplicadas dentro del literal TypeScript):

~~~ts
export { default } from "C:\\ruta\\absoluta\\opencode-tool-guardian\\dist\\index.js";
~~~

Rutas con espacios funcionan: las comillas de TypeScript se encargan. El plugin no
usa separadores `/` ni utilidades GNU en ningun punto de su ejecucion.

### Instalacion por npm (cuando se publique)

~~~jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["opencode-tool-guardian"]
}
~~~

> La clave `plugin` solo resuelve especificadores de npm. Una ruta del sistema de
> archivos puesta ahi se ignora: por eso la instalacion local usa el directorio
> `plugins/`.

---

## Configuracion

La configuracion es un archivo propio del plugin, separado de `opencode.json`.
No inventa propiedades oficiales.

Copia el ejemplo y ajustalo:

~~~bash
cp tool-guardian.example.jsonc tool-guardian.jsonc
~~~

Busqueda: desde el directorio actual hacia arriba, despues en
`~/.config/opencode/`. Nombres aceptados: `tool-guardian.jsonc`,
`tool-guardian.json`, `.tool-guardian.jsonc`. Admite comentarios y comas
finales. Una configuracion invalida **no lanza**: se usan los valores por defecto y
el error se reporta.

Alternativa desde `opencode.json` (gana sobre el archivo):

~~~jsonc
{
  "plugin": [{ "package": "opencode-tool-guardian", "options": { "mode": "warn" } }]
}
~~~

### Valores por defecto

| Clave | Por defecto | Significado |
|---|---|---|
| `enabled` | `true` | Apaga todo el plugin si es `false` |
| `mode` | `"observe"` | `observe`, `warn` o `enforce` |
| `detectors.*` | todos `true` | Cada detector se apaga por separado |
| `thresholds.repeatedFailureCount` | `3` | Fallos iguales antes de avisar |
| `thresholds.largeOutputLines` | `1500` | Lineas para marcar salida grande |
| `thresholds.maxTrackedOperations` | `2000` | Tope de operaciones recordadas |
| `policy.blockRules` | `[]` | **Vacio = nada se bloquea nunca** |
| `cache.enabled` | `false` | Inerte. Ver limitaciones |
| `rewrites.enabled` | `false` | Inerte. Ver limitaciones |

---

## Modos

- **`observe`** (por defecto). Registra y mide. No modifica argumentos, ni
  resultados, ni errores, ni permisos. Las herramientas se ejecutan igual que sin
  el plugin.
- **`warn`**. Escala avisos por el canal oficial de permisos: una decision
  `allow` pasa a `ask` y el usuario ve el motivo. Una llamada fallida repetida
  anade una linea `[tool-guardian]` al error, que es como el agente se entera.
- **`enforce`**. Solo bloquea reglas de severidad `block` que ademas esten
  listadas en `policy.blockRules`. Con la lista vacia, `enforce` se comporta
  como `warn`.

Guardian **nunca** cambia un permiso a `allow`. Solo puede endurecerlo, nunca
ensancharlo. Un `deny` ya configurado por ti se respeta tal cual.

---

## Detectores

### Duplicados

Huella = SHA-256 de (herramienta + argumentos canonicos + cwd). Un duplicado solo se
marca como **confirmado** cuando ademas se puede probar que los bytes del archivo
detras de la llamada son identicos. Si el estado no es demostrable se registra como
**posible**, nunca como equivalencia segura.

Si el archivo cambio entre llamadas, releerlo es legitimo y no se reporta nada.

### Bucles de fallo

Misma herramienta, mismos argumentos canonicos, mismo cwd, mismo estado demostrable
y misma firma de error (codigo de salida mas un digest del mensaje normalizado).
El contador se reinicia en cuanto algo de eso cambia. Nunca se almacena el texto
completo del error.

### Riesgo de comandos

Analiza argv de verdad: parte el comando en segmentos respetando comillas,
operadores y escapes, y solo escala si el binario peligroso esta en `argv[0]`.

Por eso `echo "rm -rf /"` no dispara nada y `@rm -rf /` si.

Reglas: `risk.rm-destructive`, `risk.rm-workspace-root`, `risk.disk-write`,
`risk.permissions-broad`, `risk.remote-code-execution`, `risk.vcs-destructive`,
`risk.fork-bomb`, `risk.outside-workspace`, `risk.sensitive-path`.

Las de severidad `block` son las unicas que `enforce` puede bloquear, y solo si
las anades a `policy.blockRules`.

Una herramienta desconocida o MCP **nunca** se analiza como comando, aunque su
payload tenga un campo llamado `command`. Adivinar seria justamente el falso supuesto
que el diseno prohibe.

### Busqueda excesiva

Recursion desde la raiz sin exclusiones, directorios generados (`node_modules`,
`.git`, `target`, `dist`, `build`). Sugiere `rg` o acotar la ruta, pero
**nunca** sustituye `grep` o `find` en silencio: no siempre estan instalados ni
tienen la misma semantica.

### Coste de salida

Caracteres, bytes, lineas y una estimacion local de tokens (~4 caracteres por token).
El informe lo dice explicitamente: es una estimacion, no consumo facturado. **No se
trunca nada**; Context Mode es el dueno de la compactacion.

---

## Reporte

El plugin registra la herramienta `guardian_report`. Devuelve contadores agregados de
la sesion actual mas un bloque de **salud del observador**. No incluye comandos,
salidas, codigo, prompts ni variables de entorno.

Los contadores separan lo accionable de lo conjeturado:

| Contador | Significado |
|---|---|
| `Confirmed duplicates` | Misma llamada y bytes del archivo **probablemente identicos** |
| `Possible duplicates` | Misma llamada, estado no demostrable: ojo, no afirmacion |
| `Observer errors` | Fallos internos del propio plugin |

El bloque de salud responde a la pregunta que faltaba: *¿esto esta funcionando?*
Declara el fichero de configuracion que gano, la raiz del workspace, que detectores
estan activos y los umbrales vigentes. Si la configuracion se rechazo, o si el propio
observador lanzo errores, avisa en mayusculas en lugar de mostrar un informe limpio
que parece una sesion sin actividad.

**El plugin no se mide a si mismo.** Las llamadas a `guardian_report` quedan fuera de
los contadores: si no, mirar los numeros seria siempre el duplicado mas frecuente de
la sesion y cada comprobacion moveria lo que pretendes leer.

---

## Correcciones a la especificacion (API real verificada)

La especificacion pedia verificar la API antes de implementar. Esto es lo que se
encontro, contrastando la documentacion oficial con el binario instalado y con los
tipos publicados. Varios puntos de la especificacion estaban desactualizados.

1. **El paquete no es `@opencode-ai/plugin/v2`.** El nombre publicado es
   `@opencode/plugin`. El export es `Plugin.define({ id, setup })`.
2. **Los tipos publicados estan desfasados.** `@opencode-ai/plugin@1.18.3` no
   tiene export `./v2` limpio y su `PluginContext` no declara `tool`, `session`,
   `permission` ni `shell`. Este plugin **no depende de ese paquete**: declara
   localmente solo los tipos que usa (`src/opencode/v2-api.ts`). El export por
   defecto es un objeto plano `{ id, setup }`, identico en forma a
   `Plugin.define(...)`.
3. **Los hooks del ejemplo de la especificacion si existen.** `tool.hook("execute.before")`
   y `tool.hook("execute.after")` funcionan tal cual.
4. **La correlacion si tiene id oficial.** Cada llamada trae `event.id`, asi que no
   hace falta un `lastCommand` global ni correlacion artesanal.
5. **El bloqueo si tiene canal oficial**, pero no por `tool.hook`: es
   `permission.hook("evaluate")`, que forma parte del sistema de permisos nativo.
   Por eso bloquear aqui es respetar la politica de OpenCode, no sustituirla.
6. **Un `deny` configurado es final** y ni siquiera invoca el hook. Guardian solo
   ve decisiones `allow` y `ask`.
7. **`setup` puede devolver una funcion de limpieza.** Se usa para deshacer los
   registros al descargar. Ademas el registro de plugins llama a
   `plugin.dispose()` si existe.
8. **No hay dominio `logger`** en el contexto. El plugin reporta por la herramienta
   y por `console.warn`, nunca por `ctx.app.logger`.
9. **La clave de configuracion es `plugin`** (singular) en `opencode.json`, y solo
   acepta especificadores de npm. Los plugins locales se descubren en el directorio
   `plugins/`.
10. **`execute.before` puede modificar `event.input`**, pero eso no permite
    saltarse la ejecucion de la herramienta. Por eso la cache sigue apagada.

---

## Capacidades no implementadas

- **Cache de resultados.** No existe en V2 ningun mecanismo oficial para que un hook
  devuelva un resultado en lugar de ejecutar la herramienta. `execute.before` solo
  puede alterar `input`. Falsificar esa capacidad seria mentir sobre la API.
- **Reescritura de argumentos.** Queda en `rewrites.enabled`, inerte, hasta tener
  pruebas de equivalencia semantica. Ninguna reescritura ocurre en 0.1.0.
- **Supresion de ejecuciones.** Ningun detector evita una llamada en 0.1.0, ni
  siquiera en `enforce`: `enforce` bloquea, no evita silenciosamente.
- **Tokens reales ahorrados.** No hay metricas de proveedor. El informe solo da una
  estimacion local de tamano, etiquetada como tal.
- **Persistencia en disco.** No se escribe nada. Todo el estado es memoria, con LRU y
  TTL acotados por sesion.
- **Orden entre plugins.** No se asume que el orden de hooks sea estable entre
  instalaciones, asi que no se hacen comparaciones antes/despues de otros plugins.

---

## Portabilidad (Linux, macOS, Windows)

### Rutas: el punto delicate

La comparacion de rutas es lo unico que de verdad cambia entre sistemas, porque
`node:path` cambia de comportamiento segun el host. `normalizePath` resuelve esto
con una precedencia explicita:

1. si el host es Windows, reglas de Windows;
2. si la ruta tiene letra de unidad (`C:...`) o prefijo UNC (`\\servidor...`),
   reglas de Windows, **aunque el proceso corra en POSIX**;
3. si no, manda el `cwd` suministrado;
4. si no, reglas POSIX, donde una barra invertida sigue siendo un caracter de
   nombre de archivo legitimo.

El punto 2 es lo que hace verificable Windows desde macOS: el resultado ya no depende
de la maquina que lo calculo. Los tests de rutas de Windows se ejecutan en los tres
sistemas y no estan dentro de un `if (process.platform === "win32")`.

### `isWithin` normaliza la raiz

`ctx.location.project.canonical` llega con sus separadores nativos, mientras que los
candidatos ya vienen normalizados. Compararlos en crudo rompia en Windows y hacia que
**todo** archivo del proyecto pareciera estar fuera del workspace, con lo que cada
comando normal tocaba un archivo disparaba `risk.outside-workspace`. La raiz se
normaliza ahora en el punto de comparacion compartido, con un test de regresion.

### CI en los tres sistemas

`.github/workflows/ci.yml` corre `typecheck`, `test` y `build` en
`ubuntu-latest`, `macos-latest` y `windows-latest`. `.gitattributes` fija LF: el
analizador de shell parte lineas de texto y un CRLF meteria un `\r` fantasma en el
ultimo token.

### Lo que sigue sin verificarse

  Los workflows son `tests.yml` (matriz ubuntu/macos/windows: tipos, tests y build) y
  `release.yml` (GitHub release tras un push verde a main, saltandose si el tag ya
  existe), siguiendo el esquema de los de Context Mode.
- No hay deteccion de escalada de privilegios de Windows (`runas`,
  `Start-Process -Verb RunAs`); las reglas de riesgo cubren las de POSIX (`sudo`,
  `doas`).
- Los ficheros no se pliegan a minusculas en la huella. En Windows y en macOS por
  defecto `Foo.ts` y `foo.ts` son el mismo archivo y generarian huellas distintas: se
  pierde una deteccion de duplicado, nunca se inventa una. En Linux la distincion es
  real, asi que plegar ahi seria incorrecto.
- Las reglas de busqueda excesiva usan banderas estilo GNU (`--exclude-dir`), que en
  Windows tienen otra equivalencia. Sugieren, no bloquean.

---

## Desarrollo

~~~bash
bun install
bun run typecheck   # tsc --noEmit, modo estricto
bun test            # 72 pruebas: unitarias + integracion
bun run build       # dist/index.js, un solo archivo ESM
bun run check       # typecheck + test + build
~~~

La suite incluye integracion contra un contexto V2 simulado que reproduce los
puntos de despacho reales: registro y limpieza de hooks, correlacion de llamadas
paralelas por `id`, no mutacion en modo `observe`, herramienta MCP desconocida
intacta, canal de permisos y bytes intactos en un archivo Latin-1.

### Publicar en npm

~~~bash
bun run check
npm version 0.1.0
npm publish --access public
~~~

`files` en `package.json` publica solo `dist`, la licencia y la documentacion.
Repositorio: https://github.com/zademy/opencode-tool-guardian.

---

## Privacidad

No se guarda codigo, secretos, prompts, variables de entorno ni salidas completas.
El informe expone contadores y tamanos derivados. Las huellas se calculan sobre
bytes crudos, nunca leyendo texto, para no alterar ni transcodificar archivos con
codificaciones heredadas.

## Licencia

MIT. Ver [LICENSE](LICENSE).
