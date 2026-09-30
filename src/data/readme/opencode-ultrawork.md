# opencode-ultrawork

OpenCode V2 原生外掛，提供 49 個工具與 6 個 hook，負責工作區搜尋、驗證、工作說明檢查、Comment Signal、技能管理、任務與計畫狀態、診斷和專案記憶。工具的名稱、參數與回傳格式是對外凍結的介面，改動前要先取得使用者同意。

來源：介面凍結清單見 `src/modules/diagnostics/inventory.ts`（49 工具、6 hook、11 分類），並由 `tests/v2/native/diagnostics/tool-parity.test.ts` 逐項把關。

> 本文提到的 `src/…`、`tests/…`、`AGENTS.md` 都是 repo 裡的路徑。npm 套件只內含 `src/`、`schema/`、`index.ts`、`README.md`、`LICENSE`，其餘檔案請到 [GitHub repo](https://github.com/smile-minecraft/opencode-ultrawork) 對應的 branch 查看。

## 模組一覽

8 個模組各自的職責（工具對應哪個模組見 `src/modules/diagnostics/inventory.ts` 的 `TOOL_MODULES`，hook 註冊點見同檔的 `HOOK_WIRING_SOURCE`；開關 key 見 `src/settings/defaults.ts` 的 `MODULE_KEYS`）：

| 模組（設定 key） | 職責 |
|---|---|
| `search` | 在工作區內讀檔與搜尋（唯讀工具） |
| `verification` | 執行驗證、檢查變更範圍 |
| `commentSignal` | 註解必要檢查，含 `AI_DO_NOT_EDIT:P0` 阻斷 |
| `skills` | 把 system prompt 的技能清單換成名稱索引，並提供查詢 |
| `skiller` | 技能的掃描、驗證、草稿、晉升／退役／還原、匯入與政策更新 |
| `workflow` | 任務與計畫的狀態、內容、工作說明檢查與派遣流程 |
| `diagnostics` | 啟動導引、健康檢查、工具／hook 清單與自我測試 |
| `memory` | 兩層記憶、快照注入與結案處置 |

各模組提供的工具（名稱以 `src/modules/**` 的實作為準）：

- `search`：`peek_file`、`grep_context`
- `verification`：`verification_run`、`change-scope-check`
- `commentSignal`：`comment_signal_check`、`comment_signal_touched_report`、`comment_signal_explain`、`comment_signal_policy`、`comment_signal_only_new`、`comment_signal_baseline`、`comment_signal_suppress`
- `skills`：`skill_search`
- `skiller`：`skiller-scan`、`skiller-validate`、`skiller-draft`、`skiller-draft-read`、`skiller-draft-update`、`skiller-draft-delete`、`skiller-promote`、`skiller-retire`、`skiller-restore`、`skiller-import`、`skiller-policy-update`
- `workflow`：`task-state-sync`、`task-content-read`、`task-content-update`、`plan-state-sync`、`plan-task-link`、`plan-status`、`plan-next`、`plan-progress-reconcile`、`plan-content-create`、`plan-content-read`、`plan-content-update`、`plan-content-delete`、`work-order-build`
- `diagnostics`：`workflow_bootstrap`、`workflow_doctor`、`workflow_health_check`、`workflow_l1_check`、`tool_hook_manifest`、`ultrawork_selftest`
- `memory`：`memory-search`、`memory-read`、`memory-note`、`memory-extract`、`memory-write`、`memory-maintain`、`memory-task-close`

hook 共 6 個（名稱凍結，註冊點對照見 `src/modules/diagnostics/inventory.ts` 的 `HOOK_WIRING_SOURCE`）：`event`、`tool.execute.before`、`tool.execute.after`、`experimental.chat.system.transform`、`experimental.session.compacting`、`tool.definition`。

## 安裝

在 `opencode.jsonc` 引用這個外掛。以下兩點是實測確認的坑，請照著做：

1. key 必須是 **`plugins`（複數）**。寫成單數 `plugin` 只接受字串，物件陣列會被靜默忽略。
2. **本機目錄形式要指向目錄，不要指向檔案**。V2 對本機目錄只認根層的 `index` 或 `server` 入口：指向檔案（例如 `src/index.ts`）會被拒（`configured plugin path must be a directory`）；目錄根層沒有入口時不載入也不報錯，工具只是靜默地沒出現。

有三種形式可選，差別在「版本怎麼定」和「要不要自己裝」：

| 形式 | 寫法 | 版本 | 適用情境 |
|---|---|---|---|
| npm | `"opencode-ultrawork"` | 自動抓 `latest`，會跟著更新 | 一般使用者，想直接用最新版本 |
| npm（釘住 major） | `"opencode-ultrawork@^2.3.0"` | 只收 `2.x` 的更新 | 想自動吃小改動，但不跨大版本 |
| npm（完全釘住） | `"opencode-ultrawork@2.3.0"` | 固定不動 | 需要可重現的環境 |
| git | `"github:smile-minecraft/opencode-ultrawork#<完整 commit hash>"` | 固定在那個 commit | 要用還沒發布的 commit，或追 V2 開發進度 |
| 本機目錄 | `"/path/to/opencode-ultrawork"` | 跟你 working tree 走 | 開發這個外掛本身 |

npm 形式（一般使用者）：

```jsonc
{
  "plugins": ["opencode-ultrawork"]
}
```

要控制版本就在套件名稱後面加 `@` 加版本範圍，寫法跟 npm 一樣——`^2.0.0`、`~2.0.1`、`2.0.0` 都可以。**沒寫版本時 OpenCode 會裝 `latest`**，所以要可重現就一定要寫。名單只有 `@` 加範圍（或純數字）的時候，套件名稱要寫完整：

```jsonc
{
  // 收 2.x 的更新，不跨到 3.0
  "plugins": ["opencode-ultrawork@^2.3.0"]
}
```

git 形式（固定版本、不自動更新）：

```jsonc
{
  "plugins": ["github:smile-minecraft/opencode-ultrawork#<完整 commit hash>"]
}
```

`<完整 commit hash>` 換成實際要用的 commit。npm 與 git 形式都走 `package.json` 的 `exports` 找入口，不需要根層的 `index.ts`。開發時用本機目錄指向這個 repo 的根目錄即可——根層的 `index.ts` 就是為此存在的轉出層（說明見該檔註解）：

```jsonc
{
  "plugins": ["/path/to/opencode-ultrawork"]
}
```

## 設定

設定檔是 `ultrawork.jsonc`，有兩層：全域 `<OpenCode 全域設定資料夾>/.ultrawork/ultrawork.jsonc`，專案 `<專案根目錄>/.ultrawork/ultrawork.jsonc`（全域設定資料夾的解析規則見 `src/settings/paths.ts`：`OPENCODE_CONFIG_DIR` → `$XDG_CONFIG_HOME/opencode` → `~/.config/opencode`）。

載入順序是內建預設 → 全域 → 專案；物件深層合併，純量與陣列整個覆寫（`src/settings/merge.ts`）。讀不到檔案視為沒有設定；某一層格式錯誤只記一則警告並忽略該層，外掛照常載入（`src/settings/load.ts`）。

範例（全域與專案同一種格式，專案層只寫要覆寫的部分；欄位定義以 `schema/ultrawork.schema.json` 為準，預設值見 `src/settings/defaults.ts`）：

```jsonc
{
  // 讓編輯器自動完成、欄位檢查；所有欄位都選填
  "$schema": "https://raw.githubusercontent.com/smile-minecraft/opencode-ultrawork/main/schema/ultrawork.schema.json",
  "modules": {
    "search": true,
    "verification": true,
    "commentSignal": true,
    "skills": true,
    "skiller": true,
    "workflow": true,
    "diagnostics": true,
    "memory": true
  },
  "skiller": {
    // 個人技能目錄，預設 ~/.agents/skills
    "personalSkillRoot": "~/.agents/skills",
    // 晉升／退役時改寫的角色檔目錄，auto = <OpenCode 全域設定資料夾>/agents
    "agentsDir": "auto"
    // 注意：這兩個 key 只採全域層的值。專案層寫了會被忽略並警告
    // （詳見「skiller 的寫入位置與角色檔路由」）
  },
  "skills": {
    // 技能清單在 system prompt 的呈現：index 只列名稱，full 走原本完整清單
    "catalog": "index"
  },
  "verification": {
    // 能呼叫 verification_run 的 agent，預設只有 momus
    "runAllowedAgents": ["momus"],
    // 能呼叫 change-scope-check 的 agent，預設 build 與 ultra
    "scopeCheckAllowedAgents": ["build", "ultra"]
  },
  "memory": {
    // writerAgents 只採全域設定；空陣列表示沒有 writer
    "writerAgents": ["memorizer"],
    "inject": true,
    // 兩層記憶各自的預算，全部選填（預設見 memoryLayerBudget 的 default）。
    // budget.global 只允許寫在全域設定，專案層寫了會被忽略並警告；
    // budget.project 兩層都能寫。型別或範圍錯誤的欄位警告並退回預設
    "budget": {
      "project": {
        "indexCharLimit": 3000,
        "topicCharLimit": 4000,
        "descriptionCharLimit": 120,
        "maxTopics": 0,
        "pinnedLimit": 3,
        "pinnedInjectBudget": 2500,
        "noteCharLimit": 1000
      }
    }
  },
  "workflow": {
    "completion": {
      // memory 模組開啟時預設要求記憶處置；關閉時由完成前檢查自行放行
      "requireMemoryDisposition": true
    },
    "evidencePack": {
      // 派發 subagent 時強制檢查實作說明七節格式的名單，預設這三個
      "gatedSubagents": ["implementer", "debugger", "ultra-coder"]
    }
  }
}
```

模組開關在 `modules` 底下，預設全部開啟；關掉的模組不註冊工具、不掛 hook（`src/settings/defaults.ts`）。`memory` 關閉時，任務結案不再要求記憶處置；`commentSignal` 關閉時，結案流程的相關檢查回報「未啟用」而不是失敗。

驗證工具的 agent 授權清單（`verification.runAllowedAgents`、`verification.scopeCheckAllowedAgents`）與實作說明檢查的受控 subagent（`workflow.evidencePack.gatedSubagents`）都可以在設定覆寫，預設值見上例。型別寫錯（例如把清單寫成字串）會在載入時警告並退回預設，不影響外掛載入。空陣列代表清空名單：`runAllowedAgents`／`scopeCheckAllowedAgents` 為空時沒有 agent 能呼叫該工具（fail closed），`gatedSubagents` 為空時不再做派發前檢查。授權清單在模組註冊時快照，改完要重新載入才生效（同下）。

**改完設定要重新載入或重啟 OpenCode 才生效。**實測 OpenCode 2.0.16 只監看外掛原始檔（約 1 秒內重新載入），改 `opencode.jsonc` 或 `ultrawork.jsonc` 不會自動生效。

## 資料位置與搬遷

外掛的資料放在 `<專案>/.ultrawork/`（專案根目錄以該次呼叫所在工作階段的位置為準）：`ultrawork.jsonc`、`tasks.json`、`plans.json`、`state.md`、`plans/`、`memory/`、`comment-signal-baseline.json`、`audit.jsonl`、`cache/`（可重建的快照），以及外掛建立的 `.gitignore`（內容只有 `*` 一行，整個目錄都不進版控，含設定檔本身）。

第一次在某個專案啟動時，外掛會把舊位置的資料自動搬到 `.ultrawork/`（實作見 `src/migrate/migrate.ts`、`src/migrate/items.ts`）：

- 專案層：`.opencode/memory/` 下的 `tasks.json`、`plans.json`、`state.md`、`audit.jsonl`、`project.md`、`comment-signal-baseline.json`、`receipts/`，以及 `.opencode/plans/`。
- 全域層：設定資料夾根目錄的 `skills-policy.json`、`skills-personal.json`、`skill-drafts/`、`skill-quarantine/`。
- 只做一次（以 `.ultrawork/.migrated-from-opencode.json` 標記判斷）；**複製到新位置後把舊檔改名成 `<原檔名>.migrated-<時間戳>` 保留，永不刪除**。
- 新位置已有資料時不覆寫，記警告並跳過那個檔案。
- 任一步失敗就停下該層、不寫標記，外掛照常用新位置運作；下次啟動重跑，已搬的項目因目標已存在而自然跳過。搬遷狀態可由 `workflow_doctor` 回報。

刻意不搬的：專案的 `.opencode/skills`（沿用 OpenCode 的 project scope 技能位置），以及 `$XDG_DATA_HOME` 底下的 change-scope 快取快照（`cache/` 本來就是可重建的資料）。

搬遷標記是分層記錄的（實作見 `src/migrate/marker.ts`）：標記檔用 `version: 2` 格式，以 `layers.project`／`layers.global` 分別記錄兩層是否做過。背景是兩層共用同一個檔名，當專案目錄與全域目錄是同一個（例如在全域設定資料夾本身開工作階段），舊格式只認「檔案存在」會讓後跑的那一層靜默早退。搬移端與診斷端共用同一個 `markerCoversLayer` 判定，所以兩端對同一個標記永遠給同一個答案。以下情況一律視為「沒做過」，下次啟動會安全地重跑（重跑不覆寫新位置的既有檔案，只會把標記升級成分層格式）：標記是空的舊格式、檔案讀不到、不是合法 JSON、JSON 根不是物件。條目落在兩層都不相交的位置（外來內容）則維持舊行為。重試時落在新位置的註冊檔複本若還帶著舊 `contentRef` 前綴，會就地改寫成 `.ultrawork/` 前綴；但只處理能證明是搬遷複本的目標——辨認依據是「目標的原始位元組等於某份 `<原檔名>.migrated-<時間戳>` 封存檔」（逐位元組比對，不是解碼後字串）。證據不足就一個位元組都不改，使用者自己的檔案永遠不會被碰（實作見 `src/migrate/content-refs.ts` 的 `repairMigratedCopy`）。

舊資料來源若是 symlink（符號連結）會被拒絕：搬遷一律不跟隨 symlink，頂層項目與巢狀內容都一樣，遇到就讓該項搬遷失敗、該層不寫標記，下次啟動會重試。這是刻意的——跟隨過去會把專案外的資料讀進來。如果 `workflow_doctor` 一直回報某個舊項目沒搬完，請檢查 `.opencode/` 底下那個來源是不是 symlink（例如 `skill-drafts` 指到專案外的目錄），把它換成實體檔案或目錄後，下次啟動就會補完。

`.ultrawork/.gitignore` 的政策（實作見 `src/migrate/migrate.ts` 的 `ensureUltraworkGitignore`，判準與 `workflow_doctor` 共用同一個函式）：

- 模板只有 `*` 一行；`.ultrawork/` 是本機工作流狀態，預設不進版控（含設定檔本身；以前模板豁免過設定檔，既有專案想跟新模板一致就手動刪掉那行豁免）。
- 檔案不存在才建立；已存在永遠不自動改寫——有必要行 `*` 就視為正常，自訂內容（例如自己加回豁免行）不再每次啟動警告；缺 `*` 才警告。
- 全域層不建 `.gitignore`，外掛也不插手使用者的全域版控政策。
- 專案根目錄就是全域設定資料夾時（在全域設定資料夾本身開工作階段），兩層共用同一個 `.ultrawork/`。這時 `workflow_doctor` 會把全域層的檔案（`skills-policy.json`、`skills-personal.json`、`skill-drafts/`、`skill-quarantine/`、同時身為全域設定檔的 `ultrawork.jsonc`，以及 `.gitignore` 本身）排除在「被版控追蹤」與「設定檔被豁免」的警告之外，只在 details 註明；專案層的工作流資料（`tasks.json` 等）被追蹤時照常警告（實作見 `src/modules/diagnostics/shared.ts` 的 `isSameAsGlobalConfigDir`）。
- `workflow_doctor` 會回報三種版控衛生問題（都是 warn，不影響診斷 `ok`，外掛只提示、絕不改使用者的版控）：「`.gitignore` 不存在或缺少必要行 `*`」「`.ultrawork/` 內有檔案被版控追蹤（唯讀的 `git ls-files` 查的）」「專案設定檔仍被豁免（`!ultrawork.jsonc` 還在，會被送進版控）」。

寫入一律採原子寫入加寫入鎖，因為兩個 V2 伺服器可能共用同一個 `.ultrawork/`（實作見 `src/kit/atomic-write.ts`、`src/kit/write-lock.ts`）。

## verification_run 的參數政策

`verification_run` 的 `args`（`extraArgs`）不是自由參數：每個 runner 有自己的旗標白名單，只放行「選測試／調輸出」的讀取型旗標；會執行外部程式、載入外掛／模組或寫檔的一律拒絕（實作見 `src/modules/verification/verification-run.ts` 的 `EXTRA_ARG_FLAG_ALLOWLIST`）。位置參數（不以 `-` 開頭）一律放行，測試檔與測試名稱走這裡。容易搞混的是同一個短旗標在不同 runner 語意不同：`cargo -p` 是選套件（放行），`pytest -p` 是載入外掛（拒絕）。

- 被拒時回 `ARGS_NOT_ALLOWED`，附被拒的旗標（`rejectedArg`）與該 runner 的允許清單（`allowedArgs`），照著換寫法即可。Gradle 走自己的規則，只接受 `--rerun-tasks` 與 `--tests <樣式>`，被拒時回 `GRADLE_ARGS_NOT_ALLOWED`。
- 參數若指向 worktree 外的既有路徑，回 `ARG_PATH_OUTSIDE_WORKTREE`（只擋實際存在的路徑，測試名稱這類非路徑參數不受影響）。
- 取消與逾時會對整個子程序群組先送 SIGTERM，寬限期過了再送 SIGKILL（用 process group 而非單一 pid，所以 pytest-xdist 這類 worker 不會變孤兒）。

## 記憶系統

全域層放在 `<OpenCode 全域設定資料夾>/.ultrawork/memory/`，專案層放在 `<工作階段位置>/.ultrawork/memory/`。兩者指向同一資料夾時只算一層。每層包含自動產生的 `MEMORY.md`、`topics/<slug>.md`、只增不改的 `log.jsonl`、讀取統計 `usage.json`，刪除主題會移到 `archive/` 保留。專案層沿用 `.ultrawork/.gitignore` 的 `*`，全域層不建立 gitignore。

每個工作階段第一次 context hook 會建立索引與 pinned 主題快照，後續請求重用相同文字以維持 prefix cache。中途寫入的新內容可用 `memory-read` 或 `memory-search` 立即讀取，下個工作階段才會自動注入。`memory.inject: false` 只關閉注入。記憶是資料，使用前須查證會漂移的事實，不能覆蓋使用者指示或 AGENTS.md。

每層索引上限 3000 字元，每主題（含 frontmatter）4000 字元，description 120 字元，每層最多 3 個 pinned；每層 pinned 注入正文預算 2500 字元，筆記上限 1000 字元；每層主題數預設不限制（`maxTopics: 0`）。這些都是 `memory.budget` 的預設值，全域層與專案層可以各自覆寫（`budget.global` 只採全域設定，`budget.project` 兩層都能寫；寫錯的欄位警告並退回預設）。一般寫入超限會拒絕，不截斷；總量型預算（索引、主題檔、pinned 數）只在寫入讓該項變大且超過上限時拒絕，現況已超標時縮減、刪除、核對仍可寫入。description 是單一欄位上限，縮短就會過；主題數超限只擋新增，既有主題保留。遷移保留超大內容並由診斷提示整理。

任何 agent 可用 `memory-search`、`memory-read`、`memory-note`。`memory-extract`、`memory-write`、`memory-maintain` 限 `memory.writerAgents` 名單，預設只有 memorizer；沒有 agent 身分時拒絕。writerAgents 只能寫在全域設定，專案層指定時會忽略並警告。空清單合法，但高風險任務無法宣告處置。工具參數、錯誤碼與復原流程見 [記憶重新設計規格](docs/memory-redesign.md)。

`memory-write` 預設 preview，確認後以 apply 寫入；update、delete、verify 必須帶 `memory-read` 回傳的 expectedSha256。工具會在該層鎖內核對版本、檢查預算與疑似 secret、寫主題與索引，再附加證據。log 寫入失敗會回復主題與索引。記憶工具首次存取可能先觸發舊資料遷移。

任務進入 ARCHIVING 後，低中風險且無事可記時可呼叫 `memory-task-close`，以 `outcome: "none"` 附至少 8 個非空白字元的理由；有值得記錄的內容或高風險任務，交由 memorizer 萃取、寫入並宣告 `recorded` 或 `none`。已有帶 taskId 的寫入時不能宣告 none。`task-state-sync complete` 不再接受記憶參數，會查處置時間、writer、寫入引用、hash 鏈與主題目前 SHA。memory 模組關閉或 `workflow.completion.requireMemoryDisposition: false` 時略過並警告。舊設定 requireMemoryReceipt 已移除，載入時會警告並忽略舊值。

hash 鏈用來偵測手動修改與非工具寫入，無法阻止有檔案寫入權的人重算整條鏈，威脅模型與 tasks.json 相同。確認目前內容正確後，writer 可用 `memory-maintain` 的 `reseal-log` 模式附理由復原。驗鏈改從最新有效 reseal 開始，舊寫入引用仍須存在且屬於同一任務。log 不截斷，超過 5 MB 由 doctor 提醒。

升級時會在既有 `.opencode/` 搬遷之後，將 `.ultrawork/project.md` 按 H2 拆成主題並重建索引；code fence 裡的 H2 不拆。舊檔與 receipts 目錄改名加上 `.migrated-<時間戳>` 保留。只有 ARCHIVING 任務的有效舊收據會轉成 legacy-receipt 處置。失敗不寫完成標記，下次存取重試，不覆寫既有主題。診斷工具會回報兩層預算、鏈完整性、待整理筆記、遷移狀態與 writer 設定。

## Comment Signal 的掃描政策與結案 gate

Comment Signal 只掃「註解語法有對應 lexer 分支」的副檔名，共 32 種（實作見 `src/modules/comment-signal/file-scan.ts` 的 `SCAN_EXTENSIONS`）：TS／JS 家族（`.ts`、`.tsx`、`.js`、`.jsx`、`.mts`、`.cts`、`.mjs`、`.cjs`）、`.json`、`.css`、`.html`、`.vue`、`.svelte`、`.yaml`／`.yml`、`.txt`、`.sh`、JVM（`.java`、`.kt`、`.kts`、`.groovy`）、`.swift`、`#` 註解（`.py`、`.toml`）、C 家族（`.go`、`.rs`、`.c`、`.h`、`.cpp`、`.cc`、`.cxx`、`.hpp`）。沒有對應分支的語言（例如 `.rb`、`.php`、`.lua`、`.sql`）不納入，避免誤判。Markdown（`.md`／`.markdown`）刻意完全不掃。

掃描時跳過的東西：

- 雜訊目錄：`node_modules`、`dist`、`.git`、`coverage`、`.next`、`build`、`.turbo`、`.cache`、`.opencode`、`.obsidian`、Swift／Xcode 產物（`.build`、`DerivedData`、`.swiftpm`）、Python 機器產生目錄（`__pycache__`、`.venv`）。
- 敏感路徑不讀（見「路徑守衛」；`.env.example` 除外）。
- dot 目錄與 dot 檔分開處理：一般的 dot 目錄（如 `.github`）放行，其下的可掃描檔照常列舉；只有 basename 以 `.` 開頭的隱藏檔才跳過。

`expires=`／`due=` 以真實今天判定：過了今天就發 warning（過期是提醒更新或收尾，不是錯誤）。結案 gate（實作見 `src/modules/comment-signal/completion-gate.ts`，判定以每個檔案的最新 per-file 報告為準）：Comment Signal 開啟時，任一已檢查檔案還有未排除的問題就不給結案；問題修好並重新檢查後，乾淨報告會覆蓋舊的阻斷報告，自動解除，不會永久誤擋。

升級例外：如果結案訊息提到「升級前的阻斷記錄無法歸檔」，只重查單檔不會解除——那筆舊記錄說不出是哪個檔案，單檔的乾淨報告覆蓋不到它。解除方法是做一次完整且乾淨的重掃：先呼叫 `comment_signal_check`（不帶 `path`）重掃本工作階段；若該工作階段沒有可掃描的已修改檔（重掃掃到 0 個檔案），改以 `path: "."` 加 `changedOnly: false` 重掃整個專案。掃到檔案且結果乾淨後即解除。

## 內容引用診斷

`workflow_doctor` 有一項 `Content Ref Path Integrity` 檢查，逐項驗證任務與計畫註冊檔裡的內容引用（`contentRef`）是否還指得到正文；逐項清單放在回傳的 `content_ref_issues` 欄位，每筆含 `owner`（任務或計畫）、`id`、`field`、`ref`、`kind`、`repair`（實作見 `src/modules/diagnostics/shared.ts`）。`kind` 有四種：

- `legacy-prefix`：還指著已搬走的舊位置（`.opencode/` 前綴）。修法是把前綴換成 `.ultrawork/`，或重跑搬遷讓外掛改寫註冊檔複本。
- `outside-store`：指到 `.ultrawork/plans/` 之外的位置。讀寫工具會擋下這類引用，修法是把引用改回內容庫內。
- `not-a-file`：位置在庫內，但目標是目錄或讀不到檔案型態。目錄永遠不是合法的正文目標，修法是重新建立正文或修正引用。
- `missing-file`：引用格式沒問題，缺的只是正文檔。進行中／活躍的項目算失敗，已終態（完成／封存）的只算警告。

使用者遇到「建立／刪除計畫被擋」時：跑 `workflow_doctor` 看 `content_ref_issues`，照每筆的 `repair` 修引用即可。

## skiller 的寫入位置與角色檔路由

`skiller.personalSkillRoot` 與 `skiller.agentsDir` 只採全域層的值（實作見 `src/settings/load.ts` 的 `stripProjectSkillerRoots`）。理由是這兩個 key 決定「寫到專案外哪裡」：專案層若能改寫它們，clone 來的 repo 自帶的設定就能把寫入導到任意路徑。專案層帶著這些 key 會被整段忽略並警告，呼叫端只會看到全域層的值（或全域缺席時的內建預設）。

角色檔的 skill 路由同時支援兩種形狀：V1（`permission:` 單數下的 `skill:` map）與 V2（`permissions:` 陣列）。V2 以最後一條命中的 effect 為準（last-match），與 V1 的語意一致；晉升／退役／還原在改寫路由時會保證新規則後面沒有 glob 能在 last-match 下把它蓋掉。混合形狀（同時有 V1 map 與 V2 陣列）的角色檔會被視為結構不明而拒絕改寫。V2 規則的值可以帶空白（例如 shell 規則 `resource: git status *`）；帶空白的值只接受整段成對引號，或不含行尾註解（` #`）與巢狀映射（`: `、結尾 `:`）的純量，其餘同樣拒絕改寫。三個 skiller 工具的描述不再寫死 `permission.skill`，以免誤導 V2 形狀的使用者。

## 寫入鎖卡住時怎麼辦

同時只能有一個寫入在進行；別的寫入還沒放鎖時，新的寫入會拿到 `CONTENT_LOCK_BUSY`，等對方做完再重試即可（實作見 `src/kit/write-lock.ts`）。如果同一個鎖一直卡住，先確認沒有其他寫入真的在進行，再用 `plan-content-read` 的 `unlockStale:true` 診斷：它會回報 content 鎖與 registry 鎖各自的狀態，並自動回收「持有者已死且夠舊」的孤兒鎖。

有一種情況工具永遠不會自動處理：卡住的回收資格（`reclaimTicket.stale:true`）。資格檔是防止兩個寫入同時回收同一把鎖的互斥機制，自動與顯式路徑都不刪除它——若診斷顯示 `stale:true`，請確認沒有其他寫入在進行後，按 `hint` 指出的路徑手動刪除那個檔案（例如 `rm <hint 給的路徑>`），再重試。工具不動手是刻意的：誤刪資格檔會讓兩個寫入同時回收，鎖就失去意義了。

## 路徑守衛

全外掛共用同一份路徑守衛（實作見 `src/kit/path-guard.ts`），各模組不再各寫一份：

- 以下路徑不能當作專案根或寫入目標：空字串、系統根 `/`、`..` 這類相對逃逸、macOS 系統關鍵目錄（`/Users`、`/Volumes`），以及家目錄本身（家目錄下的一般子目錄不受影響）。realpath 後的真實路徑會再檢查一次，所以指到這些位置的 symlink 別名也過不了；無法確認 containment 時一律拒絕（fail closed）。
- 敏感檔名（比對路徑的每一段，不分大小寫）一律不讀不寫：私鑰（`id_rsa`、`id_dsa`、`id_ecdsa`、`id_ed25519`）、憑證與 token 設定（`credentials.json`、`service-account.json`、`.npmrc`、`.netrc`、`.git-credentials`）、`.env` 與 `.env.*`、`.pem`／`.key`／`.p12`／`.pfx` 結尾的檔案。唯一的例外是 `.env.example`（範例檔，可以讀）。

## 從設定 repo 版本遷移

以下是在設定 repo（`~/.config/opencode` 那一側）要做的事：

1. `opencode.jsonc` 加上 `"plugins": [..., "opencode-ultrawork@^2.3.0"]`（或用 `github:` 形式釘住某個 commit，見「安裝」）；刪掉 `plugins/opencode-ultrawork.ts`、`plugins/opencode-ultrawork/`、`tests/ultrawork/`、`scripts/generate-ultrawork-baseline.ts`。
2. `skills-policy.json`、`skills-personal.json`、`skill-drafts/`、`skill-quarantine/` 搬到 `<全域設定資料夾>/.ultrawork/`（外掛第一次啟動會自動搬；但設定 repo 裡讀它們的 `scripts/skill-approval.ts`、`scripts/skill-profile.ts`、`lib/skill-capability.ts` 和 `tests/config/` 的契約測試要改路徑）。
3. `AGENTS.md`、`agents/*.md`、`commands/*.md` 裡的 `.opencode/memory/…`、`.opencode/plans/…` 字串改成 `.ultrawork/…`。
4. `lib/dcp-evidence-policy.ts` 列的是 ultrawork 工具名稱，名稱沒變就不用改。
5. 把那條讀設定 repo 技能政策的使用者專屬測試移回設定 repo 的 `tests/config/`。

## 開發

```bash
bun install
bun test
bun run typecheck
```

`src/**` 零 V1 import 的 gate：`tests/v2/native/v1-free-surface.test.ts`。三者都要通過才算完成一個階段（`AGENTS.md`）。

提醒：49 個工具的名稱、參數與回傳格式是對外介面，凍結清單由 `tests/v2/native/diagnostics/tool-parity.test.ts` 把關；任何改變都要先問使用者（`AGENTS.md`）。

## 授權

MIT，見 `LICENSE`。
