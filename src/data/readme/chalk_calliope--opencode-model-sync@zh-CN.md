# opencode-model-sync

[![npm version](https://img.shields.io/npm/v/@chalk_calliope/opencode-model-sync.svg)](https://www.npmjs.com/package/@chalk_calliope/opencode-model-sync)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

OpenCode **V2** 插件：在服务启动时为每个已连接的 **OpenAI 兼容**提供商拉取最新模型列表并注册，
让网关与自建端点无需手改配置即可出现在 `/models` 中。

插件 ID：`provider-model-sync` · [English](README.md)

## 特性

- **启动时同步** — 每次插件加载执行一次 `GET <baseURL>/v1/models`。
- **账户感知鉴权** — 已连接账户 → `settings.apiKey` → `<PROVIDER>_API_KEY`。
- **非破坏性合并** — 只追加新 ID；显式配置的 capabilities / limit / cost 原样保留。
- **仅保留对话模型** — 默认排除视频、3D、音乐、语音、嵌入等生成类模型。
- **可观测** — 每次同步写入 `last-sync.json`，并按提供商报告失败。
- **运行时零依赖** — OpenCode 类型全部通过 `import type` 引入。

## 安装

```sh
npm install @chalk_calliope/opencode-model-sync
```

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["@chalk_calliope/opencode-model-sync"] }
```

本地开发可改为克隆到全局插件目录（OpenCode 会自动加载）：

```sh
git clone https://github.com/ChalkCalliope/opencode-model-sync.git \
  ~/.config/opencode/plugins/opencode-model-sync
```

⚠️ 两种方式**只选一种**。已被自动扫描的目录不要再登记到 `plugins`，否则同一插件 ID 会加载两次，
第二个实例报 `Duplicate plugin ID`。

环境要求：OpenCode `v2.x`（已在 `v2.0.14` 验证）。

## 验证

```sh
opencode plugin list             # 应只有一行 provider-model-sync
opencode api get /api/plugin     # state.status: active
```

```jsonc
// <插件目录>/last-sync.json —— 每次同步后覆盖
{
  "applied": 3,
  "failed": 0,
  "providers": [
    {
      "providerID": "siliconflow",
      "status": "synced",
      "modelsURL": "https://api.siliconflow.com/v1/models",
      "credential": "connection:credential:key",
      "fetched": 78,
      "kept": 56,
      "excluded": 22,
      "added": 16
    }
  ]
}
```

`status` 取值：`synced`（已同步）、`skipped`（无 baseURL / 无凭据）、`failed`（URL / HTTP / 网络错误）。
开启 JSON 行调试日志：`OPENCODE_PROVIDER_MODEL_SYNC_DEBUG=/tmp/model-sync.log opencode`。

## 行为规则

| 步骤 | 规则 |
| --- | --- |
| 提供商筛选 | `package` 匹配 `@opencode/ai/providers/openai-compatible` |
| 模型 URL | 定位第一个 `/v1` 段，截断其后并拼 `/v1/models` —— `https://x/v1/chat/completions` → `https://x/v1/models`；无 `/v1` 则报告并跳过 |
| 凭据 | 已连接账户 → `settings.apiKey` → 环境变量（`<PROVIDER_ID>_API_KEY`） |
| 合并 | 已有定义优先；仅补充缺失 ID，并使用 OpenCode 兜底元数据 |
| 过滤 | 丢弃生成类模型（`video`、`3d`、`music`、`speech`、`embed` 等） |

带 `vision`、`mt`、`role` 等字样的对话模型会保留。设 `exclude: []` 可关闭过滤。

## 配置项

通过 `plugins` 条目加载时（npm 包）才会传入 options；自动扫描的目录插件收不到 options，始终使用
默认值（已在 OpenCode v2.0.14 验证）。

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `providers` | `[]`（全部） | 仅同步指定提供商 ID |
| `packages` | `["@opencode/ai/providers/openai-compatible"]` | 视为 OpenAI 兼容的 `package` |
| `timeoutMs` | `15000` | 单个 `/v1/models` 请求超时 |
| `env` | `{}` | 每个提供商的回退环境变量名 |
| `headers` | `{}` | 每个提供商的额外请求头 |
| `allowAnonymous` | `[]` | 允许无凭据访问的提供商 ID |
| `exclude` / `include` | 仅对话模型 | 覆盖过滤规则 |
| `logPrefix` | `"[provider-model-sync]"` | 日志前缀 |
| `debugLog` | 未启用 | JSON 行调试日志路径 |
| `statusFile` | `<插件目录>/last-sync.json` | 状态文件路径 |

## 已知限制

- 仅处理 OpenAI 兼容提供商；其它 package（anthropic、google、bedrock 等）跳过。
- `/v1/models` 只返回模型 ID，新模型使用 OpenCode 兜底元数据；需要精确 limits / 价格 / 能力时
  请在配置中显式定义该模型。
- `baseURL` 不含 `/v1` 段的提供商会跳过。
- 每次插件加载只同步一次；重载或重启即可刷新。

## 开发

```sh
npm run typecheck    # tsc --noEmit
npm test             # 26 个单元测试
```

`index.ts` 为 setup 编排，`lib/` 包含 `options`、`urls`、`auth`、`discovery`、`models`、`value`。

## 许可证

[MIT](LICENSE)
