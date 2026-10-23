<p align="center">
  <a href="README.md">English</a> |
  <strong>العربية</strong> |
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

إضافة محلية لخادم OpenCode تضيف موجّهًا تشغيليًا ذا أولوية صفرية قبل موجّه الوكيل.

## الغرض

يبني OpenCode موجّه النظام النهائي وفق هذا الترتيب العام:

```text
agent prompt → environment → Instructions from AGENTS.md
```

تحافظ هذه الإضافة على سلوك OpenCode الأساسي كما هو، لكنها تضيف ملف موجّه واحدًا يتحكم فيه المشغّل في المقدمة تمامًا:

```text
0-injection-prompt → agent prompt → environment → instruction
```

ملف الموجّه الافتراضي هو `0-injection-prompt.md`.

## إعداد OpenCode

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

عند سحب هذا المستودع بشكل منفصل، إمّا انسخه إلى `~/.config/opencode/plugins/opencode-0-injection` أو وجّه مدخل الإضافة إلى مسار السحب المطلق.

## السلوك

تستخدم الإضافة خطّاف `experimental.chat.system.transform` في OpenCode. وهي تُحيط الموجّه المُضاف بعلامات حتى لا تتراكم كتل مكررة عند إعادة المحاولة أو التحويلات المتكررة:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## اختبار الدخان

```bash
npm test
```

يستورد اختبار الدخان الإضافة، ويُشغّل التحويل على موجّه نظام اصطناعي، ويتحقق من هذا الترتيب:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
