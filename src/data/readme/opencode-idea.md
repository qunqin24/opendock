# opencode-idea

OpenCode 插件,面向 JetBrains 项目 (IntelliJ IDEA),做两件事:

1. **接入 IDE MCP** —— 把当前 JetBrains 项目在它的 IDE 里打开,并把这些 IDE 的 MCP 工具注册进 OpenCode。
   一个 OpenCode 会话只接入 **一个** 项目(当前 workspace root),MCP server 固定叫 `ide`,工具前缀固定 `ide_*`。
2. **优先使用 IDE 工具** —— IDE 可用时,向模型注入引导:原生工具做不到的事才用 IDE 工具;IDE 不可用时
   回退原生工具 (正常回退,无需声明)。

> **需要项目环境的命令也走原生 shell**:项目配置的 JDK / Node / Go / Maven / Python 由配套插件的 `get_project_env` 取出,
> 本插件在每条 shell 创建前注入到它的 `PATH` 与环境变量里;**反复发生的流程**仍固化成 Run Configuration。
> **IDE 内置的 `ide_execute_terminal_command` 继续隐藏** —— 实测它不继承项目环境。详见「Run Configuration 全套」与「终端全套」。

非 JetBrains 项目完全不受影响。 **手动接入**:插件启动不探测、不连接任何 IDE。两个命令管接入:

| 命令 | 作用 |
| --- | --- |
| `/open-in-ide` | 接入当前项目:在 IntelliJ IDEA 里打开它,并把 IDE MCP 工具注册进来 |
| `/delete-in-ide` | 删除配置并注销 IDE MCP |

配置持久化在 `ctx.storage`(`project/<root 路径>`),重启 OpenCode 后仍在。之后**没有任何后台轮询**——恢复完全靠请求驱动:
插件发现"该有 IDE 工具却没有"(新实例)或"IDE 工具调用失败"(掉线)时,**在下一条消息发出前静默接回**(用户无感)。
没跑过 `/open-in-ide` 的 root 保持全手动、零自主动作。

> **为什么改成请求驱动**:OpenCode 把一个 Location (项目)的全部服务缓存在 `LayerMap` 里,空闲 **60 分钟**
> (`idleTimeToLive`)后整体驱逐——插件实例连同全部 IDE MCP 注册一起消失。这一点两种传输都躲不过,所以与其后台探活
> (永远晚一步、还刷 IDE 日志),不如在请求前发现并把连接接回来。

## 工作原理

```text
setup(启动, 每 root 一次):
  a. 读配置(ctx.storage: project/<root 路径>)—— 只记"用户已接入过"
  b. 注册 2 个命令 + session context/prompt 钩子 + tool 钩子
  不探测、不注册任何 MCP

/open-in-ide(手动触发, 阻塞到就绪):
  1. 没有配置 → 写标记(只表示"用户已接入过")
  2. 在 IntelliJ IDEA 的固定端口上调用 get_project_env,比较返回的 projectPath 与当前项目路径
       · 完全一致 → 已打开
       · 不一致 / 没打开 → open -a "IntelliJ IDEA" <项目目录>,再轮询等到一致(上限 60s)
  3. 注册一个 MCP server(名字固定 `ide`)
  4. 等 IDE 工具进入注册表;拉项目环境;启用引导
  5. 发结果通知

/delete-in-ide(手动触发):
  1. 删除配置 + 注销 IDE MCP + 清空注入的环境
  2. 发结果通知

工具失败触发(仅在有配置的 root 里):
  IDE 工具调用失败 → tool execute.after 钩子分类:
    - IDE MCP 不可用(掉了)→ 重跑接入流程
    - IDE 在、但项目没打开 → 让 IDE 重新打开它
    - 普通业务错误(File not found 等)→ 不动作

请求驱动的恢复(没有后台轮询;每个 Location 各一份插件实例):
  prompt / context / execute.after 三个钩子只在确实有事发生时动。
```

## 接入 (`/open-in-ide`)

输入 `/open-in-ide`,接入**当前 workspace root**。工具前缀固定 `ide_`,一个 OpenCode 会话只对应一个 IDE 项目。

**目录必须完全一致**:IDE 打开的项目目录必须等于 workspace root。IDE 打开父目录不算接入 ——
插件的判定方式是调用 `get_project_env`,比较它返回的 `projectPath` 与当前项目路径。

1. **第一次** —— 写标记（表示"用户已接入过"），然后继续往下走。**不需要问用户任何事**：只支持 IntelliJ IDEA。
2. **接着** —— 在 IntelliJ IDEA 的固定端口上问「你打开着这个项目吗」:
    - 是 → 直接用;
    - 否 → `open -a "IntelliJ IDEA" <项目目录>` (复用已运行实例),再轮询到确认 (上限 60s)。
3. 就绪后注册 MCP server (`ide`),重读项目环境,启用引导,并等 IDE 工具进入注册表才返回。

> **非 macOS**:自动打开被跳过 (没有对应的启动命令),请先手动打开 IDE 和项目,再执行本命令。

> **通知不触发 AI 干活**:默认 `feedback: "message"` 把结果作为通知发到会话里;用户看到干净气泡,模型只回"收到"。
> `feedback: false` 则完全静默。

## 删除接入 (`/delete-in-ide`)

输入 `/delete-in-ide`:注销 IDE MCP + 删除配置 (持久化 + 内存缓存一并清),并清空注入的环境变量。
之后 IDE 工具不再可用,也不会再因失败自动接入。想重新接入,再次执行 `/open-in-ide`。

**热更新会断开**:插件源码变更会触发 V2 热重载,注册随旧实例一起释放。**改完插件后重跑一次 `/open-in-ide`** 即可恢复。

## 远程配置 (`/sync-remote-config` / `/manage-remote-config`)

### `/sync-remote-config`

双向对齐:

- **server**:IDE 的 SSH 配置 → `hosts.json`(只写连接字段;`alias` / `deployments` / `exclude` 原样保留)
- **deployment**:`hosts.json` → IDE 的 Deployment 面板(调配套插件的 `sync_deployments`;只增/改,**不删**)

IDE 必须连着;没连上会提示先 `/open-in-ide`。写完整凭据(`password` / `privateKeyPath`) ——
**这个文件要不要提交进 git,由你决定**,插件不改 `.gitignore`。

```json
{
  "hosts": {
    "mbp": {
      "host": "yutaodeMacBook-Pro.local",
      "port": 22,
      "username": "yutao",
      "authType": "PASSWORD",
      "password": "…",
      "exclude": ["node_modules"],
      "deployments": [
        {
          "name": "mcp-test-project",
          "localPath": ".",
          "deployPath": "/Users/yutao/Desktop/data/test",
          "exclude": ["target", "logs/app.log"]
        }
      ]
    }
  }
}
```

`localPath` 按来源强制:

- **项目级** `<项目>/.opencode/remote-shell/hosts.json`:只能写**相对项目根目录**的路径(`.` 表示项目根,
  也可以是 `references/middleware` 这种子目录);写绝对路径会直接报错
