# opencode-oceanus

opencode-oceanus 是面向 OpenCode **v2（2.0 正式版）** 的 AI 编码编排插件。它将 Oceanus 编排器、Sisyphus 六阶段工作流和一组职责清晰的专家 agent 集成到 OpenCode 中，帮助开发者把复杂任务拆解为可研究、可计划、可执行、可审查的工程流程。

Oceanus 不只是增加一个聊天 Agent：它提供从代码侦察、外部资料研究、方案分析，到视觉设计、批量机械修改和最终 Review 的协作分工，并配套 AST 工具、剪贴板图片处理、CBM 代码知识库、运行时保护 Hook、模型 preset 和 TUI sidebar。插件默认强调最小权限、只读调研与 fail-open 降级，让 AI 编码更适合真实项目协作。

> **适合谁**：希望在 OpenCode 中获得结构化任务编排、专家分工和工程安全保护的个人开发者与团队。

> **重要说明**：Sisyphus 六阶段流程和 Oracle 审查属于 prompt / skill 层约定，不是运行时自动 supervisor；实际能力仍取决于 OpenCode v2 宿主及所配置的模型。

## 快速开始

```bash
# 1. 前置：OpenCode 2.0+（@opencode/cli ≥ 2.0.10）
npm install -g @opencode/cli
```

在项目根目录的 `opencode.jsonc`（全局则用 `~/.config/opencode/opencode.jsonc`）中启用插件：

```json
{
  "plugins": ["opencode-oceanus"]
}
```

启动 `opencode`，agent 列表出现 `oceanus` / `sisyphus` 等即安装成功；TUI 侧边栏会显示 Oceanus 面板。

- 完整分步安装（含本地源码构建、插件目录复制、验证清单与故障排查）：见 [`docs/installation.md`](docs/installation.md)。
- **让 AI 助手自动安装**：把 [`docs/installation.md`](docs/installation.md) 提供给你的 AI 编码助手（OpenCode / Claude Code / Cursor 等），文档内置「LLM 自动安装协议」，可被直接解析执行。

## 兼容性

- 需要 **OpenCode 2.0+**（`@opencode/cli` ≥ 2.0.10，安装：`npm install -g @opencode/cli`）
- 依赖 `@opencode/plugin@2.0.10` + `@opencode/schema@2.0.10`（精确锁定；2.0 起包族已迁 `@opencode/*` 新 scope，旧 `@opencode-ai/*` 无 2.x 版本。已核实至 `opencode v2.0.18` 宿主：四版 tarball 全量 diff + 编译实证 + 隔离 serve（`dist` 目录，server+tui）+ 会话内实测插件 active，零适配项——详见 `docs/opencode-v2-compatibility.md`）
- 入口为 v2 的 `Plugin.define({ id, setup })`，通过 `ctx.agent.transform` 注册 agent
- beta-18743 API 面在 2.0.3 宿主实测零回归（注册链路 + MCP connected）；详见 [`docs/opencode-v2-compatibility.md`](docs/opencode-v2-compatibility.md)

## Agent 列表

| Agent | 角色 | mode |
|-------|------|------|
| `oceanus` | AI 编码编排器（颜色 `#0FFFFF`） | primary |
| `sisyphus` | 六阶段工作流主导（intake → discuss → plan → execute → review → finish） | primary |
| `prometheus` | 方案研究与规划（先研究后规划，产物回复内交付、不落盘，全部自查、不委派 subagent） | primary |
| `explorer` | 快速代码库检索 | subagent |
| `librarian` | 外部文档 / 库研究 | subagent |
| `oracle` | 正式 Review 审查者（graded：PASS/WARN/FAIL）＋架构/调试顾问（consult）与方案分析（analysis） | subagent |
| `designer` | 视觉设计迭代（样式 / 布局 / 动效开发与润色） | subagent |
| `fixer` | 逃生舱执行（大批量并行机械实现，需满足逃生舱三条件） | subagent |
| `observer` | 视觉 / 多媒体分析（**默认启用**，需要视觉模型） | subagent |

`explorer`、`librarian`、`oracle` **只读**，不写任何文件、不委派、不执行 task（调研结果在回复中以七字段结构返回，不落盘）；`observer` 默认启用（需要视觉模型；无视觉模型时可经 `disabled_agents` 显式禁用）。`prometheus` 是受限主 agent：用户直接切换开启研究/规划会话，产出喂给执行的研究结论与可执行方案；与 `oceanus`/`sisyphus`/`oracle` 同属 preset 主力档（内置厂商 blueprint 会为其分配主力模型；未配置 preset 时跟随会话模型，可用 `agents.prometheus.model` 单独指定）。

### Oracle：正式 Review 审查与按需顾问

Oracle 承担两类职责（均为 prompt/skill 层约定）：

