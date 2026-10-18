# opencode-idea

OpenCode 插件,面向 JetBrains 项目 (IntelliJ IDEA / PyCharm / WebStorm 等),做两件事:

1. **接入 IDE MCP** —— 把项目在**它自己的 IDE** 里打开,并把这些 IDE 的 MCP 工具注册进 OpenCode。一个 OpenCode 会话可以
   同时接入**多个项目**:root 本身,以及 root 下任意层级的**子项目**;子项目可以用与 root **不同**的 IDE 打开
   (root 在 IDEA、`modelserver` 在 PyCharm 是常态)。每个项目注册成独立的 MCP server,**工具名前缀就是它**:
   root 是 `ide_*`,子项目是 `<目录名>_*`(例如 `modelserver_search_symbol`)。
2. **优先使用 IDE 工具** —— IDE 可用时,向模型注入**逐项目**的引导:在哪个项目里工作,就用哪个项目前缀的工具;IDE 不可用时
   回退原生工具(正常回退,无需声明)。

> **需要项目环境的命令走 Run Configuration**:跑 `java` / `python` / `npm` 这类依赖项目配好的 JDK / Node / Python 版本的
> 命令时,引导模型用 `ide_execute_run_configuration`(配置**由用户**先在 IDE 里建好),而不是原生 shell;不需要项目
> 环境的命令照常走原生 shell。**IDE 内置终端 (`ide_execute_terminal_command`) 已被隐藏** —— 实测它并不继承项目环境,
> 对原生 shell 没有任何优势。详见「项目命令执行」。

非 JetBrains 项目完全不受影响。**手动接入**:插件启动不探测、不连接任何 IDE。三个命令管全部:

| 命令                            | 作用                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `/open-in-ide [ide]`            | 接入 root 及其全部已登记子项目;第一次**没有配置**时由 AI 问用户 root 用哪个 IDE |
| `/add-sub-module-in-ide <路径>` | 登记一个子项目(相对 root 的路径);随后由 AI 问用户它用哪个 IDE                   |
| `/delete-in-ide`                | 删掉**整个**配置(root + 全部子项目)并注销全部 IDE MCP                           |

配置持久化在 `ctx.storage`(`project/<root 路径>`),重启 OpenCode 后仍在。之后**没有任何后台轮询**——恢复完全靠请求驱动:插件发现"该有
IDE 工具却没有"(新实例)或"IDE 工具调用失败"(掉线)时,**在下一条消息发出前静默接回**(用户无感)。没跑过 `/open-in-ide` 的 root
保持全手动、零自主动作。

> **为什么改成请求驱动**:OpenCode 把一个 Location(项目)的全部服务缓存在 `LayerMap` 里,空闲 **60 分钟**
> (`idleTimeToLive`)后整体驱逐——插件实例连同全部 IDE MCP 注册一起消失。这一点两种传输都躲不过,所以与其后台探活
> (永远晚一步、还刷 IDE 日志),不如在请求前发现并把连接接回来。

## 工作原理

```text
setup(启动, 每 root 一次):
  a. 读配置(ctx.storage: project/<root 路径>; OpenCode 重启后仍生效)
     —— root 用哪个 IDE,登记了哪些子项目、各自用哪个 IDE
  b. 注册 3 个命令 + session context/prompt 钩子 + tool 钩子 + configure_ide_project 工具
  不探测、不注册任何 MCP

/open-in-ide(手动触发, 阻塞到就绪):
  1. 还没有配置时:
     - 带了 ide 参数 → 直接写入 root 的 IDE(直通逃生口,不经过模型)
     - 没带参数   → 发给模型一条**任务**:请它问用户 root 用 IDEA 还是 PyCharm,拿到答复后调用
                    configure_ide_project 回写;本次到此为止。**只有第一次要问**
  2. 有配置时,对**每个**已登记项目:
     - 在**该项目自己 IDE 的固定端口**上问「你认得这个项目吗」(`get_project_modules`,带项目路径)
       · 认得   → 就用那个端口(这就是"哪个 IDE 打开着它"的判定)
       · 不认得 → `open -a <该项目自己的 IDE> <项目目录>`,再轮询等到认得(上限 60s)
  3. **先注销全部旧注册,再按项目各注册一个 MCP server**
     (server 名 = 工具前缀:root 是 `ide`,子项目是目录名;`type: "remote"` 指向
      `http://127.0.0.1:<port>/stream`,项目路径走请求头)
  4. 等 IDE 工具进入注册表;按每个项目实际提供的工具同步 skill;启用逐项目引导
  5. 发结果通知(用户看到干净气泡,模型只回"收到")

/add-sub-module-in-ide <路径>(手动触发):
  1. 没有配置 → 直接报错,提示先执行 /open-in-ide(不提问、不写任何东西)
  2. 有配置   → 校验路径:必须在 root 下、目录存在、目录名合法、前缀不与已登记项目重名、不占用保留名
  3. 通过     → 发给模型一条**任务**:请它问用户这个子项目用哪个 IDE,答复后调用
                configure_ide_project 回写。(带多个参数 = 报错,不猜)

/delete-in-ide(手动触发):
  1. 删除**整个**配置(root + 全部子项目) + 注销全部 IDE MCP + 清空注入的环境
  2. 发结果通知

工具失败触发(仅在有配置的 root 里):
  1. IDE 工具调用失败 → tool execute.after 钩子**分类**:
     - IDE MCP 不可用(掉了)→ 重跑接入流程
     - IDE 在、但项目没打开("Unable to determine the target project" / "doesn't correspond to any open project")
       → 让**这个工具所属项目**的 IDE 重新打开它(不会去动别的项目)
     - 普通业务错误(File not found 等)→ 不动作
  2. 触发成功 → 把该错误改写为"已重连 / 已重新打开,请重试",模型同一回合重试;失败 → 保持原错误

请求驱动的恢复(没有后台轮询;每个 Location(项目)各一份插件实例):
  1. `prompt` 钩子(消息进入时,OpenCode 会 await 它)——「已配置 + 本实例没有任何 MCP 注册」→
     探测端口,**只注册、绝不 `open -a`**;命中就重建,于是**这条消息本身**就带上了 IDE 工具
  2. `context` 钩子——某条请求"曾经有 IDE 工具、现在没有" → 立刻锁存并在后台重建(不等下一条消息)
  3. `execute.after` 钩子——IDE 工具调用以"不可用"告终(`MCP server "<名>" is not available` /
     `Error POSTing to endpoint`)→ 重跑接入流程,并把错误改写成"已重连,请重试";
     普通业务错误(文件不存在等)不动作
  ※ 三者都只在**确实有事发生**时动;没人用这个项目时,插件完全静止
