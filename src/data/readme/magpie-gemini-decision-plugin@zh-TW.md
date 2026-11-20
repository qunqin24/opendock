# Magpie Gemini Decision 外掛

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

版本 **0.3.0** 讓 Magpie 使用 `gemini-decision-1` 對文字、圖片、音訊、影片及 PDF 進行決策，也可作為路由群組的意圖分類器。支援 Google 官方 Gemini Decisions API，以及採用 Bearer 驗證的相容轉接服務。

供應商 ID：`gemini-decision-adapter`。完整模型 ID：`gemini-decision-adapter/gemini-decision-1`。

這是回答判斷、選項與評分問題的決策模型。請將它設定於群組的 `classifier` 欄位，群組成員則使用一般聊天模型。

## 協定與本機端點

Magpie 將 OpenAI 格式的 `/v1/decisions` 請求（`input` 與 `questions` 陣列）轉換為 System One 請求（`state` 與 `questions` 物件），再由外掛送至設定的上游 `/decisions` 端點。

| Magpie 0.1.4587 端點 | 文字 | 圖片 / 音訊 / 影片 / PDF |
| --- | --- | --- |
| `/v1/systemone` | 支援 | 支援，使用頂層 `images` / `media` |
| `/v1/decisions` | 支援 | 宿主轉換層會拒絕媒體 |
| `/v1beta/decisions` | 未註冊 | 未註冊 |

`GET /` 回傳 JSON 的 `apis` 欄位可列出 API；`GET /apis` 回傳 404。例如：`curl -s http://127.0.0.1:3425/`。

| System One 輸入 | 轉換與回應處理 |
| --- | --- |
| 字串 `state` | 原樣作為輸入文字 |
| 物件或陣列 `state` | 完整序列化為 JSON，包含歷史與上下文，不只擷取 `message` |
| 頂層 `images` | 圖片 data URL / HTTPS URL 依序轉為 image blocks |
| 頂層 `media` | text、image、audio、video、document blocks 保留內容、URI、MIME 類型與順序 |
| `noul` | 保留肯定機率，不以 `confidence` 取代 |
| `choice` | 保留選項與機率，null 說明轉為空字串 |
| `score` | 保留評分標準順序、`legend` 與機率 |
| Token 用量 | 將上游 `total_input_tokens` / `total_output_tokens` 對應為 `input_tokens` / `output_tokens`；輸出 0 為合法值 |

OpenAI `predicate` 對應 `noul`，其他題型為 `choice`、`score`。陣列轉換及答案順序由 Magpie 處理。若缺少答案、機率或用量無效、回應不是 JSON、上游出錯或輸入遭封鎖，外掛會回傳明確錯誤。

## 安裝與登入

需要支援 provider plugin 與 System One 的 Magpie，實測版本為 **0.1.4587**。外掛沒有額外 npm 相依套件；單元測試需要 Node.js 20+。

透過完整套件名稱從 npm 安裝。macOS App 的 CLI 可能不在 `PATH`：

```sh
MAGPIE_BIN=/Applications/magpie.app/Contents/MacOS/magpie
PLUGIN_SPEC=magpie-gemini-decision-plugin@latest
"$MAGPIE_BIN" plugin add "$PLUGIN_SPEC"
"$MAGPIE_BIN" plugin login gemini-decision-adapter
"$MAGPIE_BIN" plugin list --json
```

請在登入提示中輸入上游 API key。憑證由 Magpie 管理，請勿寫入原始碼、命令列參數或外掛選項，也不要手動編輯 `plugin-auth.json`。

啟用外掛後，在 **外掛 → 已安裝 → 選項** 中編輯 `endpoint` 和 `authMode`。0.3.0 提供可編輯的 Google 預設設定範本，按下儲存後套用修改。使用轉接服務時，請先設定其位址及驗證方式，再傳送請求。

