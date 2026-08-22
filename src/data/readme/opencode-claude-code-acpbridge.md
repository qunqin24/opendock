# opencode-claude-code-acpbridge

Plugin **exclusivo para usar [Claude Code](https://www.anthropic.com/claude-code) dentro de [OpenCode](https://opencode.ai)**. Es a la vez **provider de modelos** y **plugin**, y su backend es un **cliente ACP** ([Agent Client Protocol](https://agentclientprotocol.com)) que habla con `claude-agent-acp`. Claude Code aparece como un modelo más en OpenCode, ejecutándose con **tu suscripción de Claude**, y **OpenCode queda como orquestador**: el agente solo razona y **OpenCode ejecuta las herramientas** con sus permisos y su TUI.

> Un único paquete npm que se registra a la vez como **provider** (`createACPModelProvider`) y como **plugin** (`default { id, server }`) de OpenCode.

**Atajos:** [Inicio rápido](#configuración-en-opencode) · [Agentes](#agentes-claude-code-modos-esfuerzo-subagentes) · [Facturación](#system-prompt-y-facturación-suscripción-vs-extra-usage) · [Diagnóstico](#diagnóstico) · [Ejemplos de config](examples/) · [Desarrollo](docs/DEVELOPMENT.md) · [Cambios](CHANGELOG.md)

---

## Cómo funciona

OpenCode habla con el provider por el interfaz `LanguageModelV3` del Vercel AI SDK. El provider spawnea el agente ACP, le **deshabilita sus herramientas nativas** y le expone **las herramientas de OpenCode** a través de un MCP server sintético. Cuando el agente llama una herramienta, el provider devuelve el control a OpenCode, que la ejecuta y reinyecta el resultado.

```
OpenCode (orquestador)                    opencode-claude-code-acpbridge                 claude-agent-acp (agente)
  prompt + tools(read,bash,…) ─► doStream ─► sesión ACP (tools nativas OFF) ─► Claude razona
                                            + MCP server con las tools de OC ─►
  ◄──── tool-call (read) ────── finish(tool-calls)  ◄── el agente llama read (MCP, diferido)
  ejecuta read (permiso+TUI)
  tool-result ──────────────► doStream ─► resuelve el tools/call diferido ──► el agente continúa
  ◄──── texto final ───────── finish(stop)         ◄── end_turn
```

Puntos clave:

- **OpenCode ejecuta las herramientas** (nativas: `read`/`write`/`bash`/`edit`/… y las de los **MCP servers que tengas configurados en OpenCode**), con su sistema de permisos.
- El agente arranca como **"cerebro limpio"**: sin sus herramientas nativas, sin los skills/hooks/agents/plugins/MCP de tu `~/.claude`, y sin los **connectors de tu cuenta claude.ai** (Gmail, Drive, Supabase…, vía `strictMcpConfig`).
- **Sesión ACP persistente por conversación**: tras el primer turno se envía solo el último mensaje del usuario, así el agente reaprovecha el **prompt cache** de Claude Code y no re-procesa el historial.

---

## Requisitos

| Requisito | Notas |
|---|---|
| **OpenCode** | Probado con v1.17.9. |
| **El agente ACP** | `@zed-industries/claude-agent-acp` (binario `claude-agent-acp`) en el `PATH`. También sirve `claude-code-acp`. |
| **Claude Code CLI** | El binario `claude` instalado y **autenticado** (`claude` lee `~/.claude/.credentials.json`). El provider lo detecta con `command -v claude`. |
| **Node** | El runtime del MCP server interno se ejecuta con `node` (debe estar en el `PATH`). |

---

## Instalación

```bash
# 1. El agente ACP (una vez)
npm i -g @zed-industries/claude-agent-acp
# y autentica Claude Code si no lo está:
claude   # (login interactivo)

# 2. Este provider
npm i opencode-claude-code-acpbridge
#   o, en desarrollo, apúntalo por ruta:  "npm": "file:///ruta/a/opencode-claude-code-acpbridge"
```

---

## Configuración en OpenCode

La config de proyecto de OpenCode va en **`<proyecto>/.opencode/opencode.json`** (no en la raíz). En rutas fuera de tu `$HOME` (p. ej. `/tmp`), apúntala con `OPENCODE_CONFIG=/ruta/opencode.json`.

### Recomendado: auto-registro (config mínima)

Lista **solo el plugin** con las opciones del agente. Al iniciar, el plugin **descubre los modelos del agente** (con una conexión ACP efímera), rellena su metadata (coste, límites, modalidades) desde [models.dev](https://models.dev) e **inyecta el provider `acp` en runtime**:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-claude-code-acpbridge", { "command": "claude-agent-acp" }]
  ]
}
```

Con eso aparecen `acp/sonnet`, `acp/haiku`, etc. en el selector, ya poblados con contexto/coste/modalidades. **Tú mantienes el control total del agente** mediante esas mismas opciones del plugin (la tabla de abajo: `args`, `cwd`, `env`, `claudeExecutable`, `streamCloseTimeoutMs`, `claudeCode`…). El plugin solo auto-genera la **lista de modelos y su metadata**; no impone nada más.

- El descubrimiento se **cachea** (~1 h) en `~/.acp-model-provider/`; solo el primer arranque (o tras expirar) gasta los ~3-5 s de spawn del agente.
- La metadata sale del **mismo catálogo que usa OpenCode** (`~/.cache/opencode/models.json`, con `https://models.dev/api.json` como fallback). Los costes son informativos.
- Opciones extra del plugin: `providerId` (por defecto `acp`) y `name`. Si ya declaras `provider.<id>` a mano, el plugin **lo respeta y no lo toca**.
- Refresca tras un cambio de modelos con `npx opencode-claude-code-acpbridge sync` (ver [Diagnóstico](#diagnóstico)).

### Manual (avanzado / override)

Para fijarlo todo a mano, declara el provider tú mismo (el plugin no lo sobreescribe):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "acp": {
      "npm": "opencode-claude-code-acpbridge",
      "name": "Claude Code (ACP)",
      "options": { "command": "claude-agent-acp" },
      "models": { "sonnet": { "id": "sonnet", "tool_call": true, "reasoning": true } }
    }
  },
  "plugin": ["opencode-claude-code-acpbridge"]
}
```

En desarrollo, apunta por ruta: `["file:///ruta/a/opencode-claude-code-acpbridge", { … }]` en `plugin` (y `"npm": "file:///ruta/a/opencode-claude-code-acpbridge"` si declaras el provider a mano).

Si das permiso a las tools (p. ej. `"permission": { "read": "allow" }`), el agente podrá usarlas a través de OpenCode.

### Cambiar el `providerID` (p. ej. para opencode-quota)

Por defecto el provider se registra como **`acp`**. Si necesitas otro ID —típicamente **`anthropic`** para que [opencode-quota](https://www.npmjs.com/package/@slkiser/opencode-quota) detecte y muestre la cuota de tu **suscripción**— pásalo en las opciones del **plugin** (no declares un provider a mano, así evitas un doble backend):

```jsonc
"plugin": [
  ["opencode-claude-code-acpbridge", { "command": "claude-agent-acp", "providerId": "anthropic" }]
]
```

Así el **auto-registro, el resume, el puente de permisos y los agentes** (`claude-code` → `anthropic/default`) usan ese ID de forma **coherente y con un solo backend**.

> ⚠️ Usar `"anthropic"` **sobrescribe el provider oficial de Anthropic** de OpenCode. Es seguro **si no usas la API directa de Anthropic** (consumes de la suscripción vía ACP). A vigilar: OpenCode puede listar modelos "fantasma" de models.dev en el selector (usa solo `anthropic/default` y `anthropic/sonnet`); si algún día quieres la API directa, quita el `providerId`.

---

## Opciones del provider (`options`)

Todas se resuelven primero desde `options` y luego desde la variable de entorno equivalente.

| Opción | Tipo | Env var | Por defecto | Descripción |
|---|---|---|---|---|
| `command` | `string` | `ACP_COMMAND` | — (requerido) | Comando del agente ACP a spawnear. |
| `args` | `string[]` | `ACP_ARGS` | — | Argumentos del comando. |
| `cwd` | `string` | `ACP_CWD` | `process.cwd()` | Directorio de trabajo del agente. |
| `env` | `Record<string,string>` | `ACP_ENV` (JSON) | — | Variables de entorno extra para el proceso del agente. |
| `claudeExecutable` | `string` | `CLAUDE_CODE_EXECUTABLE` | autodetectado (`command -v claude`) | Ruta al binario nativo de Claude Code. |
| `streamCloseTimeoutMs` | `number` | `ACP_STREAM_CLOSE_TIMEOUT_MS` | `600000` | `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` del agente. Permite que un `tools/call` diferido espere a OpenCode más de 60 s (p. ej. mientras apruebas un permiso). |
| `claudeCode` | `object` | — | "cerebro limpio" | Control del ecosistema de Claude Code (ver abajo). |

### `claudeCode` — control del ecosistema de Claude Code

Por defecto el agente arranca con el "cerebro limpio" (sin tus skills/hooks/agents/MCP),
pero **usando tu configuración de Claude Code** (`~/.claude`) para que las sesiones sean
reanudables. Puedes ajustarlo:

| Campo | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `model` | `string` | el modelId de OpenCode | Modelo de Claude (ver "Selección de modelo"). |
| `fallbackModel` | `string` | — | Modelo de reserva si el primario falla. |
| `effort` | `"low"\|"medium"\|"high"\|"xhigh"\|"max"` | `"high"` | Nivel de esfuerzo de razonamiento. |
| `thinking` | `{type:"adaptive"\|"enabled"\|"disabled", display?:"summarized"\|"omitted", budgetTokens?}` | **`{type:"enabled", display:"summarized"}`** | Config de thinking/reasoning. El default muestra el **bloque de razonamiento** en OpenCode (`Thought: …`); usa `display:"omitted"` o `type:"disabled"` para ocultarlo, o `"adaptive"` para pensar solo cuando haga falta. |
| `maxThinkingTokens` | `number` | — | (Deprecado; usa `thinking`.) |
| `maxTurns` | `number` | — | Máximo de turnos del agente. |
| `maxBudgetUsd` | `number` | — | Tope de gasto por turno. |
| `mode` | `"default"\|"plan"\|"acceptEdits"\|"bypassPermissions"\|…` | — | **Modo de sesión ACP**, aplicado en caliente con `setSessionMode`. P. ej. `"plan"` (planifica) o `"bypassPermissions"` (deja que OpenCode sea la única autoridad de permisos). Configurable por agente vía `providerOptions.acp.mode`. |
| `permissionMode` | `"default"\|"acceptEdits"\|…` | resuelto por el agente | (Heredado; el ACP lo ignora para el modo de sesión — usa `mode`.) |
| `systemPromptMode` | `"preset"\|"append"\|"replace"` | **`"preset"`** | Cómo se traslada el system prompt de OpenCode (ver "System prompt y facturación"). **`preset` (default) = consume de tu suscripción; `append`/`replace` = extra usage.** |
| `configDir` | `string \| "isolated" \| false` | **`false`** | `false` (default): hereda tu `~/.claude`, así las sesiones iniciadas en OpenCode **se retoman con `claude --resume <id>`** (ver "Retomar la sesión en Claude Code"). No reintroduce tu ecosistema: eso lo siguen mandando `settingSources`/`tools`/`strictMcpConfig`. `"isolated"`: dir limpio con tus credenciales enlazadas (sesiones invisibles para `claude --resume`). Ruta: úsala tal cual como `CLAUDE_CONFIG_DIR`. |
| `forwardEnvContext` | `boolean` | **`true`** | Reenvía la parte **factual** del system prompt de OpenCode (bloque `<env>`: directorio de trabajo, raíz del workspace, git, plataforma, fecha; y `<available_references>`) como contexto de usuario. Con `systemPromptMode: "preset"` el system nunca llega al agente, así que sin esto trabaja sin saber dónde está. Solo viajan bloques factuales — nunca las instrucciones de OpenCode — así que la sesión sigue en suscripción. Se manda completo una vez por sesión y luego solo el delta. |
| `settingSources` | `("user"\|"project"\|"local")[]` | `[]` | Settings de Claude Code a cargar (hooks/agents). |
| `tools` | `string[]` | `[]` | Herramientas **nativas** del agente a habilitar. `[]` = ninguna. |
| `disallowedTools` | `string[]` | — | Herramientas nativas a prohibir. |
| `strictMcpConfig` | `boolean` | **`true`** | Usa **solo** el host de tools de OpenCode e ignora todo lo demás: el `.claude.json` y los **connectors de tu cuenta claude.ai** (Gmail, Drive, Supabase, Notion…). `false` para dejar pasar esos connectors. |
| `allowedTools` | `string[]` | — | Tools auto-aprobadas (sin `requestPermission`). Con el **puente de permisos** activo se usa `["mcp__opencode"]` para que las tools de OpenCode no pidan doble permiso (ver "Puente de permisos"). |
| `nativeTools` | `string[]` | — | Tools **nativas** de Claude que OpenCode no cubre. Los agentes inyectados usan `["NotebookEdit", "Read", "ExitPlanMode", "WebSearch"]`: `ExitPlanMode` es lo que permite **salir** del modo plan, y `WebSearch` cubre que OpenCode no registre su `websearch` cuando `providerId` no es `"opencode"`. Se añaden a `tools`. |
| `resourceSearch` | `boolean` | — | Habilita `ListMcpResources`/`ReadMcpResource` (búsqueda de recursos MCP, superior a OpenCode). |
| `nativeSubagents` | `boolean \| Record` | — | Subagentes nativos (`Task`). `true` añade un subagente "general" que **delega la ejecución a OpenCode**; un `Record` define subagentes a medida. |
| `nativeSkills` | `boolean \| string[]` | — | Skills de Claude Code. `string[]` precarga solo esos (`settings.skills`, menor riesgo billing); `true` carga `~/.claude/skills` (`settingSources:"user"`, mayor riesgo). Añade la tool `Skill`. |
| `projectMemory` | `boolean` | — | Carga `CLAUDE.md`/`AGENTS.md` del proyecto (`settingSources:"project"`). Convive con plugins de memoria de OpenCode (hindsight). |
| `skillShell` | `boolean` | `false` | Permite que los skills ejecuten shell con la `Bash` nativa. Por defecto orquestan vía las tools de OpenCode. |
| `agents`, `hooks`, `mcpServers`, `plugins`, `systemPrompt` | — | — | Inyectar subagents/hooks/MCP/plugins propios o un system prompt avanzado. |
| `options` | `Record<string,unknown>` | — | Passthrough libre a `_meta.claudeCode.options` (cualquier campo del SDK). |

---

## Selección de modelo y razonamiento

Con el auto-registro **no necesitas declarar modelos**: el plugin publica los que descubre del agente — **`acp/default`** (= Opus 4.7, 1M ctx), **`acp/sonnet`**, **`acp/sonnet[1m]`**, **`acp/haiku`** — y los eliges en el selector de modelos de OpenCode. El `id` del modelo es el que se pasa al agente (vía `ANTHROPIC_MODEL`).

También puedes fijarlo en el provider o por agente: `"options": { "claudeCode": { "model": "sonnet" } }`, o `agent.<nombre>.model: "acp/sonnet"`.

Valores: aliases (`sonnet`, `haiku`, `opus`, `default`), variantes (`sonnet[1m]` = contexto 1M) o IDs completos (`claude-sonnet-4-6`).

> **Importante — qué modelos están disponibles**: la lista **la define el backend de tu cuenta/suscripción**, no este provider ni un catálogo fijo. Para verla, arranca con `ACP_DEBUG=1` y busca `available models: …` en los logs (p. ej. `default, sonnet, sonnet[1m], haiku`).
>
> **Versiones**: los aliases resuelven a la versión actual del backend; para fijar una usa el ID completo o un sufijo (`sonnet[1m]`).
>
> **Modelos (jun-2026, cuenta Max)**: `sonnet` (claude-sonnet-4-6), `sonnet[1m]` (1M ctx, *extra usage*), `haiku` (claude-haiku-4-5), `opus` (claude-opus-4-7) y `default` (= **Opus 4.7**, 1M ctx, "más capaz") **responden**. `fable` salió de la suscripción el 22-jun-2026 (pasa a *usage credits*); `mythos` solo está en "Project Glasswing" → ambos dan `issue with the selected model`. El descubrimiento solo **lista** `default/sonnet/sonnet[1m]/haiku`, pero `opus` también funciona vía `ANTHROPIC_MODEL`.

El **esfuerzo (effort)** se expone como **variantes del modelo** (`acp/opus:low` … `:max`): elígelas en el selector de la TUI o fíjalas por agente con `variant`. También por-llamada vía `providerOptions.acp.effort`, o fijo en el provider:

```jsonc
"options": { "claudeCode": { "model": "sonnet", "effort": "xhigh",
  "thinking": { "type": "enabled", "budgetTokens": 16000 } } }
```

---

## System prompt y facturación (suscripción vs extra usage)

En ACP "puro" el cliente **no** controla el system prompt del agente. `claude-agent-acp` añade una extensión (`_meta.systemPrompt`) para trasladar el system que arma OpenCode. **Hay un detalle de facturación clave:** Anthropic clasifica la sesión según el system prompt. Si reenvías el system de OpenCode, la sesión se considera **app de terceros** y se factura como **extra usage** (de pago); el preset oficial de Claude Code, en cambio, consume de tu **suscripción** Pro/Max.

`systemPromptMode` controla ese equilibrio:

- `"preset"` (**por defecto**): se **ignora** el system de OpenCode; el agente usa solo el preset oficial `claude_code`. → Consume de tu **SUSCRIPCIÓN**. Las tools de OpenCode se orquestan igual (vía MCP); el agente se comporta como **Claude Code nativo** en lugar de seguir las instrucciones/agentes de OpenCode.
- `"append"`: preset oficial + el system de OpenCode añadido. Fidelidad total a OpenCode, **pero facturado como EXTRA USAGE**.
- `"replace"`: el system de OpenCode pasa a ser todo el system prompt. También **extra usage**.

```jsonc
// suscripción (por defecto — no hace falta declararlo):
"options": { "claudeCode": { "systemPromptMode": "preset" } }
// fidelidad total a OpenCode, a cambio de extra usage:
"options": { "claudeCode": { "systemPromptMode": "append" } }
```

> Verificado empíricamente: el desvío a *extra usage* lo dispara un clasificador de Anthropic sobre el system prompt (detecta el "carácter" de app de terceros); no depende del nombre, el modo ni el tamaño. Con `preset` el modelo responde con **0 extra usage**.

---

## Agentes Claude Code (modos, esfuerzo, subagentes)

Al auto-registrarse, el plugin **inyecta dos agentes** en OpenCode (selector de agentes), igual que otros plugins inyectan los suyos:

- **`claude-code`** — Claude Code nativo (modelo `acp/default` = Opus 4.7), modo ACP **`bypassPermissions`** para que **OpenCode sea la única autoridad de permisos** (no añade sus propios prompts; ejecuta las tools con tu TUI/permisos).
- **`claude-code-plan`** — modo **`plan`**: el agente **planifica** (investiga, lee, redacta el plan) sin hacer cambios destructivos. Variante de esfuerzo `high`.

Cámbialos o desactívalos desde las opciones del plugin:

```jsonc
"plugin": [["opencode-claude-code-acpbridge", { "command": "claude-agent-acp",
  "agents": {                         // o "agents": false para no inyectar ninguno
    "claude-code":      { "model": "default", "options": { "mode": "bypassPermissions" } },
    "claude-code-plan": { "model": "default", "variant": "high", "options": { "mode": "plan" } }
  }
}]]
```

Cada agente lleva `options` (modo ACP, esfuerzo…) que viajan al provider como `providerOptions.acp` y se aplican **en caliente** (`setSessionMode` / `setSessionConfigOption`), sin recrear la sesión.

> **Tu `opencode.json` manda.** Si declaras el agente en la sección `agent` de tu `opencode.json`, **tus ajustes ganan** sobre los del plugin (merge profundo): declara solo lo que quieras cambiar y hereda el resto. Ideal para **filtrar herramientas por `permission`** sin tocar el plugin:
> ```jsonc
> "agent": {
>   "claude-code": { "permission": { "edit": "deny", "bash": "ask" } }  // hereda model/mode/options del plugin
> }
> ```
> También `"disable": true` para apagar un agente inyectado.

- **Modos**: como OpenCode ejecuta las tools con sus permisos, los modos de permiso de Claude Code no cambian *quién* autoriza; `bypassPermissions` solo evita el round-trip de `requestPermission`. El útil con efecto propio es **`plan`**. Evita `dontAsk` (puede bloquear tools).
- **Subagentes**: con "OpenCode orquesta" (`tools: []`) los subagentes nativos de Claude Code están deshabilitados; el agente usa la tool `task` de **OpenCode** → los subagentes son los de OpenCode.
- **Reanudar sin reenviar historial**: el plugin guarda un registro `~/.acp-model-provider/sessions.json` (sessionID de OpenCode → sessionId de Claude Code). Al reabrir una sesión, el provider hace `resumeSession` en vez de reenviar todo el historial → **ahorra tokens**.

---

## Manejo de las herramientas y puente de permisos

El agente `claude-code` combina **lo mejor de ambos mundos** — *potencia nativa sin estropear nada*:

- **Tools comunes → OpenCode las orquesta.** El provider captura todas las que OpenCode expone (nativas `read`/`write`/`bash`/`edit`/`grep`/… + las de tus MCP servers) y el agente las usa vía MCP: se ejecutan en OpenCode con sus permisos, su TUI y su registro (hindsight las ve). Van en `allowedTools: ["mcp__opencode"]` para que **no pidan doble permiso**.
- **Capacidades nativas superiores de Claude Code** que OpenCode no replica, activas por defecto: **skills** (`Skill`), **subagentes** (`Task`, que delegan la ejecución a OpenCode), **búsqueda de recursos MCP** (`ListMcpResources`/`ReadMcpResource`) y tools de nicho (`NotebookEdit`). Más la **memoria del proyecto** (`CLAUDE.md`/`AGENTS.md`), que convive con hindsight.
- **Puente de permisos.** Cuando el agente (o un subagente) quiere usar una tool **nativa**, Claude Code pide permiso vía ACP (`requestPermission`); el provider lo **camufla como un tool-call de `claude_permission`** (meta-tool que el plugin registra en OpenCode), así **OpenCode muestra su prompt `ask`** con qué quiere hacer Claude y **tu veredicto** (aprobar/rechazar) vuelve al agente. El agente tiene toda su potencia nativa, pero **tú controlas cada acción** desde OpenCode.
  - Granularidad por tool: `permission: { claude_permission: { "Read*": "allow", "*": "ask" } }`.
  - Requiere que el agente NO esté en `bypassPermissions` → el agente `claude-code` usa `mode: "default"`.
- **Facturación**: todos estos features mantienen tu **suscripción** (verificado con `scripts/verify-billing.mjs`, 0 extra usage) — son nativos de Claude Code.
- Para el modelo **clásico "cerebro limpio"** (sin nativas, OpenCode ejecuta todo) usa `mode: "bypassPermissions"` + sin toggles, o el provider manual con `claudeCode.tools: []`.

---

## Multimodalidad (imagen, PDF, audio, vídeo)

Lo que el agente acepta en el prompt lo anuncia en `promptCapabilities` (míralo con `ACP_DEBUG=1`). Con el `claude-agent-acp` actual es `{"image": true, "embeddedContext": true}`. Los adjuntos llegan como `file` parts del prompt de OpenCode y el provider los convierte a ContentBlocks ACP respetando esas capacidades:

| Tipo | Soporte | Cómo |
|---|---|---|
| **Imagen** (`image/*`) | ✅ | ContentBlock `image` (base64). *Validado.* |
| **PDF / documentos** (`application/pdf`, `text/*`, …) | ✅ | Recurso embebido (ContentBlock `resource`, requiere `embeddedContext`). |
| **Audio** (`audio/*`) | ❌ hoy | El agente no anuncia `audio`; se omite con una nota. Si una versión futura lo soporta, se enviará automáticamente. |
| **Vídeo** (`video/*`) | ❌ | No existe en ACP ni lo procesa Claude; se omite con una nota. |

Las URLs remotas (sin datos embebidos) se omiten — el agente recibe solo adjuntos con bytes (base64).

## Retomar la sesión en Claude Code

Por defecto (`configDir: false`) el agente usa **tu** `~/.claude`, así que toda conversación
iniciada desde OpenCode queda en `~/.claude/projects/<proyecto>/<id>.jsonl` y se puede
continuar en la terminal:

```bash
# el provider imprime el id al crear cada sesión, sin necesidad de ACP_DEBUG:
#   [acp] session 1c66e017-… — retomable con: claude --resume 1c66e017-…
claude --resume 1c66e017-4536-4157-80aa-e451420520e0
```

Debe ejecutarse en el **mismo directorio de trabajo**: Claude Code indexa las sesiones por
`cwd`. Si prefieres el aislamiento anterior (sesiones fuera de tu `~/.claude` y por tanto
invisibles para `--resume`), pon `"configDir": "isolated"`.

Que se herede el directorio de configuración **no** significa que el agente cargue tu
ecosistema: eso lo siguen decidiendo `settingSources` (por defecto `[]`), `tools` y
`strictMcpConfig`. `configDir` solo decide **dónde vive el estado**.

---

## Continuidad de sesión y coste de tokens

El prompt cache de Claude vive y muere **con la sesión del agente**, así que el bridge está
diseñado para recrearla lo menos posible:

- **Cambiar de agente no rompe nada.** Puedes empezar en `claude-code-plan`, aprobar el plan
  y seguir en build o en `claude-code` sobre la **misma** sesión ACP: el cambio de modo se
  aplica en caliente con `setSessionMode`. Los dos agentes comparten el mismo perfil de tools
  y permisos y difieren solo en el modo inicial.
- **Cambiar el set de tools tampoco.** Se propaga en caliente a la sesión viva
  (`notifications/tools/list_changed`).
- **Solo se envía lo que el agente no ha visto.** Sus propias tool-calls y resultados no se
  reenvían: ya los tiene. Los de un agente intercalado sí, resumidos.
- **Revertir mensajes y compactar sí crean sesión nueva**, porque el agente no puede
  "desrecordar" — pero se parte del historial ya truncado, no del original.

Con `ACP_DEBUG=1` puedes comprobarlo: durante una conversación normal debes ver
`reuse session <id>` en cada turno y un `cacheR` alto en `usage(turn)`.

---

## Diagnóstico

Activa logs con `ACP_DEBUG=1` (verás `[acp-orchestrator]` y `[acp-mcp-host]` en stderr; con `opencode run … --print-logs`).

| Síntoma | Causa / solución |
|---|---|
| `Model not found: acp/…` | OpenCode no cargó tu config o el auto-registro falló. La config debe estar en `<proyecto>/.opencode/opencode.json`; en rutas donde OpenCode no detecta el proyecto (p. ej. `/tmp`), exporta `OPENCODE_CONFIG=<ruta-a-opencode.json>`. Con `ACP_DEBUG=1` busca `[acp-plugin] auto-registered…` en el arranque. |
| El auto-registro no añade modelos | Ejecuta `npx opencode-claude-code-acpbridge sync <command>` para ver qué descubre y forzar refresh del caché. Si el agente no halla el binario nativo de Claude, fija `claudeExecutable`. |
| `API Error: 400 … extra usage` | El **system prompt** disparó el clasificador de Anthropic (lo trata como app de terceros). Usa `systemPromptMode: "preset"` (default) o el **agente `claude-code`** → consume de tu suscripción. Suele pasar con `append`/`replace`, o al usar un agente con system agresivo de otro plugin (p. ej. oh-my-opencode). Ver [System prompt y facturación](#system-prompt-y-facturación-suscripción-vs-extra-usage). |
| `Authentication required` | El `CLAUDE_CONFIG_DIR` aislado no tiene credenciales. El provider enlaza `~/.claude/.credentials.json` automáticamente; asegúrate de que `claude` esté autenticado. |
| El agente dice que no tiene `read` / no usa las tools | El runtime del MCP server debe ejecutarse con `node` (en el `PATH`). El provider ya usa `node` por defecto; overridea con `ACP_RUNTIME_NODE` si hace falta. |
| Cuelgues > 60 s al aprobar permisos | Sube `streamCloseTimeoutMs` (por defecto ya 600000). |
| Gasto de tokens desbocado / `cacheR` a 0 | Con `ACP_DEBUG=1` busca líneas `dropping session … —` en cada turno: si aparecen, algo está invalidando la identidad de sesión (mira el motivo que indica). Ver [Continuidad de sesión](#continuidad-de-sesión-y-coste-de-tokens). |
| El contexto crece sin que OpenCode compacte | Los modelos `[1m]` declaran 1M de ventana a propósito, y OpenCode no compacta hasta acercarse a ese umbral. Usa la variante normal si quieres compactación temprana. |
| No se ve el bloque de razonamiento | Comprueba que `thinking` no esté en `display:"omitted"`/`disabled` y que no aparezca `aviso: no se pudo aplicar effort=…` en stderr. |
| El agente no pregunta, asume | Debe usar `mcp__opencode__question`. Esa tool solo la registra OpenCode en TUI (`client: "cli"`) o con `enableQuestionTool`. |
| El agente no busca en la web | OpenCode solo registra su `websearch` con `providerId: "opencode"` o con exa/parallel activos. El perfil por defecto ya incluye la `WebSearch` **nativa** para cubrirlo. |
| Lento con muchas tools | Con cientos de tools el agente tarda ~1 min por paso. Reduce las tools expuestas con el `permission` del agente en tu `opencode.json`. |

Comando de mantenimiento:

```bash
# Refresca los cachés de descubrimiento + models.dev y previsualiza los modelos
npx opencode-claude-code-acpbridge sync claude-agent-acp
```

---

## Estado y limitaciones

- ✅ Chat con streaming y **bloque de razonamiento** visible en OpenCode (`Thought: …`, vía `thinking` summarized por defecto).
- ✅ **Capacidades nativas + puente de permisos**: el agente `claude-code` usa skills, subagentes (`Task`), búsqueda de recursos MCP y `NotebookEdit` nativos, con memoria de proyecto (`CLAUDE.md`); cada acción nativa pide permiso vía el **`ask` de OpenCode** (meta-tool `claude_permission`). Las tools comunes las orquesta OpenCode (`allowedTools: ["mcp__opencode"]`, sin doble permiso). Todo en **suscripción** (verificado). Ver [Manejo de las herramientas y puente de permisos](#manejo-de-las-herramientas-y-puente-de-permisos).
- ✅ **Cerebro limpio** disponible (modo clásico): sin tools nativas ni connectors de claude.ai (`strictMcpConfig`); el agente solo usa las tools de OpenCode (`mode: "bypassPermissions"`).
- ✅ Auto-registro: el plugin descubre los modelos del agente e inyecta el provider con metadata de models.dev (config mínima); refrescable con `npx opencode-claude-code-acpbridge sync`.
- ✅ Sesión persistente por conversación (prompt cache) y **reanudación entre procesos** (`sessions.json` + `resumeSession` → no reenvía el historial al reabrir una sesión).
- ✅ **Agentes inyectados** (`claude-code`, `claude-code-plan`) con modo/esfuerzo por agente aplicados en caliente; **tu `opencode.json` tiene precedencia** (merge).
- ✅ **Consume de tu suscripción** con `systemPromptMode: "preset"` (por defecto): verificado **0 extra usage**. Con `append`/`replace` Anthropic lo factura como *extra usage* — ver [System prompt y facturación](#system-prompt-y-facturación-suscripción-vs-extra-usage).
- ✅ **Consumo de tokens**: el provider mapea `PromptResponse.usage` del ACP → OpenCode muestra el consumo por turno. (`usage` es experimental en el ACP; el desglose en turnos delta puede variar.)
- ℹ️ **Modelos** (cuenta Max, jun-2026): `default` (Opus 4.7), `sonnet` (4-6), `sonnet[1m]`, `haiku` (4-5) responden; `opus` también (aunque no se liste). `fable`/`mythos` no disponibles.
- ⚠️ **Una conversación a la vez** por instancia del modelo (la concurrencia entre sesiones simultáneas no está soportada aún).
- 🔜 Roadmap: modelo por-llamada, emitir el `plan` a OpenCode.

---

## Desarrollo

Arquitectura interna, flujos (tools diferidas, sesiones/resume, billing) y cómo extender: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. Ejemplos de `opencode.json` por caso de uso: **[examples/](examples/)**.

```
src/
  index.ts              # re-exports: createACPModelProvider (provider) + default { id, server } (plugin)
  provider/
    factory.ts          # createACPModelProvider (orquestador) + createACPProviderFromEnv (upstream sin orquestación)
    model.ts            # ACPOrchestratorModel (LanguageModelV3): turnos, sesión persistente/resume, providerOptions, usage
    env.ts              # config por variables de entorno
  acp/
    mcp-host.ts         # MCP server sintético (TCP): expone las tools de OpenCode y DIFIERE cada tools/call
    mcp-runtime.ts      # runtime stdio que el agente spawnea (MCP a mano, sin deps) → TCP al host
    claude-config.ts    # "cerebro limpio" + CLAUDE_CONFIG_DIR aislado con credenciales; modo/effort/systemPrompt
  plugin/
    index.ts            # hooks config (auto-registro provider + agentes) y chat.params (sessionID); deepMerge
    discover.ts         # conexión ACP efímera → modelos/modos/capabilities
    catalog.ts          # metadata de models.dev + variants de effort
    cache.ts · sessions.ts   # cachés TTL / registro de sesiones OpenCode↔ACP
  bin/cli.ts            # `opencode-claude-code-acpbridge sync`
```

Build: `npm run build` (genera `dist/`). El paquete exporta también `createACPProviderFromEnv` (provider upstream `@mcpc-tech/acp-ai-provider`, sin orquestación de tools) por si quieres el modo chat simple.

## Licencia

MIT
