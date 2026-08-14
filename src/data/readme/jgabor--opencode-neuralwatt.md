# opencode-neuralwatt

<p align="center">
  <a href="./screenshot.png" target="_blank">
    <picture>
      <img src="./screenshot.png" alt="Sidebar widget" width="100%" />
    </picture>
  </a>
</p>

An [OpenCode](https://opencode.ai/) TUI plugin that surfaces your [Neuralwatt](https://neuralwatt.com) account quota, usage, and burn rate directly inside the OpenCode terminal UI — as a sidebar widget and an on-demand `/nw` panel.

## Install

From the CLI:

```
opencode plugin @jgabor/opencode-neuralwatt --global
```

This installs the package and registers it in your global OpenCode TUI config (`~/.config/opencode/tui.json`).

Or, configure manually by editing `~/.config/opencode/tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@jgabor/opencode-neuralwatt"],
}
```

Project-scoped install (omits `--global`) writes to `<repo>/.opencode/tui.json` instead.

## Configure

Set your Neuralwatt API key in your environment:

```
export NEURALWATT_API_KEY="nw_..."
```

The plugin reads `NEURALWATT_API_KEY` at startup and refreshes quota every 15s.

## Usage

<a href="./screenshot-modal.png" target="_blank">
  <picture>
    <img src="./screenshot-modal.png" alt="Modal panel" width="25%" align="right" />
  </picture>
</a>

- **Sidebar widget** — always-visible credit/kWh/burn-rate summary with monthly efficiency metrics. Click it to open the detail panel.
- **`/nw`** (alias `/neuralwatt`) — opens the full quota panel (balance, burn rate, subscription, monthly usage, key allowance, efficiency, lifetime usage). Use `refresh` / `close` footer buttons.

## Update notifier

The plugin checks the npm registry on each startup and surfaces newer versions of itself inside the TUI — no third-party auto-update plugin required.

- **Sidebar widget** — an `⤓ Update: <version>` banner appears below the usage block when a newer version is published. Click to install.
- **Quota panel** — an `update <version>` button appears left of `refresh` in the modal footer. Click to install.
- On click, the plugin clears the stale npm cache slot, installs the new version via `api.plugins.install`, rewrites any pinned spec in your config to the new version (so the upgrade is an auditable diff), and toasts a **Restart OpenCode to apply** reminder.
- Local file-plugin installs (`file:` spec) skip update checks entirely.

No TTL — the check fires every restart, against the npm registry's `latest` dist-tag.

## Status fields shown

- Balance: remaining / used / total credits, accounting method (energy vs token), rate limit tier, overage cap with headroom bar
- Subscription: plan (with billing interval), status, period start/end, reset countdown, auto-renew, kWh used/remaining, overage
- Usage: current month and lifetime (cost, requests, tokens, energy)
- Burn rate: cost/day and estimated runway for both credits and kWh
- Efficiency: kWh per 1M tokens and cost per 1M tokens (current month and lifetime)
- Key allowance: limit, period, spent, remaining, blocked

## Alerts

The plugin toasts on quota state transitions — entering overage, exhausting credits, or an API key becoming blocked — so critical changes surface without watching the sidebar.

## How it works

The plugin is a TUI-only OpenCode plugin module, which is automatically loaded and executed with Bun. Quota data is fetched from `https://api.neuralwatt.com/v1/quota` with Bearer auth, retry/backoff, and 429 handling.

## Requirements

- OpenCode `^1.0.0`
- A Neuralwatt API key in `NEURALWATT_API_KEY`

---

**License:** [MIT](./LICENSE) · **Author:** [Jonathan Gabor](https://jgabor.se) · **Version:** 0.3.4
