<!-- 语言切换和徽章 -->
<div align="center">

# OpenCode Paper2Code 插件

[![GitHub Release](https://img.shields.io/github/v/release/mostly925/opencode-paper2code?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/mostly925/opencode-paper2code/releases)
[![npm 下载量](https://img.shields.io/npm/dt/opencode-paper2code?color=ff6b35&labelColor=black&style=flat-square)](https://www.npmjs.com/package/opencode-paper2code)
[![许可证](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](https://github.com/mostly925/opencode-paper2code/blob/master/LICENSE)
[![OpenCode 插件](https://img.shields.io/badge/OpenCode-插件-00CED1?style=flat-square&labelColor=black)](https://opencode.ai)

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

> [!NOTE]
> 本项目基于 **香港大学数据智能实验室** 的研究成果和 **[DeepCode](https://github.com/HKUDS/DeepCode)** 仓库。

## 概述

**OpenCode Paper2Code** 是一个专业的 OpenCode 插件，用于将学术论文转换为可执行、可验证的代码实现。它提供了一个结构化的 **计划→实现→验证** 工作流，内置安全边界和全面的验证机制。

## 核心特性

| | 特性 | 描述 |
| :---: | :--- | :--- |
| 🧠 | **七步工作流** | 从论文摄入到最终合并建议的结构化流程 |
| 🔒 | **安全优先设计** | 所有文件操作限制在隔离的运行目录中 |
| 📝 | **中文文档** | 所有生成的代码包含详细的中文注释 |
| ✅ | **内置验证** | 每个实现都包含测试和验证方法 |
| ⚡ | **OpenCode 原生** | 与 OpenCode 钩子、命令和插件的完全兼容性 |
| 📊 | **产物跟踪** | 全面的日志记录和产物管理 |

## 七步 Paper2Code 工作流

Paper2Code 遵循严格的七步序列，确保可靠、可复现的结果：

### 1. **初始化运行目录**
创建隔离的 `runDir` 并分配唯一的 `runId`。所有后续操作都限制在此边界内。

### 2. **论文内容提取**
摄入论文来源（URL、PDF 文件或文本）并将原始内容提取到运行目录。

### 3. **智能文档分割**
将论文分割为有语义意义的片段（算法、公式、实验）并分配唯一 ID。

### 4. **生成详细实现计划**
生成包含五个必需部分的完整 `artifacts/plan.yaml`，每个部分都引用特定片段 ID 作为证据。

### 5. **代码生成与测试**
在 `generated/` 目录中生成完整的实现代码和测试文件，包含中文注释和一致的代码风格。

### 6. **最小验证执行**
运行必要的检查以验证核心功能，并确保代码执行无误。

### 7. **最终输出与合并建议**
提供简洁的报告，包含运行目录路径、产物清单以及集成到现有项目的指导。

## 安装

### 通过 npm 安装

```bash
npm install opencode-paper2code@latest
```

### 在 OpenCode 配置中声明插件

将插件添加到项目级 `.opencode/opencode.json` 或全局 `~/.config/opencode/opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-paper2code@0.1.2"]
}
```

> **建议**：固定版本号以避免 `latest` 带来的不可控变更。

## 使用方法

### 命令行形式

```bash
opencode run --command paper2code
```

### 对话形式

您可以通过结构化输入以对话方式调用 Paper2Code：

#### 远程论文 + 要求

```
/paper2code 论文地址：https://arxiv.org/abs/2104.09864；要求：用PyTorch实现，必须有单测，注释全中文，给出训练与推理脚本
```

#### 本地论文 + 要求

```
/paper2code 论文文件：/path/to/papers/xxx.pdf；要求：先实现MVP，再补性能优化，输出README和复现实验步骤
```

#### 推荐输入结构

```text
论文来源: ...
任务要求: 1) ... 2) ... 3) ...
约束: ...（比如“不要简化核心算法”）
```

## Paper2Code 智能体

Paper2Code 智能体是一个专门配置的子智能体，具有以下特性：

- **模式**：`subagent`
- **工具**：`paper2code_*`（所有 Paper2Code 专用工具）
- **提示**：包含安全约束的完整七步工作流指令

激活后，它严格遵循七步序列，确保不跳过或缩短任何步骤。

## 安全与约束

- **文件操作**：所有写入都限制在 `runDir` 目录内
- **路径逃逸**：通过验证所有目标路径来禁止
- **输入验证**：严格的模式验证所有输入
- **产物完整性**：原子写入和内容哈希防止损坏

## 开发

### 构建

```bash
bun run build
```

### 代码检查与类型检查

```bash
bun run lint
bun run typecheck
```

### 测试

```bash
bun run test
```

## 许可证

MIT © 2025 Data Intelligence Lab, The University of Hong Kong; 2026 [mostly925](https://github.com/mostly925)

## 致谢

 **香港大学数据智能实验室** 提供的基础研究
 **[DeepCode](https://github.com/HKUDS/DeepCode)** - 本项目基于DeepCode仓库的研究
 **OpenCode** 的可扩展插件架构

---

<div align="center">
</div>
