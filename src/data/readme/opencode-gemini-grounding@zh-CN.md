<div align="center">

# opencode-gemini-grounding

<p>
  <strong>专为 OpenCode V2 打造的高性能 LLM 搜索接地（Grounding）插件</strong><br />
  基于 Google Gemini 搜索接地能力，提供学术论文级精准行内角标（<code>[1]</code>, <code>[2]</code>）、全量独立来源卡片跳转、系统全局 WebSearch 自动接管与持久化零开销缓存。
</p>

<p>
  <a href="https://www.npmjs.com/package/opencode-gemini-grounding"><img src="https://img.shields.io/npm/v/opencode-gemini-grounding?color=blue&style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/opencode-gemini-grounding"><img src="https://img.shields.io/npm/dt/opencode-gemini-grounding?color=brightgreen&style=flat-square" alt="npm downloads" /></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-V2%20兼容-4F46E5?style=flat-square" alt="OpenCode V2" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/依赖-Zero%20Dependencies-success?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/ESM-原生支持-blue.svg?style=flat-square" alt="ESM" />
</p>

<p>
  <a href="README.md"><strong>English</strong></a> · <a href="README_CN.md"><strong>简体中文</strong></a>
</p>

---

</div>

## 🌟 概述

`opencode-gemini-grounding` 是遵循 OpenCode V2 官方最新规范开发的联网搜索扩展插件。无论当前会话的主力模型是 Claude、DeepSeek、GPT 还是本地模型，均可通过本插件一键赋予其实时联网检索、核实最新事实以及追溯原始网页来源的能力。

不同于传统的单网页粗粒度爬虫，本插件基于 Google Gemini 原生 Search Grounding，返回高度浓缩的事实总结，并利用 **UTF-8 字符字节偏移量逆向切片算法** 将 **`[1]`、`[2]` 行内引用角标** 精准附着在对应事实的句尾，文末附带真实的网页来源和关键词检索记录。

---

## ✨ 核心特性

- **🚀 原生适配 OpenCode V2 核心体系**：深度对接 V2 `id` + `setup(ctx)` 架构，同时覆盖 `ctx.tool`、`ctx.websearch`、`ctx.storage` 与 `context.progress`。
- **🌐 双入口分流机制（WebSearch + Custom Tool）**：
  - **全局系统搜索引擎（`ctx.websearch`）**：自动注册并设为 OpenCode 全局默认的 `websearch` 提供商，日常对话任何模型联网自动透明接管；
  - **自定义专业工具（`ctx.tool`）**：暴露 `google_grounding` 与 `websearch_cited`，并入驻 Code Mode 的 `search` 命名空间（`tools.search.google_grounding`），支持动态传参。
- **🎯 智能防膨胀切片（全量卡片独立跳转）**：
  - 检索到的每个来源均在 UI 中呈现为独立可点击卡片，点选任意一张均能跳转真实原文网页；
  - 首张卡片携带完整无删减报告保证模型上下文完整；后续卡片自动匹配专属引用句摘要，**相较粗暴复制单次节省约 87.5% 重复 Token（省下 20,000+ 上下文）**。
- **⚡ 原生持久化缓存（`ctx.storage`）**：依托 OpenCode Server 原生沙盒存储实现 TTL 缓存（默认 10 分钟），重复提问秒级瞬返，零额外延迟、零 Token 开销、彻底免疫 429。
- **🔔 实时动态进度条（`context.progress`）**：在 TUI 终端与 Web 界面中动态显示“正在检索 Google...”、“已命中本地缓存”、“正在降级至下一模型...”等实时状态。
- **⚙️ 现代化 `ctx.options` 配置**：支持在 `opencode.jsonc` 中直接为插件传入结构化 options，原生支持 `{env:VAR}` 自动插值。
- **⚡ 故障自动容灾降级链**：内置多模型备选梯队，单模型请求超时宽松设定为 45 秒，总超时 180 秒（3 分钟）。遇到限流（HTTP 429）或网关波动时自动无感顺延；遇到鉴权无效（HTTP 401/403）等致命错误立即终止，绝不盲目轮询浪费时间。
- **🧠 动态模型即时切换与归一化**：支持在单次搜索时动态指定任意 Gemini 模型，自动兼容 `google/` 等前缀写法并完成格式归一化。
- **📍 学术级精准角标排版**：解析底层的 `groundingSupports`，动态维护角标重映射（Remap），确保正文 `[1]`、`[2]` 与文末 Sources 严格一一对应；文末采用美观的 Markdown 超链接，告别超长重定向链接刷屏。
- **🌐 深度兼容自建网关与中转**：同时支持原生 `x-goog-api-key` 与 `Authorization: Bearer` 请求头，完美兼容 OneAPI、NewAPI、Cloudflare AI Gateway 等第三方网关与反向代理。

