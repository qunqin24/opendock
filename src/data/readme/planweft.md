[简体中文](README.md) | [English](README.en.md)

> PlanWeft 0.4.0 正在按能力分级门禁做正式发布验收。五宿主确定性核心能力与 Codex 显式维护→独立冷读是硬门槛；模型自动采用和 autonomous/gated 保持证据定级或实验性。见[发布清单：中文](docs/releasing.md) / [English](docs/releasing.en.md)。

# PlanWeft

**让 Agent 的任务进展、设计理由和验证结果留在项目里，供后续会话和协作者接续。**

PlanWeft 是面向编程 Agent 的文件规划与项目文档协作插件。它以 **planning-with-files（PWF）v3.17.0** 为固定运行底座，在任务规划与恢复流程中，默认加入按需文档维护、设计依据检查和可复核交接。

它适合需要跨会话完成的功能开发、维护、调查和设计工作：既要继续当前任务，也要保留已经确认的需求、重要决定与实际验证。小改动只维护必要资料，沿用项目已有目录和规则。

| 阅读目的 | 中文 | English |
| --- | --- | --- |
| 安装、更新、回退与卸载 | [安装指南](docs/installation.md) | [Installation guide](docs/installation.en.md) |
| 理解平台适配、分发和能力差异 | [跨平台设计](docs/platforms.md) | [Cross-platform design](docs/platforms.en.md) |

## 实现思想

**用项目文件承接工作上下文。** 复杂任务使用选定的 PWF 计划目录保存目标、发现和操作记录。新会话从项目记录恢复；读取宿主会话历史仍需显式调用。一个计划由一个 owner 维护，worker 使用独立记录，独立任务使用不同计划或 worktree。

**让任务记录与长期文档各司其职。** 三文件服务于正在进行的任务，稳定知识按需进入项目已有的规格、ADR 和复现记录。不会为每个小改动生成整套文档，也不会为了迎合代码现状改写已经批准的需求。

| 记录 | 职责 |
| --- | --- |
| `task_plan.md` | 当前任务的唯一动态状态：目标、阶段、下一步、阻塞及证据入口 |
| `findings.md` | 调研发现、来源、假设和候选决定 |
| `progress.md` | 实际操作、错误、测试和观察 |
| specs | 目标行为、边界和批准的验收要求 |
| ADR | 重要设计选择、替代方案、理由和后果 |
| reproduction | 值得长期保存的环境、复现步骤、结果和限制 |

**把依据检查与交接检查分开。** 实质设计需要准确来源；资料不足时记录实际检索和未验证项。重要设计由独立 reviewer 核查依据，重要交接由不带旧聊天的新读者检查可接续性。两类检查使用宿主已有 Agent 能力；它们是 Skill 的工作约定，没有额外调度服务。

**让自动化保持明确边界。** 主入口 `project-docs` 可以由支持的宿主按任务匹配，默认运行时以提醒为主，autonomous/gated 和原生执行方式按平台显式选择。项目规则、用户范围、只读要求和宿主信任优先；attestation 校验文件内容，完成门禁检查状态，二者都不能证明人工批准或语义正确。

## 一次任务如何推进

1. 读取项目入口和任务约束，定位已有规格、决定与验证资料。
2. 对获准执行的复杂工作，解析或初始化所属 PWF 计划；阅读、诊断和简单工作保持相应的最小范围。
3. 实施时记录发现与实际操作，最小更新受影响的项目文档，保护用户已有修改。
4. 用 Passed、Failed、Inconclusive、Not Run 记录验证；核对批准需求与实际结果，说明限制。
5. 按任务重要程度完成独立依据 review 或新读者交接，留下可执行的下一步。

这些约定依赖 Agent 正确读取并遵循 Skill。插件提供记录、恢复和宿主适配能力，任务效果仍需要实际验证。

## 与相关方案的比较

以下比较针对本仓实际参考的固定版本，展示关注点与借鉴关系，不作性能排名。链接指向对应原始资料。

