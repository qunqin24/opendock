# opencode-usage-stats-tui

Token usage statistics for the [OpenCode](https://opencode.ai) terminal UI: requests, tokens and cost broken down by **model**, **session** and **day**.

OpenCode ships a `/stats` poster with an activity calendar, but it does not tell you *which* models and sessions consumed your tokens. This plugin adds the missing detail — and it reads the same data the OpenCode server already has, with no account, no password and no extra service.

```
 OpenCode Usage                                        10.11.2026 · 15:46–15:46

 ╭───────────╮ ╭─────────╮ ╭───────────╮ ╭───────────╮ ╭──────────╮ ╭─────────╮
 │ REQUESTS  │ │ TOKENS  │ │ INPUT     │ │ OUTPUT    │ │ CACHED   │ │ COST    │
 │ 1,218     │ │ 379.6M  │ │ 5.1M      │ │ 270.7K    │ │ 373.7M   │ │ $0.00   │
 │ запросов  │ │ всего   │ │ входящих  │ │ исходящих │ │ из кеша  │ │ оценка  │
 ╰───────────╯ ╰─────────╯ ╰───────────╯ ╰───────────╯ ╰──────────╯ ╰─────────╯

 MODEL                        REQ TOKENS  INPUT OUTPUT CACHED    COST
 ────────────────────────────────────────────────────────────────────────
 minimax-m3.1-flash-free      834 322.5M   2.5M 204.9K 319.2M   $0.00
 nemotron-3.5-super-vl-free   257  50.3M   2.2M  47.1K  48.0M   $0.00
 deepseek-v4.1-flash-free      54   3.0M  83.5K   7.4K   2.9M   $0.00
 longcat-2.5-free              56   3.7M  95.3K   9.7K   3.5M   $0.00
 iceman-free                   17 218.6K 134.9K   1.6K  81.0K   $0.00
 ────────────────────────────────────────────────────────────────────────
 TOTAL                      1,218 379.6M   5.1M 270.7K 373.7M   $0.00

 обновлено 9 сек   модели · 24 часа · r — обновить · v — вид · d — период · esc
```

## Features

| | |
|---|---|
| **Three views** | by model, by session, by day — one keypress apart |
| **Any period** | last 24 hours, 7 days, 30 days, or an arbitrary date range |
| **Full breakdown** | requests, tokens, input, output, cached and cost per row |
| **Sorted by relevance** | models are ordered by when they were last used |
| **Local only** | reads the OpenCode API of your own instance, nothing leaves the machine |
| **No dependencies** | the plugin is bundled by OpenCode itself at runtime |

## Install

The plugin has both a server part and a TUI part, so a single command sets everything up:

```sh
opencode plugin add opencode-usage-stats-tui
```

The command installs the package from npm and adds it to your global `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-usage-stats-tui"]
}
```

Prefer to configure it by hand? Add the same entry to `~/.config/opencode/opencode.json`; the TUI loads the plugin's TUI part from the list the server keeps.

If you would rather install the current state of the repository instead of a released version:

```sh
opencode plugin add github:Kaktus3158/opencode-usage-stats-tui
```

Restart OpenCode afterwards, then open the page:

```
/tokens
```

> The plugin UI is written in Russian, because that is the language of the
> author. Say the word and an English UI is a small change.

## Usage

Run `/tokens` in the prompt, or pick **Token usage (24h)** in the command palette (`ctrl+p`).

| Key | Action |
|---|---|
| `r` | refresh the numbers |
| `v` | switch the view: models → sessions → days |
| `d` | pick the period: 24 hours / 7 days / 30 days / your own dates |
| `esc` | back to the session you came from |

Choosing **your own dates** asks for a start and an end date. Both accept `ДД.ММ.ГГГГ`, `ДД.ММ`, `ГГГГ-ММ-ДД` and `ДД.ММ.ГГГГ ЧЧ:ММ`; the end day is included in full.

## How the numbers are obtained

Everything comes from the OpenCode API of the instance you are running:

- **Totals and per-model usage** — `GET /api/experimental/session/stats`, the same endpoint the built-in `/stats` poster uses.
- **Per-session and per-day usage** — the stats API has no such breakdown, so it is computed from the assistant messages of every session. Their `tokens` and `cost` sum up exactly to the stats API totals (verified against live data).
- **When a model was last used** — the stats API does not report it. It is derived from the `model-switched` messages in the session history: a switch at time *t* means the previous model was used until *t*, and the new one from *t* onwards.

No credentials are read, no URL is guessed and no database is opened: the plugin talks to the server through the client OpenCode hands it.

## Requirements

- OpenCode **2.2.0** or newer
- A terminal at least 60 columns wide

## Development

```sh
git clone https://github.com/Kaktus3158/opencode-usage-stats-tui
cd opencode-usage-stats-tui
npm install
npm run check          # typecheck + build
npm run install:local  # copy the sources into ~/.config/opencode/plugins/usage
```

`npm run compile` compiles `src/` into `dist/` with the very same Solid transform OpenCode applies to local plugins. That step is required: OpenCode does not run the Solid transform on files inside `node_modules`, so a published `.tsx` would lose its reactivity.

The build script is called `compile` rather than `build` on purpose. npm prepares a git dependency by running `npm install` inside the clone whenever the package has a `build`, `install`, `prepare` or `postinstall` script, and that preparation is what breaks OpenCode's git installs.

The built `dist/` is committed to the repository on purpose. OpenCode installs plugin packages with scripts disabled, so a `prepare` script would never run and the package would arrive without its build. After changing the sources, run `npm run compile` and commit the result; CI fails when the committed build drifts from the sources.

`standalone/` holds a small separate program that renders the same table in its own window. It is not part of the published package.

## Releases

```sh
npm publish --access public
```

npm reviews a new release before it goes public, so it can take a few minutes before the version shows up in the registry.

`.github/workflows/publish.yml` publishes from a GitHub release tag. It uses the `NPM_TOKEN` repository secret when one is set, and otherwise publishes through Trusted Publishing (OIDC), which needs no secret at all. One caveat: a token that bypasses two-factor authentication may not configure Trusted Publishing — npm rejects that — so switching to OIDC needs an account with a second factor enrolled.

## License

MIT
