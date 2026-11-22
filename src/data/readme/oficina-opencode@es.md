<div align="center">

<img src="docs/assets/banner.svg" width="1000" alt="AI-OFFICE ÔÇö una oficina de agentes para OpenCode" />

<br>

# Un equipo de agentes que termina el trabajo ÔÇö<br>no cuando el modelo dice ┬½listo┬╗,<br>sino cuando las pruebas pasan.

*AI-OFFICE runs teams of AI agents inside OpenCode. They split the work, review each other, and run real quality checks ÔÇö nothing is "done" until it passes.*

<br>

<a href="https://www.npmjs.com/package/oficina-opencode"><img src="https://img.shields.io/npm/v/oficina-opencode?style=for-the-badge&labelColor=0d1117&color=cb3837" alt="npm" /></a>
<a href="https://github.com/SOCRAMbt/AI-OFFICE/blob/main/LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-2ea44f?style=for-the-badge&labelColor=0d1117" alt="licencia MIT" /></a>
<a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?style=for-the-badge&labelColor=0d1117" alt="node >= 22" /></a>
<a href="https://github.com/SOCRAMbt/AI-OFFICE/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-passing-2ea44f?style=for-the-badge&labelColor=0d1117" alt="CI" /></a>
<a href="https://www.npmjs.com/package/oficina-opencode"><img src="https://img.shields.io/npm/dw/oficina-opencode?style=for-the-badge&labelColor=0d1117&color=cb3837" alt="descargas semanales" /></a>
<a href="https://github.com/SOCRAMbt/AI-OFFICE/stargazers"><img src="https://img.shields.io/github/stars/SOCRAMbt/AI-OFFICE?style=for-the-badge&labelColor=0d1117&color=ffd33d" alt="stars" /></a>

<br>

<img src="docs/assets/demo.gif" width="1000" alt="Demo: instalaci├│n, la mesa en vivo con tus agentes, y un gate de seguridad con 0 hallazgos" />

### Tu primer minuto

```bash
npm install -g oficina-opencode
oficina install --target ~/.config/opencode
```

Despu├®s abr├¡ OpenCode en tu proyecto y escrib├¡: **`/oficina <lo que necesit├ís>`**.

<a href="https://socrambt.github.io/AI-OFFICE/"><img src="https://img.shields.io/badge/Demo_en_vivo-2ea44f?style=for-the-badge&labelColor=0d1117" alt="Demo en vivo" /></a>
&nbsp;
<a href="https://github.com/SOCRAMbt/AI-OFFICE/releases"><img src="https://img.shields.io/badge/Releases-v3.3.1-58a6ff?style=for-the-badge&labelColor=0d1117" alt="releases" /></a>

</div>

<!-- BEGIN GENERATED: facts -->
| | |
|---|---|
| **Paquete** | `oficina-opencode` v3.3.2 |
| **Tools** | 18 |
| **Hooks** | 7 |
| **API de plugin** | `@opencode/plugin@2.1.2` |
| **Node** | >=22 |
| **Cat├ílogo** | 258 agentes resolubles en 18 divisiones |
| **Divisiones** | academic, design, engineering, finance, game-development, gis, healthcare, marketing, paid-media, product, project-management, research, sales, spatial-computing, specialized, strategy, support, testing |
<!-- Catalog source: agency-agents @ 4e3ac3c -->
<!-- END GENERATED: facts -->

## ┬┐Qu├® problema resuelve?

Cuando le ped├¡s a un asistente de IA que haga un trabajo, muchas veces el asistente dice ┬½listo┬╗ÔÇª y nadie chequea nada. Puede pasar que el c├│digo no compile, que los tests no corran o que simplemente se haya inventado partes. Y cuando es un trabajo grande (varios archivos, varios pasos), el modelo trata de hacerlo todo ┬½de un tir├│n┬╗ y se pierde.

**AI-OFFICE hace que tu pedido lo resuelva un equipo, no un solo agente.** El equipo se divide el trabajo en partes chicas, las hace de a una, y nada entra en ┬½done┬╗ hasta que pasan las pruebas de verdad.

## ┬┐C├│mo funciona?

1. **Escrib├¡s tu pedido** con `/oficina <lo que quer├®s>`.
2. **El equipo se arma solo**: la oficina elige especialistas del cat├ílogo (hay 258), los pone a trabajar en paralelo y la mesa te muestra qui├®n est├í haciendo qu├®.
3. **Nada se da por terminado a menos que pase las pruebas**: cada parte corre build, tests y chequeo de secretos reales; todo queda registrado en `.oficina/`.

## Preguntas r├ípidas

**┬┐Hace cosas por vos sin que veas?**  No: te informa en cada paso y pod├®s revisarlo en cualquier momento con la mesa y los reportes.