```

## 接入 (`/open-in-ide` 与 `/add-sub-module-in-ide`)

### `/open-in-ide [ide]`

输入 `/open-in-ide`,把 root 及其**全部已登记子项目**接入。每个项目都用**它自己配置的 IDE** 打开:

1. **第一次(还没有配置)** —— 插件不猜:
   - 不带参数 → 插件先按**安装目录**探一次本机装了哪些 IDE(macOS 是 `/Applications` 与 `~/Applications`,
     Windows / Linux 按各自的常见位置),把结论写进任务文本,再让模型问用户。**不让模型自己去翻进程** ——
     `ps aux | grep` 只看得见**正在运行**的 IDE,装了没开就漏(实测踩过:PyCharm 明明装着,却被报成"未发现"),
     而且慢。**只有这一次**需要用户回答;
   - 带参数(`/open-in-ide pycharm`)→ 直通写入,不经过模型(模型不配合时的逃生口)。

   探测结果只用来"帮用户做选择",不决定"哪个 IDE 正开着这个项目" —— 后者始终由用户回答。探不到时
   (非 mac、或路径未知)那句提示干脆不出现,照常问用户。

2. **有配置后** —— 对每个已登记项目,在**它自己 IDE 的固定端口**上问「你认得这个项目吗」(`get_project_modules`,带项目路径 header):
   - 认得 → 用那个端口。这同时就是"这个项目被哪个 IDE 打开着"的判定(IDEA 与 PyCharm 是两个进程、两个端口);
   - 不认得 → `open -a "<该项目自己的 IDE>" <项目目录>`(**复用已运行实例**),再轮询等到认得(冷启动数十秒,上限 60s)。
3. 就绪后 **先注销全部旧注册 → 再按项目各注册一个 MCP server**(server 名 = 工具前缀),然后重读 IDE 环境、启用逐项目引导,
   并**等到 IDE 工具进入注册表**才返回。

> **非 macOS**:第 2 步的自动打开被跳过(没有对应的启动命令),请**先手动打开 IDE 和项目**,再执行本命令 ——
> 端口在监听、项目被认得就会正常接入。

> **通知不触发 AI 干活**:默认 `feedback: "message"` 把结果作为一条 **标注清楚的通知**发到会话里 —— 用户看到干净的通知气泡
> (经 `metadata.displayText`),模型只看到"这是通知,请只回复『收到』"的指令,因此不会执行任何操作、不会调用工具。
> `feedback: false` 则完全静默。**唯一例外**是上面"问用户用哪个 IDE"那条:它是**任务不是通知**,模型必须问完并调用工具才算完成。

**可重入 / 启动保护**:IDE 冷启动、索引或等待「Trust and Open Project」弹窗期间探测会失败。命令只发一次 MCP/Brave Mode 提示并
fast-fail,不会在后台轮询;重复触发共享同一次打开请求,**每个项目各自维护** `lastSpawnAt` / `attempts`,避免重复 spawn。

### `/add-sub-module-in-ide <路径>`

把一个子项目登记进配置。参数是**相对 root 的路径**(例如 `modelserver`),而且**只接受一个参数**:

1. 没有配置 → 直接报错,提示先执行 `/open-in-ide`(不提问、不写任何东西);
2. 校验:必须位于 root 之下、目录真实存在、**目录名合法**、前缀不与已登记项目重名、不占用保留名 `ide`;
3. 通过后发给模型一条**任务**:请它问用户这个子项目用哪个 IDE,答复后调用 `configure_ide_project` 回写。

**目录名的硬规则**(它就是工具前缀,所以不给猜的余地):必须匹配 `^[a-z0-9][a-z0-9_-]*$` —— 小写字母或数字开头,
只含小写字母、数字、`-`、`_`。不合规(大写、点号、空格、中文……)或与已登记项目重名,插件**一律拒绝**并说明原因,
由用户改目录名。插件**绝不**自动改名或自动消歧。

### 让模型回写:`configure_ide_project`

插件注册的一个**自己的**工具,是"用户选的 IDE"回到配置里的**唯一通道**(插件不能弹选择框,也不能挂起等回答):

```text
configure_ide_project({ ide: "<idea|pycharm>" })                 // 配置 root
configure_ide_project({ path: "modelserver", ide: "pycharm" })   // 配置一个子项目
```

它常驻在工具列表里(一个工具的 schema 只有几百 token,不值得为它做一套注册/撤销的状态机);
该不该被调用由工具描述约束 —— "仅当用户明确回答了用哪个 IDE 之后调用"。

## 删除接入 (`/delete-in-ide`)

输入 `/delete-in-ide`:**注销全部 IDE MCP** + 删除**整个**配置(root 与全部子项目,持久化 + 内存缓存一并清),
并清空注入的环境变量。之后 IDE 工具不再可用,也不会再因失败自动接入。想重新接入,再次执行 `/open-in-ide`。

**热更新会断开**:插件源码变更会触发 V2 热重载,注册随旧实例一起释放。**改完插件后重跑一次 `/open-in-ide`** 即可恢复。

## 按能力选工具 (直接调用引导)

IDE MCP 可用时,插件通过 **系统提示注入**告诉模型**哪些事该走 IDE**;不修改任何工具 (原生或 IDEA)
的定义、描述或可用性:

1. **系统提示注入**:通过 `ctx.session.hook("context", …)` 往每次请求的 system 里追加一段引导 + 能力映射表。**文本本身在
   `src/ide-guidance.template.md`**——它是一份要给人 review 的提示词文档,条件直接用 `{{#if …}}` 写在那几行外面,所以打开模板
   就能看到最终渲染成什么样;`src/template.js` 是渲染器(支持 `{{var}}` / `{{#if}}` / `{{else}}`,**不做 HTML 转义**——
   输出是 Markdown,`<jar>!/<entry>` 和反引号必须原样过)。含工具名 (`<项目前缀>_<name>`;root 是 `ide_*`,
   子项目是 `<目录名>_*`)与关键参数名:
   - **只有 IDE 才有的能力才写进去** —— 符号级检索、项目模型、检查与构建、重构与格式化、运行配置:
     - 符号 → `ide_search_symbol` / `ide_get_symbol_info` / `ide_analyze_calls`
     - 项目与编辑器 → `ide_get_project_modules` / `ide_get_project_dependencies` / `ide_list_directory_tree` /
       `ide_get_all_open_file_paths` / `ide_open_file_in_editor`
     - 重构/格式化 → `ide_rename_refactoring` / `ide_reformat_file`
     - 校验 → `ide_lint_files` / `ide_get_file_problems` / `ide_build_project`
     - 运行配置 → `ide_get_run_configurations` / `ide_execute_run_configuration`(+ 配套插件的启停工具)
     - 部署(**仅配套插件 + Ultimate**)→ `ide_list_deployment_servers` / `ide_upload_to_deployment` /
       `ide_download_from_deployment` / `ide_get_deployment_task_status`
   - **读、写、找文本、找文件用原生工具**(`read` / `write` / `edit` / `grep` / `glob`)—— 这几件事走 IDE 只是多一跳,
     所以映射表里**不出现** `ide_search_text` / `ide_search_regex` / `ide_search_file` / `ide_apply_patch` /
     `ide_create_new_file`,也不再禁止它们的原生对应物。
   - **唯一例外是 `ide_read_file`**:它是读**包内文件**的唯一手段(`<jar>!/<entry>` 的依赖 jar 内文件、`jrt://` 的
     JDK 镜像),引导只在这个用途上点名它,并写明普通文件一律用 `read`。

   **有两处不只写"工具能干什么",还写了"什么时候走它 / 不要走哪条替代路"**:
   一是「校验」,lint / build 在清单里等于没提醒 —— 实测模型绕开工具、自己去 `shell` 里临时编译一遍就宣布
   完成(它还为此给了一套自洽的理由:沙箱 IDE 是另一个进程)。这一节**先讲"改完自己先查一遍",再把判断权
   交回模型**:大片改动 → 全部改完一次 `build_project`(中途不查,半成品的检查结果只会误导);单点改动 /
   同一文件反复微调 → 告一段落时对这轮改过的文件一次 `lint_files`;改了签名 / 接口 / import / 依赖走 build,
   只动文件内部实现走 lint 就够。**两个失效方向都点名**——每敲一次编辑就查一次,和压根不查一样是错的,而
   "这一轮属于哪一种"只有模型自己知道,提示词只能给判据、不能替它决定。末两条是收口:查出来的问题要改掉或
   说明为什么不改;别用 `shell` 里临时编译代替 IDE 工具,也别先猜"索引还没同步 / 那是另一个进程"就绕开
   (实测两次绕开都是这句猜测,而工具其实一次就答了)。
   二是「符号」,而且它是被实测打回来的:**一个 IntelliJ 插件会话里 398 次 `shell`、模型自己 reasoning 里
   `javap` 出现 175 次,`search_symbol` 只出现 3 次(两次还是用户开口之后)**。老文案把这件事写成"找符号
   声明位置的技巧",而模型当时的动因是"这个平台方法到底怎么实现的"——两边对不上,触发点就永远不 fire。
   所以现在**先把动因写在节标题下面第一句**("要读任何类 / 方法 / 字段的源码,就两步"),把"依赖库 / 三方包 /
   平台 jar 里的实现"点明为**这套用得最多的地方**,并显式禁掉它真正的默认手艺:自己拼 jar 路径 + `javap` /
   `unzip` / 解包看字节码。理由给的是能赢过直觉的那条:**IDE 索引里那份就是项目编译时真正用的依赖**(自己
   拼的常常是另一份副本,版本对不上),而且读出来是反编译源码,不是要来回十几次才拼得出逻辑的字节码清单。
   总则里各有同义的一句,因为**总则才是每条路由规则都会路过的地方**,而这两类失败恰恰都是"整段跳过"。

   不会把整份工具目录重复塞进 system prompt,也不要求模型先写编排代码。IDEA MCP 工具自身的
   description/schema 仍是参数使用的权威来源;工具返回业务错误时先修正参数,不要误判成工具不可用。MCP 不可用时立即
   提示用户执行 `/open-in-ide`,不重复探测或等待。

   **总则里最靠前的两条是 Code Mode 规则**,而且第一条是**通用**的,不是 `ide_*` 特例:`工具列表里已经直接列出的原生工具,
直接调用,不需要也不应该用 Code Mode 的 `search` 去找`;第二条才落到 `ide_*`(它就是原生工具,且不在 Code Mode 目录里)。
   放在所有路由规则之前,因为它们是前提 —— 模型拿不到工具,后面写什么都没用。理由是实测过的失效:工具明明在原生工具
   列表里,模型却进 Code Mode 跑了一次工具搜索(Code Mode 自己的指令「用 `search` 找工具」读起来像是访问任何东西的通用
   姿势,而原文没有任何一句说明这些工具在哪),白绕一圈之后还可能得出"工具不可用"的错误结论。同一条约束也写在
   「工具已消失」的恢复提示里,避免掉线时又去 Code Mode 里找。

引导只在 **IDE MCP 可用**时生效;MCP 不可用时仅保留 fast-fail 恢复提示。`injectGuidance: false` 可关闭系统提示注入。

**条件注入**:映射表里只有内置 MCP Server 自带的那批工具是「永远写死」的。如果 IDE 里另外装了配套的
[`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance) 插件,它提供的**两组**工具会各自被加进下面的段落 ——
run configuration 的启停工具进「运行配置」段,部署工具进「服务器文件同步」段。判据都是**这次请求的工具快照里真的有这些工具**:
装不上的 IDE 上对应内容一个字都不会出现,模型不会去调一个不存在的工具。

两组的前提不同,所以是两组、两条独立的判据:启停工具只要有配套插件就有;部署工具**还要求
`com.jetbrains.plugins.webDeployment`(FTP/SFTP/WebDAV Connectivity)—— 它只在 Ultimate 里存在**。
用一个布尔覆盖两者,部署工具就会替"启停工具在不在"作答。

**逐项目核对到命令名一级**:配套插件的工具是**按项目分别存在**的,所以每条工具后面列出的命令名只包含
**真的提供它**的那些项目(`src/ide-guidance.js` 的 `ENHANCE_SUFFIXES` + `servesTool`)——
"根项目在 IDEA Ultimate、子项目在 PyCharm Community"时,部署那几条只会写根项目的命令名,不会顺手把子项目也写上去。
内置工具不受影响:它们每个项目都有一份,照旧全部列出。

## 工具参数 (schema 收敛 + `execute.before`)

有些 IDEA 工具**不传某个参数就会回答一个你没问的问题**。这种参数由本插件完全掌管,所以要**两半一起做** —— 只做一半都是错的:

| 一半                           | 做法                                 | 不做会怎样                                 |
| ------------------------------ | ------------------------------------ | ------------------------------------------ |
| 从模型的工具 schema 里**删掉** | `ctx.tool.transform` 改 input schema | 模型会设它、会据此推理,而那个值被无声丢弃  |
| 每次调用**设成固定值**         | `ctx.tool.hook("execute.before")`    | 模型不传时拿到的是那个可能出错的默认值本身 |

两半由 `src/mcp/idea-tool-defaults.js` 的**同一张表** `FORCED_ARGUMENTS` 驱动,所以不会漂移。目前一条:

| 工具                | 参数      | 值     | 为什么                                                                                                         |
| ------------------- | --------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `ide_build_project` | `rebuild` | `true` | 增量构建比对的是 **IDE 自己那份文件新鲜度**;IDE 外部改的代码可能被判成"没有脏文件",构建于是变成 no-op 并报成功 |

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

两半都**不依赖项目配置**:它们修的是工具调用本身,与"这个项目是否接入 IDE"无关。

## Run Configuration 全套 (配套插件 `idea-mcp-enhance`)

IDE 内置的 MCP Server 只能 **启动已有**的 run configuration(`execute_run_configuration`),**不能新建、不能停止、不能重启、
也查不到运行状态**。配套的 IDEA 插件 [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)(IDEA 2026.2+,另装)
补齐这四件事 —— 正好是「建 → 看 → 停 → 重启」一条链:

| 工具 (OpenCode 里叫 `ide_*`)         | 作用                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ide_create_shell_run_configuration` | 新建**项目级** Shell 配置(写 `.run/<name>.run.xml`);只支持 Shell 类型。**项目资产 —— 只给会重复发生的流程建,且必须先征得用户同意** |
| `ide_list_running_configurations`    | **当前真正在跑**的配置:几个实例 / 各自 pid / 退出码。`>1` 个实例就是端口漂移的信号                                                 |
| `ide_stop_run_configuration`         | 停掉该配置的**全部**实例并等它们退出;没在跑也返回成功(幂等)                                                                        |
| `ide_rerun_run_configuration`        | 等同 IDE 的 **Rerun** 按钮:在跑就重启、没在跑就启动,读 `started` 判断是否真起来了                                                  |

opencode-idea 对这一组工具做三件事:

1. **透传**:IDE MCP server 以 `codemode: false` 注册,工具目录整体转发,所以这四个工具自动以 `ide_*` 出现在模型的
   工具表里 —— 插件侧不需要单独声明(也因此**装不装这个 IDEA 插件,插件侧的代码都不用改**);
2. **条件引导**:只有这次请求的工具快照里真的有它们,才在「运行配置(配套插件 … 提供,装了才有)」**自己那一节**里逐个点名 ——
   和 IDE 自带的 `### 运行配置` 分开:两个来源,两节,读者要能分清"IDE 给我的"和"我额外装的"。没装插件时**整节连同标题一起消失**。
   两个地方会跟着变:
   - 「运行配置」段写明**改完代码要重启无热重载的进程就用 `ide_rerun_run_configuration`,不要用 `pkill` / `kill` / shell**
     —— 这正是它要解决的问题:外部杀掉的进程 IDE 并不知道,Run 窗口仍显示运行中,下次启动就会撞端口;
   - 「运行配置」段的**新建那条**把 run configuration 定性成**项目资产**:一个项目通常只建几个(固定要跑的构建 / 装依赖 / dev server / 迁移),
     **不是随手一条命令就建一个**;判据是**这件事以后会不会以同样形态再发生** —— 会就该建、模型必须**主动**向用户提议(摊开配置名 /
     实际命令 / 工作目录 / 理由),用户同意才动手;不会就裸 `shell` 跑完算(那条里写明了这层区分:`shell` 就地执行不留痕、
     建配置是落盘成 `.run/*.run.xml` 供反复用)。判据只写在这一处,**「命令执行」段不重复**,只留
     「配置一律不由你写」这条无条件的,以及"该建的用哪条路建"那一条按工具是否存在分流:有工具时指向上面那条、
     并说明非 Shell 类型与删 / 改交给用户调 `idea-run-config-manager` skill;
     没有工具时换成「讲清楚配置名 / 命令 / 工作目录 / 理由,请用户在 IDE 里自己建」—— 那时 skill 本身仍在(它不按工具门禁),
     但缺 create 工具时它也只能把流程交回用户,所以引导里顺手把这一点说明了,免得以后有人把它当成漏写而"补"上一句调不到的指令。
     **没装插件时绝不会提到那个工具。**
3. **工具名清单**写在 `src/mcp/enhance.js`(与原生 IDE 的 `src/mcp/idea.js` 分开放:原生走原生,插件的走插件的),
   与该仓库的 `RunLifecycleSchemas.kt` 保持同步。工具按**存在的子集**逐个点名(而不是「有就全写」),这样旧版本的配套
   插件少给一两个工具时,引导也不会提到它们。同理,**每条命令名只列真的提供它的项目**(逐项目核对,见「条件注入」)——
   一个项目装了配套插件、另一个没装是可能的。

> 没装 `idea-mcp-enhance` 的 IDE 一切照旧:工具不存在,引导也不提,模型继续按原来的方式工作。

## Run Configuration:增删改的入口只有一个 skill

内置 MCP 只能 **查**(`get_run_configurations`)和 **执行**(`execute_run_configuration`)run configuration;新建靠配套插件的
`ide_create_shell_run_configuration`(只有 Shell 类型,见上面的「Run Configuration 全套」);**修改和删除永远没有工具**。

所以插件的立场是:

- **配置由 AI 动手,但只在一个地方、按模板动手** —— `.run/*.run.xml` 只有 `idea-run-config-manager` skill 会写,而且照
  `skills/idea-run-config-manager/assets/types/` 里那个类型的模板写;**平时**(引导文本里)仍然禁止随手手写配置、或用一条裸命令代替配置;
- **Shell 类型**且装了配套插件 → 新建用 `ide_create_shell_run_configuration`(新建是项目资产:**会重复发生的流程才建**,且**必须先征得用户同意**);
- **有类型模板的其它类型**(Maven / Gradle / npm / Python / Go Build / Node.js)→ 直接写 `.run/<名字>.run.xml`;
  **改和删**对所有类型都是直接编辑 / 删掉那个文件;
- **没有模板的类型**(Application、JAR 以及 JUnit / Docker / Spring Boot / Flyway …)→ **交给用户在 IDE 里配**,skill 只负责把档案补上;
- 无论哪条路,**写完都要用 `get_run_configurations` 复查** —— `type` 写错 IDE 会静默忽略整个文件,这是唯一的判据;
- 这些事**不再散着说"让用户自己去 IDE 里搞"**,而是统一指向那个 skill:**让用户调它**(`@idea-run-config-manager`)—— 它是本项目 run
  configuration 增 / 删 / 改的唯一流程入口,**只能由用户触发**(理由见下面的「而且只能用户调」);
- **没装配套插件** → skill 仍然在(它现在不按工具门禁),只是缺 create 工具时它也只能把流程交回用户,请你在 IDE 里建。

> **曾经有一个 `idea-run-config` skill 教模型凭记忆手写 `.run/*.run.xml`,已经删掉。** 理由不是"不许写",而是**不许凭空写**:`type` 写错 IDE 会
> **静默忽略整个文件、日志里也不报**,凭记忆猜 option 名就是这么错的。现在这件事由 `idea-run-config-manager` 接手 —— 但**每个类型都得有一份实测模板**
> (`assets/types/`,字段名全部来自真实文件),没模板的类型宁可交给用户。

**skill 在插件加载时一次性注册,不跟随工具目录**:

- **判据只有"插件加载了"** —— 不看项目有没有 `/open-in-ide`、也不看 IDE 此刻serve 了哪些工具。
- **为什么不再按工具门禁**:早先的做法是"IDE 真的提供了这个 skill 绕着的工具才注册"(frontmatter 的 `requires:` + `ctx.tool.list()`)。
  门本身是对的,但**注册时机错了**:它发生在 `/open-in-ide` 完成之后,而客户端在这之前就已经把 skill 列表快照给当前会话了 ——
  结果是"服务端注册了、`@` 补全里看不到",**必须刷新页面才出现**。注册提前到 `setup`,就落在快照之前。
- **工具缺失的代价放回正文** —— skill 里本来就写了"工具列表里没有 `<前缀>_rerun_run_configuration` 时交回用户"这类话;
  一个缺席的工具是模型能读到并处理的事实,一个看不见的 skill 不是。
- **`requires:` 这个键已彻底删除** —— 它曾是本插件自己的门禁元数据,OpenCode 不认,注册走 `ctx.skill.transform` 时也不会带上它;
  门禁取消后它就成了"看起来在设门、实际没人读"的死字段,留着只会误导下一个改代码的人。skill 绕着哪几件工具写,由正文自己说明。

文档放在 `skills/<id>/SKILL.md`(每个 skill 一个目录,`name` / `description` 走 YAML frontmatter,需要"只由用户调"时再加
`metadata: opencode/autoinvoke: false`),由 `src/skill/loader.js` 扫描加载 —— **加新 skill 只需加一个目录,不用改代码**。


还可以用 OpenCode 官方的 frontmatter 写法**关掉模型主动调用**:

```yaml
metadata:
  opencode/autoinvoke: false
```

意思是这个 skill 仍会注册、仍能按 ID 加载,但**不进模型的可选列表** —— 只能由用户显式指定(`@<skill-id>`)触发。
loader 读的是 OpenCode 文档里的那个嵌套写法(它自己的读取器是扁平的,缩进行落地成 `opencode/autoinvoke` 这个带命名空间的键,
`metadata:` 那行则为空 —— **这一层嵌套是刻意支持的**),再翻译成注册定义的 `autoinvoke`(注册 API 用的名字);
值只接受 `true` / `false`,写错直接报错 —— 一个拼错的开关若被静默忽略,技能就仍然会被模型自动调用,那正是这个开关要防的事。

## Standalone 模式纪律 (skill)

本机直跑应用的**项目级纪律**由 `idea-standalone` skill 固化:它把这份纪律写进**项目根 `AGENTS.md`** 里由
`<!-- idea-standalone:begin -->` 与 `<!-- idea-standalone:end -->` 包裹的**标记块**(根 `AGENTS.md` 本来就是 AI 在本项目
工作时必读的文件,所以不需要另建规则文件、也不需要 always-apply 开关;标记块是"以后改没改过"的判据)。骨架与各段写作规范在
`skills/idea-standalone/assets/AGENTS.template.md`,**SKILL.md 只写流程、指向模板**,不重复骨架。三段固定 ——

1. **什么是 standalone 模式**:**standalone = 启动收口只有 IDEA run configuration**(每个应用的启动入口是 run configuration,不是手搓命令行;
   至于配置内部怎么起 —— 本机进程 / 容器 / 部署到远端 —— 由它自己决定,本段不预设),只启动其中一部分是常态;
   **跑应用只用 `ide_rerun_run_configuration`**(在跑就重启、没在跑就启动)
   —— 不必分辨启动还是重启,直接 rerun 就完事,常驻进程化 / 服务化的配置一律走这条;
   **`ide_execute_run_configuration` 不用于这里**(它是给命令 / Job 类型的配置跑的,对常驻进程只会起重复实例);也不绕开 IDEA 用
   `go run` / `pnpm dev` 这类裸命令或 `kill` / `pkill`;**重启不必先问** —— 改完代码要重启就直接 rerun,这条链是无人化的;
2. **启动哪些应用**:一行一个应用,启动路径**只能是 IDEA run configuration**(配置名必须能在 `ide_get_run_configurations`
   里查到;**缺配置就交给用户** —— 让他调 `idea-run-config-manager` skill 去建),端口与被依赖的先后顺序一并写明;
3. **热重载矩阵**:逐应用标"是 / 否" —— 带 HMR 的 dev server 改动后**不用**提示重启;`go run .` 这类无热重载的进程改动后
   **必须**显式点名「需要重启 <应用>」,不得在未提示的情况下宣称"改完可验证";
4. **项目补充条款**:文件写入位置、测试纪律、访问归属、dev 模式特有限制等,按用户给的条款逐条续写、保留原意。

事实一律先查后写:配置名来自 `ide_get_run_configurations`,热重载列来自运行方式,端口读不到就问用户 —— 不猜。
**只动自己的标记块**:根 `AGENTS.md` 是共享文件(`project-scaffold` 的宪法、项目自己的内容都在里面),标记之外一字不改。

## run configuration 增删改 + 档案 (skill)

`idea-run-config-manager` skill 做三件事:

1. **建 / 改 / 删**(直接动手):Shell 类型走 `ide_create_shell_run_configuration`,其余类型直接写 / 改 / 删 `.run/<名字>.run.xml`,
   **每种类型照自己的模板写**,写完用 `get_run_configurations` 复查;
2. **建档**:过滤之后剩下的每个 run configuration 在**项目根 `AGENTS.md`** 的标记块(`<!-- idea-run-config-manager:begin -->` /
   `<!-- idea-run-config-manager:end -->`)里占**一个条目** —— 标题是配置名(括号里写它属于哪个项目),下面五项固定:
   `when` / `before run` / `run` / `after run` / `desc`;
   **每一项各选一种写法**(行内 / 子列表),同一配置里可以混用 —— 全行内、全子列表、混合(例如 `when` 一句、`after run` 三条)都合法,判据只有"这一项自己有几句话",模板里给了两种形态的可照抄例子;
   `when` 回答的是**谁能起它**,而这件事只有三种:`用户授权触发`(用户开口 / 在本会话里一次性授权之后 AI 才跑,后面写用户通常在什么情况下要它跑)、
   `AI 自己触发`(AI 判断到场景就自己跑,**必须把场景写具体**)、`用户手动触发` ——
   最后这一种**不进条目**,只登记在块末尾「用户手动触发(线下,AI 不跑)」一节,**只有名字**,五项一律不写(没人会照它跑);
   判断不了就问用户,有副作用(改远端 / 动数据 / 出产物)又说不清场景的,归"用户授权触发";
   `after run` 写跑完的结果(产物落在哪、接下来要不要发布 / 拷贝 / 通知,没有就写 `无`),`desc` 写它是什么、有什么坑 —— **五项始终都在**,不省略;
   **按操作系统分成两节**(macOS / Linux、Windows,与 `idea-standalone` 的两张应用表同一种拆法:同一条流程在两个平台上常常不是同一条命令);
   **与 `idea-standalone` 应用表的列同名同序** —— `before run` / `run` / `after run` / `desc` 四项两边一致;
   本块多 `when`(服务化应用就是改完代码起它来测,没有别的时机),那边多 `app` / `run configuration` / `port`;
   **热重载矩阵只有 3 列,不参与这套对应** —— 它答的是"改动后要不要重启";
   **目录 / 端口 / 干什么都不单开一项**(standalone 的端口除外):前两个配置里本来就有,抄进来只会过时,第三个与 `desc` 重复;
3. **过滤**:服务化(长驻应用)的配置归 `idea-standalone` 的块,这里先读那个块把它排除,**两个块永不重叠**。

> **两个块的形态刻意不同**:档案块是**条目式**(一条配置一个条目,五项各占一行 —— `desc` 常是一段话,塞进表格格子里既难读、
> 又要靠补空格维持对齐),`idea-standalone` 的应用表**保持表格**(列短、还有 `端口` 这种一格一个值的列)。
> 所以两边靠的是**同名同序的四项**(`before run` / `run` / `after run` / `desc`)加各自独有的列,而不是宽度;
> `AGENTS.md` 里一眼能看出哪几条是服务、哪几条是固定流程,靠的就是它。

**SKILL.md 只有一份五步流程**(读 → 枚举 → 建 / 删 / 改 → 同步 → 核对),外加**支持矩阵**与**硬性契约**(落地位置、固定信封、复查、
路径宏、不要写模板外的字段)——**它自己就带着规矩**;两类内容另放在两个地方,各管一段:

| 模板                                                       | 装什么                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `skills/idea-run-config-manager/assets/types/<类型>.md`    | **一个类型一份**:那个类型的实测样本 + 字段表 + 坑(索引就是 SKILL.md 里的**支持矩阵**) |
| `skills/idea-run-config-manager/assets/AGENTS.template.md` | 产物(档案)的骨架:条目怎么写、五项分别写什么、枚举与过滤的要求,都在它的生成提示里      |

**支持矩阵(7 份已落、2 份待实物)**:

| 类型                                     | `type` id                                                                                                                               | 验证                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Shell Script                             | `ShConfigurationType`                                                                                                                   | ✅ 本机 6 例(含 Windows)                              |
| Maven / Gradle / npm / Python / Go Build | `MavenRunConfiguration` / `GradleRunConfiguration` / `js.build_tools.npm` / `PythonConfigurationType` / `GoApplicationRunConfiguration` | ✅ 实物                                               |
| Node.js                                  | `NodeJSConfigurationType`                                                                                                               | ⚠️ 三个属性已验证,其余字段未验证                      |
| Application / JAR                        | `Application` / `JarApplication`                                                                                                        | ⏳ type 已验证,**字段层无实物 → 暂不写模板,交给用户** |

矩阵之外(JUnit / TestNG / Kotlin / Docker / Spring Boot / Tomcat / Flyway / Liquibase / HTTP Request …)一律**没有模板** → 交给用户在 IDE 里配。

**给某个类型补模板的流程**:在 IDE 里建一个最简配置 → 勾 Store as project file → 读生成的 `.run/*.run.xml` 照抄结构 → 标清哪些字段实测 →
把矩阵里那个类型从 ⏳ 改成 ✅。**每个字段名都来自真实文件,不靠猜** —— `js.build_tools.npm`(属性 + 自定义元素)、`ShConfigurationType`
(`<option>` 子元素)、`NodeJSConfigurationType`(全属性)三种写法并存,套错就是静默失效。

**先过滤,再建档**:**服务化的配置不进这个块** —— 它们已经登记在 `AGENTS.md` 的 `idea-standalone` 块里(端口 / 热重载也写在那里),
所以建档第一步是读那个块、把它的表里出现过的名字记下来并排除,**剩下的**才是本块内容。

这个档案块**以带前缀的工具为准**,不围绕 IDE 界面说话:各项目各有自己的前缀(root 是 `ide`,子项目是它的目录名),枚举与执行都用**它自己那个前缀**的
`<前缀>_get_run_configurations` / `<前缀>_execute_run_configuration` …;**条目标题括号里写的就是这个前缀**,一条配置属于谁、该用哪套工具跑由它决定。

这个块的用途是**能被下次读到**:要办同类事情时先查它,有现成的就用,不再重复建 —— 所以**联动是硬要求**:配置被**新建 / 删除 / 修改**
(无论谁做的:工具建的、用户自己建的、用户删掉的)都要在文档里同步**加条目 / 删条目 / 改条目**,否则它就开始骗人。

**别的文档都指向这里**:引导文本与 `idea-standalone` skill 碰到"要建 / 删 / 改一个配置",不再让用户自己去 IDE 里摸,而是让用户调本 skill ——
增 / 删 / 改的流程入口只有这一个,而它只由用户触发。

**它绕着"新建配置"这件事写**(新建只有配套插件 `idea-mcp-enhance` 能做),但**这不影响它出不出现** —— 两个 skill 都在插件加载时注册,
不缺任何工具也照样在列表里;缺工具时由正文把流程交回用户(`idea-standalone` 只要 `rerun_run_configuration`,门更松)。这是刻意的:
一个只教模型"去建配置"、却没给建配置工具的 skill,只会把用户拖进一次注定失败的调用。

**而且只能用户调**:它的 frontmatter 带 `metadata: opencode/autoinvoke: false`,loader 翻成定义的 `autoinvoke: false` ——
skill 照常注册,但**不进模型的可选列表**,模型不会自己挑上它,只有用户显式指定(`@idea-run-config-manager`)才会加载。
理由是它**直接动手改项目文件与项目资产**:`.run/*.run.xml` 与 `AGENTS.md` 都由用户自己按这个 skill 的流程来改,模型不主动挑上它。
「该不该建」的时机判断仍在引导文本的判据里(那是模型该管的事),**动手权**留给人。

## Deployment 全套 (配套插件 `idea-mcp-enhance`)

IDE 内置的 MCP Server **完全不碰部署** —— 既不报 IDE 里配了哪些 Deployment 服务器,也不能把文件传上去 / 拉下来。
配套插件 [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)(IDEA 2026.2+,另装)补齐这四个:

| 工具 (OpenCode 里叫 `ide_*`)     | 作用                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ide_list_deployment_servers`    | 本项目可用的服务器(名称 / 项目级还是应用级 / 协议 / host / port / **本项目里的路径映射**),以及**项目级**的部署选项与危险组合告警。**只读 IDE 配置,不联网** |
| `ide_upload_to_deployment`       | 把映射到的**本地目录**传到服务器(等同 IDE 的 Upload to …)。`mode` 默认 `mirror` —— **会删掉服务器上多出来的文件**;`upload` 则保留远端多余文件。**破坏性**  |
| `ide_download_from_deployment`   | 把服务器上映射目录的内容拉回本地(等同 IDE 的 Download from …),**以服务器为准**:两边都有的文件被远端覆盖(相同则不写)。**没有"保留我的版本"这个选项**        |
| `ide_get_deployment_task_status` | 用 `handle` 查一次传输的状态与计数;**永不启动任何传输**                                                                                                    |

opencode-idea 对它做三件事,和上面那组是同一套:

1. **透传** —— 工具目录整体转发(见「按能力选工具」),所以四个工具自动以 `ide_*` 出现在模型的工具表里;
2. **条件引导** —— 只有这次请求的工具快照里真的有它们,才出现「服务器文件同步」这一节。**这一节整节(含标题)都由配套插件提供**,
   所以一个工具都没有时它**完全消失** —— 不能像「运行配置」那样留一个空标题(那一节还有内置的 `get_run_configurations` /
   `execute_run_configuration` 撑着)。整节**锚在一个工具上**(模板里 `{{#if canListDeploymentServers}}` 直接包住标题):
   这四个由同一道前提注册、同进同出,拿其中一个当判据就够,不需要再造一个"四个里任一个"的聚合标志。触发条件也因此比
   上面那组更严:部署工具**还要求 `com.jetbrains.plugins.webDeployment`**,而它只在 **Ultimate** 里存在,
   所以 Community IDE 上这一节永远不出现;
3. **工具名清单**写在 `src/mcp/enhance.js`(`DEPLOYMENT_SUFFIXES` + `deploymentCapabilities`),与该仓库的
   `DeploymentSchemas.kt` 保持同步。**四个工具逐个点名**(而不是"有就全写"),而且每条命令名只列**真的提供它**的项目
   (见「条件注入」的逐项目核对):它们通常同进同出(同一道插件前提),但"通常"不是"总是" —— 点名一个模型调不到的工具
   就是一次注定失败的调用。

这节存在的理由是**一条路由规则**:往服务器传 / 取文件要走这些工具,**不要自己拼 `ssh` / `rsync` / `scp`** ——
IDE 的连接、路径映射、排除规则都在它后面,自己拼的那份与 IDE 看到、管理的不是同一份。文案里同时点明两件容易读错的事:
`mirror` 是**默认值**且**会删远端文件**(而 MCP 路径上没有确认步骤),下载**以远端为准**、没有"保留我的版本"。

还有一个语义必须写明,否则模型会把正常的中间态当失败去重试:上传 / 下载都在 IDE 后台跑,单次调用只等到 `waitMs`
(默认 10 秒)为止,返回 `state: "in_progress"` 是**正常**的 —— 拿 `handle` 调 `get_deployment_task_status` 接着看,
**不要用重复调上传 / 下载来代替**(那样拿不到进度)。

> **这一组没有 skill,和 run configuration 不同。** run configuration 要 skill 是因为"某种类型怎么写"是一批得逐类型实测的
> 模板(`assets/types/`);部署没有这层知识 —— 四个工具的 schema 已经说清 `serverName` / `mode` 怎么填,而"该不该传、传给谁"
> 是模型当场看 `list_deployment_servers` 的判断。再加一个 skill 只是把同一段话抄第二遍。

## 项目命令执行 (Run Configuration)

需要**项目环境**的命令(依赖用户在 IDE 里配好的 JDK / Node / Python 版本等),模型使用 **`ide_execute_run_configuration`**
执行 —— 走 run configuration,不用原生 shell。

- 判据是:这条命令**依赖项目的运行时版本**。是 → run configuration;不是(看文件、git、临时脚本)→ 原生 shell。
- run configuration 会继承开发时具体配的那套运行时,或者干脆是你那个应用配好的运行时,所以这就是个应用。
- 配置必须**先在 IDEA 里存在**(项目级 `.run/*.run.xml`,**由用户建**)。没有就请用户建一个,再跑;

> 为什么不再用 IDE 终端:`ide_execute_terminal_command` 之前被当成"自动继承 IDE 项目环境"的通道而保留暴露,但实测
> **它拿不到项目配好的 JDK / Node / Python 版本**,和原生 shell 没有区别。既然没有优势,就把它从模型可见的工具表里
> 隐藏掉(`HIDDEN_IDE_TOOL_SUFFIXES`),命令执行的路由改由 run configuration 承担。

引导文本由 `src/ide-guidance.js` 注入(`### 命令执行` 段),只在 IDE MCP 可用时生效。

## 前置条件

- JetBrains IDE 已开启 MCP 服务 (IDE 设置里的 MCP Server / AI Assistant MCP),版本需 **2026.2+**(提供 Streamable HTTP 端点
  `/stream`);若关闭,`/open-in-ide` 会立即提示如何重新开启。
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
> SSE (POST 返回 405),V2 连不上。插件对 IDE 的**探测**也走 `/stream`(一次项目作用域的 `get_project_modules` 调用),
> 用来确认"这个 IDE 里打开着这个项目"。

**端口是产品常量,不开放配置**:IDEA 的 MCP 在 **64342**,PyCharm 在 **64462**(见 `src/ide-projects.js` 的 `IDE_PORTS`)。
"哪个 IDE 在哪个端口"跨版本不变,所以插件不需要扫描候选端口 —— 探哪个端口,由项目的 IDE 唯一决定,用户不需要填任何东西。

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
`/open-in-ide`)。

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
        "injectGuidance": true, // IDE 可用时注入逐项目的「优先使用 IDE 工具」引导
        "openInIde": true, // 是否允许自动拉起 IDE;false 只连已运行的端点
        "launchCooldownMs": 120000, // 启动保护冷却(按项目各自计)
        "launchMaxAttempts": 5,
        "mcpProbeTimeoutMs": 1000, // 单次「这个 IDE 里打开着这个项目吗」探测的超时
        "executionTimeoutMs": 600000, // 单次 IDE 工具调用硬上限;默认 10 分钟(OpenCode 默认 12 小时)
        "feedback": "message", // "message"(默认,会话通知,AI 只回"收到")| false(静默)
      },
    },
  ],
}
```

不传 options 时全部使用下表默认值。

| 选项                 | 类型                 | 默认        | 说明                                                                                           |
| -------------------- | -------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `injectGuidance`     | `boolean`            | `true`      | IDE 可用时是否注入逐项目的「优先使用 IDE 工具」引导                                            |
| `openInIde`          | `boolean`            | `true`      | 是否允许自动拉起 IDE;`false` 时仍会连接**已经运行**的端点。**用哪个 IDE 由每个项目的配置决定** |
| `launchCooldownMs`   | `number`             | `120000`    | 启动保护冷却:冷却期内不重复 spawn(每个项目各算各的)                                            |
| `launchMaxAttempts`  | `number`             | `5`         | 单次会话内最多 spawn 次数,超出后停止重试(每个项目各算各的)                                     |
| `mcpProbeTimeoutMs`  | `number`             | `1000`      | 单个 MCP 端口的短探测超时                                                                      |
| `executionTimeoutMs` | `number`             | `600000`    | 单次 IDE 工具调用的硬上限(毫秒);防止端点卡住后无限等待(OpenCode 默认 12 小时)                  |
| `feedback`           | `"message" \| false` | `"message"` | 结果反馈:`message` 会话通知(用户可见,AI 只回"收到");`false` 静默                               |

## 行为

- **已配置的 root**:启动读回配置后挂上 shell 环境钩子 (环境值待接入后填充)、按 IDE 实际提供的工具同步 skill
  (IDE 还没应答时依赖配套工具的 skill 不注册);全部 IDE MCP 由 `/open-in-ide` 注册。
- **未配置的 root**:不改环境、不注册、不注入任何 IDE 提示 (每请求零开销;setup 时只做一次配置读取)。
- **手动接入 + 就绪即返回**:`/open-in-ide` 会按**每个项目自己的 IDE** 分别 `open -a` 拉起并**等 IDE MCP 就绪**(冷启动数十秒,
  上限 60s);就绪后 **先注销全部旧注册 → 再按项目各注册一个 server**(远程 Streamable HTTP),等 IDE 工具就绪,最后才通知。
  **每次执行都重建**。命令返回即可用;`/delete-in-ide` 注销全部注册 + 删配置 + 清环境。
- **`context` 钩子是请求的纯函数**:按「每次模型调用」触发 (含工具续跑),只看本次请求自带的工具快照 —— 有任一项目前缀的工具就
  **按每个前缀**剥离隐藏工具并注入**逐项目**引导;没有则只在已配置时给恢复提示。该钩子本身**不做任何 I/O**(只看内存缓存)。
- **请求驱动的恢复(没有后台轮询)**:
  - **`prompt` 钩子**:「已配置 + 本实例没有任何 MCP 注册」时**探测端口并重新注册**(只探测、绝不 `open -a`)。OpenCode 会
    await `prompt` 才构建请求,所以**触发它的那条消息本身**就带上了 IDE 工具,没有空窗。这正是 Location 被空闲驱逐
    (60 分钟 `idleTimeToLive`)或 OpenCode 重启后,新实例自动接回连接的路径。
  - **`context` 钩子**:发现「本会话见过 IDE 工具、本请求却没有」→ 立刻锁存并在后台重建(不等下一条消息)。工具缺失时注入的
    恢复引导会**明确禁止**调用任何 IDE 工具(此前复用"重试一次"的文案,反而诱导模型去调一个不在工具表里的工具,
    得到 `No tool named ... available`)。
  - **`execute.after` 钩子**:见下一条。
    恢复是**每个 Location(项目)各一份**;没有任何定时器,插件在不使用时完全静止。
- **失败触发的自动接入(仅已配置的 root)**:`tool.execute.after` 钩子监听 IDE 工具报错并**分类**:
  - IDE MCP 不可用(掉了)→ 重跑 `/open-in-ide` 的接入流程;
  - IDE 在、但项目没打开(`Unable to determine the target project` / `doesn't correspond to any open project`)→ 让**这个工具
    所属项目**的 IDE 重新打开它(**不会**去动别的项目);
  - 普通业务错误(`File not found` 等)→ **不动作**。判定只认**传输层专有标记**(`MCP server "<名>" is not available` /
    `MCP server is not connected` / `Error POSTing to endpoint`),**不认**工具输出里出现的通用串
    (例如 SQL 工具报的 `Connection refused`) —— MCP 工具错误的 message 就是工具自己的输出,认通用串会把正常业务失败误判成掉线并重建。
    触发成功会把该工具错误改写为"已重连 / 已重新打开,请重试",模型在同一回合内重试;失败则保持原错误。非 IDE 工具、未配置
    的 root 都不受影响。启动保护 (`launchCooldownMs` / `launchMaxAttempts`) 限制重复拉起 IDE,**按项目各自计**。