- **全局** `~/.config/remote-shell/hosts.json`:被多个项目共用,只能写**绝对路径**

`exclude` 只接受**路径前缀**或**精确文件**(`node_modules`、`target`、`logs/app.log`),不支持 `*` / `?`;
server 级作用于此机器所有 deployment,deployment 级叠加在它之上。

### `/manage-remote-config`

提示词命令:让 AI 直接改 `hosts.json`(加 server / 加 deployment / 调 `exclude`)。改完由插件的指纹对账
**静默**推到 IDE —— 不需要再敲 `/sync-remote-config`,也不会往会话里插提示。

### `/remote-shell`、`/remote-sync` 与 `/remote-deployment`

三条都是**提示词命令**:不执行任何东西,只往会话里注入一段规则(和 `~/.config/opencode/commands/readonly.md` 同一个思路)。

- **`/remote-shell`** — 只负责远程命令:`remote_list_servers` + `remote_exec`,不要自己拼 `ssh`
- **`/remote-sync`** — 只负责文件上传 / 下载:`remote_upload` / `remote_download`,不启动进程
- **`/remote-deployment`** — 负责部署:`deploy_remote_process`(同步 + 启动 + 打开 Run 标签页)

```
/remote-shell mbp 看下磁盘
/remote-sync mcp-test-project download
/remote-deployment aidata-api
```

参数原样附在提示词末尾;**没带参数时,提示词会要求模型先问清楚**(服务器 / 命令 / deployment / 配置名),
不会自己挑一台。部署要的是 **Remote Process 配置名**,不是 deployment 名。

## 按能力选工具 (直接调用引导)

IDE MCP 可用时,插件通过 **系统提示注入**告诉模型 **哪些事该走 IDE**;除下面「工具参数与输出」那几处刻意的接管
(删一个参数、换一个描述),不修改任何工具 (原生或 IDEA) 的定义或可用性:

1. **系统提示注入**:通过 `ctx.session.hook("context", …)` 往每次请求的 system 里追加一段引导。
   **文本本身在 `src/ide-guidance.template.md`** —— 它是一份要给人 review 的提示词文档,纯 Markdown,只有每条工具后面的
   命令名(`{{cmd_xxx}}`)由代码填;`src/template.js` 是渲染器(支持 `{{var}}`,`{{#if}}` 仍在实现里但引导模板不再使用;
   **不做 HTML 转义** —— 输出是 Markdown,`<jar>!/<entry>` 和反引号必须原样过)。
   含工具名(`ide_<name>`)与关键参数名。

   > **配套插件 `idea-mcp-enhance` 是硬前提**:引导默认它一定装了,所以配套插件的工具 (运行配置启停 / 部署 / 终端)
   > **不做"有没有装 / 有没有这个工具"的判断**,直接写进引导。

   **路由总纲** —— 整个引导的第一条,按「路径在不在项目里」分路:

   - **项目内** —— **OpenCode 自带的工具为主**,它们更快。**它们做不了、或者做得很差的,才用 IDE 工具**:
     符号检索、依赖实现、重构、格式化、校验、运行配置、项目终端、跨文件补丁。
     **两边都不顺手时,你自己判断用 `shell` 里的命令** —— 那是**第三选择,不是第一选择**。
   - **项目外** —— **只有 OpenCode 自带的工具**,IDE 工具不参与。这不是保守,是硬事实:**请求的路径必须落在某个
     已打开项目的目录树内,IDE 才会去解析它**;项目外的路径(`/tmp`、别的仓库、用户主目录)两个 IDE 都会直接报错。

   **OpenCode 自带的工具做不到、或做得很差的能力才写进去**:

   | 能力 | 工具 |
   | --- | --- |
   | 符号 | `ide_search_symbol` / `ide_get_symbol_info` / `ide_analyze_calls` |
   | 项目与编辑器 | `ide_get_project_modules` / `ide_get_project_dependencies` / `ide_list_directory_tree` / `ide_get_all_open_file_paths` / `ide_open_file_in_editor` |
   | 重构 / 格式化 | `ide_rename_refactoring` / `ide_reformat_file` |
   | 批量改文件 | `ide_apply_patch` |
   | 校验 | `ide_lint_files` / `ide_get_file_problems` / `ide_build_project` |
   | 运行配置 | `ide_get_run_configurations` / `ide_execute_run_configuration`(+ 配套插件的启停工具) |
   | 远程执行 / 同步 | `remote_exec` / `remote_list_servers` / `remote_upload` / `remote_download`(本插件自带,凭据来自 IDE 的 SSH 配置,路径映射来自 hosts.json);本机环境变量由 `get_project_env` + shell hook 注入 |

   **读、找文本、找文件、改单个文件一律用 OpenCode 自带的工具**(`read` / `grep` / `glob` / `write` / `edit`):
   这几件事走 IDE 只是多一跳,所以映射表里**不出现** `ide_search_text` / `ide_search_regex` / `ide_search_file`。
   唯一例外是 `ide_read_file` —— 它是读**包内文件**的唯一手段(`<jar>!/<entry>` 的依赖 jar 内文件、`jrt://` 的 JDK 镜像)。

   **有七处不只写"工具能干什么",还写了"什么时候走它 / 不要走哪条替代路"**。每一处都是被实测打回来才补上的:

   | 处 | 当初错在哪 | 现在怎么写 |
   | --- | --- | --- |
   | 路由 | 只写"用 IDE 工具",没分项目内 / 项目外 | 见上面的总纲 |
   | 校验 | 清单里写着 lint / build,模型当没看见,自己去 `shell` 里临时编译一遍就宣布完成 | 先讲"改完自己先查一遍",再把判断权交回模型;两个失效方向(查太勤 / 压根不查)都点名 |
   | 符号 | 写成"找符号声明位置的技巧",而模型当时的动因是"这个平台方法到底怎么实现的"——两边对不上,触发点永远不 fire | 先写动因("要读源码就两步"),再显式禁掉默认手艺:自己拼 jar 路径 + `javap` / `unzip` |
   | 搜索 | 只写"用原生工具(read / grep / glob)",`grep` 是个裸词,模型读成了命令行的 `grep` | 每次提到都带限定词(原生侧「`grep` 工具」/ shell 侧「`shell` 里的 `grep`」),并点名禁掉 `shell` 里的 `grep` / `rg` / `find` |
   | 写文件 | 只写"写文件一律用原生 write / edit",但那俩都只管一个文件 | 放开 `apply_patch` 并点名;禁掉默认手艺:在 `shell` 里写脚本整文件重写 |
   | 改名 | 只写"按符号改名",模型读成"手动改一处",没想到它能跨文件按语义更新所有引用 | 写明"改符号优先走重构、改文字走文本工具",并说明它**不碰注释与字符串** |
   | 读文件 | 引导一个字没提 `read` 的 `offset` / `limit`,模型只看见 `sed` 这条路 | 点明"要读某一段就传 offset + limit",并禁掉 `shell` 里的 `sed -n 'a,bp'` |

   **后三条是拿全量会话统计出来的**,不是推测 —— 查 OpenCode 的会话库(`~/.local/share/opencode/opencode.db`),
   33231 次工具调用里:`shell` 里 `sed -n 'a,bp'` 2512 次、`shell` 里 python 脚本 3345 次,
   而 `ide_rename_refactoring` 只出现过 **1 次**(还是探针)。**工具是有的,是引导没告诉它什么时候用。**

   上面的规则在**总则里各有一句同义的**(总则才是每条路由规则都会路过的地方),而这几类失败恰恰都是"整段跳过"。

   不会把整份工具目录重复塞进 system prompt,也不要求模型先写编排代码。IDEA MCP 工具自身的
   description/schema 仍是参数使用的权威来源;工具返回业务错误时先修正参数,不要误判成工具不可用。MCP 不可用时立即
   提示用户执行 `/open-in-ide`,不重复探测或等待。

   **总则里最靠前的两条是 Code Mode 规则**,而且第一条是**通用**的,不是 `ide_*` 特例:`工具列表里已经直接列出的原生工具,
   直接调用,不需要也不应该用 Code Mode 的 `search` 去找`;第二条才落到 `ide_*`。放在所有路由规则之前,因为它们是前提 ——
   模型拿不到工具,后面写什么都没用。理由是实测过的失效:工具明明在原生工具列表里,模型却进 Code Mode 跑了一次工具搜索
   (Code Mode 自己的指令「用 `search` 找工具」读起来像是访问任何东西的通用姿势),白绕一圈之后还可能得出
   "工具不可用"的错误结论。

