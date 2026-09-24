# OpenCode Design System

Plugin de **OpenCode v2** para crear, importar, mantener y aplicar Design Systems colaborativos, neutrales respecto al framework y legibles por agentes de IA.

El Design System persistente es la memoria visual del proyecto: **Markdown + JSON**, con manifest indexado, preferencias explícitas, historial de decisiones y especificaciones de componentes/patrones. La preview es salida generada, no una fuente paralela.

## Instalar

### Desde GitHub

Con OpenCode v2, instala directamente desde el repositorio público:

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

Para fijar la versión inicial cuando esté publicada, usa `opencode plugin add github:BraveOtter/opencode-design-system#v0.1.0`.

### Paquete publicado

Añade el paquete a `plugins` en `opencode.json` o `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode cargará el plugin al iniciar el proyecto. Los commands y tools se registran mediante la API de plugin v2. El paquete apunta a `@opencode/plugin` y `Plugin.define`; no utiliza la API de plugins v1.

### Desarrollo local o fork

Requiere Node.js **22.19 o posterior** para el desarrollo local y el renderer portable.

```sh
npm install
npm run build
```

Este checkout incluye `plugins/local/index.js` como entrypoint opcional para probar el build local; no se activa por defecto, para evitar cargar una copia local junto al paquete npm global. No forma parte del paquete publicado.

Apunta OpenCode al directorio del paquete:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./tools/opencode-design-system"]
}
```

También se puede referenciar una ruta absoluta o un directorio local siguiendo las formas de `plugins` documentadas por OpenCode.

## Commands

| Command | Función |
| --- | --- |
| `/design-system [idea]` | Conversar para crear un sistema desde cero o analizar la interfaz existente antes de proponer su formalización. |
| `/design-system/update [cambio]` | Interpretar un cambio, encontrar tokens y documentos dependientes, actualizar versiones/decisiones y regenerar preview. |
| `/design-system/preview` | Regenerar la preview interactiva a partir de las fuentes estructuradas. |
| `/design-system/check` | Inspección heurística y de solo lectura de estilos frente a los tokens. |
| `/design-screen [pantalla]` | Diseñar y guardar una especificación de pantalla sin implementar código UI. |

Ejemplos:

```text
/design-system Quiero una interfaz sobria, compacta, sin degradados y con verdes apagados.
/design-system/update Los botones y las cards se ven demasiado redondeados.
/design-screen Administración de usuarios con búsqueda, filtros e invitaciones.
```

También se puede pedir una pantalla en lenguaje natural, sin command. El plugin añade una instrucción breve al contexto del agente si existe `design-system/manifest.json`; el `AGENTS.md` generado conserva esta convención aunque el plugin no esté instalado.

### Conversación e identidad visual

El agente pregunta solamente por decisiones de identidad que falten: producto/audiencia, referencias, tono, preferencias de color/superficie, densidad, tipografía, plataformas, motion y accesibilidad cuando sean relevantes. Puede explicar alternativas con lenguaje sencillo. No convierte el proceso en un formulario ni toma decisiones importantes en nombre del usuario.

Las preferencias explícitas se guardan en `preferences.json`, `DECISIONS.md` y `AI-GUIDELINES.md`. El modelo puede explicar consecuencias y accesibilidad, pero no cambiar una preferencia sin consultarlo. Analizar una app existente es de solo lectura y no concede permiso para rediseñar o modificar código de aplicación.

## Arquitectura del plugin

Implementación V2 basada en las APIs oficiales actuales:

- `Plugin.define({ id, setup })` para el entrypoint del paquete.
- `ctx.command.transform` para commands.
- `ctx.tool.transform` para herramientas de creación, lectura progresiva, análisis, actualización, preview, comprobación y especificaciones de pantalla.
- `ctx.skill.transform` para anunciar la Skill de uso del sistema.
- `ctx.session.hook("context", ...)` para indicar a los agentes que usen la Skill cuando ya exista un manifest, sin inyectar todos los archivos.
- Markdown estándar bajo `.opencode/agents`, `.opencode/commands` y `.opencode/skills` para hacer que los artefactos sobrevivan a la desinstalación.

