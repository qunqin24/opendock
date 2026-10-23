# opencode-claude-code-acpbridge

Plugin **exclusivo para usar [Claude Code](https://www.anthropic.com/claude-code) dentro de [OpenCode](https://opencode.ai)**. Es a la vez **provider de modelos** y **plugin**, y su backend es un **cliente ACP** ([Agent Client Protocol](https://agentclientprotocol.com)) que habla con `claude-agent-acp`. Claude Code aparece como un modelo más en OpenCode, ejecutándose con **tu suscripción de Claude**, y **OpenCode queda como orquestador**: el agente solo razona y **OpenCode ejecuta las herramientas** con sus permisos y su TUI.

> Un único paquete npm que se registra a la vez como **provider** (`createACPModelProvider`) y como **plugin** (`default Plugin.define({ id, setup })`, API V2) de OpenCode.

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
| **OpenCode** | V2 (`>= 2.0.14`). **0.9.x solo para OpenCode V2 — en V1 usa 0.8.x.** API de plugins `Plugin.define`, `plugins[]` en config, hooks `provider.transform`/`agent.transform`/`session.hook("context")`. |
| **El agente ACP** | `@agentclientprotocol/claude-agent-acp` (binario `claude-agent-acp`) en el `PATH`. También sirve `claude-code-acp` / `@zed-industries/claude-agent-acp`. |
| **Claude Code CLI** | El binario `claude` instalado y **autenticado** (`claude` lee `~/.claude/.credentials.json`). El provider lo detecta con `command -v claude`. |
| **Node** | El runtime del MCP server interno se ejecuta con `node` (debe estar en el `PATH`). |

---

## Instalación

```bash
# 1. El agente ACP (una vez)
npm i -g @agentclientprotocol/claude-agent-acp
# y autentica Claude Code si no lo está:
claude   # (login interactivo)

# 2. Este provider
npm i opencode-claude-code-acpbridge
#   o, en desarrollo, apúntalo por ruta (ver nota abajo)
```

---

## Configuración en OpenCode

La config de proyecto de OpenCode V2 va en **`<proyecto>/.opencode/opencode.json`** (V2 la descubre solo, subiendo desde el directorio de trabajo; también acepta `opencode.jsonc` en la raíz del proyecto y `.claude`/`.agents`).

### Recomendado: auto-registro (config mínima)

Lista **solo el plugin** con las opciones del agente. Al iniciar, el plugin **descubre los modelos del agente** (con una conexión ACP efímera), rellena su metadata (coste, límites, modalidades) desde [models.dev](https://models.dev) e **inyecta el provider `acp` en runtime** (`provider.transform`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-claude-code-acpbridge", "options": { "command": "claude-agent-acp" } }
  ]
}
```

> **Desarrollo local**: si `package` es una **ruta a un directorio** (repo clonado), OpenCode resuelve el entrypoint como `<dir>/index.*` — por eso la raíz del repo tiene un `index.js` que re-exporta `dist/` (compila antes con `npm run build`). Un destino de fichero (`…/dist/index.js`) está **rechazado** por V2 (solo admite directorios para plugins configurados).

Con eso aparecen `acp/sonnet`, `acp/haiku`, etc. en el selector, ya poblados con contexto/coste/modalidades. **Tú mantienes el control total del agente** mediante esas mismas opciones del plugin (la tabla de abajo: `args`, `cwd`, `env`, `claudeExecutable`, `streamCloseTimeoutMs`, `claudeCode`…). El plugin solo auto-genera la **lista de modelos y su metadata**; no impone nada más.

- El descubrimiento se **cachea** (~1 h) en `~/.acp-model-provider/`; solo el primer arranque (o tras expirar) gasta los ~3-5 s de spawn del agente.
- La metadata sale del **mismo catálogo que usa OpenCode** (`~/.cache/opencode/models.json`, con `https://models.dev/api.json` como fallback). Los costes son informativos.
- Opciones extra del plugin: `providerId` (por defecto `acp`) y `name`. Si ya declaras `provider.<id>` a mano, el plugin **lo respeta y no lo toca**.
- Refresca tras un cambio de modelos con `npx opencode-claude-code-acpbridge sync` (ver [Diagnóstico](#diagnóstico)).

### Manual (avanzado / override)

Sin `command` (ni `ACP_COMMAND`) el plugin **no auto-registra** nada: queda para cuando quieras declarar el provider tú mismo con la config `provider` de V2 (el plugin no lo toca):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-claude-code-acpbridge" }],
  "provider": {
    "acp": {
      "npm": "opencode-claude-code-acpbridge",
      "name": "Claude Code (ACP)",
      "options": { "command": "claude-agent-acp" },
      "models": { "sonnet": { "id": "sonnet", "tool_call": true, "reasoning": true } }
    }
  }
}
```

En desarrollo, apunta por ruta de directorio: `"package": "/ruta/a/opencode-claude-code-acpbridge"` en `plugins` (ver nota arriba sobre `index.js`).

En V2 los permisos de tool son un **ruleset** por agente (`agents.<n>.permissions`, por eso los agentes inyectados llevan `question: allow`); p. ej. `"permissions": [{ "action": "edit", "resource": "*", "effect": "allow" }]`.

### Cambiar el `providerID` (p. ej. para opencode-quota)

Por defecto el provider se registra como **`acp`**. Si necesitas otro ID —típicamente **`anthropic`** para que [opencode-quota](https://www.npmjs.com/package/@slkiser/opencode-quota) detecte y muestre la cuota de tu **suscripción**— pásalo en las opciones del **plugin** (no declares un provider a mano, así evitas un doble backend):

```jsonc
"plugins": [
  { "package": "opencode-claude-code-acpbridge",
    "options": { "command": "claude-agent-acp", "providerId": "anthropic" } }
]
```

Así el **auto-registro, el resume, el puente de permisos y los agentes** (`claude-code` → `anthropic/default`) usan ese ID de forma **coherente y con un solo backend**.

> ⚠️ Usar `"anthropic"` **sobrescribe el provider oficial de Anthropic** de OpenCode. Es seguro **si no usas la API directa de Anthropic** (consumes de la suscripción vía ACP). A vigilar: OpenCode puede listar modelos "fantasma" de models.dev en el selector (usa solo `anthropic/default` y `anthropic/sonnet`); si algún día quieres la API directa, quita el `providerId`.

### De 0.8.x (V1) a 0.9.x (V2)

1. **Config del plugin**: `"plugin": [[pkg, {opts}]]` → `"plugins": [{ "package": pkg, "options": {…} }]`. Si declarabas `provider.acp` a mano, quítalo: el plugin lo auto-registra en runtime.
2. **Agentes**: la sección `agent:` pasa a `agents:`; `permission` (mapa) → `permissions` (ruleset: `[{ "action": "Bash", "resource": "git *", "effect": "allow" }]`); `disable` → `disabled`.
3. **Variantes**: `acp/opus:low` → `acp/opus#low` (sintaxis V2 `provider/model#variant`).
4. **Options por agente** (mode/effort/native*): de `agent.<n>.options` → `plugins[0].options.agents.<n>.options`.
5. **Quita `claude_permission`**: esa meta-tool ya no existe; el puente de permisos emite tool-calls de la tool `question` de OpenCode. Si tenías reglas `permission` para el puente, trasládalas a `agents.<n>.permissions` (el puente las evalúa fail-closed).
6. **`package` = directorio con build** en desarrollo: apunta a la ruta del repo (con `index.js` raíz que re-exporta `dist/`), no a un fichero — V2 rechaza ficheros. Compila con `npm run build`.
7. **CLI**: `opencode run` sin `-m` ignora `agent.model`; usa `opencode run -m acp/…`.
8. **Requisitos**: OpenCode `>= 2.0.14` y agente `@agentclientprotocol/claude-agent-acp`.

Detalle completo en [CHANGELOG 0.9.0](CHANGELOG.md#090--opencode-v2-2026-10-01) y plan del port en [MIGRATION_V2.md](MIGRATION_V2.md).

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
| `streamCloseTimeoutMs` | `number` | `ACP_STREAM_CLOSE_TIMEOUT_MS` | `600000` | `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` para agentes antiguos. `claude-agent-acp` ≥ 0.31 ya no lo lee: un `tools/call` diferido lo acota `MCP_TOOL_TIMEOUT` (≈ 27 h por defecto), así que esperar a que apruebes un permiso no corta nada. |
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
| `mode` | `"default"\|"plan"\|"acceptEdits"\|"bypassPermissions"\|…` | — | **Modo de sesión ACP**, aplicado en caliente con `setSessionMode`. P. ej. `"plan"` (planifica) o `"bypassPermissions"` (deja que OpenCode sea la única autoridad de permisos). Configurable por agente vía `plugins[0].options.agents.<n>.options.mode`. |
| `permissionMode` | `"default"\|"acceptEdits"\|…` | resuelto por el agente | (Heredado; el ACP lo ignora para el modo de sesión — usa `mode`.) |
| `systemPromptMode` | `"preset"\|"append"\|"replace"` | **`"preset"`** | Cómo se traslada el system prompt de OpenCode (ver "System prompt y facturación"). **`preset` (default) = consume de tu suscripción; `append`/`replace` = extra usage.** |
| `configDir` | `string \| "isolated" \| false` | **`false`** | `false` (default): hereda tu `~/.claude`, así las sesiones iniciadas en OpenCode **se retoman con `claude --resume <id>`** (ver "Retomar la sesión en Claude Code"). No reintroduce tu ecosistema: eso lo siguen mandando `settingSources`/`tools`/`strictMcpConfig`. `"isolated"`: dir limpio con tus credenciales enlazadas (sesiones invisibles para `claude --resume`). Ruta: úsala tal cual como `CLAUDE_CONFIG_DIR`. |
| `forwardEnvContext` | `boolean` | **`true`** | Reenvía la parte **factual** del system prompt de OpenCode (bloque `<env>`: directorio de trabajo, raíz del workspace, git, plataforma, fecha; y `<available_references>`) como contexto de usuario. Con `systemPromptMode: "preset"` el system nunca llega al agente, así que sin esto trabaja sin saber dónde está. Solo viajan bloques factuales — nunca las instrucciones de OpenCode — así que la sesión sigue en suscripción. Se manda completo una vez por sesión y luego solo el delta. |
| `settingSources` | `("user"\|"project"\|"local")[]` | `[]` | Settings de Claude Code a cargar (hooks/agents). |
| `tools` | `string[]` | `[]` | Herramientas **nativas** del agente a habilitar. `[]` = ninguna. |
| `disallowedTools` | `string[]` | — | Herramientas nativas a prohibir. |
| `strictMcpConfig` | `boolean` | **`true`** | Usa **solo** el host de tools de OpenCode e ignora todo lo demás: el `.claude.json` y los **connectors de tu cuenta claude.ai** (Gmail, Drive, Supabase, Notion…). `false` para dejar pasar esos connectors. |
| `allowedTools` | `string[]` | **`["mcp__opencode"]`** | Tools auto-aprobadas (sin `requestPermission`). Por defecto las de OpenCode, para **todo** agente que use este provider (también los subagentes que heredan el modelo): OpenCode ya las autoriza, así no hay doble permiso. |
| `nativeTools` | `string[]` | — | Tools **nativas** de Claude que OpenCode no cubre. Los agentes inyectados usan `["NotebookEdit", "ExitPlanMode", "WebSearch"]`: `ExitPlanMode` es lo que permite **salir** del modo plan, y `WebSearch` cubre que OpenCode no registre su `websearch` cuando `providerId` no es `"opencode"`. Se añaden a `tools`. El `Read` nativo ya **no** va: lo que lee no queda en el historial de OpenCode (se perdía al cambiar de modelo) y el `read` de OpenCode V2 ya maneja imágenes y PDF. |
| `resourceSearch` | `boolean` | — | Habilita `ListMcpResources`/`ReadMcpResource` (búsqueda de recursos MCP, superior a OpenCode). |
| `nativeSubagents` | `boolean \| Record` | — | Subagentes nativos (`Task`). `true` añade un subagente "general" que **delega la ejecución a OpenCode**; un `Record` define subagentes a medida. |
| `nativeSkills` | `boolean \| string[]` | — | Skills de Claude Code. `string[]` precarga solo esos (`settings.skills`, menor riesgo billing); `true` carga `~/.claude/skills` (`settingSources:"user"`, mayor riesgo). Añade la tool `Skill`. |
| `projectMemory` | `boolean` | — | Carga `CLAUDE.md`/`AGENTS.md` del proyecto (`settingSources:"project"`). Convive con plugins de memoria de OpenCode (hindsight). |
| `skillShell` | `boolean` | `false` | Permite que los skills ejecuten shell con la `Bash` nativa. Por defecto orquestan vía las tools de OpenCode. |
| `agents`, `hooks`, `mcpServers`, `plugins`, `systemPrompt` | — | — | Inyectar subagents/hooks/MCP/plugins propios o un system prompt avanzado. |
| `options` | `Record<string,unknown>` | — | Passthrough libre a `_meta.claudeCode.options` (cualquier campo del SDK). |
| `historyMode` | `"shadow"\|"v2"\|"legacy"` | **`"shadow"`** | Cómo se reconoce lo que el agente ya sabe del historial (ver "Continuidad"). `shadow`: decide la huella clásica y la nueva (anclas: mensajes del usuario + ids de tools) corre en paralelo registrando cada discrepancia en el log. `v2`: deciden las anclas — inmune a que OpenCode re-renderice mensajes viejos o a que otros plugins etiqueten texto — y se activan la adopción del checkpoint tras compactar y el catch-up del checkpoint de otro modelo. Env: `ACP_HISTORY_MODE`. |
| `catchupResultChars` | `number` | `8000` | Caracteres que se conservan de cada resultado de tool de **otro modelo** al ponerle al día tras un cambio de modelo. |
| `parallelTools` | `string[]` | `read, glob, grep, webfetch, websearch, skill, subagent` | Tools de OpenCode anunciadas como de solo lectura (`readOnlyHint`): Claude Code las lanza a la vez y llegan a OpenCode en **un único paso**, que las ejecuta en paralelo. |
| `toolBatchMs` | `number` | `40` | Espera de una tool paralela por sus hermanas antes de cerrar el paso. |
| `autoCompactPct` | `number` | **`75`** | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: Claude compacta su propia sesión al 75 % del contexto, antes del umbral de OpenCode, así la compactación de OpenCode (que obliga a otra sesión) casi nunca salta. `0` deja el default de Claude Code. |
| `nativeActivity` | `"text"\|"off"` | **`"text"`** | Las tools **nativas** (Task/Agent, WebSearch, Skill, NotebookEdit…) dejan una línea `⚙ …` en la respuesta, con el resultado de Task/WebSearch/Skill: así queda en el historial de OpenCode y la ve cualquier modelo que continúe la sesión. |
| `nativeActivityChars` | `number` | `2000` | Tope del resultado nativo escrito en esa línea. |
| `maxLiveSessions` | `number` | `6` | Conversaciones vivas a la vez (cada una es un proceso `claude`); las más antiguas inactivas se cierran. |
| `idleSessionTtlMs` / `childSessionTtlMs` | `number` | `900000` / `120000` | Inactividad tras la que una sesión **reanudable** se cierra (subagentes: la segunda). Volver solo cuesta arrancar el proceso: la caché de Anthropic dura ~1 h en suscripción. |
| `smartRevert` | `boolean` | **`true`** | En un revert, bifurca la sesión de Claude justo antes del mensaje revertido (`resumeSessionAt`, localizado en su transcripción) en vez de abrir otra con replay; si no puede, hace el replay de siempre. Verificado con el agente real (`scripts/verify-smart-revert.mjs`). `false` lo desactiva. |

---

## Selección de modelo y razonamiento

Con el auto-registro **no necesitas declarar modelos**: el plugin publica los que descubre del agente — **`acp/default`** (= Opus 4.7, 1M ctx), **`acp/sonnet`**, **`acp/sonnet[1m]`**, **`acp/haiku`** — y los eliges en el selector de modelos de OpenCode. Todos comparten **un solo proceso del agente**: el modelo se aplica por sesión con `session/set_model`, así que cambiar de `opus` a `sonnet` a mitad de conversación conserva la sesión (sin replay ni proceso nuevo).

También puedes fijarlo en el provider o por agente: `"options": { "claudeCode": { "model": "sonnet" } }`, o en tu config `"agents": { "claude-code": { "model": "acp/sonnet" } }`.

> ⚠️ **`opencode run` sin `-m` ignora `agent.model`** (comportamiento del CLI V2: usa el model global de config). En CLI usa `-m acp/…`; en la TUI, el selector de agentes/modelos sí aplica el modelo declarado por agente.

Valores: aliases (`sonnet`, `haiku`, `opus`, `default`), variantes (`sonnet[1m]` = contexto 1M) o IDs completos (`claude-sonnet-4-6`).

> **Importante — qué modelos están disponibles**: la lista **la define el backend de tu cuenta/suscripción**, no este provider ni un catálogo fijo. Para verla, arranca con `ACP_DEBUG=1` y busca `available models: …` en los logs (p. ej. `default, sonnet, sonnet[1m], haiku`).
>
> **Versiones**: los aliases resuelven a la versión actual del backend; para fijar una usa el ID completo o un sufijo (`sonnet[1m]`).
>
> **Modelos (jun-2026, cuenta Max)**: `sonnet` (claude-sonnet-4-6), `sonnet[1m]` (1M ctx, *extra usage*), `haiku` (claude-haiku-4-5), `opus` (claude-opus-4-7) y `default` (= **Opus 4.7**, 1M ctx, "más capaz") **responden**. `fable` salió de la suscripción el 22-jun-2026 (pasa a *usage credits*); `mythos` solo está en "Project Glasswing" → ambos dan `issue with the selected model`. El descubrimiento solo **lista** `default/sonnet/sonnet[1m]/haiku`, pero `opus` también funciona vía `ANTHROPIC_MODEL`.

El **esfuerzo (effort)** se expone como **variantes del modelo** (`acp/opus#low` … `#max`, sintaxis V2 `provider/model#variant`): elígelas en el selector de la TUI o fíjalas por agente con `variant`. También por agente vía `plugins[0].options.agents.<n>.options.effort`, o fijo en el provider:

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

- **`claude-code`** — Claude Code nativo (modelo `acp/default`), modo ACP **`default`**: cada tool nativa pasa por el puente de permisos y **OpenCode es la única autoridad** (no añade prompts propios; ejecuta las tools con tu TUI/permisos).
- **`claude-code-plan`** — modo **`plan`**: el agente **planifica** (investiga, lee, redacta el plan) sin hacer cambios destructivos. Variante de esfuerzo `high`.

Cámbialos o desactívalos desde las opciones del plugin:

```jsonc
"plugins": [{ "package": "opencode-claude-code-acpbridge",
  "options": { "command": "claude-agent-acp",
    "agents": {                       // o "agents": false para no inyectar ninguno
      "claude-code":      { "model": "default", "options": { "mode": "default" } },
      "claude-code-plan": { "model": "default", "variant": "high", "options": { "mode": "plan" } }
    }
  }
}]
```

Cada agente lleva `options` (modo ACP, esfuerzo…) que el `context` hook del plugin inyecta **por llamada** como `providerOptions.<providerID>` y se aplican **en caliente** (`setSessionMode` / `setSessionConfigOption`), sin recrear la sesión.

> **Tu `opencode.json` manda.** En V2 los agentes viven en la sección `agents` de tu config: tus campos ganan sobre los del plugin (description/model solo se rellenan si no los declaras; options hacen merge profundo). Ideal para **filtrar tools por `permissions`** (ruleset) sin tocar el plugin:
> ```jsonc
> "agents": {
>   "claude-code": {
>     "permissions": [
>       { "action": "edit", "resource": "*", "effect": "deny" },
>       { "action": "bash", "resource": "*", "effect": "ask" }
>     ]   // hereda model y options del plugin
>   }
> }
> ```
> También `"disabled": true` para apagar un agente inyectado.

- **Modos**: como OpenCode ejecuta las tools con sus permisos, los modos de permiso de Claude Code no cambian *quién* autoriza; `bypassPermissions` solo evita el round-trip de `requestPermission`. El útil con efecto propio es **`plan`**. Evita `dontAsk` (puede bloquear tools).
- **Subagentes — dos vías.** La tool **`subagent` de OpenCode** es la preferida para trabajo de verdad: la sesión hija se ve en OpenCode, **cualquier modelo** puede continuarla y su resultado queda en el historial compartido. El **`Task` nativo** de Claude Code (subagente `general` + tus `~/.claude/agents`, cargados vía `settingSources: user` de `nativeSkills`) queda para tareas rápidas o tus agentes especializados; su resultado se escribe en la respuesta (ver `nativeActivity`). Las descripciones de ambas tools guían al agente. Si un agente tuyo depende de `Bash`/`Edit` nativos, usará las tools de OpenCode.
- **Subagentes de OpenCode sobre este provider**: un hijo hereda el modelo del padre (`acp`). Reciben el perfil base (`allowedTools: ["mcp__opencode"]`) y, si su agente no tiene `question` (el `general` de OpenCode la deniega), un permiso nativo se deniega con motivo en vez de colgar. Sus sesiones se cierran a los 2 min de inactividad.
- **Cambiar a un agente con otro perfil nativo** (otras tools nativas, `allowedTools`…) **bifurca** la sesión (`session/fork`) con el perfil nuevo: mismo contexto, sin replay.
- **Aprobar el plan** (`ExitPlanMode`): el diálogo ofrece las opciones reales de Claude Code — *auto*, *aceptar ediciones*, *aprobar cada edición*, *seguir planificando* — y, si **escribes** una respuesta, el plan se rechaza y tu texto le llega como feedback para revisarlo. El modo elegido se conserva aunque luego cambies del agente plan a `claude-code`.
- **Reanudar sin reenviar historial**: el plugin guarda un registro `~/.acp-model-provider/sessions.json` (sessionID de OpenCode → sessionId de Claude Code, más los prefijos de id propios). Al reabrir una sesión, el provider hace `resumeSession` en vez de reenviar todo el historial → **ahorra tokens**. Entradas de más de 30 días se podan solas.
- **Títulos**: el plugin pone el título de la sesión a partir del primer mensaje (sin llamar al modelo). Con `systemPromptMode: "preset"` las instrucciones de título de OpenCode no llegaban a Claude, que respondía al mensaje y el título salía basura. `titleFromModel: true` (opción del plugin) restaura la llamada.

---

## Manejo de las herramientas y puente de permisos

El agente `claude-code` combina **lo mejor de ambos mundos** — *potencia nativa sin estropear nada*:

- **Tools comunes → OpenCode las orquesta.** El provider captura todas las que OpenCode expone (nativas `read`/`write`/`bash`/`edit`/`grep`/… + las de tus MCP servers) y el agente las usa vía MCP: se ejecutan en OpenCode con sus permisos, su TUI y su registro (hindsight las ve). Van en `allowedTools: ["mcp__opencode"]` para que **no pidan doble permiso**.
- **Capacidades nativas superiores de Claude Code** que OpenCode no replica, activas por defecto: **skills** (`Skill`), **subagentes** (`Task`, que delegan la ejecución a OpenCode), **búsqueda de recursos MCP** (`ListMcpResources`/`ReadMcpResource`) y tools de nicho (`NotebookEdit`). Más la **memoria del proyecto** (`CLAUDE.md`/`AGENTS.md`), que convive con hindsight. Lo que hacen queda escrito en la respuesta como `⚙ …` (`nativeActivity`), para que no se pierda si cambias de modelo.
- **Tools en paralelo**: las de solo lectura (`parallelTools`) se anuncian con `readOnlyHint`; Claude Code las lanza juntas y OpenCode las ejecuta en paralelo en un solo paso. Llamadas que llegan mientras OpenCode ejecuta el paso anterior (p. ej. subagentes nativos en paralelo) se encolan para el siguiente — nunca se pierden.
- **Plugins de poda de contexto (opencode-dcp)**: el plugin deniega `compress` a los agentes `claude-code*`. DCP reescribe la copia del historial de OpenCode (resúmenes, etiquetas en cada mensaje); la sesión de Claude Code tiene su propio contexto, así que solo provocaba divergencias y replays. Para tus otros agentes DCP sigue activo.
- **Puente de permisos.** Cuando el agente (o un subagente) quiere usar una tool **nativa**, Claude Code pide permiso vía ACP (`requestPermission`); el provider lo **camufla como un tool-call de la tool `question` nativa de OpenCode**, así **el diálogo aparece en tu TUI** (`Allow once` / `Always allow` / `Deny`) y **tu veredicto** vuelve al agente. Las reglas (`allow`/`deny`) se evalúan antes y resuelven sin diálogo — guardadas con `Always allow` en `~/.acp-model-provider/always.json`. El agente tiene toda su potencia nativa, pero **tú controlas cada acción** desde OpenCode.
  - Las reglas por agente salen de tus `agents.<n>.permissions` (el plugin las publica para el puente, ignorando `action: "*"`; cualquier cosa no cubierta → diálogo, fail-closed).
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

OpenCode reenvía el historial **completo** en cada llamada; la sesión ACP es **con estado**.
El provider mantiene una sesión de Claude Code por conversación y le manda **solo lo que no ha
visto**. El prompt cache de Claude vive con esa sesión, así que se recrea lo menos posible:

- **Tu propia respuesta no vuelve.** OpenCode guarda la respuesta del agente y la reenvía en
  el turno siguiente; el provider la reconoce (por los textos que emitió y los ids de sus
  tools) y no se la manda de vuelta.
- **Otro modelo en medio** (cambiaste a Zen/OpenRouter y vuelves): sus turnos le llegan a
  Claude marcados como `<other_model_turn>` — no como si los hubiera escrito él — con sus
  tool-calls y resultados (`catchupResultChars`). Mismo prompt cache, sin sesión nueva.
- **Al revés**: lo que Claude hace con tools nativas queda escrito en la respuesta
  (`nativeActivity`), así que el otro modelo lo ve. Si se te agota la cuota de Claude, el
  error lo dice claro y no se reintenta en bucle: cambia de modelo y sigue.
- **Escribir mientras trabaja** (*steer*) o **interrumpir y escribir otra cosa**: el mensaje
  llega (cola nativa de Claude Code o, si no hay, junto al resultado de la tool); un turno
  interrumpido se cancela en el agente antes del nuevo.
- **Cambiar de agente** (`claude-code` ↔ `claude-code-plan`) o de **set de tools**: misma
  sesión, en caliente. A un agente con **otro perfil nativo**: fork de la sesión.
- **Cambiar de modelo acp** (opus ↔ sonnet): misma sesión, `session/set_model`.
- **Compactación**: Claude compacta su propia sesión antes que OpenCode (`autoCompactPct`).
  Si OpenCode compacta igualmente, el resumen se pide a la **sesión viva** (caché caliente),
  no a una sesión nueva con todo el historial. Con `historyMode: "v2"`, además, la sesión se
  compacta en nativo y **adopta** el checkpoint de OpenCode, o se pone al día con el de otro
  modelo, sin sesión nueva.
- **Revertir** bifurca la sesión justo antes del mensaje revertido (`smartRevert`): el agente
  "olvida" lo deshecho sin replay y con el prefijo en caché. Si no hay punto de bifurcación
  (p. ej. tras reiniciar el proceso), crea sesión nueva. Un replay completo es acotado
  (~400K caracteres) y va etiquetado como historia, con tu petición actual aparte.

Cada decisión (reuso, continuación, sesión nueva, discrepancias de `historyMode: "shadow"`…)
queda en `~/.acp-model-provider/logs/acp-AAAAMMDD.log`. En una conversación normal verás
`"decision":"reuse"` en cada turno; `"drop"` solo en reverts y compactaciones.

---

## Diagnóstico

El provider escribe siempre su log en `~/.acp-model-provider/logs/acp-AAAAMMDD.log` (OpenCode no recoge el stderr de los plugins): ciclo de vida de sesiones y una línea por decisión de turno. `ACP_DEBUG=1` añade el detalle; `ACP_LOG=0` lo desactiva; `ACP_LOG_DIR` lo reubica.

Para reportar un problema de sincronía de historial: `ACP_RECORD=<dir>` vuelca cada prompt tal como lo construye OpenCode y la decisión tomada; `node scripts/sanitize-recording.mjs <grabación> <salida> <cwd>` lo anonimiza para convertirlo en fixture de test.

| Síntoma | Causa / solución |
|---|---|
| `Model not found: acp/…` | OpenCode no cargó tu config o el auto-registro falló. La config debe estar en `<proyecto>/.opencode/opencode.json`; verifica las fuentes con `opencode debug config` (debe listar tu documento con `plugins`). Con `ACP_DEBUG=1` busca `[acp-plugin] auto-registered…` en el arranque. Si el plugin es un directorio local y no hay línea `loading plugin`, falta el `index.js` raíz (compila con `npm run build`). |
| El auto-registro no añade modelos | Ejecuta `npx opencode-claude-code-acpbridge sync <command>` para ver qué descubre y forzar refresh del caché. Si el agente no halla el binario nativo de Claude, fija `claudeExecutable`. |
| `API Error: 400 … extra usage` | El **system prompt** disparó el clasificador de Anthropic (lo trata como app de terceros). Usa `systemPromptMode: "preset"` (default) o el **agente `claude-code`** → consume de tu suscripción. Suele pasar con `append`/`replace`, o al usar un agente con system agresivo de otro plugin (p. ej. oh-my-opencode). Ver [System prompt y facturación](#system-prompt-y-facturación-suscripción-vs-extra-usage). |
| `Authentication required` | El `CLAUDE_CONFIG_DIR` aislado no tiene credenciales. El provider enlaza `~/.claude/.credentials.json` automáticamente; asegúrate de que `claude` esté autenticado. |
| El agente dice que no tiene `read` / no usa las tools | El runtime del MCP server debe ejecutarse con `node` (en el `PATH`). El provider ya usa `node` por defecto; overridea con `ACP_RUNTIME_NODE` si hace falta. |
| Muchas líneas `shadow-diff` en el log | Con `historyMode: "shadow"` son las veces que la huella nueva habría evitado (o provocado) un reset. Si solo ves `legacy: diverged` → `anchors: append`, `"v2"` te ahorra esos replays. |
| Gasto de tokens desbocado / `cacheR` a 0 | Con `ACP_DEBUG=1` busca líneas `dropping session … —` en cada turno: si aparecen, algo está invalidando la identidad de sesión (mira el motivo que indica). Ver [Continuidad de sesión](#continuidad-de-sesión-y-coste-de-tokens). |
| El contexto crece sin que OpenCode compacte | Los modelos `[1m]` declaran 1M de ventana a propósito, y OpenCode no compacta hasta acercarse a ese umbral. Usa la variante normal si quieres compactación temprana. |
| No se ve el bloque de razonamiento | Comprueba que `thinking` no esté en `display:"omitted"`/`disabled` y que no aparezca `aviso: no se pudo aplicar effort=…` en stderr. |
| El agente no pregunta, asume | Debe usar `mcp__opencode__question`. Esa tool solo la registra OpenCode en TUI (`client: "cli"`) o con `enableQuestionTool`. |
| El agente no busca en la web | OpenCode solo registra su `websearch` con `providerId: "opencode"` o con exa/parallel activos. El perfil por defecto ya incluye la `WebSearch` **nativa** para cubrirlo. |
| Lento con muchas tools | Con cientos de tools el agente tarda ~1 min por paso. Reduce las tools expuestas con el ruleset `permissions` del agente en tu config. |

Comando de mantenimiento:

```bash
# Refresca los cachés de descubrimiento + models.dev y previsualiza los modelos
npx opencode-claude-code-acpbridge sync claude-agent-acp
```

---

## Estado y limitaciones

- ✅ Chat con streaming y **bloque de razonamiento** visible en OpenCode (`Thought: …`, vía `thinking` summarized por defecto).
- ✅ **Capacidades nativas + puente de permisos**: el agente `claude-code` usa skills, subagentes (`Task`), búsqueda de recursos MCP y `NotebookEdit` nativos, con memoria de proyecto (`CLAUDE.md`); cada acción nativa pide permiso vía el diálogo **`question` de OpenCode** en la TUI (reglas `allow`/`deny` resuelven sin diálogo; `Always allow` persiste en `always.json`). Las tools comunes las orquesta OpenCode (`allowedTools: ["mcp__opencode"]`, sin doble permiso). Todo en **suscripción** (verificado). Ver [Manejo de las herramientas y puente de permisos](#manejo-de-las-herramientas-y-puente-de-permisos).
- ✅ **Cerebro limpio** disponible (modo clásico): sin tools nativas ni connectors de claude.ai (`strictMcpConfig`); el agente solo usa las tools de OpenCode (`mode: "bypassPermissions"`).
- ✅ Auto-registro: el plugin descubre los modelos del agente e inyecta el provider con metadata de models.dev (config mínima); refrescable con `npx opencode-claude-code-acpbridge sync`.
- ✅ Sesión persistente por conversación (prompt cache) y **reanudación entre procesos** (`sessions.json` + `resumeSession` → no reenvía el historial al reabrir una sesión).
- ✅ **Agentes inyectados** (`claude-code`, `claude-code-plan`) con modo/esfuerzo por agente aplicados en caliente; **tu `opencode.json` tiene precedencia** (merge).
- ✅ **Consume de tu suscripción** con `systemPromptMode: "preset"` (por defecto): verificado **0 extra usage**. Con `append`/`replace` Anthropic lo factura como *extra usage* — ver [System prompt y facturación](#system-prompt-y-facturación-suscripción-vs-extra-usage).
- ✅ **Consumo de tokens**: OpenCode ve el tamaño **real** del contexto (`usage_update.used` del agente), también en los pasos con tools; el desglose de caché sale de los totales del turno. (`PromptResponse.usage` es la **suma** de todos los requests del turno: reportarla tal cual inflaba el contexto y disparaba compactaciones.)
- ✅ **Varias conversaciones a la vez** (y subagentes), aisladas, con un solo proceso del agente; sesiones inactivas cerradas solas.
- ✅ **Cambio de modelo a mitad de sesión** en ambos sentidos (acp ↔ otros providers), sin perder contexto — ver [Continuidad](#continuidad-de-sesión-y-coste-de-tokens).
- ℹ️ **Modelos** (cuenta Max, jun-2026): `default` (Opus 4.7), `sonnet` (4-6), `sonnet[1m]`, `haiku` (4-5) responden; `opus` también (aunque no se liste). `fable`/`mythos` no disponibles.
- 🔜 Roadmap: `historyMode: "v2"` por defecto tras validarlo en uso real (modo sombra).

---

## Desarrollo

Arquitectura interna, flujos (tools diferidas, sesiones/resume, billing) y cómo extender: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. Ejemplos de `opencode.json` por caso de uso: **[examples/](examples/)**.

```
index.js                # entrypoint de directorio local: re-exporta dist/ (Host.resolve busca <dir>/index.*)
src/
  index.ts              # re-exports: createACPModelProvider (provider) + default Plugin.define({ id, setup })
  provider/
    factory.ts          # createACPModelProvider (orquestador) + createACPProviderFromEnv (upstream sin orquestación)
    model.ts            # ACPOrchestratorModel (LanguageModelV3): turnos, sesión persistente/resume/fork, cola y lote de
                        #   tool-calls, steer/aborto, puente question, usage, compactación; ACPModelView (modelo por vista)
    history.ts          # huella del historial: claves legacy + anclas (historyMode), normalización
    recorder.ts         # ACP_RECORD: graba los prompts reales de OpenCode y cada decisión
    env.ts              # config por variables de entorno
  acp/
    mcp-host.ts         # MCP server sintético (TCP): expone las tools de OpenCode y DIFIERE cada tools/call
    mcp-runtime.ts      # runtime stdio que el agente spawnea (MCP a mano, sin deps) → TCP al host
    claude-config.ts    # "cerebro limpio" + CLAUDE_CONFIG_DIR aislado con credenciales; modo/effort/systemPrompt
  plugin/
    index.ts            # Plugin.define setup: provider.transform (registro acp), agent.transform (claude-code + reglas),
                        #   hooks context/compaction/generate (ocSession/ocAgent/resume*/requestKind), title (sin modelo),
                        #   event: session.revert.* → clearLink
    bridge-rules.ts     # store de reglas por agente + always.json; evaluate() fail-closed (ignora action:"*")
    discover.ts         # conexión ACP efímera → modelos/modos/capabilities
    catalog.ts          # metadata de models.dev + variants de effort + buildModelsInfo (→ Model.Info[])
    cache.ts · sessions.ts   # cachés TTL / registro de sesiones OpenCode↔ACP
  log.ts                # log a fichero (~/.acp-model-provider/logs) + stderr
  bin/cli.ts            # `opencode-claude-code-acpbridge sync`
test/                   # node --test: fake-agent.mjs (agente ACP en proceso), fixtures/v2 (prompts reales grabados)
```

Build: `npm run build` (genera `dist/`). **Tests**: `npm test` — sin dependencias nuevas (`node --test`): un agente ACP falso en proceso (`test/fake-agent.mjs`, ACP real + MCP real contra `mcp-runtime.js`) cubre cada comportamiento y cada fallo corregido, y `test/fixtures/v2/` son prompts **reales** de OpenCode V2 grabados con `ACP_RECORD`. Contra el agente real: `VERIFY_MODEL=haiku node scripts/verify-*.mjs`. El paquete exporta también `createACPProviderFromEnv` (provider upstream `@mcpc-tech/acp-ai-provider`, sin orquestación de tools) por si quieres el modo chat simple.

**Smoke test V2**: proyecto de prueba con `.opencode/opencode.json` registrando el plugin por ruta de directorio, y `opencode --standalone run --agent claude-code -m acp/default "…"` (ver [docs/DEVELOPMENT.md §5](docs/DEVELOPMENT.md)). El diálogo `question` del puente requiere TUI interactiva.

## Licencia

MIT
