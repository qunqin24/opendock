# opencode-plugin-hub

OpenCode 桌面版的插件管理器：浏览社区精选插件、按 npm 搜索、安装 / 更新 / 移除 / 暂停 / 恢复，并查看插件真实的运行状态——不用手改 `opencode.json`。

包管理交给官方 CLI，插件启停交给官方配置规则；插件中心只负责发现、操作入口、状态展示和说清「刚刚到底改了什么」。

> OpenCode Desktop plugin manager — browse community plugins, search npm, install / update / remove / pause / resume, and see the real runtime state. Package work goes through the official CLI, enable/disable through the official config rules.

GitHub: <https://github.com/meiyx7/opencode-plugin-hub>

入口：标题栏 **插件中心** Pill 或全局快捷键 `⌘⌥P` 打开独立弹窗；设置 → 插件中心 保留完整页面。

搜索到插件之后可以点开详情，直接看它到底做什么：npm 周/月下载量、发布者、许可证、最新发布时间、README、项目主页、源码仓库、依赖和包体积都在同一个弹窗里，不用跳去 npm 页面猜。

## 从 npm 安装

包名：`opencode-plugin-hub`。发布后页面是 <https://www.npmjs.com/package/opencode-plugin-hub>。

在 `~/.config/opencode/opencode.json` 的 `plugins` 里加一行：

```json
{
  "plugins": ["opencode-plugin-hub"]
}
```

然后让 OpenCode 重新加载插件后使用：在命令行执行 `opencode reload`（或完全退出应用再打开）。第一次安装时插件还没被加载，加载由 OpenCode 自己完成——插件中心不接管宿主；加载之后就可以用标题栏 Pill、`⌘⌥P` 或设置页。

## 入口放在哪

OpenCode 的 GUI 插件 SDK 目前没有提供左侧「主页 / 新建会话」同级的导航注册表，所以没法把插件中心直接插进那条列表里。现在用三种方式保证它随时可达：

| 入口 | 位置 | 打开形式 |
|---|---|---|
| 标题栏 Pill | 窗口顶部标题栏 | 独立 `x-large` 弹窗 |
| 快捷键 | 任意界面 | `⌘⌥P`（`mod+alt+p`），可在 设置 → 快捷键 里改 |
| 命令面板 | 命令面板搜「插件中心」 | 同一个独立弹窗 |
| 设置页 | 设置 → 插件中心 | 完整设置页面 |

弹窗顶部是一行精简身份区：插件中心标题 + 一句来源说明 + 配置路径（宽窄都会换行适配），没有多余的大图。统计合并到标签页（「已安装」标签带「可更新」数），打开配置 / 重载配置合并到标签页右侧的工具栏。标签栏做成 sticky，列表滚动时仍然能切换。弹窗默认约 1180×780（受窗口大小限制，最小约 720×480），内容在弹窗内滚动；右下角可以拖动调整大小。底部的「在设置中打开」会关闭弹窗并跳到设置里的插件中心页，想要更宽的空间也可以用这个入口。

详情弹窗按容器宽度自适应：宽屏（≥720px）用左右双栏，README 在左、统计/发布信息/关键词/依赖等元数据在右，两栏各自独立滚动，README 保持约 74ch 的可读列宽；窄屏纵向堆叠、由外层统一滚动。页面与弹窗都跟随宿主的浅色/深色主题变量，状态不只靠颜色，都带文字标签；「已安装」页在确有异常项时显示“需要关注”摘要（加载失败 → 待加载 → 可更新可点筛选）。

如果以后 SDK 增加侧边栏导航注册表，可以把 Pill 换成真正的侧边栏同级项。

## 关于「插件市场」的实际情况

