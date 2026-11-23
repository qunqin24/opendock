# code-mentor

把 git 分支或 MR 的修改，做成**以情境為主、像 GitLab diff 一樣逐段講解**的 code 導讀。產出一個離線就能開的 HTML，加一份 Markdown。

- AI 只負責寫講解（`guide.json`）。
- 真正的 diff、畫面渲染、「每個改過的檔案都有被講到」的檢查，都由工具負責。
- 不依賴任何套件，只需要 Node.js 18 以上和 git。

## 能看到什麼

| 分頁 | 內容 |
|---|---|
| 依情境 | 照使用者操作的順序一站一站講：情境、為了完成什麼、我做了什麼，下面接該站的 diff 和逐行註解 |
| 依檔案 | 所有改過的檔案，附 +/− 比例條，標出產生檔和大修改，連回它屬於哪一站 |
| 機制／架構 | 流程圖、狀態圖，以及從 EF Core migration 推出的資料表變更（ER 圖） |

Diff 的功能：
- 語法上色、行內字詞差異。
- 上下文一次展開 20 行，也能一次收回 20 行，或整段收合。
- 「全部收合／全部展開」一次處理所有檔案區塊。全部展開前一定會先問你，並告訴你會打開幾個檔案、幾行變更。
- 單欄和並排可以全部一起切，也可以單獨切某一塊。
- 第一個分頁「**功能總覽**」不放程式，只說明這個分支做了哪些功能、為什麼做、各自的狀態，每個功能可以點進去看對應的站。產生報告時，AI 會先寫好這一頁請你確認功能有沒有缺，確認後才寫 code 講解（說「不用確認」就直接寫完）。
- 分頁列最左邊的下拉選單切換四種檢視：**整體**（全部檔案、核心說明）、**前端**、**後端**、**資料模型**（只看那一部分，加上細部說明，例如每個畫面狀態控制什麼、排序表決定什麼）。舊報告沒有細部說明，切到某一層時只會篩檔案。
- 每站跨多個檔案時，「我做了」下方有一段**呼叫鏈**，先看整條路再看程式。
- 每則說明右上角有「看不懂」：按下會複製一行「看不懂：第 N 站… 檔名 L行號」，貼回對話，AI 只重寫那一則。想在產生時就多一道檢查，說「驗讀」（另派一個 agent 扮演不熟專案的讀者檢查每則說明，約多 3–5 分鐘）。
- 側欄左下角的「顯示設定」集中所有全域開關：並排、完整檔案、隱藏格式化差異、精簡工具列（底部工具列只顯示符號）、文字填滿寬度，以及全部收合／展開。側欄收合與深淺色切換在左上角。
- 側欄檔名完整顯示（過長就換行）；同名檔案自動補上足以區分的上層資料夾。
- 「隱藏格式化差異」開啟後，只改了換行、縮排、空白、單雙引號或結尾逗號的行不顯示；整段 hunk 或整個檔案都是格式化時，整段或整個區塊一起隱藏。有註解的地方不隱藏，「看完整檔案」也照常顯示全部。只在有這類差異時才出現這個勾選。
- 所有 diff 寬度統一，拖曳右緣可一起調整，雙擊還原；並排時中間的分隔線也能拖。
- 註解直接掛在那一行下面，支援範圍註解（`L47–L62`）、步驟編號、跨檔案跳轉。
- 註解分種類：改了什麼、怎麼改、為什麼、語法／用法，另有做得好、風險、錯誤。
- Migration 這類產生檔一定附白話語法說明，還有「Entity 設定 ↔ migration 語法」的對照。

## 第一次安裝

