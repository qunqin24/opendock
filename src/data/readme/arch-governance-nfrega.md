# arch-governance-opencode

OpenCode plugins for enterprise-grade architecture governance of AI applications — covering traditional architecture, AI-specific constraints, compliance/security, and China NFREGA (国家金融监督管理总局《关于银行业保险业人工智能安全开发应用的指导意见》) financial industry supplements.

## Packages

| Package | Description |
|---|---|
| [`arch-governance-opencode`](./packages/arch-governance-opencode) | Base plugin — 95 rules (40 traditional + 30 AI + 25 compliance), 3 agents, 3 commands |
| [`arch-governance-nfrega`](./packages/arch-governance-nfrega) | NFREGA supplement — 30 NF rules + 9 enhancements, 2 finance-specific commands |

## Installation

```bash
# Base plugin (required)
npm install -g arch-governance-opencode

# NFREGA supplement (optional, for China banking/insurance)
npm install -g arch-governance-nfrega
```

Then add to your `opencode.json`:

```json
{
  "plugin": [
    "arch-governance-opencode",
    "arch-governance-nfrega"
  ]
}
```

## Three Scenarios

| Command | Scenario |
|---|---|
| `/arch-new` | New project architecture guidance |
| `/arch-diagnose` | Existing project diagnosis |
| `/arch-audit` | Production readiness audit |
| `/arch-finance-new` | Finance new project (with NFREGA) |
| `/arch-finance-audit` | Finance production audit (with NFREGA) |

## Compatibility

- Works standalone or alongside `oh-my-openagent` (soft cooperation, no naming conflicts)
- Multi-tech-stack: Java/Spring, .NET, Node/TS, Python

## License

MIT