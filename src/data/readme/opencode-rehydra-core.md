<p align="center">
  <img src="https://framerusercontent.com/images/NT4xWP34VHd2Wlrk197je5BUi4.png?scale-down-to=512" width="400" alt="Rehydra" />
</p>

<p align="center">
  为 AI 工作流、编程助手和浏览器场景提供 PII 安全防护。<br/>
  检测、替换、加密，并在需要时<strong>还原</strong>真实值。
</p>

<p align="center">
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-rehydra"><img src="https://img.shields.io/npm/v/pi-rehydra?color=blue" alt="npm" /></a>
</p>

<p align="center">
  <code>pi install npm:pi-rehydra</code>
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

### Pi 扩展

```bash
pi install npm:pi-rehydra
```

在 `~/.pi/agent/settings.json` 中添加包声明与配置：

```json
{
  "packages": [
    { "source": "npm:pi-rehydra" }
  ],
  "rehydra": {
    "envFiles": [".env", ".env.local"],
    "redactValues": ["sk-live-abc123..."]
  }
}
```

它拦截 [Pi](https://pi.dev) 与 LLM 之间的对话：`.env` 文件中的密钥在离开本机前被替换为占位符，在工具执行前被还原。发送给模型的消息与工具结果走脱敏（`context_with_system` / `tool_result`），工具入参与最终回答走还原（`tool_call` / `message_end`）。配置项、工作钩子与限制详见 [Pi 扩展文档](packages/pi-extension/README.md)。

## 为什么选 Rehydra

### 可逆，而非破坏性

多数 PII 库做的是永久遮盖或删除。Rehydra 用 AES-256-GCM 加密原始值，按需还原。给模型用匿名值，给工具用还原值——完整往返，而不是单行道。

### 跨会话稳定的身份

`PERSON_1` 在整段对话的每条消息里都是 `PERSON_1`。当 John Smith 分别出现在第 1、5、20 条消息里，模型每次看到的都是同一个占位符。它能追踪关系、引用前文、产出连贯的多轮输出——而从未看到真实 PII。会话可持久化到 SQLite（服务端）、IndexedDB（浏览器）或内存，身份映射在重启后依然有效。

### 零信任，端侧运行

NER 推理通过 ONNX Runtime 在本地执行（量化模型约 280 MB）。不调用任何外部 API。可离线工作。PII 永不离开你的机器。

### 关键能力

- **密钥而不只是 PII**：除姓名、邮箱、电话外，还能检测 API Key（OpenAI、Anthropic、Stripe、AWS、GitHub 等）、JWT、私钥、数据库连接串和 `.env` 密钥。
- **机器翻译的语义增强**：PII 标签上的可选性别和范围属性（`<PII type="PERSON" gender="male" id="1"/>`、`<PII type="LOCATION" scope="city" id="2"/>`）为下游系统保留语法上下文。

## 地址识别说明

默认正则注册表检测英国邮编语法和带门牌号的英文街道地址，例如 `34a Friskin Road`。当公寓标识与街道地址相邻时会被包含，例如 `Flat 1\n34a Friskin Road`。以邮编结尾的连续英国地址块会被整体遮盖为一个 `ADDRESS`；独立的邮编使用 `POSTAL_CODE`。裸公寓号、无门牌号的建筑以及其他国家的邮编格式需要自定义识别器或 NER。邮编匹配只检查语法，不验证该邮编当前是否仍在使用。

通过检测策略禁用 `ADDRESS` 或 `POSTAL_CODE` 即可关闭对应识别器。

## 编号识别与执行阻断

默认的通用编号规则只识别**带显式分隔符**（空格、Tab 或连字符）**且含数字**的 `CASE` / `FILE` / `REF` / `TICKET` 编号，例如 `CASE-123456` 或 `TICKET-456789`；`CASE123456`（紧连前缀）与 `CASEABCDEF`（纯字母）不再命中。这样既保留真实的业务编号，也避免把源码里的 `case CapPower:` 这类短标识符当成编号写进占位符。需要识别其他写法时用 `createCustomIdRecognizer` 显式声明；德国编号与调用方自定义正则的行为不变。

工具参数（Pi `tool_call` 与代理内置工具循环）在本地执行前做**严格还原**：全部参数先在副本上一次性还原并校验，任何无法解析的占位符（不在本次会话映射中、残缺、映射缺失或解密失败）都会中止该次调用，而不是把 `<PII .../>` 当成真实值执行。通用文本还原与展示路径仍保持宽松语义。
需要故意写标签示例的工具（如 `write` / `edit`）可用 `allowLiteralTagsIn` 白名单显式豁免：放行无法还原的字面标签并记日志；能还原的标签在任何工具里照常还原。

占位符只能从**同一条会话的映射**中还原。Pi 扩展默认使用内存映射，进程重启后旧标签无法还原，这类调用会被阻断；需要跨重启保留时请使用持久化 key provider 与存储。
## 包

| 包 | 说明 |
|---|---|
| [`pi-rehydra`](packages/pi-extension/) | Pi 扩展 —— 在 Pi 对话中检测、替换 PII 与密钥，并在工具执行与最终回答前还原 |

## 文档

- [Pi 扩展](packages/pi-extension/README.md)
- [English](README.en.md)

## License

[MIT](LICENSE)
