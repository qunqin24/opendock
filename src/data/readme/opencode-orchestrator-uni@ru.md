<a id="readme-top"></a>

[![npm version][npm-shield]][npm-url]
[![CI][ci-shield]][ci-url]
[![License][license-shield]][license-url]
[![OpenCode V2][opencode-shield]][opencode-url]

<br />

<div align="center">
  <h3 align="center">opencode-orchestrator-uni</h3>

  <p align="center">
    Плагин OpenCode V2, который ведёт работу как аудиторский цикл, опирающийся на доказательства.
    <br />
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/tree/main/docs/ru"><strong>Документация »</strong></a>
    <br />
    <br />
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/issues/new">Сообщить об ошибке</a>
    &middot;
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/issues/new">Предложить улучшение</a>
  </p>

  <p align="center">
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/blob/main/README.md">English</a> &middot; <strong>Русский</strong>
  </p>
</div>

<details>
  <summary>Содержание</summary>
  <ol>
    <li><a href="#о-проекте">О проекте</a>
      <ul>
        <li><a href="#что-входит">Что входит</a></li>
        <li><a href="#собрано-с">Собрано с</a></li>
      </ul>
    </li>
    <li><a href="#начало-работы">Начало работы</a>
      <ul>
        <li><a href="#требования">Требования</a></li>
        <li><a href="#установка">Установка</a></li>
        <li><a href="#настройка">Настройка</a></li>
      </ul>
    </li>
    <li><a href="#использование">Использование</a>
      <ul>
        <li><a href="#быстрый-старт">Быстрый старт</a></li>
        <li><a href="#аудиторский-цикл">Аудиторский цикл</a></li>
        <li><a href="#агенты">Агенты</a></li>
        <li><a href="#команды">Команды</a></li>
      </ul>
    </li>
    <li><a href="#справочник">Справочник</a></li>
    <li><a href="#разработка">Разработка</a></li>
    <li><a href="#дорожная-карта">Дорожная карта</a></li>
    <li><a href="#участие">Участие</a></li>
    <li><a href="#лицензия">Лицензия</a></li>
    <li><a href="#контакты">Контакты</a></li>
    <li><a href="#благодарности">Благодарности</a></li>
  </ol>
</details>

## О проекте

