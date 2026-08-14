# opencode-beep

OpenCode 插件：在关键事件发生时播放 Windows 提示音（`.wav`）。

## 兼容性（重要）

本插件仅支持 Windows（`win32`）。内部通过 PowerShell 调用 .NET `Media.SoundPlayer` 播放 `.wav`。
macOS / Linux / WSL 等环境不支持或不保证可用。

## 功能

- 会话从 `busy/retry` 进入 `idle` 时播放提示音（可关）
- 出现权限询问（permission）时播放提示音（可关）
- 出现提问/确认（question）提示时播放提示音（可关）
- 支持节流（避免短时间连续提示音）
- 支持全局/项目级配置覆盖

## 安装

推荐在 OpenCode 全局配置目录安装（Windows 通常是 `%USERPROFILE%\.config\opencode`）：

```bash
cd "%USERPROFILE%\.config\opencode"
npm install @xiaowei1906/opencode-beep
```

> 说明：OpenCode 会从自己的配置目录加载插件依赖；在这里安装最省心。

## 启用

编辑 OpenCode 配置文件：

- Windows：`%USERPROFILE%\.config\opencode\opencode.json`

加入：

```json
{
  "plugin": ["@xiaowei1906/opencode-beep"]
}
```

## 配置

如果找不到配置文件，插件会使用内置默认值。

插件按优先级读取配置（项目配置优先于全局配置）：

- 全局配置：`%USERPROFILE%\.config\opencode\beep.jsonc` 或 `%USERPROFILE%\.config\opencode\beep.json`
- 项目配置：`<project>\.opencode\beep.jsonc` 或 `<project>\.opencode\beep.json`

也支持通过环境变量 `OPENCODE_CONFIG_DIR` 指定“全局配置目录”（Windows 路径）。

仓库内包含示例配置文件 `beep.jsonc`。

### 配置项说明

- `enabled`：插件总开关
- `soundFile`：默认音频文件路径（Windows `.wav`）
- `repeat`：默认播放次数（最小 1）
- `throttleMs`：全局节流窗口（毫秒），在窗口内重复触发会被抑制
- `debugToast`：是否在 TUI 里显示调试 toast（排障用）
- `events`：分事件覆盖（每个事件支持 `true/false` 或对象）
  - `events.<key>.sources`：可选，来源过滤（仅匹配指定 `source` 时才播放；不填则不做过滤）

支持的事件键：

- `sessionIdle`：会话从 `busy/retry` 切到 `idle` 时触发
- `permissionAsked`：出现权限询问提示时触发
- `questionAsked`：出现提问/确认提示时触发

来源（`source`）说明（用于 `events.<key>.sources`）：

- `sessionIdle`：`session.status` | `session.idle`
- `permissionAsked`：`permission.asked`（纯通知/提示） | `permission.ask`（需要你选择/确认）
- `questionAsked`：`question.asked`（纯通知/提示） | `question tool`（需要你回答）

### 示例 `beep.jsonc`

```jsonc
{
  // Master switch for the plugin
  "enabled": true,

  // Default sound file for all events
  "soundFile": "C:\\Windows\\Media\\Windows Notify.wav",

  // Default repeat count for all events (min 1)
  "repeat": 1,

  // Global throttle window in milliseconds
  "throttleMs": 2000,

  // Show debug toast in TUI
  "debugToast": false,

  // Per-event overrides
  "events": {
    "sessionIdle": {
      "enabled": true,
      "soundFile": "C:\\Windows\\Media\\Windows Notify.wav",
      "repeat": 1
    },
    "permissionAsked": {
      "enabled": true,
      // Only beep for interactive prompts (not for passive notification toasts)
      // Supported sources: "permission.ask" | "permission.asked"
      "sources": ["permission.ask"]
    },
    "questionAsked": {
      "enabled": true,
      // Only beep when a question requires user interaction
      // Supported sources: "question tool" | "question.asked"
      "sources": ["question tool"]
    }
  }
}
```

## 注意事项

- 仅支持 `.wav`（`Media.SoundPlayer` 主要支持 wav），不保证 mp3 等格式可用。
- 需要系统可用 `powershell`。如果被系统策略限制（Execution Policy）或环境缺失，可能导致播放失败。
- `throttleMs` 是全局节流：短时间内多个事件触发也可能只响一次。

## 排障

- 没有声音：
  - 确认 `soundFile` 指向存在的 `.wav` 文件
  - 确认系统音量/通知音未静音
  - 临时把 `debugToast` 设为 `true`，看是否有触发提示
- 播放失败：
  - 确认 `powershell` 可用
  - 尝试把 `soundFile` 换成系统自带 wav（如 `C:\\Windows\\Media\\Windows Notify.wav`）
- 不确定是否启用成功：
  - 检查 `opencode.json` 是否已配置 `"plugin": ["@xiaowei1906/opencode-beep"]`
  - 确认安装目录是否在 `%USERPROFILE%\.config\opencode`

## 开发

```bash
opencode plugin dev
```

## License

MIT
