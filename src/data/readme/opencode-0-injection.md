<p align="center">
  <strong>English</strong> |
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

Local OpenCode server plugin that prepends a priority-zero operational prompt before the agent prompt.

## Purpose

OpenCode builds its final system prompt in this broad order:

```text
agent prompt → environment → Instructions from AGENTS.md
```

This plugin keeps OpenCode core behavior intact, but prepends one operator-controlled prompt file at the very front:

```text
0-injection-prompt → agent prompt → environment → instruction
```

The default prompt file is `0-injection-prompt.md`.

## OpenCode config

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

When this repository is checked out separately, either copy it into `~/.config/opencode/plugins/opencode-0-injection` or point the plugin entry at the absolute checkout path.

## Behavior

The plugin uses OpenCode's `experimental.chat.system.transform` hook. It wraps the injected prompt with markers so retries or repeated transforms do not accumulate duplicate blocks:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Smoke test

```bash
npm test
```

The smoke test imports the plugin, runs the transform against a synthetic system prompt, and verifies this ordering:

```text
0-injection < agent prompt < environment < instruction
```
