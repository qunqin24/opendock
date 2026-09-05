# OpenCode Temporal Context

`opencode-temporal-context` gives OpenCode models sparse calendar chronology across long-lived and resumed sessions. It also tells compaction which dates remain semantically important.

The plugin changes only model-facing context. It does not modify stored session messages or display markers in the OpenCode UI.

## Install

Add the npm package to your global `~/.config/opencode/opencode.json` or a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-temporal-context"]
}
```

OpenCode installs npm plugins automatically with Bun. Restart OpenCode after changing its configuration.

To pin a release, use an npm version in the plugin spec:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-temporal-context@0.1.0"]
}
```

Do not configure both the npm package and a local copy. OpenCode loads local and npm plugins separately and would run both.

## Timezone

By default, the plugin uses the timezone of the machine running OpenCode. Set an IANA timezone with plugin options when the session should use a specific calendar:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-temporal-context", { "timeZone": "Europe/Berlin" }]
  ]
}
```

The `OPENCODE_TEMPORAL_TIMEZONE` environment variable is used when the plugin option is absent:

```sh
OPENCODE_TEMPORAL_TIMEZONE=Europe/Berlin opencode
```

An invalid timezone stops plugin initialization rather than silently assigning messages to the wrong day.

## Behavior

For a session spanning several days, the model effectively receives:

```text
Current date: 2026-07-30

<conversation_date value="2026-07-28"/>
User: Check the deployment.
Assistant: It is healthy.

<conversation_date value="2026-07-29"/>
User: Check again.
Assistant: Still healthy.

<conversation_date current="true"/>
User: Check again.
```

The markers are intentionally sparse:

- Historical calendar-day groups receive one absolute date marker.
- The current group receives `current="true"` only when it follows an older group.
- A conversation whose visible user turns are all from today receives no message markers.
- The assistant response following a user message stays in that user's calendar-day group, even if the response crosses midnight.
- Compaction summaries start a new raw-history segment so retained tail messages are grouped correctly.

The system context includes the current ISO date and timezone. During compaction, the plugin asks the summarizer to retain absolute dates only when chronology, freshness, deadlines, checks, decisions, state transitions, or future actions depend on them.

## Compatibility

Version `0.1.0` targets released OpenCode versions `>=1.18.27 <2` and is tested against `opencode-ai@1.18.27`.

The package uses the OpenCode 1.x server-plugin module contract. It does not claim OpenCode 2 compatibility; OpenCode 2 must be tested explicitly before widening the compatibility range.

The implementation uses these experimental hooks:

- `experimental.chat.messages.transform`
- `experimental.chat.system.transform`
- `experimental.session.compacting`

OpenCode may change experimental hook contracts. A packed-package smoke test against the released OpenCode binary is authoritative for supported versions.

## Development

```sh
npm ci
npm test
npm run pack:check
```

`npm test` builds the plugin, runs the behavior tests, packs and installs the npm artifact in an isolated fixture, and verifies that OpenCode 1.18.27 invokes its server initializer.

Release maintainers should follow [`RELEASING.md`](https://github.com/samiralibabic/opencode-temporal-context/blob/main/RELEASING.md), including the one-time authentication procedure required to create the package on npm.

## License

MIT
