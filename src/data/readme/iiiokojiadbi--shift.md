# Shift

[![npm](https://img.shields.io/npm/v/@iiiokojiadbi/shift)](https://www.npmjs.com/package/@iiiokojiadbi/shift)
[![license](https://img.shields.io/npm/l/@iiiokojiadbi/shift)](LICENSE)

Shift lets a coding agent carry a long project across context resets. The agent keeps a shared board, writes itself a letter at a stage boundary and asks its host to start a fresh stretch. It gets the board, project knowledge and its letter back, then continues from where it stopped or waits for you.

## Install

### Codex

Install Bun and make it available on PATH. Subscribe to the stable marketplace:

```sh
codex plugin marketplace add iiiokojiadbi/shift --ref codex-stable
codex plugin add shift@shift
```

Start Codex, review and trust the Shift hooks in `/hooks`, then open a new thread. Agent-initiated shifts use the local app server. If its daemon is stopped, run `codex app-server daemon start` and reopen the client.

To update, close clients using Shift, run `codex plugin marketplace upgrade shift`, then reopen with `codex resume` and review changed hooks. If your marketplace still pins a release tag, first set `ref = "codex-stable"` under `[marketplaces.shift]` in your Codex `config.toml`.

### Claude Code

```sh
claude plugin marketplace add iiiokojiadbi/claude-plugins
claude plugin install shift@iiiokojiadbi
```

Restart the session after installing or updating.

### pi

```sh
pi install npm:@iiiokojiadbi/shift
```

### opencode

```sh
opencode plugin add @iiiokojiadbi/shift
```

pi and opencode share an npm package. Keep optional dependencies enabled so npm installs the runtime for your platform. Builds are available for Linux and macOS on x64 and arm64, and Windows on x64. [Platform details](docs/development.md#commands)

## Start in a project

Open a session in the project and give the agent work. Shift creates commented settings in `.shift/settings.toml` and shows the agent the documentation map and record instructions. The agent maintains its board and chooses when to shift. A final reminder tells it when the current stretch should end.

| Action | Codex | Other hosts |
|---|---|---|
| Ask for a shift now | `$shift:shift` | `/shift` |
| Pick up a saved shift in a fresh session | `$shift:unshift` | `/unshift` |
| Find the project task command | `$shift:tasks` | `/shift-tasks` |
| Show Shift's estimated context size | `$shift:sizes` | Ask the agent to call `shift_sizes` |

In the Codex message box, type `$shift` and select an action. The aliases `//shift`, `//unshift`, `//shift-tasks` and `//shift_sizes` also work. You can append a request to a shift or restore action. A letter from a shift that is waiting for you comes with your next message.

## What carries forward

- The **board** gives the stage goals and current shared focus. The current **letter** gives the agent's next step, what remains to verify and what to hold.
- The **documentation map** points to project docs and local lessons. Standing **owner decisions** and the **glossary** are available when the session starts and after a shift.
- By default, the agent receives the current letter and nine earlier descriptions. It can read the full records of any retained shift by ID. Change `[history] full` and `brief` for a different window.

Current internal records are Markdown in `.shift/history.db`, alongside the saved shifts. Shift keeps this directory private by default. The agent can replace an exact passage or check out a temporary Markdown draft and apply it against its revision. Project documentation stays in its own files. [Records and settings](docs/records.md)

## Optional task tracker

The next step belongs in the letter. When work needs its own status, dependencies or discussion, prepare the built-in Beads tracker with `shift_setup(section="tasks")` or the task command above. From the project root, run:

```sh
./.shift/bin/shift-task prime
```

Use `./.shift/bin/shift-task.exe` on Windows. The command prints Shift's task conventions followed by the bundled Beads workflow. Tasks live separately under `.shift/beads/`. When a letter continues a tracked issue, include its ID.

## Upgrade an existing project

Startup upgrades the settings file. If the project already has loose Shift records or an old task directory, ask the agent to open `shift_guide(section="migration")` before cleaning up. The guide covers backup, validated import and how to verify the new records before archiving the originals. [Upgrade guide](docs/records.md#upgrading-an-existing-project)

## Documentation

- Read about the work loop and what the agent receives in [Concept](docs/concept.md).
- Find record formats, settings and retention in [Records](docs/records.md).
- See adapter behavior and installation requirements in [Adapters](docs/adapters.md).
- Start contributing with the [repository guide](AGENTS.md) and [development commands](docs/development.md).
- Read changes by version in the [changelog](CHANGELOG.md).

[MIT License](LICENSE)
