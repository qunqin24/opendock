# opencode-fetch-writer

[![CI](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml/badge.svg)](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml)

OpenCode 插件：改写 provider 出站请求的 **User-Agent** 并增删 **HTTP headers**——适用于任意 provider，完全通过插件 options 配置。

**English: [README.md](./README.md)**

## 为什么需要

把 OpenCode 指向自定义或企业级模型网关时，常见两类故障：

1. **你配置的 `User-Agent` 被静默忽略。** 部分 SDK 在合并 `provider.options.headers` *之后*再叠加自己的默认 UA，网关根本看不到你配置的 UA。
2. **网关直接拒绝请求**，因为默认客户端指纹不合规（UA 或中间层附加的 headers）。

本插件在「请求头仍可修改」的最后一个节点上动手，因此下游无法再覆盖。具体节点取决于 OpenCode 版本：

| OpenCode | Hook | 机制 |
|---|---|---|
| 1.x（1.18.29+） | `config` | 包装 provider 的 `options.fetch` |
| 2.x | `ctx.session.hook("http.request")` | 在派发前直接改写已组装好的 `Request` |

同一个发布包同时支持两者：默认导出同时携带 V2 的 `id` + `setup()` 与 V1 的 `server()`，各自宿主只读取属于自己的那一半。

## 安装

先运行 `opencode --version` 确认版本，选择对应语法：

- **v1（1.x）**→ 元组语法，配置在 `plugin` 下
- **v2（2.x）**→ 对象语法，配置在 `plugins` 下

编辑 OpenCode 配置文件（全局 `~/.config/opencode/opencode.jsonc`，或项目级 `.opencode/opencode.jsonc`）。各版本对两代 OpenCode 的支持情况：

| opencode-fetch-writer | OpenCode 1.x | OpenCode 2.x |
|---|---|---|
| 0.1.0 | ❌（被插件加载器拒载） | ❌ |
| 0.1.1 – 0.2.x | ✅ | ❌ |
| 0.3.0+ | ✅（1.18.29+） | ✅ |

**0.3.0** 起同一个包同时支持两代；OpenCode 1 侧还要求 **1.18.29+**（首个支持对象式入口的版本）。

### OpenCode v1（1.x，元组语法）

```jsonc
// opencode.jsonc
{
  "plugin": [
    ["opencode-fetch-writer@0.4.0", {
      "providerId": "my-provider",
      "uaTarget": "my-app/1.0.0",
      "headersToStrip": ["x-unwanted-header"],
      "headersToInject": {
        "X-Client-Name": "my-app"
      }
    }]
  ]
}
```

> `providerId` 即同一配置文件中 `provider` 映射里你的 provider 条目的键名。
> 改完**重启 OpenCode** 生效。首次启动会从 npm 下载包，之后走本地缓存。

### OpenCode v2（对象语法）

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.4.0",
      "options": {
        "providerId": "my-provider",
        "uaTarget": "my-app/1.0.0",
        "headersToStrip": ["x-unwanted-header"],
        "headersToInject": {
          "X-Client-Name": "my-app"
        }
      }
    }
  ]
}
```

两个版本的选项名完全一致，差别只在配置语法。

### 在 v2 中禁用

v2 通过插件 ID 标识插件，因此无需删除条目即可关掉：

```jsonc
{
  "plugins": ["*", "-fetch-writer"]
}
```

### 本地开发

v2 中，`plugins` 下的路径条目必须是**目录**。若要加载单个文件，请放到 `.opencode/plugins/`，该目录会被自动发现：

```jsonc
// v2 —— .opencode/plugins/fetch-writer.ts
export { default } from "../../src/index.js"
```

```jsonc
// v2 —— 指向本地包目录
{ "plugins": [{ "package": "./plugins/fetch-writer", "options": { "providerId": "acme", "uaTarget": "my-app/1.0" } }] }
```

```jsonc
// v1 —— 文件路径即可
{ "plugin": ["file://./src/index.ts"] }
```

## 验证安装

三步验证，由快到全：

1. **激活行**——重启 OpenCode，在启动终端（stderr）应看到。措辞本身能说明加载的是哪一代：

   ```
   # OpenCode 1
   [fetch-writer] patched options.fetch for provider "my-provider"

   # OpenCode 2
   [fetch-writer] registered http.request hook for provider "my-provider"
   ```

2. **实时改写日志**——以 `FETCH_WRITER_DEBUG=1` 启动 OpenCode，通过该 provider 发一条请求：

   ```
   [fetch-writer] user-agent: opencode/1.18.2 ai-sdk/provider-utils/2.1.0 → my-app/1.0.0
   ```

   > v2 中插件运行在 OpenCode server 进程内，只有加 `--standalone --print-logs`（或用 `opencode serve`）时其 stderr 才会直达终端。使用默认后台服务时，请改为查看日志文件。

3. **加载失败检查**——两者都没出现，说明插件可能静默加载失败。查 OpenCode 日志：

   ```bash
   # Linux / macOS
   grep "failed to load plugin" ~/.local/share/opencode/log/opencode.log

   # Windows（PowerShell）
   Select-String -Path "$env:USERPROFILE\.local\share\opencode\log\opencode.log" -Pattern "failed to load plugin"
   ```

   无输出 = 插件加载正常。

## 多 Provider

v0.2.0 起支持通过 `providers` 映射在**一个插件条目**中管理多个 provider（与顶层单 provider 字段 `providerId` 互斥）：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.4.0",
      "options": {
        "providers": {
          "corp-gateway": { "uaTarget": "my-corp-agent/2.1", "headersToStrip": ["x-unwanted-header"] },
          "partner-gw": { "uaTarget": "partner-client/1.0" }
        }
      }
    }
  ]
}
```

