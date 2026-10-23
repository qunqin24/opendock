# OpenCode v2 · CLIProxyAPI provider

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/Mistakey/opencode2-cliproxyapi-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/Mistakey/opencode2-cliproxyapi-provider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode2-cliproxyapi-provider)](https://www.npmjs.com/package/opencode2-cliproxyapi-provider)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![已测试的 OpenCode 版本](https://img.shields.io/badge/tested_OpenCode-2.0.26-informational)](docs/verification.md)

在 OpenCode v2 中使用 [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)（CPA）提供的模型，支持模型发现、工具调用、对话摘要，以及 HTTP/SSE 和 WebSocket 连接。

这是一个独立插件，并非 OpenCode 或 CPA 官方产品。功能参考了 [CPA 官方 Pi 插件](https://github.com/router-for-me/pi-cliproxyapi-provider)，通过 OpenCode 原生 Responses 运行时和公开插件接口实现。

## 功能

- 通过连接向导设置 CPA，将 API key 保存到 OpenCode 的凭证存储中。
- 从 CPA 模型列表读取模型能力和可选的推理档位。
- 缓存模型列表，暂时保留从列表中消失的模型。
- 为支持的模型切换 Fast 模式，或暂停、恢复请求。
- 查看会话耗时、每秒输出 token 数（TPS），以及 token 和缓存用量。
- 本地和远程 OpenCode 服务端均可使用这些终端命令。

## 使用要求

- **OpenCode `>=2.0.26 <3`**。已在 Windows 上测试 **2.0.26**，其他版本尚未验证。不支持 OpenCode v1。
- 可用的 CPA 服务和 API key；服务需支持 `/v1/models` 和 `/v1/responses`。

## 安装

使用 OpenCode 的插件命令安装，并指定版本：

```sh
opencode --version
opencode plugin add opencode2-cliproxyapi-provider@0.1.1
opencode plugin list
```

这样会固定使用 `0.1.1`，直到你手动升级。无需执行 `npm install -g`，也无需下载本仓库源码。

也可以在现有 `opencode.json(c)` 的 `plugins` 数组中添加：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-cliproxyapi-provider@0.1.1"]
}
```

默认全局配置目录为 `~/.config/opencode`，Windows 下为 `%USERPROFILE%\.config\opencode`；项目配置也会生效。请保留其他设置，本插件只添加一次。如果此前从源码目录加载，请移除旧的路径配置。

服务端插件和终端界面（TUI）包含在同一个包中，**不需要再添加到 `cli.json`**。使用远程 OpenCode 服务端时，在服务端安装插件即可，终端会自动加载对应的界面。详见 [OpenCode 插件文档](https://opencode.ai/v2/docs/plugins)。

## 连接 CPA

1. 打开 OpenCode，运行 `/cpa-connect`。
2. 输入 CPA 地址；使用反向代理时，请包含完整子路径。
3. 输入 API key，输入内容不会明文显示。插件验证连接成功后，会将其保存到 OpenCode 的凭证存储中。
4. 在 OpenCode 中选择模型，用 `/cpa-status` 查看连接状态。

也可以使用 OpenCode 内置的 `/connect`，但它会先保存连接再验证。`/cpa-connect` 则先验证，连接失败时不会替换原有设置。不要将含有 API key 的配置文件提交到 Git。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `/cpa-connect` | 验证并保存 CPA 地址和 API key |
| `/cpa-status` | 查看连接、模型列表、Fast、选用的传输方式、压缩模式和待生效设置 |
| `/cpa-refresh` | 刷新模型列表并应用变更 |
| `/cpa-fast` | 开启或关闭 Fast 模式，重启后保留设置 |
| `/cpa-pause` | 暂停发送新的 CPA 请求；已发出的请求继续处理 |
| `/cpa-resume` | 恢复暂停中的请求 |
| `/cpa-stats` | 查看当前会话的耗时、TPS、token 和缓存用量 |

界面底部会显示连接状态和上一轮对话的统计。Fast 模式只会向明确支持该功能的模型发送 `priority` 参数，不改变推理档位，也不保证响应更快。

`/cpa-status` 会区分 OpenCode 服务端 RPC 断连与 CPA 验证失败。传输状态显示选用的方式及回退说明，不代表 WebSocket 请求已经成功；同时显示压缩模式，以及保存的设置是否仍需重新加载才能生效。

TPS 按整轮对话的耗时计算，包含工具调用和重试时间，不等同于模型生成文本时的速度。详见[统计说明](docs/reference.md#pause-and-statistics)。

### 连接或模型列表变更何时生效

部分设置保存后，需要重新加载当前工作目录才能用于后续请求，此时状态中会显示 `reloadRequired: true`。TUI 会在需要时自动重新加载，同时取消暂停中的请求并重置会话统计。通过 RPC 调用的客户端需要自行处理重新加载，详见[设置生效说明](docs/reference.md#applying-changes)。

## 配置

不使用 TUI 时，可以在服务端环境中设置 `CLIPROXYAPI_BASE_URL` 和 `CLIPROXYAPI_API_KEY`。插件配置优先于环境变量，环境变量优先于已保存的连接。为某个地址保存的 key 不会用于其他地址。完整规则和选项见[配置参考](docs/reference.md#configuration)。

修改插件选项时，编辑已有的插件配置项即可：

```jsonc
{
  "plugins": [{
    "package": "opencode2-cliproxyapi-provider@0.1.1",
    "options": {
      "transport": "auto",
      "compaction": "summary",
      "modelsDev": false
    }
  }]
}
```

- `transport: "auto"`：根据模型列表和运行时支持情况选择 HTTP 或 WebSocket。
- `compaction: "summary"`：使用 OpenCode 的对话摘要压缩上下文，这是默认方式。
- `modelsDev: false`：关闭价格查询。默认值为 `true`，会从 `https://models.dev/api.json` 获取公开价格，用于估算费用，不代表 CPA 的实际账单。

配置连接后，插件启动时会读取 CPA 模型列表，或先使用缓存再后台刷新。后续刷新失败时可能自动重试。通过 OpenCode 发起模型请求可能产生上游费用；本插件不提供 CPA 服务或账户。

## 升级与卸载

发布新版本不会升级已有的固定版本安装。升级前先备份配置。执行 `opencode plugin add opencode2-cliproxyapi-provider@<版本号>`，指定要安装的已发布版本，再用 `opencode plugin list` 检查是否有重复或旧的配置项。`opencode plugin update` 会跳过已固定版本的插件。如果变更尚未生效，重启 OpenCode。

卸载命令：

```sh
opencode plugin remove opencode2-cliproxyapi-provider@0.1.1
```

如果曾手动添加项目配置，也请移除对应的插件项。凭证、会话和插件数据由 OpenCode 单独管理，卸载插件不保证同时删除这些数据。

## 常见问题

| 问题 | 处理方法 |
| --- | --- |
| 找不到 CPA 命令 | 检查服务端的插件列表和版本，无需在 `cli.json` 中单独配置 TUI。 |
| key 已保存，但连接仍然离线 | 用 `/cpa-status` 查看状态，或运行 `/cpa-connect` 重新验证地址和 key。 |
| 首次启动时 CPA 不可用 | CPA 恢复后运行 `/cpa-refresh`。没有缓存时，首次模型列表请求失败不会自动重试。 |
| 设置已保存但未生效，或关闭 Fast 后请求被拒绝 | 重新加载当前工作目录；这会取消暂停中的请求并重置统计。 |
| 使用了 HTTP 而不是 WebSocket | 查看 `transportNote`，OpenCode 可能已回退到 HTTP。 |
| native 压缩不可用 | 保留默认的 `summary`。native 是可选功能，尚未在真实 CPA 上测试。 |
| `opencode models` 没有列出模型 | 2.0.26 中，该命令使用单独的 location。请在会话中选择模型，或调用 `model.list` 时指定会话所在的 location。 |

反馈问题时，请附上 OpenCode 和插件版本、操作系统及复现步骤。分享状态信息或日志前，请移除 key、私人服务地址和对话内容。安全问题见[报告说明](SECURITY.md)。

## 测试情况

真实 CPA 测试使用 OpenCode `2.0.26` 和 `gpt-6.1-sol`，对应提交 `11eb30e`。后来的暂停计时修正（`16afc4b`）仅做了离线测试。其他模型尚未在真实 CPA 上验证。

自动化测试使用模拟 CPA 服务，覆盖更多协议和故障恢复场景。CI 还会安装打包后的插件，使用 OpenCode `2.0.26` 和测试凭证进行检查。native 压缩目前只通过模拟服务测试；TUI 有模块测试，但尚未在实际终端中完整手动测试。详细范围见[测试覆盖表](docs/verification.md)。

## 隔离开发与测试

请使用单独的测试环境，不要使用平时的 OpenCode 配置或真实 CPA 凭证。将 `OPENCODE_CLI` 设为 OpenCode `2.0.26` 可执行文件的路径；`OC2CPA_SANDBOX` 可指定测试配置和数据的存放目录。冒烟测试只连接本机的模拟服务。

```sh
npm ci --cache .forge/local/npm-cache --no-audit --no-fund
bun test
bun run typecheck
bun run smoke:package
```

[开发说明](docs/development.md) · [技术参考](docs/reference.md) · [发布流程](docs/releasing.md) · [变更记录](CHANGELOG.md) · [MIT 许可](LICENSE)
