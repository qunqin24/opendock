# micromanager

An [OpenCode](https://opencode.ai) v2 plugin that turns one agent into an orchestrator of sub-agents: the
**micromanager** splits your request into small tasks and starts a worker per task, and the plugin plus
[TypeSafe Jev](https://typesafe.ai), a decision model, secure every one of them.

- **Isolation:** every worker that writes gets its own git worktree and branch; your checkout is never touched. Its
  shell commands run in a sandbox (bubblewrap on Linux, Seatbelt on macOS).
- **Checks before merge:** a writer's change is merged only when its checks pass (`Checks: npm test`), through a merge
  train onto the session's branch `jev/<job>`; you merge that into your checkout when you say so.
- **Decisions by Jev:** which role, model and skills a task gets, how hard it is, and which permission requests are
  answered on your behalf; the rest is paused and put to you.
- **Hard tasks run as trials:** several attempts at once on different model families; the best one is merged, by its
  checks, a review and cost, and a design draft is yours to pick from a comparison. Every attempt's outcome and cost
  is logged, the data for a router that learns.
- **Budget, watchdog, memory:** per-job limits on tokens, requests and cost; a watchdog against loops and stalls; a
  memory across sessions and projects, and context management for long sessions.

The design is [docs/design.md](docs/design.md), its flow chart [docs/design.html](docs/design.html), the phases
and research [docs/plan.md](docs/plan.md). Development happens on the branch `omo-hybrid` and is merged into `main`.

## Requirements

- OpenCode v2 (tested with 2.0.18). A package install needs nothing else: the plugin runs in OpenCode's own runtime.
  Node.js with TypeScript type stripping (22.18 or newer; tested with 26) is needed only for the tests and a checkout.
- git: workers need a repository with at least one commit (without one the micromanager asks how to go on), and
  `opencode plugin add` clones the plugin with it. A **git identity** is required as well: task commits, rebases and
  the first commit of a repository the plugin creates are authored and committed by your configured `user.name` /
  `user.email` (the plugin no longer forces `micromanager <micromanager@localhost>`), so without one git fails with
  its own author-identity error. The plugin's private memory repository under its state directory is internal and
  unchanged.
- A Jev API key, as `JEV_API_KEY` or, on Linux, in the keyring (`secret-tool`, service `typesafe`, key `jev`; macOS
  has no `secret-tool`, so there the variable is the way). Without a key, every decision goes to you.
- For the sandbox: on Linux `bubblewrap`, `socat` and `ripgrep`; on macOS nothing extra (Seatbelt). Without them
  commands run unwrapped, and the plugin says so.
- Optional: the local embedding service for the memory (`./install.sh --embedding`, a systemd user unit), and `uv`
  for the GLiNER decision server in `decider/` and for the evolver in `packages/micromanager/evolver/` (`evolve_task`; `uv` sets up its
  environment, OpenEvolve pinned, on the first run).

## Install

As an OpenCode plugin, from npm:

```bash
opencode plugin add @omacode/micromanager
```

That installs the orchestrator and its library dependencies (`@omacode/core`, `state`, `guard`, `sandbox`, `context`).
The TUI is a separate CLI plugin:

```bash
opencode plugin add @omacode/tui
```

and `opencode plugin add` puts it into `~/.config/opencode/cli.json` (its `./tui` entry; the package has no server
part, so the server never loads it). `./install.sh --all` does both from a checkout.
To upgrade: `opencode plugin update`; to remove: `opencode plugin remove @omacode/micromanager`.

From a checkout, for development (the symlink means the running server reads your working tree):

```bash
git clone git@github.com:RentschlerTobias/Micromanager.git micromanager
cd micromanager
npm install                    # the sandbox runtime
./install.sh                   # links packages/micromanager/src/plugin.ts into ~/.config/opencode/plugins/micromanager.ts
./install.sh --embedding 4b    # optional: the memory's embedding service (0.6b, 4b or 8b), see "Context and memory"
./install.sh --remove
```

The worker skills need no step in either case: the plugin registers them itself (see "Skills" under "Use").

Restart the OpenCode server afterwards: plugins load when it starts, so restart the server your TUI attaches to,
not only the background service `opencode run` uses. The `plugin` record in the journal and the header of
`job_status` name the plugin commit a server runs. Settings go into `~/.config/opencode/micromanager.jsonc`; none are
needed to start (see the optional settings under "Use").

## Use

Pick the agent **micromanager** in OpenCode and tell it what you want. It works like oh-my-openagent's orchestrator, with
Jev and the plugin securing every task:

1. **The micromanager orchestrates.** It splits your request into small tasks, keeps a todo list and starts a worker
   per task with OpenCode's own `subagent` tool, in the background: the role as agent (`coder`, `tester`, `writer`,
   `explorer`, …), a short title, and a prompt that ends with `Files:` (what it may change) and `Checks:` (e.g.
   `npm test`) for a worker that writes. The call returns at once; the workers show up in OpenCode as the
   micromanager's child sessions, and the micromanager stays free to talk with you.
2. **Each writer works in its own git worktree** under `.jev-micromanager/worktrees/`, branched off the session's
   branch `jev/<job>`: OpenCode starts the child in your checkout, and the plugin moves it into the worktree before
   its first step. Your checkout is never touched. Readers work on the session branch and change nothing.

   Git always materialises a worktree of the **repository root**, so if your project is a subdirectory of a larger
   repository the worker keeps its offset: the plugin records it as `rel` and runs the worker *and its checks* in
   `<worktree>/<rel>`, where its files are. A check naming one of your files resolves there, not at the root. The
   job also records whether your working tree has uncommitted changes, because no worker can see them. A delegation
   whose declared files are currently modified or untracked is refused before a worktree is made: commit or stash
   those files first. Unrelated dirty paths are reported but do not block a task that cannot touch them.
3. **Isolation fails loud.** A session that is a child of a micromanager session but is not a claimed worker has its
   write tools denied, with a journal record naming the job, session, directory and reason. Reads stay allowed so the
   situation stays diagnosable. A role agent you pick by hand in your own checkout is not a child and is untouched.
4. **Jev and the plugin secure each task:**
   - **Guards.** A check looks at each delegation, at web content and at workers' permission requests. Keys and
     tokens are masked.
   - **Private data stays here.** Every request to a model, the micromanager's, a worker's, a helper's, the
     summarizer's and Jev's, has its private data swapped for placeholders first: keys and tokens (some twenty
     formats, private keys, URL passwords, secret-looking assignments, and the actual values of the server's secret
     variables, the project's `.env` files and the Jev key), e-mail addresses, phone numbers, IBANs and card numbers
     (checked by checksum), and, with `"redact": { "names": true }`, people's names and street addresses found by the
     local GLiNER server (`/v1/entities`; code is read for its comments and strings only). One value always gets the
     same placeholder (`PERSON_1`, `SECRET_2`, `email3@redacted.invalid`), so a model can still reason about it and
     the prompt cache holds. The model's tool calls get the real values back: files all of them, so an edit keeps a
     file's key; commands everything but secrets; web tools nothing. The vault lives in
     `~/.local/state/micromanager/vault.json` (mode 600, out of every sandbox); OpenCode's database and the TUI keep the
     real text, so a model's reply to you can show a placeholder. Your git name and e-mail and the values in
     `"redact": { "allow": [...] }` are never replaced. With the GLiNER server down, names go unchecked and the
     journal says so (`redact.names-unavailable`); `redact.new` records each new placeholder, never its value.
   - **Model and skills.** The plugin routes each role to its model and names the skills in the worker's brief.
   - **Permissions (N13).** Workers' permission requests go to Jev. What Jev is not sure about, what it says only
     you can decide, and what a hard rule sends to you is **paused, not refused**: the worker waits, and the
     micromanager is woken with the request (`A1`, `A2`, …), what it is for and why it was not decided. It answers a
     request that clearly serves the task itself with `answer_permission` (`once`, `job` for the same request for the
     rest of the job, or `refuse`), and puts anything else to you. You answer in your own words — "yes", "yes always",
     "no" (also "ja", "ja immer", "nein") — and the plugin reads that from your turn, so a hard rule only ever opens
     on your word, never on the micromanager's. Nobody answering within 10 minutes refuses it, and the worker carries
     on without it as before; a desktop notification says a worker waits. `external_directory` is layered: a path
     inside the job's own worktrees is allowed, a path the task itself names is allowed, and anything else is
     paused for you the same way.
     `~/.ssh`, `~/.config`, `/etc`, your home directory and another job's worktree are never allowed at any layer.
   - **Shell commands run in a sandbox.** Every shell command a worker starts is wrapped with Anthropic's
     [sandbox-runtime](https://github.com/anthropics/sandbox-runtime) (pinned to 0.0.81; bubblewrap on
     Linux, Seatbelt on macOS, a proxy for the network). The permission layer reads a command's text; the sandbox
     holds for what the command actually does, so a writer's `npm test` no longer runs the project's code with your
     full rights:
     - a writer writes only into its own worktree, a reader nowhere; each has its own temp directory, never `/tmp` as
       a whole;
     - nobody reads `~/.ssh`, `~/.gnupg`, keyrings, `~/.config/opencode`, `~/.config/gh`, cloud credentials, browser
       profiles, the plugin's journal or the project's `.env` files (`.env.example` stays readable);
     - the network reaches the package registries (npm, PyPI, crates.io, Go) and nothing else;
     - the environment is an allowlist: `PATH`, `HOME`, the locale and the usual toolchain variables, plus `CI=1`.
       The desktop's sockets (D-Bus, Hyprland, Wayland, the SSH and GPG agents) and the credentials of the hub, Jev
       and Claude Code are never handed on, whatever is granted.

     Inside the sandbox a writer's command that stays in its worktree is allowed without Jev: no path outside the
     worktree, no home directory, no program that reaches past the tree (`kill`, `systemctl`, `curl`, `ssh`,
     publishing, …) and no git command that moves shared refs (`commit`, `checkout`, `stash`, `reset`, …). The hard
     rules still come first. The sidebar shows `sandbox ✓` under the job's switches. Without the sandbox (the setting
     `"sandbox": false`, an unsupported platform, or bubblewrap, socat or ripgrep missing) the commands run unwrapped
     with the cleaned environment, a writer's commands go to Jev again, and the sidebar says `no sandbox` and why.
   - **Workers ask for a variable or a host.** A command that fails because a variable is not set, or a host is
     unreachable, is no dead end: the worker calls `request_env` (every worker) or `request_network` (writers and
     researchers) with the name and why, and its call waits for the decision. The never list, a variable that is not
     set where the server runs, and anything you refused earlier in the job are refused at once. A setting
     (`NODE_ENV`, `RUST_LOG`) or a public host is granted by Jev when it is sure. A secret-looking variable (`*_TOKEN`,
     `*_KEY`, a URL with credentials, …), and a host asked for while the job's commands hold such a secret, come to you
     as a form through the micromanager (`Grant G1`: allow for this job, or refuse); the host form names the secret,
     because the two together are what it takes to send it away. A grant holds for the job and lands in its control
     file, names only: no model ever sees a value (Jev gets its length and kinds of characters). Workers are told
     never to fill in a missing variable with a value they made up.
   - **Designers can look.** No browser can run in the sandbox (its own sandbox needs user namespaces, and it needs
     Unix sockets, which the sandbox blocks for every worker), so a designer has `look`: a page, an svg, an image or a
     directory with an `index.html` of its own directory, or a URL on a host its job may reach, comes back to it as a
     picture. The plugin renders it on the host with headless Chromium (its own sandbox on, a throwaway profile), the
     directory served read-only from `127.0.0.1` without `.env` files, and a resolver that knows no other host but
     the job's. A dev server inside the sandbox cannot be reached from there, so a designer builds first and looks at
     the output. A visual worker must return a real picture before it can finish; a missing browser is reported as a
     failed visual check, not a passed one. Chromium, Chrome or Playwright's Chromium has to be installed where the plugin runs.
   - **Designers can act.** `look` shows one state; `playwright` drives the page through the states that need a click, a
     filled form or a client route, and records the run. It is the real Playwright engine on the host — the same served
     directory and the same host allow-list, checked on every request — behind a list of steps (`click`, `fill`, `press`,
     `waitFor`, `scroll`, `eval`, `shot`, `pdf`, …). The worker names steps; it never hands over JavaScript, because a
     script would run with the user's rights in the plugin's process. A run reports console errors and failed requests,
     returns its screenshots and, for a recording, keyframes (a model cannot watch an MP4) plus the file for the user.
     Recordings go to the job's media directory unless the worker names a folder of its own, so they land in the job's
     area and never in a commit by accident. `playwright-core` is the only dependency and no browser download is needed:
     the system Chromium is launched by path. Recording needs ffmpeg; a system ffmpeg is linked where Playwright expects
     it, and a machine without one is told to run `npx playwright install ffmpeg` once.
   - **Writers can ask.** A writer has two tools of its own: `explore` starts an explorer that reads the writer's
     directory, its uncommitted change included, and `research` starts a researcher with the web. The writer waits for
     the answer, which comes back as the tool's result. A helper is no task of the job: no worktree, no merge, no place
     on the micromanager's list, no helper of its own, at most three per task. The permission hook, the guards, the
     watchdog and the journal (`"kind":"helper"`) treat it like any worker. Its session is a top-level one whose title
     starts with the writer's task: OpenCode 2.0.18's plugin API drops `parentID`, so it cannot be nested.
   - **Readers read.** Explorer, researcher, planner, reviewer and oracle run `git log`/`diff`/`show`, `ls` and the
     like without asking, and any chain or pipe of reading programs passes the read-only check; a command that writes
     is refused with the reason, not a bare "Permission denied". No worker may put up a question: nobody answers one
     in a background session.
   - **Checks are gated too.** A check is a string a model wrote, and the plugin runs it in a shell, so every check
     goes through the same hard rules as a permission request: pushes, `sudo`, system installs and destructive
     deletions are refused before the task or its worktree exists. A writer with no checks at all is refused as well.
   - **Checks and merge.** A writer ends by calling `finish_task`: the plugin runs the checks in the worktree; on
     a failure the worker gets the output and fixes it, on a pass the plugin commits and a merge train brings the
     commit onto `jev/<job>` (rebased and checked again when another task got there first). The commit and each
     rebase carry your git identity (`user.name` / `user.email`).
   - **Tests are frozen.** The files a writer's checks name that are not its own (`node --test test/a.test.js`), its
     contract's evaluator and corpus, and any it was given with `Frozen:` (or `"frozen"` in its todo) may be read and
     run but not changed: an edit is refused at once, the sandbox denies the write, and a changed one is put back at
     `finish_task` and counts as a failing check.
   - **A wrong check can be changed, not dodged.** A writer that finds a check or a frozen test wrong calls
     `request_check_change` with the evidence and a proposal, and waits. A broken check (a wrong path, a typo) goes
     through Jev's prefilter to the micromanager (`decide_change`); a test that contradicts the task is checked by a
     reviewer of another model family first; a gap in the spec or a change to the fitness contract is always yours, as
     a form. The plugin applies an accepted change itself, to every attempt of a trial. Two requests per task, and a
     refused change stays refused.
   - **A task that changed nothing does not merge.** A gate that passes over an empty diff verified nothing, so it is
     reported as unverified instead. Failing checks come back at most twice; then the worker stops and says the
     check is the likely problem, because an unsatisfiable one otherwise burns the whole session.
   - **Limits.** The watchdog stops loops and stalled workers, and Jev reviews a worker's progress at an interval that
     adapts: first about the steps merged tasks of its kind needed (60 by default), sooner when it stops writing or keeps
     failing, then longer or shorter by how sure Jev is that it gets on. A
     command that ran and did not fail is progress, so a worker verifying its work is not mistaken for a stuck one.
5. **Reports come back.** The plugin's note "T… merged into …" lands in the micromanager's session, then OpenCode
   adds the worker's report and wakes the micromanager. It decides what comes next, continues a worker by its
   session when something is left (it keeps its worktree), asks you what only you can decide and, at the end, merges
   or discards the branch itself. Say "ulw" or "ultrawork" and it goes on until every todo is done.

   **The same work is not delegated twice.** A writer on files another writer of the job is changing, whose title
   or brief is about the same thing, is refused: a running one is to be steered (`steer_task`), and one that stopped
   before its merge is to be continued by its session, so its change is kept (live run, 2026-10-07: three workers in
   turn removed the same element from the same slide, each one starting over). A line `Replaces: T5` in the prompt
   starts over on purpose: T5 is cancelled and its worktree goes. A reader whose brief is nearly that of one still
   running is refused the same way. **A worker's own work ends with it:** when it ends or is stopped, its running
   helpers are interrupted and its paused permission requests are dropped, and the micromanager is told they need no
   answer any more.

   The controls, all for the micromanager:

   | tool | what it does |
   |---|---|
   | `list_tasks` | the tasks with their worker sessions, branches and stages |
   | `steer_task` | a note to a worker that is still running, without interrupting it |
   | `stop_task` | stop one task and leave the rest of the job running; the worktree is kept |
   | `merge_job` | fast-forward the job branch into your checkout — the one write it may make there. Shows what would land, refuses on a dirty checkout or unfinished tasks |
   | `discard_job` | give the branch and worktrees back to git; lists what it removes first |
   | `request_access` | vouch that a worker needs a path outside the project, for the permission path to see |
   | `answer_permission` | answer a worker's paused permission request: once, for the job, or refuse |
   | `take_over_job` | make an earlier session's open job this session's, when you chose to continue it |
   | `rewind_job` | list the job's checkpoints, or move its branch back to one with your words; undone the same way |
   | `undo_merge` | take back the last `merge_job` in your checkout, while it is still where that merge left it |
   | `stop_job` | stop the whole job; `run_job` resumes it |
   | `contract` | draft what "better" means for a task with no fixed end; the baseline is measured at once |
   | `contract_round` | work a draft contract out with you (preferences, red team, loopholes, baseline) and freeze it |
   | `evolve_task` | improve one function by evolution (OpenEvolve) against a frozen contract, in the sandbox; the plugin offers it by itself where it fits ("Evolver / Trial / One worker", your choice in a form) |
   | `backlog` | list, show, add or change the project's waiting jobs in `.micromanager/backlog/` |
   | `decide_change` | accept or refuse a writer's request to change a check or a frozen test |

6. **Checkpoints and rewind.** Every merged task is a commit `Tn: title` on `jev/<job>`, authored with your git
   identity, and the job remembers where
   the branch started, so the branch is a row of checkpoints: `start`, then the state after each task. `rewind_job`
   lists them and, with your words, moves the branch back to one. It keeps the old tip as
   `refs/jev/<job>/before-rewind-<n>`, which is a checkpoint too, so a rewind is undone by rewinding to it. Tasks
   whose change left the branch show as `undone` on the board; unfinished tasks are given up with their worktrees,
   because a branch cut from the old tip would bring the undone commits back on its next merge. It is refused while
   a worker of the job runs, and it never touches your checkout. `undo_merge` takes back the last `merge_job` there,
   only while the checkout is exactly where that merge left it; the commits stay on the job branch. The conversation
   itself is OpenCode's to rewind (undo or fork in the TUI); the plugin has no access to that.

   **After a restart** the plugin knows the workers of the open jobs again from the job files: a worker continued by
   its session finishes and merges as before, and the micromanager cannot start over on its work by accident.

   **A new session asks about the last one's work.** At the first turn of a micromanager session that has no job yet,
   an earlier session's open job (merged tasks the checkout may not have, unfinished changes in worktrees) is put to
   you with four choices: **continue** (`take_over_job`: this session runs the job, its workers can be continued),
   **merge** (`merge_job`), **discard** (`discard_job`), or **new** (leave it as it is and start a fresh job; nothing is
   deleted, and the next session asks again). Nothing happens before you answer.

7. **Fitness contracts.** A task that asks to make something better with no fixed end (faster, smaller, more
   reliable) is refused until it has a fitness contract: Jev's N5 ask, which estimates the difficulty anyway, also
   asks whether the task is open-ended. The micromanager works the contract out with you through `contract_round`:
   a planner drafts it from the code, tests and data, you pick in a form what decides, which guards stay and the
   target, a red team on another model tries to raise the score without improving the goal (its change is measured,
   never merged) and you choose which of its loopholes to close, then you check the baseline (three runs with their
   spread) and the plugin freezes it. Only a frozen contract measures writers. The draft itself is the `contract` tool's: the goal, an
   evaluator command that prints one line `MM_SCORE {"scores":{"p50_ms":12.3}}`, the scores with a direction (the
   first decides, the next break ties inside a noise band), guards that may not get worse than today, the corpus,
   repeats (the median counts), a stop rule (`evaluations`, `seconds`) and, for a slow evaluator, a `quick` stage on
   small instances that the evolver runs first. The plugin measures the baseline on the job
   branch at once and keeps the contract in the job and in `.micromanager/contracts/<job>/C1.json`. A writer started
   with a line `Contract: C1` (or `"contract"` in its todo) is measured after its checks pass: an invalid result (a
   non-zero exit, a timeout, no `MM_SCORE` line, a missing score) or a broken guard is a fix round like a failing
   check, and after a rebase it is measured again. Its score, the contract's version and the reward (the first
   score's improvement over the baseline) go into the outcome log. In a trial measured against a contract the first
   attempt to pass is not merged at once: the passed attempts wait, and the one with the best score is merged once
   none is at work any more (or after `trialDeadline` minutes, default 20; at once when one reaches the contract's
   `stop.target`). Held-out cases (`corpus.heldOutFrom`, a directory outside the project) are copied to the plugin's
   state directory, which no worker can read; the evaluator gets them in `MM_CORPUS_DIR`, and workers only hear how
   many of them passed. Any ordinary check may print
   `MM_SCORE {"cases":{"passed":7,"total":8}}` too; that grades a build task in the outcome log without deciding it.

8. **The backlog.** Jobs that wait live in `.micromanager/backlog/<slug>.md` (front matter plus Markdown), and you commit
   them: the plugin's exclude lines leave that directory and `.micromanager/contracts/` to git and keep the rest out.
   When a job is merged or discarded, the follow-ups its workers reported that no task took up, and a trial whose
   attempts all failed, become drafts there. `plan_job` with the goal `backlog:<slug>` starts an item; the `backlog`
   tool lists and edits them. With the project's repository in `"githubBacklog"` (e.g. `["owner/name"]`), its issues
   labelled `micromanager` join the list as `gh-<number>` and can be planned the same way; a local item becomes an
   issue only when you say "Publish it" in the form `backlog publish <slug>` brings up.

9. **Large or unclear jobs.** `plan_job` lets a planner write a full plan with acceptance points, optionally
   after a planning session with you. You approve it, and `run_job` runs it.

Jobs and task notes live in `.micromanager/` (`.jev-micromanager/` in older projects), kept out of git through the repository's `.git/info/exclude` — found
with `git rev-parse --git-common-dir`, so it works when the project is a subdirectory of a larger repository and when
it is itself a worktree.

**Overview.** `job_status` shows an ASCII board of the job: each task with its state, role, model, what it does or
waits for and what it cost so far (its worker and helpers, or the evolver's model calls), plus the job's tokens,
requests and cost. The sidebar puts each task's cost after its line too. In a terminal, in the project:

```bash
node ~/Fun/Projects/Repos/micromanager/packages/micromanager/src/cli.ts status --watch   # redraws every 2 s; --all for every job
```

**Memory.** In planned jobs (`plan_job`), workers report what they learned about the project (`LEARNED:`); Jev keeps the lasting, new facts in
`.opencode/memory/jev-project.md` (opencode-agent-memory's format) and picks the ones that help each task's brief.

Models come from a registry of the OpenCode Go models and your local ones (llama-swap, iGPU, NPU), local
first when they can do the task (`src/registry.ts`).

**Model choice.** Every role has a pool of OpenCode Go models (`src/roles.ts`), as chosen on 2026-10-19:

| Role | Pool |
|---|---|
| coder | glm-5.3-flash, mimo-v2.6-pro, deepseek-v4.1-flash, step-5-preview |
| tester | glm-5.3-flash, mimo-v2.6-pro, deepseek-v4.1-flash, step-5-preview, mimo-v2.6-flash |
| debugger | glm-5.3-flash, claude-haiku-5-5, mimo-v2.6-pro, deepseek-v4.1-flash, step-5-preview |
| writer | deepseek-v4.1-flash, mimo-v2.6-pro, glm-5.3-flash, step-5-preview, mimo-v2.6-flash |
| researcher | deepseek-v4.1-flash, minimax-m3.1-flash-free, qwen3.8-flash, mimo-v2.6-flash |
| explorer | minimax-m3.1-flash-free, deepseek-v4.1-flash, qwen3.8-flash, mimo-v2.6-flash |
| designer | qwen3.8-flash, mimo-v2.6-pro, glm-5.3-flash |
| planner, oracle | gemini-4-argon-contributor, glm-5.3-flash |
| reviewer | gemini-4-argon-contributor, claude-haiku-5-5, deepseek-v4.1-flash |

Each task gets the pool's **least-used** model: the tasks it got in the last seven days divided by its monthly
budget on the Go plan (`budget` in `src/registry.ts`; a free model counts as $60), so the work spreads over the
models, their budgets and their rate limits (`src/usage.ts`, seeded from the journal's routing records). The pool's
order breaks ties. A task started again ("Task: T…" of a task that ran before, or "Replaces: T…") runs on another
family than its failed attempt. The journal's `routing` record says why, e.g. "least used of code: mimo-v2.6-pro
(0/$15) over glm-5.3-flash (1/$60), …".

Two paths pick the model and they do not read the same thing: the native path (`chooseModel` in `src/routing.ts`)
picks from the role's pool as above, and the runner's router (`route` in `src/registry.ts`, the planner of a
planned job) picks from the registry by tier, with the pool's order breaking ties. A review is the exception both paths honour: a reviewer never
checks the work of its own model family, and only the reviewer's pool members of another family are considered;
when none of them is available the rule is relaxed rather than handed a model that cannot run, and the reason says
so.

**When a model disappears.** A renamed or withdrawn model (space-bunny led every chain until it left OpenCode Go on
2026-10-19) must not break every role at once. So the plugin reads the host's model list (`ctx.model.list()`, once a
minute) and picks only among the pool's models the host has. A skip
is journalled as a `routing` record whose reason names what was unavailable, so the change is visible rather than
silent. If *nothing* in the pool is available the first entry is used anyway — a call against a missing model fails
loudly, which beats quietly substituting something the role never asked for.

Set a chain yourself with `decisions.N5.model`, or one model per role in the config's `registry`; see the settings
below.

**Picking the pools in the TUI.** The sidebar's MODELS section (click it to unfold) shows each worker role's pool and
the vision model; a click on a role, or `/pools`, opens a popup like `/model` with every model the host runs, the
pool's members checked. ↵ checks or unchecks a model, "clear all" unchecks the whole pool to pick a new one from
nothing, "back to the default" drops the pick, a pool never becomes empty (esc right after "clear all" keeps the old
one). The picks go to `~/.config/opencode/micromanager-models.json`, which the server reads at each delegation, so
they hold from the next task on without a restart; they win over `models` in `micromanager.jsonc`, and the journal's
`routing` record says `picked: true`. The micromanager itself runs on the session's model: change that with `/model`.

Permission requests go to Jev first and to you when Jev is not sure (`src/decide.ts`). Some phases of the design
are still to come: see docs/plan.md.

Optional settings in `~/.config/opencode/micromanager.jsonc`:

```jsonc
{
  // presets per decision: "auto" (the decision model), "ask" (always you), "rule", or "fixed:<value>"
  "decisions": {
    "N5.model": "fixed:opencode-go/deepseek-v4.1-flash", // every worker on one model
    "N13.shell": "fixed:allow"                            // shell commands of workers without asking
  },
  // models to add or change by id
  "registry": [{ "id": "llamaswap/mimo", "disabled": true }],
  "parallel": 3,          // tasks of one job at the same time (1: one after another)
  "perModel": 2,          // sessions of one cloud model at the same time; a local model serves one
  "trials": 1,            // attempts a hard writer task runs as, each on another model (1: one worker, then retry; at most 4)
  "trialDeadline": 20,    // minutes a trial decided by a fitness contract waits for its last attempts
  "trialPick": { "designer": "user", "*": "best" }, // who decides a trial, per agent: "first", "best" or "user"
  "trialGrace": { "factor": 0.5, "minMinutes": 2, "maxMinutes": 10 }, // a "best" trial's grace window after its first pass
  "githubBacklog": [],    // repositories ("owner/name") whose issues labelled micromanager join the backlog
  "evolver": { "maxEvalSeconds": 600 },  // the longest full measurement the evolver is still offered for
  "budget": { "tokens": 4000000, "requests": 800, "cost": 5 }, // optional limits per job; none by default
  "notify": "jobs",       // desktop notifications (notify-send on Linux, osascript on macOS): "jobs", "tasks" (also per task) or "off"
  "sandbox": true,        // worker commands in the sandbox (default); false runs them unwrapped
  "env": ["DATABASE_URL", "MYAPP_*"], // variables every job's commands keep beyond the allowlist
  "network": ["api.example.com", "*.example.com"], // hosts every job's commands may reach beyond the registries
  // private data in requests to models: secrets and e-mail/phone/IBAN/card on by default; names and addresses
  // through the local GLiNER server only when switched on; false turns it all off
  "redact": { "names": false, "threshold": 0.5, "allow": ["ACME GmbH"] }
}
```

Hard rules (pushes, `sudo`, system installs, deleting tracked files, …) always go to you, whatever a preset says.

The plugin registers its skills into OpenCode at startup: `deliberate` (the facilitator's rules) and six leaf skills
for workers, adapted from mattpocock/skills and obra/superpowers (`packages/micromanager/skills/THIRD_PARTY.md`). They come from the
package, so a git install has them without a step; a skill of your own with the same name wins, and the plugin then
never names that skill in a brief. The local GLiNER
decision server (`decider/`, see its README) answers guard questions on the CPU, and `npm run bench-guards`
measures them; the journal
`~/.local/state/micromanager/decisions.jsonl` feeds `npm run eval` and `npm run export-dataset`.

Writers run one at a time by default: after a failed attempt, the next model gets a retry rather than two more
worktrees starting speculatively. Set `"trials": 2`–`4`, or put `Method: trial` in the task, to run a hard writer task
as a **trial**: attempts at once, each in its own worktree on another model family. Who decides it is the trial's
**pick** (`"trialPick"`, or a line `Pick: me | best | first` in the task's prompt):

- **best** (writers by default): the first attempt to pass is held, not merged, and the others get a grace window of
  half its time, at least two and at most ten minutes (`"trialGrace"`); attempts the watchdog sees getting nowhere are stopped when the
  window opens. The passed ones are ranked by the share of the checks' `MM_SCORE` cases they pass, then, on a tie, by
  a review of the two best changes by a model of a third family, then by cost and size. The note says why the winner
  won.
- **user** (designers by default): every attempt runs to its end, and those that pass are held with no deadline.
  When the last one ends you get a desktop notification and a comparison page, `.micromanager/trials/<job>-<task>.html`,
  with each version's picture (the task's `Preview:` page, or its `index.html`), model, cost and size, and the
  micromanager asks you with a form: one version (merged), **combine** (the version your words name first is continued
  with the others' changes beside it, and merges when it passes), or **none** (the task is done again with your
  feedback, on other models). Only tasks that depend on it wait.
- **contract**: a task with a fitness contract is decided by score (see "Fitness contracts").
- **first**: the first attempt whose checks pass is merged and the others stop.

When all attempts fail, the micromanager is told what each hit and splits the task. Every writer's end, with its model, difficulty, gate result,
tokens and cost, goes to `~/.local/state/micromanager/outcomes.jsonl`, with how a trial's winner was chosen and which
attempts passed but lost; `npm run export-dataset -- --target router` turns it into one row per task, the training
data for a router (docs/design.md §23).

A job's `budget` (tokens, requests, cost; none by default) holds for the micromanager's own workers too: every
request of a worker, its helpers and the micromanager is counted against its job. A used-up budget cuts nothing: no
new worker starts and none is continued, the running ones are asked to wrap up (their work stays in their worktrees),
and the micromanager asks you whether to raise it. A raised `budget` holds from the next request on.

## Context and memory

Every session's context, the micromanager's and each worker's, is managed by `src/context/`, and what lasts beyond a
session goes into one memory for all projects.

**Context in epochs.** A provider caches the prompt's prefix, so dropping something from the middle of a context makes
the rest uncached once. The context manager therefore collects what can go and applies it all at once, in an epoch,
and between epochs the prompt stays the same bytes:
1. Rules, no model: a read that a later read covers, or that the file's later edit made stale, a repeated call, old
   shell output (cut to its last 10 lines), the content of old `write`/`edit` calls (the file has it), old web pages.
2. Jev's "still needed?" on the older large results (the micromanager's of any tool, a worker's reads and web results).
3. Near the ceiling (80% of 120k tokens, the micromanager's 100k), the turns before the last six are summarized by
   DeepSeek V4.1 Flash in a hidden, tool-less session (the `summarizer` agent); the facts it lists go to the memory first.

An epoch comes when the saving over the expected remaining steps beats the cache it breaks, priced per model from the
host's catalog, or when the context passes the ceiling. Notes the plugin adds for one request go at its end, never into
the system prompt. `node bench/context-replay.ts` replays the recorded sessions in OpenCode's database through the rules
and reports the context and cost they would have had (on the sessions up to 2026-10-23: coders 24% less context with
the rules alone). The journal records `context.epoch` and `context.summary`.

**Memory.** One Markdown file per entry in a git repository, `~/.local/share/micromanager/memory/`, readable and editable
by hand; the SQLite index next to it is rebuilt from the files whenever it falls behind. Entries belong to the user
(preferences), to every project (tool pitfalls) or to one project. Pinned entries are core memory: they stand in every
session's system prompt, within a budget, and change there only at the session's next epoch.
- A worker's brief gets the entries that help its task: keyword and vector search fused by rank, Jev per entry, no two
  saying the same, within a budget per role. The micromanager gets the same at each user turn, for that request only,
  without what it got in its last three turns.
- Workers end their report with `LEARNED:` lines. The micromanager has `memory_set`, `memory_replace`, `memory_list` and
  `memory_get`; readers have `memory_search`. Every write is searched against the memory first, and Jev says whether it
  is new, a duplicate, a refinement of an entry (which it replaces) or a contradiction (reported back to ask the user).
- Vectors come from Qwen3-Embedding on the CPU (`./install.sh --embedding 4b`: downloads the model and runs
  `micromanager-embedding.service` on port 8093). Without the service the memory searches by keywords and fills in
  the vectors later. `"memory": false` in `micromanager.jsonc` turns it off, `"memory": { "embedding": false }` keeps
  keywords only, and a different size needs `"memory": { "embedding": { "model": "qwen3-embedding-8b" } }`.
- The old per-project block `.opencode/memory/jev-project.md` moves into the memory once. The journal records
  `memory.write` and `recall` (what was found, what was picked).

**In the sidebar.** The CONTEXT section, folded to one line (`ctx 84k/120k ███░░│ · mem 142 · ↺2`), unfolds on a click
into the session's context as a bar (`│` marks where a summary starts), what its epochs removed, a line per running
worker with its own bar (`⚠` past the summary mark), the memory (entries, core size, whether vectors are on, today's
writes, duplicates and conflicts) and the notes the last request got from it. The server writes the numbers to
`~/.local/state/micromanager/context/`; the context is estimated from characters and leaves out the tool
descriptions, so it reads about 2k tokens low.

## Flow chart

`docs/flow.html` is a self-contained page (no server) that shows how the plugin decides: the model routing lane
(role → needs → model) and the permission lane (hard rules → deleted paths → Jev → the floors → allow / deny /
user). Open it in a browser and load `~/.local/state/micromanager/decisions.jsonl` with the button or by dropping
it on the page; over http a `decisions.jsonl` next to the page is picked up automatically. Each decision is
listed, and selecting one highlights the exact path it took through the chart.

## Observability

`ctx.app` has no `log` method on this host, so `ctx.app?.log?.()` is undefined and nothing the plugin logs reaches
`opencode.log`. **The journal is the channel that persists**, and it is worth knowing what to look for:

```bash
J=~/.local/state/micromanager/decisions.jsonl
grep '"kind":"plugin"' $J | tail -1 | jq     # one per server start
```

That record is written before anything can fail and carries the version, the project directory, the repository root,
the `rel` offset, and the tool names and agents the delegation hook recognises. A healthy first minute is one such
line, then silence until you delegate. After the first delegation you should see a `routing` entry whose `agent` is
whoever made the call and whose `prompt` starts `[micromanager] task T1 · job …`, plus a task with a `worktree`
in the job file. `delegation-unrecognised` means a delegation the hook will not route; `isolation-denied` means the
backstop caught a worker that was not placed in a worktree.

The journal also holds `permission` entries (from `src/decide.ts`), `routing` (delegations), `finish`, `watchdog`,
`checkpoint` and `graph`.

## Develop

```bash
npm install       # typescript + @types/node, for the type check only
npm test          # node's test runner, TypeScript runs as is
npm run typecheck
```

`npm run build:tui` compiles `src/tui.tsx` into the committed `src/tui.js`, and the package's `./tui` export points at
that file: OpenCode's Solid transform skips every path containing `node_modules`, so a package install of the raw
`.tsx` dies with `Cannot find package 'react'` (opencode#39986, opentui#1741). Change the TUI in `tui.tsx` and run it
before committing; `npm test` fails when `src/tui.js` is stale.

Two things to know when changing the delegation path. A delegation is recognised by its **target** — a `subagent`
call aimed at one of this plugin's role agents — not by which agent made it, because the agent is a property of the
session and switching it silently skipped every later delegation (live test, 2026-10-06: ten workers wrote into the
user's checkout with no task, no worktree and no error). And plugins load when the OpenCode server starts, so a change
to `packages/micromanager/src/plugin.ts` needs a restart before anything observes it.

## License

Apache License 2.0, see [LICENSE](LICENSE).

