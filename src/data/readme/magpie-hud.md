<p align="center"><img src="logo.svg" width="128" alt="鹊巢 logo"/></p>

<h1 align="center">鹊巢 · magpie-plugin-pack</h1>

<p align="center">两个插件：27 家网页版 AI 渠道（magpie-nest）+ 本机 AI coding agent 的桌面 HUD（magpie-hud）</p>

<p align="center"><a href="https://github.com/hongmaple0820/magpie-plugin-pack/actions/workflows/test.yml"><img src="https://github.com/hongmaple0820/magpie-plugin-pack/actions/workflows/test.yml/badge.svg" alt="tests"/></a></p>

本仓库（magpie-plugin-pack）发布**两个互相独立的插件**，都在 `plugins/` 下、都是标准的 OpenCode v1 插件包，可以只装一个：

| 插件 | 是什么 | 安装 |
| --- | --- | --- |
| **`magpie-nest`** | 一个合订包，27 家网页版 AI 渠道（`config` / `auth` / `provider`）；入口导出 27 个插件函数，宿主把每个函数当独立插件运行——**一次安装，27 个渠道各自登录、互不影响** | `magpie plugin add <仓库>/plugins/magpie-nest` |
| **`magpie-hud`** | 本机 AI coding agent 的桌面 HUD：一个插件两半——**面板**（会话、厂商额度、用量花费、消息投递链）+ **五个 MCP 工具**（`list_sessions` / `send_message` / `start_session` / `get_message` / `list_quotas`）；Windows 上装好即拉起常驻桌面窗口 | `magpie plugin add <仓库>/plugins/magpie-hud` |

多账号、故障切换、额度展示、自动更新都由 magpie 负责。

> English: see [README.en.md](./README.en.md)。

## 包含的插件

### magpie-nest：27 家网页版 AI 渠道

全部位于 [plugins/magpie-nest](./plugins/magpie-nest)。渠道代码在 `lib/<id>/`，协议细节与登录字段见各 `lib/<id>/README.md`。

