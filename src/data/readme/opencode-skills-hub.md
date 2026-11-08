# skills-hub

Сервер и плагин opencode для централизованной раздачи Agent Skills по HTTP.

## Быстрый старт

### Сервер: Docker Compose

```bash
cp .env.example .env
# задайте SKILLS_HUB_ADMIN_TOKEN в .env
docker compose up -d --build --wait
```

Откройте `http://127.0.0.1:8788` (с других машин — `http://<ip-хоста>:8788`) и войдите токеном из `.env`.

### Сервер: готовый образ (опционально)

Образ публикуется workflow `Release` по push тега `v*`. До первого релиза используйте локальную сборку.

```bash
export SKILLS_HUB_IMAGE=ghcr.io/arkaneman/skills-hub:<tag>
docker compose pull
docker compose up -d --no-build
```

Теги: стабильный тег без `-` (`v0.0.4`) даёт `0.0.4`, `0.0` и `latest`; prerelease-тег (`v0.1.0-rc.1`) даёт версию, `major.minor` и `edge`.

Хаб рассчитан на работу внутри локальной сети по HTTP. Если понадобится доступ извне, поставьте reverse proxy и задайте в `.env`:

```dotenv
PUBLIC_URL=https://hub.example.com
TRUST_PROXY=true
REQUIRE_TLS=true
```

TLS терминирует proxy (Caddy, nginx). Порт в интернет не публикуйте.

### Плагин opencode 1.19.x

```bash
opencode plugin opencode-skills-hub
```

Пакет `opencode-skills-hub` публикуется тем же workflow по push тега. Для локальной проверки до релиза подключайте плагин из сборки репозитория.

Или вручную в `opencode.json`:

```json
{
  "plugin": [
    ["opencode-skills-hub", {
      "apiUrl": "https://hub.example.com",
      "buckets": ["default"],
      "token": "{env:SKILLS_HUB_TOKEN}"
    }]
  ]
}
```

`plugin` это массив верхнего уровня. Вариант `["opencode-skills-hub"]` тоже подходит, если `apiUrl` задан в `.opencode/skills-hub.json` или глобальном конфиге, а токен через `SKILLS_HUB_TOKEN`.

Создайте read-токен и бакет:

```bash
docker compose exec skills-hub node dist/cli.js bucket add default Default "Default bucket"
docker compose exec skills-hub node dist/cli.js token create laptop --scopes skills:read,buckets:read --buckets default
docker compose exec skills-hub node dist/cli.js token create mcp-agent --scopes skills:read,skills:write,buckets:read --buckets default
```

MCP использует обычный токен: подключитесь к `POST /mcp` с `Authorization: Bearer <token>`. Права токена можно изменить позже во вкладке Tokens или через `PATCH /api/v1/admin/tokens/:id` — секрет при этом не меняется.

Токен показывается один раз. Передайте его через `SKILLS_HUB_TOKEN` или `"token": "{env:SKILLS_HUB_TOKEN}"`. Отдельный `npm install` для плагина не нужен: opencode ставит npm-плагины при старте.

Клиентскому токену плагина достаточно `skills:read,buckets:read`. MCP-токен по умолчанию получает `skills:read,skills:write,buckets:read`; `skills:delete` выдаётся только явно.

Конфиг бывает глобальный (`~/.config/opencode/opencode.json`) и проектный (`opencode.json` или `.opencode/opencode.json`). При совпадении пакета проектный конфиг побеждает, поэтому регистрируйте плагин в одном месте.

**Важно для 1.19.x:** `opencode plugin add` и объектная форма `"plugins": { "package": ..., "options": ... }` относятся к v2 и здесь не работают.

## Проверка

```bash
curl -fsS http://127.0.0.1:8788/health
```

Если плагин уже подключён:

```bash
opencode debug skill
```

Команда показывает скиллы, доступные opencode. Для чистой проверки используйте временный `HOME` и проект.

## Разработка

Нужны Node.js >= 22.5, git >= 2.30 и opencode 1.19.x для клиентской части.

