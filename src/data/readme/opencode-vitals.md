# OpenCode Arabic

Arabic text direction for [OpenCode](https://opencode.ai): messages read and align
right-to-left, the prompt box follows the language you type, and English keeps
reading left-to-right in the same conversation. Code, paths and shell output stay
pinned left.

This is the whole plugin. It does not measure speed, show turns or tokens, run a
local server, or touch the app's renderer. The package keeps its old name,
`opencode-vitals`, so an existing `opencode.json` entry keeps working.

## Install

Add the package to `opencode.json` (or `opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-vitals"]
}
```

Or let OpenCode add it:

```bash
opencode plugin add opencode-vitals
```

Then restart OpenCode once. On the first start after upgrading from 0.2, the
plugin also removes the old readout's launcher entry and its copy of the app
renderer. If the old numbers are still in the composer after that restart,
quit OpenCode completely and open it again.

## What it fixes

- **Assistant messages**: every paragraph, heading, list item and quote decides
  its own direction from its own first strong character. An Arabic paragraph is
  right-aligned; an English paragraph beside it stays left-aligned.
- **Your messages**: the same per-message direction, so an Arabic prompt sits on
  the right of its bubble.
- **The prompt box**: each line follows the language you are typing instead of
  inheriting the line above it.
- **Compaction and retry notices**: treated as message text too.
- **Code stays LTR**: code blocks, inline code, file paths, diffs and shell output
  are isolated and pinned left in every language.

The app's chrome — sidebar, titlebar, menus — is not changed.

## How it works

The plugin is one file, `gui-experimental.cjs`, loaded into the desktop window.
It contributes one stylesheet through OpenCode's `Style` registry and marks
message blocks `dir="auto"`, which also lets OpenCode's own `:dir(rtl)` rules
mirror the layout. There is no polling and no server; the browser re-evaluates
`dir="auto"` as text streams in. Its `main` entry removes the files version 0.2
wrote, then the window is the whole plugin.

Requires OpenCode V2 Desktop with the GUI plugin API (2.2.x). The terminal client
is unaffected.

## Upgrade from 0.2

Version 0.2 measured turns, steps and streaming tok/s. That feature is gone.
After installing 0.3:

1. Restart OpenCode once. The old launcher entry is removed and the app opens
   normally from then on.
2. If the composer still shows the old `turns`, `steps`, `tok/s` row, quit and
   reopen OpenCode; the running window was started by the old launcher.

## Development

```bash
npm test
```

Everything lives in `gui-experimental.cjs`: the Arabic direction rules, the DOM
pass, and the one-time cleanup of the old readout.

## العربية

إصلاح اتجاه النص العربي في تطبيق OpenCode: الرسائل تُقرأ وتُحاذى من اليمين إلى
اليسار، ومربع الكتابة يتبع اللغة التي تكتبها، بينما يبقى الإنجليزي من اليسار إلى
اليمين في المحادثة نفسها. الأكواد والمسارات ومخرجات الأوامر تبقى دائماً من
اليسار إلى اليمين.

النسخة 0.3 لا تقيس السرعة ولا تعرض عدد الأدوار أو الرموز، ولا تشغّل خادماً
محلياً. بعد التحديث من 0.2 أعد تشغيل OpenCode مرة واحدة؛ سيزيل الملحق نقطة
التشغيل القديمة ونسخة الواجهة التي كان يستخدمها.

## License

MIT
