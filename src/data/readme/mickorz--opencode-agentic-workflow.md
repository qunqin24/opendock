# opencode-agentic-workflow

**Durable Agentic Workflow Runtime for OpenCode.**

> 在 OpenCode V2 上编排多 agent 工作流：崩溃后可恢复、执行全程可观测、
> 每次 run 文件系统级隔离。workflow 定义带语义版本注册，失败现场保留取证，
> 跨目录/跨服务精确续跑。

```text
✓ Multi-agent orchestration      agent / parallel / sequence / phase
✓ Deterministic checks           可重复的谓词验证（check / assert）
✓ Semantic verification          多 reviewer 语义评审（verify）
✓ Retry / fallback               失败语义与降级路径
✓ Human checkpoints              策略门 + TUI 交互式审批（RPC）
✓ Journal & resume               崩溃后跨进程恢复，completed 步骤跳过
✓ Workflow version registry      语义版本身份 + args schema 校验
✓ Execution tracing              全原语事件流（events.jsonl）
✓ Token & cost metrics           事件消费式聚合（workflow_metrics 工具）
✓ Git worktree isolation         每 run 独立 worktree，resume 原样 reattach
```

与前代 `opencode-dynamic-workflows`（V1 平台）的根本区别：**workflow 不再是
运行时生成的脚本，而是带版本身份的声明式定义**——由此获得 durability：
journal 记录每一步，崩溃后 resume 按精确版本解析定义、跳过已完成步骤、
重新附着原 worktree 继续执行。

---

## 总架构

```text
                        Human
                          │
                interactive checkpoint
                （TUI dialog / RPC / 策略门）
                          │
                          ▼
                 Workflow Registry
             （版本化定义 · args schema 校验）
                          │
                          ▼
                  Workflow Runner
              start / resume / cleanup
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
       agent()          check()        verify()
    （编排原语：       确定性谓词       多 reviewer
     parallel /        验证             语义评审
     sequence / phase）
          │
          ▼
      AgentExecutor          ←—— Core 的唯一边界抽象
          │
          ▼
    OpenCode V2 Adapter      ←—— 唯一允许触碰 OpenCode API 的位置
          │
          ▼
   isolated sub-session      （cwd = workspace 根）
          │
          ▼
      Git Worktree           （agw/<runId> · 失败保留现场）

  Runtime side channels（旁路，不侵入主链）:
    Journal ──► Resume      跨目录/跨服务 · journal.workflow 精确版本解析
    Trace   ──► Observability  events.jsonl 全事件流
    Metrics ──► Token / Cost   workflow_metrics 工具 + metrics.json 快照
```

**架构红线**：Workflow Core（`src/workflow` `src/runtime` `src/quality`
`src/state` `src/observability` `src/registry` `src/metrics` `src/workspace`）
零 OpenCode 依赖；只有 `src/plugin/` 允许 import `@opencode/plugin`。
所有宿主能力（会话执行、审批交互、工作区）都经注入的抽象进入 Core。

---

## 5 分钟 Quick Start

**前置**：OpenCode V2（`opencode` CLI 可用且有能正常对话的模型）、Node.js 20+、git。

```jsonc
// 1. 在你的项目里配置插件（<你的项目>/opencode.json）
//    package 用 npm 包名；model 换成你的 providerID/modelId
{
  "plugins": [
    {
      "package": "@mickorz/opencode-agentic-workflow",
      "options": {
        "model": { "providerID": "glm", "id": "glm-5.3-flash" },
        "agent": "build"
      }
    }
  ]
}
```

```bash
# 2. 在项目目录里跑第一个 workflow（3 路并行分析 + 汇总）
cd <你的项目>
opencode run --model glm/glm-5.3-flash \
  "调用 workflow 工具：flow=smoke, topic=Rust 内存安全。完成后报告输出。"
```

主 agent 会调用 `workflow` 工具，输出形如：

```text
[smoke@1.0.0 runId=run_1790994713691_b9lhmqcs]
（research → summary 两步的最终报告）
```

到这里执行链已通。接下来按需打开持久化 / 观测 / 隔离——见下方示例。

<details>
<summary><b>从源码安装（插件开发 / 未发布版本）</b></summary>

```bash
git clone https://github.com/mickorz/opencode-agentic-workflow.git
cd opencode-agentic-workflow
npm install && npm run build          # 产物在 dist/plugin
```

