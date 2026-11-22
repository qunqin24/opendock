<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./icon.svg">
  <img alt="leakshield" src="./icon.svg" width="64">
</picture>

# leakshield

> 🌐 [English](./README.md) | 繁體中文

**在把程式碼、文件、資料丟給 AI 服務之前，先掃描敏感內容的守門員。**

支援三種使用模式：
- **OpenCode Plugin**：OpenCode 的強制入口檢查；OpenCode 要把內容送往模型時使用。
- **CLI**：手動或 CI 掃描文字、檔案與目錄；支援脫敏。
- **Web UI**：本機瀏覽器介面與 REST endpoint，供手動掃描。

MCP Server 模式已移除。它依賴模型在已收到相關 context 後自行決定呼叫掃描工具，無法提供 plugin 的安全邊界。

| 模式 | 啟動方式 | 適用情境 |
|------|----------|----------|
| OpenCode Plugin | 在 `opencode.json` 加入 `leakshield` 套件或 `dist` 目錄（OpenCode v2） | 自動且 fail-closed 地保護 OpenCode 模型輸入與工具輸出 |
| CLI | `npm run scan -- --file ./path`（全域安裝或 `npm link` 後可用 `leakshield --file ./path`） | 明確的本機或 CI 掃描；不會把內容送到模型 |
| Web UI | `npm run web` | 在 `http://localhost:3000` 手動以瀏覽器掃描 |

## 目前狀態

**實驗性，`0.x` 版本。** 已發佈到 npm（`leakshield`）：可用 `npx leakshield --help` 查看指令，或在本機建置（`npm ci && npm run build`）再讓 OpenCode 指向 `dist` 目錄。沒有參數也沒有輸入時，CLI 會等待 stdin。