本機開發時，在原始碼目錄設定 `PLUGIN_SPEC="$PWD"`，再使用相同的安裝命令，並保留該目錄。本機路徑與 npm 套件是獨立的外掛項目，切換安裝方式後需要設定新項目。如果「探索」頁尚未列出該套件，仍可透過完整 npm 套件名稱安裝。

## 上游設定

預設直接連線至 Google：

```json
{
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/decisions",
  "authMode": "google"
}
```

`google` 使用 `x-goog-api-key`，`bearer` 使用 `Authorization: Bearer …`。端點必須是完整的 HTTPS `/decisions` URL，不得包含使用者資訊、查詢參數或 fragment。

使用相容轉接服務時，請替換範例位址：

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" \
  '{"endpoint":"https://relay.example.com/v1beta/decisions","authMode":"bearer"}'
```

還原 Google 預設設定：

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" off
```

切換服務後，透過 `plugin login gemini-decision-adapter` 登入該服務的 key；不同服務的 key 通常無法通用。每次請求使用 Magpie 目前選取的帳號。外掛保留取消訊號，不額外重試、不跟隨重新導向、不轉送呼叫端的 Cookie 或憑證。上游 HTTP 錯誤保留狀態碼及重試資訊，不揭露可能含有憑證的原始錯誤內容。

## 決策請求

將以下 JSON 送至本機 Magpie 的 `/v1/systemone`：

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": {"order": "A100", "status": "cancelled", "refund": "received"},
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order been cancelled?"},
    "status": {
      "type": "choice",
      "instructions": "Choose the order status.",
      "criteria": {"pending": "Pending", "cancelled": "Cancelled", "other": null}
    },
    "refund": {
      "type": "score",
      "instructions": "Rate refund progress.",
      "criteria": ["Not started", "Processing", "Received"]
    }
  }
}
```

OpenAI `/v1/decisions` 使用 `input`、`questions` 陣列，以及 `predicate`、`choice`、`score` 題型。[完整請求範例](docs/examples.md)涵蓋所有題型與媒體格式。

## 多媒體輸入

使用頂層 `media` 陣列。每個附件必須且只能指定一種來源：`data` 為檔案位元組的 Base64，`uri` 為公開或簽章 HTTPS URL，也包含 Google Files API 回傳的 HTTPS URI。不接受本機檔案路徑；外掛不會讀取或上傳檔案。

| 內容 | `type` | 常見 `mime_type` |
| --- | --- | --- |
| 圖片 | `image` | `image/png`、`image/jpeg`、`image/webp` |
| 音訊 | `audio` | `audio/wav`、`audio/mpeg`、`audio/ogg` |
| 影片 | `video` | `video/mp4`、`video/webm`、`video/mov` |
| PDF | `document` | `application/pdf` |

例如，從錄音判斷訂單是否取消：

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": "",
  "media": [
    {"type": "audio", "mime_type": "audio/wav", "data": "BASE64_WAV_CONTENT"}
  ],
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order in the recording been cancelled?"}
  }
}
```

可將 `data` 替換為 `"uri": "https://relay.example.com/media/recording.wav"` 來引用遠端音訊。只有圖片和影片接受選填的 `resolution`，例如 `"low"`。同一請求可混合多種媒體，並插入 `{"type":"text","text":"Additional context"}` 文字區塊。

標準 `images` 欄位也可使用：`"images": ["data:image/png;base64,BASE64_IMAGE_CONTENT"]`。上游順序為完整 `state` 文字、`images`、`media`。空字串 state 不新增文字區塊。業務物件與陣列仍作為 JSON 文字，只有頂層 `images` / `media` 才會成為媒體輸入。

Magpie 0.1.4587 的**完整 JSON 請求本文上限為 16 MiB**。Base64 約增加三分之一大小，原始附件合計應低於約 12 MiB，並預留 JSON 空間。較大素材可使用上游能存取的 HTTPS URI。此宿主限制與 Google 的檔案額度不同。

`usage.input_tokens` / `output_tokens` 用於 Magpie 計量；上游提供 `input_tokens_by_modality` 時也會保留。影片及 PDF 用量可能歸入 image/audio/text，不一定另列 video/pdf。

