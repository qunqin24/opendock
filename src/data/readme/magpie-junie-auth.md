# magpie-junie-auth

把 **JetBrains Junie 的免费模型**接入 magpie 的供应商插件（provider id：`junie`）。

免费档（`licenseType: GZL/NONE`）直连旧上游会被 `403 NO_LICENSE` 或 `400 UPDATE_REQUIRED` 拒绝。本插件实现了两条可用路径：

- **直连模式（默认，推荐）**：直接请求 Ingrazzio 的 `/v1/responses`，用逆向自 Junie CLI 的精确请求头 + `gpt-6-luna` 模型。**不需要在本机安装 Junie CLI**，单次约 2–4 秒。协议细节见 [DIRECT-PROTOCOL.md](./DIRECT-PROTOCOL.md)。
- **桥接模式（兜底）**：配 `bridgeUrl` 后把请求转给随附的 `bridge-server.mjs`，它调用本机 CLI headless 的 `junie-lite` 通道。需要装 CLI，单次约 30 秒；好处是上游协议变化时 CLI 会自动跟进。

只暴露一个模型 `junie-lite`（底层当前为 OpenAI GPT-6 Luna，JetBrains 可能更换）。

> ⚠️ **风险声明**：本插件通过逆向非公开协议使用 JetBrains 的商业服务，不受 JetBrains 支持，可能随时失效。自动化/脚本化使用可能违反 [JetBrains AI Service Terms](https://www.jetbrains.com/legal/docs/terms/jetbrains-ai-service/)。请仅用于你自己的账号，风险自负。

## 登录方式

给 `junie` 添加账号时可选（支持**多个账号同时接入**，由 magpie 管理轮换）：

1. **从本机 Junie CLI 导入登录态** —— 读取已登录 CLI 的 OAuth 凭据：macOS 从 Keychain（`security`，service `junie-cli`），Windows 从 `~/.junie/dpapi_credentials/*.dpapi`（DPAPI）。刷新令牌与过期时间会完整保存，便于自动续期。
2. **浏览器登录（JetBrains 账号）** —— 复刻 CLI 的 PKCE 授权码流程，本地回调端口 62345–62364。
3. **API key (`perm-*`)** —— 从 https://junie.jetbrains.com/cli 获取。
4. **Refresh token (`oW66…` / `fHx…` / `8Sl…`)** —— 直接粘贴 JetBrains OAuth refresh token，插件自动换取 access token 并完整保存 refresh/expires/email，无需浏览器或本机 CLI。

凭据存在 magpie 的 `plugin-auth.json`（权限 600）。`auth.refresh` 在到期前 90 秒自动续期；账号额度耗尽时 magpie 自动切到下一个。

## 多账号

插件无需自己实现轮换——magpie 原生支持：

```sh
magpie plugin login junie          # 每执行一次新增一个账号
magpie accounts junie              # 列出所有账号（● 启用，○ 待命）
magpie accounts switch junie <email>   # 切换默认
```

## 模型与请求

| 模式 | 上游路径 | 模型 | 是否要 CLI |
|---|---|---|---|
| 直连 | `POST /v1/responses` | `gpt-6-luna` | 否 |
| 桥接 | 本地 `POST /v1/chat/completions` → CLI headless | `junie-lite` | 是 |

对客户端统一暴露 OpenAI Chat Completions（流式 SSE 与非流式均支持）。插件内部把 chat completions 转成 Responses API，再把响应转回，完整支持 agent 所需能力：

- **工具调用双向**：`tools`/`tool_choice` 转发；assistant `tool_calls` ↔ Responses `function_call`，`role:"tool"` ↔ `function_call_output`；多工具并行、`finish_reason:"tool_calls"`。
- **真流式**：边读边转，不缓冲整段；流末尾带 usage。
- **多模态输入**：图片等 content parts 保留为 `input_image`。
- 兼容 SSE 的 LF/CRLF 混用、缺失事件（delta 丢失时用 done 补齐）、上游错误/拒绝与 `finish_reason:"length"`（`max_output_tokens` 截断）。

`temperature`/`top_p`/`stop_sequences` 会被该免费模型拒绝，故主动丢弃；`parallel_tool_calls` 与 `response_format` 会转发。`n>1` 降级为单候选（Responses 无多候选概念）。

**提示缓存**：免费档支持 prompt cache。请求带 `prompt_cache_retention:"24h"`（CLI 抓包原值）；稳定前缀 ≥ ~1024 token 才会写/命中（实测 2838 token 前缀：首请求 `cache_write_tokens:2835`，后续 `cached_tokens:2835`）。上游的 `cached_tokens`/`cache_write_tokens` 会透传到 chat usage 的 `prompt_tokens_details`，magpie 用量页能显示 cache read 与命中率。

额度显示走 `GET /auth/test`：`plan` = licenseType、`balance` = balanceLeft + unit。上游不提供窗口百分比，`windows` 留空（不编造 `used: 0`）。

## 安装

```sh
magpie plugin add magpie-junie-auth
# 开发时
magpie plugin add /path/to/magpie-junie-auth
```

直连模式无需额外配置。要用桥接兜底时在插件 options 里设：

```sh
magpie plugin options magpie-junie-auth '{"bridgeUrl":"http://127.0.0.1:4141/v1"}'
```

## 代理

部分地区的 IP 直连 Ingrazzio 会返回 403。确保 fetch 走代理：

- magpie 宿主（Bun）有原生代理选项，插件会读宿主/环境变量里的代理设置。
- Node 可用 `NODE_USE_ENV_PROXY=1` 读取 `HTTP_PROXY`/`HTTPS_PROXY`。
- 插件选项 `proxy` 可显式指定。

## 开发

```sh
npm test          # node --test，56 个测试
```

## 桥接服务（可选兜底）

```sh
node bridge-server.mjs            # 默认 127.0.0.1:4141
PORT=4142 JUNIE_MODEL=junie-lite node bridge-server.mjs
```

接口：`GET /health`、`GET /v1/models`、`POST /v1/chat/completions`（支持 `stream`）。
环境变量：`PORT`、`HOST`、`JUNIE_BIN`（默认 `~/.local/bin/junie` 或 Windows 对应路径）、`JUNIE_MODEL`、`JUNIE_TIMEOUT_MS`、`JUNIE_AUTO_UPDATE`。
桥接服务内置 CLI 版本检查（6 小时节流，自动执行 `junie update`），因为上游会提高免费模型的最低 CLI 版本要求。

## 许可证

MIT —— 插件自身代码。Junie 与 JetBrains 是 JetBrains s.r.o. 的商标。
