# opencode-glm-vistatus

[English](./README.en.md) | 简体中文

> OpenCode TUI 插件 — 在侧边栏实时显示 Z.AI / ZHIPU GLM Coding Plan 额度使用情况。

---

## 功能

- 5 小时 Token 配额（百分比 + 进度条）
- 周 Token 配额（百分比 + 进度条）
- MCP 工具用量（百分比 + 进度条）
- Token 已用 / 总量
- 重置倒计时 + 本地时钟
- 账户套餐等级（Pro / Lite 等）
- 平台信息（Z.AI / ZHIPU）
- 最后刷新时间 + 下次刷新预估
- 每 5 分钟自动刷新
- 中 / 英文双语切换
- Morandi 风格主题适配
- 进度条颜色随使用率变化（绿 → 橙 → 红）

## 安装

### 方式一：OpenCode 命令安装（推荐）

在 OpenCode 中按 **`Ctrl + P`** 打开命令面板，搜索 **`install plugin`**，输入：

```
opencode-glm-vistatus
```

回车即可完成安装与配置。

### 方式二：npx 一键安装

```bash
npx opencode-glm-vistatus
```

安装脚本会自动写入跨平台 OpenCode 配置目录下的 `tui.jsonc`（必要时同步到 `opencode.jsonc`），注册插件。插件名为 `opencode-glm-vistatus`，不带 `@latest`。

### 方式三：手动配置

在配置目录的 `tui.jsonc` 中添加：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-glm-vistatus"],
}
```

| 系统          | 配置目录              |
| ------------- | --------------------- |
| Windows       | `%APPDATA%\opencode\` |
| macOS / Linux | `~/.config/opencode/` |

### 重启 OpenCode

进入任意 session，侧边栏即可看到 GLM 额度面板。

## 卸载

**1. 移除插件配置**

从 `tui.jsonc`（及 `opencode.jsonc`，若存在）的 `plugin` 数组中删除 `"opencode-glm-vistatus"`：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [], // 删除 "opencode-glm-vistatus" 这一项
}
```

**2. 卸载 npm 全局包（可选，若曾 `npm i -g` 安装）**

```bash
npm uninstall -g opencode-glm-vistatus
```

**3. 清除 OpenCode 插件缓存**

由于 [OpenCode 已知问题 #6774](https://github.com/anomalyco/opencode/issues/6774)，插件会被缓存到本地，删除配置后建议一并清缓存：

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\opencode\packages\opencode-glm-vistatus"
```

```bash
# macOS / Linux
rm -rf ~/.cache/opencode/packages/opencode-glm-vistatus
```

**4. 重启 OpenCode**

## 前置条件

1. 通过 `/connect` 命令认证 Z.AI / ZHIPU 账户，或
2. 设置环境变量 `ZAI_API_KEY` / `ZHIPU_API_KEY`

凭证发现优先级：XDG `~/.local/share/opencode/auth.json` → Windows `%LOCALAPPDATA%\opencode\auth.json` → 环境变量。

## 斜杠命令

| 命令              | 功能                                                  |
| ----------------- | ----------------------------------------------------- |
| `/glm-refresh`    | 立即刷新额度数据                                      |
| `/glm-lang`       | 切换中 / 英文显示                                     |
| `/glm-section`    | 开关面板边框显隐                                      |
| `/glm-config`     | 查看当前配置                                          |
| `/glm-mcp-manage` | 安装 / 卸载 GLM MCP 服务器（别名 `/glm-mcp-install`） |

语言与边框偏好会持久化保存（插件 KV），重启后保留。

`/glm-mcp-manage`（别名 `/glm-mcp-install`）支持交互式选择操作（安装 / 卸载）、范围（Local 项目 / Global 全局）和服务器列表，将 MCP 配置写入对应的 `opencode.json` 或从中移除。可管理的服务器：

| 服务器         | 类型   | 说明                          |
| -------------- | ------ | ----------------------------- |
| github-read    | Remote | GitHub 仓库知识与代码阅读     |
| glm-web-reader | Remote | 网页内容提取与结构化数据获取  |
| glm-web-search | Remote | 网络搜索与实时信息获取        |
| glm-vision     | Local  | 图像分析与视频理解 (GLM-4.6V) |

## 面板布局

```
▼ GLM 额度 v0.1.0         14:24
───────────────────────────────
平台:                     ZHIPU
套餐:                       Pro
5h Token
[███████░░░░░░░░░░░░░░░░░░] 28%
重置: 2h 30m (16:58)
周配额
[██░░░░░░░░░░░░░░░░░░░░░░░░] 7%
重置: 4d 1h (Thu 16:03)
MCP                     0/1,000
[░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

进度条颜色规则：

| 使用率 | 颜色 | 含义     |
| ------ | ---- | -------- |
| < 70%  | 绿   | 余量充足 |
| 70-90% | 橙   | 接近上限 |
| >= 90% | 红   | 即将耗尽 |

## 构建

```bash
npm install          # 安装依赖（peer deps 由 OpenCode 宿主提供）
npm run build        # tsc 产物 + esbuild 打包 → dist/tui.js
npm run typecheck    # tsc --noEmit
```

构建产物：

- `dist/tui.js` — SolidJS 打包的 TUI 插件（实际加载的插件）
- `dist/server.js` — 兼容用的空 Server 插件壳

## 技术架构

| 维度        | 实现                                            |
| ----------- | ----------------------------------------------- |
| 插件类型    | TUI 插件（sidebar_content 插槽）                |
| 渲染方式    | SolidJS (@opentui/solid)                        |
| 数据来源    | Z.AI / ZHIPU Monitor API（每平台 3 端点）       |
| 凭证来源    | OpenCode auth.json / 环境变量                   |
| HTTP 客户端 | `fetch()` + AbortController 10s 超时            |
| 错误策略    | `Promise.allSettled` 优雅降级（部分失败也展示） |
| 刷新策略    | 挂载首次获取 + 每 5 分钟轮询                    |

## 故障排查

| 现象                  | 可能原因                                                           |
| --------------------- | ------------------------------------------------------------------ |
| 面板显示空白 / 无数据 | 未认证，或 auth.json 路径未命中，或未设置环境变量                  |
| 数据部分缺失          | 某个 API 端点超时（10s），其余仍会展示                             |
| 语言切换无效          | 可设置环境变量 `GLM_VISTATUS_LANG=zh\|en` 强制语言（绕过自动检测） |
| 数据不更新            | 重启 OpenCode，或使用 `/glm-refresh` 立即刷新                      |

## License

MIT
