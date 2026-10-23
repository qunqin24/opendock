# opencode-yaml-workflows

**中文** | [English](./README.md)

用 YAML 在 opencode 里运行可复用 workflow。`/workflow` 不只能执行已有 workflow，也可以让模型根据你的需求新建 workflow，适合把代码审查、安全审计、调研、迁移、发布检查这类多 agent 流程沉淀下来反复使用。

## 安装

在 opencode 配置里加入插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-yaml-workflows"]
}
```

修改配置后重启 opencode。

本地开发：

```bash
git clone https://github.com/dingyi222666/opencode-yaml-workflows
cd opencode-yaml-workflows
bun install
bun run build
```

然后在配置里引用本地路径：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-yaml-workflows"]
}
```

## 使用

把 workflow 文件放到这些目录之一：

- `~/.config/opencode/workflows/`
- `.opencode/workflows/`
- `.workflows/`

执行已有 workflow：

```text
/workflow review the current diff
```

或者让模型新建一个 workflow：

```text
/workflow create a release-check workflow for this repo and save it
```

模型会自动匹配已有 workflow；如果没有合适的，也可以根据你的请求生成新的 YAML workflow。你要求保存时，它可以写入 `.workflows/` 或 `.opencode/workflows/`，之后继续复用。

## 为什么是 YAML？

Claude Code Dynamic Workflows 会在运行时生成 JavaScript 编排脚本。这个插件使用 YAML，重点是让 workflow 更容易阅读、diff、提交到仓库，并和团队共享。

如果你想沉淀稳定的项目流程，比如 code review、安全审计、发布检查或反复执行的调研，用这个会更合适。

## 文档

- [安装](./docs/install.zh-CN.md)
- [编写 Workflow](./docs/workflows.zh-CN.md)
- [运行 Workflow](./docs/running.zh-CN.md)
- [Dynamic Workflows 对比](./docs/dynamic-workflows.zh-CN.md)
- [开发](./docs/development.zh-CN.md)

## 开发

```bash
bun test
bun run check
bun run build
npm pack --dry-run
```

## 许可证

MIT
