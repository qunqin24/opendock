# opencode-agent-bridge

[![npm version](https://img.shields.io/npm/v/opencode-agent-bridge)](https://www.npmjs.com/package/opencode-agent-bridge)
[![npm downloads](https://img.shields.io/npm/dw/opencode-agent-bridge)](https://www.npmjs.com/package/opencode-agent-bridge)
[![license](https://img.shields.io/npm/l/opencode-agent-bridge)](./LICENSE)

[English](README.md) | 简体中文

OpenCode 插件：为多个 opencode 会话（agent）之间提供跨会话协作能力——派发任务、等待结果、完成通知与结果检查。功能由 [multi-agent-bridge](https://github.com/Mooling0602/multi-agent-bridge) 迁移而来，全部在 opencode 进程内完成（不派生额外服务器、不依赖外部配置）。

## 安装

### CLI 一键安装（推荐）

```bash
opencode plugin opencode-agent-bridge@latest --global
```

安装到当前项目则去掉 `--global`。该命令会从 npm 拉取包并自动写入 opencode 配置，重启 opencode 后生效。

### 手动配置

在 `opencode.jsonc`（全局 `~/.config/opencode/opencode.jsonc` 或项目 `opencode.json`）中：

```jsonc
{
  "plugin": ["opencode-agent-bridge"]
}
```

opencode 启动时自动安装 npm 插件；固定版本可写为 `"opencode-agent-bridge@0.1.1"`。

### 本地路径（开发）

```jsonc
{
  "plugin": ["/path/to/opencode-agent-bridge"]
}
```

加载规则：优先读取 `package.json` 的 `exports["./server"]`（即 `dist/index.js`），首次使用前需构建一次：

```bash
npm install
npm run build
```

## 提供的工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `agent_bridge_dispatch` | `target`, `message` | 向目标会话异步派发消息，不等待回复。目标完成后自动通知当前会话（**无需轮询**） |
| `agent_bridge_wait` | `target`, `message`, `timeout?` | 向目标会话派发消息并**阻塞等待**，目标回复后完整返回回复内容；`timeout` 默认 1800 秒 |
| `agent_bridge_notify` | `sender?`, `message?` | 手动通知发送方会话任务已完成；`sender` 缺省时自动从派发注册表查找 |
| `agent_bridge_check` | `target`, `limit?` | 检查目标会话状态（busy/idle）与最近消息内容，用于获取任务结果；**仅在收到完成通知后调用，勿用于轮询** |
| `agent_bridge_sessions` | `keyword?` | 列出当前目录下的会话（ID + 标题），可按标题关键词过滤 |
| `agent_bridge_get_self_metadata` | 无 | 返回当前会话的 `sessionID` 与标题（只读） |

## 环境变量

插件通过 `shell.env` hook 向所有 shell 执行（agent 工具与用户终端）注入：

- `OPENCODE_SESSION_ID`：当前会话 ID
- `OPENCODE_SESSION_CWD`：会话工作目录

## 使用流程

### 异步模式（通知与结果分离）

```
会话 A（调用方） agent_bridge_dispatch → 会话 B（接收方）执行任务
    → B 完成 → session.idle 事件自动通知 A（或 B 内 agent 调 agent_bridge_notify 兜底）
    → A 收到通知（仅提示完成，不含结果）
    → A 调 agent_bridge_check(B) 获取 B 的最近消息（任务结果）
```

### 同步模式（阻塞等待完整结果）

```
会话 A agent_bridge_wait(B, msg) → B 执行 → 工具阻塞至 B 回复完成
    → B 的回复内容完整返回给 A（无需 notify/check）
```

## 并发与竞态行为

- **通知去重**：idle 自动通知与手动 `agent_bridge_notify` 共享同一派发记录，发送前原子认领（claim），保证同一任务最多通知一次；发送失败时记录会被恢复，可被后续 idle 事件或手动 notify 重试。
- **精确回复匹配**：每条派发消息以「水位（派发前最后一条消息 ID）+ 文本探针 + parentID」三重匹配识别属于自己的回复，多个会话向同一目标并发派发时不会串信、不会误通知。
- **同步等待超时**：`agent_bridge_wait` 有超时兜底（默认 1800 秒），超时后可用 `agent_bridge_check` 查询进度。

### 已知限制

- **单派发者**：同一目标会话的注册表条目为单值。多个会话向同一目标并发派发时，后派发的覆盖先前的记录——自动通知只发给最后登记的调用方；被覆盖的调用方可依赖派发消息中附带的手动通知指令兜底。
- **多 opencode 实例**：注册表文件在 `~/.local/share/` 下全局共享，多个 opencode 实例各自持有内存副本，互不感知对方写入；跨实例协作时自动通知可能重复或丢失，此时以手动 `agent_bridge_notify` 为准。
- **多实例界面不实时刷新**：多个独立 opencode 实例（如两个 TUI 窗口）共享同一会话数据库，但事件仅在产生消息的实例进程内广播。派发到其他实例所显示会话的消息与回复不会实时出现在其界面中，重新打开/切换会话即可看到（数据未丢失）。多会话协作建议使用单实例（Web serve，或同一 TUI 内切换多个会话）。
- **循环等待**：A `wait` B 且 B `wait` A 会形成死锁，双方各自阻塞至超时。请避免循环依赖，改用 `dispatch`/`check` 组合。
- **消息窗口**：回复识别只检索目标会话最近 50 条消息；极活跃会话中派发消息可能滑出窗口导致自动通知/等待失效，此时使用手动 `agent_bridge_notify` 兜底。
- **注册表过期**：派发记录超过 7 天未处理会被自动清理（TTL），超期任务请重新派发。

## 注册表

派发关系持久化于 `~/.local/share/opencode-agent-bridge/dispatches.json`（可用 `XDG_DATA_HOME` 覆盖基目录）。opencode 重启后关系仍然有效。

## 开发

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup → dist/
```

## License

MIT
