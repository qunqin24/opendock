# commandcode-go-opencode-provider

[Command Code](https://commandcode.ai) API provider for [opencode](https://opencode.ai)。透過單一 API Key 使用 Claude、GPT、Gemini、DeepSeek、Qwen、Kimi、GLM、MiniMax、Step 等模型。

> **衍生自** [brent-weatherall/opencode-commandcode-provider](https://github.com/brent-weatherall/opencode-commandcode-provider) — 原始專案由 [Brent Weatherall](https://github.com/brent-weatherall) 建立。

> For English documentation, see [README.md](./README.md)

### 相較上游的主要改動

- **本機 command-code 自動讀取**：啟動時優先從本機安裝的 `command-code` npm 套件讀取完整模型清單與推理程度（`reasoningEfforts`），找不到才退回 bundled `models.json`。
- **推理程度 variants 自動生成**：所有具備 `reasoningEfforts` 的模型會自動產生 `variants`（如 `low` / `medium` / `high` / `xhigh` / `max`），升級本機 `command-code` 後無需手動 sync 即可取得新模型與推理程度。
- **共用 catalog 模組**：`src/catalog.ts` 提供統一的套件解析、bundle 萃取與模型建構邏輯，同時供 plugin 與 sync 指令使用。
- **缺成本資料的模型不再被丟棄**：改用保守預設成本保留模型，確保上游新增的模型不會因缺少成本資料而消失。
- **同名模型自動消歧**：相同顯示名稱的模型（如 `MiniMax M3` / `MiniMax M3 Free`）會自動加上區分後綴。
- **Windows 相容**：sync 指令暫存目錄改用 `os.tmpdir()`，不再硬編碼 `/tmp`。

## 快速開始

### 1. 安裝

```bash
opencode plugin @fanfan4204/commandcode-go-opencode-provider
```

安裝後會自動註冊所有可用模型。

> **建議：** 取得最新模型清單（含推理程度 variants），請一併安裝 `command-code` CLI：
> ```bash
> npm install -g command-code
> ```
> 未安裝時會退回 bundled `models.json`，可能落後於最新版本。

### 2. 連線

在 opencode 中執行 `/connect`，搜尋 **Command Code**，輸入 API Key：

```
/connect
```

### 3. 選擇模型

執行 `/models` 挑選可用模型：

```
/models
```

## 手動設定

若偏好手動設定，在 `opencode.json` 加入：

```json
{
  "plugin": ["@fanfan4204/commandcode-go-opencode-provider/server"],
  "provider": {
    "commandcode": {
      "npm": "@fanfan4204/commandcode-go-opencode-provider",
      "name": "Command Code",
      "env": ["COMMANDCODE_API_KEY"]
    }
  },
  "model": "commandcode/deepseek-v4-flash"
}
```

Plugin 啟動時會自動註冊模型，優先使用本機安裝的 [`command-code`](https://www.npmjs.com/package/command-code) 套件中的模型目錄（含推理程度 variants），找不到才退回 bundled [`models.json`](./models.json)。只需設定 `provider.commandcode` 區塊，無需手動列出模型。

可選覆寫設定：

- 環境變數：`COMMANDCODE_PACKAGE_PATH` — 指向 `command-code` 套件根目錄（或 `dist/index.mjs`）
- 設定檔 `~/.config/opencode/commandcode-go-opencode-provider.json`：
  ```json
  {
    "commandCodePackagePath": "C:/Users/you/AppData/Roaming/npm/node_modules/command-code",
    "disableModelSync": false
  }
  ```

### 環境變數

若不使用 `/connect`，可直接設定 `COMMANDCODE_API_KEY`：

```bash
COMMANDCODE_API_KEY=your-key opencode
```

## 可用模型

完整模型清單維護在 [`models.json`](./models.json) 作為備援。升級本機或全域 `command-code` 後，下次 OpenCode 啟動即會自動取得新模型與推理程度。執行 `bun run sync` 可更新已提交的 `models.json`（優先使用本機 `command-code`，或加 `--remote` 從 npm 下載最新版）。

## 開發

```bash
git clone https://github.com/FanFan4204/opencode-commandcode-provider.git
cd opencode-commandcode-provider
bun install
```

本機測試時，建立 `opencode.local.json`（已 gitignore）使用 `file://` 路徑：

```json
{
  "plugin": ["file:///path/to/@fanfan4204/commandcode-go-opencode-provider/server"],
  "provider": {
    "commandcode": {
      "npm": "file:///path/to/commandcode-go-opencode-provider",
      "name": "Command Code (local)",
      "env": ["COMMANDCODE_API_KEY"]
    }
  }
}
```

執行 `opencode --config opencode.local.json` 即可用本機版本測試。

### 同步模型

```bash
bun run sync              # 從本機 command-code 更新 models.json（找不到則從 npm 下載）
bun run sync -- --remote  # 強制從 npm 下載最新 command-code tarball
bun run sync:global       # 更新 models.json + 寫入 ~/.config/opencode/opencode.jsonc
```

運行時若已安裝本機或全域 `command-code`，OpenCode 無需手動 `bun run sync` — plugin 會在啟動時自動讀取。

## 授權

MIT
