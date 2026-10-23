# opencode-fusion

[English](README.md)

一个 [OpenCode](https://opencode.ai) 插件。贵的模型做决策，便宜的模型干活。

灵感来自 Cognition 的 [Devin Fusion](https://cognition.com/blog/devin-fusion)，sidekick 架构来自他们。

## 安装

将 npm 插件添加到 OpenCode 配置（`~/.config/opencode/opencode.jsonc`）：

```jsonc
{
  "plugin": [
    [
      "@faceair/opencode-fusion",
      {
        "sidekick": {
          "model": "provider/model-name",
          "variant": "medium"
        }
      }
    ]
  ],
  "default_agent": "fusion"
}
```

保存后重启 OpenCode。OpenCode 会在启动时自动安装 npm 插件。

设置后台 subagent 环境变量（启用并行调查模式）：

```sh
export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
```

加到 shell 配置里（如 `~/.config/fish/config.fish` 或 `~/.bashrc`），确保每次启动都生效。

| 选项 | 适用 agent | 说明 |
|------|-----------|------|
| `model` | sidekick | 模型，格式为 `provider/model-id` |
| `variant` | sidekick | 推理强度（`low`、`medium`、`high`、`xhigh`） |
| `options` | sidekick | provider 特定选项（如 `serviceTier`） |

如果省略 `model`，agent 继承当前会话的模型。如果不想把 Fusion 设为默认 agent，可以省略 `default_agent`，需要时手动选择 `fusion` agent。

## 它解决什么

用单模型 agent 做工程任务，几个常见问题：

- 贵模型的时间花在跑测试、读文件上，浪费钱。全换成便宜模型，决策质量又不够。Cognition 的数据显示 sidekick 架构在保持前沿模型表现的同时降低 35% 成本；测试套件委托给 sidekick 能省 62%，机械移除类任务省 32%。
- "问另一个模型"类工具每次跨模型调用都丢掉上下文缓存，得重新付一遍完整 prompt 的费用。长任务里这笔账涨得很快。
- 上下文压缩后丢掉之前的工作记忆。subagent `task_id` 在压缩后通过 `get_task_ids` 恢复。

## 怎么工作

两个 agent，各自独立的模型和上下文：

```
┌─────────────────────────────────────────────────┐
│  fusion（贵模型）                                │
│  负责：决策、判断、最终验证                       │
│                                                 │
│  通过 task() 委托 ────────────────┐              │
│                                  ▼              │
│                       ┌─────────────────┐       │
│                       │ sidekick        │       │
│                       │（便宜模型）      │       │
│                       │ 执行            │       │
│                       │ 发现            │       │
│                       │ 验证            │       │
│                       └─────────────────┘       │
└─────────────────────────────────────────────────┘
```

**fusion** 是你对话的主 agent。它负责判断和决策——该读代码做判断时自己读，做架构决策，在接收改动前自己做最终验证。默认委托机械执行，但不让委托阻止它在需要时查看实现细节来做决策。

**sidekick** 是执行伙伴。在独立的缓存上下文里读代码、收集事实、写实现、跑测试、定位失败。它擅长局部执行但缺乏全局架构视野——fusion 负责判断，sidekick 在 fusion 设定的边界内负责机械执行。

sidekick 保持持久缓存上下文。委托不触发 cache miss——这是跟"问另一个模型"工具的关键区别。fusion 用 `task` 工具调用它，拿到 `task_id` 后在后续调用中复用，继续同一个线程。同领域的任务交给同一个 sidekick 以复用缓存上下文；并行调查在独立 session 里运行。

### fusion 怎么决策

fusion 不走固定 workflow，按任务性质选择委派方式：

- **收集事实**——让 sidekick 找具体的引用、定义、调用位置、不变量。不是要方案。决策前先审计事实链。
- **执行改动**——提供接口契约、依赖、行为清单。不写实现 internals——那是 sidekick 的空间。
- **验证**——读实际改动的代码，不是 diff 摘要。找漏掉的：未处理的边界情况、要求了但悄悄省略的行为、没有测试的关键路径。

这些是常见模式，不是固定流水线。串行太慢就并行——怎么切自己定。

## 适合什么

- 复杂 debug，明显修复治标不治本
- 多阶段重构，关键决策不想交给便宜模型
- 开放性工作，下一步做什么没法预先规划

如果只是随聊随停的轻量助手，这套可能太重了。

## 许可证

[MIT](LICENSE)