然后把 opencode.json 的 `package` 换成克隆目录下 `dist/plugin` 的**绝对路径**。
修改插件代码后需重启 opencode service（服务在启动时加载 dist/；
插件相对路径以项目目录而非服务 cwd 为基准——见 `dev-docs/experience/`）。

</details>

> 提示：验收类长任务请给 `opencode run` 配看门狗超时
> （见 `dev-docs/experience/opencode-run-hang-watchdog.md`）。

---

## 内置 Workflow

| flow | 步骤 | 说明 |
|------|------|------|
| `smoke` | research → summary | 3 路并行分析 agent + 1 个汇总 agent（冒烟演示） |
| `reliable` | execute → check → verify → checkpoint | agent 执行 → 确定性检查 → 多 reviewer 语义评审 → 审批 |
| `artifact` | write → check → checkpoint | 在隔离 workspace 中生成文件产物并验证（隔离验收载体） |
| `feature-development` ⭐ | analyze → implement → check → verify → checkpoint | 一句话需求 → 隔离 worktree 实现 → 真实测试 → 失败自动修复 → reviewer 审查真实 diff → 人工审批；产物固化为 `agw/<runId>` 分支 commit（需启用 isolation） |

新增 workflow = 在 `src/workflows/` 写一个 `WorkflowDefinition` 并在
`src/plugin/index.ts` 注册；工具描述、枚举、路由全部由注册表驱动。
编写规范与事故教训见 **[Workflow Authoring Best Practices](./docs/workflow-authoring.md)**。

遇到「改了代码不生效」「插件版本不对」「checkpoint 卡 5 分钟」等问题，
先查 **[Troubleshooting](./docs/troubleshooting.md)**。

---

## 示例

### 1. 最小 workflow

见 Quick Start（`smoke` 即最小示例：一个 `topic` 参数，两步）。

### 2. Reliable workflow（确定性检查 + 语义评审 + 审批）

```jsonc
"options": {
  "model": { "providerID": "glm", "id": "glm-5.3-flash" },
  "agent": "build",
  "checkCommand": "npm test",            // check 步骤执行的确定性命令（可选）
  "checkpoint": { "mode": "auto-approve" }
}
```

```text
调用 workflow 工具：flow=reliable, topic=重构方案评审
```

链路：`execute`（agent 产出方案）→ `check`（跑 `npm test`，退出码判定）
→ `verify`（默认 2 个 reviewer agent 独立评审，聚合 verdicts）
→ `checkpoint`（审批门）。任一步失败即 fail-fast，journal 记录现场。

### 3. Crash + Resume（崩溃恢复）

打开 journalDir（建议绝对路径，跨目录共享即可跨服务恢复）：

```jsonc
"options": {
  "model": { "providerID": "glm", "id": "glm-5.3-flash" },
  "agent": "build",
  "checkpoint": { "mode": "auto-reject" },   // 演示：让 run 在审批处失败
  "journalDir": "/abs/path/to/journal"
}
```

失败输出自带恢复句柄：

```text
[agentic-workflow] workflow failed: workflow artifact@1.0.0 run run_1790994713691_b9lhmqcs
failed: sequence failed (1 step): step #2 (checkpoint) failed: checkpoint rejected:
artifact-review (rejected by policy gate (auto-reject))
(runId: run_1790994713691_b9lhmqcs; 可用 resumeRunId="run_1790994713691_b9lhmqcs" 恢复本次执行)
```

换一个**全新目录**（模拟进程重启/换机器；journalDir 用同一个绝对路径），
审批门改为 `auto-approve`，然后：

```text
调用 workflow 工具：resumeRunId=run_1790994713691_b9lhmqcs
```

Resume 语义：

- workflow 按 **journal 记录的精确版本** 解析（`artifact@1.0.0`，绝不隐式取最新）；
- args 取自 journal，调用方无需重传；
- **completed 步骤全部跳过**（原始时间戳保留），从首个未完成步骤续跑；
- 已完成的 run 幂等重放（零步骤执行，仅重建最终报告）。

一条可复用的全链路验收脚本：`scripts/e2e-durable-restart.sh`
（31 项断言，覆盖 Registry→Worktree→Journal→Trace→Metrics→崩溃→重启→
Resume→Complete→清理全链）。

### 4. Interactive checkpoint（真正的人工审批）

```jsonc
"options": {
  "checkpoint": {
    "mode": "interactive",
    "timeoutMs": 300000,        // 缺省 5 分钟
    "onTimeout": "reject"       // 超时裁决：reject（缺省，安全失败）/ approve
  }
}
```