### `ide_rename_refactoring` 的实测能力边界

在 `mcp-test-project`(Java / Python / Go / JS 四种语言各一个服务)上实测:

| 场景 | 结果 |
| --- | --- |
| 跨文件改名(3 个文件引用同一个符号) | ✅ 声明 + 全部调用点一起改,返回 `with 2 usages` |
| 改类名 | ✅ 连**文件名**一起改(`Calculator.java` → `PriceCalculator.java`) |
| 局部变量 / 对象字段 | ✅ 同一文件内全部引用一起改 |
| **注释里的同名文本** | ✅ **原样不动** |
| **字符串字面量里的同名文本** | ✅ **原样不动**(`with 0 usages`) |
| 符号不存在 / 文件不存在 / 大小写不符 | ✅ 明确报错(`isError=true` + 原因) |
| Java / Python / Go / ESM(`.mjs`) | ✅ 跨文件全对 |

关键是**注释和字符串都不动**:同一文件里符号出现两次(1 处声明 + 1 处字符串),语义重构只改声明,
字符串原样不动 —— 文本替换(`apply_patch` / `edit` / `sed` / python)会把字符串一起改,那就是**改了程序的输出**。

**但它不是硬规矩** —— 改的本来就是文字(配置 key、模板占位符、文档、SQL)、**你就是想改那句字符串**、
或者那个文件 IDE 根本没索引(生成物、vendor 目录)时,用文本工具才是对的。

**一个已知的坑**:`.js` + CommonJS `require()` 的跨文件解析,取决于 `package.json` 有没有被 IDEA 挂成 JS 模块。
没挂上时 `.js` 的模块系统不确定,`require()` 解析不了,改名就只改声明处;换成 **`.mjs`**(无条件 ESM)立刻正常。
所以引导里写了:返回的 `usages` 数比预期少,就是有引用没被解析到 —— **先确认 IDE 索引到那个模块**,
别拿文本替换去"补"漏掉的引用。

## 工具参数与输出 (插件接管的几处)

有些 IDEA 工具**不传某个参数就会回答一个你没问的问题**。这种参数由本插件完全接管,所以要**两半一起做** ——
只做一半都是错的:

| 一半 | 做法 | 不做会怎样 |
| --- | --- | --- |
| 从模型的工具 schema 里**删掉** | `ctx.tool.transform` 改 input schema | 模型会设它、会据此推理,而那个值被无声丢弃 |
| 每次调用**设成固定值** | `ctx.tool.hook("execute.before")` | 模型不传时拿到的是那个可能出错的默认值本身 |

两半由 `src/mcp/idea-tool-defaults.js` 的**同一张表** `FORCED_ARGUMENTS` 驱动,所以不会漂移。目前两条:

- `ide_build_project` 的 `rebuild` 强制为 `true` —— 增量构建比对的是**IDE 自己那份文件新鲜度**,IDE 外部改的代码
  可能被判成"没有脏文件",构建于是变成 no-op 并报成功(实测 IntelliJ 2026.2.3:`build_project` 落到
  `ProjectTaskManager.createAllModulesBuildTask(project, isIncrementalBuild = !rebuild)`,6 个场景全部识别到外部改动)。
- `ide_search_symbol` 的 `include_external` 强制为 `true` —— 它默认只搜项目符号,要搜 SDK / 依赖库得调用方
  自己记得带这个开关。我们恒定打开并把参数从 schema 里拿掉:模型看不到这个旋钮,但拿到的永远是全的结果。

- **强制**而不是"缺省才补":`rebuild: false` 请求的正是那个可能出错的答案,而调用方从结果里分辨不出来;`rebuild: true`
  唯一的代价是时间。调用方自己传了非空 `filesToRebuild` 时 IDE 走另一条分支、根本不读 `rebuild`,所以设不设都无副作用。
- **引导文本里一个字都不提 `rebuild`** —— schema 都不暴露了,再写进提示词等于把刚拿掉的旋钮又放回去。
- 安全性照着 OpenCode 源码确认过:一次工具调用**先**按该请求发布出去的 schema 校验,**然后**才进 `execute`,而
  `execute.before` 在真正的工具逻辑之前触发。所以"schema 里没有、钩子里补上"这个组合不会撞校验。
- **这是对早先「绝不改工具定义」那条规则的一次有意例外**,且刻意收得很窄:这里**只做减法,不发明、不解释** ——
  schema 变换**绝不能**用来加建议,那是引导文本的职责。
- 只对**点名的工具**生效,其余工具的参数一字不改。两半都**不依赖项目配置**。

### 描述覆盖（`DESCRIPTION_OVERRIDES`）

除了参数,插件还**整段替换**一部分 IDE 自带工具的描述 —— 只在**原文说错了**、或者**该说清的关键事实没提**时才改。

- **整段替换,不和原文拼接**:半原文半我们的句子读起来像两套口径,容易自相矛盾。
- **只写事实**:这个工具做什么、返回什么、什么时候用不上。"你应该怎么用"是引导文本的职责。
- 每条覆盖都记着**为什么必须改它**(例如 `search_symbol` 原文说"默认只搜项目符号" —— 我们恒定开着
  `include_external`,那句话就成了假话)。
- 覆盖的表在 `src/mcp/idea-tool-defaults.js` 的 `DESCRIPTION_OVERRIDES`,由 `applyDescriptionOverrides()`
  在同一个 `ctx.tool.transform` 里应用,和隐藏工具、删参数是同一条路径。

