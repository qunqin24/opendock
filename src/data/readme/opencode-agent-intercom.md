# opencode-agent-intercom

> **Make your local LLM ship real features. Without the wait. Without the context bloat.**

**Built for local LLMs in the 3–40 B range** (currently tested daily on a 9 B
model). Designed around the failure modes of small models — short contexts,
shaky planning, weak tool selection — not retrofitted from a frontier-model
pattern.

You spin up a local model on your own hardware, point
[opencode](https://opencode.ai) at it, and… it kind of works. Edits one file,
then forgets the project. Calls `task`, your terminal hangs for four minutes,
comes back with garbage. Melts down at 80 % context. You go back to the cloud.

**This plugin closes that gap.**

It turns a modest local model into a workflow-driven team. A long-living
**primary** that coordinates and **never blocks** — keep steering,
course-correct mid-flight, or fan out subagents in parallel while the first one
runs. One-shot subagents do exactly one job in their own lean context, reply,
and disappear. The framework guards your model's most precious resource — its
context window — at every layer.

The difference between *"interesting demo"* and *"this just shipped feature X."*

## Install

```sh
npx opencode-agent-intercom-install
```

That is the whole setup. The installer wires both halves of the plugin
(server-side + sidebar TUI), builds universal-ctags so `outline` works, fetches
Chromium for the `pw` browser CLI, and writes a `.bak` of every config file it
touches. Restart opencode. Done.

Manual fallback: add `"opencode-agent-intercom"` to your project's
`opencode.json` `plugin` array and `"opencode-agent-intercom-tui"` to
`~/.config/opencode/tui.json` (user-global, **not** the project file). The TUI
plugin does **not** resolve from a directory path — for a local checkout,
point at the built file directly (`/path/to/.../tui/dist/tui.js`, after
`npm run build` in `tui/`).

## What this gives you that stock opencode doesn't

- **The primary never blocks. Ever.** opencode's native `task` is blocking —
  your terminal sits there. Our `spawn` returns in ~200 ms. Keep typing, ask
  the orchestrator something, fan out three more subagents in parallel. The
  primary is yours, always.

- **A primary that lasts dozens of turns.** Hard tool-gating on the
  orchestrator (it coordinates only — no edits, no shells), an 8 KB cap on
  subagent replies, and a live snapshot of running work injected each turn
  instead of a status-poll tool. Its context stays clean for the long haul.

- **No MCP servers — and that's the *feature*.** Every MCP server permanently
  injects 1–2 KB of tool descriptions into *every* LLM call. For a 200K
  frontier model: fine. For your 32K local model: **5 % of your window, every
  turn, forever**. We ship custom thin tools instead — `web_search` at ~300 B,
  plus `outline`, `pw`, `gen`. Same capabilities, a fraction of the cost.

- **`outline` over `read`.** Which file defines `processInvoice`? Outline six
  candidates (one line of signatures each) instead of `read`ing all six and
  drowning your model in 40 KB of unrelated bodies. **~95 % token savings**
  vs `read` for orientation, measured.

- **Role-aware prompt slimming.** Roles that do not need `AGENTS.md`
  (`researcher`/`designer`/`gitter`) get it stripped — ~17 KB saved per LLM
  call for those roles. opencode's "you are powered by …" boilerplate is
  stripped globally for all roles.

- **A TUI sidebar that is a *co-pilot*, not a viewer.** Live-tunable subagent
  concurrency, context budget, per-agent sampling params (temperature, top-p,
  min-p, repeat-penalty…), visibility toggles, subagent list always on screen,
  hot-repeat on `[-]`/`[+]`. Every change live on the next LLM call.

- **A structured workflow baked into the system prompt.** Definition → design
  → architecture → milestones → tasks → implementation → review. State lives
  in `AGENTS.md`, so your project is resumable across restarts. Zero
  per-project prompt engineering.

- **Graceful context-limit handling.** When a subagent runs out of context, it
  does not die and it does not hallucinate. The plugin tells *the parent*
  (which still has headroom) so the orchestrator can re-plan. We never
  auto-abort. You are always in charge.

- **Nine consolidated roles**, not 11+. Orchestrator + 8 specialists, each
  with a narrow, complete prompt. We tried more. Fewer was better — small
  models pick decisively when the menu is short.

Add it up: a stock opencode orchestrator turn costs 20–25 K prompt tokens.
Under this plugin: 5–10 K. Your model spends what is left on actual
*thinking* — not on re-reading its own toolbox.

## What a session feels like

```
you: implement a search modal with keyboard shortcuts
orchestrator: spawning coder#1...
              (200 ms later — your turn is back)

you: actually also make sure it works on mobile
orchestrator: noted. I'll have coder#1 cover both, and I'll
              spawn designer#1 for the visual. Slot 2/2 used.

[both subagents working in parallel — you keep typing]

you: how's it going?
orchestrator: coder#1 is at 6 K ctx, editing src/search/modal.tsx.
              designer#1 just finished — output at designs/search.webp.

coder#1 idle: implemented + tests passing. Files: src/search/modal.tsx,
              src/search/modal.test.tsx. Want a reviewer pass?

you: yes
orchestrator: spawning reviewer#1...
```

The primary never blocks. You stay in the driver's seat the entire time.

## Tools

| Tool | Purpose | Who |
|---|---|---|
| `spawn(agent, prompt, description?)` | Start a subagent non-blocking. Returns a handle (`researcher#1`). | Orchestrator |
| `abort(subagent)` | Cooperatively abort and hard-deny further tool calls. User-requested stops. | Orchestrator |
| `list()` | List active subagents. | Orchestrator |
| `todos_open()` | List open tasks from `TODO.md` with their stable id (`T5`) and `accept:` criterion. | All agents |
| `todo_add(title, accept?)` / `todo_edit(id, …)` / `todo_done(id)` | Add / refine / remove a task in `TODO.md`. `todo_done` deletes the completed task — usually the wake-hook does it for you. | The six deliverable roles |
| `web_search(query, numResults?)` | Anonymous web search via Exa (no key, 150/day; `EXA_API_KEY` lifts the cap). | Subagents |
| `outline(path)` | Top-level declarations of a source file via universal-ctags. ~100 languages, ~95 % token savings vs `read`. | Subagents (except `designer`/`gitter`) |

Subagents are one-shot: **spawn → run → reply → destroyed.** The primary is
woken automatically with the full (capped) result on completion. No
status-poll tool by design — small LLMs would call it in a loop.

### Task tracking that doesn't depend on the model remembering

`TODO.md` is the single source of truth for what's still open in the current
milestone. A deliverable-role subagent is spawned with a stable task id
(`spawn("coder", "T5: implement the export endpoint")`), it ends its reply with
a one-line marker (`DONE: T5`), and the wake-hook removes that task from
`TODO.md` for you — **deterministic, no LLM step**. A task in the file is open;
"done" means the line is gone. Mismatched ids (`spawn for T5` but `DONE: T3` in
the reply) are ignored as hallucinations. The format is fixed:

```
- T5: <task title>
  accept: <one-line, observable "done" criterion>
```

The `T<n>:` prefix on a spawn prompt is opt-in: present it and the
wake-hook auto-removes the task on a matching `DONE:` line; leave it off
(status checks, ad-hoc questions) and the spawn runs without tracking. Any
agent can read fresh state via `todos_open()`; the deliverable roles manage the
list with `todo_add` / `todo_edit` / `todo_done`.

## Agent roles

Nine roles injected by the `config` hook — no per-project
`.opencode/agents/*.md` needed. A project can override any role by defining
one of the same name. Orchestrator is the default primary unless
`default_agent` is explicit.

| Agent | Role | Notes |
|---|---|---|
| `orchestrator` | Primary. Coordinates only. | Restricted to `spawn`/`abort`/`list`. |
| `planner` | Concept/design docs in `plans/`. | No `bash`. Researches current versions first. |
| `coder` | Implements code in thin vertical slices. | Bash, edit, build/test. Catch-all. |
| `debugger` | Diagnoses build/test/runtime errors. | Bash for repro, no `edit`/`write` — fix goes back to `coder`. |
| `reviewer` | Reviews staged work into `reviews/`, iterates on it. | No `bash`. Convention: no source-code edits. |
| `documenter` | Writes/iterates user docs in place (README, `docs/`, changelog). | No `bash`. Convention: no source-code edits. |
| `researcher` | Web research via `web_search` + `webfetch`. | No `edit`/`write`/`bash`. |
| `designer` | Generates images via [`gen`](#gen--image-generation-no-api-key), researches visual refs on the web. | No `outline`. Convention: no source-code edits. |
| `gitter` | Repo operations matching project's git style. | No `edit`/`write`/`webfetch`/`web_search`. |

## The TUI sidebar (companion plugin)

[`opencode-agent-intercom-tui`](tui/README.md) is the user-side co-pilot,
installed by the command above. Surfaces the live subagent snapshot and
exposes every runtime knob:

- **Subagent list** — open-session, abort (✕), keyboard navigation.
- **`max subagents [-N+]`** and **`max Token(k) [-N+]`** — write
  `~/.config/opencode/agent-intercom.json`, picked up within ~2 s.
- **`thinking [on/off]`** / **`tool details [on/off]`** — opencode's
  built-in visibility toggles.
- **Per-agent LLM sampling** — temperature, top-p/top-k, max-tokens, plus
  llama.cpp keys (`min_p`, `repeat_penalty`, `chat_template_kwargs`) routed
  through `output.options`. Writes `~/.config/opencode/llm-params.json`.
  `[reset]` per agent falls back to the role's default.

Every change applies on the next LLM call. No opencode restart.

## CLIs the subagents use

### `pw` — headless Chromium with persistent state

`coder` and `debugger` get a `pw` CLI in their shell — a thin wrapper around
[Playwright](https://playwright.dev) driving a **persistent** headless
Chromium. State survives across calls: navigate once, then `pw screenshot`,
`pw textContent`, `pw click` against the same page in separate shell
invocations.

```sh
pw start
pw goto http://localhost:3000
pw waitForSelector "#app" 5000
pw screenshot /tmp/page.png       # then `read /tmp/page.png`
pw textContent "main"
pw click "button.submit"
pw stop
```

All command names mirror Playwright's
[Page API](https://playwright.dev/docs/api/class-page) 1:1 — an LLM that
knows Playwright already knows `pw`. The escape hatch is
`pw evaluate '<expr>'` (any JS expression) or `pw evaluate --body '<js>'`
(multi-statement). First `pw start` fetches Chromium (~170 MB, one time).
Internally: detached daemon on a Unix socket under `$TMPDIR`.

### `gen` — image generation, no API key

The `designer` gets a `gen` CLI that turns a written brief into an image.
Two free backends, both without keys, with auto-fallback:

1. **Stable Horde** (default) — real SDXL/FLUX workers via
   [stablehorde.net](https://stablehorde.net), anonymous tier. **20–90 s**
   typical at public priority.
2. **Pollinations** — fast (~3–10 s) but only the `sana` model and a
   1024 px anon cap (lifted with `POLLINATIONS_TOKEN`).

```sh
gen "modern SaaS dashboard, dark theme, sidebar + KPI cards, no humans, no logos" \
    --out designs/dashboard.jpg --width 1920 --height 1080 --seed 42
```

Wait time is normal — Horde prints `queue_pos=N wait=Ms done=false` while
polling. The designer is instructed to keep paths under `designs/` and not
embed legibility-critical text in images (the model garbles letters).

## Configuration

All optional. The subagent and context caps usually live in
`~/.config/opencode/agent-intercom.json` (written by the TUI panel);
everything else is environment-variable-driven:

| Variable | Default | Effect |
|---|---|---|
| `OPENCODE_AGENT_INTERCOM_DEBUG` | on | `"0"` disables logging to `~/.cache/opencode-agent-intercom/debug.log` |
| `OPENCODE_AGENT_INTERCOM_LOG_REQUESTS` | off | `"1"` writes per-LLM-call JSONL to `~/.cache/opencode-agent-intercom/requests.jsonl` (path override: `_LOG_REQUESTS_FILE`) |
| `OPENCODE_AGENT_INTERCOM_MAX_SUBAGENTS` | `1` | Concurrent subagents per primary. `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_MAX_CONTEXT` | `40000` | Subagent context budget (tokens). `"0"` disables. TUI file overrides. |
| `OPENCODE_AGENT_INTERCOM_RESULT_CHARS` | `8000` | Cap on a subagent's final reply forwarded to the primary. `"0"` disables. |
| `OPENCODE_AGENT_INTERCOM_PROJECT_CONTEXT` | on | `"0"` skips the project snapshot prepended to spawn prompts |
| `OPENCODE_AGENT_INTERCOM_RESPECT_TASK_PERMS` | on | `"0"` ignores `permission.task` allowlist in `spawn` |
| `OPENCODE_AGENT_INTERCOM_DISABLE_WEBSEARCH` / `_DISABLE_OUTLINE` | off | `"1"` skips that tool |
| `OPENCODE_AGENT_INTERCOM_SKIP_CTAGS` / `_SKIP_CHROMIUM` | off | Installer-only: skip ctags build / Chromium download |
| `EXA_API_KEY` | — | If set, `web_search` uses Exa's paid tier |
| `POLLINATIONS_TOKEN` | — | If set, the `gen` Pollinations fallback uses your account |

## Under the hood

Built for behaviour, not deference: the orchestration pattern is **enforced**,
not requested.

- **Primary tool-gating** — `tool.execute.before` rejects any tool call from
  a primary session other than `spawn`/`abort`/`list` (and denies two `list`
  calls in a row). The primary orchestrates; it cannot read, edit, run commands
  or fetch the web. Subagents are not restricted by this guard — their tool
  limits come from the per-role `permission:` map in `agents.js`, which also
  makes opencode strip the unavailable tools from the LLM schema so the model
  never sees them as options.
- **System-prompt injection** — `experimental.chat.system.transform` prepends
  the orchestration protocol and live subagent snapshot to primary sessions
  and a shorter discipline block to subagents.
- **Per-agent LLM overrides** — the `chat.params` hook merges
  `~/.config/opencode/llm-params.json` live into every request (TUI panel
  writes this file).
- **Async spawn** — `spawn` owns subagent session creation (`session.create`
  + `promptAsync`) and returns immediately. The primary stays alive.
- **Wake** — opencode never re-activates an idle primary on its own. The
  `event` hook does, on `session.idle`, pushing the subagent's full (capped)
  result to the parent.
- **Soft-notify on context budget** — escalates over a few LLM turns; after
  three ignored injections, the parent is notified of the denial loop (with
  a TUI toast). Subagent stays alive. Abort is user-only (TUI ✕ or asking
  the orchestrator).
- **Race-safe subagent cap** — `pendingSpawns` reservation in the same turn
  prevents N parallel spawns from all seeing "slot free".

opencode's plugin API has no hook to make `task` itself non-blocking, so
removing every "do it yourself" tool from the primary is the enforcement lever.

## Limitations

- **Abort is best-effort.** `session.abort` is cooperative; the
  `tool.execute.before` hard-deny is the backstop.
- **No mid-flight subagent steering** — by design. Subagents are one-shot.
  Spawn a fresh one with a clearer prompt.
- **Solo-maintainer surface area.** `pw` daemon, `gen` CLI, Exa SSE parser,
  ctags subprocess, four opencode hooks. 86 unit tests, no CI against real
  opencode. Bugs are addressed at hobby-project pace.

## Development

```sh
npm run check   # syntax check (node --check)
npm test        # unit tests (node --test)
```

## License

MIT — see [LICENSE](LICENSE).
