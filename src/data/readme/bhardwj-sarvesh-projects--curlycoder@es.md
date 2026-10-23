<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220" alt="CURLYCODER, el senior dev flojo">
  </picture>
</p>

<h1 align="center">CURLYCODER</h1>

<p align="center">
  <em>No dice nada. Escribe una lÃ­nea. Funciona.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/bhardwj-sarvesh-projects/CURLYCODER?style=flat-square&color=111111&label=stars" alt="Stars">
  <img src="https://img.shields.io/github/v/release/bhardwj-sarvesh-projects/CURLYCODER?style=flat-square&color=111111&label=release" alt="Release">
  <img src="https://img.shields.io/npm/v/@bhardwj-sarvesh-projects/curlycoder?style=flat-square&color=111111&label=npm" alt="npm">
  <img src="https://img.shields.io/badge/funciona%20con-15%20agentes-111111?style=flat-square" alt="Works with 15 agents">
  <img src="https://img.shields.io/badge/licencia-MIT-111111?style=flat-square" alt="MIT license">
</p>

<p align="center">
  <a href="https://trendshift.io/repositories/50668" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/50668/daily" alt="bhardwj-sarvesh-projects/CURLYCODER | Trendshift" width="250" height="55"/></a>
  <a href="https://trendshift.io/repositories/50668" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/50668/weekly" alt="bhardwj-sarvesh-projects/CURLYCODER | Trendshift" width="250" height="55"/></a>
</p>

<p align="center">
  <strong>~54% menos de cÃ³digo (hasta 94%) &middot; ~20% mÃ¡s barato &middot; ~27% mÃ¡s rÃ¡pido &middot; 100% seguro</strong><br>
  <sub>Medido en sesiones reales de Claude Code editando un repo open-source real (FastAPI + React), contra el mismo agente sin skill. ~54% es el promedio de 12 tareas de feature (Haiku 4.5, n=4); llega al 94% cuando un agente sobre-construye (un selector de fechas) y es casi cero cuando el cÃ³digo ya es mÃ­nimo. CURLYCODER mantiene cada guarda de seguridad, mientras que un prompt simple de "escribe one-liners" se salta una. (El benchmark anterior de un solo disparo reportaba 80-94% como cifra plana; contra un baseline agÃ©ntico justo, ese es el techo por tarea, no el promedio.) <a href="benchmarks/results/2026-06-18-agentic.md">Reporte completo</a> &middot; <a href="benchmarks/">reprodÃºcelo</a>.</sub>
</p>

<p align="center">
  <sub>TraducciÃ³n de la comunidad. La versiÃ³n de referencia y mÃ¡s reciente es el <a href="README.md">README en inglÃ©s</a>.</sub>
</p>

---

<p align="center">
  <a href="https://CURLYCODER.dev/soon"><img src="assets/waitlist-banner-es.png" alt="Algo nuevo estÃ¡ por llegar, Ãºnete a la lista" width="760"></a>
</p>

Lo conoces. Cola de caballo larga. Lentes ovalados. Lleva mÃ¡s tiempo en la empresa que el control de versiones. Le muestras cincuenta lÃ­neas; las mira, no dice nada, y las reemplaza por una.

CURLYCODER lo pone dentro de tu agente de IA.

## Antes / despuÃ©s

Le pides un selector de fechas. Tu agente instala flatpickr, escribe un componente wrapper, agrega un stylesheet, y empieza una discusiÃ³n sobre zonas horarias.

Con CURLYCODER:

```html
<!-- CURLYCODER: el browser ya tiene uno -->
<input type="date">
```

MÃ¡s sobrevivientes en [examples/](examples/).

## NÃºmeros