| 供应商 id | 渠道 | 登录方式 |
| --- | --- | --- |
| `inkstone` | 书生·端砚（Discovery）云端模型：Orbit Agent + TokenPlan API 双通道、墨点用量 | Windows 本机端砚客户端一键导入（无需浏览器、无需任何输入），或网页 SSO |
| `lobsterai` | 有道 LobsterAI：18 个模型（DeepSeek V4 / Kimi K2.x / Qwen3.x / MiniMax M3 / Doubao Seed 2.x / GLM-5.x）、SSE-only 端点聚合、每日签到带积分 | 浏览器登录 + 粘贴回跳地址（可选手动粘 token） |
| `zai-web` | Z.ai 网页版：GLM-5.3 / 5.2 / 5.1 / 5，OpenAI 兼容端点直通 | 粘贴网页令牌（eyJ…） |
| `opencode-free` | OpenCode 免密免费通道：9 个匿名池模型，无需账号与密钥 | 一键启用（无输入） |
| `glm` | 智谱清言网页版：GLM-5.3 / 5.2 / 5，签名请求 + 累积式分片流 | 粘贴 `chatglm_refresh_token` |
| `qwen-ai` | Qwen AI 网页版（chat.qwen.ai）：10 个模型，先建会话再发消息的协议 | 粘贴网页令牌 |
| `perplexity` | Perplexity 网页版：11 个模型（auto/sonar/pplx_pro/GPT-5.4/Claude/Gemini/Grok），SSE 差分补丁流 | 粘贴会话 Cookie |
| `kimi-web` | Kimi 网页版：K3 / K2.7-Code / K2.6 / K2.5，gRPC-Web 帧封装 | 粘贴访问令牌 |
| `qwen-web` | 通义千问网页版：9 个 Qwen3 模型，SSE 回合与思考分片 | 粘贴 `tongyi_sso_ticket` |
| `doubao` | 豆包网页版：samantha 补全流与编号事件协议 | 粘贴 `sessionid` |
| `loomy` | 讯飞 Loomy：8 个模型，OpenAI 兼容直通，模型名带计费倍率 | 粘贴会话令牌 |
| `gemini-code-assist` | Gemini Code Assist：v1internal 信封 + antigravity 客户端身份，4 个 tier | 粘贴整份 Google 凭据 JSON |
| `raccoon` | 商汤 Raccoon Work：6 个模型，OpenAI 兼容 + 组织码 | 粘贴网页访问令牌 |
| `agnes` | Agnes AI 文本模型（图像/视频未实现） | 粘贴 API Key |
| `deepseek-web` | DeepSeek 网页版：sha3 PoW（wasm 随包）+ 每轮会话 + 补丁流投影 | 粘贴 token 或凭据 JSON |
| `chatgpt-web` | ChatGPT 网页版（**实验性**）：sentinel 握手 + 本地 PoW/turnstile + 补丁流；可能被 TLS 指纹拦截 | 粘贴 access token 或凭据 JSON |
| `qoder` | 阿里 Qoder **国际版**（qoder.com）：17 个模型，COSY 加密信封 | 设备码 OAuth，或粘贴 PAT |
| `qoder-cn` | 阿里 Qoder **中国版**（qoder.cn）：11 个模型，模型 key 与国际版不同（`qmodel_*` 族） | 设备码 OAuth，或粘贴 PAT |
| `trae-global` | 字节 TRAE **国际版**（trae.ai）：账号目录实测 67 个模型，SOLO 协议 | 粘贴 IDE 令牌 + UID / 设备标识 |
| `trae-cn` | 字节 TRAE **中国版**（trae.cn）：账号目录实测 88 个模型 | 粘贴 IDE 令牌 + UID / 设备标识 |
| `workbuddy-ai` | 腾讯 WorkBuddy **国际版**（workbuddy.ai）：21 个模型，OpenAI 兼容 + UA 分档 | OAuth 一键登录，或粘贴访问令牌 |
| `workbuddy` | 腾讯 WorkBuddy **中国版**（workbuddy.cn，走 copilot.tencent.com）：17 个模型 | OAuth 一键登录，或粘贴访问令牌 |
| `codebuddy` | 腾讯 CodeBuddy **中国版**（copilot.tencent.com）：与中国版 WorkBuddy 同协议不同产品 | OAuth 一键登录，或粘贴访问令牌 |
| `autoclaw` | 智谱 AutoClaw **国际版**（autoglm.ai）：4 个模型，官方客户端指纹头 | OAuth 一键登录（含滑块引导），或粘贴令牌 |
| `autoclaw-cn` | 智谱 AutoClaw **国内版**（zhipuai.cn）：4 个模型 | 手机验证码登录，或粘贴令牌 |
| `cline` | Cline：OpenAI 兼容端点，模型目录动态取远端（免费 / 推荐 / Cline Pass 三段，实测免费 3 条） | 浏览器设备码 OAuth（推荐），或粘贴 `workos:` 令牌 |
| `minimax` | MiniMax Code（中国版）：Anthropic Messages 端点，实测 4 个模型（M3.1-Flash / M3 / M2.7-highspeed / M2.7） | 设备码 OAuth（唯一方式） |

> **国内外双版本都收**：Qwen（`qwen-ai` / `qwen-web`）、智谱（`zai-web` / `glm`）、Qoder、TRAE、腾讯 WorkBuddy、智谱 AutoClaw 各有中国版与国际版，两版是厂商侧**互不通用的账号体系**，所以各占一个 provider id，各自登录、各自计费。
>
> ⚠️ 这些渠道全部是**逆向网页协议**，非官方 API：上游改版随时可能失效；账号有限流/封禁风险，勿用主力号。与既有社区插件同 id 时（`inkstone`/`deepseek-web`/`chatgpt-web`/`qoder`/`qoder-cn`/`trae-cn`/`trae-global`/`workbuddy`/`workbuddy-ai`/`autoclaw`/`autoclaw-cn`），用 `magpie plugin use` 指定归属，本包不抢已登录的账号：`magpie plugin use <插件> <provider id>`。

## 安装

```powershell
git clone https://github.com/hongmaple0820/magpie-plugin-pack.git
magpie plugin add "F:\路径\magpie-plugin-pack\plugins\magpie-nest"   # 27 渠道合订
magpie plugin add "F:\路径\magpie-plugin-pack\plugins\magpie-hud"    # 桌面 HUD + 5 个 MCP 工具
```

- 或在 magpie 应用里：插件 → 添加插件 → 填上面的文件夹路径。两个各装各的，装一个不影响另一个。
- 仓库根的 `install.ps1` / `install.sh` 一条命令把 `plugins/` 下两个插件都加进去（重复执行安全）。

装好后在「插件 → 已安装」里打开需要的渠道、登录即可；不登录的渠道完全不影响其他渠道。

