# gigachat-agent

GigaChat (Сбер) как основная модель или сабагент в **opencode** и как сабагент в **Claude Code**. Работает и из Codex и Cursor через MCP.

> **Важно: нужен сертификат Минцифры, но только файлом.** Серверы GigaChat подписаны корневым сертификатом Минцифры (Russian Trusted Root CA), которого нет в системе. Скачайте его в обычный файл и укажите путь в `GIGACHAT_CA_BUNDLE_FILE`. **Ставить его в систему (связку ключей macOS, хранилище Windows) не нужно и не стоит**: файл использует только этот инструмент, остальные программы ему не доверяют. Без него будет ошибка `The TLS certificate ... is not trusted (SELF_SIGNED_CERT_IN_CHAIN)` с подсказкой, что делать. Как получить: [docs/install/setup.md](docs/install/setup.md).

Что внутри:

- **Плагин opencode**: провайдер `GigaChat (Sberbank)`, его можно выбрать основной моделью или сделать сабагентом.
- **MCP-сервер** (stdio): инструменты `ask`, `run_agent`, `continue_session`, `list_models`. Живёт только вместе с сессией клиента, постоянных процессов нет.
- **Автовыбор модели** `auto`: берёт лучшую из доступных (Ultra, Max, Pro, Lite) и переходит к следующей, когда у модели закончились токены.

## Статус

Проверено вживую на macOS (Node 24, opencode 1.18.29, Claude Code 2.1). Windows **не проверялся**, инструкция для него составлена по документации. Полный список проверенного и нет: [справочник](docs/reference.md#что-проверено).

## Что нужно

- Node.js 24+ (для MCP-сервера) и `opencode` в `PATH` (для плагина и `run_agent`)
- Client ID и Client Secret GigaChat из кабинета Sber Developers
- Корневой сертификат Минцифры (файлом, в систему ставить не нужно)

Ставится из npm (`opencode-gigachat` и `gigachat-agent-mcp`): клонировать и собирать ничего не нужно. Из исходников: [docs/install/setup.md](docs/install/setup.md#установка-из-исходников-для-разработки).

## Начать за 3 шага

### Шаг 1. Общая установка (один раз)

Сертификат Минцифры и файл `~/.config/gigachat/.env` с ключами: [docs/install/setup.md](docs/install/setup.md) (macOS и Windows).

### Шаг 2. Выбрать, где использовать

**opencode (основная модель или сабагент).** Добавьте плагин в `~/.config/opencode/opencode.json`, затем сохраните ключ и проверьте:

```json
{ "plugin": ["opencode-gigachat"] }
```

```bash
opencode providers login --provider "GigaChat (Sberbank)"
opencode run --model "GigaChat (Sberbank)/auto" -- "ответь одним словом: привет"
```

Основной моделью выбирается в `/models`, сабагентом задаётся в `opencode.json`. Все детали и конфиг сабагента: [docs/install/opencode.md](docs/install/opencode.md).

**Claude Code (сабагент):**

```bash
claude mcp add --scope user gigachat -- npx -y gigachat-agent-mcp
claude mcp list
```

Дальше достаточно сказать «спроси у GigaChat …», а для постоянного сабагента положить файл `.claude/agents/gigachat.md`. Файл-образец, нужные разрешения и что требуется для `run_agent`: [docs/install/claude-code.md](docs/install/claude-code.md).

### Шаг 3. Выбрать модель

Модель `auto` сама берёт лучшую доступную. Как её настроить и как выбрать конкретную: [docs/config/models.md](docs/config/models.md).

## Документация

**Установка и работа с клиентами** (`docs/install/`)

| Файл | О чём |
|---|---|
| [setup.md](docs/install/setup.md) | Общая установка: что ставится из npm, сертификат Минцифры, ключи; macOS и Windows; установка из исходников |
| [opencode.md](docs/install/opencode.md) | GigaChat в opencode: основной моделью и сабагентом |
| [claude-code.md](docs/install/claude-code.md) | GigaChat сабагентом в Claude Code, разрешения, частые ошибки |

**Настройка** (`docs/config/`)

| Файл | О чём |
|---|---|
| [models.md](docs/config/models.md) | Выбор модели, автовыбор `auto`, схема переключения, ошибки токенов |
| [vpn-and-hosts.md](docs/config/vpn-and-hosts.md) | Работа под VPN, новый хост `api.giga.chat`, как его включить |

**Справочник**

| Файл | О чём |
|---|---|
| [reference.md](docs/reference.md) | Переменные, инструменты MCP, безопасность, ограничения, что проверено, решения по устройству |

## Разработка

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Спецификации и план: `openspec/changes/gigachat-subagent/`. Тесты пишутся раньше кода.