覆盖清单(**15 条**):`search_symbol`、`read_file`、`build_project`、`list_directory_tree`、`apply_patch`、
`rename_refactoring`、`lint_files`、`get_file_problems`、`analyze_calls`、`get_symbol_info`、`reformat_file`、
`get_all_open_file_paths`、`open_file_in_editor`、`execute_run_configuration`、`get_run_configurations`。

`get_project_modules` / `get_project_dependencies` 保持 IDE 原文 —— 它们的描述没有说错的地方。

### 另两处只"抬下限 / 补提示",不固定值

`list_directory_tree` 有两处接管,都不用固定值 —— 模型仍然需要传 `maxDepth`,所以 schema 不删它:

- **调用前**(`RAISED_ARGUMENTS`):`maxDepth` 抬到至少 **50**,更大的值照用。它是绝对深度上限,却只展开
  `maxDepth-1` 层,`6` 正好断在 Java 包目录上;而输出到边界时没有任何标记,一棵被切的树和空目录长得一模一样。
- **返回后**(`appendDirectoryTreeTruncationNotice`):树顶到边界时在结果末尾**追加**一句截断提示,原内容不动。
  起因是一次真实会话:模型把截断后的空包目录读成"工具看不到",整条查询链退回 `shell` 里的 `find` / `grep`,从那
  以后丢掉 `.gitignore` 规则。

前者不依赖模型知道这个语义,后者不依赖模型读提示词 —— 两边都是"即使模型不配合也不会被骗"。

## Run Configuration 全套 (配套插件 `idea-mcp-enhance`)

IDE 内置的 MCP Server 只能 **启动已有**的 run configuration (`execute_run_configuration`), **不能新建、不能停止、不能重启、
也查不到运行状态**。配套的 IDEA 插件 [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)(IDEA 2026.2+,必须安装)
补齐这一族 —— 「定义态 (查 / 建 / 改 / 删)」加「运行态 (看 / 停 / 重启)」:

