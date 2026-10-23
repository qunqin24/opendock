# opencode-tps-plugin

[English](./README.md)

[OpenCode](https://opencode.ai) 的实时 AI 生成速度与 Token 吞吐量监控插件。在模型生成输出时，直接在 OpenCode TUI 状态栏显示实时 **tokens-per-second (TPS)** 指标。

## 截图

![OpenCode TUI 中显示 TPS 监控的示例](./docs/screenshot-use.png)

> OpenCode 会话中的示例输出，具体数值会因模型和会话而异。

## 功能特性

- **实时 TPS 显示** — 在提示栏显示即时速度、滚动平均值、Token 总数和已用时间
- **颜色编码速度指示** — 基于可配置阈值的绿色（快）、黄色（中）、红色（慢）
- **工具执行感知** — 工具调用期间显示"TOOL"指示，自动从生成速度计算中扣除工具等待时间
- **子代理追踪** — 追踪父子会话关系，将指标汇总到根会话
- **EMA 平滑** — 指数移动平均，带自适应半衰期以抑制噪声尖峰
- **CJK 感知 Token 估算** — 每个 CJK 字符视为 1 个 Token，提供更准确的计数
- **多种估算算法** — `general`（字符/4）、`program`（字符/3）、`prose`（词/0.75）
- **灵活配置** — JSON 配置文件、环境变量或代码覆盖

## 安装

```bash
npm install opencode-tps-plugin
```

将插件添加到 `tui.json`：

```jsonc
{
  "plugin": [
    // ... 你现有的插件
    "opencode-tps-plugin"
  ]
}
```

## 工作原理

插件使用 SolidJS 在 `session_prompt_right` 插槽渲染 `ThroughputGauge` 组件。它监听 `message.part.delta`、`message.part.updated`、`message.updated` 和 `session.idle` 事件实时追踪 Token 生成，显示实时 TPS、平均速度、Token 总数和已用时间，支持颜色主题。

## 配置

配置按以下优先级解析（从高到低）：

1. 代码覆盖（编程方式传入）
2. 环境变量（`TPS_PLUGIN_*`）
3. 用户配置：`~/.config/opencode/tps-plugin.json`
4. 项目配置：`.opencode/tps-plugin.json`
5. 内置默认值

> **注意：** 显示开关（`showAvg`、`showRate`、`showTokens`、`showTimer`）仅支持 JSON 配置与默认值，不提供环境变量覆盖。

### 配置文件示例

```json
{
  "enabled": true,
  "refreshIntervalMs": 50,
  "samplingWindowMs": 1000,
  "showAvg": true,
  "showRate": true,
  "showTokens": true,
  "showTimer": true,
  "tokenMode": "general",
  "useColors": true,
  "slowRate": 10,
  "fastRate": 50
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `TPS_PLUGIN_ENABLED` | 启用/禁用插件 | `true` |
| `TPS_PLUGIN_REFRESH_INTERVAL_MS` | UI 更新最小间隔（毫秒） | `50` |
| `TPS_PLUGIN_SAMPLING_WINDOW_MS` | 速度计算的滑动窗口 | `1000` |
| `TPS_PLUGIN_TOKEN_MODE` | Token 估算模式（`general`、`program`、`prose`） | `general` |
| `TPS_PLUGIN_USE_COLORS` | 启用速度颜色编码 | `true` |
| `TPS_PLUGIN_SLOW_RATE` | 低于此值显示红色 | `10` |
| `TPS_PLUGIN_FAST_RATE` | 高于此值显示绿色 | `50` |

## 环境要求

- [OpenCode](https://opencode.ai) `>=1.15.13`
- Node.js 18+

## 开发

```bash
# 安装依赖
bun install

# 类型检查
bun run typecheck

# 构建
bun run build
```

## 许可证

[MIT](./LICENSE)
