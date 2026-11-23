# opencode-plugins

Bun workspace monorepo，包含独立安装、配置和发布的 OpenCode 插件、共享核心库与 OpenChamber 扩展。各包的用法、配置和限制见下方文档。

这些插件面向 OpenCode V2。auto-retry 最低支持 OpenCode 2.0.31；其他插件的版本要求见各自 README。

## 插件与扩展

- [@misakacloud/opencode-auto-retry](packages/auto-retry/README.md)：内容拦截（`provider.content-filter`）之后，按规则向该会话发一条可见的续写。安装见 [安装](packages/auto-retry/README.md#安装)。
- [@misakacloud/opencode-skill-filter](packages/skill-filter/README.md)：按规则软隐藏或硬剔除 skill，并把硬剔除同步为内核 policy。安装见 [安装](packages/skill-filter/README.md#安装)。
- [@misakacloud/opencode-auto-model-config](packages/auto-model-config/README.md)：用 models.dev 的数据给自定义 provider 补模型元数据，不覆盖已经填写的字段。启用方式见 [在 OpenCode 中启用](packages/auto-model-config/README.md#在-opencode-中启用)。
- [@misakacloud/opencode-model-prompts](packages/model-prompts/README.md)：按模型、代理与工具条件，将独立目录中的提示词文件按顺序注入系统上下文。安装见 [安装](packages/model-prompts/README.md#安装)。
- [@misakacloud/opencode-compact-enhance](packages/compact-enhance/README.md)：在 OpenChamber Web 或 TUI 中用 `/compact-enhance` 请求上下文压缩，可附加一次性指令，指定摘要要保留或略去哪些内容。安装见 [安装](packages/compact-enhance/README.md#安装)。
- [@misakacloud/opencode-mux](packages/mux/README.md)：在独立的 `tmux` / `psmux` pane 中运行构建、测试与后台服务，使人与 AI 可查看和接管同一个终端会话。安装见 [安装](packages/mux/README.md#安装)。
- [@misakacloud/openchamber-mux](packages/openchamber-mux/README.md)：配套 OpenChamber 扩展（工作区面板、Work Status 侧栏、主机本地服务与内嵌 OpenCode 插件）。安装见 [安装](packages/openchamber-mux/README.md#安装)。
- [@misakacloud/opencode-mux-core](packages/mux-core/README.md)：供 OpenCode 插件与 OpenChamber 扩展共用的 `tmux` / `psmux` 任务管理核心库。

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
