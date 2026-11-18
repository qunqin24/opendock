<!-- 职责：使用者的安装、团队用法、按 Agent 模型配置、迁移与疑难解答；不写：内部实现、发版流程、完整设计契约。 -->

# opencode-team

给 OpenCode V2 提供零配置的多 Agent 团队：Orchestrator、QA、Reviewer 开箱即用，
并可按 Agent 单独指定子代理模型与变体。可选择当前目录可用的任意聊天模型，不依赖供应商插件。

## 安装

```bash
opencode plugin add @justsilver/opencode-team
```

预发布版用 `@justsilver/opencode-team@next`。

安装后**完全退出并重新启动** OpenCode，server 与 TUI 入口都在启动时加载。
也可以从本地源码目录加载：在 `plugins` 里给插件目录的绝对路径，
例如 `{ "package": "<仓库>/plugin/opencode-team" }`。两种方式同一个插件 ID，不要同时启用。

## 团队 Agent

安装后自动获得：

- `Orchestrator`（主代理）：按需调度、协调子代理并完成最终交付；可以直接执行任务。
  它不会自动变成默认主代理，用 OpenCode 的 Agent 切换选择它，或在配置中设置
  `default_agent: "orchestrator"`。
- `QA`（子代理）：独立设计、编写及执行验收测试并报告证据；不迎合实现修改验收标准；
  修改生产代码需明确授权。
- `Reviewer`（子代理）：默认只审查和报告；可做针对性验证但不替代 QA 验收；
  修改生产代码需明确授权。
- 继续复用内置 `general`、`explore`；不重复实现已有能力，也不修改它们的权限。

插件给 QA / Reviewer 注入 `question * deny` 与 `subagent * deny`，让它们成为不向用户提问、也不再派生下级子代理的叶子子代理：

- Orchestrator 不追加权限规则。
- QA / Reviewer 除 `question`、`subagent` 外，其余权限继承 OpenCode 默认与用户配置。
- General、Explore 保持内置定义，插件不修改。
- 职责边界由 System Prompt 约束：
  - Orchestrator 优先编排，简单任务可直接执行，协调并发写入与共享文件冲突，
    整合子代理结论并对最终交付负责。
  - QA 独立设计、编写及执行验收测试，不迎合实现修改验收标准；生产代码修复交由实现代理，
    自身修复后不得自验。
  - Reviewer 默认只审查和报告；可做针对性验证但不替代 QA 的独立验收；
    确需直接修复时，明确区分审查结果与后续修改。
- 这不是权限沙箱；需要硬限制时请在 `opencode.json` 配置对应 Agent 权限。
- 项目/全局 Agent 配置在插件之后合并，可以收紧或放开权限。

详细职责、合并顺序与客观验证要求见[团队 Agent](docs/team-agents.md#system-prompt-职责)。

## Agent Team Dashboard

在输入框输入 `/`，选择 `/team`，或在命令面板搜索「Agent 团队与模型」。

- 左侧列出团队 Agent：Orchestrator、General、Explore、QA、Reviewer，以及自定义子代理；
  每行显示状态（原生 / 继承 / 自定义），自定义模型额外显示当前模型。
- 右侧显示角色说明、当前模型、权限摘要和只读 System Prompt；提示词直接完整展示。
- 顶部搜索框常驻并默认聚焦，直接输入即过滤；方向键选择，`Enter` 打开模型配置，
  `Ctrl+R` 清除团队覆盖，`ESC` 返回或关闭。
- 模型配置在同一视图内按 Provider 分组展示模型，搜索框默认聚焦、直接输入即过滤；
  `←`/`→` 与 `Tab` 区域切换、Variant；有 Variant 时先按 `Enter` 选择思考等级，再按 `Enter`
  保存；保存后停留在配置页，取消不修改已有配置；
  `Ctrl+R` 恢复原生/清除团队覆盖。
- 保存结果、错误和恢复确认都在当前面板内显示，不再弹出可能被遮挡的宿主 Toast。
- 窄终端会自动切换为列表/详情或模型/Variant 单栏，低高度使用紧凑行。

模型规则：

- 设置按 Agent ID 精确匹配；未配置的 Agent 继续使用 OpenCode 原生选择。
- 主代理（包括 Orchestrator）的模型始终由 OpenCode 会话选择，面板只读展示。
- 在模型配置中按 `Ctrl+R` 会删除团队覆盖；如果该 Agent 在 `opencode.json` 配置了模型，
  则回到该 Agent 配置。
- 设置在同一 OpenCode 服务端数据库下全局共享，重启后保留；保存后对后续调用生效。
- 命中策略时，无论调用方是否显式指定其他模型，启动与续接调用都会被覆盖。
- 模型不可用或存储读取失败时明确报错，不静默回退。
- 子代理启动确认末尾附本次模型标记；格式与边界见[策略契约](docs/team-policy.md#主代理知情边界)。

System Prompt 与权限：

- 提示词来自宿主当前生效的 Agent 定义，只读；General 等没有独立 System Prompt 的 Agent
  会明确显示“宿主未提供”，插件不会生成或补全内容。
- 权限摘要按宿主合并后的规则计算，只是效果摘要，不代表权限沙箱；需要硬限制时请在
  `opencode.json` 配置对应 Agent 权限。

当前版本不提供 Agent 创建、删除、重命名或 Prompt 编辑。

## 从旧版插件迁移

旧包为 `@justsilver/opencode-subagent-model`，使用独立的存储命名空间与全局模型策略。
新插件无法直接读取旧命名空间，因此需要旧插件仍在加载时完成交接：

1. 保留旧包配置，先安装 `@justsilver/opencode-team` 并完全重启 OpenCode。
2. 打开一次 `/team`。若检测到旧插件，会提示冲突与迁移结果；若提示迁移失败，确认旧插件已加载后重新打开一次。
3. 旧全局模型会导入到当前 location 中所有非主代理 Agent（含自定义子代理）；旧设置为空时只记录迁移结果。
   其他项目独有的自定义 Agent 不在当前列表中，需要在那个项目打开 `/team` 重新选择。
4. 移除旧包配置，完全重启 OpenCode。
5. 打开 `/team` 调整个别 Agent 的模型或恢复原生选择。

如果先移除了旧包再启动新插件，旧值仍在旧命名空间中，但官方插件 API 无法跨命名空间读取；
本插件不会直接访问数据库。此时直接在 `/team` 重新选择即可。

旧 npm 包已在 registry 标记 deprecated：`@justsilver/opencode-subagent-model` 的全部版本安装时
都会提示迁移到 `@justsilver/opencode-team`。旧包保留可安装、不撤包，已经锁定旧版本的项目仍可重装。

## 疑难解答

| 现象 | 处理 |
|---|---|
| 找不到 `/team` | 确认插件已加载，且安装后完全重启过 OpenCode |
| 提示旧插件冲突 | 按迁移步骤先打开 `/team` 完成导入，再移除旧包并重启 |
| 提示团队 Agent 注册失败 | 按面板中的具体错误排查；旧宿主可升级 OpenCode。已存在的子代理仍可配置模型 |
| 提示功能不可用 | 当前宿主缺少工具钩子，或钩子注册失败；不会假装保存成功 |
| 当前模型不可用 | 切到可用模型或恢复原生选择；不会静默换成其他模型 |
| 命令重复或覆盖冲突 | 检查是否同时启用了旧包、本地目录和 npm 两份 |

开发与发布见 [CONTRIBUTING.md](CONTRIBUTING.md)，设计契约见[策略](docs/team-policy.md)与
[团队 Agent](docs/team-agents.md)。
