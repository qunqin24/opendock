# opencode-emotions

OpenCode 插件：用**极简英文命令**（`/angry` 等）表达情绪，命令输出即带统一标注 `emoji(等级/3)`，让模型读到准确的情绪。零自然语言、免 i18n、无状态。
另含 **TUI 插件**：把「语音输入」识别出的文本 + 情绪，以**同一套标注**注入会话或输入框。
（早期的手动符号入口 `!`/`?`/`...`/`666` 已移除，见 `docs/设计-情绪输入插件.md`。）

## 安装与生效

### 推荐：`opencode plugin`（自动安装 + 改写配置）

```bash
opencode plugin @xiaoqiong0v0/opencode-emotions           # 写入项目 .opencode/ 配置
opencode plugin @xiaoqiong0v0/opencode-emotions --global  # 写入全局配置目录
```

该命令会安装 npm 包，并按包内入口**自动改写**两处配置：server 入口 → `opencode.json(c)` 的 `plugin`，tui 入口 → `tui.json` 的 `plugin`。

### 手动：在配置里写包名

server 插件（情绪命令）——`opencode.json(c)`：

```jsonc
{
  "plugin": ["@xiaoqiong0v0/opencode-emotions"]
}
```

TUI 插件（语音输入 UI + 热键）——`tui.json`：

```jsonc
{
  "plugin": ["@xiaoqiong0v0/opencode-emotions"]
}
```

改完**重启 opencode** 生效。

### 需要先 `npm install` 吗？

不需要。opencode 启动时会按配置里的**包名**自动把插件安装到自己的包缓存（`~/.cache/opencode/packages`）。
`npm install @xiaoqiong0v0/opencode-emotions` 仅在你想在别处直接 `import` 本包时才需要。

### 包内入口如何被解析

- **server 插件** = 本包实际声明 `exports["."]` → `dist/emotions.js`（opencode 解析 server 入口按 `exports["./server"]` → `main` 回退；本包无 `./server` 键，落到 `main`，同为 `dist/emotions.js`）；
- **TUI 插件** = `exports["./tui"]` → `dist/tui.js`。

> 依据（opencode v1.18.25 源码）：`packages/opencode/src/plugin/shared.ts` `resolvePackageEntrypoint()`、`packages/opencode/src/plugin/loader.ts` `resolve()`、`packages/opencode/src/cli/cmd/plug.ts`（`opencode plugin` 按 `exports["./server"]`/`main`/`exports["./tui"]` 判定要写哪些配置）。

## 依赖体积（含 `ffmpeg-static`）

- **`ffmpeg-static`（写在 `optionalDependencies`）**：npm 安装时由该包的 `install` 脚本**下载**一个预编译 ffmpeg 二进制到 `node_modules/ffmpeg-static`（Windows `ffmpeg.exe` 实测 **≈ 79 MB**），用于语音采集（及 Termux 分块录音转码）。云 TTS 走**流式 raw PCM**，不再用它转码。代价是首次安装的网络流量与磁盘占用。**不依赖系统 ffmpeg**（非 Termux 下不读 `PATH`）：需要自备时用环境变量 `FFMPEG_BIN` 指向**任何可用 ffmpeg**，且必须通过 `ffmpeg -version` 真执行校验才会被采用。
- **opencode 自动安装不会执行 `install` 脚本**（源码 `packages/core/src/npm.ts` 硬编码 `ignoreScripts: true`）⇒ 插件缓存里只有包文件、没有 `ffmpeg.exe`。**语音入口在枚举设备前做启动自检**（非 Termux **每次都执行**）：把 `ffmpeg-static` 二进制补齐 —— 先**拷贝同机可用副本**（离线、零下载），没有副本才用当前 Node 跑 `ffmpeg-static/install.js` **下载**（约 **30–80MB**，需 **GitHub Release 可达**，默认超时 120s）；补齐结果一律用 `ffmpeg -version` **真执行校验**（不再只看文件存在）。**离线/内网**用 `FFMPEG_BIN` 指向可用 ffmpeg。`node scripts/ensure-ffmpeg.mjs` 仍是发布前门禁/离线预取（`--check` 只检查，缺失退出码 1），与运行时共用同一实现。
- `ffmpeg-static` 自身按 **GPL-3.0-or-later** 分发（与本包 MIT 许可相互独立）。
- `ws`：ASR/TTS 的 WebSocket 客户端（体积小）。

> 只用情绪命令、不用语音的用户：`ffmpeg-static` 位于 `optionalDependencies`，安装失败（如部分 Termux 环境）**不会拖垮主装**；opencode 自动安装的是生产依赖并跳过 install 脚本，见上一条的补齐步骤。

## 用法：情绪命令

消息以 `/` 触发命令，命令输出即为标注（可接你写的正文）：

| 命令 | 标注 |
|---|---|
| `/annoyed` | 😠(1/3) |
| `/angry` | 😡(2/3) |
| `/furious` | 🤬(3/3) |
| `/confused` | 🤔(2/3) |
| `/speechless` | 😑(2/3) |
| `/neutral` | 😐 |
| `/ok` | 🙂(1/3) |
| `/happy` | 😊(2/3) |
| `/great` | 🤩(3/3) |

例：`/angry 需求又改了` → `😡(2/3) 需求又改了`；无参数时只产生标注本身（`/great` → `🤩(3/3)`）。

> 早期的手动符号入口（`!`/`？`/`...`/`666`）已**移除**：语音来源已能自动给出情绪，符号冗余且有误伤（`? 这是什么`、`666 元`）与硬限制（行首半角 `!` 被 shell 模式拦截）。原因与影响见 `docs/changes/设计-情绪输入插件.20261014.md`。

## 语音输入（TUI 插件）

TUI 插件在会话输入框右侧渲染一个状态指示（`🎙️ [meter] ↧F8/⤉F9 🔊 F10`，总宽按宿主口径恒 **18** 列、中英一致不抖）——`🎙️ ` 段（`🎙` + VS16，宿主恒 2 列 + 1 列间隔）**永远静态**（恒 3 列、中性 `accent`，只做「这里是语音功能」的标记；2026-10-22 第十三批起**不再做任何 emoji 帧轮播/变色动画**，因为 emoji 的字形与进格宽度由终端/字体决定，换字形会跳位、不居中），其右侧是**恒定 1 列的盲文音量列**承载全部语音状态动画（盲文 U+2800–U+28FF 各终端同宽、可着色）：**关**=空白、**连接中**（F8/F9 已开但 ASR 还没连上）=spinner 转动（「还在连、别急着说」）、**在听**=纵向电平条 6 档（`⠁⠃⠇⠏⠟⠿`，由**真实麦克风电平**驱动 ⇒ **有音频输入才动**）；`↧`=输入/`F8`、`⤉`=注入/`F9`，**图标紧贴键位成组**，**没有模式文字**（2026-10-21 用户指令：先删「注入/输入」文字段、同日删 ●/○ 状态圆圈段、同日又恢复 `🎙` 并把与 `F8` 重叠的 `⇥` 换成 `↧`）——当前模式由**哪一组「图标+键位」整组高亮**表达；末端 `🔊 F10` 段颜色表达自动朗读状态：**亮=开、灰=关**），并用**点按**热键控制语音输入与自动朗读：

