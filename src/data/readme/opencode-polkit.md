# opencode-polkit

Redirects `sudo` and `doas` to `pkexec` inside OpenCode, so authorisation goes
through the desktop's polkit agent (KDE, GNOME, …) instead of a terminal the
shell tool does not have. Applies to commands run by the shell tool; `sudo` in
other terminals is unchanged.

## Installation

```sh
opencode plugin add opencode-polkit
```

Or add it to `opencode.json` / `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugins": ["opencode-polkit"]
}
```

For a local checkout, run `npm run build` once, then reference the directory:

```json
{
  "plugins": ["/path/to/opencode-polkit"]
}
```

## Behavior

| Command                | Result                                      |
|------------------------|---------------------------------------------|
| `sudo apt install x`   | polkit dialog, then runs as root            |
| `sudo -u bob …`        | as above, as `bob`                          |
| `cat x \| sudo tee y`  | dialog for `tee`                            |
| `sudo -n …`            | refused: pkexec has no non-interactive mode |
| `sudo -i`, `-s`, `-b`  | refused, with the equivalent command        |
| `sudoedit`, `visudo`   | refused, with the alternative               |
| `pkexec …`             | passed through                              |

Refused invocations exit with status 64 and one line naming the alternative.

## How it works

`sudo` and `doas` stand-ins are placed first on `PATH`, so the shell resolves
those instead of the system binaries, and they forward the command to `pkexec`.
Command text is never rewritten, so quoting, pipes and subshells need no special
handling.

## Authorisation

`polkitd` decides whether a password is required. These commands always require
one; other actions may not, according to policy. The plugin takes no part in
that decision.

## Limitations

- Absolute paths (`/usr/bin/sudo`) and relative ones (`./sudo`) bypass `PATH`.
- Commands that reset `PATH` (`env -i`, `PATH=/usr/bin …`) bypass it as well.
- Programs that invoke `sudo` with a scrubbed environment bypass it.

These bypass the redirect, not polkit, which still decides whether the command
runs.

## Requirements

`polkit` and a registered authentication agent. Desktop environments start one;
without one, `pkexec` fails instead of prompting.

## Exit status

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 126    | the polkit dialog was dismissed              |
| 127    | not authorised, or the program could not run |
| 64     | the plugin refused the invocation            |

Messages are in English.

## License

MIT
