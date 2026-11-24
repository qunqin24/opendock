<a href="https://opc.fish"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YE4IM/readme/main/assets/opc-fish-project-signature-web-dark.svg"><img src="https://raw.githubusercontent.com/YE4IM/readme/main/assets/opc-fish-project-signature.svg" alt="OPC.FISH 项目署名" width="720"></picture></a>

# magpie-ducoro

[English](./README.md) | [**中文**](./README.zh-CN.md)

把 Magpie 的模型、连接器、技能、指令和显式选择的子代理同步到 Ducoro，并在插件页面里按 Bot 分配。

[![npm version 0.4.10](https://img.shields.io/npm/v/magpie-ducoro)](https://www.npmjs.com/package/magpie-ducoro) [![MIT license](https://img.shields.io/github/license/YE4IM/magpie-ducoro)](./LICENSE)

[快速开始](#快速开始)

```text
Usage: node diagnostics-cli.mjs [--lang en|zh] [--json] [--state-dir <directory>] [--port <port>] [--doctor] [--cli <path>]
Read-only live report. --doctor checks daemon status without changing configuration.
```

上面这段文字来自 2026-11-24 实际执行的 `npm exec --package=magpie-ducoro@0.4.10 -- magpie-ducoro-status --help`。即使通过 `magpie-ducoro-status` 启动，脚本仍打印这一行用法说明。这是诊断命令的帮助。本环境没有完成一次同步。

## 目录

- [概述](#概述)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [功能](#功能)
- [用法](#用法)
- [配置](#配置)
- [文档](#文档)
- [故障排除](#故障排除)
- [开发](#开发)
- [变更日志](#变更日志)
- [贡献](#贡献)
- [许可证](#许可证)

## 概述

`magpie-ducoro` 0.4.10 是一个 Magpie 插件。它把 Ducoro 接到 Magpie 模型上，并同步你分配的 Magpie 资源。保存前会先预览。插件页面只监听本机回环地址。

> [!NOTE]
> 仓库没有写明 Magpie 或 Ducoro 的最低版本，也没有写明已验证的 Windows 或 Linux 兼容性。Ducoro 和 `ducoro-cli` 需要单独安装。本插件的安装步骤不包含这两项。

## 环境要求

- 带插件 Agent 和页面服务的 Magpie。仓库现有说明点名 `magpie.agent` 与 `magpie.page.service`。
- 已安装并登录 Ducoro，后台服务在运行，且当前账户能访问要管理的本地设备与 Bot。
- 启动 Magpie 时的 `PATH` 里能找到 `ducoro-cli`。项目给出的入口是 [CLI 下载](https://ducoro.ai/download/cli)。

`package.json` 没有 `engines` 字段。本机执行诊断命令时用的是 Node.js v26.13.1。这是本次检查所用版本，仓库没有把它写成最低版本。

## 安装

在 Magpie 里注册插件。下面这条命令写在 0.4.10 的说明里。本机的 `magpie plugin --help` 列出了 `magpie plugin add`。添加本身没有执行，因此这里没有核实注册结果。

```bash
magpie plugin add magpie-ducoro@0.4.10
```

也可以在 Magpie 的「插件 → 添加插件」中输入 `magpie-ducoro@0.4.10`。

`npm install magpie-ducoro` 只会下载包，不会把插件注册进 Magpie。npm 包是 [`magpie-ducoro`](https://www.npmjs.com/package/magpie-ducoro)。

<details>
<summary>从文件夹或 Git 标签安装</summary>

从 [GitHub Releases](https://github.com/YE4IM/magpie-ducoro/releases) 下载发行包，解压后在 Magpie 里添加该文件夹的绝对路径。也可以添加 GitHub 引用 `github:YE4IM/magpie-ducoro#v0.4.10`。

</details>

## 快速开始

1. 从 Magpie 侧边栏打开 **Ducoro**。页面打不开时，检查 `ducoro-cli`、Ducoro 后台服务，以及页面服务端口（默认 `127.0.0.1:3487`）。
2. 在「同步设置」里核对连接标识、启用的资源类型和目标 Bot。
3. 先点「预览变化」，再点「预览并保存」，确认预览。保存会重载插件宿主并开始同步。
4. 打开「同步状态」，查看已保存、已写入、已读回和会话加载的结果。命令成功之后，正在运行的会话有没有加载这次变更，以这份报告为准。

这四步是仓库里的首次使用路径，这里没有实际走通。保存按钮按当前页面 `ui/index.html` 的文案写成「预览并保存」。仓库中文 README 仍写着「保存设置」，这句旧文案还留在语言表里。

下面这条命令对 npm 包 0.4.10 执行过，退出码 0：

```bash
npm exec --package=magpie-ducoro@0.4.10 -- magpie-ducoro-status --help
```

这里也跑过 `magpie-ducoro-status --doctor`，退出码 2。Ducoro 的只读 `info` 检查成功。报告写明尚未完成同步，插件的实时诊断服务连不上。它给出的下一步是：在 Magpie 里启用 Ducoro 插件，重新打开页面，或检查服务端口。

## 功能

- 模型、Magpie 资源库连接器和技能可以全局分配，也可以按 Bot 分配。某个 Bot 的列表为空，表示本插件不给它分配这一类资源。其他全局配置和用户自己的配置仍保留。
- 指令追加在插件自己的区块里。子代理只同步你明确选中的那些。
- 写入前可以预览新增和撤销。保存时会要求确认。
- 每一项分别跟踪已保存、已写入、已读回和会话加载。证据不够的项目保持未核实。
- 每次保存前建立配置检查点。从管理记录备份恢复后，自动同步会暂停，直到你预览并继续。
- 在终端读取实时诊断报告。这条命令不写报告文件。

## 用法

在检出的仓库里：

```bash
node diagnostics-cli.mjs
node diagnostics-cli.mjs --lang zh
node diagnostics-cli.mjs --json
node diagnostics-cli.mjs --port 3488
node diagnostics-cli.mjs --doctor
```

包安装之后，同一入口是 `magpie-ducoro-status`，标志相同。`--doctor` 只读取守护进程信息，配置保持原样。

页面跟随 Magpie 的语言。简体和繁体使用中文，其他语言和未知语言使用英文。

加载另一个版本之前先停掉原来的插件宿主，让共享管理状态只由一份程序写入。兼容的 v1 和 v2 记录会保留。

回退前先停止当前宿主，再在本包里合并增量日志：

```bash
npm run state:compact -- /absolute/path/to/state.json
```

## 配置

页面服务默认监听 `127.0.0.1:3487`，可用 `servicePort` 更改。请求会检查 `Host`、`Origin` 和页面令牌。页面收到资源名称和状态，连接凭据留在页面之外。

默认管理文件是 `~/.config/magpie/ducoro-bridge/state.json`。`XDG_CONFIG_HOME` 和 `DUCORO_BRIDGE_STATE_DIR` 可以改这个目录。小变更追加到 `state.json.journal`，满 128 条或 1 MiB 后合并。

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `modelScope` | `global` | `global`，或用 `agents` 按 Bot 分配模型 |
| `botModels` | `{}` | Bot ID 到模型 ID。省略的项跟随继承 |
| `mcpScope` | `global` | Magpie 资源库连接器的全局或按 Bot 分配 |
| `skillsScope` | `global` | 技能的全局或按 Bot 分配 |
| `resourceAssignments` | `{}` | Bot ID 到 `mcp` 与 `skills` 名称列表 |
| `accountConnectors` | `{}` | Bot ID 到连接器标识，再到 `{allow, deny}` |
| `servicePort` | `3487` | 本机回环上的页面服务端口 |
| `connectionSlug` | `magpie-ducoro` | 插件模型连接标识 |
| `modelCapabilityRefs` | `{}` | 手动指定的模型能力参考 |

同一份默认对象里还有 `botPlansCatalog`、`botPlans`、`botInstructions`、`pausedModels` 和 `modelGuards`。钩子和 RTK 留在同步之外。

## 文档

- [变更日志](docs/CHANGELOG.md)
- [版本说明](docs/RELEASE-NOTES.md)

## 故障排除

> [!WARNING]
> 保留 `state.json`。用空对象替换它会丢掉撤销分配时要用的原权限。

记录不可读、损坏或版本不受支持时，同步会暂停，原文件保留。在「同步状态 → 异常排查」里预览备份，然后手动同步。恢复备份恢复的是管理记录。Bot 配置要等之后的同步才会变。当前页面标签是「同步状态」。仓库 README 仍把这一区叫作同步诊断。

清理残留锁之前，先停止每一个插件宿主，重新查看持锁信息，并使用最新的恢复令牌：

```bash
npm run lock:inspect -- /absolute/path/to/ducoro-bridge
npm run lock:inspect -- /absolute/path/to/ducoro-bridge TOKEN --all-hosts-stopped
```

第二条只在全部宿主都已停止、并且重新检查过之后再执行。`TOKEN` 是上一条检查命令给出的恢复令牌。

草稿锁仍在时，停止全部插件宿主，备份 `page-draft.lock` 和 `page-draft-locks`，把它们移出状态目录，再重新打开页面。保留 `page-draft.json`。

## 开发

`bridge.mjs` 是插件入口。`ducoro.agent.js` 是 Magpie 的代理定义。`diagnostics-cli.mjs` 是诊断命令。`lib/` 放同步、状态和页面服务代码。`ui/` 与 `assets/` 是页面。`scripts/` 是维护命令。`docs/` 是变更日志和版本说明。

```bash
npm run diagnostics
npm run state:compact -- /absolute/path/to/state.json
npm run lock:inspect -- /absolute/path/to/ducoro-bridge
```

## 变更日志

[docs/CHANGELOG.md](docs/CHANGELOG.md)。当前发布：[v0.4.10](https://github.com/YE4IM/magpie-ducoro/releases/tag/v0.4.10)。

## 贡献

问题请开到 <https://github.com/YE4IM/magpie-ducoro/issues>。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
