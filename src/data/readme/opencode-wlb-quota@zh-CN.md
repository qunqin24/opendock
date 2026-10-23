# opencode-wlb-quota

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个 OpenCode TUI 底栏插件，用来显示 WLB 的每日和每周额度。插件每五
分钟自动刷新，并提供今日、累计、历史和模型用量详情。

## 环境要求

- OpenCode 1.18.5 或更高版本
- OpenCode 配置中存在名为 `wlb` 的 Provider

## 安装

编辑全局 TUI 配置 `~/.config/opencode/tui.json`，加入 npm 包：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-wlb-quota"]
}
```

如果 `plugin` 中已经有其他插件，把 WLB 插件追加到数组中：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "opencode-wlb-quota",
    "其他插件"
  ]
}
```

修改后退出并重新启动 OpenCode。OpenCode 会自动下载并安装插件。

## 配置 WLB Provider

插件从名为 `wlb` 的 Provider 中读取 `baseURL` 和 `apiKey`,并请求
`GET {baseURL}/usage` 获取额度数据。在 `~/.config/opencode/opencode.json`
或 `~/.config/opencode/opencode.jsonc` 中加入以下配置。

### 最小配置

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "YOUR_WLB_API_KEY"
      }
    }
  }
}
```

将 `YOUR_WLB_API_KEY` 替换为你自己的 WLB API Key。API Key 只保存在本机
OpenCode 配置中，不会上传或包含在插件包内。

### 推荐：用环境变量引用密钥

不要把密钥直接写进配置文件，改为设置环境变量并用 `{env:...}` 语法引用：

```sh
export WLB_API_KEY="YOUR_WLB_API_KEY"
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "{env:WLB_API_KEY}"
      }
    }
  }
}
```

### 完整配置（含模型）

`models` 一节声明 WLB 提供的 Codex 模型、上下文窗口和可选变体，便于在
OpenCode 中直接调用，并在模型选择器中切换推理强度与输出详略。
`gpt-5.6-terra` 和 `gpt-5.6-luna` 的 `variants` 与 `gpt-5.6-sol` 完全一致，
直接复制过去即可（也可以只保留自己常用的预设）。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "{env:WLB_API_KEY}"
      },
      "models": {
        "gpt-5.6-sol": {
          "name": "GPT-5.6 Sol",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            "none": { "reasoningEffort": "none" },
            "low": { "reasoningEffort": "low" },
            "medium": { "reasoningEffort": "medium" },
            "high": { "reasoningEffort": "high" },
            "xhigh": { "reasoningEffort": "xhigh" },
            "max": { "reasoningEffort": "max" },
            "low-verbosity": { "textVerbosity": "low" },
            "medium-verbosity": { "textVerbosity": "medium" },
            "high-verbosity": { "textVerbosity": "high" },
            "none-low": { "reasoningEffort": "none", "textVerbosity": "low" },
            "none-medium": { "reasoningEffort": "none", "textVerbosity": "medium" },
            "none-high": { "reasoningEffort": "none", "textVerbosity": "high" },
            "low-low": { "reasoningEffort": "low", "textVerbosity": "low" },
            "low-medium": { "reasoningEffort": "low", "textVerbosity": "medium" },
            "low-high": { "reasoningEffort": "low", "textVerbosity": "high" },
            "medium-low": { "reasoningEffort": "medium", "textVerbosity": "low" },
            "medium-medium": { "reasoningEffort": "medium", "textVerbosity": "medium" },
            "medium-high": { "reasoningEffort": "medium", "textVerbosity": "high" },
            "high-low": { "reasoningEffort": "high", "textVerbosity": "low" },
            "high-medium": { "reasoningEffort": "high", "textVerbosity": "medium" },
            "high-high": { "reasoningEffort": "high", "textVerbosity": "high" },
            "xhigh-low": { "reasoningEffort": "xhigh", "textVerbosity": "low" },
            "xhigh-medium": { "reasoningEffort": "xhigh", "textVerbosity": "medium" },
            "xhigh-high": { "reasoningEffort": "xhigh", "textVerbosity": "high" },
            "max-low": { "reasoningEffort": "max", "textVerbosity": "low" },
            "max-medium": { "reasoningEffort": "max", "textVerbosity": "medium" },
            "max-high": { "reasoningEffort": "max", "textVerbosity": "high" }
          }
        },
        "gpt-5.6-terra": {
          "name": "GPT-5.6 Terra",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            // 与上方 gpt-5.6-sol 的 variants 完全一致
          }
        },
        "gpt-5.6-luna": {
          "name": "GPT-5.6 Luna",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            // 与上方 gpt-5.6-sol 的 variants 完全一致
          }
        },
        "gpt-5.5": {
          "name": "GPT-5.5",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            "low": { "reasoningEffort": "low" },
            "medium": { "reasoningEffort": "medium" },
            "high": { "reasoningEffort": "high" },
            "low-verbosity": { "textVerbosity": "low" },
            "medium-verbosity": { "textVerbosity": "medium" },
            "high-verbosity": { "textVerbosity": "high" }
          }
        }
      }
    }
  },
  "model": "wlb/gpt-5.6-sol"
}
```

