<div align="center">

# OpenCARL

[![Coverage](https://codecov.io/gh/KrisGray/opencarl/branch/main/graph/badge.svg)](https://codecov.io/gh/KrisGray/opencarl)

**Context Augmentation & Reinforcement Layer** — Dynamic rules for OpenCode.

[![npm version](https://img.shields.io/npm/v/opencarl?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/opencarl)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/KrisGray/opencarl?style=for-the-badge&logo=github&color=181717)](https://github.com/KrisGray/opencarl)
[![Docs](https://img.shields.io/badge/docs-live-brightgreen?style=for-the-badge)](https://krisgray.github.io/opencarl/)

<br>

*"Rules that load when relevant, disappear when not."*

</div>

---

## What is OpenCARL?

OpenCARL is a dynamic rule injection plugin for OpenCode. Define your preferences once, and they load automatically when relevant to your current task.

**Key Features:**
- Keyword-based rule loading
- Star-commands for explicit triggers (`*brief`, `*deep`)
- Context-aware behavior
- Global and project-level rules

---

## Documentation

**Full documentation:** [krisgray.github.io/opencarl](https://krisgray.github.io/opencarl/)

**Guides:**
- [Installation Guide](https://krisgray.github.io/opencarl/install/)
- [OpenCARL Overview](https://krisgray.github.io/opencarl/guides/opencarl-overview/)
- [Domain Guide](https://krisgray.github.io/opencarl/guides/domain-guide/)
- [Commands Guide](https://krisgray.github.io/opencarl/guides/commands-guide/)
- [Manifest Reference](https://krisgray.github.io/opencarl/guides/manifest-reference/)
- [Context Rules](https://krisgray.github.io/opencarl/guides/context-rules/)
- [Suggest Domain](https://krisgray.github.io/opencarl/guides/suggest-domain/)

**Tutorials:**
- [Python API Tutorial](https://krisgray.github.io/opencarl/tutorials/python-api/) — Test-driven development with pytest, mocks, and external APIs

**Troubleshooting:** [Troubleshooting Guide](https://krisgray.github.io/opencarl/troubleshooting/)

---

## Quick Start

```bash
# 1. Install
npm install opencarl

# 2. Add to opencode.json
echo '{"plugin": ["opencarl"]}' > opencode.json

# 3. Run setup
npx opencarl --local
```

Restart OpenCode. Type `*opencarl` for interactive help.

---

## Usage

```
*opencarl              # Interactive help mode
*opencarl docs         # View documentation
*brief explain this    # Concise response
*deep analyze this     # Comprehensive analysis
```

Rules load automatically when your prompt matches domain keywords (e.g., "fix bug" loads development rules).

---

## CLI Commands

```bash
npx opencarl --local              # Install for current project
npx opencarl --global             # Install for all projects
npx opencarl --integrate          # Add OpenCARL section to AGENTS.md
npx opencarl --integrate-opencode # Add docs to opencode.json
npx opencarl --help               # Show all options
```

---

## Configuration

```
.opencarl/
├── manifest        # Domain registry (states + keywords)
├── global          # Always-loaded rules
├── commands        # Star-command definitions
└── {domain}        # Custom domains (lowercase, no extension)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Rules not loading | Check `STATE=active` in manifest |
| Plugin not found | Verify `opencode.json` has `"plugin": ["opencarl"]` |
| Domain ignored | Filename must be lowercase, no extension |

**Debug mode:** `OPENCARL_DEBUG=true`

Full guide: [Troubleshooting Guide](https://krisgray.github.io/opencarl/troubleshooting/)

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**OpenCode is powerful. OpenCARL makes it personal.**

</div>
