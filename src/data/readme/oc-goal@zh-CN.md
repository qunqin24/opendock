<div align="right">

[English](./README.md) | [中文](./README.zh.md)

</div>

# oc-goal

给 [opencode](https://opencode.ai) 增加「目标模式」(Goal Mode)，行为对齐 OpenAI Codex 的 thread goals(`/goal`)。

设定一个目标后，agent 会在每一轮结束后自动开启新一轮继续推进，直到目标被验证完成、达到 token 预算、或被你手动暂停。

## 原理(与 Codex 对齐)

- **状态机**:`active` → `complete`(模型自我声明)/ `blocked`(同一阻塞连续 3 个目标回合)/ `paused`(用户暂停或 Esc 打断)/ `budget_limited`(token 预算耗尽)/ `usage_limited`(API 限额)。除 `active` 外一律停止自动续跑。
- **循环引擎**:监听 `session.status` 空闲事件 → 若目标仍 active，用一条隐藏的 synthetic 消息自动开启新回合。消息内含 objective、token 用量/剩余、完成审计 (Completion audit) 与阻塞审计 (Blocked audit) 指令(移植自 Codex 的 `continuation.md`)。
- **模型工具**:`create_goal` / `get_goal` / `update_goal`(update 只接受 `complete`/`blocked`,pause/resume/预算由用户或系统控制，与 Codex 一致)。
- **预算记账**:按 assistant 消息增量累计 `(input - cache.read) + output + reasoning`,超限自动翻转 `budget_limited` 并注入一次收尾提示(软停止，不硬杀回合)。
- **防死循环**:回合出错 → `blocked`;API 限额 → `usage_limited`;Esc 打断 → `paused`。
- 状态持久化在 `~/.local/share/opencode/oc-goal/<project-id>.json`,跨重启、跨 compaction 保留(compaction 时目标会被注入摘要上下文)。

## 安装

在全局 `~/.config/opencode/opencode.json`(或项目级 `opencode.json`)中加入插件即可，opencode 会自动安装，无需手动下载:

```json
{
  "plugin": ["oc-goal"]
}
```

也可以从源码安装：克隆本仓库并执行 `npm install`,然后直接引用文件:

```json
{
  "plugin": ["file:///绝对路径/oc-goal/src/index.ts"]
}
```

或者把 `src/index.ts` 复制/软链到 `~/.config/opencode/plugins/goal.ts`(需保证 `@opencode-ai/plugin` 可解析)。

## 用法

```
/goal <objective>     设定目标并立即开始持续工作(替换已有目标)
/goal                 查看当前目标状态(status 亦可)
/goal pause           暂停自动续跑
/goal resume          恢复(从 paused/blocked/usage_limited 恢复)
/goal budget 500000   设置 token 预算
/goal budget none     移除预算
/goal clear           清除目标
```

目标激活期间:

- 每轮结束后自动继续，直到模型调用 `update_goal` 声明 `complete`(需通过完成审计)或 `blocked`(需同一阻塞连续 3 回合)。
- 按 Esc 打断任意一轮会自动暂停目标；`/goal resume` 恢复。
- 预算耗尽后自动停止，并提示你用 `/goal budget <n>` 提高预算再 `/goal resume`。

## 开发

```sh
npm run typecheck
```
