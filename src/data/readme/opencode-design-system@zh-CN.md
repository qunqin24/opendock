# OpenCode Design System

[![npm 版本](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![MIT 许可证](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**一个面向 OpenCode v2 的协作式插件，用于创建和演进可移植、与框架无关且能让 AI 智能体真正遵循的设计系统。**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **声明：** 这是一个独立的社区项目，并非由 OpenCode 团队开发，也与 OpenCode 没有任何关联。

设计系统将成为项目持久的视觉记忆：使用结构化的 **Markdown 和 JSON** 记录语义化 token、明确的偏好、设计决策、组件、模式和屏幕规范。交互式 HTML 预览由这些源文件生成，绝不是第二个事实来源。

## 为什么选择这个插件？

- **从对话开始，而不是填写问卷。** 只澄清尚不明确的重要视觉身份选择，并明确记录用户偏好。
- **记录现有设计。** 有边界的只读分析可以帮助整理现有 UI，而不会悄悄重新设计它。
- **为智能体提供相关上下文。** 按需加载与 UI 任务相关的 token、组件、模式和指南，而不是在每个提示中塞入整个系统。
- **连贯地演进系统。** 跟踪设计决策、语义 token 的依赖关系、受影响的组件和模式、状态以及设计系统版本变化。
- **避免绑定特定框架。** 权威格式是 Markdown 和 JSON，而不是 React、Vue、Tailwind 或生成的预览。
- **保护项目文件。** 分析和检查均为只读。创建操作不会替换已有的 `design-system/` 目录，并会保留根目录 `AGENTS.md` 中插件管理区块以外的内容。

## 要求

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 或更高版本**

## 安装

### 安装已发布的 npm 包

使用 OpenCode CLI 全局安装：

```sh
opencode plugin add opencode-design-system
```

若要固定到特定 npm 版本，请将 `<version>` 替换为所需版本：

```sh
opencode plugin add opencode-design-system@<version>
```

也可以在 `opencode.json` 或 `opencode.jsonc` 中为项目配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode 会在启动时加载已配置的插件。如果插件没有出现，请重启 OpenCode 或 OpenCode 服务。

### 直接从 GitHub 安装

安装默认分支的最新版本：

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

若要固定到某个 GitHub 标签版本，请将 `<tag>` 替换为所需标签：

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
```

### 使用本地检出版本

克隆仓库、安装开发依赖并构建：

```sh
npm install
npm run build
```

然后让 OpenCode 指向检出目录（请根据项目调整相对路径）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

仓库还包含一个可选的本地测试入口 `plugins/local/index.js`；它不会自动加载，也不属于 npm 包。

## 快速开始

从视觉方向创建一个系统：

```text
/design-system 一个宁静紧凑的工作空间，采用柔和的绿色和清爽的表面，不使用渐变。
```

如果项目已有 UI，可以先让智能体分析它。智能体会解释发现，并在创建任何内容前询问你是想记录现有视觉风格，还是从头开始：

```text
/design-system 分析这个应用的 UI，并帮我记录它现有的视觉语言。
```

只设计屏幕、不让插件编写 UI 代码：

```text
/design-screen 用户管理，包含搜索、筛选、邀请和空状态。
```

你也可以直接用自然语言请求屏幕规范，而不调用 `/design-screen`。如果存在 manifest，插件会引导智能体参考项目的 `AGENTS.md` 和相关设计系统指南。

## 命令

| 命令 | 功能 |
| --- | --- |
| `/design-system [idea]` | 协作创建新系统，或讨论如何记录现有 UI。 |
| `/design-system/update [change]` | 应用有版本记录的语义变更，并找出依赖文档。 |
| `/design-system/preview` | 根据结构化文件重新生成交互式预览。 |
| `/design-system/review` | 打开本地双栏工作区，展示预览、当前 OpenCode 对话并支持上下文元素选择。 |
| `/design-system/check` | 以只读启发式检查 UI 样式与已记录 token 之间可能存在的偏差。 |
| `/design-screen [screen]` | 保存可直接实施的屏幕规范，而不编写应用 UI 代码。 |

插件还会注册 `design_system_create`、`design_system_read`、`design_system_analyze`、`design_system_update`、`design_system_preview`、`design_system_check` 和 `design_system_screen_spec` 工具，供智能体按需使用。

## 工作原理

### 谨慎处理现有产品

`design_system_analyze` 工具会读取可能的 UI 和样式源文件、已识别的框架配置以及声明的依赖。它会汇总 CSS 变量、颜色、圆角、间距、响应式断点和候选组件等线索。扫描范围有限，会跳过依赖和构建目录、不跟随符号链接，也不会修改读取的文件。发现只是线索，并不能证明差异一定是错误。

智能体会解释不确定之处，并在统一重要或有歧义的视觉决策前征求意见。分析不代表获得重新设计或编辑应用代码的许可。

### 安全处理项目文件

创建操作会写入新的 `design-system/` 目录，并且只添加或更新根目录 `AGENTS.md` 中由插件管理的区块。如果 `design-system/` 已包含文件，创建操作会拒绝替换。更新会有意修改设计系统产物；内置分析和检查工具绝不会编辑应用 UI 文件。

`AGENTS.md` 中由插件管理的指南具有可移植性：它告诉 OpenCode 和其他编程智能体如何找到与框架无关的源文件，并按任务只加载必要内容。插件不会将智能体、命令或技能复制到项目中。

### 可移植的事实来源

生成的目录通常如下所示：

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # 管理区块以外的现有内容会被保留。
```

manifest 会索引主题、版本、文件，以及每个组件和模式声明的 token 引用。系统从 `0.1.0` 开始，schema 版本为 `1.0.0`；审核状态为 `draft`、`review` 或 `stable`。

Token 使用语义路径，并可定义多个主题：

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

词汇体系还可扩展到字体、布局、层级、动效、断点、焦点和状态。组件描述用途、变体、token、行为、无障碍性、响应式行为和关联关系。模式记录表单、导航、筛选器、表格和空状态等实用组合。

### 有意义的版本化更新

`/design-system/update` 会在修改系统前读取 manifest 和相关文档。默认情况下，语义 token 更新会将该路径应用于所有主题；若只修改一个主题，请使用 `themes.<name>.` 前缀。更新会记录原因、查找已声明的依赖项、更新相关文档并重新生成预览。

设计系统版本影响遵循以下规则：

- **PATCH** — 兼容性修复或文档变更。
- **MINOR** — 兼容性新增，例如新 token、组件或模式。
- **MAJOR** — 可能破坏现有设计契约的变更。

这些版本属于项目中生成的设计系统，而不是插件 npm 包。更新后的系统默认会回到 `draft`，以便人工审核。

## 内置设计 Skill

插件通过 OpenCode v2 在内部注册了三个经过改编的设计 Skill。创建或更新设计系统、选择 token、编写屏幕规范时，它们会协同使用：视觉方向、产品界面设计和无障碍 token 决策。它们用于指导代理，但不会取代项目中以 Markdown 和 JSON 为准的框架无关设计系统；这些 `SKILL.md` 文件**不会写入用户项目**。

### 自定义 Skill

使用插件选项 `designSkills` 可关闭全部或部分内置 Skill，或仅允许指定 ID。使用对象时，未指定的项目保持启用。设置 `"designSkills": false` 可关闭全部三个 Skill；传入 ID 数组则只启用列出的 Skill。若要添加个人 Skill，可将描述清晰的 `SKILL.md` 放在全局目录 `~/.config/opencode/skills/<你的-skill-id>/`。若自定义 Skill 要替代内置 Skill，请先关闭对应的内置项。若要修改内置 Skill，请在本地插件 checkout 或 fork 中编辑 `skills/<skill目录>/SKILL.md`，并加载该 checkout；保留来源署名和许可证。完整声明见 [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md)。

### 致谢

- **Frontend Design** — Anthropic；原作者 Prithvi Rajasekaran 和 Alexander Bricken。[来源](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0。
- **Interface Design** — Dammyjay93 (Damola Akinleye)。[来源](https://github.com/Dammyjay93/interface-design) · MIT。
- **Design System Auditor** — Community-Access；版权 © Taylor Arndt。[来源](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT。

## 交互式预览

`design-system/preview/index.html` 根据 manifest、token 以及组件/模式规范生成。它包含 token 示例、组件示例、多主题切换和交互式示例，并支持可见的键盘焦点及 `prefers-reduced-motion`。

使用 `/design-system/review` 打开本地评审工作区：左侧是交互式预览，右侧是同一个 OpenCode 会话。从右侧面板发送的消息会进入该会话；每轮对话完成后，生成的预览会刷新。启用**选择元素**后，可选取已记录的组件、模式或语义 token 示例，并在消息中附加最多八个经过验证的引用。引用使用 manifest 名称、源文件路径和 token 路径，而不是 DOM 选择器；发送前会再次验证，避免过期选择悄悄指向其他项目。独立 HTML 仍可使用，也无需此工作区。评审服务器仅绑定到 `127.0.0.1` 上的随机端口，在插件卸载时停止运行，并且不会向浏览器暴露 OpenCode 凭据。默认情况下，命令会在对话中发布链接，而不是自动打开浏览器。

若要在运行评审命令时自动打开系统浏览器，请配置此插件选项：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

在 OpenCode 中使用 `/design-system/preview` 重新生成预览；不使用插件时，也可以在项目根目录运行：

```sh
node design-system/tools/generate-preview.mjs
```

独立渲染器没有外部依赖。要更改系统，请编辑结构化 Markdown 和 JSON 文件，而不是生成的 HTML。

## 开发与测试

```sh
npm install
npm run typecheck
npm test
npm run build
```

测试覆盖临时项目中的集成流程，包括只读分析、创建和保留用户文件、更新受管理的 `AGENTS.md` 区块、屏幕规范、多主题 token 更新、预览、经过验证的本地评审工作区和元素引用、检查及路径安全。

## 发布版本

GitHub Actions 工作流 `Publish to npm` 会在推送 `vX.Y.Z` 标签后发布，前提是检查通过且标签与 `package.json` 中的版本一致。首次发布前，请为仓库 `BraveOtter/opencode-design-system` 和工作流 `publish.yml` 配置 npm Trusted Publishing，并允许直接执行 `npm publish`。工作流使用 OIDC，因此无需在 GitHub 中保存 npm 发布令牌；npm 还会为此公开仓库自动生成来源证明。

若要升级包版本并推送提交和标签：

```sh
npm version patch # 或 minor / major
git push --follow-tags
```

## 文档

- [OpenCode v2 插件指南](https://opencode.ai/v2/docs/build/plugins)
- [OpenCode 插件配置](https://opencode.ai/v2/docs/plugins)
- [OpenCode 命令](https://opencode.ai/v2/docs/commands)
- [OpenCode 指令和 `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [插件 API 参考](https://opencode.ai/v2/docs/api)
- [npm 包](https://www.npmjs.com/package/opencode-design-system)
- [报告问题](https://github.com/BraveOtter/opencode-design-system/issues)

## 许可证

本项目采用 [MIT 许可证](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)。