| 热键 | 模式 | 行为 |
|---|---|---|
| `F8` | 输入 | 识别结果**追加进输入框**，由你编辑后发送 |
| `F9` | 注入 | 识别结果作为**新消息**发进当前会话（带 `🎙` 标记 + 情绪标注） |
| `F10` | 自动朗读（**双态**） | **本会话正在播放**（判活也把无主算作活跃；按会话停只停本会话）时按键 = **只中断播放、开关不动**（toast「已中断播放（朗读开关状态未变）」，不写状态文件、指示灯原样）；**无播放**时才开/关**当前会话**的助手回复**自动朗读**（分会话开关，模型不可切换，独占此热键），关闭同时**立即停止**正在朗读的那段，开启只影响后续回复、不补读历史；**子会话（subagent）不支持**——有活跃播放时先按「只中断播放」处理（开关不动）；无播放且判定为子会话时 toast 提示且不写状态；状态在槽位**末端 `🔊 F10` 段**以颜色指示（亮=开、灰=关，响应式跟随当前会话，仅状态、非模式） |

`F8`/`F9` 两模式互斥，都关闭时停止后台语音运行时；**`F8`/`F9`/`F10` 均带 700ms 尾沿静默的键重复抑制**（按住不会连续 toggle：窗口内重复事件只记调试日志、不执行；F8/F9 各自独立互不抑制）。`F10` 独立控制自动朗读（只写共享状态文件 + 停止播放，不影响语音运行时；槽位末端 `🔊 F10` 段只做状态显示，文本恒定、不影响宽度恒定契约）。ASR 依赖 DashScope 凭证与 ffmpeg，识别出的情绪映射为同一 `emoji(等级/3)` 标注。TUI 槽位/热键的 API **官方未公开**、跨版本可能变（详见 `docs/设计-语音输入注入.md`）。

## 语音输出（`emotions_cli` 工具 / `emotions-cli` 命令）

由**唯一的 server 插件入口** `emotions`（`dist/emotions.js`）通过 `tool` 钩子提供 **CLI 风格**工具 `emotions_cli`（工具定义在 `src/voice/tool.ts`）：模型在用户要求「说出来 / 念出来 / 朗读 / 用语音回答」时主动调用，把文字合成语音并对用户播放。工具名与 CLI 均对齐包名 `opencode-emotions`，避免与其它插件重名。
工具只接受一个参数 `args`（完整 CLI 参数串），内部执行 `node dist/cli/emotions-cli.js <args>`（PATH 上找不到 `node` 时回退 `process.execPath`）。

> 为什么由 server 插件提供：`@opencode-ai/plugin/tui` 的 `TuiPluginModule` 声明 `server?: never`，TUI 插件无法注册工具；工具只能由 `{ id, server }` 的 server 插件提供。现与情绪命令**合并进同一个 server 入口**——一个 npm 包只解析一个 server 入口（`exports["./server"]` / `main`；本包无 `./server`，实际走 `main` = `exports["."]` → `dist/emotions.js`），合并后 npm 安装时命令与 `emotions_cli` **都生效**。

**`emotions_cli` 工具契约**（`args` 为命令串）：

| 子命令 | 说明 |
|---|---|
| `speak --text <t> [--emotion <e>] [--voice <v>] [--rate <n>] [--provider <p>]` | 合成并播放（工具会自动补 `--background`，立即返回、后台播放）；也可 `--text-file <path>` 从文件读正文 |
| `devices` | 列出音频输入设备 |
| `status` | 查看解析后的配置（含 `uiLanguage`/`toolLanguage`） |
| `help`（或省略 `args`） | 显示用法 |

> **自动朗读开关不在此**：它由 TUI 的 `F10` 热键独占切换，模型不能经此工具/CLI 开关（无旁路）。
> **F10 开启时 `speak` 被拦截（2026-10-22）**：该会话自动朗读开着时，工具调用 `speak`（含 `--follow`/`--background`）
> **不会播放**——server 读同一份每会话状态文件后直接返回「当前已开启自动朗读，已跳过语音播放」，防与自动朗读叠播；`help`/`devices`/`status` 不受影响。

例：`speak --text "你好" --emotion happy`、`devices`、`status`、`help`。

**直接用 CLI**（`npm run build` 后；也可 `npm run emotions-cli -- <args>`）：

```bash
node dist/cli/emotions-cli.js help
node dist/cli/emotions-cli.js status
node dist/cli/emotions-cli.js devices
node dist/cli/emotions-cli.js speak --text "你好" --emotion happy              # 前台播放（等到播完）
node dist/cli/emotions-cli.js speak --text "你好" --emotion happy --background # 后台播放，立即返回
```

**情绪（`--emotion`）**：映射为 CosyVoice 的 `instruction`（`sapi` 忽略）。取值/别名与指令对照见 `docs/设计-语音输入注入.md` §13.1；`neutral` 或省略 = 不加风格指令。

**本地发布（`npm run publish:proj`）**：`npm run build` 产出 `dist/` 后，脚本把 `dist/` **整体镜像**到项目 `.opencode/plugin/`，并把 `.opencode/tui.json` 的 `plugin` 指向 `./plugin/tui.js`；重启 opencode 生效。**无需挑拣/改名**——`dist/` 的结构本身就是发布结构：

| `dist/` 顶层 | 说明 | 镜像后 |
|---|---|---|
| `emotions.js` | **唯一 server 插件入口**（情绪命令 + `emotions_cli` 工具 + 自动朗读事件钩子） | `.opencode/plugin/emotions.js` |
| `tui.js` | TUI 插件入口（由 `src/tui.tsx` 编译） | `.opencode/plugin/tui.js` |
| `cli/emotions-cli.js` | CLI（非插件） | `.opencode/plugin/cli/` |
| `runtime/voice-runtime.js` | 语音运行时（非插件） | `.opencode/plugin/runtime/` |
| `lib/**`、`voice/**` | 依赖 | 对应子目录 |

