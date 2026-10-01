<p align="center">
  <img src="https://framerusercontent.com/images/NT4xWP34VHd2Wlrk197je5BUi4.png?scale-down-to=512" width="400" alt="Rehydra" />
</p>

<p align="center">
  为 AI 工作流、编程助手和浏览器场景提供 PII 安全防护。<br/>
  检测、替换、加密，并在需要时<strong>还原</strong>真实值。
</p>

<p align="center">
  <a href="https://github.com/EightDoor/opencode-rehydra-sdk/issues">Issues</a> ·
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-rehydra-core"><img src="https://img.shields.io/npm/v/opencode-rehydra-core?color=blue" alt="npm" /></a>
  <a href="https://github.com/EightDoor/opencode-rehydra-sdk/blob/main/LICENSE"><img src="https://img.shields.io/github/license/EightDoor/opencode-rehydra-sdk" alt="license" /></a>
</p>

<p align="center">
  <code>npm i opencode-rehydra-core</code> · <code>npm i <a href="packages/opencode-plugin/">opencode-rehydar</a></code>
</p>

## 问题所在

当你把代码、消息或文档发给 LLM 时，真实姓名、邮箱和 API Key 会一并离开你的机器。已有的匿名化工具要么永久删除 PII（那样对话就断了），要么只是临时遮盖（那样模型无法推理）。

你需要的是**化名**：模型能拿来推理，你的工具又能还原回去。

## Rehydra 的做法

1. **检测** — 正则捕获结构化 PII（邮箱、电话、英国邮编、IBAN、信用卡卡号）。本地 NER 模型（ONNX，不联网）捕获非结构化 PII（人名、机构、地点）。
2. **替换** — 每个 PII 值获得一个稳定占位符：`<PII type="PERSON" id="1"/>`。模型用占位符而不是真实数据来工作。
3. **持久化** — 同一实体在整个会话的每条消息里都是同一个 ID。模型能维持关系一致性，却从未看到真实 PII。
4. **还原** — 当响应需要变回真实值时（写文件、执行 bash 命令、给出最终答案），Rehydra 从加密映射中还原原始值。

## 快速开始

### OpenCode 插件

```bash
npm install opencode-rehydar
```

在 `opencode.json` 中启用（V2 使用 `plugins` 列表）：

```json
{
  "plugins": [
    {
      "package": "opencode-rehydar",
      "options": { "envFiles": [".env", ".env.local"] }
    }
  ]
}
```

