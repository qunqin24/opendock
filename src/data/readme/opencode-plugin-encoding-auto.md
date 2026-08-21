# opencode-plugin-encoding-auto

[![npm version](https://img.shields.io/npm/v/opencode-plugin-encoding-auto.svg)](https://www.npmjs.com/package/opencode-plugin-encoding-auto)
[![npm downloads](https://img.shields.io/npm/dm/opencode-plugin-encoding-auto.svg)](https://www.npmjs.com/package/opencode-plugin-encoding-auto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenCode plugin that auto-detects file encoding (EUC-KR, CP949, Shift-JIS, GB2312, etc) and handles read/edit/write without garbled text on Windows.

## Problem

On Windows, when working with files saved in non-UTF-8 encodings (e.g. Korean EUC-KR, Japanese Shift-JIS, Chinese GB2312), opencode's built-in tools produce garbled text (mojibake) because they assume UTF-8.

## Solution

This plugin:

1. **Read** — Auto-detects file encoding using [chardet](https://github.com/runk/node-chardet), decodes with [iconv-lite](https://github.com/ashtuchka/iconv-lite), and outputs proper text to the console.
2. **Edit/Write** — Temporarily converts the file to UTF-8 so opencode's built-in edit/write tools run normally (including diff display), then converts back to the original encoding after the operation completes.
3. **Bash (PowerShell)** — Prepends `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` to PowerShell commands for proper console output.

## Installation

### Option 1: npm package (recommended)

```bash
npm install -g opencode-plugin-encoding-auto
```

Then add to your `opencode.json`:

```json
{
  "plugin": ["opencode-plugin-encoding-auto"]
}
```

### Option 2: Local file

Download `src/index.ts` and place it in your opencode plugins directory (e.g. `~/.config/opencode/plugins/encoding-auto.ts`), then add to your `opencode.json`:

```json
{
  "plugin": ["./plugins/encoding-auto.ts"]
}
```

### Option 3: GitHub Packages

```json
{
  "plugin": ["@vexakuro67/opencode-plugin-encoding-auto"]
}
```

Configure your `.npmrc`:
```
@vexakuro67:registry=https://npm.pkg.github.com
```

> **Note**: Make sure `chardet` and `iconv-lite` are installed in your opencode config directory (`~/.config/opencode/`):
> ```bash
> cd ~/.config/opencode && npm install chardet iconv-lite
> ```

## Dependencies

- [chardet](https://www.npmjs.com/package/chardet) — character encoding detection
- [iconv-lite](https://www.npmjs.com/package/iconv-lite) — encoding/decoding

## How It Works

```
tool.execute.before (edit/write):
  file.enc  →  detect encoding  →  convert to UTF-8 temp
                                         ↓
                              built-in edit/write runs (diff shown)
                                         ↓
tool.execute.after (edit/write):
  file.utf8  →  read UTF-8  →  convert back to original encoding  →  save
```

```
tool.execute.after (read):
  file.enc  →  detect encoding  →  decode  →  output to console
```

## Supported Encodings

Any encoding supported by `iconv-lite`, including:
- EUC-KR / CP949 (Korean)
- Shift-JIS / CP932 (Japanese)
- GB2312 / GBK (Chinese)
- ISO-8859-1 / Windows-1252 (Western)
- And many more

## Compatibility

- **OS**: Windows (PowerShell)
- **Shell**: `pwsh` or `powershell`
- **opencode**: v1.18+

## License

MIT
