[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Construye el equipo más fuerte con la IA a tu lado.**

**Las personas no son las únicas que pueden encargar trabajo.**

Guilduo es una **Human × AI Work Platform** donde las personas y los Agentes de IA pueden encargar, asumir, transferir y revisar trabajo en el mismo workspace. Trata el trabajo real como Quests y lo impulsa mediante Relays, Evidence y Decisions compartidos.

## Enlaces públicos

### Para nuevos usuarios

- Conoce Guilduo: [Sitio oficial](https://guilduo.com/)
- Trabaja en Guilduo: [Guilduo / Relay Forge](https://app.guilduo.com/)
- Conecta un cliente de IA: `https://mcp.guilduo.com/mcp`

| Punto de entrada | Enlace | Uso |
|---|---|---|
| LP oficial | [Guilduo Landing Page](https://guilduo.com/) | Conocer los principios, las funciones y el flujo de trabajo de Guilduo |
| Web App oficial | [Guilduo / Relay Forge](https://app.guilduo.com/) | Abrir el espacio público de Command y Quest en beta |

`/next/relay-forge/` es una ruta de despliegue dentro de un Appwrite Site, no la URL oficial de la Web App. Las URL de deployment generadas por Appwrite Sites y la antigua URL `workers.dev` se conservan para validación, compatibilidad y rollback. La ruta canónica para nuevos usuarios es el dominio de Guilduo anterior. La candidata actualmente desplegada es `0.6.0-beta.8` y se gestiona por separado de las releases etiquetadas.

### Función de cada URL pública

| Función | URL canónica | Estado |
|---|---|---|
| Sitio oficial / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Endpoint Remote HTTP MCP canónico |
| API de Appwrite | `https://api.guilduo.com/v1` | Endpoint oficial de la API de Appwrite (origin: `https://api.guilduo.com`) |
| Documentación (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | Docs estáticos; publicados |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` está reservado para redirigir a `https://guilduo.com`. La antigua URL `workers.dev` permanece para conexiones compatibles y rollback. `api.guilduo.com` es para la API de Appwrite y la utilizan el cliente de Appwrite del navegador y el `APPWRITE_ENDPOINT` del Worker; no es el origin público de las rutas REST `/v1` o MCP `/mcp` del Worker.

Consulta [BRAND.md](BRAND.md) para conocer el lenguaje y las expresiones de marca aprobados.

Guilduo es un proyecto independiente y no está afiliado, respaldado ni pretende ser una alternativa a Habitica. Los nombres de productos y las marcas comerciales pertenecen a sus respectivos propietarios.

## Alcance de la beta pública

| Área | Estado |
|---|---|
| Web / PWA | Núcleo de la beta pública |
| Inicio de sesión de Google con Appwrite y almacenamiento de invitados en el dispositivo | Disponible (autenticación configurada) |
| CRUD de Quest, archivado, Quest Tree y batalla de MP | Disponible |
| Agent Registry, vinculación de clientes MCP y Handoff | Disponible |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Beta pública de la Web App oficial (Desktop / Mobile). `/next/relay-forge/` interno es una ruta de despliegue y compatibilidad |
| 9 idiomas | Disponibles en la UI principal; la UI beta cubre la navegación principal |
| Google Calendar, Google Tasks, Notion y Toggl | **Early Access / preparación de OAuth** |
| Unity Battle Lab, Android/iOS nativo y ejecución autónoma de Agentes | Pendiente |

La versión de la app es la candidata `0.6.0-beta.8`, REST/MCP es `2.7.0` y el Schema de datos es `7`. OAuth de proveedores externos está desactivado por defecto mientras se priorizan la seguridad de la beta pública y la preparación para la revisión. Las cuentas y el estado de usuario se están migrando a Appwrite.

## Principios de diseño

1. **Las personas poseen el objetivo y la decisión final**: las sugerencias de la IA se pueden revisar y nunca se completan ni publican sin aprobación.
2. **Separa el trabajo de las recompensas**: gana MP con Quests y elige cuándo luchar y qué comando usar.
3. **Leer, previsualizar, ejecutar**: usa dry-run como opción predeterminada para escrituras, actualizaciones masivas y Handoffs.
4. **Archivar antes que borrar**: conserva el historial, las recompensas y los enlaces externos; archiva las Quests que ya no necesites.
5. **Pon a las personas y a la IA en el mismo equipo**: Astra es un personaje compañero, los Agents representan roles y los usuarios siguen separados como cuentas.
6. **No encierres los datos**: REST, MCP, CLI y Web UI utilizan el mismo Worker y la misma lógica de dominio.

## Pantallas y datos

- `/`: La UI actual. Antes de iniciar sesión, los datos se guardan en el dispositivo; después de iniciar sesión, se sincronizan con Appwrite a través del Worker.
- `/lp/` y `/lp/en/`: La Landing Page oficial de Guilduo en japonés e inglés. Las URL de CTA proceden de Runtime Config y se desactivan de forma segura cuando no están configuradas.
- `/interaction-lab/`: La ruta fuente de Next para desarrollo local y capturas.
- `/next/` y `/next/relay-forge/`: Rutas de implementación y compatibilidad en Appwrite Sites. La entrada oficial para nuevos usuarios es `https://app.guilduo.com/`, que reenvía internamente a la entrada de Relay Forge mediante un rewrite basado en host. En escritorio solo se desplaza la lista central Today/Tree; en móvil se desplaza toda la página.
- `https://guilduo.com/` dirige a `/lp/` en el mismo Appwrite Site, mientras que `https://app.guilduo.com/` dirige a `/next/relay-forge/`. Consulta [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md) para la configuración real de DNS y rewrite.
- La fuente de verdad visual es [`DESIGN.md`](DESIGN.md), la fuente de verdad técnica es [`PROJECT_SPEC.md`](PROJECT_SPEC.md) y el diseño de diferencias específico de Next es [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). Consulta [`design/TOKENS.json`](design/TOKENS.json) para los tokens numéricos, [`design/COMPONENTS.md`](design/COMPONENTS.md) para los componentes y [`design/SCREENS.md`](design/SCREENS.md) para la composición de pantallas.
- Al reconectar, se restaura el estado de Appwrite Auth y los datos sincronizados anteriormente permanecen disponibles en modo de solo lectura cuando existen. Las listas de Quest no se borran durante la reconexión; la UI muestra un skeleton, un botón de reconexión y un bloqueo de escritura.
- El estado de finalización de Quest y el estado de Agent Handoff se gestionan por separado. Los To Dos puntuales se archivan al completarse; los diarios, hábitos y To Dos recurrentes vuelven en su siguiente aparición.
- Los perfiles públicos solo muestran el nombre visible, `@handle`, bio, avatar y nivel. El contenido de las Quests, las notas, el UID y la información de OAuth permanecen privados.

## Arquitectura de Appwrite / Worker

| Capa | Responsabilidad |
|---|---|
| Appwrite Sites | Distribución de Web/PWA |
| Appwrite Auth / TablesDB | Inicio de sesión de Google y estado de Quest y personaje por usuario |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks y frontera de extensiones |
| Cloudflare D1 | Agent Registry, conexiones MCP, perfiles y metadatos de integraciones |
| Cloudflare KV | Estado de OAuth, estado de corta duración y clientes MCP |

Los tokens, las API keys y los secretos nunca se guardan en filas públicas de Appwrite ni en el Local Storage del navegador. Las API Keys de Appwrite viven únicamente en Worker Secrets. Agent Registry tampoco almacena API keys de modelos, contraseñas ni URL de ejecución.

## MCP

El endpoint de conexión estable es:

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` expone 54 tools para Quests, archivado, Quest Tree, Agent Handoff, Agent Registry, perfiles, grupos, batalla y el contrato de Toggl Focus. `/mcp-next` es una vía de validación para el nuevo SDK y añade Resources y Workflow Prompts. Sigue usando `/mcp` normalmente para mantener la compatibilidad con los clientes existentes.

Durante la migración, el antiguo `/mcp` de `workers.dev` permanece disponible para compatibilidad, pero las nuevas altas y reconexiones deben usar `mcp.guilduo.com/mcp`.

### Registra una nueva conexión MCP con OAuth

Este procedimiento es para clientes como ChatGPT, Codex, Claude y OpenClaw que admiten Remote HTTP MCP y OAuth. Para una primera conexión, sigue los pasos 1–6 en orden. Si solo necesitas verificar una conexión existente, empieza en el paso 7.

1. Si el cliente todavía conserva una conexión de Guilduo / QuestForge anterior a la migración, desconéctala o elimínala primero. Los OAuth Grants y Tokens antiguos no se pueden reutilizar.
2. Abre la configuración MCP o Connector del cliente y registra una conexión llamada `Guilduo` con tipo Remote HTTP MCP.
3. Establece la URL estable `https://mcp.guilduo.com/mcp`. No uses `/mcp-next` para las pruebas de conexión normales.
4. Cuando el cliente ofrezca una opción de autenticación, selecciona `OAuth`. No introduzcas una API Key, Bearer Token ni Client Secret.
5. Cuando el navegador muestre “Connect to Guilduo”, inicia sesión con la misma cuenta de Appwrite que usas en la versión Web de Guilduo, revisa los permisos solicitados y apruébalos.
6. Vuelve al cliente MCP y confirma que informa de la conexión como conectada o disponible. En este punto OAuth está completo, pero es posible que todavía no haya un Agent vinculado.
7. Abre Connections en [Guilduo / Relay Forge](https://app.guilduo.com/) y vincula el Client conectado al Agent deseado. Si no existe ningún Agent, créalo primero desde Party > “Register Agent”.
8. Reinicia o recarga el cliente MCP y ejecuta la prueba de conexión que aparece a continuación.

Para clientes que añaden Remote MCP mediante un archivo de configuración, usa este ejemplo:

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

Los clientes MCP descubren automáticamente los metadatos de OAuth. Usa las siguientes URL solo cuando sea necesaria una verificación manual.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Verifica el Agent Context en la prueba de conexión

Comprueba la siguiente secuencia desde el cliente:

1. La inicialización de MCP tiene éxito.
2. `tools/list` devuelve 54 tools.
3. `list_registered_agents` devuelve únicamente tu propio Agent.
4. Llama a `get_current_agent_context`.

Antes de vincular un Agent, la respuesta normal es `linked: false` con `agent: null`. Después de vincularlo en Connections, pasa a ser `linked: true` y devuelve `agent` y `effectiveScopes`. Esto confirma que la autenticación OAuth, la separación de UID y el vínculo del Agent funcionan en la misma conexión.

Ejemplo de solicitud de prueba:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### Soluciona errores 401 y Agents sin vincular

| Estado | Respuesta |
|---|---|
| 401 inmediatamente después de conectar | Queda información OAuth antigua. Elimina la conexión, registra de nuevo la misma URL `/mcp` y vuelve a autorizarla. |
| No puedes volver desde la pantalla OAuth | Confirma que has iniciado sesión con la misma cuenta de Appwrite que en la versión Web de Guilduo. Comprueba también las extensiones que puedan bloquear el callback de vuelta al cliente. |
| `linked: false` | OAuth tuvo éxito. Vincula el Client a un Agent en Relay Forge Connections. |
| Error de permisos `agents:read` | Vuelve a autorizar la conexión y confirma el permiso de lectura de Agents en la pantalla de consentimiento. La configuración del Agent no puede añadir permisos OAuth. |
| El vínculo del Agent no aparece | Recarga el cliente MCP y ejecuta de nuevo `get_current_agent_context`. |

No pegues Tokens, API Keys ni UIDs completos en la configuración de conexión o en los logs. Después de la autorización OAuth, los Tokens son gestionados por el cliente MCP y Cloudflare KV.

### Clientes de IA

- ChatGPT / Codex: registra la URL de producción `/mcp` anterior en Remote MCP App o en el modo de desarrollador.
- Claude: añade OAuth Remote MCP desde Settings > Connectors.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: usa el mismo Remote HTTP MCP en la próxima receta de conexión.

Después del registro, crea o edita Agents en **Party** de Relay Forge y vincula los clientes MCP autorizados a un Agent en **Connections**. Un Agent no puede aumentar los permisos de un cliente MCP.

## CLI

La CLI tiene un papel separado de MCP. MCP sirve para descubrir y aprobar herramientas de IA; la CLI sirve para operaciones REST/JSON de personas y CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

Las escrituras solo devuelven un dry-run o un plan de ejecución si no se proporciona `--execute`. La autenticación usa `QUESTFORGE_TOKEN` o `--token-stdin`, y los tokens nunca se escriben en logs. Los usuarios generales de producción utilizan OAuth en lugar de una API key fija.

## Skill / OpenAI Plugin / MCP App

- Skill oficial: [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- Paquete de preparación del OpenAI Plugin: [`plugins/questforge/`](plugins/questforge/)
- Plantilla de registro de MCP App: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Lista de comprobación de envío: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

El Skill enseña a la IA la secuencia de leer, hacer dry-run, confirmar, ejecutar y devolver una revisión. La revisión oficial de OpenAI no se completa automáticamente. Después de verificar la aceptación con cuentas reales, la privacidad y las rutas de eliminación de cuentas en la beta pública, un operador envía la solicitud desde el Dashboard.

## 9 idiomas

Guilduo admite japonés, inglés, español, portugués brasileño, francés, alemán, coreano, chino simplificado y ruso. La configuración de idioma se guarda por dispositivo y no se incluye en la sincronización en la nube. Las fechas, los números y el orden de clasificación usan la API Intl.

## Hoja de ruta de servicios externos

La prioridad actual es establecer contratos y una presentación segura; Provider OAuth permanece en pausa como Early Access.

1. Google Calendar: franjas de disponibilidad de solo lectura
2. Google Tasks: sincronización bidireccional sin eliminación
3. Toggl Track: registro de tiempo, estimaciones y conversión a MP
4. Notion: exportación de registros diarios
5. Todoist, Discord / Slack: sincronización y notificaciones
6. OpenClaw, Hermes Agent: recetas de conexión y reutilización de Skills

La sincronización inicial requiere una previsualización y Guilduo nunca elimina automáticamente datos externos. Los Provider Secrets viven únicamente en Worker Secrets.

## Rendimiento y telemetría

Los objetivos usan un dispositivo de clase Pixel 9: LCP de 2,5 segundos o menos, INP de 200 ms o menos, CLS de 0,1 o menos y JavaScript comprimido inicial de 250 KB o menos. La telemetría anónima solo se aplica a usuarios que dan su consentimiento explícito; no se envían contenido de Quest, notas, correo electrónico, UID, tokens ni contenido externo. Los eventos permitidos implementados son Web Vitals, errores de JavaScript, resultados de sincronización, primera finalización de Quest, conexión MCP y asignación de Agent. No se envía nada después de rechazar o retirar la telemetría. Antes del lanzamiento público, un administrador debe configurar `TELEMETRY_ENDPOINT` y la migración D1 0006.

## Desarrollo local

Los requisitos son Node.js 22+ y Wrangler. Administra los recursos de Appwrite mediante Appwrite Console o MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Usa `Copy-Item` en PowerShell. Los comandos principales son:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

Durante el desarrollo de TypeScript, los tipos del runtime del Worker se generan desde la configuración de Wrangler. `npm run typecheck` combina la generación de tipos, las comprobaciones de consistencia de la salida generada, las comprobaciones de `any` explícito y `@ts-nocheck`, y las comprobaciones estrictas para browser, Worker, Node y el prototipo de batalla. La transformación de Vite y la comprobación de tipos están separadas, mientras que los contratos API/MCP se mantienen con tests dedicados.

El workflow de etiquetas `v*` coteja la versión del paquete, que el commit etiquetado sea un ancestro de `main` y las notas de la release, y publica una Release del código fuente en GitHub tras superar los controles de CI, tipos, tests, build y preview. No utiliza secretos de despliegue ni ejecuta automáticamente migraciones de producción o despliegues de Sites o Workers. El despliegue de producción se realiza por separado mediante los workflows manuales existentes `.github/workflows/deploy-appwrite-site.yml` y `.github/workflows/deploy-appwrite-worker.yml`, manteniendo la protección del entorno `production` y los controles de cachés conservadas. El runtime del Worker en producción conserva correcciones desplegadas directamente que aún no se han integrado en el código fuente público; no ejecutes primero el workflow genérico de despliegue del Worker. La Release del código fuente del producto principal `v0.6.0-beta.8` y las extensiones de host `beta.12` tienen versiones independientes; Guilduo sigue en beta pública. Consulta [`RELEASE_SETUP.md`](RELEASE_SETUP.md).

## Documentación

- [Fuente de verdad del diseño visual](DESIGN.md)
- [Especificación técnica](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Especificación de componentes](design/COMPONENTS.md)
- [Planos de pantallas](design/SCREENS.md)
- [Manifiesto de assets](design/ASSET_MANIFEST.md)
- [Referencias doradas](design/reference/README.md)
- [Hoja de ruta de la beta pública](ROADMAP.md)
- [Guía de URL públicas](docs/public-urls.md)
- [Configuración de API / MCP / OAuth](API_MCP_SETUP.md)
- [Configuración de releases etiquetadas](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Privacidad](PRIVACY.md)
- [Términos](TERMS.md)
- [Seguridad](SECURITY.md)
- [Contribuir](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [Licencia](LICENSE)

## Licencia

Guilduo se distribuye bajo GNU AGPL-3.0-only. Si proporcionas una versión modificada a través de una red, cumple los requisitos de disponibilidad del código fuente de esa licencia.
