# Kata Plugin

Kata work tracking for oh-my-pi, pi and OpenCode. Todo plans, and the delegations that work their items or name a ticket, become Kata issues with attributed ownership and evidence for completion. Kata validates each close; automatic session parents close after their children finish.

| Plugin | Tracks |
| --- | --- |
| [oh-my-pi](docs/reference/oh-my-pi.md) | Todo plans and the task subagents that work them |
| [pi](docs/reference/pi.md) | Todo plans and child Pi processes |
| [OpenCode](docs/reference/opencode.md) | Todo plans, as one whole-list `todowrite` tool checked against Kata |

Oh-my-pi:

https://github.com/user-attachments/assets/8681b30a-9241-4a27-8deb-b3f2c17a6f85

```sh
omp plugin marketplace add Dangerboi/kata-plugin
omp plugin install kata@kata-plugin
```

That is the whole setup. The plugin replaces omp's built-in `todo` with Kata in every folder, with no configuration. A repo with no Kata project plans in the project named by `KATA_DEFAULT_PROJECT` (labeled with the repo), or else in its inferred project, which the plugin registers in the daemon without writing files into the repo.

Kata inbox requests reach a session when `KATA_INBOX_USER` names a session address, `<actor>/<name>`. A bare `<actor>` is that person's own inbox, so sessions don't read it. On OMP the main session gets each new request from that actor live, even while idle or mid-run (`KATA_OMP_LIVE_INBOX=0` turns it off); Pi reads per turn.

Pi:

https://github.com/user-attachments/assets/fec1bb87-c4e1-46ad-b2ed-3ed5ff8cd2b6

```sh
pi install npm:@dangerboi/kata-pi
# or from Git, or a local clone:
pi install git:github.com/Dangerboi/kata-plugin
pi install ./kata-plugin/plugins/pi
```

OpenCode 2.2.7 or later:

```json
{ "plugins": [{ "package": "@dangerboi/kata-opencode", "options": {} }] }
```

Add that to `opencode.json`, then run `kata agent-hook install opencode` for Kata's contract, inbox and attention. To load a checkout, put the absolute path of `plugins/opencode` in `plugins` instead. The TUI sidebar needs nothing more; set `experimental.todo: true` only for the desktop composer pill. See the [install guide](docs/how-to/install.md#opencode) for plugin options.

Requires Kata 0.23.0, plus the selected harness. Plan tools report incompatible installations; see [runtime compatibility](docs/how-to/install.md#runtime-compatibility). The omp plugin delegates session attention to `kata agent-hook attention-native`. Tested host versions are oh-my-pi 18.18.1, pi 1.5.0 and OpenCode 2.2.7. Bun and Node are needed for development.

Start with the [first session tutorial](docs/tutorials/first-session.md), [installation guide](docs/how-to/install.md), or [development guide](docs/development.md). See [completion rules](docs/reference/closing-rules.md) and [limits](docs/explanation/limits.md) before adopting automatic closure.

Claude Code is no longer supported here. Use Kata's own hook instead: `kata agent-hook install claude --attention`. Existing Claude installs of this plugin stay on adapter 0.2.0.

Originally created by [salmonumbrella](https://github.com/salmonumbrella).