OpenCode **没有可浏览的官方插件市场**。官方提供的是：配置文件里的 `plugins` 数组（npm 包、版本、Git 规格、本地目录）、`plugins/` 目录的自动发现、一组 CLI 子命令（`opencode plugin add/list/check/update/remove`，只写全局配置）和一个手写的 [ecosystem 文档页](https://opencode.ai/docs/ecosystem)。没有注册表接口，也没有应用内商店。

但社区有一个事实标准：**awesome-opencode** 这个 curated 列表，仓库里带了自动导出的 `dist/registry.json`（当前 198 条，其中 97 条是插件/MCP/主题）。这是唯一机器可读的 OpenCode 插件目录，本插件就以它为数据源。

三条信息通道，按可信度排列：

| 来源 | 内容 | 能不能装 |
|---|---|---|
| 精选目录（registry.json） | awesome-opencode 社区维护的 97 条 curated 条目，带描述、分类、GitHub 地址；Hero 里的 awesome-opencode 可点击查看来源 | 75 条可在应用内直接安装，其余 22 条只发布在 GitHub |
| npm 搜索 | 按 `opencode-plugin` 自由文本搜索后本地过滤出的插件包，覆盖目录之外的长尾 | 能，但没有人工筛选，噪音多 |
| 内置快照 | 上面 97 条的构建期副本，断网时兜底 | 同精选目录 |

## 三个标签页

| 标签 | 说明 |
|---|---|
| 精选目录 | awesome-opencode 社区 curated 列表（Hero 里的来源名可点击），本地筛选（不打网络请求），可按类型过滤，标出可安装/仅 GitHub/已安装/可更新 |
| npm 搜索 | 自由文本搜 `opencode-plugin` 再本地过滤，覆盖目录之外的长尾；显示周/月下载量、发布者、许可证，可按相关度、下载量或发布时间排序 |
| 已安装 | 读配置里的 `plugins` 数组，合并运行时状态与官方更新检查：当前版本、真实 ID、是否已暂停、能否更新、为什么被跳过；可查看详情、更新、暂停、恢复、移除 |

每张卡片右侧都有操作区：`详情` 打开完整信息弹窗，`源码` / `主页` / `npm` 用系统浏览器打开，`安装` / `更新` 走官方 CLI，`暂停` / `恢复` / `移除` 改配置。卡片正文也可以点击（有键盘焦点支持）。按钮按行的类型和状态出现：配置规则行没有这些动作，本地目录行不出「更新」，已暂停的行只出「恢复」。

每次操作后提示条分两段写：命令说了什么、配置和运行时现在是什么样（例如「已通过 opencode plugin add 安装 foo，写入 …（配置 11 项 · 运行时已加载 10 个）」）。插件中心不改写「已生效」，什么时候重新加载由 OpenCode 决定（见下面「改动什么时候生效」）。

改配置时刻意走 jsonc 单节点编辑，**保留你原有的注释、缩进和行序**；`{package, options}` 形式的条目只换 `package`（或完全不动），`options` 原样保留。

## 详情弹窗里有什么

详情数据来自 npm registry 的完整 packument 和 downloads API，主进程查一次后缓存 10 分钟：

| 区域 | 内容 |
|---|---|
| 顶部 | 包名、最新版本、已安装版本、可更新/已废弃标记、一句话描述 |
| 统计 | 周下载、月下载、已发布版本数、解包体积与文件数 |
| 元信息 | 许可证、最新发布时间、首次发布时间、维护者、关键词 |
| 链接 | 项目主页、源码仓库（monorepo 会定位到子目录）、npm 页面、问题反馈 |
| README | 用应用自带的 Markdown 渲染器展示，图片、代码块、表格都保留；超长时截断到约 30k 字符 |
| 依赖 | 可折叠的依赖列表 |

README 是判断「这个插件具体干啥」最直接的来源。很多包的 npm 描述只有一句话，但 README 里会写清楚它监听什么、改哪些配置、需要什么权限。

**下载量是 npm 的统计，不是实际使用人数。** 它只能用来横向比较热度，不能当成精确安装量。

## 搜索与详情的数据降级

- **registry 源是探测出来的，不是写死的。** 启动时并行 ping `registry.npmjs.org` 和 `registry.npmmirror.com`（1.5 秒超时），只用应答的那个；某个源中途连不上会被剔除，下次调用重新探测。想强制指定（例如公司内网代理），设 `OPENCODE_PLUGIN_HUB_REGISTRY=https://your.registry` 后重启应用。
- 官方源在部分网络里是**完全黑洞**（TCP 连接超时，undici 只会报一句 `fetch failed`），所以默认会落到镜像上。镜像缺的东西由本地补齐，而不是让页面空掉。
- 镜像的搜索接口**不认 `keywords:` 限定词**（返回 0 条），所以改成自由文本搜索 + 本地过滤：包名含 `opencode`，或关键词里有 `opencode` / `opencode-plugin` / `opencode-plugins` / `opencode-ai` 才算 OpenCode 插件。只匹配描述会把其他 harness 的插件也带进来，因此描述不参与判定。
- 镜像的搜索索引**不返回 `links`，也只有累计下载量**。所以每条结果额外并发查两个接口：`/downloads/range/last-month`（日序列求和得出周/月下载）和 `/latest`（补主页、仓库、许可证、发布者）。10 并发下 50 条结果约 1 秒补齐。
- 详情优先读完整 packument（包含 README）。超过 12MB 的包会退回只读 `/latest` manifest，此时没有 README 和发布时间。
- 下载量查不到时**显示「暂不可用」而不是 0**，不影响详情其余部分。
- 详情查询失败会在弹窗里明确写出原因，不会伪装成空数据：404 是「npm 上找不到这个包」，超时是「没有及时响应（可能不存在，或镜像正在回源）」，连接重置是「未能应答」。
- **不存在的包在镜像上很慢**：镜像回源失败后会重置连接，约 13 秒才返回，这段时间内页面显示加载中。这是镜像的行为，不是插件卡住。

## 五项操作分别归谁管

插件中心是 OpenCode 官方插件能力的图形入口，不自己发明一套包管理：

| 操作 | 谁执行 | 插件中心做的 |
|---|---|---|
| 安装 | `opencode plugin add <pkg>` | 拼参数、执行、把命令输出原样带回来 |
| 换版本 | 先 `plugin add <pkg>@<版本>`（隔离目录）再用 jsonc 单节点编辑切换 | 七项校验通过后才动真实配置，见「版本替换与自升级」 |
| 更新 | `opencode plugin check` / `opencode plugin update <target>` | 决定按钮出不出、说明为什么被跳过 |
| 移除 | `opencode plugin remove <pkg>` | 同上；本地目录条目只改配置 |
| 暂停 | 配置规则（追加 `-<插件ID>`） | 取运行时真实 ID、追加规则、重载、复核 |
| 恢复 | 配置规则（删精确禁用规则，必要时追加裸 ID） | 同上 |

命令一律用 `spawn(bin, [args])` 参数数组执行，不拼 shell 字符串；退出码、stderr、超时都读。安装/更新各给 3 分钟上限，读命令 30 秒，超时就杀掉子进程并如实报超时（可用 `OPENCODE_PLUGIN_HUB_CLI_TIMEOUT_MS` 收紧，只能缩短）。

**命令成功 ≠ 插件已加载。** 每次操作后都重新读配置、重跑 `opencode plugin list`，提示条分开写两件事：命令说了什么、配置和运行时现在是什么样。

## 状态模型

「已安装」这一个词不够用，列表把三件事分开表达：配置里有没有、宿主管家有没有加载、规则有没有禁用。

| 状态 | 依据 |
|---|---|
| 运行中 | 宿主报告已加载（`plugin list` 给出 ID 与版本） |
| 加载失败 | 宿主报告失败，并带上失败原因 |
| 已暂停 | 配置规则明确禁用了它（徽章 tooltip 写出是哪条规则） |
| 待加载 | 配置已写入，宿主还没报告它 |
| 未验证 | 拿不到可信的运行时信息（后台服务不可用、CLI 无法执行） |
| 禁用 / 启用规则 | 这一行本身就是规则，不是插件包 |
| 有更新 | 官方 `plugin check` 说有新版本，且配置没锁定精确版本 |
| 外部维护 | 本地目录插件，官方 npm 更新流程不碰它 |

三条容易搞错的约定：

- 运行时列表里找不到某个插件，**不代表**它被暂停了——它也可能只是还没加载。暂停状态只由配置规则判定。
- `opencode plugin list` 打印的 ID 才是插件真实 ID：`opencode-notify` 加载成 `opencode-notify-callback`，`opencode-plugin-hub` 加载成 `plugin-hub`。卡片上会单独标出 `ID xxx`。
- 本地目录插件没有 npm 版本信息，这是正常的，不算异常。

## 暂停与恢复

暂停不是卸载：配置里的条目、磁盘上的包都不动，只往 `plugins` 数组末尾追加一条 `-<插件ID>`（官方语法：`-` 前缀禁用，规则按顺序处理，后写的赢）。追加在末尾，所以一定能盖住用户已经写在前面的通配规则，同时不改动它们的顺序。

恢复不是重装：删掉这条精确禁用规则；如果还有通配规则（`-*`、`-scope.*`）挡着，才在末尾追加一条裸 ID 规则把它重新启用——通配规则本身永远不动，因为那是用户的，且覆盖别的插件。

两种情况插件中心会**拒绝执行**，而不是猜：

- 运行时没报告过这个插件加载时的 ID，本机也没有历史记录：不写规则，直接说「无法确认插件 ID」。
- 规格冲突：插件已被规则禁用（暂停会拒绝并指出是哪条规则），或配置里根本没有这一项。

写规则前会先算一遍规则链（`last match wins`），所以「已经被 `-*` 禁用」时不会重复追加，恢复时也不会误删正向条目。

## 版本替换与自升级

### 换版本：先准备，再切换

`opencode plugin add` 只**追加**，从不替换（实测 0.5.0 的旧做法因此要“先 remove 再 add”，
一旦 add 失败旧条目就没了，`{package, options}` 形式的条目连参数也会一起丢）。
现在换成两阶段：

```
① 准备   在临时 XDG_CONFIG_HOME 里跑 plugin add pkg@版本 → 包进共享缓存，真实配置不动
② 校验   命令退出码 / 临时配置里有没有这条 / 缓存里的 package.json 读不读得到 /
         版本号对不对 / package.json 声明的入口文件在不在
③ 切换   用 jsonc 单节点编辑，把这一条的 spec 换成新版本（options 与其他字段原样保留）
④ 生效   opencode reload，然后重新读运行时
```

任何一步失败，真实配置都保持原样——**旧版本从头到尾没有被删过**，不存在“先删后补”。
切换前还会在写队列里再确认一次目标条目还在（见「并发保护」）。

### 自升级：不能让插件把管理器自己弄挂

升级插件中心自身单独走一条流程，不复用普通插件那套：

1. 目标版本必须是**明确的版本号**：`install` 要传版本，`update` 从官方 `plugin check` 读；
   读不到就拒绝，不做“装最新”的猜测。
2. 目标版本先按上面的方式准备并校验（包在缓存里、入口文件存在）。
3. 一次性改写配置；写失败则旧配置仍在。
4. `opencode reload` 之后**轮询运行时**（默认 12 秒，`OPENCODE_PLUGIN_HUB_SELF_TIMEOUT_MS` 可改）：
   - 宿主报告新版本已加载 → 成功，并提示「当前窗口仍是旧构建」；
   - 超时 / 宿主没报 → **不报成功**，如实写「配置已切换，运行时未确认」；
   - 宿主报告加载失败 → 尝试回滚：只有确认旧版本包仍在缓存里才切回去，否则保持新配置并说明需要手动处理。

界面上的措辞也按这三段分开：`目标版本已准备` → `配置已切换` → `新版本已加载`。
只要第三段没成立，就不会出现“升级完成”。

## 操作结果分四个阶段

一次操作可能有四种结论，压缩成一个 `ok` 会让界面只能说“成功/失败”：

| 阶段 | 取值 | 含义 |
|---|---|---|
| `command` | succeeded / failed / skipped | 官方 CLI 那条命令本身 |
| `config` | updated / unchanged / failed | 配置有没有变成预期样子 |
| `runtime` | loaded / failed / unknown / unchanged / skipped | 宿主是否确认加载 |
| `rollback` | none / succeeded / failed | 失败后有没有回到旧状态 |

界面按阶段决定语气：**配置改了但运行时没确认 → 警告，不是成功**；
命令失败但配置没动 → 错误；`rollback` 成功会单独说一句“已回滚到原版本”。

具体映射（`src/gui/feedback.ts`，界面只看这一张表）：

| 配置 | 运行时 | 提示语气 | 界面追加的话 |
|---|---|---|---|
| failed | 任意 | 错误 | 配置写入未完成 |
| unchanged（操作失败） | 任意 | 错误 | 配置未改动 |
| unchanged（本来就无需改动） | 任意 | 按操作类型（成功/中性） | 配置未改动 |
| updated | loaded | 成功 | 配置已切换，运行时已确认 |
| updated | failed | **错误** | 配置已切换，但插件加载失败 |
| updated | unknown | 警告 | 配置已切换，运行时未确认 |
| updated | unchanged | 警告 | 配置已切换，但运行时仍是旧状态 |
| updated | skipped | 警告 | 配置已切换，运行时尚未验证 |

`rollback` 一旦出现就是最终结论：回滚成功 → 语气封顶为警告（状态安全，但目标没达成）；
回滚失败 → 错误，并明确说“配置与运行时可能不一致，需要手动处理”。
自升级即使显示“已加载”，也仍然是警告——当前窗口跑的仍是旧构建。


## 并发保护

- 配置写入走一条进程内串行队列，每次写入前在队列里**重新读文件**，
  编辑计划由「当前文件」算出来，不依赖调用方之前读到的下标。
- 如果这一条在操作期间被外部改动（用户编辑器、其他窗口、同步工具），
  计划函数找不到它就拒绝写入，并说明“被改动了”，不会去改错条目。
- 同一个插件的生命周期操作互斥：连点两下「暂停」只会写一条规则，第二个请求直接被拒。
- 写入用同目录临时文件 + `rename` 原子替换；写失败时原文件不动。
- **解析失败一律不写**：配置有语法错误时既不报告“没有插件”，也不尝试修复或覆盖，
  而是把错误原文显示出来并拒绝所有修改。

### 落盘前会再确认一次

临时文件写好之后、`rename` 覆盖原文件之前，会把磁盘上的文件重新读一遍，
和「算计划时看到的那一份」逐字节比对，并核对 inode 与文件权限：

| 期间发生了什么 | 结果 |
|---|---|
| 内容被外部改了一个字节 | 放弃写入，外部内容保留 |
| 只改了无关字段（比如 `theme`） | 放弃写入，**不做猜测性合并** |
| 整个文件被另一个文件替换（内容可能相同） | 放弃写入（inode 变了） |
| 文件被删除 | 放弃写入，不会凭空重建 |
| 文件变得不可读 | 放弃写入，提示读不到 |
| 内容与 inode 都没变，只有**权限**变了 | 放弃写入（`rename` 会把临时文件的权限盖上去），外部权限保持原样 |

放弃时临时文件立即删除，错误信息会明说「配置在操作期间被外部修改……请刷新后重新操作」，
不会自动重试旧计划（旧计划针对的是已经不存在的文件）。

**这个保护的边界要说清楚**：它把窗口从「整个操作期间」缩到「比对之后到 rename 之间的
几次系统调用」，但**不是真正的原子比较交换**。Node 没有暴露 `renameat2(RENAME_EXCHANGE)`，
引入原生扩展或外部锁服务来做这件事，代价比这个窗口更大，所以没做。也就是说：毫秒级的
同时写入仍有极小概率后写者覆盖先写者——这一点如实记录，不宣称已彻底消除。

另外两条已知边界，同样是记录而不是掩盖：

- **inode 号会被文件系统复用。** Linux 上删除后立刻重建，新文件常常拿到刚释放的 inode 号，
  内容又恰好相同时，这条「换了个文件」的判断就失效了。所以它只能当作尽力而为的身份核对，
  达不到原生 CAS 的强度。
- **判断是逐项比对，不是版本号。** 内容、inode、权限三者任一变了就拒绝；三样都没变但
  外部确实写过（比如写入一份完全相同的内容），无法区分，也无需区分——那种情况覆盖与否
  结果一致。

### 文件权限

写入用「同目录临时文件 + rename」，所以权限必须自己保住，否则一个 `0600` 的配置会被
umask 重新算成别的权限：

- 写入前读取原文件权限，临时文件按同一权限创建；`writeFile` 的 `mode` 会被 umask 削弱，
  因此后面再显式 `chmod` 一次，并在 `rename` 前 `stat` 复核。
- 原文件不存在时新建为 `0600`（配置里可能有 token、私有 registry 地址，不该全用户可读）。
- 配置是符号链接（dotfiles 管理）时，写的是链接指向的真实文件，链接本身保持不变。
- 目标不是普通文件时直接拒绝，不尝试覆盖。
- 权限也是并发基线的一部分：原文件的权限在操作期间被外部改动（`0600` ↔ `0640` 任一方向），
  本次写入直接拒绝，既不会把外部的放宽写回 `0600`，也不会把外部的收紧放宽。


## 包名是怎么确定的

`registry.json` 本身**不含 npm 包名**——只有 GitHub 地址和一段自由格式的安装说明。所以包名的确定方式是一套回退链：

1. 从 `installation` 文本里抓 `"plugin": ["..."]`
2. `displayName` 本身像包名时直接用
3. 用仓库名
4. 用 `@owner/repo`
5. 上述的小写变体（npm scope 必须小写）

每个候选都去 npm 实查，**优先选发布过 `latest` 的那个**。这一步很关键：`opencode-plugin-otel` 这种裸名在 npm 上存在，但只有 0 个版本（空壳占位），真身是 `@devtheops/opencode-plugin-otel`。不加这层判断就会装到一个装不上的包。

核验结果在构建期固化进 `src/gui/registry-snapshot.json`，运行时零成本。目录更新后用 `npm run refresh` 重建。

## 数据来源的降级链

```
网络（12 小时 TTL） → 本地缓存 ~/.cache/opencode/plugin-hub/registry.json → 内置快照
```

断网时页面不会空，会回退到内置快照，加载时会提示具体错误；Hero 里的 awesome-opencode 仍会链接到实际的 registry 来源。点「更新目录」可强制跳过缓存。

## 改动什么时候生效

插件中心只写全局配置（或调用官方 CLI 写），加载由 OpenCode 自己负责。三种生效方式要分清：

| 方式 | 怎么触发 | 负责的变更 |
|---|---|---|
| 自动重新加载 | OpenCode 自己监听配置 | 受监控的 `plugins` 配置变化 |
| 手动重载 | 工具栏「重载配置」→ `opencode reload`，插件中心等待命令结束并按退出码报告结果 | 想立刻确认配置已被重新读取 |
| 重启服务 | `opencode service restart`，或完全退出应用再打开 | 未被监听的本地依赖（目录插件文件被改动） |

按操作看：

| 操作 | 插件中心做的 | 谁让它生效 |
|---|---|---|
| 安装 npm 插件 | `opencode plugin add <pkg>`（CLI 写配置并拉包） | OpenCode 自动重新加载 |
| 更新 npm 插件 | `opencode plugin update <target>` | OpenCode 自动重新加载 |
| 移除 npm 插件 | `opencode plugin remove <pkg>` | OpenCode 自动重新加载 |
| 移除本地目录条目 | 从配置里删掉该路径条目，磁盘目录保留 | OpenCode 自动重新加载 |
| 暂停 / 恢复 | 追加 `-<ID>` / 删除精确禁用规则（必要时追加裸 ID） | OpenCode 按顺序处理规则，随后重新加载 |
| 本地目录插件更新 | **不做**：外部维护，不覆盖用户的目录 | 需要更新时自己更新目录内容 |
| 插件中心自身升级 | 准备 → 校验 → 原子切换配置 → reload → 轮询运行时 | 宿主确认新版本前不报成功；当前窗口仍是旧构建，提示条会如实说明 |

重载走官方 `opencode reload`，插件中心会等它结束：退出码非 0 时把退出码和最后几行输出原样报出来，不会因为「子进程已经起来了」就说成功。整个过程不重启 Desktop、不动应用实例锁、不结束任何进程；会话保持原样。

更新检查的结果按官方口径分档，每种都有明确说明：

| 官方结果 | 界面 |
|---|---|
| `(current)` | 不显示更新按钮 |
| 有新版本 | 出「更新」按钮；配置锁定精确版本时不出，改为「精确锁定」徽章并说明原因 |
| `(check failed)` | 标「未能检查」并显示 CLI 的原文 |
| 本地目录 | 「本地目录 · 外部维护」+「跳过更新」徽章，说明官方流程不碰它 |
| 精确锁定 `pkg@1.2.3` | 「精确锁定」徽章：`plugin update` 会跳过它 |
| 无法匹配（插件还没加载，拿不到 ID） | 「未能检查」，说明需要先加载一次 |

## 安装（本地开发态）

```bash
npm install
npm run build            # 产出 dist/index.js + dist/gui-experimental.cjs
```

在 `~/.config/opencode/opencode.json` 的 `plugins` 里加目录的绝对路径：

```json
{
  "plugins": [
    "opencode-qoder-bridge",
    "/Users/you/code/opencode-plugin-hub"
  ]
}
```

然后完全退出 OpenCode 再打开。

## 开发

```bash
npm run dev       # vite build --watch
npm run refresh   # 重建内置目录快照（会逐个查 npm，约 1-2 分钟）
```

| 文件 | 职责 |
|---|---|
| `src/index.ts` | 服务端部分，只声明插件 id `plugin-hub` |
| `src/gui.tsx` | GUI 入口：设置页、标题栏 Pill、命令快捷键，统一打开弹窗或设置页 |
| `src/contract.ts` | 窗口与主进程的 IPC 契约（effect Schema），含搜索、详情、安装、更新等 |
| `src/gui/page.tsx` | UI（Solid）：设置页与独立弹窗共用的三个标签页、卡片列表、详情弹窗 |
| `src/gui/styles.ts` | 视觉基础：集中式设计变量与全部样式（颜色取自宿主主题变量，深色/浅色由宿主切换；卡片、徽章、双栏详情、窄容器适配） |
| `src/gui/admin.ts` | 主进程：读写配置、npm 搜索与详情、版本比对、更新（含目录插件）、打开链接/配置、reload |
| `src/gui/registry.ts` | npm 源探测与回退：ping 选源、按源发请求、下载量换算（周/月） |
| `src/gui/catalog.ts` | 主进程：拉取并降级解析社区目录 |
| `src/gui/registry-snapshot.json` | 构建期固化的目录快照，由 `npm run refresh` 生成 |
| `dist/index.js` | 服务端入口（npm 发布包使用） |
| `dist/gui-experimental.cjs` | GUI bundle（Vite 构建产物） |

窗口进程是浏览器沙箱，读不了文件也打不开外链；所有 I/O 走 `main` + IPC。

## 发布到 npm

> 发布只通过 GitHub Actions：`npm version patch` 后推送 `v*` tag，由 `.github/workflows/publish.yml` 构建并发布。本地 `npm publish` 已被 `prepublishOnly` 守卫禁止。下面的手动流程仅作历史/首次发布参考（首次发布 npm 无法用 OIDC）。

包名 `opencode-plugin-hub` 当前在 npm 上可用。注意：这台机器默认 registry 是 `registry.npmmirror.com`（淘宝镜像），**镜像不能发布**；`package.json` 的 `publishConfig.registry` 已经固定到官方 `registry.npmjs.org`，登录也要显式指定：

```bash
npm config get registry                # 当前大概率是 npmmirror
npm view opencode-plugin-hub version --registry=https://registry.npmjs.org/   # 404 = 名字可用
npm login --registry=https://registry.npmjs.org/
npm run typecheck
npm run build
npm pack --dry-run                     # 检查 tarball 内容
npm publish --access public            # publishConfig 会把它发到 registry.npmjs.org
```

说明：

- `prepublishOnly` 会自动跑 `typecheck` + `build`；`dist/index.js` 是服务端入口，`dist/gui-experimental.cjs` 是 GUI bundle。
- `files` 只带 `dist`、`src`、`LICENSE`；`README.md`、`package.json` 由 npm 自动包含。
- `repository` / `homepage` / `bugs` 已指向 <https://github.com/meiyx7/opencode-plugin-hub>；如果你 fork 或转移仓库，记得同步改这三项。
- 如果 `opencode-plugin-hub` 被占用，改用带 scope 的名字，例如 `@your-name/opencode-plugin-hub`，同步改 `package.json` 的 `name` 和安装文档。
- 更新版本：`npm version patch`（或 `minor` / `major`），再 `git push --follow-tags`，由 GitHub Actions 自动发布；本地 `npm publish` 已被 `prepublishOnly` 守卫禁止。
- 有 2FA 的账号发布时会提示输入一次性验证码。
- npm 发布是公开且难以撤回的，建议先 `npm pack`，在本地或测试机器上确认能装再发。
- 发布后用 `npm view opencode-plugin-hub version --registry=https://registry.npmjs.org/` 确认。npmmirror 是异步镜像，刚发布时可能还没同步；如果 OpenCode 通过镜像拉包暂时找不到，等几分钟或临时把 registry 指向官方 npm。

### 后续版本：GitHub Actions + Trusted Publishing

`0.1.0` / `0.1.1` 已发布。后续版本用 **push `v*` tag 自动发布**，仓库里不存 `NPM_TOKEN`。

先在 npm 配置 trusted publisher：

1. 打开 <https://www.npmjs.com/package/opencode-plugin-hub/settings>
2. **Trusted Publishing** → **Add a trusted publisher** → **GitHub Actions**
3. 填：
   - Organization or user: `meiyx7`
   - Repository: `opencode-plugin-hub`
   - Workflow filename: `publish.yml`
   - Environment: 留空
4. 保存

之后发新版本：

```bash
npm version patch
git push --follow-tags
```

`npm version` 会创建 `v0.1.2` 这样的 annotated tag；`git push --follow-tags` 把 main 和 tag 一起推上去，tag push 会自动触发 **Publish to npm**，不需要创建 Release，也不需要手动点。

`.github/workflows/publish.yml` 会：

- 安装依赖后跑 `npm test` 和 typecheck，测试不过就不发布
- 对**两种触发方式执行同一套版本保护**：校验发布版本（tag 名去掉 `v`，或手动运行时填写的 `version` 输入）非空、格式合法、与 `package.json` 一致，且 npm 上尚未发布该版本
- 用 `id-token: write` 和 `npm publish --provenance` 发布
- 不需要 `NPM_TOKEN`

注意：

- `package.json` 的 `version` 必须先 bump，且不能和 npm 上已有版本重复。
- 已发布的 tag 不要强推；要重发就 bump 一个新版本。
- 如果还没配置 Trusted Publishing 就推 tag，publish workflow 会失败。
- 如果 tag 没有跟着 push 上去（极少数 `--follow-tags` 情况），补一个 `git push origin v0.1.2`。
- `.github/workflows/ci.yml` 在 push / PR 时跑 `npm test`、typecheck 和 build；手动 **Publish to npm** 仅作为重试入口保留，运行时必须填写 `version` 输入（须与 `package.json` 一致），版本保护规则与 tag 发布完全相同。

## 已知边界

- 只在 macOS 桌面版 2.2.5 / OpenCode CLI v2.0.27 上验证过。GUI Plugin SDK 仍是 experimental 接口，随时可能变。
- 精选目录来自社区维护的 awesome-opencode，**不是官方背书**，条目质量参差，装之前建议看一眼源码。
- 22 条只有 GitHub 发布，应用内装不了，只能点「源码」去看安装说明。
- 详情里的主页/仓库来自 npm 元数据。有些包（例如 `opencode-notify`）根本不填 `repository`，这时只能看 npm 页面和 README。
- 下载量来自 npm downloads API，统计的是 npm 安装/下载次数，不等于真实用户数。
- README 里可能包含外链图片（badge、截图），离线或被 CSP 拦截时不会显示，但不影响文字内容。
- 精选目录里的版本号是构建时的快照值；「可更新」判定只看官方 `plugin check`，两者可能不一致。
- 不清理 `~/.cache/opencode/npm` 里的旧包，避免打断正在运行的插件。
- 不能移除、也不会暂停插件中心自身。
- 不重启 Desktop、不接管进程：没有 PID / TERM / KILL / supervisor，也没有「重启宿主」按钮。
- 不删除本地插件目录，也不用 npm tarball 覆盖用户的目录。目录插件的更新一律外部维护，界面写明原因。
- 只有 GUI 入口、没有 server/TUI 入口的包会被官方 `plugin add` 拒绝（`Plugin package has no server or TUI entrypoint`）；插件中心原样报出这句话，不绕开它自己装。
- `opencode plugin list` 依赖后台服务，冷启动时可能先返回空表；插件中心会重试一次，仍为空就把状态标成「未验证」，不猜。
- `opencode plugin add` 对已配置的同一包不会替换版本，而是**追加**一条（实测 v2.0.27）。所以换版本不是“反过来再装一次”：插件中心先在临时 `XDG_CONFIG_HOME` 里把目标版本装好、校验通过，再原子改写配置里那一条的 spec，全程不删除旧条目。
- `opencode plugin add` **不校验插件入口**：装一个没有插件入口的包（例如 `left-pad`）也会成功写配置，问题要到加载时才暴露。因此插件中心会自己检查 `package.json` 声明的入口文件是否存在；自升级把它当作硬性条件。
- `opencode plugin list` / `plugin check` / `plugin update` 问的是**运行中的宿主**，不读当前 `XDG_CONFIG_HOME`。所以这几条命令无法在隔离环境里做写操作验收（`docs/real-cli-acceptance.md` 里已标注）。
- 同一个原因带来一个真实边界：如果一台机器上有多个配置目录、多个宿主实例，运行时状态可能落到**另一个实例**的报告上，插件中心无从分辨。自升级在隔离验收里就撞到过这一点（`docs/real-cli-acceptance.md`「H 的结论」）。
- 走官方 CLI 写配置的操作（`plugin add` / `plugin remove` / `plugin update`）结束后，**文件权限由 CLI 决定**：实测它会把 `0640` 重写成 `0600`。插件中心自己写入的路径保持原权限，但不会在 CLI 之后再把权限放宽回去。
- 自升级的成功路径依赖宿主的真实反馈：宿主不重启、也不主动加载时，界面只会说“配置已切换，运行时未确认”，不会说升级完成。宿主什么时候重新加载由 OpenCode 决定。
- 自升级的回滚只在“旧版本包仍在缓存里”时才做：回滚到硬盘上不存在的包会让插件中心彻底不可用，这种情况宁可保持新配置并提示手动处理。
- 配置文件有语法错误时，所有写操作都会被拒绝。这一版不会自动修复或重排损坏的 JSONC——修文件是用户的事，覆盖用户的文件不是。
- 插件变更的生效时机由 OpenCode 决定。宿主没有重新加载时，需要你在 OpenCode 侧重载配置或重启服务。
- 暂停/恢复写的是配置规则，宿主的运行状态只作为复核证据：写完之后如果 `plugin list` 仍报告该插件，界面会说「规则已写入，但宿主尚未重新加载」，而不是宣称已暂停。
- 插件 ID 与包名不一致时，暂停/恢复只能用运行时报告的 ID；本机在 `~/.cache/opencode/plugin-hub/state.json` 里记下见过的 ID，用来支持「暂停后运行时不报 ID」的恢复流程。这个文件是缓存，删掉不影响配置。
