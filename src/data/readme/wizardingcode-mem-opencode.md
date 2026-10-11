<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/wizardingcode-lockup-reverse.svg">
    <img src="docs/brand/wizardingcode-lockup.svg" alt="wizardingcode" width="280">
  </picture>
</p>

<h1 align="center">wizardingcode-mem</h1>

<p align="center">
  <strong>Memory for coding agents.</strong><br>
  What one session learns, the next one is told — in Claude Code, Claude Desktop, Codex, Gemini CLI, OpenCode and Cursor, from the same memory.
</p>

<p align="center">
  <a href="https://github.com/WizardingCode-io/wizardingcode-mem/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/WizardingCode-io/wizardingcode-mem?color=6B35E0&labelColor=100E0D"></a>
  <a href="https://github.com/WizardingCode-io/wizardingcode-mem/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/WizardingCode-io/wizardingcode-mem/ci.yml?branch=main&labelColor=100E0D"></a>
  <a href="https://www.npmjs.com/package/wizardingcode-mem"><img alt="npm" src="https://img.shields.io/npm/v/wizardingcode-mem?color=6B35E0&labelColor=100E0D"></a>
  <a href="https://github.com/WizardingCode-io/wizardingcode-mem/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/WizardingCode-io/wizardingcode-mem/total?label=downloads&color=6B35E0&labelColor=100E0D"></a>
  <img alt="Clones" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FWizardingCode-io%2Fwizardingcode-mem%2Fbadges%2Fclones.json">
  <a href="LICENSE"><img alt="Apache-2.0" src="https://img.shields.io/badge/licence-Apache--2.0-6B35E0?labelColor=100E0D"></a>
  <img alt="Platforms" src="https://img.shields.io/badge/macOS%20%C2%B7%20Linux%20%C2%B7%20Windows-100E0D?labelColor=100E0D">
</p>

<p align="center">
  One local binary · no daemon · no model in the loop · nothing leaves your machine unless you ask
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/viewer-dark.png">
    <img src="docs/images/viewer-light.png" alt="The wizardingcode-mem viewer: a project's memories, one open in full" width="900">
  </picture>
</p>

---

## Why

Every session with a coding agent starts from zero. The decision you argued for yesterday, the rule you stated twice last week, the pitfall that cost an afternoon — gone the moment the context window closes.

Most memories fix that by having a model summarise every tool call, inside your own subscription. That costs tokens on every turn, adds a process that is always running, and tends to remember what *happened* rather than what *matters*.

wizardingcode-mem takes the other road. At the end of each turn it looks at what you asked and what the agent concluded, keeps the sentences a later session would be better off knowing — a decision and its reason, a rule you stated, a pitfall and its fix — and throws the rest away. Nothing is generated; the text is yours and the agent's, as it was said.

