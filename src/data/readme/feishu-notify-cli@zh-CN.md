# feishu-notify-cli

给本机 AI agent 用的飞书（Lark）机器人通知 —— 一个发送端 + 一层配置解析，**不内置任何地址**。

webhook 在**发送前**按下表解析；一处都取不到就 `exit 2` 并给出引导语。它绝不回落到内置地址：解析不出来是一次报错，而不是把消息发到别人的机器人上。

本包提供两个命令：

| 命令 | 运行时 | 职责 |
|---|---|---|
| `feishu-notify` | bash | 发送端。把卡片或纯文本 POST 到解析出的 webhook。hooks 与 agent 插件调用的就是它。 |
| `feishu-notify-cli` | Node ≥ 18 | 配置与诊断：`resolve` / `init` / `channel` / `doctor` / `footer` / `install`。 |

> **本包在单仓中的位置。** `feishu-notify-cli` 是 `feishu-notify` 单仓里的 `packages/cli`
> workspace（仓库级 README：[`../../README.zh-CN.md`](../../README.zh-CN.md)）。本文里以
> `bin/`、`lib/`、`tests/` 开头的路径都相对**本包**。另两个适配器 workspace 都已实现、都已发布到 npm（v0.1.0）：
> `packages/opencode`（插件，见 [`../opencode/README.zh-CN.md`](../opencode/README.zh-CN.md)）与
> `packages/dsh`（DSH/Cordis bundle，见 [`../dsh/README.zh-CN.md`](../dsh/README.zh-CN.md)）。

> **已发布到 npm（v0.1.0）。** `feishu-notify-cli` 已发布 —— 可以全局安装，开发时也可以从仓库里跑：
>
> ```sh
> npm i -g feishu-notify-cli            # 标准安装
> node bin/feishu-notify-cli init      # 在 packages/cli 下执行，例如开发时
> ```

## 它做什么

| 能力 | 说明 |
|---|---|
| 解析 webhook | `--webhook` → `--channel` → `FEISHU_NOTIFY_WEBHOOK` → 配置 `activeChannel` → 报错 |
| 发送 | 互动卡片（标题 + markdown 正文）或纯文本；正文可来自参数或文件 |
| Hook 模式 | `--hook` / `--idle` / `--done` 读 stdin 上的 hook JSON（`last_assistant_message`、`prompt`），并追加来源与时间戳页脚 |
| 自我配置 | `init` 先发一张测试卡片，**卡片送达了才落盘** |
| 自我诊断 | `doctor` 先查真实 hook 会走的那条**接线链**（发送端 → 解析器 → Node ≥ 18，含悬空符号链接），再逐 channel 真实发卡 |
| 自我接线 | `install` 把 hook/插件声明幂等地合并进探测到的 agent（`claude-code` / `opencode` / `dsh`），每个被改的文件留 `*.bak.<时间戳>` |
| 多 channel | 具名 channel（`default` / `opencode` / `claude`…）配一个 `activeChannel`；调用方也可以按目标指定 channel |
| 卡片底部归你 | 卡片底部那行是配置项 `footer`（≤40 字符、不含换行）。不配置 → 中性默认 `feishu-notify`；配成 `""` → 只显示时间戳 |
| 不泄露密钥 | 所有输出都是掩码；`npm test` 里的密钥闸门会扫描源码与 `npm pack` 产物中的真实 hook token |

## 它不做什么

