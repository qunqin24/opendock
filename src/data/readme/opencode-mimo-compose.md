# OpenCode Compose 技能包

从 MiMoCode compose 技能迁移到 OpenCode 格式的工作流技能集合。

## 结构

```
opencode-mimo-compose/
├── README.md               # 本文件
├── skills/                  # 15 个工作流技能
│   ├── ask-user/           # 用户询问与自动决策
│   ├── brainstorm-design/  # 方案设计
│   ├── create-skill/       # 创建新技能（含最佳实践）
│   ├── execute-plan/       # 执行计划（独立会话）
│   ├── isolated-worktree/  # 隔离工作树
│   ├── merge-work/         # 合并与完成
│   ├── parallel-tasks/     # 并行任务
│   ├── receive-feedback/   # 接收代码审查反馈
│   ├── report-completion/  # 完成报告
│   ├── review-code/        # 代码审查
│   ├── subagent-dev/       # 子 agent 开发流程
│   ├── systematic-debug/   # 系统化调试（四阶段）
│   ├── tdd/                # 测试驱动开发
│   ├── verify-work/        # 完成验证
│   └── write-plan/         # 编写实现计划
└── agents/                       # 3 个 agent 定义（mimo- 前缀避免与 slim 内置冲突）
    ├── mimo-compose.md          # 编排器（primary，加载 compose 技能）
    ├── mimo-dev.md              # 实现者（subagent，TDD + debug + verify）
    └── mimo-review.md           # 审查者（subagent，spec 合规 + 代码质量双阶段审查）
```

## 安装

### 方式一：opencode.json（推荐）

在 `~/.config/opencode/opencode.json` 的 `plugin` 数组中添加包名即可，**不需要手动 npm install**：

```json
{
  "plugin": ["opencode-mimo-compose"]
}
```

OpenCode 会自动下载包。之后每次启动，插件自动：
- 首次：将 15 个 skill markdown 文件同步到 `~/.config/opencode/skills/`
- 每次：注册 `mimo-compose` / `mimo-dev` / `mimo-review` 三个 agent

在 OpenCode 中选择 **mimo-compose** 即可使用。

### 方式二：npm 全局安装

如果不用 opencode 插件系统，也可以手动：

```bash
npm install -g opencode-mimo-compose
cat ~/.config/opencode/opencode.json  # 确保 plugin 数组包含 opencode-mimo-compose
```

### 方式三：直接复制文件

```bash
cp -r skills/* ~/.config/opencode/skills/
cp -r agents/* ~/.config/opencode/agents/
```

纯文件方式，不依赖代码插件注册。

### 使用 MiMo Compose

在 OpenCode 中选择 `mimo-compose` 作为主 agent，它会自动加载 compose 工作流技能。你也可以让现有的 `coordinator` 加载部分技能：

在 `~/.config/opencode/agents/coordinator.md` 中添加：
```markdown
SKILL:brainstorm-design
SKILL:systematic-debug
SKILL:tdd
SKILL:write-plan
SKILL:verify-work
```

## 迁移变更

### 自动转换（脚本完成）
- **Skill 命名**：`compose:xxx` → `xxx`（kebab-case），去掉 `compose:` 前缀
- **移除字段**：`hidden: true` 已从所有 frontmatter 中移除（OpenCode 不使用）
- **交叉引用**：`compose:debug` → `SKILL:systematic-debug`（全部 14 个技能交叉引用已更新）

### 跳过的文件
以下测试/开发文件未包含在迁移中：
- `debug/test-academic.md`
- `debug/test-pressure-*.md`
- `debug/CREATION-LOG.md`

### 需要手动适配的项
- `brainstorm-design/visual-companion.md`：引用了 `scripts/start-server.sh` 等本地脚本，需要将脚本也迁移过去或在 OpenCode 环境中重写视觉伴侣功能
- `new-skill/anthropic-best-practices.md`：引用了一些外部文件（如 `@graphviz-conventions.dot`），需确认路径

### 未迁移的能力
- **视觉伴侣**（visual-companion）：依赖 compose 自己的浏览器 mockup 服务器，OpenCode 无等价物，作为参考文档保留
- **skill 自测试框架**（testing-skills-with-subagents.md）：作为方法论参考文档保留，不依赖 compose 基础设施

## 技能工作流

推荐的 completion 工作流（从想法到交付）：

```
brainstorm → plan → (worktree) → execute → verify → merge → report
   设计       分解      隔离        实现      验证     合并     总结
```

### 独立技能（按需加载）

| 场景 | 加载 |
|------|------|
| Bug 修复 | `systematic-debug` |
| 新功能 / 改行为 | `brainstorm-design` + `write-plan` + `tdd` |
| 需要用户决策 | `ask-user` |
| 并行独立任务 | `parallel-tasks` |
| 处理 review 反馈 | `receive-feedback` |
| 创建新 skill | `create-skill` |
| 代码审查 | `review-code` |

## 智能检查点（v1.0.5 新增）

MiMo Compose 内置智能检查点机制，自动根据任务复杂度选择流程：

### 核心原则

**流程服务于质量，而非反过来。** 简单任务不应被流程拖慢，复杂任务不应跳过流程。

### 工作方式

收到任何请求后，编排器会输出唯一强制检查点：

```
[CHECKPOINT] 任务分级：{简单/复杂}
依据：{一句话说清为什么}
```

之后根据分级自动选择路径：

| 分级 | 流程 | 适用场景 |
|------|------|---------|
| **简单** | 快速通道：自己实现 → 验证 | ≤3 文件、≤50 行/文件、无歧义、非新建 |
| **复杂** | 完整流程：brainstorm → plan → delegate → review | 4+ 文件、新功能、架构决策、多方案权衡 |

### 智能边界处理

- **不确定时** → 按复杂处理（宁可多走流程，不可跳过）
- **任务升级** → 简单任务中途变复杂可自动升级
- **快速模式** → 用户明确要求时可走快速通道

## 来源

- **原始来源**：MiMoCode compose 技能 (`~/.local/share/mimocode/compose/0.1.0/skills/`)
- **迁移日期**：2026-06-12
- **迁移范围**：30 个 .md 文件 → OpenCode 兼容格式