## 作為路由分類器

設定既有聊天群組：

```sh
"$MAGPIE_BIN" group rule classifier YOUR_GROUP_ID gemini-decision-adapter/gemini-decision-1
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-small \
  'intent=explaining a concept or answering a question without writing or changing code'
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-large \
  'intent=writing or fixing unit tests'
```

將 `YOUR_GROUP_ID`、`YOUR_PROVIDER` 與模型名稱替換為實際群組及可用聊天模型。驗證時檢查 `/v1/magpie/route?session=…` 的分類來源、命中規則、實際模型與嘗試結果，以及 `/v1/magpie/usage/requests` 的 `kind=routing` 紀錄。規則命中本身不代表最終模型成功。

## 驗證與限制

```sh
npm test
export MAGPIE_CHAT_TARGETS='["YOUR_PROVIDER/chat-small","YOUR_PROVIDER/chat-large"]'
python3 scripts/validate_live.py
python3 scripts/validate_media.py --output artifacts/media-run-001
```

將兩個目標替換為實際已登入的聊天模型。`validate_live.py` 必須設定 `MAGPIE_CHAT_TARGETS`，值為包含兩個模型 ID 的 JSON 陣列。腳本呼叫本機 Magpie 與真實模型，建立唯一的暫存路由群組，依序檢查兩個意圖後，只刪除自行建立的群組。請先登入外掛及兩個聊天模型。驗證紀錄不會儲存認證標頭。

`validate_media.py --output` 的路徑**必須是新目錄**，每次執行請更換路徑。腳本使用 `test/fixtures/media/` 的合成素材：每類媒體兩個對照樣本、一個 `images` 樣本、一個四模態混合樣本，檢查實際答案與用量。可用 `python3 scripts/generate_media_fixtures.py` 重新產生素材；此開發腳本需要 Pillow、ffmpeg 與 macOS `say`，外掛執行不依賴這些工具。

預設閘道為 `http://127.0.0.1:3425`，可用 `MAGPIE_URL` 覆寫；CLI 可用 `MAGPIE_BIN` 指定。選填的 `MAGPIE_API_KEY` 用於本機閘道驗證，與透過外掛登入儲存的上游 key 分開。

歷史驗證紀錄為 **56 項單元測試通過**，以及 **10 個真實媒體案例 / 31 個答案通過**。單元測試使用虛構憑證與模擬上游；真實媒體驗證透過相容轉接服務傳送 Base64。HTTPS URI 轉換有單元測試涵蓋，但尚未逐類實測遠端 URI。Google 官方直連及實際網路環境的帳號切換未實測。詳見公開去識別化的[驗證紀錄](VERIFICATION.md)；這些是整合驗證，不是分類準確率基準。

外掛未設定價格，顯示費用不代表實際帳單；驗證僅核對 token 數量。未新增本機 `/v1beta/decisions` 別名。

## 檔案與參考

- `index.mjs`：外掛 factory、供應商、模型與登入介面。
- `adapter.mjs`：協定、驗證、回應檢查與錯誤處理。
- `media.mjs`：媒體區塊、MIME、Base64 與 HTTPS URI 檢查。
- `test/adapter.test.mjs`、`test/media.test.mjs`：單元測試。
- `scripts/validate_live.py`、`scripts/validate_media.py`：真實整合驗證。
- [所有題型與媒體範例](docs/examples.md)。
- [公開去識別化驗證紀錄](VERIFICATION.md)。
- [Google Decisions API](https://aistudio.google.com/docs/decisions-api#input)
- [Magpie issue #6969](https://github.com/yetone/magpie/issues/6969)
- [Magpie provider plugins (v0.1.4587)](https://github.com/yetone/magpie/blob/v0.1.4587/docs/subsystems/provider-plugins.md)
- [Magpie Gemini / System One conversion](https://github.com/yetone/magpie/blob/v0.1.4587/internal/provider/decide_wire.go)
