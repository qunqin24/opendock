# Active Context Pruning

ACP 是 [OpenCode](https://opencode.ai) 的上下文管理插件。它向模型提供压缩、恢复、搜索摘要和查看上下文用量的工具，用摘要替换暂时不需要的历史内容。

> **ACP 2.0 要求 OpenCode >=2.1.4 且 <3。** 本版本使用 V2 插件 API，不支持 OpenCode 1.x。通过 GitHub Release 和 npm 包 `@infituit/opencode-acp` 分发；无 scope 的 `opencode-acp` 不是本项目发布的包。

## 安装

需要 OpenCode **>=2.1.4 且 <3**。通过 npm 包全局安装（已包含预构建代码，无需从 Git 构建）：

```bash
opencode plugin add @infituit/opencode-acp@2.0.0-beta.1
```

也可使用 `opencode plugin add @infituit/opencode-acp@beta` 跟随 Beta 渠道，或者在 `opencode.json(c)` 中添加固定版本：

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugins": ["@infituit/opencode-acp@2.0.0-beta.1"]
}
```

移除已有的 npm、Git 或本地 ACP 插件项，避免重复加载。修改配置后执行 `/reload`，新建会话并运行 `/acp` 确认插件可用。
GitHub Release 仍保留预构建 tarball；Git tag 安装会从源码执行 `prepare` 构建，需要 Git 和 Node.js/npm。GitHub 自动生成的源码归档不含 `dist/`。

> [!IMPORTANT]
> **禁用 OpenCode 的内置自动压缩。** ACP 自行处理上下文管理，两者同时运行可能导致消息重新展开、压缩状态丢失。请在 `opencode.json` 中添加：
>
> ```jsonc
> {
>     "compaction": {
>         "auto": false,
>     },
> }
> ```
>
> 或设置环境变量：`OPENCODE_DISABLE_AUTOCOMPACT=1`

## 命令

ACP 提供 `/acp` 斜杠命令：

| 命令           | 说明                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `/acp`         | 显示压缩状态（同 `/acp stats`）；`/acp help` 查看命令列表                                          |
| `/acp context` | 按类别（system、user、assistant、tools 等）显示 token 用量明细，以及通过剪枝节省的量               |
| `/acp stats`   | 压缩状态：压缩块、上下文用量、推荐范围（与 `acp_status` 工具同一报告）                             |
| `/acp export`  | 导出活动压缩块到 markdown 文件。选项：`--output <path>`、`--tier t1,t2,t3`、`--stdout`、`--append` |

## 工作原理

ACP 根据上下文用量和配置向模型注入压缩提示，由模型选择范围并编写摘要。主要工具包括：

- `acp_compress`：将选定范围替换为摘要。
- `acp_decompress`：按需恢复压缩范围的原始内容。
- `acp_status`：查看上下文用量、压缩块和可压缩范围。
- `acp_search_context`：在活动压缩块的摘要中搜索，帮助定位需要恢复的内容。

### 分层压缩

摘要可以再次压缩，分为三个层级：

| 层级 | 名称 | 输入     | 输出             |
| ---- | ---- | -------- | ---------------- |
| T1   | 捕获 | 原始对话 | 保留细节的摘要   |
| T2   | 蒸馏 | T1 摘要  | 决策和结果       |
| T3   | 浓缩 | T2 摘要  | 进一步精简的事实 |

各层使用同一个 `acp_compress` 工具。原始消息使用 `mNNNNN` 引用，压缩块使用 `bN` 引用，层级根据被消费的块检测。例如：

```text
acp_compress({ content: [{ startId: "b5", endId: "b20", summary: "..." }] })
```

压缩时机受上下文阈值、摘要增长量和提醒频率等配置影响，不是固定每若干轮执行一次。压缩提示优先建议处理冗长工具输出、重复探索、已完成任务的中间步骤和不再需要的历史内容。

### 限制

- 摘要由模型生成，可能遗漏信息。需要原始细节时，应搜索摘要并按需解压；不要把压缩当作无损存档。
- GC 截断是上下文管理的兜底机制，不能替代正常压缩。
- 压缩比、缓存命中率和可持续会话长度取决于模型、服务商、配置及任务内容，不保证固定数值或无限会话寿命。

## 配置

ACP 使用自己的配置文件，按以下顺序加载：

1. **全局：** `~/.config/opencode/acp.jsonc`（或 `acp.json`），首次运行时自动创建；设置 `XDG_CONFIG_HOME` 时使用其下的 `opencode` 目录。
2. **自定义配置目录：** `$OPENCODE_CONFIG_DIR/acp.jsonc`（或 `acp.json`），当设置了 `OPENCODE_CONFIG_DIR` 时。
3. **项目级：** 项目 `.opencode` 目录下的 `.opencode/acp.jsonc`（或 `acp.json`）。

每一层覆盖前一层，因此项目设置优先于全局设置。修改 ACP 配置后请重启 OpenCode。

完整字段结构见 [`acp.schema.json`](./acp.schema.json)，默认值见 [`src/config.ts`](./src/config.ts) 中的 `defaultConfig`。不需要在配置文件中复制所有默认值，只填写需要覆盖的字段。

### 配置示例

以下示例设置日志级别、上下文提醒阈值和工具保护，不是完整配置：

```jsonc
{
    "$schema": "https://raw.githubusercontent.com/infituit/opencode-acp/master/acp.schema.json",
    "logLevel": "info",
    "compress": {
        "maxContextLimit": "80%",
        "nudgeFrequency": 5,
        "protectedTools": ["skill", "acp_compress"],
    },
}
```

上下文阈值接受 token 数或模型上下文窗口的百分比。`maxContextLimit` 是触发压缩提示的软阈值，不是硬性截断上限；达到阈值不代表模型一定立即执行压缩。根据模型的可用上下文调整阈值。

### 按 Provider / 按模型覆盖

支持的 `compress` 字段可通过嵌套的 `compress.providers` 按 provider 和按模型覆盖：

```jsonc
{
    "compress": {
        "maxContextLimit": "80%",
        "providers": {
            "anthropic": {
                "nudgeGrowthTokens": 20000,
                "models": {
                    "claude-sonnet-4.6": { "maxContextLimit": "70%", "nudgeForce": "strong" },
                },
            },
            "openai": { "nudgeGrowthTokens": 40000 },
        },
    },
}
```

解析为**逐字段**优先级：model > provider > 全局。未知的 provider/model ID 回退到全局值。嵌套的 `maxContextLimit` 同时优先于旧版扁平 `modelMaxLimits` 映射。多层配置（全局 → 配置目录 → 项目）按 provider/model 键深合并。

不可覆盖：`permission`、已废弃的 `minContextLimit` / `modelMinLimits` 系列、以及扁平 `modelMaxLimits` / `modelMinLimits` 映射自身。`modelMaxLimits` 仍受支持，只是优先级低于嵌套的 `maxContextLimit`。

完整的 `compress.providers` 字段结构见 [`acp.schema.json`](./acp.schema.json)。

### 受保护工具

默认情况下，以下工具受命令剪枝保护：
`task`、`skill`、`todowrite`、`todoread`、`acp_compress`、`decompress`、`batch`、`plan_enter`、`plan_exit`、`write`、`edit`。

`commands.protectedTools` 数组会添加到此默认列表。

`compress.protectedTools` 则控制模型压缩时的工具输出保护：当压缩范围包含这些工具的消息时，其内容完整保留在可见上下文中，只有周围的非受保护消息被压缩。

- 默认值为 `["skill", "acp_compress"]`，显式数组替换继承的策略。
- `"acp_compress"` 始终被强制保护，因为工具调用的 `summary` 参数承载已压缩对话的记录。
- 设置 `[]` 仅保留对 `acp_compress` 的强制保护；设置 `["task"]` 保护 `task` 和 `acp_compress`。

### 质量门控

质量门控默认关闭，使用 `rouge-recall-v1` 算法检查摘要长度、留存比例和词汇覆盖。启用方式：

```jsonc
{
    "qualityGate": {
        "enabled": true,
        "algorithm": "rouge-recall-v1",
    },
}
```

启用后，范围压缩会在提交前检查摘要；未通过时拒绝本次压缩并返回原因。应补充摘要中的关键细节后重试。提交后的检查失败会记录警告，不回滚已完成的压缩。质量指标不能保证摘要在语义上完整或正确。

### 日志

`logLevel` 支持 `debug`、`info`、`warn`、`error` 和 `silent`，默认值为 `info`。`debug: true` 会覆盖日志级别并启用完整调试日志及按请求快照。

### Prompt 覆盖

ACP 暴露六个可编辑的 prompt：

- `system`
- `compress-range`
- `compress-message`
- `context-limit-nudge`
- `turn-nudge`
- `iteration-nudge`

此功能默认禁用。在 ACP 配置中将 `experimental.customPrompts` 设为 `true` 以激活。

启用后，托管的默认值会作为纯文本 prompt 文件写入 `~/.config/opencode/acp-prompts/defaults/`。该目录中的 `README.md` 解释了每个 prompt 以及如何创建覆盖。

要自定义行为，在覆盖目录下添加同名文件并作为纯文本编辑。要重置覆盖，从覆盖目录中删除对应文件。

## 更新日志

版本历史见 [`support-files/changelog/zh/`](./support-files/changelog/zh/)。

## 项目来源与维护

本项目 fork 自 [ranxianglei/opencode-acp](https://github.com/ranxianglei/opencode-acp)，其最早来源为 [Tarquinen/opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning)。

自 v2 起，本项目由 infituit 相关成员独立维护，进行系统性重构，并将插件迁移至 OpenCode V2 API，不再兼容 OpenCode 1.x。

**维护原则：不继承历史债务。** 不会为了维持历史兼容性而保留已知问题或延续不合理设计；必要时接受不兼容变更。

## 许可证

本项目采用 AGPL-3.0-or-later 许可证，见 [LICENSE](./LICENSE)。历史作者及第三方组件的版权和许可声明予以保留，见 [LICENSE](./LICENSE) 和 [NOTICE](./NOTICE)。
