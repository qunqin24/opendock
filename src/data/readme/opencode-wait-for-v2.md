# opencode-wait-for-v2

OpenCode **V2** 插件：给 agent 一个 `wait_for` 工具，用来**阻塞等待日志出现某行、或某个进程退出**，替代 `sleep N; tail ...` 这种前台轮询。

```ts
wait_for({ path: "/tmp/build.log", pattern: "BUILD (SUCCESS|FAILURE)", timeout_ms: 600_000 })
```

## 解决什么问题

OpenCode 内置的 shell 工具是「跑完才返回」。这对长任务有两个代价：

1. **执行期间整轮对话阻塞**，UI 没有任何进度，看起来像卡死。
2. **没有「等新输出」的能力**，模型只能自己拼轮询：

```bash
sleep 60; tail -c 800 build.log | tr '\r' '\n' | tail -12
ps -Ao pid,user,etime,command | grep -E '[m]vnd' | head -3
```

一条 10 分钟的构建往往要这样轮询十几次。每次都是「白等 N 秒」，醒来后还要再推理一轮。在实测数据里，工具结束到下一句话之间的停顿 P50 是 **13.7 秒**，所以 10 次轮询 ≈ 白扔 2~3 分钟，还没算 sleep 本身。

`wait_for` 把这十几次压缩成**一次调用**。

## 效果对比

| | `sleep` 轮询 | `wait_for` |
| --- | --- | --- |
| 对话占用 | N 次工具调用 | **1 次** |
| 命中时机 | 固定时长，早了晚了都可能 | 条件成立**立刻**返回 |
| 超时行为 | 无上限，可能永远轮询 | 明确返回，带进程状态 |
| UI 反馈 | 黑屏等待 | 每秒上报 `waiting` 进度 |
| 中断 | 等 sleep 走完 | 按 ESC 立刻停 |
| 大日志 | 反复 `tail` 整个文件 | 只读尾部 64KB |

实测：11MB 的构建日志，命中检测 **3ms**。

## 安装

```bash
opencode plugin add opencode-wait-for-v2
```

或者手动放进全局插件目录（改完自动热加载，无需重启）：

```bash
git clone https://github.com/lcssos/opencode-wait-for-v2 \
  ~/.config/opencode/plugins/opencode-wait-for-v2
```

确认已加载：

```bash
opencode plugin list
```

## 用法

### 1. 等构建 / 测试结束

```bash
# 第一步：长任务放后台，输出重定向到日志
mvnd -o clean install > /tmp/build.log 2>&1    # background: true
```

```
# 第二步：一次调用等到结束
wait_for({ path: "/tmp/build.log", pattern: "BUILD (SUCCESS|FAILURE)", timeout_ms: 600_000 })
```

返回内容就是日志尾部，**不需要再单独 `tail`**：

```
[wait_for] 条件成立，等待 42.318s | path: /tmp/build.log

--- 日志尾部 ---
[INFO] BUILD SUCCESS
[INFO] Total time:  41.902 s
```

### 2. 等端口起来

```ts
wait_for({ path: "/tmp/dev.log", pattern: "listening on|Started .* in .* seconds", timeout_ms: 120_000 })
```

### 3. 等后台进程退出

```ts
wait_for({ pid: 12345, timeout_ms: 300_000 })
// 也可以同时给 path，两个条件都满足才返回，顺便拿到日志
wait_for({ pid: 12345, path: "/tmp/build.log", pattern: "BUILD SUCCESS" })
```

### 4. 日志里已经有旧的匹配

用 `must_be_new: true`，只看**调用之后新增**的内容：

```ts
wait_for({ path: "/tmp/app.log", pattern: "ERROR", must_be_new: true })
```

## 参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `path` | string | — | 要监视的文件（绝对路径） |
| `pattern` | string | — | 正则，需配合 `path`。只匹配文件尾部 64KB |
| `pid` | number | — | 等待该进程退出。可与 `path` 组合 |
| `timeout_ms` | number | `240000` | 上限 `600000` |
| `poll_ms` | number | `500` | 最小 `100`，一般不用改 |
| `tail_lines` | number | `60` | 返回日志的行数 |
| `must_be_new` | boolean | `false` | 只认调用后的新增内容 |

`path` 和 `pid` 至少要给一个。

## 超时不是失败

超时会**正常返回**而不是抛错，因为「没等到」本身是有信息量的：

```
[wait_for] timed out 等了 120.0s
原因: pid 12345 仍在运行；日志未匹配 /BUILD SUCCESS/
最后变化: 118.3s 前
pid 12345 仍在运行 —— 任务可能只是慢，不是卡死
下一步建议: 用 ps / lsof 确认进程状态，不要直接再调一次 wait_for 重复等待。
```

返回里刻意区分了两件事：

- `idle_ms`（最后变化距今多久）——区分「任务慢」和「任务卡死」
- `pidAlive` ——进程还活着就值得再等，进程没了就是真失败了

## 设计取舍

