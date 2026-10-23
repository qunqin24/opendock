<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ar.md">العربية</a> |
  <strong>বাংলা</strong> |
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

স্থানীয় OpenCode সার্ভার প্লাগইন যা এজেন্ট প্রম্পটের আগে একটি অগ্রাধিকার-শূন্য অপারেশনাল প্রম্পট যুক্ত করে।

## উদ্দেশ্য

OpenCode তার চূড়ান্ত সিস্টেম প্রম্পট মোটামুটি এই ক্রমে তৈরি করে:

```text
agent prompt → environment → Instructions from AGENTS.md
```

এই প্লাগইন OpenCode-এর মূল আচরণ অক্ষুণ্ণ রাখে, তবে একদম সামনে অপারেটর-নিয়ন্ত্রিত একটি প্রম্পট ফাইল যুক্ত করে:

```text
0-injection-prompt → agent prompt → environment → instruction
```

ডিফল্ট প্রম্পট ফাইল হলো `0-injection-prompt.md`।

## OpenCode কনফিগ

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

এই রিপোজিটরি আলাদাভাবে চেকআউট করা হলে, হয় এটি `~/.config/opencode/plugins/opencode-0-injection`-এ কপি করুন অথবা প্লাগইন এন্ট্রিটি পরম চেকআউট পাথে নির্দেশ করুন।

## আচরণ

প্লাগইনটি OpenCode-এর `experimental.chat.system.transform` হুক ব্যবহার করে। এটি ইনজেক্ট করা প্রম্পটকে মার্কার দিয়ে ঘিরে রাখে যাতে পুনঃচেষ্টা বা পুনরাবৃত্ত ট্রান্সফর্মে ডুপ্লিকেট ব্লক জমা না হয়:

```text
<opencode-0-injection-prompt>
...
</opencode-0-injection-prompt>
```

## স্মোক টেস্ট

```bash
npm test
```

স্মোক টেস্ট প্লাগইনটি ইম্পোর্ট করে, একটি কৃত্রিম সিস্টেম প্রম্পটের বিপরীতে ট্রান্সফর্ম চালায় এবং এই ক্রমটি যাচাই করে:

```text
0-injection < agent prompt < environment < instruction
```

<!-- i18n:source-hash:b60576dd761199a532b6d843576bd127703c42d60086f0dc5c2cecf018b47adb -->