| 工具 (OpenCode 里叫 `ide_*`)      | 作用                                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ide_inspect_run_configuration`   | 看**一个**配置的全貌:定义(options / envs / before-launch)、**命名解析**(platform / base / env)、活实例、历史运行及各自的日志文件路径                                                                             |
| `ide_create_run_configuration`    | 新建**任意类型**的项目级配置:内容来源三选一 —— `cloneFrom`(复制现成的,最稳)/ `configurationXml` / 平台模板 + `options` / `attributes` / `envs` 补丁。**项目资产 —— 只给会重复发生的流程建,且必须先征得用户同意** |
| `ide_update_run_configuration`    | 改字段或改名:字段走补丁(`null` = 删),`newName` 改名并**连带更新别人对它的引用**、迁移历史日志的键                                                                                                                |
| `ide_delete_run_configuration`    | 删配置:在跑或被人引用时拒绝,`force = true` 才连引用一起清掉                                                                                                                                                      |
| `ide_list_running_configurations` | **当前真正在跑**的配置:几个实例 / 各自 pid / 退出码。`>1` 个实例就是端口漂移的信号                                                                                                                               |
| `ide_stop_run_configuration`      | 停掉该配置的**全部**实例并等它们退出;没在跑也返回成功(幂等)                                                                                                                                                      |
| `ide_rerun_run_configuration`     | 等同 IDE 的 **Rerun** 按钮:在跑就重启、没在跑就启动,读 `started` 判断是否真起来了                                                                                                                                |

**需要项目环境的命令也走原生 shell** —— 项目配置的 JDK / Node / Go / Maven / Python 由配套插件的 `get_project_env`
取出来,再由本插件的 `shell.hook("create.before")` **注入到每个新 shell 的 `PATH` 与环境变量里**,所以 `java` / `node` /
`go` / `mvn` / `python` 在原生 shell 里就是项目配置的版本。**会反复发生的流程 / 常驻服务**仍然固化成 run configuration;
看文件、git、临时脚本也走原生 shell。配置必须 **先在 IDEA 里存在**(由用户建),没有就请用户建一个再跑;要不要建、建什么,
按 `idea-run-config-manager` skill 的判据走。

> **为什么内置 IDE 终端仍然隐藏**:`ide_execute_terminal_command` 之前被当成"自动继承 IDE 项目环境"的通道而保留暴露,但实测
> **它拿不到项目配好的 JDK / Node / Python 版本**,和原生 shell 没有区别。既然没有优势,就把它从模型可见的工具表里
> 隐藏掉 (`HIDDEN_IDE_TOOL_SUFFIXES`)。
>
> **项目环境现在由本插件自己注入**:连接 IDE 时调一次配套插件的 `get_project_env`(不进模型可见的工具表),把返回的
> `PATH` **前置**拼到每条新 shell 的 PATH 上,其余变量(`GOROOT` / `MAVEN_HOME` / `VIRTUAL_ENV` …)直接覆盖。所以原生
> shell 就是"项目 shell",不需要一个单独的 `project_sdk_terminal` 工具;配套插件里那套本地终端能力已经整体移除。
> 拉不到环境变量时连接按**没做完**处理(`env-unready`),不会静默降级成"工具有、环境是空的"。

配置名有自己的文法:**`[os@]base[@env]`** —— os 段 (`win` = Windows,缺省 = macOS / Linux)、base 段 (配置本体)、env 段 (环境名,
缺省 = 默认环境 —— 起一批时逐条解析:有 `@<env>` 用它,没有就用默认)。`win@base` 与 `base@env` 都是同一个 base 的 **变体**,档案里只登记 base。解析 **交给工具**:
`ide_inspect_run_configuration` 的 `naming` 字段把名字拆成 platform / base / env,规则是从两头往中间收 (末段是环境;首段只有
恰好是 `win` 才算平台,不是就并进 base),所以 `a@b@c` 会解析成 base=`a@b`、env=`c`,不会丢段。

opencode-idea 对这一组工具做两件事:

1. **透传**:IDE MCP server 以 `codemode: false` 注册,工具目录整体转发,所以这七个工具自动以 `ide_*` 出现在模型的
   工具表里 —— 插件侧不需要单独声明,也不需要判断它们在不在;
2. **无条件引导**:这七个工具**默认都在**(配套插件是硬前提),「运行配置」节直接逐个点名。其中一条值得单独说:
   **启动 / 重启常驻进程就用 `ide_rerun_run_configuration`,不要用 `pkill` / `kill` / shell** —— 这正是它要解决的问题:
   外部杀掉的进程 IDE 并不知道,Run 窗口仍显示运行中,下次启动就会撞端口。

> **前提**:配套插件 `idea-mcp-enhance` 必须装在每个接入的 IDE 上。没装时引导仍会点名这些工具、调用会失败 —— 这是
> 刻意选择的硬前提,不做兼容判断。

## Run Configuration:文件由工具写,档案由 skill 写

内置 MCP 只能**查**(`get_run_configurations`)和**执行**(`execute_run_configuration`);增 / 删 / 改 / 改名 / 查详情
靠配套插件的那一族(见上面的「Run Configuration 全套」)。

**运行配置只有工具写** —— `ide_create_run_configuration` / `ide_update_run_configuration` / `ide_delete_run_configuration`
是唯一写入口。理由不是"不许写",而是 **手写失败时是静默的**:`type` 写错 IDE 整个忽略那个文件,字段名拼错则静默用默认值。

> **曾经有一个 `idea-run-config` skill 教模型凭记忆手写配置文件,已经删掉。** 理由不是"不许写",而是
> **不许凭空写** —— `type` 写错 IDE 会**静默忽略整个文件、日志里也不报**。现在这件事由 `idea-run-config-manager` 接手。

`idea-run-config-manager` skill 做三件事:

1. **建 / 改 / 删** —— 直接动手,**走工具不手写文件**。建之前先问用户要不要建:run configuration 是**项目资产**,
   一个项目通常只建几个。判据是 **这件事以后会不会以同样形态再发生**:会就该建、模型**主动**向用户提议
   (摊开配置名 / 实际命令 / 工作目录 / 理由),同意才动手;不会就裸 `shell` 跑完算。
   字段名不确定时走 `cloneFrom` —— 复制一个同类型的现成配置再 patch 它,这是唯一可靠的路子。
   建完看工具的返回值:`canRun` 是"现在能不能跑"的权威答案,`unknownOptions` 非空就是字段名拼错了。
2. **建档** —— 过滤后剩下的每条配置在项目根 `AGENTS.md` 的标记块里占一个条目,五项固定
   (`when` / `before run` / `run` / `after run` / `desc`);只登记 base(`win@base` / `base@env` 是同一个 base 的变体,
   写进 `desc`)。`when` 回答"谁能起它":`用户授权触发` / `AI 自己触发` **进条目**,`用户手动触发` 只在块末尾登记名字、不进条目。
   每一项各选一种写法(行内 / 子列表),同一配置里混用是常态 —— 判据只有"这一项自己有几句话"。
3. **过滤** —— 服务化(常驻应用)的配置归 `idea-standalone` 的块,**两个块永不重叠**。

这个档案块的用途是**能被下次读到**:要办同类事情时先查它,有现成的就用,不再重复建 —— 所以 **联动是硬要求**:
配置被**新建 / 删除 / 修改**(无论谁做的:工具建的、用户自己建的、用户删掉的)都要在文档里同步
**加条目 / 删条目 / 改条目**,否则它就开始骗人。**档案和项目里的配置对不上,比没有档案更糟。**

每项怎么写、两种写法各长什么样、两个示例,都在模板的生成提示里,这里不再抄一遍。
**两个块都是条目式**(一条一个条目,每项一行):`desc` 常是一段话,塞进表格格子里既难读、又要靠补空格维持对齐。
两边靠**同名同序的四项**(`before run` / `run` / `after run` / `desc`)加各自独有的项 —— 在 `AGENTS.md` 里一眼就能看出
哪几条是服务、哪几条是固定流程。

**SKILL.md 只有一份五步流程**(读 → 枚举 → 建 / 删 / 改 → 同步 → 核对),外加**支持矩阵**与**硬性契约**
(落地位置、固定信封、复查、路径宏、不要写模板外的字段)—— 它自己就带着规矩;两类内容另放在两个地方,各管一段:

| 模板 | 装什么 |
| --- | --- |
| `skills/idea-run-config-manager/assets/types/<类型>.md` | **一个类型一份**:那个类型的实测样本 + 字段表 + 坑(索引就是 SKILL.md 里的**支持矩阵**) |
| `skills/idea-run-config-manager/assets/AGENTS.template.md` | 产物(档案)的骨架:条目怎么写、五项分别写什么、枚举与过滤的要求,都在它的生成提示里 |

**支持矩阵 (7 份已落、2 份待实物)**:

| 类型 | `type` id | 验证 |
| --- | --- | --- |
| Shell Script | `ShConfigurationType` | ✅ 本机 6 例(含 Windows) |
| Maven / Gradle / npm / Python / Go Build | `MavenRunConfiguration` / `GradleRunConfiguration` / `js.build_tools.npm` / `PythonConfigurationType` / `GoApplicationRunConfiguration` | ✅ 实物 |
| Node.js | `NodeJSConfigurationType` | ⚠️ 三个属性已验证,其余字段未验证 |
| Application / JAR | `Application` / `JarApplication` | ⏳ type 已验证,**字段层无实物 → 暂不写模板,交给用户** |

矩阵之外(JUnit / TestNG / Kotlin / Docker / Spring Boot / Tomcat / Flyway / Liquibase / HTTP Request …)一律
**没有模板** → 交给用户在 IDE 里配。

**给某个类型补模板的流程**:在 IDE 里建一个最简配置 → 勾 Store as project file → 用 `ide_inspect_run_configuration`
读它的 `configurationXml` 照抄结构 → 标清哪些字段实测 → 把矩阵里那个类型从 ⏳ 改成 ✅。
**每个字段名都来自真实文件,不靠猜** —— `js.build_tools.npm`(属性 + 自定义元素)、`ShConfigurationType`(`<option>` 子元素)、
`NodeJSConfigurationType`(全属性)三种写法并存,套错就是静默失效。

**这个档案块以带前缀的工具为准**,工具前缀固定 `ide_`;
枚举与执行都用 `ide_get_run_configurations` / `ide_execute_run_configuration` …。

**别的文档都指向这里**:引导文本碰到"要建 / 删 / 改一个配置",不再让模型现编流程,而是让它加载本 skill。
**两个 skill 都是模型可自取的**(frontmatter 不带 `metadata: opencode/autoinvoke: false`):模型判断到场景就加载。
「该不该建」的判断留在引导文本里(它每次请求都在),skill 负责动手时的流程与写法。

### skill 怎么加载

文档放在 `skills/<id>/SKILL.md`(每个 skill 一个目录,`name` / `description` 走 YAML frontmatter),由 `src/skill/loader.js`
扫描加载 —— **加新 skill 只需加一个目录,不用改代码**。

**skill 在插件加载时一次性注册,不跟随工具目录** —— 判据只有"插件加载了",不看项目有没有 `/open-in-ide`、
也不看 IDE 此刻 serve 了哪些工具。早先的做法是按工具门禁(frontmatter 的 `requires:` + `ctx.tool.list()`),
**门本身是对的,但注册时机错了**:它发生在 `/open-in-ide` 完成之后,而客户端在这之前就已经把 skill 列表快照给当前会话了 ——
结果是"服务端注册了、`@` 补全里看不到",**必须刷新页面才出现**。注册提前到 `setup`,就落在快照之前。

工具缺失的代价放回正文 —— skill 里本来就写了"工具列表里没有 `<前缀>_rerun_run_configuration` 时交回用户"这类话;
一个缺席的工具是模型能读到并处理的事实,一个看不见的 skill 不是。**`requires:` 这个键已彻底删除** —— 它曾是本插件自己的
门禁元数据,OpenCode 不认,门禁取消后它就成了"看起来在设门、实际没人读"的死字段。

## Standalone 模式纪律 (skill)

本机直跑应用的 **项目级纪律**由 `idea-standalone` skill 固化:写进 **项目根 `AGENTS.md`** 里由
`<!-- idea-standalone:begin -->` 与 `<!-- idea-standalone:end -->` 包裹的 **标记块**(根 `AGENTS.md` 本来就是 AI 在本项目
工作时必读的文件,所以不需要另建规则文件、也不需要 always-apply 开关;标记块是"以后改没改过"的判据)。骨架与逐段写作规范在
`skills/idea-standalone/assets/AGENTS.template.md`, **SKILL.md 只写流程、指向模板**,不重复骨架。

产物两段,只写"这个项目怎么起"这一件事:

1. **什么是 standalone 模式** —— 启动收口只有 IDEA run configuration。唯一绝对的约束是"入口唯一";形态不限 (本机进程 / 容器 /
   部署到远端,哪些应用不在本机跑要单独写明);跑应用一律 `ide_rerun_run_configuration`(在跑就重启、没在跑就启动),
   **不用** `execute`、不绕开 IDE 用裸命令或 `kill`/`pkill`,重启前也不必先问 —— 这条链是无人化的。
2. **启动哪些服务** —— 一条服务化配置一条 (base 名), **应用只是它的一个属性**:同一个应用有多条配置 (前端 dev server +
   后端服务) 就写多条。每条写:应用、端口、`热重载` (有 HMR 就不用提示重启,没有就必须点名重启)、before / after run、
   `desc`,外加"哪条必须先起来"这类依赖关系。

事实一律先查后写:配置名来自 `ide_get_run_configurations`,`热重载` 来自运行方式,端口读不到就问用户 —— 不猜。
**只动自己的标记块**:根 `AGENTS.md` 是共享文件 (`project-scaffold` 的宪法、项目自己的内容都在里面),标记之外一字不改。

## 文件同步 (自带,不再依赖 IDE 的 deployment 工具)

上传 / 下载由本插件的 `remote_upload` / `remote_download` 直接走 SFTP,不再经过 IDE 的
`upload_to_deployment` / `download_from_deployment`:

| 工具 | 作用 |
| --- | --- |
| `remote_upload` | 把一条 deployment 的本地目录传到远程目录。`mode` 默认 `overwrite`(只覆盖 / 新增),`mirror` 额外删掉远程多余的文件 |
| `remote_download` | 反向拉回本地,语义相同(默认 `overwrite`,`mirror` 删本地多余) |

路径映射(本地目录 ↔ 远程目录)只来自 `hosts.json`:

1. **项目级** `<项目>/.opencode/remote-shell/hosts.json` 里 host 条目下的 `deployments`
2. **全局** `~/.config/remote-shell/hosts.json` 同上

IDE 只提供 SSH 配置与凭据;deployment 由 `hosts.json` 维护,再由 `/sync-remote-config` 推到 IDE 的
Deployment 面板。两边不再是"IDE 为数据源",而是同一份配置的两个视图。

`remote_list_servers` 会把每条 mapping 一起列出来(`本地目录 ↔ 远程目录`)。

**`mirror` 会删文件**:上传时删远程多余,下载时删本地多余,而且没有确认步骤。默认 `overwrite` 只覆盖 / 新增。

**同步只是上半段**:每条 deployment 都属于某台服务器,传完之后在它上面启动刚传上去的二进制、重启服务、看日志,
走 `remote_exec`。这两步都不要用 `scp` / `rsync` / `ssh` 手工顶替 —— 手工那条路既没有 IDE 的路径映射,
也常常根本没有权限。

> 配套插件里那四个 deployment 工具(`list_server_deployments` / `upload_to_deployment` /
> `download_from_deployment` / `get_deployment_task_status`)**已经删除** —— 传输完全由这里的
> `remote_upload` / `remote_download` 负责。

## 远程执行 (自带,不再依赖 IDE 的远程终端)

远程命令由本插件的 `remote_exec` 直接跑(SSH),不再经过 IDE 的 `execute_in_remote_host`:

| 工具 | 作用 |
| --- | --- |
| `remote_exec` | 在远程服务器上跑一条命令。参数 `server` / `command` / `workingDirectory?`,返回 `[服务器名] exitCode N` 加输出 |
| `remote_list_servers` | 列出全部可用服务器,带 `[IDE]` / `[项目]` / `[全局]` 来源标记。名字不确定时先调它 |

认证方式三种都支持:`PASSWORD`(密码)、`KEY_PAIR`(私钥 + 可选口令)、`OPEN_SSH`(ssh-agent /
`~/.ssh/config`,靠 `SSH_AUTH_SOCK`)。

服务器与凭据有三级来源,同名以高优先级为准:

1. **IDE** —— 配套插件的 `get_ssh_servers`(只返回 SSH 配置;凭据由 IDE 进程从 PasswordSafe 直接读出,
   不经过任何配置文件,也不碰 Keychain)
2. **项目级** `<项目>/.opencode/remote-shell/hosts.json`(与全局同名同格式,跟着仓库走)
3. **全局** `~/.config/remote-shell/hosts.json`

IDE 没开时自动退到 2 / 3,所以 `remote_exec` 在 IDE 之外也能用。列表缓存 60 秒;**名字找不到时会全量刷新一次**
再匹配,仍找不到就把全部服务器列给模型 —— 不做模糊猜测(用户说 "dev1"、配置的可能是 "deploy1",猜错比列出来更糟)。
命中但连接失败时,会刷新一次凭据再重试(应对"刚在 IDE 里改了密码"),仍失败才报错。

**每条命令一条独立 SSH 连接**:`cd` / `export` 不跨命令保留,要目录就传 `workingDirectory`(内部拼
`cd '<dir>' && <command>`);命令同步返回,没有 tab、没有增量读、没有 Ctrl-C 通道,长任务自己在远程用 `nohup` /
`tmux`。

上传 / 下载见上一节:同样是本插件的 `remote_upload` / `remote_download`,映射来自同一套三级配置。

## 远端进程 (直接用 IDE 的 run configuration)

远端进程**不在 opencode 侧重写**：启停、查重、deployment 同步、日志全部由 IDE 的 `Remote Process` 配置实现，
opencode 直接调 IDE MCP 的 run configuration 工具（工具名带 `ide_` 前缀）。

| 动作 | IDE 工具 |
| --- | --- |
| 启动 / 重启 | `rerun_run_configuration`(没在跑就启动,在跑就先停再启) |
| 停止 | `stop_run_configuration` |
| 查看 Run 会话 | `list_running_configurations`(`type=RemoteProcess` 的条目；Deploy 打开的标签页也在) |
| 查看远端存活状态 | `list_remote_processes`(无状态,遍历所有 Remote Process 配置并查远端) |
| 部署(发布语义,打开 Run 标签页) | `deploy_remote_process` |

`deploy_remote_process` 和配置页里的 **Deploy 按钮完全一致**：同步 deployment → 启动进程 / 容器 →
打开一个 **Run 标签页**，用户能在里面看日志。区别只在语义：

- 它被标记为 deploy-only：点 Run 标签页的 **Stop 只关闭日志跟随，不 kill 远端进程 / 不删除容器**
- 返回 **`fullOutputPath`**（本机聚合日志：`[启动]` / `[同步]` 进度 + 远端 stdout/stderr，和
  `rerun_run_configuration` 的字段、格式一致）
- 应用自己的业务日志（`app.log` / `admin.log` 等）在配置的 **Application log directory** 里，
  用 `remote_exec` 查看

因为它确实是一个 Run 会话，开着 Run 标签页时 `list_running_configurations` 也会看到它。

MCP 触发时如果远端已经在跑，**直接替换、不弹窗**（避免把整个 agent 调用卡在模态框上）；
配置页里手动点 Deploy 仍然会弹窗确认。

`list_remote_processes` 是无状态的：每次调用都遍历项目里所有 `Remote Process` 配置，按 `kind` 查远端，
没在跑的也列出来（`status: stopped`）。它不区分 Run 和 Deploy —— 同一个远端身份只会有一条。

所以远端进程**先要在 IDE 里配成 `Remote Process`**,`hosts.json` 里不再保存进程表：进程的事实以 IDE / 远端为准。

### IDE 里的 `Remote Process`

配套插件注册了一个 `Remote Process` run configuration:

- **SSH configuration**:下拉,选项来自 IDE 的 SSH 配置(不手填 host)
- **Deployment**:下拉,选项来自 `hosts.json`;`process` 必填(启动前要同步),`docker` 可不选
- **Command**:启动命令(必填;`docker` 类型写完整的 `docker run`)
- **Working directory**:留空时用 deployment 的 `deployPath`
- **Application log directory**:应用自己写日志的目录（如 log4j 的 `logs/`），**仅用于查询，不影响启动**。
  `process` 填远端宿主机路径（相对 Working directory 或绝对路径）；`docker` 填容器内路径。
  进程的 stdout/stderr 由插件固定写到 `<working>/.opencode/output-<name>.log`，不受这个字段影响

- **Kind**:`process` / `docker`,留空则从 Command 推断(`docker run` → docker)
- **Container**:`docker` 类型**必填**;启动时自动把 `docker run` 的 `--name` 对齐成这个名字,
  状态查询就是看 `docker ps -f name=^<container>$`;docker 日志统一走 `docker logs`

| 动作 | 行为 |
| --- | --- |
| Run | 已在运行时先弹窗确认 → 同步 deployment → 启动(process / docker) → Run 窗口显示日志 |
| Stop | Run 语义:进程 TERM → KILL;容器 stop + rm |
| Deploy 按钮 | 发布语义:产生 Run 会话,但 Stop 只关闭日志,**不 kill 远端进程 / 不删除容器**;IDE 关闭也不影响 |
| Deploy 查重 | 进程 / 容器已在运行时先弹窗,确认后才重建 |

远端状态每 10 秒刷新一次,配置页上的状态标签会显示 `running` / `stopped`。

**项目环境怎么进原生 shell**:连接 IDE 时(以及 `/open-in-ide` 每一次完整连接)调 `get_project_env`,拿到
`{ PATH, variables }` 后缓存;每条 shell 创建前由 `shell.hook("create.before")` 把 `PATH` **前置**拼上、其余变量直接覆盖。
`PATH` 里只有五个 provider(Java / Node / Go / Maven / Python)的 bin,IDE 进程自己的 PATH 不掺进来 —— 所以 OpenCode 的
PATH 不会丢。**env 拉不到 = 连接没做完**:`/open-in-ide` 报 `env-unready`,不会静默降级成"工具有、环境是空的"。

`get_project_env`、`get_ssh_servers` 与 `sync_deployments` 都是**隐藏**的(数据通道,不是模型任务),IDE 侧那套远程终端
(`execute_in_remote_host` / `terminal_read` / `terminal_interrupt` / `list_terminals`)也一并隐藏 —— 本插件不再需要它们。

## 前置条件

- **必须安装配套插件 [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)(IDEA 2026.2+)**。引导默认它的工具都在
  (运行配置启停 / 部署 / 环境变量),**不做"装没装 / 有没有这个工具"的判断**;部署那组还要求 Ultimate。
- JetBrains IDE 已开启 MCP 服务 (IDE 设置里的 MCP Server / AI Assistant MCP),版本需 **2026.2+**(提供 Streamable HTTP 端点
  `/stream`);若关闭,`/open-in-ide` 会立即提示如何重新开启。
- IDE 侧需开启 **Brave Mode**(否则需要确认的 MCP 工具调用会停下来等用户确认);MCP 未就绪时通知会同时提醒开启它。
- 插件注册给 OpenCode 的 MCP 配置 (**只支持 Streamable HTTP**):

```jsonc
{
  "type": "remote",
  "url": "http://127.0.0.1:64342/stream",
  "headers": { "IJ_MCP_SERVER_PROJECT_PATH": "<项目路径>" },
  "codemode": false,
}
```

项目通过 `IJ_MCP_SERVER_PROJECT_PATH` 头选择,所以一个 IDE 能服务多个项目,而 **不需要为每个项目起一个子进程**。

> **为什么不用 IDE 的 stdio 桥**(`idea stdioMcpServer`,子进程管道):它的故障是"沉默"的——IDE 连接断掉后子进程只挂起、
> 不回任何错误,只能靠后台心跳兜;而 Location 空闲 60 分钟被驱逐时,桥进程与注册一起消失—— **两种传输都躲不过**。
> HTTP 至少把"端点没了"变成一次普通的调用错误,插件能分类并自愈。OpenCode 2.0.19+ 也已无 SSE 客户端传输,当初选 stdio
> 的理由不再成立。
>
> **为什么不用 `/sse`**:OpenCode V2 的远程 MCP 客户端 **只支持 Streamable HTTP**,没有旧版 SSE 传输。IDE 的 `/sse` 是旧版
> SSE (POST 返回 405),V2 连不上。插件对 IDE 的 **探测**也走 `/stream`(一次项目作用域的 `get_project_modules` 调用),
> 用来确认"这个 IDE 里打开着这个项目"。

**端口是产品常量,不开放配置**:IntelliJ IDEA 的 MCP 在 **64342**(见 `src/ide-projects.js` 的 `IDE_PORTS`)。
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
export { default } from "/Users/yutao/IdeaProjects/opencode-idea/src/index.js";
```