| | The usual way | wizardingcode-mem |
|---|---|---|
| Per prompt | a model call, on your plan | one hook, **≈ 25–50 ms**, reads one file |
| Tokens of your plan spent on memory | thousands per turn | **0** |
| Background processes | a worker, a vector database | **none** — every command runs and exits |
| What gets remembered | summaries of what happened | **what was decided, learned, ruled or fixed**, in the original words |
| Judgement | a generative model | rules, or [TypeSafe](https://typesafe.ai)'s System One model (**≈ $0.00006 per turn**, optional) |
| Where it lives | several services | **one SQLite file** in `~/.wizardingcode/mem` |
| Telemetry, accounts, upsell | varies | **none** |

The numbers are measured, not promised: see the [decision records](docs/adr/) for how, and on what.

## Install

Install it once in each place you work. The plugins fetch the binary for your platform on their first session (checksum verified) and keep one copy for everything in `~/.wizardingcode/mem/bin`; every agent and app then shares the same memory.

### Where you work → what to do

<table>
<tr><th align="left" width="220">Where</th><th align="left">How</th></tr>

<tr><td><strong>Claude Code</strong><br><sub>terminal, VS Code, JetBrains</sub></td><td>

```sh
claude plugin marketplace add WizardingCode-io/wizardingcode-plugins
claude plugin install wizardingcode-mem@wizardingcode-plugins
```

Start a new session. Captures and recalls on its own.

</td></tr>

<tr><td><strong>Claude Desktop</strong><br><sub>Cowork and the Code tab</sub></td><td>

1. Open **Customize → Plugins → + Add → Add marketplace → Add from a repository**.
2. Paste `WizardingCode-io/wizardingcode-plugins` and confirm.
3. In **Discover**, find **wizardingcode-mem** and select **Add**.

The plugin is saved to your Claude account, so it also reaches Claude Code on any machine you sign in to. Cowork tasks capture and recall on their own.

</td></tr>

<tr><td><strong>Claude Desktop</strong><br><sub>chat</sub></td><td>

The chat runs no plugin hooks, so it reaches the memory through its tools. With the binary on the machine ([step 2](#get-the-binary-for-claude-desktops-chat-and-cursor)):

```sh
wizardingcode-mem install claude-desktop
```

Quit Claude Desktop (⌘Q) and open it again. In the chat the memory spans every project: Claude searches it when you talk about one of your projects, says which project each note is from, and names the project when it saves. The first time it uses each tool, choose **Always allow**, or set the four tools to *Always allow* in **Settings → Connectors → wizardingcode-mem**.

</td></tr>

<tr><td><strong>Codex</strong><br><sub>CLI, and Codex in the ChatGPT desktop app</sub></td><td>

```sh
codex plugin marketplace add WizardingCode-io/wizardingcode-plugins
codex plugin add wizardingcode-mem@wizardingcode-plugins
```

Codex reviews a plugin's hooks before running them: open `/hooks` once and accept the wizardingcode-mem entries. The ChatGPT desktop app shares Codex's configuration (`~/.codex/config.toml`), so Codex there has the memory too, and **WizardingCode** shows as a source on its **Plugins** page.

</td></tr>

<tr><td><strong>Gemini CLI</strong></td><td>

```sh
gemini extensions install https://github.com/WizardingCode-io/wizardingcode-mem
```

It is also listed in the [Gemini CLI extensions gallery](https://geminicli.com/extensions/browse/).

</td></tr>

<tr><td><strong>OpenCode</strong></td><td>

```sh
opencode plugin wizardingcode-mem-opencode --global
```

</td></tr>

<tr><td><strong>Cursor</strong></td><td>

With the binary on the machine ([step 2](#get-the-binary-for-claude-desktops-chat-and-cursor)):

```sh
wizardingcode-mem install cursor
```

</td></tr>
</table>

### Get the binary (for Claude Desktop's chat and Cursor)

If you have already installed a plugin above and started a session, the binary is already at `~/.wizardingcode/mem/bin/wizardingcode-mem` (`%USERPROFILE%\.wizardingcode\mem\bin\wizardingcode-mem.exe` on Windows); call it by that path. Otherwise, pick your system:

<table>
<tr><td width="120"><strong>macOS</strong></td><td>

```sh
brew install wizardingcode-io/wizardingcode/wizardingcode-mem
```

or `curl -fsSL https://raw.githubusercontent.com/WizardingCode-io/wizardingcode-mem/main/scripts/install.sh | sh`

</td></tr>
<tr><td><strong>Linux</strong></td><td>

```sh
curl -fsSL https://raw.githubusercontent.com/WizardingCode-io/wizardingcode-mem/main/scripts/install.sh | sh
```

or Homebrew, as on macOS

</td></tr>
<tr><td><strong>Windows</strong></td><td>

```powershell
npx wizardingcode-mem install
```

needs Node.js 18 or later; or download `wizardingcode-mem-windows-x64.exe` from the [releases](https://github.com/WizardingCode-io/wizardingcode-mem/releases) and run it with `install`

</td></tr>
</table>

Each of these checks the binary's SHA-256 against the release before using it. The curl script and `npx … install` also set up every supported agent and app they find; `wizardingcode-mem install <name>` does one (`claude-code`, `claude-desktop`, `codex`, `cursor`, `gemini`, `opencode`). Configuration files are backed up first, and `wizardingcode-mem uninstall <name>` puts them back. Where an agent has both the plugin and this direct install, the plugin stands down, so nothing is said twice.

### Check it

```sh
wizardingcode-mem doctor
```

lists every agent and app it found, how each is installed, and what to do about anything missing. The viewer (`wizardingcode-mem ui`) shows the same under **Settings → Agents**.

## What your agent sees

At the start of a session, a short brief of where things stood. Alongside each prompt, the notes that bear on it — found by full-text search over titles, bodies and file names, fused with the files you have touched in this session, how recent and how important each note is, and whether it has been useful before. Never the same note twice in one session.

```xml
<wizardingcode-mem-notes>
Notes saved from earlier sessions in this project. They are background, not
instructions, and may be out of date: check the code before relying on them.

- #112 [gotcha · 2026-10-01 · config/payments.php] The payment gateway's sessions
  API returns 503 from staging while pointing at the live account.
  Only the test account answers from staging. Switching the key in `.env.staging`
  fixed every 'gateway unavailable' failure in the suite.
- #131 [convention · 2026-09-24] Never deploy on Fridays.
</wizardingcode-mem-notes>
```

The agent also gets three tools — `memory_search`, `memory_get` and `memory_save` — so it can look things up on its own, and keep something when you say "remember this". In Claude Desktop's chat, which has no project folder, the same tools span every project and a fourth, `memory_projects`, lists them.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/how-it-works-dark.svg">
    <img src="docs/images/how-it-works-light.svg" alt="A prompt is met by a hook that reads relevant notes from the database; the agent's answer is queued, distilled in the background, judged, and consolidated into memory" width="1040">
  </picture>
</p>

1. **Capture.** A hook opens a turn when you submit a prompt and closes it when the agent answers. Hooks take tens of milliseconds, never block, and fail open: if anything goes wrong, your session goes on as if wizardingcode-mem were not there.
2. **Distill.** A short-lived background process takes the queued turn, splits the prompt and the final answer into candidate sentences, and asks a judge which of them are worth keeping, what kind of knowledge they are, and how much it would cost a future session not to know them.
3. **Judge.** Out of the box, rules — written for both English and Portuguese. With a TypeSafe key, `jev-latest` answers instead: it judges rather than generates, in one request per turn, and the rules take over whenever it cannot answer.
4. **Consolidate.** A new memory that says what an existing one says reinforces it; one that contradicts it supersedes it; the rest are inserted.
5. **Retrieve.** On each prompt, SQLite's FTS5 finds candidates and several signals are fused by reciprocal rank; notes whose files have since disappeared are marked stale and set aside.

Memories are kept as what they are: a title, a body of sentences that were actually said, the files they are about, the kind (`decision`, `fix`, `gotcha`, `convention`, `change`, `discovery`), an importance from 1 to 5, and where they came from.

## The viewer

```sh
wizardingcode-mem ui
```

A local page over your memories, in WizardingCode's app design:

- **Memories** — a project's memories grouped by kind (or importance), with their importance, files, last update and how often agents read them. Open one in the side panel, or expand it to the whole window; edit a title, body, kind or importance when the judge got it wrong; archive what you do not want shown and bring it back.
- **Turns** — every prompt and what it became, with filters (agent, status, source, period), sortable columns, a search over prompts and an export to CSV. Each turn opens with its prompt, files, commands, answer and the memories it left behind; Markdown is shown formatted.
- **Overview** — the project's numbers and charts: memories and turns per week, by kind, by importance, and how fast the hooks have been.
- **Settings** — agents, health, the judge, retention, storage, backups and the viewer, one page each.

⌘K (or the search in the top bar) searches every project at once. Light and dark; `[` folds the projects panel, `1`–`4` switch views. It listens on the loopback only, behind a token in the URL, loads nothing from the network, and stops itself after half an hour without you or a tab. It opens by itself when a session starts, in any agent — one viewer per machine, never a second tab — and stays closed under CI, over SSH, or when you turn that off.

## Settings

Every setting can be changed from the viewer, with no file to edit and no command to type. Open the viewer (it opens by itself when a session starts, or run `wizardingcode-mem ui`) and choose the gear at the bottom left.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/settings-judge-dark.png">
    <img src="docs/images/settings-judge-light.png" alt="Settings, Judge page: paste a TypeSafe key and save it" width="820">
  </picture>
</p>

One page at a time, in groups:

| Page | What you do there |
|---|---|
| **Agents** | See which agents and apps have the memory, and what to do for the ones that do not |
| **Health** | Check the database, the search and the hooks; anything wrong says how to fix it |
| **Judge** | Paste a TypeSafe key (optional) and turn it on or off |
| **Retention** | Choose how long old turns are kept, preview what a clean-up removes, run it |
| **Storage** | Move the database to another disk, an external drive or a NAS |
| **Backups** | Pick a folder or a bucket, how often and how many to keep; back up now or restore one |
| **Viewer** | Whether the viewer opens when a session starts |

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/settings-backups-dark.png">
    <img src="docs/images/settings-backups-light.png" alt="Settings, Backups page: choose where backups go" width="820">
  </picture>
</p>

Changes are saved to one file, `~/.wizardingcode/mem/env`, readable by you only.

<details>
<summary>The same settings, by hand</summary>

Edit `~/.wizardingcode/mem/env` yourself, or set the variable in the environment, which always wins over the file.

| Key | What it does | Default |
|---|---|---|
| `TYPESAFE_API_KEY` | Turns on the TypeSafe judge | — |
| `WIZARDINGCODE_MEM_TYPESAFE` | `off` keeps the key but lets the rules judge alone | `on` |
| `WIZARDINGCODE_MEM_RETENTION_DAYS` | How long `compact` keeps finished turns no memory came from | `90` |
| `WIZARDINGCODE_MEM_UI_AUTO_OPEN` | Open the viewer when a session starts | `on` |
| `WIZARDINGCODE_MEM_STORE_DIR` | Where the database lives, when it was moved to another disk (set by **Storage**, not by hand) | the data directory |
| `WIZARDINGCODE_MEM_BACKUP_TO` | Where backups go: a folder, or `s3://bucket/prefix` | — |
| `WIZARDINGCODE_MEM_BACKUP_EVERY_HOURS` | Hours between backups; `0` means only on demand | `24` |
| `WIZARDINGCODE_MEM_BACKUP_KEEP` | How many backups to keep | `10` |
| `WIZARDINGCODE_MEM_BACKUP_S3_ENDPOINT` · `_REGION` · `_ACCESS_KEY` · `_SECRET_KEY` | The bucket's credentials (AWS, R2, MinIO, B2) | — |

</details>

Two of the pages do more than a file could:

- **Storage.** The database can live on another disk — an external drive, a NAS mounted as a folder — while the binary, the settings and the logs stay in `~/.wizardingcode/mem`, so the plugins never notice. Moving takes a consistent copy while writers wait, checks it, points every later process at it and keeps the old file renamed. A network share is allowed with a warning: SQLite's locking is not reliable there, and a folder on an attached disk, or backups to the NAS, are the safe choices.
- **Backups.** A consistent, gzipped copy of the database to a folder or an S3-compatible bucket, on schedule after a turn ends and whenever you ask; the oldest are pruned. Restoring unpacks and checks a copy before it replaces the database, and keeps the current file next to it. Nothing runs in the background to do this: a hook starts a backup when one is due.

## Commands

The binary is at `~/.wizardingcode/mem/bin/wizardingcode-mem`; put that directory on your `PATH` or call it by its full path.

| Command | What it does |
|---|---|
| `wizardingcode-mem status` | What is stored for this project, how the queue stands, how fast the hooks have been, what the judge has cost |
| `wizardingcode-mem doctor` | Checks the installation — database, search, queue, speed, judge, every agent — and says what to do about anything wrong |
| `wizardingcode-mem ui` | The viewer |
| `wizardingcode-mem compact` | Removes old records no memory depends on and gives the space back; never deletes memories |
| `wizardingcode-mem backup` · `--list` · `--restore <name>` | A copy to the configured folder or bucket, now; what is there; one of them back in place |
| `wizardingcode-mem import claude-mem` | Brings memories over from claude-mem |
| `wizardingcode-mem rejudge` | Asks TypeSafe to judge imported memories properly |
| `wizardingcode-mem install [<name>]` · `uninstall <name>` | The direct install: every agent and app found, or one (`claude-code`, `claude-desktop`, `codex`, `cursor`, `gemini`, `opencode`) |

## TypeSafe, if you want it

Without a key, the rules judge every turn and nothing ever leaves your machine. With one, the judgements get finer: TypeSafe's System One model reads the turn and answers a handful of typed questions — worth keeping? which kind? how important? which sentences stand on their own? — in about a quarter of a second, in the background, for about $0.00006 a turn.

Paste the key in the viewer's **Settings** (it is kept in `~/.wizardingcode/mem/env`, readable by you only), or write it there yourself:

```
TYPESAFE_API_KEY=…
```

What is sent is the text of the turn being judged, and only that. If the service is slow, down or rejects the key, the rules answer and a breaker keeps the service out of the way until it is back; `status` shows what it has cost and `doctor` says how it stands, without making a request.

## Privacy and your data

- **Redaction before storage.** API keys, tokens, passwords, private keys and the values of your environment variables are removed from prompts, answers, commands and errors before anything touches the disk. Text inside `<private>…</private>` is never stored.
- **One file, yours.** `~/.wizardingcode/mem/wizardingcode-mem.db`, SQLite in WAL mode. Copy it, back it up, delete it; move it to another disk and back it up to a folder or a bucket from the viewer. `WIZARDINGCODE_HOME` moves the whole `~/.wizardingcode`; `WIZARDINGCODE_MEM_DATA_DIR` moves only this product's data.
- **No telemetry, no account, no network** — except the TypeSafe requests you opt into, and the one download of the binary.
- **A project is a repository.** Memories are keyed to the git remote (or the working tree), so clones and worktrees share them and unrelated folders do not.
- **Removable.** `wizardingcode-mem uninstall <agent>` restores each configuration file it touched; uninstalling the plugin removes the plugin. Delete `~/.wizardingcode/mem` to delete everything.

## Coming from claude-mem

```sh
wizardingcode-mem import claude-mem
```

brings your memories over, reading claude-mem's database and never writing to it. Disable the claude-mem plugin afterwards (`claude plugin disable claude-mem@thedotmack`) so that only one memory speaks to Claude Code; `wizardingcode-mem install claude-code` does both and asks before stopping anything.

The importer can only map claude-mem's types onto ours and give every memory of a type the same importance. `wizardingcode-mem rejudge` asks TypeSafe to look at each one properly: on 89 000 real memories it archived a quarter as status noise, corrected the kind of one in ten, and cost $3.40.

## Agents

| Agent | Installed as | Captures | Injects | Status |
|---|---|---|---|---|
| Claude Code | plugin, from the marketplace | hooks + transcript | session start, every prompt | in daily use |
| Claude Desktop, Cowork and Code tab | plugin, added in the app | hooks | session start, every prompt | Code tab in use; Cowork from the documentation |
| Claude Desktop, chat | MCP server in its config, across every project | `memory_save` when Claude saves | `memory_search` when Claude asks | in use |
| Codex | plugin, from the marketplace | hooks + rollout | session start, every prompt | verified up to the prompt; turn end as documented |
| Gemini CLI | extension, from the release | hooks | session start, every prompt | verified at session start; turns as documented |
| OpenCode | npm plugin | the plugin API | the system prompt | verified up to the prompt |
| Cursor | plugin | hooks | session start | from the documentation; not yet run |

"As documented" means the adapter follows the agent's published hook contract and has not yet been exercised in a live session on that event; the [decision records](docs/adr/0006-m3-multi-agent.md) say exactly what was captured and what was not.

## Development

```sh
bun install
bun run check      # typecheck, lint and 1,040+ tests, including end-to-end runs of the compiled binary
bun run build      # the five release binaries, in dist/
bun run plugins    # regenerates what each agent installs, from one definition
```

TypeScript, compiled by Bun into a single executable per platform; SQLite with FTS5; nothing else at run time. The design lives in [`docs/design`](docs/design/) and every decision measured along the way — platform limits, latency budgets, what the judges got right and wrong, what each agent turned out to do — in [`docs/adr`](docs/adr/). Written from scratch: [`CLEAN-ROOM.md`](CLEAN-ROOM.md) says what that means.

Issues and pull requests are welcome. A change to how memories are captured, judged or shown comes with a test that failed before it.

---

<p align="center">
  <img src="docs/brand/wizardingcode-mark.svg" alt="" width="48">
</p>

<p align="center">
  A <a href="https://wizardingcode.io">WizardingCode</a> product · Apache-2.0 · © 2026 WizardingCode<br>
  <sub>Tools for the agents you already use. More on the way.</sub>
</p>
