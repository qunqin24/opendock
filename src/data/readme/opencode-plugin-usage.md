# opencode-plugin-usage

An OpenCode **TUI plugin** that shows your active provider's usage limits and
remaining credit directly in the sidebar.

Follows whichever provider the current session is using, so the numbers you see
are the ones that matter right now — refreshed before you start a query.

- **opencode-go** — rolling 5h / weekly / monthly usage limits as thin colored bars
- **github-copilot** — monthly premium requests / chat / completions quota from `api.github.com`
- **deepseek** — remaining API credit
- **openrouter** — remaining credit balance
- **openai** — remaining API credit balance

```
Usage limits
OpenCode Go                     updated just now
5h    ━━━━━━━━━ 78%             · resets 55m
Week  ━━━━ 37%                  · resets 2d 2h
Month ━━ 18%                    · resets 27d 15h
```

Limit bars are colored by severity: green `<50%`, amber `50–74%`, orange `75–99%`,
red `100%`. Credit balances show in green while the account is usable, red when not.

## Requirements

- OpenCode `>= 2.0.0` (V2 plugin API)

## Install

```sh
opencode plugin add opencode-plugin-usage
```

That installs the TUI plugin and registers it in `~/.config/opencode/cli.json`.
Keys are picked up automatically (see [API keys](#api-keys)).

Any options go in the `cli.json` entry:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugin-usage",
      "options": { "providers": { "opencode-go": { "enabled": true } } }
    }
  ]
}
```

### Local development

```sh
git clone https://github.com/lhw/opencode-plugin-usage
cd opencode-plugin-usage
npm install
npm run typecheck    # tsc --noEmit
npm test             # parser self-checks (node, no deps)
npm run build        # esbuild → dist/tui.js
```

OpenCode loads CLI plugins as packages from `cli.json`, so to try a local build
publish a prerelease (or serve `npm pack` output from a local registry) and run
`opencode plugin add opencode-plugin-usage`.

> The plugin must NOT live in `~/.config/opencode/plugins/` — that directory is
> scanned for **server** plugins, and opencode rejects this TUI-only module
> there. TUI plugins are loaded from `cli.json`.

## Configuration

All options are optional. They go in the `options` object of the plugin's
`cli.json` entry:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugin-usage",
      "options": {
        "refreshMs": 300000,       // how often to re-fetch usage (ms)
        "minRefreshMs": 30000,     // minimum interval between extra refreshes (ms)
        "timeoutMs": 10000,        // per-request timeout (ms)
        "default": "opencode-go",  // provider shown when the active provider has no usage source
        "providers": {
          "opencode-go": { "enabled": true },              // apiKey is optional, see below
          "deepseek": { "enabled": true, "apiKey": "sk-…" }
        }
      }
    }
  ]
}
```

| Option    | Default                      | Description                  |
| --------- | ---------------------------- | ---------------------------- |
| `enabled` | `true`                       | show/hide this provider      |
| `apiKey`  | resolved automatically       | explicit key override        |

## API keys

Keys resolve automatically from what opencode itself uses, in order:

1. `providers.<id>.apiKey` in the plugin options
2. `OPENCODE_AUTH_CONTENT` (opencode's injectable auth file)
3. opencode's auth store — `auth.json` in the opencode data directory
   (`~/.local/share/opencode/` on Linux, `~/Library/Application Support/opencode/`
   on macOS, `%APPDATA%\opencode\` on Windows), under the provider id
4. the provider's env var (see table below)

So if you've already connected a provider in opencode (`opencode auth login` or
`/connect`), no extra configuration is needed.

| Provider       | env var                  |
| -------------- | ------------------------ |
| opencode-go    | `OPENCODE_API_KEY`       |
| github-copilot | `GITHUB_TOKEN` (`GH_TOKEN` also) |
| deepseek       | `DEEPSEEK_API_KEY`       |
| openrouter     | `OPENROUTER_API_KEY`     |
| openai         | `OPENAI_API_KEY`         |

## Providers

| Provider       | Source                                                         | Display                          |
| -------------- | -------------------------------------------------------------- | -------------------------------- |
| opencode-go    | `https://opencode.ai/zen/go/v1/usage`                          | 5h/week/month windows + bars     |
| github-copilot | `https://api.github.com/copilot_internal/user`                 | premium/chat/completions + bars  |
| deepseek       | `https://api.deepseek.com/user/balance`                        | remaining credit                 |
| openrouter     | `https://openrouter.ai/api/v1/credits`                         | remaining credit (credits − usage) |
| openai         | `https://api.openai.com/v1/dashboard/billing/credit_grants`    | remaining credit (org admin key) |

Adding a provider is one new file in `src/providers/` implementing the `Provider`
interface (key resolution + a `fetchUsage`) and adding it to the `providers` array
in `src/tui.ts`.

## How it works

- A `Plugin.define` TUI plugin (`@opencode/plugin/tui`) that renders into the
  `sidebar.content` slot via `@opentui/solid`.
- Detects the active provider from the last assistant message's
  `model.providerID`, falling back to opencode's configured default model.
- Refreshes before you query: on startup, on new session, when a session goes
  `busy`, on `session.idle`, and every `refreshMs`. Extra triggers are throttled
  to at most one fetch per `minRefreshMs`, so balance/usage stays fresh without
  hammering the APIs.
- Self-heals if data is missing (e.g. after loading an existing session): a
  signal-driven repaint + a 5-second check re-fetch until data is shown.

## Development

```sh
npm run typecheck    # tsc --noEmit
npm test             # parser self-checks (node, no deps)
npm run build        # esbuild → dist/tui.js
npm publish          # runs typecheck + build + test first
```

## License

MIT
