<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./icon.svg">
  <img alt="leakshield" src="./icon.svg" width="64">
</picture>

# leakshield

> 🌐 [English](./README.md) | 繁體中文

**在把程式碼、文件、資料丟給 AI 服務之前，先掃描敏感內容的守門員。**

> **設計原則：** 預設無感、按需可觀測、在模型邊界：安全檢查失敗即阻斷。
> 後續 adapter 工作依這三條開發與驗收（[ADR 0008](docs/adr/0008-transparent-protection-and-native-ux.md)）。這是 adapter 工作的契約，不代表所有宿主目前都已做到；各宿主現況見[宿主能力矩陣](docs/host-capabilities.md)。

五種入口共用同一套掃描器與決策模型：
- **OpenCode plugin**：OpenCode v2 的強制入口檢查，作用在 content hooks；transparent 模式下也檢查最終送往 provider 的 body。
- **pi extension**：行程內的 pi extension，用共用 wire core 守住 agent 的 provider 請求，並在本機還原工具參數。
- **Claude Code proxy**（實驗性）：放在 `ANTHROPIC_BASE_URL` 後面的本機 proxy，遮罩 Anthropic Messages 請求並還原助理文字。
- **CLI**：手動或 CI 掃描文字、檔案與目錄；支援脫敏。
- **Web UI**：本機瀏覽器介面與 REST endpoint，供手動掃描。

MCP Server 模式已移除。它依賴模型在已收到相關 context 後自行決定呼叫掃描工具，無法提供模型邊界的保證。

| 入口 | 啟動方式 | 適用情境 |
|------|----------|----------|
| OpenCode plugin | 在 `opencode.json` 加入 `leakshield` 套件或 `dist` 目錄（OpenCode v2；[說明](docs/opencode.zh-TW.md)） | 自動且 fail-closed 地保護 OpenCode 模型輸入與工具輸出 |
| pi extension | `pi install npm:leakshield`（0.4.0 起；本機建置可用 `pi install /absolute/path/to/built/leakshield`；[說明](docs/pi.zh-TW.md)） | 遮罩 pi 的 provider 請求並還原 read/write/edit/bash 參數 |
| Claude Code proxy | `leakshield --claude-code-proxy`，再設定 `ANTHROPIC_BASE_URL=http://127.0.0.1:8787`（[說明](docs/claude-code.zh-TW.md)） | 遮罩 Claude Code 的模型請求並還原助理文字；工具參數尚未還原 |
| CLI | `npm run scan -- --file ./path`（全域安裝或 `npm link` 後可用 `leakshield --file ./path`） | 明確的本機或 CI 掃描；不會把內容送到模型 |
| Web UI | `npm run web` | 在 `http://localhost:3000` 手動以瀏覽器掃描 |

## 目前狀態

**實驗性，`0.x` 版本。** 已發佈到 npm（`leakshield`）：可用 `npx leakshield --help` 查看指令，或在本機建置（`npm ci && npm run build`）再讓宿主指向建置結果。在終端機不帶參數執行時，CLI 會印出用法。stdin 不是終端機時（pipe、CI 或腳本），它會讀取 stdin 直到 EOF，所以在這些環境請關閉或重導 stdin。

沒有任何一個宿主能保證敏感內容絕不會送到模型。`leakshield --doctor <host>` 會印出各宿主宣告的涵蓋範圍與殘餘缺口，[宿主能力矩陣](docs/host-capabilities.md)是彙整版。

