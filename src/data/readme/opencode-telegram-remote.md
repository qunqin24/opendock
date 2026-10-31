[简体中文](README.md) | [繁體中文](README.zh-Hant.md) | [English](README.en.md)

# opencode-telegram-remote

用 Telegram 在手机上遥控 OpenCode，电脑端的回复实时推送到手机。
A Telegram remote control for [OpenCode](https://opencode.ai) V2: chat with your sessions from your phone and get desktop replies pushed back in real time.

[![CI](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能

- **原生 OpenCode V2 插件**：基于 `@opencode/plugin` 的 `Plugin.define` 编写（插件 id 为 `telegram`），运行在 OpenCode 服务进程内，随 OpenCode 启停，不需要额外的常驻桥接进程。
- **手机发消息**：普通文本会作为提示词发送到当前聊天绑定的会话。OpenCode 处理期间机器人显示“正在输入…”，完成后把回复发回手机。
- **电脑端回复推送到手机**：插件监听 OpenCode 的 `session.text.ended` 事件，电脑窗口里产生的回复会发送到所有绑定该会话的聊天；内置去重，同一条回复不会发两次。
- **`/current`**：把手机接入你在电脑上最近查看的会话，电脑和手机可以在同一个对话里交替使用。
- **切换模型**：`/model` 点按钮切换，或用 `/model <关键词>`。
- **切换或新建会话**：`/sessions`、`/new`；用 `/abort` 中止正在运行的任务。
- **在手机上处理权限请求**：已绑定会话里 OpenCode 请求权限时，会收到带 **Allow once / Always / Reject** 按钮的消息。
- **白名单**：只有你列出的 Telegram 用户 ID 能使用机器人，其他人会收到 "Unauthorized"。

## 环境要求

- OpenCode V2（插件基于 `@opencode/plugin` 2.2 开发）。
- Node.js 20 及以上（见 `package.json` 的 `engines.node`）。
- 从 [@BotFather](https://t.me/BotFather) 获取的机器人 token，以及你的 Telegram 数字用户 ID。

## 安装

本包暂未发布到 npm。可以用 OpenCode CLI 直接从 GitHub 安装：

```sh
opencode plugin add github:HenryYannis/opencode-telegram-remote
```

或者克隆到本地，作为本地插件目录加载：

```sh
git clone https://github.com/HenryYannis/opencode-telegram-remote.git
cd opencode-telegram-remote
npm install
```

然后在 `~/.config/opencode/opencode.json(c)` 里加入克隆目录的绝对路径：

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-telegram-remote"]
}
```

## 配置

创建 `~/.config/opencode/telegram.json`：

```json
{
  "token": "YOUR_BOT_TOKEN",
  "allowedUsers": [123456789]
}
```

| 字段 | 是否必填 | 说明 |
| :--- | :--- | :--- |
| `token` | 必填 | 在 [@BotFather](https://t.me/BotFather) 用 `/newbot` 创建机器人后得到的 token。 |
| `allowedUsers` | 必填，不能为空 | 允许使用机器人的 Telegram 数字用户 ID 列表。可通过 [@userinfobot](https://t.me/userinfobot) 查看自己的 ID。 |

- 不需要填 chat ID：只要发送者在白名单里，机器人就会响应。最简单的用法是和你的机器人私聊。
- 如果文件不存在、`token` 为空或 `allowedUsers` 为空，插件不会启动机器人，OpenCode 照常运行。
- ⚠️ 白名单里的人可以通过 OpenCode 在你的电脑上执行任务。只填你自己的 ID，并妥善保管 `telegram.json`。
- Windows 下路径为 `%USERPROFILE%\.config\opencode\telegram.json`。

可选环境变量：

| 变量 | 作用 |
| :--- | :--- |
| `TELEGRAM_PLUGIN_DEBUG` | 设置后会把调试日志写入 `~/.config/opencode/telegram-plugin.log`。 |

## 命令

| 命令 | 作用 |
| :--- | :--- |
| *（普通文本）* | 发送提示词到已绑定的会话 |
| `/current` | 接入你在电脑上最近查看的会话 |
| `/model` | 以按钮列出模型；`/model <关键词>` 切换到第一个 ID 包含该关键词的模型 |
| `/sessions` | 列出最近 10 个会话，点按钮切换 |
| `/new` | 新建会话并绑定 |
| `/abort` | 中止已绑定会话中正在运行的任务 |
| `/status` | 显示工作目录、已绑定会话和最近查看的会话 |
| `/start` | 显示帮助 |

**普通文本发到哪个会话？** 发到当前聊天绑定的会话。如果还没有绑定，依次使用：你在电脑上最近查看的会话 → 最近更新的会话 → 新建一个 "Telegram remote session"。

**模型列表从哪来？** 来自 OpenCode 的模型列表（`ctx.model.list()`）。如果为空，再读取 `~/.config/opencode/opencode.json` 中 `providers.<id>.models` 下的模型名。

## 电脑 → 手机同步原理

```
电脑窗口中一条回复结束
   ↓ OpenCode 发出 session.text.ended（sessionID、assistantMessageID、ordinal、text）
插件找到绑定该会话的聊天
   ↓ 长文本按最多 3800 个字符分段
bot.api.sendMessage → 你的手机
```

回复有两条送达路径：事件流；以及从 Telegram 发起提示时，在 `session.wait()` 之后读取会话的兜底路径。两条路径共用一个投递记录（按消息 ID 和文本段去重），所以每条回复只发一次。

## 限制

- 目前只支持文本，暂不支持图片和语音。
- 每台电脑只运行一个机器人。OpenCode 会为每个 location 加载一次插件，插件用锁文件（`~/.config/opencode/telegram-plugin.lock`）保证只有一个实例在轮询 Telegram。
- 聊天与会话的绑定保存在内存中，OpenCode 重启后会清空，发送 `/current` 或 `/sessions` 重新绑定即可。

## 常见问题

**机器人没有反应？**
确认 `telegram.json` 是合法 JSON，包含 `token` 和非空的 `allowedUsers`，且你的 ID 在其中。设置 `TELEGRAM_PLUGIN_DEBUG=1` 后重启 OpenCode，查看 `~/.config/opencode/telegram-plugin.log`。

**不卸载的情况下怎么关闭插件？**
在 `opencode.json(c)` 的 `plugins` 中加入 `"-telegram"`，或者删除 `telegram.json`。

## 开发

```sh
npm ci
npm run ci   # 语法检查、单元测试、插件包校验、导入冒烟测试、打包预演
```

## 许可证

[MIT](LICENSE) © 2026 程小宝
