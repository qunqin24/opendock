# Magpie Plugins

[![CI](https://github.com/yee94/opencode-magpie-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/yee94/opencode-magpie-plugin/actions/workflows/ci.yml)

[Magpie](https://usemagpie.ai/) 插件集合。这里的包都是 Magpie 插件，用 `magpie plugin add` 安装，不放进 OpenCode 的 `plugins` 数组。

OpenCode 侧的 Magpie 模型接入插件 `opencode-magpie-plugin` 已迁到 [yee94/yuri-plugins](https://github.com/yee94/yuri-plugins/tree/main/packages/opencode-magpie-plugin)。

## 包

| 包 | 作用 |
| --- | --- |
| [`magpie-claude-opencode-adapter`](packages/magpie-claude-opencode-adapter/README.md) | OpenCode 经 Magpie 使用 Claude Code 订阅渠道时，改写请求以避免第三方 Agent 指令被拒绝（实验性） |
| [`magpie-remote-claude-code`](packages/magpie-remote-claude-code/README.md) | 把另一台电脑上的 Remote Magpie 当作 Claude Code provider，并提供预热等设置页 |

两个包各自拥有源码、测试、版本和打包清单，互不依赖，均无运行时 npm 依赖。本项目不是 Magpie 官方插件。

## 参与开发

```sh
pnpm install --frozen-lockfile
pnpm check            # 两个包及共享工具的完整检查
pnpm check:adapter    # 只检查订阅适配器
pnpm check:remote     # 只检查 Remote Claude Code 插件
```

CI 分包检查；CD 可选择 `all` 或单个包发布，失败互不取消。发布、凭据要求和恢复步骤见 [维护者发布指南](docs/releasing.md)。