- Transparent 模式已在 OpenCode v2.0.28 搭配本機替身 provider 驗證，並用真實 OpenAI 模型驗證過一次。0.3.0 的工具還原另在 OpenCode v2.2.5 用本機替身 provider、OpenChamber 的 render 工具與 `rtk` 重新驗證（[紀錄](docs/evidence/2026-11-06-opencode-2.2.5-tool-restoration.md)）。它**不保證**敏感內容絕不會送到模型：建議的 hook-first 設定在 `--doctor` 顯示為 `PARTIAL`，hook 之後才加入的內容，以及被允許的工具外送（curl、遠端 MCP），都不在保護範圍內。
- Claude Code 透過本機 proxy 支援（`leakshield --claude-code-proxy`，再設定 `ANTHROPIC_BASE_URL`），已用 Claude Code 2.1.321 搭配本機替身上游驗證（[紀錄](docs/evidence/2026-11-21-claude-code-proxy.md)）。它會遮罩模型請求並還原助理文字，但還不會在工具執行時還原 placeholder，詳見 [Claude Code](docs/claude-code.zh-TW.md)。
- 尚未驗證：Windows 與 Linux 的 OS keychain 持久化（macOS 已於 2026-10-20 驗證）、真實 Anthropic provider、其他 provider 的長對話、長時間使用（[#26](https://github.com/jwcrystal/leakshield/issues/26)）。
- `0.x` 期間預設值仍可能調整，變更見 [CHANGELOG](CHANGELOG.md)。
- 驗證紀錄：[docs/evidence](docs/evidence/README.md)。漏洞請私下回報：[SECURITY.md](SECURITY.md)。授權：[Apache-2.0](LICENSE)。

---

## 快速開始

需要 OpenCode v2 與 Node.js 20 以上。

1. 安裝：

   ```bash
   npm install -g leakshield
   ```

2. 在專案的 `opencode.json` 註冊 plugin。不設定 options 時，`mode` 預設為 `transparent`：

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield" }]
   }
   ```

3. 檢查安裝。Exit code 0 代表 `PROTECTED` 或 `PARTIAL`；請見 [`PARTIAL` 的意思](#partial-的意思)。這項檢查看不到執行中的 session，所以也要跑第 4 步。

   ```bash
   leakshield --doctor
   ```

4. 執行 smoke test。它會使用暫存目錄與合成值，不會使用真實憑證：

   ```bash
   SMOKE_DIR="$(mktemp -d)"
   cat > "$SMOKE_DIR/opencode.json" <<'EOF'
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [{ "package": "leakshield", "options": { "mode": "block" } }]
   }
   EOF
   (cd "$SMOKE_DIR" && opencode run --standalone \
     "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
   rm -rf "$SMOKE_DIR"
   ```

   模型可見的訊息必須包含 LeakShield 的攔截通知，且不可包含該合成 token。不要用真實憑證執行此測試。

開始依賴它之前，請先讀[保護範圍與不保護的部分](#保護範圍與不保護的部分)。從原始碼建置與其他選項，見[安裝](#安裝)與 [OpenCode Plugin](#opencode-plugin建議使用)。新成員：[3 分鐘 Onboarding](docs/ONBOARDING.zh-TW.md)。

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
| 信用卡號 | 13–19 位數字，需通過 Luhn 檢查碼 | 🔴 HIGH |
| IBAN | 緊湊或四字一組格式，需通過 mod-97 檢查碼 | 🔴 HIGH |
| 公共 IPv4 位址 | 排除私有／回環／CGNAT／保留段；超過四段的點分數字整段回報 | 🟡 MEDIUM |
| 私有 IPv4／VPN 網段 | **Opt-in** —— 預設關閉（`rule_overrides: { "private-ipv4": true }` 開啟）；網段由 `settings.private_cidrs` 指定，預設 RFC 1918 + CGNAT + link-local | 🟡 MEDIUM |
| Email 地址 | 所有 email 格式 | 🟡 MEDIUM |
| URL 內嵌憑證 | `scheme://user:password@host` —— 只遮罩 userinfo 這一段 | 🔴 HIGH |
| 台灣手機號碼 | **Opt-in** —— 預設關閉（`rule_overrides: { "phone-tw": true }` 開啟）；數字段是實測的誤報來源，關閉的代價是漏偵真電話 | 🟡 MEDIUM |
| 國際電話 | **Opt-in** —— 預設關閉（`rule_overrides: { "phone-intl": true }` 開啟）；取捨同上 | 🟢 LOW |
| HTTP(S) URL | **Opt-in** —— 預設關閉（`rule_overrides: { "url": true }` 開啟） | 🟢 LOW |
| NDA 關鍵字 | 自訂（見 config/guard.config.yaml） | 🔴 HIGH |
| 私有域名 | 自訂（見 config/guard.config.yaml） | 🟡 MEDIUM |

> **偵測邊界**（依 `src/rules/builtin.ts`）：通用 secret 規則只比對關鍵字 `password`、`passwd`、`secret`、`private_key`、`client_secret`，且值須 **8 字元以上**；一般的 `api_key=`／`token=` 賦值只有在值本身符合廠商格式時才會命中。無引號的值若是程式碼表達式（如 `process.env.DB_PASSWORD`、`z.string().min(6)`）會跳過，但呼叫參數中含其他字串常值時仍會回報。信用卡與 IBAN 須通過檢查碼，信用卡規則另外跳過單一數字重複的數字串和 UUID 內的數字。URL 內嵌憑證與 DB 連線字串規則會跳過 `${…}`、`{{…}}`、`<…>` 形式的佔位密碼。IP 只涵蓋公開 IPv4，超過四段的點分數字會整段回報，避免內嵌位址漏遮（因此 `2026.10.21.14.32.59` 這類點分日期也會回報）。任何規則都不涵蓋：街道／郵遞地址、日期、IPv6，以及短於 8 字元的通用 secret 賦值。SSH 遠端位址（`user@host:path`、`ssh://user@host/…`）不會回報為 email；私有域名與路徑關鍵字仍適用，`scheme://user:password@host` 的密碼部分則回報為 URL 內嵌憑證。私有 IPv4 需手動開啟，因為這種寫法也會符合版本號與時間戳；`settings.private_cidrs` 可縮小到組織自己的網段，無法解析的項目會讓設定載入失敗。每條內建規則都有固定 id，可透過 `config/guard.config.yaml` 的 `settings.rule_overrides` 開關（未知 id 會讓設定載入失敗）；URL 規則預設關閉，因為全面遮罩 URL 會影響 provider endpoint。`block`、`redact`、`transparent` 三種模式都套用同一組規則（內建加 `config/guard.config.yaml`）。

---

## 決策模型

每次掃描都會產生一個**決策**，告訴呼叫端該如何處理內容：

| 決策 | 時機 | 風險等級 | 意義 |
|------|------|----------|------|
| `ALLOW` | 沒有發現 | LOW | 內容乾淨，可安全送出 |
| `WARN` | 只有 LOW 嚴重度的發現 | MEDIUM | 偵測到次要項目，顯示提醒，內容仍可送出 |
| `CONFIRM` | 有 MEDIUM 或 HIGH 的發現 | HIGH / CRITICAL | 偵測到敏感內容，使用者必須明確確認 |

### CONFIRM 的處理方式

決策為 `CONFIRM` 時，CLI 是非互動式的：會印出警告卡片與下一步提示，不會請你選擇。提示會建議使用 `--format json`（讀取 `redactedContent`）或 `--redact`（輸出脫敏版本）。Exit code `1` 表示內容已被攔截。

`CONFIRM` 決策包含：
- `recommendedAction`：`REVIEW`（MEDIUM 發現）或 `BLOCK`（HIGH 發現）
- `safePreview`：圍繞第一個發現的遮罩摘錄
- `redactedContent`：所有敏感片段都已取代的完整內容

無法精確定位敏感片段時（例如編碼片段中夾了零寬字元），不會有 `safePreview` 和 `redactedContent`。欄位不存在代表沒有可用的安全版本。

### JSON 輸出欄位

使用 `--format json` 時，輸出包含以下與決策相關的欄位：

| 欄位 | 說明 |
|------|------|
| `decision` | `ALLOW`、`WARN` 或 `CONFIRM` |
| `riskLevel` | `LOW`、`MEDIUM`、`HIGH` 或 `CRITICAL` |
| `recommendedAction` | `REVIEW` 或 `BLOCK`（僅 CONFIRM） |
| `findings` | 已清理的發現陣列（不含內部中繼資料） |
| `safePreview` | 遮罩摘錄（僅 CONFIRM；可能不存在） |
| `redactedContent` | 完整的脫敏文字（僅 CONFIRM；可能不存在） |

---

## 安裝

需要 Node.js 20 以上；映射持久化需要 22.13 以上。

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

### npm scripts 速查

| 指令 | 說明 |
|------|------|
| `npm run build` | 先清除再編譯 TypeScript → `dist/` |
| `npm run clean` | 移除 `dist/` |
| `npm start` | 執行已 build 的 CLI（`node dist/cli.js --cli`） |
| `npm run dev` | CLI 模式（不需先 build） |
| `npm run scan` | CLI 掃描（不需先 build） |
| `npm run web` | 啟動本機 Web UI（不需先 build） |
| `npm test` | 執行單元測試 |
| `npm run test:watch` | 以 watch 模式執行測試 |
| `npm run binary` | 建置當前平台的獨立執行檔（macOS ARM） |
| `npm run binary:win` | 跨編譯 Windows x64 |
| `npm run binary:linux` | 跨編譯 Linux x64 |
| `npm run binary:mac-intel` | 跨編譯 macOS Intel |
| `npm run binary:win-icon` | 建置帶圖示的 Windows 執行檔（`scripts/build-win.js`） |
| `npm run binary:all` | 一次建置所有平台 |
| `npm run bundle:mac` | 建置執行檔並打包 macOS bundle（`scripts/bundle-mac.sh`） |

---

## 獨立執行檔

無法使用 Node.js 或 npm？用 [Bun](https://bun.sh) 建置成單一執行檔，目標機器不需任何 runtime。

```bash
# 一鍵建置當前平台
npm run binary

# 跨平台編譯
npm run binary:win     # Windows x64  → leakshield.exe
npm run binary:linux   # Linux x64    → leakshield-linux
npm run binary:all     # 全平台
```

或直接用 Bun：

```bash
bun build --compile --target=bun-windows-x64 ./src/cli.ts --outfile=leakshield.exe
```

產出單一執行檔，直接交給任何人，無任何相依套件。

### 自訂設定（binary 與 npm 使用者）

執行檔與 npm 套件都可直接使用內建預設值。若要自訂規則（NDA 關鍵字、私有網域、自訂正則），將設定檔放在以下任一位置：

| 位置 | 範圍 |
|------|------|
| `./config/guard.config.yaml` | 當前工作目錄 |
| `~/.leakshield/guard.config.yaml` | 所有位置（家目錄） |

```bash
# 快速開始：從此 repository 複製 config/guard.config.example.yaml，
# 再替換其中的範例關鍵字與域名
mkdir -p ~/.leakshield
cp config/guard.config.example.yaml ~/.leakshield/guard.config.yaml

# 或依專案放置
mkdir -p ./config
# 編輯 ./config/guard.config.yaml
```

詳見[設定](#設定檔)章節。

---

## 使用方式

### OpenCode Plugin（建議使用）

OpenCode plugin 成功載入後會成為強制性整合：它會在 OpenCode 儲存或送出使用者文字給模型前掃描並攔截，清理 system prompt 與 tool definition，並在下一輪模型讀取前清理工具輸出及歷史訊息。它會固定啟用編碼內容偵測。plugin 選項或掃描設定無效時，所有受保護 hook 都會 fail closed 並中止模型請求。受限的 SHA-256 決策快取會避免重複掃描未變動歷史，同時不保留原文或脫敏後內容。

Transparent 模式細節見[編碼內容與 tool schema](docs/plugin/transparent-mode.zh-TW.md#編碼內容與-tool-schema)。

LeakShield 只支援 OpenCode v2：v2 載入套件的 `id` + `setup(ctx)` 定義。OpenCode v1 已不再支援：v1 host 載入此套件時會得到 fail-closed 的 hooks，中止每一個模型請求，`leakshield --doctor` 也會回報 `BROKEN`。請升級到 OpenCode v2。

**OpenCode v2** — 將 `plugins` 指向已發佈的套件，或本機 build 的 `dist` 目錄：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "leakshield" // 或 "/絕對路徑/leakshield/dist"
      // 不設定 options 時，v2 的 mode 預設為 "transparent"。
      // 想改成直接攔截，加上 "options": { "mode": "block" }。
    }
  ]
}
```

注意 v2 只接受 plugin「目錄」（會解析 `dist/index.js`）或套件名稱；指向單一 `.js` 檔的 `file://` URL 會被拒絕，並出現 `configured plugin path must be a directory`。

`mode` 的預設值是 **`transparent`**（見 [Transparent 模式](docs/plugin/transparent-mode.zh-TW.md)）。`block` 會用不含機敏值的攔截訊息替換危險內容；想使用這個行為，請設定 `"mode": "block"`。只有在你明確希望已辨識的直接命中改為 `[REDACTED_TYPE]` 佔位符時，才設定 `mode: "redact"`。`--doctor` 會顯示實際生效的 mode，沒有設定時會標示 `(default)`。

#### `PARTIAL` 的意思

`leakshield --doctor` 在兩種狀態下 exit 0。它們是安裝層的結果，不保證敏感內容絕不會送到模型。

| 狀態 | 設定 | 意思 |
|------|------|------|
| `PROTECTED` | `block` 或 `redact`，或 transparent 且 `wireProtection` 省略或為 `true`（v2 預設） | 安裝層檢查通過。transparent 模式下也會驗證最終的 HTTP body 或支援的 WS frame |
| `PARTIAL` | Transparent 且 `wireProtection: false`（[hook-first 範本](config/opencode.hook-first.example.json)） | 不檢查最終出站 HTTP body |

`PARTIAL` 時：

- 後續新增內容／附件可能未遮罩，即使設定 `attachments: "block"`。
- **Hook 內無法遮罩的輸入仍拒絕該次請求**；不是靜默放行原文。

兩種層級的說明見 [Wire 保護](docs/plugin/wire-protection.zh-TW.md)。

#### 詳細說明

- [Transparent 模式](docs/plugin/transparent-mode.zh-TW.md): 佔位符、支援的協定、工具參數還原（依欄位判斷、`code`／`script` 欄位、Code Mode、`curl`、`rtk`）、重啟限制
- [Wire 保護](docs/plugin/wire-protection.zh-TW.md): hook-only 與 final wire 兩種層級、AI SDK provider、拒絕、回覆端復原
- [Native WebSocket](docs/plugin/websocket.zh-TW.md): 實驗性的 Responses-family 支援與限制
- [映射持久化](docs/plugin/persistence.zh-TW.md): 選擇性開啟的加密儲存、金鑰保管、清除
- [容量與生命週期](docs/plugin/capacity.zh-TW.md): 預算、session 上限、保留
- [唯讀 env 查詢](docs/plugin/env-queries.zh-TW.md): 選擇性開啟、不回傳 value 的設定查詢工具

#### 持久化風險須知（開啟前必讀）

映射持久化需選擇性開啟，見[映射持久化](docs/plugin/persistence.zh-TW.md)。

- 設計為雙秘密——單獨拿到 DB 檔或金鑰都解不開，兩者同時才行。
- 備份（Time Machine、雲端同步）會複製 `SGP.db`：`forget` 無法回收備份已抄走的內容，還原備份＋尚存的金鑰可再識別舊 session——備份保留政策請一併考量。
- keychain 防**離線竊取**（偷磁碟、偷備份、複製 `SGP.db`）；不防已在你登入 session 內執行的惡意程式。
- keyfile 選項把門檻降為「同目錄樹的兩個檔案」，僅建議無 keychain 服務的伺服器/無頭環境使用。

**僅限 OpenCode v2 — Email 去識別化試驗：** 選擇性開啟的 `deidentify` 選項（必須搭配 `mode: "redact"`）會將重複出現的 MEDIUM 等級 email 命中改為穩定且不透明的 `[SG-EMAIL-…]` 佔位符，讓 agent 能關聯多筆記錄而不會看到原始地址。對應金鑰在每次 plugin setup（即一個 OpenCode session）產生一次、僅存在記憶體、永不持久化——佔位符在同一個 live session 內穩定，重新啟動後即改變，且不存在反查映射。其他行為維持不變：HIGH 憑證仍會被脫敏或攔截，截斷、編碼或無法驗證的內容會攔截整個單元。

```jsonc
{ "package": "/絕對路徑/leakshield/dist", "options": { "mode": "redact", "deidentify": true } }
```

附件：transparent 模式支援 `attachments` 政策（複數；`attachment` 不會被辨識）。**`"block"`（預設）** 會在 content hooks 略過 media／file parts 並以通知文字取代，模型讀不到這些被略過的圖片。Final wire 保護也會拒絕 wire 上殘留的附件 part；hook-first 不檢查後續才加入的附件。**`"allow"`** 會將附件未掃描送出並附加一則可見通知——這是明確的決定，代表你為附件內容作保（`"allow"` 需搭配 `mode: "transparent"`）。block／redact 模式下附件照舊攔截。既有對話可能重播原文，受[重啟限制](docs/plugin/transparent-mode.zh-TW.md#重啟限制)影響；開新對話不能取代驗證復原。此 plugin 僅保護 OpenCode 發出的模型請求，不涵蓋其他 AI client 或本機工具。

OpenCode 目前會記錄並跳過在 plugin factory 執行前就載入失敗的模組，例如套件缺失或 JavaScript 語法錯誤。安裝或升級後，請先用 `sk-` 加至少 20 個英數字元的合成測試 key 執行 smoke test，確認訊息已被 LeakShield 替換，再處理真實機敏資料。

#### 隔離 smoke test（OpenCode v2）

在專案根目錄執行下列指令。它會使用暫存工作目錄與合成值，不會使用真實憑證：

```bash
npm run build
SMOKE_DIR="$(mktemp -d)"
PROJECT_DIR="$(pwd)"
cat > "$SMOKE_DIR/opencode.json" <<EOF
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "$PROJECT_DIR/dist", "options": { "mode": "block" } }
  ]
}
EOF
(cd "$SMOKE_DIR" && opencode run --standalone \
  "Smoke test only. Do not reveal or use this token: sk-AAAAAAAAAAAAAAAAAAAA")
rm -rf "$SMOKE_DIR"
```

模型可見的訊息必須包含 LeakShield 的攔截通知，且不可包含該合成 token。不要用真實憑證執行此測試。

要測試已發佈的套件時，可用 `"leakshield"` 取代上述本機 `dist` 路徑。

#### 自動安裝檢查：`--doctor`

```bash
leakshield --doctor     # 全域安裝或 npm link 後；在 repo 內可用 npm run scan -- --doctor
```

Doctor 不會把任何內容送出去。它會檢查 OpenCode host 版本、讀取 OpenCode 會套用的 `opencode.json` 或 `opencode.jsonc`（`.opencode/`、專案根目錄和一個全域目錄）、依 host 的方式合併其中的 `plugins` 陣列、確認 LeakShield 已用 plugin 本身接受的選項註冊、確認本機 `dist` 進入點真的存在（缺少時 OpenCode 會靜默記錄並跳過 plugin：session 看起來正常但沒有保護）、載入 guard 設定，並在本機跑合成 canary 的 smoke scan。Exit code 0 代表 `PROTECTED` 或 `PARTIAL`（`wireProtection: false`：不檢查最終出站 HTTP body）；v1 host 會回報 `BROKEN`，修正方式是升級到 OpenCode v2；其他狀態會印出失敗的檢查項與具體修正方式，plugin 未註冊時還會附上可直接複製的註冊片段。另有 `Claude Code:` 區段檢查 [Claude Code proxy](docs/claude-code.zh-TW.md) 的設定；即使沒有 OpenCode，只要 Claude Code 經過執行中的 LeakShield proxy，結束碼也是 0。

Doctor 是在 host 之外執行的安裝層檢查，看不到執行中的 session。執行期的證明來自上面的 smoke test 或 `scripts/e2e/run-boundary.mjs`。

### 保護範圍與不保護的部分

LeakShield 保護送往模型的對話內容：prompt、重播的歷史、工具輸出，以及（transparent 模式下）可解析其結構的 provider 請求 body。它**不是**工具對外連線的防火牆：被允許的本機工具仍可透過 `curl`、遠端 MCP server 或任何其他管道把原文傳出去。要管控工具的目的地，需要此 plugin 之外的權限層。從 0.3.0 起，`curl` 與 `http` 的參數內也可以放 placeholder，讓工具帶著受保護的值呼叫 API；這時原文會依設計離開本機。

偵測也有已知缺口：街道／郵遞地址、日期、IPv6，以及關鍵字清單之外或短於 8 字元的一般賦值都不會被偵測。信用卡與 IBAN 只有在檢查碼驗證通過時才會命中；IP 偵測只涵蓋公開 IPv4（超過四段的點分數字會整段回報，避免內嵌位址漏遮；`2026.10.21.14.32.59` 這類點分日期也會回報）；URL 偵測存在但需手動開啟，見[偵測範圍](#偵測範圍)。

本機歷史、日誌與產生的檔案可能仍含原文——這裡保護的是模型邊界，不是磁碟。

---

### Claude Code（本機 proxy）

```bash
leakshield --claude-code-proxy                     # 監聽 127.0.0.1:8787
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787    # 或寫進 ~/.claude/settings.json 的 "env"
leakshield --doctor                                # "Claude Code:" 區段會檢查設定
```

Proxy 會遮罩 Claude Code 送出的每個 Anthropic Messages 請求（含 `count_tokens`），還原助理 JSON 或串流文字中的 placeholder，無法遮罩的請求直接擋下，不會轉送。已用 API key 驗證；Claude Code 文件說 base URL 也適用於 claude.ai 登入，這裡尚未測試。它不會還原工具呼叫裡的 placeholder，也看不到繞過 base URL 的流量，例如 WebFetch 的網域檢查會把 hostname 送給 Anthropic。設定方式與完整的缺口清單見 [docs/claude-code.zh-TW.md](docs/claude-code.zh-TW.md)。

---

### CLI

```bash
# 掃描文字
npm run scan -- --text 'sk-proj-test1234567890abcdef my_password="super_secret"'

# 掃描單一檔案
npm run scan -- --file ./src/config.ts

# 掃描整個目錄
npm run scan -- --dir ./src

# 只掃描特定副檔名
npm run scan -- --dir ./src --ext .ts .env .json

# 從 stdin 讀取
cat .env | npm run scan -- --stdin

# 全域安裝後
leakshield --file ./config.ts
```

Exit code：`0` = 安全（ALLOW），`1` = 有發現（WARN 或 CONFIRM），`2` = 檔案不存在

#### 脫敏模式（Redaction）

將敏感內容替換為 `[REDACTED_TYPE]` 佔位符，而非只是回報：

```bash
# 脫敏 stdin，結果輸出到 stdout
echo 'token=sk-proj-test1234567890abcdef' | npm run scan -- --redact --stdin

# 脫敏檔案，結果寫入新檔
npm run scan -- --redact --file .env --out .env.redacted

# Dry-run：只預覽哪些內容會被脫敏，不產生任何輸出
npm run scan -- --redact --dry-run --file .env
```

脫敏後的文字輸出至 **stdout**；findings 摘要輸出至 **stderr**，方便在 pipeline 中分開處理。

| Flag | 行為 |
|------|------|
| `--redact` | 替換命中內容為 `[REDACTED_TYPE]`，寫入 stdout；脫敏後仍有命中時不輸出 |
| `--redact --dry-run` | 僅預覽命中位置，不輸出；有命中時 exit `1` |
| `--redact --out <path>` | 脫敏結果寫入指定檔案，不寫到 stdout |
| `--redact --format json` | 以 JSON 格式回傳 `redacted`、`findings`、`summary` |

#### CLI 選項

| 選項 | 說明 |
|------|------|
| `--format json` | 輸出 JSON（適合 CI/CD） |
| `--min-severity high` | 只回報 HIGH（或 `medium` / `low`） |
| `--allow-outside` | 允許掃描工作目錄以外的路徑（預設禁止） |
| `--enable-encoding-detection` | 啟用 Base64/URL/Hex 解碼檢測（預設關閉） |

#### 編碼檢測功能

**為什麼需要編碼檢測？**

攻擊者可能使用編碼技巧繞過敏感資料檢測：
- **Base64 編碼**：將 API Key 或密碼編碼後傳送
- **URL 編碼**：使用 `%20` 等格式隱藏關鍵字
- **Hex 編碼**：十六進制編碼繞過模式匹配

**啟用編碼檢測**

```bash
# 啟用編碼檢測掃描
npm run scan -- --enable-encoding-detection --text "c2stcHJvai10ZXN0MTIzNDU2Nzg5MGFiY2RlZg=="

# 結合其他選項使用
npm run scan -- --enable-encoding-detection --file ./config.yaml --format json

# 掃描目錄時啟用
npm run scan -- --enable-encoding-detection --dir ./src --ext .ts .env
```

**效能考量**

編碼檢測會額外嘗試解碼並重新掃描內容，可能增加 10-30% 的掃描時間。建議：
- **預設關閉**：一般掃描使用預設值即可
- **按需啟用**：在處理外部來源或不明內容時啟用
- **CI/CD 環境**：建議在 CI pipeline 中啟用以攔截編碼攻擊

**檢測範例**

```bash
# Base64 編碼的 API Key
echo "c2stcHJvai10ZXN0MTIzNDU2Nzg5MGFiY2RlZg==" | npm run scan -- --enable-encoding-detection --stdin
# → 檢測到 OpenAI API Key（合成值）

# URL 編碼的敏感內容
echo "password%3Dsecret123" | npm run scan -- --enable-encoding-detection --stdin
# → 檢測到 password 關鍵字

# 正常文字不受影響
echo "This is safe content" | npm run scan -- --enable-encoding-detection --stdin
# → 安全，無敏感內容
```

偵測到編碼內容時，文字與 JSON 摘要都會列出編碼類型，語言依 `LEAKSHIELD_LANG` 而定。下面是 `LEAKSHIELD_LANG=zh-TW` 的輸出；預設為英文，會顯示 `[WARNING: Encoded content: Base64, URL]`：

```
[WARNING: 編碼檢測: Base64, URL]
```

#### 工作目錄路徑限制

預設情況下，`--file` 與 `--dir` 只接受**工作目錄內**的路徑。若嘗試掃描工作目錄以外的路徑（例如 `../shared.env` 或 `/etc/passwd`），會直接拋出錯誤並終止。

如需掃描工作目錄以外的路徑，請明確加上 `--allow-outside`：

```bash
npm run scan -- --file ../shared.env --allow-outside
```

> ⚠️ 工作目錄外的掃描為選擇性開啟功能，僅在確實需要時使用。

#### 忽略指令

CLI 與 Web UI 會跳過含有 `leakshield-ignore`、`guard:skip`、`guard:ignore`、`sg-ignore`、`no-scan` 或 `skip-guard`（不分大小寫）的整行。即使該行有真實密碼，也會回報 `ALLOW`。

> ⚠️ 任何能編輯受掃描檔案的人都能加上這類指令，所以 CLI 掃描擋不住不受信任的變更。OpenCode plugin 不理會這些指令。

---

### Web UI

啟動本地 Web 伺服器，在瀏覽器中使用：

```bash
# 預設 port 3000
npx tsx src/cli.ts --web

# 指定 port
npx tsx src/cli.ts --web --port 3001

# Build 後的版本
node dist/cli.js --web --port 3001
```

開啟瀏覽器 `http://localhost:3001`，貼上內容後按「掃描」或 Ctrl+Enter。

#### REST API

也可直接呼叫 API：

```bash
# 掃描文字
curl -s -X POST http://localhost:3001/scan \
  -H 'Content-Type: application/json' \
  -d '{"content": "sk-proj-test1234567890abcdef my_password=\"super_secret\""}' | jq

# 回應格式
{
  "decision": "CONFIRM",
  "riskLevel": "CRITICAL",
  "summary": "...",
  "findings": [
    { "type": "API_KEY", "severity": "HIGH", "description": "OpenAI API Key", "preview": "****", "line": 1 },
    { "type": "SECRET", "severity": "HIGH", "description": "...", "preview": "****", "line": 1 }
  ],
  "recommendedAction": "BLOCK",
  "redactedContent": "[REDACTED_API_KEY] my_[REDACTED_SECRET]",
  "redactionVerified": true,
  "residualFindings": 0,
  "wasTruncated": false
}
```

`redactionVerified` 為 `false` 時不會回傳 `redactedContent`。

| 端點 | 方法 | 說明 |
|------|------|------|
| `/` | GET | Web UI HTML |
| `/scan` | POST | 掃描 `{ "content": string }`，回傳 JSON |

---

## 設定檔

LeakShield 會載入找到的第一個設定檔：`./config/guard.config.yaml`，接著是 LeakShield 目錄內的 `config/guard.config.yaml`（僅限原始碼建置），最後是 `~/.leakshield/guard.config.yaml`。都沒有時使用內建預設值。OpenCode plugin 另外接受 `configPath` 選項。要新建設定檔，請複製 [`config/guard.config.example.yaml`](config/guard.config.example.yaml)，再替換其中的範例關鍵字與域名。

```yaml
# NDA 關鍵字（大小寫不敏感）
nda_keywords:
  - "CONFIDENTIAL"
  - "INTERNAL ONLY"
  - "DO NOT SHARE"
  - "NDA"
  - "PROPRIETARY"
  # 加入你公司的內部關鍵字：
  # - "Project Phoenix"
  # - "MyCompany Internal"

# 私有域名
private_domains:
  - "internal.mycompany.com"
  # - "dev.yourcompany.io"

settings:
  max_chars: 200000      # 掃描上限；透明模式超過即拒絕，不會截斷後送出
  show_line_numbers: true
  preview_length: 60
  encoding_detection: false  # 編碼檢測（Base64/URL/Hex），預設關閉
```

修改後：
- **CLI**：下次執行自動載入
- **OpenCode Plugin**：重啟 OpenCode 以重新載入 plugin 設定
- **Web UI**：重啟本機 server

### `.env` 精確值偵測

只有當檔案內的值絕不該進入 LLM context 時才啟用：

```yaml
settings:
  env_files:
    - .env
    - .env.local
```

`env_files` 路徑相對專案根目錄，且不能離開 workspace。Guard 只讀取非空且至少 8 字元的 value，掃描準備送往模型的內容是否出現完全相同的值。載入的 value 不會傳給模型、寫入 log 或序列化；也不會自動讀取所有 process environment variables。修改已啟用的 `.env` 後，請重啟 OpenCode。選擇性開啟的 `envQueries` plugin 工具（見[唯讀 env 查詢](docs/plugin/env-queries.zh-TW.md)）查詢的是同樣這些檔案，且永不回傳其 value。

### 自訂規則

```yaml
custom_rules:
  - description: "Company token"
    pattern: "MYCO_[A-Z0-9]{32}"
    severity: HIGH
    flags: "i"            # gimsuy 的子集；一律隱含 g
    word_boundary: true   # 只在字面 ASCII 單字字元的邊緣加 \b
    allow:                # 這條規則永不回報的完整字串
      - "MYCO_EXAMPLE0000000000000000000000000"
    # path: ["src/**"]    # 可設定，但尚未實作（見下方）

settings:
  allowlist:              # 任何規則都不回報的完整字串（見繞過警告）
    - "qa@example.com"
```

- **`flags`** — `gimsuy` 的任意子集；一律加上 `g`。預設為 `i`，既有規則仍維持不分大小寫。未知旗標（例如 `x`）會讓設定載入失敗；pattern 以最終旗標編譯，所以只在 `u` 下才無效的 pattern 也會載入失敗。零長度比對會被略過（沒有可回報或脫敏的值），掃描會繼續找後面的非空比對，Unicode 旗標下也一樣。
- **`word_boundary`** — 只在 pattern 邊緣是字面 ASCII 單字字元時加上 `\b`。CJK 邊緣（「機密」）不處理：兩個非單字字元之間不會成立 `\b`，加上去反而比對不到。邊緣是群組、字元類別、量詞或跳脫序列時無法安全加上，所以不會加，`--doctor` 會警告這條規則比看起來寬鬆——請自己在 pattern 寫 `\b`，例如 `\bEMP-\d{6}\b`。最外層的 alternation（`a|b`）是設定錯誤，請寫成 `(?:a|b)`。
- **`allow`／`settings.allowlist`** — 與命中文字完全相同才算，不是子字串也不是 regex。`allow` 只作用於該規則；`settings.allowlist` 作用於所有規則，包括內建規則與 `.env` exact value。上限：每條規則 32 筆、全域 64 筆、每筆 200 字元。
  **把真實密鑰加入 allowlist 是真正的繞過**：該值仍會不經遮罩離開本機，LeakShield 也不會把它回報為規則或 `.env` 命中。只用於你已判定不敏感的值。
  Unicode 規避診斷是另一回事：零寬字元或形似字母的警告，代表移除這些字元後會露出原文隱藏的命中，對原文設 allowlist 不會消除警告。單純的西里爾或希臘文字不會被標記。`--doctor` 會回報 allowlist 筆數、實測最多八筆，並回報無法實測的筆數（依賴上下文的 pattern 只能在實際位置判斷）。被抑制的次數會計數，不是靜默略過。
- **`path`** — 可設定也會驗證，但路徑範圍**尚未實作**：掃描器拿不到 prompt 或工具輸出的來源路徑。這些規則目前套用於所有掃描文字，設定 `path` 時 `--doctor` 會警告。

Allowlist 項目屬於設定檔的一部分，所以會改變設定檔指紋（檔案的 sha256），而授權比對的正是這個指紋。

---

## 實務使用建議

### 場景一：你要把一個設定檔交給 OpenCode 分析

下面是 `mode: "block"` 的情況。在 v2 預設的 transparent 模式下，模型看到的是佔位符，工作會繼續進行。

```
你（對 OpenCode）：請幫我看看這個 config.ts 有沒有問題
OpenCode：[讀取 config.ts]
→ 工具輸出含有 API_KEY
→ plugin 在下一輪模型讀取前將其替換
→ OpenCode 收到攔截通知，而非 secret
你：把第 12 行換成假 key 後再繼續
```

### 場景二：你在 CLI 掃描整個專案再送出

```bash
npm run scan -- --dir ./my-project
# 如果 exit code = 1，表示有問題，先處理再貼給 AI
```

### 場景三：CI/CD 整合（防止含敏感資訊的 prompt 進入 pipeline）

```bash
# 在 CI script 加入
node dist/cli.js --cli --dir ./prompts
if [ $? -ne 0 ]; then
  echo "❌ 偵測到敏感內容，停止 pipeline"
  exit 1
fi
```

---

## 設定檔驗證

動態規則的輸入長度在載入時會透過 Zod 驗證：

| 欄位 | 最大長度 |
|------|---------|
| `nda_keywords` 每個項目 | 200 字元 |
| `private_domains` 每個項目 | 255 字元 |
| `custom_rules` 的 `description` / `pattern` | 200 字元 |

超過長度限制的值會導致 `loadConfig()` 拋出 Zod 驗證錯誤，避免過長的 pattern 進入掃描器。

清單項目數也有上限，超過上限的設定檔會載入失敗：

| 欄位 | 最多項目數 |
|------|-----------|
| `nda_keywords` | 4096 |
| `private_domains` | 4096 |
| `custom_rules` | 1024 |

`custom_rules` 的 pattern 若無法編譯成正規表示式，`loadConfig()` 也會拋錯，並指出規則的索引和 `description`（不會印出 pattern）：無法執行的規則不能載入。可以編譯、但在固定測試輸入上跑得太慢的 pattern 會被當成疑似 ReDoS 而略過，stderr 會印警告，`leakshield --doctor` 也會出現 `custom-rules` 警告。這個檢查只是計時啟發式，不是保證：它只執行 pattern 一次，而且無法中斷執行，所以不能證明 pattern 安全。

## 敏感資訊預覽行為

掃描結果中所有敏感資訊的預覽一律顯示為 `****`，不論原始值長度為何，不保留任何前後綴字元。這樣可避免在日誌、CI 輸出或 Web UI 回應中洩漏部分機密內容。

## 多語系（i18n）

CLI 輸出語言由 `LEAKSHIELD_LANG` 環境變數控制。

| 值 | 語言 |
|----|------|
| `en`（預設） | 英文 |
| `zh-TW` 或 `zh` | 繁體中文 |

```bash
# 英文輸出（預設）
npm run scan -- --text "your content"

# 繁體中文輸出
LEAKSHIELD_LANG=zh-TW npm run scan -- --text "你的內容"
```

也可以寫進 shell profile 長期生效：

```bash
export LEAKSHIELD_LANG=zh-TW
```

## 注意事項

- 這個工具是**靜態 pattern 掃描**，無法保證 100% 覆蓋所有情況
- **高誤報情境**：長度足以命中的測試字面值（如 `password: "aaaaaaaa"`）、範例程式碼中的佔位符
- 最終判斷仍需你自己確認，工具的作用是「提醒」而非「保證」
- NDA 關鍵字請只填真正機密的詞，避免太多誤報影響使用體驗
