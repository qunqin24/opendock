# opencode-project-panel

[English](README.md)

提供底部列的 OpenCode TUI 外掛，包含：

- 支援 Markdown／程式碼預覽與編輯的專案檔案管理器；
- Skills、Tools 與 MCP 設定的 Permissions 面板。

## 安裝

這是一個 OpenCode TUI 外掛，必須宣告在 `tui.json` 中，而不是
`opencode.json` 的伺服器外掛清單中。

### 專案安裝

在專案的 `.opencode/` 目錄中安裝套件：

```sh
mkdir -p .opencode
cd .opencode
bun add opencode-project-panel
```

建立或更新 `.opencode/tui.json`：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel"]
}
```

外掛載入器使用 OpenCode 自己的套件快取，不會從其他應用程式工作區，
例如 `apps/tui/node_modules`，載入此外掛。

### 全域安裝

若要在所有專案啟用此外掛，建立 `~/.config/opencode/tui.json`：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel"]
}
```

全域 TUI 設定檔是 `~/.config/opencode/tui.json`。OpenCode 會自動將 npm
外掛下載到 `~/.cache/opencode/packages/`，不需要手動安裝到
`~/.opencode/`。

外掛在編輯 Permissions 與 MCP 設定時，會使用目前專案的
`opencode.json` 或 `opencode.jsonc`。

### 升級

也可以在 `tui.json` 的 plugin spec 中指定版本。OpenCode 啟動時會自動
下載並載入指定版本：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel@0.1.9"]
}
```

將 `@<version>` 改成要使用的版本後重新啟動 OpenCode，即可升級，不需要
手動清除快取。

若是專案安裝，請在專案的 `.opencode/` 目錄中執行：

```sh
bun add opencode-project-panel@latest
```

若是全域安裝，請移除此外掛的快取，讓 OpenCode 從 npm 下載最新版本：

```sh
cache="$HOME/.cache/opencode/packages/opencode-project-panel"
if [ -d "$cache" ]; then rm -rf -- "$cache"; fi
```

升級、修改 `tui.json` 或清除套件快取後，請重新啟動 OpenCode。

## 如果你是 Agent

安裝或升級此外掛時：

1. 將此外掛視為 OpenCode TUI 外掛。請修改專案的
   `.opencode/tui.json` 或全域的 `~/.config/opencode/tui.json`，不要修改
   `opencode.json`。
2. 保留現有的 `plugin` 項目，並避免加入重複項目。
3. 若指定特定版本，請在 `plugin` 陣列中使用
   `"opencode-project-panel@<version>"`。OpenCode 啟動時會自動下載並載入
   該版本。
4. 若要升級專案相依套件，請在專案的 `.opencode/` 目錄中執行
   `bun add opencode-project-panel@latest`。
5. 修改 `tui.json` 後請重新啟動 OpenCode。全域快取安裝若需要重新下載，
   只移除此外掛自己的快取目錄。
6. 不要同時載入 npm 套件與本機的 `dist/index.js` 副本。

## 快捷鍵

- `F1`：開啟檔案管理器
- `F3`：開啟 Permissions
- `F2`：重新命名選取的檔案
- `F7`：建立檔案或目錄
- `Delete`：刪除選取的檔案
- `Ctrl+G`：前往路徑
- `Ctrl+R`：返回專案根目錄

## 開發

```sh
bun install
bun run typecheck
bun run build
```

套件入口是產生的 `dist/index.js`。執行時的 UI 相依套件會保留在 bundle
之外，並宣告在 `dependencies` 中，讓 OpenCode 的 Bun 外掛載入器可以解析。

## 變更記錄

請參閱 [CHANGELOG.md](CHANGELOG.md) 查看發布記錄。

## 授權

MIT
