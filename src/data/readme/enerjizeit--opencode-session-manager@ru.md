# OpenCode Session Manager

[![npm version](https://img.shields.io/npm/v/@enerjizeit/opencode-session-manager?color=blue)](https://www.npmjs.com/package/@enerjizeit/opencode-session-manager)
[![npm downloads](https://img.shields.io/npm/dm/@enerjizeit/opencode-session-manager)](https://www.npmjs.com/package/@enerjizeit/opencode-session-manager)
[![license: MIT](https://img.shields.io/npm/l/@enerjizeit/opencode-session-manager?color=green)](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/EnerJizeIT/opencode-session-manager?style=social)](https://github.com/EnerJizeIT/opencode-session-manager)

[English](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/README.md)

> **Закрепляй, бэкапь и восстанавливай opencode AI-сессии — больше никогда не потеряешь важный разговор.**

> 🎬 **Демо скоро** — закрепление, бэкап и восстановление сессии через чат.

## Какую проблему решает

Терял важный AI-чат? Не можешь найти ту сессию недельной давности? Сессий накопилось столько, что не уследишь, что важно?

**OpenCode Session Manager** — плагин, дающий AI-агенту слой памяти через управление сессиями. Пишешь обычным языком — *«запинть эту сессию»*, *«забэкапь те, что про платежи»*, *«почисти старые»* — и агент вызывает нужный tool. **Команды учить не надо.**

## Возможности

- 📌 **Pin / unpin** — закрепляй важные сессии; закреплённые никогда не удаляются автоматически.
- 🛡️ **Pinned Guarantee** — бэкапы закреплённых обновляются автоматически, а пропавшая закреплённая сессия восстанавливается из бэкапа при следующем прогоне обслуживания.
- 💾 **Бэкап** — одна сессия или все закреплённые; переживает переустановку и перенос на другую машину.
- ♻️ **Восстановление** — верни сессию из бэкапа одной фразой.
- 🧹 **Автоочистка** — старые незакреплённые сессии бэкапятся и удаляются (закреплённые всегда защищены).
- 🔍 **Поиск** — находи сессии по подстроке в названии.
- ⚙️ **Настройка** — cleanup / retention; настроил и забыл.

## Версии OpenCode

Пакет поддерживает обе версии API плагинов одной сборкой:

| opencode | API | Что загружается |
|---|---|---|
| 1.18.29 и новее (1.x) | V1 | `server()` из default-экспорта — инструменты и хук `tool.execute.before` |
| 2.x | V2 | `id` + `setup(ctx)` из default-экспорта — инструменты через `ctx.tool.transform`, хук через `ctx.tool.hook("execute.before", ...)` |

Имена, описания, аргументы и поведение инструментов совпадают. Отдельная
версия пакета не нужна, конфиг тоже не отличается: одна и та же запись в
`plugin[]` (`opencode.json`) или `plugins[]` (opencode 2) подходит для обеих.

## Установка

Добавьте scoped-пакет в массив `plugin` файла `~/.config/opencode/opencode.json` — opencode сам установит его из npm:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["@enerjizeit/opencode-session-manager"]
}
```

Перезапустите opencode — плагин загрузится автоматически. Подробности по использованию — см. [USAGE.ru.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.ru.md).

**Локальная разработка / установка из исходников** (clone + build):

```bash
git clone https://github.com/EnerJizeIT/opencode-session-manager.git
cd opencode-session-manager && ./install.sh
```

## Обновление

opencode **не обновляет плагины автоматически** — он пинит версию при первой установке.
Чтобы обновиться до новой версии:

```bash
rm -rf ~/.cache/opencode/packages/@enerjizeit/opencode-session-manager
rm -rf ~/.cache/opencode/packages/@enerjizeit/opencode-session-manager@latest
```
Затем перезапустите opencode — он переустановит `@latest` из npm. (Или пиньте точную версию в `plugin[]`, напр. `"@enerjizeit/opencode-session-manager@1.0.7"`.)

## Архитектура

### Хранение

State-файл `session-manager.json` хранит pinned-список и настройки.
Запись атомарная: `.tmp` → `rename`. Бэкапы в `backups/<id>.json`.
Всё лежит вне БД opencode — переживёт переустановку.

### Чтение БД + запись через CLI

Список сессий — прямое readonly-чтение из базы opencode (`bun:sqlite`), все проекты сразу: на opencode 2.x читается `session_v2` (legacy-таблица `session` — для 1.x); `opencode session list` отдаёт только сессии текущего каталога, и плагин терял остальные.
Export/import/delete — через `opencode` CLI (`session export|import` на 2.x). Write-SQL запрещён. `parseJson` терпит `[page-assist]`-шум в stdout.

### Backup envelope

Формат: `{version, exportedAt, backupOf, session}`, где `session` — сырой `opencode export`
(родной round-trip для `opencode import`). Формализован в `backup-schema.json`.

### Backup-then-delete

Удаление только после успешного бэкапа. Команды `opencode session archive` не существует,
поэтому cleanup = бэкап → `opencode session delete`.

### Protected backups

Pinned-бэкапы защищены навсегда; orphaned (сессии уже нет в БД) удаляются через `orphanBackupRetentionDays` (по умолчанию 30 дней; `0` — хранить навсегда).
Corrupt-файлы переименовываются в `.corrupt`.

### Хуки

- `session.idle` — auto cleanup + backup retention; дебаунс 1 час через `lastAutoRun`
- `session.deleted` — уборка удалённой сессии из pinned-списка
- Хуки никогда не роняют opencode (try/catch на каждом уровне)

### Миграция

`version` в state + `migrateState` (merge-with-defaults) для будущих изменений схемы.

## Файлы проекта

| Файл | Описание |
|---|---|
| [session-manager.ts](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/session-manager.ts) | Плагин (12 tools, 2 hooks) |
| [backup-schema.json](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/backup-schema.json) | JSON Schema backup envelope |
| [README.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/README.md) | Английский README |
| [USAGE.ru.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.ru.md) | Пользовательский гайд (RU) |

## Детали

Архитектура кратко описана в разделе «Архитектура» выше; полный пользовательский гайд — [USAGE.ru.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.ru.md) ([English](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.md)).
