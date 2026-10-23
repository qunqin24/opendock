# cross-session-messaging

**[English](./README.md)**

一个 [OpenCode](https://opencode.ai) **plugin**，让同一台机器上的多个 session 互相通信——无论它们是否在同一个 daemon 进程里。任何 session 都能把自己的任务概要注册到共享 registry，发现其他活跃 session，并向指定 session 发起一次**阻塞式提问**，由对方的 AI 自动生成回复。

> **状态**：核心已实现——3 个工具 + `session.deleted` 事件钩子 + TUI 面板 + **62 个单元测试 0 fail** + `tsc --noEmit` 干净。

## 为什么

多 agent 编排场景下，session 之间需要跨会话交换上下文，但 OpenCode 本身没有内置的"A 问 B"原语。这个 plugin 补上这一层。

**为什么做成 in-process plugin 而不是外部 MCP server？** 外部 MCP server 的 HTTP 超时会打断长时间等待，而 in-process plugin 的 `execute()` 没有这个限制——可以阻塞数分钟等回复，传输层不会断。

**为什么用基于文件的 IPC？** Session 可能跑在不同的 daemon 进程里（比如不同终端窗口）。基于文件的传输层（`~/.local/state/opencode/messages/`）让跨 daemon 通信不需要共享服务进程。每个 daemon 运行一个 `InboxWatcher`，轮询属于自己 session 的入站请求。

## 三个工具

| 工具 | 用途 |
|---|---|
| `register_session(summary)` | 把当前 session 的任务概要注册到共享 registry |
| `list_sessions(includeSelf?)` | 读 registry，给 `ask_session` 挑目标（默认过滤掉自己；>24h 陈旧条目自动隐藏） |
| `ask_session(sessionId, question, timeoutMs?)` | 向目标 session 发问 + 等 AI 回复。**从不 throw**——所有失败路径都返回可读的错误文本 |

`ask_session` 默认超时 60 秒，上限 10 分钟。无论什么失败（目标不存在、超时、abort、空回复），都返回描述性错误文本，绝不抛异常。

## 工作流程

```
Session A (Daemon 1)                    Session B (Daemon 2)
────────────────────                    ────────────────────
1. ask_session(B, question)
   │
   ├─ 校验 B 在 registry 中存在
   ├─ 写 .req.json 到 messages/
   ├─ 轮询 .res.json ...                InboxWatcher 扫描 messages/
   │                                     ├─ 发现 B 的 .req.json
   │                                     ├─ 校验 daemonId 匹配
   │                                     ├─ 通过 SDK 向 B 发送 prompt
   │                                     ├─ 轮询 assistant 回复
   │                                     └─ 写 .res.json
   ├─ 读取 .res.json
   ├─ 清理两个文件
   └─ 返回回复文本
```

### 请求/响应生命周期

1. **调用方**写入 `{requestId}.req.json`，包含问题内容
2. **目标的 InboxWatcher** 拾取该文件，验证 `daemonId` 归属，通过 `client.session.promptAsync` 发送 prompt，轮询 assistant 回复
3. **目标的 InboxWatcher** 写入 `{requestId}.res.json`，包含回复（或错误）
4. **调用方**读取响应，清理两个文件

所有文件写入都使用 **temp 文件 + rename 原子替换**——读取方永远不会看到写了一半的文件。

## 存储位置

| 路径 | 用途 |
|---|---|
| `~/.local/state/opencode/agents-registry.json` | 共享 session registry（或 `$XDG_STATE_HOME/opencode/`） |
| `~/.local/state/opencode/messages/` | 基于文件的 IPC 目录，存放跨 daemon 的请求/响应文件 |

两个路径都是**用户级**（不是项目级），这样跨 git 仓库的 session 也能互相发现。

### 并发安全

- **进程内**：异步 promise 链（`writeChain`）串行化同一 daemon 进程内所有对 registry 的读-改-写操作
- **跨进程**：POSIX temp+rename 原子性保证读取方永远看不到半写文件。跨进程并发写入时 last writer wins
- **陈旧兜底**：每条 registry 条目在 `updatedAt` 上带 24h TTL，作为 `session.deleted` 事件万一漏触发时的防线

## TUI 插件

包还导出了一个 TUI 插件（`tui.tsx`），给 OpenCode TUI 添加两个斜杠命令：

| 命令 | 功能 |
|---|---|
| `/peers` | 打开可导航的对话框，列出所有已注册 session。按回车复制 session 信息（含 `ask_session` 模板）到剪贴板 |
| `/register` | 打开输入框，为当前 session 注册任务概要 |

## 安装

### 插件（工具 + inbox watcher）

加到 `~/.config/opencode/opencode.json`（注意是 `opencode.json`，**不是** `tui.json`）：

```jsonc
{
  "$schema": "https://opencode.ai/opencode.json",
  "plugin": ["opencode-cross-session-messaging"]
}
```

### TUI（可选——`/peers` 和 `/register` 命令）

加到 `~/.config/opencode/tui.json`：

```jsonc
{
  "plugin": ["opencode-cross-session-messaging/tui"]
}
```

改完配置**完全退出并重新打开** OpenCode。

## 开发

```bash
bun install
bun run typecheck    # tsc --noEmit
bun test             # 62 tests / 10 files
```

## 目录结构

```
src/
├── index.ts                 # 入口——PluginModule 默认导出
├── constants.ts             # PLUGIN_ID、超时、退避、TTL、文件布局常量
├── types.ts                 # RegistryEntry / Registry / 参数接口 / Error 子类
├── xdg.ts                   # XDG_STATE_HOME 解析 + getRegistryPath()
├── logger.ts                # 带 PLUGIN_ID 标签的日志辅助
├── registry.ts              # 原子文件 I/O + 进程内 mutex 链
├── fileTransport.ts         # 基于文件的 IPC：请求/响应文件的写入、读取、轮询
├── inbox.ts                 # InboxWatcher——轮询 messages/ 目录，处理入站请求
├── askAndWaitForReply.ts    # 发送 prompt + 轮询 assistant 回复（通过 SDK）
├── eventHooks.ts            # session.deleted 事件处理器工厂
├── abort.ts                 # AbortSignal 工具（abortableSleep、withAbortCleanup）
└── tools/
    ├── registerSession.ts   # 工具：register_session
    ├── listSessions.ts      # 工具：list_sessions
    └── askSession.ts        # 工具：ask_session（基于文件 IPC 的编排器）
tui.tsx                      # TUI 插件——/peers 对话框 + /register 输入框（SolidJS）
SKILL.md                     # LLM 使用指南（skill 定义）
test/manual/
└── MANUAL_TEST_PLAN.md      # 5 场景 E2E 手工测试计划
```

### 模块依赖图

```
index.ts
├── tools/registerSession.ts → registry.ts → xdg.ts, types.ts
├── tools/listSessions.ts   → registry.ts
├── tools/askSession.ts      → fileTransport.ts → abort.ts, xdg.ts
│                            → registry.ts（校验）
├── inbox.ts                 → fileTransport.ts, askAndWaitForReply.ts, registry.ts
├── eventHooks.ts            → registry.ts
├── logger.ts                → constants.ts
└── constants.ts（叶节点）
```

## 已知限制

- **无死锁检测**——如果 A 等 B、B 又反过来问 A，两边会各自超时失败，不会立即报错。MVP 阶段用超时兜底，不做主动环检测。
- **无鉴权**——默认单用户可信环境，任何知道 sessionId 的 session 都能发消息。多用户/多租户场景需要重新设计。
- **无消息队列**——一次 `ask_session` 从头到尾是一次原子请求，不做排队/重试。
- **无跨会话历史**——每次 `ask_session` 对目标而言是全新的一次任务——被问的 session **完全看不到**提问方的会话历史。所以 `question` 参数**必须自包含**（把背景、代码片段、约束都写在里面）。
- **基于轮询**——inbox watcher 和响应轮询都用定时器（分别为 1s 和 500ms），不用文件系统事件。对当前预期流量够用。

## 相关文档

- [`SKILL.md`](./SKILL.md) — LLM 使用指南，规定何时调用哪个工具、如何写自包含的 question、常见坑
- [`test/manual/MANUAL_TEST_PLAN.md`](./test/manual/MANUAL_TEST_PLAN.md) — 5 个真实 OpenCode 环境下的端到端场景脚本

## License

MIT