> **顶层只放真插件**：opencode 会把 `.opencode/plugin/` 顶层的**每个 `.js`** 当插件自动 import；CLI、语音运行时等非插件产物一律进子目录（`cli/`、`runtime/`），子目录不被扫描。`publish:proj` **断言顶层只有插件入口**——出现 `emotions-cli.js` / `voice-runtime.js` 之类会立即报错退出（防回归）。
> `tui.js` 由**宿主同款 Babel 链**（`babel-preset-solid` + `@babel/preset-typescript`，见 `scripts/build-tui.mjs`）编译：Solid 编译会把 JSX 包成 `createElement` / `insert` / `setProp` + `effect` 的**响应式**结构，而 `tsc` 的 `jsx()` 产物不会包裹 props/children（会失去响应式），故 `.tsx` **不进主 `tsc`**；但它由 `tsconfig.tui.json`（`jsx: "preserve"` + `jsxImportSource: "@opentui/solid"`，与宿主一致）单独做 `--noEmit` 类型检查，`npm run build` 会**先 typecheck 再编译**（`npm run typecheck` 可单独跑）。产物保留裸 `@opentui/solid` / `solid-js` import，由宿主加载时重写为运行时模块 id。
> 语音运行时脚本路径解析：`VOICE_RUNTIME_SCRIPT`（显式覆盖，优先）> **插件产物自身位置**同级 `runtime/voice-runtime.js`（`dist/` 与镜像后 `.opencode/plugin/` 同构，由 `import.meta.url` 推出）> `<cwd>/dist/runtime/voice-runtime.js`（兜底）。**不再以 cwd 为主口径**——opencode 的 cwd 是用户启动目录（家目录启动即拼出不存在的路径，runtime 秒退 code=1）；解析结果不存在时直接报错并带上完整绝对路径与全部候选。
> CLI 路径解析：`EMOTIONS_CLI_SCRIPT`（存在则用；旧名 `VOICE_CLI_SCRIPT` 兼容）> `<cwd>/dist/cli/emotions-cli.js` > 工具模块同级（`dist/voice/` 或镜像后 `.opencode/plugin/voice/`）的 `../cli/emotions-cli.js`。

**情绪与配置**：`tts.*` 见下方「语音配置」；也可用环境变量覆盖（`TTS_PROVIDER` / `TTS_VOICE` / `TTS_RATE` / `TTS_INSTRUCTION` / `TTS_PITCH` / `TTS_VOLUME` / `TTS_FORMAT` / `TTS_SAMPLE_RATE` / `TTS_MODEL` / `TTS_STREAM_MIN_CHARS` / `TTS_PREFETCH_DEPTH`（预取深度，`0`=关闭，默认 1）/ `TTS_PLAYER` / `TTS_STREAM` / `MIMO_API_KEY`）。

**provider**：
- `sapi`（默认）：本机 Windows SAPI，仅支持 `voice` / `rate` / `volume`；`instruction` / `pitch` / `format` / `sampleRate` / `model` 会被**忽略并记一条日志**。**仅 Windows**（非 Windows 会明确报错，不会静默无声）。
- `aliyun`：阿里云百炼 **CosyVoice**（WebSocket `run-task`），支持 `voice` / `rate` / `pitch` / `volume` / `format` / `sampleRate` / `instruction`（风格/情感/方言）等；默认模型 `cosyvoice-v2`、默认音色 `longxiaochun_v2`（**模型与音色版本须一致**：v2 模型配 v2 音色、v3 配 v3，混用报 `418`）。**凭证用 `tts.credentials`**（与 `asr.credentials` 各自独立、可只配其一；同一 DashScope 账号时两侧填同样的值即可）。**合成跨平台，播放走跨平台播放器抽象**（见下）。
  - **流式（低首包延迟）**：不再「整段合成→落盘→播」，而是**纯流式送文**——正文**增量**送入多条 `continue-task`（**不做句切分**，交由 CosyVoice 服务端分句），**音频帧到达即播**（raw PCM 写播放器 stdin）。**首次送文前先缓冲到 ≥ `tts.streamMinChars` 字**（默认 5，防开头卡顿），达标后**随到随发**；仅单条超 2 万 / 累计超 20 万（服务端约束）才硬切（正常不触发）。流式路径固定 `format=pcm`（`tts.format` 的非 pcm/wav 值会被忽略并记日志），采样率取 `tts.sampleRate`。
  - **`instruction` 版本限制（据实校验）**：风格/情感/方言指令**仅 `cosyvoice-v3`/`v3.5` 与 `qwen-audio-3.x` 支持**；默认的 `cosyvoice-v2` **不支持**，配置了也会被忽略并记一条日志（不报错）。
  - **取消**：`finish-task` 且 `payload.input.directive="cancel"` → 立即停并丢弃后续音频；同连接可复用。
- `mimo`：小米 **MiMo TTS**（OpenAI 兼容 `POST /v1/chat/completions`，SSE 流式；模型默认 `mimo-v2.5-tts`、音色默认 `冰糖`，预置音色含 `mimo_default`/冰糖/茉莉/苏打/白桦/Mia/Chloe/Milo/Dean）。**单请求、全量文本**：`role:"assistant"` 放目标文本、`role:"user"` 放风格指令（`--emotion`/`tts.instruction` 映射的中文指令；`rate` 非 0 时并入「请用稍快/稍慢的语速说」），`audio.format` 固定 `pcm16`、**流式输出 PCM16LE 24kHz 单声道**，音频帧到达即写 AudioSink（与 aliyun 同一播放抽象）。`pitch`/`volume`/`format`/`sampleRate` 被忽略并记日志。**凭证用 `tts.mimoCredentials.apiKey`**（或环境变量 `MIMO_API_KEY`；与 aliyun 的 `tts.credentials` 相互独立、无需 workspace）。合成跨平台；**当前限时免费**。

**音频落地（合成的音频如何放出声）**：`aliyun` 流式音频帧到达后交给 **AudioSink**（`src/voice/tts/audio-sink.ts`），按可用性择一：

1. **流式（首选，零落盘）**：`src/voice/tts/stream-player.ts` 里能吃 **stdin 裸 PCM** 的播放器——**Windows 内置 waveOut 播放器**（`pwsh`+`Add-Type` 内联 C# 调 winmm `waveOutOpen`/`Write`/`Reset`/`Close`，自实现**小缓冲有界队列**（≈40ms/块 × 最多 4 块 ≈ **160ms 预读上限**）**连续无间隙**、零外部依赖、不再依赖 ffplay；CLI 被杀后 stdin EOF 只把已排队的 ≈160ms 播完即静音退出，消长尾音）→ 其次 `ffplay`；Linux `aplay -f S16_LE -r <sr> -c1 -t raw -` → `paplay --raw …`；Termux / macOS `play`(sox) → `ffplay`。音频帧**到达即写入其 stdin**。
2. **分段回退**：找不到流式播放器时，用按平台择一的**文件播放器**（下表）——**段边界 = 句边界**：每句音频收完后落成一段（补 44 字节 WAV 头写临时文件后**顺序播放**；上一段播放期间继续合成下一句，减少间隙）。

