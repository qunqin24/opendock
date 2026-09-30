# opencode-idea

OpenCode 插件,面向 JetBrains 项目 (IntelliJ IDEA / PyCharm / WebStorm 等),做两件事:

1. **接入 IDE MCP** —— 用 `/open-in-idea` 把当前项目在 IntelliJ IDEA 中打开,并把这个 IDE 的 MCP 服务 (60 个工具:
   检索、读、改、构建、重构、调试、数据库……)注册进 OpenCode。
2. **优先使用 IDE 工具** —— IDE 可用时,向模型注入"项目内操作优先使用 IDEA MCP"的系统提示引导 + 能力映射;IDE 不可用时回退原生工具
   (正常回退,无需声明)。

> **项目命令走 IDE 终端**:跑 `java` / `python` / `npm` 这类项目命令时,引导模型用 `idea_execute_terminal_command`
> (`executeInShell: true`)而不是原生 shell —— 它在 IDE 集成终端里执行,**天然继承用户在 IDE 里配好的 JDK / Node / Python 版本**
> (含 fnm / SDKMAN 这类靠 shell init 切版本的场景)。详见「项目命令执行」。

非 JetBrains 项目完全不受影响。 **手动接入**:插件启动不探测、不连接 IDE,只有跑 `/open-in-idea` 才接入。跑过一次后,该**项目**
被「标记」(持久化在 `ctx.storage`,重启 OpenCode 后仍在)。之后**没有任何后台轮询**——恢复完全靠请求驱动:插件发现"该有 `idea_*`
工具却没有"(新实例)或"`idea_*` 调用失败"(掉线)时,**在下一条消息发出前静默接回**(用户无感)。
`/close-in-idea` 注销 IDE MCP + 删除标记。没跑过 `/open-in-idea` 的项目保持全手动、零自主动作。

> **为什么改成请求驱动**:OpenCode 把一个 Location(项目)的全部服务缓存在 `LayerMap` 里,空闲 **60 分钟**
> (`idleTimeToLive`)后整体驱逐——插件实例连同 `idea` MCP 注册一起消失。这一点两种传输都躲不过,所以与其后台探活
> (永远晚一步、还刷 IDE 日志),不如在请求前发现并把连接接回来。

## 工作原理

```text
setup(启动, 每项目一次):
  a. 读项目标记(ctx.storage: project/<项目路径>; OpenCode 重启后仍生效)
  b. 注册 /open-in-idea 与 /close-in-idea 命令 + session context 钩子 + tool execute.after 钩子
  不探测、不注册 MCP

/open-in-idea(手动触发, 阻塞到就绪):
  1. 写项目标记 = true + 同步内存缓存;注册 `idea-run-config` skill
  2. 探测本地 JetBrains IDE MCP 服务(/stream)
     - 已就绪 → 再问 IDE「当前项目是否已打开」(`get_project_modules`,带项目路径)
       · 已打开 → 不重复 open;未打开 → open -a 打开
     - 未就绪(冷启动)→ open -a 拉起,再轮询等到就绪(上限 60s)
  4. **先注销旧的 idea MCP,再重新注册**(`type: "remote"` 指向 `http://127.0.0.1:<port>/stream`,项目路径走请求头)
     —— 每次执行都重建:OpenCode 的 reconcile 会跳过配置未变的 re-`set`,不先拆就换不掉一个已经死掉的注册
  5. 等 `idea_*` 工具进入注册表;读 IDE 终端环境更新 shell 环境;启用引导
  6. 发结果通知(用户看到干净气泡,模型只回"收到")

/close-in-idea(手动触发):
  1. 删项目标记 + 同步内存缓存 + 注销 IDE MCP + 清空注入的环境
  2. 发结果通知

工具失败触发(仅在被标记的项目里;需先 /open-in-idea 过一次):
  1. `idea_*` 工具调用失败 → tool execute.after 钩子**分类**:
     - IDE MCP 不可用(掉了)→ 重跑接入流程
     - IDE 在、但项目没打开("Unable to determine the target project" / "doesn't correspond to any open project")→ 让 IDEA 重新打开该项目
     - 普通业务错误(File not found 等)→ 不动作
  2. 触发成功 → 把该错误改写为"已重连 / 已重新打开,请重试",模型同一回合重试;失败 → 保持原错误

