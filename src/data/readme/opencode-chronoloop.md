# opencode-chronoloop 🌀🌌🌠🎆

[![npm version](https://img.shields.io/npm/v/opencode-chronoloop?color=6b48ff)](https://www.npmjs.com/package/opencode-chronoloop)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Endless autonomous loop for OpenCode.** 🔄🌟✨🪐🌙
No completion criteria. No tool. No "I'm done" meowing. 🐱🙅‍♀️🐾🗣️
Just pure, time-bounded, keep-going energy. ⏱️💫⚡🔥💥

Your agent works continuously on open-ended tasks — refining, improving, creating new work — until the clock runs out. Not because it *thinks* it's done. 💅🔮🎯✨💖

> ⚠️ **Disclaimer:** This README is absolutely riddled with emojis because we were stress-testing loop continuation functionality and got carried away. Every tool call was followed by "add more emojis" to verify the agent stayed on task. It worked! But now it looks like a Lisa Frank sticker book exploded. 🦄🌈✨🎨

---

## Why ChronoLoop? 🤔🌈💡🧠🎯

Existing loop patterns (goal, Ralph) are designed for **completable** work — they stop when the agent decides it's finished. But what if your work is:

- **Endlessly refinable** — a codebase that can always be cleaner, faster, better documented 🧹✨🌟🔧
- **Additive** — run out of tasks? Create new ones 📝🆕🚀✨
- **Open-ended** — exploration, research, creative work with no finish line 🔭🚀🌍🌌
- **Background automation** — set it and forget it while you sleep 🌙😴💤🛌

ChronoLoop is for all of that. The exit condition is **purely time-based**, and the agent never knows about it. No reward hacking, no premature "done" declarations — just work until time's up. ⏰🔥🎯💯

---

## How it's different ⚔️🔥🆚🥊🏆

| Feature | Goal / Ralph | ChronoLoop |
|---|---|---|
| Stop condition | Agent calls `update_goal` | ⏱️ Server says time's up |
| Agent knows the limit? | Yes (objective + criteria) | **No** — time is hidden |
| Completion criteria | Required | **None** — endless by design |
| Tool exposed | `update_goal` | **No tool** |
| Prompt injection | Objective + audit instructions | Your custom message or default "keep going" |
| Best for | Defined tasks with a finish line | Open-ended work, refinement, background loops |

---

## The Paradigm 🧠💎🔄🌟⚡

ChronoLoop isn't just a plugin — it's a **meta-control pattern** for autonomous agents. Traditional loops are *task-oriented*: define a goal, run tools, check completion. ChronoLoop is *time-oriented*: define a work rhythm, keep going, stop when the bell rings.

This flips the mental model:

| Dimension | Task-Oriented (Goal / Ralph) | Time-Oriented (ChronoLoop) |
|---|---|---|
| Success | Goal achieved ✅ | Maximum value extracted from time budget ⏱️ |
| Agent's view | "I need to finish X" | "I need to keep working on this project" |
| Exit condition | Agent declares done | Server enforces time limit |
| Gaming risk | Agent can shortcut to completion | Agent can't shortcut what it can't see |
| Work discovery | Defined upfront | Dynamic — agent finds or creates work |
| Best for | Finite, scoped deliverables | Open-ended refinement, automation, exploration |
| You manage | Requirements & acceptance criteria | Principles & work patterns |

The real shift: **you stop telling the agent WHAT to achieve and start telling it HOW to work.** The output isn't a completed task — it's whatever the agent produced in the time available. This is closer to managing a talented human contributor than running a program. You give them principles, a source of work, and let them run until you check in.

> 🎯 **ChronoLoop turns OpenCode from a chat interface into an autonomous work scheduler.** You're not asking questions anymore — you're deploying attention.

### What this means in practice 🤔💡

- **You become a manager, not a prompter.** Your job shifts from crafting the perfect ask to designing a good work environment — scratchpad files, constitution documents, feedback loops via backtick commands.
- **The agent becomes a contributor, not a tool.** It discovers work, prioritizes, executes, reflects, and adapts. Just like a human would.
- **Time becomes the budget, not tasks.** You allocate 30 minutes of attention, not "fix these 5 bugs." The agent self-organizes around the time.
- **Failure becomes cheaper.** A 15-minute loop that goes nowhere costs 15 minutes. A 6-hour loop with bad directives costs 6 hours. Start small, iterate the setup.

---

## You bring your own everything 🎒💭🧠📝🔧

Here's the truth, love: **ChronoLoop does one thing.** It fires a continuation message when the session goes idle — and keeps doing that until time runs out. That's it. No built-in memory. No error recovery. No task management. No "oops you got compacted" safety net.

```
┌─────────────────────────────────────────────────┐
│                  ChronoLoop                      │
│                                                  │
│  session.idle → timer check → fire message      │
│  session.idle → timer check → fire message      │
│  session.idle → timer check → STOP              │
│                                                  │
│  That's the whole plugin. Everything else is YOU │
└─────────────────────────────────────────────────┘
```

What ChronoLoop does **not** do:

| Not handled | What it means for you |
|---|---|
| 🧠 Memory / persistence | The agent won't remember what it did last loop. **You** need a scratchpad file, a task list, or a status tracker the agent reads and writes. |
| 🔄 Recovery from amnesia | Chat gets compacted? Session restarts? **You** need a file-based source of truth that survives context clearing. |
| 🚑 Error recovery | Agent hits a compile error and spirals? **You** need fallback instructions, time-boxed retries, and escalation documents. |
| 📋 Task management | Work runs out and the agent starts spinning? **You** need layered focus directives and scouting instructions. |
| 🧭 Navigation | Agent doesn't know what to do next? **You** need a constitution, priority list, or discovery mechanism. |
| 🔔 Monitoring | Loop runs while you're away? **You** need the heartbeat toast and maybe your own logging. |

> 🧠 **Gold rule:** *"The agent itself is amnesiac, but the filesystem isn't."* Every long-running agent practitioner learns this eventually. The conversation is a river — it flows, compacts, and forgets. The filesystem is a vault. Design for the vault.

### This is not a bug. This is the deal. 🎯

The reason ChronoLoop doesn't provide these things is the same reason it's powerful: **only you know what "good work" looks like for your project.**

- A codebase needs refactoring, testing, and docs in different proportions
- A research project needs exploration, summarization, and cross-referencing
- A creative project needs iteration, experimentation, and curation

No plugin can know which one you're doing or what "progress" means in your context. ChronoLoop gives you the *beat* — you bring the *music*.

> 💡 **The corollary:** The quality of your loop's output is directly proportional to the quality of your **prompt design + scratchpad design + fallback plan.** Not to the plugin version. The plugin is a dumb timer with good posture. You're the brains.

**So yes — you bring your own prompt. You bring your own scratchpad. You bring your own constitution. You bring your own escalation plan.** ChronoLoop just keeps the chair warm until you get back. 🪑💨

---

## Commands 🚀🎉🎮🕹️🎯

### `/chronoloop <minutes> [message]` 🎬🎥🎞️📽️

Start an endless loop for the given number of minutes.

```
/chronoloop 120
/chronoloop 60 "You are in a continuous autonomous loop for 1 hour. Read PLAN.md, pick the next priority, and make progress. Update PLAN.md when done."
```

If no message is provided, the default is used:

> *We are running in an autonomous loop. Continue working. Make progress, improve things. Do not stop — there is always more to do.* 🔄♾️🌀💫

**The message is your only interface.** The agent won't know it's in a loop unless you tell it. See [Crafting your loop message](#-crafting-your-loop-message) below.

### `/chronoloop` 👀👁️🧐🔍

Show current loop status — elapsed time and remaining.

### `/chronoloop stop` 🛑⛔🚫🚷

Stop the loop immediately.

---

### Backtick commands in loop messages 🐚⚡💬

Your loop message (or the default) can now include backtick-enclosed shell
commands that are executed locally before the message is sent. This lets the
agent embed live data into its own continuation prompt — like a real-time
status report.

**Syntax:** embed `` `command` `` anywhere in your message. The command's
stdout replaces the backtick segment inline.

```
/chronoloop 120 "Check `git log --oneline -3` then continue working"
/chronoloop 30 "`pnpm test --reporter=dot 2>&1 | tail -5` — fix any failures"
/chronoloop 60 "Read CHRONO_CONTEXT.md. Current time: `date /t`"
```

**Safety & limits:**

- Output is capped at 2,000 characters per command
- Commands failing? An `(error: ...)` placeholder is inserted instead
- Empty backticks (`` ``` ``) are silently removed
- 30-second timeout per command prevents runaway processes
- Everything runs on your local machine — same as typing in your terminal

This turns ChronoLoop from a simple "keep going" timer into a reactive
automation tool that can check its own status, react to build results,
adapt to changing conditions, and bring fresh context each loop.

---

## What the agent sees 👁️💎👀🧠🔮

Your message is sent exactly as-is each time the loop fires. The agent sees:

- **Everything you put in the message** — nothing more, nothing less
- It does **not** know the time limit, remaining time, or that ChronoLoop exists

**This means you must tell the agent it's in a loop.** Unlike PowerGoal or other task-oriented patterns — where the agent has a tool to declare completion — ChronoLoop is a blind timer. The agent has no way to detect the loop, no escape hatch, and no indication that it will keep getting the same message unless you explicitly include that context.

A good loop message always answers these questions:

| Question | Example |
|---|---|
| What is happening? | "You are in a continuous autonomous loop running for the next 2 hours." |
| What to do? | "Read PROGRESS.md, continue from where you left off, and make progress on the priority list." |
| What happens next? | "You will receive this message again after each response. This will repeat until the session ends." |
| How to handle being stuck? | "If blocked, document in BLOCKERS.md and pivot to the next item." |
| Where to persist state? | "Update PROGRESS.md after each action so you can resume next iteration." |

Without this context, the agent treats each fire as a fresh instruction — no continuation awareness, no scratchpad, no self-correction. It will repeat the same work or stop prematurely.

> ⚡ **The cardinal rule:** *Tell the agent what kind of loop it's in.* ChronoLoop's fire is the agent's only source of truth about the loop. Use it. 🎯💎

---

## Crafting your loop message 🎯📝🧠💬⚡

Your message is the agent's context for every fire. ChronoLoop fires are *continuations* — the same session, the same project, the same work. The agent needs to know that and act accordingly.

### Pattern: Long-running autonomous work (6+ hours)

For overnight or whole-day runs where you want continuous progress across many turns:

```
/chronoloop 360 "⚠️ You are in a continuous autonomous loop for 6 hours.
You will keep receiving this message — do not stop.
- Read CHRONO_CONTEXT.md to see what was done last iteration
- Continue the work in progress
- Update CHRONO_CONTEXT.md after each significant action
- If blocked or stuck for 3 attempts, document in BLOCKERS.md and pivot
- When truly out of work, run a fresh audit and define the next cycle"
```

The agent needs:
- **Session awareness** — "you will keep receiving this message" explains the repetition
- **State persistence** — a scratchpad file it reads and writes each iteration
- **Blockers handling** — what to do when stuck (it can't raise its hand)
- **Fallback work** — what to do when everything is done

### Pattern: Focused refactoring session (30–60 min)

For focused work on a specific area:

```
/chronoloop 45 "You are in an autonomous loop for the next 45 minutes.
Focus area: refactoring the auth module.
- Check TODO.md for the next auth refactor item
- Make the change
- Run `pnpm test` to verify nothing broke
- Update TODO.md with progress
- If tests fail, fix them before moving on
- Keep going until the session ends"
```

### Pattern: Exploration and discovery

When you want the agent to learn the codebase and plan improvements:

```
/chronoloop 60 "Autonomous loop — 1 hour.
Your job is to explore and document. Do NOT make changes yet.
- Scan the codebase for the 5 most impactful improvements
- Write findings to DISCOVERY.md with effort estimates
- After each area, check git log for context
- If you finish early, dig deeper into any area that needs it"
```

### Pattern: Simple endless keep-going

When you trust the agent and just want it to keep moving:

```
/chronoloop 120 "Continue working autonomously.
Read `cat CHRONO_CONTEXT.md`. Resume from where you left off.
Update the scratchpad when done."
```

### What NOT to do

```
/chronoloop 60 "Fix the login bug"  ← agent fixes it once, thinks it's done
/chronoloop 120 "Keep working"      ← on what? agent doesn't know the context
/chronoloop 999 ""                  ← no message = default, which agent can't see
```

Without loop awareness in your message, the agent:
- Fixes one thing, declares victory, waits
- Repeats the same work each fire
- Never uses scratchpads or persistence
- Treats each fire as a fresh task rather than a continuation

---

## Architecture 🔮🧬⚙️🎛️🔧

## Architecture 🔮🧬⚙️🎛️🔧

How does ChronoLoop stay invisible to the agent? It operates at the **TUI layer** — the text interface you type into — not the tool layer, not the agent loop, not the context window. It puppeteers the prompt box.

```
                  ┌──────────────────────────────────────────┐
                  │            OpenCode TUI                  │
                  │                                          │
                  │  ┌──────────────────────────────────┐    │
                  │  │  You: /chronoloop 60               │    │
                  │  │  Agent: *works on your project*   │    │
                  │  │  ── session.idle fires ────────── │    │
                  │  │  ChronoLoop: *types message*      │    │
                  │  │  ChronoLoop: *presses Enter*      │    │
                  │  │  Agent: *works again*             │    │
                  │  │  ── session.idle fires ────────── │    │
                  │  │  ChronoLoop: *checks timer*       │    │
                  │  │  Agent: *works some more*         │    │
                  │  └──────────────────────────────────┘    │
                  └──────────────────────────────────────────┘
```

Key architectural decisions that make this possible:

### 🎭 TUI puppeteering
The plugin never injects a tool, hooks into the agent's reasoning loop, or modifies context. It calls three simple TUI methods — `clearPrompt()`, `appendPrompt()`, and `submitPrompt()` — exactly as if a human typed the message and pressed Enter. The agent has **no way to detect it's being looped** because from its perspective, it's just a user who keeps sending messages.

### ⚡ Event-driven, not polled
The loop is driven by the `session.idle` event, which fires exactly once when the agent finishes a complete turn (not between internal tool calls). No `setInterval` checking "is it done yet?" — just a clean, reactive chain:
```
session.idle → timer check → still time? → fire continuation → wait → session.idle → ...
```

### 🪪 Session-scoped state
State lives in a `Map<sessionID, ChronoLoopState>` — each conversation gets its own independent loop. Start a 2-hour refactoring loop in Session A and a 30-minute testing loop in Session B. They coexist without interference.

### 🛡️ In-flight safety
A tracking set prevents double-firing. If `session.idle` fires while a continuation is already in flight (e.g., the agent finishes mid-loop), the event is silently ignored. No duplicated messages, no cascading loops.

### 🚫 Abort-aware
If you hit Escape during a loop, the `MessageAbortedError` event is detected, the loop is torn down, and a toast confirms it stopped. The plugin doesn't fight you — one interrupt and it's done.

### 💾 Zero disk I/O
All state is ephemeral — memory only. Restart OpenCode and every loop is gone. No stale state files, no cleanup scripts, no "oh no, it persisted a half-finished loop from last week."

### 🔌 Model-agnostic
Because ChronoLoop never enters the agent's world — it only touches the existing TUI — it works with **any model, any provider, any plugin stack**. If OpenCode can run it, ChronoLoop can loop it.

### ⚠️ Long-lived session — not short-lived iterations

This is the most important architectural distinction between ChronoLoop and patterns like RalphLoop:

| | RalphLoop | ChronoLoop |
|---|---|---|
| **Session model** | Fresh session per iteration | **One long-lived session**, compacted over and over |
| **Agent lifetime** | Agent dies after each turn | Agent lives across the entire loop duration |
| **Context resets** | Every iteration is a clean slate | Context grows until compaction, then trims in-place |
| **"Session boundaries are a feature"** | ✅ Yes — each run is independent | ⚠️ Partially — the same session persists |

**What this means for you:**

- **Context accumulates.** Each continuation adds to the same conversation. Compaction clears history eventually, but until then the agent carries everything forward. Your agent needs to be *context-aware* — don't let it generate enormous self-reports or bloated task lists that inflate every turn.

- **Don't ask the agent to spawn sub-agents within the session.** Telling the agent to "create a sub-agent to handle testing" sounds clever but bloats the context with nested tool calls, internal monologue, and half-finished sub-tasks. Instead, use the **session strategy** (Best Practice #7) — separate loops in separate sessions communicate through files.

- **Shorter loops = more compaction.** A 15-minute loop compacts more frequently than an 8-hour one. If you're seeing context bloat degrade the agent's performance, try reducing the duration. Each new `/chronoloop` call starts a fresh session, so breaking work into shorter sequential loops gives the agent a cleaner slate more often.

- **The scratchpad is essential.** Because the session stays alive, the agent might *think* it remembers something from 40 turns ago (when compaction hasn't cleared it yet). But it can't *rely* on that memory — compaction could wipe it at any moment. The scratchpad file (or backtick-injected state) is the only reliable source of truth.

> 💡 **Key takeaway:** RalphLoop solves session boundaries by killing the agent. ChronoLoop solves session continuity by keeping the agent alive and relying on files for durable memory. Same destination, different mechanism — design your prompt for the latter.

---

## Heartbeat 💓💖💗🫀🩺

While the loop is active, a toast notification shows remaining time every 30 seconds so you always know it's alive and working.

---

## State 💾🎨📦🧰🗃️

Ephemeral — all state lives in memory. If OpenCode restarts, the loop is gone. No disk I/O, no stale state files.

---

## Install 📦🌟📥⬇️🚀

```jsonc
// opencode.jsonc
{
  "plugin": [
    "opencode-chronoloop",
  ]
}
```

Restart OpenCode. That's it. ✨🚀🎉💫

---

## Development 🛠️🏆🔧⚙️🔩

```sh
git clone https://github.com/lirrensi/opencode-chronoloop
cd opencode-chronoloop
pnpm install
pnpm typecheck   # TypeScript check
pnpm test        # Run tests 🧪🔬🧫🔎
```

---

## Best Practices 🌸📚💎🧠🏆

ChronoLoop is a different kind of tool — there's no finish line, so how you set it up determines whether you get 8 hours of beautiful progress or 8 hours of the agent spinning in circles. Here's what to think about.

### 1. Calibrate time to your inference speed ⏱️🐢🚀⚡🕰️

ChronoLoop was originally built for **slow local models** running overnight. If you're using one, setting 6–8 hours makes sense — each continuation takes minutes, and you want enough runway for real progress.

If you're using a **fast API model** (GPT-4o, Claude, etc.), continuations take seconds, not minutes. That same 8-hour window will produce hundreds of turns. Adjust accordingly:

| Model speed | Suggested range | Why |
|---|---|---|
| 🐢 Slow local (7B–13B, quantized) | 4–8 hours | Each turn is slow; needs runway |
| 🚶‍♂️ Medium (34B–70B, local) | 1–4 hours | Decent speed, still benefits from longer runs |
| 🚀 Fast API (Claude, GPT-4o, etc.) | 10–60 minutes | Blazing fast turns; long runs can drift or hit context limits |

For fast models, start small (15–30 minutes), observe the quality, and scale up. A fast model in a 6-hour loop can generate hundreds of messages — make sure your context window and budget can handle it.

**Plan first, loop later.** Before you commit to a 6-hour run, spend the first 10–15 minutes on a short **planning loop**:

```
/chronoloop 15 "Explore the codebase. Identify the top 5 areas that need work.
               Write them to PLAN.md with priority order and estimated effort.
               Do NOT make any changes — just plan."
```

Review `PLAN.md`, refine it, *then* start the real loop. This separates the "figure out what to do" phase from the "do it" phase — two different cognitive loads that shouldn't share a session. The planning loop also acts as a cheap HITL checkpoint: if the plan is nonsense, you just spent 15 minutes instead of 6 hours learning that.

### 2. Give the agent a way to pick up where it left off 📝📌🔄📍🗺️

ChronoLoop fires the same message every time. If the agent has no memory of what it was doing, it will restart from scratch — or worse, repeat the same work.

**You need a persistence mechanism.** Common patterns:

- **A shared scratchpad file** — `scratchpad.md`, `progress.md`, or `CHRONO_CONTEXT.md` that the agent reads at the start of each continuation and writes to during work. The file tracks: what was done, what's next, current state, blockers.
- **A task list file** — `TODO.md`, `tasks.json`, or `backlog.md` that the agent pops tasks from and appends new ones to.
- **A productivity system** — a notes directory, a kanban board file, or any structured format the agent can parse and update.

Your message should point to this mechanism:

```
/chronoloop 60 "Read CHRONO_CONTEXT.md and continue from where you left off. Update the file with progress when you complete something."
```

**Assume compaction happens.** The chat history will be cleared at some point — by context limits, by OpenCode trimming, or by a session restart. Your scratchpad file is the source of truth, not the conversation. Design for it.

### 3. Define what happens when there's nothing left to do 🤔🎯💡🧠🗺️

This is the hardest part. On loop #27, the agent may have improved every file, written every test, refactored everything, and still has 3 hours left. If you haven't told it what to do next, it will:

- Re-refactor the same code
- Write the same tests in different styles
- Start making things up
- Produce low-quality churn

**Prevent this with layered focus directives:**

```
Layer 1 — Overall mission:
"The goal is to make this project production-ready. Prioritize correctness, observability, 
error handling, documentation, and edge cases — in that order."

Layer 2 — When stuck for work:
"If you've addressed all items in the current focus area, move to the next one in the 
priority list. If all focus areas are addressed, do a fresh audit: check for missing tests, 
unhandled errors, undocumented APIs, performance bottlenecks, and security concerns."

Layer 3 — When genuinely everything is done:
"Run a comprehensive audit against the project's stated goals. Identify the weakest area 
and start a new improvement cycle there. If you truly cannot find anything productive, 
compact your findings into a summary document and wait."
```

**Scouting — the art of finding new work:**
The agent should know how to *scout* for work, not just execute a fixed list:

- "Scan recent git log for areas with high churn — those need stabilization"
- "Check dependency freshness — any outdated packages need updating"
- "Review open issues or TODOs in the codebase"
- "Profile the application — find the slowest path and optimize it"
- "Look for untested code paths, missing error handling, unvalidated inputs"

Structure your message so the agent has both a **task source** (where to find work) and an **escalation path** (what to do when that source is empty).

**Self-verification — who watches the watcher?** 🔍👀

If you're running truly open-ended experiments (not just task execution), the agent can't be the sole judge of its own work. LLMs consistently overpraise their own output — asking the same agent that wrote code to evaluate it is grading your own homework.

You have two strategies:

1. **Objective gates (simpler, recommended):** Don't ask the agent "is this good?" — let the environment answer. Embed test results, linter output, type checks, and diff stats via backtick commands. The agent doesn't need to *judge* quality — it needs to *react* to objective signals: "4 tests failed, fix them."

2. **A separate evaluator session (more thorough):** Use the session strategy (BP#7) to run a dedicated review loop that reads the main loop's outputs and assesses them. The evaluator comes with fresh context, untainted by the work that produced the output, and can be more skeptical.

The evaluator doesn't need to be a different model — just a different session with a different prompt that emphasizes skepticism:

```
Session A (doer):  /chronoloop 60 "Implement the feature. Write tests."
Session B (judge): /chronoloop 15 "Review the output from Session A's scratchpad.
                    Look for edge cases, regressions, and quality gaps.
                    Be harsh. File issues in REVIEW.md."
```

> ⚡ **The one-sentence rule:** If you can't describe the output quality with an automated check (test pass, lint clean, type-check ok), you need a human or a dedicated evaluator in the loop. Don't trust the doer to grade its own homework.

### 4. Separate constitution from continuation 📜🔄📖🗣️🏛️

Your agent needs two distinct pieces of guidance:

| What | Purpose | When it's used |
|---|---|---|
| **The Constitution** | Core principles, focus areas, priorities, navigation rules, work philosophy | Set once at the start, referenced by the continuation message |
| **The Continuation Message** | Simple instruction to read the source of truth and continue | Every loop iteration |

The pattern:

```
# Initial setup (one-time, in chat or in a system file):
"You are an autonomous improvement agent. Your constitution:
1. Always leave things better than you found them
2. Prefer small, safe, incremental changes
3. Update the scratchpad after every significant action
4. If blocked on something for more than 2 attempts, compact and pivot
5. Quality over quantity — one real improvement > five superficial ones"

# Continuation message (every loop):
"Read CHRONO_CONTEXT.md. Continue from where you left off. 
Follow the constitution. Update the scratchpad."
```

The constitution should be **a file in the project** (`.chonoloop-constitution.md` or similar), not just in chat history, because chat gets compacted. The continuation message just says "read the file and follow it."

### 5. Plan for catastrophic blockers 💥🛑🔥🚨⚠️

Some problems will stop any agent cold:

- **Code won't compile** — dependency broken, build system corrupted, API changed
- **Test infrastructure down** — test DB unreachable, mock server not running
- **Network/service unavailable** — can't fetch dependencies, can't run integration tests
- **License/legal blocks** — can't actually make that change

An agent without guidance will burn continuations retrying the same failing action, generating error messages, and getting nowhere.

**Strategies:**

- **Fail-fast detection:** Tell the agent to recognize within 1–2 attempts if a core action is fundamentally blocked (e.g., "if `pnpm build` fails with an infrastructure error, don't retry 10 times — compact and pivot")
- **Compaction trigger:** Define what counts as a "serious blocker" and tell the agent to compact its findings and move to a different area instead of spinning
- **Time-boxed attempts:** "Try any task a maximum of 3 times. If it fails 3 times, write it to BLOCKERS.md with the error and move on"
- **Escalation document:** Have the agent write a clear summary of the blocker so you can fix it when you're back
- **Fallback work:** Maintain a list of safe, low-risk tasks that can progress even when the main path is blocked (documentation, code review notes, refactoring plans)

**Design your time budget with blockers in mind.** If you set an 8-hour loop and the agent hits a compile error in minute 5, you have 7 hours 55 minutes of potential waste. Catching failures early and redirecting is critical for long runs.

A well-structured continuation message might look like:

```
Read CHRONO_CONTEXT.md and continue.
- Follow the constitution in .chonoloop-constitution.md
- Update scratchpad after each action
- If blocked 3 times on the same thing, document in BLOCKERS.md and pivot
- If all tasks are exhausted, run a fresh audit and define the next improvement cycle
- If you hit a catastrophic blocker, compact everything into BLOCKERS.md and wait
```

### 6. Embrace the self-referential loop 🔮🪞🔄📡🧠

The backtick feature (introduced in v0.2.0) isn't just a convenience — it's the closest thing to giving your agent **real-time situational awareness**. Each loop iteration can inject fresh data about the system's state directly into the agent's prompt, creating a feedback loop where the agent sees its own impact and adapts.

Think of backtick commands as **sensory organs** for your agent:

| Sensor | Command | What the agent learns |
|---|---|---|
| 👁️ Visual | `` `git log --oneline -5` `` | What just happened — recent commits, who did what |
| 🦻 Auditory | `` `pnpm test 2>&1 | tail -15` `` | Is the build green? Which tests failed? |
| 🧠 Proprioception | `` `cat CHRONO_CONTEXT.md` `` | What was I working on? What's the current state? |
| 🕐 Temporal | `` `date /t` `` | What time is it? (useful for time-aware scheduling) |
| 🔍 Scout | `` `rg TODO src/ | head -20` `` | Where is work waiting? Discover tasks dynamically |

**The self-referential pattern in action:**

```
# The message reads the scratchpad, checks progress, and feeds it all back
/chronoloop 60 "Read `cat CHRONO_CONTEXT.md`. 
  Check recent work: `git log --oneline -3 --format='- %s'`.
  Run tests: `pnpm test 2>&1 | tail -5`.
  Continue from where you left off. Update CHRONO_CONTEXT.md when done."
```

This creates a loop where the agent:
1. Writes progress to `CHRONO_CONTEXT.md` during work
2. The next loop iteration reads that file back via `` `cat CHRONO_CONTEXT.md` ``
3. The agent sees its own history without relying on chat compaction

**This effectively gives your agent persistent memory across loop iterations** — no chat history required. The scratchpad file becomes a primitive hippocampus, surviving context limits, session restarts, and model swaps.

> ⚡ **Power tip:** Combine backtick sensors with the constitution pattern. Have the backtick section check whether the constitution is being followed and surface deviations. The agent becomes self-correcting.

### 7. Use the session strategy for multi-loop orchestration 🎪🎭🎬🎯🎻

Since loops are scoped per-session (each conversation gets its own independent loop), you can run multiple specialized loops **concurrently** in different sessions:

```
Session A:  /chronoloop 60  "Refactor the codebase. Focus on code quality."
Session B:  /chronoloop 60  "Write and fix tests. Run pnpm test after each change."
Session C:  /chronoloop 30  "Review docs. Fix any outdated documentation."
Session D:  /chronoloop 120 "Background: check deps, update packages, audit security."
```

Each session has its own:
- **Continuation message** — different instructions, different focus
- **Timer** — different durations, independent start/stop
- **Scratchpad** — separate state, no cross-contamination
- **Model / agent config** — use a cheaper model for docs, a smarter one for refactoring

**When to orchestrate multiple loops:**

- **Parallel coverage** — refactoring, testing, and docs happening simultaneously instead of sequentially
- **Skill specialization** — assign different agents (or different models) to different kinds of work
- **Watchdog pattern** — one loop does the work, another loop monitors for regressions
- **Staggered starts** — start a long refactoring loop, then 15 minutes later start a short testing loop to check nothing broke

**Watch your budget.** Each loop generates a full conversation. If you're paying per-token, three concurrent loops cost three times as much. For local models, make sure your hardware can handle the load.

> 🎯 **Pro tip:** Use staggered durations so they don't all expire at once. Start a 60m loop, then a 45m loop, then a 30m loop. They finish at different times, giving you staggered check-in points to review progress across all sessions.

---

## Design constraints 🧱🛡️⚙️🔒🚧

- No `update_goal` tool — the agent cannot mark itself complete
- Time limit is never revealed to the agent — prevents reward hacking
- Plan mode is detected and skipped — no infinite planning loops
- No message transform tricks — the continuation message is sent directly

---

## License 📜📄🎊📝✨

MIT 🎊✨🎉💖
