# hc-teleport

Moves a coding-agent session that runs in a herdr-core (`hc`) terminal from the Mac to another `hc` machine. It also moves a session back, from an `hc` machine to the Mac. The design and plan live in `docs/issues/0001-move-a-claude-code-session-between-the-mac-and-dev-home-from-an-hc-terminal.md`.

`hc-teleport <terminal> <machine>` moves the session. In order it plans, checks the destination (preflight), then, for a session on a disk both machines share, relocates it (below); otherwise it carries the git checkout, carries the transcript, resumes the session in a new terminal on the destination and waits until it is idle there, confirms the destination's session registry names the session, then stops the source terminal and parks the source checkout. A refusal before the first write changes nothing on either side; a destination that does not come up is rolled back and, for a carried move, the source is never touched. `--dry-run` only plans: it reads the terminal and prints what a move would resume, and writes nothing, starts nothing and stops nothing.

## Usage

```
hc-teleport <terminal> <machine> [--dry-run] [--timeout <seconds>] [--json]
hc-teleport <machine> --detach [--wait <seconds>] [--timeout <seconds>] [--json]
hc-teleport status [--json]
hc-teleport init
hc-teleport doctor [--json]
```

## A session that moves itself: `--detach` and `status`

`hc-teleport <machine> --detach`, typed from inside the session's own terminal, returns at once so the session can end its turn. It reads its own address from `HC_TERMINAL_ID` (`HC_SESSION/HC_TERMINAL_ID` on an hc machine, where `HC_SESSION` names the machine), checks the config and plans as `--dry-run` would, except that the source may be working, then starts a runner terminal on the core with `hc run`, which outlives the session, named `hct-<first 28 hex digits of the session id>`. It prints one line naming the runner and the start time (with `--json`: `{"detached":{"runner","source","machine","state","startedAt"}}`, `startedAt` in epoch milliseconds, the same value the runner receives) and exits 0. Every `hc` call drops `HC_SESSION`, so they reach the core; a machine named by `HC_SESSION` that `hc machine ls` does not list refuses `core_unreachable`, and without `HC_TERMINAL_ID` the command exits 2 with `not_in_a_terminal`.

The runner waits for the source to be idle with `hc wait`, up to `--wait` seconds (a whole number from 1 to 3600, 300 by default; `--timeout` keeps meaning the destination's come-up). A source that works again before it is stopped sends the runner back to waiting. Then it moves the session as the foreground command would. It records the phase in `$XDG_STATE_HOME/hc-teleport/<session id>.json` (`$HOME/.local/state/hc-teleport/` when `XDG_STATE_HOME` is not absolute): `waiting`, `moving`, then the final `moved`, `refused`, `rolled_back`, `rollback_failed`, `source_running`, `source_not_stopped` or `timeout`. The start writes no state file: the move's parameters travel as the runner's arguments, and only the runner that holds the name writes the file, starting with `waiting`, so a start that loses the name, or fails for another reason, leaves the file as it was. A runner started without those parameters, or with malformed ones, exits 1 with `hc_failed` and writes nothing. The runner records its own terminal address (`HC_TERMINAL_ID`, prefixed with `HC_SESSION/` on an hc machine) in every write. The runner's hc name is the lock: hc refuses a second live terminal of that name, so while the runner lives a second `--detach` for the session refuses `move_in_progress` (naming the runner's name) and starts nothing, and once the runner ends the name is free and a new `--detach` starts. There is no lock file, and the state file only reports the move; `status` shows `runner_lost` for a move that did not end whose runner terminal no longer lives (`hc get`). Any other `hc run` failure refuses `hc_failed`. A malformed file refuses `state_unreadable`. When a move does not end in `moved` and a session still runs, the runner types `hc-teleport: <phase> (<reason>); see hc-teleport status` into it, into the address the session runs on again after a relocation rolled back; the detail is only in the state file and `status`. A failed `hc send` is stored in the file as `sendError`, in the same final write that records the outcome. The reasons a detached move itself gives are in the table below.

| Reason | Phase | When |
|---|---|---|
| `wait_timeout` | `timeout` | The source was not idle within `--wait`, or kept working again until then. |
| `source_gone` | `refused` | The source exited while the runner waited for it. |
| `source_not_idle` | `refused` | The source is blocked or reports `error` instead of `done` or `idle`. |
| `runner_failed` | `refused` | `hc` or the move threw in the runner; the detail is the message. |

`hc-teleport status [--json]` (no `--wait`, `--timeout` or `--dry-run`: usage error, exit 2) prints one line per state file: session, source and machine, phase, runner, the start time and, for a final phase, the reason; each `--json` entry carries `startedAt`. For a phase that is not final it reads the runner with `hc get` and adds `runner_lost` when the runner terminal no longer lives. With no state files it prints `no detached moves`; `--json` prints `{"moves":[...]}`.

## Setup: `init` and `doctor`

A move, and a `--dry-run`, need a config that names the machines allowed to receive a session. `hc-teleport init` writes it: an interactive wizard that asks one y/N question for the core's own machine (shown by the name `hc server status` reports, stored as `local`), then one for each machine of `hc machine ls`, in that order. On a rerun the current answers are the defaults, so Enter keeps them; any other answer than y, yes, n, no or Enter asks again. Answering no to every question writes an empty list, and nothing may then receive a session. `init` stores decisions only and needs a terminal on stdin: without one it refuses `not_interactive` and writes nothing.

The config is `$XDG_CONFIG_HOME/hc-teleport/config.json` when `XDG_CONFIG_HOME` is an absolute path, else `$HOME/.config/hc-teleport/config.json`. It is written through a temporary file and a rename, and looks like this:

```json
{ "v": 1, "allowed": ["local", "base-digital"] }
```

`hc-teleport doctor` prints one line per allowed machine and writes nothing: `ok` with the Claude Code version when `hc` reaches the machine and `claude --version` runs there, `unreachable` with the reason when `hc exec` fails, `claude missing` when `claude --version` exits non-zero, and `not in hc machine ls` for a config machine `hc` no longer lists. `local` is checked on the core's machine, without `--on`. It exits 0 when every line is ok, else 1, and 3 (`not_initialized`) without a config. With `--json` it prints `{"machines":[{"name":"...","status":"...","detail":"..."}]}`.

`<machine>` in a move is checked against the config: a name equal to the core's name means `local`, unless `hc machine ls` lists a machine of that name.

`--timeout` is how long the move waits for the resumed session to be idle on the destination: a whole number of seconds from 1 to 600, 120 by default. Run it on the Mac. `<terminal>` is an `hc` terminal address: `t6c` for a terminal on the Mac, `dev-home/t6c` for one on the `hc` machine `dev-home`. `<machine>` is the destination: a name from `hc machine ls`, or `local` for the Mac, which `hc machine ls` never lists. A move has the Mac at one end unless the two machines share the session's disk (see the relocation below), so `hc-teleport dev-home/t6c local` is the way back: it reads the session on `dev-home` through `hc`, carries git and the transcript to the Mac, resumes the session in a new terminal on the Mac, then stops the terminal on `dev-home` and parks its checkout there; with `--dry-run` it only plans that. It needs Node 26 (`.nvmrc`) and `hc` on the PATH.

The session is found from the terminal itself. For Claude Code, the config directory comes from `<launcher> --where` (a plain `claude` uses `~/.claude`), and `<configDir>/sessions/<foreground pid>.json` names the session id. That file is internal to Claude Code and undocumented, so an unknown shape refuses.

A terminal that carries a herdr-wake `wake` label (a `herdr-wake shell` terminal on dev-home) is found from that label instead: its `env.CLAUDE_CONFIG_DIR` is the config directory, `agent_proc.pid` must be the foreground process, and the registry file must name the label's `session_id`; the launcher's `--where` is never run. The foreground is recognized as Claude Code by the basename `claude`, so `/home/me/.local/bin/claude` counts.

For a labelled terminal the resume command is `env CLAUDE_CONFIG_DIR=<dir> <bin> <allowed flags> --resume <id>`, taking the directory, `bin` and `flags` from the label (a wrapper such as `claude-klock` only exports the directory, so the wrapper name is lost); the preflight runs the program after `env` and its `NAME=value` words on the destination. Otherwise the resume command is the terminal's executable (for example `claude-klock`), then its allowed flags in their order, then `--resume <id>`. Positional arguments and session selectors (`--resume`/`-r`, `--continue`/`-c`, `--session-id`, `--fork-session`) are dropped. Allowed flags:

- with one value: `--model`, `--permission-mode`, `--effort`, `--fallback-model`, `--agent`, `--name`/`-n` (`--flag value` and `--flag=value`);
- with none: `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`, `--brief`, `--chrome`, `--no-chrome`, `--verbose`.

Any other flag refuses and is named.

## Output

Without `--json` the plan (`--dry-run`) or a line naming the destination terminal (a move) prints readably on stdout. With `--json` stdout holds exactly one JSON object; messages always go to stderr. This is the `--dry-run` output:

```json
{
  "terminal": "t6c",
  "machine": "dev-home",
  "cwd": "/Volumes/Developer/www/klock-tecnologia/hc-teleport",
  "session": { "id": "09e11b42-f5c1-4c38-99f1-dd1d8b00355c", "configDir": "/Users/me/.claude-klock", "version": "2.1.321" },
  "transcript": { "file": "/Users/me/.claude-klock/projects/-Volumes-...-hc-teleport/09e11b42-....jsonl", "dir": null },
  "resume": { "argv": ["claude-klock", "--model", "opus", "--resume", "09e11b42-f5c1-4c38-99f1-dd1d8b00355c"] },
  "relocate": false
}
```

`relocate` is `true` when the source and the destination machine both print the same `<device>:<inode>` for `stat -c %d:%i -- <transcript file>`: the two see one disk. The plain plan prints it as a `relocate` line.

### Relocation

A move whose plan says `relocate: true` copies nothing. It runs the same preflight first (a refusal changes nothing), then checks the source terminal is still idle (`source_not_idle` refuses, nothing done) and stops it. When the source is on the core (`local`, no `--on`) it runs `herdr-wake forget <tN>` there to remove its record; herdr-wake keeps one record folder holding only the core's terminals and terminal ids repeat across machines, so for a source on an `hc` machine nothing runs. The outcome's `forget` is `done`, `failed` (the move still succeeds, with a stderr line saying the session may be resumed twice after a reboot and naming `herdr-wake forget <tN>`) or `not_recorded` (a source on an `hc` machine, no stderr line). It then resumes the session on the destination and waits until it is idle there. It never carries git or the transcript and never parks. Two machines on one disk may move directly, without the Mac at either end; on different disks the Mac stays at one end (`mac_not_an_end`). When the destination does not come up, its terminal is stopped and the session resumes on the source machine again (`rolled_back`, exit 4, with `resumedAt` naming the new source terminal); when that also fails, or the destination terminal cannot be stopped, the outcome is `rollback_failed` (exit 1), `left` says the session runs nowhere or which terminal may still run, and gives the machine and the resume command. A relocated move prints `{ "moved": { ..., "relocated": true, "forget": "done" } }` with no `parked`. `source_not_stopped` (exit 1) means the source terminal could not be stopped and nothing was resumed elsewhere.

A session on an `hc` machine adds `"source": "dev-home"` (the machine it runs on) to this object; a session on the Mac prints without it, and `machine` is always the destination. The config directory, registry and transcript paths are read on the source. `session.version` is left out when the registry does not carry it. `transcript.dir` is the sibling `<sessionId>/` directory (it holds `subagents/`), or `null` when the session has none.

A move that succeeds prints, under `--json`:

```json
{ "moved": { "terminal": "t6c", "machine": "dev-home", "session": "09e11b42-f5c1-4c38-99f1-dd1d8b00355c", "destination": "dev-home/t7", "parked": { "parked": true } } }
```

`parked` is `{"parked":false,"reason":"..."}` when the source checkout was left as it is (it changed since the carry); the move still succeeded and the reason is on stderr. When parked, the source checkout is reset to HEAD (ignored files stay) and its uncommitted changes are kept under those refs.

A refusal prints `{"refused":{"reason":"...","detail":"..."}}` on stdout under `--json` and a readable line on stderr otherwise. A rolled back move prints `{"rolledBack":{"reason":"...","detail":"..."}}`. Any other failure prints `{"error":{"reason":"...","detail":"..."}}`: `hc_failed` when `hc` failed, timed out or printed output that is not the expected JSON, `command_failed` when a local program such as git failed before anything was written, `unexpected_error` (a failure none of the above names, with its message; before the first write nothing changed), `rollback_failed` (also with `cause` and a `left` list naming the destination terminal, files and refs still there) and `source_running` (also with `destination`).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | The session was moved (or, with `--dry-run`, the plan was printed). A source checkout that could not be parked still exits 0. |
| 1 | `doctor` found a machine that is not ok; `hc` failed, timed out or printed output that is not the expected JSON (`hc_failed`); a local program failed before anything was written (`command_failed`); an unexpected error before anything was written (`unexpected_error`); the rollback itself failed and the error names what is left (`rollback_failed`; a carried move names what is left on the destination, a relocation names what it could not restore: that the session runs nowhere or which destination terminal may still run); a relocation could not stop its source terminal, so nothing was resumed elsewhere (`source_not_stopped`); the destination is confirmed but the source terminal could not be stopped, so both run and nothing is rolled back (`source_running`); or the input ended before every `init` question was answered, and the config is unchanged (`input_ended`). |
| 2 | Wrong invocation: missing or extra arguments, an unknown option, or a `--timeout` that is not a whole number from 1 to 600; a `--wait` that is not a whole number from 1 to 3600, or one without `--detach`; `--detach` with `--dry-run` or a terminal; `--detach` outside an hc terminal (`not_in_a_terminal`). |
| 3 | Refused, nothing changed on either side (also `doctor` without a config, and `init` without a terminal). |
| 4 | Rolled back: the destination did not come up, or a step after the first write failed. The destination is as before; a carried move never touched the source, and a relocation resumed the session on the source again (the message names its new terminal). |

## Refusal reasons (exit 3)

| Reason | When |
|---|---|
| `not_initialized` | There is no config file; the detail names `hc-teleport init` and the path. |
| `config_unreadable` | The config is not JSON, has a `v` other than 1, or has an `allowed` that is not a list of non-empty strings; the detail names the path. |
| `machine_not_allowed` | The destination (after the core's name is read as `local`) is not in the config's `allowed` list. |
| `not_interactive` | `hc-teleport init` ran with stdin not a terminal. |
| `core_unreachable` | `--detach` ran in a terminal on an hc machine that `hc machine ls` does not list, so the runner could not reach the session. |
| `move_in_progress` | hc refuses the runner's name because an earlier detached move of the session still has its runner alive; the name is the session's lock and the runner's end frees it. |
| `state_unreadable` | The session's state file is malformed; remove it if no detached move runs. |
| `terminal_not_running` | The terminal is not live or has exited, or the address is not `tN` or `<machine>/tN`. |
| `not_idle` | The terminal's status state is not `done` or `idle`, or it has no status. |
| `unknown_machine` | The source or the destination machine is not in `hc machine ls`. |
| `machine_unreachable` | The source or the destination machine is listed but not connected. |
| `same_machine` | The terminal runs on the machine it would move to (`t6c local`, `dev-home/t6c dev-home`). |
| `mac_not_an_end` | Neither end is the Mac (`dev-home/t6c vps`) and the two machines do not share the session's disk; otherwise a move goes between the Mac and one `hc` machine. |
| `local_name_taken` | `hc machine ls` lists a machine named `local`, the name hc-teleport uses for the Mac; rename it with `hc machine rename`. |
| `not_claude` | The name of the terminal's foreground program (its basename) is not `claude`. |
| `session_label_unreadable` | The `wake` label is not JSON, has a `v` other than 1, an `agent` other than `claude`, no `bin`, `session_id` or `agent_proc.pid`, no absolute `env.CLAUDE_CONFIG_DIR`, or a `bin` that is not an absolute path to the foreground program (the foreground may show the bare program name a wrapper leaves behind). |
| `config_dir_unknown` | `<launcher> --where` failed or did not print an absolute path. |
| `no_session` | The pid registry file does not exist. |
| `session_registry_unreadable` | The registry file is malformed or lacks `sessionId` (a UUID), `pid` or `cwd`. |
| `session_unreadable` | The source machine cannot read the session's subagent folder (a permission error, or a failed `find` on a machine); the detail names the folder. |
| `session_registry_stale` | The registry's pid or cwd differs from the terminal's foreground process, or the `wake` label's `agent_proc.pid` is not the foreground's. |
| `session_mismatch` | The `wake` label and the pid registry name different sessions. |
| `flag_not_allowed` | The source argv carries a flag outside the allowed list; the detail names it. |
| `flag_missing_value` | An allowed flag that needs a value is the last token; the detail names it. |

The move adds these refusals, each exit 3 with nothing changed (a transcript refusal is raised after the git carry was written, which is then undone first):

| Reason | When |
|---|---|
| `dest_executable_missing`, `dest_profile_missing`, `dest_agent_older`, `dest_agent_version_unknown` | The destination cannot run the resume command, lacks the agent's profile directory, or has an older or unreadable agent version. |
| `dest_repo_missing` | The destination has no git work tree at the session folder's repository, or its top level differs from the source's. |
| `source_detached`, `source_no_commit` | The source checkout is on a detached HEAD or has no commit. |
| `machine_without_ssh` | The destination is not reachable over ssh from this machine, which the git carry needs. |
| `dest_dirty` | The destination checkout has uncommitted changes. |
| `dest_diverged` | The destination's branch holds commits the source's does not. |
| `transcript_outside_config`, `transcript_not_text`, `transcript_line_too_long`, `transcript_missing` | The transcript cannot be carried: it lies outside the config directory, is not text, has a line over the carry's limit, or does not exist. |

## Rollback reasons (exit 4)

A rolled back move puts the destination back as it was before the move: it ends the destination terminal if one was started, removes the transcript files it placed (restoring any it replaced), then undoes the git carry and deletes the refs. Each step is tried even if an earlier one failed; if any step failed the exit is 1 (`rollback_failed`) and names what is left.

| Reason | When |
|---|---|
| `git_carry_failed` | A destination step of the git carry failed after its push; the detail names the step. |
| `hc_failed` | `hc` failed while starting, waiting for or reading the destination terminal, or while carrying the transcript. |
| `destination_blocked` | The destination terminal reports `blocked`. |
| `destination_error` | The destination terminal reports `error`. |
| `destination_exited` | The destination terminal ended before it was idle; the detail has the exit code or signal. |
| `destination_timeout` | The destination terminal was not idle before the `--timeout` deadline. |
| `source_not_idle` | The destination is confirmed, but the source terminal, read again right before it would be stopped, is no longer live or no longer `idle` or `done`; the source is left running and the detail names the state read. |
| `unexpected_error` | Any other error after the first write, such as a file permission error while carrying the transcript; the detail is its message. |
| `not_resumed` | The terminal is idle but the destination does not confirm the session; the detail is the check's reason: `terminal_not_running`, `not_claude`, `no_session`, `session_registry_unreadable`, `session_registry_stale` or `session_mismatch`. |

## Plugins

A `/hc-teleport <machine>` command and an `hc-teleport` skill tell the agent to run `hc-teleport <machine> --detach` once and end its turn, so the session moves once it is idle. They need the CLI installed. They run no MCP server. All four plugins ship now, but the CLI moves only Claude Code sessions today: for any other agent it refuses with `not_claude`, and the agent tells the person its sessions cannot move yet.

- Claude Code: `/plugin marketplace add ejklock/hc-teleport`, then `/plugin install hc-teleport@hc-teleport`.
- Codex: `codex plugin marketplace add ejklock/hc-teleport`, then `codex plugin add hc-teleport@hc-teleport`.
- OpenCode and Pi: the npm package `hc-teleport-agent` (`packages/hc-teleport-agent`); its README has the setup for each.

Each plugin and the package carry this CLI's version.

## Development

```
npm test            # vitest; add a name to filter, e.g. npm test -- resume-argv
npm run typecheck
npm run build
npm run lint        # eslint with the typed config
npm run coverage    # vitest with coverage into coverage/lcov.info, then the se-gates coverage receipt
```

Tests build their own temporary HOME and put a fake `hc` and a fake launcher first on the PATH; they never touch the real `hc` or `~/.claude*`.

## Tests

`npm test` runs the unit and CLI suites against fakes. It needs no Docker and finishes in seconds.

`npm run test:bed` runs the container bed. It needs a running Docker daemon with `docker compose` and `ssh-keygen`, and fails with a message naming Docker when the daemon is down. The bed builds `hc` 0.1.19 from source on the first run (several minutes), then reuses the image. It starts two throwaway containers, `source` (plays the Mac, home `/Users/mac`) and `dest` (plays dev-home, home `/home/box`), adds `dest` to `source` as an `hc` machine over SSH with a key pair generated per run under `$TMPDIR`, and removes the containers, network, volumes and key afterwards. It touches nothing else on the host. A bed that cannot start fails with the command that failed; the whole start has a 12 minute budget, shorter than the 15 minute hook timeout, so a slow start reports the step that ran out of time instead of a bare test timeout. `docker compose up --wait` is bounded by compose's own `--wait-timeout`, computed from what is left of the budget; every bed process is also killed with SIGKILL when its step time is up, since compose ignores SIGTERM while it waits. Compose sometimes exits 0 when that wait timeout runs out, so after `up` returns the bed also reads both services' health and fails the start naming `up` when either is not healthy. A failed start tears itself down and checks for leftovers even when the first teardown failed.