- **`/open-in-ide`**:手动接入 root 与全部子项目;**等每个项目的 IDE 就绪 → 先注销全部旧注册 → 再按项目各注册一个 server →
  等 IDE 工具就绪**才返回。**`/delete-in-ide`**:注销全部 IDE MCP + 删整个配置 + 清空注入的环境。

## 限制

- 仅支持 **OpenCode V2** 插件 API (`ctx.tool` / `ctx.mcp` / `ctx.shell` / `ctx.command` / `ctx.session` /
  `ctx.location`)。
- IDE MCP 注册需要 IDE **2026.2+** 的 Streamable HTTP 端点 `/stream`;更早版本只有 `/sse`,OpenCode V2 无法连接。
- skill 定义的字段名**以 schema 为准**,不要照官方文档:`Skill.Info` 需要 `path` (AbsolutePath),文档里写的 `location`
  不存在 —— 用错会让 `ctx.skill.transform` 抛 `SchemaError`,而**任何 transform 失败都会禁用整个插件**(0.0.6 就是这样丢了
  `/open-in-ide`)。同理,`Skill.Info` 的完整字段是 `id` / `name` / `description?` / `autoinvoke?` / `path` / `content`。
- 需要项目环境的命令走 `ide_execute_run_configuration`(run configuration 要先在 IDEA 里配好),不用原生 shell。
- 一批用不到的 IDE MCP 工具被硬编码隐藏 (`src/plugin.js` 的 `HIDDEN_IDE_TOOL_SUFFIXES`,**共 48 个后缀**):
  VCS (`git_status` / `get_repositories`,版本控制走原生 `git`)、Router 派发工具 (`execute_tool`,未启用 router-only 时冗余)、
  Debugger (全部 `xdebug_*`)、Dev Kit MCP、Inspection KTS MCP、解释器环境 MCP、**IDE 内置终端
  (`execute_terminal_command`:实测不继承项目环境,对原生 shell 没有优势)**、**整个 Database 组**(数据源由用户在
  IDE 里配置,而 IDE 也不是本插件设想的数据库客户端),以及**有原生对应的文件读写**
  (`search_text` / `search_regex` / `search_file` / `apply_patch` / `create_new_file`
  分别对应 `grep` / `grep -E` / `glob` / `edit` / `write`)。

  存的是**后缀**,清洗时按当前每个项目前缀**各删一遍** —— 只处理 `ide_` 会让子项目那几份原样送到模型面前。
  实测数字(拿运行中的 IDE MCP 拉 `tools/list`,单个项目):IDE 暴露 **64** 个 → 隐藏 48 → **模型可见 16 个**,
  而且这 16 个**恰好等于引导里点名的 16 个** —— 没有"能看见但没人告诉它用途"的残留。多项目就是 N × 16:
  暴露面完全由插件决定,不需要 OpenCode 提供任何白名单能力,也不需要惰性注册。

