
[English](./README_EN.md) | **简体中文**

OpenCode 插件，在需要权限、生成完成、发生错误或调用 question 工具时播放提示音并发送系统通知。支持 macOS、Linux 和 Windows。

## 快速开始

在你的 `opencode.json` 中添加：

```json
{
  "plugins": ["@thelastwinner/opencode-notifier"]
}
```

重启 OpenCode。完成。

## 本地安装

如果您想从源码安装或使用自定义版本：

### 构建并本地安装

```bash
# 导航到项目目录
cd opencode-notifier

# 构建包
bun run build

# 创建 npm tarball
npm pack

# 全局安装
npm install -g thelastwinner-opencode-notifier-0.1.30.tgz
```

### 更新 opencode.json

将插件添加到您的 `~/.config/opencode/opencode.json`：

```json
{
  "plugins": [
    "@thelastwinner/opencode-notifier"
  ]
}
```

### 创建配置文件

创建 `~/.config/opencode/opencode-notifier.json` 并使用默认配置（参见下方配置文件部分）。

## 功能说明

您会在以下情况下收到通知：
- OpenCode 需要权限运行某些操作时
- 您的会话完成时
- 发生错误时
- question 工具弹出时

还有 `subagent_complete` 用于子代理完成时，以及 `user_cancelled` 用于您按 ESC 取消时 -- 这两个默认是静音的，这样您不会被频繁打扰。

## 各平台设置

**macOS**: 无需任何操作，开箱即用。显示 Script Editor 图标。

**Linux**: 如果您已经设置了通知系统，应该可以正常工作。如果没有，请安装 libnotify：

```bash
sudo apt install libnotify-bin  # Ubuntu/Debian
sudo dnf install libnotify       # Fedora  
sudo pacman -S libnotify         # Arch
```

对于声音，您需要以下之一：`paplay`、`aplay`、`mpv` 或 `ffplay`

**Windows**: 开箱即用。但请注意：
- 只支持 `.wav` 文件（不支持 mp3）
- 使用完整路径如 `C:/Users/You/sounds/alert.wav` 而不是 `~/`

## 配置文件

创建 `~/.config/opencode/opencode-notifier.json` 并使用默认配置：

```json
{
  "sound": true,
  "notification": true,
  "timeout": 5,
  "showProjectName": true,
  "showSessionTitle": false,
  "showIcon": true,
  "notificationSystem": "osascript",
  "linux": {
    "grouping": false
  },
  "command": {
    "enabled": false,
    "path": "/path/to/command",
    "args": ["--event", "{event}", "--message", "{message}"],
    "minDuration": 0
  },
  "wechatWebhook": {
    "enabled": false,
    "webhookUrl": ""
  },
  "events": {
    "permission": { "sound": true, "notification": true },
    "complete": { "sound": true, "notification": true },
    "subagent_complete": { "sound": false, "notification": false },
    "error": { "sound": true, "notification": true },
    "question": { "sound": true, "notification": true },
    "user_cancelled": { "sound": false, "notification": false }
  },
  "messages": {
    "permission": "会话需要权限: {sessionTitle}",
    "complete": "会话已完成: {sessionTitle}",
    "subagent_complete": "子代理任务完成: {sessionTitle}",
    "error": "会话遇到错误: {sessionTitle}",
    "question": "会话有提问: {sessionTitle}",
    "user_cancelled": "会话被用户取消: {sessionTitle}"
  },
  "sounds": {
    "permission": null,
    "complete": null,
    "subagent_complete": null,
    "error": null,
    "question": null,
    "user_cancelled": null
  },
  "volumes": {
    "permission": 1,
    "complete": 1,
    "subagent_complete": 1,
    "error": 1,
    "question": 1,
    "user_cancelled": 1
  }
}
```

## 所有选项

### 全局选项

```json
{
  "sound": true,
  "notification": true,
  "timeout": 5,
  "showProjectName": true,
  "showSessionTitle": false,
  "showIcon": true,
  "notificationSystem": "osascript"
}
```

- `sound` - 开启/关闭声音（默认：true）
- `notification` - 开启/关闭通知（默认：true）
- `timeout` - 通知显示时长（秒），仅 Linux（默认：5）
- `showProjectName` - 在通知标题中显示文件夹名称（默认：true）
- `showSessionTitle` - 通过 `{sessionTitle}` 占位符在通知消息中包含会话标题（默认：true）
- `showIcon` - 显示 OpenCode 图标，仅 Windows/Linux（默认：true）
- `notificationSystem` - 仅 macOS：`"osascript"` 或 `"node-notifier"`（默认：osascript）
- `linux.grouping` - 仅 Linux：替换通知而不是堆叠（默认：false）。需要 `notify-send` 0.8+

