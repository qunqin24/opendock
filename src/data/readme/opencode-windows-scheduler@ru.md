# opencode-windows-scheduler

> Локальная оркестрация задач AI-агентов для OpenCode v2: cron, DAG-пайплайны, матричные сборки, Quality Gate и наблюдаемость. Бесплатно и с открытым кодом (MIT).

[![CI](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![license](https://img.shields.io/npm/l/opencode-windows-scheduler.svg)](LICENSE)

English version: [README.md](README.md).

---

![Локальный веб-дашборд: матричные сборки, граф DAG, метрики и история запусков](docs/dashboard.png)

Хотите посмотреть без установки OpenCode? `node scripts/demo-dashboard.mjs` поднимет дашборд с демо-данными на http://localhost:4380.

## Зачем

Плагин для OpenCode v2: планировщик задач на нативном планировщике ОС (Планировщик Windows, launchd, crontab) с cron-расписанием, защитой от наложения запусков (lock-файл), таймаутами, повторами, Quality Gate, DAG-цепочками, матричными сборками и файловыми триггерами. Всё работает локально: без SaaS, телеметрии и аккаунтов.

## Возможности

| Область | Что есть |
|---|---|
| Расписание | cron, нативный планировщик ОС (Windows / macOS / Linux), пауза/возобновление |
| Надёжность | lock-файл от наложения, таймауты с жёстким kill, повторы с задержкой, crash recovery |
| Качество | Quality Gate, before/after hooks, allow/deny списки инструментов |
| Оркестрация | DAG `dependsOn`, цепочки success/error, матрицы (parallel/sequential, continue/stop, concurrency, overrides, агрегатор) |
| Триггеры | cron, изменение файла (chokidar), MCP-события |
| Мультирепо | workspaces с валидацией путей, запуск по workspace, матрица поверх родительской задачи |
| Наблюдаемость | история SQLite (success / error / timeout / partial / running), метрики (длительность, токены, стоимость), логи, веб-дашборд: аналитика за 14 дней, ретеншн истории (лимиты по возрасту и размеру), экспорт CSV/JSON |
| Эксплуатация | dry-run, экспорт/импорт JSON, шаблоны, webhook-уведомления, настройки |
| Интерфейсы | панель OpenCode GUI, веб-дашборд, 12 инструментов для агента, встроенный скилл |

## Установка

Нужны OpenCode v2 и Node.js 20+.

```bash
npm install -g opencode-windows-scheduler
```

Добавьте плагин в `opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-windows-scheduler"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` отключает встроенный планировщик OpenCode, чтобы агент не путал встроенные инструменты расписаний с инструментами этого плагина. После изменения конфигурации перезапустите OpenCode.

Из исходников:

```bash
git clone https://github.com/DeadSno/opencode-windows-scheduler.git
cd opencode-windows-scheduler
npm install
npm run build && npm run build:gui
```

## Инструменты для агента

Агенту доступен весь функционал — 12 инструментов: расписание, пайплайны, эксплуатация и наблюдаемость.

| Инструмент | Аргументы | Что делает |
|---|---|---|
| `schedule_task` | `name`, `schedule`, `prompt`, опционально `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType`, `mcpEvent`, `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `matrix` | Регистрирует задачу в планировщике ОС (cron, файл или MCP-событие) |
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
| `matrix_control` | `action`, `name?` | Результаты матрицы, отмена клонов, очистка осиротевших задач |

`schedule_task` принимает и полную конфигурацию матрицы (`workspaceIds`, `strategy`, `failureMode`, `aggregation`, `concurrency`, `overrides`, `createAggregator`).

## Скилл для агента

Плагин сам регистрирует встроенный скилл `scheduled-job-best-practices`: агент подгружает инструкцию только когда она действительно нужна — проектирование cron, самодостаточные промпты, Quality Gate, лимиты матрицы, правила DAG и разбор падений. Ручная настройка `.opencode/skills` не требуется. Вместе со скиллом поставляется `references/recipes.md` — семь готовых конфигураций.

## MCP-серверы проекта

Фоновые задачи запускаются через `opencode run` в рабочей директории задачи. По умолчанию это папка проекта, где лежит `opencode.json` / `opencode.jsonc`, поэтому MCP-серверы проекта подхватываются автоматически — отдельный мост не нужен.

- Поле **«Рабочая директория»** в GUI позволяет указать другую папку. Пустое значение = папка проекта.
- Значение сохраняется как `workingDirectory` и экспортируется вместе с задачей.
- Старое поле `workdir` читается при импорте для обратной совместимости.

## GUI и дашборд

В боковой панели OpenCode доступны создание, редактирование, запуск, пауза, удаление задач, просмотр логов и истории, экспорт/импорт, лимит одновременных задач и зимняя тема. Локальный веб-дашборд добавляет сводку по workspace, вкладку матриц, вид пайплайна и метрики.

```bash
npm run build:gui   # gui-experimental.cjs
```

## Сборка и тесты

```bash
npm run build      # tsc: серверная часть плагина
npm run build:gui  # vite: GUI-бандл gui-experimental.cjs
npm test           # 17 сюит, 500+ проверок
```

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — модель процессов, модули, бэкенды, модель данных.
- [docs/FEATURES.md](docs/FEATURES.md) — полный каталог возможностей с примерами.
- [docs/MIGRATION.md](docs/MIGRATION.md) — переезд с cron, systemd, launchd или Планировщика Windows.

## Дальнейшее развитие

- [ROADMAP.md](ROADMAP.md) — история спринтов и ближайшие планы.
- [ROADMAP-STRATEGY.md](ROADMAP-STRATEGY.md) — позиционирование и горизонт 0–6 месяцев.

## Кроссплатформенность

Архитектура и различия Windows / macOS / Linux описаны в [CROSS_PLATFORM.md](CROSS_PLATFORM.md).

## Лицензия

[MIT](LICENSE).