- **部署工具只在 Ultimate 上出现**:`ide_list_deployment_servers` / `ide_upload_to_deployment` /
  `ide_download_from_deployment` / `ide_get_deployment_task_status` 来自配套插件(`idea-mcp-enhance`),而且额外要求
  `com.jetbrains.plugins.webDeployment`(**仅 Ultimate 有**)—— 少了任何一个前提,四个工具都不在,引导里的「服务器文件同步」一节
  也整节消失,模型照旧用原生手段处理文件传输。详见「Deployment 全套」。

- **端口是产品常量,不开放配置**:IDEA 的 MCP 在 **64342**,PyCharm 在 **64462**(`src/ide-projects.js` 的 `IDE_PORTS`),
  跨版本不变。所以"探哪个端口"由项目的 IDE 唯一决定,不需要扫描候选端口,也不需要用户填任何东西。
- 探测只回答一个问题:**「这个 IDE 里打开着这个项目吗」** —— 一次项目作用域的 MCP 调用
  (`get_project_modules`,带 `IJ_MCP_SERVER_PROJECT_PATH`):返回模块 = 认得 → 绑定;报
  `Unable to determine the target project` = 不认得 → `open -a` 打开它并继续轮询到认得(上限 60s)。
  项目刚打开时的短暂"未就绪"由工具失败分类兜底(「IDE 在、但项目没打开」→ 重新打开并让模型重试)。