### 事件

单独控制每个事件：

```json
{
  "events": {
    "permission": { "sound": true, "notification": true },
    "complete": { "sound": true, "notification": true },
    "subagent_complete": { "sound": false, "notification": false },
    "error": { "sound": true, "notification": true },
    "question": { "sound": true, "notification": true },
    "user_cancelled": { "sound": false, "notification": false }
  }
}
```

`user_cancelled` 在您按 ESC 取消会话时触发。默认是静音的，这样有意的取消不会触发错误警报。如果想要取消时的确认，请将 `sound` 或 `notification` 设置为 `true`。

或者对两者使用 true/false：

```json
{
  "events": {
    "complete": false
  }
}
```

### 消息

自定义通知文本：

```json
{
  "messages": {
    "permission": "会话需要权限: {sessionTitle}",
    "complete": "会话已完成: {sessionTitle}",
    "subagent_complete": "子代理任务完成: {sessionTitle}",
    "error": "会话遇到错误: {sessionTitle}",
    "question": "会话有提问: {sessionTitle}",
    "user_cancelled": "会话被用户取消: {sessionTitle}"
  }
}
```

消息支持占位符令牌，这些令牌会被实际值替换：

- `{sessionTitle}` - 当前会话的标题/摘要（例如 "修复登录错误"）
- `{projectName}` - 项目文件夹名称

当 `showSessionTitle` 为 `false` 时，`{sessionTitle}` 被替换为空字符串。当占位符解析为空时，任何尾随分隔符（`: `、` - `、` | `）都会自动清理。

要在不更改 `showSessionTitle` 的情况下在消息中禁用会话标题，只需从自定义消息中删除 `{sessionTitle}` 占位符。

### 声音

使用您自己的声音文件：

```json
{
  "sounds": {
    "permission": "/path/to/alert.wav",
    "complete": "/path/to/done.wav",
    "subagent_complete": "/path/to/subagent-done.wav",
    "error": "/path/to/error.wav",
    "question": "/path/to/question.wav",
    "user_cancelled": "/path/to/cancelled.wav"
  }
}
```

平台注意事项：
- macOS/Linux：.wav 或 .mp3 文件可以工作
- Windows：只支持 .wav 文件
- 如果文件不存在，会回退到捆绑的声音

### 音量

设置每个事件的音量，范围 `0` 到 `1`：

```json
{
  "volumes": {
    "permission": 0.6,
    "complete": 0.3,
    "subagent_complete": 0.15,
    "error": 1,
    "question": 0.7,
    "user_cancelled": 0.5
  }
}
```

- `0` = 静音，`1` = 最大音量
- 范围外的值会自动限制
- 在 Windows 上，播放仍然工作但自定义音量可能不被默认播放器支持

### 自定义命令

当某些事件发生时运行您自己的脚本。使用 `{event}`、`{message}` 和 `{sessionTitle}` 作为占位符：

```json
{
  "command": {
    "enabled": true,
    "path": "/path/to/your/script",
    "args": ["{event}", "{message}"],
    "minDuration": 10
  }
}
```

- `enabled` - 开启/关闭命令
- `path` - 您的脚本/可执行文件路径
- `args` - 要传递的参数，可以使用 `{event}`、`{message}` 和 `{sessionTitle}` 令牌
- `minDuration` - 如果响应很快则跳过，避免垃圾信息（秒）

#### 示例：将事件记录到文件

```json
{
  "command": {
    "enabled": true,
    "path": "/bin/bash",
    "args": [
      "-c",
      "echo '[{event}] {message}' >> /tmp/opencode.log"
    ]
  }
}
```

### 企业微信 Webhook

当事件发生时向企业微信（企业微信群机器人）发送通知：

```json
{
  "wechatWebhook": {
    "enabled": true,
    "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"
  }
}
```

- `enabled` - 开启/关闭企业微信 webhook
- `webhookUrl` - 您的企业微信 webhook URL
- `mentionedList` - 可选的用户 ID 列表用于 @ 提及（例如 `["@user1", "@user2"]`）
- `mentionedMobileList` - 可选的手机号码列表用于 @ 提及（例如 `["13800138000"]`）

