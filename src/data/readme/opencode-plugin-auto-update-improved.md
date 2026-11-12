# Opencode Plugin Auto-Update

[![npm version](https://img.shields.io/npm/v/opencode-plugin-auto-update-improved.svg)](https://www.npmjs.com/package/opencode-plugin-auto-update-improved)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-Fast-black?logo=bun)](https://bun.sh)

**Keep your OpenCode environment fresh without lifting a finger.**

`opencode-plugin-auto-update-improved` is a lightweight, background-running plugin that
ensures your OpenCode plugins are always up-to-date. Zero-latency background
updates for your OpenCode plugins. Includes 24h throttling and concurrency
locking. It handles the heavy lifting of dependency management in the
background, so you can focus on building.

## 🚀 Why use this?

- **Set and Forget**: Once installed, your plugins stay updated automatically.
- **Zero Latency**: Updates run in a detached background process—no startup
  delay for your OpenCode session.
- **Smart Throttling**: Only checks for updates once every 24 hours
  (configurable) to save bandwidth and resources.
- **Safe & Reliable**: Uses lock files to prevent concurrent update runs and
  handles config migrations automatically.

## ✨ Key Features

- **Background Execution**: Updates are detached from the main process. No
  prompts, no blocking IO, and minimal noise.
- **Bun-First Performance**: Automatically detects and uses `bun` for
  lightning-fast installs, with a reliable `npm` fallback.
- **Intelligent Filtering**: Automatically skips local paths, git repositories,
  and workspace plugins to avoid breaking development setups.
- **Update History**: Maintains a circular history of the last 5 updates,
  including metadata and timestamps.
- **Config Migration**: Seamlessly handles transitions between `plugin` and
  `plugins` keys in your `opencode.json`.
- **Toast Notifications**: Provides a brief, non-intrusive summary after a
  successful update pass.

## 📦 Installation

### 🤖 For LLM Agents (Recommended)

If you are using an AI agent (OpenCode, Claude Code, Cursor, etc.), simply paste
this:

```text
Install the opencode-plugin-auto-update-improved plugin by following: https://raw.githubusercontent.com/amit-batra/opencode-plugin-auto-update-improved/main/README.md
```

<details>
<summary><b>Detailed Agent Instructions</b></summary>

1. **Install the NPM package globally:**

   ```bash
   bun add -g opencode-plugin-auto-update-improved || npm install -g opencode-plugin-auto-update-improved
   ```

2. **Enable in OpenCode Config:**
   Add `"opencode-plugin-auto-update-improved"` to the `plugin` array in
   `~/.config/opencode/opencode.json`.

   ```json
    {
      "plugin": [
        "opencode-plugin-auto-update-improved"
      ]
    }
   ```

3. **Verify:**
   Inform the user: **"Installation complete! Your OpenCode plugins will now
   update automatically in the background."**

</details>

### 👤 Manual Installation

1. **Install the package:**

   ```bash
   bun add -g opencode-plugin-auto-update-improved
   # or
   npm install -g opencode-plugin-auto-update-improved
   ```

2. **Enable the plugin:**
   Add `"opencode-plugin-auto-update-improved"` to your
   `~/.config/opencode/opencode.json`:

   ```json
    {
      "plugin": [
        "opencode-plugin-auto-update-improved"
      ]
    }
   ```

3. **Restart OpenCode:**
   The plugin will trigger its first check on the next startup.

## ⚙️ Configuration

You can fine-tune the behavior using environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OPENCODE_AUTO_UPDATE_DISABLED` | `false` | Set to `true` to completely disable background updates. |
| `OPENCODE_AUTO_UPDATE_INTERVAL_HOURS` | `24` | How often to check for updates (in hours). |
| `OPENCODE_AUTO_UPDATE_PINNED` | `false` | If `true`, preserves pinned versions in your config. |
| `OPENCODE_AUTO_UPDATE_BYPASS_THROTTLE` | `false` | Force an update check on every startup (useful for debugging). |

### Local Override

For persistent overrides without environment variables, create:
`~/.config/opencode/opencode-plugin-auto-update.json`

```json
{
  "ignoreThrottle": true
}
```

## 🛠️ How It Works

1. **Trigger**: On OpenCode startup, the plugin schedules a background task.
2. **Lock & Throttle**: It checks if an update is already running or if the 24h
   interval has passed.
3. **Fetch**: It identifies registry-based plugins and fetches their latest
   versions.
4. **Install**: Updates are installed into `~/.config/opencode/node_modules`.
5. **Sync**: Updates `opencode.json` with the new versions (unless pinning is
   enabled).

### State Files

The plugin stores its state alongside the rest of your OpenCode configuration in
`~/.config/opencode/`:

| File | Purpose |
| :--- | :--- |
| `.auto-update.lock` | Lock file preventing concurrent update runs. |
| `.auto-update.json` | Throttle state (last run timestamp). |
| `.auto-update-history.json` | Circular history of the last 5 updates, including metadata and timestamps. |

## ❓ Troubleshooting

- **Updates not running?** Check if `OPENCODE_AUTO_UPDATE_DISABLED` is set.
- **No logs?** The plugin is designed to be quiet. Check the "Auto-update logs"
  output in your agent's console for details.
- **Testing?** Use `OPENCODE_AUTO_UPDATE_BYPASS_THROTTLE=true` to force a run.

## 🌱 Fork & Changes

This project is a fork of
[AnganSamadder/opencode-plugin-auto-update](https://github.com/AnganSamadder/opencode-plugin-auto-update),
maintained by [Amit Batra](https://github.com/amit-batra). During a code review
of the upstream implementation, several bugs and rough edges were identified and
fixed.

### Bugs found in the upstream implementation

1. **Throttle default of 0 hours.** The update interval default was `0`, meaning
   every startup would attempt an update (no throttling at all).
2. **Stale lock recovery.** A lock left behind by a crashed run could block all
   future updates; there was no path to recover from a stale lock.
3. **Throttle state written before work completed.** `lastRun` was recorded even
   when the update itself failed, causing failed runs to count toward the
   throttle window.
4. **Dead data.** `ThrottleState.lastSuccess` and `LockData.hostname` were
   written to disk but never read or used in any decision.
5. **Stale-lock recovery gap (related to #2).** The recovery path did not force
   acquiring the lock when a stale lock was detected.
6. **Surprising history-log location.** The circular update-history file was
   written to the parent of the current project directory, which is
   undocumented, inconsistent with the other state files, and potentially
   unwritable.
7. **Robustness / minor issues.** A redundant double-read of the lock file
   (a TOCTOU window) in `acquireLock`, and an unverified assumption about the
   installed-package layout used to read versions.
8. **Corrupt lock wedge.** A 0-byte or unparseable lock file (left by a crash
   between creating and writing the lock) was never reclaimed, so every
   subsequent run exhausted its retries and skipped updates permanently.
9. **Non-atomic state writes.** The throttle and config files were written in
   place, so a concurrent reader could observe a truncated or half-written
   file.
10. **Unsynchronized history appends.** The circular history log was written
    outside the lock, so concurrent runs could interleave read-modify-write and
    drop or tear entries.
11. **No-plugins path not throttled.** A config with no plugins returned without
    recording `lastRun`, so the full scan re-ran on every startup.
12. **Crashed-lock wedge by age.** A crashed run could leave a fresh-timestamp
    lock that the 2h time-based staleness check never sees, wedging updates for
    hours. The lock's pid was stored but never used for liveness.

### Fixes made in this repo

| # | Fix |
| :--- | :--- |
| 1 | Throttle default changed to `24` hours. |
| 2 + 5 | `acquireLock` now recovers from stale locks (passes `force: true` when a stale lock is detected). |
| 3 | `lastRun` is only written after a successful update; failed runs no longer count toward the throttle window. |
| 4 | Removed the unused `lastSuccess` and `hostname` fields and their writers. |
| 6 | The update-history file now lives in `~/.config/opencode/.auto-update-history.json`, consistent with the lock and throttle files. |
| 7 | Eliminated the redundant lock re-read (staleness is computed from the already-read data), and added tests locking in the version-lookup layout. |
| 8 | `acquireLock` now reclaims a corrupt or 0-byte lock on its final retry, so a crashed writer can no longer wedge auto-updates permanently. |
| 9 | `writeThrottleState` and `writeConfig` write via a shared `writeAtomic` helper (temp file + rename), so concurrent readers never observe a truncated file. |
| 10 | `runAutoUpdate` exposes an `onSettled` hook run before the lock is released, and the history log is written from it, serializing all appends behind the lock. |
| 11 | A config with no plugins now records `lastRun`, so the next run within the interval is throttled like the no-config path. |
| 12 | `acquireLock` now also reclaims a lock whose pid is no longer alive (`process.kill(pid, 0)`), so a crashed run with a fresh timestamp no longer wedges updates; a recycled live pid is still respected. |

All changes are covered by the hermetic test suite (`bun test`, 45 tests).

## 📄 License

MIT © [Angan Samadder](https://github.com/AnganSamadder) · Forked and maintained by [Amit Batra](https://github.com/amit-batra)

---

*Inspired by the OpenCode plugin ecosystem.*