它拦截 [OpenCode](https://github.com/sst/opencode) 与 LLM 之间的对话。`.env` 文件中的密钥在离开本机前被替换为占位符，在工具执行前被还原。需要 OpenCode 的 **V2** 插件 API；不支持 V1 的 `plugin` 配置和 hook 集合。

插件会脱敏会话标题请求（`session.hook("title")`），但只对主回答还原响应（`http.response` 且 `kind === "primary"`）。因此会话标题可能显示 `<PII .../>` 占位符，建议禁用标题 agent 以避免占位符标题，详见[限制与配置](packages/opencode-plugin/README.md#session-title-limitation)。

### 作为库嵌入你的应用

上面实现背后的可高度定制内核。支持自定义 NER 模型、加密密钥提供器、会话存储提供器、标签格式等多种调整。

```typescript
import { anonymize } from 'opencode-rehydra-core';

const { anonymizedText } = await anonymize(
  'Email john.smith@acme-corp.com or call John at +41 79 123 45 67'
);
```

在 **Node.js**、**Bun** 和**浏览器**中都能运行。数据不离开你的机器。

### 代理模块

SDK 内置 `rehydra/proxy` 模块，可嵌入你自己的服务。它在出站消息上做脱敏，并在工具调用执行前还原参数，因此模型用占位符工作，而你的工具始终拿到真实值。

```typescript
import { createRehydraProxy } from "rehydra/proxy";
// 将 createRehydraProxy({ ... }) 挂载到你自己的宿主上。
```

工具结果（文件读取、bash 输出）在返回时脱敏。工具调用参数（文件写入、bash 命令）在执行前还原。

## 为什么选 Rehydra

### 可逆，而非破坏性

多数 PII 库做的是永久遮盖或删除。Rehydra 用 AES-256-GCM 加密原始值，按需还原。给模型用匿名值，给工具用还原值——完整往返，而不是单行道。

### 跨会话稳定的身份

`PERSON_1` 在整段对话的每条消息里都是 `PERSON_1`。当 John Smith 分别出现在第 1、5、20 条消息里，模型每次看到的都是同一个占位符。它能追踪关系、引用前文、产出连贯的多轮输出——而从未看到真实 PII。会话可持久化到 SQLite（服务端）、IndexedDB（浏览器）或内存，身份映射在重启后依然有效。

### 零信任，端侧运行

NER 推理通过 ONNX Runtime 在本地执行（量化模型约 280 MB）。不调用任何外部 API。可离线工作。PII 永不离开你的机器。

### 关键能力

- **密钥而不只是 PII**：除姓名、邮箱、电话外，还能检测 API Key（OpenAI、Anthropic、Stripe、AWS、GitHub 等）、JWT、私钥、数据库连接串和 `.env` 密钥。
- **面向流式**：专为 LLM token 流设计。带句子缓冲的分块系统配合 NER 重叠保留，确保 PII 跨分块边界时仍能准确检测，并提供低延迟实时流式模式。
- **服务端工具循环**：`createRehydraFetch` 支持在 `stream: true` 的 OpenAI Chat Completions 与 Anthropic Messages 请求上使用 `onToolCall`。首次响应被缓冲，其完整工具调用在回调执行前完成校验。交错调用保留各自的 ID 和参数。工具参数在本地还原，工具结果在下一次请求前脱敏。续请求使用 `stream: false`，最终响应以兼容 provider 的 SSE 返回，包含完成事件和用量信息；代价是缓冲了首包和最终 JSON，因此不保留逐 token 的生成延迟。不含工具调用的流保持原始事件。`maxToolRounds` 限制回调轮数（默认 10 轮），`maxToolResponseBytes` 限制每个缓冲响应大小（默认 8 MiB）；达到轮数上限时未执行的调用原样返回给调用方。通过 fetch 传入 `AbortSignal` 可取消缓冲或阻止后续回调，已在运行的回调需自行处理取消。被截断的调用、畸形参数和超限流会在工具执行前失败。上游 HTTP 错误保留其状态码。OpenAI 工具循环要求只有一个 completion choice。自定义 provider 可通过 `LLMContentProvider` 上的 `streamingToolLoop` 接入。
- **机器翻译的语义增强**：PII 标签上的可选性别和范围属性（`<PII type="PERSON" gender="male" id="1"/>`、`<PII type="LOCATION" scope="city" id="2"/>`）为下游系统保留语法上下文。
- **稳定的外部标签 ID**：跨独立匿名化调用管理 PII 映射的调用方，可以通过 `existingPiiMap` 预置小写字母数字 ID。这允许 ID 由被遮盖的值派生（例如用带密钥的 HMAC），而不依赖每次调用的计数器。

```typescript
const existingPiiMap = new Map([
  ['EMAIL_a4f2c9d8e7b6q', 'alice@acme.com'],
]);

const result = await anonymizer.anonymize(
  'Email alice@acme.com',
  undefined,
  policy,
  existingPiiMap,
);
// → 'Email <PII type="EMAIL" id="a4f2c9d8e7b6q"/>'
```

外部 ID 必须匹配 `[0-9a-z]+`。纯数字 ID 保留现有的数字行为。避免以识别器前缀开头（`case`、`file`、`ref`、`ticket`）的 ID，也避免连续七位或更多数字——这些形态本身可能在传入的标签里被识别成 case ID 或电话号码。

## 示例：带会话的完整往返

```typescript
import {
  createAnonymizer,
  InMemoryKeyProvider,
  SQLitePIIStorageProvider,
} from 'opencode-rehydra-core';

const keyProvider = new InMemoryKeyProvider();
const anonymizer = createAnonymizer({
  ner: {
    mode: 'quantized',              // ~280 MB 模型，首次使用时自动下载
    caseFallback: true,             // 检测 "tom" 这类小写名字
    thresholds: { PERSON: 0.8 },   // 对人名要求更高置信度
    onStatus: console.log,          // 打印模型下载进度
  },
  semantic: { enabled: true },      // 为机器翻译添加性别/范围属性
  secrets: { enabled: true },       // 检测 API Key、JWT、连接串
  keyProvider,
  piiStorageProvider: new SQLitePIIStorageProvider('./pii.db'),
});

const session = anonymizer.session('chat-123');

// 消息 1 — NER 检测人名和机构，正则捕获邮箱
const r1 = await session.anonymize(
  'Tell John Smith at Acme Corp (john.smith@acme-corp.com) we accept the offer'
);
// → "Tell <PII type="PERSON" gender="male" id="1"/> at <PII type="ORG" id="2"/>
//    (<PII type="EMAIL" id="3"/>) we accept the offer"

// 消息 2 — 同一实体跨消息保持 ID
const r2 = await session.anonymize(
  'CC john.smith@acme-corp.com and loop in admin@acme-corp.com'
);
// → "CC <PII type="EMAIL" id="3"/> and loop in <PII type="EMAIL" id="4"/>"

// 还原任意消息 — PII 映射会自动从 SQLite 加载
const original = await session.rehydrate(r2.anonymizedText);
// → "CC john.smith@acme-corp.com and loop in admin@acme-corp.com"

await anonymizer.dispose();
```

## 地址识别说明

默认正则注册表检测英国邮编语法和带门牌号的英文街道地址，例如 `34a Friskin Road`。当公寓标识与街道地址相邻时会被包含，例如 `Flat 1\n34a Friskin Road`。以邮编结尾的连续英国地址块会被整体遮盖为一个 `ADDRESS`；独立的邮编使用 `POSTAL_CODE`。裸公寓号、无门牌号的建筑以及其他国家的邮编格式需要自定义识别器或 NER。邮编匹配只检查语法，不验证该邮编当前是否仍在使用。

通过检测策略禁用 `ADDRESS` 或 `POSTAL_CODE` 即可关闭对应识别器。

## 包

| 包 | 说明 |
|---|---|
| [`opencode-rehydra-core`](https://www.npmjs.com/package/opencode-rehydra-core) | 核心 SDK —— 检测、匿名化、还原 |
| [`opencode-rehydar`](packages/opencode-plugin/) | OpenCode 插件 —— 在密钥到达 LLM provider 前脱敏 |
| [`rehydra-pi`](packages/pi-extension/) | Pi 扩展 —— 通过 `ExtensionAPI` 在 Pi 对话中保护 PII |

## 文档

- [核心 SDK 用法](#作为库嵌入你的应用)
- [OpenCode 插件](packages/opencode-plugin/README.md)
- [Pi 扩展](packages/pi-extension/README.md)
- [English](README.en.md)

## License

[MIT](LICENSE)
