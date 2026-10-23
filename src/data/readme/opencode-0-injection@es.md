<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.de.md">Deutsch</a> |
  <strong>Español</strong> |
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

Plugin local del servidor OpenCode que antepone un prompt operativo de prioridad cero antes del prompt del agente.

## Propósito

OpenCode construye su prompt de sistema final aproximadamente en este orden:

```text
agent prompt → environment → Instructions from AGENTS.md
```

Este plugin mantiene intacto el comportamiento central de OpenCode, pero antepone un archivo de prompt controlado por el operador justo al principio:

```text
0-injection-prompt → agent prompt → environment → instruction
```

El archivo de prompt predeterminado es `0-injection-prompt.md`.

## Configuración de OpenCode

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

Cuando este repositorio se clona por separado, cópialo en `~/.config/opencode/plugins/opencode-0-injection` o apunta la entrada del plugin a la ruta absoluta del checkout.

## Comportamiento

El plugin usa el hook `experimental.chat.system.transform` de OpenCode. Envuelve el prompt inyectado con marcadores para que los reintentos o las transformaciones repetidas no acumulen bloques duplicados:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## Prueba de humo

```bash
npm test
```

La prueba de humo importa el plugin, ejecuta la transformación sobre un prompt de sistema sintético y verifica este orden:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
