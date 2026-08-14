# nbcb-provider

OpenCode 插件，为 [OpenCode](https://opencode.ai) 注册自定义 LLM Provider，并提供自动 token 管理。

插件启动后会定时请求指定的 URL 获取 token 并缓存到内存中，每次向模型 API 发送请求时自动将 token 注入到 HTTP header 中。适用于需要动态 token 认证的 LLM 服务（如 OAuth、API Key 轮换、JWT 交换等场景）。

## 功能特性

- 自动注册自定义 LLM Provider 到 OpenCode
- 定时从指定 URL 获取 token，支持 GET/POST 请求
- 灵活的 token 提取路径（支持嵌套 JSON，如 `data.accessToken`）
- 自定义 header 注入格式（默认 `Authorization: Bearer <token>`）
- 仅对目标 provider 的请求注入 token，不影响其他 provider
- 兼容 OpenCode 的 `chat.headers` provider 类型 bug（`Provider` vs `ProviderContext`），可配置适配模式
- 完全通过环境变量配置，无需修改代码

## 工作原理

```
┌─────────────────────────────────────────────────────┐
│                   OpenCode 启动                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  插件加载 (Plugin Entry)                             │
│                                                     │
│  1. config hook → 注册自定义 provider               │
│     - npm 包: @ai-sdk/openai-compatible             │
│     - baseURL, models 等配置                        │
│                                                     │
│  2. TokenManager.start()                            │
│     - 立即获取一次 token                             │
│     - 启动定时刷新 (setInterval)                     │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     定时刷新      用户发起对话    token 请求失败
     refreshToken   │              自动重试下次周期
          │          │
          │          ▼
          │   ┌──────────────────────────────────┐
          │   │  chat.headers hook 被触发         │
          │   │                                    │
          │   │  getProviderId(provider) === "nbcb" │
          │   │       ↓ 匹配                       │
          │   │  output.headers["Authorization"]   │
          │   │    = "Bearer <current_token>"      │
          │   └──────────────────────────────────┘
          │          │
          ▼          ▼
   token 持久保存在内存中，每次请求都使用最新值
```

## 安装

### 方式一：本地插件（推荐开发时使用）

将项目克隆到本地，然后在你的 OpenCode 项目的 `.opencode/plugin/` 目录下放置插件文件：

```bash
# 在你的项目根目录下
mkdir -p .opencode/plugin
cp path/to/nbcb-provider/.opencode/plugin/nbcb-provider.ts .opencode/plugin/
```

OpenCode 会自动发现 `.opencode/plugin/` 目录下的 `.ts` 文件。

### 方式二：npm 包

```bash
# 在你的 opencode.json 中配置
{
  "plugin": ["nbcb-provider"]
}
```

## 配置

所有配置通过环境变量完成。按照功能分为三组：

### Token 管理

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `NBCB_TOKEN_URL` | 是 | — | 获取 token 的 URL 地址 |
| `NBCB_TOKEN_METHOD` | 否 | `POST` | HTTP 方法，支持 `GET` 或 `POST` |
| `NBCB_TOKEN_HEADERS` | 否 | `{}` | 请求 token 时附加的额外 header，JSON 字符串 |
| `NBCB_TOKEN_BODY` | 否 | — | POST 请求的 body，JSON 字符串 |
| `NBCB_TOKEN_PATH` | 否 | `token` | 从响应 JSON 中提取 token 的路径，支持点号分隔的嵌套路径 |
| `NBCB_TOKEN_REFRESH_SECS` | 否 | `3600` | token 自动刷新间隔，单位：秒 |

### Provider 注册

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `NBCB_PROVIDER_ID` | 否 | `nbcb` | Provider 标识符，用于在 OpenCode 中唯一标识 |
| `NBCB_PROVIDER_NAME` | 否 | `NBCB` | Provider 显示名称，在 UI 中展示 |
| `NBCB_PROVIDER_BASE_URL` | 是 | — | 模型 API 的 base URL |
| `NBCB_PROVIDER_NPM` | 否 | `@ai-sdk/openai-compatible` | Provider 使用的 AI SDK npm 包 |
| `NBCB_PROVIDER_MODELS` | 否 | `{"default":{"name":"Default Model"}}` | 可用模型列表，JSON 字符串 |

### Header 注入

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `NBCB_HEADER_NAME` | 否 | `Authorization` | 注入 token 的 header 名称 |
| `NBCB_HEADER_FORMAT` | 否 | `Bearer {token}` | header 值的格式模板，`{token}` 会被替换为实际 token |
| `NBCB_USER_AGENT` | 否 | — | 自定义 User-Agent，仅在目标 provider 的请求中生效，未设置时不修改原始值 |

### 兼容性

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `COMPAT_PROVIDER_ID_ACCESS` | 否 | `auto` | Provider ID 读取方式（见下方说明） |

`COMPAT_PROVIDER_ID_ACCESS` 用于适配 OpenCode 的一个已知 bug：`chat.headers` hook 的 `input.provider` 实际类型是 `Provider`（`id` 在顶层）而非文档声明的 `ProviderContext`（`id` 在 `info` 内）。可选值：

| 值 | 行为 | 适用场景 |
|----|------|---------|
| `auto` | 先尝试 `provider.info.id`，回退 `provider.id` | 通用，推荐保持默认 |
| `direct` | 直接读取 `provider.id` | 当前 OpenCode 版本（存在 bug） |
| `context` | 读取 `provider.info.id` | OpenCode 修复后的正确类型 |

待 OpenCode 官方修复后，可切换为 `context` 或移除此配置。

## 使用示例

### 示例一：简单 Bearer Token

服务端直接返回 token 字符串：

```bash
# 响应: "eyJhbGciOiJIUzI1NiJ9..."
export NBCB_TOKEN_URL="https://auth.example.com/token"
export NBCB_TOKEN_METHOD="GET"
export NBCB_TOKEN_PATH="token"          # 响应: { "token": "xxx" }
export NBCB_TOKEN_REFRESH_SECS="1800"

export NBCB_PROVIDER_BASE_URL="https://api.example.com/v1"
export NBCB_PROVIDER_MODELS='{
  "gpt-4": { "name": "GPT-4" },
  "gpt-3.5": { "name": "GPT-3.5 Turbo" }
}'
```

### 示例二：OAuth 风格（POST + 嵌套响应）

```bash
export NBCB_TOKEN_URL="https://auth.example.com/oauth/token"
export NBCB_TOKEN_METHOD="POST"
export NBCB_TOKEN_HEADERS='{"X-Client-Id":"my-app"}'
export NBCB_TOKEN_BODY='{"grant_type":"client_credentials","client_id":"xxx","client_secret":"yyy"}'
export NBCB_TOKEN_PATH="data.accessToken"   # 响应: { "data": { "accessToken": "xxx", "expiresIn": 3600 } }
export NBCB_TOKEN_REFRESH_SECS="3600"

export NBCB_PROVIDER_BASE_URL="https://api.example.com/v1"
export NBCB_PROVIDER_MODELS='{
  "claude-3": {
    "name": "Claude 3",
    "limit": { "context": 200000, "output": 4096 }
  }
}'
```

### 示例三：自定义 Header 注入

某些 API 不使用 `Authorization` header，而是使用自定义 header：

```bash
export NBCB_TOKEN_URL="https://auth.example.com/api-key"
export NBCB_TOKEN_PATH="key"
export NBCB_HEADER_NAME="X-API-Key"          # 替换默认的 Authorization
export NBCB_HEADER_FORMAT="{token}"           # 不加 Bearer 前缀，直接传 token

export NBCB_PROVIDER_BASE_URL="https://api.example.com/v1"
```

### 示例四：API Key 作为静态 Token

如果 token 不会过期，可以设置一个超长的刷新间隔：

```bash
export NBCB_TOKEN_URL="https://key-service.example.com/rotate"
export NBCB_TOKEN_METHOD="POST"
export NBCB_TOKEN_BODY='{"service":"llm-proxy"}'
export NBCB_TOKEN_PATH="apiKey"
export NBCB_TOKEN_REFRESH_SECS="86400"        # 24 小时刷新一次

export NBCB_PROVIDER_BASE_URL="https://llm-proxy.example.com/v1"
export NBCB_PROVIDER_MODELS='{
  "qwen-max": { "name": "Qwen Max" },
  "qwen-plus": { "name": "Qwen Plus" }
}'
```

## opencode.json 配置

配合插件使用时，你的 `opencode.json` 只需声明插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["nbcb-provider"]
}
```

Provider 的注册完全由插件通过 `config` hook 完成，不需要在 `opencode.json` 中重复配置 provider。如果你希望同时在 `opencode.json` 中手动定义 provider（例如覆盖模型列表），插件会尊重已有的同名 provider 配置。

## 错误处理

- **Token 获取失败**：打印错误日志，不中断插件运行，下一次定时刷新时自动重试
- **`NBCB_TOKEN_URL` 未设置**：跳过 token 刷新，插件正常加载但不会注入 header
- **`NBCB_PROVIDER_BASE_URL` 未设置**：跳过 provider 注册，打印警告
- **`NBCB_PROVIDER_MODELS` JSON 解析失败**：回退到默认模型 `{"default":{"name":"Default Model"}}`
- **并发刷新保护**：同一时间只允许一个 token 刷新请求，避免重复请求

## 项目结构

```
nbcb-provider/
├── src/
│   ├── index.ts               # 插件入口，注册 provider + 注入 token
│   └── token-manager.ts       # Token 管理器，负责获取/缓存/定时刷新
├── .opencode/plugin/
│   └── nbcb-provider.ts       # 转发到 src/index.ts（OpenCode 自动发现用）
├── package.json
└── tsconfig.json
```

### 文件说明

- **`src/index.ts`** — 插件主入口，导出 `NBCBProviderPlugin`。使用 `config` hook 注册 provider，使用 `chat.headers` hook 注入 token。
- **`src/token-manager.ts`** — `TokenManager` 类，处理 token 的获取、存储和定时刷新逻辑。从环境变量读取配置。
- **`.opencode/plugin/nbcb-provider.ts`** — 转发文件，将 `NBCBProviderPlugin` 从 `src/index.ts` 重新导出，供 OpenCode 自动发现。

## 开发

```bash
# 安装依赖
bun install

# 类型检查
bunx tsc --noEmit

# 构建
bun run build
```

## License

MIT
