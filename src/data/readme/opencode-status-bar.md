# opencode-status-bar

> OpenCode TUI 插件 — 在侧边栏显示当前时间（HH:mm，24 小时制）、电池电量和 API 余额。

[![npm version](https://img.shields.io/npm/v/opencode-status-bar.svg)](https://www.npmjs.com/package/opencode-status-bar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能

- **时间显示**：HH:mm 格式，24 小时制，不显示秒，每 5 秒刷新
- **电池电量**：百分比显示，每 60 秒刷新
  - 电量 ≥50%：绿色
  - 电量 20–49%：橙色
  - 电量 <20%：红色
  - 充电中：绿色 + ⚡ 标记
- **跨平台**：macOS（pmset）/ Linux（sysfs）/ Windows（WMI）
- **主题适配**：自动从当前 opencode 主题读取颜色，降低饱和度保持视觉一致
- **双语**：自动检测系统语言（中文 / English）
- **可折叠**：点击标题行折叠 / 展开，状态持久化
- **余额查询**：通过配置文件自定义供应商和查询脚本，支持任意 API 余额查询

## 安装

### 方式一：本地开发安装

```bash
cd ~/workspace/open-source/opencode-status-bar
bun install
bun run build
node install.mjs
```

然后重启 OpenCode，侧边栏底部即可看到状态面板。

### 方式二：npm 安装

```bash
npm install -g opencode-status-bar
```

在 `~/.config/opencode/tui.jsonc` 中添加：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-status-bar"]
}
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `STATUS_BAR_LANG` | 强制语言：`zh` 中文 / `en` English |

余额查询脚本中可使用任意环境变量，通过 `${VAR_NAME}` 或 `process.env.VAR_NAME` 引用。

## 余额查询

通过配置文件 `~/.config/opencode/status-bar.jsonc`（JSONC 格式，支持 `//` 行注释）自定义查询脚本，支持任意 API 的余额查询。

### 配置文件

```jsonc
{
  // 余额查询配置
  "balances": [
    {
      "provider": "DeepSeek",   // 供应商名称，显示在状态栏左侧
      "script": "..."           // 查询脚本（JS 表达式）
    }
  ]
}
```

### 脚本格式

`script` 字段是一个 JS 表达式，eval 后得到 `{request, extractor}` 对象：

```javascript
({
  request: {
    url: "https://api.example.com/balance",
    method: "GET",           // 可选，默认 GET
    headers: { ... },        // 可选
    body: "..."              // 可选，POST 时使用
  },
  extractor: function(response) {
    // response 是已解析的 JSON 对象
    // 必须返回一个字符串，原样显示在状态栏
    return "剩余: 1967.33 CNY";
  }
})
```

**`extractor` 必须返回字符串。** 返回值原样显示，不做任何格式化。返回非字符串时会自动 `String()` 转换。

脚本支持两种环境变量引用方式：

1. **`${VAR_NAME}` 模板替换**：在 `request` 的所有字符串值中（url、headers 值、body），`${VAR_NAME}` 会被替换为 `process.env.VAR_NAME` 的值。环境变量不存在时替换为空字符串。

2. **`process.env`**：脚本中可直接访问 `process.env.VAR_NAME`。

### 示例

DeepSeek 余额查询：

```jsonc
{
  "balances": [
    {
      "provider": "DeepSeek",
      "script": "({ request: { url: 'https://api.deepseek.com/user/balance', method: 'GET', headers: { 'Authorization': 'Bearer ${DEEPSEEK_API_KEY}', 'User-Agent': 'opencode-status-bar/1.0' } }, extractor: function(r) { if (!r || r.is_available !== true) return 'N/A'; const i = r.balance_infos && r.balance_infos[0]; if (!i) return 'N/A'; return '剩余: ' + parseFloat(i.total_balance).toFixed(2) + ' ' + (i.currency || 'CNY'); } })"
    }
  ]
}
```

### 显示效果

- 左侧：供应商名称（muted 色）
- 右侧：extractor 返回的字符串（正常 text 色；出错时 error 色显示 "error"）
- 返回字符串中的换行符 `\n` 会替换为空格，保持单行显示
- 每 5 分钟自动刷新

### 错误处理

| 场景 | 显示 |
|------|------|
| 配置文件不存在 | 不显示余额行 |
| 配置解析失败 | 不显示余额行（debug log 写 `/tmp/opencode-status-bar-debug.log`） |
| 脚本执行失败 | 该行显示 "error" |
| API 请求超时（15s） | 该行显示 "error" |

## 效果

```
┌──────────────────────────┐
│ ▼ Status                 │
│ ──────────────────────── │
│ Time             14:23   │
│ Battery          87% ⚡  │
│ DeepSeek   剩余: 1967.33 │
└──────────────────────────┘
```

## License

MIT
