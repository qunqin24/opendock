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
  <strong>Italiano</strong> |
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

Plugin locale del server OpenCode che antepone un prompt operativo a priorità zero prima del prompt dell'agente.

## Scopo

OpenCode costruisce il suo prompt di sistema finale all'incirca in questo ordine:

```text
agent prompt → environment → Instructions from AGENTS.md
```

Questo plugin mantiene intatto il comportamento principale di OpenCode, ma antepone un file di prompt controllato dall'operatore proprio all'inizio:

```text
0-injection-prompt → agent prompt → environment → instruction
```

Il file di prompt predefinito è `0-injection-prompt.md`.

## Configurazione di OpenCode

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

Quando questo repository viene clonato separatamente, copialo in `~/.config/opencode/plugins/opencode-0-injection` oppure fai puntare la voce del plugin al percorso assoluto del checkout.

## Comportamento

Il plugin usa l'hook `experimental.chat.system.transform` di OpenCode. Avvolge il prompt iniettato con dei marcatori in modo che i tentativi ripetuti o le trasformazioni ripetute non accumulino blocchi duplicati:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Smoke test

```bash
npm test
```

Lo smoke test importa il plugin, esegue la trasformazione su un prompt di sistema sintetico e verifica questo ordine:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
