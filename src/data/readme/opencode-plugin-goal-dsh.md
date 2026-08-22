# opencode-goal-dsh

把 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 `packages/goal/` 目标模式移植到 [OpenCode](https://opencode.ai) 的插件。

给 AI coding agent 一个 `/goal` 斜杠命令和一组 goal 工具：设定一个持久目标后，agent 在同一会话里自动一轮一轮续跑，直到目标带着证据完成、被阻塞、或轮次用尽。

参考实现是 dsh 的四个子包（`goal` / `goal-round-driver` / `tool-goal` / `command-goal`），状态机、CAS 修订、权限模型、防作弊阈值都按原设计移植；宿主侧改用 OpenCode 的 plugin hooks。

## 功能

- `/goal <objective>` 建目标，`/goal edit|pause|resume|clear` 管理，裸 `/goal` 查状态
- 模型工具：`get_goal` / `create_goal` / `update_goal`
- 会话空闲（`session.idle`）自动续跑，注入 `<goal_round>` 轮次提示
- 完成必须带证据：模型自查后才允许标记 complete，随后注入收尾指令
- 防作弊：blocked 需同一阻塞条件持续满 N 轮；目标轮次内禁止 edit/pause/resume
- 安全边界：activation 只存内存，重启后 disarm，人工 resume 才再武装；Esc 中断自动转 paused；Plan agent 不续跑
- compaction 存活：压缩上下文时注入当前目标状态

## 安装

### 方式一：本地插件目录

把 `src/index.ts` 复制到 `~/.config/opencode/plugins/goal-dsh.ts`（全局）或项目的 `.opencode/plugins/` 下即可，重启 opencode 生效。

### 方式二：转发 shim（推荐开发时用）

插件源码留在本仓库，全局目录只放一个转发文件：

```ts
// ~/.config/opencode/plugins/goal-dsh.ts
export { GoalDshPlugin } from "<本仓库的绝对路径>/src/index.ts"
```

## 使用

```
/goal 把所有测试修绿，npm test 全过
/goal                    # 查看当前目标状态
/goal pause              # 暂停（不删除）
/goal resume             # 继续（重启后恢复也用它）
/goal edit <新目标>       # 改目标描述
/goal clear              # 清除
```

模型侧也可以在人类请求是长任务时自行调用 `create_goal`（无需用户说"建个目标"），琐碎单轮活不会建。

## 配置

插件第二参数可覆盖默认值（npm 安装方式支持 `[name, options]` 元组）：

| 选项 | 默认 | 说明 |
|---|---|---|
| `maxGoalRounds` | 25 | 自动续跑轮次上限 |
| `blockedAfterConsecutiveRounds` | 3 | blocked 前需持续的最低轮数 |
| `autoContinue` | true | 空闲自动续跑开关 |
| `minRoundIntervalMs` | 1500 | 两轮之间最小间隔（防抖） |
| `maxConsecutiveErrors` | 3 | 连续出错熔断次数 |

状态持久化在 `~/.local/share/opencode-goal-dsh/state.json`（遵循 `XDG_DATA_HOME`）。

## 与 dsh 原版的映射

| dsh 子包 | 本插件实现 |
|---|---|
| `goal/`（状态机 + CAS + 投影） | 每会话投影，JSON 原子写持久化 |
| `goal-round-driver/`（续跑调度） | `session.idle` hook → `client.session.promptAsync` |
| `tool-goal/`（模型工具 + 权限） | `tool` hook 注册三个工具；直人轮次判定用 `<goal_round>` 标记替代 dsh 的消息 source |
| `command-goal/`（`/goal` 命令） | `config` hook 注入命令模板 |

## 与 dsh 的已知偏差

- `clear` 通过 `update_goal` 工具执行（OpenCode 自定义命令必须经过模型，无法纯本地执行）
- 没有 dsh 的 inbox 抢占检测，用防抖 + 连续错误熔断替代
- 无法校验"根 agent 的直人输入"，以"本轮是否为自动续跑轮"近似
- token 预算会计未移植（依赖宿主用量事件）

## License

MIT

## 致谢

目标模式的设计与部分提示词文本移植自 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 `packages/goal/`（MIT, Copyright (c) 2026 DeepSeek），宿主适配层为原创实现。
