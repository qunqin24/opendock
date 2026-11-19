# fish-pet 🐟

**中文** | [English](#english)

## 中文

OpenCode V2 桌面宠物插件：一条跟随会话状态的大肥鱼（吃白饭、碎碎念、看你干活、庆祝/沮丧），窗口内渲染，移植自 DSH 的 dsh-pet（大肥鱼）。双半架构：server 是脑，窗口只做展示。

### 安装

```bash
opencode plugin add opencode-fish-pet
```

或 opencode.json：

```jsonc
"plugins": [
  "opencode-fish-pet",
  // 可选：余额六档（server 侧每 30 分钟自查一次；DeepSeek 官方 + custom 中转）
  // DeepSeek 凭据顺序：显式 options.balance.deepseek.apiKey（override，直连官方）
  //   → 凭据库里 deepseek 的活跃 API key 连接 → providers.deepseek.settings.apiKey
  // provider 指向自定义 baseURL（中转）时自动来源不启用——中转 key 不发往官方端点，需显式配置或 custom
  { "package": "opencode-fish-pet", "options": { "balance": {
      "deepseek": { "apiKey": "sk-…", "total": 50 },
      "custom": [ { "name": "中转站", "url": "https://…/balance", "headers": { "Authorization": "Bearer …" }, "path": "data.remaining", "total": 100 } ]
  } } },
  // 可选：桌面端把鱼放到 OpenCode 窗口外（原生透明小窗覆盖桌面；Web/未开启/失败时回到窗口内）
  // overlayDebug 只写本地排障证据（/tmp/opencode/fish-pet-overlay-mvp/），平时不开
  { "package": "opencode-fish-pet", "options": { "overlay": true } }
]
```

注意：
- 需要 OpenCode ≥ 2.0；GUI 插件通道为 experimental，宿主大版本升级后可能要求更新本插件
- 桌面/Web 窗口可见；TUI 端无鱼（GUI 插件不进终端，属预期）
- 鱼的碎碎念/对话会创建一个普通 OpenCode 会话（标题 🐟 fish-pet 对话），走你自己配置的模型计费
- 余额在 server 侧查询：显式 `options.balance` 是 override；未配置时自动复用 OpenCode 的 deepseek 凭据/配置（官方 baseURL 才启用），key 不进日志或存储
- 右键鱼有完整菜单：睡觉、多开、开聊、待办（含列表/清空）、余额、碎碎念、起名、重置鱼脑、通知开关、碎碎念总开关、大小/归位、语言等
- **通知/碎碎念/大小为跨端共享偏好**：保存在 server（任一端修改全端生效）；首次升级时各端只把与默认值不同的本地设置上推一次（多端并存且都有自定义值时后写者胜出）
- 桌面端 `Settings → Extensions → Plugins` 可关
- **桌外 overlay（实验）**：`options.overlay: true` 后桌面端鱼改为窗口外的原生透明小窗（单屏、单鱼；窗口内鱼自动隐藏，Fish 面板/通知/余额照常）。窗口由窗口管理器摆放：平铺合成器会把它当浮动窗（Sway 直接拖，或 $mod+左键拖动）；Wayland 下插件不自作 setPosition。小窗整体可点。overlay 右键菜单与窗口版对齐：睡觉/起来（睡眠态经 presence 上报 server，Web 心跳抢不走；睡着说梦话）、换个动作、开聊（打开 OpenCode 窗口的 Fish 面板）、记一笔待办/待办列表/清空、碎碎念一句、查余额、起名、重置鱼脑、完成通知开关、碎碎念总开关、大一点/小一点（舞台封顶 320px）、语言；无事件时自主随机动作（完整 109 段素材按需预热推送，未命中先请求后重试）。面板聊天期间 overlay 有 thinking/完成反馈。Web 与失败场景自动回退窗口内鱼。**未实现**（overlay 侧后续阶段，窗口版已有）：拖拽甩出/弹弓/重力、多鱼碰撞、回原位、多显示器

### 行为速览

- **109 段动画**：五分类随机池（小动作 / 玩耍 / 吃什么 / 时节 / 文字），点击 5 种回应，拖拽/抛掷/双击弹弓，多开互撞
- **工作状态机**：聚合所有运行中会话（thinking/working/result/waiting），最近 90s 工具调用折叠成一句话随气泡显示（如「干活中 · 跑命令×3」）
- **完成庆祝**：前台会话收官全量庆祝，后台完成冒气泡不抢动画；子代理完成静默
- **碎碎念**：每 5 分钟随口一句（10 分钟无观众则沉默；右键可总开关），带时间背景——它知道今天星期几、快到什么节日、外面天气如何；睡觉时说梦话
- **待办**：`@2026-11-20 15:00` / `@18:30` / `@2h` 截尾定截止，越近提醒越密
- **多开**：鱼 0 演聚合状态，其余各绑一个运行中会话
- **面板聊天**：Fish 标签页直接对话，发送即有"正在琢磨"反馈、逐字流式回复；可给鱼起名字（面板标题随之变化）
- **语言**：右键菜单 → 语言 直选（English / 中文 / 日本語；默认 English），UI、鱼的台词与提示词全链路切换；选择保存到 server 并同步所有端（Web/桌面窗口与桌外 overlay，overlay 右键也有语言入口），重载后保持

### 包结构

| 文件 | 角色 |
|---|---|
| `index.ts` | server 脑（入口 `.`） |
| `rpc.ts` | server ↔ 窗口的 JSON-Schema 契约（入口 `./rpc`） |
| `gui-experimental.cjs` | 前端渲染器 bundle（入口 `./gui-experimental`，CJS，~28MB 含内嵌资产） |

源码、资产管线与开发循环见仓库：<https://github.com/heimoshuiyu/fish-pet>（`DEVELOPMENT.md`）。

### 致谢与素材条款

- 社区作品，与 OpenCode / DeepSeek Harness 无关联
- 动画链/物理等部分代码与全部动画、音效源自 dsh-pet（PC2005-cloud）：代码 MIT（LICENSE 内已保留其版权行）；**素材禁止商用**，公开渠道分发须署名 https://github.com/PC2005-cloud/dsh-pet —— 本包据此标注 `SEE LICENSE IN LICENSE`（代码 MIT + 素材条款，详见 LICENSE）

---

## English

An OpenCode V2 desktop pet plugin: a chubby freeloader fish that follows your coding sessions (munching, muttering, watching you work, celebrating/moping). Rendered in-window; ported from dsh-pet (DSH). Two halves: the server is the brain, windows only present.

### Install

```bash
opencode plugin add opencode-fish-pet
```

or in opencode.json:

```jsonc
"plugins": [
  "opencode-fish-pet",
  // optional: six-tier balance meter (server-side, self-checked every 30 min; DeepSeek official + custom relays)
  // DeepSeek credential order: explicit options.balance.deepseek.apiKey (override, hits the official endpoint)
  //   → your active deepseek API-key connection in OpenCode → providers.deepseek.settings.apiKey
  // auto sources are disabled when the provider points at a custom baseURL (relay) — a relay key never goes
  // to the official endpoint; configure balance explicitly or use a custom entry instead
  { "package": "opencode-fish-pet", "options": { "balance": {
      "deepseek": { "apiKey": "sk-…", "total": 50 },
      "custom": [ { "name": "relay", "url": "https://…/balance", "headers": { "Authorization": "Bearer …" }, "path": "data.remaining", "total": 100 } ]
  } } }
]
```

Notes:
- Requires OpenCode ≥ 2.0; the GUI plugin channel is experimental — major host upgrades may require updating this plugin
- Visible in desktop/web windows; no fish in the TUI (GUI plugins don't run in the terminal, by design)
- The fish's muttering/chat creates a normal OpenCode session (titled 🐟 fish-pet chat) billed to your own model
- Balances are queried server-side: explicit `options.balance` is an override; without it the fish reuses
  OpenCode's own deepseek credential/config (only with the official baseURL), and keys never reach logs or storage
- Right-click the fish for the full menu: sleep, more fish, chat, to-dos (with list/clear), balance, murmur, naming, brain reset, notification toggle, mutter toggle, size/position, language, and more
- **Notifications / muttering / size are shared across ends**: saved on the server (a change on any end applies everywhere); on first upgrade each end pushes only local values that differ from the defaults, once (when several ends each had custom values, the last write wins)
- Toggle it off in `Settings → Extensions → Plugins` on desktop
- **Desktop overlay (experimental)**: with `options.overlay: true` the desktop fish moves into a native transparent window outside the app window (single screen, single fish; the in-window fish hides, the Fish panel/notifications/balance keep working). The window manager places the window — on tiling compositors it floats (drag it directly, or $mod+left-drag on Sway); on Wayland the plugin never fakes setPosition. The small window is fully clickable. The overlay right-click menu now matches the window one: sleep/wake (reported to the server via presence so web heartbeats can't steal it; sleep-talks while asleep), another move, chat (opens the Fish panel), add a to-do / to-do list / clear, say something, check balance, name the fish, reset brain, notification toggle, mutter toggle, bigger/smaller (stage capped at 320px), language. With nothing happening the fish plays random idle actions on its own (all 109 clips warm up over an on-demand channel; misses are requested then retried). Panel chat shows thinking/finish feedback on the overlay. Web and any failure fall back to the in-window fish. **Not implemented** (overlay-side, deferred; the in-window fish already has them): drag/throw/slingshot/gravity, multi-fish collisions, back-to-spot, multi-monitor

### Behavior at a glance

- **109 animations**: five weighted random pools (small moves / play / eating / seasonal / text), 5 click reactions, drag/throw/slingshot, multi-fish collisions
- **Work state machine**: aggregates all running sessions (thinking/working/result/waiting); the last 90s of tool calls fold into one line on the bubble (e.g. "Working · commands ×3")
- **Completion**: full celebration when the foreground session finishes, unobtrusive bubbles for background completions; subagent completions stay silent
- **Muttering**: one line every 5 minutes (silent without an audience for 10 min; right-click to toggle), with time context — it knows the day, upcoming holidays and the weather outside; sleep-talks while asleep
- **To-dos**: due times via an `@2026-11-20 15:00` / `@18:30` / `@2h` suffix; reminders escalate as the deadline approaches
- **Multiple fish**: fish #0 plays the aggregate state, the rest each bind to a running session
- **Panel chat**: talk to the fish in the Fish tab with instant "thinking" feedback and word-by-word streaming; name it and the tab title follows
- **Language**: right-click → Language (English / 中文 / 日本語; default English) switches UI, the fish's speech and prompts end to end; the choice is saved server-side and synced to every end (web/desktop windows and the desktop overlay, whose right-click menu has its own language entry), surviving reloads

### Package layout

| File | Role |
|---|---|
| `index.ts` | server brain (entry `.`) |
| `rpc.ts` | JSON-Schema contract between server and windows (entry `./rpc`) |
| `gui-experimental.cjs` | renderer bundle (entry `./gui-experimental`, CJS, ~28MB with embedded assets) |

Source, asset pipeline and dev loop live in the repo: <https://github.com/heimoshuiyu/fish-pet> (`DEVELOPMENT.md`).

### Credits & asset terms

- Community project; not affiliated with OpenCode or DeepSeek Harness
- The animation chain/physics code and all animations and sounds derive from dsh-pet (PC2005-cloud): code is MIT (its copyright line is preserved in LICENSE); **assets may not be used commercially**, and public redistribution requires attribution to https://github.com/PC2005-cloud/dsh-pet — hence the package is marked `SEE LICENSE IN LICENSE` (MIT code + asset terms, see LICENSE)