- **不创建你的飞书机器人。** 机器人在飞书侧自行创建，本工具只负责保存与使用它的 webhook。
- **不做卡片交互。** 按钮、回调、审批不在范围内；卡片是单向的。
- **不做聚合、静音、定时。** 一个事件进，一张卡片出。
- **不静默降级。** 缺配置就是报错（`exit 2`），这是刻意的 —— 见[安全](#安全)。代价是配置坏了会停通知，而不是悄悄发歪。
- **`install` 还没覆盖全部目标。** `claude-code` 端到端可写；`opencode` 与 `dsh` 的包都已发布，写盘前会用 `npm view` 预检包能否解析，预检通过即可写入；解析不出来仍会拒绝写入，并打印"解析通过后会改成什么"的预览（`dsh` 另有 `--dsh-dev-dir` 本地联调口）。见[一键接线](#3-一键接线)。
- **`install` 不代跑包管理器。** DSH 那条它只写 profile 清单，并把 `dsh plugin … pnpm install` 命令打出来让你自己执行；不自己跑 pnpm/npm 安装，`--dry-run` 的"零写入"才是它真能担保的性质。
- **不支持 Windows。** 发送端是 bash + `curl` + `python3`；CLI 侧是 Node、可移植，发送端不是。
- **不代你发布适配器包。** opencode / DSH 两个适配器都已发布到 npm（v0.1.0）；`install` 只负责在你自己的配置里声明它们。

## 环境要求

| 要求 | 为什么 |
|---|---|
| **Node ≥ 18** | CLI 是 Node 写的，而 bash 发送端要调它解析 webhook。作者本机 `/usr/local/bin/node` 是 **v14.17.5**，连解析器都读不了 —— 所以才有下面这套解释器搜索。 |
| `bash`、`curl`、`python3` | 都继承自原发送端：bash 跑脚本、`curl` 发 payload、`python3` 解析 stdin 上的 hook JSON。 |
| macOS / Linux | 发送端是 bash。Windows 不在本轮范围。 |

**发送端怎么挑 Node**（`bin/feishu-notify`），按下序，主版本 `< 18` 的候选一律跳过：

1. `$FEISHU_NOTIFY_NODE`
2. `PATH` 上的 `node`
3. `/usr/local/bin/node`
4. `/opt/homebrew/bin/node`
5. `$HOME/.nvm/versions/node/*/bin/node`

一个都不合格时，发送端仍会直接执行 CLI；失败了才打印指向 Node ≥ 18 与 `FEISHU_NOTIFY_NODE` 的提示。解析器的发现顺序同理：`$FEISHU_NOTIFY_CLI` → 脚本同目录下的 `feishu-notify-cli`（也就是 `npm i -g` 之后的布局）→ `$HOME/.local/bin/feishu-notify-cli` → `PATH`。

## 快速开始

### 0. 先装 CLI 本体（**推荐全局安装**，这一步很关键）

```sh
npm i -g feishu-notify-cli      # 产出两个真实的 bin
```

**为什么是全局安装，而不是从仓库跑或长期靠 `npx`。** hook 依赖的那条接线是"`PATH` 上有个
`feishu-notify`，它能在自己旁边找到 `feishu-notify-cli`"。全局安装产出的正是这个布局：两个真实文件
并排在同一个 bin 目录里。

**绝不能发生的是：线上接线依赖某个"开发仓库路径"。** 2026-10-18 本仓库改名，而
`~/.local/bin/feishu-notify-cli` 是指向它的符号链接：链接悬空 → 发送端 `exit 2` → 通知**静默失效**
（报错只存在于 hook 进程里，没人看得见）。现在 `doctor` 能诊断这个状态（[接线健康](#接线健康-r11)），
结构化上的解法就是别让生产指向工作副本 —— 所以安装器写进 hook 的是裸命令名 `feishu-notify`
（走 `PATH`），而不是任何绝对路径。

试用时从仓库里跑没问题：

```sh
node packages/cli/bin/feishu-notify-cli doctor      # 在仓库根跑
```

但别把 hook 接到那个路径上。

### 1. 配置

```sh
npx feishu-notify-cli init
# 或者从仓库里跑：
node bin/feishu-notify-cli init
```

交互式 `init` 会问 webhook，**先发一张测试卡片验证**，卡片被接受了才写配置。自动化用法：

```sh
feishu-notify-cli init --non-interactive --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/<PLACEHOLDER>" --channel default
feishu-notify-cli init --non-interactive --webhook-stdin < secret.txt   # 地址不进 argv/ps
feishu-notify-cli init --non-interactive --webhook "$URL" --no-verify   # 跳过发卡（不推荐）
```

### 2. 自检

```sh
feishu-notify-cli doctor
```

`doctor` 按顺序做两件事：

1. **接线自检** —— 走一遍真实 hook 会走的那条链（发送端 → 解析器 → Node ≥ 18），每个候选都用
   `lstat` 分类，所以**悬空符号链接**会被报成"悬空符号链接"而不是"不存在"，并直接打印修法
   （`rm` 掉坏链接 + `npm i -g feishu-notify-cli`）。
2. **逐 channel 可达性** —— 真发卡片，打印 `结论：N/M 通`；有通道不通就 `exit 1`。卡片带的是
   **当前生效的 footer**，所以你在测试卡上看到的外观就是真实通知的外观。每行还带该 channel 的
   **指纹**（webhook 的 sha256 前 8 位十六进制），指向**同一个机器人**的 channel 会被点名提示 ——
   掩码恰好打掉了能区分机器人的 token，光看地址输出两者完全无法区分。这是事后提示而非定论：
   有意让多个 channel 复用一个机器人是合法选择（见 dsh 适配器 README 的"哪个机器人"一节）。

接线自检**刻意不改变退出码**：hook 跑在 agent 的环境里（`PATH`/`HOME` 都不同），所以这里的 ✗ 是
强力的可执行警告，而不是"通道坏了"的定论。`doctor --json` 里的 `wiring` 给人/脚本用。

### 3. 一键接线

```sh
feishu-notify-cli install --dry-run     # 只打印计划，零写入
feishu-notify-cli install               # 问一次确认，然后写
feishu-notify-cli install --yes         # 非交互
```

三个目标今天各自能做到什么（**实测，不是愿景**）：

| 目标 | 探测 | 动作 | 状态 |
|---|---|---|---|
| `claude-code` | `~/.claude/settings.json` | 合并两组 hook：`Notification`（matcher `idle_prompt`）→ `feishu-notify --idle`，以及无 matcher 的 `Stop` → `feishu-notify --done`。保留用户既有 hook；按 command 字符串去重，并额外认"同事件同工具"，避免一个事件发两张卡 | ✅ 会写 |
| `opencode` | `~/.config/opencode/opencode.json` | 往 `plugins` 追加 `opencode-feishu-notify`（默认对象形式 `{"package": …}`，或 `--opencode-form bare`）。带 `--channel <name>` 时条目会写成 `options: { "channel": "<name>" }`，让插件的路由意图明确落地、不被默认值覆盖 | ✅ 包已发布 —— `npm view` 预检通过即可写入（解析不出来仍会拒绝），绝不留下半截配置 |
| `dsh` | `~/.dsh/profiles/*/package.json` | 往 `dependencies` **与** `dsh.profile.bundles` 加这个包 | ✅ 包已发布 —— `npm view` 预检通过即可写入（适配器已发布到 npm；写前用 `npm view` 实测 —— bundle 引用了装不上的包会让 DSH 起不来，比"没装"更糟）。它会打印确切的改动与 `dsh plugin … pnpm install` 命令；`--dsh-dev-dir <path>` 可切到 `link:<绝对路径>` 的联调接线（写本地路径，不走注册表预检） |

以下保证都由 `tests/install.test.mjs` 断言：

- `--dry-run` 零写入，而且它打印的计划就是真跑执行的那份**数据**。
- 每个被改的文件都先留 `<file>.bak.<时间戳>`；结束时打印 `cp -p …` 回滚指令。
- 连跑两次，第二次**没有任何文件变化**（树哈希断言，也不新增备份）。
- 单个目标失败不影响其它目标，失败会带自己的错误与回滚指令。
- 目标文件是符号链接时**一律不写**（写穿会改到 dotfiles 真身，替换链接又会毁掉布局）—— 安装器拒绝，并告诉你它指向哪里。

`--channel <name>` 只有你显式传了才会写进配置：Claude Code 附加到 hook 命令上，opencode 写进
`options.channel`。默认两边都不带 channel，发送端走 `activeChannel`。

### 4. 手动接线

安装器覆盖了上面那些路径；这一节留给它拒绝时你手改，也作为"安装器到底写了什么"的参考。
下面两条路径调的都是**发送端**，webhook 由它自己解析。

**Claude Code** —— `~/.claude/settings.json`，把两条 hooks 合并进去。下面是作者本机上已装的那两条，逐字抄来：

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "idle_prompt",
        "hooks": [{ "type": "command", "command": "~/.local/bin/feishu-notify --idle", "timeout": 10000 }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "~/.local/bin/feishu-notify --done", "timeout": 10000 }]
      }
    ]
  }
}
```

说明：hook handler 走 shell 形式（`sh -c`），所以 `~` 会被展开、`--idle` / `--done` 能拿到 stdin 上的 hook JSON。想把这条目标固定到某个机器人就加 `--channel <name>`（例如 `--channel claude`）；不加则用 `activeChannel`。`timeout` 的数值是从本机可用配置里原样抄来的 —— Claude Code 现行文档把这个字段描述为**秒**，请按你的版本再核对一次。`install` 写的是**裸命令名**而不是 `~/.local/bin/…`，这样 hook 走 `PATH`、也不会因为仓库改名而悬空。

**opencode** —— opencode 会自动加载 `~/.config/opencode/{plugin,plugins}/*.{ts,js}`（本机 runtime 2.0.32 实测），也会读 `opencode.json` 里的 `plugins` 数组。发通知的插件已在 `packages/opencode` 实现（[`opencode-feishu-notify`](../opencode/README.zh-CN.md)），且**已发布到 npm（v0.1.0）**；它做的事就是调用发送端、让 CLI 去解析 channel：

```sh
feishu-notify --channel opencode --source opencode --title "…" --file /tmp/msg.txt
```

`install` 会替你声明它（见[一键接线](#3-一键接线)）：`npm view` 预检通过即写入，解析不出来仍会拒绝。**不要**拷贝作者本机的 `feishu-notify.ts`：那个文件里还带着个人 webhook。见[Roadmap](#roadmap)。

## 配置参考

| 项 | 值 |
|---|---|
| 路径 | `${XDG_CONFIG_HOME:-$HOME/.config}/feishu-notify/config.json` |
| 路径覆盖 | `FEISHU_NOTIFY_CONFIG`（绝对路径，或相对于 `cwd`） |
| 文件权限 | `0600`；目录按 `0700` 创建 |
| 写入方式 | 临时文件 + `rename`（原子）；拒绝覆盖符号链接、目录，以及自己解析不了的配置 |
| 格式 | `version: 1` |

```json
{
  "version": 1,
  "activeChannel": "default",
  "footer": "feishu-notify",
  "channels": {
    "default": { "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/<PLACEHOLDER>", "label": "默认" },
    "opencode": { "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/<PLACEHOLDER>", "label": "opencode" },
    "claude": { "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/<PLACEHOLDER>", "label": "Claude Code" }
  }
}
```

channel 名必须匹配 `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`。`channel remove` 不加 `--force` 时拒绝删除最后一个 channel，也拒绝删除当前 active 的那条。

### `footer`（卡片底部）

`footer` 是可选的顶层字符串 —— 每张卡片底部紧跟时间戳的那段文字。它存在的原因很具体：
当初的私有脚本把公司名硬编码在那里，而公司/个人标识不该被烧进一个对外发布的工具。

| 取值 | 卡片底部显示 |
|---|---|
| （不写） | `feishu-notify · <时间戳>` —— 中性默认 |
| `"你的团队"` | `你的团队 · <时间戳>` |
| `""` | 只显示 `<时间戳>` |

约束：字符串，最多 **40** 字符，**不含换行**；`init --footer <文本>` 对不合规的值直接拒绝
（而且是**在发验证卡片之前**就拒绝）。手改配置写出违规值属于优雅降级：发送端回退到中性默认，
不会因此发不出通知。查看用 `feishu-notify-cli footer` —— footer **不是密钥**，所以明文显示
（这一点与 webhook 相反）。

### 解析优先级

| 顺序 | 来源 | 说明 |
|---|---|---|
| 1 | `--webhook <url>` | 最高；不读任何文件 |
| 2 | `--channel <name>` | 查 `channels[name]`；名字不存在 → `exit 2` 并列出有哪些 |
| 3 | `FEISHU_NOTIFY_WEBHOOK` | 环境变量；优先于配置文件 |
| 4 | 配置里的 `activeChannel` | 常规路径 |
| 5 | 以上全无 | `exit 2`，stderr 含 `请运行：npx feishu-notify-cli init` |

所有来源走同一套校验：只允许 `https`；`*.feishu.cn` / `*.larksuite.com` 域还要求路径形状为 `/open-apis/bot/v2/hook/<token>`，token 至少 8 字符且不能是占位符。`--webhook` 同样被校验，所以打错字会当场失败，而不是"发到某处"。

### 失败行为

| 情形 | 结果 |
|---|---|
| 配置文件不存在 | `exit 2` + "去跑 init" 的引导语 |
| 配置不是合法 JSON | `exit 2`，指出路径，**绝不自动覆盖** |
| `channels` 缺失 / 为空 / 结构不对 | `exit 2` 并给出具体的结构错误 |
| 缺 `activeChannel` | `exit 2` + 怎么设置它 |
| channel 不存在 | `exit 2` + 可用的 channel 列表 |
| 非 https 或形状不对 | `exit 2` + 原因 |
| `footer` 被手改成非法值（超长 / 含换行） | **不致命** —— footer 是装饰性的：`feishu-notify-cli footer` 会 `exit 2` 并说明原因，发送端回退到中性默认。与坏 webhook 不同，它绝不会拦下一张卡片 |

**"绝不回落内置地址"是一条安全属性，不是缺陷。** 一旦回落，用户打错 channel 名就会把自己的通知 —— 连同源路径和消息正文 —— 发到陌生人的机器人上。这里选择的代价是"响亮地报错"。*footer 是刻意的例外*：它既不含密钥也不参与路由，所以它的失败态是"显示中性文字"，而不是"发不出通知"。

## 命令参考

### `feishu-notify-cli`

| 命令 | 用途 |
|---|---|
| `resolve [--channel <n>] [--webhook <u>] [--config <p>] [--json]` | 把解析结果打印到 stdout；`source=… channel=… webhook=<掩码>` 走 stderr，因此发送端可以安全地捕获 stdout |
| `init [--non-interactive] (--webhook <u> \| --webhook-stdin) [--channel <n>] [--label <t>] [--footer <t>] [--config <p>] [--no-verify] [--force]` | 写配置；先发卡验证，卡片失败就**什么都不写** |
| `channel list [--json]` / `add <n> …` / `remove <n> [--force]` / `set-active <n>` | 管理 channel |
| `footer [--config <p>] [--json]` | 把生效的卡片 footer 打印到 stdout（`source=…` 走 stderr）。配置不可用时 `exit 2` —— 发送端据此回退到中性默认 |
| `doctor [--channel <n>] [--json]` | 接线自检（发送端 → 解析器 → Node，含悬空符号链接）+ 逐 channel 实测可达性、指纹、同机器人点名 |
| `install [--dry-run] [--yes] [--target <t>…\|--skip <t>…] [--channel <n>] [--opencode-form <f>] [--dsh-dev-dir <p>] [--no-verify]` | 探测本机已装的 agent 并幂等接线；`--dry-run` 只打印计划、零写入 |
| `help`、`version` | — |

退出码：`0` 成功 · `1` 用法错误或运行期失败（卡片没发出去、channel 已存在…）· `2` 配置问题。`--webhook-stdin` 的存在是为了让从文件读来的地址不出现在 `ps` 输出里；它与 `--webhook` 互斥。

`install` 在以下情况 `exit 1`：有目标失败；该做的全被拒绝；或你用 `--target` 明确点名的目标被跳过/拒绝。

### 接线健康（R11）

hook 实际会走的那条链有三环，而且**每一环坏掉都可能是静默的** —— 报错落在 agent 的 hook 进程里，
不在你的终端上：

```
hook → feishu-notify（发送端）→ feishu-notify-cli（解析器）→ Node ≥ 18
```

`doctor` 按这个顺序走一遍，候选的解析顺序与 `bin/feishu-notify` 完全一致
（`$FEISHU_NOTIFY_CLI` → 发送端同目录 → `$HOME/.local/bin` → `PATH`，然后是 Node 的搜索顺序），
并用 `lstat` 分类：**悬空符号链接**会被报成悬空符号链接，而不是"不存在" —— 这两者的修法完全不同：

```text
  ▸ 接线自检（真实 hook 走的那条链：发送端 → 解析器 → Node ≥ 18）…
    ✓ 发送端        ~/.local/bin/feishu-notify
    ✗ 解析器        <找不到>
        ✗ ~/.local/bin/feishu-notify-cli：悬空符号链接 → ~/project/改名后的仓库/bin/feishu-notify-cli（目标不存在）
    ✓ Node ≥ 18    ~/.nvm/versions/node/v22.23.2/bin/node（v22.23.2）
    修复：
      - ~/.local/bin/feishu-notify-cli 是悬空符号链接（→ …）：rm … 然后 `npm i -g feishu-notify-cli`
      - 发送端找不到解析器 feishu-notify-cli：装一次即可 — `npm i -g feishu-notify-cli`
```

被后面候选兜住的坏候选照样打印：它今天能用，`PATH` 一变就静默失效。`doctor --json` 用 `wiring`
暴露同一份数据；这项检查不会改变退出码，`tests/wiring.test.mjs` 把这条契约锁住了。

### `feishu-notify`（发送端）

| 参数 | 作用 |
|---|---|
| `"文本"`（位置参数） | 消息正文 |
| `-h` / `--help` | 把用法打印到 stdout 后 `exit 0`；不发送任何消息 |
| `--` | 其后所有参数都当作消息正文（发送以 `-` 开头的文本时的转义口） |
| `--title <t>` | 卡片标题（默认 `<来源>通知`） |
| `--file <path>` | 正文从文件读（文件不存在 → `exit 1`） |
| `--text` | 发纯文本而不是卡片 |
| `--hook` / `--idle` / `--done` | hook 模式，从 stdin 读 JSON。`--done` 在没有消息内容时**静默** `exit 0`，且发生在解析配置之前 |
| `--source <s>` | 覆盖自动检测的来源（`终端` / `VS Code 插件端` / `桌面端`） |
| `--webhook <url>` / `--channel <n>` | 转交给解析器（见优先级） |

退出码：`0` 已发送 · `1` 无消息 / 文件缺失 / 飞书返回非 200 · `2` 未知参数，或 webhook 解析不出来/地址非法。未知的 `-flag` **不会**被当作正文发出去。

卡片 payload（取自逐字节黄金样例）：

```json
{
  "msg_type": "interactive",
  "card": {
    "header": { "title": { "tag": "plain_text", "content": "终端通知" }, "template": "blue" },
    "elements": [
      { "tag": "markdown", "content": "…\n—\n**来源**: 终端\n🕐 <TIMESTAMP>" },
      { "tag": "hr" },
      { "tag": "note", "elements": [{ "tag": "plain_text", "content": "feishu-notify · <TIMESTAMP>" }] }
    ]
  }
}
```

note 里的内容是 [`footer`](#footer卡片底部) 配置值（这里取的是中性默认）加上时间戳。设置 footer 时
**只有这一个字符串**会变 —— 黄金样例就是证据：四组卡片样例的 payload 只差 note 内容，把 note 归一化之后
逐字节相同（这条断言落在 `tests/footer.test.mjs`）。webhook **不**在 payload 里（它只是 curl 的目标参数）。

## 各 agent 兼容性

| agent | 接入点 | 实测状态 |
|---|---|---|
| 终端 / 任意脚本 | 直接调用 | ✅ 发送端已实测：5 组逐字节黄金样例、退出码矩阵、解析优先级 |
| Claude Code | `~/.claude/settings.json` 的 hooks（`Notification`/`idle_prompt` → `--idle`，`Stop` → `--done`） | ✅ hooks 条目已装上、配置形状已核对。⚠ **hook 进程自身的 `PATH` 未直接观测** —— 发送端的解析器/解释器发现顺序是靠在测试里清洗 `PATH`（含一个假的 v14 `node`，用于证明它会被跳过）来等价验证的，见 `tests/sender-compat.test.mjs` |
| opencode（v2，runtime 2.0.32） | `~/.config/opencode/plugins/` 下的插件 | ✅ 插件侧端到端实测：通知时机、标题判定、指标行、跨实例去重（细节见下）。✅ 已发布到 npm（v0.1.0），`opencode plugin add opencode-feishu-notify` 可安装 |
| DSH（DeepSeek Harness） | profile bundle | ✅ 适配器已实现并实测：事件映射、审批、**需要你回答（阻塞 waterfall）**、工具失败、channel 路由（纯映射 + fake ctx harness + 真实 spawn 的 stub 可执行文件）。✅ 已发布到 npm（v0.1.0），`dsh plugin --profile <name> pnpm add dsh-feishu-notify` 可安装 |

图例：✅ 已实测 · ⚠ 推断 / 未直接观测 · ✖ 未实现。

## 通知语义（opencode 侧）

这些来自 opencode 适配器**今天的样子**（`~/.config/opencode/plugins/feishu-notify.ts`），不是本 CLI 的行为。写在这里是因为它们决定了用户最终收到什么 —— CLI 只负责渲染别人给它的标题与正文。

| 事件 | 卡片 | 状态 |
|---|---|---|
| `permission.asked` | 🔔 需要你决定（+ 动作、最多 8 项资源、说明） | ⚠ **从未观测到它到达** —— 结构上应当可达（与 `form.*` 同类 ephemeral 事件），但至今没收到过这张卡 |
| `form.created` | ❓ 需要你回答（+ 表单标题、最多 6 个字段及选项） | ✅ 已实测 |
| `session.execution.succeeded` | ✅ 任务完成；正文读起来像提问时改为 ❓ 等你决定 | ✅ 已实测 |
| `session.execution.failed` | ❌ 任务失败（+ 错误类型/信息） | ✅ 已实测 |
| `session.execution.interrupted` | ⏸ 任务已中断（+ 原因） | ✅ 已实测 |
| `session.text.ended` | — 只累积 AI 最终文本 | ✅ 已实测 |
| `session.idle` | 静默兜底：万一某版本不再派发 `execution.*` 才接手；runtime 2.0.32 从不派发 | ✅ 已实测 |

**标题。**`<前缀> · <会话标题，截断到 40 字符>`。前缀默认 `✅ 任务完成`；当最终文本最后 240 字符命中 11 条强信号提问模式（末尾 `?`/`？`、`是否`、`要不要`、`需要你`、`请你(确认|决定|选择|授权|批准)`、`请确认`、`你(来)?(确认|决定|选择)`、`(可以|好|行|对)吗`、句末 `吗`、`(有没有|有)(问题|异议|意见)吗`、`要我(继续|接着)?(做|执行|创建|改|删)`）时，前缀改为 `❓ 等你决定`。这份清单刻意收窄：把正常的收尾总结误标成"等你决定"，比漏判更让人困惑。

之所以需要这条启发式：**文字提问不产生任何事件**。一轮以"是否可以执行 X？"结尾的回合，只会派发 `execution.succeeded` 加最终文本。

**指标行**（卡片正文里第二块），某一轮实测：

```
**🤖 deepseek-v4-flash**
输出 1.3k tok · 耗时 1m12s（生成 45s）· ≈29 tok/s（生成期）
```

| 字段 | 口径来源 |
|---|---|
| 模型 | `ctx.session.get({ sessionID }).model` —— id，带 `variant` 时一并显示 |
| 输出 tokens | 会话累计 `tokens.output` 在本轮内的**差值**（该值单调递增；实测 10095 → 10233 → 10692） |
| 耗时 | 从 `session.execution.started` 起的墙钟时间 |
| 生成耗时 | 各 `session.step.started` → `session.step.ended` 窗口累加，因此排除了工具等待；只在它比总耗时小 1s 以上时才显示 |
| TPS | 输出 tokens ÷ 生成耗时。若回合基线是插件热重载后接回来的，生成耗时可重建不了，该行会改标 `（平均，含工具等待）` |

token 数字做过**三方对账** —— 累计差值 / 每步累加 / 逐条消息求和 —— 三者精确一致（那次对账是 1270 tokens）。

**跨实例去重。**opencode 会给每个客户端加载一次插件；实测同一条 `session.execution.succeeded` 在 **5 毫秒内被投递了 5 次**（08:22:59.614 → .619），对应 5 个插件实例。因此发卡前要走**文件级原子抢占**（`~/.local/share/opencode/feishu-claims` 下 `open(…, 'wx')`），内存判断只当廉价的短路 —— **5 个实例，只出一条**。

| 常量 | 值 |
|---|---|
| `DONE_DEDUPE_MS`（succeeded / failed / interrupted / idle 共用一把键） | 8000 |
| `PERMISSION_DEDUPE_MS`（permission / form） | 10000 |
| `TITLE_TTL_MS` / `TURN_TTL_MS` | 5 分钟 / 6 小时 |
| `MSG_MAX_LEN` / `TITLE_MAX` | 2000 / 40 |

## 安全

- **代码里不带地址。** 在整个仓库里搜 hook 标记，只能搜到形状校验和占位符；发送端 `WEBHOOK_URL` 的默认值是被**删除**的，不是内联的。
- **只允许 https。** `http://` 会被拒绝 —— 那等于把密钥明文放到链路上。
- **处处掩码。** `resolve`、`channel list --json`、`doctor` 以及错误信息打印的都是 `https://<host>/…/<REDACTED>`；明文只存在于 `0600` 的配置文件和 curl 的参数里。
- **`npm test` 里的密钥闸门**（`lib/secret-scan.mjs`、`tests/secret-scan.test.mjs`）。以下两处出现"像真 token"的 hook 地址就让测试失败：
  1. **整个仓库的 git 索引** —— 它会一路上溯到 git 仓库根，因此本包之外的文件（单仓根目录、另两个适配器 workspace）也在范围内；再加上未被忽略的新文件；
  2. 本包 `npm pack --dry-run --json` 会发布的全部内容。

  判定标准是"`<标记><token>` 且 token 不在占位符/样例白名单内"（白名单：`xxx`、`PLACEHOLDER`、`REDACTED`、`your-webhook`、`<…>`、`test-*`、`example-*`、`fake-*`、`dummy-*`、`sample-*`）。此外还会与作者本机四个 live 文件（`~/.local/bin/feishu-notify`、`~/.config/feishu-notify/config.json`、`~/.config/opencode/plugins/feishu-notify.ts`、`~/.claude/settings.json`）做**指纹交叉比对**：提取出的 token **只留在内存**，不打印、不落盘，一旦出现在仓库里即失败。又因为"永远不会失败的校验器等于没校验"，套件里还有一条**故意注入**的自证测试：塞进一个真实形状的 token，闸门必须拦住它。

  自己复核：

  ```sh
  npm run secret-scan                  # 可读报告，命中则非零退出（在 packages/cli 或仓库根都行）
  node lib/secret-scan.mjs --json
  node lib/secret-scan.mjs --no-pack   # 跳过 npm pack 那一半
  node lib/secret-scan.mjs --root <dir>
  ```

## 开发

```sh
npm test                 # 在 packages/cli 下；仓库根会转发同一套
npm run fixtures         # 重新捕获黄金样例并与已提交的逐字节比对
npm run fixtures:update  # 用新捕获覆盖 tests/fixtures/*
```

| 套件 | 覆盖 |
|---|---|
| `tests/config-resolution.test.mjs` | 优先级矩阵、各失败分支、`0600`/`0700`/原子写、掩码、隔离守卫 |
| `tests/sender-compat.test.mjs` | bash 侧的优先级与退出码矩阵、解析器发现顺序、Node 解释器选择、payload 与 webhook 来源无关 |
| `tests/fixtures.test.mjs` | 黄金样例可逐字节重现；其 note 带中性默认 footer |
| `tests/footer.test.mjs` | footer 的校验/解析/CLI、`init --footer`、`channel`/`doctor` 展示、**自检卡片带当前 footer**，以及"只有 note 会变"的外科手术式属性 |
| `tests/install.test.mjs` | 模拟 `HOME` 下三个安装目标的端到端：探测、合并、去重、拒绝分支、opencode 两种写法、`--dry-run` 零写入、树哈希幂等、单目标失败隔离、回滚指令、退出码 |
| `tests/init.test.mjs` | `init`、`channel`、`doctor`、`lib/sender.mjs`、隔离守卫 |
| `tests/wiring.test.mjs` | `classify()`（含**悬空符号链接**）、`checkWiring()` 的四个场景、`doctor` 的接线输出与退出码契约 |
| `tests/timeout.test.mjs` | `FEISHU_NOTIFY_TIMEOUT_MS` 的默认值与钳制，以及发送超时分支的端到端（替身 curl 睡 300ms × 超时 50ms）—— 唯一的墙钟依赖，用确定性手法钉死 |
| `tests/secret-scan.test.mjs` | token 识别、全仓库扫描、注入自证、live 指纹交叉 |
| `tests/live.test.mjs` | 真实网络往返 —— 未设 `FEISHU_NOTIFY_LIVE=1` 时跳过 |

`tests/fixtures/` 存的是**改造前**发送端的 payload 基线（stub `curl`，五组输入：`--idle`、`--done`、`--title X --file`、`--text`、裸文本）。改配置解析时它们必须逐字节一致（时间戳归一化后），这也是它们留在仓库里的原因：它们是"发送端没变"的定义。此后**唯一**有意的改动就是卡片 footer（R9）：note 从作者硬编码的 `Smarterlab ·` 变成中性默认，同时 harness 把 `footer` 钉死在这个中性值上，捕获结果因此不会随开发机漂移。只有确实要改这个行为时才用 `npm run fixtures:update` 重新捕获。

环境变量：`FEISHU_NOTIFY_LIVE=1`（开启 live 套件）、`FEISHU_NOTIFY_CURL`（curl 路径）、`FEISHU_NOTIFY_CONFIG`（配置路径）、`FEISHU_NOTIFY_CLI` / `FEISHU_NOTIFY_NODE`（发送端用的解析器与解释器）、`FEISHU_NOTIFY_NPM`（`install` 预检用的 npm 可执行文件；测试指向替身）、`FEISHU_NOTIFY_TIMEOUT_MS`（发测试卡片那个 curl 子进程的超时：默认 `15000`，钳在 `10`–`600000`，解析不出来就回退默认）。

`FEISHU_NOTIFY_TIMEOUT_MS` 主要是给测试用的：不然"发一张卡片再断言退出码"的用例，实际是在断言"这台机器 15s 内跑得完一次 curl"。默认值与任何发送语义都没变。

### 回滚

CLI 除了配置文件之外不留状态。

```sh
rm ~/.config/feishu-notify/config.json      # 回到"exit 2 + 去跑 init"；通知会停，但停得响亮
cp -p ~/.local/bin/feishu-notify.pre-config.bak ~/.local/bin/feishu-notify   # 恢复改造前的发送端
shasum -a 256 ~/.local/bin/feishu-notify    # 期望 0b788cf3…c52f1ebde（那份里还是旧的内置地址）
```

仓库里的 `bin/feishu-notify.orig` 是**脱敏**基线：只能用来 diff，不能用来回滚。

`install` 会为自己碰过的每个文件打印回滚指令（一行 `cp -p <file>.bak.<时间戳> <file>`）。每个目标都只往它列出的文件里**追加**内容，所以恢复备份同时也撤掉了后续运行加进去的东西。

## Roadmap

| 项 | 状态 |
|---|---|
| `install` → `claude-code` | ✅ 会写（合并两组 hook、按 command 去重、保留用户既有 hook） |
| `install` → `opencode` | ✅ 会写 —— 包已发布，`npm view` 预检通过；仅当名字解析不出来时才拒绝；`--no-verify` 可强制 |
| `install` → `dsh` | ✅ 会写 —— 包已发布，`npm view` 预检通过；仅当名字解析不出来时才拒绝；`--dsh-dev-dir` 打开 `link:<绝对路径>` 的联调接线（不走注册表预检），`--no-verify` 可强制 |
| `install` 代跑包管理器 | 刻意不做（见"它不做什么"）；只把确切的 `dsh plugin … pnpm install` 命令打印出来 |
| `opencode-feishu-notify`（[`packages/opencode`](../opencode)） | ✅ **已发布到 npm（v0.1.0）**。插件行为、channel 降级、发送端解析均已实测 |
| opencode 插件**声明语法** | ✅ **已实测**（2.0.32 的编译产物）：`plugins` 类型是 `Array<string \| {package, options}>`，两种写法归一化成同一个 target；裸字符串以 `-` 开头表示**移除**；非绝对路径的 target 由 opencode 自己的包管理器安装/解析，失败只会把插件标记为 failed，**不会**让 opencode 起不来。**尚未**实测的是注册表往返 —— 包现已发布，可以端到端验证 |
| `dsh-feishu-notify`（[`packages/dsh`](../dsh)） | ✅ **已发布到 npm（v0.1.0）**。事件映射、**需要你回答的阻塞 waterfall**、工具失败与 channel 路由均已实测 |
| Windows | 不在范围：发送端是 bash。移植需要照 Node CLI 的做法补一套黄金样例 |
| 发布到 npm（三个包） | 已完成 —— 三个包均已发布到 npm（v0.1.0） |
| `permission.asked` 这条通知时机 | 至今仍未观测到它到达 |

## 许可证

MIT。