1. **正式 Review 审查（graded）**：Execute 完成后，Sisyphus 必须以完整 Oracle Brief 将正式审查委派 `@oracle`，并按双信号路由审查强度（docs-only diff → `diff-review` 轻量；trivial → `review` scoped 维度映射；standard/architecture → `review` 9 维全量）。Oracle 只读输出 PASS/WARN/FAIL；BLOCKER 按「Review 循环执行」配置回退 Execute 修复；Sisyphus 负责证据核验与阶段推进。
2. **按需顾问（consult/analysis，advisory）**：复杂架构或高风险业务场景中，针对已落盘 spec/plan 提供咨询；该 advisory 不构成执行门禁，最终决策由 Sisyphus / orchestrator 负责。

> **重要**：这是 prompt/skill 层约定，**不是**插件注册的自动运行时 supervisor；插件不会在运行时自动拦截执行路径。Oracle 的正式审查 verdict 同样由 Sisyphus 核验后消费。

### 默认只读权限

`explorer`、`librarian`、`oracle`、`observer` 在无显式 `agents.<name>.permission` 时，集中应用默认只读 v2 permission：allow `read`/`glob`/`grep`/`list`/`lsp`/`codesearch`/`webfetch`/`websearch`/`ast_grep_search` 与查询型 `cbm_*` 工具；`bash`（宿主 shell 工具的权限键，与实际运行 bash/PowerShell/cmd 无关；另保留 `shell` 键兼容双写）为对象形式规则——默认放行检查类命令，按模式拒绝跨 shell 写动词（POSIX `rm`/`mv`/`cp`、cmd `del`/`move`/`copy`、PowerShell `Remove-Item`/`Set-Content`/`Out-File` 等）、git 写操作、包管理器安装与各 shell 重定向写模式；deny `edit`/`write`/`apply_patch`/`ast_grep_replace`/`task`/`subagent`/`todowrite`/`clipboard_image`/`cbm_index`/`oceanus_config_generate`。显式 `agents.<name>.permission` 始终覆盖该默认值。

`prometheus` 的受限权限由该只读表 spread 派生，差异仅两键：`question: allow`（主 agent 直接面对用户）、`skill: deny`（规划流程内联于 system prompt）；`task`/`subagent` 沿用只读表整体 deny（宿主 task 工具按裸 agent 名评估权限，前缀式资源级白名单永不匹配，已实测移除）。注意：显式 `agents.prometheus.permission` 会**整体替换**该表（非合并），调整请提供完整表。

### CBM 调度约定

CBM 沿六阶段工作流形成三阶段主线。**Intake 首次初始化**：在任何代码调研开始之前基于请求预判代码相关性并立即触发首次 `cbm_index`（唯一索引入口，项目名自动取 workspace 目录名；预判非代码不触发），正式分类后修正偏差（漏判补触发、误判记录不回滚），失败、超时或 in-progress 均 fail-open 并记录；同会话重复触发由运行时拦截（hook guard + 工具级冷却）；discuss/Plan 不重复首次初始化。**Plan 自查**：Plan 根据 spec 自查修改文件、公共符号、依赖和验证方式；复杂架构或高风险业务仍有关键未知时，Sisyphus 可按需咨询 Oracle advisory。**Review 影响面复查**：按最终 diff 需要时用 `cbm_index` 刷新，再用 direct `trace_path`/`detect_changes` 排查并记录证据（wrapper 兜底）；CBM 不可用时记录 `cbm: stale`、降级工具、覆盖范围和残余风险。查询型工具可由需要的 agent 使用，finish 阶段不调用 CBM。详见 `docs/codebase-memory-mcp.md`。

## 安装

> 完整分步安装、LLM 自动安装协议、验证清单与故障排查见 [`docs/installation.md`](docs/installation.md)；本节聚焦各加载方式的细节与差异。

opencode v2 有两种加载插件的方式。注意配置字段是 **`plugins`（复数）**，v1 的 `plugin`（单数）已废弃。

### 方式 1：放入插件目录（仅 CLI 入口，本地使用）

构建后把产物放入插件目录，启动时自动加载：

```bash
bun install
bun run build
```

将 `dist/index.js` 复制到以下任一目录：

- 项目级：`.opencode/plugins/opencode-oceanus.js`
- 全局：`~/.config/opencode/plugins/opencode-oceanus.js`

`.opencode/plugins/`（v2 规范，复数）目录下的文件在启动时自动加载。

> **限制**：单文件形式没有包结构（无 `exports["./tui"]` 声明），宿主只能发现 CLI 入口，**TUI sidebar 不会加载**；该自动加载形式也未纳入本仓库的宿主验证台账（台账实测的是方式 2 的 `dist` 目录形式）。需要 TUI sidebar 或已验证路径时请使用方式 2。

### 方式 2：`plugins` 数组（opencode.jsonc，推荐）

在 `opencode.jsonc`（或 `~/.config/opencode/opencode.jsonc`）的 `plugins` 数组加入：

**本地路径引用构建产物：**

