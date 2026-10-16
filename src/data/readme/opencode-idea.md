# opencode-idea

OpenCode 插件,面向 JetBrains 项目 (IntelliJ IDEA / PyCharm / WebStorm 等),做两件事:

1. **接入 IDE MCP** —— 用 `/open-in-idea` 把当前项目在 IntelliJ IDEA 中打开,并把这个 IDE 的 MCP 服务 (60 个工具:
   检索、读、改、构建、重构、调试、数据库……)注册进 OpenCode。
2. **优先使用 IDE 工具** —— IDE 可用时,向模型注入"项目内操作优先使用 IDEA MCP"的系统提示引导 + 能力映射;IDE 不可用时回退原生工具
   (正常回退,无需声明)。

> **需要项目环境的命令走 Run Configuration**:跑 `java` / `python` / `npm` 这类依赖项目配好的 JDK / Node / Python 版本的
> 命令时,引导模型用 `idea_execute_run_configuration`(配置**由用户**先在 IDEA 里建好),而不是原生 shell;不需要项目
> 环境的命令照常走原生 shell。**IDE 内置终端 (`idea_execute_terminal_command`) 已被隐藏** —— 实测它并不继承项目环境,
> 对原生 shell 没有任何优势。详见「项目命令执行」。

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
  1. 写项目标记 = true + 同步内存缓存;按 IDE 实际提供的工具同步 skill
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

> **非 macOS**:第 1、3 步的自动打开被跳过(没有对应的启动命令),请**先手动打开 IDE 和当前项目**,再执行本命令 ——
> 端口在监听就会正常接入,并同样等到 `idea_*` 工具就绪才返回。

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

## 按能力选工具 (直接调用引导)

IDE MCP 可用时,插件通过 **系统提示注入**告诉模型**哪些事该走 IDE**;不修改任何工具 (原生或 IDEA)
的定义、描述或可用性:

1. **系统提示注入**:通过 `ctx.session.hook("context", …)` 往每次请求的 system 里追加一段引导 + 能力映射表。**文本本身在
   `src/ide-guidance.template.md`**——它是一份要给人 review 的提示词文档,条件直接用 `{{#if …}}` 写在那几行外面,所以打开模板
   就能看到最终渲染成什么样;`src/template.js` 是渲染器(支持 `{{var}}` / `{{#if}}` / `{{else}}`,**不做 HTML 转义**——
   输出是 Markdown,`<jar>!/<entry>` 和反引号必须原样过)。含工具名 (`idea_<name>`)与关键参数名:
   - **只有 IDE 才有的能力才写进去** —— 符号级检索、项目模型、检查与构建、重构与格式化、运行配置:
     - 符号 → `idea_search_symbol` / `idea_get_symbol_info` / `idea_analyze_calls`
     - 项目与编辑器 → `idea_get_project_modules` / `idea_get_project_dependencies` / `idea_list_directory_tree` /
       `idea_get_all_open_file_paths` / `idea_open_file_in_editor`
     - 重构/格式化 → `idea_rename_refactoring` / `idea_reformat_file`
     - 校验 → `idea_lint_files` / `idea_get_file_problems` / `idea_build_project`
     - 运行配置 → `idea_get_run_configurations` / `idea_execute_run_configuration`(+ 配套插件的启停工具)
   - **读、写、找文本、找文件用原生工具**(`read` / `write` / `edit` / `grep` / `glob`)—— 这几件事走 IDE 只是多一跳,
     所以映射表里**不出现** `idea_search_text` / `idea_search_regex` / `idea_search_file` / `idea_apply_patch` /
     `idea_create_new_file`,也不再禁止它们的原生对应物。
   - **唯一例外是 `idea_read_file`**:它是读**包内文件**的唯一手段(`<jar>!/<entry>` 的依赖 jar 内文件、`jrt://` 的
     JDK 镜像),引导只在这个用途上点名它,并写明普通文件一律用 `read`。

   不会把整份工具目录重复塞进 system prompt,也不要求模型先写编排代码。IDEA MCP 工具自身的
   description/schema 仍是参数使用的权威来源;工具返回业务错误时先修正参数,不要误判成工具不可用。MCP 不可用时立即
   提示用户执行 `/open-in-idea`,不重复探测或等待。

   **总则里最靠前的两条是 Code Mode 规则**,而且第一条是**通用**的,不是 `idea_*` 特例:`工具列表里已经直接列出的原生工具,
直接调用,不需要也不应该用 Code Mode 的 `search` 去找`;第二条才落到 `idea_*`(它就是原生工具,且不在 Code Mode 目录里)。
   放在所有路由规则之前,因为它们是前提 —— 模型拿不到工具,后面写什么都没用。理由是实测过的失效:工具明明在原生工具
   列表里,模型却进 Code Mode 跑了一次工具搜索(Code Mode 自己的指令「用 `search` 找工具」读起来像是访问任何东西的通用
   姿势,而原文没有任何一句说明这些工具在哪),白绕一圈之后还可能得出"工具不可用"的错误结论。同一条约束也写在
   「工具已消失」的恢复提示里,避免掉线时又去 Code Mode 里找。

