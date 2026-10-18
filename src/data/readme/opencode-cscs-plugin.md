# cscs-plugin · 《NSCA-CSCS认证指南（第4版）》学习插件

OpenCode 插件：一条配置自动注册**技能 + 工具**，让 AI 助手掌握全书的章节结构，
并能按书页码现场 OCR 调取原文（答题标注出处、备考出题、关键数字核对）。

> ⚠️ **版权说明**：本插件**不包含、不分发**教材本身（版权归 NSCA 及中文版出版方）。
> 插件只分发：章节索引、要点笔记、OCR 调取工具。每位使用者需自行准备
> **自己合法获得的**书 PDF/扫描件，并在首次使用时配置路径。
> 请勿上传或分享书籍扫描件与批量 OCR 文本。
>
> **关联声明**：本项目是社区学习工具，非 NSCA 官方产品，与 NSCA 及人民邮电出版社
> 无任何隶属、合作或授权关系；"NSCA-CSCS" 名称仅用于描述学习对象与兼容性。

## 注册的内容

| 组件 | 名称 | 作用 |
|---|---|---|
| 技能 | `nsca-cscs` | 说明何时/如何用这本书回答问题（章节索引+要点提炼+引用规范）|
| 工具 | `nsca_ocr_page` | 按书页码 OCR 原文（缓存，约8秒/页） |
| 工具 | `nsca_use_book` | 配置并持久保存用户的书 PDF 路径 |

## 关于教材：没有书也能用吗？

- **有书**（自己合法获得的纸质书扫描件或电子书本地副本）：配好路径后可逐页 OCR 调取原文、标页码答题、备考出题。
- **没书**：插件照常安装。未配置路径时工具会说明情况，AI 会改用包内的**章节索引 + 要点笔记**继续辅导（不逐页调原文）。想要完整功能，请通过出版社、京东、当当等正版渠道购买纸质或电子书，用你自己拥有的副本配置路径。
- 本插件始终**不提供书文件**，不引导盗版渠道；也请勿分享扫描件与批量 OCR 文本。

## 安装

### 方式一 · 本地路径（同机试用）

把 `cscs-plugin/` 文件夹放到任意位置，在 `opencode.json` 中写：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "D:/某路径/cscs-plugin",   // 本地绝对路径也可以
      "options": { "pdf": "D:/你的书/NSCA-CSCS...---.pdf" }
    }
  ]
}
```

不传 `options.pdf` 也行：可用环境变量 `NSCA_CSCS_PDF`，或在对话里让 AI 用
`nsca_use_book` 工具记住路径（存插件存储，永久有效）。

### 方式二 · npm 发布后一行安装（推荐给所有人）

先把包发布到 npm（见下文），然后任何人的 `opencode.json` 里写：

```jsonc
{
  "plugins": ["opencode-cscs-plugin"]
  // 或带配置: [{ "package": "opencode-cscs-plugin", "options": { ... } }]
}
```

### 方式三 · 从 GitHub 克隆

```bash
git clone https://github.com/TonyStark868/cscs-plugin.git
```

然后同方式一引用克隆路径。

## 国内网络加速

大陆网络访问 `raw.githubusercontent.com` 常被重置，可用 jsDelivr 镜像直接拉取本仓库文件：

```
https://cdn.jsdelivr.net/gh/TonyStark868/cscs-plugin@main/<文件路径>
```

例如：`https://cdn.jsdelivr.net/gh/TonyStark868/cscs-plugin@main/index.ts`。
jsDelivr 有缓存，发布新版后可用 `https://purge.jsdelivr.net/gh/TonyStark868/cscs-plugin@main/<文件路径>` 强制刷新。

## 依赖（OCR 需要）

```
pip install -r cscs-plugin/skill/scripts/requirements.txt   # pymupdf + rapidocr-onnxruntime + numpy
```

未安装时 `nsca_ocr_page` 会返回带安装指引的提示。

## 生效与验证

1. 写好 `opencode.json` 后重启 OpenCode 后台服务：`opencode service restart`（注意：会结束当前会话，请在结束后再重启）
2. 开一个新会话，问一句：「NSCA 这本书里，深蹲 1RM 怎么估算？」
3. 观察 AI 自动调用 `nsca_ocr_page` 并在回答里标注书页码，即成功

## 发布到 npm（维护者操作）

```bash
npm login
npm whoami
npm publish          # 每次更新记得改 package.json 的 version
```

仓库地址已填入 `TonyStark868/cscs-plugin`；如你 fork 或改名，请同步更新。

## 与"技能包"的关系

`../nsca-cscs-skill/`（技能包）是纯文件夹形态，适合手动复制使用；
本插件是代码形态，能自动注册工具、支持 npm 分发与持久配置。
两者**内容同源**；同一台机器上如果两处都装了，技能 ID 冲突时 OpenCode
以后注册的来源为准，建议二选一保留。

## 许可

本插件代码与笔记采用 MIT 许可；不改变原书版权归属。