```json
{
  "plugins": ["./opencode-oceanus/dist"]
}
```

**绝对路径：**

```json
{
  "plugins": ["/path/to/opencode-oceanus/dist"]
}
```

> **注意**：OpenCode 宿主的 `plugins` 数组中的本地路径必须是**目录**（目录内需有 `index.js` 入口文件），不接受 `dist/index.js` 这类单文件路径——指向文件会被整体跳过（beta-18721 与 **2.0.3 双版本实测**：单文件配置下 agents 列表为空）。项目配置文件在 2.0.3 实测需使用 `opencode.jsonc` 扩展名（`.json` 未被识别）。

**发布到 npm 后使用包名：**

```json
{
  "plugins": ["opencode-oceanus"]
}
```

**对象形式（携带插件 options）：**

```json
{
  "plugins": [{ "package": "opencode-oceanus", "options": {} }]
}
```

> 本地文件 / 未发布 npm 时建议方式 1 或方式 2 的路径引用。构建产物已将 zod 内联，插件自包含，仅依赖运行时提供的 `@opencode/plugin`。

### 自动升级

插件默认在加载后 2 秒后台检查一次 npm 最新稳定版本（每进程一次），跨进程按 `checkIntervalMs`（默认 3 小时）节流，不阻塞插件加载；裸名安装走宿主原生 `plugin.update`（热重载免重启），固定版本与旧宿主回退自管安装。
更新成功后及每个检查周期会自动清理插件自身的历史版本缓存目录（宿主更新产生的旧时间戳目录，每版本约 110MB；仅清理当前 identity 目录内比活跃版本更旧的目录，fail-open），可通过 `cleanup` 关闭：

```jsonc
{
  "autoUpdate": {
    "enabled": false,
    "checkIntervalMs": 10800000,
    "cleanup": true
  }
}
```

同一 major 的 installer-managed 固定版本会在专用缓存中 staging 安装并校验，成功后原子替换，失败保留旧版本；更新后需要重启 OpenCode。`@latest`、`file://`/本地路径、OpenCode-managed sandbox 和 major 版本只记录提示，不会被插件强行覆盖。手工安装可使用 `opencode plugin --force opencode-oceanus@latest`。

插件 npm 版本与 CBM 二进制版本解耦。CBM 仍由内置 SHA-256 manifest 驱动的 `provision` 流程安装和升级，不信任网络返回的哈希。

### TUI sidebar 配置

CLI 插件和 TUI 插件使用**同一个包名/目录**。主入口 `opencode-oceanus` 负责注册 agents、skills 和 commands；该包通过 `./tui` 导出 TUI 入口，宿主自动发现双入口（2.0.3 实测：`plugins` 指向 `dist` 目录时 `Plugin.Info.features = { server: true, tui: true }`）。

在 `opencode.jsonc` 中配置插件即可同时加载两个入口：

```json
{
  "plugins": ["opencode-oceanus"]
}
```

本地开发同样只需指向 `dist` 目录（宿主在目录内解析 `index.js` 入口并自动发现 TUI 入口，不要指向单文件——单文件路径宿主会整体跳过）：

```json
{
  "plugins": ["/path/to/opencode-oceanus/dist"]
}
```

> CLI-only / TUI-only 插件的单独配置文件为 `cli.json`（官方 V2 文档口径，连接远程 server 时仍生效）；本插件为双入口形态，`plugins` 数组一项即可，无需单独配置。

sidebar 显示 Oceanus 标题、当前会话 agent，以及已注册 Oceanus agents 的模型信息。
agent 未配置专用模型时显示“跟随会话”；如果模型包含 variant，也会一并显示。
`observer` 默认启用（该 agent 需要视觉模型），如需禁用，在配置中设置
`"disabled_agents": ["observer"]`。

### 内置 skill

插件在启动时通过 `ctx.skill.transform` 注入 Oceanus 配置、六个阶段和支持型 Skill，**安装插件即可使用，无需拷贝任何 skill 文件**：

