# opencode-model-sync

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/sanm00/opencode-model-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/sanm00/opencode-model-sync/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![npm downloads](https://img.shields.io/npm/dm/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![Node.js](https://img.shields.io/node/v/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

从 OpenAI 兼容 Provider 的 `GET /models` 接口同步模型列表到 OpenCode。

## 功能特性

- 从 OpenCode 合并后的配置中自动发现全部 Provider。
- 并发请求 Provider，不阻塞 OpenCode 启动。
- 将所有成功的更新通过一次原子写入保存到配置文件。
- 保留已有模型元数据，并移除上游不再返回的模型。
- 单个 Provider 请求失败时保留其原有模型，不影响其他 Provider。
- 不会将解析后的 API Key 或其他运行时 Provider 选项写入磁盘。
- 支持 `opencode.jsonc`，并保留文件中的注释。
- 提供可选的 TUI 命令，可更新单个 Provider 或全部 Provider。

## 环境要求

- OpenCode 1.18 或更高版本。
- Provider 提供 OpenAI 兼容的 `GET /models` 接口。
- 包含 Provider 定义且可写入的 OpenCode JSON 或 JSONC 配置文件。

## 安装

### 使用 AI 编码助手安装

将下面的提示词粘贴到 OpenCode、Claude Code、Codex 或其他编码助手中：

```text
请为我的 OpenCode 全局配置安装 opencode-model-sync。

1. 执行 `npx opencode-model-sync install`。
2. 检查全局 `opencode.json` 或 `opencode.jsonc` 的 plugin 数组中是否包含
   Server 插件 `opencode-model-sync`。
3. 检查全局 `tui.json` 的 plugin 数组中是否包含
   `opencode-model-sync/tui`。
4. 保留所有已有配置、插件和 JSONC 注释，不要整体覆盖任何配置文件。
5. 修改后验证两个配置文件，并明确报告实际修改了哪些文件。
6. 不要发布 npm 包、创建 Git 提交或删除已有插件。
7. 安装完成后提醒我重启 OpenCode。
```

### 本地安装

将仓库 clone 到 OpenCode 的全局插件目录，然后安装依赖并构建：

```sh
mkdir -p ~/.config/opencode/plugins
git clone <repository-url> ~/.config/opencode/plugins/opencode-model-sync
cd ~/.config/opencode/plugins/opencode-model-sync
npm install
npm run build
```

在 `~/.config/opencode/opencode.json` 中添加构建后的 Server 插件入口。
请将示例路径替换为当前用户主目录下的实际绝对路径：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/Users/your-name/.config/opencode/plugins/opencode-model-sync/dist/index.js"
  ]
}
```

如需启用 TUI 集成，在 `~/.config/opencode/tui.json` 中添加构建后的 TUI
入口：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/Users/your-name/.config/opencode/plugins/opencode-model-sync/dist/tui.js"
  ]
}
```

修改配置后需要重启 OpenCode。后续可通过以下命令更新本地插件：

```sh
cd ~/.config/opencode/plugins/opencode-model-sync
git pull
npm install
npm run build
```

### npm 安装

软件包发布到 npm 后，可以使用一条命令自动安装 Server 和 TUI 插件：

```sh
npx opencode-model-sync install
```

该命令会在需要时创建 OpenCode 全局配置文件，保留已有插件和 JSONC 注释，并自动
添加以下配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-model-sync"]
}
```

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-model-sync/tui"]
}
```

安装命令可以安全地重复执行，不会重复添加插件。如需使用自定义 OpenCode 配置目录：

```sh
npx opencode-model-sync install --config-dir /absolute/path/to/opencode
```

安装完成后需要重启 OpenCode。如果不希望 `npx` 自动修改配置，也可以手动添加上述
包入口。

默认按以下顺序查找需要更新的配置文件：

1. 插件选项 `configPath`。
2. 环境变量 `OPENCODE_CONFIG`。
3. `~/.config/opencode/opencode.json`。
4. `~/.config/opencode/opencode.jsonc`。

由于 OpenCode 会先合并全局配置和项目配置，再调用插件，如果需要更新项目配置，
请显式传入项目配置文件路径：

```json
{
  "plugin": [
    [
      "opencode-model-sync",
      { "configPath": "/absolute/path/to/project/opencode.json" }
    ]
  ]
}
```

## TUI

npm 一键安装命令会自动启用 TUI。手动安装 npm 包时，需要在 `tui.json` 中添加
TUI 入口：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-model-sync/tui"]
}
```

运行 `/model-sync` 可以选择更新单个 Provider 或全部 Provider。最近一次同步
结果会居中显示在首页输入框正下方，并在一分钟后自动消失。会话右侧栏会在
`Context`、`MCP`、`LSP` 下方保留 `Models` 区块，展示每个 Provider 最近一次
同步的模型数量或失败信息。后台写入的新模型将在下次启动 OpenCode 时加载。

## 配置选项

所有选项均为可选，可以传给 Server 或 TUI 插件入口：

```json
[
  "opencode-model-sync",
  {
    "configPath": "/absolute/path/to/opencode.jsonc",
    "statusPath": "/absolute/path/to/.model-sync-status.json",
    "endpoint": "models",
    "timeout": 5000,
    "defaultModel": {
      "limit": {
        "context": 204800,
        "output": 131072
      }
    }
  }
]
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `configPath` | 自动发现 | 需要更新 Provider 模型的 JSON/JSONC 配置文件。 |
| `statusPath` | 配置文件所在目录 | Server 和 TUI 共享的状态文件。 |
| `endpoint` | `models` | 相对于每个 Provider `options.baseURL` 的接口路径。 |
| `timeout` | `5000` | 请求超时时间，单位为毫秒。 |
| `defaultModel` | 上下文 204800，输出 131072 | 新发现模型使用的默认元数据。 |

不需要手动列出 Provider ID。插件会从当前合并配置中读取全部 Provider。没有配置
`options.baseURL` 的 Provider 会被标记为警告，并保留其原有模型列表。

## 开发

```sh
make install
make check
```

运行 `make help` 可以查看所有开发和发布命令。

## 发布

首次配置、版本选择、故障处理和完整检查清单请参阅
[发布指南](RELEASING.zh-CN.md)。

仓库维护者可以通过一条命令发布 patch、minor 或 major 版本：

```sh
make release-patch
make release-minor
make release-major
```

发布目标要求当前位于干净的 `main` 分支，并且已配置 `origin`。它会获取
`origin/main`，在本地分支落后或分叉时终止发布，然后运行完整检查、创建 npm 版本
提交和对应的 `v` 标签，最后推送 `main` 和标签。标签推送后会触发 GitHub Release
流水线。

发布流水线会校验标签、运行完整检查、通过 provenance 发布 npm 包，并创建包含软件包
压缩文件的 GitHub Release。首次发布前，需要在 GitHub 仓库中添加名为
`NPM_TOKEN` 的 npm automation token Secret。

## 安全说明

插件只会请求每个 Provider 配置的模型接口。运行时 `apiKey` 仅用于请求，写入磁盘
的内容只有远端返回的模型 ID 和模型元数据。状态文件中不包含凭据。

## 许可证

MIT
