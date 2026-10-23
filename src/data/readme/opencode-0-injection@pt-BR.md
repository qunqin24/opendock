<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <strong>Português (Brasil)</strong> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.da.md">Dansk</a> |
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

Plugin local do servidor OpenCode que adiciona um prompt operacional de prioridade zero antes do prompt do agente.

## Propósito

O OpenCode monta seu prompt de sistema final aproximadamente nesta ordem:

```text
agent prompt → environment → Instructions from AGENTS.md
```

Este plugin mantém intacto o comportamento principal do OpenCode, mas adiciona um arquivo de prompt controlado pelo operador logo no início:

```text
0-injection-prompt → agent prompt → environment → instruction
```

O arquivo de prompt padrão é `0-injection-prompt.md`.

## Configuração do OpenCode

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

Quando este repositório é clonado separadamente, copie-o para `~/.config/opencode/plugins/opencode-0-injection` ou aponte a entrada do plugin para o caminho absoluto do checkout.

## Comportamento

O plugin usa o hook `experimental.chat.system.transform` do OpenCode. Ele envolve o prompt injetado com marcadores para que novas tentativas ou transformações repetidas não acumulem blocos duplicados:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Teste de fumaça

```bash
npm test
```

O teste de fumaça importa o plugin, executa a transformação sobre um prompt de sistema sintético e verifica esta ordem:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
