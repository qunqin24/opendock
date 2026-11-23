# yuri-plugins

[![CI](https://github.com/yee94/yuri-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/yee94/yuri-plugins/actions/workflows/ci.yml)
[![Release](https://github.com/yee94/yuri-plugins/actions/workflows/release.yml/badge.svg)](https://github.com/yee94/yuri-plugins/actions/workflows/release.yml)

OpenCode V2 / [Yuri](https://github.com/yee94/yuri) 插件 Monorepo。`packages/` 下的每个子包都是独立发布到 npm 的标准 `@opencode/plugin` 插件包，支持单包多入口：

- `.`：OpenCode Server 插件（Tools / Slash Commands / Skills / RPC）
- `./rpc`：共享的 `@opencode/plugin/rpc` 契约定义
- `./gui-experimental`：可选的 Yuri 桌面端 / Web 端 GUI 薄壳（单文件 CJS）

## Packages

| Package | npm | Description |
| --- | --- | --- |
| [`opencode-magpie-plugin`](packages/opencode-magpie-plugin) | [![npm](https://img.shields.io/npm/v/opencode-magpie-plugin.svg)](https://www.npmjs.com/package/opencode-magpie-plugin) | 在 OpenCode V2 中发现 Magpie Provider 与模型，内置价格表并自动启动本地网关 |
| [`opencode-plugin-wecom`](packages/opencode-plugin-wecom) | [![npm](https://img.shields.io/npm/v/opencode-plugin-wecom.svg)](https://www.npmjs.com/package/opencode-plugin-wecom) | 零桌面客户端依赖的企业微信 / 大圆 A2A 只读插件（WorkBuddy 扫码换票、群聊摘要查询、可选 `@wecom/cli` 办公域桥接与 Yuri GUI 设置页） |

## 快速使用

在 `~/.config/opencode/opencode.jsonc` 中添加所需插件包名即可：

```jsonc
{
  "plugins": [
    "opencode-plugin-wecom"
  ]
}
```

详细配置与工具说明请查看各子包的 README，例如 [`packages/opencode-plugin-wecom/README.md`](packages/opencode-plugin-wecom/README.md)。

## 本地开发

要求 Node.js `>= 22` 和 `pnpm@9`。

```sh
pnpm install
pnpm check   # Biome lint + TypeScript 类型检查 + tsdown 构建 + Vitest 测试 + GUI CJS 语法校验
pnpm build   # 仅构建所有子包
pnpm test    # 仅运行单元测试
```

## CI / CD 与发布流程

- **持续集成**（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)）：每次推送 `main` 或发起 PR 时自动执行 `pnpm install --frozen-lockfile`、`pnpm lint` 与 `pnpm -r check`。
- **自动发布**（[`.github/workflows/release.yml`](.github/workflows/release.yml)）：使用仓库 Secret `NPM_TOKEN` 发布到 npmjs.org，支持两种触发方式：
  1. **推送版本 Tag**：例如推送 `opencode-plugin-wecom@v0.1.0`（或总包标签 `v0.1.0`），流水线会先执行完整 `pnpm check`，校验版本未在 npm 发布后自动 `pnpm publish --access public` 并创建 GitHub Release。
  2. **手动触发（`workflow_dispatch`）**：在 GitHub Actions 页面可手动指定子包名及 `dry_run` 模式进行试跑或补发。

## License

[MIT](LICENSE)
