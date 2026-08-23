# opencode-macos-notify

Native macOS notifications for [opencode](https://opencode.ai) — generation finished, errors, and permission requests with Allow / Always Allow / Deny buttons.

## Install

Requires macOS 13+ and Xcode Command Line Tools (`xcode-select --install`).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-macos-notify"]
}
```

Restart opencode and allow notifications when macOS prompts.