| Skill | 作用 |
|-------|------|
| `opencode-oceanus` | 说明 Oceanus 配置、preset 优先级、v2 限制及 `/preset` 命令 |
| Agent 常驻调度协议 | agent 路由、OpenCode v2 `subagent` child session、委派边界与并行规则，内置于 Oceanus/Sisyphus system prompt |
| `oceanus-debugging` | 根因调查、单一假设验证和三轮失败升级 |
| `clipboard-image-observer` | 图片/PDF 路径处理、L1-L5 分级与 observer 视觉验收流程 |
| `agent-browser` | agent-browser 浏览器能力统一协议（双模式）：**通用浏览器操作**——导航等待/快照/交互/诊断/取证，任何 agent 按需使用，无需执行配置；**浏览器验证**——渲染截图、视觉 diff、token 核对与交互断言，仅 browser_verify 执行配置开启的前端任务生效。含能力探测、安装引导、会话生命周期与 fail-open 降级 |
| `oceanus-discuss` | 读取 Intake 已确认的执行配置、研究优先澄清需求、提出 2-3 个真实可行候选方案（Trivial 也至少列出被考虑但不推荐的替代方案）、再以方案总批准单问完成方向批准；SDD 开启时保存设计 spec 到 `.oceanus/spec/` |
| `oceanus-plan` | 映射文件、按规模适配任务、保存实现计划到 `.oceanus/plan/`、依据 spec 自查影响面，并消费 Intake 的 SDD/TDD/Review 循环执行决策（不重复提问） |
| `oceanus-intake` | 由 Sisyphus 直接完成背景、最小需求 intake、代码项目技术环境调研（优先说明文档，按需读构建配置确定框架/运行时/验证命令）、任务分类、SDD/TDD/Review 循环执行三项加前端任务第四项 browser_verify 的执行配置批问（含 frontend_scope 前端范围判定）与先于代码调研的 CBM 首次初始化（预判触发 + 分类修正） |
| `oceanus-execute` | 按计划实现；默认主 agent 执行，只有三条件同时满足时才并行 fixer，并同步 todo 状态 |
| `oceanus-review` | Execute 后的正式分级审查：Sisyphus 收集证据并运行基础验证，以完整 Oracle Brief 委派 @oracle（docs-only 轻量 / trivial 维度映射 / 其余全量），核验结论并处置 BLOCKER |
| `oceanus-finish` | 只读收口：按 Review（accepted）/ Completion Matrix（green）/ ledger（complete）/ evidence（fresh）四条同时满足判定交付；不测试、不构建、不调用 CBM、不委派、不修改文件 |

`sisyphus` agent 会按阶段自动加载对应 skill。

OpenCode v2 的官方模型是：主 agent 通过 `subagent` 工具启动 child session；agent 是否可作为 subagent 由 `mode` 和权限决定，后台执行由调用层的 `background` 控制。本项目在 prompt 中统一采用结构化约定 `subagent({ agent, description, prompt, background })`，这是 Oceanus 的编排约定，不是额外的宿主 API。

Agent 负责路由、委派和阶段推进；Skill 负责阶段契约、输入/输出与禁止事项，不能替代运行时权限或 supervisor。Ledger 记录进度而非宿主事实；Review 报告记录证据和结论，Finish 只能只读该报告。

### Sisyphus 六阶段工作流

`sisyphus` 执行六阶段工作流（`intake → discuss → plan → execute → review → finish`），各阶段职责与产物如下：

