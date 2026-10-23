# opencode-tui-context

**在 OpenCode 侧边栏，一眼看清上下文占用与 token 构成。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/SolitudeRA/opencode-tui-context/blob/main/LICENSE)
[![OpenCode: V1 + V2](https://img.shields.io/badge/OpenCode-V1%20%2B%20V2-18181b)](#快速开始)

[English](https://github.com/SolitudeRA/opencode-tui-context/blob/main/README.md) · 简体中文 · [日本語](https://github.com/SolitudeRA/opencode-tui-context/blob/main/README.ja.md)

![上下文面板示意：已用 40%，上方显示已用、预留和剩余空间，下方显示缓存、提示、推理和输出 token 的构成。](https://raw.githubusercontent.com/SolitudeRA/opencode-tui-context/main/docs/assets/context-preview.svg)

*图中为示例数据与配色；实际颜色随 OpenCode 主题变化，输出段固定为黄色。*

- **双条视图**：上方看上下文窗口容量，下方看已用 token 的构成。
- **自动适应侧边栏**：进度条随宽度缩放，图例在空间不足时简化。
- **读取已有用量**：随会话更新，无需额外模型调用、tokenizer 或凭据。

## 快速开始

**同一个插件版本同时支持 OpenCode V1 和 V2。** 先运行 `opencode --version`，再选择对应命令：

| OpenCode | 安装 `2.1.1` | 全局配置 |
| --- | --- | --- |
| V1 `>=1.18.31 <2` | `opencode plugin -g opencode-tui-context@2.1.1` | `tui.json` → `plugin` |
| V2 `>=2.0.32 <3` | `opencode plugin add opencode-tui-context@2.1.1` | `cli.json` → `plugins` |

OpenCode 会下载预构建包，无需本地构建或手动选择适配器。重启 OpenCode 并打开会话侧边栏。**Context** 面板显示当前有效上下文内最近一份报告正数输出 token 的 assistant 用量；此前显示 `no usage snapshot yet`。

ZIP／源码安装、升级和侧栏设置见[使用指南](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.zh-CN.md#安装)。

## 读懂面板

- **上方总览条**：显示上下文窗口的已用、输出预留与剩余空间。
- **下方构成条**：显示已用 token 中缓存、提示、推理和输出各自的占比。

| 所属条 | 图例 | 分段 | 含义 |
| --- | --- | --- | --- |
| 总览 | `u` | `used` | 已用 token 总量 |
| 总览 | `r` | `reserved` | 剩余输出预留（估算） |
| 总览 | `f` | `free` | 扣除已用与预留后的剩余空间 |
| 构成 | `c` | `cached` | 缓存读取 token |
| 构成 | `p` | `prompt` | 输入 + 缓存写入 token |
| 构成 | `t` | `think` | 推理 token |
| 构成 | `o` | `out` | 输出 token |

`reserved` 只是基于模型输出上限的显示估算，不会实际预留 token，也不表示自动压缩阈值。

面板反映的是**当前有效上下文内最近一条报告正数输出 token 的 assistant 消息快照**，并非整个会话的累计账单，也不是下一次提示词的精确计数。完整口径见[用量如何计算](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.zh-CN.md#用量如何计算)。

## 可选配置

默认配置即可使用。两个宿主版本支持相同选项，配置格式有所不同。请参照 [V1／V2 配置示例](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.zh-CN.md#配置)修改已有条目，并保留其他设置和插件。

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `showLegend` | `true` | 显示两组图例；设为 `false` 可隐藏。 |
| `exclude` | `[]` | 隐藏指定分段及其图例。 |
| `barWidth` | `24` | 测量前的初始面板宽度；之后随侧边栏调整，不能固定进度条宽度。 |

修改后重启 OpenCode。全部选项、本地安装配置和显示边界见[完整配置](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.zh-CN.md#配置)。

## 文档与支持

- [使用指南](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.zh-CN.md)：ZIP／源码安装、配置、计算口径、常见问题、更新与移除。
- [贡献指南](https://github.com/SolitudeRA/opencode-tui-context/blob/main/CONTRIBUTING.zh-CN.md)：开发环境、验证命令与源码结构。
- [发布指南](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/releasing.md)：打包、自动发布与安装验收。
- [提交 issue](https://github.com/SolitudeRA/opencode-tui-context/issues)：请附上 OpenCode 版本、操作系统、终端及复现步骤。

## 许可证

[MIT](https://github.com/SolitudeRA/opencode-tui-context/blob/main/LICENSE) © opencode-tui-context contributors.