- **IDE 的「目录包含」语义(实测)**:请求路径落在某个**已打开项目的目录树内**时,IDE 会把它解析到
  那个项目,而不是报错。所以「子项目与 root 配同一个 IDE」时,只要那个 IDE 打开了 root,子项目就被判成
  "已打开" —— 它确实是 root 项目的一部分,工具能操作它的文件,但语言支持按 **root 项目**走(例如
  Python 子项目被 root 的 Web 模块解析,符号检索与检查会不准)。这是 IDE 的语义,绕过不了;要让子项目
  按自己的模块解析,就得让它在那个 IDE 里**单独打开**成一个项目,或者(正常做法)给它配它真正被打开的
  那个 IDE。完全不在任何已打开项目下的路径(`/tmp`、不存在的路径)两个 IDE 都会正确报错。
- **项目路径按 IDE 的写法归一化**:IDE 收的是系统无关形式(正斜杠),其自带配置示例在 Windows 上也是
  `"E:/gitea/secondev-demo"`。OpenCode 的 `location` 在 Windows 上是原生反斜杠,所以 `src/mcp/idea.js` 的
  `ideProjectPath()` 把它转成正斜杠,**注册与探测走同一个函数**,两者必须一致,否则会用一种写法注册、又用另一种
  写法去问,永远匹配不上。macOS 上是原样透传。