| 阶段 | 职责 | 产物 / 落点 |
|------|------|-------------|
| **Intake** | `Sisyphus 直接了解背景、完成最小需求 intake、技术环境调研（代码项目：优先说明文档，按需读构建配置）、分类任务，并在代码调研开始前预判触发 CBM 首次初始化（分类后修正偏差）；不做方案决策 | Intake 结构化摘要 |
| **discuss** | Sisyphus 消费 Intake 已确认的执行配置，负责研究、澄清与方案决策；复杂架构或高风险业务取舍可按需委派 `@oracle`（analysis）提供 advisory；澄清完成后以方案总批准单问完成方向批准 | `.oceanus/spec/` |
| **Plan** | Sisyphus 负责拆分任务、依据 spec 自查依赖/范围/验证并维护进度台账；复杂架构或高风险业务可按需咨询 Oracle advisory | `.oceanus/plan/` + 批准记录 |
| **Execute** | 主 agent 按计划顺序直接执行（读代码/编辑/测试），上下文缺口委派 `@explorer` 补侦察；批量机械任务满足逃生舱三条件（文件集完全不相交 + 机械同构 + 任务数 ≥3）时并行 `@fixer`；视觉迭代任务 `@designer`；需求变化回 discuss，结构变化回 Plan | 代码变更 + 更新后的计划 |
| **Review** | Sisyphus 收集证据、运行基础验证并将正式审查委派 `@oracle`（双信号分级路由）；CBM 可按最终 diff 刷新索引但 fail-open | 审查报告 |
| **Finish** | Sisyphus 只读 Review 报告并收口，不测试、不构建、不调用 CBM、不委派、不修改文件 | 交付总结 |

要点：该工作流是 **prompt / skill 层面的约束**，由 `sisyphus` 的提示词与 `sisyphus-*` skill 约定强制执行，**不是**运行时自动 supervisor——插件不会在运行时自动拦截或强制各阶段。禁用相关 Agent 时不得伪造阶段性结果，应如实说明能力缺失。

## 新增工具与运行时保护

插件通过 `ctx.tool.transform` / `ctx.tool.hook` 注册一组原生 v2 工具与运行时保护 Hook，**默认全部启用**，可分别用 `disabled_tools`、`disabled_hooks` 或单项 `enabled: false` 关闭。具体设计见 [`docs/tooling-and-runtime.md`](docs/tooling-and-runtime.md)。

### 内置工具

| 工具 | 作用 | 说明 |
|------|------|------|
| `ast_grep_search` | 按 AST 语法模式搜索 | 只读；支持 `$VAR` / `$$$` 元变量、语言、路径、glob、上下文；受匹配数与输出字节上限、超时保护 |
| `ast_grep_replace` | 按 AST 语法模式替换 | **默认 dry-run**（只预览不改写）；显式 `dryRun: false` 才真正写入；只改写工作区内的文件 |
| `clipboard_image` | 读取剪贴板图片并保存为文件 | 优先 PNG，返回绝对路径；用于把用户粘贴/截图的图片交给 @observer 做视觉分析 |
| `oceanus_config_generate` | 把内置厂商 blueprint 生成（或覆盖）为用户级 preset | `/oceanus-config` 对话流程的确定性写入端 |
| `cbm_*` 系列（7 个） | CBM 代码知识库包装工具：`cbm_index`（索引触发）、`cbm_search_graph`（符号定位）、`cbm_trace`（调用链）、`cbm_code`（符号源码）、`cbm_query`（只读 Cypher）、`cbm_detect_changes`（影响面）、`cbm_status`（索引状态） | codebase-memory-mcp direct MCP 工具的兜底通道，受配置门控，与 direct 工具参数名不混用；详见 [`docs/codebase-memory-mcp.md`](docs/codebase-memory-mcp.md) |

### 内置 Hook

Hook 通过 `execute.before` / `execute.after` 注册，每个 Hook 独立容错，单个失败不阻断插件启动。固定执行顺序：`before: apply-patch → tool-loop-guard → secret-read-guard → planning-write-guard → direct-mcp-write-guard → cbm-index-repeat-guard → cbm-guidance`；`after: json-error-recovery → tool-output-truncator → tool-loop-guard → cbm-guidance`（`image_materializer` / `image_error_hint` 为 session hook，独立注册）。

| Hook | 位置 | 作用 | 失败边界 |
|------|------|------|----------|
| `apply_patch` | `before` | 校验并保守规范化 `apply_patch` 输入（解析 Codex 风格 patch、路径边界、无损重写） | 工作区外路径、只读输入 **`fail-open`**（交由宿主处理）；输入/校验/内部异常 **`fail-closed`**（抛错阻断执行） |
| `json_error_recovery` | after | 修正工具返回的错误 JSON 参数，避免错误被当作结果吞掉 | **fail-open**：恢复失败不阻断已完成结果 |
| `tool_output_truncator` | after | 截断超长工具输出，避免破坏上下文 | **fail-open**，保留错误、状态、diff 与 hash mismatch 等控制信息 |
| `tool_loop_guard` | before+after | 检测会话内重复工具调用，达到 `warnAt` 提示、`blockAt` 熔断 | **fail-open** |
| `secret_read_guard` | before | 阻断 `.env` / `.secrets` 等敏感文件内容进入对话 | 命中即**阻断**（fail-closed on match） |
| `planning_write_guard` | before | 阻断对 `.oceanus` 产出文档的灾难性缩减覆盖 | 命中即**阻断** |
| direct MCP 写入保护 / `cbm-index-repeat-guard` | before | 拒绝写入型 codebase-memory-mcp 工具；索引冷却窗内拒绝重复触发 | **fail-closed** |
| `cbm_guidance` | before+after | 结构化查询前的索引健康提示与重复 grep/read 的 CBM 建议提示 | **fail-open**：CBM 不可用时标记不确定性并继续 |
| `image_materializer` / `image_error_hint` | session prompt/retry | 粘贴图片物化到 `.oceanus/media/` 并追加路径提示；图片错误注入引导 | **fail-open**，两 hook 相互独立 |

### AST CLI 安装与诊断

`ast_grep_search` / `ast_grep_replace` 需要真实 ast-grep CLI。插件不自动下载二进制；解析顺序为：`AST_GREP_BIN` 环境变量 → 缓存目录 → `@ast-grep/cli` 包 → 平台专属包 → PATH 上的 `ast-grep` / `sg`。

每个候选在接受前都会执行短超时 `--version` 验证并确认输出包含 `ast-grep`，从而拒绝同名但非 ast-grep 的程序（如 Linux 上作为 `newgrp` 别名的 `sg`）。当前 AST 写盘工具由自身工具入口和工作区边界保护，不复制宿主 `edit` 的 ask/deny 状态机。安装方式：

```bash
bun add -D @ast-grep/cli   # 或 cargo install ast-grep、brew install ast-grep
```

或设置 `AST_GREP_BIN` 指向已有二进制（Windows 上的缓存目录为 `%LOCALAPPDATA%\opencode-oceanus\ast-grep\bin\ast-grep.exe`）：

```bash
export AST_GREP_BIN=/path/to/ast-grep          # bash / zsh
$env:AST_GREP_BIN = "C:\path\to\ast-grep.exe"  # PowerShell
set AST_GREP_BIN=C:\path\to\ast-grep.exe       # cmd.exe
```

环境中没有真正可用的 ast-grep 时，工具会返回诊断信息；测试（`src/smoke/` 下的集成用例与 `src/smoke/ast-grep-probe.ts`）也会**明确 skip 真实 CLI 集成并输出诊断**，而不是把环境缺失误报为产品失败。真实 OpenCode v2 host 能力（`session.active` / `interrupt` 等）只在 opencode 会话内执行插件时验证；当前插件类型未暴露 `session.active`（2.0.3 亦未暴露），运行时会探测并诚实降级，当前 bun test 环境无真实 host 时相关 smoke 会 skip，仅用 mock ctx 验证注册契约，不声称真实 host 已通过。


## 配置

### codebase-memory-mcp（CBM）

插件内置 CBM 集成，详细的下载、缓存、权限、故障回退及 agent 调度说明见
[`docs/codebase-memory-mcp.md`](docs/codebase-memory-mcp.md)。默认启用 CLI/MCP 与查询前自动索引，Web UI 则按需启动（默认不自动启动）。

CBM 缓存根优先级为 `codebaseMemory.cacheDir` → 外部 `CBM_CACHE_DIR` → 平台默认；插件 `setup` 后固定本次实例的缓存根快照。该目录是二进制安装缓存，不是 daemon 的索引/数据目录。安装会校验 `current.json`、版本与平台、二进制文件及 `--version`；已有使用不同 cache root 的 daemon 不会被自动接管，需先关闭旧会话并按目标缓存根重启。

### agent-browser 浏览器验证（browser_verify）

前端渲染验证与通用浏览器操作能力：经 [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) CLI 提供**双模式**协议——通用浏览器操作（导航/快照/交互/诊断/实验，任何 agent 按需使用、无需执行配置）与浏览器验证（渲染截图、视觉 diff、token 核对与交互断言）。能力级配置 `agentBrowser`（`enabled` 默认 `true`、`autoInstall` 默认 `false`、`version`/`binaryPath`）；验证模式由 Intake 执行配置批问第四项 `browser_verify` 决定——仅前端 UI/交互实现任务（`frontend_scope ≠ none`）出现，默认推荐关闭，关闭时验证语义与无此能力完全一致（通用操作不受影响）。运行协议见 `agent-browser` skill。安装、配置字段、降级口径与 `src/browser/` 模块说明详见 [`docs/agent-browser.md`](docs/agent-browser.md)。

每个 agent 的模型等可通过独立 jsonc 配置文件定制：

- 用户级：`~/.config/opencode/opencode-oceanus.jsonc`
- 项目级：`.opencode/opencode-oceanus.jsonc`（用于补充/覆盖 `presets`、`agents` 等定义，与用户级合并）

```jsonc
{
  // 当前使用的 preset；名称必须存在于 presets 中
  "preset": "balanced",
  "presets": {
    "balanced": {
      "explorer": {
        "model": "ollama-cloud/deepseek-v4-flash",
        "temperature": 0.2
      },
      "oracle": {
        "model": [
          "openai/gpt-5.6-luna",
          { "id": "openai/gpt-5.6-luna", "variant": "reasoning" }
        ],
        "options": { "effort": "medium" }
      }
    },
    "fast": {
      "explorer": { "model": "openai/gpt-5.6-luna#fast" },
      "fixer": { "temperature": 0.2 }
    }
  },
  "agents": {
    // 显式 agents 优先于当前 preset；此处只覆盖需要例外的字段
    "oceanus":  { "model": "openai/gpt-5.6-luna" },
    "explorer": { "temperature": 0.4 },
    "designer": { "color": "#FFB3BA" }
  },
  "disabled_agents": [],
  "disabled_hooks": [],
  "tools": {
    "ast_grep_replace": { "enabled": true, "dryRun": true },
  },
  "hooks": {
    "tool_output_truncator": { "enabled": true, "maxOutputBytes": 200000 },
    "tool_loop_guard": { "enabled": true, "warnAt": 3, "blockAt": 5 },
  },
}
```

### 配置字段

顶层字段：

- `preset`：当前预设名称。插件先读取 `presets[preset]`；名称不存在时发出警告，并仅使用显式 `agents`。
- `presets`：预设名到 agent 覆盖对象的映射。每个预设的内容与 `agents` 使用相同字段。
- `agents`：按 agent 名称配置覆盖。它始终覆盖当前 preset 中同名 agent 的同名字段，适合放例外设置。
- `disabled_agents`：禁用的 agent 名称；默认 `[]`（全部 agent 启用；`oceanus` 受保护，不可禁用）。
- `disabled_tools`：禁用的工具名称数组，对工具拥有最终禁用权。
- `disabled_hooks`：禁用的 Hook 名称数组，对 Hook 拥有最终禁用权。
- `orchestratorVision`：主 agent 的图片附件行为：`'auto'`（默认，保留图片附件并物化兜底）、`'true'`（明确按支持视觉处理）、`'false'`（主模型不支持视觉，prompt 阶段移除图片附件）。
- `tools`：按工具名深合并的结构化配置（见上方「新增工具与运行时保护」）。
- `hooks`：按 Hook 名深合并的结构化配置（见上方「新增工具与运行时保护」）。
- 文件编辑使用宿主原生 `edit` / `write` / `apply_patch`（原生 diff 渲染与模型通用心智）。详见 `docs/tooling-and-runtime.md`。

`presets.<name>.<agent>` 或 `agents.<agent>` 支持的完整字段：

- `model`：字符串（如 `provider/model` 或 `provider/model#variant`），或非空数组；数组元素可为模型字符串，也可为 `{ "id": "provider/model", "variant": "name" }`。由于 v2 agent 只接受单个 `ModelRef`，数组仅取第一项；未配置时跟随当前会话模型。
- `temperature`：`0` 至 `2` 的数字，映射到 agent 请求设置。
- `variant`：模型变体字符串；可与模型配置配合使用。
- `prompt`：覆盖 agent 系统提示词。
- `orchestratorPrompt`：覆盖编排器提示词。
- `displayName`：覆盖显示名称。
- `description`：覆盖描述。
- `color`：覆盖显示颜色，例如 `#FFB3BA`。
- `options`：传给 agent 的任意请求选项对象。
- `permission`：工具权限规则；可写单个 `ask`、`allow`、`deny`，或按工具名映射这些动作，也支持工具名的 glob/pattern 映射。
- `skills` / `mcps`：schema 接受字符串数组，但当前 OpenCode v2 的 `Agent.Info` 没有对应的直接字段，因此不会映射到 agent；配置时会输出警告。它们不会替代插件注入的 `sisyphus-*` skills。

