# @yulimfish/opencode-tool-search

> 为 [opencode](https://opencode.ai) 提供动态工具加载能力，设计灵感来自
> [Kimi K3 的工具搜索模式](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading)。

> **状态：已归档，暂停维护，不建议启用。** 工作流安装器不再安装此插件；目前可优先使用 OpenChamber 内置的 Code Mode。

> 关于名称：npm 上不带 scope 的 `opencode-tool-search` 包属于另一位作者，且实现不同。
> 本项目使用 `@yulimfish/opencode-tool-search` 发布，以区分两者的命名空间。

当一个会话积累了几十个工具（内置工具、MCP 服务器和自定义插件）时，每次请求都要携带完整的
`tools[]` 工具目录。可选项越多，模型的判断准确度也越容易下降。

`opencode-tool-search` 会将你指定的繁杂工具（默认是 MCP 服务器）折叠为简短占位描述，并提供一个
`tool_search` 工具，让模型通过关键词查找这些工具。工具在本会话中被搜索或调用后，就会解除折叠。

## 为什么不完全采用 Kimi API 的模式？

Kimi K3 允许客户端在对话过程中动态注入 `{role:"system", tools:[…]}` 消息。opencode 的插件运行时
目前尚未向插件开放即将发送的 `tools[]` 数组，因此无法直接实现协议层面的动态注入。

因此，我们改用 opencode 的两个钩子来实现相同目标：

| 目标（Kimi API）                       | 实现方式                                    |
|---------------------------------------|-------------------------------------------------|
| 顶层 `tools[]` 保持精简 | `tool.definition` 钩子将工具描述改写为简短占位文本，避免占用模型注意力 |
| `search_tools` 展示完整定义 | 自定义 `tool_search` 工具；已激活的工具在本会话剩余时间内保持可见 |
| 已激活的工具在多轮对话间持续可用 | 在内存中按会话保存工具 ID 集合 |
| 首轮设置 `tool_choice: required` | 无需设置——系统提示会告知模型先搜索工具 |

效果相同，底层实现不同。

## 安装

```bash
npm i -g @yulimfish/opencode-tool-search  # 也可安装到项目中
```

在 `~/.config/opencode/opencode.jsonc` 中添加：

```jsonc
{
  "plugin": ["@yulimfish/opencode-tool-search"]
}
```

默认情况下，所有名称匹配 `mcp_*` / `mcp__*` 的工具都会被折叠。重启 opencode 即可生效。

## 配置

有两种配置方式，可任选其一。对于标量字段，通过 `plugin` 传入的选项优先于 JSON 文件中的值；
`tools` 映射则会合并。

### 1）直接写入 `opencode.jsonc`

```jsonc
{
  "plugin": [
    ["@yulimfish/opencode-tool-search", {
      "hide": ["mcp_*", "figma_*", "yuque_*"],
      "keep": ["mcp_critical_tool"],
      "topK": 6,
      "descriptionLimit": 800,
      "injectSystemHint": true
    }]
  ]
}
```

### 2）独立配置文件 `~/.config/opencode/tool-search.json`

适合配置较多标签的场景：

```json
{
  "hide": ["mcp_*", "yuque_*"],
  "topK": 5,
  "tools": {
    "yuque_yuque_search": {
      "tags": ["knowledge", "wiki", "notes", "语雀"]
    },
    "yuque_yuque_get_doc": {
      "tags": ["read", "wiki", "语雀"]
    },
    "mcp_github_create_issue": {
      "tags": ["github", "issue", "create"],
      "description": "在指定仓库中创建 GitHub issue。参数：owner、repo、title、body。"
    }
  }
}
```

## 选项参考

| 字段 | 类型 | 默认值 | 说明 |
|--------------------|------------|---------------------|---------|
| `enabled` | boolean | `true` | 总开关。 |
| `hide` | string[] | `["mcp_*","mcp__*"]` | 要折叠的工具 ID 匹配模式。`*` 匹配任意长度字符，`?` 匹配单个字符，`re:...` 表示原始正则表达式。 |
| `keep` | string[] | `[]` | 强制保持完整显示的匹配模式，优先于 `hide`。`tool_search` 始终保持可见。 |
| `topK` | number | `5` | 每次搜索返回的结果上限。 |
| `descriptionLimit` | number | `600` | 每条工具描述截断前的最大字符数。 |
| `injectSystemHint` | boolean | `true` | 是否在系统提示中附加文字，告知模型 `tool_search` 的存在。 |
| `tools` | object | `{}` | 单工具覆盖项：`{ toolId: { tags?: string[], description?: string } }`。标签用于搜索索引；自定义描述会替换提供给模型的描述。 |

## 运行时行为

1. **每次请求** —— opencode 准备发送给 LLM 的每个工具都会经过 `tool.definition` hook。若工具匹配 `hide` 且本会话中尚未激活，插件会将其描述替换为隐藏提示（例如：`[hidden — call tool_search("<工具名称或相关关键词>") or a related keyword to reveal the full description and parameters]`）。参数 schema 保持不变；模型仍可在确信时直接调用该工具，无需额外搜索一轮。
2. **模型调用 `tool_search`** —— 插件按名称、标签和描述与查询词的匹配程度排序，返回排名前 K 的工具及其完整描述和参数，并将结果标记为本会话已激活。
3. **模型调用任意工具** —— 插件通过 `tool.execute.after` 自动激活该工具，因此后续轮次会显示完整描述，无需再次搜索。
4. **系统提示** —— 插件通过 `experimental.chat.system.transform` 附加简短提示，说明当前折叠了多少个工具。

## 验证

重启后，向模型提出一个需要使用已折叠 MCP 工具的请求。模型应先调用 `tool_search`。日志中应能看到：

```
[tool-search] plugin initialized
[tool-search] tool_search executed { query: 'github issue', hits: [...] }
```

也可以手动测试：

```
> 用 tool_search 查找与“figma”相关的工具
```

## 设计说明

- **运行时零依赖**。模糊匹配基于词袋模型，对于几百个工具已经足够；如果你的工作区有数千个工具，
  欢迎提交 issue。
- **激活状态仅限当前会话**。重启 opencode 后，工具的“已展示”状态会重置。这是有意为之——新会话
  应尽可能从最精简的提示开始。
- **不会改动线上请求中的 `tools[]`**。插件无法访问这部分内容；我们能做的是让工具描述看起来
  不值得关注，避免模型在这些描述上浪费注意力。

## 许可证

MIT © Yulimfish · 联系方式：`epeiuss@waterflames.cn`
