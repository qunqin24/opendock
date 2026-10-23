<p align="center">
  <a href="https://github.com/ihxnnxs/opencode-council">
    <picture>
      <source srcset="../assets/opencode-council-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="../assets/opencode-council-light.svg" media="(prefers-color-scheme: light)">
      <img src="../assets/opencode-council-light.svg" alt="opencode council logo">
    </picture>
  </a>
</p>
<p align="center">Нативный council для OpenCode: архитектура, ревью, дебаг и сложные инженерные решения.</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.es.md">Español</a>
</p>

---

`opencode-council` запускает несколько read-only советников OpenCode параллельно, собирает независимые мнения и помогает текущему агенту собрать один финальный ответ.

## Зачем

Плагин нужен, когда одного ответа модели мало: архитектурные развилки, рискованное ревью, сложный дебаг, безопасность и решения с заметной ценой ошибки.

- использует текущую модель OpenCode по умолчанию
- работает как OpenCode plugin, tool и набор slash-команд
- связывает советников как child sessions текущей сессии
- работает даже с одной подпиской: одна модель играет несколько ролей
- держит советников read-only по умолчанию
- может вызвать consensus сам, если активный агент видит сложный вопрос
- `/council-settings` настраивает multi-model council без ручного JSON

## Установка

```bash
opencode plugin @hxnnxs/opencode-council
```

После установки перезапустите OpenCode. Плагины загружаются на старте.

Если `/council-settings` не появляется, добавьте TUI entrypoint в `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@hxnnxs/opencode-council/tui"]
}
```

Опционально:

```bash
npx @hxnnxs/opencode-council install
```

## Обновление

У пакета нет фонового auto-update, а OpenCode не hot-reload-ит плагины. Обновите npm plugin и перезапустите OpenCode:

```bash
opencode plugin @hxnnxs/opencode-council
```

Если версия pinned, укажите новую явно, например `@hxnnxs/opencode-council@0.1.1`. `.opencode-council.json` сохранится.

## Использование

- `/council <вопрос>` - обычный council и финальная рекомендация
- `/council-review <вопрос>` - ревью текущего diff или указанных изменений
- `/council-arch <вопрос>` - архитектурные tradeoffs
- `/council-debug <вопрос>` - гипотезы и план дебага
- `/council-status` - модели, провайдеры и агенты
- `/council-settings` - TUI-модалка настроек моделей, ролей и лимита советников

Proactive mode включен по умолчанию: для сложных и рискованных вопросов активный агент получает инструкцию вызвать `council_ask` сам. `/council` остается ручным способом форсировать council.

## Настройки

По умолчанию `models` пустой: текущая модель OpenCode работает как 5 советников с разными preset-ролями. Добавь модели в `/council-settings`, только если нужен multi-model council.

Файл проекта, который пишет модалка:

```json
{
  "version": 1,
  "models": ["openai/gpt-5.5", "opencode/big-pickle"],
  "roles": ["architect", "skeptic", "security"],
  "maxAdvisors": 5,
  "includeDiff": false,
  "timeoutMs": 300000
}
```

`models: []` оставляет дефолтный режим одной текущей модели.

## Безопасность

Советники запускаются как read-only `council-advisor`:

- `edit` запрещен
- `bash` запрещен
- write-capable tools отключены
- prompts явно запрещают менять проект

## Разработка

```bash
npm run check
npm pack --dry-run
```

Пакет без build step.

Release workflow на tag `v*` проверяет пакет, собирает npm tarball и прикладывает его к GitHub Release. npm publish запускается отдельно/явно, чтобы tag build не падал из-за npm credentials.

## Статус

MVP. Это независимый OpenCode plugin. Он не создан командой OpenCode и не аффилирован с OpenCode.

---

**OpenCode** [Website](https://opencode.ai) | [Docs](https://opencode.ai/docs) | [Discord](https://opencode.ai/discord)
