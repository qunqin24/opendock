# opencode-status-bar

> OpenCode TUI 插件 — 侧边栏配额仪表盘：时间 / 电量 / 缓存命中率 / 多供应商 API 余额 / 子代理监控。

[![npm version](https://img.shields.io/npm/v/opencode-status-bar.svg)](https://www.npmjs.com/package/opencode-status-bar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 面板效果

![demo](docs/demo.gif)

```text
▼ 21:15      ▰▰▰▰▱ 81% ● · ⇄87%      ← 标题行（▼时间=折叠 · ⇄=缓存详情弹窗）
• DeepSeek                    ¥535.72   ← 货币余额（extractor 返回 text）
• 智谱          1% ▱▱▱▱▱ · 4h7m         ← 单窗：使用率 + 微条 + 重置倒计时
• 跑路哥                     $964.56
• MiniMax  19% ▰▱▱▱▱ 27% ▰▰▱▱▱ · 2h46m ← 双窗（5h/7d）单行压缩
• Kimi      6% ▰▱▱▱▱ 57% ▰▰▰▱▱ · !28m  ← ≥90% 告急行呼吸告警
◆ task   ⠋ 2 run · 1 done · 8.2k tok    ← 子代理行（有活动才显示）

折叠态：▶ 21:15 · ●●●●● · ⇄87% · ⧗2run   ← 健康星座摘要
```

- 无边框无分隔线，与 opencode 原生侧边栏（Context / MCP / LSP）排版语言一致
- 彩色即状态：**绿** <70% · **黄** ≥70% · **红** ≥90%（呼吸告警）；**accent 蓝** = 信息类（缓存/子代理）
- 充电时电量条本体低频闪烁（分档色 ↔ accent 蓝），电量分档：≥50 绿 / 20-49 黄 / <20 红
- 单行铁律：名称超 14 列自动截断；宽度不足时微条 5 格 → 3 格 → 隐藏 → 双窗丢首窗，数值永不丢失

## 使用方法

### 安装

```bash
opencode plugin opencode-status-bar
```

或手动在 `~/.config/opencode/tui.jsonc` 中添加：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-status-bar"]
}
```

### 更新版本（重要）

opencode 会将插件**缓存**到 `~/.cache/opencode/packages/<name>@<range>/`，之后一直使用缓存副本。`npm install -g` 更新对 TUI 插件**无效**。正确更新方式：

```bash
# 1. 删除旧缓存（移入废纸篓）
mv ~/.cache/opencode/packages/opencode-status-bar@latest ~/.Trash/

# 2. 重启 opencode —— 自动从 registry 重新拉取最新版
```

### 交互

| 操作 | 效果 |
|------|------|
| 点击 `▼ 21:15` | 折叠 / 展开面板 |
| 点击 `⇄ 87%` | 缓存详情弹窗（命中率 / token 分项 / 节省估算） |
| 点击 `◆ task` 行 | 子代理列表弹窗（状态 / token / 耗时） |
| **弹窗内点击子代理行** | **直接进入该子代理执行页面** |
| 点击余额行 | 手动刷新该行（spinner 反馈） |
| esc / 点击遮罩 | 关闭弹窗 |

## 配置方法

配置文件：`~/.config/opencode/status-bar.jsonc`（JSONC，支持 `//` 行注释）。所有配置项均有默认值，不创建该文件也可运行（只是没有余额行）。

```jsonc
{
  // ── 展示模块开关 ──
  "sections": {
    "clock": true,      // 标题行时间（冒号脉动）
    "battery": true,    // 电量微条 + 百分比
    "cache": true,      // ⇄ 缓存命中率（点击弹窗）
    "subagent": true    // ◆ 子代理监控行
  },

  // ── 动效（全部可独立关闭；intervalMs = 闪烁/脉动周期毫秒）──
  "animations": {
    "alert":    { "enabled": true,  "intervalMs": 600 },   // 告急行呼吸（≥alert 阈值）
    "charging": { "enabled": true,  "intervalMs": 1200 },  // 充电时电量条闪烁
    "clock":    { "enabled": true,  "intervalMs": 2000 },  // 时间冒号脉动
    "spinner":  { "enabled": true,  "intervalMs": 80 }     // 手动刷新 spinner
  },

  // ── 健康度分档阈值（usage ∈ 0-1）──
  "thresholds": {
    "warning": 0.7,   // ≥ 此值 → 黄色
    "alert": 0.9      // ≥ 此值 → 红色 + 呼吸
  },

  // ── 子代理监控 ──
  "subagent": {
    "ttlDays": 3      // 记录保留天数（0 = 永久）；记录持久化到 KV，
                      // 跨视图切换 / 插件重载 / 重启均存活，访问会话自动续期
  },

  // ── 余额查询（见下文 Provider 脚本格式）──
  "balances": [ /* ... */ ]
}
```

## Provider 脚本格式

`balances[]` 每项两个字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `provider` | string | 显示名称（超 14 列自动截断） |
| `script` | string | JS 表达式，eval 后得到 `{ request, extractor }` 对象 |

### script 结构

```javascript
({
  request: {                              // HTTP 请求定义
    url: "https://api.example.com/balance",
    method: "GET",                        // 可选，默认 GET
    headers: { "Authorization": "Bearer ${MY_API_KEY}" },  // 可选
    body: "..."                           // 可选，POST 时使用
  },
  extractor: function(response) {         // response 为已解析的 JSON
    // 返回值见下文「返回值协议」
  }
})
```

- `request` 中所有字符串值支持 `${VAR_NAME}` 环境变量模板替换（变量不存在替换为空串）
- 脚本内也可直接访问 `process.env.VAR_NAME`
- 请求超时 15 秒；HTTP 非 2xx 视为失败（保留上次成功值，首次失败显示"限额满"）

### extractor 返回值协议（核心）

**① 纯字符串**（简单场景，无微条无健康度，显示为绿色）：

```javascript
extractor: function(r) {
  return "$12.34";
}
```

**② 结构化对象**（推荐，解锁微条 / 健康度 / 倒计时 / 双窗）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | ✓ | 主显示文本 |
| `usage` | number | — | 0-1 使用率 → 渲染 5 格微条 + 健康度分档 |
| `resetInMs` | number | — | 距重置毫秒（查询时刻基准）→ 动态倒计时 |
| `windows` | array | — | 多窗（如 5h/7d），存在时优先于 usage |

```javascript
extractor: function(r) {
  return {
    text: "45% 2h13m",
    usage: 0.45,                // 0-1；≥thresholds.warning 黄，≥alert 红+呼吸
    resetInMs: 8_100_000
  };
}
```

**③ 双窗（windows）**——单行压缩展示，健康度取各窗最大值，倒计时显示最近重置者：

```javascript
extractor: function(r) {
  return {
    text: "19%",
    windows: [
      { usage: 0.19, resetInMs: 9_600_000 },    // 5h 窗
      { usage: 0.27, resetInMs: 432_000_000 }   // 7d 窗
    ]
  };
}
```

### 厂商脚本模板（复制即用）

以下模板与实际 API 已验证可用。环境变量（`DEEPSEEK_API_KEY` 等）需自行在 shell 配置中 export。

#### DeepSeek

货币余额（无使用率，纯 text 返回）：

```jsonc
{
  "provider": "DeepSeek",
  "script": "({ request: { url: 'https://api.deepseek.com/user/balance', method: 'GET', headers: { 'Authorization': 'Bearer ${DEEPSEEK_API_KEY}', 'User-Agent': 'cc-switch/1.0' } }, extractor: function(r) { if (!r || r.is_available !== true) return { text: 'N/A' }; const i = r.balance_infos && r.balance_infos[0]; if (!i) return { text: 'N/A' }; return { text: '¥' + parseFloat(i.total_balance).toFixed(2) }; } })"
}
```

#### 智谱

单窗使用率（TOKENS_LIMIT 百分比 + 重置倒计时）：

```jsonc
{
  "provider": "智谱",
  "script": "({ request: { url: 'https://open.bigmodel.cn/api/monitor/usage/quota/limit', method: 'GET', headers: { 'Authorization': '${ZHIPU_API_KEY}', 'Accept-Language': 'en-US,en', 'Content-Type': 'application/json' } }, extractor: function(r) { if (!r || !r.data || !r.data.limits) return { text: 'N/A' }; const t5 = r.data.limits.find(function(l) { return l.type === 'TOKENS_LIMIT'; }); if (!t5) return { text: 'N/A' }; const u5 = (t5.percentage != null ? t5.percentage : 0) / 100; const r5 = t5.nextResetTime != null ? t5.nextResetTime - Date.now() : undefined; const windows = [ { usage: u5, resetInMs: r5 } ]; const tm = r.data.limits.find(function(l) { return l.type === 'TIME_LIMIT'; }); if (tm) { const um = (tm.percentage != null ? tm.percentage : 0) / 100; const rm = tm.nextResetTime != null ? tm.nextResetTime - Date.now() : undefined; windows.push({ usage: um, resetInMs: rm }); } return { text: Math.round(u5 * 100) + '%', windows: windows }; } })"
}
```

#### 跑路哥

货币余额（key4your 中转站，取 remaining 或 balance）：

```jsonc
{
  "provider": "跑路哥",
  "script": "({ request: { url: 'https://x.key4your.com/v1/usage', method: 'GET', headers: { 'Authorization': 'Bearer ${KEY4YOU_GPT_API_KEY}', 'Content-Type': 'application/json' } }, extractor: function(r) { if (!r) return { text: 'N/A' }; const rem = r.remaining ?? r.balance; if (rem == null) return { text: 'N/A' }; return { text: '$' + parseFloat(rem).toFixed(2) }; } })"
}
```

#### MiniMax

双窗（5h 窗 + 7d 窗使用率，windows 协议）：

```jsonc
{
  "provider": "MiniMax",
  "script": "({ request: { url: 'https://www.minimaxi.com/v1/token_plan/remains', method: 'GET', headers: { 'Authorization': 'Bearer ${MINIMAX_API_KEY}', 'Content-Type': 'application/json' } }, extractor: function(r) { if (!r || !r.model_remains) return { text: 'N/A' }; const m = r.model_remains.find(function(x) { return x.model_name === 'general'; }); if (!m) return { text: 'N/A' }; const u5 = 1 - (m.current_interval_remaining_percent || 0) / 100; const u7 = 1 - (m.current_weekly_remaining_percent || 0) / 100; const r5 = m.end_time != null ? m.end_time - Date.now() : undefined; const r7 = m.weekly_end_time != null ? m.weekly_end_time - Date.now() : undefined; return { text: Math.round(u5 * 100) + '%', windows: [ { usage: u5, resetInMs: r5 }, { usage: u7, resetInMs: r7 } ] }; } })"
}
```

#### Kimi

双窗（5h 窗 detail + 7d 窗 usage）：

```jsonc
{
  "provider": "Kimi",
  "script": "({ request: { url: 'https://api.kimi.com/coding/v1/usages', method: 'GET', headers: { 'Authorization': 'Bearer ${KIMI_API_KEY}', 'Content-Type': 'application/json' } }, extractor: function(r) { if (!r) return { text: 'N/A' }; let u5 = 0, r5, u7 = 0, r7; const d = r.limits && r.limits[0] && r.limits[0].detail; if (d) { const lim = parseInt(d.limit, 10); u5 = lim > 0 ? 1 - parseInt(d.remaining, 10) / lim : 0; r5 = new Date(d.resetTime).getTime() - Date.now(); } const u = r.usage; if (u) { const lim7 = parseInt(u.limit, 10); u7 = lim7 > 0 ? 1 - parseInt(u.remaining, 10) / lim7 : 0; r7 = new Date(u.resetTime).getTime() - Date.now(); } return { text: Math.round(u5 * 100) + '%', windows: [ { usage: u5, resetInMs: r5 }, { usage: u7, resetInMs: r7 } ] }; } })"
}
```

> 编写自己的脚本时参考上文「extractor 返回值协议」：货币类返回 `{ text }`，配额类返回 `{ text, usage, resetInMs }` 或 `{ text, windows[] }`。

### 宽度自适应

面板宽度不足时自动降级（数值永不丢失）：

```text
全量：    19% ▰▰▱▱▱ 27% ▰▰▱▱▱ · 2h46m
微条 3 格：19% ▰▱▱ 27% ▰▱▱ · 2h46m
无微条：  19% 27% · 2h46m
双窗丢首：27% ▰▱▱▱▱ · 2h46m
极限截断：…29% · 2h46m
```

## 错误处理

| 场景 | 显示 |
|------|------|
| 配置文件不存在 / 解析失败 | 不显示余额行（debug log：`/tmp/opencode-status-bar-debug.log`） |
| 查询失败（首次，无历史值） | "限额满"，点击可重试 |
| 查询失败（有历史值） | 保留上次成功值，不闪断 |
| API 超时（15s） | 同上 |

## 致谢 & 参考项目

本项目在设计与实现上参考了以下两个优秀的 OpenCode 开源插件，特此致谢原作者 [Hotakus](https://github.com/Hotakus)：

| 项目 | 灵感来源 |
|------|----------|
| [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — 实时 Token 缓存命中率侧边栏 | 本项目的 `⇄ 87%` 缓存命中率展示与缓存详情弹窗 |
| [opencode-subagent-magazine](https://github.com/Hotakus/opencode-subagent-magazine) — 实时子代理监控侧边栏 | 本项目的 `◆ task` 子代理监控行与子代理列表弹窗 |

感谢 [@Hotakus](https://github.com/Hotakus) 的开源分享 🙏。如果你对**纯粹的**缓存命中率可视化或子代理监控感兴趣，强烈推荐直接使用上述原版插件——它们功能更完整、独立成体，可作为本插件的互补方案。

## License

MIT
