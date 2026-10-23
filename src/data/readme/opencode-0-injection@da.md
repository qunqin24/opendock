<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.bs.md">Bosanski</a> |
  <strong>Dansk</strong> |
  <a href="README.de.md">Deutsch</a> |
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

Lokalt OpenCode-server-plugin, der tilføjer en operationel prompt med nulprioritet før agent-prompten.

## Formål

OpenCode opbygger sin endelige systemprompt i nogenlunde denne rækkefølge:

```text
agent prompt → environment → Instructions from AGENTS.md
```

Dette plugin holder OpenCodes kerneadfærd intakt, men tilføjer én operatørstyret promptfil helt forrest:

```text
0-injection-prompt → agent prompt → environment → instruction
```

Standard-promptfilen er `0-injection-prompt.md`.

## OpenCode-konfiguration

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

Når dette repository tjekkes ud separat, skal du enten kopiere det til `~/.config/opencode/plugins/opencode-0-injection` eller pege plugin-posten mod den absolutte checkout-sti.

## Adfærd

Pluginet bruger OpenCodes `experimental.chat.system.transform`-hook. Det omslutter den indsatte prompt med markører, så gentagne forsøg eller gentagne transformationer ikke ophober duplikerede blokke:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Røgtest

```bash
npm test
```

Røgtesten importerer pluginet, kører transformationen mod en syntetisk systemprompt og verificerer denne rækkefølge:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
