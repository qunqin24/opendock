<div align="center">

# Gemini App2API

**你的開發工具、你的 Gemini 訂閱帳戶、零依賴原生 HTTP/2。**

透過免伺服器的獨立 In-Process 插件，或支援多帳戶池化與原生 `POST /mcp` 的純 Node.js 閘道，將你合資格的 Google Gemini 帳戶直接接上 **Pi**、**OpenClaw**、**OpenCode**、**Claude Code**、**Cursor**、**Cline**、**Roo Code**、**Codex CLI**、**MCP 客戶端**與官方 OpenAI SDK。

[![CI](https://github.com/ShawTim/gemini-app2api/actions/workflows/ci.yml/badge.svg)](https://github.com/ShawTim/gemini-app2api/actions/workflows/ci.yml)
[![pi-gemini-app on npm](https://img.shields.io/npm/v/pi-gemini-app?logo=npm&label=pi-gemini-app)](https://www.npmjs.com/package/pi-gemini-app)
[![pi-gemini-app on Pi Packages](https://img.shields.io/badge/Pi%20Packages-pi--gemini--app-6366F1)](https://pi.dev/packages/pi-gemini-app?name=pi-gemini-app)
[![openclaw-gemini-app on npm](https://img.shields.io/npm/v/openclaw-gemini-app?logo=npm&label=openclaw-gemini-app)](https://www.npmjs.com/package/openclaw-gemini-app)
[![openclaw-gemini-app on ClawHub](https://img.shields.io/badge/ClawHub-openclaw--gemini--app-F97316)](https://clawhub.ai/shawtim/plugins/openclaw-gemini-app)
[![opencode-gemini-app on npm](https://img.shields.io/npm/v/opencode-gemini-app?logo=npm&label=opencode-gemini-app)](https://www.npmjs.com/package/opencode-gemini-app)
[![mcp-gemini-app on npm](https://img.shields.io/npm/v/mcp-gemini-app?logo=npm&label=mcp-gemini-app)](https://www.npmjs.com/package/mcp-gemini-app)
![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=nodedotjs&logoColor=white)
![Zero Runtime Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-0A84FF)
![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748B)](LICENSE)

[English](README.md) · **繁體中文** · [简体中文](README.zh-CN.md) · [快速開始](#quick-start) · [連接客戶端](#connect-your-client) · [模型與配額](#quota-consumption) · [API 參考](docs/API_SUPPORT.md) · [維運指南](docs/OPERATIONS.md)

</div>

> [!IMPORTANT]
> **非官方互通性研究專案。** 與 Google 無任何關聯或背書關係。你必須以本人合資格的 Google 帳戶親自登入；本專案不分發任何憑證、Token 或 Google 二進位檔。詳閱 [DISCLAIMER.md](DISCLAIMER.md)。

---

<a id="quick-start"></a>
## 快速開始

### 路線 A — 獨立原生插件（免啟動閘道伺服器）

![gemini-app2api —— 零依賴原生擴充套件（Pi、OpenClaw、OpenCode 與 MCP）](docs/assets/extensions-overview.jpg)

<a id="pi-extension"></a><a id="openclaw-plugin"></a>

| 客戶端 | 安裝／執行指令 | 登入與查詢配額 | 套件連結與說明 |
|---|---|---|---|
| **Pi / GooeyPi** | `pi install npm:pi-gemini-app` | `/login gemini-app` · `/gemini-quota` | [npm](https://www.npmjs.com/package/pi-gemini-app) · [Pi Packages](https://pi.dev/packages/pi-gemini-app?name=pi-gemini-app) · [說明](extensions/pi/README.md) |
| **OpenClaw** | `openclaw plugins install openclaw-gemini-app` *（或 `npm:openclaw-gemini-app`）* | `openclaw models auth login --provider gemini-app` · `/usage` | [npm](https://www.npmjs.com/package/openclaw-gemini-app) · [ClawHub](https://clawhub.ai/shawtim/plugins/openclaw-gemini-app) · [說明](extensions/openclaw/README.md) |
| **OpenCode** | 於 `opencode.json` 加入 `"plugin": ["opencode-gemini-app"]` | `/connect`（`gemini-app`） | [npm](https://www.npmjs.com/package/opencode-gemini-app) · [說明](extensions/opencode/README.md) |
| **獨立 MCP（stdio）** | `npx -y mcp-gemini-app` | `npx -y mcp-gemini-app login` · `quota` | [npm](https://www.npmjs.com/package/mcp-gemini-app) · [說明](extensions/mcp/README.md) |

全部獨立擴充套件均在進程內直連原生 HTTP/2（`15s` PING 保活、`HTTPS_PROXY` 支援、256 工具宣告、並行多圖上載、免費帳號自動切換 `gemini-auto`）。

### 路線 B — 自架 OpenAI 相容與 MCP 閘道伺服器

需要 **Node.js `>= 22`**（macOS / Linux / WSL2）或 **Docker Compose**，以及具備 Gemini 存取權限的 Google 帳戶（AI Studio API Key 屬不同服務）。

**Node.js：**

```sh
git clone https://github.com/ShawTim/gemini-app2api.git && cd gemini-app2api
npm ci --omit=dev --ignore-scripts
npm start
```

**Docker Compose：**

```sh
git clone https://github.com/ShawTim/gemini-app2api.git && cd gemini-app2api
read -r -s -p '管理密碼（至少 12 字元）: ' GATEWAY_ADMIN_PASSWORD; echo
export GATEWAY_ADMIN_PASSWORD && docker compose up -d --build
```

<details>
<summary><strong>或直接執行 GHCR 預建多架構映像（<code>linux/amd64</code> &amp; <code>linux/arm64</code>）</strong></summary>

```sh
read -r -s -p '管理密碼（至少 12 字元）: ' GATEWAY_ADMIN_PASSWORD; echo
docker run -d --name gemini-app2api --init --restart unless-stopped \
  -p 127.0.0.1:18989:18989 -p 127.0.0.1:18765:18765 \
  -v gemini-gateway-state:/data \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -e GATEWAY_HOST=0.0.0.0 -e GATEWAY_CALLBACK_HOST=0.0.0.0 -e GATEWAY_ALLOW_REMOTE=1 \
  -e GATEWAY_PUBLIC_ORIGIN=http://127.0.0.1:18989 -e GATEWAY_ADMIN_PASSWORD \
  ghcr.io/shawtim/gemini-app2api:latest
```

自訂連接埠、TLS 反向代理與遠端 SSH 轉發請見[維運指南](docs/OPERATIONS.md#docker--linux-loopback-publishing--linux-docker-本機發佈)。

</details>

**於瀏覽器完成設定：** 開啟 **http://127.0.0.1:18989/admin/** → **Accounts → + Google sign-in** → 點擊 **Test** 驗證權限 → **API keys → Create key**。

---

<a id="connect-your-client"></a>
## 連接客戶端

| 設定項 | 填寫值 |
|---|---|
| **Base URL** | `http://127.0.0.1:18989/v1` *（或 Compose 內網 `http://gateway:18989/v1`／自訂 HTTPS 代理）* |
| **MCP 端點** | `http://127.0.0.1:18989/mcp` *（Streamable HTTP；可於後台 **設定** 一鍵開關；stdio 橋接可用 `bin/gemini-gateway mcp`）* |
| **API Key** | 於後台 **API keys** 建立的客戶端金鑰 *（同時驗證 `/v1/*` 與 `/mcp`）* |
| **模型** | `gemini-neon` *（旗艦 Pro；`gemini-argon` 自動別名至此）*、`gemini-hydrogen` *（高速）*、`gemini-flash-lite` |
| **端點** | `GET /v1/models` · `POST /v1/chat/completions` · `POST /v1/responses` · `POST /mcp`（[完整規格](docs/API_SUPPORT.md)） |

```sh
curl -fsS http://127.0.0.1:18989/v1/chat/completions \
  -H "Authorization: Bearer $GEMINI_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-neon","messages":[{"role":"user","content":"你好！"}]}'
```

<details>
<summary><strong>常用客戶端設定範本 — MCP（Claude Code / Cursor / Windsurf / VS Code）、Codex CLI、Cline / Roo Code、Cherry Studio、OpenAI SDK</strong></summary>

- **MCP 客戶端（Streamable HTTP — Claude Code、Cursor、Windsurf、Cline）** —— 透過閘道多帳戶池提供 `ask_gemini`、`gemini_search`、`gemini_quota` 工具（嚴格 JSON，可於管理台一鍵複製）：
  ```json
  {
    "mcpServers": {
      "gemini-app": {
        "type": "http",
        "url": "http://127.0.0.1:18989/mcp",
        "headers": {
          "Authorization": "Bearer ${GEMINI_GATEWAY_KEY}"
        }
      }
    }
  }
  ```
  - **VS Code（`.vscode/mcp.json`）：** 頂層鍵請改用 `"servers"` 並加上 `"type": "http"`。
  - **Codex CLI（`~/.codex/config.toml`）：** 請使用 `[mcp_servers.gemini_app]` 搭配 `url = "http://127.0.0.1:18989/mcp"` 與 `bearer_token_env_var = "GEMINI_GATEWAY_KEY"`。
  - **純 stdio MCP 客戶端（如 Claude Desktop）：** 執行本機部署路徑 `node /path/to/gemini-app2api/bin/gemini-gateway mcp`（設定 `GEMINI_GATEWAY_URL` + `GEMINI_GATEWAY_API_KEY`），或使用獨立版 [`extensions/mcp`](extensions/mcp/README.md)。
- **OpenAI Codex CLI（`~/.codex/config.toml`）** —— 原生 `/v1/responses` 與 `namespace` 工具：
  ```toml
  model = "gemini-hydrogen" # 或 "gemini-neon"
  model_provider = "gemini_app2api"
  model_reasoning_summary = "none"
  web_search = "disabled"

  [model_providers.gemini_app2api]
  name = "Gemini App2API"
  base_url = "http://127.0.0.1:18989/v1"
  env_key = "GEMINI_GATEWAY_KEY"
  wire_api = "responses"
  ```
- **Cline / Roo Code：** 選擇 `OpenAI Compatible`，Base URL `http://127.0.0.1:18989/v1`，模型填 `gemini-hydrogen` 或 `gemini-neon`。
- **Cursor：** Settings → Models 新增 `gemini-neon` / `gemini-hydrogen` → 開啟 Override OpenAI Base URL（若經 Cursor 雲端中繼需配置 HTTPS 隧道）。
- **Cherry Studio / Open WebUI / SDK：** 新增 OpenAI Provider 指向 `http://127.0.0.1:18989/v1`；完整範例見 [`examples/client.mjs`](examples/client.mjs) 與 [`examples/client.py`](examples/client.py)。

</details>

---

<a id="quota-consumption"></a>
## 模型與配額

| 模型別名 | 定位 | 原生模式 | 建議 `context_window` |
|---|---|---:|---|
| **`gemini-neon`** | Gemini 4 Neon 旗艦 Pro 深度推理與開發（`gemini-argon` 自動別名至此） | `PRO` (`3`) | `512,000` |
| **`gemini-hydrogen`** | Gemini 4 Hydrogen 低延遲日常推理（快 ~1.7–2.6 倍、更省額度） | `FAST` (`1`) | `512,000` |
| **`gemini-flash-lite`** | 高吞吐輕量任務 | `6` | — |

Gemini AI Pro 帳戶實測 `GetUsageInfo` 參考數據（`neon_pro_policy`，非官方 SLA 承諾）：

| 工程負載 | `gemini-hydrogen` | `gemini-neon` | Neon 倍率 |
|---|---|---|---:|
| 大型 Code Review＋全檔重寫（`thinking=2`） | 每週 `~0.12%`（`~76s`） | 每週 `~0.25%`（`~198s`） | `~2.0×` |
| 多工具 Agent 呼叫步驟（`thinking=2`） | 每週 `~0.024%`（`~8s`） | 每週 `~0.037%`（`~14s`） | `~1.56×` |
| 標準 ~14 KB 規劃輸出（`thinking=0`） | 每週 `~0.017%`（`~28s`） | 每週 `~0.086%`（`~36s`） | `~5.1×` |
| 單帳號 5 小時滾動視窗推估容量 | `~40` 次大重寫 / `~210` 次工具步 | `~20` 次大重寫 / `~135` 次工具步 | — |

---

## 為什麼選擇 Gemini App2API？

<p align="center">
  <img src="docs/assets/mgga.jpg" alt="MGGA — GigaChad 底層模型 vs 消費級受限外殼" width="320" />
  <br />
  <sub><strong>MGGA — Make Gemini Great Again：</strong>將頂級 Gemini 模型從消費級聊天外殼解放到真正的工程工具鏈。</sub>
</p>

| 比較維度 | **Gemini App2API** | 網頁版 / Cookie 爬蟲 | 桌面 App 注入 / MITM |
|---|---|---|---|
| **底層傳輸** | 純 Node.js 原生 HTTP/2（`ProcessQuery`）＋並行圖片上載 | 脆弱 DOM / 瀏覽器 Cookie | Hook 本機二進位 / 攔截 |
| **驗證與池化** | 標準 Google OAuth（`0600` 私密狀態）、多帳戶容錯與用量條 | Cookie 頻繁過期 / 驗證碼 | 綁定單一桌面 GUI 視窗 |
| **Agent 穩定性** | 256 工具 Schema 驗證、抑制幻覺工具回傳、`incomplete: true` 契約 | 無結構驗證、易死循環 | 受限於消費級功能 |
| **執行環境** | Node.js `>= 22`，**`0` 個第三方生產環境依賴** | Playwright / Python 堆疊 | 綁定系統與 App 版本 |

**核心亮點：**
- **穩定傳輸與代理支援：** `15s` HTTP/2 `PING`＋TCP 保活、零依賴 `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY` 隧道、關機重啟回傳可重試 `503 SERVER_SHUTDOWN`，以及有界自動恢復。
- **專為長流程 E2E 與 Agent 迴圈打造：** 支援最多 `256` 個工具宣告（`512 KiB` / `16,384` 節點）、結構化輸出（`json_schema` / `json_object`）、可選 `native_search` 網頁引用，以及並行 HTTP/2 多圖上載（安全護欄 `256` 張／單張 `20 MiB`＋同帳號純記憶體 `blobId` 快取）。
- **零依賴安全與三語後台：** `0700`/`0600` 私密狀態、`scrypt` 密碼雜湊、SHA-256 金鑰庫、CSRF/Origin 防護、`POST /mcp` 一鍵開關與接入範本，以及零提示詞日誌的帳戶 × 模型即時觀測後台（`English` / `繁體中文` / `简体中文`）。

![Gemini App2API 維運管理台 —— 深色主題（合成示範資料）](docs/assets/admin-v2-demo-dark-desktop.png)

<details>
<summary><strong>更多管理台截圖（淺色主題 &amp; 手機版繁體中文）</strong></summary>

| 淺色主題 —— 帳戶側欄檢視 | 手機版 —— 繁體中文介面 |
|---|---|
| ![淺色主題](docs/assets/admin-v2-demo-light-desktop.png) | ![手機版管理台](docs/assets/admin-v2-demo-zh-hk-mobile.png) |

</details>

---

## 文件索引

| 文件 | 說明 |
|---|---|
| [Pi 擴充套件（`extensions/pi/README.md`）](extensions/pi/README.md) | 適用於 Pi Coding Agent 與 GooeyPi 的獨立 `pi-gemini-app` 插件 |
| [OpenClaw 插件（`extensions/openclaw/README.md`）](extensions/openclaw/README.md) | 適用於 OpenClaw 與 ClawHub 的獨立 `openclaw-gemini-app` Provider 插件 |
| [OpenCode 插件（`extensions/opencode/README.md`）](extensions/opencode/README.md) | 適用於 OpenCode（Bun 與 Node）的獨立 `opencode-gemini-app` 原生 Provider 插件 |
| [MCP 伺服器（`extensions/mcp/README.md`）](extensions/mcp/README.md) | 獨立 stdio MCP 伺服器（`ask_gemini`、`gemini_search`、`gemini_quota`） |
| [API 支援規格（`docs/API_SUPPORT.md`）](docs/API_SUPPORT.md) | 端點、工具、結構化輸出、圖片、`native_search` 與錯誤代碼 |
| [維運指南（`docs/OPERATIONS.md`）](docs/OPERATIONS.md) | `.env` 設定、Docker Compose、TLS 反向代理、`launchd` 與疑難排解 |
| [完成與失敗語義（`docs/COMPLETION_CONTRACT.md`）](docs/COMPLETION_CONTRACT.md) | 部分輸出保留、零輸出 `GENERATION_FAILED` 與 Agent 迴圈安全 |
| [帳戶生命週期（`docs/ACCOUNT_LIFECYCLE.md`）](docs/ACCOUNT_LIFECYCLE.md) · [限額與鎖定（`docs/LOCKS_AND_LIMITS.md`）](docs/LOCKS_AND_LIMITS.md) | OAuth、ToS 條款、配額遙測、並行與負載邊界 |
| [測試契約（`docs/CURRENT_CONTRACT_TESTS.md`）](docs/CURRENT_CONTRACT_TESTS.md) · [安全性（`SECURITY.md`）](SECURITY.md) · [更新紀錄（`CHANGELOG.md`）](CHANGELOG.md) | 離線 E2E 測試集、安全模型與版本歷史 |

---

<div align="center">

[MIT 授權](LICENSE) · [免責聲明](DISCLAIMER.md) · [安全政策](SECURITY.md) · [貢獻指南](CONTRIBUTING.md)

<sub>非官方自架互通性軟體。不分發任何 Google 二進位檔、憑證、Token、帳戶或模型額度。</sub>

</div>
