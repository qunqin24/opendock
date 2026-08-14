# Log Analyzer Suite

[English version](README.en.md)

Монорепозиторий инструментов для анализа логов с использованием AI. Самое актуальное и наиболее протестированное направление — [log-analyzer-skill](log-analyzer-skill/), содержащее best practices и поддерживаемое в двух форматах (standalone и opencode plugin). Также включает экспериментальные и исторические версии.

## Проекты

| Проект | Описание |
|--------|----------|
| ★ [log-analyzer-skill](log-analyzer-skill/) | **Основной проект.** Актуальный, протестированный, best practices. Анализ логов в двух форматах: standalone-промпты для любой LLM и plugin-скилы для opencode. Включает Log Insight (индуктивный, чанки + агенты) и Log Validate (дедуктивный, code-aware через grep) |
| [log-insight](log-insight/) | Claude Code skill — индуктивный AI-анализ логов через чанки и параллельных агентов |
| [log-validate](log-validate/) | Claude Code skill — code-aware валидация логов через grep |
| [llm-log-analyzer](llm-log-analyzer/) | Standalone Python-модуль для анализа логов через LLM API |

## Сравнение

| | log-analyzer-skill | log-insight | log-validate | llm-log-analyzer |
|---|:---:|:---:|:---:|:---:|
| Статус | ★ Current | Legacy | Legacy | Legacy |
| Формат | Standalone + Plugin | Claude Code skill | Claude Code skill | Python-модуль |
| Индуктивный (чанки) | ✅ | ✅ | — | — |
| Дедуктивный (сигнатуры) | ✅ | — | ✅ | — |
| Любая LLM-среда | ✅ | ❌ (только Claude) | ❌ (только Claude) | ✅ |
| Зависимости | Node.js / shell | Node.js | shell | Python |

## Использование

Каждый сабмодуль независим. Клонируйте с сабмодулями:

```bash
git clone --recursive <repo-url>
```

Или инициализируйте сабмодули отдельно:

```bash
git clone <repo-url>
git submodule update --init --recursive
```