前提：已安裝 [Node.js](https://nodejs.org/) 18 以上和 git。

每台機器裝一次就好，所有專案共用，不必每個專案重裝。

```bash
npm i -g @edemilorhea/code-mentor
```

全域安裝時會自動把 skill 裝到 `~/.agents/skills/code-mentor`、agent 裝到 `~/.config/opencode/agent/code-mentor.md`（從 0.1.106 起）。裝完記得**重開 AI 工具**（例如 OpenCode），它才會讀到新的 skill 和 agent。

自動安裝沒跑時（例如 npm 設了 `ignore-scripts=true`），手動補一次：`code-mentor setup`。不想自動寫入家目錄，安裝前設環境變數 `CODE_MENTOR_SKIP_SETUP=1`。

確認裝到新版：`code-mentor help` 的用法裡要有 `setup`。

| 裝了什麼 | 位置 | 範圍 |
|---|---|---|
| CLI | 全域 node_modules | 這台機器所有專案 |
| skill | `~/.agents/skills/code-mentor` | 這台機器所有專案 |
| agent | `~/.config/opencode/agent/code-mentor.md` | 這台機器所有專案 |
| 產出 | 每個 repo 的 `.code-mentor/output/docs/<來源>-<hash>/` | 只有那個 repo，自動被 git 忽略 |

用 `--project` 裝的 skill／agent 只在該專案生效，而且會蓋過全域那份；升級時要在該專案重跑一次。

其他安裝方式：

```bash
# 不想安裝，每次直接跑（第一次會先下載）
npx -y @edemilorhea/code-mentor help

# 直接從 GitHub 安裝最新版
npm i -g github:Edemilorhea/code-mentor

# 只給目前這個專案用的 skill（裝到 ./.agents/skills/code-mentor）
code-mentor skill install --project
```

用 Bun 也可以：`bun add -g @edemilorhea/code-mentor`，或 `bunx @edemilorhea/code-mentor help`。

### 當 OpenCode V2 plugin 用

同一個套件也是 OpenCode V2 plugin。在 `opencode.json` 加：

```json
{ "plugins": [{ "package": "@edemilorhea/code-mentor" }] }
```

重開 OpenCode 後會多出：

- `code-mentor` skill（你已用 `skill install` 裝過時，以你裝的為準）。
- `code_mentor` 工具：`collect`、`show`、`check`、`build`。AI 直接呼叫，不必另外裝 CLI。
- `/code-mentor` 指令：例如 `/code-mentor 概覽 MR 123`；`/code-mentor --help` 列出怎麼下 prompt。它會先偵測本機有沒有 `implementation-understanding-tutor`、`change-understanding-review`、`diagram-design`，有的話用它們決定怎麼講，沒有就用內建規則。

想要專門的導讀模式，再裝 primary agent。npm 套件無法自動新增 agent，所以要手動跑一次：

```bash
code-mentor agent install            # 裝到 ~/.config/opencode/agent/code-mentor.md
code-mentor agent install --project  # 裝到 ./.opencode/agent/code-mentor.md
```

重開 OpenCode 後按 Tab 切到 `code-mentor`。這個 agent 只能寫 `.code-mentor/` 底下的檔案（實際寫在 `collect` 回報的工作資料夾），不改程式、不 commit、不 push、不切分支；判斷不出比較基準時會停下來問你，不會自己猜。

不用 OpenCode 的話，照上面的 CLI 加 skill 方式用就好，兩種可以並存。

### 講解內容由誰決定（內容大腦）

code-mentor 只負責 diff 的收集、渲染與覆蓋檢查。「怎麼理解、怎麼講」依本機有哪些 skill 決定：

| 本機有的 skill | 誰當大腦 |
|---|---|
| `implementation-understanding-tutor` | tutor 決定情境、站的順序與逐段講法；有 `change-understanding-review` 時一併用它分組與判斷 Added／Modified／Removed |
| 只有 `change-understanding-review` | review 負責分組與判斷，逐段講法用內建規則 |
| 兩個都沒有 | 內建規則（`SKILL.md` 第 5 節），講解深度要求不變 |

有 `diagram-design` 時，只在你要架構圖、sequence 圖，或機制用文字講不清楚時才用它畫圖，存在工作資料夾的 `diagrams/`。

兩邊規則衝突時：格式、覆蓋、輸出位置聽 code-mentor；內容怎麼講聽大腦。

| 你要的 | 用哪個 |
|---|---|
| 整個分支／MR／diff，每個檔案都要講到 | code-mentor |
| 一個功能或 method 的故事頁 | `explain-with-code-walkthrough` |
| 單張圖 | `diagram-design`，嵌進上面任一種 |

## 最快的用法：叫 AI 做

在要導讀的 repo 裡，對 AI 說：

> 用 code-mentor 導讀這個分支

或：

> 用 code-mentor 導讀 MR !123

AI 會依序做這些事：比對修改 → 讀 diff → 寫講解 → 檢查到沒有漏講 → 產生 HTML，最後告訴你檔案位置。開始寫之前，它會先告訴你這次比對的範圍。

看不懂某一站時，直接跟它說「第 3 站看不懂」。它只會重寫那一站，不會整份重來。

### 講多深：三個等級

後一級包含前一級。不說就是「導讀」。

| 等級 | 這樣說 | AI 會寫 | 適合 |
|---|---|---|---|
| 概覽 | `/code-mentor 概覽`，或「概覽這個分支」 | 情境、每站做了什麼、每個檔案一句摘要。不寫行註解 | 先知道改了什麼；分支很大 |
| 導讀（預設） | `/code-mentor`，或「導讀這個分支」 | 概覽，加上核心程式逐段行註解 | 一般情況 |
| 教學 | `/code-mentor 教學`，或「用教學等級導讀這個分支」 | 導讀，加上機制圖、「邏輯導讀」分頁、語法說明 | 要完全讀懂 |

- 等級可以往上加：先跑概覽，之後說「加深成導讀」或「加深成教學」。AI 在同一份 `guide.json` 上補內容，已寫的站不重來。
- 等級記在 `guide.json` 的 `depth`。`check` 在概覽等級不會警告「這站沒有註解」；教學等級沒有 `logic` 時會警告。
- 最花時間的是 AI 讀程式、寫講解。分支很大時先跑概覽最省時間。

### 忘了怎麼說：`--help`

```text
/code-mentor --help
```

AI 會直接列出怎麼下 prompt：三個等級、怎麼指定範圍、範例，以及「不要報告檔」時該用哪個 skill。它不會開始分析程式。在終端機跑 `code-mentor --help` 也會在指令說明後面印出同一份內容。

### 不是要報告檔的時候

| 你想要 | 這樣說 | 會用到 |
|---|---|---|
| 整個分支／MR 的 HTML 報告 | 「導讀這個分支」 | code-mentor |
| 在對話裡看改了什麼，不產生檔案 | 「這次改了什麼」 | `change-understanding-review` |
| 一站一站被帶著讀 | 「帶我讀這次的 code」 | `implementation-understanding-tutor` |

後兩個是另外的 skill，沒安裝就沒有；code-mentor 不需要它們也能用。

## 比較範圍

| 你要看的 | 指令 |
|---|---|
| 目前分支 vs 建立時的基準分支（預設，含未 commit 的修改） | `code-mentor collect` |
| 只看已 commit 的部分 | `code-mentor collect --no-worktree` |
| 某個 MR／PR | `code-mentor collect --mr 123` |
| MR 在別的 remote，或要指定目標分支 | `code-mentor collect --mr 123 --remote upstream --target release/1.0` |
| 指定另一個 base 分支 | `code-mentor collect --base origin/release` |
| 兩個 ref 之間 | `code-mentor collect --range v1.0..v1.1` |
| 連 `.gitignore` 忽略的檔案也要看 | `code-mentor collect --include-ignored` |

符合 `.gitignore` 的檔案預設不進導讀，就算它已經被 git 追蹤。`collect` 會印出排除了哪些，報告標頭也會顯示數量。

分支模式會從本機 reflog 讀取目前分支建立時的基準，避免把預設分支（例如 `main`）誤當成實際基準。`--base <ref>` 可明確覆寫。若 reflog 證據不存在、已過期或有歧義，工具會停止並要求指定 `--base`，不會猜測。

MR 模式會用 `git fetch` 抓 GitLab 的 `merge-requests/<iid>/head`，抓不到再試 GitHub 的 `pull/<iid>/head`。有裝 [`glab`](https://gitlab.com/gitlab-org/cli) 或 [`gh`](https://cli.github.com/) 時，會順便讀 MR 的標題、描述和目標分支。

## 手動流程

所有檔案都放在目標 repo 的 `.code-mentor/output/docs/<來源>-<hash>/`（`.code-mentor/` 會自動被 git 忽略）。每個分支／MR／range 一個資料夾，例如：

```text
.code-mentor/
  current                          # 最近一次 collect 用的資料夾名稱
  output/docs/
    feature-login-3f2a9c/          # 分支 feature/login
    feature-login-3f2a9c-2/        # 同分支用 --new 另開的副本
    mr-123-8b1e04/                 # MR !123
```

- 同一個來源再跑 `collect`：沿用那個資料夾，`diff.json` 更新、`guide.json` 沿用，`build` 覆蓋報告。這樣 `serve` 一直看同一個位置。
- 要保留舊的、另開一份：`collect --new`，會建 `-2`、`-3`。
- `show`／`check`／`build`／`serve` 預設用最近一次 `collect` 的資料夾，`--dir <資料夾>` 可指定。
- 舊版的 `.code-mentor/guide.json`、`.code-mentor/out/` 不再使用，不會被搬移或刪除。

```bash
code-mentor collect          # 1. 產生 diff.json 和 guide.json 骨架，印出工作資料夾和檔案表
code-mentor show f3#2        # 2. 看某個 hunk（f3 = 第 3 個檔案，#2 = 第 2 段）
                             # 3. 編輯工作資料夾裡的 guide.json
code-mentor check            # 4. 檢查漏講、錯誤參照，修到 0 個錯誤
code-mentor build            # 5. 在工作資料夾產生 index.html 和 guide.md
```

### 即時預覽（serve）

```bash
code-mentor serve            # 開 http://127.0.0.1:4173/，guide.json 存檔就自動重建並重新整理
code-mentor serve --port 5000
```

- 寫導讀時開著它，AI 每寫一段你就能看到，不用一直重跑 `build`。重新整理後停在原本位置。
- 一律 `--force` 重建，check 的錯誤和警告印在終端機，不擋預覽；正式交付前仍要跑 `check`。
- `guide.json` 存到一半格式壞掉時，頁面頂端顯示紅色錯誤列，繼續顯示上一次成功的版本。
- 只監看啟動當下那個工作資料夾的 `guide.json`。之後在別的分支 `collect` 不會影響它；要看新分支就重開 `serve`。
- 只聽 `127.0.0.1`，區網其他電腦看不到。port 4173 被占用時自動往後找；用 `--port` 指定則不換。Ctrl+C 停止。

`check` 遇到下面這些情況會報錯：
- 有改過的檔案或 hunk 沒被任何一站講到。要略過的話，必須在 `files` 寫明原因。
- 產生檔或大修改沒寫摘要。
- 產生檔沒寫白話的語法說明。
- 註解指到的行號不在那段 diff 裡。

`check` 另外會警告（不擋 build）：某一站有程式變更卻沒有任何註解，或一站塞了超過 6 個區塊。

## guide.json 範例

```json
{
  "title": "新增帳號申請",
  "summary": "使用者可以線上申請帳號，送出後拿到臨時密碼。",
  "intent": "Confirmed",
  "scenarios": [{
    "id": "apply", "title": "申請帳號",
    "stations": [{
      "id": "s1", "title": "送出申請",
      "situation": "使用者填完表單按送出",
      "purpose": "建立待審核的帳號",
      "did": "新增 ApplyAccount API 和 Users 表",
      "change": "ADDED", "status": "unverified",
      "hunks": ["f1", "f2#1"],
      "notes": [{ "hunk": "f2#1", "line": 12, "kind": "why", "text": "先檢查重複，避免同一人申請兩次" }]
    }]
  }],
  "files": {
    "Migrations/20260101_AddUsers.cs": {
      "summary": "建立 Users 表",
      "explain": "`Up` 是套用時要做的事，`Down` 是還原。`table.Column<int>` 定義欄位型別。"
    }
  }
}
```

選填的 `logic` 會在報告多一個「邏輯導讀」分頁：一個問題、依執行順序的幾步，每步左邊是說明，右邊是只框那段程式的面板，捲到哪一步就換哪段。

```json
"logic": [{
  "id": "l1", "station": "s1",
  "question": "送出申請時，系統怎麼產生並保存臨時密碼？",
  "input": "已通過前端檢核的表單",
  "steps": [{ "title": "後端再檢核一次", "text": "前端檢核可以被繞過。", "hunk": "f2#1", "line": 12, "to": 18 }],
  "result": "寫入 Draft 申請，回傳臨時密碼一次。",
  "handoff": "前端導到上傳頁。",
  "failure": "名稱重複回 400。"
}]
```

完整欄位見 [`skill/code-mentor/references/guide-format.md`](skill/code-mentor/references/guide-format.md)，寫作規則見 [`skill/code-mentor/SKILL.md`](skill/code-mentor/SKILL.md)。

## 常見問題

**無法確認分支建立基準／reflog 證據不明確**：用 `--base <ref>` 指定。Git reflog 可能因過期或清理而缺少建立紀錄。**目前就在建立基準分支上**：請用 `--base <ref>` 指定比較基準，或用 `--mr` 看某個 MR。

**MR 抓不到**：你的 GitLab 可能沒開放 MR ref。改用 `--range origin/<目標分支>..origin/<MR 分支>`。

**HTML 很大**：大檔和產生檔預設收合，點開才渲染。

**`@latest` 裝到舊版**：npm 的版本清單會快取最多 5 分鐘（registry 回傳 `Cache-Control: max-age=300`）。剛發布時可指定版本 `npm i -g @edemilorhea/code-mentor@<版本>`，或加 `--prefer-online`。

**裝了新版，`code-mentor help` 還是舊的**：PATH 上可能有別處的舊版（例如 Bun 或其他 Node 版本）。用 `npm ls -g @edemilorhea/code-mentor` 看 npm 裝的版本，`Get-Command code-mentor -All`（PowerShell）或 `which -a code-mentor` 看實際執行的是哪一個。

**看不到 code-mentor agent**：先重開 OpenCode；還是沒有就跑 `code-mentor setup` 再重開（npm 的 `ignore-scripts` 會擋掉自動安裝）。

## 更新與移除

```bash
# 更新（每台機器一次；skill 和 agent 會自動一起更新）
npm i -g @edemilorhea/code-mentor@latest

npm rm -g @edemilorhea/code-mentor   # 移除工具
# skill、agent 要手動刪掉：~/.agents/skills/code-mentor、~/.config/opencode/agent/code-mentor.md
```

## 規劃中

- 用 `diagram-design` 產生架構圖、sequence 圖並嵌進報告。
- 排除已 commit 但不想導讀的路徑（例如文件、產出檔），不必寫進 `.gitignore`。

## 開發

```bash
node lib/sbs.mjs --selftest   # 並排配對與註解放置的自我檢查
node lib/selftest.mjs         # check 與 logic（邏輯導讀）驗證、HTML／Markdown 輸出的自我檢查
npm i -g .                    # 從原始碼安裝
```

結構：`lib/run.mjs` 是四個指令的主體，CLI（`bin/`）和 OpenCode plugin（`plugin/index.mjs`）共用。報告整頁由 `templates/js-*.js` 在瀏覽器渲染，分頁有依情境、依檔案、機制／架構，以及有 `logic` 時才出現的邏輯導讀；`lib/serve.mjs` 是即時預覽。本機測 plugin 可在 `opencode.json` 用 `{ "package": "<repo 絕對路徑>" }` 載入。

## License

MIT