## 登录

以 inkstone 为例：

```powershell
magpie plugin login inkstone     # 选「从本机端砚客户端导入登录态」（Windows，无需浏览器、无需输入）
magpie provider test inkstone    # 每种 API 发一个很小的请求
magpie quota                     # 看墨点余额与 5h/7d 窗口
magpie plugin                    # 看插件 / 账号 / 模型列表
```

### 浏览器一键登录（无需复制粘贴）

8 个网页会话渠道支持**弹出浏览器自动抓取令牌**：插件会拉起你本机的 Chrome/Edge（独立配置目录，按渠道分开，所以登录一次会记住会话），你在窗口里正常登录（扫码 / 账号密码 / 手机验证码都行），插件通过 DevTools 协议盯着该渠道的 cookie / localStorage / 请求头，拿到令牌就自动关窗、完成登录。全程不复制粘贴任何东西。

覆盖：`zai-web`、`glm`、`qwen-web`、`qwen-ai`、`kimi-web`、`doubao`、`perplexity`、`raccoon`。每个渠道的「一键登录」都是登录方式里的**第一项**（GUI 默认选中），原来的粘贴方式依然保留作后备。

已验证（2026-11-10，真实账号逐条跑通）：

| 渠道 | 抓到的令牌 | 用时 |
| --- | --- | --- |
| `zai-web` | localStorage token | 3 秒 |
| `kimi-web` | localStorage `access_token` | 3 秒（令牌直接对话成功） |
| `glm` | cookie `chatglm_refresh_token` | 5 秒 |
| `qwen-web` | cookie（实测得出，旧的 `tongyi_sso_ticket` 已失效） | 5 秒 |
| `qwen-ai` | localStorage `qwen_access_token_state` + 整套 cookie | 5 秒 |
| `raccoon` | cookie `xhx_token` + 整套 cookie | 4 秒（对话 200） |
| `doubao` | cookie 集 + 指纹 query | 见下方说明 |
| `perplexity` | cookie `next-auth.session-token` | 待验证 |

> 每个渠道的令牌位置都不一样，规则全部是实测出来的，不是照搬。豆包另有风控（见下条）。

