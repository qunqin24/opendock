# opencode-terminal-notify

Desktop notifications through your terminal for [opencode](https://opencode.ai).
From the makers of [Agent Terminal](https://4nuva.dev/agent-terminal/): in
Agent Terminal the same notices also reach your paired phone.

opencode raises a notification when it:

- finishes a turn: `Task complete: Fixed the failing test. All 42 tests pass.`
- needs a permission: `Permission needed: bash — npm run deploy`
- asks you a question: `Question: Which database should I use?`

The title names the project folder (`opencode · my-app`), so you can tell
sessions apart.

## Install

```
opencode plugin github:4nuva/opencode-terminal-notify -g
```

`-g` installs it for every project. Leave it off to install into the current
project. Restart opencode afterwards.

If an older copy is in `~/.config/opencode/plugins/`, remove it first: opencode
loads every file in that folder, and two copies notify twice.

## Terminals

opencode has no notification channel of its own. The plugin writes an escape
sequence straight to the session's terminal and picks the sequence for the
terminal it detects:

| Terminal | Sequence |
| --- | --- |
| Agent Terminal (desktop and phone) | OSC 777 |
| Ghostty, Warp, urxvt | OSC 777 |
| Windows Terminal, iTerm2, WezTerm, ConEmu | OSC 9 |
| kitty | OSC 99 |
| macOS Terminal, VS Code | bell |
| anything else | OSC 9 |

Some terminals only show notifications while their window is in the background,
and some need notifications turned on in their own settings (iTerm2: Profiles →
Terminal → Notifications). Inside tmux, sequences reach the outer terminal only
with `allow-passthrough on`.

## Options

Set these in the environment that starts opencode:

| Variable | Default | What it does |
| --- | --- | --- |
| `TERMINAL_NOTIFY_FORMAT` | `auto` | `auto`, `osc777`, `osc9`, `osc99`, `all`, `bell` or `off`. `all` sends all three sequences, for a terminal `auto` does not know; a terminal that reads more than one (Ghostty reads 9 and 777) shows more than one. |
| `TERMINAL_NOTIFY_DETAILS` | on | Include the start of the reply, the command or file a permission is for, and the question. Off shows only the event. |
| `TERMINAL_NOTIFY_IDLE_REMINDER` | off | Notify again when a question or permission has waited 60 seconds for a reply. |

The Claude Code plugin's names (`CLAUDE_PLUGIN_OPTION_FORMAT`,
`CLAUDE_PLUGIN_OPTION_DETAILS`, `CLAUDE_PLUGIN_OPTION_IDLE_REMINDER`) are also
read, so one setting can serve both.

## Privacy

Nothing leaves your machine except through your terminal. Before any text goes
into a notification, known key and token formats (API keys, GitHub and Slack
tokens, JWTs, bearer tokens, `password=...`, credentials in URLs, long random
strings) are replaced with `***`. Turn `details` off to keep reply text and
commands out of notifications entirely, for example when notifications show on
a lock screen.

Subagents' turns do not notify; only the main session's do.

## Development

```
node --test
```

## License

The code is MIT. The Agent Terminal name and logo are not covered by that
licence; all rights reserved. See [LICENSE](LICENSE).

---

**[Agent Terminal](https://4nuva.dev/agent-terminal/)** is a terminal for
running coding agents, on your desktop and your phone. It shows these
notifications on the desktop and forwards them to your paired phone.