No se ejecutan migraciones de componentes de la aplicación. El análisis del proyecto está acotado y solo lee archivos candidatos de UI/estilos, configuraciones conocidas y dependencias declaradas.

### Agentes

Al crear el sistema se generan agentes V2 estándar:

- `design-system-designer`: diseñador UI/UX, arquitecto, especialista en accesibilidad e interlocutor para decisiones de identidad.
- `screen-designer`: genera especificaciones de pantalla y mantiene separado el diseño de su implementación.

Los agentes son subagentes Markdown descubiertos por OpenCode, no dependen de un formato privado del plugin. Los commands incluyen las instrucciones de trabajo necesarias desde la primera sesión, antes de que esos archivos existan.

### Skill

La Skill `design-system` dirige a cualquier agente a:

1. Comprobar el manifest.
2. Leer las reglas y preferencias.
3. Cargar solo los tokens, componentes y patterns ligados a la tarea.
4. Respetar decisiones explícitas y documentar cambios reutilizables.
5. Tratar una especificación de pantalla como un artefacto distinto del código.

No carga permanentemente todas las tablas, componentes y patrones en el contexto. El `manifest.json` sirve como índice para recuperación progresiva.

## Formato generado

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
│   ├── manifest.schema.json
│   └── tokens.schema.json
├── components/
│   ├── button.md
│   └── ...
├── patterns/
│   ├── form.md
│   └── ...
├── screens/
│   └── user-management.md
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md                         # Bloque administrado, conserva el contenido previo
.opencode/
├── agents/
│   ├── design-system-designer.md
│   └── screen-designer.md
├── commands/
│   ├── design-system.md
│   ├── design-system/update.md
│   ├── design-system/preview.md
│   ├── design-system/check.md
│   └── design-screen.md
└── skills/
    └── design-system/SKILL.md
