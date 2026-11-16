# opencode-v2-guard

Security plugin for [OpenCode](https://opencode.ai) V2: intercepts prompts, tool calls and shell commands, detects secrets and personal data, and masks them **before** they reach disk, model context, logs or the network. No LLM involved — only deterministic patterns.

**[Русская версия ниже / Russian version below](#русская-версия)**

## Overview

| Hook | Action |
|---|---|
| `session.prompt` | Scans user prompt text on entry; secrets are replaced with `<REDACTED:category>` before persistence; mention offsets (files/agents/skills) are recalculated; attachments from blocked paths are detached |
| `tool.execute.before` | Vetoes (`Tool.Error`) reads/writes of forbidden paths (`.env`, `*.pem`, `.ssh/**`, …) and writes to write-protected paths; masks secrets in mutating input (write/edit/patch, shell) |
| `tool.execute.after` | Masks secrets in tool results (content, output, metadata) and error messages — keeps secrets out of context/logs |
| `shell.create.before` | Backstop for every shell creation: neutralizes commands touching blocked paths (echo + exit 1), masks inline secrets in commands and secret values in env |
| `session.context` | Last line of defense: scrubs system/messages before they go to the provider |

Audit: JSONL at `~/.local/share/opencode/guard/guard-audit.jsonl` — categories/counts/actions only, **never** raw values.

## Dependency installation guard

`npm/pnpm/yarn add`, `pip install`, `cargo add` are parsed before execution (phase 2): a built-in blocklist of known-malicious packages (event-stream, node-ipc, ua-parser-js, coa, rc, flatmap-stream) vetoes the install, and names at Levenshtein distance 1 from a curated top-120 npm list are flagged as typosquats (npm only — other ecosystems reuse the same names legitimately). Global installs (`-g`) are out of scope.

Phase 2.5 additions:

- `npx pkg`, `pnpm dlx`, `yarn dlx` are checked the same way (execution without install)
- `@types/*` scoped squatting (`@types/lodahs` → veto), affix squatting (`lodashjs`, `node-lodash`, `react-cli`)
- `blockedPackages`/`allowedPackages` accept `name@version` (blocks only that version; plain `name` covers all versions)
- post-audit: ~60s after an allowed npm install, `npm audit --json` runs in the project directory; findings are warn-only audit entries (`postAudit`, default on)

Known gaps: `npm exec` is not parsed; `npx -c "<string>"` contents are not scanned; versioned entries match literally (`rc@1.2.0` does not catch `rc@^1.2.0` or `rc@latest` unless written exactly); post-audit is npm-only (no yarn/pnpm audit) and its 120s timeout is enforced via `taskkill` on Windows (best-effort elsewhere); a forced-kill partial report is dropped; `corepack <pm> ...` indirection and command substitution (`$(npm i x)`) are not expanded.

## Detection (29 patterns)

- API keys: OpenAI `sk-`, GitHub `ghp_`/`github_pat_`, AWS `AKIA`, Google `AIza`/`ya29.`, Slack `xox` + webhooks, Stripe, GitLab `glpat-`, Telegram bot, HuggingFace, npm
- Tokens: JWT, `Bearer …`
- Credentials: `password=…`, basic-auth in URLs, connection strings `scheme://user:pass@…`
- Private keys: whole PEM blocks
- Prompt injection: instruction overrides (EN/RU), secret-path + exfil-verb combos, zero-width/bidi chars; base64/hex blobs are decoded and re-scanned (depth 1)
- PII (RU): ИНН/СНИЛС/passport (context word required), +7/8 phones, email, bank cards (Luhn-validated), ФИО <REDACTED:pii-name> (only after a "ФИО:" marker)

Specific patterns take priority over generic ones; nested matches collapse into the outer mask (no `user:sk-…` fragments survive).

## Installation

From npm (recommended) — in `~/.config/opencode/opencode.json`:

```json
"plugins": [
  {
    "package": "opencode-v2-guard",
    "options": { "mode": "enforce" }
  }
]
```

Or a local checkout:

```json
"plugins": [
  {
    "package": "/path/to/opencode-v2-guard",
    "options": { "mode": "enforce" }
  }
]
```

OpenCode installs the npm package automatically on startup. Then `opencode service restart`. Verify with `opencode api get "/api/plugin?directory=..."` — look for `"id":"opencode-v2-guard"` with `"status":"active"`.

## Options

| Key | Default | Description |
|---|---|---|
| `mode` | `"enforce"` | `enforce` — block + redact; `warn` — audit only, touches nothing |
| `scanPrompts` | `true` | scan user prompts |
| `redactOnWrite` | `true` | redact on write/shell |
| `scanOutbound` | `true` | scrub outbound context |
| `scanSkillsOnLoad` | `true` | scan installed skills at startup (warn-only audit) |
| `depsCheck` | `true` | intercept package installs (blocklist + typosquat) |
| `postAudit` | `true` | npm audit ~60s after an allowed npm install (warn-only) |
| `blockedPackages` | `[]` | extra package names blocked from install (union) |
| `allowedPackages` | `[]` | names exempted from the blocklist (escape hatch) |
| `blockPaths` | built-in list | **added** to defaults (union) |
| `writeProtectPaths` | `[]` | read ok, write blocked |
| `exemptPaths` | `[]` | exceptions (fixtures with legitimate keys) |
| `disabledPatterns` | `[]` | disable patterns by id |
| `audit` | `{enabled:true, dir:~/.local/share/opencode/guard}` | audit log |

## Known limitations

- `~`, `$VAR` and shell globs are not expanded in static command checks — a command is neutralized only if a token literally matches a blocked path
- `opencode run` may admit a prompt before plugins are ready — the context scrub covers that window
- ФИО <REDACTED:pii-name> requires an explicit marker (too many false positives otherwise)
- The shell hook cannot throw a veto (API limitation) — the command is replaced with `echo … && exit 1`

## Development

```bash
npm install
npm test          # node --test (111 tests)
npm run typecheck # tsc --noEmit
```

The OpenCode server watches `src/**` and reloads the plugin on save — no service restart needed.

## Updating

**Local edits:** save a file — the server hot-reloads the plugin automatically via its file watcher. No commands needed.

**After changes, make sure nothing broke:**

```bash
npm test   # expect: pass 111, fail 0
```

**If anything misbehaves (plugin failed to load, config changed outside the watched files):**

```bash
opencode service restart
```

This one command is the universal "reset/update".

**Another machine (fresh code via git):**

```bash
cd opencode-guard
git pull
npm install              # only if package.json changed
opencode service restart
```

---

<a id="русская-версия"></a>
## Русская версия

Плагин безопасности для [OpenCode](https://opencode.ai) V2: перехватывает промпты, tool-вызовы и shell-команды, детектирует секреты и ПДн, маскирует их **до** того, как они попадут на диск, в контекст модели, в логи или сеть. Без LLM — только детерминированные паттерны.

## Что делает

| Хук | Действие |
|---|---|
| `session.prompt` | Сканирует текст промпта пользователя на входе; секреты заменяются на `<REDACTED:категория>` до персиста; оффсеты mention (files/agents/skills) пересчитываются; вложения-файлы из blocked-путей открепляются |
| `tool.execute.before` | Блокирует (вето `Tool.Error`) чтение/запись запрещённых путей (`.env`, `*.pem`, `.ssh/**`, …) и запись в write-protected пути; маскирует секреты в mutating-input (write/edit/patch, shell) |
| `tool.execute.after` | Маскирует секреты в результатах тулов (content, output, metadata) и в сообщениях об ошибках — не даёт секретам войти в контекст/лог |
| `shell.create.before` | Бэкстоп на все shell-создания: нейтрализует команды с blocked-путями (echo + exit 1), маскирует инлайн-секреты в команде и секретные значения в env |
| `session.context` | Последний рубеж: скрабит system/messages перед отправкой провайдеру |

Аудит: JSONL в `~/.local/share/opencode/guard/guard-audit.jsonl` — только категории/количества/действия, **никогда** сырые значения.

## Защита установки зависимостей

`npm/pnpm/yarn add`, `pip install`, `cargo add` парсятся до исполнения (фаза 2): встроенный blocklist известных вредоносных пакетов (event-stream, node-ipc, ua-parser-js, coa, rc, flatmap-stream) блокирует установку, а имена на расстоянии Левенштейна 1 от топ-120 npm ловятся как typosquat (только npm — в других экосистемах те же имена легитимны). Глобальные установки (`-g`) вне зоны охвата.

Добавления фазы 2.5:

- `npx pkg`, `pnpm dlx`, `yarn dlx` проверяются так же (исполнение без install)
- scoped-сквоттинг `@types/*` (`@types/lodahs` → вето), affix-сквоттинг (`lodashjs`, `node-lodash`, `react-cli`)
- `blockedPackages`/`allowedPackages` принимают `name@version` (блокирует только эту версию; голое `name` — все версии)
- пост-аудит: через ~60 секунд после пропущенной npm-установки в каталоге проекта запускается `npm audit --json`; находки пишутся в аудит как warn (`postAudit`, по умолчанию включён)

Известные пробелы: `npm exec` не парсится; содержимое `npx -c "<строка>"` не сканируется; версионные записи сопоставляются литерально (`rc@1.2.0` не поймает `rc@^1.2.0` или `rc@latest`, если записано иначе); пост-аудит только для npm (yarn/pnpm — нет), таймаут 120s на Windows исполняется через `taskkill` (best-effort), оборванный принудительным kill отчёт отбрасывается; косвенность `corepack <pm> ...` и подстановка команд (`$(npm i x)`) не раскрываются.

## Детекция (29 паттернов)

- API-ключи: OpenAI `sk-`, GitHub `ghp_`/`github_pat_`, AWS `AKIA`, Google `AIza`/`ya29.`, Slack `xox`+webhooks, Stripe, GitLab `glpat-`, Telegram bot, HuggingFace, npm
- Токены: JWT, `Bearer …`
- Креды: `password=<REDACTED:credential> basic-auth в URL, строки подключения `scheme://user:pass@…`
- Private keys: PEM-блоки целиком
- Prompt injection: переопределение инструкций (EN/RU), связка «путь к секрету + глагол эксфильтрации», zero-width/bidi-символы; base64/hex-блобы декодируются и пересканируются (глубина 1)
- ПДн (RU): ИНН/СНИЛС/паспорт (только с контекстным словом), телефоны +7/8, email, банковские карты (с Luhn-валидацией), ФИО (только после маркера «ФИО:»)
- Энкодинг-обход: base64/base64url/hex-блобы (≥16 символов) декодируются и прогоняются по тем же паттернам; при матче маскируется исходный блоб целиком (`<REDACTED:api-key:encoded>`). Глубина декодирования — 1, лимит 24 блоба на текст, декодированный мусор (sha256/UUID/DER) игнорируется

Приоритет — специфичные паттерны выше generic; вложенные матчи схлопываются во внешнюю маску (никаких остатков `user:sk-…`).

## Установка

Из npm (рекомендуется) — в `~/.config/opencode/opencode.json`:

```json
"plugins": [
  {
    "package": "opencode-v2-guard",
    "options": { "mode": "enforce" }
  }
]
```

Или локальный checkout:

```json
"plugins": [
  {
    "package": "/absolute/path/to/opencode-v2-guard",
    "options": { "mode": "enforce" }
  }
]
```

OpenCode сам установит npm-пакет при старте. Затем `opencode service restart`.

## Опции

| Ключ | По умолчанию | Описание |
|---|---|---|
| `mode` | `"enforce"` | `enforce` — блокировать+маскировать; `warn` — только аудит, ничего не трогает |
| `scanPrompts` | `true` | скан промптов пользователя |
| `redactOnWrite` | `true` | маскировка при записи/шелле |
| `scanOutbound` | `true` | скраб исходящего контекста |
| `scanSkillsOnLoad` | `true` | стартовый скан установленных скиллов (только warn-аудит) |
| `depsCheck` | `true` | перехват установки пакетов (blocklist + typosquat) |
| `postAudit` | `true` | npm audit через ~60с после пропущенной npm-установки (только warn) |
| `blockedPackages` | `[]` | дополнительные запрещённые имена пакетов (union) |
| `allowedPackages` | `[]` | имена, снятые с блоклиста (обход ложных срабатываний) |
| `blockPaths` | дефолтный список | **добавляется** к дефолтам (union) |
| `writeProtectPaths` | `[]` | read ok, write blocked |
| `exemptPaths` | `[]` | исключения (фикстуры с легитимными ключами) |
| `disabledPatterns` | `[]` | отключить паттерны по id |
| `audit` | `{enabled:true, dir:~/.local/share/opencode/guard}` | аудит-лог |

## Ограничения (известные)

- `~`, `$VAR`, шелл-глобы в командах не раскрываются при статической проверке — команда нейтрализуется только если токен буквально совпадает с blocked-путём
- `opencode run` может адмитить промпт до готовности плагинов — защиту в этом окне догоняет context-скраб
- ФИО — только с явным маркером (без него — слишком много ложных срабатываний)
- shell-хук не может кидать вето (API так не умеет) — команда заменяется на `echo … && exit 1`
- decode-and-scan не ловит: path-эвейжен (`.[e]nv`-глобы), chunk-splitting (`cut -c`), вложенный энкодинг (глубина 1), блобы >8192 символов. От случайных утечек, не от целенаправленного агента

## Разработка

```bash
npm install
npm test          # node --test (111 тестов)
npm run typecheck # tsc --noEmit
```

Сервер OpenCode сам следит за `src/**` и перезагружает плагин при сохранении — рестарт сервиса не нужен.

## Как обновить

**Правки кода:** сохранил файл — сервер сам перезагрузил плагин (file watcher). Никаких команд не требуется.

**Проверка, что не сломано:** `npm test` — ожидается `pass 111, fail 0`.

**Если что-то пошло не так (плагин не загрузился, правки вне зоны watcher'а):** `opencode service restart` — эта одна команда универсальный «сброс/апдейт».

**На другой машине (свежий код через git):** `git pull` → `npm install` (если менялся `package.json`) → `opencode service restart`.