- **OpenCode**：transparent 模式已在 OpenCode v2.0.28 搭配本機替身 provider 驗證，並用真實 OpenAI 模型驗證過一次。0.3.0 的工具還原另在 OpenCode v2.2.5 用本機替身 provider、OpenChamber 的 render 工具與 `rtk` 重新驗證（[紀錄](docs/evidence/2026-11-06-opencode-2.2.5-tool-restoration.md)）。hook-first 設定在 `--doctor` 顯示為 `PARTIAL`，hook 之後才加入的內容，以及被允許的工具外送（curl、遠端 MCP），都不在保護範圍內。詳見 [OpenCode plugin](docs/opencode.zh-TW.md)。
- **pi**：行程內 extension 包住 agent 的 `fetch`，遮罩它支援的三種 wire API，並在本機還原 read/write/edit/bash 參數。已用 pi 1.6.0 搭配錄製替身上游驗證（[紀錄](docs/evidence/2026-11-23-pi-extension.md)）；不經 fetch 的 provider（Codex WebSocket、Bedrock）會被拒絕，只有 OAuth 的帳號不支援。詳見 [pi adapter](docs/pi.zh-TW.md)。
- **Claude Code**（實驗性）：透過本機 proxy（`leakshield --claude-code-proxy`，再設定 `ANTHROPIC_BASE_URL`），已用 Claude Code 2.1.321 搭配本機替身上游驗證（[紀錄](docs/evidence/2026-11-21-claude-code-proxy.md)）。它會遮罩模型請求並還原助理文字，但還不會在工具執行時還原 placeholder。詳見 [Claude Code](docs/claude-code.zh-TW.md)。
- 尚未驗證：Windows 與 Linux 的 OS keychain 持久化（macOS 已於 2026-10-20 驗證）、真實 Anthropic provider、其他 provider 的長對話、長時間使用（[#26](https://github.com/jwcrystal/leakshield/issues/26)）。
- `0.x` 期間預設值仍可能調整，變更見 [CHANGELOG](CHANGELOG.md)。
- 驗證紀錄：[docs/evidence](docs/evidence/README.md)。漏洞請私下回報：[SECURITY.md](SECURITY.md)。授權：[Apache-2.0](LICENSE)。

---

## 快速開始

先安裝一次（Node.js 20 以上；pi extension 需要 Node.js 22.19 以上）：

```bash
npm install -g leakshield
```

接著接上你使用的宿主，再用 `leakshield --doctor <host>` 檢查。Exit code 0 代表 `PROTECTED` 或 `PARTIAL`。Doctor 在宿主之外檢查安裝，看不到執行中的 session，所以處理真實資料前，請再用合成值測一次。不要用真實憑證做這項測試。

### OpenCode v2

1. 在專案的 `opencode.json` 註冊 plugin。不設定 options 時，`mode` 預設為 `transparent`：

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield" }]
   }
   ```

2. 檢查安裝；見 [`PARTIAL` 的意思](docs/opencode.zh-TW.md#partial-的意思)：

   ```bash
   leakshield --doctor opencode
   ```

3. 執行 smoke test。它會使用暫存目錄與合成值：

   ```bash
   SMOKE_DIR="$(mktemp -d)"
   cat > "$SMOKE_DIR/opencode.json" <<'JSON'
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield", "options": { "mode": "block" } }]
   }
   JSON
   (cd "$SMOKE_DIR" && opencode run --standalone \
     "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
   rm -rf "$SMOKE_DIR"
   ```

   模型可見的訊息必須包含 LeakShield 的攔截通知，且不可包含該合成 token。

### pi

1. 安裝 pi 套件（會註冊到 `settings.packages`）：

   ```bash
   pi install npm:leakshield
   ```

2. 檢查安裝。以套件安裝時，pi 的載入順序無法驗證，所以會顯示 `PARTIAL`；想得到 `PROTECTED`，改在 `settings.extensions` 第一位註冊 extension（[直接指定路徑](docs/pi.zh-TW.md#直接指定-extension-路徑)）：

   ```bash
   leakshield --doctor pi
   ```

3. 傳一個合成值（例如 `sk-AAAAAAAAAAAAAAAAAAAA`）給 pi，確認 provider 收到的是 placeholder。支援的 provider API 見 [pi adapter](docs/pi.zh-TW.md)。

### Claude Code（實驗性）

1. 啟動 proxy 並保持執行：

   ```bash
   leakshield --claude-code-proxy        # 監聽 127.0.0.1:8787
   ```

2. 讓 Claude Code 指向它，可設在 shell，或寫進 `~/.claude/settings.json` 的 `env`：

   ```bash
   export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
   ```

3. 檢查設定：

   ```bash
   leakshield --doctor claude-code
   ```

工具呼叫參數尚未還原，繞過 base URL 的流量也不在保護範圍內，詳見 [Claude Code](docs/claude-code.zh-TW.md)。

### 只用 CLI

```bash
leakshield --file ./path/to/file
```

開始依賴任何宿主之前，請先讀[保護範圍與不保護的部分](#保護範圍與不保護的部分)。從原始碼建置與其他選項，見[安裝](#安裝)。新成員：[3 分鐘 Onboarding](docs/ONBOARDING.zh-TW.md)。

---

## 偵測範圍

| 類型 | 說明 | 嚴重度 |
|------|------|--------|
| API Key | OpenAI、Anthropic、Google、AWS、Stripe（live key） | 🔴 HIGH |
| Secret / Password | 通用密碼賦值、AWS Secret | 🔴 HIGH |
| Token | GitHub、Slack、Hugging Face、JWT、Bearer Token | 🔴 HIGH |
| 私鑰 | PEM 私鑰區塊 | 🔴 HIGH |
| DB 連線字串 | MongoDB、PostgreSQL、MySQL、Redis、ADO 格式等 | 🔴 HIGH |
| 台灣身份證字號 | 格式驗證 | 🔴 HIGH |
| 護照（MRZ） | 僅限 TD3 第 2 列：44 個大寫字元，需通過四個 ICAO 9303 檢查碼 | 🔴 HIGH |
| 美國 SSN | **Opt-in** —— 預設關閉（`rule_overrides: { "ssn-us": true }` 開啟）；只認連字號格式，並排除無效區段、群組與序號 | 🔴 HIGH |
| 台灣統一編號 | **Opt-in** —— 預設關閉（`rule_overrides: { "tw-business-no": true }` 開啟）；8 位數字，需通過除以 5 的檢查碼（2023 新制）；隨機數字約 1/5 會通過，日期也可能命中 | 🟡 MEDIUM |
| 信用卡號 | 13–19 位數字，需通過 Luhn 檢查碼 | 🔴 HIGH |
| IBAN | 緊湊或四字一組格式，需通過 mod-97 檢查碼 | 🔴 HIGH |
| 公共 IPv4 位址 | 排除私有／回環／CGNAT／保留段；超過四段的點分數字整段回報 | 🟡 MEDIUM |
| 私有 IPv4／VPN 網段 | **Opt-in** —— 預設關閉（`rule_overrides: { "private-ipv4": true }` 開啟）；網段由 `settings.private_cidrs` 指定，預設 RFC 1918 + CGNAT + link-local | 🟡 MEDIUM |
| Email 地址 | 所有 email 格式 | 🟡 MEDIUM |
| URL 內嵌憑證 | `scheme://user:password@host` —— 只遮罩 userinfo 這一段 | 🔴 HIGH |
| 台灣手機號碼 | **Opt-in** —— 預設關閉（`rule_overrides: { "phone-tw": true }` 開啟）；`09xx` 或 `+886 9xx`，可含空格或連字號；數字段是實測的誤報來源，關閉的代價是漏偵真電話 | 🟡 MEDIUM |
| 國際電話 | **Opt-in** —— 預設關閉（`rule_overrides: { "phone-intl": true }` 開啟）；`+` 加 7–15 位數字，數字之間可有一個空格或連字號；取捨同上 | 🟢 LOW |
| HTTP(S) URL | **Opt-in** —— 預設關閉（`rule_overrides: { "url": true }` 開啟） | 🟢 LOW |
| NDA 關鍵字 | 預設值加上自訂（見[設定檔](#設定檔)） | 🔴 HIGH |
| 私有域名 | 自訂（見[設定檔](#設定檔)） | 🟡 MEDIUM |

> **偵測邊界**（依 `src/rules/builtin.ts`）：通用 secret 規則只比對關鍵字 `password`、`passwd`、`secret`、`private_key`、`client_secret`，且值須 **8 字元以上**；一般的 `api_key=`／`token=` 賦值只有在值本身符合廠商格式時才會命中。無引號的值若是程式碼表達式（如 `process.env.DB_PASSWORD`、`z.string().min(6)`）會跳過，但呼叫參數中含其他字串常值時仍會回報。信用卡與 IBAN 須通過檢查碼，信用卡規則另外跳過單一數字重複的數字串和 UUID 內的數字。URL 內嵌憑證與 DB 連線字串規則會跳過 `${…}`、`{{…}}`、`<…>` 形式的佔位密碼。IP 只涵蓋公開 IPv4，超過四段的點分數字會整段回報，避免內嵌位址漏遮（因此 `2026.10.21.14.32.59` 這類點分日期也會回報）。護照只讀 MRZ 那一行，標籤後接的裸號碼要自訂規則；SSN 只認 3-2-4 連字號格式。任何規則都不涵蓋：街道／郵遞地址、日期、IPv6，以及短於 8 字元的通用 secret 賦值。SSH 遠端位址（`user@host:path`、`ssh://user@host/…`）不會回報為 email；私有域名與路徑關鍵字仍適用，`scheme://user:password@host` 的密碼部分則回報為 URL 內嵌憑證。私有 IPv4 需手動開啟，因為這種寫法也會符合版本號與時間戳；`settings.private_cidrs` 會取代預設網段，例如改成組織自己的網段，無法解析的項目會讓設定載入失敗。每條內建規則都有固定 id，可透過設定檔的 `settings.rule_overrides` 開關（[id 清單](docs/configuration.zh-TW.md#內建規則-id)；未知 id 會讓設定載入失敗）；URL 規則預設關閉，因為全面遮罩 URL 會影響 provider endpoint。`block`、`redact`、`transparent` 三種模式和所有宿主都套用同一組規則（內建規則加上你的設定檔）。

---

## 安裝

需要 Node.js 20 以上；映射持久化需要 22.13 以上，pi extension 需要 22.19 以上。

```bash
npm install -g leakshield
leakshield --help
```

`npx leakshield …` 不用安裝就能執行已發佈的套件。npm 套件只包含編譯後的程式，沒有 `config/` 目錄；要新增設定請見[設定檔](#設定檔)。

從原始碼建置：

```bash
git clone https://github.com/jwcrystal/leakshield.git
cd leakshield
npm install
npm run build
```

本機開發時，全域安裝或 `npm link` 這份 build 後即可直接使用 `leakshield`；在此 repository 內不用安裝，直接用 `npm run scan -- ...` 即可。

不想裝 Node.js 時，可以用 Bun 把 CLI 建置成單一執行檔，見[自行建置](BINARY-GUIDE.zh-TW.md#自行建置)。開發用的 npm scripts 列在 [CONTRIBUTING](CONTRIBUTING.md#npm-scripts)（英文）。

---

## 使用方式

### 保護範圍與不保護的部分

LeakShield 保護送往模型的對話內容：prompt、重播的歷史、工具輸出，以及可解析其結構的 provider 請求 body。各宿主涵蓋的程度不同，`leakshield --doctor <host>` 與[宿主能力矩陣](docs/host-capabilities.md)會列出來。它**不是**工具對外連線的防火牆：被允許的本機工具仍可透過 `curl`、遠端 MCP server 或任何其他管道把原文傳出去。要管控工具的目的地，需要 LeakShield 之外的權限層。從 0.3.0 起，`curl` 與 `http` 的參數內也可以放 placeholder，讓工具帶著受保護的值呼叫 API；這時原文會依設計離開本機。

偵測也有已知缺口：街道／郵遞地址、日期、IPv6，以及關鍵字清單之外或短於 8 字元的一般賦值都不會被偵測。信用卡與 IBAN 只有在檢查碼驗證通過時才會命中；IP 偵測只涵蓋公開 IPv4（超過四段的點分數字會整段回報，避免內嵌位址漏遮；`2026.10.21.14.32.59` 這類點分日期也會回報）；護照只讀 MRZ 那一行；美國 SSN、台灣統一編號、電話與 URL 偵測需手動開啟，見[偵測範圍](#偵測範圍)。

本機歷史、日誌與產生的檔案可能仍含原文——這裡保護的是模型邊界，不是磁碟。

---

### OpenCode plugin

OpenCode plugin 成功載入後會成為強制性整合：它會在 OpenCode 儲存或送出使用者文字給模型前掃描並攔截，清理 system prompt 與 tool definition，並在下一輪模型讀取前清理工具輸出及歷史訊息。transparent 模式（預設）下還會檢查最終送往 provider 的 body。plugin 選項或掃描設定無效時，所有受保護 hook 都會 fail closed 並中止模型請求。只支援 OpenCode v2。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "leakshield" // 或 "/絕對路徑/leakshield/dist"
      // 想改成直接攔截，加上 "options": { "mode": "block" }。
    }
  ]
}
```

模式、`PARTIAL`、附件、email 去識別化、隔離 smoke test 與 `--doctor` 檢查項目，見 [OpenCode plugin](docs/opencode.zh-TW.md)。功能說明：[Transparent 模式](docs/plugin/transparent-mode.zh-TW.md)、[Wire 保護](docs/plugin/wire-protection.zh-TW.md)、[Native WebSocket](docs/plugin/websocket.zh-TW.md)、[映射持久化](docs/plugin/persistence.zh-TW.md)、[容量與生命週期](docs/plugin/capacity.zh-TW.md)、[唯讀 env 查詢](docs/plugin/env-queries.zh-TW.md)。

---

### pi（行程內 extension）

```bash
pi install npm:leakshield      # 或：pi -e /path/to/leakshield/dist/adapters/pi/extension.js
leakshield --doctor pi         # 檢查註冊、順序與 wire API
```

pi 在建立 provider client 時才解析 `fetch`，compaction 與 branch summary 也一樣，所以包住 `globalThis.fetch` 的 extension 涵蓋的流量，與 OpenCode plugin 的 wire hook 相同。每個 provider 請求都在行程內遮罩；助理文字在回覆中還原，`read`、`write`、`edit`、`bash`、`powershell` 的參數在工具執行邊界還原。session 檔留在 pi 原本的位置，`--continue`、`--resume`、`--session` 照常運作。已用 pi 1.6.0 搭配錄製替身驗證；不經 fetch 的 provider（Codex WebSocket、Bedrock、Google auth）會被拒絕，不支援只有 OAuth 的帳號；把 extension 放在第一個載入，可避免其他 extension 拿到原始 fetch。詳見 [pi adapter](docs/pi.zh-TW.md)。

---

### Claude Code（本機 proxy，實驗性）

```bash
leakshield --claude-code-proxy                     # 監聽 127.0.0.1:8787
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787    # 或寫進 ~/.claude/settings.json 的 "env"
leakshield --doctor claude-code                    # 檢查設定
```

Proxy 會遮罩 Claude Code 送出的每個 Anthropic Messages 請求（含 `count_tokens`），還原助理 JSON 或串流文字中的 placeholder，無法遮罩的請求直接擋下，不會轉送。已用 API key 驗證；Claude Code 文件說 base URL 也適用於 claude.ai 登入，這裡尚未測試。它不會還原工具呼叫裡的 placeholder，也看不到繞過 base URL 的流量，例如 WebFetch 的網域檢查會把 hostname 送給 Anthropic。設定方式與完整的缺口清單見 [docs/claude-code.zh-TW.md](docs/claude-code.zh-TW.md)。

---

### 跨宿主

- [宿主能力矩陣](docs/host-capabilities.md)：各宿主宣告哪些模型出口與介面受保護、被拒絕、不存在或在攔截範圍外，以及新 adapter 必須滿足的不變條件
- [Agent hook 對照](docs/hooks.zh-TW.md)：OpenCode、pi、Claude Code 的 hook 設計與 API，以及可用於遮罩／還原的攔截點

#### 持久化風險須知（開啟前必讀）

映射持久化需選擇性開啟：OpenCode plugin 見[映射持久化](docs/plugin/persistence.zh-TW.md)，pi 用 `LEAKSHIELD_PI_PERSIST`（見 [Session 與持久化](docs/pi.zh-TW.md#session-與持久化)）。Claude Code proxy 只把映射放在記憶體。

- 設計為雙秘密——單獨拿到 DB 檔或金鑰都解不開，兩者同時才行。
- 備份（Time Machine、雲端同步）會複製 `SGP.db`：`forget` 無法回收備份已抄走的內容，還原備份＋尚存的金鑰可再識別舊 session——備份保留政策請一併考量。
- keychain 防**離線竊取**（偷磁碟、偷備份、複製 `SGP.db`）；不防已在你登入 session 內執行的惡意程式。
- keyfile 選項把門檻降為「同目錄樹的兩個檔案」，僅建議無 keychain 服務的伺服器/無頭環境使用。

---

### CLI 與 Web UI

```bash
leakshield --file ./src/config.ts          # 掃描檔案（也可用 --text、--dir、--stdin）
leakshield --redact --file .env --out .env.redacted
leakshield --web                           # 本機瀏覽器介面 http://localhost:3000
```

Exit code：`0` = 安全，`1` = 有命中，`2` = 路徑錯誤。選項、脫敏、編碼偵測、忽略指令、REST API、決策模型與 JSON 欄位，見 [CLI 與 Web UI](docs/cli.zh-TW.md)。

---

## 設定檔

LeakShield 會載入找到的第一個設定檔：`./config/guard.config.yaml`，接著是 LeakShield 目錄內的 `config/guard.config.yaml`（僅限原始碼建置），最後是 `~/.leakshield/guard.config.yaml`。都沒有時使用內建預設值。OpenCode plugin 另外接受 `configPath` 選項。Repo 不附 `config/guard.config.yaml`，你在那裡建立的檔案也會被 Git 忽略，關鍵字只留在本機。要新建設定檔，請複製 [`config/guard.config.example.yaml`](config/guard.config.example.yaml)，再加入自己的關鍵字與域名。列出 `nda_keywords` 會取代四個預設值（`CONFIDENTIAL`、`INTERNAL ONLY`、`DO NOT SHARE`、`NDA`）；範例檔已保留它們。

沒有 clone repo（用 npm 或執行檔安裝）時，可以直接下載範例檔到家目錄：

```bash
mkdir -p ~/.leakshield
curl -fsSL https://raw.githubusercontent.com/jwcrystal/leakshield/main/config/guard.config.example.yaml \
  -o ~/.leakshield/guard.config.yaml
leakshield --doctor   # 確認設定檔能載入
```

修改後：
- **CLI**：下次執行自動載入
- **OpenCode Plugin**：重啟 OpenCode 以重新載入 plugin 設定
- **pi extension**：重啟 pi（可用 `LEAKSHIELD_CONFIG` 指定其他檔案）
- **Claude Code proxy**：重啟 proxy（可用 `--config` 指定其他檔案）
- **Web UI**：重啟本機 server

所有欄位、內建規則 id、`.env` 精確值偵測、自訂規則與上限，見[設定參考](docs/configuration.zh-TW.md)。

---

## 文件

| 主題 | 頁面 |
|------|------|
| OpenCode plugin | [docs/opencode.zh-TW.md](docs/opencode.zh-TW.md) |
| pi extension | [docs/pi.zh-TW.md](docs/pi.zh-TW.md) |
| Claude Code proxy | [docs/claude-code.zh-TW.md](docs/claude-code.zh-TW.md) |
| CLI 與 Web UI | [docs/cli.zh-TW.md](docs/cli.zh-TW.md) |
| 設定參考 | [docs/configuration.zh-TW.md](docs/configuration.zh-TW.md) |
| 宿主能力矩陣 | [docs/host-capabilities.md](docs/host-capabilities.md) |
| 獨立執行檔 | [BINARY-GUIDE.zh-TW.md](BINARY-GUIDE.zh-TW.md) |
| 驗證紀錄 | [docs/evidence](docs/evidence/README.md) |
| 貢獻指南 | [CONTRIBUTING.md](CONTRIBUTING.md)（英文） |

## 注意事項

- 這個工具是**靜態 pattern 掃描**，無法保證 100% 覆蓋所有情況
- **高誤報情境**：長度足以命中的測試字面值（如 `password: "aaaaaaaa"`）、範例程式碼中的佔位符
- 最終判斷仍需你自己確認，工具的作用是「提醒」而非「保證」
- NDA 關鍵字請只填真正機密的詞，避免太多誤報影響使用體驗
