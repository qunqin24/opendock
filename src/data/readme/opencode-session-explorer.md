# opencode-session-explorer

[English](README.md) | [简体中文](README.zh-CN.md)

Browse, search, export and report on your OpenCode session history — through a local web UI and three agent tools.

Read-only by design: `opencode.db` is only ever opened in read-only mode. Search runs on a separate sidecar index, so your session data is never rewritten.

![Session transcript](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/transcript.png)

*Transcript view: oldest-first reading, reasoning and tool calls expanded, per-day timeline in the header.*

![Full-text search](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/search.png)

*Full-text search across messages, reasoning and tool output, with jump-to-hit.*

![Session info](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/session-info.png)

*Session info: cost, token breakdown, composition and the session's todo list.*

![overview](https://img.shields.io/badge/opencode-plugin-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Why

OpenCode keeps every session on disk, but once you have hundreds of them there is no practical way to:

- find the session where you solved that one problem three weeks ago (including tool output and reasoning, not just titles);
- see what you actually asked, without scrolling past thousands of assistant replies;
- hand your manager a summary of what you worked on this week;
- export a conversation for a bug report, a wiki page, or an audit trail.

This plugin adds that layer.

## Features

**Session list** — filter by title, directory or session ID; date range; newest/oldest; main sessions only; per-directory counts.

**Transcript** — starts from the newest message and pages backwards as you scroll; a per-day timeline jumps to any date; *Questions only* hides assistant replies; reasoning and tool calls stay collapsed until you open them; in-page highlight with next/previous.

**Session info** — message and part counts, cost (including child sessions), model/agent/OpenCode version, token breakdown (input, output, reasoning, cache read/write), per-day volume, child sessions spawned by subagents, and the session's last todo list.

**Full-text search** — messages, reasoning, tool output and attachment names. Click a hit to jump straight to that exact point in the conversation, with the message flashed and highlighted.

**Stats** — sessions, messages, tokens and cost grouped by day, working directory or model, over any date range.

**Export** — Markdown, plain text, JSON, or a **work report** that keeps only the prompts *you* sent, grouped by day as `date: … / task N: …`, with auto-continue prompts and duplicates filtered out. Handy for weekly reports.

**Agent tools**

| Tool | What it does |
| --- | --- |
| `session_search` | Full-text search across history, returns sessions, timestamps and snippets |
| `session_report` | Generates the work report for a date range and saves it as Markdown |
| `session_explorer` | Opens the web UI, optionally at a specific session and timestamp |

## Requirements

- **OpenCode** 1.18.29+ or 2.x (the entry uses the V2 `{ id, setup }` definition shape, which also loads as a V1 object entrypoint).
- **Python 3.9+** with SQLite 3.34+ (for FTS5 `trigram`). No third-party Python packages — standard library only.
- **Node 18.17+** (only to run the plugin wrapper and the optional CLI; OpenCode's own runtime works too).
- Works on Windows, macOS and Linux. On Windows `pythonw` is preferred so no console window appears.

Python is a real dependency, and it is the one thing that makes installation harder than a pure-JS plugin. It exists because the indexer needs SQLite FTS5 with `trigram` tokenisation for CJK search, which Python's standard library exposes directly.

## Install

```sh
opencode plugin add opencode-session-explorer
```

Or add it to `opencode.json(c)` manually:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-explorer"]
}
```

With options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-session-explorer",
      "options": { "lang": "zh", "port": 8717 }
    }
  ]
}
```

Then restart OpenCode or reload the plugin. Ask the agent to open the explorer, or run the CLI directly:

```sh
npx opencode-session-explorer
```

It prints the URL and opens your browser. Close the tab when you are done — the server keeps running in the background until you reboot or kill the process.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `lang` | system locale | `"en"` or `"zh"`. Controls tool output, exported reports and the initial UI language |
| `port` | `8717` | HTTP port. It only ever listens on loopback |
| `host` | `127.0.0.1` | Bind address |
| `home` | see below | Data directory for the index, reports and `config.json` |
| `token` | from `config.json` | Access token; see [Security](#security) |
| `python` | auto-detect | Python interpreter (`python3`, `python`, `py -3`) |
| `open` | `true` | Open the browser when `session_explorer` runs |

Environment equivalents: `SESSION_EXPLORER_LANG`, `SESSION_EXPLORER_PORT`, `SESSION_EXPLORER_HOST`, `SESSION_EXPLORER_HOME`, `SESSION_EXPLORER_URL`, `SESSION_EXPLORER_PYTHON`, `OPENCODE_DATA_DIR`, `XDG_DATA_HOME`.

## Where things live

| Item | Location |
| --- | --- |
| Sidecar index | `<home>/index/session-index.db` (safe to delete; it rebuilds itself) |
| Work reports | `<home>/reports/` |
| Access token | `<home>/config.json` |
| OpenCode's database (read-only) | `~/.local/share/opencode/opencode.db` |

`<home>` defaults to `~/.local/share/opencode-session-explorer` (or `$XDG_DATA_HOME/opencode-session-explorer`). If a legacy install exists at `~/.config/opencode/session-explorer`, that directory is reused automatically so existing indexes and tokens keep working.

## Internationalisation

Two dictionaries, `src/i18n/en.json` and `src/i18n/zh.json`, are the single source of truth for every user-visible string: the web UI, the agent tool descriptions and results, and the server-rendered report headings.

- The server picks a language from the `lang` option, then `SESSION_EXPLORER_LANG`, then the system locale.
- The UI injects both dictionaries and can switch instantly: the `中文` / `EN` button preserves your current session and reloads with `?lang=`.
- Adding a language means adding one JSON file and listing it in `SUPPORTED_LANGS` (Python) and `SUPPORTED_LANGS` (runtime). The check script fails if the dictionaries drift apart.

Tool descriptions are intentionally kept in the model's input language: they are tokenised by the agent, and mixing languages in one prompt costs tokens and degrades tool selection. The report and UI text are fully localised.

Note that work reports are grouped by calendar day in the machine's local timezone. Week boundaries are not applied — if your team's week starts on Sunday rather than Monday, that is a configuration item we have not added yet.

## Security

- Listens on `127.0.0.1` only.
- Requests carrying an `Origin` header must be same-origin, so another website cannot read your sessions even if it guesses the port.
- `opencode.db` is opened with `?mode=ro`.

Access tokens are optional and off by default. To enable one:

```sh
python src/py/server.py --token          # generate and enable
python src/py/server.py --show-token     # print the current token
python src/py/server.py --set-token XXX  # set a specific token
python src/py/server.py --no-token       # disable
```

Restart the server afterwards. The plugin reads the token from `config.json` automatically. Failed logins lock the source IP for 10–300 seconds.

## HTTP API

Everything the UI does is a plain GET, useful for scripting:

| Path | Purpose |
| --- | --- |
| `/api/health` | Version, counts, index state, language, data directory |
| `/api/sessions` | Session list: `q` `dir` `from` `to` `sort` `main` `limit` `offset` |
| `/api/session?id=` | Metadata, counts, per-day volume, todos, child sessions |
| `/api/parts?session_id=` | Paged messages and parts: `limit` `before_time` `before_id` `around_time` `roles` `kinds` |
| `/api/search?q=` | Full-text search: `session_id` `dir` `from` `to` `roles` `kinds` `limit` `offset` |
| `/api/stats` | Aggregates: `from` `to` |
| `/api/export` | `format=md\|txt\|json\|report`, `session_id` `from` `to` `include` `roles` `save` |
| `/api/tool-output?part_id=` | Full tool output from the `tool-output` directory |
| `/api/file?part_id=` | Inline attachment bytes |
| `/api/index?rebuild=1` | Rebuild the search index |

## Development

```sh
node scripts/check.mjs          # package, i18n, plugin contract, HTTP smoke test
node scripts/check.mjs --deep   # also opens a session (needs an existing index)
npm pack --dry-run              # inspect the published tarball
```

There is no build step: the plugin entry is `src/index.ts` (type annotations only, executed directly by OpenCode's runtime) and the shared runtime is plain ESM in `src/runtime.js`.

## Known limitations

- One index per data directory; there is no multi-machine sync.
- The sidecar index stores extracted text, so it can grow large (roughly 100–200 MB for a few thousand sessions). It is rebuildable at any time.
- Reports are heuristic: they strip auto-continue prompts, duplicates, URLs and HTML tags, but you should still read them before sending.
- Only OpenCode's own database is read. Other agents' session stores are out of scope for now.

## License

MIT

Screenshots are generated from a synthetic database (`scripts/demo-data.py`), so no real session data ends up in the repository:

```
python scripts/demo-data.py ./demo-env
OPENCODE_DATA_DIR=./demo-env python src/py/server.py
```
