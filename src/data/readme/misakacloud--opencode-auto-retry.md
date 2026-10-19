# opencode-plugins

Bun workspace monorepo，包含三个独立安装、配置和发布的 OpenCode 插件。各包的用法、配置和限制见下方文档。

这些插件面向 OpenCode V2。auto-retry 最低支持 OpenCode 2.0.31；其他插件的版本要求见各自 README。

## 插件

- [@misakacloud/opencode-auto-retry](packages/auto-retry/README.md)：内容拦截（`provider.content-filter`）之后，按规则向该会话发一条可见的续写。安装见 [安装](packages/auto-retry/README.md#安装)。
- [@misakacloud/opencode-skill-filter](packages/skill-filter/README.md)：按规则软隐藏或硬剔除 skill，并把硬剔除同步为内核 policy。安装见 [安装](packages/skill-filter/README.md#安装)。
- [@misakacloud/opencode-auto-model-config](packages/auto-model-config/README.md)：用 models.dev 的数据给自定义 provider 补模型元数据，不覆盖已经填写的字段。启用方式见 [在 OpenCode 中启用](packages/auto-model-config/README.md#在-opencode-中启用)。

## 开发

在仓库根目录执行：

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
```

`typecheck` 会对 `packages/` 下的包做类型检查，`test` 跑本仓库的 vitest。

## 发布

每个包单独发布。仓库里 `package.json` 的 `version` 只是占位，真正的版本由 tag 决定。步骤、OIDC 和审批见 [发布说明](docs/RELEASING.md)。