| 平台 | 文件播放器候选（分段回退用，取第一个可用） | 探测方式 |
|---|---|---|
| Windows | PowerShell `SoundPlayer`（`pwsh` 优先，回退 `powershell`） | PATH 上找 `pwsh`/`powershell` |
| macOS | `afplay` | PATH 探测 |
| Termux | `play-audio`（绝对路径 `$PREFIX/bin/play-audio`，默认前缀 `/data/data/com.termux/files/usr`），带 `-s <stream>` | `TERMUX_VERSION` 非空 或 `PREFIX` 含 `com.termux` 或平台 `android`；按绝对路径判定可执行 |
| Linux | `/usr/bin/paplay` → `/usr/bin/aplay` | 按绝对路径探测（存在且可执行） |

可用环境变量 **`TTS_PLAYER`** 显式覆盖：填**流式** id（`waveout`/`winmm`/`aplay`/`paplay`/`sox`/`play`/`ffplay`）走流式；填文件型 id（如 `play-audio`/`soundplayer`/`afplay`）则强制走**分段回退**。音频流由 **`TTS_STREAM`** 控制（仅 Termux `play-audio` 用到：`media`/`alarm`/`notification`/`ring`/`system`/`voice`，默认 `media`）。**流式与分段都不可用时**会报清晰错误（列出已尝试候选与可安装的包，Termux 缺失时明确提示 `pkg install play-audio`），**不会静默无声**。

**打断（barge-in，立即静音）**：**用户一发送消息**（server 插件 `chat.message`）**或按 `F8`/`F9` 语音输入 / `F10` 中断**（TUI 插件）时，立刻停止正在播放的 TTS。按 `F10` 中断时**先写会话级中断请求水位**（`<sessionID>/interrupt-req`，内容=毫秒时间戳）再停播——修「按 F10 后剩余文本继续播」：落在单元间隙无进程可杀、worker 死后 auto-read 会重新 spawn，两者都由朗读侧在每个派发单元前读该水位拦下（时序契约见 `docs/ASYNC.md` ⑰）。机制：播放进程（CLI `speak` / `speak --follow` / 分离的 `__play`）启动时把条目**原子写**到 `~/.opencode/plugins-cache/opencode-emotions/tts-playback`——文件是**多条目 map** `{ [sessionID]: { pid, playerPid?, provider, taskId, startedAt } }`（无主/旧格式用哨兵键 `_`），支持**跨会话混音、单会话互斥**（同会话新播顶掉旧条目，不做排队）。打断方读该文件后**逐条目过会话归属门**（条目 `sessionID` 存在且不等 → 跳过；**无主条目按会话停跳过**，只由无参显式全清停止；调用无参/空 sessionID = 停全部，仅 dispose/清场用），再按条目记录的 `pid` **与**可选 `playerPid` **各自**终止——先 `SIGTERM`，有界超时（1.5s）后仍存活再 `SIGKILL`；两个都杀是因为 Windows `TerminateProcess` 不杀子孙（只杀 CLI 会让发声的 PowerShell 孙进程把当前块播完）。进程退出/播完自动清理。**只允许按记录中的 PID 终止本插件自己派生的进程**（`pid>1`、非自身、未超 30 分钟 TTL），**严禁按进程名/模式杀**；找不到/已退出静默降级。被终止的播放进程会向云 TTS 发 `directive=cancel` 再退出。

**音色**：SAPI 优先用 `pwsh`（PowerShell 7）——它能选择全部 OneCore 音色（`Microsoft Huihui` / `Microsoft Kangkang` / `Microsoft Yaoyao`）；仅有 Windows PowerShell 5.1 时只认 Desktop 音色（如 `Microsoft Huihui Desktop`），选不到时回落到默认音色。连读会打断上一条（同一时刻只播一条）。

## 自动朗读（F10）

助手回复边生成边自动朗读（`type==="text"` 的可见正文，排除 reasoning）；开关**按会话独立**、由用户用热键控制。

