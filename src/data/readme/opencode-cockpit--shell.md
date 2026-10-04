# opencode-cockpit

[![CI](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml/badge.svg)](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-cockpit?color=%23cb3837&label=opencode-cockpit)](https://www.npmjs.com/package/opencode-cockpit)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/shell?color=%23cb3837&label=%40opencode-cockpit%2Fshell)](https://www.npmjs.com/package/@opencode-cockpit/shell)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/status?color=%23cb3837&label=%40opencode-cockpit%2Fstatus)](https://www.npmjs.com/package/@opencode-cockpit/status)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/review?color=%23cb3837&label=%40opencode-cockpit%2Freview)](https://www.npmjs.com/package/@opencode-cockpit/review)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/updater?color=%23cb3837&label=%40opencode-cockpit%2Fupdater)](https://www.npmjs.com/package/@opencode-cockpit/updater)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/subagents?color=%23cb3837&label=%40opencode-cockpit%2Fsubagents)](https://www.npmjs.com/package/@opencode-cockpit/subagents)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/trail?color=%23cb3837&label=%40opencode-cockpit%2Ftrail)](https://www.npmjs.com/package/@opencode-cockpit/trail)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/trust?color=%23cb3837&label=%40opencode-cockpit%2Ftrust)](https://www.npmjs.com/package/@opencode-cockpit/trust)
[![Docs](https://img.shields.io/badge/docs-codestz.github.io-9d7cd8)](https://codestz.github.io/opencode-cockpit/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Give [OpenCode](https://opencode.ai) the instruments it does not ship with.**

**[Documentation →](https://codestz.github.io/opencode-cockpit/)**  ·  [Install](https://codestz.github.io/opencode-cockpit/start/install/)  ·  [Shell](https://codestz.github.io/opencode-cockpit/shell/overview/)  ·  [Review](https://codestz.github.io/opencode-cockpit/review/overview/)  ·  [Statusline](https://codestz.github.io/opencode-cockpit/status/overview/)  ·  [Updater](https://codestz.github.io/opencode-cockpit/updater/overview/)  ·  [Subagents](https://codestz.github.io/opencode-cockpit/subagents/overview/)  ·  [Trail](https://codestz.github.io/opencode-cockpit/trail/overview/)  ·  [Trust](https://codestz.github.io/opencode-cockpit/trust/overview/)  ·  [Configuration](#configuration)  ·  [Changelog](CHANGELOG.md)

A tool call has to finish. A dev server does not, and neither does the context window filling up
behind you. Cockpit is the instrument panel: things your agent can use, and things that tell you
what it is doing.

```sh
opencode plugin opencode-cockpit@0.9.0 --global --force
```

---

### 🖥️  Shell — terminals that keep running

Your agent starts a dev server and the tool call blocks until you kill it. It backgrounds one
instead and loses the output. **Shell** gives it terminals with a real PTY that outlive the turn,
wait for a port or a pattern, and hand back the part that matters — and gives you a panel where
every one of them reports its own health.

![The shells panel: a dev server running under the conversation](media/dock.gif)

*A real recording. Every demo here is generated from a live OpenCode session by
[`bun run record`](CONTRIBUTING.md) and re-run on release, so none of them can drift from what
ships.*

**8 agent tools · 34 watch presets · [docs](https://codestz.github.io/opencode-cockpit/shell/overview/) · [`@opencode-cockpit/shell`](packages/shell)**

---

### 🔍  Review — a pull request in the terminal

Reviewing what your agent wrote means reading a diff in a chat log and describing your objection in
prose. **Review** gives you the diff where the work happened, comments on the lines they are about,
and an agent that can read them, answer them and mark them resolved — which a chat message cannot do.

Comments live on the branch rather than in the chat, so they outlive the conversation. `s` hands them
over; the agent fetches them with `review_list`, changes the code, and answers with
`review_reply resolved=true`. That resolve is **checked against the file**: a thread remembers the
lines it was written against, so "done" over an untouched file is recorded as a reply and the thread
stays open for you.

**3 agent tools · 12 filetypes · [docs](https://codestz.github.io/opencode-cockpit/review/overview/) · [`@opencode-cockpit/review`](packages/review)**

---

### 📊  Statusline — what the session is costing you

How full is the context? Where did the tokens go? What has changed? OpenCode answers the first in a
corner and the rest not at all. **Statusline** answers them where you are already looking.

With no configuration it is a table at the top of the sidebar — the window as one bar, the tokens
broken into named rows, a proxy's budget when one writes it, and the branch's diff:

```
Status
████████████████
tokens 85.2k · 43%
in     265 · 0%
out    60 · 0%
cache  84.9k · 100%
──────────────
git    5f +312 -48
```

Or a line under the prompt, `{ "status": { "sidebar": false } }`:

![The statusline under an OpenCode conversation: a context bar at 40%, the token total with its cache, input and output parts, what is uncommitted, elapsed time and todo progress](media/statusline.png)

*Every part is a segment you can reshape, recolour or remove, or write yourself in TypeScript. Your
Claude Code statusline script runs here unchanged, colours and all. `/status-setup` has the agent
change it with you.*

**23 segments · 2 surfaces · [docs](https://codestz.github.io/opencode-cockpit/status/overview/) · [`@opencode-cockpit/status`](packages/status)**

---

### 🔄  Updater — every plugin, and what it is really running

OpenCode installs a plugin once and never resolves its spec again, so `@latest` quietly means *the
release that was newest the day you installed it* — and nothing anywhere says which one that was.
**Updater** lists every plugin you have, what is running beside what your config says and what is
published, and updates the ones you pick. It pins an exact version through OpenCode's own
`opencode plugin`, clears the stale cache, and reads every file back before calling it done.

![The updater in OpenCode: a plugin frozen behind @latest at 1.2.3 and one pinned behind, reviewed, updated, and both confirmed on disk](media/updater.gif)

`/plugins-update` inside OpenCode, or `npx opencode-cockpit@latest update` from a shell — which
works whatever version you are stuck on, because it comes from npm rather than from the copy that
cannot update itself.

**Every plugin, not just this one · [docs](https://codestz.github.io/opencode-cockpit/updater/overview/) · [`@opencode-cockpit/updater`](packages/updater)**

---

### 🛰️  Subagents — what they are doing, while they do it

When the main agent hands work to a subagent you get one line in the chat and nothing about what it
is doing. **Subagents** puts every subagent in the sidebar with what it is doing right now — `grep
"session" src/auth/**  51s` — and a click opens its whole run in a pane: the task, its thinking, every
shell command and file change as a box with its output, and the answer as it is written.

Then it makes them reusable. Ask the main agent for a follow-up on a subagent's work and it continues
*that* subagent — which already read the code — instead of starting a new one. Press `m` to message a
subagent yourself: the main agent is told what it answered, without a turn being spent on it. `x`
stops one (and tells the main agent why), `b` moves a blocking one to the background. The main agent
can read any of them in full with `subagents_read`, and wait on the ones in the background with
`subagents_wait`.

![A subagent at work beside the conversation: its run in a pane, a question put to it from the pane, and the exchange added to the main conversation](media/subagents.gif)

**Sidebar + pane · 3 agent tools · follow-ups keep context · OpenCode 1 and 2 · [docs](https://codestz.github.io/opencode-cockpit/subagents/overview/) · [`@opencode-cockpit/subagents`](packages/subagents)**

---

### 🧭  Trail — what a conversation made

A conversation opens a pull request, comments on a ticket, publishes a page — and a day later the
links are somewhere in a scrolled-away chat. **Trail** keeps them: the agent records what it creates
or changes outside the repository with `trail_add`, and Trail lists it in the sidebar, grouped by
the ticket it was for, one click from the page. And the other way round: `/trail` across every
conversation in the project says which one opened PR #33, and `g` goes back into it.

![Trail at work: the agent opens a PR for COM-1736 and records it on its own, the sidebar groups it under the ticket, another conversation asks what was shipped, and g jumps back](media/trail.gif)

```
Trail                                    9

COM-1801
  a1b2c3d  Bump the pr…          12m ago
  ENG-42   Retry the s…  Linear  15m ago ↗
COM-1736   Bundle desy…    Jira   2h ago ↗
  PR #33   0.8: Trust,…  GitHub   1h ago ↗
  PR #12   Landing: Tr…  GitHub   2h ago ↗
+ 4 more · /trail
```

No setup: no account, no token, no list of tools. The agent already knows what it just did with
whatever it uses — `gh`, an MCP server, a company CLI — so the agent writes the trail and Trail keeps
it. When something it ran printed a PR link it never recorded, its next request says so, as a
choice; nothing is added without the agent or you. To add one yourself, `/link`, then paste the
link (and a note); `m` copies the trail as markdown for a PR description or a standup.

**Sidebar + `/trail` · 2 agent tools · no setup · OpenCode 1 and 2 · [docs](https://codestz.github.io/opencode-cockpit/trail/overview/) · [`@opencode-cockpit/trail`](packages/trail)**

---

### 🔐  Trust — permissions that learn

`"bash": "ask"` means approving `git status` for the hundredth time; OpenCode's own "Always" means
approving `docker compose -p prod down -v` because you once approved `docker compose -p cockpit up`.
**Trust** sits between: approve the *exact same* command three times in a row and it answers for
you — and records every answer, in the ledger and the log, and in the sidebar if you turn it on. A reject resets the count, `rm` and `git push` and
`--force` cost eight approvals instead of three, and a rule you wrote to be asked (`"git push *":
"ask"`) is never answered. `/trust` opens on what it did for you and what it is close to trusting;
`l` opens the ledger, every rule as a tree of families (`git -C x status` is `git status`) with a
card that says exactly what a rule answers, its history, and how to stop it. `w` trusts a whole
family, but only when you press it.

![Trust's activity screen: five prompts answered today with the reason for each, commands one approval away from being trusted with their meters, a dangerous one at 5 of 8, and a warning about OpenCode's own broad "always" approvals](media/trust-activity.png)

![Trust's ledger: a tree of command families on the left, and a card for the selected command with exactly what it answers, what still asks, its approval history and the buttons to revoke it or trust its family](media/trust-ledger.png)

*Drawn by `bunx @opencode-cockpit/trust preview` from a sample project, the same rows the dialog draws.*

**Sidebar + ledger · exact commands, per agent · OpenCode 1 and 2 · [docs](https://codestz.github.io/opencode-cockpit/trust/overview/) · [`@opencode-cockpit/trust`](packages/trust)**

---

Each bay is its own npm package with a switch in config. They share the daemon, the config file and
the keys, so the second costs nothing and moving between them changes nothing you already set up.

## Shell, by example

**"Start the dev server and wait until it's actually ready."**
The agent starts it in a real terminal and blocks on the port opening — not a guess, not a sleep:
```
shell_start  command="npm run dev"  waitFor={ port: 5173 }
→ condition met: port is accepting connections
  1| VITE v7.3.1  ready in 431 ms
```

**"Run the tests, keep working, tell me if they fail."**
The suite runs in the background. When it exits, the agent is messaged once, with the error line
already picked out:
```
<shell_exited id="sh_9wq2f1ab" title="unit tests">
exited with code 1 after 48s
last output: 37| FAIL src/auth.test.ts > refresh token expiry
```

**"How is DB Monitoring doing?"**
Shells are shared across sessions and can be addressed by name:
```
shell_read name="DB Monitoring"
```

**Logs that don't eat your context.** Colour codes stripped, progress-bar redraws collapsed to
their final frame, repeated lines folded to `(×12)`, and every read returns a cursor so the next
one only brings what's new. For full-screen programs (`vitest --ui`, `htop`, prompts) the agent can
ask for the *screen* instead of the log.

**It notices breakage on its own.** Watch a process that never exits and the agent hears only about
changes, never about a thousand identical recompiles:
```
shell_start command="tsc --watch --noEmit" description="type checker" watch=true
→ tsc: ok → fail · src/auth.ts(42,3): error TS2339: Property 'id' does not exist
```
Presets cover 34 tools (tsc, vitest, jest, eslint, cargo, go, gradle, pytest, vite, next,
docker compose…), and anything else takes three regexes of its own. A watched process that dies
counts as a failure, so a crashed dev server is reported too.

**You can find things in a huge log.** `/` in the console filters the scrollback to matching lines,
keeping line numbers and highlighting matches — and output keeps the colours the program printed.

**It can type.** Prompts, REPLs, migration wizards: `shell_send` sends text or named keys
(`ctrl+c`, `up`, `enter`) and returns whatever the program printed back.

### Why not just `bash`?

| | Built-in `bash` tool | Cockpit Shell |
|---|---|---|
| Long-running processes | Blocks until exit | Runs in the background, survives the turn |
| Knowing something is ready | Guess, or sleep and poll | Blocks on a port, a pattern, silence or exit |
| Interactive programs | Not possible (no TTY) | Real PTY: prompts, REPLs, ctrl+c |
| Reading output | Whole log, every time | Clean lines from a cursor, with grep |
| Noticing a break later | Never | Watchers report health changes |
| Your visibility | None until it finishes | Live panel, console and sidebar |
| After OpenCode restarts | Gone | Still running |

## For you, not just the agent

| Key / command | Does |
|---|---|
| `/shells` | Every shell in view, plus "New shell": pick one to open its console |
| `ctrl+x o` · `/shells-dock` | Toggle the shells panel under the chat |
| `ctrl+x j` · `/shell` | Reopen the last shell's console |
| `/shell-new` | Start a shell yourself |
| `/shells-clear` | Remove finished shells |
| `/plugins-update` | Every plugin you have installed: what runs, what is published, and an update checked against disk |
| `/cockpit-setup` | The agent sets Cockpit up with you: which bays show, in the sidebar or at the bottom, in what order, quiet or present when empty — and fixes any setting from before 0.9 |
| `/status-setup` | The agent designs the Status line with you: a preset, its segments, the sidebar or the bottom (`/statusline` until 0.9; the old name still works for one release and says the new one) |
| `ctrl+x d` · `/subagents` | Open the subagent working now, in a pane beside the chat |
| `ctrl+x v` · `/changes` | Open or close the review of what changed |
| `ctrl+x k` | Move the review between the right pane and full screen |
| `ctrl+x f` · `/trail` | What this conversation made, or every conversation in the project (`tab`) |
| `/link` | Add a link to this conversation's trail yourself: paste the link, and a note if you like |
| `ctrl+x p` · `/trust` | What Trust answered for you, and the ledger of what it has learned |

Every key is the same on OpenCode 1 and 2, none of them is one of OpenCode's own, and each bay's
`keybinds` changes it ([Keys](https://codestz.github.io/opencode-cockpit/configuration/#keys)).

A shell's status reads the same everywhere — `RUN` (with a spinner), `FAIL`, `STOP`, `DONE` — running shells
and recent failures stay in view, the rest folds behind `▸ N more`. In the console: `i` types
straight into the program (`ctrl+]` to stop), `c` sends ctrl+c, `r` restarts, `x` stops, `tab`
switches between the live screen and the scrollback, `?` shows details.

## Install

**Everything**

```sh
opencode plugin opencode-cockpit@0.9.0 --global --force
```

**Only what you want**

```sh
opencode plugin @opencode-cockpit/shell@0.9.0 --global --force
```

The version is pinned on purpose. OpenCode resolves a plugin spec once and never again, so a
bare `opencode-cockpit` or `@latest` stays on whatever it installed first. `--force` replaces an
entry you already have, so the same line is also how you move to a newer release.

**Stuck on an old version?** This runs outside OpenCode, from npm, so it works whatever you have
installed — and shows every plugin you have, not just this one:

```sh
npx opencode-cockpit@latest update     # or: bunx opencode-cockpit@latest update
```

Restart OpenCode. Requires OpenCode 1.18+ or 2.0.15+ on macOS or Linux. Install a feature either through
`opencode-cockpit` or on its own — if both are configured, the first one loaded is used and
OpenCode warns you which entry to remove.

**On OpenCode 2** the same packages load — one entry serves both versions. v2 reads `plugins` (not
`plugin`) from `opencode.json` for the agent side and from `cli.json` for the interface, and passes
options as an object:

```json
{
  "plugins": [{ "package": "opencode-cockpit@0.9.0", "options": { "features": { "shell": true } } }]
}
```

An existing v1 `opencode.json` with `plugin` is read by OpenCode 2 as well. To update there, change
the version in that entry — `/plugins-update` and `npx opencode-cockpit update` edit OpenCode 1's
files only.

**After installing or updating on OpenCode 2, restart its background service:**

```sh
opencode service restart
```

OpenCode 2 runs the agent side in a background service that loads plugins once, when it starts, and
keeps running when you close OpenCode. Until it restarts, the windows draw the new Cockpit while the
agent keeps the old one's tools and skills. `npx opencode-cockpit@latest doctor` says when the
service started before the install.

**Configure them** in one file, read by both halves of every bay and by every project — see
[Configuration](#configuration), or type `/cockpit-setup` and let the agent write it with you. When
the blocks are set it offers to tune Cockpit to how you work: a tour of each bay's keys, then your
project's conventions — the dev server to keep in a background shell, your ticket prefix for Trail —
written as one `## Cockpit conventions` section in `AGENTS.md`, which a rerun updates in place.

## Configuration

Every bay reads the same two files, and nothing else needs touching:

```
~/.config/opencode-cockpit/config.json   →   <project>/.cockpit.json
```

The global file applies everywhere (`$XDG_CONFIG_HOME` is honoured); a project's file wins over it,
section by section and key by key, so it can change one setting without restating the rest. A
list replaces the one before it. Both halves of a bay — the agent's tools and the interface — read
the same section, so a bay is configured in one place, not once in `opencode.json` and again in
`tui.json`. Comments and trailing commas are fine. Everything is optional: with no file at all you
get the defaults below.

**The easy way: `/cockpit-setup`** — or just ask, "make my sidebar quieter", "hide the shells block
when it's empty". The agent loads the `cockpit-setup` skill that ships with Cockpit and reads what
is installed and written now with its `cockpit_settings` tool; it fixes anything from before 0.9
first, offers a starting point (everything visible, quiet, minimal, or Status as a line under the
prompt), asks only what is left, one question at a time, writes the smallest file that does it, and
checks the result. From the home screen the command opens a conversation; while the agent is
answering it waits its turn. `/status-setup` does the same for what the Status line shows. Both are
in the palette (`ctrl+p`, "cockpit") too.

### The whole shape

```jsonc
// ~/.config/opencode-cockpit/config.json — a project's .cockpit.json takes the same shape
{
  "sidebar": ["status", "subagents", "shell", "trail", "trust"],   // the order, top to bottom
  "features": { "trust": false },                                  // switch a whole bay off

  "status":    { "preset": "sidebar", "sidebarRows": 14 },
  "subagents": { "sidebarRows": 6, "hideWhenEmpty": false, "hideFinishedAfterMinutes": 60 },
  "shell":     { "sidebarRows": 5, "dockHeight": 16, "lifecycle": { "onExit": "keep" } },
  "trail":     { "sidebar": true, "sidebarRows": 5 },
  "trust":     { "sidebar": true, "threshold": 3 },
  "review":    { "variant": "right", "source": "worktree" },
  "updater":   { "updateCheck": true }
}
```

One section per bay, and nothing at the top level but `sidebar` and `features`.

### Keys every bay shares

Spelled the same in every section:

| Key | | Default |
| --- | --- | --- |
| `enabled` | The bay's off switch, both halves. `features.<bay>: false` does the same | `true` |
| `sidebar` | Draw the bay's sidebar block — a boolean here; the top-level `sidebar` is the order. For Status, `false` puts its line at the bottom, under the prompt | `true`; Trust `false` |
| `sidebarRows` | Rows the block lists before the rest fold into `+ N more` | Status 8 (its table 14), Subagents 6, Shell 5, Trail 5, Trust 3 |
| `hideWhenEmpty` | Subagents, Shell and Trail. `false`: with nothing to list the block still says it is there — its heading and `none yet`. `true`: no block at all until there is something | `false` |
| `keybinds` | Keys for the bay's commands, `{ "<command>": "<key>" }`; `"none"` unbinds one | Subagents `<leader>d`; Shell `<leader>o` dock, `<leader>j` console; Trail `<leader>f`; Trust `<leader>p`; Review `<leader>v` open, `<leader>k` placement |

Time keys carry their unit: `hideFinishedAfterMinutes`, `hideNestedAfterSeconds`.

### The sidebar order

One list, at the top of either file, and nowhere else:

```json
{ "sidebar": ["status", "subagents", "shell", "trail", "trust"] }
```

That is the default. A project's list replaces the global one (it is an order, not a set), and a bay
the list leaves out keeps its default place after the ones it names. On OpenCode 1 Cockpit's blocks
sit together under OpenCode's own Context block and above the rest. An entry that is not a bay —
`"shells"` — is not silently ignored: a `!` row asks whether you meant `"shell"`.

On OpenCode 2 the bundle applies the list. **Installed as separate packages on OpenCode 2, the
blocks draw in the order the packages are listed in `cli.json`**, so list them in the order you want
them.

### Each bay

**`status`** — the Status bay ([all of it](packages/status#configuration)).

| Key | | Default |
| --- | --- | --- |
| `preset` | A whole line by name: `sidebar` (the table), `minimal`, `default`, `detailed` (bottom lines). Anything written beside it wins | `sidebar` |
| `surface` | `sidebar` or `bottom`; `"sidebar": false` says the same | `sidebar` |
| `segments` | The line's parts, built-ins or your own — the whole list, replacing the preset's | the preset's |
| `override` | Changes to the preset's segments by name, the rest kept: `false` drops one, a name swaps it, an object merges into its settings — `{ "git": { "against": "branch" } }` | none |
| `lines` | More than one line, each with its own `surface`, `segments`, `maxRows`… | one |
| `separator`, `stack`, `icons`, `debug`, `padding*` | How a line is laid out | per surface |
| `commands` | Shell commands usable as segments — your Claude Code statusline script, unchanged | none |
| `modules` | Your own segments in TypeScript; a project's add to the global ones | none |

**`subagents`** — [Subagents](packages/subagents#settings).

| Key | | Default |
| --- | --- | --- |
| `hideFinishedAfterMinutes` | Minutes a finished subagent stays in the sidebar | unset: the whole conversation |
| `hideNestedAfterSeconds` | Seconds a finished *nested* subagent stays; negative keeps them | `30` |
| `guidance` | Tell the agent about background subagents and follow-ups | `true` |

**`shell`** — [Shell](packages/shell#configuration).

| Key | | Default |
| --- | --- | --- |
| `kinds` | Your own shell categories, name → regex on the command | none |
| `watch` | `presets` (your own rules) and `auto` (attach one to every shell) | `auto: false` |
| `defaults` | Applied to every shell the agent starts: `watch`, `logFile`, `idleTimeoutSeconds`, `timeoutSeconds`, `notifyOnExit` | none |
| `lifecycle` | `onExit` (`stopMine` or `keep`), `orphanAfterMinutes`, `removeFinishedAfterMinutes` | `stopMine`, `60`, `30` |
| `notify` | What may interrupt the agent: `exit`, `watch`, `tailLines` | on |
| `guidance`, `listRunningShells` | The system-prompt paragraph, and how many running shells it names | `true`, `15` |
| `dockHeight`, `dockOpen`, `defaultView`, `colors` | The panel under the chat and the console | `14`, as last left, `screen`, `true` |
| `hideFinishedAfterMinutes` | How long a finished shell stays in the folded views | `30` |

**`trail`** — [Trail](packages/trail#settings). Nothing beyond the shared keys; its block is on by
default, and `ctrl+x f` (`cockpit.trail.open`) opens `/trail`.

**`trust`** — [Trust](packages/trust#settings).

| Key | | Default |
| --- | --- | --- |
| `threshold` | Approvals in a row, by you, before Trust answers | `3` |
| `dangerExtra` | What a dangerous command costs on top | `5` |
| `expireDays` | Days unused before trust has to be earned again; `0` never | `30` |

Its block is off by default (`"sidebar": true` shows it; the palette flips it for the session).

**`review`** — no sidebar block.

| Key | | Default |
| --- | --- | --- |
| `variant` | Where the panel opens: `right` or `full` | `right` |
| `source` | What it reviews on open: `worktree` (uncommitted) or `branch` | `worktree` |

**`updater`** — [Updater](packages/updater#settings).

| Key | | Default |
| --- | --- | --- |
| `updateCheck` | Check for plugin updates once a day and say so | `true` |

### Names from before 0.9

0.9 gave every bay the same shape, so some names changed. **The old ones are not read.** Each one a
file still carries is drawn as a `!` row in its bay's block, printed by
`npx opencode-cockpit@latest doctor`, and fixed first by `/cockpit-setup`:

```
! settings: "statusline" is no longer read — run /cockpit-setup
```

| Before 0.9 | Now |
| --- | --- |
| `statusline` | `status` |
| `status.maxRows` | `status.sidebarRows` |
| Shell's keys at the file's root (`kinds`, `watch`, `defaults`, `lifecycle`, `notify`, `guidance`, `listRunningShells`) | the same keys under `shell` |
| `ui.dockHeight`, `ui.dockOpen`, `ui.sidebarRows`, `ui.colors`, `ui.keybinds`… | the same keys under `shell` |
| `ui.historyMinutes` | `shell.hideFinishedAfterMinutes` |
| `ui.updateCheck` | `updater.updateCheck` |
| `ui.sidebarOrder`, `<bay>.sidebarOrder` | the top-level `sidebar` list |
| `subagents.hideFinishedAfter`, `subagents.hideNestedAfter` | `…Minutes`, `…Seconds` |
| Status's keys at the file's root (`preset`, `segments`, `enabled`…) | the same keys under `status` |

A file that is not valid JSON, a top-level name nothing reads, or a value of the wrong kind gets a
`!` row too, and the defaults — never a silently blank sidebar.

### OpenCode's own sidebar blocks

Status's table carries what OpenCode's own Context block says. To keep only one, switch the host's
off — it is OpenCode's setting, in OpenCode's file, and the name differs by version:

```jsonc
// OpenCode 1 — ~/.config/opencode/tui.json
{ "plugin_enabled": { "internal:sidebar-context": false } }
```

```jsonc
// OpenCode 2 — ~/.config/opencode/cli.json
{ "plugins": ["opencode-cockpit@0.9.0", "-opencode.sidebar.context"] }
```

The other blocks switch the same way, by these ids (an `internal:` id in OpenCode 2's `cli.json`
does nothing, silently). Hiding them is a matter of taste: Status's table
already warns when an MCP or language server fails, and `opencode mcp list` still lists them all.

| Block | OpenCode 1 | OpenCode 2 |
| --- | --- | --- |
| Context | `internal:sidebar-context` | `opencode.sidebar.context` |
| MCP | `internal:sidebar-mcp` | `opencode.sidebar.mcp` |
| Footer (path and branch) | `internal:sidebar-footer` | `opencode.sidebar.footer` |
| LSP | `internal:sidebar-lsp` | — |
| Files | `internal:sidebar-files` | — |
| Todo | `internal:sidebar-todo` | — |

Leave OpenCode's Todo block on: nothing in Cockpit replaces it.

### Advanced: options on the plugin entry

The same keys can also go on the plugin entry — the bundle's `["opencode-cockpit", { "shell": { … } }]`
or a single bay's own `["@opencode-cockpit/shell", { … }]` — where they win over both files. It is
rarely worth it: on OpenCode 1 the interface's options belong in `tui.json` and the agent's in
`opencode.json`, so the same bay ends up configured in two places. The files are read by both.

## Troubleshooting

```sh
npx opencode-cockpit@latest doctor
```

checks OpenCode, its config, Cockpit's logs and the daemon, and prints the fix for anything wrong —
on OpenCode 1 and 2, and when Cockpit will not load at all ([what it checks](https://codestz.github.io/opencode-cockpit/help/doctor/)).

Everything Cockpit does inside OpenCode goes to one file — which OpenCode loaded which bay, and every
error with its stack:

```sh
tail -50 ~/.cache/opencode-cockpit/cockpit.log
```

`COCKPIT_DEBUG=1 opencode` adds the detail. [Troubleshooting](https://codestz.github.io/opencode-cockpit/help/troubleshooting/) covers
the failures people hit and what to attach to an issue; [OpenCode 1 and 2](https://codestz.github.io/opencode-cockpit/start/opencode-versions/)
covers what differs between the two.

## How it works

```
OpenCode TUI thread ── feature plugins (tui) ──┐
                                                ├── unix socket, JSON-RPC ── cockpitd ── processes
OpenCode server worker ─ feature plugins (server) ┘
```

OpenCode runs its interface and its server in separate threads, so a plugin's two halves can't
share memory. Both talk to **`cockpitd`**, a small daemon that owns every long-lived process: it
starts on demand, is shared by every OpenCode window, upgrades itself when a newer plugin connects,
cleans up processes left by a crash, and exits when idle. That's why shells outlive OpenCode
restarts, and why one session can look at a shell another session started.

Each shell's output feeds three views at once: a normalized **log** for the agent, an emulated
**screen** for you, and a raw ring buffer so a panel opened late can catch up.

### Packages

| Package | What it is | Docs |
|---|---|---|
| [`opencode-cockpit`](packages/opencode) | The bundle: every bay, each switchable | [README](packages/opencode/README.md) |
| [`@opencode-cockpit/shell`](packages/shell) | Bay 01 — background terminals | [README](packages/shell/README.md) · [docs](https://codestz.github.io/opencode-cockpit/shell/overview/) |
| [`@opencode-cockpit/status`](packages/status) | Bay 02 — the statusline | [README](packages/status/README.md) · [docs](https://codestz.github.io/opencode-cockpit/status/overview/) |
| [`@opencode-cockpit/review`](packages/review) | Bay 03 — a pull request in the terminal | [README](packages/review/README.md) · [docs](https://codestz.github.io/opencode-cockpit/review/overview/) |
| [`@opencode-cockpit/updater`](packages/updater) | Bay 04 — every plugin, and an update checked against disk | [README](packages/updater/README.md) · [docs](https://codestz.github.io/opencode-cockpit/updater/overview/) |
| [`@opencode-cockpit/subagents`](packages/subagents) | Bay 05 — every subagent visible, reachable and reused | [README](packages/subagents/README.md) · [docs](https://codestz.github.io/opencode-cockpit/subagents/overview/) |
| [`@opencode-cockpit/trust`](packages/trust) | Bay 06 — permissions that learn, visibly | [README](packages/trust/README.md) · [docs](https://codestz.github.io/opencode-cockpit/trust/overview/) |
| [`@opencode-cockpit/trail`](packages/trail) | Bay 07 — what a conversation made, one click from the page | [README](packages/trail/README.md) · [docs](https://codestz.github.io/opencode-cockpit/trail/overview/) |
| [`@opencode-cockpit/daemon`](packages/daemon) | `cockpitd`, the shared process host | [README](packages/daemon/README.md) |
| [`@opencode-cockpit/client`](packages/client) | Typed, auto-spawning client | [README](packages/client/README.md) |
| [`@opencode-cockpit/protocol`](packages/protocol) | Wire contracts and schemas | [README](packages/protocol/README.md) |

## What is being worked on

Not a roadmap of promises — the next thing, and why it is next.

**Review and the console in OpenCode 2's panel.** OpenCode 2 has a side panel of its own — with
focus, a width that follows the window, and a full-screen toggle. Review and the full-screen console
draw their own today; on OpenCode 2 they can live in the host's, and behave like the rest of its
interface.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the architecture,
the invariants worth knowing before changing anything, and how to run your working copy inside
OpenCode.

```sh
bun install
bun run check        # lint, typecheck, tests (real PTYs, real daemon)
bun run pack:check   # pack, install the tarballs, run a shell through them
bun run smoke:tui    # drive a real OpenCode against the packed plugin
```

## License

[MIT](LICENSE)
