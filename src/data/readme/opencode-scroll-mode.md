# opencode-scroll-mode

OpenCode TUI 的「对话滚动模式」插件：一键切换编辑 / 滚动两种状态，滚动时支持 vim 键位、消息搜索与 visual 选区复制。

## 安装

### npm（推荐）

```sh
opencode plugin add opencode-scroll-mode
```

`opencode plugin add` 会从 npm 安装并写入全局 `opencode.json(c)` 的 `plugins`。也可以锁定版本：

```sh
opencode plugin add opencode-scroll-mode@0.3.3
```

升级 / 移除：

```sh
opencode plugin update opencode-scroll-mode
opencode plugin remove opencode-scroll-mode
```

### 手动配置

在 `opencode.json(c)` 的 `plugins` 中加入包名，OpenCode 会在启动时自动安装缺失的 npm 包：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-scroll-mode"]
}
```

> 本插件同时包含 server 与 TUI 入口，因此配置在 `opencode.json(c)`；只含 TUI 的插件才放在 `cli.json`。
>
> 如果不使用 npm 包，也可以把插件目录放在自动加载路径（如 `~/.config/opencode/plugins/scroll-mode/`），无需再写进 `plugins`。

## 功能

- `ctrl+[`（默认，可用 `toggleKey` 配置）在「编辑模式」与「滚动模式」之间切换。
  - 编辑模式：输入框保留原生 readline 键位。
  - 滚动模式：导航键位移动 transcript 中的行 / 字符游标；只有游标到达视口边缘时才让宿主滚动，并启用 vim 键位与搜索。
  - 滚动模式会**锁定输入框**：进入时让编辑器失焦、隐藏编辑光标，并全局吞掉按键，避免滚动时误把字符打进 prompt；退出时恢复焦点、光标与输入。当其他组件（命令面板、搜索、选择等对话框）获得焦点时，滚动键位会**整体挂起**，把键盘交给对话框，避免在面板里打字时后台游标乱跳。
- 滚动全部委托给 OpenCode 内置的 `session.*` 命令，不自行计算偏移，避免与 transcript 分页冲突。
- 状态存于内存：每次 TUI 启动重置，插件热重载时保留。

## 键位（仅滚动模式下生效）

| 键 | 动作 |
| --- | --- |
| `ctrl+[` | 开 / 关滚动模式（默认，可用 `toggleKey` 改） |
| `j` / `k` | 上 / 下移动行游标（到视口边缘时滚动一行） |
| `h` / `l`、`←` / `→` | 左 / 右移动字符游标 |
| `w` / `b` / `e` | 下一个词首 / 上一个词首 / 词尾 |
| `0` / `$` | 行首 / 行尾 |
| `ctrl+d` / `ctrl+u` | 下 / 上半页（游标保持屏幕行） |
| `ctrl+f` / `ctrl+b` | 下 / 上整页（游标保持屏幕行） |
| `gg` / `G` | 跳到首条 / 末条消息 |
| `[` / `]` | 上 / 下一条用户消息 |
| `/` / `?` | 打开搜索（正 / 反向） |
| `n` / `N` | 下 / 上一个匹配 |
| `v` / `V` | 从当前游标位置进入 charwise / linewise visual 选区 |
| `y` | 普通状态复制游标行；visual 中 yank 选区 |
| `Y` | 普通状态复制**当前视口所有可复制行**；visual 中按整行 yank |
| `q` | 退出滚动模式（visual 中先取消选区） |

## 游标、Visual 选区与复制

滚动模式始终有一个**真实的行 + 字符游标**：`j` / `k` 上下移动行，`h` / `l`（以及 `w` / `b` / `e`、`0` / `$`）移动行内字符。游标到达视口上下边缘时才让宿主滚动一行，并让游标贴住新边缘（类似 vim 的 scrolloff 行为）；到达最后一页的最后一行时 `j` 不会再把游标卡在首行。

按 `v` / `V` 时，以**当前游标所在行和字符列**为锚点。因此可以先在普通状态下用 `l` / `w` / `$` 把游标移到行内任意位置，再按 `v` 从该字符开始选择；`v` 之后 `h` / `l` 调整的是选区的活动端。

| 键 | 动作 |
| --- | --- |
| `v` | charwise（字符）选择 |
| `V` | linewise（整行）选择 |
| `j` / `k` | 上 / 下移动行游标（到边缘时滚动） |
| `h` / `l`、`←` / `→` | 向左 / 右移动字符端（普通状态移动游标，visual 中扩展选区） |
| `w` / `b` / `e` | 下一个词首 / 上一个词首 / 词尾 |
| `0` / `$` | 行首 / 行尾 |
| `o` | 交换锚点与游标 |
| `y` | yank 选中文本（可跨消息）→ 系统剪贴板，退出 visual |
| `Y` | 按整行 yank 当前选区，退出 visual |
| `esc` / `q` | 取消选区，留在滚动模式 |

普通状态下 `y` 复制游标所在行，`Y` 按屏幕顺序复制当前视口内所有可复制行（代码块、软换行行都包含在内）——这就是「逐行取得显示内容」的入口。

### 精确到每一显示行

插件会在 transcript 的 ScrollBox 下遍历可选择文本节点，读取每个节点的 `lineInfo`：

- `lineSources[]`：该**视觉行**来自哪一条源文本行；
- `lineWraps[]`：软换行的第几段；
- `lineStartCols[]` / `lineWidthCols[]`：该段在源行中的显示列范围（CJK、Tab 按显示宽度计算）。

因此 `CodeRenderable`（代码块）、`LineNumberRenderable` 里的代码目标、以及被软换行拆开的普通段落，都会按**屏幕上真正画出的那一行**建立索引；代码块的每一行和折行后的每一段都能单独定位、扩展和复制。行号/边框等非文本节点不会被当成内容。

### 复制来源与颜色

yank 优先使用宿主的选区 API（`renderer.startSelection` / `updateSelection` / `getSelectedText`），与鼠标拖选共用同一套渲染与文本提取逻辑，所以软换行、代码块、跨消息选区的文本都是宿主的精确结果。选区容器会沿父链提升到 transcript 的 ScrollBox，避免把侧栏、状态栏文字卷进来。若宿主选区拿不到文本，则回退到上面的逐行索引拼接。

yank 后写入系统剪贴板：优先 **OSC52**（iTerm2 需在设置里允许终端访问剪贴板；tmux 需 `set -g set-clipboard on`；ssh 远端也可能直接生效），失败时回退 `pbcopy`（macOS）/ `wl-copy` / `xclip`（Linux）。

滚动模式下，**字符游标所在格会画一条 1 格竖线**（`renderer.addPostProcessFn` 直接写帧缓冲），同时游标行整行淡着色；visual 中锚点到游标之间用宿主选区高亮。宿主默认不给文本节点设置 `selectionBg`，插件会显式设置 `cursorColor` / `selectionColor`（退出时还原）。可用 `highlight: false` 完全关闭。

限制：索引只覆盖**已渲染进 transcript 树**的消息；更早、尚未加载的消息需要先向上滚动加载。若选区锚点行被宿主回收，yank 会退回到最近的可见行。

## 搜索

`/` 输入关键词 → 在会话消息中全文检索 → 结果列表（摘要 + 角色 + 时间）→ 选中跳转；`n` / `N` 在结果间循环。

跳转采用「渲染树定位」：找到已渲染的消息节点，让最近的 ScrollBox 将其滚入视野。**仅对已加载进主视图窗口的消息有效**；更早的消息需先上滚 transcript 加载，再按 `n`。

## 配置

传参数时使用 `plugins` 的对象形式；`package` 可以是 npm 包名，也可以是本地插件目录（本地目录若已在自动加载路径中，则二选一，避免重复加载）：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-scroll-mode",
      "options": {
        "vim": true,
        "search": true,
        "maxResults": 100,
        "searchScope": "all",
        "toggleKey": "ctrl+[",
        "highlight": true,
        "cursorColor": "#3d5a80",
        "selectionColor": "#2f5d9e",
        "barColor": "#7aa2f7"
      }
    }
  ]
}
```

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `vim` | boolean | `true` | 是否启用 vim 键位 |
| `search` | boolean | `true` | 是否启用消息搜索 |
| `maxResults` | number | `100` | 搜索结果上限 |
| `searchScope` | `"all"` \| `"user"` | `"all"` | 搜索范围 |
| `toggleKey` | string | `"ctrl+["` | 切换滚动模式的按键（格式同 `bind`，如 `"ctrl+q"`、`"f9"`、`"ctrl+\\"`） |
| `highlight` | boolean | `true` | 行光标 / 选区高亮 |
| `cursorColor` | string | `"#3d5a80"` | 行光标背景色 |
| `selectionColor` | string | `"#2f5d9e"` | visual 选区背景色 |
| `barColor` | string | `"#7aa2f7"` | 字符游标竖线颜色 |

> 关于切换键的选择：
> - 原默认 `ctrl+q` 在很多终端里是 **XON 流控键**（`ctrl+s` 是 XOFF），即使没有插件冲突也可能被终端吞掉，所以不再用它。
> - `ctrl+[` 在多数终端里和 `Esc` 发送同一个字节（`0x1b`）：只有终端开启 **kitty keyboard 协议**（kitty / WezTerm / Ghostty / 新版 iTerm2）时才能被识别成独立的 `Ctrl+[`；跑在 Neovim `:terminal` / sidekick.nvim 里时它就是纯 `Esc`，不会触发切换。
> - 如果在你的环境里 `ctrl+[` 没反应，改用 `"toggleKey": "f9"`（nvim / 终端都不拦截）最稳。

## 结构

- `index.ts` — 服务端入口（仅注册 id）。
- `tui.ts` — TUI 入口，全部逻辑。
- `package.json` — 包元数据与 `exports`。
