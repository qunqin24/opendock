<div align="center">

# AI-OFFICE

### Una oficina de agentes para OpenCode donde el trabajo no se detiene cuando el modelo dice «terminé».

[![npm](https://img.shields.io/npm/v/oficina-opencode?label=npm&color=cb3837)](https://www.npmjs.com/package/oficina-opencode)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/SOCRAMbt/AI-OFFICE/tree/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](https://nodejs.org)
[![tests](https://img.shields.io/badge/tests-213%20passing-22a06b.svg)](https://github.com/SOCRAMbt/AI-OFFICE/tree/main/tests)
[![coverage](https://img.shields.io/badge/coverage-87.3%25-7c3aed.svg)](https://vitest.dev)
[![types](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/tsconfig.json)

**Una malla de coordinadores + peer mesh sobre un roster de roles.**

<!-- BEGIN GENERATED: facts -->
| | |
|---|---|
| **Paquete** | `oficina-opencode` v3.0.5 |
| **Tools** | 16 |
| **Hooks** | 7 |
| **API de plugin** | `@opencode/plugin@2.1.2` |
| **Node** | >=20 |
| **Catálogo** | 258 agentes resolubles en 18 divisiones |
| **Divisiones** | academic, design, engineering, finance, game-development, gis, healthcare, marketing, paid-media, product, project-management, research, sales, spatial-computing, specialized, strategy, support, testing |
| **Límites** | 20 cards · 40 llamadas · 20 spawns · 10 agentes |
| **Cobertura mínima** | 60% |
<!-- END GENERATED: facts -->

> **¿Preferís la versión en humano?** → [`docs/QUE-ES.md`](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/QUE-ES.md) — qué es, qué hace y por qué, sin jerga.
> **¿Preferís el porqué técnico?** → [`docs/ARCHITECTURE.md`](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/ARCHITECTURE.md)

[Documentación](#arquitectura) · [Garantías](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/GARANTIAS.md) · [Compatibilidad](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/COMPATIBILITY.md) · [Prueba E2E](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/PRUEBA-E2E.md) · [Instalación](#instalación) · [Uso](#uso) · [CLI](#cli-operación)

</div>

---

## El problema

Working con agents tiene cinco fallas concretas. No son falta de inteligencia: son falta de **estructura**.

| Falla | Qué pasa en la práctica |
|---|---|
| **El modelo decide cuándo terminar** | Dice «listo, terminado» con la mitad del trabajo sin hacer, y la sesión para ahí. |
| **El trabajo se hace lineal** | Todo en un solo contexto: un agente, una tarea, un hilo. Los subagentes existen pero se desaprovechan. |
| **Nadie orquesta** | No hay un plan, no hay prioridad, no hay un dueño por tarea. |
| **El contexto se pierde** | Hay que repetir lo que ya se dijo, lo ya se decidió y lo ya se encontró. |
| **Los subagentes son islands** | No se piden ayuda, no se coordinan, no se benefician del trabajo del otro. |

Una skill de markdown no arregla ninguna de las cinco. Un sistema con reglas escritas en código, no: porque **no dependen de que el modelo tenga ganas de seguirlas**.

---

## Qué es

**AI-OFFICE** es un plugin de OpenCode que convierte la orquestación en **código ejecutable**, no en instrucciones.

```
Skill     →  "Hacé lo que corresponda"          →  depende de que el modelo quiera
Plugin    →  máquina de estados + hooks         →  no depende de la buena voluntad
```

Cuatro piezas lo hacen posible:

**1. Un hook que no deja que la sesión muera.** Cuando la sesión queda `idle` y quedan cards sin terminar, el motor manda un prompt sintético y la corrida sigue. El modelo **no puede declarar que terminó**: el estado lo dice.

**2. Un guard que no deja editar fuera de scope.** `tool.execute.before` intercepta cada `edit`/`write` y lo rechaza si el archivo está fuera del scope de la card. "No toques eso" deja de ser una sugerencia.

**3. Gates que se ejecutan, no se opinan.** Build, type check, lint, tests, escaneo de secretos y diff review. El motor corre los comandos, lee los exit codes y decide. La salida real queda pegada en el artefacto.

**4. Invariantes que el código garantiza.** `gate_required_before_done` y `reviewer_neq_owner` no son recomendaciones: `assertInvariants` lanza y la transición no ocurre.

Y una quinta, que es lo que hace confiable todo lo demás:

**5. El roster se arma según el objetivo.** Los roles salen del catálogo real de agency-agents (**306 agentes, 25 divisiones**), matcheados contra lo que la card pide. Y cada agente recibe un **briefing** de 10 secciones con lo que sabe, lo que no, y qué tiene que entregar.

---

## Arquitectura

Cuatro capas. De abajo hacia arriba.

```
┌──────────────────────────────────────────────────────────────────────┐
│ CAPA 3 — COORDINACIÓN                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ COMANDANTE   │  │ ARQUITECTO   │  │ INTEGRADOR                │  │
│  │ scope        │  │ cross-cutting│  │ DAG · leases · gates      │  │
│  │ objetivo     │  │ patrones     │  │ presupuesto · anti-deadlock│ │
│  │ prioridad    │  │ contratos    │  │                            │  │
│  └───────┬──────┘  └──────┬───────┘  └────────────┬──────────────┘  │
│          │                │                       │                 │
│  ════════╪════════════════╪═══════════════════════╪═════════════    │
│          ▼                ▼                       ▼                 │
│ CAPA 2 — BUS DE MENSAJES  (append-only sobre disco)                 │
│  bus/<canal>/<seq>-<msgid>.json                                      │
│  inbox/<agentId>/  ·  roster.json  ·  leases/<taskId>.json           │
│  canales: coord-command │ coord-arch │ coord-flow │ peer            │
│          │                                                              │
│          ▼                                                              │
│ CAPA 1 — ESPECIALISTAS  (ficha normalizada)                         │
│  E1  E2  E3  E4  E5  E6  E7  E8  E9  E10                            │
│  briefing: ficha.md · misiones.md · protocolo.md · bus.md            │
│          │                                                              │
│          ▼                                                              │
│ CAPA 0 — ROSTER / FICHAS  (resolución de roles)                      │
│  agency-agents/<division>/*.md  →  ficha  │  catálogo < 60% → factory│
└──────────────────────────────────────────────────────────────────────┘
```

---

## Capa 0 — De dónde sale la especialidad

El repo de agency-agents tiene **306 agentes en 25 divisiones**, y cada uno trae un briefing de 10 secciones. La especialidad real **no está en el `description`** del frontmatter: está en el cuerpo.

Un agente de statistics declara:
- `description`: *"Expert in quantitative research methodology..."*
- **Core Mission** → *Pressure-Test Quantitative Claims*, *Design Sound Studies*
- **Technical Deliverables** → *Claim Interrogation Framework*, *Effect Size Report*
- **Advanced Capabilities** → *Causal Inference*, *Experimental Design*

La `description` dice de qué se ocupa. El cuerpo dice **en qué es exactamente bueno**. Un matcher que solo mira la `description` no puede distinguir a un metodólogo de un analista de datos — aunque uno de los dos sea exactamente lo que la card necesita.

Por eso el parser extrae las secciones del cuerpo, y el score pondera cada señal por lo que aporta:

| Señal | Peso | Por qué |
|---|---|---|
| **Identidad** (slug + nombre + `description` + `vibe`) | 35% | Las dos últimas son **líneas curadas** que dicen de qué se ocupa el agente. El cuerpo son 300 líneas donde cualquier palabra genérica aparece |
| **Misión, overlap literal** | 28% | Lo que el agente dice que sabe hacer, con sus palabras |
| **Misión, overlap conceptual** | 18% | Puentea sinónimos con una taxonomía de 26 dominios |
| **División** | 10% | Una card de e2e testing va a la división `testing`, no a `engineering` |
| **Cuerpo completo** | 5% | Ruido: "review" aparece en todos |

**Sinónimos por capability**, no por concepto. La taxonomía agrupa; los sinónimos no. `"e2e"` es `"end-to-end"`, pero `"e2e"` **no** es `"playwright"`. Esa distinción separa a un especialista de un generalista que menciona la tool de pasada.

**Lematización**: `"testing"` ~ `"test"`, `"validation"` ~ `"validate"`. El Commander pide capabilities en sus palabras y los agentes usan las suyas.

**Focus de misión**: qué fracción de las misiones declaradas del agente tiene que ver con el objetivo. Un `Test Automation Engineer` tiene las 5 en el dominio → focus 1. Un PDF engine con *una* misión sobre "Playwright Browser Context Pools" y las otras 7 sobre PDF → focus 0.12. **Este es el discriminante real.**

El score final combina: cobertura (35%) + recall (30%) + focus (25%) + F1 (10%).

Resolución real contra el catálogo:

| Objetivo | Primario | Cobertura |
|---|---|---|
| Pipeline de datos con ingesta y agregación | `engineering-data-engineer` | 76% |
| Migración de Postgres con partitioning | `engineering-gaussdb-expert` | 60% |
| Formulario de login en React con accesibilidad | `engineering-uswds-developer` | 56% |
| CI/CD con Docker y Kubernetes | `engineering-devops-automator` | 53% |
| Agente de GIS y cartografía | `gis-web-gis-developer` | 52% |
| Tests e2e con Playwright | `testing-test-automation-engineer` | 47% |
| Seguridad de un endpoint API | `testing-api-tester` | 42% |

Reproducible: `npx tsx scripts/demo-roles.ts`

### El benchmark: ¿la complejidad se justifica?

Un matching textual puede elegir bien al rol y aun así no ser el mejor para la tarea. La pregunta no es *"¿funciona?"* sino **"¿vale la pena?"**. El benchmark compara tres estrategias sobre 21 tareas con resultados de referencia:

| Estrategia | hit@1 | hit@3 | MRR |
|---|---|---|---|
| **El matcher de la oficina** | **71%** | 86% | **0.778** |
| Keywords (los pesos de la v1) | 48% | 81% | 0.623 |
| Solo el nombre del rol | 52% | 76% | 0.639 |

El matcher completo le gana por **23 puntos** de hit@1 a la versión anterior. La complejidad se justifica, y ahora está dicho con números en vez de con adjetivos.

También se probó una ponderación por **IDF** (los tokens raros pesan más) y **no se quedó**: bajaba el hit@1 a 67%. El código lo documenta y el benchmark lo demuestra. La complejidad que no se justifica hay que sacarla, no dejarla dormida en el repo.

```bash
npm run bench:selection
```

### El panel: primario + complementos

Un objetivo casi nunca es de un solo dominio. *"Formulario de login en React con validación y accesibilidad"* necesita un frontend (que no sabe de ARIA) **y** un especialista en accesibilidad (que no sabe de React).

Si el sistema elige uno solo, deja huecos. Si elige varios sin criterio, duplica capacidad. El panel resuelve las dos cosas:

```
OBJETIVO: Implementar un formulario de login en React con validación y accesibilidad
PIDE:     react, form, validation, accessibility, frontend

  PRIMARIO    56%  engineering/engineering-uswds-developer
              "USWDS Developer"
              cubre:   react, css, form, accessibility

  + COMPLEM. 39%  engineering/engineering-section-508-specialist
              "Section 508 Accessibility Specialist"
              aporta:  form, accessibility
```

El primario se lleva la card. Los complementos son los agentes que cubren **lo que el primario no cubre**, y son sus pares naturales en el bus. Y lo que nadie cubre **se reporta explícitamente**: es la señal de que la card debería partirse en dos.

### La ficha: un solo schema

Venga el rol de `agency-agents` o de la factory, se materializa en la **misma** ficha. Esa unificación es lo que permite que el bus, el matching de ayuda, la rotación y los coordinadores no necesiten saber el origen de nada.

```yaml
id: e-frontend
role: frontend-developer
source:
  kind: agency-agents
  division: engineering
  path: engineering/frontend-developer.md
  vibe: "Pixel obsessive, allergic to dead CSS."
  missions: ["Create Modern Web Applications", "Optimize Performance and UX"]
  deliverables: ["Component Library", "Design Token System"]
  rules: ["Never ship a component without a test", "..."]
capabilities: [react, component, ui, web, accessibility, performance, ...]
scope:
  mayTouch: ["src/components/**", "src/hooks/**"]
  forbidden: ["src/server/**", "**/*.env*"]
can_delegate: true
delegate_budget: 2
peers: [e-architect, e-qa, e-security]
must_not:
  - "no editar archivos fuera de may_touch"
  - "no aprobar tu propio trabajo"
on_finish: idle-join
escalate_to: coordinator-flow
```

### La factory: el mismo briefing, sin catálogo

Un rol fabricado tiene que ser **indistinguible en calidad** de uno del catálogo. Si el catálogo tiene agentes con briefing de 10 secciones, uno fabricado con un prompt de 5 líneas se nota: es monótono, no tiene criterio propio, y el resto de la malla lo trata como de segunda.

Por eso la factory emite **exactamente la misma estructura**: Identity & Memory, Core Mission, Critical Rules, Technical Deliverables, Workflow Process, Communication Style, Learning & Memory, Success Metrics, Advanced Capabilities. El parser no distingue el origen.

Y lo importante: el prompt fabricado **no es genérico**. Lleva las capabilities concretas, el scope, el objetivo de la corrida, los modos de fallo del rol y el contexto de la card.

---

## El equipo se arma

El flujo completo es: **doy un objetivo → el jefe lo divide → crea los subagentes → arrancan a trabajar juntos**.

`oficina_dispatch` es el momento en que eso pasa:

1. **El Comandante descompone** el objetivo en cards (`oficina_plan`). Cada card dice qué se produce, cómo se sabe que está bien, y qué archivos puede tocar.
2. **El dispatch resuelve los roles.** Para cada card busca en el catálogo de agency-agents el agente que mejor encaja, calcula el **panel** (primario + complementos), y si la cobertura queda baja **fabrica** el rol con la card como contexto.
3. **Materializa los agentes** en `.opencode/agents/` del proyecto, cada uno con su briefing de 10 secciones y su prompt de especialidad. Quedan versionados con el repo: la próxima sesión ya están registrados.
4. **Los arranca en paralelo** vía `session.prompt` con una parte `subtask` — la vía que OpenCode provee para crear subagentes reales.

El resultado:

```
▸ formulario de login en React con validación y accesibilidad
  → `oficina-engineering-uswds-developer`       card T-00
  + `oficina-testing-api-tester`                  par libre   aporta: validation
  → `oficina-engineering-section-508-specialist` card T-01
  + `oficina-testing-accessibility-auditor`       par libre   aporta: aria
  → `oficina-testing-test-automation-engineer`    card T-02
```

Los **pares libres** son los complementos: están en la mesa, pueden recibir un pedido de ayuda, y pueden reclamar una card que quedó sin dueño.

---

## La mesa

Los subagentes son procesos aislados: no se ven, no saben quién más trabaja, no saben a quién preguntarle. La **mesa** es la vista compartida — vive en disco, así que todos la leen sin memoria compartida.

`oficina_mesa` responde:

- **Quién está trabajando en qué** — y qué archivos toca cada uno
- **Quién está libre** y puede recibir un pedido de ayuda
- **Qué cards no tienen owner** — reclamables proactivamente
- **Qué ayuda sigue sin responder** y **qué preguntas están abiertas**

Y cuando la sesión queda `idle`, el hook de auto-continuación inyecta esa foto en el prompt del agente que arranca. Sin esto, el peer mesh es un bus al que nadie mira.

### El ciclo de un agente

```
DEPLOYED → WORKING → (terminó) → IDLE_AVAILABLE → (ayuda) → WORKING
                            ↓                                        ↑
                        BLOCKED ──→ IDLE_AVAILABLE ──────────────────┘
```

Cuando un agente termina, **ofrece ayuda** para lo que sigue. No queda esperando.

### Hablar por el bus

El que recibe un pedido de ayuda **hace su propio triage** — no acepta por cortesía:

1. ¿Entiendo la tarea? → si no, `HELP_DECLINE` + explicar
2. ¿Está en mi scope? → si no, `HELP_DECLINE` + sugerir a quién
3. ¿Puedo hacerlo ya sin romper mi card? → si no, `HELP_DECLINE` + "cuando termine"
4. ¿Tengo el contexto? → si no, `HELP_QUESTION` por el bus
5. ¿Vale la pena? → si no, `HELP_DECLINE` + alternativa
6. ¿Tengo presupuesto? → si no, `HELP_DECLINE` + "sin presupuesto"

**Anti-deadlock**: máximo 2 saltos en una cadena de ayuda; después escala al Integrador.
**Anti-monotonía**: si el par A↔B ya se ayudaron 2 veces, el tercer pedido va a un tercero.

---

## El scope es una restricción, no una instrucción

La versión anterior del guard comparaba strings: `"...".match(/^src\//)`. Eso se eludía por tres vías, y las tres eran reales.

```
// El bug: la ruta se comparaba sin resolver.
const relative = path.relative(projectRoot, absolute)
if (!matchesScope(relative, mayTouch)) throw ...
```

| Escape | Antes | Ahora |
|---|---|---|
| Symlink a fuera del proyecto | `src/link.ts` matcheaba `src/**` | Se resuelve el symlink y **se revalida** la contención |
| `..` con `mayTouch: ["**"]` | `**` matcheaba cualquier string | `**` significa *el proyecto*, nunca el filesystem |
| Path absoluto | `relative` empezaba en `..` y con `**` pasaba | La contención se verifica antes de cualquier glob |

Ahora la ruta se **resuelve** (absoluta → normalizada → symlinks resueltos → `realpath`) y recién ahí se decide, con `fail-closed`.

Además:

- **Todas las tools que escriben**, no solo `edit`/`write`. Los patches multi-archivo se chequean **todos**, no solo el primero.
- **Los comandos de shell** se analizan antes de ejecutarse: redirecciones, `cp`, `mv`, `rm`, `sed -i`, `dd`, `curl -o`, `git checkout`, interpreters embebidos.
- **Los subagentes heredan el scope** por la cadena de padres de sesión. Delegar no es un escalón para salirse.
- **Los archivos sensibles** (`.env`, `.npmrc`, `.git/**`, claves privadas) nunca son escribibles, pase lo que pase el scope de la card.
- **El tripwire** fotografía el árbol antes de un comando y compara después: detecta lo que el guard no pudo ver.

> Lo que **no** se promete está en [`docs/GARANTIAS.md`](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/GARANTIAS.md). Un shell con interpreter embebido puede escribir afuera; el tripwire lo detecta después, pero no lo revierte. Preferimos decirlo a vender un aislamiento que no existe.

---

## Una caída no destruye la corrida

La oficina escribe en disco, en varios archivos, sin transacción. Un proceso que muere en el momento equivocado deja el estado incoherente. `reconcile()` compara **estado vs artefactos vs filesystem**:

| Situación | Qué hace |
|---|---|
| Card en `review` sin `handoff.md` | El agente murió entregando. Se avisa. |
| Card en `done` sin `gates.md` | Se cerró sin gate. **Crítico.** |
| Card en progreso sin owner | Nadie la va a terminar. **Crítico.** |
| Lease de una card que no existe | Se libera. |
| Lease de una card terminada | Se libera. |
| Agente `working` sobre una card `done` | Se libera el agente. |
| Card bloqueada por dependencia irresoluble | Se reporta. |

Lo que **no** hace: completar cards ni inventar evidencia. Un sistema que se auto-repara inventando pruebas es peor que uno que dice *"esto está roto"*.

---

## El costo se controla, no solo la cantidad de agentes

Limitar el número de agentes **no** es controlar el costo: un agente que relee el mismo contexto veinte veces cuesta diez veces lo que uno que lo hace bien.

- El costo real viene del motor (`AssistantMessage.cost`), no se estima.
- Se contabiliza por **card**, por **agente** y por **fase** (implementación, review, reparación).
- Presupuestos por corrida, por card y por fase.
- Estimación previa a una corrida grande.
- Detección de **trabajo redundante**: releer el mismo path, repetir el mismo comando.
- **Freno de emergencia**: `oficina_stop` detiene la corrida; el auto-continuación y el despacho se niegan mientras esté detenida.

---

## Capa 1 — El briefing: qué sabe cada agente antes de arrancar

Un subagente arranca con el contexto vacío. Si el Commander le pasa un prompt suelta (*"implementá el login"*), el agente tiene que adivinar: qué sabe del proyecto, qué espera de él, qué puede tocar, a quién preguntarle si se traba, y qué tiene que entregar. Adivinar es la fuente de todo el trabajo que se repite y de los agentes que se salen del scope.

El briefing es el contrato de información. Tiene **orden fijo** y **mínimo verificable**.

### El orden

La información llega de lo más estable a lo más cambiante. Un agente lee de arriba hacia abajo y siempre tiene lo que necesita para el paso siguiente.

| # | Sección | Qué le dice |
|---|---|---|
| 1 | **Quién sos** | Rol, especialidad de origen, de dónde viene tu briefing, tu vibe |
| 2 | **Tu misión** | La card exacta, los criterios de aceptación numerados, el control de calidad |
| 3 | **Lo que ya sabés** | Decisiones tomadas, restricciones descubiertas, piezas construidas, trampas |
| 4 | **Lo que NO sabés** | Los huecos explícitos y **a quién preguntarle** por cada uno |
| 5 | **Tu territorio** | Qué podés tocar, qué no, y qué prohibiciones trae tu ficha |
| 6 | **Cómo trabajás** | El ciclo, cuándo pedir ayuda, cuándo delegar, cuándo escalar |
| 7 | **Tu canal** | Dónde dejás y encontrás mensajes, formato, TTLs, cómo acusar recibo |
| 8 | **Qué se espera de vos** | Los entregables exactos: `handoff.md` y `evidence.md` |
| 9 | **Lo que no podés hacer** | Las prohibiciones duras. Están en código, no en tu criterio |
| 10 | **Cómo se mide que terminaste** | Las tres condiciones de terminado |

### El mínimo

Las diez secciones son **requeridas**. Si alguna queda vacía, el briefing se marca `INCOMPLETO` y **el agente no arranca**. Un briefing a medio llenar produce un agente a medio informado, que es peor que no tener agente.

### Los cuatro artefactos

El briefing se materializa en cuatro archivos en disco, porque un agente no "recuerda" un prompt largo: lo lee.

```
.oficina/fichas/<agentId>/
├── ficha.md       ← Quién sos
├── misiones.md    ← Tu misión · lo que ya sabés · lo que NO sabés
├── protocolo.md   ← Cómo trabajás · tu territorio · qué se espera · límites · éxito
├── bus.md         ← Tu canal
└── briefing.md    ← el documento completo, para lectura humana
```

**El agente no arranca sin `misiones.md`. Nunca.**

### El ledger: lo que ya sabés

La sección 3 se alimenta del **contexto acumulado** de la corrida (`.oficina/context.md`), que registra decisiones, restricciones, piezas construidas y trampas. Es lo que evita que un agente repita lo que ya se decidió — y lo que convierte al bus en algo más que un tablón de avisos.

---

## Capa 2 — El bus

Los subagentes de OpenCode son **procesos aislados sin memoria compartida**. No pueden hablarse de facto. La solución coherente es un bus append-only sobre disco.

```json
{
  "id": "m-0042",
  "seq": 42,
  "from": "e-frontend",
  "to": ["e-architect"],
  "kind": "HELP_REQUEST",
  "subject": "T-03",
  "body": {
    "need": "convertir este componente a streaming SSR",
    "why_me": "tengo el contexto del componente pero no el del server"
  },
  "reply_to": null,
  "in_reply_to": null,
  "ttl_sec": 900,
  "created_at": "2026-10-21T15:04:00Z",
  "priority": "normal",
  "idempotency_key": "help:T-03:e-frontend:a1b2c3",
  "hops": 0
}
```

| Garantía | Implementación | Por qué importa |
|---|---|---|
| **Append-only** | Los mensajes nunca se borran; `seq` es monótono por canal | El log es la auditoría |
| **Escritura atómica** | `.tmp` + `rename` | Nunca hay un JSON partido en el read |
| **Ack** | `inbox/<agentId>/<msgid>.ack` | El emisor sabe quién leyó |
| **TTL** | Vencido = invisible para lectores nuevos, sigue en el log | Un pedido viejo no bloquea nada |
| **Idempotency key** | Mismo key = mismo mensaje | Evita el storm de «¿me ayudás?» |
| **Broadcast** | `to: ["*"]` al pool | El primero que acepta toma el lease |
| **Anti-deadlock** | `hops` máximo 2 | Una cadena de ayuda no se enquista |

### El que recibe hace su propio triage

No acepta por cortesía. Seis preguntas, en orden:

1. ¿Entiendo la tarea? → si no, `HELP_DECLINE` + explicar
2. ¿Está en mi scope? → si no, `HELP_DECLINE` + sugerir a quién
3. ¿Puedo hacerlo **ya** sin romper mi card? → si no, `HELP_DECLINE` + «cuando termine»
4. ¿Tengo el contexto? → si no, `HELP_QUESTION` por el bus
5. ¿Vale la pena? → si no, `HELP_DECLINE` + alternativa
6. ¿Tengo presupuesto? → si no, `HELP_DECLINE` + «sin presupuesto»

---

## Los 7 hooks

Acá es donde el protocolo deja de ser una intención.

| Hook | Qué hace | Por qué importa |
|---|---|---|
| `event` → `session.idle` | Si queda trabajo, manda un prompt sintético y la corrida sigue | La oficina trabaja sola. El modelo no declara el fin: el estado. |
| `tool.execute.before` | Bloquea escrituras fuera del scope de la card | «No toques eso» pasa de instrucción a restricción |
| `experimental.chat.system.transform` | Inyecta el estado de la oficina en cada llamada | El agente no repregunta lo que ya sabe ni repite trabajo |
| `experimental.session.compacting` | Reinyecta el estado **leído del disco** al compactar | Sin esto, la oficina se olvida a mitad de camino |
| `tool.execute.after` | Tripwire: fotografía el árbol antes de un comando y compara después | Detecta lo que el guard no pudo ver |
| `permission.ask` | Segunda capa de enforcement, a nivel del framework | Deniega en el motor, no solo en el hook propio |
| `event` → `message.updated` | Contabilidad de costo con el número real del motor | El costo no se estima: el motor ya lo sabe |
| `experimental.compaction.autocontinue` | Freno de emergencia sobre la auto-continuación | Sin esto, una corrida se quema sola en tokens |

El hook de auto-continuación tiene guardas duras: solo reanuda si queda trabajo real, tope de 25 auto-reanudaciones por sesión, cooldown de 1,5 s entre reanudaciones, y nunca reanuda una corrida `paused`, `blocked` o `delivered`.

---

## Los 7 gates

Se ejecutan de verdad; el motor interpreta los exit codes.

| # | Fase | Node | Python | Go | Rust |
|---|---|---|---|---|---|
| 1 | Build | `npm run build` | `python -m build` | `go build ./...` | `cargo build` |
| 2 | Type check | `npm run typecheck` | `mypy` | `go vet ./...` | `cargo check` |
| 3 | Lint | `npm run lint` | `ruff` | `golangci-lint` | `cargo clippy` |
| 4 | Tests | `npm run test` | `pytest` | `go test` | `cargo test` |
| 5 | Secretos | escaneo en código | ← | ← | ← |
| 6 | Diff review | `git diff --stat` | ← | ← | ← |
| 7 | Requisitos | cada criterio de aceptación con su evidencia | ← | ← | ← |

### La pirámide de verificación

Los seis gates técnicos dicen que **el código está sano**. Dicen nada de si el **objetivo del usuario está cumplido**: un proyecto puede compilar, pasar todos sus tests y tener la autenticación mal porque ningún test contemplaba ese escenario.

| Nivel | Qué comprueba |
|---|---|
| 1 — Estático | Tipos, lint, secretos, dependencias |
| 2 — Comportamiento | Unitarias, integración, regresión, casos límite |
| 3 — Requisitos | Cada criterio de aceptación enlazado a su evidencia |
| 4 — Auditoría | Revisión independiente, riesgos, coherencia de la evidencia |

El gate 7 es el que cierra el círculo: **una card no se cierra si falta evidencia de un requisito obligatorio**, aunque los otros seis estén en verde.

### El grafo requisito → evidencia

Cada criterio de aceptación es un requisito. Cada evidencia —un artefacto, un test, un gate, una inspección, una auditoría— se vincula a un requisito con un nivel. El grafo responde *qué falta para poder cerrar*:

```
T-00 · Implementar login
  [✓] endpoint de login                     nivel 2   artefacto
  [ ] sin errores de validación            nivel 0   — FALTA
  [!] cubierto por revisión independiente   nivel 4   auditoría
```

Un artefacto llega a nivel 2; un test, a 2; un gate, a 1 (o 2 si es la fase `test`); una inspección, a 3; una auditoría —con revisor distinto del owner—, a 4. Una auto-revisión con cara de auditoría se **rechaza**: es peor que no tener auditoría.

**Reglas de honestidad** — no negociables:

- Nunca `PASS` en una fase que no se corrió → `NOT RUN` y eso hace fallar el gate
- Nunca output inventado
- `N/A` siempre con motivo explícito
- Una fase aplicable en `FAIL` = gate `FAIL`. No se promedia
- El escaneo de secretos corre **en TypeScript**, no shelling out a `grep` (que no existe en Windows), y **redacta** el valor: un log de gate que imprime la credencial completa la acaba de filtrar

---

## Invariantes duros

Los implementa el código. Un prompt puede pedirle al modelo que sea cuidadoso; el motor no puede romperlos.

> **Ocho invariantes duros**, y se evalúan **donde corresponde**: el de cierre en el cierre, el de presupuesto al gastar, el de ayuda al enrutar. Evaluar un invariante de `DONE` con la card todavía en `review` lo deja vacío — y así estaba antes: el invariante `gate_required_before_done` no disparaba nunca. Ahora se valida contra el estado al que la card llegaría.

| Invariante | Valor |
|---|---|
| `gate_required_before_done` | `true` — sin gates en `PASS` no hay `DONE` |
| `evidence_required_before_done` | `true` — sin evidencia de los requisitos obligatorios no hay `DONE`. *Fail-closed*: si la evidencia no se evaluó, no se cierra |
| `reviewer_neq_owner` | `true` — no hay auto-aprobación |
| `max_concurrent_agents` | 10 base · 14 hard cap |
| `max_spawn_depth` | 2 niveles bajo el coordinador |
| `max_spawns_total` | 20 por corrida |
| `max_help_chain_hops` | 2 — anti-deadlock |
| `max_messages_per_agent` | 150 — anti-spam |
| `msg_ttl_sec` | 900 |
| `lease_ttl_sec` | 1800 — con heartbeat; si el agente muere, expira |
| `heartbeat_sec` | 60 |
| `max_review_rejections` | 3 → escalación |
| `max_cards` · `max_agent_calls` | 20 · 40 por corrida |

---

## Los 3 coordinadores

Un solo coordinador es cuello de botella y punto único de falla.

| | COMANDANTE | ARQUITECTO | INTEGRADOR |
|---|---|---|---|
| **Dominio** | Scope, objetivo, prioridades | Decisiones técnicas cross-cutting | DAG, leases, gates, calidad |
| **Responde** | ¿esto está en el objetivo? | ¿qué patrón usamos? | ¿quién tiene T-07? ¿pasó el gate? |
| **Detecta** | Scope creep, requisitos no cubiertos | Drift arquitectónico, decisiones inconsistentes | Deadlock, starvation, gates rojos, doble-claim |
| **Nunca** | Diseñar ni revisar código | Escribir código | Escribir código |

**Arbitraje**: scope → Comandante. Patrón/contrato → Arquitecto. Flujo/lease/gate → Integrador. Si cruza dos dominios, el Arquitecto decide lo técnico con visto bueno del Comandante; si el Integrador detecta deadlock, reparte y avisa.

Las preguntas de un especialista al coordinador **van por el bus**, no interrumpen al humano. Al usuario solo llega lo que ningún coordinador puede resolver.

---

## Los 16 tools

Dieciséis, no treinta. Cada tool que se suma es ruido en el contexto de todos los agentes.

| Tool | Qué hace |
|---|---|
| `oficina_plan` | Guarda el plan de cards. El modelo propone; el motor valida y rutea owner/reviewer |
| `oficina_dispatch` | **Arma el equipo**: resuelve los roles, materializa los agentes con su briefing y los arranca en paralelo |
| `oficina_mesa` | **La mesa**: quién trabaja en qué, quién está libre, qué ayuda espera respuesta, qué cards no tienen owner |
| `oficina_board` | Estado: cards, owners, agentes libres, agentes sin heartbeat, presupuesto |
| `oficina_assign` | Toma trabajo — la próxima card, o claim proactivo de una puntual |
| `oficina_submit` | Entrega handoff + evidencia real → pasa a `REVIEW` |
| `oficina_review` | Registra el veredicto. El motor **rechaza** que el owner se auto-revise |
| `oficina_gate` | Corre los 6 gates. Exit codes reales, no opinión |
| `oficina_bus` | Bus: `send` · `receive` · `ack` · `help` |
| `oficina_spawn` | Pide desplegar un agente. El Integrador aprueba o rechaza |
| `oficina_escalate` | Escala al usuario con 2-3 opciones concretas y recomendación |
| `oficina_ficha` | Resuelve un rol a ficha y **despliega** el agente con su briefing |
| `oficina_brief` | Muestra el briefing y el **panel de roles** sin desplegar: decisión del Comandante |
| `oficina_evidence` | El grafo de requisitos a evidencia: qué falta para poder cerrar |
| `oficina_cost` | Tokens y USD por card, agente y fase, con los presupuestos |
| `oficina_stop` | Freno de emergencia: detiene o reanuda la corrida |

---

## Los 7 agentes

| Agente | Rol | Aprueba? |
|---|---|---|
| `oficina-commander` | Scope, objetivo, prioridades | No revisa técnico |
| `oficina-architect` | Decisiones técnicas cross-cutting | No revisa técnico |
| `oficina-integrator` | DAG, leases, gates, presupuesto | No revisa técnico |
| `oficina-critico` | Revisión con confianza calibrada (umbral 80) | Sí |
| `oficina-guardian` | Secretos, inyecciones, deps, auth | Sí |
| `oficina-verificador` | Ejecuta build/typecheck/lint/test | Sí |
| `oficina-director` | Dirección de la oficina v1 (fallback) | No |

---

## Instalación

### Desde npm

```bash
npm install -g oficina-opencode
oficina install --target ~/.config/opencode
```

`oficina install` copia la skill, los 7 agentes, el comando `/oficina` y el
**entry point del plugin**.

> **El entry point no es un import pelado.** El loader de plugins de OpenCode
> v2 no resuelve bare specifiers desde `~/.config/opencode/plugins/`, así que
> un `export { default } from "oficina-opencode"` falla. El entry que instala
> el comando **busca el paquete en runtime** —en la config, en la cache de
> npm de OpenCode, o subiendo desde el propio archivo— y lo importa por ruta
> absoluta. Por eso reinstalar el paquete en otro lugar no rompe nada.

### Local (desarrollo)

```bash
git clone https://github.com/SOCRAMbt/AI-OFFICE.git
cd AI-OFFICE
npm install
npm run build

cd ~/.config/opencode
npm install file:/ruta/a/AI-OFFICE
node /ruta/a/AI-OFFICE/dist/cli.js install --target ~/.config/opencode
```

### Compatibilidad con la API de plugins

**OpenCode v1 y v2 tienen APIs de plugins incompatibles.** No es que cambiara
una firma: cambió la forma (v1 exporta una función con hooks; v2 exige
`export default { id, setup(ctx) }`).

El motor no depende de ninguna de las dos: define las tools en una forma
neutra y cada entry la traduce.

| Entry | Versión de OpenCode |
|---|---|
| `oficina-opencode` | **v2** — la principal |
| `oficina-opencode/v1` | v1 (legacy) |

Detalle completo en [`docs/COMPATIBILITY.md`](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/COMPATIBILITY.md).

### Configuración

`~/.config/opencode/opencode.json`:

```json
{
  "experimental": {
    "subagent_depth": 3
  }
}
```

`subagent_depth: 3` es **obligatorio**: con el default (`1`) los subagentes no pueden delegar a otros subagentes, y la malla no arranca.

### Los assets del protocolo

```bash
oficina install --target ~/.config/opencode
```

Instala la skill, los 7 agentes, el comando y el entry point del plugin.

---

## Uso

Desde la raíz del proyecto:

```text
/oficina Agregar autenticación JWT con refresh rotation
```

El comando carga la skill `oficina`, el plugin registra las tools, y la corrida arranca sola.

El ciclo:

```
OBJETIVO → PLAN (Comandante)
              ↓
         STANDUP — la card con deps satisfechas
              ↓
         TRABAJO (owner) → handoff.md + evidence.md
              ↓
         AUTO-REVIEW (oficina-critico, ≠ owner)
              ↓
         GATES (oficina-verificador + oficina-guardian)
              ↓
        ┌────────┴────────┐
      DONE            REWORK → REPLAN → ESCALADA
```

---

## CLI — operación

```bash
oficina init [objetivo]                    # Crea .oficina/ en el proyecto
oficina status                             # Cards, agentes, presupuesto, escalaciones
oficina board                              # Tablero Kanban
oficina bus                                # Estadísticas del bus
oficina audit T-03                         # Artefactos, gates y review de una card
oficina verify                             # Corre los gates de las cards en review
oficina install --target <dir>             # Instala skill, agentes y comando
oficina catalog --agency-root <path>       # Lista el catálogo de roles disponible
oficina reset --force                      # Abandona la corrida
```

---

## Estructura de la corrida

```
<proyecto>/.oficina/
├── board.md          # Kanban legible por humanos
├── state.json        # estado legible por máquinas — retoma tras reinicio
├── context.md        # ledger de conocimiento acumulado
├── roster.json       # quién existe, qué puede, qué está haciendo
├── config.json
├── bus/
│   ├── coord-command/0001-m-xxxxxxxx.json
│   ├── coord-arch/
│   ├── coord-flow/
│   └── peer/
├── inbox/<agentId>/  # acks
├── leases/<taskId>.json
├── fichas/<agentId>/ # los 4 artefactos del briefing + briefing.md
└── artifacts/<cardId>/
    ├── handoff.md    # qué hizo el owner
    ├── evidence.md   # salida real de los comandos
    ├── review.md     # veredicto del crítico
    ├── gates.md      # PASS/FAIL técnico y seguridad
    └── decision.md   # decisión del director
```

El formato de artefactos es compatible con OFICINA v1 (la skill). El plugin **migra el estado v1 automáticamente**: objetivo, cards y resultados se conservan.

---

## Código

33 archivos TypeScript · 19 módulos en `core/` · 1 toolset · 7 hooks.

```
src/
├── v2.ts                # entry del plugin para OpenCode v2 (tools + hooks)
├── v1.ts                # entry legacy para OpenCode 1.x
├── pluginEntry.ts       # entry que se copia a ~/.config/opencode/plugins/
├── cli.ts               # CLI de operación
├── core/
│   ├── types.ts          # el schema único del sistema
│   ├── state.ts          # máquina de estados + invariantes + migración v1
│   ├── bus.ts            # bus append-only con TTL/ack/idempotencia
│   ├── roster.ts         # quién existe + pool idle
│   ├── leases.ts         # leases con TTL y heartbeat
│   ├── catalog.ts        # escaneo de agency-agents + matching + panel
│   ├── factory.ts        # generación de roles con briefing de 10 secciones
│   ├── briefing.ts       # el contrato de información del agente
│   ├── router.ts         # enrutado + rotación anti-monotonía
│   ├── gates.ts          # runner de los 7 gates + escaneo de secretos
│   ├── sandbox.ts        # resolucion real de rutas + scope + sensibles
│   ├── atomic.ts         # primitivas atomicas: O_EXCL, locks, seq
│   ├── evidence.ts       # grafo requisito -> evidencia
│   ├── cost.ts           # ledger de tokens y USD
│   ├── recovery.ts       # reconciliacion estado vs artefactos
│   ├── tripwire.ts       # deteccion de escrituras coladas
│   ├── stores.ts         # persistencia de evidencia y costo
│   ├── docsync.ts        # fuente unica de verdad de las cifras
│   ├── retry.ts          # política de 3 golpes
│   ├── office.ts         # la fachada que amarra todo
│   ├── paths.ts          # resolución de project root
│   ├── fsx.ts            # IO atómico
│   ├── ids.ts            # ids seguros para usar como nombre de archivo
│   └── log.ts            # logging estructurado
├── tools/index.ts        # las 16 tools
└── hooks/
    ├── sessionIdle.ts    # auto-continuación
    ├── scopeGuard.ts     # enforcement de scope
    ├── systemTransform.ts
    └── compacting.ts
```

### Dependencias

**Dos, y ninguna es del host:**

| Paquete | Para qué |
|---|---|
| `@opencode/plugin` | Los tipos y el helper del API de plugins **v2**. Es la dependencia real. |
| `zod` | Los schemas de los argumentos de las tools. Versión pineada para que los tipos no divergan. |

`@opencode-ai/plugin` (v1) es un **peer opcional**: solo lo necesita el entry
`oficina-opencode/v1`, para los hosts que todavía corren la API vieja.

El motor (`core/`, `tools/`) no importa ninguno de los dos: define las tools
en una forma neutra y cada entry las traduce. Por eso el mismo motor corre
en v1 y en v2.

---

## Testing

```bash
npm test           # 385 tests, 21 archivos
npm run coverage   # cobertura por línea
npm run docs:check # la documentación coincide con el código
npm run bench:selection  # el matcher le gana a las alternativas simples
npm run typecheck  # tsc --noEmit, strict
npm run build      # tsc → dist/
```

| Suite | Cubre |
|---|---|
| `bus.test.ts` | Append-only, ack, TTL, idempotencia, broadcast, prioridad, atomicidad |
| `state.test.ts` | Transiciones, invariantes duros, selección de card, ciclo de corrida |
| `gates.test.ts` | Detección de tooling, las 7 fases, N/A con motivo, consolidación, redacción |
| `router.test.ts` | Enrutado, rotación, reviewer ≠ owner, política de 3 golpes, presupuesto |
| `leases.test.ts` | Adquisición, heartbeat, expiración, double-claim, reasignación |
| `catalog.test.ts` | Frontmatter, secciones, extracción, matching ponderado, panel, factory |
| `catalogReal.test.ts` | El catálogo real de agency-agents: estructuras, matching, división |
| `briefing.test.ts` | Orden, mínimo, las 10 secciones, los 4 artefactos, INCOMPLETO |
| `office.test.ts` | Ciclo completo end-to-end, invariantes, artefactos en disco |
| `scopeGuard.test.ts` | Globs, extracción de path, enforcement de scope |
| `sandbox.test.ts` | **Adversarial**: symlinks, traversal, absolutos, sensibles, shell |
| `concurrency.test.ts` | Doble claim simultáneo, seq único, idempotencia atómica |
| `recovery.test.ts` | Entregas perdidas, invariantes vulnerados, huérfanos, reinicio |
| `evidence.test.ts` | El grafo requisito → evidencia y los 4 niveles |
| `cost.test.ts` | Ledger, presupuestos por fase, trabajo redundante |
| `tripwire.test.ts` | Detección de escrituras coladas por shell |
| `docsync.test.ts` | La documentación coincide con el código |
| `plugin.test.ts` | El plugin contra un host mockeado: tools, hooks, auto-resume |
| `migration.test.ts` | Migración v1 → v2 sin pérdida de datos |
| `cli.test.ts` | init, status, board, install, audit, reset, idempotencia |

---

## Licencia

MIT — ver [LICENSE](https://github.com/SOCRAMbt/AI-OFFICE/tree/main/LICENSE).

El diseño se apoya en los patrones de `durable-execution` y `workflow-engine-design`: estado durable antes de los efectos, leases con TTL, transiciones nombradas explícitamente y at-least-once con reconciliación por idempotency key.

Lo que **no** se promete está escrito en [`docs/GARANTIAS.md`](https://github.com/SOCRAMbt/AI-OFFICE/blob/main/docs/GARANTIAS.md): un plugin de aplicación no es un sandbox, y un README que vende más de lo que el código hace es peor que uno modesto.
