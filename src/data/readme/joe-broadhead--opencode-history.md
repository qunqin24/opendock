# History for OpenCode

Lets OpenCode agents search, read and recall your own past OpenCode sessions, in this project or any other, through a local full-text index.

Unofficial; not affiliated with OpenCode.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3 and 2.2.4. On any other version the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- Nothing else: no native programs, downloads or accounts. The index is SQLite with full-text search, through the `node:sqlite` module of OpenCode's runtime.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-history
```

Restart OpenCode. On first start the plugin indexes every session in OpenCode's database in the background, newest first. The tools work while it runs, over the sessions indexed so far. `/history-status`, or `/history` in the terminal UI, shows the progress.

## Sign in

No sign-in or account. The plugin reads the OpenCode history on the machine it runs on.

## Use

In Code Mode the tools are `tools.history.<name>`. The tool name and the permission action are `history_<name>`.

```js
await tools.history.search({ query: ["login redirect loop", "OAuth callback redirects forever", "state mismatch"] })
await tools.history.brief({ sessionID: "ses_..." })
await tools.history.read({ sessionID: "ses_...", at: 42 })
await tools.history.sessions({ since: "7d", sort: "cost" })
await tools.history.files({ path: "src/auth/login.ts" })
await tools.history.recall({ question: "How did we fix the flaky upload test?", queries: ["flaky upload test", "upload test timeout"] })
await tools.history.sql({ sql: "select date(created) as day, round(sum(cost), 2) as cost from v_sessions group by day order by day desc", limit: 14 })
await tools.history.status({})
```

- **Search, brief, read.** The usual lookup. `history_search` ranks sessions for two to four phrasings of one topic and returns excerpts, each with a `seq`. `history_brief` summarises one session: first prompt, compaction summaries, last reply, outcome, files edited, commands, subagents and todos. `history_read` reads the messages around a `seq`, with paging; with `kinds`, a window with none of those kinds widens to the nearest messages that have them. These three tools are pinned.
- **Sessions and files.** `history_sessions` lists sessions without a query, by last update, creation, cost or size. `history_files` lists the sessions that read or changed a file or folder, with counts per operation and the `seq` of the first touch.
- **Recall.** `history_recall` searches, takes the best sessions and returns quoted evidence with session IDs and `seq`s. With `synthesize: true` it also asks a model to write an answer from that evidence.
- **SQL.** `history_sql` runs one read-only `SELECT` or `WITH` statement over the index, for counts and reports. Its stable interface is four views, `v_sessions`, `v_docs`, `v_files` and `v_links`, and two full-text tables, `docs_words` (`MATCH`) and `docs_sub` (`text LIKE '%substring%'`). The other tables can change between versions.
- **Pin.** `history_pin` keeps a past session's brief, or a range of its messages, in the current session's instructions, so it stays in view through compactions. It is not in Code Mode, because it changes the current session.
- **Status.** `history_status` shows index progress, the source and the options in effect.

Search, sessions, files and recall look in the current project by default. They leave out the current session, subagent sessions and archived sessions unless you ask for them. The filters are `scope` (`project`, `directory`, `all` or `session`), `since` and `until` (an ISO date, or an age such as `36h`, `7d`, `3w`, `2m` or `1y`), `kinds`, `tool`, `agent`, `path`, `sessionID`, `includeSubagents`, `includeCurrent` and `includeArchived`.

Search has three modes. `words`, the default, matches stemmed words in any order and understands `"exact phrases"`, `-excluded` terms, `prefix*` and `OR`. A word joined by dots or dashes, such as a version `2.2.3`, an address `192.0.2.10` or a name `foo.bar.baz`, matches only as itself, not numbers or words with the same parts. `substring` matches exact text of at least three characters, for identifiers, paths and error messages. `regex` takes a JavaScript regular expression. Substring and regex mode read the newest 20,000 texts that may match, found through a trigram index.

When the sessions that have every word of a phrasing do not fill the page, a session that has only some of them also shows, marked `near match`, below them. Sessions in one directory that are runs of the same thing, with a near-identical title or the same first prompt, such as the runs of one scheduled prompt, show once, with a count of the `similar` others. When a search, `history_sessions` or `history_files` finds nothing, the result counts what the default filters left out, such as archived sessions, other projects or the current session's own subagents, and names the input that would show them.

One skill, `history-recall`, teaches the search, brief, read pattern and how to cite a session as `(ses_… #seq)`.

### How it reads your history

The plugin API gives a plugin a session's context, which holds only the messages after the latest compaction, not the whole history. So the plugin opens OpenCode's own database (`~/.local/share/opencode/opencode.db`) **read-only** and copies the text it needs into an index of its own (`~/.local/share/opencode-history/index.db`). It never writes OpenCode's database, and it never changes a file it did not create. While OpenCode runs, session events keep the index current, and search, sessions and recall first catch up with anything newer, for at most about 200 ms.

The index holds prompts, replies, tool calls and their output, compaction summaries and session titles. Commands you run yourself in a session are indexed like `shell` tool calls, with the head and tail of their output. If the database cannot be read, the plugin falls back to the plugin session API, which has only the messages after each session's latest compaction; status says so and gives the fix.

### Commands

- `/history-status` posts the status into the session: the connection, index progress and how far behind it is, the source, the database and index paths, the default scope, recall answers, the tools, agents without the default rules, the OpenCode version and one Next step.
- `/history-reindex` catches the index up with OpenCode's sessions. `/history-reindex rebuild` drops the index and indexes everything again.

### Status dialog

In the terminal UI, `/history`, or **History: Status** in the command palette, opens a dialog with the same text as `/history-status`, without posting anything into the session. Press `r` to refresh it. While it is open it also refreshes when the server reconnects, an agent changes, or a session is created, deleted or goes idle. It changes nothing; close it with `esc`.

### Scripts

A script or a cron job can call the same tools with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules, and it can read history but never pin:

```sh
opencode api post /api/rpc/history.sessions.tools/search \
  -d '{"input":{"sessionID":"ses_…","input":{"query":["flaky upload test"],"scope":"all"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/scripting.md).

## Permissions

The plugin puts a default block after each agent's base `* * allow` rule:

| Tool | Default |
|---|---|
| `history_search`, `history_read`, `history_brief`, `history_sessions`, `history_files`, `history_recall`, `history_sql`, `history_status` | allow |
| `history_pin`, which changes the current session's instructions | ask |
| any other `history_*` tool | ask |

Your own rules come later, so they win. `scope` chooses what is relevant; it is not access control. An agent that has these tools can read any indexed session in any project, and `history_sql` always covers every project. To keep an agent out of your history, deny the tools. A deny hides the matching tools:

```jsonc
{
  "agents": {
    "reviewer": {
      "permissions": [
        { "action": "history_*", "resource": "*", "effect": "deny" }
      ]
    }
  }
}
```

Put the same rule in the top-level `permissions` to remove the tools from every agent, or name single tools such as `history_sql` or `history_pin`. Every rule needs `"resource"`. OpenCode skips a rule without it. Agents defined only in your config miss the default block; `/history-status` names them and gives the block to put first in their own `permissions`. The full rules are in [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#permissions).

## Configure

Options go on the plugin entry in `opencode.json`:

```jsonc
{
  "plugins": [{
    "package": "@joe-broadhead/opencode-history",
    "options": {
      "defaultScope": "project",
      "mask": ["internal-token-[0-9a-f]{32}"],
      "recall": { "synthesize": false }
    }
  }]
}
```

`database` points at OpenCode's database and `indexPath` moves the index. `indexPath` must be a new file or an existing History index, outside OpenCode's data folder and outside the project; anything else fails setup with `INDEX_PATH_REFUSED` and is left untouched, whichever config sets it. `defaultScope` is the scope when a call names none. `index.reasoning`, `index.toolResults` and `index.maxDocChars` choose what is indexed. Built-in patterns mask common credentials before text is stored or shown: private keys, API keys and tokens with well-known prefixes (such as `sk-`, `ghp_`, `xai-`, `AKIA`), JSON Web Tokens, `Bearer` and `Authorization` header credentials, and `password=`, `secret=`, `token=` and `api_key=` values. `mask` adds your own patterns, and `maskDefaults: false` turns the built-in ones off. `recall.synthesize` and `recall.model` control recall answers. `allowUntestedHost` loads on an untested OpenCode version, with a warning in status. An invalid option fails setup and names the key, never the value. The full reference, with every limit and error code, is [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md).

The `index` options, `mask` and `maskDefaults` apply to text indexed from then on. After you change them, run `/history-reindex rebuild` so the text already in the index follows them too.

## Organisation rollout

An organisation can install the plugin for every user on a machine through OpenCode's system config: `/Library/Application Support/opencode/opencode.json` on macOS, `/etc/opencode/opencode.json` on Linux. It overrides user and project config.

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-history", "options": { "mask": ["internal-token-[0-9a-f]{32}"] } }],
  "permissions": [
    { "action": "history_sql", "resource": "*", "effect": "deny" }
  ]
}
```

There is nothing to sign in to and no client ID to set. `mask` adds patterns that are masked before text is indexed or shown. A deny in `permissions` removes a tool for every agent; deny `history_*` to keep agents out of history altogether.

## Troubleshooting

Start with `/history-status` or `history_status`. They end with one next step. Errors read `CODE: what happened. Next step: What to do.`

| State or code | What to do |
| --- | --- |
| `Source: plugin session API (partial)` | Status names the cause. `SOURCE_UNAVAILABLE`: point `database` at OpenCode's `opencode.db`, then restart OpenCode. `SOURCE_SCHEMA_UNKNOWN`: OpenCode's database has a layout this version does not know, so update the plugin or use a tested OpenCode. |
| `Connection: connecting`, `Index: building` | The first indexing pass is still running, and results cover only the sessions indexed so far. Wait for it to finish. |
| `Connection: failed` | The history is partial (see `Source`) or the index belongs to another plugin version (`INDEX_MISMATCH`). Follow the next step. |
| `Agents without default rules: …` | Those agents run every History tool, `history_pin` included, without asking. Put the block status shows first in each agent's own `permissions`. |
| `Index: ..., 35 s behind` | Seconds since the index was last in step with OpenCode. The next search, sessions or recall call catches up, or run `/history-reindex`. |
| A recent session is missing | Search, sessions and recall catch up for up to about 200 ms before they answer. A longer catch-up finishes in the background, so run `/history-reindex` to wait for it. |
| `HOST_UNTESTED` | Use OpenCode 2.2.3 or a later 2.2.x, or set `allowUntestedHost: true` and accept the warning. |
| `OPTIONS_INVALID` | The message names the option. Fix it in the plugin entry and restart. |
| `SOURCE_UNAVAILABLE` | OpenCode's database stopped answering. Check that `database` points at OpenCode's `opencode.db`, then restart OpenCode. |
| `INDEX_UNAVAILABLE` | `indexPath` must be a file the plugin can create and write. Fix it and restart. |
| `INDEX_PATH_REFUSED` | `indexPath` names OpenCode's database or data folder, a file inside the project, or an existing file that is not a History index. The file was left as it was. Set `indexPath` to a new file elsewhere, or remove it, and restart. |
| `INDEX_BUSY` | Another process, such as a second OpenCode, is writing the index. Retry in a moment. |
| `INDEX_FAILED` | Run `/history-status`, and if it persists, delete the index file and restart OpenCode. |
| `INDEX_MISMATCH`, `Index schema: ...` | Another OpenCode process running another version of the plugin rebuilt the index for its own version; status shows both versions. Restart every OpenCode process so they all run one version; the index is then rebuilt for it. |
| `SESSION_NOT_FOUND` | Find the session ID with `history_search` or `history_sessions`. |
| `QUERY_INVALID` | Fix the regular expression or the date, or search with `match: "words"`. |
| `SQL_REJECTED`, `SQL_FAILED` | Write one read-only `SELECT` or `WITH` statement, best over the `v_*` views. The message says what was wrong. |
| `SQL_TIMEOUT` | The statement ran longer than 10 seconds and was stopped. Filter by time or session, and bound a recursive `WITH`. |
| `PERMISSION_DENIED`, `SESSION_UNKNOWN`, `SESSION_AGENT_REQUIRED` | Scripts only: the session's agent may not use the tool, the session does not exist, or it names no agent. See [Scripting](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/scripting.md). |
| `RECALL_MODEL_UNAVAILABLE` | OpenCode has no model to write the answer. Set `recall.model` to a model OpenCode can use, or call `history_recall` with `synthesize: false`. |
| `RECALL_FAILED` | The model call failed. Call `history_recall` with `synthesize: false` for the evidence only. |
| `PIN_TOO_LARGE` | Pin a shorter range, or a lower `maxChars`. |
| `OPERATION_FAILED` | Something unexpected failed. Retry, and if it persists, the OpenCode server log has one `opencode-history:` line with the error's class, its SQLite code and where it was thrown, to report. |

The full list of codes is in [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#errors). Error and status text never contains your input, session text or SQLite's own message.

## Uninstall

```sh
opencode plugin remove @joe-broadhead/opencode-history
```

Removing the plugin keeps the index. To delete it, remove `~/.local/share/opencode-history` (or your `indexPath`, with its `-wal` and `-shm` files). OpenCode's database is not touched either way. Pins are instruction entries that OpenCode keeps on the sessions where you made them; the plugin does not remove them when it is uninstalled, so remove them first with `history_pin` and `"action": "remove"`. Rules you added to `permissions` stay until you remove them.

## Links

- [Configuration reference](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md)
- [Scripting](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/scripting.md)
- [Architecture](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/architecture.md)
- [Security policy](https://github.com/joe-broadhead/opencode-history/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-history/blob/HEAD/CHANGELOG.md)
- [Contributing](https://github.com/joe-broadhead/opencode-history/blob/HEAD/CONTRIBUTING.md): build, tests and checks
- [Issues](https://github.com/joe-broadhead/opencode-history/issues)

Licensed under the [MIT licence](https://github.com/joe-broadhead/opencode-history/blob/HEAD/LICENSE).
