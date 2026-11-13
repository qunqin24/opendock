# History for OpenCode

Lets OpenCode agents search, read and recall your own past OpenCode sessions, in this project or any other, through a local full-text index.

Unofficial; not affiliated with OpenCode.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Another release inside that range starts too, and status says it is untested. Outside `>=2.2.3 <2.3.0` the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- Nothing else: no native programs, downloads or accounts. The index is SQLite with full-text search, through the `node:sqlite` module of OpenCode's runtime.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-history#v0.0.1
```

Run `opencode reload`, or restart OpenCode. Then run `/history-status`. On first start the plugin indexes every session in OpenCode's database in the background, newest first. The tools work while it runs, over the sessions indexed so far. `/history-status`, or `/history` in the terminal UI, shows the progress.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-history#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-history#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-history#v0.0.1" }] }
```

The index is kept; when a new version changes its layout, the plugin rebuilds it in the background.

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

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

- **Search, brief, read.** The usual lookup. `history_search` ranks sessions for two to four phrasings of one topic and returns excerpts, each with a `seq` and a ready citation, `cite`, such as `(ses_abc123 #42)`. `history_brief` summarises one session: first prompt, compaction summaries, last reply, outcome, files edited, commands, subagents and todos. `history_read` reads the messages around a `seq`, with paging; with `kinds`, a window with none of those kinds widens to the nearest messages that have them. No tool is pinned; the `history-recall` skill explains the calls and Code Mode search finds signatures.
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

A script or a cron job can call the same tools with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules. Every tool is a method, `history_pin` included, and a script gets the same default as the model: at `access: "all"` it runs everything, while a rule that resolves to `ask` is refused, because no one can answer it, and a `deny` is refused:

```sh
opencode api post /api/rpc/history.sessions.tools/search \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"query":["flaky upload test"],"scope":"all"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** An agent can read any indexed session in any project, and `history_pin` writes a past session's brief into the current session's instructions, without asking. Restrict it in any of these three ways:

1. **The `access` option**, which drives the rules the plugin inserts directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone, and a later rule still wins.

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and one a later version adds | nothing |
   | `"ask-changes"` | the reads | `history_pin`, and a tool a later version adds |
   | `"read-only"` | the reads | nothing: `history_pin` and new tools are **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-history#v0.0.1", "options": { "access": "read-only" } }] }
   ```

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "history_*", "resource": "*", "effect": "ask" },
     { "action": "history_search", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names: `history_` and the tool's name, such as `history_sql` or `history_pin`.

   ```json
   { "permissions": [
     { "action": "history_pin", "resource": "*", "effect": "deny" },
     { "action": "history_sql", "resource": "*", "effect": "ask" }
   ] }
   ```

The block for each value, generated from `defaultRules(access)` in `src/host/permissions.ts`:

<!-- generated:rules-all -->

`access: "all"`

| Action | Resource | Effect |
| --- | --- | --- |
| `history_*` | `*` | `allow` |
| `history_search` | `*` | `allow` |
| `history_read` | `*` | `allow` |
| `history_brief` | `*` | `allow` |
| `history_sessions` | `*` | `allow` |
| `history_files` | `*` | `allow` |
| `history_recall` | `*` | `allow` |
| `history_sql` | `*` | `allow` |
| `history_events_list` | `*` | `allow` |
| `history_pin` | `*` | `allow` |

<!-- /generated:rules-all -->

<!-- generated:rules-ask-changes -->

`access: "ask-changes"`

| Action | Resource | Effect |
| --- | --- | --- |
| `history_*` | `*` | `ask` |
| `history_search` | `*` | `allow` |
| `history_read` | `*` | `allow` |
| `history_brief` | `*` | `allow` |
| `history_sessions` | `*` | `allow` |
| `history_files` | `*` | `allow` |
| `history_recall` | `*` | `allow` |
| `history_sql` | `*` | `allow` |
| `history_events_list` | `*` | `allow` |
| `history_pin` | `*` | `ask` |

<!-- /generated:rules-ask-changes -->

<!-- generated:rules-read-only -->

`access: "read-only"`

| Action | Resource | Effect |
| --- | --- | --- |
| `history_*` | `*` | `deny` |
| `history_search` | `*` | `allow` |
| `history_read` | `*` | `allow` |
| `history_brief` | `*` | `allow` |
| `history_sessions` | `*` | `allow` |
| `history_files` | `*` | `allow` |
| `history_recall` | `*` | `allow` |
| `history_sql` | `*` | `allow` |
| `history_events_list` | `*` | `allow` |
| `history_pin` | `*` | `deny` |

<!-- /generated:rules-read-only -->

A `deny` also hides the matching tools. `scope` chooses what is relevant; it is not access control. An agent that has these tools can read any indexed session in any project, and `history_sql` always covers every project. To keep an agent out of your history, deny the tools:

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

Put the same rule in the top-level `permissions` to remove the tools from every agent. Every rule needs `"resource"`. OpenCode skips a rule without it. Agents defined only in your config miss the default block; at `"ask-changes"` or `"read-only"`, `/history-status` names them and gives the block to put first in their own `permissions`. The full rules are in [docs/configuration.md](https://github.com/joe-broadhead/opencode-history/blob/HEAD/docs/configuration.md#permissions).

## Configure

Options go on the plugin entry in `opencode.json`:

```jsonc
{
  "plugins": [{
    "package": "github:joe-broadhead/opencode-history#v0.0.1",
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
  "plugins": [{ "package": "github:joe-broadhead/opencode-history#v0.0.1", "options": { "mask": ["internal-token-[0-9a-f]{32}"] } }],
  "permissions": [
    { "action": "history_sql", "resource": "*", "effect": "deny" }
  ]
}
```

There is nothing to sign in to and no client ID to set. `mask` adds patterns that are masked before text is indexed or shown. A deny in `permissions` removes a tool for every agent; deny `history_*` to keep agents out of history altogether.

## Known limits

- **The first index pass runs in the background.** Until it finishes, search, sessions and recall answer from the sessions indexed so far. `/history-status` shows the progress.
- **Only OpenCode's database is read.** When it cannot be read, or its layout is one this version does not know, the plugin falls back to the plugin session API, which holds only the messages after each session's latest compaction. Status says the history is partial.
- **Masking matches patterns.** The built-in patterns and your `mask` entries catch the credentials they describe, not every secret. Text indexed before a change keeps its old form until `/history-reindex rebuild`.
- **The index is large and grows with your history.** It takes about 2.7 times the text it holds, and deleting a session does not shrink the file.
- **Every tool is allowed by default.** Any agent can read any indexed session in any project, and `access` decides what runs without asking. `scope` filters results; it is not access control.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6.** Other releases inside `>=2.2.3 <2.3.0` start, and status reports them as untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Troubleshooting

Start with `/history-status`. It ends with one next step. Errors read `CODE: what happened. Next step: What to do.`

<!-- generated:codes -->

| Code | What happened | Next step |
| --- | --- | --- |
| `ACCOUNT_UNKNOWN` | History lists only this machine's sessions, and that account is another machine's. | Call history_events_list without account, or with the account its events name. |
| `CANCELLED` | The call was cancelled. | Call the tool again if you still need the result. |
| `CLOSED` | The History plugin is shutting down. | Retry after OpenCode has reloaded the plugin. |
| `CONTRACT_MISMATCH` | The history index returned data this plugin version does not expect. | Reinstall the plugin, and if it persists, report it with the /history-status output. |
| `CURSOR_INVALID` | The cursor is invalid or has expired. | Repeat the call without cursor. |
| `EVENTS_UNAVAILABLE` | OpenCode's session events stopped, so the index may lag behind new sessions. | Wait, since the plugin subscribes again by itself, and restart OpenCode if it persists. |
| `HOST_UNTESTED` | This OpenCode version is outside the range History supports. | Use OpenCode 2.2.3, 2.2.4, 2.2.5 or 2.2.6, or another release inside >=2.2.3 <2.3.0, or set the plugin option allowUntestedHost: true to run anyway. |
| `INDEX_BUSY` | The history index is locked by another writer, such as a second OpenCode process. | Retry in a moment. |
| `INDEX_FAILED` | Updating the history index failed. | Run /history-status, and if it persists, delete the index file at indexPath and restart OpenCode. |
| `INDEX_MISMATCH` | The history index was rebuilt for another version of this plugin, likely by another OpenCode process. | Restart every OpenCode process, so they all run one version of the plugin. |
| `INDEX_PATH_REFUSED` | The indexPath option names a file the History index must not use. | Set indexPath to a new file outside OpenCode's data folder and your projects, or remove it to use the default, then restart OpenCode. |
| `INDEX_UNAVAILABLE` | The history index could not be opened. | Check that indexPath is a writable file path, then restart OpenCode. |
| `INPUT_INVALID` | The tool input is invalid. | Correct the named fields and call the tool again. |
| `MESSAGE_NOT_FOUND` | That session has no message at that position. | Call history_read without `at` to see the session's message range. |
| `OPERATION_FAILED` | The tool failed unexpectedly. | Retry, and if it persists, run /history-status. |
| `OPTIONS_INVALID` | The plugin options are invalid. | Fix the History plugin options in opencode.json (see Configure in the README), then restart OpenCode. |
| `OUTPUT_LIMIT` | The result is too large to return. | Narrow the request: a lower limit, a smaller maxChars or a shorter range. |
| `PERMISSION_DENIED` | The session's agent may not use this tool. | Add an allow rule for the tool's action to that agent, or call as a session whose agent allows it. |
| `PIN_TOO_LARGE` | The text to pin is larger than OpenCode allows for one instruction entry. | Pin a shorter range, or set a lower maxChars. |
| `QUERY_INVALID` | The search query cannot be used. | Correct the named input and call the tool again. |
| `SESSION_AGENT_REQUIRED` | That session names no agent, or one this location does not have, so there are no rules to run the tool under. | Create a session that names an agent this project has, with its project as the location, such as POST /api/session with {"agent":"build","location":{"directory":"/path/to/project"}}, and pass its id. |
| `SESSION_NOT_FOUND` | No indexed session has that ID. | Find the session ID with history_search or history_sessions. |
| `SESSION_UNKNOWN` | OpenCode has no session with that ID. | Create a session that names an agent, such as POST /api/session with {"agent":"build"}, and pass its id. |
| `SKILLS_INVALID` | A History skill file is missing or malformed, so that skill was skipped. | Reinstall the plugin. |
| `SOURCE_SCHEMA_UNKNOWN` | OpenCode's database has a layout this plugin version does not know. | Update the plugin, or use the OpenCode version it was tested with. |
| `SOURCE_UNAVAILABLE` | OpenCode's session history could not be read. | Check that the database option points at OpenCode's opencode.db, then restart OpenCode. |
| `SQL_FAILED` | The SQL query failed. | Check the view and column names in the history_sql description, then retry. |
| `SQL_REJECTED` | The SQL was refused. | Rewrite it as one read-only SELECT or WITH statement over the v_* views and the docs_words and docs_sub tables. |
| `SQL_TIMEOUT` | The SQL query ran longer than 10 seconds and was stopped. | Narrow it: filter by time or session, and bound a recursive WITH with a LIMIT or a WHERE on its counter. |
| `STATUS_UNAVAILABLE` | History status could not be read. | Run /history-status again, or check the OpenCode server log. |

<!-- /generated:codes -->

| State or code | What to do |
| --- | --- |
| `Source: plugin session API (partial)` | Status names the cause. `SOURCE_UNAVAILABLE`: point `database` at OpenCode's `opencode.db`, then restart OpenCode. `SOURCE_SCHEMA_UNKNOWN`: OpenCode's database has a layout this version does not know, so update the plugin or use a tested OpenCode. |
| `Connection: connecting`, `Index: building` | The first indexing pass is still running, and results cover only the sessions indexed so far. Wait for it to finish. |
| `Connection: failed` | The history is partial (see `Source`) or the index belongs to another plugin version (`INDEX_MISMATCH`). Follow the next step. |
| `Agents without default rules: …` | Those agents run every History tool, `history_pin` included, without asking. Put the default rules shown by `/history-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for History tools. |
| `Index: ..., 35 s behind` | Seconds since the index was last in step with OpenCode. The next search, sessions or recall call catches up, or run `/history-reindex`. |
| A recent session is missing | Search, sessions and recall catch up for up to about 200 ms before they answer. A longer catch-up finishes in the background, so run `/history-reindex` to wait for it. |
| `HOST_UNTESTED`, `OpenCode: … (untested; …)` | The OpenCode release is not one of the tested 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it starts only with `allowUntestedHost: true`. If something fails, use a tested release. |
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
   opencode plugin remove github:joe-broadhead/opencode-history#v0.0.1
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
