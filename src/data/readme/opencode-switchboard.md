# opencode-switchboard

A better session tabs panel for OpenCode: sessions grouped by project and worktree, unread marks, and a
Parked fold for work you set aside until you come back to it.

### Tour

Projects group their sessions, and each row shows its state: running, waiting for approval, asking a question,
failed, or unread. A worktree's sessions show its name.

![Projects with sessions in every state](docs/media/switchboard-states.gif)

`p` parks a session in its project's Parked fold, and `p` again unparks it. A folded Parked heading shows how many
sessions it holds.

![Parking and unparking sessions](docs/media/switchboard-parked.gif)

`u` marks a session unread, and marks it read again.

![Marking a session unread and read](docs/media/switchboard-unread.gif)

A folded project sums up its sessions' states in badges.

![Folding a project](docs/media/switchboard-folded.gif)

[▶ Watch the full tour as a video](https://github.com/user-attachments/assets/14950937-ee17-4cef-be72-d8f964c5663a)

OpenCode's native tabs are a flat strip of open sessions. Once you run several agents across a few projects,
it gets hard to tell what is still working, what is waiting on you, and what finished while you were
elsewhere. The switchboard replaces the tabs with a panel built for that:

- **Grouped by project and worktree.** Each project lists its sessions; sessions in a worktree sit under the
  project they belong to, labeled with the worktree. Agent activity never reorders the list.
- **State at a glance.** Every row shows whether the session needs approval, has a question, is running,
  failed, or finished unread.
- **Unread marks.** Mark a session unread to come back to it, the way you would an email.
- **Parked, for work you set aside.** Park a session in its project's Parked fold to get it out of the way
  without losing it, and unpark it with the same key. Parking and unread marks are independent.
- **Nothing is deleted.** Closing a session or a project hides it from the panel.
- **Shared across TUIs.** The switchboard lives on the OpenCode server, so every TUI connected to it sees
  the same projects, sessions, and unread marks. Each TUI still shows its own conversation.

### Coming next

- Reorder projects, and sessions within a project, with keys or by dragging
  ([#9](https://github.com/abeisleem/opencode-switchboard/issues/9)).
- The working directory and git branch at the bottom of the panel
  ([#42](https://github.com/abeisleem/opencode-switchboard/issues/42)).

> **Status:** early preview (0.x). Requires OpenCode 2.2.0. OpenCode plugins can only add panels on the right
> side of a session, so the switchboard opens there rather than where the native tabs sit.

## Install

The plugin has two parts: a **server part**, which stores your switchboard, and a **panel** shown in the TUI.
Where you list the package depends on where your TUI runs.

| Your setup                                            | `opencode.json(c)` on the server machine | `cli.json` on the TUI machine |
| ----------------------------------------------------- | ---------------------------------------- | ----------------------------- |
| TUI and server on the same machine (plain `opencode`) | Required                                 | Not needed                    |
| TUI on another machine (`opencode --server …`)        | Required                                 | Required                      |

`cli.json` alone is never enough: the server part only loads from `opencode.json(c)`.

**1. On the machine that runs the OpenCode server**, add the package to your global
`~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-switchboard"],
}
```

Use the global config: the switchboard spans all your projects, and a project's `.opencode/opencode.jsonc`
only loads it inside that project.

**2. On each machine that runs a TUI connected to a remote server**, also add it to
`~/.config/opencode/cli.json`:

```json
{
  "plugins": ["opencode-switchboard"]
}
```

As of OpenCode 2.2.0, a TUI connected to a remote server only shows a server plugin's panel when the package
is already installed on the TUI's own machine; it does not download it. Listing it in `cli.json` installs it
there. Listing it in both files on one machine is safe: the entries resolve to a single copy.

**3. Optional: turn off the native tabs.** The switchboard is meant to replace them. In `cli.json` on each TUI
machine:

```json
{
  "tabs": { "mode": "off" }
}
```

The panel shows this tip once, the first time you open it with native tabs still on.

OpenCode installs npm plugins automatically. If `/switchboard` does not appear, see
[Troubleshooting](#troubleshooting).

## Use

### Open the panel

Run `/switchboard`, press `<leader>i` (**Ctrl+X, then I** by default), or pick **Open switchboard** in the
command palette.

- The first time you open it from a conversation, it adds that conversation's project.
- Starting with `--session` or reopening the panel adopts the conversation you are viewing, and adds it to its
  project if needed.
- Pressing it again while the panel is open moves the cursor to the conversation you are viewing.
- **Esc** closes the panel. Until you open it again, the switchboard does not track the sessions you open.

### Add work

While the panel is open:

- Open a session from OpenCode's **Ctrl+O** menu or its session list (**Ctrl+X, then L**), and it is added to
  its project.
- Pick a project in the **Ctrl+O** menu to add the project. A new project starts empty; a saved project comes
  back with its sessions.

These are OpenCode's default keys; yours may differ if you have rebound them.

### Read the panel

Projects are listed by name. Each project lists its sessions, then a **Parked** fold. The conversation you are
viewing has a bold title. A session in a worktree or another folder of the project shows that folder's
name on a second line.

| Indicator | Meaning                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------- |
| `!`       | Waiting for your approval                                                                      |
| `?`       | Waiting for your answer to a question                                                          |
| Spinner   | Running or queued                                                                              |
| `×`       | The last run failed                                                                            |
| `•`       | Unread: finished since you last looked, or marked unread                                       |
| `~`       | Approvals and questions for this workspace could not be read; click the error line for details |

A folded project sums up what it hides: `? 2` waiting on you, a spinner and count for running or queued
sessions, and `• 3` unread. Group and session spinners use the same animation and running color. A folded Parked
heading shows only how many sessions it holds, as `Parked · 3`, so parked work stays quiet.

Unread is independent of placement: mark a session unread to come back to it, whether or not it is parked.

### Keys

| Key                                     | Action                                                |
| --------------------------------------- | ----------------------------------------------------- |
| ↑/↓, j/k                                | Move                                                  |
| Enter                                   | Open session, or fold/unfold heading                  |
| ←/→                                     | Fold / unfold heading                                 |
| `u`                                     | Toggle read/unread                                    |
| `p`                                     | Park or unpark                                        |
| `x`                                     | Close session or project (never deletes it)           |
| `<leader>w` (Ctrl+X, then W by default) | Close the current conversation's row from either pane |
| `?`                                     | Help                                                  |
| Esc                                     | Close the panel                                       |

With the mouse:

- Click a session to open it, or a heading to fold or unfold it.
- Hover a row to show its `✕`, and click it to close that session or project.
- Click **? help** at the bottom for the key reference.

Opening a session, with Enter or a click, moves focus to its conversation so you can type right away. Press
`<leader>i` (**Ctrl+X, then I** by default) to return to the panel.

`<leader>w` (**Ctrl+X, then W** by default) closes the conversation you are viewing, independently of the panel
cursor, and returns to the session you viewed most recently in this TUI that is still open. It is active while
Switchboard is open; closing the panel restores the native shortcut behavior. Rebind it with
`opencode-switchboard.close-current` in `cli.json`.

**The switchboard never deletes, archives, or stops sessions.** Closing removes a session from the panel;
opening it again brings it back. A closed project keeps its sessions for when you reopen it. Delete sessions
through OpenCode's native session list.

## How state is shared

The server part stores the organization, and every client of that server shares it: open projects, their
sessions, parked sessions, unread marks, and folds.

Each TUI keeps its own place: the conversation it shows, the sessions it showed recently, and the panel's
cursor and scroll position. Opening a session in one TUI does not switch the others. Closing a session's row
in one TUI removes the row everywhere, but only the TUI that closed it moves to another session; the others
keep the conversation open. A TUI forgets its recent sessions when it exits.

OpenCode's desktop and mobile apps do not show the panel. Viewing a finished session there still counts as
reading it, but does not clear a session you marked unread.

## Troubleshooting

**`/switchboard` is missing in a TUI connected to a remote server.** Add the package to
`~/.config/opencode/cli.json` on the TUI's machine, then restart the TUI. The server machine also needs it in
`opencode.json(c)`; see [Install](#install).

**`/switchboard` is missing right after you added the plugin.** OpenCode installs npm plugins automatically,
which can take a moment. Restart the TUI.

**`NpmInstallFailedError` with npm `min-release-age` set.** OpenCode 2.2 applies `min-release-age` to plugins
but ignores `min-release-age-exclude` ([anomalyco/opencode#60567](https://github.com/anomalyco/opencode/issues/60567)),
so a release newer than your window does not install. On each machine that shows the error, clear the cached
copy and install it once with the window turned off, then restart the TUI:

```sh
rm -rf ~/.cache/opencode/npm/opencode-switchboard@latest
npm_config_min_release_age=0 opencode plugin add opencode-switchboard
```

OpenCode reuses that copy afterwards; your policy still applies to everything else. `plugin add` also lists
the package in your global `opencode.json(c)`, as Install step 1 does.

**The panel shows "Switchboard error".** Click the message to retry. The full error is appended to
`opencode-switchboard-errors.log` in the TUI machine's temp directory (`$TMPDIR`, often `/tmp`). Please
include it when you [open an issue](https://github.com/abeisleem/opencode-switchboard/issues).

**A `~` indicator, or "Attention unavailable" at the bottom.** The switchboard could not read approvals or
questions for a workspace, or the workspace no longer exists. Click the message for details. The panel retries
on its own every 15 seconds.

## Contributing

Bug reports and pull requests from forks are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
