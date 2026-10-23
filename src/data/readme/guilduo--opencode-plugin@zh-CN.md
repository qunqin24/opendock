[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **与 AI 并肩，组建最强队伍。**

**发起工作委托的并不只有人类。**

Guilduo 是一个 **Human × AI Work Platform**，让人类和 AI Agent 能够在同一个 workspace 中委托、负责、交接和审阅工作。它把现实工作作为 Quest 管理，并通过共享的 Relay、Evidence 和 Decision 推动工作前进。

## 公共链接

### 新用户从这里开始

- 了解 Guilduo：[官方网站](https://guilduo.com/)
- 在 Guilduo 中工作：[Guilduo / Relay Forge](https://app.guilduo.com/)
- 连接 AI 客户端：`https://mcp.guilduo.com/mcp`

| 入口 | 链接 | 用途 |
|---|---|---|
| 官方 LP | [Guilduo Landing Page](https://guilduo.com/) | 了解 Guilduo 的理念、功能和工作方式 |
| 官方 Web App | [Guilduo / Relay Forge](https://app.guilduo.com/) | 打开公开 Beta 的 Command 和 Quest 工作区 |

`/next/relay-forge/` 是 Appwrite Site 内的部署路径，并不是官方 Web App URL。Appwrite Sites 生成的 Deployment URL 和旧的 `workers.dev` URL 会保留，用于验证、兼容和 rollback。新用户的正式入口是上面的 Guilduo 域名。目前部署的候选版本是 `0.6.0-beta.8`，与带标签的 release 分开管理。

### 公共 URL 的用途

| 作用 | 正式 URL | 状态 |
|---|---|---|
| 官方网站 / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | 正式 Remote HTTP MCP endpoint |
| Appwrite API | `https://api.guilduo.com/v1` | 官方 Appwrite API endpoint（origin：`https://api.guilduo.com`） |
| Documentation (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | 静态文档 · 已发布 |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` 仅用于重定向到 `https://guilduo.com`。旧的 `workers.dev` URL 会继续用于兼容连接和 rollback。`api.guilduo.com` 用于 Appwrite API，由浏览器 Appwrite client 和 Worker 的 `APPWRITE_ENDPOINT` 使用；它不是 Worker REST `/v1` 或 MCP `/mcp` route 的公共 origin。

品牌用语和表达规范请参阅 [BRAND.md](BRAND.md)。

Guilduo 是独立项目，与 Habitica 没有合作、认可或替代关系。各产品名称和商标归其各自所有者所有。

## 公开 Beta 范围

| 项目 | 状态 |
|---|---|
| Web / PWA | 公开 Beta 的核心功能 |
| Appwrite Google 登录和设备访客存储 | 可用（认证已配置） |
| Quest CRUD、归档、Quest Tree、MP 战斗 | 可用 |
| Agent Registry、MCP 客户端绑定、Handoff | 可用 |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | 官方 Web App 的公开 Beta（Desktop / Mobile）。内部 `/next/relay-forge/` 是部署和兼容路径 |
| 9 种语言 | 根 UI 可用；Beta UI 支持主要导航 |
| Google Calendar、Google Tasks、Notion、Toggl | **Early Access / OAuth 准备中** |
| Unity Battle Lab、原生 Android/iOS、Agent 自动执行 | 待定 |

应用版本为候选版 `0.6.0-beta.8`，REST/MCP 为 `2.7.0`，数据 Schema 为 `7`。在优先保证公开 Beta 安全性并准备审核期间，外部 Provider OAuth 默认关闭。账户和用户状态正在迁移到 Appwrite。

## 设计原则

1. **人类掌握目标和最终决定**：AI 建议必须可以审阅，未经批准不得自动完成或发布。
2. **将工作与奖励分开**：通过 Quest 获得 MP，然后自行选择战斗时间和使用的指令。
3. **读取、预览、执行**：写入、批量更新和 Handoff 默认使用 dry-run。
4. **先归档，再删除**：保留历史、奖励和外部链接；不再需要的 Quest 应归档。
5. **让人类和 AI 加入同一队伍**：Astra 是伙伴角色，Agent 表示负责的角色，用户仍以账户身份独立存在。
6. **不要锁定数据**：REST、MCP、CLI 和 Web UI 使用同一个 Worker 与领域逻辑。

## 页面与数据

- `/`：当前 UI。登录前数据保存在设备上；登录后通过 Worker 与 Appwrite 同步。
- `/lp/` 和 `/lp/en/`：Guilduo 官方日文和英文 Landing Page。CTA URL 来自 Runtime Config，未设置时会安全禁用。
- `/interaction-lab/`：用于本地开发和截图的 Next 源代码 route。
- `/next/` 和 `/next/relay-forge/`：Appwrite Sites 上的实现和兼容 route。新用户的正式入口是 `https://app.guilduo.com/`，它通过基于 host 的 rewrite 在内部转发到 Relay Forge entry。桌面端只有中央 Today/Tree 列表滚动；移动端滚动整个页面。
- `https://guilduo.com/` 在同一个 Appwrite Site 中 routing 到 `/lp/`，而 `https://app.guilduo.com/` routing 到 `/next/relay-forge/`。实际 DNS 和 Rewrite 配置请参阅 [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md)。
- 视觉 source of truth 是 [`DESIGN.md`](DESIGN.md)，技术 source of truth 是 [`PROJECT_SPEC.md`](PROJECT_SPEC.md)，Next 专用差异设计是 [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md)。数值 token 见 [`design/TOKENS.json`](design/TOKENS.json)，component 见 [`design/COMPONENTS.md`](design/COMPONENTS.md)，页面构成见 [`design/SCREENS.md`](design/SCREENS.md)。
- 重新连接时恢复 Appwrite Auth 状态；如果有之前同步的数据，则继续以只读方式保留。重新连接期间不会清空 Quest 列表；UI 会显示 skeleton、重新连接按钮和写入锁定。
- Quest 完成状态和 Agent Handoff 状态分别管理。一次性 To Do 完成后归档；每日任务、习惯和重复 To Do 会在下一次出现时返回。
- 公共资料只公开显示名称、`@handle`、bio、avatar 和等级。Quest 内容、备注、UID 和 OAuth 信息保持私密。

## Appwrite / Worker 架构

| 层 | 职责 |
|---|---|
| Appwrite Sites | Web/PWA 发布 |
| Appwrite Auth / TablesDB | Google 登录以及按用户保存的 Quest 和角色状态 |
| Cloudflare Worker | REST、OAuth、MCP、Webhook 和扩展边界 |
| Cloudflare D1 | Agent Registry、MCP 连接、资料和集成元数据 |
| Cloudflare KV | OAuth state、短期 state 和 MCP client |

Token、API key 和 secret 不会存储在 Appwrite 公共 row 或浏览器 Local Storage 中。Appwrite API Key 只放在 Worker Secret 中。Agent Registry 也不会保存模型 API key、密码或执行 URL。

## MCP

稳定的连接 endpoint 是：

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` 提供54个 tool，涵盖 Quest、归档、Quest Tree、Agent Handoff、Agent Registry、资料、队伍、战斗和 Toggl Focus contract。`/mcp-next` 是面向新 SDK 的验证 lane，并增加 Resources 和 Workflow Prompts。为保持现有 client 的兼容性，日常使用请继续使用 `/mcp`。

迁移期间，旧 `workers.dev` 的 `/mcp` 仍作为兼容入口保留，但新注册和重新连接应使用上面的 `mcp.guilduo.com/mcp`。

### 使用 OAuth 注册新的 MCP 连接

此流程适用于支持 Remote HTTP MCP 和 OAuth 的 ChatGPT、Codex、Claude、OpenClaw 等 client。首次连接时请按顺序执行步骤1～6。只验证现有连接时，可从步骤7开始。

1. 如果 client 中还保留迁移前的 Guilduo / QuestForge 连接，先断开或删除。旧 OAuth Grant 和 Token 不能重复使用。
2. 打开 client 的 MCP 或 Connector 设置，注册名为 `Guilduo`、类型为 Remote HTTP MCP 的连接。
3. URL 设置为稳定版 `https://mcp.guilduo.com/mcp`。普通连接测试不要使用 `/mcp-next`。
4. 如果 client 提供认证方式选择，请选择 `OAuth`。不要输入 API Key、Bearer Token 或 Client Secret。
5. 浏览器显示“Connect to Guilduo”后，使用 Web 版 Guilduo 相同的 Appwrite 账户登录，检查请求的权限并批准。
6. 返回 MCP client，确认连接显示为 connected 或 available。此时 OAuth 已完成，但 Agent 可能还没有绑定。
7. 打开 [Guilduo / Relay Forge](https://app.guilduo.com/) 的 Connections，将已连接的 Client 绑定到目标 Agent。如果没有 Agent，请先在 Party > “Register Agent”中创建。
8. 重启或重新加载 MCP client，然后执行下面的连接测试。

通过配置文件添加 Remote MCP 的 client 可使用以下示例：

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

MCP client 会自动发现 OAuth metadata。只有在需要手动验证时才使用以下 URL。

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### 在连接测试中确认 Agent Context

请在 client 中按以下顺序确认：

1. MCP 初始化成功。
2. `tools/list` 返回54个 tool。
3. `list_registered_agents` 只返回自己的 Agent。
4. 调用 `get_current_agent_context`。

绑定 Agent 前，正常响应是 `linked: false` 且 `agent: null`。在 Connections 中绑定后，会变为 `linked: true`，并返回 `agent` 和 `effectiveScopes`。这说明 OAuth 认证、UID 分离和 Agent 绑定使用的是同一连接。

测试请求示例：

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### 排查401错误和未绑定的 Agent

| 状态 | 处理方式 |
|---|---|
| 连接后立即出现401 | 仍有旧的 OAuth 信息。删除连接，重新注册相同的 `/mcp` URL，然后重新授权。 |
| 无法从 OAuth 页面返回 | 确认使用的是与 Guilduo Web 版相同的 Appwrite 账户。也检查可能阻止返回 client 的 callback 的扩展。 |
| `linked: false` | OAuth 已成功。在 Relay Forge Connections 中将 Client 绑定到 Agent。 |
| `agents:read` 权限错误 | 重新授权连接，并在同意页面确认 Agent 读取权限。不能从 Agent 侧添加 OAuth 权限。 |
| Agent 绑定没有显示 | 重新加载 MCP client，再次执行 `get_current_agent_context`。 |

不要把 Token、API Key 或完整 UID 粘贴到连接设置或日志中。OAuth 授权后，Token 由 MCP client 和 Cloudflare KV 管理。

### AI 客户端

- ChatGPT / Codex：在 Remote MCP App 或开发者模式中注册上面的 production `/mcp` URL。
- Claude：在 Settings > Connectors 中添加 OAuth Remote MCP。
- Gemini CLI：`gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI：`copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes：在后续连接 recipe 中使用相同的 Remote HTTP MCP。

注册后，在 Relay Forge 的 **Party** 中创建或编辑 Agent，并在 **Connections** 中将已授权的 MCP client 绑定到 Agent。Agent 不能增加 MCP client 的权限。

## CLI

CLI 与 MCP 的职责不同。MCP 用于 AI tool 的发现和审批；CLI 用于人类和 CI 执行 REST/JSON 操作。

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

除非提供 `--execute`，否则写入操作只返回 dry-run 或执行计划。认证使用 `QUESTFORGE_TOKEN` 或 `--token-stdin`，不会把 Token 写入日志。一般生产用户使用 OAuth，而不是固定 API key。

## Skill / OpenAI Plugin / MCP App

- 官方 Skill：[`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- OpenAI Plugin 准备包：[`plugins/questforge/`](plugins/questforge/)
- MCP App 注册模板：[`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- 提交检查清单：[`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

Skill 会教 AI 按照读取、dry-run、确认、执行、返回 review 的顺序工作。OpenAI 官方审核不会自动完成。在公开 Beta 中完成真实账户验收、隐私和账户删除流程确认后，由运营人员从 Dashboard 提交申请。

## 9种语言

Guilduo 支持日语、英语、西班牙语、巴西葡萄牙语、法语、德语、韩语、简体中文和俄语。语言设置按设备保存，不包含在云同步中。日期、数字和排序顺序使用 Intl API。

## 外部服务路线图

当前优先建立契约并安全地呈现信息；Provider OAuth 作为 Early Access 暂缓。

1. Google Calendar：只读可用时间段
2. Google Tasks：不删除数据的双向同步
3. Toggl Track：时间记录、估算和 MP 转换
4. Notion：每日日志导出
5. Todoist、Discord / Slack：同步和通知
6. OpenClaw、Hermes Agent：连接 recipe 和 Skill 复用

首次同步必须预览，Guilduo 不会自动删除外部数据。Provider Secret 只保存在 Worker Secret 中。

## 性能与遥测

目标以 Pixel 9 级别设备为基准：LCP 不超过2.5秒、INP 不超过200ms、CLS 不超过0.1、初始压缩 JavaScript 不超过250KB。匿名遥测仅适用于明确同意的用户；不会发送 Quest 内容、备注、邮箱、UID、Token 或外部内容。已实现且允许的事件包括 Web Vitals、JavaScript 错误、同步结果、首次完成 Quest、MCP 连接和 Agent 分配。拒绝或撤回遥测后不会再发送任何内容。公开发布前，管理员必须配置 `TELEMETRY_ENDPOINT` 和 D1 migration 0006。

## 本地开发

要求 Node.js 22+ 和 Wrangler。请使用 Appwrite Console 或 MCP 管理 Appwrite resource。

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

在 PowerShell 中使用 `Copy-Item`。主要命令如下：

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

TypeScript 开发时，Worker runtime type 会根据 Wrangler 配置自动生成。`npm run typecheck` 会合并类型生成、生成结果一致性检查、显式 `any` 和 `@ts-nocheck` 检查，以及 browser、Worker、Node 和 battle prototype 的 strict type check。Vite 转换与类型检查分离，API/MCP contract 由独立 test 维护。

`v*` 标签 workflow 会核对 package version、带标签的 commit 是否为 `main` 的祖先以及 release notes，通过 CI、类型检查、测试、构建和 preview gate 后发布 GitHub 源码 Release。它不使用部署 secret，也不会自动执行生产 migration 或部署 Site、Worker。生产部署由现有手动 workflow `.github/workflows/deploy-appwrite-site.yml` / `.github/workflows/deploy-appwrite-worker.yml` 单独执行，并保留 `production` 环境保护和保留缓存的 gate。生产 Worker runtime 中仍保留直接部署的修复，尚未集成到公开源码，请勿先执行通用 Worker 部署。本体源码 Release `v0.6.0-beta.8` 与 host extensions `beta.12` 分别管理版本；Guilduo 仍处于公开 Beta。详情请参阅 [`RELEASE_SETUP.md`](RELEASE_SETUP.md)。

## 文档

- [视觉设计 source of truth](DESIGN.md)
- [技术规格](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Component specification](design/COMPONENTS.md)
- [Screen blueprints](design/SCREENS.md)
- [Asset manifest](design/ASSET_MANIFEST.md)
- [Golden references](design/reference/README.md)
- [公开 Beta 路线图](ROADMAP.md)
- [公共 URL 指南](docs/public-urls.md)
- [API / MCP / OAuth 设置](API_MCP_SETUP.md)
- [Tagged release 设置](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [隐私](PRIVACY.md)
- [条款](TERMS.md)
- [安全](SECURITY.md)
- [贡献指南](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [许可证](LICENSE)

## 许可证

Guilduo 使用 GNU AGPL-3.0-only 许可。如果通过网络提供修改后的版本，请遵守该许可证对源代码提供的要求。
