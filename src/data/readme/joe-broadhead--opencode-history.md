# History for OpenCode

Lets OpenCode agents search, read and recall your own past OpenCode sessions, in this project or any other, through a local full-text index.

Unofficial; not affiliated with OpenCode.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Another release inside that range starts too, and status says it is untested. Outside `>=2.2.3 <2.3.0` the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- Nothing else: no native programs, downloads or accounts. The index is SQLite with full-text search, through the `node:sqlite` module of OpenCode's runtime.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-history
```

Run `opencode reload`, or restart OpenCode. Then run `/history-status`. On first start the plugin indexes every session in OpenCode's database in the background, newest first. The tools work while it runs, over the sessions indexed so far. `/history-status`, or `/history` in the terminal UI, shows the progress.

To update, run `opencode plugin update @joe-broadhead/opencode-history`, then `opencode reload`. An entry pinned to a version, such as `@joe-broadhead/opencode-history@0.0.1`, does not update: remove the `@version` from `plugins` first. The index is kept; when a new version changes its layout, the plugin rebuilds it in the background.

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
```

- **Search, brief, read.** The usual lookup. `history_search` ranks sessions for two to four phrasings of one topic and returns excerpts, each with a `seq` and a ready citation, `cite`, such as `(ses_abc123 #42)`. `history_brief` summarises one session: first prompt, compaction summaries, last reply, outcome, files edited, commands, subagents and todos. `history_read` reads the messages around a `seq`, with paging; with `kinds`, a window with none of those kinds widens to the nearest messages that have them. These three are pinned, with `history_sessions`, `history_files` and `history_sql`, so a model sees them without searching for them.
- **Sessions and files.** `history_sessions` lists sessions without a query, by last update, creation, cost or size. `history_files` lists the sessions that read or changed a file or folder, with counts per operation and the `seq`s of its touches.
- **Recall.** `history_recall` searches, takes the best sessions and returns quoted evidence with session IDs and `seq`s, for the agent to answer from.
- **SQL.** `history_sql` runs one read-only `SELECT` or `WITH` statement over the index, for counts and reports. Its stable interface is four views, `v_sessions`, `v_docs`, `v_files` and `v_links`, and two full-text tables, `docs_words` (`MATCH`) and `docs_sub` (`text LIKE '%substring%'`). The other tables can change between versions.
- **Events list.** `history_events_list` lists what changed in this machine's sessions since a cursor, as normalised events, for Memory's collector and other scripts. It is the History side of the shared `events_list` source contract; agents answering questions use the tools above.
- **Pin.** `history_pin` keeps a past session's brief, or a range of its messages, in the current session's instructions, so it stays in view through compactions. It is not in Code Mode, because it changes the current session.

Search, sessions, files and recall look in the current project by default. They leave out the current session, subagent sessions and archived sessions unless you ask for them. The filters are `scope` (`project`, `directory`, `all` or `session`), `since` and `until` (an ISO date, or an age such as `36h`, `7d`, `3w`, `2m` or `1y`), `kinds`, `tool`, `agent`, `path`, `sessionID`, `includeSubagents`, `includeCurrent` and `includeArchived`.

