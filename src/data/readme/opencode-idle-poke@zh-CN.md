[English](README.md) | 中文

[![npm](https://img.shields.io/npm/v/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![downloads](https://img.shields.io/npm/dm/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![license](https://img.shields.io/npm/l/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)

# opencode-idle-poke

一个 OpenCode 插件：在你沉默一段时间后主动向你发送消息，支持可配置间隔、逐会话开关标记，以及可选的模型自适应间隔。它不适用于一次性 CLI 模式。

由于 OpenCode V2 相比 V1 有较大改动，本插件自 1.0.0 起做了如下调整：

- 重写插件代码以适配 OpenCode V2 的 API。
- 优化默认提示词：生成被中断后的搭话不再继续未完成的输出；收到用户对插件的模糊指令时先反问澄清，不会口头声称设置已生效。
- 自适应间隔不再支持配置 Agent 与工具黑名单，临时会话默认使用 OpenCode 的免费模型（可通过 `predictor.model` 覆盖）。

## 特性

- **主动搭话** - 静默超过可配置间隔后，模型会注入一条简短提醒
- **间隔可配置** - 随时可在对话中或通过配置调整间隔
- **逐会话控制** - 用一个标记即可关闭或打开单个会话的搭话
- **可选自适应间隔** - 让插件评估对话复杂度并据此调整下一次搭话的间隔（简单 ≈ 3 分钟 / 中等 ≈ 10 分钟 / 复杂 ≈ 30 分钟）
- **默认安全** - 默认搭话模板会约束模型不读写文件、不执行命令或工具
- **重启感知** - 重启后模型会收到"搭话设置已恢复默认"的通知，不会误信对话历史里的旧标记

## 安装

在 `opencode.json`（或 `opencode.jsonc`）的 `plugin` 数组中添加。始终带上版本后缀（固定版本如 `@1.0.0`，或 `@latest`）：

```jsonc
{
  "plugin": ["opencode-idle-poke@latest"]
}
```

## 快速开始

1. 按上面添加插件条目，重启 OpenCode，并发送一条消息。
2. 保持静默约 60 秒。
3. 模型会向你发送消息。

## 使用

直接在对话中说明即可控制搭话，模型会把标记写在回复第一行：

| 你想让模型… | 标记 |
| --- | --- |
| 停止搭话 | `[Poke Off]` |
| 恢复搭话 | `[Poke On]` |
| 调整间隔 | `[Remind: 5 minutes]` —— 数字 + 单位（s/m/h 或 秒/分钟/小时，缺省秒）；有效范围 20 秒 ~ 24 小时。中文形式：`〔提醒间隔=5分钟〕` |
| 关闭自适应间隔（本会话） | `[Predictor Off]` |
| 开启自适应间隔（本会话） | `[Predictor On]` |

### 会话切换

搭话只针对你最近发送过消息的那个会话。

- 切换到另一个会话并发送消息后，其他所有会话的计时器都会被清除，搭话从此只跟随你最新的活跃会话。
- 新会话在你发送第一条真实消息之前不会搭话。

## 配置

完整参考见随包发布的 [`opencode-idle-poke-config.md`](opencode-idle-poke-config.md)。配置优先级（第一个命中即生效）：

1. `plugin` 数组条目内的插件 options
2. `~/.config/opencode/opencode-idle-poke.json`（需手动创建，插件不会自动生成）
3. 内置默认值

## 已知限制

- 标记按整行精确匹配；插件会扫描回复的前 5 行，protocol 要求模型把标记写在回复第一行。
- 对插件的模糊说法可能不产生标记。协议会要求模型反问澄清而非假装成功，但不保证 100% 触发。
- 搭话设置是运行时状态，重启后恢复默认（模型会收到相应通知）。
- 你在外部编辑器输入时，计时器仍会继续运行，搭话可能在工作中途出现；如受影响可调大间隔或关闭搭话。
- 快速切换标签页的瞬间，可能有一条搭话落到上一个会话。
- 语言适配未经测试。默认模板会要求模型用用户的语言回复，但插件本身只在中英文下验证过；间隔标记也只支持中英文。
- 不适用于一次性 CLI 模式（`opencode run "..."`）：进程在会话进入空闲时即退出，空闲计时器不会触发，也不会发送搭话。
- 自适应间隔的评估结果对下一次搭话生效，本次搭话仍按原间隔。

## 开发

```bash
npm run build       # 编译 dist/
npm run typecheck   # TypeScript 类型检查（含插件源码）
npm test            # 运行 vitest 测试套件
```

`prepublishOnly` 会在发布前自动构建。

## 许可证

MIT