- **分会话开关（F10 双态，2026-10-22）**：由 TUI 的 **`F10` 热键**控制**当前会话**——**本会话（或无主，仅判活口径）正在播放**时按键 = **只中断本会话播放、开关不切**（`isInterruptablePlaybackActive` 判活 → `stopPlayback({ sessionID })` + toast，不写状态文件、指示灯原样；**无主播放不会被按会话停杀掉**，只由显式全清停止）；**无播放**时才点按切换开/关（一个会话的开关**不影响**其它会话/窗口）。模型与 `emotions-cli` 均**不能**切换——CLI 已无 `auto_tts` 子命令、`emotions_cli` 工具也不含该能力，**无旁路**（F10 开着时模型 `speak` 还会被**拦截跳过**，见上节工具说明）。`F10` 关闭时**立即停止**正在朗读的那段（复用按 PID 的 `stopPlayback()`）；开启只影响后续回复，**不**补读历史。**键重复抑制**：按住 F10 被 OS 连发按键事件时，一次物理按压只切换一次（尾沿静默 700ms；否则一次按住会产生偶数次翻转、净效果=关，即「按了状态不变」根因）。
- **子会话不自动朗读**：子会话（subagent 任务会话）**不支持**自动朗读——server 侧按 sessionID 单飞取 `Session.parentID` 判定并硬跳过（无论开关开没开都不读）；TUI 侧按 F10 时**先判有没有活跃播放**：有播放则只中断（开关不动，toast「已中断播放」），**无播放且判定为子会话**才 toast 提示「子会话不自动朗读」且不写状态。**已知限制：两个窗口打开同一会话时，后开窗口首见该会话会删共享的 `auto-tts` 目录 ⇒ 先开窗口的已激活开关也会被重置。**
- **重启不保留 → 每会话首见懒重置（2026-10-21 起）**：本 TUI 进程**首次见到某会话**时（指示灯求值 / F10 按下两触点）才删**该会话目录**（`auto-tts` + `auto-tts-seen`）——重启（新进程首见）= 自动朗读回到关；后开窗口只重置它自己首见的会话，**不同会话**的已激活开关不受影响（旧「init 清整个会话数据根」在多窗口场景会误删先开窗口的开关，已作废；`resetAutoTtsState()` 全量清保留但生产不再调用）。**同一会话被两个窗口同时打开时仍是共享文件**：后开窗口首见会重置、退出停播也会互停，属已知取舍。
- **状态落盘（每会话一个文件夹，对齐 file-tool）**：`~/.opencode/plugins-cache/opencode-emotions/<sessionID>/auto-tts`，内容为极简单值 **`on` / `off`**（一目录一会话，缺文件=关）；去重在 `<sessionID>/auto-tts-seen`。**原子写**（临时文件 + rename），读写失败一律降级（读→关、写失败由 F10 toast 提示）。因写开关的 **TUI 进程**与消费开关的 **server 插件进程**是两个进程，开关必须落共享文件才能被插件读到。
- **谁来读、何时触发**：由 **server 插件**（`dist/emotions.js`）的 `event` 钩子消费两类事件**边生成边送 TTS**（2026-10-20 修正：opencode 的文本流式增量走 **`message.part.delta`**，`message.part.updated` 仅 text-start/text-end 各一次）——**`message.part.delta`** 按 `partID` 增量追加（delta payload 无类型，靠 text-start 快照登记的 `partID→type` 过滤 `reasoning` 等）、**`message.part.updated`** 作全量快照校准；用**同一「阈值 + 增量」口径**（`tts.streamMinChars`，默认 5）：**缓冲到阈值才首次派生**；随后 `drain` 每轮把**此刻已在队列**的块凑批合并（单批 ≤2000 字），再经 `splitSentences()` **按句对齐切分**（完整句连读、未完尾段 carry 到句尾）；**sapi 等 `followSupport` provider 对每条消息只派生 1 个 `speak --follow` 常驻 worker**，后续句子单元写入其 stdin（不再每块 spawn），消息完成时关 stdin 冲刷尾音；其它 provider 仍按句子单元 spawn CLI（流式送文本身仍是「阈值 + 增量、不做句切分」，交给服务端分句）；同一消息的朗读**串行**播放（避免新增量打断旧的），**每次派生前再读一次该会话的开关**——`F10` 关闭后队列里待播的下一段不再派生（与「立即停播」共同保证关掉即停；delta 高频路径读开关走 300ms TTL 缓存）。只读 `type==="text"` 的 part（排除 `reasoning`/thinking、`synthetic`、`ignored`），并用 `message.updated` 建立 `messageID→role` 表**只读 assistant**（避免读到用户消息；**角色未知时惰性补取一次** `info.role`，被角色门挡过的 part 置 tainted、其 delta 全丢，由快照兜底无重复；摘要消息不读）。**子会话硬跳过**：按 sessionID 单飞取 `Session.parentID` 判定（缓存），是子会话则无论开关开没开都不读。消息**完成**时补读未达阈值的缓冲并置去重，并打**每消息一条**诊断汇总（`自动朗读汇总：… session=… path=stream|fallback|skip …`）；**未观察到 part 更新**的消息在完成时回退「整段读」（用 `client.session.message(...)` 取回 parts）。
- **怎么读**：复用 CLI——派生 `node dist/cli/emotions-cli.js speak --text-file <临时文件>`（正文写临时文件、argv 数组传参，**不拼 shell 字符串**；派生 bin 默认 PATH 上的 `node`，env `VOICE_NODE_BIN` 可覆盖——**不用** `process.execPath`，server 插件进程里那是 `opencode.exe`）；子进程 stderr 接管，非零退出或有 stderr 时 `log.warn` 带片段（不再静默无声）；同一块增量的音频本身走上面的**流式**路径。同一条消息按 **消息 id 去重**（内存 + 持久化每会话 `<sessionID>/auto-tts-seen`，防插件重启/事件重放重复朗读）。
- **首句合并窗（自适应）**：首句就绪后不立即派发，先等一个**自适应窗口**合并随后到达的句子（省一次管线重启）。窗口 = `max(基值 400ms, 观测到的句间到达间隔)`，**上限 1200ms**；**下一条可合并文本到达 / 消息流结束 / 窗口到期**三者先到即结算，打断（水位 / 会话级中断请求 / 开关关闭 / 子会话门）期间每 50ms 轮询、**立即生效**。设 `FIRST_MERGE_WINDOW_MS=0` 即关闭（旧行为）。代价：首音延迟最多 +1200ms。
- **预取（边合成边交播，2026-10-23 第十五批）**：播第 N 单元的同时**并行预合成 N+1**（深度 1，`TTS_PREFETCH_DEPTH=0` 关闭）。预合成用 `speak --pcm-out` **只落盘**（不登记 `tts-playback`、不参与打断 map）；交播时派生 `speak --pcm-file --pcm-follow` 先预热播放器、父进程经 stdin 写 `go` 放行，随后由**播放子进程**按文件增长 `stat`+`read` **边到边读**（不等整段合成完成；写端以 `done`/`abort` 控制行收尾）。预取文件**写盘不限大小**，播完 / 失败 / 取消**即删**。仅支持流式跨平台 provider（aliyun/mimo）的自动朗读路径生效；`sapi`、手动 `speak` 不受影响。
- **预取防双播退出码口径**：播放进程退出码 `0`（完整播完）/ `3`（`PCM_PLAY_EXIT_PARTIAL`，已播部分后写端异常）**必然已出声，绝不重读**；仅 `1`（`PCM_PLAY_EXIT_NOT_STARTED`，从未起播）才**串行重试一次**；未知退出码 / 被取消一律按已播处理（宁可漏播不双播）。
- **打断**：用户发消息时（`chat.message`）清空待读队列并停掉当前播放；**被打断的消息进入永久停读水位**——后续增量/入队直接丢弃，消息完成时也**不补读**（直接置 seen，防止回退成整段重读）；**下一条新消息正常朗读**（水位是消息级，不会影响后续回复）。
- **跨平台播放**：同上方「音频落地」表（受 `TTS_PLAYER` 控制）。
- **Termux 限制**：见「已知限制」。


## 语音配置（`emotions.jsonc`）

语音输入（ASR）与语音输出（TTS）统一从 **`<配置目录>/emotions.jsonc`** 读取，**不写死在代码里**。
配置文件名与插件/项目同名（`opencode-emotions` → `emotions.jsonc`），与同级插件的约定一致（`browser-tool.jsonc` / `sound-notify.jsonc` / `plugin-logger.jsonc`）。
配置目录 = `~/.config/opencode`（`os.homedir()/.config/opencode`）。**首次运行**若文件不存在，会自动写一份带注释的默认；读取失败静默降级为默认值。
**旧名兼容**：旧配置名 `voice.jsonc` 仍可用——若 `emotions.jsonc` 不存在而 `voice.jsonc` 存在，则把旧文件**原样复制**为 `emotions.jsonc`（**旧文件保留不删**，用户已改的值不动）。