TUI 中 workflow 会停在 checkpoint 处弹出审批对话框；无应答超时按
`onTimeout` 裁决。headless / CI 场景用策略门（`auto-approve` /
`auto-reject`）。

### 5. Worktree isolation（文件系统隔离）

```jsonc
"options": {
  "isolation": {
    "mode": "git-worktree",     // 缺省 off
    "dir": "/abs/path/to/worktrees",   // 可选；缺省 <仓库同级>/<项目名>-worktrees
    "baseRef": "main",          // 可选；缺省当前 HEAD
    "cleanup": "on-success"     // always / on-success（缺省）/ never
  }
}
```

启用后每个 run：

1. `git worktree add -b agw/<runId> <dir>/<runId>`（worktree 在仓库**同级**目录，不污染仓库）；
2. 子 agent 会话的 **cwd 绑定到 worktree 根**（产物文件落在隔离目录，真实 e2e 已验证）；
3. workspace 身份写入 journal；**resume 时 reattach 原 worktree**（文件系统状态
   随 journal 一起恢复；目录缺失则报错，绝不静默重建"假恢复"）；
4. 结束后按策略清理：

| cleanup | 成功 | 失败 |
|---------|------|------|
| `on-success`（默认） | 移除 worktree、清 journal 身份 | **保留现场**（debug / resume 取证） |
| `always` | 同上 | 同样清理 |
| `never` | 保留 | 保留 |

清理只移除 worktree，**分支保留**（删除是破坏性操作；
`git branch --list 'agw/*'` 可批量清理）。

### 6. Metrics / Trace（用量与成本观测）

跑过 workflow 后，直接问主 agent：

```text
调用 workflow_metrics 工具（format=text），报告 token 与成本
```

输出（真实 e2e 数据，3 个 agent / 40.1s）：

```text
## Agents
- 调用 3 次（失败 0）
- tokens：in 47.5k / out 833 / reasoning 1.2k / cache r 27.7k w 0
- 成本：$0.0090
- 按模型：
  - glm/glm-5.3-flash: 3 次, in 47.5k / out 833, $0.0090
...
```

成本取值优先级：**用户 `prices` 覆盖 > 宿主价目表（ctx.model.list）> 宿主消息
cost**；宿主记账为 0 时按 token 用量 × 价目估算（`prices` 选项可补新模型价目，
见 `dev-docs/experience/宿主cost为0与models-dev缓存滞后.md`）。

Trace：配置 `traceDir` 后全原语事件流落盘 `events.jsonl`
（agent/check/verify/checkpoint/step/workflow 全生命周期），
workflow 结束时同步写 `metrics.json` 快照（失败也写）。

---

## 配置参考

| 选项 | 类型 | 缺省 | 说明 |
|------|------|------|------|
| `model` | `{providerID, id}` | — | 子会话使用的模型 |
| `agent` | `string` | — | 子会话 agent（如 `"build"`，有文件/命令工具） |
| `concurrency` | `number` | `3` | 模型 API 并发上限（信号量） |
| `checkpoint.mode` | `auto-approve` / `auto-reject` / `interactive` | `auto-approve` | 审批门形态 |
| `checkpoint.timeoutMs` | `number` | `300000` | interactive 等待应答超时 |
| `checkpoint.onTimeout` | `reject` / `approve` | `reject` | interactive 超时裁决 |
| `checkCommand` | `string` | — | reliable workflow 的 check 步骤命令 |
| `journalDir` | `string` | 关闭 | journal 目录（`<runId>.json`）；不配置则不持久化、不可恢复 |
| `traceDir` | `string` | 关闭 | 事件 trace 目录（`events.jsonl` + `metrics.json`） |
| `prices` | `Record<string, {input, output, cacheRead, cacheWrite}>` | — | 价目覆盖（USD/M tokens），key 为 `providerID/modelId` |
| `isolation.mode` | `off` / `git-worktree` | `off` | 工作区隔离 |
| `isolation.dir` | `string` | 仓库同级 | worktree 父目录 |
| `isolation.baseRef` | `string` | HEAD | worktree 基准 ref |
| `isolation.cleanup` | `always` / `on-success` / `never` | `on-success` | 清理策略 |

相对路径一律以**项目目录**（不是 service 进程 cwd）为基准解析。

## Tools

**`workflow`** —— 执行或恢复 workflow：