## 配置

用 CLI 安装只会写入包名。要传 options,把 `plugins` 数组里的字符串改成对象:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-idea",
      "options": {
        "injectGuidance": true, // 是否注入「工具使用规则」引导
        "openInIde": true, // 是否允许自动拉起 IDE;false 只连已运行的端点
        "launchCooldownMs": 120000, // 启动保护冷却
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

| 选项                 | 类型         | 默认     | 说明                                                                                           |                                                                  |
| -------------------- | ------------ | -------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `injectGuidance`     | `boolean`    | `true`   | 是否注入「工具使用规则」引导(IDE 段只在 IDE 可用时出现)                                      |                                                                  |
| `openInIde`          | `boolean`    | `true`   | 是否允许自动拉起 IDE;`false` 时仍会连接**已经运行**的端点                                  |                                                                  |
| `launchCooldownMs`   | `number`     | `120000` | 启动保护冷却:冷却期内不重复 spawn                                                              |                                                                  |
| `launchMaxAttempts`  | `number`     | `5`      | 单次会话内最多 spawn 次数,超出后停止重试                                                       |                                                                  |
| `mcpProbeTimeoutMs`  | `number`     | `1000`   | 单个 MCP 端口的短探测超时                                                                      |                                                                  |
| `executionTimeoutMs` | `number`     | `600000` | 单次 IDE 工具调用的硬上限(毫秒);防止端点卡住后无限等待(OpenCode 默认 12 小时)                  |                                                                  |
| `feedback`           | `"message" \ | false`   | `"message"`                                                                                    | 结果反馈:`message` 会话通知(用户可见,AI 只回"收到");`false` 静默 |

## 行为

- **未配置的项目**:不改环境、不注册、不注入任何 IDE 提示(每请求零开销;setup 时只做一次配置读取)。
- **已配置的项目**:启动读回配置,IDE MCP 由 `/open-in-ide` 注册。
- **`context` 钩子是请求的纯函数**:按「每次模型调用」触发(含工具续跑),只看本次请求自带的工具快照 ——
  请求里带 IDE 工具就剥离隐藏工具并注入引导;没带则只在已配置时给恢复提示。
  该钩子本身**不做任何 I/O**。
- **错误分类只认传输层专有标记**(`MCP server "<名>" is not available` / `MCP server is not connected` /
  `Error POSTing to endpoint`),**不认**工具输出里出现的通用串(例如 SQL 工具报的 `Connection refused`) ——
  MCP 工具错误的 message 就是工具自己的输出,认通用串会把正常业务失败误判成掉线并重建。
  业务错误(`File not found` 等)、非 IDE 工具、未配置的项目都不动作。
- 恢复是**每个 Location(项目)各一份**;没有任何定时器,插件在不使用时完全静止。
  启动保护(`launchCooldownMs` / `launchMaxAttempts`)限制重复拉起 IDE。

## 限制

- 仅支持 **OpenCode V2** 插件 API(`ctx.tool` / `ctx.mcp` / `ctx.shell` / `ctx.command` / `ctx.session` / `ctx.location`)。
- IDE MCP 注册需要 IDE **2026.2+** 的 Streamable HTTP 端点 `/stream`;更早版本只有 `/sse`,OpenCode V2 无法连接。
- skill 定义的字段名 **以 schema 为准**,不要照官方文档:`Skill.Info` 需要 `path`(AbsolutePath),文档里写的 `location`
  不存在 —— 用错会让 `ctx.skill.transform` 抛 `SchemaError`,而**任何 transform 失败都会禁用整个插件**
  (0.0.6 就是这样丢了 `/open-in-ide`)。完整字段是 `id` / `name` / `description?` / `autoinvoke?` / `path` / `content`。
- 一批用不到的 IDE MCP 工具被硬编码隐藏(`src/plugin.js` 的 `HIDDEN_IDE_TOOL_SUFFIXES`,**共 58 个后缀**):
  VCS(`git_status` / `get_repositories`)、Router 派发工具(`execute_tool`)、Debugger(全部 `xdebug_*`)、Dev Kit MCP、
  Inspection KTS MCP、解释器环境 MCP、**IDE 内置终端**(`execute_terminal_command`:实测不继承项目环境)、
  **`get_project_env`**(本插件 shell hook 的数据通道,不是模型任务)、
  **整个 Database 组**(数据源由用户在 IDE 里配置)、**有原生对应的文件搜索**(`search_text` / `search_regex` / `search_file`)、
  以及**建文件**(`create_new_file`)。配套插件自带的那个写文件工具同样隐藏。**`apply_patch` 不在隐藏列表里**。
  存的是**后缀**,清洗时按当前前缀 `ide_` 展开成完整工具名。
  其中有几个后缀(`execute_in_remote_host` / `terminal_read` / `terminal_interrupt` / `list_terminals`)对应的工具
  已经从配套插件里删掉了,留着是为了挡住**没升级**的安装。具体数字随 IDE 与配套插件版本变化,每次工具集调整都要重测;
  判据是 **模型可见的 IDE 工具都带 `ide_` 前缀,并且不在隐藏列表里**。
- **严格同目录**:IDE 会把"落在某个已打开项目目录树内"的路径解析到那个项目,所以父目录打开时,当前项目也可能被解析成功。
  插件因此不只看工具调用是否成功,而是调用 `get_project_env` 比较它返回的 `projectPath`:只有和当前项目路径完全一致才算接入。
  打开父目录不算接入,这是刻意的 —— 避免相对路径和语言支持落到父项目上。
- **项目路径按 IDE 的写法归一化**:IDE 收的是系统无关形式(正斜杠),OpenCode 的 `location` 在 Windows 上是原生反斜杠,
  所以 `src/mcp/idea.js` 的 `ideProjectPath()` 把它转成正斜杠,**注册与探测走同一个函数**,两者必须一致,
  否则会用一种写法注册、又用另一种写法去问,永远匹配不上。macOS 上是原样透传。
- 配置存在插件名下 KV(`plugin:opencode-idea:project/<root 路径>`),内容是 `{ version: 3, path, app }`。
  插件实例按 **Location**(项目/打开目录)创建,配置按 **root 路径**共享。
- 不再有按目录名生成的工具前缀:前缀固定 `ide_`,一个会话只对应一个项目。
- 插件**完全不再检查 `.idea` 目录**:是不是 IDE 项目只由配置决定(`/open-in-ide` 会让 IDE 打开并导入该项目,
  `.idea` 由 IDE 自己生成)。
- **自动拉起 IDE 仅实现 macOS**(`open -a`)。其他平台(包括 Windows)没有对应的启动命令,**请手动打开 IDE 和项目**,
  再执行 `/open-in-ide` —— 端口在监听、项目被认得就会正常接入,其余能力与 macOS 完全一致。
  IDE MCP 没有「打开项目」工具,因此打开动作走 OS/CLI,而非 MCP。
- 插件热重载会断开 IDE 连接,需重跑 `/open-in-ide`。
- IDE 工具以 `<项目前缀>_*` 直接暴露给模型(`codemode: false`),不用 `execute` 包裹;
  插件不修改任何**它不接管**的工具定义或描述,例外只有两条:`rebuild` / `include_external` 两个参数,以及
  15 条描述覆盖(见「工具参数与输出」)。

## License

MIT
