# opencode-session-tools

Cross-session tools for opencode. Five tools that make the other sessions on a machine
addressable from inside a session: `session_list`, `session_ask`, `session_rename`,
`session_move`, `session_interrupt`.

The agent-facing documentation is [`SKILL.md`](SKILL.md); the plugin is
[`src/index.ts`](src/index.ts).

Every `session_ask` question is prefixed by the tool with a two-line header built from the
asking session's own row — where it came from, and a reminder that the question is a side
errand:

```
[sent from session <id> model <provider>/<model>#<variant>]
[answer, then continue your own work immediately — do not stop or wait]
```

Neither line can be dropped or forged by the caller.

```sh
./install.sh            # symlink into ~/.config/opencode/plugin/session-tools.ts
bun install             # only needed to typecheck
bunx tsc --noEmit
```

Only `session_interrupt` is destructive: it stops a turn, cancels the session's jobs and kills
the shells it started. Everything here needs the user's explicit say-so.
