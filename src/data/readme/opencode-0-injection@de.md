<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.da.md">Dansk</a> |
  <strong>Deutsch</strong> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.ja.md">日本語</a> |
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

Lokales OpenCode-Server-Plugin, das vor dem Agenten-Prompt einen operativen Prompt mit Priorität null voranstellt.

## Zweck

OpenCode baut seinen finalen System-Prompt grob in dieser Reihenfolge auf:

```text
agent prompt → environment → Instructions from AGENTS.md
```

Dieses Plugin lässt das Kernverhalten von OpenCode unverändert, stellt aber ganz vorne eine vom Betreiber kontrollierte Prompt-Datei voran:

```text
0-injection-prompt → agent prompt → environment → instruction
```

Die Standard-Prompt-Datei ist `0-injection-prompt.md`.

## OpenCode-Konfiguration

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

Wenn dieses Repository separat ausgecheckt wird, kopiere es entweder nach `~/.config/opencode/plugins/opencode-0-injection` oder richte den Plugin-Eintrag auf den absoluten Checkout-Pfad aus.

## Verhalten

Das Plugin nutzt den `experimental.chat.system.transform`-Hook von OpenCode. Es umschließt den eingefügten Prompt mit Markern, damit Wiederholungen oder wiederholte Transformationen keine doppelten Blöcke ansammeln:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Smoke-Test

```bash
npm test
```

Der Smoke-Test importiert das Plugin, führt die Transformation gegen einen synthetischen System-Prompt aus und überprüft diese Reihenfolge:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