```

`manifest.json` incluye versiones, estado, temas, archivos y referencias de tokens por componente/pattern. Los estados son `draft`, `review` y `stable`. El schema base usa `schemaVersion: "1.0.0"`; la versión del sistema comienza en `0.1.0`.

Los tokens son framework-neutrales y semánticos, por tema:

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

El vocabulario puede ampliarse con tipografía, jerarquías, grids, layout, bordes, elevación, iconografía, motion, breakpoints, foco, estados y otros temas. Se recomiendan rutas semánticas como `color.text.secondary`; cualquier consumidor puede generar CSS variables, temas de framework u otros adaptadores sin que estos definan el sistema.

### Componentes y patterns

Cada archivo de componente documenta propósito, variantes, tamaños, tokens, estados, comportamiento, accesibilidad, responsive, cuándo usarlo/evitarlo y relaciones. Se crean los componentes útiles para el producto y se pueden ampliar más adelante; no se obliga a generar un catálogo innecesario.

Los patterns describen composiciones como formularios, navegación, búsquedas, filtros, acciones destructivas, tablas, errores, estados vacíos y onboarding. Sus referencias a componentes y tokens permiten mostrar dependencias al actualizar el sistema.

## Crear desde una aplicación existente

El agente usa la herramienta `design_system_analyze`, que:

- Busca CSS/SCSS/LESS, vistas y componentes habituales, y reconoce frameworks/librerías desde `package.json`.
- Resume variables CSS, colores, radios, valores de spacing y candidatos de componentes.
- Marca radios cercanos o muchas decisiones visuales como posibles inconsistencias, no como errores confirmados.
- Limita directorios, número y tamaño de archivos; omite dependencias, builds y artefactos generados.
- No escribe en los archivos analizados.

El agente explica las evidencias, incertidumbres y variaciones detectadas. Pregunta antes de normalizar decisiones ambiguas; conserva por defecto la identidad reconocible y distingue formalizar/normalizar de rediseñar. Solo después de la conversación crea `design-system/`.

## Modificar, dependencias y versiones

`/design-system/update` lee el manifest, tokens y documentos relacionados antes de escoger un cambio. Las actualizaciones de token solo aceptan rutas existentes; por defecto una ruta semántica se actualiza coherentemente en todos los temas. Se puede limitar a un tema con una ruta como `themes.dark.color.accent.primary`.

El plugin resuelve dependencias a partir de la lista de tokens declarada en cada componente/pattern. Registra el razonamiento en `DECISIONS.md`, actualiza `preferences.json`/`FOUNDATIONS.md` si corresponde, actualiza reglas, manifest, README y changelog, y regenera la preview. Clasificación inicial:

- **PATCH** (`patch`): corrección o documentación sin cambio compatible de contrato.
- **MINOR** (`minor`): nuevo comportamiento/token compatible.
- **MAJOR** (`major`): cambio con posibilidad de alterar interfaces existentes.

La expansión puede incorporar nuevos tokens (un valor por tema), componentes y patterns mediante la misma operación, sin reemplazar archivos existentes. Añadir un token/componente/pattern escala a `MINOR` como mínimo. El agente elige el impacto y comunica los consumidores afectados. Los cambios dejan el sistema en `draft` de forma predeterminada, hasta que el usuario lo revise.

## Preview interactiva

`preview/index.html` se genera desde tokens y especificaciones. Incluye navegación responsive, swatches y referencias de tokens, ejemplos de componentes, temas disponibles, tabs, switch, modal, toast, estados de inputs y tabla. La implementación respeta `prefers-reduced-motion` y ofrece foco visible.

La preview embebida se regenera con `/design-system/preview`. Para trabajar **sin el plugin**, el archivo incluido puede ejecutarse desde la raíz del proyecto:

```sh
node design-system/tools/generate-preview.mjs
```

Este renderer no tiene dependencias externas; lee el manifest, los tokens y documentos actuales.

## Diseñar e implementar pantallas

`/design-screen` crea únicamente `design-system/screens/<nombre>.md`. La especificación incluye propósito, layout, jerarquía, componentes/tokens, contenido/datos, estados/interacciones, responsive y accesibilidad. Otro agente de programación puede implementar ese brief después.

Cuando un agente de código recibe una solicitud UI ordinaria, `AGENTS.md` y la Skill del proyecto le indican cómo detectar el sistema y cargar solo lo relevante. Este mecanismo también funciona sin el plugin: los tokens y documentación no dependen de React, Vue, Tailwind u OpenCode.

## Comprobación

`/design-system/check` realiza una exploración de solo lectura, compara literales de color, radios y algunas alturas de controles con los valores encontrados en tokens y presenta candidatos con ruta de archivo. Es heurística: informa la evidencia en lugar de cambiar estilos automáticamente. La arquitectura puede ampliarse con adaptadores y reglas específicas de cada framework sin cambiar el formato base.

## Desarrollo

```sh
npm install
npm run typecheck
npm test
npm run build
```

Los tests ejercitan un flujo integrado en un proyecto temporal: análisis de UI existente, creación y preservación de archivos, instrucción `AGENTS.md`, creación de especificación, propagación de token entre temas, dependencias, preview, checks y protección de rutas.

## Documentación oficial de OpenCode v2

- [Plugins](https://opencode.ai/v2/docs/build/plugins)
- [Commands](https://opencode.ai/v2/docs/commands)
- [Agents](https://opencode.ai/v2/docs/agents)
- [Skills](https://opencode.ai/v2/docs/skills)
- [AGENTS.md / instructions](https://opencode.ai/v2/docs/instructions)
- [Plugin API reference](https://opencode.ai/v2/docs/api)
