# opencode-model-proxy-router

[English](./README.md) | 简体中文

一个 [Opencode](https://opencode.ai) 插件，通过包装 `fetch` 将模型 API 请求路由到不同的代理，支持热重载。

## 功能特性

- 按精确模型 ID、前缀通配符或兜底默认规则路由请求
- 按路由选择代理，自动回退到直连
- 运行时学习 provider 基础 URL（`chat.params`），支持按 URL 路由
- 热重载：无需重启即可生效的配置更新
- 零运行时依赖

## 安装

### 通过 npm 安装（推荐）

```bash
npm install @jaquesyang/opencode-model-proxy-router
# 或
bun add @jaquesyang/opencode-model-proxy-router
pnpm add @jaquesyang/opencode-model-proxy-router
yarn add @jaquesyang/opencode-model-proxy-router
```

然后在 `opencode.json`（项目根目录或 `~/.config/opencode/opencode.json`）中添加插件：

```json
{
  "plugin": ["@jaquesyang/opencode-model-proxy-router"]
}
```

无需构建步骤 —— Opencode（Bun）可直接加载 `.ts` 文件。

### 本地插件（单文件）

将单个文件 `model-proxy-router.ts` 复制到插件目录即可：

- 项目级：`.opencode/plugins/`
- 全局：`~/.config/opencode/plugins/`

无需其他文件。

### 选项

通过元组形式覆盖配置文件路径（npm 与本地安装均适用）：

```json
{
  "plugin": [
    ["@jaquesyang/opencode-model-proxy-router", { "configPath": "/absolute/path.json" }]
  ]
}
```

## 配置

默认位置：`~/.config/opencode/model-proxy-router.json`

```json
{
  "proxies": {
    "http1": "http://user:pass@host:port",
    "http2": "http://user:pass@host:port"
  },
  "default": "direct",
  "routes": {
    "opencode-go/muse-spark-1.2-contributor": "http1",
    "opencode/muse-spark-1.2-contributor-free": "http2",
    "opencode-go/*": "http1"
  }
}
```

参见 `model-proxy-router.json.example`。

- **`proxies`** — 命名的代理条目。键为任意标签，值为代理 URL。本插件仅支持 HTTP 代理（`http://` / `https://`），不支持 SOCKS 代理（`socks4://` / `socks5://`）—— 路由到 socks URL 的请求会以 `UnsupportedProxyProtocol` 报错。
- **`default`** — 当没有路由匹配时使用的代理名称，或使用 `"direct"`（默认值）表示直连，不走代理。
- **`routes`** — 将路由键映射到代理名称或内联代理 URL：
  - `"provider/model"` — 精确匹配 `provider/model` 及其不带 provider 前缀的模型 ID `model`
  - `"prefix/*"` — 通配符匹配所有以 `prefix/` 开头的模型
  - 匹配优先级：精确匹配 → 通配符 → `default`

对于 URL 以已学习的 provider 基础 URL（例如 `https://opencode.ai/zen/...`）开头的请求，会优先按 provider 路由（`provider/*` → `provider/model` → 不带 provider 前缀的模型 ID）。

## 调试

```bash
MODEL_PROXY_ROUTER_DEBUG=1 opencode
```

打印每次路由请求的解析代理，以及运行时学习到的 provider 基础 URL。

## 测试

```bash
npm test
# 或
node --test test.mjs
```
