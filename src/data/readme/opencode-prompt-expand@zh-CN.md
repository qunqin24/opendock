# opencode-prompt-expand

[English README](../README.md)

![opencode-prompt-expand](../assets/featured.png)

在 **OpenCode Desktop** 的 composer 里，把粗糙草稿扩展成结构化提示词，并原地写回。

**状态：** `v0.1.1` 实验版，已发布到 npm。OpenCode Desktop 的 GUI 插件 API 仍是 experimental，请锁定你测试的 OpenCode 版本。

## 适合谁

- 使用 OpenCode Desktop 的个人开发者
- 习惯用自然语言描述需求，但不想每次手写结构化提示词
- 希望结果留在 composer 里，自己检查、修改后再按 Enter

不适用于终端 TUI。插件不会自动发送消息，也不会写入会话历史。

## 功能

- 把模糊需求补成：目标、范围、约束、产出、验收方式
- 原地写回 composer，可继续编辑
- toast 提供「撤销」和「重生成」
- 最多保留 5 个版本，仅在当前窗口内存中
- 简洁模式（约 800 字符）和充分展开模式
- 可读取白名单内的项目信息：`package.json`、规则文件、git 状态
- 支持 `*gpt*` / `*claude*` 家族指令

## 要求

- OpenCode Desktop **2.2.5**（当前验证版本）
- Node.js **^20.19.0 或 >=22.12.0**（仅从源码构建时需要）
- 已在 OpenCode 中连接 provider/model

## 安装

### 从 npm

```bash
opencode plugin add opencode-prompt-expand
opencode plugin list
```

npm 页面：https://www.npmjs.com/package/opencode-prompt-expand

### 从 GitHub 构建

```bash
git clone https://github.com/ConnorYyy/opencode-prompt-expand.git
cd opencode-prompt-expand
npm ci
```

`npm ci` 会通过 `prepare` 自动构建 `dist/`。

把插件加入**全局** OpenCode 配置：

- macOS / Linux：`~/.config/opencode/opencode.jsonc`
- Windows：`C:\Users\<you>\.config\opencode\opencode.jsonc`

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-prompt-expand",
      "options": {
        "mode": "concise",
        "model": "auto",
        "projectContext": true,
        "timeoutMs": 30000
      }
    }
  ]
}
```

Windows 路径示例：

```jsonc
"package": "D:/path/to/opencode-prompt-expand"
```

重载 Desktop 窗口，或重启 OpenCode Desktop。  
检查 **Settings > Extensions > Plugins** 中是否出现 `prompt-expand`。

## 使用

1. 在 composer 写草稿，例如：`帮我做一个数据看板，包含筛选和导出`
2. 点击 `⚡ Expand Prompt`，或在命令面板搜索 **Expand prompt**，或输入 `/expand <text>`
3. 等待模型返回，结果会写回 composer
4. 自己检查/修改，然后按 Enter 发送

入口：

| 入口 | 方式 |
|---|---|
| session composer | 点击 `⚡ Expand Prompt` pill |
| Home / 新建会话草稿 | 点击底部 `⚡ Expand Prompt` 按钮 |
| 命令面板 | 搜索 `Expand prompt` |
| 斜杠 | `/expand <text>` |
| 重生成 / 撤销 | toast 按钮，或命令面板 |
| 版本切换 | 命令面板 Previous / Next expanded version |

没有默认快捷键。可在 **Settings > Shortcuts** 绑定：

```text
prompt-expand.expand
prompt-expand.regenerate
prompt-expand.restore
prompt-expand.previous
prompt-expand.next
prompt-expand.mode
prompt-expand.settings
```

## 设置

打开 **Settings > Prompt Expand**，或运行 **Prompt Expand settings**。

| 设置 | 说明 |
|---|---|
| Mode | 简洁 / 充分展开 |
| Model | `auto`、`composer`、`provider/model` 或留空 |
| Project context | 是否读取项目信息 |

设置通过 `Store.global` 保存。未设置或 Model 为 `auto` 时，回退到 `opencode.jsonc` 的 options；显式设置会覆盖。

## 常见问题

**会发送消息吗？**  
不会。插件只读写 composer，发送由你按 Enter 完成。

**支持 TUI 吗？**  
不支持，只支持 OpenCode Desktop。

**为什么新建会话页没有 composer pill？**  
Home / draft 没有官方 composer API。插件在底部提供 `⚡ Expand Prompt` 按钮，通过 DOM 适配器读写草稿，属于 best-effort。创建 session 后会使用正常 pill。

**支持 `@` 文件引用吗？**  
含 `@path` 的草稿会跳过，避免附件与文本不同步。普通邮箱地址不会被误判。

**失败会改输入框吗？**  
不会。失败时原文不变，toast 会尽量显示服务端 code/message。

**会保存我的提示词吗？**  
不会。版本栈只在当前窗口内存中。

## 隐私

- 草稿只发送给你在 OpenCode 中连接的 provider
- 不经过插件作者的代理
- 不读取 `.env`、`.pem`、`credentials*` 或源码文件
- 项目感知只读取白名单文件，并限制字符预算
- 无 telemetry

## 限制

- GUI 插件 API 仍是 experimental
- Home / draft 的 DOM 回退不是官方 API
- `setText()` 不能重写 `@` mention 附件
- 没有 TUI 实现
- 慢模型可能超过 `timeoutMs`

## 赞助

如果这个插件帮你节省了时间，可以通过 Buy Me a Coffee 支持维护和测试：

[buymeacoffee.com/connory](https://buymeacoffee.com/connory)

[![Buy Me a Coffee QR code](../assets/bmc-qr.png)](https://buymeacoffee.com/connory)

赞助是可选的，插件保持 MIT License。

## License

MIT
