# OpenCode V2 的 DeepSeek 搜索插件

把 DeepSeek Search / Fetch 接进 OpenCode V2：**内置 `websearch` 工具直接走 DeepSeek**，另带干净的 Markdown
抓取、本地用量/费用统计、**账户余额实时显示**、一个**持久化**的后端开关，以及**TUI 与桌面侧边栏**——直接显示状态、数字与余额，一点就切换接管。

切回原生：侧边栏开关、改配置 `mode`，或让模型调 `deepseek_mode`。

与已占用的同名 V1 包的区别：本项目面向 **V2 插件 API**、支持**运行时切换后端**、自带**本地用量与费用估算**。

> 已在 `opencode 2.2.5` + `@opencode/plugin@2.2.5`（Windows）实测。Search/Fetch 的接口事实来自
> <https://api-docs.deepseek.com/zh-cn/guides/search>；余额查询接口来自
> <https://api-docs.deepseek.com/zh-cn/api/get-user-balance>。

English: [README.md](https://github.com/QThinkerJR/opencode-deepseek-search/blob/main/README.md)。界面语言支持
`en` / `ja` / `zh-CN`（默认英文，可用 `options.language` 指定），文档只提供英文与中文两版。

## 前置条件

- `opencode >= 2.2.5`（V2 插件 API）
- Node.js `>= 22.18`（插件直接发布 TypeScript 源码）
- 具备 Search/Fetch 权限的 DeepSeek API Key
- 侧边栏不需要额外依赖：渲染器由 TUI / 桌面应用提供（`@opentui/*`、`solid-js`），两个半边都从同一个包里加载

## 安装

先把 key 写进用户级环境变量（Windows）：

```powershell
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "sk-...", "User")
opencode service restart   # User 变量只进新进程
```

然后在 `opencode.jsonc` 中加入插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@qthinker/opencode-deepseek-search"]
}
```

> **一条配置就够。** 列进 `opencode.json(c)` 后，服务端、TUI 侧边栏、桌面面板会**一起生效**：两个客户端都会加载
> 活跃插件里「自带对应半边」的那个入口。已实测：只写全局 `~/.config/opencode/opencode.jsonc`、`cli.json` 完全不写，
> TUI 卡片与桌面面板都照常出现。`cli.json` 的 `"plugins": [...]` 只用于**纯 TUI 插件**（没有服务端半边的包，例如
> `opencode-go-usage-tui`）。配置请写在**全局** `opencode.jsonc`，这样桌面在每个窗口都能看到。

带选项（推荐，`mode` 等都在这里）：

```jsonc
{
  "plugins": [
    {
      "package": "@qthinker/opencode-deepseek-search",
      "options": {
        "mode": "deepseek",
        // "en" | "ja" | "zh-CN"；不填则按 LC_ALL/LANG 自动，兜底英文
        "language": "zh-CN",
        "count": 5,
        "apiKey": "{env:DEEPSEEK_API_KEY}"
      }
    }
  ]
}
```

本地开发直接指向仓库目录（config 里的条目必须是**目录**，不能是单个文件）：

```jsonc
{
  "plugins": [
    { "package": "D:/repos/opencode-deepseek-search", "options": { "mode": "deepseek" } }
  ]
}
```

`opencode plugin add <包名或目录>` 会替你做同样的修改（写的是**全局**配置）；之后 `opencode plugin list`
里应出现 `deepseek-search`，来源为 `local` 或包名。

重载规则：**服务端半边**保存源码后原位置重跑，不需要 `/reload`、也不用重启服务；另外两个半边是客户端——
改了 `tui.ts` 要**重启 TUI**，改了 `gui-experimental.cjs` 要**重载桌面窗口**（从源码目录跑时先 `npm run build:gui`）。

## 选项

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `mode` | `"deepseek" \| "native"` | `deepseek` | `websearch` 的缺省后端；被 `deepseek_mode` 的持久化开关覆盖 |
| `language` | `"en" \| "ja" \| "zh-CN"` | 自动 | 侧边栏、桌面面板、工具输出与错误的显示语言。自动模式依次读 `LC_ALL`、`LANG`，都没有则英文 |
| `apiKey` | string | `DEEPSEEK_API_KEY` | 通常写 `"{env:DEEPSEEK_API_KEY}"`；环境变量未设置时为 `""` |
| `count` | 1–50 | `5` | 每次返回条数（不影响单价） |
| `localization` | string | 未设置（不发送该字段） | DeepSeek Search 的本地化 IP：设置后优先返回贴近该地区的结果；留空或不配置时请求里完全不出现该字段 |
| `fetchMaxChars` | 500–200000 | `30000` | `deepseek_fetch` 截断上限，截断处有明示 |
| `pricePerThousand` | 0–10000 | `5` | 元/千次（整数），仅用于本地费用估算 |

**界面语言。** 插件提供 `en`、`ja`、`zh-CN` 三种界面语言，英文是默认值与兜底。语言由服务端解析一次
（`options.language` → `LC_ALL`/`LANG` 前缀，`ja*` 为 `ja`、`zh*` 为 `zh-CN` → 英文），同一个值同时决定工具输出与
两侧边栏，三处不会分叉。填了不认识的值只会打一条警告并按自动模式处理，不会让插件加载失败；改动会随边栏下一次
读取状态生效（保存配置会让服务端半边原地重跑），重启则一定生效。模型可见的文本在所有语言下保持英文——工具描述、
`## [title](url)` 结果格式、`Published:`、`[authoritative]` 与空结果提示——以保持内置 `websearch` 的输出形状。文档只有英文与中文两版，
日文界面不附日文文档。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `websearch`（内置） | 名字/入参不变；`deepseek` 模式下由本插件供结果 |
| `deepseek_fetch` | 抓单页 → 干净 Markdown，超长按 `fetchMaxChars` 截断并提示 |
| `deepseek_usage` | 本地搜索/抓取次数与费用估算，`reset: true` 整表清零，`resetPeriod` 按周期清零 |
| `deepseek_mode` | 查询/切换搜索后端，切换结果持久化 |

`websearch` 的改接**保留内置的权限确认与 `output` 结构**，审批提示与渲染都不变；结果只带 `summary`
（600–800 字，本就写给模型读）或退化的 `snippet`，**永不返回网页全文**，也从不请求 `need_content`。

### 搜索语法

被接管工具的描述还会告诉模型 `query` 里可用的操作符；query 原样透传，无需额外工具即可过滤：

| 操作符 | 含义 |
|---|---|
| `site:example.com`、`site:a.com OR site:b.com` | 只在这些站点内搜索；多个用 `OR` 连接 |
| `-site:example.com` | 排除某个站点 |
| `-词`、`-"短语"` | 排除某个词或短语 |
| `"精确短语"` | 要求精确匹配该短语 |
| `lang:zh,en` | 只在这些语言中搜索 |
| `after:2025-01-01`、`before:2026` | 时间范围 |

操作符计入 query 的 128 字符上限。

### 请求与结果细节

- **`ori_question`（尽力而为）。** 每次搜索都会把当前会话最近一次用户输入（去掉首尾空白并截断到 128 字符）发给
  搜索接口，帮助它理解 query 背后的意图；取不到输入时省略该字段。
- **`localization`。** 配置后作为搜索接口的 `localization` 字段发送；留空或不配置时请求里完全不出现该字段。
- **`[authoritative]`。** 搜索结果中 DeepSeek `authority` 为 `3` 或 `4`（官方 0–4 分级，`-1` 表示未知，`3` 及以上为极权威）的
  条目，会在渲染的 Markdown 标题后带该标记。它只是提示——结果仍是第三方文本。

## 切换搜索后端

### 几种方式

| 方式 | 操作 | 持久化 | 适用 |
|---|---|---|---|
| 侧边栏 | 点 TUI 卡片上的动作（中文界面 `[停用]` / `[启用]`，默认英文界面 `[Disable]` / `[Enable]`），或桌面面板的按钮 | 是（插件存储 `mode/v1`） | 正在干活时随手切 |
| 配置 | 改 `options.mode`，保存即生效 | 是（在配置文件里） | 长期默认值 |
| 工具 | 让模型调 `deepseek_mode`，或自己调 | 是（插件存储 `mode/v1`） | 临时/在会话里切，不用改文件 |

`deepseek_mode` 的四个动作：

| 调用 | 效果 |
|---|---|
| `deepseek_mode`（或 `{"mode": "status"}`） | 报告当前后端**与来源**（配置文件 / 持久化开关） |
| `deepseek_mode({"mode": "deepseek"})` | 内置 `websearch` 改走 DeepSeek |
| `deepseek_mode({"mode": "native"})` | 内置 `websearch` 回到原生后端 |
| `deepseek_mode({"mode": "config"})` | 清除持久化开关，回到 `options.mode` 的值 |

### 优先级

```
deepseek_mode 开关（storage: mode/v1）  >  options.mode  >  内置默认
```

- 开关存在 OpenCode 本地插件存储（`mode/v1`，**整机全局、跨重启保留**），**不会修改你的配置文件**；
- 正因为优先级更高，改了配置文件却没反应时，先问一句 `deepseek_mode`（它会告诉你来源），再用
  `mode: "config"` 清掉开关；
- 两种模式都注册 provider：任何一步失败的最坏结果是「维持上一个后端」，不会出现没搜索可用。

### native 模式下还有什么

`websearch` 完全不接管，回到你原本的后端；`deepseek_fetch`、`deepseek_usage`、`deepseek_mode` 仍然可用
（它们是新增工具，不影响原生搜索），provider 也仍注册，可用 `providerID: "deepseek"` 或配置
`"websearch": { "provider": "deepseek" }` 显式选用。

> 为什么是改接工具而不是设 provider 默认值：在 2.2.5 里，插件调用 `websearch.default.set()` 会被更晚注册的
> 内置 config 插件覆盖，工具仍然用内置 provider。所以插件直接接管内置工具：内置的权限确认照旧，只是
> deepseek 模式下不再弹出「选择搜索 provider」表单。若某些版本找不到该工具，`deepseek_mode` 会明确提示
> 「无法在运行时切换」，此时用配置 `websearch.provider` 兜底。

## TUI 与桌面侧边栏

插件也出现在你干活的地方，并且可以不经模型、不改配置文件直接切换：

| 面 | 你会看到 | 怎么切 |
|---|---|---|
| TUI | 会话侧边栏末尾追加一块 DeepSeek：状态行 + 今日 / 本月 / 累计（`Search` · `Fetch` · `¥` 估算）+ 账户余额；侧边栏变窄时先退化到缩写、再逐个减列，不会折行 | 点标题右端的动作（切换，或「重置」清零统计），或用 `/deepseek-search` 斜杠命令打开菜单 |
| 桌面 | 会话侧区域的 **DeepSeek** 页签，出现在侧区域的 *New tab* 列表与 `+` 菜单里，也可用命令打开面板（中文界面 `DeepSeek: 打开统计面板`，默认英文界面 `DeepSeek: Open usage panel`） | 面板上的按钮，另有刷新按钮 |

- 两个面读的是同一份账本和同一个持久化开关（与 `deepseek_usage` / `deepseek_mode` 完全一致）：数据只有服务端
  一份真相，经插件自己的 RPC 取用，TUI 与桌面的数字不会分叉。
- **按周期清零统计**：两个面都能清本地台账的 今日 / 本月 / 累计 —— TUI 用卡片上切换旁的「重置」动作或 `/deepseek-search` 菜单的「统计清零」项（选择即确认），桌面用面板上的「统计清零」按钮（原生破坏性确认框，焦点默认在取消）。背后的
  `resetUsage` RPC 同时支撑 `deepseek_usage` 的 `resetPeriod` 参数。
- **「停用」= 把内置 `websearch` 交还给你配置的后端**（等价于 `deepseek_mode({"mode": "native"})`），不是卸载：
  `deepseek_fetch`、`deepseek_usage`、`deepseek_mode` 仍然注册，状态同样落在 `mode/v1`。
- 动作行只说点击真的会做什么。没有配置 API Key 时没有可做的接管动作，就显示该怎么修（`DEEPSEEK_API_KEY`；
  桌面面板仍保留无需 Key 的「统计清零」）；内置工具没能打上补丁时显示「未接管」，而不是假装已启用。
- 每次记账、每次切换与每次清零后都会发 `changed` 事件触发刷新，两个面另有 10 秒重读作为兜底。
- **正文末行是你的账户余额**（服务端用同一个 Key 调官方查询余额接口 `GET /user/balance`，来源：
  <https://api-docs.deepseek.com/zh-cn/api/get-user-balance>；缓存 60 秒、失败保留上次值）：
  三行用量读作小票，账户真相落在下面。仅在接管启用或原生模式这两态显示——只有这两态卡片真正指向账户。
  余额不足时金额转警示色；侧边栏太窄（约 12 列以下）宁可整行省略也不挤压。桌面面板把它放成用量表下方的
  账户块，悬停可看赠金/充值细分（仅两者都非零时）。手动刷新（桌面刷新按钮、TUI 菜单里的「刷新」、失败重试）
  会强制重探，10 秒轮询不会。
- **显示阶梯以金额为先**：变窄时费用数字比文字标签活得更久；低于数字下限后三行用量并作一行、仍然带数字，
  不会出现三个光秃秃的标签。

桌面半边以预构建的 CommonJS bundle（`gui-experimental.cjs`）发布：npm 安装自带；如果你从源码目录跑，需要构建一次
（TUI 半边零构建，和服务端一样直接加载 TypeScript）：

```bash
npm install && npm run build:gui
```

## 用量与费用

| 计数 | 触发条件 | 计费 |
|---|---|---|
| `search` | HTTP 200 且 `results` 非空 | ¥0.005/次 |
| `fetch` | HTTP 200 且正文非空 | ¥0.005/次 |
| `empty` | HTTP 200 但结果/正文为空 | 不计费 |
| `failed` | 网络错误，或重试一次后仍非 200 | 不计费 |

费用以整数微元累加，不会累积误差；`count` 不影响单价。`deepseek_usage({ "reset": true })` 报完后整表清零；`deepseek_usage({ "resetPeriod": "today" | "month" | "total" })` 只清对应周期，优先于 `reset`。

- 存在 `ctx.storage` 的 `usage/v1` 键下，保留最近 60 天，天键为本地时区。
- 存储是**全局**的（整台机器的 OpenCode），**跨重启保留**。
- **本地统计 ≠ 账号账单**：只统计本机本插件；其他工具、其他机器不计入，多开 server 可能丢计数（后写覆盖）。

## 限速与成本

账号级 Search 100 QPS、Fetch 25 QPS（Fetch 另按目标域名限速）。单次请求 ¥0.005。仅在 408/429/5xx 时退避重试
一次，优先 `Retry-After`（上限 5 秒），可被取消。

## 隐私

query（以及作为 `ori_question` 附带发送的最近用户输入与配置的 `localization`）与抓取 URL 会发往
`https://api.deepseek.com`。其余数据不出本机，用量账本与模式开关留在本地 OpenCode 存储中；API Key 不写日志。

搜索结果与被抓取页面是**第三方文本**：应按数据处理，而不是当作指令——页面里可能夹带试图操纵模型的内容。

