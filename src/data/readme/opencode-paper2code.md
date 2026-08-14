<!-- Language switcher and badges -->
<div align="center">

# OpenCode Paper2Code

[![GitHub Release](https://img.shields.io/github/v/release/mostly925/opencode-paper2code?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/mostly925/opencode-paper2code/releases)
[![npm downloads](https://img.shields.io/npm/dt/opencode-paper2code?color=ff6b35&labelColor=black&style=flat-square)](https://www.npmjs.com/package/opencode-paper2code)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](https://github.com/mostly925/opencode-paper2code/blob/master/LICENSE)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-00CED1?style=flat-square&labelColor=black)](https://opencode.ai)

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

> [!NOTE]
> This project is based on research from the **Data Intelligence Lab at the University of Hong Kong** and the **[DeepCode](https://github.com/HKUDS/DeepCode)** repository.

## Overview

**OpenCode Paper2Code** is a professional OpenCode plugin that transforms academic papers into executable, verifiable code implementations. It provides a structured **plan→implement→verify** workflow with built-in safety boundaries and comprehensive validation.

## Key Features

| | Feature | Description |
| :---: | :--- | :--- |
| 🧠 | **Seven-Step Workflow** | Structured process from paper ingestion to final merge recommendations |
| 🔒 | **Safety-First Design** | All file operations confined to isolated run directories |
| 📝 | **Chinese Documentation** | All generated code includes detailed Chinese comments |
| ✅ | **Verification Built-in** | Each implementation includes tests and validation methods |
| ⚡ | **OpenCode Native** | Full compatibility with OpenCode hooks, commands, and plugins |
| 📊 | **Artifact Tracking** | Comprehensive logging and artifact management |

## The Seven-Step Paper2Code Workflow

Paper2Code follows a strict seven-step sequence to ensure reliable, reproducible results:

### 1. **Initialize Run Directory**
Creates an isolated `runDir` with a unique `runId`. All subsequent operations stay within this boundary.

### 2. **Paper Content Extraction**
Ingests paper sources (URLs, PDF files, or text) and extracts raw content to the run directory.

### 3. **Intelligent Document Segmentation**
Splits the paper into semantically meaningful segments (algorithms, formulas, experiments) with unique IDs.

### 4. **Generate Detailed Implementation Plan**
Produces a comprehensive `artifacts/plan.yaml` with five required sections, each referencing specific segment IDs as evidence.

### 5. **Code Generation & Testing**
Generates complete implementation code and test files in the `generated/` directory, with Chinese comments and consistent style.

### 6. **Minimal Verification Execution**
Runs essential checks to validate core functionality and ensure the code executes without errors.

### 7. **Final Output & Merge Recommendations**
Provides a concise report with run directory path, artifact inventory, and guidance for integrating into existing projects.

## Installation

### Install via npm

```bash
npm install opencode-paper2code@latest
```

### Declare the Plugin in OpenCode Config

Add the plugin to your project-level `.opencode/opencode.json` or global `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-paper2code@0.1.2"]
}
```

> **Recommendation**: Pin the version number to avoid unexpected changes from `latest`.

## Usage

### Command Line

```bash
opencode run --command paper2code
```

### Conversational Form

You can invoke Paper2Code through conversation with structured inputs:

#### Remote Paper + Requirements

```
/paper2code paper url: https://arxiv.org/abs/2104.09864; requirements: implement with PyTorch, include unit tests, all comments in Chinese, provide training and inference scripts
```

#### Local Paper + Requirements

```
/paper2code paper file: /path/to/papers/xxx.pdf; requirements: first implement MVP, then add performance optimizations, output README and reproduction steps
```

#### Recommended Input Structure

```text
Paper source: ...
Requirements: 1) ... 2) ... 3) ...
Constraints: ... (e.g., "do not simplify core algorithms")
```

## Paper2Code Agent

The Paper2Code agent is a specialized subagent configured with:

- **Mode**: `subagent`
- **Tools**: `paper2code_*` (all Paper2Code-specific tools)
- **Prompt**: Comprehensive seven-step workflow instructions with safety constraints

When activated, it strictly follows the seven-step sequence, ensuring no step is skipped or shortened.

## Safety & Constraints

- **File Operations**: All writes are confined to the `runDir` directory
- **Path Escapes**: Prohibited via validation of all target paths
- **Input Validation**: Strict schema validation for all inputs
- **Artifact Integrity**: Atomic writes and content hashing prevent corruption

## Development

### Build

```bash
bun run build
```

### Lint & Type Check

```bash
bun run lint
bun run typecheck
```

### Test

```bash
bun run test
```

## License

MIT © 2025 Data Intelligence Lab, The University of Hong Kong; 2026 [mostly925](https://github.com/mostly925)

## Acknowledgments

 **University of Hong Kong Data Intelligence Lab** for the foundational research
 **[DeepCode](https://github.com/HKUDS/DeepCode)** - This project is based on research from the DeepCode repository
 **OpenCode** for the extensible plugin architecture

---

<div align="center">
</div>
