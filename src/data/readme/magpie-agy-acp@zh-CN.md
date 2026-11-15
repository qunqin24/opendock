# agy-acp

[English](./README.md) | 简体中文

面向 [Magpie](https://usemagpie.ai) 与 [OpenCode](https://opencode.ai) 的多账号 **Antigravity CLI（`agy acp`）** 模型插件。

通过官方 `agy acp`（Agent Client Protocol）驱动本机 `agy` CLI，在 **`agy-acp`** Provider 下提供 `agy` 开放的 Gemini、Claude 与 GPT-OSS 系列模型；客户端工具通过本地回环 HTTP MCP 原样交由调用方执行。

## 如何选择 Antigravity 插件

Magpie 社区共有三款 Google Antigravity 渠道插件。对于同一个 Google 账号，**三者共享完全相同的 Google Antigravity 订阅配额池**（5 小时窗口与周限额）：

| 对比维度 | `magpie-agy-acp`（`agy-acp`，本插件） | `opencode-agy-cli-auth`（`agy-cli`） | `opencode-antigravity-auth`（`antigravity`） |
| :--- | :--- | :--- | :--- |
| **调用方式 / 后端** | 调用本机已安装的官方 `agy` CLI（`agy acp --worker`），零额外下载 | 调用本机已安装的官方 `agy` CLI（`agy acp`），零额外下载 | 直接请求 Google 内部 HTTP 接口（无需安装 CLI） |
| **登录与凭据存储** | 独立隔离的 `0600` 目录（不改写系统钥匙串）：支持浏览器 OAuth、远程回调 URL 粘贴、Switcher / CLIProxyAPI JSON 批量导入，或一键接管本机现有 `agy` 登录 | 依赖在终端手动执行 `agy` 登录，凭据存于系统钥匙串 | 在 Magpie 内直接管理多账号 OAuth 令牌 |
| **多账号与配额轮换** | 多账号池 + 配额感知（识别 5h/周限额窗口与 Google AI Pro/Ultra 等级标识）；自动切号**默认关闭**（`account_failover`） | 仅限单账号（`single: true`） | 支持多账号 |
| **无头 / 远程服务器支持** | 原生支持粘贴回调链接与 JSON/`refresh_token` 批量导入 | 需手动完成本机 CLI 登录与钥匙串配置 | 支持内置 OAuth 流程 |
| **客户端工具桥接** | 原生本地回环 HTTP MCP（`127.0.0.1`），不污染环境变量 | 在 `PATH` 前端注入伪造的 `nc` 脚本转发 stdio（`--ide-mcp-port`） | HTTP 请求体直接转换 |
| **图片与长会话容错** | 自动压缩超限内联图片（`>2000px` / `>5 MiB`），并在遇到 `lostMedia` 时自动剥离过期历史图片以保留上下文 | 沿用 `agy` 默认处理 | HTTP 接口直传 |

## 环境要求

- **`agy` CLI** `>= 1.5.0`（已加入 `PATH`，或通过 `AGY_PATH` 指定路径）
- **Magpie** `>= 0.1.3900`

## 账号与服务条款

本插件驱动你自己安装的 `agy` CLI，使用你登录的 Google 账号。Google Antigravity 附加服务条款第 6 条规定：不得在"与本服务无关的第三方产品"中使用本服务，使用第三方软件、工具或服务访问本服务属于违约，"可能导致你的 Antigravity 和/或 Gemini CLI 账号被暂停或终止"。官方 FAQ 进一步说明：把 `agy` 包进第三方编码 Agent、或自动化账号轮换，在个人版套餐下都不被支持。

**对本插件意味着什么。** 它把 `agy` 包给 Magpie 与 OpenCode 使用，并把账号组织成池——条款点名的是"把 `agy` 包进第三方 coding agent"与"自动轮换账号"，后者已默认关闭（见 `account_failover`）；同时它自己完成浏览器登录（复用 `agy` 自身登录所用的官方 installed-app 客户端身份），把令牌写进该账号的隔离目录。它不伪造客户端身份、不做 TLS 拦截、不调用账号无法选择的模型。

账号被封时 `agy` 会返回"violation of Terms of Service"整句，本插件以 `403` 上报。恢复账号是 Google 的决定，需通过该提示给出的申诉表单，官方措辞写明再次违规将永久停用。需要合规路径请改用 Vertex AI 或 AI Studio 的 API key。

`cloak_prompts` 默认开启，与同厂商的独立桥接一致：上游无论剩余配额多少，都会把这些标识第三方客户端的系统提示词行按配额耗尽拒答，带着它们发出去的请求本就没有机会。这仍是绕过上游检查，条款视之为规避手段；关闭即按原文发送。

**账号风险自负。** 维护者无法恢复被封账号。

## 安装与登录

```sh
magpie plugin add github:sidkang/agy-acp
# 发布至 npm 后也可使用：
# magpie plugin add magpie-agy-acp

magpie plugin login agy-acp
```

> npm 包名为 `magpie-agy-acp`，Magpie / OpenCode 中的 Provider ID 仍为 **`agy-acp`**。

模型调用格式为 `agy-acp/<模型>`（如 `agy-acp/gemini-3.8-flash`、`agy-acp/gemini-4-hydrogen`、`agy-acp/claude-sonnet-5-5`、`agy-acp/claude-opus-5-5`）。

### 登录与导入方式（支持多账号并发池）

执行 `magpie plugin login agy-acp` 或在 **Magpie › Providers › Antigravity (multi-account local agy CLI)** 中添加账号：

1. **`Sign in with Google (browser)`（默认，浏览器自动回调）**：浏览器完成授权后自动本地回调完成登录；若 Magpie 跑在远程服务器或 Docker 中，可直接把浏览器落地的完整 `Callback URL` 粘贴到回调框完成登录。凭据以 `0600` 独立写入 `$XDG_DATA_HOME/agy-acp/accounts/<uuid>`，不触碰系统 Keychain。
2. **文件批量导入 / 粘贴 JSON 或 `refresh_token`**：点击登录面板中的 **Import from a file instead…** 选择 JSON 文件批量导入（支持 Antigravity Switcher、CLIProxyAPI、`antigravity-oauth-token`、单账号或 `accounts` 数组 JSON，以及每行一个 `refresh_token` 的文本），或在 **Other ways to sign in…** 中直接粘贴。
3. **`Adopt existing local agy login (host default)`（一键复用本机登录）**：直接复用终端 `agy` 已登录账号。
4. **`Sign in via agy terminal code (agy acp --login)`**：备用终端授权码登录。

查看各账号 5 小时 / 7 天额度窗口：

```sh
magpie quota agy-acp
```

## 配置项

### Provider 开关（Magpie › Providers › Antigravity (multi-account local agy CLI)）

| 开关 | 默认值 | 说明 |
|---|---|---|
| `quota_routing` | `true` | 将 5 小时 / 周配额暴露给 Magpie 路由，额度在各账号上可见 |
| `account_failover` | `false` | 失败后自动切换账号。默认关闭：配额、登录、额度或策略导致的失败会原样返回（`409`，Magpie 不会换号），由你选择下一个账号。开启后 Magpie 可能用另一个已登录账号重答同一请求，而条款把自动轮换账号视为不受支持。厂商整体 `5xx` 无论如何都会被重试 |
| `cloak_prompts` | `true` | 改写会被上游按配额耗尽拒答的第三方客户端标识句。默认开启，与同厂商的独立桥接一致：这些句子无论剩余配额多少都会被拒。这仍是绕过上游检查，条款可能视为不受支持；关闭即按原文发送 |
| `minimal_agent` | `false` | 为隔离桥接 Agent 开启 `excludeDefaultComponents`，精简内置系统提示词开销 |
| `expose_thinking` | `true` | 将 ACP 思考摘要作为 Anthropic `thinking` 块返回 |

### 插件参数（`plugins.json` / Magpie › Plugins › Installed › Options）

```json
{
  "maxGlobalWorkers": 36,
  "maxPerAccountWorkers": 18,
  "idleTimeoutMs": 3600000,
  "awaitingToolTimeoutMs": 600000,
  "waitTimeoutMs": 60000,
  "maxWaiters": 128,
  "maxWorkerRssBytes": 1073741824
}
```

满载时排队而非立即失败：`waitTimeoutMs` 控制等待槽位的最长时间（`0` 恢复立即 `503`），`maxWaiters` 限制等待队列长度；干净结束且进程树 RSS 超过 `maxWorkerRssBytes` 的 Worker 会先停靠再换新进程（`0` 关闭该策略，`AGY_BRIDGE_MAX_WORKER_RSS_MB` 以 MiB 覆盖）。

可通过环境变量 `AGY_PATH` 指定 `agy` 可执行文件路径，`AGY_ACP_DATA_DIR` 指定隔离账号存储根目录。与 Magpie 官方 Claude 桥接的设计对齐说明见 [docs/claude-bridge-parity.md](./docs/claude-bridge-parity.md)。

## 开发与测试

```sh
bun install
bun x tsc --noEmit
HOME=$(mktemp -d) bun test
```

## 致谢与协议

Fork 自 [`@magpie-community/opencode-agy-cli-auth`](https://github.com/magpie-community/plugins/tree/main/packages/agy-cli)（`DylanLIiii`、`gitxm`、`yce`）并以严格模式 TypeScript 重写。详见 [NOTICE.md](./NOTICE.md) 与 [LICENSE](./LICENSE)（MIT）。
