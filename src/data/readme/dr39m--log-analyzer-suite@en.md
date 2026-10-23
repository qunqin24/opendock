# Log Analyzer Suite

A monorepo of log analysis tools powered by AI. The primary, most tested, and best-maintained project is [log-analyzer-skill](log-analyzer-skill/) — it represents the current best practices and is available in two formats (standalone prompts + opencode plugin). The other submodules are earlier or experimental versions.

## Projects

| Project | Description |
|---------|-------------|
| ★ [log-analyzer-skill](log-analyzer-skill/) | **Primary project.** Current, tested, best practices. Log analysis in two formats: standalone prompts for any LLM and plugin skills for opencode. Includes Log Insight (inductive, chunked + agents) and Log Validate (deductive, code-aware via grep) |
| [log-insight](log-insight/) | Claude Code skill — inductive AI log analysis via chunking and parallel agents |
| [log-validate](log-validate/) | Claude Code skill — code-aware log validation via grep |
| [llm-log-analyzer](llm-log-analyzer/) | Standalone Python module for LLM-powered log analysis |

## Comparison

| | log-analyzer-skill | log-insight | log-validate | llm-log-analyzer |
|---|:---:|:---:|:---:|:---:|
| Status | ★ Current | Legacy | Legacy | Legacy |
| Format | Standalone + Plugin | Claude Code skill | Claude Code skill | Python module |
| Inductive (chunks) | ✅ | ✅ | — | — |
| Deductive (signatures) | ✅ | — | ✅ | — |
| Any LLM environment | ✅ | ❌ (Claude only) | ❌ (Claude only) | ✅ |
| Dependencies | Node.js / shell | Node.js | shell | Python |

## Usage

Each subrepository is independent. Clone with submodules:

```bash
git clone --recursive <repo-url>
```

Or initialize submodules separately:

```bash
git clone <repo-url>
git submodule update --init --recursive
```
