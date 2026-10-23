# opencode-gpt-talk-normal

[English](README.md) | 中文

[OpenCode](https://opencode.ai) 服务端插件 —— 使用 GPT 模型时自动注入 [talk-normal](https://github.com/hexiecs/talk-normal) system prompt。

## 功能说明

当 `model.id` 或 `model.modelID` 包含 `gpt`（忽略大小写）时，本插件会在请求发往 LLM 之前，将 talk-normal prompt 插入到 system 消息的头部。非 GPT 模型完全不受影响。

prompt 来源：[talk-normal v0.6.1](https://github.com/hexiecs/talk-normal/blob/main/skill/prompt.md)，作者 [hexiecs](https://github.com/hexiecs)。

## 安装

```bash
# 通过 opencode CLI（推荐）
opencode plugin opencode-gpt-talk-normal

# 或 pnpm
pnpm add -D opencode-gpt-talk-normal

# 或 npm
npm install -D opencode-gpt-talk-normal
```

## 配置

在 `opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gpt-talk-normal"]
}
```

开发阶段也可以使用本地路径：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-gpt-talk-normal"]
}
```

## 行为

| 条件 | 结果 |
|---|---|
| `model.id` 包含 `gpt` | talk-normal prompt 插入到 `system[]` 头部 |
| 模型为 Claude、Gemini 等 | 无变化 |
| prompt 已存在 | 跳过（幂等保护） |

## 作用范围

OpenCode 中**所有 agent**（主 agent build/plan、子 agent explore/librarian/oracle 等）的 LLM 请求都会经过 `experimental.chat.system.transform` hook，因此只要 modelId 含 `gpt` 就会命中注入，与 agent 类型无关。

同理，通过第三方网关代理的 GPT 模型（如 `github-copilot/gpt-5.4`、`my-poe/openai/gpt-5.1-codex-max`）只要 modelId 带 `gpt` 同样会生效。

## 端到端验证

已通过真实 `openai/gpt-5.4` 走完 OpenCode 插件 hook（`experimental.chat.system.transform`）的完整链路。捕获的请求确认 talk-normal 作为第一条 system 消息注入，对照组 `claude-sonnet-4.6` 无注入。

## 测试

```bash
node --test
```

## 许可证

MIT
