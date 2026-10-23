# ai-project-tracker

> **🌐 [English](README.md) · [فارسی (Persian)](README.fa.md)**

ردیاب پیشرفت پروژه بهصورت بلادرنگ **برای ابزارهای کدنویسی هوش مصنوعی** — opencode، Claude Code، هر IDE سازگار با MCP (Cursor، Windsurf، Cline، Claude Desktop، VS Code Copilot و…) و پلتفرمهای وب (Replit، Lovable، Bolt، v0) از طریق پروتکل فایل.

هر عملیات (ویرایش، تست، استقرار، مستندات، کامیت و…) را هنگام کار ثبت میکند، آن را به یکی از **۷ فاز پروژه** نگاشت میدهد، **درصد** هر فاز و کل پروژه، **نرخ رشد** و یک **داشبورد HTML مدرن** با نمودارهای SVG میسازد — کاملاً **محلی؛ هیچ دادهای از سیستم شما خارج نمیشود**.

![dashboard](https://img.shields.io/badge/dashboard-dark%20theme-8b5cf6) ![platform](https://img.shields.io/badge/platform-opencode%20%7C%20claude%20%7C%20mcp%20%7C%20cli%20%7C%20web-22d3ee) ![license](https://img.shields.io/badge/license-MIT-green)

## یک موتور، چهار رابط

| رابط | محل اجرا | نحوهٔ ثبت |
|---|---|---|
| **پلاگین opencode** | opencode | کاملاً خودکار — هر فراخوانی ابزار + چت + نشستها |
| **هوکهای Claude Code** | Claude Code | کاملاً خودکار — `PostToolUse` / `UserPromptSubmit` / `SessionStart` / `Stop` |
| **سرور MCP** | Cursor، Windsurf، Cline، Claude Desktop، VS Code Copilot و… | ابزارها: `tracker_note`، `tracker_summary`، `tracker_open`، `tracker_report`، `tracker_init`، `tracker_list` |
| **CLI + پروتکل فایل** | هر ترمینال + پلتفرمهای وب | `pt init / status / note / report / open / list` — عامل وب `progress.json` / `USL_PROGRESS.md` را بهروز میکند و شما داشبورد را میسازید |

همهٔ رابطها از یک **موتور هستهٔ مشترک** (`core/tracker-core.mjs`) و فایلهای وضعیت مشترک استفاده میکنند؛ پس یک پروژه میتواند همزمان با چند ابزار ردیابی شود بدون تداخل.

## نصب

### 📚 راهنمای دقیق هر پلتفرم

| پلتفرم | راهنما |
|---|---|
| opencode | [`docs/OPENCODE.md`](docs/OPENCODE.md) — قراردادن پلاگین، دستور `/tracker`، نصب از npm |
| Claude Code | [`docs/CLAUDE-CODE.md`](docs/CLAUDE-CODE.md) — هوکها، MCP، `/tracker`، رفع مشکل |
| هر کلاینت MCP (Cursor، Windsurf، Cline، Claude Desktop، Copilot) | [`docs/MCP.md`](docs/MCP.md) — نصاب یکدستوری، JSON دستی برای هر کلاینت، مرجع ابزارها |
| CLI | [`docs/CLI.md`](docs/CLI.md) — مرجع کامل دستورات با مثال |
| پلتفرمهای وب (Replit، Lovable، Bolt، v0) | [`docs/WEB-PLATFORMS.md`](docs/WEB-PLATFORMS.md) — پروتکل فایل، دستورالعمل عامل |

### گزینهٔ A — opencode (پلاگین)

فایل پلاگین را در پوشهٔ پلاگینها قرار دهید و opencode را ریاستارت کنید:

- سطح پروژه: `.opencode/plugins/project-tracker.ts`
- سراسری (همهٔ پروژهها): `~/.config/opencode/plugins/project-tracker.ts`

اختیاری: دستور `/tracker` (نمایش خلاصهٔ متنی در چت + بازکردن داشبورد):

- `.opencode/command/tracker.md` یا `~/.config/opencode/command/tracker.md`

### گزینهٔ B — سرور MCP (Cursor، Windsurf، Cline، Claude Desktop، Copilot، Claude Code و…)

`mcp/server.mjs` را بهعنوان سرور MCP از نوع **stdio** ثبت کنید (بدون وابستگی — نیازی به npm install نیست).

**نصاب یکدستوری** (بدون خطر بازنویسی، قابل اجرای مکرر، قبل از هر تغییر پشتیبان میگیرد):

```sh
node mcp/install.mjs                # ثبت در: Claude Code، Claude Desktop، Cursor، Windsurf
node mcp/install.mjs --vscode       # ثبت در فضای کاری فعلی (VS Code Copilot)
node mcp/install.mjs --list         # نمایش وضعیت ثبت
```

ثبت دستی (معادل):

- **Cursor**: Settings → MCP → Add → Command: `node /path/to/repo/mcp/server.mjs`
- **Windsurf**: Settings → MCP → Add → همان دستور
- **Cline** (VS Code): MCP Servers → Add → stdio → `node /path/to/repo/mcp/server.mjs`
- **Claude Desktop**: `claude_desktop_config.json` → `"mcpServers": { "project-tracker": { "command": "node", "args": ["/path/to/repo/mcp/server.mjs"] } }`
- **Claude Code**: `~/.claude.json` → `"mcpServers"` (همان ساختار) یا `claude mcp add`
- **VS Code Copilot**: فایل `.vscode/mcp.json` فضای کاری → `"mcpServers"` (همان ساختار)

سپس از هوش مصنوعی بخواهید ابزارها را صدا بزند (`tracker_summary`، `tracker_note`، `tracker_open` و…). سرور پوشهٔ کاری را پروژهٔ جاری فرض میکند؛ با `project: "name-or-path-fragment"` هر پروژهٔ ردیابیشده را هدف بگیرید.

### گزینهٔ C — Claude Code (هوکها)

```sh
node hooks/claude-code/install.mjs            # سراسری (~/.claude/settings.json)
node hooks/claude-code/install.mjs --project # فقط همین پروژه (.claude/settings.json)
```

Claude Code را ریاستارت کنید. هر فراخوانی ابزار خودکار ثبت میشود؛ داشبورد با `node cli/pt.mjs open`.

### گزینهٔ D — پلتفرمهای وب (Replit، Lovable، Bolt، v0 و…)

پلاگینی لازم نیست — عامل یک فایل پیشرفت را بهروز میکند و شما داشبورد را بهصورت محلی میسازید:

1. محتوای `web/AGENT_INSTRUCTIONS.md` را در دستورالعملهای عامل وب بگذارید.
2. با عامل کار کنید (او `USL_PROGRESS.md` / `progress.json` را نگهداری میکند).
3. روی سیستم خودتان: `node cli/pt.mjs report` و سپس `node cli/pt.mjs open`.

جزئیات در `web/README.md`.

### گزینهٔ E — npm (opencode.json)

```json
{
  "plugin": ["ai-project-tracker"]
}
```

> `npm i -g ai-project-tracker` دستور `pt` را هم در همهجا در دسترس میگذارد.

## استفاده

هنگام کار با opencode، پلاگین هر عملیات ابزار را بلادرنگ ثبت میکند. برای دیدن پیشرفت:

1. `/tracker` (یا `/t`) را در پرامپت opencode بنویسید — خلاصهٔ عددی دوزبانه (EN/FA) در چت میآید و داشبورد در مرورگر باز میشود.
2. یا `ctrl+p` و انتخاب **tracker** از فهرست دستورات.
3. داشبورد بعد از هر عملیات خودکار بهروز میشود (با محدودیت ~۴ ثانیه).

### ایمپورت تاریخچهٔ گیت (پرکردن فازهای گذشته)

اگر پروژه قبل از نصب ترکر کامیت دارد، آنها را ایمپورت کنید تا درصدها و آمارها کارهای گذشته را نشان دهند — **idempotent** (اجرای دوباره فقط کامیتهای جدید را اضافه میکند):

```sh
pt import-git                      # همهٔ کامیتهای ریپوی فعلی
pt import-git "2 weeks ago"        # فقط کامیتهای اخیر
```

یا از طریق MCP: `tracker_import_git` (آرگومانها: `project`، `since`).

هر کامیت بر اساس پیامش به فازی نگاشت میشود: `feat/fix/refactor` → پیادهسازی، `test` → تست و QA، `docs` → مستندات، `ci/deploy/docker/release` → استقرار، `merge/version` → بازبینی و تحویل. کامیتها با زمان واقعیشان بهعنوان موفقیت تأییدشده شمارش میشوند (پس نمودار رشد صادقانه است).

### یادداشتها با فاز و وزن (امتیازدهی عقبمانده)

یادداشتها بهطور پیشفرض فقط به تایملاین اضافه میشوند. با `phase` و `weight` اختیاری، امتیاز هم به فاز داده میشود (مثلاً ثبت کار انجامشدهٔ خارج از ترکر):

```sh
pt note success "staging released manually" --phase deploy --weight 3
```

معادل MCP: `tracker_note` با `{ "text": "...", "type": "success", "phase": "deploy", "weight": 3 }`.

## نحوهٔ کار

- هر فراخوانی ابزار به یک فاز با وزن طبقهبندی میشود (تست/استقرار سنگینتر از خواندن است).
- پیشرفت فاز = `score / goal` (اهداف از پیش تعریفشدهاند).
- پیشرفت کل = مجموع امتیاز / مجموع اهداف، سقف ۱۰۰٪.
- نرخ رشد = دلتای امتیاز در ۶۰ دقیقهٔ اخیر، بهازای ساعت.
- ETA = امتیاز باقیمانده / نرخ رشد (بعد از کافی بودن تاریخچه ظاهر میشود).
- فایلهای خروجی:

```
<project>/.opencode/project-tracker/
├── state.json    # وضعیت قابلخواندن برای ماشین
├── report.html   # داشبورد بصری مستقل (بدون نیاز به اینترنت)
├── report.md     # خلاصهٔ مارکداون
└── config.json   # اختیاری: سفارشیسازی شما (پایین)
```

ثبت سراسری (همهٔ پروژههای ردیابیشده): `~/.config/opencode/project-tracker/projects.json`

## پیکربندی

`config.json` در `.opencode/project-tracker/` (برای هر پروژه) یا `~/.config/opencode/project-tracker/config.json` (سراسری — پیکربندی پروژه بر سراسری مقدم است):

```json
{
  "goals": { "coding": 80, "testing": 40 },
  "weights": { "edit": 2, "bash": 1 },
  "names": {
    "coding": { "en": "Coding", "fa": "کدنویسی" }
  }
}
```

- `goals` — امتیاز هدف هر فاز (کلیدها: `research`، `setup`، `coding`، `testing`، `docs`، `deploy`، `delivery`)
- `weights` — وزن ابزار خاص (مثل `edit`، `bash`، `read`، `write`، `task`)
- `names` — تغییر نام فاز در داشبورد (EN/FA)

### فهرست فازهای سفارشی (هر تعداد فاز)

اگر پروژهٔ شما گردش کار متفاوتی دارد، ۷ فاز پیشفرض را کاملاً با فازهای خودتان جایگزین کنید — بیشتر یا کمتر، هر تعداد:

```json
{
  "phases": [
    { "key": "planning", "en": "Planning", "fa": "برنامه‌ریزی", "desc_en": "Scope", "desc_fa": "دامنه", "goal": 20 },
    { "key": "build",    "en": "Build",    "fa": "ساخت",       "desc_en": "Code", "desc_fa": "کد",   "goal": 50 },
    { "key": "qa",       "en": "QA",       "fa": "کنترل کیفیت","desc_en": "Tests","desc_fa": "تست‌ها","goal": 20 },
    { "key": "release",  "en": "Release",  "fa": "انتشار",     "desc_en": "Ship", "desc_fa": "تحویل", "goal": 10 }
  ],
  "remap": { "coding": "build", "testing": "qa", "deploy": "release", "delivery": "release" },
  "default_phase": "planning"
}
```

- `phases` — فهرست فازهای خودتان (فیلدهای `key`، `en`، `fa`، `desc_en`، `desc_fa`، `goal`، `color`؛ فقط `key` الزامی است و بقیه به پیشفرض برمیگردند، رنگها خودکار از پالت انتخاب میشوند)
- `remap` — نگاشت کلیدهای طبقهبندی داخلی (`research`، `setup`، `coding`، `testing`، `docs`، `deploy`، `delivery`) به کلیدهای فاز شما
- `default_phase` — مقصد عملیاتهای نامطابق (پیشفرض: اولین فاز)

## یادداشتهای پیشرفت (باگها، خطاها، موفقیتها)

هر عملیات یک **وضعیت** خودکار میگیرد — ✅ موفق / ❌ خطا / ⚠️ هشدار — همراه با توضیح کوتاه آنچه واقعاً رخ داد (خروجی تست، فایل تغییرکرده، متن خطا). جمعها در داشبورد و `report.md` نمایش داده میشوند.

همچنین میتوانید یادداشت صریح ثبت کنید — مثلاً یک باگ پیدا شده، خطایی رفعشده، استقراری موفق — با درخواست از دستیار برای صدا زدن ابزار داخلی `tracker_note`:

```
Use tracker_note with text: "fixed auth bug — token expiry" and type: "success"
```

انواع: `success`، `error`، `warning`، `info`. یادداشتها فوراً در گزارش فعالیت ظاهر میشوند و در جمع موفقیت/خطا شمارش میشوند.

## پیشنهادها و راهحلها

داشبورد بخش **💡 پیشنهادها و راهحلها** دارد که ترکیبی است از:

1. **بینشهای خودکار** — برگرفته از دادههای ثبتشده:
   - ❌ خطاهای گروهبندیشده بهتفکیک فاز، هرکدام با راهحل هدفمند (تست ناموفق → اجرا با `--nocapture`؛ `not found` → بررسی مسیر/ایمپورت؛ denied → بررسی مجوزها؛ `panic/unwrap` → مدیریت null؛ پورتها، تایماوتها و…)
   - ⚠️ هشدار نرخ خطای بالا (≥ ۲۰٪)
   - 🧪 نبود تست، 💾 ویرایش بدون کامیت، 📚 نبود مستندات، 🚀 فازهای شروعنشده، ✅ سرعت سالم، 🎉 تکمیل پروژه

2. **پیشنهادها و راهحلهای عامل** — پیشنهادهای خودتان را ثبت کنید، در بالا با 💡/🔧 نمایش داده میشوند:

```
Use tracker_note with text: "prefer lockfile for reproducible builds" and type: "suggestion"
Use tracker_note with text: "split the big query into two to fix the timeout" and type: "solution"
```

انواع: `suggestion`، `solution`، `recommendation` (بهعنوان کارت آمار هم دیده میشوند). همان فهرست در `report.md` هم هست.

## ایمپورت خودکار پیشرفت موجود

شروع ترکر روی **پروژهٔ موجود**؟ دیگر داشبورد خالی نیست. پلاگین خودکار پروژه را برای فایلهای پیشرفت اسکن میکند و گامهای انجامشده را به امتیاز فازها ایمپورت میکند:

- سطح ریشه: `USL_PROGRESS.md`، `PROGRESS.md`، `progress*.json`، `ROADMAP.md`، `roadmap*.json`
- زیرپوشهها: `reports/`، `docs/`، `planning/`، `plans/`، `progress/` (تا عمق ۲)

**فرمتهای پشتیبانیشده (تشخیص خودکار، بدون نیاز به پیکربندی):**

1. آرایهٔ JSON از گامها:
```json
[
  { "id": "s1", "name": "schema migration 011", "phase": "testing", "status": "committed", "score": 2 },
  { "id": "s2", "name": "GDPR erasure endpoint", "phase": "coding", "status": "done" },
  { "id": "s3", "name": "audit retention docs", "phase": "docs", "status": "todo" }
]
```
وضعیتهای `done`/`complete`/`committed`/`ok`/`شده` امتیاز میگیرند؛ آیتمهای `todo` فاز را بدون امتیاز ثبت میکنند. فیلد فاز خودکار تشخیص داده میشود (`phase`/`fase`/`stage`/`category`/`area`/`key`) و فیلد امتیاز (`score`/`points`/`weight`/`value`، پیشفرض ۱).

2. نگاشت JSON: `{ "phases": { "coding": 80, "testing": 30 } }` یا ساده `{ "coding": 80 }`.

3. چکلیست مارکداون با عنوان `## Phase` (یا `(phase: key)` داخل خط):
```md
## Testing
- [x] run integration suite
- [ ] add coverage for privacy module
- [x] smoke flow (phase: deploy)
```

**رفتار:** ایمپورتها idempotent هستند — ریاستارت opencode هرگز دوباره شمارش نمیکند (با mtime فایل + شناسهٔ آیتم ردیابی میشود)؛ وقتی فایل پیشرفت تغییر کند، گامهای جدید خودکار ایمپورت میشوند. هدر `📥 واردشده: N گام از <files>` را نشان میدهد، یک کارت آمار گامهای ایمپورتشده را میشمارد و نمودار از جمع واردشده شروع میشود. غیرفعالسازی با `"auto_seed": false` در `config.json`.

## نتایج تأییدشده (نتیجه، نه فقط فعالیت)

شمارش فعالیت با **نتایج تأییدشده** تکمیل میشود — نتایج واقعی امتیاز جایزه و نشان ★ میگیرند:

| سیگنال | جایزه | فاز |
|---|---|---|
| `test result: ok. N passed` / تستها پاس شدند | +2 | testing |
| موفق `docker push` / `compose up` / `kubectl apply` / `helm install` | +2 | deploy |
| موفق `git commit` / `git push` / `gh pr` | +1 | delivery |
| پایان ساخت (`cargo build`، `make`، `compile`) | +1 | coding/delivery |
| `tracker_note` با نوع `success` | +1 | فاز فعال |

شمارش بهعنوان **⭐ گامهای تأییدشده** — کارت آمار، ستاره در گزارش فعالیت و پیشنهاد اختصاصی. یادداشت `success` نتیجهٔ تأییدشده را اعلام میکند؛ یادداشت `error` شکست را. اجراهای ناموفق (`test result: FAILED`، `denied`، `refused`، `forbidden`، `error`) هرگز جایزه نمیگیرند و بهعنوان خطا شمارش میشوند.

## گزارش هشدار (دیگر شکست خاموش نداریم)

هر چیزی که پلاگین از آن میگذرد، بهجای سکوت دیده میشود:

- `config.json` غیرقابلخواندن/نامعتبر → خط هشدار ⚠️ در داشبورد + `report.md`
- فایلهای پیشرفت با فرمت ناشناخته → «ورود داده رد شد» با شمارش ردشدهها
- گامهایی که فازشان با هیچ فاز پروژه همخوانی ندارد → «N گام رد شد — فاز همخوانی ندارد»

بهصورت خطوط کهربایی ⚠️ زیر هدر و در بخش **⚠️ اخطارها و موارد نادیدهشده** `report.md` (آخرین ۵، سقف ۲۰).

## امنیت داده و بیتحرکی

- **محافظت در برابر فایل خراب** — اگر `state.json` قابلخواندن نباشد، بیصدا ریست نمیشود: فایل به `state.json.corrupt-<timestamp>` تغییر نام مییابد (پشتیبان)، هشدار ثبت میشود و شمارش تمیز شروع میشود.
- **نقطههای عطف روی دادهٔ ایمپورتشده** — ایمپورت پیشرفت پروژهٔ موجود، نقاط عطف ۲۵/۵۰/۷۵/۱۰۰٪ را همانجا فعال میکند، حتی قبل از اولین فراخوانی ابزار.
- **تشخیص بیتحرکی** — اگر پروژه ۲+ ساعت غیرفعال باشد، داشبورد پیشنهاد ⏸️ نشان میدهد («پروژه از N ساعت پیش بدون فعالیت است») برای از سرگیری فاز فعال. `updated_at` حالا فعالیت واقعی را نشان میدهد (فراخوانی ابزار، یادداشت، پیام کاربر)، نه فلاشهای فایل.

## خلاصهٔ کارهای اخیر (پیامهای دستیار)

هر پاسخ دستیار ضبط میشود (چرخشی، ۲۰ تای جدید، هرکدام ۱۶۰ کاراکتر) و در بخش **📋 خلاصهٔ کارهای اخیر (دستیار)** داشبورد و `report.md` نمایش داده میشود — روایتی سریع از آنچه واقعاً انجام شد، کنار خوراک خام فعالیت ابزارها. بهعنوان کارت آمار اختصاصی هم شمارش میشود (💬 پیامهای دستیار).

## /tracker برای هر پروژهٔ ردیابیشده

`/tracker` (یا `/t`) حالا آرگومان میگیرد — **نام یا بخشی از مسیر** پروژه — و بهجای پروژهٔ فعلی، خلاصهٔ همان پروژه را نشان میدهد:

```
/tracker                    → پروژهٔ فعلی
/tracker proj-b             → پروژه‌ای که id/name/path آن با "proj-b" مطابقت دارد
/tracker my-other-project   → تطبیق جزئی با ثبت سراسری
```

ابزار داخلی جدید `tracker_open` پروژه را از ثبت سراسری (`~/.config/opencode/project-tracker/projects.json`) پیدا میکند و `report.html` آن را در مرورگر باز میکند — بدون حدسزدن مسیر. پروژههای ناشناخته فهرست پروژههای ردیابیشده را برمیگردانند تا انتخاب کنید.

## سفارشیسازی

برای تغییر نام/اهداف/رنگ فازها، `PHASE_DEFAULTS` را در `project-tracker.ts` ویرایش کنید.

## توسعه

```sh
# بررسی سینتکس
npx esbuild project-tracker.ts --bundle --platform=node --format=esm --external:@opencode-ai/plugin --outfile=/tmp/check.mjs
```

## مجوز

MIT