<p align="center">
  <a href="https://github.com/ihxnnxs/opencode-council">
    <picture>
      <source srcset="../assets/opencode-council-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="../assets/opencode-council-light.svg" media="(prefers-color-scheme: light)">
      <img src="../assets/opencode-council-light.svg" alt="opencode council logo">
    </picture>
  </a>
</p>
<p align="center">Un consejo de decisión nativo para OpenCode: arquitectura, revisión, depuración y decisiones técnicas de alto impacto.</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.es.md">Español</a>
</p>

---

`opencode-council` pregunta en paralelo a varios asesores de OpenCode en modo solo lectura, recopila opiniones independientes y ayuda al agente actual a sintetizar una recomendación final.

## Por Qué Existe

Úsalo cuando una sola respuesta del modelo no basta: decisiones de arquitectura, revisiones riesgosas, bloqueos de depuración, cambios sensibles de seguridad y tradeoffs con coste real.

- usa el modelo actual de OpenCode por defecto
- funciona como plugin, tool y conjunto de slash commands de OpenCode
- enlaza los asesores como child sessions de la sesión actual
- funciona con una sola suscripción: un modelo toma varios roles
- mantiene los asesores en modo solo lectura por defecto
- puede invocar consensus de forma proactiva cuando el agente detecta una petición compleja
- `/council-settings` configura councils multi-modelo sin editar JSON a mano

## Instalación

```bash
opencode plugin @hxnnxs/opencode-council
```

Reinicia OpenCode después de instalar. OpenCode carga los plugins al arrancar.

Si `/council-settings` no aparece, añade el entrypoint TUI en `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@hxnnxs/opencode-council/tui"]
}
```

Instalador CLI opcional:

```bash
npx @hxnnxs/opencode-council install
```

## Actualización

El paquete no tiene auto-update en segundo plano y OpenCode no recarga plugins en caliente. Actualiza el plugin npm y reinicia OpenCode:

```bash
opencode plugin @hxnnxs/opencode-council
```

Si fijaste una versión, cambia el spec explícitamente, por ejemplo `@hxnnxs/opencode-council@0.1.1`. `.opencode-council.json` se conserva.

## Uso

- `/council <question>` - consulta el council por defecto y sintetiza una recomendación
- `/council-review <question>` - revisa el diff actual o un cambio específico
- `/council-arch <question>` - compara tradeoffs de arquitectura
- `/council-debug <question>` - genera hipótesis y próximos pasos de depuración
- `/council-status` - muestra modelos, proveedores y agentes detectados
- `/council-settings` - abre el diálogo TUI para modelos, roles y límite de asesores

El modo proactivo está activado por defecto: para prompts complejos o riesgosos, el agente activo recibe instrucciones para llamar a `council_ask` antes de responder. `/council` sigue disponible para forzarlo manualmente.

## Configuración

Por defecto `models` está vacío: el modelo actual de OpenCode actúa como 5 asesores con roles predefinidos distintos. Añade modelos en `/council-settings` solo si quieres un council multi-modelo.

Archivo de proyecto escrito por el diálogo:

```json
{
  "version": 1,
  "models": ["openai/gpt-5.5", "opencode/big-pickle"],
  "roles": ["architect", "skeptic", "security"],
  "maxAdvisors": 5,
  "includeDiff": false,
  "timeoutMs": 300000
}
```

`models: []` conserva el modo por defecto de un solo modelo.

## Seguridad

Los asesores usan `council-advisor` en modo solo lectura:

- `edit` denegado
- `bash` denegado
- tools con capacidad de escritura desactivadas
- prompts que prohíben modificar el proyecto

## Desarrollo

```bash
npm run check
npm pack --dry-run
```

Este paquete no tiene build step.

El workflow de release en tags `v*` verifica el paquete, construye el tarball npm y lo adjunta al GitHub Release. npm publish se ejecuta aparte o de forma explícita para que el build del tag no falle por credenciales npm.

## Estado

MVP. Este es un plugin independiente de OpenCode. No está creado por el equipo de OpenCode ni afiliado a OpenCode.

---

**OpenCode** [Website](https://opencode.ai) | [Docs](https://opencode.ai/docs) | [Discord](https://opencode.ai/discord)
