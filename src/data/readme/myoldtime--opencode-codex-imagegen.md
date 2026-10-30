# opencode-codex-imagegen

[![CI](https://github.com/MyOldTime/opencode-codex-imagegen/actions/workflows/ci.yml/badge.svg)](https://github.com/MyOldTime/opencode-codex-imagegen/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@myoldtime/opencode-codex-imagegen)](https://www.npmjs.com/package/@myoldtime/opencode-codex-imagegen)
[![Release](https://img.shields.io/github/v/release/MyOldTime/opencode-codex-imagegen)](https://github.com/MyOldTime/opencode-codex-imagegen/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

OpenCode V2 插件，注册 `proxy_imagegen` 工具：通过 **Responses API 的托管 `image_generation` 工具** 生成/编辑图片（不使用 Images API）。

两种凭据来源，优先级固定：

1. **显式配置**：同时提供 `options.base_url` 与 `options.key` 时，只走你自己的代理，**完全不读取宿主的任何凭据**。只提供 `key` 时默认使用 `https://api.openai.com/v1`。
2. **宿主托管**：两者都不配置时，每次调用通过 `ctx.integration.connection.active('openai')` + `resolve(connection)` 取得 OpenCode 已登录的 OpenAI 凭据，由 OpenCode 负责刷新，插件不读取、不写入任何凭据文件。

> 仓库内置测试默认全部离线（注入 fake fetch / fake integration），不会消耗生图额度。真实账号验证与自动化协议测试分开记录，详见 [验证记录](VALIDATION.md)。新版 **Sign in with ChatGPT** 在实测中被上游以 `subscription_sharing_unsupported_capability` 拒绝生图；能识别该登录方式不等于它可用，请使用显式 API 或可用的 legacy 登录。

## 名称对照

| 项 | 值 |
|---|---|
| 项目 / GitHub 仓库 | `opencode-codex-imagegen`（[`MyOldTime/opencode-codex-imagegen`](https://github.com/MyOldTime/opencode-codex-imagegen)） |
| npm 包名（npmjs 与 GitHub Packages 使用同一个 scoped name） | `@myoldtime/opencode-codex-imagegen` |
| 插件 ID | `opencode-codex-imagegen` |
| 工具名 | `proxy_imagegen` |
| 版本 / 许可证 | `0.1.0` / MIT |

## 安装

以下在线方式需对应的版本或标签已经发布：本包为 `0.1.0`，tag 为 `v0.1.0`。

### 方式一：从 npmjs.org 安装（推荐）

npmjs.org 上的公开包安装不需要登录 npm，也不需要提供 token。

```powershell
opencode plugin add "@myoldtime/opencode-codex-imagegen@0.1.0"
opencode plugin list
```

固定版本便于复现，`opencode plugin list` 用于确认已登记。

`opencode plugin add` 默认写入全局 OpenCode 配置。若只想在某个项目使用，改用该项目的 `opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@myoldtime/opencode-codex-imagegen@0.1.0"]
}
```

安装或修改配置后，可在 OpenCode TUI 输入 `/reload` 重新加载；这是界面内的斜杠命令，不是操作系统 shell 命令。

### 方式二：从 GitHub 标签安装

```powershell
opencode plugin add "github:MyOldTime/opencode-codex-imagegen#v0.1.0"
opencode plugin list
```

公共仓库通过该方式安装不需要 GitHub Packages token，也不经过 npm registry。仅对某个项目生效时，项目 `opencode.json` 的 `plugins` 条目可写成同一来源 `github:MyOldTime/opencode-codex-imagegen#v0.1.0`。`#v0.1.0` 指向该标签当前对应的提交，标签由仓库维护者控制，需要时请自行核对。

### 方式三：从 GitHub Packages 安装

GitHub Packages 与本包在 npmjs.org 的同名包属于两个独立 registry，同一版本需要分别发布。按 GitHub 的规则，即使包是公有的，安装也需要具有 `read:packages` 权限的 personal access token (classic)。

```sh
npm config set @myoldtime:registry https://npm.pkg.github.com --location=user
npm login --scope=@myoldtime --auth-type=legacy --registry=https://npm.pkg.github.com
# Username 输入 GitHub 用户名，Password 输入 token
opencode plugin add "@myoldtime/opencode-codex-imagegen@0.1.0"
opencode plugin list
```

token 只在 `npm login` 的交互提示中输入，由 npm 自己保存；不要写进 `opencode.json`，也不要提交到仓库。若之后改回 npmjs.org 渠道，把该 scope 指回官方 registry：

```sh
npm config set @myoldtime:registry https://registry.npmjs.org --location=user
```

### 本地开发安装

```sh
git clone https://github.com/MyOldTime/opencode-codex-imagegen.git
cd opencode-codex-imagegen
npm ci --ignore-scripts
```

在 OpenCode 配置中把 `package` 指向这个目录的**绝对路径**，例如 Unix 风格 `/path/to/opencode-codex-imagegen`，Windows 的 JSON 中可写成 `C:/path/to/opencode-codex-imagegen`。必须指向目录，不能指向单个文件；插件本身无需编译。

## 配置

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@myoldtime/opencode-codex-imagegen@0.1.0",
      "options": {
        "model": "gpt-6.1-sol",
        "reasoning_effort": "medium",
        "fast_mode": false,
        "timeout_ms": 240000
      }
    }
  ]
}
```

> 示例中的 `package` 固定为 `@0.1.0` 以便复现。若插件来自 npm 以外的来源，把这里的 `package` 换成对应值：GitHub 标签为 `github:MyOldTime/opencode-codex-imagegen#v0.1.0`，本地开发为仓库目录的绝对路径。请在原条目上配置 `options`，不要为同一个插件重复添加条目；合并配置时只增改本插件的字段，不要覆盖其它设置。

| 选项 | 默认 | 说明 |
|---|---|---|
| `base_url` | 无 | 代理地址（可以写到 `/v1`，会自动补 `/responses`）。**必须同时给 `key`**。 |
| `key` | 无 | Bearer key。可写 `{env:MY_VAR}` 由 OpenCode 做环境替换；替换未生效时会直接报错，不会悄悄改用别的通道。 |
| `model` | `gpt-6.1-sol` | 负责调用 `image_generation` 工具的对话模型。 |
| `reasoning_effort` | 不下发 | `none` / `minimal` / `low` / `medium` / `high` / `xhigh`，模型支持情况各异。 |
| `fast_mode` | `false` | `true` 时下发 `service_tier: "priority"`。 |
| `timeout_ms` | `240000` | 单次请求超时（毫秒）。 |

配置校验规则（都在发网络请求之前完成）：

- `base_url` 或 `key` **只要写了就必须有效**：空串、`null`、全空白、非字符串、未解析的 `{env:...}` 一律报错，不会静默回退到宿主账号或官方地址。
- 只给 `base_url` 不给 `key` → 报错，提示两者都配或都不配。
- 只给有效的 `key` → 默认使用 `https://api.openai.com/v1`。
- `base_url` 含用户名密码、查询串、片段或非 HTTP(S) → 报错。
- 两项都完全省略 → 走宿主托管凭据；宿主没有可用 OpenAI 连接时给出明确错误，不会退回到猜测的 endpoint。

## 三种登录方法

宿主托管模式下，凭据来自 OpenCode 的 `openai` integration。插件只接受以下三种方法，遇到未知 `methodID` 直接报错：

| 方法 label | `methodID` | 请求地址 | 附加请求头 |
|---|---|---|---|
| Sign in with ChatGPT | `chatgpt-token-sharing` | `https://api.openai.com/v1/responses` | `session-id`、`thread-id`、`x-client-request-id` |
| Codex browser (legacy) | `chatgpt-browser` | `https://chatgpt.com/backend-api/codex/responses` | `originator: opencode`、`session-id`、可选 `ChatGPT-Account-Id` |
| Codex device code (legacy) | `chatgpt-headless` | `https://chatgpt.com/backend-api/codex/responses` | 同上 |

说明：

- 两种 legacy 方法的 `metadata.accountID` 会作为 `ChatGPT-Account-Id` 发送；新方法不发送该头。
- `type: "key"` 的宿主连接按官方 API key 处理，走 `https://api.openai.com/v1/responses`。
- `chatgpt-token-sharing` 使用官方 `/v1/responses`。真实账号测试返回 HTTP 400 / `subscription_sharing_unsupported_capability`，因此**不承诺此方式可以生图**。插件不会把其 Token 发送到 legacy Codex 地址，也不会擅自切换其他已存账号；应使用 API 配置或在 OpenCode 中选择可用的 legacy 登录。
- 三种方法共用同一套请求体（`stream: true`、`store: false`、`tools: [{ type: "image_generation", ... }]`、`tool_choice`、`instructions`），差异仅在 endpoint 与少量请求头。
- 兼容普通 Responses JSON，以及带或不带 `Content-Type: text/event-stream` 的 SSE（部分 Codex 网关会省略该响应头）。

## 安全与隐私

- **不读取也不写入任何凭据文件**（包括 `auth.json`），不缓存 token，不遍历或切换账号；每次调用都重新 `active` + `resolve`，刷新完全交给 OpenCode。
- 显式 `base_url` + `key` 模式不会访问 integration API，key 只发送到 `base_url` 指向的地址。
- 失败时**不重试、不换通道**（401/403/超时/能力受限都一样），避免重复计费。
- 超时或取消后，即便上游晚到并返回了合法 PNG，也会在落盘前丢弃；流读取过程中的网络错误同样归一为固定文案。
- 错误信息只包含 HTTP 状态码和固定白名单错误码；不会输出上游响应正文、token、账号或任意自定义 `error.code`。网络层异常也统一归一为固定文案。
- 调用前先经过宿主的 permission 机制：读引用图 → `read`，写 PNG → `edit`；被宿主拒绝则不读文件、不发请求。
- 信号已取消（或在解析凭据期间被取消）时不发网络请求、不落盘；超时同样不落盘。
- 工具返回的 metadata 仅含 `out`、`versioned`、`bytes`、`route`、`method`、`model`，不含任何凭据或账户信息。
- 只保存 PNG，且用独占创建 + `-v2`/`-v3` 后缀，绝不覆盖已有文件。

## 用法

> 用 proxy_imagegen 生成一只水彩风格的狐狸，保存为 fox.png
>
> 用 proxy_imagegen 参考 fox.png，改成雪景版本，保存为 fox-snow.png

参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `prompt` | 是 | 图片描述；有参考图时按顺序说明每张图的作用。 |
| `out` | 是 | 输出 PNG 路径（相对当前会话目录或绝对路径）。 |
| `quality` | 否 | `auto` / `low` / `medium` / `high`。 |
| `size` | 否 | `auto` 或 `宽x高`（16 的倍数，最长边 ≤ 3840，长宽比 ≤ 3:1，总像素 655360–8294400）。 |
| `images` | 否 | 本地参考图路径数组（PNG / JPEG / GIF / WebP）。 |

尺寸与画质都是"尽力而为"，最终由后端决定。

## 故障排查

| 报错 | 含义与处理 |
|---|---|
| `options.base_url requires options.key` | 只配了一半，补齐或两者都删掉改用宿主账号。 |
| `options.key contains an unresolved environment substitution` | `{env:...}` 没解析：把变量加入 OpenCode 的环境配置并重新加载该配置（或新开一个会话使其生效），或删掉 `key`。 |
| `OpenCode did not expose an OpenAI connection to this plugin` | 当前 OpenCode 版本没有提供 integration API，请配置 `base_url` + `key`。 |
| `No OpenAI account is connected in OpenCode` | 去 OpenCode 里完成 Sign in with ChatGPT（或 legacy 方法）。 |
| `OpenCode could not provide a usable OpenAI credential` | 登录可能已过期或需要重新授权。 |
| `Unsupported OpenAI sign-in method. Supported methods: ...` | 当前 OpenCode 提供了插件未适配的方法；错误只列出受支持的方法，不回显原始方法值，属于版本不匹配，请升级插件。 |
| `The OpenAI access token has expired and could not be refreshed` | 刷新失败，重新登录。 |
| `Image request failed: HTTP 401/403` | 凭据或权限问题；插件不会自动重试。 |
| `Image request failed: HTTP 400 (subscription_sharing_unsupported_capability)` | 已实测的 Sign in with ChatGPT 结果：上游拒绝该能力。白名单码会原样显示（如 `subscription_sharing_unsupported_capability`、`subscription_sharing_route_not_supported`），表示当前订阅/网关不支持该能力或路由。 |
| `Image response contained invalid JSON` / `Response ended without an image_generation_call.result` | 上游没有按 Responses 协议返回图片。 |
| `Image request timed out` | 超过 `timeout_ms`，未写入文件。 |

## 发布流程

两个渠道互相独立，都由同一个 `@myoldtime/opencode-codex-imagegen` 包名发布到各自的 registry：

| 渠道 | 触发方式 | 说明 |
|---|---|---|
| GitHub Packages | 在 GitHub 发布 Release（`published`）后由 Actions 发布 | `.github/workflows/publish.yml` 只发布到 `npm.pkg.github.com`，`NODE_AUTH_TOKEN` 来自 workflow 的 `secrets.GITHUB_TOKEN`，不会使用本机 npm 登录 |
| npmjs | 在已登录 npmjs 账号的环境执行 `npm run publish:npm` | 只影响 npmjs；本机的 npm 登录不会传入 GitHub Actions，因此 CI 需要自己的凭据来源 |

发布前可运行以下只读检查（不会上传任何包）：

```powershell
npm whoami --registry=https://registry.npmjs.org   # 只读身份确认
npm view @myoldtime/opencode-codex-imagegen@0.1.0 version --registry=https://registry.npmjs.org --@myoldtime:registry=https://registry.npmjs.org
npm pack --dry-run --json                           # 只读打包检查
```

实际发布命令（会上传包，请确认版本与目标 registry 后再执行）：

```powershell
npm run publish:npm   # 上传到 npmjs
```

`publish:npm` 与 `publish:github` 分别向 npmjs 与 GitHub Packages 发布；`publishConfig` 只声明 `access: public`，项目不附带强制 registry 的 `.npmrc`。GitHub Actions 发布前会核对 tag 与 `package.json` 版本、包名和 `access`，发布后再做 `npm view` 校验。发布前请确认 `package.json` 版本与 tag 一致，并核对目标 registry。

## 开发与测试

```powershell
npm ci --ignore-scripts
npm run check   # node --check
npm test        # node --test，全部离线：注入 fake fetch / fake integration
npm pack --dry-run --json
```

测试覆盖：显式配置优先且不触碰 integration、三种 OAuth 方法的精确 URL/请求头/请求体、key 回退、每次调用重新 resolve、空白与半配置、未知方法与过期凭据、刷新/解析失败、HTTP/SSE/JSON 错误不泄密、参考图与 PNG 不覆盖、预取消与超时不落盘、插件注册 id/工具/权限顺序；另有发布元数据测试（包名、id、仓库链接、双 registry 与 scope override、workflow 校验、files 白名单）。

## License

MIT © MyOldTime