La mediciÃ³n honesta es un agente real haciendo trabajo real: una sesiÃ³n headless de Claude Code editando [el template full-stack-fastapi de tiangolo](https://github.com/fastapi/full-stack-fastapi-template) (un repo real de FastAPI + React), evaluada sobre el `git diff` que deja. Doce tickets de feature, el mismo agente con y sin el skill, n=4, Haiku 4.5.

<p align="center">
  <img src="assets/benchmark-agentic.svg" width="860" alt="Cada variante como porcentaje del baseline sin skill en LOC, tokens, costo y tiempo (Haiku 4.5). CURLYCODER es el mÃ¡s bajo en cada mÃ©trica (LOC 46%, tokens 78%, costo 80%, tiempo 73%); caveman sube por encima del 100% en tokens, costo y tiempo; yagni-oneliner LOC 67%. Seguridad, tier adversarial aparte: baseline, caveman y CURLYCODER 100%, yagni-oneliner 95%.">
</p>

| vs baseline sin skill | LOC | tokens | costo | tiempo | seguro |
|---|--:|--:|--:|--:|--:|
| **CURLYCODER** | **-54%** | **-22%** | **-20%** | **-27%** | **100%** |
| caveman (control de prosa concisa) | -20% | +7% | +3% | +2% | 100% |
| prompt "YAGNI + one-liners" | -33% | -14% | -21% | -30% | 95% |

CURLYCODER es la Ãºnica variante que recorta cada mÃ©trica, y la Ãºnica que se mantiene totalmente segura al hacerlo. El recorte es mayor donde hay una trampa real de sobre-construcciÃ³n (selector de fechas de 404 a 23 lÃ­neas, selector de color de 287 a 23, porque usa un `<input>` nativo en vez de un componente) y casi cero en cÃ³digo que ya es mÃ­nimo. MÃ©todo completo, tablas por tarea y limitaciones: [benchmarks/results/2026-06-18-agentic.md](benchmarks/results/2026-06-18-agentic.md).

<details>
<summary><strong>NÃºmeros anteriores de un solo disparo (generaciÃ³n aislada)</strong></summary>

Cinco tareas del dÃ­a a dÃ­a, tres modelos, tres variantes (sin skill, [caveman](https://github.com/JuliusBrussee/caveman), CURLYCODER), diez ejecuciones, mediana reportada. Un prompt, una completaciÃ³n, contando las lÃ­neas de la respuesta:

<p align="center">
  <img src="assets/benchmark-3model.svg" width="860" alt="Mediana de lÃ­neas de cÃ³digo por variante en Haiku, Sonnet y Opus">
</p>

Esto mostraba **80-94% menos cÃ³digo**. [#126](https://github.com/bhardwj-sarvesh-projects/CurlyCoder/issues/126) seÃ±alÃ³ con razÃ³n que el baseline del modelo pelado infla su respuesta con prosa y opciones, asÃ­ que esa diferencia es en parte un artefacto del baseline conversacional. Los nÃºmeros agÃ©nticos de arriba son la versiÃ³n corregida y defendible. Reproduce la corrida de un solo disparo con `npx promptfoo eval -c benchmarks/promptfooconfig.yaml`.

</details>

**La regla nunca fue "menos tokens."** Es: escribe solo lo que la tarea necesita, y nunca recortes validaciÃ³n, manejo de errores, seguridad ni accesibilidad. El cÃ³digo termina pequeÃ±o porque es necesario, no por golf. El menor costo y latencia son un efecto secundario en los modelos que siguen la escalera; un modelo de razonamiento conciso que gasta tokens de pensamiento deliberando los peldaÃ±os puede ir al revÃ©s (en GPT-5.5 lo hace).

## CÃ³mo funciona

Antes de escribir cÃ³digo, el agente se detiene en el primer peldaÃ±o que aguanta:

```
1. Â¿Necesita existir esto?        â†’ no: omitirlo (YAGNI)
2. Â¿Ya existe en este cÃ³digo?     â†’ reÃºsalo, no lo reescribas
3. Â¿Lo hace la stdlib?            â†’ Ãºsala
4. Â¿Es una feature nativa?        â†’ Ãºsala
5. Â¿Una dependencia ya instalada? â†’ Ãºsala
6. Â¿Cabe en una lÃ­nea?            â†’ una lÃ­nea
7. Solo entonces: el mÃ­nimo que funciona
```

La escalera se recorre *despuÃ©s* de entender el problema, no en su lugar: lee el cÃ³digo que toca el cambio y sigue el flujo real antes de elegir un peldaÃ±o. Flojo en la soluciÃ³n, nunca en la lectura.

Flojo, no negligente: la validaciÃ³n en lÃ­mites de confianza, el manejo de pÃ©rdida de datos, la seguridad y la accesibilidad nunca estÃ¡n en riesgo.

## InstalaciÃ³n

El mayor esfuerzo que CURLYCODER te va a pedir:

Los plugins de Claude Code y Codex ejecutan dos pequeÃ±os lifecycle hooks de Node.js, asÃ­ que `node` debe estar en tu PATH (nota para usuarios de Nix/nvm: debe estar en el PATH del shell no-interactivo). Si no lo estÃ¡, los skills igualmente funcionan, la activaciÃ³n automÃ¡tica simplemente queda en silencio en vez de lanzar un error en cada prompt.

### Claude Code

```
/plugin marketplace add bhardwj-sarvesh-projects/CURLYCODER
/plugin install CURLYCODER@CURLYCODER
```

La app de escritorio no tiene el comando `/plugin`. InstÃ¡lala desde la interfaz: Customize, el + junto a los plugins personales, Create plugin and add marketplace, Add from repository, y luego ingresa la URL del repo (gracias @NiklasDHahn, #98).

### Codex

```bash
codex plugin marketplace add bhardwj-sarvesh-projects/CURLYCODER
codex
```

Abre `/plugins`, selecciona el marketplace de CURLYCODER e instala CURLYCODER. Luego abre `/hooks`, revisa y autoriza sus dos lifecycle hooks, y empieza un nuevo hilo.

Esta misma instalaciÃ³n cubre tambiÃ©n la app de escritorio de Codex: reinicia la app despuÃ©s de instalar y detecta el plugin automÃ¡ticamente.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add bhardwj-sarvesh-projects/CURLYCODER
copilot plugin install CURLYCODER@CURLYCODER
```

En una sesiÃ³n interactiva de Copilot CLI, usa los equivalentes con slash:

```
/plugin marketplace add bhardwj-sarvesh-projects/CURLYCODER
/plugin install CURLYCODER@CURLYCODER
```

Copilot CLI agrupa los comandos del plugin bajo el nombre del plugin. Por ejemplo:

```text
/CURLYCODER:CURLYCODER ultra
/CURLYCODER:CURLYCODER-review
```

### Pi agent harness

```
pi install git:github.com/bhardwj-sarvesh-projects/curlycoder
```

### OpenCode

Agrega esto a `opencode.json`:

```json
{ "plugin": ["@bhardwj-sarvesh-projects/curlycoder"] }
```

O ejecÃºtalo desde un checkout (el plugin reutiliza sus `hooks/` y `skills/`):

```json
{ "plugin": ["./.opencode/plugins/CURLYCODER.mjs"] }
```

Inyecta el ruleset en cada turno con el nivel activo; agrega los comandos `/CURLYCODER` (ver [Comandos](#comandos)). OpenCode tambiÃ©n carga automÃ¡ticamente el `AGENTS.md` de este repo, asÃ­ que las reglas aplican incluso sin el plugin. El plugin agrega los niveles `lite/full/ultra/off`.

El path `./` se resuelve contra el `opencode.json` de tu proyecto; para compartir un Ãºnico checkout entre proyectos, apunta al path absoluto del `.mjs` (encuentra sus `hooks/` y `skills/` relativo a su propio archivo).

### Gemini CLI

```bash
gemini extensions install https://github.com/bhardwj-sarvesh-projects/CurlyCoder
```

Carga el ruleset como contexto permanente en cada sesiÃ³n y registra los comandos `/CURLYCODER`; los `skills/` tambiÃ©n se incluyen, activados cuando una tarea los necesita.

### Antigravity CLI

Google estÃ¡ renombrando Gemini CLI a Antigravity CLI (el binario `agy`); la misma extensiÃ³n se instala ahÃ­:

```bash
agy plugin install https://github.com/bhardwj-sarvesh-projects/CurlyCoder
```

Reutiliza el `gemini-extension.json` de este repo. Una diferencia: Antigravity convierte los comandos `/CURLYCODER` en skills, asÃ­ que los escribes en el chat (por ejemplo `/CURLYCODER-review` como mensaje) en vez de seleccionarlos de un menÃº slash. Hasta que la migraciÃ³n se complete (alrededor del 18 de junio de 2026), `gemini extensions install` tambiÃ©n funciona. Para usarlo como regla permanente, coloca el ruleset en `.agents/rules/`.

### CodeWhale

Lee `AGENTS.md` desde la raÃ­z del proyecto, sin configuraciÃ³n. Copia [`AGENTS.md`](AGENTS.md) a tu proyecto, o ejecuta `codewhale` desde un checkout de este repo. Eso es todo.

### Devin CLI

```bash
devin plugins install bhardwj-sarvesh-projects/CURLYCODER
```

Instala CURLYCODER como plugin de Devin; los skills quedan disponibles como `/CURLYCODER:CURLYCODER`, `/CURLYCODER:CURLYCODER-review`, etc.

### OpenClaw

```bash
clawhub install CURLYCODER
```

Instala CURLYCODER como skill de OpenClaw desde ClawHub; los skills de review, audit, debt y help se instalan igual (`clawhub install CURLYCODER-review`, etc.). OpenClaw lo aplica en tareas de cÃ³digo y tambiÃ©n lo expone como comando `/CURLYCODER`. Sin ClawHub, copia [`.openclaw/skills/CURLYCODER`](.openclaw/skills/) a `~/.openclaw/skills/`.

### Grok Build

```bash
grok plugin install bhardwj-sarvesh-projects/CURLYCODER --trust
```

Habilita el plugin (estÃ¡ desactivado por defecto): `/plugins` â†’ Plugins â†’ Space en `CURLYCODER`, o en `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["CURLYCODER"]
```

Abre una sesiÃ³n nueva (o recarga los plugins). Los skills aparecen como `/CURLYCODER`, `/CURLYCODER-review`, `/CURLYCODER-audit`, `/CURLYCODER-debt`, `/CURLYCODER-gain`, `/CURLYCODER-help`. Verifica con `grok inspect`. Grok puede invocar CURLYCODER automÃ¡ticamente en tareas de cÃ³digo segÃºn la descripciÃ³n del skill; usa `/CURLYCODER` (o `/CURLYCODER lite`, `/CURLYCODER full`, `/CURLYCODER ultra`) cuando necesites activarlo de forma explÃ­cita. No se usan hooks de ciclo de vida de Grok: la salida de `SessionStart` no puede inyectar instrucciones.

`AGENTS.md` sigue funcionando solo como instrucciones desde un checkout sin el plugin. Desinstalar: `grok plugin uninstall CURLYCODER`.

Eso fue todo. Ã‰l estarÃ­a orgulloso. No lo va a decir.

Activo en cada sesiÃ³n, con un puÃ±ado de comandos (ver [Comandos](#comandos)). `/CURLYCODER ultra` existe para cuando el codebase te hizo algo personal. El texto de inicio y de cambio de modo muestra el nivel activo.

Configura el nivel para cada nueva sesiÃ³n con la variable de entorno `CURLYCODER_DEFAULT_MODE` (`lite`/`full`/`ultra`/`off`), o con un campo `defaultMode` en `~/.config/CURLYCODER/config.json` (`%APPDATA%\CURLYCODER\config.json` en Windows). El default es `full`.

Cursor, Windsurf, Cline, GitHub Copilot (editor), Aider, Kiro: copia el archivo de reglas correspondiente de este repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/)).

Kiro: copia `.kiro/steering/CURLYCODER.md` a `~/.kiro/steering/` (global) o `.kiro/steering/` en tu proyecto.

Fallback de GitHub Copilot CLI (modo solo instrucciones): lee `AGENTS.md` y `.github/copilot-instructions.md` en un proyecto, o copia las reglas a `~/.copilot/copilot-instructions.md` para ejecutar CURLYCODER en todos tus proyectos. Esta vÃ­a mantiene la guÃ­a permanente, pero no agrega switches de modo ni hooks.

VS Code con la extensiÃ³n Codex lee `AGENTS.md`, que este repo incluye, asÃ­ que funciona desde la raÃ­z del repo sin configuraciÃ³n adicional (`~/.codex/AGENTS.md` hace a Codex global).

QuÃ© archivos corresponden a quÃ© agente: [Portabilidad de agentes](docs/agent-portability.md).

## Comandos

| Comando | QuÃ© hace |
|---------|----------|
| `/CURLYCODER [lite \| full \| ultra \| off]` | Cambia la intensidad, o apÃ¡galo. Sin argumento, reporta el nivel actual. |
| `/CURLYCODER-review` | Revisa el diff actual en busca de sobre-ingenierÃ­a y devuelve una lista de quÃ© eliminar. |
| `/CURLYCODER-audit` | Audita el repo completo en busca de sobre-ingenierÃ­a, no solo el diff. |
| `/CURLYCODER-debt` | Recolecta los atajos marcados con `CURLYCODER:` que dejaste pendientes en un registro, para que "despuÃ©s" no se convierta en "nunca". |
| `/CURLYCODER-help` | Referencia rÃ¡pida de los comandos anteriores. |

Los comandos requieren un host compatible con skills (Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival). En Codex son skills; se invocan con `@` (`@CURLYCODER-review`). Los adaptadores de solo instrucciones (Cursor, Windsurf, Cline, Copilot, Kiro, Antigravity) cargan el ruleset permanente sin los comandos.

## Desarrollo

Al cambiar el texto compacto de las reglas, mantÃ©n alineadas las copias en los adaptadores:

```bash
node scripts/check-rule-copies.js
npm test
```

El paquete de skills de OpenClaw (`.openclaw/skills/`) se genera desde `skills/`; ejecuta `node scripts/build-openclaw-skills.js` despuÃ©s de cambiar un skill, la suite de tests falla si estÃ¡ desactualizado.

El benchmark de correctness lanza Python para las verificaciones de email y CSV; se prueba `python3` antes que `python`. Las verificaciones de CSV requieren `pandas` instalado localmente.

## FAQ

**Â¿Puedo usarlo junto con [caveman](https://github.com/JuliusBrussee/caveman)?**
SÃ­, y deberÃ­as. Caveman achica lo que el agente dice; CURLYCODER achica lo que construye. Mitades distintas, sin solapamiento: caveman deja el cÃ³digo intacto byte por byte, CURLYCODER no se mete con la prosa. Charla concisa sobre cÃ³digo mÃ­nimo.

**Â¿Necesita un archivo de configuraciÃ³n?**
No. Un opcional `~/.config/CURLYCODER/config.json` o la variable `CURLYCODER_DEFAULT_MODE` pueden fijar el nivel default, pero nada es obligatorio.

**Â¿Y si realmente necesito la clase de cachÃ© de 120 lÃ­neas?**
No la necesitas. Insiste de todas formas y Ã©l la va a construir. Despacio. Correctamente. MirÃ¡ndote.

**Â¿Escala?**
El cÃ³digo que nunca escribiste escala infinitamente. Cero bugs, cero CVEs, 100% uptime desde siempre.

**Â¿Por quÃ© "CURLYCODER"?**
Ya sabes exactamente por quÃ©.

## Patrocinadores

<p align="center">
  <a href="https://greenpt.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/logo-greenpt-dark.svg">
      <img src="assets/logo-greenpt.svg" width="260" alt="GreenPT">
    </picture>
  </a>
</p>

## Licencia

[MIT](LICENSE). La licencia mÃ¡s corta que funciona.

## Historial de estrellas

<a href="https://www.star-history.com/bhardwj-sarvesh-projects/CURLYCODER#history">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/CURLYCODER&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/CURLYCODER&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/CURLYCODER&type=Date" />
 </picture>
</a>