**优先级**：命令行参数 > 环境变量 > `emotions.jsonc` > 内置默认。
**凭证优先级（两侧各自独立、互不影响）**：`asr.credentials` 只供阿里系 ASR（含按段 `aliyun-qwen-file`）、`tts.credentials` 只供阿里云 TTS；每一侧的解析链均为 环境变量（`DASHSCOPE_API_KEY` / `DASHSCOPE_WORKSPACE_ID`）> 该侧 `credentials.apiKey`/`workspaceId` > 该侧 `credentials.path` 凭证文件 > 默认 `<cwd>/.tmp/aliyun`（凭证只读、绝不打印）。**可只配其一**：只想用 TTS 时配 `tts.credentials`（或留空靠环境变量）即可，无需再动 `asr.credentials`。**MiMo 也两侧各自独立**（无 workspace，各读各组、不跨兄弟组回退）：ASR `provider=mimo` 走环境变量 `MIMO_API_KEY` > `asr.mimoCredentials.apiKey`；TTS `provider=mimo` 走环境变量 `MIMO_API_KEY` > `tts.mimoCredentials.apiKey`。

| 键 | 默认值 | 含义 | 环境变量 |
|---|---|---|---|
| `uiLanguage` | `en` | **TUI UI 文案**语言：`zh` / `en`。用于槽位指示、toast、命令标题与**运行时错误/警告提示**（错误码稳定，文案按此语言渲染；改后重启 opencode 生效）；缺省回退旧键 `language` | `VOICE_UI_LANGUAGE`（旧名 `VOICE_LANGUAGE` 兜底） |
| `toolLanguage` | `en` | **工具文案**语言：`zh` / `en`。用于 `emotions_cli` 工具描述（插件加载时本地化）与 `emotions-cli --help`；缺省回退旧键 `language` | `VOICE_TOOL_LANGUAGE`（旧名 `VOICE_LANGUAGE` 兜底） |
| `device` | `""` | 音频输入设备（Linux 用 pulse source 名，Windows 用 dshow 友好名）；**未指定时**：Linux 取 `pactl get-default-source`（失败回退非 `.monitor` 真实输入源）；Windows 取 ffmpeg dshow 枚举第一条（dshow 无 default 语义，建议显式指定）；Termux 用系统 ffmpeg 默认 | `VOICE_DEVICE` |
| `asr.provider` | `aliyun-qwen` | ASR 预设，分两类传输——**stream**（WebSocket 实时）：`aliyun-qwen`(realtime,16k,7类情绪) / `aliyun-8k`(inference,8k,3类) / `aliyun-v2`(inference,16k,无情绪)；**segment**（整段音频→HTTP→文本，本地能量静音切段）：`aliyun-qwen-file`(qwen3-asr-flash 同步,16k,7类情绪) / `mimo`(mimo-v2.5-asr,16k,无情绪) | `VOICE_ASR_PROVIDER` |
| `asr.model` | `""` | 模型名；空 = 按 provider 预设自动选择 | `VOICE_ASR_MODEL` |
| `asr.language` | `""` | 识别语言；**空 = 自动识别（多语言）**。可选 `zh/yue/en/ja/ko/de/fr/ru/...`（stream 与 `aliyun-qwen-file` 按此表；`mimo` 仅收 zh/en，其余映射为 auto） | `VOICE_ASR_LANGUAGE` |
| `asr.languageHints` | `[]` | 语言提示：paraformer `language_hints`（**仅 `aliyun-8k`/`aliyun-v2`**）；`mimo` 用于 zh/en 单值映射（含 zh→zh、含 en→en、否则 auto）；其余忽略 | `VOICE_ASR_LANGUAGE_HINTS`（逗号分隔） |
| `asr.vocabularyId` | `""` | 热词表 ID（paraformer `vocabulary_id`，需先用 VocabularyService 预建且 `target_model` 一致）；**仅 `aliyun-8k`/`aliyun-v2` 支持**，其余忽略 | `VOICE_ASR_VOCABULARY_ID` |
| `asr.context` | `""` | 领域上下文/语料（run-task `input.context`）；**当前无 provider 支持，始终忽略**（qwen3-asr-flash-realtime 与 paraformer 均不支持） | `VOICE_ASR_CONTEXT` |
| `asr.credentials.path` | `""` | **ASR 专用**凭证文件（1 行 workspaceid / 2 行 apikey）；空 = 默认 `<cwd>/.tmp/aliyun` | `VOICE_ALIYUN_CREDENTIALS`（兼容旧名 `ALIYUN_CREDENTIALS`） |
| `asr.credentials.apiKey` | `""` | **仅 ASR 用**；直接给出的 API Key（与 `tts.credentials` 各自独立） | `DASHSCOPE_API_KEY` |
| `asr.credentials.workspaceId` | `""` | **仅 ASR 用**；直接给出的业务空间 ID | `DASHSCOPE_WORKSPACE_ID` |
| `asr.mimoCredentials.apiKey` | `""` | **仅 mimo ASR 用**；MiMo API Key（无需 workspace；与 `tts.mimoCredentials` 相互独立，留空回退环境变量） | `MIMO_API_KEY` |
| `vad.threshold` | `0.5` | 语音活动检测**短帧能量门限的配置基线**（30ms 短帧，按段 ASR 生效）。**有效区间 [0,1]**（`<0` 在映射时被夹到 0），映射为 dBFS：`0→-50 dBFS`（最灵敏）、`0.5→-35 dBFS`（默认）、`1→-20 dBFS`（最抗噪）。实际门限按底噪自适应：`clamp(max(基线, 底噪估计+vad.marginDb), -50, -20)`（底噪 = 最近 **5s** 的 30ms 帧 **p10 滑动分位**：冷启动偏低 5s 内自愈、说话期间 p10 贴底噪不漂移；连续 5 帧=150ms 越门限才算检出语音）。**越高越抗噪**、越低越灵敏（易误触发） | `VOICE_VAD_THRESHOLD` |
| `vad.silenceDurationMs` | `800` | 句尾静音判定毫秒 `[200,6000]` | `VOICE_VAD_SILENCE_MS` |
| `vad.marginDb` | `6` | 自适应门限相对底噪估计的最小余量 dB `[3,15]`（越小越灵敏、越大越抗噪；非法值告警并回退默认） | `VOICE_VAD_MARGIN_DB` |
| `tts.provider` | `sapi` | 合成后端：`sapi`(本机 Windows SAPI) / `aliyun`(阿里云 CosyVoice) / `termux`(Termux 系统 TTS) / `mimo`(小米 MiMo) | `TTS_PROVIDER` |
| `tts.voice` | `""` | 音色名；空 = provider 默认（sapi 系统默认 / aliyun `longxiaochun_v2` / mimo `冰糖`） | `TTS_VOICE` |
| `tts.rate` | `0` | 语速；`sapi` `[-10,10]`（0 中性）、`aliyun` `[0.5,2]`（0 = 未指定 → 1.0）；`mimo` 无原生参数，非 0 时并入风格指令（稍快/稍慢） | `TTS_RATE` |
| `tts.instruction` | `""` | 风格/情感/方言指令（≤100 字）；`aliyun` 仅 `cosyvoice-v3`/`v3.5`、`qwen-audio-3.x` 支持（v2 忽略并记日志）；`mimo` 作为 `role:"user"` 风格指令下发；sapi 忽略 | `TTS_INSTRUCTION` |
| `tts.pitch` | `0` | 音高 `[0.5,2]`（0 = 未指定 → 1.0）；**仅 `aliyun` 支持**，sapi/mimo 忽略 | `TTS_PITCH` |
| `tts.volume` | `0` | 音量 `[0,100]`（0 = 未指定 → provider 默认）；sapi / aliyun 均支持，mimo 忽略 | `TTS_VOLUME` |
| `tts.format` | `""` | 输出格式 `pcm/wav/mp3/opus`（空 = wav）；**仅 `aliyun` 支持**，sapi/mimo 忽略（mimo 流式固定 `pcm16`）。**aliyun 流式路径固定用 `pcm`**，非 pcm/wav 值被忽略并记日志 | `TTS_FORMAT` |
| `tts.sampleRate` | `0` | 采样率 `8000/16000/22050/24000/44100/48000`（0 = 22050）；**仅 `aliyun` 支持**，sapi/mimo 忽略（mimo 固定 24000） | `TTS_SAMPLE_RATE` |
| `tts.model` | `""` | 云 TTS 模型名（空 = `cosyvoice-v2` / mimo `mimo-v2.5-tts`）；aliyun / mimo 支持，sapi 忽略 | `TTS_MODEL` |
| `tts.streamMinChars` | `5` | 流式送文**最小缓冲阈值**：首次向 CosyVoice 送 `continue-task` 前需缓冲的字符数（非负整数，负数/非数字回退默认）；防开头卡顿。**仅 `aliyun` 流式与自动朗读（F10）增量生效**（mimo 为单请求全量文本，不受影响） | `TTS_STREAM_MIN_CHARS` |
| `tts.credentials.path` | `""` | **TTS 专用**凭证文件（1 行 workspaceid / 2 行 apikey）；空 = 默认 `<cwd>/.tmp/aliyun`（与 `asr.credentials` 各自独立；**仅 aliyun 用**） | `VOICE_ALIYUN_CREDENTIALS`（兼容旧名 `ALIYUN_CREDENTIALS`） |
| `tts.credentials.apiKey` | `""` | **仅 aliyun TTS 用**；直接给出的 API Key（留空回退环境变量与默认凭证文件，不受 `asr.credentials` 影响） | `DASHSCOPE_API_KEY` |
| `tts.credentials.workspaceId` | `""` | **仅 aliyun TTS 用**；直接给出的业务空间 ID | `DASHSCOPE_WORKSPACE_ID` |
| `tts.mimoCredentials.apiKey` | `""` | **仅 mimo TTS 用**；MiMo API Key（无需 workspace；与 aliyun 凭证及 `asr.mimoCredentials` 相互独立，留空回退环境变量） | `MIMO_API_KEY` |

