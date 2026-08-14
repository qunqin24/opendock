# Browser Smoke

MCP browser smoke testing plugin for [OpenCode](https://opencode.ai) — Playwright-based UI testing via browser automation. Jalankan smoke test terhadap web app langsung dari OpenCode dengan 24 tools.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18 |
| Python | >= 3.8 |
| OpenCode | terinstal |

## Quick Install

```bash
npx browser-smoke init
```

CLI akan interaktif nanya:

```
Pilih lokasi instalasi:
  [1] Global  — untuk semua project (~/.config/opencode)
  [2] Local   — hanya project ini (./opencode.json)
  [3] Cancel
Pilih [1/2/3]:
```

Proses:
1. Setup Python virtual environment
2. Install dependencies (`fastmcp`, `playwright`, `pixelmatch`, `Pillow`)
3. Install Chromium browser
4. Config `opencode.json` + skill file

Restart OpenCode setelah selesai.

### Opsi Init

| Command | Description |
|---------|-------------|
| `npx browser-smoke init` | Interaktif (tanya global/local) |
| `npx browser-smoke init --global` | Global, skip prompt |
| `npx browser-smoke init --local` | Local, skip prompt |
| `npx browser-smoke init --print` | Preview config tanpa install |

### Manual Config

Kalo `init` gak bisa dipake, tambahin manual ke `opencode.json`:

```json
{
  "mcp": {
    "browser-smoke": {
      "type": "local",
      "command": [".browser-smoke/.venv/bin/python3", "-m", "server"],
      "cwd": ".browser-smoke/mcp"
    }
  }
}
```

## Tools (24 MCP Tools)

### Navigasi & Page

| Tool | Description |
|------|-------------|
| `browser_open(url, headless?)` | Buka URL. Returns title + status code + screenshot |
| `browser_open_tab(url)` | Buka tab baru, fokus ke tab baru |
| `browser_get_tabs()` | List semua tab (title, URL, active status) |
| `browser_close()` | Tutup browser session |
| `browser_scroll(x?, y?)` | Scroll page (default: down 200px) |

### Interaksi DOM

| Tool | Description |
|------|-------------|
| `browser_extract_dom()` | List semua elemen interaktif (button, input, link) + CSS selector |
| `browser_click(selector)` | Klik element berdasarkan CSS selector |
| `browser_type(selector, text)` | Ketik teks ke input |
| `browser_type_guess(selector, input_type?)` | Auto-fill input (text/email/password/search/number) |

### Screenshot & Visual

| Tool | Description |
|------|-------------|
| `browser_screenshot()` | Screenshot halaman saat ini |
| `browser_screenshot_diff(name, threshold?)` | Screenshot + diff dengan baseline. Threshold default 0.01 (1%) |
| `browser_highlight(selector, color?, duration?)` | Highlight element dengan outline |

### JavaScript & Network

| Tool | Description |
|------|-------------|
| `browser_execute(js_code)` | Execute JavaScript di page context |
| `browser_inject_script(script, url_pattern?)` | Inject JS sebelum page load (mock API, polyfills) |
| `browser_network_capture(mode, patterns?)` | Intercept network requests (mode: start/stop/get) |
| `browser_block_resources(patterns)` | Block resources by glob pattern (*.jpg, *.png, analytics) |

### Console & Error

| Tool | Description |
|------|-------------|
| `browser_console()` | Ambil captured console logs |
| `browser_errors()` | Ambil captured JS runtime errors |

### Cookies & Storage

| Tool | Description |
|------|-------------|
| `browser_get_cookies()` | Get all cookies |
| `browser_set_cookie(name, value, domain?, path?)` | Set cookie |
| `browser_clear_cookies()` | Clear all cookies |
| `browser_storage(mode, storage?, key?, value?)` | localStorage/sessionStorage access (all/get/set/clear) |

### Report

| Tool | Description |
|------|-------------|
| `browser_report(results_json)` | Generate smoke test report markdown |

### Background

| Tool | Description |
|------|-------------|
| `browser_offscreen(action, url?, js?)` | Hidden page untuk background processing (open/exec/close) |

## Usage Guide

### Basic Smoke Test

1. Load skill `browser-smoke` di OpenCode
2. Test flow:

```
browser_open(url="http://localhost:5173")
browser_extract_dom()
browser_click(selector="button:has-text('Login')")
browser_type(selector="input[type='email']", text="test@test.com")
browser_type(selector="input[type='password']", text="Test1234!")
browser_click(selector="button:has-text('Submit')")
browser_screenshot()
browser_console()
browser_errors()
browser_report(results_json)
browser_close()
```

### Network Capture

```python
browser_network_capture(mode="start", patterns="*.api.*,*.json")
# lakukan interaksi...
browser_network_capture(mode="get")  # lihat request/response
browser_network_capture(mode="stop")
```

### Script Injection

```python
browser_inject_script(script="window.__TEST_MODE__=true")
browser_open(url="http://localhost:5173")
browser_execute(js_code="window.__TEST_MODE__")  # → true
```

### Visual Regression

```python
browser_open(url="http://localhost:5173")
browser_screenshot_diff(name="homepage")  # baseline (first run)
# setelah code change...
browser_screenshot_diff(name="homepage")  # diff with baseline
```

## Skill Integration

Setelah install, skill `browser-smoke` otomatis terdaftar. Di OpenCode:

```
skill browser-smoke
```

Skill ini menyediakan metodologi smoke testing lengkap dengan failure analysis loop.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `browser_screenshot_diff` gagal | Pastikan `mcp/tools/browser.py` punya akses ke artifacts directory |
| Chromium error | `playwright install chromium` lagi |
| Connection refused | Pastikan app target jalan (`npm run dev`, dll) |
| Python not found | `python3 --version`, kalo error install Python dulu |

## Development

```bash
git clone https://github.com/sukirman1901/browser-smoke.git
cd browser-smoke
npm link           # biar bisa npx browser-smoke dari lokal
```

## License

MIT
