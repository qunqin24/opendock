# opencode-latex-render

[![npm version](https://img.shields.io/npm/v/%40vandoor2%2Fopencode-latex-render.svg)](https://www.npmjs.com/package/@vandoor2/opencode-latex-render)
[![GitHub](https://img.shields.io/badge/GitHub-vandoor7-droid%2Fopencode--latex--render-blue)](https://github.com/vandoor7-droid/opencode-latex-render)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

让 OpenCode 自动渲染 LaTeX 数学公式，并以图片附件显示在回答中。

## 工作方式

在 OpenCode 中询问数学问题时，模型会调用 `latex-render` 工具。工具生成 PNG 图片，并作为 OpenCode 原生附件返回，由 OpenCode 自己负责显示。这样不会直接向终端写入 Kitty 控制序列，也不会破坏回答正文的布局。

## 快速开始

### 1. 安装系统依赖

Ubuntu/Debian：

```bash
sudo apt install python3-dev libjpeg-dev zlib1g-dev
```

### 2. 一键安装插件

OpenCode V1（运行 `opencode`，版本 1.x）：

```bash
# 当前项目
opencode plugin @vandoor2/opencode-latex-render
# 全局
opencode plugin -g @vandoor2/opencode-latex-render
```

OpenCode V2（运行 `opencode2`）：

```bash
opencode plugin add @vandoor2/opencode-latex-render
```

安装命令会自动拉取 npm 包并把插件写入项目级 `.opencode/opencode.json`（`-g` 时写入全局配置），同时在 `~/.cache/opencode/packages/` 缓存包及其依赖。

备选：手动安装并自行配置：

```bash
npm install @vandoor2/opencode-latex-render
```

### 3. 配置 OpenCode

使用一键安装时可跳过本步。手动安装需在 `opencode.jsonc` 中添加插件配置（OpenCode V2，复数 `plugins` 键）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@vandoor2/opencode-latex-render"]
}
```

OpenCode V1 用户请参阅下方 [OpenCode V1 支持](#opencode-v1-支持) 章节（单数 `plugin` 键）。

插件会自动完成以下工作：
- 首次加载时自动安装 Python 依赖（`pip install`，失败则阻止加载；一键安装命令本身不装 Python 依赖）
- 注册 `latex-render` 工具
- 注册 LaTeX 渲染规则 Skill

### 4. 重启并测试

插件只在 OpenCode 启动时加载。安装完成后完全退出并重新启动 OpenCode，然后输入：

```text
请输出勾股定理的公式，并渲染公式
```

模型应调用 `latex-render`，并在工具结果区域显示公式图片。

## OpenCode V1 支持

同一个 npm 包通过单包双导出同时支持 V1 与 V2：V2 读取默认导出的 `Plugin.define`（`setup`），V1 读取 `server()`。两套实现独立，互不转换。

### 配置（手动，V1）

使用 `opencode plugin` 一键安装时可跳过本步。手动安装时在 `opencode.json` 中使用单数 `plugin` 键：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vandoor2/opencode-latex-render"]
}
```

> **版本要求**：`server()` 对象入口需 **OpenCode ≥ 1.18.29**。更老的 V1 版本可能要求函数式导出，不保证加载；如需支持请使用单独的包版本。

### V1 渲染规则（AGENTS.md）

V1 没有 skill 注册 API，插件已将精简规则内嵌进 `latex-render` 工具描述。若希望模型更强制地遵守逐公式渲染规则，可将以下内容粘贴到你项目的 `AGENTS.md`：

```markdown
# LaTeX渲染规则

## 数学公式渲染

当回答包含 LaTeX 数学公式时，必须调用 `latex-render` 自定义工具渲染公式，不能只把公式作为普通文本输出。

### 规则

1. 识别 `$...$`、`$$...$$`、`\(...\)` 和 `\[...\]` 格式的数学公式。
2. 先输出文字回答，再立即为回答中的每个公式调用 `latex-render` 工具。
3. 将公式内容作为工具的 `formula` 参数传入，不要通过 shell 拼接命令。
4. 工具会返回图片附件，不要直接向终端写入图片控制序列。
5. 每次只传入一个独立公式；不要把整章公式、多个公式或包含 `aligned` 的大段内容一次传入。
6. 对 `aligned`、`align` 或多行公式，拆成多个独立公式分别调用工具。
7. 渲染失败时，保留 LaTeX 文本并说明失败原因，不要静默跳过。
```

V1 版本的 `latex-render` 工具与 V2 使用相同的 Python 渲染后端，插件加载时同样会自动安装 Python 依赖（失败时阻止加载）。

## 手动使用

即使不使用 OpenCode 插件，你也可以直接使用命令行工具：

渲染单个公式：

```bash
latex-render render "e^{i\pi} + 1 = 0"
```

解析文本中的公式并渲染：

```bash
echo '公式是 $e^{i\pi} + 1 = 0$' | latex-render parse
```

从剪贴板读取并渲染：

```bash
xclip -selection clipboard -o | latex-render parse  # Linux
pbpaste | latex-render parse                         # macOS
```

## 项目结构

```text
opencode-latex-render/
├── src/                        # 源代码
│   ├── index.ts                # 插件入口
│   ├── installer.ts            # Python 依赖自动安装
│   └── latex_term_render/      # Python 渲染和解析代码
├── .github/workflows/          # CI 与自动发布
├── tests/                      # Python 测试
├── doc/                        # 开发文档
├── package.json                # npm 包配置
├── package-lock.json           # npm 依赖锁
├── tsconfig.json               # TypeScript 配置
├── pyproject.toml              # Python 项目配置
├── setup.py                    # Python 安装脚本
├── README.md                   # 说明文档
├── CHANGELOG.md                # 更新日志
└── LICENSE                     # 许可证
```

## 依赖

- Python 3.8+
- matplotlib
- Pillow
- term-image
- click
- OpenCode（使用自动渲染功能时）

## 常见问题

### 插件加载失败

确认 `opencode.jsonc` 配置正确（V2 用复数 `plugins`，V1 用单数 `plugin`）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@vandoor2/opencode-latex-render"]
}
```

确认 Python 3 和 pip 已安装：

```bash
python3 --version
pip --version
```

### 手动命令不显示图像

检查终端协议：

```bash
latex-render info
```

推荐使用 Kitty、WezTerm 或 iTerm2。OpenCode 自动渲染使用原生图片附件，不依赖手动命令的终端图片协议。

### 依赖安装失败

Ubuntu/Debian 可以安装以下系统依赖后重试：

```bash
sudo apt install python3-dev libjpeg-dev zlib1g-dev
```

### OpenCode 显示证书错误

`unknown certificate verification error` 是 OpenCode API 或网络连接错误，与公式渲染工具无关。请检查 OpenCode 使用的模型服务地址和证书配置。

## 测试

```bash
npm run typecheck
python -m pytest tests/ -v
```

## 许可证

MIT License，详见 [LICENSE](LICENSE)。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)。
