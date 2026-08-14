# opencode-polkit

Redirect `sudo`/`doas` to `pkexec` in [OpenCode](https://opencode.ai).
Triggers the system's native polkit authentication dialog (KDE, GNOME, etc.)
instead of requiring a terminal for password input.

Like CachyOS Hello, the plugin does not check for a polkit agent up front:
`sudo` is always redirected to `pkexec` at execution time, and polkitd routes
the request to whatever agent is currently registered. Without an agent,
`pkexec` fails fast with `Error creating textual authentication agent`
(no TTY); the plugin reports that as a clear denial. A hang (dialog never
appears) is bounded by the bash tool's own timeout (default 2 min,
configurable up to 10 min) and left untranslated — it cannot be told
apart from a long-running command.

## Install

```sh
opencode plugin opencode-polkit
```

Or add to `opencode.json` / `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": ["opencode-polkit"]
}
```

For local development, point opencode at the project directory instead:

```json
{
  "plugin": ["/path/to/opencode-polkit"]
}
```

## Behavior

| Command               | result                                                |
|-----------------------|-------------------------------------------------------|
| `sudo xxx`            | redirects to `pkexec xxx`                             |
| `doas xxx`            | redirects to `pkexec xxx`                             |
| `sudo -n xxx`         | blocked: pkexec has no short options (unclear failure)|
| `cat x \| sudo tee y` | redirects to `cat x \| pkexec tee y` (mid-command)    |
| `pkexec xxx`          | passes through                                        |
| `sudoedit` / `visudo` | blocked                                               |

### Minimal intervention

The command is rewritten **only** by replacing `sudo`/`doas` with
`pkexec` — its shape is otherwise untouched, so the agent always sees a
command that behaves like the one it wrote. Privilege keywords are found
by a lexical scanner (quote/escape/heredoc aware): `sudo` inside string
literals, comments or heredocs is ignored; `sudo` in any executable
position (leading, after `&&`/`||`/`|`, in `$(...)` or subshells, after
an env assignment like `FOO=1 sudo x`) is rewritten, while the same word
in argument position (`--name sudo bash`) is left alone. `sudo a && sudo b`
rewrites both.

### Failures

Unambiguous authentication failures are reported as clear errors and the
command is remembered so a retry is rejected without prompting again
(cleared when opencode restarts): `Not authorized`, `Error executing
command as another user`, `Error creating textual authentication agent`
(no polkit agent + no TTY). A hang (dialog never appears) is bounded by
the bash tool's own timeout (default 2 min, configurable up to 10 min)
and is left untranslated — it cannot be told apart from a long-running
command.

Options pkexec does not accept (all short options, plus any long option
outside `--user`, `--keep-cwd`, `--disable-internal-agent`, `--help`,
`--version`) are rejected before execution with a clear message, since
the rewrite would otherwise surface pkexec's own confusing
`Cannot run program -n` error. `sudo --` and options after the program
name are left alone.

## i18n

Messages adapt to `$LC_MESSAGES` / `$LANG`. Currently supports:
en, zh, ja, ko, de, fr, es, pt, ru, tr, uk.

PRs welcome for additional translations.

## License

MIT
