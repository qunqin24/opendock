# Kata Plugin

Kata work tracking for oh-my-pi, pi, OpenCode and Claude Code. Todo plans, and the delegations that name their items or a ticket, become Kata issues with attributed ownership and evidence for completion. Kata validates each close; automatic session parents close after their children finish.

| Plugin | Tracks |
| --- | --- |
| [oh-my-pi](docs/reference/oh-my-pi.md) | Todo plans and the task subagents that work them |
| [pi](docs/reference/pi.md) | Todo plans and child Pi processes |
| [OpenCode](docs/reference/opencode.md) | Todo plans, as one whole-list `todowrite` tool checked against Kata, and the `subagent` delegates that work them |
| [Claude Code](docs/reference/claude-code.md) | Todo plans, as one `todo` tool in place of the task tools, and the agents that work them: `Agent` subagents, Workflow agents and teammates |

Oh-my-pi:

https://github.com/user-attachments/assets/8681b30a-9241-4a27-8deb-b3f2c17a6f85

```sh
omp plugin marketplace add Dangerboi/kata-plugin
omp plugin install kata@kata-plugin
```

Or from npm, as listed on [omp packages](https://omppackages.com): `omp plugin install @dangerboi/kata-omp`. Use one install or the other; see the [install guide](docs/how-to/install.md#oh-my-pi).

Then pick Kata under `/settings` → Tools → Todos → Todo Backend (`todo.backend: kata` in omp's config); the plugin needs oh-my-pi 19.1.1 or later. omp's own `todo` keeps running, and the plugin mirrors each change to its list into Kata in every folder. `todo done` is refused while the task's Kata issue is open: the agent closes it with `kata close` and its evidence first. A repo with no Kata project plans in the project named by `KATA_DEFAULT_PROJECT` (labeled with the repo), or else in its inferred project, which the plugin registers in the daemon without writing files into the repo.

Kata inbox requests reach a session when `KATA_INBOX_USER` names a session address, `<actor>/<name>`. A bare `<actor>` is that person's own inbox, so sessions don't read it. On OMP the main session gets each new request from that actor live, even while idle or mid-run (`KATA_OMP_LIVE_INBOX=0` turns it off); Pi reads per turn. On OMP each delegate reads its own inbox, `<actor>/<teammate>`, when `KATA_INBOX_USER` is a session address.

On every host a `write`, `edit`, patch or `git commit` that would add a Kata ref the session works is refused, so the model describes the behaviour instead; `KATA_REF_GUARD=off` turns the ref guard off. On OMP, without `KATA_REF`, a ticket the lead claims or names with `/todo ref` gets session attention.

Pi:

https://github.com/user-attachments/assets/fec1bb87-c4e1-46ad-b2ed-3ed5ff8cd2b6

```sh
pi install npm:@dangerboi/kata-pi
# or from Git, or a local clone:
pi install git:github.com/Dangerboi/kata-plugin
pi install ./kata-plugin/plugins/pi
```

OpenCode 2.2.7 or later:

https://github.com/user-attachments/assets/740ec27e-1edb-479b-bd41-f00073ff748d

```json
{ "plugins": [{ "package": "@dangerboi/kata-opencode", "options": {} }] }
```

Add that to `opencode.json`, then run `kata agent-hook install opencode` for Kata's contract, inbox and attention. To load a checkout, put the absolute path of `plugins/opencode` in `plugins` instead. The TUI sidebar needs nothing more; set `experimental.todo: true` only for the desktop composer pill. See the [install guide](docs/how-to/install.md#opencode) for plugin options.

Claude Code 2.1.332 (the mod API is early access):

https://github.com/user-attachments/assets/250e6602-7761-4e98-b266-ad2356caae85

```
/plugin install kata-cc --marketplace Dangerboi/kata-plugin
```

Or `claude plugin marketplace add Dangerboi/kata-plugin` and `claude plugin install kata-cc@kata-plugin` from a shell. There is no npm package and no restart. Run `kata agent-hook install claude --attention` for Kata's contract, inbox and attention; the plugin adds only the plan unless its `contract` option is on. Options (`liveInbox`, `contract`, `refGuard`, `kataExecutable`, `debugFile`) are in the [reference](docs/reference/claude-code.md#settings), and the live inbox turns off with `KATA_CLAUDE_LIVE_INBOX=0`. A session resumed with `claude --resume` takes up its saved plan; `/branch` forks share their source's plan (not under a managed-settings guard), while `claude --resume <id> --fork-session` starts a plan of its own. See the [install guide](docs/how-to/install.md#claude-code) and the [limits](docs/explanation/limits.md#claude-code).

Requires Kata 0.23.0, plus the selected harness. Plan tools report incompatible installations; see [runtime compatibility](docs/how-to/install.md#runtime-compatibility). The omp plugin delegates session attention to `kata agent-hook attention-native`. Tested host versions are oh-my-pi 19.2.1, pi 1.6.1, OpenCode 2.4.2 and Claude Code 2.1.332. Bun and Node are needed for development.

Start with the [first session tutorial](docs/tutorials/first-session.md), [installation guide](docs/how-to/install.md), or [development guide](docs/development.md). See [completion rules](docs/reference/closing-rules.md) and [limits](docs/explanation/limits.md) before adopting automatic closure.

Originally created by [salmonumbrella](https://github.com/salmonumbrella).
