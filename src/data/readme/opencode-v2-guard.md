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
| `piiEmailAllowDomains` | `[]` | email domains never masked (exact, case-insensitive; subdomains not included) |
| `audit` | `{enabled:true, dir:~/.local/share/opencode/guard}` | audit log |

False-positive workarounds (paths, variable names, config escape hatches): [docs/masking-guide.md](docs/masking-guide.md).

## Context-safe PII email masking (v1.2)

Corporate machines often have an email-shaped login, so absolute paths contain an address (`/home/<login>@corp/...`). Blunt masking there breaks the command, and replacing a whole env value that merely *contains* a match breaks child shells (a masked `$HOME` breaks everything). Since v1.2:

- an email-shaped PII match is **not masked when it is a path segment** — a `/` or `\` touching the match boundary (secrets are still masked inside paths);
- **env handling**: secrets fully replace the value (`<REDACTED:env>`) as before; PII in critical vars (`HOME`, `PATH`, `USER`, …16 keys) is left untouched; PII elsewhere masks only the matched substring;
- `piiEmailAllowDomains` treats listed domains as public identifiers — such emails are never masked (exact domain only, no subdomains).
- Skips of PII in critical env vars are not audited (by design — otherwise every shell would spam the log); in enforce mode such PII reaches child processes with no trace.

## Wire-level secret scrubbing (v1.2.2, GUARD-9)

Incident (2026-11-17, see `docs/guard-9-investigation.md`): a credential reached the model while the audit said "redacted". The masked copy was persisted — the user saw only `<REDACTED:credential>` — but the provider request was built from a pre-mask in-memory copy, and a bare key line (no `key=` context) matches no pattern at all.

Since v1.2.2 the guard closes this class with two layers on `session.http.request` — the last checkpoint every model call passes before bytes leave the process:

1. **Pattern scrub** — the actual provider request body is deep-redacted by the same patterns as the admission paths.
2. **Remembered-value scrub** — every admission hook (prompt, context, tool results, shell) remembers the raw values it has masked (per-session, in-memory, TTL 6h, cap 64 values/session; never persisted, never logged — audit records categories and counts only). The wire hook then replaces those values **literally**, independent of any pattern: bare occurrences, pre-mask copies, and JSON-escaped forms inside nested JSON strings. Whatever copy the request was built from, if the guard ever masked that value in the session, it cannot reach the provider.

Since v1.2.3 the outbound **context scrub is the universal content interceptor**: it masks secrets in every message part that carries text — `text`, assistant `reasoning` (replayed to thinking-capable providers), and the raw instruction copies in system `metadata.experimental.instructions` — plus literal value-scrub of remembered values, so DB-restored history with bare occurrences is masked at context-build time, before the wire.

> ⚠ **v1.2.1 and earlier are NOT reliable protection against this class** — patterns miss context-free values, and nothing scans the actual provider request. Update to ≥1.2.2.

## Known limitations

- `~`, `$VAR` and shell globs are not expanded in static command checks — a command is neutralized only if a token literally matches a blocked path
- `opencode run` may admit a prompt before plugins are ready — the context scrub covers that window
- ФИО <REDACTED:pii-name> requires an explicit marker (too many false positives otherwise)
- The shell hook cannot throw a veto (API limitation) — the command is replaced with `echo … && exit 1`
- pre-v1.2.1: the pii-email regex could stall ~19s on ≥100K-char runs of its character class (base64 dumps) — fixed in v1.2.1 via RFC-length bounds (64/255)
- v1.2.2 wire scrub: a value is scrubbed on the wire only after the guard masked it at least once in the session (the registry is admission-driven); a value that never matched any pattern anywhere is not known to the wire layer
- v1.2.2 persistence: a bare value without context is masked on the wire but stays raw in the local DB — patterns need context to mask at rest (see `docs/guard-9-investigation.md`)

## Development

```bash
npm install
npm test          # node --test (186 tests)
npm run typecheck # tsc --noEmit
```

The OpenCode server watches `src/**` and reloads the plugin on save — no service restart needed.

## Updating

**Local edits:** save a file — the server hot-reloads the plugin automatically via its file watcher. No commands needed.

**After changes, make sure nothing broke:**

```bash
npm test   # expect: pass 175, fail 0
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
| `piiEmailAllowDomains` | `[]` | домены email, которые никогда не маскируются (точное совпадение, без поддоменов) |
| `audit` | `{enabled:true, dir:~/.local/share/opencode/guard}` | аудит-лог |

Обход ложных срабатываний (пути, имена переменных, конфиг): [docs/masking-guide.md](docs/masking-guide.md).

## Контекстно-безопасное маскирование email (v1.2)

В корпоративных средах логин часто = email, и абсолютные пути его содержат (`/home/<login>@corp/...`). Грубая маска там ломает команду, а полная замена env-значения ломает дочерние шеллы (замаскированный `$HOME` ломает всё). С v1.2:

- email-подобный PII-матч **не маскируется внутри пути** — `/` или `\`, примыкающий к границе матча (секреты внутри путей маскируются по-прежнему);
- **env**: секреты по-прежнему полностью заменяют значение (`<REDACTED:env>`); PII в критических переменных (`HOME`, `PATH`, `USER`, …16 штук) не трогается; PII в остальных маскирует только подстроку матча;
- `piiEmailAllowDomains` — перечисленные домены считаются публичными идентификаторами, такие email не маскируются нигде (точный домен, без поддоменов).

## Ограничения (известные)

- `~`, `$VAR`, шелл-глобы в командах не раскрываются при статической проверке — команда нейтрализуется только если токен буквально совпадает с blocked-путём
- `opencode run` может адмитить промпт до готовности плагинов — защиту в этом окне догоняет context-скраб
- ФИО — только с явным маркером (без него — слишком много ложных срабатываний)
- до v1.2.1: regex pii-email мог блокировать хук ~19с на ране ≥100К символов класса (base64-дампы) — исправлено в v1.2.1 границами RFC-длины (64/255)
- shell-хук не может кидать вето (API так не умеет) — команда заменяется на `echo … && exit 1`
- decode-and-scan не ловит: path-эвейжен (`.[e]nv`-глобы), chunk-splitting (`cut -c`), вложенный энкодинг (глубина 1), блобы >8192 символов. От случайных утечек, не от целенаправленного агента

## Разработка

```bash
npm install
npm test          # node --test (164 теста)
npm run typecheck # tsc --noEmit
```

Сервер OpenCode сам следит за `src/**` и перезагружает плагин при сохранении — рестарт сервиса не нужен.

## Как обновить

**Правки кода:** сохранил файл — сервер сам перезагрузил плагин (file watcher). Никаких команд не требуется.

**Проверка, что не сломано:** `npm test` — ожидается `pass 175, fail 0`.

**Если что-то пошло не так (плагин не загрузился, правки вне зоны watcher'а):** `opencode service restart` — эта одна команда универсальный «сброс/апдейт».

**На другой машине (свежий код через git):** `git pull` → `npm install` (если менялся `package.json`) → `opencode service restart`.
