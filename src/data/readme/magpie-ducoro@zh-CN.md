<p align="center">
<a href="https://opc.fish" title="OPC.FISH Project."><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YE4IM/readme/main/project/assets/opc-fish-project-signature-web-dark.svg"><img src="https://raw.githubusercontent.com/YE4IM/readme/main/project/assets/opc-fish-project-signature.svg" alt="OPC.FISH 项目署名" width="720"></picture></a>
</p>

# magpie-ducoro

[English](./README.md) | [**中文**](./README-zh-CN.md)

在 Magpie 中配置 Ducoro，让 Bot 跟随默认模型或使用单独分配的模型、连接器、技能和指令。

[![GitHub 版本](https://img.shields.io/github/v/release/YE4IM/magpie-ducoro)](https://github.com/YE4IM/magpie-ducoro/releases/latest) [![MIT 许可证](https://img.shields.io/github/license/YE4IM/magpie-ducoro)](./LICENSE)

[快速开始](#快速开始)

<img src="./assets/ducoro-plugin.png" alt="Ducoro 插件的同步设置页，显示网关连接、Bot 模型、连接器、技能和指令的同步开关" width="720">

*Ducoro 的同步设置页，使用示例数据。*

[安装](#安装) · [用法](#用法) · [配置](#配置) · [故障排除](#故障排除) · [变更日志](#变更日志)

## 概述

在 Magpie 的 Ducoro 插件页面管理同步。保存前可核对资源分配及撤销范围，保存后可查看 Ducoro 的写入、读回和会话加载状态。

## 环境要求

- Magpie 支持插件 Agent 和页面服务（`magpie.agent` 和 `magpie.page.service`）。[Magpie](https://usemagpie.ai)
- 已安装并登录 Ducoro，后台服务正在运行，且有权访问本机设备和要管理的 Bot。[Ducoro](https://ducoro.ai)
- 启动 Magpie 时使用的 `PATH` 可以找到 `ducoro-cli`。[下载 Ducoro CLI](https://ducoro.ai/download/cli)

## 安装

在 Magpie 中打开「插件 → 添加插件」，输入 `github:YE4IM/magpie-ducoro#v0.4.11`，也可以使用 Magpie 命令行。

```bash
magpie plugin add github:YE4IM/magpie-ducoro#v0.4.11
```

也可以下载并解压源码归档，再将解压后文件夹的绝对路径添加到 Magpie。[GitHub Release](https://github.com/YE4IM/magpie-ducoro/releases/tag/v0.4.11)

## 快速开始

1. 在 Magpie 的「Agent」页面连接 Ducoro 并选好模型，再从侧边栏打开「Ducoro」。
2. 在「同步设置」中检查连接标识、启用的资源类型和目标 Bot。需要单独分配时，打开「Bot 资源」。
3. 点击「预览变化」核对新增项、撤销原因和首次创建网关连接的操作。再点击「预览并保存」并确认。保存设置后会启动同步。
4. 在「同步状态」中核对写入和读回结果。要确认 Ducoro 已加载新配置，请在目标 Bot 中开始新会话，再查看会话加载状态。

> [!NOTE]
> 本次整理验证了诊断命令的入口。当前环境的插件实时诊断服务不可用，安装、首次同步及新会话加载尚未实测。

## 用法

- **模型**可以跟随 Magpie 默认设置，也可以按 Bot 分配。插件会根据 Ducoro 目录匹配模型能力，支持手动覆盖。
- **连接器和技能**支持全局或按 Bot 分配。某个 Bot 的资源清单为空时，插件会清除自身对该 Bot 的同类分配，其他来源分配的资源仍然可用。使用 Ducoro 账户连接器时，先在 Ducoro 中连接服务，再为各 Bot 选择允许的工具。
- **指令和子代理**按选定目标同步。指令写入插件管理的区块，子代理需显式选择。
- **方案**可以在多个 Bot 间共享模型、连接器、技能和指令设置。Bot 的单项覆盖优先于继承值。
- **按资源反查 Bot** 可从技能或资源库连接器查看接收它的 Bot、分配来源和最近一次读回核验结果。
- **对比两个 Bot** 可查看模型路由、资源分配、账户工具权限和核验结果的差异，并从结果打开相应设置。
- **方案试用** 在保存共享方案的预览中选择「先让一个 Bot 试用」。再次预览并保存后，其他 Bot 继续使用正式方案。打开「方案试用」核验试用 Bot，再推广或结束试用。在 Ducoro 中启动新会话可确认加载结果。
- **备份与恢复**提供管理记录备份和配置检查点。恢复管理记录后，点击「预览影响并继续同步」核对改动并恢复同步。

从解压后的源码目录运行只读诊断。`--doctor` 会检查 Ducoro 后台服务。使用 `--lang zh` 输出中文，或用 `--json` 获取结构化结果。

```bash
node diagnostics-cli.mjs --doctor
```

插件页面跟随 Magpie 的语言设置。简体和繁体中文使用中文，其余语言使用英文。

## 配置

| 选项 | 默认值 | 用途 |
| --- | --- | --- |
| `connectionSlug` | `magpie-ducoro` | Ducoro 模型连接标识 |
| `servicePort` | `3487` | `127.0.0.1` 上的页面服务端口 |
| `modelScope`、`mcpScope`、`skillsScope` | `global` | 设为 `agents` 可按 Bot 分配 |
| `targetAgents` | `[]` | 将模型、指令、子代理和按 Bot 分配的资源库内容限制在选定的 Bot |
| `botModels` | `{}` | 按 Bot ID 指定模型 |
| `resourceAssignments` | `{}` | 按 Bot ID 指定资源库连接器和技能 |
| `accountConnectors` | `{}` | 按 Bot ID 和连接器标识指定允许或拒绝的账户工具 |
| `modelCapabilityRefs` | `{}` | 手动设置模型能力参考 |
| `subagentNames` | `[]` | 显式选定的子代理 |

管理记录默认保存在 `~/.config/magpie/ducoro-bridge/state.json`。设置 `DUCORO_BRIDGE_STATE_DIR` 时使用指定目录，否则有 `XDG_CONFIG_HOME` 时使用其下的 `magpie/ducoro-bridge` 子目录。

## 故障排除

- **页面打不开。** 确认 Magpie 可以找到 `ducoro-cli`、Ducoro 后台服务正在运行，并且 `servicePort` 对应的端口可用。
- **管理记录不可读，导致同步暂停。** 保留原始 `state.json` 及其增量日志。在「备份与恢复」中检查有效备份，恢复后预览影响并继续同步。
- **宿主停止后同步锁仍在。** 停止所有插件宿主，再从源码目录运行检查命令，查看锁归属和可用的恢复指引。

```bash
npm run lock:inspect -- /absolute/path/to/ducoro-bridge
```

切换版本前请先停止当前插件宿主。若要降级，请在当前版本目录中先将增量日志合并到快照，再加载旧版。

```bash
npm run state:compact -- /absolute/path/to/state.json
```

## 变更日志

[版本历史与各版发布说明](./docs/CHANGELOG.md) · [最新发布说明](./docs/RELEASE-NOTES.md) · [GitHub Releases](https://github.com/YE4IM/magpie-ducoro/releases)

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