### 合并优先级

配置按以下顺序合并（越靠后优先级越高）：

1. 用户级 `~/.config/opencode/opencode-oceanus.jsonc`（也支持 `.json`）；
2. 项目级 `.opencode/opencode-oceanus.jsonc`（也支持 `.json`），项目配置覆盖用户配置；同名 `agents` 和 `presets` 会递归合并；
3. 合并后的 `presets[preset]` 作为基础；
4. 合并后的显式 `agents` 覆盖 preset，同一 agent 的同一字段以显式配置为准。

因此，想固定某项目的 preset 可在项目配置设置顶层 `preset`；注意：项目级顶层 `preset` 会覆盖用户级选择（已知边界——`/preset` 的写入目标是用户级全局配置，若项目配置显式设置了 `preset`，该项目内仍以项目级为准）。

### 工具 / Hook 配置规则

新增工具与 Hook 的启停和参数遵循以下规则：

1. **默认全部启用**：未配置时所有新增工具与 Hook 均启用。
2. **禁用列表优先**：`disabled_tools` / `disabled_hooks` 对对应名称拥有最终禁用权；单项 `enabled: false` 等价于禁用；优先级为 `disabled_*` > `item.enabled` > 默认 `true`。
3. **按名称深合并**：`tools` 与 `hooks` 使用按工具/Hook 名称的深度合并，同一项只覆盖显式提供的字段；项目配置覆盖用户配置，`disabled_tools` / `disabled_hooks` 作为数组整体由项目配置覆盖用户配置。
4. **未知项报错**：未识别的工具名、Hook 名或配置字段会被 schema 拒绝，而不是静默忽略。

