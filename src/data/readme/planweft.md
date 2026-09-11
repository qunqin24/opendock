[简体中文](README.md) | [English](README.en.md)

# PlanWeft

PlanWeft 把编程 Agent 的任务计划、调查发现和验证记录保存在项目中。会话中断或换人后，可以从这些文件继续工作，而不必依赖聊天记录。

当前稳定版是 **0.4.0**。它基于固定的 planning-with-files（PWF）v3.17.0，并为 Codex、Claude Code、Pi、OpenCode V1 和 DeepSeek Harness 提供经过正式验收的安装与生命周期支持。

## 快速开始

需要 Node.js 22 或更高版本。下面的例子为 Codex 安装完整集成，并检查安装状态：

```bash
npx planweft@0.4.0 add -a codex --global
npx planweft@0.4.0 doctor -a codex --global
```

新会话中显式调用 `$project-docs`，确认 Agent 实际读取了 Skill。其他宿主的 scope、信任和加载方式见[安装指南](docs/installation.md)。

## 它保存什么

复杂任务通常使用三份工作文件：

| 文件 | 内容 |
| --- | --- |
| `task_plan.md` | 目标、阶段、下一步和阻塞项 |
| `findings.md` | 调研结果、来源、假设和待定事项 |
| `progress.md` | 已执行操作、错误和测试结果 |

稳定的需求、设计决定和复现材料继续保存在项目已有的 specs、ADR 和 reproduction 文档中。PlanWeft 不要求为每个小改动创建一整套文档，也不会把宿主聊天历史当作默认恢复来源。

## 0.4.0 支持范围

| 能力 | 状态 |
| --- | --- |
| Codex、Claude Code、Pi、OpenCode V1、DSH 的准确产物、安装、更新、回退、卸载和重新安装 | 正式支持 |
| 上述五宿主的项目隔离、用户文件保护、重复注册检查、显式 Skill 读取、默认提醒和明确禁用 | 正式支持 |
| Codex 显式维护后由独立会话冷读 | 正式工作流 |
| Pi 的 explicit/auto 维护与冷读 | 在 0.4.0 冻结条件下通过，按证据定级 |
| autonomous/gated、真实模型自动采用和其余十个平台适配 | 实验性 |

实验性能力的失败或 Not Run 不会被写成 Passed。Codex 的 gate-cap 开启/关闭配对因 syscall 归因不完整保留为 Failed（`LIMIT-CODEX-TRACE-INCOMPLETE`）；这不影响五宿主的正式核心能力。完整分级见[平台与支持范围](docs/platforms.md)和 [`release/support-policy.json`](release/support-policy.json)。

## 使用边界

- 默认模式提供提醒，不会自动保证任务完成。autonomous/gated 必须显式启用，并受宿主能力限制。
- attestation 检查文件内容是否变化，不代表人工批准；完成门禁检查计划状态，不代表实现正确。
- 模型范围遵循是公开评测结果，不是安全隔离保证。文件权限和命令授权仍由宿主负责。
- 同一会话只应启用一套规划执行 hooks。安装器会报告可检测的重复来源，但不会自动删除其他插件。
- 更新或卸载插件不会回退或删除项目计划、用户笔记、specs、ADR 和 reproduction。

## 文档

- [安装、更新、回退与卸载](docs/installation.md)
- [平台支持和已知限制](docs/platforms.md)
- [开发与生成约定](docs/development.md)
- [发布与证据维护](docs/releasing.md)
- [测试入口](tests/README.md)
- [设计来源台账](docs/design-references.md)

项目通过一个 `planweft` npm 包分发。发布附件、准确归档摘要和验收记录见 [v0.4.0 GitHub Release](https://github.com/psiQAQ/planweft/releases/tag/v0.4.0)。
