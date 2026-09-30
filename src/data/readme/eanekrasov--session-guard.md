# opencode-session-guard

Плагин конечного автомата для [OpenCode](https://opencode.ai/) — управляет жизненным циклом
workflow-сессий: стадии, переходы, консент (одобрение), мутации, gates, инварианты и верификация.

## Документация

Три входа, по тому, что вы собираетесь делать.

### Работаю под управлением плагина

[Как это устроено](docs/architecture-overview.md) — что происходит с сессией,
кто и почему вас останавливает, где смотреть состояние. Короткая версия для
первого запуска — [руководство пользователя](docs/user-guide.md).

### Пишу свой профиль

[Как написать свой профиль](docs/profile-authoring.md) — полное руководство:
структура профиля, схема целиком (стадии, переходы, `actions:`, циклы, guard-ы,
области записи), наследование, готовые примеры и способ проверки.

### Правлю сам плагин

[Устройство кода](docs/plugin-architecture.md) — слои, направление
зависимостей, путь одного вызова инструмента, чем что проверяется.

### Отдельные разделы

- [установка и запуск](docs/usage.md);
- [настройка](docs/configuration.md);
- [справочник workflow schema](docs/schema-reference.md) — сжатая выжимка по
  полям, когда полное руководство уже прочитано;
- [примеры schema](docs/schema-examples.md);
- [guide по написанию schema](docs/schema-writing-guide.md);
- [статус возможностей](docs/feature-status.md);
- [диагностика](docs/troubleshooting.md);
- [FAQ](docs/faq.md).

Ниже README содержит технические подробности для случаев, когда они нужны при
диагностике или сопровождении установки.

Плагин регистрирует хуки SDK OpenCode, перехватывая вызовы инструментов (`Bash`, `Write`,
`Question`, `Task`) и управляя состоянием сессии на основе декларативных профилей и схем.

---

## Архитектура

### Трёхслойная модель

Проект сейчас состоит из плагинного входа, прикладного runtime и доменно-инфраструктурных модулей. Отдельно от runtime подключаются TUI, dashboard и rule-delivery подсистема.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Plugin entry                                                         │
│ src/index.ts                                                         │
│  ├─ SessionGuardPluginV1 (@opencode-ai/plugin, серверные hooks V1) │
│  └─ SessionGuardPluginV2 (@opencode/plugin, setup/cleanup hooks)     │
│                                                                      │
│ Runtime / application                                                │
│ src/app/runtime.ts                                                   │
│  ├─ config: sm-status, sm-list, sm-session, sm-profile               │
│  ├─ tools: workflow-*                                                │
│  ├─ chat.message                                                      │
│  ├─ tool.execute.before / after                                      │
│  ├─ event                                                             │
│  ├─ experimental.chat.system.transform                               │
│  ├─ experimental.session.compacting                                  │
│  ├─ experimental.chat.messages.transform                             │
│  └─ dispose                                                           │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Application services                                                  │
│ SessionExecutor + SessionQueue + WorkflowStore                       │
│ MutationOrchestrator + ConsentOrchestrator + TaskApi                  │
│ guardrails + invariants + change-scope + profile-agent sync           │
│ OpenCodeRulesRuntime                                                  │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Domain / schema / infrastructure                                      │
│ domain/*  schema/*  session/*  rules/*  dashboard/*                   │
│ workflow schemas: profiles/*/*.yaml                                  │
└──────────────────────────────────────────────────────────────────────┘
```

`SessionExecutor` — текущая точка транзакционного доступа к сессии: разрешает
корневую сессию, выполняет действие под файловой блокировкой и сохраняет новую
ревизию. `SessionQueue` сериализует in-process вызовы по root session ID, а
`WorkflowStore` отвечает за чтение, Zod-валидацию, атомарную запись и архив.

### Схема потоков данных

До вызова инструмента runtime последовательно применяет guardrails, consent,
допуск действий стадии и, для мутаций, lifecycle операции. После вызова он
санитизирует результат, обрабатывает `<workflow-result>`, проверяет изменения и
инварианты, закрывает операцию и пытается применить переходы. Отдельный
`tool.execute.after` повторно не является «главным» источником перехода: итоговая
сессия сохраняется через executor, после чего transition engine работает над
актуальным состоянием.

```
OpenCode hook
  │
  ├─ chat.message → user-input guardrails + baseline для активной сессии
  ├─ tool.execute.before
  │   ├─ guardrails
  │   ├─ workflow-consent для Question
  │   ├─ workflow-task correlation/admission для Task
  │   ├─ stage action admission
  │   ├─ delivery permit для команды, помеченной delivers: true
  │   └─ mutation begin для Bash/Write
  │
  ├─ tool executes
  │
  └─ tool.execute.after
      ├─ sanitizeToolOutput
      ├─ workflow-result и проверка stale/replayed/missing результата
      ├─ file validation и change-scope
      ├─ consent answer и проверка evidence на момент решения
      ├─ mutation finish: checks, invariants, transitions
      └─ commit receipt или отказ в delivery receipt
```

### Роли слоёв

| Слой                        | Текущие компоненты                                                                                                      | Ответственность                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Слой плагина**            | `src/index.ts`, `src/app/runtime.ts`                                                                                    | Регистрация двух SDK-вариантов плагина, hooks, tools, cleanup                    |
| **Прикладной слой**         | `src/app/session-executor.ts`, `session-queue.ts`, `mutation-orchestrator.ts`, `consent-orchestrator.ts`, `task-api.ts` | Транзакции сессии, lifecycle операций, согласие, задачи и координация            |
| **Доменный слой**           | `src/domain/*`, `src/schema/*`, `src/session/*`                                                                         | Переходы, guards, approvals, evidence, task movement, схема и persistence-модель |
| **Правила / представление** | `src/rules/*`, `src/tui/*`, `src/dashboard/*`                                                                           | Доставка правил, TUI-панели, dashboard только для чтения и SSE/API               |

### Внешние сервисы (опционально)

Dashboard не загружается как часть plugin hooks: это отдельный Bun-процесс
`src/dashboard/dashboard-server.ts`, который читает тот же session store и
профили, что plugin и TUI. Task provider (`src/app/provider.ts`) — отдельная
абстракция CLI/Beads для интеграций; workflow runtime не требует внешнего
issue-tracker для базовой работы.

## Сессия (WorkflowSession)

Zod-валидируемый JSON, сохраняемый на диск. Сессия запускает ровно одну схему
профиля и хранит как состояние workflow, так и результаты проверок над ходами.

### Схема (src/session/session-schema.ts)

Ключевые поля текущего `WorkflowSessionSchema`:

```
WorkflowSession
├── sessionId, profileId, schemaId, schemaVersion, revision, title
├── gates: Gate[]                         # сессионные gate-вердикты
├── approvals: Approval[]                 # type/callId/status/evidence/files
├── refs: Record<string, string>           # документы по типу approval
├── tasks: Record<listKey, MutationTask[]>
├── loopRuns: Record<runId, LoopRun>       # stage, gates, checks, round
├── activeTaskContexts: ActiveTaskContext[]
├── activeOperations: Record<callId, ActiveOperation>
├── verdictProvenance: Record<callId, { runId, round }>  # происхождение вердикта (свежесть)
├── pendingDecisions: PendingDecision[]
├── retryBudgets: Record<string, RetryBudget>
├── deliveryPermit: DeliveryPermit | null
├── deliveryReceipt: string | null
├── verifications: Verification[]
├── changedFiles: string[]
├── currentStage: string
├── checks: GateStatus | undefined          # verdict ядра вне loop
├── outcome: WorkflowOutcome | undefined
├── invariantViolations: ValidationRecord[]
├── consentedCallIDs: string[]
├── processedResultCallIDs: string[]
└── updatedAt: string
```

`schemaVersion` по умолчанию равен `1`. Статусы gate — `pending`, `running`,
`passed`, `failed`, `skipped`; статусы task — `pending`, `running`, `completed`,
`failed`, `cancelled`. Операции различают `kind: mutation | task`, а task имеет
дополнительные `readScope`, `writeScope`, `editingAgents`, `round` и baseline.

### Гейты

Сессия не содержит заранее созданного списка gate IDs. Gate появляется в
`session.gates`, когда на него записан вердикт; объявление допустимых gate IDs
находится в `gates:` workflow-схемы и проверяется компилятором. Внутри loop
гейты принадлежат `LoopRun.gates`, потому что параллельные задачи не должны
закрывать gate друг за друга. Вердикт ядра (`session.checks` или `run.checks`)
отдельно от gate и показывает результат проверки хода, включая инструмент,
scope, diff и invariants.

### SessionStore — файловое I/O (src/session/session-store.ts)

- Файл активной сессии: `{storeDir}/{encodeURIComponent(sessionId)}.json`.
- `save()` использует атомарную запись и per-session lock; неизвестные поля
  отбрасываются схемой (`.strip()`), а не сохраняются через `.passthrough()`.
- `load()` читает и валидирует одну активную сессию; `list()` перечисляет только
  файлы активного store.
- Завершённые workflow переносятся в `{storeDir}/archive/`; для них есть
  `loadArchived()` и отдельные helpers чтения файлов.
- Текущая общая граница чтения для TUI и dashboard —
  `src/session/session-files.ts` (`readSession`, `readAllSessions`, archive helpers).

**parentCache и транзакции.** `SessionQueue` разрешает child session к root,
а `SessionExecutor` повторно загружает состояние под lock и делает один
согласованный save. Это важно для nested task cycles и конкурентных hooks.

## Фазы и Transition Engine

### Декларативные переходы (profiles/base/base.yaml)

```yaml
transitions:
  - from: planning
    to: tasks_ready
    guard: 'session.refs.plan != null'
    consent: plan

  - from: tasks_ready
    to: execution
    guard: 'hasPendingTasks()'

  - from: execution
    to: validation
    guard: "allTasksCompleted('implementation')"

  - from: validation
    to: commit
    guard: "session.gates.review == 'passed' && session.gates.qa == 'passed'"

  - from: validation
    to: execution
    guard: "(session.gates.review == 'failed' || session.gates.qa == 'failed') && !isExhausted('cycles')"
    effects:
      - bumpRetry: cycles
        maxAttempts: 5

  - from: validation
    to: failed
    guard: "(session.gates.review == 'failed' || session.gates.qa == 'failed') && isExhausted('cycles')"

  - from: commit
    to: done
    guard: 'session.deliveryReceipt != null'
```

**Типы переходов (TransitionDef в schema/types.ts):**

```typescript
interface TransitionDef {
  from: string; // Текущая фаза
  to: string; // Целевая фаза
  guard?: string | null; // JS-выражение (опционально)
  effects?: TransitionEffect[]; // Побочные эффекты
  consent?: string | ConsentOnTransition; // Требует одобрения
  onFailure?: 'retry' | 'terminal'; // Поведение при ошибке перехода
}

interface TransitionEffect {
  bumpRetry?: string; // Ключ retry budget для инкремента
  maxAttempts?: number; // Лимит попыток
  approve?: string; // Тип approval при переходе
}
```

### SessionGuardEngine (src/domain/engine.ts)

**checkTransition(from, to, transitions, session?, evaluateGuard?): TransitionCheck**

```typescript
interface TransitionCheck {
  allowed: boolean; // Разрешён ли переход
  reason?: string; // Причина запрета
  to?: string; // Целевая фаза (из найденного перехода)
  guard?: string | null; // Guard-выражение (для отладки)
}
```

Логика:

1. Найти `TransitionDef`, где `from` и `to` совпадают
2. Если есть guard — вычислить через `GuardEvaluator`
3. Если guard вернул false — `{ allowed: false, reason: "..." }`

**admitAction(entries, request, evaluateGuard): { allowed, reason }**

Допуск действия на стадии — `src/domain/action-admission.ts`. Стадия объявляет
`actions:`, и это исчерпывающий список: не совпало ничего — нельзя.

```yaml
code:
  actions:
    - action: edit
      paths: ['**']
      guard: "session.approved('plan')"
    - action: bash
      commands: ['git status', 'git diff.*']
      guard: "session.approved('plan')"
```

Записи читаются по порядку; побеждает первая, у которой совпал дискриминатор
(`paths` для `edit`, `commands` для `bash`) и истинен guard. `delivers: true`
на записи `bash` помечает доставку коммита.

Доступ к действиям задаётся записями `actions` на каждой стадии. Это позволяет
разрешать разные действия на разных стадиях, например допускать чтение на
`planning` и правки только на `code`.

**tryApplyTransitions(session): TransitionCheck & { applied?: boolean }**

Сканирует ВСЕ переходы из `session.currentStage`, для каждого:

1. Если есть `consent` — проверяет `session.approved(consentType)`; если не approved — skip
2. Если guard проходит — применяет переход:
   - `session.currentStage = transition.to`
   - Выполняет effects (bumpRetry, approve)
3. Если ни один не подошёл — `{ applied: false }`

Этот метод вызывается **после каждого инструмента** (через `transitionAfter`)
и **после approve плана** (в `ConsentOrchestrator`).

### GuardEvaluator (src/schema/guard-evaluator.ts)

**Ограниченный AST-evaluator для guard-выражений:**

- выражение сначала разбирается в AST и вычисляется поддерживаемым evaluator-ом;
- произвольный JavaScript, доступ к глобальному скоупу, `require` и `import` не исполняются;
- ошибки разбора и вычисления, а также превышение лимита шагов дают `false`.

Синтаксис и полный список ограничений находятся в
[`docs/schema-reference.md`](docs/schema-reference.md). Не используйте этот раздел как
описание реализации, если поведение исходного кода и README расходятся: источником истины
являются evaluator и его тесты.

**Доступные функции в guard-выражениях:**

| Функция             | Описание                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `approved(type)`    | `session.approvals.some(a => a.type === type && a.status === 'granted')` |
| `isExhausted(key)`  | `retryBudgets[key].attempts >= retryBudgets[key].maximum`                |
| `hasPendingTasks()` | `tasks.some(t => t.status === 'pending' \|\| t.status === 'running')`    |
| `session.*`         | Поля SessionFacts (profileId, revision, refs, gates, ...)                |

**SessionFacts (src/domain/session-facts.ts)** — проекция сессии для guard-выражений:

```typescript
interface SessionFacts {
  lastApproval: { type; callId; status; grantedAt?; evidence?; feedback? } | null;
  approvals: { type; status }[];
  tasks: { id; status }[];
  activeOperation: { id; startedAt; status; result? } | null;
  verifications: Verification[];
  gates: Record<string, GateStatus>;
  profileId: string;
  revision: number;
  deliveryReceipt: string | null;
  refs: Record<string, string>;
  retryBudgets: Record<string, RetryBudget>;
  verified(stage, status): boolean;
  isExhausted(budgetKey): boolean;
  approved(type): boolean;
}
```

## События сессии и границы сохранения

Отдельного `src/session/session-events.ts` в текущем проекте нет. Событийная
граница persistence находится в `WorkflowStore` и в API чтения файлов сессий;
dashboard подписывается на собственный watcher/polling слой. Не импортируйте
`onSessionSaved`: такого callback нет в текущем runtime.

Для чтения состояния используйте экспортируемые helpers из
`src/session/session-files.ts`; для изменения — `WorkflowStore` через
`SessionExecutor`/`SessionQueue`, а не прямую запись JSON.

## Утилиты сессии (src/session/helpers.ts)

Утилиты для работы с сессией — gate management, retry budgets, validation records:

```typescript
// Gate
function getGate(session, gateId: string): Gate | undefined;
function setGateStatus(session, gateId, status: GateStatus, options?: SetGateStatusOptions): void;
// status = passed/failed → gate.resolvedAt = now
// status = failed + options.bumpRetry → bumpRetry(session, key)

// Retry budget
function bumpRetry(session, budgetKey: string): void; // attempts++
function isExhausted(session, budgetKey: string): boolean; // attempts >= maximum
function resetRetry(session, budgetKey: string): void; // сброс attempts → 0

// Validation records
function setInvariantViolations(session, violations): void; // присваивание evidenceId
```

## SessionQueue (src/app/session-queue.ts)

`SessionQueue` сейчас отвечает только за serialization по root session ID. Он
не загружает и не сохраняет сессию: полный lifecycle (`resolve root → queue →
load → snapshot → action → conditional save → deferred effects`) принадлежит
`SessionExecutor`.

```typescript
class SessionQueue {
  enqueue<T>(sessionID: string, action: () => Promise<T>): Promise<T>;
  rootOf(sessionID: string): Promise<string>;
  clear(): void;
}
```

Root разрешается обходом host parent chain и кешируется по каждому пройденному
узлу. Вызов, вложенный в уже активную транзакцию того же root, исполняется
reentrant inline через `AsyncLocalStorage`; независимый concurrent вызов ждёт в
очереди. Ошибка одного действия не блокирует следующие, но исходный caller
получает rejection.

### withSession (src/app/session-queue.ts)

Production helper `withSession` в текущем модуле отсутствует. Похожий helper
есть только в `test/helpers.ts` и используется тестовыми fixtures; код runtime
для persistence должен использовать `SessionExecutor`.

## Типы runtime (src/app/runtime-types.ts)

Изолированные типы для SDK-зависимостей, чтобы тесты могли замокать `OpenCodeSessionClient`:

```typescript
interface OpenCodeSessionClient {
  messages(options: {
    path: { id: string };
    query?: { limit?: number; offset?: number };
  }): Promise<{ data: Array<{ id: string; parts: Array<{ type: string; status?: string }> }> }>;

  prompt(options: {
    path: { id: string };
    body: {
      content: string;
      parts: Array<{ type: string; noReply?: boolean; title?: string; text?: string }>;
    };
  }): Promise<{ data: unknown; error?: { message: string } }>;

  list(options?: {
    query?: { limit?: number };
  }): Promise<{ data: Array<{ id: string; title?: string }> }>;
}
```

## Поток данных (жизненный цикл tool.execute)

### BEFORE — handleToolBefore

```
Порядок вызова:

1. Guardrails (guardrailBefore)
   ├── validateUserInput(args)
   │   └── PROMPT_INJECTION     (block)  — переопределение инструкций
   │   └── ROLE_OVERRIDE       (block)  — смена роли агента
   │   └── SYSTEM_EXTRACTION   (block)  — извлечение системного промпта
   │   └── CODE_INJECTION      (warn)   — eval, exec, rm -rf
   │   └── CONTEXT_CONFUSION   (warn)   — очистка контекста, спам
   │   └── INDIRECT_INJECTION  (warn)   — подставные системные сообщения
   │   └── DATA_EXFILTRATION   (warn)   — чтение ~/.ssh, env, git push --force
   │
   └── Если blocked → output.args.blocked = true

2. Consent (consentBefore)
   └── Tool != Question → skip
   └── Парсинг consent-request XML-тега в questionText
   └── ConsentOrchestrator.before():
       ├── parseConsentRequest() — шаблонный тег в question
       ├── evidenceOf(manifest) — сверка evidence
       ├── client.messages() — проверка контекста вопроса
       ├── readPlanFile() — чтение плана с диска
       ├── calculatePlanEvidence() — SHA-256 канонизированного плана
       ├── Queue.enqueue():
       │   ├── session.consentedCallIDs dedup
       │   ├── session.approvals += { type: <имя согласия>, callId, status: 'pending' }
       │   ├── session.refs[<имя>] = путь документа
       │   └── HARNESS_AUTO_APPROVE → одобряет то согласие, которое спросили
       └── finishMutation() — после auto-approve проверяет переход

3. Task start (handleTaskBefore)
   └── Tool != task или нет subagent_type/agent/type → skip
   └── Ход этого callID уже коррелирован → отказ
   └── session.activeOperations[callID] = { runId?, taskId?, agent, status }
   └── session.verdictProvenance[callID] = { runId, round } — происхождение вердикта

3c. Stage actions (actionsBefore)
   └── Действующая стадия — вложенная при открытом прогоне, иначе внешняя
       ├── actions не объявлены → дефолт ядра: прямой git commit/push запрещён
       └── объявлены → admitAction(); список исчерпывающий

4. Commit Permit (commitBefore)
   └── Tool == Bash:
       └── isCommitDelivery() → выдача deliveryPermit
           ├── команды берутся из записи `delivers: true` действующей стадии;
           │   стадия молчит → зашитый isCommitTaskCommand как запасной вариант
           ├── getPreCommitHead() → git rev-parse HEAD
           └── session.deliveryPermit = { callID, preCommitHead, expectedFiles }
           (разрешён ли коммит вообще — это guard той же записи; в base это
            все задачи завершены И оба вердикта собраны)

5. Mutation guard (mutationBefore)
   └── Tool == Bash | Write:
       └── MutationOrchestrator.beginMutation():
           ├── resolveEngine(profileId) — lazy init + кеш
           ├── Queue.enqueue():
           │   ├── releaseInterruptedLock() — освобождение зависших мутаций
           │   ├── beginMutation() domain:
           │   │   ├── Проверка чужого хода (mutex, TTL 30мин)
           │   │   ├── resolveMutationRun() → run | ambiguous | none
           │   │   ├── session.activeOperations[callID] = новый
           │   │   └── session.verifications = []
           │   └── liveMutations.set(callID, { rootSessionId, stageBefore })
```

### AFTER — handleToolAfter

```
Порядок вызова:

1. Guardrails (guardrailAfter)
   └── sanitizeToolOutput() — замена block-паттернов на [BLOCKED:RULE]

2. Workflow result (handleWorkflowResult)
   └── parseWorkflowResult(output):
   │   └── Ищет последний <workflow-result>{JSON}</workflow-result>
   │   └── Поле `gate` называет ГЕЙТ, а не стадию; допускается только действительный результат
   └── Свежесть — по provenance вердикта (fallback: операция). Раунд сменился или прогон закрыт
   │   └── [workflow-result-stale], не записывается ничего
   └── Адресат — по ОБЪЯВЛЕНИЮ гейта, а не по активной операции:
   │   └── гейт объявлен вложенной стадией живого прогона → run.gates[gate] + движение задачи
   │   └── гейт объявлен текущей внешней стадией → session.stageGateResults (setGateStatus)
   │   └── гейт не объявлен ни одной стадией в области видимости → [workflow-result-rejected]
   └── Проверки допуска: mayVerify() по ростеру владеющей стадии, свежесть, replay-guard
   └── session.verifications.push({ gate, status, recordedAt })
   └── releaseVerdict() — снять activeOperations[callID] и verdictProvenance[callID]

3. File tool invariants (handleFileToolAfter)
   └── Tool ∈ {edit, write, apply_patch}
   └── Извлечение filePath из args
   └── Проверка: файл внутри проекта, расширение ∈ {.kt, .ts, .json, .md}
   └── validateFilesForProfile() → результат аппендится в output.output

4. Commit verify (handleCommitTaskAfter) — для Bash
   └── deliveryPermit?.callID == callID
   └── git rev-parse HEAD != deliveryPermit.preCommitHead → commit сделан
   └── git diff-tree --name-only — сравнение committed с expectedFiles
   └── session.deliveryReceipt = currentHead
   └── session.deliveryPermit = null

5. Consent answer (handleQuestionAfter)
   └── Tool == Question
   └── parseConsentRequest(questionText) — ищем <consent-request> тег
   └── незакрытая запись одобрения с этим callId
   └── Извлечение ответов из metadata.answers + extractLabels()
   └── classifyConsentAnswer() → grant | decline
   └── verifyPlanEvidenceAtDecision() — сверка SHA-256 плана на диске
   └── grant: session.approvals.push({ type:'plan', status:'granted' })
   └── decline: approval.denied + session.revision++
   └── applyTransitions() — после approve пытается сменить фазу

6. Mutation finish (mutationAfter) — для Bash | Write
   └── MutationOrchestrator.finishMutation():
       ├── liveMutations.delete(callID)
       ├── Queue.enqueue():
       │   ├── processScopeAndInvariants():
       │   │   ├── computeChangeScope() — git status --porcelain + SHA-256 diff
       │   │   ├── session.changedFiles = sorted
       │   │   ├── validateFiles() — прогон инвариантов профиля
       │   │   └── finalPassed = !metadataFailed && !scopeError && нет errors
       │   ├── finishMutation() domain:
       │   │   ├── delete session.activeOperations[callID]
       │   │   └── run.checks = passed | failed  (вне цикла — session.checks)
       │   ├── tryApplyTransitions() — авто-переход после мутации
       │   └── Post-factum transition validation:
       │       └── Была ли смена фазы? Валидна ли она?

7. Transition (transitionAfter)
   └── tryApplyTransitions(session) — всегда, после любого инструмента
```

### Внедрение контекста в системный промпт (handleSystemTransform)

Перед каждым запросом к модели внедряет контекст сессии:

```
[workflow session: sess-abc123]
[workflow profile: android]
[workflow stage: code]
[workflow gates: invariants=passed]
[workflow approvals: plan]
[workflow mutation: call-xyz…]
[workflow tasks: 5 total, revision 3]
```

### Компактизация сессии (handleSessionCompacting)

При компактизации контекста сессии сохраняет критическое состояние:

```
Workflow session sess-abc123 (profile: android, revision: 3)
Tasks: 2/5 completed
Last completed task: task-002
Active task: task-003
Gates: invariants: passed, review: running, qa: pending
Approvals granted: plan
```

## Система согласования планов

Используется один формат согласования — XML-тег.

### XML-тег (src/app/consent.ts)

Агент вызывает `workflow-consent` tool, возвращающий XML-тег для встраивания в вопрос:

```xml
<consent-request
  schema="harness.consent/v1"
  revision="3"
  evidence="sha256:abc123..."
  grant="continue"
  decline="stop">
  {"schema":"harness.consent.evidence/v1","revision":3,"summary":"Add login page","files":[".opencode/plan/story-42/plan.md"]}
</consent-request>
```

**Имя согласия.** У манифеста есть необязательное поле `type` — то же имя,
которое схема пишет в `consent:` на переходе (`plan`, `deploy`, что угодно).
Отсутствует — значит `plan`. Имя входит в подпись манифеста, поэтому «согласие
на деплой» и «согласие на план» над одними файлами не дают одинаковую evidence,
и записывается оно в трёх местах: одобрение сессии, `session.refs.<имя>` и
ответ оператора. Если `type` не указан, используется имя `plan`; любое другое
имя берётся из `consent` перехода.

**Проверка evidence (verifyPlanEvidenceAtDecision):**

1. `canonicalizePlan(content)`: удаление BOM → \r\n → \n → обрезка трейлинговых пробелов → удаление трейлинг-новлайн
2. `calculateDocumentSetEvidence(documents)` — по всем файлам манифеста, а не только по первому
3. Сравнение с evidence незакрытой записи одобрения (`session.approvals`), найденной по `callId`

**Классификация ответа (classifyConsentAnswer):**

- Один ответ, начинающийся с `grant` → `{ kind: 'grant' }`
- Один ответ, начинающийся с `decline` → `{ kind: 'decline' }`
- Всё остальное → `{ kind: 'unrecognized' }`

### HARNESS_AUTO_APPROVE

При `HARNESS_AUTO_APPROVE=true` согласие одобряется автоматически, без показа
вопроса оператору — для прогонов без человека. Одобряется **то согласие,
которое спросили**, а не всегда план: иначе схема с двумя разными согласиями не
проезжает.

## Жизненный цикл мутации

### Ход вне цикла задач

Прогон задачи для хода не обязателен. Стадия без `loop:` — обычная стадия, на
которой тоже работают, и `beginMutation` там заводит операцию без привязки к
прогону: `runId` и `taskId` отсутствуют честно, а не выдумываются. Машинерия та
же — свой baseline-кадр, дифф, проверка `writeScope`, инварианты, — и вердикт
ложится на сессию как `session.checks`.

Неоднозначность при этом остаётся отказом. `resolveMutationRun` различает три
исхода: прогон найден, прогонов или задач-кандидатов несколько, прогона нет
вовсе. Второй — отказ: выбрать за автора, к какому из двух прогонов отнести
правку, значит проверить её чужой областью записи. Кандидаты берутся только из
списка цикла текущей стадии, иначе в схеме с двумя последовательными циклами
ход первого синтезировал бы прогон по задаче второго.

### Lock-механизм

Мутации (Bash/Write/Subtask) защищены через `activeOperations` mutex:

1. **beginMutation** — заводит активную операцию, сбрасывает verifications
2. **finishMutation** — снимает операцию и записывает вердикт о ходе

Если чужой ход уже открыт и не истёк (TTL 30 минут) — новый beginMutation
выбрасывает ошибку.

### P1-014: Освобождение зависших блокировок

`releaseInterruptedLock()` в MutationOrchestrator:

- Если ход есть НО не отслеживается в `liveMutations` → прерван
- Если ход истёк (старше MUTATION_TTL_MS = 30 мин) → освободить
- Если callID совпадает с входящим → retry, не трогать

### Обработка ошибок

`clearOnError(callId)` вызывается из `handleEvent` при получении
`message.part.updated + status === 'failed'`. Если callId не найден в `liveMutations`,
блокировка будет освобождена при следующем beginMutation через `releaseInterruptedLock`.

### Жизненный цикл мутации

```
[Agent] Bash/Write
  │
  ├── SessionGuardRuntime.handleToolBefore()
  │   └── mutationBefore()
  │       └── MutationOrchestrator.beginMutation()
  │           ├── Queue.enqueue()
  │           │   ├── releaseInterruptedLock() [P1-014]
  │           │   ├── resolveMutationRun() → run | ambiguous | none
  │           │   ├── session.activeOperations[callID] = { runId?, taskId?, agent, … }
  │           │   └── session.verifications = []
  │           └── liveMutations.set(callID, { rootSessionId, stageBefore })
  │
  ├── [Bash/Write executes]
  │
  └── SessionGuardRuntime.handleToolAfter()
      └── mutationAfter()
          └── MutationOrchestrator.finishMutation()
              ├── liveMutations.delete(callID)
              └── Queue.enqueue()
                  ├── processScopeAndInvariants():
                  │   ├── computeChangeScope() → git status --porcelain
                  │   ├── session.changedFiles = [...]
                  │   └── validateFiles() → invariant checks
                  ├── finishMutation(session, finalPassed):
                  │   ├── delete session.activeOperations[callID]
                  │   └── run.checks = passed|failed   (вне цикла — session.checks)
                  ├── tryApplyTransitions()
                  └── Post-factum validation → checkTransition()
```

## Профили

### Структура директории

```
<profilesDir>/
  base/                          ← базовый workflow
    profile.json                 ← metadata: id, schemas, agents, invariants
    base.yaml                    ← stages, loops, gates, transitions, guards
    invariants.ts                ← INVARIANTS
    agents/

  android/                       ← extends: base
    profile.json
    android.yaml                 ← delta над base/base.yaml
    invariants.ts                ← Android-specific проверки
    agents/

  harness/                       ← extends: base
    profile.json
    harness.yaml                  ← delta над base/base.yaml
    invariants.ts
    agents/
```

В репозитории эти файлы лежат в `profiles/`. После развёртывания в целевой
проект каталогом профилей по умолчанию является `<project>/.opencode/profiles`;
`SESSION_GUARD_PROFILES_DIR` задаёт явное переопределение.

### profile.json — метаданные профиля (src/schema/profile-metadata.ts)

```typescript
interface ProfileMetadata {
  id: string;
  description?: string;
  extends?: string; // ID родительского профиля (base, android, ...)
  schemas?: string[]; // Файлы YAML-схем профиля (base.yaml, android.yaml, ...)
  agentsDir?: string; // Директория агентов (по умолчанию: 'agents')
  skillsDir?: string; // Директория скиллов (по умолчанию: 'skills')
  agents?: string[]; // Список агентов для профиля
  skills?: string[]; // Список скиллов для профиля
  invariants?: string[]; // ID инвариантов для включения
}
```

### ProfileResolver (src/app/profile-resolver.ts)

**Цепочка extends:**

```
android → base → (конец)
harness → base → (конец)
```

1. `resolve(profileId)` — загрузка extends chain
2. `resolveProfileExtends(profileId)` — обход цепочки с детектом циклов
3. `resolveSchemas(chain, schemaFiles)` — для каждого schemaFile:
   - Загрузка через `SchemaLoader.loadSchemaFile()`
   - Если есть `extends` в схеме — merge через `mergeSchemas()`
4. `agents` накапливаются по цепочке child-first; `skills`, `invariants` и каталоги берутся с приоритетом дочернего профиля и fallback к ближайшему родителю

### ProfileResolver (src/app/profile-resolver.ts) — детали

**resolve(profileId: string): ResolvedProfile**

```typescript
interface ResolvedProfile {
  metadata: ResolvedMetadata; // id, agents[], skills[], invariants[], agentsDir, skillsDir
  schemas: ResolvedSchema[]; // смерженные YAML-схемы
}
```

Алгоритм:

1. `loadAll()` — сканирует `profilesDir/*/profile.json`, парсит через `ProfileMetadataSchema`
2. `resolveProfileExtends(id)` — обход цепочки `extends` с детектом циклов через `visited: Set<string>`
3. `agents` собираются из prompt-файлов всей extends-цепочки child-first; `skills` и `invariants` берутся с приоритетом дочерней записи и fallback к родителю
4. `resolveSchemas(chain, schemaFiles)` — для каждого уникального schema-файла из всей цепочки
5. `resolveSingleSchema(schemaFile, chain)` — загрузка файла + schema-level extends с merge

**listProfiles(): ProfileMetadata[]**

Плоский список profile.json без разрешения extends. Кешируется после первого вызова.

### SchemaLoader (src/schema/schema-loader.ts) — детали

**loadSchemaFile(profileId, schemaFilename): ProfileSchema | null**

Загрузка YAML-файла `profilesDir/{profileId}/{schemaFilename}`. Шаги:

1. `fs.access()` — проверка существования файла (null если нет — мягкая деградация)
2. `YAML.parse(await readFile(...))` — парсинг YAML
3. `ProfileSchemaSchema.parse(raw)` — Zod-валидация
4. Возвращает `ProfileSchema` или null

**mergeSchemas(base, extension): ResolvedSchema**

```typescript
// Текущая семантика объединения:
// - stages объединяются поэлементно, включая вложенные stages и transitions
// - transitions объединяются по группам from→to; дочерний профиль заменяет соответствующую группу
// - editingAgents, gates, taskControlAgents и stageAssignments используют приоритет дочернего профиля
// - отсутствующие поля удаляются из итогового результата
```

**loadSchemaFromPath(dir, filename)**

Аналогично `loadSchemaFile`, но принимает произвольную директорию — для тестов и утилит.

### Пример профиля android:

```json
{
  "id": "android",
  "extends": "base",
  "schemas": ["android.yaml"],
  "agents": ["code", "architect", "review", "qa", "debug", "figma", "rag", "ask", "orchestrator", "harness"],
  "skills": ["android-feature-implementation", "android-code-review", ...],
  "invariants": ["LF_ONLY", "KOTLIN_STACK", "NO_FQN", "NO_BANG_BANG", "NO_COMMENTED_CODE",
                 "NAMED_ARGS", "STRING_RES", "RAW_COLOR", "RAW_DP", "NO_BARE_DP", "USE_SPACER_FN"]
}
```

## Инварианты (проверка, зависящая от профиля)

### Контракт InvariantCheck (src/app/invariants.ts)

```typescript
interface InvariantCheck {
  id: string; // Уникальный ID (LF_ONLY, KOTLIN_STACK, ...)
  severity: 'error' | 'warning'; // error → gate failed, warning → log
  check: (content: string, filePath: string, absolutePath: string) => string | null;
  // null = OK, string = нарушение
  appliesTo?: (filePath: string) => boolean; // Фильтр файлов (проверка расширения)
}
```

### загрузка инвариантов (src/app/invariants.ts)

1. `getAllProfileInvariants(profileId, profilesDir)`:
   - Resolve профиля через `ProfileResolver` → `resolved.metadata.invariants` (список ID)
   - Dynamic `import(profilesDir/profileId/invariants.ts)` — `mod.INVARIANTS`
   - Fallback через `file://` протокол для совместимости Bun/Node
   - Фильтрация: только ID из metadata.invariants

2. `validateFiles(filePaths, invariants, rootDirectory)`:
   - Для каждого файла с расширением .kt, .ts, .json, .md:
   - Чтение содержимого
   - Для каждого InvariantCheck, где `appliesTo(file)`:
     - Вызов `check(content, filePath, absolutePath)`
     - Если вернула строку → `InvariantViolation`

3. `validateFilesForProfile(filePaths, profileId, profilesDir)`:
   Обёртка: `getAllProfileInvariants` + `validateFiles`

### Когда запускаются

1. **После edit/write/apply_patch** (handleFileToolAfter): проверка каждого написанного файла
2. **В конце мутации** (processScopeAndInvariants): проверка всех changedFiles

В обоих случаях результат аппендится в `output.output` как `[workflow-validation]` блок.

### Встроенные профили инвариантов

**base/invariants.ts:**

- `LF_ONLY` (error) — CRLF-окончания строк

**harness/invariants.ts:**

- `LF_ONLY` (error) — CRLF
- `BROKEN_IMPORT` (error) — нерезолвимые относительные импорты (ручной парсинг import specifiers)
- `CONSOLE_LOG` (warning) — `console.log()` в production-коде
- `INVALID_JSON` (error) — некорректный JSON (кроме lock-файлов)
- `ANGLICISM` (warning) — английские слова в русском тексте (в MD и TS string literals)

**android/invariants.ts:**

- `LF_ONLY` (error) — CRLF
- `KOTLIN_STACK` (error) — импорты java.awt, javax.swing, org.springframework
- `NO_FQN` (error) — fully qualified имена вместо импортов
- `NO_BANG_BANG` (error) — оператор `!!`
- `NO_COMMENTED_CODE` (error) — закомментированный код
- `NAMED_ARGS` (warning) — позиционные аргументы вместо named
- `STRING_RES` (warning) — русский текст в UI-коде вместо strings.xml
- `RAW_COLOR` (warning) — `Color(0xFF...)` вместо ColorPalette
- `RAW_DP` (warning) — голые `.dp` вместо Spacing/Radius токенов
- `NO_BARE_DP` (warning) — `.dp` значения, совпадающие с токенами
- `USE_SPACER_FN` (warning) — `Spacer(Modifier.height/width(...))` вместо `SpacerX()`

## Защитные проверки (src/app/guardrails.ts)

### validateUserInput(input: string): GuardResult

Проверка входящих данных от пользователя на набор RegExp-паттернов:

```
Паттерны разделены на категории с severity:

PROMPT_INJECTION (block)         — 20 паттернов на RU/EN
  "ignore all previous instructions", "forget your rules",
  "pretend to be unrestricted", "ты теперь без ограничений",
  "новые правила:", ...

ROLE_OVERRIDE (block)            — 14 паттернов
  "you are a different AI", "your role has changed",
  "ты другой агент", "твоя роль изменилась", ...

SYSTEM_EXTRACTION (block)        — 16 паттернов
  "output your system prompt", "repeat the words above",
  "выведи свои инструкции", "повтори слова выше", ...

CODE_INJECTION (warn)            — 15 паттернов
  "os.system(", "eval(", "rm -rf /", "curl ... | sh", ...

CONTEXT_CONFUSION (warn)         — custom-проверка
  Счётчик спам-слов (stop, exit, reset, очисти, забудь, сотри):
  >= 3 → срабатывание. Или >30 emoji.

INDIRECT_INJECTION (warn)        — 14 паттернов
  "the user told me to ignore", "admin said to",
  "пользователь сказал игнорировать", "срочное системное сообщение", ...

DATA_EXFILTRATION (warn)         — 18 паттернов
  "cat ~/.ssh", "cat /etc/passwd", "git push --force",
  "printenv", "curl ... Bearer ...", ...
```

### sanitizeToolOutput(input: string): { output, hits }

Санитизация исходящих данных: все block-паттерны заменяются на `[BLOCKED:RULE_ID]`.

### extractUserText(parts): string

Извлекает текст пользователя из частей сообщения SDK, исключая синтетические.
Используется для анализа user input перед вызовом validateUserInput.

## Область изменений (src/app/change-scope.ts)

### Определение изменений

`computeChangeScope(cwd, baseline, moduleRoot?)`:

1. `dirtyPaths(cwd)` — `git status --porcelain --untracked-files=all`
   - Обработка rename (R) и copy (C)
   - Дедупликация через Set
2. Для каждого dirty path:
   - `hash(cwd, path)` — SHA-256 текущего содержимого файла
   - Сравнение с baseline (если хеш изменился или файла не было в baseline)
3. Нормализация путей через `relative()` + защита от path traversal

`captureBaseline(cwd)` — снимок хешей всех dirty файлов (для последующего diff).

Используется в `processScopeAndInvariants` для заполнения `session.changedFiles`.

## Абстракция поставщика задач (src/app/provider.ts)

### Интерфейсы

```typescript
interface TaskProvider {
  getTask(id: string): Promise<Task>;
  getReadyTasks(): Promise<Task[]>;
  postComment(taskId: string, text: string, author: string): Promise<void>;
}

interface ShellExecutor {
  run(args: string[]): Promise<{ ok: true; stdout: string } | { ok: false; error: string }>;
  runRaw(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}
```

### InMemoryProvider

Для тестов — хранит задачи в Map. `getReadyTasks()` фильтрует по `state === 'ready'`.

### createCliProvider (фабрика)

Абстракция над внешним issue-трекером через CLI (bd, gh, jira):

```
<cmd> show <id> --json     → Task JSON
<cmd> ready --json          → Task[] JSON
<cmd> comment <id> <text> --actor <author>  → void
```

- Кеширование с TTL (по умолчанию 30 с)
- `escapeArg()` — экранирование `"$\\``
- Создаёт `Bun.spawn` executor через `createBunExecutor(command)`

### Мост Beads (src/dashboard/beads-bridge.ts)

Обёртка над `bd` CLI для использования в дашборде:

- `getIssue(id)` — получение задачи
- `getReady()` — список готовых задач
- `postComment(issueId, text, author)` — комментарий
- Кеширование 30 с
- Мягкая деградация: если `bd` CLI недоступен → `{ error, degraded: true }`

## Предустановки манифестов

`src/manifest-presets.ts` и API `TASK_MANIFEST_PRESETS` не входят в текущий
runtime-контракт. Workflow объявляется YAML-схемой профиля, а задачи управляются
tools `workflow-tasks-set`, `workflow-tasks-get`,
`workflow-tasks-set-status` и `workflow-tasks-resolve-decision`.

### API

Вместо preset-списка используйте `ProfileResolver` для выбора профиля/schema и
`TaskApi` для декларативного списка задач. Это оставляет список задач независимым от конкретных имён стадий.

## TUI (src/tui/tui.ts)

TUI сейчас имеет два связанных, но отдельных слоя:

- `src/tui.ts` — публичный entrypoint, экспортирующий `createStateSection`,
  `createSessionGuardCoordinator` и `SectionApi`;
- `src/tui/index.tsx` — JSX-монтаж workflow и rules sidebar, coordinator и
  OpenCode `sidebar_content` lifecycle;
- `src/tui/tui.ts` — чистая workflow-модель чтения и форматирования, без JSX;
- `src/tui/slots/sidebar-content.tsx` и `src/tui/tui-panel/*` — общие панели и
  slot-композиция;
- `src/tui/data/*` — загрузка данных rules.

### parseRuntimeState(session: WorkflowSession): ParseResult

Фактическая функция принимает уже валидированный `WorkflowSession`, а не raw
JSON. Она строит `Tui` с `sessionId`, текущей стадией, соседями базового графа,
revision, количеством задач, active operations, session gates, task gates и
retry budgets. Единственный отказ — пустой `currentStage` (`no_stage`).

### formatSectionLines(view: Tui): string[]

Форматирует основную workflow-панель с текущей стадией, соседями, task gate/check
статусами и retry budgets. Rules sidebar загружается отдельным coordinator-ом и
не заменяется workflow widget.

### Детали форматирования (FR-011/FR-012)

`formatDetailsLines(rawText)` форматирует подробности сессии и ограничивает
длинные коллекции. Точные rendering/lifecycle тесты находятся в `test/tui/`.

## Сервер dashboard (src/dashboard/dashboard-server.ts)

### Отдельный процесс

Сервер не внутри плагина — запускается как независимый процесс:
`bun run src/dashboard/dashboard-server.ts`

### Конечные точки API

| Метод | Путь                                 | Описание                                                      |
| ----- | ------------------------------------ | ------------------------------------------------------------- |
| GET   | `/`                                  | HTML-интерфейс                                                |
| GET   | `/events`                            | SSE snapshot при подключении и инкрементальные session events |
| GET   | `/api/schema`                        | Контракт workflow/schema для текущего профиля                 |
| GET   | `/api/dump`                          | Все активные сессии                                           |
| GET   | `/api/session/:id`                   | Одна сессия с вычисляемой стадией                             |
| GET   | `/api/session/:id/timeline`          | Timeline transitions/gates                                    |
| GET   | `/api/session/:id/invariants`        | `invariantViolations` сессии                                  |
| GET   | `/api/metrics`                       | `.opencode/metrics.jsonl`, если файл существует               |
| GET   | `/api/rag-eval`                      | `.opencode/rag/eval-results.json`, если файл существует       |
| GET   | `/api/agents/:profile/:agent/prompt` | Prompt агента с явным profile ID                              |
| GET   | `/api/agents/:agent/prompt`          | Prompt агента профиля текущей сессии                          |
| GET   | `/api/beads/issue/:id`               | Issue через Beads Bridge                                      |
| POST  | `/api/beads/comment`                 | Комментарий через Beads Bridge                                |

### Аутентификация и CORS

- Bearer token через `DASHBOARD_TOKEN` env
- CORS через `ALLOWED_ORIGIN` env
- Хост через `DASHBOARD_HOST` (по умолчанию: 127.0.0.1)

### Контракт dashboard (src/dashboard/dashboard-contract.ts)

Чистые функции для построения сериализуемого представления стейт-машины:

```typescript
interface DashboardSchema {
  states: DashboardState[]; // { id, label, description }
  transitions: DashboardTransition[]; // { from, to, kind, gate }
  gates: DashboardGate[]; // { id, label }
  profile: DashboardProfile; // { id, version, invariants, ... }
}
```

### SSE-события

```typescript
type SSESessionEvent =
  | { type: 'transition'; sessionId: string; from: string; to: string; ts: number }
  | { type: 'gate'; sessionId: string; gate: string; status: string; ts: number };
```

Сессии отслеживаются через `fs.watch` и polling с интервалом 500 ms.
Изменение `metrics.jsonl` проверяется отдельным polling с интервалом 2 s и
публикуется в dashboard UI, но не является типом `SSESessionEvent` из contract.

## АПИ

### Инструменты плагина (инструменты SDK)

| Tool                              | Назначение                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `workflow-create`                 | Создать или повторно открыть workflow session; аргумент `schemaId` опционален, fallback — `HARNESS_SCHEMA_ID`/`HARNESS_PROFILE` |
| `workflow-list`                   | Вывести `profilesDir` и metadata доступных профилей                                                                             |
| `workflow-consent`                | Прочитать один или несколько файлов, вычислить evidence и вернуть `<consent-request>`                                           |
| `workflow-tasks-set`              | Заменить список задач; `listKey` можно не указывать для однозначного workflow                                                   |
| `workflow-tasks-get`              | Прочитать список задач по `listKey`                                                                                             |
| `workflow-tasks-set-status`       | Изменить статус по глобальному `task-N`                                                                                         |
| `workflow-tasks-resolve-decision` | Разрешить pending retry decision: `increase`, `failed` или `cancelled`                                                          |

`workflow-consent` принимает `files: string[] | string`, `summary`, необязательный
`type` (имя из `consent:`), `grant` и `decline`. Evidence считается по всему
набору файлов, а не только по первому.

### Команды OpenCode

**sm-status** — состояние текущей workflow сессии
**sm-list** — список всех активных сессий
**sm-session** — создание/переключение/просмотр сессии
**sm-profile** — переключение профиля

Все команды маршрутизируются на subagent `session-guard` (color: #6366F1).

### Публичный API (src/public-api.ts) — для npm-потребителей

```typescript
async function resolveConfig(profileId: string, profilesDir: string): Promise<ResolvedProfile>;
async function listProfiles(profilesDir: string): Promise<ProfileMetadata[]>;
// Также экспортируются session-file readers и listProfileAgents().
// Они предназначены для интеграций TUI/dashboard только для чтения.
```

## Переменные окружения

| Переменная                   | По умолчанию                                    | Описание                                                |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `OPENCODE_HARNESS_DIR`       | `<project>/.opencode`                           | Корень project-local harness данных                     |
| `SESSION_GUARD_PROFILES_DIR` | `$OPENCODE_HARNESS_DIR/profiles`                | Каталог profile.json/YAML/invariants                    |
| `SESSION_GUARD_STORE_DIR`    | `$XDG_DATA_HOME/opencode/session-guard/runtime` | Активные session JSON и archive                         |
| `SESSION_GUARD_LOG_LEVEL`    | `info`                                          | `debug`, `info`, `warn` или `error`                     |
| `HARNESS_PROFILE`            | не задан                                        | Fallback profile/schema для workflow-create и dashboard |
| `HARNESS_SCHEMA_ID`          | не задан                                        | Fallback schema ID для workflow-create                  |
| `HARNESS_AUTO_APPROVE`       | не задан                                        | При `true` автоматически grant-ит запрошенное consent   |
| `DASHBOARD_TOKEN`            | пусто                                           | Bearer token для dashboard API                          |
| `DASHBOARD_HOST`             | `127.0.0.1`                                     | Хост привязки автономного dashboard                     |
| `ALLOWED_ORIGIN`             | пусто                                           | CORS origin dashboard                                   |

## Структура проекта

```
src/
  index.ts                     — два plugin entrypoint-а: V1 server + V2 setup
  public-api.ts                — resolveConfig, listProfiles, session file API, agents
  app/
    runtime.ts                 — hooks, workflow tools, orchestration
    session-executor.ts        — transaction-scoped load/lock/save
    session-queue.ts           — serialization по root session
    mutation-orchestrator.ts  — mutation lifecycle, scope, invariants
    consent-orchestrator.ts   — consent lifecycle и evidence
    task-api.ts                — управление workflow task lists
    profile-resolver.ts        — profile metadata и extends
    invariants.ts              — загрузка и запуск profile invariants
    guardrails.ts              — input/output guardrails
    change-scope.ts            — baseline и changed files
    provider.ts                — TaskProvider, InMemoryProvider, CLI provider
  domain/
    engine.ts, action-admission.ts, approvals.ts, evidence.ts
    operation-lifecycle.ts, session-facts.ts, session-queries.ts, task-movement.ts
  schema/
    profile-schema.ts, profile-metadata.ts, schema-loader.ts
    compile-workflow.ts, guard-ast.ts, guard-evaluator.ts, types.ts
  session/
    session-schema.ts, session-store.ts, session-files.ts, helpers.ts
  rules/                       — discovery, matching, delivery и runtime hooks
  tui.ts                       — public TUI entrypoint
  tui/                         — JSX sidebar, panels и data coordinators
  dashboard/                   — автономный HTTP/SSE-сервер и контракт

profiles/
  base/base.yaml, profile.json, invariants.ts, agents/
  android/android.yaml, profile.json, invariants.ts, agents/
  harness/harness.yaml, profile.json, invariants.ts, agents/

scripts/
  build-tui.ts, build-schema.ts, verify-build.ts
  host-smoke/                  — smoke-набор для живого OpenCode

test/                          — domain, app, schema, session, rules, TUI, e2e, dashboard

dist/                          — сгенерированный runtime, TUI, объявления и JSON-схемы
```

## Разработка

Источник истины для команд — `.mise/tasks/*`; `package.json` намеренно не
содержит `scripts`.

| Команда                               | Описание                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `mise run setup`                      | Установить зависимости и подготовить окружение                           |
| `mise run check`                      | `typecheck` + `lint` + полный набор тестов                               |
| `mise run typecheck`                  | `tsc --noEmit`                                                           |
| `mise run test`                       | Все тесты через `bun test`                                               |
| `mise run test-coverage`              | Тесты с coverage                                                         |
| `mise run lint` / `mise run lint-fix` | ESLint / ESLint с автофиксом                                             |
| `mise run build`                      | Bun runtime + TUI + declarations + JSON schemas в `dist/` и verify-build |
| `mise run dev`                        | Сборка для разработки с sourcemaps и разделением vendor-кода             |
| `mise run smoke`                      | Smoke-набор для живого OpenCode                                          |
| `mise run dashboard`                  | Запуск автономного dashboard только для чтения на порту 3456             |

---

## Выпуск версии

Инструкции по выпуску новой версии модуля находятся в файле [RELEASE.md](RELEASE.md).

---

## Участие в разработке

Предложения и исправления приветствуются. Создавайте issues или отправляйте pull request в репозитории на GitHub.

---

## Лицензия

Условия лицензии описаны в файле [LICENSE](LICENSE).
