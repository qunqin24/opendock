# opencode-quota-sidebar-plus

English below. Simplified Chinese follows after the English section.

`opencode-quota-sidebar-plus` is an OpenCode plugin that adds quota and usage information to the sidebar.

![Example screenshot](./assets/OpenCode-Quota-Sidebar.png)

It currently provides:

- a TUI sidebar panel for usage, cost, context, and quota
- compact shared session title decoration
- quota adapters for OpenAI, GitHub Copilot, Anthropic, Kimi for Coding, Zhipu Coding Plan, MiniMax Coding Plan, RightCode, and XYAI
- two tools: `quota_summary` and `quota_show`

## Installation

OpenCode loads the server plugin and the TUI plugin separately.

Add this to `opencode.json`:

```json
{
  "plugin": ["opencode-quota-sidebar-plus@latest"]
}
```

Add this to `tui.json`:

```json
{
  "plugin": ["opencode-quota-sidebar-plus@latest"]
}
```

For OpenCode `>= 1.2.15`:

- keep the server plugin in `opencode.json`
- keep the TUI plugin in `tui.json`

## What It Shows

After installation, the plugin can show:

- current session token usage
- estimated API-equivalent cost
- context usage status
- provider quota windows and remaining percentage
- balance or subscription-style quota status when the provider exposes it
- descendant subagent usage in session totals when enabled

The TUI sidebar is the main display surface.

The shared session title stays compact and is meant to give a quick summary instead of the full panel layout.

## Tools

The plugin registers two tools.

### `quota_summary`

Shows a usage and quota summary for:

- `session`
- `day`
- `week`
- `month`

It returns a markdown report and can also show a toast.

### `quota_show`

Turns compact title decoration on or off.

When enabled, active session titles can include usage and quota information.

When disabled, the plugin restores the current session title back to its base title when possible.

## Configuration

The plugin reads `quota-sidebar.config.json` from these locations, in merge order:

- `~/.config/opencode/quota-sidebar.config.json`
- `<worktree>/quota-sidebar.config.json`
- `<directory>/quota-sidebar.config.json`
- `<worktree>/.opencode/quota-sidebar.config.json`
- `<directory>/.opencode/quota-sidebar.config.json`

You can also override the config path with `OPENCODE_QUOTA_CONFIG`.

## Example Config

```json
{
  "sidebar": {
    "enabled": true,
    "width": 36,
    "titleMode": "auto",
    "showCost": true,
    "showQuota": true,
    "contextWarningPercent": 60,
    "contextErrorPercent": 80,
    "quotaWarningPercent": 20,
    "quotaErrorPercent": 5,
    "wrapQuotaLines": true,
    "includeChildren": true
  },
  "quota": {
    "refreshMs": 300000,
    "includeOpenAI": true,
    "includeCopilot": true,
    "includeAnthropic": true,
    "providers": {
      "rightcode": {
        "enabled": true
      },
      "xyai": {
        "enabled": false,
        "baseURL": "https://new.xychatai.com",
        "serviceType": "codex",
        "login": {
          "username": "your-account@example.com",
          "password": "your-password"
        }
      }
    },
    "refreshAccessToken": false,
    "requestTimeoutMs": 8000
  },
  "toast": {
    "durationMs": 12000
  },
  "retentionDays": 730
}
```

## Common Options

### `sidebar`

- `enabled`: enable or disable sidebar rendering
- `width`: sidebar content width, clamped to `20-60`
- `titleMode`: `auto`, `compact`, or `multiline`
- `showCost`: show cost output
- `showQuota`: show quota output
- `contextWarningPercent`: warning threshold for context usage
- `contextErrorPercent`: error threshold for context usage
- `quotaWarningPercent`: warning threshold for remaining quota
- `quotaErrorPercent`: error threshold for remaining quota
- `wrapQuotaLines`: wrap long quota lines
- `includeChildren`: include descendant subagent sessions in session totals

### `quota`

- `refreshMs`: quota refresh interval
- `includeOpenAI`: enable OpenAI quota adapter
- `includeCopilot`: enable Copilot quota adapter
- `includeAnthropic`: enable Anthropic quota adapter
- `providers`: per-provider adapter config
- `refreshAccessToken`: refresh OpenAI access token from refresh token when supported
- `requestTimeoutMs`: timeout for external quota requests

## Notes

- quota output depends on what each provider actually exposes
- if a provider does not expose quota or balance data, the plugin cannot invent it
- TUI rendering and shared title rendering are separate, so install the plugin in both config files

## License

MIT

---

# 简体中文

`opencode-quota-sidebar-plus` 是一个 OpenCode 插件，用来在侧边栏中显示配额和使用量信息。

![示例截图](./assets/OpenCode-Quota-Sidebar.png)

