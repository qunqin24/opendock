<p align="center">
  <a href="https://github.com/ihxnnxs/opencode-council">
    <picture>
      <source srcset="../assets/opencode-council-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="../assets/opencode-council-light.svg" media="(prefers-color-scheme: light)">
      <img src="../assets/opencode-council-light.svg" alt="opencode council logo">
    </picture>
  </a>
</p>
<p align="center">面向 OpenCode 的原生决策委员会：架构、代码审查、调试和高风险工程选择。</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.es.md">Español</a>
</p>

---

`opencode-council` 会并行询问多个只读 OpenCode 顾问，收集独立意见，再让当前 OpenCode agent 综合成一个最终建议。

## 为什么需要它

当单个模型回答不够可靠时使用它：架构决策、风险代码审查、复杂调试、安全敏感修改，以及有真实成本的取舍。

- 默认使用当前 OpenCode 模型
- 作为 OpenCode plugin、tool 和 slash commands 运行
- 顾问会作为当前 session 的 child sessions
- 只有一个订阅也能用：一个模型扮演多个角色
- 顾问默认只读
- 对复杂问题，agent 可以主动调用 consensus
- `/council-settings` 可以通过 TUI 设置多模型 council

## 安装

```bash
opencode plugin @hxnnxs/opencode-council
```

安装后重启 OpenCode。插件只在启动时加载。

如果 `/council-settings` 没有出现，把 TUI entrypoint 加到 `~/.config/opencode/tui.json`：

```json
{
  "plugin": ["@hxnnxs/opencode-council/tui"]
}
```

可选 CLI 安装器：

```bash
npx @hxnnxs/opencode-council install
```

## 更新

这个包没有后台 auto-update，OpenCode 也不会热重载插件。更新 npm plugin 后重启 OpenCode：

```bash
opencode plugin @hxnnxs/opencode-council
```

如果你 pin 了版本，请显式改成新版本，例如 `@hxnnxs/opencode-council@0.1.1`。`.opencode-council.json` 会保留。

## 使用

- `/council <question>` - 询问默认 council 并综合建议
- `/council-review <question>` - 审查当前 diff 或指定变更
- `/council-arch <question>` - 比较架构取舍
- `/council-debug <question>` - 生成调试假设和下一步检查
- `/council-status` - 显示模型、provider 和 agent 状态
- `/council-settings` - 打开 TUI 设置弹窗，配置模型、角色和顾问上限

Proactive mode 默认开启：对于复杂或高风险请求，当前 agent 会被提示先调用 `council_ask`。如果你想强制使用 council，仍然可以输入 `/council`。

## 配置

默认情况下 `models` 为空：当前 OpenCode 模型会作为 5 个不同预设角色的顾问运行。只有需要多模型 council 时，才在 `/council-settings` 中添加模型。

设置弹窗写入项目文件：

```json
{
  "version": 1,
  "models": ["openai/gpt-5.5", "opencode/big-pickle"],
  "roles": ["architect", "skeptic", "security"],
  "maxAdvisors": 5,
  "includeDiff": false,
  "timeoutMs": 300000
}
```

`models: []` 保持默认的单模型模式。

## 安全

顾问通过只读 `council-advisor` 运行：

- 禁止 `edit`
- 禁止 `bash`
- 禁用可写 tools
- prompts 明确禁止修改项目

## 开发

```bash
npm run check
npm pack --dry-run
```

此包没有 build step。

Release workflow 会在 `v*` tag 上检查包、构建 npm tarball，并把它附加到 GitHub Release。npm publish 需要单独/显式执行，避免 tag build 因 npm credentials 失败。

## 状态

MVP。这是独立的 OpenCode plugin，不由 OpenCode 团队构建，也不隶属于 OpenCode。

---

**OpenCode** [Website](https://opencode.ai) | [Docs](https://opencode.ai/docs) | [Discord](https://opencode.ai/discord)