**为什么是轮询而不是 inotify/fs.watch？** 日志文件通常由 shell 重定向写入，`fs.watch` 在跨平台、NFS、容器挂载卷上行为不一致（丢事件、重复事件、`rename` 失效）。构建日志的量级下，`stat` 的代价可以忽略——实测 11MB 文件轮询 3 秒的开销测不出来。稳定性优先。

**为什么只读尾部 64KB？** Maven/Gradle 日志动辄几十 MB。用 `open` + 定位偏移读，而不是 `readFile`，避免把整个文件拉进内存。同一个 `must_be_new` 检查也只读新增区段。

**为什么超时不抛错？** 抛错会让模型倾向于「重试」，而正确的动作是去查进程状态。把诊断信息放进返回值里，模型才能做出正确判断。

**为什么每秒才上报一次 progress？** 用 `context.progress` 上报太频繁会刷屏，但完全不报又退化成黑屏体验。1 秒是不会干扰阅读的上限。

## 与其它 OpenCode 插件的区别

`wait_for` 只做一件事：**等待**。它不负责启动进程，也不接管内置工具。启动靠 `shell` 的 `background: true`，等待靠 `wait_for`。

下面是最容易混淆的几个项目（2026-11 数据）：

| 项目 | ★ | 定位 | 和本插件的关系 |
| --- | --- | --- | --- |
| **shekohex/opencode-pty** | 607 | 交互式 PTY 管理（spawn/write/read/kill） | 功能重叠但目标不同，见下表 |
| A8Cl233395/opencode-background-jobs | 1 | 替换内置 `shell`，超时自动转后台任务 | 思路最接近，但接管了 `shell` 工具 |
| zeigarnick/opencode-background-task | 3 | 后台跑 **agent 任务** | 无关，管的是 subagent 不是进程 |
| PrismKitty/opencode-background-tasks | 1 | 侧边栏展示运行中的 shell / subagent | 无关，只是 UI 展示 |

### vs opencode-pty

它是目前最成熟的同类方案，但解决的是**另一个层面**的问题：

| 维度 | opencode-wait-for-v2 | opencode-pty |
| --- | --- | --- |
| 核心范式 | 阻塞等待条件成立 | 后台运行 + 按需读取 |
| 工具数量 | 1（`wait_for`） | 5（`pty_spawn` / `pty_write` / `pty_read` / `pty_list` / `pty_kill`） |
| 启动进程 | ❌ 交给内置 `shell` | ✅ 原生 `pty_spawn` |
| 向进程输入 | ❌ | ✅ 支持 Ctrl+C、方向键 |
| 等结束的写法 | `wait_for(path, pattern)` 一次调用 | `pty_spawn(notifyOnExit: true)` 等通知 |
| 超时行为 | 正常返回 + 进程状态 + 日志尾部 | `timeoutSeconds` 到点**杀掉进程** |
| 中断（ESC） | ✅ `AbortSignal` | 取决于 SDK |
| 进度上报 | ✅ `context.progress` | ❌ |
| 大日志 | 只读尾部 64KB，11MB 命中 3ms | 全量进 ring buffer（5 万行上限） |
| 常驻内存 | 几乎为零（无缓冲） | 每会话维持 5 万行缓冲 |
| 依赖 | 零依赖（Node 内置 `fs`） | `bun-pty` 原生模块 |
| 附带组件 | 无 | Web UI + TUI 侧边栏 + REST API + WebSocket |
| 权限限制 | 无 | ⚠️ `ask` 规则会被当作 `deny` |
| 代码量 | 12.5KB 单文件 | 完整前后端项目 |

**怎么选：**

| 需求 | 推荐 |
| --- | --- |
| `mvnd install` 等构建跑完 | **wait_for** |
| 起服务后等端口就绪 | **wait_for** |
| `npm run dev` 起 dev server 并保持存活 | opencode-pty |
| 交互式 REPL / 数据库 CLI | opencode-pty |
| 让 agent 中途给进程发 Ctrl+C | opencode-pty |

两者**可以同时安装**，不冲突：dev server 交给 pty，构建交给 wait_for。

### vs opencode-background-jobs

思路上它是离本插件最近的——都认同「不该让对话阻塞在长命令上」。区别在于：

- 它**替换了内置 `shell` 工具**（`timeout: 0` 直接转后台，超时不杀进程而是转 job），侵入性更高
- 需要 `job_list` / `job_read` / `job_kill` 三个工具配合，调用链更长
- `wait_for` 不改动任何内置工具，只**新增**一个工具，随时可以移除

如果你已经在用它的 `job_read({ timeout })` 阻塞等待，那和 `wait_for` 的能力是重叠的，选一个即可。

## 兼容性

在 OpenCode **v2.2.5** 上开发和验证。依赖 `@opencode/plugin` 的 `ctx.tool.transform` 与 `ctx.tool` 的 `execute(input, context)` 约定，其中 `context.signal` 用于中断、`context.progress` 用于进度上报。

工具声明了 `options: { codemode: true }`，因此在 Code Mode 里也能通过 `tools.wait_for(...)` 调用。

## 开发

```bash
bun test          # 19 个用例
bun build index.ts --target=node --outfile=/tmp/check.js   # 打包校验
```

## License

MIT
