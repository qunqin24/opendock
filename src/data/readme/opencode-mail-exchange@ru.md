<div align="center">

# opencode-mail-exchange

Плагин OpenCode V2 для on-prem Exchange: почта, календарь и контакты через EWS + NTLM.

![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-black)
![npm](https://img.shields.io/npm/v/opencode-mail-exchange)
![Bun](https://img.shields.io/badge/Bun-1.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Biome](https://img.shields.io/badge/Biome-2.5-green)
![License](https://img.shields.io/badge/license-MIT-blue)

[English](README.md) · **Русский**

</div>

## Содержание

- [О плагине](#о-плагине)
- [Возможности](#возможности)
- [Начало работы](#начало-работы)
  - [Требования](#требования)
  - [Установка](#установка)
  - [Конфигурация](#конфигурация)
- [Использование](#использование)
  - [Инструменты](#инструменты)
  - [Получатели](#получатели)
  - [Ошибки](#ошибки)
  - [Синхронизация](#синхронизация)
- [Хранение](#хранение)
- [Лимиты](#лимиты)
- [Не реализовано](#не-реализовано)
- [Roadmap](#roadmap)
- [Риски](#риски)
- [Разработка](#разработка)
- [Лицензия](#лицензия)

## О плагине

Читает и отправляет почту, показывает события календаря и контакты on-prem ящика Exchange через EWS с NTLM.
Работает внутри OpenCode V2 как нативный TypeScript-плагин: Bun исполняет `src/index.ts` напрямую, сборка не нужна.

Проверено на Exchange 2016 (build 15.1.2507.6), NTLMv2, внутренний CA. Bun 1.4.2, `@opencode/plugin` 2.0.26,
117 тестов.

## Возможности

- 10 `mail_*` tools: аккаунты, папки, список, поиск, чтение, sync, черновик, отправка, календарь, контакты.
- Несколько ящиков в одном процессе: свои credentials и SQLite на аккаунт.
- Режимы хранения `off` / `metadata` / `full`; локальный SQLite-индекс в `metadata`/`full`, `off` = только EWS.
- EWS/NTLM с явным XML-экранированием, валидацией получателей и лимитами вложений.
- Таймаут и отмена запроса через `context.signal`; маршрутизация аккаунтов через `AsyncLocalStorage`.

### Стек

- [OpenCode V2](https://opencode.ai/v2/docs/) (`@opencode/plugin`)
- [Bun](https://bun.sh/) 1.4
- TypeScript 5.9 (strict)
- [Biome](https://biomejs.dev/) 2.5
- [`ews-javascript-api`](https://github.com/gautamsi/ews-javascript-api) 0.15.3 + `@ewsjs/xhr` 3.1.3
- SQLite + FTS5 через `bun:sqlite`

## Начало работы

### Требования

- OpenCode V2 с `@opencode/plugin` 2.0.26 (живая проверка в сессии — R5 — пока не выполнена)
- Bun 1.4.2 (проверено)
- Exchange on-prem с включённым EWS и доменной NTLM-учётной записью
- `NODE_EXTRA_CA_CERTS` с PEM корневого CA, если EWS за внутренним CA

### Установка

Из npm (рекомендуется):

```bash
opencode plugin add opencode-mail-exchange
```

Затем настройте плагин в `opencode.jsonc` (полный пример ниже). Из исходников:

```bash
git clone https://github.com/OniVe/opencode-mail-exchange.git
cd opencode-mail-exchange
bun install
```

и укажите `"package": "file:///C:/path/to/opencode-mail-exchange"` вместо npm-имени.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-mail-exchange",
      "options": {
        "storage": "metadata",
        "dataDir": "C:/Users/me/AppData/Local/opencode/mail-exchange",
        "accounts": [
          {
            "id": "primary",
            "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
            "username": "DOMAIN\\bot",
            "selfAddress": "bot@example.com"
          },
          {
            "id": "shared",
            "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
            "username": "DOMAIN\\sharedbot",
            "selfAddress": "shared@example.com"
          }
        ]
      }
    }
  ]
}
```

Пароли обычно берутся из env, по одному на аккаунт; inline `password` принимается, но не рекомендуется:

```bash
export MAIL_PASSWORD_PRIMARY='...'
export MAIL_PASSWORD_SHARED='...'
export NODE_EXTRA_CA_CERTS='/path/to/root-ca.pem'   # только для внутреннего CA
```

`MAIL_PASSWORD` — fallback, если per-account переменная не задана. `<ID>` — id аккаунта в верхнем регистре,
не-алфанумерика заменяется на `_`; единственный аккаунт получает `default`, несколько без явных id —
`account-1`, `account-2`, …

Без `NODE_EXTRA_CA_CERTS` Bun не доверяет внутреннему CA; симптом — непрозрачный
`undefined is not an object (evaluating 'response.headers')` из `@ewsjs/xhr`, а не `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

### Конфигурация

URL, логин и пароль не имеют значений по умолчанию. В примерах — `example.com`.

| Опция | Env | По умолчанию | Назначение |
|---|---|---|---|
| `accounts[]` | — | — | список аккаунтов; без него верхнеуровневые поля описывают один аккаунт |
| `id` | — | `default` / `account-N` | id аккаунта для аргумента `account`; `[A-Za-z0-9][A-Za-z0-9._-]*`; имя каталога в `<dataDir>/<id>` |
| `ewsUrl` | `MAIL_EWS_URL` | — (обязательно) | `https://server/EWS/Exchange.asmx`; `http://` принимается, но без шифрования |
| `username` | `MAIL_USER` | — (обязательно) | `DOMAIN\user`; NTLM требует домен |
| `password` | `MAIL_PASSWORD_<ID>` / `MAIL_PASSWORD` | — (обязательно) | пароль; рекомендуется env |
| `selfAddress` | `MAIL_SELF` | часть username (локальная часть, не адрес) | адрес ящика |
| `storage` | `MAIL_STORAGE` | `metadata` | `off` / `metadata` / `full`; неизвестное значение — `ConfigError` |
| `dataDir` | `MAIL_DATA_DIR` | `%LOCALAPPDATA%\opencode\mail-exchange\<hash>` / `~/.local/share/...` | корень; при `accounts` — `<dataDir>/<id>`, если аккаунт не задал свой `dataDir`; `<hash>` = `sha256(lowercase username)[:16]` |
| `maxMessages` | `MAIL_MAX_MESSAGES` | 2000 (max 20000) | размер локального индекса; дробное усекается, минимум 1 |
| `retentionDays` | `MAIL_RETENTION_DAYS` | 365 (max 3650) | TTL записей |
| `maxBodyBytes` | `MAIL_MAX_BODY_BYTES` | 100000 (max 1 000 000) | обрезка тела, байты UTF-8 |
| `syncIntervalMinutes` | `MAIL_SYNC_INTERVAL_MINUTES` | 5 (max 1440) | период обновления индекса |
| `allowSend` | `MAIL_ALLOW_SEND` | `true` | разрешить `mail.send`; `true/false/1/0/yes/no/on/off`; неизвестное значение — `ConfigError` |
| `requestTimeoutMs` | `MAIL_REQUEST_TIMEOUT_MS` | 30000 | таймаут EWS, мс (≤120000) |
| `codemode` | `MAIL_CODEMODE` | `false` | `false` — прямые tools; `true` — только через Code Mode `execute` (глобально) |
| `caFile` | `MAIL_CA_FILE` | — | проверка наличия PEM и подсказка про `NODE_EXTRA_CA_CERTS`; TLS-доверие задаёт только env |

Верхнеуровневые опции наследуются `accounts[]`; значения аккаунта перекрывают их, кроме `codemode` (глобальный).
`dataDir` должен быть обычным путём: extended-length (`\\?\`) и device (`\\.\`) namespace отвергаются с
`ConfigError`.

## Использование

### Инструменты

| Tool | Назначение |
|---|---|
| `mail_accounts` | список аккаунтов (id, адрес, EWS URL, режим хранения) |
| `mail_folders` | папки с unread/total |
| `mail_list` | письма в папке (метаданные, пагинация) |
| `mail_search` | локальный FTS + EWS-поиск по телу (Inbox), merge и дедупликация |
| `mail_get` | письмо + тело; `fetched` / `bodyCached` |
| `mail_sync` | инкрементальный `SyncFolderItems`; `{synced, complete}` |
| `mail_draft` | создать черновик |
| `mail_send` | отправить; `{sent: true}` (EWS `Send` не возвращает id) |
| `mail_calendar` | события за период |
| `mail_contacts` | контакты; `query` сканирует до 500 контактов страницами |

Права: `mail.read` (чтение), `mail.draft` (черновики), `mail.send` (отправка).
`account` выбирает ящик; по умолчанию первый аккаунт.
`codemode: false` (default) — tools видны напрямую; `codemode: true` — только через `execute`.

Область поиска: каждый поиск объединяет локальный FTS (`inbox`, `sent`, `drafts`, `deleted`) с EWS-поиском
по subject/body в `Inbox`, дедупликация по id; возвращаются самые новые `limit` совпадений. Остальные папки
EWS-половиной не покрываются. Один EWS-вызов `FindItems` (~0.5 с), один `LoadPropertiesForItems` (GetItem) для
непустой страницы и `BindToItems`, если в выдаче есть письма с неизвестными получателями.

Локальный FTS трактует пунктуацию внутри слова как границу токенов и сохраняет их смежность (`R&D` и
`R & D` ищут фразу `R D`). Числовые фрагменты и email-адреса сначала ищутся как фразовые префиксы, затем —
fallback по всем токенам (`202-10` находит `2026-10-23`).

Runtime-оговорка: имена tools, видимость `codemode` и permission-гейт определяются `@opencode/plugin` 2.0.26.
Живая проверка в сессии OpenCode — R5 в [docs/roadmap.md](docs/roadmap.md), пока не выполнена.

### Получатели

`SyncFolderItems` не возвращает `To`/`Cc`. Для страницы с неизвестными получателями `mail_list`/`mail_search`
делает один `BindToItems` (`ToRecipients` + `CcRecipients`) и кэширует результат; `mail_get` тоже обновляет
`to`/`cc`. `recipientsKnown: true` — значения достоверны (включая «получателей нет»);
`false` — enrichment не удался или не уложился в бюджет, `to` пуст, `cc` отсутствует.

Enrichment добавляет не более `min(2000, max(500, requestTimeoutMs/5))` мс задержки. При таймауте страница
возвращается с `recipientsKnown: false`, а enrichment паркуется на 60 секунд.

### Ошибки

Провал инструмента — успешный `Result` с `content: "ERROR: ..."` и `metadata.error: true`; хост видит
`completed`, а не упавший вызов. Стек-трейсы не отдаются. SOAP-ошибки сохраняют `Message`/`ErrorCode`;
таймаут, TLS и отмена переводятся в actionable-текст.

`mail_send` не идемпотентен: таймаут или отмена после `Send()` оставляют доставку неизвестной; повтор может
создать дубль. Предпочтителен `mail_draft` + явное подтверждение.

### Синхронизация

`mail_sync` возвращает `{synced, complete}`. `complete: false` — 50 раундов не хватило
(`MoreChangesAvailable` всё ещё true), вызовите снова. Неиндексируемые папки и `storage: "off"` возвращают
`{synced: 0, complete: true, skipped: "not-indexed" | "storage-off"}`.

## Хранение

SQLite (`bun:sqlite`, WAL, FTS5) в `dataDir`; при `accounts` — `<dataDir>/<id>/mail.db`.

- `off` — индекса нет, всё через EWS.
- `metadata` — заголовки, preview, FTS; тела по требованию.
- `full` — плюс кэш тел, до `maxBodyBytes`.

По умолчанию каталог вне проекта. Ограничений по расположению нет: если указать путь внутрь репозитория,
plaintext-индекс окажется там. Держите его вне проекта; `.gitignore` покрывает `mail.db*` и `*.sqlite*`, но не
принуждает. Extended-length и device namespace отвергаются (см. «Конфигурация»). Для шифрования диска
используйте BitLocker/EFS. Шифрование индекса — в плане [docs/roadmap.md](docs/roadmap.md) (R1).

## Лимиты

- HTML-тело: subject, body, имена получателей и вложений экранируются; без этого HTML сохраняется пустым
  без ошибки.
- Inline-картинки: `contentId` + `isInline`; HTML ссылается на `cid:<contentId>`.
- Вложения: 40 MiB (41.9 MB) на вложение и 10 на письмо, проверяются до EWS. Это лимиты на вложение/количество,
  не на суммарный запрос: 413 возможен, если суммарный запрос превышает лимит IIS/EWS. Память ~3.5–4.2× размера.
- Холодный старт: импорт EWS ~0.3 с; полная загрузка плагина ~0.4 с, RSS ~105 МБ; первый EWS-вызов добавляет
  ~0.45 с (live).
- Несколько ящиков: один процесс, свои credentials и SQLite на аккаунт, маршрутизация через `AsyncLocalStorage`.

## Не реализовано

- Чтение содержимого вложений: `mail_get` возвращает только метаданные.
- `mail_move`, флаги, reply/forward.
- Graph-бэкенд для Exchange Online.
- EPA `Require` на FE EWS: NTLM без channel binding не пройдёт.

## Roadmap

См. [docs/roadmap.md](docs/roadmap.md): шифрование SQLite с поиском по телу, Graph-бэкенд для Exchange Online,
свой XHR-провайдер вместо глобального патча axios.

## Риски

См. [risks.md](risks.md) — полный список (plaintext SQLite, поддержка библиотеки, EWS retirement в Exchange
Online, глобальный патч axios).

## Разработка

```bash
bun install
bun run typecheck
bun test
bun run lint
```

Живой smoke (read-only): `lab/smoke.ts`; env и CA: `lab/spike-ews/README.md`.

## Лицензия

MIT. См. [LICENSE](LICENSE).
