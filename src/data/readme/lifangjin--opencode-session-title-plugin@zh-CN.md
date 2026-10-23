# @lifangjin/opencode-session-title-plugin

[![npm version](https://img.shields.io/npm/v/@lifangjin/opencode-session-title-plugin.svg)](https://www.npmjs.com/package/@lifangjin/opencode-session-title-plugin)

[English](./README.md) | 简体中文

过滤 opencode 会话标题生成时无关的 system prompt 注入，节省 token 开销。

## 为什么需要

每次新建 opencode 会话都会触发一次后台 LLM 调用来生成简短标题。该调用使用 opencode 内置的 `title` agent，其 prompt 是一段固定的约 2KB 字符串，以 `</examples>` 结尾：

```
You are a title generator. You output ONLY a thread title. Nothing else.
...
```

其他插件（`@cortexkit/opencode-magic-context`、`oh-my-opencode-slim`、项目 `AGENTS.md`、skill 指南、MCP 指令等）会 hook `experimental.chat.system.transform`，向**每一次** LLM 调用追加项目记忆、会话历史、skill 列表等上下文--包括标题生成。这些上下文对生成一个 50 字符的标题毫无用处，却在新会话创建时浪费数千 token。

本插件检测标题生成调用，将 system prompt 剥离为仅剩 `PROMPT_TITLE`，让小模型只看到它真正需要的内容。

## 工作原理

同一个 default export 同时支持两代 opencode：v2 调用 `setup()`，v1（>= 1.18.29）调用 `server()`。

### opencode v2

插件注册专属的 `title` 会话 hook（`ctx.session.hook("title", ...)`），该 hook 只在标题生成请求时触发--检测是结构性的，无需靠内容嗅探定位调用。system 载荷为 `Array<SystemPart>`；opencode 核心将其初始化为恰好 `[SystemPart.make(PROMPT_TITLE)]`，其他插件的 `title` hook 可能在我们之前或之后追加更多 part。插件仍靠下文的内容标记定位纯 `PROMPT_TITLE`，剥离其余所有 part，并将数组原地替换为单个 `{ type: "text", text: pureTitle }` part。

### opencode v1

插件 hook 了 `experimental.chat.system.transform`：

1. **检测**：当任意 system 字符串包含完整句子 `"You are a title generator. You output ONLY a thread title. Nothing else."`（opencode `PROMPT_TITLE` 的首行）时，判定为标题生成调用。必须使用完整句子--短标记如 `"You are a title generator"` 会匹配其他 agent 系统提示词中的注释引用，导致误触发。

2. **提取**：从匹配的 system 条目中提取纯 `PROMPT_TITLE`--从 `TITLE_MARKER` 到 `</examples>`（含）的全部内容。其他插件前缀注入的内容（orchestrator 提示词、项目记忆等）被丢弃。

3. **替换**：system 数组原地替换为 `[pureTitle]`（mutation 模式 hook）。

4. **弹窗**：立即计算 token 节省量（`originalTokens - filteredTokens`）并弹出 TUI toast--无轮询，无等待。

检测基于内容而非 agent 名称，因为 `experimental.chat.system.transform` 只接收 `{ sessionID, model }`（不含 agent 名）。title agent 的 prompt 是 opencode 核心中的常量（`packages/core/src/plugin/agent.ts`），因此标记是稳定的。

> **注意**：不使用 `experimental.chat.messages.transform`。该 hook 只在 `SessionPrompt.run` 和 `SessionCompaction.process` 中触发，不在 `LLM.run` / `ensureTitle` 中触发--因此标题生成调用时它从不执行。

## 安装

### 作为已发布包

```jsonc
// opencode v2 配置："plugins" + 对象形式
{
  "plugins": [
    "@lifangjin/opencode-session-title-plugin@latest"
  ]
}
```

```jsonc
// opencode v1 配置："plugin" + 元组形式（~/.config/opencode/opencode.json）
{
  "plugin": [
    "@lifangjin/opencode-session-title-plugin@latest"
  ]
}
```

### 带选项

```jsonc
// opencode v2
{
  "plugins": [
    {
      "package": "@lifangjin/opencode-session-title-plugin@latest",
      "options": { "debug": true }
    }
  ]
}
```

```jsonc
// opencode v1
{
  "plugin": [
    ["@lifangjin/opencode-session-title-plugin@latest", { "debug": true }]
  ]
}
```

### 从源码构建（本地开发）

```jsonc
// opencode v2
{
  "plugins": [
    { "package": "/path/to/opencode-session-title-plugin", "options": { "debug": true } }
  ]
}
```

```jsonc
// opencode v1
{
  "plugin": [
    ["/path/to/opencode-session-title-plugin", { "debug": true }]
  ]
}
```

构建：`bun install && bun run build`

## 选项

| 选项      | 类型      | 默认值  | 说明                                                                                    |
| --------- | --------- | ------- | -------------------------------------------------------------------------------------- |
| `debug`   | `boolean` | `false` | 将检测/过滤详情写入 `~/.local/share/opencode/log/session-title-filter.log` 和 stderr。同时将完整 system 内容 dump 到带时间戳的 `.txt` 文件（最多保留 10 个）。 |
| `enabled` | `boolean` | `true`  | 总开关。设为 `false` 则仅检测不修改。                                                    |
| `notify`  | `boolean` | `true`  | 计算完 token 节省量后立即显示 TUI toast。仅 v1 API 生效--v2 服务端插件没有 TUI toast API，改为只写日志。 |

### Toast

`notify` 开启时（默认），插件在过滤后立即弹窗--无轮询，无延迟：

```
Session title filter
Title call saved 3018 tokens
```

token 节省量使用 [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) 精确计算：根据 hook 中的 `model` 字段选择 tokenizer encoding（GPT-4/3.5 用 cl100k_base，GPT-4o/o1/o3 用 o200k_base），对 OpenAI 模型精确，其他模型以 cl100k_base 近似（±5%）。LLM retry 导致的重复弹窗按 session 60 秒去重。

## 为标题生成使用更便宜的模型

本插件只过滤 system prompt。opencode 调用哪个模型生成标题由 opencode 自身控制。

opencode title agent 的模型优先级（来源：`packages/opencode/src/session/prompt.ts` 中的 `SessionPrompt.ensureTitle`）：

1. `agent.title.model` -- 在内置 `title` agent 上通过配置设置（最高优先级）
2. `small_model` -- 全局轻量模型配置
3. 主会话模型 -- 兜底（最贵）

要仅为标题生成固定一个便宜模型，在 `opencode.json` 中添加：

```jsonc
{
  "agent": {
    "title": {
      "model": "aimatespace/sensenova-deepseek-v4-flash"
    }
  }
}
```

这与本插件天然搭配：便宜模型只看到 `PROMPT_TITLE`（插件剥离了其余内容），每次标题调用的 token 成本降至接近零。

## 验证

新建一个 opencode 会话。开启 `debug: true` 后，检查日志文件 `~/.local/share/opencode/log/session-title-filter.log`：

```
[session-title-filter] plugin v0.0.4 loaded, enabled: true notify: true
[session-title-filter]   system[0]: len=16973 head="..." tail="...</examples>\n"
[session-title-filter] title call: model: sensenova-deepseek-v4-flash entries: 1 titleIndex: 0 originalText.len: 16973 originalTokens: 3521
[session-title-filter] filtered: pureTitle.len: 2095 pureTitle.head: "You are a title generator. You output ONLY..." filteredTokens: 503 savedTokens: 3018
[session-title-filter] notify: toast shown, savedTokens: 3018
```

`filteredTokens` 应在 500 左右（`PROMPT_TITLE` 的大小）。如果远大于此，说明其他插件仍在向同一 system 字符串注入--请带日志输出提交 issue。

## 兼容性

一个包同时支持两代（按官方迁移指南的双栈入口）：

- opencode v2（`@opencode/plugin` >= 2.0.0）：专属 `title` 会话 hook；检测是结构性的（该 hook 只在标题请求时触发）。
- opencode v1（`@opencode-ai/plugin` >= 1.18.29）：`experimental.chat.system.transform`；检测基于内容。
- 更老的 v1 版本（< 1.18.29）只支持函数式 default export--请固定使用 `@lifangjin/opencode-session-title-plugin@0.0.x`。
- 检测标记（`"You are a title generator. You output ONLY a thread title. Nothing else."`）绑定 opencode 内置的 `PROMPT_TITLE`（截至 v2 2.0.26 已核实未变）。如果 opencode 修改了 title agent 的 prompt，需更新 `src/index.ts` 中的 `TITLE_MARKER`。

## 还需要这个插件吗？

老实说：**这个插件的原使命，opencode v2 已在架构层面解决了大半。**

- v1 的病根是一个万能的 `experimental.chat.system.transform`，管所有 LLM 调用--其他插件注入的项目记忆、skill 列表连 title 调用一起污染，本插件负责事后剥离。
- v2 把 hook 按请求种类拆开：`context`（主对话循环）、`compaction`、`generate`、`title` 各管各的请求。插件注册 `context` hook 不再波及 title 请求。
- v2 的 title 请求初始 system 恰为 `[SystemPart.make(PROMPT_TITLE)]`；标题输入也由 core 限量（首条用户消息截断至 2000 字符，重新生成时上下文封顶 8000 字符）。

v2 下残存的价值：

1. **防御**：若某插件显式注册 `title` hook 并追加内容，本插件仍能剥掉--但取决于 hook 执行顺序（必须后于对方运行），保障力不如 v1。目前 v2 生态未见这种用法。
2. **观测**：token 节省量日志（v2 无 toast；v1 路径保留弹窗）。

留着几乎零成本：marker 缺失时安全 no-op，system 本就干净时幂等。

建议：

- 还在 v1（当前 stable 线）：**留着，这正是它的用武之地。**
- 已全面转 v2：可当便宜的保险丝加仪表盘，也可卸掉。若目标是省钱，更大的杠杆是给标题生成配便宜模型--v2 配置 `agents.title.model`（取代 v1 的 `small_model`），靠配置即可，无需插件。

## License

MIT
