# opencode-secrets-env

[![English](https://img.shields.io/badge/lang-English-blue)](./README.md)
[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red)](./README.zh-CN.md)
[![npm](https://img.shields.io/npm/v/opencode-secrets-env)](https://www.npmjs.com/package/opencode-secrets-env)
[![CI](https://github.com/bytesnail/opencode-secrets-env/actions/workflows/ci.yml/badge.svg)](https://github.com/bytesnail/opencode-secrets-env/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/opencode-secrets-env)](https://www.npmjs.com/package/opencode-secrets-env)
[![支持平台: Linux · macOS · Windows](https://img.shields.io/badge/platforms-Linux%20%C2%B7%20macOS%20%C2%B7%20Windows-informational)](https://github.com/bytesnail/opencode-secrets-env/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

一个 [OpenCode](https://opencode.ai) 插件：在 OpenCode 启动时，把
`~/.config/opencode/secrets.env` 中的密钥加载进 `process.env`。

注入的变量可被以下对象使用：

- **MCP 服务器** —— 在 `mcp.servers.*.environment` / `headers` 中通过 `{env:NAME}` 替换
- **其他插件** —— 在本插件之后加载的插件可直接从 `process.env` 读取
- **OpenCode 自身** —— 例如从环境变量发现的 provider API key

密钥因此不必写进 `opencode.json(c)`，配置可以安全提交到 dotfiles 仓库而不泄露。

![演示：轮换 `secrets.env` 中的密钥 —— 运行中的 OpenCode 服务约一秒内热加载，并自动重连受影响的 MCP 服务器，无需重启](./.github/assets/demo.gif)

## 安装

已在 Linux、macOS 与 Windows 上测试 —— CI 在三个系统上对 V1/V2 双宿主
运行单元测试与真实宿主 e2e。

OpenCode V2（`@opencode/cli` 2.x）：

```sh
opencode plugin add opencode-secrets-env
```

OpenCode V1（`opencode-ai` 1.x，>= 1.14.34）没有插件 CLI 命令 —— 按下文
把包名加入 `~/.config/opencode/opencode.jsonc`（全局）或项目
`opencode.jsonc` 的 `plugin` 数组即可，V1 会在启动时自动安装 npm 插件。

`plugin` 键（单数）配合字符串或 `[名字, 选项]` 元组形式是 V1/V2 都能
加载的写法；复数 `plugins` 键（V2 的原生形式，也是 `opencode plugin add`
写入的形式）接受字符串或 `{ "package", "options" }` 对象，但 V1 宿主无法
通过它运行本插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    // 放在最前面，后面的插件在 setup() 时就能读到这些变量
    "opencode-secrets-env"
  ]
}
```

## 使用

创建密钥文件（dotenv 格式）并收紧权限（可从
[secrets.env.example](./secrets.env.example) 起步）：

```sh
mkdir -p ~/.config/opencode
cat >> ~/.config/opencode/secrets.env <<'EOF'
GITHUB_TOKEN=ghp_xxx
CONTEXT7_API_KEY=ctx7_xxx
EOF
chmod 600 ~/.config/opencode/secrets.env
```

在 OpenCode 配置中引用这些变量：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-secrets-env"],
  "mcp": {
    "servers": {
      "context7": {
        "type": "remote",
        "url": "https://mcp.context7.com/mcp",
        "oauth": false,
        "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
      },
      "github": {
        "type": "local",
        "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
        "environment": { "GITHUB_TOKEN": "{env:GITHUB_TOKEN}" }
      }
    }
  }
}
```

（如上图嵌套在 `mcp.servers.<名字>` 下是 V2 的规范写法，V2 仍兼容扁平的
旧式 `mcp.<名字>`；V1 宿主的规范写法是扁平的 `mcp.<名字>`，也同样兼容
上图的嵌套形式。本插件两种形状都会扫描。）

重启 OpenCode 让插件（重新）注入变量 —— V2 重启的是后台服务：

```sh
opencode service restart   # V2；V1 请重启 TUI / server 进程
```

文件路径跟随 OpenCode 自身的全局配置目录解析：设置了
`OPENCODE_CONFIG_DIR` 时为 `$OPENCODE_CONFIG_DIR/secrets.env`，其次设置了
`XDG_CONFIG_HOME` 时为 `$XDG_CONFIG_HOME/opencode/secrets.env`，否则为
`~/.config/opencode/secrets.env`。

### 文件格式

标准 [dotenv](https://github.com/motdotla/dotenv) 语法：

```dotenv
# 注释和空行都可以
export OPTIONAL_EXPORT_PREFIX=value
QUOTED="带空格的值"
SINGLE='单引号也可以'
INLINE=value # 行尾注释
EMPTY=
```

## 选项

在 `opencode.json(c)` 中用元组形式传入选项 —— `[名字, 选项]` 在 V1/V2
宿主上都可用：

```jsonc
{
  "plugin": [
    ["opencode-secrets-env", {
      "path": "~/secrets/work.env",
      "override": false,
      "required": ["GITHUB_TOKEN"],
      "debug": true
    }]
  ]
}
```

| 选项       | 类型       | 默认值 | 说明 |
| ---------- | ---------- | ------ | ---- |
| `path`     | `string`   | `~/.config/opencode/secrets.env` | 自定义密钥文件路径，支持 `~`（Windows 上也可用 `~\`）与相对路径（相对项目目录解析）。 |
| `override` | `boolean`  | `false` | 覆盖真实环境中已存在的变量。默认真实环境优先。 |
| `required` | `string[]` | `[]`    | 加载后必须存在的变量名，每个缺失的变量都会记录一条警告。 |
| `watch`    | `boolean`  | `true`  | 监听密钥文件变化并热更新 `process.env`（见下文）。 |
| `pollIntervalMs` | `number` | `5000`  | 文件监听器兜底的 mtime 轮询间隔（仅 `watch` 开启时生效）。操作系统事件是快速路径；轮询负责治愈丢失的事件——FSEvents 在高负载下会丢事件，否则这次热更新将被彻底错过，直到重启。每个间隔一次 stat；`0` 关闭兜底（不推荐）。 |
| `mcpReconnect` | `boolean \| "all" \| string[]` | `true` | 热更新后重连 MCP 服务器使其拿到新值。`true` = 仅重连配置中引用了变化变量的服务器（精确按需），`"all"` = 所有启用的服务器，`["名字"]` = 仅指定服务器，`false` = 从不重连。 |
| `quiet`    | `boolean`  | `false` | 静默 info/debug 日志（警告始终输出）。 |
| `debug`    | `boolean`  | `false` | 额外记录注入/跳过的**键名**（值永不记录）。 |

## 热更新

`watch` 开启时（默认），编辑 `secrets.env` 后约 1 秒内生效，无需
`opencode service restart`。监听器是事件驱动的，并配有低频 mtime 轮询
兜底（默认 5 秒）：如果操作系统丢了监听事件（FSEvents 在高负载下会丢），
改动仍会在一个轮询间隔内落地，而不是被错过直到下次重启：

- **新增的 key** 注入运行中服务的 `process.env`；
- **修改的 key** 原地更新 —— 但只更新插件自己注入的 key，来自真实 shell
  环境的同名变量永不被触碰（除非开启 `override`）；
- **删除的 key** 从 `process.env` 撤回（`override` 模式下恢复 shell 原值）。

密钥文件无需在启动时就存在：插件会监听最近一层已存在的父目录，当文件
（及其所在目录）出现后立刻开始应用其中的条目 —— 适合先装插件、后建
`secrets.env` 的场景。

MCP 服务器是长生命周期进程，环境变量在启动时确定，因此热更新后插件会
重连受影响的服务器（`mcpReconnect`）。默认 `true` 为精确模式：插件扫描
原始配置来源中的 `{env:...}` 引用，只重连引用了本次变化变量的启用服务
器 —— 无关服务器不受打扰；你手动禁用的服务器也不会被触碰。扫描链路
镜像宿主自身的配置链：项目级 `opencode.json(c)` / `.opencode/` 目录
（除非设置了 `OPENCODE_CONFIG_PROJECT_DISABLE`/`OPENCODE_DISABLE_PROJECT_CONFIG`）、
`OPENCODE_CONFIG` 指定的文件、全局配置目录（遵循 `OPENCODE_CONFIG_DIR`）
以及内联的 `OPENCODE_CONFIG_CONTENT`。注意：

- 重连瞬间该服务器上进行中的工具调用可能失败（让 agent 重试即可）；
- 有状态的 MCP 服务器（如浏览器自动化类）重连后状态丢失 —— 只要它们
  不引用变化的变量就不会被重连，还可用 `mcpReconnect: ["名字"]` 进一步
  收敛范围；
- 靠*继承*环境直接读取密钥、没有显式 `{env:...}` 引用的服务器无法被
  精确识别，它们会在下次自然连接时拿到新值；如需覆盖这类服务器，使用
  `mcpReconnect: "all"` 在每次变化时重启所有启用的服务器。
- 远程组织配置（从 `.well-known/opencode` 拉取）中的引用无法重新解析
  —— 原始文本不存在于本地。

另外，插件会注册一个永久 transform：每当 OpenCode 重建 MCP 配置时，把
原始配置来源中找到的所有 `{env:...}` 引用按当前环境重新替换 —— 包括
混在同一字符串里的 `{file:...}` 令牌（按宿主的解析方式重新解析）。除了
支撑热更新，这还修复了服务器**首次连接**可能拿到空替换值的竞态问题。

热更新是原地修改 `process.env`，因此同进程的消费方 —— 其他插件、
OpenCode 自身从环境发现的 provider key —— 在下次读取时自动看到新值。
但有两类对象热更新够不到：

- 在 `setup()` 里把变量快照进局部常量或 SDK 客户端的插件会一直拿旧值。
  插件 API 没有重跑其 `setup()` 的机制，排序规则（本插件放在 `plugin`
  数组最前）只能解决启动时序。
- MCP 配置以外位置的 `{env:...}` 引用（如 `provider.*.options.apiKey`）。
  宿主在加载配置时替换它们，但上面的永久 transform 只覆盖 MCP，因此
  这些位置要等宿主下次重载配置或重启服务时才刷新。

## 日志

OpenCode 后台服务的标准输出不可见，因此插件额外写入自己的日志文件：

```text
~/.local/share/opencode/log/opencode-secrets-env.log
```

（设置了 `XDG_DATA_HOME` 时为 `$XDG_DATA_HOME/opencode/log/...`。）

日志只包含计数和键**名**，永不记录密钥值。日志约 256 KB 时轮转，保留
上一份备份（`opencode-secrets-env.log.old`）。某个变量似乎没有生效时
先查这个日志；开启 `debug` 可看到键名级明细。

## 注意事项与安全性

- **顺序**：在 `plugin` 数组中把 `opencode-secrets-env` 放在其他插件
  之前。插件按顺序执行 `setup()`，只有后面的插件才能读到注入的变量。
- **重新加载**：`watch` 开启（默认）时，对 `secrets.env` 的编辑约 1 秒内
  自动生效；若关闭 `watch`，编辑后需重启 OpenCode（V2 执行
  `opencode service restart`）。
- **权限**：请保持文件权限为 `chmod 600`。文件可被其他用户读取时插件会
  发出警告（该检查仅限 POSIX 系统；Windows 上请改用 NTFS ACL 限制访问）。
- **不自动加载项目级文件**：只读取全局文件（或显式配置的 `path`），克隆
  下来的仓库无法借此向你的环境投毒。
- **本地 MCP 服务器会继承** OpenCode 进程的**完整环境**，包含注入的全部
  密钥 —— 这正是本插件的意义，但请只运行可信的 MCP 服务器。
- **OpenCode V1**：包同时提供 V1（`>= 1.14.34`）入口。V1 宿主没有 MCP
  transform API，因此 MCP 配置内的 `{env:...}` 重替换与 MCP 重连不可用；
  密钥注入、插件选项、热更新与关闭时的清理均正常。V2 是主要目标。

## 开发

本包以 TypeScript 源码形式发布（OpenCode 直接加载插件），没有构建步骤。
环境搭建、测试命令与家规见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

开发时引用本地检出目录即可加载本插件：

```jsonc
{
  "plugins": [
    { "package": "/path/to/opencode-secrets-env", "options": { "debug": true } }
  ]
}
```

发布历史见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

[MIT](./LICENSE)
