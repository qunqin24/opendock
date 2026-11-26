# opencode-crew-mail

[English](../../README.md) · **简体中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md)

> 这是译文。原文为[英文 README](../../README.md)；两者不一致时，以英文版为准。

在同一个 [opencode](https://opencode.ai) 会话的子代理之间直接传递消息，这样主代理就不必把每一条信息从一个子代理搬运到另一个子代理。

![两个后台子代理：coder 用 crew_send 发送一条消息，researcher 在下一步读到它，主代理也收到一条通知](../media/demo.gif)

*在隔离的 `opencode serve` 中针对真实插件进行的脚本化运行。*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

同时工作的两个子代理常常需要从对方那里得到某一个事实：其中一个刚创建的接口名称、另一个不能碰的文件、一个会改变对方下一步的发现。没有这个插件时，这个事实会写进报告，由主代理阅读，再由主代理带着它启动或继续另一个子代理：既慢，又会占满主代理的上下文。有了它，coder 可以直接告诉 tester。

## 新增内容

两个工具，会话树中的每个代理都可以使用：

| 工具 | 作用 |
|---|---|
| `crew_list` | 列出团队：主代理、主代理启动的子代理，附带简短名称（`coder`、`coder-2`、`tester`……）、各自的任务以及是否仍在运行。 |
| `crew_send` | `{ to, text }`：把一条消息放进某个成员的收件箱（`to` = 简短名称、会话 id、`lead`），或放进团队中所有正在运行的子代理的收件箱（`to` = `all`）。 |

接收方会在其**下一步**以合成消息的形式收到这条消息。正在运行的代理永远不会被打断，也没有谁需要等待回复，因此两个代理不会互相阻塞。消息会被包装起来，让模型知道是谁写的，并且知道它来自另一个代理，而不是来自用户：

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

规则：

- **已结束**的子代理不会收到消息：消息会让它重新启动，并把它的报告再次发给主代理。发送方会被告知改为写给 `lead`，或者把内容写进自己的报告。
- 发给**空闲**主代理（例如正在等待后台子代理）的消息会留在它的收件箱里，在主代理下次运行时被读取，通常是下一份报告唤醒它的时候。设置 `wakeLead` 可以让它立即启动。
- 消息只在一棵会话树内部传递：主代理及其直接子代理。同一台机器上的其他会话无法被联系到。

## 安装

使用 opencode 的插件管理器（从 npm 安装，或直接从 GitHub 安装）：

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

或者手动安装：把 `crew-mail.js` 复制到 opencode 配置的插件文件夹中，然后重启 opencode。

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

然后告诉代理们有这个功能。每个子代理都已经能看到工具说明；在主代理的提示词中加一行，有助于它向子代理交代任务，例如：

> 同时运行的子代理可以用 `crew_send` 互相写消息（参见 `crew_list`）。在任务说明中告诉它们还有哪些子代理在同时工作、各自在做什么。

这两个工具在子代理同时运行时最有用：在一条消息中发起多个 `subagent` 调用，或使用后台子代理（`background: true`）。

如果你使用的其他插件会拒绝未知工具（白名单），请把 `crew_list` 和 `crew_send` 加进去；对于 [opencode-win-guard](https://github.com/retretor/opencode-win-guard)，这就是它的 `extraTools` 设置。若要禁止某个代理使用这些工具，可以在其代理文件中使用常规权限，例如 `{ action: crew_send, resource: "*", effect: deny }`，或者使用下面的 `agents` 设置。

## 设置

可选文件 `crew-mail.json`，放在 `opencode.json` 旁边（参见 [crew-mail.example.json](../../crew-mail.example.json)）。在插件加载时读取。

| 键 | 默认值 | 含义 |
|---|---|---|
| `maxChars` | 4000 | 消息的最大长度。超长的消息会被拒绝，并提示改为写入文件再发送其路径。 |
| `maxPerSession` | 40 | 一个会话总共可以发送的消息数。 |
| `maxPerPair` | 6 | 在 `pairWindowMinutes` 内两个会话之间的消息数，双向合计。用于防止来回往复。 |
| `pairWindowMinutes` | 10 | `maxPerPair` 的时间窗口。 |
| `wakeLead` | false | `true`：发给空闲主代理的消息会启动它。 |
| `copyToLead` | false | `true`：子代理之间的每条消息，主代理都会收到一行副本（会占用主代理的上下文）。 |
| `agents` | null | `null`：所有代理都可以使用这些工具；也可以是代理名称列表。 |
| `logText` | true | `false`：日志只记录发送方、接收方和长度。 |

每条消息和每次拒绝都会以一行 JSON 记录到 `<data dir>/opencode/log/crew-mail.log`（默认为 `~/.local/share/opencode/log/`）。插件不会建立任何网络连接。

## 安全

- 消息是模型的输出。读到恶意内容（网页、文件）的代理可能会把指令转达给另一个代理。消息外层的包装会告诉接收方，这条消息不是来自用户，也不会改变它的任务，但这只是对模型的提示，而不是屏障。请为每个代理保留其他防护措施（权限、沙箱），而不只是为主代理。
- 除非开启 `copyToLead`，主代理看不到子代理之间的消息；日志则会记录。无论如何，代理都会被要求把重要内容写进报告。

## 兼容性

- opencode 2.2 或更高版本（V2 插件 API：`ctx.tool.transform`、`ctx.session.get/list/synthetic`）。已在 Windows 10、Node 24 上用 opencode 2.2.3 测试。
- 无依赖，无构建步骤。只有 `crew-mail.js` 的默认导出是插件。

## 测试

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

端到端测试会在临时文件夹中启动一个真实的 `opencode serve`，配合一个脚本化的假模型（无需提供商、无需账号、无需网络），检查以下几点：正在运行的子代理会在下一步读到同伴的消息；已结束的子代理不会被唤醒；主代理会在下次运行时收到它的消息。你自己的 opencode 配置和会话不会被改动。在 Windows PowerShell 中，用 `$env:CREW_MAIL_E2E = "1"` 设置该变量。

## 相关项目

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard)：同一作者开发的、面向 Windows 上无人值守代理的写入沙箱和紧急停止；可与本插件配合使用。
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom)：从主代理到其正在运行的子代理的控制通道（消息、状态、中止），以及子代理向其调用方提问；子代理之间不能互相写消息。
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension)：在其他文件夹中运行、并向调用方回报的子代理。
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol)：通过修改 opencode 本身实现“队友”之间的对等消息；用 task 工具启动的子代理不在其列。

## 参与贡献

欢迎提交错误报告、想法和拉取请求：参见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。安全问题：[SECURITY.md](../../SECURITY.md)。

## 许可证

[MIT](../../LICENSE)