- IDE **2026.2+** 提供 Streamable HTTP 端点 `/stream`,这是插件**唯一**使用的传输(`type: "remote"`)。注册本身不启动任何子进程,
  所以没有"桥进程被 IDE 拖死后变成僵尸"这一类问题。`/open-in-ide` 仍要求 IDE MCP 已在监听(冷启动约数十秒),因此会先等就绪再注册。
- **空闲驱逐(已实测)**:OpenCode 把一个 Location 的服务缓存在 `LayerMap` 里,`idleTimeToLive` = **60 分钟**;空闲到期即整体驱逐,
  插件实例连同**全部** IDE MCP 注册一起消失。**两种传输都躲不过**,所以对策不是换传输,而是请求驱动的恢复(见「行为」):
  - 新实例上第一条用户消息的 `prompt` 钩子会把连接接回来 —— 常态下**不需要用户手动做什么**;
  - 手动重建仍可用:执行 `/open-in-ide`(先注销全部旧注册、再重新注册);
  - 插件给每个 server 配 `executionTimeoutMs`(默认 **10 分钟**)作为硬上限:兜住端点卡住时的单次调用,不再沿用 OpenCode 默认的 12 小时;
  - "IDE 被关掉"这一类会被下一次 IDE 工具调用暴露(HTTP 直接报错),由 `execute.after` 钩子分类后自愈;不产生 error 的场景(例如
    IDE 进程还在但项目没打开)由「IDE 在、项目没打开」分支处理。