```bash
npm ci --include=dev
npm run typecheck
npm test
npm run build
npm start                    # dev, tsx
node apps/server/dist/main.js  # собранный сервер
npm run test:e2e             # нужен opencode в PATH или OPENCODE_BIN
```

`npm run build` собирает оба пакета через tsup. Сервер: `apps/server/dist/main.js`, `apps/server/dist/cli.js`, `apps/server/dist/migrations/0001_init.sql`; статика остаётся в `apps/server/public`. Плагин: `apps/plugin/dist`, standalone-пакет без runtime-зависимости от workspace.

Для локального подключения плагина положите в `.opencode/plugins/skills-hub.ts`:

```ts
export { default } from "/absolute/path/to/apps/plugin/src/index.ts"
```

## Обновление

Локальная сборка:

```bash
docker compose up -d --build
```

Опубликованный образ:

```bash
export SKILLS_HUB_IMAGE=ghcr.io/arkaneman/skills-hub:<tag>
docker compose pull
docker compose up -d --no-build
```

Данные лежат в volume `skills-hub-data` и переживают пересоздание контейнера. Перед обновлением между несовместимыми версиями сделайте backup `DATA_DIR`.

## Документация

- [`docs/design.md`](docs/design.md): архитектура, API, конфигурация, безопасность.
- [`docs/journal.md`](docs/journal.md): журнал реализации и открытые задачи.
- [`docs/publishing.md`](docs/publishing.md): релизы npm/GHCR для мейнтейнеров.
- [`apps/plugin/README.md`](apps/plugin/README.md): страница npm-пакета.
- [`AGENTS.md`](AGENTS.md): правила работы с репозиторием.

## Ограничения текущего среза

- Push worker поддерживает только `https://` remotes; `ssh://` валидируется, но транспорт по умолчанию ограничен https.
- Один экземпляр: SQLite и git требуют одного writer.
- `skills:delete` для MCP выдаётся только явно.
- Сценарий с двумя хостами ещё не проверен.

## Конфигурация сервера

| Env | По умолчанию | Смысл |
|---|---|---|
| `HOST` / `PORT` | `0.0.0.0` / `8788` | адрес API |
| `DATA_DIR` | `./data` | `hub.db`, `repos/`, `locks/`, `trash/` |
| `PUBLIC_URL` | нет | внешний URL, Secure cookie, Origin |
| `SKILLS_HUB_ADMIN_TOKEN` | обязателен | admin-токен для входа |
| `SESSION_TTL_HOURS` | `12` | TTL сессии |
| `TRUST_PROXY` | `false` | доверять `X-Forwarded-*` |
| `REQUIRE_TLS` | `false` | требовать TLS |
| `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` | `skills-hub` / `hub@skills-hub.local` | identity коммитов |
| `GIT_PUSH_ENABLED` | `true` | выключатель push |
| `MAX_MANIFEST_*` | см. `docs/design.md` | лимиты манифеста |

## MCP write flow

Агент пишет скилл по файлам:

1. `put_skill_file` с `path="SKILL.md"` создаёт скилл; frontmatter `name` должен совпадать.
2. `put_skill_file` с `references/...` добавляет файлы; каждый вызов это отдельный git-коммит.
3. `delete_skill_file` удаляет файл, кроме `SKILL.md`.
4. `delete_skill` удаляет скилл целиком и требует `skills:delete`.

## Как работает плагин

Плагин читает настройки слоями, поздний побеждает:

1. значения по умолчанию;
2. `~/.config/opencode/skills-hub.json`;
3. опции плагина в `opencode.json`;
4. `.opencode/skills-hub.json` проекта.

Поведение:

- отдаёт opencode скиллы из активной копии кэша;
- при наличии `mcpToken` подключает MCP-сервер `skills-hub`, не перезаписывая ваш собственный;
- при недоступном хабе opencode стартует из последней сохранённой копии;
- при совпадении имён в разных бакетах побеждает последний в порядке `buckets` и `bucketsAdd`.
