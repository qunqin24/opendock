# opencode-notify-ios

通过 [Bark](https://bark.day.app) 将 OpenCode 事件推送通知到 iOS 设备。

> 需要 **OpenCode V2**（`opencode >= 2.0`）。V2 的插件 API 与 V1 不兼容，V1 插件在 V2 上无法加载。

## 前提

在 App Store 安装 [Bark](https://apps.apple.com/app/bark-customed-notifications/id1403753865)，获取设备密钥。

## 安装

### 全局安装

编辑 `~/.config/opencode/opencode.json`：

```json
{
  "plugins": ["@jachy/opencode-notify-ios"]
}
```

### 项目安装

在项目根目录创建或编辑 `opencode.json`：

```json
{
  "plugins": ["@jachy/opencode-notify-ios"]
}
```

> V1 的 `plugin` 配置项在 V2 中仍可读取，但推荐改用 `plugins`。

## 配置

在项目根目录创建 `notify-ios.json`，或者在全局目录 `~/.config/opencode/notify-ios.json` 创建一份共用配置（项目优先于全局）：

```json
{
  "deviceKey": "your_bark_device_key",
  "sound": "default",
  "enable": ["permission.asked", "session.execution.failed"],
  "templates": {
    "permission.asked": {
      "title": "OpenCode 需要确认",
      "body": "请确认操作"
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `deviceKey` | **必填**。Bark 设备密钥 |
| `sound` | 通知声音，默认 `"default"` |
| `enable` | 启用的事件列表。默认 `["permission.asked", "session.execution.failed", "session.idle", "session.created"]`，设为 `[]` 关闭所有通知 |
| `templates` | 按事件自定义文案，`body` 支持 `\n` 换行。支持变量 `{{time}}`（当前本地时间）和 `{{session.title}}`（会话标题） |
| `dedupWindowMs` | 相同通知的去重时间窗口，默认 `5000`（毫秒） |

配置文件修改即时生效，无需重启。

### 模板变量

`title` 和 `body` 中可使用以下变量，运行时自动替换：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{{time}}` | 当前本地时间 | `2026-06-14 15:30:00` |
| `{{session.title}}` | 当前会话标题 | `修复登录 Bug` |
| `{{project.name}}` | 项目目录名 | `opencode-push-ios` |

示例：

```json
{
  "templates": {
    "session.idle": {
      "title": "OpenCode 空闲",
      "body": "[{{time}}] 会话「{{session.title}}」进入空闲"
    }
  }
}
```

## 事件

OpenCode V2 的事件名与 V1 不同。插件内置了 V1 → V2 的别名映射，**旧配置可以继续使用**：

| V1 名称（仍可用） | V2 名称（推荐） | 触发时机 |
|:---:|------|------|
| `permission.updated` | `permission.asked` | OpenCode 需要用户确认 |
| `session.error` | `session.execution.failed` | 会话发生错误 |
| `session.idle` | `session.idle` | 会话进入空闲 |
| `session.created` | `session.created` | 会话已创建 |

`templates` 同样支持别名：V2 事件找不到模板时，会回退到同名的 V1 模板。

完整事件列表见 [DEVELOPMENT.md](./DEVELOPMENT.md)。

## 安全

`notify-ios.json` 包含 Bark 设备密钥，**强烈建议**将其加入 `.gitignore`，避免密钥泄露：

```gitignore
# opencode-notify-ios
notify-ios.json
```
