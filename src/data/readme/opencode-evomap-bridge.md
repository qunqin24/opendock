# opencode-evomap-bridge

`opencode-evomap-bridge` 是一个 **OpenCode 插件**，作为 OpenCode 与官方 `@evomap/evolver` CLI 之间的桥接层。它通过 OpenCode 的稳定 hooks 观察工具执行行为，将信号转发给 evolver 进行进化分析，并把 evolver 产出的观察结果转化为后续调用可消费的 advisory。

当 evolver CLI 不可用时，自动 fallback 到内置的本地规则引擎。

---

## 特性

- **evolver CLI 集成**：信号写入 evolver 的 `memory_graph.jsonl`，通过 `evolver run` 触发 GEP 进化分析
- **自动 fallback**：evolver 不可用时退回本地规则（repeat_failure / repeat_success / slow_execution）
- **Session 生命周期**：`session.created` 注入进化记忆，`session.idle` 触发 session-end 并写入结果
- **Doctor 诊断工具**：检查 evolver 安装状态、memory_graph 读写、插件注册、配置有效性
- 基于 **稳定 hooks**：`tool.execute.before` / `tool.execute.after` + `event`
- **System prompt 注入**：通过 `experimental.chat.system.transform` 将 evolver 进化记忆注入系统提示
- **Session compaction 上下文保留**：通过 `experimental.session.compacting` 在压缩时保留 observation 和记忆
- 使用 **session / project** 两级状态
- 带 fail-open、防回流、冷却时间、使用次数上限等保护机制

---

## 架构

```
OpenCode 插件 (适配层)
  │
  ├─ event(session.created) ─→ 读 evolver memory_graph → 注入进化记忆
  │
  ├─ experimental.chat.system.transform ─→ 将进化记忆注入系统提示
  │
  ├─ tool.execute.after ─→ buildSignal() → queue
  │                                         │
  │                             onSignal(signal, directory):
  │                               ├─ state.appendSignal()
  │                               └─ deriveObservationsWithEvolver():
  │                                   ├─ evolver 可用?
  │                                   │   ├─ signal → memory_graph.jsonl
  │                                   │   ├─ spawn evolver run
  │                                   │   └─ 读回 GEP observations
  │                                   └─ fallback → 本地 deriveObservations()
  │
  ├─ tool.execute.before ←─ 读 observations → 选择 advisory
  │
  ├─ experimental.session.compacting ─→ 保留 observations + 记忆到压缩上下文
  │
  └─ event(session.idle) ─→ 构造 session-end 条目 → 写入 memory_graph
```

---

## 项目结构

```text
.opencode/plugin/evomap.ts   # 插件入口（hooks + event 注册）
src/
  spawn.ts                   # evolver CLI 检测、spawn、超时处理
  bridge.ts                  # OpenCode signal ↔ evolver 格式转换
  evolver.ts                 # deriveObservationsWithEvolver + 本地 fallback
  doctor.ts                  # 诊断工具（检查 evolver、memory_graph、配置）
  advisory.ts                # advisory 选择、标记、渲染
  state.ts                   # session / project 两级状态管理
  queue.ts                   # 异步信号队列
  config.ts                  # 默认配置
  types.ts                   # 核心类型定义
  util.ts                    # 工具函数
tests/
  evolver.test.ts            # 本地 observation 规则测试
  state.test.ts              # 状态管理测试
  bridge.test.ts             # 格式转换 + spawn 测试
  doctor.test.ts             # 诊断工具测试
BLUEPRINT.md                 # 实施蓝图
```

---

## 安装

### 前置条件

```bash
# 安装 evolver CLI
npm install -g @evomap/evolver
```

### 方式 1：作为本地插件使用

```json
{
  "plugin": [
    "file:///absolute/path/to/opencode-evomap-bridge/.opencode/plugin/evomap.ts"
  ]
}
```

### 方式 2：作为 npm 包使用

```json
{
  "plugin": ["opencode-evomap-bridge"]
}
```

---

## 配置

插件使用默认配置即可运行。以下是与 evolver 集成相关的配置项：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `evolverBinary` | `"evolver"` | evolver CLI 二进制名称 |
| `evolverSpawnTimeoutMs` | `5000` | evolver spawn 超时（毫秒） |
| `evolverFallbackToLocal` | `true` | evolver 不可用时是否 fallback 到本地规则 |

其他配置项：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `enabled` | `true` | 是否启用插件 |
| `maxRecentSignals` | `50` | session 中保留的 recent signals 数量 |
| `maxAdvisoriesPerCall` | `2` | 每次工具调用最多注入的 advisory 数量 |
| `maxAdvisoryUses` | `3` | 每个 advisory 最大使用次数 |
| `advisoryCooldownMs` | `120000` | advisory 冷却时间（2 分钟） |
| `repeatFailureThreshold` | `3` | repeat_failure 触发阈值 |
| `repeatSuccessThreshold` | `2` | repeat_success 触发阈值 |
| `slowExecutionMs` | `10000` | 慢执行阈值（10 秒） |
| `internalErrorThreshold` | `5` | 连续错误后禁用插件 |

---

## 诊断工具

使用 doctor 工具检查 evolver 集成健康状态：

doctor 同时支持两种插件注册方式：

- 本地开发模式：`<project>/.opencode/plugin/evomap.ts`
- npm 安装模式：`<project>/node_modules/opencode-evomap-bridge/.opencode/plugin/evomap.ts`

```typescript
import { runDoctor, formatDoctorResult } from "opencode-evomap-bridge/doctor";

const result = await runDoctor(process.cwd());
console.log(formatDoctorResult(result));
```

输出示例：

```text
=== EvoMap Bridge Doctor ===

  ✓ Evolver CLI Detection: evolver v1.69.0 found at /usr/local/bin/evolver
    → /usr/local/bin/evolver
  ⚠ Evolver Root Directory: .evomap/ directory not found (will be created on first use)
    → /path/to/project/.evomap
  ⚠ Memory Graph Access: memory_graph.jsonl not found (will be created on first use)
  ✓ Plugin Registration: Plugin file exists at .opencode/plugin/evomap.ts
  ✓ Configuration Check: Configuration valid (evolverBinary=evolver, timeout=5000ms, fallback=true)

Summary: 2 warnings
```

---

## 数据存储

### 插件状态（OpenCode 侧）

```text
~/.opencode/evomap-bridge/<project-hash>/
├── project-state.json
└── sessions/<session-id>.json
```

### evolver 数据（EvoMap 侧）

```text
<project>/.evomap/
└── memory/evolution/
    └── memory_graph.jsonl
```

---

## 开发

```bash
bun install
bun run typecheck
bun run test
```

---

## 测试

27 个测试覆盖全部模块：

| 测试文件 | 覆盖 |
|----------|------|
| `tests/evolver.test.ts` | 本地 observation 规则 + advisory 渲染 |
| `tests/state.test.ts` | session/project 状态管理 |
| `tests/bridge.test.ts` | 格式转换、memory_graph 读写、spawn 路径 |
| `tests/doctor.test.ts` | 5 项诊断检查 + 格式化输出 |

---

## 限制

- 不做 repo 级自动规则落盘
- 不接外部 mailbox / worker / Hub
- advisory 是追加到工具输出，而不是前置改写模型推理链
- evolver CLI 的 `setup-hooks` 官方不支持 OpenCode 平台

---

## 后续可扩展方向

- 集成 Hub / Proxy / skill store 网络能力
- 增加人工审核的 repo-candidate 提升流程

---

## 设计文档

详细实施蓝图见 `BLUEPRINT.md`。
