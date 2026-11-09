# OpenCode Live Compact · 边做边压

**边工作，边控制上下文增长。**

[English](README.md) · **简体中文**

[![OpenCode 2.2.6](https://img.shields.io/badge/OpenCode-2.2.6-111827)](https://github.com/anomalyco/opencode/releases/tag/v2.2.6)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](package.json)
[![Node.js 22.18+](https://img.shields.io/badge/Node.js-%E2%89%A522.18-417E38?logo=nodedotjs&logoColor=white)](package.json)
[![MIT license](https://img.shields.io/badge/License-MIT-22C55E)](LICENSE)
[![npm](https://img.shields.io/npm/v/opencode-live-compact?color=8cdb9f)](https://www.npmjs.com/package/opencode-live-compact)

[测试结果](#测试结果) · [快速开始](#快速开始) · [工作原理](#工作原理) · [完整配置（英文）](docs/architecture.md#configuration) · [运行测试（英文）](benchmarks/README.md)

一段对话做久了，读过的文件、跑过的命令和工具输出会越积越多。**Live Compact** 是原生 OpenCode 插件：每轮成功结束后检查历史，把能安全收短的内容整理一下。这一步在本机完成，无需额外请求模型。只替换选中的内容，切点前面的前缀保持原样；整理前备份原文，备份失败就保留完整上下文。

**我们想解决的问题：不要等到上下文窗口快满了，才集中处理不断堆积的历史，让工作被一次大压缩打断。** Live Compact 在对话过程中持续寻找安全的小幅缩减机会，边做边压，控制上下文增长。

## 工作原理

```mermaid
flowchart LR
    A[一轮工作成功结束] --> B[检查上下文与可压缩历史]
    B --> C[在本地备份完整原文]
    C --> D[收短选中的内容]
    D --> E[OpenCode 保存较小的上下文窗口]
    E --> A
    C -. 备份失败 .-> F[保留完整上下文]
    style C fill:#064e3b,stroke:#34d399,color:#ecfdf5
    style D fill:#064e3b,stroke:#34d399,color:#ecfdf5
    style E fill:#064e3b,stroke:#34d399,color:#ecfdf5
```

1. **检查已完成的工作。** 默认在上下文达到 20,000 token 后开始检查。正在进行的工作和最近三个工具轮次保持完整。
2. **选择安全的小幅缩减。** 可以收短单个结果，也可以把相邻的合格内容组成一个已完成片段。当前默认每刀至少涉及 1,000 个来源 token；替换后必须同时减少估算 token 和序列化字节数。
3. **先备份，再修改。** 原文保存在私有的会话目录中。保存失败，就不应用这次压缩。
4. **保持稳定的上下文。** 推理内容、工具调用、调用与结果配对、消息顺序及切点前的前缀保持不变。OpenCode 保存并复用较小的上下文窗口。
5. **需要时恢复细节。** 检查点附有 `live_compact_recall` 引用，可以取回精确原文，无需额外调用模型生成摘要。

目标是**减少上下文增长，同时尽量保留有效的提示词缓存复用**。修改后缀仍可能产生缓存未命中，因此不能只凭输入 token 变少，就认定费用一定下降。

### 哪些内容会保留

- 用户要求、系统指令、正在进行或被中断的工作，以及最近的工具轮次。
- 推理内容、工具调用参数、标识符，以及有效的调用与结果配对。
- 不支持或无法可靠判断的输出、诊断信息、已有检查点，以及仍被使用的恢复引用。

OpenCode 的自动压缩仍然开启；原生压缩后，插件可以继续工作。切换供应商或模型时，使用 OpenCode 从原始历史重建上下文的回退机制。

[架构、安全规则与限制（英文）→](docs/architecture.md)

## 快速开始

需要 **Node.js 22.18+**；插件已在官方原版 **OpenCode 2.2.6** 上验证。

### 从 npm 安装

```sh
opencode plugin add opencode-live-compact
```

此命令将 [npm 包](https://www.npmjs.com/package/opencode-live-compact) 安装到 OpenCode 的全局配置中。安装后请重启 OpenCode。

### 从本地源码加载

```sh
git clone https://github.com/Haoming9527/opencode-live-compact.git
cd opencode-live-compact
npm ci
npm run build
```

在你使用 OpenCode 的项目中，将以下配置加入 `opencode.jsonc`：

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-live-compact"
    }
  ]
}
```

把路径换成此插件源码目录的绝对路径。Windows 可以使用 `E:/projects/opencode-live-compact` 这样的写法。然后在配置所在项目启动 OpenCode，正常工作即可。

### 默认设置

| 设置 | 默认值 |
| --- | --- |
| 开始检查上下文 | 20,000 token |
| 每刀最少涉及的来源内容 | 1,000 token |
| 普通片段大小上限 | 32,000 token |
| 检查点保留文本 | 每片段最多 8,000 个 Unicode 码点 |
| 保留最近的工具轮次 | 3 |
| 每次完成轮次最多压缩 | 3 刀 |
| 所有会话共用的恢复预算 | 256 MiB |
| 本地缩减需要的额外模型调用 | 0 |

可以在插件配置的 `options` 对象中覆盖这些默认值。[完整配置说明（英文）→](docs/architecture.md#configuration)

恢复文件按会话存放在私有目录中。新备份将超出共享预算时，先清理最旧的、已不再被引用的备份，尽量降至 80% 使用量。仍被检查点使用的原文不会删除；如果因此无法腾出空间，就保留完整上下文。

## 开发与测试

```sh
npm run typecheck
npm test
npm run test:integration
```

集成测试通过本地脚本供应商启动官方 OpenCode 2.2.6，验证轮次完成时机、前缀保留、精确恢复、重启、备份失败，以及原生压缩后的继续运行，不产生付费模型调用。

基准运行器支持四组测试：

| 测试组 | 内容 |
| --- | --- |
| Short | 6 个小型 JavaScript 任务 |
| SemVer | 10 个连续的功能开发阶段 |
| Aider Polyglot | 五种编程语言的 150 道题 |
| Web-Bench React | 构建同一个应用的 20 个依赖任务 |

[在本地或 Daytona 运行这四组测试（英文）→](benchmarks/README.md) · [发布新版本（英文）](docs/publishing.md)

## 测试结果

**150 道编程题 + 20 个相互依赖的 React 任务。** 每组测试中，两个版本各用一个连续会话，使用官方原版 OpenCode **2.2.6**、**GPT-6 Luna**，题目、顺序及默认设置一致。于 **2026 年 11 月 9 日**在 Daytona 运行。

![并排对比：两个版本均通过 Aider 150/150 和 Web-Bench 20/20。Live Compact 的估算 API 费用分别降低 3.1% 和 42.1%。](docs/assets/benchmarks-zh-CN.svg)

[Aider：日志与原始数据（英文）](benchmarks/results/2026-11-09-aider-150/README.md) · [Web-Bench：日志与原始数据（英文）](benchmarks/results/2026-11-09-webbench-react-20/README.md)

## 许可

本项目受 [DSH Live Compact](https://github.com/Tranquillitatis-Lab/dsh-live-compact) 的设计理念启发。

采用 [MIT 许可证](LICENSE)。
