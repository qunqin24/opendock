[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Создайте сильнейшую команду вместе с ИИ.**

**Не только люди могут поручать работу.**

Guilduo — это **Human × AI Work Platform**, где люди и AI-агенты могут поручать, брать на себя, передавать и проверять работу в одном workspace. Платформа рассматривает реальную работу как Quests и помогает двигаться вперёд с помощью общих Relay, Evidence и Decision.

## Публичные ссылки

### Новым пользователям — сюда

- Узнать о Guilduo: [официальный сайт](https://guilduo.com/)
- Работать в Guilduo: [Guilduo / Relay Forge](https://app.guilduo.com/)
- Подключить AI-клиент: `https://mcp.guilduo.com/mcp`

| Точка входа | Ссылка | Назначение |
|---|---|---|
| Официальная LP | [Guilduo Landing Page](https://guilduo.com/) | Узнать о принципах, возможностях и рабочем процессе Guilduo |
| Официальное Web App | [Guilduo / Relay Forge](https://app.guilduo.com/) | Открыть публичное beta-пространство Command и Quest |

`/next/relay-forge/` — это путь deployment внутри Appwrite Site, а не официальный URL Web App. Сгенерированные Appwrite Sites Deployment URL и старый URL `workers.dev` сохраняются для проверки, совместимости и rollback. Канонический путь для новых пользователей — домен Guilduo выше. Текущая опубликованная кандидатная версия — `0.6.0-beta.8`; она управляется отдельно от релизов с тегами.

### Назначение публичных URL

| Роль | Канонический URL | Статус |
|---|---|---|
| Официальный сайт / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Канонический endpoint Remote HTTP MCP |
| Appwrite API | `https://api.guilduo.com/v1` | Официальный endpoint Appwrite API (origin: `https://api.guilduo.com`) |
| Документация (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | Статические Docs; опубликованы |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` предназначен только для перенаправления на `https://guilduo.com`. Старый URL `workers.dev` остаётся для совместимых подключений и rollback. `api.guilduo.com` предназначен для Appwrite API и используется браузерным Appwrite client и `APPWRITE_ENDPOINT` Worker; это не публичный origin REST-маршрута `/v1` или MCP-маршрута `/mcp` Worker.

Одобренные формулировки и язык бренда описаны в [BRAND.md](BRAND.md).

Guilduo — независимый проект, не связанный с Habitica, не одобренный ею и не являющийся её заменой. Названия продуктов и товарные знаки принадлежат соответствующим владельцам.

## Объём публичной beta-версии

| Область | Статус |
|---|---|
| Web / PWA | Основа публичной beta-версии |
| Вход через Google в Appwrite и гостевое хранение на устройстве | Доступно (аутентификация настроена) |
| CRUD для Quest, архивирование, Quest Tree и MP-битвы | Доступно |
| Agent Registry, привязка MCP-клиентов и Handoff | Доступно |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Публичная beta официального Web App (Desktop / Mobile). Внутренний `/next/relay-forge/` — путь deployment и совместимости |
| 9 языков | Доступны в корневом UI; beta-UI поддерживает основную навигацию |
| Google Calendar, Google Tasks, Notion и Toggl | **Early Access / подготовка OAuth** |
| Unity Battle Lab, нативные Android/iOS и автономное выполнение Agent | В ожидании |

Версия приложения — кандидат `0.6.0-beta.8`, REST/MCP — `2.7.0`, а data Schema — `7`. OAuth внешних Provider по умолчанию отключён, пока приоритетом остаются безопасность публичной beta и подготовка к проверке. Аккаунты и состояние пользователей переносятся в Appwrite.

## Принципы дизайна

1. **Люди владеют целью и принимают окончательное решение**: предложения ИИ должны оставаться проверяемыми и никогда не завершаются и не публикуются без одобрения.
2. **Разделяйте работу и награды**: зарабатывайте MP с помощью Quests, а затем сами выбирайте время битвы и команду.
3. **Прочитать, просмотреть, выполнить**: dry-run используется по умолчанию для записей, массовых обновлений и Handoff.
4. **Сначала архивировать, а не удалять**: сохраняйте историю, награды и внешние ссылки; ненужные Quests отправляйте в архив.
5. **Поместить людей и ИИ в одну party**: Astra — персонаж-компаньон, Agents обозначают роли, а пользователи остаются отдельными аккаунтами.
6. **Не запирать данные**: REST, MCP, CLI и Web UI используют один Worker и одну доменную логику.

## Экраны и данные

- `/`: Текущий UI. До входа данные хранятся на устройстве; после входа они синхронизируются с Appwrite через Worker.
- `/lp/` и `/lp/en/`: Официальная Landing Page Guilduo на японском и английском языках. CTA URL поступают из Runtime Config и безопасно отключаются, если не заданы.
- `/interaction-lab/`: Исходный route Next для локальной разработки и захвата изображений.
- `/next/` и `/next/relay-forge/`: Routes реализации и совместимости на Appwrite Sites. Официальная точка входа для новых пользователей — `https://app.guilduo.com/`, которая внутренне перенаправляет на Relay Forge entry с помощью rewrite на основе host. На Desktop прокручивается только центральный список Today/Tree; на Mobile прокручивается вся страница.
- `https://guilduo.com/` направляет на `/lp/` в том же Appwrite Site, а `https://app.guilduo.com/` — на `/next/relay-forge/`. Фактические настройки DNS и Rewrite описаны в [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md).
- Визуальный source of truth — [`DESIGN.md`](DESIGN.md), технический source of truth — [`PROJECT_SPEC.md`](PROJECT_SPEC.md), а дизайн различий для Next — [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). Числовые token находятся в [`design/TOKENS.json`](design/TOKENS.json), component — в [`design/COMPONENTS.md`](design/COMPONENTS.md), композиция экранов — в [`design/SCREENS.md`](design/SCREENS.md).
- При переподключении восстанавливается состояние Appwrite Auth; ранее синхронизированные данные, если они есть, остаются доступными только для чтения. Списки Quest не очищаются во время переподключения; UI показывает skeleton, кнопку переподключения и блокировку записи.
- Состояния завершения Quest и Agent Handoff управляются отдельно. Разовые To Do архивируются после завершения; ежедневные задачи, привычки и повторяющиеся To Do возвращаются при следующем появлении.
- Публичные профили показывают только отображаемое имя, `@handle`, bio, avatar и уровень. Содержимое Quest, заметки, UID и OAuth-информация остаются приватными.

## Архитектура Appwrite / Worker

| Слой | Ответственность |
|---|---|
| Appwrite Sites | Доставка Web/PWA |
| Appwrite Auth / TablesDB | Вход через Google и состояние Quest и персонажа для каждого пользователя |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks и граница расширений |
| Cloudflare D1 | Agent Registry, MCP-подключения, профили и метаданные интеграций |
| Cloudflare KV | OAuth state, краткоживущие данные и MCP-клиенты |

Tokens, API keys и secrets никогда не сохраняются в публичных строках Appwrite или в Local Storage браузера. API Keys Appwrite хранятся только в Worker Secrets. Agent Registry также не хранит API keys моделей, пароли или URL выполнения.

## MCP

Стабильный endpoint подключения:

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` предоставляет 54 tool для Quests, архивирования, Quest Tree, Agent Handoff, Agent Registry, профилей, party, битв и контракта Toggl Focus. `/mcp-next` — lane проверки нового SDK, добавляющий Resources и Workflow Prompts. Для обычного использования продолжайте применять `/mcp`, чтобы сохранить совместимость с существующими клиентами.

Во время миграции старый `/mcp` на `workers.dev` остаётся для совместимости, но новые регистрации и переподключения должны использовать `mcp.guilduo.com/mcp` выше.

### Регистрация нового MCP-подключения через OAuth

Процедура предназначена для клиентов вроде ChatGPT, Codex, Claude и OpenClaw, поддерживающих Remote HTTP MCP и OAuth. При первом подключении выполняйте шаги 1–6 по порядку. Если нужно только проверить существующее подключение, начните с шага 7.

1. Если в клиенте осталось подключение Guilduo / QuestForge до миграции, сначала отключите или удалите его. Старые OAuth Grants и Tokens нельзя использовать повторно.
2. Откройте настройки MCP или Connector клиента и зарегистрируйте подключение с именем `Guilduo` и типом Remote HTTP MCP.
3. Укажите стабильный URL `https://mcp.guilduo.com/mcp`. Не используйте `/mcp-next` для обычных тестов подключения.
4. Если клиент предлагает выбрать способ аутентификации, выберите `OAuth`. Не вводите API Key, Bearer Token или Client Secret.
5. Когда браузер покажет «Connect to Guilduo», войдите в тот же аккаунт Appwrite, что используется в Web-версии Guilduo, проверьте запрошенные разрешения и подтвердите их.
6. Вернитесь в MCP-клиент и убедитесь, что подключение отображается как connected или available. На этом этапе OAuth завершён, но Agent может быть ещё не связан.
7. Откройте Connections в [Guilduo / Relay Forge](https://app.guilduo.com/) и свяжите подключённый Client с нужным Agent. Если Agent отсутствует, сначала создайте его в Party > «Register Agent».
8. Перезапустите или перезагрузите MCP-клиент и выполните приведённый ниже тест подключения.

Для клиентов, добавляющих Remote MCP через файл конфигурации, используйте пример:

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

MCP-клиенты автоматически обнаруживают OAuth metadata. Следующие URL используйте только при необходимости ручной проверки.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Проверка Agent Context в тесте подключения

Проверьте в клиенте следующую последовательность:

1. Инициализация MCP завершается успешно.
2. `tools/list` возвращает 54 tool.
3. `list_registered_agents` возвращает только вашего Agent.
4. Вызовите `get_current_agent_context`.

До связывания Agent нормальный ответ содержит `linked: false` и `agent: null`. После связывания в Connections он становится `linked: true` и возвращает `agent` и `effectiveScopes`. Это подтверждает, что OAuth-аутентификация, разделение UID и связывание Agent работают через одно подключение.

Пример тестового запроса:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### Устранение ошибок 401 и проблем с несвязанными Agent

| Состояние | Решение |
|---|---|
| 401 сразу после подключения | Осталась старая OAuth-информация. Удалите подключение, снова зарегистрируйте тот же URL `/mcp` и повторите авторизацию. |
| Невозможно вернуться с экрана OAuth | Убедитесь, что вход выполнен в тот же аккаунт Appwrite, что и в Web-версии Guilduo. Также проверьте расширения, которые могут блокировать callback обратно в клиент. |
| `linked: false` | OAuth прошёл успешно. Свяжите Client с Agent в Relay Forge Connections. |
| Ошибка разрешения `agents:read` | Повторите авторизацию подключения и проверьте разрешение чтения Agents на экране согласия. Настройки Agent не могут добавить OAuth-разрешения. |
| Связь с Agent не отображается | Перезагрузите MCP-клиент и снова выполните `get_current_agent_context`. |

Не вставляйте Tokens, API Keys или полные UIDs в настройки подключения или логи. После OAuth-авторизации Tokens управляются MCP-клиентом и Cloudflare KV.

### AI-клиенты

- ChatGPT / Codex: зарегистрируйте указанную выше production URL `/mcp` в Remote MCP App или режиме разработчика.
- Claude: добавьте OAuth Remote MCP через Settings > Connectors.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: используйте тот же Remote HTTP MCP в будущей инструкции подключения.

После регистрации создавайте и редактируйте Agents в **Party** Relay Forge, а авторизованные MCP-клиенты связывайте с Agent в **Connections**. Agent не может расширить права MCP-клиента.

## CLI

CLI выполняет отдельную от MCP роль. MCP предназначен для обнаружения и одобрения AI-инструментов, а CLI — для REST/JSON-операций людей и CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

Записи без `--execute` возвращают только dry-run или план выполнения. Аутентификация использует `QUESTFORGE_TOKEN` или `--token-stdin`, а Tokens никогда не записываются в логи. Обычные production-пользователи используют OAuth, а не фиксированный API key.

## Skill / OpenAI Plugin / MCP App

- Официальный Skill: [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- Подготовительный пакет OpenAI Plugin: [`plugins/questforge/`](plugins/questforge/)
- Шаблон регистрации MCP App: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Checklist отправки: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

Skill обучает ИИ последовательности: прочитать, выполнить dry-run, подтвердить, выполнить и вернуть review. Официальная проверка OpenAI не завершается автоматически. После проверки приёма реальных аккаунтов, конфиденциальности и путей удаления аккаунта в публичной beta оператор отправляет заявку из Dashboard.

## 9 языков

Guilduo поддерживает японский, английский, испанский, бразильский португальский, французский, немецкий, корейский, упрощённый китайский и русский. Настройки языка сохраняются на устройстве и не входят в облачную синхронизацию. Даты, числа и порядок сортировки используют Intl API.

## Дорожная карта внешних сервисов

Сейчас приоритет — определить контракты и обеспечить безопасное отображение; Provider OAuth остаётся приостановленным в рамках Early Access.

1. Google Calendar: окна доступности только для чтения
2. Google Tasks: двусторонняя синхронизация без удаления
3. Toggl Track: учёт времени, оценки и конвертация MP
4. Notion: экспорт ежедневных журналов
5. Todoist, Discord / Slack: синхронизация и уведомления
6. OpenClaw, Hermes Agent: рецепты подключения и повторное использование Skills

Первая синхронизация требует предварительного просмотра, а Guilduo никогда автоматически не удаляет внешние данные. Provider Secrets хранятся только в Worker Secrets.

## Производительность и телеметрия

Цели рассчитаны на устройство уровня Pixel 9: LCP не более 2,5 секунды, INP не более 200 мс, CLS не более 0,1 и начальный сжатый JavaScript не более 250 KB. Анонимная телеметрия применяется только к пользователям с явным согласием; содержимое Quest, заметки, электронная почта, UID, Tokens и внешнее содержимое не отправляются. Разрешённые реализованные события: Web Vitals, ошибки JavaScript, результаты синхронизации, первое завершение Quest, подключение MCP и назначение Agent. После отказа или отзыва телеметрии ничего не отправляется. До публичного запуска администратор должен настроить `TELEMETRY_ENDPOINT` и D1 migration 0006.

## Локальная разработка

Требуются Node.js 22+ и Wrangler. Управляйте ресурсами Appwrite через Appwrite Console или MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

В PowerShell используйте `Copy-Item`. Основные команды:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

Во время разработки TypeScript типы runtime Worker генерируются из конфигурации Wrangler. `npm run typecheck` объединяет генерацию типов, проверку согласованности сгенерированного результата, проверки явного `any` и `@ts-nocheck`, а также строгие проверки типов для browser, Worker, Node и battle prototype. Преобразование Vite и проверка типов разделены, а контракты API/MCP поддерживаются отдельными тестами.

Workflow для тегов `v*` сверяет версию пакета, наличие помеченного коммита среди предков `main` и примечания к релизу, затем публикует GitHub Release исходного кода после прохождения проверок CI, типов, тестов, сборки и preview. Он не использует секреты deployment и не выполняет автоматически production-миграции или deployment Site и Worker. Deployment в production выполняется отдельно через существующие ручные workflows `.github/workflows/deploy-appwrite-site.yml` и `.github/workflows/deploy-appwrite-worker.yml`; защита окружения `production` и проверки сохранённых кешей остаются в силе. В production runtime Worker остаются исправления, внесённые прямым deployment и ещё не интегрированные в публичный исходный код; не запускайте сначала общий workflow deployment Worker. Release исходного кода основного продукта `v0.6.0-beta.8` и расширения хостов `beta.12` версионируются отдельно; Guilduo остаётся в публичной beta. См. [`RELEASE_SETUP.md`](RELEASE_SETUP.md).

## Документация

- [Источник истины визуального дизайна](DESIGN.md)
- [Техническая спецификация](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Спецификация компонентов](design/COMPONENTS.md)
- [Blueprints экранов](design/SCREENS.md)
- [Манифест assets](design/ASSET_MANIFEST.md)
- [Golden references](design/reference/README.md)
- [Дорожная карта публичной beta](ROADMAP.md)
- [Руководство по публичным URL](docs/public-urls.md)
- [Настройка API / MCP / OAuth](API_MCP_SETUP.md)
- [Настройка релизов с тегами](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Конфиденциальность](PRIVACY.md)
- [Условия](TERMS.md)
- [Безопасность](SECURITY.md)
- [Участие в проекте](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [Лицензия](LICENSE)

## Лицензия

Guilduo распространяется по лицензии GNU AGPL-3.0-only. Если вы предоставляете изменённую версию через сеть, соблюдайте требования этой лицензии по предоставлению исходного кода.
