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

Проверено на Exchange 2016 (build 15.1.2507.6), NTLMv2, внутренний CA. Bun 1.4.2, `@opencode/plugin` 2.0.26.
Извлечение вложений — pure JS (без нативных модулей); CI на Linux, Windows и macOS. 276 тестов.

## Возможности

- 13 `mail_*` tools: аккаунты, папки, список, поиск, чтение, чтение вложения, удаление, очистка «Удаленных», sync, черновик, отправка, календарь, контакты.
- Несколько ящиков в одном процессе: свои credentials и SQLite на аккаунт.
- Режимы хранения `off` / `metadata` / `full`; локальный SQLite-индекс в `metadata`/`full`, `off` = только EWS.
- EWS/NTLM с явным XML-экранированием, валидацией получателей и лимитами вложений.
- Извлечение текста вложений: `.docx`/`.docm`, `.xlsx`/`.xlsm`, `.pdf` (текстовый слой) и plain text.
- Таймаут и отмена запроса через `context.signal`; маршрутизация аккаунтов через `AsyncLocalStorage`.

### Стек

- [OpenCode V2](https://opencode.ai/v2/docs/) (`@opencode/plugin`)
- [Bun](https://bun.sh/) 1.4
- TypeScript 5.9 (strict)
- [Biome](https://biomejs.dev/) 2.5
- [`ews-javascript-api`](https://github.com/gautamsi/ews-javascript-api) 0.15.3 + собственный NTLM XHR-провайдер (`axios` + `@ewsjs/ntlm-client`)
- [`fflate`](https://github.com/101arrowz/fflate) 0.8 + [`yauzl`](https://github.com/thejoshwolfe/yauzl) 3.4 (потоковый ZIP) + [`unpdf`](https://github.com/unjs/unpdf) 1.9 (PDF-текст в worker)
- [`saxes`](https://github.com/lddubeau/saxes) 6 (линейный OOXML SAX) + [`word-extractor`](https://github.com/morungos/node-word-extractor) 1.0 (legacy `.doc`) + [`@e965/xlsx`](https://www.npmjs.com/package/@e965/xlsx) 0.20 (legacy `.xls`)
- SQLite + FTS5 через `bun:sqlite`

## Начало работы

### Требования

- OpenCode V2 с `@opencode/plugin` 2.0.26 (живая проверка в сессии — R5 — пока не выполнена)
- Bun 1.4.2 (проверено)
- Exchange on-prem с включённым EWS и доменной NTLM-учётной записью
- Внутренний CA: `caFile` на аккаунт (применяется в рантайме); `NODE_EXTRA_CA_CERTS` — fallback для рантаймов без `tls.setDefaultCACertificates` и для standalone-скриптов

### Установка

Из npm (рекомендуется):

```bash
opencode plugin add opencode-mail-exchange
```

OpenCode ставит пакет в свой кэш (в Windows обычно
`C:\Users\<you>\.cache\opencode\npm\opencode-mail-exchange@latest\<timestamp>\node_modules\opencode-mail-exchange`);
`opencode plugin list` показывает запись плагина (ID, версия, источник). Плагин загружается при следующем перечитывании конфига. Запись
`"opencode-mail-exchange"` без `options` загружает плагин, но **не регистрирует** ни одного `mail_*` инструмента,
пока не настроены учётные данные (`options.accounts` или верхнеуровневые `ewsUrl`/`username`/`password`) — в логе
плагина будет `not configured`.

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

Пароли обычно берутся из env, по одному на аккаунт; inline `password` принимается, но не рекомендуется.
Для фонового сервиса OpenCode обычно проще `{file:...}`: подстановку делает загрузчик конфига, поэтому не нужен
ни рестарт сервиса, ни переменные окружения.

```jsonc
"accounts": [
  {
    "id": "primary",
    "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
    "username": "DOMAIN\\bot",
    "selfAddress": "bot@example.com",
    "password": "{file:C:/Users/me/.config/opencode/secrets/mail-primary.txt}"
  }
]
```

В файле — только пароль одной строкой. Env-переменные (`MAIL_PASSWORD_<ID>` / `MAIL_PASSWORD`) читает
**процесс фонового сервиса** при `setup()`, а не терминал, из которого запущен `opencode`; `.env` проекта
плагин не читает. `{env:VAR}` в конфиге тоже работает, но переменная всё равно должна быть в окружении сервиса.

`MAIL_PASSWORD` — fallback, если per-account переменная не задана. `<ID>` — id аккаунта в верхнем регистре,
не-алфанумерика заменяется на `_`; единственный аккаунт получает `default`, несколько без явных id —
`account-1`, `account-2`, …

С `caFile` плагин добавляет PEM в trust store рантайма через `tls.setDefaultCACertificates`, поэтому для EWS
`NODE_EXTRA_CA_CERTS` не обязателен. Если рантайм не поддерживает этот API, плагин предупреждает; задайте
`NODE_EXTRA_CA_CERTS` до запуска OpenCode. Отсутствующий путь `caFile` — это `ConfigError` при старте;
существующий, но нечитаемый или невалидный файл логируется и пропускается для этого аккаунта, а валидные
`caFile` всё равно применяются. Заменённый по тому же пути PEM переприменяется на следующем setup
(хэш содержимого). Ротация только добавляет доверие: старый корень остаётся доверенным до перезапуска
процесса; чтобы отозвать скомпрометированный CA, перезапустите OpenCode. Standalone-скрипты на Bun, импортирующие исходники плагина, не наследуют
trust store сервиса — запускайте их с `NODE_EXTRA_CA_CERTS=<root-ca.pem>` или внутри процесса OpenCode.
Ошибка TLS/CA показывается как `EWS TLS/CA handshake failed; check NODE_EXTRA_CA_CERTS...`.

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
| `requestTimeoutMs` | `MAIL_REQUEST_TIMEOUT_MS` | 30000 | таймаут EWS-вызова, мс (≤120000); покрывает весь вызов, включая NTLM preflight; висящий stream ограничен удвоенной величиной сокетной неактивности плюс `signal`/`disconnect` |
| `codemode` | `MAIL_CODEMODE` | `false` | `false` — прямые tools; `true` — только через Code Mode `execute` (глобально) |
| `caFile` | `MAIL_CA_FILE` | — | PEM корневого/промежуточного CA; применяется в trust store рантайма при setup (fallback: `NODE_EXTRA_CA_CERTS`); отсутствующий путь — `ConfigError`, невалидное содержимое логируется и пропускается |

Верхнеуровневые опции наследуются `accounts[]`; значения аккаунта перекрывают их, кроме `codemode` (глобальный).
`dataDir` должен быть обычным путём: extended-length (`\\?\`) и device (`\\.\`) namespace отвергаются с
`ConfigError`.

## Использование

### Инструменты

| Tool | Назначение |
|---|---|
| `mail_accounts` | список аккаунтов (id, адрес, EWS URL, режим хранения) |
| `mail_folders` | папки с unread/total |
| `mail_list` | письма в папке (метаданные, включая `size`; `attachmentCount`, когда известен; пагинация) |
| `mail_search` | локальный FTS + EWS-поиск по телу (Inbox), merge и дедупликация; те же поля, что у `mail_list` |
| `mail_get` | письмо + тело; `size` (когда известен), `attachmentCount` (когда известен), `fetched` / `bodyCached` |
| `mail_read_attachment` | список вложений или текст из `.doc`/`.docx`, `.xls`/`.xlsx`, `.pdf`/plain text (`index` или `attachmentId`; `sheet` для Excel) |
| `mail_save_attachment` | сохранить файл вложения в `<dataDir>/attachments/...` и вернуть `path`, `size`, `sha256` |
| `mail_delete` | удалить по id; soft (в «Удаленные»; старый id становится недействительным) или `hard: true` (безвозвратно) |
| `mail_empty_deleted` | безвозвратно удалить элементы верхнего уровня «Удаленных» (подпапки остаются); требует `confirm: true` |
| `mail_sync` | инкрементальный `SyncFolderItems`; `{synced, complete}` |
| `mail_draft` | создать черновик |
| `mail_send` | отправить; `{sent: true}` (EWS `Send` не возвращает id) |
| `mail_calendar` | события за период |
| `mail_contacts` | контакты; `query` сканирует до 500 контактов страницами |

Права: `mail.read` (чтение), `mail.draft` (черновики), `mail.send` (отправка), `mail.delete`
(`mail_delete` и `mail_empty_deleted`). `mail_empty_deleted` необратим и требует `confirm: true`; `confirm` —
защита на уровне модели, а фактический гейт — право `mail.delete`. Для остального предпочитайте soft-удаление
(`mail_delete` без `hard`).
`account` выбирает ящик; по умолчанию первый аккаунт.
`codemode: false` (default) — tools видны напрямую; `codemode: true` — только через `execute`.

### Удаление

`mail_delete` по умолчанию переносит письма в «Удаленные»; `hard: true` удаляет их безвозвратно.
`mail_empty_deleted` безвозвратно удаляет элементы верхнего уровня «Удаленных»; подпапки остаются.
Обоим нужно право `mail.delete`; `mail_empty_deleted` дополнительно требует `confirm: true`.

В локальном индексе оба режима помечают затронутые строки tombstone. Exchange присваивает новый ItemId при
переносе в «Удаленные», поэтому старый id становится недействительным: выполните `mail_sync` для `deleted`,
чтобы получить новый id; обычный `mail_list` может отдать свежий кэш и не показать новую строку до
следующего интервала sync. `mail_get`/`mail_delete` по старому id будут падать до синхронизации. Очистка также помечает tombstone все проиндексированные строки `deleted`. Если EWS отклонил весь пакет,
индекс не меняется; при ошибках по части элементов применяются только подтверждённые удаления, а вызов
падает со счётчиками и первой причиной. Транспортная ошибка после запроса может оставить исход неизвестным:
перед повтором выполните `mail_sync`.

Id передаются в EWS `DeleteItem`, поэтому передавайте только mail-id. Если передан id встречи, EWS удалит её
с `SendToNone` (участники не получат отмену); плагин не различает классы элементов до удаления.

### Вложения

`mail_read_attachment` показывает вложения письма (только `messageId`) или извлекает одно: передайте `index`
(позиция в текущем списке) или `attachmentId` из списка. Для повторного чтения используйте `attachmentId`;
`index` позиционный и может указывать на другой файл, если письмо изменилось. Поддерживаются `.doc`/`.docx`/`.docm`,
`.xls`/`.xlsx`/`.xlsm`, `.pdf` (только текстовый слой) и plain text (`text/*`, `.txt`, `.csv`, `.json`, `.xml`,
`.html`, ...). Legacy `.doc`/`.xls` читаются pure-JS OLE/BIFF-парсерами; картинки и прочие бинарные форматы
не декодируются.

`mc:AlternateContent`: побеждает первый `mc:Choice`, давший текст; последующие Choice и `mc:Fallback` игнорируются.

Чтение ограничено: 20 MiB на вложение, первые 200 страниц PDF (`truncated: true`, если страниц больше),
ZIP-лимиты 32 MiB на нужный entry и 64 MiB суммарно, 50 листов / 5 000 строк / 500 000 ячеек / 1 000 колонок,
1 000 000 символов (`maxChars`, по умолчанию 100 000, минимум 1 000). Для Excel можно передать `sheet`
(имя листа или номер с 1) — тогда извлекается один лист с полным лимитом символов, а кэш не используется.
Если имя листа числовое, точное имя побеждает номер. Обрезанный текст помечается
`truncated: true`; сканированный PDF вернёт пустой текст и note (OCR нет). PDF и офисные форматы
(DOCX/XLSX/legacy) разбираются в worker (таймаут 15 с), отмена завершает worker. Текстовые вложения
декодируются в процессе. Это не блокирует event loop плагина крафтовым вложением. Память worker'а рантаймом
Bun не ограничивается: пик пропорционален входу (замер ~650 МБ на legacy `.xls` 17.7 МБ), внешняя граница —
лимит вложения 20 MiB. Невалидный XML (необъявленный префикс пространства имён или неизвестная сущность)
отклоняется с ошибкой, а не разбирается частично.

`mail_save_attachment` сохраняет исходный файл в `<dataDir>/attachments/<hash>/<name>` (только туда; имя санитизируется, расширение сохраняется) и возвращает абсолютный путь, имя записанного файла, размер и sha256 — агент может разобрать большой файл своим кодом. Лимит тот же — 20 MiB.

При `storage: full` извлечённый текст кэшируется по требованию в `attachment_text` + `attachment_fts`
(фоновой загрузки нет) для писем, уже присутствующих в локальном индексе (сначала `mail_sync`). Повторное
чтение по `attachmentId` не ходит в EWS; `mail_search` дополнительно возвращает совпадения по кэшу вложений
как `attachmentMatch: {id, name, snippet}`. Кэш инвалидируется при delete/empty/prune и при sync-изменении
`hasAttachments`/`attachmentCount`; заменённое вложение с тем же количеством может сохранить старый текст.
`storage: metadata` и `off` этот кэш не пишут; переключение с `full` удаляет сохранённый текст
(`attachment_text`/`attachment_fts`), поэтому возврат в `full` снова начинает с холодных чтений.

### Поля письма

`mail_list`, `mail_search` и `mail_get` отдают `size` (EWS `ItemSize`, байты), если размер пришёл в
summary. На живой EWS-странице поля приходят из уже запрошенного `AllProperties`; кэшированная страница
без них делает максимум один batch `BindToItems` (Size/HasAttachments/Attachments + To/Cc, без Body) и
сохраняет результат; подтверждённый Success не повторяется, а Error/Warning/пустой batch повторяется
после 60-секундного кулдауна. `attachmentCount` (включая inline-вложения)
присутствует, когда элемент загружен со свойством `Attachments`: в `mail_get`, выполняющем bind, и в
результатах `mail_list`/`mail_search` с живой EWS-страницы или после этого batch. Для кэшированной строки
0 выводится из `hasAttachments: false`; при наличии вложений count отсутствует до живого bind. Это
кэшированное измерение, и после изменения вложений оно может устареть. У тела, закэшированного старой
версией, оба поля могут отсутствовать. `hasAttachments` остаётся дешёвым boolean. `mail_get` сохраняет полученные
`size`/`attachmentCount` в локальный индекс. Строки с неподтверждённой batch-загрузкой (`Error`/`Warning`)
отбрасываются. Если вся batch-загрузка упала, строки возвращаются как envelope из FindItems: `id`, `subject`,
`size`, `hasAttachments`; `attachmentCount` нет, `recipientsKnown` = `false`; кэшированный/search-путь
дозаполняет получателей лениво, а live-страница `mail_list` отдаёт envelope как есть (в `to` может быть пусто).

Область поиска: каждый поиск объединяет локальный FTS (`inbox`, `sent`, `drafts`, `deleted`) с EWS-поиском
по subject/body в `Inbox`, дедупликация по id; возвращаются самые новые `limit` совпадений. При
`storage: full` локальная выдача включает текст закэшированных вложений; такие строки несут
`attachmentMatch` (EWS-половина вложения не ищет). Остальные папки EWS-половиной не покрываются. Один
EWS-вызов `FindItems` (~0.5 с), один `LoadPropertiesForItems` (GetItem) для непустой страницы и
`BindToItems`, если в выдаче есть письма с неизвестными получателями или без `size`/`attachmentCount`;
этот batch не запрашивает `Body`.

Локальный FTS трактует пунктуацию внутри слова как границу токенов и сохраняет их смежность (`R&D` и
`R & D` ищут фразу `R D`). Числовые фрагменты и email-адреса сначала ищутся как фразовые префиксы, затем —
fallback по всем токенам (`202-10` находит `2026-10-23`).

Runtime-оговорка: имена tools, видимость `codemode` и permission-гейт определяются `@opencode/plugin` 2.0.26.
Живая проверка в сессии OpenCode — R5 в [docs/roadmap.md](docs/roadmap.md), пока не выполнена.

### Получатели

`SyncFolderItems` не возвращает `To`/`Cc`. Для страницы с неизвестными получателями или без
`size`/`attachmentCount` `mail_list`/`mail_search` делает один `BindToItems` (`ToRecipients` + `CcRecipients`
+ `Size` + `HasAttachments` + `Attachments`, без `Body`) и кэширует результат; `mail_get` тоже обновляет
`to`/`cc`. `recipientsKnown: true` — значения достоверны (включая «получателей нет»);
`false` — enrichment не удался или не уложился в бюджет, `to` пуст, `cc` отсутствует.

Бюджет enrichment покрывает ожидание EWS (`min(2000, max(500, requestTimeoutMs/5))` мс); запись страницы
в SQLite — локальная работа и в бюджет не входит. При таймауте, транспортной ошибке или non-Success batch
неподтверждённые строки возвращаются с неизвестными полями, а enrichment паркуется на 60 секунд.

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
- `full` — плюс кэш тел (до `maxBodyBytes`) и on-demand кэш текста вложений + FTS.

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
- Чтение текста вложений: 20 MiB на файл, первые 200 страниц PDF, ZIP-лимиты 32 MiB/64 MiB, 50 листов /
  5 000 строк / 500 000 ячеек / 1 000 колонок, 1 000 000 символов; чтение по листам Excel; legacy `.doc`/`.xls`; OCR нет.
- Холодный старт: импорт EWS ~0.3 с; полная загрузка плагина ~0.4 с, RSS ~105 МБ; первый EWS-вызов добавляет
  ~0.45 с (live).
- Несколько ящиков: один процесс, свои credentials и SQLite на аккаунт, маршрутизация через `AsyncLocalStorage`.

## Не реализовано

- OCR сканированных PDF.
- `mail_move`, флаги, reply/forward.
- Graph-бэкенд для Exchange Online.
- EPA `Require` на FE EWS: NTLM без channel binding не пройдёт.

## Roadmap

См. [docs/roadmap.md](docs/roadmap.md): шифрование SQLite с поиском по телу, Graph-бэкенд для Exchange Online.

## Риски

См. [risks.md](risks.md) — полный список (plaintext SQLite, поддержка библиотеки, EWS retirement в Exchange
Online).

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
