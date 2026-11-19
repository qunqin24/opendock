<!-- 职责：使用者的项目介绍、特性、安装、快速开始与日常使用、迁移、常见问题；不写：Agent 规则、权限与策略实现、故障成因、开发与发版流程。 -->

# opencode-team

给 OpenCode V2 提供零配置的多 Agent 团队：Orchestrator、QA、Reviewer 开箱即用，
并可按 Agent 单独指定子代理模型与变体。可选择当前目录可用的任意聊天模型，不依赖供应商插件。

## 特性

- **零配置团队**：安装即获得 Orchestrator 主代理与 QA、Reviewer 子代理，复用内置 `general`、`explore`。
- **按 Agent 覆盖模型**：只影响指定的子代理，其余 Agent 继续使用 OpenCode 原生选择。
- **可视化管理**：`/team` 面板查看角色、模型来源与完整 System Prompt，并直接改模型与变体；
  宽终端双栏、窄终端单栏，列表紧凑展示配置来源与模型。
- **随时可逆**：清除团队覆盖后回到 Agent 配置或 OpenCode 原生选择。
- **失败可见**：模型不可用或读取失败都明确报错，不静默回退。

## 安装

```bash
opencode plugin add @justsilver/opencode-team
```

预发布版用 `@justsilver/opencode-team@next`。安装后**完全退出并重新启动** OpenCode。

也可以从本地源码目录加载：在 `plugins` 里写插件目录的绝对路径，例如
`{ "package": "<仓库>/plugin/opencode-team" }`；两种方式同一个插件 ID，不要同时启用。

## 快速开始

1. 安装并完全重启 OpenCode。
2. 输入 `/` 选择 `/team`，或在命令面板搜索「Agent 团队与模型」。
3. 用方向键选一个子代理（如 QA），按 `Enter` 打开模型配置。
4. 选择模型；如果该模型有变体，先按 `Enter` 选思考等级，再按 `Enter` 保存。单栏布局下第一次
   `Enter` 先打开右侧详情，再按 `Enter` 保存。
5. 之后 Orchestrator 派发子代理时，被配置的 Agent 会自动使用团队模型。

## 团队 Agent

| Agent | 类型 | 职责 |
|---|---|---|
| `Orchestrator` | 主代理 | 优先编排，简单任务可直接执行，协调子代理并完成最终交付 |
| `QA` | 子代理 | 独立设计、编写并执行验收测试；不迎合实现修改验收标准 |
| `Reviewer` | 子代理 | 默认只审查和报告；必要时做针对性验证，不替代 QA 验收 |
| `General` | 内置子代理 | 通用多步任务，由 Orchestrator 复用 |
| `Explore` | 内置子代理 | 代码库探索 |

Orchestrator 不会自动成为默认主代理；用 OpenCode 的 Agent 切换选择它，或设置
`default_agent: "orchestrator"`。QA 与 Reviewer 是叶子子代理，不能提问也不能再派发子代理；
其余权限继承 OpenCode 默认值与你的配置，需要硬限制时请配置对应 Agent 权限。

角色职责与提示词边界见[团队 Agent](docs/team-agents.md)。

## 团队面板

- 搜索框常驻聚焦，直接输入即过滤；方向键选择，`Enter` 打开模型配置，`Ctrl+R` 清除团队覆盖，
  `ESC` 返回或关闭。
- 模型配置按 Provider 分组，`←`/`→` 与 `Tab` 切换区域和变体，`Enter` 保存，`Ctrl+R` 恢复原生。
- 模型列表按 `Ctrl+F` 收藏当前模型，收藏项置顶显示；收藏全局共享，与 `/models` 的收藏互相独立。
- 面板顶部「默认代理」设置行选中后按 `空格` 切换：开启后新会话默认使用 Orchestrator；
  用户配置的 `default_agent` 仍优先。
- 模型设置全局共享、重启保留；主代理模型只读，由 OpenCode 会话选择。
- 窄终端自动切换为单栏布局。

界面细节与键盘契约见 [TUI Dashboard](docs/team-tui.md)。

## 从旧版插件迁移

旧包 `@justsilver/opencode-subagent-model` 使用独立存储命名空间，需要旧插件仍在加载时完成交接：

1. 保留旧包配置，安装 `@justsilver/opencode-team` 并完全重启。
2. 打开一次 `/team`，按提示完成旧全局模型导入；失败时确认旧插件已加载后重试。
3. 移除旧包配置，完全重启。
4. 打开 `/team` 按需调整模型或恢复原生选择。

旧包全部版本已在 npm 标记 deprecated，安装时会提示迁移；旧包保留可安装、不撤包。

## 常见问题

| 现象 | 处理 |
|---|---|
| 找不到 `/team` | 确认插件已加载，且安装后完全重启过 OpenCode |
| 提示旧插件冲突 | 先按迁移步骤打开 `/team` 完成导入，再移除旧包并重启 |
| 提示团队 Agent 注册失败 | 按面板中的具体错误排查；旧宿主可升级 OpenCode |
| 提示功能不可用 | 当前宿主缺少工具钩子，或钩子注册失败；不会假装保存成功 |
| 命令或配置重复 | 检查是否同时启用了旧包、本地目录和 npm 两份 |

开发与发布见 [CONTRIBUTING.md](CONTRIBUTING.md)，设计契约见[策略](docs/team-policy.md)与
[团队 Agent](docs/team-agents.md)。
