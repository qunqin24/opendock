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
  "logPartUpdated": false
}
```

| Field            | Default                       | Description                                                        |
| ---------------- | ----------------------------- | ------------------------------------------------------------------ |
| `logDir`         | `~/.config/opencode/statin`   | Directory for `events.jsonl`                                       |
| `maxLogBytes`    | `5242880` (5 MiB)             | Rotate to `events.jsonl.1` once the log grows past this size        |
| `ringSize`       | `5000`                        | In-memory ring buffer of recent events                             |
| `logPartUpdated` | `false`                       | Also log `message.part.updated` (very noisy — streaming deltas)    |

## Privacy

`events.jsonl` contains event payload summaries, including fragments of your
conversations (titles, message roles, token counts, tool names, file paths).
Treat it as sensitive data and keep it out of version control and shared
backups.

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT
