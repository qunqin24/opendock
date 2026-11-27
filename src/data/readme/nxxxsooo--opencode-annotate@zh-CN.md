# Open Annotate
[English](https://github.com/nxxxsooo/open-annotate/blob/main/README.md) · 简体中文

审阅 AI 回复、本地文档和网页，并将带编号的反馈发回原 agent 会话。

[![npm](https://img.shields.io/npm/v/@nxxxsooo/open-annotate)](https://www.npmjs.com/package/@nxxxsooo/open-annotate)
[![CI](https://github.com/nxxxsooo/open-annotate/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/open-annotate/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[网站](https://mjshao.fun/open-annotate/) · [安装](#install) · [工作流](#workflows) · [Herdr](#herdr) · [AGY](#antigravity-agy-support) · [浏览器审阅](#browser-review-optional) · [配置](#configuration)

这个非官方 OpenCode 插件内置了来自 `tui/` 的原生 Rust [终端审阅器](tui/README.md)，无需额外安装审阅器。它同时支持 OpenCode 用户、Antigravity CLI (AGY) 用户、Herdr 与 Herdr.app 窗格，以及可选的 Chrome 或 Safari 网页审阅。npm 包名为 `@nxxxsooo/open-annotate`。

| 宿主 | 审阅内容 | 入口 | 从这里开始 |
|---|---|---|---|
| OpenCode（内置 TUI） | AI 回复、Markdown、文本与配置文件 | `/annotate`、`/annotate-file`、`/annotate-pick`、`/annotate-selection` | [OpenCode 安装](#opencode) |
| Antigravity CLI (AGY) | AGY 回复、Markdown、网页 | `/annotate`（hook 或 `annotate` skill）、`agy-annotate` | [AGY 安装](#antigravity-cli-agy) |
| Herdr / Herdr.app | agent 回复、文件、窗格终端输出 | `prefix+a`（`annotate.review`）、`annotate-tui herdr`、Herdr.app peek 或窗格 | [Herdr](#herdr) |
| Chrome（可选） | 网页、本地 HTML（直接发送） | `/annotate <url-or-html>`、`agy-annotate web`、`Alt+Shift+A` | [浏览器安装](#local-browser-enabled-installation) |
| Safari（可选） | 网页、本地 HTML（仅复制到剪贴板） | `/annotate <url-or-html>`（`"browser": "Safari"`）、`Option+Shift+A` | [Safari](#safari-copy-only) |

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/cover-dracula-full-20261116.webp" alt="OpenCode Annotate 0.17.0 在 Ghostty（Dracula 主题）中的真实截图，合成文档上显示两条批注和响应工具栏" width="720">
</p>

0.17.0 在 Ghostty（Dracula 主题）中基于合成文档的真实截图，展示两条批注及响应工具栏。[截图说明](https://github.com/nxxxsooo/open-annotate/blob/main/docs/assets/README.md)。

<a id="install"></a>

## 安装

### OpenCode

需要 OpenCode 2.2.0+。npm 包内置从 [`tui/`](tui/README.md) 构建的 `annotate-tui` 二进制文件，覆盖 macOS arm64/x64、Linux arm64/x64（Ubuntu 22.04 / glibc 2.35+）和 Windows x64，详见[源码与构建](tui/README.md#source-and-build)。OpenCode 终端接管已在 macOS 上验证，Windows 端尚未验证。

```sh
opencode plugin add @nxxxsooo/open-annotate@latest
```

OpenCode 通过全局 `opencode.json` 或 `opencode.jsonc` 中的同一条配置加载服务端选项同步与 TUI 命令。如果命令未刷新，运行 `/reload`。手动配置时请保留其他条目与 `options`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@nxxxsooo/open-annotate@latest"]
}
```

安装或更新时，`@latest` 会选择当前最新的 npm 版本；发布新版本不会自动替换本地已安装的副本。如果只用 OpenCode，可直接跳到[3 步完成首次审阅](#first-review-in-3-steps)；下文的 AGY、Herdr 和浏览器配置都是可选的。

### Antigravity CLI (AGY)

AGY 不需要 OpenCode。先全局安装包（`npm install -g @nxxxsooo/open-annotate`，位于 `npm root -g` 下）或从源码构建（`npm run build:tui`），然后：

1. 将包内的 `agy/skills/annotate` 目录链接到 `~/.agents/skills/annotate`。
2. 把 `agy/hooks.json` 中的 `agy-annotate` 条目（`SessionStart`、`PreInvocation`、`Stop`）合并进 `~/.gemini/config/hooks.json`，并将三条命令里的 `./hooks.mjs` 替换为同一安装目录下 `agy/hooks.mjs` 的绝对路径。
3. 仅使用 Herdr TUI 时需要完成[清单与快捷键配置](tui/README.md#herdr)，配置中的 `annotate-tui` 和 `agy-annotate` 使用同一安装目录下的路径。Herdr.app 无需配置清单。

### Herdr 与 Herdr.app

- **Herdr.app（`herdr-core`）**：直接调用 `hc` 和 `herdr-app`，不需要 Herdr TUI 插件清单。要在 Herdr.app 里用 AGY，先完成 [Antigravity CLI (AGY)](#antigravity-cli-agy) 的第 1、2 步，再看 [Herdr.app](#herdrapp) 和 [Antigravity (AGY) 支持](#antigravity-agy-support)。
- **macOS 上的 Herdr TUI**（已在 Herdr 0.9.5 测试）：在插件目录保存 `herdr-plugin.toml`（路径指向同一份安装），运行 `herdr plugin link /absolute/path/to/plugin-directory`，然后在 Herdr 的 `config.toml` 中将 `prefix+a` 绑定到 `annotate.review`。详见[清单与快捷键配置](tui/README.md#herdr)。

<a id="local-browser-enabled-installation"></a>

### 本地浏览器安装（可选）

浏览器审阅是可选功能，需在插件之外单独安装。要求 macOS、Chrome 116+ 或 Safari 18+，其中 Chrome 原生宿主程序（native host）需要 Node 22+。

1. 在 OpenCode 运行 `/annotate <url-or-html>`，或在 AGY 运行 `agy-annotate web [url-or-html]`。如果 Chrome 还没装好或未启用 Annotate，命令会复制解压版 `browser/` 路径、在 Finder 中定位该目录并打印安装步骤（若已有其他 Chrome 配置文件启用了 Annotate，也会一并列出）。
2. 在用来审阅的 Chrome 配置文件中打开 `chrome://extensions`，开启「开发者模式」（Developer mode），点击「加载已解压的扩展程序」（Load unpacked），按 `⌘⇧G` 粘贴路径并加载（列表里已有 Annotate 时直接打开开关即可）。也可以克隆本仓库后加载其中的 `browser/` 目录。要审阅本地 HTML，进入扩展「详情」（Details）开启「允许访问文件网址」（Allow access to file URLs）。
3. 在 macOS 上，OpenCode 会自动注册 Chrome native host（`fun.mjshao.annotate`，固定扩展 ID，使用 Node 绝对路径，按需启动，不开放 HTTP 端口）及当前活跃会话。如果不用 OpenCode 只用 AGY，或者自动注册报错，请在已安装包或仓库目录里运行 `npm run install:bridge`。
4. 打开要审阅的页面，按 `Alt+Shift+A`（或点击扩展图标）打开侧边栏。

Safari 扩展需用 Xcode 从源码构建（`npm run build:safari`、`npm run install:safari`），且只支持复制批注。详见 [Safari（仅复制）](#safari-copy-only)。

<a id="first-review-in-3-steps"></a>

## 3 步完成首次审阅

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/terminal-review-dracula-20261116.gif" alt="OpenCode Annotate 0.17.0 在 Ghostty（Dracula 主题）中的真实录屏：选取段落、添加快捷响应与文字批注，并显示 Send 2 back (q)" width="720">
</p>

0.17.0 在 Ghostty（Dracula 主题）中基于合成文档的真实录屏：选区、添加响应、再选区、输入批注、保存，并准备执行 `Send 2 back (q)`。[截图说明](https://github.com/nxxxsooo/open-annotate/blob/main/docs/assets/README.md)。

1. **打开审阅器**：在任意会话运行 `/annotate` 审阅最近一条已完成的助手回复，或运行 `/annotate path/to/file.md` 审阅文档。
2. **选区并批注**：拖动鼠标选中文本（或按 `v` 后移动光标），按 `c` 写批注，按 Enter 保存。
3. **发送**：按 `q`（或点击顶部栏的 **Send N back (q)**），将带编号的反馈发回原会话并继续该会话。

- `Ctrl+S` 可一步保存当前批注框并直接发送。`E` 和 `S` 也能发送，按 `[keys]` 键位绑定生效。
- `Ctrl+C` 关闭审阅器：OpenCode 随后会询问是否发送已保存的批注，AGY 直接关闭不发送。
- 打开审阅器不调用模型；空审阅或取消审阅不提交任何内容。
- 在 OpenCode 中，确认发送的文本或浏览器反馈通过 `steer` / `resume: true` 发回捕获的原会话，即使当前轮次仍在运行。

<a id="what-it-reviews"></a>
<a id="workflows"></a>

## 工作流

### 批注 AI 回复

- `/annotate` 打开最近一条已完成的回复，包含在等待 question 工具响应时中断的轮次。实际报错失败、仍在流式输出、被内容过滤拦截的回复，以及推理过程（reasoning）和工具调用说明均不纳入。
- `/annotate-pick` 可从最多 30 条近期回复和轮次中途的进度更新里挑选。
- `/annotate-selection` 打开包含上次转录文本选区的消息；选区跨越多条消息时，只审阅选中的文本。

### 审阅文本与配置文件

```text
/annotate docs/plan.md            # Review a Markdown document
/annotate "docs/release plan.md"  # Path with spaces
/annotate ~/Documents/notes.txt   # Plain text
/annotate-file                    # Pick a file from this session's directory
/annotate-file settings           # Filter the file search
```

`/annotate-file` 会复用 OpenCode 的 `@` 文件搜索检索会话目录及子目录（最多 200 个匹配项，并校验符号链接不超出当前会话根目录），再打开选择列表。你也可以直接把受支持的文件路径传给 `/annotate`。

- **支持格式**：`.md`、`.mdx`、`.markdown`、`.txt`、`.rst`、`.adoc`、`.org`、`.tex`、`.csv`、`.tsv`、`.log`、`.json`、`.jsonc`、`.json5`、`.yaml`、`.yml`、`.toml`、`.ini`、`.cfg`、`.conf`、`.properties`、`.xml`、`.plist`、`.editorconfig`、`.gitignore`、`.gitattributes`、`.dockerignore`、`Dockerfile`、`Makefile`。
- **限制与排除**：非 Markdown 文件保留原格式并在围栏代码块中打开。文件必须是本地 UTF-8、不超过 2 MiB 且不含二进制字节；系统会排除 `.env` 及疑似包含凭证的文件名。
- **路径与快照**：相对路径以会话的工作目录为准解析，也支持 Unix 绝对路径和 `~/` 路径。审阅器读取固定快照，不修改原文件。反馈会附上文件路径和 SHA-256 哈希，以便助手在修改前重新读取文件。在第一条助手回复出现前就可以审阅文件。

### 浏览器网页反馈

```text
/annotate page.html               # Review a local HTML file
/annotate https://example.com     # Review a webpage
```

在任意网页打开 Chrome 侧边栏（`Alt+Shift+A`），选一个自动注册好的 OpenCode 或 AGY 会话；也可以从 OpenCode 首页直接新建空会话，不会启动模型轮次。Safari 只支持本地记录批注和复制。

不带参数的 `/annotate`、`/annotate-file`、`/annotate-pick`、`/annotate-selection`，以及文本或配置文件路径都走 TUI。浏览器工作流只接收显式 URL（`http:`、`https:`、`file:` HTML）以及 `.html`/`.htm` 路径；回复正文里的 HTML 链接或代码块不会改变分流。详见[浏览器审阅](#browser-review-optional)。

## 命令参考

```text
/annotate                         Review the last completed assistant reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate-file [query]            Choose a text or config file in the session directory
/annotate-pick                    Choose a recent reply or mid-turn progress update
/annotate-selection               Review the message containing your last transcript selection
/annotate page.html               Review local HTML in the configured browser
/annotate https://example.com     Review the specified webpage
```

带编号的 `/annotate N`、`/annotate-last` 和 `/annotate-web` 已退役，请改用 `/annotate-pick`、`/annotate` 和 `/annotate <url-or-html>`。浏览器连接控制在扩展的目标菜单里。

## 审阅与发送

- **选区**：拖动鼠标选字，或按 `v` 后移动光标。未选中文本时按 `c` 会对当前块添加批注。
- **批注类型**：按 `c` 写普通批注，按 `w` 加 `what?` 追问（[what? 批注](#what-notes)），按 `a` 标记赞成，按 `d` 请求删除。
- **批注框**：Enter 保存，`Ctrl+S` 保存并发送，Esc 取消编辑。终端支持时可用 Shift+Enter 换行，也可以用 `Alt+Enter` 或 `Ctrl+J` 替代。上边框显示保存和发送提示，下边框显示取消和换行提示。
- **快捷响应与复制**：存在选区时，Enter 记录 **Done**，`g` 记录 **Get**；Esc 取消选区，`y` 复制选中的原文（只选中而不按 `y` 不会覆盖剪贴板）。
- **工具栏**：紧凑工具栏显示赞成、批注、**Done** 和 **Get**；`w`、`d`、`y` 仅通过键盘操作。在支持 Kitty graphics 的终端里如果想用自定义 PNG 工具栏图标，见[本地图片工具栏配置](tui/README.md#local-image-toolbar-trial)；未配置时默认显示 Unicode 图标。
- **完成**：按 `q` 发送并返回。浏览界面下按 `Ctrl+C` 关闭审阅器，OpenCode 会问是否发送已保存的批注，AGY 直接退出不发送。`E` 和 `S` 也按 `[keys]` 配置发送。在 OpenCode 中确认发送相当于发出一条普通用户消息，就算切换过标签页也会在原会话继续执行。

### 中文及其他输入法

输入法在组词阶段会拦截普通字母按键，吞掉 `e`、`q`、`s` 等审阅快捷键以及 OpenCode 权限快捷键。

- 在 `/Applications` 安装 [Slash Saver](https://github.com/nxxxsooo/slash-saver) 1.1+ 后，插件会在浏览审阅界面或确认权限提示时切换到 Slash Saver 的 ASCII 输入源。
- 打开批注框或编辑框时会切回你的写作输入法，关闭后恢复之前的输入源。
- 在插件 `options` 中设置 `"inputSource": false` 可关闭该切换，或者指定一个支持 `input-source current|select|ascii` 的其他辅助程序路径。
- 输入法开着时，也可以直接按 `Ctrl+E` 进入编辑。

## Herdr

### Herdr.app

Herdr.app（`herdr-core`）直接通过 `hc` 和 `herdr-app` 通信，不需要 Herdr TUI 插件清单。

- **打开位置**：当前聚焦的调用窗格会弹出浮动 peek（`terminal.peek`）。未聚焦时，审阅器打开为调用方所在标签页中的一个窗格（如果是 sub-agent，则打开在宿主窗格所在标签页），不抢占焦点。
- **斜杠 hook**：装好 AGY hooks 后，`/annotate` 和 `/annotate <local-document>` 能在 AGY 窗格和 sub-agent 里直接运行。如果 hook 没能确认会话或打开审阅器，会给出具体原因并结束这一轮，不调用模型。
- **发送**：有待发送批注时，按 `Ctrl+S`、点 Send 或按 `q` 会发送反馈（没有批注时按 `q` 只关闭窗格；按 `Ctrl+C` 或关掉窗格不发送）。
  - 通过 hook 打开的审阅：AGY 处于 `idle` 或 `done` 时经 `hc send` 提交；处于 `working` 时入队等 AGY hooks 处理；处于 `blocked`、未知状态或会话变更时不发送。
  - 通过 skill 打开的审阅：将反馈入队交给 AGY 生命周期 hooks 处理。

### Herdr TUI

按[清单与快捷键配置](tui/README.md#herdr)把 `prefix+a`（默认先按 `Ctrl+B` 再按 `a`）绑定到 `annotate.review`。

- **AGY 窗格**：`prefix+a` 会弹出占屏幕 90% x 90% 的浮动 Markdown 弹窗（`agy-popup`），不启动模型轮次。AGY 处于 `idle` 或 `done` 时发送会开启新轮次，`working` 时排队，`blocked`、未知或会话变更时不发送。按 `q` 发送待提交批注并关闭（空批注直接关闭），按 `Ctrl+C` 关闭不发送。
- **AGY 斜杠 hook 与 skill**：装好 AGY hooks 后，在当前聚焦的 AGY 窗格运行 `/annotate` 或 `/annotate <local-document>`，会在模型运行前直接打开同一个弹窗。不走 hook 时，`annotate` skill 在窗格聚焦时打开 overlay，未聚焦时打开不抢焦点的分屏。
- **其他 agent**：Claude、Codex、Pi 和 OpenCode 窗格统一走 `herdr last --newest --deliver-to`。

只要启用了提供 `doc` 窗格入口的 `annotate` 插件，也可以在任意 Herdr 窗格直接运行 `annotate-tui herdr`（见 [TUI 配置](tui/README.md#herdr)）。OpenCode 的 `/annotate` 会清掉继承下来的 `HERDR_*` 环境变量，保留它自己的会话投递逻辑。

```sh
annotate-tui herdr open docs/plan.md --placement split --deliver-to w1:p2
annotate-tui herdr open docs/ --deliver-to w1:p2
annotate-tui herdr last --deliver-to w1:p2
annotate-tui herdr terminal --lines 20 --deliver-to w1:p2
annotate-tui herdr terminal --lines 5 --print
```

- `open`、`last`、`terminal` 都支持 `--placement overlay|split|tab|zoomed`（默认 `overlay`；`popup` 只能在清单里配）。
- `last` 会打开回复选择器，加 `--newest` 直接打开最新回复。配合 `--deliver-to` 时读取目标窗格的 agent 会话。
- 哪怕投递到别的窗格，`terminal` 审阅的仍是当前调用窗格的近期输出。加 `--print` 会把带围栏的 Markdown 代码块写到 stdout，不打开审阅器。
- 把 `w1:p2` 换成目标 agent 的窗格 ID。发送会输入提示词并附带回车提交。如果 Herdr 报告目标 agent 阻塞在弹窗前，不会发送，批注保持待发送状态，同时 Annotate 会尝试用 OSC 52 把内容写进剪贴板，方便你先处理弹窗再重试。
- 在 Herdr 外面，用 `annotate-tui docs/plan.md` 可通过支持 OSC 52 的终端复制反馈；`herdr open` 必须在 Herdr 窗格里运行。

<a id="antigravity-agy-support"></a>

## Antigravity (AGY) 支持

skill 与 hook 的安装方法见 [AGY 安装](#antigravity-cli-agy)。AGY 审阅如何打开与投递取决于当前终端：

- **斜杠 hook**：安装 AGY hooks 后，在配好的 Herdr TUI 窗格或 [Herdr.app](#herdrapp)（包括 AGY sub-agent）里，`PreInvocation` 会在模型运行前拦截 `/annotate` 和 `/annotate <local-document>`。
- **Skill 与 CLI**：如果 Herdr TUI hook 拒绝接管，`annotate` skill 会在 overlay 或分屏中运行 `agy-annotate tui [path]`。在 macOS 上且不在 Herdr 里时，它会新开 Ghostty（172x48）或 Terminal.app 窗口。在交互式 shell TTY 上直接运行 `agy-annotate tui` 会在当前终端内联打开。
- **网页**：明确给出 URL 或 HTML 目标时会调用 `agy-annotate web` 配对当前会话并打开浏览器扩展。
- **发送**：`Ctrl+S` 或 Send 按钮将反馈送回捕获的 AGY 对话；`q` 发送待处理批注并关闭（空批注直接关闭），`Ctrl+C` 关闭不发送。在 Herdr TUI 或 Herdr.app 直接发起的审阅会在 `idle` 或 `done` 时启动新轮次、`working` 时入队；由 skill 打开的审阅会入队等待 `SessionStart`、`PreInvocation` 和 `Stop` hooks。
- **日志**：被拒绝的斜杠拦截和弹窗运行结果记录在 `~/.local/share/opencode-annotate/agy-review.log`。

```sh
npx --package @nxxxsooo/open-annotate@latest agy-annotate status
npx --package @nxxxsooo/open-annotate@latest agy-annotate tui [path]
npx --package @nxxxsooo/open-annotate@latest agy-annotate web [url-or-html]
npx --package @nxxxsooo/open-annotate@latest agy-annotate queue
```

支持的 CLI 参数：`--session <id>`、`--binary <path>` 与 `--browser Chrome|Safari`。

<a id="browser-review-optional"></a>

## 浏览器审阅（可选）

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/browser-review.png" alt="v0.13.0 Chrome 扩展面板真实截图，显示一条已保存的网页批注与 Send 1 note 按钮" width="440">
  <br>
  <em>v0.13.0 <code>panel.html</code> 在隔离无头 Chromium 标签页中的真实截图（非 Chrome 原生侧边栏外框），包含合成反馈。现行版本面板已增加跨页轮次、区域框选与目标选择器。</em>
</p>

### Chrome（直接发送）

加载未打包扩展和 native host 的步骤见[本地浏览器安装](#local-browser-enabled-installation)。

**会话选择器与连接**

- 点击 **To** 旁边的目标，按标题或目录筛选会话，并按最近活跃、创建时间或标题排序。选择器会自动刷新最新标题。
- **New session** 按当前选定 OpenCode 会话的目录和模型（或 OpenCode 首页的当前选择）创建一个空 OpenCode 会话，不会启动模型轮次。
- **Disconnect** 会保留当前目标名称并把批注留在本地，再次选择即可重连。已断开的目标绝不会静默改投到另一个会话。
- 重启后的接收端会凭稳定的 provider/session 身份重连，并保留待重试批次。切换终端标签页绝不会改变已捕获的目标。

**记录批注与区域**

- 直接划词选中文本、使用 **Pick element** 选元素，或用 **Select area** 拖出矩形区域，再填写批注或提问。
- 未发送的区域框线会留在页面上：点击虚线框或编号角标即可激活，拖动移动位置或通过控制点调整大小，按 `Esc` 取消这次调整。
- 区域批注记录矩形坐标、视口大小、可见文本及最多五个选择器，不截图。
- 点击 **Add note**（或按 `Cmd/Ctrl+Enter`）在本地保存。点击 **Send N notes & continue** 会先保存正在输入的内容，再发出跨页的所有待发送批注。OpenCode 使用 `steer` / `resume: true`（空闲会话立即开始，运行中的轮次在下一边界收到反馈）；AGY 则入队等待其生命周期 hooks 处理。注册会话、新建会话和保存批注都不触发模型调用。

**管理轮次与重连**

- 批注按页面分组，编号跨页连续，与页面角标和发出的 Markdown 一致。发送栏展示整轮批注总数和目标，草稿仍只归属各自页面。
- 点击某条批注的引用目标会在原页面定位该目标而不触发元素点击；非当前页面的批注会打开所在页面。用 **Edit** 修改反馈，用 **Undo** 撤销删除。
- 批注列表头部的 **Clear** 清空本轮所有未发送批注，每个页面分组也有各自的 **Clear**。点一次 **Undo** 可以恢复刚清空的那批内容，草稿、已发送历史和 **Restore last round** 都保留不变。如果有待重试批次，清空整轮需要经过内联确认才会丢弃它。
- 每次发送会结束当前全局轮次，**Restore last round** 可找回最近一轮跨页批注。历史最多保留最近十轮。
- **Send** 和 **Copy instead** 是分开的两个动作。**Copy instead** 复制按页面分组的 Markdown 供任意 agent 使用，并结束当前轮次。**More review options** 里还有不结束轮次的复制 Markdown、导出 JSON 和整轮预览。
- 刷新和同站点跳转会自动重连。如果跨站点跳转导致 Chrome 收回访问权限，面板会保留已保存的批注，提示你点击一次扩展图标重新授权。

<a id="safari-copy-only"></a>

### Safari（仅复制）

在装有 Xcode 的 Mac 上，从仓库把共享浏览器源码构建为 `/Applications/annotate.app`：

```sh
ANNOTATE_SIGN_IDENTITY="Apple Development: Your Name (TEAMID)" \
ANNOTATE_DEVELOPMENT_TEAM="TEAMID" npm run build:safari
npm run install:safari
```

- `npm run install:safari` 会替换 `/Applications/annotate.app` 并刷新注册。先打开一次该应用，再到「Safari > 设置 > 扩展」中启用 Annotate，并放行你想审阅的网页权限。不传签名环境变量构建出的只是临时（ad-hoc）签名，Safari 可能会拒绝注册。
- 点击工具栏按钮或按 `Option+Shift+A`（在支持的系统上）打开独立面板。Safari 没有停靠式侧边栏，这个独立窗口会和当前审阅的 Safari 窗口保持绑定，并在操作期间持续轮询状态。
- 因为 Safari 扩展受 App Sandbox 沙盒限制，无法启动 Node 桥接、读取会话注册表或直接向会话发送反馈。它会忽略会话注册并把批注留在本地。点 **Copy notes** 复制后粘贴给任意 agent；复制会结束本轮，可通过 **Restore last round** 恢复。
- 在 `opencode.json(c)` 的插件 `options` 中配置 `"browser": "Safari"`，或在 `agy-annotate web` 中传 `--browser Safari`。该选项仅支持 `"Chrome"`（默认值，对应 Google Chrome）和 `"Safari"` 两个公开值。直接运行 `/annotate` 仍打开 TUI。
- 以后更新后，带签名变量重新构建并执行 `npm run install:safari`，重开一次应用，需要时重新在设置里启用。在 Chrome 里重载解压版扩展不会更新已安装的 Safari 应用。

### 安全机制与限制

- **Frames**：支持在同源 iframe、传统 frameset 和嵌套 frame 中拾取元素与选词，发出的 Markdown 会带上 `Frame:` 行。跨域 frame 无法拾取，界面会给出明确提示。
- **上限与脱敏**：单轮最多支持 200 条批注、512 KiB JSON（引用上限 4,000 字符，批注上限 8,000 字符）。导出的 URL 会脱敏其中的凭证及敏感查询或哈希参数（token、password、secret、signature、credential、API key、`auth`、`code`）。
- **草稿**：草稿按页面自动保存，面板重载或回到同一 URL（含 SPA 路由）时自动恢复。带着未保存输入切换目标时，可选择 **Add/Save & switch**、**Keep editing** 或 **Discard & switch**。
- **隐私与冲突**：存储写入失败时会保留输入以便重试；多个并发面板冲突时会要求明确选择草稿处理方式；版本校验机制能防止旧标签页覆盖较新的反馈。批注内容和草稿都只存在扩展本地存储里，页面只能拿到选区元数据与编号角标。
- **导出与目标**：完整 JSON 和 Markdown 导出包含脱敏后的 URL、精确选区文本及上下文、已验证的选择器提示、样式和无障碍信息。目标失效、变更或有歧义时会在侧边栏标出来，不会静默改绑到别的元素。
- **发送**：原生投递需要本机运行着 OpenCode TUI 或 AGY 接收端，并已连接可用目标。发送中途会话掉线时，批注仍保留在本地，可继续重试或复制。
- **失败批次**：发送失败的批次会留住原目标和批次 ID，以便用 **Retry N notes & continue** 重试，期间新增的批注留在本地；若原会话已永久关闭，先导出批注再开始新一轮审阅。复制当前轮次会覆盖待重试批次；万一剪贴板写入失败，界面会展示可手动复制的预览并保持本轮打开。
- **不支持范围**：浏览器内置页、Chrome Web Store 页面、PDF、跨域 iframe、Canvas 以及通过 SSH 远端连接的 TUI 客户端。如果正从旧的 Page Context 扩展迁移过来，先导出旧草稿并确认新版正常后再停用旧扩展。
- **文档与测试**：见[实现计划](docs/annotate-html-integration-plan.md)、[发布包评估](docs/annotate-html-evaluation.md)和[浏览器上游来源](browser/UPSTREAM.md)。各层测试分别运行 `npm test`、`npm run test:smoke` 和 `npm run test:browser`（`PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`）。

### 更新浏览器扩展后的重载

保持开发者模式开启，并更新 Chrome 里加载的 `browser/` 目录。面板连接时，新版 native host 会检查已安装的未打包扩展 manifest 版本。只要磁盘上版本更新且当前审阅空闲，Annotate 会自动重载一次，再点扩展图标或按 `Alt+Shift+A` 重新打开面板就行。

如果有未发送的批注、草稿、待重试批次，或者同时开着另一个面板，自动重载会等待。请先完成当前审阅，再点击 **Reload Annotate**。

如果新打开的面板加载了新版 `panel.mjs`，但后台还是旧的 `worker.mjs`，协议版本不匹配时会提示 **Annotate was updated** 并显示 **Reload Annotate**。点击它，或去 `chrome://extensions` 点 **Reload**（修改代码但没改 manifest 版本号，或者从还没有自动重载机制的旧版本升级时，也需要手动点 **Reload**）。

扩展本地存储里的批注和草稿在重载后依然保留。如果 native host 也变了，重启 OpenCode 或运行 `npm run install:bridge`。排查版本不一致时，可以把运行中的 worker 源码（DevTools/CDP `Debugger.getScriptSource`）与 `browser/worker.mjs` 对比；只看 manifest 版本号发现不了未打包目录里的就地修改。

<a id="configuration"></a>

## 配置

### 自动审阅长回复

在 `opencode.jsonc`（或 `opencode.json`）中开启自动批注，注意保留现有配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@nxxxsooo/open-annotate@latest",
      "options": {
        "autoAnnotate": true,
        "autoAnnotateThreshold": 2000 // Open when trimmed reply exceeds this many Unicode characters.
      }
    }
  ]
}
```

- `autoAnnotate` 默认为 `false`。`autoAnnotateThreshold` 接受非负整数，默认 `2000`。
- 阈值按去掉首尾空白后的回复正文 Unicode 字符数计算，算入 Markdown 和代码，不算推理过程和工具输出。设为 `0` 会打开每一条非空回复；字数刚好等于阈值时不打开。
- 在活跃且空闲的会话中，正常结束的轮次会对符合条件的回复打开一次。进度更新、失败或中断的轮次、历史回复和后台会话不触发。
- 如果正开着另一个审阅、打开前你切换了会话，或者新轮次已经开始，则跳过这次自动打开。关掉或重载不会再次弹出同一条回复，发送反馈依然需要你手动确认。OpenCode 会自动重载保存后的配置，必要时可运行 `/reload`。

<a id="what-notes"></a>

### what? 批注

`what?` 批注在审阅界面里保持简短。发送时，反馈会自动附上一条指令，要求贴合当前任务用大白话配合具体例子（有帮助时）把问题讲清楚，并在你确认前暂缓执行待定操作。

可在 `~/.config/opencode-annotate/tui.toml`（Windows 为 `%APPDATA%/opencode-annotate/tui.toml`）修改或清空这条指令（设为 `""` 就只发送批注本身）：

```toml
[prompts]
what = "Explain each passage marked what? in two sentences, then stop."
```

如果 OpenCode 里有 ID 为 `what` 的 skill，插件发送反馈时会像写 `@what` 一样挂上这个 skill，让该 skill 暂缓待办操作并询问是否继续。可以在 `opencode.json(c)` 通过 `whatSkill` 换成别的 skill 或关掉这个行为：

```jsonc
"options": { "whatSkill": "explain" } // or false
```

默认的 `what` skill 不存在时会自动跳过；指定的自定义 `whatSkill` 不存在时会中止发送并报错，同时保留草稿和 `feedback.md`。

### 主题、布局与插件选项

布局和 `[keys]` 按键配置放在 `~/.config/opencode-annotate/tui.toml`（Windows 为 `%APPDATA%/opencode-annotate/tui.toml`）。易读列宽布局示例：

```toml
[ui]
horizontal_margin = 2
max_width = 168
doc_width = 120
```

字体和字号跟随终端设置。适配层会设置 `PLANNOTATOR_TUI_THEME` 跟随明暗模式。`PLANNOTATOR_*` 环境变量与字段名都是本地协议标识，不会连向任何其他项目。

`opencode.json(c)` 中的其他 `options`：

- `inheritTheme`：设为 `true` 时使用 OpenCode 解析出的配色（画布、文字、Markdown、边框、高亮、光标、选区）。插件会读取二进制文件当前生效的配置，在不改动用户文件的前提下生成经过校验的 `PLANNOTATOR_TUI_CONFIG` 供单次审阅使用并接管终端。自定义启动器必须遵循 `PLANNOTATOR_TUI_CONFIG`。详见 [TUI 主题集成](docs/tui-theme.md)。
- `binary`：覆盖内置 `annotate-tui` 可执行文件的本地二进制路径。
- `browser`：`"Chrome"`（默认值，对应 Google Chrome）或 `"Safari"`。
- `inputSource`：设为 `false` 关闭输入源自动切换，或指定支持 `input-source current|select|ascii` 的辅助程序路径。

<details>
<summary id="draft-recovery">草稿恢复</summary>

每次审阅都会新建一个私有临时目录，在发送成功、空审阅或取消后自动清理。运行出错或有归档批注时会保留该目录并打印路径。

`review.json` 存有会话、来源和相对路径 `snapshot`；如果生成了导出内容，`feedback.md` 会保存反馈文本。用 `review.json` 里的 `snapshot` 值即可恢复保留下来的审阅：

```sh
PLANNOTATOR_DATA_DIR="<retained-directory>/data" \
  npx --package @nxxxsooo/open-annotate annotate-tui "<retained-directory>/<snapshot>"
```

按 `H` 打开归档，选中一条批注按 Enter 恢复，再按 `E` 复制反馈以便粘贴到 OpenCode。即使 `--export` 提示 "No annotations."，`E -> F` 归档仍会保留。
</details>

<details>
<summary id="development">开发与测试</summary>

```sh
npm ci
npm run build:tui
npm run check:tui
npm run check
npm run test:smoke
```

- 从源码构建需要 Rust 1.96+ 和 Node 22+。单元测试针对内置二进制运行，包含主题继承检查。
- `npm run test:smoke` 还依赖 Python 3、tmux 和 OpenCode，会在隔离会话里以 `resume: false` 运行，不调用模型，也不打开可见窗口。
- 设置 `ANNOTATE_TUI_BINARY` 可让测试走真实配置路径检验自定义二进制或启动器，设置 `ANNOTATE_EXPECT_MARGIN=10` 可断言 140 列冒烟终端中的 120 列居中边距。这些变量只用来配置测试，不属于发布插件本身。
- 在 OpenCode 中以开发模式加载时，把 `opencode.json(c)` 的插件项指向当前源码目录的绝对路径（保留 `options`），删掉 `cli.json` 中的重复条目，再运行 `/reload`。
- 详见[发布说明](docs/releasing.md)与[更新日志](CHANGELOG.md)。
</details>

## 更新与卸载

OpenCode 会缓存已安装的包，不会自动跟进仓库新提交。更新或移除插件请运行：

```sh
opencode plugin update @nxxxsooo/open-annotate@latest
opencode plugin remove @nxxxsooo/open-annotate@latest
```

如果命令没刷新，运行 `/reload`；运行 `opencode plugin list` 可查看当前装的版本。浏览器扩展单独更新：在 Chrome 更新加载的 `browser/` 目录，或重新构建安装 Safari 应用。

## 升级说明

- **从 `@nxxxsooo/opencode-annotate` 升级**：把 `opencode.json(c)` 中的包名换成 `@nxxxsooo/open-annotate@latest`，保留原有 `options`，然后运行 `opencode plugin list`。
- **从 `opencode-plannotator-tui`（0.4.2 及更早版本）升级**：运行 `opencode plugin remove opencode-plannotator-tui@latest`，安装 `@nxxxsooo/open-annotate@latest`，并把条目从 `cli.json` 移到 `opencode.json(c)`，同时保留 `options` 且只留单一条目，保证 TUI 只加载一次并同步服务端选项。
- **升级到 0.16.0+**：`/ref`（`--all`、`--tui`）和 `annotate_session_*` 会话工具已移至 Another。请安装 Another 0.28.0+ 并运行 `another setup` 以获得跨 agent 的 `/ref`，保留 `opencode.json(c)` 里现有的 `options`，并删掉所有 `annotate_session_*` 权限规则。

基于 MIT 协议开源。原终端审阅器的版权声明保留在 [tui/LICENSE](tui/LICENSE)。
