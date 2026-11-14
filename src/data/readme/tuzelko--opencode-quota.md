<div align="center">

# 📊 opencode-quota

**Spend windows of the connected providers — a ring in the session header and a panel tab.**

[![npm](https://img.shields.io/npm/v/@tuzelko/opencode-quota?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@tuzelko/opencode-quota)
[![downloads](https://img.shields.io/npm/dm/@tuzelko/opencode-quota?style=flat-square)](https://www.npmjs.com/package/@tuzelko/opencode-quota)
[![license](https://img.shields.io/github/license/TuzelKO/opencode-quota?style=flat-square)](./LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-5B8DEF?style=flat-square)](https://opencode.ai)
[![desktop UI](https://img.shields.io/badge/UI-desktop-8B5CF6?style=flat-square)](https://opencode.ai)

</div>

---

Every coding plan meters something: a 5-hour window, a week, a month. OpenCode shows the
context ring, but not how much of the plan you already burned. **Quota** puts that next to
the context indicator and opens the full picture in a side tab.

## ✨ Features

- 💍 **Ring in the session header** — the used share of the smallest window of the current
  model's provider. Click it to open the panel.
- 📱 **Narrow screens** — the same panel opens from the mobile view switcher under
  **More**, with the desktop layout and no separate UI.
- 🗂️ **Panel tab, not a dialog** — every connected provider collapses into an accordion,
  with the current provider expanded; opening another closes the previous one.
- 📈 **Every window, not just one** — percent, absolute usage and the reset countdown for
  5 hours, week and month, whatever the provider reports.
- 🟠 **Threshold colors** — orange at 70%, red at 90%, on the ring, the bars, the numbers
  and the composer pill.
- ⏳ **Per-provider progress** — each provider's ring spins while its own request is in
  flight, so a slow provider is visible without blocking the others.
- 💻 **Terminal UI** — a footer badge next to the context meter, a `/quota` panel with the
  same windows (run `/quota` again to close it), and a toast when a window crosses 70% or
  90%.
- 🌍 **Localized** — English, Russian, German, French, Chinese (the desktop UI; the
  terminal UI has no locale API and stays in English).
- 🧹 **Only what you connected** — a provider without a connection never appears; one that
  is connected but silent keeps its last numbers and shows the reason.

## 🧩 Providers

| Provider | Windows |
| --- | --- |
| OpenCode Go | shared 5-hour, weekly and monthly allowance |
| Z.AI Coding Plan | 5-hour and weekly credits |
| Zhipu AI Coding Plan (CN) | the same payload on the China platform |
| Kimi For Coding (global) | 5-hour and monthly pools |
| Kimi For Coding (CN) | the same on the China host |

The ring follows the model you run; the panel lists every connected provider.

## 📦 Install

```sh
opencode plugin add @tuzelko/opencode-quota
```

Or straight from Git:

```sh
opencode plugin add github:TuzelKO/opencode-quota
```

Requires OpenCode V2. The desktop app gets the ring and the side panel; the terminal UI
gets the footer badge and `/quota` from the same plugin entry — the TUI loads the `./tui`
part of the plugins its server already loads.

## 💻 Terminal UI

The footer badge sits next to the context meter and follows the model you run:

```text
Z.AI 43%   12.6K (1%)   ctrl+p commands
```

| Action | How |
| --- | --- |
| Open the panel | `/quota` |
| Close it | `/quota` again, or `/quota close` |
| Force a refresh | `/quota refresh` |
| Refresh or close from the palette | `ctrl+p` → "Refresh quota" / "Close quota" |

The panel lists every connected provider, the current one first, with a bar per window,
the absolute usage and the reset countdown. The header shows when the providers last
answered and the `/quota close` hint. A window crossing 70% or 90% raises a toast.

The terminal UI has no locale API, so its strings stay in English; the desktop UI is
localized.

## ⚙️ How it works

- **OpenCode Go** comes from the app's own usage store — the numbers behind the Console,
  one shared allowance across models.
- **Z.AI and Kimi** are queried by the server part with the key OpenCode already stores in
  the integration. Answers are cached for a minute.
- A provider with no connection is skipped entirely. A connected provider that fails keeps
  its last numbers and shows the error instead of disappearing.
- The desktop GUI plugin API is experimental; the plugin uses only documented surfaces.

## 📝 Notes

- Quota windows are a subscription metric. Pay-as-you-go providers report a balance
  instead, and are not shown.
- The panel does not switch models; the model picker still does that.
- The header pill is also available in a subagent session, where it reads the model from
  the session itself.

## 📄 License

MIT © Eugene Frost
