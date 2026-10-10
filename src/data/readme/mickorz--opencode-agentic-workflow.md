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
运行时生成的脚本，而是带版本身份的定义**——由此获得 durability：
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

### 方式一：安装器（推荐）

```bash
# 交互式（安装方式 / 模型 / journal / skills 逐项确认，配置合并保留注释、自动 .bak）
npx @mickorz/opencode-agentic-workflow install

# 无头（flags 指齐 + --yes，零交互——适合脚本 / CI）
npx @mickorz/opencode-agentic-workflow install --project --model glm/glm-5.3-flash --yes
```

三种方式：`--global`（`~/.config/opencode/opencode.json`，全项目生效）、
`--project`（当前项目 `opencode.json`，推荐）、`--locked`（npm 装进
`node_modules` + 配置指本地路径，适合团队协作；skills 零拷贝）。
生成的 options 最小可用集：`model` + `agent: "build"` +
`journalDir: ".agentic-workflow/journal"`（`--no-journal` / `--no-skills`
可关）。skills 拷贝进原生扫描目录（`.opencode/skills/` 或
`~/.config/opencode/skills/`）。

配套命令：`update`（locked 走 `npm update`；其余清宿主插件缓存，重启后
拉最新）、`uninstall`（与安装对称：条目清空连键删、空壳配置整文件删、
locked 无条件 `npm uninstall`；skill 目录与 journal 属用户数据，交互确认
或打印手动清理命令）、`doctor`（只读排查 `[OK]/[WARN]/[FAIL]` 清单）。

### 方式二：手改配置

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
| `workflows` | `string[]` | 项目 `flows/` 目录（存在即装载） | 自定义流程路径（**v0.9.0 起仅 `.js` v1 脚本**；`.mjs`/`.cjs`/JSON/defineWorkflow 模块 fail-loud 并附改写指引） |
| `schedulesDir` | `string` | 关闭 | 定时任务目录（配置 + 游标 + 触发记录）；需同时配置 `journalDir`，启用 `workflow_schedule` 工具与调度器 |
| `maxConcurrentRuns` | `number` | `3` | 并发顶层 run 上限（超出返回可读失败并提示用 `workflow_control` 查看或停止在飞 run） |

相对路径一律以**项目目录**（不是 service 进程 cwd）为基准解析。

## Tools

**`workflow`** —— 执行或恢复 workflow：

| 参数 | 说明 |
|------|------|
| `flow` | workflow id（见工具描述内清单；缺省 `smoke`）。**未知 id 会先触发一次 flows 目录增量重扫**——会话中途写好的 `.js` 无需重启即可运行；仍未知才报错并列出可用清单（附 flows 装载错误前几条） |
| `topic` | 主题参数（恒传顶层） |
| `args` | flow 声明的其余参数（对象；描述内 `[args: …]` 有提示；required/类型不符即报具体问题） |
| `resumeRunId` | 恢复指定 run（优先于 flow/topic；用失败输出里的 runId；aborted 的 run 也可恢复） |
| `checkpointMode` | 调用级审批覆盖：`"auto-approve" | "auto-reject"`（headless 必传前者，除非明确要拒） |
| `background` | `true` = 后台启动并立即返回 runId（需 journalDir；用 `workflow_control` 轮询/停止）。**并发顶层 run 已支持**：最多 `maxConcurrentRuns`（默认 3）个 run 同时在飞；来自 run 内部（其 agent 会话或派生子会话）的调用仍被拒绝（递归防护，防信号量自饿死） |