- 配置存在插件名下 KV (`plugin:opencode-idea:project/<root 路径>`),内容是
  `{ root: { path, app }, children: [{ path, app }] }` —— root 与每个子项目**各自的 IDE** 都记在里面。插件实例按
  **Location**(项目/打开目录)创建,配置按 **root 路径**共享;旧版存过的布尔 `true` 会按"root 用 idea 的 v1 配置"读入。
- `/delete-in-ide` 会**注销全部 IDE MCP** 并删**整个**配置 + 清空注入的环境。
- **目录名就是工具前缀,不合规一律拒绝**:必须匹配 `^[a-z0-9][a-z0-9_-]*$`(小写字母或数字开头,只含小写字母、数字、`-`、`_`)、
  不与已登记项目重名、不占用保留名 `ide`。插件**绝不**自动改名或自动消歧 —— 静默改一个名字,等于用户的目录和模型看到的工具名
  对不上,而且没人会发现。
- 插件**完全不再检查 `.idea` 目录**:是不是 IDE 项目只由配置(`/open-in-ide` 设置、`/delete-in-ide` 清除)决定。
  (`/open-in-ide` 会让对应 IDE 打开并导入该项目,`.idea` 由 IDE 自己生成,插件无需也不应据此判断。)
- **自动拉起 IDE 仅实现 macOS** (`open -a`)。其他平台(包括 Windows)没有对应的启动命令,**请手动打开 IDE 和项目**,再执行
  `/open-in-ide` —— 端口在监听、项目被认得就会正常接入,其余能力(注册、探测、自愈、工具暴露)与 macOS 完全一致。
  IDE 里打开 MCP 服务(2026.2+)并启用 Brave Mode;首次打开若弹 Trust 对话框,需确认后重试。
- IDE MCP 没有「打开项目」工具,因此打开动作走 OS/CLI,而非 MCP。
- 插件热重载会断开 IDE 连接,需重跑 `/open-in-ide`。
- 插件不修改任何**它不接管**的工具定义或描述;IDE 工具以 `<项目前缀>_*` 直接暴露给模型 (`codemode: false`),不用 `execute` 包裹。
  唯一的例外是 `rebuild` 参数(见「工具参数」),它对每个项目前缀各处理一遍。

## License

MIT
