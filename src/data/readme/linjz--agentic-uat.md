# Agentic UAT

**UAT by AI agents — 驾驭 AI 执行体完成验收测试，人类只做裁判。**

[English](#english) | [中文](#中文)

---

## English

Agentic UAT is a two-skill methodology package for AI-agent-era user acceptance testing:

- **acceptance-contract-governance** (v1.9.0) turns an intent such as "test feature X thoroughly" into a self-contained, executable acceptance-instruction document. It provides AC-ID-based verification points with real entry paths (`[UI]`/`[MACHINE]`), scenario modeling, four live sources of test basis (PRD cross-cut, defect ledger, live UI/endpoint reconnaissance, and eleven-dimension depth analysis), machine-checkable coverage metrics, and a final-report gate.
- **simulated-user-acceptance** (v3.9.0) executes that document as real users: persona-based end-to-end journeys, bounded interaction control, UI-primary evidence, L1/L2/L3 coverage, blocked-attribution auditing (`UNREACHABLE`/`UNAUTHORIZED`/`OBSERVABILITY_BLOCKED`/`DEFERRED`/`BUDGET_EXHAUSTED`/`OMITTED`), three-state reporting (`FINAL`/`FINAL-WITH-GAPS`/`INTERIM`), and artifact-tree gates.

**What it is not**: this is not a framework for testing agent harnesses, and it is not a unit-test generator. It is a methodology for letting AI agents perform user acceptance testing while humans retain judgment.

### How the two skills work together

```text
Your intent             Generation-side governance        Execution-side UAT             Feedback
"Test XX thoroughly" →  acceptance-contract-governance  →  simulated-user-acceptance  →  Project knowledge
                        ├─ Four live test-basis sources     ├─ Real persona journeys       (B hypotheses,
                        ├─ Scenarios + AC-ID points         ├─ UI proof + blocked audit      fixtures/playbooks,
                        ├─ Self-contained task book         ├─ Three-state report            new AC proposals,
                        └─ Thresholds and risk choices      └─ Artifact tree                 next generation)
                        Generation ≠ Execution              Runtime = this task book + this run's evidence
```

The following division of labor has a single source in `references/skill-interface.md` inside the governance skill:

| Concern | Owner | What it means |
|---|---|---|
| Test basis, AC-IDs, and coverage formulas | Governance | `coverage-metrics.md` is the only authority |
| Report states, artifact tree, and evidence naming | Execution | `artifact-conventions.md` is the only authority |
| Rules used during execution | Frozen task-book snapshot | No live skill-version switching; stricter host safety rules always win |
| Generation versus execution | Strictly separated | Generating and then executing without review can harden unvetted depth into execution |

A typical flow is: state an intent such as "test module XX thoroughly" or "test the whole project in depth" → governance produces a self-contained task book → any carrier satisfying task injection, environment reach, and bounded-loop requirements executes it book-in-hand under the execution skill's discipline → the report lands in the artifact tree → lessons return to project-side knowledge and new acceptance-point proposals return to the next generation cycle.

### Coverage and execution model

The package covers both requirement coverage and business-combination coverage. The latter is optional for genuinely independent simple ACs and mandatory when any AC contains joint conditions, an explicit decision table or state transition, a high-risk combination, scenario regrouping, or cross-scenario/reverification traceability.

Terminology: AC = acceptance criterion, Cell = business-condition cell, Case = executable subcase, Run = one execution, and profile = the optional combination-coverage scheme.

- **Design**: current test-basis sources define dimensions, values, and constraints. Each required Cell has at least one primary Case; each Case has one primary Cell and one primary AC. Independent simple ACs use an implicit single-cell `AC=Case` mapping. High-risk boundaries and rejection cells are mandatory; ordinary combinations may use Pairwise or remain documented candidates. Case counts are derived, never preset to targets such as 31 or 64.
- **Execution**: the Run master table records each execution once. Run-Case details hold one `Run×Case` per row with assertion-level verdicts and evidence. The Case status table records executed cases as well as cases with evidence of being unimplemented or not applicable (`⏭️`) and `BLOCKED` cases; the latter two categories do not require a product-execution Run. The latest FULL Run-Case—one covering all planned assertions for that Case—forms the baseline; later PARTIAL Run-Case details only supplement or downgrade it: partial failures override earlier passes, partial passes cannot flip a case green, and a partial pass without a full baseline is only PARTIAL. REVERIFY uses `reverify_of` to preserve identity.
- **Judgment and evidence**: AC state aggregates all primary and secondary assertions. MIXED states retain the complete cause set, so budget exhaustion and omission cannot disappear into an external-gap classification. Planned references determine whether evidence is mapped; relabeling evidence as `UNMAPPED_OBSERVATION` cannot bypass mapping. Evidence completeness selects `INTERIM`, `FINAL-WITH-GAPS`, or `FINAL`; it does not independently block fallback-report generation or the separate execution-lifecycle marker `CLOSED`, which is not a fourth report state.

### Compatible execution carriers

The skills impose three hard requirements on an execution agent. Any harness satisfying them is a legal carrier:

1. **Task injection**: accepts task text non-interactively through a headless CLI, session API, or script interface, so runs can be scheduled or triggered externally.
2. **Environment reach**: provides file-system read/write access for the artifact tree and at least one UI-driving channel, such as browser automation, desktop input, or delegated human operation.
3. **Bounded loop**: follows fresh observation → authoritative verification → progress-proof retry ladder → hard budget instead of running without bounds.

| Carrier | Carrier form | Status |
|---|---|---|
| OpenCode | Native skill discovery + `opencode run` headless | ✅ Verified; the methodology's home carrier |
| Claude Code | `claude -p` headless + skills + computer use | Architecture-compatible; community reports welcome |
| Codex CLI / ChatGPT | Non-interactive execution mode | Architecture-compatible |
| Gemini CLI | Headless print mode | Architecture-compatible |
| Cursor / Copilot (VS Code) | Agent mode + asynchronous coding agent | Partially architecture-compatible; weaker task injection may require external scheduling wrappers |
| OpenClaw / WorkBuddy / Hermes Agent | Host agents with a CLI or gateway entry | Architecture-compatible |

> **Compatibility caveat**: carriers other than OpenCode are compatible at the architecture level, not battle-tested. First real runs on a new carrier may require carrier-specific SOP additions; contribute those lessons back as project-side playbooks.

### Design tenets

- **Human-first judgment**: human GUI/TUI/CLI/API workflows stay UI; machine callers use their product contract; internal APIs remain auxiliary.
- **Persona journeys first**: scenarios represent real user goals and continuous journeys. AC, scenario, and REVERIFY counts cannot substitute for branch coverage.
- **GUI fidelity**: when a human persona's primary GUI is reachable, real GUI events are mandatory; CLI/API cannot be used merely to ease automation or bypass UI defects.
- **Bounded autonomy**: fresh perception, authoritative verification, progress-proof retries, scoped blocking, and hard budgets ensure every task terminates with a report.
- **Scoped execution profiles**: `SINGLE_WRITER` always includes the autonomous long-task core and one-shot resumption; `PARALLEL_UNATTENDED` adds leases/CAS/fencing only for actual parallel writers or external takeover.
- **Risk-bounded coverage**: high-risk cells are mandatory while ordinary combinations remain risk-sampled; Pairwise is explicitly non-exhaustive and never becomes a hidden full Cartesian product.
- **Portable fixtures**: repayment, permission governance, and user order handling share one schema with domain-specific data kept outside the core methodology.
- **Machine-checkable gates**: coverage, mapping, evidence, encoding, and report truth tables are computed and tested with positive and negative fixtures rather than asserted by prose.
- **Carrier neutrality**: OpenCode is one supported carrier, not a dependency; other agents can execute a frozen task book without owning these skills.
- **Standards alignment**: ISO/IEC/IEEE 29119-3 documentation separation, three-state reporting, and explicit artifact conventions.

### Install

Choose one of three equivalent installation routes.

**Route A — HTTP catalog (native, zero copy)**

Add the catalog URL to `opencode.json(c)`. This release is pinned to `v1.1.0`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": ["https://cdn.jsdelivr.net/gh/linjz3376/agentic-uat@v1.1.0/catalog/"]
}
```

**Route B — npm**

Windows Command Prompt:

```bat
npm i -g @linjz/agentic-uat@1.1.0
xcopy /E /I "%APPDATA%\npm\node_modules\@linjz\agentic-uat\skills\*" "%USERPROFILE%\.config\opencode\skills\"
```

macOS / Linux:

```sh
npm i -g @linjz/agentic-uat@1.1.0
mkdir -p ~/.config/opencode/skills
cp -R "$(npm root -g)/@linjz/agentic-uat/skills/." ~/.config/opencode/skills/
```

**Route C — git**

```sh
git clone --branch v1.1.0 --depth 1 https://github.com/linjz3376/agentic-uat
# Add this to opencode.json(c):
# "skills": ["/absolute/path/to/agentic-uat/skills"]
```

After installation, an intent such as "test module XX thoroughly" routes to the governance skill for task-book generation; executing that book routes to the execution skill. Any carrier satisfying all three requirements above can execute the frozen book—OpenCode, Claude Code, Codex, or your own harness.

### Repository layout and versions

```text
skills/   The two portable skills in directory form
catalog/  HTTP catalog for Route A: index.json plus the files for each skill
README.md Complete English and Chinese documentation
LICENSE   MIT license
```

- Bundle package version: **1.1.0**
- acceptance-contract-governance: **1.9.0** ([changelog](skills/acceptance-contract-governance/references/changelog.md))
- simulated-user-acceptance: **3.9.0** ([changelog](skills/simulated-user-acceptance/reference/changelog.md))

The package semver tracks the bundle. Each skill maintains its own version history in its changelog.

### License

MIT © linjz. See [LICENSE](LICENSE).

---

## 中文

Agentic UAT 是面向 AI 智能体时代的用户验收测试双技能方法学包：

- **acceptance-contract-governance**（v1.9.0）把「重点测 XX」转换为自包含、可直接执行的验收任务书：带真实入口（`[UI]`/`[MACHINE]`）的 AC-ID 验收点、场景建模、测试依据（test basis）四活源（PRD 横切、缺陷台账、现行 UI/端点侦察、十一维深度分析）、机验覆盖度量与收官闸。
- **simulated-user-acceptance**（v3.9.0）以真实用户身份执行任务书：persona 端到端旅程、有界交互控制、UI 主证、L1/L2/L3 覆盖、受阻归因审计（`UNREACHABLE`/`UNAUTHORIZED`/`OBSERVABILITY_BLOCKED`/`DEFERRED`/`BUDGET_EXHAUSTED`/`OMITTED`）、三态报告（`FINAL`/`FINAL-WITH-GAPS`/`INTERIM`）与产物树闸门。

**不是什么**：不是用于搭建测试智能体的框架，也不是单元测试生成器；它是让 AI 执行体完成用户验收测试、由人类保留裁判权的方法学。

### 两技能如何协作

```text
你说出意图             生成侧治理                        执行侧验收                    闭环回灌
「重点测 XX」  →      acceptance-contract-governance → simulated-user-acceptance → 项目侧知识
                     ├─ 四活源挖素材                     ├─ persona 真实连续旅程       （B 表变异假设、
                     ├─ 场景建模 + AC-ID 验收点          ├─ UI 主证 + 受阻归因审计        fixtures/playbooks、
                     ├─ 自包含任务书                     ├─ 三态报告与产物树             新验收点提交、
                     └─ 门槛与风险选择                   └─ 本轮实际执行与证据           下一轮生成）
                     生成任务 ≠ 执行任务                     执行期只看本轮任务书+本轮实测
