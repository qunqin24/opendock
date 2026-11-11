# opencode-gwdg-quota

Shows your remaining [GWDG SAIA](https://docs.hpc.gwdg.de/services/ai-services/saia/index.html) (Academic Cloud Chat AI) request quota inside [OpenCode](https://opencode.ai) — in the terminal TUI status bar and as a pill in OpenCode Desktop.

GWDG SAIA charges per request (10 per 10s, 400 per hour, 800 per day by default). This plugin reads the `x-ratelimit-*` headers that GWDG sends on **every** response, so tracking your remaining quota costs **zero extra requests**. The numbers update automatically after each API call.

![status bar](https://img.shields.io/badge/surface-TUI%20%26%20Desktop-blue)

## Features

- **Auto-tracked quota** — every model response updates the 10s / hour / day windows; no polling of the API.
- **TUI status bar** — `⚡ 327/400h 599/800d` in the home and prompt footers.
- **Desktop pill** — a pill above the composer in OpenCode Desktop with color-coded levels (green / yellow under 50% / red under 25%); click it for details and reset times.
- **`/quota` command** — refresh on demand with one minimal probe request (`max_tokens=1`, uses 1 of your requests).
- **Cross-project** — state is shared across all project directories, persisted across restarts.
- **Localized** — English and Chinese UI, following your app language.

## Requirements

An OpenCode provider configured for GWDG SAIA:

```jsonc
{
  "providers": {
    "gwdg": {
      "name": "GWDG SAIA",
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "https://chat-ai.academiccloud.de/v1",
        "apiKey": "<your SAIA API key>"
      }
    }
  }
}
```

The plugin reads `baseURL` and `apiKey` from that provider at runtime; nothing is stored inside the plugin.

## Install

Add it to your global OpenCode config (`~/.config/opencode/opencode.json`):

```jsonc
{
  "plugins": ["opencode-gwdg-quota"]
}
```

If your provider is registered under a different ID than `gwdg`, set it via options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-gwdg-quota",
      "options": {
        "providerID": "my-gwdg",
        "probeModel": "meta-llama-3.1-8b-instruct"
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `providerID` | `"gwdg"` | The OpenCode provider ID of your GWDG SAIA config |
| `probeModel` | `"meta-llama-3.1-8b-instruct"` | Model used for the manual refresh probe |

Restart OpenCode (or the Desktop app) once after adding it. The status bar fills in after your first API call, or run `/quota` to probe once immediately.

## How it works

1. A server-side `http.response` hook inspects every response from the GWDG provider and parses the Kong rate-limit headers (`x-ratelimit-remaining-requests-hour`, `-day`, etc.).
2. The parsed state is persisted (plugin storage + a shared file at `~/.local/share/opencode/gwdg-quota.json`) and broadcast to the TUI and Desktop UI via an RPC event.
3. `/quota` sends one `max_tokens: 1` request to read fresh headers — that is the only time the plugin itself consumes a request.

## Build from source

The Desktop (GUI) part ships prebuilt. To rebuild it after changes:

```sh
npm install
npm run build   # vite build -> dist/gui-experimental.cjs
```

## License

MIT
