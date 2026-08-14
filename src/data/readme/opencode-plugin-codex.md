# opencode-plugin-codex

在 OpenCode TUI 右侧栏显示 Codex CLI 的 5 小时、7 天剩余额度和限额重置机会。

```text
▾ Codex
5h 78% · 2h14m
7d 52% · 07-14 15:30
Reset 2 · 07-13 09:00
```

- 点击箭头折叠或展开
- 每 2 分钟自动刷新
- 5 小时窗口存在时显示剩余额度，可用时附带重置倒计时
- 7 天窗口显示本地重置日期和时间
- 显示可用重置机会总数和最近过期时间
- Token 过期时自动刷新，并原子写回 Codex 凭据

## 要求

- OpenCode `>= 1.17.18`
- 已安装并登录 Codex CLI
- OpenCode 侧栏处于可见状态

插件读取 `$CODEX_HOME/auth.json`；未设置 `CODEX_HOME` 时读取 `~/.codex/auth.json`。

## 安装

推荐使用 OpenCode 插件命令安装：

```bash
opencode plugin opencode-plugin-codex --global
```

该命令会同时更新 OpenCode Server 和 TUI 的全局插件配置。安装后完全退出并重新启动 OpenCode。

如果不使用安装命令，也可以手动配置以下两个文件。

`~/.config/opencode/opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-codex"]
}
```

`~/.config/opencode/tui.json`：

```json
{
  "plugin": ["opencode-plugin-codex"]
}
```

## 从源码安装

```bash
git clone https://github.com/KioZhang/opencode-plugin-codex.git
cd opencode-plugin-codex
npm install
npm run build
opencode plugin "file://$(pwd)" --global
```

本地插件使用当前目录中的构建产物。修改代码后需要重新执行 `npm run build`，并重启 OpenCode。

## 工作方式

插件从 Codex CLI 凭据中读取 OAuth Token，并调用 ChatGPT 的 `wham/usage` 和 `wham/rate-limit-reset-credits` 接口。窗口按服务端返回的时长识别：

- `18000` 秒：5 小时窗口
- `604800` 秒：7 天窗口

限额接口返回已使用百分比，插件将其换算为剩余百分比显示。无法识别 5 小时窗口时不会显示对应行；服务端未提供重置时间时只显示额度。重置机会接口用于显示可用总数和最近一个尚未过期机会的本地时间。请求失败时保留上一次成功结果，并在标题后标记“旧”。

## 安全与隐私

- 不收集或上传使用数据
- 不记录 Access Token、Refresh Token 或账号 ID
- Token 只发送给 OpenAI 官方域名
- 刷新后的凭据以 `0600` 权限原子写回 `$CODEX_HOME/auth.json`
- 不读取提示词、回复内容或项目文件

注意：上述 `wham` 接口是 ChatGPT 内部接口，并非稳定的公开 API。接口结构变化时可能需要升级插件。

## 开发

```bash
npm install
npm run verify
npm pack --dry-run
```

`npm run verify` 会依次运行类型检查、单元测试和构建。TUI 必须使用 Solid Universal 模式构建，不能使用普通 JSX Runtime。

## 常见问题

### 一直显示“加载中”

确认已运行最新构建，并完全重启 OpenCode。本地源码安装时先执行：

```bash
npm run build
```

### 没有显示右侧栏

OpenCode 会在终端宽度不足时隐藏侧栏。增大终端宽度后重试。

### 提示重新登录

运行 `codex` 完成登录，然后重启 OpenCode 或等待下一次自动刷新。

## License

[MIT](LICENSE)