### 通过 `/preset` 选择

插件注入的原生 command 中可使用以下 slash 命令：

```text
/preset              # 列出预设并标记当前项
/preset fast         # 直接选择名为 fast 的预设
```

选择成功后会原子更新**用户级** `~/.config/opencode/opencode-oceanus.jsonc`（或 `.json`）的顶层 `preset` 字段（全局生效，所有项目共享），不会改写 `presets` 或 `agents`；没有预设、预设不存在或写入失败时命令会报错。preset 名称校验会合并项目级 `.opencode/` 中的 `presets` 定义。命令同时会**立即生效**：当前会话模型同步切换，agent registry 立即重建，后续 subagent 立即使用新模型；仅正在执行中的 subagent 不受影响。TUI sidebar 由 fs.watch 指纹监听自动刷新（~100ms）。

Sisyphus 执行时还会为每个计划维护任务级进度 ledger：`.oceanus/progress/<plan-name>.md`。ledger 按任务记录 `pending`、`in_progress`、`completed`、`failed` 或 `blocked` 状态、worker/session、验证证据和更新时间。并行 worker 不直接写共享 ledger，由 orchestrator 在派发前及每个任务完成后串行更新。

### `/git-commit`：提交分析建议

```text
/git-commit                  # 分析当前未提交变更并生成 commit 建议
/git-commit 只分析已暂存变更   # 附加补充要求
```

