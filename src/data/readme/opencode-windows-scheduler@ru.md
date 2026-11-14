# opencode-windows-scheduler

> Плагин для планирования и оркестрации задач AI-агентов в OpenCode v2: cron, одноразовые запуски, DAG-пайплайны, матричные сборки, Quality Gates и наблюдаемость. Бесплатно, с открытым кодом (MIT).

[![CI](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![license](https://img.shields.io/npm/l/opencode-windows-scheduler.svg)](../LICENSE)
[![node](https://img.shields.io/node/v/opencode-windows-scheduler.svg)](../package.json)

English version: [README.md](../README.md).

---

![Локальный веб-дашборд: матричные сборки, граф DAG, метрики и история запусков](dashboard.png)

Хотите посмотреть без установки OpenCode? `node scripts/demo-dashboard.mjs` поднимет дашборд с демо-данными на http://localhost:4380.

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
| Триггеры | cron, одноразовый запуск (`triggerType: "once"`), изменение файла (chokidar), MCP-события, входящие webhooks (`POST /api/hooks/:task` с HMAC) |
| Мультирепо | workspaces с валидацией путей, запуски по workspace, матрица поверх родительской задачи |
| Наблюдаемость | история SQLite (success / error / timeout / partial / running), метрики (длительность, токены, стоимость), JSONL-логи с `/api/logs`, Prometheus `/metrics`, экспорт OTLP, логи по задачам, веб-дашборд с аналитикой за 14 дней, ретеншн истории и экспорт CSV/JSON |
| Эксплуатация | dry-run, экспорт/импорт JSON, шаблоны, уведомления по нескольким каналам (webhook, Telegram, нативные toast), тихие часы, дайджест, зашифрованные секреты (`${secret:NAME}`), журнал аудита, настройки |
| Интерфейсы | панель OpenCode GUI, веб-дашборд, 24 инструмента для агента, встроенный скилл |

## Установка

Нужны OpenCode v2 и Node.js 20+.

```bash
opencode plugin add opencode-windows-scheduler
```

Или добавьте плагин в `opencode.jsonc` вручную:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-windows-scheduler"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` отключает встроенный планировщик OpenCode, чтобы агент не путал встроенные инструменты расписаний с инструментами этого плагина. После изменения конфигурации перезапустите OpenCode.

Альтернатива — глобальная установка через npm:

```bash
npm install -g opencode-windows-scheduler
```

Из исходников:

```bash
git clone https://github.com/DeadSno/opencode-windows-scheduler.git
cd opencode-windows-scheduler
npm install
npm run build && npm run build:gui
```

## Инструменты для агента

Агенту доступен весь функционал — 24 инструмента: расписание, пайплайны, эксплуатация, аналитика и администрирование.

| Инструмент | Аргументы | Что делает |
|---|---|---|
| `schedule_task` | `name`, `prompt`, `schedule` для cron или `runAt` / `delaySeconds` для одноразового запуска, опционально `session` / `sessionMaxRuns`, `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType`, `mcpEvent`, `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `matrix` | Регистрирует задачу в планировщике ОС (cron, одноразовый запуск, файл или MCP-событие) |
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
| `manage_settings` | `action`, `maxConcurrent?`, `winterMode?`, `notifications?`, `history?` | Чтение и изменение глобальных настроек (параллелизм, уведомления, retention) |
| `manage_templates` | `action`, поля шаблона | Список, сохранение и удаление шаблонов задач |
| `manage_profiles` | `action`, `name?`, `port?` | Список, создание, переключение и удаление изолированных профилей |
| `transfer_tasks` | `action`, `data?` | Экспорт всех задач в JSON и импорт обратно |
| `send_notification` | `action` (`test`/`digest`), `channel?` (`all`/`webhook`/`telegram`/`native`) | Проверка каналов уведомлений или отправка дайджеста |
| `get_dashboard_info` | — | Порт/URL дашборда, платформа, заголовок, активный профиль |
| `cleanup_history` | `retentionDays?`, `maxRecords?` | Удаление старой истории по возрасту и/или лимиту записей |
| `emit_event` | `eventName`, `payload?` | Запуск задач, подписанных на MCP-событие |

`schedule_task` принимает и полную конфигурацию матрицы (`workspaceIds`, `strategy`, `failureMode`, `aggregation`, `concurrency`, `overrides`, `createAggregator`).

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

## Разработка

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # полный набор тестов, 500+ проверок
```

Подробности — в [CONTRIBUTING.md](../CONTRIBUTING.md).

## Документация

- [ARCHITECTURE.md](ARCHITECTURE.md) — модель процессов, модули, бэкенды, модель данных.
- [FEATURES.md](FEATURES.md) — полный каталог возможностей с примерами.
- [MIGRATION.md](MIGRATION.md) — переезд с cron, systemd, launchd или Планировщика Windows.

## FAQ

**Работает ли плагин, когда OpenCode закрыт?**
Да. Задачи регистрируются в нативном планировщике ОС, поэтому выполняются без открытого OpenCode.

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