**┬┐Se rompen los agentes?**  Si una parte falla, la oficina lo escribe en el registro y sigue con lo que puede (o escala a vos con opciones concretas).

**┬┐Sirve solo para c├│digo?**  Sirve para cualquier trabajo de varias etapas que pueda verificarse: investigaci├│n, planes, escritura, an├ílisis ÔÇö siempre que el resultado pueda chequearse con "c├│mo sabemos que termin├│".

**┬┐Y si solo quiero una tarea chica?**  Us├í `/oficina lite <pedido>` ÔÇö una c├®lula: 1 ejecutor + 1 revisor, sin arquitectura grande.

**┬┐Y si quer├®s limitar cu├íntos agentes usa?**  `/oficina --maxagents 3 <pedido>` ÔÇö nunca usa m├ís de 3. Sin el flag, el tope es 3 igualmente: el sistema se comporta siempre lo m├ís conservador posible con tus recursos.

## Uso cotidiano

```bash
/oficina Agregar autenticaci├│n JWT con refresh rotation
/oficina lite Renombrar las rutas de la API de v1 a v2
/oficina --maxagents 2 Escribir la gu├¡a de migraci├│n del repo
```

Frases t├¡picas y lo que ver├ís: un plan de cards, el equipo ejecutando, la mesa en vivo, artefactos en `.oficina/artifacts/`, y cada card cerrada con evidencia (qu├® se hizo, qu├® evidencia de que funciona).

### La mesa y el tablero

Al empezar, se abre un tablero en vivo en tu navegador (mesa oval con el equipo, bus de mensajes, gates, progreso). 0 agentes es 0, 3 agentes es 3 ÔÇö muestra exactamente lo que despachaste, nada de relleno.

![La mesa en vivo de AI-OFFICE](docs/assets/demo-dashboard.png)

**Tambi├®n pod├®s abrirla con** `npm run dashboard:demo` ÔÇö un tablero de ejemplo con datos sint├®ticos.

┬┐Primera vez? [`examples/hello-office`](examples/hello-office) es un proyecto de juguete (una lista de tareas de consola) con el objetivo y el paso a paso para probar la oficina en 5 minutos.

<a id="cli-operacion"></a>
## Comandos ├║tiles

```bash
npm install -g oficina-opencode    # instalar la oficina
oficina --version                  # ver la versi├│n instalada
oficina install --target ~/.config/opencode   # desplegar skill, agents y commands
oficina init [objetivo]            # crea .oficina/ en el proyecto
oficina status                     # Cards, agentes, presupuesto, escalaciones
oficina board                      # Tablero Kanban
oficina bus                        # Estad├¡sticas del bus
oficina stats                      # Resumen: estado, cards por columna, iteraci├│n, agentes vivos
oficina audit T-03                 # Artefactos, gates y review de una card
oficina verify                     # Corre los gates de las cards en review
oficina catalog --agency-root <path> # Lista el cat├ílogo de roles disponible
oficina smoke                      # verificaci├│n E2E de punta a punta
npm run dashboard:demo             # tablero de ejemplo con datos sint├®ticos
```

## Seguridad

| Frente | Protecci├│n |
|---|---|
| En la corrida | Restricci├│n de alcance con escritura bloqueada fuera de lo autorizado; archivos sensibles (`.env`, claves, `.npmrc`) inaccesibles por dise├▒o |
| En el repo | Dependabot, `CODEOWNERS` (revisi├│n obligatoria del due├▒o), CI verde con tests de empaquetado y secret scan corriendo en cada push |
| En npm | Publication con provenance SLSA 3 (nada de tokens de larga vida) |

┬┐Encontraste una vulnerabilidad? No abras un issue p├║blico: segu├¡ [SECURITY.md](SECURITY.md).

## Licencia

MIT ÔÇö [LICENSE](LICENSE). Se puede usar, modificar y redistribuir, incluso comercialmente.

## Contribuir

- **Encontraste un error** ÔåÆ [abr├¡ un bug](https://github.com/SOCRAMbt/AI-OFFICE/issues/new?template=bug_report.yml)
- **Ten├®s una idea o sugerencia** ÔåÆ [dej├í una recomendaci├│n](https://github.com/SOCRAMbt/AI-OFFICE/issues/new?template=recomendacion.yml)
- **Quer├®s contribuir** ÔåÆ le├® [CONTRIBUTING.md](CONTRIBUTING.md) y [DEVELOPING.md](DEVELOPING.md)

## Documentaci├│n m├ís profunda

Si quer├®s revisar c├│mo funciona por dentro ÔÇö la arquitectura, los invariantes, cada tool, los gates, el modelo de memoria: te recomendamos empezar por [docs/QUE-ES.md](docs/QUE-ES.md) y seguir por [docs/GARANTIAS.md](docs/GARANTIAS.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).
