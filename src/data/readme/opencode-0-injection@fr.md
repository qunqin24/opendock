<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <strong>Français</strong> |
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

Plugin local du serveur OpenCode qui place un prompt opérationnel de priorité zéro avant le prompt de l'agent.

## Objectif

OpenCode construit son prompt système final globalement dans cet ordre :

```text
agent prompt → environment → Instructions from AGENTS.md
```

Ce plugin laisse intact le comportement principal d'OpenCode, mais place tout en tête un fichier de prompt contrôlé par l'opérateur :

```text
0-injection-prompt → agent prompt → environment → instruction
```

Le fichier de prompt par défaut est `0-injection-prompt.md`.

## Configuration d'OpenCode

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

Lorsque ce dépôt est extrait séparément, copiez-le dans `~/.config/opencode/plugins/opencode-0-injection` ou pointez l'entrée du plugin vers le chemin absolu de l'extraction.

## Comportement

Le plugin utilise le hook `experimental.chat.system.transform` d'OpenCode. Il entoure le prompt injecté de marqueurs afin que les nouvelles tentatives ou les transformations répétées n'accumulent pas de blocs en double :

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Test de fumée

```bash
npm test
```

Le test de fumée importe le plugin, exécute la transformation sur un prompt système synthétique et vérifie cet ordre :

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
