# opencode-statin

[![npm version](https://img.shields.io/npm/v/opencode-statin.svg)](https://www.npmjs.com/package/opencode-statin)

Telemetry for your opencode sessions. `opencode-statin` records every event the
opencode runtime emits — with timestamps — to a JSONL log and keeps per-session
statistics: messages by role, parts by type, tool calls and durations,
compactions, idle periods, tokens, cost, system-prompt size, and the models in
play. Two slash commands surface it: `/statin` for a session summary and
`/statin-events` for the most recent events plus the log path.

It is read-only: it observes, it never injects anything into a session and never
tells the model what to do.

## Install

```bash
opencode plugin opencode-statin -g
```

Restart opencode to load the plugin.

`opencode plugin` only installs the module and adds it to your `plugin` config —
it does **not** copy command files out of the package. So also register the two
slash commands by copying the bundled files into your global commands directory:

```bash
cp ~/.cache/opencode/node_modules/opencode-statin/commands/*.md ~/.config/opencode/commands/
```

From a repo checkout, use `cp commands/*.md ~/.config/opencode/commands/`
instead. opencode scans both `command/` and `commands/`, in the global config
directory and in a project's `.opencode/`. As an alternative to files, you can
declare the commands inline under the `command` key of `opencode.json`.

## Usage

| Command           | Effect                                                        |
| ----------------- | ------------------------------------------------------------- |
| `/statin`         | Session statistics: messages, parts, tools, tokens, cost, ... |
| `/statin-events`  | The last 40 recorded events and the path to the JSONL log     |

## Configure

Create `~/.config/opencode/statin.json` (a legacy `opencode-statin.json` in the
same directory is also read):

```json
{
  "logDir": "~/.config/opencode/statin",
  "maxLogBytes": 5242880,
  "ringSize": 5000,
  "logPartUpdated": false,
  "eventLog": false,
  "usageTtlDays": 7
}
```

| Field            | Default                       | Description                                                        |
| ---------------- | ----------------------------- | ------------------------------------------------------------------ |
| `logDir`         | `~/.config/opencode/statin`   | Directory for `usage.json` (and `events.jsonl` when `eventLog` is on) |
| `maxLogBytes`    | `5242880` (5 MiB)             | Rotate to `events.jsonl.1` once the log grows past this size        |
| `ringSize`       | `5000`                        | In-memory ring buffer of recent events                             |
| `logPartUpdated` | `false`                       | Also log `message.part.updated` (very noisy — streaming deltas)    |
| `eventLog`       | `false`                       | Write the event telemetry log. Off by default since 0.2.0          |
| `usageTtlDays`   | `7`                           | Prune `usage.json` entries not touched for this many days          |

## Usage tracking

Independently of the event log, the plugin counts `read` and `grep` tool calls
and persists them to `usage.json` (same `logDir`). Each entry is
`tool:argument -> { count, first, last }`, keyed by project (the working
directory's basename), so the file can be kept per-machine and compared across
machines. `read` paths are stored relative to the project root — use the counts
to spot documentation gaps (files the agent keeps having to read, classes it
keeps grepping for) and describe them in docs instead. Entries are pruned after
`usageTtlDays` of inactivity. `/statin-events` shows the top entries and the
file path.

## Privacy

`events.jsonl` (when enabled) and `usage.json` contain event payload summaries and
tool arguments, including fragments of your conversations (titles, message
roles, token counts, tool names, file paths, grep patterns). Treat them as
sensitive data and keep them out of version control and shared backups.

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT
