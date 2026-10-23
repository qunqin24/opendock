# opencode-redact

**為 [OpenCode](https://opencode.ai) v2 提供的雙向密鑰遮蔽。**

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

[![npm](https://img.shields.io/npm/v/%40kkchengg%2Fopencode-redact)](https://www.npmjs.com/package/@kkchengg/opencode-redact)
[![license](https://img.shields.io/npm/l/%40kkchengg%2Fopencode-redact)](./LICENSE)

`opencode-redact` 會在你的 OpenCode 對話中，於內容**送出給模型之前**，把 API 金鑰、令牌、密碼等密鑰替換成穩定的佔位符；接著在**工具執行之前**把佔位符還原成真正的值。模型永遠看不到密鑰，但工具仍然能拿到真值。

## 為什麼需要它

OpenCode v2 更換了外掛 API，因此像 `opencode-vibeguard` 這類 V1 隱私外掛已無法載入——而 v2 也沒有內建的遮蔽功能。`opencode-redact` 以一個小型、零相依的外掛補上這個缺口，並針對 v2 掛鉤 API 撰寫。

## 運作方式

```text
                    遮蔽                       還原
提示 ──▶ [REDACTED:aws-access-key:…] ──▶ 模型 ──▶ 工具輸入 ──▶ 真正的密鑰
         (prompt + context 掛鉤)              (execute.before 掛鉤)
```

- **`prompt`** — 在你輸入的文字被保存之前就先行遮蔽。
- **`context`** — 在請求送出前，遮蔽系統提示、訊息歷史（含先前的工具輸出）與工具定義。
- **`execute.before`** — 在工具輸入中把佔位符還原成真正的密鑰，讓需要該值的指令仍能運作。

每個密鑰都會變成穩定的令牌 `[REDACTED:<規則>:<指紋>]`。同一個密鑰永遠得到同一個令牌，因此模型仍可引用它。

## 安裝

**從 npm 安裝**

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@kkchengg/opencode-redact@latest"]
}
```

**以本機檔案直接放入** — 將 `src/index.ts` 複製到 `~/.config/opencode/plugins/redact/index.ts`。全域外掛會自動載入，不需設定檔項目。

## 會偵測的密鑰

| 規則 | 比對 |
|------|------|
| `aws-access-key` | `AKIA…`、`ASIA…`、`AGPA…` 等 |
| `gcp-api-key` | `AIza…` |
| `github-pat` | `ghp_`、`gho_`、`ghu_`、`ghs_`、`ghr_` |
| `github-fine-grained` | `github_pat_…` |
| `gitlab-pat` | `glpat-…` |
| `openai-key` | `sk-…`、`sk-proj-…` |
| `anthropic-key` | `sk-ant-…` |
| `slack-token` | `xoxb-`、`xoxa-`、`xoxp-`、`xoxr-`、`xoxs-` |
| `stripe-key` | `sk_live_`、`sk_test_`、`rk_live_`、`rk_test_` |
| `npm-token` | `npm_…` |
| `pypi-token` | `pypi-…` |
| `jwt` | 以 `eyJ` 開頭、由點分隔的三段 base64url |
| `private-key` | PEM `-----BEGIN … PRIVATE KEY-----` 區塊 |
| `credential` | `password: …`, `api_key=…`, `secret=…`, `token: …` |

## 涵蓋範圍與限制

**受保護** — 送出方向的提示、系統提示、訊息歷史（含工具輸出）與工具定義；送入方向的工具輸入。

**不受保護**

- 上方表單未列出的密鑰格式。
- 經 base64 編碼、加密或被拆散成多段的密鑰，以及沒有 `key = value` 形式的密碼。
- 大型或二進位字串（`data:` URI、過大的 base64 區塊）會刻意略過，以免破壞圖片與檔案。
- 保存庫存在於行程內：服務重啟後，舊歷史中的佔位符將無法還原。
- 還原取決於模型是否原樣回傳佔位符。

遮蔽保護的是離開你機器的內容。它是一層防禦，而不是把真實憑證貼進對話的理由。

## 相容性

OpenCode **v2.0.18+**（使用 v2 的 `prompt`、`context`、`tool.execute.before` 掛鉤）· Node **20+**。

## 開發

```bash
npm install
npm run build     # tsc -> dist/
npm test          # build + node --test
```

## 授權

[MIT](./LICENSE)
