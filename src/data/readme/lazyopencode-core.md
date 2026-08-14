# LazyOpenCode

Zero-config governed team runtime for AI coding in [OpenCode](https://opencode.ai).

One install line turns OpenCode into a governed AI coding team: task classifier, risk gates, focused subagents, workflow skills, background job tracking, permission guard, token budget, and close reports.

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["lazyopencode-core"]
}
```

## What It Does

| When you say... | What happens |
|----------------|--------------|
| `fix typo in footer.ts` | Goes straight to build — well-bounded work is ceremony-free |
| `/lazy start add user registration` | Classifies as medium → suggests grilling → gates until spec is done |
| `全面优化这个项目` | Blocked: "need scope, success criteria, must-not-break list" |

## Quick Start

1. [Install OpenCode](https://opencode.ai/docs/install)
2. Add `"lazyopencode-core"` to your [OpenCode config](https://opencode.ai/docs/config)
3. Run `opencode` in any project
4. Try `/lazy start <task>` or `/lazy doctor`

## Updating

Clear the plugin cache then restart OpenCode:

```sh
rm -rf ~/.cache/opencode/packages/lazyopencode-core@latest && opencode
```

The cache is checked at startup — no version detection yet, so manual refresh is needed after every publish.

## Docs

| Doc | What's inside |
|-----|---------------|
| [User Manual](packages/lazyopencode-core/docs/user-manual.md) | Full walkthrough |
| [Architecture](packages/lazyopencode-core/docs/architecture.md) | How it works |
| [Product Audit](packages/lazyopencode-core/docs/product-audit.md) | Scope and comparison |
| [Council](packages/lazyopencode-core/docs/council.md) | Multi-LLM decision system |
| [Work Plan](packages/lazyopencode-core/docs/work-plan.md) | Roadmap |

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`lazyopencode-core`](packages/lazyopencode-core/) | [![npm](https://img.shields.io/npm/v/lazyopencode-core)](https://www.npmjs.com/package/lazyopencode-core) | Core OpenCode plugin |
| `@lazyopencode/desktop` | `0.0.1` | Desktop distribution shell (planned 0.1.0) |

## License

MIT
