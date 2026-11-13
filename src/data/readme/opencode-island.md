# opencode-island

<img src="docs/img/logo.png" width="220" alt="OpenCode Island" />

A **Dynamic Island** for [OpenCode](https://opencode.ai), on macOS and Windows.
Windows support is new: the island builds and runs there, and the limits
below are the ones we know about. If something does not work on your machine,
please open an issue.

It floats on the right edge of your screen and tells you what every session and
agent on your machine is doing — and lets you answer a permission prompt
without ever leaving the window you are working in.

**→ [opencode-island.github.io](https://hamzasoussi53.github.io/opencode-island/)**

![The island expanded, showing a running session](docs/panel.png)

- **Closed**, it is a thin vertical tab on the right edge with the status
  reading down its spine.
- **Open** it (click it) and it becomes a drawer listing the sessions running
  right now, with their subagents nested underneath.
- **Approvals** turn the whole island warning orange, open it by themselves,
  and can be answered in place.
- **Alive** — every session that is busy carries a small orb that says what it
  is doing: thinking, writing, searching, running code.
- **Live** — the last ten words the agent is saying scroll down the closed tab
  as they arrive.

---

## Requirements

| | |
|---|---|
| macOS | 13 or newer |
| Windows | 10 or newer, x64 (ARM64 is untested) |
| OpenCode | 2.2.7 or newer (the GUI plugin API) |
| Node | 22.18 or newer to build from source, 24 or newer to run `npm run check` |

The island is a plugin: it uses an Electron window that floats above other
apps. On macOS it floats above full-screen apps and every Space too.

## Install

### With the OpenCode CLI (recommended)

```sh
opencode plugin add opencode-island
```

That installs the package and adds it to your global OpenCode config.
Restart the desktop app and the island appears on the right edge of your
primary display.

To remove it again:

```sh
opencode plugin remove opencode-island
```

The CLI also takes a Git specifier, which builds the plugin from source:

```sh
opencode plugin add github:hamzasoussi53/opencode-island
```

### From source

```sh
git clone https://github.com/hamzasoussi53/opencode-island
cd opencode-island
npm install --ignore-scripts
npm run build
ln -s "$PWD" ~/.config/opencode/plugins/opencode-island
```

On Windows the symlink needs Developer Mode or an elevated shell, and in Git
Bash `ln -s` copies the folder instead, so the plugin stops updating.
`opencode plugin add github:hamzasoussi53/opencode-island` avoids all of it.

`--ignore-scripts` skips Electron's ~100 MB binary download. The plugin only
needs Electron's type declarations to build; the desktop app supplies the
runtime. A plain `npm install` works too, it just downloads the binary as
well.

## Use

### The closed tab

The tab sits on the right edge, vertically centred. It shows one line:

- `2 agents working` — how many agents are busy right now
- `1 approval needed` — somebody is waiting for you
- `Idle` — nothing is running

Next to the grip, a small orb shows what the busiest session is doing, and the
words fill the tab without ever changing its length: the newest ones stay in
sight and the oldest are cut off at the top. Under the grip, a number counts
the agents that are working, and pops when the count changes.

Under that, the steps of the agent's plan: the one before, the one in hand
and the one after, each a number and a dot. Green when the step is done,
orange and pulsing on the step in hand, yellow for the ones waiting, red for
the one that failed. Open the island and every agent shows its whole plan,
with a count of how many of its steps are done.

The plan is the agent's own. The plugin gives it one tool, `island_plan`, and
a rule in the global `AGENTS.md` that asks it to record the steps as it
works. Delete that block and the island goes back to showing only the words.

The dotted grip at the **top** moves the tab: press and drag it up or down and
it slides along the edge, staying where you leave it.

The grip at the **bottom** changes how long the bar is: drag it and the bar
grows or shrinks downwards, its top staying put. The length you leave it at is
kept, so the bar comes back the same size the next time you open OpenCode.

Click anywhere else on the tab to open the island.

### The expanded island

The drawer lists only the sessions that are running **now** — idle sessions
stay out of the way. Each row shows:

| | |
|---|---|
| The agent | which agent is running it |
| The orb | what it is doing right now: thinking, writing, searching, running code |
| The phase | `THINKING`, `WRITING`, `WORKING`, `WAITING` or `RETRYING` |
| The title | what the session is about |
| The tool | the tool running right now, if any |
| The answer | the last words the agent said, as they stream in |
| The clock | how long the session has been going |

Subagents appear indented under the session that spawned them.

### The bottom bar

| Control | What it does |
|---|---|
| ☀️ 🌙 🖥 | Appearance, in one button: click it and it cycles light, dark, system |
| ⬛ | Open OpenCode: the island floats above everything and never takes focus, so this brings the app back to the front |
| ⏻ | Close everything: the island and OpenCode both go |
| 👆 | Click-through: the island stops taking clicks, except its grip, so you can still open it |
| ☰ | Show the latest session's work in the closed tab instead of the summary |

The two first buttons are also in the closed tab, at the foot of the spine
above the grip that resizes it.

### Approvals

When an agent asks for permission, the island turns warning orange and opens
itself. Three buttons answer it in place:

- **Allow once** — this one call
- **Always allow** — this tool for the rest of the session
- **Deny**

Answering closes the island again.

## How it works

The plugin has two halves, and the split is what makes it survive.

**The server half** (`src/index.ts`) is an ordinary OpenCode plugin. It does
nothing on its own; it exists so the desktop app discovers the package and
reads its GUI bundle.

**The GUI half** (`src/gui.tsx`) runs in the desktop app's **main process**.
That is the important part: a window-hosted plugin would stop when the last
app window closes, which is exactly when you want to know that an agent is
stuck on a permission prompt. From main, the plugin also reaches the app's own
server, so it sees the sessions of **every project** on your machine, not just
the one you have open.

```
src/gui.tsx          the plugin: follows the app's server, owns the state
src/model.ts         turns the server's event stream into sessions and phases
src/state.ts         the JSON the island renders
src/window.ts        the Electron window: placement, dragging, resizing
src/island/app/      the island UI: React 19, Tailwind v4 and shadcn/ui
src/island/preload.cjs  the bridge between the page and the window
```

The island page is built by its own Vite pass into a single self-contained
HTML file, which is then inlined into the plugin bundle. At runtime the
island makes no network requests of its own and loads nothing from disk.

The window is frameless, transparent and always on top. It is sized by the
page: the page measures itself and asks the window for that size, and the
window animates to it as a drawer sliding out of the screen edge on macOS,
and snaps to it on Windows. The island never takes focus when it appears.

## Develop

```sh
npm install         # --ignore-scripts also works, and skips Electron's binary
npm run dev         # build the island, then watch the plugin bundle
npm run typecheck   # the plugin and the island, separately
npm run check       # the streaming tail helpers and the platform guard
```

The desktop app hot-reloads the plugin when `dist/gui-experimental.cjs`
changes, so `npm run dev` is enough to see most edits. You must restart the
app after changing anything that runs in the main process (`src/gui.tsx`,
`src/window.ts`, `src/model.ts`).

The island UI lives in `src/island/app`. It is a separate Vite build with its
own TypeScript config, because the plugin's own JSX is Solid and the island's
is React.

## Limits

- The primary display only.
- On Windows the island belongs to the virtual desktop it was opened on:
  Windows hides windows that belong to another desktop, and no Electron API
  changes that. A game in exclusive full screen covers the island too; a
  borderless full-screen window does not.
- On Windows the island sits at the top of the always-on-top stack, so it
  floats over other floating windows too, and the drawer snaps open instead
  of sliding.
- On Windows the click-through grip stops working while an elevated window
  has the focus: Windows does not forward mouse moves to a lower-privilege
  app.
- The island's spot along the edge, its appearance and its switches are
  remembered for the session only; they reset when the app restarts.
- The island shows what the app's server knows. A session that never
  announces itself stays invisible.

## Built by

[Soussitech](https://www.soussitech.com/) — the island, the plugin and the page.

## License

MIT. See [LICENSE](LICENSE).
