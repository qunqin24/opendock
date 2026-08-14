# @jimmyyen/opencode-speak-human-tw

[![npm](https://img.shields.io/npm/v/@jimmyyen/opencode-speak-human-tw)](https://www.npmjs.com/package/@jimmyyen/opencode-speak-human-tw)
[![npm downloads](https://img.shields.io/npm/dm/@jimmyyen/opencode-speak-human-tw)](https://www.npmjs.com/package/@jimmyyen/opencode-speak-human-tw)

將 [Raymond Hou (雷蒙三十)](https://github.com/Raymondhou0917) 的 [speak-human-tw](https://github.com/Raymondhou0917/speak-human-tw) 移植成 [OpenCode](https://github.com/opencode-ai/opencode) 的 plugin。

## 安裝

### 全域安裝（建議）

```bash
opencode plugin @jimmyyen/opencode-speak-human-tw --global
```

### 專案安裝

`opencode.json` 的 `plugin` 陣列加一行：

```json
{
  "plugin": ["@jimmyyen/opencode-speak-human-tw"]
}
```

裝好後重啟 OpenCode，plugin 會自動註冊 `/speak-human-tw` 指令和 skills。

### 從舊版升級

v1.5.5 或更舊版本沒有自動更新機制，第一次升級需要清掉 cache 再重裝：

```bash
rm -rf ~/.cache/opencode/packages/@jimmyyen/opencode-speak-human-tw*
opencode plugin @jimmyyen/opencode-speak-human-tw --global
```

之後的版本就會自動檢查更新了。

### 更新檢查

安裝後每小時會自動檢查 npm 有無新版，有的話會下載並提示重啟。可透過環境變數關閉：

```bash
SPEAK_HUMAN_TW_AUTOUPDATE=0 opencode
```

## 用法

- `/speak-human-tw` 直接貼文字
- `/speak-human-tw @filename.md` 用 `@` 傳檔案
- 直接說「這段去 AI 味」「幫我潤稿」，skill 就會自動處理

## 授權

MIT，同原專案。

## 原始專案

[speak-human-tw](https://github.com/Raymondhou0917/speak-human-tw) by [Raymond Hou (雷蒙三十)](https://github.com/Raymondhou0917)。安裝教學、案例示範請見[原始 README](https://github.com/Raymondhou0917/speak-human-tw/blob/main/README.md)。
