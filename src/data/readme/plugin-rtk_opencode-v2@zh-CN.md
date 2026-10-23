# plugin-rtk_opencode-v2

[![npm version](https://img.shields.io/npm/v/plugin-rtk_opencode-v2.svg)](https://www.npmjs.com/package/plugin-rtk_opencode-v2)
[![CI](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

[Português (Brasil)](README.md) | [English](README.en.md) | [Italiano](README.it.md) | **简体中文**

一个 [OpenCode V2](https://opencode.ai) 插件，在执行前将 shell 命令重写为
[RTK（Rust Token Killer）](https://github.com/rtk-ai/rtk) 的等价命令，从而减少智能体读取的
token 数量。

```text
git status          ->  rtk git status
ls -la | head -5    ->  rtk ls -la | head -5
cat package.json    ->  rtk read package.json
echo hi             ->  echo hi
```

重写采用尽力而为、静默回退的方式：如果 RTK 缺失、响应缓慢或执行失败，原始命令将保持不变。

## 为什么使用

Shell 工具会产生大量输出。`git status`、`grep`、`tsc` 和测试套件可能会向智能体上下文写入数千行，
每一行都会消耗 token。RTK 是一个 CLI 代理，会在模型读取之前过滤和总结这些输出，同时保留有用信息。

插件不会重新实现这些功能：它只在执行前替换命令，然后让 RTK 完成工作。

```text
git status                    ->  rtk git status
rg "TODO" src                 ->  rtk rg "TODO" src
tsc --noEmit                  ->  rtk tsc --noEmit
```

调用 `npm`、`pnpm`、`yarn` 或 `bun` 的命令会保持不变，包括 `pnpm lint`
这样的脚本，因为脚本内容由项目定义。参见[工作原理](#工作原理)。

节省量取决于项目和命令。RTK 会在本地保存节省历史；可以用以下命令查看：

```bash
rtk gain
```

插件不收集遥测数据，也不会向任何地方发送数据。

## 环境要求

- 已安装并正常运行的 OpenCode V2 `>= 2.1.1`
- Node.js `>= 22.13`
- [RTK](https://github.com/rtk-ai/rtk) `>= 0.27`，并位于 `PATH` 中（或设置
  `rtkPath`）

使用以下任一官方方式安装 RTK：

```bash
brew install rtk
```

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

```powershell
winget install rtk-ai.rtk
```

验证安装：

```bash
rtk --version
```

## 安装

该插件是一个已发布并由 OpenCode V2 加载的 npm 包。当前版本是 `0.1.1`：

```bash
npm view plugin-rtk_opencode-v2 version
# 0.1.1
```

你**不需要**运行 `npm install` 或 `pnpm add`：OpenCode 会在启动时安装配置中声明的包，
并缓存到：

```text
~/.cache/opencode/npm/<包名>@latest/<build>/node_modules/
```

> `0.0.0-stage` 是首次发布时创建的占位版本；`latest` 指向 `0.1.1`，OpenCode 安装的就是该版本。

### 方式 1 — CLI（推荐）

```bash
opencode plugin add plugin-rtk_opencode-v2
```

该命令会安装包并将条目添加到全局 `opencode.jsonc`。用以下命令确认：

```bash
opencode plugin list
```

### 方式 2 — 编辑配置

OpenCode V2 接受的配置文件：

| 范围 | 路径                                                     |
| ---- | -------------------------------------------------------- |
| 全局 | `~/.config/opencode/opencode.jsonc`（或 `.json`）         |
| 项目 | `./opencode.jsonc` 或 `./.opencode/opencode.jsonc`       |

将 `plugins` 添加到现有文件中；不要替换配置的其余部分。新建文件的示例：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["plugin-rtk_opencode-v2"]
}
```

需要选项时，请使用对象形式：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "plugin-rtk_opencode-v2",
      "options": {
        "rtkPath": "/home/me/.local/bin/rtk",
        "timeoutMs": 750
      }
    }
  ]
}
```

> 字符串形式（`"plugin-rtk_opencode-v2"`）不接受选项。需要配置任何内容时，请使用对象形式。

### 首次加载

首次运行时，OpenCode 会下载该包，因此需要网络访问。之后包会被缓存，后续启动会很快。

`opencode plugin add` 会安装包，但**不会在已经打开的会话中启用插件**。插件在服务/会话启动时加载。
如果你刚刚安装，请重启服务或打开新会话：

```bash
opencode service restart
```

OpenCode V2 也会自动重新加载被监视的配置，并在后台安装缺失的包，但插件 hook 只会在下一次加载时生效。

### 验证是否生效

1. 确认插件已被列出：

   ```bash
   opencode plugin list
   ```

2. 确认 RTK 在与 OpenCode 相同的环境中可以重写命令：

   ```bash
   rtk rewrite "git status"
   # rtk git status
   ```

3. 在插件选项中启用诊断模式：

   ```jsonc
   {
     "plugins": [
       {
         "package": "plugin-rtk_opencode-v2",
         "options": { "debug": true }
       }
     ]
   }
   ```

   启用 `debug` 后，`rtk probe succeeded`、`rtk rewrite timed out` 和
   `rtk rewrite produced stderr diagnostics` 等消息会出现在 OpenCode 的 stderr 中。
   绝不会记录命令内容。

4. 通过智能体运行一个命令，例如 `git status`，然后检查 RTK 历史是否记录了这次执行：

   ```bash
   rtk gain
   ```

### 更新和移除

```bash
opencode plugin check
opencode plugin update plugin-rtk_opencode-v2
opencode plugin remove plugin-rtk_opencode-v2
```

`plugin check` 检查新版本；`plugin update` 更新所有过时的插件（或仅更新指定的插件）。
要移除插件，也可以从配置文件中删除 `plugins` 条目。

### 本地或 Git 安装

要测试源代码版本：

```bash
pnpm install
pnpm build
```

然后将配置指向包的绝对目录：

```jsonc
{
  "plugins": ["/home/me/dev/plugin-rtk_opencode-v2"]
}
```

也可以直接从 GitHub 安装：

```bash
opencode plugin add github:brennoclins/plugin-rtk_opencode-v2
```

`prepare` 脚本会在这种安装方式下自动构建项目。

离线使用时，生成 tarball，解压后将 `plugins` 指向解压后的目录（其中包含
`package.json` 和 `dist/`）：

```bash
pnpm pack
tar -xzf plugin-rtk_opencode-v2-0.1.1.tgz
```

## 工作原理

默认情况下，插件注册 `ctx.tool.hook("execute.before")`，并重写通过 `bash` 和 `shell`
工具发出的命令。它会调用：

```text
rtk rewrite <command>
```

通过 `execFile` 调用，不经过 shell，因此命令会作为单个参数传递，无法向插件进程注入 shell 语法。
插件也不会执行重写后的命令：它只更改 OpenCode 将要执行的命令。

当 `rtk rewrite` 输出非空 stdout 时，视为重写成功。RTK 目前在成功时返回退出码 `3`，没有等价命令时返回
`1`，因此插件有意忽略退出码，改为检查 stdout。已经调用 `rtk` 的命令（包括绝对路径、
`command`、`env` 或 `nohup`）会保持不变。

RTK 的可用性通过 `rtk --version` 探测，并缓存 `probeTtlMs` 时间。每次重写都受 `timeoutMs`
限制。`ENOENT`、超时和空输出都会静默回退到原始命令。stderr 仅视为诊断信息：只要 stdout
包含重写结果，仍会使用该结果。

涉及权限提升的命令（`sudo`、`doas`、`pkexec`、`runas`、`gsudo`、`su`）永远不会被重写，
包括管道和嵌套 shell 中的情况，例如 `bash -c 'sudo ...'`。插件应始终以运行 OpenCode
的普通用户权限工作。

调用 `npm`、`pnpm`、`yarn` 或 `bun` 的命令也永远不会被重写，包括
`cd app && pnpm lint` 这样的复合命令。这也适用于 package manager 脚本：
脚本内容由项目定义，RTK 可能把 `pnpm lint` 映射为 `rtk lint`，而后者会执行 ESLint。在使用 Biome、oxlint 或其他
linter 的项目中，这会改变命令含义并可能导致执行失败。如果想获得 RTK 的节省效果，
请直接调用工具（`tsc --noEmit`、`eslint src`），不要经过 package manager 脚本。

### 可选的 shell hook

设置 `useShellHook: true` 还会注册 `ctx.shell.hook("create.before")`。这会覆盖 OpenCode
创建的所有 shell 命令，包括来自其他工具、插件和子代理的命令。默认关闭，因为它可能会重写不应更改的内部命令。

当两个 hook 都启用时，同一个命令可能会经过两次。第二次处理开销很小，因为以 `rtk` 开头的命令会被跳过，而且
`rtk rewrite` 是幂等的。

## 配置选项

| 选项               | 默认值  | 说明                                                         |
| ------------------ | ------- | ------------------------------------------------------------ |
| `enabled`          | `true`  | 启用或禁用插件。                                             |
| `rtkPath`          | `"rtk"` | RTK 二进制文件的名称或绝对路径。                             |
| `timeoutMs`        | `500`   | 每次 `rtk rewrite` 调用的超时时间。                          |
| `probeTtlMs`       | `60000` | RTK 可用性探测结果的缓存时间。`0` 表示禁用缓存。             |
| `useShellHook`     | `false` | 同时通过 `ctx.shell.hook("create.before")` 重写。            |
| `debug`            | `false` | 将诊断信息写入 stderr。绝不会记录命令内容。                  |
| `maxCommandLength` | `8000`  | 超过此长度的命令不会被重写。                                 |

选项只能通过上面的对象形式设置；字符串形式只使用默认值。无效的选项值会回退到默认值，
而不会导致插件启动失败。

示例：自定义二进制路径并启用 shell hook：

```jsonc
{
  "plugins": [
    {
      "package": "plugin-rtk_opencode-v2",
      "options": {
        "rtkPath": "/home/me/.local/bin/rtk",
        "timeoutMs": 750,
        "useShellHook": true,
        "debug": true
      }
    }
  ]
}
```

## 故障排查

**插件没有出现在 `opencode plugin list` 中。** 确认键名是 `plugins`（复数，V2 语法），
文件位于可接受的路径之一，并且已重启 OpenCode。再次运行 `opencode plugin add` 以检查安装。
如需查看下载内容，缓存位于
`~/.cache/opencode/npm/plugin-rtk_opencode-v2@latest/<build>/node_modules/`。

**安装后命令没有变化。** `plugin add` 不会把插件应用到已经打开的会话。请用
`opencode service restart` 重启服务，或打开新会话后重试。OpenCode 日志应在启动时显示
`loading plugin id=plugin-rtk_opencode-v2`。

**安装时出现 404 或 "package not found"。** 用 `npm view plugin-rtk_opencode-v2 version`
确认包名准确和已发布版本（应为 `0.1.1`），并检查 npm registry 是否可访问。如果问题仍然存在，
请使用上面描述的本地或 Git 安装方式。

**命令没有被重写。** 确认在 OpenCode 运行的同一环境中，`rtk rewrite "git status"`
会输出重写后的命令。检查命令是否已带有 `rtk` 前缀、是否超过 `maxCommandLength`，以及 `enabled`
是否为 `false`。启用 `debug: true` 查看插件诊断信息。

**`pnpm lint`、`npm run lint` 等脚本没有被重写。** 这是有意为之。插件不会修改
package manager 脚本调用，因为脚本内容由项目定义，而 RTK 可能在项目使用其他 linter 时
假定为 ESLint。请直接运行脚本，或直接调用相应工具。

**找不到 RTK。** 将 `rtkPath` 设置为绝对路径。如果 OpenCode 进程的 `PATH`
不同，可能无法按名称找到该二进制文件。

**在较慢的机器上超时。** 增大 `timeoutMs`。超时始终是安全的：原始命令会保持不变并继续执行。

**shell hook 重写过多。** 保持 `useShellHook` 关闭（默认值），这样只会更改智能体发出的
`bash`/`shell` 命令。

**Windows。** `execFile` 是跨平台的，但 Windows 支持属于尽力而为，尚未纳入 CI 矩阵。

## 开发

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm pack
```

测试套件使用 `test/fixtures/fake-rtk.mjs` 中的假 RTK 二进制文件；运行测试不需要真实的 `rtk`。
`prepare` 脚本会为基于 Git 的安装执行构建。

发布由 GitHub Actions 中的 `release.yml` 工作流在每次推送到 `main` 时自动完成：
它会递增版本、带 provenance 发布到 npm，并创建 GitHub Release。`0.1.1` 及后续版本见
<https://github.com/brennoclins/plugin-rtk_opencode-v2/releases>。当前流程使用 npm
granular token；计划于 2026-11-01 迁移到 Trusted Publishing（OIDC）。参见
[CONTRIBUTING.md](https://github.com/brennoclins/plugin-rtk_opencode-v2/blob/main/CONTRIBUTING.md)。

## 兼容性

- OpenCode V2 `2.1.1` 及更高版本（`@opencode/plugin@^2.1.1`），已针对 `2.1.2` 测试
- RTK `0.27` 及更高版本，已针对 `0.49.0` 测试
- Node.js `22` 和 `24`

不支持 OpenCode V1。V1 请使用原始
[`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk) 插件。

## 致谢

- **Aris Ripandi** — MIT 许可的原始
  [`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk)
  插件的作者，其思路和行为启发了这个 V2 实现。
- **RTK 贡献者** — [RTK（Rust Token Killer）](https://github.com/rtk-ai/rtk)
  作为外部二进制文件使用，未与本插件捆绑。
- **plugin-rtk_opencode-v2 贡献者** — 参见 [AUTHORS.md](AUTHORS.md)。

第三方许可证文本位于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

Copyright (C) 2026 Brenno C. Lins.

根据 GNU General Public License 第 3 版或更高版本（`GPL-3.0-or-later`）授权。参见
[LICENSE](LICENSE)。