自定义配置目录：环境变量 `EMOTIONS_CONFIG_DIR`（兼容旧名 `VOICE_CONFIG_DIR`，两者同时设置时新名优先）。

**多语言（i18n）**：文案语言拆为两个独立键——`uiLanguage`（TUI 槽位指示/toast/命令标题/**错误与警告提示**）与 `toolLanguage`（**工具描述**，插件加载时本地化 + `emotions-cli --help`）；均 `zh` / `en`（内置默认 `en`）。运行时错误以稳定 `code` 上报，用户可见文案按 `uiLanguage` 渲染（日志保留内部原文）；`en` 下不会拼接中文详情。旧键 `language` 向后兼容：新键缺 → 用 `language` → 再缺用 `en`（环境变量同理：`VOICE_UI_LANGUAGE`/`VOICE_TOOL_LANGUAGE` 缺省时旧名 `VOICE_LANGUAGE` 兜底两者）。词表集中在 `src/lib/i18n.ts`（新增语言只需在 `LANGUAGES` 与 `PHRASES` 各加一项，类型会强制补齐全部键）。

**抗噪**：阿里云无独立降噪参数，抗噪主要靠调高 `vad.threshold`（默认已从 0.2 调到 **0.5**）。`asr.language` 留空走服务端自动语种检测，即可多语言。

## 已知限制

- **手动符号入口已移除**：`!!!`/`？？？`/`...`/`666` 不再触发标注；请改用命令（`/angry` 等）。
- 情绪命令需**真正触发命令**（消息以 `/` 开头）才生效；命令不产出额外模型回合。
- **npm 安装会拉入 `ffmpeg-static`（Windows 实测 ≈79 MB，其它平台约 30–80 MB）**，见上文「依赖体积」。
- **新机器首次启动语音会自动补 ffmpeg**：**不依赖系统 ffmpeg**（非 Termux 下不读 `PATH`）——`FFMPEG_BIN` 通过 `-version` 校验则跳过自检；否则先拷贝同机可用副本、没有副本再下载（约 30–80MB，需 GitHub Release 可达），**每进程只尝试一次**，补齐结果一律过 `-version` 真执行校验。**离线/内网**用 `FFMPEG_BIN` 指向可用 ffmpeg 后重启 opencode；失败原因会连同引导（设 `FFMPEG_BIN` / 配代理后重启重下 / 重装插件依赖）一起显示。**开了系统代理仍下载失败**（Node 默认不读系统代理）：设 `VOICE_FFMPEG_DOWNLOAD_PROXY=http://127.0.0.1:7897` 后重启重下（Windows 静态系统代理会自动读取，PAC 自动配置脚本不覆盖）。**Termux 例外**：随附二进制在 Android/aarch64 跑不起来，仍需 `pkg install ffmpeg`。
- **语音采集平台矩阵（2026-10-23 第十八批）**：

  | 平台 | 采集后端 | 依赖 |
  | --- | --- | --- |
  | Windows | `ffmpeg -f dshow` | `ffmpeg-static` 随附二进制（启动自动补齐；**不需要**系统 ffmpeg） |
  | Termux / Android | `termux-microphone-record` | `pkg install termux-api` + Termux:API 应用；转码用系统 `ffmpeg`（`pkg install ffmpeg`） |
  | Linux 桌面 | `ffmpeg -f pulse`（PulseAudio/PipeWire）→ 回退 `ffmpeg -f alsa` **一次** | `ffmpeg-static` 随附二进制（Linux x64）、`pactl`（`apt install pulseaudio-utils`，或 `pacman -S libpulse`）、`arecord`（`apt install alsa-utils`） |
  | 其它（如 macOS） | **不支持**（明确报错，不静默走 dshow） | — |

  Linux 安装命令：`sudo apt install pulseaudio-utils alsa-utils`（Debian/Ubuntu）或
  `sudo pacman -S libpulse alsa-utils`（Arch）——**不必另装 ffmpeg**（随附二进制优先）；
  若本机随附二进制不可用（如非 x64 架构），自行装 ffmpeg 并用 `FFMPEG_BIN` 指向它。
  麦克风权限不足时把用户加入 `audio` 组
  （`sudo usermod -aG audio $USER` 后重新登录）。设备取值：`--device <source 名>` 或 `--device hw:C,D`，
  留空用 `default`；`--list` 会同时显示友好名与取值。

- **TTS 平台差异**：`sapi` provider **仅 Windows**；`aliyun`（CosyVoice）**合成**跨平台。**播放**优先走流式（stdin raw PCM：**Windows 内置 waveOut**、Linux `aplay`/`paplay`、Termux/macOS `sox play`、通用 `ffplay`）；找不到流式播放器时回退**按句分段临时 WAV 顺序播放**（段边界=句边界；Windows SoundPlayer / Termux `play-audio` / macOS `afplay` / Linux `paplay`·`aplay`）。可用 `TTS_PLAYER` 覆盖（流式 id 走流式、文件型 id 强制分段）、`TTS_STREAM` 设音频流。**两条路径都没有时**会报清晰错误，不会静默无声。
  - **Windows**：默认用**内置 waveOut 流式播放器**（`pwsh`/`powershell` + winmm，无 `ffplay` 依赖）；`pwsh` 缺失时回退 `powershell`。若 `pwsh`/`powershell` 都不可用则回退 SoundPlayer **分段**（段边界=句边界，间隙更少）。
  - **Termux**：`play-audio` 只能放文件、不能流式 → 有 `sox`(play) 走流式，否则回退分段。
- **Termux 限制**：
  - **采集（ASR）不可用**：`ffmpeg-static` 是 **Linux x64 预编译**二进制，在 Termux（Android/aarch64）跑不起来；**Termux 是唯一例外，直接用系统 `ffmpeg`（PATH）**，请 `pkg install ffmpeg`（也可 `FFMPEG_BIN` 指向可用 ffmpeg）。`devices` 子命令同样依赖 ffmpeg。
  - **播放走 `play-audio`**：`pkg install play-audio` 后可用（绝对路径 `$PREFIX/bin/play-audio`）；缺失时报清晰错误并提示安装命令。音频流由 `TTS_STREAM` 控制（默认 `media`）。
  - `sapi` 在 Termux 上必然报错（非 Windows）；请用 `aliyun`（CosyVoice）。

## 故障排查

- **提示「未检测到音频输入设备（麦克风）」**（`error.code="no-input-device"`）：设备枚举成功但**一个输入设备都没有**，运行时在取凭证/连 ASR/进采集**之前**就失败。按三条依次检查：
  ① 麦克风**已连接**并在系统声音设置里**启用**；
  ② **Windows 设置 → 隐私 → 麦克风**，打开「允许桌面应用访问你的麦克风」（关掉时驱动正常也枚举不到）；
  ③ 外置/USB 麦克风确认**驱动已装、设备未被禁用**（设备管理器里无黄色感叹号）。
  再用 `node dist/runtime/voice-runtime.js --list` 核对当前可见设备：**空列表同样以退出码 3 结束**并打印同一份提示；
  能列出设备却一直没识别结果 ⇒ 不是「没设备」而是「没声音」（见下条静音提示）。
  ffmpeg 自身起不来是**另一类**错误（退出码 1 + 明确路径/原因），不是没设备。
- **toast 现在显示真实原因**：运行时失败时 toast 取 **NDJSON `error` 事件里的可操作文案**，没有则取 **stderr 中最后一条含错误关键字的行**、再退化到**末行**（总长上限 300 字符，超长保留首尾）——**不再只显示 stderr 第一行**（旧实现按固定长度截断开头，常把「自检成功」那行当成原因）。明细看日志 `runtime exited: …`；收集诊断时直接引用日志路径。
  **退出码含义**：`3` = 未检测到音频输入设备（麦克风，`--list` 空设备同样是 3）；`1` = 采集/配置/连接/ffmpeg 等其它致命错误；`0` = 正常结束。
  **配套静音提示**：设备正常、也在出流，但 3 秒观察窗内电平几乎为零（RMS < 1e-4）时**只弹一次**「麦克风似乎没有声音（RMS≈0），请检查静音、增益或是否选错设备」——按提示查系统静音键、输入音量/增益是否为 0、是否选错设备（`--device <设备名>` 或 `VOICE_DEVICE`）。

## 开发

```bash
npm install
npm run build        # 清空 dist/ → tsc 编译 src/**（不含 .tsx）→ npm run typecheck（tsconfig.tui.json）→ Babel 链编译 dist/tui.js
npm test             # 构建后跑单元测试（node --test，430 例：429 pass + 1 POSIX-only skip）
npm run publish:proj # build + 镜像 dist/ → .opencode/plugin/（并指向编译后的 tui.js）
```

`publish:proj` 是**本地开发**路径（镜像到本项目 `.opencode/plugin/`，重启 opencode 生效），与下面的 npm 发布是两条互不影响的路径。

### 发布（由维护者执行）

```bash
npm version patch              # 或 minor / major：升 version 并打 git tag
npm publish --access public    # scoped 包必须显式 --access public
```

`prepublishOnly` 会在发布前自动 `npm run build && node --test "test/**/*.test.js"`（既构建、又跑全量测试；`build` 本身已含 `typecheck`）。发布前可用 `npm pack --dry-run` 校对将入包的产物（本包 `files` = `dist` + `README.md`；`package.json` / `LICENSE` 由 npm 自动带入）。

**产物与发布结构**（顶层只放插件入口，其余进子目录）：

```
dist/
  emotions.js          # 唯一 server 插件入口（源：src/emotions.ts；情绪命令 + emotions_cli 工具 + 自动朗读事件钩子）
  tui.js               # TUI 插件入口（源：src/tui.tsx，经 Babel 链编译）
  cli/emotions-cli.js  # CLI（源：src/cli/emotions-cli.ts）
  runtime/voice-runtime.js  # 语音运行时（源：src/runtime/voice-runtime.ts）
  lib/**               # 命令表 / 标注工具 / i18n 等
  voice/**             # 语音能力（emotions_cli 工具 voice/tool.ts、自动朗读 voice/auto-read.ts、
                       #   流式播放器 voice/tts/stream-player.ts、音频落地 voice/tts/audio-sink.ts、
                       #   文件播放器 voice/tts/player.ts、播放状态/打断 voice/playback-state.ts）
```

## 许可证

MIT，见 `LICENSE`。`ffmpeg-static` 为独立依赖，按其自身 **GPL-3.0-or-later** 许可分发。