- 零依赖：WebSocket 客户端、CDP 会话、浏览器启动都是手写的（`lib/weblogin/`）。
- 4 分钟超时；失败时回退到粘贴令牌。
- 配置目录在 `%LOCALAPPDATA%\magpie-nest-weblogin\<渠道>\`；换账号时删掉对应目录即可。
- 找不到浏览器时可用 `MAGPIE_NEST_BROWSER` 指定可执行文件路径。

**豆包的风控**：豆包的对话请求除了 cookie 与指纹，还会按「是不是真浏览器发的」做判定（返回 `710022004 rate limited`，subtype `slide` 或 `semantic_reasoning`）。插件因此把对话请求放进真实页面里发（`lib/weblogin/pagefetch.mjs`），需要保持浏览器可用。该机制下非流式对话可正常返回，但**连续自动化调用可能让账号进入风控冷却**，需要等较长时间恢复。日常使用不受影响；若提示 rate limited，先停用一段时间。

其它渠道见 `plugins/magpie-nest/lib/<id>/README.md`。

## magpie-hud：本机 AI coding agent 的桌面 HUD

一个插件两半，数据引擎（会话扫描 / journal / 额度读取）共用：

- **面板半**（给人看）：每客户端一张额度环卡（最满窗口百分比 + 每窗口进度/重置倒计时 + 24h 走势 + 烧录率）、24h/7d/30d 用量（输入/输出/token/花费，按 provider 明细），**对不上价的请求单列 `unpriced`，不假装完整**；会话列表（客户端色标 + 状态 pill，默认只列**已装**的 agent）；消息投递与 15 秒提醒卡。插件的「页面」与 magpie 的「面板」两个呈现位都能用。
- **工具半**（给 agent）：五个 MCP 工具对所有能接 MCP 的 agent 可用——`list_sessions` / `send_message` / `start_session` / `get_message` / `list_quotas`。
- **桌面 HUD**（Windows）：装插件即自动拉起一个常驻桌面的原生窗口。默认 **Rust + WebView2 壳 + 真页面**（`desktop-rust/`，界面和面板共用同一套 token，一条 52px 状态栏，双击展开：在跑会话、待批审批的批准/拒绝、汇总）；**Go + Win32 GDI 手绘版**（`desktop-native/`）作兜底，不依赖 WebView2；两种都缺则静默跳过，页面功能不受影响。
- 能**替你答**：审批与提问是 agent 客户端进程内存里的事，插件带一小段装进 DSH 的通道插件（设置页「回话通道」一行点「装到 DSH」，重启 DSH 生效），把 approval / user-question 抢过来，等你从面板侧作答。
- 自述**平台边界**：Windows 全功能；macOS / Linux 的桌面窗口还没做（占位退出，插件自动跳过），页面与 MCP 工具照常可用。详见 [plugins/magpie-hud/README.md](./plugins/magpie-hud/README.md)。

## 更新

未发布 npm 前，更新 = `git pull` 拉最新代码：

```powershell
cd magpie-plugin-pack
git pull
```

- 终端 CLI：什么都不用做，每条命令按文件夹当前内容加载。
- magpie 应用（GUI）：到「插件 → 已安装」把每个插件**关掉再打开**，或重启 magpie。

## 测试

仓库根一条命令跑完两个插件的全部测试（跨平台，Windows 也能跑）：

```bash
npm test
# 等价于 node scripts/test-all.mjs —— 遍历 plugins/*/package.json 跑包内 npm test
```

各包的装载回归都在 `test/pack-install.test.mjs`：`magpie-nest` 入口恰好导出 27 个插件函数、`magpie-hud` 入口只导出一个插件函数，`files` 白名单复制后整包可装载（含 deepseek 的 wasm 资产、hud 的前端与发布 exe）。

GitHub Actions（[.github/workflows/test.yml](./.github/workflows/test.yml)）在每次 push / PR 自动在 **ubuntu + windows** 双平台跑全部测试。`magpie-hud` 声明了运行时依赖（fzstd，解 DSH 的 `.jsonl.zstd` 转录），CI 先 `npm ci` 再跑测试；`magpie-nest` 仍零依赖。

## 目录结构

```
magpie-plugin-pack/
├── README.md / README.en.md      # 中英说明（本文件）
├── LICENSE                       # MIT
├── install.ps1 / install.sh      # 一键安装（遍历 plugins/*，两个都装）
├── scripts/test-all.mjs          # 跑全部测试
├── .github/workflows/test.yml    # CI：push/PR 双平台测试
└── plugins/
    ├── magpie-nest/     # 27 渠道合订
    │   ├── index.mjs             # 只导出 27 个插件函数（宿主各跑各的）
    │   ├── lib/<id>/             # 各渠道协议实现 + README（inkstone 在 lib/inkstone/）
    │   ├── assets/               # deepseek-web 的 sha3 wasm
    │   ├── test/                 # 单测
    │   └── package.json          # 零依赖
    └── magpie-hud/      # 桌面 HUD：面板 + 5 个 MCP 工具
        ├── index.mjs             # 只导出一个插件函数（见 test/entry.test.mjs 守卫）
        ├── lib/                  # 数据引擎（会话/journal/额度）+ pageservice + 5 工具
        ├── page/ webapp/         # 面板页与静态资源（零依赖、零构建）
        ├── desktop-rust/         # Windows 原生窗口壳（Rust + WebView2，默认）
        ├── desktop-native/       # Windows 兜底壳（Go + Win32 GDI，不依赖 WebView2）
        ├── test/                 # 单测
        └── package.json          # 运行时依赖 fzstd（解 DSH 转录的 zstd）
```

约定：

- **入口模块只导出插件函数**：宿主会把入口里每个导出函数都当插件执行，多导出一个辅助函数就会在加载时崩溃。辅助代码一律放 `lib/`。
- `magpie-nest` 渠道之间零共享状态，新增渠道 = `lib/` 下新目录 + 入口加一行 export + 一份测试。
- 两个插件**互不依赖**：各自有 package.json，可单独安装、单独发布、单独停用；`magpie-hud` 的依赖只有 fzstd，且动态导入降级，缺包时面板明示「引擎不可用」而工具半照常工作。
- 旧的单插件形态已并入 `magpie-nest`（git 历史里仍可查）。

## 发布（后续推 npm）

两个包各自发布：

```bash
cd plugins/magpie-nest
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm pack --dry-run
npm publish --tag beta
```

发布后用户直接：

```
magpie plugin add magpie-nest
```

想进 magpie 社区推荐列表，给 `magpie-community/plugins` 的 `registry.json` 提 PR（详见 magpie 文档「发布与上架」）。

## License