| 方案 | 主要关注点 | PlanWeft 的借鉴与差异 |
| --- | --- | --- |
| **PlanWeft** | 跨会话的任务状态、长期文档、设计依据与交接 | 在 PWF 底座上整合下列方法，并提供按宿主生成的分发；尚未证明效果优于其他方案 |
| [PWF v3.17.0](https://github.com/OthmanAdi/planning-with-files/blob/0d21b6c4aa5f2c5bdd3d042e7473ee09f7fae9e7/skills/planning-with-files/SKILL.md) | 三文件任务工作记忆、恢复、hooks 和计划控制 | 直接移植运行时与状态协议，将按需文档维护、依据与交接检查融入默认工作流；PWF 本身也建议长期知识另存 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec/blob/e062b9572be933564ba3899d059377dfa1393e32/docs/concepts.md) | 行为规格、变更提案、设计、任务、增量规格与归档 | 借鉴目标行为、设计与任务的分工，以及与风险相称的严谨度；未集成其 schema 或增量合并引擎 |
| [Superpowers](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/writing-plans/SKILL.md) | 包含文件、测试和执行交接的可执行小任务计划 | 借鉴可接续计划及宿主薄适配；未移植其整套必需 Skill 链，也不统一强制 TDD 流程 |
| [doc-coauthoring](https://github.com/anthropics/skills/blob/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/doc-coauthoring/SKILL.md) | 收集上下文、逐步完善文档、无旧上下文读者测试 | 借鉴独立读者检查；来源依据 review 是本项目另行加入的要求 |
| [MADR](https://github.com/adr/madr/blob/ba75bb1b20d42af5746b246ad348c202419ae681/template/adr-template.md) | 记录重要选择、备选、理由、后果与确认方式 | 借鉴最小 ADR 结构，按需保存长期决定；MADR 本身不承担任务恢复或插件运行职责 |

PWF 的[任务完成后指导](https://github.com/OthmanAdi/planning-with-files/blob/0d21b6c4aa5f2c5bdd3d042e7473ee09f7fae9e7/docs/workflow.md)已经区分任务工作记忆和长期文档；Superpowers 的[原生适配源码](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/.pi/extensions/superpowers.ts)是薄适配的另一处参考。除此之外，本仓也参考 OpenAI 的仓库知识与可接续计划实践，以及 Diátaxis 的文档职责分类。完整来源、许可与具体借鉴位置登记在[引用台账（工程记录，中文）](docs/design-references.md)和[资料索引（工程记录，中文）](docs/reference/README.md)。

## 本仓库新增与原创实现

本项目的贡献在于具体的工作流整合和工程实现：

- **默认文档协作流程**：把已有文档维护、准确来源、批准需求保护、验证状态和独立交接接入 `project-docs`，形成统一的[工作流扩展](overlays/planweft/workflow.md)。
- **可追溯构建与分发**：固定上游快照、本地 overlays 和[生成器](scripts/build-plugin.py)共同生成平台目录；用逐文件内容与执行位摘要检测漂移，维护统一产品身份。
- **宿主适配与发布准备**：[原生适配层](overlays/planweft/native/adapters.py)处理安装资产定位、事件协议和发现差异；[发布准备工具](scripts/prepare-native-release.py)生成 npm 原生产物及包根 Git 发布树。
- **与安装内容对应的验证**：记录真实安装文件、更新增改删、回退、卸载和项目文档保护，区分脚本协议、宿主加载与模型行为。

这里的“原创实现”指本仓库编写的扩展与组合贡献，不表示首创文件规划、ADR、冷读测试或生成分发，也不表示已经证明所有平台行为或任务效果一致。运行时继承与本地差异可按[补丁清单（工程记录，中文）](overlays/planweft/PATCHES.md)追溯；方法新颖性按[创新记录（工程记录，中文）](docs/innovations.md)单独判断。

## 当前交付与使用边界

**0.4.0** 提供一个 `planweft` npm 包，包含安装 CLI、Pi Extension、OpenCode V1 入口及 15 个平台资源目录（含 DSH 原生 bundle）；另有 6 种原生 marketplace 入口和 Gemini/Hermes Git 发布树准备工具。五宿主核心能力、Codex 正式工作流、Pi 证据定级及十个实验适配器的准确边界由 [`release/support-policy.json`](release/support-policy.json) 声明。安装方法见[中文指南](docs/installation.md) / [English guide](docs/installation.en.md)，平台能力与验证范围见[中文设计](docs/platforms.md) / [English design](docs/platforms.en.md)。

0.3.0 的记录包含八个宿主的本地安装生命周期验证；Hermes 被默认扫描器拒绝安装。RC4 五个核心宿主的远端 npm 生命周期及 Codex/Claude 公开 Git 同提交刷新已通过；Windows/macOS 安装器 CI 通过，真实宿主与 GUI 仍有 Not Run 项，模型维护/冷读还存在待解决失败。历史验证不随文档修改自动变成新一轮实测，具体边界见上述跨平台文档。

GitHub 仓库与 npm 候选版已公开；稳定 `0.4.0` 只有在预发布门禁、三系统 CI、`next` 远端验收和 promotion 门禁全部通过后才会提升为 `latest`。各分发保留 PWF 的 MIT 版权与许可，其他参考材料按各自许可处理。本仓自身继续沿用既有文档入口，没有正式迁移到插件管理。

维护者资料：[开发约定（中文）](docs/development.md) · [上游维护（中文）](docs/upstream-maintenance.md) · [测试与证据入口（中文）](tests/README.md)。这些工程记录保留原语言；对外项目介绍、安装和跨平台设计均提供上述中英文版本。
