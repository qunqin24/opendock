<div align="center">

# opencode-terminal

[![npm version](https://img.shields.io/npm/v/opencode-terminal?style=flat-square)](https://www.npmjs.com/package/opencode-terminal)
[![license](https://img.shields.io/npm/l/opencode-terminal?style=flat-square)](./LICENSE)
[![platforms](https://img.shields.io/badge/platforms-macOS_%7C_Windows_%7C_Linux-blue?style=flat-square)](#platform-support)
[![runtime](https://img.shields.io/badge/runtime-bun_%7C_node-black?style=flat-square)](#dev)

[Install](#install) · [Quickstart](#quickstart) · [Tools](#tools) · [Auto-detect](#auto-detect) · [vs `bash`](#why-not-just-bash)

</div>

---

Give OpenCode a **real terminal and process control**.

`opencode-terminal` lets OpenCode operate native terminals and persistent interactive processes — not just execute a command and wait for its output.

Open a real TTY, start long-running processes, interact with REPLs, manage multiple sessions, inspect logs, send stdin, and cleanly kill entire process trees.

Built for [OpenCode plugins](https://opencode.ai/docs/plugins/). Works on macOS, Windows, Linux/WSL.

## Why

Normal command execution is great for:

```text
run command → get output → done
```

But real development workflows don't always work that way.

You often need:

* **Persistent processes** — dev servers, workers, watchers, builds, benchmarks, tunnels
* **Interactive terminals** — REPLs, database consoles, SSH, `lazygit`, `htop`, interactive CLIs
* **Multiple isolated processes** — frontend, backend, worker, database, each with its own cwd/env
* **Real TTYs** — programs that expect an actual terminal instead of a headless shell
* **Process lifecycle control** — start, inspect, interact with, and stop processes without leaving orphaned children behind
* **Automatic project detection** — detect what a repository needs to run without manually hunting through its config
* **Human-visible execution** — open the same native terminal a developer would use, with optional visible typing

### Example

Instead of manually figuring out how to start a project:

```text
OpenCode → "run the project"
```

`opencode-terminal` can inspect the repository, detect the appropriate command, and open it in a native terminal.

Or:

```text
OpenCode → "start the backend in the background"
```

The agent can start a persistent session, inspect its output later, send input when needed, and kill the entire process tree when finished.

## What you can use it for

### Development servers

```text
npm run dev
mvn spring-boot:run
go run .
cargo run
```

### Interactive sessions

```text
python
node
psql
redis-cli
rails console
```

### TTY applications

```text
lazygit
htop
watch
fzf
git rebase -i
```

### Long-running processes

```text
tsc --watch
jest --watch
docker compose up
ffmpeg ...
k6 run load-test.js
```

### Remote and infrastructure workflows

```text
ssh staging
kubectl port-forward ...
docker exec -it ...
adb logcat
```

The point isn't just running commands.

**It's giving OpenCode control over the terminal and processes that developers actually work with.**

## Tools

| Tool              | Purpose                                 |
| ----------------- | --------------------------------------- |
| `open_terminal`   | Open a native terminal / real TTY       |
| `terminal_detect` | Detect what the project should run      |
| `close_terminal`  | Close a native terminal and its process |
| `terminal_run`    | Run a bounded one-shot command          |
| `terminal_start`  | Start a persistent background process   |
| `terminal_log`    | Read buffered process output            |
| `terminal_send`   | Send input to a running process         |
| `terminal_kill`   | Kill an entire process tree             |
| `terminal_list`   | List active background sessions         |

### Two modes

**Native terminal**

For workflows where a human or TTY-aware application needs the actual terminal:

```text
open_terminal()
        ↓
native OS terminal
        ↓
interactive process
```

**Background session**

For processes the agent needs to control without opening a window:

```text
terminal_start()
        ↓
persistent process
        ↓
log / send / kill
```

This means OpenCode can choose between **visible human-facing execution** and **headless agent-controlled execution** depending on the task.

## Install

**1. Add the plugin** to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-terminal"]
}
```

```bash
npm i opencode-terminal
```

**2. Local dev / testing** (no publish needed):

```bash
# per-project
cp src/index.ts /path/to/project/.opencode/plugins/terminal.ts

# global
cp src/index.ts ~/.config/opencode/plugins/terminal.ts
```

> Requires `xdotool` + `wmctrl` on Linux for visible typing and window tracking. Without them it still opens silently.
> ```bash
> sudo apt install xdotool wmctrl
> ```

## Quickstart

### 1. Just run it — auto-detect does the rest

```ts
open_terminal({})
// Terminal "dev-server" opened in /proj. Running: pnpm run dev [auto-detected: package.json scripts.dev via pnpm]
```

### 2. Backend + frontend, visibly typed

```ts
open_terminal({ command: "./mvnw spring-boot:run", title: "backend", visibleTyping: true })
open_terminal({ command: "pnpm dev", title: "frontend", visibleTyping: true })
```

### 3. Preview before opening

```ts
terminal_detect({ cwd: "/proj" })
// {"cwd":"/proj","detected":{"command":"pnpm run dev","title":"dev-server","reason":"package.json scripts.dev via pnpm"}}
```

### 4. Headless server + REPL input

```ts
terminal_start({ command: "npm run dev", name: "web" })
terminal_log({ sessionId: "term-..." })
terminal_send({ sessionId: "term-...", input: "rs" })
terminal_kill({ sessionId: "term-..." })
```

### 5. One-shot with limits

```ts
terminal_run({ command: "npm test", timeout: 30000, maxOutput: 30000 })
```

### 6. Close it — server stops with it

```ts
close_terminal({ ref: "win-..." })
close_terminal({ title: "backend", force: true })
```

## Auto-detect

Inspects `cwd` in order. First match wins.

| Stack | Signals | Command |
| ----- | ------- | ------- |
| Node / Bun | `package.json` `scripts.dev` → `scripts.start`, pm via `pnpm-lock.yaml` / `yarn.lock` / `bun.lock` | `pnpm run dev`, `npm run dev`, `yarn dev`, `bun run dev` |
| Framework hints | `angular.json`, `next.config.*`, `vite.config.*` | matching `dev` / `start` |
| Deno | `deno.json(c)` | `deno task dev` |
| Maven | `mvnw` / `pom.xml` + `micronaut` | `./mvnw mn:run` |
| Maven | `mvnw` / `pom.xml` + `spring-boot` | `./mvnw spring-boot:run` |
| Maven fallback | plain `pom.xml` | `./mvnw compile exec:java` |
| Gradle | `gradlew` + Spring Boot | `./gradlew bootRun` |
| Gradle fallback | `build.gradle(.kts)` | `./gradlew run` |
| Django | `manage.py` | `python manage.py runserver` |
| FastAPI | `fastapi`/`uvicorn` + `app.py` / `main.py` | `uvicorn app:app --reload` |
| Flask | `flask` dep | `flask run` |
| Python fallback | `app.py` / `main.py` / `requirements.txt` | `python app.py` |
| Go | `go.mod` | `go run .` |
| Rust | `Cargo.toml` | `cargo run` |
| Rails | `Gemfile` + `config.ru` | `bundle exec rails server` |
| Laravel | `artisan` | `php artisan serve` |
| PHP | `composer.json` | `php -S localhost:8000` |
| Static | `index.html` | `python3 -m http.server 8000` |

## Why not just `bash`?

| | Stock `bash` | `opencode-terminal` |
| --- | --- | --- |
| Visible window | No — hidden output | Yes — titled native window |
| Run command | You guess it | Auto-detected + preview |
| Long servers | Blocks / truncates | Background sessions with pollable logs |
| Interactive prompts | Stuck | `terminal_send` drives REPLs, `y/n` |
| Parallel `api` + `web` | One stream | Separate `cwd`/`env`, tracked by `ref` |
| Stop cleanly | Orphan `java` holds port | Tree-kill `TERM → KILL`, SIGHUP on close |
| Demos | Paste logs | `visibleTyping` types live on screen |

> Note: native window output is for humans. Agents read back via `terminal_start` sessions, not screenshots.

## Platform support

- **macOS** — Terminal / iTerm / Ghostty / WezTerm / Kitty / Alacritty (`open -a` + osascript)
- **Windows** — Windows Terminal (`wt`) → `cmd`, `taskkill` for close
- **Linux / WSL** — `gnome-terminal` / `konsole` / `wezterm` / `alacritty` / `kitty` / `ghostty` / `x-terminal-emulator` / `xterm`

**Lifecycle**

- Window = process. Close = `SIGHUP` = stopped.
- `terminal_kill` kills children + grandchildren, not just the shell.
- On OpenCode exit, running sessions get best-effort `KILL`. Opt out: `OPENCODE_TERMINAL_NO_CLEANUP=1`.
- `ref` lives only in the opening session. After restart use `title`.

**Env** via `shell.env`: `OPENCODE_TERMINAL=1`, `OPENCODE_WORK_DIR`, `TERM=xterm-256color`.

## Dev

```bash
bun install
bunx tsc --noEmit
# or
npm run typecheck
```

Smoke-test detection from repo root:

```bash
bun -e '
import { TerminalPlugin } from "./src/index.ts";
const p = await TerminalPlugin({ directory: process.cwd(), $: async () => {} });
console.log(await p.tool["terminal_detect"].execute({}, { directory: process.cwd() }));
'
```

## License

MIT — see [LICENSE](./LICENSE).

Copyright (c) 2026 ShivamChavan01. Use, copy, modify, merge, distribute, sublicense, and sell with copyright notice kept. Provided "AS IS", no warranty.