Сессии агентов дрейфуют: один и тот же агент пишет код, сам оценивает результат
и сам подводит итог. Этот плагин делает такое разделение явным для
[OpenCode V2](https://opencode.ai/v2/docs/build/plugins). Он поставляет
**комплект агентов-оркестраторов**: root-оркестратор со встроенным аудиторским
циклом, read-only субагенты аудита, один пишущий субагент, детерминированные
инструменты проверки и процессные документы, которые не дают циклу превратиться
в самоотчёт. Id плагина: `orchestrator.uni`.

Комплект — это протокол, а не песочница. Аудиторы read-only на уровне
разрешений инструментов и промпта; оркестратор делегирует любую правку
кода/документации/тестов; артефакты аудита остаются в доступных для записи
путях. Guard не пускает оркестратор в исходники — см.
[Защиту записи](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md#защита-записи).

### Что входит

| Слой | Что поставляется |
| --- | --- |
| Агенты | `orchestrator` (primary); read-only `factcheck`, `empiric`, `invariant`, `arbiter`, `meta`, `redteam`, `context-lint`; пишущий `fix-runner` |
| Инструменты | Пять read-only инструментов: `orch_uni_validate_report`, `orch_uni_context_lint`, `orch_uni_snapshot`, `orch_uni_sessions`, `orch_uni_session_stats` |
| Команды | Три слэш-команды: `/agents-md`, `/spec`, `/handoff` |
| Справочник | Процессные документы как reference `audit-kit`; подробности — в [Справочнике](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md) |

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Собрано с

- [![OpenCode V2][opencode-shield]][opencode-url]
- [![TypeScript][typescript-shield]][typescript-url]
- [![Bun][bun-shield]][bun-url]
- [![Biome][biome-shield]][biome-url]
- [![semantic-release][semantic-release-shield]][semantic-release-url]

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Начало работы

### Требования

- **OpenCode 2.x** с V2 plugin API (поле `plugins`). Загрузчик V1 ожидает
  legacy-экспорт `server()` и этот плагин не загрузит.
- **Bun** для тестов и скриптов проверки, **Node.js 22.14+** для релизного
  инструментария. У плагина нет шага сборки и каталога `dist/`.
- Git-чекаут для `npm run check:locales` и `npm run verify:kit`; в npm-пакете
  каталог `tools/` не поставляется.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Установка

Через CLI OpenCode:

```sh
opencode plugin add opencode-orchestrator-uni
```

Или добавьте пакет в массив `plugins` в `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-orchestrator-uni"]
}
```

Зафиксировать версию можно так: `opencode-orchestrator-uni@0.5.1`. Для настройки
моделей используйте объектную форму — см. [Настройку](#настройка) и
[Модели](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md#модели).

Перезапустите сервис после изменения конфига:

```sh
opencode service restart
```

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Настройка

Все опции необязательны и живут в записи плагина:

- `locale` — `"ru"` или `"en"`; полные теги вроде `"ru-RU"` принимаются.
- `model` / `agents` — модель по умолчанию и переопределения по агентам в форме
  `"provider/model[#variant]"` или `{ providerID, model, variant }`.
- `sessionGuard` — напоминания о бюджете промпта и лимит компакций.
- `toolOutputGuard` — урезает большие выводы `shell`/`bash`/`webfetch`.

Неверные значения игнорируются с предупреждением `[orchestrator.uni] …`. Полный
справочник опций: [Модели](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md#модели),
[Локаль](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md#локаль) и
[Гигиена сессии](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md#гигиена-сессии).

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Использование

### Быстрый старт

1. Установите плагин, перезапустите OpenCode и откройте сессию в каталоге проекта.
2. Задайте `model` — или оставьте пусто, чтобы субагенты наследовали модель сессии.
3. Дайте оркестратору срез. Используйте `/spec` перед реализацией, `/agents-md`
   для `AGENTS.md` и `/handoff`, чтобы закрыть срез.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Аудиторский цикл

`factcheck` отмечает устаревшую работу; `empiric` воспроизводит и измеряет;
`invariant` проверяет состояния и враждебный ввод; `arbiter` разбирает споры.
`meta` проводит гейт отчётов, `redteam` проверяет приёмку, а `fix-runner`
закрывает список. Процессные документы поставляются как reference `audit-kit` и
лежат в [`docs/ru`](https://github.com/OniVe/opencode-orchestrator-uni/tree/main/docs/ru).

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Агенты

| Агент          | Режим      | Роль                                                            |
| -------------- | ---------- | --------------------------------------------------------------- |
| `orchestrator` | `primary`  | Root-оркестратор; делегирует правки; пишет артефакты аудита/состояния |
| `factcheck`    | `subagent` | Read-only: пред-проход на устаревание («уже сделано» / устарело) |
| `empiric`      | `subagent` | Read-only: воспроизведения, замеры, первоисточники               |
| `invariant`    | `subagent` | Read-only: состояния, отмены, гонки, враждебный ввод             |
| `arbiter`      | `subagent` | Read-only: разбирает только спорные находки                      |
| `meta`         | `subagent` | Read-only: мета-аудит отчётов (гейт pass/fail)                   |
| `redteam`      | `subagent` | Read-only: приёмочный ред-тим (релизные ворота)                  |
| `context-lint` | `subagent` | Read-only: аудит AGENTS.md/SPEC.md на token-эффективность         |
| `fix-runner`   | `subagent` | Пишущий: применяет список правок и доказывает закрытие           |

Все агенты поставляются без модели; определения лежат в [`agents/`](https://github.com/OniVe/opencode-orchestrator-uni/tree/main/agents) и
парсятся при setup. «Read-only» означает: `edit` запрещён и промпт запрещает
запись; `shell` остаётся для проверок (принятый риск I-M15).

<p align="right">(<a href="#readme-top">наверх</a>)</p>

### Команды

| Команда     | Что делает                                                                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/agents-md` | Вставляет workflow аудита/черновика AGENTS.md: шаблон `context-efficiency.md`, `orch_uni_context_lint`, `context-lint`, подтверждение перед записью.                              |
| `/spec`      | Вставляет workflow SPEC.md: бриф, уточняющие вопросы, EARS/AC/трассировка, `orch_uni_context_lint`, `context-lint`, подтверждение перед записью.                                 |
| `/handoff`   | Вставляет workflow закрытия среза: факты сессии и рабочего дерева, шаблон handoff из `session-discipline.md`, запись `docs/planning/handoff-<YYYY-MM-DD>.md`.                    |

Команда — это промпт, а не писатель: она вставляет workflow в текущую сессию, а
оркестратор дальше работает по обычным правилам evidence и подтверждения.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Справочник

Глубокий справочник — в [`docs/ru/reference.md`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/ru/reference.md):
защита записи, все пять инструментов со схемами и лимитами, гигиена сессии,
модели, локаль, приоритет и заметки.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Разработка

Сборки нет. `index.ts` — поставляемая точка входа.

```sh
npm install
npm run typecheck
npm test
npm run check:locales
npm run verify:kit
npm run lint
npm run lint:fix
```

`npm test` сканирует только `./test/` и сейчас насчитывает **438 тестов в 11 файлах** — 437 pass и 1 skip. Голый `bun test` из корня красный по замыслу: он
подхватывает и специально падающие фикстуры в `eval/cases/`, и черновики в
`lab/`; используйте `npm test`.

`check:locales` и `verify:kit` требуют git-чекаута — в npm-пакете каталог
`tools/` не поставляется (`stand: unavailable`). [Biome](https://biomejs.org)
([`biome.json`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/biome.json)) покрывает `index.ts`, `lib/`, `test/` и
`eval/*.ts`, пропускает `lab/` и `eval/results/`, а `eval/cases/**` и
`eval/baselines/**` заморожены; записи baseline используют стиль
`JSON.stringify(…, null, 2)`, поэтому переформатирование давало бы churn на
`eval:recompute`. Выключено одно правило — `lint/style/noNonNullAssertion`.

Для живого сервера направьте конфиг проекта на чекаут:
`"plugins": ["file:///C:/path/to/opencode-orchestrator-uni"]`. Локальные пути
плагинов должны быть каталогами; OpenCode перезагружает их при изменениях.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Дорожная карта

Текущий опубликованный релиз — **0.5.1**. До 1.0 ломающее изменение повышает
минорную версию. Заметки о релизах — в [GitHub Releases][releases-url];
запланированная работа и известные проблемы — в [issue tracker][issues-url].

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Участие

См. [`CONTRIBUTING.md`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/CONTRIBUTING.md). Сделайте форк, создайте ветку
(`git checkout -b feature/AmazingFeature`), закоммитьте по
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`docs:`; формат проверяет `commitlint`), запушьте и откройте pull request. `ru` —
референсная локаль, `en` должен её зеркалировать. После правки агентов или
доков запустите `npm run check:locales`; после правки README — `npm test`
(паритет заголовков и фенсов).

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Лицензия

Распространяется по лицензии MIT. См. [`LICENSE`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/LICENSE).

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Контакты

Вопросы, баги и предложения: [GitHub Issues][issues-url].

Ссылка на проект: [https://github.com/OniVe/opencode-orchestrator-uni][repo-url]

<p align="right">(<a href="#readme-top">наверх</a>)</p>

## Благодарности

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) — структура README.
- [Документация OpenCode V2 по плагинам](https://opencode.ai/v2/docs/build/plugins) — API плагинов.
- [shields.io](https://shields.io) — badges.
- [Bun](https://bun.sh), [Biome](https://biomejs.org) и
  [semantic-release](https://semantic-release.gitbook.io/) — инструменты.

<p align="right">(<a href="#readme-top">наверх</a>)</p>

[npm-shield]: https://img.shields.io/npm/v/opencode-orchestrator-uni?style=for-the-badge
[npm-url]: https://www.npmjs.com/package/opencode-orchestrator-uni
[ci-shield]: https://img.shields.io/github/actions/workflow/status/OniVe/opencode-orchestrator-uni/ci.yml?branch=main&style=for-the-badge
[ci-url]: https://github.com/OniVe/opencode-orchestrator-uni/actions/workflows/ci.yml
[license-shield]: https://img.shields.io/github/license/OniVe/opencode-orchestrator-uni?style=for-the-badge
[license-url]: https://github.com/OniVe/opencode-orchestrator-uni/blob/main/LICENSE
[opencode-shield]: https://img.shields.io/badge/OpenCode-V2-000000?style=for-the-badge
[opencode-url]: https://opencode.ai/v2/docs/build/plugins
[typescript-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[bun-shield]: https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white
[bun-url]: https://bun.sh/
[biome-shield]: https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white
[biome-url]: https://biomejs.org/
[semantic-release-shield]: https://img.shields.io/badge/semantic--release-E10079?style=for-the-badge
[semantic-release-url]: https://semantic-release.gitbook.io/
[repo-url]: https://github.com/OniVe/opencode-orchestrator-uni
[issues-url]: https://github.com/OniVe/opencode-orchestrator-uni/issues
[releases-url]: https://github.com/OniVe/opencode-orchestrator-uni/releases