```

以下分工以治理技能内 `references/skill-interface.md` 为单源：

| 关注点 | 归属 | 含义 |
|---|---|---|
| test basis、AC-ID、覆盖公式 | 生成侧治理 | `coverage-metrics.md` 是唯一权威 |
| 报告三态、产物树、证据命名 | 执行侧验收 | `artifact-conventions.md` 是唯一权威 |
| 执行期使用的规范 | 本轮任务书冻结快照 | 不追随外部技能最新版本；宿主更严安全规则始终优先 |
| 生成任务与执行任务 | 严格分离 | 生成后不经评审直接执行，可能把未通过质量闸的深度分析结果固化进执行 |

典型流程：你说「重点测 XX 模块」或「全项目深度测一遍」→ 治理技能产出自包含任务书 → 任意满足任务注入、环境可达和有界循环三项要求的执行体拿着任务书，按执行侧纪律完成验收 → 报告落产物树 → 经验回灌项目侧知识库，新验收点提交给下一轮生成。

### 覆盖与执行模型

本包同时度量需求覆盖与业务组合覆盖。彼此独立的简单 AC 可使用轻量路径；任一 AC 存在联合条件、显式判定表或状态转换、高风险组合、场景重分组、跨场景或复验归格时，则必须展开组合覆盖 profile。

术语：AC＝验收点，Cell＝业务条件组合格，Case＝执行子用例，Run＝一次执行，profile＝组合覆盖方案。

- **设计期**：以当前 test basis 定义维度、取值和约束。每个必需 Cell 至少有一个主 Case，每个 Case 固定一个主 Cell 和一个主 AC；独立简单 AC 以隐式单格 `AC=Case` 简并。高风险边界与拒绝格必须执行，普通组合可 Pairwise 或保留为带残余风险的候选格。Case 数量由选择结果派生，禁止先定 31 或 64 条再倒推覆盖。
- **执行期**：Run 主表一行记录一次执行；Run-Case 明细一行一个 `Run×Case`，逐断言保存判定和证据；Case 状态表记录已执行 Case，也记录有证据证明未实现或不适用的 `⏭️` Case 与 BLOCKED Case；后两类不要求产品执行 Run。以最近一次覆盖该 Case 全部计划断言的 Run-Case 明细（FULL，完整断言执行）作为基线；较晚的 Run-Case 明细（PARTIAL，部分断言执行）只补充或降级——部分 ❌覆盖旧 ✅，部分 ✅不能整体翻绿，无完整基线的部分 ✅只能是 PARTIAL。复验（REVERIFY）通过 `reverify_of` 保持原 Case 身份。
- **判定与证据**：AC 当前状态聚合主、次全部断言；混合判定（MIXED）保留完整原因（cause）集合，预算耗尽和遗漏不得被掩盖为合法的外部缺口。计划引用决定证据是否必须归格，不得通过改标 `UNMAPPED_OBSERVATION` 绕过归格要求。证据完整性决定 `INTERIM`、`FINAL-WITH-GAPS` 或 `FINAL`，但不额外阻止保底报告或独立执行生命周期结果 `CLOSED`；`CLOSED` 不是第四种报告状态。

### 兼容执行载体

技能对执行体只有三项硬要求，任一 harness 满足即成为合法载体：

1. **任务注入**：支持 CLI headless、会话 API 或脚本接口等非交互任务文本注入，使窗口与触发器可以按计划执行。
2. **环境可达**：支持文件系统读写产物树，并至少提供一种 UI 驱动通道，例如浏览器自动化、桌面输入或委托真人操作。
3. **有界循环**：遵守新鲜感知 → 权威求证 → 进展证明重试阶梯 → 硬预算，而不是无界自由运行。

| 载体 | 形态 | 状态 |
|---|---|---|
| OpenCode | 原生技能发现 + `opencode run` headless | ✅ 已实证，方法学的原生载体 |
| Claude Code | `claude -p` headless + skills + computer use | 架构兼容，欢迎社区实测反馈 |
| Codex CLI / ChatGPT | 非交互执行模式 | 架构兼容 |
| Gemini CLI | Headless print 模式 | 架构兼容 |
| Cursor / Copilot（VS Code） | Agent 模式 + 异步 coding agent | 部分架构兼容；任务注入较弱时可能需要外部调度包装器 |
| OpenClaw / WorkBuddy / Hermes Agent | 带 CLI 或 gateway 入口的宿主 agent | 架构兼容 |

> **兼容性说明**：OpenCode 之外的载体仅经过架构层核对，尚非实战验证。新载体首次真实执行可能需要补充专属 SOP，欢迎将这些经验回灌为项目侧 playbook。

### 设计原则

- **人类判断优先**：人类 GUI/TUI/CLI/API 工作流始终属于 UI；真实机器调用方使用产品契约；内部 API 只作辅证。
- **persona 旅程优先**：场景表达真实用户目标与连续旅程，AC、场景和 REVERIFY 数量都不能替代分支覆盖。
- **GUI 拟真**：人类 persona 的日常主 GUI 可达时必须使用真实 GUI 事件，不得为自动化省事或绕过 UI 缺陷改用 CLI/API。
- **有界自主**：新鲜感知、权威求证、进展证明重试、最小作用域阻塞和硬预算，确保每个任务都能终止并出报告。
- **执行模式分域**：`SINGLE_WRITER` 始终包含自主长任务内核和一次性汇总判定；只有真实并行写者或外部接管才由 `PARALLEL_UNATTENDED` 增加租约、CAS（比较并交换）和 fencing（隔离旧写者）。
- **风险有界覆盖**：高风险格必须执行，普通组合按风险抽样；Pairwise 明确非穷尽，不得暗中退化为全笛卡尔积。
- **可移植夹具**：履约还款、权限治理、用户办单共用同一 schema，行业数据留在通用内核之外。
- **机验质量闸**：覆盖、映射、证据、编码和报告真值表均由正反夹具计算验证，而不是仅靠文字声明。
- **载体中立**：OpenCode 是受支持载体之一而非依赖；其他 agent 不安装本技能也能执行冻结任务书。
- **标准对齐**：对齐 ISO/IEC/IEEE 29119-3 文档分层、三态报告和显式产物约定。

### 安装

以下三种方式等价，任选其一。

**方式 A：HTTP catalog（原生零拷贝）**

在 `opencode.json(c)` 中加入 catalog 地址。本发布固定为 `v1.1.0`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": ["https://cdn.jsdelivr.net/gh/linjz3376/agentic-uat@v1.1.0/catalog/"]
}
```