### 字段说明

| 字段 | 说明 |
| --- | --- |
| `options.baseURL` | WLB 网关地址，以 `/v1` 结尾。插件通过 `GET {baseURL}/usage` 查询额度。 |
| `options.apiKey` | 你的 WLB API Key。可直接写字符串，或用 `{env:变量名}` 引用环境变量。 |
| `models.<id>.name` | 模型在模型选择器中显示的名称。 |
| `models.<id>.reasoning` | 该模型是否支持推理。 |
| `models.<id>.limit` | Token 限制：`context`（上下文窗口）、`input`（最大输入）、`output`（最大输出）。 |
| `models.<id>.variants` | 可选预设：`reasoningEffort`（`none`/`low`/`medium`/`high`/`xhigh`/`max`）和 `textVerbosity`（`low`/`medium`/`high`），可单独或组合使用。 |
| `model` | 默认使用的模型，例如 `wlb/gpt-5.6-sol`。 |

插件本身只需要 `options.baseURL` 和 `options.apiKey`，其余都是 OpenCode
正常可用的 Provider 模型配置。

如果已经配置了 WLB Provider，无需重复添加，只要 Provider 的键名是 `wlb`
并且 `options` 中包含 `baseURL` 和 `apiKey` 即可。

## 使用方法

- 底栏会显示 `1d` 和 `7d` 的已用额度百分比及重置时间。
- 插件每五分钟自动刷新一次额度。
- 输入 `/quota` 可以立即刷新并打开详情面板。
- 点击底栏中带下划线的 `WLB`，可以直接打开最近一次查询的详情。
- 刷新失败时会保留上次成功的数据，并明确标记数据已过期。
- 在较宽的终端中，底栏还会显示已用量、总额度和最后更新时间。

## 常见问题

### 底栏没有显示

1. 确认 OpenCode 版本不低于 1.18.5。
2. 确认插件写在 `tui.json` 中，而不是 `opencode.json` 的 `plugin` 字段中。
3. 修改配置后完全退出并重新启动 OpenCode。
4. 检查 JSON 语法以及插件地址是否正确。

### 显示“WLB API Key 未配置”

确认 Provider 的键名为小写的 `wlb`，并检查
`provider.wlb.options.apiKey` 是否存在。

### 手动刷新

在 OpenCode 输入框中执行：

```text
/quota
```

## 本地开发

```sh
npm install
npm run typecheck
npm pack --dry-run
```

本地测试时，可以在 `tui.json` 中直接引用源码：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./extensions/opencode-wlb-quota/src/tui.tsx"]
}
```

## 许可证

MIT