---

## 🔀 双搜索入口架构说明

本插件提供了两套并行的搜索入口，分别满足日常透明调用与专业脚本化定制：

```text
                    用户输入提问
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    【日常提问】                   【高级/特殊提问】
 “今天北京天气怎么样”           “用 gemini-3.8 帮我查”
 “9070xt 评测怎么样”            “在 Code Mode 批量查3个竞品”
         │                               │
         ▼                               ▼
 大模型调用 websearch(...)      大模型调用 google_grounding(...)
         │                               │
         ▼                               │
 OpenCode 底层路由                       │
（被本插件接管为全局默认）                 │
         │                               │
         └───────────────┬───────────────┘
                         ▼
             进入同一个 Google Grounding 引擎
       （共享 45s 超时、容灾降级链与 ctx.storage 缓存）
```

| 入口方式 | 调用方法 | 适用场景 | 优势特点 |
| :--- | :--- | :--- | :--- |
| **系统全局 WebSearch** | 大模型自动调用 `websearch({ query })` | 日常对话、系统默认 Agent 联网 | **透明无感**。在 UI 中展示多张独立跳转卡片，且无重复 Token 膨胀。 |
| **专业自定义工具** | 调用 `google_grounding` 或 `tools.search.google_grounding` | 深度调研、Code Mode 批量并发、指定顶级模型 | **高级可控**。支持动态传递 `model`、`context` 背景约束、`max_sources` 等。 |

---

## 📦 安装与使用方式（Installation）

### 方式一：npm 官方包引入（强烈推荐·开箱即用）

无需 clone 源码或手动配置软链接，直接在 OpenCode 配置文件 `~/.config/opencode/opencode.jsonc`（Windows 为 `%USERPROFILE%\.config\opencode\opencode.jsonc`）的 `plugins` 列表中添加本插件即可：

#### 1. 基础极简配置
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-gemini-grounding"
  ]
}
```

#### 2. 带自定义选项的高级配置（推荐）
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-gemini-grounding",
      "options": {
        "model": "gemini-3.5-flash-lite",      // 默认首选检索模型
        "apiKey": "{env:GOOGLE_API_KEY}",       // 自动从环境变量解析 API 密钥
        "cacheTtlMs": 600000,                  // 本地持久化缓存时间（毫秒，默认 10 分钟，设为 0 禁用）
        "requestTimeoutMs": 45000,              // 单个模型请求超时时间（45 秒）
        "timeoutMs": 180000,                    // 容灾降级总超时（3 分钟）
        "setDefaultWebsearch": true             // 自动设为 OpenCode 全局默认 WebSearch 源
      }
    }
  ]
}
```

---

### 方式二：本地开发调试模式（面向开发者）

如果你正在开发、调试或为本项目贡献代码，可以通过以下本地方式加载：

#### 全局插件重导出桥接
在 OpenCode 全局插件目录新建 `~/.config/opencode/plugins/google-grounding.js`：
```javascript
export { default } from "file:///D:/OpenCode/opencode-gemini-grounding/index.js";
```

#### 或目录软链接（Junction）
```powershell
# Windows 环境（PowerShell）
cmd /c mklink /J "$env:USERPROFILE\.config\opencode\plugins\opencode-gemini-grounding" "D:\OpenCode\opencode-gemini-grounding"
```

验证插件是否已被 OpenCode 识别：
```bash
opencode plugin list
```

---

