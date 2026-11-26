# @mensa/btw

[English](https://github.com/susususutie/btw/blob/main/README.md) | [简体中文](https://github.com/susususutie/btw/blob/main/README.zh-CN.md)

内置 `/btw` 的无缝增强：使用方式和内置命令完全一致，**不修改 OpenCode 内核**；只新增两样东西——**历史记录** 和 **侧边栏展示**。

![演示](https://raw.githubusercontent.com/susususutie/btw/main/docs/demo-light.gif)

## 安装

```sh
opencode plugin add @mensa/btw
```

在 `~/.config/opencode/cli.json` 中禁用内置命令：

```jsonc
{
  "plugins": ["-opencode.btw", "@mensa/btw"]
}
```

重启 TUI。仅支持 OpenCode V2。

## 新增功能

- 每个 `/btw` 问题都留在会话右侧的 **BTW** 列表里，带状态和耗时。
- 点击任意一行重新打开答案；`/btws` 可过滤历史。
- 历史持久化，重启 TUI、多开窗口都不丢。

`/btw` 的提问、提示词和答案弹窗与内置版完全一致。