当前代码提供的功能包括：

- TUI 侧边栏面板，显示 usage、cost、context 和 quota
- 紧凑型共享会话标题装饰
- OpenAI、GitHub Copilot、Anthropic、Kimi for Coding、智谱 Coding Plan、MiniMax Coding Plan、RightCode、XYAI 的配额适配
- 两个工具：`quota_summary` 和 `quota_show`

## 安装

OpenCode 会分别加载服务端插件和 TUI 插件。

把下面内容写到 `opencode.json`：

```json
{
  "plugin": ["opencode-quota-sidebar-plus@latest"]
}
```

把下面内容写到 `tui.json`：

```json
{
  "plugin": ["opencode-quota-sidebar-plus@latest"]
}
```

对于 OpenCode `>= 1.2.15`：

- 服务端插件放在 `opencode.json`
- TUI 插件放在 `tui.json`

## 功能说明

安装后，插件可以显示：

- 当前会话的 token 使用量
- 估算的 API 等效费用
- context 使用状态
- 提供商的 quota 窗口和剩余百分比
- 提供商实际暴露时的余额或订阅型 quota 状态
- 启用后把子会话 / subagent 的使用量合并到当前会话统计中

TUI 侧边栏是主要展示界面。

共享会话标题只保留紧凑摘要，不会把完整侧边栏内容都塞进标题里。

## 工具

插件注册了两个工具。

### `quota_summary`

用于查看以下范围的 usage 和 quota 汇总：

- `session`
- `day`
- `week`
- `month`

它会返回 markdown 报告，也可以同时弹出 toast。

### `quota_show`

用于打开或关闭紧凑标题装饰。

开启后，活动会话标题可以显示 usage 和 quota 摘要。

关闭后，插件会尽量把当前会话标题恢复成原始标题。

## 配置文件

插件会按顺序读取这些位置的 `quota-sidebar.config.json`，后面的配置会覆盖前面的配置：

- `~/.config/opencode/quota-sidebar.config.json`
- `<worktree>/quota-sidebar.config.json`
- `<directory>/quota-sidebar.config.json`
- `<worktree>/.opencode/quota-sidebar.config.json`
- `<directory>/.opencode/quota-sidebar.config.json`

也可以用环境变量 `OPENCODE_QUOTA_CONFIG` 指定配置文件路径。

## 配置示例

```json
{
  "sidebar": {
    "enabled": true,
    "width": 36,
    "titleMode": "auto",
    "showCost": true,
    "showQuota": true,
    "contextWarningPercent": 60,
    "contextErrorPercent": 80,
    "quotaWarningPercent": 20,
    "quotaErrorPercent": 5,
    "wrapQuotaLines": true,
    "includeChildren": true
  },
  "quota": {
    "refreshMs": 300000,
    "includeOpenAI": true,
    "includeCopilot": true,
    "includeAnthropic": true,
    "providers": {
      "rightcode": {
        "enabled": true
      },
      "xyai": {
        "enabled": false,
        "baseURL": "https://new.xychatai.com",
        "serviceType": "codex",
        "login": {
          "username": "your-account@example.com",
          "password": "your-password"
        }
      }
    },
    "refreshAccessToken": false,
    "requestTimeoutMs": 8000
  },
  "toast": {
    "durationMs": 12000
  },
  "retentionDays": 730
}
```

## 常用配置项

### `sidebar`

- `enabled`：是否启用侧边栏渲染
- `width`：侧边栏宽度，实际范围会限制在 `20-60`
- `titleMode`：可选 `auto`、`compact`、`multiline`
- `showCost`：是否显示费用
- `showQuota`：是否显示配额
- `contextWarningPercent`：context 警告阈值
- `contextErrorPercent`：context 错误阈值
- `quotaWarningPercent`：剩余 quota 警告阈值
- `quotaErrorPercent`：剩余 quota 错误阈值
- `wrapQuotaLines`：是否换行显示过长 quota 文本
- `includeChildren`：是否把子会话 / subagent 会话统计进当前会话

### `quota`

- `refreshMs`：quota 刷新间隔
- `includeOpenAI`：是否启用 OpenAI 配额适配
- `includeCopilot`：是否启用 Copilot 配额适配
- `includeAnthropic`：是否启用 Anthropic 配额适配
- `providers`：各 provider 的额外配置
- `refreshAccessToken`：支持时是否用 refresh token 刷新 OpenAI access token
- `requestTimeoutMs`：外部 quota 请求超时

## 说明

- quota 输出取决于 provider 实际提供的数据
- 如果 provider 没有暴露 quota 或余额信息，插件不会伪造数据
- TUI 渲染和共享标题渲染是分开的，所以 `opencode.json` 和 `tui.json` 都要安装

## License

MIT