## 🛠️ 工具参数说明

当通过自定义工具（`google_grounding` / `websearch_cited`）调用时，支持以下参数：

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `query` | `string` | **是** | 待检索的问题或自然语言搜索词。 |
| `model` | `string` | 否 | 动态指定本次搜索采用的 Gemini 模型 ID（如 `gemini-3.5-flash-lite`、`gemini-3.8-flash` 等）。不传则按配置取默认值。 |
| `context` | `string` | 否 | 可选的额外约束条件、背景事实或引导指令。 |
| `max_sources` | `number` | 否 | 最大返回来源网页链接数（1 ~ 20，默认值为 `8`）。 |

---

## ⚙️ 配置与优先级规则

### 1. 模型选择优先级（Model）
1. 本次工具调用动态传入的 `model` 参数；
2. `opencode.jsonc` 插件选项 `options.model`；
3. 环境变量 `OPENCODE_GOOGLE_MODEL`；
4. `opencode.jsonc` 中的 `providers.google.model` 或 `settings.model`；
5. `opencode.jsonc` 中的 `providers.google.options.websearch_cited.model`；
6. 默认回退值：`gemini-3.5-flash-lite`。

> **容灾降级链机制**：
> 若首选模型请求失败或触发频率限制，插件将按如下顺序自动降级重试：
> `[请求模型] -> gemini-3.5-flash-lite -> gemini-3.8-flash -> gemini-3.7-flash -> gemini-3.1-flash-lite -> gemini-3-flash-preview -> gemini-2.5-flash`。

### 2. 接口基础地址（Base URL）
1. `opencode.jsonc` 插件选项 `options.baseURL`；
2. 环境变量 `OPENCODE_GOOGLE_BASE_URL`；
3. `~/.config/opencode/opencode.jsonc` 中的 `providers.google.settings.baseURL`；
4. 默认值：`https://generativelanguage.googleapis.com/v1beta`（Google 官方端点）。

### 3. API 密钥（API Key）
1. `opencode.jsonc` 插件选项 `options.apiKey`（支持 `{env:VAR}` 占位符）；
2. 环境变量 `OPENCODE_GOOGLE_API_KEY` / `GOOGLE_API_KEY` / `GEMINI_API_KEY`；
3. OpenCode 本地存储凭据 `~/.local/share/opencode/auth.json`（`google.key` 或 `indor.key`）；
4. `opencode.jsonc` 中的 `providers.google.settings.apiKey`。

---

## 📝 输出效果展示

```markdown
根据北京市气象台发布的最新预报，北京今日（9月27日）天气概况如下[1]：

* **天气状况**：多云转晴，夜间晴间多云（雨后放晴，能见度良好）[1][2]
* **气温**：最高气温 26℃ 左右，夜间最低气温 15℃ ~ 16℃[1][3]
* **风向风力**：白天偏北风3级，阵风可达 5~6级[1]

Sources:
[1] [北京日报网 - 今日气象通报](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)
[2] [中国天气网 - 降水与晴雨实况](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)
[3] [国家气象中心 - 气温走势预警](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)

Search queries: 北京天气 气象台 2026年9月27日
```

---

## 🙏 致谢（Acknowledgements）

本项目在设计与实现过程中，吸纳并借鉴了两个优秀的 OpenCode V1 前辈开源项目的核心思想：

- **[ghoulr/opencode-websearch-cited](https://github.com/ghoulr/opencode-websearch-cited)**（作者：[@ghoulr](https://github.com/ghoulr)）：启发了学术论文级的行内引用格式（`[1]`、`[2]`）设计，以及基于 `groundingSupports` 的 UTF-8 字节偏移量切片插入算法。
- **[janaki-sasidhar/opencode-google-grounding](https://github.com/janaki-sasidhar/opencode-google-grounding)**（作者：[@janaki-sasidhar](https://github.com/janaki-sasidhar)）：启发了纯外挂、零侵入的独立 Custom Tool 架构设计，以及对自定义 `baseURL` 代理网关的灵活解析机制。

---

## 📄 许可证

基于 [MIT License](./LICENSE) 开源发布。