| 参数 | 说明 |
|------|------|
| `flow` | workflow id（枚举由注册表驱动；缺省 `smoke`） |
| `topic` | 主题参数 |
| `resumeRunId` | 恢复指定 run（优先于 flow/topic；用失败输出里的 runId） |

**`workflow_metrics`** —— 只读查询本服务累计指标（`format: "text" | "json"`）。

## Journal 数据模型

`<journalDir>/<runId>.json`（每次状态变更原子落盘）：

```jsonc
{
  "runId": "run_1790994713691_b9lhmqcs",
  "workflow": { "id": "artifact", "version": "1.0.0" },  // resume 精确版本解析依据
  "args": { "topic": "火星基地能源方案" },
  "workspace": { "provider": "git-worktree", "path": "...", "branch": "agw/run_..." },
  "status": "failed",            // running / completed / failed / aborted
  "steps": [
    { "name": "write",      "status": "completed", "startedAt": 1760000000000 },
    { "name": "check",      "status": "completed" },
    { "name": "checkpoint", "status": "failed" }
  ],
  "failure": { "message": "..." }
}
```

**版本纪律**：workflow 步骤结构（stepNames 数量/顺序/语义）变更必须升
`version`——resume 依赖 journal.workflow.version 精确解析定义。

---

## 从 dynamic-workflows（v1）迁移

| | v1 `opencode-dynamic-workflows` | v2 `opencode-agentic-workflow` |
|---|---|---|
| 平台 | OpenCode **V1** 插件 API | OpenCode **V2** 插件 API |
| workflow 形态 | 主 agent **运行时生成 JS 编排脚本**（VM 沙箱） | **声明式定义** + 语义版本注册（代码内） |
| 调用方式 | 自然语言 → 生成脚本 → 执行 | `flow=<id>` + args（或 `resumeRunId`） |
| 原语 | agent / parallel / sequence / fallback / race | agent / parallel / sequence / phase + check / verify / checkpoint |
| 崩溃恢复 | 无 | journal + resume（completed 跳过、精确版本、幂等重放） |
| 隔离 | 子会话 | git worktree per run（resume reattach） |
| 观测 | TUI 进度树 | events.jsonl trace + metrics/成本聚合 |
| 人工审批 | checkpoint（V1 API） | 策略门 + TUI 交互式审批（RPC） |
| 安装 | `npx @mickorz/opencode-dynamic-workflows install` | npm 包 `@mickorz/opencode-agentic-workflow`（或源码路径） |

迁移要点：

1. **从"生成脚本"到"注册定义"**：v1 里由主 agent 即兴生成的编排逻辑，在 v2
   中固化为 `WorkflowDefinition`（`src/workflows/` 有三个完整样例）。换来的是
   可恢复、可版本化、可审计。
2. **一次性的动态编排仍有价值**：不需要 durable 的临时任务，直接让主 agent
   自己并行开子会话完成即可（v2 明确拒绝嵌套 workflow 调用防递归死锁）。
3. OpenCode 平台自身 V1→V2 的配置/插件迁移见
   `dev-docs/guides/Migrate from V1.md`（官方指南剪藏）。

---

## 开发

```bash
npm run typecheck    # tsc --noEmit（strict + noUncheckedIndexedAccess）
npm test             # node:test + tsx，158 个测试
npm run build        # 产物 dist/（插件入口 dist/plugin）

./scripts/e2e-durable-restart.sh   # 真实全链路验收（需要可用模型与 git）
```

架构不变量（详见 `dev-docs/`）：

```text
Workflow Core 零 OpenCode 依赖；只有 src/plugin/ 触碰 @opencode/plugin
workflow → AgentExecutor → OpenCodeV2Executor → ctx.session
WorkspaceProvider / CheckpointGate / CommandRunner / ExecutionStore
全部是注入抽象——Core 只认识接口，宿主能力在 plugin 层实现
```

## 阶段与文档

```text
P0 ✅ Execution       —— 能跑（编排原语 + V2 适配）        v0.1.0
P1 ✅ Reliability     —— 跑得可靠（check/verify/重试/审批） v0.2.0
P2 ✅ Production Runtime —— 扛得住生产
     Journal & Resume · Registry · Observability · Metrics · Isolation
                                                            v0.3.0
```

- 开发过程：`dev-docs/progress/执行进度.md`（逐 commit 交付清单）
- 设计方法论：`dev-docs/design/从P0到P2：Agentic-Workflow-Runtime演进方法论.md`
- 踩坑实录：`dev-docs/experience/`（11 篇，验收与调试前先查）

## License

MIT
