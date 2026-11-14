# OpenCode 插件集

[English](README.md) | **简体中文**

一组用来减少 OpenCode 日常使用摩擦的插件。

OpenCode 本身已经是一个很强的编码 Agent，但真正每天用下来，总有一些反复出现的小问题：等待长命令跑完、重新输入以前写过的
prompt、在很长的对话里找不到某个决定、密钥不小心进了上下文、两个 session 之间无法直接沟通。这些插件解决的就是这些问题，
而且不需要修改 OpenCode 本身。它们面向 OpenCode V2 插件体系：Server 功能配置在 `opencode.jsonc`，TUI 功能配置在
`cli.json`。

## 从 Unicorn 开始

[`@max10240/opencode-plugin-unicorn`](./packages/opencode-plugin-unicorn/README.zh-CN.md) 把整套工具打成一个包：一个包、
一套统一的配置方式，所有功能共用同一个版本。想用哪个就开哪个，不想用的可以单独关掉。

```jsonc
// opencode.jsonc — server 端功能
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@max10240/opencode-plugin-unicorn"]
}
```

```jsonc
// cli.json — TUI 功能（远程 client 也需要）
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@max10240/opencode-plugin-unicorn"]
}
```

只有想改默认值时才需要加配置：

```jsonc
{
  "plugins": [{
    "package": "@max10240/opencode-plugin-unicorn",
    "options": {
      "features": { "imageGen": false },
      "nonBlocking": { "thresholdMs": 5000 }
    }
  }]
}
```

完整的功能列表和参数见 [Unicorn README](./packages/opencode-plugin-unicorn/README.zh-CN.md)。

## 包含哪些插件

| 插件 | 它能给你什么 | 什么时候需要 |
| --- | --- | --- |
| [Unicorn](./packages/opencode-plugin-unicorn/README.zh-CN.md) | 把下面所有插件打成一个包，并可独立开关 | 想一次装好整套工具，不想逐个管理插件 |
| [自动后台](./packages/opencode-plugin-non-blocking/README.zh-CN.md) | 长时间运行的 Bash 和 subagent 自动转入后台 | 构建、测试、安装或研究型 subagent 卡住了当前 session |
| [Prompt 检索](./packages/opencode-plugin-prompt-search/README.zh-CN.md) | 搜索所有历史 session 的 prompt，并插入而不发送 | 记得写过某段 prompt，但想不起在哪个 session |
| [当前对话检索](./packages/opencode-plugin-session-search/README.zh-CN.md) | 搜索当前对话并跳到对应消息 | 长对话把某个决定、命令或报错埋得太深 |
| [跨 session 消息](./packages/opencode-plugin-send-message-across-sessions/README.zh-CN.md) | 让一个 session 给另一个 cwd 的 session 发消息 | 前端和后端、或两个 worktree 需要协作 |
| [图片生成](./packages/opencode-plugin-image-gen/README.zh-CN.md) | 生成或编辑图片并保存到文件 | 需要配图、图标、示意图或参考图变体，又不想离开对话 |
| [图片预览](./packages/opencode-plugin-show-img/README.zh-CN.md) | 在对话里直接预览图片，不把图片字节发给模型 | Agent 提到截图、图表或生成的图片，你想马上看到 |
| [OpenCode Go 用量](./packages/opencode-plugin-opencode-go-usage/README.zh-CN.md) | 展示所有已登录账号的 OpenCode Go 5 小时、每周和每月用量 | 想直接在 TUI 里查看每个 Go 额度还剩多少 |
| [记事本](./packages/opencode-plugin-notepad/README.zh-CN.md) | 按文件夹或全局保存随手笔记 | 突然想到一个后续事项，不想打断当前 Agent |
| [敏感信息加密](./packages/opencode-plugin-sensitive-encrypt/README.zh-CN.md) | 用公钥加密文本或文件，只解密到文件 | 需要保存、传递或交给 Agent 处理密钥，但不能暴露明文 |
| [敏感信息保护](./packages/opencode-plugin-sensitive-protection/README.zh-CN.md) | 保护凭据文件，脱敏 secret 值并阻断私钥 | 机器上有凭据、token 或私钥 |
| [推荐配置](./packages/opencode-plugin-recomended-opencode-config/README.zh-CN.md) | 补充精选规则和命令，并为 OpenAI 设置 `store:false` | 想要一套更安全、更一致的 OpenCode 基线，又不想自己写规则 |

## 只安装需要的插件

每个插件也都可以独立使用。具体配置、快捷键和参数见各自的 README：

- [自动后台](./packages/opencode-plugin-non-blocking/README.zh-CN.md)
- [Prompt 检索](./packages/opencode-plugin-prompt-search/README.zh-CN.md)
- [当前对话检索](./packages/opencode-plugin-session-search/README.zh-CN.md)
- [跨 session 消息](./packages/opencode-plugin-send-message-across-sessions/README.zh-CN.md)
- [图片生成](./packages/opencode-plugin-image-gen/README.zh-CN.md)
- [图片预览](./packages/opencode-plugin-show-img/README.zh-CN.md)
- [OpenCode Go 用量](./packages/opencode-plugin-opencode-go-usage/README.zh-CN.md)
- [记事本](./packages/opencode-plugin-notepad/README.zh-CN.md)
- [敏感信息加密](./packages/opencode-plugin-sensitive-encrypt/README.zh-CN.md)
- [敏感信息保护](./packages/opencode-plugin-sensitive-protection/README.zh-CN.md)
- [推荐配置](./packages/opencode-plugin-recomended-opencode-config/README.zh-CN.md)

Server 端功能配置在 `opencode.jsonc`，TUI 功能配置在 `cli.json`。有些插件两端都会用到。

## 开发

```bash
bun install
bun run build
bun run typecheck
bun run check
```

`check` 是日常使用的完整检查；`check:release` 是无缓存的发布检查。所有包共享同一个版本。发布统一通过
`npm run release -- --release-type=<type>` 进行。完整流程和发布规则见 [AGENTS.md](AGENTS.md)。
