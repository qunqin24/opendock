# opencode-explained-right

[English](README.md) | **简体中文**

让 OpenCode 的 agent 在访问**项目文件夹之外的文件**之前，**亲口告诉你为什么**。

纯 server 插件，不动 TUI、不渲染弹窗——靠系统提示规则让 AI 自己在对话里把原因"说出来"。

## 安装

已发布到 npm。**一行命令（推荐）：**

```bash
opencode plugin opencode-explained-right
```

**或者：复制下面这段粘贴到任意 opencode 会话，让 opencode 自动帮你装：**

```text
请帮我安装 opencode-explained-right 插件（让 agent 在访问项目文件夹之外的文件之前，先亲口说明访问目标和原因）。

步骤：
1. 运行命令 opencode plugin opencode-explained-right。
2. 检查 ~/.config/opencode/opencode.json 的 "plugin" 数组里已包含 "opencode-explained-right"；没有就加上。
3. 完成后用一句话告诉我结果，并提醒我"重启 opencode 后生效"。
```

也可以手动写进配置：

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["opencode-explained-right"]
}
```

> 装完**重启 opencode** 生效。也可以直接从 GitHub 装：`opencode plugin github:Ryan9438/opencode-explained-right`。

可选：确认外部目录默认需要审批（其实本来就是默认值）：

```jsonc
{
  "permission": { "external_directory": "ask" }
}
```

## 方案

`explained-right.ts`（server 插件，单文件）通过 `experimental.chat.system.transform` 往系统提示注入一条强规则：
*访问项目外任何文件/目录前，必须用用户的语言、以 ⚠️ 开头写一句"我将访问项目外文件 \<路径\>：\<原因\>"，
作为工具调用前的最后一句。*

于是 agent 会在触发权限审批之前，先把目的写进对话里。审批权仍归 OpenCode 原生 once/always/reject 框。

实测（opencode 1.18.10，agent 读 `/etc/hosts`）：

```
⚠️ 我将访问项目外文件 /etc/hosts：读取系统文件内容以回答你的问题。
```

> 提示：权限框默认全屏。若想审批时同时看到 agent 刚说的话，按 `ctrl+f` 可把审批框切换为最小化。

## 调参（不碰配置）

| 变量 | 作用 | 默认 |
|---|---|---|
| `EXPLAINED_RIGHT_SYSTEM_RULE` | `false` 时关闭系统提示注入 | 开启 |
| `EXPLAINED_RIGHT_RULE` | 自定义注入到系统提示的规则文本 | 内置默认规则 |
| `EXPLAINED_RIGHT_DEBUG` | `1` 时输出诊断日志到 `/tmp/explained-right-debug.log` | 关闭 |

## 局限

- 规则依赖模型遵循系统提示；偶尔 agent 可能忘记，但大多数情况下会照做。
- 若想更强制的"说出来"，可考虑再加一层 `tool.execute.before` 拦截（探测项目外路径时要求 agent 先复述原因）。
- 若上游落地 [issue #37164](https://github.com/anomalyco/opencode/issues/37164) 或给权限请求增加
  `reason` 字段，未来可把原因直接内嵌审批框。

## 贡献

开发与发布说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
