# PulseLens

为 OpenCode TUI 提供实时的模型输出性能指标：tok/s、TTFT、TPOT、会话累计与历史趋势。

## 显示位置

- **侧边栏**（`sidebar_content`，默认 order `350`，位于 LSP 与 Todo 之间）：显示 `elapsed`、`avg tok/s` 和 tok/s 迷你趋势图。
- **输入框右侧**（`session_prompt_right`）：`157 tok/s | TTFT 1.15s | TPOT 6.39ms`。
- **命令面板**：`PulseLens: token stats`（slash 命令 `/pulselens`）打开历史详情对话框；`PulseLens: clear session history`（`/pulselens-clear`）清空当前会话历史。

## 指标口径

| 指标 | 定义 |
| --- | --- |
| TTFT | 首个 text/reasoning part 的服务端时间戳减去 assistant message 创建时间 |
| tok/s | 生成 token 数 ÷ 解码时长（首个 token 到完成） |
| TPOT | 解码时长 ÷ 生成 token 数 |
| elapsed | 整个请求的墙钟耗时（message 创建到完成）= TTFT + 解码时间 |
| TTFB | 与 TTFT 同源，插件层无法观测原始首字节，故以 TTFT 近似 |

流式过程中 token 数按字符估算（界面标记 `estimated`），请求完成后用 `message.updated` 携带的精确 usage 回填。

估算按字符类型区分：中文约 `0.7 token/字`，拉丁文本约 `3 字符/token`。校准器会用**可见文本对应的 output token** 学习一个修正因子（隐藏推理 token 不参与，避免污染），越用越准。

## 安装

### 从 npm 安装

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-pulselens"]
}
```

### 从 CNB 制品库安装

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-pulselens"]
}
```

配合项目 `.npmrc`（或全局 `~/.npmrc`）：

```ini
registry=https://npm.cnb.cool/OnEvent/npm-public/-/packages/
always-auth=true
//npm.cnb.cool/OnEvent/npm-public/-/packages/:_authToken=<YOUR_TOKEN>
```

### 本地开发（直接加载源码）

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["/path/to/PulseLens/src/tui.tsx", { "sidebar": true, "prompt": true }]]
}
```

## 配置项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `sidebar` | `true` | 是否注册侧边栏面板 |
| `sidebarOrder` | `350` | 侧边栏插入位置（内置：context 100 / mcp 200 / lsp 300 / todo 400 / files 500） |
| `prompt` | `true` | 是否注册输入框右侧迷你指示 |
| `metrics` | 全部 | 显示的指标，可选 `speed` / `ttft` / `tpot` / `reasoning` / `elapsed` |
| `history` | `true` | 是否把每次请求的指标写入 KV 持久化 |
| `historyLimit` | `50` | 每个会话保留的历史条数 |

示例：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-pulselens",
      {
        "sidebar": true,
        "prompt": true,
        "metrics": ["speed", "ttft", "tpot"],
        "historyLimit": 100
      }
    ]
  ]
}
```

历史数据存放在 TUI 的 KV 文件（`<state>/kv.json`）中，键名为 `pulselens:history:<sessionID>`。

## 开发

```bash
bun install
bun test           # 60 个测试
bun run typecheck
bun run build      # 编译到 dist/（发布产物）
```

测试依赖 `bunfig.toml` 中的 `@opentui/solid/preload`，它负责 Solid JSX 转换与运行时模块共享。

### 为什么需要构建

Solid 的 JSX 转换插件会跳过 `node_modules`，所以从 npm 安装的插件不能直接是 `.tsx` 源码，必须预编译成 JS。`bun run build` 会：

1. 用 `@opentui/solid/bun-plugin` 把 `src/tui.tsx` 打包成 `dist/tui.js`（宿主依赖保持 external）
2. 用 `tsconfig.build.json` 生成 `.d.ts` 类型声明

`exports["./tui"]` 指向 `dist/tui.js`。

## 发布

发版流程由 tag 触发，推送形如 `v0.1.0` 的 tag 即可自动发布。

### 发布到 CNB npm 制品库

流水线见 `.cnb.yml`：

| 事件 | 行为 |
| --- | --- |
| push 到 `master` | 安装 → 类型检查 → 测试 → 构建（不发布） |
| push tag `v*` | 上述全部 + 用 tag 设置版本号 + 发布到 CNB npm 制品库 |

**首次使用需准备**：

1. 制品库使用组织的 `npm-public`（`https://npm.cnb.cool/OnEvent/npm-public/-/packages/`）
2. `CNB_TOKEN` 默认可推送本组织制品库，无需额外配置

**发版命令**：

```bash
git tag v0.1.0
git push origin v0.1.0
```

流水线会自动执行 `bun pm version ${CNB_BRANCH#v} --no-git-tag-version` 把 `package.json` 版本号对齐 tag（注意剥掉 `v` 前缀，否则会写出非法版本号）。

### 发布到 npmjs.com

GitHub Actions 见 `.github/workflows/release.yml`，同样由 `v*` tag 触发。

**首次使用需准备**：

1. 在 npmjs.com 创建 Automation Token
2. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `NPM_TOKEN`

发布使用 `--provenance`，会在 npm 包页面展示来源证明。

### 本地发布（手动）

```bash
bun run typecheck
bun test
bun run build
npm publish --access public                      # 发布到 npmjs.com
npm publish --registry=https://npm.cnb.cool/OnEvent/npm-public/-/packages/   # 发布到 CNB
```

`prepublishOnly` 会检查 `dist` 是否存在且不比 `src` 旧，避免发布过期产物。

## 已知限制

- 仅在 TUI 挂载时采集，`opencode run` 等非交互模式无数据。
- 流式期间的 tok/s 为估算值，完成后才是精确值。
- 隐藏推理（服务端计入 reasoning token 但不输出文本）只在完成后体现在总量里。
- 侧边栏需终端宽度 > 120 才会显示（OpenCode 自身的规则）。
- TTFB 以 TTFT 近似，真实首字节需在 provider 层做代理才能观测。
