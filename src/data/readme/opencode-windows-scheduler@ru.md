# agent-steward

> Плагин для планирования и оркестрации задач AI-агентов в OpenCode V1 (≥ 1.18.29) и V2: cron, одноразовые запуски, DAG-пайплайны, матричные сборки, Quality Gates и наблюдаемость. Бесплатно, с открытым кодом (MIT).

[![CI](https://github.com/DeadSno/agent-steward/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/agent-steward/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agent-steward.svg)](https://www.npmjs.com/package/agent-steward)
[![license](https://img.shields.io/npm/l/agent-steward.svg)](../LICENSE)
[![node](https://img.shields.io/node/v/agent-steward.svg)](../package.json)

Translations: [English](../README.md) · [中文](README.zh.md).

---

## Быстрый старт

1. Установите плагин (см. [Установка](#установка)) и перезапустите OpenCode.
2. Попросите агента поставить первую задачу — достаточно одного вызова:

   > Поставь задачу «утренний-отчёт»: каждый день в 09:00 с промптом «Просуммаризируй вчерашние git-коммиты и запиши отчёт в ~/reports/».

3. Откройте дашборд: агент печатает ссылку при создании задачи (по умолчанию `http://localhost:3782`), позже её можно получить инструментом `get_dashboard_info`. Посмотреть демо без установки: `node scripts/demo-dashboard.mjs` — дашборд с демо-данными на `http://localhost:3782`.

![Локальный веб-дашборд: матричные сборки, граф DAG, метрики и история запусков](dashboard.png)

## Зачем

Большинство планировщиков для AI-агентов — это обёртки над cron: запустить промпт по таймеру и записать лог. Этот плагин относится к задачам агента как к **воркфлоу**:

- **DAG-пайплайны** — задача ждёт зависимости и продолжается по success/error.
- **Матричные сборки** — один шаблон, N репозиториев, параллельно или последовательно, с лимитом конкурентности и переопределениями для workspace.
- **Quality Gates** — задача считается успешной только если прошла `npm test` (или любая другая команда).
- **Наблюдаемость** — история в SQLite, метрики, логи и локальный веб-дашборд.
- **Работает без запущенного OpenCode** — задачи регистрируются в нативном планировщике ОС (Планировщик Windows, launchd, crontab) и переживают перезагрузку.

Всё выполняется на вашей машине: без SaaS, телеметрии и аккаунтов.

## Возможности

| Область | Что есть |
|---|---|
| Расписание | cron-выражения, одноразовые запуски через `runAt` / `delaySeconds`, нативный планировщик ОС (Windows / macOS / Linux), локальное время без таймзон, пауза/возобновление, непрерывность сессий (`new` / `reuse` / `last` с очисткой `sessionMaxRuns`) |
| Надёжность | lock-файл от наложения запусков, таймауты с жёстким kill, повторы с задержкой, crash recovery |
| Качество | команда Quality Gate, before/after hooks, allow/deny списки инструментов для задачи |
| Оркестрация | DAG `dependsOn`, цепочки `nextTaskOnSuccess` / `nextTaskOnError`, матричный fan-out (parallel/sequential, `continue`/`stop`, concurrency, переопределения для workspace, агрегатор) |
| Триггеры | cron, одноразовый запуск (`triggerType: "once"`), git-коммиты (`triggerType: "git"`, фильтры ветки/путей/игнорирования), изменение файла (chokidar, glob-маски `watchGlobs`/`watchIgnore`), MCP-события, входящие webhooks (`POST /api/hooks/:task` с HMAC) |
| Мультирепо | workspaces с валидацией путей, запуски по workspace, матрица поверх родительской задачи |
| Наблюдаемость | история SQLite (success / error / timeout / partial / running), метрики (длительность, токены, стоимость), JSONL-логи с `/api/logs`, Prometheus `/metrics`, экспорт OTLP, логи по задачам, веб-дашборд с аналитикой за 14 дней, ретеншн истории и экспорт CSV/JSON |
| Эксплуатация | dry-run, экспорт/импорт JSON, шаблоны, уведомления по нескольким каналам (webhook, Telegram, нативные toast), тихие часы, дайджест, локальный ассистент для триажа уведомлений (fail-open, shadow-режим), зашифрованные секреты (`${secret:NAME}`), журнал аудита, настройки |
| Интерфейсы | панель OpenCode GUI, веб-дашборд, 29 инструментов для агента, встроенный скилл |

### Язык интерфейса

Интерфейс доступен на русском, английском и китайском (упрощённом). По умолчанию выбран режим **«Авто»** — как в OpenCode, язык интерфейса следует за языком OpenCode; русский, английский и китайский можно выбрать явно. Переключатель языка находится в шапке панели планировщика (🌐 Авто / Русский / English / 中文), а также доступен через инструмент `manage_settings` (`action: "update"`, `locale: "zh"`). Значение `locale: "auto"` («Авто», используется по умолчанию) следует за языком интерфейса OpenCode: панель реагирует на смену языка сразу, а разрешённая локаль отправляется на сервер, чтобы уведомления, дайджест и дашборд использовали тот же язык. Переключение применяется без перезапуска. Локализация дашборда ещё не завершена: часть строк на стороне клиента пока остаётся русской. Описания и схемы инструментов агента остаются английскими, диагностика в консоли — русской.

Каталоги лежат в `locales/ru.json`, `locales/en.json` и `locales/zh.json`; набор ключей в них должен совпадать, иначе CI падает.

## Установка

Нужны OpenCode V1 ≥ 1.18.29 или V2, и Node.js 22.22+. Матрица версий и различия
поверхностей — в [COMPATIBILITY.md](COMPATIBILITY.md) (GUI и RPC — только V2, TUI — обе линии).

Ключ конфигурации зависит от линии:

| Линия OpenCode | Ключ в `opencode.jsonc` |
|---|---|
| V1 (`1.18.29`–`1.19.x`) | `"plugin": ["agent-steward"]` |
| V2 (`≥ 2.2.7`) | `"plugins": ["agent-steward"]` |

Используйте ключ своей линии; добавлять оба не нужно. В V2 проще через CLI:

```bash
opencode plugin add agent-steward
```

V1 — вручную:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["agent-steward"]
}
```

V2 — тот же плагин вручную:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["agent-steward"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` отключает встроенный планировщик OpenCode, чтобы агент не путал встроенные инструменты расписаний с инструментами этого плагина. В OpenCode 2.x конфигурация перезагружается автоматически; если изменения не подхватились, выполните `/reload`. В 1.x перезапустите OpenCode после правки конфигурации. Панель TUI входит в тот же пакет (`exports["./tui"]`), поэтому включается той же записью на обеих линиях.

Из исходников:

```bash
git clone https://github.com/DeadSno/agent-steward.git
cd agent-steward
npm install
npm run build && npm run build:gui
```

## Инструменты для агента

Агенту доступен весь функционал — 29 инструментов: расписание, пайплайны, эксплуатация, аналитика и администрирование.

| Инструмент | Аргументы | Что делает |
|---|---|---|
| `schedule_task` | `name`, `prompt`, `schedule` для cron или `runAt` / `delaySeconds` для одноразового запуска, опционально `session` / `sessionMaxRuns`, `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType` (`cron`/`file`/`git`/`mcp-event`/`once`), `mcpEvent`, `watchPath`, `watchGlobs`, `watchIgnore`, `gitBranch`, `gitPaths`, `gitIgnore`, `gitPollSeconds`, `activeDays`, `windowPolicy` (`skip`/`postpone`/`run`), `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `matrix` | Регистрирует задачу в планировщике ОС (cron, одноразовый запуск, файл, git или MCP-событие) |
| `list_tasks` | — | Задачи: расписание, статус, следующее время запуска, цепочки, workspace, сводка матрицы |
| `update_task` | `name` + изменяемые поля | Частичное обновление: незаданные поля сохраняются, пустые — очищаются, `matrix: null` убирает матрицу |
| `delete_task` | `name` | Удаляет задачу (родитель матрицы — вместе с клонами и агрегатором) |
| `run_task_now` | `name` | Немедленный запуск (для матрицы — запуск fan-out) |
| `pause_task` | `name` | Пауза (для матрицы — все клоны) |
| `resume_task` | `name` | Возобновление |
| `get_history` | `taskName?`, `status?`, `limit?` | История запусков: длительность, токены, стоимость, модель, Quality Gate, хуки |
| `get_task_logs` | `name`, `lines?` | Хвост лога запуска |
| `dry_run` | `name?` | Симуляция пайплайна (или всех задач): порядок, DAG, fan-out, оценки |
| `manage_workspaces` | `action`, `id?`, `name?`, `path?`, `color?` | Multi-repo workspace: список, добавление, изменение, удаление |
| `matrix_control` | `action`, `name?` | Результаты матрицы, отмена клонов, очистка осиротевших задач, предпросмотр |
| `get_metrics` | — | Всего запусков, успехов и падений |
| `get_analytics` | `days?`, `topLimit?` | Отчёт за период: запуски, успешность, длительность, токены, стоимость, топ задач |
| `self_analysis` | `days?`, `topLimit?`, `includeAnomalies?` | Самодиагностика за период: оценка здоровья, аномалии, тренды и рекомендации по оптимизации |
| `manage_settings` | `action`, `maxConcurrent?`, `winterMode?`, `notifications?`, `history?` | Чтение и изменение глобальных настроек (параллелизм, уведомления, retention) |
| `manage_local_ai` | `action` (`get`/`update`/`test`), `mode?`, `baseUrl?`, `model?`, `timeoutMs?`, `fallback?`, `confidenceThreshold?`, `shadow?` | Настройки локального ассистента для триажа уведомлений и проверка модели одним запросом (см. [LOCAL-AI.md](LOCAL-AI.md)) |
| `manage_templates` | `action`, поля шаблона | Список, сохранение и удаление шаблонов задач |
| `manage_profiles` | `action`, `name?`, `port?` | Список, создание, переключение и удаление изолированных профилей |
| `transfer_tasks` | `action`, `data?` | Экспорт всех задач в JSON и импорт обратно |
| `send_notification` | `action` (`test`/`digest`), `channel?` (`all`/`webhook`/`telegram`/`native`) | Проверка каналов уведомлений или отправка дайджеста |
| `get_dashboard_info` | — | Порт/URL дашборда, платформа, заголовок, активный профиль |
| `cleanup_history` | `retentionDays?`, `maxRecords?` | Удаление старой истории по возрасту и/или лимиту записей |
| `manage_secrets` | `action`, `name?`, `value?` | Создание, список и удаление секретов AES-256-GCM для `env` задач |
| `get_audit_log` | `action?`, `target?`, `actor?`, `since?`, `until?`, `limit?` | Журнал мутаций: кто, что и когда изменил и через какой интерфейс |
| `emit_event` | `eventName`, `payload?` | Запуск задач, подписанных на MCP-событие |
| `pipeline_validate` | `path?`, `source?` | Проверяет `opencode.pipeline.yaml`, не меняя задачи |
| `pipeline_apply` | `path?`, `source?`, `dryRun?` | Идемпотентно создаёт и обновляет задачи конвейера; `dryRun` только показывает diff |
| `pipeline_export` | `pipeline` | Выгружает задачи конвейера обратно в YAML |

`schedule_task` принимает и полную конфигурацию матрицы (`workspaceIds`, `strategy`, `failureMode`, `aggregation`, `concurrency`, `overrides`, `createAggregator`).

## Права и разрешения

Задачи агента запускаются через `opencode run --auto`, поэтому их политика инструментов должна быть задана явно. Глобальная настройка `permissions.defaultPolicy` (GUI → Settings или `manage_settings`) задаёт базу:

| Политика | Разрешено по умолчанию | Запрещено по умолчанию |
|---|---|---|
| `hybrid` (по умолчанию) | read, edit, glob, grep, subagent, skill, webfetch, websearch | shell, question |
| `secure` | read, glob, grep, skill | edit, shell, question, webfetch, websearch, subagent |
| `legacy` | все десять действий | — |

`deniedTools` всегда важнее. Непустой `allowedTools` превращается в allowlist: всё, что не перечислено, запрещено, а разрешённое политикой действие можно явно вернуть (например, `shell`). `legacyShell: true` возвращает `shell` только при `hybrid` — для задач, перенесённых со старых версий.

Заблокированные действия пишутся в аудит как `tool.blocked` с `reason: "default-policy"` и `hint`, а каждый запуск записывает действующую политику.

Рекомендуемый приём: держите `git commit`/`push`, сборки и тесты вне агента — в `qualityGate` или `afterScript` (обёртка запускает их через `bash -c`), а агенту оставьте `read`/`edit`. Тогда большинству задач `shell` вообще не нужен.

## Скилл для агента

Плагин сам регистрирует встроенный скилл `scheduled-job-best-practices`: агент подгружает инструкцию только когда она действительно нужна — проектирование cron, самодостаточные промпты, Quality Gates, лимиты матрицы, правила DAG и разбор падений. Ручная настройка `.opencode/skills` не требуется. Вместе со скиллом поставляется `references/recipes.md` — семь готовых конфигураций.

## Матричные сборки

```jsonc
{
  "name": "deploy",
  "schedule": "0 3 * * *",
  "prompt": "Build, test and deploy",
  "matrix": {
    "workspaceIds": ["frontend-id", "backend-id", "mobile-id"],
    "strategy": "parallel",
    "failureMode": "continue",
    "aggregation": "summary",
    "concurrency": 2,
    "createAggregator": true,
    "overrides": {
      "mobile-id": { "qualityGate": "npm run test:mobile" }
    }
  }
}
```

Каждый workspace получает клон `<parent>-matrix-<workspace>`. Родительская задача сама не выполняется: она агрегирует результаты клонов в `success`, `error` или `partial`. Клоны синхронизируются с родителем при его изменении; запущенные клоны не затрагиваются.

## Pipeline как код

Опишите весь конвейер одним файлом `opencode.pipeline.yaml`, вместо того чтобы создавать задачи по одной:

```yaml
version: 1
name: nightly-release
defaults:
  retryCount: 1
  retryDelay: 120
steps:
  - id: lint
    schedule: "0 2 * * *"
    prompt: Запусти линтер и исправь найденные проблемы.
    qualityGate: npm run lint
  - id: test
    needs: [lint]
    trigger: dag
    prompt: Запусти тесты и исправь падения.
    qualityGate: npm test
```

`needs` превращается в DAG-зависимость, шаг с `trigger: dag` запускается только после успеха зависимостей, а `defaults` наследуются всеми шагами. Каждый шаг становится задачей с именем `<pipeline> <step>`.

```bash
agent-steward pipeline validate opencode.pipeline.yaml
agent-steward pipeline apply opencode.pipeline.yaml --dry-run
agent-steward pipeline apply opencode.pipeline.yaml
agent-steward pipeline export --pipeline nightly-release --out opencode.pipeline.yaml
```

Apply идемпотентен: неизменённые шаги пропускаются, изменённые обновляются, а задачи вне конвейера не затрагиваются. Шаги, удалённые из файла, помечаются как устаревшие, но не удаляются. Агенту доступны те же операции через `pipeline_validate`, `pipeline_apply` и `pipeline_export`.

Полный формат, матрица, правила валидации и ограничения — в [docs/PIPELINE.md](PIPELINE.md); готовый пример — [opencode.pipeline.yaml](../opencode.pipeline.yaml).

## GUI и дашборд

В боковой панели OpenCode доступны задачи, история, логи, dry-run, шаблоны, импорт/экспорт, лимит конкурентности и группировка матриц. Локальный веб-дашборд добавляет сводку по workspace, вкладки матриц, вид пайплайна и метрики.

```bash
npm run build:gui   # собирает gui-experimental.cjs
```

## Как это устроено

```
src/
  index.ts              жизненный цикл плагина, инструменты агента, RPC
  gui.tsx               панель OpenCode в сайдбаре
  server.ts             локальный веб-дашборд
  core/
    scheduler/          бэкенды Windows / Linux / macOS
    matrix.ts           fan-out, агрегация, синхронизация, отмена
    record-history.ts   история, повторы, цепочки, продолжение матриц
    dry-run.ts          симуляция пайплайна
    lock.ts             защита от наложения запусков
    file-watcher.ts     триггеры chokidar
    telegram.ts         доставка в Telegram Bot API
    native-notify.ts    нативные уведомления (Windows/macOS/Linux)
    secrets.ts          зашифрованное хранилище секретов (AES-256-GCM)
    audit.ts            журнал аудита (audit_log в SQLite)
  db/                   SQLite: задачи, история, метрики, настройки
  task-transfer.ts      экспорт / импорт / валидация
```

Обёртки задач запускают `opencode run` в рабочей директории задачи, поэтому MCP-серверы проекта подхватываются автоматически.

### Режим входа (Windows)

По умолчанию задачи **интерактивные** (`Interactive only`): Планировщик Windows запускает их только при активном входе пользователя, создавшего задачу, — с обычным профилем, дисками и сохранёнными учётными данными. Передайте `runWhenLoggedOff: true`, чтобы задача работала без входа (`schtasks /ru SYSTEM`). Такая задача идёт в session 0 — без профиля пользователя, подключённых дисков, сетевых ресурсов и сохранённых паролей, поэтому задачи, которым нужно ваше окружение, могут упасть; проверяйте их через `dry_run`. На Linux crontab и так работает без входа, а launchd-агент macOS — только внутри пользовательской сессии.

## Разработка

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # 83 сюит, 600+ проверок
npm run test:en      # те же сюиты с английской локалью
```

`npm run test:en` выставляет `OPENCODE_SCHEDULER_LOCALE=en` для каждой сюиты; переменная нужна тестам и сервисам, это не пользовательская настройка.

Подробности — в [CONTRIBUTING.md](../CONTRIBUTING.md).

## Документация

- [ARCHITECTURE.md](ARCHITECTURE.md) — модель процессов, модули, бэкенды, модель данных.
- [CONCEPT.md](CONCEPT.md) — north star: верифицируемая локально-первая оркестрация.
- [FEATURES.md](FEATURES.md) — полный каталог возможностей с примерами.
- [FAQ.md](FAQ.md) — сценарии восстановления и ответы по эксплуатации (English).
- [MIGRATION.md](MIGRATION.md) — переезд с cron, systemd, launchd или Планировщика Windows.
- [PIPELINE.md](PIPELINE.md) — конвейер как код: формат, CLI, идемпотентный apply.
- [SAVINGS.md](SAVINGS.md) — как считается оценка «Сэкономлено $» (English).
- [../CROSS_PLATFORM.md](../CROSS_PLATFORM.md) — различия и бэкенды Windows / macOS / Linux.

## FAQ

**Работает ли плагин, когда OpenCode закрыт?**
Да. Задачи регистрируются в нативном планировщике ОС, поэтому выполняются без открытого OpenCode.

**Выполняются ли задачи, когда никто не вошёл в систему?**
На Windows — только если явно включить `runWhenLoggedOff: true`: задача регистрируется как `schtasks /ru SYSTEM` и идёт в session 0 без вашего профиля, подключённых дисков и сохранённых учётных данных. По умолчанию задача интерактивная и работает при активном входе. Linux crontab выполняет задачи и без входа, а launchd-агент macOS — только внутри пользовательской сессии.

**Какие платформы поддерживаются?**
Windows (Планировщик Windows), macOS (launchd) и Linux (crontab). Различия описаны в [CROSS_PLATFORM.md](../CROSS_PLATFORM.md).

**Куда отправляются данные?**
Никуда. История, логи, метрики и настройки хранятся локально в SQLite; телеметрии и аккаунтов нет.

**Как включить уведомления в Telegram?**
Создайте бота у [@BotFather](https://t.me/BotFather), скопируйте токен, напишите боту сообщение и возьмите `chat_id` из `getUpdates` (или используйте ID группы/канала). Укажите оба значения в панели или через `manage_settings` → `notifications.telegram` (`enabled`, `botToken`, `chatId`, при необходимости `parseMode`). Чтобы не хранить секреты в `settings.json`, задайте `OPENCODE_SCHEDULER_TELEGRAM_BOT_TOKEN` и `OPENCODE_SCHEDULER_TELEGRAM_CHAT_ID` — переменные используются, если поля пусты. Проверка: `send_notification` с `channel: "telegram"`.

**Нужен ли отдельный пакет для системных уведомлений?**
Нет. Windows Toast (PowerShell/WinRT), macOS Notification Center (`osascript`) и Linux `notify-send` вызываются напрямую, `node-notifier` не требуется. Включается через `notifications.native.enabled`.

**Можно ли отключить уведомления на ночь?**
Да. Задайте `notifications.quietHours` (`enabled`, `from`, `to` в `HH:MM`). В этом окне успешные и `partial` запуски не отправляются, а ошибки и таймауты приходят всегда.

**Как хранить секреты?**
Используйте `manage_secrets` (или панель «🔐 Секреты» в сайдбаре). Секреты хранятся в `<PLUGIN_DIR>/secrets.json` с шифрованием AES-256-GCM и ключевым файлом `secrets.key` (права 0600). В `env` задачи секрет ссылается как `${secret:NAME}` — значение подставляется при запуске и маскируется в логах, истории и аудите.

**Можно ли посмотреть, кто что изменил?**
Да. Журнал аудита (`get_audit_log`, панель «📜 Журнал аудита», `GET /api/audit`) записывает каждую мутацию — создание/изменение/удаление/запуск задачи, настройки, шаблоны, профили, workspace, секреты, импорт, очистку истории — с aktёром (mcp/gui/http), источником, временной меткой и замаскированными деталями. Ретеншн по умолчанию 90 дней / 10 000 записей.

**Чем это отличается от `experimental.schedules` в OpenCode?**
Встроенный планировщик выполняет задачи, пока OpenCode запущен. Этот плагин использует нативный планировщик ОС и добавляет DAG-пайплайны, матричные сборки, Quality Gates, webhooks и наблюдаемость.

**Можно ли запускать задачи в других репозиториях?**
Да. Workspaces задают путь к проекту, а матричная сборка запускает один шаблон по нескольким workspace сразу.

## Дальнейшее развитие

- [ROADMAP.md](../ROADMAP.md) — история спринтов и ближайшие планы.
- [ROADMAP-STRATEGY.md](../ROADMAP-STRATEGY.md) — позиционирование и горизонт 0–6 месяцев.

## Лицензия

[MIT](../LICENSE).