Search has three modes: `words`, the default, matches stemmed words in any order, with `"exact phrases"`, `-excluded` terms, `prefix*` and `OR`; `substring` matches exact text of at least three characters, for identifiers, paths and error messages; `regex` takes a JavaScript regular expression. [The search reference](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#search) has the full syntax and limits.

Sessions with only some words of a phrasing show below full matches, marked `near match`; runs of the same thing in one directory, such as one scheduled prompt's runs, show once with a `similar` count. When a search, `history_sessions` or `history_files` finds nothing, the result names the input that would show what the default filters left out.

The `history` namespace description tells an agent when to check here (before the repo or git, whenever you refer to earlier work), which tool fits which question, when to widen the search, and how to cite a session as `(ses_… #seq)`. One skill, `history-recall`, teaches the search, brief, read pattern and the longer recipes. [Where each instruction lives, and why](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/architecture.md#what-the-model-reads-and-where-an-instruction-belongs).

### How it reads your history

The plugin API gives a plugin a session's context, which holds only the messages after the latest compaction, not the whole history. So the plugin opens OpenCode's own database (`~/.local/share/opencode/opencode.db`) **read-only** and copies the text it needs into an index of its own (`~/.local/share/opencode-history/index.db`). It never writes OpenCode's database, and it never changes a file it did not create. While OpenCode runs, session events keep the index current, and search, sessions and recall first catch up with anything newer, for at most about 200 ms.

The index holds prompts, replies, tool calls and their output, compaction summaries and session titles. Commands you run yourself in a session are indexed like `shell` tool calls, with the head and tail of their output. If the database cannot be read, the plugin falls back to the plugin session API, which has only the messages after each session's latest compaction; status says so and gives the fix.

### Commands

- `/history-status` posts the status into the session: the connection, index progress and how far behind it is, the source, the database and index paths with the index's size, the default scope, recall answers, the tools, agents without the default rules, the OpenCode version and one Next step.
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
| `history_search`, `history_read`, `history_brief`, `history_sessions`, `history_files`, `history_recall`, `history_sql`, `history_events_list` | allow |
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
      "mask": ["internal-token-[0-9a-f]{32}"]
    }
  }]
}
```

`database` points at OpenCode's database and `indexPath` moves the index. `indexPath` must be a new file or an existing History index, outside OpenCode's data folder and outside the project; anything else fails setup with `INDEX_PATH_REFUSED` and is left untouched, whichever config sets it. `defaultScope` is the scope when a call names none. `index.reasoning`, `index.toolResults` and `index.maxDocChars` choose what is indexed. Built-in patterns mask common credentials before text is stored or shown ([the list](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#built-in-patterns)). `mask` adds your own patterns, and `maskDefaults: false` turns the built-in ones off. `allowUntestedHost` loads on an untested OpenCode version, with a warning in status. An invalid option fails setup and names the key, never the value. The full reference, with every limit and error code, is [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md).

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

Start with `/history-status`. It ends with one next step. Errors read `CODE: what happened. Next step: What to do.`

| State or code | What to do |
| --- | --- |
| `Source: plugin session API (partial)` | Status names the cause. `SOURCE_UNAVAILABLE`: point `database` at OpenCode's `opencode.db`, then restart OpenCode. `SOURCE_SCHEMA_UNKNOWN`: OpenCode's database has a layout this version does not know, so update the plugin or use a tested OpenCode. |
| `Connection: connecting`, `Index: building` | The first indexing pass is still running, and results cover only the sessions indexed so far. Wait for it to finish. |
| `Connection: failed` | The history is partial (see `Source`) or the index belongs to another plugin version (`INDEX_MISMATCH`). Follow the next step. |
| `Agents without default rules: …` | Those agents run every History tool, `history_pin` included, without asking. Put the default rules shown by `/history-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for History tools. |
| `Index: ..., 35 s behind` | Seconds since the index was last in step with OpenCode. The next search, sessions or recall call catches up, or run `/history-reindex`. |
| A recent session is missing | Search, sessions and recall catch up for up to about 200 ms before they answer. A longer catch-up finishes in the background, so run `/history-reindex` to wait for it. |
| `HOST_UNTESTED`, `OpenCode: … (untested; …)` | The OpenCode release is not one of the tested 2.2.3, 2.2.4 and 2.2.5. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it starts only with `allowUntestedHost: true`. If something fails, use a tested release. |
| `Skill: history-recall is hidden by <path>` | A skill with the same id, such as one in your own skills folder, loads instead of the plugin's. Rename or move the skill at that path. |
| `Masks: changed since text was indexed` | You changed `mask` or `maskDefaults` after text was indexed. Results already use the new patterns, but the index file holds the old text: run `/history-reindex rebuild`. |
| A large index file | The index takes about 2.7 times the text it holds, about 500 MB for 200,000 indexed texts, and status shows its size in the `Index file` row. It grows with your history; a deleted session leaves it, but the file keeps its size and reuses the space. To make it smaller, set `index.toolResults: false`, which leaves out tool output, or a lower `index.maxDocChars`, then delete the index file (with its `-wal` and `-shm` files) and restart OpenCode: the plugin builds a new one. |
| `OPTIONS_INVALID` | The message names the option. Fix it in the plugin entry and restart. |
| `INDEX_UNAVAILABLE` | `indexPath` must be a file the plugin can create and write. Fix it and restart. |
| `INDEX_PATH_REFUSED` | `indexPath` names OpenCode's database or data folder, a file inside the project, or an existing file that is not a History index. The file was left as it was. Set `indexPath` to a new file elsewhere, or remove it, and restart. |
| `INDEX_FAILED` | Run `/history-status`, and if it persists, delete the index file and restart OpenCode. |
| `INDEX_MISMATCH`, `Index schema: ...` | Another OpenCode process running another version of the plugin rebuilt the index for its own version; status shows both versions. Restart every OpenCode process so they all run one version; the index is then rebuilt for it. |
| `OPERATION_FAILED` | Something unexpected failed. Retry, and if it persists, the OpenCode server log has one `opencode-history:` line with the error's class, its SQLite code and where it was thrown, to report. |

The codes a tool call can return, each with its next step, are in [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#errors). Error and status text never contains your input, session text or SQLite's own message.

## Uninstall

1. History has no sign-in, so there is nothing to sign out of. Remove your pins while the plugin is still installed: they are instruction entries that OpenCode keeps on the sessions where you made them, and the plugin cannot remove them once it is gone. In each such session, call `history_pin` with `"action": "list"`, then `"action": "remove"` for each one.
2. Remove the plugin, then run `opencode reload` or restart OpenCode:

   ```sh
   opencode plugin remove @joe-broadhead/opencode-history
   ```

3. Delete the index, which removing the plugin keeps: `~/.local/share/opencode-history`, or your `indexPath` with its `-wal` and `-shm` files. OpenCode's database is not touched either way.
4. Remove the `history_*` rules you copied into `permissions` or into an agent's own permissions.

## Links

- [Configuration reference](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md)
- [Scripting](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/scripting.md)
- [Architecture](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/architecture.md)
- [Security policy](https://github.com/joe-broadhead/opencode-history/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-history/blob/HEAD/CHANGELOG.md)
- [Contributing](https://github.com/joe-broadhead/opencode-history/blob/HEAD/CONTRIBUTING.md): build, tests and checks
- [Issues](https://github.com/joe-broadhead/opencode-history/issues)

Licensed under the [MIT licence](https://github.com/joe-broadhead/opencode-history/blob/HEAD/LICENSE).