每个 provider 拥有独立规则；`FETCH_WRITER_UA` 仍然作用于所有未显式配置 `uaTarget` 的 provider。配置中不存在的 provider 会被跳过（debug 模式下有日志）。

> 在 0.2.0 之前的版本，将同一插件写多条目（各带不同 options）也能达到相同效果——`providers` 映射只是把配置收敛为一条。

## 工具改名（v1，0.4.0+）

部分网关会按请求体中的工具名计数或过滤。`toolRenameSuffix` 为出站请求中的每个工具名追加后缀——`tools` 列表、消息历史的 `tool_calls`、具名 `tool_choice`——并将响应 `tool_calls` 的名字还原，宿主侧继续使用原始工具名。

```jsonc
// v1 元组语法
{
  "plugin": [
    ["opencode-fetch-writer@0.4.0", {
      "providerId": "my-provider",
      "toolRenameSuffix": "_x"
    }]
  ]
}
```

- **仅 V1。** V2 的 `http.request` hook 拿到的请求体已完成编码，该选项被忽略并打一条 error 日志。
- **仅 OpenAI 兼容请求体。** Anthropic 形态原样放行。
- fail-open：无 tools 的请求、非 JSON 请求体、无法缓冲的流式请求体均原样发送。

## Options

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `providerId` | `string` | — | 旧版单 provider 模式：Provider ID（`provider` 映射中的键）。未设 `providers` 时必填。 |
| `providers` | `Record<string, ProviderRule>` | — | 多 provider 模式：provider ID → 规则（`uaTarget` / `headersToStrip` / `headersToInject` / `toolRenameSuffix`）的映射。与 `providerId` 互斥。 |
| `uaTarget` | `string` | — | 目标 User-Agent。缺省则不改写 UA。 |
| `headersToStrip` | `string[]` | `[]` | 需要从出站请求中删除的 header 名。 |
| `headersToInject` | `Record<string, string>` | `{}` | 缺失时注入的 headers。**从不覆盖**已有值。 |
| `toolRenameSuffix` | `string` | — | 为请求体中每个工具名追加的后缀（tools 列表、消息历史 `tool_calls`、具名 `tool_choice`）；响应 `tool_calls` 名字会还原。**仅 V1，且仅 OpenAI 兼容请求体**——Anthropic 形态的请求体原样放行。V2 下该选项被忽略并打一条 error 日志。 |
| `debug` | `boolean` | `false` | 向 stderr 输出调试日志。 |

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `FETCH_WRITER_UA` | 覆盖 `uaTarget` 选项 | — |
| `FETCH_WRITER_DEBUG` | 设为 `1` 启用调试日志 | `0` |

## 行为说明

- **MARKER 守卫（v1）**：插件在包装后的 fetch 上打标记，拒绝二次包装。即使同时被 plugins/ 目录自动加载和配置文件显式引用，请求也只会被包装一次。v2 无需同类守卫——hook 注册自带 provider 作用域，并随插件卸载一并释放。
- **激活日志**：启动时插件总会为每个 provider 向 stderr 输出一行，便于确认生效；措辞可区分版本（见[验证安装](#验证安装)）。
- **兼容两种 fetch 调用形态（v1）**：`fetch(url, init)` 与 `fetch(new Request(...))`。v2 侧始终拿到一个 `Request`。
- **WebSocket 传输（v2）**：注册 `http.request` hook 会让该 provider 保持在 HTTP 传输上——当有插件在观测请求时，OpenCode 会让 websocket 路由回退到 HTTP。若你确实要改写 websocket 握手，请改用 `experimental.ws.handshake`。
- **provider ID 取规范值（v2）**：请使用 V2 的 provider ID，而非已下线的 V1 ID。`azure-cognitive-services` → `azure`，`google-vertex-anthropic` → `google-vertex`。

## 问题排查

- **完全没有激活行**——插件加载失败。查 OpenCode 日志中的 `failed to load plugin`（见[验证安装](#验证安装)）。同时确认使用 **0.1.1+**：0.1.0 含非函数导出，会被加载器拒载。
- **v1 插件不生效**——检查 `providerId` 是否与 `provider` 映射中的键完全一致（区分大小写）。v2 同理，检查是否与 `providers` 映射中的键一致。
- **UA 仍被覆盖**——v1：确认没有其他插件或 provider option 在本插件之后再次设置自定义 `fetch`。v2：改写发生在所有 provider 包与内置插件执行之后，正常不应出现。
- **双重注入（v1）**——MARKER 守卫已处理；若激活日志出现两次，说明有两个*不同*的 fetch 包装器在生效，而非本插件重复加载。

## 开发

```bash
bun install
bun run verify     # typecheck + build + 测试 + 产物加载契约校验
```

也可单独执行：

```bash
bun run typecheck
bun run build
bun test
bun run verify:package
```

`verify:package` 会用两代真实的加载器契约校验 `dist/`——这是单元测试（从 `src/` 导入）覆盖不到的。

## 许可证

[MIT](./LICENSE)
