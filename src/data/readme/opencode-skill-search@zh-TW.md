[English](./README.md)

# opencode-skill-search

基於 BM25 排序的 [OpenCode](https://github.com/anomalyco/opencode) skill 搜尋 plugin — 用關鍵字快速找到並載入 agent skills。

## 為什麼需要？

OpenCode 內建的 `skill` tool 會把所有已安裝的 skill 清單塞進 tool description，每次請求都消耗大量 token。這個 plugin 用按需搜尋的 `skill_search` tool 取代它，透過 BM25 排序只在需要時找出相關的 skills。

## 功能

- **`skill_search` tool** — 用關鍵字搜尋已安裝的 skills，以 BM25 相關性排序
- **System prompt 注入** — 提醒 agent 在處理非簡單任務前先搜尋可用的 skills
- **Skill tool 精簡** — 將 `skill` tool 描述中冗長的 skill 清單替換為指向 `skill_search` 的提示

## 安裝

在 `opencode.json` 中加入：

```json
{
  "plugin": ["opencode-skill-search"]
}
```

OpenCode 下次啟動時會自動安裝。

## 掃描目錄

Plugin 會在以下目錄中尋找 `SKILL.md` 檔案：

| 目錄 | 來源 |
|------|------|
| `<專案>/.opencode/skills/` | 專案 OpenCode |
| `~/.config/opencode/skills/` | 全域 OpenCode |
| `<專案>/.claude/skills/` | 專案 Claude 相容 |
| `~/.claude/skills/` | 全域 Claude 相容 |
| `<專案>/.agents/skills/` | 專案 Agent 相容 |
| `~/.agents/skills/` | 全域 Agent 相容 |
| `~/.cache/opencode/node_modules/superpowers/skills/` | 已安裝的 skill 套件 |

## 使用方式

安裝後，agent 會在執行任務前自動呼叫 `skill_search`。也可以直接使用：

```
skill_search({query: "testing"})
skill_search({query: "docker deployment", max_results: 3})
```

## 授權

MIT