自定义流程不再有对话内定义工具（v0.6.0 移除 `workflow_define` 与声明式
JSON）——写代码流程模块即可，见下文[代码流程](#代码流程自定义-js-逻辑)；
flows 目录缺省自动装载，无需配置。

**`workflow_control`** —— run 检查与控制（需 journalDir）：
`action=status`（全量列表或单 run 详情，含最终 output）；
`action=stop`（协作式停止——下一步骤边界生效，journal 收口为 `aborted`；
进程重启遗留的悬置 running run 会被直接收口）。

**`workflow_metrics`** —— 只读查询本服务累计指标（`format: "text" | "json"`）。

**`workflow_schedule`** —— 定时任务管理（需 `schedulesDir` + `journalDir`）：

| 参数 | 说明 |
|------|------|
| `action` | `create` / `list` / `get` / `delete` / `runNow` / `enable` / `disable` |
| `id` | schedule id（kebab-case；create 必填） |
| `flow` / `cron` | create 必填：workflow id + 四模式 cron（`* * * * *`、`*/n`、`m * * * *`、`m h * * *`、`m h * * W`，本地时区） |
| `args` | 触发时透传的 workflow 参数（含 `topic`） |
| `name` / `enabled` | 展示名 / 初始启用态（缺省 true） |

语义边界（如实）：调度器随宿主进程存活（进程退出即停）；停机错过的 slot
重启后**合并为最近一个**补跑；创建时刻为游标基线（更早的 slot 不补跑，
要立即跑用 `runNow`）；触发时若有任一 run 在跑（调度器单飞，与手动并发
上限独立——保持节奏可预期、避免并行成本意外）该 slot 记录 `skipped`
（跳过不是延迟）；scheduled run 无人值守——checkpoint 强制 auto-approve、
不启用 worktree 隔离；触发时用 registry 当前最新版本。

## Skills

npm 包内附两个 agent skill（`skills/` 目录，随包分发），教主 agent 用上面的工具
完成「定义流程」与「迭代优化」两类高频任务：

| Skill | 触发场景 |
|-------|----------|
| `workflow-authoring` | 「帮我定义/创建一个 workflow」「给流程加步骤/参数」「流程装载报错了」——从需求澄清到 flows 目录 JS 模块编写、装载注册、试跑验证的完整链路 |
| `workflow-optimize` | 「这个流程跑得慢/贵/老失败」「优化迭代一下」「对比改动前后」——metrics/journal 诊断 → 单主题改动 → 升版重定义 → 同参重跑 → 对比报告 |

启用方式（二选一）：

```jsonc
// 方式一（推荐，零拷贝）：opencode.json 里把包内 skills 目录挂进 skills 数组
{
  "plugins": [{ "package": "opencode-agentic-workflow", "options": { "...": "..." } }],
  "skills": ["node_modules/opencode-agentic-workflow/skills"]
}

// 方式二：把 skills/ 下的子目录拷进 .opencode/skills/（项目级）
// 或 ~/.config/opencode/skills/（全局）
```

挂载后 agent 会在相关请求时自动加载；也可在 prompt 里显式 `@workflow-authoring`
指定。

## TUI 进度面板

新 run 启动时面板**自动打开**（对齐 v1 默认行为；每个 run 只自动开一次，
手动关掉后本 run 不再打扰）。也可以随时手动开：输入 `/workflow`
（或命令面板搜 "Workflow progress"）。
近期 run 一览（含 journal 里的历史 run），最新 run 展开步骤树，状态实时刷新——
journal 每次状态变更都会派发 `run.progress` 全量快照事件。

```
Agentic Workflow
▶ feature-development@1.0.0  12.4s  · 1 running · 3.2k tok
  ✓ gather  2.0s  · 1.5k tok · glm/glm-5.3-flash
  ▶ implement  2.5s
  · verify
✓ paced@1.0.0  24.0s
── detail
✓ artifact@1.0.0 · completed · 42.0s  · 2.1k tok
  run_9f3c… · args {"topic":"节点详情验收"}
  ✓ write  18.2s  · 2.1k tok · glm/glm-5.3-flash
    → 已写入 artifact.md（约 1200 字）……
  ✓ check  1.1s
    → artifact.md exists (4.2 KB)
```

面板下半区是**节点详情**（P2-8b）：最新 run 的 journal 单读投影——runId /
args 预览 / 每步骤的输出或错误预览（折行 + 截断）/ 步骤与总时长，以及
**步骤级 token/模型元数据**（agent 步显示 `· 1.5k tok · glm/glm-5.3-flash`
后缀；同一 run 的 agent 调用按 runId 聚合到所在步骤，subflow 互不串账）。
详情经 `agentic-workflow-progress` RPC 的 `detail` 方法拉取（同一状态只拉
一次，终态转换再拉一次收尾）；未配置 `journalDir` 时详情区静默缺省，
面板其余不受影响。

### 显示密度与常驻入口（v0.7.0）

v1（opencode-dynamicworkflows）TUI 显示功能对齐第一、二批（对比清单见
`dev-docs/research/v1-v2-TUI显示功能对比与补齐清单.md`）：

- **主题语义色**：运行黄（warning）/ 成功绿（success）/ 失败红（error）/
  次要灰（muted）四档，取自宿主 `ctx.theme`（跟随主题与深浅色模式）；
  头行加粗。终态 run 不再显示 running 计数（停表语义）
- **信息密度**：run 头行显示 `N running`；列表步骤行带 `· 模型` 后缀
  （快照事件透传 usage/model）。**token 展示已全面撤出 TUI**（v0.10.3
  面板列表行 + v0.10.4 节点详情视图；用户产品决策——token 数据看
  `workflow_metrics` 工具或 journal 文件）
- **重试/超时可观测（v0.10.0）**：配置了 `retries` 的 agent 步骤行与
  节点详情状态头显示重试进度 `(2/3)`（成功 = 第几次尝试，失败 = 尝试
  到第几次耗尽）；配置了 `timeoutMs` 的步骤时长带单次尝试上限
  （`10s/1m` = 已耗时/上限）。数据链路：`agent()` 重试环回填
  `attempt`/`attemptsMax` → journal 步骤记录 + 快照事件 → 面板/Inspector；
  旧 journal 无这些字段时自动省略（向后兼容）
- **prompt.footer 状态条**：有 run 在跑时，输入框下方常驻一行
  `◐ flow@ver done/total · N running`——打字时也看得见进度，无需开面板
- **sidebar 紧凑树**：侧边栏常驻近期 run 一览（窄宽截断 + 行数预算，
  超出提示 `/workflow` 开面板）；空板不渲染

### Open Session 回放

每个 agent 调用实际发生在宿主子会话里（挂在主会话下，TUI 会话列表可导航）。
v1 的「打开会话」在 v2 的对位实现：executor 把子会话 ID 透传到
`agent.completed` 事件，journal 按步骤聚合成 `sessionIDs`（pipeline/race 步
是多会话，按发生顺序累积；reopen 重跑会清掉旧清单）。面板据此自动回放
**最新 run 最后一个带会话的步骤**的完整对话：

```
── session
fanout · ses_8b1f…
  ❯ 针对条目「回放甲」写一句结论…
  · 回放甲：并发回放链路通畅。
  ❯ 针对条目「回放乙」写一句结论…
  · 回放乙：会话 ID 已贯通落盘。
```

回放经同一 RPC 的 `session` 方法拉取（`{runId, step, index?}`——index 选
pipeline 步的第几个会话，缺省最后一个；消息取 user/assistant 文本，单条
预览 800 字、至多 50 条）。任意步骤的会话都可经该 RPC 取回，不限于面板
自动选择的那一个。

数据链路：RunJournal 状态转换 → `run.progress` 事件总线 → ProgressBoard（容量 20，
journalDir 配置时用**非终态**历史 run 做种子——只浮现上次被中断的，终态 run
不占启动面板；会话内顶层终态 run 只保留最新 3 条，更旧的连同 subflow 子树
瘦身淘汰；legacy 流程的 `subflow:<id>` 步骤行与子 run 行合并为一行）→
`agentic-workflow-progress` RPC。headless
（`opencode run`）下没有 TUI 监听，转发零成本；同一份事件流也会写进 traceDir
（`events.jsonl`），可作为无头观测替代。

注意：面板渲染属交互式 TUI 行为，需在真实 TUI 里人工确认（本仓库自动化覆盖到
server 侧链路：事件发射、board 维护、RPC 契约（snapshot/detail/session）均有
测试与 E2E 证据；journal 落盘 sessionIDs 有真机 E2E 断言）。

## 嵌套工作流（subflow）

P2-9 起支持把另一个 workflow 作为步骤运行（v1 的 `workflow()` 原语对位）。
v1 脚本里直接调全局 `workflow()`：

```js
export const meta = { name: 'my_orchestrator', description: '组合子流程' }

phase('Child')
const child = await workflow('./release-notes.js', { topic: args.topic })
return { output: child.output }
```

语义：

- **子 run 独立 journal**：`parentRunId`/`depth` 记录 lineage；进度面板把子 run
  缩进挂在父 run 下；子 run 失败按普通步骤失败处理（父 run fail-fast）
- **gate/workspace 继承**：子 run 走父 run 的审批门与工作区（隔离是顶层
  run 的属性；子 agent 的 cwd 落在父 run 的 worktree）
- **深度上限 3**：超出明确报错（防失控递归；v1 自饿死事故的教训）
- **依赖 journalDir**：subflow run 必须有 journal（lineage 落盘）；未配置时
  ctx 不提供该方法
- agent 步骤里的递归守卫不变：workflow 内的 agent 不能再调 workflow_start
  （那会绕过编排）；要组合流程就用 subflow

同一机制也顺带解决了 0.4.0 的已知限制「全局 gate 单例竞态」：checkpoint
gate 与 workspace 现在经 run 级上下文（AsyncLocalStorage）解析，
scheduler 的无人值守门与 `checkpointMode` 调用级覆盖都不再换装全局单例。

## 并发步骤（pipeline / race）

v1 parallel/race 原语——v1 脚本全局直接用：

```js
// 条目并发 fan-out：每条目过同一段阶段函数，结果数组与 items 顺序对齐
const reports = await pipeline(
  [`${args.topic}-甲`, `${args.topic}-乙`, `${args.topic}-丙`],
  [(item) => agent(`分析 ${item}`, { model: "glm/glm-5.3-flash" })],
  { onFailure: "fail-fast" },                  // 或 "continue"
)

// 竞速首胜：≥2 分支并发起跑，首个成功者胜出，全败抛 WorkflowRaceError
const fastest = await race([
  () => agent(`方案A：${args.topic}`),
  () => agent(`方案B：${args.topic}`),
])
```

- **pipeline**：条目间并发（共享插件 `concurrency` 信号量）、多阶段链
  （每阶段 `(value, original, index)`）；败者按 `onFailure` 决定 fail-fast
  （缺省，抛 `WorkflowPipelineError`，不塌缩 null）或 continue（该条目
  结果为 null）
- **race**：败者不拖整体（与 run 控制同一诚实语义）
- **resume 粒度（如实）**：编排进 `ctx.runSteps` 时两者各占一个 journal
  步骤单元——completed 即整体跳过，中断后重跑整步（条目级断点不落盘，
  与 sequence 前缀语义一致）。需要条目级恢复就拆 subflow。

## 代码流程（v1 js 脚本，唯一形态）

**v0.9.0 起流程唯一形态 = v1 js 脚本**（`export const meta` + 魔法全局 +
顶层 return；JSON 于 v0.6.0 移除，defineWorkflow ESM 模块与 `.mjs`/`.cjs`
于 v0.9.0 移除——放进 flows 一律 fail-loud 并附改写指引）。项目 `flows/`
目录**缺省自动装载，零配置**；也可用 options `workflows: ["<路径>"]` 显式
指定（文件或目录）。装载规则：坏文件跳过并告警、保留 id 拦截、
同 id@version 去重：

```js
// flows/custom-logic.js —— 定义变量、写辅助方法、确定性逻辑全是原生 JS
export const meta = { name: 'custom_logic', description: '确定性逻辑示例' }

const slugify = (s) => String(s).trim().replaceAll(/\s+/g, '-').toLowerCase()

phase('Research')
const research = await agent(`针对「${args.topic}」写一句结论…`)

phase('Wrap')
const wrap = await agent(`原样返回：${research}`)

return { output: `${slugify(args.topic)}: ${wrap}` }
```

[opencode-dynamic-workflows](https://www.npmjs.com/package/@mickorz/opencode-dynamic-workflows)
（v1）时代的脚本体**原样放 flows/ 目录即可运行，不改写、不迁移**。识别
条件：文件含 `export const meta = {...}` 且不含 `defineWorkflow`。

20 个 v1 全局（`phase/agent/parallel/pipeline/sequence/fallback/race/check/
fileExists/commandSuccess/log/args/setConcurrency/verify/judgePanel/retry/
checkpoint/workflow/console/version`）由适配层绑定到 v2 原语：`meta.name`
即 flow id；agent/checkpoint/subflow 叶子调用动态进 journal（TUI 面板
实时可见）；可恢复失败（agent 超时 / schema / check 未过）在
parallel/pipeline 中塌缩 `null`、sequence 停止返 `null`（v1 语义）；
`checkpoint` 返回 boolean（拒绝不抛）；`schema` 选项
走结构化输出 shim；`version()` 返回当前插件版本。

与 v1 的差异（fail-loud）：`setConcurrency()` 警告后忽略（v2 并发由
executor 统一管理）；`phase()` 只进日志/事件（v2 面板无阶段分组）；
resume = 整体重跑；脚本内不能有 static `import` / 除 meta 外的 `export`。

要点：

- **保存即用（v0.6.1）**：`workflow` 工具遇到未知 flow id 会先增量重扫
  flows 目录——会话中途写好的新 `.js` 文件当场注册运行，无需重启
  （v1「定义即注册」体验对位）。边界如实：只有**新文件**能被拾取，
  **改动已装载文件**需重启（Node ESM 缓存按路径）
- **registry 完全同权**：内置与自定义都是 `id@version` 资产——journal /
  resume / 版本解析 / metrics / 面板详情与 Open Session 回放全部一致
  （代码流程的 sessionIDs 同样落盘）
- **`meta.name` 约束**：非空 snake_case（`^[a-z][a-z0-9_]*$`）、不撞内置
  （smoke/reliable/artifact/feature-development）；版本恒 `1.0.0`
  （结构变更靠文件语义，同 id 重复装载会报 duplicate）
- TS 用户：先 `tsc` 出 `.js`（装载器只认 `.js`，不内嵌 TS 编译）

## 并发 run（顶层多飞）

gate/workspace 的 run 级化让**并发顶层 run** 成为安全默认：同一进程可同时
跑最多 `maxConcurrentRuns`（默认 3）个 workflow——各自独立 journal /
workspace（worktree）/ checkpoint 门 / 进度快照，agent 步共享同一并发
信号量（公平排队，不会互相饿死）。

递归防护（防信号量自饿死）从「任一 run 在飞即拒绝一切」改为**按调用来源
判别**：executor 为每个 agent 任务创建的子会话在执行期内登记（`run-sessions`），
workflow 工具凭调用会话的自身/祖先链（`session.get` 的 `parentID`，封顶
8 跳）识别「来自 run 内部的调用」并拒绝（提示改用 subflow 组合）；顶层
用户会话不在任何 run 树内，正常放行。会话身份缺失的宿主环境保守退回旧
单飞语义。

调度器行为不变：scheduled slot 触发时若有任一 run 在跑（含手动并发 run），
该 slot 记 `skipped`——保持调度节奏可预期、避免并行成本意外，这是与手动
并发上限相互独立的设计取舍。

## Journal 数据模型

`<journalDir>/<runId>.json`（每次状态变更原子落盘）：

```jsonc
{
  "runId": "run_1790994713691_b9lhmqcs",
  "workflow": { "id": "artifact", "version": "1.0.0" },  // resume 精确版本解析依据
  "args": { "topic": "火星基地能源方案" },
  "workspace": { "provider": "git-worktree", "path": "...", "branch": "agw/run_..." },
  "parentRunId": "run_1790994700000_xxxx",  // P2-9 lineage：subflow 子 run 指回父 run（顶层无）
  "depth": 1,                                // 嵌套深度（顶层 0）
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
| workflow 形态 | 主 agent **运行时生成 JS 编排脚本**（VM 沙箱） | **代码定义**（JS 模块）+ 语义版本注册 |
| 调用方式 | 自然语言 → 生成脚本 → 执行 | `flow=<id>` + args（或 `resumeRunId`） |
| 原语 | agent / parallel / sequence / fallback / race | agent / parallel / sequence / phase + check / verify / checkpoint + **subflow** + **pipeline/race（代码组合子）** |
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
   自己并行开子会话完成即可（workflow 内的 agent 仍不可再调 workflow 工具；
   流程级组合用 subflow 步骤 / ctx.subflow，见「嵌套工作流」一节）。
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