## 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| 不确定搜索走哪个后端 | 调 `deepseek_mode`，它会同时报出**后端**与**来源** |
| 改了配置却没生效 | 存在持久化开关（来源会显示「持久化」）；调 `deepseek_mode({"mode": "config"})` 清除 |
| `未配置 DeepSeek API Key` | 设置 `DEEPSEEK_API_KEY`，并重启一次 OpenCode 服务（新进程才会继承） |
| `401` key 无效 | 检查 key 与 `apiKey`/环境变量指向 |
| `402` 余额不足 | 充值；失败请求不计费 |
| `429` 触发限速 | 已退避重试一次，稍后再试 |
| Fetch 报 `403` / `404` | 站点策略拦截或无正文可提取，可改用内置 `webfetch` |
| 搜索仍是原生后端 | `mode` 或持久化开关为 `native`；若两处都已完成仍如此，说明未找到内置 `websearch` 工具，用配置 `"websearch": { "provider": "deepseek" }` |
| TUI 侧边栏里没有 DeepSeek 卡片 | 先看 `opencode plugin list` 是否显示 `deepseek-search` 处于 active——卡片来自**活跃的服务端插件**，所以关键是 `opencode.json(c)`，`cli.json` 不需要它；装完重启一次 TUI |
| 桌面 New tab 列表里没有 DeepSeek | 桌面只读**全局** `opencode.jsonc`；且 bundle 必须存在——从源码目录跑时先 `npm run build:gui`，再重载窗口 |
| 侧边栏显示「读取失败」 | 该半边连不上 RPC：先 `opencode plugin list` 确认 `deepseek-search` 处于 active，再到 `~/.local/share/opencode/log/opencode.log` 里看 `/api/rpc/deepseek-search/status`。若是 `400 rpc.invalid_input`，说明半边与服务端契约不一致——重载那个客户端 |

## 本地开发与自检

```powershell
cd D:\repos\opencode-deepseek-search
npm install
npm run typecheck     # tsc --noEmit，服务端/TUI 与 GUI 两个配置各跑一次
npm test              # node --test，纯函数单测（零成本）
npm run build:gui     # src/gui -> gui-experimental.cjs（桌面半边的 bundle）
node --experimental-strip-types scripts/check-gui-bundle.ts   # bundle 形态检查，CI 里会跑
npm run smoke         # 真实调用冒烟，无 DEEPSEEK_API_KEY 自动 skip
npm pack --dry-run    # 发布前产物审计——先跑 build:gui，`pack` 本身不会构建 bundle
```

目录结构：

```
index.ts              # 目录型插件入口，re-export src/index.ts
tui.ts                # TUI 入口，re-export src/tui/main.ts
src/index.ts          # 插件本体：选项、注册、接管 websearch、三个工具
src/deepseek.ts       # HTTP 核心：超时/取消、单次退避重试、本地化错误、结果映射
src/usage.ts          # 纯账本：微元计价、60 天裁剪、防御性解析、格式化
src/rpc.ts            # 服务端 / TUI / 桌面三端共享的 RPC 契约
src/status-view.ts    # 纯视图模型：两个侧边栏的文案都从这里派生
src/tui/              # TUI 半边：卡片元素树 + 插件接线
src/gui/              # 桌面半边：侧面板组件 + 插件接线
vite.config.ts        # 把 src/gui 构建成根目录的 gui-experimental.cjs
test/*.test.ts        # 纯函数单测
scripts/smoke.ts      # 真实 API 冒烟（6 步）
scripts/check-gui-bundle.ts # bundle 形态检查，CI 里在 build:gui 之后跑
.github/workflows/    # ci（构建 + typecheck + test + bundle 检查）/ release
```

两个形态上的坑（都已规避，改动时别踩回去）：

1. config 里的本地插件条目必须是**目录**，指向单个文件会被丢弃；
2. `package.json` 不要加 `exports`——带 `name`+`exports` 时 OpenCode 会改按包名解析该目录，
   解析结果落在目录外就被**静默丢弃**（日志无报错，`plugin list` 里直接消失）。

两条对插件的每个半边都成立：`index.ts`、`tui.ts`、`gui-experimental.cjs` 都放在仓库根目录，目录解析与
安装包解析两条路径都靠这个位置找到它们。`test/packaging.test.ts` 会在 `exports` 被加回来或某个根入口解析不到时失败。

改完源码保存即热重载；验证手法：`opencode plugin list` + 实际搜一次看结果来源。

## 许可证

MIT。与 DeepSeek 官方无隶属关系。