对话式命令：把「扫描变更 → 归类意图（`[需求]`/`[缺陷]`/`[通用]`/`[紧急]`）→ 判断拆分策略 → 生成 `[AI][标签][模块名] 简短描述` 格式建议 → 用 question 工具询问用户是否提交」的工作流指令注入当前会话，由当前 agent 执行。默认把全部变更合并为**一次提交**（速度优先，直接给出唯一建议；需要更细粒度时通过「继续拆分」选项细化后再次询问）。固定选项：**确认提交**（执行 `git add` + `git commit`，失败立即停止并报告现场）、**继续拆分**（细化粒度后再次询问）、**不提交**。仅在用户明确选择提交后才执行 git 写操作，绝不执行 `git push`。命令经 `session.prompt` 注入并触发 LLM turn（宿主能力缺失时降级为 synthetic 回执提示）。

### `/ai-ratio`：AI 代码占比统计

```text
/ai-ratio                              # 批问统计范围后分析
/ai-ratio --since 2026-03-01           # 预指定起始日期，跳过对应询问
/ai-ratio --branch feat/merchant-F01   # 预指定分支
```

对话式命令：把「批量询问统计范围（时间范围 + 分支）→ 只读采集提交 → 判定 AI/人工（`[AI]` 前缀为最高优先判定依据，兼容 author 名 `AI-Gen(...)`、`ai-gen@company.com` 等旧格式）→ 按开发者/模块统计 → 输出 Markdown 报告」的工作流指令注入当前会话。全程只读（`git log` / `git show --numstat`），隐藏目录与 Markdown 文档不计入代码产出，统计必须基于真实命令输出。命令经 `session.prompt` 注入并触发 LLM turn（宿主能力缺失时降级为 synthetic 回执提示）。

### `/oceanus-config`：模型厂商 preset 初始化

```text
/oceanus-config            # 列出内置厂商，多选生成 preset
/oceanus-config 全部生成    # 附加补充要求
```

对话式命令：把「列出内置厂商 blueprint → question 多选 → 逐个生成用户级 preset → 可选激活」的工作流指令注入当前会话。写入动作由 `oceanus_config_generate` 工具确定性完成（原子写 + 临时文件 rename），不让 LLM 手写 JSON；无配置文件时默认按维护者常用厂商组合（`zai`、`openai`、`deepseek`、`ollama-cloud`、`opencode-go`）生成，其余内置 blueprint 可通过补充要求显式指定。


## 开发

```bash
bun install       # 安装依赖
bun run build     # 构建到 dist/（zod 已内联，产物自包含）
bun run typecheck # 类型检查
```

## 项目结构

```
.
├── package.json        # npm 包定义，main 指向 dist/index.js
├── tsconfig.json
├── src/
│   ├── index.ts        # v2 CLI 插件入口：Plugin.define + ctx.agent/skill/command/tool/hook 注册
│   ├── tui.tsx         # TUI sidebar 插件入口（exports["./tui"]）与会话/模型展示
│   ├── agents/         # 各 agent 定义（oceanus / sisyphus / prometheus + 6 个子 agent）
│   ├── skills/         # sisyphus 六个阶段与支持型 skill（插件注入，安装无需拷贝）
│   ├── tools/          # 核心工具（ast-grep / clipboard-image / oceanus-config-generate）；cbm/ 下另有 7 个 CBM 工具
│   ├── hooks/          # 运行时保护 Hook（apply-patch / json-error-recovery / tool-output-truncator / tool-loop-guard / secret-read-guard / planning-write-guard / cbm-guidance / image 处理）
│   ├── config/         # jsonc 配置加载与 schema（paths / loader / schema / utils / constants / presets / vendor-blueprints / tool-matrix）
│   ├── commands/       # 插件命令（/preset、/git-commit、/ai-ratio、/oceanus-config）
│   ├── review/         # Oracle 审查场景注册表与 graded 协议（scenes / protocol）
│   ├── runtime/        # 宿主桥接、setup 阶段编排、workspace 解析与会话能力契约
│   ├── smoke/          # ast-grep CLI 探测与 setup/CBM 接线 smoke
│   ├── cbm/            # CBM 下载、校验、进程、索引、MCP、CLI 与 wiring
│   ├── browser/        # agent-browser 浏览器能力层（三级探测、确认门安装）
│   └── update/         # npm 版本检查、OpenCode 安装上下文、staging 与原子更新
└── dist/               # 构建产物
```

## Sisyphus 文档骨架速查
SDD 开启时 Spec 使用 `Goal / Context / Scope / Non-goals / Requirements / Architecture / Acceptance Criteria / Files touched map / Oracle Analysis（solution-analysis 场景）`；Plan 以 `Spec: .oceanus/spec/<唯一文件>.md` 绑定，并为每个 Task 写明 Files、Consumes/Produces、checkbox、Validation + Expected 与 Acceptance。Execute 先读二者，Review 用 `criterion -> evidence -> status -> gap/next action` 矩阵。