**方式 B：npm**

Windows 命令提示符：

```bat
npm i -g @linjz/agentic-uat@1.1.0
xcopy /E /I "%APPDATA%\npm\node_modules\@linjz\agentic-uat\skills\*" "%USERPROFILE%\.config\opencode\skills\"
```

macOS / Linux：

```sh
npm i -g @linjz/agentic-uat@1.1.0
mkdir -p ~/.config/opencode/skills
cp -R "$(npm root -g)/@linjz/agentic-uat/skills/." ~/.config/opencode/skills/
```

**方式 C：git**

```sh
git clone --branch v1.1.0 --depth 1 https://github.com/linjz3376/agentic-uat
# 在 opencode.json(c) 中加入：
# "skills": ["/absolute/path/to/agentic-uat/skills"]
```

安装后，「重点测 XX 模块」会路由到治理技能生成任务书；执行该任务书会路由到执行技能。任何满足上述三项要求的载体都能执行冻结任务书，包括 OpenCode、Claude Code、Codex 或自建 harness。

### 仓库结构与版本

```text
skills/   两个可移植技能的目录形态
catalog/  方式 A 的 HTTP catalog：index.json 与各技能文件
README.md 可独立阅读的中英文完整文档
LICENSE   MIT 许可证
```

- 整包版本：**1.1.0**
- acceptance-contract-governance：**1.9.0**（[变更记录](skills/acceptance-contract-governance/references/changelog.md)）
- simulated-user-acceptance：**3.9.0**（[变更记录](skills/simulated-user-acceptance/reference/changelog.md)）

整包按语义化版本（semver）演进，两个技能分别在各自变更记录中维护独立版本历史。

### 许可

MIT © linjz，详见 [LICENSE](LICENSE)。