请求驱动的恢复(没有后台轮询;每个 Location(项目)各一份插件实例):
  1. `prompt` 钩子(消息进入时,OpenCode 会 await 它)——「已标记 + 本实例没有任何 `idea` 注册」→
     探测端口,**只注册、绝不 `open -a`**;命中就重建,于是**这条消息本身**就带上了 `idea_*` 工具
  2. `context` 钩子——某条请求"曾经有 `idea_*`、现在没有" → 立刻锁存并在后台重建(不等下一条消息)
  3. `execute.after` 钩子——`idea_*` 调用以"不可用"告终(`MCP server "idea" is not available` /
     `Error POSTing to endpoint`)→ 重跑接入流程,并把错误改写成"已重连,请重试";
     普通业务错误(文件不存在等)不动作
  ※ 三者都只在**确实有事发生**时动;没人用这个项目时,插件完全静止
```

## 在 IDE 中打开项目 (`/open-in-idea`)

在会话里输入 `/open-in-idea`:

1. **让运行中的 IDEA 实例打开/激活当前项目**:`open -a "IntelliJ IDEA" <项目目录>` —— **复用已运行的实例**(不会重复开新实例),
   项目已打开时只把它切到前台。**无论 MCP 是否已就绪都会执行这一步**:端点能应答只说明 IDEA 在运行(可能开的是**别的**项目),
   不代表当前项目已打开;
2. 再探测 `/stream`;已就绪 → 直接进入下一步;
3. 未就绪 → 说明 IDEA 是冷启动,继续用 `open -a` 拉起并**轮询等到 MCP 就绪**(冷启动约数十秒,上限 60s);
4. 等不到(例如 IDE 里 MCP 服务未开启)→ 提示在 IDEA 的 `Settings → MCP Server` 开启 MCP 服务并启用 **Brave Mode**,用户设置好后
   再次执行 `/open-in-idea`;
5. 就绪后 **先注销旧的 `idea` MCP → 再重新注册**(每次执行都重建:配置未变的 re-`set` 会被 reconcile 跳过),然后重读
   IDE 环境、启用系统引导,并**等到 `idea_*` 工具进入注册表**才返回。

> **通知不触发 AI 干活**:默认 `feedback: "message"` 把结果作为一条 **标注清楚的通知**发到会话里 —— 用户看到干净的通知气泡
> (经 `metadata.displayText`),模型只看到"这是通知,请只回复『收到』"的指令,因此不会执行任何操作、不会调用工具。
> `feedback: false` 则完全静默。

**可重入 / 启动保护**:IDEA 冷启动、索引或等待「Trust and Open Project」弹窗期间探测会失败。命令只发一次 MCP/Brave Mode 提示并
fast-fail,不会在后台轮询;重复触发共享同一次打开请求,按目录维护 `lastSpawnAt` / `attempts`,避免重复 spawn。开启 MCP +
Brave Mode 后再次执行 `/open-in-idea` 即可接上。

**热更新会断开**:插件源码变更会触发 V2 热重载,注册随旧实例一起释放,`activePort` 归零。这是手动模式的预期行为 ——
**改完插件后重跑一次 `/open-in-idea`** 即可恢复。

## 关闭接入 (`/close-in-idea`)

输入 `/close-in-idea`:**注销当前项目的 IDE MCP** + 删除项目标记(持久化 + 内存缓存一并清),并清空注入的环境变量。
之后 `idea_*` 工具不再可用,也不会再因失败自动接入。想重新接入,再次执行 `/open-in-idea`。

## IDE 工具优先 (直接调用引导)

IDE MCP 可用时,插件通过 **系统提示注入**提高模型主动使用 IDEA MCP 的概率;不修改任何工具 (原生或 IDEA)
的定义、描述或可用性:

1. **系统提示注入**:通过 `ctx.session.hook("context", …)` 往每次请求的 system 里追加一段「项目内操作优先使用 IDEA
   MCP」的直接调用引导 + 能力映射表 (`src/ide-guidance.js`),含工具名 (`idea_<name>`)与关键参数名:
   - 检索 → `idea_search_text` / `idea_search_regex` / `idea_search_file`(参数 `q`,可带 `paths` 收窄)
   - 读文件 → `idea_read_file`(`file_path` / `offset` / `limit`);目录 → `idea_list_directory_tree`
   - 改文件 → `idea_apply_patch`(`input`);新建 → `idea_create_new_file`(`pathInProject`)
   - 校验 → `idea_lint_files` / `idea_get_file_problems`
   - 重构/格式化 → `idea_rename_refactoring` / `idea_reformat_file`
   - 数据库 → `idea_list_database_connections` / `idea_execute_sql_query` / `idea_preview_table_data` 等;没有数据源时先建议用户在
     IDEA 里配置
   - 边界:只约束 **代码与文件操作**;未暴露的领域 (版本控制、shell/终端等) 工具表里没有 `idea_*` 选项,模型自然走原生

   不会把整份工具目录重复塞进 system prompt,也不要求模型先写编排代码。IDEA MCP 工具自身的
   description/schema 仍是参数使用的权威来源;工具返回业务错误时先修正参数,不要误判成工具不可用。MCP 不可用时立即
   提示用户执行 `/open-in-idea`,不重复探测或等待。

引导只在 **IDE MCP 可用**时生效;MCP 不可用时仅保留 fast-fail 恢复提示。`injectGuidance: false` 可关闭系统提示注入。

## Run Configuration 管理 (skill)

IDE MCP 只能 **查**(`get_run_configurations`)和 **执行**(`execute_run_configuration`)run configuration, **没有增删改**
。插件在**被标记的项目**里注册一个 `idea-run-config` skill 来补上这块:

- 只操作 **项目级** `.run/<name>.run.xml`(可提交 git、团队共享), **不碰** `.idea/workspace.xml`;
- 不内置任何按类型的模板 —— 先找项目里的 **真实样本**(`**/*.run.xml`,或让用户在 IDEA 里勾 "Store as project file"
  建一个)当参照,再写;
- 写完必须用 `idea_get_run_configurations` **校验它能被列出**、并用 `idea_execute_run_configuration` **实跑确认**;
- 改配置用 `idea_apply_patch` **定向改 option**,不整文件重写。

**skill 的生命周期跟随项目标记**:`/open-in-idea` 打标记时注册、`/close-in-idea` 清标记时注销;曾被标记过的项目在
`setup` 时(读回标记)就会注册。未标记的项目不受影响。文档放在 `skills/<id>/SKILL.md`(每个 skill 一个目录,`name` /
`description` 走 YAML frontmatter),由 `src/skill/loader.js` 扫描加载 —— **加新 skill 只需加一个目录,不用改代码**。

## Standalone 模式纪律 (skill)

本机直跑应用的**项目级纪律**由 `idea-standalone` skill 固化:它为项目生成/维护一份 rule,落在项目根
**`.opencode/rules/idea-standalone.md`**,四段结构固定 ——

1. **什么是 standalone 模式**:**standalone = 通过 IDEA 启动**(每个应用的入口是 IDEA run configuration),应用在本机进程
   直跑(不容器化、不部署),只启动其中一部分是常态;启停一律由用户在 IDEA 里手动完成,AI 不得代为启停(含经
   `idea_execute_run_configuration`),判断需要重启时先取得用户明确授权;
2. **启动哪些应用**:一行一个应用,启动路径**只能是 IDEA run configuration**(配置名必须能在 `idea_get_run_configurations`
   里查到;缺配置先走 `idea-run-config` skill 建 `.run/*.run.xml`),端口与被依赖的先后顺序一并写明;
3. **热重载矩阵**:逐应用标"是 / 否" —— 带 HMR 的 dev server 改动后**不用**提示重启;`go run .` 这类无热重载的进程改动后
   **必须**显式点名「需要重启 <应用>」,不得在未提示的情况下宣称"改完可验证";
4. **项目补充条款**:文件写入位置、测试纪律、访问归属、dev 模式特有限制等,按用户给的条款逐条续写、保留原意。

事实一律先查后写:配置名来自 `idea_get_run_configurations`,热重载列来自运行方式,端口读不到就问用户 —— 不猜。

## 项目命令执行 (IDE 终端)

跑项目相关的命令时,模型使用 **`idea_execute_terminal_command`**,而不是 OpenCode 原生 shell。判据是**白名单**:命令用于本项目
自身的构建 / 测试 / 运行,且首个可执行文件命中下表,才走 IDE 终端;其余一律走原生 shell。

- **Node / 前端**(`package.json`):`node` / `npm` / `npx` / `pnpm` / `yarn` / `vite` / `webpack` / `esbuild` / `tsc` /
  `jest` / `vitest`。
- **Java**(`pom.xml` / `build.gradle`):`java` / `javac` / `mvn` / `mvnw` / `gradle` / `gradlew`。
- **Python**(`pyproject.toml` / `requirements.txt`):`python` / `python3` / `pip` / `pip3` / `uv` / `poetry` / `pytest`。
- **Go**(`go.mod`):`go` / `gofmt` / `golangci-lint`。
- 白名单未覆盖的语言暂走原生 shell,遇到后再补进上表。

原因:

- **`executeInShell: true`**(必开):命令在用户真实 shell(`zsh`/`bash`)里执行,**继承 IDE 集成终端的环境** —— 也就是用户在
  IDE 里配好的 JDK / Node / Python / Go / Maven / uv 等。原生 shell 未必能拿到同一套版本,尤其是 fnm / SDKMAN / pyenv 这类
  "选择写在 shell init 里"的版本管理器,靠几个环境变量复现不出来。
- `timeout`(毫秒)按预期耗时给足;`maxLinesCount` 控制返回行数,超 2000 行会截断。
- `reuseExistingTerminalWindow: true` 复用同一个 IDE 终端窗口,不刷屏。
- 返回 `command_exit_code` + `command_output`;`cd` **不跨调用保留**,多步操作用 `&&` 串在一条命令里。
- 需要 IDE 里开启 **Brave Mode**,否则每条命令都要用户确认一次。

引导文本由 `src/ide-guidance.js` 注入(`### 终端` 段),只在 IDE MCP 可用时生效。

## 前置条件

- JetBrains IDE 已开启 MCP 服务 (IDE 设置里的 MCP Server / AI Assistant MCP),版本需 **2026.2+**(提供 Streamable HTTP 端点
  `/stream`);若关闭,`/open-in-idea` 会立即提示如何重新开启。
- 要读 IDE 终端环境,需要在 IDE 里开启 **Brave Mode**(否则 `execute_terminal_command` 会等确认);MCP 未就绪时通知会同时提醒开启它。
- 插件注册给 OpenCode 的 MCP 配置(**只支持 Streamable HTTP**):

```jsonc
{
  "type": "remote",
  "url": "http://127.0.0.1:64342/stream",
  "headers": { "IJ_MCP_SERVER_PROJECT_PATH": "<项目路径>" },
  "codemode": false,
}
```

项目通过 `IJ_MCP_SERVER_PROJECT_PATH` 头选择,所以一个 IDE 能同时服务多个项目,而**不需要为每个项目起一个子进程**。

> **为什么不用 IDE 的 stdio 桥**(`idea stdioMcpServer`,子进程管道):它的故障是"沉默"的——IDE 连接断掉后子进程只挂起、
> 不回任何错误,只能靠后台心跳兜;而 Location 空闲 60 分钟被驱逐时,桥进程与注册一起消失——**两种传输都躲不过**。
> HTTP 至少把"端点没了"变成一次普通的调用错误,插件能分类并自愈。OpenCode 2.0.19+ 也已无 SSE 客户端传输,当初选 stdio 的理由不再成立。
>
> **为什么不用 `/sse`**:OpenCode V2 的远程 MCP 客户端**只支持 Streamable HTTP**,没有旧版 SSE 传输。IDE 的 `/sse` 是旧版
> SSE (POST 返回 405),V2 连不上。插件对 IDE 的**探测**仍走 `/stream`(一次 `initialize`),用来确认 IDE MCP 已就绪并拿到端口。

插件按 `ports` 顺序选择第一个可用端口,但会并发探测以避免多个端口的超时叠加;默认 `[64342]`。

## 安装

推荐用 CLI 安装,它会写入全局配置 `~/.config/opencode/opencode.json`:

```bash
opencode plugin add opencode-idea
```

等价的配置写法 (V2 使用 `plugins` 数组):

```jsonc
{
  "plugins": ["opencode-idea"],
}
```

安装后确认:

```bash
opencode plugin list
```

> 仅支持 **OpenCode V2**。若你日常跑的是 1.x 的 `opencode-ai`,它用的是旧插件 API,本插件不会生效;真机验证请用 V2 运行时。

### 本地开发 / 真机验证

插件未发布时,可以直接指向本地仓库目录。V2 解析 **目录**插件时找的是 `<dir>/index.*`(或 `<dir>/server.*`),不会读
`package.json#main`,所以仓库根目录提供了 `index.js` 转发到 `src/index.js`。

全局配置 `~/.config/opencode/opencode.json`(V2 桌面端/CLI 共用):

```jsonc
{
  "plugins": [{ "package": "/Users/yutao/Projects/opencode-idea" }],
}
```

配置保存后 V2 会监听并自动重载 (日志里能看到它开始 watch `index.js` / `src/*.js`),无需重启。改插件源码也会触发重载 (此时需重跑
`/open-in-idea`)。

另一种零配置方式:在 `~/.config/opencode/plugins/` 放一个转发文件 (自动发现,但不能传 options):

```js
// ~/.config/opencode/plugins/opencode-idea.js
export { default } from "/Users/yutao/Projects/opencode-idea/src/index.js";
```

## 配置

用 CLI 安装只会写入包名。要传 options,把 `plugins` 数组里的字符串改成对象:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-idea",
      "options": {
        "ports": [64342], // IDE MCP 端口;默认 [64342]
        "injectGuidance": true, // IDE 可用时向系统提示注入「优先使用 IDEA MCP」引导
        "openInIde": "idea", // false 关闭;或任意 macOS 应用名(如 "IntelliJ IDEA")
        "launchCooldownMs": 120000, // 启动保护冷却
        "launchMaxAttempts": 5,
        "mcpProbeTimeoutMs": 1000, // 单个 MCP 端口的短探测超时
        "executionTimeoutMs": 600000, // 单次 idea_* 工具调用硬上限;默认 10 分钟(OpenCode 默认 12 小时)
        "feedback": "message", // "message"(默认,会话通知,AI 只回"收到")| false(静默)
      },
    },
  ],
}
```

不传 options 时全部使用下表默认值。

| 选项                 | 类型                 | 默认        | 说明                                                                               |
| -------------------- | -------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `ports`              | `number[]`           | `[64342]`   | 依次探测的 IDE MCP 端口                                                            |
| `injectGuidance`     | `boolean`            | `true`      | IDE 可用时是否向系统提示注入「优先使用 IDEA MCP」引导                              |
| `openInIde`          | `boolean \| string`  | `"idea"`    | 拉起哪个 IDE;`false` 关闭,`"idea"` 映射到 IntelliJ IDEA                            |
| `launchCooldownMs`   | `number`             | `120000`    | 启动保护冷却:冷却期内不重复 spawn                                                  |
| `launchMaxAttempts`  | `number`             | `5`         | 单次会话内最多 spawn 次数,超出后停止重试                                           |
| `mcpProbeTimeoutMs`  | `number`             | `1000`      | 单个 MCP 端口的短探测超时                                                          |
| `executionTimeoutMs` | `number`             | `600000`    | 单次 `idea_*` 工具调用的硬上限(毫秒);防止端点卡住后无限等待(OpenCode 默认 12 小时) |
| `feedback`           | `"message" \| false` | `"message"` | 结果反馈:`message` 会话通知(用户可见,AI 只回"收到");`false` 静默                   |

## 行为

- **被标记的项目**:启动读回标记后挂上 shell 环境钩子 (环境值待接入后填充)、注册 `idea-run-config` skill;IDE MCP 由
  `/open-in-idea` 注册。
- **未标记的项目**:不改环境、不注册、不注入任何 IDEA 提示 (每请求零开销;setup 时只做一次项目标记读取)。
- **手动接入 + 就绪即返回**:`/open-in-idea` 会 `open -a` 拉起 IDEA 并**等 IDE MCP 就绪**(冷启动数十秒,上限 60s);就绪后
  **先注销旧的 `idea` → 再重新注册**(远程 Streamable HTTP),等 `idea_*` 工具就绪,最后才通知。**每次执行都重建**。命令返回即可用;
  `/close-in-idea` 注销 `idea` + 删标记 + 清环境。
- **`context` 钩子是请求的纯函数**:按「每次模型调用」触发 (含工具续跑),只看本次请求自带的工具快照 —— 有 `idea_*` 就剥离隐藏
  工具并注入引导;没有则只在项目被标记时给恢复提示。该钩子本身**不做任何 I/O**(只看内存缓存),也不订阅任何事件。
- **请求驱动的恢复(没有后台轮询)**:
  - **`prompt` 钩子**:「已标记 + 本实例没有任何 `idea` 注册」时**探测端口并重新注册**(只探测、绝不 `open -a`)。OpenCode 会
    await `prompt` 才构建请求,所以**触发它的那条消息本身**就带上了 `idea_*` 工具,没有空窗。这正是 Location 被空闲驱逐
    (60 分钟 `idleTimeToLive`)或 OpenCode 重启后,新实例自动接回连接的路径。
  - **`context` 钩子**:发现「本会话见过 `idea_*` 工具、本请求却没有」→ 立刻锁存并在后台重建(不等下一条消息)。工具缺失时注入的
    恢复引导会**明确禁止**调用 `idea_*`(此前复用"重试一次"的文案,反而诱导模型去调一个不在工具表里的工具,得到
    `No tool named ... available`)。
  - **`execute.after` 钩子**:见下一条。
  恢复是**每个 Location(项目)各一份**;没有任何定时器,插件在不使用时完全静止。
- **失败触发的自动接入(仅被标记项目)**:`tool.execute.after` 钩子监听 `idea_*` 工具报错并**分类**:
  - IDE MCP 不可用(掉了)→ 重跑 `/open-in-idea` 的接入流程;
  - IDE 在、但项目没打开(`Unable to determine the target project` / `doesn't correspond to any open project`)→ 让 IDEA 重新打开该项目;
  - 普通业务错误(`File not found` 等)→ **不动作**。判定只认**传输层专有标记**(`MCP server "idea" is not available` /
    `MCP server is not connected` / `Error POSTing to endpoint`),**不认**工具输出里出现的通用串
    (例如 SQL 工具报的 `Connection refused`) —— MCP 工具错误的 message 就是工具自己的输出,认通用串会把正常业务失败误判成掉线并重建。
    触发成功会把该工具错误改写为"已重连 / 已重新打开,请重试",模型在同一回合内重试;失败则保持原错误。非 `idea_*` 工具、未标记
    项目都不受影响。启动保护 (`launchCooldownMs` / `launchMaxAttempts`) 限制重复拉起 IDE。
- **`/open-in-idea`**:手动打开当前项目;**等 IDE MCP 就绪 → 先注销旧的 `idea` → 再重新注册 → 等 `idea_*` 工具就绪**才返回。
  **`/close-in-idea`**:注销 IDE MCP + 删项目标记 + 清空注入的环境。

## 限制

- 仅支持 **OpenCode V2** 插件 API (`ctx.tool` / `ctx.mcp` / `ctx.shell` / `ctx.command` / `ctx.session` /
  `ctx.location`)。
- IDE MCP 注册需要 IDE **2026.2+** 的 Streamable HTTP 端点 `/stream`;更早版本只有 `/sse`,OpenCode V2 无法连接。
- skill 定义的字段名**以 schema 为准**,不要照官方文档:`Skill.Info` 需要 `path` (AbsolutePath),文档里写的 `location`
  不存在 —— 用错会让 `ctx.skill.transform` 抛 `SchemaError`,而**任何 transform 失败都会禁用整个插件**(0.0.6 就是这样丢了
  `/open-in-idea`)。同理,`Skill.Info` 的完整字段是 `id` / `name` / `description?` / `autoinvoke?` / `path` / `content`。
- 项目命令走 `idea_execute_terminal_command` + **Brave Mode**;没开 Brave Mode 时每条命令都要用户确认一次。
- 一批用不到的 IDEA MCP 工具被硬编码隐藏 (`src/plugin.js` 的 `HIDDEN_IDEA_TOOLS`,共 31 个):VCS (`idea_git_status` /
  `idea_get_repositories`,版本控制走原生 `git`)、Router 派发工具 (`idea_execute_tool`,未启用 router-only 时冗余)、Debugger
  (全部 `idea_xdebug_*`)、Dev Kit MCP、Inspection KTS MCP、解释器环境 MCP、以及数据库的建/改数据源 (数据源由用户在
  IDEA 里配置,AI 只读和查询)。**`idea_execute_terminal_command` 不隐藏**:项目命令要在 IDE 环境里跑,模型需要它。
- 探测只确认「MCP 服务是否在监听」;**「当前项目是否已在 IDE 打开」靠一次项目作用域的 MCP 调用判断**
  (`get_project_modules`,带 `IJ_MCP_SERVER_PROJECT_PATH`):返回模块 = 已打开 → 跳过 `open -a`;报
  `Unable to determine the target project` = 未打开 → `open -a` 打开。MCP 关闭时会用一次短探测并立即给出设置提示。
  项目刚打开时的短暂"项目未就绪"由工具失败分类兜底(「IDE 在、但项目没打开」→ 重新打开并让模型重试)。
- IDE **2026.2+** 提供 Streamable HTTP 端点 `/stream`,这是插件**唯一**使用的传输(`type: "remote"`)。注册本身不启动任何子进程,
  所以没有"桥进程被 IDE 拖死后变成僵尸"这一类问题。`/open-in-idea` 仍要求 IDE MCP 已在监听(冷启动约数十秒),因此会先等就绪再注册。
- **空闲驱逐(已实测)**:OpenCode 把一个 Location 的服务缓存在 `LayerMap` 里,`idleTimeToLive` = **60 分钟**;空闲到期即整体驱逐,
  插件实例连同 `idea` MCP 注册一起消失。**两种传输都躲不过**,所以对策不是换传输,而是请求驱动的恢复(见「行为」):
  - 新实例上第一条用户消息的 `prompt` 钩子会把连接接回来 —— 常态下**不需要用户手动做什么**;
  - 手动重建仍可用:执行 `/open-in-idea`(先注销旧 `idea`、再重新注册);
  - 插件给 `idea` server 配 `executionTimeoutMs`(默认 **10 分钟**)作为硬上限:兜住端点卡住时的单次调用,不再沿用 OpenCode 默认的 12 小时;
  - "IDE 被关掉"这一类会被下一次 `idea_*` 调用暴露(HTTP 直接报错),由 `execute.after` 钩子分类后自愈;不产生 error 的场景(例如
    IDE 进程还在但项目没打开)由「IDE 在、项目没打开」分支处理。
- 项目标记存在插件名下 KV (`plugin:opencode-idea:project/<项目根路径>`)。插件实例按 **Location**(项目/打开目录)创建,标记按
  **项目根路径**共享;但两个不同 Location(例如项目根与某子目录)各有自己的内存缓存 —— 单目录打开项目的常见用法不受影响。
- `/close-in-idea` 会**注销 IDE MCP** 并删标记 + 清空注入的环境。
- 插件**完全不再检查 `.idea` 目录**:是否是 IDEA 项目只由项目标记(`/open-in-idea` 设置、`/close-in-idea` 清除)决定。
  (`/open-in-idea` 会让 IDEA 打开并导入该项目,`.idea` 由 IDEA 自己生成,插件无需也不应据此判断。)
- 打开 IDE 仅实现 macOS (`open -a`);首次打开若弹 Trust 对话框,需确认后重试。
- IDE MCP 没有「打开项目」工具,因此打开动作走 OS/CLI,而非 MCP。
- 插件热重载会断开 IDE 连接,需重跑 `/open-in-idea`。
- 插件不修改任何工具的定义、描述或可用性;IDE MCP 工具以 `idea_*` 直接暴露给模型 (`codemode: false`),不用 `execute` 包裹。

## License

MIT
