<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.it.md">Italiano</a> |
  <strong>日本語</strong> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.vi.md">Tiếng Việt</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a>
</p>

# opencode-0-injection

エージェントプロンプトの前に優先度ゼロの運用プロンプトを前置きする、ローカルの OpenCode サーバープラグインです。

## 目的

OpenCode は最終的なシステムプロンプトを大まかに次の順序で構築します。

```text
agent prompt → environment → Instructions from AGENTS.md
```

このプラグインは OpenCode のコア動作をそのまま保ちつつ、運用者が制御するプロンプトファイルを 1 つだけ先頭に前置きします。

```text
0-injection-prompt → agent prompt → environment → instruction
```

デフォルトのプロンプトファイルは `0-injection-prompt.md` です。

## OpenCode の設定

```json
{
  "plugin": [
    [
      "./plugins/opencode-0-injection",
      {
        "file": "0-injection-prompt.md"
      }
    ]
  ]
}
```

このリポジトリを別途チェックアウトする場合は、`~/.config/opencode/plugins/opencode-0-injection` にコピーするか、プラグインエントリを絶対チェックアウトパスに向けてください。

## 動作

このプラグインは OpenCode の `experimental.chat.system.transform` フックを使用します。挿入したプロンプトをマーカーで囲むことで、再試行や繰り返しの変換で重複ブロックが蓄積しないようにします。

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## スモークテスト

```bash
npm test
```

スモークテストはプラグインをインポートし、合成システムプロンプトに対して変換を実行して、この順序を検証します。

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