引导只在 **IDE MCP 可用**时生效;MCP 不可用时仅保留 fast-fail 恢复提示。`injectGuidance: false` 可关闭系统提示注入。

**条件注入**:映射表里只有内置 MCP Server 自带的那批工具是「永远写死」的。如果 IDE 里另外装了配套的
[`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance) 插件,它提供的 run configuration 启停工具也会被加进
下面的「运行配置」段。判据是**这次请求的工具快照里真的有这些工具** —— 没装的 IDE 上这段一个字都不会出现,模型不会去调
一个不存在的工具。

## 工具参数 (schema 收敛 + `execute.before`)

有些 IDEA 工具**不传某个参数就会回答一个你没问的问题**。这种参数由本插件完全掌管,所以要**两半一起做** —— 只做一半都是错的:

| 一半                           | 做法                                 | 不做会怎样                                 |
| ------------------------------ | ------------------------------------ | ------------------------------------------ |
| 从模型的工具 schema 里**删掉** | `ctx.tool.transform` 改 input schema | 模型会设它、会据此推理,而那个值被无声丢弃  |
| 每次调用**设成固定值**         | `ctx.tool.hook("execute.before")`    | 模型不传时拿到的是那个可能出错的默认值本身 |

两半由 `src/mcp/idea-tool-defaults.js` 的**同一张表** `FORCED_ARGUMENTS` 驱动,所以不会漂移。目前一条:

| 工具                 | 参数      | 值     | 为什么                                                                                                         |
| -------------------- | --------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `idea_build_project` | `rebuild` | `true` | 增量构建比对的是 **IDE 自己那份文件新鲜度**;IDE 外部改的代码可能被判成"没有脏文件",构建于是变成 no-op 并报成功 |

- **强制**而不是"缺省才补":`rebuild: false` 请求的正是那个可能出错的答案,而且调用方从结果里分辨不出来;`rebuild: true`
  唯一的代价是时间。
- 依据是实测(IntelliJ 2026.2.3):`build_project` 落到
  `ProjectTaskManager.createAllModulesBuildTask(project, isIncrementalBuild = !rebuild)`;用 `rebuild: true` 跑的 6 个场景
  (改已有文件 / 新增文件、任意包、在编辑器里打开与否)**全部**识别到外部改动。
- 调用方自己也传了非空 `filesToRebuild` 时,IDE 走的是另一条分支、根本不读 `rebuild`,所以设不设都无副作用。
- **引导文本里一个字都不提 `rebuild`** —— schema 都不暴露了,再写进提示词等于把刚拿掉的旋钮又放回去。
- 只对**点名的工具**生效,其余工具的参数一字不改(测试里专门有一条:另一个恰好也有 `rebuild` 属性的工具不受影响)。

安全性照着 OpenCode 源码确认过:一次工具调用**先**按该请求发布出去的 schema 校验,**然后**才进 `execute`,而
`execute.before` 在真正的工具逻辑之前触发。所以"schema 里没有、钩子里补上"这个组合不会撞校验。

**这是对早先「绝不改工具定义」那条规则的一次有意例外**(见 `141b1bd`),且刻意收得很窄:这里**只做减法,不发明、不解释**。
IDE 自己的 `build_project` 工具描述本来就没提这个参数(只有属性级描述提),所以删掉属性之后 schema 依然自洽、也依然完全是
IDE 的。schema 变换**绝不能**用来加建议 —— 那是引导文本的职责。

两半都**不依赖项目标记**:它们修的是工具调用本身,与"这个项目是否接入 IDE"无关。

## Run Configuration 全套 (配套插件 `idea-mcp-enhance`)

IDE 内置的 MCP Server 只能 **启动已有**的 run configuration(`execute_run_configuration`),**不能新建、不能停止、不能重启、
也查不到运行状态**。配套的 IDEA 插件 [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)(IDEA 2026.2+,另装)
补齐这四件事 —— 正好是「建 → 看 → 停 → 重启」一条链:

| 工具 (OpenCode 里叫 `idea_*`)         | 作用                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `idea_create_shell_run_configuration` | 新建**项目级** Shell 配置(写 `.run/<name>.run.xml`);只支持 Shell 类型。**重操作 —— 只给固定流程建,且必须先取得用户同意** |
| `idea_list_running_configurations`    | **当前真正在跑**的配置:几个实例 / 各自 pid / 退出码。`>1` 个实例就是端口漂移的信号                                       |
| `idea_stop_run_configuration`         | 停掉该配置的**全部**实例并等它们退出;没在跑也返回成功(幂等)                                                              |
| `idea_rerun_run_configuration`        | 等同 IDE 的 **Rerun** 按钮:在跑就重启、没在跑就启动,读 `started` 判断是否真起来了                                        |

opencode-idea 对这一组工具做三件事:

1. **透传**:IDE MCP server 以 `codemode: false` 注册,工具目录整体转发,所以这四个工具自动以 `idea_*` 出现在模型的
   工具表里 —— 插件侧不需要单独声明(也因此**装不装这个 IDEA 插件,插件侧的代码都不用改**);
2. **条件引导**:只有这次请求的工具快照里真的有它们,才在「运行配置(配套插件 … 提供,装了才有)」**自己那一节**里逐个点名 ——
   和 IDE 自带的 `### 运行配置` 分开:两个来源,两节,读者要能分清"IDE 给我的"和"我额外装的"。没装插件时**整节连同标题一起消失**。
   两个地方会跟着变:
   - 「运行配置」段写明**改完代码要重启无热重载的进程就用 `idea_rerun_run_configuration`,不要用 `pkill` / `kill` / shell**
     —— 这正是它要解决的问题:外部杀掉的进程 IDE 并不知道,Run 窗口仍显示运行中,下次启动就会撞端口;
   - 「命令执行」段把**新建 run configuration 定性成重操作**:一个项目通常只建几个(固定要跑的构建 / 装依赖 / dev server),
     **不是随手一条命令就建一个**,而且要**先告诉用户建什么、为什么,取得同意再动手**。只有最后"用哪条路建"才按工具是否
     分成两条**无条件 + 有条件**:「配置一律不由你写」永远在;只有「Shell 例外,用 `idea_create_shell_run_configuration`」那一行
     按工具是否存在分流,没有就换成「缺配置请用户在 IDEA 里建」。**没装插件时绝不会提到那个工具。**
3. **工具名清单**写在 `src/mcp/enhance.js`(与原生 IDE 的 `src/mcp/idea.js` 分开放:原生走原生,插件的走插件的),
   与该仓库的 `RunLifecycleSchemas.kt` 保持同步。工具按**存在的子集**逐个点名(而不是「有就全写」),这样旧版本的配套
   插件少给一两个工具时,引导也不会提到它们。

> 没装 `idea-mcp-enhance` 的 IDE 一切照旧:工具不存在,引导也不提,模型继续按原来的方式工作。

## Run Configuration:能建就用工具,不能建就交给用户

内置 MCP 只能 **查**(`get_run_configurations`)和 **执行**(`execute_run_configuration`)run configuration;新建靠配套插件的
`idea_create_shell_run_configuration`(只有 Shell 类型,见上面的「Run Configuration 全套」);**修改和删除永远没有工具**。

所以插件的立场是:

- **配置一律不由 AI 动手** —— 不手写 `.run/*.run.xml`,也不手搓启动命令。这条无条件;
- **Shell 类型**且装了配套插件 → 用 `idea_create_shell_run_configuration`(新建是重操作,**必须先取得用户同意**);
- **其他类型,或没装插件** → **请用户在 IDEA 里建**,AI 只负责说明要建什么、为什么。

> **曾经有一个 `idea-run-config` skill 教模型手写 `.run/*.run.xml`,已经删掉。** 理由:手写那条路很脆 —— `type` 写错 IDE 会
> **静默忽略整个文件、日志里也不报**,模型的唯一判据只有"`idea_get_run_configurations` 里看不看得到";而它想补的"新建"能力现在
> 由配套插件提供。要配置但没有工具,就**交给用户**,比让模型猜 option 名可靠。

**skill 的生命周期跟随两道门,缺一不可**:

1. **项目标记** —— `/open-in-idea` 打标记时注册、`/close-in-idea` 清标记时注销;曾被标记过的项目在 `setup` 时(读回标记)
   也会走这一步。未标记的项目不受影响。
2. **IDE 真的在提供这个 skill 依赖的工具** —— skill 在自己的 frontmatter 里用 `requires:` 声明它绕着哪个工具写(例如
   `idea-standalone` 声明 `idea_rerun_run_configuration`,那个工具只有配套插件提供)。**没这个工具就不注册这个 skill**:
   一个教模型去调"它根本看不到的工具"的 skill,不是知识,是一次注定的失败调用。工具的可见性是双向跟随的 —— `setup` 时还没
   连过 IDE、目录未知,所以那时**不注册**;等 IDE 应答(`/open-in-idea` 或重连)后目录才算已知,该出现的才出现;反过来,某个
   请求里工具没了,skill 也跟着撤(不需要等重连)。
   `requires` 必须写 **OpenCode 侧的名字**(IDE 工具带 `idea_` 服务器前缀),因为门就是拿它跟 `ctx.tool.list()` 比;
   写成 IDE 的原始名(`rerun_run_configuration`)会让这个 skill 在任何机器上都不出现,而且没有任何报错。

文档放在 `skills/<id>/SKILL.md`(每个 skill 一个目录,`name` / `description` / `requires` 走 YAML frontmatter,`requires` 由
loader 消费、**不会进入注册给 OpenCode 的定义**),由 `src/skill/loader.js` 扫描加载 —— **加新 skill 只需加一个目录,不用改代码**。

## Standalone 模式纪律 (skill)

本机直跑应用的**项目级纪律**由 `idea-standalone` skill 固化:它把这份纪律写进**项目根 `AGENTS.md`** 里由
`<!-- idea-standalone:begin -->` 与 `<!-- idea-standalone:end -->` 包裹的**标记块**(根 `AGENTS.md` 本来就是 AI 在本项目
工作时必读的文件,所以不需要另建规则文件、也不需要 always-apply 开关;标记块是"以后改没改过"的判据)。骨架与各段写作规范在
`skills/idea-standalone/assets/AGENTS.template.md`,**SKILL.md 只写流程、指向模板**,不重复骨架。三段固定 ——

1. **什么是 standalone 模式**:**standalone = 启动收口只有 IDEA run configuration**(每个应用的启动入口是 run configuration,不是手搓命令行;
   至于配置内部怎么起 —— 本机进程 / 容器 / 部署到远端 —— 由它自己决定,本段不预设),只启动其中一部分是常态;
   **跑应用只用 `idea_rerun_run_configuration`**(在跑就重启、没在跑就启动)
   —— 不必分辨启动还是重启,直接 rerun 就完事,常驻进程化 / 服务化的配置一律走这条;
   **`idea_execute_run_configuration` 不用于这里**(它是给命令 / Job 类型的配置跑的,对常驻进程只会起重复实例);也不绕开 IDEA 用
   `go run` / `pnpm dev` 这类裸命令或 `kill` / `pkill`;**重启不必先问** —— 改完代码要重启就直接 rerun,这条链是无人化的;
2. **启动哪些应用**:一行一个应用,启动路径**只能是 IDEA run configuration**(配置名必须能在 `idea_get_run_configurations`
   里查到;**缺配置就交给用户**去 IDEA 里建),端口与被依赖的先后顺序一并写明;
3. **热重载矩阵**:逐应用标"是 / 否" —— 带 HMR 的 dev server 改动后**不用**提示重启;`go run .` 这类无热重载的进程改动后
   **必须**显式点名「需要重启 <应用>」,不得在未提示的情况下宣称"改完可验证";
4. **项目补充条款**:文件写入位置、测试纪律、访问归属、dev 模式特有限制等,按用户给的条款逐条续写、保留原意。

事实一律先查后写:配置名来自 `idea_get_run_configurations`,热重载列来自运行方式,端口读不到就问用户 —— 不猜。
**只动自己的标记块**:根 `AGENTS.md` 是共享文件(`project-scaffold` 的宪法、项目自己的内容都在里面),标记之外一字不改。

## 项目命令执行 (Run Configuration)

需要**项目环境**的命令(依赖用户在 IDE 里配好的 JDK / Node / Python 版本等),模型使用 **`idea_execute_run_configuration`**
执行 —— 走 run configuration,不用原生 shell。

- 判据是:这条命令**依赖项目的运行时版本**。是 → run configuration;不是(看文件、git、临时脚本)→ 原生 shell。
- run configuration 会继承开发时具体配的那套运行时,或者干脆是你那个应用配好的运行时,所以这就是个应用。
- 配置必须**先在 IDEA 里存在**(项目级 `.run/*.run.xml`,**由用户建**)。没有就请用户建一个,再跑;

> 为什么不再用 IDE 终端:`idea_execute_terminal_command` 之前被当成"自动继承 IDE 项目环境"的通道而保留暴露,但实测
> **它拿不到项目配好的 JDK / Node / Python 版本**,和原生 shell 没有区别。既然没有优势,就把它从模型可见的工具表里
> 隐藏掉(`HIDDEN_IDEA_TOOLS`),命令执行的路由改由 run configuration 承担。

引导文本由 `src/ide-guidance.js` 注入(`### 命令执行` 段),只在 IDE MCP 可用时生效。

## 前置条件

- JetBrains IDE 已开启 MCP 服务 (IDE 设置里的 MCP Server / AI Assistant MCP),版本需 **2026.2+**(提供 Streamable HTTP 端点
  `/stream`);若关闭,`/open-in-idea` 会立即提示如何重新开启。
- IDE 侧需开启 **Brave Mode**(否则需要确认的 MCP 工具调用会停下来等用户确认);MCP 未就绪时通知会同时提醒开启它。
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

- **被标记的项目**:启动读回标记后挂上 shell 环境钩子 (环境值待接入后填充)、按 IDE 实际提供的工具同步 skill(IDE 还没应答时
  依赖配套工具的 skill 不注册);IDE MCP 由 `/open-in-idea` 注册。
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
- 需要项目环境的命令走 `idea_execute_run_configuration`(run configuration 要先在 IDEA 里配好),不用原生 shell。
- 一批用不到的 IDEA MCP 工具被硬编码隐藏 (`src/plugin.js` 的 `HIDDEN_IDEA_TOOLS`,**共 48 个**):VCS (`idea_git_status` /
  `idea_get_repositories`,版本控制走原生 `git`)、Router 派发工具 (`idea_execute_tool`,未启用 router-only 时冗余)、Debugger
  (全部 `idea_xdebug_*`)、Dev Kit MCP、Inspection KTS MCP、解释器环境 MCP、**IDE 内置终端
  (`idea_execute_terminal_command`:实测不继承项目环境,对原生 shell 没有优势)**、**整个 Database 组**(数据源由用户在
  IDEA 里配置,而 IDE 也不是本插件设想的数据库客户端),以及**有原生对应的文件读写**
  (`idea_search_text` / `idea_search_regex` / `idea_search_file` / `idea_apply_patch` / `idea_create_new_file`
  分别对应 `grep` / `grep -E` / `glob` / `edit` / `write`)。

  实测数字(拿运行中的 IDE MCP 拉 `tools/list`):IDE 暴露 **64** 个 → 隐藏 48 → **模型可见 16 个**,
  而且这 16 个**恰好等于引导里点名的 16 个** —— 没有"能看见但没人告诉它用途"的残留。

- 探测只确认「MCP 服务是否在监听」;**「当前项目是否已在 IDE 打开」靠一次项目作用域的 MCP 调用判断**
  (`get_project_modules`,带 `IJ_MCP_SERVER_PROJECT_PATH`):返回模块 = 已打开 → 跳过 `open -a`;报
  `Unable to determine the target project` = 未打开 → `open -a` 打开。MCP 关闭时会用一次短探测并立即给出设置提示。
  项目刚打开时的短暂"项目未就绪"由工具失败分类兜底(「IDE 在、但项目没打开」→ 重新打开并让模型重试)。
- **项目路径按 IDE 的写法归一化**:IDE 收的是系统无关形式(正斜杠),其自带配置示例在 Windows 上也是
  `"E:/gitea/secondev-demo"`。OpenCode 的 `location` 在 Windows 上是原生反斜杠,所以 `src/mcp/idea.js` 的
  `ideProjectPath()` 把它转成正斜杠,**注册与探测走同一个函数**,两者必须一致,否则会用一种写法注册、又用另一种
  写法去问,永远匹配不上。macOS 上是原样透传。
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
- **自动拉起 IDE 仅实现 macOS** (`open -a`)。其他平台(包括 Windows)没有对应的启动命令,**请手动打开 IDE 和项目**,再执行
  `/open-in-idea` —— 端口在监听就会正常接入,其余能力(注册、探测、自愈、工具暴露)与 macOS 完全一致。
  IDE 里打开 MCP 服务(2026.2+)并启用 Brave Mode;首次打开若弹 Trust 对话框,需确认后重试。
- IDE MCP 没有「打开项目」工具,因此打开动作走 OS/CLI,而非 MCP。
- 插件热重载会断开 IDE 连接,需重跑 `/open-in-idea`。
- 插件不修改任何工具的定义、描述或可用性;IDE MCP 工具以 `idea_*` 直接暴露给模型 (`codemode: false`),不用 `execute` 包裹。

## License

MIT
