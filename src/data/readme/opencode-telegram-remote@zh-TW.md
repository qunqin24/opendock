[简体中文](README.md) | [繁體中文](README.zh-Hant.md) | [English](README.en.md)

# opencode-telegram-remote

用 Telegram 在手機上遙控 OpenCode，電腦端的回覆即時推送到手機。
A Telegram remote control for [OpenCode](https://opencode.ai) V2: chat with your sessions from your phone and get desktop replies pushed back in real time.

[![CI](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能

- **原生 OpenCode V2 外掛**：基於 `@opencode/plugin` 的 `Plugin.define` 編寫（外掛 id 為 `telegram`），在 OpenCode 伺服器中執行，隨 OpenCode 啟停，不需要額外的常駐橋接程式。
- **手機發訊息**：一般文字會作為提示詞發送到目前聊天綁定的會話。OpenCode 處理期間機器人顯示「正在輸入…」，完成後把回覆發回手機。
- **電腦端回覆推送到手機**：外掛監聽 OpenCode 的 `session.text.ended` 事件，電腦視窗裡產生的回覆會發送到所有綁定該會話的聊天；內建去重，同一則回覆不會發兩次。
- **`/current`**：把手機接入你在電腦上最近檢視的會話，電腦和手機可以在同一個對話裡交替使用。
- **切換模型**：`/model` 點按鈕切換，或用 `/model <關鍵詞>`。
- **切換或新增會話**：`/sessions`、`/new`；用 `/abort` 中止正在執行的任務。
- **在手機上處理權限請求**：已綁定會話裡 OpenCode 請求權限時，會收到帶 **Allow once / Always / Reject** 按鈕的訊息。
- **白名單**：只有你列出的 Telegram 使用者 ID 能使用機器人，其他人會收到 "Unauthorized"。

## 環境要求

- OpenCode V2（外掛基於 `@opencode/plugin` 2.2 開發）。
- Node.js 20 及以上（見 `package.json` 的 `engines.node`）。
- 從 [@BotFather](https://t.me/BotFather) 取得的機器人 token，以及你的 Telegram 數字使用者 ID。

## 安裝

本套件暫未發布到 npm。可以用 OpenCode CLI 直接從 GitHub 安裝：

```sh
opencode plugin add github:HenryYannis/opencode-telegram-remote
```

或者用 git clone 下載到本機，作為本機外掛目錄載入：

```sh
git clone https://github.com/HenryYannis/opencode-telegram-remote.git
cd opencode-telegram-remote
npm install
```

然後在 `~/.config/opencode/opencode.json(c)` 裡加入該目錄的絕對路徑：

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-telegram-remote"]
}
```

## 設定

建立 `~/.config/opencode/telegram.json`：

```json
{
  "token": "YOUR_BOT_TOKEN",
  "allowedUsers": [123456789]
}
```

| 欄位 | 是否必填 | 說明 |
| :--- | :--- | :--- |
| `token` | 必填 | 在 [@BotFather](https://t.me/BotFather) 用 `/newbot` 建立機器人後得到的 token。 |
| `allowedUsers` | 必填，不能為空 | 允許使用機器人的 Telegram 數字使用者 ID 列表。可透過 [@userinfobot](https://t.me/userinfobot) 檢視自己的 ID。 |

- 不需要填 chat ID：只要發送者在白名單裡，機器人就會回應。最簡單的用法是私訊你的機器人。
- 如果檔案不存在、`token` 為空或 `allowedUsers` 為空，外掛不會啟動機器人，OpenCode 照常執行。
- ⚠️ 白名單裡的人可以透過 OpenCode 在你的電腦上執行任務。只填你自己的 ID，並妥善保管 `telegram.json`。
- Windows 下路徑為 `%USERPROFILE%\.config\opencode\telegram.json`。

可選環境變數：

| 變數 | 作用 |
| :--- | :--- |
| `TELEGRAM_PLUGIN_DEBUG` | 設定後會把除錯記錄寫入 `~/.config/opencode/telegram-plugin.log`。 |

## 命令

| 命令 | 作用 |
| :--- | :--- |
| *（一般文字）* | 發送提示詞到已綁定的會話 |
| `/current` | 接入你在電腦上最近檢視的會話 |
| `/model` | 以按鈕列出模型；`/model <關鍵詞>` 切換到第一個 ID 包含該關鍵詞的模型 |
| `/sessions` | 列出最近 10 個會話，點按鈕切換 |
| `/new` | 新增會話並綁定 |
| `/abort` | 中止已綁定會話中正在執行的任務 |
| `/status` | 顯示工作目錄、已綁定會話和最近檢視的會話 |
| `/start` | 顯示說明 |

**一般文字發到哪個會話？** 發到目前聊天綁定的會話。如果還沒有綁定，依序使用：你在電腦上最近檢視的會話 → 最近更新的會話 → 新增一個 "Telegram remote session"。

**模型列表從哪來？** 來自 OpenCode 的模型列表（`ctx.model.list()`）。如果為空，再讀取 `~/.config/opencode/opencode.json` 中 `providers.<id>.models` 下的模型名稱。

## 電腦 → 手機同步原理

```
電腦視窗中一則回覆結束
   ↓ OpenCode 發出 session.text.ended（sessionID、assistantMessageID、ordinal、text）
外掛找出綁定該會話的聊天
   ↓ 長文字按最多 3800 個字元分段
bot.api.sendMessage → 你的手機
```

回覆有兩條送達路徑：事件流；以及從 Telegram 發起提示時，在 `session.wait()` 之後讀取會話的備援路徑。兩條路徑共用一個投遞記錄（按訊息 ID 和文字段落去重），所以每則回覆只發一次。

## 限制

- 目前只支援文字，暫不支援圖片和語音。
- 每台電腦只執行一個機器人。OpenCode 會為每個 location 載入一次外掛，外掛用鎖定檔（`~/.config/opencode/telegram-plugin.lock`）保證只有一個執行個體在輪詢 Telegram。
- 聊天與會話的綁定保存在記憶體中，OpenCode 重啟後會清空，發送 `/current` 或 `/sessions` 重新綁定即可。

## 常見問題

**機器人沒有反應？**
確認 `telegram.json` 是有效的 JSON，包含 `token` 和非空的 `allowedUsers`，且你的 ID 在其中。設定 `TELEGRAM_PLUGIN_DEBUG=1` 後重啟 OpenCode，檢視 `~/.config/opencode/telegram-plugin.log`。

**不解除安裝的情況下怎麼關閉外掛？**
在 `opencode.json(c)` 的 `plugins` 中加入 `"-telegram"`，或者刪除 `telegram.json`。

## 開發

```sh
npm ci
npm run ci   # 語法檢查、單元測試、外掛套件驗證、匯入冒煙測試、打包試跑
```

## 授權

[MIT](LICENSE) © 2026 程小宝