#### 获取企业微信 Webhook URL

1. 打开企业微信群聊
2. 点击群设置（...）
3. 选择"群机器人" → "添加机器人"
4. 创建新机器人并复制 webhook URL

#### 示例：通知特定用户

```json
{
  "wechatWebhook": {
    "enabled": true,
    "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY",
    "mentionedList": ["@all"],
    "mentionedMobileList": ["13800138000"]
  }
}
```

使用 `@all` 来提及群组中的所有人，或指定单个用户 ID/手机号码。

## macOS：选择通知样式

**osascript**（默认）：可靠但显示 Script Editor 图标

```json
{ 
  "notificationSystem": "osascript" 
}
```

**node-notifier**：显示 OpenCode 图标但有时可能错过通知

```json
{ 
  "notificationSystem": "node-notifier" 
}
```

**注意：** 如果您选择 node-notifier 但开始错过通知，只需切换回来或从配置中删除该选项。有用户报告在某些 macOS 版本上 node-notifier 可以播放声音但无法显示视觉通知。

## Linux：通知分组

默认情况下，每个通知都显示为单独条目。在活跃会话期间，当多个事件快速触发时（例如权限 + 完成 + 提问），这会产生噪音。

启用分组以替换通知而不是堆叠：

```json
{
  "linux": {
    "grouping": true
  }
}
```

启用分组后，每个新通知都会替换前一个通知，因此您只会看到最新的事件。这需要 `notify-send` 0.8+（Ubuntu 22.04+、Debian 12+、Fedora 36+、Arch 上的标准版本）。在较旧的系统上会自动回退到默认的堆叠行为。

适用于所有主要通知守护进程（GNOME、dunst、mako、swaync 等）在 X11 和 Wayland 上。

## 更新

如果 OpenCode 没有更新插件或缓存版本有问题：

```bash
# Linux/macOS
rm -rf ~/.cache/opencode/node_modules/@thelastwinner/opencode-notifier

# Windows
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\opencode\node_modules\@thelastwinner\opencode-notifier"
```

然后重启 OpenCode。

## 故障排除

**macOS：看不到通知？**
转到系统设置 > 通知 > Script Editor，确保设置为横幅或提醒。

**macOS：node-notifier 不显示通知？**
切换回 osascript。一些用户报告在某些 macOS 版本上 node-notifier 可以播放声音但无法显示视觉通知。

**Linux：没有通知？**
安装 libnotify-bin：
```bash
sudo apt install libnotify-bin  # Debian/Ubuntu
sudo dnf install libnotify       # Fedora
sudo pacman -S libnotify         # Arch
```

用 `notify-send "Test" "Hello"` 测试

**Linux：没有声音？**
安装以下之一：`paplay`、`aplay`、`mpv` 或 `ffplay`

**Windows：自定义声音不工作？**
- 必须是 .wav 格式（不是 .mp3）
- 使用完整的 Windows 路径：`C:/Users/YourName/sounds/alert.wav`（不是 `~/`）
- 确保文件在 Windows Media Player 中可以播放
- 如果使用 WSL，路径应该可以从 Windows 访问

**Windows WSL 通知不工作？**
WSL 没有原生通知守护进程。改用 PowerShell 命令：

```json
{
  "notification": false,
  "sound": true,
  "command": {
    "enabled": true,
    "path": "powershell.exe",
    "args": [
      "-Command",
      "$wshell = New-Object -ComObject Wscript.Shell; $wshell.Popup('{message}', 5, 'OpenCode - {event}', 0+64)"
    ]
  }
}
```

**Windows：通知出现时 OpenCode 崩溃？**
这是 Windows 上的已知 Bun 问题。禁用原生通知并使用 PowerShell 弹窗：

```json
{
  "notification": false,
  "sound": true,
  "command": {
    "enabled": true,
    "path": "powershell.exe",
    "args": [
      "-Command",
      "$wshell = New-Object -ComObject Wscript.Shell; $wshell.Popup('{message}', 5, 'OpenCode - {event}', 0+64)"
    ]
  }
}
```

**插件不加载？**
- 检查您的 opencode.json 语法
- 清除缓存（参见更新部分）
- 重启 OpenCode

## 更新日志

参见 [CHANGELOG.md](CHANGELOG.md)

## 许可证

MIT
